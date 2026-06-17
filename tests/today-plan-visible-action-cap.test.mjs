import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-learner-route-integration.ts";
import { selectActiveTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

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

test("active Today Plan selector filters completed tasks and caps primary actions", () => {
  const active = selectActiveTodayPlanTasks(
    Array.from({ length: 5 }, (_, index) => ({
      itemId: `task-${index}`,
      title: `작업 ${index}`,
      subject: "민법",
      exam_mode: "first",
      due_bucket: "today",
      status: index === 0 ? "completed" : "due",
      reason: "저장된 학습 신호 기반입니다.",
      one_biggest_gap: "가장 큰 약점 1개",
      one_next_action: "다음 행동 1개",
      task_type: "concept_review",
      estimated_minutes: 10,
      priority_reason: "복습 예정입니다.",
      primary_cta: { label: "시작하기", hrefKind: "session" },
      created_from_capture: false,
      source_label: "복습 예정",
    })),
  );

  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
  assert.equal(active.length, 3);
  assert.equal(active.some((task) => task.status === "completed"), false);
});

test("learner home visibly caps Today Plan primary task cards at three", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /selectActiveTodayPlanTasks\(/);
  assert.match(appPage, /const visibleTodayPlanTasks\s*=\s*todayPlanTasks/);
  assert.match(appPage, /visibleTodayPlanTasks\.map/);
  assert.match(appPage, /data-today-plan-primary-surface/);
  assert.match(appPage, /data-visible-primary-task-cap=\{TODAY_PLAN_MAX_PRIMARY_TASKS\}/);
  assert.match(appPage, /data-today-plan-primary-task/);
  assert.doesNotMatch(appPage, /additionalTodayPlanTasks/);
  assert.doesNotMatch(appPage, /추가 후보/);
  assert.doesNotMatch(appPage, /data-secondary-action-surface="additional-today-plan"/);
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
  assert.match(appPage, /오늘 할 일이 아직 없습니다\./);
  assert.match(appPage, /오늘 한 것을 하나 올리면 다음 행동이 만들어집니다\./);
  assert.match(appPage, /todayPlanTasks\.length === 0[\s\S]{0,500}오늘 한 것 올리기/);
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
