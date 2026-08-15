import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";

const CONTRACT =
  "config/dabangil-unified-product-multisurface-launch-v1.json";
const DECISION =
  "docs/decisions/2026-08-14-owner-unified-product-multisurface-launch.md";
const STRATEGY =
  "docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md";
const VALIDATION = "docs/qa/dabangil-multisurface-launch-validation.md";
const PARITY = "docs/qa/dabangil-cross-surface-parity-matrix.md";
const COMPLIANCE = "docs/qa/dabangil-store-compliance-matrix.md";
const FOCUSED_TEST =
  "tests/dabangil-unified-product-multisurface-launch-authority.test.mjs";
const WCV_RECONCILIATION_TEST =
  "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs";
const PREMIUM_ALIGNMENT_TEST = "tests/dabangil-premium-alignment.test.mjs";
const WCV_C1_VALIDATION =
  "docs/qa/wcv-campaign-c1-authority-roadmap-reconciliation-validation.md";
const LIVE_ROADMAP_EXPECTATION_TESTS = [
  "tests/agent-factory-roadmap-runner.test.mjs",
  "tests/theory-answer-review-engine.test.mjs",
  "tests/practice-answer-review-engine.test.mjs",
  "tests/s214-reference-answer-pipeline.test.mjs",
  "tests/s215-reference-answer-release-gate.test.mjs",
  "tests/s216-error-notebook-gap-taxonomy.test.mjs",
  "tests/s217-personal-core-concept-graph.test.mjs",
  "tests/s218-similar-question-review-scheduler.test.mjs",
  "tests/s219-learner-catalog-usage-ledger.test.mjs",
  "tests/s220-billing-entitlement-credit-usage.test.mjs",
  "tests/s221-paid-trust-privacy-cost-guardrails.test.mjs",
  "tests/s222-academy-answer-operations-tenant-boundary.test.mjs",
  "tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs",
  "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
];

const POST_EXPIRY_DIAGNOSTIC_AT =
  new Date("2026-08-14T10:00:00.000Z");
const ACCEPTANCE_GATE_ISOLATION_AT =
  new Date("2026-07-29T01:00:00.000Z");

async function text(path) {
  return readFile(path, "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeAuthorityProse(value) {
  return value
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\bissue\s*#?\s*(\d+)\b/gi, "issue $1")
    .replace(/#\s*(\d+)\b/g, "issue $1")
    .replace(/[‐‑‒–—−-]+/g, " ")
    .replace(/[()[\]{}:/\\|,.;!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function markdownSections(source) {
  const headings = [...source.matchAll(/^#{1,6}\s+.+$/gm)];
  if (headings.length === 0) return [{ heading: "", body: source }];
  const sections = [];
  if (headings[0].index > 0) {
    sections.push({ heading: "", body: source.slice(0, headings[0].index) });
  }
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? source.length;
    sections.push({
      heading: heading[0].replace(/^#{1,6}\s+/, ""),
      body: source.slice(heading.index, end),
    });
  }
  return sections;
}

function staleCurrentStageAssertions(source) {
  const statePattern =
    /\b(?:current replacement stage|current authorized(?: but)? unstarted stage|current or sole next authorized unstarted stage|sole next replacement stage)\b/;
  const pairPattern = /\bc2r a(?: for)? issue 702\b/;
  const historicalPattern = /\b(?:historical|formerly|previously|predecessor|superseded)\b/;
  const stale = [];

  for (const section of markdownSections(source)) {
    for (const paragraph of section.body.split(/\n\s*\n/)) {
      const normalized = normalizeAuthorityProse(paragraph);
      const state = statePattern.exec(normalized);
      const pair = pairPattern.exec(normalized);
      if (!state || !pair || historicalPattern.test(normalized)) continue;
      const between = normalized.slice(
        Math.min(state.index + state[0].length, pair.index + pair[0].length),
        Math.max(state.index, pair.index),
      );
      const betweenWords = between.trim().split(/\s+/).filter(Boolean);
      const stateBeforePair = state.index < pair.index && betweenWords.length <= 4;
      const pairBeforeState =
        pair.index < state.index && /^(?:is\s+)?(?:the\s*)?$/.test(between.trim());
      if (stateBeforePair || pairBeforeState) {
        stale.push({ heading: section.heading, normalized });
      }
    }
  }
  return stale;
}

function currentAuthorityTuple(section) {
  const normalized = normalizeAuthorityProse(section.body);
  return {
    roadmapItem: /\bwcv c2\b/.test(normalized) ? "WCV-C2" : null,
    campaign: /\bcampaign c2\b/.test(normalized) ? "C2" : null,
    trackerIssue: /\btracker issue 717\b/.test(normalized) ? 717 : null,
    currentStage: /\bc2r b(?: for)? issue 714\b/.test(normalized) ? "C2R-B" : null,
    currentStageIssue: /\bc2r b(?: for)? issue 714\b/.test(normalized) ? 714 : null,
  };
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

  return { program, items, byId: new Map(items.map((item) => [item.id, item])) };
}

function replaceItemStatus(source, itemId, status) {
  const marker = `  - id: ${itemId}\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing roadmap item ${itemId}`);
  const next = source.indexOf("\n  - id: ", start + marker.length);
  const end = next === -1 ? source.length : next;
  const block = source.slice(start, end);
  const updated = block.replace(
    /\n    status: [^\n]+/,
    `\n    status: ${status}`,
  );
  assert.notEqual(updated, block, `missing status for ${itemId}`);
  return source.slice(0, start) + updated + source.slice(end);
}

function completeDependencyClosure(source, itemId) {
  const roadmap = parseRoadmap(source);
  const visited = new Set();
  let completedSource = source;

  function complete(currentId) {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const item = roadmap.byId.get(currentId);
    assert.ok(item, `missing roadmap item ${currentId}`);
    for (const dependency of item.dependencies) complete(dependency);
    if (item.status !== "completed") {
      completedSource = replaceItemStatus(completedSource, currentId, "completed");
    }
  }

  complete(itemId);

  // This is a status-only synthetic fixture. It neither renews/removes an
  // approval nor establishes live readiness, changes authority metadata, or
  // changes execution state.
  const completedRoadmap = parseRoadmap(completedSource);
  for (const currentId of visited) {
    const originalItem = { ...roadmap.byId.get(currentId) };
    const completedItem = { ...completedRoadmap.byId.get(currentId) };
    delete originalItem.status;
    delete completedItem.status;
    assert.deepEqual(
      completedItem,
      originalItem,
      `${currentId} synthetic completion changed a non-status field`,
    );
  }

  return completedSource;
}

function analysisById(plan, itemId) {
  const analysis = plan.analyses.find((entry) => entry.itemId === itemId);
  assert.ok(analysis, `missing analysis for ${itemId}`);
  return analysis;
}

const EXPECTED_SEQUENCE = [
  "WCV-C3",
  "ULC-M1",
  "ULC-M2",
  "ULC-K1",
  "ULC-F1",
  "ULC-F2",
  "ULC-F3",
  "ULC-F4",
  "ULC-F5",
  "ULC-I1",
  "WCV-C4",
  "ULC-R1",
  "ULC-L1",
];

const EXPECTED_OWNED_PATHS = [
  "AGENTS.md",
  CONTRACT,
  "config/dabangil-unified-program-contract.json",
  "docs/dabangil-unified-program-contract.md",
  DECISION,
  "docs/inverge-master-roadmap.md",
  PARITY,
  VALIDATION,
  COMPLIANCE,
  WCV_C1_VALIDATION,
  "docs/strategy/ACTIVE-MASTER-PLAN.md",
  STRATEGY,
  "roadmap/active-program.yml",
  "scripts/run-node-tests.mjs",
  "tests/agent-factory-roadmap-runner.test.mjs",
  PREMIUM_ALIGNMENT_TEST,
  FOCUSED_TEST,
  WCV_RECONCILIATION_TEST,
  ...LIVE_ROADMAP_EXPECTATION_TESTS.slice(1),
];

test("keeps V13 sole and installs one subordinate ULC-0 authority", async () => {
  const [launch, unified, active, decision] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("docs/strategy/ACTIVE-MASTER-PLAN.md"),
    text(DECISION),
  ]);

  assert.equal(
    launch.contractVersion,
    "dabangil.unified_product_multisurface_launch.v1",
  );
  assert.equal(launch.decision.leadIssue, 719);
  assert.equal(
    launch.decision.relationshipToV13,
    "mandatory_subordinate_launch_amendment_not_active_master",
  );
  assert.equal(launch.decision.authorityInstalled, true);
  assert.equal(launch.decision.implementationStarted, false);
  assert.equal(unified.launchConvergenceAmendment.leadIssue, 719);
  assert.equal(unified.launchConvergenceAmendment.contract, CONTRACT);
  assert.match(active, /V13 remains the only active strategy entry point/);
  assert.match(active, /Unified Product and Multisurface Launch Convergence/);
  assert.match(active, /mandatory subordinate V13 launch amendment/);
  assert.match(decision, /It is not\nV14, V13\.1, a second active master/);
});

test("declares the exact final public product and three student surfaces", async () => {
  const launch = await json(CONTRACT);
  const product = launch.finalPublicProduct;

  assert.equal(
    product.publicName,
    "답안길 — 감정평가사 1·2차 통합 합격 운영체계",
  );
  assert.deepEqual(product.requiredPublicSurfaces, [
    "web",
    "ios_ipados",
    "android",
  ]);
  assert.deepEqual(product.studentSurfaces, product.requiredPublicSurfaces);
  assert.equal(new Set(product.requiredPublicSurfaces).size, 3);
  assert.equal(product.instructorPrimarySurface, "web");
  assert.equal(product.completeInstructorConsoleOnStudentApps, false);
  assert.equal(product.studentAppsMayConsumeInstructorAssignments, true);
  assert.equal(product.studentAppsMayConsumeApprovedInstructorFeedback, true);
  assert.equal(product.singleAuthoritativeLearnerStateAcrossSurfaces, true);
});

test("requires the complete free-limited public 1.0 module set", async () => {
  const route = (await json(CONTRACT)).publicOneZero;

  assert.equal(route.routeId, "ULC-L1");
  assert.equal(route.releaseClass, "free_limited_public_1_0");
  assert.deepEqual(route.requiredModules.command, ["Today", "Review Queue"]);
  assert.deepEqual(route.requiredModules.firstRoundFiveSubjectMcq, [
    "Civil Law",
    "Economics",
    "Real Estate Principles",
    "Appraisal-related Law",
    "Accounting",
  ]);
  assert.deepEqual(route.requiredModules.secondRoundTrustedRepair, [
    "Practice",
    "Theory",
    "Law",
  ]);
  for (const capability of [
    "camera/PDF capture",
    "editable OCR confirmation",
    "direct repair",
    "D+1",
    "D+7",
    "transfer/reopening",
    "Concept Decoder",
    "Formula Graph",
    "learner-specific automatic notes",
    "data export",
    "answer deletion",
    "account deletion",
    "AI/source/currentness/human-review status",
  ]) {
    const flat = Object.values(route.requiredModules).flat();
    assert.ok(flat.includes(capability), capability);
  }
});

test("separates free launch from paid, efficacy and commercial claims", async () => {
  const [launch, unified] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const route = launch.publicOneZero;
  const paid = launch.paidEvidenceRoute;
  const gate = launch.legacyPublicPaidLaunchGate;

  assert.equal(route.priorPrivateFoundingBetaRequirementSupersededForThisRouteOnly, true);
  assert.equal(route.paidCohortRequired, false);
  assert.equal(route.paidConversionEvidenceRequired, false);
  assert.equal(route.inAppPurchaseCtaAllowed, false);
  assert.equal(route.paymentActivationAuthorized, false);
  assert.equal(route.betaLabelRequiredSolelyBecauseMarketFitOrEfficacyIsUnproven, false);
  for (const key of [
    "commercialReadinessClaimAuthorized",
    "retentionClaimAuthorized",
    "efficacyClaimAuthorized",
    "scoreGainClaimAuthorized",
    "passRateClaimAuthorized",
    "causalClaimAuthorized",
  ]) {
    assert.equal(route[key], false, key);
  }
  assert.deepEqual(route.supportStates, [
    "supported",
    "limited",
    "AI-assisted",
    "human-unreviewed",
    "source-currentness-required",
    "blocked",
  ]);
  assert.equal(paid.startsAfter, "ULC-L1");
  assert.deepEqual(paid.sequence, [
    "O4W",
    "WCV-C5",
    "WCV-C6",
    "SEPARATE-PAYMENT-PAID-CLAIM-ACTIVATION-AUTHORITY",
  ]);
  assert.equal(paid.paymentActivationRequiresSeparateExactOwnerAuthorization, true);
  assert.equal(paid.freeLimitedRouteEstablishesAnyPaidEvidenceState, false);
  assert.deepEqual(gate, {
    roadmapItemId: "S225",
    requiredDependenciesExactly: ["O4D", "WCV-C6"],
    independentOwnerAuthorization: "O4D",
    terminalPaidEvidenceRoute: "WCV-C6",
    bothDependenciesRequired: true,
    crossSubstitutionAllowed: false,
    explicitTargetBypassAllowed: false,
    currentActivationAuthorized: false,
    automaticStartAllowed: false,
    learnerActivationAuthorized: false,
    paymentActivationAuthorized: false,
    publicReleaseAuthorized: false,
  });
  assert.deepEqual(unified.launchConvergenceAmendment.legacyPublicPaidLaunchGate, gate);
  assert.deepEqual(
    unified.launchConvergenceAmendment.activeRoadmapDependencyMirror,
    launch.activeRoadmapDependencyMirror,
  );
});

test("preserves the exact WCV-C2R graph, roadmap block and 21-row matrix", async () => {
  const [launch, unified, roadmap, matrix] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("docs/qa/wcv-c2-replacement-regression-matrix.md"),
  ]);
  const preserved = launch.preservedCurrentAuthority;
  const roadmapBlock = roadmap.match(
    /^  - id: WCV-C2\n[\s\S]*?(?=^  - id: WCV-C3\n)/m,
  )?.[0];
  const rows = matrix.split(/\r?\n/).filter((line) => /^\| \d+ \|/.test(line));

  assert.equal(
    sha256(JSON.stringify(unified.wcvCampaignOverlay.c2StructuralRecovery)),
    preserved.wcvC2StructuralRecoveryCanonicalSha256,
  );
  assert.equal(sha256(roadmapBlock), preserved.roadmapWcvC2BlockSha256);
  assert.equal(sha256(matrix), preserved.regressionMatrixSha256);
  assert.equal(rows.length, preserved.regressionMatrixRowCount);
  assert.deepEqual(preserved.replacementStageChain, [
    "C2R-A",
    "C2R-B",
    "C2R-C-P",
    "C2R-C-T",
    "C2R-C-L",
  ]);
});

test("keeps C2R-B as the sole implementation selection after C2R-A with one writer", async () => {
  const [launch, unified, roadmapSource, unifiedMarkdown, foundry] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("docs/dabangil-unified-program-contract.md"),
    json("config/dabangil-rights-safe-adaptive-variant-foundry-v1.json"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    roadmapSource,
    POST_EXPIRY_DIAGNOSTIC_AT,
  );
  const preserved = launch.preservedCurrentAuthority;
  const authorityGraph =
    unified.wcvCampaignOverlay.c2StructuralRecovery.authorityGraph;
  const c2Campaign = unified.wcvCampaignOverlay.campaigns.find(
    (campaign) => campaign.id === "C2",
  );
  const expectedCurrentStage = {
    roadmapItem: "WCV-C2",
    campaign: "C2",
    trackerIssue: 717,
    currentStage: "C2R-B",
    currentStageIssue: 714,
  };
  const currentStageMirrors = {
    activeRoadmap: {
      roadmapItem: roadmap.program.soleNextImplementationItem,
      campaign: roadmap.program.soleNextImplementationCampaign,
      trackerIssue: roadmap.program.soleNextImplementationTrackerIssue,
      currentStage: roadmap.program.soleNextReplacementStage,
      currentStageIssue: roadmap.program.soleNextReplacementStageIssue,
    },
    roadmapContract: {
      roadmapItem: unified.roadmapContract.soleNextImplementationItemId,
      campaign: unified.roadmapContract.soleNextImplementationCampaignId,
      trackerIssue: unified.roadmapContract.soleNextImplementationTrackerIssue,
      currentStage: unified.roadmapContract.soleNextReplacementStageId,
      currentStageIssue: unified.roadmapContract.soleNextReplacementStageIssue,
    },
    wcvCampaignOverlay: {
      roadmapItem: c2Campaign.roadmapItemId,
      campaign: unified.wcvCampaignOverlay.soleNextImplementationCampaign,
      trackerIssue: unified.wcvCampaignOverlay.soleNextImplementationTrackerIssue,
      currentStage: unified.wcvCampaignOverlay.soleNextReplacementStage,
      currentStageIssue: unified.wcvCampaignOverlay.soleNextReplacementStageIssue,
    },
    launchConvergenceAmendment: {
      roadmapItem: unified.launchConvergenceAmendment.soleNextImplementationItem,
      campaign: unified.launchConvergenceAmendment.soleNextImplementationCampaign,
      trackerIssue: unified.launchConvergenceAmendment.structuralRecoveryTrackerIssue,
      currentStage: unified.launchConvergenceAmendment.soleNextReplacementStage,
      currentStageIssue:
        unified.launchConvergenceAmendment.soleNextReplacementStageIssue,
    },
    preservedCurrentAuthority: {
      roadmapItem: preserved.roadmapItemId,
      campaign: preserved.campaignId,
      trackerIssue: preserved.recoveryTrackerIssue,
      currentStage: preserved.currentReplacementStageId,
      currentStageIssue: preserved.currentReplacementStageIssue,
    },
    authorityGraph: {
      roadmapItem: authorityGraph.roadmapItemId,
      campaign: authorityGraph.campaignId,
      trackerIssue: authorityGraph.recoveryTrackerIssue,
      currentStage: authorityGraph.currentReplacementStageId,
      currentStageIssue: authorityGraph.currentReplacementStageIssue,
    },
  };

  for (const [mirror, tuple] of Object.entries(currentStageMirrors)) {
    assert.deepEqual(tuple, expectedCurrentStage, mirror);
  }

  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C2");
  assert.equal(roadmap.program.soleNextImplementationCampaign, "C2");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 717);
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, 717);
  assert.equal(roadmap.program.soleNextReplacementStage, "C2R-B");
  assert.equal(roadmap.program.soleNextReplacementStageIssue, 714);
  assert.equal(roadmap.program.globalMergeProducingWriterLimit, 1);
  assert.equal(roadmap.program.replacementStageAutomaticStartAllowed, false);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, "WCV-C2");
  assert.equal(unified.roadmapContract.soleNextImplementationCampaignId, "C2");
  assert.equal(unified.roadmapContract.soleNextReplacementStageId, "C2R-B");
  assert.equal(unified.roadmapContract.soleNextReplacementStageIssue, 714);
  assert.equal(preserved.currentReplacementStageState, "authorized_unstarted");
  assert.match(
    unifiedMarkdown,
    /completed source-only C2R-A\s+for Issue #702, and current authorized but unstarted replacement stage C2R-B\s+for Issue #714/,
  );
  assert.match(unifiedMarkdown, /post-merge next stage is C2R-B\/#714, authorized but unstarted/);

  const staleFixtures = [
    "current replacement stage `C2R-A` for #702",
    "current replacement stage\n`C2R-A`\nfor Issue #702",
    "current authorized-but-unstarted stage [C2R-A](https://example.test/stage) for `#702`",
    "sole next replacement stage C2R-A / Issue 702",
  ];
  for (const fixture of staleFixtures) {
    assert.equal(staleCurrentStageAssertions(fixture).length, 1, fixture);
  }
  for (const fixture of [
    "Historical sequence: C2R-A for Issue #702 preceded C2R-B for Issue #714.",
    "C2R-A/#702 is the predecessor of C2R-B/#714.",
    "C2R-A/#702 is complete source-only only after its merge and validated receipt.",
  ]) {
    assert.deepEqual(staleCurrentStageAssertions(fixture), [], fixture);
  }

  const authorityProsePaths = foundry.ownedPathsExactly.filter((path) => path.endsWith(".md"));
  const authorityProse = await Promise.all(
    authorityProsePaths.map(async (path) => [path, await text(path)]),
  );
  const staleCanonicalProse = authorityProse.flatMap(([path, source]) =>
    staleCurrentStageAssertions(source).map(({ heading, normalized }) => ({
      path,
      heading,
      normalized,
    })),
  );
  assert.deepEqual(staleCanonicalProse, []);

  const currentAuthoritySections = authorityProse.flatMap(([path, source]) =>
    markdownSections(source)
      .filter(({ heading }) => /\bcurrent authority\b/.test(normalizeAuthorityProse(heading)))
      .map((section) => ({ path, section })),
  );
  assert.ok(currentAuthoritySections.length > 0);
  for (const { path, section } of currentAuthoritySections) {
    assert.deepEqual(currentAuthorityTuple(section), expectedCurrentStage, `${path}:${section.heading}`);
  }
  assert.equal(plan.globalMergeProducingWriterLimit, 1);
  assert.equal(plan.activeWriterCount, 0);
  assert.deepEqual(plan.selectedItemIds, ["WCV-C2"]);
});

test("installs a unique, resolved and fully gated complete-vertical sequence", async () => {
  const launch = await json(CONTRACT);
  const stages = launch.futureCompleteVerticalSequence.stages;
  const ids = stages.map((stage) => stage.id);

  assert.deepEqual(ids, EXPECTED_SEQUENCE);
  assert.deepEqual(stages.map((stage) => stage.order), [...Array(13)].map((_, i) => i + 1));
  assert.equal(new Set(ids).size, ids.length);
  for (const [index, stage] of stages.entries()) {
    for (const dependency of stage.dependencies) {
      if (dependency === "C2R-C-L") continue;
      assert.ok(ids.includes(dependency), `${stage.id}:${dependency}`);
      assert.ok(ids.indexOf(dependency) < index, `${stage.id}:${dependency}`);
    }
    assert.match(stage.outcomeType, /outcome$/);
    assert.equal(stage.state, "queued_future_gated", stage.id);
    assert.equal(stage.selected, false, stage.id);
    assert.equal(stage.started, false, stage.id);
    assert.equal(stage.automaticStartAllowed, false, stage.id);
  }
  for (const key of [
    "frameworkOnlyMandatoryPrAllowed",
    "apiOnlyMandatoryPrAllowed",
    "persistenceOnlyMandatoryPrAllowed",
    "uiOnlyMandatoryPrAllowed",
    "qaOnlyMandatoryPrAllowed",
  ]) {
    assert.equal(launch.futureCompleteVerticalSequence[key], false, key);
  }
});

test("mirrors the complete active-roadmap dependency graph without starting ULC items", async () => {
  const [source, unified, launch, historicalC1Validation] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
    json(CONTRACT),
    text(WCV_C1_VALIDATION),
  ]);
  const roadmap = parseRoadmap(source);
  const expectedDirectDependencies = new Map([
    ["WCV-C3", ["WCV-C2"]],
    ["ULC-M1", ["WCV-C3", "S241A"]],
    ["ULC-M2", ["ULC-M1"]],
    ["ULC-K1", ["ULC-M2"]],
    ["ULC-F1", ["ULC-K1", "S238B"]],
    ["ULC-F2", ["ULC-F1"]],
    ["ULC-F3", ["ULC-F2"]],
    ["ULC-F4", ["ULC-F3"]],
    ["ULC-F5", ["ULC-F4"]],
    ["ULC-I1", ["ULC-F5"]],
    ["WCV-C4", ["ULC-I1"]],
    ["ULC-R1", ["WCV-C4"]],
    ["ULC-L1", ["ULC-R1"]],
    ["O4W", ["ULC-L1"]],
    ["WCV-C5", ["WCV-C4", "O4W"]],
    ["WCV-C6", ["WCV-C5"]],
    ["O4D", ["S245C", "S242V"]],
    ["S225", ["O4D", "WCV-C6"]],
  ]);
  const ulcIds = [
    "ULC-M1",
    "ULC-M2",
    "ULC-K1",
    "ULC-F1",
    "ULC-F2",
    "ULC-F3",
    "ULC-F4",
    "ULC-F5",
    "ULC-I1",
    "ULC-R1",
    "ULC-L1",
  ];

  for (const [id, dependencies] of expectedDirectDependencies) {
    const item = roadmap.byId.get(id);
    assert.ok(item, id);
    assert.deepEqual(item.dependencies, dependencies, `${id} dependencies`);
  }
  for (const id of ulcIds) {
    const item = roadmap.byId.get(id);
    assert.equal(item.status, "queued", id);
    assert.equal(item.leadIssue, 719, id);
    assert.equal(item.automaticStartAllowed, false, id);
    assert.equal(item.selected, false, id);
    assert.equal(item.started, false, id);
  }

  const launchById = new Map(
    launch.futureCompleteVerticalSequence.stages.map((stage) => [stage.id, stage]),
  );
  assert.deepEqual(launchById.get("WCV-C4").dependencies, ["ULC-I1"]);
  assert.deepEqual(launchById.get("ULC-R1").dependencies, ["WCV-C4"]);
  assert.deepEqual(launchById.get("ULC-L1").dependencies, ["ULC-R1"]);
  assert.deepEqual(
    launchById.get("ULC-M1").operationalPrerequisites,
    ["S241A"],
  );
  assert.deepEqual(
    launchById.get("ULC-F1").operationalPrerequisites,
    ["S238B"],
  );
  assert.equal(unified.tracks.bothTrack.requiresAuthenticatedFirstAcceptance, true);
  assert.equal(unified.tracks.bothTrack.firstRoundAcceptanceItemId, "S238B");
  assert.equal(unified.tracks.bothTrack.firstRoundAcceptanceConsumerId, "ULC-F1");
  assert.equal(unified.tracks.bothTrack.requiresAuthenticatedSecondAcceptance, true);
  assert.equal(unified.tracks.bothTrack.secondRoundAcceptanceItemId, "S241A");
  assert.equal(unified.tracks.bothTrack.secondRoundAcceptanceConsumerId, "ULC-M1");
  assert.equal(unified.tracks.bothTrack.acceptanceSubstitutionAllowed, false);
  assert.equal(unified.tracks.bothTrack.masteryAutoTransferAllowed, false);
  assert.deepEqual(
    unified.wcvCampaignOverlay.campaigns.find(
      (campaign) => campaign.id === "C4",
    ).dependencies,
    ["ULC-I1"],
  );
  assert.deepEqual(
    unified.roadmapContract.frozenPaidCohortAuthorization.dependencies,
    ["ULC-L1"],
  );
  assert.deepEqual(
    Object.fromEntries(
      [...expectedDirectDependencies]
        .filter(([id]) => Object.hasOwn(launch.activeRoadmapDependencyMirror, id)),
    ),
    launch.activeRoadmapDependencyMirror,
  );
  assert.deepEqual(roadmap.program.launchConvergenceSequence, EXPECTED_SEQUENCE);
  assert.equal(roadmap.program.paidEvidenceRouteAfter, "ULC-L1");
  assert.match(historicalC1Validation, /2026-08-14 launch-order supersession/);
  for (const edge of [
    "WCV-C4: [ULC-I1]",
    "ULC-R1: [WCV-C4]",
    "ULC-L1: [ULC-R1]",
    "O4W: [ULC-L1]",
  ]) {
    assert.ok(historicalC1Validation.includes(edge), edge);
  }
  assert.match(
    historicalC1Validation,
    /C1 entries below remain historical validation evidence and are not current\nroadmap or dependency authority/,
  );

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    assert.equal(visiting.has(id), false, `dependency cycle at ${id}`);
    visiting.add(id);
    for (const dependency of roadmap.byId.get(id)?.dependencies ?? []) {
      visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of roadmap.byId.keys()) visit(id);
});

test("requires both independent S225 gates across all four completion combinations", async () => {
  const source = await text("roadmap/active-program.yml");
  const ownerOnly = completeDependencyClosure(source, "O4D");
  const evidenceOnly = completeDependencyClosure(source, "WCV-C6");
  const both = completeDependencyClosure(ownerOnly, "WCV-C6");
  const cases = [
    ["neither", source, "blocked", ["O4D", "WCV-C6"]],
    ["owner only", ownerOnly, "blocked", ["WCV-C6"]],
    ["evidence only", evidenceOnly, "blocked", ["O4D"]],
    ["both", both, "ready", []],
  ];

  for (const [label, fixture, readinessStatus, missingDependencies] of cases) {
    const analysis = analysisById(
      createRoadmapRunnerPlanFromYamlAt(
        fixture,
        ACCEPTANCE_GATE_ISOLATION_AT,
      ),
      "S225",
    );
    assert.equal(analysis.readinessStatus, readinessStatus, label);
    assert.deepEqual(analysis.missingDependencies, missingDependencies, label);
  }

  const roadmap = parseRoadmap(source);
  assert.deepEqual(roadmap.byId.get("O4D").dependencies, ["S245C", "S242V"]);
  assert.deepEqual(roadmap.byId.get("S225").dependencies, ["O4D", "WCV-C6"]);
});

test("keeps status-only completion fail-closed after transitive approval expiry", async () => {
  const source = await text("roadmap/active-program.yml");
  const roadmap = parseRoadmap(source);
  const o3a = roadmap.byId.get("O3A");

  assert.ok(o3a, "missing O3A roadmap item");
  assert.equal(o3a.approvalExpiresAt, "2026-08-09T14:59:59.000Z");
  assert.match(
    o3a.approvalExpiresAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  const approvalExpiresAtEpochMs = Date.parse(o3a.approvalExpiresAt);
  assert.ok(Number.isFinite(approvalExpiresAtEpochMs));
  assert.equal(
    new Date(approvalExpiresAtEpochMs).toISOString(),
    o3a.approvalExpiresAt,
  );
  assert.ok(
    ACCEPTANCE_GATE_ISOLATION_AT.getTime() < approvalExpiresAtEpochMs,
  );
  assert.ok(
    POST_EXPIRY_DIAGNOSTIC_AT.getTime() >= approvalExpiresAtEpochMs,
  );

  // The original post-expiry instant proves that changing status alone cannot
  // launder the expired O3A approval into effective downstream completion.
  const throughKnowledgeRepair = completeDependencyClosure(source, "ULC-K1");
  const completedRoadmap = parseRoadmap(throughKnowledgeRepair);
  assert.equal(completedRoadmap.byId.get("ULC-K1").status, "completed");
  assert.equal(
    completedRoadmap.byId.get("O3A").approvalExpiresAt,
    o3a.approvalExpiresAt,
  );

  const postExpiryPlan = createRoadmapRunnerPlanFromYamlAt(
    throughKnowledgeRepair,
    POST_EXPIRY_DIAGNOSTIC_AT,
  );
  const ulcF1 = analysisById(postExpiryPlan, "ULC-F1");
  assert.equal(ulcF1.readinessStatus, "blocked");
  assert.deepEqual(ulcF1.missingDependencies, ["ULC-K1", "S238B"]);
  assert.deepEqual(
    ulcF1.blockedReasons.map(({ code, dependencyId }) => ({
      code,
      dependencyId,
    })),
    [
      { code: "expired_dependency", dependencyId: "ULC-K1" },
      { code: "missing_dependency", dependencyId: "S238B" },
    ],
  );
  const expiredPath = ulcF1.blockedReasons[0];
  assert.equal(expiredPath.dependencyExpiresAt, o3a.approvalExpiresAt);
  assert.equal(expiredPath.evaluatedAt, POST_EXPIRY_DIAGNOSTIC_AT.toISOString());
  assert.match(
    expiredPath.message,
    /effective completion was invalidated by a prerequisite approval/,
  );
});

test("keeps first- and second-round authenticated acceptance independent", async () => {
  const [source, agents, decision] = await Promise.all([
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
    text(DECISION),
  ]);
  const roadmap = parseRoadmap(source);
  const approvalExpiresAtEpochMs = Date.parse(
    roadmap.byId.get("O3A").approvalExpiresAt,
  );

  // This controlled pre-expiry instant isolates only the two authenticated
  // acceptance gates; it is not a claim of current live readiness.
  assert.ok(
    ACCEPTANCE_GATE_ISOLATION_AT.getTime() < approvalExpiresAtEpochMs,
  );

  const firstAccepted = completeDependencyClosure(source, "S238B");
  const firstAcceptedThroughWcvC3 = completeDependencyClosure(
    firstAccepted,
    "WCV-C3",
  );
  const beforeSecondAcceptance = createRoadmapRunnerPlanFromYamlAt(
    firstAcceptedThroughWcvC3,
    ACCEPTANCE_GATE_ISOLATION_AT,
  );
  assert.equal(
    analysisById(beforeSecondAcceptance, "ULC-M1").readinessStatus,
    "blocked",
  );
  assert.deepEqual(
    analysisById(beforeSecondAcceptance, "ULC-M1").missingDependencies,
    ["S241A"],
  );

  const throughKnowledgeRepair = completeDependencyClosure(source, "ULC-K1");
  const beforeFirstAcceptance = createRoadmapRunnerPlanFromYamlAt(
    throughKnowledgeRepair,
    ACCEPTANCE_GATE_ISOLATION_AT,
  );
  assert.equal(
    analysisById(beforeFirstAcceptance, "ULC-F1").readinessStatus,
    "blocked",
  );
  assert.deepEqual(
    analysisById(beforeFirstAcceptance, "ULC-F1").missingDependencies,
    ["S238B"],
  );
  assert.equal(
    analysisById(beforeFirstAcceptance, "ULC-K1").readinessStatus,
    "completed",
  );

  const bothAccepted = completeDependencyClosure(
    throughKnowledgeRepair,
    "S238B",
  );
  const afterBothAcceptances = createRoadmapRunnerPlanFromYamlAt(
    bothAccepted,
    ACCEPTANCE_GATE_ISOLATION_AT,
  );
  const ulcF1 = analysisById(afterBothAcceptances, "ULC-F1");
  assert.equal(
    ulcF1.readinessStatus,
    "ready",
  );
  assert.deepEqual(ulcF1.missingDependencies, []);
  assert.ok(afterBothAcceptances.readyItemIds.includes("ULC-F1"));

  const bothAcceptedRoadmap = parseRoadmap(bothAccepted);
  for (const [id, dependency] of [
    ["ULC-F2", "ULC-F1"],
    ["ULC-F3", "ULC-F2"],
    ["ULC-F4", "ULC-F3"],
    ["ULC-F5", "ULC-F4"],
  ]) {
    assert.deepEqual(bothAcceptedRoadmap.byId.get(id).dependencies, [dependency]);
  }
  for (const id of ["ULC-F1", "ULC-F2", "ULC-F3", "ULC-F4", "ULC-F5"]) {
    const item = bothAcceptedRoadmap.byId.get(id);
    assert.equal(item.selected, false, `${id} selected`);
    assert.equal(item.started, false, `${id} started`);
  }

  assert.match(
    agents,
    /Neither acceptance evidence nor mastery may substitute or transfer from one\ntrack to the other\./,
  );
  assert.match(
    decision,
    /Acceptance evidence and mastery may not\nsubstitute or transfer in either direction\./,
  );
});

test("records the native architecture without creating or installing it", async () => {
  const launch = await json(CONTRACT);
  const architecture = launch.architecture;

  assert.equal(architecture.webAndTrustedHttpApi.framework, "existing Next.js");
  assert.equal(architecture.webAndTrustedHttpApi.hosting, "Vercel");
  assert.equal(
    architecture.webAndTrustedHttpApi.versionedMobileConsumableHttpApiRequired,
    true,
  );
  assert.equal(architecture.nativeStudentApps.framework, "Expo React Native");
  assert.equal(architecture.nativeStudentApps.navigation, "Expo Router");
  assert.equal(
    architecture.nativeStudentApps.buildSubmitWorkflow,
    "EAS Build, Submit and Workflows",
  );
  assert.equal(architecture.nativeStudentApps.nativeEndToEndVerification, "Maestro");
  assert.equal(architecture.authoritativePersistence, "existing Supabase/Postgres");
  assert.equal(architecture.mobileDependenciesInstalledOrPinnedByThisAuthority, false);
  assert.equal(architecture.futureRepositoryShapeCreatedByThisAuthority, false);
  assert.equal(architecture.existingRootNextApplicationRemainsInPlace, true);
  assert.equal(architecture.moveWebApplicationToAppsWebByThisAuthority, false);
  assert.equal(existsSync("apps/mobile"), false);
  for (const prohibited of [
    "REMOTE_WEBSITE_ONLY_WEBVIEW_AS_FINAL_APP",
    "STATIC_EXPORT_EXISTING_SERVER_APP_AS_FINAL_NATIVE_APP",
    "SEPARATE_WEB_AND_MOBILE_MASTERY_TRUTH",
    "CLIENT_SET_MASTERY_VERIFIED_OR_SOURCE_CURRENTNESS",
    "SERVICE_ROLE_EXPOSURE_TO_MOBILE",
    "RAW_ANSWER_OCR_CONCEPT_SCORE_OR_PRIVATE_TEXT_IN_PUSH_PAYLOAD",
    "CRITICAL_LEARNER_BEHAVIOR_ONLY_IN_FRAMEWORK_PRIVATE_SERVER_ACTIONS",
  ]) {
    assert.ok(architecture.prohibitions.includes(prohibited), prohibited);
  }
});

test("defines Concept Decoder and Formula Graph as typed error repair", async () => {
  const launch = await json(CONTRACT);

  assert.equal(
    launch.conceptDecoder.productType,
    "structured_learner_error_repair_not_generic_ai_summary",
  );
  assert.deepEqual(launch.conceptDecoder.requiredFields, [
    "term and Hanja/English/symbol breakdown",
    "intuitive explanation",
    "precise exam definition",
    "analogy and analogy limitations",
    "applicability conditions",
    "common confusions",
    "exam-writing layer",
    "learner-error provenance",
    "retrieval prompts",
    "D+1/D+7 scheduling",
  ]);
  assert.equal(
    launch.formulaGraph.productType,
    "typed_relation_object_not_free_form_formatted_text",
  );
  assert.deepEqual(launch.formulaGraph.requiredFields, [
    "expression",
    "variables",
    "units",
    "causal direction",
    "applicability conditions",
    "derived forms",
    "rounding/sign constraints",
    "common error patterns",
    "exact source/version",
    "link to learner actual failed attempt",
  ]);
});

test("keeps explanation separate from reconstruction and independent mastery evidence", async () => {
  const authority = (await json(CONTRACT)).learningStateAuthority;

  assert.equal(authority.easyExplanationAloneCreatesMasteryEvidence, false);
  assert.equal(authority.learnerReconstructionMayChangeLearningState, true);
  assert.equal(authority.laterIndependentPerformanceMayChangeLearningState, true);
  assert.equal(authority.visibleCueOrExplanationMayEstablishStableMastery, false);
  assert.equal(authority.serverAuthoritativeAcrossAllSurfaces, true);
});

test("requires in-app and external-Web deletion plus store disclosures", async () => {
  const [launch, compliance] = await Promise.all([
    json(CONTRACT),
    text(COMPLIANCE),
  ]);
  const required = launch.storeAndCompliance.required;

  for (const item of [
    "App Store in-app account deletion",
    "Google Play in-app account deletion",
    "external Web deletion resource",
    "privacy policy",
    "Apple App Privacy declarations",
    "Google Data Safety declarations",
    "AI-generated/AI-assisted result disclosure",
    "source/currentness date",
    "human-review state",
    "notification privacy",
    "camera/photo/file permission minimization",
    "app-review demo account",
    "delete/export verification",
  ]) {
    assert.ok(required.includes(item), item);
  }
  assert.equal(launch.storeAndCompliance.notificationPayloadPrivateContentAllowed, false);
  assert.match(compliance, /In-app account deletion/);
  assert.match(compliance, /External deletion resource/);
  assert.match(compliance, /no answer\/OCR\/concept\/score\/private text/);
});

test("binds one coordinated release manifest and a maximum 24-hour window", async () => {
  const release = (await json(CONTRACT)).coordinatedRelease;

  assert.equal(release.manifestType, "DabangilReleaseManifestV1");
  assert.deepEqual(release.requiredFields, [
    "releaseId",
    "publicVersion",
    "gitHead",
    "gitTree",
    "webDeployment",
    "iosBundleIdVersionBuildEasBuild",
    "androidPackageVersionVersionCodeEasBuild",
    "apiEvidenceValidatorVersions",
    "migrationSetDigest",
    "privacyPolicyVersion",
    "aiDisclosureVersion",
    "accountDeletionVerification",
    "storeMetadataDigest",
    "perSurfaceFinalGateStatus",
  ]);
  assert.equal(release.iosApprovedAndHeldForManualRelease, true);
  assert.equal(
    release.androidApprovedAndHeldThroughManagedPublishingOrExactEquivalent,
    true,
  );
  assert.equal(release.webBehindFinalPublicGateUntilReleaseCommand, true);
  assert.ok(release.maximumAvailabilityWindowHours <= 24);
  assert.equal(release.currentPublicReleaseAuthorized, false);
});

test("denies every current activation class", async () => {
  const launch = await json(CONTRACT);
  for (const key of [
    "runtimeAuthorized",
    "applicationMutationAuthorized",
    "firstRoundRuntimeAuthorized",
    "mobileRuntimeAuthorized",
    "instructorRuntimeAuthorized",
    "learnerActivationAuthorized",
    "providerActivationAuthorized",
    "paymentActivationAuthorized",
    "storeSubmissionAuthorized",
    "deploymentAuthorized",
    "productionAuthorized",
    "automaticStartAllowed",
  ]) {
    assert.equal(launch.decision[key], false, key);
  }
  assert.equal(launch.paidEvidenceRoute.currentPaymentActivationAuthorized, false);
  assert.equal(launch.coordinatedRelease.currentPublicReleaseAuthorized, false);
});

test("keeps parity and compliance documents aligned with the machine authority", async () => {
  const [parity, compliance, strategy, validation] = await Promise.all([
    text(PARITY),
    text(COMPLIANCE),
    text(STRATEGY),
    text(VALIDATION),
  ]);

  assert.match(parity, /Web, iOS\/iPadOS, Android/);
  assert.match(parity, /one server-authoritative state/);
  assert.match(parity, /Offline drafts are unsynchronized input/);
  assert.match(compliance, /DabangilReleaseManifestV1/);
  assert.match(compliance, /at most 24 hours/);
  assert.match(strategy, /ULC-L1 → O4W → WCV-C5 → WCV-C6/);
  assert.match(validation, /PRR_kwDOSMHn8M8AAAABJjst-w/);
  assert.match(validation, /final exact-head review must report[\s\S]*P0\/P1\/P2 = 0\/0\/0/);
});

test("declares the exact thirty-one-path source-only ownership boundary", async () => {
  const [launch, decision] = await Promise.all([json(CONTRACT), text(DECISION)]);
  const manifest = decision.match(/## 12\. Exact owned-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  assert.deepEqual(launch.ownedPathsExactly, EXPECTED_OWNED_PATHS);
  assert.deepEqual(paths, EXPECTED_OWNED_PATHS);
  assert.equal(new Set(paths).size, 31);
  for (const path of paths) {
    assert.doesNotMatch(
      path,
      /^(?:app|components|lib\/review-os|supabase|\.github\/workflows|apps\/mobile|packages)\//,
      path,
    );
    assert.doesNotMatch(path, /(?:^|\/)(?:package\.json|[^/]*lock[^/]*)$/, path);
  }
});

test("guards every default-suite live-roadmap S225 expectation against stale single gating", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  const exact = /assert\.deepEqual\(s225\??\.missingDependencies, \["O4D", "WCV-C6"\]\);/g;
  const stale = /assert\.deepEqual\(s225\??\.missingDependencies, \["O4D"\]\);/g;

  assert.equal(LIVE_ROADMAP_EXPECTATION_TESTS.length, 14);
  for (const path of LIVE_ROADMAP_EXPECTATION_TESTS) {
    const source = await text(path);
    assert.equal(source.includes("roadmap/active-program.yml"), true, path);
    assert.equal(source.match(exact)?.length ?? 0, 1, path);
    assert.equal(source.match(stale)?.length ?? 0, 0, path);
    assert.equal(runner.match(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length ?? 0, 1, path);
  }
});

test("registers the focused authority test exactly once", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  const matches = runner.match(
    /tests\/dabangil-unified-product-multisurface-launch-authority\.test\.mjs/g,
  ) ?? [];

  assert.equal(matches.length, 1);
});

test("keeps every authority artifact newline-terminated", async () => {
  for (const path of EXPECTED_OWNED_PATHS) {
    assert.equal((await text(path)).endsWith("\n"), true, path);
  }
});
