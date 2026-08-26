import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import {
  FIRST_STAGE_FEATURE_FLAG,
  FIRST_STAGE_OWNER_ALLOWLIST,
  FirstStageKernelError,
  exactObject,
  parseJsonRejectingDuplicateKeys,
} from "@/lib/review-os/first-stage/kernel";
import {
  FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG,
  FirstStageCapacityBridgeError,
  buildFirstStageCapacityPreview,
  firstStageCapacityBridgeAvailability,
} from "@/lib/review-os/first-stage/study-capacity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 16_384;
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

class AccessError extends Error {}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function emails(value: string | undefined) {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function productionDenied() {
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
}

async function requireOwnerAccess() {
  if (
    process.env[FIRST_STAGE_FEATURE_FLAG] !== "true" ||
    process.env[FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG] !== "true" ||
    productionDenied()
  ) throw new AccessError("not_found");
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId || !session.email) {
    throw new AccessError("not_found");
  }
  const email = session.email.trim().toLowerCase();
  if (
    !emails(process.env.ALPHA_ADMIN_EMAILS).includes(email) ||
    !emails(process.env[FIRST_STAGE_OWNER_ALLOWLIST]).includes(email)
  ) throw new AccessError("not_found");
}

function publicPreview(
  preview: ReturnType<typeof buildFirstStageCapacityPreview>,
) {
  return Object.freeze({
    schemaVersion: preview.schemaVersion,
    sourcePolicyVersion: preview.sourcePolicyVersion,
    planKind: preview.planKind,
    queueAvailability: preview.queueAvailability,
    capacity: preview.plan.capacity,
    planning: Object.freeze({
      date: preview.plan.date,
      coreOutcomeCount: preview.plan.coreOutcomes.length,
      executionBlockCount: preview.plan.executionBlocks.length,
      deferredTaskCount: preview.plan.deferredTasks.length,
      plannedActiveMinutes: preview.plan.plannedActiveMinutes,
      completionMeaning: preview.plan.completionMeaning,
      masteryMutationAllowed: preview.plan.masteryMutationAllowed,
      deterministicPlanDigest: preview.plan.deterministicPlanDigest,
      deterministicPlanDigestAuthority: preview.deterministicPlanDigestAuthority,
    }),
    ownerOnly: preview.ownerOnly,
    defaultOff: preview.defaultOff,
    productionAllowed: preview.productionAllowed,
    persistenceMutation: preview.persistenceMutation,
    aiGenerationEntitlementChanged: preview.aiGenerationEntitlementChanged,
    capacityHistoryEvidenceUsed: preview.capacityHistoryEvidenceUsed,
  });
}

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return response({ ok: false, error: "not_found" }, 404);
  if (error instanceof FirstStageCapacityBridgeError && error.code === "invalid_input") {
    return response({ ok: false, error: "invalid_input" }, 400);
  }
  if (error instanceof FirstStageKernelError && error.code === "invalid_input") {
    return response({ ok: false, error: "invalid_input" }, 400);
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}

export async function GET() {
  try {
    await requireOwnerAccess();
    return response({ ok: true, view: firstStageCapacityBridgeAvailability() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireOwnerAccess();
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
    if (
      mediaType !== "application/json" ||
      (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES)
    ) throw new FirstStageCapacityBridgeError("invalid_input");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      throw new FirstStageCapacityBridgeError("invalid_input");
    }
    const body = exactObject(parseJsonRejectingDuplicateKeys(rawBody), [
      "action",
      "planKind",
      "lifeMode",
      "phase",
      "scheduleVolatility",
      "dayKind",
      "declaredActiveMinutes",
      "windows",
      "externalCommitmentMinutes",
    ]);
    if (body.action !== "capacity_preview") {
      throw new FirstStageCapacityBridgeError("invalid_input");
    }
    const preview = buildFirstStageCapacityPreview({
      planKind: body.planKind,
      lifeMode: body.lifeMode,
      phase: body.phase,
      scheduleVolatility: body.scheduleVolatility,
      dayKind: body.dayKind,
      declaredActiveMinutes: body.declaredActiveMinutes,
      windows: body.windows,
      externalCommitmentMinutes: body.externalCommitmentMinutes,
    }, new Date().toISOString());
    return response({ ok: true, view: publicPreview(preview) });
  } catch (error) {
    return errorResponse(error);
  }
}
