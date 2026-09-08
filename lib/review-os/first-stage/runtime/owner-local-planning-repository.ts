import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrialPlanningRecord, TrialPlanningStore } from "./owner-local-today";
const TABLE="first_stage_owner_local_planning";
const unavailable=():never=>{throw new Error("owner-local-planning-unavailable");};
function owner(value:string) { if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(value)) unavailable(); }
export function createOwnerLocalPlanningRepository(client:SupabaseClient):TrialPlanningStore {
  return {
    async load(ownerId) {
      owner(ownerId);
      const result=await client.from(TABLE).select("owner_id,revision,payload").eq("owner_id",ownerId).maybeSingle();
      if(result.error) unavailable();
      if(!result.data) return null;
      const {owner_id,revision,payload}=result.data;
      if(owner_id!==ownerId || payload?.ownerId!==ownerId || payload?.revision!==revision) unavailable();
      return payload as TrialPlanningRecord; // Full closed validation belongs to the service.
    },
    async save(value,expectedRevision) {
      owner(value.ownerId);
      if(!Number.isSafeInteger(expectedRevision) || expectedRevision<0 || value.revision!==expectedRevision+1) unavailable();
      const row={owner_id:value.ownerId,revision:value.revision,payload:value};
      if(expectedRevision===0) {
        const result=await client.from(TABLE).insert(row);
        if(result.error?.code==="23505") return false;
        if(result.error) unavailable();
        return true;
      }
      const result=await client.from(TABLE).update(row).eq("owner_id",value.ownerId).eq("revision",expectedRevision)
        .select("owner_id").maybeSingle();
      if(result.error) unavailable();
      return Boolean(result.data && result.data.owner_id===value.ownerId);
    },
  };
}
