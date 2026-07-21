import test from "node:test";
import assert from "node:assert/strict";

import {
  assertValidS233ContractValue,
  validateS233LearnerReviewTransition,
} from "../lib/review-os/s233-parallel-execution-contract.ts";
import { isS233aReleasedAnswerPack } from "../lib/review-os/s233a-answer-pack-release.ts";
import { getS233aUnambiguousSegmentId } from "../lib/review-os/s233a-evidence-locator.ts";
import { buildS233aQueueTodayLinkage } from "../lib/review-os/s233a-queue-today.ts";
import { runS233aAnswerReview } from "../lib/review-os/s233a-review-runtime.ts";
import { S233aRuntimeContractError } from "../lib/review-os/s233a-review-runtime.ts";
import { request, trustedLawMaterials } from "./s233a-fixtures.mjs";

function memoryRepository() {
  const rows = new Map();
  return {
    rows,
    async claim(_userId, review, receipt) {
      assertValidS233ContractValue(validateS233LearnerReviewTransition(null, review));
      const existing = rows.get(review.reviewId);
      if (existing) {
        if (existing.review.idempotency.inputFingerprint !== review.idempotency.inputFingerprint) throw new Error("conflict");
        if (["completed", "abstained"].includes(existing.review.stageStatus.overall)) {
          return { status: "replayed", persisted: structuredClone(existing) };
        }
        if (existing.review.stageStatus.overall === "failed_retryable" && !existing.requestActive) {
          existing.requestActive = true;
          rows.set(review.reviewId, existing);
          return { status: "retry_claimed", persisted: structuredClone(existing) };
        }
        return { status: "in_progress", persisted: structuredClone(existing) };
      }
      const persisted = { review: structuredClone(review), evaluationContext: null, evidenceBundles: [], persistenceReceiptId: receipt, requestActive: true };
      rows.set(review.reviewId, persisted);
      return { status: "claimed", persisted: structuredClone(persisted) };
    },
    async transition(_userId, input) {
      const current = rows.get(input.next.reviewId);
      if (!current || current.review.reviewRecordVersion !== input.previous.reviewRecordVersion) throw new Error("cas");
      if (["completed", "abstained"].includes(current.review.stageStatus.overall)) throw new Error("terminal");
      assertValidS233ContractValue(validateS233LearnerReviewTransition(current.review, input.next));
      const persisted = {
        review: structuredClone(input.next),
        evaluationContext: structuredClone(input.evaluationContext),
        evidenceBundles: structuredClone(input.evidenceBundles),
        persistenceReceiptId: input.persistenceReceiptId,
        requestActive: !["failed_retryable", "completed", "abstained"].includes(input.next.stageStatus.overall),
      };
      rows.set(input.next.reviewId, persisted);
      return structuredClone(persisted);
    },
    async loadReview(_userId, reviewId) {
      return structuredClone(rows.get(reviewId) ?? null);
    },
  };
}

function grader(statuses, counters) {
  return {
    modelVersion: "fake-primary.v1",
    promptVersion: "fake-primary-prompt.v1",
    async grade(input) {
      counters.primary += 1;
      return {
        status: statuses.includes("not_assessable") ? "abstained" : "completed",
        observations: input.skills.map((skill, index) => ({
          skillId: skill.skillId,
          status: statuses[index] ?? "met",
          learnerSegmentId: statuses[index] === "missing" || statuses[index] === "not_assessable" ? null : "segment-1",
          learnerCalculationStepId: null,
          confidence: statuses[index] === "not_assessable" ? "low" : "high",
          uncertaintyCodes: statuses[index] === "not_assessable" ? ["evaluator_uncertain"] : [],
          abstentionReason: statuses[index] === "not_assessable" ? "evaluator_uncertain" : null,
        })),
      };
    },
  };
}

function dependencies(repository, statuses, counters, criticResult = { status: "completed", unresolvedCodes: [] }) {
  const primary = grader(statuses, counters);
  return {
    repository,
    loadTrustedMaterials: async () => trustedLawMaterials(),
    primaryGraders: { law: primary, theory: primary, practice: primary },
    critic: {
      modelVersion: "fake-critic.v1",
      promptVersion: "fake-critic-prompt.v1",
      async review() { counters.critic += 1; return criticResult; },
    },
    prepareQueueTodayLinkage: buildS233aQueueTodayLinkage,
    now: () => "2026-07-21T06:00:00.000Z",
    randomId: (prefix) => `${prefix}-${globalRandomId++}`,
  };
}

let globalRandomId = 1;

test("unanchored multi-segment grading cannot fabricate a first-segment evidence locator", () => {
  assert.equal(getS233aUnambiguousSegmentId([{ segmentId: "segment-1" }]), "segment-1");
  assert.equal(
    getS233aUnambiguousSegmentId([{ segmentId: "segment-1" }, { segmentId: "segment-2" }]),
    null,
  );
});

test("only blocker-free S214/S215 released Answer Packs are learner-review eligible", () => {
  const released = trustedLawMaterials();
  assert.equal(
    isS233aReleasedAnswerPack(released.answerPack, released.answerPackRegistryContext),
    true,
  );
  const draft = structuredClone(released);
  draft.answerPack.verificationStatus = "expert_unreviewed_ai_draft";
  draft.answerPack.releaseProof = null;
  assert.equal(isS233aReleasedAnswerPack(draft.answerPack, draft.answerPackRegistryContext), false);
  const blocked = structuredClone(released);
  blocked.answerPack.releaseProof.unresolvedBlockerCodes = ["unresolved-source"];
  assert.equal(isS233aReleasedAnswerPack(blocked.answerPack, blocked.answerPackRegistryContext), false);
});

test("deterministic-first uses exactly one primary grader and skips an unneeded critic", async () => {
  const counters = { primary: 0, critic: 0 };
  const result = await runS233aAnswerReview(request(), dependencies(memoryRepository(), ["met", "met", "met"], counters));
  assert.equal(result.review.stageStatus.overall, "completed");
  assert.equal(counters.primary, 1);
  assert.equal(counters.critic, 0);
  assert.equal(result.cascadeBundle.trace.humanApproval.required, false);
  assert.equal(result.review.queueTodayLinkage.status, "queue_and_today_linked");
});

test("critical finding and actual deterministic disagreement invoke one conditional critic", async () => {
  const counters = { primary: 0, critic: 0 };
  const result = await runS233aAnswerReview(request(), dependencies(memoryRepository(), ["partial", "met", "met"], counters));
  assert.equal(counters.primary, 1);
  assert.equal(counters.critic, 1);
  assert.deepEqual(new Set(result.cascadeBundle.trace.conditionalCritic.triggerReasons), new Set(["critical_finding", "grader_disagreement"]));
  assert.deepEqual(result.evidenceBundles.map((item) => item.record.state), ["detected"]);
});

test("unresolved primary evidence abstains and emits only uncertain learner evidence", async () => {
  const counters = { primary: 0, critic: 0 };
  const result = await runS233aAnswerReview(request(), dependencies(memoryRepository(), ["not_assessable", "not_assessable", "not_assessable"], counters));
  assert.equal(result.review.stageStatus.overall, "abstained");
  assert.equal(counters.primary, 1);
  assert.equal(counters.critic, 1);
  assert.deepEqual(new Set(result.evidenceBundles.map((item) => item.record.state)), new Set(["uncertain"]));
});

test("multiple source anchors abstain before learner text reaches a provider", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const materials = trustedLawMaterials();
  materials.answerPack.claimSourceGraph.sourceAnchorIds.push("source-law-2");
  materials.answerPack.claimSourceGraph.edges[1].sourceAnchorId = "source-law-2";
  materials.answerPack.snapshot.sourceIds.push("source-law-2");
  materials.answerPackRegistryContext.sourceRecords.push({
    sourceId: "source-law-2",
    subject: "law",
    sourceAnchorIds: ["source-law-2"],
    lawVersionIds: [],
    rightsDecisionIds: [],
  });
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  deps.loadTrustedMaterials = async () => materials;
  const result = await runS233aAnswerReview(request(), deps);
  assert.equal(result.review.stageStatus.overall, "abstained");
  assert.equal(counters.primary, 0);
  assert.equal(counters.critic, 0);
  assert.deepEqual(result.cascadeBundle.trace.deterministicChecks.blockerCodes, ["source_unresolved"]);
  assert.equal(result.cascadeBundle.trace.primarySubjectGrader.status, "not_run");
  assert.equal(result.findingBundles.length, 0);
  assert.equal(result.findingBundles.every((item) => item.finding.status === "not_assessable"), true);
  assert.equal(result.findingBundles.every((item) => item.finding.abstentionReason === "source_unresolved"), true);
  assert.equal(result.findingBundles.every((item) => item.sourceAnchorBindings.length === 0), true);
});

test("deterministic failure skips both model stages and persists abstention", async () => {
  const counters = { primary: 0, critic: 0 };
  const empty = request({ learnerInput: { normalizedText: "", segments: [] } });
  const result = await runS233aAnswerReview(empty, dependencies(memoryRepository(), ["met", "met", "met"], counters));
  assert.equal(result.review.stageStatus.overall, "abstained");
  assert.equal(result.review.stageStatus.deterministicChecks, "failed");
  assert.equal(counters.primary, 0);
  assert.equal(counters.critic, 0);
  assert.equal(result.findingBundles.length, 0);
});

test("same request is idempotently replayed without any additional model call", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  await runS233aAnswerReview(request(), deps);
  const replay = await runS233aAnswerReview(request(), deps);
  assert.equal(replay.replayed, true);
  assert.equal(counters.primary, 1);
  assert.equal(counters.critic, 0);
});

test("same learner idempotency key rejects a changed input fingerprint", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  await runS233aAnswerReview(request(), deps);
  await assert.rejects(
    runS233aAnswerReview(request({
      learnerInput: {
        normalizedText: "쟁점은 같지만 저장 대상 입력은 달라졌다.",
        segments: [{ segmentId: "segment-1", text: "쟁점은 같지만 저장 대상 입력은 달라졌다." }],
      },
    }), deps),
    /conflict/,
  );
});

test("complete runtime state contains no raw learner answer or question", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const rawAnswer = "쟁점과 법리를 제시하는 SECRET-LEARNER-ANSWER-9381";
  const rawQuestion = "SECRET-QUESTION-4827을 검토하시오";
  const input = request({
    questionText: rawQuestion,
    learnerInput: { normalizedText: rawAnswer, segments: [{ segmentId: "segment-1", text: rawAnswer }] },
  });
  const result = await runS233aAnswerReview(input, dependencies(repository, ["met", "met", "met"], counters));
  const persisted = JSON.stringify([...repository.rows.values()]);
  const response = JSON.stringify(result);
  assert.equal(persisted.includes(rawAnswer), false);
  assert.equal(persisted.includes(rawQuestion), false);
  assert.equal(response.includes(rawAnswer), false);
  assert.equal(response.includes(rawQuestion), false);
});

test("forged cross-learner rewrite provenance is rejected before grading", async () => {
  const repository = memoryRepository();
  const firstCounters = { primary: 0, critic: 0 };
  const first = await runS233aAnswerReview(
    request(),
    dependencies(repository, ["partial", "met", "met"], firstCounters),
  );
  const forged = request({
    authenticatedUserId: "22222222-2222-4222-8222-222222222222",
    clientRequestId: "client-request-forged",
    attemptId: "attempt-2",
    attemptVersion: 2,
    parentAttemptId: "attempt-root-1",
    predecessorReviewId: first.review.reviewId,
    inputVersionId: "input-version-2",
  });
  const counters = { primary: 0, critic: 0 };
  await assert.rejects(
    runS233aAnswerReview(forged, dependencies(repository, ["met", "met", "met"], counters)),
    (error) => error instanceof S233aRuntimeContractError && error.reason === "forged_rewrite_lineage",
  );
  assert.equal(counters.primary, 0);
});

test("S206 rewrite verification appends corrected evidence without overwriting detection", async () => {
  const repository = memoryRepository();
  const first = await runS233aAnswerReview(
    request(),
    dependencies(repository, ["partial", "met", "met"], { primary: 0, critic: 0 }),
  );
  const rewritten = request({
    clientRequestId: "client-request-2",
    attemptId: "attempt-2",
    attemptVersion: 2,
    parentAttemptId: "attempt-root-1",
    predecessorReviewId: first.review.reviewId,
    inputVersionId: "input-version-2",
  });
  const second = await runS233aAnswerReview(
    rewritten,
    dependencies(repository, ["met", "met", "met"], { primary: 0, critic: 0 }),
  );
  assert.deepEqual(second.evidenceBundles.map((item) => item.record.state), ["corrected"]);
  assert.equal(
    second.evidenceBundles[0].record.predecessorEvidenceStateId,
    first.evidenceBundles[0].record.evidenceStateId,
  );
  assert.equal(first.evidenceBundles[0].record.state, "detected");
  assert.equal(repository.rows.get(first.review.reviewId).review.stageStatus.overall, "completed");
});

test("critic abstention cannot be bypassed and limits Lane A evidence to uncertain", async () => {
  const counters = { primary: 0, critic: 0 };
  const result = await runS233aAnswerReview(
    request(),
    dependencies(
      memoryRepository(),
      ["partial", "met", "met"],
      counters,
      { status: "abstained", unresolvedCodes: ["critic_disagreement_unresolved"] },
    ),
  );
  assert.equal(result.review.stageStatus.overall, "abstained");
  assert.equal(result.cascadeBundle.trace.finalDisposition, "abstained");
  assert.deepEqual(new Set(result.evidenceBundles.map((item) => item.record.state)), new Set(["uncertain"]));
});

test("complete reveal history is fingerprinted and an exposure mismatch fails before grading", async () => {
  const counters = { primary: 0, critic: 0 };
  const result = await runS233aAnswerReview(
    request({
      revealHistory: [{
        eventId: "reveal-outline-1",
        occurredAt: "2026-07-21T05:50:00.000Z",
        exposure: "outline",
        answerLevel: "L1_recall_outline",
        deliberateLearnerOverride: true,
      }],
      answerExposure: "none",
    }),
    dependencies(memoryRepository(), ["met", "met", "met"], counters),
  );
  assert.equal(result.review.stageStatus.overall, "abstained");
  assert.equal(counters.primary, 0);
  assert.equal(result.cascadeBundle.trace.deterministicChecks.blockerCodes.includes("exposure_history_mismatch"), true);
});

test("fake OCR-derived segments preserve modality metadata without persisting OCR text", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const ocrText = "쟁점 법리 사안 결론 OCR-PRIVATE-7719";
  const result = await runS233aAnswerReview(
    request({
      inputModality: "handwritten_ocr",
      confidence: "medium",
      predecessorControllerEventId: "controller-before-ocr",
      learnerInput: { normalizedText: ocrText, segments: [{ segmentId: "segment-1", text: ocrText, pageIndex: 0 }] },
    }),
    dependencies(repository, ["partial", "met", "met"], counters),
  );
  assert.equal(result.evidenceBundles[0].controllerEvent.inputModality, "handwritten_ocr");
  assert.equal(result.evidenceBundles[0].controllerEvent.confidence, "medium");
  assert.equal(result.evidenceBundles[0].controllerEvent.predecessorEventId, "controller-before-ocr");
  assert.equal(JSON.stringify([...repository.rows.values()]).includes(ocrText), false);
});

test("repository rejects any attempted mutation after terminal persistence", async () => {
  const repository = memoryRepository();
  const result = await runS233aAnswerReview(
    request(),
    dependencies(repository, ["met", "met", "met"], { primary: 0, critic: 0 }),
  );
  const attempted = structuredClone(result.review);
  attempted.reviewRecordVersion += 1;
  attempted.expectedPreviousReviewRecordVersion = result.review.reviewRecordVersion;
  await assert.rejects(
    repository.transition(request().authenticatedUserId, {
      previous: result.review,
      next: attempted,
      evaluationContext: null,
      evidenceBundles: [],
      conceptTransitions: [],
      queueTodayLinkage: null,
      persistenceReceiptId: "receipt-after-terminal",
    }),
    /terminal/,
  );
});

test("retryable primary failure resumes the same CAS record and completes", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  const successfulGrade = deps.primaryGraders.law.grade;
  let failOnce = true;
  deps.primaryGraders.law.grade = async (input) => {
    if (failOnce) {
      failOnce = false;
      throw new Error("private-provider-body-must-not-escape");
    }
    return successfulGrade(input);
  };
  await assert.rejects(runS233aAnswerReview(request(), deps), /s233a-retryable:primary_grader/);
  const failedRecord = [...repository.rows.values()][0];
  assert.equal(failedRecord.review.stageStatus.overall, "failed_retryable");
  const completed = await runS233aAnswerReview(request(), deps);
  assert.equal(completed.review.stageStatus.overall, "completed");
  assert.equal(completed.review.reviewRecordVersion > failedRecord.review.reviewRecordVersion, true);
  assert.equal(JSON.stringify(completed).includes("private-provider-body"), false);
});

test("concurrent retries acquire one durable lease and call one primary grader", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  const successfulGrade = deps.primaryGraders.law.grade;
  let failOnce = true;
  deps.primaryGraders.law.grade = async (input) => {
    if (failOnce) {
      failOnce = false;
      throw new Error("private-provider-retry-body");
    }
    return successfulGrade(input);
  };
  await assert.rejects(runS233aAnswerReview(request(), deps), /s233a-retryable:primary_grader/);
  const settled = await Promise.allSettled([
    runS233aAnswerReview(request(), deps),
    runS233aAnswerReview(request(), deps),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = settled.filter((item) => item.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason.message, /s233a-retryable:persistence/);
  assert.equal(counters.primary, 1);
});

test("concurrent duplicate requests converge on one terminal CAS result", async () => {
  const repository = memoryRepository();
  const counters = { primary: 0, critic: 0 };
  const deps = dependencies(repository, ["met", "met", "met"], counters);
  const settled = await Promise.allSettled([
    runS233aAnswerReview(request(), deps),
    runS233aAnswerReview(request(), deps),
  ]);
  const fulfilled = settled.filter((item) => item.status === "fulfilled");
  const rejected = settled.filter((item) => item.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(fulfilled[0].value.review.stageStatus.overall, "completed");
  assert.match(rejected[0].reason.message, /s233a-retryable:persistence/);
  assert.equal([...repository.rows.values()].length, 1);
  assert.equal(counters.primary, 1);
});
