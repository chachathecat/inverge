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
    if (session.userId) await assertCanUploadCapture(session.userId);
    const formData = await request.formData();
    mode = parseAppraisalMode(formData.get("mode")?.toString()) ?? "first";
    const pastedText = formData.get("text")?.toString() ?? formData.get("raw_text")?.toString() ?? "";
    const sourceLabel = formData.get("source_label")?.toString() ?? "";
    const imageFiles = [...formData.getAll("images"), ...formData.getAll("image")].filter((item): item is File => item instanceof File && item.size > 0);
    if (imageFiles.length === 0 && !pastedText.trim()) return NextResponse.json({ ok: false, error: "이미지 또는 텍스트를 하나 이상 입력해 주세요.", errorCode: "OCR_FAILED", recovery: "retry" }, { status: 400 });
    const ocrPages = imageFiles.length > 0
      ? await Promise.all(
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
    if (process.env.OCR_STRUCTURED_EXTRACTION_AI === "true") {
      try { rawExtractionJson = await extractStructuredDraftWithGemini(mode, rawOcrText); } catch { rawExtractionJson = {}; }
    }
    const extraction = normalizeExtractionDraft(mode, rawOcrText, rawExtractionJson, sourceLabel || imageFiles[0]?.name || "");
    if (session.userId) await reviewOsRepository.logUsageEvent(session.userId, "capture_ocr_success", "capture_session", null, { mode, imageCount: imageFiles.length, pageCount: Math.max(ocrPages.length, imageFiles.length) });
    logServerEvent({ eventName: "capture_ocr", userId: session.userId, route: "/api/inverge/ocr", mode, subject: "ocr", costCategory: "capture_ocr", durationMs: Date.now()-startedAt, ok: true });
    return NextResponse.json({ ok: true, text: rawOcrText, pages: ocrPages, pageCount: ocrPages.length || undefined, ...extraction });
  } catch (error) {
    const errorCode = error instanceof EntitlementBlockedError ? error.code : "OCR_FAILED";
    logServerEvent({ eventName: "capture_ocr", userId: session.userId, route: "/api/inverge/ocr", mode, subject: "ocr", costCategory: "capture_ocr", durationMs: Date.now()-startedAt, ok: false, errorCode });
    if (error instanceof EntitlementBlockedError) return NextResponse.json({ ok: false, error: "이용 권한 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.", errorCode: error.code, blockedFeature: error.feature, recovery: "retry" }, { status: 402 });
    return NextResponse.json({ ok: false, error: "OCR 처리에 실패했습니다. 초안을 유지한 채 다시 시도해 주세요.", errorCode: "OCR_FAILED", recovery: "retry" }, { status: 500 });
  }
}
