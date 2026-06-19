import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  assertLearningAgendaEventMetadataOnly,
  buildLearningAgendaEvents,
} from "../lib/review-os/learning-agenda.ts";
import { TODAY_PLAN_MAX_PRIMARY_TASKS, selectActiveTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const read = (path) => readFileSync(path, "utf8");

const forbiddenLearnerCopy =
  /기준\s*답안|공식\s*채점|모범답안|점수\s*예측|합격\s*예측|합격\s*가능성\s*확정|pass\/fail|official model answer|score prediction/i;

test("/app/review renders a calm Review Queue shell and empty state", () => {
  const page = read("app/app/review/page.tsx");
  const client = read("components/review-os/review-queue-client.tsx");

  assert.equal(existsSync("app/app/review/page.tsx"), true);
  assert.ok(page.includes('title="복습"'));
  assert.ok(page.includes("학습 노트에서 만든"));
  assert.ok(client.includes("data-review-empty-state"));
  assert.ok(client.includes("지금 복습할 항목이 없습니다."));
  assert.ok(client.includes("오늘 한 것을 올리면 복습할 항목이 만들어집니다."));
  assert.ok(client.includes("오늘 한 것 올리기"));
  assert.ok(client.includes("/app/capture?mode=second"));
});

test("Review due and completion states use learner loop copy", () => {
  const client = read("components/review-os/review-queue-client.tsx");

  for (const phrase of ["복습 예정", "복습 완료", "학습 노트에서 생성됨", "미완료 항목", "다음 행동"]) {
    assert.ok(client.includes(phrase), phrase);
  }
  assert.doesNotMatch(client, forbiddenLearnerCopy);
  assert.doesNotMatch(client, /\/instructor|grade-second|second-grading/);
});

test("Review queue keeps one primary review surface and collapses extra signals", () => {
  const client = read("components/review-os/review-queue-client.tsx");

  assert.ok(client.includes("data-review-primary-surface"));
  assert.ok(client.includes("지금 복습할 1개"));
  assert.ok(client.includes("먼저 떠올리기"));
  assert.ok(client.includes("문단/기준 먼저 떠올리기"));
  assert.ok(client.includes("복습 완료"));
  assert.ok(client.includes("data-review-extra-signals"));
  assert.ok(client.includes("상세 신호 보기"));
  assert.ok(client.includes("data-review-secondary-list"));
  assert.ok(client.includes("다음 복습 후보"));
});

test("Notes and item detail expose biggest gap, next action, and loop connections", () => {
  const itemsPage = read("app/app/items/page.tsx");
  const notesPage = read("app/app/notes/page.tsx");
  const detailPage = read("app/app/items/[itemId]/page.tsx");
  const localBeta = read("components/review-os/local-beta-note-reflection.tsx");

  assert.ok(notesPage.includes("renderReviewOsItemsPage"));
  for (const source of [itemsPage, detailPage, localBeta]) {
    for (const phrase of ["학습 노트", "가장 큰 약점", "다음 행동", "오늘 할 일 연결", "복습 연결", "학습 기록 연결"]) {
      assert.ok(source.includes(phrase), phrase);
    }
  }
  assert.ok(detailPage.includes("data-note-loop-bridge"));
  assert.ok(itemsPage.includes("아직 정리된 약점 후보가 없습니다."));
  assert.ok(itemsPage.includes("아직 쌓인 학습 노트가 없습니다."));
});

test("Review and Notes connect to Agenda with derived metadata only", () => {
  const events = buildLearningAgendaEvents({
    mode: "second",
    items: [
      {
        id: "note-1",
        examName: "감정평가사 2차",
        subjectLabel: "감정평가 및 보상법규",
        createdAt: "2026-06-18T09:00:00.000Z",
        createdFromCapture: true,
      },
    ],
    reviewQueue: [
      {
        queueId: "queue-1",
        itemId: "note-1",
        examName: "감정평가사 2차",
        subjectLabel: "감정평가 및 보상법규",
        dueAt: "2026-06-19T09:00:00.000Z",
      },
    ],
    usageEvents: [
      { id: "review-complete-1", eventName: "review_completed", entityId: "queue-1", entityType: "review_queue", createdAt: "2026-06-20T09:00:00.000Z" },
      { id: "weakness-recovered-1", eventName: "weakness_recovered", entityId: "weak-1", entityType: "learning_signal", createdAt: "2026-06-21T09:00:00.000Z" },
    ],
  });

  assert.ok(events.some((event) => event.type === "review_completed" && event.title === "복습 완료"));
  assert.ok(events.some((event) => event.type === "weakness_recovered" && event.title === "약점 회복 후보"));

  for (const event of events) {
    assertLearningAgendaEventMetadataOnly(event);
    assert.doesNotMatch(JSON.stringify(event), /rawOcrText|rawAnswerText|rawProblemText|uploadedFileContent|officialAnswerText/i);
  }

  const agendaClient = read("components/review-os/learning-agenda-client.tsx");
  assert.ok(agendaClient.includes("복습 완료"));
  assert.ok(agendaClient.includes("약점 회복 후보"));
});

test("Today Plan max 3 and route presence remain intact", () => {
  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
  const tasks = Array.from({ length: 5 }, (_, index) => ({
    itemId: `task-${index}`,
    title: `오늘 할 일 ${index}`,
    subject: "민법",
    exam_mode: "first",
    due_bucket: "today",
    status: index === 0 ? "completed" : "due",
    reason: "복습 예정",
    one_biggest_gap: "가장 큰 약점",
    one_next_action: "다음 행동",
    task_type: "concept_review",
    estimated_minutes: 10,
    priority_reason: "복습 예정",
    primary_cta: { label: "시작", hrefKind: "review" },
    created_from_capture: false,
    source_label: "복습 예정",
  }));

  const selected = selectActiveTodayPlanTasks(tasks);
  assert.equal(selected.length, 3);
  assert.equal(selected.some((task) => task.status === "completed"), false);

  for (const route of ["app/app/capture/page.tsx", "app/app/page.tsx", "app/app/review/page.tsx", "app/app/notes/page.tsx", "app/app/items/page.tsx", "app/app/agenda/page.tsx"]) {
    assert.equal(existsSync(route), true, route);
  }
});

test("polished learner surfaces avoid forbidden wording and backend expansion", () => {
  const combined = [
    "app/app/review/page.tsx",
    "components/review-os/review-queue-client.tsx",
    "app/app/items/page.tsx",
    "app/app/items/[itemId]/page.tsx",
    "components/review-os/local-beta-note-reflection.tsx",
    "components/review-os/learning-agenda-client.tsx",
    "lib/review-os/learning-agenda.ts",
  ].map(read).join("\n");

  assert.doesNotMatch(combined, forbiddenLearnerCopy);
  assert.doesNotMatch(combined, /\/instructor\/second-grading|grade-second|second-grading/);
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|service_role|openai|embedding|Google Calendar|Outlook|notification|provider SDK/i);
  assert.doesNotMatch(combined, /app\/api\/|route\.ts|middleware|npm audit fix/i);
});
