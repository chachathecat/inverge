import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  REVIEW_QUEUE_REFLECTION_PERSISTENCE_STATUSES,
  REVIEW_QUEUE_REFLECTION_REASON_CODES,
  REVIEW_QUEUE_REFLECTION_SOURCE_TYPES,
  buildReviewQueueReflection,
  selectReadyReviewQueueReflections,
} from "../lib/review-os/review-queue-reflection.ts";
import { CAPTURE_NOTE_ALLOWED_TASK_TYPES } from "../lib/review-os/capture-note-quality.ts";
import { reviewQueueReflectionFixtures } from "./fixtures/review-queue-reflection-fixtures.mjs";

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
  /public\s+archive/i,
  /problem\s+bank/i,
  /instructor\s+comment/i,
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

function assertNoForbiddenKeys(value, path = "reflection") {
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
    assert.doesNotMatch(serialized, pattern, `forbidden review queue reflection copy should not appear: ${pattern}`);
  }
}

test("every durable or local fallback fixture can produce a safe review queue reflection", () => {
  const validFixtures = reviewQueueReflectionFixtures.filter((fixture) => fixture.candidate.persistenceStatus !== "save_failed");
  assert.ok(validFixtures.length >= 6);

  for (const fixture of validFixtures) {
    const reflection = buildReviewQueueReflection(fixture.candidate, now);
    const repeated = buildReviewQueueReflection(fixture.candidate, now);

    assert.equal(reflection.reviewItemId, repeated.reviewItemId, `${fixture.id} should have deterministic reviewItemId`);
    assert.ok(reflection.reviewItemId.length > 0);
    assert.equal(REVIEW_QUEUE_REFLECTION_SOURCE_TYPES.includes(reflection.sourceType), true);
    assert.equal(REVIEW_QUEUE_REFLECTION_REASON_CODES.includes(reflection.reviewReasonCode), true);
    assert.equal(fixture.expectedReasonCodes.includes(reflection.reviewReasonCode), true, `${fixture.id} should keep expected reason`);
    assert.equal(CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(reflection.nextActionTaskType), true);
    assert.equal(fixture.expectedTaskTypes.includes(reflection.nextActionTaskType), true, `${fixture.id} should keep expected task type`);
    assert.equal(REVIEW_QUEUE_REFLECTION_PERSISTENCE_STATUSES.includes(reflection.persistenceStatus), true);
    assert.equal(reflection.persistenceStatus, fixture.candidate.persistenceStatus);
    assert.equal(typeof reflection.reviewPrompt, "string");
    assert.ok(reflection.reviewPrompt.length > 0);
    assert.equal(typeof reflection.actionText, "string");
    assert.ok(reflection.actionText.length > 0);
    assert.equal(Number.isNaN(Date.parse(reflection.dueAt)), false, `${fixture.id} should produce valid ISO dueAt`);
    assert.equal(new Date(reflection.dueAt).toISOString(), reflection.dueAt);
    assert.equal(reflection.learnerOwned, true);
    assert.equal(reflection.metadataOnly, true);
    assert.equal(reflection.safeUse, "closed_beta_review_queue_reflection");
    assert.equal(typeof reflection.sourceTrace, "object");
    assert.equal(reflection.sourceTrace.metadataOnly, true);
    assert.equal(reflection.sourceTrace.safeUse, "closed_beta_review_queue_reflection");
    assert.equal(reflection.sourceTrace.persistenceStatus, fixture.candidate.persistenceStatus);
    assertNoForbiddenKeys(reflection, fixture.id);
    assertNoForbiddenCopy([reflection.reviewPrompt, reflection.actionText, reflection.sourceTrace.biggestGap ?? ""]);
  }
});

test("durable and local fallback persistence states are preserved distinctly", () => {
  const durableFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "durable-first-civil-law-capture-gap");
  const localFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "local-fallback-saved-capture-note");
  assert.ok(durableFixture);
  assert.ok(localFixture);

  const durable = buildReviewQueueReflection(durableFixture.candidate, now);
  const local = buildReviewQueueReflection(localFixture.candidate, now);

  assert.equal(durable.persistenceStatus, "durable_saved");
  assert.equal(local.persistenceStatus, "local_fallback_saved");
  assert.equal(local.reviewReasonCode, "local_fallback_review");
  assert.match(local.reviewPrompt, /브라우저|browser|local|임시/i);
  assert.doesNotMatch(durable.reviewPrompt, /브라우저|browser|local|임시/i);
});

test("save_failed can be represented but is excluded from ready review queue selection", () => {
  const saveFailedFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "save-failed-source");
  assert.ok(saveFailedFixture);

  const warning = buildReviewQueueReflection(saveFailedFixture.candidate, now);
  assert.equal(warning.persistenceStatus, "save_failed");
  assert.match(warning.reviewPrompt, /저장이 완료되지|다시 저장/);

  const ready = selectReadyReviewQueueReflections(
    reviewQueueReflectionFixtures.map((fixture) => fixture.candidate),
    now,
  );

  assert.ok(ready.length >= 6);
  assert.equal(ready.some((reflection) => reflection.persistenceStatus === "save_failed"), false);
  assert.equal(ready.some((reflection) => reflection.sourceId === "save-failed-source"), false);
  for (const reflection of ready) {
    assert.equal(reflection.learnerOwned, true);
    assert.equal(reflection.metadataOnly, true);
    assert.equal(reflection.safeUse, "closed_beta_review_queue_reflection");
    assert.equal(typeof reflection.sourceTrace, "object");
  }
});

test("dueAt defaults are deterministic by review reason", () => {
  const captureFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "durable-first-civil-law-capture-gap");
  const rewriteFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "second-practice-weak-structure-rewrite");
  const localFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "local-fallback-saved-capture-note");
  const dueFixture = reviewQueueReflectionFixtures.find((fixture) => fixture.id === "today-plan-due-review-item");
  assert.ok(captureFixture);
  assert.ok(rewriteFixture);
  assert.ok(localFixture);
  assert.ok(dueFixture);

  assert.equal(buildReviewQueueReflection(captureFixture.candidate, now).dueAt, "2026-06-13T01:00:00.000Z");
  assert.equal(buildReviewQueueReflection(rewriteFixture.candidate, now).dueAt, "2026-06-15T01:00:00.000Z");
  assert.equal(buildReviewQueueReflection(localFixture.candidate, now).dueAt, "2026-06-13T01:00:00.000Z");
  assert.equal(buildReviewQueueReflection(dueFixture.candidate, now).dueAt, "2026-06-12T01:00:00.000Z");
});

test("contract rejects forbidden official, archive, instructor, raw, and local path fields", () => {
  for (const key of forbiddenOutputKeys) {
    assert.throws(
      () =>
        buildReviewQueueReflection(
          {
            sourceId: "unsafe-field",
            sourceType: "notes",
            examMode: "second",
            subject: "감정평가이론",
            biggestGap: "정의와 적용 구조 연결 부족",
            nextAction: "적용 문단 한 개 다시 쓰기",
            nextActionTaskType: "rewrite",
            persistenceStatus: "durable_saved",
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
      buildReviewQueueReflection(
        {
          sourceId: "unsafe-copy",
          sourceType: "notes",
          examMode: "second",
          subject: "감정평가이론",
          biggestGap: "public archive should not appear",
          nextAction: "적용 문단 한 개 다시 쓰기",
          nextActionTaskType: "rewrite",
          persistenceStatus: "durable_saved",
        },
        now,
      ),
    /unsafe biggestGap/,
  );
});

test("fixtures are synthetic and do not include raw official content", () => {
  for (const fixture of reviewQueueReflectionFixtures) {
    const serialized = textOf(fixture);
    for (const pattern of forbiddenFixturePatterns) {
      assert.doesNotMatch(serialized, pattern, `${fixture.id} should stay synthetic and metadata-safe`);
    }
  }
});

test("review queue reflection tests do not read local official materials or qnet manifests", () => {
  const testSource = readFileSync("tests/review-queue-reflection-hardening.test.mjs", "utf8");
  const fixtureSource = readFileSync("tests/fixtures/review-queue-reflection-fixtures.mjs", "utf8");

  assert.doesNotMatch(testSource, /(?:readdir|opendir|glob)\s*\(/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /readFileSync\(["'`]local_official_materials/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /qnet_manifest\.json["'`]\)/i);
});

test("review queue reflection hardening doc exists and records safety rules", () => {
  const docPath = "docs/review-queue-reflection-hardening.md";
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = readFileSync(docPath, "utf8");

  [
    "source-to-review contract",
    "reviewReasonCode",
    "sourceType",
    "persistenceStatus",
    "dueAt default rule",
    "ready review queue selector",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no raw Q-Net content",
    "no local official materials",
    "no instructor-console exposure",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});
