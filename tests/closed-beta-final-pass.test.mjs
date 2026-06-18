import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  LEARNING_AGENDA_EVENT_TYPES,
  assertLearningAgendaEventMetadataOnly,
  buildLearningAgendaEvents,
  titleForLearningAgendaEvent,
} from "../lib/review-os/learning-agenda.ts";
import {
  TODAY_PLAN_MAX_PRIMARY_TASKS,
  selectActiveTodayPlanTasks,
} from "../lib/review-os/today-plan-engine.ts";

const ko = {
  agenda: "\ud559\uc2b5 \uae30\ub85d",
  agendaEmptyBody: "\uc624\ub298 \ud55c \uac83\uc744 \ud558\ub098 \uc62c\ub9ac\uba74 \uae30\ub85d\uc774 \uc2dc\uc791\ub429\ub2c8\ub2e4.",
  agendaEmptyTitle: "\uc544\uc9c1 \uc313\uc778 \ud559\uc2b5 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  biggestGap: "\uac00\uc7a5 \ud070 \uc57d\uc810",
  capture: "\uc624\ub298 \ud55c \uac83 \uc62c\ub9ac\uae30",
  dailyDetail: "\uc77c\ubcc4 detail",
  draftTrust: "OCR/AI \uc815\ub9ac\ub294 \ucd08\uc548\uc785\ub2c8\ub2e4",
  nextAction: "\ub2e4\uc74c \ud589\ub3d9",
  note: "\ud559\uc2b5 \ub178\ud2b8",
  noteDraftCta: "\ud559\uc2b5 \ub178\ud2b8 \ucd08\uc548 \ub9cc\ub4e4\uae30",
  photoPdf: "\uc0ac\uc9c4/PDF",
  review: "\ubcf5\uc2b5",
  reviewCompleted: "\ubcf5\uc2b5 \uc644\ub8cc",
  reviewDue: "\ubcf5\uc2b5 \uc608\uc815",
  text: "\ud14d\uc2a4\ud2b8",
  todayTask: "\uc624\ub298 \ud560 \uc77c",
  weeklyAgenda: "\uc8fc\uac04 agenda",
  weaknessRecoveryCandidate: "\uc57d\uc810 \ud68c\ubcf5 \ud6c4\ubcf4",
  monthlyHeatmap: "\uc6d4\uac04 heatmap",
};

const routeFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/review/page.tsx",
  "app/app/items/page.tsx",
  "app/app/items/[itemId]/page.tsx",
  "app/app/notes/page.tsx",
  "app/app/agenda/page.tsx",
  "app/app/today/page.tsx",
];

const learnerLoopSources = [
  ...routeFiles,
  "components/review-os/capture-form.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/local-beta-note-reflection.tsx",
  "components/review-os/learning-agenda-client.tsx",
  "lib/review-os/learning-agenda.ts",
  "lib/review-os/today-plan-engine.ts",
];

const forbiddenLearnerWording =
  /\uae30\uc900\s*\ub2f5\uc548|\uae30\uc900\ub2f5\uc548|\uacf5\uc2dd\s*\ucc44\uc810|\ubaa8\ubc94\ub2f5\uc548|\uc810\uc218\uc608\uce21|\ud569\uaca9\uc608\uce21|\ud569\uaca9\s*\uac00\ub2a5\uc131\s*\ud655\uc815|\uacf5\uc2dd\ub2f5\uc548|\uc815\ub2f5\s*\ud655\uc815|\ud655\uc815\s*\uc815\ub2f5|\ucd5c\uc885\s*\ud310\ub2e8|\ucd5c\uc885\s*\ud310\uc815|official\s+grading|official\s+model\s+answer|score\s+prediction|pass\/fail/i;

const rawLearnerDataFields =
  /rawOcrText|raw_ocr_text|rawAnswerText|raw_answer_text|rawProblemText|raw_problem_text|rawQuestionText|raw_question_text|uploadedFileContent|uploaded_file_content|officialAnswerText|official_answer_text/i;

function read(path) {
  return readFileSync(path, "utf8");
}

function combined(paths) {
  return paths.map(read).join("\n");
}

function assertIncludesAll(source, phrases) {
  for (const phrase of phrases) {
    assert.ok(source.includes(phrase), `missing phrase: ${phrase}`);
  }
}

function todayPlanTask(overrides = {}) {
  return {
    itemId: overrides.itemId ?? "task-1",
    title: overrides.title ?? "closed beta task",
    subject: overrides.subject ?? "\ubbfc\ubc95",
    exam_mode: overrides.exam_mode ?? "first",
    due_bucket: overrides.due_bucket ?? "today",
    status: overrides.status ?? "due",
    reason: overrides.reason ?? ko.reviewDue,
    one_biggest_gap: overrides.one_biggest_gap ?? ko.biggestGap,
    one_next_action: overrides.one_next_action ?? ko.nextAction,
    task_type: overrides.task_type ?? "concept_review",
    estimated_minutes: overrides.estimated_minutes ?? 10,
    priority_reason: overrides.priority_reason ?? ko.reviewDue,
    primary_cta: overrides.primary_cta ?? { label: ko.review, hrefKind: "review" },
    created_from_capture: overrides.created_from_capture ?? true,
    source_label: overrides.source_label ?? ko.note,
    ...overrides,
  };
}

test("closed beta golden flow route sources are present", () => {
  for (const routeFile of routeFiles) {
    assert.equal(existsSync(routeFile), true, routeFile);
  }

  const todayAlias = read("app/app/today/page.tsx");
  assert.ok(todayAlias.includes('redirect("/app?mode=second")'));
  assert.ok(todayAlias.includes('redirect("/app?mode=first")'));
  assert.ok(todayAlias.includes('redirect("/app")'));
});

test("final pass report records the closed beta scope and known limitations", () => {
  const report = read("docs/closed-beta-final-pass-2026-06-18.md");

  assertIncludesAll(report, [
    "Closed Beta Final Pass",
    "Golden Flow",
    "Known Limitations",
    "No new product scope",
    "owner dogfood",
  ]);
  assert.doesNotMatch(report, forbiddenLearnerWording);
});

test("Today Plan stays the daily center and caps active tasks at three", () => {
  const appPage = read("app/app/page.tsx");
  assertIncludesAll(appPage, [
    "data-today-plan-primary-surface",
    "data-today-plan-empty-state",
    "TODAY_PLAN_MAX_PRIMARY_TASKS",
    "/app/capture",
  ]);

  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);

  const selected = selectActiveTodayPlanTasks([
    todayPlanTask({ itemId: "completed", status: "completed" }),
    todayPlanTask({ itemId: "one" }),
    todayPlanTask({ itemId: "two" }),
    todayPlanTask({ itemId: "three" }),
    todayPlanTask({ itemId: "four" }),
  ]);

  assert.equal(selected.length, 3);
  assert.equal(selected.some((task) => task.status === "completed"), false);
  assert.doesNotMatch(JSON.stringify(selected), rawLearnerDataFields);
});

test("Capture keeps the fast text path, secondary photo/PDF path, and draft trust language", () => {
  const captureSource = combined([
    "app/app/capture/page.tsx",
    "components/review-os/capture-form.tsx",
  ]);

  assertIncludesAll(captureSource, [
    ko.capture,
    ko.text,
    ko.photoPdf,
    ko.noteDraftCta,
    ko.draftTrust,
  ]);
  assert.doesNotMatch(captureSource, forbiddenLearnerWording);
});

test("Notes and detail expose learner note loop fields without raw data fields", () => {
  const notesSource = combined([
    "app/app/items/page.tsx",
    "app/app/items/[itemId]/page.tsx",
    "app/app/notes/page.tsx",
    "components/review-os/local-beta-note-reflection.tsx",
    "lib/review-os/browser-storage.ts",
  ]);

  assertIncludesAll(notesSource, [
    ko.note,
    ko.biggestGap,
    ko.nextAction,
    "metadataOnly",
    "data-note-loop-bridge",
  ]);
  assert.doesNotMatch(notesSource, forbiddenLearnerWording);
});

test("Review exposes due and completed review states with capture empty-state links", () => {
  const reviewSource = combined([
    "app/app/review/page.tsx",
    "components/review-os/review-queue-client.tsx",
  ]);

  assertIncludesAll(reviewSource, [
    ko.review,
    ko.reviewDue,
    ko.reviewCompleted,
    "data-review-empty-state",
    "/app/capture?mode=second",
    "/app/capture?mode=first",
  ]);
  assert.doesNotMatch(reviewSource, forbiddenLearnerWording);
});

test("Agenda exposes learning record sections and conservative recovery copy", () => {
  const agendaSource = combined([
    "app/app/agenda/page.tsx",
    "components/review-os/learning-agenda-client.tsx",
    "lib/review-os/learning-agenda.ts",
  ]);

  assertIncludesAll(agendaSource, [
    ko.agenda,
    ko.monthlyHeatmap,
    ko.weeklyAgenda,
    ko.dailyDetail,
    ko.reviewCompleted,
    ko.weaknessRecoveryCandidate,
    ko.agendaEmptyTitle,
    ko.agendaEmptyBody,
    "/app/capture",
  ]);

  assert.deepEqual([...LEARNING_AGENDA_EVENT_TYPES].sort(), [
    "capture_saved",
    "note_created",
    "review_completed",
    "review_due",
    "today_task_completed",
    "weakness_recovered",
  ].sort());
  assert.equal(titleForLearningAgendaEvent("review_completed"), ko.reviewCompleted);
  assert.equal(titleForLearningAgendaEvent("weakness_recovered"), ko.weaknessRecoveryCandidate);
});

test("Agenda events remain derived metadata only", () => {
  const events = buildLearningAgendaEvents({
    mode: "second",
    items: [
      {
        id: "note-1",
        examName: "\uac10\uc815\ud3c9\uac00\uc0ac 2\ucc28",
        subjectLabel: "\uac10\uc815\ud3c9\uac00 \ubc0f \ubcf4\uc0c1\ubc95\uaddc",
        createdAt: "2026-06-18T09:00:00.000Z",
        createdFromCapture: true,
      },
    ],
    reviewQueue: [
      {
        queueId: "review-1",
        itemId: "note-1",
        examName: "\uac10\uc815\ud3c9\uac00\uc0ac 2\ucc28",
        subjectLabel: "\uac10\uc815\ud3c9\uac00 \ubc0f \ubcf4\uc0c1\ubc95\uaddc",
        dueAt: "2026-06-19T09:00:00.000Z",
      },
    ],
    usageEvents: [
      {
        id: "usage-review",
        eventName: "review_completed",
        entityId: "review-1",
        entityType: "review_queue",
        createdAt: "2026-06-20T09:00:00.000Z",
      },
      {
        id: "usage-recovery",
        eventName: "weakness_recovered",
        entityId: "weakness-1",
        entityType: "learning_signal",
        createdAt: "2026-06-21T09:00:00.000Z",
      },
    ],
  });

  assert.equal(events.some((event) => event.type === "capture_saved"), true);
  assert.equal(events.some((event) => event.type === "note_created"), true);
  assert.equal(events.some((event) => event.type === "review_due"), true);
  assert.equal(events.some((event) => event.title === ko.reviewCompleted), true);
  assert.equal(events.some((event) => event.title === ko.weaknessRecoveryCandidate), true);

  for (const event of events) {
    assertLearningAgendaEventMetadataOnly(event);
  }
  assert.throws(() => assertLearningAgendaEventMetadataOnly({ id: "unsafe", rawOcrText: "raw" }));
  assert.doesNotMatch(JSON.stringify(events), rawLearnerDataFields);
});

test("learner surfaces keep instructor separation and forbidden wording absent", () => {
  const source = combined(learnerLoopSources);

  assert.doesNotMatch(source, forbiddenLearnerWording);
  assert.doesNotMatch(source, /\/(?:instructor|studio)(?:\/|["'`?])|grade-second|second-grading/i);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role|OPENAI_API_KEY|embedding|Google Calendar|Outlook|notification|checkout|paywall/i);
});
