import { createHash } from "node:crypto";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";
import { finalReleaseFixture } from "./first-stage-final-release-harness.mjs";

// Fictional metadata only. No law text, source retrieval or human review occurred.
// These objects enter the same consumer through server dependency injection;
// they are never installed by approved-catalog.ts or accepted from HTTP.
const HUMAN = "synthetic-not-a-human-law-review";
const REVIEWED = "2026-09-06T10:00:00.000Z";
export const LAW_MANIFEST = "appraiser.first.law.2026-04-04.contract.v1";
export const EXAM_DATE = "2026-04-04";
export function civilApplicability(packet, mutate = () => {}) {
  const receipts = [];
  const add = (id, fields, proof = false) => {
    const prefix = proof ? "proof_receipt" : "receipt";
    const row = { [`${prefix}_id`]: `synthetic-${id}`, [`${prefix}_version`]: "1", ...fields };
    mutate(id, row);
    row[`${prefix}_sha256`] = digest(row); receipts.push(row);
    return { evidence_id: row[`${prefix}_id`], evidence_version: row[`${prefix}_version`], evidence_sha256: row[`${prefix}_sha256`] };
  };
  const historyUrl = "https://www.law.go.kr/synthetic-history-not-a-source";
  const transport = (id, url, raw) => add(`${id}-transport`, {
    requested_url: url, final_url: url, redirect_urls: [], http_status: 200,
    content_type: "application/xml", byte_count: 123, raw_artifact_sha256: raw,
    login_error_or_interstitial: false,
  });
  const identity = (id, version, number, from, raw) => add(`${id}-identity`, {
    expected_official_name: "민법", expected_mst_or_lsi_seq: version,
    expected_promulgation_number: number, expected_effective_date: from,
    representation_schema_or_magic_match: true, raw_artifact_sha256: raw,
  });
  const chain = ["2024-01-01", "2026-01-01"].map((from, index, dates) => {
    const version = `synthetic-civil-version-${index}`;
    const raw = digest(`synthetic-artifact-${index}`);
    const url = `https://www.law.go.kr/synthetic-version-${index}-not-a-source`;
    return { chain_ordinal: index + 1, version_identity: version, official_version_url: url,
      promulgation_number: `synthetic-number-${index}`, promulgation_date: from,
      effective_from: from, effective_to_or_null: dates[index + 1] ?? null, raw_artifact_sha256: raw,
      transport_receipt: transport(`law-${index}`, url, raw),
      content_identity_receipt: identity(`law-${index}`, version, `synthetic-number-${index}`, from, raw),
      amendment_disposition: "synthetic-history-entry" };
  });
  const entries = chain.map(({ version_identity, promulgation_number, promulgation_date, effective_from, effective_to_or_null }) =>
    ({ version_identity, promulgation_number, promulgation_date, effective_from, effective_to_or_null }));
  const rawHistory = digest("synthetic-history-bytes-not-an-official-file");
  const historyTransport = transport("history", historyUrl, rawHistory);
  const historyIdentity = identity("history", "synthetic-history", "synthetic-history", EXAM_DATE, rawHistory);
  const configuration = { extraction_method: "synthetic_test_only", extractor_or_parser_version: "synthetic-parser-v1",
    schema_selectors: ["synthetic-ordered-entry"], pagination: ["synthetic-single-page-exhausted"],
    completeness_rules: ["synthetic-official-entry-projection-exact-no-omissions"] };
  const extraction = add("extraction", { authority_id: "civil_code", official_version_history_url: historyUrl,
    raw_history_sha256: rawHistory, extraction_method: "synthetic_test_only",
    extractor_or_parser_version: "synthetic-parser-v1", extraction_configuration_digest: digest(configuration),
    version_entry_count: entries.length, ordered_version_entries: entries, ordered_version_entries_digest: digest(entries),
    reviewer: HUMAN, reviewed_at: REVIEWED, decision: "verified_complete_history_extraction" });
  const history = add("history", { authority_id: "civil_code", official_version_history_url: historyUrl,
    retrieved_at: REVIEWED, raw_history_sha256: rawHistory, transport_receipt_reference: historyTransport,
    content_identity_receipt_reference: historyIdentity, version_entry_count: entries.length,
    ordered_version_entries: entries, ordered_version_entries_digest: digest(entries),
    history_extraction_receipt_reference: extraction, reviewer: HUMAN, reviewed_at: REVIEWED,
    decision: "verified_complete_official_history_through_exam_date" });
  const selected = chain[1];
  const proof = add("law-proof", { authority_id: "civil_code", selected_version_identity: selected.version_identity,
    official_version_history_url: historyUrl, official_version_history_receipt: history,
    predecessor_version_identity_or_null: chain[0].version_identity, successor_version_identity_or_null: null,
    effective_from: selected.effective_from, effective_to_or_null: selected.effective_to_or_null,
    exam_date: EXAM_DATE, raw_artifact_sha256: selected.raw_artifact_sha256,
    transport_receipt: selected.transport_receipt, content_identity_receipt: selected.content_identity_receipt,
    amendment_chain_record_count: chain.length, amendment_chain_records: chain, amendment_chain_digest: digest(chain),
    amendment_chain_complete_through_exam_date: true, reviewer: HUMAN, reviewed_at: REVIEWED,
    decision: "verified_in_force_on_exam_date" }, true);
  const bodyRefs = [];
  const items = packet.questions.map((row, index) => {
    row.reference.sourceVersionManifestIds = [LAW_MANIFEST];
    row.reference.sessionId = "first_2026_session_1";
    const bodyRef = (id, body) => {
      const binding = { object_id: `synthetic-${index}-${id}`, object_version: "1",
        object_sha256: createHash("sha256").update(body, "utf8").digest("hex"),
        item_id: row.reference.questionId, item_version: row.reference.questionVersion, subject_id: "civil_law",
        authorized_plane: "Personal Raw Vault", authorized_use: "personal_service_processing", authorized_audience: "owner_user_private",
        effective_from: REVIEWED, expires_at_or_null: "2099-12-31T00:00:00.000Z", currentness: "verified_current",
        exact_attribution: `Synthetic ${index}-${id} attribution — not actual reviewed content`, reviewer: HUMAN, reviewed_at: REVIEWED };
      const rights = add(`${index}-${id}-rights`, { ...binding, decision: "approved_owner_private_use" });
      const version = add(`${index}-${id}-version`, { ...binding, exam_date: EXAM_DATE,
        applicable_version_status: "law_exam_date_verified", component_evidence_references: [proof], decision: "verified_in_force_on_exam_date" });
      const ref = { object_id: binding.object_id, object_version: binding.object_version, object_sha256: binding.object_sha256,
        authorized_plane: "Personal Raw Vault", rights_decision_reference: rights, source_version_decision_reference: version };
      mutate(`${index}-${id}-body`, ref);
      return ref;
    };
    bodyRefs.push(bodyRef);
    const choices = row.choices.map((_, i) => ({ choice_id: `synthetic-choice-${i + 1}`, position_1_to_5: i + 1,
      verdict_true_false_or_unresolved: i + 1 === row.correctChoice ? "true" : "false",
      correction_status: i + 1 === row.correctChoice ? "verified_no_correction" : "verified_correction_available",
      correction_reference_or_null: i + 1 === row.correctChoice ? null : bodyRef(`correction-${i}`, row.choiceExplanations[i]),
      explanation_status: "draft_private", explanation_reference_or_null: bodyRef(`explanation-${i}`, row.choiceExplanations[i]),
      source_anchor_ids: [`synthetic-civil-anchor-${index}-${i}`], law_or_kifrs_version_status: "law_exam_date_verified",
      uncertainty_codes: [] }));
    const anchors = choices.flatMap(choice => choice.source_anchor_ids).sort();
    const easyExplanationReference = bodyRef("easy", row.easyExplanation);
    const receipt = add(`applicability-${index}`, { item_id: row.reference.questionId, item_version: row.reference.questionVersion,
      subject_id: "civil_law", choice_set_digest: digest({ item_id: row.reference.questionId, item_version: row.reference.questionVersion, choices }),
      source_anchor_ids_digest: digest(anchors), receipt_kind: "law_exam_date_bundle", applicable_authority_ids: ["civil_code"],
      authority_derivation_receipt_reference_or_null: null, component_evidence_references: [proof],
      applicable_version_status: "law_exam_date_verified", reviewer: HUMAN, reviewed_at: REVIEWED,
      decision: "verified_pre_release_applicability" });
    row.versionEvidence = { schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: receipt.evidence_id,
      evidenceVersion: receipt.evidence_version, evidenceSha256: receipt.evidence_sha256 };
    packet.keys[index].questionReferenceSha256 = digest(row.reference);
    return { questionSha256: digest(row), examDate: EXAM_DATE, choices, easyExplanationReference, receiptReference: receipt };
  });
  const sourceObservations = finalReleaseFixture(packet, items, receipts, add, bodyRefs);
  return { packetSha256: createHash("sha256").update(JSON.stringify(packet)).digest("hex"), dataClass: "synthetic_test_only",
    items, receipts, sourceObservations, historyExtractionConfigurations: [configuration], reviewers: [{ identity: HUMAN, classes: ["named_owner_authorized_human_law_reviewer",
      "named_owner_authorized_human_subject_or_version_reviewer", "named_owner_authorized_human_rights_reviewer", "named_owner_authorized_human_reviewer",
      "named_owner_authorized_human_content_reviewer", "named_owner_authorized_human_subject_reviewer", "named_owner_authorized_human_answer_key_reviewer"] }] };
}
