export const CORE_BLITZ_WAVE1_CONTRACT_VERSION =
  "dabangil.core_blitz.wave1.v1" as const;
export const CORE_BLITZ_STARTING_MAIN =
  "d4e056938707c11e6c862230745c381297c0b26f" as const;
export const CORE_BLITZ_STARTING_TREE =
  "c19f7abe3f0ace8ecdc8afbe9647a8e31eb4dfc2" as const;

export const ASSISTANCE_CLASSES = [
  "NONE",
  "MINIMAL_HINT",
  "GUIDED_EXPLANATION",
  "EASY_EXPLANATION",
  "FULL_SOLUTION_REVEALED",
  "DIRECT_ANSWER_REVEALED",
] as const;
export type AssistanceClass = (typeof ASSISTANCE_CLASSES)[number];

export const QUESTION_BANK_CLASSES = [
  "LEARNING_PRACTICE",
  "VERIFIED_TRANSFER",
  "MEASUREMENT",
] as const;
export type QuestionBankClass = (typeof QUESTION_BANK_CLASSES)[number];

export const CORE_BLITZ_ERROR_CODES = [
  "INVALID_INPUT",
  "RAW_BODY_FORBIDDEN",
  "H0_EXACTLY_ONE_D1_REVIEW_UNIT_REQUIRED",
  "H0_D1_BINDING_MISMATCH",
  "H0_UNAIDED_CHECK_REQUIRED",
  "BANK_RIGHTS_REQUIRED",
  "BANK_CURRENT_SOURCE_REQUIRED",
  "BANK_RELEASE_CHAIN_REQUIRED",
  "BANK_UNSEEN_SNAPSHOT_REQUIRED",
  "BANK_NON_SAME_SURFACE_REQUIRED",
  "BANK_FAMILY_ISOLATION_REQUIRED",
  "BANK_MEASUREMENT_CALIBRATION_REQUIRED",
  "BANK_TIMED_PROTOCOL_REQUIRED",
  "CHECKPOINT_SCOPE_DRIFT",
  "CHECKPOINT_MAIN_DRIFT",
  "CHECKPOINT_DUPLICATE_NODE",
  "CHECKPOINT_UNKNOWN_DEPENDENCY",
] as const;
export type CoreBlitzErrorCode = (typeof CORE_BLITZ_ERROR_CODES)[number];

export class CoreBlitzWave1Error extends Error {
  readonly code: CoreBlitzErrorCode;
  constructor(code: CoreBlitzErrorCode) {
    super(code);
    this.name = "CoreBlitzWave1Error";
    this.code = code;
  }
}

const RAW_BODY_KEYS = new Set([
  "question", "questionBody", "answer", "answerBody", "referenceAnswer",
  "prompt", "response", "ocr", "ocrText", "learnerBody", "providerPayload",
]);

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
}
function assertString(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
}
function assertClosedMetadata(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) assertClosedMetadata(entry);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (RAW_BODY_KEYS.has(key)) throw new CoreBlitzWave1Error("RAW_BODY_FORBIDDEN");
    assertClosedMetadata(entry);
  }
}

export function classifyAssistanceV1(assistanceClass: AssistanceClass) {
  if (!ASSISTANCE_CLASSES.includes(assistanceClass)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  const independent = assistanceClass === "NONE";
  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    assistanceClass,
    independentAttemptEligible: independent,
    sameItemMasteryGainAllowed: independent,
    transferEvidenceEligible: independent,
    requiresDistinctUnaidedAttempt: !independent,
  });
}

export type App1C3rHandoffInputV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  app1Receipt: Readonly<{ receiptId: string; itemId: string; repairRevisionId: string }>;
  c3rJourney: Readonly<{ journeyId: string; itemId: string; repairRevisionId: string }>;
  d1ReviewUnits: readonly Readonly<{
    reviewUnitId: string;
    journeyId: string;
    itemId: string;
    dueKind: "D1";
    assistanceClass: AssistanceClass;
    learnerVisible: boolean;
    requiresUnaidedAttempt: boolean;
  }>[];
}>;

export function assertApp1C3rHandoffH0V1(input: App1C3rHandoffInputV1) {
  assertRecord(input);
  assertClosedMetadata(input);
  if (input.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  assertRecord(input.app1Receipt);
  assertRecord(input.c3rJourney);
  assertString(input.app1Receipt.receiptId);
  assertString(input.app1Receipt.itemId);
  assertString(input.app1Receipt.repairRevisionId);
  assertString(input.c3rJourney.journeyId);
  if (!Array.isArray(input.d1ReviewUnits) || input.d1ReviewUnits.length !== 1) {
    throw new CoreBlitzWave1Error("H0_EXACTLY_ONE_D1_REVIEW_UNIT_REQUIRED");
  }
  const unit = input.d1ReviewUnits[0];
  assertRecord(unit);
  assertString(unit.reviewUnitId);
  const bindingMatches =
    input.app1Receipt.itemId === input.c3rJourney.itemId &&
    input.app1Receipt.repairRevisionId === input.c3rJourney.repairRevisionId &&
    unit.itemId === input.app1Receipt.itemId &&
    unit.journeyId === input.c3rJourney.journeyId &&
    unit.dueKind === "D1";
  if (!bindingMatches) throw new CoreBlitzWave1Error("H0_D1_BINDING_MISMATCH");
  if (!ASSISTANCE_CLASSES.includes(unit.assistanceClass as AssistanceClass)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  const assistance = classifyAssistanceV1(unit.assistanceClass as AssistanceClass);
  if (!unit.learnerVisible || !unit.requiresUnaidedAttempt ||
      !assistance.independentAttemptEligible) {
    throw new CoreBlitzWave1Error("H0_UNAIDED_CHECK_REQUIRED");
  }
  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    outcome: "APP1_C3R_HANDOFF_H0_VALID" as const,
    app1ReceiptId: input.app1Receipt.receiptId,
    c3rJourneyId: input.c3rJourney.journeyId,
    d1ReviewUnitId: unit.reviewUnitId,
    learnerVisibleNextUnaidedCheck: true as const,
  });
}

export type QuestionBankAdmissionInputV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  bankClass: QuestionBankClass;
  candidateId: string;
  familyId: string;
  rightsVerified: boolean;
  sourceCurrent: boolean;
  releaseChainComplete: boolean;
  unseenEligibilitySnapshotSealed: boolean;
  nonSameSurfaceAsSource: boolean;
  familyIsolated: boolean;
  calibrationState: "UNASSESSED" | "TRANSFER_VERIFIED" | "MEASUREMENT_CALIBRATED";
  timedProtocolBound: boolean;
}>;

export function admitQuestionToBankV1(input: QuestionBankAdmissionInputV1) {
  assertRecord(input);
  assertClosedMetadata(input);
  if (input.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION ||
      !QUESTION_BANK_CLASSES.includes(input.bankClass)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  assertString(input.candidateId);
  assertString(input.familyId);
  if (!input.rightsVerified) throw new CoreBlitzWave1Error("BANK_RIGHTS_REQUIRED");
  if (!input.sourceCurrent) throw new CoreBlitzWave1Error("BANK_CURRENT_SOURCE_REQUIRED");
  if (input.bankClass !== "LEARNING_PRACTICE") {
    if (!input.releaseChainComplete) throw new CoreBlitzWave1Error("BANK_RELEASE_CHAIN_REQUIRED");
    if (!input.unseenEligibilitySnapshotSealed) throw new CoreBlitzWave1Error("BANK_UNSEEN_SNAPSHOT_REQUIRED");
    if (!input.nonSameSurfaceAsSource) throw new CoreBlitzWave1Error("BANK_NON_SAME_SURFACE_REQUIRED");
    if (!input.familyIsolated) throw new CoreBlitzWave1Error("BANK_FAMILY_ISOLATION_REQUIRED");
  }
  if (input.bankClass === "VERIFIED_TRANSFER" && input.calibrationState === "UNASSESSED") {
    throw new CoreBlitzWave1Error("BANK_RELEASE_CHAIN_REQUIRED");
  }
  if (input.bankClass === "MEASUREMENT") {
    if (input.calibrationState !== "MEASUREMENT_CALIBRATED") {
      throw new CoreBlitzWave1Error("BANK_MEASUREMENT_CALIBRATION_REQUIRED");
    }
    if (!input.timedProtocolBound) {
      throw new CoreBlitzWave1Error("BANK_TIMED_PROTOCOL_REQUIRED");
    }
  }
  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    admitted: true as const,
    bankClass: input.bankClass,
    candidateId: input.candidateId,
    familyId: input.familyId,
    learnerUse: input.bankClass === "LEARNING_PRACTICE"
      ? "LEARNING_ONLY" as const
      : input.bankClass,
  });
}

export const CHECKPOINT_NODE_STATES = [
  "PENDING", "READY", "IN_PROGRESS", "COMPLETE", "BLOCKED_HARD_GATE",
] as const;
type CheckpointNodeState = (typeof CHECKPOINT_NODE_STATES)[number];

type CheckpointNodeV1 = Readonly<{
  nodeId: string;
  dependencies: readonly string[];
  state: CheckpointNodeState;
}>;

export function resumeCoreBlitzCheckpointV1(
  checkpoint: unknown,
  expectedScopeDigest: string,
  liveMain: string,
  liveTree: string,
) {
  assertRecord(checkpoint);
  assertClosedMetadata(checkpoint);
  assertString(expectedScopeDigest);
  if (checkpoint.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  if (checkpoint.scopeDigest !== expectedScopeDigest) {
    throw new CoreBlitzWave1Error("CHECKPOINT_SCOPE_DRIFT");
  }
  if (checkpoint.startingMain !== liveMain || checkpoint.startingTree !== liveTree) {
    throw new CoreBlitzWave1Error("CHECKPOINT_MAIN_DRIFT");
  }
  if (!Array.isArray(checkpoint.nodes)) throw new CoreBlitzWave1Error("INVALID_INPUT");
  const nodes: CheckpointNodeV1[] = [];
  const byId = new Map<string, CheckpointNodeV1>();
  for (const raw of checkpoint.nodes) {
    assertRecord(raw);
    assertString(raw.nodeId);
    if (!Array.isArray(raw.dependencies) || raw.dependencies.some((v) => typeof v !== "string") ||
        !CHECKPOINT_NODE_STATES.includes(raw.state as CheckpointNodeState)) {
      throw new CoreBlitzWave1Error("INVALID_INPUT");
    }
    if (byId.has(raw.nodeId)) throw new CoreBlitzWave1Error("CHECKPOINT_DUPLICATE_NODE");
    const node = Object.freeze({
      nodeId: raw.nodeId,
      dependencies: Object.freeze([...raw.dependencies]) as readonly string[],
      state: raw.state as CheckpointNodeState,
    });
    nodes.push(node);
    byId.set(node.nodeId, node);
  }
  for (const node of nodes) {
    for (const dependency of node.dependencies) {
      if (!byId.has(dependency)) throw new CoreBlitzWave1Error("CHECKPOINT_UNKNOWN_DEPENDENCY");
    }
  }
  const readyNodeIds = nodes
    .filter((node) => (node.state === "PENDING" || node.state === "READY") &&
      node.dependencies.every((id) => byId.get(id)?.state === "COMPLETE"))
    .map((node) => node.nodeId)
    .sort();
  const blockedHardGateNodeIds = nodes
    .filter((node) => node.state === "BLOCKED_HARD_GATE")
    .map((node) => node.nodeId)
    .sort();
  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    readyNodeIds: Object.freeze(readyNodeIds),
    blockedHardGateNodeIds: Object.freeze(blockedHardGateNodeIds),
    terminal: nodes.every((node) =>
      node.state === "COMPLETE" || node.state === "BLOCKED_HARD_GATE"),
  });
}
