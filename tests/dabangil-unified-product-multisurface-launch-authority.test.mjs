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

async function text(path) {
  return readFile(path, "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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
  "docs/strategy/ACTIVE-MASTER-PLAN.md",
  "roadmap/active-program.yml",
  "config/dabangil-unified-program-contract.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/inverge-master-roadmap.md",
  "scripts/run-node-tests.mjs",
  DECISION,
  STRATEGY,
  CONTRACT,
  VALIDATION,
  PARITY,
  COMPLIANCE,
  FOCUSED_TEST,
  WCV_RECONCILIATION_TEST,
  PREMIUM_ALIGNMENT_TEST,
  WCV_C1_VALIDATION,
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
  const launch = await json(CONTRACT);
  const route = launch.publicOneZero;
  const paid = launch.paidEvidenceRoute;

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

test("keeps C2R-A as the sole implementation selection with one writer", async () => {
  const [launch, unified, roadmapSource] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    roadmapSource,
    new Date("2026-08-14T10:00:00.000Z"),
  );
  const preserved = launch.preservedCurrentAuthority;

  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C2");
  assert.equal(roadmap.program.soleNextImplementationCampaign, "C2");
  assert.equal(roadmap.program.soleNextImplementationLeadIssue, 717);
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, 717);
  assert.equal(roadmap.program.soleNextReplacementStage, "C2R-A");
  assert.equal(roadmap.program.soleNextReplacementStageIssue, 702);
  assert.equal(roadmap.program.globalMergeProducingWriterLimit, 1);
  assert.equal(roadmap.program.replacementStageAutomaticStartAllowed, false);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, "WCV-C2");
  assert.equal(unified.roadmapContract.soleNextImplementationCampaignId, "C2");
  assert.equal(unified.roadmapContract.soleNextReplacementStageId, "C2R-A");
  assert.equal(unified.roadmapContract.soleNextReplacementStageIssue, 702);
  assert.equal(preserved.currentReplacementStageState, "authorized_unstarted");
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
});

test("keeps first- and second-round authenticated acceptance independent", async () => {
  const source = await text("roadmap/active-program.yml");
  const evaluationTime = new Date("2026-08-14T10:00:00.000Z");

  const firstAccepted = completeDependencyClosure(source, "S238B");
  const firstAcceptedThroughWcvC3 = completeDependencyClosure(
    firstAccepted,
    "WCV-C3",
  );
  const beforeSecondAcceptance = createRoadmapRunnerPlanFromYamlAt(
    firstAcceptedThroughWcvC3,
    evaluationTime,
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
    evaluationTime,
  );
  assert.equal(
    analysisById(beforeFirstAcceptance, "ULC-F1").readinessStatus,
    "blocked",
  );
  assert.deepEqual(
    analysisById(beforeFirstAcceptance, "ULC-F1").missingDependencies,
    ["S238B"],
  );

  const bothAccepted = completeDependencyClosure(
    throughKnowledgeRepair,
    "S238B",
  );
  const afterBothAcceptances = createRoadmapRunnerPlanFromYamlAt(
    bothAccepted,
    evaluationTime,
  );
  assert.equal(
    analysisById(afterBothAcceptances, "ULC-F1").readinessStatus,
    "ready",
  );
  assert.ok(afterBothAcceptances.readyItemIds.includes("ULC-F1"));
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

test("declares the exact seventeen-path docs-contracts-only ownership boundary", async () => {
  const [launch, decision] = await Promise.all([json(CONTRACT), text(DECISION)]);
  const manifest = decision.match(/## 12\. Exact owned-path manifest([\s\S]*)$/)?.[1] ?? "";
  const paths = [...manifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  assert.deepEqual(launch.ownedPathsExactly, EXPECTED_OWNED_PATHS);
  assert.deepEqual(paths, EXPECTED_OWNED_PATHS);
  assert.equal(new Set(paths).size, 17);
  for (const path of paths) {
    assert.doesNotMatch(
      path,
      /^(?:app|components|lib\/review-os|supabase|\.github\/workflows|apps\/mobile|packages)\//,
      path,
    );
    assert.doesNotMatch(path, /(?:^|\/)(?:package\.json|[^/]*lock[^/]*)$/, path);
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
