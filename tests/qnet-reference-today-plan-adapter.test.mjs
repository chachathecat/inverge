import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadQnetAppraiserOfficialMaterialsReference } from "../lib/review-os/qnet-official-materials-reference.ts";
import {
  buildQnetReferenceSignalsForTodayPlanAction,
  enrichTodayPlanActionWithQnetReference,
  enrichTodayPlanActionsWithQnetReference,
} from "../lib/review-os/qnet-reference-today-plan-adapter.ts";
import {
  buildTodayPlanSourceUnion,
  compressUnifiedTodayPlanToMaxThree,
} from "../lib/review-os/today-plan-source-union.ts";

function action(overrides = {}) {
  return {
    id: "action-1",
    source: "study_schedule",
    examMode: "second",
    subjectId: "second_practice",
    unitId: "second_practice_three_approaches",
    taskType: "rewrite",
    title: "metadata practice review",
    rationale: "existing learner-derived Today Plan action",
    primaryAction: "retry one short structure",
    estimatedMinutes: 15,
    prioritySignals: ["schedule_track_focus"],
    isPrimaryTask: true,
    metadataOnly: true,
    ...overrides,
  };
}

const forbiddenSerializedPattern =
  /"problemText"|"questionText"|"answerText"|"officialAnswer"|"officialAnswerBody"|"ocrText"|"ocrFullText"|"sourceExcerpt"|"sourceUrl"|"localFileName"|"localRawFileName"|"score"|"planningScore"|"priorityScore"|"passFail"|"modelAnswer"|official grading|official score|score prediction|pass\/fail|model answer|pass guarantee/i;

function assertSafeEnrichedOutput(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, forbiddenSerializedPattern);
  assert.equal(serialized.includes("local_official_materials"), false);
  assert.equal(serialized.includes("qnet_manifest.json"), false);
  assert.equal(serialized.includes("official_reference_metadata_only"), false);
  assert.equal(serialized.includes("official_reference_curriculum_match"), false);
}

function assertMatched(enriched) {
  assert.ok(enriched.qnetReference);
  assert.ok(enriched.qnetReference.matchedSourceIds.length > 0);
  assert.equal(enriched.qnetReference.metadataOnly, true);
  assert.equal(enriched.qnetReference.safeUse, "metadata_reference_only");
  assert.ok(enriched.prioritySignals.includes("official_reference_source_verified"));
  assert.ok(enriched.prioritySignals.includes("official_reference_topic_match"));
  assertSafeEnrichedOutput(enriched);
}

test("existing Today Plan action can be enriched with Q-Net reference signals without mutation", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const base = action();
  const originalSignals = [...base.prioritySignals];
  const qnetReference = buildQnetReferenceSignalsForTodayPlanAction(base, reference);
  assert.ok(qnetReference);
  assert.ok(qnetReference.matchedSourceIds.length > 0);
  assert.ok(qnetReference.matchedCurriculumNodeCandidates.includes("second_practice_three_approaches"));
  assert.equal(qnetReference.metadataOnly, true);
  assert.equal(qnetReference.safeUse, "metadata_reference_only");

  const enriched = enrichTodayPlanActionWithQnetReference(base, reference);
  assert.notEqual(enriched, base);
  assert.deepEqual(base.prioritySignals, originalSignals);
  assert.equal(base.qnetReference, undefined);
  assert.ok(enriched.prioritySignals.includes("schedule_track_focus"));
  assertMatched(enriched);
});

test("first exam civil, economics, and real estate metadata match Batch 1 reference", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const subjects = ["civil", "first_economics", "first_real_estate_studies"];

  for (const subjectId of subjects) {
    const enriched = enrichTodayPlanActionWithQnetReference(action({
      id: `first-${subjectId}`,
      examMode: "first",
      subjectId,
      unitId: `${subjectId}_unit`,
      taskType: "O/X",
      prioritySignals: ["schedule_track_focus"],
    }), reference);
    assertMatched(enriched);
  }
});

test("first exam law and accounting metadata match Batch 1 reference", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const law = enrichTodayPlanActionWithQnetReference(action({
    id: "first-law",
    examMode: "first",
    subjectId: "first_appraisal_related_law",
    unitId: "first_appraisal_law_project_approval",
    taskType: "O/X",
    prioritySignals: ["schedule_track_focus"],
  }), reference);
  const accounting = enrichTodayPlanActionWithQnetReference(action({
    id: "first-accounting",
    examMode: "first",
    subjectId: "first_accounting",
    unitId: "first_accounting_inventory_lcm",
    taskType: "accounting template",
    prioritySignals: ["accounting_template_review"],
  }), reference);

  assertMatched(law);
  assertMatched(accounting);
  assert.ok(accounting.prioritySignals.includes("official_reference_calculation_template_candidate"));
  assert.ok(accounting.prioritySignals.includes("official_reference_casio_relevant"));
});

test("second practice metadata returns topic, trap, calculation, and CASIO signals", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const enriched = enrichTodayPlanActionWithQnetReference(action({
    id: "second-practice",
    examMode: "second",
    subjectId: "second_practice",
    unitId: "second_practice_three_approaches",
    taskType: "CASIO",
    prioritySignals: ["calculator_recovery"],
  }), reference);

  assertMatched(enriched);
  assert.ok(enriched.qnetReference.trapPatternCandidates.length > 0);
  assert.ok(enriched.qnetReference.calculationTemplateCandidates.length > 0);
  assert.equal(enriched.qnetReference.casioRelevant, true);
  assert.ok(enriched.prioritySignals.includes("official_reference_trap_pattern_candidate"));
  assert.ok(enriched.prioritySignals.includes("official_reference_calculation_template_candidate"));
  assert.ok(enriched.prioritySignals.includes("official_reference_casio_relevant"));
});

test("second theory metadata returns topic, trap, and answer skeleton signals", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const enriched = enrichTodayPlanActionWithQnetReference(action({
    id: "second-theory",
    examMode: "second",
    subjectId: "second_theory",
    unitId: "second_theory_value_theory",
    taskType: "rewrite",
    prioritySignals: ["wrong_concept"],
  }), reference);

  assertMatched(enriched);
  assert.ok(enriched.qnetReference.trapPatternCandidates.length > 0);
  assert.ok(enriched.qnetReference.answerSkeletonTags.length > 0);
  assert.ok(enriched.prioritySignals.includes("official_reference_trap_pattern_candidate"));
  assert.ok(enriched.prioritySignals.includes("official_reference_answer_skeleton_candidate"));
});

test("second law metadata returns topic, trap, and answer skeleton signals", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const enriched = enrichTodayPlanActionWithQnetReference(action({
    id: "second-law",
    examMode: "second",
    subjectId: "second_law",
    unitId: "second_law_project_approval",
    taskType: "rewrite",
    prioritySignals: ["issue_spotting_gap"],
  }), reference);

  assertMatched(enriched);
  assert.ok(enriched.qnetReference.trapPatternCandidates.length > 0);
  assert.ok(enriched.qnetReference.answerSkeletonTags.length > 0);
  assert.ok(enriched.prioritySignals.includes("official_reference_trap_pattern_candidate"));
  assert.ok(enriched.prioritySignals.includes("official_reference_answer_skeleton_candidate"));
});

test("action with no Q-Net match is returned without fake official reference signals", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const unmatched = enrichTodayPlanActionWithQnetReference(action({
    id: "unmatched",
    examMode: "first",
    subjectId: "unmatched-subject",
    unitId: "unmatched-unit",
    taskType: "review",
    prioritySignals: ["schedule_track_focus"],
  }), reference);

  assert.equal(unmatched.qnetReference, undefined);
  assert.deepEqual(unmatched.prioritySignals, ["schedule_track_focus"]);
  assertSafeEnrichedOutput(unmatched);
});

test("Q-Net metadata does not create standalone Today Plan tasks", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const actions = [
    action({ id: "qnet-matched" }),
    action({ id: "qnet-matched-2", subjectId: "second_law", unitId: "second_law_project_approval" }),
  ];

  const enriched = enrichTodayPlanActionsWithQnetReference(actions, reference);
  assert.equal(enriched.length, actions.length);
  assert.deepEqual(enriched.map((item) => item.id), actions.map((item) => item.id));
  assert.ok(enriched.every((item) => item.qnetReference));
});

test("Q-Net reference boost is weaker than due review and confident wrong behavior", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const dueReview = action({
    id: "due-review",
    source: "review_queue",
    examMode: "first",
    subjectId: "civil",
    unitId: "first_civil_nullity_rescission",
    taskType: "O/X",
    prioritySignals: ["due_review"],
  });
  const confidentWrong = action({
    id: "confident-wrong",
    source: "personal_concept_graph",
    examMode: "first",
    subjectId: "civil",
    unitId: "first_civil_law",
    taskType: "O/X",
    prioritySignals: ["confident_wrong_concept"],
  });
  const qnetMatchedSchedule = action({
    id: "qnet-matched-schedule",
    prioritySignals: ["schedule_track_focus"],
  });
  const genericSchedule = action({
    id: "generic-schedule",
    subjectId: "unmatched-subject",
    unitId: "unmatched-unit",
    prioritySignals: ["schedule_track_focus"],
  });

  const plan = compressUnifiedTodayPlanToMaxThree(
    enrichTodayPlanActionsWithQnetReference([genericSchedule, qnetMatchedSchedule, confidentWrong, dueReview], reference),
  );

  const learnerDerivedIndexes = [plan.findIndex((item) => item.id === "due-review"), plan.findIndex((item) => item.id === "confident-wrong")];
  const qnetMatchedIndex = plan.findIndex((item) => item.id === "qnet-matched-schedule");
  assert.ok(learnerDerivedIndexes.every((index) => index >= 0));
  assert.ok(qnetMatchedIndex >= 0);
  assert.ok(learnerDerivedIndexes.every((index) => index < qnetMatchedIndex));
  assert.ok(plan.find((item) => item.id === "qnet-matched-schedule")?.prioritySignals.includes("official_reference_topic_match"));
});

test("Today Plan source union applies Q-Net enrichment only to existing source-union actions and stays capped at 3", () => {
  const conceptGraphActions = Array.from({ length: 5 }, (_, index) => ({
    id: `concept-qnet-${index}`,
    nodeId: `node-qnet-${index}`,
    userId: "u-qnet",
    source: "personal_concept_graph",
    examMode: "second",
    subjectId: index % 2 === 0 ? "second_law" : "second_theory",
    unitId: index % 2 === 0 ? `second_law_project_approval_${index}` : `second_theory_value_theory_${index}`,
    state: index === 0 ? "wrong" : "confused",
    taskType: "rewrite",
    title: "metadata-only retry",
    rationale: "existing learner-derived concept graph weakness",
    primaryAction: "rewrite one issue",
    prioritySignals: [index === 0 ? "wrong_concept" : "confused_concept"],
    isPrimaryTask: true,
    estimatedMinutes: 15,
    metadataOnly: true,
  }));

  const plan = buildTodayPlanSourceUnion({
    conceptGraphActions,
    context: { examMode: "second" },
  });

  assert.equal(plan.length, 3);
  assert.ok(plan.every((item) => item.id.startsWith("union:concept-qnet-")));
  assert.ok(plan.every((item) => item.qnetReference));
  assert.ok(plan.every((item) => item.metadataOnly === true));
  assertSafeEnrichedOutput(plan);
});

test("Q-Net Today Plan adapter rejects raw, scoring, learner text, and official claim fields", () => {
  const rejectedFixtures = [
    { problemText: "raw source body" },
    { rawProblemText: "raw source body" },
    { nested: { officialAnswerBody: "forbidden" } },
    { nested: { explanationBody: "forbidden" } },
    { nested: { originalText: "forbidden" } },
    { planningScore: 100 },
    { title: "official grading claim" },
    { rationale: "score prediction claim" },
    { primaryAction: "model answer check" },
  ];

  for (const fixture of rejectedFixtures) {
    assert.throws(
      () => enrichTodayPlanActionWithQnetReference(action(fixture)),
      /metadata only; rejected field|rejects official grading\/score\/model-answer claims/,
    );
  }
});

test("Q-Net Today Plan adapter source avoids raw material readers and learner-facing archive behavior", async () => {
  const source = await readFile("lib/review-os/qnet-reference-today-plan-adapter.ts", "utf8");
  const forbiddenImplementationTerms = [
    "local_official_materials",
    "qnet_manifest.json",
    ".pdf",
    ".hwp",
    ".hwpx",
    ".docx",
    ".zip",
    "problem browser",
    "source excerpt",
  ];

  for (const term of forbiddenImplementationTerms) {
    assert.equal(source.includes(term), false, `adapter must not include ${term}`);
  }
});
