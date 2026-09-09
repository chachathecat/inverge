import { privateFirstStageOwner } from "../review-os/first-stage/runtime/session-application";
import { readPrivateSessionCommand, RequestTooLarge } from "../review-os/first-stage/runtime/session-http";
import { bridgeFailure, type SnapshotBridge } from "./owner-snapshot-bridge";
import { localBridgeEnabled } from "./owner-snapshot-bridge-contract";
export { localBridgeEnabled } from "./owner-snapshot-bridge-contract";
type Environment = Readonly<Record<string, string | undefined>>;
export type BridgeSession = Readonly<{ isAuthenticated: boolean; isDemo: boolean; authEnabled: boolean;
  source: string; userId: string | null; email: string | null }>;
export const LOCAL_BRIDGE_ORIGIN = "http://127.0.0.1:3883";
export async function bridgeOwner(env: Environment, session: () => Promise<BridgeSession>) {
  if (!localBridgeEnabled(env)) return null;
  const user = await session();
  if (!user.isAuthenticated || user.isDemo !== false || !user.authEnabled || user.source !== "supabase") return null;
  return privateFirstStageOwner(env, async () => user);
}
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache",
  Vary: "Cookie, Authorization", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const response = (body: unknown, status = 200) => Response.json(body, { status, headers });
function localRequest(request: Request) {
  // Next may normalize request.url to localhost. Forwarded headers never authorize a host.
  return request.headers.get("host") === "127.0.0.1:3883" &&
    (!request.headers.has("origin") || request.headers.get("origin") === LOCAL_BRIDGE_ORIGIN) &&
    !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "");
}
const object = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x);
export function createSnapshotBridgeHandler(deps: {
  environment(): Environment; session(): Promise<BridgeSession>; bridge(): Promise<SnapshotBridge | null>;
}) {
  return async (request: Request): Promise<Response> => {
    try {
      if (!localRequest(request) || !await bridgeOwner(deps.environment(), deps.session))
        return response(bridgeFailure("ACCESS_DENIED"), 404);
      if (!["GET", "POST"].includes(request.method)) return response(bridgeFailure("INVALID_INPUT"), 405);
      if (new URL(request.url).search) return response(bridgeFailure("INVALID_INPUT"), 400);
      let body: Record<string, unknown> | undefined;
      if (request.method === "POST") {
        let value: unknown;
        try { value = await readPrivateSessionCommand(request); }
        catch (error) { return response(bridgeFailure("INVALID_INPUT"), error instanceof RequestTooLarge ? 413 : 400); }
        if (!object(value) || Object.keys(value).some(k => !["action", "input", "reference"].includes(k)) ||
          (value.action !== "search" && value.action !== "reopen") ||
          (value.action === "search" ? !object(value.input) || value.reference !== undefined : !object(value.reference) || value.input !== undefined))
          return response(bridgeFailure("INVALID_INPUT"), 400);
        body = value;
      }
      const bridge = await deps.bridge();
      if (!bridge) return response(bridgeFailure("NOT_CONFIGURED"), 503);
      const result = !body ? bridge.list() : body.action === "search" ? bridge.search(body.input) : bridge.reopen(body.reference);
      return response(result, ["INTEGRITY_ERROR", "SEARCH_FAILED"].includes(result.state) ? 503 : 200);
    } catch { return response(bridgeFailure("SEARCH_FAILED"), 503); }
  };
}
