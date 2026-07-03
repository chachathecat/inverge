import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
  buildS211LawAnswerReview,
} from "../lib/review-os/s211-law-answer-review-engine.ts";
import {
  PRACTICE_SCORE_RANGE_CAVEAT,
  validateRubricEvidenceReviewContract,
} from "../lib/review-os/rubric-evidence-contract.ts";
import { assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";

const fixturePath = "tests/fixtures/s211-law-answer-review/ready-law-review-input.json";

async function readFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

test("S211 builds a metadata-only law Evidence Review over S205, S207, and S208 gates", async () => {
  const input = await readFixture();
  const result = buildS211LawAnswerReview(input);
  const contract = result.contract;
  const validation = validateRubricEvidenceReviewContract(contract);

  assert.equal(result.engineVersion, S211_LAW_ANSWER_REVIEW_ENGINE_VERSION);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(contract.reviewStatus, "ready");
  assert.equal(contract.subject, "law");
  assert.equal(contract.sourceStatus.learnerAnswer, "learner_confirmed");
  assert.equal(contract.sourceStatus.referencePackage, "verified");
  assert.equal(contract.sourceStatus.officialRules, "verified");
  assert.equal(contract.practiceScoreRange.status, "estimated");
  assert.equal(contract.practiceScoreRange.nonOfficial, true);
  assert.equal(contract.practiceScoreRange.confirmedScore, false);
  assert.equal(contract.practiceScoreRange.passProbability, false);
  assert.equal(contract.practiceScoreRange.passGuarantee, false);
  assert.equal(contract.practiceScoreRange.caveat, PRACTICE_SCORE_RANGE_CAVEAT);
  assert.deepEqual(result.lawEngine.evaluatedDimensionIds, [
    "law_issue_spotting",
    "law_requirement_decomposition",
    "law_rule_mapping",
    "law_subsumption_application",
    "law_conclusion_quality",
  ]);
  assert.deepEqual(contract.rubricDimensions.map((dimension) => dimension.label), [
    "issue_spotting",
    "requirement_decomposition",
    "legal_rule_mapping",
    "subsumption_application_structure",
    "conclusion_quality",
  ]);
  assert.equal(contract.deductionCandidates.every((candidate) => candidate.officialScoreDeduction === false), true);
  assert.equal(contract.deductionCandidates.every((candidate) => candidate.evidenceRefIds.length > 0), true);
  assert.equal(contract.primaryGap.gapType, "law_requirement_decomposition");
  assert.equal(contract.nextAction.actionType, "rewrite");
  assert.equal(result.lawEngine.learnerInstructorBoundary.learnerRouteOnly, true);
  assert.equal(result.lawEngine.learnerInstructorBoundary.instructorRouteSeparated, true);
  assert.equal(result.lawEngine.prohibitedAuthorityClaims.officialGrading, false);
  assert.equal(result.lawEngine.prohibitedAuthorityClaims.officialModelAnswer, false);
  assert.equal(result.lawEngine.prohibitedAuthorityClaims.passProbability, false);
  assertNoRawUserDataInDerived(result.derivedMetadata);
});

test("S211 fails closed when exam-date legal-source verification is unresolved", async () => {
  const input = clone(await readFixture());
  const check = input.lawSourceGate.registry.examDateVersionChecks[0];
  check.legalSourceStatus = "needs_official_verification";
  check.examDateVersionStatus = "needs_official_verification";
  check.currentLawComparison.status = "exam_date_version_unresolved";
  check.currentLawComparison.currentLawClaimAllowed = false;
  check.currentLawComparison.examDateLawClaimAllowed = false;
  check.releaseConfidence.status = "blocked";
  check.releaseConfidence.s211HighConfidenceAllowed = false;
  check.releaseConfidence.s211ReviewAllowed = false;
  input.lawSourceGate.registry.evidenceReviewLinks[0].s205SourceStatus = "needs_verification";
  input.lawSourceGate.registry.evidenceReviewLinks[0].reviewConfidence = "low";

  const result = buildS211LawAnswerReview(input);
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_unverified_source");
  assert.equal(contract.withhold.withheld, true);
  assert.ok(contract.withhold.reasons.includes("official_rule_unverified"));
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(contract.practiceScoreRange.range, null);
  assert.equal(contract.nextAction.actionType, "withhold_until_verified");
  assert.equal(result.lawEngine.lawSourceGateStatus, "withheld");
});

test("S211 requires learner-owned answer evidence before any law review", async () => {
  const input = clone(await readFixture());
  input.learnerAnswerEvidenceRefs = [];

  assert.throws(
    () => buildS211LawAnswerReview(input),
    /s211-learner-answer-evidence-required/,
  );
});

test("S211 withholds law analysis until OCR evidence is confirmed by the learner", async () => {
  const input = clone(await readFixture());
  input.learnerAnswerEvidenceRefs[0].ocrState = "draft_needs_learner_confirmation";
  input.learnerAnswerEvidenceRefs[0].verifiedByLearner = false;

  const result = buildS211LawAnswerReview(input);
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_unconfirmed_ocr");
  assert.equal(contract.sourceStatus.learnerAnswer, "ocr_confirmation_needed");
  assert.equal(contract.nextAction.actionType, "confirm_ocr");
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
});

test("S211 rejects official grading, model-answer, pass-probability, and raw-content shapes", async () => {
  const claimInput = clone(await readFixture());
  claimInput.findings[0].learnerFacingSummary = "official grading score is 80";
  assert.throws(
    () => buildS211LawAnswerReview(claimInput),
    /s211-prohibited-authority-claim/,
  );

  const rawInput = clone(await readFixture());
  rawInput.rawAnswerText = "not allowed in a metadata-only S211 fixture";
  assert.throws(
    () => buildS211LawAnswerReview(rawInput),
    /s211-raw-content-boundary/,
  );
});

test("S211 learner engine refuses instructor or academy surface invocation", async () => {
  const input = clone(await readFixture());
  input.consumer = "instructor";
  input.actorRole = "instructor";

  assert.throws(
    () => buildS211LawAnswerReview(input),
    /s211-learner-instructor-boundary/,
  );
});

test("S211 committed fixture remains metadata-only", async () => {
  const fixture = await readFile(fixturePath, "utf8");
  const forbiddenRawFields = [
    "rawAnswerText",
    "answerText",
    "questionText",
    "problemBody",
    "referenceAnswerText",
    "modelAnswer",
    "rawOcrText",
    "ocrText",
    "sourceExcerpt",
    "providerPayload",
    "instructorComment",
  ];

  for (const field of forbiddenRawFields) {
    assert.equal(fixture.includes(`"${field}"`), false, `fixture must not include ${field}`);
  }
  assert.doesNotMatch(fixture, /official grading|official model answer|pass probability|pass guarantee/i);
});

test("S211 docs and roadmap wiring are present", async () => {
  const docs = await readFile("docs/s211-law-answer-review-engine.md", "utf8");
  const roadmap = await readFile("roadmap/active-program.yml", "utf8");

  for (const phrase of [
    "S211",
    "issue spotting",
    "legal rule mapping",
    "requirement decomposition",
    "subsumption/application",
    "conclusion quality",
    "fail-closed",
    "learner-answer evidence",
    "metadata-only",
    "learner/instructor separation",
  ]) {
    assert.ok(docs.includes(phrase), `missing S211 doc phrase: ${phrase}`);
  }

  assert.match(roadmap, /id: S211[\s\S]*?status: completed/);
  assert.match(roadmap, /id: S212[\s\S]*?status: completed/);
  assert.match(roadmap, /id: S213[\s\S]*?status: completed/);
});
