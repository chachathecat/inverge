import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { normalizeAnswerReviewStructureDraft, type AnswerReviewExplanationLevel } from "@/lib/evaluate/answer-review-structure";
import { GeminiEnvError, GeminiStructureParseError, isGeminiQuotaExceededError, isGeminiConfigured, structureAnswerReviewWithGemini } from "@/lib/evaluate/gemini";
import {
  assertApp1RepairVerificationRequestAuthority,
  assertApp1SigningAuthorityReady,
  createApp1AnalysisAuthority,
  createApp1RepairVerificationAuthority,
  isApp1ServerAuthorityError,
  parseApp1PrimaryGap,
  requireApp1AuthorizedSourceDetail,
} from "@/lib/owner-study/app1-server-authority";
import { getApp1LearnerAnswer } from "@/lib/owner-study/app1-capture-repair-view-model";
import { buildAnswerReviewReferenceGrounding } from "@/lib/review-os/answer-review-reference-grounding";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { assertCanRunAnswerReview, EntitlementBlockedError } from "@/lib/review-os/entitlement-enforcement";
import { buildAnswerReviewLearningSignalInput, getAnswerReviewInputQualityIssue, shouldSkipLearningSignalSave } from "@/lib/review-os/learning-signal";
import { logServerEvent } from "@/lib/review-os/observability";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { reviewOsService } from "@/lib/review-os/service";
import type { WrongAnswerDetail } from "@/lib/review-os/types";
const GEMINI_MISSING_MESSAGE = "AI를 잠시 사용할 수 없습니다. 저장한 초안을 유지한 채 잠시 후 다시 시도해 주세요.";
const GEMINI_QUOTA_MESSAGE = "오늘 AI 사용 한도에 도달했습니다. 저장한 초안을 유지한 채 나중에 다시 시도해 주세요.";
const SAVE_FAILED_MESSAGE = "저장에 실패했습니다. 초안을 확인한 뒤 다시 시도해 주세요.";
const ENTITLEMENT_FAILED_MESSAGE = "이용 권한 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
const NETWORK_RETRY_MESSAGE = "네트워크 응답이 불안정합니다. 저장된 초안은 유지되며 다시 시도할 수 있습니다.";
const INPUT_QUALITY_MESSAGE = "검토에 필요한 정보가 부족합니다. 문제와 답안을 조금 더 입력해 주세요.";
const ANSWER_REVIEW_REQUEST_PURPOSES = [
  "learning_analysis",
  "app1_initial_analysis",
  "repair_verification",
] as const;
type AnswerReviewRequestPurpose = (typeof ANSWER_REVIEW_REQUEST_PURPOSES)[number];
const ITEM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function normalizeExplanationLevel(v: string | null | undefined): AnswerReviewExplanationLevel { return v === "easy" || v === "exam" ? v : "standard"; }
function getFiles(formData: FormData, fieldName: string) { return formData.getAll(fieldName).filter((item): item is File => item instanceof File && item.size > 0); }
function parseRequestPurpose(value: FormDataEntryValue | null): AnswerReviewRequestPurpose | null {
  if (value === null) return "learning_analysis";
  if (typeof value !== "string") return null;
  return ANSWER_REVIEW_REQUEST_PURPOSES.includes(value as AnswerReviewRequestPurpose)
    ? (value as AnswerReviewRequestPurpose)
    : null;
}
function repairVerificationError(status: 400 | 401 | 403, errorCode: string) {
  return NextResponse.json({ ok: false, errorCode, error: "복구 입력 검토 요청을 확인할 수 없습니다." }, { status });
}
function singleFormString(formData: FormData, fieldName: string) {
  const values = formData.getAll(fieldName);
  const value = values[0];
  return values.length === 1 && typeof value === "string" ? value : null;
}
function app1AuthorityError(error: unknown) {
  if (!isApp1ServerAuthorityError(error)) return null;
  const status =
    error.code === "APP1_AUTHORITY_REQUIRED"
      ? 403
      : error.code === "APP1_SIGNING_SECRET_UNAVAILABLE"
        ? 503
        : error.code === "APP1_VERIFICATION_EXPIRED"
          ? 410
          : 400;
  return NextResponse.json(
    {
      ok: false,
      errorCode: error.code,
      error: "복구 입력 검토 요청을 확인할 수 없습니다.",
    },
    { status },
  );
}
export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getServerSessionUser();
  let mode: "first" | "second" = "first";
  let subject = "";
  let requestPurpose: AnswerReviewRequestPurpose = "learning_analysis";
  let app1Detail: WrongAnswerDetail | null = null;
  let app1PrimaryGap: ReturnType<typeof parseApp1PrimaryGap> | null = null;
  let app1AnalysisBinding: string | null = null;
  let persistenceOperationId: string | null = null;
  let persistenceWorkRevisionId: string | null = null;
  try {
    const formData = await request.formData();
    let questionFiles = getFiles(formData, "questionFiles");
    let answerFiles = getFiles(formData, "answerFiles");
    let referenceFiles = getFiles(formData, "referenceFiles");
    let questionText = formData.get("questionText")?.toString() ?? "";
    let answerText = formData.get("answerText")?.toString() ?? "";
    let referenceText = formData.get("referenceText")?.toString() ?? "";
    mode = parseAppraisalMode(formData.get("examMode")?.toString() ?? null) ?? "first";
    subject = formData.get("subject")?.toString() ?? "";
    const requestPurposeValues = formData.getAll("requestPurpose");
    if (requestPurposeValues.length > 1) return repairVerificationError(400, "INVALID_REQUEST_PURPOSE");
    const parsedRequestPurpose = parseRequestPurpose(requestPurposeValues[0] ?? null);
    if (!parsedRequestPurpose) return repairVerificationError(400, "INVALID_REQUEST_PURPOSE");
    requestPurpose = parsedRequestPurpose;
    if (requestPurpose !== "learning_analysis") {
      if (!session.isAuthenticated || !session.userId || !session.email) {
        return repairVerificationError(401, "AUTH_REQUIRED");
      }
      const sourceItemId = singleFormString(formData, "sourceItemId");
      if (
        sourceItemId === null ||
        sourceItemId !== sourceItemId.trim() ||
        !ITEM_ID_PATTERN.test(sourceItemId)
      ) {
        return repairVerificationError(400, "INVALID_SOURCE_ITEM_ID");
      }
      if (mode !== "second") {
        return repairVerificationError(403, "REPAIR_VERIFICATION_FORBIDDEN");
      }
      app1Detail = await requireApp1AuthorizedSourceDetail({
        userId: session.userId,
        sourceItemId,
        expectedSubject: subject,
      });
      assertApp1SigningAuthorityReady();
      if (
        questionFiles.length !== 0 ||
        answerFiles.length !== 0 ||
        referenceFiles.length !== 0
      ) {
        return repairVerificationError(400, "APP1_FILE_INPUT_FORBIDDEN");
      }
      questionFiles = [];
      answerFiles = [];
      referenceFiles = [];
      questionText =
        app1Detail.item.rawQuestionText ?? app1Detail.item.problemTitle ?? "";
      referenceText =
        app1Detail.item.correctAnswer === "-"
          ? ""
          : app1Detail.item.correctAnswer;
      if (requestPurpose === "app1_initial_analysis") {
        answerText = getApp1LearnerAnswer(app1Detail);
      }
      if (requestPurpose === "repair_verification") {
        const exactRepairText = singleFormString(formData, "answerText");
        if (exactRepairText === null) {
          return repairVerificationError(400, "INVALID_REPAIR_BODY");
        }
        answerText = exactRepairText;
        app1AnalysisBinding = singleFormString(formData, "analysisBinding");
        persistenceOperationId = singleFormString(
          formData,
          "persistenceOperationId",
        );
        persistenceWorkRevisionId = singleFormString(
          formData,
          "persistenceWorkRevisionId",
        );
        const primaryGapJson = singleFormString(formData, "primaryGap");
        if (
          app1AnalysisBinding === null ||
          persistenceOperationId === null ||
          persistenceWorkRevisionId === null ||
          primaryGapJson === null ||
          primaryGapJson.length > 4_096
        ) {
          return repairVerificationError(400, "INVALID_REPAIR_AUTHORITY");
        }
        let parsedGap: unknown;
        try {
          parsedGap = JSON.parse(primaryGapJson);
        } catch {
          return repairVerificationError(400, "INVALID_REPAIR_AUTHORITY");
        }
        app1PrimaryGap = parseApp1PrimaryGap(parsedGap);
        assertApp1RepairVerificationRequestAuthority({
          userId: session.userId,
          detail: app1Detail,
          primaryGap: app1PrimaryGap,
          analysisBinding: app1AnalysisBinding,
          persistenceOperationId,
          persistenceWorkRevisionId,
        });
      }
    }
    const explanationLevel = normalizeExplanationLevel(formData.get("explanationLevel")?.toString());
    if (answerFiles.length === 0 && !answerText.trim()) return NextResponse.json({ ok: false, error: "내 답안 파일(answerFiles) 또는 내 답안 텍스트(answerText) 중 하나는 필수입니다." }, { status: 400 });
    const inputQualityIssue = getAnswerReviewInputQualityIssue({ questionText, answerText, referenceText, questionFileCount: questionFiles.length, answerFileCount: answerFiles.length, referenceFileCount: referenceFiles.length });
    if (inputQualityIssue) return NextResponse.json({ ok: false, errorCode: "INSUFFICIENT_INPUT", error: INPUT_QUALITY_MESSAGE }, { status: 400 });
    if (!isGeminiConfigured()) return NextResponse.json({ ok: false, errorCode: "AI_UNAVAILABLE", error: GEMINI_MISSING_MESSAGE, recovery: "retry" }, { status: 503 });
    if (session.userId) await assertCanRunAnswerReview(session.userId);
    const initialDraft = await structureAnswerReviewWithGemini({ questionFiles, answerFiles, referenceFiles, questionText, answerText, referenceText, explanationLevel });
    const referenceGrounding = buildAnswerReviewReferenceGrounding({ examMode: mode, subject, questionText, answerText, referenceText, normalizedDraft: normalizeAnswerReviewStructureDraft(initialDraft) });
    const draft = referenceGrounding.references.length > 0 ? await structureAnswerReviewWithGemini({ questionFiles, answerFiles, referenceFiles, questionText, answerText, referenceText, referenceGroundingContext: referenceGrounding.promptContext, explanationLevel }) : initialDraft;
    const normalized = normalizeAnswerReviewStructureDraft(draft);
    const analysisAuthority =
      requestPurpose === "app1_initial_analysis" &&
      session.userId &&
      app1Detail
        ? createApp1AnalysisAuthority({
            userId: session.userId,
            detail: app1Detail,
            draft: normalized,
          })
        : null;
    const repairAuthority =
      requestPurpose === "repair_verification" &&
      session.userId &&
      app1Detail &&
      app1PrimaryGap &&
      app1AnalysisBinding &&
      persistenceOperationId &&
      persistenceWorkRevisionId
        ? createApp1RepairVerificationAuthority({
            userId: session.userId,
            detail: app1Detail,
            primaryGap: app1PrimaryGap,
            analysisBinding: app1AnalysisBinding,
            repairText: answerText,
            repairDraft: normalized,
            persistenceOperationId,
            persistenceWorkRevisionId,
          })
        : null;
    let learningSignalStatus: "saved" | "skipped" | "failed" = "skipped";
    const learningSignalSkipReason = requestPurpose === "repair_verification" ? "repair_verification" : undefined;
    const skipReason = requestPurpose === "repair_verification" ? learningSignalSkipReason : shouldSkipLearningSignalSave(normalized);
    if (session.userId && session.email && requestPurpose !== "repair_verification" && !skipReason) {
      try { await reviewOsService.createLearningSignalEvent(session.userId, session.email, buildAnswerReviewLearningSignalInput({ examMode: mode, subjectInput: subject, answerSourceType: answerFiles.length > 0 ? "file" : "text", normalizedDraft: normalized })); learningSignalStatus = "saved"; }
      catch { learningSignalStatus = "failed"; }
    }
    if (session.userId) await reviewOsRepository.logUsageEvent(session.userId, "answer_review_structure_success", "answer_review", null, { examMode: mode, explanationLevel, requestPurpose });
    logServerEvent({ eventName: requestPurpose === "repair_verification" ? "answer_review_structure_repair_verification" : "answer_review_structure", userId: session.userId, route: "/api/answer-review/structure", mode, subject, costCategory: "answer_review", durationMs: Date.now()-startedAt, ok: true });
    return NextResponse.json({
      ok: true,
      draft,
      ...(analysisAuthority ?? {}),
      ...(repairAuthority ?? {}),
      learningSignalStatus,
      learningSignalSkipReason,
      explanationLevel,
      referenceGrounding: { used: referenceGrounding.references.length > 0, displayLabel: referenceGrounding.displayLabel, references: referenceGrounding.references.map((x) => ({ id: x.id, exam_year: x.exam_year, subject: x.subject, reason: x.reason })) },
    });
  } catch (error) {
    const authorityResponse = app1AuthorityError(error);
    if (authorityResponse) return authorityResponse;
    const errorCode = error instanceof EntitlementBlockedError ? error.code : error instanceof GeminiStructureParseError ? "AI_UNAVAILABLE" : error instanceof GeminiEnvError ? "AI_UNAVAILABLE" : isGeminiQuotaExceededError(error) ? "AI_COST_CAP_BLOCKED" : "NETWORK_RETRY";
    logServerEvent({ eventName: requestPurpose === "repair_verification" ? "answer_review_structure_repair_verification" : "answer_review_structure", userId: session.userId, route: "/api/answer-review/structure", mode, subject, costCategory: "answer_review", durationMs: Date.now()-startedAt, ok: false, errorCode });
    if (error instanceof EntitlementBlockedError) return NextResponse.json({ ok: false, errorCode: error.code, error: ENTITLEMENT_FAILED_MESSAGE, recovery: "retry", blockedFeature: error.feature }, { status: 402 });
    if (error instanceof GeminiEnvError) return NextResponse.json({ ok: false, errorCode: "AI_UNAVAILABLE", error: GEMINI_MISSING_MESSAGE, recovery: "retry" }, { status: 503 });
    if (isGeminiQuotaExceededError(error)) return NextResponse.json({ ok: false, errorCode: "AI_COST_CAP_BLOCKED", error: GEMINI_QUOTA_MESSAGE, recovery: "saved_draft_retry" }, { status: 429 });
    if (error instanceof GeminiStructureParseError) return NextResponse.json({ ok: false, errorCode: "AI_UNAVAILABLE", error: NETWORK_RETRY_MESSAGE, recovery: "retry" }, { status: 502 });
    return NextResponse.json({ ok: false, errorCode: "SAVE_FAILED", error: SAVE_FAILED_MESSAGE, recovery: "retry" }, { status: 500 });
  }
}
