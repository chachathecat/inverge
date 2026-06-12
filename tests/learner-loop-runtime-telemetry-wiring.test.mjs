import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  LEARNER_LOOP_TELEMETRY_USER_SCOPES,
  REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES,
  buildLearnerLoopTelemetryEvent,
  createLearnerLoopRuntimeTelemetryCollector,
  evaluateLearnerLoopTelemetryClosure,
  selectReadyLearnerLoopTelemetryReviewQueueEvents,
} from "../lib/review-os/learner-loop-telemetry.ts";

const docPath = "docs/learner-loop-runtime-telemetry-wiring.md";
const testPath = "tests/learner-loop-runtime-telemetry-wiring.test.mjs";
const helperPath = "lib/review-os/learner-loop-telemetry.ts";
const fixturePaths = [
  "tests/fixtures/learner-loop/runtime-telemetry/durable-loop.json",
  "tests/fixtures/learner-loop/runtime-telemetry/local-fallback-loop.json",
  "tests/fixtures/learner-loop/runtime-telemetry/save-failed-loop.json",
  "tests/fixtures/learner-loop/runtime-telemetry/incomplete-loop.json",
];

const forbiddenFields = [
  "rawText",
  "rawOcrText",
  "rawQuestionText",
  "rawAnswerText",
  "copiedProblemText",
  "copiedAnswerText",
  "officialAnswer",
  "modelAnswer",
  "officialGrade",
  "score",
  "passFail",
  "instructorComment",
  "qnetRawPath",
  "localOfficialMaterialsPath",
  "officialAnswerBody",
];

const localOfficialPattern = new RegExp(["local", "official", "materials"].join("[_/]"), "i");
const manifestPattern = new RegExp(["qnet", "manifest"].join("[_.]") + "\\.json", "i");
const rawFilePattern = /(?:^|[\\/])[^\\/]+\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i;
const providerNamePatterns = [
  new RegExp(["google", "analytics"].join("[\\s-]*"), "i"),
  new RegExp(["seg", "ment"].join(""), "i"),
  new RegExp(["post", "hog"].join(""), "i"),
  new RegExp(["mix", "panel"].join(""), "i"),
  new RegExp(["amp", "litude"].join(""), "i"),
  new RegExp(["sen", "try"].join(""), "i"),
];
const externalCallPatterns = [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /navigator\./,
  /https?:\/\//,
  /chat\.completions/i,
  /responses\.create/i,
  /createChatCompletion/i,
];

function read(file) {
  return readFileSync(file, "utf8");
}

function readFixture(file) {
  return JSON.parse(read(file));
}

function fixtures() {
  return fixturePaths.map(readFixture);
}

function buildEvents(fixture) {
  return fixture.events.map((event) => buildLearnerLoopTelemetryEvent(event, new Date("2026-06-12T00:00:00.000Z")));
}

function allFixtureEvents() {
  return fixtures().flatMap((fixture) => fixture.events);
}

function assertNoForbiddenKeys(value, path = "runtimeTelemetry") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbiddenFields.includes(key), false, `${path}.${key} should not appear`);
    assertNoForbiddenKeys(nested, `${path}.${key}`);
  }
}

test("runtime telemetry wiring doc exists and records the provider-free contract", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "Learner Loop Runtime Telemetry Wiring v1",
    "provider-free runtime telemetry",
    "Capture -> learner-owned note -> biggest gap -> next action -> Today Plan task -> Review Queue item -> Notes reflection",
    "buildLearnerLoopTelemetryEvent",
    "createLearnerLoopRuntimeTelemetryCollector",
    "evaluateLearnerLoopTelemetryClosure",
    "selectReadyLearnerLoopTelemetryReviewQueueEvents",
    "userScope: anonymous_local | invited_beta_account",
    "loopId",
    "save_failed must not produce ready Review Queue evidence",
    "no external analytics provider call",
    "no AI provider call",
    "no raw learner OCR, answer, or problem text in telemetry",
    "npm.cmd run typecheck",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});

test("runtime telemetry fixtures exist and are metadata-only learner-owned streams", () => {
  for (const fixturePath of fixturePaths) {
    assert.equal(existsSync(fixturePath), true, `${fixturePath} should exist`);
  }

  for (const fixture of fixtures()) {
    assert.equal(fixture.learnerOwned, true, `${fixture.fixtureId} should be learner-owned`);
    assert.equal(fixture.metadataOnly, true, `${fixture.fixtureId} should be metadata-only`);
    assert.equal(fixture.forbiddenFieldsAbsent, true, `${fixture.fixtureId} should declare forbidden fields absent`);
    assert.equal(fixture.safeUse, "closed_beta_runtime_telemetry_fixture");
    assert.equal(LEARNER_LOOP_TELEMETRY_USER_SCOPES.includes(fixture.userScope), true);
    assert.ok(fixture.loopId.length > 0);
    assert.ok(Array.isArray(fixture.events));
    assert.ok(fixture.events.length > 0);
    assertNoForbiddenKeys(fixture, fixture.fixtureId);
  }
});

test("event builder emits provider-free metadata-only runtime events", () => {
  for (const candidate of allFixtureEvents()) {
    const event = buildLearnerLoopTelemetryEvent(candidate, new Date("2026-06-12T00:00:00.000Z"));
    const repeated = buildLearnerLoopTelemetryEvent(candidate, new Date("2026-06-12T00:00:00.000Z"));

    assert.equal(event.eventId, repeated.eventId);
    assert.equal(event.metadataOnly, true);
    assert.equal(event.learnerOwned, true);
    assert.equal(event.safeUse, "closed_beta_learner_loop_telemetry");
    assert.equal(event.userScope, candidate.userScope);
    assert.equal(event.loopId, candidate.loopId);
    assert.equal(event.sourceTrace.loopId, candidate.loopId);
    assert.equal(Number.isNaN(Date.parse(event.occurredAt)), false);
    assertNoForbiddenKeys(event, event.eventId);
  }
});

test("runtime collector records in memory and evaluates closed beta loop evidence", () => {
  const durableFixture = readFixture(fixturePaths[0]);
  const collector = createLearnerLoopRuntimeTelemetryCollector();
  const recorded = collector.recordMany(durableFixture.events, new Date("2026-06-12T00:00:00.000Z"));

  assert.equal(recorded.length, durableFixture.events.length);
  assert.equal(collector.list().length, durableFixture.events.length);

  const summary = collector.summarize();
  assert.equal(summary.metadataOnly, true);
  assert.equal(summary.hasClosedLoop, true);
  assert.equal(summary.hasDurableClosedLoop, true);
  assert.equal(summary.hasLocalBetaLoopEvidence, false);
  assert.equal(summary.durableLoopClosureCount, 1);

  const closure = collector.evaluateClosure();
  assert.equal(closure.safeUse, "closed_beta_learner_loop_runtime_telemetry");
  assert.equal(closure.hasDurableClosedLoop, true);
  assert.deepEqual(closure.durableLoopIds, [durableFixture.loopId]);

  collector.clear();
  assert.equal(collector.list().length, 0);
});

test("loop closure requires all required events within the same loopId", () => {
  const durable = buildEvents(readFixture(fixturePaths[0]));
  const incomplete = buildEvents(readFixture(fixturePaths[3]));

  const durableEvidence = evaluateLearnerLoopTelemetryClosure(durable);
  assert.deepEqual(durableEvidence.requiredEventNames, REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES);
  assert.equal(durableEvidence.hasClosedLoop, true);
  assert.equal(durableEvidence.hasDurableClosedLoop, true);

  const incompleteEvidence = evaluateLearnerLoopTelemetryClosure(incomplete);
  assert.equal(incompleteEvidence.hasClosedLoop, false);
  assert.equal(incompleteEvidence.hasDurableClosedLoop, false);
  assert.deepEqual(incompleteEvidence.incompleteLoopIds, ["runtime-loop-incomplete-1"]);
});

test("durable, local fallback, and failed persistence semantics remain distinct", () => {
  const durableEvidence = evaluateLearnerLoopTelemetryClosure(buildEvents(readFixture(fixturePaths[0])));
  const localEvidence = evaluateLearnerLoopTelemetryClosure(buildEvents(readFixture(fixturePaths[1])));
  const failedEvidence = evaluateLearnerLoopTelemetryClosure(buildEvents(readFixture(fixturePaths[2])));

  assert.equal(durableEvidence.hasDurableClosedLoop, true);
  assert.equal(durableEvidence.hasLocalBetaLoopEvidence, false);
  assert.equal(durableEvidence.durableLoopClosureCount, 1);

  assert.equal(localEvidence.hasClosedLoop, true);
  assert.equal(localEvidence.hasDurableClosedLoop, false);
  assert.equal(localEvidence.hasLocalBetaLoopEvidence, true);
  assert.equal(localEvidence.localBetaLoopEvidenceCount, 1);

  assert.equal(failedEvidence.hasClosedLoop, false);
  assert.equal(failedEvidence.hasDurableClosedLoop, false);
  assert.equal(failedEvidence.hasLocalBetaLoopEvidence, false);
  assert.deepEqual(failedEvidence.saveFailedLoopIds, ["runtime-loop-failed-1"]);
});

test("save_failed review queue evidence is excluded from ready telemetry selectors", () => {
  const durableEvents = buildEvents(readFixture(fixturePaths[0]));
  const localEvents = buildEvents(readFixture(fixturePaths[1]));
  const failedEvents = buildEvents(readFixture(fixturePaths[2]));
  const ready = selectReadyLearnerLoopTelemetryReviewQueueEvents([...durableEvents, ...localEvents, ...failedEvents]);

  assert.equal(ready.length, 2);
  assert.equal(ready.some((event) => event.persistenceStatus === "save_failed"), false);
  assert.equal(ready.some((event) => event.loopId === "runtime-loop-durable-1"), true);
  assert.equal(ready.some((event) => event.loopId === "runtime-loop-local-1"), true);
  assert.equal(ready.some((event) => event.loopId === "runtime-loop-failed-1"), false);
});

test("event builder rejects forbidden raw, official, grading, path, and instructor fields", () => {
  for (const key of forbiddenFields) {
    assert.throws(
      () =>
        buildLearnerLoopTelemetryEvent(
          {
            ...readFixture(fixturePaths[0]).events[0],
            [key]: "unsafe",
          },
          new Date("2026-06-12T00:00:00.000Z"),
        ),
      /forbids field/,
      `${key} should be rejected`,
    );
  }
});

test("runtime telemetry helper has no provider or network call wiring", () => {
  const helper = read(helperPath);

  for (const pattern of externalCallPatterns) {
    assert.doesNotMatch(helper, pattern, `helper should avoid external call primitive ${pattern}`);
  }
  for (const pattern of providerNamePatterns) {
    assert.doesNotMatch(helper, pattern, `helper should avoid provider name ${pattern}`);
  }
});

test("runtime telemetry docs and fixtures avoid raw official dependencies", () => {
  const docsAndFixtures = [
    docPath,
    ...fixturePaths,
  ].map((file) => `${file}\n${read(file)}`).join("\n");

  assert.doesNotMatch(docsAndFixtures, localOfficialPattern);
  assert.doesNotMatch(docsAndFixtures, manifestPattern);
  assert.doesNotMatch(docsAndFixtures, rawFilePattern);
  assert.doesNotMatch(docsAndFixtures, /raw official problem text\s*:/i);
  assert.doesNotMatch(docsAndFixtures, /raw official answer text\s*:/i);
  assert.doesNotMatch(docsAndFixtures, /OCR full text\s*:/i);
  assert.doesNotMatch(docsAndFixtures, /official answer body\s*:/i);
});

test("runtime telemetry test is hooked into the node runner without local official reads", () => {
  const runner = read("scripts/run-node-tests.mjs");
  const source = read(testPath);

  assert.equal(runner.includes("tests/learner-loop-runtime-telemetry-wiring.test.mjs"), true);
  assert.doesNotMatch(source, /\b(?:readdir|opendir|glob)\s*\(/i, "test must not enumerate local raw materials");
  assert.doesNotMatch(source, new RegExp("readFileSync\\([\"'`]" + ["local", "official", "materials"].join("[_/]"), "i"));
  assert.doesNotMatch(source, new RegExp(["qnet", "manifest"].join("[_.]") + "\\.json[\"'`]\\)", "i"));
});
