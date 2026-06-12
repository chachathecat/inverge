import {
  CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  normalizeCaptureNoteTaskType,
  type CaptureNoteAllowedTaskType,
  type CaptureNoteQualityExamMode,
} from "./capture-note-quality";

export const TODAY_PLAN_SOURCE_TYPES = [
  "capture_note",
  "review_queue",
  "notes",
  "local_beta_signal",
  "synthetic_fixture",
] as const;

export const TODAY_PLAN_REASON_CODES = [
  "due_review",
  "recent_capture_gap",
  "recent_wrong",
  "confidence_gap",
  "weak_structure",
  "exam_risk",
  "missed_recently",
  "review_queue_due",
] as const;

export type TodayPlanSourceType = (typeof TODAY_PLAN_SOURCE_TYPES)[number];
export type TodayPlanReasonCode = (typeof TODAY_PLAN_REASON_CODES)[number];

export type TodayPlanSourceCandidate = {
  sourceId: string;
  sourceType: string;
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  biggestGap?: string;
  nextAction?: string;
  nextActionTaskType?: string;
  dueAt?: string;
  isDue?: boolean;
  confidence?: "low" | "medium" | "high" | string;
  recentWrong?: boolean;
  weakStructurePoint?: string;
  createdAt?: string;
  estimatedMinutes?: number;
  daysUntilExam?: number;
  missedRecently?: boolean;
  metadataOnly?: boolean;
  learnerOwned?: boolean;
};

export type TodayPlanSourceReasoning = {
  taskId: string;
  sourceType: TodayPlanSourceType;
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  reasonCode: TodayPlanReasonCode;
  priorityScore: number;
  oneLineReason: string;
  actionText: string;
  estimatedMinutes: number;
  sourceTrace: {
    sourceId: string;
    sourceType: TodayPlanSourceType;
    biggestGap?: string;
    nextActionTaskType: CaptureNoteAllowedTaskType;
    metadataOnly: true;
    safeUse: "closed_beta_today_plan_source_reasoning";
  };
  metadataOnly: true;
  learnerOwned: true;
  nextActionTaskType: CaptureNoteAllowedTaskType;
};

const MAX_TODAY_PLAN_TASKS = 3;

const FIRST_EXAM_ALLOWED_TASK_TYPES = new Set<CaptureNoteAllowedTaskType>(["ox", "cloze", "calculation_template", "review_note"]);
const SECOND_EXAM_ALLOWED_TASK_TYPES = new Set<CaptureNoteAllowedTaskType>([
  "calculation_template",
  "rewrite",
  "issue_recall",
  "review_note",
]);

const SOURCE_RANK: Record<TodayPlanSourceType, number> = {
  review_queue: 0,
  capture_note: 1,
  local_beta_signal: 2,
  notes: 3,
  synthetic_fixture: 4,
};

const REASON_BASE_SCORE: Record<TodayPlanReasonCode, number> = {
  due_review: 125,
  review_queue_due: 118,
  missed_recently: 104,
  recent_capture_gap: 92,
  recent_wrong: 86,
  weak_structure: 82,
  exam_risk: 76,
  confidence_gap: 70,
};

const FORBIDDEN_FIELD_NAMES = new Set([
  "score",
  "passFail",
  "officialGrade",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "instructorComment",
  "localFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
  "qnetRawText",
  "ocrFullText",
  "rawProblemText",
  "rawAnswerText",
  "rawOcrText",
  "sourceText",
  "archiveUrl",
  "qnetManifest",
]);

const FORBIDDEN_FIELD_PATTERN =
  /(official.*answer|official.*grade|model.*answer|pass.*fail|instructor|local.*file|source.*file|raw.*file|qnet.*raw|ocr.*full|raw.*problem|raw.*answer|raw.*ocr|source.*text|archive)/i;

const FORBIDDEN_TEXT_PATTERNS = [
  /official\s+(grading|grade|answer|model answer|score)/i,
  /model\s+answer/i,
  /score\s+prediction/i,
  /pass\s*\/?\s*fail/i,
  /public\s+archive/i,
  /problem\s+bank/i,
  /instructor\s+comment/i,
  /local_official_materials/i,
  /qnet_manifest\.json/i,
  /\bq-net\s+raw\b/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i,
  /공식\s*(채점|점수|모범답안|답안|해설|문제)/,
  /합격\s*판정|불합격\s*판정|점수\s*예측/,
  /강사용\s*콘솔|강사\s*코멘트/,
  /공개\s*아카이브|문제\s*은행/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function assertNoForbiddenFields(value: unknown, path = "todayPlanSource"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Today Plan source reasoning forbids field: ${path}.${key}`);
    }
    assertNoForbiddenFields(nestedValue, `${path}.${key}`);
  }
}

function assertSafeText(label: string, value: string): void {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(value)) throw new Error(`Today Plan source reasoning forbids unsafe ${label}`);
  }
}

function assertSingleLine(label: string, value: unknown): string {
  const normalized = clean(value);
  if (!normalized) throw new Error(`Today Plan source reasoning requires ${label}`);
  if (/[\r\n]/.test(String(value))) throw new Error(`Today Plan source reasoning requires single-line ${label}`);
  assertSafeText(label, normalized);
  return normalized;
}

function normalizeSourceType(value: string): TodayPlanSourceType | null {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  return TODAY_PLAN_SOURCE_TYPES.includes(normalized as TodayPlanSourceType) ? (normalized as TodayPlanSourceType) : null;
}

function assertModeTaskCompatibility(examMode: CaptureNoteQualityExamMode, taskType: CaptureNoteAllowedTaskType): void {
  const allowed = examMode === "first" ? FIRST_EXAM_ALLOWED_TASK_TYPES : SECOND_EXAM_ALLOWED_TASK_TYPES;
  if (!allowed.has(taskType)) {
    throw new Error(`Today Plan source reasoning rejects ${taskType} for ${examMode} exam mode`);
  }
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDueNow(candidate: TodayPlanSourceCandidate, now: Date): boolean {
  if (candidate.isDue === true) return true;
  const dueAt = parseTime(candidate.dueAt);
  return dueAt !== null && dueAt <= now.getTime();
}

function isRecent(candidate: TodayPlanSourceCandidate, now: Date): boolean {
  const createdAt = parseTime(candidate.createdAt);
  if (createdAt === null) return false;
  return createdAt <= now.getTime() && now.getTime() - createdAt <= 2 * 86_400_000;
}

function resolveReasonCode(candidate: TodayPlanSourceCandidate, sourceType: TodayPlanSourceType, now: Date): TodayPlanReasonCode {
  if (sourceType === "review_queue" && isDueNow(candidate, now)) return "review_queue_due";
  if (isDueNow(candidate, now)) return "due_review";
  if (candidate.missedRecently) return "missed_recently";
  if (candidate.recentWrong) return "recent_wrong";
  if (candidate.weakStructurePoint || /구조|목차|문단|포섭|요건|계산 과정|단위/.test(`${candidate.biggestGap ?? ""} ${candidate.nextAction ?? ""}`)) {
    return "weak_structure";
  }
  if (typeof candidate.daysUntilExam === "number" && candidate.daysUntilExam >= 0 && candidate.daysUntilExam <= 21) {
    return "exam_risk";
  }
  if (/low|낮음|불안/.test(String(candidate.confidence ?? ""))) return "confidence_gap";
  if ((sourceType === "capture_note" || sourceType === "local_beta_signal") && (candidate.biggestGap || isRecent(candidate, now))) {
    return "recent_capture_gap";
  }
  return "confidence_gap";
}

function oneLineReasonFor(reasonCode: TodayPlanReasonCode, candidate: TodayPlanSourceCandidate, sourceType: TodayPlanSourceType): string {
  if (reasonCode === "review_queue_due" || reasonCode === "due_review") {
    return "복습 기한이 가까운 기록이라 오늘 먼저 확인합니다.";
  }
  if (reasonCode === "recent_capture_gap") {
    return "최근 캡처에서 가장 큰 약점으로 남은 부분입니다.";
  }
  if (reasonCode === "recent_wrong") {
    return "최근 틀린 신호가 있어 바로 다시 확인할 항목입니다.";
  }
  if (reasonCode === "confidence_gap") {
    return "정답 신호보다 확신이 낮아 먼저 고정할 항목입니다.";
  }
  if (reasonCode === "weak_structure") {
    return candidate.examMode === "second"
      ? "2차 답안 구조에서 반복적으로 약한 부분입니다."
      : "풀이 근거 연결이 약해 한 번 더 확인할 항목입니다.";
  }
  if (reasonCode === "exam_risk") {
    return "시험이 가까워 지금 줄이면 좋은 약점입니다.";
  }
  if (reasonCode === "missed_recently") {
    return "최근 놓친 복습이라 작은 단위로 먼저 복구합니다.";
  }
  return sourceType === "notes" ? "저장한 노트에서 이어갈 항목입니다." : "오늘 이어갈 학습 신호입니다.";
}

function priorityScoreFor(reasonCode: TodayPlanReasonCode, candidate: TodayPlanSourceCandidate, sourceType: TodayPlanSourceType, now: Date): number {
  let score = REASON_BASE_SCORE[reasonCode];
  if (isRecent(candidate, now)) score += 8;
  if (candidate.examMode === "second" && candidate.weakStructurePoint) score += 6;
  if (sourceType === "review_queue") score += 4;
  if (sourceType === "capture_note" || sourceType === "local_beta_signal") score += 2;
  const dueAt = parseTime(candidate.dueAt);
  if (dueAt !== null && dueAt <= now.getTime()) score += 10;
  if (typeof candidate.daysUntilExam === "number" && candidate.daysUntilExam >= 0 && candidate.daysUntilExam <= 7) score += 6;
  return score;
}

function estimatedMinutesFor(candidate: TodayPlanSourceCandidate, taskType: CaptureNoteAllowedTaskType): number {
  if (typeof candidate.estimatedMinutes === "number" && Number.isFinite(candidate.estimatedMinutes)) {
    return Math.max(3, Math.min(Math.round(candidate.estimatedMinutes), 30));
  }
  if (taskType === "rewrite") return 18;
  if (taskType === "calculation_template") return 12;
  if (taskType === "issue_recall") return 10;
  if (taskType === "cloze") return 7;
  return 8;
}

export function buildTodayPlanSourceReasoning(candidate: TodayPlanSourceCandidate, now = new Date()): TodayPlanSourceReasoning {
  assertNoForbiddenFields(candidate);
  if (candidate.examMode !== "first" && candidate.examMode !== "second") {
    throw new Error(`Today Plan source reasoning rejects examMode: ${String(candidate.examMode)}`);
  }

  const sourceId = assertSingleLine("sourceId", candidate.sourceId);
  const sourceType = normalizeSourceType(candidate.sourceType);
  if (!sourceType) throw new Error(`Today Plan source reasoning rejects sourceType: ${String(candidate.sourceType)}`);

  const subject = assertSingleLine("subject", candidate.subject);
  const biggestGap = clean(candidate.biggestGap);
  const nextAction = assertSingleLine("nextAction", candidate.nextAction);
  if (biggestGap) assertSafeText("biggestGap", biggestGap);

  const nextActionTaskType = normalizeCaptureNoteTaskType(candidate.nextActionTaskType ?? "");
  if (!nextActionTaskType || !CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(nextActionTaskType)) {
    throw new Error(`Today Plan source reasoning rejects task type: ${String(candidate.nextActionTaskType)}`);
  }
  assertModeTaskCompatibility(candidate.examMode, nextActionTaskType);

  const reasonCode = resolveReasonCode(candidate, sourceType, now);
  const oneLineReason = oneLineReasonFor(reasonCode, candidate, sourceType);
  assertSafeText("oneLineReason", oneLineReason);
  assertSafeText("actionText", nextAction);

  return {
    taskId: `today-plan-source:${sourceId}`,
    sourceType,
    examMode: candidate.examMode,
    subject,
    reasonCode,
    priorityScore: priorityScoreFor(reasonCode, candidate, sourceType, now),
    oneLineReason,
    actionText: nextAction,
    estimatedMinutes: estimatedMinutesFor(candidate, nextActionTaskType),
    sourceTrace: {
      sourceId,
      sourceType,
      ...(biggestGap ? { biggestGap } : {}),
      nextActionTaskType,
      metadataOnly: true,
      safeUse: "closed_beta_today_plan_source_reasoning",
    },
    metadataOnly: true,
    learnerOwned: true,
    nextActionTaskType,
  };
}

export function selectTodayPlanSourceReasonedTasks(candidates: TodayPlanSourceCandidate[], now = new Date()): TodayPlanSourceReasoning[] {
  assertNoForbiddenFields(candidates);
  const reasoned = candidates.flatMap((candidate, originalIndex) => {
    try {
      return [{ ...buildTodayPlanSourceReasoning(candidate, now), originalIndex }];
    } catch {
      return [];
    }
  });

  return reasoned
    .sort((left, right) => {
      const scoreDiff = right.priorityScore - left.priorityScore;
      if (scoreDiff !== 0) return scoreDiff;
      const sourceDiff = SOURCE_RANK[left.sourceType] - SOURCE_RANK[right.sourceType];
      if (sourceDiff !== 0) return sourceDiff;
      return left.originalIndex - right.originalIndex;
    })
    .slice(0, MAX_TODAY_PLAN_TASKS)
    .map((taskWithIndex) => {
      const { originalIndex, ...task } = taskWithIndex;
      void originalIndex;
      return task;
    });
}
