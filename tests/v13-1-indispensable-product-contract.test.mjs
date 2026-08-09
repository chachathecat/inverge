import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const masterPath =
  "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-1-2026-08-10.md";
const decisionPath =
  "docs/decisions/2026-08-10-owner-v13-1-indispensable-product-and-gap-elimination.md";
const contractPath = "config/dabangil-indispensable-product-gap-elimination-v1.json";
const validationPath = "docs/qa/master-plan-v13-1-indispensable-product-validation.md";
const pointerPath = "docs/strategy/ACTIVE-MASTER-PLAN.md";

const master = read(masterPath);
const decision = read(decisionPath);
const contract = JSON.parse(read(contractPath));
const validation = read(validationPath);
const pointer = read(pointerPath);

test("V13.1 is the single proposed active strategy and preserves V13", () => {
  assert.match(master, /single active strategy entry point/);
  assert.match(master, /V13 — mandatory technical baseline/);
  assert.match(pointer, /V13\.1 — single active strategy/);
  assert.match(pointer, /V13 — mandatory technical baseline/);
});

test("MCAL remains a mandatory subordinate follow-up", () => {
  assert.match(master, /MCAL — mandatory V13 follow-up/);
  assert.match(pointer, /Mandatory MCAL follow-up/);
  assert.equal(contract.mandatoryBaselines.length, 2);
});

test("all activation authorities remain false", () => {
  for (const [key, value] of Object.entries(contract.authorizations)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.equal(contract.scope.firstStageRuntimeAuthorized, false);
  assert.equal(contract.scope.otherExamProfileAuthorized, false);
  assert.equal(contract.scope.portableCoreLearnerVisible, false);
});

test("exact answer anchor is required and generic summaries are rejected", () => {
  assert.equal(contract.answerEvidenceAnchor.revisionBound, true);
  assert.equal(contract.answerEvidenceAnchor.genericSummaryIsUsableAnchor, false);
  assert.ok(contract.answerEvidenceAnchor.closedKinds.includes("CALCULATION_STEP"));
  assert.match(master, /AnswerEvidenceAnchorV1/);
});

test("evaluation completion alone cannot create positive learning evidence", () => {
  const gate = contract.successfulPerformanceGate;
  assert.equal(gate.evaluationCompletionAloneCreatesPositiveEvidence, false);
  assert.equal(gate.acceptedOutcomeState, "ACCEPTED_SUCCESS");
  assert.equal(gate.acceptedByPolicyMustEqual, true);
  assert.equal(gate.unresolvedConflictCountMustEqual, 0);
  assert.equal(gate.baseTransferAndD7RequireIndependentOutcomeRecords, true);
  assert.ok(gate.unsafeOutcomeStates.includes("INCORRECT"));
  assert.ok(gate.unsafeOutcomeStates.includes("ZERO_OR_EMPTY"));
  assert.match(decision, /evaluation의 존재·완료·provenance만으로 positive learning evidence/);
  assert.match(validation, /canonical evaluation completed/);
});

test("gap closure requires D+7 verified transfer and timed recurrence", () => {
  assert.equal(contract.gapClosure.sameSessionRepairIsElimination, false);
  assert.equal(contract.gapClosure.d7VerifiedNonSameSurfaceSuccessfulOutcomeRequired, true);
  assert.equal(contract.gapClosure.timedSuccessfulOutcomeRequiredWhenPolicyRequires, true);
  assert.equal(contract.gapClosure.subsequentQualifyingFailureReopens, true);
  assert.equal(contract.hardGates.gapClosedWithoutD7VerifiedTransfer, 0);
});

test("Deduction DNA is learner-private and not a second mastery oracle", () => {
  const dna = contract.recurringDeductionDNA;
  assert.equal(dna.learnerPrivate, true);
  assert.equal(dna.bodylessDerivedProjection, true);
  assert.equal(dna.secondMasteryOracle, false);
  assert.equal(dna.rawBodyAllowed, false);
});

test("Today max three and Full-Day 0..N remain distinct", () => {
  assert.equal(contract.dailyCommand.todayPrimaryTaskMax, 3);
  assert.equal(contract.dailyCommand.executionBlocks, "ZERO_TO_N_WITHIN_AVAILABLE_MINUTES");
  assert.equal(contract.dailyCommand.blockCompletionChangesMastery, false);
  assert.equal(contract.dailyCommand.engagementMetricMaySetPriority, false);
  assert.match(pointer, /Today max 3 \/ Full-Day 0\.\.N/);
});

test("commercial proof requires use, repair, D+1 and voluntary repurchase", () => {
  assert.equal(contract.commercialProof.paymentOnlySufficient, false);
  assert.deepEqual(contract.commercialProof.required, [
    "EXACT_APPROVED_OFFER_PAYMENT",
    "USABLE_REVIEW_COUNT_AT_LEAST_2",
    "DIRECT_REPAIR",
    "D1_INDEPENDENT_SUCCESSFUL_OUTCOME",
    "VOLUNTARY_NEXT_PACK_PURCHASE",
  ]);
  assert.equal(contract.commercialProof.activatesPriceOrCheckout, false);
});

test("stacked dependency on PR 694 is explicit and not self-healing", () => {
  assert.equal(contract.mergeDependency.stackedOnPullRequest, 694);
  assert.equal(contract.mergeDependency.thisContractRepairsPR694, false);
  assert.match(master, /PR #694의 unresolved P1이 닫히기 전에 V13\.1을 main에 병합하지 않는다/);
  assert.match(validation, /does not mutate or resolve PR #694/);
  assert.match(pointer, /The V13\.1 declaration does not repair PR #694/);
});
