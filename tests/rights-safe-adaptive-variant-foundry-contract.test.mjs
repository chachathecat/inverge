import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-rights-safe-adaptive-variant-foundry-v1.json";

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}
async function json(path) {
  return JSON.parse(await text(path));
}

test("C2RA-SOURCE-001 and C2RA-RAW-002 fail closed across every shared route", async () => {
  const contract = await json(CONTRACT);
  const sourceClasses = ["INVERGE_ORIGINAL","RIGHTS_CLEARED_OFFICIAL","CONTRACTED_EXPERT_ORIGINAL","CLEARED_DETERMINISTIC_TEMPLATE","USER_PRIVATE_ONLY","ACADEMY_OR_COMMERCIAL_TEXTBOOK","RIGHTS_UNKNOWN","BLOCKED"];
  const denied = ["ACADEMY_OR_COMMERCIAL_TEXTBOOK","USER_PRIVATE_ONLY","RIGHTS_UNKNOWN","BLOCKED"];
  const routes = ["SHARED_BLUEPRINT_EXTRACTION","SHARED_GENERATION_CONTEXT","SHARED_VARIANT_BANK","CROSS_USER_CACHE_OR_REUSE","SHARED_CALIBRATION_BODY","ANALYTICS_BODY","MODEL_TRAINING_BODY","PAID_DELIVERY"];
  assert.deepEqual(contract.sourcePolicy.sourceClassesExactly, sourceClasses);
  assert.deepEqual(contract.sourcePolicy.hardDeniedSourceClassesExactly, denied);
  assert.deepEqual(contract.sourcePolicy.sharedRoutesExactly, routes);
  for (const sourceClass of denied) {
    const decision = contract.sourcePolicy.sourceEligibility[sourceClass];
    assert.equal(decision.decision, "DENY_ALL_SHARED_ROUTES", sourceClass);
    assert.match(decision.denialCode, /^SOURCE_CLASS_.+_SHARED_USE_DENIED$/);
    assert.deepEqual(decision.routeEligibility, Object.fromEntries(routes.map((route) => [route, false])));
  }
  assert.deepEqual(Object.values(contract.sourcePolicy.rawLearnerContent), [false, false, false, false, false, false, false]);
});

test("C2RA-CONTRACT-003 and C2RA-BANK-004 resolve contracts and separated banks", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(Object.keys(contract.requiredContracts), ["SourceEligibilityDecisionV1","RightsManifestV1","HumanCreativeContributionV1","SkillBlueprintV1","VariantCandidateV1","VariantReleaseArtifactV1","ExposureLedgerV1","BankScarcityEventV1","DisputeAndRetirementV1"]);
  assert.equal(contract.requiredContracts.RightsManifestV1.releaseBlockedWhenMissingOrInvalid, true);
  assert.equal(contract.requiredContracts.VariantCandidateV1.aiSelfPromotionAllowed, false);
  assert.deepEqual(contract.bankModel.progressionExactly, ["DRAFT_CANDIDATE","AUTOMATED_CHECKED","LEARNING_USABLE","TRANSFER_VERIFIED","CALIBRATION_PILOT","CALIBRATED_MEASUREMENT"]);
  assert.deepEqual(contract.bankModel.holdOrTerminalStatesExactly, ["DISPUTED","BLOCKED","STALE","RETIRED"]);
  assert.deepEqual(contract.bankModel.banksExactly, ["LEARNING_BANK", "TRANSFER_BANK", "MEASUREMENT_BANK"]);
  assert.equal(contract.bankModel.separation.LEARNING_BANK.impliesTransferQualification, false);
  assert.equal(contract.bankModel.separation.TRANSFER_BANK.impliesCalibratedMeasurement, false);
  assert.equal(contract.bankModel.aiOutputMaySelfPublish, false);
  assert.equal(contract.bankModel.aiOutputMaySelfVerify, false);
});

test("C2RA-GAP-005 through C2RA-STATE-008 preserve ordered gates and lineage", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(contract.bankFirstGenerationOnGap.stepsExactly, ["SEARCH_ELIGIBLE_BANK_ITEM","ASSIGN_IF_EXACT_SKILL_DIFFICULTY_FAMILY_EXPOSURE_MATCH","RECORD_BODYLESS_BANK_SCARCITY_EVENT_ON_GAP","GENERATE_OFFLINE_BATCH_FOR_PRIORITY_GAPS","REJECT_WITH_CHEAP_GATES_FIRST","ROUTE_SURVIVORS_TO_STRONG_CRITIC_AND_OWNER","RELEASE_TO_LEARNING_BANK_FIRST","PROMOTE_ONLY_FROM_ADDITIONAL_EVIDENCE"]);
  assert.deepEqual(contract.validationCascade.orderExactly, ["SOURCE_AND_RIGHTS","SCHEMA_AND_BLUEPRINT","DETERMINISTIC_AND_SOURCE_VALIDATOR","SIMILARITY_AND_RECONSTRUCTION_FIREWALL","LOW_COST_BLIND_SOLVER","CONDITIONAL_STRONG_CRITIC","OWNER_ADJUDICATION","LEARNER_PILOT_AND_CALIBRATION"]);
  assert.equal(contract.validationCascade.deterministicOrSourceConflictBlocksRelease, true);
  assert.equal(contract.bankFirstGenerationOnGap.realtimeGeneration.permittedUseOnly, "CLEARLY_LABELED_LOW_RISK_GUIDED_PRACTICE");
  for (const [key, value] of Object.entries(contract.bankFirstGenerationOnGap.realtimeGeneration)) {
    if (key !== "permittedUseOnly") assert.equal(value, false, key);
  }
  assert.deepEqual(contract.similarityAndReconstructionFirewall.nearCopyFailureTransformationsExactly, ["NUMBER_ONLY", "NAME_ONLY", "ORDER_ONLY", "WORD_ONLY"]);
  assert.equal(contract.similarityAndReconstructionFirewall.releaseBlockedOnNearCopy, true);
  assert.equal(contract.similarityAndReconstructionFirewall.outputMustNotEnableOriginalReconstruction, true);
  assert.equal(contract.sourcePolicy.similarityReferenceCorpus.secretlyScrapedAcademyFingerprintCorpusAllowed, false);
  assert.equal(contract.disputeRetirementAndLineage.noNewAssignmentInHoldOrTerminalState, true);
  assert.equal(contract.disputeRetirementAndLineage.retirementDoesNotEraseAuditLineage, true);
});

test("C2RA-MATRIX-009 changes no donor row", async () => {
  const [contract, matrix] = await Promise.all([json(CONTRACT), text("docs/qa/wcv-c2-replacement-regression-matrix.md")]);
  const rows = matrix.split(/\r?\n/).filter((line) => /^\| \d+ \|/.test(line));
  assert.equal(rows.length, 21);
  assert.equal(rows.every((row) => row.includes(' | `uncovered` |')), true);
  assert.equal(rows.some((row) => row.includes('C2R-A')), false);
  assert.deepEqual(contract.regressionMatrix.directRowsAssignedToC2RA, []);
  assert.deepEqual(contract.regressionMatrix.rowsChangedByC2RA, []);
});

test("C2RA-AUTH-010 advances only source authority to C2R-B and activates nothing", async () => {
  const [contract, unified, roadmap, agents] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[0].state, "complete_source_only");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[1].state, "authorized_unstarted");
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStage, "C2R-B");
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStageIssue, 714);
  assert.match(roadmap, /soleNextReplacementStage: C2R-B/);
  assert.match(roadmap, /soleNextReplacementStageIssue: 714/);
  assert.match(agents, /current authorized-but-unstarted stage `C2R-B` for Issue #714/);
  assert.equal(Object.values(contract.authorizationBoundary).every((value) => value === false), true);
  assert.equal(contract.decision.runtimeReadinessEstablished, false);
  assert.equal(contract.successor.c2rACompletionEffectiveOnlyAfterExpectedHeadPinnedMergeAndValidatedReceipt, true);
  assert.deepEqual(contract.successor.c2rCPBlockedUntilTerminalValidatedStages, ["C2R-A", "C2R-B"]);
  assert.deepEqual(contract.ownedPathsExactly, ["AGENTS.md","roadmap/active-program.yml","config/dabangil-unified-program-contract.json","config/dabangil-unified-product-multisurface-launch-v1.json","docs/dabangil-unified-program-contract.md","docs/inverge-master-roadmap.md","docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md","docs/strategy/dabangil-rights-safe-adaptive-variant-foundry-v1.md","config/dabangil-rights-safe-adaptive-variant-foundry-v1.json","docs/qa/rights-safe-adaptive-variant-foundry-validation.md","tests/rights-safe-adaptive-variant-foundry-contract.test.mjs","tests/wcv-c2r-structural-recovery-authority.test.mjs","tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs","tests/dabangil-unified-product-multisurface-launch-authority.test.mjs","scripts/run-node-tests.mjs"]);
});
