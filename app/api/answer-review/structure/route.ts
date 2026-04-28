import { NextResponse } from "next/server";

import {
  GeminiEnvError,
  isGeminiQuotaExceededError,
  isGeminiConfigured,
  structureAnswerReviewWithGemini,
} from "@/lib/evaluate/gemini";

export const dynamic = "force-dynamic";

const GEMINI_MISSING_MESSAGE =
  "OCR 기능을 사용하려면 GEMINI_API_KEY 설정이 필요합니다. 지금은 텍스트 입력으로 검토를 계속할 수 있습니다.";
const GEMINI_QUOTA_MESSAGE =
  "Gemini 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 텍스트 입력으로 검토를 계속해 주세요.";

function getFiles(formData: FormData, fieldName: string) {
  return formData.getAll(fieldName).filter((item): item is File => item instanceof File && item.size > 0);
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "multipart/form-data 요청만 지원합니다." }, { status: 400 });
  }

  const questionFiles = getFiles(formData, "questionFiles");
  const answerFiles = getFiles(formData, "answerFiles");
  const referenceFiles = getFiles(formData, "referenceFiles");

  const questionText = formData.get("questionText")?.toString() ?? "";
  const answerText = formData.get("answerText")?.toString() ?? "";
  const referenceText = formData.get("referenceText")?.toString() ?? "";

  if (answerFiles.length === 0 && !answerText.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "내 답안 파일(answerFiles) 또는 내 답안 텍스트(answerText) 중 하나는 필수입니다.",
      },
      { status: 400 },
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "GEMINI_NOT_CONFIGURED",
        error: GEMINI_MISSING_MESSAGE,
      },
      { status: 503 },
    );
  }

  try {
    const draft = await structureAnswerReviewWithGemini({
      questionFiles,
      answerFiles,
      referenceFiles,
      questionText,
      answerText,
      referenceText,
    });

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    if (error instanceof GeminiEnvError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "GEMINI_NOT_CONFIGURED",
          error: GEMINI_MISSING_MESSAGE,
        },
        { status: 503 },
      );
    }

    if (isGeminiQuotaExceededError(error)) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "GEMINI_QUOTA_EXCEEDED",
          error: GEMINI_QUOTA_MESSAGE,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "OCR 구조화 요청을 처리하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
