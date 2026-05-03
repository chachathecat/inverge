import type { AppraisalMode } from "@/lib/review-os/appraisal";
import type { WrongAnswerItemInput } from "@/lib/review-os/types";

export function buildCaptureNoteSignals(mode: AppraisalMode, input: WrongAnswerItemInput) {
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
      likely_mistake_reason: input.userReasonPreset || input.userReasonText || "개념 혼동",
      key_concepts: input.keyConcepts ?? [],
      next_review_action: oneNextAction,
    };
  }

  return {
    ...base,
    missing_issue_candidate: input.missingIssue || input.biggestGap || "핵심 논점 누락",
    rewrite_instruction: input.rewriteInstruction || oneNextAction,
    next_rewrite_action: oneNextAction,
  };
}
