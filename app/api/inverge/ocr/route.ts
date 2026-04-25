import { NextResponse } from "next/server";

import { extractStructuredDraftWithGemini, extractTranscriptionFromImages } from "@/lib/evaluate/gemini";
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
      } catch {
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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "텍스트를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
