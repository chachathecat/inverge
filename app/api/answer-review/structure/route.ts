import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import {
  GeminiEnvError,
  GeminiStructureParseError,
  isGeminiQuotaExceededError,
  isGeminiConfigured,
  structureAnswerReviewWithGemini,
} from "@/lib/evaluate/gemini";
import { normalizeSubjectForMode } from "@/lib/review-os/appraisal";
import { reviewOsService } from "@/lib/review-os/service";
import type { LearningSignalEventInput, SourceType } from "@/lib/review-os/types";

export const dynamic = "force-dynamic";

const GEMINI_MISSING_MESSAGE =
  "OCR 기능을 사용하려면 GEMINI_API_KEY 설정이 필요합니다. 지금은 텍스트 입력으로 검토를 계속할 수 있습니다.";
const GEMINI_QUOTA_MESSAGE =
  "Gemini 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_PARSE_FALLBACK_MESSAGE =
  "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_EMPTY_FALLBACK_MESSAGE =
  "구조화 초안이 비어 있어 텍스트 입력 기준으로 검토를 이어갑니다. 필요한 항목을 보강해 주세요.";
const STRUCTURE_SCHEMA_FALLBACK_MESSAGE =
  "구조화 형식을 안전하게 확인하지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_UNKNOWN_MESSAGE = "구조화 요청을 처리하지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";

function getFiles(formData: FormData, fieldName: string) {
  return formData.getAll(fieldName).filter((item): item is File => item instanceof File && item.size > 0);
}

function toTagArray(values: string[], limit = 4) {
  return values.map((value) => value.trim()).filter(Boolean).slice(0, limit);
}

function resolveSourceType(questionFiles: File[], answerFiles: File[], referenceFiles: File[]): SourceType {
  const allFiles = [...questionFiles, ...answerFiles, ...referenceFiles];
  if (allFiles.length === 0) return "text";
  if (allFiles.some((file) => file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"))) return "pdf";
  return "image";
}

function buildLearningSignalInput(params: {
  draft: Awaited<ReturnType<typeof structureAnswerReviewWithGemini>>;
  examMode: "first" | "second";
  subject: string;
  sourceType: SourceType;
}): LearningSignalEventInput {
  const { draft, examMode, subject, sourceType } = params;
  const weaknessTags = toTagArray([draft.weakParagraphPoint, draft.weakLogicPoint, ...draft.missingIssueCandidates], 5);
  const confidenceRaw =
    (draft.coreConcepts.length > 0 ? 0.25 : 0) +
    (draft.relatedFormulas.length > 0 ? 0.2 : 0) +
    (draft.strengths.length > 0 ? 0.2 : 0) +
    (weaknessTags.length > 0 ? 0.2 : 0) +
    (draft.nextTask.trim().length > 0 ? 0.15 : 0);
  const sourceSummary = [draft.questionSummary, draft.userAnswerSummary]
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" / ")
    .slice(0, 480);

  return {
    examMode,
    subject,
    sourceType,
    conceptTags: toTagArray(draft.coreConcepts),
    formulaTags: toTagArray(draft.relatedFormulas),
    issueTags: toTagArray([draft.requiredIssues, ...draft.missingIssueCandidates]),
    strengthTags: toTagArray(draft.strengths),
    weaknessTags,
    nextTask: {
      type: draft.nextTaskType,
      instruction: draft.nextTask,
    },
    confidence: Math.max(0, Math.min(1, confidenceRaw)),
    sourceSummary,
  };
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
  const examMode = formData.get("examMode")?.toString() === "second" ? "second" : "first";
  const subject = normalizeSubjectForMode(formData.get("subject")?.toString() ?? "", examMode);

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
    const session = await getServerSessionUser();
    const draft = await structureAnswerReviewWithGemini({
      questionFiles,
      answerFiles,
      referenceFiles,
      questionText,
      answerText,
      referenceText,
    });
    const sourceType = resolveSourceType(questionFiles, answerFiles, referenceFiles);
    let learningSignalStatus: { ok: boolean; message: string } = {
      ok: false,
      message: "저장에 실패했지만 검토는 계속할 수 있습니다.",
    };

    try {
      await reviewOsService.createLearningSignalEvent(
        session.userId,
        buildLearningSignalInput({
          draft,
          examMode,
          subject,
          sourceType,
        }),
      );
      learningSignalStatus = { ok: true, message: "학습 신호가 저장되었습니다." };
    } catch {
      learningSignalStatus = { ok: false, message: "저장에 실패했지만 검토는 계속할 수 있습니다." };
    }

    return NextResponse.json({ ok: true, draft, learningSignalStatus });
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

    if (error instanceof GeminiStructureParseError) {
      const errorMessage =
        error.reason === "empty_response"
          ? STRUCTURE_EMPTY_FALLBACK_MESSAGE
          : error.reason === "schema_mismatch"
            ? STRUCTURE_SCHEMA_FALLBACK_MESSAGE
            : STRUCTURE_PARSE_FALLBACK_MESSAGE;

      return NextResponse.json(
        {
          ok: false,
          errorCode:
            error.reason === "empty_response"
              ? "GEMINI_STRUCTURE_EMPTY_RESPONSE"
              : error.reason === "schema_mismatch"
                ? "GEMINI_STRUCTURE_SCHEMA_MISMATCH"
                : "GEMINI_STRUCTURE_PARSE_FAILED",
          error: errorMessage,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: STRUCTURE_UNKNOWN_MESSAGE,
      },
      { status: 500 },
    );
  }
}
