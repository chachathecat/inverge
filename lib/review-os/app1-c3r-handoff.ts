export const APP1_C3R_HANDOFF_CANDIDATE_VERSION =
  "app1_c3r_handoff_candidate.v1" as const;

export const APP1_C3R_TRACKS = ["PRACTICE", "THEORY", "LAW"] as const;
export type App1C3rTrack = (typeof APP1_C3R_TRACKS)[number];

const APP1_DETERMINISTIC_REPAIR_ITEM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/iu;

const APP1_C3R_SUBJECT_BINDINGS: Readonly<
  Record<string, Readonly<{ track: App1C3rTrack; route: string }>>
> = Object.freeze({
  감정평가실무: Object.freeze({ track: "PRACTICE", route: "/app/c3r-p" }),
  감정평가이론: Object.freeze({ track: "THEORY", route: "/app/c3r-t" }),
  "감정평가 및 보상법규": Object.freeze({
    track: "LAW",
    route: "/app/c3r-l",
  }),
});

export type App1C3rHandoffCandidateV1 = Readonly<{
  schemaVersion: typeof APP1_C3R_HANDOFF_CANDIDATE_VERSION;
  state: "D1_UNAIDED_REVIEW_REQUIRED";
  sourceItemId: string;
  conceptNodeId: string;
  track: App1C3rTrack;
  c3rRoute: string;
  journeyKey: string;
  reviewUnitKey: string;
  reviewPhase: "D1";
  assistanceClass: "NONE";
  learnerVisible: true;
  requiresUnaidedAttempt: true;
  sameItemMasteryGainAllowed: false;
  transferEvidenceEligible: false;
  durableC3rJourneyCreated: false;
  durableReviewUnitCreated: false;
  authority: "EXISTING_C3R_AND_REVIEW_QUEUE_ONLY";
}>;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isApp1DeterministicRepairItemIdV1(value: unknown): value is string {
  return (
    typeof value === "string" &&
    APP1_DETERMINISTIC_REPAIR_ITEM_ID_PATTERN.test(value)
  );
}

export function buildApp1C3rHandoffCandidateV1(input: Readonly<{
  itemId: string;
  examName: string;
  subject: string;
  conceptNodeId: string;
  createdFromCapture: boolean;
  hasRepairTarget: boolean;
  hasRepairDirective: boolean;
}>): App1C3rHandoffCandidateV1 | null {
  const binding = APP1_C3R_SUBJECT_BINDINGS[input.subject];
  if (
    input.examName !== "감정평가사 2차" ||
    input.createdFromCapture !== true ||
    input.hasRepairTarget !== true ||
    input.hasRepairDirective !== true ||
    !binding ||
    !isApp1DeterministicRepairItemIdV1(input.itemId) ||
    !nonEmpty(input.conceptNodeId)
  ) {
    return null;
  }

  const trackKey = binding.track.toLowerCase();
  return Object.freeze({
    schemaVersion: APP1_C3R_HANDOFF_CANDIDATE_VERSION,
    state: "D1_UNAIDED_REVIEW_REQUIRED",
    sourceItemId: input.itemId,
    conceptNodeId: input.conceptNodeId,
    track: binding.track,
    c3rRoute: binding.route,
    journeyKey: `app1-c3r:${trackKey}:${input.itemId}`,
    reviewUnitKey: `app1-c3r:${trackKey}:${input.itemId}:d1`,
    reviewPhase: "D1",
    assistanceClass: "NONE",
    learnerVisible: true,
    requiresUnaidedAttempt: true,
    sameItemMasteryGainAllowed: false,
    transferEvidenceEligible: false,
    durableC3rJourneyCreated: false,
    durableReviewUnitCreated: false,
    authority: "EXISTING_C3R_AND_REVIEW_QUEUE_ONLY",
  });
}
