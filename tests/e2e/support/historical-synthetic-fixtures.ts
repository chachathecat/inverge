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
const historicalS232gCandidateTitlePattern =
  /^S232G aggregate synthetic Study Ledger source(?:\s|$)/;
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
const historicalS232gLegacySourceConfirmedKeys = [
  "biggest_gap",
  "examMode",
  "issue_recall",
  "local_beta_confirmation_available",
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
const historicalS232gLegacyRewriteConfirmedKeys = [
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

function hasHistoricalConfirmedContract(
  confirmed: Record<string, unknown>,
  currentKeys: readonly string[],
  legacyKeys: readonly string[],
) {
  if (hasExactKeys(confirmed, legacyKeys)) return true;
  return (
    hasExactKeys(confirmed, currentKeys) &&
    hasDistinctPersistenceIds(confirmed)
  );
}

function failedFields(checks: readonly (readonly [string, boolean])[]) {
  return checks.filter(([, matches]) => !matches).map(([field]) => field);
}

export function isHistoricalS232gRewriteCandidate(
  item: HistoricalSyntheticItem,
) {
  if (!historicalS232gCandidateTitlePattern.test(item.problemTitle ?? ""))
    return false;
  const rawPayload = item.rawPayload ?? {};
  return (
    rawPayload.rewrite_completed === true ||
    typeof rawPayload.rewrite_source_item_id === "string" ||
    typeof rawPayload.rewrite_paragraph === "string"
  );
}

export function isHistoricalS232gSourceCandidate(
  item: HistoricalSyntheticItem,
) {
  return (
    historicalS232gCandidateTitlePattern.test(item.problemTitle ?? "") &&
    !isHistoricalS232gRewriteCandidate(item)
  );
}

export function historicalS232gSourceFailureFields(
  item: HistoricalSyntheticItem,
) {
  const title = item.problemTitle ?? "";
  const captureText = `${title}\n내 답안: ${historicalS232gOriginalParagraph}`;
  const rawPayload = item.rawPayload ?? {};
  const derivedPayload = item.derivedPayload ?? {};
  const rawExtraction = asRecord(rawPayload.raw_extraction_json);
  const confirmed = asRecord(rawPayload.user_confirmed_fields);

  return failedFields([
    ["item.problemTitle", historicalS232gTitlePattern.test(title)],
    ["item.examName", item.examName === "감정평가사 2차"],
    ["item.subjectLabel", item.subjectLabel === "감정평가실무"],
    ["item.sourceType", item.sourceType === "text"],
    ["item.sourceLabel", isUnset(item.sourceLabel)],
    ["item.problemIdentifier", item.problemIdentifier === "답안 작성"],
    ["item.rawQuestionText", item.rawQuestionText === captureText],
    ["item.rawAnswerText", item.rawAnswerText === captureText],
    ["item.correctAnswer", item.correctAnswer === "-"],
    ["item.userAnswer", item.userAnswer === captureText],
    ["item.userReasonText", item.userReasonText === historicalS232gGap],
    ["item.userReasonPreset", isUnset(item.userReasonPreset)],
    ["item.confidence", item.confidence === "중간"],
    ["rawPayload.created_from_capture", rawPayload.created_from_capture === true],
    ["rawPayload.capture_intent", rawPayload.capture_intent === "save"],
    ["rawPayload.captureMethod", rawPayload.captureMethod === "text"],
    ["rawPayload.mode", rawPayload.mode === "second"],
    ["rawPayload.artifactType", rawPayload.artifactType === "second_correction"],
    ["rawPayload.noteKind", rawPayload.noteKind === "교정노트"],
    ["rawPayload.subjectLabel", rawPayload.subjectLabel === "감정평가실무"],
    ["rawPayload.raw_ocr_text", rawPayload.raw_ocr_text === captureText],
    ["rawPayload.raw_extraction_json", rawExtraction !== null],
    [
      "rawPayload.raw_extraction_json.<keys>",
      rawExtraction !== null && Object.keys(rawExtraction).length === 0,
    ],
    ["rawPayload.normalized_draft", rawPayload.normalized_draft === null],
    [
      "rawPayload.production_before_comparison",
      rawPayload.production_before_comparison === true,
    ],
    [
      "rawPayload.produced_answer_before_reference",
      rawPayload.produced_answer_before_reference === true,
    ],
    [
      "rawPayload.reference_answer_added_after_production",
      rawPayload.reference_answer_added_after_production === false,
    ],
    ["rawPayload.biggest_gap", rawPayload.biggest_gap === historicalS232gGap],
    ["rawPayload.issue_recall", rawPayload.issue_recall === title],
    ["rawPayload.outline_draft", rawPayload.outline_draft === null],
    ["rawPayload.rewrite_completed", rawPayload.rewrite_completed === false],
    [
      "rawPayload.rewrite_source_item_id",
      rawPayload.rewrite_source_item_id === null,
    ],
    ["rawPayload.rewrite_source_gap", rawPayload.rewrite_source_gap === null],
    [
      "rawPayload.rewrite_instruction",
      rawPayload.rewrite_instruction === historicalS232gRewriteInstruction,
    ],
    ["rawPayload.rewrite_paragraph", rawPayload.rewrite_paragraph === null],
    ["rawPayload.user_confirmed_fields", confirmed !== null],
    [
      "rawPayload.user_confirmed_fields.<keys>",
      confirmed !== null &&
        (hasExactKeys(confirmed, historicalS232gSourceConfirmedKeys) ||
          hasExactKeys(confirmed, historicalS232gLegacySourceConfirmedKeys)),
    ],
    [
      "rawPayload.user_confirmed_fields.sourceType",
      confirmed?.sourceType === "text",
    ],
    [
      "rawPayload.user_confirmed_fields.subject",
      confirmed?.subject === "감정평가실무",
    ],
    [
      "rawPayload.user_confirmed_fields.examMode",
      confirmed?.examMode === "second",
    ],
    [
      "rawPayload.user_confirmed_fields.biggest_gap",
      confirmed?.biggest_gap === historicalS232gGap,
    ],
    [
      "rawPayload.user_confirmed_fields.issue_recall",
      confirmed?.issue_recall === title,
    ],
    [
      "rawPayload.user_confirmed_fields.production_before_comparison",
      confirmed?.production_before_comparison === true,
    ],
    [
      "rawPayload.user_confirmed_fields.local_beta_confirmation_available",
      confirmed?.local_beta_confirmation_available === true,
    ],
    [
      "rawPayload.user_confirmed_fields.<persistence_ids>",
      confirmed !== null &&
        hasHistoricalConfirmedContract(
          confirmed,
          historicalS232gSourceConfirmedKeys,
          historicalS232gLegacySourceConfirmedKeys,
        ),
    ],
    [
      "derivedPayload.created_from_capture",
      derivedPayload.created_from_capture === true,
    ],
  ]);
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
  return historicalS232gSourceFailureFields(item).length === 0;
}

export function historicalS232gRewriteFailureFields(
  item: HistoricalSyntheticItem,
  parentId: string,
  parentTitle: string,
) {
  const rawPayload = item.rawPayload ?? {};
  const derivedPayload = item.derivedPayload ?? {};
  const rawExtraction = asRecord(rawPayload.raw_extraction_json);
  const confirmed = asRecord(rawPayload.user_confirmed_fields);

  return failedFields([
    ["parent.id", Boolean(parentId)],
    ["parent.problemTitle", historicalS232gTitlePattern.test(parentTitle)],
    ["item.examName", item.examName === "감정평가사 2차"],
    ["item.subjectLabel", item.subjectLabel === "감정평가실무"],
    ["item.sourceType", item.sourceType === "text"],
    ["item.sourceLabel", isUnset(item.sourceLabel)],
    ["item.problemTitle", item.problemTitle === parentTitle],
    ["item.problemIdentifier", item.problemIdentifier === "답안 작성"],
    ["item.rawQuestionText", isUnset(item.rawQuestionText)],
    ["item.rawAnswerText", item.rawAnswerText === ""],
    ["item.correctAnswer", item.correctAnswer === "-"],
    ["item.userAnswer", item.userAnswer === "-"],
    ["item.userReasonText", item.userReasonText === historicalS232gGap],
    ["item.userReasonPreset", isUnset(item.userReasonPreset)],
    ["item.confidence", item.confidence === "중간"],
    ["rawPayload.created_from_capture", rawPayload.created_from_capture === true],
    ["rawPayload.capture_intent", rawPayload.capture_intent === "save"],
    ["rawPayload.captureMethod", rawPayload.captureMethod === "text"],
    ["rawPayload.mode", rawPayload.mode === "second"],
    ["rawPayload.artifactType", rawPayload.artifactType === "second_correction"],
    ["rawPayload.noteKind", rawPayload.noteKind === "교정노트"],
    ["rawPayload.subjectLabel", rawPayload.subjectLabel === "감정평가실무"],
    ["rawPayload.raw_ocr_text", rawPayload.raw_ocr_text === ""],
    ["rawPayload.raw_extraction_json", rawExtraction !== null],
    [
      "rawPayload.raw_extraction_json.<keys>",
      rawExtraction !== null && Object.keys(rawExtraction).length === 0,
    ],
    ["rawPayload.normalized_draft", rawPayload.normalized_draft === null],
    ["rawPayload.rewrite_source_item_id", rawPayload.rewrite_source_item_id === parentId],
    ["rawPayload.rewrite_source_gap", rawPayload.rewrite_source_gap === historicalS232gGap],
    ["rawPayload.rewrite_instruction", rawPayload.rewrite_instruction === historicalS232gRewriteInstruction],
    ["rawPayload.rewrite_paragraph", rawPayload.rewrite_paragraph === historicalS232gRewriteParagraph],
    ["rawPayload.rewrite_completed", rawPayload.rewrite_completed === true],
    ["rawPayload.issue_recall", rawPayload.issue_recall === null],
    ["rawPayload.outline_draft", rawPayload.outline_draft === null],
    ["rawPayload.production_before_comparison", rawPayload.production_before_comparison === true],
    ["rawPayload.produced_answer_before_reference", rawPayload.produced_answer_before_reference === true],
    ["rawPayload.reference_answer_added_after_production", rawPayload.reference_answer_added_after_production === true],
    ["rawPayload.biggest_gap", rawPayload.biggest_gap === historicalS232gGap],
    ["rawPayload.user_confirmed_fields", confirmed !== null],
    [
      "rawPayload.user_confirmed_fields.<keys>",
      confirmed !== null &&
        (hasExactKeys(confirmed, historicalS232gRewriteConfirmedKeys) ||
          hasExactKeys(
            confirmed,
            historicalS232gLegacyRewriteConfirmedKeys,
          )),
    ],
    ["rawPayload.user_confirmed_fields.biggest_gap", confirmed?.biggest_gap === historicalS232gGap],
    ["rawPayload.user_confirmed_fields.captureQualityIssue", confirmed?.captureQualityIssue === null],
    ["rawPayload.user_confirmed_fields.correctAnswer", confirmed?.correctAnswer === "-"],
    ["rawPayload.user_confirmed_fields.examMode", confirmed?.examMode === "second"],
    ["rawPayload.user_confirmed_fields.hasManualCorrection", confirmed?.hasManualCorrection === false],
    ["rawPayload.user_confirmed_fields.issue_recall", confirmed?.issue_recall === null],
    ["rawPayload.user_confirmed_fields.lowConfidenceFlag", confirmed?.lowConfidenceFlag === false],
    [
      "rawPayload.user_confirmed_fields.nextReviewDate",
      typeof confirmed?.nextReviewDate === "string" && isoDatePattern.test(confirmed.nextReviewDate),
    ],
    ["rawPayload.user_confirmed_fields.ocrConfirmedByLearner", confirmed?.ocrConfirmedByLearner === false],
    ["rawPayload.user_confirmed_fields.outline_draft", confirmed?.outline_draft === null],
    ["rawPayload.user_confirmed_fields.pageCount", confirmed?.pageCount === 0],
    [
      "rawPayload.user_confirmed_fields.<persistence_ids>",
      confirmed !== null &&
        hasHistoricalConfirmedContract(
          confirmed,
          historicalS232gRewriteConfirmedKeys,
          historicalS232gLegacyRewriteConfirmedKeys,
        ),
    ],
    ["rawPayload.user_confirmed_fields.problemTitle", confirmed?.problemTitle === parentTitle],
    ["rawPayload.user_confirmed_fields.produced_answer_before_reference", confirmed?.produced_answer_before_reference === true],
    ["rawPayload.user_confirmed_fields.production_before_comparison", confirmed?.production_before_comparison === true],
    ["rawPayload.user_confirmed_fields.reference_answer_added_after_production", confirmed?.reference_answer_added_after_production === true],
    ["rawPayload.user_confirmed_fields.rewrite_completed", confirmed?.rewrite_completed === true],
    ["rawPayload.user_confirmed_fields.rewrite_instruction", confirmed?.rewrite_instruction === historicalS232gRewriteInstruction],
    ["rawPayload.user_confirmed_fields.rewrite_paragraph", confirmed?.rewrite_paragraph === historicalS232gRewriteParagraph],
    ["rawPayload.user_confirmed_fields.rewrite_source_gap", confirmed?.rewrite_source_gap === historicalS232gGap],
    ["rawPayload.user_confirmed_fields.rewrite_source_item_id", confirmed?.rewrite_source_item_id === parentId],
    ["rawPayload.user_confirmed_fields.sourceType", confirmed?.sourceType === "text"],
    ["rawPayload.user_confirmed_fields.subject", confirmed?.subject === "감정평가실무"],
    ["rawPayload.user_confirmed_fields.subjectLabel", confirmed?.subjectLabel === "감정평가실무"],
    ["rawPayload.user_confirmed_fields.timeSpentMinutes", confirmed?.timeSpentMinutes === null],
    ["rawPayload.user_confirmed_fields.userAnswer", confirmed?.userAnswer === ""],
    ["rawPayload.user_confirmed_fields.userReasonPreset", confirmed?.userReasonPreset === ""],
    ["rawPayload.user_confirmed_fields.userReasonText", confirmed?.userReasonText === historicalS232gGap],
    ["derivedPayload.created_from_capture", derivedPayload.created_from_capture === true],
  ]);
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
  return (
    historicalS232gRewriteFailureFields(item, parentId, parentTitle).length ===
    0
  );
}
