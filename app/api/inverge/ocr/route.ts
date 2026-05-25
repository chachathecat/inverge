import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { extractStructuredDraftWithGemini, extractTranscriptionFromImages } from "@/lib/evaluate/gemini";
import { assertCanUploadCapture, EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { normalizeExtractionDraft } from "@/lib/review-os/extraction";
import { reviewOsRepository } from "@/lib/review-os/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    if (session.userId) {
      await assertCanUploadCapture(session.userId);
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "multipart form-data로 이미지 또는 텍스트를 보내 주세요." }, { status: 400 });
    }

    const mode = parseAppraisalMode(formData.get("mode")?.toString()) ?? "first";
    const pastedText = formData.get("text")?.toString() ?? formData.get("raw_text")?.toString() ?? "";
    const sourceLabel = formData.get("source_label")?.toString() ?? "";
    const imageFiles = [...formData.getAll("images"), ...formData.getAll("image")].filter(
      (item): item is File => item instanceof File && item.size > 0,
    );

    if (imageFiles.length === 0 && !pastedText.trim()) {
      return NextResponse.json({ ok: false, error: "이미지 또는 텍스트를 하나 이상 입력해 주세요." }, { status: 400 });
    }

    const rawOcrText = imageFiles.length > 0 ? await extractTranscriptionFromImages(imageFiles) : pastedText.trim();
    let rawExtractionJson: Record<string, unknown> = {};
    if (process.env.OCR_STRUCTURED_EXTRACTION_AI === "true") {
      try {
        rawExtractionJson = await extractStructuredDraftWithGemini(mode, rawOcrText);
      } catch {
        rawExtractionJson = {};
      }
    }

    const resolvedSourceLabel = sourceLabel || imageFiles[0]?.name || "";
    const extraction = normalizeExtractionDraft(mode, rawOcrText, rawExtractionJson, resolvedSourceLabel);
    if (session.userId) {
      await reviewOsRepository.logUsageEvent(session.userId, "capture_ocr_success", "capture_session", null, { mode, imageCount: imageFiles.length });
      if (sourceLabel.toLowerCase().includes("problem snap")) {
        await reviewOsRepository.logUsageEvent(session.userId, "problem_snap_success", "capture_session", null, { mode });
      }
    }
    return NextResponse.json({
      ok: true,
      text: rawOcrText,
      ...extraction,
    });
  } catch (error) {
    if (error instanceof EntitlementBlockedError) {
      return NextResponse.json({ ok: false, error: error.messageKo, errorCode: error.code, blockedFeature: error.feature }, { status: 402 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "텍스트를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
