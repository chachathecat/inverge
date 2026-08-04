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
import {
  OWNER_ALPHA_METHOD_FAMILIES,
  type OwnerAlphaMethodFamily,
} from "@/lib/review-os/owner-alpha-practice-contract";
import type { OwnerAlphaPracticalRecalculationSubmission } from "@/lib/review-os/owner-alpha-practical-decision-path";
import type {
  OwnerAlphaTheoryConceptSelection,
  OwnerAlphaTheoryOutlineItem,
  OwnerAlphaTheoryRepairSubmission,
} from "@/lib/review-os/owner-alpha-theory-reasoning-path";
import type {
  OwnerAlphaLawAuthorityBinding,
  OwnerAlphaLawRepairSubmission,
  OwnerAlphaLawRequirement,
  OwnerAlphaLawRequirementFactMapping,
} from "@/lib/review-os/owner-alpha-law-reasoning-path";
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

function boundedString(value: unknown, maximum: number, minimum = 1) {
  const text = requiredString(value).trim();
  if (text.length < minimum || text.length > maximum) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return text;
}

function boundedElapsedTime(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 8 * 60 * 60 * 1_000
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return Math.round(value);
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return value;
}

function commandKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
) {
  const allowedSet = new Set(allowed);
  if (
    Object.keys(value).some((key) => !allowedSet.has(key)) ||
    required.some((key) => !(key in value))
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
}

function optionalExactRecord(
  value: unknown,
  allowed: readonly string[],
) {
  if (value === undefined || value === null) return null;
  return exactKeys(record(value), allowed);
}

function uniqueIds(values: readonly string[]) {
  if (new Set(values).size !== values.length) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
}

function optionalBoundedText(value: unknown, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  return boundedString(value, maximum, 3);
}

function theoryOutlineItems(
  value: unknown,
  allowEmpty = false,
): OwnerAlphaTheoryOutlineItem[] {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.length > 24
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const items = value.map((item) => {
    const candidate = exactKeys(record(item), ["outlineItemId", "label"]);
    return {
      outlineItemId: boundedString(candidate.outlineItemId, 120),
      label: boundedString(candidate.label, 600, 2),
    };
  });
  uniqueIds(items.map((item) => item.outlineItemId));
  return items;
}

function theoryConcepts(
  value: unknown,
  allowEmpty = false,
): OwnerAlphaTheoryConceptSelection[] {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.length > 24
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const items = value.map((item) => {
    const candidate = exactKeys(record(item), ["conceptId", "label"]);
    return {
      conceptId: boundedString(candidate.conceptId, 120),
      label: boundedString(candidate.label, 600, 2),
    };
  });
  uniqueIds(items.map((item) => item.conceptId));
  return items;
}

function theoryCommitment(value: unknown) {
  const candidate = optionalExactRecord(value, [
    "demandVerb",
    "thesis",
    "orderedOutlineItems",
    "selectedConcepts",
  ]);
  if (!candidate) return null;
  return {
    demandVerb: boundedString(candidate.demandVerb, 240),
    thesis: boundedString(candidate.thesis, 2_000, 3),
    orderedOutlineItems: theoryOutlineItems(candidate.orderedOutlineItems),
    selectedConcepts: theoryConcepts(candidate.selectedConcepts),
  };
}

function lawCommitment(value: unknown) {
  const candidate = optionalExactRecord(value, [
    "issueFraming",
    "legalBasisPlan",
    "requirementEffectPlan",
    "factApplicationDirection",
    "tentativeConclusion",
  ]);
  if (!candidate) return null;
  return {
    issueFraming: boundedString(candidate.issueFraming, 2_000, 3),
    legalBasisPlan: boundedString(candidate.legalBasisPlan, 2_000, 3),
    requirementEffectPlan: boundedString(
      candidate.requirementEffectPlan,
      2_000,
      3,
    ),
    factApplicationDirection: boundedString(
      candidate.factApplicationDirection,
      2_000,
      3,
    ),
    tentativeConclusion: boundedString(candidate.tentativeConclusion, 2_000, 3),
  };
}

function theoryRepair(value: unknown): OwnerAlphaTheoryRepairSubmission | null {
  const candidate = optionalExactRecord(value, [
    "demandVerb",
    "thesis",
    "orderedOutlineItems",
    "selectedConcepts",
    "conceptArgumentLinks",
    "comparisonOrEvaluation",
    "counterPosition",
    "conclusion",
    "compression",
  ]);
  if (!candidate) return null;
  if (
    !Array.isArray(candidate.conceptArgumentLinks) ||
    candidate.conceptArgumentLinks.length > 64
  ) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const conceptArgumentLinks = candidate.conceptArgumentLinks.map((item) => {
    const link = exactKeys(record(item), [
      "conceptId",
      "outlineItemId",
      "argument",
    ]);
    return {
      conceptId: boundedString(link.conceptId, 120),
      outlineItemId: boundedString(link.outlineItemId, 120),
      argument: boundedString(link.argument, 2_000, 3),
    };
  });
  uniqueIds(
    conceptArgumentLinks.map(
      (link) => `${link.conceptId}\u0000${link.outlineItemId}`,
    ),
  );
  return {
    demandVerb: boundedString(candidate.demandVerb, 240),
    thesis: boundedString(candidate.thesis, 2_000, 3),
    orderedOutlineItems: theoryOutlineItems(candidate.orderedOutlineItems, true),
    selectedConcepts: theoryConcepts(candidate.selectedConcepts, true),
    conceptArgumentLinks,
    comparisonOrEvaluation: optionalBoundedText(
      candidate.comparisonOrEvaluation,
      4_000,
    ),
    counterPosition: optionalBoundedText(candidate.counterPosition, 4_000),
    conclusion: boundedString(candidate.conclusion, 4_000, 3),
    compression: boundedString(candidate.compression, 1_000, 3),
  };
}

function lawAuthorities(value: unknown): OwnerAlphaLawAuthorityBinding[] {
  if (!Array.isArray(value) || value.length > 32) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const items = value.map((item) => {
    const candidate = exactKeys(record(item), [
      "authorityKind",
      "label",
      "officialSourceRefId",
    ]);
    if (
      !["law", "article", "precedent_or_adjudication"].includes(
        String(candidate.authorityKind),
      )
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    return {
      authorityKind: candidate.authorityKind as OwnerAlphaLawAuthorityBinding["authorityKind"],
      label: boundedString(candidate.label, 1_000),
      officialSourceRefId: boundedString(candidate.officialSourceRefId, 240),
    };
  });
  uniqueIds(items.map((item) => item.officialSourceRefId));
  return items;
}

function lawRequirements(value: unknown): OwnerAlphaLawRequirement[] {
  if (!Array.isArray(value) || value.length > 32) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const items = value.map((item) => {
    const candidate = exactKeys(record(item), [
      "requirementId",
      "requirement",
      "legalEffect",
    ]);
    return {
      requirementId: boundedString(candidate.requirementId, 120),
      requirement: boundedString(candidate.requirement, 2_000, 3),
      legalEffect: boundedString(candidate.legalEffect, 2_000, 3),
    };
  });
  uniqueIds(items.map((item) => item.requirementId));
  return items;
}

function lawMappings(value: unknown): OwnerAlphaLawRequirementFactMapping[] {
  if (!Array.isArray(value) || value.length > 64) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  const items = value.map((item) => {
    const candidate = exactKeys(record(item), [
      "requirementId",
      "factApplication",
    ]);
    return {
      requirementId: boundedString(candidate.requirementId, 120),
      factApplication: boundedString(candidate.factApplication, 3_000, 3),
    };
  });
  uniqueIds(items.map((item) => item.requirementId));
  return items;
}

function lawRepair(value: unknown): OwnerAlphaLawRepairSubmission | null {
  const candidate = optionalExactRecord(value, [
    "issue",
    "authorityBindings",
    "effectiveDate",
    "requirements",
    "requirementFactMappings",
    "application",
    "conclusion",
    "procedure",
    "precedentOrAdjudication",
    "opposingInterpretation",
  ]);
  if (!candidate) return null;
  return {
    issue: boundedString(candidate.issue, 3_000, 3),
    authorityBindings: lawAuthorities(candidate.authorityBindings),
    effectiveDate: boundedString(candidate.effectiveDate, 80),
    requirements: lawRequirements(candidate.requirements),
    requirementFactMappings: lawMappings(candidate.requirementFactMappings),
    application: boundedString(candidate.application, 6_000, 3),
    conclusion: boundedString(candidate.conclusion, 3_000, 3),
    procedure: optionalBoundedText(candidate.procedure, 3_000),
    precedentOrAdjudication: optionalBoundedText(
      candidate.precedentOrAdjudication,
      3_000,
    ),
    opposingInterpretation: optionalBoundedText(
      candidate.opposingInterpretation,
      3_000,
    ),
  };
}

function recordVersion(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return Number(value);
}

function optionalMethodFamily(value: unknown): OwnerAlphaMethodFamily | null {
  return OWNER_ALPHA_METHOD_FAMILIES.includes(value as OwnerAlphaMethodFamily)
    ? (value as OwnerAlphaMethodFamily)
    : null;
}

function recalculationSubmissions(
  value: unknown,
): OwnerAlphaPracticalRecalculationSubmission[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 64) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return value.map((item) => {
    const candidate = record(item);
    const nodeId = requiredString(candidate.nodeId);
    if (nodeId.length > 240) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    if (
      (typeof candidate.value !== "number" &&
        typeof candidate.value !== "string") ||
      (typeof candidate.value === "string" && !candidate.value.trim())
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    const numericValue = Number(candidate.value);
    if (!Number.isFinite(numericValue)) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    if (
      candidate.unit !== null &&
      candidate.unit !== undefined &&
      typeof candidate.unit !== "string"
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    return {
      nodeId,
      value: numericValue,
      unit:
        typeof candidate.unit === "string" && candidate.unit.trim()
          ? candidate.unit.trim()
          : null,
    };
  });
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
    commandKeys(
      body,
      ["action", "sessionId", "recordVersion", "confirmedProblemText"],
      ["action", "sessionId", "recordVersion", "confirmedProblemText"],
    );
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
    commandKeys(
      body,
      [
        "action",
        "sessionId",
        "recordVersion",
        "attemptText",
        "elapsedTimeMs",
        "confidence",
        "methodFamily",
        "methodReason",
        "firstCalculationDirection",
        "theoryCommitment",
        "lawCommitment",
      ],
      [
        "action",
        "sessionId",
        "recordVersion",
        "attemptText",
        "elapsedTimeMs",
        "confidence",
      ],
    );
    if (!["low", "medium", "high"].includes(String(body.confidence))) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    const confidence = String(body.confidence) as "low" | "medium" | "high";
    return NextResponse.json({
      ok: true,
      session: await runtime.saveIndependentAttempt({
        sessionId,
        recordVersion: version,
        attemptText: requiredString(body.attemptText),
        elapsedTimeMs: boundedElapsedTime(body.elapsedTimeMs),
        confidence,
        methodFamily: optionalMethodFamily(body.methodFamily),
        methodReason:
          typeof body.methodReason === "string" ? body.methodReason : null,
        firstCalculationDirection:
          typeof body.firstCalculationDirection === "string"
            ? body.firstCalculationDirection
            : null,
        theoryCommitment: theoryCommitment(body.theoryCommitment),
        lawCommitment: lawCommitment(body.lawCommitment),
      }),
    });
  }
  if (action === "request_assistance" || action === "reveal_reference") {
    commandKeys(
      body,
      ["action", "sessionId", "recordVersion", "questionText"],
      ["action", "sessionId", "recordVersion"],
    );
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
    commandKeys(
      body,
      [
        "action",
        "sessionId",
        "recordVersion",
        "mode",
        "subjectMode",
        "rewriteText",
        "inferredMisunderstanding",
        "successCriteria",
        "revisedMethodFamily",
        "revisedMethodReason",
        "revisedFirstCalculationDirection",
        "recalculationSubmissions",
        "theoryRepairSubmission",
        "lawRepairSubmission",
      ],
      [
        "action",
        "sessionId",
        "recordVersion",
        "rewriteText",
        "inferredMisunderstanding",
        "successCriteria",
      ],
    );
    if (
      body.mode !== undefined &&
      body.mode !== "rewrite" &&
      body.mode !== "recalculate"
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
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
        revisedMethodFamily: optionalMethodFamily(body.revisedMethodFamily),
        revisedMethodReason:
          typeof body.revisedMethodReason === "string"
            ? body.revisedMethodReason
            : null,
        revisedFirstCalculationDirection:
          typeof body.revisedFirstCalculationDirection === "string"
            ? body.revisedFirstCalculationDirection
            : null,
        recalculationSubmissions: recalculationSubmissions(
          body.recalculationSubmissions,
        ),
        theoryRepairSubmission: theoryRepair(body.theoryRepairSubmission),
        lawRepairSubmission: lawRepair(body.lawRepairSubmission),
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
