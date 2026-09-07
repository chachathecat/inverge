import assert from "node:assert/strict";
import test from "node:test";
import { FIVE, RETRY_RELEASE_FIELDS, RETRY_KEY_FIELDS, RETRY_PROVENANCE_FIELDS } from "../lib/review-os/first-stage/runtime/foundation-release-contract.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { validateCivilApplicability } from "../lib/review-os/first-stage/runtime/foundation-applicability.ts";
import { loadCivilLawContent } from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import { civilApplicability } from "./fixtures/first-stage-civil-applicability-harness.mjs";
import { remainingPacket } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { privateRoute } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";

const URL = "http://127.0.0.1/api/review-os/first-stage/civil-law/sessions";
const create = { action: "create", requestId: "release-create", questionId: "synthetic-civil-law-q1" };
const post = body => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
function input(mutate = () => {}) {
  const packet = remainingPacket("civil_law"), installed = civilApplicability(packet, mutate);
  return { packet, installed, options: { ...syntheticContentInput(packet), applicability: [installed] } };
}
async function denied(options, label) {
  assert.equal(await loadCivilLawContent(options), null, label);
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  const request = post(create), response = await route.POST(request);
  assert.equal(response.status, 503, label); assert.equal(request.bodyUsed, false, label);
  assert.match(response.headers.get("cache-control"), /no-store/u);
  assert.deepEqual(await response.json(), { ok: false, error: "approved_content_required" });
  assert.equal(route.counts.repository, 0); assert.equal(h.rows.size, 0);
}

test("Owner amendment preserves official Foundation and derives only the private modified key branch", () => {
  const amendment = FIVE.privateModifiedRetryReleaseContract;
  const derive = (base, row) => [...base.filter(field => !row.removeExactly.includes(field)), ...row.addExactly];
  assert.deepEqual(RETRY_RELEASE_FIELDS, derive(FIVE.releaseReceiptContract.requiredFields, amendment.retryRequiredFieldsDerivation));
  assert.deepEqual(RETRY_KEY_FIELDS, amendment.independentAnswerKeyRequiredFields);
  assert.deepEqual(RETRY_PROVENANCE_FIELDS, derive(FIVE.questionItemObjectProvenanceReceiptShape.requiredFields, amendment.variantProvenanceFieldsDerivation));
  assert.equal(FIVE.releaseRule.requiresVerifiedOfficialKey, true);
  assert.ok(FIVE.releaseReceiptContract.verifiedOfficialKeyReceiptShape.officialKeyTableMappingReceiptShape.bindingInvariants.includes("row_count_equals_200_and_equals_ordered_key_rows_count"));
  assert.equal(amendment.actualApprovedContentCount, 0); assert.equal(amendment.actualInstalledContentCount, 0);
  const { installed, packet } = input();
  assert.ok(validateCivilApplicability(installed, packet.questions, packet.keys));
});

test("official release requires the entire 200-position table and exact booklet/source/key mapping", async () => {
  const cases = [
    ["official-key-table", row => { row.row_count = 199; row.ordered_key_rows.pop(); row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["official-key-table", row => { row.ordered_key_rows[199] = row.ordered_key_rows[198]; row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["official-key-table", row => { row.ordered_key_rows[150].answer_position_1_to_5 = 5; row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["official-key-table", row => { row.ordered_key_rows[0].source_question_asset_sha256 = digest("wrong"); row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["official-key-table", row => { row.source_question_asset_rights_receipt_references.pop(); }],
    ["official-observation-2", row => { row.booklet_id = "other-booklet"; }],
    ["official-observation-0", row => { row.ordered_position_bindings[0].question_body_sha256 = digest("wrong-transcription"); }],
    ["official-observation-2", row => { row.ordered_position_bindings[0].answer_position_1_to_5 = 5; }],
    ["official-observation-2", row => { row.artifact_role = "draft_answer"; }],
    ["official-key-transport", row => { row.http_status = 403; }],
    ["final-key-0", row => { row.final_answer_row_locator = "nonexistent-row"; }],
    ["final-key-0", row => { row.answer_position_1_to_5 = 5; }],
    ["final-key-0", row => { row.key_asset_exact_attribution = "normalized-substitute"; }],
    ["final-key-0", row => { row.decision = "AI_reviewed"; }],
    ["final-key-0", row => { row.reviewer = "client-reviewer"; }],
  ];
  for (const [index, [target, mutate]] of cases.entries()) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    await denied(options, `official-${index}-${target}`);
  }
});

test("final use decision resolves rights, provenance, five-choice feedback, version and validator graph", async () => {
  const cases = [
    ["release-0", row => { row.decision = "withheld"; }],
    ["release-0", row => { row.item_version = "other-version"; }],
    ["release-0", row => { row.requested_audience_or_null = "authorized_learner"; }],
    ["release-0", row => { row.reviewed_at = "2026-09-05T10:00:00.000Z"; }],
    ["release-0", row => { row.reviewer = "self-appointed-human"; }],
    ["release-0", row => { row.source_asset_rights_receipt_reference = { evidence_id: "missing", evidence_version: "1", evidence_sha256: digest("missing") }; }],
    ["release-0", row => { row.ordered_unique_attributions.reverse(); row.ordered_unique_attributions_digest = digest(row.ordered_unique_attributions); }],
    ["q1-asset-rights", row => { row.decision_scope.allowed_scope_tuples = []; }],
    ["q1-asset-rights", row => { row.decision_scope.expires_at_or_null = "2026-09-06T10:00:00.000Z"; }],
    ["q1-asset-rights", row => { row.third_party_rights_decision = "unresolved"; }],
    ["q1-true-basis-evidence", row => { row.asset_in_scope_determination_or_null = "not_confirmed"; }],
    ["q1-true-basis", row => { row.source_content_sha256 = digest("other-bytes"); }],
    ["q1-true-basis-transport", row => { row.final_url = "https://unrelated.example.test"; }],
    ["provenance-0", row => { row.output_object_sha256 = digest("different-stem"); }],
    ["provenance-0", row => { row.extraction_method_id = "ocr_after_S236B_benchmark_gate"; }],
    ["feedback-bundle-0", row => { row.ordered_choice_feedback_rows.pop(); row.ordered_choice_feedback_rows_digest = digest(row.ordered_choice_feedback_rows); }],
    ["feedback-bundle-0", row => { row.ordered_feedback_attribution_rows.pop(); row.ordered_feedback_attribution_rows_digest = digest(row.ordered_feedback_attribution_rows); }],
    ["manifest-0", row => { row.exam_date = "2026-04-05"; }],
    ["manifest-0", row => { row.component_evidence_references = []; }],
    ["validator-app-0", row => { row.applicability_status = "verified_not_applicable"; }],
    ["validator-derivation-0", row => { row.validator_input_facts.authority_ids = ["other-law"]; row.validator_input_facts_digest = digest(row.validator_input_facts); }],
    ["validator-result-0", row => { row.ordered_assertion_rows[0].observed_value_or_null = false; row.ordered_assertion_rows_digest = digest(row.ordered_assertion_rows); }],
    ["validator-pass-0", row => { row.validator_configuration_digest = digest("wrong-config"); }],
    ["manifest-0", row => { row.reviewed_at = "2026-09-06T10:00:01.000Z"; }],
    ["release-0", row => { row.deterministic_validator_receipt_references = []; }],
  ];
  for (const [index, [target, mutate]] of cases.entries()) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    await denied(options, `final-${index}-${target}`);
  }
});

test("private modified retry requires its own exact key and cannot mix official or client-selected paths", async () => {
  const cases = [
    ["release-1", row => { row.receipt_version = FIVE.releaseReceiptContract.receiptVersion; }],
    ["release-1", row => { row.item_kind = "official_original"; }],
    ["release-1", row => { row.authority = "VERIFIED_TRANSFER"; }],
    ["release-1", row => { row.verified_official_key_receipt_reference = row.independent_answer_key_reference; }],
    ["final-key-1", row => { row.decision = "verified_official_key"; }],
    ["final-key-1", row => { row.answer_position_1_to_5 = 5; }],
    ["final-key-1", row => { row.question_item_object_reference.object_sha256 = digest("other-variant"); }],
    ["final-key-1", row => { row.authority = "MEASUREMENT"; }],
    ["provenance-1", row => { row.concept_binding_digest = digest("unrelated-concept"); }],
    ["validator-derivation-1", row => { row.verified_official_key_receipt_reference = row.independent_answer_key_reference; delete row.independent_answer_key_reference; }],
  ];
  for (const [index, [target, mutate]] of cases.entries()) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    await denied(options, `variant-${index}-${target}`);
  }
  const { packet, installed, options } = input();
  packet.questions[0].kind = "practice_retry";
  await denied({ ...syntheticContentInput(packet), applicability: [installed] }, "packet cannot choose kind");
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  for (const field of ["kind", "releaseReference", "approved", "authority"]) {
    assert.equal((await route.POST(post({ ...create, [field]: "LEARNING_ONLY" }))).status, 400);
  }
});

test("actual HTTP persists before feedback, preserves exact attribution blocks, reconnects and uses the variant's different answer", async () => {
  const packet = remainingPacket("civil_law");
  packet.questions[1].correctChoice = 4; packet.keys[1].correctChoice = 4;
  packet.questions[1].feedback.incorrectCauseByChoice = ["C", "C", "C", null, "C"];
  const installed = civilApplicability(packet), options = { ...syntheticContentInput(packet), applicability: [installed] };
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  const response = await (await route.POST(post(create))).json(), sessionId = response.view.sessionId;
  assert.doesNotMatch(JSON.stringify(response), /Synthetic|SYNTHETIC_|attribution|EXPLANATION/u);
  const opened = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "begin", expectedRevision: 1, questionId: create.questionId } }))).json();
  assert.equal(opened.view.explanation, null); assert.equal(opened.view.questionAttributions.length, 3);
  assert.doesNotMatch(JSON.stringify(opened.view.questionAttributions), /answer|explanation|easy|key/u);
  h.setClock(SUBMIT); h.failNextWrite();
  const submit = { sessionId, command: submission(opened.view.attempt.attemptId) };
  const failed = await route.POST(post(submit)); assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /Synthetic|SYNTHETIC_|EXPLANATION/u);
  const attempts = await Promise.all([route.POST(post(submit)), route.POST(post(submit))]);
  const saved = await attempts[0].json(); assert.deepEqual(await attempts[1].json(), saved);
  const root = installed.receipts.find(row => row.receipt_id === installed.items[0].releaseReference.evidence_id);
  assert.deepEqual(saved.view.explanation.attributions.slice(0, root.ordered_unique_attributions.length), root.ordered_unique_attributions);
  assert.equal(saved.view.explanation.attributions.at(-1), "Synthetic 0-easy attribution — not actual reviewed content");
  assert.deepEqual(await (await route.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  const task = saved.view.reviewTasks[0]; h.setClock(task.dueAt);
  const retry = { sessionId, command: { action: "retry", requestId: "retry", expectedRevision: 3, reviewTaskId: task.reviewTaskId } };
  const begun = await (await route.POST(post(retry))).json();
  assert.equal(begun.view.explanation, null); assert.equal(begun.view.questionAttributions.length, 3);
  h.setClock(new Date(Date.parse(task.dueAt) + 60_000).toISOString());
  const completed = await (await route.POST(post({ sessionId, command: { ...submission(begun.view.attempt.attemptId, 4), requestId: "retry-submit", expectedRevision: 4 } }))).json();
  assert.equal(completed.view.attempt.decision, "correct"); assert.equal(completed.view.reviewTasks[0].status, "completed");
  assert.equal(completed.view.reviewTasks[0].dueAt, task.dueAt); assert.equal(completed.view.masteryClaim, false); assert.equal(completed.view.transferEvidence, false);
  assert.deepEqual(await (await route.POST(post(submit))).json(), completed);
  const fresh = privateRoute(harness({ rows: h.rows }), { subject: "civil_law", contentInput: options });
  assert.deepEqual(await (await fresh.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), completed);
  assert.equal(h.rows.size, 1); assert.doesNotMatch(JSON.stringify([...h.rows]), /Synthetic|SYNTHETIC_|attribution|EXPLANATION/u);
  const revoked = structuredClone(installed); revoked.items[1].releaseReference.evidence_sha256 = digest("revoked");
  const unavailable = privateRoute(h, { subject: "civil_law", contentInput: { ...options, applicability: [revoked] } });
  assert.equal((await unavailable.GET(new Request(`${URL}?sessionId=${sessionId}`))).status, 503); assert.equal(h.rows.size, 1);
});
