import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  validateCaptureToNoteQualityContract,
} from "../lib/review-os/capture-note-quality.ts";
import { captureToNoteQualityFixtures } from "./fixtures/capture-to-note-quality-fixtures.mjs";

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

const forbiddenFixturePatterns = [
  /local_official_materials[\\/]/i,
  /qnet_manifest\.json/i,
  /공식\s*(문제|답안|모범답안|해설|채점)/,
  /official\s+(problem|answer|grading|model answer)/i,
  /OCR full text\s*:/i,
  /raw problem text\s*:/i,
  /raw answer text\s*:/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp)\b/i,
];

function textOf(value) {
  return JSON.stringify(value, null, 2);
}

function assertNoForbiddenKeys(value, path = "note") {
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

test("all safe synthetic capture-to-note fixtures pass the quality contract", () => {
  assert.ok(captureToNoteQualityFixtures.length >= 5);
  const seenIds = new Set();

  for (const fixture of captureToNoteQualityFixtures) {
    assert.equal(seenIds.has(fixture.id), false, `${fixture.id} should be unique`);
    seenIds.add(fixture.id);

    const validated = validateCaptureToNoteQualityContract(fixture.note);

    assert.equal(validated.learnerOwned, true);
    assert.equal(validated.metadataOnly, true);
    assert.equal(validated.safeUse, "closed_beta_capture_note_quality");
    assert.equal(fixture.acceptedTaskTypes.includes(validated.nextActionTaskType), true, `${fixture.id} task type should match fixture intent`);
    assert.equal(CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(validated.nextActionTaskType), true);
    assert.equal(typeof validated.biggestGap, "string");
    assert.equal(typeof validated.nextAction, "string");
    assert.ok(validated.biggestGap.length > 0);
    assert.ok(validated.nextAction.length > 0);
    assert.equal(validated.biggestGap.includes("\n"), false, `${fixture.id} should have exactly one biggest gap line`);
    assert.equal(validated.nextAction.includes("\n"), false, `${fixture.id} should have exactly one next action line`);
    assertNoForbiddenKeys(validated, fixture.id);
  }
});

test("first-exam fixtures avoid rewrite-only second-exam behavior", () => {
  const firstFixtures = captureToNoteQualityFixtures.filter((fixture) => fixture.note.examMode === "first");
  assert.ok(firstFixtures.length >= 2);

  for (const fixture of firstFixtures) {
    const validated = validateCaptureToNoteQualityContract(fixture.note);
    assert.notEqual(validated.nextActionTaskType, "rewrite");
    assert.notEqual(validated.nextActionTaskType, "issue_recall");
  }

  assert.throws(
    () =>
      validateCaptureToNoteQualityContract({
        examMode: "first",
        subject: "민법",
        learnerNoteText: "민법 개념을 다시 확인했다.",
        biggestGap: "개념 구분 혼동",
        nextAction: "문단 다시 쓰기",
        nextActionTaskType: "rewrite",
      }),
    /rejects rewrite for first exam mode/,
  );
});

test("second-exam fixtures stay learner-owned and avoid score/pass-fail/model-answer behavior", () => {
  const secondFixtures = captureToNoteQualityFixtures.filter((fixture) => fixture.note.examMode === "second");
  assert.ok(secondFixtures.length >= 3);

  for (const fixture of secondFixtures) {
    const validated = validateCaptureToNoteQualityContract(fixture.note);
    const serialized = textOf(validated);
    assert.match(validated.nextActionTaskType, /^(calculation_template|rewrite|issue_recall|review_note)$/);
    assert.doesNotMatch(serialized, /score|passFail|officialGrade|officialAnswer|modelAnswer|instructorComment/i);
  }
});

test("fixture text is synthetic and does not include raw official problem or answer body examples", () => {
  for (const fixture of captureToNoteQualityFixtures) {
    const serialized = textOf(fixture);
    for (const pattern of forbiddenFixturePatterns) {
      assert.doesNotMatch(serialized, pattern, `${fixture.id} should stay synthetic and metadata-safe`);
    }
  }
});

test("quality contract rejects forbidden official, archive, instructor, and local raw fields", () => {
  for (const key of forbiddenOutputKeys) {
    assert.throws(
      () =>
        validateCaptureToNoteQualityContract({
          examMode: "second",
          subject: "감정평가이론",
          learnerNoteText: "이론 목차를 다시 확인했다.",
          biggestGap: "정의와 적용 연결 부족",
          nextAction: "적용 문단 다시 쓰기",
          nextActionTaskType: "rewrite",
          [key]: "unsafe",
        }),
      /forbids field/,
      `${key} should be rejected`,
    );
  }

  assert.throws(
    () =>
      validateCaptureToNoteQualityContract({
        examMode: "second",
        subject: "감정평가이론",
        learnerNoteText: "official model answer should not appear",
        biggestGap: "정의와 적용 연결 부족",
        nextAction: "적용 문단 다시 쓰기",
        nextActionTaskType: "rewrite",
      }),
    /unsafe learner note text/,
  );
});

test("capture-to-note quality tests do not read local official materials or qnet manifests", () => {
  const testSource = readFileSync("tests/capture-to-note-quality-hardening.test.mjs", "utf8");
  const fixtureSource = readFileSync("tests/fixtures/capture-to-note-quality-fixtures.mjs", "utf8");

  assert.doesNotMatch(testSource, /(?:readdir|opendir|glob)\s*\(/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /readFileSync\(["'`]local_official_materials/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /qnet_manifest\.json["'`]\)/i);
});

test("capture-to-note quality contract doc exists and records safety rules", () => {
  const docPath = "docs/capture-to-note-quality-contract.md";
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = readFileSync(docPath, "utf8");

  [
    "safe synthetic fixtures",
    "exactly one `biggestGap`",
    "exactly one `nextAction`",
    "Allowed learner task types",
    "no official grading/model-answer/score/pass-fail",
    "raw Q-Net",
    "local_official_materials",
    "qnet_manifest.json",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});
