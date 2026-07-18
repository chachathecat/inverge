type SyntheticPayloadEnvelope = {
  rawPayload?: unknown;
  derivedPayload?: unknown;
};

type SyntheticPayloadFailureSummary = {
  path: string;
  count: number;
};

const safeSyntheticPayloadPathSegments = new Set([
  "acceptance_fixture_id",
  "acceptance_fixture_role",
  "aiDraft",
  "biggest_gap",
  "calculation_risk",
  "candidates",
  "capture_note_engine_v1",
  "capture_note_engine_v2",
  "casio_keystrokes",
  "casio_unsupported_message",
  "completionAction",
  "conceptFamily",
  "conceptLabel",
  "conceptNodeCandidate",
  "conceptNodeId",
  "concept_node_candidate",
  "confidence",
  "confidenceGap",
  "created_from_capture",
  "curriculumCandidates",
  "curriculumNodeId",
  "curriculum_anchored_capture_signal",
  "dueAtCandidate",
  "dueReview",
  "estimatedMinutes",
  "examMode",
  "explanationLadderSummary",
  "followUpScheduledAt",
  "gapLabel",
  "hasManualCorrection",
  "id",
  "importance",
  "keyConcepts",
  "key_concepts",
  "labels",
  "learningStateUpdateCandidate",
  "matchedKeywords",
  "metadataOnly",
  "missingIssueCandidate",
  "missing_issue_candidate",
  "mistakeType",
  "mistake_type",
  "mode",
  "needsOfficialVerification",
  "nextAction",
  "nextReviewPattern",
  "nextTaskType",
  "next_rewrite_action",
  "next_task_type",
  "normalized_draft",
  "ocrConfirmedByLearner",
  "one_biggest_gap",
  "one_next_action",
  "primaryConceptNodeId",
  "priority",
  "production_before_comparison",
  "question_or_case_summary",
  "question_summary",
  "raw_extraction_json",
  "raw_ocr_text",
  "recentWrong",
  "reference_answer_added_after_production",
  "retrievalPrompt",
  "reviewPattern",
  "reviewQueueCandidate",
  "reviewReason",
  "review_reason",
  "rewrite_completed",
  "rewrite_instruction",
  "rewrite_paragraph",
  "rewrite_source_gap",
  "rewrite_source_item_id",
  "rewrite_task_type",
  "safeFallbackReason",
  "safeSummary",
  "source",
  "sourceEventType",
  "sourceStatus",
  "sourceType",
  "subject",
  "subjectLabel",
  "supported_calculator_template_id",
  "targetStatus",
  "taskType",
  "taskTypes",
  "taxonomyClassification",
  "tenSecondCheckLabel",
  "title",
  "todayPlanCandidate",
  "topicLabel",
  "topic_candidate",
  "unit_risk",
  "userAnswer",
  "userId",
  "user_answer_summary",
  "user_confirmed_fields",
  "weakStructure",
  "weak_structure_point",
]);

function safePathSegment(key: string) {
  return safeSyntheticPayloadPathSegments.has(key) ? key : "<unknown-key>";
}

const exactSyntheticTaxonomyMatchedKeywordPaths = new Set([
  "rawPayload.taxonomyClassification.candidates[].matchedKeywords[]",
  "derivedPayload.taxonomyClassification.candidates[].matchedKeywords[]",
]);

export function isAllowedExactSyntheticTaxonomyString(
  value: string,
  path: string,
) {
  return (
    value === "판단" &&
    exactSyntheticTaxonomyMatchedKeywordPaths.has(path)
  );
}

export function collectSyntheticPayloadFailurePaths(
  item: SyntheticPayloadEnvelope,
  isAllowedString: (value: string, path: string) => boolean,
) {
  const failures: string[] = [];
  const visit = (value: unknown, path: string) => {
    if (typeof value === "string") {
      if (!isAllowedString(value, path)) failures.push(path);
      return;
    }
    if (
      value === undefined ||
      value === null ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )
      return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, `${path}[]`));
      return;
    }
    if (typeof value === "object") {
      for (const [key, entry] of Object.entries(
        value as Record<string, unknown>,
      ))
        visit(entry, `${path}.${safePathSegment(key)}`);
      return;
    }
    failures.push(path);
  };
  visit(item.rawPayload ?? {}, "rawPayload");
  visit(item.derivedPayload ?? {}, "derivedPayload");
  return failures;
}

export function summarizeSyntheticPayloadFailurePaths(
  entries: readonly {
    item: SyntheticPayloadEnvelope;
    isAllowedString: (value: string, path: string) => boolean;
  }[],
): SyntheticPayloadFailureSummary[] {
  const counts = new Map<string, number>();
  for (const { item, isAllowedString } of entries) {
    for (const path of collectSyntheticPayloadFailurePaths(
      item,
      isAllowedString,
    ))
      counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return [...counts]
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
