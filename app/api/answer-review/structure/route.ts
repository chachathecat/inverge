import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import {
  normalizeAnswerReviewStructureDraft,
  type AnswerReviewExplanationLevel,
} from "@/lib/evaluate/answer-review-structure";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import {
  buildAnswerReviewLearningSignalInput,
  getAnswerReviewInputQualityIssue,
  shouldSkipLearningSignalSave,
} from "@/lib/review-os/learning-signal";
import { reviewOsService } from "@/lib/review-os/service";
import { buildAnswerReviewReferenceGrounding } from "@/lib/review-os/answer-review-reference-grounding";
import { assertCanRunAnswerReview, EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import { reviewOsRepository } from "@/lib/review-os/repository";

import {
  GeminiEnvError,
  GeminiStructureParseError,
  isGeminiQuotaExceededError,
  isGeminiConfigured,
  structureAnswerReviewWithGemini,
} from "@/lib/evaluate/gemini";

export const dynamic = "force-dynamic";

const GEMINI_MISSING_MESSAGE =
  "지금은 파일 구조화를 사용할 수 없습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const GEMINI_QUOTA_MESSAGE =
  "요청이 잠시 몰려 구조화를 진행하지 못했습니다. 잠시 후 다시 시도하거나 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_PARSE_FALLBACK_MESSAGE =
  "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_EMPTY_FALLBACK_MESSAGE =
  "구조화 초안이 비어 있어 텍스트 입력 기준으로 검토를 이어갑니다. 필요한 항목을 보강해 주세요.";
const STRUCTURE_SCHEMA_FALLBACK_MESSAGE =
  "구조화 형식을 안전하게 확인하지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const STRUCTURE_UNKNOWN_MESSAGE = "구조화 요청을 처리하지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.";
const INPUT_QUALITY_MESSAGE = "검토에 필요한 정보가 부족합니다. 문제와 답안을 조금 더 입력해 주세요.";
const ANONYMOUS_TRIAL_COOKIE = "anonymous_answer_review_trial";
const ANONYMOUS_TRIAL_LIMIT_MESSAGE =
  "오늘 무료 검토 1회를 사용했습니다. 계정을 만들면 기록 저장과 복습 큐 연결을 사용할 수 있습니다.";


function normalizeExplanationLevel(value: string | null | undefined): AnswerReviewExplanationLevel {
  if (value === "easy" || value === "exam") return value;
  return "standard";
}

function getFiles(formData: FormData, fieldName: string) {
  return formData.getAll(fieldName).filter((item): item is File => item instanceof File && item.size > 0);
}

export async function POST(request: Request) {
  const session = await getServerSessionUser();
  const isAnonymous = session.authEnabled && !session.isAuthenticated;
  const cookieStore = request.headers.get("cookie") ?? "";
  const todayUtc = new Date().toISOString().slice(0, 10);
  const trialCookie = cookieStore
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ANONYMOUS_TRIAL_COOKIE}=`))
    ?.slice(`${ANONYMOUS_TRIAL_COOKIE}=`.length);
  const [trialDate = "", trialCount = "0"] = (trialCookie ?? "").split(":");
  const anonymousTrialUsedToday = isAnonymous && trialDate === todayUtc && Number(trialCount) >= 1;
  if (anonymousTrialUsedToday) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "ANONYMOUS_TRIAL_LIMIT",
        error: ANONYMOUS_TRIAL_LIMIT_MESSAGE,
        referenceGrounding: {
          used: false,
          displayLabel: "",
          references: [],
        },
        trial: { mode: "anonymous", used: 1, remaining: 0 },
      },
      { status: 429 },
    );
  }

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
  const examModeInput = parseAppraisalMode(formData.get("examMode")?.toString() ?? null);
  const subjectInput = formData.get("subject")?.toString() ?? "";
  const explanationLevel = normalizeExplanationLevel(formData.get("explanationLevel")?.toString());

  if (answerFiles.length === 0 && !answerText.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "내 답안 파일(answerFiles) 또는 내 답안 텍스트(answerText) 중 하나는 필수입니다.",
      },
      { status: 400 },
    );
  }

  const inputQualityIssue = getAnswerReviewInputQualityIssue({
    questionText,
    answerText,
    referenceText,
    questionFileCount: questionFiles.length,
    answerFileCount: answerFiles.length,
    referenceFileCount: referenceFiles.length,
  });
  if (inputQualityIssue) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "INSUFFICIENT_INPUT",
        error: INPUT_QUALITY_MESSAGE,
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
    if (session.userId) await assertCanRunAnswerReview(session.userId);
    const initialDraft = await structureAnswerReviewWithGemini({
      questionFiles,
      answerFiles,
      referenceFiles,
      questionText,
      answerText,
      referenceText,
      explanationLevel,
    });
    const normalizedInitial = normalizeAnswerReviewStructureDraft(initialDraft);
    const referenceGrounding = buildAnswerReviewReferenceGrounding({
      examMode: examModeInput ?? "first",
      subject: subjectInput,
      questionText,
      answerText,
      referenceText,
      normalizedDraft: normalizedInitial,
    });
    const draft =
      referenceGrounding.references.length > 0
        ? await structureAnswerReviewWithGemini({
            questionFiles,
            answerFiles,
            referenceFiles,
            questionText,
            answerText,
            referenceText,
            referenceGroundingContext: referenceGrounding.promptContext,
            explanationLevel,
          })
        : initialDraft;
    const normalized = normalizeAnswerReviewStructureDraft(draft);
    let learningSignalStatus: "saved" | "skipped" | "failed" = "skipped";
    const learningSignalSkipReason = shouldSkipLearningSignalSave(normalized);
    if (session.userId && session.email && !learningSignalSkipReason) {
      try {
        const mode = examModeInput ?? "first";
        const learningSignalInput = buildAnswerReviewLearningSignalInput({
          examMode: mode,
          subjectInput,
          answerSourceType: answerFiles.length > 0 ? "file" : "text",
          normalizedDraft: normalized,
        });
        await reviewOsService.createLearningSignalEvent(session.userId, session.email, learningSignalInput);
        learningSignalStatus = "saved";
      } catch (error) {
        console.warn("[answer-review] learning signal save failed", error);
        learningSignalStatus = "failed";
      }
    } else if (learningSignalSkipReason) {
      console.info("[answer-review] learning signal skipped", { reason: learningSignalSkipReason });
      learningSignalStatus = "skipped";
    }
    if (isAnonymous) {
      const response = NextResponse.json({
        ok: true,
        draft,
        learningSignalStatus: "skipped",
        explanationLevel,
        referenceGrounding: {
          used: referenceGrounding.references.length > 0,
          displayLabel: referenceGrounding.displayLabel,
          references: referenceGrounding.references.map((item) => ({
            id: item.id,
            exam_year: item.exam_year,
            subject: item.subject,
            reason: item.reason,
          })),
        },
        trial: {
          mode: "anonymous",
          used: 1,
          remaining: 0,
          resetLabel: "내일 다시 1회 사용 가능",
        },
      });
      // TODO: move anonymous trial limit to durable server-side store with IP/session-aware throttling.
      response.cookies.set(ANONYMOUS_TRIAL_COOKIE, `${todayUtc}:1`, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 2,
      });
      return response;
    }
    if (session.userId) {
      await reviewOsRepository.logUsageEvent(session.userId, "answer_review_structure_success", "answer_review", null, {
        examMode: examModeInput ?? "first",
        explanationLevel,
      });
    }
    return NextResponse.json({
      ok: true,
      draft,
      learningSignalStatus,
      explanationLevel,
      referenceGrounding: {
        used: referenceGrounding.references.length > 0,
        displayLabel: referenceGrounding.displayLabel,
        references: referenceGrounding.references.map((item) => ({
          id: item.id,
          exam_year: item.exam_year,
          subject: item.subject,
          reason: item.reason,
        })),
      },
    });
  } catch (error) {
    if (error instanceof EntitlementBlockedError) {
      return NextResponse.json({ ok: false, errorCode: error.code, error: error.messageKo, blockedFeature: error.feature }, { status: 402 });
    }
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
