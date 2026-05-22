import {
  findTaxonomyNodeById,
  searchTaxonomyCandidates,
  type AppraisalMode,
  type TaxonomySearchCandidate,
} from "@/lib/review-os/appraisal-taxonomy";

export type TaxonomyClassificationStatus = "ai_suggested" | "needs_review";

export type TaxonomyClassificationCandidate = {
  taxonomyNodeId: string;
  mode: "first" | "second";
  examYear?: number;
  round?: string;
  subject: string;
  unit: string;
  topic: string;
  subtopic?: string;
  skill: string;
  examSkill: string;
  skeletonKeywords: string[];
  commonGaps: string[];
  score: number;
  confidence: number;
  matchedKeywords: string[];
  skeletonKeywordHints: string[];
  classificationStatus: TaxonomyClassificationStatus;
};

export type TaxonomyClassificationResult = {
  primary: TaxonomyClassificationCandidate | null;
  candidates: TaxonomyClassificationCandidate[];
  classificationStatus: TaxonomyClassificationStatus;
  classificationConfidence: number;
};

type StudyLogTaxonomyInput = {
  mode: AppraisalMode;
  subject: string;
  studyType: string;
  sourceLabel: string;
  notUnderstood: string;
  revisitNeeded: string;
};

type WrongAnswerTaxonomyInput = {
  examName?: string;
  mode?: AppraisalMode;
  subjectLabel?: string;
  problemTitle?: string;
  rawQuestionText?: string;
  userReasonText?: string;
  userReasonPreset?: string;
  keyConcepts?: string[];
  coreFormula?: string;
  comparisonPoint?: string;
  missingIssue?: string;
  weakStructurePoint?: string;
  weakApplicationSentence?: string;
};

export function normalizeTaxonomyCandidate(candidate: TaxonomySearchCandidate): TaxonomyClassificationCandidate {
  const node = findTaxonomyNodeById(candidate.node.id) ?? candidate.node;
  const confidence = toConfidence(candidate.score, candidate.matchedKeywords.length);
  const classificationStatus: TaxonomyClassificationStatus = confidence >= 0.45 ? "ai_suggested" : "needs_review";

  return {
    taxonomyNodeId: node.id,
    mode: node.mode,
    examYear: node.examYear,
    round: node.round,
    subject: node.subject,
    unit: node.unit,
    topic: node.topic,
    subtopic: node.subtopic,
    skill: node.skill ?? node.examSkill,
    examSkill: node.examSkill,
    skeletonKeywords: node.skeletonKeywords ?? [],
    commonGaps: node.commonGaps ?? node.commonMistakeTypes,
    score: candidate.score,
    confidence,
    matchedKeywords: candidate.matchedKeywords,
    skeletonKeywordHints: candidate.skeletonKeywordHints,
    classificationStatus,
  };
}

export function classifyStudyLogTaxonomy(input: StudyLogTaxonomyInput): TaxonomyClassificationResult {
  const text = [input.subject, input.studyType, input.sourceLabel, input.notUnderstood, input.revisitNeeded]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  return classifyTaxonomy({
    mode: input.mode,
    subject: input.subject,
    text,
  });
}

export function classifyWrongAnswerTaxonomy(input: WrongAnswerTaxonomyInput): TaxonomyClassificationResult {
  const mode = input.mode ?? resolveModeFromExamName(input.examName);
  const text = [
    input.subjectLabel,
    input.problemTitle,
    input.rawQuestionText,
    input.userReasonText,
    input.userReasonPreset,
    ...(input.keyConcepts ?? []),
    input.coreFormula,
    input.comparisonPoint,
    input.missingIssue,
    input.weakStructurePoint,
    input.weakApplicationSentence,
  ]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  return classifyTaxonomy({
    mode,
    subject: input.subjectLabel,
    text,
  });
}

function classifyTaxonomy(input: { mode: AppraisalMode; subject?: string; text: string }): TaxonomyClassificationResult {
  const candidates = searchTaxonomyCandidates({
    mode: input.mode,
    subject: input.subject,
    text: input.text,
  })
    .slice(0, 3)
    .map(normalizeTaxonomyCandidate);

  if (candidates.length === 0) {
    return {
      primary: null,
      candidates: [],
      classificationStatus: "needs_review",
      classificationConfidence: 0,
    };
  }

  const top = candidates[0];
  if (top.confidence < 0.45) {
    return {
      primary: null,
      candidates,
      classificationStatus: "needs_review",
      classificationConfidence: top.confidence,
    };
  }

  return {
    primary: top,
    candidates,
    classificationStatus: "ai_suggested",
    classificationConfidence: top.confidence,
  };
}

function toConfidence(score: number, matchCount: number): number {
  const normalizedScore = Math.min(1, score / 24);
  const normalizedMatch = Math.min(1, matchCount / 6);
  return Number((normalizedScore * 0.8 + normalizedMatch * 0.2).toFixed(2));
}

function resolveModeFromExamName(examName?: string): AppraisalMode {
  if (examName?.includes("2차")) {
    return "second";
  }
  return "first";
}
