import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CHOICE_IDS,
  CONFIDENCE_VALUES,
  ERROR_CAUSES,
  FIRST_STAGE_SUBJECT_IDS,
  FirstStageKernelError,
  beginAttempt as beginAttemptKernel,
  beginIndependentRetry as beginIndependentRetryKernel,
  buildTodayQueue as buildTodayQueueKernel,
  createExamCycleState,
  parseAnswerSubmission,
  parseJsonRejectingDuplicateKeys,
  presentAttemptQuestion as presentAttemptQuestionKernel,
  submitAnswer as submitAnswerKernel,
  validateFirstStageKernelState,
} from "../lib/review-os/first-stage/kernel/index.ts";
import {
  SUBJECT_ADAPTER_SCHEMA_VERSION,
  SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR,
  SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
  createSubjectAdapterRegistry,
} from "../lib/review-os/first-stage/subject-adapter/index.ts";

const root = path.resolve(import.meta.dirname, "..");
const TRUSTED_OWNER_ID = "owner-private-1";
const TRUSTED_CYCLE_DEFINITION_SHA256 =
  "416f767b45b7bb6a5cae52ec72423d640db104cf4d58f003dfe98010103df048";
const contract = JSON.parse(fs.readFileSync(path.join(
  root,
  "config/dabangil-first-stage-common-mcq-kernel-v1.json",
), "utf8"));

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizedSource(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8").replace(/\r\n?/gu, "\n");
}

function sourceDigest(filePath, selection = null) {
  let source = normalizedSource(filePath);
  if (selection) {
    const start = source.indexOf(selection.startMarker);
    const end = source.indexOf(selection.endMarker);
    assert.notEqual(start, -1, `${filePath}: missing start marker`);
    assert.notEqual(end, -1, `${filePath}: missing end marker`);
    assert.equal(source.split("\n").filter((line) => line === selection.startMarker).length, 1);
    assert.equal(source.split("\n").filter((line) => line === selection.endMarker).length, 1);
    assert.ok(start < end, `${filePath}: reversed markers`);
    source = source.slice(start + selection.startMarker.length, end);
  }
  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}

function reference(questionId = "acct-q1", questionVersion = "v1", subjectId = "accounting") {
  return {
    schemaVersion: "first_stage.question_reference.v1",
    questionId,
    questionVersion,
    subjectId,
    examYear: 2026,
    examRound: 37,
    sessionId: "first-2026-session-2",
    questionNumber: questionId.includes("q2") ? 2 : 1,
    choiceCount: 5,
    sourceVersionManifestIds: ["source-manifest-2026-v1"],
    rightsState: "verified_owner_private",
    currentnessState: "verified_exam_date",
  };
}

function conceptIdFor(questionId) {
  if (questionId.includes("q2")) return "accounting-concept-q2";
  return "accounting-concept-q1";
}

function conceptKeys(bindings) {
  return bindings.map((binding) =>
    `${binding.subjectId}:${binding.conceptId}@${binding.conceptVersion}:${binding.role}`);
}

function evidenceReference(evidenceId, character = "a") {
  return {
    schemaVersion: "first_stage.immutable_evidence_reference.v1",
    evidenceId,
    evidenceVersion: "v1",
    evidenceSha256: character.repeat(64),
  };
}

function makeAdapter(options = {}) {
  let retryBuildCalls = 0;
  return {
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: options.adapterId ?? "test-accounting-adapter",
    adapterVersion: "v1",
    subjectId: "accounting",
    assertQuestionReference(value) {
      if (value.subjectId !== "accounting" || !value.questionId.startsWith("acct-")) {
        throw new FirstStageKernelError("adapter_mismatch");
      }
    },
    presentQuestion(value) {
      return {
        schemaVersion: "first_stage.mcq_question_presentation.v1",
        questionReference: value,
        stem: "Owner-private synthetic accounting question.",
        choices: [1, 2, 3, 4, 5].map((choiceId) => ({
          choiceId,
          body: `Synthetic choice ${choiceId}`,
        })),
        sourceStatusLabel: value.rightsState,
        currentnessStatusLabel: value.currentnessState,
        learningReferenceDisclaimer: true,
      };
    },
    evaluateSubmission(input) {
      const selected = input.submission.selectedChoice;
      const forcedDecision = options.forceDecision?.(input);
      const decision = forcedDecision ?? (selected === null
        ? "unanswered"
        : selected === 2 ? "correct" : "incorrect");
      const retryConcept = options.crossConceptOnRetry &&
        input.attempt.kind === "independent_retry";
      const conceptId = retryConcept
        ? "accounting-unrelated-concept"
        : conceptIdFor(input.questionReference.questionId);
      const unreviewed = decision === "unavailable" || decision === "withheld";
      const evidenceEnvelope = {
        schemaVersion: "first_stage.attempt_evidence_envelope.v1",
        attemptId: input.attempt.attemptId,
        submissionSha256: input.submissionSha256,
        questionId: input.questionReference.questionId,
        questionVersion: input.questionReference.questionVersion,
        questionReferenceSha256: digest(input.questionReference),
        subjectId: input.questionReference.subjectId,
        adapterId: this.adapterId,
        adapterVersion: this.adapterVersion,
        officialKeyReference: unreviewed ? null : evidenceReference("official-key-receipt", "1"),
        choiceSetReference: unreviewed ? null : evidenceReference("choice-set-receipt", "2"),
        sourceReference: evidenceReference("source-receipt", "3"),
        versionDecisionReference: evidenceReference("version-decision-receipt", "4"),
        rightsDecisionReference: evidenceReference("rights-decision-receipt", "5"),
        reviewedFeedback: {
          schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
          state: decision === "unavailable"
            ? "not_emitted_unavailable"
            : decision === "withheld" ? "withheld_rights_or_version" : "reviewed_available",
          receiptReference: unreviewed ? null : evidenceReference("reviewed-feedback-receipt", "6"),
          reviewerIdentity: unreviewed ? null : "owner-approved-reviewer-1",
          reviewerClass: unreviewed ? null : "owner_approved_personal_feedback_reviewer",
          modelAlone: false,
        },
      };
      options.mutateEvidence?.(evidenceEnvelope, input);
      const evaluation = {
        schemaVersion: "first_stage.attempt_evaluation.v1",
        decision,
        errorCause: decision === "incorrect" ? "C" : null,
        conceptBindings: unreviewed ? null : [{
          schemaVersion: "first_stage.concept_binding.v1",
          conceptId,
          conceptVersion: "v1",
          subjectId: "accounting",
          role: "primary",
        }],
        biggestGapCode: unreviewed ? null : decision === "correct" ? "confirm_later" : "concept_gap",
        nextActionCode: unreviewed ? null : decision === "correct"
          ? "independent_retry_later" : "review_then_retry",
        retryDisposition: unreviewed ? null : decision === "incorrect"
          ? "retry_now" : "review_then_retry",
        reviewAfterMs: unreviewed ? null : decision === "incorrect" ? 0 : 60_000,
        evaluationPolicyVersion: options.bindReviewTaskId
          ? `test-accounting-evaluation-${input.attempt.reviewTaskId ?? "none"}`
          : "test-accounting-evaluation-v1",
        evidenceEnvelope,
      };
      options.mutateEvaluation?.(evaluation, input);
      return evaluation;
    },
    buildIndependentRetry(input) {
      retryBuildCalls += 1;
      const number = input.priorRetries.length + 1;
      const candidateReference = options.reuseCycleQuestion
        ? reference("acct-q2", "v1")
        : options.reuseSourceQuestionWithVersionBump
          ? reference(input.sourceQuestionReference.questionId, "v2")
        : reference(`${input.sourceQuestionReference.questionId}-retry-${number}${
          options.unstableRetryCandidate ? `-${retryBuildCalls}` : ""
        }`, "v1");
      const lineageReceipt = {
          schemaVersion: "first_stage.independent_retry_lineage_receipt.v1",
          receiptId: `retry-lineage-${input.sourceQuestionReference.questionId}-${number}`,
          receiptVersion: "v1",
          adapterId: this.adapterId,
          adapterVersion: this.adapterVersion,
          subjectId: this.subjectId,
          sourceQuestionId: input.sourceQuestionReference.questionId,
          sourceQuestionVersion: input.sourceQuestionReference.questionVersion,
          sourceQuestionReferenceSha256: digest(input.sourceQuestionReference),
          variantQuestionId: candidateReference.questionId,
          variantQuestionVersion: candidateReference.questionVersion,
          variantQuestionReferenceSha256: digest(candidateReference),
          targetConceptBindingKeys: conceptKeys(input.reviewTask.conceptBindings),
          priorRetryCount: input.priorRetries.length,
          decision: "verified_variant_for_independent_retry",
      };
      options.mutateLineage?.(lineageReceipt, input);
      return {
        schemaVersion: "first_stage.independent_retry_candidate.v1",
        questionReference: candidateReference,
        lineageReceipt,
      };
    },
  };
}

function beginAttempt(state, input, registry) {
  return beginAttemptKernel(state, {
    ...input,
    trustedOwnerId: TRUSTED_OWNER_ID,
    trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
  }, registry);
}

function submitAnswer(state, input, registry) {
  return submitAnswerKernel(state, {
    ...input,
    trustedOwnerId: TRUSTED_OWNER_ID,
    trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
  }, registry);
}

function beginIndependentRetry(state, input, registry) {
  return beginIndependentRetryKernel(
    state,
    {
      ...input,
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
    },
    registry,
  );
}

function presentAttemptQuestion(state, attemptId, registry) {
  return presentAttemptQuestionKernel(
    state,
    attemptId,
    TRUSTED_OWNER_ID,
    TRUSTED_CYCLE_DEFINITION_SHA256,
    registry,
  );
}

function buildTodayQueue(
  state,
  input,
  registry = createSubjectAdapterRegistry([makeAdapter()]),
) {
  return buildTodayQueueKernel(
    state,
    {
      ...input,
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
    },
    registry,
  );
}

function draft(choice, options = {}) {
  const eliminatedChoiceIds = options.eliminatedChoiceIds ?? [];
  const steps = [{ sequence: 1, kind: "read_stem", atElapsedMs: 0, choiceId: null }];
  for (const eliminated of eliminatedChoiceIds) {
    steps.push({
      sequence: steps.length + 1,
      kind: "eliminate_choice",
      atElapsedMs: Math.min(options.traceElapsedMs ?? 1_000, steps.length * 100),
      choiceId: eliminated,
    });
  }
  if (options.answerChanged) {
    steps.push({
      sequence: steps.length + 1,
      kind: "select_answer",
      atElapsedMs: Math.min(options.traceElapsedMs ?? 1_000, 500),
      choiceId: options.previousChoice,
    });
    steps.push({
      sequence: steps.length + 1,
      kind: "change_answer",
      atElapsedMs: options.traceElapsedMs ?? 1_000,
      choiceId: choice,
    });
  } else if (choice !== null) {
    steps.push({
      sequence: steps.length + 1,
      kind: "select_answer",
      atElapsedMs: options.traceElapsedMs ?? 1_000,
      choiceId: choice,
    });
  }
  return {
    schemaVersion: "first_stage.answer_submission.v1",
    selectedChoice: choice,
    confidence: options.confidence ?? "medium",
    answerChanged: options.answerChanged ?? false,
    previousChoice: options.previousChoice ?? null,
    eliminatedChoiceIds,
    workTrace: { schemaVersion: "first_stage.work_trace.v1", steps },
  };
}

function initialState() {
  return createExamCycleState({
    examCycleId: "cycle-owner-today-1",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1"), reference("acct-q2")],
  });
}

function expectKernelCode(fn, code) {
  assert.throws(fn, (error) => error instanceof FirstStageKernelError && error.code === code);
}

function validateReachableFoundationFreezeResult(receipt, executeGit = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim()) {
  assert.equal(
    executeGit(["show", "-s", "--format=%T", receipt.resultingMainSha]),
    receipt.resultingMainTree,
  );
  executeGit(["merge-base", "--is-ancestor", receipt.resultingMainSha, "HEAD"]);
  assert.equal(
    executeGit(["rev-list", "--parents", "-n", "1", receipt.resultingMainSha])
      .split(/\s+/u).length,
    2,
    "receipt must bind a single-parent squash result",
  );
}

test("freezes one exact SubjectAdapter descriptor and Lane B path manifest", () => {
  function assertDeepFrozen(value) {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const nested of Object.values(value)) assertDeepFrozen(nested);
  }
  const digestBeforeMutationAttempts = digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  assertDeepFrozen(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  for (const vocabulary of [
    FIRST_STAGE_SUBJECT_IDS,
    CHOICE_IDS,
    CONFIDENCE_VALUES,
    ERROR_CAUSES,
  ]) assertDeepFrozen(vocabulary);
  assert.throws(() => {
    SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR.methods[0].name = "mutated";
  }, TypeError);
  assert.throws(() => {
    SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR.invariants.push("mutated");
  }, TypeError);
  assert.throws(() => { FIRST_STAGE_SUBJECT_IDS[0] = "mutated"; }, TypeError);
  assert.throws(() => { CHOICE_IDS.push(6); }, TypeError);
  assert.equal(digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR), digestBeforeMutationAttempts);
  assert.deepEqual(contract.subjectAdapterFreeze.interfaceDescriptor, SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  assert.equal(digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR), SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  assert.equal(contract.subjectAdapterFreeze.interfaceDigest, SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  for (const binding of SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR.transitiveSourceBindings) {
    assert.equal(binding.normalization, "utf8_lf");
    assert.equal(
      sourceDigest(binding.path, binding.selection ?? null),
      binding.sha256,
      `${binding.path}: adapter-facing type source drift`,
    );
  }
  for (const mutate of [
    (value) => value.typeShapes.QuestionReference.pop(),
    (value) => value.typeShapes.AnswerSubmission.pop(),
    (value) => value.vocabularies.confidence.pop(),
    (value) => value.vocabularies.retryDispositions.reverse(),
  ]) {
    const hostile = structuredClone(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
    mutate(hostile);
    assert.notEqual(digest(hostile), SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  }
  assert.equal(contract.subjectAdapterFreeze.productionAdapterImplementationsIncluded, 0);
  assert.deepEqual(contract.ownedPathManifest, [
    "app/api/review-os/first-stage/kernel/route.ts",
    "app/(owner-first-stage)/app/first-stage/page.tsx",
    "components/review-os/first-stage-mcq-loop.tsx",
    "config/dabangil-first-stage-common-mcq-kernel-v1.json",
    "docs/exec-plans/active/inverge-owner-study-os.md",
    "lib/review-os/first-stage/kernel/domain.ts",
    "lib/review-os/first-stage/kernel/index.ts",
    "lib/review-os/first-stage/kernel/mcq-kernel.ts",
    "lib/review-os/first-stage/kernel/today-queue.ts",
    "lib/review-os/first-stage/subject-adapter/index.ts",
    "lib/review-os/first-stage/subject-adapter/subject-adapter.ts",
    "scripts/run-node-tests.mjs",
    "tests/first-stage-common-mcq-kernel.test.mjs",
    "tests/s232f2-access-availability.test.mjs",
    "tests/wcv-c3-foundation-freeze.test.mjs",
  ]);
  const runner = fs.readFileSync(path.join(root, "scripts/run-node-tests.mjs"), "utf8");
  assert.equal(
    runner.match(/"tests\/first-stage-common-mcq-kernel\.test\.mjs"/gu)?.length,
    1,
  );
  assert.equal(contract.deferredIntegration.sharedTestRunnerRegistration,
    "installed_by_lane_b_serial_integration_gate");
  assert.deepEqual(contract.validatedFoundationFreezeReceipt, {
    pullRequest: 838,
    reviewedHeadSha: "2106d370b2725d3f03923db3a6d279e94778bd6d",
    reviewedTree: "313056e25e3296d1546e909389eb0ad014da5a66",
    resultingMainSha: "aded1d711c837aa6e93470d3b31bd75907452996",
    resultingMainTree: "313056e25e3296d1546e909389eb0ad014da5a66",
    liveGitHubValidated: true,
    exactHeadPinnedSquashMerged: true,
    requiredChecksPassed: true,
    actionableP0P1P2: [0, 0, 0],
    unresolvedActionableThreads: 0,
    focusedResultingTreeTests: "8/8",
    governedIssuesClosed: [706, 707, 708, 781, 837],
    issue714RemainsOpenWithAllocations: ["C4", "C6"],
    remoteSupabaseMutationCount: 0,
    productionMutationCount: 0,
  });
  const receipt = contract.validatedFoundationFreezeReceipt;
  validateReachableFoundationFreezeResult(receipt);
  assert.equal(receipt.reviewedTree, receipt.resultingMainTree);
  const changedPaths = execFileSync("git", [
    "diff", "--name-only", contract.validatedFoundationFreezeReceipt.resultingMainSha,
  ], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/gu).filter(Boolean).sort();
  assert.deepEqual(changedPaths, [...contract.ownedPathManifest].sort());
});

test("validates the Foundation Freeze receipt without resolving its transient source commit", () => {
  const receipt = contract.validatedFoundationFreezeReceipt;
  const expectedCalls = [
    ["show", "-s", "--format=%T", receipt.resultingMainSha],
    ["merge-base", "--is-ancestor", receipt.resultingMainSha, "HEAD"],
    ["rev-list", "--parents", "-n", "1", receipt.resultingMainSha],
  ];
  const outputs = [
    receipt.resultingMainTree,
    "",
    `${receipt.resultingMainSha} ${"f".repeat(40)}`,
  ];
  const calls = [];
  validateReachableFoundationFreezeResult(receipt, (args) => {
    calls.push(args);
    return outputs[calls.length - 1];
  });
  assert.deepEqual(calls, expectedCalls);
  assert.equal(calls.some((args) => args.includes(receipt.reviewedHeadSha)), false);
});

test("derives elapsed time from trusted server instants and rejects client clock authority", () => {
  const parsed = parseAnswerSubmission(draft(2, { traceElapsedMs: 1_000 }), {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:01:00.000Z",
  });
  assert.deepEqual(parsed.elapsedTime, { milliseconds: 60_000, bucket: "60000_119999" });
  assert.equal(parsed.submittedAt, "2026-08-25T00:01:00.000Z");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    elapsedTime: { milliseconds: 1, bucket: "0_29999" },
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T01:00:00.000Z",
  }), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission(draft(2), {
    attemptStartedAt: "2026-02-31T00:00:00.000Z",
    submittedAt: "2026-03-01T00:00:00.000Z",
  }), "invalid_input");
});

test("rejects duplicate JSON keys and empty or contradictory WorkTrace progression", () => {
  expectKernelCode(() => parseJsonRejectingDuplicateKeys('{"action":"today_queue","action":"other"}'), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    workTrace: { schemaVersion: "first_stage.work_trace.v1", steps: [] },
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
  const changed = draft(3, { answerChanged: true, previousChoice: 1, traceElapsedMs: 1_000 });
  changed.previousChoice = 2;
  expectKernelCode(() => parseAnswerSubmission(changed, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    eliminatedChoiceIds: [1],
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
});

test("runs initial attempt, due review, independent retry, concept state, and Today Queue", () => {
  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let state = initialState();
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:00.000Z",
  }).items.map((item) => item.kind), ["new_question", "new_question"]);

  state = beginAttempt(state, {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  assert.equal(presentAttemptQuestion(state, "attempt-q1-initial", registry).choices.length, 5);
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:01.000Z",
  }).items.map((item) => item.kind), ["active_attempt", "new_question"]);

  state = submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:10.000Z",
    submission: draft(1),
  }, registry);
  assert.equal(state.attempts[0].reviewTaskId, "review-q1-initial");
  assert.equal(state.attempts[0].evaluation.evidenceEnvelope.adapterVersion, "v1");
  assert.match(state.attempts[0].evaluation.evidenceEnvelope.submissionSha256, /^[0-9a-f]{64}$/u);
  assert.equal(
    state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.reviewerClass,
    "owner_approved_personal_feedback_reviewer",
  );
  assert.equal(state.reviewTasks[0].status, "pending");
  assert.equal(state.conceptStates[0].state, "independent_retry_due");
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:10.000Z",
  }).items.map((item) => item.kind), ["independent_retry", "new_question"]);

  state = beginIndependentRetry(state, {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:10.000Z",
  }, registry);
  assert.equal(state.independentRetries[0].lineageReceipt.adapterVersion, "v1");
  assert.deepEqual(
    state.independentRetries[0].lineageReceipt.targetConceptBindingKeys,
    ["accounting:accounting-concept-q1@v1:primary"],
  );
  state = submitAnswer(state, {
    expectedRevision: 4,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:25.000Z",
    submission: draft(2),
  }, registry);
  assert.equal(state.reviewTasks[0].status, "completed");
  assert.equal(state.independentRetries[0].outcome, "succeeded");
  assert.equal(state.conceptStates[0].state, "independent_retry_recorded");
  assert.equal(state.conceptStates[0].masteryClaim, false);

  state = beginAttempt(state, {
    expectedRevision: 5,
    attemptId: "attempt-q2-initial",
    questionId: "acct-q2",
    trustedStartedAt: "2026-08-25T00:00:25.000Z",
  }, registry);
  state = submitAnswer(state, {
    expectedRevision: 6,
    attemptId: "attempt-q2-initial",
    reviewTaskId: "review-q2-initial",
    trustedSubmittedAt: "2026-08-25T00:00:35.000Z",
    submission: draft(2),
  }, registry);
  assert.equal(state.examCycle.state, "completed");
  const beforeDue = buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:35.000Z",
  });
  assert.equal(beforeDue.items.length, 0);
  assert.equal(beforeDue.notYetDueReviewCount, 1);
  assert.equal(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:01:35.000Z",
  }).items[0].reviewTaskId, "review-q2-initial");
});

test("fails closed on adapter absence, malformed registration, ambiguity, stale state, and chronology", () => {
  const empty = createSubjectAdapterRegistry();
  expectKernelCode(() => beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, empty), "adapter_unavailable");
  expectKernelCode(() => createSubjectAdapterRegistry([{
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: "bad-adapter",
    adapterVersion: "v1",
    subjectId: "accounting",
  }]), "adapter_mismatch");
  const extraAdapter = makeAdapter({ adapterId: "extra-adapter" });
  extraAdapter.mutableBehavior = {};
  expectKernelCode(() => createSubjectAdapterRegistry([extraAdapter]), "adapter_mismatch");
  const mutableAdapter = makeAdapter({ adapterId: "snapshot-adapter" });
  const snapshotRegistry = createSubjectAdapterRegistry([mutableAdapter]);
  assert.equal(Object.isFrozen(mutableAdapter), true);
  assert.equal(Object.isFrozen(snapshotRegistry.require("accounting")), true);
  assert.throws(() => { mutableAdapter.adapterVersion = "v2"; }, TypeError);
  expectKernelCode(() => createExamCycleState({
    examCycleId: "ambiguous-cycle",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1", "v1"), reference("acct-q1", "v2")],
  }), "invalid_input");
  expectKernelCode(() => createExamCycleState({
    examCycleId: "extra-cycle",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1")],
    extra: true,
  }), "invalid_input");

  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let state = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:10.000Z",
  }, registry);
  expectKernelCode(() => beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-extra",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
    extra: true,
  }, registry), "invalid_input");
  expectKernelCode(() => buildTodayQueue(initialState(), {
    trustedGeneratedAt: "2026-08-25T00:00:00.000Z",
    extra: true,
  }), "invalid_input");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:11.000Z",
    submission: draft(1),
  }, registry), "stale_state");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:09.000Z",
    submission: draft(1),
  }, registry), "invalid_transition");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:11.000Z",
    submission: draft(1),
    extra: true,
  }, registry), "invalid_input");
});

test("exact-validates and canonicalizes every rehydrated aggregate before any consumer", () => {
  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let persisted = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-rehydrate-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  persisted = submitAnswer(persisted, {
    expectedRevision: 2,
    attemptId: "attempt-rehydrate-initial",
    reviewTaskId: "review-rehydrate-initial",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(1),
  }, registry);

  const cloned = structuredClone(persisted);
  const canonical = validateFirstStageKernelState(
    cloned,
    TRUSTED_OWNER_ID,
    TRUSTED_CYCLE_DEFINITION_SHA256,
    registry,
  );
  assert.notEqual(canonical, cloned);
  assert.deepEqual(canonical, cloned);
  (function assertDeepFrozen(value) {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const nested of Object.values(value)) assertDeepFrozen(nested);
  })(canonical);

  function assertEveryConsumerRejects(hostile, label) {
    const expectedRevision = Number.isSafeInteger(hostile.revision) ? hostile.revision : 3;
    expectKernelCode(() => beginAttemptKernel(hostile, {
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
      expectedRevision,
      attemptId: `attempt-hostile-${label}`,
      questionId: "acct-q2",
      trustedStartedAt: "2026-08-25T00:00:03.000Z",
    }, registry), "invalid_input");
    expectKernelCode(() => submitAnswerKernel(hostile, {
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
      expectedRevision,
      attemptId: "missing-hostile-attempt",
      reviewTaskId: "missing-hostile-review",
      trustedSubmittedAt: "2026-08-25T00:00:03.000Z",
      submission: draft(1),
    }, registry), "invalid_input");
    expectKernelCode(() => beginIndependentRetryKernel(hostile, {
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
      expectedRevision,
      reviewTaskId: "review-rehydrate-initial",
      independentRetryId: `retry-hostile-${label}`,
      retryAttemptId: `retry-attempt-hostile-${label}`,
      trustedStartedAt: "2026-08-25T00:00:03.000Z",
    }, registry), "invalid_input");
    expectKernelCode(() => presentAttemptQuestionKernel(
      hostile,
      "missing-hostile-attempt",
      TRUSTED_OWNER_ID,
      TRUSTED_CYCLE_DEFINITION_SHA256,
      registry,
    ), "invalid_input");
    expectKernelCode(() => buildTodayQueueKernel(hostile, {
      trustedOwnerId: TRUSTED_OWNER_ID,
      trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
      trustedGeneratedAt: "2026-08-25T00:00:03.000Z",
    }, registry), "invalid_input");
  }

  function rewriteStoredCycleDefinitionDigest(state) {
    state.examCycle.definitionSha256 = digest({
      schemaVersion: state.examCycle.schemaVersion,
      examCycleId: state.examCycle.examCycleId,
      ownerId: state.examCycle.ownerId,
      mode: state.examCycle.mode,
      questionReferences: state.examCycle.questionReferences,
    });
  }

  const aggregateMutations = [
    ["top-schema", (state) => { state.schemaVersion = "hostile.schema"; }],
    ["top-extra", (state) => { state.extra = true; }],
    ["top-missing", (state) => { delete state.independentRetries; }],
    ["revision", (state) => { state.revision += 10; }],
    ["cycle-schema", (state) => { state.examCycle.schemaVersion = "hostile.cycle"; }],
    ["cycle-owner", (state) => { state.examCycle.ownerId = "other-owner"; }],
    ["cycle-extra", (state) => { state.examCycle.extra = true; }],
    ["cycle-definition", (state) => { state.examCycle.definitionSha256 = "0".repeat(64); }],
    ["cycle-mode", (state) => { state.examCycle.mode = "full_day"; }],
    ["cycle-mode-coordinated", (state) => {
      state.examCycle.mode = "full_day";
      rewriteStoredCycleDefinitionDigest(state);
    }],
    ["cycle-state", (state) => { state.examCycle.state = "completed"; }],
    ["cycle-start", (state) => { state.examCycle.startedAt = "2026-08-25T00:00:01.000Z"; }],
    ["cycle-complete", (state) => { state.examCycle.completedAt = "2026-08-25T00:00:02.000Z"; }],
    ["cycle-reference", (state) => {
      state.examCycle.questionReferences.push(reference("acct-q1", "v2"));
    }],
    ["cycle-reference-coordinated", (state) => {
      state.examCycle.questionReferences[1] = reference("acct-q3");
      rewriteStoredCycleDefinitionDigest(state);
    }],
    ["concept-schema", (state) => { state.conceptStates[0].schemaVersion = "hostile.concept"; }],
    ["concept-binding", (state) => { state.conceptStates[0].binding.conceptId = "hostile-concept"; }],
    ["concept-state", (state) => { state.conceptStates[0].state = "unobserved"; }],
    ["concept-last", (state) => { state.conceptStates[0].lastAttemptId = "fake-attempt"; }],
    ["concept-evidence", (state) => { state.conceptStates[0].evidenceAttemptIds.push("fake-attempt"); }],
    ["concept-time", (state) => { state.conceptStates[0].updatedAt = "2026-08-25T00:00:01.000Z"; }],
    ["concept-mastery", (state) => { state.conceptStates[0].masteryClaim = true; }],
    ["concept-extra", (state) => { state.conceptStates[0].extra = true; }],
    ["concept-duplicate", (state) => { state.conceptStates.push(structuredClone(state.conceptStates[0])); }],
    ["concept-missing", (state) => { state.conceptStates = []; }],
  ];
  for (const [label, mutate] of aggregateMutations) {
    const hostile = structuredClone(persisted);
    mutate(hostile);
    assertEveryConsumerRejects(hostile, label);
  }

  const active = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-active-one",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  const twoActive = structuredClone(active);
  twoActive.attempts.push({
    ...structuredClone(twoActive.attempts[0]),
    attemptId: "attempt-active-two",
    questionReference: reference("acct-q2"),
  });
  twoActive.revision = 3;
  assertEveryConsumerRejects(twoActive, "two-active");

  const duplicateInitial = structuredClone(persisted);
  duplicateInitial.attempts.push({
    ...structuredClone(duplicateInitial.attempts[0]),
    attemptId: "attempt-duplicate-initial",
    reviewTaskId: null,
    startedAt: "2026-08-25T00:00:03.000Z",
    state: "in_progress",
    submission: null,
    evaluation: null,
  });
  duplicateInitial.revision = 4;
  assertEveryConsumerRejects(duplicateInitial, "duplicate-initial");

  const orphanRetry = structuredClone(persisted);
  orphanRetry.attempts.push({
    schemaVersion: "first_stage.attempt.v1",
    attemptId: "attempt-orphan-retry",
    examCycleId: orphanRetry.examCycle.examCycleId,
    questionReference: reference("acct-orphan-retry"),
    kind: "independent_retry",
    sourceAttemptId: "attempt-rehydrate-initial",
    reviewTaskId: "review-rehydrate-initial",
    exposureState: "verified_variant",
    assistanceLevel: "none",
    startedAt: "2026-08-25T00:00:03.000Z",
    state: "in_progress",
    submission: null,
    evaluation: null,
  });
  orphanRetry.revision = 4;
  assertEveryConsumerRejects(orphanRetry, "orphan-retry");

  expectKernelCode(() => beginAttemptKernel(initialState(), {
    trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
    expectedRevision: 1,
    attemptId: "attempt-missing-owner",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry), "invalid_input");
  expectKernelCode(() => beginAttemptKernel(initialState(), {
    trustedOwnerId: "other-owner",
    trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
    expectedRevision: 1,
    attemptId: "attempt-wrong-owner",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry), "invalid_input");
  expectKernelCode(() => beginAttemptKernel(initialState(), {
    trustedOwnerId: TRUSTED_OWNER_ID,
    trustedExamCycleDefinitionSha256: "0".repeat(64),
    expectedRevision: 1,
    attemptId: "attempt-wrong-cycle-definition",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry), "invalid_input");
  expectKernelCode(() => buildTodayQueueKernel(initialState(), {
    trustedOwnerId: TRUSTED_OWNER_ID,
    trustedExamCycleDefinitionSha256: TRUSTED_CYCLE_DEFINITION_SHA256,
    trustedGeneratedAt: "2026-08-25T00:00:00.000Z",
  }, createSubjectAdapterRegistry()), "adapter_unavailable");

  const rehydrationContract = contract.domainContract.rehydratedStateValidation;
  for (const invariant of [
    "runsBeforeTodayQueueDerivation",
    "topLevelStateAndExamCycleParsedExactly",
    "examCycleImmutableDefinitionSha256Revalidated",
    "independentlyTrustedExamCycleDefinitionSha256RequiredByEveryConsumer",
    "trustedOwnerIdBoundOnEveryReadAndMutation",
    "validatedStateCanonicalizedAndDeepFrozenBeforeConsumption",
    "allCycleReferencesRequireTheirRegisteredAdapterBeforeConsumption",
    "revisionDerivedFromAttemptBeginsAndSubmissions",
    "cycleLifecycleAndTimestampsDerivedFromValidatedAttempts",
    "oneInitialAttemptPerCycleQuestion",
    "maximumOneActiveAttemptGlobally",
    "oneRetryRecordPerIndependentRetryAttempt",
    "conceptStatesRebuiltFromValidatedAttemptTaskRetryHistory",
    "retryStartPreservesLatestCompletedConceptEvidenceProvenance",
  ]) assert.equal(rehydrationContract[invariant], true, invariant);
  assert.equal(contract.domainContract.conceptState.unobservedRepresentedByAbsenceNotPersistedRow, true);
  assert.equal(contract.domainContract.conceptState.statesExactly.includes("unobserved"), false);
});

test("starting a later retry never regresses completed concept evidence provenance", () => {
  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let state = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-provenance-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  state = submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-provenance-initial",
    reviewTaskId: "review-provenance",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(1),
  }, registry);
  state = beginIndependentRetry(state, {
    expectedRevision: 3,
    reviewTaskId: "review-provenance",
    independentRetryId: "retry-provenance-one",
    retryAttemptId: "attempt-provenance-retry-one",
    trustedStartedAt: "2026-08-25T00:00:03.000Z",
  }, registry);
  assert.equal(state.conceptStates[0].lastAttemptId, "attempt-provenance-initial");
  assert.deepEqual(state.conceptStates[0].evidenceAttemptIds, ["attempt-provenance-initial"]);
  state = submitAnswer(state, {
    expectedRevision: 4,
    attemptId: "attempt-provenance-retry-one",
    reviewTaskId: "review-provenance",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(1),
  }, registry);
  assert.equal(state.conceptStates[0].lastAttemptId, "attempt-provenance-retry-one");
  assert.deepEqual(state.conceptStates[0].evidenceAttemptIds, [
    "attempt-provenance-initial",
    "attempt-provenance-retry-one",
  ]);
  state = beginIndependentRetry(state, {
    expectedRevision: 5,
    reviewTaskId: "review-provenance",
    independentRetryId: "retry-provenance-two",
    retryAttemptId: "attempt-provenance-retry-two",
    trustedStartedAt: "2026-08-25T00:00:04.000Z",
  }, registry);
  assert.equal(state.conceptStates[0].state, "independent_retry_due");
  assert.equal(state.conceptStates[0].lastAttemptId, "attempt-provenance-retry-one");
  assert.deepEqual(state.conceptStates[0].evidenceAttemptIds, [
    "attempt-provenance-initial",
    "attempt-provenance-retry-one",
  ]);
  validateFirstStageKernelState(
    structuredClone(state),
    TRUSTED_OWNER_ID,
    TRUSTED_CYCLE_DEFINITION_SHA256,
    registry,
  );
});

test("keeps unreviewed independent retries active without consuming retry authority", () => {
  let retryDecision = "unavailable";
  const registry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: (input) => input.attempt.kind === "independent_retry"
      ? retryDecision
      : undefined,
  })]);
  let state = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-outage-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  state = submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-outage-initial",
    reviewTaskId: "review-outage",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(1),
  }, registry);
  state = beginIndependentRetry(state, {
    expectedRevision: 3,
    reviewTaskId: "review-outage",
    independentRetryId: "retry-outage-one",
    retryAttemptId: "attempt-outage-retry-one",
    trustedStartedAt: "2026-08-25T00:00:03.000Z",
  }, registry);

  const activeSnapshot = canonicalJson(state);
  const activeVariant = structuredClone(state.independentRetries[0].questionReference);
  for (const [decision, submittedAt] of [
    ["unavailable", "2026-08-25T00:00:04.000Z"],
    ["withheld", "2026-08-25T00:00:05.000Z"],
    ["unavailable", "2026-08-25T00:00:06.000Z"],
  ]) {
    retryDecision = decision;
    expectKernelCode(() => submitAnswer(state, {
      expectedRevision: 4,
      attemptId: "attempt-outage-retry-one",
      reviewTaskId: "review-outage",
      trustedSubmittedAt: submittedAt,
      submission: draft(1),
    }, registry), "invalid_transition");
    assert.equal(canonicalJson(state), activeSnapshot);
    assert.equal(state.revision, 4);
    assert.equal(state.independentRetries.length, 1);
    assert.deepEqual(state.independentRetries[0].questionReference, activeVariant);
    assert.equal(state.independentRetries[0].lineageReceipt.priorRetryCount, 0);
    assert.equal(state.independentRetries[0].outcome, "active");
    assert.equal(state.attempts.at(-1).state, "in_progress");
    assert.equal(state.reviewTasks[0].status, "retry_active");
    assert.deepEqual(state.conceptStates[0].evidenceAttemptIds, ["attempt-outage-initial"]);
  }

  const queueKinds = buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:06.000Z",
  }, registry).items.map((item) => item.kind);
  assert.deepEqual(queueKinds, ["active_attempt", "new_question"]);
  assert.equal(queueKinds.includes("independent_retry"), false);
  expectKernelCode(() => beginIndependentRetry(state, {
    expectedRevision: 4,
    reviewTaskId: "review-outage",
    independentRetryId: "retry-outage-two",
    retryAttemptId: "attempt-outage-retry-two",
    trustedStartedAt: "2026-08-25T00:00:06.000Z",
  }, registry), "invalid_transition");

  for (const decision of ["unavailable", "withheld"]) {
    retryDecision = decision;
    const hostile = structuredClone(state);
    const retryAttempt = hostile.attempts.at(-1);
    const submission = parseAnswerSubmission(draft(1), {
      attemptStartedAt: retryAttempt.startedAt,
      submittedAt: "2026-08-25T00:00:07.000Z",
    });
    const preEvaluationAttempt = {
      ...structuredClone(retryAttempt),
      state: "in_progress",
      submission: null,
      evaluation: null,
    };
    const evaluationInput = {
      schemaVersion: "first_stage.subject_evaluation_input.v1",
      questionReference: retryAttempt.questionReference,
      attempt: preEvaluationAttempt,
      submission,
      submissionSha256: digest(submission),
    };
    retryAttempt.state = "evaluated";
    retryAttempt.submission = submission;
    retryAttempt.evaluation = registry.require("accounting").evaluateSubmission(evaluationInput);
    hostile.independentRetries[0].completedAt = submission.submittedAt;
    hostile.independentRetries[0].outcome = "failed";
    hostile.reviewTasks[0].status = "pending";
    hostile.revision = 5;

    for (const consume of [
      () => validateFirstStageKernelState(
        hostile,
        TRUSTED_OWNER_ID,
        TRUSTED_CYCLE_DEFINITION_SHA256,
        registry,
      ),
      () => buildTodayQueue(hostile, {
        trustedGeneratedAt: "2026-08-25T00:00:08.000Z",
      }, registry),
      () => presentAttemptQuestion(hostile, "attempt-outage-retry-one", registry),
      () => beginAttempt(hostile, {
        expectedRevision: 5,
        attemptId: `attempt-after-hostile-${decision}`,
        questionId: "acct-q2",
        trustedStartedAt: "2026-08-25T00:00:08.000Z",
      }, registry),
      () => submitAnswer(hostile, {
        expectedRevision: 5,
        attemptId: "attempt-outage-retry-one",
        reviewTaskId: "review-outage",
        trustedSubmittedAt: "2026-08-25T00:00:08.000Z",
        submission: draft(2),
      }, registry),
      () => beginIndependentRetry(hostile, {
        expectedRevision: 5,
        reviewTaskId: "review-outage",
        independentRetryId: `retry-after-hostile-${decision}`,
        retryAttemptId: `attempt-retry-after-hostile-${decision}`,
        trustedStartedAt: "2026-08-25T00:00:08.000Z",
      }, registry),
    ]) expectKernelCode(consume, "invalid_input");
  }

  retryDecision = undefined;
  state = submitAnswer(state, {
    expectedRevision: 4,
    attemptId: "attempt-outage-retry-one",
    reviewTaskId: "review-outage",
    trustedSubmittedAt: "2026-08-25T00:00:07.000Z",
    submission: draft(2),
  }, registry);
  assert.equal(state.revision, 5);
  assert.equal(state.independentRetries.length, 1);
  assert.equal(state.independentRetries[0].independentRetryId, "retry-outage-one");
  assert.deepEqual(state.independentRetries[0].questionReference, activeVariant);
  assert.equal(state.independentRetries[0].outcome, "succeeded");
  assert.equal(state.attempts.at(-1).attemptId, "attempt-outage-retry-one");
  assert.equal(state.reviewTasks[0].status, "completed");

  assert.equal(contract.domainContract.reviewTask.unreviewedRetryCannotFailReopenOrCompleteTask, true);
  assert.equal(contract.domainContract.independentRetry.withheldOrUnavailableEvaluationRejectsTransition, true);
  assert.equal(contract.domainContract.independentRetry.withheldOrUnavailableEvaluationPreservesActiveAttemptAndVariant, true);
  assert.equal(contract.domainContract.independentRetry.withheldOrUnavailableEvaluationConsumesNoRevisionOrLineage, true);
  assert.equal(contract.domainContract.rehydratedStateValidation.completedRetryRequiresReviewedEvaluation, true);
});

test("rejects rehydrated retry evidence for concepts outside the ReviewTask targets", () => {
  const sourceRegistry = createSubjectAdapterRegistry([makeAdapter()]);
  let persisted = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-cross-rehydrate-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, sourceRegistry);
  persisted = submitAnswer(persisted, {
    expectedRevision: 2,
    attemptId: "attempt-cross-rehydrate-initial",
    reviewTaskId: "review-cross-rehydrate",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(1),
  }, sourceRegistry);
  persisted = beginIndependentRetry(persisted, {
    expectedRevision: 3,
    reviewTaskId: "review-cross-rehydrate",
    independentRetryId: "retry-cross-rehydrate",
    retryAttemptId: "attempt-cross-rehydrate-retry",
    trustedStartedAt: "2026-08-25T00:00:03.000Z",
  }, sourceRegistry);
  persisted = submitAnswer(persisted, {
    expectedRevision: 4,
    attemptId: "attempt-cross-rehydrate-retry",
    reviewTaskId: "review-cross-rehydrate",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, sourceRegistry);
  assert.equal(persisted.reviewTasks[0].status, "completed");
  assert.equal(persisted.conceptStates[0].state, "independent_retry_recorded");

  const hostile = structuredClone(persisted);
  hostile.attempts.at(-1).evaluation.conceptBindings[0].conceptId =
    "accounting-unrelated-concept";
  const crossConceptRegistry = createSubjectAdapterRegistry([makeAdapter({
    crossConceptOnRetry: true,
  })]);
  for (const consume of [
    () => validateFirstStageKernelState(
      hostile,
      TRUSTED_OWNER_ID,
      TRUSTED_CYCLE_DEFINITION_SHA256,
      crossConceptRegistry,
    ),
    () => buildTodayQueue(hostile, {
      trustedGeneratedAt: "2026-08-25T00:00:05.000Z",
    }, crossConceptRegistry),
    () => presentAttemptQuestion(
      hostile,
      "attempt-cross-rehydrate-retry",
      crossConceptRegistry,
    ),
    () => beginAttempt(hostile, {
      expectedRevision: 5,
      attemptId: "attempt-after-cross-rehydrate",
      questionId: "acct-q2",
      trustedStartedAt: "2026-08-25T00:00:05.000Z",
    }, crossConceptRegistry),
    () => submitAnswer(hostile, {
      expectedRevision: 5,
      attemptId: "attempt-cross-rehydrate-retry",
      reviewTaskId: "review-cross-rehydrate",
      trustedSubmittedAt: "2026-08-25T00:00:05.000Z",
      submission: draft(2),
    }, crossConceptRegistry),
    () => beginIndependentRetry(hostile, {
      expectedRevision: 5,
      reviewTaskId: "review-cross-rehydrate",
      independentRetryId: "retry-after-cross-rehydrate",
      retryAttemptId: "attempt-retry-after-cross-rehydrate",
      trustedStartedAt: "2026-08-25T00:00:05.000Z",
    }, crossConceptRegistry),
  ]) expectKernelCode(consume, "invalid_input");

  assert.equal(
    contract.domainContract.rehydratedStateValidation
      .completedRetryEvaluationConceptBindingsExactlyEqualReviewTaskTargets,
    true,
  );
});

test("rejects blank-as-correct, cycle-reused retry, cross-concept closure, and duplicate persisted lineage", () => {
  const blankCorrectRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "correct",
  })]);
  let blankState = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-blank",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, blankCorrectRegistry);
  expectKernelCode(() => submitAnswer(blankState, {
    expectedRevision: 2,
    attemptId: "attempt-blank",
    reviewTaskId: "review-blank",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(null),
  }, blankCorrectRegistry), "adapter_mismatch");

  function dueState(registry) {
    let state = beginAttempt(initialState(), {
      expectedRevision: 1,
      attemptId: "attempt-q1-initial",
      questionId: "acct-q1",
      trustedStartedAt: "2026-08-25T00:00:00.000Z",
    }, registry);
    return submitAnswer(state, {
      expectedRevision: 2,
      attemptId: "attempt-q1-initial",
      reviewTaskId: "review-q1-initial",
      trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
      submission: draft(1),
    }, registry);
  }

  const reuseRegistry = createSubjectAdapterRegistry([makeAdapter({ reuseCycleQuestion: true })]);
  expectKernelCode(() => beginIndependentRetry(dueState(reuseRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, reuseRegistry), "adapter_mismatch");

  const versionBumpReuseRegistry = createSubjectAdapterRegistry([makeAdapter({
    reuseSourceQuestionWithVersionBump: true,
  })]);
  expectKernelCode(() => beginIndependentRetry(dueState(versionBumpReuseRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-version-bump",
    retryAttemptId: "attempt-q1-retry-version-bump",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, versionBumpReuseRegistry), "adapter_mismatch");

  const collidingReceiptRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateLineage: (receipt) => { receipt.receiptId = "cycle-owner-today-1"; },
  })]);
  expectKernelCode(() => beginIndependentRetry(dueState(collidingReceiptRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, collidingReceiptRegistry), "invalid_input");

  const crossRegistry = createSubjectAdapterRegistry([makeAdapter({ crossConceptOnRetry: true })]);
  let crossState = beginIndependentRetry(dueState(crossRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, crossRegistry);
  expectKernelCode(() => submitAnswer(crossState, {
    expectedRevision: 4,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, crossRegistry), "adapter_mismatch");

  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  const exactInputRegistry = createSubjectAdapterRegistry([makeAdapter({ bindReviewTaskId: true })]);
  const exactInputRetry = beginIndependentRetry(dueState(exactInputRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-exact-input",
    retryAttemptId: "attempt-retry-exact-input",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, exactInputRegistry);
  assert.equal(exactInputRetry.revision, 4);
  assert.equal(presentAttemptQuestion(
    exactInputRetry,
    "attempt-retry-exact-input",
    exactInputRegistry,
  ).questionReference.questionId, "acct-q1-retry-1");
  const unstableRegistry = createSubjectAdapterRegistry([makeAdapter({
    unstableRetryCandidate: true,
  })]);
  const unstableRetry = beginIndependentRetry(dueState(unstableRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-unstable",
    retryAttemptId: "attempt-retry-unstable",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, unstableRegistry);
  expectKernelCode(() => presentAttemptQuestion(
    unstableRetry,
    "attempt-retry-unstable",
    unstableRegistry,
  ), "invalid_input");
  const pending = dueState(registry);
  for (const mutate of [
    (state) => { state.reviewTasks[0].dueAt = "2026-08-25T00:00:01.000Z"; },
    (state) => { state.reviewTasks[0].questionReference.sessionId = "hostile-session"; },
    (state) => { state.reviewTasks[0].conceptBindings[0].conceptId = "hostile-concept"; },
    (state) => { state.reviewTasks[0].sourceAttemptId = "hostile-source-attempt"; },
  ]) {
    const hostile = structuredClone(pending);
    mutate(hostile);
    expectKernelCode(() => beginIndependentRetry(hostile, {
      expectedRevision: hostile.revision,
      reviewTaskId: "review-q1-initial",
      independentRetryId: "independent-retry-hostile-pending",
      retryAttemptId: "attempt-hostile-pending",
      trustedStartedAt: "2026-08-25T00:00:02.000Z",
    }, registry), "invalid_input");
  }
  const persisted = beginIndependentRetry(pending, {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, registry);
  expectKernelCode(() => beginIndependentRetry(dueState(registry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-extra",
    retryAttemptId: "attempt-retry-extra",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
    extra: true,
  }, registry), "invalid_input");
  const clone = structuredClone(persisted);
  clone.independentRetries.push({
    ...structuredClone(clone.independentRetries[0]),
    independentRetryId: "independent-retry-duplicate",
    retryAttemptId: "attempt-retry-duplicate",
  });
  expectKernelCode(() => submitAnswer(clone, {
    expectedRevision: clone.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
  const extraReceipt = structuredClone(persisted);
  extraReceipt.independentRetries[0].lineageReceipt.extra = true;
  expectKernelCode(() => submitAnswer(extraReceipt, {
    expectedRevision: extraReceipt.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
  const collidingReload = structuredClone(persisted);
  collidingReload.independentRetries[0].lineageReceipt.receiptId = "review-q1-initial";
  expectKernelCode(() => submitAnswer(collidingReload, {
    expectedRevision: collidingReload.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
  for (const mutate of [
    (state) => { state.independentRetries[0].sourceAttemptId = "attempt-q2-initial"; },
    (state) => { state.independentRetries[0].retryAttemptId = "attempt-q1-initial"; },
    (state) => { state.independentRetries[0].questionReference.sessionId = "hostile-session"; },
    (state) => { state.reviewTasks[0].questionReference.questionNumber = 2; },
    (state) => { state.attempts.at(-1).sourceAttemptId = "hostile-source-attempt"; },
    (state) => { state.attempts[0].evaluation = null; },
    (state) => {
      state.attempts.at(-1).submission = structuredClone(state.attempts[0].submission);
      state.attempts.at(-1).evaluation = structuredClone(state.attempts[0].evaluation);
    },
    (state) => {
      state.independentRetries[0].adapterId = "hostile-adapter";
      state.independentRetries[0].adapterVersion = "hostile-version";
      state.independentRetries[0].lineageReceipt.adapterId = "hostile-adapter";
      state.independentRetries[0].lineageReceipt.adapterVersion = "hostile-version";
    },
    (state) => {
      state.independentRetries[0].startedAt = "2026-08-25T00:00:01.000Z";
      state.attempts.at(-1).startedAt = "2026-08-25T00:00:01.000Z";
    },
    (state) => {
      const reused = structuredClone(state.attempts[0].questionReference);
      state.independentRetries[0].questionReference = structuredClone(reused);
      state.attempts.at(-1).questionReference = structuredClone(reused);
      state.independentRetries[0].lineageReceipt.variantQuestionId = reused.questionId;
      state.independentRetries[0].lineageReceipt.variantQuestionVersion = reused.questionVersion;
      state.independentRetries[0].lineageReceipt.variantQuestionReferenceSha256 = digest(reused);
    },
    (state) => { state.independentRetries[0].extra = true; },
  ]) {
    const hostile = structuredClone(persisted);
    mutate(hostile);
    expectKernelCode(() => submitAnswer(hostile, {
      expectedRevision: hostile.revision,
      attemptId: "attempt-q1-retry-1",
      reviewTaskId: "review-q1-initial",
      trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
      submission: draft(2),
    }, registry), "invalid_input");
  }
  const unavailableRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "unavailable",
  })]);
  let unavailable = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-unavailable-dangling",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, unavailableRegistry);
  unavailable = submitAnswer(unavailable, {
    expectedRevision: 2,
    attemptId: "attempt-unavailable-dangling",
    reviewTaskId: "review-unavailable-unused",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(1),
  }, unavailableRegistry);
  const dangling = structuredClone(unavailable);
  dangling.attempts[0].reviewTaskId = "review-dangling";
  expectKernelCode(() => beginAttempt(dangling, {
    expectedRevision: dangling.revision,
    attemptId: "attempt-after-dangling",
    questionId: "acct-q2",
    trustedStartedAt: "2026-08-25T00:00:03.000Z",
  }, unavailableRegistry), "invalid_input");
});

test("binds reviewed feedback/key/source evidence and withholds without emitting review authority", () => {
  function started(registry, suffix) {
    return beginAttempt(initialState(), {
      expectedRevision: 1,
      attemptId: `attempt-evidence-${suffix}`,
      questionId: "acct-q1",
      trustedStartedAt: "2026-08-25T00:00:00.000Z",
    }, registry);
  }
  function submit(state, registry, suffix) {
    return submitAnswer(state, {
      expectedRevision: 2,
      attemptId: `attempt-evidence-${suffix}`,
      reviewTaskId: `review-evidence-${suffix}`,
      trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
      submission: draft(1),
    }, registry);
  }

  const wrongDigestRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.submissionSha256 = "0".repeat(64); },
  })]);
  expectKernelCode(() => submit(started(wrongDigestRegistry, "digest"),
    wrongDigestRegistry, "digest"), "adapter_mismatch");

  const missingKeyRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.officialKeyReference = null; },
  })]);
  expectKernelCode(() => submit(started(missingKeyRegistry, "key"),
    missingKeyRegistry, "key"), "adapter_mismatch");

  const modelRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.reviewedFeedback.modelAlone = true; },
  })]);
  expectKernelCode(() => submit(started(modelRegistry, "model"),
    modelRegistry, "model"), "adapter_mismatch");

  const illegalWithheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
    mutateEvidence: (envelope) => {
      envelope.reviewedFeedback = {
        schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
        state: "reviewed_available",
        receiptReference: evidenceReference("illegal-reviewed-feedback", "7"),
        reviewerIdentity: "owner-approved-reviewer-1",
        reviewerClass: "owner_approved_personal_feedback_reviewer",
        modelAlone: false,
      };
    },
  })]);
  expectKernelCode(() => submit(started(illegalWithheldRegistry, "illegal-withheld"),
    illegalWithheldRegistry, "illegal-withheld"), "adapter_mismatch");

  const leakedWithheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
    mutateEvaluation: (value) => {
      value.conceptBindings = [{
        schemaVersion: "first_stage.concept_binding.v1",
        conceptId: "leaked-reviewed-concept",
        conceptVersion: "v1",
        subjectId: "accounting",
        role: "primary",
      }];
    },
  })]);
  expectKernelCode(() => submit(started(leakedWithheldRegistry, "leaked-withheld"),
    leakedWithheldRegistry, "leaked-withheld"), "adapter_mismatch");

  const withheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
  })]);
  for (const decision of ["withheld", "unavailable"]) {
    const malformedRegistry = createSubjectAdapterRegistry([makeAdapter({
      forceDecision: () => decision,
    })]);
    for (const [index, reviewTaskId] of [null, "", {}, 7].entries()) {
      const suffix = `malformed-${decision}-${index}`;
      expectKernelCode(() => submitAnswer(started(malformedRegistry, suffix), {
        expectedRevision: 2,
        attemptId: `attempt-evidence-${suffix}`,
        reviewTaskId,
        trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
        submission: draft(1),
      }, malformedRegistry), "invalid_input");
    }
  }
  const withheld = submit(started(withheldRegistry, "withheld"),
    withheldRegistry, "withheld");
  const evaluation = withheld.attempts[0].evaluation;
  assert.equal(evaluation.decision, "withheld");
  assert.equal(evaluation.evidenceEnvelope.officialKeyReference, null);
  assert.deepEqual(evaluation.evidenceEnvelope.reviewedFeedback, {
    schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
    state: "withheld_rights_or_version",
    receiptReference: null,
    reviewerIdentity: null,
    reviewerClass: null,
    modelAlone: false,
  });
  assert.equal(evaluation.errorCause, null);
  assert.equal(evaluation.conceptBindings, null);
  assert.equal(evaluation.biggestGapCode, null);
  assert.equal(evaluation.nextActionCode, null);
  assert.equal(evaluation.retryDisposition, null);
  assert.equal(evaluation.reviewAfterMs, null);
  assert.equal(withheld.attempts[0].reviewTaskId, null);
  assert.deepEqual(withheld.reviewTasks, []);
  assert.deepEqual(withheld.conceptStates, []);
  assert.deepEqual(withheld.independentRetries, []);
  assert.deepEqual(buildTodayQueue(withheld, {
    trustedGeneratedAt: "2026-08-25T00:00:02.000Z",
  }, withheldRegistry).items.map((item) => item.kind), ["new_question"]);

  const unavailableRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "unavailable",
  })]);
  const unavailable = submit(started(unavailableRegistry, "unavailable"),
    unavailableRegistry, "unavailable");
  assert.equal(unavailable.attempts[0].evaluation.decision, "unavailable");
  assert.equal(unavailable.attempts[0].evaluation.conceptBindings, null);
  assert.equal(
    unavailable.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.state,
    "not_emitted_unavailable",
  );
  assert.deepEqual(unavailable.reviewTasks, []);
  assert.deepEqual(unavailable.conceptStates, []);
  assert.deepEqual(unavailable.independentRetries, []);
});

test("keeps API/UI Owner-only, default-off, no-store, adapter-empty, and non-activating", () => {
  const route = fs.readFileSync(path.join(root,
    "app/api/review-os/first-stage/kernel/route.ts"), "utf8");
  const page = fs.readFileSync(path.join(root,
    "app/(owner-first-stage)/app/first-stage/page.tsx"), "utf8");
  const component = fs.readFileSync(path.join(root,
    "components/review-os/first-stage-mcq-loop.tsx"), "utf8");
  for (const source of [route, page]) {
    assert.match(source, /INVERGE_OWNER_FIRST_STAGE|FIRST_STAGE_FEATURE_FLAG/u);
    assert.match(source, /ALPHA_ADMIN_EMAILS/u);
    assert.match(source, /notFound|not_found/u);
  }
  assert.match(route, /private, no-store/u);
  assert.match(route, /createSubjectAdapterRegistry\(\)/u);
  assert.match(route, /first_stage\.kernel_availability\.v1/u);
  assert.match(route, /first_stage\.today_queue_availability\.v1/u);
  assert.match(route, /mediaType !== "application\/json"/u);
  assert.match(route, /new TextEncoder\(\)\.encode\(rawBody\)\.byteLength/u);
  assert.doesNotMatch(route, /startsWith\("application\/json"\)/u);
  assert.doesNotMatch(route, /submitAnswer|beginAttempt|clientKernelState/u);
  assert.match(component, /학습 효능, 합격 가능성/u);
  assert.equal(contract.runtimeBoundary.defaultOff, true);
  assert.equal(contract.runtimeBoundary.ownerOnly, true);
  assert.equal(contract.runtimeBoundary.productionDenied, true);
  assert.equal(contract.runtimeBoundary.registeredSubjectAdapters.length, 0);
  assert.equal(contract.runtimeBoundary.remoteSupabaseMutation, false);
  assert.equal(contract.runtimeBoundary.productionMutation, false);
  assert.equal(contract.runtimeBoundary.ownerRoutePhysicalPathExactly,
    "app/(owner-first-stage)/app/first-stage/page.tsx");
  assert.equal(contract.runtimeBoundary.ownerRouteParentLayoutIsolation, "root_layout_only");
  assert.equal(contract.runtimeBoundary.genericReviewOsParentLayoutInherited, false);
  assert.equal(contract.runtimeBoundary.genericReviewOsAccessInvokedBeforeOwnerGuard, false);
  assert.equal(contract.runtimeBoundary.authorizedOwnerPageRendersShellAfterSpecializedGuard, true);
  assert.equal(fs.existsSync(path.join(root, "app/app/first-stage/page.tsx")), false,
    "the Owner route must not inherit the generic Review OS parent layout");
  assert.doesNotMatch(page,
    /getReviewOsServerContext|ensureAccess|includeProfile|includeUsage/u);
  const deniedIndex = page.lastIndexOf("notFound()");
  const ownerShellIndex = page.indexOf("<ReviewOsAppShell email={email}>");
  const loopIndex = page.indexOf("<FirstStageMcqLoop />");
  assert.ok(ownerShellIndex > deniedIndex, "the learner shell must render only after Owner access");
  assert.ok(loopIndex > ownerShellIndex, "the MCQ loop must render inside the authorized Owner shell");
  const queueSource = fs.readFileSync(path.join(root,
    "lib/review-os/first-stage/kernel/today-queue.ts"), "utf8");
  assert.doesNotMatch(queueSource, /localeCompare/u);
});
