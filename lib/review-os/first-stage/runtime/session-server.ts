import "server-only";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { loadApprovedPrivateFirstStageCatalog, loadApprovedPrivateAccountingCatalog,
  loadApprovedPrivateCivilLawCatalog, loadApprovedPrivateRealEstatePrinciplesCatalog,
  loadApprovedPrivateAppraiserRelatedLawCatalog } from "./approved-catalog";
import type { PrivateFirstStageCatalog } from "./session-service";
import { createPrivateSessionApplication, privateFirstStageOwner } from "./session-application";
import { createPrivateSessionRepository } from "./session-repository";

export const requirePrivateFirstStageOwner = () =>
  privateFirstStageOwner(process.env, getServerSessionUser);

function privateSubjectSession(catalog: () => Promise<PrivateFirstStageCatalog | null>) {
  return createPrivateSessionApplication({
    environment: () => process.env,
    session: getServerSessionUser,
    catalog,
    repository: () => {
      const client = getSupabasePersistenceClient();
      if (!client) throw new Error("first-stage-private-store-unavailable");
      return createPrivateSessionRepository(client);
    },
  });
}

// Same gate and durable store; subject authority comes only from this server binding.
export const handlePrivateFirstStageSession = privateSubjectSession(loadApprovedPrivateFirstStageCatalog);
export const handlePrivateAccountingSession = privateSubjectSession(loadApprovedPrivateAccountingCatalog);
export const handlePrivateCivilLawSession = privateSubjectSession(loadApprovedPrivateCivilLawCatalog);
export const handlePrivateRealEstatePrinciplesSession = privateSubjectSession(loadApprovedPrivateRealEstatePrinciplesCatalog);
export const handlePrivateAppraiserRelatedLawSession = privateSubjectSession(loadApprovedPrivateAppraiserRelatedLawCatalog);
