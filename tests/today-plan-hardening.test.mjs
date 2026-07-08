import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { buildTodayPlanTasks, selectActiveTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

const now = new Date("2026-06-17T09:00:00.000Z");

function read(path) {
  return readFileSync(path, "utf8");
}

function queue(overrides = {}) {
  return {
    queueId: `q-${overrides.itemId ?? "base"}`,
    itemId: overrides.itemId ?? "review-due",
    examName: overrides.examName ?? "감정평가사 1차",
    subjectLabel: overrides.subjectLabel ?? "민법",
    problemTitle: overrides.problemTitle ?? "점유취득시효",
    topicTag: overrides.topicTag ?? "민법",
    mistakeType: overrides.mistakeType ?? "요건 누락",
    reviewReason: overrides.reviewReason ?? "복습 예정",
    priorityScore: overrides.priorityScore ?? 50,
    dueAt: overrides.dueAt ?? "2026-06-16T00:00:00.000Z",
    recurrenceCount: overrides.recurrenceCount ?? 1,
    confidence: overrides.confidence ?? "중간",
    timeSpentSeconds: overrides.timeSpentSeconds ?? 600,
    createdFromCapture: overrides.createdFromCapture ?? false,
    itemCreatedAt: overrides.itemCreatedAt ?? "2026-06-15T00:00:00.000Z",
    ...overrides,
  };
}

function captureItem(overrides = {}) {
  return {
    id: overrides.id ?? "capture-note-1",
    examName: overrides.examName ?? "감정평가사 2차",
    subjectLabel: overrides.subjectLabel ?? "감정평가 및 보상법규",
    confidence: overrides.confidence ?? "중간",
    createdAt: overrides.createdAt ?? "2026-06-17T08:00:00.000Z",
    createdFromCapture: true,
    rawPayload: {
      rawOcrText: "SHOULD_NOT_LEAK_RAW_OCR",
      rawAnswerText: "SHOULD_NOT_LEAK_RAW_ANSWER",
      problemText: "SHOULD_NOT_LEAK_PROBLEM",
    },
    derivedPayload: {
      capture_note_engine_v2: {
        one_biggest_gap: "사업인정 처분성 판단 기준",
        one_next_action: "처분성 요건 1개를 문단으로 다시 씁니다.",
      },
      uploadedFileContent: "SHOULD_NOT_LEAK_UPLOAD",
    },
    ...overrides,
  };
}

test("/app renders Today Plan as the learner daily operating center", () => {
  const appPage = read("app/app/page.tsx");

  assert.ok(appPage.includes("오늘 할 일"));
  assert.ok(appPage.includes("오늘의 우선순위 · 최대 3개"));
  assert.ok(appPage.includes("data-today-plan-primary-surface"));
  assert.ok(appPage.includes("data-visible-primary-task-cap={TODAY_PLAN_MAX_PRIMARY_TASKS}"));
  assert.ok(appPage.includes("data-today-plan-empty-state"));
});

test("Today Plan empty state links learners back to Capture", () => {
  const appPage = read("app/app/page.tsx");

  assert.ok(appPage.includes("오늘 할 일이 아직 없습니다."));
  assert.ok(appPage.includes("오늘 한 것을 하나 올리면 다음 행동이 만들어집니다."));
  assert.match(appPage, /todayPlanTasks\.length === 0[\s\S]{0,500}<Link href=\{modeCaptureHref\}[\s\S]{0,180}오늘 한 것 올리기/);
});

test("Today Plan active selector caps tasks and excludes completed tasks", () => {
  const tasks = Array.from({ length: 5 }, (_, index) => ({
    itemId: `candidate-${index}`,
    title: `오늘 계획 항목 ${index}`,
    subject: "민법",
    exam_mode: "first",
    due_bucket: "today",
    status: index === 0 ? "completed" : "due",
    reason: "복습 예정 항목입니다.",
    one_biggest_gap: "가장 큰 약점 1개",
    one_next_action: "다음 행동 1개",
    task_type: "concept_review",
    estimated_minutes: 10,
    priority_reason: "복습 예정입니다.",
    primary_cta: { label: "시작하기", hrefKind: "session" },
    created_from_capture: false,
    source_label: "복습 예정",
  }));

  const selected = selectActiveTodayPlanTasks(tasks);
  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
  assert.equal(selected.length, 3);
  assert.equal(selected.some((task) => task.status === "completed"), false);
});

test("Capture note next action can become a safe Today task", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    now,
    queue: [],
    items: [captureItem()],
    learningSignals: [],
  });

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].one_biggest_gap, "사업인정 처분성 판단 기준");
  assert.equal(tasks[0].one_next_action, "처분성 요건 1개를 문단으로 다시 씁니다.");
  assert.equal(tasks[0].created_from_capture, true);
  assert.equal(tasks[0].display_source_label, "학습 노트에서 생성됨");

  const serialized = JSON.stringify(tasks);
  for (const forbidden of ["SHOULD_NOT_LEAK_RAW_OCR", "SHOULD_NOT_LEAK_RAW_ANSWER", "SHOULD_NOT_LEAK_PROBLEM", "SHOULD_NOT_LEAK_UPLOAD"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("Review due item can become a Today task with review-due source copy", () => {
  const tasks = buildTodayPlanTasks({
    mode: "first",
    now,
    queue: [queue({ itemId: "due-a" }), queue({ itemId: "due-b", priorityScore: 70 }), queue({ itemId: "due-c" }), queue({ itemId: "due-d" })],
    items: [],
    learningSignals: [],
  });

  assert.equal(tasks.length, 3);
  assert.equal(tasks.some((task) => task.display_source_label === "복습 예정"), true);
  assert.equal(tasks.every((task) => task.status !== "completed"), true);
});

test("Today task data and learner surfaces avoid raw text fields and forbidden claims", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    now,
    queue: [],
    items: [captureItem()],
    learningSignals: [],
  });
  const appPage = read("app/app/page.tsx");
  const serialized = `${JSON.stringify(tasks)}\n${appPage}`;

  assert.doesNotMatch(serialized, /rawOcrText|rawAnswerText|rawProblemText|problemText|questionText|uploadedFileContent|officialAnswerText/i);
  assert.doesNotMatch(serialized, /기준 답안|공식 채점|모범답안|점수예측|합격예측|합격 가능성 확정|pass\/fail/i);
});

test("Capture, Review, Notes/Items, and Agenda route files remain present", () => {
  [
    "app/app/capture/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
    "app/app/items/page.tsx",
    "app/app/agenda/page.tsx",
  ].forEach((path) => assert.equal(existsSync(path), true, path));
});
