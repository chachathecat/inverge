import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S217_CONCEPT_STATES,
  S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
  assertS217FixtureMetadataOnly,
  buildS217ConceptGraphContractReport,
  buildS217PersonalCoreConceptGraph,
  validateS217PersonalCoreConceptGraph,
} from "../lib/review-os/s217-personal-core-concept-graph.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s217-personal-core-concept-graph/metadata-only-s217-inputs.json";

async function loadFixture() {
  const parsed = JSON.parse(await readFile(fixturePath, "utf8"));
  assertS217FixtureMetadataOnly(parsed);
  return parsed;
}

function clone(value) {
  return structuredClone(value);
}

function graphInputFromFixture(fixture, overrides = {}) {
  return {
    ...fixture.graphInput,
    s216Entries: clone(fixture.s216Entries),
    conceptSeeds: clone(fixture.conceptSeeds),
    delayedRecallSignals: clone(fixture.delayedRecallSignals),
    ...overrides,
  };
}

function nodeByConcept(graph, conceptNodeId) {
  const node = graph.nodes.find((entry) => entry.conceptNodeId === conceptNodeId);
  assert.ok(node, `Missing S217 concept node ${conceptNodeId}`);
  return node;
}

test("S217 contract report and fixture cover second-round concept states and metadata dimensions", async () => {
  const fixture = await loadFixture();
  const report = buildS217ConceptGraphContractReport();

  assert.equal(fixture.schemaVersion, S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION);
  assert.equal(fixture.storagePolicy.metadataOnly, true);
  assert.equal(report.version, S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION);
  assert.deepEqual(report.supportedSubjects, ["law", "theory", "practice"]);
  for (const state of ["unknown", "exposed", "confused", "wrong", "recurring", "recovering", "stable", "at-risk"]) {
    assert.ok(S217_CONCEPT_STATES.includes(state), `S217 state missing: ${state}`);
    assert.ok(report.conceptStates.includes(state), `S217 report state missing: ${state}`);
  }
  assert.equal(report.tracksExposureMetadata, true);
  assert.equal(report.tracksErrorMetadata, true);
  assert.equal(report.tracksRecurrenceMetadata, true);
  assert.equal(report.tracksSuccessfulRewriteRecalculationMetadata, true);
  assert.equal(report.tracksDelayedRecallMetadata, true);
  assert.equal(report.tracksMasteryMetadata, true);
  assert.equal(report.tracksForgettingRiskMetadata, true);
  assert.equal(report.tracksExamImpactMetadata, true);
  assert.equal(report.providerRuntimeCalled, false);
  assert.equal(report.ocrRuntimeCalled, false);
  assertNoRawUserDataInDerived(fixture);
});

test("S217 builds a ready metadata-only Personal Core Concept Graph from safe S216 entries", async () => {
  const fixture = await loadFixture();
  const result = buildS217PersonalCoreConceptGraph(graphInputFromFixture(fixture));
  const graph = result.graph;

  assert.equal(result.version, S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION);
  assert.equal(result.validation.valid, true);
  assert.equal(graph.status, "ready");
  assert.equal(graph.withhold.withheld, false);
  assert.deepEqual(graph.withhold.reasons, []);
  assert.equal(graph.sourceContracts.s216EntryCount, 3);
  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.subjects.law.conceptNodeIds.includes("s217_concept_law_requirement"), true);
  assert.equal(graph.subjects.theory.conceptNodeIds.includes("s217_concept_theory_application"), true);
  assert.equal(graph.subjects.practice.conceptNodeIds.includes("s217_concept_practice_unit_rounding"), true);
  assert.equal(graph.subjects.practice.subjectDimensionIds.includes("practice_unit_rounding_time_adjustment"), true);

  assert.equal(nodeByConcept(graph, "s217_concept_law_unseen").conceptState, "unknown");
  assert.equal(nodeByConcept(graph, "s217_concept_theory_exposed").conceptState, "exposed");

  const law = nodeByConcept(graph, "s217_concept_law_requirement");
  assert.equal(law.conceptState, "recurring");
  assert.equal(law.errorMetadata.gapCategoryIds.includes("law_requirement_decomposition"), true);
  assert.equal(law.recurrenceMetadata.recurringDeductionCandidateIds.includes("s217_deduction_law_requirement"), true);
  assert.equal(law.forgettingRiskMetadata.forgettingRiskLevel, "high");

  const theory = nodeByConcept(graph, "s217_concept_theory_application");
  assert.equal(theory.conceptState, "stable");
  assert.equal(theory.successfulRecoveryMetadata.successfulRewriteCount, 1);
  assert.equal(theory.delayedRecallMetadata.recalledCount, 1);
  assert.equal(theory.masteryMetadata.masteryStatus, "stable");

  const practice = nodeByConcept(graph, "s217_concept_practice_unit_rounding");
  assert.equal(practice.conceptState, "at-risk");
  assert.equal(practice.successfulRecoveryMetadata.successfulRecalculationCount, 1);
  assert.equal(practice.successfulRecoveryMetadata.calculator.model, "casio_fx_9860giii");
  assert.equal(practice.successfulRecoveryMetadata.calculator.resetSafeHandKeyedRoutineOnly, true);
  assert.equal(practice.successfulRecoveryMetadata.calculator.storedProgramDependency, false);
  assert.equal(practice.delayedRecallMetadata.missedCount, 1);
  assert.equal(practice.forgettingRiskMetadata.atRisk, true);

  assert.equal(graph.recoveryState.todayPlanCandidateCount <= 3, true);
  assert.equal(graph.recoveryState.pendingRecoveryConceptNodeIds.includes("s217_concept_practice_unit_rounding"), true);
  assert.equal(graph.recoveryState.successfulRecoveryConceptNodeIds.includes("s217_concept_theory_application"), true);
  assert.equal(graph.authorityFlags.officialGrading, false);
  assert.equal(graph.authorityFlags.officialModelAnswer, false);
  assert.equal(graph.authorityFlags.passProbability, false);
  assert.equal(graph.dataBoundary.learnerMaterialInGraph, false);
  assert.equal(graph.dataBoundary.ocrMaterialInGraph, false);
  assert.equal(graph.dataBoundary.providerRuntimeCalled, false);
  assert.equal(graph.dataBoundary.ocrRuntimeCalled, false);
  assertNoRawUserDataInDerived(graph);
});

test("S217 fails closed when S216 metadata is missing", async () => {
  const fixture = await loadFixture();
  const result = buildS217PersonalCoreConceptGraph(graphInputFromFixture(fixture, {
    s216Entries: [],
  }));
  const graph = result.graph;

  assert.equal(graph.status, "withheld");
  assert.equal(graph.nodes.length, 0);
  assert.ok(graph.withhold.reasons.includes("s216_metadata_missing"));
  assert.equal(validateS217PersonalCoreConceptGraph(graph).valid, true);
});

test("S217 fails closed for unresolved S216 gates, evidence refs, source, release, and subject metadata", async () => {
  const fixture = await loadFixture();
  const subjectWithheld = buildS217PersonalCoreConceptGraph(graphInputFromFixture(fixture, {
    s216Entries: clone(fixture.withheldS216Entries),
    conceptSeeds: [],
    delayedRecallSignals: [],
  })).graph;

  assert.equal(subjectWithheld.status, "withheld");
  assert.equal(subjectWithheld.nodes.length, 0);
  assert.ok(subjectWithheld.withhold.reasons.includes("s216_entry_withheld"));
  assert.ok(subjectWithheld.withhold.reasons.includes("subject_review_metadata_unresolved"));
  assert.ok(subjectWithheld.withhold.s216Reasons.includes("subject_review_metadata_missing"));

  const unresolved = clone(fixture.s216Entries[0]);
  unresolved.learnerEvidence.evidenceRefIds = [];
  unresolved.learnerEvidence.verifiedByLearner = false;
  unresolved.sourceReview.reviewStatus = "withheld_unverified_source";
  unresolved.sourceReview.sourceRefIds = [];
  unresolved.correctPrinciple.sourceVerificationStatus = "withheld";
  unresolved.referenceStatus.releaseStatus = "blocked";
  unresolved.referenceStatus.learningReferenceStatus = "blocked";
  unresolved.referenceStatus.blockerCodes = ["legal_source_blocker"];
  unresolved.withhold.referenceBlockerCodes = ["legal_source_blocker"];

  const blocked = buildS217PersonalCoreConceptGraph(graphInputFromFixture(fixture, {
    s216Entries: [unresolved],
    conceptSeeds: [],
    delayedRecallSignals: [],
  })).graph;

  assert.equal(blocked.status, "withheld");
  assert.equal(blocked.nodes.length, 0);
  assert.ok(blocked.withhold.reasons.includes("s216_validation_failed"));
  assert.ok(blocked.withhold.reasons.includes("learner_evidence_reference_missing"));
  assert.ok(blocked.withhold.reasons.includes("learner_evidence_unconfirmed"));
  assert.ok(blocked.withhold.reasons.includes("source_review_unresolved"));
  assert.ok(blocked.withhold.reasons.includes("reference_release_unresolved"));
  assert.deepEqual(blocked.withhold.referenceBlockerCodes, ["legal_source_blocker"]);
});

test("S217 rejects learner/instructor boundary violations and raw-content fields", async () => {
  const fixture = await loadFixture();

  assert.throws(
    () => buildS217PersonalCoreConceptGraph(graphInputFromFixture(fixture, {
      actorRole: "instructor",
    })),
    /s217-learner-instructor-boundary/,
  );

  assert.throws(
    () => buildS217PersonalCoreConceptGraph({
      ...graphInputFromFixture(fixture),
      rawAnswerText: "must not enter S217",
    }),
    /raw-user-data-in-derived-metadata/,
  );
});

test("S217 docs, source, roadmap, runner, and safe derived keys are wired", async () => {
  const docs = await readFile("docs/s217-personal-core-concept-graph.md", "utf8");
  const source = await readFile("lib/review-os/s217-personal-core-concept-graph.ts", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");

  for (const token of [
    "S217",
    "Personal Core Concept Graph",
    "recovery-state",
    "metadata-only",
    "fail closed",
    "S216",
    "law",
    "theory",
    "practice",
    "delayed recall",
    "forgetting risk",
    "learner/instructor separation",
  ]) {
    assert.match(docs, new RegExp(token));
  }

  for (const key of [
    "conceptGraphId",
    "conceptState",
    "exposureCount",
    "errorCount",
    "recurrenceCount",
    "successfulRewriteCount",
    "successfulRecalculationCount",
    "delayedRecallStatus",
    "masteryStatus",
    "forgettingRiskLevel",
    "examImpactLevel",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S217 safe key ${key}`);
  }

  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|checkout/i);
  assert.match(runner, /tests\/s217-personal-core-concept-graph\.test\.mjs/);
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.statusCategory, "completed");
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.deepEqual(plan.selectedItemIds, ["S224"]);
});

