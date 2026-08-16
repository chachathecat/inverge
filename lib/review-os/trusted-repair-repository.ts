import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  TRUSTED_REPAIR_CONTRACT_VERSION,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_POLICY_VERSION,
  PRACTICE_PROOF_EVALUATION_STATES,
  TRUSTED_REPAIR_RUBRIC_VERSION,
  TRUSTED_REPAIR_VALIDATOR_VERSION,
  isTrustedRepairInputMode,
  isTrustedRepairOutcome,
  isTrustedRepairState,
  isTrustedRepairSubject,
  type TrustedRepairAggregate,
  type TrustedRepairArtifactKind,
  type TrustedRepairBindings,
  type TrustedRepairExposureEvent,
  type TrustedRepairPrivateArtifact,
  type TrustedRepairScarcityEvent,
  type TrustedRepairStateData,
  type TrustedRepairStoredSession,
  type TrustedRepairTransitionPlan,
} from "./trusted-repair-contract";

const SESSION_KIND = "wcv_c2_trusted_repair" as const;

type Row = Record<string, unknown>;

export class TrustedRepairPersistenceError extends Error {
  readonly code: "unavailable" | "invalid_record" | "not_found" | "stale_record";

  constructor(
    code: "unavailable" | "invalid_record" | "not_found" | "stale_record",
  ) {
    super(`trusted-repair-persistence:${code}`);
    this.code = code;
  }
}

function serviceClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new TrustedRepairPersistenceError("unavailable");
  return client;
}

function objectValue(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return value as Row;
}

function stringValue(value: unknown) {
  if (typeof value !== "string" || !value) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return value;
}

function nullableString(value: unknown) {
  if (value === null) return null;
  return stringValue(value);
}

function numberValue(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return value;
}

function stateDataValue(value: unknown): TrustedRepairStateData {
  const row = objectValue(value);
  const allowedKeys = new Set([
    "inputMode",
    "revisionNumber",
    "prediction",
    "predictionConfidence",
    "selfDiagnosisCode",
    "gapCandidates",
    "repairNeed",
    "repairPath",
    "continuation",
    "proofEvaluation",
    "resultReasonCodes",
  ]);
  if (!isTrustedRepairInputMode(row.inputMode)) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  if (
    Object.keys(row).some((key) => !allowedKeys.has(key)) ||
    !Array.isArray(row.gapCandidates) ||
    !Array.isArray(row.resultReasonCodes)
  ) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  if (row.proofEvaluation !== null) {
    const proof = objectValue(row.proofEvaluation);
    const proofKeys = [
      "state",
      "verified",
      "validatorId",
      "anchorId",
      "anchorVersionId",
      "reasonCodes",
    ];
    if (
      Object.keys(proof).some((key) => !proofKeys.includes(key)) ||
      !PRACTICE_PROOF_EVALUATION_STATES.includes(
        proof.state as (typeof PRACTICE_PROOF_EVALUATION_STATES)[number],
      ) ||
      proof.verified !== (proof.state === "PASS") ||
      proof.validatorId !== "validator:practice-calculation-relation@1" ||
      proof.anchorId !== "repair-anchor:practice:synthetic-net-income" ||
      proof.anchorVersionId !==
        "repair-anchor:practice:synthetic-net-income@1" ||
      !Array.isArray(proof.reasonCodes) ||
      proof.reasonCodes.some((reason) => typeof reason !== "string")
    ) {
      throw new TrustedRepairPersistenceError("invalid_record");
    }
  }
  return row as TrustedRepairStateData;
}

function bindingsFromRow(row: Row): TrustedRepairBindings {
  const bindings = {
    contractVersion: row.contract_version,
    fixtureVersion: row.fixture_version,
    sourceVersion: row.source_version,
    rubricVersion: row.rubric_version,
    policyVersion: row.policy_version,
    validatorVersion: row.validator_version,
  };
  if (
    bindings.contractVersion !== TRUSTED_REPAIR_CONTRACT_VERSION ||
    bindings.fixtureVersion !== TRUSTED_REPAIR_FIXTURE_VERSION ||
    typeof bindings.sourceVersion !== "string" ||
    !bindings.sourceVersion ||
    bindings.rubricVersion !== TRUSTED_REPAIR_RUBRIC_VERSION ||
    bindings.policyVersion !== TRUSTED_REPAIR_POLICY_VERSION ||
    bindings.validatorVersion !== TRUSTED_REPAIR_VALIDATOR_VERSION
  ) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return bindings as TrustedRepairBindings;
}

function parseSession(row: Row, expectedUserId: string): TrustedRepairStoredSession {
  if (
    row.user_id !== expectedUserId ||
    row.session_kind !== SESSION_KIND ||
    !isTrustedRepairSubject(row.subject) ||
    !isTrustedRepairState(row.state) ||
    !(row.outcome === null || isTrustedRepairOutcome(row.outcome)) ||
    typeof row.independent_attempt_before_help !== "boolean"
  ) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return {
    sessionId: stringValue(row.id),
    userId: expectedUserId,
    fixtureId: stringValue(row.fixture_id),
    subject: row.subject,
    state: row.state,
    recordVersion: numberValue(row.record_version),
    confirmedRevisionId: nullableString(row.confirmed_revision_id),
    primaryGapId: nullableString(row.primary_gap_id),
    outcome: row.outcome,
    assistanceLevel: numberValue(row.assistance_level),
    independentAttemptBeforeHelp: row.independent_attempt_before_help,
    bindings: bindingsFromRow(row),
    stateData: stateDataValue(row.state_data),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function parseArtifact(row: Row, expectedUserId: string): TrustedRepairPrivateArtifact {
  const kind = row.artifact_kind as TrustedRepairArtifactKind;
  if (
    row.user_id !== expectedUserId ||
    !["capture_draft", "confirmed_revision", "independent_attempt", "repair_submission"].includes(kind) ||
    !isTrustedRepairInputMode(row.input_mode)
  ) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return {
    artifactId: stringValue(row.id),
    sessionId: stringValue(row.session_id),
    userId: expectedUserId,
    revisionNumber: numberValue(row.revision_number),
    kind,
    inputMode: row.input_mode,
    body: stringValue(row.body),
    createdAt: stringValue(row.created_at),
  };
}

function parseExposure(row: Row, expectedUserId: string): TrustedRepairExposureEvent {
  if (
    row.user_id !== expectedUserId ||
    !["smallest_eligible_scaffold", "guided_solution"].includes(String(row.scaffold_kind))
  ) {
    throw new TrustedRepairPersistenceError("invalid_record");
  }
  return {
    exposureId: stringValue(row.id),
    sessionId: stringValue(row.session_id),
    userId: expectedUserId,
    revisionId: stringValue(row.revision_id),
    gapId: stringValue(row.gap_id),
    assistanceLevel: numberValue(row.assistance_level),
    scaffoldKind: row.scaffold_kind as TrustedRepairExposureEvent["scaffoldKind"],
    occurredAt: stringValue(row.occurred_at),
  };
}

function throwRpcError(error: { message?: string; code?: string } | null) {
  const value = `${error?.code ?? ""}:${error?.message ?? ""}`;
  if (value.includes("WCV_C2_NOT_FOUND")) {
    throw new TrustedRepairPersistenceError("not_found");
  }
  if (value.includes("WCV_C2_CAS_CONFLICT") || error?.code === "40001") {
    throw new TrustedRepairPersistenceError("stale_record");
  }
  throw new TrustedRepairPersistenceError("unavailable");
}

function sessionPayload(session: TrustedRepairStoredSession) {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    fixtureId: session.fixtureId,
    subject: session.subject,
    state: session.state,
    recordVersion: session.recordVersion,
    confirmedRevisionId: session.confirmedRevisionId,
    primaryGapId: session.primaryGapId,
    outcome: session.outcome,
    assistanceLevel: session.assistanceLevel,
    independentAttemptBeforeHelp: session.independentAttemptBeforeHelp,
    contractVersion: session.bindings.contractVersion,
    fixtureVersion: session.bindings.fixtureVersion,
    sourceVersion: session.bindings.sourceVersion,
    rubricVersion: session.bindings.rubricVersion,
    policyVersion: session.bindings.policyVersion,
    validatorVersion: session.bindings.validatorVersion,
    stateData: session.stateData,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function createTrustedRepairRepository(authenticatedUserId: string) {
  async function load(sessionId: string): Promise<TrustedRepairAggregate> {
    const client = serviceClient();
    const [sessionResult, artifactResult, exposureResult] = await Promise.all([
      client
        .from("wcv_c2_trusted_repair_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", authenticatedUserId)
        .eq("session_kind", SESSION_KIND)
        .maybeSingle(),
      client
        .from("wcv_c2_trusted_repair_private_artifacts")
        .select("id,session_id,user_id,revision_number,artifact_kind,input_mode,body,created_at")
        .eq("session_id", sessionId)
        .eq("user_id", authenticatedUserId)
        .order("revision_number", { ascending: true })
        .order("created_at", { ascending: true }),
      client
        .from("wcv_c2_trusted_repair_exposure_events")
        .select("id,session_id,user_id,revision_id,gap_id,assistance_level,scaffold_kind,occurred_at")
        .eq("session_id", sessionId)
        .eq("user_id", authenticatedUserId)
        .order("occurred_at", { ascending: true }),
    ]);
    if (sessionResult.error || artifactResult.error || exposureResult.error) {
      throw new TrustedRepairPersistenceError("unavailable");
    }
    if (!sessionResult.data) throw new TrustedRepairPersistenceError("not_found");
    const session = parseSession(sessionResult.data as Row, authenticatedUserId);
    const artifacts = (artifactResult.data ?? []).map((row) =>
      parseArtifact(row as Row, authenticatedUserId),
    );
    const exposures = (exposureResult.data ?? []).map((row) =>
      parseExposure(row as Row, authenticatedUserId),
    );
    if (
      artifacts.some((artifact) => artifact.sessionId !== session.sessionId) ||
      exposures.some((exposure) => exposure.sessionId !== session.sessionId)
    ) {
      throw new TrustedRepairPersistenceError("invalid_record");
    }
    return { session, artifacts, exposures };
  }

  return {
    load,
    async recordScarcity(event: TrustedRepairScarcityEvent) {
      const result = await serviceClient()
        .from("wcv_c2_trusted_repair_scarcity_events")
        .insert({
          id: event.eventId,
          subject: event.subject,
          bank: event.bank,
          reason_code: event.reasonCode,
          contains_body: event.containsBody,
          occurred_at: event.occurredAt,
        });
      if (result.error) throw new TrustedRepairPersistenceError("unavailable");
    },
    async replayMatches(input: {
      sessionId: string;
      commandId: string;
      currentRecordVersion: number;
      currentState: string;
    }) {
      const result = await serviceClient()
        .from("wcv_c2_trusted_repair_command_receipts")
        .select("resulting_record_version,resulting_state")
        .eq("command_id", input.commandId)
        .eq("session_id", input.sessionId)
        .eq("user_id", authenticatedUserId)
        .maybeSingle();
      if (result.error) throw new TrustedRepairPersistenceError("unavailable");
      return Boolean(
        result.data &&
          result.data.resulting_record_version === input.currentRecordVersion &&
          result.data.resulting_state === input.currentState,
      );
    },
    async create(input: {
      session: TrustedRepairStoredSession;
      artifact: Omit<TrustedRepairPrivateArtifact, "sessionId" | "userId">;
      commandId: string;
    }) {
      if (input.session.userId !== authenticatedUserId) {
        throw new TrustedRepairPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc(
        "wcv_c2_create_trusted_repair_session_v1",
        {
          p_session: sessionPayload(input.session),
          p_artifact: input.artifact,
          p_command_id: input.commandId,
        },
      );
      if (result.error) throwRpcError(result.error);
      const rpcRow = Array.isArray(result.data) ? result.data[0] : result.data;
      const persistedSessionId = objectValue(rpcRow).out_session_id;
      return load(stringValue(persistedSessionId));
    },
    async transition(input: {
      aggregate: TrustedRepairAggregate;
      plan: TrustedRepairTransitionPlan;
      commandId: string;
    }) {
      const session = input.aggregate.session;
      if (session.userId !== authenticatedUserId) {
        throw new TrustedRepairPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc(
        "wcv_c2_apply_trusted_repair_transition_v1",
        {
          p_session_id: session.sessionId,
          p_user_id: authenticatedUserId,
          p_command_id: input.commandId,
          p_expected_version: session.recordVersion,
          p_expected_state: input.plan.expectedState,
          p_next_state: input.plan.nextState,
          p_state_data: input.plan.stateData,
          p_confirmed_revision_id: input.plan.confirmedRevisionId,
          p_primary_gap_id: input.plan.primaryGapId,
          p_outcome: input.plan.outcome,
          p_assistance_level: input.plan.assistanceLevel,
          p_independent_attempt_before_help:
            input.plan.independentAttemptBeforeHelp,
          p_artifact: input.plan.artifact,
          p_exposure: input.plan.exposure,
        },
      );
      if (result.error) throwRpcError(result.error);
      return load(session.sessionId);
    },
  };
}
