import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { loadAppraiserRelatedLawContent } from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import * as remainingContent from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import * as economicsContent from "../lib/review-os/first-stage/runtime/economics-content.ts";
import * as accountingContent from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import { FIVE, RELATED_LAW_AUTHORITIES } from "../lib/review-os/first-stage/runtime/foundation-release-contract.ts";
import { validateRelatedLawApplicability } from "../lib/review-os/first-stage/runtime/foundation-applicability.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { remainingPacket } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { relatedLawApplicability } from "./fixtures/first-stage-civil-applicability-harness.mjs";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";

const URL = "http://127.0.0.1/api/review-os/first-stage/appraiser-related-law/sessions";
const SUBJECT = "appraiser_related_law";
const create = { action: "create", requestId: "related-create", questionId: "synthetic-appraiser-related-law-q1" };
const post = value => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
function input(mutate, authorities) {
  const packet = remainingPacket(SUBJECT), installed = relatedLawApplicability(packet, mutate, authorities);
  return { packet, installed, options: { ...syntheticContentInput(packet), applicability: [installed] } };
}
async function denied(options, label) {
  assert.equal(await loadAppraiserRelatedLawContent(options), null, label);
  const h = harness(), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  const request = post(create), response = await route.POST(request);
  assert.equal(response.status, 503, label); assert.equal(request.bodyUsed, false, label);
  assert.match(response.headers.get("cache-control"), /no-store/u);
  assert.deepEqual(await response.json(), { ok: false, error: "approved_content_required" }, label);
  assert.equal((await route.GET(new Request(`${URL}?sessionId=existing-session`))).status, 503, label);
  assert.equal(route.counts.repository, 0, label); assert.equal(h.rows.size, 0, label);
}

test("relationship law requires Foundation proof even with six-check synthetic packet approval", async () => {
  const packet = remainingPacket("appraiser_related_law");
  assert.equal(await loadAppraiserRelatedLawContent(syntheticContentInput(packet)), null);
});

test("one, two and all nine supported authorities use the existing derivation and exact complete key contract", async () => {
  for (const authorities of [["building_act"], ["building_act", "national_land_planning_act"], RELATED_LAW_AUTHORITIES.map(row => row.authorityId)]) {
    const { packet, installed, options } = input(undefined, authorities);
    const catalog = await loadAppraiserRelatedLawContent(options); assert.ok(catalog);
    assert.equal(catalog.registry.require(SUBJECT).subjectId, SUBJECT);
    assert.match(validateRelatedLawApplicability(installed, packet.questions, packet.keys).digest, /^[a-f0-9]{64}$/u);
    const table = installed.receipts.find(row => row.receipt_id === "synthetic-official-key-table");
    assert.equal(table.row_count, 200); assert.equal(table.ordered_key_rows.length, 200);
    for (const derivation of installed.receipts.filter(row => row.receipt_id?.startsWith("synthetic-validator-derivation-"))) {
      assert.equal(derivation.validator_input_facts_schema_version,
        FIVE.deterministicValidatorRegistry.definitions.exam_date_multi_law_snapshot.inputProjectionSchemaVersion);
    }
    for (const item of installed.items) {
      const pre = installed.receipts.find(row => row.receipt_id === item.receiptReference.evidence_id);
      assert.deepEqual(pre.applicable_authority_ids, [...authorities].sort());
      assert.equal(pre.component_evidence_references.length, authorities.length);
    }
  }
});

test("coherently rehashed derivation, per-authority proofs and final releases reject incomplete or mixed evidence before HTTP I/O", async () => {
  const cases = [
    ["missing derivation", "applicability-0", row => { row.authority_derivation_receipt_reference_or_null = null; }],
    ["cross subject", "applicability-0", row => { row.subject_id = "civil_law"; }],
    ["missing authority", "applicability-0", row => { row.applicable_authority_ids.pop(); }],
    ["missing proof", "applicability-0", row => { row.component_evidence_references.pop(); }],
    ["duplicate proof", "applicability-0", row => { row.component_evidence_references[1] = row.component_evidence_references[0]; }],
    ["proof order", "applicability-0", row => { row.component_evidence_references.reverse(); }],
    ["stale item", "authority-derivation-0", row => { row.item_id = "different-item"; }],
    ["stale version", "authority-derivation-0", row => { row.item_version = "different-version"; }],
    ["choice drift", "authority-derivation-0", row => { row.choice_set_digest = digest("different-choices"); }],
    ["anchor drift", "authority-derivation-0", row => { row.source_anchor_ids.pop(); row.source_anchor_ids_digest = digest(row.source_anchor_ids); }],
    ["unclassified anchor", "authority-derivation-0", row => { row.unclassified_source_anchor_count = 1; }],
    ["forged reviewer", "authority-derivation-0", row => { row.reviewer = "client-reviewer"; }],
    ["unreviewed mapping", "authority-derivation-0", row => { row.decision = "unresolved"; }],
    ["future mapping review", "authority-derivation-0", row => { row.reviewed_at = "2026-09-06T11:00:00.000Z"; }],
    ["mapping extra fields", "authority-derivation-0", row => { row.source_anchor_to_authority_rows[0].verified = true; row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["missing entire anchor", "authority-derivation-0", row => { row.source_anchor_to_authority_rows = row.source_anchor_to_authority_rows.slice(2); row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["unknown anchor", "authority-derivation-0", row => { row.source_anchor_to_authority_rows[0].source_anchor_id = "not-an-item-anchor"; row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["civil authority forbidden", "authority-derivation-0", row => { row.source_anchor_to_authority_rows[0].authority_id = "civil_code"; row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["unknown authority", "authority-derivation-0", row => { row.source_anchor_to_authority_rows[0].authority_id = "not-a-supported-law"; row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["duplicate mapping", "authority-derivation-0", row => { row.source_anchor_to_authority_rows.splice(1, 0, row.source_anchor_to_authority_rows[0]); row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["mapping order", "authority-derivation-0", row => { row.source_anchor_to_authority_rows.reverse(); row.source_anchor_to_authority_rows_digest = digest(row.source_anchor_to_authority_rows); }],
    ["projection order", "authority-derivation-0", row => { row.applicable_authority_ids.reverse(); }],
    ["another authority proof", "building_act-law-proof", row => { row.authority_id = "national_land_planning_act"; }],
    ["wrong applicable date", "building_act-law-proof", row => { row.exam_date = "2026-04-05"; }],
    ["incomplete chain", "national_land_planning_act-law-proof", row => { row.amendment_chain_complete_through_exam_date = false; }],
    ["history interval gap", "building_act-law-proof", row => { row.amendment_chain_records[0].effective_to_or_null = "2025-12-31"; row.amendment_chain_digest = digest(row.amendment_chain_records); }],
    ["wrong official name", "building_act-law-1-identity", row => { row.expected_official_name = "민법"; }],
    ["unofficial source", "building_act-law-1-transport", row => { row.final_url = "https://www.law.go.kr.attacker.invalid/file"; }],
    ["unreviewed extraction", "national_land_planning_act-extraction", row => { row.decision = "unresolved"; }],
    ["unregistered extraction", "building_act-extraction", row => { row.extraction_configuration_digest = digest("unregistered-parser"); }],
    ["manifest wrong subject", "manifest-0", row => { row.subject_id = "civil_law"; }],
    ["manifest missing proof", "manifest-0", row => { row.component_evidence_references = row.component_evidence_references.slice(0, 1); }],
    ["subject validator mix", "validator-app-0", row => { row.validator_contract_id = "exam_date_law_snapshot"; }],
    ["not applicable bypass", "validator-app-0", row => { row.applicability_status = "not_applicable"; }],
    ["validator authority drift", "validator-derivation-0", row => { row.validator_input_facts.authority_ids = ["civil_code"]; row.validator_input_facts_digest = digest(row.validator_input_facts); }],
    ["unregistered facts schema", "validator-derivation-0", row => { row.validator_input_facts_schema_version = "exam_date_multi_law_snapshot.input-facts.v1"; }],
    ["validator absent cross proof", "validator-derivation-0", row => { row.validator_input_facts.cross_authority_applicability_receipt_references = []; row.validator_input_facts_digest = digest(row.validator_input_facts); }],
    ["forged pass facts", "validator-result-0", row => { row.ordered_assertion_rows[2].observed_value_or_null = false; row.ordered_assertion_rows_digest = digest(row.ordered_assertion_rows); }],
    ["final release unreviewed", "release-0", row => { row.decision = "unresolved"; }],
    ["final release wrong subject", "release-1", row => { row.subject_id = "civil_law"; }],
    ["retry authority escalation", "release-1", row => { row.authority = "VERIFIED_TRANSFER"; }],
    ["retry independent key mismatch", "final-key-1", row => { row.answer_position_1_to_5 = 5; }],
    ["retry original key substitution", "final-key-1", row => { row.decision = "verified_official_key"; }],
    ["original partial 199 table", "official-key-table", row => { row.ordered_key_rows.pop(); row.row_count = 199; row.ordered_key_rows_digest = digest(row.ordered_key_rows); }],
    ["easy body rights denial", "0-easy-rights", row => { row.decision = "denied"; }],
    ["retry feedback source drift", "1-explanation-4-version", row => { row.exam_date = "2026-04-05"; }],
  ];
  for (const [label, target, mutate] of cases) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    await denied(options, label);
  }
});

test("installation identity, dense arrays and subject-specific reviewer classes are required", async () => {
  for (const mutate of [
    value => { value.installed.items[0].questionSha256 = digest("changed body"); },
    value => { value.installed.items[0].examDate = "2025-04-05"; },
    value => { delete value.installed.items[0].releaseReference; },
    value => { delete value.installed.items[0].choices[0]; },
    value => { value.installed.items[0].receiptReference.evidence_version = "changed"; },
    value => { value.installed.receipts.splice(0, 1); },
    value => { value.installed.reviewers[0].classes = ["named_owner_authorized_human_reviewer"]; },
    value => { value.installed.dataClass = "human_reviewed_private"; },
    value => { value.options.approvals = []; },
    value => { value.options.applicability = []; },
    value => { delete value.options.expectedDataClass; },
  ]) {
    const value = input(); mutate(value); await denied(value.options, String(mutate));
  }
});

test("HTTP and environment input cannot install or select a self-authored proof or content class", async () => {
  const { options, installed } = input(), h = harness(), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  assert.equal((await route.POST(post({ ...create, applicability: installed }))).status, 413);
  for (const fields of [{ subjectId: "civil_law" }, { item_kind: "private_modified_retry" }, { verified: true },
    { currentness: "verified_exam_date" }, { expectedDataClass: "synthetic_test_only" }, { authorityIds: ["building_act"] }]) {
    assert.equal((await route.POST(post({ ...create, ...fields }))).status, 400);
  }
  assert.equal(h.rows.size, 0);
  let opens = 0;
  const runtime = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
    "server-only": {}, "node:path": { default: path }, "node:fs/promises": { async open() { opens++; throw new Error("must-not-read"); } },
    "./economics-content": economicsContent, "./accounting-content": accountingContent, "./remaining-subject-content": remainingContent,
  }, { ...ENVIRONMENT, INVERGE_OWNER_APPRAISER_RELATED_LAW_CONTENT_PATH: "synthetic-client-path",
    expectedDataClass: "synthetic_test_only", applicability: JSON.stringify(installed) });
  assert.equal(await runtime.loadApprovedPrivateAppraiserRelatedLawCatalog(), null); assert.equal(opens, 0);
});

test("durable related-law HTTP disclosure binds final attributions and revalidates evidence at reconnect", async () => {
  const { options } = input(), catalog = await loadAppraiserRelatedLawContent(options); assert.ok(catalog);
  const h = harness({ catalog }), route = privateRoute(h, { subject: SUBJECT, contentInput: options });
  const initial = await Promise.all([route.POST(post(create)), route.POST(post(create))]);
  const created = await initial[0].json(); assert.deepEqual(await initial[1].json(), created);
  assert.doesNotMatch(JSON.stringify(created), /SYNTHETIC_|EXPLANATION|correctChoice/u);
  const sessionId = created.view.sessionId;
  const opened = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "begin",
    expectedRevision: 1, questionId: create.questionId } }))).json();
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
  const persisted = JSON.stringify([...h.rows]);
  assert.equal(h.rows.size, 1); assert.doesNotMatch(persisted, /EXPLANATION|correctChoice|SYNTHETIC_/u);
  const fresh = privateRoute(harness({ rows: h.rows, catalog }), { subject: SUBJECT, contentInput: options });
  assert.deepEqual(await (await fresh.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), saved);
  for (const mutate of [value => { value.applicability = []; }, value => {
    value.applicability[0].receipts.find(row => row.receipt_id === "synthetic-authority-derivation-0").decision = "unresolved";
  }, value => { value.applicability[0].reviewers[0].classes.pop(); }]) {
    const altered = { ...options, applicability: structuredClone(options.applicability) }; mutate(altered);
    const withdrawn = privateRoute(harness({ rows: h.rows, catalog }), { subject: SUBJECT, contentInput: altered });
    const response = await withdrawn.GET(new Request(`${URL}?sessionId=${sessionId}`));
    assert.equal(response.status, 503); assert.match(response.headers.get("cache-control"), /no-store/u);
    assert.doesNotMatch(await response.text(), /EXPLANATION|correctChoice|SYNTHETIC_/u);
    assert.equal(JSON.stringify([...h.rows]), persisted);
  }
});
