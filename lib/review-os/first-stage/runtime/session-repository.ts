import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { FirstStageKernelError, requiredIdentifier } from "../kernel/domain";
import type { PrivateFirstStageSession, PrivateFirstStageSessionStore } from "./session-service";

const TABLE = "first_stage_private_sessions";
const COLUMNS = "owner_id,session_id,revision,payload";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function unavailable(): never { throw new Error("first-stage-private-store-unavailable"); }

function binding(ownerId: string, sessionId: string) {
  if (!UUID.test(ownerId)) throw new FirstStageKernelError("invalid_input");
  requiredIdentifier(sessionId);
}

function decode(raw: unknown, ownerId: string, sessionId: string): PrivateFirstStageSession {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) unavailable();
  const row = raw as Record<string, unknown>;
  const payload = row.payload as PrivateFirstStageSession | undefined;
  if (row.owner_id !== ownerId || row.session_id !== sessionId ||
    !payload || payload.ownerId !== ownerId || payload.sessionId !== sessionId ||
    row.revision !== payload.state?.revision) unavailable();
  // The service validates the entire unchanged kernel aggregate before use.
  return payload;
}

/** Existing Supabase transport, no file fallback and no optimistic success.
 * The private table is a LOCAL schema design only until separately approved;
 * absent schema fails closed. Callers supply the existing server-only client.
 */
export function createPrivateSessionRepository(client: SupabaseClient): PrivateFirstStageSessionStore {
  async function load(ownerId: string, sessionId: string) {
    binding(ownerId, sessionId);
    const result = await client.from(TABLE).select(COLUMNS)
      .eq("owner_id", ownerId).eq("session_id", sessionId).maybeSingle();
    if (result.error) unavailable();
    return result.data ? decode(result.data, ownerId, sessionId) : null;
  }

  return {
    load,
    async listOwnerSnapshot(ownerId, schema) {
      if (!UUID.test(ownerId) || !["first_stage.private_session.v1", "first_stage.owner_local_trial_session.v1"].includes(schema)) {
        throw new FirstStageKernelError("invalid_input");
      }
      const result = await client.from(TABLE).select(COLUMNS, { count: "exact" })
        .eq("owner_id", ownerId).eq("payload->>schemaVersion", schema)
        .order("session_id", { ascending: true }).range(0, 256);
      if (result.error || !Array.isArray(result.data) || !Number.isSafeInteger(result.count) ||
        result.count! < result.data.length || result.data.length > 257) unavailable();
      return { complete: result.count === result.data.length && result.data.length <= 256,
        sessions: result.data.slice(0, 256).map(row => decode(row, ownerId, row.session_id)) };
    },
    async create(value) {
      binding(value.ownerId, value.sessionId);
      if (value.state.revision !== 1) throw new FirstStageKernelError("invalid_transition");
      const result = await client.from(TABLE).insert({
        owner_id: value.ownerId, session_id: value.sessionId,
        revision: value.state.revision, payload: value,
      });
      if (result.error && result.error.code !== "23505") unavailable();
      const saved = await load(value.ownerId, value.sessionId);
      if (!saved) unavailable();
      return saved;
    },
    async createOriginalIfAbsent(value) {
      binding(value.ownerId,value.sessionId);
      if(value.schemaVersion!=="first_stage.owner_local_trial_session.v1" || value.state.revision!==1) {
        throw new FirstStageKernelError("invalid_transition");
      }
      const result=await client.rpc("inverge_owner_local_reserve_original",{
        p_owner:value.ownerId,p_session:value.sessionId,p_payload:value });
      if(result.error) unavailable();
      if(result.data===null) return null;
      return decode({owner_id:value.ownerId,session_id:value.sessionId,
        revision:result.data.state?.revision,payload:result.data},value.ownerId,value.sessionId);
    },
    async replace(value, expectedRevision) {
      binding(value.ownerId, value.sessionId);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 ||
        value.state.revision !== expectedRevision + 1) {
        throw new FirstStageKernelError("invalid_transition");
      }
      const result = await client.from(TABLE).update({ revision: value.state.revision, payload: value })
        .eq("owner_id", value.ownerId).eq("session_id", value.sessionId)
        .eq("revision", expectedRevision).select("session_id").maybeSingle();
      if (result.error) unavailable();
      if (!result.data) return false;
      if (result.data.session_id !== value.sessionId) unavailable();
      return true;
    },
  };
}
