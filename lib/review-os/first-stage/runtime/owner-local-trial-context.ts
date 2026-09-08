import { AsyncLocalStorage } from "node:async_hooks";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import { privateSessionDigest, type PrivateFirstStageCatalog, type PrivateFirstStageSession } from "./session-service";
import type { QuestionReference } from "../kernel/domain";
import { genuineTrialSession, isOwnerLocalR3TrialAdapter, ownerLocalR3TrialRequest } from "./owner-local-trial-boundary";

// An ephemeral request scope, not a token, receipt, login system or truth store.
// Even a structurally matching adapter is denied by the shared kernel outside
// this authenticated local-only request. No value can be supplied through HTTP.
const active = new AsyncLocalStorage<{ adapters: WeakSet<object>; open: boolean;
  catalogs: WeakMap<object, { previousDigest: string; originalReferenceDigest: string }> }>();
export function authorizeOwnerLocalR3TrialAdapter(adapter: {
  adapterId: string; adapterVersion: string; subjectId: string;
}): void {
  const scope = active.getStore();
  if (!scope?.open || !isOwnerLocalR3TrialAdapter(adapter)) throw new Error("owner_local_trial_unavailable");
  scope.adapters.add(adapter);
}
export function activeOwnerLocalR3TrialAdapter(adapter: object): boolean {
  const scope = active.getStore();
  return scope?.open === true && scope.adapters.has(adapter);
}

/** Request-local registration by the validated loader; never persisted or supplied
 * by HTTP. Compatibility is only the unchanged installation's old 46 catalog. */
export function authorizeOwnerLocalR3TrialCatalog(catalog: PrivateFirstStageCatalog,
  previousDigest: string, original: QuestionReference): void {
  const scope = active.getStore();
  if (!scope?.open || !activeOwnerLocalR3TrialAdapter(catalog.registry.require("economics_principles")) ||
    !/^[a-f0-9]{64}$/u.test(previousDigest) || original.questionId !== "qnet-2025-36-s1-A-46" ||
    catalog.initialReferences.length < 1 || catalog.initialReferences.length > 5 ||
    new Set(catalog.initialReferences.map(row => row.questionId)).size !== catalog.initialReferences.length) throw new Error("owner_local_trial_unavailable");
  for (const reference of catalog.initialReferences) {
    if (reference.schemaVersion !== "first_stage.owner_local_trial_question_reference.v1" ||
      reference.subjectId !== "economics_principles" || ![46,49,51,52,53].includes(reference.questionNumber) ||
      reference.questionId !== `qnet-2025-36-s1-A-${reference.questionNumber}`) throw new Error("owner_local_trial_unavailable");
    catalog.registry.require(reference.subjectId).assertQuestionReference(reference);
  }
  scope.catalogs.set(catalog, { previousDigest, originalReferenceDigest: privateSessionDigest(original) });
}
export function activeOwnerLocalR3TrialCatalog(catalog: PrivateFirstStageCatalog): boolean {
  const scope = active.getStore();
  return scope?.open === true && scope.catalogs.has(catalog);
}
export function acceptsOwnerLocalR3PreviousCatalog(catalog: PrivateFirstStageCatalog, value: PrivateFirstStageSession): boolean {
  const scope = active.getStore(), binding = scope?.open ? scope.catalogs.get(catalog) : undefined;
  return Boolean(binding && value.schemaVersion === "first_stage.owner_local_trial_session.v1" &&
    value.catalogDigest === binding.previousDigest && value.state.examCycle.questionReferences.length === 1 &&
    privateSessionDigest(value.state.examCycle.questionReferences[0]) === binding.originalReferenceDigest);
}

/** Production composition supplies the existing real getServerSessionUser;
 * synthetic tests substitute that port explicitly, never through an HTTP flag. */
export function createOwnerLocalTrialApplication(dependencies: PrivateSessionApplicationDependencies) {
  return async (request: Request): Promise<Response> => {
    const safeHeaders = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff", Vary: "Cookie, Authorization" };
    const denied = () => Response.json({ ok: false, error: "not_found" }, { status: 404,
      headers: safeHeaders });
    try {
      const environment = dependencies.environment();
      if (!ownerLocalR3TrialRequest(environment, request)) return denied();
      const { createPrivateSessionApplication, privateFirstStageOwner } = await import("./session-application");
      const session = await dependencies.session();
      if (!genuineTrialSession(session) || !await privateFirstStageOwner(environment, async () => session)) return denied();
      // Only after the exact Host/Origin + server/auth gates: undo NextRequest's
      // internal localhost spelling for the unchanged downstream CSRF comparison.
      // Preserve the body stream, headers and abort signal; never pre-read bodies.
      const canonicalUrl = new URL(request.url);
      canonicalUrl.hostname = "127.0.0.1";
      const canonicalRequest = new Request(canonicalUrl, request);
      const handler = createPrivateSessionApplication({ ...dependencies,
        unavailableBlocker: "owner_local_trial_content_required",
        environment: () => environment, session: async () => session,
        catalog: async () => {
          const catalog = await dependencies.catalog();
          if (!catalog || !activeOwnerLocalR3TrialCatalog(catalog)) return null;
          return catalog;
        } });
      const scope = { adapters: new WeakSet<object>(), catalogs: new WeakMap(), open: true };
      try { return await active.run(scope, async () => {
        if (canonicalUrl.searchParams.has("view")) {
          const { handleOwnerLocalToday } = await import("./owner-local-today-http");
          return handleOwnerLocalToday(canonicalRequest, dependencies, session.userId!);
        }
        return handler(canonicalRequest);
      }); }
      finally { scope.open = false; } // Also revoke detached async work after response.
    } catch {
      return Response.json({ ok: false, error: "temporarily_unavailable" }, { status: 503, headers: safeHeaders });
    }
  };
}
