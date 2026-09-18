import { canUseOwnerLocalOcr, isOwnerLocalOcrEnabled, resolveLocalOcrRequest, readLocalOcrForm, extractWithLocalWindowsOcr, LocalOcrError } from "@/lib/owner-study/local-ocr";
import { isOwnerPcTheoryEnabled } from "@/lib/owner-study/owner-pc-theory";
import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { extractStructuredDraftWithGemini, extractTranscriptionFromImages } from "@/lib/evaluate/gemini";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { assertCanUploadCapture, EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import { normalizeExtractionDraft } from "@/lib/review-os/extraction";
import { logServerEvent } from "@/lib/review-os/observability";
import { reviewOsRepository } from "@/lib/review-os/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getServerSessionUser();
  let mode: "first" | "second" = "first";
  try {
    const localOcr = resolveLocalOcrRequest(request.headers.get("x-inverge-ocr-engine"), isOwnerLocalOcrEnabled());
    if (localOcr && (!session.userId || session.isDemo || !canUseOwnerLocalOcr(session.email))) return NextResponse.json({ok:false,errorCode:"LOCAL_OCR_FORBIDDEN"},{status:403});
    if (session.userId) await assertCanUploadCapture(session.userId);
    const formData = localOcr ? await readLocalOcrForm(request) : await request.formData();
    mode = parseAppraisalMode(formData.get("mode")?.toString()) ?? "first";
    const pastedText = formData.get("text")?.toString() ?? formData.get("raw_text")?.toString() ?? "";
    const sourceLabel = formData.get("source_label")?.toString() ?? "";
    const imageFiles = [...formData.getAll("images"), ...formData.getAll("image")].filter((item): item is File => item instanceof File && (localOcr || item.size > 0));
    if (isOwnerPcTheoryEnabled() && !localOcr && imageFiles.length > 0) return NextResponse.json({ ok: false, errorCode: "OWNER_THEORY_TEXT_ONLY", error: "이론 모드는 텍스트 입력만 지원합니다. 사진·PDF 분석은 미지원입니다." }, {status: 400});
    if (imageFiles.length === 0 && !pastedText.trim()) return NextResponse.json({ ok: false, error: "이미지 또는 텍스트를 하나 이상 입력해 주세요.", errorCode: "OCR_FAILED", recovery: "retry" }, { status: 400 });
    const ocrPages = imageFiles.length > 0
      ? localOcr ? await extractWithLocalWindowsOcr(imageFiles) : await Promise.all(
          imageFiles.map(async (file, index) => ({
            pageNumber: index + 1,
            name: file.name || `${index + 1}페이지`,
            text: await extractTranscriptionFromImages([file]),
          })),
        )
      : [];
    const rawOcrText = ocrPages.length > 0
      ? ocrPages.map((page) => `[Page ${page.pageNumber}]\n${page.text}`).join("\n\n")
      : pastedText.trim();
    let rawExtractionJson: Record<string, unknown> = {};
    if (!localOcr && !isOwnerPcTheoryEnabled() && process.env.OCR_STRUCTURED_EXTRACTION_AI === "true") {
      try { rawExtractionJson = await extractStructuredDraftWithGemini(mode, rawOcrText); } catch { rawExtractionJson = {}; }
    }
    const extraction = normalizeExtractionDraft(mode, rawOcrText, rawExtractionJson, sourceLabel || imageFiles[0]?.name || "");
    if (session.userId) await reviewOsRepository.logUsageEvent(session.userId, "capture_ocr_success", "capture_session", null, { mode, imageCount: imageFiles.length, pageCount: Math.max(ocrPages.length, imageFiles.length) });
    logServerEvent({ eventName: "capture_ocr", userId: session.userId, route: "/api/inverge/ocr", mode, subject: "ocr", costCategory: "capture_ocr", durationMs: Date.now()-startedAt, ok: true });
    return NextResponse.json({ ok: true, text: rawOcrText, pages: ocrPages, pageCount: ocrPages.length || undefined, ...extraction, ...(localOcr ? {ocrEngine:"windows_builtin_ko",ocrVerification:"unconfirmed",externalTransmission:false,needs_review:true} : {}) });
  } catch (error) {
    const errorCode = error instanceof EntitlementBlockedError || error instanceof LocalOcrError ? error.code : "OCR_FAILED";
    logServerEvent({ eventName: "capture_ocr", userId: session.userId, route: "/api/inverge/ocr", mode, subject: "ocr", costCategory: "capture_ocr", durationMs: Date.now()-startedAt, ok: false, errorCode });
    if (error instanceof LocalOcrError) return NextResponse.json({ok:false,errorCode,error:"로컬 OCR을 완료하지 못했습니다. 초안을 유지하고 직접 입력하거나 다시 시도해 주세요.",recovery:"retry"},{status:error.code==="LOCAL_OCR_BUSY"?409:400});
    if (error instanceof EntitlementBlockedError) return NextResponse.json({ ok: false, error: "이용 권한 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.", errorCode: error.code, blockedFeature: error.feature, recovery: "retry" }, { status: 402 });
    return NextResponse.json({ ok: false, error: "OCR 처리에 실패했습니다. 초안을 유지한 채 다시 시도해 주세요.", errorCode: "OCR_FAILED", recovery: "retry" }, { status: 500 });
  }
}
