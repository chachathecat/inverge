import type { TaxonomyClassificationCandidate } from "./types";

export function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function toTaxonomyCandidates(value: unknown): TaxonomyClassificationCandidate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.taxonomyNodeId !== "string") return null;
      const candidate: TaxonomyClassificationCandidate = {
        taxonomyNodeId: row.taxonomyNodeId,
        mode: row.mode === "second" ? "second" : "first",
        examYear: typeof row.examYear === "number" ? row.examYear : undefined,
        round: typeof row.round === "string" ? row.round : undefined,
        subject: typeof row.subject === "string" ? row.subject : "",
        unit: typeof row.unit === "string" ? row.unit : "",
        topic: typeof row.topic === "string" ? row.topic : "",
        subtopic: typeof row.subtopic === "string" ? row.subtopic : undefined,
        skill: typeof row.skill === "string" ? row.skill : (typeof row.examSkill === "string" ? row.examSkill : ""),
        examSkill: typeof row.examSkill === "string" ? row.examSkill : "",
        skeletonKeywords: toStringArray(row.skeletonKeywords),
        commonGaps: toStringArray(row.commonGaps),
        score: Number(row.score ?? 0),
        confidence: Number(row.confidence ?? 0),
        matchedKeywords: toStringArray(row.matchedKeywords),
        skeletonKeywordHints: toStringArray(row.skeletonKeywordHints),
        classificationStatus: row.classificationStatus === "ai_suggested" ? "ai_suggested" : "needs_review",
      };
      return candidate;
    })
    .filter((candidate): candidate is TaxonomyClassificationCandidate => candidate !== null);
}
