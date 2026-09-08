import assert from "node:assert/strict";
import test from "node:test";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { foundationEvidence } from "../lib/review-os/first-stage/runtime/foundation-applicability.ts";
import { releaseContext, sourcePair } from "../lib/review-os/first-stage/runtime/foundation-release-rights.ts";
import { validateOfficialKey } from "../lib/review-os/first-stage/runtime/foundation-release-key.ts";
import { ECONOMICS_R3_PROFILE } from "../lib/review-os/first-stage/runtime/foundation-official-profile.ts";
import { finalReleaseSources } from "./fixtures/first-stage-final-release-harness.mjs";
import { economicsReleaseInput } from "./fixtures/first-stage-economics-applicability-harness.mjs";
import { loadEconomicsContent } from "../lib/review-os/first-stage/runtime/economics-content.ts";
import { privateRoute } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness } from "./fixtures/first-stage-private-session-harness.mjs";
import { SUBMIT, submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { bindEconomicsCandidateRelease } from "../lib/review-os/first-stage/runtime/economics-candidate-release.ts";
import { evaluateReviewedArithmetic, compareReviewedQuantities } from "../lib/review-os/first-stage/runtime/foundation-real-estate-facts.ts";
import { compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import * as economicsContent from "../lib/review-os/first-stage/runtime/economics-content.ts";
import * as accountingContent from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import * as remainingContent from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import path from "node:path";
import { createHash } from "node:crypto";

const URL = "http://127.0.0.1/api/review-os/first-stage/sessions";
const post = value => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const create = { action: "create", requestId: "r3-final-create", questionId: "qnet-2025-36-s1-A-46" };
async function denied(input, label) {
  const h = harness(), route = privateRoute(h, { contentInput: input }), request = post(create);
  const response = await route.POST(request);
  assert.equal(response.status, 503, label); assert.match(response.headers.get("cache-control"), /no-store/u);
  assert.equal(request.bodyUsed, false, label); assert.equal(route.counts.repository, 0, label);
  assert.equal(h.rows.size, 0); assert.doesNotMatch(await response.text(), /SYNTHETIC_CANDIDATE|correctChoice|EXPLANATION/u);
}

// Entirely synthetic source observations and role identities. None are human
// reviews, official files, runtime approvals or expected answers for real r3.
function officialKeyHarness(mutate = () => {}) {
  const receipts = [], AT = "2026-09-06T10:00:00.000Z", HUMAN = "synthetic-not-a-human-law-review";
  const add = (id, fields) => {
    const row = { receipt_id: `synthetic-${id}`, receipt_version: "1", ...fields };
    mutate(id, row); row.receipt_sha256 = digest(row); receipts.push(row);
    return { evidence_id: row.receipt_id, evidence_version: row.receipt_version, evidence_sha256: row.receipt_sha256 };
  };
  const question = { kind: "original", reference: { subjectId: "economics_principles", questionNumber: 46 },
    stem: "SYNTHETIC_KEY_POSITION_ONLY", choices: ["s1", "s2", "s3", "s4", "s5"], correctChoice: 2 };
  const sources = finalReleaseSources({ questions: [question] }, receipts, add, true);
  const { get, keyPair, keyRows, keyObservation, keyTransport, table } = sources;
  const mapped = keyRows.find(row => row.subject_id === "economics_principles" && row.official_question_number === 46);
  const attributions = [get(keyPair.post).attribution, get(keyPair.asset).exact_attribution];
  const key = add("selected-r3-key", { ...mapped, item_id: "synthetic-r3-46", item_version: "1",
    official_exam_round_id: "appraiser_2025_round_36_first", qnet_post_id: get(keyPair.post).post_id,
    qnet_asset_id: get(keyPair.asset).asset_id, exact_asset_raw_sha256: get(keyPair.asset).sha256,
    key_post_rights_receipt_reference: keyPair.post, key_asset_rights_receipt_reference: keyPair.asset,
    effective_key_rights_decision: "approved_owner_private_use", key_post_exact_attribution: attributions[0], key_asset_exact_attribution: attributions[1],
    ordered_unique_key_attributions: attributions, ordered_unique_key_attributions_digest: digest(attributions),
    asset_transport_receipt_reference: keyTransport, asset_content_identity_receipt_reference: keyObservation,
    official_key_table_mapping_receipt_reference: table, official_key_table_mapping_digest: digest(keyRows),
    retrieved_at: AT, reviewer: HUMAN, reviewed_at: AT, decision: "verified_official_key" });
  const evidence = foundationEvidence({ receipts, reviewers: [{ identity: HUMAN, classes: ["named_owner_authorized_human_answer_key_reviewer",
    "named_owner_authorized_human_rights_reviewer", "named_owner_authorized_human_reviewer"] }] });
  const release = { item_id: "synthetic-r3-46", item_version: "1", subject_id: "economics_principles",
    official_exam_round_id: "appraiser_2025_round_36_first", session_profile_id: "qnet-2025-36-s1-A",
    official_question_number: 46, source_question_anchor: mapped.source_question_anchor,
    verified_official_key_receipt_reference: key, reviewed_at: AT };
  const ctx = releaseContext(evidence, release), pair = sources.sourcePairs[0];
  return { run: () => validateOfficialKey(ctx, release, 2, sourcePair(ctx, pair.post, pair.asset), sources.sourceObservations, ECONOMICS_R3_PROFILE), sources };
}

test("2025 economics uses its session-global position in the complete 200-position key, not a 2026 or five-row shortcut", () => {
  const h = officialKeyHarness();
  assert.equal(h.sources.keyRows.length, 200);
  assert.equal(h.sources.keyRows[45].official_question_number, 46);
  assert.equal(h.sources.keyRows[45].subject_id, "economics_principles");
  assert.doesNotThrow(h.run);
});

test("coherently rehashed missing positions, incorrect session numbering, wrong key and wrong booklet deny", () => {
  for (const mutate of [
    (id, row) => { if (id === "official-key-table") { row.ordered_key_rows.pop(); row.row_count = 199; row.ordered_key_rows_digest = digest(row.ordered_key_rows); } },
    (id, row) => { if (id === "official-observation-2") row.ordered_position_bindings[45].official_question_number = 6; },
    (id, row) => { if (id === "official-observation-2") row.booklet_id = "B"; },
    (id, row) => { if (id === "selected-r3-key") row.answer_position_1_to_5 = 3; },
    (id, row) => { if (id === "selected-r3-key") row.official_exam_round_id = "appraiser_2026_round_37_first"; },
  ]) assert.throws(() => officialKeyHarness(mutate).run());
});

test("r3 actual loader and HTTP must consume final release before any request body or storage", async () => {
  const { input, candidate } = await economicsReleaseInput((id, row) => {
    if (id === "release-0") row.decision = "pending_not_approved";
  });
  const route = privateRoute(harness(), { contentInput: input });
  const request = new Request("http://127.0.0.1/api/review-os/first-stage/sessions", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", requestId: "unreleased-r3",
      questionId: candidate.questions[0].reference.questionId }) });
  const response = await route.POST(request);
  assert.equal(response.status, 503);
  assert.equal(request.bodyUsed, false); assert.equal(route.counts.repository, 0);
  assert.equal(await loadEconomicsContent(input), null);
});

test("neutral r3 binding changes only installed references and preserves all fifty content fields", async () => {
  const { input, candidate, normalized, installation } = await economicsReleaseInput();
  const before = JSON.stringify(candidate);
  const bound = bindEconomicsCandidateRelease(candidate, "synthetic_test_only", installation);
  assert.deepEqual(bound.packet, normalized); assert.equal(JSON.stringify(candidate), before);
  for (let i = 0; i < 10; i++) for (const field of ["stem", "choices", "correctChoice", "choiceExplanations", "easyExplanation"])
    assert.deepEqual(bound.packet.questions[i][field], candidate.questions[i][field]);
  assert.ok(await loadEconomicsContent(input));
  assert.ok(await loadEconomicsContent((await economicsReleaseInput(() => {}, "dimensionless")).input));
});

test("coherently rehashed r3 final decisions, official 200-position evidence and independent retry keys fail closed", async () => {
  const cases = [
    ["official-key-table", row => { row.row_count = 199; row.ordered_key_rows.pop(); row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["official-observation-0", row => { row.ordered_position_bindings[45].question_body_sha256 = digest("wrong-body"); }],
    ["official-observation-2", row => { row.ordered_position_bindings[45].answer_position_1_to_5 = 5; }],
    ["official-observation-2", row => { row.booklet_id = "B"; }],
    ["final-key-0", row => { row.exact_asset_raw_sha256 = digest("other-file"); }],
    ["release-0", row => { row.item_version = "different"; }],
    ["release-0", row => { row.subject_id = "accounting"; }],
    ["release-0", row => { row.reviewer = "self-appointed"; }],
    ["release-0", row => { row.decision = "AI_reviewed"; }],
    ["release-0", row => { row.reviewed_at = "2026-09-05T00:00:00.000Z"; }],
    ["release-0", row => { row.deterministic_validator_applicability_receipt_references.pop(); }],
    ["release-0", row => { row.deterministic_validator_receipt_references = []; }],
    ["release-5", row => { row.item_kind = "official_original"; }],
    ["release-5", row => { row.authority = "VERIFIED_TRANSFER"; }],
    ["release-5", row => { row.verified_official_key_receipt_reference = row.independent_answer_key_reference; }],
    ["final-key-5", row => { row.answer_position_1_to_5 = 2; }],
    ["final-key-5", row => { row.decision = "verified_official_key"; }],
    ["provenance-5", row => { row.derivation_kind = "official_transcription"; }],
    ["q1-true-basis-evidence", row => { row.asset_in_scope_determination_or_null = "unconfirmed"; }],
    ["0-easy-rights", row => { row.expires_at_or_null = "2026-09-06T10:00:00.000Z"; }],
    ["feedback-bundle-0", row => { row.ordered_choice_feedback_rows.pop(); row.ordered_choice_feedback_rows_digest = digest(row.ordered_choice_feedback_rows); }],
  ];
  for (const [id, mutate] of cases) await denied((await economicsReleaseInput((key, row) => { if (id === key) mutate(row); })).input, id);
});

test("formula, graph absence, unit, exact choice projection, chronology and complete assertions are independently consumed", async () => {
  const cases = [
    ["subject-projection-0", row => { row.formula.ordered_input_values_and_units[0].decimal = "3"; }],
    ["subject-projection-0", row => { row.formula.ordered_choice_comparisons[1].quantity.decimal = "7"; }],
    ["subject-projection-0", row => { row.formula.ordered_choice_comparisons[1].quantity.unit = "YEAR"; }],
    ["subject-projection-0", row => { row.formula.ordered_choice_comparisons[1].choice_text_sha256 = digest("other-choice"); }],
    ["subject-projection-0", row => { row.graph_or_null = { graph_present: true }; }],
    ["subject-projection-0", row => { row.question_body_sha256 = digest("other-item"); }],
    ["subject-projection-0", row => { row.exam_date = "2026-04-04"; }],
    ["manifest-0", row => { row.reviewed_at = "2026-09-06T10:00:01.000Z"; }],
    ["validator-app-0-economics_formula_check", row => { row.applicability_status = "verified_not_applicable"; }],
    ["validator-app-0-economics_graph_check", row => { row.feature_facts.graph_present = true; row.feature_facts_digest = digest(row.feature_facts); }],
    ["validator-app-0-economics_unit_check", row => { row.feature_facts.dimensioned_values_present = false; row.feature_facts_digest = digest(row.feature_facts); }],
    ["validator-result-0-economics_formula_check", row => { row.ordered_assertion_rows[0].observed_value_or_null = "forged"; row.ordered_assertion_rows_digest = digest(row.ordered_assertion_rows); }],
    ["validator-pass-0-economics_unit_check", row => { row.failed_assertion_count = 1; }],
    ["validator-derivation-0-economics_formula_check", row => { row.validator_input_facts.expected_result_and_unit.decimal = "7"; row.validator_input_facts_digest = digest(row.validator_input_facts); }],
    ["subject-validator-0", row => { row.deterministic_validator_applicability_receipt_references.splice(1, 1); }],
  ];
  for (const [id, mutate] of cases) await denied((await economicsReleaseInput((key, row) => { if (id === key) mutate(row); })).input, id);
});

test("missing installations, sparse arrays, source bytes, version and legacy disguise cannot use the six-check path", async () => {
  const { input, candidate, normalized } = await economicsReleaseInput();
  for (const change of [x => { x.applicability = []; }, x => { x.applicability[0].dataClass = "human_reviewed_private"; },
    x => { x.applicability[0].packetSha256 = digest("unapproved"); }, x => { x.applicability[0].items.pop(); },
    x => { delete x.applicability[0].items[0].choices[1]; }, x => { x.applicability[0].reviewers[0].classes = ["named_owner_authorized_human_reviewer"]; }]) {
    const altered = { ...input, applicability: structuredClone(input.applicability) }; change(altered); await denied(altered, "installed-boundary");
  }
  for (const change of [x => { x.sourceBinding.questionFileSha256 = digest("wrong-question-source"); },
    x => { x.sourceBinding.keyFileSha256 = digest("wrong-key-source"); }, x => { x.questions[0].stem += "altered"; },
    x => { x.questions[0].reference.questionVersion = "changed-version"; }, x => { x.questions[0].kind = "practice_retry"; }]) {
    const packet = structuredClone(candidate); change(packet);
    const bytes = Buffer.from(JSON.stringify(packet)), sha = createHash("sha256").update(bytes).digest("hex");
    const altered = { ...input, approvals: [{ ...input.approvals[0], packetSha256: sha }],
      applicability: [{ ...input.applicability[0], packetSha256: sha }], readBytes: async () => bytes };
    await denied(altered, "even a coherent six-check file cannot replace the exact final item/source binding");
  }
  const bytes = Buffer.from(JSON.stringify(normalized)), sha = createHash("sha256").update(bytes).digest("hex");
  await denied({ ...input, approvals: [{ ...input.approvals[0], packetSha256: sha }],
    applicability: [{ ...input.applicability[0], packetSha256: sha }], readBytes: async () => bytes }, "legacy-v1-disguise");
});

test("actual server installation remains empty even with client flags, evidence and local content-path claims", async () => {
  const { input, installation } = await economicsReleaseInput(), h = harness();
  const route = privateRoute(h, { contentInput: input });
  for (const fields of [{ verified: true }, { expectedDataClass: "synthetic_test_only" }, { item_kind: "private_modified_retry" },
    { authority: "VERIFIED_TRANSFER" }, { currentness: "verified_exam_date" }]) assert.equal((await route.POST(post({ ...create, ...fields }))).status, 400);
  assert.equal(h.rows.size, 0);
  let opens = 0;
  const runtime = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
    "server-only": {}, "node:path": { default: path }, "node:fs/promises": { async open() { opens++; throw new Error("must-not-read"); } },
    "./economics-content": economicsContent, "./accounting-content": accountingContent, "./remaining-subject-content": remainingContent,
  }, { ...ENVIRONMENT, INVERGE_OWNER_ECONOMICS_CONTENT_PATH: "synthetic-client-path", expectedDataClass: "synthetic_test_only", applicability: JSON.stringify(installation) });
  assert.equal(await runtime.loadApprovedPrivateFirstStageCatalog(), null); assert.equal(opens, 0);
});

test("durable reconnect rechecks installed release revocation and evidence expiry without changing stored learning state", async () => {
  const { input } = await economicsReleaseInput(), catalog = await loadEconomicsContent(input);
  const h = harness({ catalog }), route = privateRoute(h, { contentInput: input });
  const sessionId = (await (await route.POST(post(create))).json()).view.sessionId;
  const begun = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "begin", expectedRevision: 1, questionId: create.questionId } }))).json();
  h.setClock(SUBMIT);
  const saved = await (await route.POST(post({ sessionId, command: submission(begun.view.attempt.attemptId, 2) }))).json();
  assert.ok(saved.view.explanation); const before = JSON.stringify([...h.rows]);
  const invalid = { ...input, applicability: [] }, blocked = privateRoute(harness({ rows: h.rows, catalog }), { contentInput: invalid });
  const response = await blocked.GET(new Request(`${URL}?sessionId=${sessionId}`));
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /EXPLANATION|correctChoice/u);
  assert.equal(JSON.stringify([...h.rows]), before);
  const now = Date.now;
  try {
    Date.now = () => Date.parse("2100-01-01T00:00:00.000Z");
    assert.throws(() => catalog.explanation(catalog.initialReferences[0]));
    assert.equal(await loadEconomicsContent(input), null);
  } finally { Date.now = now; }
  const restored = privateRoute(harness({ rows: h.rows, catalog }), { contentInput: input });
  assert.deepEqual(await (await restored.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  assert.equal(JSON.stringify([...h.rows]), before);
});

test("bounded economics corner comparisons preserve units, tie handling and the legacy four-operator limit", () => {
  const inputs = [{ symbol: "A", decimal: "-2", unit: "COUNT" }, { symbol: "B", decimal: "0", unit: "COUNT" }];
  const evaluate = (expression, values = inputs, enabled = true) => evaluateReviewedArithmetic({
    canonical_formula_expression: JSON.stringify(expression), ordered_input_values_and_units: values,
    declared_rounding_rule: { mode: "none", decimal_places: null } }, enabled).result;
  assert.deepEqual(evaluate({ operator: "maximum", operands: ["A", "B"] }), { decimal: "0", unit: "COUNT" });
  assert.deepEqual(evaluate({ operator: "minimum", operands: ["A", "B"] }), { decimal: "-2", unit: "COUNT" });
  const values = [...inputs, { symbol: "C", decimal: "4", unit: "KRW" }, { symbol: "D", decimal: "3", unit: "KRW" }];
  const expression = { operator: "select_greater", operands: ["A", "B", "C", "D"] };
  assert.deepEqual(evaluate(expression, values), { decimal: "3", unit: "KRW" });
  assert.deepEqual(evaluate(expression, values.map(row => row.symbol === "A" ? { ...row, decimal: "1" } : row)), { decimal: "4", unit: "KRW" });
  assert.deepEqual(evaluate(expression, values.map(row => row.symbol === "A" ? { ...row, decimal: "0" } : row)), { decimal: "3", unit: "KRW" });
  assert.throws(() => evaluate({ operator: "maximum", operands: ["A", "B"] }, inputs, false));
  assert.throws(() => evaluate(expression, values.map(row => row.symbol === "D" ? { ...row, unit: "YEAR" } : row)));
  // Even a non-selected branch is checked; an invalid denominator cannot hide.
  assert.throws(() => evaluate({ operator: "select_greater", operands: ["A", "B", { operator: "divide", operands: ["C", "B"] }, "D"] }, values));
  for (const [comparison, expected] of [["equal", false], ["not_equal", true], ["less", true], ["less_or_equal", true], ["greater", false], ["greater_or_equal", false]])
    assert.equal(compareReviewedQuantities({ decimal: "-2", unit: "COUNT" }, { decimal: "0", unit: "COUNT" }, comparison), expected);
  assert.throws(() => compareReviewedQuantities({ decimal: "2", unit: "COUNT" }, { decimal: "2", unit: "KRW" }, "equal"));
});
