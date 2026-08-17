import { NextResponse } from "next/server";

import {
  isDurableLearningAccessError,
  requireDurableLearningAccess,
} from "@/lib/review-os/durable-learning-access";
import {
  DurableLearningContractError,
  isDurablePlanDecision,
  isDurablePlanReason,
  parseDurableSubjectCommitment,
  parseFixedCommitments,
} from "@/lib/review-os/durable-learning-contract";
import { DurableLearningPersistenceError } from "@/lib/review-os/durable-learning-repository";
import { createDurableLearningService } from "@/lib/review-os/durable-learning-server";
import {
  TrustedRepairContractError,
  exactObject,
  parseJsonRejectingDuplicateKeys,
  requiredTrustedRepairText,
  requiredTrustedRepairUuid,
  requiredTrustedRepairVersion,
} from "@/lib/review-os/trusted-repair-contract";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

function errorResponse(error: unknown) {
  if (isDurableLearningAccessError(error)) {
    return response({ ok: false, error: "not_found" }, 404);
  }
  if (error instanceof DurableLearningPersistenceError) {
    if (error.code === "not_found") return response({ ok: false, error: "not_found" }, 404);
    if (error.code === "stale_record") return response({ ok: false, error: "stale_record" }, 409);
    return response({ ok: false, error: "temporarily_unavailable" }, 503);
  }
  if (error instanceof DurableLearningContractError) {
    if (error.code === "invalid_input") return response({ ok: false, error: "invalid_input" }, 400);
    if (error.code === "not_found") return response({ ok: false, error: "not_found" }, 404);
    return response({ ok: false, error: error.code }, 409);
  }
  if (error instanceof TrustedRepairContractError) {
    return response({ ok: false, error: "invalid_input" }, 400);
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}

function commonTransition(record: Record<string, unknown>) {
  return {
    caseId: requiredTrustedRepairUuid(record.caseId),
    expectedVersion: requiredTrustedRepairVersion(record.expectedVersion),
    commandId: requiredTrustedRepairUuid(record.commandId),
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireDurableLearningAccess();
    const caseId = requiredTrustedRepairUuid(new URL(request.url).searchParams.get("caseId"));
    const view = await createDurableLearningService(access.userId).load(caseId);
    return response({ ok: true, view });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Feature and identity checks deliberately precede all request-body work.
    const access = await requireDurableLearningAccess();
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (
      !contentType.toLowerCase().startsWith("application/json") ||
      (Number.isFinite(contentLength) && contentLength > 20_000)
    ) {
      throw new DurableLearningContractError("invalid_input");
    }
    const requestText = await request.text();
    if (requestText.length > 20_000) {
      throw new DurableLearningContractError("invalid_input");
    }
    const raw = parseJsonRejectingDuplicateKeys(requestText);
    const envelope = exactObject(raw, [
      "action",
      "sourceSessionId",
      "caseId",
      "expectedVersion",
      "commandId",
      "body",
      "commitment",
      "availableMinutes",
      "recoveryMode",
      "fixedCommitments",
      "decision",
      "reason",
    ]);
    if (typeof envelope.action !== "string") {
      throw new DurableLearningContractError("invalid_input");
    }
    const service = createDurableLearningService(access.userId);

    if (envelope.action === "start") {
      const record = exactObject(raw, ["action", "sourceSessionId", "commandId"]);
      const view = await service.start({
        sourceSessionId: requiredTrustedRepairUuid(record.sourceSessionId),
        commandId: requiredTrustedRepairUuid(record.commandId),
      });
      return response({ ok: true, view });
    }
    if (envelope.action === "prepare_attempt") {
      const record = exactObject(raw, ["action", "caseId", "expectedVersion", "commandId"]);
      return response({ ok: true, view: await service.prepareAttempt(commonTransition(record)) });
    }
    if (envelope.action === "record_evidence") {
      const record = exactObject(raw, [
        "action", "caseId", "expectedVersion", "commandId", "body", "commitment",
      ]);
      return response({
        ok: true,
        view: await service.recordEvidence({
          ...commonTransition(record),
          body: requiredTrustedRepairText(record.body, 12_000),
          commitment: parseDurableSubjectCommitment(record.commitment),
        }),
      });
    }
    if (envelope.action === "evaluate_currently_clear") {
      const record = exactObject(raw, ["action", "caseId", "expectedVersion", "commandId"]);
      return response({
        ok: true,
        view: await service.evaluateCurrentlyClear(commonTransition(record)),
      });
    }
    if (envelope.action === "build_plan") {
      const record = exactObject(raw, [
        "action", "caseId", "expectedVersion", "commandId", "availableMinutes",
        "recoveryMode", "fixedCommitments",
      ]);
      if (
        !Number.isInteger(record.availableMinutes) ||
        !["NORMAL", "MINIMUM_MAINTENANCE"].includes(String(record.recoveryMode))
      ) {
        throw new DurableLearningContractError("invalid_input");
      }
      return response({
        ok: true,
        view: await service.buildPlan({
          ...commonTransition(record),
          availableMinutes: Number(record.availableMinutes),
          recoveryMode: record.recoveryMode as "NORMAL" | "MINIMUM_MAINTENANCE",
          fixedCommitments: parseFixedCommitments(record.fixedCommitments),
        }),
      });
    }
    if (envelope.action === "decide_plan") {
      const record = exactObject(raw, [
        "action", "caseId", "expectedVersion", "commandId", "decision", "reason",
      ]);
      if (
        !isDurablePlanDecision(record.decision) ||
        record.decision === "PROPOSED" ||
        !isDurablePlanReason(record.reason)
      ) {
        throw new DurableLearningContractError("invalid_input");
      }
      return response({
        ok: true,
        view: await service.decidePlan({
          ...commonTransition(record),
          decision: record.decision,
          reason: record.reason,
        }),
      });
    }
    if (envelope.action === "export") {
      const record = exactObject(raw, ["action", "caseId", "expectedVersion"]);
      return response({
        ok: true,
        exportBundle: await service.exportCase({
          caseId: requiredTrustedRepairUuid(record.caseId),
          expectedVersion: requiredTrustedRepairVersion(record.expectedVersion),
        }),
      });
    }
    if (envelope.action === "delete") {
      const record = exactObject(raw, ["action", "caseId", "expectedVersion", "commandId"]);
      await service.deleteCase(commonTransition(record));
      return response({ ok: true, deleted: true });
    }
    throw new DurableLearningContractError("invalid_input");
  } catch (error) {
    return errorResponse(error);
  }
}
