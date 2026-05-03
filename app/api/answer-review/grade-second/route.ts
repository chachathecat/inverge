import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import {
  GeminiEnvError,
  GeminiSecondGradingParseError,
  gradeSecondRoundWithGemini,
  isGeminiConfigured,
  isGeminiQuotaExceededError,
} from "@/lib/evaluate/gemini";
import { normalizeSecondGradingResult } from "@/lib/evaluate/second-grading/normalize";
import { parseQuestionType, parseSubject, resolveQuestionType, resolveSubject } from "@/lib/evaluate/second-grading/input";
import type { SecondGradingMode } from "@/lib/evaluate/second-grading/types";

export const dynamic = "force-dynamic";

const GEMINI_MISSING_MESSAGE = "지금은 2차 채점관 모드를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const INSUFFICIENT_INPUT_MESSAGE = "채점에 필요한 입력이 부족합니다. 과목, 문제, 답안을 확인해 주세요.";
const MODEL_PARSE_MESSAGE = "채점 결과를 안전하게 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const GENERIC_ERROR_MESSAGE = "2차 채점 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

type GradeSecondPayload = {
  subject?: string;
  questionType?: "theory" | "law" | "practice" | "auto";
  questionText?: string;
  userAnswerText?: string;
  referenceText?: string;
};

function detectMode(userAnswerText?: string): SecondGradingMode {
  return userAnswerText?.trim() ? "grade_answer" : "problem_only";
}

export async function POST(request: Request) {
  const session = await getServerSessionUser();
  if (session.authEnabled && !session.isAuthenticated) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  let payload: GradeSecondPayload;

  try {
    payload = (await request.json()) as GradeSecondPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 요청만 지원합니다." }, { status: 400 });
  }

  const parsedQuestionType = parseQuestionType(payload.questionType);
  const questionText = payload.questionText?.trim() ?? "";
  const mode = detectMode(payload.userAnswerText);

  if (!parsedQuestionType || !questionText) {
    return NextResponse.json({ ok: false, error: INSUFFICIENT_INPUT_MESSAGE }, { status: 400 });
  }

  const parsedSubject = parseSubject(payload.subject);
  const questionType = resolveQuestionType(parsedQuestionType, parsedSubject);

  if (!questionType) {
    return NextResponse.json({ ok: false, error: "questionType가 auto인 경우 subject를 함께 입력하거나 명시적 questionType을 사용해 주세요." }, { status: 400 });
  }

  const subject = resolveSubject(parsedSubject, questionType);

  if (!isGeminiConfigured()) {
    return NextResponse.json({ ok: false, errorCode: "GEMINI_NOT_CONFIGURED", error: GEMINI_MISSING_MESSAGE }, { status: 503 });
  }

  try {
    const raw = await gradeSecondRoundWithGemini({
      subject,
      questionType,
      questionText,
      userAnswerText: payload.userAnswerText,
      referenceText: payload.referenceText,
    });

    const normalized = normalizeSecondGradingResult(raw);
    return NextResponse.json({ ok: true, mode, result: normalized });
  } catch (error) {
    if (error instanceof GeminiEnvError) {
      return NextResponse.json({ ok: false, errorCode: "GEMINI_NOT_CONFIGURED", error: GEMINI_MISSING_MESSAGE }, { status: 503 });
    }

    if (isGeminiQuotaExceededError(error)) {
      return NextResponse.json({ ok: false, errorCode: "GEMINI_QUOTA_EXCEEDED", error: GENERIC_ERROR_MESSAGE }, { status: 429 });
    }

    if (error instanceof GeminiSecondGradingParseError) {
      return NextResponse.json({ ok: false, errorCode: "GEMINI_SECOND_GRADING_PARSE_FAILED", error: MODEL_PARSE_MESSAGE }, { status: 502 });
    }

    return NextResponse.json({ ok: false, error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export const __testables__ = { detectMode };
