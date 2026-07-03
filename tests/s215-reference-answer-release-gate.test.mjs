import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
  buildS215ReferenceAnswerReleaseGate,
  buildS215ReferenceAnswerReleaseGateRegistryReport,
  validateS215ReferenceAnswerReleaseGateRegistry,
} from "../lib/review-os/s215-reference-answer-release-gate.ts";
import {
  validateS214ReferenceAnswerPipelineRegistry,
} from "../lib/review-os/s214-reference-answer-pipeline.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const s215FixturePath = "tests/fixtures/s215-reference-answer-release-gate/metadata-only-release-gate-registry.json";
const s214FixturePath = "tests/fixtures/s214-reference-answer-pipeline/metadata-only-pipeline-registry.json";

async function loadS215Registry() {
  return validateS215ReferenceAnswerReleaseGateRegistry(
    JSON.parse(await readFile(s215FixturePath, "utf8")),
    s215FixturePath,
  );
}

async function loadS214Registry() {
  return validateS214ReferenceAnswerPipelineRegistry(
    JSON.parse(await readFile(s214FixturePath, "utf8")),
    s214FixturePath,
  );
}

function clone(value) {
  return structuredClone(value);
}

function gateBySubject(registry, subject) {
  const gate = registry.gates.find((entry) => entry.subject === subject);
  assert.ok(gate, `Missing ${subject} S215 gate fixture`);
  return gate;
}

function pipelineBySubject(registry, subject) {
  const pipeline = registry.pipelines.find((entry) => entry.subject === subject);
  assert.ok(pipeline, `Missing ${subject} S214 pipeline fixture`);
  return pipeline;
}

test("S215 registry validates metadata-only critic, consensus, and release-gate fixtures", async () => {
  const s215 = await loadS215Registry();
  const s214 = await loadS214Registry();
  const report = buildS215ReferenceAnswerReleaseGateRegistryReport(s215, s214.pipelines);

  assert.equal(s215.schemaVersion, S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION);
  assert.equal(s215.storagePolicy.metadataOnly, true);
  assert.equal(s215.storagePolicy.rawGeneratedReferenceAnswerStored, false);
  assert.equal(s215.storagePolicy.rawLearnerAnswerStored, false);
  assert.equal(s215.storagePolicy.providerPayloadStored, false);
  assert.equal(s215.boundaryPolicy.providerRuntimeCallsImplemented, false);
  assert.equal(s215.boundaryPolicy.ocrRuntimeCallsImplemented, false);
  assert.equal(s215.boundaryPolicy.learnerUiImplemented, false);
  assert.equal(s215.boundaryPolicy.publicArchiveUiImplemented, false);
  assert.equal(s215.boundaryPolicy.instructorRuntimeRoutesChanged, false);
  assert.equal(s215.boundaryPolicy.learnerInstructorDataMerged, false);
  assert.equal(report.totals.gateCount, 3);
  assert.equal(report.totals.releasedCount, 1);
  assert.equal(report.totals.blockedCount, 2);
  assert.deepEqual(report.totals.subjectCounts, { law: 1, theory: 1, practice: 1 });
  assert.equal(report.metadataOnly, true);
  assert.equal(report.safeUse, "s215_critic_consensus_release_gate_metadata_only");
});

test("S215 releases only a learning reference when S214, critic, consensus, and subject gates all pass", async () => {
  const s215 = await loadS215Registry();
  const s214 = await loadS214Registry();
  const result = buildS215ReferenceAnswerReleaseGate(
    gateBySubject(s215, "theory"),
    pipelineBySubject(s214, "theory"),
  );

  assert.equal(result.status, "released");
  assert.deepEqual(result.blockerCodes, []);
  assert.equal(result.s214Handoff.status, "ready_for_s215_consensus");
  assert.equal(result.releaseDecision.learningReferenceStatus, "released_learning_reference");
  assert.equal(result.releaseDecision.referenceAnswerReleaseAllowed, true);
  assert.equal(result.releaseDecision.requiredCaveatKey, "learning_reference_not_official_answer");
  assert.equal(result.releaseDecision.learningReferenceOnly, true);
  assert.equal(result.releaseDecision.officialGradingClaimAllowed, false);
  assert.equal(result.releaseDecision.officialModelAnswerClaimAllowed, false);
  assert.equal(result.releaseDecision.confirmedScoreClaimAllowed, false);
  assert.equal(result.releaseDecision.passProbabilityAllowed, false);
  assert.equal(result.sourceAnchorIntegrity.status, "passed");
  assert.equal(result.dataBoundary.rawGeneratedReferenceAnswerStored, false);
  assert.equal(result.learnerInstructorBoundary.learnerInstructorDataMerged, false);
});

test("S215 preserves unresolved consensus conflicts and blocks release even when S214 handoff is otherwise ready", async () => {
  const s215 = await loadS215Registry();
  const s214 = await loadS214Registry();
  const result = buildS215ReferenceAnswerReleaseGate(
    gateBySubject(s215, "law"),
    pipelineBySubject(s214, "law"),
  );

  assert.equal(result.s214Handoff.status, "ready_for_s215_consensus");
  assert.equal(result.status, "blocked");
  assert.ok(result.blockerCodes.includes("unresolved_consensus_conflict"));
  assert.equal(result.releaseDecision.referenceAnswerReleaseAllowed, false);
  assert.equal(result.consensus.preservedUnresolvedConflictState, true);
  assert.deepEqual(result.consensus.unresolvedConflictIds, ["s214_law_consensus_conflict"]);
  assert.equal(result.consensus.rawConflictTextStored, false);
});

test("S215 fails closed for practice calculation conflicts and unresolved S210 release evidence", async () => {
  const s215 = await loadS215Registry();
  const s214 = await loadS214Registry();
  const result = buildS215ReferenceAnswerReleaseGate(
    gateBySubject(s215, "practice"),
    pipelineBySubject(s214, "practice"),
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.s214Handoff.status, "blocked");
  assert.ok(result.blockerCodes.includes("s214_pipeline_not_ready"));
  assert.ok(result.blockerCodes.includes("calculation_blocker"));
  assert.equal(result.subjectReviewCompatibility.kind, "s213_practice_answer_review_metadata");
  assert.equal(result.subjectReviewCompatibility.calculatorModel, "casio_fx_9860giii");
  assert.equal(result.subjectReviewCompatibility.resetSafeHandKeyedRoutineOnly, true);
  assert.equal(result.subjectReviewCompatibility.storedProgramDependency, false);
  assert.equal(result.releaseDecision.referenceAnswerReleaseAllowed, false);
});

test("S215 detects missing requirements, fabricated anchors, and rubric-answer consistency blockers", async () => {
  const s215 = await loadS215Registry();
  const s214 = await loadS214Registry();
  const theoryGate = gateBySubject(s215, "theory");
  const theoryPipeline = pipelineBySubject(s214, "theory");

  const missingRequirement = clone(theoryGate);
  missingRequirement.consensusRecord.coveredRequirementSlotIds = ["s214_theory_requirement_a"];
  const missingRequirementResult = buildS215ReferenceAnswerReleaseGate(missingRequirement, theoryPipeline);
  assert.equal(missingRequirementResult.status, "blocked");
  assert.ok(missingRequirementResult.blockerCodes.includes("requirement_coverage_missing"));
  assert.deepEqual(missingRequirementResult.blockers.find((entry) => entry.code === "requirement_coverage_missing")?.requirementSlotIds, [
    "s214_theory_requirement_b",
  ]);

  const fabricatedAnchor = clone(theoryGate);
  fabricatedAnchor.criticFindings[0].sourceAnchorIds.push("s215_fabricated_source_anchor");
  fabricatedAnchor.consensusRecord.evidenceAnchorIds.push("s215_fabricated_evidence_anchor");
  const fabricatedAnchorResult = buildS215ReferenceAnswerReleaseGate(fabricatedAnchor, theoryPipeline);
  assert.equal(fabricatedAnchorResult.status, "blocked");
  assert.ok(fabricatedAnchorResult.blockerCodes.includes("source_anchor_fabricated"));
  assert.ok(fabricatedAnchorResult.blockerCodes.includes("evidence_anchor_fabricated"));
  assert.deepEqual(fabricatedAnchorResult.sourceAnchorIntegrity.fabricatedSourceAnchorIds, ["s215_fabricated_source_anchor"]);
  assert.deepEqual(fabricatedAnchorResult.sourceAnchorIntegrity.fabricatedEvidenceAnchorIds, ["s215_fabricated_evidence_anchor"]);

  const rubricConflict = clone(theoryGate);
  rubricConflict.criticFindings.find((finding) => finding.kind === "rubric_answer_consistency").status = "blocked";
  const rubricConflictResult = buildS215ReferenceAnswerReleaseGate(rubricConflict, theoryPipeline);
  assert.equal(rubricConflictResult.status, "blocked");
  assert.ok(rubricConflictResult.blockerCodes.includes("rubric_answer_consistency_blocker"));
  assert.equal(rubricConflictResult.releaseDecision.referenceAnswerReleaseAllowed, false);
});

test("S215 rejects raw content fields and prohibited authority claims in committed metadata", async () => {
  const s215 = await loadS215Registry();
  const theoryGate = clone(gateBySubject(s215, "theory"));

  theoryGate.consensusRecord.generatedAnswerText = "raw generated answer prose must not enter S215";
  assert.throws(
    () => buildS215ReferenceAnswerReleaseGate(theoryGate, { pipelineId: "not_used" }),
    /generatedAnswerText/,
  );

  const claimRegistry = clone(s215);
  claimRegistry.generatedBy = "official model answer release shortcut";
  assert.throws(
    () => validateS215ReferenceAnswerReleaseGateRegistry(claimRegistry),
    /prohibited authority claim/,
  );

  const fixture = await readFile(s215FixturePath, "utf8");
  assert.doesNotMatch(fixture, /"answerText"\s*:|"questionText"\s*:|"referenceAnswerText"\s*:|"providerPayload"\s*:|"ocrText"\s*:/);
  assert.doesNotMatch(fixture, /official grading|official model answer|pass probability|pass guarantee/i);
});

test("S215 docs, source, roadmap, and Agent Factory target remain source-level and metadata-safe", async () => {
  const docs = await readFile("docs/s215-reference-answer-critic-consensus-release-gate.md", "utf8");
  const source = await readFile("lib/review-os/s215-reference-answer-release-gate.ts", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s215 = plan.analyses.find((item) => item.itemId === "S215");
  const s216 = plan.analyses.find((item) => item.itemId === "S216");
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");

  for (const token of [
    "S211",
    "S212",
    "S213",
    "S214",
    "critic",
    "consensus",
    "release gate",
    "metadata-only",
    "learning references",
    "fail closed",
  ]) {
    assert.match(docs, new RegExp(token));
  }
  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|checkout/i);
  assert.equal(s215?.statusCategory, "completed");
  assert.equal(s216?.statusCategory, "completed");
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.readinessStatus, "ready");
  assert.equal(s219?.readinessStatus, "ready");
  assert.deepEqual(plan.selectedItemIds, ["S218", "S219"]);
});
