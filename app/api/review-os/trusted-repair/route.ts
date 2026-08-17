import { NextResponse } from "next/server";

import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";
import {
  TrustedRepairContractError,
  exactObject,
  isTrustedRepairContinuation,
  isTrustedRepairInputMode,
  isTrustedRepairSubject,
  parseJsonRejectingDuplicateKeys,
  parsePracticeCalculationClaimV2Input,
  parseLawApplicabilityClaimV1Input,
  parseTheoryPredicateClaimV1Input,
  requiredTrustedRepairText,
  requiredTrustedRepairUuid,
  requiredTrustedRepairVersion,
} from "@/lib/review-os/trusted-repair-contract";
import { TrustedRepairPersistenceError } from "@/lib/review-os/trusted-repair-repository";
import { createTrustedRepairService } from "@/lib/review-os/trusted-repair-server";

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
  if (isTrustedRepairAccessError(error)) {
    return response({ ok: false, error: "not_found" }, 404);
  }
  if (error instanceof TrustedRepairPersistenceError) {
    if (error.code === "not_found") {
      return response({ ok: false, error: "not_found" }, 404);
    }
    if (error.code === "stale_record") {
      return response({ ok: false, error: "stale_record" }, 409);
    }
    return response({ ok: false, error: "temporarily_unavailable" }, 503);
  }
  if (error instanceof TrustedRepairContractError) {
    if (error.code === "invalid_input") {
      return response({ ok: false, error: "invalid_input" }, 400);
    }
    if (error.code === "not_found") {
      return response({ ok: false, error: "not_found" }, 404);
    }
    return response({ ok: false, error: error.code }, 409);
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}

function commonTransition(record: Record<string, unknown>) {
  return {
    sessionId: requiredTrustedRepairUuid(record.sessionId),
    expectedVersion: requiredTrustedRepairVersion(record.expectedVersion),
    commandId: requiredTrustedRepairUuid(record.commandId),
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireTrustedRepairAccess();
    const url = new URL(request.url);
    const sessionId = requiredTrustedRepairUuid(url.searchParams.get("sessionId"));
    const view = await createTrustedRepairService(
      access.userId,
      access.trustedRepairSubjects,
    ).load(sessionId);
    return response({ ok: true, view });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Feature and identity checks deliberately precede content-type and body work.
    const access = await requireTrustedRepairAccess();
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (
      !contentType.toLowerCase().startsWith("application/json") ||
      (Number.isFinite(contentLength) && contentLength > 20_000)
    ) {
      throw new TrustedRepairContractError("invalid_input");
    }
    const raw = parseJsonRejectingDuplicateKeys(await request.text());
    const envelope = exactObject(raw, [
      "action",
      "sessionId",
      "expectedVersion",
      "commandId",
      "subject",
      "inputMode",
      "body",
      "prediction",
      "confidence",
      "selfDiagnosisCode",
      "continuation",
      "claim",
    ]);
    const action = envelope.action;
    if (typeof action !== "string") {
      throw new TrustedRepairContractError("invalid_input");
    }
    const service = createTrustedRepairService(
      access.userId,
      access.trustedRepairSubjects,
    );
    let view;

    if (action === "start") {
      const record = exactObject(raw, ["action", "subject", "inputMode", "commandId"]);
      if (!isTrustedRepairSubject(record.subject) || !isTrustedRepairInputMode(record.inputMode)) {
        throw new TrustedRepairContractError("invalid_input");
      }
      view = await service.start({
        subject: record.subject,
        inputMode: record.inputMode,
        commandId: requiredTrustedRepairUuid(record.commandId),
      });
    } else if (action === "confirm_revision") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId", "body"]);
      view = await service.confirmRevision({
        ...commonTransition(record),
        body: requiredTrustedRepairText(record.body),
      });
    } else if (action === "commit_prediction") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "prediction",
        "confidence",
      ]);
      if (
        !["likely_success", "likely_partial", "likely_blocked"].includes(String(record.prediction)) ||
        !["low", "medium", "high"].includes(String(record.confidence))
      ) {
        throw new TrustedRepairContractError("invalid_input");
      }
      view = await service.commitPrediction({
        ...commonTransition(record),
        prediction: record.prediction as "likely_success" | "likely_partial" | "likely_blocked",
        confidence: record.confidence as "low" | "medium" | "high",
      });
    } else if (action === "commit_attempt") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId", "body"]);
      view = await service.commitAttempt({
        ...commonTransition(record),
        body: requiredTrustedRepairText(record.body),
      });
    } else if (action === "commit_self_diagnosis") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "selfDiagnosisCode",
      ]);
      view = await service.commitSelfDiagnosis({
        ...commonTransition(record),
        selfDiagnosisCode: requiredTrustedRepairText(record.selfDiagnosisCode, 80),
      });
    } else if (action === "diagnose") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId"]);
      view = await service.diagnose(commonTransition(record));
    } else if (action === "request_scaffold") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId"]);
      view = await service.requestScaffold(commonTransition(record));
    } else if (action === "submit_repair") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId", "body"]);
      view = await service.submitRepair({
        ...commonTransition(record),
        body: requiredTrustedRepairText(record.body),
      });
    } else if (action === "confirm_claim") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "claim",
      ]);
      view = await service.confirmPracticeClaim({
        ...commonTransition(record),
        claim: parsePracticeCalculationClaimV2Input(record.claim),
      });
    } else if (action === "confirm_theory_claim") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "claim",
      ]);
      view = await service.confirmTheoryClaim({
        ...commonTransition(record),
        claim: parseTheoryPredicateClaimV1Input(record.claim),
      });
    } else if (action === "confirm_law_claim") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "claim",
      ]);
      view = await service.confirmLawClaim({
        ...commonTransition(record),
        claim: parseLawApplicabilityClaimV1Input(record.claim),
      });
    } else if (action === "continue") {
      const record = exactObject(raw, [
        "action",
        "sessionId",
        "expectedVersion",
        "commandId",
        "continuation",
      ]);
      if (!isTrustedRepairContinuation(record.continuation)) {
        throw new TrustedRepairContractError("invalid_input");
      }
      view = await service.continue({
        ...commonTransition(record),
        continuation: record.continuation,
      });
    } else if (action === "replace_revision") {
      const record = exactObject(raw, ["action", "sessionId", "expectedVersion", "commandId", "body"]);
      view = await service.replaceRevision({
        ...commonTransition(record),
        body: requiredTrustedRepairText(record.body),
      });
    } else {
      throw new TrustedRepairContractError("invalid_input");
    }

    return response({ ok: true, view });
  } catch (error) {
    return errorResponse(error);
  }
}
