export type CaptureExtractionMode = "first" | "second";

export type CaptureExtractionRevisionEvent =
  | "text_request"
  | "image_import"
  | "pdf_import"
  | "remove_page"
  | "move_page"
  | "reset";

export function advanceCaptureExtractionRequestRevision(
  currentRevision: number,
  event: CaptureExtractionRevisionEvent,
) {
  void event;
  return currentRevision + 1;
}

export function isCurrentCaptureExtractionRequest(
  requestRevision: number,
  currentRevision: number,
) {
  return requestRevision === currentRevision;
}

const FIRST_EXTRACTION_SEMANTIC_FIELDS = [
  "subjectLabel",
  "sourceLabel",
  "problemTitle",
  "correctAnswer",
  "userAnswer",
  "userReasonText",
  "keyConcepts",
  "coreFormula",
  "comparisonPoint",
  "nextReviewDate",
] as const;

const SECOND_EXTRACTION_SEMANTIC_FIELDS = [
  "subjectLabel",
  "problemTitle",
  "correctAnswer",
  "userReasonText",
  "missingIssue",
  "weakStructurePoint",
  "weakApplicationSentence",
  "rewriteInstruction",
  "referenceStructure",
  "myAnswerSummary",
  "caseSummary",
  "nextReviewDate",
  "productionBeforeComparison",
] as const;

export type CaptureExtractionSemanticField =
  | (typeof FIRST_EXTRACTION_SEMANTIC_FIELDS)[number]
  | (typeof SECOND_EXTRACTION_SEMANTIC_FIELDS)[number];

type SemanticState = Record<CaptureExtractionSemanticField, string | boolean>;
export type CaptureExtractionSemanticSnapshot = Partial<SemanticState>;

export function getCaptureExtractionSemanticFields(mode: CaptureExtractionMode) {
  return mode === "second"
    ? SECOND_EXTRACTION_SEMANTIC_FIELDS
    : FIRST_EXTRACTION_SEMANTIC_FIELDS;
}

export function snapshotCaptureExtractionSemantics(
  source: SemanticState,
  mode: CaptureExtractionMode,
): CaptureExtractionSemanticSnapshot {
  return Object.fromEntries(
    getCaptureExtractionSemanticFields(mode).map((field) => [field, source[field]]),
  ) as CaptureExtractionSemanticSnapshot;
}

export function clearUnchangedCaptureExtractionSemantics<T extends SemanticState>(
  current: T,
  requestSnapshot: CaptureExtractionSemanticSnapshot,
  mode: CaptureExtractionMode,
): T {
  const cleared = { ...current };
  for (const field of getCaptureExtractionSemanticFields(mode)) {
    if (current[field] !== requestSnapshot[field]) continue;
    cleared[field] = (field === "productionBeforeComparison" ? false : "") as T[typeof field];
  }
  return cleared;
}

export function restoreLearnerEditedCaptureSemantics<T extends SemanticState>(
  current: T,
  requestSnapshot: CaptureExtractionSemanticSnapshot,
  rederivedFromLatestText: T,
  mode: CaptureExtractionMode,
): T {
  const reconciled = { ...rederivedFromLatestText };
  for (const field of getCaptureExtractionSemanticFields(mode)) {
    if (current[field] === requestSnapshot[field]) continue;
    reconciled[field] = current[field] as T[typeof field];
  }
  return reconciled;
}
