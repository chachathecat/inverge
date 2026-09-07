import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAccountingContent } from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import { loadEconomicsContent } from "../lib/review-os/first-stage/runtime/economics-content.ts";
import { accountingPacket, syntheticAccountingInput, accountingCatalog } from "./fixtures/first-stage-accounting-content-harness.mjs";
import { economicsPacket, syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
const URL = "http://127.0.0.1/api/review-os/first-stage/accounting/sessions";
const QUESTION = "synthetic-accounting-q1";
const post = body => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const route = (h, options = {}) => privateRoute(h, { ...options, subject: "accounting" });

test("accounting uses the same strict loader without importing economics authority or synthetic approvals into runtime", async () => {
  let reads = 0;
  assert.equal(await loadAccountingContent({ approvals: [], readBytes: async () => { reads++; return new Uint8Array(); } }), null);
  assert.equal(reads, 0);
  assert.equal(await loadAccountingContent({ ...syntheticAccountingInput(), expectedDataClass: undefined }), null);
  assert.equal(await loadAccountingContent(syntheticContentInput(economicsPacket())), null);
  assert.equal(await loadEconomicsContent(syntheticAccountingInput()), null);
  const stale = syntheticAccountingInput(), changed = accountingPacket();
  changed.version = "changed-version";
  assert.equal(await loadAccountingContent({ ...stale, readBytes: async () => Buffer.from(JSON.stringify(changed)) }), null);
  for (const mutate of [
    packet => { packet.questions[0].reference.subjectId = "economics_principles"; },
    packet => { packet.questions[1].reference.subjectId = "economics_principles"; },
    packet => { packet.questions[0].reference.questionVersion = "changed-version"; },
    packet => { packet.keys[0].correctChoice = 5; },
    packet => { packet.keys[1].evidence = packet.keys[0].evidence; },
    packet => { packet.questions[1].sourceQuestionId = "synthetic-economics-q1"; },
    packet => { packet.authority = "MEASUREMENT"; },
    packet => { packet.questions[0].rightsApproved = true; },
  ]) {
    const packet = accountingPacket(); mutate(packet);
    assert.equal(await loadAccountingContent(syntheticAccountingInput(packet)), null);
  }
  const partial = syntheticAccountingInput(); partial.approvals[0].checks.pop();
  assert.equal(await loadAccountingContent(partial), null);
});

test("actual accounting HTTP denies OFF, unauthenticated, non-Owner and Production before body or storage", async () => {
  for (const options of [
    { environment: {} },
    { environment: { ...ENVIRONMENT, INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "false" } },
    { session: { isAuthenticated: false } },
    { session: { isAuthenticated: true, userId: "other", email: "other@example.test" } },
    { environment: { ...ENVIRONMENT, VERCEL_ENV: "production" } },
    { environment: { ...ENVIRONMENT, NODE_ENV: "production", VERCEL_ENV: undefined } },
  ]) {
    const r = route(harness(), options), request = post({ action: "create", requestId: "denied", questionId: QUESTION });
    const response = await r.POST(request);
    assert.equal(response.status, 404); assert.equal(request.bodyUsed, false);
    assert.equal(r.counts.catalog, 0); assert.equal(r.counts.repository, 0);
    assert.match(response.headers.get("cache-control"), /no-store/u);
  }
  const absent = route(harness(), { noCatalog: true });
  assert.equal((await (await absent.GET(new Request(URL))).json()).availability.state, "blocked");
  const blocked = post({ action: "create", requestId: "blocked", questionId: QUESTION });
  assert.equal((await absent.POST(blocked)).status, 503); assert.equal(blocked.bodyUsed, false);
  const allowed = route(harness());
  assert.equal((await allowed.POST(post({ action: "create", requestId: "fake", questionId: QUESTION, approved: true }))).status, 400);
  assert.equal((await allowed.POST(new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(16_385) }))).status, 413);
});

test("actual accounting route persists before disclosure, resumes failed save, reopens and rejects cross-subject sessions", async () => {
  const h = harness({ catalog: accountingCatalog }), r = route(h);
  const create = { action: "create", requestId: "accounting-create", questionId: QUESTION };
  const initial = await Promise.all([r.POST(post(create)), r.POST(post(create))]);
  const first = await initial[0].json(); assert.deepEqual(await initial[1].json(), first);
  const sessionId = first.view.sessionId; assert.equal(h.rows.size, 1);
  assert.equal(first.view.explanation, null);
  const begin = await (await r.POST(post({ sessionId, command: { action: "begin", requestId: "accounting-begin", expectedRevision: 1, questionId: QUESTION } }))).json();
  assert.equal(begin.view.question.stem, "SYNTHETIC_PRIVATE_ACCOUNTING_BODY");
  assert.doesNotMatch(JSON.stringify(begin), /EXPLANATION|correctChoice/u);
  h.setClock(SUBMIT); h.failNextWrite();
  const submit = { sessionId, command: submission(begin.view.attempt.attemptId) };
  const failed = await r.POST(post(submit)); assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /EXPLANATION/u);
  const successful = await Promise.all([r.POST(post(submit)), r.POST(post(submit))]);
  const saved = await successful[0].json(); assert.deepEqual(await successful[1].json(), saved);
  assert.match(saved.view.explanation.text, /SYNTHETIC_PRIVATE_ACCOUNTING_EXPLANATION/u);
  assert.equal(saved.view.reviewTasks[0].dueAt, "2026-09-07T10:01:00.000Z");
  const reopened = route(harness({ rows: h.rows, catalog: accountingCatalog }));
  assert.deepEqual(await (await reopened.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  const wrongSubject = privateRoute(harness({ rows: h.rows }));
  const denied = await wrongSubject.GET(new Request(`${URL}?sessionId=${sessionId}`));
  assert.equal(denied.status, 503); assert.doesNotMatch(await denied.text(), /ACCOUNTING|EXPLANATION/u);
  const drift = accountingPacket(); drift.questions[0].easyExplanation += " changed";
  assert.equal((await route(h, { contentInput: syntheticAccountingInput(drift) }).GET(new Request(`${URL}?sessionId=${sessionId}`))).status, 503);
  assert.equal(h.rows.size, 1); assert.equal(h.counts.replaces, 2);
  assert.doesNotMatch(JSON.stringify([...h.rows.values()]), /SYNTHETIC_PRIVATE_ACCOUNTING_BODY|SYNTHETIC_PRIVATE_ACCOUNTING_EXPLANATION/u);
  assert.equal(saved.view.masteryClaim, false); assert.equal(saved.view.transferEvidence, false);
});

test("accounting D+1 retry has its own key and completed status survives delayed replay", async () => {
  const packet = accountingPacket();
  packet.questions[1].correctChoice = 4; packet.keys[1].correctChoice = 4;
  packet.questions[1].feedback.incorrectCauseByChoice = ["C", "C", "C", null, "C"];
  const catalog = await loadAccountingContent(syntheticAccountingInput(packet)); assert.ok(catalog);
  const h = harness({ catalog }), r = route(h, { contentInput: syntheticAccountingInput(packet) });
  const created = await (await r.POST(post({ action: "create", requestId: "retry-create", questionId: QUESTION }))).json();
  const sessionId = created.view.sessionId;
  const begun = await (await r.POST(post({ sessionId, command: { action: "begin", requestId: "retry-begin", expectedRevision: 1, questionId: QUESTION } }))).json();
  h.setClock(SUBMIT);
  const submit = { sessionId, command: submission(begun.view.attempt.attemptId) };
  const saved = await (await r.POST(post(submit))).json(), task = saved.view.reviewTasks[0];
  assert.equal(task.canStartRetry, false);
  const retry = { sessionId, command: { action: "retry", requestId: "accounting-retry", expectedRevision: 3, reviewTaskId: task.reviewTaskId } };
  assert.equal((await r.POST(post(retry))).status, 409);
  h.setClock(task.dueAt);
  const started = await Promise.all([r.POST(post(retry)), r.POST(post(retry))]);
  const attempt = await started[0].json(); assert.deepEqual(await started[1].json(), attempt);
  h.setClock(new Date(Date.parse(task.dueAt) + 60_000).toISOString());
  const completed = await (await r.POST(post({ sessionId, command: { ...submission(attempt.view.attempt.attemptId, 4), requestId: "retry-submit", expectedRevision: 4 } }))).json();
  assert.equal(completed.view.attempt.decision, "correct");
  assert.equal(completed.view.reviewTasks[0].status, "completed");
  assert.equal(completed.view.reviewTasks[0].dueAt, task.dueAt);
  assert.deepEqual(await (await r.POST(post(submit))).json(), completed);
  assert.equal(h.rows.size, 1); assert.equal(completed.view.transferEvidence, false);
});

test("accounting initial page/RSC has only subject metadata and the guarded shared component", async () => {
  const component = compilePrivateSource("components/review-os/first-stage-private-practice.tsx", { react: React, "react/jsx-runtime": jsx });
  let allowed = true, shells = 0;
  const page = compilePrivateSource("app/(owner-first-stage)/app/first-stage/accounting/page.tsx", {
    "react/jsx-runtime": jsx, "next/navigation": { notFound() { throw new Error("not_found"); } },
    "@/components/review-os/app-shell": { ReviewOsAppShell: ({ children }) => { shells++; return children; } },
    "@/components/review-os/first-stage-private-practice": component,
    "@/lib/review-os/first-stage/runtime/session-server": { requirePrivateFirstStageOwner: async () => allowed ? { email: "owner@example.test" } : null },
  });
  const tree = await page.default(); assert.deepEqual(tree.props.children.props, { subject: "accounting" });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /회계학 비공개 연습/u); assert.doesNotMatch(html, /SYNTHETIC_|correctChoice|EXPLANATION/u);
  allowed = false; await assert.rejects(page.default(), /not_found/u); assert.equal(shells, 1);
});
