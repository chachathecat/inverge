import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdaptiveTodayPlan,
  buildAdaptiveWeeklyPlan,
  rankAdaptiveStudyCandidates,
} from "../lib/review-os/adaptive-study-plan-engine.ts";

const currentDate = "2026-06-08T00:00:00.000Z";
const baseInput = {
  userId: "u-adaptive",
  examMode: "first",
  currentDate,
  dailyAvailableMinutes: 60,
  daysUntilExam: 45,
};

const curriculumNodes = [
  { examMode: "first", unitId: "civil-nullity", unitName: "무효·취소", subjectId: "civil", subjectName: "민법", importance: "medium", riskLevel: "medium", taskTypes: ["O/X"] },
  { examMode: "first", unitId: "appraisal-risk", unitName: "평가방식 위험단원", subjectId: "appraisal", subjectName: "감정평가 관계법규", importance: "high", riskLevel: "high", taskTypes: ["cloze"] },
  { examMode: "first", unitId: "stable-new", unitName: "안정 단원", subjectId: "civil", subjectName: "민법", importance: "low", riskLevel: "low", taskTypes: ["O/X"] },
];

const forbiddenSerializedPattern = /rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|rawAnswerText|sourceText|copyrightedText|official grading|official score|official model answer|공식\s*채점|공식\s*점수|모범\s*답안|pass\s*\/\s*fail|pass-fail|score prediction|합격\s*보장/i;
const shameFearPattern = /실패자|게으름|망했|불합격\s*확정|지금\s*안\s*하면\s*끝|공포|부끄럽|순위\s*하락|streak|casino|gacha|랜덤\s*보상/i;

function state(overrides) {
  return {
    metadataOnly: true,
    userId: "u-adaptive",
    examMode: "first",
    subject: "민법",
    conceptNodeId: "civil-nullity",
    status: "wrong",
    nextReviewAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

test("due review outranks new study", () => {
  const ranked = rankAdaptiveStudyCandidates({
    ...baseInput,
    personalLearningStates: [state({ conceptNodeId: "civil-nullity", status: "stable", nextReviewAt: currentDate })],
    curriculumNodes,
  });

  assert.equal(ranked[0].conceptNodeId, "civil-nullity");
  assert.ok(ranked[0].prioritySignals.includes("due_review"));
  assert.notEqual(ranked[0].source, "curriculum");
});

test("confident_wrong outranks wrong and confused", () => {
  const ranked = rankAdaptiveStudyCandidates({
    ...baseInput,
    personalLearningStates: [
      state({ conceptNodeId: "wrong-node", status: "wrong", nextReviewAt: "2026-06-09T00:00:00.000Z" }),
      state({ conceptNodeId: "confused-node", status: "confused", nextReviewAt: "2026-06-09T00:00:00.000Z" }),
      state({ conceptNodeId: "confident-node", status: "confident_wrong", nextReviewAt: "2026-06-09T00:00:00.000Z" }),
    ],
    curriculumNodes: [
      ...curriculumNodes,
      { examMode: "first", unitId: "wrong-node", unitName: "일반 오답", taskTypes: ["O/X"] },
      { examMode: "first", unitId: "confused-node", unitName: "혼동 개념", taskTypes: ["O/X"] },
      { examMode: "first", unitId: "confident-node", unitName: "확신 오답", taskTypes: ["O/X"] },
    ],
  });

  assert.equal(ranked[0].conceptNodeId, "confident-node");
  assert.ok(ranked[0].prioritySignals.includes("confident_wrong_concept"));
});

test("high pass-risk curriculum node raises priority", () => {
  const ranked = rankAdaptiveStudyCandidates({
    ...baseInput,
    personalLearningStates: [
      state({ conceptNodeId: "civil-nullity", status: "wrong" }),
      state({ conceptNodeId: "appraisal-risk", status: "wrong", subject: "감정평가 관계법규" }),
    ],
    curriculumNodes,
  });

  assert.equal(ranked[0].unitId, "appraisal-risk");
  assert.ok(ranked[0].prioritySignals.includes("high_risk_node"));
});

test("dailyAvailableMinutes=30 creates smaller tasks", () => {
  const plan = buildAdaptiveTodayPlan({
    ...baseInput,
    dailyAvailableMinutes: 30,
    personalLearningStates: [
      state({ conceptNodeId: "civil-nullity", status: "confident_wrong", nextReviewAt: currentDate }),
      state({ conceptNodeId: "appraisal-risk", status: "wrong", subject: "감정평가 관계법규", nextReviewAt: currentDate }),
      state({ conceptNodeId: "stable-new", status: "confused", nextReviewAt: currentDate }),
    ],
    curriculumNodes,
  });

  assert.ok(plan.todayPlanTasks.length <= 3);
  assert.ok(plan.todayPlanTasks.every((task) => task.estimatedMinutes <= 10));
  assert.ok(plan.todayPlanTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) <= 30);
});

test("missed day creates calm recovery plan without shame or fear copy", () => {
  const plan = buildAdaptiveTodayPlan({
    ...baseInput,
    missedDays: 1,
    personalLearningStates: [state({ status: "wrong", nextReviewAt: "2026-06-06T00:00:00.000Z" })],
    curriculumNodes,
  });

  assert.equal(plan.recoveryPlan.required, true);
  assert.ok(plan.recoveryPlan.items.length > 0);
  assert.doesNotMatch(JSON.stringify(plan), shameFearPattern);
});

test("stable concepts are deprioritized unless due", () => {
  const ranked = rankAdaptiveStudyCandidates({
    ...baseInput,
    personalLearningStates: [
      state({ conceptNodeId: "stable-new", status: "stable", nextReviewAt: "2026-06-20T00:00:00.000Z" }),
      state({ conceptNodeId: "civil-nullity", status: "wrong", nextReviewAt: "2026-06-20T00:00:00.000Z" }),
    ],
    curriculumNodes,
  });

  assert.notEqual(ranked[0].conceptNodeId, "stable-new");
  const dueStable = rankAdaptiveStudyCandidates({
    ...baseInput,
    personalLearningStates: [
      state({ conceptNodeId: "stable-new", status: "stable", nextReviewAt: currentDate }),
      state({ conceptNodeId: "civil-nullity", status: "confused", nextReviewAt: "2026-06-20T00:00:00.000Z" }),
    ],
    curriculumNodes,
  });
  assert.equal(dueStable[0].conceptNodeId, "stable-new");
});

test("weekly plan includes max 3 focus lines and is metadata only", () => {
  const weekly = buildAdaptiveWeeklyPlan({
    ...baseInput,
    missedDays: 1,
    personalLearningStates: [
      state({ conceptNodeId: "civil-nullity", status: "confident_wrong", nextReviewAt: currentDate }),
      state({ conceptNodeId: "appraisal-risk", status: "wrong", nextReviewAt: currentDate }),
      state({ conceptNodeId: "stable-new", status: "confused", nextReviewAt: "2026-06-09T00:00:00.000Z" }),
    ],
    curriculumNodes,
  });

  assert.equal(weekly.metadataOnly, true);
  assert.ok(weekly.weeklyFocus.length <= 3);
  assert.ok(weekly.targetConcepts.length > 0);
  assert.ok(weekly.estimatedTotalMinutes > 0);
});

test("unsupported exam mode rejected safely", () => {
  const plan = buildAdaptiveTodayPlan({ ...baseInput, examMode: "cpa", curriculumNodes });
  assert.equal(plan.todayPlanTasks.length, 0);
  assert.match(plan.safeFallbackReason, /unsupported-adaptive-study-plan-exam-mode/);
});

test("no raw fields or official grading claims appear", () => {
  const plan = buildAdaptiveTodayPlan({
    ...baseInput,
    personalLearningStates: [state({ status: "confident_wrong", nextReviewAt: currentDate })],
    curriculumNodes,
  });
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, forbiddenSerializedPattern);
  assert.doesNotMatch(serialized, shameFearPattern);
});
