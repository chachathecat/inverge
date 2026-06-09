import test from "node:test";
import assert from "node:assert/strict";

import {
  buildQnetReferenceCoverageReport,
  summarizeQnetReferenceCoverage,
  summarizeQnetReferenceDominance,
  summarizeQnetReferenceSafety,
} from "../lib/review-os/qnet-reference-metrics.ts";
import { buildTodayPlanSourceUnion } from "../lib/review-os/today-plan-source-union.ts";

function qnetReference(overrides = {}) {
  return {
    matchedSourceIds: ["qnet-source-1", "qnet-source-2"],
    matchedTopics: ["topic-a", "topic-b", "topic-a"],
    matchedCurriculumNodeCandidates: ["node-a"],
    trapPatternCandidates: ["trap-a"],
    answerSkeletonTags: ["skeleton-a"],
    calculationTemplateCandidates: ["calculation-a"],
    casioRelevant: true,
    metadataOnly: true,
    safeUse: "metadata_reference_only",
    ...overrides,
  };
}

function action(overrides = {}) {
  return {
    id: "action-1",
    source: "study_schedule",
    examMode: "second",
    subjectId: "second_practice",
    unitId: "second_practice_three_approaches",
    taskType: "rewrite",
    title: "metadata retry",
    rationale: "existing learner-derived action",
    primaryAction: "rewrite one outline",
    estimatedMinutes: 15,
    prioritySignals: ["schedule_track_focus"],
    isPrimaryTask: true,
    metadataOnly: true,
    ...overrides,
  };
}

test("Q-Net reference coverage report is metadata-only and handles empty actions", () => {
  const report = buildQnetReferenceCoverageReport([]);

  assert.equal(report.metadataOnly, true);
  assert.equal(report.safeUse, "closed_beta_reference_metrics_only");
  assert.equal(report.totalActions, 0);
  assert.equal(report.actionsWithQnetReference, 0);
  assert.equal(report.qnetReferenceCoverageRate, 0);
  assert.equal(report.rawLeakCount, 0);
  assert.equal(report.officialClaimLeakCount, 0);
});

test("Q-Net reference coverage counts source, topic, trap, skeleton, calculation, and CASIO metadata", () => {
  const actions = [
    action({ id: "qnet-a", qnetReference: qnetReference() }),
    action({
      id: "qnet-b",
      qnetReference: qnetReference({
        matchedSourceIds: ["qnet-source-2", "qnet-source-3"],
        matchedTopics: ["topic-b", "topic-c"],
        trapPatternCandidates: ["trap-b"],
        answerSkeletonTags: ["skeleton-b"],
        calculationTemplateCandidates: ["calculation-b"],
        casioRelevant: false,
      }),
    }),
    action({ id: "plain", subjectId: "unmatched", unitId: "plain-unit" }),
  ];

  const coverage = summarizeQnetReferenceCoverage(actions);
  const report = buildQnetReferenceCoverageReport({ actions });

  assert.equal(coverage.totalActions, 3);
  assert.equal(coverage.actionsWithQnetReference, 2);
  assert.equal(coverage.qnetReferenceCoverageRate, 2 / 3);
  assert.equal(report.matchedSourceIdCount, 3);
  assert.equal(report.matchedTopicCount, 3);
  assert.equal(report.matchedTrapPatternCount, 2);
  assert.equal(report.matchedAnswerSkeletonCount, 2);
  assert.equal(report.matchedCalculationTemplateCount, 2);
  assert.equal(report.casioRelevantActionCount, 1);
});

test("Q-Net reference metrics count official-reference and learner-derived signals separately", () => {
  const actions = [
    action({
      id: "learner-and-qnet",
      prioritySignals: [
        "due_review",
        "wrong_concept",
        "official_reference_source_verified",
        "official_reference_topic_match",
        "official_reference_trap_pattern_candidate",
      ],
      qnetReference: qnetReference(),
    }),
    action({
      id: "confident-wrong",
      prioritySignals: ["learning_state:confident_wrong", "recent_missed_tasks"],
    }),
  ];

  const dominance = summarizeQnetReferenceDominance(actions);

  assert.equal(dominance.officialReferenceSignalCount, 3);
  assert.equal(dominance.learnerDerivedSignalCount, 4);
});

test("Q-Net reference boost passes when it enriches but does not dominate stronger learner signals", () => {
  const actions = [
    action({ id: "confident-wrong", prioritySignals: ["confident_wrong_concept"] }),
    action({ id: "due-review", prioritySignals: ["due_review"] }),
    action({
      id: "qnet-schedule",
      prioritySignals: [
        "schedule_track_focus",
        "official_reference_source_verified",
        "official_reference_topic_match",
      ],
      qnetReference: qnetReference(),
    }),
  ];

  const report = buildQnetReferenceCoverageReport(actions);

  assert.deepEqual(report.potentialDominanceWarnings, []);
  assert.equal(report.qnetBoostedButNotDominatingCount, 1);
});

test("Q-Net reference metrics warn when official-reference signals appear to dominate learner-derived recovery signals", () => {
  const actions = [
    action({
      id: "qnet-high-over-wrong",
      prioritySignals: [
        "high_risk_unit",
        "exam_proximity",
        "schedule_track_focus",
        "official_reference_source_verified",
        "official_reference_topic_match",
        "official_reference_trap_pattern_candidate",
        "official_reference_answer_skeleton_candidate",
        "official_reference_calculation_template_candidate",
        "official_reference_casio_relevant",
      ],
      qnetReference: qnetReference(),
    }),
    action({ id: "wrong-learner-task", prioritySignals: ["wrong_concept"] }),
  ];

  const report = buildQnetReferenceCoverageReport(actions);

  assert.equal(report.qnetBoostedButNotDominatingCount, 0);
  assert.equal(report.potentialDominanceWarnings.length, 1);
  assert.match(report.potentialDominanceWarnings[0], /official-reference-signal-may-dominate-learner-signal:qnet-high-over-wrong:wrong-learner-task/);
});

test("Q-Net reference safety detects raw field leaks without emitting raw content", () => {
  const report = buildQnetReferenceCoverageReport([
    action({
      id: "unsafe-raw",
      problemText: "DO_NOT_EMIT_RAW_QUESTION",
      nested: {
        sourceExcerpt: "DO_NOT_EMIT_SOURCE_EXCERPT",
        localFileName: "DO_NOT_EMIT_LOCAL_FILE.pdf",
      },
    }),
  ]);
  const safety = summarizeQnetReferenceSafety([
    action({ id: "unsafe-string", title: "raw question text should be counted" }),
  ]);
  const serialized = JSON.stringify(report);

  assert.ok(report.rawLeakCount >= 3);
  assert.ok(safety.rawLeakCount >= 1);
  assert.equal(serialized.includes("DO_NOT_EMIT_RAW_QUESTION"), false);
  assert.equal(serialized.includes("DO_NOT_EMIT_SOURCE_EXCERPT"), false);
  assert.equal(serialized.includes("DO_NOT_EMIT_LOCAL_FILE"), false);
  assert.equal(serialized.includes("problemText"), false);
  assert.equal(serialized.includes("sourceExcerpt"), false);
  assert.equal(serialized.includes("localFileName"), false);
});

test("Q-Net reference safety detects official grading, model-answer, pass-fail, and prediction claims", () => {
  const report = buildQnetReferenceCoverageReport([
    action({
      id: "unsafe-claims",
      title: "official grading claim",
      rationale: "model answer and score prediction claim",
      primaryAction: "pass/fail and pass guarantee claim",
    }),
  ]);
  const serialized = JSON.stringify(report);

  assert.ok(report.officialClaimLeakCount >= 4);
  assert.equal(serialized.includes("official grading claim"), false);
  assert.equal(serialized.includes("model answer"), false);
  assert.equal(serialized.includes("score prediction"), false);
  assert.equal(serialized.includes("pass/fail"), false);
});

test("Q-Net reference report never emits raw text, local file, official answer, excerpt, or scoring fields", () => {
  const report = buildQnetReferenceCoverageReport([
    action({
      id: "unsafe-fields",
      rawOcrText: "DO_NOT_EMIT_OCR",
      answerText: "DO_NOT_EMIT_ANSWER",
      officialAnswerBody: "DO_NOT_EMIT_OFFICIAL_ANSWER",
      sourceExcerpt: "DO_NOT_EMIT_EXCERPT",
      localRawFileName: "DO_NOT_EMIT_LOCAL_NAME.hwp",
      score: 100,
      officialScore: 100,
      predictedScore: 90,
      passFail: "pass",
    }),
  ]);
  const serialized = JSON.stringify(report);

  assert.ok(report.rawLeakCount >= 8);
  assert.doesNotMatch(
    serialized,
    /DO_NOT_EMIT|rawOcrText|answerText|officialAnswerBody|sourceExcerpt|localRawFileName|"score"|"officialScore"|"predictedScore"|"passFail"/,
  );
});

test("Today Plan source union still caps visible primary actions at 3", () => {
  const conceptGraphActions = Array.from({ length: 5 }, (_, index) => ({
    id: `metrics-concept-${index}`,
    nodeId: `metrics-node-${index}`,
    userId: "u-qnet-metrics",
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
  assert.ok(plan.every((item) => item.metadataOnly === true));
});
