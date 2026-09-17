import { FIRST_STAGE_FEATURE_FLAG, FIRST_STAGE_OWNER_ALLOWLIST } from "../kernel/domain";
import { createPrivateSessionHttpHandler } from "./session-http";
import { createPrivateFirstStageSessionService,
  type PrivateFirstStageCatalog, type PrivateFirstStageSessionStore } from "./session-service";
import type { TrialPlanningStore } from "./owner-local-today";
import { createReviewedBankService, type ReviewedBankStore } from "./reviewed-bank-service";
import { handleReviewedBank, reviewedBankEnabled } from "./reviewed-bank-http";
import { reviewedBankCandidates } from "./private-reviewed-content";
import { activeOwnerOriginalCatalog } from "./owner-original-context";
import { OWNER_ORIGINAL_NOTICE, OWNER_ORIGINAL_SCOPE } from "./owner-original-boundary";

type Environment = Readonly<Record<string, string | undefined>>;
type Session = Readonly<{ isAuthenticated: boolean; userId?: string | null; email?: string | null }>;
export type PrivateContentBlocker = "approved_content_required" | "subject_applicability_implementation_required" | "owner_local_trial_content_required";

export interface PrivateSessionApplicationDependencies {
  environment(): Environment;
  session(): Promise<Session>;
  catalog(): Promise<PrivateFirstStageCatalog | null>;
  /** Other server-loaded reviewed subject catalogs used only to validate and
   * exclude their complete durable rows from this subject's Today projection. */
  peerCatalogs?(): Promise<readonly PrivateFirstStageCatalog[]>;
  repository(): PrivateFirstStageSessionStore;
  planningRepository?(): TrialPlanningStore;
  bankRepository?(): ReviewedBankStore;
  /** Fixed by the server subject binding; never request/content authority. */
  unavailableBlocker?: PrivateContentBlocker;
  now?(): string;
}

/** Same closed gate as the existing Owner-first-stage page, not a new auth policy. */
export async function privateFirstStageOwner(environment: Environment, session: () => Promise<Session>) {
  if (environment[FIRST_STAGE_FEATURE_FLAG] !== "true" ||
    environment.VERCEL_ENV === "production" ||
    (environment.NODE_ENV === "production" && environment.VERCEL_ENV !== "preview")) return null;
  const user = await session();
  const email = user.email?.trim().toLowerCase();
  const emails = (value: string | undefined) => (value ?? "").split(",")
    .map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  if (!user.isAuthenticated || !user.userId || !email ||
    !emails(environment.ALPHA_ADMIN_EMAILS).includes(email) ||
    !emails(environment[FIRST_STAGE_OWNER_ALLOWLIST]).includes(email)) return null;
  return { ownerId: user.userId, email };
}

const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache",
  Vary: "Cookie, Authorization", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });

/** Production composition; tests substitute only auth, catalog, storage and clock ports. */
export function createPrivateSessionApplication(dependencies: PrivateSessionApplicationDependencies) {
  return async function handle(request: Request): Promise<Response> {
    try {
      const bankRequest = new URL(request.url).searchParams.get("view") === "bank";
      if (bankRequest && !reviewedBankEnabled(dependencies.environment())) return response({ ok: false, error: "not_found" }, 404);
      const owner = await privateFirstStageOwner(dependencies.environment(), dependencies.session);
      if (!owner) return response({ ok: false, error: "not_found" }, 404);
      if (!["GET", "POST"].includes(request.method)) {
        return response({ ok: false, error: "method_not_allowed" }, 405);
      }
      const catalog = await dependencies.catalog();
      if (bankRequest) return handleReviewedBank(request, dependencies, owner.ownerId, catalog);
      const blocker = dependencies.unavailableBlocker ?? "approved_content_required";
      if (request.method === "GET" && !new URL(request.url).search) {
        const bankPractice = Boolean(reviewedBankEnabled(dependencies.environment()) && catalog && (reviewedBankCandidates(catalog) || activeOwnerOriginalCatalog(catalog)));
        if (bankPractice && !dependencies.bankRepository) return response({ ok: false, error: "temporarily_unavailable" }, 503);
        let availabilityStore = catalog ? dependencies.repository() : null;
        if (bankPractice && availabilityStore) {
          // One request-scoped database observation for both continuation and stock.
          // A concurrent reservation must not mix old continuation with new stock.
          const snapshot = await availabilityStore.listOwnerSnapshot?.(owner.ownerId, "first_stage.private_session.v1");
          if (!snapshot?.complete) return response({ ok: false, error: "temporarily_unavailable" }, 503);
          availabilityStore = { ...availabilityStore, listOwnerSnapshot: async (readOwner, schema) => {
            if (readOwner !== owner.ownerId || schema !== "first_stage.private_session.v1") throw new Error("snapshot_scope_mismatch");
            return snapshot;
          } };
        }
        const continuation = catalog && availabilityStore
          ? await createPrivateFirstStageSessionService(
              availabilityStore,
              catalog,
              dependencies.now,
            ).getTodayContinuation(owner.ownerId, dependencies.peerCatalogs)
          : {
              schemaVersion: "first_stage.private_today_continuation.v1" as const,
              state: "ready" as const,
              action: null,
            };
        if (catalog && continuation.state !== "ready") {
          return response({ ok: false, error: "temporarily_unavailable" }, 503);
        }
        const bankStock = bankPractice && catalog && availabilityStore && dependencies.bankRepository
          ? await createReviewedBankService(availabilityStore, dependencies.bankRepository(), catalog,
              dependencies.now ?? (() => new Date().toISOString())).availability(owner.ownerId)
          : null;
        const originalHistory = catalog && activeOwnerOriginalCatalog(catalog) && availabilityStore ?
          (await availabilityStore.listOwnerSnapshot!(owner.ownerId, "first_stage.private_session.v1")).sessions
            .filter(saved => saved.catalogDigest === catalog.digest)
            .map(saved => createPrivateFirstStageSessionService(availabilityStore, catalog, dependencies.now).projectHistory(saved, owner.ownerId))
            .filter(history => history.attempted)
            .sort((left, right) => (right.committedAttempts.at(-1)?.submittedAt ?? right.active?.startedAt ?? "").localeCompare(left.committedAttempts.at(-1)?.submittedAt ?? left.active?.startedAt ?? "") || left.sessionId.localeCompare(right.sessionId))
            .slice(0, 10).map(history => ({ sessionId: history.sessionId, responses: history.committedAttempts.length,
              reviewCompleted: history.reviews.length > 0 && history.reviews.every(review => review.status === "completed") })) : null;
        // Existing content remains addressable even when every original is reserved.
        // No adapter presentation or explanation construction in availability.
        return response({ ok: true, availability: {
          schemaVersion: "first_stage.private_availability.v1",
          state: catalog?.initialReferences.length ? "available" : "blocked",
          blocker: catalog?.initialReferences.length ? null : blocker,
          questions: (catalog?.initialReferences ?? []).map((item) => ({
            questionId: item.questionId, subjectId: item.subjectId,
            questionNumber: item.questionNumber,
          })),
          masteryClaim: false, transferEvidence: false,
          ...(catalog && activeOwnerOriginalCatalog(catalog) ? { contentStatus: "machine_checked_owner_local", notice: OWNER_ORIGINAL_NOTICE, scope: OWNER_ORIGINAL_SCOPE, humanReviewComplete: false, recentRecords: originalHistory } : {}),
          ...(bankStock ? { bankPractice: true, availableOriginals: bankStock.availableOriginals } : {}),
        }, continuation });
      }
      if (!catalog?.initialReferences.length) {
        return response({ ok: false, error: blocker }, 503);
      }
      const handler = createPrivateSessionHttpHandler({
        requireOwner: async () => owner.ownerId,
        service: async () => createPrivateFirstStageSessionService(
          dependencies.repository(), catalog, dependencies.now),
      });
      return await handler(request);
    } catch {
      return response({ ok: false, error: "temporarily_unavailable" }, 503);
    }
  };
}
