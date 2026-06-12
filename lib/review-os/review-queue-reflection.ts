import {
  CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  normalizeCaptureNoteTaskType,
  type CaptureNoteAllowedTaskType,
  type CaptureNoteQualityExamMode,
} from "./capture-note-quality";

export const REVIEW_QUEUE_REFLECTION_SOURCE_TYPES = [
  "capture_note",
  "today_plan_task",
  "review_queue",
  "notes",
  "local_beta_signal",
  "synthetic_fixture",
] as const;

export const REVIEW_QUEUE_REFLECTION_REASON_CODES = [
  "capture_gap_review",
  "due_review",
  "recent_wrong_review",
  "confidence_gap_review",
  "weak_structure_review",
  "calculation_template_review",
  "rewrite_review",
  "issue_recall_review",
  "local_fallback_review",
] as const;

export const REVIEW_QUEUE_REFLECTION_PERSISTENCE_STATUSES = [
  "durable_saved",
  "local_fallback_saved",
  "save_failed",
] as const;

export type ReviewQueueReflectionSourceType = (typeof REVIEW_QUEUE_REFLECTION_SOURCE_TYPES)[number];
export type ReviewQueueReflectionReasonCode = (typeof REVIEW_QUEUE_REFLECTION_REASON_CODES)[number];
export type ReviewQueueReflectionPersistenceStatus = (typeof REVIEW_QUEUE_REFLECTION_PERSISTENCE_STATUSES)[number];

export type ReviewQueueReflectionInput = {
  sourceId: string;
  sourceType: string;
  examMode: CaptureNoteQualityExamMode | string;
  subject: string;
  biggestGap?: string;
  nextAction?: string;
  nextActionTaskType?: string;
  reasonCode?: string;
  oneLineReason?: string;
  actionText?: string;
  estimatedMinutes?: number;
  createdAt?: string;
  dueAt?: string;
  persistenceStatus?: string;
  metadataOnly?: boolean;
  learnerOwned?: boolean;
};

export type ReviewQueueReflection = {
  reviewItemId: string;
  sourceId: string;
  sourceType: ReviewQueueReflectionSourceType;
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  reviewReasonCode: ReviewQueueReflectionReasonCode;
  reviewPrompt: string;
  actionText: string;
  dueAt: string;
  estimatedMinutes: number;
  persistenceStatus: ReviewQueueReflectionPersistenceStatus;
  sourceTrace: {
    sourceId: string;
    sourceType: ReviewQueueReflectionSourceType;
    biggestGap?: string;
    sourceReasonCode?: string;
    nextActionTaskType: CaptureNoteAllowedTaskType;
    persistenceStatus: ReviewQueueReflectionPersistenceStatus;
    metadataOnly: true;
    safeUse: "closed_beta_review_queue_reflection";
  };
  learnerOwned: true;
  metadataOnly: true;
  safeUse: "closed_beta_review_queue_reflection";
  nextActionTaskType: CaptureNoteAllowedTaskType;
};

const DAY_MS = 86_400_000;

const FIRST_EXAM_ALLOWED_TASK_TYPES = new Set<CaptureNoteAllowedTaskType>(["ox", "cloze", "calculation_template", "review_note"]);
const SECOND_EXAM_ALLOWED_TASK_TYPES = new Set<CaptureNoteAllowedTaskType>([
  "calculation_template",
  "rewrite",
  "issue_recall",
  "review_note",
]);

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

function assertNoForbiddenFields(value: unknown, path = "reviewQueueReflection"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Review Queue reflection contract forbids field: ${path}.${key}`);
    }
    assertNoForbiddenFields(nestedValue, `${path}.${key}`);
  }
}

function assertSafeText(label: string, value: string): void {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(value)) throw new Error(`Review Queue reflection contract forbids unsafe ${label}`);
  }
}

function assertSingleLine(label: string, value: unknown): string {
  const normalized = clean(value);
  if (!normalized) throw new Error(`Review Queue reflection contract requires ${label}`);
  if (/[\r\n]/.test(String(value))) throw new Error(`Review Queue reflection contract requires single-line ${label}`);
  assertSafeText(label, normalized);
  return normalized;
}

function normalizeSourceType(value: string): ReviewQueueReflectionSourceType | null {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  return REVIEW_QUEUE_REFLECTION_SOURCE_TYPES.includes(normalized as ReviewQueueReflectionSourceType)
    ? (normalized as ReviewQueueReflectionSourceType)
    : null;
}

function normalizePersistenceStatus(value: string | undefined): ReviewQueueReflectionPersistenceStatus {
  if (!value) return "durable_saved";
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (REVIEW_QUEUE_REFLECTION_PERSISTENCE_STATUSES.includes(normalized as ReviewQueueReflectionPersistenceStatus)) {
    return normalized as ReviewQueueReflectionPersistenceStatus;
  }
  throw new Error(`Review Queue reflection contract rejects persistenceStatus: ${String(value)}`);
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertModeTaskCompatibility(examMode: CaptureNoteQualityExamMode, taskType: CaptureNoteAllowedTaskType): void {
  const allowed = examMode === "first" ? FIRST_EXAM_ALLOWED_TASK_TYPES : SECOND_EXAM_ALLOWED_TASK_TYPES;
  if (!allowed.has(taskType)) {
    throw new Error(`Review Queue reflection contract rejects ${taskType} for ${examMode} exam mode`);
  }
}

function inferTaskType(input: ReviewQueueReflectionInput): CaptureNoteAllowedTaskType {
  const explicit = normalizeCaptureNoteTaskType(input.nextActionTaskType ?? "");
  if (explicit && CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(explicit)) return explicit;

  const haystack = `${clean(input.biggestGap)} ${clean(input.nextAction)} ${clean(input.actionText)} ${clean(input.reasonCode)}`.toLowerCase();
  if (/calculation|calculator|accounting|계산|산식|단위/.test(haystack)) return "calculation_template";
  if (/\box\b|o\/x|참거짓|선지/.test(haystack)) return "ox";
  if (/cloze|blank|빈칸/.test(haystack)) return "cloze";
  if (/issue|쟁점|목차|요건/.test(haystack)) return "issue_recall";
  if (/rewrite|paragraph|문단|다시\s*써|재작성/.test(haystack)) return "rewrite";
  return "review_note";
}

function isDueNow(input: ReviewQueueReflectionInput, now: Date): boolean {
  const dueAt = parseTime(input.dueAt);
  return dueAt !== null && dueAt <= now.getTime();
}

function hasWeakStructureSignal(input: ReviewQueueReflectionInput): boolean {
  const haystack = `${clean(input.biggestGap)} ${clean(input.nextAction)} ${clean(input.actionText)} ${clean(input.oneLineReason)} ${clean(input.reasonCode)}`;
  return /weak_structure|structure|outline|구조|목차|포섭|요건|근거\s*연결/.test(haystack);
}

function resolveReviewReasonCode(
  input: ReviewQueueReflectionInput,
  sourceType: ReviewQueueReflectionSourceType,
  taskType: CaptureNoteAllowedTaskType,
  persistenceStatus: ReviewQueueReflectionPersistenceStatus,
  now: Date,
): ReviewQueueReflectionReasonCode {
  const reasonCode = clean(input.reasonCode).toLowerCase().replace(/[\s-]+/g, "_");
  if (persistenceStatus === "local_fallback_saved") return "local_fallback_review";
  if (reasonCode === "due_review" || reasonCode === "review_queue_due" || (sourceType === "review_queue" && isDueNow(input, now))) {
    return "due_review";
  }
  if (reasonCode === "weak_structure" || hasWeakStructureSignal(input)) return "weak_structure_review";
  if (taskType === "calculation_template") return "calculation_template_review";
  if (taskType === "rewrite") return "rewrite_review";
  if (taskType === "issue_recall") return "issue_recall_review";
  if (reasonCode === "recent_wrong" || reasonCode === "missed_recently") return "recent_wrong_review";
  if (reasonCode === "confidence_gap" || reasonCode === "exam_risk") return "confidence_gap_review";
  return "capture_gap_review";
}

function reviewPromptFor(reasonCode: ReviewQueueReflectionReasonCode, persistenceStatus: ReviewQueueReflectionPersistenceStatus): string {
  if (persistenceStatus === "save_failed") {
    return "저장이 완료되지 않아 복습 큐에는 아직 넣지 않습니다. 다시 저장하면 이어갈 수 있습니다.";
  }

  if (reasonCode === "local_fallback_review") {
    return "closed beta 브라우저 임시 기록입니다. 같은 브라우저에서 복습 후보로 이어갑니다.";
  }
  if (reasonCode === "due_review") return "복습 시점이 된 기록입니다. 오늘 먼저 짧게 회수합니다.";
  if (reasonCode === "recent_wrong_review") return "최근 틀린 흐름을 다시 확인할 차례입니다.";
  if (reasonCode === "confidence_gap_review") return "확신이 낮았던 부분을 먼저 고정합니다.";
  if (reasonCode === "weak_structure_review") return "구조가 흔들린 지점을 다시 잡고 문단으로 이어갑니다.";
  if (reasonCode === "calculation_template_review") return "계산 조건, 산식, 단위 흐름을 다시 확인합니다.";
  if (reasonCode === "rewrite_review") return "답안 문단을 다시 써서 약점 하나를 줄입니다.";
  if (reasonCode === "issue_recall_review") return "쟁점 목차를 먼저 떠올리고 문단으로 이어갑니다.";
  return "최근 저장한 약점 기록을 다시 확인할 차례입니다.";
}

function fallbackActionFor(reasonCode: ReviewQueueReflectionReasonCode, persistenceStatus: ReviewQueueReflectionPersistenceStatus): string {
  if (persistenceStatus === "save_failed") return "다시 저장한 뒤 복습 후보로 이어가기";
  if (reasonCode === "calculation_template_review") return "계산 조건과 단위를 다시 확인하기";
  if (reasonCode === "rewrite_review") return "약점 문단 1개 다시 쓰기";
  if (reasonCode === "issue_recall_review") return "쟁점 목차를 떠올리고 한 문단으로 이어가기";
  if (reasonCode === "weak_structure_review") return "목차와 근거 연결을 한 번 더 정리하기";
  if (reasonCode === "due_review") return "저장한 메모를 보고 핵심 근거를 다시 말하기";
  return "저장한 약점 하나를 다시 확인하기";
}

function resolveActionText(
  input: ReviewQueueReflectionInput,
  reasonCode: ReviewQueueReflectionReasonCode,
  persistenceStatus: ReviewQueueReflectionPersistenceStatus,
): string {
  const actionText = clean(input.actionText) || clean(input.nextAction) || fallbackActionFor(reasonCode, persistenceStatus);
  return assertSingleLine("actionText", actionText);
}

function defaultDueDays(reasonCode: ReviewQueueReflectionReasonCode): number {
  if (reasonCode === "due_review") return 0;
  if (reasonCode === "rewrite_review" || reasonCode === "issue_recall_review" || reasonCode === "weak_structure_review") return 3;
  return 1;
}

function resolveDueAt(input: ReviewQueueReflectionInput, reasonCode: ReviewQueueReflectionReasonCode, now: Date): string {
  const providedDueAt = parseTime(input.dueAt);
  if (providedDueAt !== null) return new Date(providedDueAt).toISOString();
  return new Date(now.getTime() + defaultDueDays(reasonCode) * DAY_MS).toISOString();
}

function estimatedMinutesFor(input: ReviewQueueReflectionInput, taskType: CaptureNoteAllowedTaskType): number {
  if (typeof input.estimatedMinutes === "number" && Number.isFinite(input.estimatedMinutes)) {
    return Math.max(3, Math.min(Math.round(input.estimatedMinutes), 30));
  }
  if (taskType === "rewrite") return 18;
  if (taskType === "calculation_template") return 12;
  if (taskType === "issue_recall") return 10;
  if (taskType === "cloze") return 7;
  return 8;
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function buildReviewItemId(input: {
  sourceId: string;
  sourceType: ReviewQueueReflectionSourceType;
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  reviewReasonCode: ReviewQueueReflectionReasonCode;
  nextActionTaskType: CaptureNoteAllowedTaskType;
  persistenceStatus: ReviewQueueReflectionPersistenceStatus;
}): string {
  return `review-queue-reflection:${stableHash(
    [
      input.sourceId,
      input.sourceType,
      input.examMode,
      input.subject,
      input.reviewReasonCode,
      input.nextActionTaskType,
      input.persistenceStatus,
    ].join("|"),
  )}`;
}

export function buildReviewQueueReflection(input: ReviewQueueReflectionInput, now = new Date()): ReviewQueueReflection {
  assertNoForbiddenFields(input);
  if (input.examMode !== "first" && input.examMode !== "second") {
    throw new Error(`Review Queue reflection contract rejects examMode: ${String(input.examMode)}`);
  }

  const sourceId = assertSingleLine("sourceId", input.sourceId);
  const sourceType = normalizeSourceType(input.sourceType);
  if (!sourceType) throw new Error(`Review Queue reflection contract rejects sourceType: ${String(input.sourceType)}`);

  const subject = assertSingleLine("subject", input.subject);
  const biggestGap = clean(input.biggestGap);
  if (biggestGap) assertSafeText("biggestGap", biggestGap);
  const sourceReasonCode = clean(input.reasonCode);
  if (sourceReasonCode) assertSafeText("sourceReasonCode", sourceReasonCode);
  const oneLineReason = clean(input.oneLineReason);
  if (oneLineReason) assertSafeText("oneLineReason", oneLineReason);

  const persistenceStatus = normalizePersistenceStatus(input.persistenceStatus);
  const nextActionTaskType = inferTaskType(input);
  assertModeTaskCompatibility(input.examMode, nextActionTaskType);

  const reviewReasonCode = resolveReviewReasonCode(input, sourceType, nextActionTaskType, persistenceStatus, now);
  const reviewPrompt = reviewPromptFor(reviewReasonCode, persistenceStatus);
  assertSafeText("reviewPrompt", reviewPrompt);
  const actionText = resolveActionText(input, reviewReasonCode, persistenceStatus);
  const dueAt = resolveDueAt(input, reviewReasonCode, now);

  const reflection: ReviewQueueReflection = {
    reviewItemId: buildReviewItemId({
      sourceId,
      sourceType,
      examMode: input.examMode,
      subject,
      reviewReasonCode,
      nextActionTaskType,
      persistenceStatus,
    }),
    sourceId,
    sourceType,
    examMode: input.examMode,
    subject,
    reviewReasonCode,
    reviewPrompt,
    actionText,
    dueAt,
    estimatedMinutes: estimatedMinutesFor(input, nextActionTaskType),
    persistenceStatus,
    sourceTrace: {
      sourceId,
      sourceType,
      ...(biggestGap ? { biggestGap } : {}),
      ...(sourceReasonCode ? { sourceReasonCode } : {}),
      nextActionTaskType,
      persistenceStatus,
      metadataOnly: true,
      safeUse: "closed_beta_review_queue_reflection",
    },
    learnerOwned: true,
    metadataOnly: true,
    safeUse: "closed_beta_review_queue_reflection",
    nextActionTaskType,
  };

  assertNoForbiddenFields(reflection);
  return reflection;
}

export function selectReadyReviewQueueReflections(inputs: ReviewQueueReflectionInput[], now = new Date()): ReviewQueueReflection[] {
  assertNoForbiddenFields(inputs);
  const reflections = inputs.flatMap((input) => {
    try {
      const reflection = buildReviewQueueReflection(input, now);
      return reflection.persistenceStatus === "save_failed" ? [] : [reflection];
    } catch {
      return [];
    }
  });

  return reflections.sort((left, right) => {
    const dueDiff = Date.parse(left.dueAt) - Date.parse(right.dueAt);
    if (dueDiff !== 0) return dueDiff;
    return left.reviewItemId.localeCompare(right.reviewItemId);
  });
}
