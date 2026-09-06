import {
  CORE_BLITZ_WAVE1_CONTRACT_VERSION,
  assertApp1C3rHandoffH0V1,
} from "../core-blitz/wave1";
import {
  APP1_C3R_HANDOFF_CANDIDATE_VERSION,
  type App1C3rHandoffCandidateV1,
  type App1C3rTrack,
} from "./app1-c3r-handoff";

export const APP1_C3R_HANDOFF_RUNTIME_VERSION =
  "app1_c3r_handoff_runtime.v1" as const;

export const APP1_C3R_HANDOFF_RUNTIME_ERROR_CODES = Object.freeze([
  "INVALID_INPUT",
  "CANDIDATE_NOT_ELIGIBLE",
  "NON_DURABLE_RESULT",
  "JOURNEY_BINDING_CONFLICT",
  "REVIEW_UNIT_BINDING_CONFLICT",
] as const);

export type App1C3rHandoffRuntimeErrorCode =
  (typeof APP1_C3R_HANDOFF_RUNTIME_ERROR_CODES)[number];

export class App1C3rHandoffRuntimeError extends Error {
  readonly code: App1C3rHandoffRuntimeErrorCode;

  constructor(code: App1C3rHandoffRuntimeErrorCode) {
    super(`app1-c3r-handoff-runtime:${code}`);
    this.name = "App1C3rHandoffRuntimeError";
    this.code = code;
  }
}

export type DurableC3rJourneyV1 = Readonly<{
  journeyId: string;
  journeyKey: string;
  itemId: string;
  repairRevisionId: string;
  track: App1C3rTrack;
  c3rRoute: string;
  durable: true;
}>;

export type DurableD1ReviewUnitV1 = Readonly<{
  reviewUnitId: string;
  reviewUnitKey: string;
  journeyId: string;
  itemId: string;
  dueKind: "D1";
  dueAt: string;
  assistanceClass: "NONE";
  learnerVisible: true;
  requiresUnaidedAttempt: true;
  durable: true;
}>;

export type DurableEnsureResultV1<T> = Readonly<{
  status: "created" | "existing";
  value: T;
}>;

export type App1C3rHandoffPersistencePortV1 = Readonly<{
  ensureJourney: (input: Readonly<{
    journeyKey: string;
    itemId: string;
    repairRevisionId: string;
    track: App1C3rTrack;
    c3rRoute: string;
  }>) => Promise<DurableEnsureResultV1<DurableC3rJourneyV1>>;
  ensureD1ReviewUnit: (input: Readonly<{
    reviewUnitKey: string;
    journey: DurableC3rJourneyV1;
    itemId: string;
    dueAt: string;
  }>) => Promise<DurableEnsureResultV1<DurableD1ReviewUnitV1>>;
}>;

function reject(code: App1C3rHandoffRuntimeErrorCode): never {
  throw new App1C3rHandoffRuntimeError(code);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function canonicalUtc(value: unknown) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function candidateEligible(candidate: App1C3rHandoffCandidateV1) {
  return (
    candidate.schemaVersion === APP1_C3R_HANDOFF_CANDIDATE_VERSION &&
    candidate.state === "D1_UNAIDED_REVIEW_REQUIRED" &&
    candidate.reviewPhase === "D1" &&
    candidate.assistanceClass === "NONE" &&
    candidate.learnerVisible === true &&
    candidate.requiresUnaidedAttempt === true &&
    candidate.sameItemMasteryGainAllowed === false &&
    candidate.transferEvidenceEligible === false &&
    candidate.durableC3rJourneyCreated === false &&
    candidate.durableReviewUnitCreated === false &&
    candidate.authority === "EXISTING_C3R_AND_REVIEW_QUEUE_ONLY" &&
    nonEmpty(candidate.sourceItemId) &&
    nonEmpty(candidate.journeyKey) &&
    nonEmpty(candidate.reviewUnitKey) &&
    nonEmpty(candidate.c3rRoute)
  );
}

export async function materializeApp1C3rHandoffH0V1(input: Readonly<{
  candidate: App1C3rHandoffCandidateV1;
  app1ReceiptId: string;
  repairRevisionId: string;
  persistedAt: string;
  d1DueAt: string;
  port: App1C3rHandoffPersistencePortV1;
}>) {
  if (!input || typeof input !== "object" || !input.port) {
    reject("INVALID_INPUT");
  }
  if (!candidateEligible(input.candidate)) reject("CANDIDATE_NOT_ELIGIBLE");
  if (
    !nonEmpty(input.app1ReceiptId) ||
    !nonEmpty(input.repairRevisionId) ||
    !canonicalUtc(input.persistedAt) ||
    !canonicalUtc(input.d1DueAt) ||
    Date.parse(input.d1DueAt) <= Date.parse(input.persistedAt)
  ) {
    reject("INVALID_INPUT");
  }

  const journeyResult = await input.port.ensureJourney({
    journeyKey: input.candidate.journeyKey,
    itemId: input.candidate.sourceItemId,
    repairRevisionId: input.repairRevisionId,
    track: input.candidate.track,
    c3rRoute: input.candidate.c3rRoute,
  });
  const journey = journeyResult?.value;
  if (!journey || journey.durable !== true) reject("NON_DURABLE_RESULT");
  if (
    journey.journeyKey !== input.candidate.journeyKey ||
    journey.itemId !== input.candidate.sourceItemId ||
    journey.repairRevisionId !== input.repairRevisionId ||
    journey.track !== input.candidate.track ||
    journey.c3rRoute !== input.candidate.c3rRoute
  ) {
    reject("JOURNEY_BINDING_CONFLICT");
  }

  const reviewResult = await input.port.ensureD1ReviewUnit({
    reviewUnitKey: input.candidate.reviewUnitKey,
    journey,
    itemId: input.candidate.sourceItemId,
    dueAt: input.d1DueAt,
  });
  const reviewUnit = reviewResult?.value;
  if (!reviewUnit || reviewUnit.durable !== true) reject("NON_DURABLE_RESULT");
  if (
    reviewUnit.reviewUnitKey !== input.candidate.reviewUnitKey ||
    reviewUnit.journeyId !== journey.journeyId ||
    reviewUnit.itemId !== input.candidate.sourceItemId ||
    reviewUnit.dueKind !== "D1" ||
    reviewUnit.dueAt !== input.d1DueAt ||
    reviewUnit.assistanceClass !== "NONE" ||
    reviewUnit.learnerVisible !== true ||
    reviewUnit.requiresUnaidedAttempt !== true
  ) {
    reject("REVIEW_UNIT_BINDING_CONFLICT");
  }

  const h0Receipt = assertApp1C3rHandoffH0V1({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    app1Receipt: {
      receiptId: input.app1ReceiptId,
      itemId: input.candidate.sourceItemId,
      repairRevisionId: input.repairRevisionId,
    },
    c3rJourney: {
      journeyId: journey.journeyId,
      itemId: journey.itemId,
      repairRevisionId: journey.repairRevisionId,
    },
    d1ReviewUnits: [
      {
        reviewUnitId: reviewUnit.reviewUnitId,
        journeyId: reviewUnit.journeyId,
        itemId: reviewUnit.itemId,
        dueKind: "D1",
        assistanceClass: "NONE",
        learnerVisible: true,
        requiresUnaidedAttempt: true,
      },
    ],
  });

  return Object.freeze({
    contractVersion: APP1_C3R_HANDOFF_RUNTIME_VERSION,
    outcome: "APP1_C3R_HANDOFF_H0_MATERIALIZED" as const,
    journeyStatus: journeyResult.status,
    reviewUnitStatus: reviewResult.status,
    journey,
    reviewUnit,
    h0Receipt,
  });
}
