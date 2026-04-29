const APPRAISAL_FIRST_SUBJECTS = ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"];
const APPRAISAL_SECOND_SUBJECTS = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"];

const MAX_TAGS = 6;
const MAX_FORMULAS = 4;

function sanitizeLine(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isLikelyRawContent(value) {
  if (value.length >= 320) return true;
  return /[.?!]\s+/.test(value) && value.length >= 160;
}

function normalizeSubjectForMode(subject, mode) {
  const allowed = mode === "second" ? APPRAISAL_SECOND_SUBJECTS : APPRAISAL_FIRST_SUBJECTS;
  return allowed.includes(subject) ? subject : allowed[0];
}

export function buildAnswerReviewLearningSignalInput(params) {
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
