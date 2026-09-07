import "server-only";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { loadApprovedPrivateFirstStageCatalog } from "./approved-catalog";
import { createPrivateSessionApplication, privateFirstStageOwner } from "./session-application";
import { createPrivateSessionRepository } from "./session-repository";

export const requirePrivateFirstStageOwner = () =>
  privateFirstStageOwner(process.env, getServerSessionUser);

export const handlePrivateFirstStageSession = createPrivateSessionApplication({
  environment: () => process.env,
  session: getServerSessionUser,
  catalog: loadApprovedPrivateFirstStageCatalog,
  repository: () => {
    const client = getSupabasePersistenceClient();
    if (!client) throw new Error("first-stage-private-store-unavailable");
    return createPrivateSessionRepository(client);
  },
});
