import "server-only";

import {
  assertValidS233ContractValue,
  validateS233EvidenceProofBundle,
  validateS233LaneAEvidenceProofBundle,
  validateS233LearnerAnswerReviewIdentity,
  validateS233LearnerReviewEvaluationContext,
  validateS233LearnerReviewTransition,
  type S233EvidenceProofBundle,
  type S233LearnerAnswerReviewIdentity,
  type S233LearnerReviewEvaluationContext,
} from "./s233-parallel-execution-contract";
import type {
  S233aPersistedReview,
  S233aReviewClaimResult,
  S233aReviewTransitionInput,
} from "./s233a-types";

type StoredRow = {
  claim_status?: unknown;
  review_identity?: unknown;
  evaluation_context?: unknown;
  evidence_bundles?: unknown;
  persistence_receipt_id?: unknown;
};

export class S233aPersistenceError extends Error {
  readonly code = "S233A_PERSISTENCE_REJECTED";
  readonly reason: "auth" | "conflict" | "unavailable" | "invalid_record";

  constructor(reason: "auth" | "conflict" | "unavailable" | "invalid_record") {
    super(`s233a-persistence-rejected:${reason}`);
    this.reason = reason;
  }
}

async function clientsFor(authenticatedUserId: string) {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const userClient = await createSupabaseServerClient().catch(() => {
    throw new S233aPersistenceError("unavailable");
  });
  const auth = await userClient.auth.getUser();
  if (auth.error || !auth.data.user || auth.data.user.id !== authenticatedUserId) {
    throw new S233aPersistenceError("auth");
  }
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const persistenceClient = createSupabaseAdminClient();
  if (!persistenceClient) throw new S233aPersistenceError("unavailable");
  return { userClient, persistenceClient };
}

function parsePersisted(row: StoredRow): S233aPersistedReview {
  const review = row.review_identity as S233LearnerAnswerReviewIdentity;
  assertValidS233ContractValue(validateS233LearnerAnswerReviewIdentity(review));
  const evaluationContext =
    row.evaluation_context === null || row.evaluation_context === undefined
      ? null
      : (row.evaluation_context as S233LearnerReviewEvaluationContext);
  if (evaluationContext) {
    assertValidS233ContractValue(validateS233LearnerReviewEvaluationContext(evaluationContext));
    if (evaluationContext.review.reviewRecordVersion !== review.reviewRecordVersion) {
      throw new S233aPersistenceError("invalid_record");
    }
  }
  const evidenceBundles = Array.isArray(row.evidence_bundles)
    ? (row.evidence_bundles as S233EvidenceProofBundle[])
    : [];
  for (const bundle of evidenceBundles) {
    assertValidS233ContractValue(validateS233EvidenceProofBundle(bundle));
    assertValidS233ContractValue(validateS233LaneAEvidenceProofBundle(bundle));
    if (
      bundle.record.learnerOwnerRefId !== review.learnerOwnerRefId ||
      (bundle.record.learnerReviewId !== review.reviewId &&
        (bundle.record.state !== "corrected" ||
          bundle.record.learnerReviewId !== review.rewriteRegradeLineage.predecessorReviewId))
    ) throw new S233aPersistenceError("invalid_record");
  }
  if (typeof row.persistence_receipt_id !== "string" || !row.persistence_receipt_id) {
    throw new S233aPersistenceError("invalid_record");
  }
  return { review, evaluationContext, evidenceBundles, persistenceReceiptId: row.persistence_receipt_id };
}

function firstRow(data: unknown): StoredRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") throw new S233aPersistenceError("invalid_record");
  return row as StoredRow;
}

export const s233aSupabaseRepository = {
  async claim(
    authenticatedUserId: string,
    review: S233LearnerAnswerReviewIdentity,
    persistenceReceiptId: string,
  ): Promise<S233aReviewClaimResult> {
    assertValidS233ContractValue(validateS233LearnerReviewTransition(null, review));
    const { persistenceClient } = await clientsFor(authenticatedUserId);
    const result = await persistenceClient.rpc("claim_s233a_answer_review_v1", {
      p_user_id: authenticatedUserId,
      p_review_id: review.reviewId,
      p_idempotency_key: review.idempotency.key,
      p_input_fingerprint: review.idempotency.inputFingerprint,
      p_review_identity: review,
      p_receipt_id: persistenceReceiptId,
    });
    if (result.error) {
      throw new S233aPersistenceError(result.error.code === "40001" ? "conflict" : "unavailable");
    }
    const row = firstRow(result.data);
    const persisted = parsePersisted(row);
    if (
      persisted.review.learnerOwnerRefId !== review.learnerOwnerRefId ||
      persisted.review.idempotency.key !== review.idempotency.key ||
      persisted.review.idempotency.inputFingerprint !== review.idempotency.inputFingerprint
    ) throw new S233aPersistenceError("conflict");
    const status = row.claim_status;
    if (!["claimed", "retry_claimed", "replayed", "in_progress"].includes(String(status))) {
      throw new S233aPersistenceError("invalid_record");
    }
    return { status: status as S233aReviewClaimResult["status"], persisted } as S233aReviewClaimResult;
  },

  async transition(
    authenticatedUserId: string,
    input: S233aReviewTransitionInput,
  ): Promise<S233aPersistedReview> {
    assertValidS233ContractValue(validateS233LearnerReviewTransition(input.previous, input.next));
    if (input.evaluationContext) {
      assertValidS233ContractValue(validateS233LearnerReviewEvaluationContext(input.evaluationContext));
    }
    for (const bundle of input.evidenceBundles) {
      assertValidS233ContractValue(validateS233EvidenceProofBundle(bundle));
      assertValidS233ContractValue(validateS233LaneAEvidenceProofBundle(bundle));
    }
    const { persistenceClient } = await clientsFor(authenticatedUserId);
    const result = await persistenceClient.rpc("transition_s233a_answer_review_v1", {
      p_user_id: authenticatedUserId,
      p_review_id: input.next.reviewId,
      p_expected_version: input.previous.reviewRecordVersion,
      p_review_identity: input.next,
      p_evaluation_context: input.evaluationContext,
      p_evidence_bundles: input.evidenceBundles,
      p_concept_transitions: input.conceptTransitions,
      p_queue_linkage: input.queueTodayLinkage,
      p_receipt_id: input.persistenceReceiptId,
    });
    if (result.error) {
      throw new S233aPersistenceError(result.error.code === "40001" ? "conflict" : "unavailable");
    }
    return parsePersisted(firstRow(result.data));
  },

  async loadReview(
    authenticatedUserId: string,
    reviewId: string,
  ): Promise<S233aPersistedReview | null> {
    const { userClient } = await clientsFor(authenticatedUserId);
    const result = await userClient
      .from("s233a_answer_reviews")
      .select("review_identity,evaluation_context,evidence_bundles,persistence_receipt_id")
      .eq("review_id", reviewId)
      .maybeSingle();
    if (result.error) throw new S233aPersistenceError("unavailable");
    return result.data ? parsePersisted(result.data as StoredRow) : null;
  },
};
