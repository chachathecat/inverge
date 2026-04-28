import { NextResponse } from "next/server";

import {
  extractStructuredDraftWithGemini,
  extractTranscriptionFromImages,
  GEMINI_API_KEY_ERROR_MESSAGE,
  GEMINI_QUOTA_ERROR_MESSAGE,
} from "@/lib/evaluate/gemini";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { normalizeExtractionDraft } from "@/lib/review-os/extraction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
      } catch (error) {
        if (error instanceof Error && error.message === GEMINI_API_KEY_ERROR_MESSAGE) {
          throw error;
        }
        rawExtractionJson = {};
      }
    }

    const resolvedSourceLabel = sourceLabel || imageFiles[0]?.name || "";
    const extraction = normalizeExtractionDraft(mode, rawOcrText, rawExtractionJson, resolvedSourceLabel);
    return NextResponse.json({
      ok: true,
      text: rawOcrText,
      ...extraction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "텍스트를 불러오지 못했습니다.";

    if (message === GEMINI_QUOTA_ERROR_MESSAGE) {
      return NextResponse.json({ ok: false, error: message }, { status: 429 });
    }

    if (message === GEMINI_API_KEY_ERROR_MESSAGE) {
      return NextResponse.json({ ok: false, error: "Gemini 설정을 확인해 주세요. 관리자에게 문의해 주세요." }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
