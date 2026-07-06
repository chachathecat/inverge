import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S214_MIN_INDEPENDENT_CANDIDATE_SLOTS,
  S214_REQUIRED_CANDIDATE_STRATEGIES,
  buildS214ReferenceAnswerPipeline,
  buildS214ReferenceAnswerPipelineRegistryReport,
  validateS214ReferenceAnswerPipelineRegistry,
} from "../lib/review-os/s214-reference-answer-pipeline.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s214-reference-answer-pipeline/metadata-only-pipeline-registry.json";

async function loadFixtureRegistry() {
  return validateS214ReferenceAnswerPipelineRegistry(
    JSON.parse(await readFile(fixturePath, "utf8")),
    "tests/fixtures/s214-reference-answer-pipeline/metadata-only-pipeline-registry.json",
  );
}

function clone(value) {
  return structuredClone(value);
}

function pipelineBySubject(registry, subject) {
  const pipeline = registry.pipelines.find((entry) => entry.subject === subject);
  assert.ok(pipeline, `Missing ${subject} pipeline fixture`);
  return pipeline;
}

test("S214 registry validates metadata-only multi-candidate pipeline fixtures for all second-round subjects", async () => {
  const registry = await loadFixtureRegistry();
  const report = buildS214ReferenceAnswerPipelineRegistryReport(registry);

  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.storagePolicy.rawGeneratedReferenceAnswerStored, false);
  assert.equal(registry.boundaryPolicy.providerRuntimeCallsImplemented, false);
  assert.equal(registry.boundaryPolicy.ocrRuntimeCallsImplemented, false);
  assert.equal(registry.boundaryPolicy.learnerUiImplemented, false);
  assert.equal(registry.boundaryPolicy.instructorRuntimeRoutesChanged, false);
  assert.equal(report.totals.pipelineCount, 3);
  assert.deepEqual(report.totals.subjectCounts, { law: 1, theory: 1, practice: 1 });
  assert.equal(report.totals.candidateSlotCount, 9);
  assert.equal(report.totals.readyForS215Count, 2);
  assert.equal(report.totals.blockedCount, 1);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.safeUse, "s214_candidate_pipeline_metadata_only");
});

test("S214 law and theory pipelines require three independent candidate slots and preserve S215 conflict state without releasing", async () => {
  const registry = await loadFixtureRegistry();

  for (const subject of ["law", "theory"]) {
    const result = buildS214ReferenceAnswerPipeline(pipelineBySubject(registry, subject));
    assert.equal(result.status, "ready_for_s215_consensus");
    assert.equal(result.releaseGate.s215ReleaseGateInputAllowed, true);
    assert.equal(result.releaseGate.referenceAnswerReleaseAllowed, false);
    assert.equal(result.releaseGate.learnerFacingReleaseAllowed, false);
    assert.equal(result.learningReference.requiredCaveatKey, "learning_reference_not_official_answer");
    assert.equal(result.learningReference.officialModelAnswerClaimAllowed, false);
    assert.equal(result.releaseGate.passProbabilityClaimAllowed, false);
    assert.equal(result.candidateStrategyReport.minimumIndependentCandidateSlots, S214_MIN_INDEPENDENT_CANDIDATE_SLOTS);
    assert.equal(result.candidateStrategyReport.independentCandidateSlotCount, 3);
    assert.deepEqual(result.candidateStrategyReport.requiredStrategyIds, S214_REQUIRED_CANDIDATE_STRATEGIES[subject]);
    assert.equal(result.dataBoundary.rawGeneratedReferenceAnswerStored, false);
    assert.equal(result.learnerInstructorBoundary.learnerInstructorDataMerged, false);
  }

  const lawResult = buildS214ReferenceAnswerPipeline(pipelineBySubject(registry, "law"));
  assert.equal(lawResult.unresolvedConflictState.status, "unresolved_for_s215");
  assert.equal(lawResult.unresolvedConflictState.unresolvedConflictCount, 1);
  assert.equal(lawResult.unresolvedConflictState.preservedForS215, true);
});

test("S214 practice pipeline uses S210 validation as a release prerequisite and fails closed until runtime evidence exists", async () => {
  const registry = await loadFixtureRegistry();
  const result = buildS214ReferenceAnswerPipeline(pipelineBySubject(registry, "practice"));

  assert.equal(result.status, "blocked");
  assert.equal(result.releasePrerequisites.subjectGate.kind, "s210_practice_validation");
  assert.equal(result.releaseGate.s215ReleaseGateInputAllowed, false);
  assert.equal(result.releaseGate.referenceAnswerReleaseAllowed, false);
  assert.equal(result.releaseGate.officialGradingClaimAllowed, false);
  assert.deepEqual(result.candidateStrategyReport.requiredStrategyIds, S214_REQUIRED_CANDIDATE_STRATEGIES.practice);
  assert.ok(result.blockedReasonCodes.includes("s210_practice_validation_missing"));
  assert.ok(result.blockedReasonCodes.includes("s210_reference_answer_release_not_allowed"));
  assert.equal(result.releasePrerequisites.subjectGate.calculatorModel, "casio_fx_9860giii");
  assert.equal(result.releasePrerequisites.subjectGate.resetSafeHandKeyedRoutineRequired, true);
  assert.equal(result.releasePrerequisites.subjectGate.storedProgramDependencyAllowed, false);
});

test("S214 fails closed when source pack, candidate evidence, validation state, or release prerequisites are missing", async () => {
  const registry = await loadFixtureRegistry();
  const base = pipelineBySubject(registry, "law");

  const missingSourcePack = clone(base);
  missingSourcePack.sourcePack.status = "missing";
  assert.deepEqual(buildS214ReferenceAnswerPipeline(missingSourcePack).blockedReasonCodes, ["source_pack_missing"]);

  const missingEvidence = clone(base);
  missingEvidence.candidateSlots[0].candidateEvidence.status = "missing";
  assert.ok(buildS214ReferenceAnswerPipeline(missingEvidence).blockedReasonCodes.includes("candidate_evidence_missing"));

  const missingValidation = clone(base);
  missingValidation.candidateSlots[0].validationState.status = "missing";
  assert.ok(buildS214ReferenceAnswerPipeline(missingValidation).blockedReasonCodes.includes("candidate_validation_state_missing"));

  const missingS208 = clone(base);
  missingS208.releasePrerequisites.subjectGate.status = "missing";
  missingS208.releasePrerequisites.subjectGate.s214GenerationAllowed = false;
  assert.ok(buildS214ReferenceAnswerPipeline(missingS208).blockedReasonCodes.includes("s208_law_grounding_missing"));

  const missingS207 = clone(base);
  missingS207.releasePrerequisites.s207Package.status = "blocked";
  assert.ok(buildS214ReferenceAnswerPipeline(missingS207).blockedReasonCodes.includes("s207_reference_package_not_ready"));
});

test("S214 rejects unsafe fixtures with fewer than three independent candidates, raw fields, or authority claims", async () => {
  const registry = await loadFixtureRegistry();
  const law = pipelineBySubject(registry, "law");

  const duplicateIndependentSlots = clone(law);
  duplicateIndependentSlots.candidateSlots[1].independenceGroupId = duplicateIndependentSlots.candidateSlots[0].independenceGroupId;
  duplicateIndependentSlots.candidateSlots[2].independenceGroupId = duplicateIndependentSlots.candidateSlots[0].independenceGroupId;
  assert.throws(
    () => buildS214ReferenceAnswerPipeline(duplicateIndependentSlots),
    /at least three independent candidate slots/,
  );

  const rawQuestionText = clone(law);
  rawQuestionText.sourcePack.officialSource.officialQuestionText = "raw question text must not enter S214";
  assert.throws(
    () => buildS214ReferenceAnswerPipeline(rawQuestionText),
    /officialQuestionText/,
  );

  const authorityClaim = clone(law);
  authorityClaim.sourcePack.officialSource.rightsStatus = "official model answer claim";
  assert.throws(
    () => buildS214ReferenceAnswerPipeline(authorityClaim),
    /prohibited authority claim/,
  );
});

test("S214 docs and source stay source-level only with no runtime provider, OCR, UI, billing, auth, Supabase, or workflow changes", async () => {
  const docs = await readFile("docs/s214-multi-candidate-reference-answer-pipeline.md", "utf8");
  const source = await readFile("lib/review-os/s214-reference-answer-pipeline.ts", "utf8");
  const fixture = await readFile(fixturePath, "utf8");

  for (const token of ["S207", "S208", "S209", "S210", "S213", "S215", "metadata-only", "learning references"]) {
    assert.match(docs, new RegExp(token));
  }
  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|checkout/i);
  assert.doesNotMatch(fixture, /"answerText"\s*:|"questionText"\s*:|official model answer|pass probability|"providerPayload"\s*:|"ocrText"\s*:/);
});

test("active roadmap marks S214 and S215 completed while advancing the next ready targets", async () => {
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s214 = plan.analyses.find((item) => item.itemId === "S214");
  const s215 = plan.analyses.find((item) => item.itemId === "S215");
  const s216 = plan.analyses.find((item) => item.itemId === "S216");
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");

  assert.equal(s214?.statusCategory, "completed");
  assert.equal(s215?.statusCategory, "completed");
  assert.equal(s216?.statusCategory, "completed");
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.statusCategory, "completed");
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.deepEqual(plan.selectedItemIds, ["S223", "S224"]);
  assert.equal(s215?.missingDependencies.includes("S213"), false);
  assert.equal(s215?.missingDependencies.includes("S214"), false);
});
