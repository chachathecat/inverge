import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import * as remainingContent from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import * as economicsContent from "../lib/review-os/first-stage/runtime/economics-content.ts";
import * as accountingContent from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import { foundationEvidence, validateRealEstateApplicability } from "../lib/review-os/first-stage/runtime/foundation-applicability.ts";
import { realEstateFacts } from "../lib/review-os/first-stage/runtime/foundation-real-estate-facts.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { realEstateApplicability } from "./fixtures/first-stage-real-estate-applicability-harness.mjs";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";
import { loadRealEstatePrinciplesContent } from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import { remainingPacket } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";

test("real estate requires Foundation subject evidence beyond generic synthetic packet approval", async () => {
  assert.equal(await loadRealEstatePrinciplesContent(syntheticContentInput(remainingPacket("real_estate_principles"))), null);
});

const SUBJECT = "real_estate_principles", URL = "http://127.0.0.1/api/review-os/first-stage/real-estate-principles/sessions";
const create = { action: "create", requestId: "estate-create", questionId: "synthetic-real-estate-principles-q1" };
const post = value => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const C = "real_estate_source_grounded_concept_check", K = "real_estate_calculation_check";
function input(mutate, mode) {
  const packet = remainingPacket(SUBJECT), installed = realEstateApplicability(packet, mutate, mode);
  return { packet, installed, options: { ...syntheticContentInput(packet), applicability: [installed] } };
}
async function denied(options, label) {
  assert.equal(await loadRealEstatePrinciplesContent(options), null, label);
  const h = harness(), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  const request = post(create), response = await route.POST(request);
  assert.equal(response.status, 503, label); assert.equal(request.bodyUsed, false, label);
  assert.match(response.headers.get("cache-control"), /no-store/u);
  assert.deepEqual(await response.json(), { ok: false, error: "approved_content_required" }, label);
  assert.equal((await route.GET(new Request(`${URL}?sessionId=existing`))).status, 503, label);
  assert.equal(route.counts.repository, 0, label); assert.equal(h.rows.size, 0, label);
}

test("concept-only, calculation-only and combined items require the exact applicability matrix and final original/retry keys", async () => {
  for (const mode of ["concept", "calculation", "both"]) {
    const { packet, installed, options } = input(undefined, mode);
    const catalog = await loadRealEstatePrinciplesContent(options); assert.ok(catalog, mode);
    assert.match(validateRealEstateApplicability(installed, packet.questions, packet.keys).digest, /^[a-f0-9]{64}$/u);
    const table = installed.receipts.find(row => row.receipt_id === "synthetic-official-key-table");
    assert.equal(table.row_count, 200); assert.equal(table.ordered_key_rows.length, 200);
    for (const item of installed.items) {
      const pre = installed.receipts.find(row => row.receipt_id === item.receiptReference.evidence_id);
      assert.deepEqual(pre.applicable_authority_ids, []); assert.equal(pre.authority_derivation_receipt_reference_or_null, null);
      assert.equal(pre.component_evidence_references.length, 1);
      const subject = installed.receipts.find(row => row.receipt_id === pre.component_evidence_references[0].evidence_id);
      assert.equal(subject.deterministic_validator_applicability_receipt_references.length, 2);
      assert.equal(subject.deterministic_validator_receipt_references.length, mode === "both" ? 2 : 1);
    }
  }
});

test("rehashed subject/source/body/feature/validator and final-release forgeries fail before HTTP body or storage", async () => {
  const cases = [
    ["wrong subject", "subject-projection-0", r => { r.subject_id = "economics_principles"; }],
    ["wrong item", "subject-projection-0", r => { r.item_id = "another-item"; }],
    ["wrong version", "subject-projection-0", r => { r.item_version = "other-version"; }],
    ["wrong date", "subject-projection-0", r => { r.exam_date = "2025-04-05"; }],
    ["changed body", "subject-projection-0", r => { r.question_body_sha256 = digest("another body"); }],
    ["changed choices", "subject-projection-0", r => { r.choice_texts_sha256 = digest("other choices"); }],
    ["changed concept", "subject-projection-0", r => { r.concept_binding_digest = digest("other concept"); }],
    ["missing anchors", "subject-projection-0", r => { r.source_anchor_ids.pop(); }],
    ["unknown reviewer", "subject-projection-0", r => { r.reviewer = "client-reviewer"; }],
    ["generic review insufficient", "subject-projection-0", r => { r.decision = "approved_owner_private_learning"; }],
    ["future evidence", "subject-projection-0", r => { r.reviewed_at = "2026-09-06T11:00:00.000Z"; }],
    ["wrong rights source", "subject-projection-0", r => { r.source_asset_rights_receipt_reference = r.source_post_rights_receipt_reference; }],
    ["no domain tasks", "subject-projection-0", r => { r.concept_or_null = null; r.calculation_or_null = null; }],
    ["unknown field", "subject-projection-0", r => { r.verified = true; }],
    ["choice binding", "subject-projection-0", r => { r.concept_or_null.ordered_choice_claims[0].choice_text_sha256 = digest("wrong"); }],
    ["ambiguous concept", "subject-projection-0", r => { r.concept_or_null.canonical_concept_relations.forEach(x => { x.holds = true; }); }],
    ["unresolved relation", "subject-projection-0", r => { r.concept_or_null.ordered_choice_claims[0].relation_id = "absent"; }],
    ["foreign anchor", "subject-projection-0", r => { r.concept_or_null.canonical_concept_relations[0].source_anchor_ids = ["not-a-source-anchor"]; }],
    ["noncanonical unit", "subject-projection-0", r => { r.calculation_or_null.ordered_input_values_and_units[0].unit = "USD"; }],
    ["unused input", "subject-projection-0", r => { r.calculation_or_null.ordered_input_values_and_units.push({ symbol: "Z", decimal: "1", unit: "1" }); }],
    ["fabricated calculation answer", "subject-projection-0", r => { r.calculation_or_null.ordered_input_values_and_units[0].decimal = "4"; }],
    ["ambiguous calculation choices", "subject-projection-0", r => { r.calculation_or_null.ordered_choice_values.forEach(x => { x.decimal = "6"; }); }],
    ["wrong manifest", "manifest-0", r => { r.subject_id = "civil_law"; }],
    ["manifest no input", "manifest-0", r => { r.component_evidence_references = []; }],
    ["subject no passes", "subject-validator-0", r => { r.deterministic_validator_receipt_references = []; }],
    ["subject no applicability", "subject-validator-0", r => { r.deterministic_validator_applicability_receipt_references.pop(); }],
    ["subject duplicate passes", "subject-validator-0", r => { r.deterministic_validator_receipt_references[1] = r.deterministic_validator_receipt_references[0]; }],
    ["wrong pre branch", "applicability-0", r => { r.receipt_kind = "law_exam_date_bundle"; }],
    ["invented law authority", "applicability-0", r => { r.applicable_authority_ids = ["civil_code"]; }],
    ["missing subject", "release-0", r => { r.subject_validator_receipt_reference_or_null = null; }],
    ["not final approved", "release-0", r => { r.decision = "verified_pre_release_applicability"; }],
    ["partial official key", "official-key-table", r => { r.ordered_key_rows.pop(); r.row_count = 199; r.ordered_key_rows_digest = digest(r.ordered_key_rows); }],
    ["retry wrong key", "final-key-1", r => { r.answer_position_1_to_5 = 5; }],
    ["retry claims official", "final-key-1", r => { r.decision = "verified_official_key"; }],
    ["retry claims transfer", "release-1", r => { r.authority = "VERIFIED_TRANSFER"; }],
    ["source revoked", "q1-asset-rights", r => { r.decision = "denied"; }],
    ["body version mixed", "0-easy-version", r => { r.decision = "verified_in_force_on_exam_date"; }],
    ["body version predates its exact source input", "0-easy-version", r => { r.reviewed_at = "2026-09-06T09:59:00.000Z"; }],
    ["feedback version drift", "1-explanation-4-version", r => { r.exam_date = "2026-04-05"; }],
    ["self-selected N/A", `validator-app-0-${K}`, r => { r.applicability_status = "verified_not_applicable"; r.feature_facts.calculation_or_formula_present = false; r.feature_facts_digest = digest(r.feature_facts); }],
    ["wrong validator", `validator-app-0-${C}`, r => { r.validator_contract_id = "economics_concept_check"; }],
    ["unregistered facts schema", `validator-derivation-0-${K}`, r => { r.validator_input_facts_schema_version = "client-facts.v1"; }],
    ["self-authored result", `validator-derivation-0-${K}`, r => { r.validator_input_facts.expected_result_and_unit = { decimal: "42", unit: "KRW" }; r.validator_input_facts_digest = digest(r.validator_input_facts); }],
    ["invented successful assertion", `validator-result-0-${C}`, r => { r.ordered_assertion_rows[0].observed_value_or_null = false; r.ordered_assertion_rows_digest = digest(r.ordered_assertion_rows); }],
    ["future pass", `validator-pass-0-${K}`, r => { r.reviewed_at = "2026-09-06T11:00:00.000Z"; }],
  ];
  for (const [label, target, mutate] of cases) {
    const value = input((id, row) => { if (id === target) mutate(row); }); await denied(value.options, label);
  }
});

test("dense arrays, exact installation and specific subject review are mandatory", async () => {
  for (const mutate of [
    v => { delete v.installed.items[0].choices[0]; }, v => { v.installed.receipts.pop(); },
    v => { v.installed.items[0].questionSha256 = digest("changed version"); },
    v => { v.installed.reviewers[0].classes = ["named_owner_authorized_human_reviewer"]; },
    v => { v.installed.receipts.find(r => r.receipt_id === "synthetic-subject-projection-0").decision = "unreviewed"; },
    v => { v.options.applicability = []; }, v => { v.options.approvals = []; },
    v => { delete v.options.expectedDataClass; }, v => { v.installed.dataClass = "human_reviewed_private"; },
  ]) { const value = input(); mutate(value); await denied(value.options, String(mutate)); }
});

test("actual bounded arithmetic computes exact units and explicit rounding, rejecting unsupported or ambiguous expressions", () => {
  const evaluate = (operator, a, b, rounding, result, units = ["KRW", "KRW", "KRW"]) => {
    const { packet, installed } = input((id, row) => {
      if (id !== "subject-projection-0") return;
      row.calculation_or_null.canonical_formula_expression = JSON.stringify({ operator, operands: ["A", "B"] });
      row.calculation_or_null.ordered_input_values_and_units = [{ symbol: "A", decimal: a, unit: units[0] }, { symbol: "B", decimal: b, unit: units[1] }];
      row.calculation_or_null.declared_rounding_rule = rounding;
      row.calculation_or_null.ordered_choice_values.forEach((choice, i) => {
        choice.decimal = i + 1 === 2 ? result : String(i + 100); choice.unit = units[2];
      });
    }, "calculation");
    const ref = installed.receipts.find(r => r.receipt_id === "synthetic-manifest-0").component_evidence_references[0];
    return realEstateFacts(foundationEvidence(installed), ref, packet.questions[0], installed.items[0].choices).values.get(K).facts.expected_result_and_unit;
  };
  const none = { mode: "none", decimal_places: null };
  for (const [operator, a, b, round, expected, units] of [
    ["add", "0.1", "0.2", none, "0.3"], ["subtract", "2", "3", none, "-1"],
    ["multiply", "1.25", "4", none, "5", ["COUNT", "COUNT^-1*KRW", "KRW"]],
    ["divide", "1", "3", { mode: "half_up", decimal_places: 2 }, "0.33", ["KRW", "COUNT", "COUNT^-1*KRW"]],
    ["divide", "-1", "8", { mode: "half_up", decimal_places: 2 }, "-0.13", ["KRW", "1", "KRW"]],
    ["divide", "-1", "8", { mode: "toward_zero", decimal_places: 2 }, "-0.12", ["KRW", "1", "KRW"]],
  ]) assert.deepEqual(evaluate(operator, a, b, round, expected, units), { decimal: expected, unit: units?.[2] ?? "KRW" });
  for (const args of [["divide", "1", "0", none, "0"], ["divide", "1", "3", none, "0.33"],
    ["power", "2", "3", none, "8"], ["add", "1", "2", none, "3", ["KRW", "YEAR", "KRW"]],
    ["add", "01", "2", none, "3"], ["add", "1", "2", { mode: "implicit", decimal_places: 2 }, "3"]]) {
    assert.throws(() => evaluate(...args));
  }
});

test("HTTP input and environment cannot install synthetic subject or content approval", async () => {
  const { options, installed } = input(), h = harness(), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  assert.equal((await route.POST(post({ ...create, applicability: installed }))).status, 413);
  for (const fields of [{ subjectId: "economics_principles" }, { verified: true }, { currentness: "verified_exam_date" },
    { expectedDataClass: "synthetic_test_only" }, { calculation_or_formula_present: false }, { item_kind: "private_modified_retry" }]) {
    assert.equal((await route.POST(post({ ...create, ...fields }))).status, 400);
  }
  assert.equal(h.rows.size, 0);
  let opens = 0;
  const runtime = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
    "server-only": {}, "node:path": { default: path }, "node:fs/promises": { async open() { opens++; throw new Error("must-not-read"); } },
    "./economics-content": economicsContent, "./accounting-content": accountingContent, "./remaining-subject-content": remainingContent,
  }, { ...ENVIRONMENT, INVERGE_OWNER_REAL_ESTATE_PRINCIPLES_CONTENT_PATH: "synthetic-client-path",
    expectedDataClass: "synthetic_test_only", applicability: JSON.stringify(installed) });
  assert.equal(await runtime.loadApprovedPrivateRealEstatePrinciplesCatalog(), null); assert.equal(opens, 0);
});

test("durable HTTP disclosure and reconnect revalidate the exact final subject evidence", async () => {
  const { options } = input(), catalog = await loadRealEstatePrinciplesContent(options); assert.ok(catalog);
  const h = harness({ catalog }), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  const initial = await Promise.all([route.POST(post(create)), route.POST(post(create))]);
  const created = await initial[0].json(); assert.deepEqual(await initial[1].json(), created);
  assert.doesNotMatch(JSON.stringify(created), /SYNTHETIC_|EXPLANATION|correctChoice/u);
  const sessionId = created.view.sessionId;
  const opened = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "begin", expectedRevision: 1, questionId: create.questionId } }))).json();
  assert.equal(opened.view.explanation, null);
  assert.deepEqual(opened.view.questionAttributions, catalog.questionAttributions(catalog.initialReferences[0]));
  h.setClock(SUBMIT); h.failNextWrite();
  const command = { sessionId, command: submission(opened.view.attempt.attemptId) };
  const failed = await route.POST(post(command)); assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /EXPLANATION|correctChoice|정답/u);
  const saves = await Promise.all([route.POST(post(command)), route.POST(post(command))]);
  const saved = await saves[0].json(); assert.deepEqual(await saves[1].json(), saved);
  assert.deepEqual(saved.view.explanation.attributions, catalog.explanation(catalog.initialReferences[0]).attributions);
  assert.equal(saved.view.masteryClaim, false); assert.equal(saved.view.transferEvidence, false);
  const persisted = JSON.stringify([...h.rows]); assert.equal(h.rows.size, 1);
  assert.doesNotMatch(persisted, /EXPLANATION|correctChoice|SYNTHETIC_/u);
  const fresh = privateRoute(harness({ rows: h.rows, catalog }), { subject: SUBJECT, contentInput: options });
  assert.deepEqual(await (await fresh.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  for (const mutate of [v => { v.applicability = []; }, v => {
    v.applicability[0].receipts.find(r => r.receipt_id === "synthetic-subject-projection-0").decision = "unresolved";
  }, v => { v.applicability[0].reviewers[0].classes.shift(); }]) {
    const altered = { ...options, applicability: structuredClone(options.applicability) }; mutate(altered);
    const blocked = privateRoute(harness({ rows: h.rows, catalog }), { subject: SUBJECT, contentInput: altered });
    const response = await blocked.GET(new Request(`${URL}?sessionId=${sessionId}`));
    assert.equal(response.status, 503); assert.match(response.headers.get("cache-control"), /no-store/u);
    assert.doesNotMatch(await response.text(), /EXPLANATION|correctChoice|SYNTHETIC_/u);
    assert.equal(JSON.stringify([...h.rows]), persisted);
  }
});
