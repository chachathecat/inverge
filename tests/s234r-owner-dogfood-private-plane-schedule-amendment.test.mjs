import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PRIVATE_CONTRACT_SHA256 =
  "ef017344b184b33f8e30dcde8f25089c3e814b2aa279645bbedbd326662dacb5";
const SCHEDULER_CONTRACT_SHA256 =
  "5b531ab6970b080ade85b5fe3a011b002500ec65134a4e70ca64ba625feca06d";
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
  "validate_complete_projected_response_against_optimizerProjectedResultContract",
  "require_request_and_snapshot_correlation_equal_exact_projected_invocation_ids",
  "validate_complete_per_class_bijections",
  "inverse_map_exactly_the_six_identifier_bearing_paths",
  "verify_all_non_id_values_and_array_cardinality_and_order_are_unchanged",
  "validate_complete_inverse_mapped_object_against_canonical_resultContract",
  "native_validate_canonical_candidate_or_prepare_separately_validated_native_fallback",
  "destroy_mapping_projected_input_and_projected_response_identifier_material",
  "verify_no_projected_identifier_in_gateway_output_logs_artifacts_caches_errors_telemetry_or_persisted_temp",
  "release_only_canonical_result_validated_native_fallback_or_manual_block_from_gateway",
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

  const canonicalSharedKeys = Object.keys(canonical).filter(
    (key) => key !== "identifierSchemas",
  );
  const allCanonicalNonIdContractValuesAreExact =
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
    native_plan_version: "closed_identifier_1_to_80_or_null",
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

  return (
    projected.purpose ===
      "validate_complete_optimizer_projected_response_before_inverse_mapping" &&
    projected.identifierDomain ===
      "projected_oreq_osnp_owin_ocand_only" &&
    projected.canonicalResultContractPath === "resultContract" &&
    projected.projectedInvocationContractPath ===
      "inputContract.optimizerInvocationProjectionContract" &&
    projected.additionalFieldsAllowed === false &&
    projected.nestedAdditionalFieldsAllowed === false &&
    projected.freeTextAllowed === false &&
    allCanonicalNonIdContractValuesAreExact &&
    canonicalJson(canonical.identifierSchemas) ===
      canonicalJson(exactCanonicalIdentifierSchemas) &&
    canonicalJson(projected.identifierSchemas) ===
      canonicalJson(exactProjectedIdentifierSchemas) &&
    projected
      .allNonIdentifierSchemasEnumsRulesCardinalitiesAndOrderingMustEqualCanonicalResultContractExactly ===
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
    failure
      .missingUnknownDanglingDuplicateCrossClassOriginalDomainNonBijectiveOrPreservationFailureStatus ===
      "schema_mismatch" &&
    failure.wrongRequestOrSnapshotCorrelationStatus === "stale_response" &&
    failure.schemaMismatchAndStaleResponseMustUseSeparatelyValidatedNativeFallback ===
      true &&
    failure.invalidNativeFallbackResult ===
      "blocked_manual_plan_required" &&
    failure.failedProjectedResponseMayReachNativeValidationOrGatewayOutput ===
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

test("S234R authority is source-only and keeps every activation false", async () => {
  const unified = await json("config/dabangil-unified-program-contract.json");
  const decision = await text(
    "docs/decisions/2026-07-26-owner-dogfood-private-plane-schedule-amendment.md",
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
    true,
  );
  assert.equal(
    unified.privateAuthoringReviewPlane
      .completedS236PAcceptanceIsExactContentAddressedArtifact,
    true,
  );
  assert.match(decision, /source-only amendment/i);
  assert.match(
    decision,
    /does not approve O3A, O4V, O4A, O4T, O2O, O4P, O4F/i,
  );
  assert.match(decision, /PR #660 remains Draft and blocked/i);
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

test("private plane forbids a plaintext equality oracle and requires synthetic acceptance", async () => {
  const contract = await json(
    "config/dabangil-private-authoring-review-plane-contract.json",
  );

  assert.equal(
    contract.contractVersion,
    "dabangil.private_authoring_review_plane.v1",
  );
  assert.equal(contract.status, "contract_only_pending_o4v");
  assert.equal(contract.runtimeAuthorized, false);
  assert.equal(contract.realContentAuthorized, false);
  assert.equal(contract.provisioningAuthorized, false);
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
    /validates the complete[\s\S]*projected response[\s\S]*Only then may it inverse-map[\s\S]*validate against the unchanged canonical[\s\S]*destroyed on every success[\s\S]*or failure[\s\S]*before any[\s\S]*canonical result leaves the gateway/,
  );
  assert.doesNotMatch(agents, /remap is destroyed after the request/);
  assert.match(
    scheduleSystem,
    /retains it through all[\s\S]*six complete projected-response validations[\s\S]*destroys the mapping[\s\S]*before any canonical result set leaves the gateway/,
  );
  assert.match(
    scheduleSystem,
    /Projected IDs may not enter logs or artifacts/,
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
    /status: queued[\s\S]*dependencies: \[S235A, S234R\]/,
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

test("new O3A packet remains pending and cannot bypass S236P", async () => {
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
  assert.match(report.o3aPacketDigestSha256, /^[a-f0-9]{64}$/);
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
