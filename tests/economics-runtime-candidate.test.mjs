import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { prepareEconomicsRuntimeCandidate } from "../scripts/content-review/prepare-economics-runtime-candidate.mjs";
import { syntheticReviewInputs, syntheticRuntimeCandidateInput } from "./fixtures/economics-runtime-candidate-harness.mjs";
import { loadEconomicsContent } from "../lib/review-os/first-stage/runtime/economics-content.ts";
import { loadAccountingContent } from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateRoute } from "./fixtures/first-stage-private-route-harness.mjs";

const URL = "http://127.0.0.1/api/review-os/first-stage/sessions";
const post = value => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const sha = value => createHash("sha256").update(value).digest("hex");

test("r3 conversion preserves all fifty body/choice/key/feedback fields without fabricating approval", () => {
  const inputs = syntheticReviewInputs(), before = JSON.stringify(inputs);
  const prepared = prepareEconomicsRuntimeCandidate(inputs);
  assert.equal(prepared.mapping.unchangedFields, 50);
  assert.ok(prepared.mapping.mappings.every(row => row.fields.every(field => field.identical)));
  assert.equal(prepared.mapping.candidateSha256, sha(prepared.serialized));
  assert.equal(prepared.candidate.dataClass, "private_review_candidate");
  assert.equal(prepared.mapping.reviewer, null); assert.equal(prepared.mapping.reviewedAt, null);
  assert.equal(prepared.mapping.decision, null); assert.equal(prepared.mapping.humanChecks.length, 6);
  assert.ok(prepared.mapping.humanChecks.every(row => row.reviewer === null && row.decision === null && row.reviewedAt === null));
  assert.equal(prepared.mapping.runtimeEligible, false);
  assert.doesNotMatch(prepared.serialized, /human_reviewed|verified_owner|verified_exam|reviewerIdentity/u);
  assert.deepEqual(prepareEconomicsRuntimeCandidate(inputs), prepared); assert.equal(JSON.stringify(inputs), before);
  assert.notEqual(prepared.candidate.keys[0].correctChoice, prepared.candidate.keys[5].correctChoice);
  assert.notEqual(prepared.candidate.keys[0].evidence.evidenceSha256, prepared.candidate.keys[5].evidence.evidenceSha256);
});

test("stale AI/calculation binding, altered answers, fake human review and lineage mismatch deny conversion", () => {
  for (const mutate of [
    x => { x.reviewSource = x.reviewSource.replace("SYNTHETIC_CANDIDATE_EXPLANATION", "changed explanation"); },
    x => { const r = JSON.parse(x.aiEvidenceSource); r.originalAnswerChoices[46] = 5; x.aiEvidenceSource = JSON.stringify(r); },
    x => { const r = JSON.parse(x.aiEvidenceSource); r.contentApprovalGranted = true; x.aiEvidenceSource = JSON.stringify(r); },
    x => { const r = JSON.parse(x.aiEvidenceSource); r.packetSha256 = "0".repeat(64); x.aiEvidenceSource = JSON.stringify(r); },
    x => { const r = JSON.parse(x.reviewSource); r.humanReview.reviewer = "not-authorized"; x.reviewSource = JSON.stringify(r); },
  ]) {
    const inputs = syntheticReviewInputs(); mutate(inputs);
    assert.throws(() => prepareEconomicsRuntimeCandidate(inputs));
  }
});

test("pending candidate never reads with empty approvals or borrows test receipts in real mode", async () => {
  const prepared = prepareEconomicsRuntimeCandidate(syntheticReviewInputs()); let reads = 0;
  const bytes = Buffer.from(prepared.serialized);
  assert.equal(await loadEconomicsContent({ approvals: [], readBytes: async () => { reads++; return bytes; } }), null);
  assert.equal(reads, 0);
  const input = syntheticRuntimeCandidateInput();
  assert.equal(await loadEconomicsContent({ ...input, expectedDataClass: undefined }), null);
  assert.equal(await loadEconomicsContent(syntheticContentInput(prepared.candidate)), null);
  assert.equal(await loadAccountingContent(input), null);
  const route = privateRoute(harness(), { contentInput: { approvals: [], readBytes: async () => bytes } });
  const request = post({ action: "create", requestId: "pending", questionId: prepared.candidate.questions[0].reference.questionId,
    approved: true, reviewer: "client" });
  const response = await route.POST(request);
  assert.equal(response.status, 503); assert.equal(request.bodyUsed, false); assert.equal(route.counts.repository, 0);
  assert.doesNotMatch(await response.text(), /SYNTHETIC_CANDIDATE|correctChoice/u);
});

test("six-check server approval cannot replace the unimplemented r3 final-release consumer", async () => {
  // Synthetic bytes and synthetic identities ONLY: model a well-formed server
  // six-check shape, not a real approval or an installed production receipt.
  const prepared = prepareEconomicsRuntimeCandidate(syntheticReviewInputs());
  const bytes = Buffer.from(prepared.serialized);
  const sample = syntheticRuntimeCandidateInput().approvals[0];
  const input = { approvals: [{ ...sample, packetSha256: sha(bytes),
    dataClass: "human_reviewed_private" }], readBytes: async () => bytes };
  assert.equal(await loadEconomicsContent(input), null);
  const route = privateRoute(harness(), { contentInput: input });
  const request = post({ action: "create", requestId: "six-check-only",
    questionId: prepared.candidate.questions[0].reference.questionId });
  const response = await route.POST(request);
  assert.equal(response.status, 503); assert.equal(request.bodyUsed, false);
  assert.equal(route.counts.repository, 0);
  assert.doesNotMatch(await response.text(), /SYNTHETIC_CANDIDATE|correctChoice/u);
});

test("candidate same-loader HTTP path saves before feedback and survives concurrency, lost response and D+1 retry", async () => {
  const input = syntheticRuntimeCandidateInput(), catalog = await loadEconomicsContent(input); assert.ok(catalog);
  const h = harness({ catalog }), route = privateRoute(h, { contentInput: input });
  const questionId = catalog.initialReferences[0].questionId;
  const create = { action: "create", requestId: "converted-create", questionId };
  const created = await Promise.all([route.POST(post(create)), route.POST(post(create))]);
  const view = (await created[0].json()).view; assert.deepEqual((await created[1].json()).view, view); assert.equal(h.rows.size, 1);
  const sessionId = view.sessionId;
  const begun = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "converted-begin", expectedRevision: 1, questionId } }))).json();
  assert.match(JSON.stringify(begun), /Q-Net/u);
  assert.doesNotMatch(JSON.stringify(begun), /5246129/u);
  assert.doesNotMatch(JSON.stringify(begun), /SYNTHETIC_CANDIDATE_EXPLANATION|alpha reason|correctChoice|key-review-basis/u);
  h.setClock(SUBMIT); h.failNextWrite();
  const command = { sessionId, command: submission(begun.view.attempt.attemptId, 2) };
  const failed = await route.POST(post(command)); assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /EXPLANATION|alpha reason/u);
  // Discard the first successful response; retry must read its durable result.
  await route.POST(post(command));
  const retries = await Promise.all([route.POST(post(command)), route.POST(post(command))]);
  const saved = await retries[0].json(); assert.deepEqual(await retries[1].json(), saved);
  assert.match(saved.view.explanation.text, /SYNTHETIC_CANDIDATE_EXPLANATION/u);
  assert.match(JSON.stringify(saved.view.explanation.attributions), /5246129/u);
  const reopened = privateRoute(harness({ rows: h.rows, catalog }), { contentInput: input });
  assert.deepEqual(await (await reopened.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  assert.equal(h.rows.size, 1); assert.equal(h.counts.replaces, 2);
  h.setClock(saved.view.reviewTasks[0].dueAt);
  const retried = await (await route.POST(post({ sessionId, command: { action: "retry", requestId: "converted-d1",
    expectedRevision: 3, reviewTaskId: saved.view.reviewTasks[0].reviewTaskId } }))).json();
  assert.equal(retried.view.question.questionReference.questionId, "issue883-r3-r46");
  h.setClock(new Date(Date.parse(h.getClock()) + 60_000).toISOString());
  const completed = await (await route.POST(post({ sessionId, command: { ...submission(retried.view.attempt.attemptId, 4),
    expectedRevision: 4, requestId: "converted-retry-submit" } }))).json();
  assert.equal(completed.view.attempt.decision, "correct");
  assert.doesNotMatch(JSON.stringify(completed.view.explanation.attributions), /5246129/u);
  assert.equal(completed.view.reviewTasks[0].status, "completed");
  assert.equal(completed.view.masteryClaim, false); assert.equal(completed.view.transferEvidence, false);
  assert.doesNotMatch(JSON.stringify([...h.rows.values()]), /SYNTHETIC_CANDIDATE|alpha reason/u);
});

test("exact candidate edits and forged reference authority cannot reuse approval or cross-link a key", async () => {
  const initial = syntheticRuntimeCandidateInput();
  for (const mutate of [
    p => { p.questions[0].easyExplanation = "changed synthetic content"; },
    p => { p.version = "other-version"; },
    p => { p.exam.booklet = "B"; },
    p => { p.questions[0].reference.rightsState = "verified_cleared"; },
    p => { p.keys[0].correctChoice = 4; },
    p => { p.keys[5].evidence = p.keys[0].evidence; },
    p => { p.questions[5].sourceQuestionId = p.questions[1].reference.questionId; },
    p => { p.questions[5].reference.questionNumber = 49; },
    p => { p.questions[0].reference.questionVersion = "other-item-version"; },
  ]) {
    const packet = JSON.parse(await initial.readBytes()); mutate(packet);
    assert.equal(await loadEconomicsContent({ ...initial, readBytes: async () => Buffer.from(JSON.stringify(packet)) }), null);
    if (packet.questions[0].easyExplanation === "changed synthetic content" || packet.version === "other-version") continue;
    assert.equal(await loadEconomicsContent(syntheticContentInput(packet)), null);
  }
  const packet = JSON.parse(await initial.readBytes()); delete packet.questions[0].choices[2];
  const bytes = Buffer.from(JSON.stringify(packet)); // JSON holes become null and are also denied.
  assert.equal(await loadEconomicsContent(syntheticContentInput(JSON.parse(bytes))), null);
  assert.ok(digest(packet));
});
