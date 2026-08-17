import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-c2r-c-l-structural-law-proof-v1.json";
const MATRIX = "docs/qa/wcv-c2-replacement-regression-matrix.md";
const POLICY = "github_exact_head_pinned_squash_merge_v1";
const LAW_ROWS = new Map([
  [3, ["PRRT_kwDOSMHn8M6YdKTb", "C2R-C-L-R03", "tests/wcv-c2r-law-exact-version-validator.test.mjs"]],
  [7, ["PRRT_kwDOSMHn8M6Yhqf6", "C2R-C-L-R07", "tests/wcv-c2r-runtime-preflight.test.mjs"]],
  [15, ["PRRT_kwDOSMHn8M6Y5DLv", "C2R-C-L-R15", "tests/wcv-c2r-law-exact-version-validator.test.mjs"]],
  [17, ["PRRT_kwDOSMHn8M6ZJGtq", "C2R-C-L-R17", "tests/wcv-c2r-law-exact-version-validator.test.mjs"]],
  [21, ["PRRT_kwDOSMHn8M6ZKl1F", "C2R-C-L-R21", "tests/wcv-c2r-law-exact-version-validator.test.mjs"]],
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

test("C2R-C-L remains terminal while the WCV-C3 candidate represents post-merge completion", async () => {
  const [stage, unified, launch, roadmap, agents] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    json("config/dabangil-unified-product-multisurface-launch-v1.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const stages = new Map(recovery.replacementStages.map((item) => [item.id, item]));

  assert.equal(stage.stage.coveringPr, 764);
  assert.equal(stage.stage.candidateRepresentsPostMergeState, true);
  assert.equal(stage.stage.postReceiptNextRoadmapItem, "WCV-C3");
  assert.equal(stage.stage.postReceiptNextCampaign, "C3");
  assert.equal(stage.stage.postReceiptNextIssue, 706);
  assert.equal(recovery.status, "complete_after_expected_head_merge_and_validated_terminal_receipt");
  assert.equal(recovery.wcvC2Complete, true);
  assert.equal(recovery.authorityGraph.currentReplacementStageId, null);
  assert.equal(recovery.authorityGraph.completedTerminalReplacementStageId, "C2R-C-L");
  assert.equal(stages.get("C2R-C-T").state, "complete_theory_runtime");
  assert.equal(stages.get("C2R-C-L").state, "complete_law_runtime");
  assert.equal(stages.get("C2R-C-L").coveringPr, 764);

  assert.equal(unified.launchConvergenceAmendment.soleNextImplementationItem, null);
  assert.equal(unified.launchConvergenceAmendment.soleNextImplementationCampaign, null);
  assert.equal(unified.launchConvergenceAmendment.soleNextReplacementStage, null);
  assert.equal(unified.wcvCampaignOverlay.soleNextImplementationCampaign, null);
  assert.equal(unified.wcvCampaignOverlay.soleNextImplementationLeadIssue, null);
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStage, null);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, null);
  assert.equal(unified.roadmapContract.soleNextImplementationCampaignId, null);
  assert.equal(unified.roadmapContract.soleNextImplementationLeadIssue, null);
  assert.equal(unified.roadmapContract.soleNextReplacementStageId, null);
  assert.equal(launch.preservedCurrentAuthority.completedTerminalReplacementStageId, "C2R-C-L");
  assert.equal(launch.preservedCurrentAuthority.roadmapItemId, "WCV-C3");
  assert.equal(launch.preservedCurrentAuthority.campaignId, "C3");
  assert.equal(launch.preservedCurrentAuthority.recoveryTrackerIssue, 706);
  assert.equal(launch.preservedCurrentAuthority.nextRoadmapItemId, null);
  assert.equal(launch.preservedCurrentAuthority.nextCampaignId, null);
  assert.equal(launch.preservedCurrentAuthority.nextLeadIssue, null);
  assert.match(roadmap, /soleNextImplementationItem: null/);
  assert.match(roadmap, /c2rCLState: complete_law_runtime/);
  assert.match(roadmap, /c2rCLCoveringPr: 764/);
  assert.match(agents, /WCV-C3\/C3\/#706 is the complete durable-learning and daily-command\s+candidate/);
  assert.match(agents, /only after fresh exact-[\s\S]+validated Tracker #717 receipt/);
});

test("C2R-C-L declares exactly five non-effective PR 764 Law candidates", async () => {
  const [stage, source, unified] = await Promise.all([
    json(CONTRACT),
    text(MATRIX),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const rows = matrixRows(source);
  assert.equal(rows.size, 21);
  for (const [number, [findingThreadId, assertionId, path]] of LAW_ROWS) {
    const cells = rows.get(number);
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
    assert.deepEqual(declaration, {
      findingThreadId,
      coveringStage: "C2R-C-L",
      coveringPrNumber: 764,
      exactRegressionAssertionId: assertionId,
      exactFutureTestPath: path,
      inheritedRegressionObligations: [],
      receiptPolicyId: POLICY,
    });
  }
  assert.deepEqual(stage.regressionCoverageCandidate.directRows, [...LAW_ROWS.keys()]);
  assert.deepEqual(stage.regressionCoverageCandidate.inheritedCommonRows, [1, 4, 6, 8, 11, 14]);
  assert.deepEqual(stage.regressionCoverageCandidate.assertionIds, [...LAW_ROWS.values()].map((item) => item[1]));
  const coverage = unified.wcvCampaignOverlay.c2StructuralRecovery.coverageProtocol;
  assert.equal(coverage.activeCandidateCoveringPr, 764);
  assert.equal(coverage.activeCandidateStage, "C2R-C-L");
  assert.deepEqual(coverage.activeCandidateRows, [...LAW_ROWS.keys()]);
  assert.equal(coverage.postMergeUncoveredRowCount, 0);
  assert.equal(coverage.repositoryCandidateDeclaration.candidateDeclarationAloneCreatesEffectiveCoverage, false);
  assert.equal([...rows.values()].filter((cells) => cells[8] === "`candidate_coverage_pending_exact_merge`").length, 21);
});

test("terminal closeout remains receipt-gated and preserves the open Issue 714 allocations", async () => {
  const [stage, unified] = await Promise.all([json(CONTRACT), json("config/dabangil-unified-program-contract.json")]);
  const closeout = stage.terminalCloseout;
  const protocol = unified.wcvCampaignOverlay.c2StructuralRecovery.coverageProtocol;
  assert.deepEqual(closeout.closeAfterValidatedReceipt, [703, 704, 705, 717]);
  assert.equal(closeout.unblockAfterValidatedReceipt, 706);
  assert.equal(closeout.issue714RemainsOpen, true);
  assert.deepEqual(closeout.issue714AllocationsPreserved, ["C3", "C4", "C6"]);
  assert.equal(protocol.terminalC2RCL.issueClosureBeforeReceiptValidationAllowed, false);
  assert.equal(protocol.terminalC2RCL.receiptFailureKeepsIssuesOpenAndC3Blocked, true);
  assert.equal(stage.activationBoundary.productionAuthorized, false);
  assert.equal(stage.activationBoundary.realLearnerAuthorized, false);
  assert.equal(stage.activationBoundary.remoteMigrationApplyAuthorized, false);
});
