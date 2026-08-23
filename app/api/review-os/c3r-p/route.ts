import { NextResponse } from "next/server";

import {
  C3RPError,
  c3rPExactObject,
  c3rPRequiredText,
  c3rPRequiredUuid,
  type C3RPPlanBlock,
} from "@/lib/review-os/c3r-p-contract";
import {
  createC3RPService,
  requireC3RPAccess,
} from "@/lib/review-os/c3r-p-service";
import {
  parseJsonRejectingDuplicateKeys,
  parsePracticeCalculationClaimV2Input,
} from "@/lib/review-os/trusted-repair-contract";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}
function errorResponse(error: unknown) {
  if (error instanceof C3RPError) {
    if (["feature_disabled", "production_denied", "auth_required", "owner_required", "not_found"].includes(error.code)) {
      return response({ ok: false, error: "not_found" }, 404);
    }
    if (error.code === "invalid_input") {
      return response({ ok: false, error: error.code }, 400);
    }
    if (["invalid_transition", "stale_record", "stale_plan"].includes(error.code)) {
      return response({ ok: false, error: error.code }, 409);
    }
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}

function requiredInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new C3RPError("invalid_input");
  }
  return Number(value);
}

function optionalEvidenceStep(value: unknown) {
  if (value === undefined) return undefined;
  return c3rPRequiredText(value, 20);
}

function common(record: Record<string, unknown>) {
  return {
    commandId: c3rPRequiredUuid(record.commandId),
    recordId: c3rPRequiredUuid(record.recordId),
    expectedVersion: requiredInteger(record.expectedVersion, 1),
    evidenceStep: optionalEvidenceStep(record.evidenceStep),
  };
}

function planBlocks(value: unknown) {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > 48) {
    throw new C3RPError("invalid_input");
  }
  return value.map((block) => {
    const row = c3rPExactObject(block, [
      "blockId",
      "blockKind",
      "recordId",
      "gapId",
      "ordinal",
      "minutes",
    ]);
    if (!["CORE_OUTCOME", "SUPPORT"].includes(String(row.blockKind))) {
      throw new C3RPError("invalid_input");
    }
    return {
      blockId: c3rPRequiredUuid(row.blockId),
      blockKind: row.blockKind as C3RPPlanBlock["blockKind"],
      recordId: c3rPRequiredUuid(row.recordId),
      gapId: c3rPRequiredUuid(row.gapId),
      ordinal: requiredInteger(row.ordinal, 1),
      minutes: requiredInteger(row.minutes, 1),
    } satisfies C3RPPlanBlock;
  });
}

export async function GET(request: Request) {
  try {
    const access = await requireC3RPAccess();
    const recordIdValue = new URL(request.url).searchParams.get("recordId");
    const recordId = recordIdValue ? c3rPRequiredUuid(recordIdValue) : null;
    const view = await createC3RPService(access.userId).view(recordId);
    return response({ ok: true, view });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireC3RPAccess();
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (
      !contentType.toLowerCase().startsWith("application/json") ||
      (Number.isFinite(contentLength) && contentLength > 60_000)
    ) {
      throw new C3RPError("invalid_input");
    }
    const raw = parseJsonRejectingDuplicateKeys(await request.text());
    const envelope = c3rPExactObject(raw, [
      "action",
      "commandId",
      "recordId",
      "expectedVersion",
      "attemptId",
      "attemptBody",
      "prediction",
      "confidence",
      "evidenceStep",
      "gapId",
      "failureNoteId",
      "assistanceEventId",
      "failureNote",
      "claim",
      "planId",
      "kind",
      "availableMinutes",
      "decision",
      "blocks",
    ].filter((key) => Object.prototype.hasOwnProperty.call(raw as object, key)));
    const action = c3rPRequiredText(envelope.action, 40);
    const service = createC3RPService(access.userId);

    if (action === "start") {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "recordId", "attemptId", "attemptBody",
        "prediction", "confidence", "evidenceStep",
      ]);
      if (!["likely_success", "likely_partial", "likely_blocked"].includes(String(row.prediction)) ||
          !["low", "medium", "high"].includes(String(row.confidence))) {
        throw new C3RPError("invalid_input");
      }
      const view = await service.start({
        commandId: c3rPRequiredUuid(row.commandId),
        recordId: c3rPRequiredUuid(row.recordId),
        attemptId: c3rPRequiredUuid(row.attemptId),
        attemptBody: c3rPRequiredText(row.attemptBody),
        prediction: row.prediction as "likely_success" | "likely_partial" | "likely_blocked",
        confidence: row.confidence as "low" | "medium" | "high",
        evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }

    if (action === "commit_feedback") {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "gapId",
        "failureNoteId", "assistanceEventId", "failureNote", "evidenceStep",
      ]);
      const result = await service.commitFeedback({
        ...common(row),
        gapId: c3rPRequiredUuid(row.gapId),
        failureNoteId: c3rPRequiredUuid(row.failureNoteId),
        assistanceEventId: c3rPRequiredUuid(row.assistanceEventId),
        failureNote: c3rPRequiredText(row.failureNote, 4_000),
      });
      return response({ ok: true, ...result });
    }

    if (action === "submit_repair") {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "attemptId",
        "claim", "evidenceStep",
      ]);
      const result = await service.submitRepair({
        ...common(row),
        attemptId: c3rPRequiredUuid(row.attemptId),
        claim: parsePracticeCalculationClaimV2Input(row.claim),
      });
      return response({ ok: true, ...result });
    }

    if ([
      "record_assisted_review",
      "complete_d1",
      "complete_d7_transfer",
      "complete_recurrence",
      "record_later_failure",
    ].includes(action)) {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "attemptId",
        "claim", "evidenceStep",
      ]);
      const view = await service.applyReview({
        ...common(row),
        action: action as Parameters<typeof service.applyReview>[0]["action"],
        attemptId: c3rPRequiredUuid(row.attemptId),
        claim: parsePracticeCalculationClaimV2Input(row.claim),
      });
      return response({ ok: true, view });
    }

    if (action === "create_plan") {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "planId", "kind", "availableMinutes", "evidenceStep",
      ]);
      if (!["TODAY", "FULL_DAY"].includes(String(row.kind))) {
        throw new C3RPError("invalid_input");
      }
      const view = await service.createPlan({
        commandId: c3rPRequiredUuid(row.commandId),
        planId: c3rPRequiredUuid(row.planId),
        kind: row.kind as "TODAY" | "FULL_DAY",
        availableMinutes: requiredInteger(row.availableMinutes, 30, 720),
        evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }

    if (action === "decide_plan") {
      const row = c3rPExactObject(raw, [
        "action", "commandId", "planId", "expectedVersion", "decision",
        "blocks", "evidenceStep",
      ]);
      if (!["ACCEPT", "EDIT", "REJECT"].includes(String(row.decision))) {
        throw new C3RPError("invalid_input");
      }
      const view = await service.decidePlan({
        commandId: c3rPRequiredUuid(row.commandId),
        planId: c3rPRequiredUuid(row.planId),
        expectedVersion: requiredInteger(row.expectedVersion, 1),
        decision: row.decision as "ACCEPT" | "EDIT" | "REJECT",
        blocks: planBlocks(row.blocks),
        evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }

    if (action === "export") {
      c3rPExactObject(raw, ["action"]);
      return response({ ok: true, export: await service.exportData() });
    }
    if (action === "delete") {
      c3rPExactObject(raw, ["action"]);
      return response({ ok: true, result: await service.deleteData() });
    }
    throw new C3RPError("invalid_input");
  } catch (error) {
    return errorResponse(error);
  }
}
