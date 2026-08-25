import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import {
  FIRST_STAGE_FEATURE_FLAG,
  FIRST_STAGE_KERNEL_SCHEMA_VERSION,
  FIRST_STAGE_OWNER_ALLOWLIST,
  FirstStageKernelError,
  exactObject,
  parseJsonRejectingDuplicateKeys,
} from "@/lib/review-os/first-stage/kernel";
import {
  SUBJECT_ADAPTER_SCHEMA_VERSION,
  SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
  createSubjectAdapterRegistry,
} from "@/lib/review-os/first-stage/subject-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (process.env[FIRST_STAGE_FEATURE_FLAG] !== "true" || productionDenied()) {
    throw new AccessError("not_found");
  }
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId || !session.email) {
    throw new AccessError("not_found");
  }
  const email = session.email.trim().toLowerCase();
  if (
    !emails(process.env.ALPHA_ADMIN_EMAILS).includes(email) ||
    !emails(process.env[FIRST_STAGE_OWNER_ALLOWLIST]).includes(email)
  ) throw new AccessError("not_found");
  return session;
}

function availability() {
  const registry = createSubjectAdapterRegistry();
  return Object.freeze({
    schemaVersion: "first_stage.kernel_availability.v1" as const,
    kernelSchemaVersion: FIRST_STAGE_KERNEL_SCHEMA_VERSION,
    subjectAdapterSchemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
    registeredSubjects: registry.subjects(),
    adapterState: "frozen_no_subject_adapters_installed" as const,
    queueAvailability: Object.freeze({
      schemaVersion: "first_stage.today_queue_availability.v1" as const,
      state: "blocked" as const,
      itemCount: 0 as const,
      blocker: "subject_adapter_required" as const,
      oneScreenOnePrimaryTask: true as const,
    }),
    ownerOnly: true as const,
    defaultOff: true as const,
    productionAllowed: false as const,
    publicActivation: false as const,
    paymentActivation: false as const,
    externalLearnerActivation: false as const,
    persistenceMutation: false as const,
    learningEfficacyClaim: false as const,
  });
}

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return response({ ok: false, error: "not_found" }, 404);
  if (error instanceof FirstStageKernelError && error.code === "invalid_input") {
    return response({ ok: false, error: "invalid_input" }, 400);
  }
  return response({ ok: false, error: "temporarily_unavailable" }, 503);
}

export async function GET() {
  try {
    await requireOwnerAccess();
    return response({ ok: true, view: availability() });
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
      (Number.isFinite(contentLength) && contentLength > 2_048)
    ) throw new FirstStageKernelError("invalid_input");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2_048) {
      throw new FirstStageKernelError("invalid_input");
    }
    const row = exactObject(parseJsonRejectingDuplicateKeys(rawBody), ["action"]);
    if (row.action !== "today_queue") throw new FirstStageKernelError("invalid_input");
    return response({ ok: true, view: availability() });
  } catch (error) {
    return errorResponse(error);
  }
}
