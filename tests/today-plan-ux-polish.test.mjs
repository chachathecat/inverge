import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildTodayPlanDisplayCopy } from "../lib/review-os/today-plan-display-copy.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";
import { compressUnifiedTodayPlanToMaxThree } from "../lib/review-os/today-plan-source-union.ts";

const now = new Date("2026-06-05T00:00:00.000Z");

function queue(overrides = {}) {
  return {
    queueId: `q-${overrides.itemId ?? "base"}`,
    itemId: overrides.itemId ?? "queue-item",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    problemTitle: overrides.problemTitle ?? "민법 기준 항목",
    topicTag: "민법",
    mistakeType: "요건 누락",
    reviewReason: "재시도",
    priorityScore: 50,
    dueAt: "2026-06-05T00:00:00.000Z",
    recurrenceCount: 1,
    confidence: "중간",
    timeSpentSeconds: 600,
    createdFromCapture: false,
    itemCreatedAt: "2026-06-04T00:00:00.000Z",
    ...overrides,
  };
}

const forbiddenCopy = [
  "실패자",
  "게으름",
  "망했",
  "불합격 확정",
  "지금 안 하면 끝",
  "공포",
  "부끄럽",
  "순위 하락",
  "streak",
  "casino",
  "gacha",
  "랜덤 보상",
];
const forbiddenRawText = ["rawOcrText", "rawAnswerText", "rawUserText", "problemText", "questionText", "answerText", "copyrightedText", "official model answer", "공식 모범 답안"];
const forbiddenSurfaces = ["결제", "payment", "archive", "아카이브", "native app", "네이티브 앱", "instructor", "/instructor", "학원용", "강사"];
const officialClaims = ["공식 채점", "공식 점수 예측", "official grading", "official score prediction"];

function serialized(value) {
  return JSON.stringify(value);
}

test("Today Plan task cards include calm recommendation explanation and subtle Korean source labels", () => {
  const tasks = buildTodayPlanTasks({
    mode: "first",
    now,
    queue: [
      queue({ itemId: "a", dueAt: "2026-06-04T00:00:00.000Z" }),
      queue({ itemId: "b", dueAt: "2026-06-05T00:00:00.000Z", recurrenceCount: 3 }),
      queue({ itemId: "c", dueAt: "2026-06-05T00:00:00.000Z", priorityScore: 40 }),
      queue({ itemId: "d", dueAt: "2026-06-05T00:00:00.000Z", priorityScore: 30 }),
    ],
  });

  assert.equal(tasks.length, 3);
  assert.ok(tasks.every((task) => typeof task.display_reason === "string" && task.display_reason.length > 0));
  assert.ok(tasks.every((task) => ["복습 큐", "약점 개념", "오늘 일정"].includes(task.display_source_label)));
  assert.ok(tasks.every((task) => typeof task.display_primary_cta === "string" && task.display_primary_cta.length > 0));

  const text = serialized(tasks);
  for (const internal of ["review_queue", "personal_concept_graph", "study_schedule"]) assert.equal(text.includes(internal), false, internal);
  for (const forbidden of [...forbiddenCopy, ...forbiddenRawText, ...forbiddenSurfaces, ...officialClaims]) assert.equal(text.includes(forbidden), false, forbidden);
});

test("display helper maps source union signals to learner-facing reason, label, and one CTA copy", () => {
  const copies = [
    buildTodayPlanDisplayCopy({ source: "review_queue", prioritySignals: ["review_queue_due_bucket:soon"], taskType: "O/X", primaryAction: "O/X 5문항 다시 풀기" }),
    buildTodayPlanDisplayCopy({ source: "personal_concept_graph", prioritySignals: ["confused_concept"], taskType: "cloze", primaryAction: "핵심어 회상" }),
    buildTodayPlanDisplayCopy({ source: "study_schedule", prioritySignals: ["schedule_track_focus"], taskType: "execution", primaryAction: "시작하기" }),
  ];

  assert.deepEqual(copies.map((copy) => copy.displaySourceLabel), ["복습 큐", "약점 개념", "오늘 일정"]);
  assert.ok(copies.every((copy) => copy.displayReason.endsWith("합니다.")));
  assert.ok(copies.every((copy) => copy.displayPrimaryCta.length > 0));
  for (const copy of copies) {
    const text = serialized(copy);
    for (const internal of ["review_queue", "personal_concept_graph", "study_schedule"]) assert.equal(text.includes(internal), false, internal);
    for (const forbidden of forbiddenCopy) assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("source union output exposes UX display copy while staying max 3 and metadata-only", () => {
  const baseAction = {
    examMode: "first",
    subjectId: "civil-law",
    taskType: "O/X",
    title: "민법 기준 O/X",
    rationale: "메타데이터 기준으로 다시 확인합니다.",
    primaryAction: "다시 풀기",
    estimatedMinutes: 10,
    isPrimaryTask: true,
    metadataOnly: true,
  };
  const plan = compressUnifiedTodayPlanToMaxThree([
    { ...baseAction, id: "a", source: "review_queue", unitId: "u1", prioritySignals: ["due_review"] },
    { ...baseAction, id: "b", source: "personal_concept_graph", unitId: "u2", prioritySignals: ["wrong_concept"] },
    { ...baseAction, id: "c", source: "study_schedule", unitId: "u3", prioritySignals: ["schedule_track_focus"] },
    { ...baseAction, id: "d", source: "study_schedule", unitId: "u4", prioritySignals: ["schedule_track_focus"] },
  ]);

  assert.equal(plan.length, 3);
  assert.ok(plan.every((task) => task.isPrimaryTask === true && task.metadataOnly === true));
  assert.ok(plan.every((task) => task.displayReason && task.displayPrimaryCta));
  assert.ok(plan.every((task) => ["복습 큐", "약점 개념", "오늘 일정"].includes(task.displaySourceLabel)));

  const text = serialized(plan.map(({ displayReason, displaySourceLabel, displayPrimaryCta }) => ({ displayReason, displaySourceLabel, displayPrimaryCta })));
  for (const internal of ["review_queue", "personal_concept_graph", "study_schedule"]) assert.equal(text.includes(internal), false, internal);
  for (const forbidden of [...forbiddenRawText, ...officialClaims, ...forbiddenSurfaces]) assert.equal(text.includes(forbidden), false, forbidden);
});

test("learner Today Plan surface renders why-now line, subtle labels, max-3 source, and a single card CTA", () => {
  const source = readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("display_reason"), true);
  assert.equal(source.includes("display_source_label"), true);
  assert.equal(source.includes("display_primary_cta"), true);
  assert.equal(source.includes("왜 지금?"), true);
  assert.equal(source.includes("slice(0, 3)") || source.includes("buildTodayPlanTasks"), true);
  assert.equal(source.includes("show all"), false);
  assert.equal(source.includes("전체 보기"), false);

  assert.equal((source.match(/<Link href={resolveTaskHref\(task\.primary_cta\.hrefKind\)}/g) ?? []).length, 1);
  const primaryCtaSnippet = source.slice(source.indexOf("<Link href={resolveTaskHref(task.primary_cta.hrefKind)}"), source.indexOf("</Link>", source.indexOf("<Link href={resolveTaskHref(task.primary_cta.hrefKind)}")));
  assert.equal(primaryCtaSnippet.includes("display_primary_cta"), true);
});
