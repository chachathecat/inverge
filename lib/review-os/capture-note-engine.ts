import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { buildSecondAnswerRewriteSignal } from "./second-answer-rewrite";
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
  calculation_risk?: string | null;
  unit_risk?: string | null;
  rewrite_task_type?: "second_answer_rewrite";
  supported_calculator_template_id?: string | null;
  casio_keystrokes?: string[] | null;
  casio_unsupported_message?: string;
};

export type CaptureNoteSignals = FirstCaptureNoteSignals | SecondCaptureNoteSignals;

function hasExplicitTimeManagementIssue(input: WrongAnswerItemInput) {
  const text = `${input.userReasonText ?? ""} ${input.userReasonPreset ?? ""}`;
  return /시간\s*(관리|부족|압박)|시간이\s*(부족|모자)/.test(text);
}

function resolveFirstCaptureGap(input: WrongAnswerItemInput) {
  const reason = input.userReasonText?.trim() || input.userReasonPreset?.trim() || "";
  if (/무효|취소/.test(reason)) return "무효와 취소 구분 / 개념 혼동";
  if (reason && !/^\d+\s*분$/.test(reason)) return reason;
  if (input.correctAnswer?.trim() && input.userAnswer?.trim() && input.correctAnswer.trim() !== input.userAnswer.trim()) return "wrong_answer";
  if (hasExplicitTimeManagementIssue(input)) return "time_management";
  return "concept_confusion";
}

function resolveFirstNextAction(input: WrongAnswerItemInput) {
  const text = `${input.subjectLabel} ${input.problemTitle ?? ""} ${input.userReasonText ?? ""} ${input.keyConcepts?.join(" ") ?? ""}`;
  if (/무효|취소/.test(text)) return "민법 무효·취소 O/X 재시도";
  if (/함정|표현|선지|오독/.test(text)) return "함정어 1개 표시 후 O/X 재시도";
  if (/암기|정의|개념/.test(text)) return "핵심 개념 1개 빈칸 회상";
  return input.comparisonPoint || "근거 1줄을 떠올린 뒤 O/X 재시도";
}

function resolveSecondSubjectGap(input: WrongAnswerItemInput) {
  const subject = input.subjectLabel;
  const text = `${input.problemTitle ?? ""} ${input.rawQuestionText ?? ""} ${input.missingIssue ?? ""} ${input.biggestGap ?? ""} ${input.weakStructurePoint ?? ""}`;
  if (subject === "감정평가 및 보상법규") {
    if (/사업인정|처분성/.test(text)) return "사업인정 처분성·권리구제 관계 구분";
    if (/항고소송|수용재결/.test(text)) return "항고소송/수용재결 관계 구분";
    return input.biggestGap || input.missingIssue || "요건/포섭과 목차 구조 보강";
  }
  if (subject === "감정평가이론") return input.biggestGap || input.missingIssue || "키워드와 논리 연결 보강";
  return input.biggestGap || input.missingIssue || "계산 근거와 결론 연결 보강";
}

function resolveSecondSubjectNextAction(input: WrongAnswerItemInput) {
  const subject = input.subjectLabel;
  const text = `${input.problemTitle ?? ""} ${input.rawQuestionText ?? ""} ${input.missingIssue ?? ""} ${input.biggestGap ?? ""}`;
  if (subject === "감정평가 및 보상법규") {
    if (/처분성|사업인정/.test(text)) return "처분성 판단 문단 보강";
    if (/항고소송|수용재결/.test(text)) return "항고소송/수용재결 관계 구분";
    return "목차 3줄 회상 후 10분 다시쓰기";
  }
  if (subject === "감정평가이론") return "키워드 3개 회상 후 한 문단 설명";
  return input.rewriteInstruction || "산식·단위·검산 순서로 10분 다시쓰기";
}

export function buildCaptureNoteSignals(mode: AppraisalMode, input: WrongAnswerItemInput): CaptureNoteSignals {
  const oneBiggestGap = (mode === "second" ? resolveSecondSubjectGap(input) : resolveFirstCaptureGap(input)) ?? "개념 혼동";
  const oneNextAction = (mode === "second" ? resolveSecondSubjectNextAction(input) : resolveFirstNextAction(input)) ?? "다음 행동 실행";
  const base = {
    mode,
    subject: input.subjectLabel,
    question_or_case_summary: input.caseSummary || input.problemTitle || `${input.subjectLabel} 캡처 확인 초안`,
    user_answer_summary: input.myAnswerSummary || "사용자 확인 후 개인 노트에만 보관",
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

  const rewriteSignal = buildSecondAnswerRewriteSignal(input);
  return {
    ...base,
    mode: "second",
    next_task_type: "rewrite",
    missing_issue_candidate: rewriteSignal.missingIssueCandidate,
    weak_structure_point: rewriteSignal.weakStructurePoint,
    rewrite_instruction: rewriteSignal.rewriteInstruction,
    next_rewrite_action: rewriteSignal.nextRewriteAction,
    calculation_risk: rewriteSignal.calculationRisk ?? null,
    unit_risk: rewriteSignal.unitRisk ?? null,
    rewrite_task_type: rewriteSignal.rewriteTaskType,
    supported_calculator_template_id: rewriteSignal.supportedCalculatorTemplateId ?? null,
    casio_keystrokes: rewriteSignal.casioKeystrokes ?? null,
    casio_unsupported_message: rewriteSignal.casioUnsupportedMessage,
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
