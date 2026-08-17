import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-c2r-c-t-structural-theory-proof-v1.json";
const MATRIX = "docs/qa/wcv-c2-replacement-regression-matrix.md";
const POLICY = "github_exact_head_pinned_squash_merge_v1";
const THEORY_ROWS = new Map([
  [5, ["PRRT_kwDOSMHn8M6YdyeQ", "C2R-C-T-R05"]],
  [13, ["PRRT_kwDOSMHn8M6Y2Phn", "C2R-C-T-R13"]],
  [16, ["PRRT_kwDOSMHn8M6Y6CKf", "C2R-C-T-R16"]],
  [18, ["PRRT_kwDOSMHn8M6ZJGtr", "C2R-C-T-R18"]],
  [20, ["PRRT_kwDOSMHn8M6ZKl1C", "C2R-C-T-R20"]],
]);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

function matrixRows(source) {
  return new Map(
    source
      .split(/\r?\n/)
      .filter((line) => /^\| \d+ \|/.test(line))
      .map((line) => [Number(line.match(/^\| (\d+) \|/)?.[1]), line.split(" | ")]),
  );
}

test("C2R-C-T post-merge authority selects only authorized-unstarted Law", async () => {
  const [stage, unified, launch, roadmap, agents] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    json("config/dabangil-unified-product-multisurface-launch-v1.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const stages = new Map(recovery.replacementStages.map((item) => [item.id, item]));
  const current = [
    unified.launchConvergenceAmendment.soleNextReplacementStage,
    recovery.authorityGraph.currentReplacementStageId,
    unified.wcvCampaignOverlay.soleNextReplacementStage,
    unified.roadmapContract.soleNextReplacementStageId,
    launch.preservedCurrentAuthority.currentReplacementStageId,
  ];
  assert.deepEqual(current, Array(current.length).fill("C2R-C-L"));
  assert.equal(recovery.status, "c2r_a_b_c_p_and_c_t_complete_c2r_c_l_authorized_unstarted");
  assert.equal(stages.get("C2R-C-T").state, "complete_theory_runtime");
  assert.equal(stages.get("C2R-C-T").coveringPr, 757);
  assert.equal(stages.get("C2R-C-L").state, "authorized_unstarted");
  assert.deepEqual(stages.get("C2R-C-L").dependencies, ["C2R-C-T"]);
  assert.equal(stage.stage.postMergeNextStage, "C2R-C-L");
  assert.match(roadmap, /soleNextReplacementStage: C2R-C-L/);
  assert.match(roadmap, /c2rCTState: complete_theory_runtime/);
  assert.match(roadmap, /c2rCLState: authorized_unstarted/);
  assert.match(agents, /WCV-C2 \/ C2 \/ #717 \/ C2R-C-L \/ #703 \/ authorized_unstarted/);
});

test("C2R-C-T declares exactly five non-effective PR 757 Theory candidates", async () => {
  const [stage, source, unified] = await Promise.all([
    json(CONTRACT),
    text(MATRIX),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const rows = matrixRows(source);
  assert.equal(rows.size, 21);
  for (const [number, [findingThreadId, assertionId]] of THEORY_ROWS) {
    const cells = rows.get(number);
    assert.equal(cells[8], "`candidate_coverage_pending_exact_merge`");
    assert.equal(cells[9], "`tests/wcv-c2r-theory-target-scope-validator.test.mjs`");
    const encoded = cells[10].match(/^`(\{.*\})` \|$/)?.[1];
    assert.ok(encoded, `row ${number} candidate JSON`);
    const declaration = JSON.parse(encoded);
    assert.deepEqual(Object.keys(declaration), [
      "findingThreadId",
      "coveringStage",
      "coveringPrNumber",
      "exactRegressionAssertionId",
      "exactFutureTestPath",
      "inheritedRegressionObligations",
      "receiptPolicyId",
    ]);
    assert.deepEqual(declaration, {
      findingThreadId,
      coveringStage: "C2R-C-T",
      coveringPrNumber: 757,
      exactRegressionAssertionId: assertionId,
      exactFutureTestPath: "tests/wcv-c2r-theory-target-scope-validator.test.mjs",
      inheritedRegressionObligations: [],
      receiptPolicyId: POLICY,
    });
  }
  assert.deepEqual(stage.regressionCoverageCandidate.directRows, [...THEORY_ROWS.keys()]);
  assert.deepEqual(stage.regressionCoverageCandidate.inheritedCommonRows, [1, 4, 6, 8, 11, 14]);
  const coverage = unified.wcvCampaignOverlay.c2StructuralRecovery.coverageProtocol;
  assert.equal(coverage.activeCandidateCoveringPr, 757);
  assert.equal(coverage.activeCandidateStage, "C2R-C-T");
  assert.deepEqual(coverage.activeCandidateRows, [...THEORY_ROWS.keys()]);
  assert.equal(coverage.postMergeUncoveredRowCount, 5);
  assert.equal(coverage.repositoryCandidateDeclaration.candidateDeclarationAloneCreatesEffectiveCoverage, false);
});

test("C2R-C-T machine contract is one complete Theory vertical with independent rollback", async () => {
  const stage = await json(CONTRACT);
  assert.deepEqual(stage.subjectBoundary.implementedSubjectsExactly, [
    "appraisal_practical",
    "appraisal_theory",
  ]);
  assert.equal(stage.subjectBoundary.newSubjectExactly, "appraisal_theory");
  assert.deepEqual(stage.subjectBoundary.deferredSubjectsExactly, ["appraisal_compensation_law"]);
  assert.equal(stage.theoryProof.type, "ScopedPredicateAnchorV1");
  assert.equal(stage.theoryProof.targetScopeId, "theory-target:synthetic-income-approach");
  assert.equal(stage.theoryProof.deterministicValidatorId, "validator:theory-scoped-predicate@1");
  assert.equal(stage.theoryProof.freeFormTextCanCreateVerified, false);
  assert.equal(stage.theoryProof.onlyExactStructuredPassCreatesVerified, true);
  assert.equal(stage.completeOutcomeLayers.safeDeferredBoundary.lawRuntime, false);
  assert.equal(stage.completeOutcomeLayers.safeDeferredBoundary.payment, false);
  assert.equal(stage.completeOutcomeLayers.safeDeferredBoundary.production, false);
  assert.equal(stage.completeOutcomeLayers.independentRollback.killSwitch, "WCV_C2R_C_T_THEORY_ENABLED");
  assert.equal(stage.completeOutcomeLayers.independentRollback.requiresDisablingOrRevertingPractice, false);
  assert.equal(stage.activationBoundary.productionAuthorized, false);
  assert.equal(stage.activationBoundary.remoteMigrationApplyAuthorized, false);
});

test("C2R-C-T owned path manifest is exact and registered", async () => {
  const [stage, runner] = await Promise.all([json(CONTRACT), text("scripts/run-node-tests.mjs")]);
  const paths = stage.ownedPathManifest;
  assert.equal(paths.length, 43);
  assert.equal(new Set(paths).size, paths.length);
  for (const required of [
    CONTRACT,
    "docs/qa/c2r-c-t-structural-theory-proof-validation.md",
    "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql",
    "tests/e2e/c2r-c-t-theory-trusted-repair-runtime.spec.ts",
    "tests/c2r-c-t-theory-runtime-contract.test.mjs",
    "tests/c2r-c-t-theory-authority.test.mjs",
  ]) {
    assert.ok(paths.includes(required), required);
  }
  for (const registered of [
    "tests/wcv-c2r-theory-target-scope-validator.test.mjs",
    "tests/c2r-c-t-theory-runtime-contract.test.mjs",
    "tests/c2r-c-t-theory-authority.test.mjs",
  ]) {
    assert.equal((runner.match(new RegExp(registered.replaceAll(".", "\\."), "g")) ?? []).length, 1);
  }
});
