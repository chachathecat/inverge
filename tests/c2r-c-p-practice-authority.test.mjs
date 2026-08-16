import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const MATRIX = "docs/qa/wcv-c2-replacement-regression-matrix.md";
const DECISION = "docs/decisions/2026-08-17-owner-c2r-c-p-practice-trusted-repair.md";
const CONTRACT = "config/dabangil-c2r-c-p-practice-trusted-repair-v1.json";
const POLICY = "github_exact_head_pinned_squash_merge_v1";
const CANDIDATES = new Map([
  [1, ["C2R-C-P-R01", "tests/c2r-c-p-practice-runtime-contract.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [2, ["C2R-C-P-R02", "tests/c2r-c-p-practice-trusted-repair.test.mjs", []]],
  [4, ["C2R-C-P-R04", "tests/c2r-c-p-practice-trusted-repair.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [6, ["C2R-C-P-R06", "tests/c2r-c-p-practice-trusted-repair.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [8, ["C2R-C-P-R08/R11/R14", "tests/c2r-c-p-practice-runtime-contract.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [9, ["C2R-C-P-R09", "tests/c2r-c-p-practice-trusted-repair.test.mjs", []]],
  [10, ["C2R-C-P-R10", "tests/c2r-c-p-practice-trusted-repair.test.mjs", []]],
  [11, ["C2R-C-P-R11", "tests/c2r-c-p-practice-runtime-contract.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [12, ["C2R-C-P-R12", "tests/c2r-c-p-practice-trusted-repair.test.mjs", []]],
  [14, ["C2R-C-P-R08/R11/R14", "tests/c2r-c-p-practice-runtime-contract.test.mjs", ["C2R-C-T", "C2R-C-L"]]],
  [19, ["C2R-C-P-R19", "tests/c2r-c-p-practice-trusted-repair.test.mjs", []]],
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

test("C2R-C-P authority selects only C2R-C-T after protected Practice completion", async () => {
  const [unified, launch, roadmap, agents] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    json("config/dabangil-unified-product-multisurface-launch-v1.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const stages = new Map(recovery.replacementStages.map((stage) => [stage.id, stage]));
  const current = [
    unified.launchConvergenceAmendment.soleNextReplacementStage,
    recovery.authorityGraph.currentReplacementStageId,
    unified.wcvCampaignOverlay.soleNextReplacementStage,
    unified.roadmapContract.soleNextReplacementStageId,
    launch.preservedCurrentAuthority.currentReplacementStageId,
  ];
  assert.deepEqual(current, Array(current.length).fill("C2R-C-T"));
  assert.equal(stages.get("C2R-C-P").state, "complete_practice_runtime");
  assert.equal(stages.get("C2R-C-P").coveringPr, 749);
  assert.equal(stages.get("C2R-C-T").state, "authorized_unstarted");
  assert.equal(stages.get("C2R-C-L").state, "queued_dependency_blocked");
  assert.match(roadmap, /soleNextReplacementStage: C2R-C-T/);
  assert.match(roadmap, /c2rCPState: complete_practice_runtime/);
  assert.match(roadmap, /c2rCTState: authorized_unstarted/);
  assert.match(agents, /WCV-C2 \/ C2 \/ #717 \/ C2R-C-T \/ #703 \/ authorized_unstarted/);
  assert.ok(agents.indexOf(DECISION) < agents.indexOf("docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md"));
});

test("C2R-C-P declares exactly 11 non-effective PR 749 regression candidates", async () => {
  const [source, unified] = await Promise.all([
    text(MATRIX),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const rows = matrixRows(source);
  assert.equal(rows.size, 21);
  for (const [number, cells] of rows) {
    const candidate = CANDIDATES.get(number);
    if (!candidate) {
      assert.equal(cells[8], "`uncovered`");
      assert.equal(cells[10], "`none` |");
      continue;
    }
    const [assertionId, path, inherited] = candidate;
    assert.equal(cells[8], "`candidate_coverage_pending_exact_merge`");
    assert.equal(cells[9], `\`${path}\``);
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
    assert.equal(declaration.coveringStage, "C2R-C-P");
    assert.equal(declaration.coveringPrNumber, 749);
    assert.equal(declaration.exactRegressionAssertionId, assertionId);
    assert.equal(declaration.exactFutureTestPath, path);
    assert.deepEqual(declaration.inheritedRegressionObligations, inherited);
    assert.equal(declaration.receiptPolicyId, POLICY);
    assert.equal("reviewedHeadSha" in declaration, false);
    assert.equal("mergeCommitSha" in declaration, false);
  }
  const coverage = unified.wcvCampaignOverlay.c2StructuralRecovery.coverageProtocol;
  assert.equal(coverage.activeCandidateCoveringPr, 749);
  assert.deepEqual(coverage.activeCandidateRows, [...CANDIDATES.keys()]);
  assert.equal(coverage.postMergeUncoveredRowCount, 10);
  assert.equal(coverage.repositoryCandidateDeclaration.candidateDeclarationAloneCreatesEffectiveCoverage, false);
});

test("C2R-C-P preserves terminal issue and Production gates", async () => {
  const [stage, unified, decision] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text(DECISION),
  ]);
  const rules = unified.wcvCampaignOverlay.c2StructuralRecovery.dependencyRules;
  assert.deepEqual(stage.subjectBoundary.implementedSubjectsExactly, ["appraisal_practical"]);
  assert.equal(stage.subjectBoundary.deferredSubjectRuntimeExists, false);
  assert.equal(stage.activationBoundary.flagDefault, false);
  assert.equal(stage.activationBoundary.productionAuthorized, false);
  assert.equal(rules.intermediateSubjectStagesMayCloseIssues703To705, false);
  assert.equal(rules.issue703ClosureRequiresTerminalReplacementStage, "C2R-C-L");
  assert.match(decision, /no remote Supabase migration\/RLS\/Storage apply, Production change/i);
  assert.match(decision, /Issues #703,\s+#704 and #705 remain open/);
});

test("C2R-C-P machine contract preserves the authoritative learner episode order", async () => {
  const stage = await json(CONTRACT);
  assert.deepEqual(stage.episode.phases, [
    "CAPTURE_REVISION",
    "METACOGNITIVE_PREDICTION",
    "INDEPENDENT_COMMIT",
    "LEARNER_SELF_DIAGNOSIS",
    "SERVER_DIAGNOSIS",
    "REPAIR_PATH_SELECTION",
    "SMALLEST_SCAFFOLD",
    "INDEPENDENT_RECONSTRUCTION",
    "SAME_SESSION_APPLICATION",
    "TYPED_VALIDATION",
    "CONTINUATION_DECISION",
  ]);
});

test("C2R-C-P authority test is registered exactly once", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  assert.equal((runner.match(/tests\/c2r-c-p-practice-authority\.test\.mjs/g) ?? []).length, 1);
});
