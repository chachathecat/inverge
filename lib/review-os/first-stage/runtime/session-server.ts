import "server-only";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { loadApprovedPrivateFirstStageCatalog, loadApprovedPrivateAccountingCatalog } from "./approved-catalog";
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

// Same gate and durable store; subject authority comes only from this server binding.
export const handlePrivateAccountingSession = createPrivateSessionApplication({
  environment: () => process.env,
  session: getServerSessionUser,
  catalog: loadApprovedPrivateAccountingCatalog,
  repository: () => {
    const client = getSupabasePersistenceClient();
    if (!client) throw new Error("first-stage-private-store-unavailable");
    return createPrivateSessionRepository(client);
  },
});
