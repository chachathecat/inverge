import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { CAPTURE_SAVE_PERSISTENCE_STATUSES } from "../lib/review-os/capture-save-persistence.ts";
import { selectReadyReviewQueueReflections } from "../lib/review-os/review-queue-reflection.ts";

const docPath = "docs/durable-persistence-evidence.md";
const testPath = "tests/durable-persistence-evidence.test.mjs";
const fixturePaths = [
  "tests/fixtures/learner-loop/durable-persistence/durable-capture-note-closed-loop.json",
  "tests/fixtures/learner-loop/durable-persistence/local-fallback-capture-note-browser-evidence.json",
  "tests/fixtures/learner-loop/durable-persistence/save-failed-capture-note-excluded.json",
  "tests/fixtures/learner-loop/durable-persistence/durable-review-completion-closed-loop.json",
  "tests/fixtures/learner-loop/durable-persistence/save-failed-calm-retry.json",
];

const requiredFixtureFields = [
  "fixtureId",
  "scenario",
  "persistenceStatus",
  "learnerOwned",
  "metadataOnly",
  "shouldAppearInReadyQueue",
  "shouldCountAsDurableClosedLoop",
  "learnerFacingCopy",
  "expectedRecoveryAction",
  "forbiddenFieldsAbsent",
  "safeUse",
];

const forbiddenFields = [
  "score",
  "passFail",
  "officialGrade",
  "officialAnswer",
  "modelAnswer",
  "instructorComment",
  "rawOfficialPath",
  "qnetRawPath",
  "localOfficialMaterialsPath",
  "ocrFullText",
  "officialAnswerBody",
  "copiedProblemText",
  "copiedAnswerText",
  "rawProblemText",
  "rawAnswerText",
  "rawOcrText",
  "sourceText",
  "archiveUrl",
  "analyticsProvider",
  "aiProvider",
];

const localOfficialPattern = new RegExp(["local", "official", "materials"].join("[_/]"), "i");
const manifestPattern = new RegExp(["qnet", "manifest"].join("[_.]") + "\\.json", "i");
const rawFilePattern = /(?:^|[\\/])[^\\/]+\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i;

const forbiddenCopyPatterns = [
  /공식\s*(채점|모범답안|답안|해설|점수)/,
  /모범답안/,
  /점수\s*예측/,
  /합격\s*판정|불합격\s*판정|합격\/불합격/,
  /결제/,
  /강사용\s*콘솔|강사\s*콘솔/,
  /public\s+archive/i,
  /problem\s+bank/i,
  /official\s+(grading|grade|answer|model answer|score)/i,
  /model\s+answer/i,
  /score\s+prediction/i,
  /pass\s*\/?\s*fail/i,
  /payment/i,
  /instructor\s+console/i,
  /analytics\s+provider/i,
  /AI\s+provider/i,
];

const overclaimPatterns = [
  /동기화|sync/i,
  /다른\s*기기|cross-device/i,
  /영구|permanent|forever/i,
  /보장/,
];

const localOrFailedDurableClaimPatterns = [
  /계정\s*저장/,
  /account\s+saved/i,
  /durable\s+saved/i,
  /durable\s+closed\s+loop/i,
];

const shameOrFearPatterns = [
  /망했|늦었|불합격|탈락|위험하다|큰일/,
  /failed\s+learner/i,
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

function assertNoForbiddenKeys(value, path = "fixture") {
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

function asReviewQueueInput(fixture) {
  return {
    sourceId: fixture.fixtureId,
    sourceType: fixture.fixtureId.includes("review-completion") ? "review_queue" : "capture_note",
    examMode: "second",
    subject: "감정평가이론",
    biggestGap: "저장 상태에 따른 복습 연결 확인",
    nextAction: fixture.expectedRecoveryAction,
    nextActionTaskType: "review_note",
    persistenceStatus: fixture.persistenceStatus,
    metadataOnly: fixture.metadataOnly,
    learnerOwned: fixture.learnerOwned,
  };
}

test("durable persistence evidence doc exists and records the closed-beta state contract", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "Durable Persistence Evidence v1",
    "durable_saved",
    "local_fallback_saved",
    "save_failed",
    "browser-local fallback",
    "must not count as durable closed-loop evidence",
    "must not appear in the ready Review Queue selector",
    "Today Plan, Review Queue, and Notes",
    "calm and action-oriented",
    "metadata",
    "closed_beta_durable_persistence_evidence",
    "npm.cmd run typecheck",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));

  assert.doesNotMatch(doc, localOfficialPattern);
  assert.doesNotMatch(doc, manifestPattern);
  assert.doesNotMatch(doc, rawFilePattern);
});

test("durable persistence fixtures exist and are learner-owned metadata evidence", () => {
  const loaded = fixtures();
  assert.equal(loaded.length, 5);
  assert.deepEqual(new Set(loaded.map((fixture) => fixture.fixtureId)).size, loaded.length);

  for (const fixturePath of fixturePaths) {
    assert.equal(existsSync(fixturePath), true, `${fixturePath} should exist`);
  }

  for (const fixture of loaded) {
    for (const field of requiredFixtureFields) {
      assert.equal(Object.hasOwn(fixture, field), true, `${fixture.fixtureId} should include ${field}`);
    }
    assert.equal(fixture.learnerOwned, true, `${fixture.fixtureId} should be learner-owned`);
    assert.equal(fixture.metadataOnly, true, `${fixture.fixtureId} should be metadata-only`);
    assert.equal(fixture.forbiddenFieldsAbsent, true, `${fixture.fixtureId} should declare forbidden fields absent`);
    assert.equal(fixture.safeUse, "closed_beta_durable_persistence_evidence");
    assert.equal(CAPTURE_SAVE_PERSISTENCE_STATUSES.includes(fixture.persistenceStatus), true);
    assert.equal(typeof fixture.learnerFacingCopy, "string");
    assert.ok(fixture.learnerFacingCopy.trim().length > 0);
    assert.equal(typeof fixture.expectedRecoveryAction, "string");
    assert.ok(fixture.expectedRecoveryAction.trim().length > 0);
    assertNoForbiddenKeys(fixture, fixture.fixtureId);
  }
});

test("all persistence states are covered with durable/local/failure semantics", () => {
  const loaded = fixtures();
  const states = new Set(loaded.map((fixture) => fixture.persistenceStatus));

  assert.deepEqual(states, new Set(["durable_saved", "local_fallback_saved", "save_failed"]));

  const durableClosedLoops = loaded.filter((fixture) => fixture.shouldCountAsDurableClosedLoop);
  assert.ok(durableClosedLoops.length >= 2);
  for (const fixture of durableClosedLoops) {
    assert.equal(fixture.persistenceStatus, "durable_saved", `${fixture.fixtureId} durable evidence must come from durable_saved`);
  }

  const localFallback = loaded.filter((fixture) => fixture.persistenceStatus === "local_fallback_saved");
  assert.ok(localFallback.length >= 1);
  for (const fixture of localFallback) {
    assert.equal(fixture.shouldCountAsDurableClosedLoop, false, `${fixture.fixtureId} should not count as durable closed loop`);
  }

  const saveFailed = loaded.filter((fixture) => fixture.persistenceStatus === "save_failed");
  assert.ok(saveFailed.length >= 2);
  for (const fixture of saveFailed) {
    assert.equal(fixture.shouldCountAsDurableClosedLoop, false, `${fixture.fixtureId} should not count as durable closed loop`);
    assert.equal(fixture.shouldAppearInReadyQueue, false, `${fixture.fixtureId} should not appear in ready queue evidence`);
  }
});

test("ready Review Queue evidence excludes save_failed while keeping durable and local fallback candidates distinct", () => {
  const loaded = fixtures();
  const readyEvidence = loaded.filter((fixture) => fixture.shouldAppearInReadyQueue);
  assert.ok(readyEvidence.length >= 2);
  assert.equal(readyEvidence.some((fixture) => fixture.persistenceStatus === "save_failed"), false);
  assert.equal(readyEvidence.some((fixture) => fixture.persistenceStatus === "durable_saved"), true);
  assert.equal(readyEvidence.some((fixture) => fixture.persistenceStatus === "local_fallback_saved"), true);

  const runtimeReady = selectReadyReviewQueueReflections(loaded.map(asReviewQueueInput), new Date("2026-06-12T01:00:00.000Z"));
  assert.equal(runtimeReady.some((reflection) => reflection.persistenceStatus === "save_failed"), false);
  assert.equal(runtimeReady.some((reflection) => reflection.sourceId === "save-failed-capture-note-excluded"), false);
  assert.equal(runtimeReady.some((reflection) => reflection.sourceId === "save-failed-calm-retry"), false);
});

test("learner-facing persistence copy is calm and does not overclaim account sync", () => {
  for (const fixture of fixtures()) {
    for (const pattern of forbiddenCopyPatterns) {
      assert.doesNotMatch(fixture.learnerFacingCopy, pattern, `${fixture.fixtureId} learner copy should avoid ${pattern}`);
      assert.doesNotMatch(fixture.expectedRecoveryAction, pattern, `${fixture.fixtureId} action copy should avoid ${pattern}`);
    }
    for (const pattern of overclaimPatterns) {
      assert.doesNotMatch(fixture.learnerFacingCopy, pattern, `${fixture.fixtureId} copy should not overclaim persistence`);
    }
    for (const pattern of shameOrFearPatterns) {
      assert.doesNotMatch(fixture.learnerFacingCopy, pattern, `${fixture.fixtureId} copy should stay calm`);
      assert.doesNotMatch(fixture.expectedRecoveryAction, pattern, `${fixture.fixtureId} recovery action should stay calm`);
    }
    if (fixture.persistenceStatus !== "durable_saved") {
      for (const pattern of localOrFailedDurableClaimPatterns) {
        assert.doesNotMatch(fixture.learnerFacingCopy, pattern, `${fixture.fixtureId} should not claim durable account save`);
      }
    }
  }
});

test("durable persistence evidence avoids raw official dependencies and forbidden fields", () => {
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

  for (const fixture of fixtures()) {
    assertNoForbiddenKeys(fixture, fixture.fixtureId);
  }
});

test("durable persistence evidence test is hooked into the node runner without local official reads", () => {
  const runner = read("scripts/run-node-tests.mjs");
  const source = read(testPath);

  assert.equal(runner.includes("tests/durable-persistence-evidence.test.mjs"), true);
  assert.doesNotMatch(source, /\b(?:readdir|opendir|glob)\s*\(/i, "test must not enumerate local raw materials");
  assert.doesNotMatch(source, new RegExp("readFileSync\\([\"'`]" + ["local", "official", "materials"].join("[_/]"), "i"));
  assert.doesNotMatch(source, new RegExp(["qnet", "manifest"].join("[_.]") + "\\.json[\"'`]\\)", "i"));
});
