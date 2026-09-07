import foundation from "../../../../config/s235b-first-round-adaptive-mcq-foundation-contract.json" with { type: "json" };

// Consume the existing Foundation, including its full 200-position official key
// table. This private branch changes neither that table nor the official route.
export const FIVE = foundation.fiveChoiceCorrectionContract;
export const RIGHTS = foundation.sourceRightsManifest.futureO3BReceiptContract;
export const PRIVATE_USE = Object.freeze({ plane: "Personal Raw Vault", use: "personal_service_processing", audience: "owner_user_private" });
export const RETRY_RELEASE_VERSION = "appraiser.first.private_modified_retry_release.v1";
export const RETRY_RELEASE_FIELDS = [
  ...FIVE.releaseReceiptContract.requiredFields.filter(field => ![
    "official_exam_round_id", "session_profile_id", "official_question_number", "verified_official_key_receipt_reference",
  ].includes(field)),
  "item_kind", "authority", "original_release_reference", "independent_answer_key_reference",
];
export const RETRY_KEY_FIELDS = ("receipt_id receipt_version receipt_sha256 item_id item_version subject_id " +
  "question_item_object_reference choice_set_digest answer_position_1_to_5 original_release_reference " +
  "answer_reasoning_object_reference authority reviewer reviewed_at decision").split(" ");
export const RETRY_PROVENANCE_FIELDS = [
  ...FIVE.questionItemObjectProvenanceReceiptShape.requiredFields.filter(field => ![
    "extraction_method_id", "extraction_method_version", "extraction_configuration_digest", "ocr_benchmark_gate_receipt_reference_or_null",
  ].includes(field)),
  "original_release_reference", "original_question_object_reference", "concept_binding_digest", "derivation_kind",
];
export const RELEASE_OBSERVATION_FIELDS = ("receipt_id receipt_version receipt_sha256 source_post_id source_asset_id raw_artifact_sha256 " +
  "official_exam_round_id session_profile_ids booklet_id artifact_role ordered_position_bindings " +
  "transport_receipt content_identity_receipt reviewer reviewed_at decision").split(" ");
export const MANIFEST_FIELDS = ("receipt_id receipt_version receipt_sha256 manifest_id manifest_version subject_id exam_date " +
  "applicable_version_status component_evidence_references reviewer reviewed_at decision").split(" ");
