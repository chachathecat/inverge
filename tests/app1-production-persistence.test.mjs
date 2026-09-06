import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { memoryTransport, productionHarness, OWNER_ID, NOW, RAW_MARKER } from "./fixtures/app1-production-persistence-harness.mjs";

function assertSaved(store, result, count) {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const item = result.body.item;
  const plan = item.rawPayload.app1_post_insert_replay_v1;
  assert.equal(plan.queue.scheduleInput.nextReviewDateOverride, "2026-09-07");
  const queue = store.tables.review_queue_items.find(row => row.id === plan.queueId);
  assert.equal(queue.derived_payload.recurrenceCount, count);
  assert.equal(queue.derived_payload.reviewUnitRecurrenceCount, 1);
  assert.equal(queue.raw_payload.dueAt, "2026-09-07T00:00:00.000Z");
  const journey = store.tables.learning_signal_events.find(row => row.source_type === "app1_c3r_handoff" && row.metadata_json.itemId === item.id);
  assert.equal(journey.metadata_json.d1DueAt, queue.raw_payload.dueAt);
  assert.equal(journey.metadata_json.masteryCreated, false);
  assert.equal(journey.metadata_json.transferCreated, false);
  assert.equal(JSON.stringify([queue.derived_payload, journey.metadata_json]).includes(RAW_MARKER), false);
  return plan;
}

test("production APP-1 preserves topic history and completes each repair's first D+1", async () => {
  const store = memoryTransport();
  const app = productionHarness(store.execute);
  const first = await app.save(await app.command("first"));
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const command = await app.command("second");
  const second = await app.save(command);
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.item.derivedPayload.recurrenceCount, 2);
  assert.equal(store.tables.recurrence_features[0].recurrence_count, 2);
  assert.equal(store.tables.review_queue_items.length, 2);
  assert.equal(store.tables.learning_signal_events.filter(r => r.source_type === "app1_c3r_handoff").length, 2);
  const again = await app.save(command);
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(again.body.item.id, second.body.item.id);
  assert.equal(again.body.app1C3rHandoff.reviewUnit.dueAt, "2026-09-07T00:00:00.000Z");
  assertSaved(store, second, 2);
  const third = await app.save(await app.command("third"));
  assertSaved(store, third, 3);
  // Later topic history must not mutate the earlier saved schedule snapshot.
  const originalRetry = await app.save(command);
  assertSaved(store, originalRetry, 2);
  assert.equal(store.tables.recurrence_features[0].recurrence_count, 3);
});

for (const failureTable of ["wrong_answer_items", "review_queue_items", "learning_signal_events"]) {
  for (const retryAt of [NOW, "2026-09-08T10:00:00.000Z"]) {
  test(`production retry at ${retryAt} resumes after durable ${failureTable} with existing history`, async () => {
    const store = memoryTransport();
    const app = productionHarness(store.execute);
    assertSaved(store, await app.save(await app.command("prior")), 1);
    let interrupted = false;
    const failing = productionHarness(store.execute, { afterQuery(q, result) {
      if (!interrupted && q.table === failureTable && q.operation === "insert" && !result.error) {
        interrupted = true; throw new Error("synthetic-response-lost-after-durable-write");
      }
    } });
    const command = await failing.command(failureTable);
    const failed = await failing.save(command);
    assert.equal(failed.status, 500);
    assert.equal(interrupted, true);
    const retryApp = productionHarness(store.execute, { now: retryAt });
    const retry = await retryApp.save(command);
    assertSaved(store, retry, 2);
    const snapshot = structuredClone(store.tables);
    assertSaved(store, await retryApp.save(command), 2);
    assert.deepEqual(store.tables, snapshot);
    assert.equal(store.tables.wrong_answer_items.length, 3); // source + two repairs
    assert.equal(store.tables.review_queue_items.length, 2);
    assert.equal(store.tables.learning_signal_events.length, 4); // signal + journey per repair
    assert.equal(new Set(store.tables.usage_events.map(row => row.id)).size, store.tables.usage_events.length);
  });
  }
}

test("same-request concurrency coalesces locally and reuses the database winner across workers", async () => {
  for (const independentWorkers of [false, true]) {
    const store = memoryTransport();
    const app = productionHarness(store.execute);
    assertSaved(store, await app.save(await app.command("prior")), 1);
    const command = await app.command("concurrent");
    const peer = independentWorkers ? productionHarness(store.execute, { now: "2026-09-06T10:00:01.000Z" }) : app;
    const results = await Promise.all([app.save(command), peer.save(command)]);
    for (const result of results) assertSaved(store, result, 2);
    assert.equal(results[0].body.item.id, results[1].body.item.id);
    assert.equal(store.tables.wrong_answer_items.length, 3);
    assert.equal(store.tables.review_queue_items.length, 2);
    assert.equal(store.tables.learning_signal_events.length, 4);
    assert.equal(store.tables.recurrence_features[0].recurrence_count, 2);
  }
});

test("an old sealed item-only plan recovers without resetting cumulative evidence", async () => {
  const store = memoryTransport();
  const app = productionHarness(store.execute);
  assertSaved(store, await app.save(await app.command("prior")), 1);
  let stopped = false;
  const failing = productionHarness(store.execute, { afterQuery(q, result) {
    if (!stopped && q.table === "wrong_answer_items" && q.operation === "insert" && !result.error) {
      stopped = true; throw new Error("synthetic-old-item-only-failure");
    }
  } });
  const command = await app.command("legacy");
  assert.equal((await failing.save(command)).status, 500);
  const row = store.tables.wrong_answer_items.at(-1);
  const plan = row.raw_payload.app1_post_insert_replay_v1;
  delete plan.queue.scheduleInput.reviewUnitRecurrenceCount;
  const stable = value => value && typeof value === "object" ? Array.isArray(value)
    ? `[${value.map(stable).join(",")}]` : `{${Object.keys(value).sort().map(k => JSON.stringify(k)+":"+stable(value[k])).join(",")}}` : JSON.stringify(value);
  const material = { ...plan };
  delete material.planDigest;
  delete material.planSeal;
  plan.planDigest = "sha256:" + crypto.createHash("sha256").update(stable(material)).digest("hex");
  plan.planSeal = app.authority.sealApp1PostInsertReplayPlan(plan.planDigest);
  assertSaved(store, await app.save(command), 2);
});

test("production replay rejects client schedules and item/plan/Queue/journey drift", async () => {
  const store = memoryTransport();
  const app = productionHarness(store.execute);
  const command = await app.command();
  assert.equal((await app.save({ ...command, nextReviewDate: "2026-09-07" })).status, 400);
  assert.equal(store.tables.review_queue_items.length, 0);
  const saved = await app.save(command);
  assertSaved(store, saved, 1);
  const base = structuredClone(store.tables);
  const mutations = [
    tables => { tables.review_queue_items[0].raw_payload.dueAt = NOW; },
    tables => { tables.review_queue_items[0].raw_payload.dueAt = "2026-09-08T00:00:00.000Z"; },
    tables => { tables.review_queue_items[0].derived_payload.reviewUnitRecurrenceCount = 2; },
    tables => { tables.review_queue_items[0].subject_id = "감정평가실무"; },
    tables => { tables.review_queue_items[0].source_submission_id = OWNER_ID; },
    tables => { tables.wrong_answer_items[1].raw_payload.app1_post_insert_replay_v1.workRevisionId = OWNER_ID; },
    tables => { tables.wrong_answer_items[1].raw_payload.app1_post_insert_replay_v1.queueId = OWNER_ID; },
    tables => { tables.learning_signal_events.find(row => row.source_type === "app1_c3r_handoff").metadata_json.c3rRoute = "/app/c3r-l"; },
  ];
  for (const mutate of mutations) {
    Object.assign(store.tables, structuredClone(base));
    mutate(store.tables);
    const failure = await app.save(command);
    assert.equal(failure.status, 500, JSON.stringify(failure.body));
    assert.equal(store.tables.review_queue_items.length, 1);
    assert.equal(store.tables.learning_signal_events.length, 2);
  }
});

test("ordinary review policy still uses accumulated history", () => {
  const app = productionHarness(memoryTransport().execute);
  const scheduler = app.load("lib/review-os/scheduling");
  const input = { mode: "second", isCorrect: false, confidence: "낮음", mistakeType: "개념 부족", recurrenceCount: 3, now: new Date(NOW) };
  const ordinary = scheduler.resolveReviewSchedule(input);
  assert.equal(ordinary.policy, "wrong_repeated_retry_today_review_2d");
  assert.equal(ordinary.retryDueAt, NOW);
  assert.equal(ordinary.followUpReviewAt, "2026-09-08T10:00:00.000Z");
  const app1 = scheduler.resolveApp1FirstRecurrenceD1Schedule({ ...input, nextReviewDateOverride: null, reviewUnitRecurrenceCount: 1 });
  assert.equal(app1.dueAt, "2026-09-07T00:00:00.000Z");
  assert.equal(input.recurrenceCount, 3);
  assert.throws(() => scheduler.resolveApp1FirstRecurrenceD1Schedule({ ...input, nextReviewDateOverride: null, reviewUnitRecurrenceCount: 2 }), /first-recurrence-required/);
});
