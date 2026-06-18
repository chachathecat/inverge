import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LEARNING_AGENDA_EVENT_TYPES,
  assertLearningAgendaEventMetadataOnly,
  buildLearningAgendaEvents,
  buildLearningAgendaMonthCells,
  buildLearningAgendaWeekGroups,
  buildLocalBetaLearningAgendaEvents,
  groupLearningAgendaEventsByDay,
} from "../lib/review-os/learning-agenda.ts";

const read = (path) => readFileSync(path, "utf8");

const forbiddenCopy = /기준 답안|모범답안|공식답안|공식 채점|점수예측|합격예측|합격 가능성 확정|정답 확정|최종 판단|pass\/fail/i;

test("/app/agenda route renders learner agenda shell and sections", () => {
  const page = read("app/app/agenda/page.tsx");
  const client = read("components/review-os/learning-agenda-client.tsx");
  const shell = read("components/learner/learner-ui.tsx");

  assert.ok(page.includes("LearningAgendaPage"));
  assert.ok(page.includes("LearningAgendaClient"));
  assert.ok(page.includes('buildReviewOsReturnTo("/app/agenda"'));
  assert.ok(page.includes("listReviewQueueForAgenda"));
  assert.ok(page.includes("listLearningAgendaUsageEvents"));

  [
    "학습 기록",
    "오늘 한 것과 복습 흐름을 날짜별로 모아봅니다.",
    "월간 heatmap",
    "주간 agenda",
    "일별 detail",
  ].forEach((text) => assert.ok(client.includes(text), text));

  assert.ok(shell.includes('href: "/app/agenda"'));
  assert.ok(shell.includes('label: "학습 기록"'));
});

test("agenda empty state links learner back to capture", () => {
  const client = read("components/review-os/learning-agenda-client.tsx");

  assert.ok(client.includes("아직 쌓인 학습 기록이 없습니다."));
  assert.ok(client.includes("오늘 한 것을 하나 올리면 기록이 시작됩니다."));
  assert.ok(client.includes("오늘 한 것 올리기"));
  assert.ok(client.includes("/app/capture?mode="));
});

test("agenda supports exactly the six allowed event types with calm copy", () => {
  assert.deepEqual([...LEARNING_AGENDA_EVENT_TYPES], [
    "capture_saved",
    "note_created",
    "review_due",
    "review_completed",
    "today_task_completed",
    "weakness_recovered",
  ]);

  const events = buildLearningAgendaEvents({
    mode: "first",
    items: [
      {
        id: "item-1",
        examName: "감정평가사 1차",
        subjectLabel: "민법",
        createdAt: "2026-06-01T09:00:00.000Z",
        createdFromCapture: true,
      },
    ],
    reviewQueue: [
      {
        queueId: "queue-1",
        itemId: "item-1",
        examName: "감정평가사 1차",
        subjectLabel: "민법",
        dueAt: "2026-06-02T09:00:00.000Z",
      },
    ],
    usageEvents: [
      { id: "usage-review", eventName: "review_complete", entityId: "queue-1", entityType: "review_queue_item", createdAt: "2026-06-03T09:00:00.000Z" },
      { id: "usage-today", eventName: "today_task_completed", entityId: "task-1", entityType: "today_task", createdAt: "2026-06-04T09:00:00.000Z" },
      { id: "usage-weakness", eventName: "weakness_recovered", entityId: "weak-1", entityType: "learning_signal", createdAt: "2026-06-05T09:00:00.000Z" },
    ],
  });

  const types = new Set(events.map((event) => event.type));
  for (const type of LEARNING_AGENDA_EVENT_TYPES) assert.ok(types.has(type), type);
  ["오늘 한 것 기록", "학습 노트 저장", "복습 예정", "복습 완료", "오늘 할 일 완료", "약점 회복 후보"].forEach((title) =>
    assert.ok(events.some((event) => event.title === title), title),
  );
});

test("agenda event data is derived metadata only", () => {
  const events = buildLearningAgendaEvents({
    mode: "second",
    items: [
      {
        id: "item-2",
        examName: "감정평가사 2차",
        subjectLabel: "감정평가이론",
        createdAt: "2026-06-01T09:00:00.000Z",
        createdFromCapture: true,
      },
    ],
    usageEvents: [
      { id: "usage-capture", eventName: "capture_saved", entityId: "item-2", entityType: "wrong_answer_item", createdAt: "2026-06-01T09:00:00.000Z" },
    ],
  });

  const allowedKeys = new Set(["id", "type", "title", "date", "sourceId", "subject", "noteId", "reviewItemId", "todayTaskId"]);
  for (const event of events) {
    Object.keys(event).forEach((key) => assert.ok(allowedKeys.has(key), key));
    assertLearningAgendaEventMetadataOnly(event);
    const serialized = JSON.stringify(event);
    assert.doesNotMatch(serialized, /rawOcrText|rawAnswerText|rawProblemText|rawQuestionText|uploadedFileContent|fileContent|ocrText|problemText|answerText/i);
  }

  assert.throws(
    () => assertLearningAgendaEventMetadataOnly({ id: "bad", type: "note_created", title: "학습 노트 저장", date: "2026-06-01", rawOcrText: "원문" }),
    /raw learner field/,
  );

  const localEvents = buildLocalBetaLearningAgendaEvents(
    [{ id: "local-1", mode: "second", subjectLabel: "감정평가실무", createdAt: "2026-06-06T09:00:00.000Z" }],
    "second",
  );
  assert.equal(localEvents.length, 2);
  localEvents.forEach((event) => assertLearningAgendaEventMetadataOnly(event));
});

test("agenda grouping helpers support heatmap, week, and daily detail", () => {
  const events = buildLearningAgendaEvents({
    mode: "first",
    items: [
      { id: "item-1", examName: "감정평가사 1차", subjectLabel: "민법", createdAt: "2026-06-17T09:00:00.000Z", createdFromCapture: true },
    ],
    reviewQueue: [
      { queueId: "queue-1", itemId: "item-1", examName: "감정평가사 1차", subjectLabel: "민법", dueAt: "2026-06-18T09:00:00.000Z" },
    ],
  });
  const monthCells = buildLearningAgendaMonthCells(events, new Date("2026-06-17T00:00:00.000Z"));
  const weekGroups = buildLearningAgendaWeekGroups(events, new Date("2026-06-17T00:00:00.000Z"));
  const dayGroups = groupLearningAgendaEventsByDay(events);

  assert.equal(monthCells.length, 30);
  assert.ok(monthCells.some((cell) => cell.date === "2026-06-17" && cell.active));
  assert.equal(weekGroups.length, 7);
  assert.ok(weekGroups.some((group) => group.date === "2026-06-18" && group.events.length === 1));
  assert.ok(dayGroups.some((group) => group.date === "2026-06-17" && group.events.length >= 2));
});

test("agenda introduces no forbidden learner wording, calendar editing, APIs, or external integrations", () => {
  const combined = [
    read("app/app/agenda/page.tsx"),
    read("components/review-os/learning-agenda-client.tsx"),
    read("lib/review-os/learning-agenda.ts"),
  ].join("\n");

  assert.doesNotMatch(combined, forbiddenCopy);
  assert.doesNotMatch(combined, /drag|drop|calendar integration|Google Calendar|Outlook|notification|provider SDK|middleware|route\.ts|npm audit fix/i);
  assert.doesNotMatch(combined, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|logUsageEvent\(/);
});
