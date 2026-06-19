/**
 * Data-boundary helpers for Review OS persistence.
 *
 * Inverge separates three classes of data:
 * - raw user-owned service data (allowed only in user-owned service records),
 * - safe derived learning signals (allowed in metadata/telemetry/derived payloads), and
 * - trusted product reference corpus data (allowed in reference lookups/corpus only).
 */

export const RAW_USER_DATA_KEYS = [
  "uploadedImage",
  "uploadedImages",
  "uploadedImageText",
  "uploadedImageContent",
  "uploadedPdf",
  "uploadedPdfs",
  "uploadedPdfText",
  "uploadedPdfContent",
  "uploadedFile",
  "uploadedFiles",
  "uploadedFileText",
  "uploadedFileContent",
  "imageBytes",
  "pdfBytes",
  "ocrText",
  "rawOcrText",
  "raw_ocr_text",
  "rawOCRText",
  "rawOcrPayload",
  "rawPayload",
  "rawUserPayload",
  "rawAnswerPayload",
  "rawProblemPayload",
  "rawText",
  "raw_text",
  "rawQuestionText",
  "raw_question_text",
  "rawAnswerText",
  "raw_answer_text",
  "answerText",
  "answerBody",
  "userAnswerText",
  "user_answer_text",
  "userAnswer",
  "user_answer",
  "handwrittenText",
  "rawHandwrittenContent",
  "handwrittenAnswerContents",
  "statementText",
  "originalStatement",
  "originalStatementText",
  "originalFirstOxStatementText",
  "originalAnswerText",
  "originalProblemText",
  "originalQuestionText",
  "secondExamOriginalAnswer",
  "originalAnswer",
  "rewriteParagraph",
  "rawRewriteParagraph",
  "problemText",
  "problemBody",
  "rawProblemText",
  "fullProblemText",
  "rawExtractionJson",
  "raw_extraction_json",
  "extractionPayload",
  "normalized_draft",
  "questionText",
  "questionBody",
  "referenceText",
  "full user answer",
  "full problem text",
  "full reference answer",
] as const;

export const SAFE_DERIVED_SIGNAL_KEYS = [
  "examMode",
  "mode",
  "subject",
  "subjectLabel",
  "topicCandidate",
  "topic_candidate",
  "conceptCandidate",
  "concept_candidate",
  "conceptNodeCandidate",
  "concept_node_candidate",
  "conceptNodeId",
  "conceptFamily",
  "retrievalPrompt",
  "conceptNextTaskType",
  "sourceStatus",
  "needsOfficialVerification",
  "issueTags",
  "issue_tags",
  "skeletonId",
  "skeleton_id",
  "mistakeType",
  "mistake_type",
  "weakStructurePoint",
  "weak_structure_point",
  "missingIssueCandidate",
  "missing_issue_candidate",
  "calculationRisk",
  "unitRisk",
  "reviewStage",
  "review_stage",
  "nextTaskType",
  "next_task_type",
  "confidenceBucket",
  "confidence",
  "pageCount",
  "lowConfidenceFlag",
  "captureQualityIssue",
  "ocrConfirmedByLearner",
  "supportedCalculatorTemplateId",
  "safeSkeletonIds",
  "safe_skeleton_ids",
  "trapWords",
  "trap_words",
  "templateId",
  "sourceType",
  "source_type",
  "createdFromCapture",
  "created_from_capture",
  "taskType",
  "task_type",
  "result",
  "certainty",
  "statement_id",
  "sourceItemId",
  "review_priority",
  "structureVersion",
  "containsRawContent",
] as const;

export const REFERENCE_CORPUS_KEYS = [
  "referenceId",
  "title",
  "examMode",
  "subject",
  "sourceType",
  "snippet",
  "citationLabel",
  "tags",
  "topics",
  "concepts",
  "licenseStatus",
  "usageStatus",
  "updatedAt",
] as const;

const RAW_KEY_SET = new Set<string>(RAW_USER_DATA_KEYS.map((key) => key.toLowerCase()));
const RAW_KEY_PATTERNS = [
  /(^|_)(raw|original|uploaded)(_|$|[A-Z])/i,
  /(ocr|handwritten).*(text|content|json|payload)/i,
  /(answer|problem|question|statement|paragraph).*(text|content|body)/i,
  /(text|content|body).*(answer|problem|question|statement|paragraph)/i,
  /extraction.*json/i,
];
const SAFE_REFERENCE_REQUEST_KEYS = new Set(["examMode", "subject", "topicCandidate", "conceptCandidate", "mistakeType", "issueTags", "skeletonId", "taskType", "maxSnippets", "derivedTags", "safeSkeletonIds"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRawUserDataKey(key: string) {
  if (RAW_KEY_SET.has(key.toLowerCase())) return true;
  return RAW_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (!isRecord(value)) return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isRawUserDataKey(key)) continue;
    output[key] = sanitizeValue(child);
  }
  return output;
}

function findRawKeys(value: unknown, path = "metadata"): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => findRawKeys(entry, `${path}[${index}]`));
  if (!isRecord(value)) return [];
  const keys: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (isRawUserDataKey(key)) keys.push(childPath);
    keys.push(...findRawKeys(child, childPath));
  }
  return keys;
}

export function sanitizeDerivedMetadata<T>(input: T): T {
  return sanitizeValue(input) as T;
}

export function assertNoRawUserDataInDerived(input: unknown): void {
  const keys = findRawKeys(input);
  if (keys.length > 0) {
    throw new Error(`raw-user-data-in-derived-metadata: ${keys.slice(0, 8).join(", ")}`);
  }
}

export function sanitizeLearningSignalMetadata<T>(input: T): T {
  const sanitized = sanitizeDerivedMetadata(input);
  assertNoRawUserDataInDerived(sanitized);
  return sanitized;
}

export function sanitizeReferenceRequest<T extends Record<string, unknown>>(input: T): Partial<T> {
  const sanitized = sanitizeDerivedMetadata(input) as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sanitized)) {
    if (SAFE_REFERENCE_REQUEST_KEYS.has(key)) output[key] = value;
  }
  assertNoRawUserDataInDerived(output);
  return output as Partial<T>;
}
