import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { assertCanRunAnswerReview, EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import { loadS233aTrustedReviewMaterials, S233aTrustedMaterialUnavailableError } from "@/lib/review-os/s233a-answer-pack-loader";
import { createS233aGeminiConditionalCritic, createS233aGeminiPrimaryGrader } from "@/lib/review-os/s233a-gemini-adapter";
import { S233aRuntimeContractError, S233aRuntimeRetryableError, runS233aAnswerReview } from "@/lib/review-os/s233a-review-runtime";
import { S233aPersistenceError } from "@/lib/review-os/s233a-supabase-repository";
import type { S233aReviewRequest } from "@/lib/review-os/s233a-types";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { reviewOsService } from "@/lib/review-os/service";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 200_000;
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new S233aRuntimeContractError("invalid_json_body");
  return value as Record<string, unknown>;
}

function token(value: unknown, field: string): string {
  if (typeof value !== "string" || !TOKEN.test(value)) throw new S233aRuntimeContractError(`invalid_${field}`);
  return value;
}

function nullableToken(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : token(value, field);
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new S233aRuntimeContractError(`invalid_${field}`);
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new S233aRuntimeContractError(`invalid_${field}`);
  return value as T;
}

function parseRequest(authenticatedUserId: string, bodyValue: unknown): S233aReviewRequest {
  const body = record(bodyValue);
  const learnerText = text(body.answerText, "answer_text", 100_000).normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  const segments = learnerText
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((segment, index) => ({ segmentId: `segment-${index + 1}`, text: segment }));
  const revealHistory = Array.isArray(body.revealHistory) ? body.revealHistory : [];
  const sourceUncertaintyCodes = Array.isArray(body.sourceUncertaintyCodes)
    ? body.sourceUncertaintyCodes.map((value) => token(value, "source_uncertainty_code"))
    : [];
  const attemptVersion = body.attemptVersion;
  const elapsedTimeMs = body.elapsedTimeMs;
  const sessionPosition = body.sessionPosition;
  if (!Number.isInteger(attemptVersion) || (attemptVersion as number) < 1) throw new S233aRuntimeContractError("invalid_attempt_version");
  if (typeof elapsedTimeMs !== "number" || !Number.isFinite(elapsedTimeMs) || elapsedTimeMs < 0) throw new S233aRuntimeContractError("invalid_elapsed_time");
  if (!Number.isInteger(sessionPosition) || (sessionPosition as number) < 0) throw new S233aRuntimeContractError("invalid_session_position");
  return {
    authenticatedUserId,
    clientRequestId: token(body.clientRequestId, "client_request_id"),
    subject: oneOf(body.subject, ["practice", "theory", "law"] as const, "subject"),
    questionText: text(body.questionText ?? "", "question_text", 50_000),
    learnerInput: { normalizedText: learnerText, segments },
    answerSubmissionId: token(body.answerSubmissionId, "answer_submission_id"),
    inputVersionId: token(body.inputVersionId, "input_version_id"),
    historyId: token(body.historyId, "history_id"),
    attemptId: token(body.attemptId, "attempt_id"),
    attemptVersion: attemptVersion as number,
    rootAttemptId: token(body.rootAttemptId, "root_attempt_id"),
    parentAttemptId: nullableToken(body.parentAttemptId, "parent_attempt_id"),
    predecessorReviewId: nullableToken(body.predecessorReviewId, "predecessor_review_id"),
    answerPackId: token(body.answerPackId, "answer_pack_id"),
    answerPackVersion: token(body.answerPackVersion, "answer_pack_version"),
    revealHistory: revealHistory as S233aReviewRequest["revealHistory"],
    elapsedTimeMs,
    confidence: oneOf(body.confidence ?? "unknown", ["low", "medium", "high", "unknown"] as const, "confidence"),
    assistanceLevel: oneOf(body.assistanceLevel ?? "none", ["none", "navigation_only", "hint", "worked_step", "full_answer"] as const, "assistance_level"),
    answerExposure: oneOf(body.answerExposure ?? "none", ["none", "outline", "partial", "full"] as const, "answer_exposure"),
    inputModality: oneOf(body.inputModality ?? "typed", ["typed", "handwritten_ocr", "file_upload", "calculator", "manual_metadata"] as const, "input_modality"),
    variantFamilyId: nullableToken(body.variantFamilyId, "variant_family_id"),
    variantDistance: body.variantDistance === null || body.variantDistance === undefined
      ? null
      : oneOf(body.variantDistance, ["same", "near", "far"] as const, "variant_distance"),
    sessionPosition: sessionPosition as number,
    sourceUncertaintyCodes,
    predecessorControllerEventId: nullableToken(body.predecessorControllerEventId, "predecessor_controller_event_id"),
  };
}

function safeResponse(result: Awaited<ReturnType<typeof runS233aAnswerReview>>) {
  return {
    ok: true,
    replayed: result.replayed,
    review: {
      reviewId: result.review.reviewId,
      recordVersion: result.review.reviewRecordVersion,
      status: result.review.stageStatus.overall,
      attemptId: result.review.attemptId,
      attemptVersion: result.review.attemptVersion,
      versions: result.review.versions,
      queueTodayLinkage: result.review.queueTodayLinkage,
    },
    findings: result.findingBundles.map(({ finding, skill }) => ({
      findingId: finding.findingId,
      skillId: skill.skillId,
      status: finding.status,
      confidence: finding.confidence,
      abstentionReason: finding.abstentionReason,
    })),
    evidenceStates: result.evidenceBundles.map(({ record: evidence }) => ({
      evidenceStateId: evidence.evidenceStateId,
      conceptNodeId: evidence.conceptNodeId,
      state: evidence.state,
      outcome: evidence.outcome,
    })),
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) return NextResponse.json({ ok: false, errorCode: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    return NextResponse.json({ ok: false, errorCode: "AUTH_REQUIRED" }, { status: 401 });
  }
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ ok: false, errorCode: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      throw new S233aRuntimeContractError("invalid_json_body");
    }
    const input = parseRequest(session.userId, body);
    await assertCanRunAnswerReview(session.userId);
    const primary = createS233aGeminiPrimaryGrader();
    const result = await runS233aAnswerReview(input, {
      repository: {
        claim: reviewOsRepository.claimS233aReview,
        transition: reviewOsRepository.transitionS233aReview,
        loadReview: reviewOsRepository.loadS233aReview,
      },
      loadTrustedMaterials: loadS233aTrustedReviewMaterials,
      primaryGraders: { practice: primary, theory: primary, law: primary },
      critic: createS233aGeminiConditionalCritic(),
      prepareQueueTodayLinkage: reviewOsService.prepareS233aQueueTodayLinkage,
      now: () => new Date().toISOString(),
      randomId: (prefix) => `${prefix}-${crypto.randomUUID()}`,
    });
    if (
      !result.replayed &&
      result.cascadeBundle?.trace.primarySubjectGrader.status !== "not_run"
    ) {
      await reviewOsRepository.logUsageEvent(
        session.userId,
        "answer_review_structure_success",
        "answer_review",
        null,
        { runtimeVersion: "s233a", subject: input.subject },
      );
    }
    return NextResponse.json(safeResponse(result));
  } catch (error) {
    if (error instanceof EntitlementBlockedError) {
      return NextResponse.json(
        { ok: false, errorCode: error.code, blockedFeature: error.feature },
        { status: 402 },
      );
    }
    if (error instanceof S233aRuntimeContractError) {
      return NextResponse.json({ ok: false, errorCode: error.code, reason: error.reason }, { status: 400 });
    }
    if (error instanceof S233aTrustedMaterialUnavailableError) {
      return NextResponse.json({ ok: false, errorCode: error.code }, { status: 409 });
    }
    if (error instanceof S233aPersistenceError && error.reason === "auth") {
      return NextResponse.json({ ok: false, errorCode: "AUTH_REQUIRED" }, { status: 401 });
    }
    if (error instanceof S233aRuntimeRetryableError || error instanceof S233aPersistenceError) {
      return NextResponse.json({ ok: false, errorCode: "RETRYABLE_REVIEW_FAILURE" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, errorCode: "ANSWER_REVIEW_FAILED" }, { status: 500 });
  }
}
