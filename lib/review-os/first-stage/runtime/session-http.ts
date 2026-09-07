import {
  FirstStageKernelError,
  exactObject,
  parseJsonRejectingDuplicateKeys,
  requiredIdentifier,
} from "../kernel/domain";
import type { createPrivateFirstStageSessionService } from "./session-service";

// Below the unchanged kernel parser's 20,000-character guard. This narrow
// selection-only endpoint carries no question, answer text or content authority.
export const PRIVATE_SESSION_MAX_REQUEST_BYTES = 16_384;

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

type SessionService = ReturnType<typeof createPrivateFirstStageSessionService>;

export interface PrivateSessionHttpDependencies {
  /** Existing authenticated Owner/default-off/non-Production gate, before I/O. */
  requireOwner(): Promise<string | null>;
  /** Trusted server catalog and durable repository only; never built from input. */
  service(ownerId: string): Promise<SessionService>;
}

class RequestTooLarge extends Error {}

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: HEADERS });
}

function invalid(): never { throw new FirstStageKernelError("invalid_input"); }

async function readCommand(request: Request): Promise<unknown> {
  const type = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json" || !request.body) invalid();
  const declared = Number(request.headers.get("content-length"));
  if (Number.isSafeInteger(declared) && declared > PRIVATE_SESSION_MAX_REQUEST_BYTES) {
    void request.body.cancel().catch(() => undefined);
    throw new RequestTooLarge();
  }
  const bytes = new Uint8Array(PRIVATE_SESSION_MAX_REQUEST_BYTES);
  const reader = request.body.getReader();
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > bytes.length - received) {
        void reader.cancel().catch(() => undefined);
        throw new RequestTooLarge();
      }
      bytes.set(value, received);
      received += value.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, received));
    return parseJsonRejectingDuplicateKeys(text);
  } catch (error) {
    if (error instanceof RequestTooLarge) throw error;
    invalid();
  } finally {
    reader.releaseLock();
  }
}

function requestOriginAllowed(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

/** Transport boundary only: returns a current durable projection, never state/receipts. */
export function createPrivateSessionHttpHandler(dependencies: PrivateSessionHttpDependencies) {
  return async function handle(request: Request): Promise<Response> {
    try {
      const ownerId = await dependencies.requireOwner();
      if (!ownerId) return response({ ok: false, error: "not_found" }, 404);
      if (request.method !== "GET" && request.method !== "POST") {
        return response({ ok: false, error: "method_not_allowed" }, 405);
      }
      const url = new URL(request.url);
      if (request.method === "GET") {
        const entries = [...url.searchParams.entries()];
        if (entries.length !== 1 || entries[0][0] !== "sessionId") invalid();
        const sessionId = requiredIdentifier(entries[0][1]);
        const service = await dependencies.service(ownerId);
        return response({ ok: true, view: await service.view(ownerId, sessionId) });
      }
      if (!requestOriginAllowed(request)) {
        return response({ ok: false, error: "not_found" }, 404);
      }
      if (url.search) invalid();
      const command = await readCommand(request);
      if (!command || typeof command !== "object" || Array.isArray(command)) invalid();
      const row = command as Record<string, unknown>;
      if (row.action === "create") {
        exactObject(row, ["action", "requestId", "questionId"]);
        const input = { requestId: requiredIdentifier(row.requestId),
          questionId: requiredIdentifier(row.questionId) };
        const service = await dependencies.service(ownerId);
        const saved = await service.create(ownerId, input);
        return response({ ok: true, view: await service.view(ownerId, saved.sessionId) });
      }
      exactObject(row, ["sessionId", "command"]);
      const sessionId = requiredIdentifier(row.sessionId);
      const service = await dependencies.service(ownerId);
      await service.execute(ownerId, sessionId, row.command);
      return response({ ok: true, view: await service.view(ownerId, sessionId) });
    } catch (error) {
      if (error instanceof RequestTooLarge) {
        return response({ ok: false, error: "request_too_large" }, 413);
      }
      if (error instanceof FirstStageKernelError) {
        if (error.code === "invalid_input") return response({ ok: false, error: "invalid_input" }, 400);
        if (error.code === "not_found") {
          return response({ ok: false, error: "not_found" }, 404);
        }
        if (error.code === "stale_state" || error.code === "invalid_transition") {
          return response({ ok: false, error: "state_conflict" }, 409);
        }
      }
      // No exception message, response echo, catalog body or optimistic result.
      return response({ ok: false, error: "temporarily_unavailable" }, 503);
    }
  };
}
