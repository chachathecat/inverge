import "server-only";
import { createOwnerOriginalApplication, createOwnerOriginalPeerReadApplication } from "./owner-original-context";
import { OWNER_ORIGINAL_FLAG, OWNER_INVESTMENT_FLAG } from "./owner-original-boundary";
import { loadOwnerOriginalContent } from "./owner-original-content";
import { loadOwnerOriginalSupply } from "./owner-investment-content";
import { readPrivateEconomicsContent } from "./approved-catalog";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { loadApprovedPrivateFirstStageCatalog, loadApprovedPrivateAccountingCatalog,
  loadApprovedPrivateCivilLawCatalog, loadApprovedPrivateRealEstatePrinciplesCatalog,
  loadApprovedPrivateAppraiserRelatedLawCatalog } from "./approved-catalog";
import type { PrivateFirstStageCatalog } from "./session-service";
import { createPrivateSessionApplication, privateFirstStageOwner, type PrivateContentBlocker, type PrivateSessionApplicationDependencies } from "./session-application";
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

const readOriginal = () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_ORIGINAL_CONTENT_PATH ?? "");
const loadOriginalSupply = () => loadOwnerOriginalSupply(readOriginal,
  process.env.INVERGE_OWNER_INVESTMENT_CONTENT_PATH ? () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_INVESTMENT_CONTENT_PATH!) : undefined,
  process.env[OWNER_INVESTMENT_FLAG] === "true");
async function originalHistoryCatalogs() {
  const catalogs = await Promise.all([loadOwnerOriginalContent(readOriginal), loadOriginalSupply()]);
  return catalogs.filter((catalog, index): catalog is PrivateFirstStageCatalog => catalog !== null && catalogs.findIndex(other => other?.digest === catalog.digest) === index);
}

function privateSubjectSession(subjectId: keyof typeof REVIEWED_CATALOG_LOADERS,
  unavailableBlocker: PrivateContentBlocker = "approved_content_required") {
  const catalog = REVIEWED_CATALOG_LOADERS[subjectId];
  const dependencies: PrivateSessionApplicationDependencies = {
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
  };
  return subjectId === "real_estate_principles" ? createPrivateSessionApplication(dependencies)
    : createOwnerOriginalPeerReadApplication(dependencies, originalHistoryCatalogs);
}

// Same gate and durable store; subject authority comes only from this server binding.
export const handlePrivateFirstStageSession = privateSubjectSession("economics_principles");
export const handlePrivateAccountingSession = privateSubjectSession("accounting");
export const handlePrivateCivilLawSession = privateSubjectSession("civil_law");
const reviewedRealEstateSession = privateSubjectSession("real_estate_principles");
const originalRealEstateSession = createOwnerOriginalApplication({
  environment: () => process.env,
  session: getServerSessionUser,
  catalog: loadOriginalSupply,
  peerCatalogs: async () => [...(await Promise.all(Object.values(REVIEWED_CATALOG_LOADERS).map(load => load())))
    .filter((catalog): catalog is PrivateFirstStageCatalog => catalog !== null), ...await originalHistoryCatalogs()],
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
// Only this existing subject endpoint selects the exact approved Owner bundles.
// All other subjects and the r3 endpoint retain their original composition.
export const handlePrivateRealEstatePrinciplesSession = (request: Request) =>
  process.env[OWNER_ORIGINAL_FLAG] === "true" ? originalRealEstateSession(request) : reviewedRealEstateSession(request);
export const handlePrivateAppraiserRelatedLawSession = privateSubjectSession("appraiser_related_law");
