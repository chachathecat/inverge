import { exactObject, requiredIdentifier, requiredUtcInstant } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same } from "./foundation-applicability";
import { FIVE, MANIFEST_FIELDS, RETRY_KEY_FIELDS, RELATED_LAW_AUTHORITIES } from "./foundation-release-contract";
import { rows, type ReleaseContext, type Row } from "./foundation-release-rights";

const SUBJECT_REVIEWER = "named_owner_authorized_human_subject_reviewer";
export const CIVIL_DERIVATION = Object.freeze({ method: "foundation-civil-law-proof-projection", version: "1",
  authority: "civil_code", examDate: "2026-04-04", canonicalization: "RFC8785" });
export const CIVIL_VALIDATOR_CONFIG = Object.freeze({ registryVersion: FIVE.deterministicValidatorRegistry.registryVersion,
  definition: FIVE.deterministicValidatorRegistry.definitions.exam_date_law_snapshot, canonicalization: "RFC8785" });
export const RELATED_LAW_DERIVATION = Object.freeze({ method: "foundation-related-law-proof-projection", version: "1",
  authoritySource: "relationshipLawAuthorityDerivationReceiptShape", supportedAuthorities: RELATED_LAW_AUTHORITIES.map(row => row.authorityId),
  examDate: "2026-04-04", canonicalization: "RFC8785" });
export const RELATED_LAW_VALIDATOR_CONFIG = Object.freeze({ registryVersion: FIVE.deterministicValidatorRegistry.registryVersion,
  definition: FIVE.deterministicValidatorRegistry.definitions.exam_date_multi_law_snapshot, canonicalization: "RFC8785" });

/** Recompute the bound subject-law facts and EVERY declared assertion. An installed
 * 'pass' label without the exact derivation/result/applicability chain is denied. */
export function validateLawReleaseEvidence(ctx: ReleaseContext, release: Row, preRelease: Row, keyReference: unknown, variant: boolean) {
  const definitions = FIVE.deterministicValidatorRegistry.definitions;
  if (!["civil_law", "appraiser_related_law"].includes(String(release.subject_id))) fail();
  const related = release.subject_id === "appraiser_related_law";
  const validatorId = related ? "exam_date_multi_law_snapshot" : "exam_date_law_snapshot";
  const definition = definitions[validatorId];
  const method = related ? RELATED_LAW_DERIVATION : CIVIL_DERIVATION;
  const configuration = related ? RELATED_LAW_VALIDATOR_CONFIG : CIVIL_VALIDATOR_CONFIG;
  const authorities = related ? rows(preRelease.applicable_authority_ids, 1, 9).map(value => requiredIdentifier(value)) : ["civil_code"];
  if (new Set(authorities).size !== authorities.length ||
    (related && authorities.some(id => !RELATED_LAW_AUTHORITIES.some(row => row.authorityId === id)))) fail();
  const refs = rows(release.source_version_manifest_references, 1, 1);
  const manifest = ctx.resolve(refs[0], MANIFEST_FIELDS);
  if (manifest.manifest_id !== "appraiser.first.law.2026-04-04.contract.v1" || manifest.manifest_version !== "1" ||
    manifest.subject_id !== release.subject_id || manifest.exam_date !== CIVIL_DERIVATION.examDate ||
    manifest.applicable_version_status !== preRelease.applicable_version_status) fail();
  same(manifest.component_evidence_references, preRelease.component_evidence_references);
  ctx.review(manifest, SUBJECT_REVIEWER, "verified_exact_source_version_manifest", preRelease.reviewed_at);
  const binding = { item_id: release.item_id, item_version: release.item_version, subject_id: release.subject_id,
    validator_contract_id: validatorId, validator_contract_version: definition.contractVersion };
  const applicabilityReferences = [release.pre_release_applicability_receipt_reference];
  const applicationRefs = rows(release.deterministic_validator_applicability_receipt_references, 1, 1);
  const app = ctx.resolve(applicationRefs[0], FIVE.deterministicValidatorApplicabilityReceiptShape.requiredFields);
  for (const [field, value] of Object.entries(binding)) same(app[field], value);
  same(app.question_item_object_reference, release.question_item_object_reference_or_null); same(app.choice_set_digest, release.choice_set_digest);
  same(app.feature_facts_schema_version, definition.applicabilityContract.featureFactsSchemaVersion);
  const features = { always_applicable_subject_version_check: true };
  same(app.feature_facts, features); same(app.feature_facts_digest, digest(features));
  same(app.feature_evidence_references, applicabilityReferences);
  if (app.applicability_status !== "applicable" || app.not_applicable_reason_code_or_null !== null) fail();
  ctx.review(app, SUBJECT_REVIEWER, "verified_validator_applicability", preRelease.reviewed_at);
  const passRefs = rows(release.deterministic_validator_receipt_references, 1, 1);
  const pass = ctx.resolve(passRefs[0], FIVE.deterministicValidatorReceiptShape.requiredFields);
  const keyField = variant ? "independent_answer_key_reference" : "verified_official_key_receipt_reference";
  const derivationFields = FIVE.deterministicValidatorInputDerivationReceiptShape.requiredFields.map(field =>
    field === "verified_official_key_receipt_reference" ? keyField : field);
  const derivation = ctx.resolve(pass.validator_input_facts_derivation_receipt_reference, derivationFields);
  const keyReceipt = ctx.resolve(keyReference, variant ? RETRY_KEY_FIELDS : FIVE.releaseReceiptContract.verifiedOfficialKeyReceiptShape.requiredFields);
  const result = ctx.resolve(pass.result_artifact_receipt_reference, FIVE.deterministicValidatorResultArtifactReceiptShape.requiredFields);
  const facts = { authority_ids: authorities, exam_date: method.examDate,
    amendment_chain_receipt_references: preRelease.component_evidence_references,
    [related ? "cross_authority_applicability_receipt_references" : "applicability_decision_receipt_references"]: preRelease.component_evidence_references };
  same(derivation.validator_input_facts, facts); same(derivation.validator_input_facts_digest, digest(facts));
  same(derivation.question_item_object_reference, release.question_item_object_reference_or_null);
  same(derivation.choice_set_digest, release.choice_set_digest); same(derivation[keyField], keyReference);
  same(derivation.input_projection_schema_version, definition.inputProjectionSchemaVersion);
  same(derivation.validator_input_facts_schema_version, definition.inputProjectionSchemaVersion);
  same(derivation.derivation_method_id, method.method); same(derivation.derivation_method_version, method.version);
  same(derivation.derivation_configuration_digest, digest(method));
  const key = exactObject(keyReference, ["evidence_id", "evidence_version", "evidence_sha256"]);
  const projection = { item_id: release.item_id, item_version: release.item_version, subject_id: release.subject_id,
    question_item_object_sha256: (release.question_item_object_reference_or_null as Row).object_sha256,
    choice_set_digest: release.choice_set_digest,
    [variant ? "independent_answer_key_receipt_sha256" : "verified_official_key_receipt_sha256"]: key.evidence_sha256,
    source_version_manifest_reference_tuples: refs, applicability_evidence_reference_tuples: applicabilityReferences,
    validator_input_facts_schema_version: derivation.validator_input_facts_schema_version,
    validator_input_facts_derivation_receipt_reference: pass.validator_input_facts_derivation_receipt_reference,
    validator_input_facts: facts };
  for (const row of [derivation, result, pass]) {
    for (const [field, value] of Object.entries(binding)) same(row[field], value);
    same(row.source_version_manifest_references, refs); same(row.applicability_evidence_references, applicabilityReferences);
  }
  for (const row of [result, pass]) {
    same(row.validator_configuration_digest, digest(configuration)); same(row.input_projection_digest, digest(projection));
    same(row.validator_input_facts_derivation_receipt_reference, pass.validator_input_facts_derivation_receipt_reference);
    if (row.assertion_count !== 4 || row.failed_assertion_count !== 0 || row.unresolved_assertion_count !== 0) fail();
  }
  const values: Row = { authority_set_exact: authorities, exam_date_exact: method.examDate,
    ...(related ? { all_amendment_chains_complete: true, cross_authority_applicability_resolved: true }
      : { amendment_chain_complete: true, applicability_resolved: true }) };
  const assertions = definition.requiredAssertionIdsExactly.slice().sort().map(id => {
    const rule = definition.assertionToleranceAndUnitById[id as keyof typeof definition.assertionToleranceAndUnitById];
    return { assertion_id: id, assertion_contract_version: definition.contractVersion, comparison: rule.comparison,
      outcome: "passed", observed_value_or_null: values[id], expected_value_or_range: values[id],
      tolerance_or_null: rule.tolerance, unit_or_null: rule.unit,
      evidence_references: preRelease.component_evidence_references, evidence_references_digest: digest(preRelease.component_evidence_references) };
  });
  same(result.ordered_assertion_rows, assertions); same(result.ordered_assertion_rows_digest, digest(assertions));
  if (result.passed_assertion_count !== 4) fail(); requiredIdentifier(result.executor_identity);
  ctx.review(derivation, SUBJECT_REVIEWER, "verified_deterministic_validator_input_derivation", derivation.evidence_observed_at);
  if (Date.parse(requiredUtcInstant(derivation.evidence_observed_at)) < Math.max(...[preRelease, manifest, keyReceipt].map(row => Date.parse(requiredUtcInstant(row.reviewed_at)))) ||
    Date.parse(requiredUtcInstant(result.executed_at)) < Date.parse(requiredUtcInstant(derivation.reviewed_at))) fail();
  ctx.review(result, SUBJECT_REVIEWER, "verified_complete_validator_result", result.executed_at);
  ctx.review(pass, SUBJECT_REVIEWER, "verified_deterministic_validator_pass", result.reviewed_at);
  if (Date.parse(requiredUtcInstant(pass.evidence_observed_at)) < Date.parse(requiredUtcInstant(result.executed_at))) fail();
  ctx.review(pass, SUBJECT_REVIEWER, "verified_deterministic_validator_pass", pass.evidence_observed_at);
  return { sourceVersionManifestIds: [requiredIdentifier(manifest.manifest_id)] };
}
