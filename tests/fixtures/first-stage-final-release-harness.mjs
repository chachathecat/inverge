import { createHash } from "node:crypto";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";
import { FIVE, RIGHTS, PRIVATE_USE, RETRY_RELEASE_VERSION } from "../../lib/review-os/first-stage/runtime/foundation-release-contract.ts";
import { CIVIL_DERIVATION, RELATED_LAW_DERIVATION } from "../../lib/review-os/first-stage/runtime/foundation-release-validation.ts";

// SYNTHETIC metadata, never source documents, actual review or installable stock.
const HUMAN = "synthetic-not-a-human-law-review", AT = "2026-09-06T10:00:00.000Z";
const UNTIL = "2099-12-31T00:00:00.000Z", ROUND = "appraiser_2026_round_37_first";
const SUBJECTS = ["civil_law", "economics_principles", "real_estate_principles", "appraiser_related_law", "accounting"];
const session = subject => `first_2026_session_${SUBJECTS.indexOf(subject) < 3 ? 1 : 2}`;
const packetRef = ref => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: ref.evidence_id,
  evidenceVersion: ref.evidence_version, evidenceSha256: ref.evidence_sha256 });

export function finalReleaseSources(packet, receipts, add, historical2025 = false) {
  const roundId = historical2025 ? "appraiser_2025_round_36_first" : ROUND;
  const sessionId = subject => historical2025 ? `qnet-2025-36-s${SUBJECTS.indexOf(subject) < 3 ? 1 : 2}-A` : session(subject);
  const number = (subject, i) => historical2025 ? (SUBJECTS.indexOf(subject) < 3 ? SUBJECTS.indexOf(subject) : SUBJECTS.indexOf(subject) - 3) * 40 + i + 1 : i + 1;
  // Malformed negative fixtures must reach the consumer, not crash while the
  // fixture links attribution. This placeholder grants nothing and is not a receipt.
  const get = ref => receipts.find(row => row.receipt_id === ref?.evidence_id || row.proof_receipt_id === ref?.evidence_id) ?? { exact_attribution: null };
  function rights(id, asset, parent = null) {
    const postId = historical2025 ? (id === "key" ? "5246129" : "5231525") : `synthetic-${id}-post`, assetId = asset ? `synthetic-${id}-asset` : null;
    const raw = digest(`synthetic-${id}-${asset ? "asset" : "post"}-bytes`);
    const attribution = `Synthetic ${id} ${asset ? "asset" : "post"} attribution\nNot real source evidence.`;
    const policyUrl = `https://policy.example.test/synthetic/${id}/${asset ? "asset" : "post"}`;
    const basisRaw = digest(policyUrl);
    const observationTransport = add(`${id}-${asset}-basis-transport`, { requested_url: policyUrl, final_url: policyUrl, http_status: 200,
      content_type: "text/html", byte_count: 222, raw_artifact_sha256: basisRaw, retrieved_at: AT });
    const observationIdentity = add(`${id}-${asset}-basis-identity`, { representation_url: policyUrl, mime_type: "text/html", byte_count: 222,
      raw_artifact_sha256: basisRaw, label_or_terms_locator: "synthetic-specific-scope" });
    const observed = add(`${id}-${asset}-basis-evidence`, { evidence_kind: "authoritative_owner_private_policy",
      source_post_id: postId, source_asset_id_or_null: assetId, authoritative_representation_url: policyUrl,
      label_or_terms_locator: "synthetic-specific-scope", observed_at: AT, retrieved_at: AT, mime_type: "text/html",
      byte_count: 222, raw_evidence_sha256: basisRaw, transport_receipt_reference: observationTransport, content_identity_receipt_reference: observationIdentity,
      parent_post_rights_receipt_reference_or_null: parent, asset_in_scope_determination_or_null: asset ? "parent_post_basis_explicitly_covers_this_asset" : null,
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_current_basis_evidence" });
    const basis = add(`${id}-${asset}-basis`, { source_post_id: postId, source_asset_id_or_null: assetId, source_content_sha256: raw,
      basis_type: "owner_private_processing_basis", official_label_or_terms_url: null, basis_evidence_reference: observed,
      basis_evidence_observed_at: AT, basis_evidence_raw_sha256: basisRaw, label_or_terms_locator: "synthetic-specific-scope",
      allowed_scope_tuples: [PRIVATE_USE], exact_attribution: attribution, effective_from: AT, expires_at_or_null: UNTIL,
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_exact_primary_rights_basis" });
    const url = `https://www.q-net.or.kr/synthetic-not-a-source/${id}/${asset ? "asset.pdf" : "post"}`;
    const mime = asset ? "application/pdf" : "text/html";
    const transport = { http_status: 200, requested_url: url, final_url: url, official_host_verified: true, content_type: mime, retrieved_at: AT };
    const common = { receipt_version: RIGHTS.receiptVersion, post_id: postId, retrieved_at: AT, mime_type: mime,
      byte_count: 321, sha256: raw, transport_receipt: transport, primary_rights_basis_receipt_reference: basis,
      third_party_rights_decision: "no_third_party_material_verified", third_party_permission_receipt_reference_or_null: null,
      reviewer: HUMAN, reviewed_at: AT, decision: "approved_owner_private_use",
      decision_scope: { scope_version: "synthetic-private-scope-v1", allowed_scope_tuples: [PRIVATE_USE], source_post_id: postId,
        source_asset_id_or_null: assetId, source_content_sha256: raw, exact_attribution: attribution, legal_or_policy_basis_reference: basis,
        reviewer: HUMAN, reviewed_at: AT, expires_at_or_null: UNTIL } };
    return add(`${id}-${asset ? "asset" : "post"}-rights`, asset ? { ...common, asset_id: assetId, filename: "synthetic.pdf",
      artifact_kind: "pdf", official_download_url: url, license_basis: observed, exact_attribution: attribution,
      content_identity_receipt: { post_id: postId, asset_id: assetId, official_download_url: url, endpoint_post_id: postId, endpoint_asset_id: assetId,
        expected_filename: "synthetic.pdf", content_disposition_filename_or_null: "synthetic.pdf", artifact_kind: "pdf", mime_type: mime,
        byte_count: 321, sha256: raw, representation_magic_match: true } }
      : { ...common, board_id: "Q004", canonical_url: url, exact_title: "Synthetic source, not a Q-Net document", department: "Synthetic",
        observed_at: AT, post_license_evidence: observed, attribution, content_identity_receipt: { post_id: postId, board_id: "Q004",
          mime_type: mime, byte_count: 321, sha256: raw, canonical_url: url, exact_title: "Synthetic source, not a Q-Net document" } });
  }
  const sourcePairs = ["q1", "q2", "key"].map(id => {
    const post = rights(id, false), asset = rights(id, true, post); return { post, asset };
  });
  const originals = packet.questions.filter(row => row.kind === "original");
  const positions = SUBJECTS.flatMap(subject => Array.from({ length: 40 }, (_, i) => ({ session_profile_id: sessionId(subject), subject_id: subject,
    official_question_number: number(subject, i), source_question_anchor: `synthetic-${subject}-${number(subject, i)}` })));
  const answers = positions.map(position => {
    const original = originals.find(row => row.reference.subjectId === position.subject_id && row.reference.questionNumber === position.official_question_number);
    return { session_profile_id: position.session_profile_id, subject_id: position.subject_id, official_question_number: position.official_question_number,
      final_answer_row_locator: `synthetic-final-${position.subject_id}-${position.official_question_number}`, answer_position_1_to_5: original?.correctChoice ?? 2 };
  });
  const observation = (pair, role, values, index) => add(`official-observation-${index}`, { source_post_id: get(pair.post).post_id,
    source_asset_id: get(pair.asset).asset_id, raw_artifact_sha256: get(pair.asset).sha256, official_exam_round_id: roundId,
    session_profile_ids: [...new Set(values.map(row => row.session_profile_id))], booklet_id: historical2025 ? "A" : "synthetic-booklet-A-not-official-evidence",
    artifact_role: role, ordered_position_bindings: values, transport_receipt: get(pair.asset).transport_receipt,
    content_identity_receipt: get(pair.asset).content_identity_receipt, reviewer: HUMAN, reviewed_at: AT, decision: "verified_exact_official_booklet_positions" });
  const sourceObservations = sourcePairs.slice(0, 2).map((pair, index) => observation(pair, "official_question",
    positions.filter(position => (SUBJECTS.indexOf(position.subject_id) < 3 ? 0 : 1) === index).map(position => {
      const original = originals.find(row => row.reference.subjectId === position.subject_id && row.reference.questionNumber === position.official_question_number);
      return { ...position, question_body_sha256: original ? createHash("sha256").update(JSON.stringify({ stem: original.stem, choices: original.choices })).digest("hex") : digest(position) };
    }), index));
  const keyPair = sourcePairs[2], keyObservation = observation(keyPair, "official_final_answer", answers, 2);
  sourceObservations.push(keyObservation);
  const keyTransport = add("official-key-transport", { requested_url: get(keyPair.asset).official_download_url,
    final_url: get(keyPair.asset).official_download_url, http_status: 200, content_type: "application/pdf", byte_count: 321,
    raw_artifact_sha256: get(keyPair.asset).sha256, retrieved_at: AT });
  const keyRows = positions.map((position, index) => {
    const pair = sourcePairs[SUBJECTS.indexOf(position.subject_id) < 3 ? 0 : 1];
    return { ...position, source_question_post_id: get(pair.post).post_id, source_question_asset_id: get(pair.asset).asset_id,
      source_question_asset_sha256: get(pair.asset).sha256, final_answer_row_locator: answers[index].final_answer_row_locator,
      answer_position_1_to_5: answers[index].answer_position_1_to_5 };
  });
  const table = add("official-key-table", { official_exam_round_id: roundId, final_answer_post_id: get(keyPair.post).post_id,
    final_answer_asset_id: get(keyPair.asset).asset_id, final_answer_asset_sha256: get(keyPair.asset).sha256,
    final_answer_asset_rights_receipt_reference: keyPair.asset, source_question_asset_rights_receipt_references: sourcePairs.slice(0, 2).map(pair => pair.asset),
    row_count: 200, ordered_key_rows: keyRows, ordered_key_rows_digest: digest(keyRows), reviewer: HUMAN, reviewed_at: AT,
    decision: "verified_complete_official_key_table_mapping" });

  return { get, sourcePairs, sourceObservations, keyPair, keyObservation, keyTransport, keyRows, table, roundId };
}

export function finalReleaseFixture(packet, items, receipts, add, bodyRefs, subjectFixture = null) {
  const { get, sourcePairs, sourceObservations, keyPair, keyObservation, keyTransport, keyRows, table, roundId } =
    subjectFixture?.sources ?? finalReleaseSources(packet, receipts, add);
  packet.questions.forEach((row, index) => {
    const item = items[index], pre = subjectFixture ? subjectFixture.pre(index) : get(item.receiptReference), variant = row.kind === "practice_retry", ref = row.reference;
    const pair = sourcePairs[SUBJECTS.indexOf(ref.subjectId) < 3 ? 0 : 1], questionReference = bodyRefs[index]("question", JSON.stringify({ stem: row.stem, choices: row.choices }));
    const source = { source_post_id: get(pair.post).post_id, source_asset_id: get(pair.asset).asset_id,
      source_question_anchor: `synthetic-${ref.subjectId}-${ref.questionNumber}`, source_post_rights_receipt_reference: pair.post, source_asset_rights_receipt_reference: pair.asset };
    const originalIndex = packet.questions.findIndex(candidate => candidate.reference.questionId === row.sourceQuestionId);
    const originalRelease = variant ? items[originalIndex].releaseReference : null;
    const originalObject = variant ? get(originalRelease).question_item_object_reference_or_null : null;
    const provenance = add(`provenance-${index}`, { item_id: ref.questionId, item_version: ref.questionVersion, ...source,
      source_asset_raw_sha256: get(pair.asset).sha256, output_object_id: questionReference.object_id,
      output_object_version: questionReference.object_version, output_object_sha256: questionReference.object_sha256,
      ...(variant ? { original_release_reference: originalRelease, original_question_object_reference: originalObject,
        concept_binding_digest: digest(row.concept), derivation_kind: "private_modified_practice_only" }
        : { extraction_method_id: "human_reviewed_transcription", extraction_method_version: "1",
          extraction_configuration_digest: digest({ method: "human_reviewed_transcription", version: "1", output: ["stem", "choices"], encoding: "UTF-8", serialization: "JSON.stringify-in-declared-field-order" }),
          ocr_benchmark_gate_receipt_reference_or_null: null }),
      reviewer: HUMAN, reviewed_at: AT, decision: variant ? "verified_exact_private_variant_lineage" : "verified_question_item_object_provenance" });
    const object = { ...questionReference, item_id: ref.questionId, item_version: ref.questionVersion, content_provenance_receipt_reference: provenance };
    const commonKey = { item_id: ref.questionId, item_version: ref.questionVersion, subject_id: ref.subjectId,
      reviewer: HUMAN, reviewed_at: AT, answer_position_1_to_5: row.correctChoice };
    const mapped = keyRows.find(position => position.subject_id === ref.subjectId && position.official_question_number === ref.questionNumber);
    const key = add(`final-key-${index}`, variant ? { ...commonKey, question_item_object_reference: object, choice_set_digest: pre.choice_set_digest,
      original_release_reference: originalRelease, answer_reasoning_object_reference: item.easyExplanationReference, authority: "LEARNING_ONLY",
      decision: "verified_independent_private_retry_key" } : { ...commonKey, ...mapped, official_exam_round_id: roundId,
      qnet_post_id: get(keyPair.post).post_id, qnet_asset_id: get(keyPair.asset).asset_id, exact_asset_raw_sha256: get(keyPair.asset).sha256,
      key_post_rights_receipt_reference: keyPair.post, key_asset_rights_receipt_reference: keyPair.asset,
      effective_key_rights_decision: "approved_owner_private_use", key_post_exact_attribution: get(keyPair.post).attribution,
      key_asset_exact_attribution: get(keyPair.asset).exact_attribution,
      ordered_unique_key_attributions: [get(keyPair.post).attribution, get(keyPair.asset).exact_attribution],
      ordered_unique_key_attributions_digest: digest([get(keyPair.post).attribution, get(keyPair.asset).exact_attribution]),
      asset_transport_receipt_reference: keyTransport, asset_content_identity_receipt_reference: keyObservation,
      official_key_table_mapping_receipt_reference: table, official_key_table_mapping_digest: digest(keyRows),
      retrieved_at: AT, decision: "verified_official_key" });
    const feedbackRows = item.choices.map(choice => Object.fromEntries(FIVE.fiveChoiceFeedbackBundleReceiptShape.feedbackRowRequiredFields.map(field =>
      [field, choice[field === "verdict_true_or_false" ? "verdict_true_false_or_unresolved" : field]])));
    const feedbackAttributions = item.choices.flatMap(choice => ["correction", "explanation"].flatMap(kind => {
      const body = choice[`${kind}_reference_or_null`];
      return body ? [{ choice_id: choice.choice_id, position_1_to_5: choice.position_1_to_5, feedback_kind: `${kind}_object`, source_object_reference: body,
        rights_receipt_reference: body.rights_decision_reference, exact_attribution: get(body.rights_decision_reference).exact_attribution }] : [];
    }));
    const bundle = add(`feedback-bundle-${index}`, { item_id: ref.questionId, item_version: ref.questionVersion, choice_set_digest: pre.choice_set_digest,
      authorized_plane: PRIVATE_USE.plane, ordered_choice_feedback_rows: feedbackRows, ordered_choice_feedback_rows_digest: digest(feedbackRows),
      ordered_feedback_attribution_rows: feedbackAttributions, ordered_feedback_attribution_rows_digest: digest(feedbackAttributions),
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_complete_five_choice_feedback_bundle" });
    const manifest = subjectFixture?.manifests[index] ?? add(`manifest-${index}`, { manifest_id: "appraiser.first.law.2026-04-04.contract.v1", manifest_version: "1", subject_id: ref.subjectId,
      exam_date: "2026-04-04", applicable_version_status: "law_exam_date_verified", component_evidence_references: pre.component_evidence_references,
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_exact_source_version_manifest" });
    const validator = subjectFixture ? subjectFixture.complete(index, object, key, variant)
      : validatorFixture(add, index, ref, pre, item.receiptReference, object, key, [manifest], variant);
    const attribute = (role, object, rights, text, position = null) => ({ content_role: role, choice_position_or_null: position,
      source_object_reference_or_null: object, rights_receipt_reference: rights, exact_attribution: text });
    const attributionRows = [attribute("question_source_post", null, pair.post, get(pair.post).attribution),
      attribute("question_source_asset", null, pair.asset, get(pair.asset).exact_attribution),
      attribute("question_item_object", object, object.rights_decision_reference, get(object.rights_decision_reference).exact_attribution),
      ...(variant ? [attribute("independent_retry_answer_reasoning", item.easyExplanationReference, item.easyExplanationReference.rights_decision_reference,
        get(item.easyExplanationReference.rights_decision_reference).exact_attribution)] : [attribute("official_key_source_post", null, keyPair.post, get(keyPair.post).attribution),
        attribute("official_key_source_asset", null, keyPair.asset, get(keyPair.asset).exact_attribution)]),
      ...feedbackAttributions.map(row => attribute(`choice_${row.feedback_kind}`, row.source_object_reference, row.rights_receipt_reference, row.exact_attribution, row.position_1_to_5)),
      ...(!variant ? [attribute(FIVE.privateModifiedRetryReleaseContract.originalEasyExplanationAttributionBinding.contentRole,
        item.easyExplanationReference, item.easyExplanationReference.rights_decision_reference,
        get(item.easyExplanationReference.rights_decision_reference).exact_attribution)] : [])];
    const attributions = [...new Set(attributionRows.map(row => row.exact_attribution))];
    item.releaseReference = add(`release-${index}`, { receipt_version: variant ? RETRY_RELEASE_VERSION : FIVE.releaseReceiptContract.receiptVersion,
      item_id: ref.questionId, item_version: ref.questionVersion, subject_id: ref.subjectId, ...source,
      ...(variant ? { item_kind: "private_modified_retry", authority: "LEARNING_ONLY", original_release_reference: originalRelease, independent_answer_key_reference: key }
        : { official_exam_round_id: roundId, session_profile_id: ref.sessionId, official_question_number: ref.questionNumber, verified_official_key_receipt_reference: key }),
      question_item_object_reference_or_null: object, effective_rights_decision: "approved_owner_private_use",
      requested_plane_or_null: PRIVATE_USE.plane, requested_use_or_null: PRIVATE_USE.use, requested_audience_or_null: PRIVATE_USE.audience,
      source_version_manifest_references: [manifest], applicable_version_status: pre.applicable_version_status,
      pre_release_applicability_receipt_reference: item.receiptReference, subject_validator_receipt_reference_or_null: validator.subject ?? null,
      choice_set_digest: pre.choice_set_digest, five_choice_feedback_bundle_receipt_reference_or_null: bundle, author_provenance: provenance,
      model_assistance_provenance_or_null: null, deterministic_validator_receipt_references: validator.passes ?? [validator.pass],
      deterministic_validator_applicability_receipt_references: validator.apps ?? [validator.app], attribution: get(pair.post).attribution,
      ordered_content_attribution_rows: attributionRows, ordered_content_attribution_rows_digest: digest(attributionRows),
      ordered_unique_attributions: attributions, ordered_unique_attributions_digest: digest(attributions), reviewer: HUMAN, reviewed_at: AT, decision: "approved_personal_only" });
    row.sourceEvidence = packetRef(provenance); row.rightsEvidence = packetRef(object.rights_decision_reference);
    packet.keys[index].evidence = packetRef(key);
    item.questionSha256 = digest(row);
  });
  return sourceObservations;
}

function validatorFixture(add, index, ref, pre, preReference, object, key, manifests, variant) {
  const related = ref.subjectId === "appraiser_related_law";
  const validatorId = related ? "exam_date_multi_law_snapshot" : "exam_date_law_snapshot";
  const definition = FIVE.deterministicValidatorRegistry.definitions[validatorId];
  const method = related ? RELATED_LAW_DERIVATION : CIVIL_DERIVATION;
  const binding = { item_id: ref.questionId, item_version: ref.questionVersion, subject_id: ref.subjectId,
    validator_contract_id: validatorId, validator_contract_version: definition.contractVersion };
  const features = { always_applicable_subject_version_check: true };
  const app = add(`validator-app-${index}`, { ...binding, question_item_object_reference: object, choice_set_digest: pre.choice_set_digest,
    feature_facts_schema_version: definition.applicabilityContract.featureFactsSchemaVersion, feature_facts: features, feature_facts_digest: digest(features),
    feature_evidence_references: [preReference], applicability_status: "applicable", not_applicable_reason_code_or_null: null,
    reviewer: HUMAN, reviewed_at: AT, decision: "verified_validator_applicability" });
  const facts = { authority_ids: pre.applicable_authority_ids, exam_date: "2026-04-04", amendment_chain_receipt_references: pre.component_evidence_references,
    [related ? "cross_authority_applicability_receipt_references" : "applicability_decision_receipt_references"]: pre.component_evidence_references };
  const common = { ...binding, source_version_manifest_references: manifests, applicability_evidence_references: [preReference] };
  const derivation = add(`validator-derivation-${index}`, { ...common, input_projection_schema_version: "deterministic-validator-input.v1",
    question_item_object_reference: object, choice_set_digest: pre.choice_set_digest,
    [variant ? "independent_answer_key_reference" : "verified_official_key_receipt_reference"]: key,
    validator_input_facts_schema_version: definition.inputProjectionSchemaVersion, validator_input_facts: facts, validator_input_facts_digest: digest(facts),
    derivation_method_id: method.method, derivation_method_version: "1", derivation_configuration_digest: digest(method),
    evidence_observed_at: AT, reviewer: HUMAN, reviewed_at: AT, decision: "verified_deterministic_validator_input_derivation" });
  const projection = { item_id: ref.questionId, item_version: ref.questionVersion, subject_id: ref.subjectId, question_item_object_sha256: object.object_sha256,
    choice_set_digest: pre.choice_set_digest, [variant ? "independent_answer_key_receipt_sha256" : "verified_official_key_receipt_sha256"]: key.evidence_sha256,
    source_version_manifest_reference_tuples: manifests, applicability_evidence_reference_tuples: [preReference],
    validator_input_facts_schema_version: definition.inputProjectionSchemaVersion, validator_input_facts_derivation_receipt_reference: derivation, validator_input_facts: facts };
  const shared = { ...common, validator_configuration_digest: digest({ registryVersion: FIVE.deterministicValidatorRegistry.registryVersion, definition, canonicalization: "RFC8785" }),
    input_projection_digest: digest(projection), validator_input_facts_derivation_receipt_reference: derivation,
    assertion_count: 4, failed_assertion_count: 0, unresolved_assertion_count: 0 };
  const assertions = [
    [related ? "all_amendment_chains_complete" : "amendment_chain_complete", "exact_boolean_true", true, null],
    [related ? "cross_authority_applicability_resolved" : "applicability_resolved", "exact_boolean_true", true, null],
    ["authority_set_exact", "exact_canonical_set_equality", pre.applicable_authority_ids, null], ["exam_date_exact", "exact_date_equality", "2026-04-04", "calendar_date"],
  ].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, comparison, value, unit]) => ({ assertion_id: id, assertion_contract_version: definition.contractVersion, comparison,
    outcome: "passed", observed_value_or_null: value, expected_value_or_range: value, tolerance_or_null: null, unit_or_null: unit,
    evidence_references: pre.component_evidence_references, evidence_references_digest: digest(pre.component_evidence_references) }));
  const result = add(`validator-result-${index}`, { ...shared, ordered_assertion_rows: assertions, ordered_assertion_rows_digest: digest(assertions),
    passed_assertion_count: 4, executor_identity: "synthetic-not-a-production-executor", executed_at: AT,
    reviewer: HUMAN, reviewed_at: AT, decision: "verified_complete_validator_result" });
  const pass = add(`validator-pass-${index}`, { ...shared, result_artifact_receipt_reference: result, evidence_observed_at: AT,
    reviewer: HUMAN, reviewed_at: AT, decision: "verified_deterministic_validator_pass" });
  return { app, pass };
}
