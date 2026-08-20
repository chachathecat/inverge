import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  normalizeLineEndings,
  readTextFile,
} from "./platform-text.mjs";

const ACTIVE_MASTER =
  "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md";
const DECISION =
  "docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md";
const RECOVERY_DECISION =
  "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
const VALIDATION =
  "docs/qa/wcv-campaign-c1-authority-roadmap-reconciliation-validation.md";

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
  if (trimmed === "null") return null;
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
  source = normalizeLineEndings(source);
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
  return completedSource;
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

test("preserves the C1 decision and installs the later C2R source-contract boundary", async () => {
  const [decision, unified] = await Promise.all([
    text(DECISION),
    json("config/dabangil-unified-program-contract.json"),
  ]);

  assert.match(decision, /status: "owner-decision\/approved-source-only"/);
  assert.match(decision, /lead_issue: 713/);
  assert.match(decision, /runtime_authorization: "none"/);
  assert.equal(unified.contractVersion, "dabangil.unified_program.v4");
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
  assert.equal(
    unified.structuralRecoveryDecision.decisionRecord,
    RECOVERY_DECISION,
  );
  assert.equal(unified.structuralRecoveryDecision.leadIssue, 717);
  assert.equal(unified.structuralRecoveryDecision.terminalPr, 716);
  assert.equal(unified.structuralRecoveryDecision.wcvC2Complete, false);
  assert.equal(
    unified.structuralRecoveryDecision.replacementStageAutomaticStartAllowed,
    false,
  );
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

test("keeps WCV-C2 complete and selects WCV-C3 under the same campaign graph", async () => {
  const [roadmapSource, unified] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const campaigns = unified.wcvCampaignOverlay.campaigns;
  const selectedCampaigns = campaigns.filter(
    (campaign) => campaign.id === unified.wcvCampaignOverlay.soleNextImplementationCampaign,
  );
  const c3 = selectedCampaigns[0];
  const c2 = campaigns.find((campaign) => campaign.id === "C2");

  assert.equal(selectedCampaigns.length, 1);
  assert.equal(unified.wcvCampaignOverlay.soleNextImplementationCampaign, "C3");
  assert.equal(roadmap.program.campaignOverlay, "C3");
  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C3");
  assert.equal(roadmap.program.soleNextImplementationCampaign, "C3");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 706);
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, 781);
  assert.equal(roadmap.program.soleNextReplacementStage, "C3R-P");
  assert.equal(roadmap.program.soleNextReplacementStageIssue, 706);
  assert.equal(roadmap.program.structuralRecoveryTrackerIssue, 781);
  assert.equal(roadmap.program.wcvC2Complete, true);
  assert.equal(roadmap.program.replacementStageAutomaticStartAllowed, false);
  assert.equal(c3.leadIssue, 706);
  assert.deepEqual(c3.includedIssues, [706, 707, 708]);
  assert.equal(c3.state, "structural_recovery_c3r_p_authorized_unstarted");
  assert.equal(c3.githubNativeAutomaticContinuationAllowed, false);
  assert.equal(c2.leadIssue, 717);
  assert.deepEqual(c2.includedIssues, [702, 714, 703, 704, 705]);
  assert.equal(
    c2.state,
    "complete_after_expected_head_merge_and_validated_terminal_receipt",
  );
  assert.equal(c2.state, unified.wcvCampaignOverlay.c2StructuralRecovery.status);
  assert.equal(c2.wcvC2Complete, true);
  assert.equal(c2.automaticStartAllowed, false);
  assert.equal(
    unified.wcvCampaignOverlay.soleNextReplacementStage,
    unified.wcvCampaignOverlay.c3StructuralRecovery.currentReplacementStage,
  );
  assert.equal(
    unified.wcvCampaignOverlay.soleNextReplacementStageIssue,
    unified.wcvCampaignOverlay.c3StructuralRecovery.currentReplacementStageIssue,
  );
  assert.equal(
    unified.wcvCampaignOverlay.c2StructuralRecovery.authorityGraph.currentReplacementStageId,
    null,
  );
  assert.deepEqual(unified.wcvCampaignOverlay.laterCampaignsQueued, ["C4", "C5", "C6"]);
  assert.equal(
    roadmap.byId.get("WCV-C2").executionState,
    "complete_after_expected_head_merge_and_validated_terminal_receipt",
  );
  assert.deepEqual(
    createRoadmapRunnerPlanFromYamlAt(
      roadmapSource,
      new Date("2026-08-14T08:00:00.000Z"),
    ).selectedItemIds,
    ["WCV-C3"],
  );
});

test("installs the exact C1 through C6 dependency graph", async () => {
  const roadmap = parseRoadmap(await text("roadmap/active-program.yml"));
  const expected = {
    "WCV-0": { status: "completed", dependencies: ["S234R"] },
    "WCV-C1": { status: "completed", dependencies: ["WCV-0"] },
    "WCV-C2": { status: "completed", dependencies: ["WCV-C1"] },
    "WCV-C3": { status: "queued", dependencies: ["WCV-C2"] },
    "WCV-C4": { status: "queued", dependencies: ["ULC-I1"] },
    O4W: { status: "queued", dependencies: ["ULC-L1"] },
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

test("gates the paid route behind ULC-L1 and one unapproved O4W Owner authorization", async () => {
  const [roadmapSource, unified, contract] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
    text("docs/dabangil-unified-program-contract.md"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const o4w = roadmap.byId.get("O4W");
  const c5 = roadmap.byId.get("WCV-C5");
  const machineC4 = unified.wcvCampaignOverlay.campaigns.find(
    (campaign) => campaign.id === "C4",
  );
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
    dependencies: ["ULC-L1"],
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
  assert.deepEqual(machineC4.dependencies, ["ULC-I1"]);
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
  assert.deepEqual(machineGate.dependencies, ["ULC-L1"]);
  assert.equal(machineGate.authorizationGranted, false);
  assert.equal(machineGate.delayedEvidenceAuthorized, false);
  assert.match(contract, /O4W: exact frozen paid-cohort manifest authorization for WCV-C5 only/);
  assert.match(contract, /WCV-C4 depends directly on ULC-I1/);
  assert.match(contract, /O4W remains[\s\S]*behind ULC-L1/);
  assert.match(contract, /WCV-C5 depends on both WCV-C4 and O4W/);

  const evaluationTime = new Date("2026-08-08T08:00:00.000Z");
  const throughC4 = completeDependencyClosure(roadmapSource, "WCV-C4");
  const beforeFreeLaunch = createRoadmapRunnerPlanFromYamlAt(
    throughC4,
    evaluationTime,
  );
  assert.equal(analysisById(beforeFreeLaunch, "O4W").readinessStatus, "blocked");
  assert.deepEqual(
    analysisById(beforeFreeLaunch, "O4W").missingDependencies,
    ["ULC-L1"],
  );
  assert.equal(
    analysisById(beforeFreeLaunch, "WCV-C6").readinessStatus,
    "blocked",
  );
  assert.deepEqual(
    analysisById(beforeFreeLaunch, "WCV-C6").missingDependencies,
    ["WCV-C5"],
  );

  const throughFreeLaunch = completeDependencyClosure(throughC4, "ULC-L1");
  const beforeAuthorization = createRoadmapRunnerPlanFromYamlAt(
    throughFreeLaunch,
    evaluationTime,
  );
  assert.equal(analysisById(beforeAuthorization, "O4W").readinessStatus, "ready");
  assert.ok(beforeAuthorization.readyItemIds.includes("O4W"));
  assert.deepEqual(
    analysisById(beforeAuthorization, "WCV-C5").missingDependencies,
    ["O4W"],
  );

  const o4wComplete = replaceItemStatus(throughFreeLaunch, "O4W", "completed");
  const afterAuthorization = createRoadmapRunnerPlanFromYamlAt(
    o4wComplete,
    evaluationTime,
  );
  assert.equal(analysisById(afterAuthorization, "WCV-C5").readinessStatus, "ready");
  assert.ok(afterAuthorization.readyItemIds.includes("WCV-C5"));

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

test("gates legacy S225 on both O4D authority and terminal WCV-C6 evidence", async () => {
  const [roadmapSource, unified, launch, contract] = await Promise.all([
    text("roadmap/active-program.yml"),
    json("config/dabangil-unified-program-contract.json"),
    json("config/dabangil-unified-product-multisurface-launch-v1.json"),
    text("docs/dabangil-unified-program-contract.md"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const machineGate = unified.launchConvergenceAmendment.legacyPublicPaidLaunchGate;

  assert.deepEqual(roadmap.byId.get("O4D").dependencies, ["S245C", "S242V"]);
  assert.deepEqual(roadmap.byId.get("S225").dependencies, ["O4D", "WCV-C6"]);
  assert.deepEqual(machineGate, launch.legacyPublicPaidLaunchGate);
  assert.deepEqual(machineGate.requiredDependenciesExactly, ["O4D", "WCV-C6"]);
  assert.equal(machineGate.bothDependenciesRequired, true);
  for (const key of [
    "crossSubstitutionAllowed",
    "explicitTargetBypassAllowed",
    "currentActivationAuthorized",
    "automaticStartAllowed",
    "learnerActivationAuthorized",
    "paymentActivationAuthorized",
    "publicReleaseAuthorized",
  ]) {
    assert.equal(machineGate[key], false, key);
  }
  assert.match(contract, /S225 requires both independent terminal\ngates as `\[O4D, WCV-C6\]`/);
  assert.match(contract, /Neither may be bypassed/);

  const evaluationTime = new Date("2026-08-08T08:00:00.000Z");
  const ownerOnly = completeDependencyClosure(roadmapSource, "O4D");
  const evidenceOnly = completeDependencyClosure(roadmapSource, "WCV-C6");
  const both = completeDependencyClosure(ownerOnly, "WCV-C6");
  for (const [label, fixture, readinessStatus, missingDependencies] of [
    ["neither", roadmapSource, "blocked", ["O4D", "WCV-C6"]],
    ["owner only", ownerOnly, "blocked", ["WCV-C6"]],
    ["evidence only", evidenceOnly, "blocked", ["O4D"]],
    ["both", both, "ready", []],
  ]) {
    const s225 = analysisById(
      createRoadmapRunnerPlanFromYamlAt(fixture, evaluationTime),
      "S225",
    );
    assert.equal(s225.readinessStatus, readinessStatus, label);
    assert.deepEqual(s225.missingDependencies, missingDependencies, label);
  }
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

test("records the old atomic rule as history and authorizes serial C2R-A then C2R-B", async () => {
  const [unified, contract, decision, recovery] = await Promise.all([
    json("config/dabangil-unified-program-contract.json"),
    text("docs/dabangil-unified-program-contract.md"),
    text(DECISION),
    text(RECOVERY_DECISION),
  ]);

  assert.equal(unified.wcvCampaignOverlay.historicalStandaloneSequence.operative, false);
  assert.deepEqual(unified.wcvCampaignOverlay.historicalStandaloneSequence.sequence, [702, 714, 703]);
  assert.equal(
    unified.wcvCampaignOverlay.c2StructuralRecovery
      .priorAtomic702To705SinglePrRequirementSuperseded,
    true,
  );
  assert.equal(
    unified.wcvCampaignOverlay.c2StructuralRecovery
      .standalone702SourceOnlyAuthorized,
    true,
  );
  assert.equal(
    unified.wcvCampaignOverlay.issue714Tracker.standaloneSourcePrAuthorized,
    true,
  );
  assert.equal(
    unified.wcvCampaignOverlay.issue714Tracker.standaloneSourcePrRequired,
    true,
  );
  assert.equal(
    unified.wcvCampaignOverlay.issue714Tracker.automaticStartAllowed,
    false,
  );
  assert.match(contract, /Standalone\s+#702 and #714 were authorized only as/);
  assert.match(decision, /standalone sequence `#702 source-only → #714 source-only → #703`/);
  assert.match(recovery, /C2R-A and C2R-B are not parallel/);
});

test("allocates every #714 requirement to C2, C3, C4 or C6 exactly once", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const tracker = unified.wcvCampaignOverlay.issue714Tracker;
  const allocationKeys = Object.keys(tracker.allocations);
  const allocated = allocationKeys.flatMap((key) => tracker.allocations[key]);

  assert.deepEqual(allocationKeys, ["C2", "C3", "C4", "C6"]);
  assert.equal(tracker.currentMergeProducing, false);
  assert.equal(tracker.mergeProducingWhenStageActive, true);
  assert.equal(tracker.automaticStartAllowed, false);
  assert.equal(tracker.behaviorImplementedByC1, false);
  assert.equal(tracker.c2AllocationComplete, true);
  assert.equal(tracker.c2rBState, "complete_source_only");
  assert.equal(tracker.c2rBClosesIssue714, false);
  assert.equal(tracker.c2rBCompletesOnlyAllocation, "C2");
  assert.deepEqual(tracker.remainingAllocationsAfterC2RB, ["C3", "C4", "C6"]);
  for (const allocationKey of allocationKeys) {
    assert.equal(
      unified.wcvCampaignOverlay.campaigns.filter(
        (campaign) => campaign.id === allocationKey,
      ).length,
      1,
      allocationKey,
    );
  }
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
