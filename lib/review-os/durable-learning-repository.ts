import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  DURABLE_EVIDENCE_EVENT_TYPES,
  DURABLE_LEARNING_CONTRACT_VERSION,
  DURABLE_LEARNING_POLICY_VERSION,
  TRANSFER_DISTANCES,
  isDurableLearningState,
  type DurableEvidenceEvent,
  type DurableLearningAggregate,
  type DurableLearningStateData,
  type DurableLearningTransitionPlan,
  type DurablePrivateAttemptArtifact,
  type GapClosureCaseV1,
} from "./durable-learning-contract";
import { isTrustedRepairSubject } from "./trusted-repair-contract";

type Row = Record<string, unknown>;

export class DurableLearningPersistenceError extends Error {
  readonly code: "unavailable" | "invalid_record" | "not_found" | "stale_record";

  constructor(code: DurableLearningPersistenceError["code"]) {
    super(`durable-learning-persistence:${code}`);
    this.code = code;
  }
}

function serviceClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new DurableLearningPersistenceError("unavailable");
  return client;
}

function objectValue(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value as Row;
}

function arrayValue(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function stringValue(value: unknown) {
  if (typeof value !== "string" || value.length < 1) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function nullableString(value: unknown) {
  return value === null ? null : stringValue(value);
}

function integerValue(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function stateDataValue(value: unknown): DurableLearningStateData {
  const row = objectValue(value);
  const expected = [
    "frozenD0",
    "sourcePrimaryGapId",
    "nextEligibleAt",
    "activeAttempt",
    "recurringSignature",
    "latestPlan",
    "planDecisionHistory",
    "resultReasonCodes",
  ];
  if (
    Object.keys(row).some((key) => !expected.includes(key)) ||
    Object.keys(row).length !== expected.length ||
    typeof row.sourcePrimaryGapId !== "string" ||
    !(row.nextEligibleAt === null || typeof row.nextEligibleAt === "string") ||
    !Array.isArray(row.planDecisionHistory) ||
    !Array.isArray(row.resultReasonCodes)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const frozen = objectValue(row.frozenD0);
  const signature = objectValue(row.recurringSignature);
  if (
    frozen.ledgerSchemaVersion !== DURABLE_LEARNING_CONTRACT_VERSION ||
    frozen.measurementPolicyVersion !== DURABLE_LEARNING_POLICY_VERSION ||
    typeof frozen.sourceFixtureVersion !== "string" ||
    typeof frozen.digest !== "string" ||
    typeof signature.signatureId !== "string" ||
    !Array.isArray(signature.evidenceEventIds) ||
    !Array.isArray(signature.counterEvidenceEventIds)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  if (row.activeAttempt !== null) {
    const active = objectValue(row.activeAttempt);
    if (
      typeof active.attemptId !== "string" ||
      typeof active.artifactId !== "string" ||
      !["D1", "D7", "TIMED", "RECURRENCE"].includes(String(active.stage)) ||
      !Number.isSafeInteger(active.attemptOrdinal) ||
      Number(active.attemptOrdinal) < 1 ||
      typeof active.trustedStartedAt !== "string" ||
      !active.prePresentation ||
      !active.assignment
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
  }
  return row as DurableLearningStateData;
}

function parseCase(row: Row, userId: string): GapClosureCaseV1 {
  if (
    row.user_id !== userId ||
    !isTrustedRepairSubject(row.subject) ||
    !isDurableLearningState(row.state) ||
    row.contract_version !== DURABLE_LEARNING_CONTRACT_VERSION ||
    row.policy_version !== DURABLE_LEARNING_POLICY_VERSION
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return {
    caseId: stringValue(row.id),
    userId,
    sourceSessionId: stringValue(row.source_session_id),
    subject: row.subject,
    state: row.state,
    recordVersion: integerValue(row.record_version),
    contractVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    policyVersion: DURABLE_LEARNING_POLICY_VERSION,
    stateData: stateDataValue(row.state_data),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function parseArtifact(row: Row, userId: string): DurablePrivateAttemptArtifact {
  if (
    row.user_id !== userId ||
    !["D1", "D7", "TIMED", "RECURRENCE"].includes(String(row.stage))
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return {
    artifactId: stringValue(row.id),
    caseId: stringValue(row.case_id),
    userId,
    attemptId: stringValue(row.attempt_id),
    stage: row.stage as DurablePrivateAttemptArtifact["stage"],
    body: stringValue(row.body),
    createdAt: stringValue(row.created_at),
  };
}

function parseEvent(row: Row, userId: string): DurableEvidenceEvent {
  if (
    row.user_id !== userId ||
    !(DURABLE_EVIDENCE_EVENT_TYPES as readonly unknown[]).includes(row.event_type) ||
    !(
      row.transfer_distance === null ||
      (TRANSFER_DISTANCES as readonly unknown[]).includes(row.transfer_distance)
    ) ||
    !(
      row.outcome === null ||
      ["SUCCESS", "PARTIAL", "BLANK", "TIMEOUT", "FAILURE"].includes(String(row.outcome))
    )
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const payload = objectValue(row.payload);
  if (payload.containsBody !== false) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return {
    eventId: stringValue(row.id),
    caseId: stringValue(row.case_id),
    userId,
    eventType: row.event_type as DurableEvidenceEvent["eventType"],
    attemptId: nullableString(row.attempt_id),
    artifactId: nullableString(row.artifact_id),
    itemId: nullableString(row.item_id),
    itemFamilyId: nullableString(row.item_family_id),
    transferDistance: row.transfer_distance as DurableEvidenceEvent["transferDistance"],
    outcome: row.outcome as DurableEvidenceEvent["outcome"],
    payload,
    occurredAt: stringValue(row.occurred_at),
  };
}

function throwRpcError(error: { message?: string; code?: string } | null) {
  const value = `${error?.code ?? ""}:${error?.message ?? ""}`;
  if (value.includes("WCV_C3_NOT_FOUND")) {
    throw new DurableLearningPersistenceError("not_found");
  }
  if (value.includes("WCV_C3_CAS_CONFLICT") || error?.code === "40001") {
    throw new DurableLearningPersistenceError("stale_record");
  }
  throw new DurableLearningPersistenceError("unavailable");
}

function casePayload(value: GapClosureCaseV1) {
  return {
    caseId: value.caseId,
    userId: value.userId,
    sourceSessionId: value.sourceSessionId,
    subject: value.subject,
    state: value.state,
    recordVersion: value.recordVersion,
    contractVersion: value.contractVersion,
    policyVersion: value.policyVersion,
    stateData: value.stateData,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createDurableLearningRepository(authenticatedUserId: string) {
  async function load(caseId: string): Promise<DurableLearningAggregate> {
    const result = await serviceClient().rpc("wcv_c3_load_gap_closure_case_v1", {
      p_case_id: caseId,
      p_user_id: authenticatedUserId,
    });
    if (result.error) throwRpcError(result.error);
    if (!result.data) throw new DurableLearningPersistenceError("not_found");
    const aggregate = objectValue(result.data);
    const expectedKeys = ["case", "artifacts", "events"];
    if (
      Object.keys(aggregate).length !== expectedKeys.length ||
      Object.keys(aggregate).some((key) => !expectedKeys.includes(key))
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    const caseRecord = parseCase(objectValue(aggregate.case), authenticatedUserId);
    const artifacts = arrayValue(aggregate.artifacts).map((row) =>
      parseArtifact(objectValue(row), authenticatedUserId),
    );
    const events = arrayValue(aggregate.events).map((row) =>
      parseEvent(objectValue(row), authenticatedUserId),
    );
    if (
      artifacts.some((artifact) => artifact.caseId !== caseRecord.caseId) ||
      events.some((event) => event.caseId !== caseRecord.caseId)
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    return { caseRecord, artifacts, events };
  }

  return {
    load,
    async loadBySourceSession(sourceSessionId: string) {
      const result = await serviceClient()
        .from("wcv_c3_gap_closure_cases")
        .select("id")
        .eq("source_session_id", sourceSessionId)
        .eq("user_id", authenticatedUserId)
        .maybeSingle();
      if (result.error) throw new DurableLearningPersistenceError("unavailable");
      return result.data ? load(stringValue(result.data.id)) : null;
    },
    async replayMatches(input: {
      caseId: string;
      commandId: string;
      currentRecordVersion: number;
      currentState: string;
    }) {
      const result = await serviceClient()
        .from("wcv_c3_command_receipts")
        .select("resulting_record_version,resulting_state")
        .eq("case_id", input.caseId)
        .eq("user_id", authenticatedUserId)
        .eq("command_id", input.commandId)
        .maybeSingle();
      if (result.error) throw new DurableLearningPersistenceError("unavailable");
      return Boolean(
        result.data &&
          result.data.resulting_record_version === input.currentRecordVersion &&
          result.data.resulting_state === input.currentState,
      );
    },
    async create(input: {
      caseRecord: GapClosureCaseV1;
      event: Omit<DurableEvidenceEvent, "caseId" | "userId">;
      commandId: string;
    }) {
      if (input.caseRecord.userId !== authenticatedUserId) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc("wcv_c3_create_gap_closure_case_v1", {
        p_case: casePayload(input.caseRecord),
        p_event: input.event,
        p_command_id: input.commandId,
      });
      if (result.error) throwRpcError(result.error);
      const row = objectValue(Array.isArray(result.data) ? result.data[0] : result.data);
      return load(stringValue(row.out_case_id));
    },
    async transition(input: {
      aggregate: DurableLearningAggregate;
      plan: DurableLearningTransitionPlan;
      commandId: string;
    }) {
      if (input.aggregate.caseRecord.userId !== authenticatedUserId) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc("wcv_c3_apply_transition_v1", {
        p_case_id: input.aggregate.caseRecord.caseId,
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_expected_version: input.aggregate.caseRecord.recordVersion,
        p_expected_state: input.plan.expectedState,
        p_next_state: input.plan.nextState,
        p_state_data: input.plan.stateData,
        p_artifact: input.plan.artifact,
        p_event: input.plan.event,
      });
      if (result.error) throwRpcError(result.error);
      return load(input.aggregate.caseRecord.caseId);
    },
    async delete(input: { caseId: string; expectedVersion: number; commandId: string }) {
      const result = await serviceClient().rpc("wcv_c3_delete_owned_case_v1", {
        p_case_id: input.caseId,
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_expected_version: input.expectedVersion,
      });
      if (result.error) throwRpcError(result.error);
      return { deleted: true as const };
    },
  };
}
