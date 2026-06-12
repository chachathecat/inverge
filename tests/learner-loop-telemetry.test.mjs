import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  LEARNER_LOOP_TELEMETRY_EVENT_NAMES,
  LEARNER_LOOP_TELEMETRY_LOOP_STAGES,
  LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES,
  LEARNER_LOOP_TELEMETRY_SOURCE_TYPES,
  LEARNER_LOOP_TELEMETRY_TASK_TYPES,
  buildLearnerLoopTelemetryEvent,
  summarizeLearnerLoopTelemetry,
} from "../lib/review-os/learner-loop-telemetry.ts";
import { learnerLoopTelemetryFixtures } from "./fixtures/learner-loop-telemetry-fixtures.mjs";

const now = new Date("2026-06-12T00:00:00.000Z");

const forbiddenOutputKeys = [
  "rawText",
  "rawAnswerText",
  "rawProblemText",
  "rawOcrText",
  "ocrFullText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "score",
  "passFail",
  "officialGrade",
  "instructorComment",
  "localFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
  "qnetRawText",
  "archiveUrl",
  "userAnswerBody",
];

const forbiddenCopyPatterns = [
  /official\s+(grading|grade|answer|model answer|score)/i,
  /model\s+answer/i,
  /score\s+prediction/i,
  /pass\s*\/?\s*fail/i,
  /public\s+archive/i,
  /problem\s+bank/i,
  /instructor\s+comment/i,
  /local_official_materials/i,
  /qnet_manifest\.json/i,
  /(?:^|[A-Za-z]:\\|\\\\|\/)(?:Users|local_official_materials|tmp|temp|downloads|desktop)[\\/]/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i,
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

function assertNoForbiddenKeys(value, path = "telemetry") {
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
    assert.doesNotMatch(serialized, pattern, `forbidden learner-loop telemetry copy should not appear: ${pattern}`);
  }
}

function buildEvents(events) {
  return events.map((event) => buildLearnerLoopTelemetryEvent(event, now));
}

test("valid synthetic events pass the learner-loop telemetry contract", () => {
  const fixtureSets = [
    learnerLoopTelemetryFixtures.completeClosedLoop.events,
    learnerLoopTelemetryFixtures.captureOnlyIncomplete.events,
    learnerLoopTelemetryFixtures.todayPlanThreeSelected.events,
    learnerLoopTelemetryFixtures.localFallbackReviewQueueCreated.events,
    learnerLoopTelemetryFixtures.saveFailedLoop.events,
  ];

  for (const fixtureEvents of fixtureSets) {
    for (const candidate of fixtureEvents) {
      const event = buildLearnerLoopTelemetryEvent(candidate, now);
      const repeated = buildLearnerLoopTelemetryEvent(candidate, now);

      assert.equal(event.eventId, repeated.eventId);
      assert.ok(event.eventId.length > 0);
      assert.equal(LEARNER_LOOP_TELEMETRY_EVENT_NAMES.includes(event.eventName), true);
      assert.equal(LEARNER_LOOP_TELEMETRY_LOOP_STAGES.includes(event.loopStage), true);
      assert.equal(LEARNER_LOOP_TELEMETRY_SOURCE_TYPES.includes(event.sourceType), true);
      assert.equal(LEARNER_LOOP_TELEMETRY_TASK_TYPES.includes(event.taskType), true);
      assert.equal(LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES.includes(event.persistenceStatus), true);
      assert.equal(event.metadataOnly, true);
      assert.equal(event.learnerOwned, true);
      assert.equal(event.safeUse, "closed_beta_learner_loop_telemetry");
      assert.equal(event.sourceTrace.metadataOnly, true);
      assert.equal(event.sourceTrace.safeUse, "closed_beta_learner_loop_telemetry");
      assert.equal(Number.isNaN(Date.parse(event.occurredAt)), false);
      assert.equal(new Date(event.occurredAt).toISOString(), event.occurredAt);
      assertNoForbiddenKeys(event);
      assertNoForbiddenCopy(event);
    }
  }
});

test("Today Plan task count cannot exceed 3 in safe telemetry", () => {
  const generated = buildLearnerLoopTelemetryEvent(learnerLoopTelemetryFixtures.todayPlanThreeSelected.events[0], now);
  assert.equal(generated.eventName, "today_plan_generated");
  assert.equal(generated.todayPlanTaskCount, 3);

  assert.throws(
    () =>
      buildLearnerLoopTelemetryEvent(
        {
          ...learnerLoopTelemetryFixtures.todayPlanThreeSelected.events[0],
          todayPlanTaskCount: 4,
        },
        now,
      ),
    /Today Plan task count at max 3/,
  );
});

test("complete closed-loop fixture returns hasClosedLoop true", () => {
  const events = buildEvents(learnerLoopTelemetryFixtures.completeClosedLoop.events);
  const summary = summarizeLearnerLoopTelemetry(events);

  assert.equal(summary.metadataOnly, true);
  assert.equal(summary.safeUse, "closed_beta_learner_loop_telemetry");
  assert.equal(summary.captureCount, 1);
  assert.equal(summary.noteCreatedCount, 1);
  assert.equal(summary.biggestGapCount, 1);
  assert.equal(summary.nextActionCount, 1);
  assert.equal(summary.todayPlanGeneratedCount, 1);
  assert.equal(summary.todayPlanTaskSelectedCount, 1);
  assert.equal(summary.reviewQueueItemCreatedCount, 1);
  assert.equal(summary.reviewCompletedCount, 1);
  assert.equal(summary.notesReflectedCount, 1);
  assert.equal(summary.loopClosureCount, 1);
  assert.equal(summary.hasClosedLoop, true);
});

test("capture-only fixture returns hasClosedLoop false", () => {
  const events = buildEvents(learnerLoopTelemetryFixtures.captureOnlyIncomplete.events);
  const summary = summarizeLearnerLoopTelemetry(events);

  assert.equal(summary.captureCount, 1);
  assert.equal(summary.noteCreatedCount, 0);
  assert.equal(summary.hasClosedLoop, false);
});

test("save_failed does not count as durable loop closure", () => {
  const events = buildEvents(learnerLoopTelemetryFixtures.saveFailedLoop.events);
  const summary = summarizeLearnerLoopTelemetry(events);

  assert.equal(events.every((event) => event.persistenceStatus === "save_failed"), true);
  assert.equal(summary.noteCreatedCount, 1);
  assert.equal(summary.notesReflectedCount, 1);
  assert.equal(summary.loopClosureCount, 0);
  assert.equal(summary.hasClosedLoop, false);
});

test("local_fallback_saved remains distinct from durable_saved", () => {
  const durableEvent = buildLearnerLoopTelemetryEvent(learnerLoopTelemetryFixtures.completeClosedLoop.events[6], now);
  const localEvent = buildLearnerLoopTelemetryEvent(learnerLoopTelemetryFixtures.localFallbackReviewQueueCreated.events[0], now);

  assert.equal(durableEvent.persistenceStatus, "durable_saved");
  assert.equal(localEvent.persistenceStatus, "local_fallback_saved");
  assert.equal(localEvent.sourceTrace.persistenceStatus, "local_fallback_saved");
  assert.notEqual(localEvent.persistenceStatus, durableEvent.persistenceStatus);
});

test("forbidden fields are rejected recursively and unsafe strings are rejected", () => {
  for (const key of forbiddenOutputKeys) {
    assert.throws(
      () =>
        buildLearnerLoopTelemetryEvent(
          {
            eventName: "capture_note_created",
            occurredAt: "2026-06-12T06:00:00.000Z",
            loopStage: "note",
            sourceType: "capture_note",
            examMode: "second",
            subject: "감정평가이론",
            taskType: "rewrite",
            persistenceStatus: "durable_saved",
            sourceTrace: { sourceId: "unsafe-field" },
            [key]: "unsafe",
          },
          now,
        ),
      /forbids field/,
      `${key} should be rejected`,
    );
  }

  assert.throws(
    () => buildLearnerLoopTelemetryEvent(learnerLoopTelemetryFixtures.unsafeEvent.event, now),
    /forbids field/,
  );

  assert.throws(
    () =>
      buildLearnerLoopTelemetryEvent(
        {
          eventName: "capture_note_created",
          occurredAt: "2026-06-12T06:10:00.000Z",
          loopStage: "note",
          sourceType: "capture_note",
          examMode: "first",
          subject: "C:\\Users\\learner\\Downloads\\unsafe.pdf",
          taskType: "review_note",
          persistenceStatus: "durable_saved",
          sourceTrace: { sourceId: "unsafe-path" },
        },
        now,
      ),
    /unsafe subject/,
  );
});

test("fixtures are synthetic and do not include raw official content", () => {
  for (const fixture of Object.values(learnerLoopTelemetryFixtures)) {
    const serialized = textOf(fixture);
    for (const pattern of forbiddenFixturePatterns) {
      assert.doesNotMatch(serialized, pattern, `${fixture.id} should stay synthetic and metadata-safe`);
    }
  }
});

test("learner-loop telemetry tests do not read local official materials or qnet manifests", () => {
  const testSource = readFileSync("tests/learner-loop-telemetry.test.mjs", "utf8");
  const fixtureSource = readFileSync("tests/fixtures/learner-loop-telemetry-fixtures.mjs", "utf8");

  assert.doesNotMatch(testSource, /(?:readdir|opendir|glob)\s*\(/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /readFileSync\(["'`]local_official_materials/i);
  assert.doesNotMatch(`${testSource}\n${fixtureSource}`, /qnet_manifest\.json["'`]\)/i);
});

test("learner-loop telemetry doc exists and records safety rules", () => {
  const docPath = "docs/learner-loop-telemetry.md";
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = readFileSync(docPath, "utf8");

  [
    "metadata-only",
    "capture_submitted",
    "review_queue_item_created",
    "notes_reflected",
    "loop closure definition",
    "Today Plan max 3 telemetry rule",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no raw Q-Net content",
    "no local official materials",
    "no instructor-console exposure",
    "no analytics provider integration",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});
