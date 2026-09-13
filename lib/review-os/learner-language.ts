export const REVIEW_OS_LEARNER_LANGUAGE = Object.freeze({
  today: "오늘",
  primaryTask: "오늘의 한 가지",
  todayPlan: "오늘 할 일",
  fullDayPlan: "오늘 전체 공부표",
  reviewQueue: "복습 대기",
  studyLedger: "내 공부 기록",
  biggestGap: "가장 큰 감점 원인",
  repair: "지금 고치기",
  d1: "다음 날 혼자 해보기",
  d7: "일주일 뒤 다른 문제",
  recurrence: "제한시간 실전 확인",
  stable: "현재 안정",
  reopened: "다시 확인 필요",
  unavailable: "확인 필요",
} as const);

const RECORD_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  D0_OPEN: "첫 답안 작성 중",
  FEEDBACK_COMMITTED: "가장 큰 감점 원인 고치기",
  REPAIRED: "다음 날 혼자 해보기 대기",
  D1_COMPLETE: "일주일 뒤 다른 문제 대기",
  D7_COMPLETE: "제한시간 실전 확인 대기",
  CLOSED: REVIEW_OS_LEARNER_LANGUAGE.stable,
  REOPENED: REVIEW_OS_LEARNER_LANGUAGE.reopened,
});

const REVIEW_PHASE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  D1: REVIEW_OS_LEARNER_LANGUAGE.d1,
  D7_TRANSFER: REVIEW_OS_LEARNER_LANGUAGE.d7,
  RECURRENCE: REVIEW_OS_LEARNER_LANGUAGE.recurrence,
  REOPENED_REVIEW: "다시 혼자 확인하기",
});

const PLAN_KIND_LABELS: Readonly<Record<string, string>> = Object.freeze({
  TODAY: REVIEW_OS_LEARNER_LANGUAGE.todayPlan,
  FULL_DAY: REVIEW_OS_LEARNER_LANGUAGE.fullDayPlan,
});

const PLAN_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PROPOSED: "확인 전",
  ACCEPTED: "수락함",
  EDITED: "고쳐서 수락함",
  REJECTED: "사용하지 않음",
  STALE: REVIEW_OS_LEARNER_LANGUAGE.reopened,
});

const PLAN_COMPLETION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ACTIONABLE: "진행 중",
  COMPLETED: "완료",
  TERMINAL_INCOMPLETE: "미완료 종료",
});

const PLAN_TERMINAL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  COMPLETED: "모두 완료",
  REJECTED: "사용하지 않음",
  SUPERSEDED: "새 계획으로 바뀜",
  ELIGIBILITY_CHANGED: "가능한 복습이 바뀜",
});

const PLAN_BLOCK_LABELS: Readonly<Record<string, string>> = Object.freeze({
  CORE_OUTCOME: "중요 학습",
  SUPPORT: "보조 학습",
});

const EXECUTION_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PENDING: "할 일",
  COMPLETE: "완료",
});

const GAP_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  OPEN: "고치는 중",
  CLOSED: REVIEW_OS_LEARNER_LANGUAGE.stable,
  REOPENED: REVIEW_OS_LEARNER_LANGUAGE.reopened,
});

const LEDGER_ENTRY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  D0_FROZEN: "첫 답안 저장",
  GAP_OPENED: "감점 원인 확인",
  REPAIR_RECORDED: "직접 고치기 저장",
  D1_RECONSTRUCTED: REVIEW_OS_LEARNER_LANGUAGE.d1,
  D1_ASSISTED: "도움을 사용한 다음 날 복습",
  D7_TRANSFERRED: REVIEW_OS_LEARNER_LANGUAGE.d7,
  RECURRENCE_COMPLETED: REVIEW_OS_LEARNER_LANGUAGE.recurrence,
  GAP_REOPENED: REVIEW_OS_LEARNER_LANGUAGE.reopened,
  REOPENED_COMPLETED: "다시 혼자 확인함",
});

function labelFor(labels: Readonly<Record<string, string>>, value: string | null | undefined) {
  if (!value) return REVIEW_OS_LEARNER_LANGUAGE.unavailable;
  return labels[value] ?? REVIEW_OS_LEARNER_LANGUAGE.unavailable;
}

export function learnerRecordStateLabel(value: string | null | undefined) {
  return labelFor(RECORD_STATE_LABELS, value);
}

export function learnerReviewPhaseLabel(value: string | null | undefined) {
  return labelFor(REVIEW_PHASE_LABELS, value);
}

export function learnerPlanKindLabel(value: string | null | undefined) {
  return labelFor(PLAN_KIND_LABELS, value);
}

export function learnerPlanStateLabel(value: string | null | undefined) {
  return labelFor(PLAN_STATE_LABELS, value);
}

export function learnerPlanCompletionLabel(value: string | null | undefined) {
  return labelFor(PLAN_COMPLETION_LABELS, value);
}

export function learnerPlanTerminalLabel(value: string | null | undefined) {
  if (value === null) return "해당 없음";
  return labelFor(PLAN_TERMINAL_LABELS, value);
}

export function learnerPlanBlockLabel(value: string | null | undefined) {
  return labelFor(PLAN_BLOCK_LABELS, value);
}

export function learnerExecutionStateLabel(value: string | null | undefined) {
  return labelFor(EXECUTION_STATE_LABELS, value);
}

export function learnerGapStateLabel(value: string | null | undefined) {
  return labelFor(GAP_STATE_LABELS, value);
}

export function learnerLedgerEntryLabel(value: string | null | undefined) {
  return labelFor(LEDGER_ENTRY_LABELS, value);
}

export function learnerDueAtLabel(value: string | null | undefined) {
  if (!value) return REVIEW_OS_LEARNER_LANGUAGE.unavailable;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return REVIEW_OS_LEARNER_LANGUAGE.unavailable;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(parsed);
}
