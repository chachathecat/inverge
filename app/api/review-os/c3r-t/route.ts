import { NextResponse } from "next/server";

import {
  C3R_T_PLAN_COMPLETION_ACTIONS,
  C3RTError,
  c3rTExactObject,
  c3rTRequiredText,
  c3rTRequiredUuid,
  type C3RTPlanBlockInput,
} from "@/lib/review-os/c3r-t-contract";
import { createC3RTService, requireC3RTAccess } from "@/lib/review-os/c3r-t-service";
import {
  parseJsonRejectingDuplicateKeys,
  parseTheoryPredicateClaimV1Input,
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
  if (error instanceof C3RTError) {
    if (["feature_disabled", "production_denied", "auth_required", "owner_required", "not_found"].includes(error.code)) {
      return response({ ok: false, error: "not_found" }, 404);
    }
    if (error.code === "invalid_input") return response({ ok: false, error: error.code }, 400);
    if (["invalid_transition", "stale_record", "stale_plan"].includes(error.code)) {
      return response({ ok: false, error: error.code }, 409);
    }
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}
function requiredInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new C3RTError("invalid_input");
  }
  return Number(value);
}
function optionalEvidenceStep(value: unknown) {
  return value === undefined ? undefined : c3rTRequiredText(value, 20);
}
function common(record: Record<string, unknown>) {
  return {
    commandId: c3rTRequiredUuid(record.commandId),
    recordId: c3rTRequiredUuid(record.recordId),
    expectedVersion: requiredInteger(record.expectedVersion, 1),
    evidenceStep: optionalEvidenceStep(record.evidenceStep),
  };
}
function planBlocks(value: unknown) {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > 48) throw new C3RTError("invalid_input");
  return value.map((block) => {
    const row = c3rTExactObject(block, [
      "blockId", "blockKind", "recordId", "gapId", "reviewPhase", "ordinal", "minutes",
    ]);
    if (!["CORE_OUTCOME", "SUPPORT"].includes(String(row.blockKind)) ||
      !["D1", "D7_TRANSFER", "RECURRENCE", "REOPENED_REVIEW"].includes(String(row.reviewPhase))) {
      throw new C3RTError("invalid_input");
    }
    return {
      blockId: c3rTRequiredUuid(row.blockId),
      blockKind: row.blockKind as C3RTPlanBlockInput["blockKind"],
      recordId: c3rTRequiredUuid(row.recordId), gapId: c3rTRequiredUuid(row.gapId),
      reviewPhase: row.reviewPhase as C3RTPlanBlockInput["reviewPhase"],
      ordinal: requiredInteger(row.ordinal, 1), minutes: requiredInteger(row.minutes, 1),
    } satisfies C3RTPlanBlockInput;
  });
}
export async function GET(request: Request) {
  try {
    const access = await requireC3RTAccess();
    const searchParams = new URL(request.url).searchParams;
    const recordIdValue = searchParams.get("recordId");
    const recordId = recordIdValue ? c3rTRequiredUuid(recordIdValue) : null;
    const evidenceStepValue = searchParams.get("evidenceStep");
    const service = createC3RTService(access.userId);
    const view = evidenceStepValue
      ? await service.viewAtEvidenceStep(recordId, optionalEvidenceStep(evidenceStepValue) ?? "")
      : await service.view(recordId);
    return response({ ok: true, view });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireC3RTAccess();
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!contentType.toLowerCase().startsWith("application/json") ||
      (Number.isFinite(contentLength) && contentLength > 60_000)) {
      throw new C3RTError("invalid_input");
    }
    const raw = parseJsonRejectingDuplicateKeys(await request.text());
    const envelopeKeys = [
      "action", "commandId", "recordId", "expectedVersion", "attemptId", "attemptBody",
      "prediction", "confidence", "evidenceStep", "gapId", "transferTaskId",
      "failureNoteId", "assistanceEventId", "failureNote", "claim", "planBlockId",
      "planId", "planVersion", "kind", "availableMinutes", "decision", "blocks",
    ].filter((key) => Object.prototype.hasOwnProperty.call(raw as object, key));
    const envelope = c3rTExactObject(raw, envelopeKeys);
    const action = c3rTRequiredText(envelope.action, 40);
    const service = createC3RTService(access.userId);

    if (action === "start") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "attemptId", "attemptBody",
        "prediction", "confidence", "evidenceStep",
      ]);
      if (!["likely_success", "likely_partial", "likely_blocked"].includes(String(row.prediction)) ||
        !["low", "medium", "high"].includes(String(row.confidence))) {
        throw new C3RTError("invalid_input");
      }
      const view = await service.start({
        commandId: c3rTRequiredUuid(row.commandId), recordId: c3rTRequiredUuid(row.recordId),
        attemptId: c3rTRequiredUuid(row.attemptId), attemptBody: c3rTRequiredText(row.attemptBody),
        prediction: row.prediction as "likely_success" | "likely_partial" | "likely_blocked",
        confidence: row.confidence as "low" | "medium" | "high",
        evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }
    if (action === "commit_feedback") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "gapId",
        "failureNoteId", "assistanceEventId", "failureNote", "evidenceStep",
      ]);
      const result = await service.commitFeedback({
        ...common(row), gapId: c3rTRequiredUuid(row.gapId),
        failureNoteId: c3rTRequiredUuid(row.failureNoteId),
        assistanceEventId: c3rTRequiredUuid(row.assistanceEventId),
        failureNote: c3rTRequiredText(row.failureNote, 4_000),
      });
      return response({ ok: true, ...result });
    }
    if (action === "submit_repair") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "attemptId", "claim", "evidenceStep",
      ]);
      const result = await service.submitRepair({
        ...common(row), attemptId: c3rTRequiredUuid(row.attemptId),
        claim: parseTheoryPredicateClaimV1Input(row.claim),
      });
      return response({ ok: true, ...result });
    }
    if (["record_assisted_review", "record_later_failure"].includes(action)) {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "attemptId", "claim", "evidenceStep",
      ]);
      const view = await service.applyReview({
        ...common(row), action: action as Parameters<typeof service.applyReview>[0]["action"],
        attemptId: c3rTRequiredUuid(row.attemptId),
        claim: parseTheoryPredicateClaimV1Input(row.claim),
      });
      return response({ ok: true, view });
    }
    if (action === "present_d7_transfer_task") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "transferTaskId", "evidenceStep",
      ]);
      const view = await service.presentD7TransferTask({
        ...common(row), transferTaskId: c3rTRequiredUuid(row.transferTaskId),
      });
      return response({ ok: true, view });
    }
    if (C3R_T_PLAN_COMPLETION_ACTIONS.has(action)) {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "expectedVersion", "attemptId", "claim",
        "planBlockId", "planId", "planVersion", "transferTaskId", "evidenceStep",
      ].filter((key) => Object.prototype.hasOwnProperty.call(raw as object, key)));
      if ((action === "complete_d7_transfer") !==
        Object.prototype.hasOwnProperty.call(row, "transferTaskId")) {
        throw new C3RTError("invalid_input");
      }
      const view = await service.applyReview({
        ...common(row), action: action as Parameters<typeof service.applyReview>[0]["action"],
        attemptId: c3rTRequiredUuid(row.attemptId),
        claim: parseTheoryPredicateClaimV1Input(row.claim),
        planBlockId: row.planBlockId == null ? null : c3rTRequiredUuid(row.planBlockId),
        planId: row.planId == null ? null : c3rTRequiredUuid(row.planId),
        planVersion: row.planVersion == null ? null : requiredInteger(row.planVersion, 1),
        ...(action === "complete_d7_transfer"
          ? { transferTaskId: c3rTRequiredUuid(row.transferTaskId) } : {}),
      });
      return response({ ok: true, view });
    }
    if (action === "create_plan") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "planId", "kind", "availableMinutes", "evidenceStep",
      ]);
      if (!["TODAY", "FULL_DAY"].includes(String(row.kind))) throw new C3RTError("invalid_input");
      const view = await service.createPlan({
        commandId: c3rTRequiredUuid(row.commandId), recordId: c3rTRequiredUuid(row.recordId),
        planId: c3rTRequiredUuid(row.planId), kind: row.kind as "TODAY" | "FULL_DAY",
        availableMinutes: requiredInteger(row.availableMinutes, 30, 720),
        evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }
    if (action === "decide_plan") {
      const row = c3rTExactObject(raw, [
        "action", "commandId", "recordId", "planId", "expectedVersion",
        "decision", "blocks", "evidenceStep",
      ]);
      if (!["ACCEPT", "EDIT", "REJECT"].includes(String(row.decision))) {
        throw new C3RTError("invalid_input");
      }
      const view = await service.decidePlan({
        commandId: c3rTRequiredUuid(row.commandId), recordId: c3rTRequiredUuid(row.recordId),
        planId: c3rTRequiredUuid(row.planId),
        expectedVersion: requiredInteger(row.expectedVersion, 1),
        decision: row.decision as "ACCEPT" | "EDIT" | "REJECT",
        blocks: planBlocks(row.blocks), evidenceStep: optionalEvidenceStep(row.evidenceStep),
      });
      return response({ ok: true, view });
    }
    if (action === "export") {
      c3rTExactObject(raw, ["action"]);
      return response({ ok: true, export: await service.exportData() });
    }
    if (action === "delete") {
      c3rTExactObject(raw, ["action"]);
      return response({ ok: true, result: await service.deleteData() });
    }
    throw new C3RTError("invalid_input");
  } catch (error) {
    return errorResponse(error);
  }
}
