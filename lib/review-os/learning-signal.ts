import type { AnswerReviewStructureDraft } from "@/lib/evaluate/answer-review-structure";
import { normalizeSubjectForMode, type AppraisalMode } from "@/lib/review-os/appraisal";
import type { LearningSignalEventInput } from "@/lib/review-os/types";

const MAX_TAGS = 6;
const MAX_FORMULAS = 4;

function sanitizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isLikelyRawContent(value: string) {
  if (value.length >= 320) return true;
  return /[.?!]\s+/.test(value) && value.length >= 160;
}

export function buildAnswerReviewLearningSignalInput(params: {
  examMode: AppraisalMode;
  subjectInput: string;
  answerSourceType: "file" | "text";
  normalizedDraft: AnswerReviewStructureDraft;
}): LearningSignalEventInput {
  const examMode = params.examMode === "second" ? "감정평가사 2차" : "감정평가사 1차";
  const subject = normalizeSubjectForMode(params.subjectInput, params.examMode);
  const derivedTags = [...params.normalizedDraft.coreConcepts, ...params.normalizedDraft.missingIssueCandidates]
    .map(sanitizeLine)
    .filter((value) => value.length > 0 && !isLikelyRawContent(value))
    .slice(0, MAX_TAGS);
  const relatedFormulas = params.normalizedDraft.coreConcepts
    .map(sanitizeLine)
    .filter((value) => value.length > 0 && /공식|산식|요건|절차/.test(value) && !isLikelyRawContent(value))
    .slice(0, MAX_FORMULAS);
  const nextTask = sanitizeLine(params.normalizedDraft.nextAction || params.normalizedDraft.rewriteDraftSuggestion);
  const nextTaskType = /다시|재작성|문단/.test(nextTask) ? "rewrite" : "review";
  return {
    examMode,
    subject,
    sourceType: params.answerSourceType,
    derivedTags,
    relatedFormulas,
    nextTaskType,
    nextTask,
    metadataJson: {
      structureVersion: "answer-review-v2",
      containsRawContent: false,
    },
  };
}
