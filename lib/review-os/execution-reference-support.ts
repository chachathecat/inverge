export type ExecutionReferenceSupport = {
  taxonomyCandidate: string | null;
  similarTopicSuggestion: string[];
  skeletonKeywordHint: string | null;
  skeletonKeywords: string[];
  skeletonKeywordHints: string[];
  commonGaps: string[];
  topicCandidate: string | null;
  missingIssue: string | null;
  weakStructurePoint: string | null;
  reviewPriority: number | null;
};

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => toText(entry)).filter((entry): entry is string => Boolean(entry)).slice(0, 3);
}

export function buildReferenceSupportForExecution(detailOrSignal: unknown): ExecutionReferenceSupport | null {
  if (!detailOrSignal || typeof detailOrSignal !== "object") return null;
  const src = detailOrSignal as Record<string, unknown>;
  const taxonomyRaw = src.taxonomy_candidate;
  const taxonomyCandidate =
    toText(taxonomyRaw) ??
    (taxonomyRaw && typeof taxonomyRaw === "object" ? toText((taxonomyRaw as Record<string, unknown>).topic) : null);

  const similarTopicSuggestion = toTextArray(src.similar_topic_suggestion);
  const skeletonKeywordHint = toText(src.skeleton_keyword_hint);
  const skeletonKeywords = toTextArray(src.skeletonKeywords);
  const skeletonKeywordHints = toTextArray(src.skeletonKeywordHints);
  const commonGaps = toTextArray(src.commonGaps);

  const topicCandidate = toText(src.topic_candidate);
  const missingIssue = toText(src.missing_issue);
  const weakStructurePoint = toText(src.weak_structure_point);
  const reviewPriority = typeof src.review_priority === "number" ? src.review_priority : null;

  const hasSupport = Boolean(
    taxonomyCandidate || similarTopicSuggestion.length || skeletonKeywordHint || skeletonKeywords.length || skeletonKeywordHints.length || commonGaps.length || topicCandidate || missingIssue || weakStructurePoint || reviewPriority !== null,
  );
  if (!hasSupport) return null;

  return { taxonomyCandidate, similarTopicSuggestion, skeletonKeywordHint, skeletonKeywords, skeletonKeywordHints, commonGaps, topicCandidate, missingIssue, weakStructurePoint, reviewPriority };
}
