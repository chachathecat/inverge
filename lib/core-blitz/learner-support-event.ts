import {
  LEARNER_ENTRY_CHOICES,
  resolveLearnerEntryChoiceV1,
  type LearnerEntryChoice,
} from "./learner-capability";

export const LEARNER_SUPPORT_EVENT_VERSION =
  "DabangilLearnerSupportUsageEventV1" as const;
export const LEARNER_SUPPORT_EVENT_NAME =
  "learner_support_choice_recorded" as const;
export const LEARNER_SUPPORT_SURFACES = Object.freeze([
  "ANSWER_REVIEW_RESULT",
  "STUDY_LEDGER_DETAIL",
  "APP1_COMPLETION",
] as const);

export type LearnerSupportSurface =
  (typeof LEARNER_SUPPORT_SURFACES)[number];

export const LEARNER_SUPPORT_EVENT_ERROR_CODES = Object.freeze([
  "INVALID_INPUT",
  "INVALID_IDENTITY",
  "INVALID_TIMESTAMP",
  "INVALID_CHOICE",
  "INVALID_SURFACE",
] as const);

export type LearnerSupportEventErrorCode =
  (typeof LEARNER_SUPPORT_EVENT_ERROR_CODES)[number];

export class LearnerSupportEventError extends Error {
  readonly code: LearnerSupportEventErrorCode;

  constructor(code: LearnerSupportEventErrorCode) {
    super(`learner-support-event:${code}`);
    this.name = "LearnerSupportEventError";
    this.code = code;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const INPUT_KEYS = Object.freeze([
  "choice",
  "eventId",
  "itemId",
  "occurredAt",
  "surface",
] as const);

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : null;
}

function exactKeys(value: Record<string, unknown>) {
  const actual = Object.keys(value).sort();
  const expected = [...INPUT_KEYS].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function canonicalUtc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export type LearnerSupportUsageEventV1 = Readonly<{
  contractVersion: typeof LEARNER_SUPPORT_EVENT_VERSION;
  eventId: string;
  eventName: typeof LEARNER_SUPPORT_EVENT_NAME;
  entityType: "wrong_answer_item";
  entityId: string;
  occurredAt: string;
  metadataJson: Readonly<{
    contractVersion: typeof LEARNER_SUPPORT_EVENT_VERSION;
    choice: LearnerEntryChoice;
    surface: LearnerSupportSurface;
    assistanceClass: ReturnType<
      typeof resolveLearnerEntryChoiceV1
    >["assistanceClass"];
    independentAttemptEligible: boolean;
    sameItemMasteryEvidenceEligible: boolean;
    transferEvidenceEligible: boolean;
    requiresDistinctUnaidedAttempt: boolean;
    masteryCreatedByChoice: false;
    transferCreatedByChoice: false;
    containsRawContent: false;
    occurredAt: string;
  }>;
}>;

export function buildLearnerSupportUsageEventV1(
  input: unknown,
): LearnerSupportUsageEventV1 {
  const value = record(input);
  if (!value || !exactKeys(value)) {
    throw new LearnerSupportEventError("INVALID_INPUT");
  }
  if (
    typeof value.eventId !== "string" ||
    typeof value.itemId !== "string" ||
    !UUID_PATTERN.test(value.eventId) ||
    !UUID_PATTERN.test(value.itemId)
  ) {
    throw new LearnerSupportEventError("INVALID_IDENTITY");
  }
  if (!canonicalUtc(value.occurredAt)) {
    throw new LearnerSupportEventError("INVALID_TIMESTAMP");
  }
  if (
    typeof value.choice !== "string" ||
    !LEARNER_ENTRY_CHOICES.includes(value.choice as LearnerEntryChoice)
  ) {
    throw new LearnerSupportEventError("INVALID_CHOICE");
  }
  if (
    typeof value.surface !== "string" ||
    !LEARNER_SUPPORT_SURFACES.includes(value.surface as LearnerSupportSurface)
  ) {
    throw new LearnerSupportEventError("INVALID_SURFACE");
  }

  const choice = value.choice as LearnerEntryChoice;
  const surface = value.surface as LearnerSupportSurface;
  const decision = resolveLearnerEntryChoiceV1(choice);
  const metadataJson = Object.freeze({
    contractVersion: LEARNER_SUPPORT_EVENT_VERSION,
    choice,
    surface,
    assistanceClass: decision.assistanceClass,
    independentAttemptEligible: decision.independentAttemptEligible,
    sameItemMasteryEvidenceEligible:
      decision.sameItemMasteryEvidenceEligible,
    transferEvidenceEligible: decision.transferEvidenceEligible,
    requiresDistinctUnaidedAttempt:
      decision.nextRequiredAction === "DISTINCT_UNAIDED_ATTEMPT_REQUIRED",
    masteryCreatedByChoice: false as const,
    transferCreatedByChoice: false as const,
    containsRawContent: false as const,
    occurredAt: value.occurredAt,
  });

  return Object.freeze({
    contractVersion: LEARNER_SUPPORT_EVENT_VERSION,
    eventId: value.eventId,
    eventName: LEARNER_SUPPORT_EVENT_NAME,
    entityType: "wrong_answer_item" as const,
    entityId: value.itemId,
    occurredAt: value.occurredAt,
    metadataJson,
  });
}
