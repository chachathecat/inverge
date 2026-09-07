import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { harness, reference, submission, SUBMIT, BODY } from "./fixtures/first-stage-private-session-harness.mjs";
import { CONTENT_EXPLANATION as EXPLANATION } from "./fixtures/first-stage-economics-content-harness.mjs";
import * as content from "../lib/review-os/first-stage/runtime/economics-content.ts";
import * as accountingContent from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import * as fs from "node:fs/promises";
import path from "node:path";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";

const URL = "http://127.0.0.1/api/review-os/first-stage/sessions";
const post = body => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("actual route rejects missing/OFF flag, unauthenticated, either non-Owner and Production before body/catalog/storage", async () => {
  const cases = [
    { environment: { ...ENVIRONMENT, INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: undefined } },
    { environment: { ...ENVIRONMENT, INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "false" } },
    { environment: { ...ENVIRONMENT, VERCEL_ENV: "production" } },
    { environment: { ...ENVIRONMENT, VERCEL_ENV: undefined, NODE_ENV: "production" } },
    { session: { isAuthenticated: false } },
    { environment: { ...ENVIRONMENT, ALPHA_ADMIN_EMAILS: "someone@example.test" } },
    { environment: { ...ENVIRONMENT, INVERGE_OWNER_FIRST_STAGE_EMAILS: "someone@example.test" } },
  ];
  for (const options of cases) {
    const route = privateRoute(harness(), options);
    const request = post({ privateSentinel: BODY });
    const response = await route.POST(request);
    assert.equal(response.status, 404);
    assert.equal(request.bodyUsed, false);
    assert.deepEqual(await response.json(), { ok: false, error: "not_found" });
    assert.equal(route.counts.catalog, 0); assert.equal(route.counts.repository, 0);
    assert.match(response.headers.get("cache-control"), /no-store/u);
  }
});

test("actual route availability exposes metadata only and absent approved stock never opens storage", async () => {
  for (const environment of [ENVIRONMENT, { ...ENVIRONMENT, NODE_ENV: "production", VERCEL_ENV: "preview" }]) {
    const h = harness();
    const route = privateRoute(h, { environment });
    const response = await route.GET(new Request(URL));
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.equal(text.includes(BODY), false); assert.equal(text.includes(EXPLANATION), false);
    assert.equal(h.counts.explanations, 0); assert.equal(route.counts.repository, 0);
    assert.equal(JSON.parse(text).availability.questions.length, 1);
  }
  const blocked = privateRoute(harness(), { noCatalog: true });
  assert.equal((await (await blocked.GET(new Request(URL))).json()).availability.state, "blocked");
  const request = post({ action: "create", requestId: "request-1", questionId: reference().questionId });
  const response = await blocked.POST(request);
  assert.equal(response.status, 503); assert.equal(request.bodyUsed, false);
  assert.equal(blocked.counts.repository, 0);
  const installed = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
    "server-only": {}, "node:fs/promises": fs, "node:path": { default: path }, "./economics-content": content,
    "./accounting-content": accountingContent });
  assert.equal(await installed.loadApprovedPrivateFirstStageCatalog(), null);
});

test("actual route preserves durable-only disclosure, deterministic replay and bounded input", async () => {
  const h = harness(); const route = privateRoute(h);
  const create = { action: "create", requestId: "request-1", questionId: reference().questionId };
  const created = await (await route.POST(post(create))).json();
  const sessionId = created.view.sessionId;
  const begin = { sessionId, command: { action: "begin", requestId: "request-2", expectedRevision: 1, questionId: reference().questionId } };
  const opened = await (await route.POST(post(begin))).json();
  assert.equal(opened.view.question.stem, BODY); assert.equal(opened.view.explanation, null);
  h.setClock(SUBMIT); h.failNextWrite();
  const submit = { sessionId, command: submission(opened.view.attempt.attemptId) };
  const failed = await route.POST(post(submit));
  assert.equal(failed.status, 503); assert.equal((await failed.text()).includes(EXPLANATION), false);
  assert.equal(h.counts.explanations, 0);
  const successful = await (await route.POST(post(submit))).json();
  assert.equal(successful.view.explanation.text, EXPLANATION);
  assert.deepEqual(await (await route.POST(post(submit))).json(), successful);
  assert.equal(h.rows.size, 1);
  const reopened = privateRoute(harness({ rows: h.rows }));
  assert.deepEqual(await (await reopened.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), successful);
  assert.equal(successful.view.reviewTasks[0].dueAt, "2026-09-07T10:01:00.000Z");
  const overflow = new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(16_385) });
  assert.equal((await route.POST(overflow)).status, 413);
});

test("actual page and client SSR contain no assisted payload and denied page renders no shell", async () => {
  const component = compilePrivateSource("components/review-os/first-stage-private-practice.tsx", {
    react: React, "react/jsx-runtime": jsx,
  });
  let allowed = true, shellCalls = 0;
  const page = compilePrivateSource("app/(owner-first-stage)/app/first-stage/practice/page.tsx", {
    "react/jsx-runtime": jsx,
    "next/navigation": { notFound() { throw new Error("not_found"); } },
    "@/components/review-os/app-shell": { ReviewOsAppShell: ({ children }) => { shellCalls++; return children; } },
    "@/components/review-os/first-stage-private-practice": component,
    "@/lib/review-os/first-stage/runtime/session-server": {
      requirePrivateFirstStageOwner: async () => allowed ? { email: "owner@example.test" } : null,
    },
  });
  const tree = await page.default();
  assert.deepEqual(tree.props.children.props, {});
  const html = renderToStaticMarkup(tree);
  assert.equal(html.includes(BODY), false); assert.equal(html.includes(EXPLANATION), false);
  assert.match(html, /경제학 비공개 연습/u);
  allowed = false; await assert.rejects(page.default(), /not_found/u);
  assert.equal(shellCalls, 1);
});
