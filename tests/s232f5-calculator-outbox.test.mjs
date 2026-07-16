import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCalculatorRoutineCompletionSignal,
  createCalculatorRoutineDraft,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import {
  buildCalculatorRoutineOfflineEvidence,
  CALCULATOR_ROUTINE_OUTBOX_LIMIT,
  CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
  enqueueCalculatorRoutineCompletion,
  parseCalculatorRoutineDurableReceipt,
  readCalculatorRoutineOutbox,
  removeCalculatorRoutineOutboxEntry,
} from "../lib/review-os/calculator-routine-outbox.ts";
import { buildFailureAwareStateModel } from "../lib/review-os/failure-aware-state.ts";

const read = (path) => readFileSync(path, "utf8");
const NOW = new Date("2026-07-16T08:00:00.000Z");
const QUEUE_ID = "018f2f4a-7b2c-7d21-8a3f-1234567890ab";
const RECORD_ID = "018f2f4a-7b2c-7d22-9a3f-1234567890ab";
const ACCOUNT_SCOPE = "a".repeat(64);
const OTHER_ACCOUNT_SCOPE = "b".repeat(64);

const routineId = (index = 0) =>
  `problem-snap-018f2f4a-7b2c-7d10-8a3f-${index.toString(16).padStart(12, "0")}`;

class MemoryStorage {
  values = new Map();
  writes = 0;
  failReads = false;
  failWrites = false;

  getItem(key) {
    if (this.failReads) throw new Error("private storage detail");
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error("private storage detail");
    this.writes += 1;
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.failWrites) throw new Error("private storage detail");
    this.values.delete(key);
  }
}

const textSteps = {
  conditions: "조건 확인",
  formula: "산식 확인",
  numbers_units: "숫자와 단위 확인",
  casio_input: "100 × 0.05 EXE",
  display_value: "화면값 확인",
  answer_value: "답안 기재값 확인",
  unit_rounding: "단위와 반올림 확인",
};

function signal({
  routineId: signalRoutineId = routineId(),
  completedAt = "2026-07-16T07:30:00.000Z",
  mistakeTypes = ["none"],
  verificationMethods = ["unit_check"],
} = {}) {
  let draft = createCalculatorRoutineDraft({
    source: "problem-snap",
    examMode: "second",
    subject: "감정평가실무",
    routineId: signalRoutineId,
    now: "2026-07-16T07:00:00.000Z",
  });
  for (const [stepId, value] of Object.entries(textSteps)) {
    draft = updateCalculatorRoutineDraftStep(
      draft,
      stepId,
      value,
      "2026-07-16T07:01:00.000Z",
    );
  }
  draft = {
    ...draft,
    verificationMethods,
    mistakeTypes,
    entries: {
      ...draft.entries,
      verification: "must never enter the outbox",
      mistake_type: "must never enter the outbox",
    },
  };
  return buildCalculatorRoutineCompletionSignal(draft, completedAt);
}

function receipt(status = "saved") {
  return {
    ok: true,
    status,
    learningRecordId: RECORD_ID,
    learningRecordSaved: true,
    deduped: status === "deduped",
  };
}

test("S232F.5 creates F0 Offline only after a verified metadata-only local queue write", () => {
  const storage = new MemoryStorage();
  const result = enqueueCalculatorRoutineCompletion(storage, signal(), {
    now: NOW,
    queueId: QUEUE_ID,
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: true,
  });

  assert.equal(result.status, "queued");
  assert.equal(result.deduped, false);
  assert.equal(result.queueSize, 1);
  assert.equal(storage.writes, 1);
  assert.equal(result.entry.queueId, QUEUE_ID);
  assert.equal(result.entry.queuedAt, NOW.toISOString());
  assert.equal(result.entry.accountScope, ACCOUNT_SCOPE);
  assert.equal(result.entry.autoSyncRegistered, true);
  assert.equal(result.entry.metadataOnly, true);
  assert.equal(JSON.stringify(result.entry).includes("must never enter"), false);

  const evidence = buildCalculatorRoutineOfflineEvidence(result.entry);
  const model = buildFailureAwareStateModel(evidence);
  assert.equal(model.state, "offline");
  assert.equal(model.safety.kind, "queued_for_sync");
  assert.equal(model.autoSyncEligible, true);
  assert.equal(model.retryable, false);

  const noRegistration = enqueueCalculatorRoutineCompletion(storage, signal({
    routineId: routineId(1),
  }), {
    now: NOW,
    queueId: "018f2f4a-7b2c-7d23-aa3f-1234567890ab",
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: false,
  });
  assert.equal(noRegistration.status, "invalid");

  const unavailable = new MemoryStorage();
  unavailable.failWrites = true;
  assert.equal(enqueueCalculatorRoutineCompletion(unavailable, signal(), {
    now: NOW,
    queueId: QUEUE_ID,
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: true,
  }).status, "unavailable");
});

test("S232F.5 canonicalizes, deduplicates, bounds, and purges corrupt or content-bearing entries", () => {
  const storage = new MemoryStorage();
  const first = enqueueCalculatorRoutineCompletion(storage, signal(), {
    now: NOW,
    queueId: QUEUE_ID,
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: true,
  });
  assert.equal(first.status, "queued");
  const duplicate = enqueueCalculatorRoutineCompletion(storage, signal(), {
    now: new Date("2026-07-16T08:01:00.000Z"),
    queueId: "018f2f4a-7b2c-7d24-ba3f-1234567890ab",
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: true,
  });
  assert.equal(duplicate.status, "queued");
  assert.equal(duplicate.deduped, true);
  assert.equal(duplicate.entry.queueId, QUEUE_ID);
  assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).entries.length, 1);

  const valid = JSON.parse(storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY))[0];
  storage.setItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY, JSON.stringify([
    valid,
    { ...valid, queueId: "018f2f4a-7b2c-7d24-ba3f-1234567890ab" },
    { ...valid, queueId: "bad-id" },
    { ...valid, queueId: "018f2f4a-7b2c-7d25-8a3f-1234567890ab", signal: { ...valid.signal, rawAnswerText: "PRIVATE" } },
    { ...valid, queueId: "018f2f4a-7b2c-7d26-8a3f-1234567890ab", secretPayload: "PRIVATE" },
  ]));
  const cleaned = readCalculatorRoutineOutbox(storage, NOW.getTime());
  assert.equal(cleaned.status, "ready");
  assert.equal(cleaned.entries.length, 1);
  assert.equal(cleaned.discardedCount, 4);
  assert.doesNotMatch(storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY), /PRIVATE/);

  for (let index = 0; index < CALCULATOR_ROUTINE_OUTBOX_LIMIT - 1; index += 1) {
    const queued = enqueueCalculatorRoutineCompletion(storage, signal({
      routineId: routineId(index + 10),
      completedAt: `2026-07-16T07:${String(index).padStart(2, "0")}:00.000Z`,
    }), {
      now: NOW,
      queueId: `018f2f4a-7b2c-7d${String(30 + index).padStart(2, "0")}-8a3f-1234567890ab`,
      accountScope: ACCOUNT_SCOPE,
      autoSyncRegistered: true,
    });
    assert.equal(queued.status, "queued");
  }
  const fullQueue = readCalculatorRoutineOutbox(storage, NOW.getTime()).entries;
  assert.equal(fullQueue.length, CALCULATOR_ROUTINE_OUTBOX_LIMIT);
  const fullQueueIds = fullQueue.map((entry) => entry.queueId);
  const overflow = enqueueCalculatorRoutineCompletion(storage, signal({
    routineId: routineId(99),
    completedAt: "2026-07-16T07:59:00.000Z",
  }), {
    now: NOW,
    queueId: "018f2f4a-7b2c-7d50-8a3f-1234567890ab",
    accountScope: ACCOUNT_SCOPE,
    autoSyncRegistered: true,
  });
  assert.equal(overflow.status, "unavailable");
  assert.deepEqual(
    readCalculatorRoutineOutbox(storage, NOW.getTime()).entries.map((entry) => entry.queueId),
    fullQueueIds,
    "a full queue must never evict an unacknowledged entry",
  );

  const overCapacityEntries = JSON.parse(
    storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY),
  );
  overCapacityEntries.push({
    ...overCapacityEntries.at(-1),
    queueId: "018f2f4a-7b2c-7d51-8a3f-1234567890ab",
    signal: {
      ...overCapacityEntries.at(-1).signal,
      routineId: routineId(100),
      completedAt: "2026-07-16T07:58:00.000Z",
    },
  });
  const overCapacityRaw = JSON.stringify(overCapacityEntries);
  storage.setItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY, overCapacityRaw);
  assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).status, "unavailable");
  assert.equal(
    storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY),
    overCapacityRaw,
    "an over-capacity valid set must fail closed without deleting pending entries",
  );

  storage.setItem(
    CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
    JSON.stringify([
      ...overCapacityEntries,
      {
        ...valid,
        queueId: "018f2f4a-7b2c-7d55-8a3f-1234567890ab",
        signal: { ...valid.signal, rawAnswerText: "PRIVATE" },
      },
    ]),
  );
  assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).status, "unavailable");
  const sanitizedOverflowRaw = storage.getItem(
    CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
  );
  assert.doesNotMatch(sanitizedOverflowRaw, /PRIVATE/);
  assert.equal(JSON.parse(sanitizedOverflowRaw).length, CALCULATOR_ROUTINE_OUTBOX_LIMIT + 1);
});

test("S232F.5 binds dedupe and delivery eligibility to one opaque account scope", () => {
  const storage = new MemoryStorage();
  for (const [accountScope, queueId] of [
    [ACCOUNT_SCOPE, QUEUE_ID],
    [OTHER_ACCOUNT_SCOPE, "018f2f4a-7b2c-7d52-8a3f-1234567890ab"],
  ]) {
    const queued = enqueueCalculatorRoutineCompletion(storage, signal(), {
      now: NOW,
      queueId,
      accountScope,
      autoSyncRegistered: true,
    });
    assert.equal(queued.status, "queued");
    assert.equal(queued.entry.accountScope, accountScope);
  }
  assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).entries.length, 2);
  const changedFingerprint = enqueueCalculatorRoutineCompletion(
    storage,
    signal({ mistakeTypes: ["rounding"] }),
    {
      now: NOW,
      queueId: "018f2f4a-7b2c-7d53-8a3f-1234567890ab",
      accountScope: ACCOUNT_SCOPE,
      autoSyncRegistered: true,
    },
  );
  assert.equal(changedFingerprint.status, "queued");
  assert.equal(changedFingerprint.deduped, false);
  assert.equal(changedFingerprint.queueSize, 3);
  assert.equal(
    enqueueCalculatorRoutineCompletion(storage, signal(), {
      now: NOW,
      queueId: "018f2f4a-7b2c-7d54-8a3f-1234567890ab",
      accountScope: "not-a-scope",
      autoSyncRegistered: true,
    }).status,
    "invalid",
  );
});

test("S232F.5 removes an entry only for a valid saved or deduped durable receipt", () => {
  for (const status of ["saved", "deduped"]) {
    const storage = new MemoryStorage();
    const queued = enqueueCalculatorRoutineCompletion(storage, signal(), {
      now: NOW,
      queueId: QUEUE_ID,
      accountScope: ACCOUNT_SCOPE,
      autoSyncRegistered: true,
    });
    assert.equal(queued.status, "queued");
    assert.ok(parseCalculatorRoutineDurableReceipt(receipt(status)));
    assert.equal(
      removeCalculatorRoutineOutboxEntry(storage, QUEUE_ID, receipt(status), NOW.getTime()),
      true,
    );
    assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).entries.length, 0);
  }

  for (const invalidReceipt of [
    null,
    { ...receipt(), ok: false },
    { ...receipt(), learningRecordSaved: false },
    { ...receipt(), learningRecordId: "record" },
    { ...receipt(), status: "deduped", deduped: false },
    { ...receipt(), status: "unknown" },
  ]) {
    const storage = new MemoryStorage();
    enqueueCalculatorRoutineCompletion(storage, signal(), {
      now: NOW,
      queueId: QUEUE_ID,
      accountScope: ACCOUNT_SCOPE,
      autoSyncRegistered: true,
    });
    assert.equal(
      removeCalculatorRoutineOutboxEntry(storage, QUEUE_ID, invalidReceipt, NOW.getTime()),
      false,
    );
    assert.equal(readCalculatorRoutineOutbox(storage, NOW.getTime()).entries.length, 1);
  }
});

test("S232F.5 registers mount, online, and cross-tab retries behind one writer and never queues 401/validation", () => {
  const sync = read("components/review-os/calculator-routine-sync-status.tsx");
  const outbox = read("lib/review-os/calculator-routine-outbox.ts");
  const consumers = [
    "components/review-os/calculator-workflow-page.tsx",
    "app/problem-snap/problem-snap-client.tsx",
    "app/answer-review/answer-review-client.tsx",
  ].map(read).join("\n");

  assert.match(sync, /window\.addEventListener\("online", onOnline\)/);
  assert.match(sync, /window\.addEventListener\("storage", onStorage\)/);
  assert.match(sync, /void flushOutbox\(\)/);
  assert.match(sync, /!window\.navigator\.onLine[\s\S]*?kind: "queued"/);
  assert.match(sync, /CALCULATOR_ROUTINE_OUTBOX_WEB_LOCK/);
  assert.match(sync, /if \(!lockManager\)[\s\S]*?status: "unavailable"/);
  assert.doesNotMatch(sync, /acquireFallbackLease|releaseFallbackLease|OUTBOX_LOCK_KEY/);
  assert.match(sync, /localSyncTail/);
  assert.match(sync, /AUTOMATIC_RETRY_DELAY_MS/);
  assert.match(sync, /visibilitychange/);
  assert.match(sync, /response\.status === 401[\s\S]*?return \{ kind: "auth" \}/);
  assert.match(sync, /response\.status === 400[\s\S]*?return \{ kind: "terminal" \}/);
  assert.match(sync, /delivered\.kind === "auth"[\s\S]*?kind: "auth"/);
  assert.match(sync, /delivered\.kind === "terminal"[\s\S]*?kind: "terminal"/);
  assert.match(sync, /eligibleEntries = read\.entries\.filter[\s\S]*?entry\.accountScope === accountScope/);
  assert.match(sync, /readAuthenticatedAccountScope/);
  assert.match(sync, /fetch\("\/api\/auth\/session"/);
  assert.match(sync, /removeCalculatorRoutineOutboxEntry[\s\S]*?delivered\.body/);
  assert.match(sync, /status === "offline" && offlineEvidence[\s\S]*?<FailureAwareState/);
  assert.match(sync, /window\.navigator\.onLine[\s\S]*?setStatus\("pending"\)/);
  assert.match(sync, /if \(lastSignal\)[\s\S]*?syncCompletion\(lastSignal\)[\s\S]*?flushOutbox\(\)/);
  assert.match(sync, /accountScopeRef\.current = null[\s\S]*?account_mismatch/);
  assert.match(sync, /document\.visibilityState !== "visible"[\s\S]*?invalidateAccountScope/);
  assert.match(sync, /window\.addEventListener\("blur", onBlur\)/);
  assert.match(sync, /!document\.hasFocus\(\)[\s\S]*?scope_unavailable/);
  assert.match(sync, /current === "offline" \|\| current === "pending" \|\| current === "syncing"/);
  assert.match(consumers, /offlineEvidence=\{calculatorRoutineSync\.offlineEvidence\}/);
  assert.doesNotMatch(outbox, /rawAnswerText|rawQuestionText|rawOcrText/);
  assert.doesNotMatch(sync, /console\.(?:log|warn|error)|request\.body|response\.body/);
});

test("S232F.5 derives every remote owner from the authenticated request and exposes no cross-account target", () => {
  const route = read("app/api/os/calculator-routine/complete/route.ts");
  const service = read("lib/review-os/service.ts");
  const signalContract = read("lib/review-os/calculator-routine.ts");
  const outbox = read("lib/review-os/calculator-routine-outbox.ts");

  assert.match(route, /const userId = await requireRequestUserId\(request\)/);
  assert.match(route, /completeCalculatorRoutine\(userId, session\.email, body\)/);
  assert.match(service, /completeCalculatorRoutine\(userId: string[\s\S]*?ensureAccess\(userId, email\)/);
  assert.match(service, /createLearningSignalEventWithId\([\s\S]*?userId,/);
  assert.doesNotMatch(signalContract, /(?:target|owner|account)UserId/);
  assert.doesNotMatch(outbox, /(?:target|owner|account)UserId/);
  assert.match(outbox, /accountScope/);
  assert.match(read("components/review-os/calculator-routine-sync-status.tsx"), /account_mismatch/);
});

test("S232F.5 registers exact-head, mutation-blocked, metadata-only runtime acceptance", () => {
  const spec = read("tests/e2e/s232f5-calculator-outbox.spec.ts");
  const workflow = read(".github/workflows/s232f5-runtime.yml");
  const doc = read("docs/qa/s232f5-calculator-completion-outbox.md");
  const runner = read("scripts/run-node-tests.mjs");

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232F\.5"/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /context\.route\("\*\*\/\*"/);
  assert.match(spec, /serverMutationRequestCount/);
  assert.match(spec, /accountScopeMismatchDenied: true/);
  assert.match(spec, /monitorPhasedRuntimeErrors/);
  assert.match(spec, /controlledOfflineConsoleErrorCount/);
  assert.match(spec, /controlledAuthFailureCount/);
  assert.match(workflow, /agent\/s232f5-calculator-outbox/);
  assert.match(workflow, /run-s232f5-auth-e2e/);
  assert.match(workflow, /tests\/e2e\/s232f5-calculator-outbox\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232F\.5 evidence/);
  assert.match(workflow, /controlledOfflineResourceFailureCount/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(doc, /metadata-only/i);
  assert.ok(runner.includes('"tests/s232f5-calculator-outbox.test.mjs"'));
});
