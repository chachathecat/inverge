import { AsyncLocalStorage } from "node:async_hooks";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import { genuineTrialSession, isOwnerLocalR3TrialAdapter, ownerLocalR3TrialRequest } from "./owner-local-trial-boundary";

// An ephemeral request scope, not a token, receipt, login system or truth store.
// Even a structurally matching adapter is denied by the shared kernel outside
// this authenticated local-only request. No value can be supplied through HTTP.
const active = new AsyncLocalStorage<{ adapters: WeakSet<object>; open: boolean }>();
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
          if (!catalog || catalog.initialReferences.length !== 1 ||
            !activeOwnerLocalR3TrialAdapter(catalog.registry.require("economics_principles"))) return null;
          return catalog;
        } });
      const scope = { adapters: new WeakSet<object>(), open: true };
      try { return await active.run(scope, () => handler(canonicalRequest)); }
      finally { scope.open = false; } // Also revoke detached async work after response.
    } catch {
      return Response.json({ ok: false, error: "temporarily_unavailable" }, { status: 503, headers: safeHeaders });
    }
  };
}
