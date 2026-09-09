import { FirstStageKernelError, exactObject, requiredIdentifier } from "../kernel/domain";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import type { PrivateFirstStageCatalog } from "./session-service";
import { createReviewedBankService } from "./reviewed-bank-service";
import { readPrivateSessionCommand, RequestTooLarge } from "./session-http";

export const REVIEWED_BANK_FLAG = "INVERGE_OWNER_REVIEWED_BANK_ENABLED";
export function reviewedBankEnabled(env: Readonly<Record<string, string | undefined>>) {
  return env[REVIEWED_BANK_FLAG] === "true" && env.VERCEL === undefined && env.VERCEL_ENV === undefined &&
    ["development", "test"].includes(env.NODE_ENV ?? "");
}
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache",
  Vary: "Cookie, Authorization", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });

/** Inside the existing Owner gate; a separate unconditional deploy denial precedes it. */
export async function handleReviewedBank(request: Request, dependencies: PrivateSessionApplicationDependencies,
  ownerId: string, catalog: PrivateFirstStageCatalog | null) {
  try {
    if (new URL(request.url).search !== "?view=bank") throw new FirstStageKernelError("invalid_input");
    if (request.method === "POST" && (request.headers.get("origin") !== new URL(request.url).origin ||
      request.headers.get("sec-fetch-site") === "cross-site")) return response({ ok: false, error: "not_found" }, 404);
    const input = request.method === "POST" ? exactObject(await readPrivateSessionCommand(request), ["action", "requestId"]) : null;
    if (input && input.action !== "assign_next") throw new FirstStageKernelError("invalid_input");
    if (!catalog || !dependencies.bankRepository) return response({ ok: false, error: "approved_content_required" }, 503);
    const service = createReviewedBankService(dependencies.repository(), dependencies.bankRepository(), catalog,
      dependencies.now ?? (() => new Date().toISOString()));
    if (!input) return response({ ok: true, bank: await service.availability(ownerId) });
    const result = await service.assign(ownerId, requiredIdentifier(input.requestId));
    return result.status === "assigned" ? response({ ok: true, view: result.view })
      : response({ ok: false, error: "bank_stock_unavailable", providerExecutionAllowed: false }, 409);
  } catch (error) {
    if (error instanceof RequestTooLarge) return response({ ok: false, error: "request_too_large" }, 413);
    if (error instanceof FirstStageKernelError) {
      if (error.code === "invalid_input") return response({ ok: false, error: "invalid_input" }, 400);
      if (["stale_state", "invalid_transition"].includes(error.code)) return response({ ok: false, error: "state_conflict" }, 409);
    }
    return response({ ok: false, error: "temporarily_unavailable" }, 503);
  }
}
