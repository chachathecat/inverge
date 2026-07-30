import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PRIVATE_CONTRACT_SHA256 =
  "9cd35cb2e1ed14cf62910618931d2de61d293ff62d6c9a71a7cdf54cd817e469";
const SCHEDULER_CONTRACT_SHA256 =
  "d598708aa138bad7f9e97847c0e47485d639926eda3d61b637b48d6dba6b5236";
const S237O_EVIDENCE_TEMPLATE_SHA256 =
  "9e965a84944b7610898d953a39743b2e436a39c19ca3eeb7d7ebbb9ff78b523c";
const S237O_PROPOSAL_SHA256 =
  "c72b60bb0543589673a26d177e762aca8eccd794c4b4c3bd58062329352a9662";
const RECEIPT_ASSERTION_POLICY_SHA256 =
  "d1616bbc8c7681c19b42bdffc86e0d5e34a62710bf9ba727fe5355ca0ad69da8";
const O4T_PROPOSAL_SHA256 =
  "60d62b97c50771402f70a88275d58a385ed7ee7bd2a6de28db48066f99b59a63";
const O4V_PROPOSAL_SHA256 =
  "59c6762c2dbe6519cefeef864b8d8f5f14402c3256d23ed8708ca18bb6fc4236";
const O4V_PROVIDER_BINDING_SHA256 =
  "d161f4f52c1f155e383246edd36dec6f1d56fd89aaf272f5087c2d4ba3105ee3";
const O3A_PACKET_SHA256 =
  "8189997e733eb0c8bef62c3ba5fa1cadac39a807c34d925b2e1a291fa30e654c";
const O3A_DECISION_SHA256 =
  "8841ff41dc4c9d3eb1e8bb57c2643964d4e9c54ed6825d763ccd7a6641cc987c";
const O4V_LEAN_DECISION_SHA256 =
  "5c6df014b55157a1bb5909c484662a2023cb04f40e2ed7c4ada54a57cb515ec5";
const O3A_MANIFEST_FILE_SHA256 =
  "e32fda4c8753b167cced7bd6c0247aa6ef6602fd69fc7704b289fc0942858618";
const O3A_REPORT_FILE_SHA256 =
  "7493040aec03d9a0c93ac38dbcfa98041729446963d4ad5f6e36c281c338d9c2";
const JCS_SERIALIZATION = "rfc_8785_json_canonicalization_scheme_utf8";
const PROJECTED_RESULT_ID_PATHS = [
  "request_id",
  "input_snapshot_version",
  "execution_blocks[].ephemeral_opaque_candidate_id",
  "execution_blocks[].ephemeral_opaque_window_id",
  "unassigned_candidates[].ephemeral_opaque_candidate_id",
  "violations[].ephemeral_opaque_candidate_ids[]",
];
const PROJECTED_RESULT_PROCESSING_ORDER = [
  "establish_solver_response_or_trusted_gateway_classification_origin_without_accepting_gateway_status_from_solver",
  "enter_optimal_or_feasible_branch_or_solver_or_gateway_failure_branch_with_exactly_one_allowed_success_to_failure_transition_on_canonical_or_native_validator_rejection",
  "validate_complete_raw_projected_response_exact_correlation_and_required_bijections_before_any_canonical_version_info_construction",
  "inverse_map_only_the_exact_six_identifier_bearing_paths_when_a_projected_candidate_plan_exists",
  "construct_exact_canonical_ten_field_version_info_only_inside_trusted_gateway_from_exact_trusted_correlated_configuration",
  "construct_canonical_fallback_tuple_and_state_only_inside_trusted_gateway_after_raw_projected_validation_or_failure_classification",
  "validate_complete_canonical_result_contract_replan_cutoff_pairwise_block_non_overlap_prerequisite_ordering_and_every_native_hard_constraint",
  "destroy_mapping_projected_input_and_projected_response_identifier_material",
  "verify_no_projected_identifier_in_gateway_output_logs_artifacts_caches_errors_telemetry_or_persisted_temp",
  "release_only_canonical_result_validated_native_fallback_or_manual_block_from_gateway",
];
const PROJECTED_RESULT_CONTROL_KEYS = [
  "purpose",
  "identifierDomain",
  "canonicalResultContractPath",
  "projectedInvocationContractPath",
  "statusOriginBoundary",
  "canonicalGatewayConstructionContract",
  "requestCorrelationEqualityTargets",
  "allSolverOwnedNonIdentifierValuesSchemasEnumsRulesCardinalitiesAndOrderingMustEqualCanonicalResultContractExceptExactStatusOriginAndGatewayConstructedFallbackTupleStateAndCanonicalVersionInfo",
  "canonicalResultContractMayAcceptProjectedIdentifierDomain",
  "projectedResultContractMayAcceptOriginalIdentifierDomain",
  "completeProjectedResponseValidationRequiredBeforeInverseMapping",
  "inverseMappingContract",
  "processingOrderExactly",
  "failureRouting",
  "mappingLifecycleContract",
];
const PROJECTED_RESULT_CONTRACT_KEYS = [
  "purpose",
  "identifierDomain",
  "canonicalResultContractPath",
  "projectedInvocationContractPath",
  "allowedFieldsExactly",
  "additionalFieldsAllowed",
  "nestedAdditionalFieldsAllowed",
  "freeTextAllowed",
  "executionBlockFieldsExactly",
  "unassignedCandidateFieldsExactly",
  "statusOriginBoundary",
  "canonicalGatewayConstructionContract",
  "candidateAccountingRules",
  "executionBlockDurationRules",
  "nonDroppableCandidateRules",
  "candidateWindowFeasibilityRules",
  "hardDeadlineFeasibilityRules",
  "replanCutoffFeasibilityRules",
  "pairwiseBlockNonOverlapRules",
  "prerequisiteOrderingRules",
  "objectiveComponentFieldsExactly",
  "violationFieldsExactly",
  "forbiddenFields",
  "identifierSchemas",
  "closedEnumValues",
  "scalarSchemas",
  "cardinalityLimits",
  "statuses",
  "candidateStatusesAllowedBeforeNativeValidation",
  "everyUnassignedCandidateRequiresReason",
  "unassignedReasons",
  "requestCorrelationFieldsRequired",
  "requestIdEchoRequired",
  "inputSnapshotVersionEchoRequired",
  "requestCorrelationEqualityTargets",
  "allSolverOwnedNonIdentifierValuesSchemasEnumsRulesCardinalitiesAndOrderingMustEqualCanonicalResultContractExceptExactStatusOriginAndGatewayConstructedFallbackTupleStateAndCanonicalVersionInfo",
  "canonicalResultContractMayAcceptProjectedIdentifierDomain",
  "projectedResultContractMayAcceptOriginalIdentifierDomain",
  "completeProjectedResponseValidationRequiredBeforeInverseMapping",
  "inverseMappingContract",
  "processingOrderExactly",
  "failureRouting",
  "mappingLifecycleContract",
];
const RESULT_CONTRACT_KEYS = [
  "allowedFieldsExactly",
  "additionalFieldsAllowed",
  "nestedAdditionalFieldsAllowed",
  "freeTextAllowed",
  "executionBlockFieldsExactly",
  "unassignedCandidateFieldsExactly",
  "fallbackFieldsExactly",
  "fallbackReasonValues",
  "fallbackValueRules",
  "candidateAccountingRules",
  "executionBlockDurationRules",
  "nonDroppableCandidateRules",
  "candidateWindowFeasibilityRules",
  "hardDeadlineFeasibilityRules",
  "replanCutoffFeasibilityRules",
  "pairwiseBlockNonOverlapRules",
  "prerequisiteOrderingRules",
  "versionInfoFieldsExactly",
  "versionInfoFieldSchemas",
  "versionInfoConstructionRules",
  "objectiveComponentFieldsExactly",
  "violationFieldsExactly",
  "forbiddenFields",
  "identifierSchemas",
  "closedEnumValues",
  "scalarSchemas",
  "cardinalityLimits",
  "statuses",
  "candidateStatusesAllowedBeforeNativeValidation",
  "fallbackStatuses",
  "nativeFallbackInvalidResult",
  "everyUnassignedCandidateRequiresReason",
  "unassignedReasons",
  "requestCorrelationFieldsRequired",
  "requestIdEchoRequired",
  "inputSnapshotVersionEchoRequired",
  "versionFieldsRequired",
];
const FALLBACK_STATUSES = [
  "infeasible",
  "model_invalid",
  "unknown",
  "timeout",
  "dependency_unavailable",
  "adapter_error",
  "schema_mismatch",
  "stale_response",
  "validator_rejected",
];
const SOLVER_STATUSES = [
  "optimal",
  "feasible",
  "infeasible",
  "model_invalid",
  "unknown",
];
const SOLVER_FAILURE_STATUSES = [
  "infeasible",
  "model_invalid",
  "unknown",
];
const GATEWAY_CLASSIFICATION_STATUSES = [
  "timeout",
  "dependency_unavailable",
  "adapter_error",
  "schema_mismatch",
  "stale_response",
  "validator_rejected",
];
const C3_RESULT_CONSTRAINT_CODES = [
  "candidate_accounting_exact_partition",
  "execution_block_candidate_resolves_exact_current_invocation",
  "execution_block_duration_equals_end_minus_start",
  "execution_block_duration_respects_candidate_shortening_bounds",
  "immutable_prior_placement_incompatibility_fails_closed",
];
const C4_RESULT_CONSTRAINT_CODES = [
  "non_droppable_candidates_placed_exactly_once",
  "execution_block_window_resolves_exact_current_invocation",
  "execution_block_window_allowed_for_candidate",
  "execution_block_window_available",
  "execution_block_contained_in_single_referenced_window",
  "immutable_prior_placement_candidate_window_incompatibility_fails_closed",
  "execution_block_hard_deadline_not_exceeded",
];
const SECOND_CORRECTIVE_RESULT_CONSTRAINT_CODES = [
  "new_or_moved_execution_block_starts_at_or_after_replan_cutoff",
];
const NATIVE_FALLBACK_REJECTION_CODES = [
  "missing_fallback",
  "fallback_unused",
  "fallback_reason_mismatch",
  "fallback_status_mismatch",
  "native_plan_version_invalid",
  "native_plan_unresolved_or_mutable",
  "canonical_result_contract_invalid",
  "candidate_accounting_invalid",
  "execution_block_duration_invalid",
  "non_droppable_candidate_invalid",
  "candidate_window_relation_invalid",
  "replan_cutoff_invalid",
  "block_overlap_invalid",
  "prerequisite_order_invalid",
  "hard_constraint_invalid",
  "immutable_placement_incompatible",
];
const RESULT_HARD_CONSTRAINTS = [
  "core_outcome_maximum_three",
  "all_blocks_within_available_windows",
  "fixed_and_pinned_blocks_do_not_move",
  "prior_accepted_elapsed_and_in_progress_blocks_immutable",
  "block_overlap_zero",
  "prerequisite_order_violations_zero",
  "planned_minutes_do_not_exceed_declared_availability",
  "candidate_duplicate_placement_zero",
  ...C3_RESULT_CONSTRAINT_CODES,
  ...C4_RESULT_CONSTRAINT_CODES,
  ...SECOND_CORRECTIVE_RESULT_CONSTRAINT_CODES,
  "law_blocker_never_becomes_verified_completion",
  "attempt_first_rewrite_after_attempt_and_review_only",
  "guided_exposure_never_becomes_independent_review",
  "owner_forbidden_windows_never_used",
];

const REQUIRED_RECEIPT_FIELDS = [
  "contract_version",
  "exact_head_sha",
  "exact_tree_sha",
  "opaque_environment_ref",
  "opaque_vault_ref",
  "policy_version",
  "key_class_and_epoch",
  "provider_config_version",
  "synthetic_fixture_id",
  "operation_id",
  "observed_at",
  "assertion_result",
  "cleanup_state",
  "o4v_proposal_digest_sha256",
  "o4v_approved_binding_digest_sha256",
  "provider_binding_digest_sha256",
  "assertion_policy_digest_sha256",
  "assertion_count",
  "assertion_evidence_digest_sha256",
  "attestation_run_id",
  "opaque_primary_attestor_id",
  "attestor_class",
  "attestor_version",
  "attestation_provenance_digest_sha256",
  "receipt_set_digest_sha256",
  "independent_verifier_attestation_digest_sha256",
];

const REQUIRED_RECEIPT_IDS = [
  "synthetic_write_read_after_write",
  "owner_a_read_write",
  "owner_b_read_write",
  "owner_a_to_b_and_b_to_a_uniform_denial",
  "cross_owner_list_revision_export_delete_receipt_uniform_denial",
  "approved_access_mode_tamper_replay_expiry_wrong_method_denial",
  "immutable_original_append_only_revision",
  "vault_safe_answer_pack_adapter_no_plaintext_hash_externalization",
  "timeout_and_partial_failure_no_false_success",
  "orphan_quarantine_and_idempotent_cleanup",
  "single_vault_export_without_secret_or_commitment",
  "delete_all_approved_surfaces",
  "backup_expiry_pending_distinct_from_delete_complete",
  "rollback_restore_no_deleted_content_resurrection",
  "synthetic_canary_absent_from_git_ci_logs_telemetry_provider_logs_analytics_and_support_surfaces_outside_authorized_vault",
];

const OWNED_FILES = [
  "AGENTS.md",
  "config/dabangil-unified-program-contract.json",
  "config/dabangil-private-authoring-review-plane-contract.json",
  "config/dabangil-full-day-scheduler-contract.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/decisions/2026-07-26-owner-dogfood-private-plane-schedule-amendment.md",
  "docs/dabangil-private-authoring-review-plane-contract.md",
  "docs/inverge-study-schedule-system.md",
  "docs/inverge-master-roadmap.md",
  "docs/inverge-product-constitution.md",
  "docs/dabangil-second-exam-premium-os.md",
  "docs/inverge-second-round-final-product-spec.md",
  "docs/inverge-business-model.md",
  "docs/inverge-product-brief.md",
  "docs/inverge-data-boundary.md",
  "docs/inverge-data-governance.md",
  "docs/agent-factory-github-actions-button.md",
  "docs/s235a-owner-private-golden-3-readiness.md",
  "roadmap/active-program.yml",
  "lib/review-os/s235a-owner-private-golden-3-readiness.ts",
  "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness.json",
  "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness_report.json",
  "scripts/run-node-tests.mjs",
  "tests/agent-factory-roadmap-runner.test.mjs",
  "tests/dabangil-premium-alignment.test.mjs",
  "tests/inverge-product-constitution.test.mjs",
  "tests/inverge-roadmap-curriculum-docs.test.mjs",
  "tests/agent-factory-github-actions-button.test.mjs",
  "tests/s235a-owner-private-golden-3-readiness.test.mjs",
  "tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs",
];

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function text(path) {
  return readFile(path, "utf8");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
    .join(",")}}`;
}

function canonicalSha256(value) {
  return createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function fileSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function collectNamedValues(value, names, output = []) {
  if (Array.isArray(value)) {
    for (const nested of value) collectNamedValues(nested, names, output);
    return output;
  }
  if (value === null || typeof value !== "object") return output;
  for (const [key, nested] of Object.entries(value)) {
    if (names.has(key)) output.push(nested);
    collectNamedValues(nested, names, output);
  }
  return output;
}

function proposalSha256(packet) {
  const normalized = clone(packet);
  normalized.status = null;
  normalized.ownerApproved = null;
  normalized.approvalBinding.proposalDigestSha256 = null;
  normalized.approvalRecord = null;
  return canonicalSha256(normalized);
}

function s237oProposalSha256(packet) {
  const normalized = clone(packet);
  normalized.status = null;
  normalized.owner_approved = null;
  normalized.approval_record = null;
  return canonicalSha256(normalized);
}

function projectedResultGatewayContractIsClosed(scheduler) {
  const projected = scheduler.optimizerProjectedResultContract;
  const canonical = scheduler.resultContract;
  const projection =
    scheduler.inputContract.optimizerInvocationProjectionContract;
  if (!projected || !canonical || !projection) return false;

  const canonicalSharedKeys = [
    "executionBlockFieldsExactly",
    "unassignedCandidateFieldsExactly",
    "objectiveComponentFieldsExactly",
    "violationFieldsExactly",
    "closedEnumValues",
    "cardinalityLimits",
    "candidateStatusesAllowedBeforeNativeValidation",
    "everyUnassignedCandidateRequiresReason",
    "unassignedReasons",
    "requestCorrelationFieldsRequired",
    "requestIdEchoRequired",
    "inputSnapshotVersionEchoRequired",
  ];
  const canonicalKeys = new Set(Object.keys(canonical));
  const projectedOnlyKeys = Object.keys(projected).filter(
    (key) => !canonicalKeys.has(key),
  );
  const allSolverOwnedSharedContractValuesAreExact =
    canonicalSharedKeys.every(
      (key) =>
        Object.hasOwn(projected, key) &&
        canonicalJson(projected[key]) === canonicalJson(canonical[key]),
    );
  const exactCanonicalIdentifierSchemas = {
    request_id: "^req_[A-Za-z0-9_-]{16,64}$",
    input_snapshot_version: "^snp_[A-Za-z0-9_-]{16,64}$",
    ephemeral_opaque_window_id: "^win_[A-Za-z0-9_-]{16,64}$",
    ephemeral_opaque_candidate_id: "^cand_[A-Za-z0-9_-]{16,64}$",
    native_plan_version: "closed_identifier_1_to_80_or_null",
  };
  const exactProjectedIdentifierSchemas = {
    request_id: "^oreq_[A-Za-z0-9_-]{16,64}$",
    input_snapshot_version: "^osnp_[A-Za-z0-9_-]{16,64}$",
    ephemeral_opaque_window_id: "^owin_[A-Za-z0-9_-]{16,64}$",
    ephemeral_opaque_candidate_id: "^ocand_[A-Za-z0-9_-]{16,64}$",
  };
  const inverse = projected.inverseMappingContract;
  const lifecycle = projected.mappingLifecycleContract;
  const failure = projected.failureRouting;
  const expectedPathClasses = {
    request_id: "request_id",
    input_snapshot_version: "input_snapshot_version",
    "execution_blocks[].ephemeral_opaque_candidate_id":
      "ephemeral_opaque_candidate_id",
    "execution_blocks[].ephemeral_opaque_window_id":
      "ephemeral_opaque_window_id",
    "unassigned_candidates[].ephemeral_opaque_candidate_id":
      "ephemeral_opaque_candidate_id",
    "violations[].ephemeral_opaque_candidate_ids[]":
      "ephemeral_opaque_candidate_id",
  };
  const replay = projection.identifierRemapContract.benchmarkReplaySessionContract;
  const replayArtifact =
    scheduler.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
      .resolvedArtifactMembersContract;
  const identifierFreeInput =
    replayArtifact.identifierFreeDeterministicReplayInputArtifactContract;
  const exactIdentifierFreeInputFields = [
    "artifact_contract_version",
    "canonical_projected_input_digest_sha256",
    "six_process_projected_input_digests_sha256",
  ];
  const exactIdentifierFreeInputFieldSchemas = {
    artifact_contract_version: [
      "dabangil.s237o.identifier_free_replay_input_digest_receipt.v1",
    ],
    canonical_projected_input_digest_sha256: "lowercase_hex_64",
    six_process_projected_input_digests_sha256:
      "exact_ordered_array_of_six_lowercase_hex_64",
  };
  const exactBenchmarkProcessOrder = [
    "cold_1",
    "cold_2",
    "cold_3",
    "warm_1",
    "warm_2",
    "warm_3",
  ];
  const exactFailureRouting = {
    missingUnknownDanglingDuplicateCrossClassOriginalDomainNonBijectiveOrPreservationFailureStatus:
      "schema_mismatch",
    wrongRequestOrSnapshotCorrelationStatus: "stale_response",
    knownNonDroppableDisallowedUnavailableOrOutOfBoundsRelationStatus:
      "validator_rejected",
    knownHardDeadlineBreachStatus: "validator_rejected",
    replanCutoffStructuralMappingCorrelationOrAmbiguousImmutableMatchingFailureStatus:
      "schema_mismatch",
    knownBeforeCutoffPlacementStatus: "validator_rejected",
    pairwiseNonOverlapStructuralMappingCorrelationOrAmbiguousImmutableSelfMatchingFailureStatus:
      "schema_mismatch",
    knownBlockOverlapStatus: "validator_rejected",
    prerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus:
      "schema_mismatch",
    knownMissingUnassignedOrReversedPrerequisitePlacementStatus:
      "validator_rejected",
    knownPrerequisitePlacementFailureClassificationPrecedesGenericCandidateAccountingOmissionClassification:
      true,
    everyKnownCutoffOverlapOrPrerequisiteFailureMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    rawProjectedVersionInfoOrGatewayOwnedVersionConfigurationInjectionStatus:
      "schema_mismatch",
    missingAmbiguousStaleUntrustedOrMismatchedCanonicalVersionMetadataStatus:
      "validator_rejected",
    canonicalVersionMetadataFailureMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    optimalOrFeasibleLateCanonicalOrNativeValidationFailureStatus:
      "validator_rejected",
    optimalOrFeasibleLateCanonicalOrNativeValidationFailureMustDiscardCandidatePlanAndUsedFalseTupleAndTransitionExactlyOnceToIndependentCanonicalNativeFallback:
      true,
    everySolverFailureOrTrustedGatewayClassificationMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    projectedFailureEnvelopeMayContainReferenceAuthorizeOrReleaseCanonicalFallback:
      false,
    canonicalFallbackTupleAndStateConstructedOnlyByTrustedGateway: true,
    canonicalNativeFallbackPreparedAndValidatedOnlyInOriginalIdentifierDomain:
      true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidProjectedCandidatePlanOrFailureEnvelopeMayReachNativeValidationOrGatewayOutput:
      false,
  };
  const exactStatusOriginBoundary = {
    solverOwnedStatusesExactly: SOLVER_STATUSES,
    solverCandidatePlanStatusesExactly: ["optimal", "feasible"],
    solverFailureStatusesExactly: SOLVER_FAILURE_STATUSES,
    trustedGatewayClassificationStatusesExactly:
      GATEWAY_CLASSIFICATION_STATUSES,
    canonicalGatewayOnlyStatusesExactly: [
      "fallback",
      "blocked_manual_plan_required",
    ],
    projectedResponseStatusMustBeSolverOwned: true,
    timeoutDependencyUnavailableAndAdapterErrorAreTrustedGatewayClassificationsNotSolverAuthoredStatuses:
      true,
    isolatedSolverMayAuthorTrustedGatewayClassificationOrCanonicalGatewayOnlyStatus:
      false,
    projectedCandidatePlanFieldsExactly: [
      "execution_blocks",
      "unassigned_candidates",
    ],
    projectedCandidatePlanFieldsMayAppearOnlyForOptimalOrFeasible: true,
    projectedFailureMayContainOrReleaseCandidatePlan: false,
    projectedResponseMayContainFallback: false,
    projectedResponseMayContainNativePlanVersion: false,
    projectedResponseMayContainCanonicalNativeFallbackPlanOrReference: false,
    projectedResponseMayContainVersionInfoOrGatewayOwnedVersionConfigurationFields:
      false,
  };
  const exactGatewayConstructionContract = {
    gatewayAloneOwnsCanonicalFallbackTupleAndState: true,
    gatewayAloneConstructsCanonicalVersionInfoFromExactTrustedCorrelatedConfiguration:
      true,
    gatewayConstructedFallbackStateAndCanonicalVersionInfoAreTheOnlyAllowedExceptionsToFormerBlanketProjectedCanonicalNonIdentifierEquality:
      true,
    gatewayConstructedProjectedCanonicalNonIdentifierExceptionsExactly: [
      "canonical_fallback_tuple_and_state",
      "canonical_version_info",
    ],
    canonicalVersionInfoFieldsExactly: [
      "contract_version",
      "native_policy_version",
      "adapter_version",
      "optimizer_version",
      "objective_version",
      "threshold_version",
      "solver_seed",
      "solver_workers",
      "time_limit_ms",
      "integer_scaling_version",
    ],
    canonicalVersionInfoTrustedSourceExact:
      "exact_trusted_correlated_gateway_configuration_for_the_same_validated_invocation",
    completeRawResponseExactCorrelationAndRequiredBijectionValidationMustFinishBeforeCanonicalVersionInfoConstruction:
      true,
    rawProjectedResponseMayContainAcceptRequireOrAuthorCanonicalVersionInfoOrAnyGatewayOwnedVersionConfigurationField:
      false,
    constructedCanonicalVersionInfoMustMatchExactTrustedCorrelatedConfigurationFieldForField:
      true,
    missingAmbiguousStaleUntrustedOrMismatchedCanonicalVersionMetadataTrustedGatewayClassification:
      "validator_rejected",
    missingAmbiguousStaleUntrustedOrMismatchedCanonicalVersionMetadataMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    missingAmbiguousStaleUntrustedOrMismatchedCanonicalVersionMetadataInvalidFallbackResult:
      "blocked_manual_plan_required",
    canonicalVersionInfoConstructionContract: {
      fieldsExactlySource: "resultContract.versionInfoFieldsExactly",
      fieldSchemasSource: "resultContract.versionInfoFieldSchemas",
      requiredFieldsSource: "resultContract.versionFieldsRequired",
      trustedConfigurationSource:
        "exact_trusted_correlated_gateway_configuration_for_the_same_validated_invocation",
      fieldSourceMappingExactly: {
        contract_version: "trusted_configuration.contract_version",
        native_policy_version: "trusted_configuration.native_policy_version",
        adapter_version: "trusted_configuration.adapter_version",
        optimizer_version: "trusted_configuration.optimizer_version",
        objective_version: "trusted_configuration.objective_version",
        threshold_version: "trusted_configuration.threshold_version",
        solver_seed: "trusted_configuration.solver_seed",
        solver_workers: "trusted_configuration.solver_workers",
        time_limit_ms: "trusted_configuration.time_limit_ms",
        integer_scaling_version:
          "trusted_configuration.integer_scaling_version",
      },
      rawProjectedResponseMaySourceOverrideSelectOrAuthorAnyField: false,
      trustedConfigurationMustBeCurrentTrustedUnambiguousAndBoundToExactInvocation:
        true,
      constructedValuesMustMatchActualInvocationConfigurationFieldForField:
        true,
      constructionMayOccurBeforeCompleteRawResponseExactCorrelationAndRequiredBijectionValidation:
        false,
      missingAmbiguousStaleUntrustedOrMismatchMayReleasePartialVersionInfoOrCandidatePlan:
        false,
      failureMustEnterExistingSingleNativeFallbackBranchExactlyOnce: true,
      invalidFallbackResult: "blocked_manual_plan_required",
      fallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
    },
    directGatewayFailureWithoutRawSolverResponseMayFabricateAProjectedResponse:
      false,
    directGatewayFailureMustValidateRetainedExactInvocationAndTrustedConfigurationBindingBeforeCanonicalVersionInfoConstruction:
      true,
    optimalOrFeasibleBranchOrderExactly: [
      "validate_complete_raw_projected_candidate_plan_response_without_version_info_or_gateway_owned_version_configuration_fields",
      "validate_exact_request_snapshot_correlation_and_per_class_bijections",
      "validate_projected_candidate_accounting_duration_non_droppable_candidate_window_hard_deadline_replan_cutoff_pairwise_block_non_overlap_and_prerequisite_ordering_rules_using_trusted_gateway_context",
      "inverse_map_exactly_the_existing_six_identifier_bearing_paths",
      "preserve_every_solver_owned_non_id_value_and_array_cardinality_and_order",
      "trusted_gateway_constructs_exact_canonical_ten_field_version_info_from_exact_trusted_correlated_configuration",
      "trusted_gateway_constructs_canonical_fallback_used_false_reason_not_used_native_plan_version_null",
      "validate_complete_canonical_result_contract_replan_cutoff_pairwise_block_non_overlap_prerequisite_ordering_and_every_native_hard_constraint",
      "on_canonical_or_native_rejection_discard_candidate_plan_and_used_false_tuple_classify_validator_rejected_and_transition_exactly_once_to_failure_branch",
      "release_only_when_complete_canonical_and_native_validation_succeeds",
    ],
    solverOrTrustedGatewayFailureBranchOrderExactly: [
      "validate_or_classify_raw_projected_attempt_without_accepting_version_info_gateway_owned_version_configuration_or_canonical_fallback_state",
      "validate_exact_request_snapshot_correlation_and_required_bijections_before_any_canonical_version_info_construction",
      "independently_resolve_or_prepare_exactly_one_immutable_native_fallback_in_canonical_original_id_domain",
      "trusted_gateway_constructs_exact_canonical_ten_field_version_info_from_exact_trusted_correlated_configuration",
      "trusted_gateway_constructs_canonical_fallback_used_true_exact_trigger_reason_and_non_null_closed_native_plan_version",
      "validate_complete_canonical_result_contract_candidate_accounting_duration_non_droppable_candidate_window_hard_deadline_replan_cutoff_pairwise_block_non_overlap_prerequisite_ordering_and_every_hard_constraint",
      "return_only_blocked_manual_plan_required_when_canonical_fallback_is_missing_unavailable_or_invalid",
    ],
    optimalOrFeasibleCanonicalFallbackTupleExactly: {
      used: false,
      reason_enum: "not_used",
      native_plan_version: null,
    },
    failureCanonicalFallbackTupleRules: {
      used: true,
      reason_enum: "exact_solver_failure_or_trusted_gateway_classification",
      native_plan_version:
        "non_null_closed_identifier_resolving_exact_immutable_canonical_native_fallback",
    },
    lateCanonicalOrNativeValidationRejectionTransition: {
      appliesWhen:
        "projected_optimal_or_feasible_passes_projected_validation_correlation_and_inverse_mapping_but_complete_canonical_result_or_native_hard_constraint_validation_rejects",
      trustedGatewayClassification: "validator_rejected",
      discardCandidatePlanAndUsedFalseTupleWithoutRelease: true,
      transitionExactlyOnceToSolverOrTrustedGatewayFailureBranch: true,
      canonicalFallbackMustBePreparedIndependentlyInOriginalIdentifierDomain:
        true,
      projectedOrRejectedCandidatePlanMayBeReusedAsCanonicalFallback: false,
      fallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
      invalidFallbackResult: "blocked_manual_plan_required",
    },
    canonicalVersionInfoConstructionFailureTransition: {
      trustedGatewayClassification: "validator_rejected",
      canonicalVersionInfoMayBePartiallyConstructedOrReleased: false,
      projectedCandidatePlanMayBeReleased: false,
      transitionExactlyOnceToSolverOrTrustedGatewayFailureBranch: true,
      canonicalFallbackMustBePreparedIndependentlyInOriginalIdentifierDomain:
        true,
      fallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
      invalidFallbackResult: "blocked_manual_plan_required",
    },
    projectedFailureEnvelopeMayReferenceAuthorizeOrReleaseCanonicalFallback:
      false,
    projectedFailureEnvelopeMayContainVersionInfoOrGatewayOwnedVersionConfigurationFields:
      false,
    canonicalFallbackMustBePreparedIndependentlyOfProjectedResponse: true,
    canonicalFallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
    invalidCanonicalFallbackResult: "blocked_manual_plan_required",
    invalidCanonicalFallbackMayReleaseCandidatePlan: false,
  };

  return (
    projected.purpose ===
      "validate_solver_owned_projected_response_without_canonical_fallback_state_before_trusted_gateway_construction" &&
    projected.identifierDomain ===
      "projected_oreq_osnp_owin_ocand_only" &&
    projected.canonicalResultContractPath === "resultContract" &&
    projected.projectedInvocationContractPath ===
      "inputContract.optimizerInvocationProjectionContract" &&
    projected.additionalFieldsAllowed === false &&
    projected.nestedAdditionalFieldsAllowed === false &&
    projected.freeTextAllowed === false &&
    canonicalJson(Object.keys(projected)) ===
      canonicalJson(PROJECTED_RESULT_CONTRACT_KEYS) &&
    canonicalJson(projectedOnlyKeys) ===
      canonicalJson(PROJECTED_RESULT_CONTROL_KEYS) &&
    allSolverOwnedSharedContractValuesAreExact &&
    canonicalJson(projected.allowedFieldsExactly) ===
      canonicalJson([
        "request_id",
        "input_snapshot_version",
        "status",
        "execution_blocks",
        "unassigned_candidates",
        "objective_components",
        "violations",
        "elapsed_ms",
      ]) &&
    canonicalJson(projected.statuses) === canonicalJson(SOLVER_STATUSES) &&
    !Object.hasOwn(projected, "fallbackFieldsExactly") &&
    !Object.hasOwn(projected, "fallbackReasonValues") &&
    !Object.hasOwn(projected, "fallbackValueRules") &&
    !Object.hasOwn(projected, "fallbackStatuses") &&
    !Object.hasOwn(projected, "nativeFallbackInvalidResult") &&
    !Object.hasOwn(projected, "versionInfoFieldsExactly") &&
    !Object.hasOwn(projected, "versionInfoFieldSchemas") &&
    !Object.hasOwn(projected, "versionFieldsRequired") &&
    !Object.hasOwn(projected.identifierSchemas, "native_plan_version") &&
    !Object.hasOwn(projected.scalarSchemas, "fallback_used") &&
    [
      "version_info",
      "contract_version",
      "native_policy_version",
      "adapter_version",
      "optimizer_version",
      "objective_version",
      "threshold_version",
      "solver_seed",
      "solver_workers",
      "time_limit_ms",
      "integer_scaling_version",
      "fallback",
      "fallback_reason_enum",
      "native_plan_version",
      "canonical_native_fallback_plan",
      "canonical_native_fallback_plan_ref",
      "canonical_plan_reference",
    ].every((field) => projected.forbiddenFields.includes(field)) &&
    canonicalJson(projected.statusOriginBoundary) ===
      canonicalJson(exactStatusOriginBoundary) &&
    canonicalJson(projected.canonicalGatewayConstructionContract) ===
      canonicalJson(exactGatewayConstructionContract) &&
    canonicalJson(canonical.identifierSchemas) ===
      canonicalJson(exactCanonicalIdentifierSchemas) &&
    canonicalJson(projected.identifierSchemas) ===
      canonicalJson(exactProjectedIdentifierSchemas) &&
    projected
      .allSolverOwnedNonIdentifierValuesSchemasEnumsRulesCardinalitiesAndOrderingMustEqualCanonicalResultContractExceptExactStatusOriginAndGatewayConstructedFallbackTupleStateAndCanonicalVersionInfo ===
      true &&
    projected.canonicalResultContractMayAcceptProjectedIdentifierDomain ===
      false &&
    projected.projectedResultContractMayAcceptOriginalIdentifierDomain ===
      false &&
    projected.completeProjectedResponseValidationRequiredBeforeInverseMapping ===
      true &&
    canonicalJson(projected.requestCorrelationEqualityTargets) ===
      canonicalJson({
        request_id: "exact_projected_invocation.ephemeral_request_id",
        input_snapshot_version:
          "exact_projected_invocation.ephemeral_input_snapshot_version",
      }) &&
    canonicalJson(inverse.identifierBearingPathsExactly) ===
      canonicalJson(PROJECTED_RESULT_ID_PATHS) &&
    new Set(inverse.identifierBearingPathsExactly).size ===
      PROJECTED_RESULT_ID_PATHS.length &&
    canonicalJson(inverse.pathIdentifierClasses) ===
      canonicalJson(expectedPathClasses) &&
    inverse.bijectionSource ===
      "inputContract.optimizerInvocationProjectionContract.identifierRemapContract" &&
    inverse.samePerInvocationBijectionsUsedForProjectionAndInverseMapping ===
      true &&
    inverse.allNonIdentifierValuesPreservedExactly === true &&
    inverse.allArrayCardinalitiesAndOrderingPreservedExactly === true &&
    inverse.inverseMappingMayFilterSortDeduplicateInsertOrDropArrayEntries ===
      false &&
    inverse
      .inverseMappedResultMustValidateAgainstCanonicalResultContractBeforeNativeValidation ===
      true &&
    inverse.duplicateMappingDefinition ===
      "duplicate_source_entry_duplicate_projected_entry_one_to_many_or_many_to_one_within_any_identifier_class_not_repeated_valid_reference_use" &&
    inverse
      .missingUnknownDanglingDuplicateCrossClassOriginalDomainOrNonBijectiveMappingAllowed ===
      false &&
    inverse.partialInverseMappingOrReleaseOfInvalidProjectedResponseAllowed ===
      false &&
    canonicalJson(projected.processingOrderExactly) ===
      canonicalJson(PROJECTED_RESULT_PROCESSING_ORDER) &&
    canonicalJson(failure) === canonicalJson(exactFailureRouting) &&
    failure
      .missingUnknownDanglingDuplicateCrossClassOriginalDomainNonBijectiveOrPreservationFailureStatus ===
      "schema_mismatch" &&
    failure.wrongRequestOrSnapshotCorrelationStatus === "stale_response" &&
    failure
      .knownNonDroppableDisallowedUnavailableOrOutOfBoundsRelationStatus ===
      "validator_rejected" &&
    failure
      .everySolverFailureOrTrustedGatewayClassificationMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback ===
      true &&
    failure
      .projectedFailureEnvelopeMayContainReferenceAuthorizeOrReleaseCanonicalFallback ===
      false &&
    failure.canonicalFallbackTupleAndStateConstructedOnlyByTrustedGateway ===
      true &&
    failure
      .canonicalNativeFallbackPreparedAndValidatedOnlyInOriginalIdentifierDomain ===
      true &&
    failure.invalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    failure.invalidNativeFallbackMayTriggerAnotherFallback === false &&
    failure
      .invalidProjectedCandidatePlanOrFailureEnvelopeMayReachNativeValidationOrGatewayOutput ===
      false &&
    lifecycle.mappingExistsOnlyInsideTrustedNativeGateway === true &&
    lifecycle.mappingMustRemainUntilCompleteProjectedResponseValidationAndRequiredInverseMappingFinish ===
      true &&
    lifecycle.mappingMayBeDestroyedBeforeCompleteProjectedResponseValidationAndRequiredInverseMappingFinish ===
      false &&
    lifecycle.singleInvocationSuccessDestroysMappingAfterCanonicalAndNativeValidationBeforeGatewayOutput ===
      true &&
    lifecycle.singleInvocationFailureDestroysMappingAfterFailureClassificationAndValidatedNativeFallbackPreparationBeforeGatewayOutput ===
      true &&
    lifecycle.sixProcessBenchmarkRetainsSameMappingThroughAllSixProjectedResponseValidationsInverseMappingsCanonicalValidationsAndNativeValidations ===
      true &&
    lifecycle.sixProcessBenchmarkSuccessDestroysMappingOnlyAfterSixthCompleteValidationPathAndBeforeAnyCanonicalResultSetLeavesGateway ===
      true &&
    lifecycle.sixProcessBenchmarkFailureDestroysMappingAfterFailureClassificationAndValidatedNativeFallbackPreparationBeforeGatewayExit ===
      true &&
    lifecycle.mappingDestroyedOnEverySuccessAndFailurePath === true &&
    lifecycle.mappingRetainedAfterGatewayExit === false &&
    lifecycle.projectedIdentifierMayLeaveGatewayOrEnterLogsArtifactsCachesErrorsTelemetryOrPersistedTemp ===
      false &&
    replay
      .mappingAndProjectedInputMustRemainThroughAllSixCompleteProjectedResponseValidationsAndInverseMappingsOnSuccess ===
      true &&
    replay
      .mappingMayBeDestroyedBeforeTheSixthProjectedResponseValidationAndInverseMappingCompletesOnSuccess ===
      false &&
    replay
      .mappingAndProjectedIdentifierMaterialMustBeDestroyedAfterTheSixthCompleteCanonicalAndNativeValidationPathOrAfterAnyFailureIsClassifiedAndValidatedNativeFallbackIsPreparedAndBeforeGatewayExit ===
      true &&
    !Object.hasOwn(
      replay,
      "mappingAndProjectedInputMustBeDestroyedImmediatelyAfterSixthReplayOrAnyFailure",
    ) &&
    projection.projectionRules
      .ephemeralIdMappingMustRemainInsideTrustedNativeGatewayMemoryUntilProjectedResponseValidationAndRequiredInverseMappingFinish ===
      true &&
    projection.projectionRules
      .ephemeralIdMappingMayBeDestroyedBeforeProjectedResponseValidationAndRequiredInverseMappingFinish ===
      false &&
    !Object.hasOwn(
      projection.projectionRules,
      "ephemeralIdMappingMustRemainInsideTrustedNativeGatewayMemoryAndBeDestroyedAfterRequest",
    ) &&
    projection.projectionRules
      .optimizerLogsArtifactsCachesErrorsTelemetryAndPersistedTempSurfacesMayContainProjectedIdentifiers ===
      false &&
    projection.projectionRules
      .onlyCanonicalInverseMappedResultsOrIdentifierFreeDigestReceiptsMayLeaveTrustedNativeGateway ===
      true &&
    replayArtifact.memberSchemaContracts.deterministic_replay_input_artifact ===
      "benchmarkResultDigestContract.resolvedArtifactMembersContract.identifierFreeDeterministicReplayInputArtifactContract" &&
    canonicalJson(identifierFreeInput.fieldsExactly) ===
      canonicalJson(exactIdentifierFreeInputFields) &&
    canonicalJson(identifierFreeInput.fieldSchemas) ===
      canonicalJson(exactIdentifierFreeInputFieldSchemas) &&
    identifierFreeInput.additionalFieldsAllowed === false &&
    identifierFreeInput.freeTextAllowed === false &&
    canonicalJson(identifierFreeInput.processOrderingExactly) ===
      canonicalJson(exactBenchmarkProcessOrder) &&
    identifierFreeInput.exactProcessDigestCount === 6 &&
    identifierFreeInput.allSixProcessDigestsMustEqualCanonicalProjectedInputDigest ===
      true &&
    identifierFreeInput.canonicalProjectedInputDigestComputedInsideTrustedNativeGatewayFromExactValidatedProjectedInputBytes ===
      true &&
    identifierFreeInput.projectedInputBytesMayLeaveTrustedNativeGateway ===
      false &&
    identifierFreeInput.projectedIdentifierValuesMayAppearInArtifact === false &&
    identifierFreeInput
      .projectedIdentifierValuesMayAppearInLogsCachesErrorsTelemetryOrPersistedTempSurfaces ===
      false &&
    identifierFreeInput.digestReceiptMayMaterializeOnlyAfterMappingAndProjectedIdentifierMaterialAreDestroyed ===
      true
  );
}

function c3ResultValidationContractsAreClosed(scheduler) {
  const canonical = scheduler.resultContract;
  const projected = scheduler.optimizerProjectedResultContract;
  if (!canonical || !projected) return false;

  const exactFallbackValueRules = {
    usedFalseRequiresReasonNotUsedAndNativePlanVersionNull: true,
    usedTrueRequiresTriggerReasonAndClosedNativePlanVersion: true,
    fallbackStatusRequiresUsedTrue: true,
    optimalOrFeasibleRequiresUsedFalse: true,
    blockedManualPlanRequiredMayFollowOnlyInvalidNativeFallback: true,
    everyFallbackStatusesMemberRequiresUsedTrue: true,
    everyFallbackStatusesMemberRequiresReasonEnumEqualTriggeringStatus: true,
    everyFallbackStatusesMemberRequiresNonNullClosedNativePlanVersion: true,
    literalFallbackStatusRequiresUsedTrue: true,
    literalFallbackStatusRequiresReasonEnumInFallbackStatuses: true,
    literalFallbackStatusRequiresNonNullClosedNativePlanVersion: true,
    literalFallbackStatusRequiresReasonInFallbackStatusesAndNonNullClosedNativePlanVersion:
      true,
    nativePlanVersionMustResolveOneExactImmutableCanonicalNativeFallbackPlan:
      true,
    failureStatusEnvelopeMaySelfAuthorizeReferencedNativeFallbackRelease:
      false,
    trustedNativeGatewayMustResolveOrPrepareExactImmutableCanonicalNativeFallbackIndependentlyOfOptimizerResponse:
      true,
    canonicalFallbackTupleAndStateMayBeConstructedAndAttachedOnlyByTrustedGateway:
      true,
    projectedSolverResponseMaySupplyFallbackNativePlanVersionCanonicalPlanOrCanonicalPlanReference:
      false,
    projectedSolverResponseMaySupplyVersionInfoOrGatewayOwnedVersionConfigurationFields:
      false,
    canonicalVersionInfoMustBeConstructedByTrustedGatewayFromExactTrustedCorrelatedConfigurationAfterRawResponseCorrelationAndBijectionValidation:
      true,
    referencedNativeFallbackMustBeSeparatelyValidatedAgainstCanonicalCandidateAccountingExecutionBlockDurationAndAllHardConstraintsBeforeRelease:
      true,
    referencedNativeFallbackMustBeSeparatelyValidatedAgainstCanonicalCandidateAccountingExecutionBlockDurationNonDroppableCandidateWindowAndAllHardConstraintsBeforeRelease:
      true,
    referencedNativeFallbackMustBeSeparatelyValidatedAgainstCanonicalTenFieldVersionInfoAndHardDeadlineFeasibilityBeforeRelease:
      true,
    referencedNativeFallbackMustBeSeparatelyValidatedAgainstCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingBeforeRelease:
      true,
    missingFallbackMismatchedReasonInvalidVersionOrInvalidNativePlanResult:
      "blocked_manual_plan_required",
    missingUnavailableNonDroppableInvalidCandidateWindowInvalidHardDeadlineInvalidReplanCutoffOverlappingInvalidPrerequisiteInvalidCanonicalVersionInfoOrHardConstraintInvalidNativePlanResult:
      "blocked_manual_plan_required",
    missingFallbackMismatchedReasonInvalidVersionOrInvalidNativePlanMayReleaseCandidatePlan:
      false,
    canonicalNativeFallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
    blockedManualPlanRequiredRequiresUsedFalseReasonNotUsedAndNativePlanVersionNull:
      true,
    blockedManualPlanRequiredMayCarryTriggerReasonOrNativePlanVersion:
      false,
    blockedManualPlanRequiredMayReleaseExecutionBlocksOrReferencedNativePlan:
      false,
  };
  const exactCandidateAccountingRules = {
    directCandidatePlanStatusesExactly: ["optimal", "feasible"],
    validatedNativeFallbackTriggerStatusesExactly: FALLBACK_STATUSES,
    validatedNativeFallbackEnvelopeStatusesExactly: [
      ...FALLBACK_STATUSES,
      "fallback",
    ],
    literalFallbackStatusPlanMustBeValidatedNativeFallback: true,
    allReleasableValidatedNativeFallbackPlansMustSatisfyTheseSameRules: true,
    exactCorrelatedInvocationCandidateSetSource:
      "exact_current_correlated_invocation.candidates[].ephemeral_opaque_candidate_id",
    exactCorrelatedInvocationCandidateIdsUnique: true,
    candidateIdentifiersMustUseActiveContainingContractDomain: true,
    executionBlockCandidateIdsMustEachResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    unassignedCandidateIdsMustEachResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    executionBlockCandidateIdsUnique: true,
    unassignedCandidateIdsUnique: true,
    executionBlockAndUnassignedCandidateIdSetsDisjoint: true,
    executionBlockAndUnassignedCandidateIdSetUnionMustEqualExactCorrelatedInvocationCandidateSet:
      true,
    everyInvocationCandidateMustAppearExactlyOnce: true,
    missingUnknownExtraDuplicateOmittedOrPlacedAndUnassignedCandidateAllowed:
      false,
    violationCandidateIdsAreDiagnosticOnlyAndCannotSatisfyAccounting: true,
    directOrProjectedCandidateAccountingFailureStatus: "schema_mismatch",
    directOrProjectedCandidateAccountingFailureMustAttemptExactlyOneSeparatelyValidatedNativeFallback:
      true,
    validatedNativeFallbackCandidateAccountingFailureResult:
      "blocked_manual_plan_required",
    validatedNativeFallbackCandidateAccountingFailureMayTriggerAnotherFallback:
      false,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
  };
  const exactExecutionBlockDurationRules = {
    appliesToEveryExecutionBlockInOptimalFeasibleAndEveryReleasableValidatedNativeFallbackPlan:
      true,
    candidateResolutionSource:
      "exact_current_correlated_invocation.candidates",
    eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    durationMinutesMustEqualEndMinuteKstMinusStartMinuteKst: true,
    canShortenFalseRequiresDurationMinutesEqualEstimatedMinutes: true,
    canShortenTrueRequiresMinimumMinutesLessThanOrEqualDurationMinutesLessThanOrEqualEstimatedMinutes:
      true,
    durationMinutesMayExceedEstimatedMinutes: false,
    elapsedAndInProgressPriorPlacementFieldsRemainImmutableExactly: [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
    immutableElapsedOrInProgressPlacementMayBeMovedShortenedExtendedOrRewrittenToSatisfyCurrentCandidate:
      false,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityMayReachOptimizer:
      false,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityFallbackTriggerStatus:
      "validator_rejected",
    preProjectionImmutablePlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus:
      true,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback:
      true,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy:
      true,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult:
      "blocked_manual_plan_required",
    preProjectionImmutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback:
      false,
    optimizerResultDurationOrImmutablePlacementMutationFailureStatus:
      "validator_rejected",
    optimizerResultDurationOrImmutablePlacementMutationMustAttemptExactlyOneSeparatelyValidatedNativeFallback:
      true,
    optimizerResultDurationOrImmutablePlacementMutationMustUseSeparatelyValidatedNativeFallbackThatPreservesTheOriginalImmutablePlacement:
      true,
    optimizerResultDurationOrImmutablePlacementMutationInvalidNativeFallbackMayTriggerAnotherFallback:
      false,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
  };
  const exactProjectedCandidateAccountingRules = {
    directCandidatePlanStatusesExactly: ["optimal", "feasible"],
    exactCorrelatedInvocationCandidateSetSource:
      "exact_current_correlated_invocation.candidates[].ephemeral_opaque_candidate_id",
    exactCorrelatedInvocationCandidateIdsUnique: true,
    candidateIdentifiersMustUseActiveContainingContractDomain: true,
    executionBlockCandidateIdsMustEachResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    unassignedCandidateIdsMustEachResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    executionBlockCandidateIdsUnique: true,
    unassignedCandidateIdsUnique: true,
    executionBlockAndUnassignedCandidateIdSetsDisjoint: true,
    executionBlockAndUnassignedCandidateIdSetUnionMustEqualExactCorrelatedInvocationCandidateSet:
      true,
    everyInvocationCandidateMustAppearExactlyOnce: true,
    missingUnknownExtraDuplicateOmittedOrPlacedAndUnassignedCandidateAllowed:
      false,
    violationCandidateIdsAreDiagnosticOnlyAndCannotSatisfyAccounting: true,
    projectedCandidateAccountingFailureTrustedGatewayClassification:
      "schema_mismatch",
    projectedCandidateAccountingFailureMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactProjectedExecutionBlockDurationRules = {
    appliesToEveryExecutionBlockInOptimalAndFeasibleProjectedCandidatePlans:
      true,
    candidateResolutionSource:
      "exact_current_correlated_invocation.candidates",
    eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    durationMinutesMustEqualEndMinuteKstMinusStartMinuteKst: true,
    canShortenFalseRequiresDurationMinutesEqualEstimatedMinutes: true,
    canShortenTrueRequiresMinimumMinutesLessThanOrEqualDurationMinutesLessThanOrEqualEstimatedMinutes:
      true,
    durationMinutesMayExceedEstimatedMinutes: false,
    elapsedAndInProgressPriorPlacementFieldsRemainImmutableExactly: [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
    immutableElapsedOrInProgressPlacementMayBeMovedShortenedExtendedOrRewrittenToSatisfyCurrentCandidate:
      false,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityMayReachOptimizer:
      false,
    preProjectionImmutablePlacementCandidateDurationIncompatibilityTrustedGatewayClassification:
      "validator_rejected",
    preProjectionImmutablePlacementCandidateDurationIncompatibilityMayBeRepairedByOptimizerOrProjectedResponse:
      false,
    optimizerResultDurationOrImmutablePlacementMutationTrustedGatewayClassification:
      "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactNonDroppableCoreRules = {
    nonDroppableDefinitionExact:
      "candidate.pinned === true || candidate.can_drop === false",
    pinnedAndCanDropTruthTableExactly: [
      { pinned: false, can_drop: true, non_droppable: false },
      { pinned: false, can_drop: false, non_droppable: true },
      { pinned: true, can_drop: true, non_droppable: true },
      { pinned: true, can_drop: false, non_droppable: true },
    ],
    everyNonDroppableCandidateMustOccurExactlyOnceInExecutionBlocks: true,
    everyNonDroppableCandidateMustOccurZeroTimesInUnassignedCandidates: true,
    onlyPinnedFalseAndCanDropTrueCandidateMayBeUnassigned: true,
    unassignedReasonMayOverrideNonDroppability: false,
    ownerPinnedConflictReasonMayOverrideNonDroppability: false,
    lowerValueThanSelectedReasonMayOverrideNonDroppability: false,
    requirednessEnumMayRedefineNonDroppability: false,
  };
  const exactCanonicalNonDroppableRules = {
    appliesToEveryOptimalFeasibleAndReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    ...exactNonDroppableCoreRules,
    knownNonDroppableViolationStatus: "validator_rejected",
    knownNonDroppableViolationMustAttemptExactlyOneSeparatelyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustPlaceEveryNonDroppableCandidateExactlyOnce:
      true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedNonDroppableRules = {
    appliesToEveryOptimalAndFeasibleProjectedCandidatePlan: true,
    ...exactNonDroppableCoreRules,
    knownNonDroppableViolationTrustedGatewayClassification:
      "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactCandidateWindowCoreRules = {
    candidateResolutionSource:
      "exact_current_correlated_invocation.candidates",
    windowResolutionSource:
      "exact_current_correlated_invocation.available_windows",
    eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    eachExecutionBlockWindowMustResolveExactlyOnceThroughSameExactCurrentInvocation:
      true,
    executionBlockWindowIdMustBelongToResolvedCandidateAllowedWindowIds:
      true,
    resolvedWindowAvailableMustEqualTrue: true,
    singleReferencedWindowContainmentPredicateExact:
      "window.start_minute_kst <= block.start_minute_kst < block.end_minute_kst <= window.end_minute_kst",
    blockMustBeCompletelyContainedInsideSingleReferencedWindow: true,
    blockMayStitchOrSpanAdjacentWindows: false,
    preProjectionElapsedAndInProgressPlacementMustSatisfyExactCurrentCandidateWindowRelation:
      true,
    preProjectionImmutableCandidateWindowIncompatibilityMayReachOptimizer:
      false,
    preProjectionImmutableCandidateWindowIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting:
      false,
    futurePriorPlacementRemainsSoftPreferenceOnly: true,
    everyEmittedFuturePriorPlacementBlockMustSatisfyEveryCandidateWindowPredicate:
      true,
  };
  const exactCanonicalCandidateWindowRules = {
    appliesToEveryExecutionBlockInOptimalFeasibleAndEveryReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    ...exactCandidateWindowCoreRules,
    unknownDanglingDuplicateCrossDomainOrNonBijectiveCandidateOrWindowRelationStatus:
      "schema_mismatch",
    knownDisallowedUnavailableOrOutOfBoundsRelationStatus:
      "validator_rejected",
    knownCandidateWindowViolationMustAttemptExactlyOneSeparatelyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustSatisfyEveryCandidateWindowPredicate: true,
    preProjectionImmutableCandidateWindowIncompatibilityMustAttemptExactlyOneSeparatelyPreparedCanonicalNativeFallbackPreservingTheImmutablePlacement:
      true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedCandidateWindowRules = {
    appliesToEveryExecutionBlockInOptimalAndFeasibleProjectedCandidatePlans:
      true,
    ...exactCandidateWindowCoreRules,
    unknownDanglingDuplicateCrossDomainOrNonBijectiveCandidateOrWindowRelationTrustedGatewayClassification:
      "schema_mismatch",
    knownDisallowedUnavailableOrOutOfBoundsRelationTrustedGatewayClassification:
      "validator_rejected",
    preProjectionImmutableCandidateWindowIncompatibilityTrustedGatewayClassification:
      "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactCanonicalHardDeadlineRules = {
    appliesToEveryExecutionBlockInOptimalFeasibleCompleteCanonicalAndEveryReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    candidateResolutionSource:
      "exact_current_correlated_invocation.candidates",
    eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    trustedCanonicalStudyDateSource:
      "inputContract.study_date_kst_retained_by_trusted_gateway",
    studyDateMayEnterOptimizerProjection: false,
    timeZoneIanaExact: "Asia/Seoul",
    endMinuteKstOneThrough1439UsesSameStudyDate: true,
    endMinuteKst1440MeansNextDayMidnightAsiaSeoul: true,
    blockEndUtcDerivationExact:
      "trusted_canonical_study_date_kst_plus_execution_block.end_minute_kst_interpreted_in_iana_asia_seoul",
    nonNullHardDeadlinePredicateExact:
      "derived_block_end_utc <= candidate.hard_deadline_or_null_exact_iso_8601_utc_instant",
    nullHardDeadlineMeansNoHardCutoff: true,
    hardDeadlineEqualityIsFeasible: true,
    unknownDanglingDuplicateCrossDomainOrNonBijectiveCandidateRelationStatus:
      "schema_mismatch",
    knownHardDeadlineBreachStatus: "validator_rejected",
    knownHardDeadlineBreachMustAttemptExactlyOneSeparatelyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustSatisfyEveryHardDeadlinePredicate: true,
    preProjectionElapsedAndInProgressPlacementMustSatisfyExactCurrentCandidateHardDeadlinePredicate:
      true,
    preProjectionImmutableHardDeadlineIncompatibilityMayReachOptimizer: false,
    preProjectionImmutableHardDeadlineIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting:
      false,
    preProjectionImmutableHardDeadlineIncompatibilityMustAttemptExactlyOneSeparatelyPreparedCanonicalNativeFallbackPreservingTheImmutablePlacement:
      true,
    minimizeDeadlineLatenessAppliesOnlyToSoftDeadlineOrNull: true,
    softDeadlineObjectiveMayOverrideHardDeadline: false,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedHardDeadlineRules = {
    appliesToEveryExecutionBlockInOptimalAndFeasibleProjectedCandidatePlans:
      true,
    candidateResolutionSource:
      "exact_current_correlated_invocation.candidates",
    eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation:
      true,
    trustedCanonicalStudyDateSource:
      "inputContract.study_date_kst_retained_by_trusted_gateway",
    studyDateMayEnterOptimizerProjection: false,
    timeZoneIanaExact: "Asia/Seoul",
    endMinuteKstOneThrough1439UsesSameStudyDate: true,
    endMinuteKst1440MeansNextDayMidnightAsiaSeoul: true,
    blockEndUtcDerivationExact:
      "trusted_canonical_study_date_kst_plus_execution_block.end_minute_kst_interpreted_in_iana_asia_seoul",
    nonNullHardDeadlinePredicateExact:
      "derived_block_end_utc <= candidate.hard_deadline_or_null_exact_iso_8601_utc_instant",
    nullHardDeadlineMeansNoHardCutoff: true,
    hardDeadlineEqualityIsFeasible: true,
    knownHardDeadlineBreachTrustedGatewayClassification:
      "validator_rejected",
    unknownDuplicateCrossDomainOrNonBijectiveCandidateRelationTrustedGatewayClassification:
      "schema_mismatch",
    preProjectionElapsedAndInProgressPlacementMustSatisfyExactCurrentCandidateHardDeadlinePredicate:
      true,
    preProjectionImmutableHardDeadlineIncompatibilityMayReachOptimizer: false,
    preProjectionImmutableHardDeadlineIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting:
      false,
    preProjectionImmutableHardDeadlineIncompatibilityTrustedGatewayClassification:
      "validator_rejected",
    minimizeDeadlineLatenessAppliesOnlyToSoftDeadlineOrNull: true,
    softDeadlineObjectiveMayOverrideHardDeadline: false,
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactReplanCutoffCoreRules = {
    replanCutoffSourceExact:
      "exact_same_trusted_correlated_invocation.replan_cutoff_minute_kst_or_null",
    replanCutoffMustEqualExactSameTrustedCorrelatedInvocationValue: true,
    candidateWindowAndImmutableIdentifiersMustUseActiveContainingContractDomain:
      true,
    nullReplanCutoffMeansNoReplanLowerBound: true,
    nullReplanCutoffDoesNotBypassStructuralMappingCorrelationOrImmutableMatchValidation:
      true,
    immutableExemptionEligiblePriorPlacementStatesExactly: [
      "elapsed",
      "in_progress",
    ],
    exactImmutableExemptionFields: [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
    immutableExemptionRequiresExactUnchangedFieldForFieldMatchToExactlyOneEligiblePriorPlacementThroughSameCorrelatedInvocation:
      true,
    nonExemptExecutionBlockPredicateExact:
      "replan_cutoff_minute_kst_or_null === null || block.start_minute_kst >= replan_cutoff_minute_kst_or_null",
    replanCutoffEqualityIsFeasible: true,
    executionBlockStartingOneMinuteBeforeNonNullCutoffIsRejected: true,
    replanCutoff1440AllowsNoNewOrMovedExecutionBlock: true,
    preProjectionElapsedAndInProgressImmutablePlacementMustResolveExactExemptionOnce:
      true,
    immutablePlacementMayBeMovedDroppedUnassignedShortenedExtendedOrRewrittenToRepairCutoffBreach:
      false,
  };
  const exactCanonicalReplanCutoffRules = {
    appliesToEveryExecutionBlockInOptimalFeasibleCompleteCanonicalAndEveryReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    ...exactReplanCutoffCoreRules,
    unknownDanglingDuplicateCrossDomainNonBijectiveOrAmbiguousImmutableExemptionRelationStatus:
      "schema_mismatch",
    knownBeforeCutoffPlacementStatus: "validator_rejected",
    knownBeforeCutoffPlacementMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustSatisfyEveryReplanCutoffPredicate: true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedReplanCutoffRules = {
    appliesToEveryExecutionBlockInOptimalAndFeasibleProjectedCandidatePlans:
      true,
    ...exactReplanCutoffCoreRules,
    unknownDanglingDuplicateCrossDomainNonBijectiveOrAmbiguousImmutableExemptionRelationTrustedGatewayClassification:
      "schema_mismatch",
    knownBeforeCutoffPlacementTrustedGatewayClassification:
      "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactPairwiseBlockNonOverlapCoreRules = {
    intervalSemanticsExact: "[start_minute_kst, end_minute_kst)",
    distinctPairNonOverlapPredicateExact:
      "a.end_minute_kst <= b.start_minute_kst || b.end_minute_kst <= a.start_minute_kst",
    boundaryEqualityIsFeasible: true,
    validateEveryPairOfDistinctExecutionBlocks: true,
    validateEveryExecutionBlockAgainstEveryFixedBlockFromSameCorrelatedInvocation:
      true,
    validateEveryNewOrMovedExecutionBlockAgainstEveryImmutablePriorPlacementFromSameCorrelatedInvocation:
      true,
    newOrMovedDeterminationUsesExactImmutableMatchFields: [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
    exactUnchangedRepresentationOfSameImmutablePriorPlacementIsOneLogicalBlockAndDoesNotConflictWithItself:
      true,
    immutableSelfRepresentationMustResolveExactlyOnceThroughSameCorrelatedInvocation:
      true,
    preProjectionImmutablePriorPlacementsMustBePairwiseNonOverlappingWithEveryFixedBlock:
      true,
    immutablePriorPlacementsMustRemainPairwiseNonOverlappingBeforeProjection:
      true,
    fixedOrImmutablePlacementMayBeRewrittenToRepairOverlap: false,
  };
  const exactCanonicalPairwiseBlockNonOverlapRules = {
    appliesBeforeReleaseToEveryOptimalFeasibleCompleteCanonicalAndEveryReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    ...exactPairwiseBlockNonOverlapCoreRules,
    unknownDanglingDuplicateCrossDomainNonBijectiveOrAmbiguousImmutableSelfRelationStatus:
      "schema_mismatch",
    knownOverlapStatus: "validator_rejected",
    knownOverlapMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustSatisfyEveryPairwiseNonOverlapPredicate:
      true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedPairwiseBlockNonOverlapRules = {
    appliesBeforeReleaseToEveryOptimalAndFeasibleProjectedCandidatePlan:
      true,
    ...exactPairwiseBlockNonOverlapCoreRules,
    unknownDanglingDuplicateCrossDomainNonBijectiveOrAmbiguousImmutableSelfRelationTrustedGatewayClassification:
      "schema_mismatch",
    knownOverlapTrustedGatewayClassification: "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactPrerequisiteOrderingCoreRules = {
    candidateAndPrerequisiteRelationSourceExact:
      "exact_same_trusted_correlated_invocation.candidates[].prerequisite_candidate_ids",
    dependentAndEveryPrerequisiteMustResolveExactlyOnceThroughSameCorrelatedInvocationAndActiveContainingContractDomain:
      true,
    emptyPrerequisiteListMeansNoOrderingConstraint: true,
    multiplePrerequisiteSetRequiresEveryMemberToPass: true,
    everyPrerequisiteMustBePlacedExactlyOnce: true,
    placedDependentMayRelyOnUnassignedPrerequisite: false,
    prerequisiteOrderingPredicateExact:
      "prerequisite.end_minute_kst <= dependent.start_minute_kst",
    prerequisiteBoundaryEqualityIsFeasible: true,
    knownPrerequisitePlacementFailureClassificationPrecedesGenericCandidateAccountingOmissionClassification:
      true,
    preProjectionElapsedAndInProgressImmutableDependentMustSatisfyEveryPrerequisiteOrderingPredicate:
      true,
    immutablePlacementMayBeMovedDroppedUnassignedShortenedExtendedOrRewrittenToRepairPrerequisiteBreach:
      false,
    projectionFieldsOrResultInverseMapPathsMayBeAddedForPrerequisiteValidation:
      false,
  };
  const exactCanonicalPrerequisiteOrderingRules = {
    appliesToEveryPlacedDependentInOptimalFeasibleCompleteCanonicalAndEveryReleasableSeparatelyValidatedCanonicalNativeFallbackPlan:
      true,
    ...exactPrerequisiteOrderingCoreRules,
    unknownDanglingDuplicateCrossDomainOrNonBijectivePrerequisiteRelationStatus:
      "schema_mismatch",
    knownMissingUnassignedOrReversedPrerequisitePlacementStatus:
      "validator_rejected",
    knownPrerequisitePlacementFailureMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustSatisfyEveryPrerequisiteOrderingPredicate:
      true,
    invalidNativeFallbackResult: "blocked_manual_plan_required",
    invalidNativeFallbackMayTriggerAnotherFallback: false,
    invalidNativeFallbackMayReleaseCandidatePlan: false,
  };
  const exactProjectedPrerequisiteOrderingRules = {
    appliesToEveryPlacedDependentInOptimalAndFeasibleProjectedCandidatePlans:
      true,
    ...exactPrerequisiteOrderingCoreRules,
    unknownDanglingDuplicateCrossDomainOrNonBijectivePrerequisiteRelationTrustedGatewayClassification:
      "schema_mismatch",
    knownMissingUnassignedOrReversedPrerequisitePlacementTrustedGatewayClassification:
      "validator_rejected",
    invalidProjectedCandidatePlanMayReleaseCandidatePlan: false,
    projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback:
      false,
  };
  const exactVersionInfoConstructionRules = {
    canonicalVersionInfoRequiredForEveryCompleteCanonicalResultAndReleasableCanonicalNativeFallback:
      true,
    canonicalVersionInfoFieldsExactlyMustEqualVersionFieldsRequired: true,
    trustedGatewayAloneMayConstructAndAttachCanonicalVersionInfo: true,
    sourceExact:
      "exact_trusted_correlated_gateway_configuration_for_the_same_validated_invocation",
    completeRawResponseExactCorrelationAndRequiredBijectionValidationMustFinishBeforeConstruction:
      true,
    rawProjectedResponseMayContainAcceptRequireOrAuthorVersionInfoOrGatewayOwnedVersionConfigurationFields:
      false,
    allTenFieldsMustMatchExactTrustedCorrelatedConfigurationFieldForField:
      true,
    missingAmbiguousStaleUntrustedOrMismatchedMetadataStatus:
      "validator_rejected",
    metadataFailureMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback:
      true,
    releasableNativeFallbackMustCarryExactGatewayConstructedCanonicalTenFieldVersionInfo:
      true,
    invalidFallbackVersionInfoResult: "blocked_manual_plan_required",
    invalidFallbackVersionInfoMayTriggerAnotherFallback: false,
    invalidFallbackVersionInfoMayReleaseCandidatePlan: false,
  };
  const exactNativeValidator = {
    requiredForOptimalAndFeasible: true,
    requiredForEveryReleasableValidatedNativeFallback: true,
    validatedNativeFallbackMustSatisfyCanonicalCandidateAccountingExecutionBlockDurationAndAllHardConstraints:
      true,
    validatedNativeFallbackMustSatisfyCanonicalCandidateAccountingExecutionBlockDurationNonDroppableCandidateWindowAndAllHardConstraints:
      true,
    validatedNativeFallbackMustSatisfyCanonicalTenFieldVersionInfoAndHardDeadlineFeasibilityAndAllHardConstraints:
      true,
    validatedNativeFallbackMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingAndAllHardConstraints:
      true,
    everyOptimalFeasibleAndReleasableValidatedNativeFallbackPlanMustPlaceEveryNonDroppableCandidateExactlyOnceAndNeverUnassignIt:
      true,
    everyExecutionBlockMustResolveExactCurrentInvocationCandidateAndWindowAndSatisfyAllowedMembershipAvailabilityAndSingleWindowBounds:
      true,
    everyExecutionBlockInOptimalFeasibleAndReleasableValidatedNativeFallbackMustSatisfyCandidateHardDeadlinePredicateUsingTrustedCanonicalStudyDateKst:
      true,
    everyNewOrMovedExecutionBlockInOptimalFeasibleAndReleasableValidatedNativeFallbackMustStartAtOrAfterNonNullReplanCutoffUnlessItIsTheUniqueExactImmutableElapsedOrInProgressSelfRepresentation:
      true,
    everyOptimalFeasibleAndReleasableValidatedNativeFallbackPlanMustSatisfyHalfOpenPairwiseNonOverlapForExecutionExecutionExecutionFixedAndNewOrMovedExecutionImmutablePairs:
      true,
    everyPlacedDependentInOptimalFeasibleAndReleasableValidatedNativeFallbackMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStart:
      true,
    canonicalVersionInfoMustBeGatewayConstructedFromExactTrustedCorrelatedConfigurationAfterCompleteRawResponseCorrelationAndRequiredBijectionValidation:
      true,
    unknownDanglingDuplicateCrossDomainOrNonBijectiveCandidateOrWindowRelationStatus:
      "schema_mismatch",
    knownDisallowedUnavailableOrOutOfBoundsCandidateWindowRelationStatus:
      "validator_rejected",
    knownHardDeadlineBreachStatus: "validator_rejected",
    cutoffOverlapOrPrerequisiteStructuralMappingCorrelationAmbiguityStatus:
      "schema_mismatch",
    knownBeforeCutoffOverlapMissingUnassignedOrReversedPrerequisiteStatus:
      "validator_rejected",
    knownPrerequisitePlacementFailureClassificationPrecedesGenericCandidateAccountingOmissionClassification:
      true,
    canonicalFallbackTupleAndStateMustBeGatewayConstructed: true,
    nativeFallbackMayBeAttemptedMoreThanOnceOrRecursively: false,
    invalidOrUnavailableValidatedNativeFallbackResult:
      "blocked_manual_plan_required",
    invalidOrUnavailableValidatedNativeFallbackMayReleaseCandidatePlan: false,
    immutableElapsedOrInProgressPlacementMayBeRewrittenDuringValidationOrFallback:
      false,
    immutableElapsedOrInProgressPlacementMustPassHardDeadlineBeforeProjectionAndMayNotBeMovedDroppedUnassignedShortenedExtendedOrRewrittenDuringValidationOrFallback:
      true,
    immutableElapsedOrInProgressPlacementMustPassUniqueExactCutoffExemptionPairwiseNonOverlapAndPrerequisiteOrderingPreflightAndMayNotBeMovedDroppedUnassignedShortenedExtendedOrRewrittenDuringValidationOrFallback:
      true,
    fixedBlockMayBeRewrittenToRepairOverlap: false,
    hardConstraintMayBeOverriddenBySoftObjective: false,
    minimizeDeadlineLatenessMayReadOnlySoftDeadlineOrNullAndMayNotOverrideHardDeadline:
      true,
    falseSuccessAllowed: false,
    canonicalStateMutationBeforeOwnerChoiceAllowed: false,
  };
  const exactAllowedFields = [
    "request_id",
    "input_snapshot_version",
    "status",
    "execution_blocks",
    "unassigned_candidates",
    "fallback",
    "version_info",
    "objective_components",
    "violations",
    "elapsed_ms",
  ];
  const exactProjectedAllowedFields = exactAllowedFields.filter(
    (field) => !["fallback", "version_info"].includes(field),
  );
  const exactExecutionBlockFields = [
    "ephemeral_opaque_candidate_id",
    "ephemeral_opaque_window_id",
    "start_minute_kst",
    "end_minute_kst",
    "duration_minutes",
  ];
  const exactUnassignedCandidateFields = [
    "ephemeral_opaque_candidate_id",
    "reason_enum",
  ];
  const exactFallbackFields = [
    "used",
    "reason_enum",
    "native_plan_version",
  ];
  const exactFallbackReasonValues = ["not_used", ...FALLBACK_STATUSES];
  const exactObjectiveComponentFields = [
    "objective_code_enum",
    "integer_value",
  ];
  const exactViolationFields = [
    "constraint_code_enum",
    "ephemeral_opaque_candidate_ids",
    "severity_enum",
  ];
  const exactVersionInfoFields = [
    "contract_version",
    "native_policy_version",
    "adapter_version",
    "optimizer_version",
    "objective_version",
    "threshold_version",
    "solver_seed",
    "solver_workers",
    "time_limit_ms",
    "integer_scaling_version",
  ];
  const exactVersionInfoFieldSchemas = {
    contract_version: {
      type: "closed_enum",
      values: ["dabangil.full_day_scheduler.v1"],
    },
    native_policy_version: "closed_identifier_1_to_80",
    adapter_version: "closed_identifier_1_to_80",
    optimizer_version: "closed_identifier_1_to_80",
    objective_version: "closed_identifier_1_to_80",
    threshold_version: "closed_identifier_1_to_80",
    solver_seed: "finite_integer",
    solver_workers: "finite_integer_1_to_64",
    time_limit_ms: "finite_integer_1_to_60000",
    integer_scaling_version: "closed_identifier_1_to_80",
  };
  const exactScalarSchemas = {
    start_minute_kst: "integer_0_to_1439",
    end_minute_kst: "integer_1_to_1440",
    duration_minutes: "integer_1_to_1440",
    integer_value: "finite_integer",
    elapsed_ms: "finite_integer_0_to_60000",
    fallback_used: "boolean",
  };
  const exactProjectedScalarSchemas = {
    start_minute_kst: "integer_0_to_1439",
    end_minute_kst: "integer_1_to_1440",
    duration_minutes: "integer_1_to_1440",
    integer_value: "finite_integer",
    elapsed_ms: "finite_integer_0_to_60000",
  };
  const exactCardinalityLimits = {
    execution_blocks_maximum: 256,
    unassigned_candidates_maximum: 256,
    objective_components_maximum: 11,
    violations_maximum: 256,
    candidate_ids_per_violation_maximum: 32,
    allIdentifierArraysUnique: true,
  };
  const priorRules = scheduler.inputContract.priorAcceptedScheduleRules;
  const projectionRules =
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules;
  const exactProjectionSecondCorrectivePreflightRules = {
    immutablePriorPlacementsMustPassExactReplanCutoffExemptionResolutionBeforeProjection:
      true,
    exactImmutableReplanCutoffExemptionFields: [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
    exactImmutableReplanCutoffExemptionMustMatchExactlyOneElapsedOrInProgressPriorPlacementThroughSameCorrelatedInvocation:
      true,
    ambiguousImmutableReplanCutoffExemptionMatchingStatus:
      "schema_mismatch",
    nonExemptPlacementMustStartAtOrAfterNonNullReplanCutoff: true,
    nullReplanCutoffMeansNoReplanLowerBound: true,
    replanCutoffEqualityIsFeasible: true,
    replanCutoff1440AllowsNoNewOrMovedExecutionBlock: true,
    immutablePriorPlacementsMustBePairwiseNonOverlappingWithEveryCurrentFixedBlockBeforeProjection:
      true,
    immutablePriorPlacementsMustRemainPairwiseNonOverlappingBeforeProjection:
      true,
    exactUnchangedImmutableSelfRepresentationIsOneLogicalBlockAndDoesNotOverlapItself:
      true,
    ambiguousImmutableSelfRepresentationMatchingStatus: "schema_mismatch",
    placedImmutableDependentMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStartBeforeProjection:
      true,
    immutablePrerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus:
      "schema_mismatch",
    immutablePrerequisiteKnownMissingUnassignedOrReversedPlacementStatus:
      "validator_rejected",
    immutableCutoffOverlapOrPrerequisiteIncompatibilityMayReachOptimizer:
      false,
    immutableCutoffOverlapOrPrerequisiteIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallbackWithoutRewritingImmutableOrFixedPlacements:
      true,
    immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackResult:
      "blocked_manual_plan_required",
    immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback:
      false,
  };
  const exactPriorSecondCorrectivePreflightRules = {
    elapsedAndInProgressPlacementMustResolveExactlyOneImmutableReplanCutoffExemptionByCandidateWindowStartEndAndDurationBeforeProjection:
      true,
    ambiguousImmutableReplanCutoffExemptionMatchingStatus:
      "schema_mismatch",
    nonExemptNewOrMovedPlacementMustStartAtOrAfterNonNullReplanCutoff:
      true,
    nullReplanCutoffMeansNoReplanLowerBound: true,
    replanCutoffEqualityIsFeasible: true,
    replanCutoff1440AllowsNoNewOrMovedExecutionBlock: true,
    elapsedAndInProgressPlacementMustBePairwiseNonOverlappingWithEveryCurrentFixedBlockBeforeProjection:
      true,
    elapsedAndInProgressPlacementsMustRemainPairwiseNonOverlappingBeforeProjection:
      true,
    exactUnchangedImmutableSelfRepresentationIsOneLogicalBlockAndDoesNotOverlapItself:
      true,
    ambiguousImmutableSelfRepresentationMatchingStatus: "schema_mismatch",
    placedElapsedOrInProgressDependentMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStartBeforeProjection:
      true,
    immutablePrerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus:
      "schema_mismatch",
    immutablePrerequisiteKnownMissingUnassignedOrReversedPlacementStatus:
      "validator_rejected",
    immutableCutoffOverlapOrPrerequisiteIncompatibilityMayReachOptimizer:
      false,
    immutableCutoffOverlapOrPrerequisiteIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingImmutableOrFixedPlacements:
      true,
    immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackResult:
      "blocked_manual_plan_required",
    immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback:
      false,
  };
  const exactHardDeadlineValidationContext = {
    trustedCanonicalStudyDateSource: "inputContract.study_date_kst",
    studyDateMayEnterOptimizerProjection: false,
    trustedGatewayRetainsStudyDateForProjectedResultValidation: true,
    timeZoneIanaExact: "Asia/Seoul",
    endMinuteKstOneThrough1439UsesSameStudyDate: true,
    endMinuteKst1440MeansNextDayMidnightAsiaSeoul: true,
    blockEndUtcDerivation:
      "exact_trusted_canonical_study_date_kst_plus_end_minute_kst_interpreted_in_iana_asia_seoul",
    hardDeadlineComparisonExact:
      "derived_block_end_utc_less_than_or_equal_exact_iso_8601_utc_hard_deadline",
    nullHardDeadlineMeansNoHardCutoff: true,
  };
  const failureFixture =
    scheduler.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
      .failureStatusFixtureResultSetDigestContract;
  const resolvedArtifactMembers =
    scheduler.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
      .resolvedArtifactMembersContract;
  const exactCanonicalNativeFallbackProjectionContract = {
    source: "failure_status_fixture_result_set",
    projectionFieldsExactly: [
      "expected_status",
      "native_fallback_result_digest_sha256",
      "manual_block_result_digest_sha256_or_null",
    ],
    entryOrdering: "ascending_lexicographic_expected_status",
    exactEntryCountMustEqualFallbackStatusCount: true,
    projectedSetDigestField:
      "benchmark_result_artifact.canonical_native_fallback_result_set_digest_sha256",
    sourceNativeFallbackDigestMustResolveToExactResultContractArtifactInSameAuthorizationStoreWhenManualBlockDigestIsNull:
      true,
    sourceNativeFallbackDigestMustResolveToRejectedNativeFallbackAttemptValidationRecordInSameAuthorizationStoreWhenManualBlockDigestIsNonNull:
      true,
    manualBlockDigestMustResolveToExactBlockedManualPlanRequiredResultContractArtifactInSameAuthorizationStoreWhenNonNull:
      true,
    manualBlockNullabilityMustMatchValidatedNativeFallbackOutcome: true,
    additionalFieldsAllowed: false,
  };
  const exactRejectedNativeFallbackAttemptValidationRecordContract = {
    purpose:
      "closed_identifier_free_evidence_for_rejected_native_fallback_attempts",
    fieldsExactly: [
      "artifact_contract_version",
      "exact_head_sha",
      "exact_tree_sha",
      "s237o_authorization_digest_sha256",
      "adapter_config_digest_sha256",
      "benchmark_run_id",
      "synthetic_fixture_id",
      "expected_status",
      "observed_status",
      "rejection_code_enum",
      "validation_result",
      "candidate_plan_released",
    ],
    fieldSchemas: {
      artifact_contract_version: [
        "dabangil.s237o.rejected_native_fallback_attempt_validation_record.v1",
      ],
      exact_head_sha: "lowercase_hex_40",
      exact_tree_sha: "lowercase_hex_40",
      s237o_authorization_digest_sha256: "lowercase_hex_64",
      adapter_config_digest_sha256: "lowercase_hex_64",
      benchmark_run_id: "^obr_[A-Za-z0-9_-]{16,64}$",
      synthetic_fixture_id: "^syn_s237o_[A-Za-z0-9_-]{8,80}$",
      expected_status:
        "closed_enum_exact_result_contract_fallback_statuses",
      observed_status:
        "closed_enum_exact_result_contract_fallback_statuses",
      rejection_code_enum: NATIVE_FALLBACK_REJECTION_CODES,
      validation_result: ["rejected"],
      candidate_plan_released: [false],
    },
    additionalFieldsAllowed: false,
    freeTextAllowed: false,
    expectedAndObservedStatusMustEqualExactFailureFixtureExpectedStatus:
      true,
    headTreeAuthorizationConfigRunAndFixtureMustMatchParentBenchmarkAndFailureFixtureEntry:
      true,
    rejectionValidationOrderExactly: [
      "result_status",
      "fallback_presence",
      "fallback_used",
      "fallback_reason",
      "native_plan_version_schema",
      "native_plan_resolution_and_immutability",
      "candidate_accounting",
      "execution_block_duration",
      "non_droppable_candidate_placement",
      "candidate_window_membership_availability_and_bounds",
      "replan_cutoff_feasibility",
      "pairwise_block_non_overlap",
      "prerequisite_ordering",
      "hard_constraints",
      "immutable_placement_compatibility",
      "canonical_result_contract_schema_and_correlation_catch_all",
    ],
    rejectionCodeMustEqualFirstApplicableFailedValidationInExactOrder:
      true,
    canonicalResultContractInvalidCodeMayBeUsedOnlyWhenNoMoreSpecificRejectionCodeMatches:
      true,
    rawRejectedNativeFallbackOutputMayAppearInRecordLogsArtifactsCachesErrorsTelemetryOrPersistedTemp:
      false,
    projectedOrCanonicalCandidateAndWindowIdentifiersMayAppearInRecord:
      false,
    recordMaySubstituteForCanonicalResultOrExactManualBlock: false,
  };
  const resolvedVerificationRules =
    resolvedArtifactMembers.verificationRules;
  const exactFailureFixtureContractKeys = [
    "algorithm",
    "serialization",
    "expectedStatuses",
    "entryOrdering",
    "entryFieldsExactly",
    "entryFieldSchemas",
    "entryAdditionalFieldsAllowed",
    "exactEntryCountMustEqualFallbackStatusCount",
    "observedStatusMustEqualExpectedStatus",
    "triggerOriginMustEqualSolverFailureExactlyForInfeasibleModelInvalidOrUnknown",
    "triggerOriginMustEqualTrustedGatewayClassificationExactlyForTimeoutDependencyUnavailableAdapterErrorSchemaMismatchStaleResponseOrValidatorRejected",
    "isolatedSolverMayAuthorTrustedGatewayClassification",
    "assertionResultMustEqualPassed",
    "validNativeFallbackOrExactManualBlockRequired",
    "validNativeFallbackResultDigestMustResolveOneExactCanonicalResultWhenManualBlockDigestIsNull",
    "validNativeFallbackResultStatusMustEqualExpectedStatusOrLiteralFallbackWhenManualBlockDigestIsNull",
    "validNativeFallbackResultFallbackUsedMustBeTrueWhenManualBlockDigestIsNull",
    "validNativeFallbackResultFallbackReasonMustEqualExpectedStatusWhenManualBlockDigestIsNull",
    "validNativeFallbackResultNativePlanVersionMustBeClosedAndNonNullWhenManualBlockDigestIsNull",
    "validNativeFallbackResultMustSatisfyCanonicalCandidateAccountingExecutionBlockDurationAndAllHardConstraintsWhenManualBlockDigestIsNull",
    "validNativeFallbackResultMustSatisfyCanonicalNonDroppableCandidateWindowAndAllC4HardConstraintsWhenManualBlockDigestIsNull",
    "validNativeFallbackResultMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingWhenManualBlockDigestIsNull",
    "oneNativeFallbackResultDigestMaySatisfyMultipleExpectedStatuses",
    "invalidNativeFallbackAttemptDigestMustResolveOneExactClosedRejectionValidationRecordWhenManualBlockDigestIsNonNull",
    "invalidNativeFallbackAttemptFailureMustBeCrossBoundToExpectedStatus",
    "invalidNativeFallbackManualBlockDigestMustResolveOneExactCanonicalBlockedManualPlanRequiredResult",
    "invalidNativeFallbackManualBlockResultMayContainExecutionBlocksOrReferencedNativePlan",
    "invalidNativeFallbackManualBlockResultFallbackMustEqualUsedFalseNotUsedAndNull",
    "invalidNativeFallbackResultMayReleaseCandidatePlan",
    "manualBlockDigestMustBeNullIffNativeFallbackIsValidAndNonNullIffNativeFallbackIsInvalid",
    "missingUnknownDuplicateOrReorderedEntryAllowed",
  ];

  return (
    canonicalJson(Object.keys(canonical)) ===
      canonicalJson(RESULT_CONTRACT_KEYS) &&
    canonicalJson(Object.keys(projected)) ===
      canonicalJson(PROJECTED_RESULT_CONTRACT_KEYS) &&
    canonicalJson(canonical.allowedFieldsExactly) ===
      canonicalJson(exactAllowedFields) &&
    canonicalJson(projected.allowedFieldsExactly) ===
      canonicalJson(exactProjectedAllowedFields) &&
    canonicalJson(canonical.executionBlockFieldsExactly) ===
      canonicalJson(exactExecutionBlockFields) &&
    canonicalJson(projected.executionBlockFieldsExactly) ===
      canonicalJson(exactExecutionBlockFields) &&
    canonicalJson(canonical.unassignedCandidateFieldsExactly) ===
      canonicalJson(exactUnassignedCandidateFields) &&
    canonicalJson(projected.unassignedCandidateFieldsExactly) ===
      canonicalJson(exactUnassignedCandidateFields) &&
    canonicalJson(canonical.fallbackFieldsExactly) ===
      canonicalJson(exactFallbackFields) &&
    canonicalJson(canonical.fallbackReasonValues) ===
      canonicalJson(exactFallbackReasonValues) &&
    !Object.hasOwn(projected, "fallbackFieldsExactly") &&
    !Object.hasOwn(projected, "fallbackReasonValues") &&
    !Object.hasOwn(projected, "fallbackValueRules") &&
    !Object.hasOwn(projected, "fallbackStatuses") &&
    !Object.hasOwn(projected, "nativeFallbackInvalidResult") &&
    canonicalJson(canonical.objectiveComponentFieldsExactly) ===
      canonicalJson(exactObjectiveComponentFields) &&
    canonicalJson(projected.objectiveComponentFieldsExactly) ===
      canonicalJson(exactObjectiveComponentFields) &&
    canonicalJson(canonical.violationFieldsExactly) ===
      canonicalJson(exactViolationFields) &&
    canonicalJson(projected.violationFieldsExactly) ===
      canonicalJson(exactViolationFields) &&
    canonicalJson(canonical.scalarSchemas) ===
      canonicalJson(exactScalarSchemas) &&
    canonicalJson(projected.scalarSchemas) ===
      canonicalJson(exactProjectedScalarSchemas) &&
    canonicalJson(canonical.cardinalityLimits) ===
      canonicalJson(exactCardinalityLimits) &&
    canonicalJson(projected.cardinalityLimits) ===
      canonicalJson(exactCardinalityLimits) &&
    canonicalJson(canonical.fallbackStatuses) ===
      canonicalJson(FALLBACK_STATUSES) &&
    canonicalJson(canonical.fallbackValueRules) ===
      canonicalJson(exactFallbackValueRules) &&
    canonicalJson(canonical.candidateAccountingRules) ===
      canonicalJson(exactCandidateAccountingRules) &&
    canonicalJson(projected.candidateAccountingRules) ===
      canonicalJson(exactProjectedCandidateAccountingRules) &&
    canonicalJson(canonical.executionBlockDurationRules) ===
      canonicalJson(exactExecutionBlockDurationRules) &&
    canonicalJson(projected.executionBlockDurationRules) ===
      canonicalJson(exactProjectedExecutionBlockDurationRules) &&
    canonicalJson(canonical.nonDroppableCandidateRules) ===
      canonicalJson(exactCanonicalNonDroppableRules) &&
    canonicalJson(projected.nonDroppableCandidateRules) ===
      canonicalJson(exactProjectedNonDroppableRules) &&
    canonicalJson(canonical.candidateWindowFeasibilityRules) ===
      canonicalJson(exactCanonicalCandidateWindowRules) &&
    canonicalJson(projected.candidateWindowFeasibilityRules) ===
      canonicalJson(exactProjectedCandidateWindowRules) &&
    canonicalJson(canonical.hardDeadlineFeasibilityRules) ===
      canonicalJson(exactCanonicalHardDeadlineRules) &&
    canonicalJson(projected.hardDeadlineFeasibilityRules) ===
      canonicalJson(exactProjectedHardDeadlineRules) &&
    canonicalJson(canonical.replanCutoffFeasibilityRules) ===
      canonicalJson(exactCanonicalReplanCutoffRules) &&
    canonicalJson(projected.replanCutoffFeasibilityRules) ===
      canonicalJson(exactProjectedReplanCutoffRules) &&
    canonicalJson(canonical.pairwiseBlockNonOverlapRules) ===
      canonicalJson(exactCanonicalPairwiseBlockNonOverlapRules) &&
    canonicalJson(projected.pairwiseBlockNonOverlapRules) ===
      canonicalJson(exactProjectedPairwiseBlockNonOverlapRules) &&
    canonicalJson(canonical.prerequisiteOrderingRules) ===
      canonicalJson(exactCanonicalPrerequisiteOrderingRules) &&
    canonicalJson(projected.prerequisiteOrderingRules) ===
      canonicalJson(exactProjectedPrerequisiteOrderingRules) &&
    canonicalJson(canonical.versionInfoFieldsExactly) ===
      canonicalJson(exactVersionInfoFields) &&
    canonicalJson(canonical.versionFieldsRequired) ===
      canonicalJson(exactVersionInfoFields) &&
    canonicalJson(canonical.versionInfoFieldSchemas) ===
      canonicalJson(exactVersionInfoFieldSchemas) &&
    canonicalJson(canonical.versionInfoConstructionRules) ===
      canonicalJson(exactVersionInfoConstructionRules) &&
    !Object.hasOwn(projected, "versionInfoFieldsExactly") &&
    !Object.hasOwn(projected, "versionInfoFieldSchemas") &&
    !Object.hasOwn(projected, "versionInfoConstructionRules") &&
    !Object.hasOwn(projected, "versionFieldsRequired") &&
    canonicalJson(scheduler.inputContract.hardDeadlineValidationContext) ===
      canonicalJson(exactHardDeadlineValidationContext) &&
    scheduler.inputContract.optimizerInvocationProjectionContract
      .fieldsExactly.includes("study_date_kst") ===
      false &&
    canonicalJson(scheduler.hardConstraints) ===
      canonicalJson(RESULT_HARD_CONSTRAINTS) &&
    canonicalJson(canonical.closedEnumValues.constraint_code_enum) ===
      canonicalJson(RESULT_HARD_CONSTRAINTS) &&
    canonicalJson(projected.closedEnumValues.constraint_code_enum) ===
      canonicalJson(RESULT_HARD_CONSTRAINTS) &&
    priorRules
      .elapsedAndInProgressPlacementMustResolveExactlyOneCurrentInvocationCandidateBeforeProjection ===
      true &&
    priorRules
      .elapsedAndInProgressPlacementMustSatisfyResolvedCurrentCandidateDurationAndShorteningRulesBeforeProjection ===
      true &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityMayReachOptimizer ===
      false &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy ===
      true &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    priorRules
      .immutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    priorRules
      .elapsedAndInProgressPlacementMustResolveExactlyOneCurrentInvocationWindowBeforeProjection ===
      true &&
    priorRules
      .elapsedAndInProgressPlacementWindowMustBelongToResolvedCurrentCandidateAllowedWindowIdsBeforeProjection ===
      true &&
    priorRules
      .elapsedAndInProgressPlacementResolvedCurrentWindowAvailableMustEqualTrueBeforeProjection ===
      true &&
    priorRules
      .elapsedAndInProgressPlacementMustSatisfyCurrentWindowStartLessThanOrEqualBlockStartLessThanBlockEndLessThanOrEqualWindowEndInsideOneReferencedWindowBeforeProjection ===
      true &&
    priorRules.elapsedAndInProgressPlacementMaySpanOrStitchAdjacentCurrentWindows ===
      false &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityMayReachOptimizer ===
      false &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingPlacementOrCandidatePolicy ===
      true &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    priorRules
      .immutablePlacementCandidateWindowIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    priorRules
      .elapsedAndInProgressPlacementMustSatisfyResolvedCurrentCandidateHardDeadlineBeforeProjection ===
      true &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityMayReachOptimizer ===
      false &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingPlacementOrCandidatePolicy ===
      true &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    priorRules
      .immutablePlacementHardDeadlineIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    priorRules
      .immutablePlacementOrCurrentCandidatePolicyMayBeRewrittenToRepairIncompatibility ===
      false &&
    projectionRules
      .immutablePriorPlacementsMustPassExactCurrentCandidateDurationCompatibilityBeforeProjection ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityMayReachOptimizer ===
      false &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    projectionRules
      .immutablePriorPlacementsMustPassExactCurrentCandidateWindowMembershipAvailabilityAndBoundsBeforeProjection ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateAndWindowMustEachResolveExactlyOnceThroughExactCurrentInvocation ===
      true &&
    projectionRules
      .immutablePriorPlacementWindowMustBelongToResolvedCandidateAllowedWindowIds ===
      true &&
    projectionRules.immutablePriorPlacementResolvedWindowAvailableMustEqualTrue ===
      true &&
    projectionRules
      .immutablePriorPlacementMustSatisfyWindowStartLessThanOrEqualBlockStartLessThanBlockEndLessThanOrEqualWindowEndInsideOneReferencedWindow ===
      true &&
    projectionRules.immutablePriorPlacementMaySpanOrStitchAdjacentWindows ===
      false &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityMayReachOptimizer ===
      false &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingPlacementOrCandidatePolicy ===
      true &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    projectionRules
      .immutablePriorPlacementCandidateWindowIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    projectionRules
      .studyDateKstMustRemainInTrustedGatewayAndMustNotEnterOptimizerProjection ===
      true &&
    projectionRules
      .trustedGatewayMustRetainExactCanonicalStudyDateKstForProjectedResultHardDeadlineValidation ===
      true &&
    projectionRules
      .immutablePriorPlacementsMustPassExactCurrentCandidateHardDeadlinePredicateBeforeProjection ===
      true &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityMayReachOptimizer ===
      false &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityFallbackTriggerStatus ===
      "validator_rejected" &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityFallbackReasonEnumMustEqualTriggerStatus ===
      true &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback ===
      true &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingPlacementOrCandidatePolicy ===
      true &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityInvalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    projectionRules
      .immutablePriorPlacementHardDeadlineIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback ===
      false &&
    Object.entries(exactProjectionSecondCorrectivePreflightRules).every(
      ([field, expected]) =>
        canonicalJson(projectionRules[field]) === canonicalJson(expected),
    ) &&
    Object.entries(exactPriorSecondCorrectivePreflightRules).every(
      ([field, expected]) =>
        canonicalJson(priorRules[field]) === canonicalJson(expected),
    ) &&
    failureFixture.expectedStatuses === "resultContract.fallbackStatuses" &&
    canonicalJson(Object.keys(failureFixture)) ===
      canonicalJson(exactFailureFixtureContractKeys) &&
    canonicalJson(failureFixture.entryFieldsExactly) ===
      canonicalJson([
        "synthetic_fixture_id",
        "expected_status",
        "observed_status",
        "trigger_origin_enum",
        "native_fallback_result_digest_sha256",
        "manual_block_result_digest_sha256_or_null",
        "assertion_result",
      ]) &&
    canonicalJson(
      failureFixture.entryFieldSchemas.trigger_origin_enum.values,
    ) ===
      canonicalJson([
        "solver_failure",
        "trusted_gateway_classification",
      ]) &&
    failureFixture.entryAdditionalFieldsAllowed === false &&
    failureFixture
      .triggerOriginMustEqualSolverFailureExactlyForInfeasibleModelInvalidOrUnknown ===
      true &&
    failureFixture
      .triggerOriginMustEqualTrustedGatewayClassificationExactlyForTimeoutDependencyUnavailableAdapterErrorSchemaMismatchStaleResponseOrValidatorRejected ===
      true &&
    failureFixture.isolatedSolverMayAuthorTrustedGatewayClassification ===
      false &&
    failureFixture.validNativeFallbackOrExactManualBlockRequired === true &&
    failureFixture
      .validNativeFallbackResultDigestMustResolveOneExactCanonicalResultWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultStatusMustEqualExpectedStatusOrLiteralFallbackWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultFallbackUsedMustBeTrueWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultFallbackReasonMustEqualExpectedStatusWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultNativePlanVersionMustBeClosedAndNonNullWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultMustSatisfyCanonicalCandidateAccountingExecutionBlockDurationAndAllHardConstraintsWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultMustSatisfyCanonicalNonDroppableCandidateWindowAndAllC4HardConstraintsWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .validNativeFallbackResultMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingWhenManualBlockDigestIsNull ===
      true &&
    failureFixture
      .oneNativeFallbackResultDigestMaySatisfyMultipleExpectedStatuses ===
      false &&
    failureFixture
      .invalidNativeFallbackAttemptDigestMustResolveOneExactClosedRejectionValidationRecordWhenManualBlockDigestIsNonNull ===
      true &&
    failureFixture
      .invalidNativeFallbackAttemptFailureMustBeCrossBoundToExpectedStatus ===
      true &&
    failureFixture
      .invalidNativeFallbackManualBlockDigestMustResolveOneExactCanonicalBlockedManualPlanRequiredResult ===
      true &&
    failureFixture
      .invalidNativeFallbackManualBlockResultMayContainExecutionBlocksOrReferencedNativePlan ===
      false &&
    failureFixture
      .invalidNativeFallbackManualBlockResultFallbackMustEqualUsedFalseNotUsedAndNull ===
      true &&
    failureFixture.invalidNativeFallbackResultMayReleaseCandidatePlan ===
      false &&
    failureFixture
      .manualBlockDigestMustBeNullIffNativeFallbackIsValidAndNonNullIffNativeFallbackIsInvalid ===
      true &&
    failureFixture.missingUnknownDuplicateOrReorderedEntryAllowed ===
      false &&
    canonicalJson(
      resolvedArtifactMembers.canonicalNativeFallbackProjectionContract,
    ) ===
      canonicalJson(exactCanonicalNativeFallbackProjectionContract) &&
    canonicalJson(
      resolvedArtifactMembers
        .rejectedNativeFallbackAttemptValidationRecordContract,
    ) ===
      canonicalJson(
        exactRejectedNativeFallbackAttemptValidationRecordContract,
      ) &&
    resolvedVerificationRules
      .validFailureFallbackDigestsMustResolveToExactResultContractWhenManualBlockDigestIsNull ===
      true &&
    resolvedVerificationRules
      .failureFixtureTriggerOriginMustDistinguishSolverFailureFromTrustedGatewayClassificationExactly ===
      true &&
    resolvedVerificationRules
      .validFailureFallbackMustSatisfyCanonicalNonDroppableCandidateWindowAndAllC4HardConstraints ===
      true &&
    resolvedVerificationRules
      .validFailureFallbackMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrdering ===
      true &&
    resolvedVerificationRules
      .invalidFailureFallbackAttemptDigestsMustResolveToExactRejectedAttemptValidationRecordWhenManualBlockDigestIsNonNull ===
      true &&
    resolvedVerificationRules
      .nonNullManualBlockDigestsMustResolveToExactBlockedManualPlanRequiredResultContract ===
      true &&
    !Object.hasOwn(
      resolvedVerificationRules,
      "failureFallbackAndManualBlockDigestsMustResolveToExactResultContract",
    ) &&
    canonicalJson(scheduler.nativeValidator) ===
      canonicalJson(exactNativeValidator)
  );
}

function candidateAccountingIsExact(
  invocationCandidateIds,
  executionBlocks,
  unassignedCandidates,
) {
  const placedIds = executionBlocks.map(
    (block) => block.ephemeral_opaque_candidate_id,
  );
  const unassignedIds = unassignedCandidates.map(
    (candidate) => candidate.ephemeral_opaque_candidate_id,
  );
  const invocationSet = new Set(invocationCandidateIds);
  const placedSet = new Set(placedIds);
  const unassignedSet = new Set(unassignedIds);
  if (invocationSet.size !== invocationCandidateIds.length) return false;
  if (placedSet.size !== placedIds.length) return false;
  if (unassignedSet.size !== unassignedIds.length) return false;
  if ([...placedSet].some((candidateId) => unassignedSet.has(candidateId))) {
    return false;
  }
  const accountedSet = new Set([...placedSet, ...unassignedSet]);
  return (
    accountedSet.size === invocationSet.size &&
    [...accountedSet].every((candidateId) => invocationSet.has(candidateId)) &&
    [...invocationSet].every((candidateId) => accountedSet.has(candidateId))
  );
}

function executionBlockDurationIsValid(candidates, block) {
  const matchingCandidates = candidates.filter(
    (candidate) =>
      candidate.ephemeral_opaque_candidate_id ===
      block.ephemeral_opaque_candidate_id,
  );
  if (matchingCandidates.length !== 1) return false;
  const [candidate] = matchingCandidates;
  if (
    block.duration_minutes !==
    block.end_minute_kst - block.start_minute_kst
  ) {
    return false;
  }
  if (block.duration_minutes > candidate.estimated_minutes) return false;
  if (!candidate.can_shorten) {
    return block.duration_minutes === candidate.estimated_minutes;
  }
  return (
    block.duration_minutes >= candidate.minimum_minutes &&
    block.duration_minutes <= candidate.estimated_minutes
  );
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactFields(value, fields) {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function containsForbiddenFieldRecursively(value, forbiddenFields) {
  if (Array.isArray(value)) {
    return value.some((entry) =>
      containsForbiddenFieldRecursively(entry, forbiddenFields),
    );
  }
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenFields.has(key) ||
      containsForbiddenFieldRecursively(nested, forbiddenFields),
  );
}

function canonicalVersionFieldIsValid(schema, value) {
  if (isPlainRecord(schema) && schema.type === "closed_enum") {
    return schema.values.includes(value);
  }
  if (schema === "closed_identifier_1_to_80") {
    return (
      typeof value === "string" &&
      /^[A-Za-z0-9._:-]{1,80}$/.test(value)
    );
  }
  if (schema === "finite_integer") return Number.isInteger(value);
  if (schema === "finite_integer_1_to_64") {
    return Number.isInteger(value) && value >= 1 && value <= 64;
  }
  if (schema === "finite_integer_1_to_60000") {
    return Number.isInteger(value) && value >= 1 && value <= 60000;
  }
  return false;
}

function canonicalVersionInfoIsExact(contract, versionInfo) {
  return (
    hasExactFields(versionInfo, contract.versionInfoFieldsExactly) &&
    canonicalJson(contract.versionFieldsRequired) ===
      canonicalJson(contract.versionInfoFieldsExactly) &&
    contract.versionInfoFieldsExactly.every((field) =>
      canonicalVersionFieldIsValid(
        contract.versionInfoFieldSchemas[field],
        versionInfo[field],
      ),
    )
  );
}

function gatewayCanonicalVersionOutcome(
  canonicalContract,
  trustedConfiguration,
  {
    rawResponseValidated,
    exactCorrelationValidated,
    requiredBijectionsValidated,
    trustedConfigurationIsCurrentAndBound,
    nativeFallbackValid,
    nativeFallbackTrustedConfiguration = null,
    actualInvocationConfiguration = trustedConfiguration,
    nativeFallbackTrustedConfigurationIsCurrentAndBound = true,
    nativeFallbackActualInvocationConfiguration =
      nativeFallbackTrustedConfiguration,
  },
) {
  const prerequisiteFailureClassification = !rawResponseValidated
    ? "schema_mismatch"
    : !exactCorrelationValidated
      ? "stale_response"
      : !requiredBijectionsValidated
        ? "schema_mismatch"
        : null;
  const prerequisiteValidationPassed =
    prerequisiteFailureClassification === null &&
    trustedConfigurationIsCurrentAndBound;
  if (
    prerequisiteValidationPassed &&
    canonicalVersionInfoIsExact(
      canonicalContract,
      trustedConfiguration,
    ) &&
    canonicalVersionInfoIsExact(
      canonicalContract,
      actualInvocationConfiguration,
    ) &&
    canonicalContract.versionInfoFieldsExactly.every(
      (field) =>
        trustedConfiguration[field] === actualInvocationConfiguration[field],
    )
  ) {
    return {
      status: "constructed",
      version_info: Object.fromEntries(
        canonicalContract.versionInfoFieldsExactly.map((field) => [
          field,
          trustedConfiguration[field],
        ]),
      ),
      nativeFallbackAttempts: 0,
      candidatePlanReleased: true,
      canonicalNativeFallbackReleased: false,
    };
  }
  const validFallbackVersionInfo =
    nativeFallbackValid &&
    nativeFallbackTrustedConfigurationIsCurrentAndBound &&
    canonicalVersionInfoIsExact(
      canonicalContract,
      nativeFallbackTrustedConfiguration,
    ) &&
    canonicalVersionInfoIsExact(
      canonicalContract,
      nativeFallbackActualInvocationConfiguration,
    ) &&
    canonicalContract.versionInfoFieldsExactly.every(
      (field) =>
        nativeFallbackTrustedConfiguration[field] ===
        nativeFallbackActualInvocationConfiguration[field],
    );
  const triggeringClassification =
    prerequisiteFailureClassification ?? "validator_rejected";
  return validFallbackVersionInfo
    ? {
        status: "fallback",
        triggeringClassification,
        version_info: Object.fromEntries(
          canonicalContract.versionInfoFieldsExactly.map((field) => [
            field,
            nativeFallbackTrustedConfiguration[field],
          ]),
        ),
        nativeFallbackAttempts: 1,
        candidatePlanReleased: false,
        canonicalNativeFallbackReleased: true,
      }
    : {
        status: "blocked_manual_plan_required",
        triggeringClassification,
        version_info: null,
        nativeFallbackAttempts: 1,
        candidatePlanReleased: false,
        canonicalNativeFallbackReleased: false,
      };
}

function projectedScalarIsValid(schema, value) {
  if (!Number.isInteger(value)) return false;
  if (schema === "finite_integer") return true;
  if (schema === "finite_integer_0_to_60000") {
    return value >= 0 && value <= 60000;
  }
  if (schema === "integer_0_to_1439") {
    return value >= 0 && value <= 1439;
  }
  if (schema === "integer_1_to_1440") {
    return value >= 1 && value <= 1440;
  }
  return false;
}

function projectedIdentifierIsValid(contract, identifierClass, value) {
  const pattern = contract.identifierSchemas[identifierClass];
  return (
    typeof value === "string" &&
    typeof pattern === "string" &&
    new RegExp(pattern).test(value)
  );
}

function projectedSolverResponseIsClosed(
  contract,
  response,
  expectedCorrelation,
) {
  if (!isPlainRecord(response) || !isPlainRecord(expectedCorrelation)) {
    return false;
  }
  if (
    containsForbiddenFieldRecursively(
      response,
      new Set(contract.forbiddenFields),
    )
  ) {
    return false;
  }
  if (!contract.statuses.includes(response.status)) return false;

  const candidatePlanFields =
    contract.statusOriginBoundary.projectedCandidatePlanFieldsExactly;
  const carriesCandidatePlan = ["optimal", "feasible"].includes(
    response.status,
  );
  const requiredTopLevelFields = contract.allowedFieldsExactly.filter(
    (field) => carriesCandidatePlan || !candidatePlanFields.includes(field),
  );
  if (!hasExactFields(response, requiredTopLevelFields)) return false;
  if (
    response.request_id !== expectedCorrelation.request_id ||
    response.input_snapshot_version !==
      expectedCorrelation.input_snapshot_version ||
    !projectedIdentifierIsValid(
      contract,
      "request_id",
      response.request_id,
    ) ||
    !projectedIdentifierIsValid(
      contract,
      "input_snapshot_version",
      response.input_snapshot_version,
    )
  ) {
    return false;
  }

  const limits = contract.cardinalityLimits;
  if (
    !Array.isArray(response.objective_components) ||
    response.objective_components.length >
      limits.objective_components_maximum ||
    !response.objective_components.every(
      (component) =>
        hasExactFields(
          component,
          contract.objectiveComponentFieldsExactly,
        ) &&
        contract.closedEnumValues.objective_code_enum.includes(
          component.objective_code_enum,
        ) &&
        projectedScalarIsValid(
          contract.scalarSchemas.integer_value,
          component.integer_value,
        ),
    ) ||
    !Array.isArray(response.violations) ||
    response.violations.length > limits.violations_maximum ||
    !response.violations.every(
      (violation) =>
        hasExactFields(violation, contract.violationFieldsExactly) &&
        contract.closedEnumValues.constraint_code_enum.includes(
          violation.constraint_code_enum,
        ) &&
        contract.closedEnumValues.severity_enum.includes(
          violation.severity_enum,
        ) &&
        Array.isArray(violation.ephemeral_opaque_candidate_ids) &&
        violation.ephemeral_opaque_candidate_ids.length <=
          limits.candidate_ids_per_violation_maximum &&
        new Set(violation.ephemeral_opaque_candidate_ids).size ===
          violation.ephemeral_opaque_candidate_ids.length &&
        violation.ephemeral_opaque_candidate_ids.every((candidateId) =>
          projectedIdentifierIsValid(
            contract,
            "ephemeral_opaque_candidate_id",
            candidateId,
          ),
        ),
    ) ||
    !projectedScalarIsValid(
      contract.scalarSchemas.elapsed_ms,
      response.elapsed_ms,
    )
  ) {
    return false;
  }

  if (!carriesCandidatePlan) {
    return (
      !Object.hasOwn(response, "execution_blocks") &&
      !Object.hasOwn(response, "unassigned_candidates")
    );
  }
  if (
    !Array.isArray(response.execution_blocks) ||
    response.execution_blocks.length > limits.execution_blocks_maximum ||
    !Array.isArray(response.unassigned_candidates) ||
    response.unassigned_candidates.length >
      limits.unassigned_candidates_maximum
  ) {
    return false;
  }
  const executionCandidateIds = response.execution_blocks.map(
    (block) => block.ephemeral_opaque_candidate_id,
  );
  const unassignedCandidateIds = response.unassigned_candidates.map(
    (candidate) => candidate.ephemeral_opaque_candidate_id,
  );
  return (
    new Set(executionCandidateIds).size === executionCandidateIds.length &&
    new Set(unassignedCandidateIds).size === unassignedCandidateIds.length &&
    response.execution_blocks.every(
      (block) =>
        hasExactFields(block, contract.executionBlockFieldsExactly) &&
        projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_candidate_id",
          block.ephemeral_opaque_candidate_id,
        ) &&
        projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_window_id",
          block.ephemeral_opaque_window_id,
        ) &&
        projectedScalarIsValid(
          contract.scalarSchemas.start_minute_kst,
          block.start_minute_kst,
        ) &&
        projectedScalarIsValid(
          contract.scalarSchemas.end_minute_kst,
          block.end_minute_kst,
        ) &&
        projectedScalarIsValid(
          contract.scalarSchemas.duration_minutes,
          block.duration_minutes,
        ),
    ) &&
    response.unassigned_candidates.every(
      (candidate) =>
        hasExactFields(
          candidate,
          contract.unassignedCandidateFieldsExactly,
        ) &&
        projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_candidate_id",
          candidate.ephemeral_opaque_candidate_id,
        ) &&
        contract.unassignedReasons.includes(candidate.reason_enum),
    )
  );
}

function gatewayConstructedCanonicalFallbackTuple(
  triggerStatus,
  nativePlanVersion = null,
) {
  if (["optimal", "feasible"].includes(triggerStatus)) {
    return {
      used: false,
      reason_enum: "not_used",
      native_plan_version: null,
    };
  }
  if (
    ![
      ...SOLVER_FAILURE_STATUSES,
      ...GATEWAY_CLASSIFICATION_STATUSES,
    ].includes(triggerStatus) ||
    typeof nativePlanVersion !== "string" ||
    nativePlanVersion.length === 0
  ) {
    return null;
  }
  return {
    used: true,
    reason_enum: triggerStatus,
    native_plan_version: nativePlanVersion,
  };
}

function gatewayOutcomeAfterOptimalOrFeasibleNativeValidation(
  projectedStatus,
  {
    canonicalAndNativeValidationValid,
    nativeFallbackValid,
  },
) {
  if (!["optimal", "feasible"].includes(projectedStatus)) return null;
  if (canonicalAndNativeValidationValid) {
    return {
      status: projectedStatus,
      discardedProjectedCandidatePlan: false,
      nativeFallbackAttempts: 0,
      fallback: gatewayConstructedCanonicalFallbackTuple(projectedStatus),
      projectedCandidatePlanReleased: true,
      canonicalNativeFallbackReleased: false,
    };
  }
  if (nativeFallbackValid) {
    return {
      status: "fallback",
      triggeringClassification: "validator_rejected",
      discardedProjectedCandidatePlan: true,
      nativeFallbackAttempts: 1,
      fallback: gatewayConstructedCanonicalFallbackTuple(
        "validator_rejected",
        "native_plan_v1",
      ),
      projectedCandidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    };
  }
  return {
    status: "blocked_manual_plan_required",
    triggeringClassification: "validator_rejected",
    discardedProjectedCandidatePlan: true,
    nativeFallbackAttempts: 1,
    fallback: {
      used: false,
      reason_enum: "not_used",
      native_plan_version: null,
    },
    projectedCandidatePlanReleased: false,
    canonicalNativeFallbackReleased: false,
  };
}

function blockEndUtcFromStudyDateKst(studyDateKst, endMinuteKst) {
  if (
    typeof studyDateKst !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(studyDateKst) ||
    !Number.isInteger(endMinuteKst) ||
    endMinuteKst < 1 ||
    endMinuteKst > 1440
  ) {
    return null;
  }
  const [year, month, day] = studyDateKst.split("-").map(Number);
  const originalDate = new Date(Date.UTC(year, month - 1, day));
  if (originalDate.toISOString().slice(0, 10) !== studyDateKst) {
    return null;
  }
  const nextDay = endMinuteKst === 1440 ? 1 : 0;
  const minuteOfDay = endMinuteKst === 1440 ? 0 : endMinuteKst;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const targetWallClockMs = Date.UTC(
    year,
    month - 1,
    day + nextDay,
    hour,
    minute,
  );
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let candidateUtcMs = targetWallClockMs;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidateUtcMs))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const observedWallClockMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correctionMs = targetWallClockMs - observedWallClockMs;
    candidateUtcMs += correctionMs;
    if (correctionMs === 0) return new Date(candidateUtcMs).toISOString();
  }
  return null;
}

function hardDeadlineClassification(candidates, block, studyDateKst) {
  if (
    !Array.isArray(candidates) ||
    !isPlainRecord(block) ||
    typeof block.ephemeral_opaque_candidate_id !== "string"
  ) {
    return "schema_mismatch";
  }
  const matches = candidates.filter(
    (candidate) =>
      isPlainRecord(candidate) &&
      typeof candidate.ephemeral_opaque_candidate_id === "string" &&
      candidate.ephemeral_opaque_candidate_id ===
        block.ephemeral_opaque_candidate_id,
  );
  if (matches.length !== 1) return "schema_mismatch";
  const hardDeadline = matches[0].hard_deadline_or_null;
  if (hardDeadline === null) return "feasible";
  if (
    typeof hardDeadline !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(
      hardDeadline,
    ) ||
    !Number.isFinite(Date.parse(hardDeadline))
  ) {
    return "schema_mismatch";
  }
  const blockEndUtc = blockEndUtcFromStudyDateKst(
    studyDateKst,
    block.end_minute_kst,
  );
  if (blockEndUtc === null) return "schema_mismatch";
  return Date.parse(blockEndUtc) <= Date.parse(hardDeadline)
    ? "feasible"
    : "validator_rejected";
}

function gatewayOutcomeAfterHardDeadlineValidation(
  triggeringClassification,
  nativeFallbackClassification,
) {
  if (triggeringClassification === "feasible") {
    return {
      status: "released",
      nativeFallbackAttempts: 0,
      candidatePlanReleased: true,
      canonicalNativeFallbackReleased: false,
    };
  }
  if (
    !["schema_mismatch", "validator_rejected"].includes(
      triggeringClassification,
    )
  ) {
    return null;
  }
  if (nativeFallbackClassification === "feasible") {
    return {
      status: "fallback",
      triggeringClassification,
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    };
  }
  return {
    status: "blocked_manual_plan_required",
    triggeringClassification,
    nativeFallbackAttempts: 1,
    candidatePlanReleased: false,
    canonicalNativeFallbackReleased: false,
  };
}

const IMMUTABLE_PLACEMENT_IDENTITY_FIELDS = [
  "ephemeral_opaque_candidate_id",
  "ephemeral_opaque_window_id",
  "start_minute_kst",
  "end_minute_kst",
  "duration_minutes",
];

function executionPlacementIsStructurallyValid(contract, placement) {
  return (
    hasExactFields(placement, IMMUTABLE_PLACEMENT_IDENTITY_FIELDS) &&
    projectedIdentifierIsValid(
      contract,
      "ephemeral_opaque_candidate_id",
      placement.ephemeral_opaque_candidate_id,
    ) &&
    projectedIdentifierIsValid(
      contract,
      "ephemeral_opaque_window_id",
      placement.ephemeral_opaque_window_id,
    ) &&
    projectedScalarIsValid(
      contract.scalarSchemas.start_minute_kst,
      placement.start_minute_kst,
    ) &&
    projectedScalarIsValid(
      contract.scalarSchemas.end_minute_kst,
      placement.end_minute_kst,
    ) &&
    projectedScalarIsValid(
      contract.scalarSchemas.duration_minutes,
      placement.duration_minutes,
    ) &&
    placement.start_minute_kst < placement.end_minute_kst &&
    placement.duration_minutes ===
      placement.end_minute_kst - placement.start_minute_kst
  );
}

function placementIdentityMatches(left, right) {
  return IMMUTABLE_PLACEMENT_IDENTITY_FIELDS.every(
    (field) => left[field] === right[field],
  );
}

function replanCutoffClassification(
  contract,
  releasePathStatus,
  block,
  correlatedInvocation,
  immutablePriorPlacements,
  expectedCorrelation,
) {
  const invocationFields = [
    "request_id",
    "input_snapshot_version",
    "candidates",
    "available_windows",
    "replan_cutoff_minute_kst_or_null",
  ];
  const correlationFields = [
    "request_id",
    "input_snapshot_version",
    "replan_cutoff_minute_kst_or_null",
  ];
  const replanCutoffMinuteKstOrNull =
    correlatedInvocation?.replan_cutoff_minute_kst_or_null;
  if (
    !isPlainRecord(contract) ||
    ![
      "optimal",
      "feasible",
      "canonical_native_fallback",
      "immutable_preflight",
    ].includes(releasePathStatus) ||
    !executionPlacementIsStructurallyValid(contract, block) ||
    !hasExactFields(correlatedInvocation, invocationFields) ||
    !hasExactFields(expectedCorrelation, correlationFields) ||
    !projectedIdentifierIsValid(
      contract,
      "request_id",
      correlatedInvocation.request_id,
    ) ||
    !projectedIdentifierIsValid(
      contract,
      "input_snapshot_version",
      correlatedInvocation.input_snapshot_version,
    ) ||
    correlatedInvocation.request_id !== expectedCorrelation.request_id ||
    correlatedInvocation.input_snapshot_version !==
      expectedCorrelation.input_snapshot_version ||
    correlatedInvocation.replan_cutoff_minute_kst_or_null !==
      expectedCorrelation.replan_cutoff_minute_kst_or_null ||
    !Array.isArray(correlatedInvocation.candidates) ||
    !Array.isArray(correlatedInvocation.available_windows) ||
    !Array.isArray(immutablePriorPlacements) ||
    !immutablePriorPlacements.every((placement) =>
      executionPlacementIsStructurallyValid(contract, placement),
    ) ||
    (replanCutoffMinuteKstOrNull !== null &&
      (!Number.isInteger(replanCutoffMinuteKstOrNull) ||
        replanCutoffMinuteKstOrNull < 0 ||
        replanCutoffMinuteKstOrNull > 1440)) ||
    (expectedCorrelation.replan_cutoff_minute_kst_or_null !== null &&
      (!Number.isInteger(
        expectedCorrelation.replan_cutoff_minute_kst_or_null,
      ) ||
        expectedCorrelation.replan_cutoff_minute_kst_or_null < 0 ||
        expectedCorrelation.replan_cutoff_minute_kst_or_null > 1440))
  ) {
    return "schema_mismatch";
  }
  const candidateIds = correlatedInvocation.candidates.map(
    (candidate) => candidate?.ephemeral_opaque_candidate_id,
  );
  const windowIds = correlatedInvocation.available_windows.map(
    (window) => window?.ephemeral_opaque_window_id,
  );
  if (
    candidateIds.some(
      (candidateId) =>
        !projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_candidate_id",
          candidateId,
        ),
    ) ||
    windowIds.some(
      (windowId) =>
        !projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_window_id",
          windowId,
        ),
    ) ||
    new Set(candidateIds).size !== candidateIds.length ||
    new Set(windowIds).size !== windowIds.length
  ) {
    return "schema_mismatch";
  }
  const candidateResolvesExactlyOnce = (candidateId) =>
    candidateIds.filter((id) => id === candidateId).length === 1;
  const windowResolvesExactlyOnce = (windowId) =>
    windowIds.filter((id) => id === windowId).length === 1;
  if (
    !candidateResolvesExactlyOnce(
      block.ephemeral_opaque_candidate_id,
    ) ||
    !windowResolvesExactlyOnce(block.ephemeral_opaque_window_id) ||
    immutablePriorPlacements.some(
      (placement) =>
        !candidateResolvesExactlyOnce(
          placement.ephemeral_opaque_candidate_id,
        ) ||
        !windowResolvesExactlyOnce(
          placement.ephemeral_opaque_window_id,
        ),
    )
  ) {
    return "schema_mismatch";
  }
  const immutableCandidateIds = immutablePriorPlacements.map(
    (placement) => placement.ephemeral_opaque_candidate_id,
  );
  if (
    new Set(immutableCandidateIds).size !== immutableCandidateIds.length
  ) {
    return "schema_mismatch";
  }
  const exactImmutableMatches = immutablePriorPlacements.filter(
    (placement) => placementIdentityMatches(block, placement),
  );
  if (exactImmutableMatches.length > 1) return "schema_mismatch";
  if (exactImmutableMatches.length === 1) return "feasible";
  if (replanCutoffMinuteKstOrNull === null) return "feasible";
  return block.start_minute_kst >= replanCutoffMinuteKstOrNull
    ? "feasible"
    : "validator_rejected";
}

function halfOpenIntervalsDoNotOverlap(left, right) {
  return (
    left.end_minute_kst <= right.start_minute_kst ||
    right.end_minute_kst <= left.start_minute_kst
  );
}

function intervalIsStructurallyValid(interval) {
  return (
    isPlainRecord(interval) &&
    Number.isInteger(interval.start_minute_kst) &&
    Number.isInteger(interval.end_minute_kst) &&
    interval.start_minute_kst >= 0 &&
    interval.start_minute_kst <= 1439 &&
    interval.end_minute_kst >= 1 &&
    interval.end_minute_kst <= 1440 &&
    interval.start_minute_kst < interval.end_minute_kst
  );
}

function pairwiseBlockNonOverlapClassification(
  contract,
  releasePathStatus,
  executionBlocks,
  fixedBlocks,
  immutablePriorPlacements,
) {
  if (
    ![
      "optimal",
      "feasible",
      "canonical_native_fallback",
      "immutable_preflight",
    ].includes(releasePathStatus) ||
    !Array.isArray(executionBlocks) ||
    !Array.isArray(fixedBlocks) ||
    !Array.isArray(immutablePriorPlacements) ||
    !executionBlocks.every((block) =>
      executionPlacementIsStructurallyValid(contract, block),
    ) ||
    !fixedBlocks.every(intervalIsStructurallyValid) ||
    !immutablePriorPlacements.every((placement) =>
      executionPlacementIsStructurallyValid(contract, placement),
    )
  ) {
    return "schema_mismatch";
  }
  for (const block of executionBlocks) {
    const exactImmutableMatches = immutablePriorPlacements.filter(
      (placement) => placementIdentityMatches(block, placement),
    );
    if (exactImmutableMatches.length > 1) return "schema_mismatch";
  }
  for (
    let leftIndex = 0;
    leftIndex < immutablePriorPlacements.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < immutablePriorPlacements.length;
      rightIndex += 1
    ) {
      if (
        placementIdentityMatches(
          immutablePriorPlacements[leftIndex],
          immutablePriorPlacements[rightIndex],
        )
      ) {
        return "schema_mismatch";
      }
      if (
        !halfOpenIntervalsDoNotOverlap(
          immutablePriorPlacements[leftIndex],
          immutablePriorPlacements[rightIndex],
        )
      ) {
        return "validator_rejected";
      }
    }
  }
  for (const immutablePlacement of immutablePriorPlacements) {
    if (
      fixedBlocks.some(
        (fixedBlock) =>
          !halfOpenIntervalsDoNotOverlap(
            immutablePlacement,
            fixedBlock,
          ),
      )
    ) {
      return "validator_rejected";
    }
  }
  for (let leftIndex = 0; leftIndex < executionBlocks.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < executionBlocks.length;
      rightIndex += 1
    ) {
      if (
        !halfOpenIntervalsDoNotOverlap(
          executionBlocks[leftIndex],
          executionBlocks[rightIndex],
        )
      ) {
        return "validator_rejected";
      }
    }
  }
  for (const block of executionBlocks) {
    if (
      fixedBlocks.some(
        (fixedBlock) => !halfOpenIntervalsDoNotOverlap(block, fixedBlock),
      )
    ) {
      return "validator_rejected";
    }
    for (const immutablePlacement of immutablePriorPlacements) {
      if (placementIdentityMatches(block, immutablePlacement)) continue;
      if (!halfOpenIntervalsDoNotOverlap(block, immutablePlacement)) {
        return "validator_rejected";
      }
    }
  }
  return "feasible";
}

function prerequisiteOrderingClassification(
  contract,
  releasePathStatus,
  candidates,
  executionBlocks,
  unassignedCandidates = [],
) {
  if (
    ![
      "optimal",
      "feasible",
      "canonical_native_fallback",
      "immutable_preflight",
    ].includes(releasePathStatus) ||
    !Array.isArray(candidates) ||
    !Array.isArray(executionBlocks) ||
    !Array.isArray(unassignedCandidates) ||
    !executionBlocks.every((block) =>
      executionPlacementIsStructurallyValid(contract, block),
    )
  ) {
    return "schema_mismatch";
  }
  const candidateIds = candidates.map(
    (candidate) => candidate?.ephemeral_opaque_candidate_id,
  );
  if (
    candidates.some(
      (candidate) =>
        !isPlainRecord(candidate) ||
        !projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_candidate_id",
          candidate.ephemeral_opaque_candidate_id,
        ) ||
        !Array.isArray(candidate.prerequisite_candidate_ids) ||
        new Set(candidate.prerequisite_candidate_ids).size !==
          candidate.prerequisite_candidate_ids.length,
    ) ||
    new Set(candidateIds).size !== candidateIds.length
  ) {
    return "schema_mismatch";
  }
  const candidateSet = new Set(candidateIds);
  for (const candidate of candidates) {
    if (
      candidate.prerequisite_candidate_ids.some(
        (prerequisiteId) =>
          !projectedIdentifierIsValid(
            contract,
            "ephemeral_opaque_candidate_id",
            prerequisiteId,
          ) || !candidateSet.has(prerequisiteId),
      )
    ) {
      return "schema_mismatch";
    }
  }
  const unassignedIds = unassignedCandidates.map(
    (candidate) => candidate?.ephemeral_opaque_candidate_id,
  );
  if (
    unassignedIds.some(
      (candidateId) =>
        !projectedIdentifierIsValid(
          contract,
          "ephemeral_opaque_candidate_id",
          candidateId,
        ) || !candidateSet.has(candidateId),
    ) ||
    new Set(unassignedIds).size !== unassignedIds.length
  ) {
    return "schema_mismatch";
  }
  const placedByCandidateId = new Map();
  for (const block of executionBlocks) {
    if (!candidateSet.has(block.ephemeral_opaque_candidate_id)) {
      return "schema_mismatch";
    }
    const blocks =
      placedByCandidateId.get(block.ephemeral_opaque_candidate_id) ?? [];
    blocks.push(block);
    placedByCandidateId.set(block.ephemeral_opaque_candidate_id, blocks);
  }
  if ([...placedByCandidateId.values()].some((blocks) => blocks.length > 1)) {
    return "schema_mismatch";
  }
  const unassignedSet = new Set(unassignedIds);
  for (const dependentBlock of executionBlocks) {
    const dependent = candidates.find(
      (candidate) =>
        candidate.ephemeral_opaque_candidate_id ===
        dependentBlock.ephemeral_opaque_candidate_id,
    );
    for (const prerequisiteId of dependent.prerequisite_candidate_ids) {
      const prerequisiteBlocks =
        placedByCandidateId.get(prerequisiteId) ?? [];
      if (
        unassignedSet.has(prerequisiteId) ||
        prerequisiteBlocks.length !== 1 ||
        prerequisiteBlocks[0].end_minute_kst >
          dependentBlock.start_minute_kst
      ) {
        return "validator_rejected";
      }
    }
  }
  return "feasible";
}

function nonDroppablePlacementIsValid(
  candidates,
  executionBlocks,
  unassignedCandidates,
) {
  const candidateMatches = (candidateId) =>
    candidates.filter(
      (candidate) =>
        candidate.ephemeral_opaque_candidate_id === candidateId,
    );
  for (const candidate of candidates) {
    const candidateId = candidate.ephemeral_opaque_candidate_id;
    const placedCount = executionBlocks.filter(
      (block) => block.ephemeral_opaque_candidate_id === candidateId,
    ).length;
    const unassignedCount = unassignedCandidates.filter(
      (entry) => entry.ephemeral_opaque_candidate_id === candidateId,
    ).length;
    const nonDroppable =
      candidate.pinned === true || candidate.can_drop === false;
    if (nonDroppable && (placedCount !== 1 || unassignedCount !== 0)) {
      return false;
    }
  }
  return unassignedCandidates.every((entry) => {
    const matches = candidateMatches(entry.ephemeral_opaque_candidate_id);
    return (
      matches.length === 1 &&
      matches[0].pinned === false &&
      matches[0].can_drop === true
    );
  });
}

function candidateWindowRelationClassification(candidates, windows, block) {
  const candidateMatches = candidates.filter(
    (candidate) =>
      candidate.ephemeral_opaque_candidate_id ===
      block.ephemeral_opaque_candidate_id,
  );
  const windowMatches = windows.filter(
    (window) =>
      window.ephemeral_opaque_window_id ===
      block.ephemeral_opaque_window_id,
  );
  if (candidateMatches.length !== 1 || windowMatches.length !== 1) {
    return "schema_mismatch";
  }
  const [candidate] = candidateMatches;
  const [window] = windowMatches;
  if (
    !Array.isArray(candidate.allowed_window_ids) ||
    new Set(candidate.allowed_window_ids).size !==
      candidate.allowed_window_ids.length ||
    candidate.allowed_window_ids.some(
      (windowId) =>
        windows.filter(
          (candidateWindow) =>
            candidateWindow.ephemeral_opaque_window_id === windowId,
        ).length !== 1,
    )
  ) {
    return "schema_mismatch";
  }
  const numericFields = [
    block.start_minute_kst,
    block.end_minute_kst,
    window.start_minute_kst,
    window.end_minute_kst,
  ];
  if (
    numericFields.some((value) => !Number.isInteger(value)) ||
    typeof window.available !== "boolean"
  ) {
    return "schema_mismatch";
  }
  if (
    !candidate.allowed_window_ids.includes(
      block.ephemeral_opaque_window_id,
    ) ||
    window.available !== true ||
    !(
      window.start_minute_kst <= block.start_minute_kst &&
      block.start_minute_kst < block.end_minute_kst &&
      block.end_minute_kst <= window.end_minute_kst
    )
  ) {
    return "validator_rejected";
  }
  return "valid";
}

function fallbackEnvelopeRequirementsSatisfied(
  contract,
  status,
  fallback,
  {
    canonicalResultSchemaValid = true,
    nativePlanVersionSchemaValid = true,
    nativePlanValid = true,
  } = {},
) {
  if (["optimal", "feasible"].includes(status)) {
    return (
      canonicalResultSchemaValid &&
      fallback?.used === false &&
      fallback.reason_enum === "not_used" &&
      fallback.native_plan_version === null
    );
  }
  if (
    !contract.fallbackStatuses.includes(status) &&
    status !== "fallback"
  ) {
    return false;
  }
  return (
    canonicalResultSchemaValid &&
    fallback?.used === true &&
    (status === "fallback"
      ? contract.fallbackStatuses.includes(fallback.reason_enum)
      : fallback.reason_enum === status) &&
    fallback.native_plan_version !== null &&
    nativePlanVersionSchemaValid &&
    nativePlanValid
  );
}

function failureFixtureEntryIsValid(
  contract,
  entry,
  nativeFallbackAttempt,
  {
    canonicalResultSchemaValid = true,
    nativePlanVersionSchemaValid = true,
    nativePlanValid = true,
    nativePlanFailureCode = null,
    rejectionCode = null,
    manualBlockResultStatus = null,
    manualBlockExecutionBlockCount = 0,
    manualBlockReferencesNativePlan = false,
    manualBlockFallback = null,
    previouslyUsedNativeFallbackDigests = new Set(),
  } = {},
) {
  const exactEntryFields = [
    "synthetic_fixture_id",
    "expected_status",
    "observed_status",
    "trigger_origin_enum",
    "native_fallback_result_digest_sha256",
    "manual_block_result_digest_sha256_or_null",
    "assertion_result",
  ];
  const digestPattern = /^[a-f0-9]{64}$/;
  const expectedTriggerOrigin = SOLVER_FAILURE_STATUSES.includes(
    entry.expected_status,
  )
    ? "solver_failure"
    : GATEWAY_CLASSIFICATION_STATUSES.includes(entry.expected_status)
      ? "trusted_gateway_classification"
      : null;
  const entryIsClosedAndCrossBound =
    canonicalJson(Object.keys(entry)) === canonicalJson(exactEntryFields) &&
    /^syn_s237o_[A-Za-z0-9_-]{8,80}$/.test(entry.synthetic_fixture_id) &&
    contract.fallbackStatuses.includes(entry.expected_status) &&
    entry.observed_status === entry.expected_status &&
    entry.trigger_origin_enum === expectedTriggerOrigin &&
    digestPattern.test(entry.native_fallback_result_digest_sha256) &&
    (entry.manual_block_result_digest_sha256_or_null === null ||
      digestPattern.test(
        entry.manual_block_result_digest_sha256_or_null,
      )) &&
    entry.assertion_result === "passed" &&
    !previouslyUsedNativeFallbackDigests.has(
      entry.native_fallback_result_digest_sha256,
    );
  if (!entryIsClosedAndCrossBound) return false;

  let expectedRejectionCode = null;
  if (
    ![entry.expected_status, "fallback"].includes(
      nativeFallbackAttempt?.status,
    )
  ) {
    expectedRejectionCode = "fallback_status_mismatch";
  } else if (!nativeFallbackAttempt?.fallback) {
    expectedRejectionCode = "missing_fallback";
  } else if (nativeFallbackAttempt.fallback.used !== true) {
    expectedRejectionCode = "fallback_unused";
  } else if (
    nativeFallbackAttempt.fallback.reason_enum !== entry.expected_status
  ) {
    expectedRejectionCode = "fallback_reason_mismatch";
  } else if (
    nativeFallbackAttempt.fallback.native_plan_version === null ||
    !nativePlanVersionSchemaValid
  ) {
    expectedRejectionCode = "native_plan_version_invalid";
  } else if (!nativePlanValid) {
    expectedRejectionCode = nativePlanFailureCode;
  } else if (!canonicalResultSchemaValid) {
    expectedRejectionCode = "canonical_result_contract_invalid";
  }

  const fallbackIsValid =
    expectedRejectionCode === null && nativePlanValid;
  if (fallbackIsValid) {
    return (
      entry.manual_block_result_digest_sha256_or_null === null &&
      manualBlockResultStatus === null &&
      manualBlockExecutionBlockCount === 0 &&
      manualBlockReferencesNativePlan === false &&
      manualBlockFallback === null &&
      rejectionCode === null
    );
  }
  return (
    digestPattern.test(
      entry.manual_block_result_digest_sha256_or_null ?? "",
    ) &&
    manualBlockResultStatus === "blocked_manual_plan_required" &&
    manualBlockExecutionBlockCount === 0 &&
    manualBlockReferencesNativePlan === false &&
    manualBlockFallback?.used === false &&
    manualBlockFallback.reason_enum === "not_used" &&
    manualBlockFallback.native_plan_version === null &&
    NATIVE_FALLBACK_REJECTION_CODES.includes(rejectionCode) &&
    rejectionCode === expectedRejectionCode
  );
}

function o4tApprovedPacketResolutionContractIsClosed(scheduler) {
  const contract =
    scheduler.o4tPacketDigestContract.approvedThresholdBindingDigestContract;
  const resolver = contract.resolverBootstrapContract;
  const artifactFieldSchemas = resolver.artifactFieldSchemas ?? {};
  const signedPayloadFieldSchemas = resolver.signedPayloadFieldSchemas ?? {};
  const trustAnchor = resolver.trustAnchorContract;
  const requiredArtifactFields = [
    "authenticated_owner_private_scope_digest_sha256",
    "audience",
    "purpose",
    "stages_exactly",
    "opaque_o4t_approved_packet_store_ref",
    "o4t_approved_packet_store_policy_digest_sha256",
    "o4t_approved_threshold_binding_digest_sha256",
    "resolver_trust_anchor_registry_ref",
    "resolver_trust_anchor_registry_digest_sha256",
    "verification_key_id",
    "verification_key_version",
    "trust_root_id",
    "trust_root_version",
    "signature_algorithm",
    "dsse_payload_type",
    "signed_payload",
    "signed_payload_digest_sha256",
    "dsse_envelope_digest_sha256",
    "resolver_binding_artifact_digest_sha256",
    "replay_nonce",
    "resolver_generation",
    "revocation_policy_version",
    "opaque_revocation_evidence_ref",
    "revocation_evidence_digest_sha256",
    "revocation_checked_at",
    "signature_verified",
    "revoked",
  ];
  const exactArtifactSchema =
    JSON.stringify(resolver.artifactFieldsExactly) ===
      JSON.stringify(Object.keys(artifactFieldSchemas)) &&
    requiredArtifactFields.every((field) =>
      resolver.artifactFieldsExactly.includes(field),
    );
  const exactSignedPayloadSchema =
    JSON.stringify(resolver.signedPayloadFieldsExactly) ===
      JSON.stringify(Object.keys(signedPayloadFieldSchemas)) &&
    resolver.signedPayloadFieldsExactly.every(
      (field) =>
        canonicalJson(signedPayloadFieldSchemas[field]) ===
        canonicalJson(artifactFieldSchemas[field]),
    );
  const exactTrustAnchorSchema =
    JSON.stringify(trustAnchor.registryEntryFieldsExactly) ===
    JSON.stringify(Object.keys(trustAnchor.registryEntryFieldSchemas));
  return (
    contract.contentAddressedStore ===
      "exact_private_o4t_approved_threshold_packet_store_bound_by_ownerDecisionBinding" &&
    contract.contentAddressedStoreRefBootstrapSourcePath ===
      "verifiedResolverBootstrapArtifact.signed_payload.opaque_o4t_approved_packet_store_ref" &&
    contract.contentAddressedStorePolicyDigestBootstrapSourcePath ===
      "verifiedResolverBootstrapArtifact.signed_payload.o4t_approved_packet_store_policy_digest_sha256" &&
    contract.resolvedPacketStoreRefEqualityTargetPath ===
      "o4tThresholdDecisionPacket.ownerDecisionBinding.opaqueOwnerDecisionStoreRef" &&
    contract.resolvedPacketStorePolicyDigestEqualityTargetPath ===
      "o4tThresholdDecisionPacket.ownerDecisionBinding.ownerDecisionStorePolicyDigestSha256" &&
    contract.contentAddressLookupKey ===
      "o4t_approved_threshold_binding_digest_sha256" &&
    resolver.contractVersion ===
      "inverge.o4t-approved-packet-resolver-bootstrap.v1" &&
    resolver.trustedSource ===
      "externally_anchored_authenticated_signed_o4t_control_plane_authorization_context" &&
    exactArtifactSchema &&
    exactSignedPayloadSchema &&
    exactTrustAnchorSchema &&
    resolver.artifactAdditionalFieldsAllowed === false &&
    resolver.signedPayloadAdditionalFieldsAllowed === false &&
    resolver.signedPayloadSchemasAreExactProjectionOfArtifactFieldSchemas ===
      true &&
    resolver.artifactAndSignedPayloadFreeTextAllowed === false &&
    resolver.signedPayloadDigestContract.serialization === JCS_SERIALIZATION &&
    resolver.dsseEnvelopeDigestContract.serialization === JCS_SERIALIZATION &&
    resolver.artifactDigestContract.serialization === JCS_SERIALIZATION &&
    resolver.artifactDigestContract
      .authenticatedControlPlaneContextMustBindOpaqueResolverBindingIdAndArtifactDigest ===
      true &&
    trustAnchor.externalSource ===
      "exact_owner_approved_o4t_resolver_trust_anchor_registry_from_authenticated_control_plane_configuration" &&
    trustAnchor
      .registryMustResolveBeforeArtifactAndMayNotComeFromThresholdPacketResolverArtifactOrResolvedPacket ===
      true &&
    trustAnchor
      .artifactMayNotSelectIntroduceOrExtendVerificationKeyTrustRootOrAlgorithmAllowlist ===
      true &&
    trustAnchor
      .artifactRegistryKeyRootVersionAlgorithmScopeAudiencePurposeStagesAndRevocationPolicyMustExactlyMatchCurrentExternalEntry ===
      true &&
    trustAnchor
      .registryEntryValidityAndRevocationMustBeCheckedAtEveryStartAndAcceptanceUse ===
      true &&
    resolver.verificationRules
      .artifactAndSignedPayloadMustMatchExactClosedSchemas === true &&
    resolver.verificationRules
      .everySignedPayloadFieldMustExactlyEqualArtifactProjection === true &&
    resolver.verificationRules
      .signedPayloadAndDsseEnvelopeDigestsMustBeRecomputedAndMatch === true &&
    resolver.verificationRules
      .resolverArtifactDigestMustBeRecomputedAndMatchAuthenticatedControlPlaneContext ===
      true &&
    resolver.verificationRules
      .dsseSignatureMustCryptographicallyVerifyAgainstExternallyResolvedCurrentTrustAnchorEntry ===
      true &&
    resolver.verificationRules
      .signatureVerifiedOuterBooleanMayNotSubstituteForCryptographicVerification ===
      true &&
    resolver.verificationRules
      .authenticatedRequestOwnerPrivateScopeDigestMustEqualSignedScopeAndExternalRegistryScope ===
      true &&
    resolver.verificationRules
      .audiencePurposeAndStagesMustEqualExactClosedValues === true &&
    resolver.verificationRules
      .replayNonceMustBeAtomicallyConsumedOnceInApprovedOwnerPrivateResolverNonceStore ===
      true &&
    resolver.verificationRules
      .resolverGenerationMustBeStrictlyGreaterThanLastAcceptedGenerationForSameScopeAudiencePurposeAndStagesInAppendOnlyResolverGenerationStore ===
      true &&
    resolver.verificationRules
      .generationAndNonceConsumptionMustBeAtomicWithAuthorizedPacketLookupUse ===
      true &&
    resolver.verificationRules
      .resolverArtifactMustBeReResolvedAndFullyRevalidatedAtEveryO2oAndS238ohStartAndAcceptanceUse ===
      true &&
    resolver.verificationRules
      .unknownKeyWrongKeyVersionUntrustedRootWrongRootVersionDisallowedAlgorithmUnsignedInvalidSignaturePayloadMismatchScopeAudiencePurposeOrStageMismatchExpiredRevokedOrReplayFailsClosed ===
      true &&
    resolver
      .storeCoordinatesMustBeResolvedAndAuthenticatedBeforeApprovedPacketLookup ===
      true &&
    resolver
      .bindingMustBeSignedCurrentUnexpiredUnrevokedReplayProtectedAndScopeBound ===
      true &&
    resolver
      .resolvedPacketOwnerDecisionStoreRefAndPolicyDigestMustExactlyEqualTrustedResolverCoordinates ===
      true &&
    resolver
      .packetInternalStoreCoordinatesMayNotBootstrapTheirOwnLookup === true &&
    contract.contentAddressedObjectRules
      .oneImmutableCanonicalApprovedPacketPerFinalDigest === true &&
    contract.contentAddressedObjectRules.appendOnlyWriteOnce === true &&
    contract.contentAddressedObjectRules
      .idempotentRewriteRequiresByteIdenticalCanonicalPacket === true &&
    contract.contentAddressedObjectRules.aliasAllowed === false &&
    contract.contentAddressedObjectRules.redirectAllowed === false &&
    contract.contentAddressedObjectRules.mutableOverwriteAllowed === false &&
    contract.approvedPacketMustBeWrittenUnderFinalDigestBeforeO2oOrS238ohMayStart ===
      true &&
    contract
      .allO2oAndS238ohStartAndAcceptanceUsesMustResolveExactApprovedPacketByDigestFromExactBoundStoreAndRecomputeCanonicalDigest ===
      true &&
    contract
      .resolvedPacketMustPassExactSchemaApprovalRecordOwnerDecisionReceiptAndCurrentRevocationValidation ===
      true &&
    contract.resolvedPacketValidationRules.statusMustEqualApproved === true &&
    contract.resolvedPacketValidationRules.ownerApprovedMustEqualTrue === true &&
    contract.resolvedPacketValidationRules
      .approvalRecordMustBeImmutableAndComplete === true &&
    contract.resolvedPacketValidationRules
      .approvalRecordDecisionProposalDigestDecidedAtReceiptRefAndReceiptDigestMustExactlyEqualResolvedReceipt ===
      true &&
    contract.resolvedPacketValidationRules
      .packetMustBeUnexpiredAtEveryO2oAndS238ohStartAndAcceptanceUse === true &&
    contract.resolvedPacketValidationRules
      .receiptSignatureTrustPathExpiryAndRevocationMustBeRevalidatedAtEveryO2oAndS238ohStartAndAcceptanceUse ===
      true &&
    contract
      .lookupMissAmbiguityDuplicateStoreOrPolicyMismatchCanonicalDigestMismatchOrInvalidReceiptFailsClosed ===
      true &&
    contract
      .wrongOrInvalidResolverBindingAliasRedirectMutableObjectStaleOrExpiredPacketFailsClosed ===
      true &&
    contract.finalDigestIsNotAStandaloneBearerAuthorization === true &&
    contract.ownerDecisionReceiptMustBeCurrentValidAndRevalidatedAtEveryUse ===
      true
  );
}

function roadmapItem(source, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(
      `^  - id: ${escaped}\\n([\\s\\S]*?)(?=^  - id: |\\Z)`,
      "m",
    ),
  );
  assert.ok(match, `missing roadmap item ${id}`);
  return match[0];
}

test("S234R stays source-only while the later lean O4V decision keeps activation false", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const decision = await text(
    "docs/decisions/2026-07-26-owner-dogfood-private-plane-schedule-amendment.md",
  );
  const o4vDecision = await text(
    "docs/decisions/2026-07-30-owner-o4v-lean-owner-private-gate.md",
  );

  assert.equal(unified.contractVersion, "dabangil.unified_program.v2");
  assert.equal(
    unified.decision.id,
    "owner_o1r_owner_dogfood_private_plane_schedule_2026_07_26",
  );
  assert.equal(unified.decision.status, "approved_for_source_amendment_only");
  assert.equal(unified.decision.runtimeActivationAuthorized, false);
  assert.equal(unified.decision.productionActivationAuthorized, false);
  assert.equal(unified.decision.dependencyActivationAuthorized, false);
  assert.equal(
    unified.decision.providerModelPromptActivationAuthorized,
    false,
  );
  assert.equal(
    unified.privateAuthoringReviewPlane
      .o4vApprovalRequiresExactDsseOwnerDecisionReceiptAndFinalApprovedBindingDigest,
    false,
  );
  assert.equal(
    unified.privateAuthoringReviewPlane
      .completedS236PAcceptanceIsExactContentAddressedArtifact,
    false,
  );
  assert.match(decision, /source-only amendment/i);
  assert.match(
    decision,
    /does not approve O3A, O4V, O4A, O4T, O2O, O4P, O4F/i,
  );
  assert.match(decision, /PR #660 remains Draft and blocked/i);
  assert.equal(fileSha256(o4vDecision), O4V_LEAN_DECISION_SHA256);
  assert.equal(
    unified.privateAuthoringReviewPlane.status,
    "o4v_lean_owner_private_gate_approved_s236p_not_started",
  );
  assert.equal(
    unified.privateAuthoringReviewPlane
      .cryptographicallyVerifiedIndependentSignedAttestationRequired,
    false,
  );
  assert.equal(
    unified.privateAuthoringReviewPlane
      .ownerOriginalReuploadIsPilotRecoveryMode,
    true,
  );
  assert.equal(
    unified.ownerGates.O4V,
    "approved_exact_lean_owner_private_gate_s236p_only_no_immediate_operation",
  );
  assert.match(o4vDecision, /88-field provider-binding proposal/i);
  assert.match(o4vDecision, /S236P is not started by this decision/i);
});

test("exact O3A decision binds immutable evidence without authorizing immediate operation", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const decision = await text(
    "docs/decisions/2026-07-29-owner-o3a-golden-3-approval.md",
  );
  const manifest = await text(
    "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness.json",
  );
  const report = await text(
    "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness_report.json",
  );
  const scopeDecision = unified.scopeDecisions.O3A;

  assert.equal(fileSha256(decision), O3A_DECISION_SHA256);
  assert.equal(fileSha256(manifest), O3A_MANIFEST_FILE_SHA256);
  assert.equal(fileSha256(report), O3A_REPORT_FILE_SHA256);
  assert.equal(
    scopeDecision.status,
    "approved_exact_packet_only_subject_to_expiry_and_revocation",
  );
  assert.equal(scopeDecision.decisionRecordSha256, O3A_DECISION_SHA256);
  assert.equal(scopeDecision.packetCanonicalSha256, O3A_PACKET_SHA256);
  assert.equal(
    scopeDecision.manifestCanonicalSha256,
    "de0e79159d8538d0e658bb9b0693ce27ed2bf7fcea3cf0d19198894cd7905b72",
  );
  assert.equal(scopeDecision.packetProposalSelfState, "pending_owner_decision");
  assert.equal(scopeDecision.packetProposalOwnerApproved, false);
  assert.deepEqual(scopeDecision.requiredBeforeAllowedOperationRoadmapItemIds, [
    "S236P",
  ]);
  assert.equal(scopeDecision.approvalAuthorizesImmediateOperation, false);
  assert.equal(scopeDecision.automaticStartAllowed, false);
  assert.equal(scopeDecision.manualS236AStartRequired, true);
  assert.equal(scopeDecision.o4vOrS236PSubstitutionAllowed, false);
  assert.equal(scopeDecision.s236aStarted, false);
  assert.equal(scopeDecision.golden3Started, false);
  assert.equal(
    unified.ownerGates.O3A,
    "approved_exact_golden_3_rights_source_version_purpose_packet_only_no_immediate_operation",
  );
  assert.match(decision, /APPROVE O3A/);
  assert.match(decision, /S236A remains queued and unstarted/i);
  assert.match(decision, /PR #660 remains open, Draft, blocked/i);
});

test("lean O4V decision supersedes the 88-field packet and authorizes only future synthetic S236P", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const privatePlane = await json(
    "config/dabangil-private-authoring-review-plane-contract.json",
  );
  const decision = await text(
    "docs/decisions/2026-07-30-owner-o4v-lean-owner-private-gate.md",
  );
  const scopeDecision = unified.scopeDecisions.O4V;
  const activeGate = privatePlane.activeO4VGate;

  assert.equal(fileSha256(decision), O4V_LEAN_DECISION_SHA256);
  assert.equal(
    scopeDecision.status,
    "approved_exact_lean_owner_private_gate_only",
  );
  assert.equal(scopeDecision.decisionRecordSha256, O4V_LEAN_DECISION_SHA256);
  assert.equal(
    scopeDecision.gateContractVersion,
    activeGate.contractVersion,
  );
  assert.equal(scopeDecision.legacyPacketDisposition, "superseded_rejected");
  assert.equal(scopeDecision.legacyProviderBindingFieldCount, 88);
  assert.equal(scopeDecision.legacyProviderBindingMaterialized, false);
  assert.equal(scopeDecision.cloudProjectName, "inverge-beta");
  assert.equal(scopeDecision.ownerOnlyPrivateBucketRequired, true);
  assert.equal(scopeDecision.ownerOnlyMetadataRlsRequired, true);
  assert.equal(scopeDecision.publicAccessAllowed, false);
  assert.equal(scopeDecision.bidirectionalOtherAccountAccessAllowed, false);
  assert.equal(scopeDecision.signedUrlTtlSecondsMaximum, 300);
  assert.equal(scopeDecision.rawContentExternalEmissionAllowed, false);
  assert.equal(scopeDecision.s236pSyntheticOnly, true);
  assert.equal(scopeDecision.ocrAiContentProviderMode, "none");
  assert.equal(scopeDecision.privateContentRetentionDaysMaximum, 365);
  assert.equal(scopeDecision.metadataLogRetentionDaysMaximum, 7);
  assert.equal(scopeDecision.temporaryCopyTtlSecondsMaximum, 300);
  assert.equal(scopeDecision.applicationCacheTtlSecondsExact, 0);
  assert.equal(scopeDecision.exportDeleteSlaSecondsMaximum, 604800);
  assert.equal(scopeDecision.automaticObjectVersionRollbackGuaranteed, false);
  assert.equal(scopeDecision.recoveryMode, "owner_retained_original_reupload");
  assert.equal(scopeDecision.dedicatedKmsHsmRequiredForCurrentOwnerPilot, false);
  assert.equal(scopeDecision.separateDsseStoreRequiredForCurrentOwnerPilot, false);
  assert.equal(
    scopeDecision.independentInfrastructureVerifierRequiredForCurrentOwnerPilot,
    false,
  );
  assert.equal(
    scopeDecision.futureS236PSyntheticProvisioningAndAcceptanceAuthorized,
    true,
  );
  assert.equal(scopeDecision.approvalAuthorizesImmediateOperation, false);
  assert.equal(scopeDecision.automaticProvisioningAllowed, false);
  assert.equal(scopeDecision.automaticS236PStartAllowed, false);
  assert.equal(scopeDecision.automaticS236AStartAllowed, false);
  assert.equal(scopeDecision.s236pStarted, false);
  assert.equal(scopeDecision.s236aStarted, false);
  assert.equal(scopeDecision.realContentAuthorized, false);
  assert.equal(scopeDecision.productionAuthorized, false);
  assert.equal(scopeDecision.externalUsersAuthorized, false);
  assert.match(decision, /Owner restores lost source content by re-uploading/i);
  assert.match(decision, /PR #660 or PR #672/i);
});

test("all cryptographic JSON preimages use one RFC 8785 serialization", async () => {
  const contracts = await Promise.all([
    json("config/dabangil-private-authoring-review-plane-contract.json"),
    json("config/dabangil-full-day-scheduler-contract.json"),
  ]);
  const serializationValues = contracts.flatMap((contract) =>
    collectNamedValues(
      contract,
      new Set(["serialization", "signedPayloadSerialization"]),
    ),
  );

  assert.ok(serializationValues.length > 0);
  assert.ok(
    serializationValues.every((value) => value === JCS_SERIALIZATION),
  );
  assert.equal(
    canonicalJson({
      "\ufb33": 1,
      "\ud83d\ude00": 2,
      "\u20ac": 3,
      "\r": 4,
      1: 5,
    }),
    "{\"\\r\":4,\"1\":5,\"€\":3,\"😀\":2,\"דּ\":1}",
  );
});

test("private plane records the lean O4V gate and preserves legacy integrity boundaries", async () => {
  const contract = await json(
    "config/dabangil-private-authoring-review-plane-contract.json",
  );

  assert.equal(
    contract.contractVersion,
    "dabangil.private_authoring_review_plane.v1",
  );
  assert.equal(
    contract.status,
    "o4v_lean_owner_private_gate_approved_s236p_not_started",
  );
  assert.equal(contract.runtimeAuthorized, false);
  assert.equal(contract.realContentAuthorized, false);
  assert.equal(contract.provisioningAuthorized, false);
  assert.equal(
    contract.activeO4VGate.contractVersion,
    "dabangil.o4v.lean_owner_private_gate.v1",
  );
  assert.equal(
    contract.activeO4VGate.decisionRecordSha256,
    O4V_LEAN_DECISION_SHA256,
  );
  assert.equal(contract.activeO4VGate.cloudPlane.projectName, "inverge-beta");
  assert.equal(
    contract.activeO4VGate.objectStorage.signedUrlTtlSecondsMaximum,
    300,
  );
  assert.equal(
    contract.activeO4VGate.metadataStore.metadataLogRetentionDaysMaximum,
    7,
  );
  assert.equal(
    contract.activeO4VGate.retentionAndLifecycle
      .privateContentRetentionDaysMaximum,
    365,
  );
  assert.equal(
    contract.activeO4VGate.retentionAndLifecycle
      .temporaryCopyTtlSecondsMaximum,
    300,
  );
  assert.equal(
    contract.activeO4VGate.retentionAndLifecycle
      .applicationCacheTtlSecondsExact,
    0,
  );
  assert.equal(
    contract.activeO4VGate.retentionAndLifecycle
      .exportDeleteSlaSecondsMaximum,
    604800,
  );
  assert.equal(
    contract.activeO4VGate.contentProcessing.ocrAiContentProviderMode,
    "none",
  );
  assert.equal(
    contract.activeO4VGate.dataBoundary
      .rawContentInLogsAnalyticsTelemetryApmExceptionsQueuesOrCiAllowed,
    false,
  );
  assert.equal(
    contract.activeO4VGate.objectStorage
      .automaticObjectVersionRollbackGuaranteed,
    false,
  );
  assert.equal(
    contract.activeO4VGate.objectStorage.recoveryMode,
    "owner_retained_original_reupload",
  );
  assert.equal(
    contract.activeO4VGate.dedicatedKeyAndVerifierGate
      .customerManagedOrDedicatedKmsHsmRequiredForCurrentOwnerPilot,
    false,
  );
  assert.equal(
    contract.activeO4VGate.legacyQualificationApplicability
      .syntheticReceiptContractAppliesToActiveLeanGate,
    false,
  );
  assert.equal(
    contract.activeO4VGate.legacyQualificationApplicability
      .providerBoundaryContractAppliesToActiveLeanGate,
    false,
  );
  assert.equal(
    contract.activeO4VGate.legacyQualificationApplicability
      .mayBlockLeanS236P,
    false,
  );
  assert.equal(
    contract.activeO4VGate.authorization
      .s236pSyntheticProvisioningAndAcceptanceAuthorized,
    true,
  );
  assert.equal(
    contract.activeO4VGate.authorization.automaticS236PStartAllowed,
    false,
  );
  assert.equal(contract.activeO4VGate.authorization.s236pStarted, false);
  assert.deepEqual(contract.approvalSeparation.S236ARequires, [
    "valid_unexpired_O3A",
    "completed_exact_S236P",
  ]);
  assert.equal(
    contract.integrityAndCommitments.plaintextSha256.allowedScope,
    "vault_local_integrity_only",
  );
  assert.equal(
    contract.integrityAndCommitments.plaintextSha256.allowedOutsideVault,
    false,
  );
  assert.equal(
    contract.integrityAndCommitments.privateDedup.commitmentReturnedToClientOrReceipt,
    false,
  );
  assert.equal(
    contract.integrityAndCommitments.privateDedup.lookupOrEqualityOracleApiAllowed,
    false,
  );
  assert.equal(contract.revisionModel.originalImmutable, true);
  assert.equal(contract.revisionModel.editableRevisionsAppendOnly, true);
  assert.equal(contract.accessControl.ownerAToBDenialRequired, true);
  assert.equal(contract.accessControl.ownerBToADenialRequired, true);
  assert.equal(
    contract.accessControl.leastPrivilegeAccess
      .revocationClaimWithoutProviderEvidenceAllowed,
    false,
  );
  assert.equal(
    contract.accessControl.leastPrivilegeAccess
      .signedAccessLoggingRedactionAndRetentionBindingRequired,
    true,
  );
  for (const binding of [
    "access_mode",
    "session_or_capability_ttl_seconds",
    "method_object_version_audience_content_type_and_content_length_scope",
    "replay_prevention_and_single_use_behavior",
    "provider_revocation_expiry_and_deletion_propagation",
    "signed_access_logging_redaction_and_retention_policy",
  ]) {
    assert.ok(contract.providerBoundary.requiredBindings.includes(binding));
  }
  assert.equal(
    contract.accessControl.leastPrivilegeAccess
      .contentTypeScopeRequiredForWrite,
    true,
  );
  assert.equal(contract.providerBoundary.rawBodyInProviderLogsAllowed, false);
  assert.equal(
    contract.providerBoundary.rawBodyInAnalyticsApmCostOrExceptionLogsAllowed,
    false,
  );
  assert.equal(contract.syntheticReceiptContract.syntheticOnly, true);
  assert.equal(contract.syntheticReceiptContract.realContentAllowed, false);
  assert.deepEqual(
    contract.syntheticReceiptContract.requiredReceiptIds,
    REQUIRED_RECEIPT_IDS,
  );
  assert.deepEqual(
    contract.syntheticReceiptContract.requiredFieldsExactly,
    REQUIRED_RECEIPT_FIELDS,
  );
  assert.deepEqual(
    Object.keys(contract.syntheticReceiptContract.allowedFieldSchemas),
    REQUIRED_RECEIPT_FIELDS,
  );
  assert.ok(
    contract.syntheticReceiptContract.requiredFieldsExactly.includes(
      "o4v_approved_binding_digest_sha256",
    ),
  );
  assert.equal(
    contract.syntheticReceiptContract.allRequiredReceiptAssertionsMustPass,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.failedOrBlockedMayCompleteS236P,
    false,
  );
  assert.equal(
    contract.syntheticReceiptContract
      .receiptO4VProposalDigestMustMatchApprovedDecision,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract
      .receiptProviderBindingDigestMustMatchApprovedO4V,
    true,
  );
  assert.equal(
    canonicalSha256(
      contract.syntheticReceiptContract.requiredReceiptOperationRules,
    ),
    contract.syntheticReceiptContract.receiptAssertionPolicyDigestContract
      .digestSha256,
  );
  assert.equal(
    contract.syntheticReceiptContract.receiptSetAcceptanceRules
      .assertionEvidenceDigestCoversOneClosedResultPerRequiredAssertion,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.receiptSetAcceptanceRules
      .assertionEvidenceDigestMayBeDerivedFromRawOrBodyBytes,
    false,
  );
  assert.equal(
    contract.syntheticReceiptContract.receiptSetDigestContract
      .exactReceiptCount,
    REQUIRED_RECEIPT_IDS.length,
  );
  assert.deepEqual(
    contract.syntheticReceiptContract.receiptSetDigestContract
      .normalizedToNullFields,
    [
      "receipt_set_digest_sha256",
      "independent_verifier_attestation_digest_sha256",
    ],
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .artifactAdditionalFieldsAllowed,
    false,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .signedPayloadAdditionalFieldsAllowed,
    false,
  );
  assert.deepEqual(
    Object.keys(
      contract.syntheticReceiptContract.independentSignedAttestationContract
        .artifactFieldSchemas,
    ),
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .artifactFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(
      contract.syntheticReceiptContract.independentSignedAttestationContract
        .signedPayloadFieldSchemas,
    ),
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .signedPayloadFieldsExactly,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules.dsseSignatureCryptographicallyVerifiedAgainstExactEnvelope,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules.verifierAndPrimaryAttestorMustDifferByClassAndOpaqueIdentity,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules
      .verificationKeyAndTrustRootMustMatchExactO4VProviderBinding,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules.signatureVerifiedMustBeTrue,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules.revokedMustBeFalse,
    true,
  );
  for (const signedField of [
    "verifier_class",
    "verifier_version",
    "opaque_verifier_id",
    "verification_key_id",
    "verification_key_version",
    "trust_root_id",
    "trust_root_version",
    "signature_algorithm",
    "issued_at",
    "expires_at",
    "revocation_policy_version",
    "revocation_checked_at",
    "revocation_evidence_digest_sha256",
    "revoked",
  ]) {
    assert.ok(
      contract.syntheticReceiptContract.independentSignedAttestationContract
        .signedPayloadFieldsExactly.includes(signedField),
      `S236P signed payload must bind ${signedField}`,
    );
  }
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules
      .acceptanceMustRecomputeSignatureTrustPathExpiryAndRevocationWithoutTrustingOuterBooleans,
    true,
  );
  assert.ok(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .signedPayloadFieldsExactly.includes(
        "o4v_approved_binding_digest_sha256",
      ),
  );
  assert.equal(
    contract.syntheticReceiptContract.independentSignedAttestationContract
      .verificationRules
      .signedPayloadO4vApprovedBindingDigestMustMatchCurrentImmutableApprovedPacket,
    true,
  );
  const assertionEvidenceContract =
    contract.syntheticReceiptContract.assertionEvidenceDigestContract;
  assert.deepEqual(
    assertionEvidenceContract.artifactFieldsExactly,
    Object.keys(assertionEvidenceContract.artifactFieldSchemas),
  );
  assert.ok(
    assertionEvidenceContract.artifactFieldsExactly.includes(
      "o4v_approved_binding_digest_sha256",
    ),
  );
  const assertionEvidenceSet =
    contract.syntheticReceiptContract.assertionEvidenceSetDigestContract;
  assert.deepEqual(
    assertionEvidenceSet.entryFieldsExactly,
    Object.keys(assertionEvidenceSet.sourceReceiptFieldMapping),
  );
  assert.ok(
    assertionEvidenceSet.entryFieldsExactly.includes(
      "o4v_approved_binding_digest_sha256",
    ),
  );
  const completedS236P =
    contract.syntheticReceiptContract.completedS236PAcceptanceContract;
  assert.deepEqual(
    completedS236P.artifactFieldsExactly,
    Object.keys(completedS236P.artifactFieldSchemas),
  );
  assert.ok(
    completedS236P.artifactFieldsExactly.includes(
      "o4v_approved_binding_digest_sha256",
    ),
  );
  assert.equal(
    completedS236P.digestContract
      .allDownstreamS236aAndSchedulerUsesMustResolveExactArtifactByDigestAndRecomputeCanonicalDigest,
    true,
  );
  assert.equal(
    contract.syntheticReceiptContract.receiptSetAcceptanceRules
      .closedIndependentSignedAttestationRequired,
    true,
  );
  assert.deepEqual(
    contract.syntheticReceiptContract.requiredReceiptOperationRules
      .backup_expiry_pending_distinct_from_delete_complete.allowedCleanupStates,
    ["backup_expiry_pending"],
  );
  assert.ok(
    contract.syntheticReceiptContract.requiredReceiptOperationRules
      .owner_a_to_b_and_b_to_a_uniform_denial.requiredAssertions.includes(
        "owner_b_to_a_read_and_write_denied",
      ),
  );
  assert.equal(contract.syntheticReceiptContract.additionalFieldsAllowed, false);
  assert.equal(contract.syntheticReceiptContract.freeTextAllowed, false);
  assert.ok(
    contract.syntheticReceiptContract.forbiddenExternalFields.includes(
      "plaintext_sha256",
    ),
  );
  assert.equal(contract.o4vDecisionPacket.ownerApproved, false);
  assert.equal(contract.o4vDecisionPacket.status, "superseded_rejected");
  assert.equal(
    contract.activeO4VGate.legacyPacket.providerBindingFieldCount,
    88,
  );
  assert.equal(
    contract.activeO4VGate.legacyPacket.providerBindingMaterialized,
    false,
  );
  assert.equal(
    contract.o4vDecisionPacket.approvalRecord.decision,
    "pending",
  );
  assert.equal(
    contract.o4vDecisionPacket.candidateArchitecture.bindingComplete,
    false,
  );
  assert.equal(
    contract.o4vDecisionPacket.approvalBinding.proposalDigestSha256,
    null,
  );
  assert.equal(
    proposalSha256(contract.o4vDecisionPacket),
    contract.o4vPacketDigestContract.pendingProposalDigestSha256,
  );
  assert.equal(
    contract.o4vPacketDigestContract.pendingProposalDigestSha256,
    O4V_PROPOSAL_SHA256,
  );
  assert.deepEqual(
    contract.o4vPacketDigestContract.packetFieldsExactly,
    Object.keys(contract.o4vDecisionPacket),
  );
  assert.deepEqual(
    contract.o4vPacketDigestContract.packetFieldsExactly,
    Object.keys(contract.o4vPacketDigestContract.packetFieldSchemas),
  );
  assert.deepEqual(
    contract.o4vPacketDigestContract.ownerDecisionBindingContract.fieldsExactly,
    Object.keys(
      contract.o4vPacketDigestContract.ownerDecisionBindingContract
        .fieldSchemas,
    ),
  );
  assert.deepEqual(
    contract.o4vPacketDigestContract.approvalRecordContract.fieldsExactly,
    Object.keys(
      contract.o4vPacketDigestContract.approvalRecordContract.fieldSchemas,
    ),
  );
  assert.deepEqual(
    contract.o4vPacketDigestContract.ownerDecisionReceiptContract
      .artifactFieldsExactly,
    Object.keys(
      contract.o4vPacketDigestContract.ownerDecisionReceiptContract
        .artifactFieldSchemas,
    ),
  );
  assert.equal(
    contract.o4vPacketDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .receiptDecisionProposalDigestDecidedAtReferenceAndDigestMustExactlyMatchApprovalRecord,
    true,
  );
  assert.equal(
    contract.o4vPacketDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .receiptMustBeReResolvedAndRevalidatedBeforeProvisioningEverySyntheticReceiptS236pAcceptanceAndS236aStart,
    true,
  );
  assert.equal(
    contract.o4vPacketDigestContract.approvedBindingDigestContract
      .finalDigestIsNotAStandaloneBearerAuthorization,
    true,
  );
  assert.equal(
    canonicalSha256(contract.o4vDecisionPacket.providerBinding),
    contract.providerBindingDigestContract.pendingTemplateDigestSha256,
  );
  assert.equal(
    contract.providerBindingDigestContract.pendingTemplateDigestSha256,
    O4V_PROVIDER_BINDING_SHA256,
  );
  assert.deepEqual(
    contract.o4vDecisionPacket.providerBindingFieldsExactly,
    Object.keys(contract.o4vDecisionPacket.providerBinding),
  );
  assert.ok(
    Object.values(contract.o4vDecisionPacket.providerBinding).every(
      (value) => value === null,
    ),
  );
  assert.equal(
    contract.o4vPacketDigestContract.approvalStateInvariant
      .approvedRecordRequiresAllExactBindingsComplete,
    true,
  );
  assert.equal(
    contract.o4vPacketDigestContract.approvalStateInvariant
      .supersededRejectedStatusRequiresOwnerApprovedFalsePendingApprovalRecordAndDatedOwnerDecision,
    true,
  );
  assert.equal(
    contract.providerBindingDigestContract
      .allFieldsMustBeNonNullBeforeBindingComplete,
    true,
  );
  assert.equal(
    contract.o4vDecisionPacket.providerBindingValueRules
      .providerRawBodyLogRetentionSecondsExact,
    0,
  );
  assert.equal(
    contract.o4vDecisionPacket.providerBindingValueRules
      .commitmentCanonicalizationDomainAndMigrationVersionsRequired,
    true,
  );
  assert.equal(
    contract.providerBoundary
      .rawBodyProviderTrainingResearchOrSecondaryUseAllowed,
    false,
  );
  assert.equal(
    contract.integrityAndCommitments.providerContentValidators
      .unkeyedEtagMd5ChecksumOrDedupValueAllowedOutsideVault,
    false,
  );
  assert.equal(
    contract.encryptionBoundary
      .storageEncryptionKeyDistinctFromCommitmentKeyRequired,
    true,
  );
  assert.equal(contract.o4vDecisionPacket.automaticProvisioningAllowed, false);
  assert.equal(contract.o4vDecisionPacket.automaticS236PStartAllowed, false);
  assert.equal(contract.o4vDecisionPacket.automaticS236AStartAllowed, false);
  assert.equal(canonicalSha256(contract), PRIVATE_CONTRACT_SHA256);

  const unknownField = clone(contract);
  unknownField.syntheticReceiptContract.unreviewed = true;
  assert.notEqual(canonicalSha256(unknownField), PRIVATE_CONTRACT_SHA256);
  const unsafeLoggingFlip = clone(contract);
  unsafeLoggingFlip.providerBoundary.rawBodyInProviderLogsAllowed = true;
  assert.notEqual(canonicalSha256(unsafeLoggingFlip), PRIVATE_CONTRACT_SHA256);
  const failedReceiptMayPass = clone(contract);
  failedReceiptMayPass.syntheticReceiptContract
    .failedOrBlockedMayCompleteS236P = true;
  assert.notEqual(canonicalSha256(failedReceiptMayPass), PRIVATE_CONTRACT_SHA256);
  const proposalScopeChanged = clone(contract.o4vDecisionPacket);
  proposalScopeChanged.requestedScope = "broader_scope";
  assert.notEqual(
    proposalSha256(proposalScopeChanged),
    contract.o4vPacketDigestContract.pendingProposalDigestSha256,
  );
  const proposalOwnerScopeChanged = clone(contract.o4vDecisionPacket);
  proposalOwnerScopeChanged.ownerDecisionBinding
    .authenticatedOwnerPrivateScopeDigestSha256 = "a".repeat(64);
  assert.notEqual(
    proposalSha256(proposalOwnerScopeChanged),
    contract.o4vPacketDigestContract.pendingProposalDigestSha256,
  );
  const proposalOwnerActorChanged = clone(contract.o4vDecisionPacket);
  proposalOwnerActorChanged.ownerDecisionBinding.opaqueOwnerDecisionActorId =
    `oaa_${"a".repeat(16)}`;
  assert.notEqual(
    proposalSha256(proposalOwnerActorChanged),
    contract.o4vPacketDigestContract.pendingProposalDigestSha256,
  );
});

test("native acceptance is independent from the optional optimizer branch", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );

  assert.equal(
    scheduler.contractVersion,
    "dabangil.full_day_scheduler.v1",
  );
  assert.equal(scheduler.runtimeAuthorized, false);
  assert.equal(scheduler.dependencyInstallationAuthorized, false);
  assert.equal(scheduler.nativePath.authoritative, true);
  assert.equal(scheduler.nativePath.optimizerRequired, false);
  assert.deepEqual(scheduler.nativePath.roadmap, [
    "S237P",
    "O4A",
    "S238A",
    "S240A",
    "S241A",
  ]);
  assert.equal(scheduler.optimizerPath.optional, true);
  assert.equal(scheduler.optimizerPath.mayBlockS241A, false);
  assert.equal(scheduler.optimizerPath.packageInstalled, false);
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .benchmarkExecutionAuthorizedByThisAmendment,
    false,
  );
  assert.deepEqual(
    scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldsExactly,
    Object.keys(scheduler.s237oBenchmarkAcceptanceContract.evidence),
  );
  assert.ok(
    Object.values(scheduler.s237oBenchmarkAcceptanceContract.evidence).every(
      (value) => value === null,
    ),
  );
  assert.equal(
    canonicalSha256(scheduler.s237oBenchmarkAcceptanceContract.evidence),
    scheduler.s237oBenchmarkAcceptanceContract.evidenceDigestContract
      .pendingTemplateDigestSha256,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.evidenceDigestContract
      .pendingTemplateDigestSha256,
    S237O_EVIDENCE_TEMPLATE_SHA256,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.receiptSetRules
      .allRequiredReceiptIdsExactlyOnce,
    true,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.receiptSetRules
      .failedOrBlockedMayCompleteS237O,
    false,
  );
  assert.deepEqual(
    Object.keys(
      scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptOperationRules,
    ),
    scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptIds,
  );
  assert.equal(
    canonicalSha256(
      scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptOperationRules,
    ),
    scheduler.s237oBenchmarkAcceptanceContract
      .receiptAssertionPolicyDigestContract.digestSha256,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .receiptAssertionPolicyDigestContract.digestSha256,
    RECEIPT_ASSERTION_POLICY_SHA256,
  );
  const deterministicReplay =
    scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptOperationRules
      .deterministic_config_and_replay;
  assert.equal(deterministicReplay.coldReplayCountExact, 3);
  assert.equal(deterministicReplay.warmReplayCountExact, 3);
  assert.equal(deterministicReplay.solverWorkersExact, 1);
  assert.deepEqual(
    deterministicReplay.excludedFromReplayEqualityFieldsExactly,
    ["elapsed_ms"],
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.receiptSetRules
      .assertionCountMustEqualOperationRuleRequiredAssertionsLength,
    true,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.acceptanceRules
      .allSixReplayResultsMustBeByteIdenticalExceptElapsedMs,
    true,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldSchemas
      .solver_workers,
    "finite_integer_exact_1",
  );
  assert.deepEqual(
    scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldSchemas
      .license_identifier,
    {
      type: "spdx_identifier",
      pattern: "^[A-Za-z0-9.+-]{1,80}$",
      nullAllowed: false,
    },
  );
  const materializedLicenseIdentifierSchema =
    scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldSchemas
      .license_identifier;
  const materializedLicenseIdentifierPattern = new RegExp(
    materializedLicenseIdentifierSchema.pattern,
  );
  assert.equal(materializedLicenseIdentifierPattern.test("Apache-2.0"), true);
  for (const malformed of [
    "",
    "Apache 2.0",
    "Apache/2.0",
    "arbitrary license text",
    "a".repeat(81),
  ]) {
    assert.equal(materializedLicenseIdentifierPattern.test(malformed), false);
  }
  assert.equal(materializedLicenseIdentifierSchema.nullAllowed, false);
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .s237oAuthorizationDigestContract
      .evidenceReceiptsAndSignedAttestationMustMatchApprovedPacketDigest,
    true,
  );
  const authorizationDigestContract =
    scheduler.s237oBenchmarkAcceptanceContract
      .s237oAuthorizationDigestContract;
  const authorizationPacket =
    scheduler.s237oBenchmarkAcceptanceContract.s237oAuthorizationPacket;
  assert.deepEqual(
    scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldSchemas
      .license_identifier.pattern,
    authorizationDigestContract.packetFieldSchemas.license_identifier.pattern,
  );
  assert.ok(
    authorizationDigestContract
      .overlappingPacketEvidenceReceiptAndAttestationFieldsMustMatchExactly
      .includes("license_identifier"),
  );
  assert.ok(
    scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptOperationRules
      .exact_dependency_license_and_sbom.requiredAssertions.includes(
        "license_identifier_and_license_text_digest_match_authorized_source",
      ),
  );
  assert.deepEqual(
    Object.keys(authorizationDigestContract.packetFieldSchemas),
    authorizationDigestContract.packetFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(authorizationPacket),
    authorizationDigestContract.packetFieldsExactly,
  );
  assert.ok(
    authorizationDigestContract.packetFieldsExactly.includes(
      "authenticated_owner_private_scope_digest_sha256",
    ),
  );
  assert.ok(
    authorizationDigestContract.packetFieldsExactly.includes(
      "opaque_owner_decision_actor_id",
    ),
  );
  assert.equal(
    s237oProposalSha256(authorizationPacket),
    authorizationDigestContract.proposalDigestContract
      .pendingTemplateProposalDigestSha256,
  );
  assert.equal(
    authorizationDigestContract.proposalDigestContract
      .pendingTemplateProposalDigestSha256,
    S237O_PROPOSAL_SHA256,
  );
  assert.ok(
    !authorizationDigestContract.packetFieldsExactly.includes(
      "owner_decision_receipt_digest_sha256",
    ),
  );
  assert.deepEqual(
    Object.keys(
      authorizationDigestContract.ownerDecisionReceiptContract
        .artifactFieldSchemas,
    ),
    authorizationDigestContract.ownerDecisionReceiptContract
      .artifactFieldsExactly,
  );
  assert.deepEqual(
    authorizationDigestContract.approvalRecordContract.fieldsExactly,
    Object.keys(
      authorizationDigestContract.approvalRecordContract.fieldSchemas,
    ),
  );
  assert.equal(
    authorizationDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .proposalDigestMustBeRecomputedFromExactPacketWithNormalizedApprovalState,
    true,
  );
  assert.equal(
    authorizationDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .approvalRecordDecisionProposalDigestDecidedAtReceiptRefAndReceiptDigestMustExactlyMatchResolvedReceipt,
    true,
  );
  assert.equal(
    authorizationDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .authenticatedOwnerPrivateScopeDigestAndOpaqueOwnerActorIdMustMatchExactPacketOwnerDecisionBindings,
    true,
  );
  assert.equal(
    authorizationDigestContract
      .exactOpaqueOwnerDecisionActorIdentityAllowedInBenchmarkEvidenceReceiptsResultArtifactsOptimizerProjectionLogsCachesErrorsOrTelemetry,
    false,
  );
  assert.equal(
    authorizationDigestContract
      .ownerDecisionReceiptMustNotBindFinalAuthorizationDigest,
    true,
  );
  assert.equal(
    authorizationDigestContract
      .ownerDecisionReceiptMustBeReResolvedAndCryptographicallyRevalidatedAtBenchmarkStartAndAcceptance,
    true,
  );
  assert.equal(
    authorizationDigestContract.packetExpiryMayNotExceedOwnerDecisionReceiptExpiry,
    true,
  );
  assert.equal(
    authorizationDigestContract.materializationRules
      .materializedPacketMayNotBeCommittedIntoTheExactHeadOrTreeItBinds,
    true,
  );
  for (const storeField of [
    "opaque_authorization_store_ref",
    "opaque_attestation_store_ref",
    "opaque_revocation_evidence_store_ref",
    "opaque_owner_decision_store_ref",
  ]) {
    assert.ok(
      authorizationDigestContract.packetFieldsExactly.includes(storeField),
      `S237O authorization must bind ${storeField}`,
    );
  }
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract.receiptSetDigestContract
      .exactReceiptCount,
    scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptIds.length,
  );
  const provenanceSetDigestContract =
    scheduler.s237oBenchmarkAcceptanceContract
      .primaryAttestationProvenanceSetDigestContract;
  const assertionSetDigestContract =
    scheduler.s237oBenchmarkAcceptanceContract
      .assertionEvidenceSetDigestContract;
  assert.equal(provenanceSetDigestContract.exactEntryCount, 6);
  assert.equal(assertionSetDigestContract.exactEntryCount, 6);
  assert.deepEqual(
    Object.keys(provenanceSetDigestContract.sourceReceiptFieldMapping),
    provenanceSetDigestContract.entryFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(assertionSetDigestContract.sourceReceiptFieldMapping),
    assertionSetDigestContract.entryFieldsExactly,
  );
  const benchmarkResultDigestContract =
    scheduler.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract;
  assert.deepEqual(
    Object.keys(benchmarkResultDigestContract.artifactFieldSchemas),
    benchmarkResultDigestContract.artifactFieldsExactly,
  );
  const resultMembers =
    benchmarkResultDigestContract.resolvedArtifactMembersContract;
  assert.deepEqual(resultMembers.bundleFieldsExactly, [
    "benchmark_result_artifact",
    "deterministic_replay_input_artifact",
    "deterministic_replay_config_artifact",
    "deterministic_replay_result_set",
    "failure_status_fixture_result_set",
    "rollback_result_artifact",
    "metadata_boundary_result_artifact",
  ]);
  assert.deepEqual(
    resultMembers.bundleFieldsExactly,
    Object.keys(resultMembers.memberDigestFieldMapping),
  );
  assert.deepEqual(
    resultMembers.bundleFieldsExactly,
    Object.keys(resultMembers.memberSchemaContracts),
  );
  assert.deepEqual(
    resultMembers.deterministicReplayConfigArtifactContract.fieldsExactly,
    Object.keys(
      resultMembers.deterministicReplayConfigArtifactContract.fieldSchemas,
    ),
  );
  assert.deepEqual(
    resultMembers.deterministicReplayConfigArtifactContract.fieldsExactly,
    Object.keys(
      resultMembers.deterministicReplayConfigArtifactContract
        .sourceApprovedPacketFieldMapping,
    ),
  );
  assert.deepEqual(
    resultMembers.closedOperationAssertionResultArtifactContract.fieldsExactly,
    Object.keys(
      resultMembers.closedOperationAssertionResultArtifactContract
        .fieldSchemas,
    ),
  );
  assert.equal(
    resultMembers.verificationRules
      .arbitraryUnresolvedOpaqueChildDigestMaySatisfyAcceptance,
    false,
  );
  assert.equal(
    resultMembers.verificationRules
      .canonicalNativeFallbackSetDigestMustBeRecomputedFromExactFailureSetProjection,
    true,
  );
  assert.deepEqual(
    Object.keys(
      benchmarkResultDigestContract.deterministicReplayResultSetDigestContract
        .entryFieldSchemas,
    ),
    benchmarkResultDigestContract.deterministicReplayResultSetDigestContract
      .entryFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(
      benchmarkResultDigestContract.failureStatusFixtureResultSetDigestContract
        .entryFieldSchemas,
    ),
    benchmarkResultDigestContract.failureStatusFixtureResultSetDigestContract
      .entryFieldsExactly,
  );
  assert.equal(
    benchmarkResultDigestContract.deterministicReplayResultSetDigestContract
      .exactEntryCount,
    6,
  );
  for (const evidenceBinding of [
    "opaque_benchmark_result_artifact_ref",
    "benchmark_result_digest_sha256",
    "primary_attestation_provenance_set_digest_sha256",
    "assertion_evidence_set_digest_sha256",
  ]) {
    assert.ok(
      scheduler.s237oBenchmarkAcceptanceContract.evidenceFieldsExactly.includes(
        evidenceBinding,
      ),
      `S237O evidence must bind ${evidenceBinding}`,
    );
  }
  assert.deepEqual(
    scheduler.s237oBenchmarkAcceptanceContract.receiptSetDigestContract
      .normalizedToNullFields,
    [
      "benchmark_receipt_set_digest_sha256",
      "independent_verifier_attestation_digest_sha256",
    ],
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentAttestationEvidencePreimageDigestContract
      .normalizedToNullFields[0],
    "independent_benchmark_attestation_digest_sha256",
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.verificationRules
      .dsseSignatureCryptographicallyVerifiedAgainstExactEnvelope,
    true,
  );
  assert.deepEqual(
    Object.keys(
      scheduler.s237oBenchmarkAcceptanceContract
        .independentSignedAttestationContract.artifactFieldSchemas,
    ),
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.artifactFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(
      scheduler.s237oBenchmarkAcceptanceContract
        .independentSignedAttestationContract.signedPayloadFieldSchemas,
    ),
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.signedPayloadFieldsExactly,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.verificationRules
      .verifierAndPrimaryAttestorMustDifferByClassAndOpaqueIdentity,
    true,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.verificationRules
      .signatureVerifiedMustBeTrue,
    true,
  );
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.verificationRules.revokedMustBeFalse,
    true,
  );
  for (const signedField of [
    "s237o_authorization_digest_sha256",
    "receipt_assertion_policy_digest_sha256",
    "verifier_class",
    "verifier_version",
    "opaque_verifier_id",
    "verification_key_id",
    "verification_key_version",
    "trust_root_id",
    "trust_root_version",
    "signature_algorithm",
    "issued_at",
    "expires_at",
    "revocation_policy_version",
    "revocation_checked_at",
    "revocation_evidence_digest_sha256",
    "revoked",
    "opaque_benchmark_result_artifact_ref",
    "benchmark_result_digest_sha256",
    "primary_attestation_provenance_set_digest_sha256",
    "assertion_evidence_set_digest_sha256",
  ]) {
    assert.ok(
      scheduler.s237oBenchmarkAcceptanceContract
        .independentSignedAttestationContract.signedPayloadFieldsExactly.includes(
          signedField,
        ),
      `S237O signed payload must bind ${signedField}`,
    );
  }
  assert.equal(
    scheduler.s237oBenchmarkAcceptanceContract
      .independentSignedAttestationContract.verificationRules
      .acceptanceMustRecomputeSignatureTrustPathExpiryAndRevocationWithoutTrustingOuterBooleans,
    true,
  );
  assert.deepEqual(scheduler.optimizerPath.roadmap, [
    "S237O",
    "O4T",
    "O2O",
    "S238OH",
    "S238OV",
    "O4P",
    "S239O",
    "S240O",
  ]);
  assert.equal(
    scheduler.measurementAndActivationBoundary
      .preO2OPersistedOwnerPrivateMeasurementWriteAllowed,
    false,
  );
  assert.equal(
    scheduler.measurementAndActivationBoundary
      .persistedOwnerPrivateMeasurementWriteAllowedAfterO2O,
    true,
  );
  assert.equal(
    scheduler.measurementAndActivationBoundary.sharedSignalWriteAllowed,
    false,
  );
  assert.equal(
    scheduler.measurementAndActivationBoundary.telemetryWriteAllowed,
    false,
  );
  assert.equal(
    scheduler.measurementAndActivationBoundary
      .exactGenericO2RequiredBeforeAnySharedSignalTelemetryExternalLearnerOrAcademyWrite,
    true,
  );
  assert.equal(
    scheduler.measurementAndActivationBoundary
      .o4pRequiresCompletedNativeS240A,
    true,
  );
  assert.equal(scheduler.inputContract.metadataOnly, true);
  assert.equal(scheduler.inputContract.additionalFieldsAllowed, false);
  assert.equal(scheduler.inputContract.nestedAdditionalFieldsAllowed, false);
  assert.equal(
    scheduler.inputContract.boundaryRole,
    "trusted_native_gateway_pre_solver_input_only",
  );
  assert.equal(
    scheduler.inputContract.userAccountOrCrossPlaneStableIdentityAllowed,
    false,
  );
  assert.equal(
    scheduler.inputContract.opaqueOwnerPrivateReferencesAllowedAtTrustedGatewayOnly,
    true,
  );
  assert.equal(scheduler.inputContract.optimizerStableOrLinkableIdentityAllowed, false);
  assert.equal(scheduler.inputContract.optimizerMayReceiveThisUnprojectedObject, false);
  assert.deepEqual(
    scheduler.inputContract.optimizerInvocationProjectionContract.fieldsExactly,
    [
      "ephemeral_request_id",
      "ephemeral_input_snapshot_version",
      "available_windows",
      "fixed_blocks",
      "candidates",
      "replan_cutoff_minute_kst_or_null",
      "immutable_prior_placements",
      "future_prior_placement_preferences",
    ],
  );
  const projection =
    scheduler.inputContract.optimizerInvocationProjectionContract;
  assert.deepEqual(
    projection.fieldsExactly,
    Object.keys(projection.fieldSchemas),
  );
  assert.deepEqual(
    projection.fieldsExactly,
    Object.keys(projection.sourceFieldMapping),
  );
  assert.deepEqual(
    projection.availableWindowFieldsExactly,
    Object.keys(projection.availableWindowFieldSchemas),
  );
  assert.deepEqual(
    projection.fixedBlockFieldsExactly,
    Object.keys(projection.fixedBlockFieldSchemas),
  );
  assert.deepEqual(
    projection.candidateFieldsExactly,
    Object.keys(projection.candidateFieldSchemas),
  );
  assert.deepEqual(
    projection.immutablePriorPlacementFieldsExactly,
    Object.keys(projection.immutablePriorPlacementFieldSchemas),
  );
  assert.deepEqual(
    projection.futurePriorPlacementPreferenceFieldsExactly,
    Object.keys(projection.futurePriorPlacementPreferenceFieldSchemas),
  );
  assert.equal(
    projection.identifierRemapContract.oneInvocationBijectionRequiredPerIdentifierClass,
    true,
  );
  assert.equal(
    projection.identifierRemapContract
      .allPriorPlacementCandidateAndWindowIdsMustResolveThroughExactBijections,
    true,
  );
  assert.equal(
    projection.identifierRemapContract
      .unknownDanglingDuplicateOrCrossClassMappingAllowed,
    false,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .candidateOrWindowAbsentFromCurrentInputMayReachOptimizerProjection,
    false,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .candidateOrWindowAbsentFromCurrentInputResult,
    "blocked_manual_plan_required",
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .removalChurnMeasuredOnlyForPriorPlacementsWhoseCandidateAndWindowResolveThroughExactCurrentInputBijections,
    true,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .absentPriorPlacementMayCreateCurrentCandidateOrWindow,
    false,
  );
  assert.equal(
    Object.hasOwn(
      scheduler.inputContract.priorAcceptedScheduleRules,
      "candidateOrWindowAbsentFromCurrentInputAllowedOnlyToMeasureRemovalChurn",
    ),
    false,
  );
  assert.equal(
    projection.projectionRules.projectionFailureResult,
    "blocked_manual_plan_required",
  );
  assert.equal(
    projection.identifierRemapContract
      .projectedIdentifierMayBeReusedAcrossIndependentOptimizerInvocations,
    false,
  );
  assert.equal(
    projection.identifierRemapContract.benchmarkReplaySessionContract
      .sameCanonicalProjectedInputBytesAndIdentifierBijectionMustBeReusedForAllSixReplayProcesses,
    true,
  );
  assert.equal(
    projection.projectionRules
      .replanCutoffMustBeNullIffVerifiedGenesisNoScheduleDecisionOtherwiseEqualSignedServerCutoff,
    true,
  );
  for (const forbiddenGatewayField of [
    "opaque_owner_schedule_scope_ref",
    "opaque_acceptance_lineage_ref",
    "native_validator_acceptance_receipt_digest_sha256",
    "owner_acceptance_receipt_digest_sha256",
    "acceptance_provenance_bundle_digest_sha256",
    "o4a_approved_runtime_authorization_digest_sha256",
  ]) {
    assert.ok(
      scheduler.inputContract.optimizerInvocationProjectionContract
        .forbiddenGatewayFieldsExactly.includes(forbiddenGatewayField),
      `optimizer projection must strip ${forbiddenGatewayField}`,
    );
  }
  assert.equal(
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules.ephemeralIdsMustBeFreshlyRemappedPerOptimizerInvocation,
    true,
  );
  assert.equal(
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules
      .optimizerMayResolveOrAccessAuthoritativeStoreReceiptBundleAuthorizationOrIdentityPlane,
    false,
  );
  assert.ok(
    scheduler.inputContract.allowedFieldsExactly.includes(
      "prior_accepted_schedule_or_null",
    ),
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRequired,
    "when_authoritative_latest_non_superseded_accepted_schedule_exists",
  );
  assert.equal(
    scheduler.inputContract
      .priorAcceptedScheduleNullAllowedOnlyWithFreshSignedAuthoritativeNoScheduleLookup,
    true,
  );
  assert.equal(
    scheduler.inputContract
      .priorAcceptedScheduleMaySelectCoreOutcomesOrLearningTasks,
    false,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .rawBodyStableIdentityTitleLocationOrFreeTextAllowed,
    false,
  );
  for (const provenanceField of [
    "accepted_head_sha",
    "accepted_tree_sha",
    "accepted_schedule_digest_sha256",
    "opaque_authoritative_schedule_store_ref",
    "opaque_owner_schedule_scope_ref",
    "opaque_acceptance_lineage_ref",
    "acceptance_sequence",
    "previous_accepted_schedule_digest_sha256_or_null",
    "opaque_native_validator_acceptance_receipt_ref",
    "native_validator_acceptance_receipt_digest_sha256",
    "opaque_owner_acceptance_receipt_ref",
    "owner_acceptance_receipt_digest_sha256",
    "opaque_acceptance_provenance_bundle_ref",
    "acceptance_provenance_bundle_digest_sha256",
  ]) {
    assert.ok(
      scheduler.inputContract.priorAcceptedScheduleFieldsExactly.includes(
        provenanceField,
      ),
      `prior schedule must bind ${provenanceField}`,
    );
  }
  assert.deepEqual(
    Object.keys(scheduler.inputContract.serverScheduleContextFieldSchemas),
    scheduler.inputContract.serverScheduleContextFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(scheduler.inputContract.priorAcceptedScheduleFieldSchemas),
    scheduler.inputContract.priorAcceptedScheduleFieldsExactly,
  );
  assert.deepEqual(
    Object.keys(scheduler.inputContract.priorAcceptedPlacementFieldSchemas),
    scheduler.inputContract.priorAcceptedPlacementFieldsExactly,
  );
  assert.deepEqual(
    scheduler.inputContract.priorAcceptedPlacementFieldsExactly,
    [
      "ephemeral_opaque_candidate_id",
      "ephemeral_opaque_window_id",
      "start_minute_kst",
      "end_minute_kst",
      "duration_minutes",
    ],
  );
  assert.deepEqual(
    scheduler.inputContract.priorAcceptedScheduleDigestContract
      .placementFieldsExactly,
    scheduler.inputContract.priorAcceptedPlacementFieldsExactly,
  );
  assert.ok(
    !scheduler.inputContract.priorAcceptedScheduleDigestContract
      .placementFieldsExactly.includes("placement_state_enum"),
  );
  for (const postValidationAcceptanceField of [
    "accepted_at",
    "opaque_authoritative_schedule_store_ref",
    "opaque_owner_schedule_scope_ref",
    "opaque_acceptance_lineage_ref",
    "acceptance_sequence",
    "previous_accepted_schedule_digest_sha256_or_null",
  ]) {
    assert.ok(
      !scheduler.inputContract.priorAcceptedScheduleDigestContract
        .preimageFieldsExactly.includes(postValidationAcceptanceField),
      `pre-Owner schedule digest must exclude ${postValidationAcceptanceField}`,
    );
  }
  assert.deepEqual(
    Object.keys(
      scheduler.inputContract.priorAcceptedScheduleProvenanceContract
        .bundleFieldSchemas,
    ),
    scheduler.inputContract.priorAcceptedScheduleProvenanceContract
      .bundleFieldsExactly,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleProvenanceContract
      .verificationRules
      .bothReceiptSignaturesAndBundleSignatureMustBeCryptographicallyVerified,
    true,
  );
  const provenance =
    scheduler.inputContract.priorAcceptedScheduleProvenanceContract;
  assert.ok(
    scheduler.inputContract.serverScheduleContextFieldsExactly.includes(
      "opaque_authoritative_state_checkpoint_ref",
    ),
  );
  assert.ok(
    scheduler.inputContract.serverScheduleContextFieldsExactly.includes(
      "authoritative_state_checkpoint_digest_sha256",
    ),
  );
  const checkpoint = provenance.authoritativeStateCheckpointContract;
  assert.deepEqual(
    checkpoint.artifactFieldsExactly,
    Object.keys(checkpoint.artifactFieldSchemas),
  );
  assert.equal(
    checkpoint.verificationRules
      .checkpointStoreMustBeAppendOnlyRollbackResistantAndOutsideLatestPointerRollbackDomain,
    true,
  );
  assert.equal(
    checkpoint.verificationRules
      .genesisStateIffMutationGenesisGenerationAndHighWaterZeroAndLineageLatestPreviousAllNull,
    true,
  );
  assert.equal(
    checkpoint.verificationRules
      .historicalCheckpointMayNotBeReturnedAsLatestAfterAnyLaterCheckpointExists,
    true,
  );
  for (const receiptContract of [
    provenance.nativeValidatorAcceptanceReceiptContract,
    provenance.ownerAcceptanceReceiptContract,
    provenance.authoritativeLookupVerificationReceiptContract,
  ]) {
    assert.deepEqual(
      Object.keys(receiptContract.artifactFieldSchemas),
      receiptContract.artifactFieldsExactly,
    );
    assert.equal(receiptContract.artifactAdditionalFieldsAllowed, false);
    assert.equal(receiptContract.signedPayloadAdditionalFieldsAllowed, false);
  }
  assert.equal(
    provenance.nativeValidatorAcceptanceReceiptContract.verificationRules
      .o4aMustSeparatelyMatchExactApprovedOwnerRuntimeAuthorization,
    true,
  );
  assert.ok(
    provenance.nativeValidatorAcceptanceReceiptContract
      .signedPayloadFieldsExactly.includes("validated_at"),
  );
  assert.ok(
    !provenance.nativeValidatorAcceptanceReceiptContract
      .signedPayloadFieldsExactly.includes("accepted_at"),
  );
  assert.equal(
    provenance.ownerAcceptanceReceiptContract.verificationRules
      .nativeValidatorAndOwnerActorsKeysAndTrustRootsMustBeDistinct,
    true,
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .storeLookupMustProveNoHigherNonSupersededAcceptanceSequenceExists,
    true,
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .revocationCheckedAtMustNotBeAfterAtomicProjectionAndMustBeNoOlderThan300SecondsAtAtomicProjection,
    true,
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .requestNonceMustBeAtomicallyConsumedInTheSameTransactionAsScopeGenerationCheck,
    true,
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .atomicCompareMustMatchDecisionGenerationHighWaterMarkLineageLatestSequenceAndLatestDigestAsOneTuple,
    true,
  );
  assert.ok(
    provenance.authoritativeLookupVerificationReceiptContract
      .artifactFieldsExactly.includes(
        "authoritative_state_checkpoint_digest_sha256",
      ),
  );
  assert.ok(
    provenance.authoritativeLookupVerificationReceiptContract
      .signedPayloadFieldsExactly.includes(
        "authoritative_state_checkpoint_digest_sha256",
      ),
  );
  assert.ok(
    provenance.authoritativeLookupVerificationReceiptContract
      .atomicCompareFieldsExactly.includes(
        "authoritative_state_checkpoint_digest_sha256",
      ),
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .nonceConsumptionFullTupleCompareAndProjectionAuthorizationMustOccurInOneTransaction,
    true,
  );
  assert.equal(
    provenance.authoritativeLookupVerificationReceiptContract.verificationRules
      .positiveAcceptanceHighWaterMarkRequiresExactResolvableLatestAndForbidsNoScheduleDecision,
    true,
  );
  assert.equal(
    scheduler.inputContract.serverScheduleContextRules.cutoffFormula,
    "clamp_0_1440_of_ceiling_kst_minute_of_day_server_replan_requested_at_exact_minute_unchanged_any_nonzero_second_or_fraction_advances_one_minute",
  );
  assert.equal(
    scheduler.inputContract.serverScheduleContextRules
      .missingInvalidExpiredRevokedOrStaleReceiptResult,
    "blocked_manual_plan_required",
  );
  assert.equal(
    scheduler.inputContract.serverScheduleContextRules
      .allFieldsMustBeServerDerivedAndClientValuesMustBeIgnored,
    true,
  );
  assert.equal(
    scheduler.inputContract.serverScheduleContextRules
      .scopeGenerationMayNeverDecreaseWrapOrBeReused,
    true,
  );
  assert.equal(
    scheduler.inputContract.serverScheduleContextRules
      .noAcceptedScheduleRequiresAcceptanceHighWaterMarkExactlyZero,
    true,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .elapsedOrInProgressPlacementMayBeDroppedShortenedMovedOrDuplicated,
    false,
  );
  assert.ok(
    scheduler.hardConstraints.includes(
      "prior_accepted_elapsed_and_in_progress_blocks_immutable",
    ),
  );
  assert.equal(scheduler.inputContract.freeTextAllowed, false);
  assert.deepEqual(scheduler.inputContract.allowedFieldsExactly, [
    "request_id",
    "input_snapshot_version",
    "study_date_kst",
    "available_windows",
    "fixed_blocks",
    "candidates",
    "server_schedule_context",
    "prior_accepted_schedule_or_null",
  ]);
  assert.deepEqual(scheduler.inputContract.availableWindowFieldsExactly, [
    "ephemeral_opaque_window_id",
    "start_minute_kst",
    "end_minute_kst",
    "energy_band_enum",
    "available",
  ]);
  assert.deepEqual(scheduler.inputContract.fixedBlockFieldsExactly, [
    "ephemeral_opaque_fixed_block_id",
    "ephemeral_opaque_window_id",
    "start_minute_kst",
    "end_minute_kst",
    "block_type_enum",
    "pinned",
  ]);
  for (const forbidden of [
    "user_id",
    "account_id",
    "learning_document_id",
    "question_body",
    "answer_body",
    "ocr_body",
    "reference_answer_body",
    "law_body",
    "ai_body",
    "free_text_reason",
    "content_hash",
    "keyed_commitment",
  ]) {
    assert.ok(
      scheduler.inputContract.forbiddenFields.includes(forbidden),
      `missing optimizer input prohibition ${forbidden}`,
    );
  }
  assert.deepEqual(
    scheduler.fixtureMatrix.availableMinuteFixtures,
    [30, 60, 90, 180, 600, 720],
  );
  assert.equal(scheduler.resultContract.additionalFieldsAllowed, false);
  assert.equal(scheduler.resultContract.nestedAdditionalFieldsAllowed, false);
  assert.equal(
    new Set(scheduler.resultContract.fallbackReasonValues).size,
    scheduler.resultContract.fallbackReasonValues.length,
  );
  assert.equal(
    scheduler.resultContract.fallbackValueRules
      .usedFalseRequiresReasonNotUsedAndNativePlanVersionNull,
    true,
  );
  assert.deepEqual(
    Object.keys(scheduler.resultContract.versionInfoFieldSchemas),
    scheduler.resultContract.versionInfoFieldsExactly,
  );
  assert.equal(scheduler.resultContract.freeTextAllowed, false);
  assert.deepEqual(scheduler.resultContract.statuses, [
    "optimal",
    "feasible",
    "infeasible",
    "model_invalid",
    "unknown",
    "timeout",
    "dependency_unavailable",
    "adapter_error",
    "schema_mismatch",
    "stale_response",
    "validator_rejected",
    "fallback",
    "blocked_manual_plan_required",
  ]);
  assert.deepEqual(scheduler.resultContract.fallbackStatuses, [
    "infeasible",
    "model_invalid",
    "unknown",
    "timeout",
    "dependency_unavailable",
    "adapter_error",
    "schema_mismatch",
    "stale_response",
    "validator_rejected",
  ]);
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  for (const forbidden of [
    "calendar_title",
    "calendar_location",
    "private_locator",
    "question_body",
    "reference_answer_body",
  ]) {
    assert.ok(scheduler.resultContract.forbiddenFields.includes(forbidden));
  }
  assert.equal(scheduler.thresholdPolicy.versioned, true);
  assert.equal(scheduler.thresholdPolicy.retroactiveChangeAllowed, false);
  assert.equal(scheduler.thresholdPolicy.silentWeakeningAllowed, false);
  assert.equal(scheduler.o4tThresholdDecisionPacket.ownerApproved, false);
  assert.equal(
    scheduler.o4tThresholdDecisionPacket
      .approvableWithNullBindingOrThresholdValue,
    false,
  );
  assert.equal(
    scheduler.o4tThresholdDecisionPacket.thresholdRecordSetRules
      .missingOrDuplicateThresholdAllowed,
    false,
  );
  assert.equal(
    scheduler.o4tThresholdDecisionPacket.thresholdValueRules
      .native_validator_accepted_candidate_schedule_rate
      .selectionAuthorityGranted,
    false,
  );
  assert.equal(
    scheduler.o4tThresholdDecisionPacket.temporalRules
      .evaluationWindowStartsBeforeEnds,
    true,
  );
  assert.equal(
    proposalSha256(scheduler.o4tThresholdDecisionPacket),
    scheduler.o4tPacketDigestContract.pendingProposalDigestSha256,
  );
  assert.equal(
    scheduler.o4tPacketDigestContract.pendingProposalDigestSha256,
    O4T_PROPOSAL_SHA256,
  );
  assert.deepEqual(
    scheduler.o4tPacketDigestContract.packetFieldsExactly,
    Object.keys(scheduler.o4tThresholdDecisionPacket),
  );
  assert.deepEqual(
    scheduler.o4tPacketDigestContract.packetFieldsExactly,
    Object.keys(scheduler.o4tPacketDigestContract.packetFieldSchemas),
  );
  assert.deepEqual(
    scheduler.o4tPacketDigestContract.ownerDecisionBindingContract.fieldsExactly,
    Object.keys(
      scheduler.o4tPacketDigestContract.ownerDecisionBindingContract
        .fieldSchemas,
    ),
  );
  assert.deepEqual(
    scheduler.o4tPacketDigestContract.approvalRecordContract.fieldsExactly,
    Object.keys(
      scheduler.o4tPacketDigestContract.approvalRecordContract.fieldSchemas,
    ),
  );
  assert.deepEqual(
    scheduler.o4tPacketDigestContract.ownerDecisionReceiptContract
      .artifactFieldsExactly,
    Object.keys(
      scheduler.o4tPacketDigestContract.ownerDecisionReceiptContract
        .artifactFieldSchemas,
    ),
  );
  assert.equal(
    scheduler.o4tPacketDigestContract.ownerDecisionReceiptContract
      .verificationRules
      .receiptMustBeReResolvedAndRevalidatedBeforeO2oAndS238ohStartAndAcceptance,
    true,
  );
  assert.equal(
    scheduler.o4tPacketDigestContract.approvedThresholdBindingDigestContract
      .finalDigestIsNotAStandaloneBearerAuthorization,
    true,
  );
  assert.equal(o4tApprovedPacketResolutionContractIsClosed(scheduler), true);
  assert.equal(
    scheduler.o4tPacketDigestContract.approvalStateInvariant
      .approvedRecordRequiresAllExactBindingsAndThresholdsComplete,
    true,
  );
  assert.equal(
    scheduler.comparisonModes.ownerHiddenShadow.ownerCanSeeComparison,
    false,
  );
  assert.equal(
    scheduler.comparisonModes.ownerVisibleComparison.ownerCanSeeComparison,
    true,
  );
  assert.equal(
    scheduler.comparisonModes.ownerVisibleComparison
      .canonicalScheduleInfluenceAllowed,
    false,
  );
  assert.equal(
    scheduler.comparisonModes.ownerVisibleComparison
      .productStateMutationAllowed,
    false,
  );
  assert.equal(
    scheduler.dogfoodEvidence.evidenceMayBeSharedAcrossAcceptanceTypes,
    false,
  );
  assert.equal(scheduler.d0ToDPlus1Freeze.applies, true);
  const changedS237oOwnerScope = clone(authorizationPacket);
  changedS237oOwnerScope.authenticated_owner_private_scope_digest_sha256 =
    "a".repeat(64);
  assert.notEqual(
    s237oProposalSha256(changedS237oOwnerScope),
    authorizationDigestContract.proposalDigestContract
      .pendingTemplateProposalDigestSha256,
  );
  const changedS237oOwnerActor = clone(authorizationPacket);
  changedS237oOwnerActor.opaque_owner_decision_actor_id =
    `oaa_${"a".repeat(16)}`;
  assert.notEqual(
    s237oProposalSha256(changedS237oOwnerActor),
    authorizationDigestContract.proposalDigestContract
      .pendingTemplateProposalDigestSha256,
  );
  const changedO4tOwnerScope = clone(scheduler.o4tThresholdDecisionPacket);
  changedO4tOwnerScope.ownerDecisionBinding
    .authenticatedOwnerPrivateScopeDigestSha256 = "a".repeat(64);
  assert.notEqual(
    proposalSha256(changedO4tOwnerScope),
    scheduler.o4tPacketDigestContract.pendingProposalDigestSha256,
  );
  assert.equal(canonicalSha256(scheduler), SCHEDULER_CONTRACT_SHA256);

  const unknownField = clone(scheduler);
  unknownField.optimizerPath.unreviewed = true;
  assert.notEqual(canonicalSha256(unknownField), SCHEDULER_CONTRACT_SHA256);
  const rawInputAllowed = clone(scheduler);
  rawInputAllowed.inputContract.forbiddenFields =
    rawInputAllowed.inputContract.forbiddenFields.filter(
      (field) => field !== "question_body",
    );
  assert.notEqual(canonicalSha256(rawInputAllowed), SCHEDULER_CONTRACT_SHA256);
  const canonicalMutation = clone(scheduler);
  canonicalMutation.comparisonModes.ownerVisibleComparison
    .productStateMutationAllowed = true;
  assert.notEqual(canonicalSha256(canonicalMutation), SCHEDULER_CONTRACT_SHA256);
});

test("projected optimizer results validate and inverse-map fail closed before canonical gateway exit", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  const agents = await text("AGENTS.md");
  const scheduleSystem = await text(
    "docs/inverge-study-schedule-system.md",
  );
  const projected = scheduler.optimizerProjectedResultContract;
  const canonical = scheduler.resultContract;

  assert.equal(projectedResultGatewayContractIsClosed(scheduler), true);
  assert.deepEqual(
    projected.inverseMappingContract.identifierBearingPathsExactly,
    PROJECTED_RESULT_ID_PATHS,
  );
  assert.deepEqual(
    projected.processingOrderExactly,
    PROJECTED_RESULT_PROCESSING_ORDER,
  );
  assert.deepEqual(
    Object.keys(projected.inverseMappingContract.pathIdentifierClasses),
    PROJECTED_RESULT_ID_PATHS,
  );

  const identifierDomainFixtures = [
    ["request_id", `req_${"a".repeat(16)}`, `oreq_${"a".repeat(16)}`],
    [
      "input_snapshot_version",
      `snp_${"a".repeat(16)}`,
      `osnp_${"a".repeat(16)}`,
    ],
    [
      "ephemeral_opaque_window_id",
      `win_${"a".repeat(16)}`,
      `owin_${"a".repeat(16)}`,
    ],
    [
      "ephemeral_opaque_candidate_id",
      `cand_${"a".repeat(16)}`,
      `ocand_${"a".repeat(16)}`,
    ],
  ];
  for (const [identifierClass, originalId, projectedId] of identifierDomainFixtures) {
    const canonicalPattern = new RegExp(
      canonical.identifierSchemas[identifierClass],
    );
    const projectedPattern = new RegExp(
      projected.identifierSchemas[identifierClass],
    );
    assert.equal(canonicalPattern.test(originalId), true);
    assert.equal(canonicalPattern.test(projectedId), false);
    assert.equal(projectedPattern.test(projectedId), true);
    assert.equal(projectedPattern.test(originalId), false);
  }
  assert.equal(
    canonical.identifierSchemas.request_id.includes("oreq_"),
    false,
  );
  assert.equal(
    canonical.identifierSchemas.input_snapshot_version.includes("osnp_"),
    false,
  );
  assert.equal(
    canonical.identifierSchemas.ephemeral_opaque_window_id.includes("owin_"),
    false,
  );
  assert.equal(
    canonical.identifierSchemas.ephemeral_opaque_candidate_id.includes(
      "ocand_",
    ),
    false,
  );

  const policy =
    scheduler.s237oBenchmarkAcceptanceContract
      .receiptAssertionPolicyDigestContract;
  assert.equal(
    canonicalSha256(
      scheduler.s237oBenchmarkAcceptanceContract.requiredReceiptOperationRules,
    ),
    "d1616bbc8c7681c19b42bdffc86e0d5e34a62710bf9ba727fe5355ca0ad69da8",
  );
  assert.equal(
    policy.digestSha256,
    "d1616bbc8c7681c19b42bdffc86e0d5e34a62710bf9ba727fe5355ca0ad69da8",
  );
  assert.match(
    agents,
    /solver-originated projected response[\s\S]*may not contain[\s\S]*fallback/,
  );
  assert.match(
    agents,
    /Only\s+after complete raw-response[\s\S]{0,240}validation does the gateway construct canonical `version_info`/,
  );
  assert.match(
    agents,
    /gateway\s+then attaches canonical `fallback[\s\S]{0,300}complete canonical[\s\S]{0,120}result[\s\S]{0,180}must\s+validate before release/i,
  );
  assert.match(
    agents,
    /independently\s+resolves\s+or\s+prepares[\s\S]{0,200}exactly\s+one immutable native fallback[\s\S]{0,700}Missing,\s+unavailable,\s+or\s+invalid fallback[\s\S]{0,220}blocked_manual_plan_required[\s\S]{0,120}recursive fallback is forbidden/,
  );
  assert.doesNotMatch(agents, /remap is destroyed after the request/);
  assert.match(
    scheduleSystem,
    /retains it through all[\s\S]*six complete projected-response validations[\s\S]*destroys the mapping[\s\S]*before any canonical result set leaves the gateway/,
  );
  assert.match(
    scheduleSystem,
    /Projected IDs may not[\s\S]*enter logs or artifacts/,
  );
  assert.match(
    scheduleSystem,
    /identifier-free[\s\S]*digest receipt/,
  );
  assert.doesNotMatch(
    scheduleSystem,
    /the in-memory remap is destroyed afterward/,
  );

  const hostileMutations = [
    [
      "missing inverse-map path",
      (value) => {
        value.optimizerProjectedResultContract.inverseMappingContract
          .identifierBearingPathsExactly.pop();
      },
    ],
    [
      "validation after inverse mapping",
      (value) => {
        const order =
          value.optimizerProjectedResultContract.processingOrderExactly;
        [order[0], order[3]] = [order[3], order[0]];
      },
    ],
    [
      "unknown or dangling mapping accepted",
      (value) => {
        value.optimizerProjectedResultContract.inverseMappingContract
          .missingUnknownDanglingDuplicateCrossClassOriginalDomainOrNonBijectiveMappingAllowed =
          true;
      },
    ],
    [
      "cross-class mapping",
      (value) => {
        value.optimizerProjectedResultContract.inverseMappingContract
          .pathIdentifierClasses[
            "execution_blocks[].ephemeral_opaque_window_id"
          ] = "ephemeral_opaque_candidate_id";
      },
    ],
    [
      "original domain accepted",
      (value) => {
        value.optimizerProjectedResultContract
          .projectedResultContractMayAcceptOriginalIdentifierDomain = true;
      },
    ],
    [
      "wrong request may correlate",
      (value) => {
        value.optimizerProjectedResultContract.requestCorrelationEqualityTargets
          .request_id = "any_projected_request_id";
      },
    ],
    [
      "non-ID value may change",
      (value) => {
        value.optimizerProjectedResultContract.inverseMappingContract
          .allNonIdentifierValuesPreservedExactly = false;
      },
    ],
    [
      "array may reorder",
      (value) => {
        value.optimizerProjectedResultContract.inverseMappingContract
          .allArrayCardinalitiesAndOrderingPreservedExactly = false;
      },
    ],
    [
      "mapping destroyed early",
      (value) => {
        value.optimizerProjectedResultContract.mappingLifecycleContract
          .mappingMayBeDestroyedBeforeCompleteProjectedResponseValidationAndRequiredInverseMappingFinish =
          true;
      },
    ],
    [
      "benchmark mapping destroyed before sixth native validation",
      (value) => {
        value.inputContract.optimizerInvocationProjectionContract
          .identifierRemapContract.benchmarkReplaySessionContract
          .mappingAndProjectedIdentifierMaterialMustBeDestroyedAfterTheSixthCompleteCanonicalAndNativeValidationPathOrAfterAnyFailureIsClassifiedAndValidatedNativeFallbackIsPreparedAndBeforeGatewayExit =
          false;
      },
    ],
    [
      "mapping retained after exit",
      (value) => {
        value.optimizerProjectedResultContract.mappingLifecycleContract
          .mappingRetainedAfterGatewayExit = true;
      },
    ],
    [
      "projected ID enters logs or artifacts",
      (value) => {
        value.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
          .resolvedArtifactMembersContract
          .identifierFreeDeterministicReplayInputArtifactContract
          .projectedIdentifierValuesMayAppearInArtifact = true;
      },
    ],
    [
      "identifier-free artifact schema widened with projected ID",
      (value) => {
        const artifact =
          value.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
            .resolvedArtifactMembersContract
            .identifierFreeDeterministicReplayInputArtifactContract;
        artifact.fieldsExactly.push("projected_request_id");
        artifact.fieldSchemas.projected_request_id =
          "^oreq_[A-Za-z0-9_-]{16,64}$";
      },
    ],
    [
      "canonical schema widened to both ID domains",
      (value) => {
        value.resultContract.identifierSchemas.request_id =
          "^(?:req|oreq)_[A-Za-z0-9_-]{16,64}$";
      },
    ],
    [
      "projected-only semantic override",
      (value) => {
        value.optimizerProjectedResultContract.allowDurationOverflow = true;
      },
    ],
  ];
  for (const [name, mutate] of hostileMutations) {
    const hostile = clone(scheduler);
    mutate(hostile);
    assert.equal(
      projectedResultGatewayContractIsClosed(hostile),
      false,
      `${name} must fail closed`,
    );
  }
});

test("post-ready projected responses exclude gateway state and only the gateway constructs canonical fallback and version metadata", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  const projected = scheduler.optimizerProjectedResultContract;
  const canonical = scheduler.resultContract;
  const unified = await text("docs/dabangil-unified-program-contract.md");
  const productSpec = await text(
    "docs/inverge-second-round-final-product-spec.md",
  );
  const scheduleSystem = await text(
    "docs/inverge-study-schedule-system.md",
  );
  const agents = await text("AGENTS.md");

  assert.equal(projectedResultGatewayContractIsClosed(scheduler), true);
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  assert.deepEqual(projected.statuses, SOLVER_STATUSES);
  assert.deepEqual(
    projected.statusOriginBoundary.trustedGatewayClassificationStatusesExactly,
    GATEWAY_CLASSIFICATION_STATUSES,
  );
  assert.equal(Object.hasOwn(projected, "fallbackFieldsExactly"), false);
  assert.equal(Object.hasOwn(projected, "fallbackStatuses"), false);
  assert.equal(
    Object.hasOwn(projected.identifierSchemas, "native_plan_version"),
    false,
  );
  assert.equal(
    canonical.fallbackValueRules
      .canonicalFallbackTupleAndStateMayBeConstructedAndAttachedOnlyByTrustedGateway,
    true,
  );

  const expectedCorrelation = {
    request_id: `oreq_${"a".repeat(16)}`,
    input_snapshot_version: `osnp_${"b".repeat(16)}`,
  };
  const trustedCanonicalVersionInfo = {
    contract_version: "dabangil.full_day_scheduler.v1",
    native_policy_version: "native_policy_v1",
    adapter_version: "adapter_v1",
    optimizer_version: "optimizer_v1",
    objective_version: "objective_v1",
    threshold_version: "threshold_v1",
    solver_seed: 1,
    solver_workers: 1,
    time_limit_ms: 1000,
    integer_scaling_version: "integer_scaling_v1",
  };
  const projectedExecutionBlock = {
    ephemeral_opaque_candidate_id: `ocand_${"c".repeat(16)}`,
    ephemeral_opaque_window_id: `owin_${"d".repeat(16)}`,
    start_minute_kst: 0,
    end_minute_kst: 30,
    duration_minutes: 30,
  };
  const projectedOptimal = {
    ...expectedCorrelation,
    status: "optimal",
    execution_blocks: [],
    unassigned_candidates: [],
    objective_components: [],
    violations: [],
    elapsed_ms: 1,
  };
  assert.equal(
    projectedSolverResponseIsClosed(
      projected,
      projectedOptimal,
      expectedCorrelation,
    ),
    true,
  );
  for (const forbiddenMutation of [
    {
      fallback: {
        used: false,
        reason_enum: "not_used",
        native_plan_version: null,
      },
    },
    { native_plan_version: "native_plan_v1" },
    { canonical_native_fallback_plan: {} },
    { canonical_native_fallback_plan_ref: "native_plan_v1" },
    { canonical_plan_reference: "native_plan_v1" },
    { version_info: trustedCanonicalVersionInfo },
  ]) {
    assert.equal(
      projectedSolverResponseIsClosed(projected, {
        ...projectedOptimal,
        ...forbiddenMutation,
      }, expectedCorrelation),
      false,
      `${Object.keys(forbiddenMutation)[0]} must be rejected from projected output`,
    );
  }
  for (const versionField of canonical.versionInfoFieldsExactly) {
    const value = trustedCanonicalVersionInfo[versionField];
    for (const [location, hostileResponse] of [
      [
        "top-level",
        {
          ...projectedOptimal,
          [versionField]: value,
        },
      ],
      [
        "nested",
        {
          ...projectedOptimal,
          objective_components: [
            {
              objective_code_enum: "maximize_native_priority_value",
              integer_value: 1,
              diagnostics: { [versionField]: value },
            },
          ],
        },
      ],
    ]) {
      assert.equal(
        projectedSolverResponseIsClosed(
          projected,
          hostileResponse,
          expectedCorrelation,
        ),
        false,
        `${location} ${versionField} injection must be rejected from raw projected output`,
      );
    }
  }
  const coordinatedVersionEnforcementRemoval = clone(projected);
  coordinatedVersionEnforcementRemoval.forbiddenFields =
    coordinatedVersionEnforcementRemoval.forbiddenFields.filter(
      (field) => field !== "solver_seed",
    );
  coordinatedVersionEnforcementRemoval.objectiveComponentFieldsExactly.push(
    "solver_seed",
  );
  assert.equal(
    projectedSolverResponseIsClosed(
      coordinatedVersionEnforcementRemoval,
      {
        ...projectedOptimal,
        objective_components: [
          {
            objective_code_enum: "maximize_native_priority_value",
            integer_value: 1,
            solver_seed: trustedCanonicalVersionInfo.solver_seed,
          },
        ],
      },
      expectedCorrelation,
    ),
    true,
    "the hostile fixture must prove coordinated schema widening would admit a gateway-owned field without the closed contract",
  );
  for (const [name, hostileResponse] of [
    [
      "nested version info",
      {
        ...projectedOptimal,
        objective_components: [
          {
            objective_code_enum: "maximize_native_priority_value",
            integer_value: 1,
            version_info: trustedCanonicalVersionInfo,
          },
        ],
      },
    ],
    [
      "nested canonical plan reference",
      {
        ...projectedOptimal,
        violations: [
          {
            constraint_code_enum: "candidate_accounting_exact_partition",
            ephemeral_opaque_candidate_ids: [],
            severity_enum: "error",
            canonical_plan_reference: "native_plan_v1",
          },
        ],
      },
    ],
    [
      "execution block nested fallback",
      {
        ...projectedOptimal,
        execution_blocks: [
          {
            ...projectedExecutionBlock,
            fallback: {
              used: true,
              reason_enum: "validator_rejected",
              native_plan_version: "native_plan_v1",
            },
          },
        ],
      },
    ],
    [
      "wrong correlated request",
      {
        ...projectedOptimal,
        request_id: `oreq_${"e".repeat(16)}`,
      },
    ],
    [
      "non-string request identifier",
      {
        ...projectedOptimal,
        request_id: [projectedOptimal.request_id],
      },
    ],
    [
      "non-string snapshot identifier",
      {
        ...projectedOptimal,
        input_snapshot_version: [
          projectedOptimal.input_snapshot_version,
        ],
      },
    ],
    [
      "non-string execution candidate identifier",
      {
        ...projectedOptimal,
        execution_blocks: [
          {
            ...projectedExecutionBlock,
            ephemeral_opaque_candidate_id: [
              projectedExecutionBlock.ephemeral_opaque_candidate_id,
            ],
          },
        ],
      },
    ],
    [
      "non-string execution window identifier",
      {
        ...projectedOptimal,
        execution_blocks: [
          {
            ...projectedExecutionBlock,
            ephemeral_opaque_window_id: [
              projectedExecutionBlock.ephemeral_opaque_window_id,
            ],
          },
        ],
      },
    ],
    [
      "non-string unassigned candidate identifier",
      {
        ...projectedOptimal,
        unassigned_candidates: [
          {
            ephemeral_opaque_candidate_id: [
              projectedExecutionBlock.ephemeral_opaque_candidate_id,
            ],
            reason_enum: "capacity_exceeded",
          },
        ],
      },
    ],
    [
      "non-string violation candidate identifier",
      {
        ...projectedOptimal,
        violations: [
          {
            constraint_code_enum: "candidate_accounting_exact_partition",
            ephemeral_opaque_candidate_ids: [
              [projectedExecutionBlock.ephemeral_opaque_candidate_id],
            ],
            severity_enum: "error",
          },
        ],
      },
    ],
    [
      "original-domain nested candidate identifier",
      {
        ...projectedOptimal,
        execution_blocks: [
          {
            ...projectedExecutionBlock,
            ephemeral_opaque_candidate_id: `cand_${"c".repeat(16)}`,
          },
        ],
      },
    ],
  ]) {
    assert.equal(
      projectedSolverResponseIsClosed(
        projected,
        hostileResponse,
        expectedCorrelation,
      ),
      false,
      `${name} must fail the complete projected response schema`,
    );
  }

  for (const status of SOLVER_FAILURE_STATUSES) {
    const projectedFailure = {
      request_id: projectedOptimal.request_id,
      input_snapshot_version: projectedOptimal.input_snapshot_version,
      status,
      objective_components: [],
      violations: [],
      elapsed_ms: 1,
    };
    assert.equal(
      projectedSolverResponseIsClosed(
        projected,
        projectedFailure,
        expectedCorrelation,
      ),
      true,
    );
    assert.equal(
      projectedSolverResponseIsClosed(projected, {
        ...projectedFailure,
        execution_blocks: [],
        unassigned_candidates: [],
      }, expectedCorrelation),
      false,
      `${status} projected failure cannot carry or release a candidate plan`,
    );
  }
  for (const status of [
    ...GATEWAY_CLASSIFICATION_STATUSES,
    "fallback",
    "blocked_manual_plan_required",
  ]) {
    assert.equal(
      projectedSolverResponseIsClosed(projected, {
        ...projectedOptimal,
        status,
      }, expectedCorrelation),
      false,
      `${status} cannot be authored by the isolated solver`,
    );
  }

  const validConstructionOptions = {
    rawResponseValidated: true,
    exactCorrelationValidated: true,
    requiredBijectionsValidated: true,
    trustedConfigurationIsCurrentAndBound: true,
    nativeFallbackValid: false,
  };
  assert.equal(
    canonicalVersionInfoIsExact(
      canonical,
      trustedCanonicalVersionInfo,
    ),
    true,
  );
  assert.deepEqual(
    gatewayCanonicalVersionOutcome(
      canonical,
      trustedCanonicalVersionInfo,
      validConstructionOptions,
    ),
    {
      status: "constructed",
      version_info: trustedCanonicalVersionInfo,
      nativeFallbackAttempts: 0,
      candidatePlanReleased: true,
      canonicalNativeFallbackReleased: false,
    },
  );
  const missingVersionField = {
    ...trustedCanonicalVersionInfo,
  };
  delete missingVersionField.threshold_version;
  const extraVersionField = {
    ...trustedCanonicalVersionInfo,
    solver_build_host: "forbidden",
  };
  const schemaInvalidVersionInfo = {
    ...trustedCanonicalVersionInfo,
    solver_workers: 0,
  };
  const mismatchedActualInvocationConfiguration = {
    ...trustedCanonicalVersionInfo,
    solver_seed: trustedCanonicalVersionInfo.solver_seed + 1,
  };
  for (const [
    name,
    trustedConfiguration,
    optionOverrides,
    expectedClassification,
  ] of [
    ["missing field", missingVersionField, {}, "validator_rejected"],
    ["extra field", extraVersionField, {}, "validator_rejected"],
    [
      "schema-invalid field",
      schemaInvalidVersionInfo,
      {},
      "validator_rejected",
    ],
    [
      "stale or untrusted binding",
      trustedCanonicalVersionInfo,
      { trustedConfigurationIsCurrentAndBound: false },
      "validator_rejected",
    ],
    [
      "mismatch with actual invocation",
      trustedCanonicalVersionInfo,
      {
        actualInvocationConfiguration:
          mismatchedActualInvocationConfiguration,
      },
      "validator_rejected",
    ],
    [
      "construction before raw validation",
      trustedCanonicalVersionInfo,
      { rawResponseValidated: false },
      "schema_mismatch",
    ],
    [
      "construction before exact correlation",
      trustedCanonicalVersionInfo,
      { exactCorrelationValidated: false },
      "stale_response",
    ],
    [
      "construction before required bijections",
      trustedCanonicalVersionInfo,
      { requiredBijectionsValidated: false },
      "schema_mismatch",
    ],
  ]) {
    assert.deepEqual(
      gatewayCanonicalVersionOutcome(canonical, trustedConfiguration, {
        ...validConstructionOptions,
        ...optionOverrides,
        nativeFallbackValid: true,
        nativeFallbackTrustedConfiguration:
          trustedCanonicalVersionInfo,
      }),
      {
        status: "fallback",
        triggeringClassification: expectedClassification,
        version_info: trustedCanonicalVersionInfo,
        nativeFallbackAttempts: 1,
        candidatePlanReleased: false,
        canonicalNativeFallbackReleased: true,
      },
      `${name} must discard the candidate and enter exactly one independently prepared valid canonical fallback`,
    );
    assert.deepEqual(
      gatewayCanonicalVersionOutcome(canonical, trustedConfiguration, {
        ...validConstructionOptions,
        ...optionOverrides,
        nativeFallbackValid: true,
        nativeFallbackTrustedConfiguration: missingVersionField,
      }),
      {
        status: "blocked_manual_plan_required",
        triggeringClassification: expectedClassification,
        version_info: null,
        nativeFallbackAttempts: 1,
        candidatePlanReleased: false,
        canonicalNativeFallbackReleased: false,
      },
      `${name} with invalid fallback metadata must release only the manual block`,
    );
  }
  assert.deepEqual(
    gatewayCanonicalVersionOutcome(canonical, missingVersionField, {
      ...validConstructionOptions,
      nativeFallbackValid: true,
      nativeFallbackTrustedConfiguration: trustedCanonicalVersionInfo,
      nativeFallbackActualInvocationConfiguration:
        mismatchedActualInvocationConfiguration,
    }),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      version_info: null,
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
    "a schema-valid but mismatched fallback version configuration cannot be released",
  );
  assert.deepEqual(
    gatewayCanonicalVersionOutcome(canonical, missingVersionField, {
      ...validConstructionOptions,
      nativeFallbackValid: true,
      nativeFallbackTrustedConfiguration: trustedCanonicalVersionInfo,
      nativeFallbackTrustedConfigurationIsCurrentAndBound: false,
    }),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      version_info: null,
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
    "a stale or untrusted fallback version binding cannot be released",
  );
  assert.equal(
    projected.failureRouting
      .rawProjectedVersionInfoOrGatewayOwnedVersionConfigurationInjectionStatus,
    "schema_mismatch",
  );
  assert.equal(
    projected.failureRouting
      .missingAmbiguousStaleUntrustedOrMismatchedCanonicalVersionMetadataStatus,
    "validator_rejected",
  );

  for (const status of ["optimal", "feasible"]) {
    assert.deepEqual(gatewayConstructedCanonicalFallbackTuple(status), {
      used: false,
      reason_enum: "not_used",
      native_plan_version: null,
    });
  }
  for (const triggerStatus of [
    ...SOLVER_FAILURE_STATUSES,
    ...GATEWAY_CLASSIFICATION_STATUSES,
  ]) {
    assert.deepEqual(
      gatewayConstructedCanonicalFallbackTuple(
        triggerStatus,
        "native_plan_v1",
      ),
      {
        used: true,
        reason_enum: triggerStatus,
        native_plan_version: "native_plan_v1",
      },
    );
    assert.equal(
      gatewayConstructedCanonicalFallbackTuple(triggerStatus),
      null,
      `${triggerStatus} cannot release a missing canonical fallback`,
    );
  }
  const lateRejectionTransition =
    projected.canonicalGatewayConstructionContract
      .lateCanonicalOrNativeValidationRejectionTransition;
  assert.equal(
    lateRejectionTransition.trustedGatewayClassification,
    "validator_rejected",
  );
  assert.equal(
    lateRejectionTransition
      .discardCandidatePlanAndUsedFalseTupleWithoutRelease,
    true,
  );
  assert.equal(
    lateRejectionTransition
      .transitionExactlyOnceToSolverOrTrustedGatewayFailureBranch,
    true,
  );
  assert.equal(
    projected.failureRouting
      .optimalOrFeasibleLateCanonicalOrNativeValidationFailureStatus,
    "validator_rejected",
  );
  for (const projectedStatus of ["optimal", "feasible"]) {
    assert.deepEqual(
      gatewayOutcomeAfterOptimalOrFeasibleNativeValidation(
        projectedStatus,
        {
          canonicalAndNativeValidationValid: true,
          nativeFallbackValid: false,
        },
      ),
      {
        status: projectedStatus,
        discardedProjectedCandidatePlan: false,
        nativeFallbackAttempts: 0,
        fallback: {
          used: false,
          reason_enum: "not_used",
          native_plan_version: null,
        },
        projectedCandidatePlanReleased: true,
        canonicalNativeFallbackReleased: false,
      },
    );
    assert.deepEqual(
      gatewayOutcomeAfterOptimalOrFeasibleNativeValidation(
        projectedStatus,
        {
          canonicalAndNativeValidationValid: false,
          nativeFallbackValid: true,
        },
      ),
      {
        status: "fallback",
        triggeringClassification: "validator_rejected",
        discardedProjectedCandidatePlan: true,
        nativeFallbackAttempts: 1,
        fallback: {
          used: true,
          reason_enum: "validator_rejected",
          native_plan_version: "native_plan_v1",
        },
        projectedCandidatePlanReleased: false,
        canonicalNativeFallbackReleased: true,
      },
      `${projectedStatus} rejected by native validation must transition once to the independent gateway fallback`,
    );
    assert.deepEqual(
      gatewayOutcomeAfterOptimalOrFeasibleNativeValidation(
        projectedStatus,
        {
          canonicalAndNativeValidationValid: false,
          nativeFallbackValid: false,
        },
      ),
      {
        status: "blocked_manual_plan_required",
        triggeringClassification: "validator_rejected",
        discardedProjectedCandidatePlan: true,
        nativeFallbackAttempts: 1,
        fallback: {
          used: false,
          reason_enum: "not_used",
          native_plan_version: null,
        },
        projectedCandidatePlanReleased: false,
        canonicalNativeFallbackReleased: false,
      },
      `${projectedStatus} rejected by native validation cannot release an invalid fallback or recurse`,
    );
  }

  assert.match(
    unified,
    /projected response[\s\S]*never contains[\s\S]*`fallback`[\s\S]*only the trusted gateway[\s\S]*constructs canonical `version_info`[\s\S]*constructs canonical fallback state/i,
  );
  assert.match(
    productSpec,
    /never returns a fallback reason[\s\S]*trusted gateway[\s\S]*constructs canonical fallback state/,
  );
  assert.match(
    scheduleSystem,
    /solver-originated projected response[\s\S]*cannot contain[\s\S]*fallback state[\s\S]*gateway[\s\S]*constructs canonical/,
  );
  for (const authoritativeProse of [agents, scheduleSystem]) {
    assert.match(
      authoritativeProse,
      /before a candidate plan[\s\S]*exists[\s\S]*carries no candidate plan/,
    );
    assert.match(
      authoritativeProse,
      /classif[\s\S]{0,100}while[\s\S]{0,40}validating[\s\S]{0,100}(?:OPTIMAL|optimal)[\s\S]{0,80}(?:FEASIBLE|feasible)[\s\S]{0,160}discards[\s\S]{0,180}without release/,
    );
    assert.match(
      authoritativeProse,
      /late\s+canonical\/native[\s\S]{0,80}rejection[\s\S]{0,80}validator_rejected/,
    );
    assert.match(
      authoritativeProse,
      /same failure branch[\s\S]*exactly once/,
    );
  }
  assert.doesNotMatch(
    productSpec,
    /OR-Tools CP-SAT[\s\S]{0,240}returns[\s\S]{0,120}fallback reason\./,
  );
  for (const [name, authoritativeProse] of [
    ["AGENTS", agents],
    ["unified contract", unified],
    ["product spec", productSpec],
    ["schedule system", scheduleSystem],
  ]) {
    assert.match(
      authoritativeProse,
      /projected response[\s\S]{0,900}`version_info`/,
      `${name} must forbid raw projected version_info`,
    );
    assert.match(
      authoritativeProse,
      /complete raw-response[\s\S]{0,240}exact-correlation[\s\S]{0,240}required-bijection[\s\S]{0,300}constructs? canonical `version_info`/,
      `${name} must delay gateway canonical version construction until all prerequisite validation finishes`,
    );
    assert.match(
      authoritativeProse,
      /`contract_version`[\s\S]{0,600}`integer_scaling_version`/,
      `${name} must enumerate the canonical ten-field version_info`,
    );
    assert.match(
      authoritativeProse,
      /Missing,\s+ambiguous,\s+stale,\s+untrusted,\s+or\s+mismatched[\s\S]{0,220}`validator_rejected`/i,
      `${name} must classify canonical metadata failures as validator_rejected`,
    );
    assert.match(
      authoritativeProse,
      /invalid fallback[\s\S]{0,220}`blocked_manual_plan_required`/i,
      `${name} must keep an invalid fallback on the manual-block path`,
    );
  }

  const hostileMutations = [
    [
      "projected version info restored",
      (value) => {
        value.optimizerProjectedResultContract.allowedFieldsExactly.push(
          "version_info",
        );
        value.optimizerProjectedResultContract.forbiddenFields =
          value.optimizerProjectedResultContract.forbiddenFields.filter(
            (field) => field !== "version_info",
          );
        value.optimizerProjectedResultContract.versionInfoFieldsExactly = [
          ...value.resultContract.versionInfoFieldsExactly,
        ];
        value.optimizerProjectedResultContract.versionInfoFieldSchemas =
          clone(value.resultContract.versionInfoFieldSchemas);
        value.optimizerProjectedResultContract.versionFieldsRequired = [
          ...value.resultContract.versionFieldsRequired,
        ];
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "gateway-owned version field removed from recursive prohibition",
      (value) => {
        value.optimizerProjectedResultContract.forbiddenFields =
          value.optimizerProjectedResultContract.forbiddenFields.filter(
            (field) => field !== "solver_seed",
          );
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "gateway version construction allowed before bijection validation",
      (value) => {
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract
          .canonicalVersionInfoConstructionContract
          .constructionMayOccurBeforeCompleteRawResponseExactCorrelationAndRequiredBijectionValidation =
          true;
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "canonical ten-field requirement weakened",
      (value) => {
        value.resultContract.versionFieldsRequired.pop();
      },
      c3ResultValidationContractsAreClosed,
    ],
    [
      "native fallback canonical version validation removed",
      (value) => {
        value.nativeValidator
          .validatedNativeFallbackMustSatisfyCanonicalTenFieldVersionInfoAndHardDeadlineFeasibilityAndAllHardConstraints =
          false;
      },
      c3ResultValidationContractsAreClosed,
    ],
    [
      "projected fallback field restored",
      (value) => {
        value.optimizerProjectedResultContract.allowedFieldsExactly.push(
          "fallback",
        );
        value.optimizerProjectedResultContract.forbiddenFields =
          value.optimizerProjectedResultContract.forbiddenFields.filter(
            (field) => field !== "fallback",
          );
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "gateway classification made solver-owned",
      (value) => {
        value.optimizerProjectedResultContract.statuses.push("timeout");
        value.optimizerProjectedResultContract.statusOriginBoundary
          .solverOwnedStatusesExactly.push("timeout");
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "projected failure self-authorizes fallback",
      (value) => {
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract
          .projectedFailureEnvelopeMayReferenceAuthorizeOrReleaseCanonicalFallback =
          true;
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "canonical gateway ownership weakened",
      (value) => {
        value.resultContract.fallbackValueRules
          .canonicalFallbackTupleAndStateMayBeConstructedAndAttachedOnlyByTrustedGateway =
          false;
      },
      c3ResultValidationContractsAreClosed,
    ],
    [
      "native validator accepts solver fallback state",
      (value) => {
        value.nativeValidator
          .canonicalFallbackTupleAndStateMustBeGatewayConstructed = false;
      },
      c3ResultValidationContractsAreClosed,
    ],
    [
      "late native rejection remains in the success branch",
      (value) => {
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract
          .lateCanonicalOrNativeValidationRejectionTransition
          .transitionExactlyOnceToSolverOrTrustedGatewayFailureBranch =
          false;
      },
      projectedResultGatewayContractIsClosed,
    ],
    [
      "late native rejection reuses the rejected projected plan",
      (value) => {
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract
          .lateCanonicalOrNativeValidationRejectionTransition
          .projectedOrRejectedCandidatePlanMayBeReusedAsCanonicalFallback =
          true;
      },
      projectedResultGatewayContractIsClosed,
    ],
  ];
  for (const [name, mutate, validator] of hostileMutations) {
    const hostile = clone(scheduler);
    mutate(hostile);
    assert.equal(validator(hostile), false, `${name} must fail closed`);
  }
});

test("post-ready hard deadlines are closed KST-to-UTC feasibility predicates for both ID domains and every release path", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  assert.equal(projectedResultGatewayContractIsClosed(scheduler), true);
  const deadlineAuthorityProse = await Promise.all([
    text("AGENTS.md"),
    text("docs/dabangil-unified-program-contract.md"),
    text("docs/inverge-second-round-final-product-spec.md"),
    text("docs/inverge-study-schedule-system.md"),
  ]);
  for (const authoritativeProse of deadlineAuthorityProse) {
    assert.match(
      authoritativeProse,
      /`study_date_kst`[\s\S]{0,220}(?:never projects?|not projected|without projecting|never enters)/i,
    );
    assert.match(
      authoritativeProse,
      /IANA\s+`Asia\/Seoul`[\s\S]{0,180}`?(?:end_minute_kst=)?1440`?[\s\S]{0,180}next-day/i,
    );
    assert.match(
      authoritativeProse,
      /block_end_utc/i,
    );
    assert.match(
      authoritativeProse,
      /(?:<=|less than or equal)[\s\S]{0,300}hard_deadline/i,
    );
    assert.match(
      authoritativeProse,
      /`null`[\s\S]{0,80}no hard cutoff/i,
    );
    assert.match(
      authoritativeProse,
      /`minimize_deadline_lateness`[\s\S]{0,180}(?:only|reads only)[\s\S]{0,180}(?:cannot override|hard)/i,
    );
    assert.match(
      authoritativeProse,
      /Elapsed[\s\S]{0,120}in-progress[\s\S]{0,400}before projection[\s\S]{0,300}(?:moved|moving)[\s\S]{0,300}(?:rewritten|rewriting)/i,
    );
  }
  assert.equal(
    blockEndUtcFromStudyDateKst("2026-07-26", 60),
    "2026-07-25T16:00:00.000Z",
  );
  assert.equal(
    blockEndUtcFromStudyDateKst("2026-07-26", 1440),
    "2026-07-26T15:00:00.000Z",
  );

  for (const [candidateId, windowId] of [
    [`cand_${"h".repeat(16)}`, `win_${"w".repeat(16)}`],
    [`ocand_${"h".repeat(16)}`, `owin_${"w".repeat(16)}`],
  ]) {
    const block = {
      ephemeral_opaque_candidate_id: candidateId,
      ephemeral_opaque_window_id: windowId,
      start_minute_kst: 30,
      end_minute_kst: 60,
      duration_minutes: 30,
    };
    for (const status of ["optimal", "feasible"]) {
      assert.equal(
        hardDeadlineClassification(
          [
            {
              ephemeral_opaque_candidate_id: candidateId,
              hard_deadline_or_null: null,
              soft_deadline_or_null: "2026-07-25T15:59:59.999Z",
            },
          ],
          block,
          "2026-07-26",
        ),
        "feasible",
        `${status} ${candidateId} null hard deadline must have no cutoff even when the soft deadline is earlier`,
      );
      assert.equal(
        hardDeadlineClassification(
          [
            {
              ephemeral_opaque_candidate_id: candidateId,
              hard_deadline_or_null: "2026-07-25T16:00:00Z",
              soft_deadline_or_null: null,
            },
          ],
          block,
          "2026-07-26",
        ),
        "feasible",
        `${status} ${candidateId} exact UTC equality must be feasible`,
      );
      assert.equal(
        hardDeadlineClassification(
          [
            {
              ephemeral_opaque_candidate_id: candidateId,
              hard_deadline_or_null: "2026-07-25T15:59:59.999Z",
              soft_deadline_or_null: "2026-07-27T00:00:00Z",
            },
          ],
          block,
          "2026-07-26",
        ),
        "validator_rejected",
        `${status} ${candidateId} one-millisecond hard breach cannot be overridden by a later soft deadline`,
      );
    }
    const midnightBlock = {
      ...block,
      start_minute_kst: 1410,
      end_minute_kst: 1440,
    };
    assert.equal(
      hardDeadlineClassification(
        [
          {
            ephemeral_opaque_candidate_id: candidateId,
            hard_deadline_or_null: "2026-07-26T15:00:00Z",
            soft_deadline_or_null: null,
          },
        ],
        midnightBlock,
        "2026-07-26",
      ),
      "feasible",
      `${candidateId} end_minute_kst=1440 must equal next-day midnight Asia/Seoul`,
    );
    assert.equal(
      hardDeadlineClassification(
        [
          {
            ephemeral_opaque_candidate_id: candidateId,
            hard_deadline_or_null: "2026-07-26T14:59:59.999Z",
            soft_deadline_or_null: null,
          },
        ],
        midnightBlock,
        "2026-07-26",
      ),
      "validator_rejected",
    );
    assert.equal(
      hardDeadlineClassification(
        [
          {
            ephemeral_opaque_candidate_id: candidateId,
            hard_deadline_or_null: null,
          },
          {
            ephemeral_opaque_candidate_id: candidateId,
            hard_deadline_or_null: null,
          },
        ],
        block,
        "2026-07-26",
      ),
      "schema_mismatch",
      `${candidateId} must resolve exactly once`,
    );
    assert.equal(
      hardDeadlineClassification(
        [
          {
            ephemeral_opaque_candidate_id: candidateId.startsWith("ocand_")
              ? `cand_${"h".repeat(16)}`
              : `ocand_${"h".repeat(16)}`,
            hard_deadline_or_null: null,
          },
        ],
        block,
        "2026-07-26",
      ),
      "schema_mismatch",
      `${candidateId} cannot cross identifier domains`,
    );
  }

  const canonicalFallbackBlock = {
    ephemeral_opaque_candidate_id: `cand_${"f".repeat(16)}`,
    ephemeral_opaque_window_id: `win_${"g".repeat(16)}`,
    start_minute_kst: 30,
    end_minute_kst: 60,
    duration_minutes: 30,
  };
  const validNativeFallbackDeadlineClassification =
    hardDeadlineClassification(
      [
        {
          ephemeral_opaque_candidate_id:
            canonicalFallbackBlock.ephemeral_opaque_candidate_id,
          hard_deadline_or_null: "2026-07-25T16:00:00Z",
        },
      ],
      canonicalFallbackBlock,
      "2026-07-26",
    );
  const invalidNativeFallbackDeadlineClassification =
    hardDeadlineClassification(
      [
        {
          ephemeral_opaque_candidate_id:
            canonicalFallbackBlock.ephemeral_opaque_candidate_id,
          hard_deadline_or_null: "2026-07-25T15:59:59.999Z",
        },
      ],
      canonicalFallbackBlock,
      "2026-07-26",
    );
  assert.equal(validNativeFallbackDeadlineClassification, "feasible");
  assert.equal(
    invalidNativeFallbackDeadlineClassification,
    "validator_rejected",
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      validNativeFallbackDeadlineClassification,
    ),
    {
      status: "fallback",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    },
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      invalidNativeFallbackDeadlineClassification,
    ),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "schema_mismatch",
      "feasible",
    ),
    {
      status: "fallback",
      triggeringClassification: "schema_mismatch",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    },
  );

  const immutableBlock = {
    ephemeral_opaque_candidate_id: `cand_${"i".repeat(16)}`,
    ephemeral_opaque_window_id: `win_${"j".repeat(16)}`,
    start_minute_kst: 30,
    end_minute_kst: 60,
    duration_minutes: 30,
  };
  const immutableSnapshot = clone(immutableBlock);
  assert.equal(
    hardDeadlineClassification(
      [
        {
          ephemeral_opaque_candidate_id:
            immutableBlock.ephemeral_opaque_candidate_id,
          hard_deadline_or_null: "2026-07-25T15:59:59.999Z",
        },
      ],
      immutableBlock,
      "2026-07-26",
    ),
    "validator_rejected",
  );
  assert.deepEqual(
    immutableBlock,
    immutableSnapshot,
    "immutable preflight cannot move, drop, unassign, shorten, extend, or rewrite the placement",
  );

  const projection =
    scheduler.inputContract.optimizerInvocationProjectionContract;
  assert.equal(projection.fieldsExactly.includes("study_date_kst"), false);
  assert.equal(
    scheduler.resultContract.closedEnumValues.constraint_code_enum.includes(
      "execution_block_hard_deadline_not_exceeded",
    ),
    true,
  );
  for (const fixtureId of [
    "hard_deadline_null",
    "hard_deadline_exact_equality",
    "hard_deadline_one_millisecond_late",
    "hard_deadline_end_minute_1440_kst_utc_boundary",
    "immutable_prior_placement_hard_deadline_incompatible",
  ]) {
    assert.equal(
      scheduler.fixtureMatrix.scenarioFixtureIds.includes(fixtureId),
      true,
      `${fixtureId} must remain in the closed fixture matrix`,
    );
  }
  const hostileMutations = [
    [
      "projected hard deadline enforcement removed",
      (value) => {
        value.optimizerProjectedResultContract
          .hardDeadlineFeasibilityRules
          .knownHardDeadlineBreachTrustedGatewayClassification =
          "feasible";
      },
    ],
    [
      "canonical hard deadline enforcement removed",
      (value) => {
        value.resultContract.hardDeadlineFeasibilityRules
          .knownHardDeadlineBreachStatus = "optimal";
      },
    ],
    [
      "hard constraint code removed",
      (value) => {
        value.hardConstraints = value.hardConstraints.filter(
          (code) => code !== "execution_block_hard_deadline_not_exceeded",
        );
      },
    ],
    [
      "native fallback deadline enforcement removed",
      (value) => {
        value.nativeValidator
          .everyExecutionBlockInOptimalFeasibleAndReleasableValidatedNativeFallbackMustSatisfyCandidateHardDeadlinePredicateUsingTrustedCanonicalStudyDateKst =
          false;
      },
    ],
    [
      "immutable preflight deadline enforcement removed",
      (value) => {
        value.inputContract.priorAcceptedScheduleRules
          .elapsedAndInProgressPlacementMustSatisfyResolvedCurrentCandidateHardDeadlineBeforeProjection =
          false;
      },
    ],
    [
      "study date projected to optimizer",
      (value) => {
        value.inputContract.optimizerInvocationProjectionContract
          .fieldsExactly.push("study_date_kst");
      },
    ],
    [
      "soft objective allowed to override hard deadline",
      (value) => {
        value.resultContract.hardDeadlineFeasibilityRules
          .softDeadlineObjectiveMayOverrideHardDeadline = true;
      },
    ],
    [
      "coordinated hard-deadline enforcement removal",
      (value) => {
        delete value.optimizerProjectedResultContract
          .hardDeadlineFeasibilityRules;
        delete value.resultContract.hardDeadlineFeasibilityRules;
        const withoutHardDeadlineCode = (codes) =>
          codes.filter(
            (code) =>
              code !== "execution_block_hard_deadline_not_exceeded",
          );
        value.hardConstraints = withoutHardDeadlineCode(
          value.hardConstraints,
        );
        value.optimizerProjectedResultContract.closedEnumValues.constraint_code_enum =
          withoutHardDeadlineCode(
            value.optimizerProjectedResultContract.closedEnumValues
              .constraint_code_enum,
          );
        value.resultContract.closedEnumValues.constraint_code_enum =
          withoutHardDeadlineCode(
            value.resultContract.closedEnumValues.constraint_code_enum,
          );
        value.nativeValidator
          .everyExecutionBlockInOptimalFeasibleAndReleasableValidatedNativeFallbackMustSatisfyCandidateHardDeadlinePredicateUsingTrustedCanonicalStudyDateKst =
          false;
        value.nativeValidator
          .validatedNativeFallbackMustSatisfyCanonicalTenFieldVersionInfoAndHardDeadlineFeasibilityAndAllHardConstraints =
          false;
        value.nativeValidator
          .immutableElapsedOrInProgressPlacementMustPassHardDeadlineBeforeProjectionAndMayNotBeMovedDroppedUnassignedShortenedExtendedOrRewrittenDuringValidationOrFallback =
          false;
        value.nativeValidator
          .minimizeDeadlineLatenessMayReadOnlySoftDeadlineOrNullAndMayNotOverrideHardDeadline =
          false;
        value.inputContract.priorAcceptedScheduleRules
          .elapsedAndInProgressPlacementMustSatisfyResolvedCurrentCandidateHardDeadlineBeforeProjection =
          false;
        value.inputContract.optimizerInvocationProjectionContract
          .projectionRules
          .immutablePriorPlacementsMustPassExactCurrentCandidateHardDeadlinePredicateBeforeProjection =
          false;
        value.inputContract.optimizerInvocationProjectionContract
          .projectionRules
          .studyDateKstMustRemainInTrustedGatewayAndMustNotEnterOptimizerProjection =
          false;
        value.inputContract.optimizerInvocationProjectionContract
          .fieldsExactly.push("study_date_kst");
      },
    ],
  ];
  for (const [name, mutate] of hostileMutations) {
    const hostile = clone(scheduler);
    mutate(hostile);
    assert.equal(
      c3ResultValidationContractsAreClosed(hostile),
      false,
      `${name} must fail coordinated contract validation`,
    );
  }
});

test("second post-ready corrective closes cutoff, half-open overlap, and prerequisite ordering on every release path", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  assert.equal(projectedResultGatewayContractIsClosed(scheduler), true);

  for (const prose of await Promise.all([
    text("AGENTS.md"),
    text("docs/dabangil-unified-program-contract.md"),
    text("docs/inverge-second-round-final-product-spec.md"),
    text("docs/inverge-study-schedule-system.md"),
  ])) {
    assert.match(
      prose,
      /`replan_cutoff_minute_kst_or_null`[\s\S]{0,1000}(?:start_minute_kst\s*>=|at or after)[\s\S]{0,600}(?:1440|1,440)/i,
    );
    assert.match(
      prose,
      /exact[\s\S]{0,250}immutable[\s\S]{0,500}(?:candidate|window)[\s\S]{0,500}(?:exactly once|unique)/i,
    );
    assert.match(
      prose,
      /\[start_minute_kst,\s*end_minute_kst\)[\s\S]{0,800}a\.end_minute_kst\s*<=\s*b\.start_minute_kst[\s\S]{0,250}b\.end_minute_kst\s*<=\s*a\.start_minute_kst/i,
    );
    assert.match(
      prose,
      /prerequisite_candidate_ids[\s\S]{0,900}prerequisite\.end_minute_kst\s*<=\s*dependent\.start_minute_kst/i,
    );
    assert.match(
      prose,
      /(?:mapping|correlation|ambiguous|cross-domain)[\s\S]{0,600}`schema_mismatch`[\s\S]{0,900}known[\s\S]{0,500}`validator_rejected`/i,
    );
  }

  const placement = (candidateId, windowId, start, end) => ({
    ephemeral_opaque_candidate_id: candidateId,
    ephemeral_opaque_window_id: windowId,
    start_minute_kst: start,
    end_minute_kst: end,
    duration_minutes: end - start,
  });
  const domains = [
    {
      name: "canonical",
      contract: scheduler.resultContract,
      candidate: (token) => `cand_${token.repeat(16)}`,
      window: (token) => `win_${token.repeat(16)}`,
    },
    {
      name: "projected",
      contract: scheduler.optimizerProjectedResultContract,
      candidate: (token) => `ocand_${token.repeat(16)}`,
      window: (token) => `owin_${token.repeat(16)}`,
    },
  ];
  const correlationFor = (domain, cutoff) => ({
    request_id:
      domain.name === "canonical"
        ? `req_${"r".repeat(16)}`
        : `oreq_${"r".repeat(16)}`,
    input_snapshot_version:
      domain.name === "canonical"
        ? `snp_${"s".repeat(16)}`
        : `osnp_${"s".repeat(16)}`,
    replan_cutoff_minute_kst_or_null: cutoff,
  });
  const invocationFor = (
    domain,
    candidateIds,
    windowIds,
    cutoff,
  ) => ({
    ...correlationFor(domain, cutoff),
    candidates: candidateIds.map((candidateId) => ({
      ephemeral_opaque_candidate_id: candidateId,
    })),
    available_windows: windowIds.map((windowId) => ({
      ephemeral_opaque_window_id: windowId,
    })),
  });

  for (const domain of domains) {
    const ids = ["a", "b", "c", "d"].map(domain.candidate);
    const windowId = domain.window("w");
    const first = placement(ids[0], windowId, 60, 90);
    const adjacent = placement(ids[1], windowId, 90, 120);
    const overlapping = placement(ids[1], windowId, 89, 119);
    for (const status of ["optimal", "feasible"]) {
      for (const [cutoff, immutables, block, expected, label] of [
        [null, [], first, "feasible", "null"],
        [
          null,
          [clone(first), clone(first)],
          first,
          "schema_mismatch",
          "null-still-validates-ambiguous-match",
        ],
        [0, [], first, "feasible", "zero"],
        [60, [], first, "feasible", "equality"],
        [61, [], first, "validator_rejected", "one-minute-early"],
        [1440, [], first, "validator_rejected", "1440-new"],
        [1440, [clone(first)], first, "feasible", "immutable-exempt"],
        [
          1440,
          [clone(first), clone(first)],
          first,
          "schema_mismatch",
          "immutable-ambiguous",
        ],
        [
          60,
          [clone(first)],
          { ...first, start_minute_kst: 59, duration_minutes: 31 },
          "validator_rejected",
          "immutable-moved",
        ],
      ]) {
        assert.equal(
          replanCutoffClassification(
            domain.contract,
            status,
            block,
            invocationFor(domain, ids, [windowId], cutoff),
            immutables,
            correlationFor(domain, cutoff),
          ),
          expected,
          `${domain.name} ${status} cutoff ${label}`,
        );
      }
      const correlatedAt60 = invocationFor(
        domain,
        ids,
        [windowId],
        60,
      );
      const otherDomainCandidate =
        domain.name === "canonical"
          ? `ocand_${"z".repeat(16)}`
          : `cand_${"z".repeat(16)}`;
      const duplicateCandidateInvocation = clone(correlatedAt60);
      duplicateCandidateInvocation.candidates.push(
        clone(duplicateCandidateInvocation.candidates[0]),
      );
      const duplicateWindowInvocation = clone(correlatedAt60);
      duplicateWindowInvocation.available_windows.push(
        clone(duplicateWindowInvocation.available_windows[0]),
      );
      for (const [block, invocation, immutables, expectedBinding, label] of [
        [
          placement(domain.candidate("z"), windowId, 60, 90),
          correlatedAt60,
          [],
          correlationFor(domain, 60),
          "unknown-candidate",
        ],
        [
          placement(ids[0], domain.window("z"), 60, 90),
          correlatedAt60,
          [],
          correlationFor(domain, 60),
          "unknown-window",
        ],
        [
          placement(otherDomainCandidate, windowId, 60, 90),
          correlatedAt60,
          [],
          correlationFor(domain, 60),
          "cross-domain",
        ],
        [
          first,
          duplicateCandidateInvocation,
          [],
          correlationFor(domain, 60),
          "duplicate-candidate-map",
        ],
        [
          first,
          duplicateWindowInvocation,
          [],
          correlationFor(domain, 60),
          "duplicate-window-map",
        ],
        [
          first,
          invocationFor(domain, ids, [windowId], 61),
          [],
          correlationFor(domain, 60),
          "wrong-cutoff-correlation",
        ],
        [
          first,
          correlatedAt60,
          [
            clone(first),
            placement(ids[0], windowId, 30, 60),
          ],
          correlationFor(domain, 60),
          "conflicting-immutable-relation",
        ],
        [
          first,
          correlatedAt60,
          [
            placement(
              domain.candidate("z"),
              windowId,
              30,
              60,
            ),
          ],
          correlationFor(domain, 60),
          "dangling-immutable-candidate",
        ],
      ]) {
        assert.equal(
          replanCutoffClassification(
            domain.contract,
            status,
            block,
            invocation,
            immutables,
            expectedBinding,
          ),
          "schema_mismatch",
          `${domain.name} ${status} cutoff ${label}`,
        );
      }

      for (const [blocks, fixed, immutables, expected, label] of [
        [[first, adjacent], [], [], "feasible", "adjacent"],
        [
          [first, overlapping],
          [],
          [],
          "validator_rejected",
          "execution-execution",
        ],
        [
          [first],
          [{ start_minute_kst: 89, end_minute_kst: 100 }],
          [],
          "validator_rejected",
          "execution-fixed",
        ],
        [
          [first],
          [],
          [placement(ids[1], windowId, 80, 100)],
          "validator_rejected",
          "execution-immutable",
        ],
        [[first], [], [clone(first)], "feasible", "immutable-self"],
        [
          [first],
          [],
          [clone(first), clone(first)],
          "schema_mismatch",
          "immutable-self-ambiguous",
        ],
        [
          [],
          [],
          [first, placement(ids[1], windowId, 80, 100)],
          "validator_rejected",
          "immutable-immutable-preflight",
        ],
        [
          [],
          [{ start_minute_kst: 89, end_minute_kst: 100 }],
          [first],
          "validator_rejected",
          "immutable-fixed-preflight",
        ],
      ]) {
        assert.equal(
          pairwiseBlockNonOverlapClassification(
            domain.contract,
            status,
            blocks,
            fixed,
            immutables,
          ),
          expected,
          `${domain.name} ${status} overlap ${label}`,
        );
      }

      const prerequisiteCandidates = [
        {
          ephemeral_opaque_candidate_id: ids[0],
          prerequisite_candidate_ids: [],
        },
        {
          ephemeral_opaque_candidate_id: ids[1],
          prerequisite_candidate_ids: [],
        },
        {
          ephemeral_opaque_candidate_id: ids[3],
          prerequisite_candidate_ids: [ids[0], ids[1]],
        },
      ];
      const prerequisiteOne = placement(ids[0], windowId, 30, 60);
      const prerequisiteTwo = placement(ids[1], windowId, 60, 90);
      const dependent = placement(ids[3], windowId, 90, 120);
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          [prerequisiteCandidates[0]],
          [prerequisiteOne],
        ),
        "feasible",
        `${domain.name} ${status} empty prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          prerequisiteCandidates,
          [prerequisiteOne, prerequisiteTwo, dependent],
        ),
        "feasible",
        `${domain.name} ${status} multiple prerequisites and equality`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          prerequisiteCandidates,
          [
            prerequisiteOne,
            placement(ids[1], windowId, 61, 91),
            dependent,
          ],
        ),
        "validator_rejected",
        `${domain.name} ${status} reversed prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          prerequisiteCandidates,
          [prerequisiteOne, dependent],
          [{ ephemeral_opaque_candidate_id: ids[1] }],
        ),
        "validator_rejected",
        `${domain.name} ${status} unassigned prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          prerequisiteCandidates,
          [dependent],
        ),
        "validator_rejected",
        `${domain.name} ${status} known missing prerequisite`,
      );
      const crossDomainId =
        domain.name === "canonical"
          ? `ocand_${"x".repeat(16)}`
          : `cand_${"x".repeat(16)}`;
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          [
            {
              ephemeral_opaque_candidate_id: ids[2],
              prerequisite_candidate_ids: [crossDomainId],
            },
          ],
          [placement(ids[2], windowId, 120, 150)],
        ),
        "schema_mismatch",
        `${domain.name} ${status} cross-domain prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          [
            {
              ephemeral_opaque_candidate_id: ids[2],
              prerequisite_candidate_ids: [domain.candidate("z")],
            },
          ],
          [placement(ids[2], windowId, 120, 150)],
        ),
        "schema_mismatch",
        `${domain.name} ${status} dangling prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          [
            prerequisiteCandidates[0],
            {
              ephemeral_opaque_candidate_id: ids[2],
              prerequisite_candidate_ids: [ids[0], ids[0]],
            },
          ],
          [prerequisiteOne, placement(ids[2], windowId, 60, 90)],
        ),
        "schema_mismatch",
        `${domain.name} ${status} duplicate prerequisite relation`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          status,
          [
            prerequisiteCandidates[0],
            clone(prerequisiteCandidates[0]),
          ],
          [prerequisiteOne],
        ),
        "schema_mismatch",
        `${domain.name} ${status} non-bijective dependent resolution`,
      );

      const immutablePrerequisitePlacements = [
        clone(prerequisiteOne),
        clone(prerequisiteTwo),
        clone(dependent),
      ];
      const immutablePrerequisiteSnapshot = clone(
        immutablePrerequisitePlacements,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          "immutable_preflight",
          prerequisiteCandidates,
          immutablePrerequisitePlacements,
        ),
        "feasible",
        `${domain.name} immutable preflight equality`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          "immutable_preflight",
          prerequisiteCandidates,
          [
            prerequisiteOne,
            placement(ids[1], windowId, 61, 91),
            dependent,
          ],
        ),
        "validator_rejected",
        `${domain.name} immutable preflight reversed prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          "immutable_preflight",
          prerequisiteCandidates,
          [dependent],
        ),
        "validator_rejected",
        `${domain.name} immutable preflight missing prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          "immutable_preflight",
          prerequisiteCandidates,
          [prerequisiteOne, dependent],
          [{ ephemeral_opaque_candidate_id: ids[1] }],
        ),
        "validator_rejected",
        `${domain.name} immutable preflight unassigned prerequisite`,
      );
      assert.equal(
        prerequisiteOrderingClassification(
          domain.contract,
          "immutable_preflight",
          [
            {
              ephemeral_opaque_candidate_id: ids[2],
              prerequisite_candidate_ids: [domain.candidate("z")],
            },
          ],
          [placement(ids[2], windowId, 120, 150)],
        ),
        "schema_mismatch",
        `${domain.name} immutable preflight dangling relation`,
      );
      assert.deepEqual(
        immutablePrerequisitePlacements,
        immutablePrerequisiteSnapshot,
        `${domain.name} immutable prerequisite preflight cannot mutate placements`,
      );
    }
  }

  const canonical = domains[0];
  const fallbackWindow = canonical.window("f");
  const earlyBlock = placement(
    canonical.candidate("p"),
    fallbackWindow,
    59,
    89,
  );
  const validFallback = placement(
    canonical.candidate("q"),
    fallbackWindow,
    60,
    90,
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      replanCutoffClassification(
        canonical.contract,
        "optimal",
        earlyBlock,
        invocationFor(
          canonical,
          [
            earlyBlock.ephemeral_opaque_candidate_id,
            validFallback.ephemeral_opaque_candidate_id,
          ],
          [fallbackWindow],
          60,
        ),
        [],
        correlationFor(canonical, 60),
      ),
      replanCutoffClassification(
        canonical.contract,
        "canonical_native_fallback",
        validFallback,
        invocationFor(
          canonical,
          [
            earlyBlock.ephemeral_opaque_candidate_id,
            validFallback.ephemeral_opaque_candidate_id,
          ],
          [fallbackWindow],
          60,
        ),
        [],
        correlationFor(canonical, 60),
      ),
    ),
    {
      status: "fallback",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    },
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      pairwiseBlockNonOverlapClassification(
        canonical.contract,
        "canonical_native_fallback",
        [validFallback],
        [{ start_minute_kst: 89, end_minute_kst: 100 }],
        [],
      ),
    ),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      replanCutoffClassification(
        canonical.contract,
        "canonical_native_fallback",
        earlyBlock,
        invocationFor(
          canonical,
          [earlyBlock.ephemeral_opaque_candidate_id],
          [fallbackWindow],
          60,
        ),
        [],
        correlationFor(canonical, 60),
      ),
    ),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
    "a before-cutoff fallback releases no plan",
  );
  const prerequisiteId = canonical.candidate("r");
  const dependentId = canonical.candidate("s");
  const fallbackPrerequisiteCandidates = [
    {
      ephemeral_opaque_candidate_id: prerequisiteId,
      prerequisite_candidate_ids: [],
    },
    {
      ephemeral_opaque_candidate_id: dependentId,
      prerequisite_candidate_ids: [prerequisiteId],
    },
  ];
  const fallbackPrerequisite = placement(
    prerequisiteId,
    fallbackWindow,
    30,
    60,
  );
  const fallbackDependent = placement(
    dependentId,
    fallbackWindow,
    60,
    90,
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      prerequisiteOrderingClassification(
        canonical.contract,
        "canonical_native_fallback",
        fallbackPrerequisiteCandidates,
        [fallbackPrerequisite, fallbackDependent],
      ),
    ),
    {
      status: "fallback",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: true,
    },
  );
  assert.deepEqual(
    gatewayOutcomeAfterHardDeadlineValidation(
      "validator_rejected",
      prerequisiteOrderingClassification(
        canonical.contract,
        "canonical_native_fallback",
        fallbackPrerequisiteCandidates,
        [fallbackDependent],
      ),
    ),
    {
      status: "blocked_manual_plan_required",
      triggeringClassification: "validator_rejected",
      nativeFallbackAttempts: 1,
      candidatePlanReleased: false,
      canonicalNativeFallbackReleased: false,
    },
    "a prerequisite-invalid fallback releases no plan",
  );
  const immutableSnapshot = clone(validFallback);
  replanCutoffClassification(
    canonical.contract,
    "canonical_native_fallback",
    validFallback,
    invocationFor(
      canonical,
      [validFallback.ephemeral_opaque_candidate_id],
      [fallbackWindow],
      1440,
    ),
    [clone(validFallback)],
    correlationFor(canonical, 1440),
  );
  assert.deepEqual(validFallback, immutableSnapshot);

  const requiredFixtureIds = [
    "replan_cutoff_null",
    "replan_cutoff_zero",
    "replan_cutoff_exact_equality",
    "replan_cutoff_one_minute_early",
    "replan_cutoff_1440_no_new_or_moved_block",
    "replan_cutoff_exact_immutable_exemption",
    "replan_cutoff_ambiguous_immutable_matching",
    "half_open_adjacent_intervals",
    "execution_execution_overlap",
    "execution_fixed_overlap",
    "execution_immutable_overlap",
    "exact_immutable_self_representation",
    "prerequisite_empty",
    "prerequisite_exact_equality",
    "prerequisite_reversed",
    "prerequisite_unassigned",
    "prerequisite_multiple_all_required",
    "relational_projected_identifier_domain_optimal",
    "relational_projected_identifier_domain_feasible",
    "relational_canonical_identifier_domain_optimal",
    "relational_canonical_identifier_domain_feasible",
    "relational_canonical_native_fallback_valid",
    "relational_canonical_native_fallback_invalid",
    "relational_immutable_preflight",
    "relational_coordinated_enforcement_removal",
  ];
  const secondCorrectiveContractIsClosed = (value) =>
    c3ResultValidationContractsAreClosed(value) &&
    projectedResultGatewayContractIsClosed(value) &&
    requiredFixtureIds.every((fixtureId) =>
      value.fixtureMatrix.scenarioFixtureIds.includes(fixtureId),
    );
  assert.equal(secondCorrectiveContractIsClosed(scheduler), true);
  assert.deepEqual(
    scheduler.optimizerProjectedResultContract.inverseMappingContract
      .identifierBearingPathsExactly,
    PROJECTED_RESULT_ID_PATHS,
  );

  const hostileMutations = [
    (value) => {
      delete value.optimizerProjectedResultContract
        .replanCutoffFeasibilityRules;
    },
    (value) => {
      delete value.resultContract.pairwiseBlockNonOverlapRules;
    },
    (value) => {
      delete value.optimizerProjectedResultContract
        .prerequisiteOrderingRules;
    },
    (value) => {
      value.hardConstraints = value.hardConstraints.filter(
        (code) =>
          code !==
          "new_or_moved_execution_block_starts_at_or_after_replan_cutoff",
      );
    },
    (value) => {
      value.nativeValidator
        .validatedNativeFallbackMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingAndAllHardConstraints =
        false;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract
        .projectionRules
        .immutableCutoffOverlapOrPrerequisiteIncompatibilityMayReachOptimizer =
        true;
    },
    (value) => {
      value.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
        .failureStatusFixtureResultSetDigestContract
        .validNativeFallbackResultMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingWhenManualBlockDigestIsNull =
        false;
    },
    (value) => {
      value.fixtureMatrix.scenarioFixtureIds =
        value.fixtureMatrix.scenarioFixtureIds.filter(
          (fixtureId) =>
            fixtureId !== "relational_coordinated_enforcement_removal",
        );
    },
    (value) => {
      delete value.optimizerProjectedResultContract
        .replanCutoffFeasibilityRules;
      delete value.optimizerProjectedResultContract
        .pairwiseBlockNonOverlapRules;
      delete value.optimizerProjectedResultContract
        .prerequisiteOrderingRules;
      delete value.resultContract.replanCutoffFeasibilityRules;
      delete value.resultContract.pairwiseBlockNonOverlapRules;
      delete value.resultContract.prerequisiteOrderingRules;
      const removedCodes = new Set([
        "new_or_moved_execution_block_starts_at_or_after_replan_cutoff",
        "block_overlap_zero",
        "prerequisite_order_violations_zero",
      ]);
      const retained = (code) => !removedCodes.has(code);
      value.hardConstraints = value.hardConstraints.filter(retained);
      value.optimizerProjectedResultContract.closedEnumValues.constraint_code_enum =
        value.optimizerProjectedResultContract.closedEnumValues.constraint_code_enum.filter(
          retained,
        );
      value.resultContract.closedEnumValues.constraint_code_enum =
        value.resultContract.closedEnumValues.constraint_code_enum.filter(
          retained,
        );
      const projectionRules =
        value.inputContract.optimizerInvocationProjectionContract
          .projectionRules;
      for (const field of [
        "immutablePriorPlacementsMustPassExactReplanCutoffExemptionResolutionBeforeProjection",
        "exactImmutableReplanCutoffExemptionFields",
        "exactImmutableReplanCutoffExemptionMustMatchExactlyOneElapsedOrInProgressPriorPlacementThroughSameCorrelatedInvocation",
        "ambiguousImmutableReplanCutoffExemptionMatchingStatus",
        "nonExemptPlacementMustStartAtOrAfterNonNullReplanCutoff",
        "nullReplanCutoffMeansNoReplanLowerBound",
        "replanCutoffEqualityIsFeasible",
        "replanCutoff1440AllowsNoNewOrMovedExecutionBlock",
        "immutablePriorPlacementsMustBePairwiseNonOverlappingWithEveryCurrentFixedBlockBeforeProjection",
        "immutablePriorPlacementsMustRemainPairwiseNonOverlappingBeforeProjection",
        "exactUnchangedImmutableSelfRepresentationIsOneLogicalBlockAndDoesNotOverlapItself",
        "ambiguousImmutableSelfRepresentationMatchingStatus",
        "placedImmutableDependentMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStartBeforeProjection",
        "immutablePrerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus",
        "immutablePrerequisiteKnownMissingUnassignedOrReversedPlacementStatus",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityMayReachOptimizer",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallbackWithoutRewritingImmutableOrFixedPlacements",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackResult",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback",
      ]) {
        delete projectionRules[field];
      }
      projectionRules.elapsedAndInProgressPlacementsBecomeImmutablePriorPlacements =
        false;

      const priorRules =
        value.inputContract.priorAcceptedScheduleRules;
      for (const field of [
        "elapsedAndInProgressPlacementMustResolveExactlyOneImmutableReplanCutoffExemptionByCandidateWindowStartEndAndDurationBeforeProjection",
        "ambiguousImmutableReplanCutoffExemptionMatchingStatus",
        "nonExemptNewOrMovedPlacementMustStartAtOrAfterNonNullReplanCutoff",
        "nullReplanCutoffMeansNoReplanLowerBound",
        "replanCutoffEqualityIsFeasible",
        "replanCutoff1440AllowsNoNewOrMovedExecutionBlock",
        "elapsedAndInProgressPlacementMustBePairwiseNonOverlappingWithEveryCurrentFixedBlockBeforeProjection",
        "elapsedAndInProgressPlacementsMustRemainPairwiseNonOverlappingBeforeProjection",
        "exactUnchangedImmutableSelfRepresentationIsOneLogicalBlockAndDoesNotOverlapItself",
        "ambiguousImmutableSelfRepresentationMatchingStatus",
        "placedElapsedOrInProgressDependentMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStartBeforeProjection",
        "immutablePrerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus",
        "immutablePrerequisiteKnownMissingUnassignedOrReversedPlacementStatus",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityMayReachOptimizer",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallbackWithoutMovingDroppingUnassigningShorteningExtendingOrRewritingImmutableOrFixedPlacements",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackResult",
        "immutableCutoffOverlapOrPrerequisiteIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback",
      ]) {
        delete priorRules[field];
      }
      priorRules.newOrMovedPlacementMayStartBeforeCutoff = true;
      priorRules.placementsMustBeNonOverlappingAndWithinPriorDayBounds =
        false;
      priorRules.elapsedOrInProgressPlacementMayBeDroppedShortenedMovedOrDuplicated =
        true;
      priorRules.immutablePlacementOrCurrentCandidatePolicyMayBeRewrittenToRepairIncompatibility =
        true;

      const gateway =
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract;
      gateway.optimalOrFeasibleBranchOrderExactly[2] =
        "validate_projected_candidate_accounting_duration_non_droppable_candidate_window_and_hard_deadline_rules_using_trusted_gateway_context";
      gateway.optimalOrFeasibleBranchOrderExactly[7] =
        "validate_complete_canonical_result_contract_and_every_native_hard_constraint";
      gateway.solverOrTrustedGatewayFailureBranchOrderExactly[5] =
        "validate_complete_canonical_result_contract_candidate_accounting_duration_non_droppable_candidate_window_hard_deadline_and_every_hard_constraint";
      value.optimizerProjectedResultContract.processingOrderExactly[6] =
        "validate_complete_canonical_result_contract_and_every_native_hard_constraint";
      for (const field of [
        "replanCutoffStructuralMappingCorrelationOrAmbiguousImmutableMatchingFailureStatus",
        "knownBeforeCutoffPlacementStatus",
        "pairwiseNonOverlapStructuralMappingCorrelationOrAmbiguousImmutableSelfMatchingFailureStatus",
        "knownBlockOverlapStatus",
        "prerequisiteUnknownDanglingDuplicateCrossDomainOrNonBijectiveRelationStatus",
        "knownMissingUnassignedOrReversedPrerequisitePlacementStatus",
        "knownPrerequisitePlacementFailureClassificationPrecedesGenericCandidateAccountingOmissionClassification",
        "everyKnownCutoffOverlapOrPrerequisiteFailureMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback",
      ]) {
        delete value.optimizerProjectedResultContract.failureRouting[field];
      }

      delete value.resultContract.fallbackValueRules
        .referencedNativeFallbackMustBeSeparatelyValidatedAgainstCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingBeforeRelease;
      delete value.resultContract.fallbackValueRules
        .missingUnavailableNonDroppableInvalidCandidateWindowInvalidHardDeadlineInvalidReplanCutoffOverlappingInvalidPrerequisiteInvalidCanonicalVersionInfoOrHardConstraintInvalidNativePlanResult;
      for (const field of [
        "validatedNativeFallbackMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingAndAllHardConstraints",
        "everyNewOrMovedExecutionBlockInOptimalFeasibleAndReleasableValidatedNativeFallbackMustStartAtOrAfterNonNullReplanCutoffUnlessItIsTheUniqueExactImmutableElapsedOrInProgressSelfRepresentation",
        "everyOptimalFeasibleAndReleasableValidatedNativeFallbackPlanMustSatisfyHalfOpenPairwiseNonOverlapForExecutionExecutionExecutionFixedAndNewOrMovedExecutionImmutablePairs",
        "everyPlacedDependentInOptimalFeasibleAndReleasableValidatedNativeFallbackMustHaveEveryPrerequisitePlacedExactlyOnceAndEndingAtOrBeforeDependentStart",
        "cutoffOverlapOrPrerequisiteStructuralMappingCorrelationAmbiguityStatus",
        "knownBeforeCutoffOverlapMissingUnassignedOrReversedPrerequisiteStatus",
        "knownPrerequisitePlacementFailureClassificationPrecedesGenericCandidateAccountingOmissionClassification",
        "immutableElapsedOrInProgressPlacementMustPassUniqueExactCutoffExemptionPairwiseNonOverlapAndPrerequisiteOrderingPreflightAndMayNotBeMovedDroppedUnassignedShortenedExtendedOrRewrittenDuringValidationOrFallback",
        "fixedBlockMayBeRewrittenToRepairOverlap",
      ]) {
        delete value.nativeValidator[field];
      }

      const resolvedMembers =
        value.s237oBenchmarkAcceptanceContract
          .benchmarkResultDigestContract.resolvedArtifactMembersContract;
      const rejectedAttempt =
        resolvedMembers.rejectedNativeFallbackAttemptValidationRecordContract;
      rejectedAttempt.fieldSchemas.rejection_code_enum =
        rejectedAttempt.fieldSchemas.rejection_code_enum.filter(
          (code) =>
            ![
              "replan_cutoff_invalid",
              "block_overlap_invalid",
              "prerequisite_order_invalid",
            ].includes(code),
        );
      rejectedAttempt.rejectionValidationOrderExactly =
        rejectedAttempt.rejectionValidationOrderExactly.filter(
          (step) =>
            ![
              "replan_cutoff_feasibility",
              "pairwise_block_non_overlap",
              "prerequisite_ordering",
            ].includes(step),
        );
      delete resolvedMembers.verificationRules
        .validFailureFallbackMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrdering;
      delete value.s237oBenchmarkAcceptanceContract
        .benchmarkResultDigestContract
        .failureStatusFixtureResultSetDigestContract
        .validNativeFallbackResultMustSatisfyCanonicalReplanCutoffPairwiseBlockNonOverlapAndPrerequisiteOrderingWhenManualBlockDigestIsNull;

      const allSecondCorrectiveFixtureIds = new Set(requiredFixtureIds);
      value.fixtureMatrix.scenarioFixtureIds =
        value.fixtureMatrix.scenarioFixtureIds.filter(
          (fixtureId) => !allSecondCorrectiveFixtureIds.has(fixtureId),
        );
    },
  ];
  for (const mutate of hostileMutations) {
    const hostile = clone(scheduler);
    mutate(hostile);
    assert.equal(secondCorrectiveContractIsClosed(hostile), false);
  }
});

test("C3 result accounting is an exact invocation partition and hostile candidate sets fail closed", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  assert.equal(projectedResultGatewayContractIsClosed(scheduler), true);

  const canonicalCandidateIds = [
    `cand_${"a".repeat(16)}`,
    `cand_${"b".repeat(16)}`,
    `cand_${"c".repeat(16)}`,
  ];
  const projectedCandidateIds = [
    `ocand_${"a".repeat(16)}`,
    `ocand_${"b".repeat(16)}`,
    `ocand_${"c".repeat(16)}`,
  ];
  const blocksFor = (candidateIds) => [
    { ephemeral_opaque_candidate_id: candidateIds[0] },
    { ephemeral_opaque_candidate_id: candidateIds[1] },
  ];
  const unassignedFor = (candidateIds) => [
    { ephemeral_opaque_candidate_id: candidateIds[2] },
  ];

  for (const candidateIds of [canonicalCandidateIds, projectedCandidateIds]) {
    assert.equal(
      candidateAccountingIsExact(
        candidateIds,
        blocksFor(candidateIds),
        unassignedFor(candidateIds),
      ),
      true,
    );
    assert.equal(
      candidateAccountingIsExact(
        [candidateIds[0], candidateIds[1], candidateIds[1]],
        blocksFor(candidateIds),
        unassignedFor(candidateIds),
      ),
      false,
      "duplicate invocation candidate rows must fail before set accounting",
    );

    const hostilePartitions = [
      [
        "omitted candidate",
        blocksFor(candidateIds).slice(0, 1),
        unassignedFor(candidateIds),
      ],
      [
        "unknown extra candidate",
        [
          ...blocksFor(candidateIds),
          {
            ephemeral_opaque_candidate_id: candidateIds[0].startsWith("ocand_")
              ? `ocand_${"z".repeat(16)}`
              : `cand_${"z".repeat(16)}`,
          },
        ],
        unassignedFor(candidateIds),
      ],
      [
        "equal counts but one omitted and one unknown",
        blocksFor(candidateIds),
        [
          {
            ephemeral_opaque_candidate_id: candidateIds[0].startsWith("ocand_")
              ? `ocand_${"z".repeat(16)}`
              : `cand_${"z".repeat(16)}`,
          },
        ],
      ],
      [
        "duplicate execution candidate",
        [...blocksFor(candidateIds), blocksFor(candidateIds)[0]],
        unassignedFor(candidateIds),
      ],
      [
        "duplicate unassigned candidate",
        blocksFor(candidateIds),
        [...unassignedFor(candidateIds), unassignedFor(candidateIds)[0]],
      ],
      [
        "placed and unassigned overlap",
        blocksFor(candidateIds),
        [
          ...unassignedFor(candidateIds),
          { ephemeral_opaque_candidate_id: candidateIds[0] },
        ],
      ],
    ];
    for (const [name, blocks, unassigned] of hostilePartitions) {
      assert.equal(
        candidateAccountingIsExact(candidateIds, blocks, unassigned),
        false,
        `${name} must fail exact accounting`,
      );
    }

    const diagnosticViolationCandidateIds = [candidateIds[1]];
    assert.equal(diagnosticViolationCandidateIds.length, 1);
    assert.equal(
      candidateAccountingIsExact(
        candidateIds,
        [{ ephemeral_opaque_candidate_id: candidateIds[0] }],
        [{ ephemeral_opaque_candidate_id: candidateIds[2] }],
      ),
      false,
      "a candidate appearing only in violations remains omitted",
    );
  }

  const jointlyWeakenedMutations = [
    [
      "union may omit candidates",
      (contract) => {
        contract.candidateAccountingRules
          .executionBlockAndUnassignedCandidateIdSetUnionMustEqualExactCorrelatedInvocationCandidateSet =
          false;
      },
    ],
    [
      "placed and unassigned overlap allowed",
      (contract) => {
        contract.candidateAccountingRules
          .executionBlockAndUnassignedCandidateIdSetsDisjoint = false;
      },
    ],
    [
      "violation IDs satisfy accounting",
      (contract) => {
        contract.candidateAccountingRules
          .violationCandidateIdsAreDiagnosticOnlyAndCannotSatisfyAccounting =
          false;
      },
    ],
  ];
  for (const [name, mutate] of jointlyWeakenedMutations) {
    const hostile = clone(scheduler);
    mutate(hostile.resultContract);
    mutate(hostile.optimizerProjectedResultContract);
    assert.equal(
      c3ResultValidationContractsAreClosed(hostile),
      false,
      `${name} must fail even when both result contracts are weakened equally`,
    );
  }
  for (const ruleKey of Object.keys(
    scheduler.resultContract.candidateAccountingRules,
  )) {
    const missingAccountingRule = clone(scheduler);
    delete missingAccountingRule.resultContract.candidateAccountingRules[
      ruleKey
    ];
    delete missingAccountingRule.optimizerProjectedResultContract
      .candidateAccountingRules[ruleKey];
    assert.equal(
      c3ResultValidationContractsAreClosed(missingAccountingRule),
      false,
      `coordinated removal of accounting rule ${ruleKey} must fail closed`,
    );
  }
  const jointTopLevelOverride = clone(scheduler);
  jointTopLevelOverride.resultContract.allowDurationOverflow = true;
  jointTopLevelOverride.optimizerProjectedResultContract.allowDurationOverflow =
    true;
  assert.equal(
    c3ResultValidationContractsAreClosed(jointTopLevelOverride),
    false,
  );
  const jointExecutionBlockSurfaceWidening = clone(scheduler);
  for (const contract of [
    jointExecutionBlockSurfaceWidening.resultContract,
    jointExecutionBlockSurfaceWidening.optimizerProjectedResultContract,
  ]) {
    contract.executionBlockFieldsExactly.push("estimated_minutes");
    contract.scalarSchemas.estimated_minutes = "integer_1_to_1440";
  }
  assert.equal(
    c3ResultValidationContractsAreClosed(
      jointExecutionBlockSurfaceWidening,
    ),
    false,
  );

  for (const constraintCode of C3_RESULT_CONSTRAINT_CODES) {
    const missingConstraint = clone(scheduler);
    for (const constraints of [
      missingConstraint.hardConstraints,
      missingConstraint.resultContract.closedEnumValues.constraint_code_enum,
      missingConstraint.optimizerProjectedResultContract.closedEnumValues
        .constraint_code_enum,
    ]) {
      constraints.splice(constraints.indexOf(constraintCode), 1);
    }
    assert.equal(
      c3ResultValidationContractsAreClosed(missingConstraint),
      false,
      `${constraintCode} must stay in both closed violation enums and hard constraints`,
    );
  }
});

test("C4 non-droppable candidates obey the exact pinned and can-drop truth table", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);

  const buildCandidates = (prefix) => [
    {
      ephemeral_opaque_candidate_id: `${prefix}_${"a".repeat(16)}`,
      pinned: false,
      can_drop: true,
      requiredness_enum: "core",
    },
    {
      ephemeral_opaque_candidate_id: `${prefix}_${"b".repeat(16)}`,
      pinned: false,
      can_drop: false,
      requiredness_enum: "optional",
    },
    {
      ephemeral_opaque_candidate_id: `${prefix}_${"c".repeat(16)}`,
      pinned: true,
      can_drop: true,
      requiredness_enum: "optional",
    },
    {
      ephemeral_opaque_candidate_id: `${prefix}_${"d".repeat(16)}`,
      pinned: true,
      can_drop: false,
      requiredness_enum: "optional",
    },
  ];
  for (const prefix of ["cand", "ocand"]) {
    const candidates = buildCandidates(prefix);
    const executionBlocks = candidates.slice(1).map((candidate) => ({
      ephemeral_opaque_candidate_id:
        candidate.ephemeral_opaque_candidate_id,
    }));
    for (const reason_enum of scheduler.resultContract.unassignedReasons) {
      const unassigned = [
        {
          ephemeral_opaque_candidate_id:
            candidates[0].ephemeral_opaque_candidate_id,
          reason_enum,
        },
      ];
      assert.equal(
        nonDroppablePlacementIsValid(
          candidates,
          executionBlocks,
          unassigned,
        ),
        true,
        `${prefix}: pinned=false/can_drop=true may be unassigned for ${reason_enum}`,
      );
      assert.equal(
        candidateAccountingIsExact(
          candidates.map(
            (candidate) => candidate.ephemeral_opaque_candidate_id,
          ),
          executionBlocks,
          unassigned,
        ),
        true,
      );
    }

    for (const nonDroppable of candidates.slice(1)) {
      const remainingBlocks = executionBlocks.filter(
        (block) =>
          block.ephemeral_opaque_candidate_id !==
          nonDroppable.ephemeral_opaque_candidate_id,
      );
      for (const reason_enum of scheduler.resultContract.unassignedReasons) {
        assert.equal(
          nonDroppablePlacementIsValid(candidates, remainingBlocks, [
            {
              ephemeral_opaque_candidate_id:
                candidates[0].ephemeral_opaque_candidate_id,
              reason_enum: "capacity_exceeded",
            },
            {
              ephemeral_opaque_candidate_id:
                nonDroppable.ephemeral_opaque_candidate_id,
              reason_enum,
            },
          ]),
          false,
          `${prefix}: ${reason_enum} cannot override non-droppability`,
        );
      }
    }

    assert.equal(
      nonDroppablePlacementIsValid(
        candidates,
        [...executionBlocks, executionBlocks[0]],
        [
          {
            ephemeral_opaque_candidate_id:
              candidates[0].ephemeral_opaque_candidate_id,
            reason_enum: "capacity_exceeded",
          },
        ],
      ),
      false,
      `${prefix}: a non-droppable candidate cannot be placed twice`,
    );
    assert.equal(
      nonDroppablePlacementIsValid(candidates, executionBlocks, [
        {
          ephemeral_opaque_candidate_id:
            candidates[0].ephemeral_opaque_candidate_id,
          reason_enum: "capacity_exceeded",
        },
        {
          ephemeral_opaque_candidate_id:
            candidates[1].ephemeral_opaque_candidate_id,
          reason_enum: "owner_pinned_conflict",
        },
      ]),
      false,
      `${prefix}: placed-and-unassigned non-droppable candidate must fail`,
    );
  }

  const sharedRuleKeys = [
    "nonDroppableDefinitionExact",
    "pinnedAndCanDropTruthTableExactly",
    "everyNonDroppableCandidateMustOccurExactlyOnceInExecutionBlocks",
    "everyNonDroppableCandidateMustOccurZeroTimesInUnassignedCandidates",
    "onlyPinnedFalseAndCanDropTrueCandidateMayBeUnassigned",
    "unassignedReasonMayOverrideNonDroppability",
    "ownerPinnedConflictReasonMayOverrideNonDroppability",
    "lowerValueThanSelectedReasonMayOverrideNonDroppability",
    "requirednessEnumMayRedefineNonDroppability",
  ];
  for (const ruleKey of sharedRuleKeys) {
    assert.deepEqual(
      scheduler.resultContract.nonDroppableCandidateRules[ruleKey],
      scheduler.optimizerProjectedResultContract
        .nonDroppableCandidateRules[ruleKey],
    );
    const coordinatedRemoval = clone(scheduler);
    delete coordinatedRemoval.resultContract.nonDroppableCandidateRules[
      ruleKey
    ];
    delete coordinatedRemoval.optimizerProjectedResultContract
      .nonDroppableCandidateRules[ruleKey];
    assert.equal(
      c3ResultValidationContractsAreClosed(coordinatedRemoval),
      false,
      `coordinated removal of ${ruleKey} must fail closed`,
    );
  }
  assert.equal(
    scheduler.resultContract.nonDroppableCandidateRules
      .knownNonDroppableViolationStatus,
    "validator_rejected",
  );
  assert.equal(
    scheduler.resultContract.nonDroppableCandidateRules
      .releasableNativeFallbackMustPlaceEveryNonDroppableCandidateExactlyOnce,
    true,
  );
  assert.equal(
    scheduler.optimizerProjectedResultContract.nonDroppableCandidateRules
      .projectedResponseMaySelectReferenceAuthorizeOrReleaseCanonicalNativeFallback,
    false,
  );

  const missingHardConstraint = clone(scheduler);
  for (const constraints of [
    missingHardConstraint.hardConstraints,
    missingHardConstraint.resultContract.closedEnumValues.constraint_code_enum,
    missingHardConstraint.optimizerProjectedResultContract.closedEnumValues
      .constraint_code_enum,
  ]) {
    constraints.splice(
      constraints.indexOf("non_droppable_candidates_placed_exactly_once"),
      1,
    );
  }
  assert.equal(
    c3ResultValidationContractsAreClosed(missingHardConstraint),
    false,
  );
  const weakenedNativeValidator = clone(scheduler);
  weakenedNativeValidator.nativeValidator
    .everyOptimalFeasibleAndReleasableValidatedNativeFallbackPlanMustPlaceEveryNonDroppableCandidateExactlyOnceAndNeverUnassignIt =
    false;
  assert.equal(
    c3ResultValidationContractsAreClosed(weakenedNativeValidator),
    false,
  );
  const weakenedFallbackFixture = clone(scheduler);
  weakenedFallbackFixture.s237oBenchmarkAcceptanceContract
    .benchmarkResultDigestContract.failureStatusFixtureResultSetDigestContract
    .validNativeFallbackResultMustSatisfyCanonicalNonDroppableCandidateWindowAndAllC4HardConstraintsWhenManualBlockDigestIsNull =
    false;
  assert.equal(
    c3ResultValidationContractsAreClosed(weakenedFallbackFixture),
    false,
  );
});

test("C3 execution-block duration and shortening bounds reject incompatible immutable placements", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);

  const block = (candidateId, start, end, duration) => ({
    ephemeral_opaque_candidate_id: candidateId,
    start_minute_kst: start,
    end_minute_kst: end,
    duration_minutes: duration,
  });

  for (const prefix of ["cand_", "ocand_"]) {
    const fixedCandidateId = `${prefix}${"d".repeat(16)}`;
    const shortenableCandidateId = `${prefix}${"e".repeat(16)}`;
    const candidates = [
      {
        ephemeral_opaque_candidate_id: fixedCandidateId,
        estimated_minutes: 60,
        minimum_minutes: 30,
        can_shorten: false,
      },
      {
        ephemeral_opaque_candidate_id: shortenableCandidateId,
        estimated_minutes: 120,
        minimum_minutes: 60,
        can_shorten: true,
      },
    ];
    for (const valid of [
      block(fixedCandidateId, 60, 120, 60),
      block(shortenableCandidateId, 120, 180, 60),
      block(shortenableCandidateId, 180, 270, 90),
      block(shortenableCandidateId, 300, 420, 120),
    ]) {
      assert.equal(executionBlockDurationIsValid(candidates, valid), true);
    }

    const hostileDurations = [
      [
        "duration differs from end minus start",
        block(fixedCandidateId, 60, 120, 59),
      ],
      [
        "non-shortenable candidate is shortened",
        block(fixedCandidateId, 60, 105, 45),
      ],
      [
        "non-shortenable candidate exceeds estimate",
        block(fixedCandidateId, 60, 121, 61),
      ],
      [
        "shortenable candidate falls below minimum",
        block(shortenableCandidateId, 120, 179, 59),
      ],
      [
        "shortenable candidate exceeds estimate",
        block(shortenableCandidateId, 120, 241, 121),
      ],
      [
        "execution block uses an unknown current-invocation candidate",
        block(`${prefix}${"z".repeat(16)}`, 60, 120, 60),
      ],
    ];
    for (const [name, hostile] of hostileDurations) {
      assert.equal(
        executionBlockDurationIsValid(candidates, hostile),
        false,
        `${prefix}: ${name} must fail duration validation`,
      );
    }

    const duplicateCandidateRows = [...candidates, clone(candidates[0])];
    assert.equal(
      executionBlockDurationIsValid(
        duplicateCandidateRows,
        block(fixedCandidateId, 60, 120, 60),
      ),
      false,
      `${prefix}: duplicate current-invocation candidates must not collapse`,
    );

    const immutableIncompatiblePlacement = block(
      fixedCandidateId,
      60,
      105,
      45,
    );
    assert.equal(
      executionBlockDurationIsValid(
        candidates,
        immutableIncompatiblePlacement,
      ),
      false,
    );
  }
  assert.equal(
    scheduler.resultContract.executionBlockDurationRules
      .immutableElapsedOrInProgressPlacementMayBeMovedShortenedExtendedOrRewrittenToSatisfyCurrentCandidate,
    false,
  );
  assert.equal(
    scheduler.resultContract.executionBlockDurationRules
      .preProjectionImmutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult,
    "blocked_manual_plan_required",
  );
  assert.equal(
    scheduler.resultContract.executionBlockDurationRules
      .preProjectionImmutablePlacementCandidateDurationIncompatibilityFallbackTriggerStatus,
    "validator_rejected",
  );
  assert.equal(
    scheduler.resultContract.executionBlockDurationRules
      .preProjectionImmutablePlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus,
    true,
  );
  assert.equal(
    scheduler.inputContract.priorAcceptedScheduleRules
      .immutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult,
    "blocked_manual_plan_required",
  );
  assert.equal(
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityMayReachOptimizer,
    false,
  );
  assert.equal(
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy,
    true,
  );
  assert.equal(
    scheduler.inputContract.optimizerInvocationProjectionContract
      .projectionRules
      .immutablePriorPlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult,
    "blocked_manual_plan_required",
  );

  const jointlyWeakenedDuration = clone(scheduler);
  for (const contract of [
    jointlyWeakenedDuration.resultContract,
    jointlyWeakenedDuration.optimizerProjectedResultContract,
  ]) {
    contract.executionBlockDurationRules
      .canShortenTrueRequiresMinimumMinutesLessThanOrEqualDurationMinutesLessThanOrEqualEstimatedMinutes =
      false;
  }
  assert.equal(
    c3ResultValidationContractsAreClosed(jointlyWeakenedDuration),
    false,
  );

  for (const ruleKey of Object.keys(
    scheduler.resultContract.executionBlockDurationRules,
  )) {
    const missingDurationRule = clone(scheduler);
    delete missingDurationRule.resultContract.executionBlockDurationRules[
      ruleKey
    ];
    delete missingDurationRule.optimizerProjectedResultContract
      .executionBlockDurationRules[ruleKey];
    assert.equal(
      c3ResultValidationContractsAreClosed(missingDurationRule),
      false,
      `coordinated removal of duration rule ${ruleKey} must fail closed`,
    );
  }

  const hostileInputPreflightMutations = [
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .elapsedAndInProgressPlacementMustResolveExactlyOneCurrentInvocationCandidateBeforeProjection =
        false;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .elapsedAndInProgressPlacementMustSatisfyResolvedCurrentCandidateDurationAndShorteningRulesBeforeProjection =
        false;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityMayReachOptimizer =
        true;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityFallbackTriggerStatus =
        "schema_mismatch";
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus =
        false;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback =
        false;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy =
        false;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult =
        "validator_rejected";
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementCandidateDurationIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback =
        true;
    },
    (value) => {
      value.inputContract.priorAcceptedScheduleRules
        .immutablePlacementOrCurrentCandidatePolicyMayBeRewrittenToRepairIncompatibility =
        true;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementsMustPassExactCurrentCandidateDurationCompatibilityBeforeProjection =
        false;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityMayReachOptimizer =
        true;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityFallbackTriggerStatus =
        "schema_mismatch";
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityFallbackReasonEnumMustEqualTriggerStatus =
        false;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityMustAttemptExactlyOneSeparatelyValidatedNativeFallback =
        false;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityMustEnterSeparatelyValidatedNativeFallbackWithoutRewritingPlacementOrCandidatePolicy =
        false;
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityInvalidNativeFallbackResult =
        "validator_rejected";
    },
    (value) => {
      value.inputContract.optimizerInvocationProjectionContract.projectionRules
        .immutablePriorPlacementCandidateDurationIncompatibilityInvalidNativeFallbackMayTriggerAnotherFallback =
        true;
    },
  ];
  for (const mutate of hostileInputPreflightMutations) {
    const hostilePreflight = clone(scheduler);
    mutate(hostilePreflight);
    assert.equal(
      c3ResultValidationContractsAreClosed(hostilePreflight),
      false,
      "immutable placement preflight weakening must fail closed",
    );
  }

  const immutableRewriteAllowed = clone(scheduler);
  for (const contract of [
    immutableRewriteAllowed.resultContract,
    immutableRewriteAllowed.optimizerProjectedResultContract,
  ]) {
    contract.executionBlockDurationRules
      .immutableElapsedOrInProgressPlacementMayBeMovedShortenedExtendedOrRewrittenToSatisfyCurrentCandidate =
      true;
  }
  immutableRewriteAllowed.nativeValidator
    .immutableElapsedOrInProgressPlacementMayBeRewrittenDuringValidationOrFallback =
    true;
  assert.equal(
    c3ResultValidationContractsAreClosed(immutableRewriteAllowed),
    false,
  );
});

test("C4 candidate-window membership availability bounds and immutable preflight fail closed", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  const agents = await text("AGENTS.md");
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);

  const fixtureFor = (candidatePrefix, windowPrefix) => {
    const windowIds = ["a", "b", "c", "d"].map(
      (suffix) => `${windowPrefix}_${suffix.repeat(16)}`,
    );
    const candidate = {
      ephemeral_opaque_candidate_id:
        `${candidatePrefix}_${"a".repeat(16)}`,
      allowed_window_ids: windowIds.slice(0, 3),
    };
    const windows = [
      {
        ephemeral_opaque_window_id: windowIds[0],
        start_minute_kst: 100,
        end_minute_kst: 160,
        available: true,
      },
      {
        ephemeral_opaque_window_id: windowIds[1],
        start_minute_kst: 160,
        end_minute_kst: 220,
        available: true,
      },
      {
        ephemeral_opaque_window_id: windowIds[2],
        start_minute_kst: 300,
        end_minute_kst: 360,
        available: false,
      },
      {
        ephemeral_opaque_window_id: windowIds[3],
        start_minute_kst: 400,
        end_minute_kst: 460,
        available: true,
      },
    ];
    const block = (windowId, start, end, candidateId = null) => ({
      ephemeral_opaque_candidate_id:
        candidateId ?? candidate.ephemeral_opaque_candidate_id,
      ephemeral_opaque_window_id: windowId,
      start_minute_kst: start,
      end_minute_kst: end,
    });
    return { candidate, windows, windowIds, block };
  };

  for (const [candidatePrefix, windowPrefix] of [
    ["cand", "win"],
    ["ocand", "owin"],
  ]) {
    const { candidate, windows, windowIds, block } = fixtureFor(
      candidatePrefix,
      windowPrefix,
    );
    assert.equal(
      candidateWindowRelationClassification(
        [candidate],
        windows,
        block(windowIds[0], 100, 160),
      ),
      "valid",
      `${candidatePrefix}: exact outer-boundary containment must pass`,
    );
    for (const [name, hostileBlock] of [
      ["known disallowed window", block(windowIds[3], 400, 430)],
      ["unavailable allowed window", block(windowIds[2], 300, 330)],
      ["start before window", block(windowIds[0], 99, 120)],
      ["end after window", block(windowIds[0], 140, 161)],
      ["adjacent-window spanning", block(windowIds[0], 130, 190)],
      ["non-positive block", block(windowIds[0], 120, 120)],
    ]) {
      assert.equal(
        candidateWindowRelationClassification(
          [candidate],
          windows,
          hostileBlock,
        ),
        "validator_rejected",
        `${candidatePrefix}: ${name} is a known invalid relation`,
      );
    }
    assert.equal(
      candidateWindowRelationClassification(
        [candidate],
        windows,
        block(
          windowIds[0],
          100,
          130,
          `${candidatePrefix}_${"z".repeat(16)}`,
        ),
      ),
      "schema_mismatch",
      `${candidatePrefix}: unknown candidate must fail structurally`,
    );
    assert.equal(
      candidateWindowRelationClassification(
        [candidate],
        windows,
        block(`${windowPrefix}_${"z".repeat(16)}`, 100, 130),
      ),
      "schema_mismatch",
      `${candidatePrefix}: unknown window must fail structurally`,
    );
    assert.equal(
      candidateWindowRelationClassification(
        [candidate, clone(candidate)],
        windows,
        block(windowIds[0], 100, 130),
      ),
      "schema_mismatch",
      `${candidatePrefix}: duplicate candidate relation must fail structurally`,
    );
    assert.equal(
      candidateWindowRelationClassification(
        [candidate],
        [...windows, clone(windows[0])],
        block(windowIds[0], 100, 130),
      ),
      "schema_mismatch",
      `${candidatePrefix}: duplicate window relation must fail structurally`,
    );
    const duplicateAllowedRelation = clone(candidate);
    duplicateAllowedRelation.allowed_window_ids.push(windowIds[0]);
    assert.equal(
      candidateWindowRelationClassification(
        [duplicateAllowedRelation],
        windows,
        block(windowIds[0], 100, 130),
      ),
      "schema_mismatch",
      `${candidatePrefix}: duplicate allowed-window relation must fail structurally`,
    );
    const danglingAllowedRelation = clone(candidate);
    danglingAllowedRelation.allowed_window_ids.push(
      `${windowPrefix}_${"z".repeat(16)}`,
    );
    assert.equal(
      candidateWindowRelationClassification(
        [danglingAllowedRelation],
        windows,
        block(windowIds[0], 100, 130),
      ),
      "schema_mismatch",
      `${candidatePrefix}: dangling allowed-window relation must fail structurally`,
    );
    const crossDomainCandidate =
      candidatePrefix === "cand"
        ? `ocand_${"a".repeat(16)}`
        : `cand_${"a".repeat(16)}`;
    const crossDomainWindow =
      windowPrefix === "win"
        ? `owin_${"a".repeat(16)}`
        : `win_${"a".repeat(16)}`;
    assert.equal(
      candidateWindowRelationClassification(
        [candidate],
        windows,
        block(crossDomainWindow, 100, 130, crossDomainCandidate),
      ),
      "schema_mismatch",
      `${candidatePrefix}: cross-domain candidate/window IDs must fail structurally`,
    );
  }

  const sharedRuleKeys = [
    "candidateResolutionSource",
    "windowResolutionSource",
    "eachExecutionBlockCandidateMustResolveExactlyOnceThroughExactCurrentInvocation",
    "eachExecutionBlockWindowMustResolveExactlyOnceThroughSameExactCurrentInvocation",
    "executionBlockWindowIdMustBelongToResolvedCandidateAllowedWindowIds",
    "resolvedWindowAvailableMustEqualTrue",
    "singleReferencedWindowContainmentPredicateExact",
    "blockMustBeCompletelyContainedInsideSingleReferencedWindow",
    "blockMayStitchOrSpanAdjacentWindows",
    "preProjectionElapsedAndInProgressPlacementMustSatisfyExactCurrentCandidateWindowRelation",
    "preProjectionImmutableCandidateWindowIncompatibilityMayReachOptimizer",
    "preProjectionImmutableCandidateWindowIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting",
    "futurePriorPlacementRemainsSoftPreferenceOnly",
    "everyEmittedFuturePriorPlacementBlockMustSatisfyEveryCandidateWindowPredicate",
  ];
  for (const ruleKey of sharedRuleKeys) {
    assert.deepEqual(
      scheduler.resultContract.candidateWindowFeasibilityRules[ruleKey],
      scheduler.optimizerProjectedResultContract
        .candidateWindowFeasibilityRules[ruleKey],
    );
    const coordinatedRemoval = clone(scheduler);
    delete coordinatedRemoval.resultContract.candidateWindowFeasibilityRules[
      ruleKey
    ];
    delete coordinatedRemoval.optimizerProjectedResultContract
      .candidateWindowFeasibilityRules[ruleKey];
    assert.equal(
      c3ResultValidationContractsAreClosed(coordinatedRemoval),
      false,
      `coordinated removal of ${ruleKey} must fail closed`,
    );
  }
  assert.equal(
    scheduler.resultContract.candidateWindowFeasibilityRules
      .unknownDanglingDuplicateCrossDomainOrNonBijectiveCandidateOrWindowRelationStatus,
    "schema_mismatch",
  );
  assert.equal(
    scheduler.resultContract.candidateWindowFeasibilityRules
      .knownDisallowedUnavailableOrOutOfBoundsRelationStatus,
    "validator_rejected",
  );
  assert.equal(
    scheduler.resultContract.candidateWindowFeasibilityRules
      .releasableNativeFallbackMustSatisfyEveryCandidateWindowPredicate,
    true,
  );
  assert.match(
    agents,
    /Every emitted[\s\S]*block resolves one candidate and one window[\s\S]*allowed available window[\s\S]*inside that single[\s\S]*window/,
  );
  assert.match(
    agents,
    /Elapsed\/in-progress placements[\s\S]*before projection[\s\S]*may not be moved, dropped, unassigned,[\s\S]*shortened, extended, or rewritten/,
  );

  for (const constraintCode of C4_RESULT_CONSTRAINT_CODES) {
    const missingConstraint = clone(scheduler);
    for (const constraints of [
      missingConstraint.hardConstraints,
      missingConstraint.resultContract.closedEnumValues.constraint_code_enum,
      missingConstraint.optimizerProjectedResultContract.closedEnumValues
        .constraint_code_enum,
    ]) {
      constraints.splice(constraints.indexOf(constraintCode), 1);
    }
    assert.equal(
      c3ResultValidationContractsAreClosed(missingConstraint),
      false,
      `${constraintCode} must stay in hard constraints and both closed enums`,
    );
  }

  const hostileMutations = [
    [
      "native validator skips candidate-window rules",
      (value) => {
        value.nativeValidator
          .everyExecutionBlockMustResolveExactCurrentInvocationCandidateAndWindowAndSatisfyAllowedMembershipAvailabilityAndSingleWindowBounds =
          false;
      },
    ],
    [
      "canonical fallback skips candidate-window rules",
      (value) => {
        value.resultContract.candidateWindowFeasibilityRules
          .releasableNativeFallbackMustSatisfyEveryCandidateWindowPredicate =
          false;
      },
    ],
    [
      "immutable preflight may reach optimizer",
      (value) => {
        value.inputContract.priorAcceptedScheduleRules
          .immutablePlacementCandidateWindowIncompatibilityMayReachOptimizer =
          true;
        value.inputContract.optimizerInvocationProjectionContract
          .projectionRules
          .immutablePriorPlacementCandidateWindowIncompatibilityMayReachOptimizer =
          true;
      },
    ],
    [
      "immutable placement may be rewritten",
      (value) => {
        value.resultContract.candidateWindowFeasibilityRules
          .preProjectionImmutableCandidateWindowIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting =
          true;
        value.optimizerProjectedResultContract
          .candidateWindowFeasibilityRules
          .preProjectionImmutableCandidateWindowIncompatibilityMayBeRepairedByMovingDroppingUnassigningShorteningExtendingOrRewriting =
          true;
      },
    ],
    [
      "fallback fixture skips C4 validation",
      (value) => {
        value.s237oBenchmarkAcceptanceContract.benchmarkResultDigestContract
          .failureStatusFixtureResultSetDigestContract
          .validNativeFallbackResultMustSatisfyCanonicalNonDroppableCandidateWindowAndAllC4HardConstraintsWhenManualBlockDigestIsNull =
          false;
      },
    ],
    [
      "candidate-window rejection code removed",
      (value) => {
        const codes =
          value.s237oBenchmarkAcceptanceContract
            .benchmarkResultDigestContract.resolvedArtifactMembersContract
            .rejectedNativeFallbackAttemptValidationRecordContract
            .fieldSchemas.rejection_code_enum;
        codes.splice(codes.indexOf("candidate_window_relation_invalid"), 1);
      },
    ],
    [
      "gateway failure branch skips C4 canonical validation",
      (value) => {
        value.optimizerProjectedResultContract
          .canonicalGatewayConstructionContract
          .solverOrTrustedGatewayFailureBranchOrderExactly[3] =
          "validate_partial_canonical_result";
      },
    ],
  ];
  for (const [name, mutate] of hostileMutations) {
    const hostile = clone(scheduler);
    mutate(hostile);
    assert.equal(
      c3ResultValidationContractsAreClosed(hostile) &&
        projectedResultGatewayContractIsClosed(hostile),
      false,
      `${name} must fail closed`,
    );
  }
});

test("C3 every failure status requires one matching separately validated native fallback", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(c3ResultValidationContractsAreClosed(scheduler), true);
  assert.equal(
    scheduler.optimizerProjectedResultContract.failureRouting
      .everySolverFailureOrTrustedGatewayClassificationMustAttemptExactlyOneIndependentlyPreparedCanonicalNativeFallback,
    true,
  );
  assert.equal(
    scheduler.optimizerProjectedResultContract.failureRouting
      .projectedFailureEnvelopeMayContainReferenceAuthorizeOrReleaseCanonicalFallback,
    false,
  );
  assert.equal(
    scheduler.optimizerProjectedResultContract.failureRouting
      .canonicalNativeFallbackPreparedAndValidatedOnlyInOriginalIdentifierDomain,
    true,
  );

  for (const contract of [scheduler.resultContract]) {
    const usedFixtureDigests = new Set();
    for (const status of FALLBACK_STATUSES) {
      const validFallback = {
        used: true,
        reason_enum: status,
        native_plan_version: "native_plan_v1",
      };
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(contract, status, validFallback, {
          nativePlanVersionSchemaValid: true,
          nativePlanValid: true,
        }),
        true,
      );
      assert.equal(
        contract.fallbackValueRules
          .failureStatusEnvelopeMaySelfAuthorizeReferencedNativeFallbackRelease,
        false,
        "a valid-looking failure envelope remains only a trigger claim",
      );
      assert.equal(
        contract.fallbackValueRules
          .trustedNativeGatewayMustResolveOrPrepareExactImmutableCanonicalNativeFallbackIndependentlyOfOptimizerResponse,
        true,
      );
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(
          contract,
          "fallback",
          validFallback,
          {
            nativePlanVersionSchemaValid: true,
            nativePlanValid: true,
          },
        ),
        true,
        `literal fallback status must use the validated ${status} trigger envelope`,
      );
      const nativeFallbackDigest = createHash("sha256")
        .update(`valid-native-fallback:${status}`)
        .digest("hex");
      const fixtureEntry = {
        synthetic_fixture_id: `syn_s237o_${status}_fixture`,
        expected_status: status,
        observed_status: status,
        trigger_origin_enum: SOLVER_FAILURE_STATUSES.includes(status)
          ? "solver_failure"
          : "trusted_gateway_classification",
        native_fallback_result_digest_sha256: nativeFallbackDigest,
        manual_block_result_digest_sha256_or_null: null,
        assertion_result: "passed",
      };
      assert.equal(
        failureFixtureEntryIsValid(
          contract,
          fixtureEntry,
          { status, fallback: validFallback },
          { previouslyUsedNativeFallbackDigests: usedFixtureDigests },
        ),
        true,
      );
      assert.equal(
        failureFixtureEntryIsValid(
          contract,
          fixtureEntry,
          { status: "fallback", fallback: validFallback },
          { previouslyUsedNativeFallbackDigests: usedFixtureDigests },
        ),
        true,
      );
      usedFixtureDigests.add(nativeFallbackDigest);

      const otherStatus =
        FALLBACK_STATUSES.find((candidate) => candidate !== status);
      const exactManualBlockFallback = {
        used: false,
        reason_enum: "not_used",
        native_plan_version: null,
      };
      const hostileFallbacks = [
        [
          "missing fallback",
          undefined,
          { rejectionCode: "missing_fallback" },
        ],
        [
          "unused fallback",
          { used: false, reason_enum: "not_used", native_plan_version: null },
          { rejectionCode: "fallback_unused" },
        ],
        [
          "mismatched reason",
          { ...validFallback, reason_enum: otherStatus },
          { rejectionCode: "fallback_reason_mismatch" },
        ],
        [
          "mismatched result status",
          validFallback,
          {
            attemptStatus: otherStatus,
            rejectionCode: "fallback_status_mismatch",
          },
        ],
        [
          "null native version",
          { ...validFallback, native_plan_version: null },
          { rejectionCode: "native_plan_version_invalid" },
        ],
        [
          "invalid native version schema",
          validFallback,
          {
            nativePlanVersionSchemaValid: false,
            rejectionCode: "native_plan_version_invalid",
          },
        ],
        [
          "invalid native plan",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "native_plan_unresolved_or_mutable",
            nativePlanFailureCode:
              "native_plan_unresolved_or_mutable",
          },
        ],
        [
          "invalid candidate accounting",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "candidate_accounting_invalid",
            nativePlanFailureCode: "candidate_accounting_invalid",
          },
        ],
        [
          "invalid execution-block duration",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "execution_block_duration_invalid",
            nativePlanFailureCode:
              "execution_block_duration_invalid",
          },
        ],
        [
          "invalid non-droppable placement",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "non_droppable_candidate_invalid",
            nativePlanFailureCode:
              "non_droppable_candidate_invalid",
          },
        ],
        [
          "invalid candidate-window relation",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "candidate_window_relation_invalid",
            nativePlanFailureCode:
              "candidate_window_relation_invalid",
          },
        ],
        [
          "invalid replan cutoff",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "replan_cutoff_invalid",
            nativePlanFailureCode: "replan_cutoff_invalid",
          },
        ],
        [
          "invalid block overlap",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "block_overlap_invalid",
            nativePlanFailureCode: "block_overlap_invalid",
          },
        ],
        [
          "invalid prerequisite ordering",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "prerequisite_order_invalid",
            nativePlanFailureCode: "prerequisite_order_invalid",
          },
        ],
        [
          "invalid hard constraint",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "hard_constraint_invalid",
            nativePlanFailureCode: "hard_constraint_invalid",
          },
        ],
        [
          "canonical result has an extra field",
          validFallback,
          {
            canonicalResultSchemaValid: false,
            rejectionCode: "canonical_result_contract_invalid",
          },
        ],
        [
          "canonical result has wrong request correlation",
          validFallback,
          {
            canonicalResultSchemaValid: false,
            rejectionCode: "canonical_result_contract_invalid",
          },
        ],
        [
          "canonical result has an extra field and incomplete accounting",
          validFallback,
          {
            canonicalResultSchemaValid: false,
            nativePlanValid: false,
            rejectionCode: "candidate_accounting_invalid",
            nativePlanFailureCode: "candidate_accounting_invalid",
          },
        ],
        [
          "immutable placement is incompatible",
          validFallback,
          {
            nativePlanValid: false,
            rejectionCode: "immutable_placement_incompatible",
            nativePlanFailureCode:
              "immutable_placement_incompatible",
          },
        ],
      ];
      for (const [
        hostileIndex,
        [name, fallback, validation],
      ] of hostileFallbacks.entries()) {
        assert.equal(
          fallbackEnvelopeRequirementsSatisfied(
            contract,
            validation.attemptStatus ?? status,
            fallback,
            validation,
          ),
          false,
          `${status}: ${name} must not release a candidate plan`,
        );
        assert.equal(
          contract.fallbackValueRules
            .missingFallbackMismatchedReasonInvalidVersionOrInvalidNativePlanResult,
          "blocked_manual_plan_required",
        );
        assert.equal(
          contract.fallbackValueRules
            .missingFallbackMismatchedReasonInvalidVersionOrInvalidNativePlanMayReleaseCandidatePlan,
          false,
        );
        const invalidFixtureEntry = {
          synthetic_fixture_id: `syn_s237o_${status}_${hostileIndex}_invalid`,
          expected_status: status,
          observed_status: status,
          trigger_origin_enum: SOLVER_FAILURE_STATUSES.includes(status)
            ? "solver_failure"
            : "trusted_gateway_classification",
          native_fallback_result_digest_sha256: createHash("sha256")
            .update(`invalid-native-fallback:${status}:${name}`)
            .digest("hex"),
          manual_block_result_digest_sha256_or_null: createHash("sha256")
            .update(`manual-block:${status}:${name}`)
            .digest("hex"),
          assertion_result: "passed",
        };
        const invalidAttempt = {
          status: validation.attemptStatus ?? status,
          fallback,
        };
        assert.equal(
          failureFixtureEntryIsValid(
            contract,
            invalidFixtureEntry,
            invalidAttempt,
            {
              ...validation,
              manualBlockResultStatus:
                "blocked_manual_plan_required",
              manualBlockExecutionBlockCount: 0,
              manualBlockReferencesNativePlan: false,
              manualBlockFallback: exactManualBlockFallback,
            },
          ),
          true,
          `${status}: ${name} must resolve only through the exact manual block branch`,
        );
        const swappedRejectionCode = NATIVE_FALLBACK_REJECTION_CODES.find(
          (code) => code !== validation.rejectionCode,
        );
        assert.equal(
          failureFixtureEntryIsValid(
            contract,
            invalidFixtureEntry,
            invalidAttempt,
            {
              ...validation,
              rejectionCode: swappedRejectionCode,
              manualBlockResultStatus:
                "blocked_manual_plan_required",
              manualBlockFallback: exactManualBlockFallback,
            },
          ),
          false,
          `${status}: ${name} cannot be mislabeled with another valid rejection code`,
        );
        assert.equal(
          failureFixtureEntryIsValid(
            contract,
            {
              ...invalidFixtureEntry,
              manual_block_result_digest_sha256_or_null: null,
            },
            invalidAttempt,
            validation,
          ),
          false,
          `${status}: ${name} cannot pass without a manual block digest`,
        );
        assert.equal(
          failureFixtureEntryIsValid(
            contract,
            invalidFixtureEntry,
            invalidAttempt,
            {
              ...validation,
              manualBlockResultStatus:
                "blocked_manual_plan_required",
              manualBlockExecutionBlockCount: 1,
              manualBlockFallback: exactManualBlockFallback,
            },
          ),
          false,
          `${status}: ${name} manual block cannot contain execution blocks`,
        );
        assert.equal(
          failureFixtureEntryIsValid(
            contract,
            invalidFixtureEntry,
            invalidAttempt,
            {
              ...validation,
              manualBlockResultStatus:
                "blocked_manual_plan_required",
              manualBlockReferencesNativePlan: true,
              manualBlockFallback: exactManualBlockFallback,
            },
          ),
          false,
          `${status}: ${name} manual block cannot release a referenced native plan`,
        );
        for (const hostileManualBlockFallback of [
          {
            used: true,
            reason_enum: status,
            native_plan_version: "native_plan_v1",
          },
          {
            used: false,
            reason_enum: status,
            native_plan_version: null,
          },
          {
            used: false,
            reason_enum: "not_used",
            native_plan_version: "native_plan_v1",
          },
        ]) {
          assert.equal(
            failureFixtureEntryIsValid(
              contract,
              invalidFixtureEntry,
              invalidAttempt,
              {
                ...validation,
                manualBlockResultStatus:
                  "blocked_manual_plan_required",
                manualBlockFallback: hostileManualBlockFallback,
              },
            ),
            false,
            `${status}: ${name} manual block fallback tuple must be used=false/not_used/null`,
          );
        }
      }

      const incompleteNativeFallbackCandidateIds = [
        `cand_${"f".repeat(16)}`,
        `cand_${"g".repeat(16)}`,
      ];
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(
          contract,
          status,
          validFallback,
          {
            nativePlanVersionSchemaValid: true,
            nativePlanValid: true,
          },
        ) &&
          candidateAccountingIsExact(
            incompleteNativeFallbackCandidateIds,
            [
              {
                ephemeral_opaque_candidate_id:
                  incompleteNativeFallbackCandidateIds[0],
              },
            ],
            [],
          ),
        false,
        `${status}: valid-looking fallback metadata cannot release incomplete accounting`,
      );
    }

    assert.equal(
      fallbackEnvelopeRequirementsSatisfied(contract, "fallback", {
        used: true,
        reason_enum: "fallback",
        native_plan_version: "native_plan_v1",
      }),
      false,
      "literal fallback is not itself an allowed trigger reason",
    );
    const reusedDigest = "b".repeat(64);
    const firstStatus = FALLBACK_STATUSES[0];
    const secondStatus = FALLBACK_STATUSES[1];
    const firstEntry = {
      synthetic_fixture_id: `syn_s237o_${firstStatus}_reuse`,
      expected_status: firstStatus,
      observed_status: firstStatus,
      trigger_origin_enum: SOLVER_FAILURE_STATUSES.includes(firstStatus)
        ? "solver_failure"
        : "trusted_gateway_classification",
      native_fallback_result_digest_sha256: reusedDigest,
      manual_block_result_digest_sha256_or_null: null,
      assertion_result: "passed",
    };
    const secondEntry = {
      synthetic_fixture_id: `syn_s237o_${secondStatus}_reuse`,
      expected_status: secondStatus,
      observed_status: secondStatus,
      trigger_origin_enum: SOLVER_FAILURE_STATUSES.includes(secondStatus)
        ? "solver_failure"
        : "trusted_gateway_classification",
      native_fallback_result_digest_sha256: reusedDigest,
      manual_block_result_digest_sha256_or_null: null,
      assertion_result: "passed",
    };
    assert.equal(
      failureFixtureEntryIsValid(
        contract,
        firstEntry,
        {
          status: "fallback",
          fallback: {
            used: true,
            reason_enum: firstStatus,
            native_plan_version: "native_plan_v1",
          },
        },
      ),
      true,
    );
    assert.equal(
      failureFixtureEntryIsValid(
        contract,
        secondEntry,
        {
          status: "fallback",
          fallback: {
            used: true,
            reason_enum: secondStatus,
            native_plan_version: "native_plan_v1",
          },
        },
        { previouslyUsedNativeFallbackDigests: new Set([reusedDigest]) },
      ),
      false,
      "one native fallback result digest cannot satisfy two triggers",
    );

    for (const status of ["optimal", "feasible"]) {
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(contract, status, {
          used: false,
          reason_enum: "not_used",
          native_plan_version: null,
        }),
        true,
      );
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(contract, status, {
          used: true,
          reason_enum: "timeout",
          native_plan_version: "native_plan_v1",
        }),
        false,
      );
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(contract, status, {
          used: false,
          reason_enum: "timeout",
          native_plan_version: null,
        }),
        false,
      );
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(contract, status, {
          used: false,
          reason_enum: "not_used",
          native_plan_version: "native_plan_v1",
        }),
        false,
      );
      assert.equal(
        fallbackEnvelopeRequirementsSatisfied(
          contract,
          status,
          undefined,
        ),
        false,
      );
    }
  }

  const jointlyOptionalFailureFallback = clone(scheduler);
  jointlyOptionalFailureFallback.resultContract.fallbackValueRules
    .everyFallbackStatusesMemberRequiresUsedTrue = false;
  assert.equal(
    c3ResultValidationContractsAreClosed(jointlyOptionalFailureFallback),
    false,
  );

  for (const ruleKey of Object.keys(
    scheduler.resultContract.fallbackValueRules,
  )) {
    const missingFallbackRule = clone(scheduler);
    delete missingFallbackRule.resultContract.fallbackValueRules[ruleKey];
    assert.equal(
      c3ResultValidationContractsAreClosed(missingFallbackRule),
      false,
      `coordinated removal of fallback rule ${ruleKey} must fail closed`,
    );
  }

  const projectedSelfAuthorization = clone(scheduler);
  projectedSelfAuthorization.optimizerProjectedResultContract.failureRouting
    .projectedFailureEnvelopeMayContainReferenceAuthorizeOrReleaseCanonicalFallback =
    true;
  assert.equal(
    projectedResultGatewayContractIsClosed(projectedSelfAuthorization),
    false,
  );

  const invalidAttemptResolverBypass = clone(scheduler);
  invalidAttemptResolverBypass.s237oBenchmarkAcceptanceContract
    .benchmarkResultDigestContract.resolvedArtifactMembersContract
    .canonicalNativeFallbackProjectionContract
    .sourceNativeFallbackDigestMustResolveToRejectedNativeFallbackAttemptValidationRecordInSameAuthorizationStoreWhenManualBlockDigestIsNonNull =
    false;
  assert.equal(
    c3ResultValidationContractsAreClosed(invalidAttemptResolverBypass),
    false,
  );

  const rejectedAttemptRecordMayLeak = clone(scheduler);
  rejectedAttemptRecordMayLeak.s237oBenchmarkAcceptanceContract
    .benchmarkResultDigestContract.resolvedArtifactMembersContract
    .rejectedNativeFallbackAttemptValidationRecordContract
    .rawRejectedNativeFallbackOutputMayAppearInRecordLogsArtifactsCachesErrorsTelemetryOrPersistedTemp =
    true;
  assert.equal(
    c3ResultValidationContractsAreClosed(rejectedAttemptRecordMayLeak),
    false,
  );

  const rejectionCodeWidened = clone(scheduler);
  rejectionCodeWidened.s237oBenchmarkAcceptanceContract
    .benchmarkResultDigestContract.resolvedArtifactMembersContract
    .rejectedNativeFallbackAttemptValidationRecordContract.fieldSchemas
    .rejection_code_enum.push("unreviewed_rejection");
  assert.equal(
    c3ResultValidationContractsAreClosed(rejectionCodeWidened),
    false,
  );

  const fallbackValidationSkipped = clone(scheduler);
  fallbackValidationSkipped.nativeValidator
    .validatedNativeFallbackMustSatisfyCanonicalCandidateAccountingExecutionBlockDurationAndAllHardConstraints =
    false;
  assert.equal(
    c3ResultValidationContractsAreClosed(fallbackValidationSkipped),
    false,
  );
});

test("O4T approved packets resolve by final digest and hostile locator mutations fail closed", async () => {
  const scheduler = await json(
    "config/dabangil-full-day-scheduler-contract.json",
  );
  assert.equal(o4tApprovedPacketResolutionContractIsClosed(scheduler), true);

  const missingStore = clone(scheduler);
  delete missingStore.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.contentAddressedStore;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(missingStore),
    false,
  );

  const wrongLookupKey = clone(scheduler);
  wrongLookupKey.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.contentAddressLookupKey =
    "proposal_digest_sha256";
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(wrongLookupKey),
    false,
  );

  const noCanonicalResolution = clone(scheduler);
  noCanonicalResolution.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract
    .allO2oAndS238ohStartAndAcceptanceUsesMustResolveExactApprovedPacketByDigestFromExactBoundStoreAndRecomputeCanonicalDigest =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(noCanonicalResolution),
    false,
  );

  const lookupFailureMayProceed = clone(scheduler);
  lookupFailureMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract
    .lookupMissAmbiguityDuplicateStoreOrPolicyMismatchCanonicalDigestMismatchOrInvalidReceiptFailsClosed =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(lookupFailureMayProceed),
    false,
  );

  const selfBootstrappingLookup = clone(scheduler);
  selfBootstrappingLookup.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .packetInternalStoreCoordinatesMayNotBootstrapTheirOwnLookup = false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(selfBootstrappingLookup),
    false,
  );

  const wrongResolverMayProceed = clone(scheduler);
  wrongResolverMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .resolvedPacketOwnerDecisionStoreRefAndPolicyDigestMustExactlyEqualTrustedResolverCoordinates =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(wrongResolverMayProceed),
    false,
  );

  const packetInternalBootstrapSource = clone(scheduler);
  packetInternalBootstrapSource.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract
    .contentAddressedStoreRefBootstrapSourcePath =
    "o4tThresholdDecisionPacket.ownerDecisionBinding.opaqueOwnerDecisionStoreRef";
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(packetInternalBootstrapSource),
    false,
  );

  const missingVerifierSchema = clone(scheduler);
  delete missingVerifierSchema.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .artifactFieldSchemas.verification_key_version;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(missingVerifierSchema),
    false,
  );

  const unsignedResolverMayProceed = clone(scheduler);
  unsignedResolverMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .verificationRules
    .dsseSignatureMustCryptographicallyVerifyAgainstExternallyResolvedCurrentTrustAnchorEntry =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(unsignedResolverMayProceed),
    false,
  );

  const attackerSelectedTrustMayProceed = clone(scheduler);
  attackerSelectedTrustMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .trustAnchorContract
    .artifactMayNotSelectIntroduceOrExtendVerificationKeyTrustRootOrAlgorithmAllowlist =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(
      attackerSelectedTrustMayProceed,
    ),
    false,
  );

  const payloadMismatchMayProceed = clone(scheduler);
  payloadMismatchMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .verificationRules
    .everySignedPayloadFieldMustExactlyEqualArtifactProjection = false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(payloadMismatchMayProceed),
    false,
  );

  const crossScopeResolverMayProceed = clone(scheduler);
  crossScopeResolverMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .verificationRules
    .authenticatedRequestOwnerPrivateScopeDigestMustEqualSignedScopeAndExternalRegistryScope =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(crossScopeResolverMayProceed),
    false,
  );

  const replayedResolverMayProceed = clone(scheduler);
  replayedResolverMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .verificationRules
    .resolverGenerationMustBeStrictlyGreaterThanLastAcceptedGenerationForSameScopeAudiencePurposeAndStagesInAppendOnlyResolverGenerationStore =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(replayedResolverMayProceed),
    false,
  );

  const unknownKeyMayProceed = clone(scheduler);
  unknownKeyMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolverBootstrapContract
    .verificationRules
    .unknownKeyWrongKeyVersionUntrustedRootWrongRootVersionDisallowedAlgorithmUnsignedInvalidSignaturePayloadMismatchScopeAudiencePurposeOrStageMismatchExpiredRevokedOrReplayFailsClosed =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(unknownKeyMayProceed),
    false,
  );

  for (const field of [
    "aliasAllowed",
    "redirectAllowed",
    "mutableOverwriteAllowed",
  ]) {
    const mutableOrRedirected = clone(scheduler);
    mutableOrRedirected.o4tPacketDigestContract
      .approvedThresholdBindingDigestContract.contentAddressedObjectRules[
      field
    ] = true;
    assert.equal(
      o4tApprovedPacketResolutionContractIsClosed(mutableOrRedirected),
      false,
      `${field} must fail closed`,
    );
  }

  const stalePacketMayProceed = clone(scheduler);
  stalePacketMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolvedPacketValidationRules
    .packetMustBeUnexpiredAtEveryO2oAndS238ohStartAndAcceptanceUse = false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(stalePacketMayProceed),
    false,
  );

  const staleReceiptMayProceed = clone(scheduler);
  staleReceiptMayProceed.o4tPacketDigestContract
    .approvedThresholdBindingDigestContract.resolvedPacketValidationRules
    .receiptSignatureTrustPathExpiryAndRevocationMustBeRevalidatedAtEveryO2oAndS238ohStartAndAcceptanceUse =
    false;
  assert.equal(
    o4tApprovedPacketResolutionContractIsClosed(staleReceiptMayProceed),
    false,
  );
});

test("roadmap has the native fork, optional fork, and deferred commercial fork", async () => {
  const roadmap = await text("roadmap/active-program.yml");

  assert.match(roadmapItem(roadmap, "S234R"), /status: completed/);
  assert.match(
    roadmapItem(roadmap, "O3A"),
    /status: completed[\s\S]*approvalAuthorizesImmediateOperation: false[\s\S]*automaticStartAllowed: false[\s\S]*manualS236AStartRequired: true[\s\S]*dependencies: \[S235A, S234R\]/,
  );
  assert.match(
    roadmapItem(roadmap, "O4V"),
    /status: completed[\s\S]*legacyPacketDisposition: superseded_rejected[\s\S]*futureS236PSyntheticProvisioningAndAcceptanceAuthorized: true[\s\S]*approvalAuthorizesImmediateOperation: false[\s\S]*automaticStartAllowed: false[\s\S]*dependencies: \[S234R\]/,
  );
  assert.match(
    roadmapItem(roadmap, "S236P"),
    /status: queued[\s\S]*dependencies: \[O4V\]/,
  );
  assert.match(
    roadmapItem(roadmap, "S236A"),
    /dependencies: \[O3A, S236P\]/,
  );
  assert.match(roadmapItem(roadmap, "O4A"), /dependencies: \[S237P\]/);
  assert.match(roadmapItem(roadmap, "S240A"), /dependencies: \[S238A\]/);
  assert.match(roadmapItem(roadmap, "S241A"), /dependencies: \[S240A\]/);
  assert.doesNotMatch(
    roadmapItem(roadmap, "S241A"),
    /S237O|O4T|O2O|S238OH|S238OV|O4P|S239O|S240O/,
  );
  assert.match(roadmapItem(roadmap, "S237O"), /dependencies: \[S237P\]/);
  assert.match(roadmapItem(roadmap, "O2O"), /dependencies: \[O4T\]/);
  assert.match(roadmapItem(roadmap, "S238OH"), /dependencies: \[S238A, O2O\]/);
  assert.match(
    roadmapItem(roadmap, "O4P"),
    /dependencies: \[S238OV, S240A\]/,
  );
  assert.match(roadmapItem(roadmap, "S240O"), /dependencies: \[S239O\]/);
  assert.match(roadmapItem(roadmap, "S243C"), /dependencies: \[O4F\]/);
  assert.match(roadmapItem(roadmap, "S244C"), /dependencies: \[S243C\]/);
  assert.match(roadmapItem(roadmap, "O4D"), /dependencies: \[S245C, S242V\]/);
  assert.match(roadmapItem(roadmap, "S225"), /status: queued/);
});

test("approved O3A proposal preimage remains pending and cannot bypass S236P", async () => {
  const manifest = await json(
    "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness.json",
  );
  const report = await json(
    "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness_report.json",
  );

  assert.equal(
    manifest.o3aApprovalPacket.packetId,
    "o3a-s234r-appraiser-second-2026-q1-owner-private-golden-3-v2",
  );
  assert.equal(manifest.o3aApprovalPacket.ownerApproved, false);
  assert.deepEqual(
    manifest.o3aApprovalPacket.requiredBeforeAllowedOperationRoadmapItemIds,
    ["S236P"],
  );
  assert.equal(
    manifest.o3aApprovalPacket.approvalAuthorizesImmediateOperation,
    false,
  );
  assert.equal(
    manifest.o3aApprovalPacket.o4vOrS236PSubstitutionAllowed,
    false,
  );
  assert.deepEqual(manifest.controlPlaneState.s236aMissingDependencies, [
    "O3A",
    "S236P",
  ]);
  assert.equal(report.o3aPacketDigestSha256, O3A_PACKET_SHA256);
  assert.equal(report.executionStatus, "blocked_pending_o3a_and_s236p");
});

test("the declared 30-file amendment manifest is unique and materialized", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");

  assert.deepEqual(unified.amendmentOwnedFiles, OWNED_FILES);
  assert.equal(new Set(OWNED_FILES).size, 30);
  for (const path of OWNED_FILES) {
    assert.ok((await text(path)).length > 0, `owned file is empty: ${path}`);
  }
});
