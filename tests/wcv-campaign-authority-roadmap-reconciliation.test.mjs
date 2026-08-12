import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";

const ACTIVE_MASTER =
  "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md";
const DECISION =
  "docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md";
const VALIDATION =
  "docs/qa/wcv-campaign-c1-authority-roadmap-reconciliation-validation.md";
const FOCUSED_TEST =
  "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs";

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

  return { program, items, byId: new Map(items.map((item) => [item.id, item])) };
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
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

function removeItem(source, itemId) {
  const marker = `  - id: ${itemId}\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing roadmap item ${itemId}`);
  const next = source.indexOf("\n  - id: ", start + marker.length);
  const end = next === -1 ? source.length : next;
  return source.slice(0, start) + source.slice(end + (next === -1 ? 0 : 1));
}

function analysisById(plan, itemId) {
  const analysis = plan.analyses.find((entry) => entry.itemId === itemId);
  assert.ok(analysis, `missing analysis for ${itemId}`);
  return analysis;
}

test("keeps V13 as the sole active master and WCV 1.0.8 subordinate", async () => {
  const [pointer, roadmapSource, unified, wcv, decision] = await Promise.all([
    text("docs/strategy/ACTIVE-MASTER-PLAN.md"),
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
    json("config/dabangil-appraiser-second-world-class-vertical-v1.json"),
    text(DECISION),
  ]);
  const roadmap = parseRoadmap(roadmapSource);

  assert.match(pointer, /V13 remains the only active strategy entry point/);
  assert.match(pointer, /Appraiser Second WCV 1\.0\.8 — subordinate vertical execution standard/);
  assert.equal(roadmap.program.activeMasterPlan, ACTIVE_MASTER);
  assert.equal(unified.wcvCampaignOverlay.activeMasterPlan, ACTIVE_MASTER);
  assert.equal(unified.wcvCampaignOverlay.relationshipToV13, "subordinate_execution_campaign_not_active_master");
  assert.equal(unified.wcvCampaignOverlay.wcvBehaviorContractVersion, "1.0.8");
  assert.equal(unified.wcvCampaignOverlay.wcvBehaviorContractVersionBumped, false);
  assert.equal(wcv.version, "1.0.8");
  assert.equal(wcv.role.relationshipToV13, "subordinate_execution_standard_not_new_master_plan");
  assert.equal(wcv.role.mayReplaceActiveMasterPlan, false);
  assert.match(decision, /No V14, V13\.1, second active master/);
});

test("installs exactly one dated C1 Owner decision with a source-only boundary", async () => {
  const [decision, unified] = await Promise.all([
    text(DECISION),
    json("config/dabangil-unified-program-contract.json"),
  ]);

  assert.match(decision, /status: "owner-decision\/approved-source-only"/);
  assert.match(decision, /lead_issue: 713/);
  assert.match(decision, /runtime_authorization: "none"/);
  assert.equal(unified.contractVersion, "dabangil.unified_program.v3");
  assert.equal(unified.campaignDeliveryDecision.decisionRecord, DECISION);
  for (const key of [
    "runtimeAuthorized",
    "applicationAuthorized",
    "realContentAuthorized",
    "learnerActivationAuthorized",
    "commercialActivationAuthorized",
    "productionAuthorized",
  ]) {
    assert.equal(unified.campaignDeliveryDecision[key], false, key);
  }
});

test("reconciles two truthful blocked reservations with one delivery slot", async () => {
  const roadmapSource = await text("roadmap/active-program.yml");
  const roadmap = parseRoadmap(roadmapSource);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    roadmapSource,
    new Date("2026-08-11T08:00:00.000Z"),
  );

  assert.equal(roadmap.program.wipLimit, 3);
  assert.equal(roadmap.program.blockedControlPlaneReservationCount, 2);
  assert.equal(roadmap.program.mergeProducingDeliverySlotCount, 1);
  assert.equal(roadmap.program.globalMergeProducingWriterLimit, 1);
  assert.equal(roadmap.program.wipLimitDoesNotAuthorizeWriterCount, true);
  assert.equal(plan.wipLimit, 3);
  assert.equal(plan.wipOccupiedCount, 2);
  assert.equal(plan.availableSlots, 1);
  assert.equal(plan.globalMergeProducingWriterLimit, 1);
  assert.equal(plan.activeWriterCount, 0);
  assert.equal(plan.availableWriterSlots, 1);
  assert.equal(plan.selectionSlots, 1);
  assert.deepEqual(plan.selectedItemIds, ["WCV-C3"]);
});

test("preserves CPF-1 and S236P factual blocked states without bypass", async () => {
  const [roadmapSource, unified] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const cpf1 = roadmap.byId.get("CPF-1");
  const s236p = roadmap.byId.get("S236P");

  assert.equal(cpf1.status, "blocked");
  assert.equal(cpf1.executionState, "blocked_unknown_reachable_sinks");
  assert.equal(cpf1.cpf1Complete, false);
  assert.equal(cpf1.nextWorkAuthorized, false);
  assert.equal(s236p.status, "blocked");
  assert.equal(s236p.executionState, "acceptance_blocked");
  assert.equal(s236p.acceptanceCompleted, false);
  assert.equal(s236p.terminalPass, false);
  assert.equal(s236p.nextLiveAttemptAuthorized, false);
  assert.equal(unified.wcvCampaignOverlay.legacyFactualGates["CPF-1"].bypassAllowed, false);
  assert.equal(unified.wcvCampaignOverlay.legacyFactualGates.S236P.bypassAllowed, false);
});

test("records C2 complete and makes C3 led by #706 the sole selected next campaign", async () => {
  const [roadmapSource, unified] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const campaigns = unified.wcvCampaignOverlay.campaigns;
  const next = campaigns.filter((campaign) => campaign.state === "sole_next_implementation_campaign");

  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C3");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 706);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "C3");
  assert.equal(next[0].leadIssue, 706);
  assert.deepEqual(next[0].includedIssues, [706, 707, 708]);
  assert.deepEqual(unified.wcvCampaignOverlay.laterCampaignsQueued, ["C4", "C5", "C6"]);
  assert.equal(roadmap.byId.get("WCV-C2").executionState, "completed_synthetic_default_off_vertical");
  assert.equal(roadmap.byId.get("WCV-C3").executionState, "sole_next_implementation_campaign");
});

test("installs the exact C1 through C6 dependency graph", async () => {
  const roadmap = parseRoadmap(await text("roadmap/active-program.yml"));
  const expected = {
    "WCV-0": { status: "completed", dependencies: ["S234R"] },
    "WCV-C1": { status: "completed", dependencies: ["WCV-0"] },
    "WCV-C2": { status: "completed", dependencies: ["WCV-C1"] },
    "WCV-C3": { status: "queued", dependencies: ["WCV-C2"] },
    "WCV-C4": { status: "queued", dependencies: ["WCV-C3"] },
    O4W: { status: "queued", dependencies: ["WCV-C4"] },
    "WCV-C5": { status: "queued", dependencies: ["WCV-C4", "O4W"] },
    "WCV-C6": { status: "queued", dependencies: ["WCV-C5"] },
  };

  for (const [id, value] of Object.entries(expected)) {
    const item = roadmap.byId.get(id);
    assert.ok(item, id);
    assert.equal(item.status, value.status, `${id} status`);
    assert.deepEqual(item.dependencies, value.dependencies, `${id} dependencies`);
    assert.equal(item.lockGroup, "wcv-vertical-campaign", `${id} lockGroup`);
  }
});

test("gates C5 on one queued unapproved O4W Owner authorization", async () => {
  const [roadmapSource, unified, contract] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
    text("docs/dabangil-unified-program-contract.md"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const o4w = roadmap.byId.get("O4W");
  const c5 = roadmap.byId.get("WCV-C5");
  const machineC5 = unified.wcvCampaignOverlay.campaigns.find(
    (campaign) => campaign.id === "C5",
  );
  const machineGate =
    unified.roadmapContract.frozenPaidCohortAuthorization;

  assert.deepEqual(o4w, {
    id: "O4W",
    title: "Owner WCV Frozen Paid Cohort Manifest Authorization",
    status: "queued",
    executionState: "exact_frozen_cohort_authorization_unmet",
    decisionScope: "exact_frozen_cohort_manifest_activation_only",
    gatedCampaign: "WCV-C5",
    gatedIssue: 711,
    authorizationGranted: false,
    automaticStartAllowed: false,
    learnerActivationAuthorized: false,
    paymentActivationAuthorized: false,
    delayedEvidenceAuthorized: false,
    productionAuthorized: false,
    dependencies: ["WCV-C4"],
    lockGroup: "wcv-vertical-campaign",
    risk: "high",
    priority: 31.16,
  });
  assert.equal(c5.cohortAuthorizationGate, "O4W");
  assert.equal(c5.separateExactCohortAuthorizationRequired, true);
  assert.deepEqual(c5.dependencies, ["WCV-C4", "O4W"]);
  assert.equal(c5.priority, 31.17);
  assert.equal(roadmap.byId.get("WCV-C6").priority, 31.18);
  assert.equal(
    unified.ownerGates.O4W,
    "future_exact_frozen_paid_cohort_manifest_authorization_unapproved",
  );
  assert.equal(
    unified.roadmapContract.scopedGateEdges.frozenPaidCohortManifestAuthorization,
    "O4W",
  );
  assert.deepEqual(machineC5.dependencies, ["WCV-C4", "O4W"]);
  assert.equal(machineC5.cohortAuthorizationGate, "O4W");
  assert.deepEqual(machineC5.cohortAuthorization, {
    roadmapItemId: "O4W",
    decisionScope: "exact_frozen_cohort_manifest_activation_only",
    authorizationGranted: false,
    automaticStartAllowed: false,
    learnerActivationAuthorized: false,
    paymentActivationAuthorized: false,
    delayedEvidenceAuthorized: false,
    productionAuthorized: false,
  });
  assert.equal(machineGate.status, "queued");
  assert.equal(machineGate.authorizationGranted, false);
  assert.equal(machineGate.delayedEvidenceAuthorized, false);
  assert.match(contract, /O4W: exact frozen paid-cohort manifest authorization for WCV-C5 only/);
  assert.match(contract, /WCV-C5\s+depends on both WCV-C4 and O4W/);

  const c4Complete = ["WCV-C3", "WCV-C4"].reduce(
    (source, itemId) => replaceItemStatus(source, itemId, "completed"),
    roadmapSource,
  );
  const beforeAuthorization = createRoadmapRunnerPlanFromYamlAt(
    c4Complete,
    new Date("2026-08-11T08:00:00.000Z"),
  );
  assert.deepEqual(beforeAuthorization.selectedItemIds, ["O4W"]);
  assert.equal(analysisById(beforeAuthorization, "O4W").readinessStatus, "ready");
  assert.deepEqual(
    analysisById(beforeAuthorization, "WCV-C5").missingDependencies,
    ["O4W"],
  );

  const o4wComplete = replaceItemStatus(c4Complete, "O4W", "completed");
  const afterAuthorization = createRoadmapRunnerPlanFromYamlAt(
    o4wComplete,
    new Date("2026-08-11T08:00:00.000Z"),
  );
  assert.equal(analysisById(afterAuthorization, "WCV-C5").readinessStatus, "ready");
  assert.deepEqual(afterAuthorization.selectedItemIds, ["WCV-C5"]);

  const hostileWithoutGate = removeItem(roadmapSource, "O4W").replace(
    "dependencies: [WCV-C4, O4W]",
    "dependencies: [WCV-C4]",
  );
  assert.throws(() => {
    const hostile = parseRoadmap(hostileWithoutGate);
    assert.ok(hostile.byId.has("O4W"), "O4W gate must exist");
    assert.deepEqual(
      hostile.byId.get("WCV-C5").dependencies,
      ["WCV-C4", "O4W"],
    );
  });
});

test("removes one-issue-only language as the controlling PR rule", async () => {
  const agents = await text("AGENTS.md");

  assert.doesNotMatch(agents, /One issue produces one focused, reviewable pull request/);
  assert.doesNotMatch(agents, /must link exactly one GitHub issue/);
  assert.match(agents, /A complete learner-visible vertical may\n  close multiple adjacent child issues/);
  assert.match(agents, /Every included issue must be listed explicitly in the PR body/);
  assert.match(agents, /No issue may be silently or\n  partially declared complete/);
});

test("requires every complete vertical layer and rejects horizontal precursors", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const rule = unified.wcvCampaignOverlay.completeVerticalRule;

  assert.deepEqual(rule.requiredLayers, [
    "CONTRACT_AND_MACHINE_VALIDATION",
    "API_AND_STORAGE_PERSISTENCE",
    "RUNTIME_LOGIC",
    "LEARNER_UI",
    "FOCUSED_HOSTILE_AND_RUNTIME_EVIDENCE",
    "FEATURE_FLAG_AND_SAFE_DEFERRED_BEHAVIOR",
    "ROLLBACK_EVIDENCE",
  ]);
  assert.equal(rule.mandatoryContractOnlyPrecursorForSameBehaviorAllowed, false);
  assert.equal(rule.horizontalLayerSplitAllowed, false);
  assert.equal(rule.oversizedVerticalDisposition, "REDUCE_LEARNER_OUTCOME_KEEP_REQUIRED_LAYERS_TOGETHER");
});

test("supersedes standalone #702 and #714 prerequisite PRs", async () => {
  const [unified, contract, decision] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text("docs/dabangil-unified-program-contract.md"),
    text(DECISION),
  ]);

  assert.equal(unified.wcvCampaignOverlay.historicalStandaloneSequence.operative, false);
  assert.deepEqual(unified.wcvCampaignOverlay.historicalStandaloneSequence.sequence, [702, 714, 703]);
  assert.equal(unified.wcvCampaignOverlay.issue714Tracker.standalonePrerequisiteBeforeC2, false);
  assert.equal(unified.wcvCampaignOverlay.issue714Tracker.standaloneSourcePrRequired, false);
  assert.match(contract, /historical `#702 → #714 → #703` merge-gate sequence is explicitly\nsuperseded/);
  assert.match(decision, /standalone sequence `#702 source-only → #714 source-only → #703`/);
});

test("allocates every #714 requirement to C2, C3, C4 or C6 exactly once", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const tracker = unified.wcvCampaignOverlay.issue714Tracker;
  const allocationKeys = Object.keys(tracker.allocations);
  const allocated = allocationKeys.flatMap((key) => tracker.allocations[key]);

  assert.deepEqual(allocationKeys, ["C2", "C3", "C4", "C6"]);
  assert.equal(tracker.mergeProducing, false);
  assert.equal(tracker.behaviorImplementedByC1, false);
  assert.equal(new Set(allocated).size, allocated.length, "duplicate #714 allocation");
  assert.deepEqual(sorted(allocated), sorted(tracker.requirementInventory));
});

test("keeps C1 source evidence separate from runtime readiness", async () => {
  const [unified, roadmapSource, validation] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text(VALIDATION),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const c1 = unified.wcvCampaignOverlay.campaigns.find((campaign) => campaign.id === "C1");

  assert.equal(unified.wcvCampaignOverlay.runtimeMutationInC1, false);
  assert.equal(unified.wcvCampaignOverlay.applicationMutationInC1, false);
  assert.equal(c1.runtimeMutation, false);
  assert.equal(c1.currentRuntimeReadinessEstablished, false);
  assert.equal(roadmap.byId.get("WCV-C1").currentRuntimeReadinessEstablished, false);
  assert.match(validation, /runtime evidence: none/);
  assert.match(validation, /C2 implementation: not started/);
});

test("bounds review to one review, one correction and one verification", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const review = unified.wcvCampaignOverlay.reviewConvergence;

  assert.equal(review.reviewStartRequiresFeatureCompleteVertical, true);
  assert.equal(review.reviewStartRequiresFocusedValidation, true);
  assert.equal(review.reviewStartRequiresApplicableRuntimeEvidence, true);
  assert.equal(review.exactHeadFullVerticalReviewCount, 1);
  assert.equal(review.maximumBlockingCorrectionPasses, 1);
  assert.equal(review.maximumExactHeadCorrectionVerificationPasses, 1);
  assert.equal(review.p0Blocks, true);
  assert.equal(review.p1Blocks, true);
  assert.deepEqual(review.p2BlockingInvariantClasses, [
    "SAFETY",
    "RIGHTS",
    "PRIVACY",
    "EVIDENCE",
    "LEARNER_OUTCOME",
    "ROLLBACK",
  ]);
  assert.equal(review.recursiveReviewOrCorrectionAllowed, false);
  assert.equal(review.replacementPrDiffCopyLoopAllowed, false);
});

test("preserves current activation, privacy, evidence and commercial gates", async () => {
  const [wcv, decision, agents] = await Promise.all([
    json("config/dabangil-appraiser-second-world-class-vertical-v1.json"),
    text(DECISION),
    text("AGENTS.md"),
  ]);

  assert.equal(wcv.lanes.liveActivation.s236pActivationRevalidation.required, true);
  assert.equal(wcv.hardInvariants.practiceDeterministicConflictBlocksNumericRelease, true);
  assert.equal(wcv.hardInvariants.lawSourceOrEffectiveVersionConflictBlocksVerifiedRelease, true);
  assert.equal(wcv.hardInvariants.rawLearnerContentAsModelTrainingInputForbidden, true);
  assert.equal(wcv.lanes.commercialActivation.ownerPrivateAcceptanceMaySubstitute, false);
  assert.match(decision, /refund, false-charge and entitlement controls/);
  assert.match(agents, /Provide export\/delete behavior before paid launch/);
});

test("registers this focused reconciliation test exactly once", async () => {
  const runner = await text("scripts/run-node-tests.mjs");
  const matches = runner.match(/tests\/wcv-campaign-authority-roadmap-reconciliation\.test\.mjs/g) ?? [];
  assert.equal(matches.length, 1);
});

test("limits C1 to the declared 30 source and test paths", async () => {
  const decision = await text(DECISION);
  const manifest = decision.match(/## 11\. C1 changed-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  assert.equal(paths.length, 30);
  assert.equal(new Set(paths).size, 30);
  assert.equal(paths[29], "scripts/agent-factory-run.mjs");
  assert.deepEqual(
    paths.filter((path) => path.startsWith("lib/")),
    ["lib/agent-factory/roadmap-runner.ts"],
  );
  assert.deepEqual(
    paths.filter((path) => path.startsWith("scripts/")),
    [
      "scripts/run-node-tests.mjs",
      "scripts/automation/determine-next-task.mjs",
      "scripts/agent-factory-run.mjs",
    ],
  );
  for (const path of paths) {
    assert.doesNotMatch(path, /^(?:app|supabase|migrations)\//, path);
    if (path.startsWith("lib/")) {
      assert.equal(path, "lib/agent-factory/roadmap-runner.ts");
    }
  }
});

test("keeps all reconciliation source files newline-terminated", async () => {
  const decision = await text(DECISION);
  const manifest = decision.match(/## 11\. C1 changed-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  for (const path of paths) {
    assert.equal((await text(path)).endsWith("\n"), true, path);
  }
});
