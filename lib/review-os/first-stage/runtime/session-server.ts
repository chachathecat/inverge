import "server-only";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { loadApprovedPrivateFirstStageCatalog, loadApprovedPrivateAccountingCatalog,
  loadApprovedPrivateCivilLawCatalog, loadApprovedPrivateRealEstatePrinciplesCatalog,
  loadApprovedPrivateAppraiserRelatedLawCatalog } from "./approved-catalog";
import type { PrivateFirstStageCatalog } from "./session-service";
import { createPrivateSessionApplication, privateFirstStageOwner, type PrivateContentBlocker } from "./session-application";
import { createPrivateSessionRepository } from "./session-repository";
import { createReviewedBankRepository } from "./reviewed-bank-repository";

export const requirePrivateFirstStageOwner = () =>
  privateFirstStageOwner(process.env, getServerSessionUser);

const REVIEWED_CATALOG_LOADERS = {
  economics_principles: loadApprovedPrivateFirstStageCatalog,
  accounting: loadApprovedPrivateAccountingCatalog,
  civil_law: loadApprovedPrivateCivilLawCatalog,
  real_estate_principles: loadApprovedPrivateRealEstatePrinciplesCatalog,
  appraiser_related_law: loadApprovedPrivateAppraiserRelatedLawCatalog,
} as const;

function privateSubjectSession(subjectId: keyof typeof REVIEWED_CATALOG_LOADERS,
  unavailableBlocker: PrivateContentBlocker = "approved_content_required") {
  const catalog = REVIEWED_CATALOG_LOADERS[subjectId];
  return createPrivateSessionApplication({
    environment: () => process.env,
    session: getServerSessionUser,
    catalog,
    peerCatalogs: async () => (await Promise.all(
      Object.entries(REVIEWED_CATALOG_LOADERS)
        .filter(([candidate]) => candidate !== subjectId)
        .map(([, load]) => load()),
    )).filter((candidate): candidate is PrivateFirstStageCatalog => candidate !== null),
    unavailableBlocker,
    repository: () => {
      const client = getSupabasePersistenceClient();
      if (!client) throw new Error("first-stage-private-store-unavailable");
      return createPrivateSessionRepository(client);
    },
    bankRepository: () => {
      const client = getSupabasePersistenceClient();
      if (!client) throw new Error("reviewed-bank-store-unavailable");
      return createReviewedBankRepository(client);
    },
  });
}

// Same gate and durable store; subject authority comes only from this server binding.
export const handlePrivateFirstStageSession = privateSubjectSession("economics_principles");
export const handlePrivateAccountingSession = privateSubjectSession("accounting");
export const handlePrivateCivilLawSession = privateSubjectSession("civil_law");
export const handlePrivateRealEstatePrinciplesSession = privateSubjectSession("real_estate_principles");
export const handlePrivateAppraiserRelatedLawSession = privateSubjectSession("appraiser_related_law");
