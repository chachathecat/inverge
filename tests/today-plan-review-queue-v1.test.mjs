import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const now = new Date("2026-05-30T00:00:00.000Z");

function item(overrides = {}) {
  return {
    id: "item-1",
    userId: "u1",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    sourceType: "photo",
    correctAnswer: "정답",
    userAnswer: "내 답",
    confidence: "중간",
    dedupeKey: "d1",
    processingStatus: "completed",
    rawPayload: { created_from_capture: true, user_confirmed_fields: { pageCount: 1 } },
    derivedPayload: { created_from_capture: true },
    createdAt: "2026-05-29T23:00:00.000Z",
    updatedAt: "2026-05-29T23:00:00.000Z",
    ...overrides,
  };
}

function queue(overrides = {}) {
  return {
    queueId: "q1",
    itemId: "queue-item",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    problemTitle: "점유취득시효",
    topicTag: "민법",
    mistakeType: "요건 누락",
    reviewReason: "재시도",
    priorityScore: 50,
    dueAt: "2026-05-30T00:00:00.000Z",
    recurrenceCount: 1,
    confidence: "중간",
    timeSpentSeconds: 600,
    createdFromCapture: false,
    itemCreatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}

test("saved Capture-to-Note item appears in Today Plan", () => {
  const tasks = buildTodayPlanTasks({ mode: "first", now, queue: [], items: [item({ problemTitle: "저장한 민법 노트" })] });
  assert.equal(tasks[0]?.title, "저장한 민법 노트");
  assert.equal(tasks[0]?.created_from_capture, true);
  assert.equal(tasks[0]?.source_label, "저장한 캡처 노트 기반");
});

test("multi-page low-confidence OCR item appears as confirmation task", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    now,
    queue: [],
    items: [item({
      id: "ocr-1",
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      rawPayload: { created_from_capture: true, user_confirmed_fields: { pageCount: 3, lowConfidenceFlag: true, captureQualityIssue: "low_confidence_ocr" } },
    })],
  });
  assert.equal(tasks[0]?.task_type, "ocr_confirmation");
  assert.equal(tasks[0]?.source_label, "확인 필요");
  assert.match(tasks[0]?.reason ?? "", /여러 페이지 OCR/);
});

test("Today Plan defaults to max 3 tasks and highest priority due item first", () => {
  const tasks = buildTodayPlanTasks({
    mode: "first",
    now,
    queue: [
      queue({ itemId: "future-high", dueAt: "2026-06-03T00:00:00.000Z", priorityScore: 100 }),
      queue({ itemId: "due", dueAt: "2026-05-29T00:00:00.000Z", priorityScore: 20 }),
      queue({ itemId: "a", priorityScore: 30 }),
      queue({ itemId: "b", priorityScore: 40 }),
    ],
  });
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].itemId, "due");
});

test("task details are collapsed by default and mobile surface avoids fixed overflow", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("세부 내용 보기"));
  assert.equal(/세부 내용 보기[\s\S]{0,120}<details open/.test(source), false);
  assert.equal(source.includes("min-w-[20rem]"), false);
  assert.ok(source.includes("w-full sm:w-auto"));
});

test("completion keeps pending/due/completed review queue language", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  ["대기", "진행 필요", "완료", "완료한 항목은 Today Plan에서 사라지고 복습 이력에 남습니다."].forEach((token) => assert.ok(source.includes(token), token));
  const service = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(service.includes("completeReviewQueueItem"));
  assert.ok(service.includes("createFollowUpReviewQueueEntry"));
});
