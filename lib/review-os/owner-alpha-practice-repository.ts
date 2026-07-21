import "server-only";

import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  isOwnerAlphaPracticeSession,
  OWNER_ALPHA_PRACTICE_STAGE,
  type OwnerAlphaMethodFamily,
  type OwnerAlphaPracticeSession,
} from "./owner-alpha-practice-contract";
import {
  ownerAlphaStableUuid,
  type OwnerAlphaCompletionProjection,
} from "./owner-alpha-practice-ids";

const SESSION_EXAM_ID = "appraiser_second";
const SESSION_KIND = "universal_appraisal_practice";
const QUEUE_EXAM_ID = "wrong_answer_os";
const APPRAISAL_EXAM_NAME = "감정평가사 2차";
const APPRAISAL_SUBJECT = "감정평가실무";

type StoredSessionRow = {
  id: string;
  user_id: string;
  raw_payload: unknown;
  updated_at: string;
};

export class OwnerAlphaPracticePersistenceError extends Error {
  constructor(readonly operation: string, readonly code = "operation_failed") {
    super(`owner-alpha-practice-persistence:${operation}:${code}`);
  }
}

export class OwnerAlphaPracticeCasError extends Error {
  constructor() {
    super("owner-alpha-practice-cas-conflict");
  }
}

export interface OwnerAlphaPracticeRepositoryPort {
  create(session: OwnerAlphaPracticeSession): Promise<OwnerAlphaPracticeSession>;
  load(sessionId: string): Promise<OwnerAlphaPracticeSession | null>;
  save(
    session: OwnerAlphaPracticeSession,
    expectedRecordVersion: number,
  ): Promise<OwnerAlphaPracticeSession>;
  listRecentSessions(limit?: number): Promise<OwnerAlphaPracticeSession[]>;
  saveIndependentAttempt(session: OwnerAlphaPracticeSession): Promise<void>;
  saveRewrite(session: OwnerAlphaPracticeSession): Promise<void>;
  recordReferenceUsage(session: OwnerAlphaPracticeSession): Promise<void>;
  projectCompletion(
    session: OwnerAlphaPracticeSession,
    projection: OwnerAlphaCompletionProjection,
  ): Promise<void>;
}

function throwIfError(
  operation: string,
  result: { error: { code?: string; message?: string } | null },
) {
  if (result.error) {
    throw new OwnerAlphaPracticePersistenceError(
      operation,
      result.error.code ?? "operation_failed",
    );
  }
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nextUpdatedAt(previous: string) {
  const now = Date.now();
  const previousMs = Date.parse(previous);
  return new Date(Math.max(now, Number.isFinite(previousMs) ? previousMs + 1 : now)).toISOString();
}

function sessionDerivedPayload(session: OwnerAlphaPracticeSession) {
  return {
    contractVersion: session.contractVersion,
    recordVersion: session.recordVersion,
    status: session.status,
    methodFamily: session.problemModel.methodFamily,
    topicCandidates: session.problemModel.topicCandidates.slice(0, 8),
    claimVerificationStates: session.problemModel.claimVerificationStates.map(
      (claim) => ({ claimId: claim.claimId, state: claim.state, critical: claim.critical }),
    ),
    questionChainId: session.questionChain.chainId,
    misconceptionGraphId: session.misconceptionGraph.graphId,
    rootCauseCandidateIds: session.rootCauseCandidates.map((item) => item.rootCauseId),
    replayLinkIds: session.questionReplayLinks.map((item) => item.replayLinkId),
    fixedD1DueAt: session.fixedD1DueAt,
    containsRawContent: false,
  };
}

function sessionRow(userId: string, session: OwnerAlphaPracticeSession) {
  return {
    id: session.sessionId,
    user_id: userId,
    exam_id: SESSION_EXAM_ID,
    subject_id: APPRAISAL_SUBJECT,
    stage: OWNER_ALPHA_PRACTICE_STAGE,
    session_kind: SESSION_KIND,
    source_label: "Universal Practice v0",
    raw_payload: { nativeContract: session },
    derived_payload: sessionDerivedPayload(session),
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function readSession(row: StoredSessionRow | null) {
  if (!row || typeof row.raw_payload !== "object" || !row.raw_payload) return null;
  const candidate = (row.raw_payload as Record<string, unknown>).nativeContract;
  if (!isOwnerAlphaPracticeSession(candidate)) {
    throw new OwnerAlphaPracticePersistenceError("read_session", "invalid_native_contract");
  }
  if (candidate.sessionId !== row.id) {
    throw new OwnerAlphaPracticePersistenceError("read_session", "session_id_mismatch");
  }
  return { ...candidate, updatedAt: row.updated_at };
}

function confidenceLabel(value: OwnerAlphaPracticeSession["assistance"]["confidence"]) {
  if (value === "low") return "낮음";
  if (value === "high") return "높음";
  return "중간";
}

function firstL1Text(session: OwnerAlphaPracticeSession) {
  if (!session.aiReference || session.aiReference.releaseStatus !== "released") {
    return `${OWNER_ALPHA_AI_REFERENCE_LABEL}\n생성이 보류되었습니다. 문제 원문과 결정론적 계산 결과를 직접 확인하세요.`;
  }
  const body = session.aiReference.l1.sections
    .map((section) => `${section.heading}: ${section.body}`)
    .join("\n");
  return `${OWNER_ALPHA_AI_REFERENCE_LABEL}\n${OWNER_ALPHA_AI_REFERENCE_DISCLAIMER}\n${body}`.slice(
    0,
    12_000,
  );
}

export class SupabaseOwnerAlphaPracticeRepository
  implements OwnerAlphaPracticeRepositoryPort
{
  constructor(
    private readonly userId: string,
    private readonly client: SupabaseClient,
  ) {}

  private async loadRow(sessionId: string): Promise<StoredSessionRow | null> {
    const result = await this.client
      .from("exam_sessions")
      .select("id,user_id,raw_payload,updated_at")
      .eq("id", sessionId)
      .eq("user_id", this.userId)
      .eq("stage", OWNER_ALPHA_PRACTICE_STAGE)
      .eq("session_kind", SESSION_KIND)
      .maybeSingle();
    throwIfError("load_session", result);
    return (result.data as StoredSessionRow | null) ?? null;
  }

  async create(session: OwnerAlphaPracticeSession) {
    const result = await this.client.from("exam_sessions").insert(
      sessionRow(this.userId, session),
    );
    throwIfError("create_session", result);
    return session;
  }

  async load(sessionId: string) {
    return readSession(await this.loadRow(sessionId));
  }

  async save(session: OwnerAlphaPracticeSession, expectedRecordVersion: number) {
    const storedRow = await this.loadRow(session.sessionId);
    const stored = readSession(storedRow);
    if (!storedRow || !stored || stored.recordVersion !== expectedRecordVersion) {
      throw new OwnerAlphaPracticeCasError();
    }
    const persisted: OwnerAlphaPracticeSession = {
      ...session,
      recordVersion: expectedRecordVersion + 1,
      updatedAt: nextUpdatedAt(storedRow.updated_at),
    };
    const row = sessionRow(this.userId, persisted);
    const result = await this.client
      .from("exam_sessions")
      .update({
        raw_payload: row.raw_payload,
        derived_payload: row.derived_payload,
        updated_at: row.updated_at,
      })
      .eq("id", session.sessionId)
      .eq("user_id", this.userId)
      .eq("stage", OWNER_ALPHA_PRACTICE_STAGE)
      .eq("updated_at", storedRow.updated_at)
      .select("id")
      .maybeSingle();
    throwIfError("save_session", result);
    if (!result.data) throw new OwnerAlphaPracticeCasError();
    return persisted;
  }

  async listRecentSessions(limit = 20) {
    const result = await this.client
      .from("exam_sessions")
      .select("id,user_id,raw_payload,updated_at")
      .eq("user_id", this.userId)
      .eq("stage", OWNER_ALPHA_PRACTICE_STAGE)
      .eq("session_kind", SESSION_KIND)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 50)));
    throwIfError("list_recent_sessions", result);
    return ((result.data ?? []) as StoredSessionRow[])
      .map(readSession)
      .filter((session): session is OwnerAlphaPracticeSession => Boolean(session));
  }

  async saveIndependentAttempt(session: OwnerAlphaPracticeSession) {
    const attempt = session.independentAttempt;
    if (!attempt) {
      throw new OwnerAlphaPracticePersistenceError("save_attempt", "missing_attempt");
    }
    const result = await this.client.from("answer_submissions").upsert(
      {
        id: attempt.attemptId,
        user_id: this.userId,
        exam_id: SESSION_EXAM_ID,
        subject_id: APPRAISAL_SUBJECT,
        stage: OWNER_ALPHA_PRACTICE_STAGE,
        session_id: session.sessionId,
        submission_kind: "independent_attempt",
        source_label: "Universal Practice v0",
        raw_payload: { answerText: attempt.text },
        derived_payload: {
          contractVersion: session.contractVersion,
          elapsedTimeMs: attempt.elapsedTimeMs,
          confidence: attempt.confidence,
          assistanceLevel: 0,
          answerExposure: "none",
          independentAttemptBeforeHelp: true,
          containsRawContent: false,
        },
        created_at: attempt.savedAt,
        updated_at: attempt.savedAt,
      },
      { onConflict: "id" },
    );
    throwIfError("save_attempt", result);
  }

  async saveRewrite(session: OwnerAlphaPracticeSession) {
    const rewrite = session.rewrite;
    if (!rewrite || !session.independentAttempt) {
      throw new OwnerAlphaPracticePersistenceError("save_rewrite", "missing_rewrite");
    }
    const result = await this.client.from("rewrite_submissions").upsert(
      {
        id: rewrite.rewriteId,
        user_id: this.userId,
        exam_id: SESSION_EXAM_ID,
        subject_id: APPRAISAL_SUBJECT,
        stage: OWNER_ALPHA_PRACTICE_STAGE,
        source_submission_id: session.independentAttempt.attemptId,
        rewrite_kind: rewrite.mode,
        raw_payload: { rewriteText: rewrite.text },
        derived_payload: {
          contractVersion: session.contractVersion,
          biggestGapId: session.biggestGap?.gapId ?? null,
          successCriteria: session.biggestGap?.successCriteria ?? null,
          containsRawContent: false,
        },
        created_at: rewrite.savedAt,
        updated_at: rewrite.savedAt,
      },
      { onConflict: "id" },
    );
    throwIfError("save_rewrite", result);
  }

  async recordReferenceUsage(session: OwnerAlphaPracticeSession) {
    if (session.providerState.reference !== "succeeded" || !session.aiReference) {
      throw new OwnerAlphaPracticePersistenceError(
        "record_reference_usage",
        "reference_not_succeeded",
      );
    }
    const id = ownerAlphaStableUuid(`${this.userId}:${session.sessionId}:reference-usage`);
    const result = await this.client.from("usage_events").upsert(
      {
        id,
        user_id: this.userId,
        event_name: "answer_review_structure_success",
        entity_type: "owner_alpha_practice_session",
        entity_id: session.sessionId,
        metadata_json: {
          contractVersion: session.contractVersion,
          modelProfileId: session.providerState.modelProfileId,
          methodFamily: session.problemModel.methodFamily,
          assistanceLevel: session.assistance.assistanceLevel,
          containsRawContent: false,
        },
        created_at: session.aiReference.generatedAt,
      },
      { onConflict: "id" },
    );
    throwIfError("record_reference_usage", result);
  }

  async projectCompletion(
    session: OwnerAlphaPracticeSession,
    projection: OwnerAlphaCompletionProjection,
  ) {
    if (!session.independentAttempt || !session.rewrite || !session.fixedD1DueAt) {
      throw new OwnerAlphaPracticePersistenceError(
        "project_completion",
        "incomplete_session",
      );
    }
    const now = session.rewrite.savedAt;
    const gap = session.biggestGap;
    const topicTag =
      session.problemModel.topicCandidates[0] ??
      (session.problemModel.methodFamily as OwnerAlphaMethodFamily);
    const mistakeType = gap?.title ?? "가장 큰 간극 확인 필요";
    const wrongAnswerResult = await this.client.from("wrong_answer_items").upsert(
      {
        id: projection.wrongAnswerItemId,
        user_id: this.userId,
        exam_name: APPRAISAL_EXAM_NAME,
        subject_label: APPRAISAL_SUBJECT,
        source_type: "manual",
        source_label: "Universal Practice v0",
        problem_title: session.problemModel.requirements[0]?.text.slice(0, 180) ?? "감정평가실무 연습문제",
        problem_identifier: session.sessionId,
        raw_question_text: session.confirmedProblemText,
        raw_answer_text: firstL1Text(session),
        correct_answer: firstL1Text(session),
        user_answer: session.independentAttempt.text,
        user_reason_text: gap?.inferredMisunderstanding ?? "직접 확인 필요",
        user_reason_preset: "가장 큰 간극 1개",
        confidence: confidenceLabel(session.independentAttempt.confidence),
        time_spent_seconds: Math.max(0, Math.round(session.independentAttempt.elapsedTimeMs / 1_000)),
        dedupe_key: sha256(`${this.userId}:${session.sessionId}:learning-record`),
        processing_status: "completed",
        raw_payload: {
          rewriteText: session.rewrite.text,
          rewriteMode: session.rewrite.mode,
          questionChain: session.questionChain,
          learnerOwned: true,
        },
        derived_payload: {
          contractVersion: session.contractVersion,
          ownerAlphaPracticeSessionId: session.sessionId,
          topicTag,
          mistakeType,
          recurrenceCount: 1,
          biggestGapId: gap?.gapId ?? null,
          misconceptionGraphId: session.misconceptionGraph.graphId,
          rootCauseCandidateIds: session.rootCauseCandidates.map((item) => item.rootCauseId),
          replayLinkIds: session.questionReplayLinks.map((item) => item.replayLinkId),
          methodFamily: session.problemModel.methodFamily,
          containsRawContent: false,
        },
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    throwIfError("project_completion_wrong_answer", wrongAnswerResult);

    const queueResult = await this.client.from("review_queue_items").upsert(
      {
        id: projection.reviewQueueItemId,
        user_id: this.userId,
        exam_id: QUEUE_EXAM_ID,
        subject_id: APPRAISAL_SUBJECT,
        stage: "alpha",
        source_submission_id: projection.wrongAnswerItemId,
        source_kind: "wrong_answer",
        status: "pending",
        priority_score: 92,
        raw_payload: {
          dueAt: session.fixedD1DueAt,
          reviewReason: `D+1 · ${gap?.title ?? "가장 큰 간극을 다시 확인하세요."}`,
        },
        derived_payload: {
          contractVersion: session.contractVersion,
          ownerAlphaPracticeSessionId: session.sessionId,
          topicTag,
          mistakeType,
          recurrenceCount: 1,
          completionAction: session.rewrite.mode,
          followUpScheduledAt: session.fixedD1DueAt,
          containsRawContent: false,
        },
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    throwIfError("project_completion_queue", queueResult);

    const actionResult = await this.client.from("action_seeds").upsert(
      {
        id: projection.todayActionSeedId,
        user_id: this.userId,
        source_type: "next_action",
        seed_type: "action",
        priority_score: 92,
        rendered_text: `D+1에 ${gap?.successCriteria ?? "같은 문제를 다시 계산합니다."}`,
        raw_payload: {
          dueAt: session.fixedD1DueAt,
          sourceQueueId: projection.reviewQueueItemId,
          sourceItemId: projection.wrongAnswerItemId,
          ownerAlphaPracticeSessionId: session.sessionId,
        },
        created_at: now,
      },
      { onConflict: "id" },
    );
    throwIfError("project_completion_today", actionResult);

    const usageRows = [
      {
        id: projection.completionUsageEventId,
        event_name: "post_save_execution_completed",
        entity_type: "owner_alpha_practice_session",
        entity_id: session.sessionId,
        metadata_json: {
          contractVersion: session.contractVersion,
          methodFamily: session.problemModel.methodFamily,
          rewriteMode: session.rewrite.mode,
          containsRawContent: false,
        },
      },
      {
        id: projection.followupUsageEventId,
        event_name: "review_followup_scheduled",
        entity_type: "review_queue_item",
        entity_id: projection.reviewQueueItemId,
        metadata_json: {
          contractVersion: session.contractVersion,
          schedule: "fixed_d_plus_1",
          containsRawContent: false,
        },
      },
    ].map((row) => ({ ...row, user_id: this.userId, created_at: now }));
    const usageResult = await this.client
      .from("usage_events")
      .upsert(usageRows, { onConflict: "id" });
    throwIfError("project_completion_usage", usageResult);
  }
}

export async function createOwnerAlphaPracticeRepository(userId: string) {
  const client = await createSupabaseServerClient();
  const authResult = await client.auth.getUser();
  if (authResult.error || authResult.data.user?.id !== userId) {
    throw new OwnerAlphaPracticePersistenceError(
      "create_repository",
      "authenticated_user_mismatch",
    );
  }
  return new SupabaseOwnerAlphaPracticeRepository(userId, client);
}
