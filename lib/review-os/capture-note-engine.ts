import type { AppraisalMode } from "@/lib/review-os/appraisal";
import type { WrongAnswerItemInput } from "@/lib/review-os/types";

type CaptureStructuringInput = {
  mode: AppraisalMode;
  subject: string;
  confirmedText: string;
  problemText?: string;
  userAnswerText?: string;
  existingNormalizedDraft?: Record<string, unknown> | null;
  userConfirmedFields?: Record<string, unknown>;
  itemInput: WrongAnswerItemInput;
};

export type CaptureNoteBase = {
  mode: AppraisalMode;
  subject: string;
  question_or_case_summary: string;
  user_answer_summary: string;
  one_biggest_gap: string;
  one_next_action: string;
  topic_candidate: string;
  mistake_type: string;
  weak_structure_point: string;
  next_task_type: "retry" | "rewrite";
  review_reason: string;
};

export type FirstCaptureNoteSignals = CaptureNoteBase & {
  mode: "first";
  next_task_type: "retry";
  likely_mistake_reason: string;
  key_concepts: string[];
  next_review_action: string;
};

export type SecondCaptureNoteSignals = CaptureNoteBase & {
  mode: "second";
  next_task_type: "rewrite";
  missing_issue_candidate: string;
  rewrite_instruction: string;
  next_rewrite_action: string;
};

export type CaptureNoteSignals = FirstCaptureNoteSignals | SecondCaptureNoteSignals;

export function buildCaptureNoteSignals(mode: AppraisalMode, input: WrongAnswerItemInput): CaptureNoteSignals {
  const oneBiggestGap = (mode === "second" ? input.biggestGap || input.missingIssue : input.userReasonText || input.userReasonPreset || "개념 혼동") ?? "개념 혼동";
  const oneNextAction = (mode === "second" ? input.rewriteInstruction || "핵심 논점 1개를 고정해 문단 다시쓰기" : input.comparisonPoint || "근거 한 문장을 먼저 회상하고 같은 유형 재풀이") ?? "다음 행동 실행";
  const base = {
    mode,
    subject: input.subjectLabel,
    question_or_case_summary: input.caseSummary || input.problemTitle || (input.rawQuestionText ?? "").slice(0, 120),
    user_answer_summary: input.myAnswerSummary || input.userAnswer.slice(0, 120),
    one_biggest_gap: oneBiggestGap,
    one_next_action: oneNextAction,
    topic_candidate: input.problemTitle || input.subjectLabel,
    mistake_type: input.userReasonPreset || input.userReasonText || "개념 혼동",
    weak_structure_point: input.weakStructurePoint || input.referenceStructure || "",
    next_task_type: mode === "second" ? "rewrite" : "retry",
    review_reason: oneBiggestGap,
  };

  if (mode === "first") {
    return {
      ...base,
      mode: "first",
      next_task_type: "retry",
      likely_mistake_reason: input.userReasonPreset || input.userReasonText || "개념 혼동",
      key_concepts: input.keyConcepts ?? [],
      next_review_action: oneNextAction,
    };
  }

  return {
    ...base,
    mode: "second",
    next_task_type: "rewrite",
    missing_issue_candidate: input.missingIssue || input.biggestGap || "핵심 논점 누락",
    rewrite_instruction: input.rewriteInstruction || oneNextAction,
    next_rewrite_action: oneNextAction,
  };
}

export function structureCaptureNote(input: CaptureStructuringInput) {
  const fallback = buildCaptureNoteSignals(input.mode, input.itemInput);
  const userConfirmed = input.userConfirmedFields ?? {};
  const confirmedGap = typeof userConfirmed.biggest_gap === "string" ? userConfirmed.biggest_gap.trim() : "";
  const confirmedRewrite = typeof userConfirmed.rewrite_instruction === "string" ? userConfirmed.rewrite_instruction.trim() : "";
  const baseGap = confirmedGap || fallback.one_biggest_gap || "다시 확인할 부분 후보: 핵심 논점 점검 필요";
  const baseNext = fallback.one_next_action || "다음 행동: 핵심 근거 문장을 다시 확인";
  const topicCandidate = fallback.topic_candidate || input.subject;
  const mistakeType = fallback.mistake_type || "개념 혼동 후보";

  if (input.mode === "first") {
    const firstFallback = fallback as FirstCaptureNoteSignals;
    return {
      ...firstFallback,
      question_summary: firstFallback.question_or_case_summary || "문제 요약 후보",
      user_answer_summary: firstFallback.user_answer_summary || "내 답안 요약 후보",
      likely_mistake_reason: `${String(firstFallback.likely_mistake_reason ?? "실수 원인")}(후보, 점검 필요)`,
      key_concepts: Array.isArray(firstFallback.key_concepts) ? firstFallback.key_concepts : [],
      one_biggest_gap: baseGap,
      one_next_action: baseNext,
      topic_candidate: `${topicCandidate}(후보)`,
      mistake_type: `${mistakeType}(점검 필요)`,
      next_task_type: firstFallback.next_task_type || "retry",
    };
  }

  const secondFallback = fallback as SecondCaptureNoteSignals;
  return {
    ...secondFallback,
    case_or_question_summary: secondFallback.question_or_case_summary || "사례 요약 후보",
    user_answer_summary: secondFallback.user_answer_summary || "내 답안 요약 후보",
    missing_issue_candidate: `${String(secondFallback.missing_issue_candidate ?? secondFallback.one_biggest_gap)}(후보)`,
    weak_structure_point: `${String(secondFallback.weak_structure_point || "구조 취약 지점")}(점검 필요)`,
    rewrite_instruction: confirmedRewrite || secondFallback.rewrite_instruction || baseNext,
    one_biggest_gap: baseGap,
    one_next_action: baseNext,
    topic_candidate: `${topicCandidate}(후보)`,
    mistake_type: `${mistakeType}(다시 확인할 부분)`,
    next_task_type: secondFallback.next_task_type || "rewrite",
  };
}
