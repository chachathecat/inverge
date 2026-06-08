import { buildLearningMetricEvent } from "./learning-metrics";
import { recordLearningMetricIfEnabled } from "./learning-metrics-sink";
import { assertNoRawUserDataInDerived } from "./data-boundary";
import { normalizeCurriculumTaskType } from "./curriculum-engine";
import type { AppraiserExamMode, CurriculumImportance, CurriculumRiskLevel } from "./curriculum-reference";
import { rankLearningStateRisk, type PersonalLearningStateSnapshot, type PersonalLearningStatus } from "./personal-learning-state-engine";

export type AdaptiveStudyPlanCandidateSource = "personal_learning_state" | "review_queue" | "capture" | "curriculum";

export type AdaptiveCurriculumNode = {
  id?: string;
  nodeId?: string;
  conceptNodeId?: string;
  unitId?: string;
  unitName?: string;
  subjectId?: string;
  subjectName?: string;
  examMode?: AppraiserExamMode | string;
  taskTypes?: string[];
  importance?: CurriculumImportance | string;
  riskLevel?: CurriculumRiskLevel | string;
  passRisk?: "low" | "medium" | "high" | string;
  metadataOnly?: true;
};

export type AdaptiveExternalCandidate = {
  id: string;
  examMode: AppraiserExamMode | string;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  conceptNodeId?: string;
  taskType?: string;
  title?: string;
  rationale?: string;
  primaryAction?: string;
  estimatedMinutes?: number;
  dueAt?: string | Date | null;
  dueBucket?: string;
  prioritySignals?: string[];
  ocrConfirmationPending?: boolean;
  metadataOnly?: true;
};

export type AdaptiveStudyPlannerInput = {
  userId: string;
  examMode: AppraiserExamMode | string;
  currentDate: string | Date;
  dailyAvailableMinutes: number;
  daysUntilExam: number;
  personalLearningStates?: PersonalLearningStateSnapshot[];
  curriculumNodes?: AdaptiveCurriculumNode[];
  existingReviewQueueCandidates?: AdaptiveExternalCandidate[];
  existingCaptureCandidates?: AdaptiveExternalCandidate[];
  recentActivity?: Array<Record<string, unknown>>;
  missedDays?: number;
};

export type AdaptiveStudyPlanTask = {
  id: string;
  source: AdaptiveStudyPlanCandidateSource;
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  conceptNodeId?: string;
  taskType: string;
  title: string;
  rationale: string;
  primaryAction: string;
  estimatedMinutes: number;
  prioritySignals: string[];
  isPrimaryTask: true;
  metadataOnly: true;
  planningScore: number;
};

export type AdaptiveRecoveryPlan = {
  metadataOnly: true;
  required: boolean;
  items: string[];
  estimatedMinutes: number;
  planningReason: string;
};

export type AdaptiveWeeklyPlan = {
  metadataOnly: true;
  weeklyFocus: string[];
  targetConcepts: string[];
  recoveryItems: string[];
  estimatedTotalMinutes: number;
  recoveryPlan: AdaptiveRecoveryPlan;
  riskSummary: string;
  planningReason: string;
  safeFallbackReason?: string;
};

export type AdaptiveTodayPlan = AdaptiveWeeklyPlan & {
  todayPlanTasks: AdaptiveStudyPlanTask[];
};

type RankedSource = AdaptiveStudyPlanTask & { originalIndex: number };

const MAX_TODAY_PLAN_TASKS = 3;
const DAY_MS = 86_400_000;
const SUPPORTED_EXAM_MODES = new Set(["first", "second"]);
const FORBIDDEN_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*점수/,
  /공식\s*모범\s*답안/,
  /official\s+grading/i,
  /official\s+score/i,
  /official\s+model\s+answer/i,
  /score\s*prediction/i,
  /pass\s*\/\s*fail/i,
  /pass[-\s]*fail/i,
  /합격\s*보장/,
  /실패자/,
  /게으름/,
  /망했/,
  /불합격\s*확정/,
  /지금\s*안\s*하면\s*끝/,
  /공포/,
  /부끄럽/,
  /순위\s*하락/,
  /streak/i,
  /casino/i,
  /gacha/i,
  /랜덤\s*보상/,
];

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (!SUPPORTED_EXAM_MODES.has(String(examMode))) throw new Error(`unsupported-adaptive-study-plan-exam-mode:${String(examMode)}`);
}

function safeDate(value: string | Date, fallback = new Date()) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const ts = Date.parse(String(value));
  return Number.isFinite(ts) ? new Date(ts) : fallback;
}

function daysBetween(left: Date, right: string | Date | null | undefined) {
  if (!right) return Number.POSITIVE_INFINITY;
  const date = safeDate(right, new Date(Number.NaN));
  if (!Number.isFinite(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((date.getTime() - left.getTime()) / DAY_MS);
}

function unique(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

function normalizeStatus(value: unknown): PersonalLearningStatus {
  if (value === "confident_wrong" || value === "wrong" || value === "confused" || value === "recovering" || value === "stable") return value;
  return "unknown";
}

function normalizeTaskType(value: unknown, examMode: AppraiserExamMode) {
  const normalized = normalizeCurriculumTaskType(typeof value === "string" ? value : "") ?? (typeof value === "string" ? value.trim() : "");
  if (normalized) return normalized;
  return examMode === "second" ? "rewrite" : "O/X";
}

function minuteCap(dailyAvailableMinutes: number) {
  if (dailyAvailableMinutes <= 30) return 10;
  if (dailyAvailableMinutes <= 60) return 15;
  if (dailyAvailableMinutes <= 90) return 20;
  return 30;
}

function hasDueSignal(signals: string[]) {
  return signals.includes("due_review") || signals.includes("review_queue_due") || signals.some((signal) => /due_bucket:(soon|today|overdue)|review_queue_due_bucket:soon/.test(signal));
}

function curriculumNodeId(node: AdaptiveCurriculumNode) {
  return node.conceptNodeId ?? node.unitId ?? node.nodeId ?? node.id;
}

function nodeLabel(node: Pick<AdaptiveCurriculumNode, "unitName" | "subjectName" | "unitId" | "subjectId">) {
  return node.unitName ?? node.subjectName ?? node.unitId ?? node.subjectId ?? "핵심 개념";
}

function buildCurriculumIndex(nodes: AdaptiveCurriculumNode[] = []) {
  const index = new Map<string, AdaptiveCurriculumNode>();
  for (const node of nodes) {
    for (const key of unique([node.id, node.nodeId, node.conceptNodeId, node.unitId])) index.set(key, node);
  }
  return index;
}

function curriculumForState(state: PersonalLearningStateSnapshot, index: Map<string, AdaptiveCurriculumNode>) {
  return index.get(state.conceptNodeId);
}

function isHighRisk(node: AdaptiveCurriculumNode | undefined) {
  return node?.riskLevel === "high" || node?.passRisk === "high";
}

function isHighImportance(node: AdaptiveCurriculumNode | undefined) {
  return node?.importance === "high";
}

function statusSignals(status: PersonalLearningStatus) {
  if (status === "confident_wrong") return ["learning_state:confident_wrong", "confident_wrong_concept"];
  if (status === "wrong") return ["learning_state:wrong", "wrong_concept"];
  if (status === "confused") return ["learning_state:confused", "confused_concept"];
  if (status === "recovering") return ["learning_state:recovering", "recovering_due_review"];
  if (status === "stable") return ["learning_state:stable"];
  return ["learning_state:unknown"];
}

function safeActionCopy(input: { examMode: AppraiserExamMode; label: string; taskType: string; signals: string[]; minutes: number }) {
  const duePrefix = hasDueSignal(input.signals) ? "예정된 복습으로 " : "";
  const recoveryPrefix = input.signals.includes("recovery_candidate") ? "놓친 항목은 복구 신호로 보고, " : "";
  if (input.signals.includes("ocr_confirmation_pending")) {
    return {
      title: `${input.label} 확인 먼저`,
      rationale: "저장된 캡처 후보는 내용 확정 전이므로 새 진도보다 먼저 정리합니다.",
      primaryAction: "확인 필요한 항목 1개만 정리하고 저장하기",
    };
  }
  if (input.examMode === "second" || input.taskType === "rewrite") {
    return {
      title: `${input.label} 짧은 다시쓰기`,
      rationale: `${recoveryPrefix}${duePrefix}논점 흐름 1개만 다시 실행합니다.`,
      primaryAction: `${input.minutes}분 동안 쟁점 1개를 회상하고 한 문단 다시쓰기`,
    };
  }
  if (input.taskType === "cloze") {
    return {
      title: `${input.label} 핵심어 회상`,
      rationale: `${recoveryPrefix}${duePrefix}설명 전에 먼저 떠올릴 항목만 남겼습니다.`,
      primaryAction: `${input.minutes}분 동안 핵심어 3개를 가리고 말하기`,
    };
  }
  return {
    title: `${input.label} 재시도`,
    rationale: `${recoveryPrefix}${duePrefix}판단 기준 1개만 다시 확인합니다.`,
    primaryAction: `${input.minutes}분 동안 먼저 풀고 근거 1줄 남기기`,
  };
}

function scoreCandidate(candidate: AdaptiveStudyPlanTask) {
  let score = candidate.planningScore;
  if (hasDueSignal(candidate.prioritySignals)) score += 180;
  if (candidate.prioritySignals.includes("ocr_confirmation_pending")) score += 170;
  if (candidate.prioritySignals.includes("confident_wrong_concept") || candidate.prioritySignals.includes("learning_state:confident_wrong")) score += 145;
  if (candidate.prioritySignals.includes("wrong_concept") || candidate.prioritySignals.includes("learning_state:wrong")) score += 112;
  if (candidate.prioritySignals.includes("confused_concept") || candidate.prioritySignals.includes("learning_state:confused")) score += 88;
  if (candidate.prioritySignals.includes("recovering_due_review") && hasDueSignal(candidate.prioritySignals)) score += 122;
  if (candidate.prioritySignals.includes("high_risk_node") || candidate.prioritySignals.includes("high_risk_unit")) score += 72;
  if (candidate.prioritySignals.includes("high_importance_unit")) score += 48;
  if (candidate.prioritySignals.includes("stable_new_study")) score -= 45;
  return score;
}

function sourceRank(source: AdaptiveStudyPlanCandidateSource) {
  if (source === "review_queue") return 0;
  if (source === "capture") return 1;
  if (source === "personal_learning_state") return 2;
  return 3;
}

function assertSafeOutput(value: unknown) {
  assertNoRawUserDataInDerived(value);
  const visit = (entry: unknown): void => {
    if (typeof entry === "string") {
      const forbidden = FORBIDDEN_COPY_PATTERNS.find((pattern) => pattern.test(entry));
      if (forbidden) throw new Error(`forbidden-adaptive-study-plan-copy:${String(forbidden)}`);
      return;
    }
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) return entry.forEach(visit);
    Object.values(entry as Record<string, unknown>).forEach(visit);
  };
  visit(value);
}

function fallbackPlan(reason: string): AdaptiveTodayPlan {
  return {
    metadataOnly: true,
    todayPlanTasks: [],
    weeklyFocus: [],
    targetConcepts: [],
    recoveryItems: [],
    estimatedTotalMinutes: 0,
    recoveryPlan: { metadataOnly: true, required: false, items: [], estimatedMinutes: 0, planningReason: "복구할 누락 복습 신호가 없습니다." },
    riskSummary: "계획을 만들 학습 상태 메타데이터가 아직 부족합니다.",
    planningReason: "먼저 오늘 실행 또는 캡처 기록 1개를 남기면 계획을 고정할 수 있습니다.",
    safeFallbackReason: reason,
  };
}

function candidatesFromLearningStates(input: AdaptiveStudyPlannerInput, curriculumIndex: Map<string, AdaptiveCurriculumNode>): AdaptiveStudyPlanTask[] {
  const examMode = input.examMode as AppraiserExamMode;
  const currentDate = safeDate(input.currentDate);
  const cap = minuteCap(input.dailyAvailableMinutes);
  return (input.personalLearningStates ?? [])
    .filter((state) => state.userId === input.userId && state.examMode === examMode)
    .map((state) => {
      const status = normalizeStatus(state.status);
      const node = curriculumForState(state, curriculumIndex);
      const dueInDays = daysBetween(currentDate, state.nextReviewAt);
      const due = dueInDays <= 0;
      const taskType = normalizeTaskType(node?.taskTypes?.[0], examMode);
      const signals = unique([
        ...statusSignals(status),
        due ? "due_review" : undefined,
        status === "stable" && !due ? "stable_new_study" : undefined,
        status === "recovering" && due ? "recovering_due_review" : undefined,
        isHighRisk(node) ? "high_risk_node" : undefined,
        isHighRisk(node) ? "high_risk_unit" : undefined,
        isHighImportance(node) ? "high_importance_unit" : undefined,
      ]);
      const minutes = Math.min(cap, status === "confused" ? 10 : examMode === "second" ? 20 : 15);
      const copy = safeActionCopy({ examMode, label: nodeLabel(node ?? { subjectName: state.subject, unitId: state.conceptNodeId }), taskType, signals, minutes });
      return {
        id: `adaptive:state:${state.conceptNodeId}`,
        source: "personal_learning_state" as const,
        examMode,
        subjectId: node?.subjectId,
        subjectName: node?.subjectName ?? state.subject,
        unitId: node?.unitId ?? state.conceptNodeId,
        unitName: node?.unitName,
        conceptNodeId: state.conceptNodeId,
        taskType,
        ...copy,
        estimatedMinutes: minutes,
        prioritySignals: signals,
        isPrimaryTask: true as const,
        metadataOnly: true as const,
        planningScore: rankLearningStateRisk(status) + (due ? 80 : 0) + (Number(state.priority ?? 0) || 0),
      };
    });
}

function candidatesFromExternal(input: AdaptiveStudyPlannerInput, kind: "review_queue" | "capture", candidates: AdaptiveExternalCandidate[] | undefined): AdaptiveStudyPlanTask[] {
  const examMode = input.examMode as AppraiserExamMode;
  const currentDate = safeDate(input.currentDate);
  const cap = minuteCap(input.dailyAvailableMinutes);
  return (candidates ?? [])
    .filter((candidate) => candidate.examMode === examMode)
    .map((candidate) => {
      const due = candidate.dueBucket === "soon" || candidate.dueBucket === "today" || candidate.dueBucket === "overdue" || daysBetween(currentDate, candidate.dueAt) <= 0;
      const taskType = normalizeTaskType(candidate.taskType, examMode);
      const signals = unique([
        ...(candidate.prioritySignals ?? []),
        due ? "due_review" : undefined,
        kind === "capture" && candidate.ocrConfirmationPending ? "ocr_confirmation_pending" : undefined,
      ]);
      const minutes = Math.min(cap, Math.max(5, Math.min(candidate.estimatedMinutes ?? (kind === "capture" ? 5 : 15), 30)));
      const copy = safeActionCopy({ examMode, label: nodeLabel(candidate), taskType, signals, minutes });
      return {
        id: `adaptive:${kind}:${candidate.id}`,
        source: kind,
        examMode,
        subjectId: candidate.subjectId,
        subjectName: candidate.subjectName,
        unitId: candidate.unitId,
        unitName: candidate.unitName,
        conceptNodeId: candidate.conceptNodeId,
        taskType,
        ...copy,
        estimatedMinutes: minutes,
        prioritySignals: signals,
        isPrimaryTask: true as const,
        metadataOnly: true as const,
        planningScore: kind === "capture" && candidate.ocrConfirmationPending ? 160 : due ? 120 : 50,
      };
    });
}

function candidatesFromCurriculum(input: AdaptiveStudyPlannerInput): AdaptiveStudyPlanTask[] {
  const examMode = input.examMode as AppraiserExamMode;
  const cap = minuteCap(input.dailyAvailableMinutes);
  return (input.curriculumNodes ?? [])
    .filter((node) => node.examMode === undefined || node.examMode === examMode)
    .map((node) => {
      const taskType = normalizeTaskType(node.taskTypes?.[0], examMode);
      const signals = unique([
        "curriculum_new_study",
        isHighRisk(node) ? "high_risk_node" : undefined,
        isHighRisk(node) ? "high_risk_unit" : undefined,
        isHighImportance(node) ? "high_importance_unit" : undefined,
      ]);
      const minutes = Math.min(cap, examMode === "second" ? 20 : 15);
      const copy = safeActionCopy({ examMode, label: nodeLabel(node), taskType, signals, minutes });
      return {
        id: `adaptive:curriculum:${curriculumNodeId(node) ?? nodeLabel(node)}`,
        source: "curriculum" as const,
        examMode,
        subjectId: node.subjectId,
        subjectName: node.subjectName,
        unitId: node.unitId ?? curriculumNodeId(node),
        unitName: node.unitName,
        conceptNodeId: node.conceptNodeId,
        taskType,
        ...copy,
        estimatedMinutes: minutes,
        prioritySignals: signals,
        isPrimaryTask: true as const,
        metadataOnly: true as const,
        planningScore: 20 + (isHighRisk(node) ? 55 : 0) + (isHighImportance(node) ? 35 : 0),
      };
    });
}

function dedupeKey(candidate: AdaptiveStudyPlanTask) {
  return [candidate.examMode, candidate.subjectId ?? candidate.subjectName ?? "subject", candidate.unitId ?? candidate.conceptNodeId ?? candidate.unitName ?? "unit", candidate.taskType].join("|");
}

export function rankAdaptiveStudyCandidates(input: AdaptiveStudyPlannerInput): AdaptiveStudyPlanTask[] {
  try {
    assertSupportedExamMode(input.examMode);
    assertSafeOutput(input);
  } catch {
    return [];
  }
  const curriculumIndex = buildCurriculumIndex(input.curriculumNodes);
  const candidates = [
    ...candidatesFromExternal(input, "review_queue", input.existingReviewQueueCandidates),
    ...candidatesFromExternal(input, "capture", input.existingCaptureCandidates),
    ...candidatesFromLearningStates(input, curriculumIndex),
    ...candidatesFromCurriculum(input),
  ];
  const ranked = candidates
    .map((candidate, originalIndex): RankedSource => ({ ...candidate, planningScore: scoreCandidate(candidate), originalIndex }))
    .sort((left, right) => right.planningScore - left.planningScore || sourceRank(left.source) - sourceRank(right.source) || left.originalIndex - right.originalIndex)
    .map(({ originalIndex, ...candidate }) => {
      void originalIndex;
      return candidate;
    });
  assertSafeOutput(ranked);
  return ranked;
}

export function compressToDailyCapacity(input: { candidates: AdaptiveStudyPlanTask[]; dailyAvailableMinutes: number }): AdaptiveStudyPlanTask[] {
  const cap = minuteCap(input.dailyAvailableMinutes);
  const maxTotal = Math.max(10, input.dailyAvailableMinutes);
  const selected: AdaptiveStudyPlanTask[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const candidate of input.candidates) {
    const key = dedupeKey(candidate);
    if (seen.has(key)) continue;
    const estimatedMinutes = Math.min(candidate.estimatedMinutes, cap);
    if (selected.length > 0 && total + estimatedMinutes > maxTotal) continue;
    selected.push({ ...candidate, estimatedMinutes });
    seen.add(key);
    total += estimatedMinutes;
    if (selected.length === MAX_TODAY_PLAN_TASKS) break;
  }
  assertSafeOutput(selected);
  return selected;
}

export function buildRecoveryPlanForMissedReviews(input: AdaptiveStudyPlannerInput): AdaptiveRecoveryPlan {
  const missedDays = Math.max(0, Math.floor(input.missedDays ?? 0));
  const missedSignals = [...(input.personalLearningStates ?? []), ...(input.existingReviewQueueCandidates ?? [])].filter((item) => {
    const nextReviewAt = "nextReviewAt" in item ? item.nextReviewAt : (item as AdaptiveExternalCandidate).dueAt;
    return daysBetween(safeDate(input.currentDate), nextReviewAt as string | Date | null | undefined) < 0;
  }).length;
  const required = missedDays > 0 || missedSignals > 0;
  const minutes = Math.min(minuteCap(input.dailyAvailableMinutes), required ? 10 : 0);
  const items = required
    ? ["가장 오래 지난 복습 1개만 먼저 복구", "새 진도는 복구 뒤 남은 시간에만 선택", "상황이 다르면 오늘 항목은 바꿔도 됨"]
    : [];
  const plan = {
    metadataOnly: true as const,
    required,
    items,
    estimatedMinutes: minutes,
    planningReason: required ? "놓친 일정은 실패가 아니라 오늘 용량에 맞춰 다시 배치할 신호로 처리합니다." : "복구할 누락 복습 신호가 없습니다.",
  };
  assertSafeOutput(plan);
  return plan;
}

function riskSummaryFor(tasks: AdaptiveStudyPlanTask[], fallback: string) {
  if (tasks.some((task) => task.prioritySignals.includes("confident_wrong_concept"))) return "확신하고 틀린 개념을 먼저 재시도합니다.";
  if (tasks.some((task) => hasDueSignal(task.prioritySignals))) return "오늘은 예정 복습 신호가 새 진도보다 앞섭니다.";
  if (tasks.some((task) => task.prioritySignals.includes("high_risk_unit"))) return "중요도가 높은 위험 단원을 오늘 용량 안에서 다룹니다.";
  return fallback;
}

export function buildAdaptiveTodayPlan(input: AdaptiveStudyPlannerInput): AdaptiveTodayPlan {
  try {
    assertSupportedExamMode(input.examMode);
    assertSafeOutput(input);
  } catch (error) {
    return fallbackPlan(error instanceof Error ? error.message : "adaptive-planner-input-rejected");
  }
  const ranked = rankAdaptiveStudyCandidates(input);
  if (ranked.length === 0) return fallbackPlan("adaptive-planner-not-enough-metadata");
  const recoveryPlan = buildRecoveryPlanForMissedReviews(input);
  const recoveryBoosted = recoveryPlan.required
    ? ranked.map((candidate) => hasDueSignal(candidate.prioritySignals) ? { ...candidate, prioritySignals: unique([...candidate.prioritySignals, "recovery_candidate"]), planningScore: candidate.planningScore + 45 } : candidate)
    : ranked;
  const todayPlanTasks = compressToDailyCapacity({ candidates: recoveryBoosted, dailyAvailableMinutes: input.dailyAvailableMinutes });
  const weekly = buildAdaptiveWeeklyPlan({ ...input, missedDays: input.missedDays });
  const plan = {
    ...weekly,
    todayPlanTasks,
    recoveryPlan,
    riskSummary: riskSummaryFor(todayPlanTasks, weekly.riskSummary),
    planningReason: todayPlanTasks.length > 0 ? "개인 학습 상태, 복습 예정일, 커리큘럼 중요도, 오늘 가능 시간을 함께 반영했습니다." : weekly.planningReason,
  };
  assertSafeOutput(plan);
  recordLearningMetricIfEnabled(buildLearningMetricEvent({
    eventName: "adaptive_today_plan_generated",
    examMode: input.examMode,
    properties: { candidateCount: ranked.length, selectedCount: todayPlanTasks.length, estimatedMinutes: todayPlanTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) },
  }));
  return plan;
}

export function buildAdaptiveWeeklyPlan(input: AdaptiveStudyPlannerInput): AdaptiveWeeklyPlan {
  try {
    assertSupportedExamMode(input.examMode);
    assertSafeOutput(input);
  } catch (error) {
    return fallbackPlan(error instanceof Error ? error.message : "adaptive-weekly-input-rejected");
  }
  const ranked = rankAdaptiveStudyCandidates(input);
  const recoveryPlan = buildRecoveryPlanForMissedReviews(input);
  const focusTasks = ranked.slice(0, 6);
  const weeklyFocus = unique(focusTasks.map((task) => {
    if (task.prioritySignals.includes("ocr_confirmation_pending")) return "확인 필요한 캡처 정리";
    if (hasDueSignal(task.prioritySignals)) return `${task.unitName ?? task.subjectName ?? "핵심 개념"} 예정 복습`;
    if (task.prioritySignals.includes("high_risk_unit")) return `${task.unitName ?? task.subjectName ?? "위험 단원"} 재시도`;
    return `${task.unitName ?? task.subjectName ?? "핵심 개념"} 실행 연습`;
  })).slice(0, 3);
  const targetConcepts = unique(focusTasks.map((task) => task.unitName ?? task.conceptNodeId ?? task.unitId ?? task.subjectName)).slice(0, 6);
  const recoveryItems = recoveryPlan.items.slice(0, 3);
  const estimatedTotalMinutes = Math.min(Math.max(0, input.dailyAvailableMinutes) * 7, focusTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) + recoveryPlan.estimatedMinutes * 3);
  const plan = {
    metadataOnly: true as const,
    weeklyFocus,
    targetConcepts,
    recoveryItems,
    estimatedTotalMinutes,
    recoveryPlan,
    riskSummary: riskSummaryFor(focusTasks, ranked.length > 0 ? "이번 주는 위험 신호가 큰 개념부터 실행 단위로 묶습니다." : "주간 계획을 만들 학습 상태 메타데이터가 아직 부족합니다."),
    planningReason: ranked.length > 0 ? "주간 계획은 알림 없이 메타데이터 미리보기로만 제공합니다." : "먼저 실행 기록 1개를 남기면 주간 초점을 고정할 수 있습니다.",
    ...(ranked.length === 0 ? { safeFallbackReason: "adaptive-weekly-not-enough-metadata" } : {}),
  };
  assertSafeOutput(plan);
  return plan;
}
