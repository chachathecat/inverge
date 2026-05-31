import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import type { LearningSignalEventInput, LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "./types";

export const MODE_MIGRATION_CONFIRMATION_COPY = "1차 학습 기록은 보관되고, 오늘 계획은 2차 중심으로 전환됩니다.";
export const MODE_MIGRATION_SOURCE_TYPE = "first-to-second-mode-migration";

const LAW_SUBJECT_PATTERN = /민법|법규|보상법규|조문|요건|절차|판례|법리/;
const MAX_SAFE_LIST = 8;

type CountedSignal = { label: string; count: number };

type FirstModeMigrationInput = {
  firstItems: WrongAnswerItemRecord[];
  firstQueue: ReviewQueueCard[];
  firstLearningSignals: LearningSignalEventRecord[];
  migratedAt?: string;
};

export type FirstToSecondMigrationSnapshot = {
  structureVersion: "first-to-second-mode-migration-v1";
  archivedMode: "first";
  activeMode: "second";
  archivedTodayPlanQueueCount: number;
  preservedHistory: {
    firstOxAttempts: "preserved_in_first_mode";
    conceptCards: "preserved_in_first_mode";
    clozeReviewHistory: "preserved_in_first_mode";
    accountingEconomicsTemplateRetryHistory: "preserved_in_first_mode";
    weakSubjects: string[];
    legalCivilConceptCards: number;
  };
  carriedForward: {
    lawRelatedConceptCandidates: string[];
    repeatedWeakTopics: CountedSignal[];
    confidencePatterns: CountedSignal[];
    reviewStageSummaries: CountedSignal[];
  };
  containsRawContent: false;
  migratedAt: string;
};

function normalizeLabel(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safeShortLabel(value: unknown) {
  const normalized = normalizeLabel(value);
  if (!normalized || normalized.length > 80) return "";
  return normalized;
}

function increment(counts: Map<string, number>, label: string) {
  if (!label) return;
  counts.set(label, (counts.get(label) ?? 0) + 1);
}

function toTopCounts(counts: Map<string, number>, limit = MAX_SAFE_LIST): CountedSignal[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getConceptCandidateFromItem(item: WrongAnswerItemRecord) {
  return safeShortLabel(
    item.conceptCard?.concept_candidate ??
      item.conceptCard?.topic_candidate ??
      item.derivedPayload?.conceptCandidate ??
      item.derivedPayload?.concept_candidate ??
      item.derivedPayload?.topicCandidate ??
      item.derivedPayload?.topic_candidate,
  );
}

function getReviewStageFromItem(item: WrongAnswerItemRecord) {
  return safeShortLabel(item.conceptCard?.reviewStage ?? item.derivedPayload?.reviewStage ?? item.derivedPayload?.review_stage);
}

function isLawRelated(subject: string, candidate = "") {
  return LAW_SUBJECT_PATTERN.test(`${subject} ${candidate}`);
}

export function buildFirstToSecondMigrationSnapshot({
  firstItems,
  firstQueue,
  firstLearningSignals,
  migratedAt = new Date().toISOString(),
}: FirstModeMigrationInput): FirstToSecondMigrationSnapshot {
  const weakSubjects = new Map<string, number>();
  const weakTopics = new Map<string, number>();
  const confidencePatterns = new Map<string, number>();
  const reviewStages = new Map<string, number>();
  const lawConcepts = new Map<string, number>();
  let legalCivilConceptCards = 0;

  for (const item of firstItems) {
    if (item.examName !== "감정평가사 1차") continue;
    increment(weakSubjects, item.subjectLabel);
    increment(confidencePatterns, item.confidence);

    const conceptCandidate = getConceptCandidateFromItem(item);
    if (conceptCandidate) increment(weakTopics, `${item.subjectLabel} · ${conceptCandidate}`);

    const reviewStage = getReviewStageFromItem(item);
    if (reviewStage) increment(reviewStages, reviewStage);

    if (item.conceptCard && isLawRelated(item.subjectLabel, conceptCandidate)) {
      legalCivilConceptCards += 1;
      if (conceptCandidate) increment(lawConcepts, conceptCandidate);
    }
  }

  for (const queueItem of firstQueue) {
    if (queueItem.examName !== "감정평가사 1차") continue;
    increment(weakSubjects, queueItem.subjectLabel);
    increment(weakTopics, `${queueItem.subjectLabel} · ${queueItem.mistakeType}`);
    increment(confidencePatterns, queueItem.confidence);
    if (queueItem.conceptCard?.reviewStage) increment(reviewStages, queueItem.conceptCard.reviewStage);
    const candidate = safeShortLabel(queueItem.conceptCard?.concept_candidate ?? queueItem.conceptCard?.topic_candidate ?? queueItem.topicTag);
    if (queueItem.conceptCard && isLawRelated(queueItem.subjectLabel, candidate)) {
      legalCivilConceptCards += 1;
      if (candidate) increment(lawConcepts, candidate);
    }
  }

  for (const signal of firstLearningSignals) {
    if (signal.examMode !== "감정평가사 1차") continue;
    increment(weakSubjects, signal.subject);
    for (const tag of signal.derivedTags) {
      const safeTag = safeShortLabel(tag);
      if (!safeTag) continue;
      increment(weakTopics, `${signal.subject} · ${safeTag}`);
      if (isLawRelated(signal.subject, safeTag)) increment(lawConcepts, safeTag);
    }
    const metadata = signal.metadataJson ?? {};
    const conceptCandidate = safeShortLabel(metadata.conceptCandidate ?? metadata.concept_candidate ?? metadata.topicCandidate ?? metadata.topic_candidate);
    if (conceptCandidate && isLawRelated(signal.subject, conceptCandidate)) increment(lawConcepts, conceptCandidate);
    const reviewStage = safeShortLabel(metadata.reviewStage ?? metadata.review_stage);
    if (reviewStage) increment(reviewStages, reviewStage);
    const confidence = safeShortLabel(metadata.confidenceBucket ?? metadata.confidence);
    if (confidence) increment(confidencePatterns, confidence);
  }

  const snapshot: FirstToSecondMigrationSnapshot = {
    structureVersion: "first-to-second-mode-migration-v1",
    archivedMode: "first",
    activeMode: "second",
    archivedTodayPlanQueueCount: firstQueue.filter((item) => item.examName === "감정평가사 1차").length,
    preservedHistory: {
      firstOxAttempts: "preserved_in_first_mode",
      conceptCards: "preserved_in_first_mode",
      clozeReviewHistory: "preserved_in_first_mode",
      accountingEconomicsTemplateRetryHistory: "preserved_in_first_mode",
      weakSubjects: toTopCounts(weakSubjects).map((item) => item.label),
      legalCivilConceptCards,
    },
    carriedForward: {
      lawRelatedConceptCandidates: toTopCounts(lawConcepts).map((item) => item.label),
      repeatedWeakTopics: toTopCounts(weakTopics).filter((item) => item.count >= 2).slice(0, 5),
      confidencePatterns: toTopCounts(confidencePatterns, 4),
      reviewStageSummaries: toTopCounts(reviewStages, 5),
    },
    containsRawContent: false,
    migratedAt,
  };

  const sanitized = sanitizeDerivedMetadata(snapshot);
  assertNoRawUserDataInDerived(sanitized);
  return sanitized;
}

export function buildSecondModeMigrationLearningSignal(snapshot: FirstToSecondMigrationSnapshot): LearningSignalEventInput {
  const topTopic = snapshot.carriedForward.repeatedWeakTopics[0]?.label ?? snapshot.carriedForward.lawRelatedConceptCandidates[0] ?? "2차 답안 구조 전환";
  const input: LearningSignalEventInput = {
    examMode: "감정평가사 2차",
    subject: "감정평가 및 보상법규",
    sourceType: MODE_MIGRATION_SOURCE_TYPE,
    derivedTags: [topTopic, ...snapshot.carriedForward.lawRelatedConceptCandidates].slice(0, 6),
    relatedFormulas: [],
    nextTaskType: "second_answer_rewrite",
    nextTask: "2차 쟁점 1개를 떠올리고 문단 1개를 다시 씁니다.",
    metadataJson: snapshot,
  };
  assertNoRawUserDataInDerived(input.metadataJson);
  return input;
}
