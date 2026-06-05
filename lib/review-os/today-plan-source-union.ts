import {
  assertNoForbiddenCopy,
  assertNoRawTextKeys,
  type ReviewQueueDueBucket,
  type ReviewQueueItem,
} from "./execution-review-queue";
import {
  buildTodayPlanFromConceptGraphNodes,
  type ConceptGraphTodayPlanAction,
} from "./concept-graph-today-plan-adapter";
import {
  type PersonalConceptNode,
  type PersonalConceptTodayContext,
} from "./personal-concept-graph";
import {
  type DailyStudySchedule,
  type StudyScheduleBlock,
  type WeeklyStudySchedule,
} from "./study-schedule-engine";
import {
  buildTodayPlanFromReviewQueue,
  type TodayPlanPrioritizationContext,
  type TodayPlanTask,
} from "./today-plan-prioritization";
import { normalizeCurriculumTaskType } from "./curriculum-engine";
import { buildTodayPlanDisplayCopy, type TodayPlanDisplayCopy } from "./today-plan-display-copy";
import { type AppraiserExamMode } from "./curriculum-reference";

export type TodayPlanUnifiedSource = "review_queue" | "personal_concept_graph" | "study_schedule";

export type TodayPlanUnifiedAction = {
  id: string;
  source: TodayPlanUnifiedSource;
  examMode: AppraiserExamMode;
  subjectId?: string;
  unitId?: string;
  taskType: string;
  title: string;
  rationale: string;
  primaryAction: string;
  estimatedMinutes: number;
  prioritySignals: string[];
  isPrimaryTask: true;
  metadataOnly: true;
  displayReason?: TodayPlanDisplayCopy["displayReason"];
  displaySourceLabel?: TodayPlanDisplayCopy["displaySourceLabel"];
  displayPrimaryCta?: TodayPlanDisplayCopy["displayPrimaryCta"];
};

export type TodayPlanSourceUnionContext = TodayPlanPrioritizationContext & PersonalConceptTodayContext;

export type BuildTodayPlanSourceUnionInput = {
  reviewQueueItems?: ReviewQueueItem[];
  conceptGraphNodes?: PersonalConceptNode[];
  conceptGraphActions?: ConceptGraphTodayPlanAction[];
  dailySchedule?: DailyStudySchedule;
  weeklySchedule?: WeeklyStudySchedule;
  context?: TodayPlanSourceUnionContext;
};

type RankedUnifiedAction = TodayPlanUnifiedAction & {
  priorityScore: number;
  sourceRank: number;
  originalIndex: number;
};

const MAX_PRIMARY_TASKS = 3;

const DUE_BUCKET_RANK: Record<ReviewQueueDueBucket, number> = {
  soon: 90,
  tomorrow: 68,
  three_days: 38,
  one_week: 18,
};

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
]);

const FORBIDDEN_RAW_FIELD_PATTERN = /(rawUserText|rawOcrText|rawAnswerText|answerText|problemText|questionText|copyrightedText|originalText|fullText|sourceText)/i;

const FORBIDDEN_UNION_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*점수\s*예측/,
  /공식\s*모범\s*답안/,
  /official\s+grading/i,
  /official\s+score\s+prediction/i,
  /official\s+score/i,
  /official\s+model\s+answer/i,
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
  /random\s*reward/i,
  /랜덤\s*보상/,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native\s*app/i,
  /네이티브\s*앱/,
  /instructor/i,
  /\/instructor/i,
  /학원용/,
  /강사/,
  /보험계리사/,
  /계리사/,
  /\bCPA\b/i,
  /세무사/,
  /TOEFL/i,
  /\bSAT\b/i,
  /universal\s+exam/i,
  /multi-exam/i,
];

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Today Plan source union supports only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function assertNoForbiddenRawFields(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw/copyrighted text field is not accepted by Today Plan source union: ${path}.${key}`);
    }
    assertNoForbiddenRawFields(nested, `${path}.${key}`);
  }
}

function assertNoForbiddenUnionCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_UNION_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden learner copy is not accepted by Today Plan source union: ${String(forbidden)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenUnionCopy);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertNoForbiddenUnionCopy);
}

function validateBoundary(value: unknown) {
  assertNoForbiddenRawFields(value);
  assertNoRawTextKeys(value);
  assertNoForbiddenCopy(value);
  assertNoForbiddenUnionCopy(value);
}

function normalizeTaskType(taskType: string | undefined) {
  const normalized = normalizeCurriculumTaskType(taskType ?? "") ?? taskType?.trim();
  return normalized && normalized.length > 0 ? normalized : "review";
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function fromReviewTask(task: TodayPlanTask): TodayPlanUnifiedAction {
  return {
    id: `union:${task.id}`,
    source: "review_queue",
    examMode: task.examMode,
    subjectId: task.subjectId,
    unitId: task.unitId,
    taskType: normalizeTaskType(task.taskType),
    title: task.title,
    rationale: task.rationale,
    primaryAction: task.primaryAction,
    estimatedMinutes: task.estimatedMinutes,
    prioritySignals: unique([`review_queue_due_bucket:${task.dueBucket}`, ...task.prioritySignals]),
    isPrimaryTask: true,
    metadataOnly: true,
  };
}

function fromConceptAction(action: ConceptGraphTodayPlanAction): TodayPlanUnifiedAction {
  return {
    id: `union:${action.id}`,
    source: "personal_concept_graph",
    examMode: action.examMode,
    subjectId: action.subjectId,
    unitId: action.unitId,
    taskType: normalizeTaskType(action.taskType),
    title: action.title,
    rationale: action.rationale,
    primaryAction: action.primaryAction,
    estimatedMinutes: action.estimatedMinutes,
    prioritySignals: unique(action.prioritySignals),
    isPrimaryTask: true,
    metadataOnly: true,
  };
}

function taskTypeFromScheduleBlock(block: StudyScheduleBlock) {
  if (block.kind === "due_review") return "review";
  if (/다시쓰기|rewrite/i.test(`${block.label} ${block.action}`)) return "rewrite";
  if (/계산|CASIO/i.test(`${block.label} ${block.action}`)) return "CASIO";
  if (/빈칸|회상|retrieval/i.test(`${block.label} ${block.action}`)) return "retrieval";
  return block.kind === "decision" ? "scheduled review" : "execution";
}

function scheduleSignals(block: StudyScheduleBlock, schedule: DailyStudySchedule | WeeklyStudySchedule) {
  const signals = ["schedule_track_focus"];
  if (block.kind === "due_review") signals.push("due_review");
  if (block.priority === "primary") signals.push("schedule_primary_block");
  if (schedule.daysUntilExam >= 0 && schedule.daysUntilExam <= 21) signals.push("exam_proximity");
  if (schedule.weeklyFocus.length > 0) signals.push("weekly_focus_metadata");
  return signals;
}

function scheduleRationale(block: StudyScheduleBlock, schedule: DailyStudySchedule | WeeklyStudySchedule) {
  if (block.kind === "due_review") return "일정상 먼저 떠올릴 복습 블록이 있어 짧게 확인합니다.";
  if (block.priority === "primary") return "오늘 일정의 주 실행 블록과 맞는 항목만 작게 고정합니다.";
  const focus = schedule.weeklyFocus[0];
  return focus ? "이번 주 초점과 맞는 보조 메타데이터입니다." : "일정 메타데이터를 보조 신호로만 반영합니다.";
}

function fromSchedule(schedule: DailyStudySchedule | WeeklyStudySchedule | undefined): TodayPlanUnifiedAction[] {
  if (!schedule) return [];
  assertSupportedExamMode(schedule.examMode);
  const actionableBlocks = schedule.dailyBlocks.filter((block) => block.priority === "required" || block.priority === "primary").slice(0, 3);
  return actionableBlocks.map((block) => ({
    id: `union:schedule:${schedule.examMode}:${schedule.selectedTrackId}:${block.id}`,
    source: "study_schedule" as const,
    examMode: schedule.examMode,
    taskType: taskTypeFromScheduleBlock(block),
    title: block.label,
    rationale: scheduleRationale(block, schedule),
    primaryAction: block.action,
    estimatedMinutes: Math.min(block.suggestedMinutes, 30),
    prioritySignals: scheduleSignals(block, schedule),
    isPrimaryTask: true as const,
    metadataOnly: true as const,
  }));
}

function signalScore(action: TodayPlanUnifiedAction) {
  let score = 0;
  if (action.prioritySignals.includes("due_review")) score += 120;
  if (action.prioritySignals.some((signal) => signal.startsWith("review_queue_due_bucket:"))) {
    const dueBucket = action.prioritySignals.find((signal) => signal.startsWith("review_queue_due_bucket:"))?.split(":")[1] as ReviewQueueDueBucket | undefined;
    if (dueBucket) score += DUE_BUCKET_RANK[dueBucket] ?? 0;
  }
  if (action.prioritySignals.includes("wrong_concept")) score += 95;
  if (action.prioritySignals.includes("confused_concept")) score += 82;
  if (action.prioritySignals.includes("recovery_needed") || action.prioritySignals.includes("recovery_candidate")) score += 62;
  if (action.prioritySignals.includes("high_risk_unit") || action.prioritySignals.includes("fail_risk_subject")) score += 54;
  if (action.prioritySignals.includes("high_importance_unit")) score += 40;
  if (action.prioritySignals.includes("exam_proximity")) score += 30;
  if (action.prioritySignals.includes("recent_missed_tasks") || action.prioritySignals.includes("confidence:needs_check")) score += 24;
  if (action.prioritySignals.includes("schedule_track_focus")) score += 10;
  if (action.prioritySignals.includes("schedule_primary_block")) score += 8;
  return score;
}

function sourceRank(source: TodayPlanUnifiedSource) {
  if (source === "review_queue") return 0;
  if (source === "personal_concept_graph") return 1;
  return 2;
}

function dedupeKey(action: TodayPlanUnifiedAction) {
  return [action.examMode, action.subjectId ?? "subject", action.unitId ?? "unit", normalizeTaskType(action.taskType)].join("|");
}

function unitKey(action: TodayPlanUnifiedAction) {
  return [action.examMode, action.subjectId ?? "subject", action.unitId ?? "unit"].join("|");
}

function rankUnifiedActions(actions: TodayPlanUnifiedAction[]) {
  return actions
    .map((action, originalIndex): RankedUnifiedAction => ({
      ...action,
      priorityScore: signalScore(action),
      sourceRank: sourceRank(action.source),
      originalIndex,
    }))
    .sort((left, right) => {
      const scoreDiff = right.priorityScore - left.priorityScore;
      if (scoreDiff !== 0) return scoreDiff;
      const sourceDiff = left.sourceRank - right.sourceRank;
      if (sourceDiff !== 0) return sourceDiff;
      return left.id.localeCompare(right.id);
    });
}

function stripRank(action: RankedUnifiedAction): TodayPlanUnifiedAction {
  const { priorityScore, sourceRank: _sourceRank, originalIndex: _originalIndex, ...unified } = action;
  void priorityScore;
  void _sourceRank;
  void _originalIndex;
  return {
    ...unified,
    ...buildTodayPlanDisplayCopy({
      source: unified.source,
      prioritySignals: unified.prioritySignals,
      taskType: unified.taskType,
      primaryAction: unified.primaryAction,
    }),
  };
}

export function compressUnifiedTodayPlanToMaxThree(actions: TodayPlanUnifiedAction[]): TodayPlanUnifiedAction[] {
  actions.forEach((action) => assertSupportedExamMode(action.examMode));
  validateBoundary(actions);
  const ranked = rankUnifiedActions(actions);
  const seenDuplicates = new Set<string>();
  const selected: RankedUnifiedAction[] = [];
  const deferredSameUnit: RankedUnifiedAction[] = [];
  const selectedUnits = new Set<string>();

  for (const action of ranked) {
    const duplicateKey = dedupeKey(action);
    if (seenDuplicates.has(duplicateKey)) continue;
    seenDuplicates.add(duplicateKey);

    const unit = unitKey(action);
    if (selectedUnits.has(unit) && ranked.some((candidate) => !selectedUnits.has(unitKey(candidate)) && !seenDuplicates.has(dedupeKey(candidate)))) {
      deferredSameUnit.push(action);
      continue;
    }

    selected.push(action);
    selectedUnits.add(unit);
    if (selected.length === MAX_PRIMARY_TASKS) break;
  }

  for (const action of deferredSameUnit) {
    if (selected.length === MAX_PRIMARY_TASKS) break;
    selected.push(action);
  }

  const output = selected.slice(0, MAX_PRIMARY_TASKS).map(stripRank);
  validateBoundary(output);
  return output;
}

export function buildTodayPlanSourceUnion(input: BuildTodayPlanSourceUnionInput): TodayPlanUnifiedAction[] {
  validateBoundary(input);
  const context = input.context ?? {};
  const reviewTasks = input.reviewQueueItems
    ? buildTodayPlanFromReviewQueue({ reviewQueueItems: input.reviewQueueItems, context }).map(fromReviewTask)
    : [];
  const graphActions = input.conceptGraphActions
    ? input.conceptGraphActions.map(fromConceptAction)
    : input.conceptGraphNodes
      ? buildTodayPlanFromConceptGraphNodes(input.conceptGraphNodes, context).map(fromConceptAction)
      : [];
  const scheduleActions = [...fromSchedule(input.dailySchedule), ...fromSchedule(input.weeklySchedule)];

  const actions = [...reviewTasks, ...graphActions, ...scheduleActions].filter(
    (action) => context.examMode === undefined || context.examMode === "mixed" || action.examMode === context.examMode,
  );
  actions.forEach((action) => assertSupportedExamMode(action.examMode));
  return compressUnifiedTodayPlanToMaxThree(actions);
}
