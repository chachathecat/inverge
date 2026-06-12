import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  TODAY_PLAN_REASON_CODES,
  TODAY_PLAN_SOURCE_TYPES,
  buildTodayPlanSourceReasoning,
  selectTodayPlanSourceReasonedTasks,
} from "../lib/review-os/today-plan-source-reasoning.ts";
import { CAPTURE_NOTE_ALLOWED_TASK_TYPES } from "../lib/review-os/capture-note-quality.ts";
import { todayPlanSourceReasoningFixtures } from "./fixtures/today-plan-source-reasoning-fixtures.mjs";

const now = new Date("2026-06-12T01:00:00.000Z");

const forbiddenOutputKeys = [
  "score",
  "passFail",
  "officialGrade",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "instructorComment",
  "localFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
  "qnetRawText",
  "ocrFullText",
];

const forbiddenCopyPatterns = [
  /official\s+(grading|grade|answer|model answer|score)/i,
  /model\s+answer/i,
  /score\s+prediction/i,
  /pass\s*\/?\s*fail/i,
  /공식\s*(채점|점수|모범답안|답안|해설|문제)/,
  /합격\s*판정|불합격\s*판정|점수\s*예측/,
  /강사용\s*콘솔|강사\s*코멘트/,
];

const forbiddenFixturePatterns = [
  /local_official_materials[\\/]/i,
  /qnet_manifest\.json/i,
  /official\s+(problem|answer|grading|model answer)/i,
  /OCR full text\s*:/i,
  /raw problem text\s*:/i,
  /raw answer text\s*:/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp)\b/i,
];

function textOf(value) {
  return JSON.stringify(value, null, 2);
}

function assertNoForbiddenKeys(value, path = "reasoning") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbiddenOutputKeys.includes(key), false, `${path}.${key} should not be emitted`);
    assertNoForbiddenKeys(nested, `${path}.${key}`);
  }
}

function assertNoForbiddenCopy(value) {
  const serialized = typeof value === "string" ? value : textOf(value);
  for (const pattern of forbiddenCopyPatterns) {
    assert.doesNotMatch(serialized, pattern, `forbidden reason copy should not appear: ${pattern}`);
  }
}

test("Today Plan source reasoning selector returns max 3 traceable tasks", () => {
  const selected = selectTodayPlanSourceReasonedTasks(
    todayPlanSourceReasoningFixtures.map((fixture) => fixture.candidate),
    now,
  );

  assert.ok(selected.length > 0);
  assert.ok(selected.length <= 3);

  for (const task of selected) {
    assert.equal(TODAY_PLAN_SOURCE_TYPES.includes(task.sourceType), true);
    assert.equal(TODAY_PLAN_REASON_CODES.includes(task.reasonCode), true);
    assert.equal(typeof task.oneLineReason, "string");
    assert.equal(task.oneLineReason.length > 0, true);
    assert.equal(typeof task.actionText, "string");
    assert.equal(task.actionText.length > 0, true);
    assert.equal(typeof task.sourceTrace, "object");
    assert.equal(task.sourceTrace.metadataOnly, true);
    assert.equal(task.sourceTrace.safeUse, "closed_beta_today_plan_source_reasoning");
    assert.equal(CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(task.nextActionTaskType), true);
    assert.equal(task.metadataOnly, true);
    assert.equal(task.learnerOwned, true);
    assertNoForbiddenKeys(task);
    assertNoForbiddenCopy([task.oneLineReason, task.actionText, task.sourceTrace.biggestGap ?? ""]);
  }
});

test("due review can outrank lower-priority fresh items", () => {
  const selected = selectTodayPlanSourceReasonedTasks(
    todayPlanSourceReasoningFixtures.map((fixture) => fixture.candidate),
    now,
  );

  assert.equal(selected[0].sourceType, "review_queue");
  assert.equal(selected[0].reasonCode, "review_queue_due");
  assert.ok(selected[0].priorityScore > selected[1].priorityScore);
});

test("recent capture gap can generate a Today Plan reason", () => {
  const fixture = todayPlanSourceReasoningFixtures.find((item) => item.id === "capture-first-civil-law-ox-gap");
  assert.ok(fixture);

  const task = buildTodayPlanSourceReasoning(fixture.candidate, now);
  assert.equal(task.reasonCode, "recent_capture_gap");
  assert.equal(task.sourceType, "capture_note");
  assert.match(task.oneLineReason, /캡처|약점/);
  assert.equal(task.nextActionTaskType, "ox");
});

test("weak second-exam structure can generate rewrite or issue recall reasoning", () => {
  const practiceFixture = todayPlanSourceReasoningFixtures.find((item) => item.id === "second-practice-weak-calculation-structure");
  const lawFixture = todayPlanSourceReasoningFixtures.find((item) => item.id === "second-law-weak-issue-recall");
  assert.ok(practiceFixture);
  assert.ok(lawFixture);

  const practice = buildTodayPlanSourceReasoning(practiceFixture.candidate, now);
  const law = buildTodayPlanSourceReasoning(lawFixture.candidate, now);

  assert.equal(practice.reasonCode, "weak_structure");
  assert.equal(law.reasonCode, "weak_structure");
  assert.match(`${practice.nextActionTaskType} ${law.nextActionTaskType}`, /calculation_template|issue_recall|rewrite/);
  assert.match(`${practice.oneLineReason} ${law.oneLineReason}`, /구조|약한/);
});

test("first-exam items do not become rewrite-only second-exam tasks", () => {
  const firstFixtures = todayPlanSourceReasoningFixtures.filter((fixture) => fixture.candidate.examMode === "first");
  assert.ok(firstFixtures.length >= 3);

  for (const fixture of firstFixtures) {
    const task = buildTodayPlanSourceReasoning(fixture.candidate, now);
    assert.notEqual(task.nextActionTaskType, "rewrite");
    assert.notEqual(task.nextActionTaskType, "issue_recall");
  }

  assert.throws(
    () =>
      buildTodayPlanSourceReasoning(
        {
          sourceId: "unsafe-first-rewrite",
          sourceType: "capture_note",
          examMode: "first",
          subject: "민법",
          biggestGap: "개념 구분 혼동",
          nextAction: "문단을 다시 쓰기",
          nextActionTaskType: "rewrite",
        },
        now,
      ),
    /rejects rewrite for first exam mode/,
  );
});

test("unsupported task types are excluded by the selector", () => {
  const selected = selectTodayPlanSourceReasonedTasks(
    [
      {
        sourceId: "unsupported-flashcard",
        sourceType: "capture_note",
        examMode: "first",
        subject: "민법",
        biggestGap: "개념 구분 혼동",
        nextAction: "별도 카드 만들기",
        nextActionTaskType: "flashcard",
      },
      todayPlanSourceReasoningFixtures[0].candidate,
    ],
    now,
  );

  assert.equal(selected.some((task) => task.sourceTrace.sourceId === "unsupported-flashcard"), false);
  assert.equal(selected.length, 1);
});

test("quality boundary rejects forbidden official, archive, instructor, and raw fields", () => {
  for (const key of forbiddenOutputKeys) {
    assert.throws(
      () =>
        buildTodayPlanSourceReasoning(
          {
            sourceId: "unsafe-field",
            sourceType: "notes",
            examMode: "second",
            subject: "감정평가이론",
            biggestGap: "정의와 적용 연결 부족",
            nextAction: "적용 문단 한 개 다시 쓰기",
            nextActionTaskType: "rewrite",
            [key]: "unsafe",
          },
          now,
        ),
      /forbids field/,
      `${key} should be rejected`,
    );
  }

  assert.throws(
    () =>
      buildTodayPlanSourceReasoning(
        {
          sourceId: "unsafe-copy",
          sourceType: "notes",
          examMode: "second",
          subject: "감정평가이론",
          biggestGap: "public archive should not appear",
          nextAction: "적용 문단 한 개 다시 쓰기",
          nextActionTaskType: "rewrite",
        },
        now,
      ),
    /unsafe biggestGap/,
  );
});

test("fixtures are synthetic and do not include raw official content", () => {
  for (const fixture of todayPlanSourceReasoningFixtures) {
    const serialized = textOf(fixture);
    for (const pattern of forbiddenFixturePatterns) {
      assert.doesNotMatch(serialized, pattern, `${fixture.id} should stay synthetic and metadata-safe`);
    }
  }
});

test("Today Plan source reasoning tests do not read local official materials or qnet manifests", () => {
  const testSource = readFileSync("tests/today-plan-source-reasoning.test.mjs", "utf8");
  const fixtureSource = readFileSync("tests/fixtures/today-plan-source-reasoning-fixtures.mjs", "utf8");

  assert.doesNotMatch(testSource, /(?:readdir|opendir|glob)\s*\(/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /readFileSync\(["'`]local_official_materials/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /qnet_manifest\.json["'`]\)/i);
});

test("Today Plan source reasoning doc exists and records safety rules", () => {
  const docPath = "docs/today-plan-source-reasoning.md";
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = readFileSync(docPath, "utf8");

  [
    "source-to-reason contract",
    "Today Plan max 3",
    "due_review",
    "recent_capture_gap",
    "capture_note",
    "review_queue",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no raw Q-Net content",
    "no local official materials",
    "no instructor-console exposure",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});
