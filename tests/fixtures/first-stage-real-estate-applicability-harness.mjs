import { createHash } from "node:crypto";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";
import { FIVE } from "../../lib/review-os/first-stage/runtime/foundation-release-contract.ts";
import { REAL_ESTATE_METHOD } from "../../lib/review-os/first-stage/runtime/foundation-real-estate-facts.ts";
import { finalReleaseFixture, finalReleaseSources } from "./first-stage-final-release-harness.mjs";

// SYNTHETIC only. Independently specified expected facts, not the consumer's
// calculated result. No official content, real human or runtime installation.
const HUMAN = "synthetic-not-a-human-law-review", AT = "2026-09-06T10:00:00.000Z";
const DATE = "2026-04-04", STATUS = "not_applicable_verified", MANIFEST = "synthetic-real-estate-source-manifest-v1";
const sha = text => createHash("sha256").update(text, "utf8").digest("hex");
const packetRef = ref => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: ref.evidence_id,
  evidenceVersion: ref.evidence_version, evidenceSha256: ref.evidence_sha256 });
export function realEstateApplicability(packet, mutate = () => {}, mode = "both") {
  const receipts = [], manifests = [], projections = [], expected = [], bodyRefs = [];
  const add = (id, fields) => {
    const row = { receipt_id: `synthetic-${id}`, receipt_version: "1", ...fields }; mutate(id, row);
    row.receipt_sha256 = digest(row); receipts.push(row);
    return { evidence_id: row.receipt_id, evidence_version: row.receipt_version, evidence_sha256: row.receipt_sha256 };
  };
  const sources = finalReleaseSources(packet, receipts, add), pair = sources.sourcePairs[0];
  const items = packet.questions.map((row, index) => {
    const ref = row.reference;
    ref.sourceVersionManifestIds = [MANIFEST]; ref.sessionId = "first_2026_session_1";
    ref.currentnessState = "verified_exam_date";
    const anchorIds = row.choices.map((_, i) => `synthetic-estate-anchor-${index}-${i}`);
    const relations = row.choices.map((_, i) => ({ relation_id: `relation-${i}`, subject: "synthetic-object", predicate: "synthetic-relation",
      object: `synthetic-value-${i}`, holds: i + 1 === row.correctChoice, source_anchor_ids: [anchorIds[i]] }));
    const claims = row.choices.map((text, i) => ({ position_1_to_5: i + 1, choice_text_sha256: sha(text), relation_id: `relation-${i}`, asserted_holds: true }));
    // A * B = 6 KRW; candidate answer positions are bound to each exact choice.
    const formula = JSON.stringify({ operator: "multiply", operands: ["A", "B"] });
    const inputs = [{ symbol: "A", decimal: "2", unit: "COUNT" }, { symbol: "B", decimal: "3", unit: "COUNT^-1*KRW" }];
    const rounding = { mode: "none", decimal_places: null }, result = { decimal: "6", unit: "KRW" };
    const concept = mode === "calculation" ? null : { selection_rule: "true_statement", canonical_concept_relations: relations, ordered_choice_claims: claims };
    const calculation = mode === "concept" ? null : { canonical_formula_expression: formula, ordered_input_values_and_units: inputs,
      declared_rounding_rule: rounding, ordered_choice_values: row.choices.map((text, i) => ({ position_1_to_5: i + 1,
        choice_text_sha256: sha(text), decimal: i + 1 === row.correctChoice ? "6" : String(i + 10), unit: "KRW" })) };
    const projection = add(`subject-projection-${index}`, { item_id: ref.questionId, item_version: ref.questionVersion, subject_id: ref.subjectId,
      exam_date: DATE, question_body_sha256: sha(JSON.stringify({ stem: row.stem, choices: row.choices })), choice_texts_sha256: digest(row.choices),
      concept_binding_digest: digest(row.concept), source_anchor_ids: anchorIds, source_post_rights_receipt_reference: pair.post,
      source_asset_rights_receipt_reference: pair.asset, concept_or_null: concept, calculation_or_null: calculation,
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_exact_subject_source_projection" });
    projections.push(projection);
    const contradictions = claims.filter(claim => claim.position_1_to_5 !== row.correctChoice).map(claim => ({ position_1_to_5: claim.position_1_to_5,
      evidence_references: [projection], evidence_references_digest: digest([projection]) }));
    expected.push({
      real_estate_source_grounded_concept_check: { features: { concept_claim_task_present: concept !== null },
        facts: concept === null ? null : { source_anchor_ids: anchorIds, canonical_concept_relations: relations, ordered_choice_claims: claims,
          distractor_contradiction_evidence: contradictions }, assertions: { source_anchor_set_exact: anchorIds, concept_relation_exact: relations, distractor_contradiction_check_complete: true } },
      real_estate_calculation_check: { features: { calculation_or_formula_present: calculation !== null }, facts: calculation === null ? null : {
        canonical_formula_expression: formula, ordered_input_values_and_units: inputs, declared_rounding_rule: rounding, expected_result_and_unit: result },
      assertions: { formula_identity_exact: formula, substitution_exact: "6", result_and_unit_exact: result } },
    });
    manifests.push(add(`manifest-${index}`, { manifest_id: MANIFEST, manifest_version: "1", subject_id: ref.subjectId,
      exam_date: DATE, applicable_version_status: STATUS, component_evidence_references: [projection], reviewer: HUMAN, reviewed_at: AT,
      decision: "verified_exact_source_version_manifest" }));
    const bodyRef = (id, body) => {
      const common = { object_id: `synthetic-${index}-${id}`, object_version: "1", object_sha256: sha(body), item_id: ref.questionId,
        item_version: ref.questionVersion, subject_id: ref.subjectId, authorized_plane: "Personal Raw Vault", authorized_use: "personal_service_processing",
        authorized_audience: "owner_user_private", effective_from: AT, expires_at_or_null: "2099-12-31T00:00:00.000Z", currentness: "verified_current",
        exact_attribution: `Synthetic ${index}-${id} attribution — not actual reviewed content`, reviewer: HUMAN, reviewed_at: AT };
      const rights = add(`${index}-${id}-rights`, { ...common, decision: "approved_owner_private_use" });
      const version = add(`${index}-${id}-version`, { ...common, exam_date: DATE, applicable_version_status: STATUS,
        component_evidence_references: [projection], decision: "verified_not_applicable_to_law_or_kifrs" });
      const value = { object_id: common.object_id, object_version: "1", object_sha256: common.object_sha256, authorized_plane: "Personal Raw Vault",
        rights_decision_reference: rights, source_version_decision_reference: version }; mutate(`${index}-${id}-body`, value); return value;
    };
    bodyRefs.push(bodyRef);
    const choices = row.choices.map((_, i) => ({ choice_id: `synthetic-choice-${i + 1}`, position_1_to_5: i + 1,
      verdict_true_false_or_unresolved: i + 1 === row.correctChoice ? "true" : "false",
      correction_status: i + 1 === row.correctChoice ? "verified_no_correction" : "verified_correction_available",
      correction_reference_or_null: i + 1 === row.correctChoice ? null : bodyRef(`correction-${i}`, row.choiceExplanations[i]),
      explanation_status: "draft_private", explanation_reference_or_null: bodyRef(`explanation-${i}`, row.choiceExplanations[i]),
      source_anchor_ids: [anchorIds[i]], law_or_kifrs_version_status: STATUS, uncertainty_codes: [] }));
    packet.keys[index].questionReferenceSha256 = digest(ref);
    return { questionSha256: digest(row), examDate: DATE, choices, easyExplanationReference: bodyRef("easy", row.easyExplanation) };
  });
  const pre = index => ({ item_id: packet.questions[index].reference.questionId, item_version: packet.questions[index].reference.questionVersion,
    subject_id: "real_estate_principles", choice_set_digest: digest({ item_id: packet.questions[index].reference.questionId,
      item_version: packet.questions[index].reference.questionVersion, choices: items[index].choices }),
    source_anchor_ids_digest: digest(items[index].choices.flatMap(row => row.source_anchor_ids)), applicable_version_status: STATUS });
  const complete = (index, object, key, variant) => {
    const fact = pre(index), manifestsForItem = [manifests[index]], evidence = [projections[index]], apps = [], passes = [];
    for (const id of FIVE.deterministicValidatorContractMatrix.real_estate_principles) {
      const definition = FIVE.deterministicValidatorRegistry.definitions[id], value = expected[index][id], applicable = value.facts !== null;
      const binding = { item_id: fact.item_id, item_version: fact.item_version, subject_id: fact.subject_id,
        validator_contract_id: id, validator_contract_version: definition.contractVersion };
      apps.push(add(`validator-app-${index}-${id}`, { ...binding, question_item_object_reference: object, choice_set_digest: fact.choice_set_digest,
        feature_facts_schema_version: definition.applicabilityContract.featureFactsSchemaVersion, feature_facts: value.features,
        feature_facts_digest: digest(value.features), feature_evidence_references: evidence,
        applicability_status: applicable ? "applicable" : "verified_not_applicable", not_applicable_reason_code_or_null: applicable ? null
          : id === "real_estate_calculation_check" ? "no_calculation_or_formula_feature" : "no_concept_claim_task_feature",
        reviewer: HUMAN, reviewed_at: AT, decision: "verified_validator_applicability" }));
      if (!applicable) continue;
      const common = { ...binding, source_version_manifest_references: manifestsForItem, applicability_evidence_references: evidence };
      const derivation = add(`validator-derivation-${index}-${id}`, { ...common, input_projection_schema_version: definition.inputProjectionSchemaVersion,
        question_item_object_reference: object, choice_set_digest: fact.choice_set_digest,
        [variant ? "independent_answer_key_reference" : "verified_official_key_receipt_reference"]: key,
        validator_input_facts_schema_version: definition.inputProjectionSchemaVersion, validator_input_facts: value.facts, validator_input_facts_digest: digest(value.facts),
        derivation_method_id: REAL_ESTATE_METHOD.method, derivation_method_version: REAL_ESTATE_METHOD.version, derivation_configuration_digest: digest(REAL_ESTATE_METHOD),
        evidence_observed_at: AT, reviewer: HUMAN, reviewed_at: AT, decision: "verified_deterministic_validator_input_derivation" });
      const input = { item_id: fact.item_id, item_version: fact.item_version, subject_id: fact.subject_id, question_item_object_sha256: object.object_sha256,
        choice_set_digest: fact.choice_set_digest, [variant ? "independent_answer_key_receipt_sha256" : "verified_official_key_receipt_sha256"]: key.evidence_sha256,
        source_version_manifest_reference_tuples: manifestsForItem, applicability_evidence_reference_tuples: evidence,
        validator_input_facts_schema_version: definition.inputProjectionSchemaVersion, validator_input_facts_derivation_receipt_reference: derivation,
        validator_input_facts: value.facts };
      const shared = { ...common, validator_configuration_digest: digest({ registryVersion: FIVE.deterministicValidatorRegistry.registryVersion,
        definition, canonicalization: "RFC8785", method: REAL_ESTATE_METHOD }), input_projection_digest: digest(input),
      validator_input_facts_derivation_receipt_reference: derivation, assertion_count: 3, failed_assertion_count: 0, unresolved_assertion_count: 0 };
      const assertions = definition.requiredAssertionIdsExactly.slice().sort().map(id => {
        const rule = definition.assertionToleranceAndUnitById[id]; return { assertion_id: id, assertion_contract_version: definition.contractVersion,
          comparison: rule.comparison, outcome: "passed", observed_value_or_null: value.assertions[id], expected_value_or_range: value.assertions[id],
          tolerance_or_null: rule.tolerance, unit_or_null: rule.unit, evidence_references: evidence, evidence_references_digest: digest(evidence) };
      });
      const result = add(`validator-result-${index}-${id}`, { ...shared, ordered_assertion_rows: assertions, ordered_assertion_rows_digest: digest(assertions),
        passed_assertion_count: 3, executor_identity: "synthetic-not-a-production-executor", executed_at: AT,
        reviewer: HUMAN, reviewed_at: AT, decision: "verified_complete_validator_result" });
      passes.push(add(`validator-pass-${index}-${id}`, { ...shared, result_artifact_receipt_reference: result, evidence_observed_at: AT,
        reviewer: HUMAN, reviewed_at: AT, decision: "verified_deterministic_validator_pass" }));
    }
    const subject = add(`subject-validator-${index}`, { item_id: fact.item_id, item_version: fact.item_version, subject_id: fact.subject_id,
      validator_contract_version: FIVE.contractVersion, source_version_manifest_references: manifestsForItem,
      deterministic_validator_receipt_references: passes, deterministic_validator_applicability_receipt_references: apps,
      evidence_observed_at: AT, reviewer: HUMAN, reviewed_at: AT, decision: "verified_not_applicable_to_law_or_kifrs" });
    items[index].receiptReference = add(`applicability-${index}`, { ...fact, receipt_kind: "subject_not_applicable_validator",
      applicable_authority_ids: [], authority_derivation_receipt_reference_or_null: null, component_evidence_references: [subject],
      reviewer: HUMAN, reviewed_at: AT, decision: "verified_pre_release_applicability" });
    packet.questions[index].versionEvidence = packetRef(items[index].receiptReference);
    return { subject, apps, passes };
  };
  const sourceObservations = finalReleaseFixture(packet, items, receipts, add, bodyRefs, { sources, pre, manifests, complete });
  return { packetSha256: sha(JSON.stringify(packet)), dataClass: "synthetic_test_only", items, receipts, sourceObservations,
    historyExtractionConfigurations: [], reviewers: [{ identity: HUMAN, classes: ["named_owner_authorized_human_subject_reviewer",
      "named_owner_authorized_human_subject_or_version_reviewer", "named_owner_authorized_human_rights_reviewer", "named_owner_authorized_human_reviewer",
      "named_owner_authorized_human_content_reviewer", "named_owner_authorized_human_answer_key_reviewer"] }] };
}
