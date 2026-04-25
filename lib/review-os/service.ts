import "server-only";

import { consumeRateLimit } from "@/lib/rate-limit";
import { generateWrongAnswerArtifacts } from "@/lib/review-os/ai";
import {
  getModeConfig,
  getModeLabel,
  normalizePreferredSubjectsForMode,
  normalizeSubjectForMode,
  resolveAppraisalMode,
} from "@/lib/review-os/appraisal";
import { getEntitlementLimit } from "@/lib/review-os/entitlements";
import { reviewOsRepository } from "@/lib/review-os/repository";
import type {
  AccessState,
  AdminAlphaFeed,
  FeedbackItemInput,
  ReviewQueueCard,
  StudyProfile,
  TodayFocus,
  UsageSummary,
  WeeklyLearningSummaryRecord,
  WrongAnswerDetail,
  WrongAnswerItemInput,
  WrongAnswerItemRecord,
} from "@/lib/review-os/types";

const globalCache = globalThis as typeof globalThis & {
  __reviewOsGenerationLocks?: Map<string, boolean>;
};

function getGenerationLockStore() {
  if (!globalCache.__reviewOsGenerationLocks) {
    globalCache.__reviewOsGenerationLocks = new Map();
  }
  return globalCache.__reviewOsGenerationLocks;
}

function getMonthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getWeekKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function rankQueueItem(item: {
  recurrenceCount: number;
  confidence: string;
  timeSpentSeconds: number | null;
  createdAt?: string;
}) {
  const confidenceScore = item.confidence === "낮음" ? 16 : item.confidence === "중간" ? 8 : 0;
  const recurrenceScore = Math.min(item.recurrenceCount, 5) * 18;
  const timeScore =
    item.timeSpentSeconds && item.timeSpentSeconds >= 180
      ? 12
      : item.timeSpentSeconds && item.timeSpentSeconds >= 90
        ? 6
        : 0;
  const recencyScore = item.createdAt
    ? Math.max(0, 20 - Math.floor((Date.now() - Date.parse(item.createdAt)) / 86_400_000) * 4)
    : 0;
  return recurrenceScore + confidenceScore + timeScore + recencyScore + 20;
}

function getReviewReason(item: {
  recurrenceCount: number;
  confidence: string;
  timeSpentSeconds: number | null;
  mistakeType: string;
}) {
  if (item.recurrenceCount >= 3) return "같은 유형이 세 번 이상 반복된 항목입니다.";
  if (item.confidence === "낮음") return "확신 없이 맞히거나 틀린 항목이라 다시 볼 가치가 있습니다.";
  if (item.timeSpentSeconds && item.timeSpentSeconds >= 180) {
    return "시간이 오래 걸린 항목입니다. 정확도와 처리 순서를 함께 봐야 합니다.";
  }
  return `${item.mistakeType} 흐름을 다시 확인해야 합니다.`;
}

function getFocusMode(queue: ReviewQueueCard[], recentItems: WrongAnswerItemRecord[]) {
  return queue[0]?.examName === "감정평가사 2차" || recentItems[0]?.examName === "감정평가사 2차"
    ? "second"
    : "first";
}

function makeTodayFocus(queue: ReviewQueueCard[], recentItems: WrongAnswerItemRecord[]): TodayFocus {
  const top = queue[0];
  const mode = getFocusMode(queue, recentItems);
  const topMistake = top?.mistakeType ?? "반복 실수";
  const topTopic = top?.topicTag ?? recentItems[0]?.subjectLabel ?? (mode === "second" ? "최근 답안" : "최근 오답");
  const staleCount = queue.filter((item) => Date.now() - Date.parse(item.dueAt) > 2 * 86_400_000).length;

  const lines: [string, string, string] = [
    top
      ? mode === "second"
        ? `오늘은 ${top.subjectLabel} 답안의 ${topTopic}부터 보강하세요.`
        : `오늘은 ${top.subjectLabel} ${topTopic}부터 다시 보세요.`
      : mode === "second"
        ? "2차 답안 한 건을 넣고 기준 답안과 비교해 보세요."
        : "민법 오답 1개를 먼저 기록해 오늘 볼 항목을 만드세요.",
    mode === "second" ? `먼저 볼 보강 지점은 ${topMistake}입니다.` : `오늘 줄일 실수는 ${topMistake}입니다.`,
    staleCount > 0
      ? `밀린 다시 볼 항목 ${staleCount}개를 오늘 안에 한 번만 정리하세요.`
      : mode === "second"
        ? "오늘은 전체 답안보다 누락 논점 1개만 고치는 것이 우선입니다."
        : "오늘은 새 문제보다 이미 틀린 항목 1개를 먼저 고정하세요.",
  ];

  return {
    lines,
    nextAction: top
      ? mode === "second"
        ? `${top.problemTitle}에서 빠진 논점 1개만 표시하고 8~10줄로 다시 써 보세요.`
        : `${top.problemTitle}을 다시 풀고, 놓친 조건 1개만 메모하세요.`
      : mode === "second"
        ? "2차 답안 한 건을 입력하고 compare 흐름을 시작하세요."
        : "민법 오답 1개를 입력하고 첫 review queue를 만드세요.",
    nextActionType: top ? "review_now" : "capture_now",
    queue,
  };
}

function makeWeeklySummaryText(topMistakes: string[], topTopics: string[], slowCount: number, lowConfidenceCount: number) {
  const focusMistake = topMistakes[0] ?? "반복 실수";
  const focusTopic = topTopics[0] ?? "최근 항목";
  const first = `이번 주 감평 학습에서 ${focusMistake}이 가장 자주 반복되었습니다.`;
  const second = `${focusTopic} 관련 항목을 먼저 다시 보고, 새 범위 확장보다 같은 실수를 줄이는 쪽이 우선입니다.`;
  const third =
    slowCount > lowConfidenceCount
      ? "시간이 오래 걸린 항목은 풀이 순서를 줄이는 연습으로 다시 보세요."
      : "확신이 낮았던 항목은 근거 문장부터 다시 고정하세요.";
  return [first, second, third].join(" ");
}

export class ReviewOsUsageLimitError extends Error {
  constructor() {
    super("review-os-usage-limit");
  }
}

export class ReviewOsBurstLimitError extends Error {
  constructor() {
    super("review-os-burst-limit");
  }
}

export class ReviewOsConcurrentGenerationError extends Error {
  constructor() {
    super("review-os-concurrent-generation");
  }
}

export class ReviewOsInviteRequiredError extends Error {
  constructor() {
    super("review-os-invite-required");
  }
}

export class ReviewOsService {
  async ensureAccess(userId: string, email: string | null): Promise<AccessState> {
    const access = await reviewOsRepository.ensureAccess(userId, email);
    if (!access.allowed) throw new ReviewOsInviteRequiredError();
    return access;
  }

  getStudyProfile(userId: string) {
    return reviewOsRepository.getStudyProfile(userId);
  }

  async upsertStudyProfile(
    userId: string,
    email: string | null,
    input: Omit<StudyProfile, "userId" | "createdAt" | "updatedAt">,
  ) {
    await this.ensureAccess(userId, email);
    const mode = resolveAppraisalMode(null, input.examName);
    const normalizedInput = {
      ...input,
      examName: getModeLabel(mode),
      preferredSubjects: normalizePreferredSubjectsForMode(input.preferredSubjects, mode),
    }
    const profile = await reviewOsRepository.upsertStudyProfile(userId, normalizedInput);
    await reviewOsRepository.logUsageEvent(userId, "profile_create", "study_profile", userId, {
      examName: normalizedInput.examName,
      preferredSubjects: normalizedInput.preferredSubjects,
    });
    return profile;
  }

  async getUsageSummary(userId: string, email: string | null): Promise<UsageSummary> {
    const access = await this.ensureAccess(userId, email);
    const tier = access.entitlementTier;
    const limits = getEntitlementLimit(tier);
    const monthlyUsed = await reviewOsRepository.countMonthlyWrongAnswers(userId, getMonthStartIso());
    return {
      tier,
      monthlyLimit: limits.monthlyWrongAnswers,
      monthlyUsed,
      remaining: Math.max(0, limits.monthlyWrongAnswers - monthlyUsed),
      burstBlocked: false,
    };
  }

  async createWrongAnswerItem(userId: string, email: string | null, input: WrongAnswerItemInput) {
    await this.ensureAccess(userId, email);
    const mode = resolveAppraisalMode(null, input.examName);
    const config = getModeConfig(mode);
    const normalizedInput: WrongAnswerItemInput = {
      ...input,
      examName: getModeLabel(mode),
      subjectLabel: normalizeSubjectForMode(input.subjectLabel, mode),
    };

    const rate = consumeRateLimit(`review-os:${userId}`);
    if (!rate.allowed) throw new ReviewOsBurstLimitError();

    const usage = await this.getUsageSummary(userId, email);
    if (usage.remaining <= 0) throw new ReviewOsUsageLimitError();

    const dedupeKey = reviewOsRepository.createDedupeKey(userId, normalizedInput);
    const existing = await reviewOsRepository.findExistingByDedupe(userId, dedupeKey);
    if (existing) return { item: existing, deduped: true };

    const locks = getGenerationLockStore();
    if (locks.get(userId)) throw new ReviewOsConcurrentGenerationError();
    locks.set(userId, true);

    try {
      const artifacts = await generateWrongAnswerArtifacts(normalizedInput);
      const recurrence = await reviewOsRepository.upsertRecurrenceFeature(userId, {
        examName: normalizedInput.examName,
        subjectLabel: normalizedInput.subjectLabel,
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
      });

      const item = await reviewOsRepository.insertWrongAnswerItem(
        userId,
        normalizedInput,
        {
          captureMethod: input.sourceType,
          nextReviewDate: input.nextReviewDate ?? null,
          raw_ocr_text: input.extractionPayload?.raw_ocr_text ?? input.rawQuestionText ?? null,
          raw_extraction_json: input.extractionPayload?.raw_extraction_json ?? {},
          normalized_draft: input.extractionPayload?.normalized_draft ?? null,
          user_confirmed_fields: input.extractionPayload?.user_confirmed_fields ?? {
            subjectLabel: normalizedInput.subjectLabel,
            correctAnswer: normalizedInput.correctAnswer,
            userAnswer: normalizedInput.userAnswer,
            userReasonText: normalizedInput.userReasonText ?? null,
            userReasonPreset: normalizedInput.userReasonPreset ?? null,
            nextReviewDate: input.nextReviewDate ?? null,
          },
          mode,
          artifactType: config.artifactType,
          noteKind: config.noteKind,
          subjectLabel: normalizedInput.subjectLabel,
          aiDraft: {
            keyConcepts: input.keyConcepts ?? [],
            coreFormula: input.coreFormula ?? null,
            comparisonPoint: input.comparisonPoint ?? null,
            missingIssue: input.missingIssue ?? null,
            weakStructurePoint: input.weakStructurePoint ?? null,
            weakApplicationSentence: input.weakApplicationSentence ?? null,
            rewriteInstruction: input.rewriteInstruction ?? null,
            referenceStructure: input.referenceStructure ?? null,
            myAnswerSummary: input.myAnswerSummary ?? null,
            caseSummary: input.caseSummary ?? null,
          },
        },
        {
          topicTag: artifacts.tags.topicTag,
          mistakeType: artifacts.tags.mistakeType,
          recurrenceCount: recurrence?.recurrenceCount ?? 1,
        },
      );

      if (!item) throw new Error("review-os-item-missing-after-insert");

      await reviewOsRepository.insertWrongAnswerNote(userId, item.id, artifacts.note);
      await reviewOsRepository.insertWrongAnswerTag(userId, item.id, artifacts.tags);

      const priorityScore = rankQueueItem({
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        confidence: item.confidence,
        timeSpentSeconds: item.timeSpentSeconds ?? null,
        createdAt: item.createdAt,
      });
      const reviewReason = getReviewReason({
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        confidence: item.confidence,
        timeSpentSeconds: item.timeSpentSeconds ?? null,
        mistakeType: artifacts.tags.mistakeType,
      });

      await reviewOsRepository.insertReviewQueueEntry(userId, item, reviewReason, priorityScore, new Date().toISOString(), {
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
      });

      await reviewOsRepository.logUsageEvent(userId, "wrong_answer_create", "wrong_answer_item", item.id, {
        examName: item.examName,
        subjectLabel: item.subjectLabel,
      });
      await reviewOsRepository.logUsageEvent(userId, "ai_note_generate", "wrong_answer_item", item.id, {
        generationSource: artifacts.note.generationSource,
      });
      await reviewOsRepository.logUsageEvent(userId, "tag_generate", "wrong_answer_item", item.id, {
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
      });

      return { item, deduped: false };
    } finally {
      locks.delete(userId);
    }
  }

  listWrongAnswerItems(userId: string, email: string | null, limit = 20) {
    return this.ensureAccess(userId, email).then(() => reviewOsRepository.listWrongAnswerItems(userId, limit));
  }

  getWrongAnswerDetail(userId: string, email: string | null, itemId: string): Promise<WrongAnswerDetail | null> {
    return this.ensureAccess(userId, email).then(() => reviewOsRepository.getWrongAnswerDetail(userId, itemId));
  }

  async getReviewQueue(userId: string, email: string | null) {
    await this.ensureAccess(userId, email);
    const queue = await reviewOsRepository.listReviewQueue(userId, 10);
    await reviewOsRepository.logUsageEvent(userId, "review_queue_view", "review_queue", null, { itemCount: queue.length });
    return queue;
  }

  async completeReview(userId: string, email: string | null, queueId: string) {
    await this.ensureAccess(userId, email);
    await reviewOsRepository.completeReviewQueueItem(userId, queueId);
    await reviewOsRepository.logUsageEvent(userId, "review_complete", "review_queue_item", queueId, {});
  }

  async getTodayFocus(userId: string, email: string | null): Promise<TodayFocus> {
    await this.ensureAccess(userId, email);
    const [queue, recentItems] = await Promise.all([
      reviewOsRepository.listReviewQueue(userId, 5),
      reviewOsRepository.listWrongAnswerItems(userId, 8),
    ]);
    const focus = makeTodayFocus(queue, recentItems);
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "today_focus",
      seedType: "summary",
      priorityScore: queue[0]?.priorityScore ?? 0,
      renderedText: focus.lines.join(" "),
      rawPayload: { lines: focus.lines, nextAction: focus.nextAction },
    });
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "next_action",
      seedType: "action",
      priorityScore: queue[0]?.priorityScore ?? 0,
      renderedText: focus.nextAction,
      rawPayload: { nextActionType: focus.nextActionType },
    });
    await reviewOsRepository.logUsageEvent(userId, "today_focus_view", "today_focus", null, { queueCount: queue.length });
    return focus;
  }

  async getWeeklySummary(userId: string, email: string | null): Promise<WeeklyLearningSummaryRecord | null> {
    await this.ensureAccess(userId, email);
    const weekKey = getWeekKey();
    const existing = await reviewOsRepository.getWeeklySummary(userId, weekKey);
    if (existing) {
      await reviewOsRepository.logUsageEvent(userId, "weekly_summary_view", "weekly_summary", existing.id, { weekKey });
      return existing;
    }

    const items = await reviewOsRepository.listWrongAnswerItems(userId, 50);
    const recentWeekItems = items.filter((item) => Date.now() - Date.parse(item.createdAt) <= 7 * 86_400_000);
    if (recentWeekItems.length === 0) return null;

    const details = await Promise.all(
      recentWeekItems.slice(0, 20).map((item) => reviewOsRepository.getWrongAnswerDetail(userId, item.id)),
    );
    const tags = details.flatMap((detail) => (detail?.tags[0] ? [detail.tags[0]] : []));
    const tagCounts = new Map<string, number>();
    const topicCounts = new Map<string, number>();
    tags.forEach((tag) => {
      tagCounts.set(tag.mistakeType, (tagCounts.get(tag.mistakeType) ?? 0) + 1);
      topicCounts.set(tag.topicTag, (topicCounts.get(tag.topicTag) ?? 0) + 1);
    });
    const topMistakeTypes = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    const topTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    const slowCount = recentWeekItems.filter((item) => (item.timeSpentSeconds ?? 0) >= 180).length;
    const lowConfidenceCount = recentWeekItems.filter((item) => item.confidence === "낮음").length;
    const nextWeekFocus = [
      topMistakeTypes[0] ? `${topMistakeTypes[0]}부터 다시 정리하기` : "반복 실수부터 다시 정리하기",
      topTopics[0] ? `${topTopics[0]} 관련 항목 먼저 보기` : "최근 항목 먼저 보기",
      slowCount > 0 ? "시간이 오래 걸린 문제의 풀이 순서 줄이기" : "확신 낮은 항목의 근거 문장 다시 보기",
    ];
    const summaryText = makeWeeklySummaryText(topMistakeTypes, topTopics, slowCount, lowConfidenceCount);
    const summary = await reviewOsRepository.upsertWeeklySummary(
      userId,
      weekKey,
      summaryText,
      topMistakeTypes,
      topTopics,
      nextWeekFocus,
    );
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "weekly_focus",
      seedType: "summary",
      priorityScore: 50,
      renderedText: summary?.summaryText ?? summaryText,
      rawPayload: { topMistakeTypes, topTopics, nextWeekFocus },
    });
    await reviewOsRepository.logUsageEvent(userId, "weekly_summary_view", "weekly_summary", summary?.id ?? null, { weekKey });
    return summary;
  }

  async submitFeedback(userId: string, email: string | null, input: FeedbackItemInput) {
    await this.ensureAccess(userId, email);
    await reviewOsRepository.createFeedback(userId, input);
    await reviewOsRepository.logUsageEvent(userId, "feedback_submit", "feedback_item", null, { route: input.route });
  }

  getAdminFeed(): Promise<AdminAlphaFeed> {
    return reviewOsRepository.getAdminAlphaFeed(80);
  }
}

export const reviewOsService = new ReviewOsService();
