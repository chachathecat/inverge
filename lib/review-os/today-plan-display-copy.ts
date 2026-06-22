type TodayPlanDisplaySource = "review_queue" | "personal_concept_graph" | "study_schedule";

export type TodayPlanDisplayCopyInput = {
  source?: TodayPlanDisplaySource | "problem_snap" | "first_ox" | "capture_note" | "mode_migration" | string;
  sourceLabel?: string;
  prioritySignals?: string[];
  taskType?: string;
  primaryAction?: string;
  primaryCtaLabel?: string;
};

export type TodayPlanDisplayCopy = {
  displayReason: string;
  displaySourceLabel?: "학습 노트에서 생성됨" | "복습 예정" | "미완료 항목" | "약점 개념" | "오늘 일정" | "계산·검산 루틴 기반";
  displayPrimaryCta: string;
};

const INTERNAL_SOURCE_LABELS = new Set(["review_queue", "personal_concept_graph", "study_schedule"]);

function normalizeTaskType(taskType?: string) {
  return (taskType ?? "").trim().toLowerCase().replaceAll("_", " ");
}

function hasSignal(signals: string[], pattern: RegExp) {
  return signals.some((signal) => pattern.test(signal));
}

function resolveDisplaySourceLabel(input: TodayPlanDisplayCopyInput): TodayPlanDisplayCopy["displaySourceLabel"] {
  const label = input.sourceLabel ?? "";
  if (/미완료|unfinished|incomplete|pending/i.test(label)) return "미완료 항목";
  if (/오늘\s*기록|캡처\s*노트|저장한\s*캡처|Capture-to-Note|Problem Snap/i.test(label)) return "학습 노트에서 생성됨";
  if (/복습\s*큐|review\s*queue|복습\s*예정/i.test(label)) return "복습 예정";
  if (/오답\s*노트|학습\s*노트/i.test(label)) return "미완료 항목";
  if (/계산·검산\s*루틴|calculator[-_ ]routine/i.test(label)) return "계산·검산 루틴 기반";
  if (/개념|O\/X|약점|헷갈/.test(label)) return "약점 개념";
  if (/일정/.test(label)) return "오늘 일정";

  if (input.source === "review_queue") return "복습 예정";
  if (input.source === "personal_concept_graph") return "약점 개념";
  if (input.source === "study_schedule") return "오늘 일정";
  return undefined;
}

function resolveDisplayReason(input: TodayPlanDisplayCopyInput) {
  const signals = input.prioritySignals ?? [];
  const taskType = normalizeTaskType(input.taskType);
  const sourceLabel = resolveDisplaySourceLabel(input);

  if (input.source === "study_schedule" || sourceLabel === "오늘 일정" || hasSignal(signals, /schedule_(track_focus|primary_block)/)) {
    return "오늘 일정의 주 과제와 맞아 먼저 실행합니다.";
  }

  if (hasSignal(signals, /review_queue_due_bucket|due_review|overdue|missed_due/) || input.source === "review_queue" || sourceLabel === "복습 예정" || sourceLabel === "학습 노트에서 생성됨") {
    if (taskType.includes("rewrite") || taskType.includes("second answer")) return "답안 구조가 흔들린 항목이라 한 문단만 다시 씁니다.";
    if (taskType.includes("accounting") || taskType.includes("calculator") || taskType.includes("casio")) return "계산 흐름이 끊긴 항목이라 틀만 짧게 다시 확인합니다.";
    return "예정 복습이 도착해 먼저 회상합니다.";
  }

  if (sourceLabel === "계산·검산 루틴 기반" || taskType.includes("calculator routine")) {
    return "계산·검산 루틴에서 남은 복구 신호라 입력 순서와 단위를 짧게 다시 확인합니다.";
  }

  if (hasSignal(signals, /wrong_concept|confused_concept|high_risk_unit|recent_missed_tasks|confidence:needs_check/) || input.source === "personal_concept_graph" || sourceLabel === "약점 개념") {
    if (taskType.includes("rewrite") || taskType.includes("second answer")) return "답안 구조가 흔들린 항목이라 한 문단만 다시 씁니다.";
    return "헷갈린 개념이 반복되어 O/X로 기준을 고정합니다.";
  }

  if (taskType.includes("rewrite") || taskType.includes("second answer")) return "답안 구조가 흔들린 항목이라 한 문단만 다시 씁니다.";
  if (taskType.includes("cloze") || taskType.includes("concept")) return "헷갈린 개념이 반복되어 O/X로 기준을 고정합니다.";
  return "최근 틀린 항목이라 짧게 다시 확인합니다.";
}

function resolveDisplayPrimaryCta(input: TodayPlanDisplayCopyInput) {
  const label = (input.primaryCtaLabel ?? input.primaryAction ?? "").trim();
  if (label.length > 0 && !INTERNAL_SOURCE_LABELS.has(label)) return label;

  const taskType = normalizeTaskType(input.taskType);
  if (taskType.includes("rewrite") || taskType.includes("second answer")) return "다시 쓰기";
  if (taskType.includes("accounting") || taskType.includes("calculator") || taskType.includes("casio")) return "계산 루틴 확인";
  if (taskType.includes("ox") || taskType.includes("o/x") || taskType.includes("first")) return "다시 풀기";
  return "시작하기";
}

export function buildTodayPlanDisplayCopy(input: TodayPlanDisplayCopyInput): TodayPlanDisplayCopy {
  return {
    displayReason: resolveDisplayReason(input),
    displaySourceLabel: resolveDisplaySourceLabel(input),
    displayPrimaryCta: resolveDisplayPrimaryCta(input),
  };
}
