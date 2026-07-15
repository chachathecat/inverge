import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FAILURE_AWARE_AUTHORITY_BOUNDARY,
  FAILURE_AWARE_CONFLICT_COMPARATORS,
  FAILURE_AWARE_CONFLICT_SOURCE_KINDS,
  FAILURE_AWARE_PERSISTENCE_KINDS,
  FAILURE_AWARE_SAFETY_KINDS,
  FAILURE_AWARE_SYSTEM_STATES,
  buildFailureAwareStateModel,
  parseFailureAwareConflictComparison,
  parseFailureAwareConflictSources,
  parseFailureAwarePersistenceEvidence,
  parseFailureAwareSafetyEvidence,
  parseFailureAwareStateEvidence,
  shouldMoveFailureAwareHeadingFocus,
} from "../lib/review-os/failure-aware-state.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");

const OPERATION_ID = "018f2f4a-7b2c-7d11-8a3f-1234567890ab";
const OTHER_OPERATION_ID = "018f2f4a-7b2c-7d12-9a3f-1234567890ab";
const REVISION_ID = "018f2f4a-7b2c-7d13-aa3f-1234567890ab";
const OTHER_REVISION_ID = "018f2f4a-7b2c-7d14-ba3f-1234567890ab";
const RECORD_ID = "018f2f4a-7b2c-7d15-8a3f-1234567890ab";
const LOCAL_RECORD_ID = "018f2f4a-7b2c-7d16-9a3f-1234567890ab";
const LOCAL_DRAFT_ID = "018f2f4a-7b2c-7d17-aa3f-1234567890ab";
const SOURCE_A_ID = "018f2f4a-7b2c-7d18-ba3f-1234567890ab";
const SOURCE_B_ID = "018f2f4a-7b2c-7d19-8a3f-1234567890ab";
const SOURCE_C_ID = "018f2f4a-7b2c-7d1a-9a3f-1234567890ab";
const QUEUE_ULID = "01J2M3N4P5Q6R7S8T9V0W1X2Y3";
const AT = "2026-07-15T00:00:00.000Z";
const LATER_AT = "2026-07-15T00:01:00.000Z";

const persistence = (overrides = {}) => ({
  kind: "durable_record",
  recordId: RECORD_ID,
  operationId: OPERATION_ID,
  workRevisionId: REVISION_ID,
  persistedAt: AT,
  ...overrides,
});

const sources = [
  {
    kind: "learner_record",
    sourceId: SOURCE_A_ID,
    observedAt: AT,
  },
  {
    kind: "reference_record",
    sourceId: SOURCE_B_ID,
    observedAt: LATER_AT,
  },
];

const comparison = (overrides = {}) => ({
  kind: "source_mismatch",
  operationId: OPERATION_ID,
  leftSourceId: SOURCE_A_ID,
  rightSourceId: SOURCE_B_ID,
  comparator: "normalized_value",
  mismatchObserved: true,
  comparedAt: LATER_AT,
  ...overrides,
});

const stateFixtures = [
  { kind: "loading", safety: { kind: "unchanged", unchanged: true } },
  { kind: "empty", safety: { kind: "not_applicable" } },
  {
    kind: "error",
    retryable: true,
    safety: { kind: "memory_only", retainedInMemory: true },
  },
  {
    kind: "offline",
    safety: {
      kind: "queued_for_sync",
      queueId: QUEUE_ULID,
      queuedAt: AT,
      autoSyncRegistered: true,
    },
  },
  {
    kind: "conflict",
    operationId: OPERATION_ID,
    safety: { kind: "unchanged", unchanged: true },
    sources,
    comparison: comparison(),
  },
  {
    kind: "completed",
    operationId: OPERATION_ID,
    workRevisionId: REVISION_ID,
    persistence: persistence(),
  },
];

test("S232F.0 exposes all six system states with what/safety/next answers", () => {
  assert.deepEqual(FAILURE_AWARE_SYSTEM_STATES, [
    "loading",
    "empty",
    "error",
    "offline",
    "conflict",
    "completed",
  ]);
  assert.deepEqual(stateFixtures.map((evidence) => evidence.kind), FAILURE_AWARE_SYSTEM_STATES);

  const models = stateFixtures.map(buildFailureAwareStateModel);
  for (const model of models) {
    assert.ok(model.title.trim(), `${model.state} requires a title`);
    assert.ok(model.happened.trim(), `${model.state} requires what happened`);
    assert.ok(model.safety.message.trim(), `${model.state} requires safety copy`);
    assert.ok(model.nextAction.trim(), `${model.state} requires a next action`);
    assert.equal(model.authorityBoundary, FAILURE_AWARE_AUTHORITY_BOUNDARY);
    assert.doesNotMatch(
      `${model.title} ${model.happened} ${model.safety.message} ${model.nextAction}`,
      /공식\s*채점|확정\s*점수|합격\s*(?:판정|가능성|보장)|모범\s*답안\s*확정|기기\s*검증\s*완료/,
    );
  }

  assert.deepEqual(FAILURE_AWARE_AUTHORITY_BOUNDARY, {
    learningSupportOnly: true,
    officialGradingAllowed: false,
    confirmedScoreAllowed: false,
    passProbabilityAllowed: false,
    modelAnswerAuthorityAllowed: false,
    deviceVerificationAllowed: false,
  });
});

test("S232F.0 accepts only UUID/ULID evidence IDs and canonical round-trippable timestamps", () => {
  assert.deepEqual(FAILURE_AWARE_SAFETY_KINDS, [
    "not_applicable",
    "unchanged",
    "memory_only",
    "local_draft",
    "queued_for_sync",
    "persisted",
    "unknown",
  ]);
  assert.equal(
    parseFailureAwareSafetyEvidence({
      kind: "local_draft",
      localDraftId: LOCAL_DRAFT_ID,
      persistedAt: AT,
    }).kind,
    "local_draft",
  );
  const canonicalQueue = parseFailureAwareSafetyEvidence({
    kind: "queued_for_sync",
    queueId: QUEUE_ULID.toLowerCase(),
    queuedAt: AT,
    autoSyncRegistered: true,
  });
  assert.equal(canonicalQueue.kind, "queued_for_sync");
  assert.equal(canonicalQueue.queueId, QUEUE_ULID, "ULIDs normalize to uppercase");
  assert.equal(
    parseFailureAwareSafetyEvidence({
      kind: "persisted",
      persistence: persistence(),
    }).kind,
    "persisted",
  );

  for (const invalid of [
    { kind: "unchanged", unchanged: false },
    { kind: "memory_only", retainedInMemory: false },
    { kind: "unknown", preservationKnown: true },
    { kind: "local_draft", localDraftId: "draft-1", persistedAt: AT },
    { kind: "local_draft", localDraftId: "learner-answer-revision", persistedAt: AT },
    { kind: "local_draft", localDraftId: LOCAL_DRAFT_ID, persistedAt: "2026-07-15" },
    { kind: "local_draft", localDraftId: LOCAL_DRAFT_ID, persistedAt: "2026-07-15T09:00:00+09:00" },
    { kind: "local_draft", localDraftId: LOCAL_DRAFT_ID, persistedAt: "2026-07-15T00:00:00Z" },
    { kind: "local_draft", localDraftId: LOCAL_DRAFT_ID, persistedAt: "2026-02-30T00:00:00.000Z" },
    { kind: "unknown", preservationKnown: false, safe: true },
  ]) {
    assert.throws(
      () => parseFailureAwareSafetyEvidence(invalid),
      /s232f0-failure-aware-state/,
      `loose evidence was accepted: ${JSON.stringify(invalid)}`,
    );
  }
});

test("S232F.0 binds Completed to the current operation and work revision", () => {
  assert.deepEqual(FAILURE_AWARE_PERSISTENCE_KINDS, ["durable_record", "local_record"]);
  const durable = parseFailureAwarePersistenceEvidence(persistence());
  const local = parseFailureAwarePersistenceEvidence(
    persistence({ kind: "local_record", recordId: LOCAL_RECORD_ID }),
  );
  for (const receipt of [durable, local]) {
    const model = buildFailureAwareStateModel({
      kind: "completed",
      operationId: OPERATION_ID,
      workRevisionId: REVISION_ID,
      persistence: receipt,
    });
    assert.deepEqual(model.persistence, receipt);
    assert.equal(model.operationId, OPERATION_ID);
    assert.equal(model.workRevisionId, REVISION_ID);
    assert.match(model.happened, /현재 작업 버전/);
  }

  const caseNormalized = buildFailureAwareStateModel({
    kind: "completed",
    operationId: OPERATION_ID.toUpperCase(),
    workRevisionId: REVISION_ID.toUpperCase(),
    persistence: persistence(),
  });
  assert.equal(caseNormalized.operationId, OPERATION_ID);
  assert.equal(caseNormalized.workRevisionId, REVISION_ID);
  assert.equal(caseNormalized.persistence.operationId, OPERATION_ID);
  assert.equal(caseNormalized.persistence.workRevisionId, REVISION_ID);
  assert.equal(caseNormalized.persistence.recordId, RECORD_ID);

  for (const invalid of [
    { kind: "completed" },
    { kind: "completed", completed: true },
    {
      kind: "completed",
      operationId: OPERATION_ID,
      workRevisionId: REVISION_ID,
      persistence: persistence({ operationId: OTHER_OPERATION_ID }),
    },
    {
      kind: "completed",
      operationId: OPERATION_ID,
      workRevisionId: REVISION_ID,
      persistence: persistence({ workRevisionId: OTHER_REVISION_ID }),
    },
    {
      kind: "completed",
      operationId: "save-current-answer",
      workRevisionId: REVISION_ID,
      persistence: persistence(),
    },
    {
      kind: "completed",
      operationId: OPERATION_ID,
      workRevisionId: REVISION_ID,
      persistence: persistence({ persistedAt: "2026-07-15T00:00:00Z" }),
    },
  ]) {
    assert.throws(
      () => parseFailureAwareStateEvidence(invalid),
      /s232f0-failure-aware-state/,
      `Completed accepted an unrelated or incomplete receipt: ${JSON.stringify(invalid)}`,
    );
  }
});

test("S232F.0 requires typed comparator mismatch evidence tied to two real sources", () => {
  assert.deepEqual(FAILURE_AWARE_CONFLICT_SOURCE_KINDS, [
    "learner_record",
    "persisted_record",
    "reference_record",
    "manual_entry",
    "imported_record",
    "ocr_draft",
    "ai_draft",
  ]);
  assert.deepEqual(FAILURE_AWARE_CONFLICT_COMPARATORS, [
    "normalized_value",
    "record_revision",
    "sync_revision",
  ]);
  assert.equal(parseFailureAwareConflictSources(sources).length, 2);
  assert.equal(parseFailureAwareConflictComparison(comparison()).mismatchObserved, true);

  const conflict = buildFailureAwareStateModel({
    kind: "conflict",
    operationId: OPERATION_ID,
    safety: { kind: "unchanged", unchanged: true },
    sources,
    comparison: comparison(),
  });
  assert.equal(conflict.operationId, OPERATION_ID);
  assert.equal(conflict.conflictSourceCount, 2);
  assert.equal(conflict.conflictComparator, "normalized_value");
  assert.deepEqual(conflict.conflictSourceLabels, ["학습자 기록", "참고 기록"]);
  assert.match(conflict.happened, /정규화된 값 비교에서 두 근거가 일치하지 않았습니다/);

  for (const invalid of [
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
    },
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
      comparison: comparison({ mismatchObserved: false }),
    },
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
      comparison: comparison({ rightSourceId: SOURCE_A_ID }),
    },
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
      comparison: comparison({ rightSourceId: SOURCE_C_ID }),
    },
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
      comparison: comparison({ operationId: OTHER_OPERATION_ID }),
    },
    {
      kind: "conflict",
      operationId: OPERATION_ID,
      safety: { kind: "unchanged", unchanged: true },
      sources,
      comparison: comparison({ comparator: "free_text_similarity" }),
    },
  ]) {
    assert.throws(
      () => buildFailureAwareStateModel(invalid),
      /s232f0-failure-aware-state/,
      `Conflict accepted IDs without a bound mismatch: ${JSON.stringify(invalid)}`,
    );
  }

  for (const invalidSources of [
    [],
    sources.slice(0, 1),
    [sources[0], { ...sources[1], sourceId: SOURCE_A_ID }],
    [sources[0], { ...sources[1], sourceId: SOURCE_A_ID.toUpperCase() }],
    [sources[0], { ...sources[1], sourceId: "source-b" }],
    [sources[0], { ...sources[1], observedAt: "2026-07-15T00:01:00Z" }],
    [sources[0], { ...sources[1], label: "caller-supplied raw text" }],
  ]) {
    assert.throws(
      () => parseFailureAwareConflictSources(invalidSources),
      /s232f0-failure-aware-state/,
      `Conflict accepted non-concrete sources: ${JSON.stringify(invalidSources)}`,
    );
  }
});

test("S232F.0 says only that an offline automatic retry is registered", () => {
  const queueBacked = buildFailureAwareStateModel({
    kind: "offline",
    safety: {
      kind: "queued_for_sync",
      queueId: QUEUE_ULID,
      queuedAt: AT,
      autoSyncRegistered: true,
    },
  });
  assert.equal(queueBacked.autoSyncEligible, true);
  assert.match(queueBacked.nextAction, /자동 재시도가 대기열에 등록되어 있습니다/);
  assert.match(queueBacked.nextAction, /성공 여부를 확인하세요/);
  assert.doesNotMatch(queueBacked.nextAction, /자동으로 다시 보냅니다|성공합니다|완료됩니다|반드시/);

  for (const safety of [
    { kind: "not_applicable" },
    { kind: "unchanged", unchanged: true },
    { kind: "memory_only", retainedInMemory: true },
    { kind: "local_draft", localDraftId: LOCAL_DRAFT_ID, persistedAt: AT },
    { kind: "unknown", preservationKnown: false },
  ]) {
    const model = buildFailureAwareStateModel({ kind: "offline", safety });
    assert.equal(model.autoSyncEligible, false);
    assert.doesNotMatch(model.nextAction, /자동\s*(?:재시도|동기화|으로)/);
  }

  for (const invalid of [
    {
      kind: "offline",
      safety: { kind: "queued_for_sync", queueId: "queue-1", queuedAt: AT, autoSyncRegistered: true },
    },
    {
      kind: "offline",
      safety: { kind: "queued_for_sync", queueId: QUEUE_ULID, queuedAt: AT, autoSyncRegistered: false },
    },
    {
      kind: "error",
      retryable: true,
      safety: { kind: "queued_for_sync", queueId: QUEUE_ULID, queuedAt: AT, autoSyncRegistered: true },
    },
  ]) {
    assert.throws(
      () => buildFailureAwareStateModel(invalid),
      /s232f0-failure-aware-state/,
      `automatic retry was claimed without valid offline queue evidence: ${JSON.stringify(invalid)}`,
    );
  }
});

test("S232F.0 rejects inherited, extra, and authority-shaped evidence", () => {
  const inherited = Object.create({
    kind: "empty",
    safety: { kind: "not_applicable" },
  });
  assert.throws(() => parseFailureAwareStateEvidence(inherited), /plain-prototype/);

  for (const invalid of [
    { kind: "verified", safety: { kind: "unchanged", unchanged: true } },
    { kind: "error", retryable: "yes", safety: { kind: "unknown", preservationKnown: false } },
    { kind: "empty", safety: { kind: "not_applicable" }, passProbability: 0.95 },
    { kind: "loading", safety: { kind: "unchanged", unchanged: true }, confirmedScore: 100 },
    { kind: "offline", safety: { kind: "unknown", preservationKnown: false }, deviceVerified: true },
  ]) {
    assert.throws(
      () => parseFailureAwareStateEvidence(invalid),
      /s232f0-failure-aware-state/,
      `unsupported state evidence was accepted: ${JSON.stringify(invalid)}`,
    );
  }
});

test("S232F.0 component never steals focus on first mount or from another instance", () => {
  const component = read("components/learner/failure-aware-state.tsx");
  const barrel = read("components/learner/index.ts");

  assert.equal(
    shouldMoveFailureAwareHeadingFocus({
      enabled: true,
      previousState: "error",
      nextState: "error",
      activeElementWithinInstance: true,
    }),
    false,
    "first mount has the same previous/current state and must not move focus",
  );
  assert.equal(
    shouldMoveFailureAwareHeadingFocus({
      enabled: true,
      previousState: "loading",
      nextState: "error",
      activeElementWithinInstance: false,
    }),
    false,
    "a different instance or outside form keeps focus",
  );
  assert.equal(
    shouldMoveFailureAwareHeadingFocus({
      enabled: true,
      previousState: "loading",
      nextState: "error",
      activeElementWithinInstance: true,
    }),
    true,
    "an opted-in genuine transition may move focus inside its own instance",
  );
  assert.equal(
    shouldMoveFailureAwareHeadingFocus({
      enabled: false,
      previousState: "loading",
      nextState: "error",
      activeElementWithinInstance: true,
    }),
    false,
  );

  assert.match(component, /^"use client";/);
  assert.match(component, /data-v3-component="FailureAwareState"/);
  assert.match(component, /data-v3-system-state=\{model\.state\}/);
  assert.match(component, /role="region"/);
  assert.match(component, /aria-labelledby=\{headingId\}/);
  assert.match(component, /aria-busy=\{model\.state === "loading" \? true : undefined\}/);
  assert.match(component, /focusHeadingOnChange = false/);
  assert.match(component, /const previousStateRef = useRef\(model\.state\)/);
  assert.match(component, /const previousState = previousStateRef\.current/);
  assert.match(component, /previousStateRef\.current = model\.state/);
  assert.match(component, /shouldMoveFailureAwareHeadingFocus\(\{/);
  assert.match(component, /nextState: model\.state/);
  assert.match(component, /sectionRef\.current\?\.contains\(activeElement\)/);
  assert.match(component, /headingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /tabIndex=\{focusHeadingOnChange \? -1 : undefined\}/);
  assert.doesNotMatch(component, /focusHeading \?\?|model\.state !== "loading"/);
  assert.match(component, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(component, /<dl[^>]*data-failure-aware-explanation>/);
  for (const copy of ["무슨 일이 있었나요", "입력과 데이터는 안전한가요", "다음 행동"]) {
    assert.ok(component.includes(copy), `missing failure-aware answer: ${copy}`);
  }
  assert.match(component, /min-h-11/);
  assert.match(component, /focus-visible:outline-\[var\(--color-border-focus\)\]/);
  assert.doesNotMatch(component, /role="alert"|truncate|line-clamp|overflow-hidden/);

  assert.match(barrel, /export \{ FailureAwareState \}/);
  assert.match(barrel, /FailureAwareStateProps/);
  assert.match(barrel, /FailureAwareConflictComparisonEvidence/);
  assert.match(barrel, /FailureAwareStateEvidence/);
});

test("S232F.0 keeps fake fixtures out of production and documents strict adoption", () => {
  const contract = read("lib/review-os/failure-aware-state.ts");
  const doc = read("docs/qa/s232f0-failure-aware-state-contract.md");
  const runner = read("scripts/run-node-tests.mjs");

  assert.doesNotMatch(contract, /FIXTURE|synthetic-(?:queue|source|record)/i);
  assert.doesNotMatch(contract, /case "completed":\s*throw contractError\("unreachable/);
  assert.match(doc, /Figma V3 Utilities\/States/i);
  assert.match(doc, /`61:80`/);
  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /UUID or ULID/i);
  assert.match(doc, /UUIDs normalize to lowercase and ULIDs to uppercase/i);
  assert.match(doc, /round-trippable canonical UTC ISO timestamp/i);
  assert.match(doc, /comparator mismatch/i);
  assert.match(doc, /operation and work revision/i);
  assert.match(doc, /does not modify existing feature screens/i);
  assert.match(doc, /## Rollback/);
  assert.ok(runner.includes("tests/s232f0-failure-aware-state-contract.test.mjs"));
});
