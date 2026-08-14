import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";

const DECISION =
  "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
const MATRIX =
  "docs/qa/wcv-c2-replacement-regression-matrix.md";
const FOCUSED_TEST =
  "tests/wcv-c2r-structural-recovery-authority.test.mjs";

async function text(path) {
  return readFile(path, "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const body = trimmed.slice(1, -1).trim();
    return body ? body.split(",").map((entry) => scalar(entry)) : [];
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function parseRoadmap(source) {
  const program = {};
  const items = [];
  let section = null;
  let current = null;

  for (const line of source.split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      section = top[1];
      current = null;
      continue;
    }
    if (section === "program") {
      const field = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field) program[field[1]] = scalar(field[2]);
      continue;
    }
    if (section !== "items") continue;
    const start = line.match(/^\s{2}-\s+id:\s*(.*)$/);
    if (start) {
      current = { id: scalar(start[1]) };
      items.push(current);
      continue;
    }
    const field = line.match(/^\s{4}([A-Za-z][\w-]*):\s*(.*)$/);
    if (field && current) current[field[1]] = scalar(field[2]);
  }

  return { program, byId: new Map(items.map((item) => [item.id, item])) };
}

const EXPECTED_REVIEW_THREADS = [
  ["PRR_kwDOSMHn8M8AAAABJNa_Uw", "PRRT_kwDOSMHn8M6Yc-Tw", "P1", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJNa_Uw", "PRRT_kwDOSMHn8M6Yc-Tz", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJNgBTQ", "PRRT_kwDOSMHn8M6YdKTb", "P2", "C2R-E"],
  ["PRR_kwDOSMHn8M8AAAABJNgBTQ", "PRRT_kwDOSMHn8M6YdKTe", "P2", "C2R-E"],
  ["PRR_kwDOSMHn8M8AAAABJNyCoQ", "PRRT_kwDOSMHn8M6YdyeQ", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJNyCoQ", "PRRT_kwDOSMHn8M6YdyeT", "P2", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJPkFng", "PRRT_kwDOSMHn8M6Yhqf6", "P2", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBK", "P1", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBO", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBT", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phg", "P2", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phk", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phn", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJZA5IA", "PRRT_kwDOSMHn8M6Y3rmj", "P2", "C2R-F"],
  ["PRR_kwDOSMHn8M8AAAABJZod9A", "PRRT_kwDOSMHn8M6Y5DLv", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJaEsIA", "PRRT_kwDOSMHn8M6Y6CKf", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJgtWdA", "PRRT_kwDOSMHn8M6ZJGtq", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJgtWdA", "PRRT_kwDOSMHn8M6ZJGtr", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1B", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1C", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1F", "P2", "C2R-C-L"],
];

test("records PR #716 as a closed unmerged donor and keeps WCV-C2 incomplete", async () => {
  const [unified, decision] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text(DECISION),
  ]);
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const donor = recovery.terminalDonor;

  assert.equal(unified.contractVersion, "dabangil.unified_program.v4");
  assert.equal(unified.structuralRecoveryDecision.leadIssue, 717);
  assert.equal(unified.structuralRecoveryDecision.terminalPr, 716);
  assert.equal(unified.structuralRecoveryDecision.wcvC2Complete, false);
  assert.equal(recovery.wcvC2Complete, false);
  assert.equal(donor.pr, 716);
  assert.equal(donor.state, "closed_draft_unmerged");
  assert.equal(donor.merged, false);
  assert.equal(donor.head, "ca5193526ab0e1ca2f75660066b5a0da8f668ec1");
  assert.equal(donor.tree, "8f470e82e5545f4caddb3d902b08f6a15eb31e48");
  assert.equal(donor.baseMain, "03a3886de105de104de04672ffaa6507b2ead592");
  assert.equal(donor.baseMainTree, "e14c019b8a49c5dca822ea81b95639b09543a668");
  assert.equal(donor.finalReview, "PRR_kwDOSMHn8M8AAAABJhaiDA");
  assert.deepEqual(donor.finalActionableP0P1P2, [0, 0, 3]);
  assert.equal(donor.reviewThreadCount, 21);
  assert.equal(donor.intentionallyUnresolvedThreadCount, 19);
  assert.equal(donor.branchRetainedReadOnly, true);
  assert.equal(donor.runtimeEvidencePromotedToMain, false);
  assert.equal(donor.mainCompletionEvidence, false);
  assert.match(decision, /PR #716 exhausted its final correction authority/);
  assert.match(decision, /They are not promoted into main/);
});

test("installs the exact terminally serial C2R-A through C2R-F replacement chain", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const stages = recovery.replacementStages;

  assert.equal(recovery.trackerIssue, 717);
  assert.equal(recovery.priorAtomic702To705SinglePrRequirementSuperseded, true);
  assert.equal(recovery.standalone702SourceOnlyAuthorized, true);
  assert.equal(recovery.standalone714SourceOnlyAuthorized, true);
  assert.equal(recovery.oneMergeProducingWriterAtATime, true);
  assert.equal(recovery.automaticStartAllowed, false);
  assert.deepEqual(stages.map((stage) => stage.order), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(
    stages.map((stage) => stage.id),
    ["C2R-A", "C2R-B", "C2R-C-P", "C2R-C-T", "C2R-C-L", "C2R-D", "C2R-E", "C2R-F"],
  );
  assert.deepEqual(stages.map((stage) => stage.issue), [702, 714, 703, 703, 703, 704, 705, 705]);
  assert.deepEqual(
    stages.map((stage) => stage.dependencies),
    [
      ["WCV-C2R-AUTHORITY"],
      ["C2R-A"],
      ["C2R-B"],
      ["C2R-C-P"],
      ["C2R-C-T"],
      ["C2R-C-L"],
      ["C2R-D"],
      ["C2R-E"],
    ],
  );
  assert.equal(stages[0].state, "authorized_unstarted");
  for (const stage of stages) {
    assert.equal(stage.terminalMergeRequired, true, stage.id);
    assert.equal(stage.automaticStartAllowed, false, stage.id);
  }
  for (const stage of stages.slice(1)) {
    assert.equal(stage.state, "queued_dependency_blocked", stage.id);
  }
});

test("binds #703, #704, #705 and #706 to the required terminal predecessors", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const rules =
    unified.wcvCampaignOverlay.c2StructuralRecovery.dependencyRules;
  const c3 = unified.wcvCampaignOverlay.campaigns.find(
    (campaign) => campaign.id === "C3",
  );

  assert.equal(rules.sourceFirewallAndCognitiveArchitectureAreSerial, true);
  assert.deepEqual(rules.issue703RequiresTerminalIssues, [702, 714]);
  assert.equal(rules.issue704CompletionRequiresTerminalIssue, 703);
  assert.deepEqual(rules.issue705RuntimeRequiresTerminalIssues, [702, 714, 703, 704]);
  assert.equal(rules.issue706RequiresTerminalIssue, 705);
  assert.equal(rules.issue706RequiresTerminalReplacementStage, "C2R-F");
  assert.equal(c3.state, "queued_blocked_until_terminal_c2r_f");
  assert.equal(c3.terminalReplacementDependency, "C2R-F");
  assert.equal(c3.automaticStartAllowed, false);
});

test("keeps roadmap selection metadata-only with one writer and no stage auto-start", async () => {
  const source = await text("roadmap/active-program.yml");
  const roadmap = parseRoadmap(source);
  const c2 = roadmap.byId.get("WCV-C2");
  const c3 = roadmap.byId.get("WCV-C3");
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    new Date("2026-08-14T08:00:00.000Z"),
  );

  assert.equal(roadmap.program.globalMergeProducingWriterLimit, 1);
  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C2");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 717);
  assert.equal(roadmap.program.structuralRecoveryTrackerIssue, 717);
  assert.equal(roadmap.program.terminalDonorPr, 716);
  assert.equal(roadmap.program.terminalDonorMerged, false);
  assert.equal(roadmap.program.wcvC2Complete, false);
  assert.equal(roadmap.program.replacementStageAutomaticStartAllowed, false);
  assert.equal(c2.leadIssue, 717);
  assert.deepEqual(c2.replacementStages, [
    "C2R-A",
    "C2R-B",
    "C2R-C-P",
    "C2R-C-T",
    "C2R-C-L",
    "C2R-D",
    "C2R-E",
    "C2R-F",
  ]);
  assert.equal(c2.priorAtomic702To705SinglePrRequired, false);
  assert.equal(c2.standalone702SourcePrAllowed, true);
  assert.equal(c2.standalone714PrerequisitePrAllowed, true);
  assert.equal(c2.automaticStartAllowed, false);
  assert.equal(c2.terminalDonorEvidencePromotedToMain, false);
  assert.equal(c2.uncoveredReviewFindingCount, 21);
  assert.equal(c3.executionState, "blocked_until_terminal_c2r_f_merge");
  assert.equal(c3.terminalReplacementDependency, "C2R-F");
  assert.equal(c3.automaticStartAllowed, false);
  assert.equal(plan.globalMergeProducingWriterLimit, 1);
  assert.equal(plan.activeWriterCount, 0);
  assert.equal(plan.availableWriterSlots, 1);
  assert.deepEqual(plan.selectedItemIds, ["WCV-C2"]);
  assert.equal(
    (await json("config/dabangil-unified-program-contract.json"))
      .roadmapContract.selectionAutomaticallyStartsWork,
    false,
  );
});

test("installs all 21 donor findings as uncovered matrix rows", async () => {
  const matrix = await text(MATRIX);
  const rows = matrix
    .split(/\r?\n/)
    .filter((line) => /^\| \d+ \|/.test(line));

  assert.equal(rows.length, 21);
  assert.equal(
    rows.filter((row) => row.includes(" | `resolved` |")).length,
    2,
  );
  assert.equal(
    rows.filter((row) => row.includes(" | `unresolved` |")).length,
    19,
  );
  assert.equal(
    rows.filter((row) => row.includes(" | `uncovered` |")).length,
    21,
  );
  assert.equal(
    rows.filter((row) => row.endsWith(" | `none` |")).length,
    21,
  );
  assert.doesNotMatch(matrix, /\| `covered` \|/);

  for (const [index, [review, thread, severity, stage]] of
    EXPECTED_REVIEW_THREADS.entries()) {
    const row = rows[index];
    assert.match(row, new RegExp(`^\\| ${index + 1} \\|`));
    assert.ok(row.includes(`\`${review}\` / \`${thread}\``), thread);
    assert.ok(row.includes(`| \`${severity}\` |`), thread);
    assert.ok(row.includes(`| \`${stage}\` |`), thread);
    assert.ok(row.includes("**"), `${thread} exact finding title`);
    assert.ok(row.includes("tests/"), `${thread} future test path`);
  }
});

test("keeps V13 and WCV 1.0.8 while denying every activation class", async () => {
  const [unified, decision, contract, roadmap] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text(DECISION),
    text("docs/dabangil-unified-program-contract.md"),
    text("docs/inverge-master-roadmap.md"),
  ]);
  const boundary = unified.structuralRecoveryDecision;

  assert.equal(
    unified.wcvCampaignOverlay.activeMasterPlan,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md",
  );
  assert.equal(
    unified.wcvCampaignOverlay.relationshipToV13,
    "subordinate_execution_campaign_not_active_master",
  );
  assert.equal(unified.wcvCampaignOverlay.wcvBehaviorContractVersion, "1.0.8");
  for (const key of [
    "runtimeAuthorized",
    "applicationAuthorized",
    "realContentAuthorized",
    "learnerActivationAuthorized",
    "providerActivationAuthorized",
    "paymentActivationAuthorized",
    "commercialActivationAuthorized",
    "productionAuthorized",
  ]) {
    assert.equal(boundary[key], false, key);
  }
  assert.match(decision, /V13 remains the sole active master/);
  assert.match(decision, /WCV 1\.0\.8 remains subordinate/);
  assert.match(contract, /Every replacement stage has `automaticStartAllowed: false`/);
  assert.match(roadmap, /No stage starts\nautomatically/);
});

test("registers the structural recovery authority test exactly once", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  const matches = runner.match(
    /tests\/wcv-c2r-structural-recovery-authority\.test\.mjs/g,
  ) ?? [];
  assert.equal(matches.length, 1);
  assert.equal(FOCUSED_TEST.endsWith(".test.mjs"), true);
});

test("declares the exact eleven-path source-contract ownership boundary", async () => {
  const decision = await text(DECISION);
  const manifest =
    decision.match(/## 10\. Exact owned-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(paths, [
    "roadmap/active-program.yml",
    "config/dabangil-unified-program-contract.json",
    "docs/dabangil-unified-program-contract.md",
    "docs/inverge-master-roadmap.md",
    "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md",
    "docs/qa/wcv-c2-replacement-regression-matrix.md",
    "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs",
    "tests/wcv-c2r-structural-recovery-authority.test.mjs",
    "tests/dabangil-premium-alignment.test.mjs",
    "tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs",
    "scripts/run-node-tests.mjs",
  ]);
  for (const path of paths) {
    assert.doesNotMatch(
      path,
      /^(?:app|components|lib\/review-os|supabase|\.github\/workflows)\//,
      path,
    );
    assert.doesNotMatch(path, /(?:^|\/)(?:package\.json|[^/]*lock[^/]*)$/, path);
  }
});

test("keeps all structural recovery authority artifacts newline-terminated", async () => {
  for (const path of [
    DECISION,
    MATRIX,
    "roadmap/active-program.yml",
    "config/dabangil-unified-program-contract.json",
    "docs/dabangil-unified-program-contract.md",
    "docs/inverge-master-roadmap.md",
    FOCUSED_TEST,
  ]) {
    assert.equal((await text(path)).endsWith("\n"), true, path);
  }
});
