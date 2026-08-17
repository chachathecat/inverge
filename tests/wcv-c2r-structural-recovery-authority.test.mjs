import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";
import { readTextFile } from "./platform-text.mjs";

const DECISION =
  "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
const C2R_A_DECISION =
  "docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md";
const C2R_B_DECISION =
  "docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md";
const MATRIX =
  "docs/qa/wcv-c2-replacement-regression-matrix.md";
const FOCUSED_TEST =
  "tests/wcv-c2r-structural-recovery-authority.test.mjs";

async function text(path) {
  return readTextFile(path);
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
  ["PRR_kwDOSMHn8M8AAAABJNa_Uw", "PRRT_kwDOSMHn8M6Yc-Tw", "P1", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJNa_Uw", "PRRT_kwDOSMHn8M6Yc-Tz", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJNgBTQ", "PRRT_kwDOSMHn8M6YdKTb", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJNgBTQ", "PRRT_kwDOSMHn8M6YdKTe", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJNyCoQ", "PRRT_kwDOSMHn8M6YdyeQ", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJNyCoQ", "PRRT_kwDOSMHn8M6YdyeT", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJPkFng", "PRRT_kwDOSMHn8M6Yhqf6", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBK", "P1", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBO", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJQTmPw", "PRRT_kwDOSMHn8M6YjVBT", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phg", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phk", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJYXLgg", "PRRT_kwDOSMHn8M6Y2Phn", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJZA5IA", "PRRT_kwDOSMHn8M6Y3rmj", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJZod9A", "PRRT_kwDOSMHn8M6Y5DLv", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJaEsIA", "PRRT_kwDOSMHn8M6Y6CKf", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJgtWdA", "PRRT_kwDOSMHn8M6ZJGtq", "P2", "C2R-C-L"],
  ["PRR_kwDOSMHn8M8AAAABJgtWdA", "PRRT_kwDOSMHn8M6ZJGtr", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1B", "P2", "C2R-C-P"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1C", "P2", "C2R-C-T"],
  ["PRR_kwDOSMHn8M8AAAABJhaiDA", "PRRT_kwDOSMHn8M6ZKl1F", "P2", "C2R-C-L"],
];

const EXPECTED_FORBIDDEN_CLAIM_TRUTH_TABLE = [
  {
    evidenceSet: "none",
    semanticState: "absent",
    releaseEffect: "nonblocking",
  },
  {
    evidenceSet: "negated only",
    semanticState: "negated",
    releaseEffect: "nonblocking",
  },
  {
    evidenceSet: "non-assertive only",
    semanticState: "non-assertive",
    releaseEffect: "nonblocking",
  },
  {
    evidenceSet: "positive only",
    semanticState: "positive",
    releaseEffect: "blocking",
  },
  {
    evidenceSet: "positive + negated",
    semanticState: "ambiguous",
    releaseEffect: "blocking",
  },
  {
    evidenceSet: "positive + unresolved ambiguous",
    semanticState: "ambiguous",
    releaseEffect: "blocking",
  },
  {
    evidenceSet: "unresolved assertive ambiguous only",
    semanticState: "ambiguous",
    releaseEffect: "blocking",
  },
];

function markdownCells(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function unquoteMarkdownCode(value) {
  return value.replaceAll("`", "").trim();
}

function parseMatrixRows(source) {
  return new Map(
    source
      .split(/\r?\n/)
      .filter((line) => /^\| \d+ \|/.test(line))
      .map((line) => {
        const cells = markdownCells(line);
        return [
          Number(cells[0]),
          {
            number: Number(cells[0]),
            reviewAndThread: cells[1],
            historicalThreadState: unquoteMarkdownCode(cells[2]),
            severity: unquoteMarkdownCode(cells[3]),
            exactFinding: cells[4],
            affectedDomain: cells[5],
            assignedReplacementStage: unquoteMarkdownCode(cells[6]),
            requiredFutureRegression: cells[7],
            status: unquoteMarkdownCode(cells[8]),
            futureTestPath: unquoteMarkdownCode(cells[9]),
            candidateCoverageDeclaration: unquoteMarkdownCode(cells[10]),
          },
        ];
      }),
  );
}

function parseForbiddenClaimTruthTable(source) {
  const section =
    source.match(
      /### Forbidden-claim polarity release truth table([\s\S]*?)\n\| # \|/,
    )?.[1] ?? "";

  return section
    .split(/\r?\n/)
    .filter((line) => /^\| `/.test(line))
    .map((line) => {
      const [evidenceSet, semanticState, releaseEffect] = markdownCells(line);
      return {
        evidenceSet: unquoteMarkdownCode(evidenceSet),
        semanticState: unquoteMarkdownCode(semanticState),
        releaseEffect: unquoteMarkdownCode(releaseEffect),
      };
    });
}

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

test("installs the exact terminally serial five-stage replacement chain", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const recovery = unified.wcvCampaignOverlay.c2StructuralRecovery;
  const stages = recovery.replacementStages;

  assert.equal(recovery.trackerIssue, 717);
  assert.equal(recovery.priorAtomic702To705SinglePrRequirementSuperseded, true);
  assert.equal(recovery.standalone702SourceOnlyAuthorized, true);
  assert.equal(recovery.standalone714SourceOnlyAuthorized, true);
  assert.equal(recovery.oneMergeProducingWriterAtATime, true);
  assert.equal(recovery.automaticStartAllowed, false);
  assert.deepEqual(stages.map((stage) => stage.order), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    stages.map((stage) => stage.id),
    ["C2R-A", "C2R-B", "C2R-C-P", "C2R-C-T", "C2R-C-L"],
  );
  assert.deepEqual(stages.map((stage) => stage.issue), [702, 714, 703, 703, 703]);
  assert.deepEqual(
    stages.map((stage) => stage.dependencies),
    [
      [],
      ["C2R-A"],
      ["C2R-B"],
      ["C2R-C-P"],
      ["C2R-C-T"],
    ],
  );
  assert.equal(stages[0].startRequiresTerminalStructuralAuthorityPr, 718);
  for (const stage of stages.slice(0, 2)) {
    assert.equal(stage.outcomeType, "independently_complete_source_contract_outcome");
    assert.equal(stage.horizontalRuntimeLayer, false);
    assert.equal(stage.sourceContractOnly, true);
  }
  for (const stage of stages.slice(2)) {
    assert.equal(
      stage.outcomeType,
      "independently_deployable_learner_visible_runtime_vertical",
    );
  }
  for (const stage of stages) {
    assert.equal(stage.terminalMergeRequired, true, stage.id);
    assert.equal(stage.automaticStartAllowed, false, stage.id);
  }
  assert.equal(stages[0].state, "complete_source_only");
  assert.equal(stages[1].state, "complete_source_only");
  assert.equal(stages[2].state, "complete_practice_runtime");
  assert.equal(stages[3].state, "complete_theory_runtime");
  assert.equal(stages[4].state, "authorized_unstarted");
});

test("resolves roadmap, campaign, tracker and current-stage authority without aliases", async () => {
  const [unified, roadmapSource, contract, decision, master] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("docs/dabangil-unified-program-contract.md"),
    text(DECISION),
    text("docs/inverge-master-roadmap.md"),
  ]);
  const overlay = unified.wcvCampaignOverlay;
  const recovery = overlay.c2StructuralRecovery;
  const graph = recovery.authorityGraph;
  const roadmap = parseRoadmap(roadmapSource);
  const stages = recovery.replacementStages;
  const stageIds = stages.map((stage) => stage.id);
  const campaignMatches = overlay.campaigns.filter(
    (campaign) => campaign.id === overlay.soleNextImplementationCampaign,
  );

  assert.deepEqual(graph, {
    roadmapItemId: "WCV-C2",
    campaignId: "C2",
    recoveryTrackerIssue: 717,
    structuralAuthorityPr: 718,
    currentReplacementStageId: "C2R-C-L",
    currentReplacementStageIssue: 703,
    replacementStageChain: ["C2R-A", "C2R-B", "C2R-C-P", "C2R-C-T", "C2R-C-L"],
  });
  assert.equal(campaignMatches.length, 1);
  assert.equal(campaignMatches[0].roadmapItemId, graph.roadmapItemId);
  assert.equal(campaignMatches[0].leadIssue, graph.recoveryTrackerIssue);
  assert.equal(overlay.soleNextImplementationTrackerIssue, graph.recoveryTrackerIssue);
  assert.equal(overlay.soleNextReplacementStage, graph.currentReplacementStageId);
  assert.equal(overlay.soleNextReplacementStageIssue, graph.currentReplacementStageIssue);
  assert.equal(roadmap.program.campaignOverlay, graph.campaignId);
  assert.equal(roadmap.program.soleNextImplementationCampaign, graph.campaignId);
  assert.equal(roadmap.program.soleNextImplementationItem, graph.roadmapItemId);
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, graph.recoveryTrackerIssue);
  assert.equal(roadmap.program.soleNextReplacementStage, graph.currentReplacementStageId);
  assert.equal(roadmap.program.soleNextReplacementStageIssue, graph.currentReplacementStageIssue);
  assert.equal(new Set(stageIds).size, stageIds.length);
  for (const [index, stage] of stages.entries()) {
    for (const dependency of stage.dependencies) {
      assert.ok(stageIds.indexOf(dependency) >= 0, `${stage.id}:${dependency}`);
      assert.ok(stageIds.indexOf(dependency) < index, `${stage.id}:${dependency}`);
    }
  }
  const current = stages.filter((stage) => stage.state === "authorized_unstarted");
  assert.deepEqual(current.map(({ id, issue }) => ({ id, issue })), [
    { id: "C2R-C-L", issue: 703 },
  ]);
  for (const allocation of Object.keys(overlay.issue714Tracker.allocations)) {
    assert.equal(
      overlay.campaigns.filter((campaign) => campaign.id === allocation).length,
      1,
      allocation,
    );
  }
  assert.match(decision, /Issue state or closure cannot substitute/);
  assert.match(master, /campaign ID\n`C2`/);
  assert.doesNotMatch(contract, /^\| C2R \|/m);
});

test("declares complete Practice, Theory and Law outcomes without horizontal runtime stages", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const stages = unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages;
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const practice = byId.get("C2R-C-P");
  const theory = byId.get("C2R-C-T");
  const law = byId.get("C2R-C-L");

  assert.equal(practice.commonRuntimeSubstrateFirstLandsHere, true);
  assert.deepEqual(practice.acceptanceContributionIssues, [703, 704, 705]);
  assert.deepEqual(theory.acceptanceContributionIssues, [703, 704, 705]);
  assert.deepEqual(law.acceptanceContributionIssues, [703, 704, 705]);
  for (const required of [
    "TYPED_PRACTICE_CALCULATION_RELATION_VALIDATOR",
    "PRACTICE_GOLDEN_AND_OWNER_GOLD_FIXTURES",
    "PERSISTENCE_FORCED_RLS_SERVER_IDEMPOTENCY_CAS",
    "API",
    "LEARNER_UI",
    "BROWSER_NEXT_SUPABASE_POSTGRES_RUNTIME_EVIDENCE",
    "SAFE_DEFERRED_CAPABILITY_BOUNDARY",
    "INDEPENDENT_ROLLBACK",
  ]) {
    assert.ok(practice.requiredChangedLayers.includes(required), required);
  }
  for (const [stage, validator, fixture, rollback] of [
    [
      theory,
      "TYPED_THEORY_TARGET_SCOPED_PREDICATE_VALIDATOR",
      "THEORY_GOLDEN_AND_OWNER_GOLD_FIXTURES",
      "ROLLBACK_INDEPENDENT_OF_PRACTICE",
    ],
    [
      law,
      "EXACT_LAW_SOURCE_ANCHOR_LOCATOR_EFFECTIVE_VERSION_APPLICABLE_DATE_VALIDATOR",
      "LAW_GOLDEN_AND_OWNER_GOLD_FIXTURES",
      "ROLLBACK_INDEPENDENT_OF_PRACTICE_AND_THEORY",
    ],
  ]) {
    assert.ok(stage.requiredChangedLayers.includes(validator), validator);
    assert.ok(stage.requiredChangedLayers.includes(fixture), fixture);
    assert.ok(
      stage.requiredChangedLayers.includes("NECESSARY_PERSISTENCE_SERVER_API_UI_INTEGRATION_DELTA"),
      stage.id,
    );
    assert.ok(stage.requiredChangedLayers.includes("BROWSER_TO_DATABASE_RUNTIME_EVIDENCE"), stage.id);
    assert.ok(stage.requiredChangedLayers.includes(rollback), rollback);
  }
  assert.equal(practice.terminalIssueClosureAllowed, false);
  assert.equal(theory.terminalIssueClosureAllowed, false);
  assert.equal(law.terminalIssueClosureAllowed, true);
  assert.deepEqual(law.terminalClosureIssues, [703, 704, 705]);
  assert.equal(law.terminalWcvC2Closeout, true);
});

test("uses terminal replacement-stage merges and preserves open #714 allocations", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const rules =
    unified.wcvCampaignOverlay.c2StructuralRecovery.dependencyRules;
  const issue714 = unified.wcvCampaignOverlay.issue714Tracker;
  const c3 = unified.wcvCampaignOverlay.campaigns.find(
    (campaign) => campaign.id === "C3",
  );

  assert.equal(rules.sourceFirewallAndCognitiveArchitectureAreSerial, true);
  assert.deepEqual(rules.c2rCPStartRequiresTerminalReplacementStages, ["C2R-A", "C2R-B"]);
  assert.equal(rules.issueTerminalStateMaySubstituteForStageMerge, false);
  assert.equal(rules.issue714MustRemainOpenAfterC2RB, true);
  assert.equal(rules.c2rBCompletesOnlyIssue714Allocation, "C2");
  assert.deepEqual(rules.issue714RemainingAllocationsPreserved, ["C3", "C4", "C6"]);
  assert.deepEqual(
    Object.keys(rules).filter((key) => key.includes("RequiresTerminalIssues")),
    [],
  );
  assert.equal(issue714.c2rBClosesIssue714, false);
  assert.equal(issue714.c2AllocationComplete, true);
  assert.equal(issue714.c2rBState, "complete_source_only");
  assert.equal(issue714.c2rBCompletesOnlyAllocation, "C2");
  assert.deepEqual(issue714.remainingAllocationsAfterC2RB, ["C3", "C4", "C6"]);
  assert.equal(rules.runtimeSubjectStagesAreCompleteOutcomes, true);
  assert.equal(rules.intermediateSubjectStagesMayRecordAcceptanceContributions, true);
  assert.equal(rules.intermediateSubjectStagesMayCloseIssues703To705, false);
  assert.equal(rules.issue703ClosureRequiresTerminalReplacementStage, "C2R-C-L");
  assert.equal(rules.issue704ClosureRequiresTerminalReplacementStage, "C2R-C-L");
  assert.equal(rules.issue705ClosureRequiresTerminalReplacementStage, "C2R-C-L");
  assert.equal(rules.issue706RequiresTerminalIssue, 705);
  assert.equal(rules.issue706RequiresTerminalReplacementStage, "C2R-C-L");
  assert.equal(c3.state, "queued_blocked_until_terminal_c2r_c_l");
  assert.equal(c3.terminalReplacementDependency, "C2R-C-L");
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
  assert.equal(roadmap.program.campaignOverlay, "C2");
  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C2");
  assert.equal(roadmap.program.soleNextImplementationCampaign, "C2");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 717);
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, 717);
  assert.equal(roadmap.program.soleNextReplacementStage, "C2R-C-L");
  assert.equal(roadmap.program.soleNextReplacementStageIssue, 703);
  assert.equal(roadmap.program.structuralRecoveryTrackerIssue, 717);
  assert.equal(roadmap.program.terminalDonorPr, 716);
  assert.equal(roadmap.program.terminalDonorMerged, false);
  assert.equal(roadmap.program.wcvC2Complete, false);
  assert.equal(roadmap.program.replacementStageAutomaticStartAllowed, false);
  assert.equal(c2.leadIssue, 717);
  assert.equal(c2.campaignId, "C2");
  assert.equal(c2.currentReplacementStage, "C2R-C-L");
  assert.equal(c2.currentReplacementStageIssue, 703);
  assert.equal(c2.c2rBState, "complete_source_only");
  assert.equal(c2.c2rCPState, "complete_practice_runtime");
  assert.equal(c2.c2rCTState, "complete_theory_runtime");
  assert.equal(c2.c2rCLState, "authorized_unstarted");
  assert.deepEqual(c2.replacementStages, [
    "C2R-A",
    "C2R-B",
    "C2R-C-P",
    "C2R-C-T",
    "C2R-C-L",
  ]);
  assert.deepEqual(c2.independentlyCompleteSourceContractStages, ["C2R-A", "C2R-B"]);
  assert.deepEqual(c2.completeLearnerVisibleRuntimeStages, ["C2R-C-P", "C2R-C-T", "C2R-C-L"]);
  assert.equal(c2.commonRuntimeSubstrateFirstStage, "C2R-C-P");
  assert.equal(c2.subjectGoldenFixturesDistributedIntoRuntimeStages, true);
  assert.equal(c2.intermediateSubjectStagesMayCloseIssues703To705, false);
  assert.equal(c2.issue703ClosureStage, "C2R-C-L");
  assert.equal(c2.issue704ClosureStage, "C2R-C-L");
  assert.equal(c2.issue705ClosureStage, "C2R-C-L");
  assert.equal(c2.priorAtomic702To705SinglePrRequired, false);
  assert.equal(c2.standalone702SourcePrAllowed, true);
  assert.equal(c2.standalone714PrerequisitePrAllowed, true);
  assert.deepEqual(c2.c2rCPStartRequiresTerminalReplacementStages, ["C2R-A", "C2R-B"]);
  assert.equal(c2.issueTerminalStateMaySubstituteForStageMerge, false);
  assert.equal(c2.issue714MustRemainOpenAfterC2RB, true);
  assert.equal(c2.c2rBCompletesOnlyIssue714Allocation, "C2");
  assert.deepEqual(c2.issue714RemainingAllocationsPreserved, ["C3", "C4", "C6"]);
  assert.equal(c2.automaticStartAllowed, false);
  assert.equal(c2.terminalDonorEvidencePromotedToMain, false);
  assert.equal(c2.uncoveredReviewFindingCount, 5);
  assert.equal(c2.coverageCandidateState, "practice_covered_theory_candidate_pending_exact_merge");
  assert.equal(
    c2.coverageReceiptPolicyId,
    "github_exact_head_pinned_squash_merge_v1",
  );
  assert.equal(c2.coverageReceiptVersion, "MergeCoverageReceiptV1");
  assert.equal(c2.coverageMergeExpectedHeadPinned, true);
  assert.equal(c2.coverageLiveGithubReceiptValidationRequired, true);
  assert.equal(c2.coverageSuccessorRepositoryPrRequired, false);
  assert.equal(c2.terminalIssueClosureRequiresValidatedCoverageReceipt, true);
  assert.equal(c3.executionState, "blocked_until_terminal_c2r_c_l_merge");
  assert.equal(c3.terminalReplacementDependency, "C2R-C-L");
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
  const roadmapContract = (await json("config/dabangil-unified-program-contract.json"))
    .roadmapContract;
  assert.equal(roadmapContract.soleNextImplementationCampaignId, "C2");
  assert.equal(roadmapContract.soleNextImplementationTrackerIssue, 717);
  assert.equal(roadmapContract.soleNextReplacementStageId, "C2R-C-L");
  assert.equal(roadmapContract.soleNextReplacementStageIssue, 703);
});

test("keeps all 21 donor findings with 11 Practice and 5 Theory candidates", async () => {
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
    5,
  );
  assert.equal(
    rows.filter((row) => row.endsWith(" | `none` |")).length,
    5,
  );
  assert.equal(
    rows.filter((row) => row.includes(" | `candidate_coverage_pending_exact_merge` |")).length,
    16,
  );
  assert.equal(rows.filter((row) => row.includes('"coveringPrNumber":756')).length, 11);
  assert.equal(rows.filter((row) => row.includes('"coveringPrNumber":762')).length, 5);
  assert.doesNotMatch(matrix, /\| `covered` \|/);
  assert.doesNotMatch(matrix, /Future merged commit/i);
  assert.match(matrix, /Candidate coverage declaration/);
  assert.match(matrix, /candidate_coverage_pending_exact_merge/);
  assert.match(matrix, /github_exact_head_pinned_squash_merge_v1/);
  assert.doesNotMatch(matrix, /C2R-(?:D|E|F)/);

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

test("keeps ambiguous forbidden evidence release-blocking across rows 9 and 13", async () => {
  const matrix = await text(MATRIX);
  const rows = parseMatrixRows(matrix);
  const row9 = rows.get(9);
  const row13 = rows.get(13);
  const invariant =
    matrix.match(
      /## Forbidden-claim polarity release invariant([\s\S]*?)### Forbidden-claim polarity release truth table/,
    )?.[1] ?? "";

  assert.equal(rows.size, 21);
  assert.equal(row9.assignedReplacementStage, "C2R-C-P");
  assert.match(
    row9.requiredFutureRegression,
    /every occurrence is explicitly negated or genuinely non-assertive/,
  );
  assert.match(
    row9.requiredFutureRegression,
    /no positive or unresolved assertive occurrence exists/,
  );
  assert.match(
    row9.requiredFutureRegression,
    /purely negated, and purely non-assertive evidence are nonblocking/,
  );
  assert.match(row9.requiredFutureRegression, /Positive-only evidence blocks/);
  assert.match(
    row9.requiredFutureRegression,
    /Positive \+ negated mixed polarity is semantically `ambiguous` but release-blocking/,
  );
  assert.match(
    row9.requiredFutureRegression,
    /positive \+ unresolved ambiguous evidence is release-blocking/,
  );
  assert.match(
    row9.requiredFutureRegression,
    /Unresolved assertive ambiguity fails closed as `partial` or `blocked`/,
  );
  assert.match(
    row9.requiredFutureRegression,
    /No positive, mixed-polarity, or assertively ambiguous forbidden evidence may produce `verified`/,
  );
  assert.doesNotMatch(
    row9.requiredFutureRegression,
    /ambiguous forbidden mentions must be nonblocking/i,
  );

  assert.equal(row13.assignedReplacementStage, "C2R-C-T");
  assert.match(
    row13.requiredFutureRegression,
    /Same-clause positive and negated assertions for the same target must reduce to ambiguous/,
  );
  assert.match(invariant, /For a required claim, `ambiguous` means unsatisfied/);
  assert.match(
    invariant,
    /ambiguous assertive or mixed-polarity evidence blocks\n`verified` release/,
  );
  assert.match(
    invariant,
    /Only absent, purely negated, or purely non-assertive\nforbidden evidence is nonblocking/,
  );

  const truthTable = parseForbiddenClaimTruthTable(matrix);
  assert.deepEqual(truthTable, EXPECTED_FORBIDDEN_CLAIM_TRUTH_TABLE);
  for (const row of truthTable) {
    const expectedBlocking = ![
      "none",
      "negated only",
      "non-assertive only",
    ].includes(row.evidenceSet);
    assert.equal(row.releaseEffect, expectedBlocking ? "blocking" : "nonblocking");
    if (row.semanticState === "ambiguous") {
      assert.equal(row.releaseEffect, "blocking", row.evidenceSet);
    }
  }
});

test("installs non-self-referential exact-head merge coverage receipts", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const protocol = unified.wcvCampaignOverlay.c2StructuralRecovery.coverageProtocol;
  const candidate = protocol.repositoryCandidateDeclaration;
  const identity = protocol.externalExactCandidateIdentity;
  const merge = protocol.expectedHeadPinnedMerge;
  const receipt = protocol.postMergeReceipt;
  const live = protocol.liveGithubReceiptVerification;
  const effective = protocol.effectiveCoveragePredicate;
  const terminal = protocol.terminalC2RCL;

  assert.equal(
    protocol.version,
    "wcv_c2r_non_self_referential_merge_coverage_v1",
  );
  assert.equal(protocol.initialRowCount, 21);
  assert.equal(protocol.initialRowStatus, "uncovered");
  assert.equal(protocol.allRowsRemainUncoveredInAuthorityPr718, true);
  assert.equal(protocol.candidateStatus, "candidate_coverage_pending_exact_merge");
  assert.equal(
    protocol.receiptPolicyId,
    "github_exact_head_pinned_squash_merge_v1",
  );
  assert.equal(candidate.assignedRowsOnly, true);
  assert.equal(candidate.fromStatus, "uncovered");
  assert.equal(candidate.toStatus, "candidate_coverage_pending_exact_merge");
  assert.deepEqual(candidate.requiredFieldsExactly, [
    "findingThreadId",
    "coveringStage",
    "coveringPrNumber",
    "exactRegressionAssertionId",
    "exactFutureTestPath",
    "inheritedRegressionObligations",
    "receiptPolicyId",
  ]);
  assert.equal(
    candidate.ownReviewedHeadTreeOrFutureMergeCommitMustNotBeCommittedWhenSelfReferential,
    true,
  );
  assert.equal(candidate.candidateDeclarationAloneCreatesEffectiveCoverage, false);

  assert.equal(identity.storedOutsideCandidateCommit, true);
  assert.deepEqual(identity.finalActionableP0P1P2Exactly, [0, 0, 0]);
  assert.equal(identity.freshChecksAndFinalReviewMustBelongToReviewedHead, true);
  assert.equal(merge.method, "squash");
  assert.equal(merge.expectedHeadShaRequired, true);
  assert.equal(merge.remoteHeadMismatchFailsClosed, true);
  assert.equal(merge.successfulMergeSuppliesResultingMergeCommitSha, true);

  assert.equal(receipt.receiptVersion, "MergeCoverageReceiptV1");
  assert.equal(receipt.trackerIssue, 717);
  assert.equal(receipt.sameReplacementStageWorkMayPublishAfterSuccessfulMerge, true);
  assert.equal(receipt.exactlyOneTrackerReceiptCommentPerSuccessfulStageMerge, true);
  assert.equal(receipt.trackerCommentIsIndexNotIndependentSourceOfTruth, true);
  assert.deepEqual(receipt.requiredFieldsAtLeast, [
    "receiptVersion",
    "stageId",
    "coveringPrNumber",
    "reviewedHeadSha",
    "reviewedTreeSha",
    "finalReviewId",
    "mergeCommitSha",
    "mergeTreeSha",
    "coveredFindingThreadIds",
    "regressionTestPaths",
    "baseBranch",
    "mergedAt",
  ]);
  assert.equal(receipt.liveGithubVerificationRequired, true);
  assert.equal(receipt.successorRepositoryPrRequired, false);
  assert.equal(receipt.repositoryBookkeepingPrAllowed, false);

  for (const key of [
    "pullRequestMustBeMerged",
    "exactReviewedHeadMustBeMergeInput",
    "livePrMergeCommitMustEqualReceiptMergeCommit",
    "mergeCommitMustBePresentOnMain",
    "mergeTreeMustBeCompatibleWithCandidateEvidence",
    "finalReviewAndRequiredChecksMustBelongToReviewedHead",
    "falseReceiptRejected",
    "mismatchedMergeCommitRejected",
  ]) {
    assert.equal(live[key], true, key);
  }

  assert.equal(effective.allConditionsRequired, true);
  assert.deepEqual(effective.conditionsExactly, [
    "MATRIX_ROW_HAS_EXACT_CANDIDATE_DECLARATION",
    "NAMED_REGRESSION_EXISTS_AND_PASSED_ON_EXACT_REVIEWED_HEAD",
    "FINAL_EXACT_HEAD_REVIEW_ACTIONABLE_P0_P1_P2_IS_0_0_0",
    "EXPECTED_HEAD_PINNED_SQUASH_MERGE_SUCCEEDED",
    "LIVE_GITHUB_MERGE_RECEIPT_VALIDATES",
    "TRACKER_717_MERGE_COVERAGE_RECEIPT_V1_INDEX_EXISTS_AND_MATCHES",
  ]);
  assert.equal(
    effective.donorTestUnmergedCandidateStaleReviewOldCiOrTrackerTextAloneMayCover,
    false,
  );

  const coveragePasses = (evidence) =>
    effective.conditionsExactly.every((condition) => evidence[condition] === true);
  const completeEvidence = Object.fromEntries(
    effective.conditionsExactly.map((condition) => [condition, true]),
  );
  assert.equal(coveragePasses(completeEvidence), true);
  for (const condition of effective.conditionsExactly) {
    assert.equal(
      coveragePasses({ ...completeEvidence, [condition]: false }),
      false,
      condition,
    );
  }

  assert.equal(terminal.successorRepositoryPrRequired, false);
  assert.equal(terminal.issueClosureBeforeReceiptValidationAllowed, false);
  assert.equal(terminal.receiptFailureLeavesRepositoryMergeFactual, true);
  assert.equal(terminal.receiptFailureKeepsIssuesOpenAndC3Blocked, true);
  assert.deepEqual(terminal.orderedCloseoutExactly, [
    "DECLARE_CANDIDATE_COVERAGE_IN_C2R_C_L_PR",
    "PASS_FRESH_EXACT_HEAD_CHECKS_AND_FINAL_REVIEW",
    "SQUASH_MERGE_WITH_EXPECTED_REVIEWED_HEAD_PINNED",
    "PUBLISH_MERGE_COVERAGE_RECEIPT_V1_TO_TRACKER_717",
    "VERIFY_EFFECTIVE_COVERAGE_FOR_ALL_REQUIRED_ROWS",
    "CLOSE_703_704_705_717_AND_UNBLOCK_706_C3",
  ]);
});

test("inherits every common Practice regression in Theory and Law", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const stages = new Map(
    unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages.map(
      (stage) => [stage.id, stage],
    ),
  );
  const common = [1, 4, 6, 8, 11, 14];

  assert.deepEqual(stages.get("C2R-C-P").commonRegressionRows, common);
  assert.deepEqual(stages.get("C2R-C-T").inheritedCommonRegressionRows, common);
  assert.deepEqual(stages.get("C2R-C-L").inheritedCommonRegressionRows, common);
});

test("registers the exact C2R-B then C2R-A supersessions before recovery authority", async () => {
  const agents = await text("AGENTS.md");
  const index = agents.match(
    /## Product source of truth([\s\S]*?)## Product scope/,
  )?.[1] ?? "";
  const recovery =
    "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
  const prior =
    "docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md";

  assert.ok(index.indexOf(C2R_B_DECISION) >= 0);
  assert.ok(index.indexOf(C2R_A_DECISION) > index.indexOf(C2R_B_DECISION));
  assert.ok(index.indexOf(recovery) >= 0);
  assert.ok(index.indexOf(recovery) > index.indexOf(C2R_A_DECISION));
  assert.ok(index.indexOf(prior) > index.indexOf(recovery));
  assert.match(index, /exact C2R-A rights-safe source contract/);
  assert.match(index, /current-stage selector transition to C2R-B\/#714/);
  assert.match(index, /validated C2R-A receipt and #702\s+closure/);
  assert.match(index, /exact C2R-B typed Practice\/Theory\/Law proof architecture/);
  assert.match(index, /post-merge current-stage selector transition to\s+C2R-C-P\/#703/);
  assert.match(index, /PR #716 terminal disposition, Tracker #717, WCV-C2 structural/);
  assert.match(index, /five-stage replacement-chain mapping/);
  assert.match(index, /V13 supremacy, WCV 1\.0\.8 subordination/);
  assert.match(index, /ban on\n   horizontal contract\/API\/storage\/runtime\/UI\/QA splitting/);
});

test("retains the root complete-vertical rule and removes horizontal recovery stages", async () => {
  const paths = [
    "AGENTS.md",
    "roadmap/active-program.yml",
    "config/dabangil-unified-program-contract.json",
    "docs/dabangil-unified-program-contract.md",
    "docs/inverge-master-roadmap.md",
    DECISION,
    MATRIX,
  ];
  const sources = await Promise.all(paths.map((path) => text(path)));
  const agents = sources[0];
  const recoveryAuthority = sources.slice(1).join("\n");

  assert.match(agents, /A runtime vertical contains every layer required for its promised outcome in\n  one PR/);
  assert.match(agents, /do\s+not split it horizontally into contract, API, runtime, UI, and QA PRs/);
  assert.doesNotMatch(recoveryAuthority, /C2R-(?:D|E|F)/);
  assert.match(recoveryAuthority, /validator-only, fixture-only, persistence-only/);
  assert.doesNotMatch(recoveryAuthority, /runtimeAuthorized"?:\s*true/);
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
  assert.match(contract, /structural-recovery records preserve their original\s+`automaticStartAllowed: false` fact/);
  assert.match(contract, /GitHub-native\s+delivery decision authorizes automatic continuation/);
  assert.match(roadmap, /GitHub-native\nprotected non-Production continuation/);
});

test("registers the structural recovery authority test exactly once", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  const matches = runner.match(
    /tests\/wcv-c2r-structural-recovery-authority\.test\.mjs/g,
  ) ?? [];
  assert.equal(matches.length, 1);
  assert.equal(FOCUSED_TEST.endsWith(".test.mjs"), true);
});

test("declares the exact twelve-path source-contract ownership boundary", async () => {
  const decision = await text(DECISION);
  const manifest =
    decision.match(/## 10\. Exact owned-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(paths, [
    "AGENTS.md",
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
    "AGENTS.md",
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
