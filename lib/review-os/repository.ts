import "server-only";

import crypto from "node:crypto";

import {
  DEV_SMOKE_AUTH_EMAIL,
  isDevSmokeAuthEnabled,
} from "@/lib/auth/session";
import {
  assertSupabaseOperation,
  getSupabasePersistenceClient,
  requireSupabasePersistence,
} from "@/lib/supabase/persistence";
import type {
  AccessState,
  ConceptReviewCardPayload,
  ActionSeedRecord,
  AdminAlphaFeed,
  FeedbackItemInput,
  FeedbackItemRecord,
  LearningSignalEventInput,
  LearningSignalEventRecord,
  InviteStatus,
  ReviewQueueCard,
  ReviewCompletionAction,
  StudyProfile,
  UsageEventRecord,
  WeeklyLearningSummaryRecord,
  WrongAnswerDetail,
  WrongAnswerItemInput,
  WrongAnswerItemRecord,
  WrongAnswerNoteRecord,
  WrongAnswerTagRecord,
  RecurrenceFeatureRecord,
  StudyLogInput,
  StudyLogRecord,
  TaxonomyClassificationCandidate,
} from "@/lib/review-os/types";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { requireTrustedRepairAccess } from "@/lib/review-os/trusted-repair-access";
import type { TrustedRepairSubject } from "@/lib/review-os/trusted-repair-contract";
import {
  sanitizeDerivedMetadata,
  sanitizeLearningSignalMetadata,
} from "@/lib/review-os/data-boundary";
import { isConceptNodeCandidate } from "@/lib/review-os/concept-node-mapping";
import {
  toStringArray,
  toTaxonomyCandidates,
} from "@/lib/review-os/taxonomy-candidates";
import { s233aSupabaseRepository } from "@/lib/review-os/s233a-supabase-repository";
import type {
  S233aReviewRepositoryPort,
} from "@/lib/review-os/s233a-types";

function createUuid() {
  return crypto.randomUUID();
}

function hashPayload(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function assertApp1ReplayExact(actual: unknown, expected: unknown) {
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error("review-os:app1-replay-authority-conflict");
  }
}

const APP1_CONTRACT_VERSION = "OwnerCaptureToRepairVerticalV1";
const APP1_PERSISTENCE_FIELDS = Object.freeze([
  "app1_contract_version",
  "app1_mastery_created",
  "app1_same_session_only",
  "app1_source_item_id",
  "app1_transfer_created",
  "app1_verification_state",
] as const);
const APP1_SUBJECT_BY_LABEL: Readonly<Record<string, TrustedRepairSubject>> =
  Object.freeze({
    감정평가실무: "appraisal_practical",
    감정평가이론: "appraisal_theory",
    "감정평가 및 보상법규": "appraisal_law",
  });

function app1ConfirmedFields(input: WrongAnswerItemInput) {
  const fields = input.extractionPayload?.user_confirmed_fields;
  return fields && typeof fields === "object" && !Array.isArray(fields)
    ? fields
    : null;
}

function rejectApp1PersistenceAuthority(): never {
  throw new Error("review-os:app1-persistence-authority");
}

export function normalizePostgrestTimestamp(value: unknown): string {
  const rawValue = String(value);
  const timestamp = Date.parse(rawValue);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : rawValue;
}

function toConceptReviewCard(
  value: unknown,
): ConceptReviewCardPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.coreRule !== "string") return undefined;
  return {
    sourceType:
      typeof row.sourceType === "string" ? row.sourceType : "first_ox",
    examMode:
      typeof row.examMode === "string" ? row.examMode : "감정평가사 1차",
    subject: typeof row.subject === "string" ? row.subject : "감정평가사 1차",
    statement_id:
      typeof row.statement_id === "string" ? row.statement_id : null,
    trapWords: toStringArray(row.trapWords),
    coreRule: row.coreRule,
    minimalExplanation:
      typeof row.minimalExplanation === "string"
        ? row.minimalExplanation
        : "헷갈린 지점 1개를 확인합니다.",
    examTrapExplanation:
      typeof row.examTrapExplanation === "string"
        ? row.examTrapExplanation
        : "표현 하나가 바뀌면 판단이 달라질 수 있습니다.",
    nextReviewAction:
      typeof row.nextReviewAction === "string"
        ? row.nextReviewAction
        : "근거 1줄로 다시 판단합니다.",
    reviewStage: typeof row.reviewStage === "string" ? row.reviewStage : "O/X",
    dueAt: typeof row.dueAt === "string" ? row.dueAt : new Date().toISOString(),
    topic_candidate:
      typeof row.topic_candidate === "string" ? row.topic_candidate : null,
    concept_candidate:
      typeof row.concept_candidate === "string" ? row.concept_candidate : null,
    official_answer_authority: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toConceptNodeCandidateFromPayload(...payloads: unknown[]) {
  for (const payload of payloads) {
    if (isConceptNodeCandidate(payload)) return payload;
    if (!isRecord(payload)) continue;
    if (isConceptNodeCandidate(payload.concept_node_candidate))
      return payload.concept_node_candidate;
    if (isConceptNodeCandidate(payload.conceptNodeCandidate))
      return payload.conceptNodeCandidate;
    const captureNoteV2 = payload.capture_note_engine_v2;
    if (
      isRecord(captureNoteV2) &&
      isConceptNodeCandidate(captureNoteV2.concept_node_candidate)
    ) {
      return captureNoteV2.concept_node_candidate;
    }
    const captureNoteV1 = payload.capture_note_engine_v1;
    if (
      isRecord(captureNoteV1) &&
      isConceptNodeCandidate(captureNoteV1.concept_node_candidate)
    ) {
      return captureNoteV1.concept_node_candidate;
    }
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function mapAccess(
  row: Record<string, unknown> | null,
  email: string | null,
): AccessState {
  const inviteStatus = (
    typeof row?.invite_status === "string" ? row.invite_status : "pending"
  ) as InviteStatus;
  const entitlementTier =
    typeof row?.entitlement_tier === "string"
      ? row.entitlement_tier
      : "free_trial";
  return {
    allowed: inviteStatus === "invited" || inviteStatus === "active",
    inviteStatus,
    entitlementTier: entitlementTier as AccessState["entitlementTier"],
    email,
  };
}

function mapStudyProfile(
  row: Record<string, unknown> | null,
): StudyProfile | null {
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

function mapWrongAnswerItem(
  row: Record<string, unknown>,
): WrongAnswerItemRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    examName: String(row.exam_name),
    subjectLabel: String(row.subject_label),
    sourceType: String(row.source_type) as WrongAnswerItemRecord["sourceType"],
    sourceLabel:
      typeof row.source_label === "string" ? row.source_label : undefined,
    problemTitle:
      typeof row.problem_title === "string" ? row.problem_title : undefined,
    problemIdentifier:
      typeof row.problem_identifier === "string"
        ? row.problem_identifier
        : undefined,
    rawQuestionText:
      typeof row.raw_question_text === "string"
        ? row.raw_question_text
        : undefined,
    rawAnswerText:
      typeof row.raw_answer_text === "string" ? row.raw_answer_text : undefined,
    correctAnswer: String(row.correct_answer),
    userAnswer: String(row.user_answer),
    userReasonText:
      typeof row.user_reason_text === "string"
        ? row.user_reason_text
        : undefined,
    userReasonPreset:
      typeof row.user_reason_preset === "string"
        ? row.user_reason_preset
        : undefined,
    confidence: String(row.confidence) as WrongAnswerItemRecord["confidence"],
    timeSpentSeconds:
      typeof row.time_spent_seconds === "number"
        ? row.time_spent_seconds
        : null,
    dedupeKey: String(row.dedupe_key),
    processingStatus: String(
      row.processing_status,
    ) as WrongAnswerItemRecord["processingStatus"],
    rawPayload:
      typeof row.raw_payload === "object" && row.raw_payload
        ? (row.raw_payload as Record<string, unknown>)
        : {},
    derivedPayload:
      typeof row.derived_payload === "object" && row.derived_payload
        ? (row.derived_payload as Record<string, unknown>)
        : {},
    createdAt: normalizePostgrestTimestamp(row.created_at),
    updatedAt: normalizePostgrestTimestamp(row.updated_at),
  };
}

function mapWrongAnswerNote(
  row: Record<string, unknown> | null,
): WrongAnswerNoteRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    wrongAnswerItemId: String(row.wrong_answer_item_id),
    aiSummary: String(row.ai_summary),
    keyDistinction: String(row.key_distinction),
    reviewCheckpoint: String(row.review_checkpoint),
    nextTryTip: String(row.next_try_tip),
    generationSource: String(
      row.generation_source,
    ) as WrongAnswerNoteRecord["generationSource"],
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
    classifierSource: String(
      row.classifier_source,
    ) as WrongAnswerTagRecord["classifierSource"],
    confidence: Number(row.confidence ?? 0),
    recurrenceCandidate: Boolean(row.recurrence_candidate),
    createdAt: String(row.created_at),
  };
}

function mapRecurrence(
  row: Record<string, unknown> | null,
): RecurrenceFeatureRecord | null {
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
      typeof row.raw_payload === "object" && row.raw_payload
        ? (row.raw_payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

function mapWeeklySummary(
  row: Record<string, unknown> | null,
): WeeklyLearningSummaryRecord | null {
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

function mapStudyLog(row: Record<string, unknown>): StudyLogRecord {
  const taxonomyCandidates = toTaxonomyCandidates(row.taxonomy_candidates);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    mode: String(row.mode) as StudyLogRecord["mode"],
    subject: String(row.subject),
    studyType: String(row.study_type) as StudyLogRecord["studyType"],
    sourceLabel: String(row.source_label),
    timeSpentMinutes:
      typeof row.time_spent_minutes === "number"
        ? row.time_spent_minutes
        : null,
    notUnderstood: String(row.not_understood),
    revisitNeeded: String(row.revisit_needed),
    confidence: String(row.confidence) as StudyLogRecord["confidence"],
    taxonomyNodeId:
      typeof row.taxonomy_node_id === "string" ? row.taxonomy_node_id : null,
    taxonomyCandidates,
    taxonomyClassificationStatus:
      row.taxonomy_classification_status === "ai_suggested" ||
      row.taxonomy_classification_status === "human_verified"
        ? row.taxonomy_classification_status
        : "needs_review",
    taxonomyClassificationConfidence: toNullableNumber(
      row.taxonomy_classification_confidence,
    ),
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
      typeof row.metadata_json === "object" && row.metadata_json
        ? (row.metadata_json as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

function mapFeedbackItem(row: Record<string, unknown>): FeedbackItemRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    route: String(row.route),
    pageContext:
      typeof row.page_context === "object" && row.page_context
        ? (row.page_context as Record<string, unknown>)
        : {},
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
  const conceptCard = toConceptReviewCard(
    item.derivedPayload?.concept_card ?? item.rawPayload?.concept_card,
  );
  const conceptNodeCandidate = toConceptNodeCandidateFromPayload(
    derivedPayload,
    item.derivedPayload,
    item.rawPayload,
  );

  return {
    queueId: String(queueRow.id),
    itemId: item.id,
    examName: item.examName,
    subjectLabel: item.subjectLabel,
    problemTitle:
      item.problemTitle ?? item.problemIdentifier ?? "감평 기록 항목",
    topicTag:
      tag?.topicTag ?? String(derivedPayload.topicTag ?? item.subjectLabel),
    mistakeType:
      tag?.mistakeType ?? String(derivedPayload.mistakeType ?? "반복 실수"),
    reviewReason: String(
      rawPayload.reviewReason ?? "오늘 다시 볼 필요가 큰 감평 항목입니다.",
    ),
    priorityScore: Number(queueRow.priority_score ?? 0),
    dueAt: String(rawPayload.dueAt ?? queueRow.created_at),
    recurrenceCount: Number(derivedPayload.recurrenceCount ?? 1),
    confidence: item.confidence,
    timeSpentSeconds: item.timeSpentSeconds ?? null,
    createdFromCapture: Boolean(
      typeof item.rawPayload?.created_from_capture === "boolean"
        ? item.rawPayload.created_from_capture
        : item.derivedPayload?.created_from_capture,
    ),
    itemCreatedAt: item.createdAt,
    conceptCard,
    conceptNodeCandidate,
    clozeCandidate:
      typeof item.derivedPayload?.cloze_candidate === "string"
        ? item.derivedPayload.cloze_candidate
        : (conceptCard?.trapWords[0] ?? null),
    rawQuestionText: item.rawQuestionText ?? null,
  };
}

function mapLearningSignalEvent(
  row: Record<string, unknown>,
): LearningSignalEventRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    examMode: String(row.exam_mode) as LearningSignalEventRecord["examMode"],
    subject: String(row.subject),
    sourceType: String(row.source_type),
    derivedTags: toStringArray(row.derived_tags),
    relatedFormulas: toStringArray(row.related_formulas),
    nextTaskType: String(row.next_task_type),
    nextTask: String(row.next_task),
    metadataJson:
      typeof row.metadata_json === "object" && row.metadata_json
        ? (row.metadata_json as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

function getExamModeLabel(
  mode: AppraisalMode,
): LearningSignalEventRecord["examMode"] {
  return mode === "second" ? "감정평가사 2차" : "감정평가사 1차";
}

export class ReviewOsRepository {
  private async assertApp1RepairPersistenceAuthority(
    userId: string,
    input: WrongAnswerItemInput,
  ) {
    const fields = app1ConfirmedFields(input);
    const app1Fields = fields
      ? Object.keys(fields)
          .filter((key) => key.startsWith("app1_"))
          .sort()
      : [];
    if (app1Fields.length === 0) return;
    if (
      app1Fields.length !== APP1_PERSISTENCE_FIELDS.length ||
      app1Fields.some((field, index) => field !== APP1_PERSISTENCE_FIELDS[index]) ||
      fields?.app1_contract_version !== APP1_CONTRACT_VERSION ||
      fields.app1_verification_state !== "repair_confirmed_for_this_session" ||
      fields.app1_same_session_only !== true ||
      fields.app1_mastery_created !== false ||
      fields.app1_transfer_created !== false ||
      typeof fields.app1_source_item_id !== "string" ||
      fields.app1_source_item_id !== input.rewriteSourceItemId ||
      input.examName !== "감정평가사 2차" ||
      input.createdFromCapture !== true ||
      input.captureIntent !== "save" ||
      input.rewriteCompleted !== true
    ) {
      rejectApp1PersistenceAuthority();
    }

    const subject = APP1_SUBJECT_BY_LABEL[input.subjectLabel];
    if (!subject) rejectApp1PersistenceAuthority();
    const access = await requireTrustedRepairAccess();
    if (
      access.userId !== userId ||
      !access.trustedRepairSubjects.includes(subject)
    ) {
      rejectApp1PersistenceAuthority();
    }

    const sourceItem = await this.getWrongAnswerItem(
      userId,
      fields.app1_source_item_id,
    );
    if (
      !sourceItem ||
      sourceItem.id !== input.rewriteSourceItemId ||
      sourceItem.examName !== "감정평가사 2차" ||
      sourceItem.subjectLabel !== input.subjectLabel
    ) {
      rejectApp1PersistenceAuthority();
    }
  }

  claimS233aReview: S233aReviewRepositoryPort["claim"] =
    s233aSupabaseRepository.claim;

  transitionS233aReview: S233aReviewRepositoryPort["transition"] =
    s233aSupabaseRepository.transition;

  loadS233aReview: S233aReviewRepositoryPort["loadReview"] =
    s233aSupabaseRepository.loadReview;

  async getReviewQueueItemContext(userId: string, queueId: string) {
    const client = getUserClient(userId);
    const queueResult = await client
      .from("review_queue_items")
      .select("*")
      .eq("user_id", userId)
      .eq("id", queueId)
      .eq("exam_id", "wrong_answer_os")
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.getReviewQueueItemContext.queue",
      queueResult,
    );

    const queueRow = queueResult.data as Record<string, unknown> | null;
    if (!queueRow) return null;

    const itemId =
      typeof queueRow.source_submission_id === "string"
        ? queueRow.source_submission_id
        : null;
    if (!itemId) return null;

    const item = await this.getWrongAnswerItem(userId, itemId);
    if (!item) return null;

    const tags = await this.listWrongAnswerTags(userId, itemId);
    return { queueRow, item, primaryTag: tags[0] ?? null };
  }

  async createFollowUpReviewQueueEntry(
    userId: string,
    item: WrongAnswerItemRecord,
    action: ReviewCompletionAction,
    dueAt: string,
    reviewReason: string,
    priorityScore: number,
    derivedPayload: Record<string, unknown>,
    rawPayload: Record<string, unknown> = {},
  ) {
    const client = getUserClient(userId);

    const existingPendingResult = await client
      .from("review_queue_items")
      .select("id")
      .eq("user_id", userId)
      .eq("exam_id", "wrong_answer_os")
      .eq("source_submission_id", item.id)
      .eq("status", "pending")
      .limit(1);
    assertSupabaseOperation(
      "review-os.createFollowUpReviewQueueEntry.selectPending",
      existingPendingResult,
    );
    if ((existingPendingResult.data ?? []).length > 0) return;

    const now = new Date().toISOString();
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
        ...rawPayload,
      },
      derived_payload: sanitizeDerivedMetadata({
        ...derivedPayload,
        completionAction: action,
        followUpScheduledAt: dueAt,
      }),
      created_at: now,
      updated_at: now,
    });
    assertSupabaseOperation(
      "review-os.createFollowUpReviewQueueEntry.insert",
      result,
    );
  }

  async ensureAccess(
    userId: string,
    email: string | null,
  ): Promise<AccessState> {
    const client = getUserClient(userId);
    const existingProfileResult = await client
      .from("profiles")
      .select("user_id, email, invite_status, entitlement_tier")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureAccess.selectExistingProfile",
      existingProfileResult,
    );

    const now = new Date().toISOString();
    const existingProfile = existingProfileResult.data as Record<
      string,
      unknown
    > | null;

    if (existingProfile) {
      // Routine access checks must never reset invite/entitlement state for existing users.
      const updateResult = await client
        .from("profiles")
        .update({
          email,
          updated_at: now,
        })
        .eq("user_id", userId);
      assertSupabaseOperation(
        "review-os.ensureAccess.updateExistingProfile",
        updateResult,
      );
    } else {
      // First insert decides initial entitlement; later ensureAccess calls only refresh email/updated_at.
      const insertResult = await client.from("profiles").insert({
        user_id: userId,
        email,
        invite_status: isAllowlisted(email) ? "active" : "pending",
        entitlement_tier: "free_trial",
        updated_at: now,
      });
      // Concurrent first-time requests can race on user_id uniqueness; keep existing row and continue.
      if (insertResult.error && insertResult.error.code !== "23505") {
        assertSupabaseOperation(
          "review-os.ensureAccess.insertProfile",
          insertResult,
        );
      }
    }

    const profileResult = await client
      .from("profiles")
      .select("user_id, email, invite_status, entitlement_tier")
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureAccess.selectProfile",
      profileResult,
    );
    return mapAccess(
      profileResult.data as Record<string, unknown> | null,
      email,
    );
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

  async upsertStudyProfile(
    userId: string,
    input: Omit<StudyProfile, "userId" | "createdAt" | "updatedAt">,
  ) {
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
    return (
      (result.data?.entitlement_tier as string | undefined) ?? "free_trial"
    );
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
    return result.data
      ? mapWrongAnswerItem(result.data as Record<string, unknown>)
      : null;
  }

  async insertWrongAnswerItem(
    userId: string,
    input: WrongAnswerItemInput,
    rawPayload: Record<string, unknown>,
    derivedPayload: Record<string, unknown>,
    exactItemId?: string,
  ) {
    await this.assertApp1RepairPersistenceAuthority(userId, input);
    const client = getUserClient(userId);
    const id = exactItemId ?? createUuid();
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
      derived_payload: sanitizeDerivedMetadata(derivedPayload),
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
    return result.data
      ? mapWrongAnswerItem(result.data as Record<string, unknown>)
      : null;
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
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapWrongAnswerItem,
    );
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

  async ensureApp1WrongAnswerNote(
    userId: string,
    id: string,
    itemId: string,
    note: Omit<WrongAnswerNoteRecord, "id" | "wrongAnswerItemId" | "createdAt">,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      wrong_answer_item_id: itemId,
      ai_summary: note.aiSummary,
      key_distinction: note.keyDistinction,
      review_checkpoint: note.reviewCheckpoint,
      next_try_tip: note.nextTryTip,
      generation_source: note.generationSource,
    };
    const result = await client.from("wrong_answer_notes").insert(payload);
    if (!result.error) return { status: "saved" as const };
    if (result.error.code !== "23505") {
      assertSupabaseOperation("review-os.ensureApp1WrongAnswerNote.insert", result);
    }
    const existingResult = await client
      .from("wrong_answer_notes")
      .select("id, wrong_answer_item_id, ai_summary, key_distinction, review_checkpoint, next_try_tip, generation_source")
      .eq("id", id)
      .eq("wrong_answer_item_id", itemId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureApp1WrongAnswerNote.selectExisting",
      existingResult,
    );
    if (!existingResult.data) throw new Error("review-os:app1-replay-note-missing");
    assertApp1ReplayExact(existingResult.data, payload);
    return { status: "deduped" as const };
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

  async ensureApp1WrongAnswerTag(
    userId: string,
    id: string,
    itemId: string,
    tag: Omit<WrongAnswerTagRecord, "id" | "wrongAnswerItemId" | "createdAt">,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      wrong_answer_item_id: itemId,
      topic_tag: tag.topicTag,
      mistake_type: tag.mistakeType,
      task_type: tag.taskType,
      classifier_source: tag.classifierSource,
      confidence: tag.confidence,
      recurrence_candidate: tag.recurrenceCandidate,
    };
    const result = await client.from("wrong_answer_tags").insert(payload);
    if (!result.error) return { status: "saved" as const };
    if (result.error.code !== "23505") {
      assertSupabaseOperation("review-os.ensureApp1WrongAnswerTag.insert", result);
    }
    const existingResult = await client
      .from("wrong_answer_tags")
      .select("id, wrong_answer_item_id, topic_tag, mistake_type, task_type, classifier_source, confidence, recurrence_candidate")
      .eq("id", id)
      .eq("wrong_answer_item_id", itemId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureApp1WrongAnswerTag.selectExisting",
      existingResult,
    );
    if (!existingResult.data) throw new Error("review-os:app1-replay-tag-missing");
    assertApp1ReplayExact(existingResult.data, payload);
    return { status: "deduped" as const };
  }

  async listWrongAnswerTags(userId: string, itemId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("wrong_answer_tags")
      .select("*")
      .eq("wrong_answer_item_id", itemId)
      .order("created_at", { ascending: false });
    assertSupabaseOperation("review-os.listWrongAnswerTags", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapWrongAnswerTag,
    );
  }

  async upsertRecurrenceFeature(
    userId: string,
    input: Pick<
      RecurrenceFeatureRecord,
      "examName" | "subjectLabel" | "topicTag" | "mistakeType"
    >,
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
    assertSupabaseOperation(
      "review-os.upsertRecurrenceFeature.select",
      existingResult,
    );

    const now = new Date().toISOString();
    if (existingResult.data) {
      const nextCount = Number(existingResult.data.recurrence_count ?? 1) + 1;
      const updateResult = await client
        .from("recurrence_features")
        .update({
          recurrence_count: nextCount,
          last_seen_at: now,
          risk_level:
            nextCount >= 3 ? "high" : nextCount >= 2 ? "watch" : "stable",
          updated_at: now,
        })
        .eq("id", existingResult.data.id)
        .eq("user_id", userId);
      assertSupabaseOperation(
        "review-os.upsertRecurrenceFeature.update",
        updateResult,
      );
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
      assertSupabaseOperation(
        "review-os.upsertRecurrenceFeature.insert",
        insertResult,
      );
    }

    return this.getRecurrenceFeature(
      userId,
      input.examName,
      input.subjectLabel,
      input.topicTag,
      input.mistakeType,
    );
  }

  async countApp1RecurrenceEvidence(
    userId: string,
    input: Pick<
      RecurrenceFeatureRecord,
      "examName" | "subjectLabel" | "topicTag" | "mistakeType"
    >,
  ) {
    const client = getUserClient(userId);
    const evidenceResult = await client
      .from("wrong_answer_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("exam_name", input.examName)
      .eq("subject_label", input.subjectLabel)
      .eq("derived_payload->>topicTag", input.topicTag)
      .eq("derived_payload->>mistakeType", input.mistakeType);
    assertSupabaseOperation(
      "review-os.countApp1RecurrenceEvidence",
      evidenceResult,
    );
    return evidenceResult.count ?? 0;
  }

  async ensureApp1RecurrenceFeature(
    userId: string,
    input: Pick<
      RecurrenceFeatureRecord,
      "examName" | "subjectLabel" | "topicTag" | "mistakeType"
    >,
  ) {
    const targetCount = await this.countApp1RecurrenceEvidence(userId, input);
    if (!Number.isSafeInteger(targetCount) || targetCount < 1) {
      throw new Error("review-os:app1-replay-recurrence-invalid");
    }
    const client = getUserClient(userId);
    const readCurrent = () =>
      this.getRecurrenceFeature(
        userId,
        input.examName,
        input.subjectLabel,
        input.topicTag,
        input.mistakeType,
      );
    const existing = await readCurrent();
    if (existing && existing.recurrenceCount >= targetCount) {
      return { status: "deduped" as const, recurrence: existing };
    }

    const now = new Date().toISOString();
    if (existing) {
      const updateResult = await client
        .from("recurrence_features")
        .update({
          recurrence_count: targetCount,
          last_seen_at: now,
          risk_level:
            targetCount >= 3
              ? "high"
              : targetCount >= 2
                ? "watch"
                : "stable",
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .lt("recurrence_count", targetCount);
      assertSupabaseOperation(
        "review-os.ensureApp1RecurrenceFeature.update",
        updateResult,
      );
    } else {
      const insertResult = await client.from("recurrence_features").insert({
        id: createUuid(),
        user_id: userId,
        exam_name: input.examName,
        subject_label: input.subjectLabel,
        topic_tag: input.topicTag,
        mistake_type: input.mistakeType,
        recurrence_count: targetCount,
        last_seen_at: now,
        risk_level:
          targetCount >= 3 ? "high" : targetCount >= 2 ? "watch" : "stable",
        created_at: now,
        updated_at: now,
      });
      if (insertResult.error?.code !== "23505") {
        assertSupabaseOperation(
          "review-os.ensureApp1RecurrenceFeature.insert",
          insertResult,
        );
      }
    }

    const ensured = await readCurrent();
    if (!ensured || ensured.recurrenceCount < targetCount) {
      throw new Error("review-os:app1-replay-recurrence-conflict");
    }
    return { status: "saved" as const, recurrence: ensured };
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
      derived_payload: sanitizeDerivedMetadata(derivedPayload),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    assertSupabaseOperation("review-os.insertReviewQueueEntry", result);
  }

  async ensureApp1ReviewQueueEntry(
    userId: string,
    id: string,
    item: WrongAnswerItemRecord,
    reviewReason: string,
    priorityScore: number,
    dueAt: string,
    derivedPayload: Record<string, unknown>,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      user_id: userId,
      exam_id: "wrong_answer_os",
      subject_id: item.subjectLabel,
      stage: "alpha",
      source_submission_id: item.id,
      source_kind: "wrong_answer",
      status: "pending",
      priority_score: priorityScore,
      raw_payload: { dueAt, reviewReason },
      derived_payload: sanitizeDerivedMetadata(derivedPayload),
    };
    const now = new Date().toISOString();
    const result = await client.from("review_queue_items").insert({
      ...payload,
      created_at: now,
      updated_at: now,
    });
    if (!result.error) return { status: "saved" as const };
    if (result.error.code !== "23505") {
      assertSupabaseOperation("review-os.ensureApp1ReviewQueueEntry.insert", result);
    }
    const existingResult = await client
      .from("review_queue_items")
      .select("id, user_id, exam_id, subject_id, stage, source_submission_id, source_kind, status, priority_score, raw_payload, derived_payload")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureApp1ReviewQueueEntry.selectExisting",
      existingResult,
    );
    if (!existingResult.data) throw new Error("review-os:app1-replay-queue-missing");
    assertApp1ReplayExact(existingResult.data, payload);
    return { status: "deduped" as const };
  }

  async listReviewQueue(userId: string, limit = 10) {
    const client = getUserClient(userId);
    const requestedLimit = Math.max(0, Math.floor(limit));
    if (requestedLimit === 0) return [];

    // Queue rows can outlive their source submission because the legacy table
    // has no foreign-key cascade. Scan in the canonical ranking order until we
    // have enough resolvable cards so an orphaned top row cannot hide a valid
    // learner item. The bound prevents unbounded reads on damaged accounts.
    const scanPageSize = Math.max(25, Math.min(100, requestedLimit * 5));
    const maxScannedRows = 500;
    const cards: ReviewQueueCard[] = [];

    for (
      let offset = 0;
      offset < maxScannedRows && cards.length < requestedLimit;
      offset += scanPageSize
    ) {
      const rangeEnd = Math.min(offset + scanPageSize - 1, maxScannedRows - 1);
      const queueResult = await client
        .from("review_queue_items")
        .select("*")
        .eq("user_id", userId)
        .eq("exam_id", "wrong_answer_os")
        .eq("stage", "alpha")
        .eq("status", "pending")
        .eq("source_kind", "wrong_answer")
        .not("source_submission_id", "is", null)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, rangeEnd);
      assertSupabaseOperation("review-os.listReviewQueue.queue", queueResult);

      const queueRows = (queueResult.data ?? []) as Record<string, unknown>[];
      if (queueRows.length === 0) break;

      const itemIds = [
        ...new Set(
          queueRows
            .map((row) =>
              typeof row.source_submission_id === "string"
                ? row.source_submission_id
                : null,
            )
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      if (itemIds.length > 0) {
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

        const tagsResult = await client
          .from("wrong_answer_tags")
          .select("*")
          .in("wrong_answer_item_id", itemIds);
        assertSupabaseOperation("review-os.listReviewQueue.tags", tagsResult);
        const primaryTagByItemId = new Map<string, WrongAnswerTagRecord>();
        ((tagsResult.data ?? []) as Record<string, unknown>[]).forEach(
          (row) => {
            const tag = mapWrongAnswerTag(row);
            if (!primaryTagByItemId.has(tag.wrongAnswerItemId)) {
              primaryTagByItemId.set(tag.wrongAnswerItemId, tag);
            }
          },
        );

        for (const row of queueRows) {
          const itemId =
            typeof row.source_submission_id === "string"
              ? row.source_submission_id
              : null;
          if (!itemId) continue;
          const item = itemsMap.get(itemId);
          if (!item) continue;
          cards.push(
            mapReviewQueueCard(
              row,
              item,
              primaryTagByItemId.get(itemId) ?? null,
            ),
          );
          if (cards.length === requestedLimit) break;
        }
      }

      if (queueRows.length < rangeEnd - offset + 1) break;
    }

    return cards;
  }

  async archiveReviewQueueItemsForMode(userId: string, queueIds: string[]) {
    if (queueIds.length === 0) return;
    const client = getUserClient(userId);
    const result = await client
      .from("review_queue_items")
      .update({
        status: "skipped",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("exam_id", "wrong_answer_os")
      .in("id", queueIds);
    assertSupabaseOperation("review-os.archiveReviewQueueItemsForMode", result);
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

  private async listReviewQueueForWrongAnswerItem(
    userId: string,
    item: WrongAnswerItemRecord,
    primaryTag: WrongAnswerTagRecord | null,
  ) {
    const client = getUserClient(userId);
    const pageSize = 100;
    const queueRows: Record<string, unknown>[] = [];
    const seenRowIds = new Set<string>();
    let expectedTotal: number | null = null;

    for (let offset = 0; ; offset += pageSize) {
      const result = await client
        .from("review_queue_items")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("exam_id", "wrong_answer_os")
        .eq("stage", "alpha")
        .eq("status", "pending")
        .eq("source_kind", "wrong_answer")
        .eq("source_submission_id", item.id)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);
      assertSupabaseOperation(
        "review-os.listReviewQueueForWrongAnswerItem",
        result,
      );
      if (
        typeof result.count !== "number" ||
        !Number.isSafeInteger(result.count) ||
        result.count < 0
      ) {
        throw new Error("review-os:item-queue-count-unavailable");
      }
      expectedTotal ??= result.count;
      if (result.count !== expectedTotal) {
        throw new Error("review-os:item-queue-changed-during-read");
      }

      const pageRows = (result.data ?? []) as Record<string, unknown>[];
      if (queueRows.length + pageRows.length > expectedTotal) {
        throw new Error("review-os:item-queue-count-mismatch");
      }
      for (const row of pageRows) {
        const rowId = typeof row.id === "string" ? row.id : null;
        if (rowId === null || seenRowIds.has(rowId)) {
          throw new Error("review-os:item-queue-page-identity-invalid");
        }
        seenRowIds.add(rowId);
        queueRows.push(row);
      }

      if (queueRows.length === expectedTotal) break;
      if (pageRows.length === 0) {
        throw new Error("review-os:item-queue-incomplete");
      }
    }

    return queueRows.map((row) =>
      mapReviewQueueCard(row, item, primaryTag),
    );
  }

  async getWrongAnswerDetail(
    userId: string,
    itemId: string,
  ): Promise<WrongAnswerDetail | null> {
    const item = await this.getWrongAnswerItem(userId, itemId);
    if (!item) return null;
    const [note, tags] = await Promise.all([
      this.getWrongAnswerNote(userId, itemId),
      this.listWrongAnswerTags(userId, itemId),
    ]);
    const primaryTag = tags[0] ?? null;
    const [recurrence, reviewQueue] = await Promise.all([
      primaryTag === null
        ? Promise.resolve(null)
        : this.getRecurrenceFeature(
            userId,
            item.examName,
            item.subjectLabel,
            primaryTag.topicTag,
            primaryTag.mistakeType,
          ),
      this.listReviewQueueForWrongAnswerItem(userId, item, primaryTag),
    ]);

    return {
      item,
      note,
      tags,
      recurrence,
      reviewQueue,
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

  async createStudyLog(
    userId: string,
    input: StudyLogInput,
    taxonomy?: {
      taxonomyNodeId: string | null;
      taxonomyCandidates: TaxonomyClassificationCandidate[];
      taxonomyClassificationStatus: "ai_suggested" | "needs_review";
      taxonomyClassificationConfidence: number | null;
    },
  ) {
    const client = getUserClient(userId);
    const id = createUuid();
    const now = new Date().toISOString();
    const result = await client.from("study_logs").insert({
      id,
      user_id: userId,
      mode: input.mode,
      subject: input.subject,
      study_type: input.studyType,
      source_label: input.sourceLabel,
      time_spent_minutes: input.timeSpentMinutes ?? null,
      not_understood: input.notUnderstood,
      revisit_needed: input.revisitNeeded,
      confidence: input.confidence,
      taxonomy_node_id: taxonomy?.taxonomyNodeId ?? null,
      taxonomy_candidates: taxonomy?.taxonomyCandidates ?? [],
      taxonomy_classification_status:
        taxonomy?.taxonomyClassificationStatus ?? "needs_review",
      taxonomy_classification_confidence:
        taxonomy?.taxonomyClassificationConfidence ?? null,
      created_at: now,
      updated_at: now,
    });
    assertSupabaseOperation("review-os.createStudyLog", result);
    return this.getStudyLog(userId, id);
  }

  async getStudyLog(userId: string, logId: string) {
    const client = getUserClient(userId);
    const result = await client
      .from("study_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("id", logId)
      .maybeSingle();
    assertSupabaseOperation("review-os.getStudyLog", result);
    return result.data
      ? mapStudyLog(result.data as Record<string, unknown>)
      : null;
  }

  async listStudyLogs(userId: string, mode?: "first" | "second", limit = 10) {
    const client = getUserClient(userId);
    let query = client
      .from("study_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mode) {
      query = query.eq("mode", mode);
    }
    const result = await query;
    assertSupabaseOperation("review-os.listStudyLogs", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(mapStudyLog);
  }

  async insertActionSeed(
    userId: string,
    input: Omit<ActionSeedRecord, "id" | "userId" | "createdAt">,
  ) {
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

  async listActionSeeds(
    userId: string,
    sourceType?: ActionSeedRecord["sourceType"],
    limit = 10,
  ) {
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
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapActionSeed,
    );
  }

  async createLearningSignalEvent(
    userId: string,
    input: LearningSignalEventInput,
  ) {
    const client = getUserClient(userId);
    const result = await client.from("learning_signal_events").insert({
      id: createUuid(),
      user_id: userId,
      exam_mode: input.examMode,
      subject: input.subject,
      source_type: input.sourceType,
      derived_tags: input.derivedTags,
      related_formulas: input.relatedFormulas,
      next_task_type: input.nextTaskType,
      next_task: input.nextTask,
      metadata_json: sanitizeLearningSignalMetadata(input.metadataJson ?? {}),
    });
    assertSupabaseOperation("review-os.createLearningSignalEvent", result);
  }

  async createLearningSignalEventWithId(
    userId: string,
    id: string,
    input: LearningSignalEventInput,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      user_id: userId,
      exam_mode: input.examMode,
      subject: input.subject,
      source_type: input.sourceType,
      derived_tags: input.derivedTags,
      related_formulas: input.relatedFormulas,
      next_task_type: input.nextTaskType,
      next_task: input.nextTask,
      metadata_json: sanitizeLearningSignalMetadata(input.metadataJson ?? {}),
    };
    const result = await client
      .from("learning_signal_events")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (result.error?.code === "23505") {
      const existingResult = await client
        .from("learning_signal_events")
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle();
      assertSupabaseOperation(
        "review-os.createLearningSignalEventWithId.selectExisting",
        existingResult,
      );
      const existing = existingResult.data as Record<string, unknown> | null;
      if (!existing)
        throw new Error("calculator-routine-learning-event-dedupe-missing");
      return {
        status: "deduped" as const,
        record: mapLearningSignalEvent(existing),
      };
    }
    assertSupabaseOperation(
      "review-os.createLearningSignalEventWithId",
      result,
    );
    const record = result.data as Record<string, unknown> | null;
    if (!record)
      throw new Error("calculator-routine-learning-event-insert-missing");
    return { status: "saved" as const, record: mapLearningSignalEvent(record) };
  }

  async ensureApp1LearningSignalEvent(
    userId: string,
    id: string,
    input: LearningSignalEventInput,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      user_id: userId,
      exam_mode: input.examMode,
      subject: input.subject,
      source_type: input.sourceType,
      derived_tags: input.derivedTags,
      related_formulas: input.relatedFormulas,
      next_task_type: input.nextTaskType,
      next_task: input.nextTask,
      metadata_json: sanitizeLearningSignalMetadata(input.metadataJson ?? {}),
    };
    const result = await client.from("learning_signal_events").insert(payload);
    if (!result.error) return { status: "saved" as const };
    if (result.error.code !== "23505") {
      assertSupabaseOperation(
        "review-os.ensureApp1LearningSignalEvent.insert",
        result,
      );
    }
    const existingResult = await client
      .from("learning_signal_events")
      .select("id, user_id, exam_mode, subject, source_type, derived_tags, related_formulas, next_task_type, next_task, metadata_json")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureApp1LearningSignalEvent.selectExisting",
      existingResult,
    );
    if (!existingResult.data) {
      throw new Error("review-os:app1-replay-learning-signal-missing");
    }
    assertApp1ReplayExact(existingResult.data, payload);
    return { status: "deduped" as const };
  }

  async listLearningSignalEvents(
    userId: string,
    mode: AppraisalMode,
    limit = 30,
  ) {
    const client = getUserClient(userId);
    const result = await client
      .from("learning_signal_events")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_mode", getExamModeLabel(mode))
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listLearningSignalEvents", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapLearningSignalEvent,
    );
  }

  async countLearningSignalEvents(userId: string, mode: AppraisalMode) {
    const client = getUserClient(userId);
    const result = await client
      .from("learning_signal_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("exam_mode", getExamModeLabel(mode));
    assertSupabaseOperation("review-os.countLearningSignalEvents", result);
    return result.count ?? 0;
  }

  async listRecentUsageEventsByNames(
    userId: string,
    eventNames: string[],
    sinceIso: string,
    limit = 60,
  ) {
    const client = getUserClient(userId);
    const result = await client
      .from("usage_events")
      .select("*")
      .eq("user_id", userId)
      .in("event_name", eventNames)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listRecentUsageEventsByNames", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapUsageEvent,
    );
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
      metadata_json: sanitizeDerivedMetadata(metadataJson),
    });
    assertSupabaseOperation("review-os.logUsageEvent", result);
  }

  async ensureApp1UsageEvent(
    userId: string,
    id: string,
    eventName: string,
    entityType: string | null,
    entityId: string | null,
    metadataJson: Record<string, unknown>,
  ) {
    const client = getUserClient(userId);
    const payload = {
      id,
      user_id: userId,
      event_name: eventName,
      entity_type: entityType,
      entity_id: entityId,
      metadata_json: sanitizeDerivedMetadata(metadataJson),
    };
    const result = await client.from("usage_events").insert(payload);
    if (!result.error) return { status: "saved" as const };
    if (result.error.code !== "23505") {
      assertSupabaseOperation("review-os.ensureApp1UsageEvent.insert", result);
    }
    const existingResult = await client
      .from("usage_events")
      .select("id, user_id, event_name, entity_type, entity_id, metadata_json")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    assertSupabaseOperation(
      "review-os.ensureApp1UsageEvent.selectExisting",
      existingResult,
    );
    if (!existingResult.data) throw new Error("review-os:app1-replay-usage-missing");
    assertApp1ReplayExact(existingResult.data, payload);
    return { status: "deduped" as const };
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
    const result = await client
      .from("usage_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listRecentUsageEvents", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapUsageEvent,
    );
  }

  async listRecentFeedback(limit = 100) {
    const client = getAdminClient();
    const result = await client
      .from("feedback_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    assertSupabaseOperation("review-os.listRecentFeedback", result);
    return ((result.data ?? []) as Record<string, unknown>[]).map(
      mapFeedbackItem,
    );
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
