import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { SUBJECT_CASES, remainingPacket, remainingInput, remainingCatalogs } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { syntheticAccountingInput } from "./fixtures/first-stage-accounting-content-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";

for (const spec of SUBJECT_CASES) {
  const URL = `http://127.0.0.1/api/review-os/first-stage/${spec.slug}/sessions`;
  const post = body => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const questionId = `synthetic-${spec.slug}-q1`;
  const route = (h, options = {}) => privateRoute(h, { ...options, subject: spec.id });

  test(`${spec.id}: generic human approval cannot substitute for the missing applicability consumer`, async () => {
    // Deliberately forged test claims, NOT an actual human review or stock.
    const packet = remainingPacket(spec.id);
    packet.dataClass = "human_reviewed_private";
    const input = remainingInput(spec.id, packet);
    input.approvals[0].dataClass = "human_reviewed_private";
    delete input.expectedDataClass;
    let reads = 0;
    const readBytes = input.readBytes;
    input.readBytes = async () => { reads++; return readBytes(); };
    assert.equal(await spec.load(input), null);
    assert.equal(reads, 0);
    const r = route(harness(), { contentInput: input });
    const availability = await (await r.GET(new Request(URL))).json();
    assert.equal(availability.availability.state, "blocked");
    assert.equal(availability.availability.blocker, "subject_applicability_implementation_required");
    const request = post({ action: "create", requestId: "unsupported-human-stock", questionId });
    const denied = await r.POST(request);
    assert.equal(denied.status, 503); assert.equal(request.bodyUsed, false);
    assert.match(denied.headers.get("cache-control"), /no-store/u);
    const denial = await denied.json();
    assert.equal(denial.error, "subject_applicability_implementation_required");
    assert.doesNotMatch(JSON.stringify(denial), /SYNTHETIC_|verified_exam_date|correctChoice|EXPLANATION/u);
    const reconnect = await r.GET(new Request(`${URL}?sessionId=synthetic-existing-session`));
    assert.equal(reconnect.status, 503);
    assert.equal((await reconnect.json()).error, "subject_applicability_implementation_required");
    assert.equal(r.counts.repository, 0);
    assert.equal(reads, 0);
  });

  test(`${spec.id}: actual loader denies absent approval, wrong subject/key/version and current-law claims`, async () => {
    let reads = 0;
    assert.equal(await spec.load({ approvals: [], readBytes: async () => { reads++; return new Uint8Array(); } }), null);
    assert.equal(reads, 0);
    assert.equal(await spec.load({ ...remainingInput(spec.id), expectedDataClass: undefined }), null);
    for (const input of [syntheticContentInput(), syntheticAccountingInput(),
      ...SUBJECT_CASES.filter(other => other.id !== spec.id).map(other => remainingInput(other.id))]) {
      assert.equal(await spec.load(input), null);
    }
    const original = remainingInput(spec.id), changed = remainingPacket(spec.id);
    changed.questions[0].reference.questionVersion = "changed-version";
    assert.equal(await spec.load({ ...original, readBytes: async () => Buffer.from(JSON.stringify(changed)) }), null);
    for (const mutate of [
      packet => { packet.keys[0].correctChoice = 5; },
      packet => { packet.questions[0].reference.questionVersion = "changed-version"; },
      packet => { packet.questions[1].reference.subjectId = "accounting"; },
      packet => { packet.questions[1].sourceQuestionId = "wrong-lineage"; },
      packet => { packet.keys[1].authority = "original_final_key"; },
      packet => { packet.keys[1].evidence = packet.keys[0].evidence; },
      packet => { packet.authority = "VERIFIED_TRANSFER"; },
      packet => { packet.questions[0].reference.currentnessState = "unknown"; },
      packet => { packet.questions[0].rightsApproved = true; },
    ]) {
      const packet = remainingPacket(spec.id); mutate(packet);
      assert.equal(await spec.load(remainingInput(spec.id, packet)), null);
    }
    const partial = remainingInput(spec.id); partial.approvals[0].checks.pop();
    assert.equal(await spec.load(partial), null);
    if (spec.legal) {
      // Rebind the synthetic key/hash to isolate the historical-only policy, not a stale hash error.
      for (const index of [0, 1]) {
        const packet = remainingPacket(spec.id);
        packet.questions[index].reference.currentnessState = "verified_current";
        packet.keys[index].questionReferenceSha256 = digest(packet.questions[index].reference);
        assert.equal(await spec.load(remainingInput(spec.id, packet)), null);
      }
    }
  });

  test(`${spec.id}: actual HTTP denies unauthorized/Production before body and keeps unapproved stock blocked`, async () => {
    for (const options of [
      { environment: {} }, { environment: { ...ENVIRONMENT, INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "false" } },
      { environment: { ...ENVIRONMENT, VERCEL_ENV: "production" } },
      { environment: { ...ENVIRONMENT, NODE_ENV: "production", VERCEL_ENV: undefined } },
      { session: { isAuthenticated: false } },
      { session: { isAuthenticated: true, userId: "other", email: "other@example.test" } },
    ]) {
      const r = route(harness(), options), request = post({ action: "create", requestId: "denied", questionId });
      const response = await r.POST(request);
      assert.equal(response.status, 404); assert.equal(request.bodyUsed, false);
      assert.equal(r.counts.catalog, 0); assert.equal(r.counts.repository, 0);
      assert.match(response.headers.get("cache-control"), /no-store/u);
    }
    for (const options of [{ noCatalog: true }, { contentInput: { ...remainingInput(spec.id), approvals: [] } }]) {
      const r = route(harness(), options);
      assert.equal((await (await r.GET(new Request(URL))).json()).availability.state, "blocked");
      const request = post({ action: "create", requestId: "blocked", questionId });
      assert.equal((await r.POST(request)).status, 503); assert.equal(request.bodyUsed, false);
      assert.equal(r.counts.repository, 0);
    }
    const r = route(harness(), { environment: { ...ENVIRONMENT, NODE_ENV: "production", VERCEL_ENV: "preview" } });
    const availability = await (await r.GET(new Request(URL))).json();
    assert.equal(availability.availability.questions[0].subjectId, spec.id);
    assert.doesNotMatch(JSON.stringify(availability), /SYNTHETIC_|correctChoice|EXPLANATION/u);
    assert.equal((await r.POST(post({ action: "create", requestId: "forged", questionId, approved: true }))).status, 400);
    assert.equal((await r.POST(new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(16_385) }))).status, 413);
  });

  test(`${spec.id}: actual loader/HTTP retains disclosure, reconnect, concurrent and completed retry semantics`, async () => {
    const packet = remainingPacket(spec.id);
    packet.questions[1].correctChoice = 4; packet.keys[1].correctChoice = 4;
    packet.questions[1].feedback.incorrectCauseByChoice = ["C", "C", "C", null, "C"];
    const catalog = await spec.load(remainingInput(spec.id, packet)); assert.ok(catalog);
    const h = harness({ catalog }), options = { contentInput: remainingInput(spec.id, packet) }, r = route(h, options);
    const create = { action: "create", requestId: "create-one", questionId };
    const pair = await Promise.all([r.POST(post(create)), r.POST(post(create))]);
    const created = await pair[0].json(); assert.deepEqual(await pair[1].json(), created);
    assert.doesNotMatch(JSON.stringify(created), /SYNTHETIC_|correctChoice|EXPLANATION/u);
    const sessionId = created.view.sessionId;
    const begin = { sessionId, command: { action: "begin", requestId: "begin-one", expectedRevision: 1, questionId } };
    const opened = await (await r.POST(post(begin))).json();
    assert.equal(opened.view.question.questionReference.subjectId, spec.id);
    assert.equal(opened.view.explanation, null);
    h.setClock(SUBMIT); h.failNextWrite();
    const submit = { sessionId, command: submission(opened.view.attempt.attemptId) };
    const failed = await r.POST(post(submit)); assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /SYNTHETIC_|correctChoice|EXPLANATION/u);
    const retried = await Promise.all([r.POST(post(submit)), r.POST(post(submit))]);
    const saved = await retried[0].json(); assert.deepEqual(await retried[1].json(), saved);
    assert.match(saved.view.explanation.text, new RegExp(`SYNTHETIC_${spec.slug}_EXPLANATION`, "u"));
    const fresh = route(harness({ rows: h.rows, catalog }), options);
    assert.deepEqual(await (await fresh.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
    for (const other of [undefined, "accounting", ...SUBJECT_CASES.filter(row => row.id !== spec.id).map(row => row.id)]) {
      const wrong = privateRoute(harness({ rows: h.rows }), { subject: other });
      assert.equal((await wrong.GET(new Request(`${URL}?sessionId=${sessionId}`))).status, 503);
    }
    const drift = remainingPacket(spec.id); drift.version = "reviewed-new-snapshot";
    assert.equal((await route(h, { contentInput: remainingInput(spec.id, drift) }).GET(new Request(`${URL}?sessionId=${sessionId}`))).status, 503);
    const task = saved.view.reviewTasks[0];
    const retry = { sessionId, command: { action: "retry", requestId: "practice-retry", expectedRevision: 3, reviewTaskId: task.reviewTaskId } };
    assert.equal((await r.POST(post(retry))).status, 409);
    h.setClock(task.dueAt);
    const starts = await Promise.all([r.POST(post(retry)), r.POST(post(retry))]);
    const next = await starts[0].json(); assert.deepEqual(await starts[1].json(), next);
    h.setClock(new Date(Date.parse(task.dueAt) + 60_000).toISOString());
    const completed = await (await r.POST(post({ sessionId, command: { ...submission(next.view.attempt.attemptId, 4), requestId: "retry-submit", expectedRevision: 4 } }))).json();
    assert.equal(completed.view.attempt.decision, "correct");
    assert.equal(completed.view.reviewTasks[0].status, "completed");
    assert.equal(completed.view.reviewTasks[0].dueAt, task.dueAt);
    assert.deepEqual(await (await r.POST(post(submit))).json(), completed);
    assert.equal(h.rows.size, 1);
    assert.doesNotMatch(JSON.stringify([...h.rows]), /SYNTHETIC_|EXPLANATION|correctChoice/u);
    assert.equal(completed.view.masteryClaim, false); assert.equal(completed.view.transferEvidence, false);
  });

  test(`${spec.id}: initial page/RSC has only subject metadata behind the same Owner gate`, async () => {
    const component = compilePrivateSource("components/review-os/first-stage-private-practice.tsx", { react: React, "react/jsx-runtime": jsx });
    let allowed = true, shells = 0;
    const page = compilePrivateSource(`app/(owner-first-stage)/app/first-stage/${spec.slug}/page.tsx`, {
      "react/jsx-runtime": jsx, "next/navigation": { notFound() { throw new Error("not_found"); } },
      "@/components/review-os/app-shell": { ReviewOsAppShell: ({ children }) => { shells++; return children; } },
      "@/components/review-os/first-stage-private-practice": component,
      "@/lib/review-os/first-stage/runtime/session-server": { requirePrivateFirstStageOwner: async () => allowed ? { email: "owner@example.test" } : null },
    });
    const tree = await page.default(); assert.deepEqual(tree.props.children.props, { subject: spec.id });
    const html = renderToStaticMarkup(tree); assert.ok(html.includes(`${spec.label} 비공개 연습`));
    assert.doesNotMatch(html, /SYNTHETIC_|correctChoice|EXPLANATION/u);
    const current = component.FirstStagePrivatePractice({ subject: spec.id });
    const other = component.FirstStagePrivatePractice({ subject: "economics_principles" });
    assert.equal(current.key, spec.id); assert.notEqual(current.key, other.key);
    allowed = false; await assert.rejects(page.default(), /not_found/u); assert.equal(shells, 1);
    assert.ok(remainingCatalogs[spec.id]);
  });
}
