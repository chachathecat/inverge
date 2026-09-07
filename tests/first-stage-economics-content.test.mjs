import assert from "node:assert/strict";
import test from "node:test";
import * as content from "../lib/review-os/first-stage/runtime/economics-content.ts";
import path from "node:path";
const { loadEconomicsContent } = content;
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { economicsPacket, syntheticContentInput, economicsCatalog, CONTENT_EXPLANATION } from "./fixtures/first-stage-economics-content-harness.mjs";
import { privateRoute, compilePrivateSource } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness, reference, submission, SUBMIT, OWNER, start } from "./fixtures/first-stage-private-session-harness.mjs";

const URL = "http://127.0.0.1/api/review-os/first-stage/sessions";
const post = body => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("actual server file reader bounds growing input and closes handles; empty installed registry never reads", async () => {
  for (const size of [content.ECONOMICS_CONTENT_MAX_BYTES, content.ECONOMICS_CONTENT_MAX_BYTES + 1]) {
    let read = 0, closed = 0, opened = 0;
    const reader = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
      "server-only": {}, "node:path": { default: path }, "./economics-content": content,
      "node:fs/promises": { async open() { opened++; return {
        async stat() { return { isFile: () => true, size: 0 }; }, // file grows after stat
        async read(buffer) { const bytesRead = Math.min(buffer.length, size - read); read += bytesRead; return { bytesRead }; },
        async close() { closed++; },
      }; } },
    });
    assert.equal(await reader.loadApprovedPrivateFirstStageCatalog(), null); assert.equal(opened, 0);
    const outside = path.resolve(process.cwd(), "..", "synthetic-private-reader.json");
    if (size > content.ECONOMICS_CONTENT_MAX_BYTES) await assert.rejects(reader.readPrivateEconomicsContent(outside), /private_content_unavailable/u);
    else assert.equal((await reader.readPrivateEconomicsContent(outside)).length, size);
    assert.equal(read, size); assert.equal(closed, 1);
    await assert.rejects(reader.readPrivateEconomicsContent(path.join(process.cwd(), "synthetic-inside.json")), /private_content_unavailable/u);
    assert.equal(opened, 1);
  }
});

test("real loader denies missing/partial approval and never upgrades synthetic receipts in runtime", async () => {
  let reads = 0;
  assert.equal(await loadEconomicsContent({ approvals: [], readBytes: async () => { reads++; return new Uint8Array(); } }), null);
  assert.equal(reads, 0);
  const input = syntheticContentInput();
  assert.equal(await loadEconomicsContent({ ...input, expectedDataClass: undefined }), null);
  input.approvals[0].checks.pop();
  assert.equal(await loadEconomicsContent(input), null);
});

test("real loader binds exact version, choices, distinct original/retry key and practice-only lineage", async () => {
  const stale = syntheticContentInput(), changed = economicsPacket();
  changed.questions[0].reference.questionVersion = "changed-version";
  assert.equal(await loadEconomicsContent({ ...stale, readBytes: async () => Buffer.from(JSON.stringify(changed)) }), null);
  for (const mutate of [
    p => { p.questions[0].reference.questionVersion = "changed-version"; },
    p => { p.keys[0].correctChoice = 3; },
    p => { p.questions[0].choices.reverse(); },
    p => { p.questions[1].sourceQuestionId = "missing-source"; },
    p => { p.keys[1].authority = "original_final_key"; },
    p => { p.keys[1].evidence = p.keys[0].evidence; },
    p => { p.authority = "VERIFIED_TRANSFER"; },
    p => { p.dataClass = "human_reviewed_private"; },
    p => { p.questions[0].rightsApproved = true; },
  ]) {
    const packet = economicsPacket(); mutate(packet);
    assert.equal(await loadEconomicsContent(syntheticContentInput(packet)), null);
  }
  assert.equal(await loadEconomicsContent({ ...stale, readBytes: async () => Buffer.alloc(2 * 1024 * 1024 + 1) }), null);
});

test("actual HTTP route blocks invalid catalog before body/storage; client authority cannot replace server evidence", async () => {
  const packet = economicsPacket(); packet.keys[0].correctChoice = 4;
  for (const input of [syntheticContentInput(packet), { ...syntheticContentInput(), approvals: [] }]) {
    const route = privateRoute(harness(), { contentInput: input });
    const request = post({ action: "create", requestId: "x", questionId: reference().questionId, approved: true });
    const response = await route.POST(request);
    assert.equal(response.status, 503); assert.equal(request.bodyUsed, false); assert.equal(route.counts.repository, 0);
    assert.doesNotMatch(await response.text(), /SYNTHETIC_PRIVATE|correctChoice/u);
  }
  const route = privateRoute(harness());
  const denied = await route.POST(post({ action: "create", requestId: "x", questionId: reference().questionId,
    rightsState: "verified_owner_private", reviewed: true }));
  assert.equal(denied.status, 400);
});

test("real loader/adapter HTTP path exposes assistance only after durable save, including simultaneous retry and reconnect", async () => {
  const h = harness({ catalog: economicsCatalog }), route = privateRoute(h);
  const create = { action: "create", requestId: "loader-create", questionId: reference().questionId };
  const initial = await Promise.all([route.POST(post(create)), route.POST(post(create))]);
  const created = await initial[0].json();
  assert.deepEqual(await initial[1].json(), created); assert.equal(h.rows.size, 1);
  assert.equal(created.view.explanation, null);
  const sessionId = created.view.sessionId;
  const begun = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "loader-begin",
    expectedRevision: 1, questionId: reference().questionId } }))).json();
  assert.doesNotMatch(JSON.stringify(begun), /SYNTHETIC_PRIVATE_EXPLANATION|SYNTHETIC_CHOICE_EXPLANATION|correctChoice/u);
  h.setClock(SUBMIT); h.failNextWrite();
  const submit = { sessionId, command: submission(begun.view.attempt.attemptId) };
  const failed = await route.POST(post(submit));
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /EXPLANATION/u);
  const saved = await Promise.all([route.POST(post(submit)), route.POST(post(submit))]);
  const completed = await saved[0].json();
  assert.deepEqual(await saved[1].json(), completed);
  assert.equal(completed.view.explanation.text, CONTENT_EXPLANATION);
  const reopened = privateRoute(harness({ rows: h.rows }));
  assert.deepEqual(await (await reopened.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), completed);
  const drift = economicsPacket(); drift.questions[0].easyExplanation = "changed synthetic feedback";
  const changed = privateRoute(h, { contentInput: syntheticContentInput(drift) });
  const staleResponse = await changed.GET(new Request(`${URL}?sessionId=${sessionId}`));
  assert.equal(staleResponse.status, 503);
  assert.deepEqual(await staleResponse.json(), { ok: false, error: "temporarily_unavailable" });
  assert.equal(h.rows.size, 1); assert.equal(h.counts.replaces, 2);
  assert.doesNotMatch(JSON.stringify([...h.rows.values()]), /SYNTHETIC_PRIVATE_EXPLANATION|SYNTHETIC_PRIVATE_ECONOMICS_BODY/u);
});

test("real economics adapter uses finite deterministic practice retry stock and its own key; never fabricates another", async () => {
  const h = harness({ catalog: economicsCatalog }), { sessionId, attemptId } = await start(h);
  h.setClock(SUBMIT);
  let state = await h.service.execute(OWNER, sessionId, submission(attemptId));
  const task = state.state.reviewTasks[0];
  for (let index = 0; index < 2; index++) {
    h.setClock(state.state.reviewTasks[0].dueAt);
    const command = { action: "retry", requestId: `finite-${index}`, expectedRevision: state.state.revision, reviewTaskId: task.reviewTaskId };
    const retry = await Promise.all([h.service.execute(OWNER, sessionId, command), h.service.execute(OWNER, sessionId, command)]);
    assert.deepEqual(retry[0], retry[1]);
    const current = retry[0].state.attempts.at(-1);
    assert.equal(current.questionReference.questionId, `synthetic-economics-retry-${index + 1}`);
    h.setClock(new Date(Date.parse(h.getClock()) + 60_000).toISOString());
    state = await h.service.execute(OWNER, sessionId, { ...submission(current.attemptId), requestId: `finite-submit-${index}`,
      expectedRevision: retry[0].state.revision });
    assert.notEqual(state.state.attempts.at(-1).evaluation.evidenceEnvelope.officialKeyReference.evidenceSha256,
      state.state.attempts[0].evaluation.evidenceEnvelope.officialKeyReference.evidenceSha256);
  }
  h.setClock(state.state.reviewTasks[0].dueAt);
  const before = digest([...h.rows.values()]);
  await assert.rejects(h.service.execute(OWNER, sessionId, { action: "retry", requestId: "finite-exhausted",
    expectedRevision: state.state.revision, reviewTaskId: task.reviewTaskId }), { code: "adapter_unavailable" });
  assert.equal(digest([...h.rows.values()]), before);
  const view = await h.service.view(OWNER, sessionId);
  assert.equal(view.reviewTasks[0].status, "pending");
  assert.equal(view.reviewTasks[0].retryAvailability, "exhausted");
  assert.equal(view.masteryClaim, false); assert.equal(view.transferEvidence, false);
});

test("modified practice question is graded by its different reviewed answer, not the original key", async () => {
  const packet = economicsPacket();
  packet.questions[1].correctChoice = 4;
  packet.questions[1].feedback.incorrectCauseByChoice = ["C", "C", "C", null, "C"];
  packet.keys[1].correctChoice = 4;
  const catalog = await loadEconomicsContent(syntheticContentInput(packet)); assert.ok(catalog);
  const h = harness({ catalog }), { sessionId, attemptId } = await start(h);
  h.setClock(SUBMIT);
  const saved = await h.service.execute(OWNER, sessionId, submission(attemptId));
  h.setClock(saved.state.reviewTasks[0].dueAt);
  const retry = await h.service.execute(OWNER, sessionId, { action: "retry", requestId: "own-key-retry",
    expectedRevision: 3, reviewTaskId: saved.state.reviewTasks[0].reviewTaskId });
  h.setClock(new Date(Date.parse(h.getClock()) + 60_000).toISOString());
  const completed = await h.service.execute(OWNER, sessionId, { ...submission(retry.state.attempts.at(-1).attemptId, 4),
    requestId: "own-key-submit", expectedRevision: 4 });
  assert.equal(completed.state.attempts.at(-1).evaluation.decision, "correct");
  assert.equal(completed.state.reviewTasks[0].status, "completed");
});

test("actual HTTP retry eligibility uses server due time; early/stale client attempts cannot open a retry", async () => {
  const h = harness({ catalog: economicsCatalog }), route = privateRoute(h);
  const { sessionId, attemptId } = await start(h);
  h.setClock(SUBMIT);
  await h.service.execute(OWNER, sessionId, submission(attemptId));
  const get = async () => (await (await route.GET(new Request(`${URL}?sessionId=${sessionId}`))).json()).view;
  const initial = await get(), task = initial.reviewTasks[0];
  assert.equal(task.canStartRetry, false); assert.equal(task.retryAvailability, "available");
  h.setClock(new Date(Date.parse(task.dueAt) - 1).toISOString());
  assert.equal((await get()).reviewTasks[0].canStartRetry, false);
  const retry = { sessionId, command: { action: "retry", requestId: "due-boundary",
    expectedRevision: 3, reviewTaskId: task.reviewTaskId } };
  assert.equal((await route.POST(post(retry))).status, 409);
  assert.deepEqual(await get(), initial); // saved reference and pending state are preserved
  h.setClock(task.dueAt);
  assert.equal((await get()).reviewTasks[0].canStartRetry, true);
  const started = await (await route.POST(post(retry))).json();
  assert.equal(started.view.reviewTasks[0].status, "retry_active");
  assert.equal(started.view.reviewTasks[0].canStartRetry, false);
  assert.deepEqual(await (await route.POST(post(retry))).json(), started);
});
