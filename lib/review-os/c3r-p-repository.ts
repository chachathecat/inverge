import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  C3RPError,
  isC3RPRecordState,
  type C3RPCommandResult,
  type C3RPDashboard,
  type C3RPPlanBlock,
  type C3RPPlanBlockInput,
  type C3RPPlanCompletionState,
  type C3RPPlanTerminalReason,
  type C3RPPersistedPlan,
  type C3RPRestoredRecord,
} from "./c3r-p-contract";

type JsonRecord = Record<string, unknown>;
type C3RPDashboardSnapshot = C3RPDashboard & Readonly<{
  plans: readonly C3RPPersistedPlan[];
}>;

function adminClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new C3RPError("temporarily_unavailable");
  return client;
}
function objectValue(value: unknown, code: C3RPError["code"] = "temporarily_unavailable") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new C3RPError(code);
  }
  return value as JsonRecord;
}

function arrayValue(value: unknown) {
  if (!Array.isArray(value)) throw new C3RPError("temporarily_unavailable");
  return value;
}

function stringValue(value: unknown) {
  if (typeof value !== "string" || !value) {
    throw new C3RPError("temporarily_unavailable");
  }
  return value;
}

function integerValue(value: unknown) {
  if (!Number.isSafeInteger(value)) {
    throw new C3RPError("temporarily_unavailable");
  }
  return value as number;
}

function booleanValue(value: unknown) {
  if (typeof value !== "boolean") throw new C3RPError("temporarily_unavailable");
  return value;
}

function planBlock(value: unknown): C3RPPlanBlock {
  const row = objectValue(value);
  const blockKind = stringValue(row.blockKind);
  const executionState = stringValue(row.executionState);
  if (!(["CORE_OUTCOME", "SUPPORT"] as const).includes(
    blockKind as C3RPPlanBlock["blockKind"],
  ) || !(["PENDING", "COMPLETE"] as const).includes(
    executionState as C3RPPlanBlock["executionState"],
  )) {
    throw new C3RPError("temporarily_unavailable");
  }
  return {
    blockId: stringValue(row.blockId),
    blockKind: blockKind as C3RPPlanBlock["blockKind"],
    recordId: stringValue(row.recordId),
    gapId: stringValue(row.gapId),
    reviewPhase: stringValue(row.reviewPhase) as C3RPPlanBlock["reviewPhase"],
    ordinal: integerValue(row.ordinal),
    minutes: integerValue(row.minutes),
    executionState: executionState as C3RPPlanBlock["executionState"],
  };
}

function persistedPlan(value: unknown): C3RPPersistedPlan {
  const row = objectValue(value);
  const planKind = stringValue(row.planKind);
  const state = stringValue(row.state);
  const completionState = stringValue(row.completionState);
  const terminalReason = row.terminalReason === null
    ? null
    : stringValue(row.terminalReason);
  if (!(["TODAY", "FULL_DAY"] as const).includes(planKind as C3RPPersistedPlan["planKind"]) ||
    !(["PROPOSED", "ACCEPTED", "EDITED", "REJECTED", "STALE"] as const).includes(
      state as C3RPPersistedPlan["state"],
    ) || !(["ACTIONABLE", "COMPLETED", "TERMINAL_INCOMPLETE"] as const).includes(
      completionState as C3RPPlanCompletionState,
    ) || (terminalReason !== null && !([
      "COMPLETED",
      "REJECTED",
      "SUPERSEDED",
      "ELIGIBILITY_CHANGED",
    ] as const).includes(terminalReason as C3RPPlanTerminalReason))) {
    throw new C3RPError("temporarily_unavailable");
  }
  const blocks = arrayValue(row.blocks).map(planBlock);
  const dayComplete = booleanValue(row.dayComplete);
  const terminalState = state === "REJECTED" || state === "STALE";
  if (
    (completionState === "ACTIONABLE" && (
      terminalReason !== null || dayComplete || terminalState ||
      !blocks.some((block) => block.executionState === "PENDING")
    )) ||
    (completionState === "COMPLETED" && (
      terminalReason !== "COMPLETED" || !dayComplete || terminalState ||
      blocks.some((block) => block.executionState !== "COMPLETE")
    )) ||
    (completionState === "TERMINAL_INCOMPLETE" && (
      terminalReason === null || terminalReason === "COMPLETED" ||
      !terminalState || dayComplete
    ))
  ) {
    throw new C3RPError("temporarily_unavailable");
  }
  return {
    planId: stringValue(row.planId),
    planKind: planKind as C3RPPersistedPlan["planKind"],
    recordVersion: integerValue(row.recordVersion),
    eligibilityDigest: stringValue(row.eligibilityDigest),
    state: state as C3RPPersistedPlan["state"],
    blocks,
    completionState: completionState as C3RPPlanCompletionState,
    dayComplete,
    terminalReason: terminalReason as C3RPPlanTerminalReason | null,
    generatedAt: stringValue(row.generatedAt),
    updatedAt: stringValue(row.updatedAt),
  };
}

function rpcError(error: { code?: string; message?: string } | null) {
  const diagnostic = `${error?.code ?? ""}:${error?.message ?? ""}`;
  if (diagnostic.includes("C3R_P_NOT_FOUND")) throw new C3RPError("not_found");
  if (diagnostic.includes("C3R_P_CAS_CONFLICT") || error?.code === "40001") {
    throw new C3RPError("stale_record");
  }
  if (diagnostic.includes("C3R_P_") || error?.code === "22023" || error?.code === "23514") {
    throw new C3RPError("invalid_transition");
  }
  throw new C3RPError("temporarily_unavailable");
}

function commandResult(value: unknown): C3RPCommandResult {
  const row = objectValue(value);
  const state = stringValue(row.state);
  const status = stringValue(row.status);
  if (![
    "applied",
    "assisted_not_independent",
    "stale_plan",
  ].includes(status)) {
    throw new C3RPError("temporarily_unavailable");
  }
  return {
    ...(typeof row.recordId === "string" ? { recordId: row.recordId } : {}),
    ...(typeof row.planId === "string" ? { planId: row.planId } : {}),
    recordVersion: integerValue(row.recordVersion),
    state,
    status: status as C3RPCommandResult["status"],
    ...(typeof row.eligibilityDigest === "string"
      ? { eligibilityDigest: row.eligibilityDigest }
      : {}),
    ...(typeof row.reviewStateDigest === "string"
      ? { reviewStateDigest: row.reviewStateDigest }
      : {}),
  };
}

function restoredRecord(value: unknown): C3RPRestoredRecord {
  const row = objectValue(value);
  const record = objectValue(row.record);
  if (
    record.subject !== "PRACTICE" ||
    !isC3RPRecordState(record.state) ||
    typeof record.id !== "string" ||
    typeof record.user_id !== "string"
  ) {
    throw new C3RPError("temporarily_unavailable");
  }
  return {
    record: record as C3RPRestoredRecord["record"],
    attempts: arrayValue(row.attempts) as C3RPRestoredRecord["attempts"],
    transferTask: row.transferTask === null
      ? null
      : objectValue(row.transferTask) as C3RPRestoredRecord["transferTask"],
    assistanceEvents: arrayValue(row.assistanceEvents) as C3RPRestoredRecord["assistanceEvents"],
    gaps: arrayValue(row.gaps) as C3RPRestoredRecord["gaps"],
    failureNotes: arrayValue(row.failureNotes) as C3RPRestoredRecord["failureNotes"],
    ledger: arrayValue(row.ledger) as C3RPRestoredRecord["ledger"],
  };
}

function dashboard(value: unknown): C3RPDashboardSnapshot {
  const row = objectValue(value);
  return {
    eligibilityDigest: stringValue(row.eligibilityDigest),
    reviewStateDigest: stringValue(row.reviewStateDigest),
    queue: arrayValue(row.queue) as C3RPDashboard["queue"],
    ledger: arrayValue(row.ledger) as C3RPDashboard["ledger"],
    plans: arrayValue(row.plans).map(persistedPlan),
  };
}

export function createC3RPRepository(authenticatedUserId: string) {
  return {
    async applyLearningCommand(input: {
      commandId: string;
      expectedVersion: number;
      action: string;
      payload: JsonRecord;
    }) {
      const result = await adminClient().rpc("c3r_p_apply_learning_command_v1", {
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_expected_version: input.expectedVersion,
        p_action: input.action,
        p_payload: input.payload,
      });
      if (result.error) rpcError(result.error);
      return commandResult(result.data);
    },

    async restore(recordId: string) {
      const result = await adminClient().rpc("c3r_p_restore_record_v1", {
        p_user_id: authenticatedUserId,
        p_record_id: recordId,
      });
      if (result.error) rpcError(result.error);
      return restoredRecord(result.data);
    },

    async findRecordId(input: {
      sourceId: string;
      problemId: string;
      revisionId: string;
      itemId: string;
      artifactId: string;
    }) {
      const result = await adminClient().rpc("c3r_p_find_record_v1", {
        p_user_id: authenticatedUserId,
        p_source_id: input.sourceId,
        p_problem_id: input.problemId,
        p_revision_id: input.revisionId,
        p_item_id: input.itemId,
        p_artifact_id: input.artifactId,
      });
      if (result.error) rpcError(result.error);
      if (result.data === null) return null;
      return stringValue(result.data);
    },

    async dashboard(asOf: string) {
      const result = await adminClient().rpc("c3r_p_load_dashboard_v1", {
        p_user_id: authenticatedUserId,
        p_as_of: asOf,
      });
      if (result.error) rpcError(result.error);
      return dashboard(result.data);
    },

    async createPlan(input: {
      commandId: string;
      planId: string;
      kind: "TODAY" | "FULL_DAY";
      availableMinutes: number;
      asOf: string;
      blocks: readonly C3RPPlanBlockInput[];
    }) {
      const result = await adminClient().rpc("c3r_p_create_plan_v1", {
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_plan_id: input.planId,
        p_plan_kind: input.kind,
        p_available_minutes: input.availableMinutes,
        p_as_of: input.asOf,
        p_blocks: input.blocks,
      });
      if (result.error) rpcError(result.error);
      return commandResult(result.data);
    },

    async decidePlan(input: {
      commandId: string;
      planId: string;
      expectedVersion: number;
      decision: "ACCEPT" | "EDIT" | "REJECT";
      asOf: string;
      blocks: readonly C3RPPlanBlockInput[] | null;
    }) {
      const result = await adminClient().rpc("c3r_p_decide_plan_v1", {
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_plan_id: input.planId,
        p_expected_version: input.expectedVersion,
        p_decision: input.decision,
        p_as_of: input.asOf,
        p_blocks: input.blocks,
      });
      if (result.error) rpcError(result.error);
      const parsed = commandResult(result.data);
      if (parsed.status === "stale_plan") throw new C3RPError("stale_plan");
      return parsed;
    },

    async exportData() {
      const result = await adminClient().rpc("c3r_p_export_learner_data_v1", {
        p_user_id: authenticatedUserId,
      });
      if (result.error) rpcError(result.error);
      return objectValue(result.data);
    },

    async deleteData() {
      const result = await adminClient().rpc("c3r_p_delete_learner_data_v1", {
        p_user_id: authenticatedUserId,
      });
      if (result.error) rpcError(result.error);
      return objectValue(result.data);
    },
  };
}
