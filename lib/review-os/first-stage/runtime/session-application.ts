import { FIRST_STAGE_FEATURE_FLAG, FIRST_STAGE_OWNER_ALLOWLIST } from "../kernel/domain";
import { createPrivateSessionHttpHandler } from "./session-http";
import { createPrivateFirstStageSessionService,
  type PrivateFirstStageCatalog, type PrivateFirstStageSessionStore } from "./session-service";

type Environment = Readonly<Record<string, string | undefined>>;
type Session = Readonly<{ isAuthenticated: boolean; userId?: string | null; email?: string | null }>;
export type PrivateContentBlocker = "approved_content_required" | "subject_applicability_implementation_required" | "owner_local_trial_content_required";

export interface PrivateSessionApplicationDependencies {
  environment(): Environment;
  session(): Promise<Session>;
  catalog(): Promise<PrivateFirstStageCatalog | null>;
  repository(): PrivateFirstStageSessionStore;
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
      const owner = await privateFirstStageOwner(dependencies.environment(), dependencies.session);
      if (!owner) return response({ ok: false, error: "not_found" }, 404);
      if (!["GET", "POST"].includes(request.method)) {
        return response({ ok: false, error: "method_not_allowed" }, 405);
      }
      const catalog = await dependencies.catalog();
      const blocker = dependencies.unavailableBlocker ?? "approved_content_required";
      if (request.method === "GET" && !new URL(request.url).search) {
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
        } });
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
