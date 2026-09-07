import assert from "node:assert/strict";
import test from "node:test";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { createPrivateSessionHttpHandler, PRIVATE_SESSION_MAX_REQUEST_BYTES } from "../lib/review-os/first-stage/runtime/session-http.ts";
import { OWNER, SUBMIT, BODY, EXPLANATION, reference, harness, start, submission } from "./fixtures/first-stage-private-session-harness.mjs";

test("private session initially reveals only question data, never reference assistance", async () => {
  const h = harness(); const ids = await start(h);
  const view = await h.service.view(OWNER, ids.sessionId);
  assert.equal(view.question.stem, BODY);
  assert.equal(view.explanation, null);
  assert.equal(h.counts.explanations, 0);
  assert.equal(JSON.stringify(view).includes(EXPLANATION), false);
  assert.equal(view.masteryClaim, false);
  assert.equal(view.transferEvidence, false);
});

test("durable submission survives a new service instance and preserves the exact D+1", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  const saved = await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  const reopened = harness({ rows: h.rows });
  const view = await reopened.service.view(OWNER, ids.sessionId);
  assert.equal(view.explanation.text, EXPLANATION);
  assert.equal(view.attempt.decision, "incorrect");
  assert.equal(view.reviewTasks.length, 1);
  assert.equal(view.reviewTasks[0].dueAt, "2026-09-07T10:01:00.000Z");
  assert.equal(saved.state.attempts[0].submission.submittedAt, SUBMIT);
  assert.equal(saved.state.attempts[0].submission.elapsedTime.milliseconds, 60_000);
  const persisted = JSON.stringify([...h.rows.values()]);
  assert.equal(persisted.includes(BODY), false);
  assert.equal(persisted.includes(EXPLANATION), false);
});

test("failed persistence constructs and discloses no assistance; later retry completes", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT); h.failNextWrite();
  await assert.rejects(h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId)), /synthetic-storage-failure/u);
  assert.equal(h.counts.explanations, 0);
  assert.equal((await h.service.view(OWNER, ids.sessionId)).explanation, null);
  await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  assert.equal((await h.service.view(OWNER, ids.sessionId)).explanation.text, EXPLANATION);
  assert.equal(h.counts.creates, 1);
  assert.equal(h.counts.replaces, 2);
});

test("identical concurrent and completed retries create one session, attempt and Queue task", async () => {
  const h = harness();
  const creates = await Promise.all([1, 2].map(() => h.service.create(OWNER,
    { requestId: "create-1", questionId: reference().questionId })));
  assert.equal(creates[0].sessionId, creates[1].sessionId);
  const ids = await start(h); h.setClock(SUBMIT);
  const results = await Promise.all([1, 2].map(() => h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId))));
  assert.deepEqual(results[0], results[1]);
  h.setClock("2026-09-09T10:00:00.000Z");
  const retried = await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  assert.deepEqual(retried, results[0]);
  assert.equal(retried.state.reviewTasks.length, 1);
  assert.equal(retried.state.attempts.length, 1);
  assert.equal(h.counts.creates, 1);
  assert.equal(h.counts.replaces, 2);
});

test("changed request identity, wrong Owner, stale commands and catalog drift fail closed", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  await assert.rejects(h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId, 2)), { code: "invalid_transition" });
  await assert.rejects(h.service.view("synthetic-owner-b", ids.sessionId), { code: "not_found" });
  await assert.rejects(h.service.execute(OWNER, ids.sessionId, { ...submission(ids.attemptId), requestId: "another-command" }), { code: "stale_state" });
  const drift = harness({ rows: h.rows, catalogDigest: digest("different-catalog") });
  await assert.rejects(drift.service.view(OWNER, ids.sessionId), { code: "adapter_mismatch" });
});

test("client clocks and evaluation authority are rejected rather than sealed", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  for (const field of ["submittedAt", "elapsedTime", "correctChoice", "evaluation", "rightsState"]) {
    const request = submission(ids.attemptId); request.submission[field] = "client-authority";
    await assert.rejects(h.service.execute(OWNER, ids.sessionId, request), { code: "invalid_input" });
  }
  assert.equal(h.counts.explanations, 0);
  assert.equal(h.counts.replaces, 1);
});

test("D+1 retry uses the kernel lineage and old save retries cannot reopen completed review", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  const first = await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  const task = first.state.reviewTasks[0];
  const retryCommand = { action: "retry", requestId: "retry-1", expectedRevision: 3, reviewTaskId: task.reviewTaskId };
  await assert.rejects(h.service.execute(OWNER, ids.sessionId, retryCommand));
  h.setClock(task.dueAt);
  const retry = await h.service.execute(OWNER, ids.sessionId, retryCommand);
  assert.equal(retry.state.attempts.at(-1).kind, "independent_retry");
  assert.notEqual(retry.state.attempts.at(-1).questionReference.questionId, reference().questionId);
  assert.equal((await h.service.view(OWNER, ids.sessionId)).explanation, null);
  h.setClock("2026-09-07T10:02:00.000Z");
  const completeCommand = { ...submission(retry.state.attempts.at(-1).attemptId, 2),
    requestId: "submit-retry-1", expectedRevision: 4 };
  const completed = await h.service.execute(OWNER, ids.sessionId, completeCommand);
  assert.equal(completed.state.reviewTasks.length, 1);
  assert.equal(completed.state.reviewTasks[0].status, "completed");
  assert.equal(completed.state.reviewTasks[0].dueAt, task.dueAt);
  const replayed = await h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId));
  assert.deepEqual(replayed, completed);
  const view = await h.service.view(OWNER, ids.sessionId);
  assert.equal(view.reviewTasks[0].status, "completed");
  assert.equal(view.masteryClaim, false);
  assert.equal(view.transferEvidence, false);
});

test("different concurrent submissions cannot both replace the same durable revision", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  const results = await Promise.allSettled([
    h.service.execute(OWNER, ids.sessionId, submission(ids.attemptId)),
    h.service.execute(OWNER, ids.sessionId, { ...submission(ids.attemptId, 2), requestId: "different-submit" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "stale_state");
  assert.equal(h.counts.replaces, 2);
  const view = await h.service.view(OWNER, ids.sessionId);
  assert.equal(view.reviewTasks.length, 1);
});

function httpHarness(h, ownerId = OWNER) {
  let serviceLoads = 0;
  const handler = createPrivateSessionHttpHandler({
    requireOwner: async () => ownerId,
    service: async () => { serviceLoads++; return h.service; },
  });
  const request = (body, headers = {}) => new Request("https://private.example.invalid/sessions", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { handler, request, loads: () => serviceLoads,
    post: (body, headers) => handler(request(body, headers)) };
}

test("HTTP command flow returns only durable projections and reconnects without exposing state", async () => {
  const h = harness(); const http = httpHarness(h);
  const created = await http.post({ action: "create", requestId: "create-http", questionId: reference().questionId });
  assert.equal(created.status, 200);
  const first = await created.json();
  assert.equal(first.view.explanation, null);
  assert.equal(first.view.question, null);
  const sessionId = first.view.sessionId;
  const begun = await http.post({ sessionId, command: { action: "begin", requestId: "begin-http",
    expectedRevision: 1, questionId: reference().questionId } });
  const view = (await begun.json()).view;
  assert.equal(view.question.stem, BODY);
  assert.equal(view.explanation, null);
  h.setClock(SUBMIT);
  const saved = await http.post({ sessionId, command: submission(view.attempt.attemptId) });
  assert.equal(saved.status, 200);
  assert.match(saved.headers.get("cache-control"), /private, no-store/u);
  const savedText = await saved.text();
  assert.equal(savedText.includes(EXPLANATION), true);
  for (const privateKey of ["commands", "requestDigest", "catalogDigest", "evidenceEnvelope"]) {
    assert.equal(savedText.includes(`\"${privateKey}\"`), false);
  }
  const reconnected = httpHarness(harness({ rows: h.rows }));
  const reopened = await reconnected.handler(new Request(`https://private.example.invalid/sessions?sessionId=${sessionId}`));
  assert.equal(await reopened.text(), savedText);
  assert.equal(h.counts.creates, 1);
});

test("HTTP persistence failure never serializes assistance or exception data and retry is idempotent", async () => {
  const h = harness(); const ids = await start(h); h.setClock(SUBMIT);
  const http = httpHarness(h); h.failNextWrite();
  const command = { sessionId: ids.sessionId, command: submission(ids.attemptId) };
  const failed = await http.post(command);
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok: false, error: "temporarily_unavailable" });
  assert.equal(h.counts.explanations, 0);
  const saved = await http.post(command);
  const replay = await http.post(command);
  assert.equal(saved.status, 200);
  assert.equal(await saved.text(), await replay.text());
  assert.equal(h.counts.replaces, 2);
});

test("HTTP denied Owner and cross-origin requests never consume a body or load service", async () => {
  const h = harness(); const denied = httpHarness(h, null);
  const request = denied.request("PRIVATE_INVALID_BODY");
  const result = await denied.handler(request);
  assert.equal(result.status, 404);
  assert.equal(request.bodyUsed, false);
  assert.equal(denied.loads(), 0);
  const allowed = httpHarness(h);
  for (const headers of [{ origin: "https://attacker.invalid" }, { "sec-fetch-site": "cross-site" }]) {
    const request = allowed.request("PRIVATE_INVALID_BODY", headers);
    assert.equal((await allowed.handler(request)).status, 404);
    assert.equal(request.bodyUsed, false);
  }
  assert.equal(allowed.loads(), 0);
});

test("HTTP actual byte bound distinguishes exact limit and limit-plus-one despite misleading lengths", async () => {
  const h = harness(); const http = httpHarness(h);
  const json = JSON.stringify({ action: "create", requestId: "byte-limit", questionId: reference().questionId });
  const exact = json.padEnd(PRIVATE_SESSION_MAX_REQUEST_BYTES, " ");
  for (const length of [undefined, "invalid", "0", "1"]) {
    const headers = length === undefined ? {} : { "content-length": length };
    assert.equal((await http.post(exact, headers)).status, 200);
    const before = http.loads();
    const oversized = await http.post(exact + " ", headers);
    assert.equal(oversized.status, 413);
    assert.equal(http.loads(), before);
    assert.deepEqual(await oversized.json(), { ok: false, error: "request_too_large" });
  }
  assert.equal(h.counts.creates, 1);
});

test("HTTP fragmented multibyte overflow cancels immediately before service or JSON parsing", async () => {
  const h = harness(); const http = httpHarness(h);
  let cancelled = false; let pulls = 0;
  const chunk = new TextEncoder().encode("한".repeat(3_000));
  const body = new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(chunk); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request("https://private.example.invalid/sessions", {
    method: "POST", body, duplex: "half", headers: { "content-type": "application/json", "content-length": "1" },
  });
  const result = await http.handler(request);
  assert.equal(result.status, 413);
  assert.equal(cancelled, true);
  assert.equal(pulls, 2);
  assert.equal(http.loads(), 0);
  assert.equal((await result.text()).includes("한"), false);
});

test("HTTP rejects duplicate fields, authority injection and ambiguous read targets", async () => {
  const h = harness(); const http = httpHarness(h);
  for (const body of [
    '{"action":"create","action":"create","requestId":"a","questionId":"b"}',
    { action: "create", requestId: "a", questionId: reference().questionId, rightsState: "verified_cleared" },
  ]) assert.equal((await http.post(body)).status, 400);
  for (const query of ["", "?sessionId=a&sessionId=b", "?sessionId=a&ownerId=b"]) {
    assert.equal((await http.handler(new Request(`https://private.example.invalid/sessions${query}`))).status, 400);
  }
  assert.equal(http.loads(), 0);
});
