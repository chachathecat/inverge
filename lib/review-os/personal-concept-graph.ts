import { type AppraiserExamMode } from "./curriculum-reference";
import { type ExecutionLearningSignal } from "./execution-learning-signal";
import { normalizeCurriculumTaskType } from "./curriculum-engine";

export type PersonalConceptState = "unknown" | "confused" | "wrong" | "recovering" | "stable";
export type PersonalConceptGraphResult =
  | "done"
  | "correct"
  | "completed"
  | "wrong"
  | "unknown"
  | "needs_rewrite"
  | "skipped"
  | "missed_due";
export type PersonalConceptGraphConfidence = "unknown" | "low" | "medium" | "high";
export type PersonalConceptDueBucket = "due" | "overdue" | "missed" | "soon" | "tomorrow" | "three_days" | "one_week" | "none";

export type PersonalConceptSignalInput = {
  learnerId?: string;
  userId?: string;
  examMode: AppraiserExamMode;
  subjectId: string;
  unitId: string;
  taskType: string;
  result: PersonalConceptGraphResult;
  confidence?: PersonalConceptGraphConfidence;
  dueBucket?: PersonalConceptDueBucket;
  recentMissCount?: number;
  updatedAt: string;
};

export type PersonalConceptNode = {
  id: string;
  userId: string;
  examMode: AppraiserExamMode;
  subjectId: string;
  unitId: string;
  state: PersonalConceptState;
  confidence: PersonalConceptGraphConfidence;
  lastResult: PersonalConceptGraphResult;
  lastTaskType: string;
  wrongCount: number;
  recoveryCount: number;
  stableCount: number;
  nextRecommendedTaskType: string;
  nextDueAt?: string;
  updatedAt: string;
  metadataOnly: true;
};

export type ConceptGraphExecutionSignalLike = ExecutionLearningSignal & {
  learnerId?: string;
  userId?: string;
  dueBucket?: PersonalConceptDueBucket;
  recentMissCount?: number;
  updatedAt?: string;
};

export type PersonalConceptTodayContext = {
  now?: string;
  examMode?: AppraiserExamMode | "mixed";
  daysUntilExam?: number;
  highRiskUnitIds?: string[];
  highImportanceUnitIds?: string[];
  recentMissCountByUnitId?: Record<string, number>;
};

export type PersonalConceptTodayRecommendation = {
  id: string;
  nodeId: string;
  userId: string;
  examMode: AppraiserExamMode;
  subjectId: string;
  unitId: string;
  state: PersonalConceptState;
  taskType: string;
  title: string;
  rationale: string;
  primaryAction: string;
  prioritySignals: string[];
  isPrimaryTask: true;
  metadataOnly: true;
};

const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer|problem|question|copyright|fulltext|sourceText|userText|originalText)/i;
const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "text",
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "officialGrading",
  "officialScorePrediction",
  "officialModelAnswer",
]);

const FORBIDDEN_CLAIM_COPY_PATTERNS = [/공식\s*채점/, /공식\s*점수\s*예측/, /공식\s*모범\s*답안/, /official\s+grading/i, /official\s+score/i, /official\s+model\s+answer/i];
const SHAME_COPY_PATTERNS = [/게으름/, /실패자/, /망했/, /불합격\s*확정/, /순위\s*하락/, /지금\s*안\s*하면\s*끝/];

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Personal Concept Graph supports only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function assertMetadataOnly(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertMetadataOnly(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by Personal Concept Graph: ${path}.${key}`);
    }
    assertMetadataOnly(nested, `${path}.${key}`);
  }
}

function assertSafeRecommendationCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbiddenClaim = FORBIDDEN_CLAIM_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbiddenClaim) throw new Error(`Official grading/score/model-answer claim is not accepted: ${String(forbiddenClaim)}`);
    const shame = SHAME_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (shame) throw new Error(`Shame copy is not accepted: ${String(shame)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertSafeRecommendationCopy);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertSafeRecommendationCopy);
}

function cleanRequiredText(value: string | undefined, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`Personal Concept Graph requires ${fieldName}`);
  return cleaned;
}

function normalizeTaskType(taskType: string) {
  return normalizeCurriculumTaskType(taskType) ?? taskType.trim();
}

function normalizeCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function isSuccessful(result: PersonalConceptGraphResult) {
  return result === "done" || result === "correct" || result === "completed";
}

function isWrongLike(signal: Pick<PersonalConceptSignalInput, "result" | "confidence">) {
  return signal.result === "wrong" || signal.result === "unknown" || signal.confidence === "low";
}

function isMissedDue(signal: Pick<PersonalConceptSignalInput, "result" | "dueBucket" | "recentMissCount">) {
  return signal.result === "missed_due" || signal.dueBucket === "missed" || signal.dueBucket === "overdue" || (signal.result === "skipped" && normalizeCount(signal.recentMissCount) > 0);
}

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid updatedAt for Personal Concept Graph: ${isoDate}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function buildNodeId(userId: string, examMode: AppraiserExamMode, subjectId: string, unitId: string) {
  return `personal-concept:${userId}:${examMode}:${subjectId}:${unitId}`;
}

function preferredTaskType(examMode: AppraiserExamMode, taskType: string, result: PersonalConceptGraphResult, state: PersonalConceptState) {
  const normalized = normalizeTaskType(taskType);
  if (examMode === "second") {
    if (normalized === "calculator_routine") return "calculator_routine";
    if (result === "needs_rewrite" || normalized === "rewrite") return "rewrite";
    if (normalized === "CASIO") return "CASIO";
    if (normalized === "issue spotting") return "issue spotting";
    return state === "stable" ? normalized || "scheduled review" : "rewrite";
  }

  if (normalized === "accounting template") return "accounting template";
  if (normalized === "cloze") return "cloze";
  if (normalized === "rewrite") return "cloze";
  return normalized || "O/X";
}

function dueDaysForState(state: PersonalConceptState) {
  if (state === "wrong" || state === "confused") return 1;
  if (state === "recovering") return 2;
  if (state === "stable") return 7;
  return 3;
}

function nextState(previous: PersonalConceptNode | null | undefined, signal: PersonalConceptSignalInput): PersonalConceptState {
  const previousState = previous?.state ?? "unknown";

  if (isMissedDue(signal)) return "recovering";

  if (signal.result === "needs_rewrite") {
    return previousState === "stable" || previousState === "recovering" ? "recovering" : "wrong";
  }

  if (isWrongLike(signal)) return signal.confidence === "low" || signal.result === "unknown" ? "confused" : "wrong";

  if (isSuccessful(signal.result)) {
    if (previousState === "wrong" || previousState === "confused" || previousState === "unknown") return "recovering";
    if (previousState === "recovering") return "stable";
    return "stable";
  }

  if (signal.result === "skipped") return "recovering";
  return previousState;
}

export function updatePersonalConceptNode(previousNode: PersonalConceptNode | null | undefined, signal: PersonalConceptSignalInput): PersonalConceptNode {
  assertMetadataOnly({ previousNode, signal });
  assertSupportedExamMode(signal.examMode);

  const userId = cleanRequiredText(signal.userId ?? signal.learnerId, "userId or learnerId");
  const subjectId = cleanRequiredText(signal.subjectId, "subjectId");
  const unitId = cleanRequiredText(signal.unitId, "unitId");
  const taskType = normalizeTaskType(cleanRequiredText(signal.taskType, "taskType"));
  const confidence = signal.confidence ?? "unknown";
  const state = nextState(previousNode, { ...signal, userId, subjectId, unitId, taskType, confidence });
  const success = isSuccessful(signal.result);
  const wrongLike = signal.result === "wrong" || signal.result === "unknown" || signal.result === "needs_rewrite";
  const recoveryLike = state === "recovering" || isMissedDue(signal);
  const stableLike = state === "stable" && success;

  return {
    id: previousNode?.id ?? buildNodeId(userId, signal.examMode, subjectId, unitId),
    userId,
    examMode: signal.examMode,
    subjectId,
    unitId,
    state,
    confidence,
    lastResult: signal.result,
    lastTaskType: taskType,
    wrongCount: (previousNode?.wrongCount ?? 0) + (wrongLike ? 1 : 0),
    recoveryCount: (previousNode?.recoveryCount ?? 0) + (recoveryLike ? 1 : 0),
    stableCount: (previousNode?.stableCount ?? 0) + (stableLike ? 1 : 0),
    nextRecommendedTaskType: preferredTaskType(signal.examMode, taskType, signal.result, state),
    nextDueAt: addDays(signal.updatedAt, dueDaysForState(state)),
    updatedAt: signal.updatedAt,
    metadataOnly: true,
  };
}

export function buildConceptGraphUpdateFromExecutionSignal(signal: ConceptGraphExecutionSignalLike): PersonalConceptSignalInput {
  assertMetadataOnly(signal);
  assertSupportedExamMode(signal.examMode);

  return {
    learnerId: signal.learnerId,
    userId: signal.userId,
    examMode: signal.examMode,
    subjectId: cleanRequiredText(signal.subjectId, "subjectId"),
    unitId: cleanRequiredText(signal.unitId, "unitId"),
    taskType: signal.nextRecommendedTaskType ?? signal.taskType,
    result: signal.result,
    confidence: signal.confidence,
    dueBucket: signal.dueBucket ?? (signal.reviewDueHint === "none" ? "none" : signal.reviewDueHint),
    recentMissCount: signal.recentMissCount,
    updatedAt: signal.updatedAt ?? new Date().toISOString(),
  };
}

function isDue(node: PersonalConceptNode, now: Date) {
  if (!node.nextDueAt) return false;
  const dueAt = new Date(node.nextDueAt);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() <= now.getTime();
}

function prioritySignalsForNode(node: PersonalConceptNode, context: PersonalConceptTodayContext, now: Date) {
  const signals: string[] = [];
  if (node.nextRecommendedTaskType === "calculator_routine") signals.push("calculator_routine");
  if (isDue(node, now)) signals.push("due_review");
  if (node.state === "wrong") signals.push("wrong_concept");
  if (node.state === "confused") signals.push("confused_concept");
  if (node.state === "recovering") signals.push("recovery_needed");
  if (context.highRiskUnitIds?.includes(node.unitId)) signals.push("high_risk_unit");
  if (context.highImportanceUnitIds?.includes(node.unitId)) signals.push("high_importance_unit");
  if (typeof context.daysUntilExam === "number" && context.daysUntilExam >= 0 && context.daysUntilExam <= 21) signals.push("exam_proximity");
  if ((context.recentMissCountByUnitId?.[node.unitId] ?? 0) > 0) signals.push("recent_missed_tasks");
  return signals;
}

function scoreNode(node: PersonalConceptNode, signals: string[]) {
  let score = 0;
  if (signals.includes("due_review")) score += 100;
  if (node.state === "wrong") score += 80;
  if (node.state === "confused") score += 65;
  if (node.state === "recovering") score += 50;
  if (signals.includes("high_risk_unit")) score += 42;
  if (signals.includes("high_importance_unit")) score += 30;
  if (signals.includes("exam_proximity")) score += 24;
  if (signals.includes("recent_missed_tasks")) score += 18;
  score += Math.min(node.wrongCount * 3, 18);
  return score;
}

function recommendationCopy(node: PersonalConceptNode, signals: string[]) {
  const recoveryPrefix = signals.includes("recovery_needed") || signals.includes("recent_missed_tasks") ? "놓친 항목은 복구 신호로 보고, " : "";
  if (node.examMode === "second" && node.nextRecommendedTaskType === "calculator_routine") {
    const rationaleByState: Record<PersonalConceptState, string> = {
      unknown: "계산·검산 상태를 확인할 신호가 남아 있어 입력 순서와 단위를 다시 확인합니다.",
      wrong: "계산·검산 실수 신호가 남아 있어 입력 순서와 단위를 다시 확인합니다.",
      confused: "막힌 계산·검산 단계를 짧게 다시 수행합니다.",
      recovering: "회복 중인 계산·검산 루틴을 한 번 더 수행합니다.",
      stable: "안정화된 계산·검산 루틴을 예정 시점에 짧게 확인합니다.",
    };
    return {
      title: `${node.subjectId} · 검산/CASIO 계산·검산 복구`,
      rationale: rationaleByState[node.state],
      primaryAction: "계산·검산 다시 하기",
    };
  }
  if (node.examMode === "second" && node.nextRecommendedTaskType === "rewrite") {
    return {
      title: `${node.subjectId} · ${node.unitId} 답안 다시쓰기`,
      rationale: `${recoveryPrefix}가장 큰 논점 간극 1개만 짧게 다시 연결합니다.`,
      primaryAction: "한 문단을 다시 쓰고 보완 기준 1개 표시하기",
    };
  }
  if (node.nextRecommendedTaskType === "O/X") {
    return {
      title: `${node.subjectId} · ${node.unitId} O/X 재확인`,
      rationale: `${recoveryPrefix}헷갈린 판단 기준 1개를 먼저 분리합니다.`,
      primaryAction: "O/X 5문항을 풀고 틀린 기준 1개 표시하기",
    };
  }
  return {
    title: `${node.subjectId} · ${node.unitId} ${node.nextRecommendedTaskType} 재시도`,
    rationale: `${recoveryPrefix}설명 전에 먼저 떠올리고 바로 다시 실행합니다.`,
    primaryAction: `${node.nextRecommendedTaskType} 1개를 다시 시도하기`,
  };
}

export function rankConceptGraphNodesForToday(nodes: PersonalConceptNode[], context: PersonalConceptTodayContext = {}): PersonalConceptTodayRecommendation[] {
  assertMetadataOnly({ nodes, context });
  const now = new Date(context.now ?? new Date().toISOString());
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid Today Concept Graph context.now: ${String(context.now)}`);

  const ranked = nodes
    .filter((node) => context.examMode === undefined || context.examMode === "mixed" || node.examMode === context.examMode)
    .map((node) => {
      assertSupportedExamMode(node.examMode);
      const prioritySignals = prioritySignalsForNode(node, context, now);
      return { node, prioritySignals, score: scoreNode(node, prioritySignals) };
    })
    .sort((left, right) => right.score - left.score || left.node.id.localeCompare(right.node.id))
    .slice(0, 3)
    .map(({ node, prioritySignals }) => {
      const copy = recommendationCopy(node, prioritySignals);
      const recommendation: PersonalConceptTodayRecommendation = {
        id: `today-concept:${node.id}`,
        nodeId: node.id,
        userId: node.userId,
        examMode: node.examMode,
        subjectId: node.subjectId,
        unitId: node.unitId,
        state: node.state,
        taskType: node.nextRecommendedTaskType,
        ...copy,
        prioritySignals,
        isPrimaryTask: true,
        metadataOnly: true,
      };
      assertMetadataOnly(recommendation);
      assertSafeRecommendationCopy(recommendation);
      return recommendation;
    });

  assertSafeRecommendationCopy(ranked);
  return ranked;
}
