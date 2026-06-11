import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-learner-route-integration.ts";

function read(file) {
  return readFileSync(file, "utf8");
}

const rawLeakPatterns = [
  /rawOcrText|raw_ocr_text|rawOCR/i,
  /rawProblemText|problemText|questionText|rawQuestionText|uploadedProblemText/i,
  /rawAnswerText|userAnswerText|rawUserAnswer|answerText/i,
  /sourceText|copyrightedText|originalText|fullText/i,
  /officialAnswer|modelAnswer|scorePrediction|passFail|instructorComment/i,
];

const blockedLearnerSurfacePatterns = [
  /href=[{\"'`][^\n]*(?:\/instructor|\/admin|\/studio)/i,
  /payment|checkout|paywall|결제|유료/i,
  /archive|아카이브/i,
  /native app|mobile app|네이티브 앱|모바일 앱/i,
];

test("/app keeps gated durable Today Plan route helper", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /buildLearnerTodayPlanTasksWithGatedDurableConceptGraph\s*\(/);
  assert.match(appPage, /today-plan-learner-route-integration/);
  assert.doesNotMatch(appPage, /buildTodayPlanTasks\s*\(/, "/app should not bypass the gated learner route helper");
});

test("Today Plan engine/source output remains max 3 after durable merge", async () => {
  const tasks = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: "visible-action-cap-user",
    mode: "first",
    queue: [],
    items: [],
    learningSignals: [],
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
      PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
    },
    durableReadHelper: async () => ({
      actions: Array.from({ length: 5 }, (_, index) => ({
        id: `durable-visible-${index}`,
        source: "personal_concept_graph",
        examMode: "first",
        subjectId: "민법",
        unitId: `unit-${index}`,
        taskType: "concept_review",
        title: `메타데이터 개념 ${index + 1}`,
        rationale: "메타데이터 기반 간극입니다.",
        primaryAction: "개념 1개 회상",
        estimatedMinutes: 10,
        prioritySignals: ["durable_graph"],
        isPrimaryTask: true,
        metadataOnly: true,
      })),
      diagnostics: { durableReadAttempted: true, durableReadSucceeded: true },
    }),
  });

  assert.equal(tasks.length, 3, "durable Today Plan merge should return max 3 primary tasks");
});

test("learner home visibly caps Today Plan primary task cards at three", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /const visibleTodayPlanTasks\s*=\s*todayPlanTasks\.slice\(0,\s*3\)/);
  assert.match(appPage, /const additionalTodayPlanTasks\s*=\s*todayPlanTasks\.slice\(3\)/);
  assert.match(appPage, /visibleTodayPlanTasks\.map/);
  assert.match(appPage, /data-today-plan-primary-surface/);
  assert.match(appPage, /data-visible-primary-task-cap="3"/);
  assert.match(appPage, /data-today-plan-primary-task/);
  assert.match(appPage, /추가 후보/);
  assert.match(appPage, /data-secondary-action-surface="additional-today-plan"/);
});

test("input cards are labeled as input options, not Today Plan tasks", () => {
  const appPage = read("app/app/page.tsx");
  const firstSubjectSelector = read("components/review-os/today-first-subject-selector.tsx");
  const combined = `${appPage}\n${firstSubjectSelector}`;

  assert.match(combined, /오늘 입력할 수 있는 것/);
  assert.match(combined, /입력 방식/);
  assert.match(appPage, /data-input-option-card/);
  assert.match(appPage, /const visibleInputOptions\s*=\s*inputOptions\.slice\(0,\s*3\)/);
  assert.doesNotMatch(combined, /data-input-option-card[\s\S]{0,240}data-today-plan-primary-task/);
});

test("secondary/supporting CTAs are under other-work or collapsed details surfaces", () => {
  const appPage = read("app/app/page.tsx");
  const firstSubjectSelector = read("components/review-os/today-first-subject-selector.tsx");
  const combined = `${appPage}\n${firstSubjectSelector}`;

  for (const label of ["다른 작업 보기", "다른 작업 · Problem Snap 신호 보기", "다른 작업 · 오늘 기록 근거 보기"]) {
    assert.equal(combined.includes(label), true, `${label} should be present`);
  }
  assert.match(combined, /<details[\s\S]{0,220}data-secondary-action-surface/);
  assert.match(firstSubjectSelector, /data-secondary-action-surface="first-mode-input-options"/);
});

test("first and second modes do not visually expose more than three primary Today Plan actions", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /mode === "first"[\s\S]*FIRST_MODE_INPUT_OPTIONS/);
  assert.match(appPage, /mode === "first"[\s\S]*SECOND_MODE_INPUT_OPTIONS/);
  assert.match(appPage, /visibleTodayPlanTasks\.map/);
  assert.doesNotMatch(appPage, /todayPlanTasks\.map\(\(task, index\)/, "raw Today Plan tasks should not map directly to visible primary cards");
});

test("empty state still has one primary next action", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /todayPlanTasks\.length === 0[\s\S]{0,500}오늘 학습 정리하기/);
  assert.match(appPage, /modeCaptureHref/);
});

test("learner home introduces no raw text leaks or blocked learner surfaces", () => {
  const appPage = read("app/app/page.tsx");
  for (const pattern of rawLeakPatterns) {
    assert.doesNotMatch(appPage, pattern, `raw/official learner field should not be introduced: ${pattern}`);
  }
  for (const pattern of blockedLearnerSurfacePatterns) {
    assert.doesNotMatch(appPage, pattern, `blocked learner surface should not appear: ${pattern}`);
  }
});
