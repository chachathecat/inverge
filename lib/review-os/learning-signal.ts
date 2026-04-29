import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import { normalizeSubjectForMode, type AppraisalMode } from "./appraisal";
import type { LearningSignalEventInput } from "./types";

const MAX_TAGS = 6;
const MAX_FORMULAS = 4;
const MIN_ANSWER_TEXT_LENGTH = 20;
const MIN_CONTEXT_TEXT_LENGTH = 10;
const PLACEHOLDER_PATTERN = /^(없음|n\/?a|na|null|미입력|미정|test|테스트|sample|샘플|asdf|qwer|1234+)$/i;
const FALLBACK_INDICATOR_PHRASES = [
  "입력하면",
  "직접 작성",
  "직접 확인",
  "분석하기에 충분하지",
  "파악할 수 없습니다",
  "추정 불가",
  "검토자가 확인",
  "검토자 확인",
] as const;

function sanitizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isLikelyRawContent(value: string) {
  if (value.length >= 320) return true;
  return /[.?!]\s+/.test(value) && value.length >= 160;
}

function normalizeCompact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isRepeatedGibberish(text: string) {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  if (compact.length < 8) return false;
  if (/^(.)\1{5,}$/.test(compact)) return true;
  if (/^(.{2,4})\1{2,}$/.test(compact)) return true;
  return false;
}

function isPlaceholderLike(text: string) {
  const compact = normalizeCompact(text);
  return PLACEHOLDER_PATTERN.test(compact) || isRepeatedGibberish(compact);
}

function isFallbackLikeText(text: string) {
  const compact = normalizeCompact(text);
  if (!compact) return true;
  return FALLBACK_INDICATOR_PHRASES.some((phrase) => compact.includes(phrase));
}

function isMostlyFallbackLike(items: string[]) {
  if (items.length === 0) return true;
  const fallbackCount = items.map(normalizeCompact).filter((item) => item.length === 0 || isFallbackLikeText(item)).length;
  return fallbackCount / items.length >= 0.6;
}

export function getAnswerReviewInputQualityIssue(params: {
  questionText: string;
  answerText: string;
  referenceText: string;
  questionFileCount: number;
  answerFileCount: number;
  referenceFileCount: number;
}): "answer_too_short" | "context_too_short" | "placeholder_like" | null {
  const question = normalizeCompact(params.questionText);
  const answer = normalizeCompact(params.answerText);
  const reference = normalizeCompact(params.referenceText);

  if (params.answerFileCount === 0 && answer.length < MIN_ANSWER_TEXT_LENGTH) return "answer_too_short";
  if (params.questionFileCount === 0 && params.referenceFileCount === 0) {
    if (question.length + reference.length < MIN_CONTEXT_TEXT_LENGTH) return "context_too_short";
  }
  if ([question, answer, reference].some((value) => value.length > 0 && isPlaceholderLike(value))) return "placeholder_like";
  return null;
}

export function shouldSkipLearningSignalSave(normalizedDraft: AnswerReviewStructureDraft): "insufficient_structure" | null {
  const weakTaxonomy = isMostlyFallbackLike(normalizedDraft.coreConcepts) && isMostlyFallbackLike(normalizedDraft.missingIssueCandidates);
  const hasConcreteTaxonomySignal = !weakTaxonomy;

  const nextAction = normalizeCompact(normalizedDraft.nextAction);
  const rewriteDraftSuggestion = normalizeCompact(normalizedDraft.rewriteDraftSuggestion);

  const nextActionFallbackLike = isFallbackLikeText(nextAction);
  const rewriteFallbackLike = isFallbackLikeText(rewriteDraftSuggestion);

  const bothFallbackLike = nextActionFallbackLike && rewriteFallbackLike;
  const bothTooShortOrEmpty = nextAction.length < 8 && rewriteDraftSuggestion.length < 12;
  const oneMissingOrFallbackWithoutTaxonomy =
    !hasConcreteTaxonomySignal && (nextActionFallbackLike || rewriteFallbackLike);

  const genericAction = bothFallbackLike || bothTooShortOrEmpty || oneMissingOrFallbackWithoutTaxonomy;

  const fallbackHeavy = weakTaxonomy && genericAction;

  if (fallbackHeavy) return "insufficient_structure";
  return null;
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
