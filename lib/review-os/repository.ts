import "server-only";

import crypto from "node:crypto";

import { DEV_SMOKE_AUTH_EMAIL, isDevSmokeAuthEnabled } from "@/lib/auth/session";
import {
  assertSupabaseOperation,
  getSupabasePersistenceClient,
  requireSupabasePersistence,
} from "@/lib/supabase/persistence";
import type {
  AccessState,
  ActionSeedRecord,
  AdminAlphaFeed,
  FeedbackItemInput,
  FeedbackItemRecord,
  InviteStatus,
  ReviewQueueCard,
  StudyProfile,
  UsageEventRecord,
  WeeklyLearningSummaryRecord,
  WrongAnswerDetail,
  WrongAnswerItemInput,
  WrongAnswerItemRecord,
  WrongAnswerNoteRecord,
  WrongAnswerTagRecord,
  RecurrenceFeatureRecord,
} from "@/lib/review-os/types";

function createUuid() {
  return crypto.randomUUID();
}

function hashPayload(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getAdminClient() {
  const client = getSupabasePersistenceClient();
  if (!client) {
    throw new Error("supabase-persistence-unavailable");
  }
  return client;
}

function getUserClient(userId: string) {
  requireSupabasePersistence(userId);
  return getAdminClient();
}

function parseInviteAllowList() {
  return (process.env.ALPHA_INVITE_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlisted(email: string | null) {
  if (isDevSmokeAuthEnabled() && email === DEV_SMOKE_AUTH_EMAIL) return true;
  if (!email) return false;
  const allowList = parseInviteAllowList();
  if (allowList.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  return allowList.includes(email.toLowerCase());
}

function mapAccess(row: Record<string, unknown> | null, email: string | null): AccessState {
  const inviteStatus = (typeof row?.invite_status === "string" ? row.invite_status : "pending") as InviteStatus;
  const entitlementTier = typeof row?.entitlement_tier === "string" ? row.entitlement_tier : "free_trial";
  return {
    allowed: inviteStatus === "invited" || inviteStatus === "active",
    inviteStatus,
    entitlementTier: entitlementTier as AccessState["entitlementTier"],
    email,
  };
}

function mapStudyProfile(row: Record<string, unknown> | null): StudyProfile | null {
  if (!row) return null;
  return {
    userId: String(row.user_id),
    examName: String(row.exam_name),
    examDate: typeof row.exam_date === "string" ? row.exam_date : null,
    preferredSubjects: toStringArray(row.preferred_subjects),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWrongAnswerItem(row: Record<string, unknown>): WrongAnswerItemRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    examName: String(row.exam_name),
    subjectLabel: String(row.subject_label),
    sourceType: String(row.source_type) as WrongAnswerItemRecord["sourceType"],
    sourceLabel: typeof row.source_label === "string" ? row.source_label : undefined,
    problemTitle: typeof row.problem_title === "string" ? row.problem_title : undefined,
    problemIdentifier: typeof row.problem_identifier === "string" ? row.problem_identifier : undefined,
    rawQuestionText: typeof row.raw_question_text === "string" ? row.raw_question_text : undefined,
    rawAnswerText: typeof row.raw_answer_text === "string" ? row.raw_answer_text : undefined,
    correctAnswer: String(row.correct_answer),
    userAnswer: String(row.user_answer),
    userReasonText: typeof row.user_reason_text === "string" ? row.user_reason_text : undefined,
    userReasonPreset: typeof row.user_reason_preset === "string" ? row.user_reason_preset : undefined,
    confidence: String(row.confidence) as WrongAnswerItemRecord["confidence"],
    timeSpentSeconds: typeof row.time_spent_seconds === "number" ? row.time_spent_seconds : null,
    dedupeKey: String(row.dedupe_key),
    processingStatus: String(row.processing_status) as WrongAnswerItemRecord["processingStatus"],
    rawPayload: typeof row.raw_payload === "object" && row.raw_payload ? (row.raw_payload as Record<string, unknown>) : {},
    derivedPayload:
      typeof row.derived_payload === "object" && row.derived_payload
        ? (row.derived_payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWrongAnswerNote(row: Record<string, unknown> | null): WrongAnswerNoteRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    wrongAnswerItemId: String(row.wrong_answer_item_id),
    aiSummary: String(row.ai_summary),
    keyDistinction: String(row.key_distinction),
    reviewCheckpoint: String(row.review_checkpoint),
    nextTryTip: String(row.next_try_tip),
    generationSource: String(row.generation_source) as WrongAnswerNoteRecord["generationSource"],
    createdAt: String(row.created_at),
  };
}

function mapWrongAnswerTag(row: Record<string, unknown>): WrongAnswerTagRecord {
  return {
    id: String(row.id),
    wrongAnswerItemId: String(row.wrong_answer_item_id),
    topicTag: String(row.topic_tag),
    mistakeType: String(row.mistake_type),
    taskType: String(row.task_type),
    classifierSource: String(row.classifier_source) as WrongAnswerTagRecord["classifierSource"],
    confidence: Number(row.confidence ?? 0),
    recurrenceCandidate: Boolean(row.recurrence_candidate),
    createdAt: String(row.created_at),
  };
}

function mapRecurrence(row: Record<string, unknown> | null): RecurrenceFeatureRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    examName: String(row.exam_name),
    subjectLabel: String(row.subject_label),
    topicTag: String(row.topic_tag),
    mistakeType: String(row.mistake_type),
    recurrenceCount: Number(row.recurrence_count ?? 1),
    lastSeenAt: String(row.last_seen_at),
    riskLevel: String(row.risk_level) as RecurrenceFeatureRecord["riskLevel"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActionSeed(row: Record<string, unknown>): ActionSeedRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sourceType: String(row.source_type) as ActionSeedRecord["sourceType"],
    seedType: String(row.seed_type) as ActionSeedRecord["seedType"],
    priorityScore: Number(row.priority_score ?? 0),
    renderedText: String(row.rendered_text),
    rawPayload:
      typeof row.raw_payload === "object" && row.raw_payload ? (row.raw_payload as Record<string, unknown>) : {},
    createdAt: String(row.created_at),
  };
}

function mapWeeklySummary(row: Record<string, unknown> | null): WeeklyLearningSummaryRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    weekKey: String(row.week_key),
    summaryText: String(row.summary_text),
    topMistakeTypes: toStringArray(row.top_mistake_types),
    topTopics: toStringArray(row.top_topics),
    nextWeekFocus: toStringArray(row.next_week_focus),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapUsageEvent(row: Record<string, unknown>): UsageEventRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    eventName: String(row.event_name),
    entityType: typeof row.entity_type === "string" ? row.entity_type : null,
    entityId: typeof row.entity_id === "string" ? row.entity_id : null,
    metadataJson:
      typeof row.metadata_json === "object" && row.metadata_json ? (row.metadata_json as Record<string, unknown>) : {},
    createdAt: String(row.created_at),
  };
}

function mapFeedbackItem(row: Record<string, unknown>): FeedbackItemRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    route: String(row.route),
    pageContext:
      typeof row.page_context === "object" && row.page_context ? (row.page_context as Record<string, unknown>) : {},
    message: String(row.message),
    createdAt: String(row.created_at),
  };
}

function mapReviewQueueCard(
  queueRow: Record<string, unknown>,
  item: WrongAnswerItemRecord,
  tag: WrongAnswerTagRecord | null,
): ReviewQueueCard {
  const rawPayload =
    typeof queueRow.raw_payload === "object" && queueRow.raw_payload
      ? (queueRow.raw_payload as Record<string, unknown>)
      : {};
  const derivedPayload =
    typeof queueRow.derived_payload === "object" && queueRow.derived_payload
      ? (queueRow.derived_payload as Record<string, unknown>)
      : {};

  return {
    queueId: String(queueRow.id),
    itemId: item.id,
    examName: item.examName,
    subjectLabel: item.subjectLabel,
    problemTitle: item.problemTitle ?? item.problemIdentifier ?? "감평 기록 항목",
    topicTag: tag?.topicTag ?? String(derivedPayload.topicTag ?? item.subjectLabel),
    mistakeType: tag?.mistakeType ?? String(derivedPayload.mistakeType ?? "반복 실수"),
    reviewReason: String(rawPayload.reviewReason ?? "오늘 다시 볼 필요가 큰 감평 항목입니다."),
    priorityScore: Number(queueRow.priority_score ?? 0),
    dueAt: String(rawPayload.dueAt ?? queueRow.created_at),
    recurrenceCount: Number(derivedPayload.recurrenceCount ?? 1),
    confidence: item.confidence,
    timeSpentSeconds: item.timeSpentSeconds ?? null,
  };
}

export class ReviewOsRepository {
  async ensureAccess(userId: string, email: string | null): Promise<AccessState> {
    const client = getUserClient(userId);
    const existingProfileResult = await client
      .from("profiles")
      .select("user_id, email, invite_status, entitlement_tier")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation("review-os.ensureAccess.selectExistingProfile", existingProfileResult);

    const now = new Date().toISOString();
    const existingProfile = existingProfileResult.data as Record<string, unknown> | null;

    if (existingProfile) {
      // Routine access checks must never reset invite/entitlement state for existing users.
      const updateResult = await client
        .from("profiles")
        .update({
          email,
          updated_at: now,
        })
        .eq("user_id", userId);
      assertSupabaseOperation("review-os.ensureAccess.updateExistingProfile", updateResult);
    } else {
      // First insert decides initial entitlement; later ensureAccess calls only refresh email/updated_at.
      const insertResult = await client.from("profiles").insert({
        user_id: userId,
        email,
        invite_status: isAllowlisted(email) ? "active" : "pending",
        entitlement_tier: "free_trial",
        updated_at: now,
      });
      assertSupabaseOperation("review-os.ensureAccess.insertProfile", insertResult);
    }

    const profileResult = await client
      .from("profiles")
      .select("user_id, email, invite_status, entitlement_tier")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation("review-os.ensureAccess.selectProfile", profileResult);
    return mapAccess(profileResult.data as Record<string, unknown> | null, email);
  }

  async getStudyProfile(userId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("study_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation("review-os.getStudyProfile", result);
    return mapStudyProfile(result.data as Record<string, unknown> | null);
  }

  async upsertStudyProfile(userId: string, input: Omit<StudyProfile, "userId" | "createdAt" | "updatedAt">) {
    const client = getUserClient(userId);
    const result = await client.from("study_profiles").upsert(
      {
        user_id: userId,
        exam_name: input.examName,
        exam_date: input.examDate,
        preferred_subjects: input.preferredSubjects,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    assertSupabaseOperation("review-os.upsertStudyProfile", result);
    return this.getStudyProfile(userId);
  }

  async getProfileTier(userId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("profiles")
      .select("entitlement_tier")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation("review-os.getProfileTier", result);
    return (result.data?.entitlement_tier as string | undefined) ?? "free_trial";
  }

  async countMonthlyWrongAnswers(userId: string, monthStartIso: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStartIso);
    assertSupabaseOperation("review-os.countMonthlyWrongAnswers", result);
    return result.count ?? 0;
  }

  createDedupeKey(userId: string, input: WrongAnswerItemInput) {
    return hashPayload(
      JSON.stringify({
        userId,
        examName: input.examName.trim(),
        subjectLabel: input.subjectLabel.trim(),
        problemTitle: input.problemTitle?.trim() ?? "",
        rawQuestionText: input.rawQuestionText?.trim() ?? "",
        correctAnswer: input.correctAnswer.trim(),
        userAnswer: input.userAnswer.trim(),
      }),
    );
  }

  async findExistingByDedupe(userId: string, dedupeKey: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_items")
      .select("*")
      .eq("user_id", userId)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    assertSupabaseOperation("review-os.findExistingByDedupe", result);
    return result.data ? mapWrongAnswerItem(result.data as Record<string, unknown>) : null;
  }

  async insertWrongAnswerItem(
    userId: string,
    input: WrongAnswerItemInput,
    rawPayload: Record<string, unknown>,
    derivedPayload: Record<string, unknown>,
  ) {
    const client = getUserClient(userId);
    const id = createUuid();
    const result = await client.from("wrong_answer_items").insert({
      id,
      user_id: userId,
      exam_name: input.examName,
      subject_label: input.subjectLabel,
      source_type: input.sourceType,
      source_label: input.sourceLabel ?? null,
      problem_title: input.problemTitle ?? null,
      problem_identifier: input.problemIdentifier ?? null,
      raw_question_text: input.rawQuestionText ?? null,
      raw_answer_text: input.rawAnswerText ?? null,
      correct_answer: input.correctAnswer,
      user_answer: input.userAnswer,
      user_reason_text: input.userReasonText ?? null,
      user_reason_preset: input.userReasonPreset ?? null,
      confidence: input.confidence,
      time_spent_seconds: input.timeSpentSeconds ?? null,
      dedupe_key: this.createDedupeKey(userId, input),
      processing_status: "completed",
      raw_payload: rawPayload,
      derived_payload: derivedPayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    assertSupabaseOperation("review-os.insertWrongAnswerItem", result);
    return this.getWrongAnswerItem(userId, id);
  }

  async getWrongAnswerItem(userId: string, itemId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_items")
      .select("*")
      .eq("user_id", userId)
      .eq("id", itemId)
      .maybeSingle();
    assertSupabaseOperation("review-os.getWrongAnswerItem", result);
    return result.data ? mapWrongAnswerItem(result.data as Record<string, unknown>) : null;
  }

  async listWrongAnswerItems(userId: string, limit = 20) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listWrongAnswerItems", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapWrongAnswerItem);
  }

  async insertWrongAnswerNote(
    userId: string,
    itemId: string,
    note: Omit<WrongAnswerNoteRecord, "id" | "wrongAnswerItemId" | "createdAt">,
  ) {
    const client = getUserClient(userId);
    const result = await client.from("wrong_answer_notes").insert({
      id: createUuid(),
      wrong_answer_item_id: itemId,
      ai_summary: note.aiSummary,
      key_distinction: note.keyDistinction,
      review_checkpoint: note.reviewCheckpoint,
      next_try_tip: note.nextTryTip,
      generation_source: note.generationSource,
    });
    assertSupabaseOperation("review-os.insertWrongAnswerNote", result);
  }

  async getWrongAnswerNote(userId: string, itemId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_notes")
      .select("*")
      .eq("wrong_answer_item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertSupabaseOperation("review-os.getWrongAnswerNote", result);
    return mapWrongAnswerNote(result.data as Record<string, unknown> | null);
  }

  async insertWrongAnswerTag(
    userId: string,
    itemId: string,
    tag: Omit<WrongAnswerTagRecord, "id" | "wrongAnswerItemId" | "createdAt">,
  ) {
    const client = getUserClient(userId);
    const result = await client.from("wrong_answer_tags").insert({
      id: createUuid(),
      wrong_answer_item_id: itemId,
      topic_tag: tag.topicTag,
      mistake_type: tag.mistakeType,
      task_type: tag.taskType,
      classifier_source: tag.classifierSource,
      confidence: tag.confidence,
      recurrence_candidate: tag.recurrenceCandidate,
    });
    assertSupabaseOperation("review-os.insertWrongAnswerTag", result);
  }

  async listWrongAnswerTags(userId: string, itemId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_tags")
      .select("*")
      .eq("wrong_answer_item_id", itemId)
      .order("created_at", { ascending: false });
    assertSupabaseOperation("review-os.listWrongAnswerTags", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapWrongAnswerTag);
  }

  async upsertRecurrenceFeature(
    userId: string,
    input: Pick<RecurrenceFeatureRecord, "examName" | "subjectLabel" | "topicTag" | "mistakeType">,
  ) {
    const client = getUserClient(userId);
    const existingResult = await client
      .from("recurrence_features")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_name", input.examName)
      .eq("subject_label", input.subjectLabel)
      .eq("topic_tag", input.topicTag)
      .eq("mistake_type", input.mistakeType)
      .maybeSingle();
    assertSupabaseOperation("review-os.upsertRecurrenceFeature.select", existingResult);

    const now = new Date().toISOString();
    if (existingResult.data) {
      const nextCount = Number(existingResult.data.recurrence_count ?? 1) + 1;
      const updateResult = await client
        .from("recurrence_features")
        .update({
          recurrence_count: nextCount,
          last_seen_at: now,
          risk_level: nextCount >= 3 ? "high" : nextCount >= 2 ? "watch" : "stable",
          updated_at: now,
        })
        .eq("id", existingResult.data.id)
        .eq("user_id", userId);
      assertSupabaseOperation("review-os.upsertRecurrenceFeature.update", updateResult);
    } else {
      const insertResult = await client.from("recurrence_features").insert({
        id: createUuid(),
        user_id: userId,
        exam_name: input.examName,
        subject_label: input.subjectLabel,
        topic_tag: input.topicTag,
        mistake_type: input.mistakeType,
        recurrence_count: 1,
        last_seen_at: now,
        risk_level: "stable",
        created_at: now,
        updated_at: now,
      });
      assertSupabaseOperation("review-os.upsertRecurrenceFeature.insert", insertResult);
    }

    return this.getRecurrenceFeature(userId, input.examName, input.subjectLabel, input.topicTag, input.mistakeType);
  }

  async getRecurrenceFeature(
    userId: string,
    examName: string,
    subjectLabel: string,
    topicTag: string,
    mistakeType: string,
  ) {
    const client = getUserClient(userId);
    const result = await client
      .from("recurrence_features")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_name", examName)
      .eq("subject_label", subjectLabel)
      .eq("topic_tag", topicTag)
      .eq("mistake_type", mistakeType)
      .maybeSingle();
    assertSupabaseOperation("review-os.getRecurrenceFeature", result);
    return mapRecurrence(result.data as Record<string, unknown> | null);
  }

  async insertReviewQueueEntry(
    userId: string,
    item: WrongAnswerItemRecord,
    reviewReason: string,
    priorityScore: number,
    dueAt: string,
    derivedPayload: Record<string, unknown>,
  ) {
    const client = getUserClient(userId);
    const result = await client.from("review_queue_items").insert({
      id: createUuid(),
      user_id: userId,
      exam_id: "wrong_answer_os",
      subject_id: item.subjectLabel,
      stage: "alpha",
      source_submission_id: item.id,
      source_kind: "wrong_answer",
      status: "pending",
      priority_score: priorityScore,
      raw_payload: {
        dueAt,
        reviewReason,
      },
      derived_payload: derivedPayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    assertSupabaseOperation("review-os.insertReviewQueueEntry", result);
  }

  async listReviewQueue(userId: string, limit = 10) {
    const client = getUserClient(userId);
    const queueResult = await client
      .from("review_queue_items")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_id", "wrong_answer_os")
      .eq("stage", "alpha")
      .eq("status", "pending")
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listReviewQueue.queue", queueResult);

    const queueRows = (queueResult.data ?? []) as Record<string, unknown>[];
    const itemIds = queueRows
      .map((row) => (typeof row.source_submission_id === "string" ? row.source_submission_id : null))
      .filter((value): value is string => Boolean(value));
    if (itemIds.length === 0) {
      return [];
    }

    const itemsResult = await client
      .from("wrong_answer_items")
      .select("*")
      .eq("user_id", userId)
      .in("id", itemIds);
    assertSupabaseOperation("review-os.listReviewQueue.items", itemsResult);
    const itemsMap = new Map(
      ((itemsResult.data ?? []) as Record<string, unknown>[]).map((row) => {
        const item = mapWrongAnswerItem(row);
        return [item.id, item] as const;
      }),
    );

    const tagsResult = await client.from("wrong_answer_tags").select("*").in("wrong_answer_item_id", itemIds);
    assertSupabaseOperation("review-os.listReviewQueue.tags", tagsResult);
    const primaryTagByItemId = new Map<string, WrongAnswerTagRecord>();
    ((tagsResult.data ?? []) as Record<string, unknown>[]).forEach((row) => {
      const tag = mapWrongAnswerTag(row);
      if (!primaryTagByItemId.has(tag.wrongAnswerItemId)) {
        primaryTagByItemId.set(tag.wrongAnswerItemId, tag);
      }
    });

    return queueRows.flatMap((row) => {
      const itemId = typeof row.source_submission_id === "string" ? row.source_submission_id : null;
      if (!itemId) return [];
      const item = itemsMap.get(itemId);
      if (!item) return [];
      return [mapReviewQueueCard(row, item, primaryTagByItemId.get(itemId) ?? null)];
    });
  }

  async completeReviewQueueItem(userId: string, queueId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("review_queue_items")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", queueId)
      .eq("exam_id", "wrong_answer_os");
    assertSupabaseOperation("review-os.completeReviewQueueItem", result);
  }

  async getWrongAnswerDetail(userId: string, itemId: string): Promise<WrongAnswerDetail | null> {
    const item = await this.getWrongAnswerItem(userId, itemId);
    if (!item) return null;
    const [note, tags, reviewQueue] = await Promise.all([
      this.getWrongAnswerNote(userId, itemId),
      this.listWrongAnswerTags(userId, itemId),
      this.listReviewQueue(userId, 20),
    ]);
    const primaryTag = tags[0] ?? null;
    const recurrence =
      primaryTag === null
        ? null
        : await this.getRecurrenceFeature(userId, item.examName, item.subjectLabel, primaryTag.topicTag, primaryTag.mistakeType);

    return {
      item,
      note,
      tags,
      recurrence,
      reviewQueue: reviewQueue.filter((entry) => entry.itemId === itemId),
    };
  }

  async upsertWeeklySummary(
    userId: string,
    weekKey: string,
    summaryText: string,
    topMistakeTypes: string[],
    topTopics: string[],
    nextWeekFocus: string[],
  ) {
    const client = getUserClient(userId);
    const result = await client.from("weekly_learning_summaries").upsert(
      {
        user_id: userId,
        week_key: weekKey,
        summary_text: summaryText,
        top_mistake_types: topMistakeTypes,
        top_topics: topTopics,
        next_week_focus: nextWeekFocus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_key" },
    );
    assertSupabaseOperation("review-os.upsertWeeklySummary", result);
    return this.getWeeklySummary(userId, weekKey);
  }

  async getWeeklySummary(userId: string, weekKey: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("weekly_learning_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("week_key", weekKey)
      .maybeSingle();
    assertSupabaseOperation("review-os.getWeeklySummary", result);
    return mapWeeklySummary(result.data as Record<string, unknown> | null);
  }

  async insertActionSeed(userId: string, input: Omit<ActionSeedRecord, "id" | "userId" | "createdAt">) {
    const client = getUserClient(userId);
    const result = await client.from("action_seeds").insert({
      id: createUuid(),
      user_id: userId,
      source_type: input.sourceType,
      seed_type: input.seedType,
      priority_score: input.priorityScore,
      rendered_text: input.renderedText,
      raw_payload: input.rawPayload,
    });
    assertSupabaseOperation("review-os.insertActionSeed", result);
  }

  async listActionSeeds(userId: string, sourceType?: ActionSeedRecord["sourceType"], limit = 10) {
    const client = getUserClient(userId);
    let query = client
      .from("action_seeds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sourceType) {
      query = query.eq("source_type", sourceType);
    }

    const result = await query;
    assertSupabaseOperation("review-os.listActionSeeds", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapActionSeed);
  }

  async logUsageEvent(
    userId: string,
    eventName: string,
    entityType: string | null,
    entityId: string | null,
    metadataJson: Record<string, unknown>,
  ) {
    const client = getUserClient(userId);
    const result = await client.from("usage_events").insert({
      id: createUuid(),
      user_id: userId,
      event_name: eventName,
      entity_type: entityType,
      entity_id: entityId,
      metadata_json: metadataJson,
    });
    assertSupabaseOperation("review-os.logUsageEvent", result);
  }

  async createFeedback(userId: string, input: FeedbackItemInput) {
    const client = getUserClient(userId);
    const result = await client.from("feedback_items").insert({
      id: createUuid(),
      user_id: userId,
      route: input.route,
      page_context: input.pageContext,
      message: input.message,
    });
    assertSupabaseOperation("review-os.createFeedback", result);
  }

  async listRecentUsageEvents(limit = 100) {
    const client = getAdminClient();
    const result = await client.from("usage_events").select("*").order("created_at", { ascending: false }).limit(limit);
    assertSupabaseOperation("review-os.listRecentUsageEvents", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapUsageEvent);
  }

  async listRecentFeedback(limit = 100) {
    const client = getAdminClient();
    const result = await client.from("feedback_items").select("*").order("created_at", { ascending: false }).limit(limit);
    assertSupabaseOperation("review-os.listRecentFeedback", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapFeedbackItem);
  }

  async getAdminAlphaFeed(limit = 50): Promise<AdminAlphaFeed> {
    const [recentEvents, recentFeedback] = await Promise.all([
      this.listRecentUsageEvents(limit),
      this.listRecentFeedback(limit),
    ]);
    return { recentEvents, recentFeedback };
  }
}

export const reviewOsRepository = new ReviewOsRepository();
