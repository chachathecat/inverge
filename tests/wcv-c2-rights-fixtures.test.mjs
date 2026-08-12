import assert from "node:assert/strict";
import test from "node:test";

import {
  TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES,
  TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES,
  TRUSTED_REPAIR_INPUT_MODES,
  TRUSTED_REPAIR_SUBJECTS,
  trustedRepairReleaseTransition,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  TRUSTED_REPAIR_FIXTURES,
  TRUSTED_REPAIR_GOLD_CANDIDATES,
  assertTrustedRepairFixtureInventory,
  trustedRepairBankFirstSelection,
  validateTrustedRepairFixtureEligibility,
} from "../lib/review-os/trusted-repair-fixtures.ts";

test("C2 owns exactly 21 rights-safe fixtures and 18 non-adjudicated Gold candidates", () => {
  assert.doesNotThrow(() => assertTrustedRepairFixtureInventory());
  assert.equal(TRUSTED_REPAIR_FIXTURES.length, 21);
  assert.equal(TRUSTED_REPAIR_GOLD_CANDIDATES.length, 18);
  for (const subject of TRUSTED_REPAIR_SUBJECTS) {
    const fixtures = TRUSTED_REPAIR_FIXTURES.filter((item) => item.subject === subject);
    assert.equal(fixtures.length, 7);
    assert.equal(fixtures.filter((item) => item.runtimeSupported).length, 1);
    assert.deepEqual(
      [...new Set(fixtures.map((item) => item.bank))].sort(),
      ["LEARNING", "MEASUREMENT", "TRANSFER"],
    );
  }
  assert.equal(new Set(TRUSTED_REPAIR_FIXTURES.map((item) => item.prompt)).size, 21);
  assert.equal(new Set(TRUSTED_REPAIR_GOLD_CANDIDATES.map((item) => item.candidateId)).size, 18);
  assert.equal(new Set(TRUSTED_REPAIR_GOLD_CANDIDATES.map((item) => item.familyId)).size, 9);
  assert.ok(
    TRUSTED_REPAIR_GOLD_CANDIDATES.every(
      (candidate) =>
        candidate.adjudicationState === "REGRESSION_CANDIDATE_NOT_OWNER_REVIEWED" &&
        candidate.exactAnchorIds.length > 0 &&
        candidate.supportingEvidence.length > 0 &&
        candidate.counterEvidence.length > 0 &&
        candidate.forbiddenFalseGaps.includes("mastery-proven") &&
        candidate.forbiddenFalseGaps.includes("score-improved") &&
        candidate.forbiddenFalseGaps.includes("pass-probability"),
    ),
  );
});

test("every fixture is synthetic, body-training denied, private, and complete in all five input modes", () => {
  for (const fixture of TRUSTED_REPAIR_FIXTURES) {
    assert.deepEqual(validateTrustedRepairFixtureEligibility(fixture), {
      eligible: true,
      reasons: [],
    });
    assert.deepEqual(Object.keys(fixture.editableDrafts).sort(), [...TRUSTED_REPAIR_INPUT_MODES].sort());
    assert.equal(fixture.releaseState, "AUTOMATED_CHECKED");
    assert.equal(fixture.rights.purpose, "owner_test_only");
    assert.equal(fixture.rights.thirdPartyBodyUsed, false);
    assert.equal(fixture.rights.rawBodyTrainingAllowed, false);
    assert.equal(fixture.rights.reconstructionOfDeniedSource, false);
    assert.equal(fixture.rights.nearCopyScore, 0);
    assert.equal(fixture.rights.sharingAllowed, false);
  }
});

test("rights policy fails closed for every denied class and hostile provenance mutation", () => {
  const fixture = structuredClone(TRUSTED_REPAIR_FIXTURES[0]);
  for (const rightsClass of TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES) {
    const hostile = structuredClone(fixture);
    hostile.rights.rightsClass = rightsClass;
    assert.equal(validateTrustedRepairFixtureEligibility(hostile).eligible, false);
  }
  for (const rightsClass of TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES) {
    const eligible = structuredClone(fixture);
    eligible.rights.rightsClass = rightsClass;
    assert.equal(validateTrustedRepairFixtureEligibility(eligible).eligible, true);
  }
  for (const mutation of [
    ["thirdPartyBodyUsed", true],
    ["rawBodyTrainingAllowed", true],
    ["reconstructionOfDeniedSource", true],
    ["nearCopyScore", 0.001],
    ["sharingAllowed", true],
  ]) {
    const hostile = structuredClone(fixture);
    hostile.rights[mutation[0]] = mutation[1];
    assert.equal(validateTrustedRepairFixtureEligibility(hostile).eligible, false);
  }
});

test("bank-first selection never self-promotes a scarce sealed bank", () => {
  for (const subject of TRUSTED_REPAIR_SUBJECTS) {
    const learning = trustedRepairBankFirstSelection({ subject, bank: "LEARNING" });
    assert.equal(learning.kind, "selected");
    for (const bank of ["TRANSFER", "MEASUREMENT"]) {
      const scarcity = trustedRepairBankFirstSelection({ subject, bank });
      assert.equal(scarcity.kind, "scarcity");
      assert.equal(scarcity.event.containsBody, false);
      assert.equal(scarcity.selfPublicationAllowed, false);
      assert.equal(scarcity.selfPromotionAllowed, false);
      assert.equal(scarcity.generationDisposition, "QUARANTINED_AUTOMATED_CHECK_REQUIRED");
    }
  }
});

test("release transitions are deterministic and non-automated promotion is denied", () => {
  assert.equal(trustedRepairReleaseTransition("DRAFT", "automated_checks_passed"), "AUTOMATED_CHECKED");
  assert.equal(trustedRepairReleaseTransition("AUTOMATED_CHECKED", "transfer_qualified"), null);
  assert.equal(trustedRepairReleaseTransition("AUTOMATED_CHECKED", "owner_learning_approved"), "LEARNING_USABLE");
  assert.equal(trustedRepairReleaseTransition("LEARNING_USABLE", "transfer_qualified"), "TRANSFER_QUALIFIED");
  assert.equal(trustedRepairReleaseTransition("TRANSFER_QUALIFIED", "measurement_calibrated"), "MEASUREMENT_CALIBRATED");
  for (const [signal, state] of [["disputed", "DISPUTED"], ["stale", "STALE"], ["blocked", "BLOCKED"], ["retired", "RETIRED"]]) {
    assert.equal(trustedRepairReleaseTransition("AUTOMATED_CHECKED", signal), state);
    const denied = structuredClone(TRUSTED_REPAIR_FIXTURES[0]);
    denied.releaseState = state;
    assert.equal(validateTrustedRepairFixtureEligibility(denied).eligible, false);
  }
});
