import {
  APPRAISAL_FIRST_SUBJECTS,
  APPRAISAL_SECOND_SUBJECTS,
  getFirstSubjectTemplate,
  getSecondSubjectTemplate,
  type RecallOutcome,
  type ReviewQueueCard,
} from "./types";

const FIRST_RETRIEVAL_PROMPTS: Record<(typeof APPRAISAL_FIRST_SUBJECTS)[number], string> = {
  민법: "요건/효과/예외 중 하나를 먼저 떠올려 보세요.",
  경제학원론: "그래프 이동 방향 또는 균형 변화를 먼저 떠올려 보세요.",
  부동산학원론: "정의 또는 계산 조건 1개를 먼저 떠올려 보세요.",
  감정평가관계법규: "조문/요건/절차 중 하나를 먼저 떠올려 보세요.",
  회계학: "분개 방향, 인식 시점, 계산 조건 중 하나를 먼저 떠올려 보세요.",
};

const SECOND_RETRIEVAL_PROMPTS: Record<(typeof APPRAISAL_SECOND_SUBJECTS)[number], string> = {
  감정평가실무: "산식, 단위, 결론 기재값 중 하나를 먼저 적어 보세요.",
  감정평가이론: "정의, 논거, 사례 적용 키워드 3개를 먼저 떠올려 보세요.",
  "감정평가 및 보상법규": "쟁점, 조문/요건, 사안 포섭 순서를 먼저 떠올려 보세요.",
};

export const RECALL_OUTCOME_OPTIONS: Array<{ value: RecallOutcome; label: string }> = [
  { value: "remembered", label: "기억남" },
  { value: "fuzzy", label: "헷갈림" },
  { value: "wrong", label: "틀림" },
  { value: "confident_wrong", label: "확신하고 틀림" },
];

type RetrievalPromptItem = Pick<ReviewQueueCard, "subjectLabel" | "topicTag" | "mistakeType">;

export function getRetrievalPrompt(item: RetrievalPromptItem, mode: "first" | "second"): string {
  if (mode === "first") {
    if (APPRAISAL_FIRST_SUBJECTS.includes(item.subjectLabel as (typeof APPRAISAL_FIRST_SUBJECTS)[number])) {
      return FIRST_RETRIEVAL_PROMPTS[item.subjectLabel as (typeof APPRAISAL_FIRST_SUBJECTS)[number]];
    }
    const template = getFirstSubjectTemplate(item.subjectLabel);
    return `${template.checkpoints.slice(0, 3).join("/")} 중 하나를 먼저 떠올려 보세요.`;
  }

  if (APPRAISAL_SECOND_SUBJECTS.includes(item.subjectLabel as (typeof APPRAISAL_SECOND_SUBJECTS)[number])) {
    return SECOND_RETRIEVAL_PROMPTS[item.subjectLabel as (typeof APPRAISAL_SECOND_SUBJECTS)[number]];
  }
  const template = getSecondSubjectTemplate(item.subjectLabel);
  const retrievalSeed = template.checklist.slice(0, 3).join(", ");
  return `${retrievalSeed || template.structure} 중 오늘 보강할 기준을 먼저 떠올려 보세요.`;
}

export function getRecallOutcomeCopy(outcome: RecallOutcome): string {
  return RECALL_OUTCOME_OPTIONS.find((option) => option.value === outcome)?.label ?? "헷갈림";
}

export function getSuggestedReviewIntervalCopy(outcome: RecallOutcome): string {
  if (outcome === "remembered") return "며칠 뒤 다시 확인";
  if (outcome === "fuzzy") return "내일 또는 3일 뒤 다시 확인";
  if (outcome === "wrong") return "내일 다시 확인";
  return "오늘 한 번 더 + 내일 다시 확인";
}
