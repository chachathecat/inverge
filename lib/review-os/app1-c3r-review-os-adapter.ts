import crypto from "node:crypto";

import type { WrongAnswerItemRecord } from "./types";
import {
  buildApp1C3rHandoffCandidateV1,
  type App1C3rHandoffCandidateV1,
} from "./app1-c3r-handoff";
import {
  materializeApp1C3rHandoffH0V1,
  type App1C3rHandoffPersistencePortV1,
  type DurableC3rJourneyV1,
} from "./app1-c3r-handoff-runtime";

export const APP1_C3R_REVIEW_OS_ADAPTER_VERSION =
  "app1_c3r_review_os_adapter.v1" as const;

export const APP1_C3R_REVIEW_OS_ADAPTER_ERROR_CODES = Object.freeze([
  "INVALID_ITEM",
  "INVALID_REPLAY_PLAN",
  "JOURNEY_PERSISTENCE_CONFLICT",
  "REVIEW_QUEUE_MISSING",
  "REVIEW_QUEUE_BINDING_CONFLICT",
] as const);

export type App1C3rReviewOsAdapterErrorCode =
  (typeof APP1_C3R_REVIEW_OS_ADAPTER_ERROR_CODES)[number];

export class App1C3rReviewOsAdapterError extends Error {
  readonly code: App1C3rReviewOsAdapterErrorCode;

  constructor(code: App1C3rReviewOsAdapterErrorCode) {
    super(`app1-c3r-review-os-adapter:${code}`);
    this.name = "App1C3rReviewOsAdapterError";
    this.code = code;
  }
}

export type App1C3rJourneyProjectionV1 = Readonly<{
  contractVersion: typeof APP1_C3R_REVIEW_OS_ADAPTER_VERSION;
  journeyId: string;
  journeyKey: string;
  app1ReceiptId: string;
  userId: string;
  itemId: string;
  repairRevisionId: string;
  reviewUnitId: string;
  reviewUnitKey: string;
  d1DueAt: string;
  track: App1C3rHandoffCandidateV1["track"];
  c3rRoute: string;
  subject: string;
  state: "REPAIRED_AWAITING_D1";
  masteryCreated: false;
  transferCreated: false;
  containsRawContent: false;
  createdAt: string;
}>;

export type App1C3rReviewQueueSnapshotV1 = Readonly<{
  reviewUnitId: string;
  userId: string;
  itemId: string;
  subject: string;
  status: "pending" | "completed";
  dueAt: string;
  recurrenceCount: number;
}>;

export type App1C3rReviewOsStoragePortV1 = Readonly<{
  ensureJourneyProjection: (
    projection: App1C3rJourneyProjectionV1,
  ) => Promise<Readonly<{
    status: "created" | "existing";
    value: App1C3rJourneyProjectionV1;
  }>>;
  loadReviewQueueUnit: (input: Readonly<{
    userId: string;
    reviewUnitId: string;
    itemId: string;
  }>) => Promise<App1C3rReviewQueueSnapshotV1 | null>;
}>;

const APP1_REPLAY_SNAPSHOT_KEY = "app1_post_insert_replay_v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function reject(code: App1C3rReviewOsAdapterErrorCode): never {
  throw new App1C3rReviewOsAdapterError(code);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function canonicalUtc(value: unknown): value is string {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(source[key])}`)
    .join(",")}}`;
}

function deterministicUuid(value: unknown) {
  const hex = crypto
    .createHash("sha256")
    .update(stableJson(value), "utf8")
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function readReplayPlan(item: WrongAnswerItemRecord, userId: string) {
  if (
    !item ||
    typeof item !== "object" ||
    !UUID_PATTERN.test(item.id) ||
    !canonicalUtc(item.updatedAt) ||
    item.userId !== userId ||
    item.examName !== "감정평가사 2차"
  ) {
    reject("INVALID_ITEM");
  }
  const rawPayload = record(item.rawPayload);
  const replay = record(rawPayload?.[APP1_REPLAY_SNAPSHOT_KEY]);
  if (!replay) return null;
  const learningSignal = record(replay.learningSignal);
  const metadata = record(learningSignal?.metadataJson);
  const candidate = record(metadata?.app1_c3r_handoff_candidate);
  if (!candidate) return null;
  const confirmed = record(rawPayload?.user_confirmed_fields);
  const queuePlan = record(replay.queue);
  const scheduleInput = record(queuePlan?.scheduleInput);
  const expectedCandidate = buildApp1C3rHandoffCandidateV1({
    itemId: item.id,
    examName: item.examName,
    subject: item.subjectLabel,
    conceptNodeId: candidate.conceptNodeId as string,
    createdFromCapture: true,
    hasRepairTarget: true,
    hasRepairDirective: true,
  });
  if (
    replay.itemId !== item.id ||
    !nonEmpty(replay.queueId) ||
    !UUID_PATTERN.test(replay.queueId) ||
    !nonEmpty(replay.learningSignalId) ||
    !UUID_PATTERN.test(replay.learningSignalId) ||
    !nonEmpty(replay.workRevisionId) ||
    !confirmed ||
    confirmed.persistence_work_revision_id !== replay.workRevisionId ||
    candidate.sourceItemId !== item.id ||
    !expectedCandidate ||
    stableJson(candidate) !== stableJson(expectedCandidate) ||
    !scheduleInput ||
    scheduleInput.mode !== "second" ||
    typeof scheduleInput.isCorrect !== "boolean" ||
    !["낮음", "중간", "높음"].includes(String(scheduleInput.confidence)) ||
    !nonEmpty(scheduleInput.mistakeType) ||
    typeof scheduleInput.hasWeakParagraph !== "boolean" ||
    !canonicalUtc(scheduleInput.scheduledAt) ||
    (scheduleInput.nextReviewDateOverride !== null &&
      (!nonEmpty(scheduleInput.nextReviewDateOverride) ||
        !Number.isFinite(Date.parse(scheduleInput.nextReviewDateOverride))))
  ) {
    reject("INVALID_REPLAY_PLAN");
  }
  return Object.freeze({
    candidate: candidate as unknown as App1C3rHandoffCandidateV1,
    queueId: replay.queueId,
    learningSignalId: replay.learningSignalId,
    repairRevisionId: replay.workRevisionId,
    scheduleInput: Object.freeze({
      mode: "second" as const,
      isCorrect: scheduleInput.isCorrect,
      confidence: scheduleInput.confidence as
        | "낮음"
        | "중간"
        | "높음",
      mistakeType: scheduleInput.mistakeType,
      hasWeakParagraph: scheduleInput.hasWeakParagraph,
      scheduledAt: scheduleInput.scheduledAt,
      nextReviewDateOverride: scheduleInput.nextReviewDateOverride as
        | string
        | null,
    }),
  });
}

function exactD1QueueDueAt(
  replay: NonNullable<ReturnType<typeof readReplayPlan>>,
) {
  const nextDay = new Date(replay.scheduleInput.scheduledAt);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDate = nextDay.toISOString().slice(0, 10);
  if (replay.scheduleInput.nextReviewDateOverride !== nextDate) {
    reject("REVIEW_QUEUE_BINDING_CONFLICT");
  }
  return `${nextDate}T00:00:00.000Z`;
}

function assertProjection(
  actual: App1C3rJourneyProjectionV1,
  expected: App1C3rJourneyProjectionV1,
) {
  if (stableJson(actual) !== stableJson(expected)) {
    reject("JOURNEY_PERSISTENCE_CONFLICT");
  }
}

export async function materializeApp1C3rReviewOsAdapterV1(input: Readonly<{
  userId: string;
  item: WrongAnswerItemRecord;
  storage: App1C3rReviewOsStoragePortV1;
}>) {
  if (!nonEmpty(input?.userId) || !input?.storage) reject("INVALID_ITEM");
  const replay = readReplayPlan(input.item, input.userId);
  if (!replay) return null;

  const queue = await input.storage.loadReviewQueueUnit({
    userId: input.userId,
    reviewUnitId: replay.queueId,
    itemId: input.item.id,
  });
  if (!queue) reject("REVIEW_QUEUE_MISSING");
  if (
    queue.reviewUnitId !== replay.queueId ||
    queue.userId !== input.userId ||
    queue.itemId !== input.item.id ||
    queue.subject !== input.item.subjectLabel ||
    !["pending", "completed"].includes(queue.status) ||
    !canonicalUtc(queue.dueAt) ||
    queue.recurrenceCount !== 1 ||
    queue.dueAt !== exactD1QueueDueAt(replay)
  ) {
    reject("REVIEW_QUEUE_BINDING_CONFLICT");
  }

  const journeyId = deterministicUuid({
    domain: "APP1_C3R_JOURNEY_PROJECTION_V1",
    userId: input.userId,
    journeyKey: replay.candidate.journeyKey,
  });
  const port: App1C3rHandoffPersistencePortV1 = Object.freeze({
    async ensureJourney(journeyInput) {
      const projection: App1C3rJourneyProjectionV1 = Object.freeze({
        contractVersion: APP1_C3R_REVIEW_OS_ADAPTER_VERSION,
        journeyId,
        journeyKey: journeyInput.journeyKey,
        app1ReceiptId: replay.learningSignalId,
        userId: input.userId,
        itemId: journeyInput.itemId,
        repairRevisionId: journeyInput.repairRevisionId,
        reviewUnitId: queue.reviewUnitId,
        reviewUnitKey: replay.candidate.reviewUnitKey,
        d1DueAt: queue.dueAt,
        track: journeyInput.track,
        c3rRoute: journeyInput.c3rRoute,
        subject: input.item.subjectLabel,
        state: "REPAIRED_AWAITING_D1",
        masteryCreated: false,
        transferCreated: false,
        containsRawContent: false,
        createdAt: input.item.updatedAt,
      });
      const ensured = await input.storage.ensureJourneyProjection(projection);
      if (!ensured || !["created", "existing"].includes(ensured.status)) {
        reject("JOURNEY_PERSISTENCE_CONFLICT");
      }
      assertProjection(ensured.value, projection);
      const value: DurableC3rJourneyV1 = Object.freeze({
        journeyId,
        journeyKey: projection.journeyKey,
        itemId: projection.itemId,
        repairRevisionId: projection.repairRevisionId,
        track: projection.track,
        c3rRoute: projection.c3rRoute,
        durable: true,
      });
      return Object.freeze({ status: ensured.status, value });
    },
    async ensureD1ReviewUnit(reviewInput) {
      if (
        reviewInput.reviewUnitKey !== replay.candidate.reviewUnitKey ||
        reviewInput.journey.journeyId !== journeyId ||
        reviewInput.itemId !== queue.itemId ||
        reviewInput.dueAt !== queue.dueAt
      ) {
        reject("REVIEW_QUEUE_BINDING_CONFLICT");
      }
      return Object.freeze({
        status: "existing" as const,
        value: Object.freeze({
          reviewUnitId: queue.reviewUnitId,
          reviewUnitKey: reviewInput.reviewUnitKey,
          journeyId,
          itemId: queue.itemId,
          dueKind: "D1" as const,
          dueAt: queue.dueAt,
          assistanceClass: "NONE" as const,
          learnerVisible: true as const,
          requiresUnaidedAttempt: true as const,
          durable: true as const,
        }),
      });
    },
  });

  const materialized = await materializeApp1C3rHandoffH0V1({
    candidate: replay.candidate,
    app1ReceiptId: replay.learningSignalId,
    repairRevisionId: replay.repairRevisionId,
    persistedAt: input.item.updatedAt,
    d1DueAt: queue.dueAt,
    port,
  });
  return Object.freeze({
    adapterVersion: APP1_C3R_REVIEW_OS_ADAPTER_VERSION,
    queueReused: true as const,
    duplicateQueueCreated: false as const,
    dedicatedC3rEvidenceMutated: false as const,
    ...materialized,
  });
}
