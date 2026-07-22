import { NextResponse } from "next/server";

import {
  isOwnerAlphaPracticeAccessError,
  requireOwnerAlphaPracticeAccess,
} from "@/lib/review-os/owner-alpha-practice-access";
import {
  OwnerAlphaPracticeRuntimeError,
} from "@/lib/review-os/owner-alpha-practice-runtime";
import { createOwnerAlphaPracticeRuntime } from "@/lib/review-os/owner-alpha-practice-server";
import {
  OwnerAlphaPracticeCasError,
  OwnerAlphaPracticePersistenceError,
} from "@/lib/review-os/owner-alpha-practice-repository";
import type { OwnerAlphaProviderFile } from "@/lib/review-os/owner-alpha-practice-provider-contract";
import { EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import {
  parseOwnerAlphaPracticeSubject,
} from "@/lib/review-os/owner-alpha-subject-adapter-contract";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 18 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return value;
}

function recordVersion(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return Number(value);
}

function safeErrorResponse(error: unknown) {
  if (isOwnerAlphaPracticeAccessError(error)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (error instanceof EntitlementBlockedError) {
    return NextResponse.json(
      { ok: false, error: error.code, message: error.messageKo },
      { status: 429 },
    );
  }
  if (error instanceof OwnerAlphaPracticeRuntimeError) {
    if (error.code === "session_not_found") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    if (error.code === "stale_record" || error.code === "invalid_transition") {
      return NextResponse.json(
        { ok: false, error: error.code, refreshRequired: true },
        { status: 409 },
      );
    }
    if (error.code === "provider_failed") {
      return NextResponse.json(
        {
          ok: false,
          error: "provider_retryable",
          providerCode: error.providerCode,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if (error instanceof OwnerAlphaPracticeCasError) {
    return NextResponse.json(
      { ok: false, error: "stale_record", refreshRequired: true },
      { status: 409 },
    );
  }
  if (error instanceof OwnerAlphaPracticePersistenceError) {
    return NextResponse.json(
      {
        ok: false,
        error: "persistence_unavailable",
        refreshRequired: true,
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { ok: false, error: "owner_alpha_practice_unavailable" },
    { status: 503 },
  );
}

async function ownerRuntime() {
  const session = await requireOwnerAlphaPracticeAccess();
  return createOwnerAlphaPracticeRuntime(session.userId);
}

export async function GET(request: Request) {
  try {
    const runtime = await ownerRuntime();
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, session: await runtime.get(sessionId) });
  } catch (error) {
    return safeErrorResponse(error);
  }
}

async function createFromFormData(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: "request_too_large" }, { status: 413 });
  }
  const runtime = await ownerRuntime();
  const formData = await request.formData();
  const problemText = formData.get("problemText")?.toString() ?? "";
  const rawSubject = formData.get("subject")?.toString() ?? "";
  const subject = rawSubject
    ? parseOwnerAlphaPracticeSubject(rawSubject)
    : "appraisal_practical";
  if (!subject) throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  const files = formData
    .getAll("problemFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (
    files.length > MAX_FILES ||
    files.reduce((total, file) => total + file.size, 0) > MAX_REQUEST_BYTES ||
    files.some(
      (file) => file.size > MAX_FILE_BYTES || !ALLOWED_FILE_TYPES.has(file.type),
    )
  ) {
    return NextResponse.json({ ok: false, error: "unsupported_file" }, { status: 400 });
  }
  const providerFiles: OwnerAlphaProviderFile[] = await Promise.all(
    files.map(async (file) => ({
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
  const inputModality =
    files.length === 0
      ? ("typed" as const)
      : files.some((file) => file.type.startsWith("image/"))
        ? ("handwritten_ocr" as const)
        : ("file_upload" as const);
  return NextResponse.json({
    ok: true,
    session: await runtime.create({
      problemText,
      files: providerFiles,
      inputModality,
      subject,
    }),
  });
}

async function runCommand(request: Request) {
  const runtime = await ownerRuntime();
  const body = record(await request.json());
  const action = requiredString(body.action);
  const sessionId = requiredString(body.sessionId);
  const version = recordVersion(body.recordVersion);

  if (action === "confirm_problem") {
    return NextResponse.json({
      ok: true,
      session: await runtime.confirmProblem({
        sessionId,
        recordVersion: version,
        confirmedProblemText: requiredString(body.confirmedProblemText),
      }),
    });
  }
  if (action === "save_attempt") {
    const confidence = ["low", "medium", "high"].includes(String(body.confidence))
      ? (String(body.confidence) as "low" | "medium" | "high")
      : "medium";
    return NextResponse.json({
      ok: true,
      session: await runtime.saveIndependentAttempt({
        sessionId,
        recordVersion: version,
        attemptText: requiredString(body.attemptText),
        elapsedTimeMs: Number(body.elapsedTimeMs ?? 0),
        confidence,
      }),
    });
  }
  if (action === "request_assistance" || action === "reveal_reference") {
    const result = await runtime.requestAssistance({
      sessionId,
      recordVersion: version,
      questionText:
        typeof body.questionText === "string" ? body.questionText : null,
      revealFull: action === "reveal_reference",
    });
    return NextResponse.json(
      {
        ok: !result.providerFailed,
        retryable: result.providerFailed,
        error: result.providerFailed ? "provider_retryable" : null,
        session: result.view,
      },
      { status: result.providerFailed ? 503 : 200 },
    );
  }
  if (action === "complete_rewrite") {
    const mode = body.mode === "recalculate" ? "recalculate" : "rewrite";
    return NextResponse.json({
      ok: true,
      session: await runtime.completeRewrite({
        sessionId,
        recordVersion: version,
        mode,
        subjectMode:
          typeof body.subjectMode === "string" ? body.subjectMode : null,
        rewriteText: requiredString(body.rewriteText),
        inferredMisunderstanding: requiredString(body.inferredMisunderstanding),
        successCriteria: requiredString(body.successCriteria),
      }),
    });
  }
  throw new OwnerAlphaPracticeRuntimeError("invalid_input");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return await createFromFormData(request);
    }
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "invalid_content_type" }, { status: 415 });
    }
    return await runCommand(request);
  } catch (error) {
    return safeErrorResponse(error);
  }
}
