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

export const CALIBRATION_STATES = [
  "UNASSESSED",
  "TRANSFER_VERIFIED",
  "MEASUREMENT_CALIBRATED",
] as const;
export type CalibrationState = (typeof CALIBRATION_STATES)[number];

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
  "CHECKPOINT_DUPLICATE_DEPENDENCY",
  "CHECKPOINT_UNKNOWN_DEPENDENCY",
  "CHECKPOINT_CYCLE",
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
  "question",
  "questionbody",
  "answer",
  "answerbody",
  "referenceanswer",
  "prompt",
  "response",
  "ocr",
  "ocrtext",
  "learnerbody",
  "providerpayload",
]);

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/u;

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

function assertIdentifier(value: unknown): asserts value is string {
  assertString(value);
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
}

function assertBoolean(value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
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
    if (RAW_BODY_KEYS.has(key.toLowerCase())) {
      throw new CoreBlitzWave1Error("RAW_BODY_FORBIDDEN");
    }
    assertClosedMetadata(entry);
  }
}

export type AssistanceDecisionV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  assistanceClass: AssistanceClass;
  independentAttemptEligible: boolean;
  sameItemMasteryGainAllowed: boolean;
  transferEvidenceEligible: boolean;
  requiresDistinctUnaidedAttempt: boolean;
}>;

export function classifyAssistanceV1(
  assistanceClass: AssistanceClass,
): AssistanceDecisionV1 {
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
  app1Receipt: Readonly<{
    receiptId: string;
    itemId: string;
    repairRevisionId: string;
  }>;
  c3rJourney: Readonly<{
    journeyId: string;
    itemId: string;
    repairRevisionId: string;
  }>;
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

export type App1C3rHandoffReceiptV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  outcome: "APP1_C3R_HANDOFF_H0_VALID";
  app1ReceiptId: string;
  c3rJourneyId: string;
  d1ReviewUnitId: string;
  itemId: string;
  repairRevisionId: string;
  learnerVisibleNextUnaidedCheck: true;
}>;

export function assertApp1C3rHandoffH0V1(
  input: App1C3rHandoffInputV1,
): App1C3rHandoffReceiptV1 {
  assertRecord(input);
  assertClosedMetadata(input);
  if (input.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }

  assertRecord(input.app1Receipt);
  assertRecord(input.c3rJourney);
  assertIdentifier(input.app1Receipt.receiptId);
  assertIdentifier(input.app1Receipt.itemId);
  assertIdentifier(input.app1Receipt.repairRevisionId);
  assertIdentifier(input.c3rJourney.journeyId);
  assertIdentifier(input.c3rJourney.itemId);
  assertIdentifier(input.c3rJourney.repairRevisionId);

  if (!Array.isArray(input.d1ReviewUnits) || input.d1ReviewUnits.length !== 1) {
    throw new CoreBlitzWave1Error("H0_EXACTLY_ONE_D1_REVIEW_UNIT_REQUIRED");
  }

  const unit = input.d1ReviewUnits[0];
  assertRecord(unit);
  assertIdentifier(unit.reviewUnitId);
  assertIdentifier(unit.journeyId);
  assertIdentifier(unit.itemId);
  assertBoolean(unit.learnerVisible);
  assertBoolean(unit.requiresUnaidedAttempt);

  const bindingMatches =
    input.app1Receipt.itemId === input.c3rJourney.itemId &&
    input.app1Receipt.repairRevisionId === input.c3rJourney.repairRevisionId &&
    unit.itemId === input.app1Receipt.itemId &&
    unit.journeyId === input.c3rJourney.journeyId &&
    unit.dueKind === "D1";
  if (!bindingMatches) {
    throw new CoreBlitzWave1Error("H0_D1_BINDING_MISMATCH");
  }

  if (!ASSISTANCE_CLASSES.includes(unit.assistanceClass as AssistanceClass)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  const assistance = classifyAssistanceV1(
    unit.assistanceClass as AssistanceClass,
  );
  if (
    unit.learnerVisible !== true ||
    unit.requiresUnaidedAttempt !== true ||
    !assistance.independentAttemptEligible
  ) {
    throw new CoreBlitzWave1Error("H0_UNAIDED_CHECK_REQUIRED");
  }

  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    outcome: "APP1_C3R_HANDOFF_H0_VALID",
    app1ReceiptId: input.app1Receipt.receiptId,
    c3rJourneyId: input.c3rJourney.journeyId,
    d1ReviewUnitId: unit.reviewUnitId,
    itemId: input.app1Receipt.itemId,
    repairRevisionId: input.app1Receipt.repairRevisionId,
    learnerVisibleNextUnaidedCheck: true,
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
  calibrationState: CalibrationState;
  timedProtocolBound: boolean;
}>;

export type QuestionBankAdmissionReceiptV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  admitted: true;
  bankClass: QuestionBankClass;
  candidateId: string;
  familyId: string;
  learnerUse: "LEARNING_ONLY" | "VERIFIED_TRANSFER" | "MEASUREMENT";
}>;

export function admitQuestionToBankV1(
  input: QuestionBankAdmissionInputV1,
): QuestionBankAdmissionReceiptV1 {
  assertRecord(input);
  assertClosedMetadata(input);
  if (
    input.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION ||
    !QUESTION_BANK_CLASSES.includes(input.bankClass) ||
    !CALIBRATION_STATES.includes(input.calibrationState)
  ) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }

  assertIdentifier(input.candidateId);
  assertIdentifier(input.familyId);
  assertBoolean(input.rightsVerified);
  assertBoolean(input.sourceCurrent);
  assertBoolean(input.releaseChainComplete);
  assertBoolean(input.unseenEligibilitySnapshotSealed);
  assertBoolean(input.nonSameSurfaceAsSource);
  assertBoolean(input.familyIsolated);
  assertBoolean(input.timedProtocolBound);

  if (!input.rightsVerified) {
    throw new CoreBlitzWave1Error("BANK_RIGHTS_REQUIRED");
  }
  if (!input.sourceCurrent) {
    throw new CoreBlitzWave1Error("BANK_CURRENT_SOURCE_REQUIRED");
  }

  if (input.bankClass !== "LEARNING_PRACTICE") {
    if (!input.releaseChainComplete) {
      throw new CoreBlitzWave1Error("BANK_RELEASE_CHAIN_REQUIRED");
    }
    if (!input.unseenEligibilitySnapshotSealed) {
      throw new CoreBlitzWave1Error("BANK_UNSEEN_SNAPSHOT_REQUIRED");
    }
    if (!input.nonSameSurfaceAsSource) {
      throw new CoreBlitzWave1Error("BANK_NON_SAME_SURFACE_REQUIRED");
    }
    if (!input.familyIsolated) {
      throw new CoreBlitzWave1Error("BANK_FAMILY_ISOLATION_REQUIRED");
    }
  }

  if (
    input.bankClass === "VERIFIED_TRANSFER" &&
    input.calibrationState === "UNASSESSED"
  ) {
    throw new CoreBlitzWave1Error("BANK_RELEASE_CHAIN_REQUIRED");
  }

  if (input.bankClass === "MEASUREMENT") {
    if (input.calibrationState !== "MEASUREMENT_CALIBRATED") {
      throw new CoreBlitzWave1Error(
        "BANK_MEASUREMENT_CALIBRATION_REQUIRED",
      );
    }
    if (!input.timedProtocolBound) {
      throw new CoreBlitzWave1Error("BANK_TIMED_PROTOCOL_REQUIRED");
    }
  }

  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    admitted: true,
    bankClass: input.bankClass,
    candidateId: input.candidateId,
    familyId: input.familyId,
    learnerUse:
      input.bankClass === "LEARNING_PRACTICE"
        ? "LEARNING_ONLY"
        : input.bankClass,
  });
}

export const CHECKPOINT_NODE_STATES = [
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "COMPLETE",
  "BLOCKED_HARD_GATE",
] as const;
type CheckpointNodeState = (typeof CHECKPOINT_NODE_STATES)[number];

type CheckpointNodeV1 = Readonly<{
  nodeId: string;
  dependencies: readonly string[];
  state: CheckpointNodeState;
}>;

function assertAcyclicCheckpoint(nodes: readonly CheckpointNodeV1[]): void {
  const byId = new Map(nodes.map((node) => [node.nodeId, node] as const));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new CoreBlitzWave1Error("CHECKPOINT_CYCLE");
    }
    visiting.add(nodeId);
    const node = byId.get(nodeId);
    if (!node) {
      throw new CoreBlitzWave1Error("CHECKPOINT_UNKNOWN_DEPENDENCY");
    }
    for (const dependency of node.dependencies) visit(dependency);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of nodes) visit(node.nodeId);
}

export function resumeCoreBlitzCheckpointV1(
  checkpoint: unknown,
  expectedScopeDigest: string,
  liveMain: string,
  liveTree: string,
) {
  assertRecord(checkpoint);
  assertClosedMetadata(checkpoint);
  assertString(expectedScopeDigest);
  assertString(liveMain);
  assertString(liveTree);

  if (checkpoint.schemaVersion !== CORE_BLITZ_WAVE1_CONTRACT_VERSION) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }
  if (checkpoint.scopeDigest !== expectedScopeDigest) {
    throw new CoreBlitzWave1Error("CHECKPOINT_SCOPE_DRIFT");
  }
  if (
    checkpoint.startingMain !== liveMain ||
    checkpoint.startingTree !== liveTree
  ) {
    throw new CoreBlitzWave1Error("CHECKPOINT_MAIN_DRIFT");
  }
  if (!Array.isArray(checkpoint.nodes)) {
    throw new CoreBlitzWave1Error("INVALID_INPUT");
  }

  const nodes: CheckpointNodeV1[] = [];
  const byId = new Map<string, CheckpointNodeV1>();
  for (const raw of checkpoint.nodes) {
    assertRecord(raw);
    assertIdentifier(raw.nodeId);
    if (
      !Array.isArray(raw.dependencies) ||
      raw.dependencies.some((value) => typeof value !== "string") ||
      !CHECKPOINT_NODE_STATES.includes(raw.state as CheckpointNodeState)
    ) {
      throw new CoreBlitzWave1Error("INVALID_INPUT");
    }

    const dependencies = raw.dependencies as string[];
    for (const dependency of dependencies) assertIdentifier(dependency);
    if (new Set(dependencies).size !== dependencies.length) {
      throw new CoreBlitzWave1Error("CHECKPOINT_DUPLICATE_DEPENDENCY");
    }
    if (byId.has(raw.nodeId)) {
      throw new CoreBlitzWave1Error("CHECKPOINT_DUPLICATE_NODE");
    }

    const node = Object.freeze({
      nodeId: raw.nodeId,
      dependencies: Object.freeze([...dependencies]) as readonly string[],
      state: raw.state as CheckpointNodeState,
    });
    nodes.push(node);
    byId.set(node.nodeId, node);
  }

  for (const node of nodes) {
    for (const dependency of node.dependencies) {
      if (!byId.has(dependency)) {
        throw new CoreBlitzWave1Error("CHECKPOINT_UNKNOWN_DEPENDENCY");
      }
    }
  }
  assertAcyclicCheckpoint(nodes);

  const readyNodeIds = nodes
    .filter(
      (node) =>
        (node.state === "PENDING" || node.state === "READY") &&
        node.dependencies.every(
          (dependency) => byId.get(dependency)?.state === "COMPLETE",
        ),
    )
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
    terminal: nodes.every(
      (node) =>
        node.state === "COMPLETE" || node.state === "BLOCKED_HARD_GATE",
    ),
  });
}
