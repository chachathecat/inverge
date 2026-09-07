import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { remainingPacket } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { syntheticContentInput } from "./fixtures/first-stage-economics-content-harness.mjs";
import { civilApplicability } from "./fixtures/first-stage-civil-applicability-harness.mjs";
import { loadCivilLawContent } from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import * as remainingContent from "../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import * as economicsContent from "../lib/review-os/first-stage/runtime/economics-content.ts";
import * as accountingContent from "../lib/review-os/first-stage/runtime/accounting-content.ts";
import { PRE_RELEASE_FIELDS, FOUNDATION_CHOICE_FIELDS, validateCivilApplicability } from "../lib/review-os/first-stage/runtime/foundation-applicability.ts";
import { LAW_PROOF_FIELDS, LAW_HISTORY_FIELDS, LAW_EXTRACTION_FIELDS, LAW_CHAIN_FIELDS } from "../lib/review-os/first-stage/runtime/foundation-law-applicability.ts";
import { privateRoute, compilePrivateSource, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import { harness, submission, SUBMIT } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";

const URL = "http://127.0.0.1/api/review-os/first-stage/civil-law/sessions";
const post = value => new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const create = { action: "create", requestId: "civil-create", questionId: "synthetic-civil-law-q1" };
function input(mutate) {
  const packet = remainingPacket("civil_law"), installed = civilApplicability(packet, mutate);
  return { packet, installed, options: { ...syntheticContentInput(packet), applicability: [installed] } };
}

test("consumer uses existing Foundation exact shapes and digest fields without changing the source contract", () => {
  const foundation = JSON.parse(readFileSync(new globalThis.URL("../config/s235b-first-round-adaptive-mcq-foundation-contract.json", import.meta.url), "utf8"));
  const five = foundation.fiveChoiceCorrectionContract, law = foundation.versionStatusManifests.law.examDateApplicabilityProofContract;
  for (const [actual, expected] of [[PRE_RELEASE_FIELDS, five.preReleaseApplicabilityReceiptShape.requiredFields],
    [FOUNDATION_CHOICE_FIELDS, five.choiceShape.requiredFields], [LAW_PROOF_FIELDS, law.requiredEvidenceFields],
    [LAW_HISTORY_FIELDS, law.officialVersionHistoryReceiptShape.requiredFields],
    [LAW_EXTRACTION_FIELDS, law.officialVersionHistoryExtractionReceiptShape.requiredFields],
    [LAW_CHAIN_FIELDS, law.amendmentChainRecordRequiredFields]]) assert.deepEqual(actual, expected);
  const { installed, packet } = input();
  assert.match(validateCivilApplicability(installed, packet.questions, packet.keys).digest, /^[a-f0-9]{64}$/u);
});

test("civil law: missing Foundation evidence is rejected even with exact six-check synthetic approval", async () => {
  const packet = remainingPacket("civil_law");
  assert.equal(await loadCivilLawContent(syntheticContentInput(packet)), null);
});
test("civil law: trusted server Foundation graph admits the actual content adapter", async () => {
  const packet = remainingPacket("civil_law"), installed = civilApplicability(packet);
  const catalog = await loadCivilLawContent({ ...syntheticContentInput(packet), applicability: [installed] });
  assert.ok(catalog);
  assert.equal(catalog.registry.require("civil_law").subjectId, "civil_law");
});

test("P1 final release: pre-release applicability and six checks alone disclose no question", async () => {
  const { options, installed } = input();
  for (const item of installed.items) delete item.releaseReference;
  assert.equal(await loadCivilLawContent(options), null);
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  const request = post(create), response = await route.POST(request);
  assert.equal(response.status, 503); assert.equal(request.bodyUsed, false);
  assert.equal(route.counts.repository, 0); assert.equal(h.rows.size, 0);
});

test("P2 reproduction: a coherently rehashed sparse five-choice installation is rejected", async () => {
  const { packet, installed } = input(), item = installed.items[0];
  delete item.choices[0];
  const receipt = installed.receipts.find(row => row.receipt_id === item.receiptReference.evidence_id);
  receipt.choice_set_digest = digest({ item_id: receipt.item_id, item_version: receipt.item_version, choices: item.choices });
  receipt.source_anchor_ids_digest = digest([...new Set(item.choices.flatMap(choice => choice.source_anchor_ids))].sort());
  receipt.receipt_sha256 = digest(Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "receipt_sha256")));
  item.receiptReference.evidence_sha256 = receipt.receipt_sha256;
  packet.questions[0].versionEvidence.evidenceSha256 = receipt.receipt_sha256;
  item.questionSha256 = digest(packet.questions[0]);
  const options = syntheticContentInput(packet);
  installed.packetSha256 = options.approvals[0].packetSha256;
  assert.equal(await loadCivilLawContent({ ...options, applicability: [installed] }), null);
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: { ...options, applicability: [installed] } });
  const request = post(create), denied = await route.POST(request);
  assert.equal(denied.status, 503); assert.equal(request.bodyUsed, false);
  assert.deepEqual(await denied.json(), { ok: false, error: "approved_content_required" });
  assert.equal(route.counts.repository, 0); assert.equal(h.rows.size, 0);
});

test("all nested Foundation arrays require own dense JSON values", () => {
  for (const select of [value => value.items, value => value.receipts, value => value.reviewers,
    value => value.reviewers[0].classes, value => value.items[0].choices,
    value => value.items[0].choices[0].source_anchor_ids, value => value.historyExtractionConfigurations]) {
    const { installed, packet } = input();
    delete select(installed)[0];
    assert.throws(() => validateCivilApplicability(installed, packet.questions, packet.keys), /adapter_mismatch/u);
  }
  for (const mutate of [array => { array.extra = "not-a-JSON-index"; },
    array => { array[Symbol("not-JSON")] = true; }, array => { array[0] = undefined; }]) {
    const { installed, packet } = input(); mutate(installed.items[0].choices);
    assert.throws(() => validateCivilApplicability(installed, packet.questions, packet.keys), /adapter_mismatch/u);
  }
});

test("P1 reproduction: nonexistent feedback rights decisions must not admit the actual civil catalog", async () => {
  const { options } = input((id, row) => {
    if (id === "0-explanation-0-body") row.rights_decision_reference = {
      evidence_id: "nonexistent-rights", evidence_version: "1", evidence_sha256: digest("unissued") };
  });
  assert.equal(await loadCivilLawContent(options), null);
});

test("body decisions resolve exact current rights/version/object/private-use bindings before HTTP disclosure", async () => {
  const invalid = [
    ["object_id", "other-object"], ["object_version", "2"], ["object_sha256", digest("other-body")],
    ["item_id", "other-item"], ["item_version", "2"], ["subject_id", "appraiser_related_law"],
    ["authorized_plane", "Reusable Derived Store"], ["authorized_use", "public_distribution"],
    ["authorized_audience", "public"], ["currentness", "revoked"], ["currentness", "unresolved"],
    ["effective_from", "2099-01-01T00:00:00.000Z"], ["expires_at_or_null", "2026-09-06T10:00:00.000Z"],
    ["reviewer", "client-nominated-reviewer"], ["decision", "denied"],
    ["reviewed_at", "2026-09-06T11:00:00.000Z"],
  ];
  const cases = [
    ...["rights", "version"].flatMap(kind => invalid.map(([field, value]) =>
      [`${kind}/${field}/${value}`, `0-explanation-0-${kind}`, row => { row[field] = value; }])),
    ["version exam date", "0-explanation-0-version", row => { row.exam_date = "2026-04-05"; }],
    ["version state", "0-explanation-0-version", row => { row.applicable_version_status = "verified_current"; }],
    ["version proof binding", "0-explanation-0-version", row => { row.component_evidence_references = []; }],
    ["easy explanation denial", "0-easy-rights", row => { row.decision = "denied"; }],
    ["false-choice correction denial", "0-correction-0-version", row => { row.decision = "denied"; }],
    ["last retry choice denial", "2-explanation-4-rights", row => { row.decision = "denied"; }],
    ...["rights_decision_reference", "source_version_decision_reference"].flatMap(field =>
      ["evidence_id", "evidence_version", "evidence_sha256"].map(key =>
        [`unresolved ${field}/${key}`, "0-explanation-0-body", row => {
          row[field] = { ...row[field], [key]: key === "evidence_sha256" ? digest("stale") : "missing-or-stale" };
        }])),
  ];
  for (const [label, target, mutate] of cases) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    assert.equal(await loadCivilLawContent(options), null, label);
    const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
    const request = post(create), denied = await route.POST(request);
    assert.equal(denied.status, 503, label); assert.equal(request.bodyUsed, false, label);
    assert.match(denied.headers.get("cache-control"), /no-store/u);
    assert.deepEqual(await denied.json(), { ok: false, error: "approved_content_required" }, label);
    assert.equal(route.counts.repository, 0, label); assert.equal(h.rows.size, 0, label);
  }
});

test("internally matching rights/version hashes cannot authorize different explanation bytes", async () => {
  const { options } = input((id, row) => {
    // Rehash BOTH decisions and the body reference/root coherently. Only the
    // exact private UTF-8 body binding detects this non-stale hostile graph.
    if (["0-explanation-0-rights", "0-explanation-0-version", "0-explanation-0-body"].includes(id)) {
      row.object_sha256 = digest("not-the-private-explanation-bytes");
    }
  });
  assert.equal(await loadCivilLawContent(options), null);
});

test("expiry while a submission is durably saved discloses nothing and leaves retry state intact", async t => {
  let wallClock = Date.parse("2026-09-07T11:00:00.000Z"), expireOnWrite = false;
  const expires = "2026-09-07T12:00:00.000Z";
  t.mock.method(Date, "now", () => wallClock);
  const { options } = input((id, row) => {
    if (id === "0-easy-rights") row.expires_at_or_null = expires;
  });
  const catalog = await loadCivilLawContent(options); assert.ok(catalog);
  const h = harness({ catalog }), store = { ...h.store, async replace(value, revision) {
    const result = await h.store.replace(value, revision);
    if (expireOnWrite) wallClock = Date.parse(expires);
    return result;
  } };
  const route = privateRoute(h, { subject: "civil_law", contentInput: options, repository: () => store });
  const created = await (await route.POST(post(create))).json(), sessionId = created.view.sessionId;
  const opened = await (await route.POST(post({ sessionId, command: { action: "begin", requestId: "begin",
    expectedRevision: 1, questionId: create.questionId } }))).json();
  assert.equal(opened.view.explanation, null);
  expireOnWrite = true; h.setClock(SUBMIT);
  const command = { sessionId, command: submission(opened.view.attempt.attemptId) };
  const denied = await route.POST(post(command));
  assert.equal(denied.status, 503);
  assert.match(denied.headers.get("cache-control"), /no-store/u);
  assert.doesNotMatch(await denied.text(), /SYNTHETIC_|EXPLANATION|correctChoice|정답/u);
  const saved = JSON.stringify([...h.rows]);
  assert.equal(h.rows.size, 1); assert.equal([...h.rows.values()][0].state.revision, 3);
  assert.doesNotMatch(saved, /SYNTHETIC_|EXPLANATION|정답/u);
  assert.throws(() => catalog.explanation(catalog.initialReferences[0]), /adapter_mismatch/u);
  assert.equal((await route.POST(post(command))).status, 503);
  assert.equal((await route.GET(new Request(`${URL}?sessionId=${sessionId}`))).status, 503);
  assert.equal(JSON.stringify([...h.rows]), saved);
  assert.equal(h.counts.creates, 1); assert.equal(h.counts.replaces, 2);
});

const invalidReceipts = [
  ["cross-subject root", "applicability-0", row => { row.subject_id = "appraiser_related_law"; }],
  ["cross-item root", "applicability-0", row => { row.item_id = "other-item"; }],
  ["stale item version", "applicability-0", row => { row.item_version = "2"; }],
  ["wrong choice digest", "applicability-0", row => { row.choice_set_digest = digest([]); }],
  ["wrong source anchors", "applicability-0", row => { row.source_anchor_ids_digest = digest([]); }],
  ["missing proof", "applicability-0", row => { row.component_evidence_references = []; }],
  ["duplicate proof", "applicability-0", row => { row.component_evidence_references.push(row.component_evidence_references[0]); }],
  ["wrong authority", "applicability-0", row => { row.applicable_authority_ids = ["building_act"]; }],
  ["unreviewed release", "applicability-0", row => { row.decision = "unresolved"; }],
  ["untrusted reviewer", "applicability-0", row => { row.reviewer = "client-nominated-reviewer"; }],
  ["unknown receipt field", "applicability-0", row => { row.clientVerified = true; }],
  ["wrong exam date", "law-proof", row => { row.exam_date = "2025-04-05"; }],
  ["wrong law", "law-proof", row => { row.authority_id = "building_act"; }],
  ["wrong selected interval", "law-proof", row => { row.effective_from = "2026-04-05"; }],
  ["missing predecessor", "law-proof", row => { row.predecessor_version_identity_or_null = null; }],
  ["invented successor", "law-proof", row => { row.successor_version_identity_or_null = "fake-next-version"; }],
  ["incomplete chronology", "law-proof", row => { row.amendment_chain_complete_through_exam_date = false; }],
  ["omitted chronology entry", "law-proof", row => { row.amendment_chain_records = row.amendment_chain_records.slice(1); row.amendment_chain_record_count = 1; row.amendment_chain_records[0].chain_ordinal = 1; row.amendment_chain_digest = digest(row.amendment_chain_records); }],
  ["interval gap", "law-proof", row => { row.amendment_chain_records[0].effective_to_or_null = "2025-12-31"; row.amendment_chain_digest = digest(row.amendment_chain_records); }],
  ["selected raw drift", "law-proof", row => { row.raw_artifact_sha256 = digest("different-bytes"); }],
  ["history projection drift", "history", row => { row.ordered_version_entries = []; row.version_entry_count = 0; row.ordered_version_entries_digest = digest([]); }],
  ["unreviewed history extraction", "extraction", row => { row.decision = "unresolved"; }],
  ["extraction raw drift", "extraction", row => { row.raw_history_sha256 = digest("different-history"); }],
  ["unresolved extraction configuration", "extraction", row => { row.extraction_configuration_digest = digest("unresolved-config"); }],
  ["different configured parser", "extraction", row => { row.extractor_or_parser_version = "different-parser"; }],
  ["extraction reviewed before observation", "extraction", row => { row.reviewed_at = "2026-09-05T00:00:00.000Z"; }],
  ["unofficial transport", "law-1-transport", row => { row.final_url = "https://law.go.kr.attacker.invalid/file"; }],
  ["unofficial redirect", "law-1-transport", row => { row.redirect_urls = ["https://attacker.invalid"]; }],
  ["failed transport", "law-1-transport", row => { row.http_status = 403; }],
  ["empty source", "law-1-transport", row => { row.byte_count = 0; }],
  ["HTML interstitial", "law-1-transport", row => { row.content_type = "text/html"; row.login_error_or_interstitial = true; }],
  ["different official name", "law-1-identity", row => { row.expected_official_name = "다른 법률"; }],
  ["different official identity", "law-1-identity", row => { row.expected_mst_or_lsi_seq = "different-version"; }],
  ["different promulgation", "law-1-identity", row => { row.expected_promulgation_number = "different-number"; }],
  ["different effective date", "law-1-identity", row => { row.expected_effective_date = "2026-02-01"; }],
  ["unrecognized representation", "law-1-identity", row => { row.representation_schema_or_magic_match = false; }],
];
test("rehashed hostile Foundation graphs fail at the actual loader and HTTP before body/storage/disclosure", async () => {
  for (const [label, target, mutate] of invalidReceipts) {
    const { options } = input((id, row) => { if (id === target) mutate(row); });
    assert.equal(await loadCivilLawContent(options), null, label);
    const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
    const request = post(create), denied = await route.POST(request);
    assert.equal(denied.status, 503, label); assert.equal(request.bodyUsed, false, label);
    assert.match(denied.headers.get("cache-control"), /no-store/u);
    assert.deepEqual(await denied.json(), { ok: false, error: "approved_content_required" });
    assert.equal(route.counts.repository, 0); assert.equal(h.rows.size, 0);
  }
});

test("installation tampering, stale immutable references, missing bindings and synthetic class promotion fail closed", async () => {
  for (const mutate of [
    value => { value.installed.receipts[0].http_status = 201; },
    value => { value.installed.receipts.push(value.installed.receipts[0]); },
    value => { value.installed.receipts.splice(0, 1); },
    value => { value.installed.items[0].receiptReference.evidence_version = "stale"; },
    value => { value.installed.items[0].receiptReference.evidence_sha256 = digest("stale"); },
    value => { value.installed.items[0].examDate = "2025-04-05"; },
    value => { value.installed.items[0].questionSha256 = digest("different-question"); },
    value => { value.installed.items[0].choices[0].source_anchor_ids = ["wrong-anchor"]; },
    value => { value.installed.items[0].choices.reverse(); },
    value => { value.installed.items.pop(); },
    value => { value.installed.historyExtractionConfigurations = []; },
    value => { value.installed.historyExtractionConfigurations.push(value.installed.historyExtractionConfigurations[0]); },
    value => { value.installed.reviewers[0].classes = ["named_owner_authorized_human_reviewer"]; },
    value => { value.installed.dataClass = "human_reviewed_private"; },
    value => { delete value.options.expectedDataClass; },
    value => { value.options.approvals = []; },
    value => { value.options.applicability = []; },
  ]) {
    const value = input(); mutate(value);
    assert.equal(await loadCivilLawContent(value.options), null);
  }
});

test("HTTP cannot install a self-authored valid graph; actual runtime ignores test/env approval claims", async () => {
  const { options, installed } = input();
  const h = harness(), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  assert.equal((await route.POST(post({ ...create, applicability: [installed] }))).status, 413);
  for (const forged of [{ ...create, applicability: installed.items[0].receiptReference }, { ...create, verified: true },
    { ...create, currentnessState: "verified_exam_date" }, { ...create, expectedDataClass: "synthetic_test_only" }]) {
    assert.equal((await route.POST(post(forged))).status, 400);
  }
  assert.equal(h.rows.size, 0);
  let opens = 0;
  const runtime = compilePrivateSource("lib/review-os/first-stage/runtime/approved-catalog.ts", {
    "server-only": {}, "node:path": { default: path }, "node:fs/promises": { async open() { opens++; throw new Error("must-not-read"); } },
    "./economics-content": economicsContent, "./accounting-content": accountingContent, "./remaining-subject-content": remainingContent,
  }, { ...ENVIRONMENT, INVERGE_OWNER_CIVIL_LAW_CONTENT_PATH: "synthetic-client-path",
    expectedDataClass: "synthetic_test_only", applicability: JSON.stringify(installed) });
  assert.equal(await runtime.loadApprovedPrivateCivilLawCatalog(), null); assert.equal(opens, 0);
});

test("reconnect revalidates current server evidence and cannot use withdrawn or changed installation", async () => {
  const { options } = input(), catalog = await loadCivilLawContent(options); assert.ok(catalog);
  const h = harness({ catalog }), route = privateRoute(h, { subject: "civil_law", contentInput: options });
  const created = await (await route.POST(post(create))).json(), sessionId = created.view.sessionId;
  const initialRows = JSON.stringify([...h.rows]);
  for (const mutate of [value => { value.applicability = []; }, value => {
    // A changed trusted snapshot is not the catalog under which the session was saved.
    value.applicability[0].reviewers[0].classes.push("named_owner_authorized_human_subject_reviewer");
  }]) {
    const altered = { ...options, applicability: structuredClone(options.applicability) }; mutate(altered);
    const fresh = privateRoute(harness({ rows: h.rows, catalog }), { subject: "civil_law", contentInput: altered });
    const denied = await fresh.GET(new Request(`${URL}?sessionId=${sessionId}`));
    assert.equal(denied.status, 503);
    assert.doesNotMatch(await denied.text(), /SYNTHETIC_|EXPLANATION|correctChoice/u);
    assert.equal(JSON.stringify([...h.rows]), initialRows);
  }
  assert.deepEqual(await (await route.GET(new Request(`${URL}?sessionId=${sessionId}`))).json(), created);
});
