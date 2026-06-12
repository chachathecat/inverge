export const CAPTURE_NOTE_ALLOWED_TASK_TYPES = [
  "ox",
  "cloze",
  "calculation_template",
  "rewrite",
  "issue_recall",
  "review_note",
] as const;

export type CaptureNoteAllowedTaskType = (typeof CAPTURE_NOTE_ALLOWED_TASK_TYPES)[number];
export type CaptureNoteQualityExamMode = "first" | "second";

export type CaptureToNoteQualityDraft = {
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  learnerNoteText?: string;
  summary?: string;
  biggestGap: string;
  nextAction: string;
  nextActionTaskType: string;
  learnerOwned?: boolean;
  metadataOnly?: boolean;
  safeUse?: string;
};

export type CaptureToNoteQualityResult = {
  examMode: CaptureNoteQualityExamMode;
  subject: string;
  learnerNoteText?: string;
  summary?: string;
  biggestGap: string;
  nextAction: string;
  nextActionTaskType: CaptureNoteAllowedTaskType;
  learnerOwned: true;
  metadataOnly: true;
  safeUse: "closed_beta_capture_note_quality";
};

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
  /(official.*answer|official.*grade|model.*answer|pass.*fail|score|instructor|local.*file|source.*file|raw.*file|qnet.*raw|ocr.*full|raw.*problem|raw.*answer|raw.*ocr|source.*text|archive)/i;

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

function assertNoForbiddenFields(value: unknown, path = "captureNote"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Capture-to-note quality contract forbids field: ${path}.${key}`);
    }
    assertNoForbiddenFields(nestedValue, `${path}.${key}`);
  }
}

function assertSafeText(label: string, value: string): void {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(value)) throw new Error(`Capture-to-note quality contract forbids unsafe ${label}`);
  }
}

function assertSingleLineCandidate(label: string, value: unknown): string {
  if (typeof value !== "string") throw new Error(`Capture-to-note quality contract requires one ${label}`);
  const normalized = clean(value);
  if (!normalized) throw new Error(`Capture-to-note quality contract requires one ${label}`);
  if (/[\r\n]/.test(value)) throw new Error(`Capture-to-note quality contract requires a single ${label}`);
  assertSafeText(label, normalized);
  return normalized;
}

export function normalizeCaptureNoteTaskType(value: string): CaptureNoteAllowedTaskType | null {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (/^(o\/x|ox|first_ox|first_ox_retry)$/.test(normalized)) return "ox";
  if (/^(cloze|cloze_review|blank_recall)$/.test(normalized)) return "cloze";
  if (/^(calculation_template|accounting_template|accounting_template_retry|casio|calculator_template)$/.test(normalized)) {
    return "calculation_template";
  }
  if (/^(rewrite|second_answer_rewrite|paragraph_rewrite)$/.test(normalized)) return "rewrite";
  if (/^(issue_recall|issue_spotting|issue_retrieval|legal_skeleton_recall)$/.test(normalized)) return "issue_recall";
  if (/^(review_note|concept_review|note_review|review)$/.test(normalized)) return "review_note";
  return null;
}

function assertModeTaskCompatibility(examMode: CaptureNoteQualityExamMode, taskType: CaptureNoteAllowedTaskType): void {
  const allowed = examMode === "first" ? FIRST_EXAM_ALLOWED_TASK_TYPES : SECOND_EXAM_ALLOWED_TASK_TYPES;
  if (!allowed.has(taskType)) {
    throw new Error(`Capture-to-note quality contract rejects ${taskType} for ${examMode} exam mode`);
  }
}

export function validateCaptureToNoteQualityContract(input: CaptureToNoteQualityDraft): CaptureToNoteQualityResult {
  assertNoForbiddenFields(input);

  if (input.examMode !== "first" && input.examMode !== "second") {
    throw new Error(`Capture-to-note quality contract rejects examMode: ${String(input.examMode)}`);
  }

  const subject = assertSingleLineCandidate("subject", input.subject);
  const learnerNoteText = clean(input.learnerNoteText);
  const summary = clean(input.summary);
  if (!learnerNoteText && !summary) {
    throw new Error("Capture-to-note quality contract requires learner-owned note text or summary");
  }
  if (learnerNoteText) assertSafeText("learner note text", learnerNoteText);
  if (summary) assertSafeText("summary", summary);

  const biggestGap = assertSingleLineCandidate("biggest gap", input.biggestGap);
  const nextAction = assertSingleLineCandidate("next action", input.nextAction);
  const nextActionTaskType = normalizeCaptureNoteTaskType(input.nextActionTaskType);
  if (!nextActionTaskType) {
    throw new Error(`Capture-to-note quality contract rejects task type: ${String(input.nextActionTaskType)}`);
  }
  assertModeTaskCompatibility(input.examMode, nextActionTaskType);

  if (input.metadataOnly === false) throw new Error("Capture-to-note quality contract requires metadataOnly outputs");
  if (input.learnerOwned === false) throw new Error("Capture-to-note quality contract requires learner-owned notes");

  return {
    examMode: input.examMode,
    subject,
    ...(learnerNoteText ? { learnerNoteText } : {}),
    ...(summary ? { summary } : {}),
    biggestGap,
    nextAction,
    nextActionTaskType,
    learnerOwned: true,
    metadataOnly: true,
    safeUse: "closed_beta_capture_note_quality",
  };
}
