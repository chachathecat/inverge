import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  C3RTError,
  isC3RTRecordState,
  type C3RTCommandResult,
  type C3RTDashboard,
  type C3RTPlanBlock,
  type C3RTPlanBlockInput,
  type C3RTPersistedPlan,
  type C3RTRestoredRecord,
} from "./c3r-t-contract";

type JsonRecord = Record<string, unknown>;
type DashboardSnapshot = C3RTDashboard & Readonly<{ plans: readonly C3RTPersistedPlan[] }>;

function adminClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new C3RTError("temporarily_unavailable");
  return client;
}
function objectValue(value: unknown, code: C3RTError["code"] = "temporarily_unavailable") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new C3RTError(code);
  return value as JsonRecord;
}
function arrayValue(value: unknown) {
  if (!Array.isArray(value)) throw new C3RTError("temporarily_unavailable");
  return value;
}
function stringValue(value: unknown) {
  if (typeof value !== "string" || !value) throw new C3RTError("temporarily_unavailable");
  return value;
}
function integerValue(value: unknown) {
  if (!Number.isSafeInteger(value)) throw new C3RTError("temporarily_unavailable");
  return value as number;
}
function booleanValue(value: unknown) {
  if (typeof value !== "boolean") throw new C3RTError("temporarily_unavailable");
  return value;
}
function planBlock(value: unknown): C3RTPlanBlock {
  const row = objectValue(value);
  const blockKind = stringValue(row.blockKind) as C3RTPlanBlock["blockKind"];
  const executionState = stringValue(row.executionState) as C3RTPlanBlock["executionState"];
  if (!["CORE_OUTCOME", "SUPPORT"].includes(blockKind) ||
    !["PENDING", "COMPLETE"].includes(executionState)) {
    throw new C3RTError("temporarily_unavailable");
  }
  return {
    blockId: stringValue(row.blockId),
    blockKind,
    recordId: stringValue(row.recordId),
    gapId: stringValue(row.gapId),
    reviewPhase: stringValue(row.reviewPhase) as C3RTPlanBlock["reviewPhase"],
    ordinal: integerValue(row.ordinal),
    minutes: integerValue(row.minutes),
    executionState,
  };
}

function persistedPlan(value: unknown): C3RTPersistedPlan {
  const row = objectValue(value);
  const planKind = stringValue(row.planKind) as C3RTPersistedPlan["planKind"];
  const state = stringValue(row.state) as C3RTPersistedPlan["state"];
  const completionState = stringValue(row.completionState) as C3RTPersistedPlan["completionState"];
  const terminalReason = row.terminalReason === null
    ? null
    : stringValue(row.terminalReason) as C3RTPersistedPlan["terminalReason"];
  if (!["TODAY", "FULL_DAY"].includes(planKind) ||
    !["PROPOSED", "ACCEPTED", "EDITED", "REJECTED", "STALE"].includes(state) ||
    !["ACTIONABLE", "COMPLETED", "TERMINAL_INCOMPLETE"].includes(completionState) ||
    (terminalReason !== null && ![
      "COMPLETED", "REJECTED", "SUPERSEDED", "ELIGIBILITY_CHANGED",
    ].includes(terminalReason))) {
    throw new C3RTError("temporarily_unavailable");
  }
  const blocks = arrayValue(row.blocks).map(planBlock);
  const dayComplete = booleanValue(row.dayComplete);
  const terminalState = state === "REJECTED" || state === "STALE";
  if ((completionState === "ACTIONABLE" &&
      (terminalReason !== null || dayComplete || terminalState ||
        !blocks.some((block) => block.executionState === "PENDING"))) ||
    (completionState === "COMPLETED" &&
      (terminalReason !== "COMPLETED" || !dayComplete || terminalState ||
        blocks.some((block) => block.executionState !== "COMPLETE"))) ||
    (completionState === "TERMINAL_INCOMPLETE" &&
      (terminalReason === null || terminalReason === "COMPLETED" || !terminalState || dayComplete))) {
    throw new C3RTError("temporarily_unavailable");
  }
  return {
    planId: stringValue(row.planId), planKind,
    recordVersion: integerValue(row.recordVersion),
    eligibilityDigest: stringValue(row.eligibilityDigest), state, blocks,
    completionState, dayComplete, terminalReason,
    generatedAt: stringValue(row.generatedAt), updatedAt: stringValue(row.updatedAt),
  };
}

function rpcError(error: { code?: string; message?: string } | null) {
  const diagnostic = `${error?.code ?? ""}:${error?.message ?? ""}`;
  if (diagnostic.includes("C3R_T_NOT_FOUND")) throw new C3RTError("not_found");
  if (diagnostic.includes("C3R_T_CAS_CONFLICT") || error?.code === "40001") {
    throw new C3RTError("stale_record");
  }
  if (diagnostic.includes("C3R_T_") || error?.code === "22023" || error?.code === "23514") {
    throw new C3RTError("invalid_transition");
  }
  throw new C3RTError("temporarily_unavailable");
}

function commandResult(value: unknown): C3RTCommandResult {
  const row = objectValue(value);
  const status = stringValue(row.status);
  if (!["applied", "assisted_not_independent", "stale_plan"].includes(status)) {
    throw new C3RTError("temporarily_unavailable");
  }
  return {
    ...(typeof row.recordId === "string" ? { recordId: row.recordId } : {}),
    ...(typeof row.planId === "string" ? { planId: row.planId } : {}),
    recordVersion: integerValue(row.recordVersion),
    state: stringValue(row.state),
    status: status as C3RTCommandResult["status"],
    ...(typeof row.eligibilityDigest === "string" ? { eligibilityDigest: row.eligibilityDigest } : {}),
    ...(typeof row.reviewStateDigest === "string" ? { reviewStateDigest: row.reviewStateDigest } : {}),
  };
}

function restoredRecord(value: unknown): C3RTRestoredRecord {
  const row = objectValue(value);
  const record = objectValue(row.record);
  if (record.subject !== "THEORY" || !isC3RTRecordState(record.state) ||
    typeof record.id !== "string" || typeof record.user_id !== "string") {
    throw new C3RTError("temporarily_unavailable");
  }
  return {
    record: record as C3RTRestoredRecord["record"],
    attempts: arrayValue(row.attempts) as C3RTRestoredRecord["attempts"],
    transferTask: row.transferTask === null
      ? null
      : objectValue(row.transferTask) as C3RTRestoredRecord["transferTask"],
    assistanceEvents: arrayValue(row.assistanceEvents) as C3RTRestoredRecord["assistanceEvents"],
    gaps: arrayValue(row.gaps) as C3RTRestoredRecord["gaps"],
    failureNotes: arrayValue(row.failureNotes) as C3RTRestoredRecord["failureNotes"],
    ledger: arrayValue(row.ledger) as C3RTRestoredRecord["ledger"],
  };
}

function dashboard(value: unknown): DashboardSnapshot {
  const row = objectValue(value);
  return {
    eligibilityDigest: stringValue(row.eligibilityDigest),
    reviewStateDigest: stringValue(row.reviewStateDigest),
    queue: arrayValue(row.queue) as C3RTDashboard["queue"],
    ledger: arrayValue(row.ledger) as C3RTDashboard["ledger"],
    plans: arrayValue(row.plans).map(persistedPlan),
  };
}

export function createC3RTRepository(authenticatedUserId: string) {
  return {
    async applyLearningCommand(input: {
      commandId: string; expectedVersion: number; action: string; payload: JsonRecord;
    }) {
      const result = await adminClient().rpc("c3r_t_apply_learning_command_v1", {
        p_user_id: authenticatedUserId, p_command_id: input.commandId,
        p_expected_version: input.expectedVersion, p_action: input.action, p_payload: input.payload,
      });
      if (result.error) rpcError(result.error);
      return commandResult(result.data);
    },
    async restore(recordId: string) {
      const result = await adminClient().rpc("c3r_t_restore_record_v1", {
        p_user_id: authenticatedUserId, p_record_id: recordId,
      });
      if (result.error) rpcError(result.error);
      return restoredRecord(result.data);
    },
    async findRecordId(input: {
      sourceId: string; problemId: string; revisionId: string; itemId: string; artifactId: string;
    }) {
      const result = await adminClient().rpc("c3r_t_find_record_v1", {
        p_user_id: authenticatedUserId, p_source_id: input.sourceId,
        p_problem_id: input.problemId, p_revision_id: input.revisionId,
        p_item_id: input.itemId, p_artifact_id: input.artifactId,
      });
      if (result.error) rpcError(result.error);
      return result.data === null ? null : stringValue(result.data);
    },
    async dashboard(asOf: string) {
      const result = await adminClient().rpc("c3r_t_load_dashboard_v1", {
        p_user_id: authenticatedUserId, p_as_of: asOf,
      });
      if (result.error) rpcError(result.error);
      return dashboard(result.data);
    },
    async createPlan(input: {
      commandId: string; planId: string; kind: "TODAY" | "FULL_DAY";
      availableMinutes: number; asOf: string; blocks: readonly C3RTPlanBlockInput[];
    }) {
      const result = await adminClient().rpc("c3r_t_create_plan_v1", {
        p_user_id: authenticatedUserId, p_command_id: input.commandId,
        p_plan_id: input.planId, p_plan_kind: input.kind,
        p_available_minutes: input.availableMinutes, p_as_of: input.asOf, p_blocks: input.blocks,
      });
      if (result.error) rpcError(result.error);
      return commandResult(result.data);
    },
    async decidePlan(input: {
      commandId: string; planId: string; expectedVersion: number;
      decision: "ACCEPT" | "EDIT" | "REJECT"; asOf: string;
      blocks: readonly C3RTPlanBlockInput[] | null;
    }) {
      const result = await adminClient().rpc("c3r_t_decide_plan_v1", {
        p_user_id: authenticatedUserId, p_command_id: input.commandId,
        p_plan_id: input.planId, p_expected_version: input.expectedVersion,
        p_decision: input.decision, p_as_of: input.asOf, p_blocks: input.blocks,
      });
      if (result.error) rpcError(result.error);
      const parsed = commandResult(result.data);
      if (parsed.status === "stale_plan") throw new C3RTError("stale_plan");
      return parsed;
    },
    async exportData() {
      const result = await adminClient().rpc("c3r_t_export_learner_data_v1", {
        p_user_id: authenticatedUserId,
      });
      if (result.error) rpcError(result.error);
      return objectValue(result.data);
    },
    async deleteData() {
      const result = await adminClient().rpc("c3r_t_delete_learner_data_v1", {
        p_user_id: authenticatedUserId,
      });
      if (result.error) rpcError(result.error);
      return objectValue(result.data);
    },
  };
}
