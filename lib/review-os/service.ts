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
import { resolveReviewSchedule, resolveScheduleOverrideDate } from "@/lib/review-os/scheduling";
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
  ReviewCompletionAction,
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

type TodayPriorityPlan = {
  queueItem: ReviewQueueCard | null;
  score: number;
  reason: string;
  estimatedDurationMinutes: number;
  nextActionType: TodayFocus["nextActionType"];
};

function getFocusMode(queue: ReviewQueueCard[], recentItems: WrongAnswerItemRecord[]) {
  const source = [...queue.map((item) => item.examName), ...recentItems.map((item) => item.examName)];
  return source.find((name) => name === "감정평가사 2차") ? "second" : "first";
}

function getDueScore(dueAt: string, now = new Date()) {
  const diff = now.getTime() - Date.parse(dueAt);
  const overdueDays = Math.max(0, Math.floor(diff / 86_400_000));
  if (diff >= 0) {
    return 36 + Math.min(4, overdueDays) * 10;
  }
  if (Math.abs(diff) <= 24 * 60 * 60 * 1000) {
    return 18;
  }
  return 4;
}

function getConfidenceScore(confidence: string) {
  if (confidence === "낮음") return 16;
  if (confidence === "중간") return 8;
  return 2;
}

function getTimeInstabilityScore(timeSpentSeconds: number | null) {
  if (!timeSpentSeconds) return 0;
  if (timeSpentSeconds >= 240) return 12;
  if (timeSpentSeconds >= 150) return 8;
  if (timeSpentSeconds <= 45) return 4;
  return 2;
}

function getMistakeTypeScore(mistakeType: string) {
  if (/누락|구조|논점|문단|적용/.test(mistakeType)) return 10;
  if (/계산|조건|개념|시간/.test(mistakeType)) return 7;
  return 4;
}

function resolveNextActionType(item: ReviewQueueCard, mode: "first" | "second"): TodayFocus["nextActionType"] {
  const rewriteSignal = /rewrite|재작성|문단/.test(item.reviewReason) || /구조|문단|논점 누락/.test(item.mistakeType);
  if (mode === "second" && rewriteSignal) return "rewrite_now";
  if (mode === "first" && /재시도|retry/.test(item.reviewReason)) return "retry_now";
  return "review_now";
}

function buildTodayPriorityPlan(
  queue: ReviewQueueCard[],
  mode: "first" | "second",
  now = new Date(),
): TodayPriorityPlan {
  if (queue.length === 0) {
    return {
      queueItem: null,
      score: 0,
      reason: "오늘은 이 작업 하나만 먼저 합니다.",
      estimatedDurationMinutes: 20,
      nextActionType: "capture_now",
    };
  }

  const scored = queue.map((item) => {
    const recurrenceScore = Math.min(item.recurrenceCount, 5) * 10;
    const dueScore = getDueScore(item.dueAt, now);
    const confidenceScore = getConfidenceScore(item.confidence);
    const instabilityScore = getTimeInstabilityScore(item.timeSpentSeconds);
    const mistakeScore = getMistakeTypeScore(item.mistakeType);
    const nextActionType = resolveNextActionType(item, mode);
    const rewriteRetryUrgency = nextActionType === "rewrite_now" || nextActionType === "retry_now" ? 14 : 0;
    const modeScore = mode === "second" && nextActionType === "rewrite_now" ? 8 : 4;
    const score =
      dueScore +
      recurrenceScore +
      confidenceScore +
      instabilityScore +
      mistakeScore +
      rewriteRetryUrgency +
      modeScore;
    return { item, score, nextActionType };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dueDiff = Date.parse(a.item.dueAt) - Date.parse(b.item.dueAt);
    if (dueDiff !== 0) return dueDiff;
    return a.item.queueId.localeCompare(b.item.queueId);
  });

  const top = scored[0];
  const reason = top.item.recurrenceCount >= 3
    ? "최근 반복된 실수라 먼저 확인합니다."
    : top.nextActionType === "rewrite_now"
      ? "문단 다시쓰기 후속 확인이 필요합니다."
      : Date.parse(top.item.dueAt) <= now.getTime()
        ? "예정된 복습 시점이 도래했습니다."
        : "오늘은 이 작업 하나만 먼저 합니다.";
  const estimatedDurationMinutes = Math.max(
    mode === "second" ? 18 : 12,
    Math.min(35, Math.round(((top.item.timeSpentSeconds ?? (mode === "second" ? 22 * 60 : 15 * 60)) * 0.8) / 60)),
  );

  return {
    queueItem: top.item,
    score: top.score,
    reason,
    estimatedDurationMinutes,
    nextActionType: top.nextActionType,
  };
}

function makeTodayFocus(
  queue: ReviewQueueCard[],
  recentItems: WrongAnswerItemRecord[],
  preferredMode?: "first" | "second",
): TodayFocus {
  const mode = preferredMode ?? getFocusMode(queue, recentItems);
  const priority = buildTodayPriorityPlan(queue, mode);
  const top = priority.queueItem;
  const topMistake = top?.mistakeType ?? "반복 실수";
  const staleCount = queue.filter((item) => Date.now() - Date.parse(item.dueAt) > 2 * 86_400_000).length;
  const mistakeLine = mode === "second" ? `먼저 볼 보강 지점은 ${topMistake}입니다.` : `오늘 줄일 실수는 ${topMistake}입니다.`;
  const staleLine =
    staleCount > 0 ? `밀린 다시 볼 항목 ${staleCount}개 중 1개만 먼저 처리합니다.` : "한 번에 하나씩 실행하고 다음 항목으로 넘어갑니다.";
  const primaryTaskLabel = top
    ? mode === "second"
      ? `${top.subjectLabel} 문단 보강`
      : `${top.subjectLabel} 재시도 점검`
    : mode === "second"
      ? "2차 답안 1건 입력"
      : "1차 오답 1건 기록";

  const lines: [string, string, string] = [
    "오늘은 이 작업 하나만 먼저 합니다.",
    priority.reason,
    `${mistakeLine} ${staleLine}`,
  ];

  return {
    lines,
    nextAction: top
      ? mode === "second"
        ? `${top.problemTitle}에서 빠진 논점 1개를 표시하고 짧게 다시 작성하세요.`
        : `${top.problemTitle}을 다시 풀고, 놓친 조건 1개만 메모하세요.`
      : mode === "second"
        ? "2차 답안 한 건을 입력하고 compare 흐름을 시작하세요."
        : "오답 1개를 입력하고 첫 review queue를 만드세요.",
    nextActionType: priority.nextActionType,
    primaryTaskLabel,
    reason: priority.reason,
    estimatedDurationMinutes: priority.estimatedDurationMinutes,
    priorityScore: priority.score,
    sourceQueueId: top?.queueId ?? null,
    sourceItemId: top?.itemId ?? null,
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

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMeaningfulAnswer(value: string) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return null;
  if (normalized === "-" || normalized === "–" || normalized === "—") return null;
  return normalized;
}

function isMeaningfullyCorrectAnswer(correctAnswer: string, userAnswer: string) {
  const normalizedCorrectAnswer = normalizeMeaningfulAnswer(correctAnswer);
  const normalizedUserAnswer = normalizeMeaningfulAnswer(userAnswer);
  return Boolean(normalizedCorrectAnswer && normalizedUserAnswer && normalizedCorrectAnswer === normalizedUserAnswer);
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

export class ReviewOsInvalidCompletionActionError extends Error {
  constructor() {
    super("review-os-invalid-completion-action");
  }
}

export class ReviewOsService {
  private resolveFollowUpDueAtFromAction(
    action: ReviewCompletionAction,
    examName: string,
    existingNextReviewDate: string | null,
    now = new Date(),
  ) {
    const addDays = (days: number) => {
      const next = new Date(now);
      next.setUTCDate(next.getUTCDate() + days);
      return next.toISOString();
    };

    if (action === "first_short_retry") return addDays(2);
    if (action === "first_confirm_recall") return addDays(3);
    if (action === "second_paragraph_rewrite") return addDays(2);

    if (existingNextReviewDate) {
      return resolveScheduleOverrideDate(existingNextReviewDate, addDays(examName === "감정평가사 2차" ? 2 : 3));
    }

    return addDays(examName === "감정평가사 2차" ? 2 : 3);
  }

  private getCompletionReviewReason(action: ReviewCompletionAction, examName: string) {
    if (action === "first_short_retry") return "짧은 재시도를 완료한 뒤 2일 후 다시 확인합니다.";
    if (action === "first_confirm_recall") return "근거 회상을 확인했고 3일 후 다시 점검합니다.";
    if (action === "second_paragraph_rewrite") return "문단 재작성을 진행했고 2일 후 다시 보강합니다.";
    return examName === "감정평가사 2차"
      ? "예약된 재작성 일정을 유지해 다시 보강합니다."
      : "예약된 복습 일정을 유지해 같은 실수를 줄입니다.";
  }

  private isCompletionActionCompatible(examName: string, action: ReviewCompletionAction) {
    if (examName === "감정평가사 2차") {
      return action === "second_paragraph_rewrite" || action === "second_keep_scheduled_rewrite";
    }
    return (
      action === "first_short_retry" ||
      action === "first_confirm_recall" ||
      action === "first_keep_scheduled_review"
    );
  }

  private readPreservedNextReviewDate(
    context: Awaited<ReturnType<typeof reviewOsRepository.getReviewQueueItemContext>>,
  ) {
    if (!context) return null;

    const itemRawPayload =
      typeof context.item.rawPayload === "object" && context.item.rawPayload
        ? (context.item.rawPayload as Record<string, unknown>)
        : null;
    const queueRawPayload =
      typeof context.queueRow.raw_payload === "object" && context.queueRow.raw_payload
        ? (context.queueRow.raw_payload as Record<string, unknown>)
        : null;
    const userConfirmedFields =
      itemRawPayload?.user_confirmed_fields &&
      typeof itemRawPayload.user_confirmed_fields === "object"
        ? (itemRawPayload.user_confirmed_fields as Record<string, unknown>)
        : null;
    const normalizedDraft =
      itemRawPayload?.normalized_draft && typeof itemRawPayload.normalized_draft === "object"
        ? (itemRawPayload.normalized_draft as Record<string, unknown>)
        : null;

    const candidates = [
      context.item.nextReviewDate,
      typeof itemRawPayload?.nextReviewDate === "string" ? itemRawPayload.nextReviewDate : null,
      typeof normalizedDraft?.nextReviewDate === "string" ? normalizedDraft.nextReviewDate : null,
      typeof userConfirmedFields?.nextReviewDate === "string" ? userConfirmedFields.nextReviewDate : null,
      typeof queueRawPayload?.dueAt === "string" ? queueRawPayload.dueAt : null,
    ];
    return candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0) ?? null;
  }

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
      const schedule = resolveReviewSchedule({
        mode,
        isCorrect: isMeaningfullyCorrectAnswer(normalizedInput.correctAnswer, normalizedInput.userAnswer),
        confidence: normalizedInput.confidence,
        mistakeType: artifacts.tags.mistakeType,
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        hasWeakParagraph: mode === "second" && Boolean(normalizedInput.weakStructurePoint || normalizedInput.missingIssue),
      });
      const effectiveNextReviewDate = input.nextReviewDate ?? schedule.nextReviewDate;
      const queueDueAt = schedule.retryDueAt ?? resolveScheduleOverrideDate(effectiveNextReviewDate, schedule.reviewDueAt);

      const item = await reviewOsRepository.insertWrongAnswerItem(
        userId,
        normalizedInput,
        {
          captureMethod: input.sourceType,
          nextReviewDate: effectiveNextReviewDate,
          raw_ocr_text: input.extractionPayload?.raw_ocr_text ?? input.rawQuestionText ?? null,
          raw_extraction_json: input.extractionPayload?.raw_extraction_json ?? {},
          normalized_draft: input.extractionPayload?.normalized_draft ?? null,
          user_confirmed_fields: input.extractionPayload?.user_confirmed_fields ?? {
            subjectLabel: normalizedInput.subjectLabel,
            correctAnswer: normalizedInput.correctAnswer,
            userAnswer: normalizedInput.userAnswer,
            userReasonText: normalizedInput.userReasonText ?? null,
            userReasonPreset: normalizedInput.userReasonPreset ?? null,
            nextReviewDate: effectiveNextReviewDate,
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
          rewrite_source_item_id: input.rewriteSourceItemId ?? null,
          rewrite_source_gap: input.rewriteSourceGap ?? null,
          rewrite_instruction: input.rewriteInstruction ?? null,
          rewrite_completed: input.rewriteCompleted ?? null,
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

      await reviewOsRepository.insertReviewQueueEntry(userId, item, reviewReason, priorityScore, queueDueAt, {
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        schedulingPolicy: schedule.policy,
        retryDueAt: schedule.retryDueAt,
        followUpReviewAt: schedule.followUpReviewAt,
        nextReviewDate: effectiveNextReviewDate,
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
      if (mode === "second" && input.rewriteSourceItemId) {
        await reviewOsRepository.logUsageEvent(userId, "second_stage_rewrite_completed", "wrong_answer_item", item.id, {
          rewrite_source_item_id: input.rewriteSourceItemId,
          rewrite_source_gap: input.rewriteSourceGap ?? null,
          rewrite_completed: input.rewriteCompleted ?? true,
        });
      }

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

  async completeReview(userId: string, email: string | null, queueId: string, action: ReviewCompletionAction) {
    await this.ensureAccess(userId, email);
    const context = await reviewOsRepository.getReviewQueueItemContext(userId, queueId);
    if (context && !this.isCompletionActionCompatible(context.item.examName, action)) {
      throw new ReviewOsInvalidCompletionActionError();
    }
    await reviewOsRepository.completeReviewQueueItem(userId, queueId);
    if (context) {
      const derivedPayload =
        typeof context.queueRow.derived_payload === "object" && context.queueRow.derived_payload
          ? (context.queueRow.derived_payload as Record<string, unknown>)
          : {};
      const followUpDueAt = this.resolveFollowUpDueAtFromAction(
        action,
        context.item.examName,
        this.readPreservedNextReviewDate(context),
      );
      const recurrenceCount = typeof derivedPayload.recurrenceCount === "number" ? derivedPayload.recurrenceCount : 1;
      const followUpPriority = Math.max(
        32,
        rankQueueItem({
          recurrenceCount,
          confidence: context.item.confidence,
          timeSpentSeconds: context.item.timeSpentSeconds ?? null,
          createdAt: context.item.createdAt,
        }),
      );
      await reviewOsRepository.createFollowUpReviewQueueEntry(
        userId,
        context.item,
        action,
        followUpDueAt,
        this.getCompletionReviewReason(action, context.item.examName),
        followUpPriority,
        {
          recurrenceCount,
          mistakeType: context.primaryTag?.mistakeType ?? "반복 실수",
          topicTag: context.primaryTag?.topicTag ?? context.item.subjectLabel,
        },
      );
    }
    await reviewOsRepository.logUsageEvent(userId, "review_complete", "review_queue_item", queueId, { action });
  }

  async getTodayFocus(userId: string, email: string | null, preferredMode?: "first" | "second"): Promise<TodayFocus> {
    await this.ensureAccess(userId, email);
    const [rawQueue, rawRecentItems] = await Promise.all([
      reviewOsRepository.listReviewQueue(userId, 5),
      reviewOsRepository.listWrongAnswerItems(userId, 8),
    ]);
    const targetExamName = preferredMode ? getModeLabel(preferredMode) : null;
    const queue = targetExamName ? rawQueue.filter((item) => item.examName === targetExamName) : rawQueue;
    const recentItems = targetExamName
      ? rawRecentItems.filter((item) => item.examName === targetExamName)
      : rawRecentItems;
    const focus = makeTodayFocus(queue, recentItems, preferredMode);
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "today_focus",
      seedType: "summary",
      priorityScore: focus.priorityScore,
      renderedText: focus.lines.join(" "),
      rawPayload: {
        lines: focus.lines,
        nextAction: focus.nextAction,
        reason: focus.reason,
        estimatedDurationMinutes: focus.estimatedDurationMinutes,
        sourceQueueId: focus.sourceQueueId,
        sourceItemId: focus.sourceItemId,
      },
    });
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "next_action",
      seedType: "action",
      priorityScore: focus.priorityScore,
      renderedText: focus.nextAction,
      rawPayload: { nextActionType: focus.nextActionType, sourceQueueId: focus.sourceQueueId, sourceItemId: focus.sourceItemId },
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
