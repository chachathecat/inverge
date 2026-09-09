import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requiredIdentifier } from "../kernel/domain";
import type { ReviewedBankRecord, ReviewedBankStore } from "./reviewed-bank-service";

const TABLE = "first_stage_private_sessions";
function unavailable(): never { throw new Error("reviewed-bank-store-unavailable"); }
function binding(owner: string, id: string) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(owner)) unavailable();
  requiredIdentifier(id);
}
function decode(value: unknown, owner: string, id: string): ReviewedBankRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) unavailable();
  const record = value as ReviewedBankRecord;
  if (record.session?.ownerId !== owner || record.session.sessionId !== id ||
    !record.assignment || record.assignment.learnerScopeId !== id) unavailable();
  return record; // Complete aggregate and selector rehydration in service, before disclosure.
}
/** Additive column in the SAME session row. No alternative store or file fallback.
 * Missing local-design installation is an explicit outage, never no stock. */
export function createReviewedBankRepository(client: SupabaseClient): ReviewedBankStore {
  return {
    async load(owner, id) {
      binding(owner, id);
      const result = await client.from(TABLE).select("owner_id,session_id,revision,payload,reviewed_bank_assignment")
        .eq("owner_id", owner).eq("session_id", id).maybeSingle();
      if (result.error) unavailable();
      if (!result.data || result.data.reviewed_bank_assignment === null) return null;
      if (result.data.owner_id !== owner || result.data.session_id !== id || result.data.revision !== result.data.payload?.state?.revision) unavailable();
      return decode({ session: result.data.payload, assignment: result.data.reviewed_bank_assignment }, owner, id);
    },
    async reserve(session, assignment) {
      binding(session.ownerId, session.sessionId);
      const result = await client.rpc("inverge_reviewed_bank_reserve", {
        p_owner: session.ownerId, p_session: session.sessionId, p_payload: session, p_assignment: assignment,
      });
      if (result.error) unavailable();
      return result.data === null ? null : decode(result.data, session.ownerId, session.sessionId);
    },
  };
}
