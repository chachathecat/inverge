export type HistoricalSyntheticItem = {
  examName?: string;
  subjectLabel?: string;
  sourceType?: string;
  sourceLabel?: string;
  problemTitle?: string;
  problemIdentifier?: string;
  rawQuestionText?: string;
  rawAnswerText?: string;
  correctAnswer?: string;
  userAnswer?: string;
  userReasonText?: string;
  userReasonPreset?: string;
  confidence?: string;
  rawPayload?: Record<string, unknown>;
  derivedPayload?: Record<string, unknown>;
};

export const historicalS232gOriginalParagraph =
  "합성 원본 문단은 요건과 사실 대응을 확인하기 위한 비민감 테스트 기록입니다.";

export const historicalS232gRewriteParagraph =
  "합성 재작성 문단은 요건, 사실 적용, 소결론을 한 흐름으로 연결한 비민감 테스트 기록입니다.";

const historicalS232gTitlePattern =
  /^S232G aggregate synthetic Study Ledger source ([1-9]\d*-[1-9]\d*)$/;
const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const historicalS232gGap = "조문·요건과 사안 포섭 연결 부족";
const historicalS232gRewriteInstruction =
  "요건 1개와 사안 포섭 문장 1개를 다시 써보기";
const historicalS232gSourceConfirmedKeys = [
  "biggest_gap",
  "examMode",
  "issue_recall",
  "local_beta_confirmation_available",
  "persistence_operation_id",
  "persistence_work_revision_id",
  "production_before_comparison",
  "sourceType",
  "subject",
] as const;
const historicalS232gRewriteConfirmedKeys = [
  "biggest_gap",
  "captureQualityIssue",
  "correctAnswer",
  "examMode",
  "hasManualCorrection",
  "issue_recall",
  "lowConfidenceFlag",
  "nextReviewDate",
  "ocrConfirmedByLearner",
  "outline_draft",
  "pageCount",
  "persistence_operation_id",
  "persistence_work_revision_id",
  "problemTitle",
  "produced_answer_before_reference",
  "production_before_comparison",
  "reference_answer_added_after_production",
  "rewrite_completed",
  "rewrite_instruction",
  "rewrite_paragraph",
  "rewrite_source_gap",
  "rewrite_source_item_id",
  "sourceType",
  "subject",
  "subjectLabel",
  "timeSpentMinutes",
  "userAnswer",
  "userReasonPreset",
  "userReasonText",
] as const;

function asRecord(value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isUnset(value: unknown) {
  return value === undefined || value === "";
}

function hasExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
) {
  return Object.keys(record).sort().join(",") === expected.join(",");
}

function hasDistinctPersistenceIds(confirmed: Record<string, unknown>) {
  const operationId = confirmed.persistence_operation_id;
  const workRevisionId = confirmed.persistence_work_revision_id;
  return (
    typeof operationId === "string" &&
    uuidV4Pattern.test(operationId) &&
    typeof workRevisionId === "string" &&
    uuidV4Pattern.test(workRevisionId) &&
    operationId !== workRevisionId
  );
}

/**
 * Recognizes only the bounded source record emitted by the retired S232G
 * aggregate runtime. This does not revive that workflow; it lets the visual
 * privacy gate distinguish its already-persisted non-sensitive rows from an
 * arbitrary same-account item. Rewrites remain subject to the separate exact
 * parent binding and paragraph contract.
 */
export function isHistoricalS232gAggregateSource(
  item: HistoricalSyntheticItem,
) {
  const title = item.problemTitle ?? "";
  if (!historicalS232gTitlePattern.test(title)) return false;
  const captureText = `${title}\n내 답안: ${historicalS232gOriginalParagraph}`;
  const rawPayload = item.rawPayload ?? {};
  const derivedPayload = item.derivedPayload ?? {};
  const rawExtraction = asRecord(rawPayload.raw_extraction_json);
  const confirmed = asRecord(rawPayload.user_confirmed_fields);

  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가실무" &&
    item.sourceType === "text" &&
    isUnset(item.sourceLabel) &&
    item.problemIdentifier === "답안 작성" &&
    item.rawQuestionText === captureText &&
    item.rawAnswerText === captureText &&
    item.correctAnswer === "-" &&
    item.userAnswer === captureText &&
    item.userReasonText === historicalS232gGap &&
    isUnset(item.userReasonPreset) &&
    item.confidence === "중간" &&
    rawPayload.created_from_capture === true &&
    rawPayload.capture_intent === "save" &&
    rawPayload.captureMethod === "text" &&
    rawPayload.mode === "second" &&
    rawPayload.artifactType === "second_correction" &&
    rawPayload.noteKind === "교정노트" &&
    rawPayload.subjectLabel === "감정평가실무" &&
    rawPayload.raw_ocr_text === captureText &&
    rawExtraction !== null &&
    Object.keys(rawExtraction).length === 0 &&
    rawPayload.normalized_draft === null &&
    rawPayload.production_before_comparison === true &&
    rawPayload.produced_answer_before_reference === true &&
    rawPayload.reference_answer_added_after_production === false &&
    rawPayload.biggest_gap === historicalS232gGap &&
    rawPayload.issue_recall === title &&
    rawPayload.outline_draft === null &&
    rawPayload.rewrite_completed === false &&
    rawPayload.rewrite_source_item_id === null &&
    rawPayload.rewrite_source_gap === null &&
    rawPayload.rewrite_instruction === historicalS232gRewriteInstruction &&
    rawPayload.rewrite_paragraph === null &&
    confirmed !== null &&
    hasExactKeys(confirmed, historicalS232gSourceConfirmedKeys) &&
    confirmed.sourceType === "text" &&
    confirmed.subject === "감정평가실무" &&
    confirmed.examMode === "second" &&
    confirmed.biggest_gap === historicalS232gGap &&
    confirmed.issue_recall === title &&
    confirmed.production_before_comparison === true &&
    confirmed.local_beta_confirmation_available === true &&
    hasDistinctPersistenceIds(confirmed) &&
    derivedPayload.created_from_capture === true
  );
}

/**
 * Recognizes only the durable rewrite shape emitted for an exact historical
 * S232G source. Callers must separately prove that parentId and parentTitle
 * belong to an exact source record.
 */
export function isHistoricalS232gAggregateRewrite(
  item: HistoricalSyntheticItem,
  parentId: string,
  parentTitle: string,
) {
  if (!parentId || !historicalS232gTitlePattern.test(parentTitle)) return false;
  const rawPayload = item.rawPayload ?? {};
  const derivedPayload = item.derivedPayload ?? {};
  const rawExtraction = asRecord(rawPayload.raw_extraction_json);
  const confirmed = asRecord(rawPayload.user_confirmed_fields);

  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가실무" &&
    item.sourceType === "text" &&
    isUnset(item.sourceLabel) &&
    item.problemTitle === parentTitle &&
    item.problemIdentifier === "답안 작성" &&
    isUnset(item.rawQuestionText) &&
    item.rawAnswerText === "" &&
    item.correctAnswer === "-" &&
    item.userAnswer === "-" &&
    item.userReasonText === historicalS232gGap &&
    isUnset(item.userReasonPreset) &&
    item.confidence === "중간" &&
    rawPayload.created_from_capture === true &&
    rawPayload.capture_intent === "save" &&
    rawPayload.captureMethod === "text" &&
    rawPayload.mode === "second" &&
    rawPayload.artifactType === "second_correction" &&
    rawPayload.noteKind === "교정노트" &&
    rawPayload.subjectLabel === "감정평가실무" &&
    rawPayload.raw_ocr_text === "" &&
    rawExtraction !== null &&
    Object.keys(rawExtraction).length === 0 &&
    rawPayload.normalized_draft === null &&
    rawPayload.rewrite_source_item_id === parentId &&
    rawPayload.rewrite_source_gap === historicalS232gGap &&
    rawPayload.rewrite_instruction === historicalS232gRewriteInstruction &&
    rawPayload.rewrite_paragraph === historicalS232gRewriteParagraph &&
    rawPayload.rewrite_completed === true &&
    rawPayload.issue_recall === null &&
    rawPayload.outline_draft === null &&
    rawPayload.production_before_comparison === true &&
    rawPayload.produced_answer_before_reference === true &&
    rawPayload.reference_answer_added_after_production === true &&
    rawPayload.biggest_gap === historicalS232gGap &&
    confirmed !== null &&
    hasExactKeys(confirmed, historicalS232gRewriteConfirmedKeys) &&
    confirmed.biggest_gap === historicalS232gGap &&
    confirmed.captureQualityIssue === null &&
    confirmed.correctAnswer === "-" &&
    confirmed.examMode === "second" &&
    confirmed.hasManualCorrection === false &&
    confirmed.issue_recall === null &&
    confirmed.lowConfidenceFlag === false &&
    typeof confirmed.nextReviewDate === "string" &&
    isoDatePattern.test(confirmed.nextReviewDate) &&
    confirmed.ocrConfirmedByLearner === false &&
    confirmed.outline_draft === null &&
    confirmed.pageCount === 0 &&
    hasDistinctPersistenceIds(confirmed) &&
    confirmed.problemTitle === parentTitle &&
    confirmed.produced_answer_before_reference === true &&
    confirmed.production_before_comparison === true &&
    confirmed.reference_answer_added_after_production === true &&
    confirmed.rewrite_completed === true &&
    confirmed.rewrite_instruction === historicalS232gRewriteInstruction &&
    confirmed.rewrite_paragraph === historicalS232gRewriteParagraph &&
    confirmed.rewrite_source_gap === historicalS232gGap &&
    confirmed.rewrite_source_item_id === parentId &&
    confirmed.sourceType === "text" &&
    confirmed.subject === "감정평가실무" &&
    confirmed.subjectLabel === "감정평가실무" &&
    confirmed.timeSpentMinutes === null &&
    confirmed.userAnswer === "" &&
    confirmed.userReasonPreset === "" &&
    confirmed.userReasonText === historicalS232gGap &&
    derivedPayload.created_from_capture === true
  );
}
