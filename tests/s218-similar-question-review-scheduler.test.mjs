import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
  assertS218FixtureMetadataOnly,
  buildS218SimilarQuestionReviewScheduler,
  buildS218SimilarQuestionSchedulerContractReport,
  validateS218SimilarQuestionReviewScheduler,
} from "../lib/review-os/s218-similar-question-review-scheduler.ts";
import {
  assertS217FixtureMetadataOnly,
  buildS217PersonalCoreConceptGraph,
} from "../lib/review-os/s217-personal-core-concept-graph.ts";
import { loadSecondRoundCanonicalQuestionRegistry } from "../lib/review-os/second-round-question-registry.ts";
import { SAFE_DERIVED_SIGNAL_KEYS, assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const s217FixturePath = "tests/fixtures/s217-personal-core-concept-graph/metadata-only-s217-inputs.json";
const s218FixturePath = "tests/fixtures/s218-similar-question-review-scheduler/metadata-only-s218-inputs.json";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

async function loadS217Fixture() {
  const parsed = await readJson(s217FixturePath);
  assertS217FixtureMetadataOnly(parsed);
  return parsed;
}

async function loadS218Fixture() {
  const parsed = await readJson(s218FixturePath);
  assertS218FixtureMetadataOnly(parsed);
  return parsed;
}

function graphInputFromS217Fixture(fixture, overrides = {}) {
  return {
    ...fixture.graphInput,
    s216Entries: clone(fixture.s216Entries),
    conceptSeeds: clone(fixture.conceptSeeds),
    delayedRecallSignals: clone(fixture.delayedRecallSignals),
    ...overrides,
  };
}

async function readyGraph() {
  const fixture = await loadS217Fixture();
  return buildS217PersonalCoreConceptGraph(graphInputFromS217Fixture(fixture)).graph;
}

function schedulerInput(fixture, graph, overrides = {}) {
  return {
    ...fixture.schedulerInput,
    s203SchemaVersion: fixture.s203SchemaVersion,
    conceptGraph: graph,
    canonicalQuestions: clone(fixture.canonicalQuestions),
    conceptTransferLinks: clone(fixture.conceptTransferLinks),
    ...overrides,
  };
}

function taskByConcept(scheduler, conceptNodeId) {
  const task = scheduler.tasks.find((entry) => entry.oneBiggestGap.conceptNodeId === conceptNodeId);
  assert.ok(task, `Missing S218 task for concept ${conceptNodeId}`);
  return task;
}

test("S218 contract report and fixture declare metadata-only similar question scheduler coverage", async () => {
  const fixture = await loadS218Fixture();
  const report = buildS218SimilarQuestionSchedulerContractReport();

  assert.equal(fixture.schemaVersion, S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION);
  assert.equal(fixture.storagePolicy.metadataOnly, true);
  assert.equal(report.version, S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION);
  assert.deepEqual(report.supportedSubjects, ["law", "theory", "practice"]);
  assert.equal(report.selectsRelatedHistoricalQuestionMetadata, true);
  assert.equal(report.supportsConceptTransfer, true);
  assert.equal(report.supportsRewriteDueMetadata, true);
  assert.equal(report.supportsDelayedRecallMetadata, true);
  assert.equal(report.supportsSpacedReviewMetadata, true);
  assert.equal(report.todayPlanMaxPrimaryTasks, 3);
  assert.equal(report.officialQuestionMaterialIncluded, false);
  assert.equal(report.officialAnswerMaterialIncluded, false);
  assert.equal(report.generatedAnswerProseIncluded, false);
  assert.equal(report.publicArchiveUiAdded, false);
  assert.equal(report.providerRuntimeCalled, false);
  assert.equal(report.ocrRuntimeCalled, false);
});

test("S218 builds max-three ready review/rewrite tasks from S203 metadata and S217 recovery state", async () => {
  const fixture = await loadS218Fixture();
  const graph = await readyGraph();
  const result = buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, graph));
  const scheduler = result.scheduler;

  assert.equal(result.version, S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION);
  assert.equal(result.validation.valid, true);
  assert.equal(scheduler.status, "ready");
  assert.equal(scheduler.withhold.withheld, false);
  assert.deepEqual(scheduler.withhold.reasons, []);
  assert.equal(scheduler.tasks.length, 3);
  assert.equal(scheduler.todayPlan.primaryTaskCount, 3);
  assert.equal(scheduler.todayPlan.maxPrimaryTasks, 3);
  assert.equal(scheduler.diagnostics.blockedQuestionIds.includes("s218_blocked_law_requirement_q1"), true);
  assert.equal(scheduler.diagnostics.selectedQuestionIds.includes("s218_law_requirement_similar_q1"), true);
  assert.equal(scheduler.diagnostics.selectedQuestionIds.includes("s218_practice_unit_rounding_similar_q1"), true);
  assert.equal(scheduler.diagnostics.selectedQuestionIds.includes("s218_theory_application_transfer_q1"), true);

  const law = taskByConcept(scheduler, "s217_concept_law_requirement");
  assert.equal(law.taskKind, "similar_past_question_review");
  assert.equal(law.oneNextAction.actionType, "attempt_similar_question");
  assert.equal(law.oneNextAction.defaultAction, true);
  assert.equal(law.oneNextAction.learnerCanOverride, true);
  assert.equal(law.conceptTransfer.status, "direct_concept_match");
  assert.equal(law.rewriteDue.status, "due");
  assert.equal(law.spacedReview.status, "scheduled");
  assert.equal(law.relatedQuestion.officialQuestionMaterialIncluded, false);
  assert.equal(law.relatedQuestion.publicArchiveUi, false);

  const practice = taskByConcept(scheduler, "s217_concept_practice_unit_rounding");
  assert.equal(practice.dueState, "due_now");
  assert.equal(practice.oneNextAction.actionType, "recalculate");
  assert.equal(practice.rewriteDue.status, "due");
  assert.equal(practice.rewriteDue.calculator.model, "casio_fx_9860giii");
  assert.equal(practice.rewriteDue.calculator.resetSafeHandKeyedRoutineOnly, true);
  assert.equal(practice.rewriteDue.calculator.storedProgramDependency, false);
  assert.equal(practice.delayedRecall.status, "due");
  assert.equal(practice.delayedRecall.latestRecallStatus, "missed");

  const theory = taskByConcept(scheduler, "s217_concept_theory_application");
  assert.equal(theory.oneNextAction.actionType, "spaced_review");
  assert.equal(theory.conceptTransfer.status, "transfer_link_match");
  assert.deepEqual(theory.conceptTransfer.transferLinkIds, ["s218_transfer_theory_application"]);
  assert.deepEqual(theory.conceptTransfer.targetQuestionConceptNodeIds, ["s218_concept_theory_application_transfer"]);
  assert.equal(theory.spacedReview.status, "scheduled");
  assert.equal(theory.delayedRecall.latestRecallStatus, "recalled");

  for (const task of scheduler.tasks) {
    assert.equal(task.todayPlan.contributionCount, 1);
    assert.equal(task.todayPlan.maxPrimaryTasks, 3);
    assert.equal(task.dataBoundary.metadataOnly, true);
    assert.equal(task.dataBoundary.learnerMaterialInTask, false);
    assert.equal(task.dataBoundary.officialMaterialInTask, false);
    assert.equal(task.dataBoundary.referenceProseInTask, false);
    assert.equal(task.dataBoundary.sourceMaterialInTask, false);
    assert.equal(task.dataBoundary.providerRuntimeCalled, false);
    assert.equal(task.dataBoundary.ocrRuntimeCalled, false);
    assert.equal(task.authorityFlags.officialGrading, false);
    assert.equal(task.authorityFlags.officialModelAnswer, false);
    assert.equal(task.authorityFlags.passProbability, false);
  }

  assert.equal(scheduler.dataBoundary.learnerUiAdded, false);
  assert.equal(scheduler.dataBoundary.publicArchiveUiAdded, false);
  assert.equal(scheduler.dataBoundary.providerRuntimeCalled, false);
  assert.equal(scheduler.dataBoundary.ocrRuntimeCalled, false);
  assert.equal(scheduler.learnerInstructorBoundary.instructorRouteSeparated, true);
  assert.equal(scheduler.learnerInstructorBoundary.academyTenantDataAccessed, false);
  assertNoRawUserDataInDerived(scheduler);
});

test("S218 fails closed when committed S203 canonical question metadata has no schedulable records", async () => {
  const graph = await readyGraph();
  const registry = loadSecondRoundCanonicalQuestionRegistry({ asOfDate: "2026-06-26" });
  const fixture = await loadS218Fixture();
  const scheduler = buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, graph, {
    canonicalQuestions: registry.questions,
  })).scheduler;

  assert.equal(registry.questions.length, 0);
  assert.equal(scheduler.status, "withheld");
  assert.equal(scheduler.tasks.length, 0);
  assert.ok(scheduler.withhold.reasons.includes("s203_question_metadata_missing"));
  assert.equal(validateS218SimilarQuestionReviewScheduler(scheduler).valid, true);
});

test("S218 fails closed when rights, source, learner evidence, or release metadata is unresolved", async () => {
  const fixture = await loadS218Fixture();
  const graph = await readyGraph();
  const blockedOnly = buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, graph, {
    canonicalQuestions: [clone(fixture.canonicalQuestions.at(-1))],
  })).scheduler;

  assert.equal(blockedOnly.status, "withheld");
  assert.equal(blockedOnly.tasks.length, 0);
  assert.ok(blockedOnly.withhold.reasons.includes("no_safe_related_question_metadata"));
  assert.equal(blockedOnly.withhold.questionGateSnapshots[0].safeForScheduler, false);
  assert.ok(blockedOnly.withhold.questionGateSnapshots[0].withholdReasons.includes("s203_question_rights_unresolved"));
  assert.ok(blockedOnly.withhold.questionGateSnapshots[0].withholdReasons.includes("s203_problem_text_unresolved"));

  const missingEvidenceGraph = clone(graph);
  const practiceNode = missingEvidenceGraph.nodes.find((node) => node.conceptNodeId === "s217_concept_practice_unit_rounding");
  assert.ok(practiceNode, "missing practice node");
  practiceNode.exposureMetadata.learnerEvidenceRefIds = [];
  const missingEvidence = buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, missingEvidenceGraph)).scheduler;
  assert.equal(missingEvidence.status, "withheld");
  assert.ok(missingEvidence.withhold.reasons.includes("learner_evidence_reference_missing"));

  const unresolvedReleaseGraph = clone(graph);
  const lawNode = unresolvedReleaseGraph.nodes.find((node) => node.conceptNodeId === "s217_concept_law_requirement");
  assert.ok(lawNode, "missing law node");
  lawNode.examImpactMetadata.sourceReleaseReady = false;
  lawNode.exposureMetadata.referencePackageIds = [];
  const unresolvedRelease = buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, unresolvedReleaseGraph)).scheduler;
  assert.equal(unresolvedRelease.status, "withheld");
  assert.ok(unresolvedRelease.withhold.reasons.includes("source_release_unresolved"));
  assert.ok(unresolvedRelease.withhold.reasons.includes("reference_release_unresolved"));
});

test("S218 rejects learner/instructor boundary violations and raw-content fields", async () => {
  const fixture = await loadS218Fixture();
  const graph = await readyGraph();

  assert.throws(
    () => buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, graph, {
      actorRole: "instructor",
    })),
    /s218-learner-instructor-boundary/,
  );

  const unsafeQuestion = clone(fixture.canonicalQuestions[0]);
  unsafeQuestion.questionText = "must not enter S218";
  assert.throws(
    () => buildS218SimilarQuestionReviewScheduler(schedulerInput(fixture, graph, {
      canonicalQuestions: [unsafeQuestion],
    })),
    /s218-raw-content-field/,
  );
});

test("S218 docs, runner, safe keys, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s218-similar-past-question-review-scheduler.md", "utf8");
  const source = await readFile("lib/review-os/s218-similar-question-review-scheduler.ts", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s223 = plan.analyses.find((item) => item.itemId === "S223");

  for (const token of [
    "S218",
    "Similar Past Question Review and Rewrite Scheduler",
    "metadata-only",
    "fail closed",
    "S203",
    "S217",
    "concept transfer",
    "rewrite due",
    "delayed recall",
    "spaced review",
    "Today Plan max three",
    "learner/instructor separation",
  ]) {
    assert.match(docs, new RegExp(token));
  }

  for (const key of [
    "similarSchedulerId",
    "similarTaskId",
    "relatedQuestionId",
    "relatedQuestionCount",
    "conceptTransferStatus",
    "rewriteDueStatus",
    "delayedRecallStatus",
    "spacedReviewStatus",
    "dueState",
    "primarySchedulerActionType",
    "sourceRightsStatus",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S218 safe key ${key}`);
  }

  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|checkout/i);
  assert.match(runner, /tests\/s218-similar-question-review-scheduler\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S223`/);
  assert.equal(s218?.statusCategory, "completed");
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s223?.readinessStatus, "ready");
  assert.deepEqual(plan.selectedItemIds, ["S223", "S224"]);
});
