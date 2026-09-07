import { exactObject, requiredIdentifier, requiredUtcInstant } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same, type FoundationEvidence } from "./foundation-applicability";
import { FIVE, MANIFEST_FIELDS, RETRY_KEY_FIELDS } from "./foundation-release-contract";
import { rows, type ReleaseContext, type Row } from "./foundation-release-rights";
import { REAL_ESTATE_METHOD, REAL_ESTATE_PROJECTION_FIELDS, realEstateFacts } from "./foundation-real-estate-facts";

const SUBJECT = "real_estate_principles", ROLE = "named_owner_authorized_human_subject_reviewer";
const MATRIX = FIVE.deterministicValidatorContractMatrix.real_estate_principles;
export function realEstateValidatorConfiguration(id: typeof MATRIX[number]) {
  return { registryVersion: FIVE.deterministicValidatorRegistry.registryVersion,
    definition: FIVE.deterministicValidatorRegistry.definitions[id as "real_estate_calculation_check" | "real_estate_source_grounded_concept_check"],
    canonicalization: "RFC8785", method: REAL_ESTATE_METHOD };
}
// Manifest/source projection precedes subject-validator → pre-release → final
// decision. A body version binds that same source projection, not the later
// subject receipt that contains the body's choice digest: no circular hashes.
export function realEstateBodyComponents(evidence: FoundationEvidence, pre: Row) {
  const subjectRef = rows(pre.component_evidence_references, 1, 1)[0];
  const subject = evidence.resolve(subjectRef, FIVE.subjectValidatorReceiptShape.requiredFields);
  const manifestRefs = rows(subject.source_version_manifest_references, 1, 1);
  const manifest = evidence.resolve(manifestRefs[0], MANIFEST_FIELDS);
  const projectionRefs = rows(manifest.component_evidence_references, 1, 1);
  const projection = evidence.resolve(projectionRefs[0], REAL_ESTATE_PROJECTION_FIELDS);
  return { subject, subjectRef, manifestRefs, manifest, projectionRefs, projection };
}
export function validateRealEstatePreRelease(evidence: FoundationEvidence, pre: Row, question: Row, choices: readonly unknown[]) {
  const ref = question.reference as Row, bound = realEstateBodyComponents(evidence, pre);
  const { subject, manifest, projectionRefs } = bound;
  for (const value of [pre, subject, manifest]) if (value.subject_id !== SUBJECT) fail();
  same(subject.item_id, ref.questionId); same(subject.item_version, ref.questionVersion);
  same(subject.validator_contract_version, FIVE.contractVersion);
  same(pre.applicable_authority_ids, []); same(pre.authority_derivation_receipt_reference_or_null, null);
  if (pre.receipt_kind !== "subject_not_applicable_validator" || pre.applicable_version_status !== "not_applicable_verified" ||
    manifest.exam_date !== REAL_ESTATE_METHOD.examDate || manifest.applicable_version_status !== pre.applicable_version_status) fail();
  requiredIdentifier(manifest.manifest_id); requiredIdentifier(manifest.manifest_version);
  const facts = realEstateFacts(evidence, projectionRefs[0], question, choices);
  evidence.reviewer(manifest, ROLE, "verified_exact_source_version_manifest", facts.projection.reviewed_at);
  evidence.reviewer(subject, ROLE, "verified_not_applicable_to_law_or_kifrs", subject.evidence_observed_at);
  if (Date.parse(requiredUtcInstant(subject.evidence_observed_at)) < Date.parse(requiredUtcInstant(manifest.reviewed_at))) fail();
  evidence.reviewer(pre, "named_owner_authorized_human_subject_or_version_reviewer", "verified_pre_release_applicability", subject.reviewed_at);
  return { ...bound, ...facts };
}

export function validateRealEstateReleaseEvidence(ctx: ReleaseContext, release: Row, pre: Row,
  question: Row, choices: readonly unknown[], keyReference: unknown, variant: boolean) {
  const bound = validateRealEstatePreRelease(ctx.evidence, pre, question, choices);
  const { subject, subjectRef, manifestRefs, manifest, projectionRefs, projection, values } = bound;
  // Every transitive reviewed source must precede this final use decision.
  for (const value of [subject, manifest, projection]) {
    if (Date.parse(requiredUtcInstant(value.reviewed_at)) > Date.parse(requiredUtcInstant(release.reviewed_at))) fail();
  }
  same(release.subject_validator_receipt_reference_or_null, subjectRef);
  same(release.source_version_manifest_references, manifestRefs);
  for (const field of ["source_post_rights_receipt_reference", "source_asset_rights_receipt_reference"]) same(release[field], projection[field]);
  same(release.deterministic_validator_applicability_receipt_references, subject.deterministic_validator_applicability_receipt_references);
  same(release.deterministic_validator_receipt_references, subject.deterministic_validator_receipt_references);
  const apps = rows(subject.deterministic_validator_applicability_receipt_references, MATRIX.length, MATRIX.length);
  const passes = rows(subject.deterministic_validator_receipt_references, 1, MATRIX.length);
  let passIndex = 0;
  const key = ctx.resolve(keyReference, variant ? RETRY_KEY_FIELDS : FIVE.releaseReceiptContract.verifiedOfficialKeyReceiptShape.requiredFields);
  for (const [index, validatorId] of MATRIX.entries()) {
    const definition = realEstateValidatorConfiguration(validatorId).definition, actual = values.get(validatorId); if (!actual) fail();
    const app = ctx.resolve(apps[index], FIVE.deterministicValidatorApplicabilityReceiptShape.requiredFields);
    const binding = { item_id: release.item_id, item_version: release.item_version, subject_id: SUBJECT,
      validator_contract_id: validatorId, validator_contract_version: definition.contractVersion };
    for (const [field, value] of Object.entries(binding)) same(app[field], value);
    same(app.question_item_object_reference, release.question_item_object_reference_or_null); same(app.choice_set_digest, release.choice_set_digest);
    same(app.feature_facts_schema_version, definition.applicabilityContract.featureFactsSchemaVersion);
    same(app.feature_facts, actual.features); same(app.feature_facts_digest, digest(actual.features)); same(app.feature_evidence_references, projectionRefs);
    const applicable = actual.facts !== null;
    same(app.applicability_status, applicable ? "applicable" : "verified_not_applicable");
    same(app.not_applicable_reason_code_or_null, applicable ? null : validatorId === "real_estate_calculation_check"
      ? "no_calculation_or_formula_feature" : "no_concept_claim_task_feature");
    ctx.review(app, ROLE, "verified_validator_applicability", projection.reviewed_at);
    ctx.review(subject, ROLE, "verified_not_applicable_to_law_or_kifrs", app.reviewed_at);
    if (!applicable) continue;
    if (passIndex >= passes.length) fail();
    const pass = ctx.resolve(passes[passIndex++], FIVE.deterministicValidatorReceiptShape.requiredFields);
    const keyField = variant ? "independent_answer_key_reference" : "verified_official_key_receipt_reference";
    const fields = FIVE.deterministicValidatorInputDerivationReceiptShape.requiredFields.map(field =>
      field === "verified_official_key_receipt_reference" ? keyField : field);
    const derivation = ctx.resolve(pass.validator_input_facts_derivation_receipt_reference, fields);
    const result = ctx.resolve(pass.result_artifact_receipt_reference, FIVE.deterministicValidatorResultArtifactReceiptShape.requiredFields);
    same(derivation.question_item_object_reference, release.question_item_object_reference_or_null);
    same(derivation.choice_set_digest, release.choice_set_digest); same(derivation[keyField], keyReference);
    same(derivation.input_projection_schema_version, definition.inputProjectionSchemaVersion);
    same(derivation.validator_input_facts_schema_version, definition.inputProjectionSchemaVersion);
    same(derivation.validator_input_facts, actual.facts); same(derivation.validator_input_facts_digest, digest(actual.facts));
    same(derivation.derivation_method_id, REAL_ESTATE_METHOD.method); same(derivation.derivation_method_version, REAL_ESTATE_METHOD.version);
    same(derivation.derivation_configuration_digest, digest(REAL_ESTATE_METHOD));
    const keyRef = exactObject(keyReference, ["evidence_id", "evidence_version", "evidence_sha256"]);
    const input = { item_id: release.item_id, item_version: release.item_version, subject_id: SUBJECT,
      question_item_object_sha256: (release.question_item_object_reference_or_null as Row).object_sha256,
      choice_set_digest: release.choice_set_digest,
      [variant ? "independent_answer_key_receipt_sha256" : "verified_official_key_receipt_sha256"]: keyRef.evidence_sha256,
      source_version_manifest_reference_tuples: manifestRefs, applicability_evidence_reference_tuples: projectionRefs,
      validator_input_facts_schema_version: definition.inputProjectionSchemaVersion,
      validator_input_facts_derivation_receipt_reference: pass.validator_input_facts_derivation_receipt_reference, validator_input_facts: actual.facts };
    for (const value of [derivation, result, pass]) {
      for (const [field, expected] of Object.entries(binding)) same(value[field], expected);
      same(value.source_version_manifest_references, manifestRefs); same(value.applicability_evidence_references, projectionRefs);
    }
    for (const value of [result, pass]) {
      same(value.validator_configuration_digest, digest(realEstateValidatorConfiguration(validatorId)));
      same(value.input_projection_digest, digest(input));
      same(value.validator_input_facts_derivation_receipt_reference, pass.validator_input_facts_derivation_receipt_reference);
      same(value.assertion_count, definition.requiredAssertionIdsExactly.length); same(value.failed_assertion_count, 0); same(value.unresolved_assertion_count, 0);
    }
    const assertions = definition.requiredAssertionIdsExactly.slice().sort().map(id => {
      const rule = (definition.assertionToleranceAndUnitById as Record<string, { comparison: string; tolerance: unknown; unit: unknown }>)[id];
      return { assertion_id: id, assertion_contract_version: definition.contractVersion, comparison: rule.comparison,
        outcome: "passed", observed_value_or_null: actual.assertions![id], expected_value_or_range: actual.assertions![id],
        tolerance_or_null: rule.tolerance, unit_or_null: rule.unit, evidence_references: projectionRefs, evidence_references_digest: digest(projectionRefs) };
    });
    same(result.ordered_assertion_rows, assertions); same(result.ordered_assertion_rows_digest, digest(assertions));
    same(result.passed_assertion_count, assertions.length); requiredIdentifier(result.executor_identity);
    const earliest = Math.max(...[manifest, projection, app, key].map(row => Date.parse(requiredUtcInstant(row.reviewed_at))));
    if (Date.parse(requiredUtcInstant(derivation.evidence_observed_at)) < earliest ||
      Date.parse(requiredUtcInstant(result.executed_at)) < Date.parse(requiredUtcInstant(derivation.reviewed_at))) fail();
    ctx.review(derivation, ROLE, "verified_deterministic_validator_input_derivation", derivation.evidence_observed_at);
    ctx.review(result, ROLE, "verified_complete_validator_result", result.executed_at);
    if (Date.parse(requiredUtcInstant(pass.evidence_observed_at)) < Date.parse(requiredUtcInstant(result.executed_at))) fail();
    ctx.review(pass, ROLE, "verified_deterministic_validator_pass", result.reviewed_at);
    ctx.review(pass, ROLE, "verified_deterministic_validator_pass", pass.evidence_observed_at);
    ctx.review(subject, ROLE, "verified_not_applicable_to_law_or_kifrs", pass.reviewed_at);
  }
  if (passIndex !== passes.length) fail();
  return { sourceVersionManifestIds: [requiredIdentifier(manifest.manifest_id)] };
}
