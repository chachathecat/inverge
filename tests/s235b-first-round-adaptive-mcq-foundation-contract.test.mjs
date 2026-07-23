import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contractPath =
  "config/s235b-first-round-adaptive-mcq-foundation-contract.json";
const docPath =
  "docs/s235b-first-round-adaptive-mcq-foundation-contract.md";
const evidencePath =
  "docs/qa/s235b-first-round-foundation-evidence.md";
const roadmapPath = "roadmap/active-program.yml";

const rawContract = readFileSync(contractPath, "utf8");
const contract = JSON.parse(rawContract);
const doc = readFileSync(docPath, "utf8");
const evidence = readFileSync(evidencePath, "utf8");
const roadmap = readFileSync(roadmapPath, "utf8");

function roadmapItemBlock(id) {
  const marker = `  - id: ${id}\n`;
  const start = roadmap.indexOf(marker);
  assert.notEqual(start, -1, `${id} missing from active roadmap`);
  const next = roadmap.indexOf("  - id: ", start + marker.length);
  return roadmap.slice(start, next === -1 ? undefined : next);
}

function roadmapStatus(id) {
  const match = roadmapItemBlock(id).match(/\n    status: ([a-z_]+)\n/);
  assert.ok(match, `${id} status missing`);
  return match[1];
}

function sorted(values) {
  return [...values].sort();
}

function assertSameMembers(actual, expected, message) {
  assert.deepEqual(sorted(actual), sorted(expected), message);
}

function assertIncludesInvariant(shape, fragment) {
  assert.equal(
    shape.bindingInvariants.some((value) => value.includes(fragment)),
    true,
    `missing invariant fragment: ${fragment}`,
  );
}

function visitObjects(value, path = [], visit) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      visitObjects(entry, [...path, index], visit),
    );
    return;
  }
  if (value === null || typeof value !== "object") return;
  visit(value, path);
  for (const [key, entry] of Object.entries(value)) {
    visitObjects(entry, [...path, key], visit);
  }
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function withoutKey(value, key) {
  return Object.fromEntries(
    Object.entries(value).filter(([entryKey]) => entryKey !== key),
  );
}

function topPointerField(pointer) {
  if (pointer === "") return null;
  if (!pointer.startsWith("/") || pointer.includes("=")) return undefined;
  return pointer
    .slice(1)
    .split("/")[0]
    .replaceAll("~1", "/")
    .replaceAll("~0", "~");
}

function resolveDottedPath(candidate, dottedPath) {
  let value = candidate;
  for (const segment of dottedPath.split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) {
      return undefined;
    }
    value = value[segment];
  }
  return value;
}

function expectedRightsBasisCrosswalkRows(candidate) {
  const scope =
    candidate.sourceRightsManifest.futureO3BReceiptContract
      .decisionScopeContract.finalDecisionScopeTupleCeilings;
  const officialMaximum =
    scope.approved_cleared_redistribution_with_attribution;
  const ownerPrivateMaximum = scope.approved_owner_private_use;

  return [
    {
      evidence_kind: "official_post_license_label_or_terms",
      evidence_decision: "verified_current_basis_evidence",
      basis_type: "official_license_label_and_terms",
      basis_decision: "verified_exact_primary_rights_basis",
      maximum_final_decisions_exactly: [
        "metadata_and_link_only",
        "approved_owner_private_use",
        "approved_cleared_redistribution_with_attribution",
      ],
      maximum_allowed_scope_tuples_exactly: officialMaximum,
      authoritative_representation_url_shape:
        "nonempty_https_official_representation_bound_to_raw_evidence_sha256",
      official_label_or_terms_url_shape:
        "must_equal_authoritative_representation_url",
      label_or_terms_locator_shape:
        "nonempty_exact_label_section_or_clause_within_hashed_official_representation",
      exact_attribution_shape:
        "nonempty_exact_attribution_proved_by_hashed_official_evidence",
      scope_proof_requirement:
        "every_nonempty_allowed_scope_tuple_is_individually_and_explicitly_proved_by_the_hashed_official_evidence_at_the_exact_locator",
    },
    {
      evidence_kind: "official_terms_document",
      evidence_decision: "verified_current_basis_evidence",
      basis_type: "official_license_label_and_terms",
      basis_decision: "verified_exact_primary_rights_basis",
      maximum_final_decisions_exactly: [
        "metadata_and_link_only",
        "approved_owner_private_use",
        "approved_cleared_redistribution_with_attribution",
      ],
      maximum_allowed_scope_tuples_exactly: officialMaximum,
      authoritative_representation_url_shape:
        "nonempty_https_official_terms_representation_bound_to_raw_evidence_sha256",
      official_label_or_terms_url_shape:
        "must_equal_authoritative_representation_url",
      label_or_terms_locator_shape:
        "nonempty_exact_terms_section_or_clause_within_hashed_official_representation",
      exact_attribution_shape:
        "nonempty_exact_attribution_proved_by_hashed_official_evidence",
      scope_proof_requirement:
        "every_nonempty_allowed_scope_tuple_is_individually_and_explicitly_proved_by_the_hashed_official_evidence_at_the_exact_locator",
    },
    {
      evidence_kind: "authoritative_owner_private_policy",
      evidence_decision: "verified_current_basis_evidence",
      basis_type: "owner_private_processing_basis",
      basis_decision: "verified_exact_primary_rights_basis",
      maximum_final_decisions_exactly: [
        "metadata_and_link_only",
        "approved_owner_private_use",
      ],
      maximum_allowed_scope_tuples_exactly: ownerPrivateMaximum,
      authoritative_representation_url_shape:
        "nonempty_https_authoritative_owner_private_policy_bound_to_raw_evidence_sha256",
      official_label_or_terms_url_shape: "must_be_null",
      label_or_terms_locator_shape:
        "nonempty_exact_owner_private_policy_section_or_clause_within_hashed_representation",
      exact_attribution_shape:
        "nonempty_exact_owner_private_policy_citation",
      scope_proof_requirement:
        "allowed_scope_tuples_is_empty_or_exactly_the_single_personal_vault_owner_user_private_tuple_and_is_explicitly_proved_by_the_hashed_policy",
    },
    {
      evidence_kind: "authoritative_metadata_link_citation_policy",
      evidence_decision: "verified_current_basis_evidence",
      basis_type: "metadata_link_citation_basis",
      basis_decision: "verified_exact_primary_rights_basis",
      maximum_final_decisions_exactly: ["metadata_and_link_only"],
      maximum_allowed_scope_tuples_exactly: [],
      authoritative_representation_url_shape:
        "nonempty_https_authoritative_metadata_link_citation_policy_bound_to_raw_evidence_sha256",
      official_label_or_terms_url_shape: "must_be_null",
      label_or_terms_locator_shape:
        "nonempty_exact_metadata_link_citation_policy_section_or_clause_within_hashed_representation",
      exact_attribution_shape: "nonempty_exact_source_citation",
      scope_proof_requirement: "allowed_scope_tuples_must_be_empty",
    },
    {
      evidence_kind: "authoritative_no_basis_evidence",
      evidence_decision: "rejected_basis_evidence",
      basis_type: "rejected_no_basis",
      basis_decision: "rejected_no_basis",
      maximum_final_decisions_exactly: ["rejected"],
      maximum_allowed_scope_tuples_exactly: [],
      authoritative_representation_url_shape:
        "nonempty_https_authoritative_representation_bound_to_raw_evidence_sha256",
      official_label_or_terms_url_shape: "must_be_null",
      label_or_terms_locator_shape:
        "nonempty_exact_location_supporting_the_no_basis_determination_within_hashed_representation",
      exact_attribution_shape: "must_be_empty_string",
      scope_proof_requirement: "allowed_scope_tuples_must_be_empty",
    },
  ];
}

function collectContractErrors(candidate) {
  const errors = [];
  const rights =
    candidate.sourceRightsManifest.futureO3BReceiptContract;
  const crosswalk = rights.rightsBasisEvidenceToPrimaryBasisCrosswalk;
  const expectedCrosswalkRows = expectedRightsBasisCrosswalkRows(candidate);
  const expectedCrosswalkKeys = [
    "evidence_kind",
    "evidence_decision",
    "basis_type",
    "basis_decision",
  ];
  const add = (code) => errors.push(code);

  if (
    crosswalk.contractVersion !==
      "appraiser.first.rights-basis-crosswalk.v1" ||
    crosswalk.closedWorld !== true ||
    !jsonEqual(crosswalk.rowKeyFieldsExactly, expectedCrosswalkKeys) ||
    !jsonEqual(crosswalk.rowsExactly, expectedCrosswalkRows) ||
    crosswalk.unknownMissingDuplicateOrUnlistedCombinationFailsClosed !== true
  ) {
    add("rights_basis_crosswalk");
  }
  for (const fragment of [
    "select_exactly_one_row",
    "unlisted_combination_fails_closed",
    "public_availability_or_silence_is_never_proof",
    "metadata_link_citation_and_rejected_no_basis_rows_require_empty",
    "single_personal_vault_personal_service_processing_owner_user_private_tuple",
    "authoritative_no_basis_evidence_can_only_select_rejected",
  ]) {
    if (
      !crosswalk.bindingInvariants.some((invariant) =>
        invariant.includes(fragment),
      )
    ) {
      add(`rights_basis_crosswalk_invariant:${fragment}`);
    }
  }

  const closeout = candidate.closeout;
  const expectedS235AOverlap = [
    ...closeout.serializedSharedTestMutations.paths,
    roadmapPath,
  ];
  if (
    !jsonEqual(closeout.s235aManifestOverlap, expectedS235AOverlap) ||
    closeout.s235aManifestOverlapPathCount !==
      expectedS235AOverlap.length ||
    closeout.s235aManifestOverlapDerivation !==
      "exact_intersection_of_live_merged_PR_656_changed_file_manifest_and_ownedFileManifest" ||
    closeout.allOverlapMutationsSerializedAfterS235AMerge !== true ||
    !jsonEqual(
      closeout.laneSpecificPathsDisjointFromS235A,
      candidate.ownedFileManifest.slice(0, 4),
    )
  ) {
    add("s235a_overlap_intersection");
  }

  const release =
    candidate.fiveChoiceCorrectionContract.releaseReceiptContract;
  const verifiedKey = release.verifiedOfficialKeyReceiptShape;
  const feedback =
    candidate.fiveChoiceCorrectionContract
      .fiveChoiceFeedbackBundleReceiptShape;
  const separation = candidate.goldHeldOutSeparationContract;
  const attributionFields = [
    "ordered_content_attribution_rows",
    "ordered_content_attribution_rows_digest",
    "ordered_unique_attributions",
    "ordered_unique_attributions_digest",
  ];
  const keyAttributionFields = [
    "key_post_exact_attribution",
    "key_asset_exact_attribution",
    "ordered_unique_key_attributions",
    "ordered_unique_key_attributions_digest",
  ];
  const feedbackAttributionFields = [
    "ordered_feedback_attribution_rows",
    "ordered_feedback_attribution_rows_digest",
  ];
  const includesAll = (values, required) =>
    required.every((value) => values.includes(value));

  if (
    !includesAll(release.requiredFields, attributionFields) ||
    !includesAll(
      release.receiptDigestContract.coveredFieldsExactly,
      attributionFields,
    ) ||
    !includesAll(verifiedKey.requiredFields, keyAttributionFields) ||
    !includesAll(
      verifiedKey.receiptDigestContract.coveredFieldsExactly,
      keyAttributionFields,
    ) ||
    !includesAll(feedback.requiredFields, feedbackAttributionFields) ||
    !includesAll(
      feedback.receiptDigestContract.coveredFieldsExactly,
      feedbackAttributionFields,
    )
  ) {
    add("content_attribution_receipt_fields");
  }

  const projection = release.contentRightsAttributionProjectionContract;
  const expectedAttributionRoles = [
    "question_source_post",
    "question_source_asset",
    "question_item_object",
    "official_key_source_post",
    "official_key_source_asset",
    "choice_correction_object",
    "choice_explanation_object",
  ];
  if (
    !jsonEqual(
      projection.orderedSourceProjectionExactly.map(
        ({ content_role }) => content_role,
      ),
      expectedAttributionRoles,
    ) ||
    !jsonEqual(projection.contentRoleVocabulary, expectedAttributionRoles) ||
    projection.orderedUniqueAttributionContract.normalizationAllowed !==
      false ||
    projection.orderedUniqueAttributionContract
      .emptyStringAllowedForApprovedRelease !== false ||
    !projection.orderedUniqueAttributionContract.deterministicDisplayRule
      .includes("separate_attribution_block") ||
    !projection.bindingInvariants.some((invariant) =>
      invariant.includes("every_content_bearing_rights_receipt"),
    )
  ) {
    add("content_attribution_projection");
  }

  if (
    !jsonEqual(
      verifiedKey.keyAttributionProjectionContract.orderedSourceFieldsExactly,
      ["key_post_exact_attribution", "key_asset_exact_attribution"],
    ) ||
    verifiedKey.keyAttributionProjectionContract.normalizationAllowed !==
      false ||
    !jsonEqual(feedback.feedbackAttributionRowRequiredFields, [
      "choice_id",
      "position_1_to_5",
      "feedback_kind",
      "source_object_reference",
      "rights_receipt_reference",
      "exact_attribution",
    ]) ||
    feedback.feedbackAttributionRowAdditionalFieldsAllowed !== false
  ) {
    add("content_attribution_component_projection");
  }

  for (const ingress of [
    separation.goldIngressReceiptShape,
    separation.heldOutIngressReceiptShape,
  ]) {
    if (
      !includesAll(ingress.requiredFields, attributionFields) ||
      !includesAll(
        ingress.receiptDigestContract.coveredFieldsExactly,
        attributionFields,
      ) ||
      !ingress.bindingInvariants.some((invariant) =>
        invariant.includes("equal_the_resolved_release_fields_exactly"),
      ) ||
      !ingress.bindingInvariants.some((invariant) =>
        invariant.includes(
          "same_cardinality_and_members_as_ordered_unique_attributions_independent_of_binding_record_order",
        ),
      )
    ) {
      add("content_attribution_ingress_projection");
    }
  }
  const ingressBinding = separation.ingressedObjectBindingRecordContract;
  if (
    !ingressBinding.requiredFields.includes("source_exact_attributions") ||
    !separation.ingressedObjectBindingsDigestContract
      .recordFieldsCoveredExactly.includes("source_exact_attributions") ||
    !jsonEqual(
      ingressBinding.sourceRightsExactProjectionByContentClass
        .verified_official_key.orderedAttributionSourceProjectionExactly,
      [
        "resolved_verified_official_key_receipt.key_post_exact_attribution",
        "resolved_verified_official_key_receipt.key_asset_exact_attribution",
      ],
    ) ||
    !jsonEqual(
      ingressBinding.sourceRightsExactProjectionByContentClass
        .correction_object.orderedAttributionSourceProjectionExactly,
      ["resolved_correction_object_rights_receipt.exact_attribution"],
    ) ||
    !jsonEqual(
      ingressBinding.sourceRightsExactProjectionByContentClass
        .explanation_object.orderedAttributionSourceProjectionExactly,
      ["resolved_explanation_object_rights_receipt.exact_attribution"],
    )
  ) {
    add("content_attribution_object_binding");
  }

  const standards = candidate.standardsMappingContracts;
  const qtiItemFields = standards.internalItemSchema.fields.map(
    ({ field }) => field,
  );
  const qtiAttributionFields = [
    "five_choice_release_receipt_reference_or_null",
    "ordered_content_attribution_rows_digest_or_null",
    "ordered_unique_attributions_or_null",
    "ordered_unique_attributions_digest_or_null",
  ];
  const itemBodyMapping = standards.qti.mappingRecords.find(
    ({ targetField }) => targetField === "qti-item-body",
  );
  const modalMapping = standards.qti.mappingRecords.find(
    ({ targetField }) =>
      targetField ===
      "qti-modal-feedback@identifier, @outcome-identifier, @show-hide, qti-content-body",
  );
  if (
    !includesAll(qtiItemFields, qtiAttributionFields) ||
    !includesAll(itemBodyMapping.sourcePointers, [
      "/five_choice_release_receipt_reference_or_null",
      "/ordered_content_attribution_rows_digest_or_null",
      "/ordered_unique_attributions_or_null",
      "/ordered_unique_attributions_digest_or_null",
    ]) ||
    !includesAll(modalMapping.sourcePointers, [
      "/five_choice_release_receipt_reference_or_null",
      "/ordered_content_attribution_rows_digest_or_null",
      "/ordered_unique_attributions_or_null",
      "/ordered_unique_attributions_digest_or_null",
    ]) ||
    !itemBodyMapping.constraint.includes("separate attribution block") ||
    !modalMapping.constraint.includes("separate attribution block") ||
    !standards.internalItemSchema.crossFieldInvariants.some((invariant) =>
      invariant.includes("equal_the_resolved_release_fields_exactly"),
    )
  ) {
    add("qti_content_attribution_projection");
  }

  const occurredAtField = standards.internalSchema.fields.find(
    ({ field }) => field === "occurred_at",
  );
  const occurredAtContract = standards.internalSchema.occurredAtContract;
  const xapiTimestampContract = standards.xapi.statementTimestampContract;
  const xapiTimestampMapping = standards.xapi.mappingRecords.find(
    ({ targetField }) => targetField === "Statement.timestamp",
  );
  if (
    occurredAtField?.type !== "rfc3339_utc_z_millisecond_timestamp" ||
    occurredAtContract?.exactRegex !==
      "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" ||
    occurredAtContract?.timezoneRule !==
      "uppercase_Z_only_nonzero_offsets_and_plus00:00_or_minus00:00_spellings_are_rejected_for_this_canonical_internal_shape" ||
    occurredAtContract?.futureTimeRule !==
      "occurred_at_must_be_lte_adapter_emitted_at_from_the_trusted_adapter_clock_at_mapping_time" ||
    occurredAtContract?.futureTimeHandling !==
      "reject_mapping_do_not_clamp_coerce_rewrite_or_replace_with_adapter_time" ||
    occurredAtContract?.invalidOffsetPrecisionCalendarFutureOrUntrustedClockFailsClosed !==
      true ||
    xapiTimestampContract?.sourceContract !==
      "standardsMappingContracts.internalSchema.occurredAtContract" ||
    xapiTimestampContract?.requiredFormat !==
      "RFC_3339_UTC_Z_with_exactly_three_fractional_second_digits" ||
    xapiTimestampContract?.sourceBytesCopiedExactly !== true ||
    xapiTimestampContract?.trustedAdapterClockComparisonRequired !== true ||
    xapiTimestampContract?.futureTimestampAllowed !== false ||
    xapiTimestampContract
      ?.clampCoerceRewriteOrLrsSuppliedSubstitutionAllowed !== false ||
    xapiTimestampContract?.adapterImplemented !== false ||
    xapiTimestampContract?.conformanceClaimed !== false ||
    !xapiTimestampMapping?.constraint.includes(
      "occurred_at not later than trusted adapter_emitted_at",
    ) ||
    !xapiTimestampMapping?.constraint.includes(
      "invalid offset future clamp coercion rewrite or substitution rejected",
    )
  ) {
    add("xapi_timestamp_contract");
  }

  const later = candidate.laterGateEvidence;
  const packetShape = later.gateEvidencePacketReceiptShape;
  const supportReceipt = later.authoritativeSupportingEvidenceReceiptShape;
  const supports = later.authoritativeSupportingEvidenceShapeRegistry;
  const virtuals = later.virtualUnderlyingEvidenceShapeRegistry;
  const derivation = later.gateAssertionDerivationReceiptShape;
  const predicates = derivation.predicateOperatorContractRegistry;
  const globalProfiles = derivation.predicateValidationProfileRegistry;
  const timedOmr = candidate.timedOmrReadinessContract;
  const omr = timedOmr.omrShape;
  const dataBoundary = timedOmr.dataBoundary;
  const ownerScope = later.O3B.ownerScopeContract;
  const ownerAuthorization = ownerScope.crossPlaneAuthorizationBoundary;
  const ownerSourceNestedContracts =
    supports["o3b-owner-scope-decision-source.v1"]
      .typedPayloadNestedContracts;
  const ownerAuthorizationNestedContract =
    ownerSourceNestedContracts.crossPlaneAuthorizationBoundaryContract;
  const ownerCurrentnessNestedContract =
    ownerSourceNestedContracts.approvalActionTimeCurrentnessContract;
  const ownerDecision = "owner_approved_exact_O3B_scope_and_exclusions";
  const ownerEvidenceInput = "exact_scope_and_excluded_actions";
  const ownerEvidenceShape = "owner-scope-decision-evidence.v1";
  const ownerReferenceField = "owner_scope_decision_receipt_reference";
  const ownerDecisionField = "owner_scope_decision";
  const ownerApprovalFields = [ownerReferenceField, ownerDecisionField];
  const ownerVirtualAssertion =
    virtuals[ownerEvidenceShape].assertionContractsExactly.find(
      ({ assertionId }) => assertionId === "complete_input_evidence",
    );
  const ownerAnchorConditionIds = [
    "O3B_owner_root_anchor_reference_matches_gate",
    "O3B_owner_root_anchor_digest_matches_gate",
  ];
  const expectedOwnerAnchorSelectors = [
    {
      sourceRole: "gate_root_trust_anchor_projection_reference",
      sourceKind: "gate_context",
      absoluteJsonPointer: "/root_trust_anchor_projection_reference",
      requiredShapeOrContractIdOrNull: null,
      requiredDecisionOrNull: null,
      requiredIssuerOrReviewerClassOrNull: null,
      exactCardinality: "exactly_1",
      recordOrder: "single_gate_value",
    },
    {
      sourceRole: "gate_root_trust_anchor_projection_sha256",
      sourceKind: "gate_context",
      absoluteJsonPointer: "/root_trust_anchor_projection_sha256",
      requiredShapeOrContractIdOrNull: null,
      requiredDecisionOrNull: null,
      requiredIssuerOrReviewerClassOrNull: null,
      exactCardinality: "exactly_1",
      recordOrder: "single_gate_value",
    },
  ];
  const expectedOwnerAnchorConditions = [
    {
      conditionId: "O3B_owner_root_anchor_reference_matches_gate",
      operator: "equals",
      left: {
        sourceRole: "owner_O3B_scope_decision",
        jsonPointer: "/typed_payload/root_trust_anchor_projection_reference",
      },
      right: {
        sourceRole: "gate_root_trust_anchor_projection_reference",
        jsonPointer: "/root_trust_anchor_projection_reference",
      },
      quantifierOrNull: null,
    },
    {
      conditionId: "O3B_owner_root_anchor_digest_matches_gate",
      operator: "equals",
      left: {
        sourceRole: "owner_O3B_scope_decision",
        jsonPointer: "/typed_payload/root_trust_anchor_projection_sha256",
      },
      right: {
        sourceRole: "gate_root_trust_anchor_projection_sha256",
        jsonPointer: "/root_trust_anchor_projection_sha256",
      },
      quantifierOrNull: null,
    },
  ];
  const ownerCurrentnessFieldsExactly = [
    "requiredResolvedStatus",
    "requiredDecision",
    "revokedOrSupersededAllowed",
    "nonnullExpiryRequired",
    "reResolveImmediatelyBeforeEveryAction",
    "reviewedAtAloneIsSufficient",
    "requiredCurrentBeforeActionNamesExactly",
    "actionTimestampComparisonRule",
    "missingInvalidStaleFutureDatedExpiredRevokedSupersededOrMismatchedEvidenceFailsClosed",
  ];
  const ownerCurrentnessFieldContracts = {
    requiredResolvedStatus: "literal_verified_current",
    requiredDecision:
      "literal_owner_approved_exact_O3B_scope_and_exclusions",
    revokedOrSupersededAllowed: "literal_false",
    nonnullExpiryRequired: "literal_true",
    reResolveImmediatelyBeforeEveryAction: "literal_true",
    reviewedAtAloneIsSufficient: "literal_false",
    requiredCurrentBeforeActionNamesExactly:
      "closed_array_exactly_matching_parent_crossPlaneAuthorizationBoundary.authorizationRequiredBeforeExactly_in_the_same_order",
    actionTimestampComparisonRule:
      "literal_resolved_owner_evidence_observed_at_lte_action_instant_lt_resolved_owner_evidence_expires_at_and_latest_status_at_action_is_verified_current_not_revoked_or_superseded",
    missingInvalidStaleFutureDatedExpiredRevokedSupersededOrMismatchedEvidenceFailsClosed:
      "literal_true",
  };
  const bindingOperators = new Set(
    supportReceipt.payloadBindingShape.operatorVocabulary,
  );
  const sourceContractFields = new Set([
    ...supportReceipt.sourceReferenceContractShape.requiredFields,
    ...(supportReceipt.sourceReferenceContractShape.optionalFields ?? []),
  ]);

  if (
    dataBoundary.crossPlaneApprovalRequired !== ownerDecision ||
    dataBoundary.crossPlaneApprovalEvidenceInputName !== ownerEvidenceInput ||
    dataBoundary.crossPlaneApprovalEvidenceContractId !==
      ownerEvidenceShape ||
    dataBoundary.crossPlaneApprovalScopeContractJsonPointer !==
      "/laterGateEvidence/O3B/ownerScopeContract" ||
    dataBoundary.missingStaleMismatchedOrUnboundCrossPlaneApprovalFailsClosed !==
      true ||
    !jsonEqual(
      dataBoundary.crossPlaneApprovalMustBeCurrentBeforeExactly,
      ownerAuthorization.authorizationRequiredBeforeExactly,
    ) ||
    ownerAuthorization.approvalDecision !== ownerDecision ||
    ownerAuthorization.approvalEvidenceInputName !== ownerEvidenceInput ||
    ownerAuthorization.approvalEvidenceContractId !== ownerEvidenceShape ||
    ownerAuthorization.onlyAllowedOutput !==
      dataBoundary.onlyCrossPlaneOutputAllowed ||
    ownerAuthorization
      .rawResponseOpeningSaltActorIdentityOrHeldoutMembershipExportAllowed !==
      false ||
    ownerAuthorization.missingStaleMismatchedOrUnboundApprovalFailsClosed !==
      true ||
    !virtuals[ownerEvidenceShape]?.allowedDecisions.includes(ownerDecision) ||
    !later.O3B.requiredInputs.includes(ownerEvidenceInput) ||
    later.O3B.requiredInputEvidenceContractRegistry[ownerEvidenceInput]
      ?.requiredPayloadSchemaVersion !== ownerEvidenceShape ||
    later.O3B.requiredInputEvidenceContractRegistry[ownerEvidenceInput]
      ?.requiredUnderlyingDecision !== ownerDecision ||
    !later.O3B.requiredInputProjectionContractRegistry[
      ownerEvidenceInput
    ]?.requiredEvidenceProjection.requiredShapeOrContractIds.includes(
      ownerEvidenceShape,
    )
  ) {
    add("cross_plane_owner_approval_contract");
  }
  if (
    !ownerAuthorizationNestedContract.requiredFieldsExactly.includes(
      "approvalActionTimeCurrentnessContract",
    ) ||
    ownerAuthorizationNestedContract.additionalFieldsAllowed !== false ||
    !jsonEqual(
      ownerCurrentnessNestedContract?.requiredFieldsExactly,
      ownerCurrentnessFieldsExactly,
    ) ||
    !jsonEqual(
      ownerCurrentnessNestedContract?.fieldContracts,
      ownerCurrentnessFieldContracts,
    ) ||
    ownerCurrentnessNestedContract?.additionalFieldsAllowed !== false ||
    ownerCurrentnessNestedContract
      ?.requiredCurrentBeforeActionNamesOrderSource !==
      "laterGateEvidence.O3B.ownerScopeContract.crossPlaneAuthorizationBoundary.authorizationRequiredBeforeExactly" ||
    ownerCurrentnessNestedContract
      ?.requiredCurrentBeforeActionNamesMustEqualOrderSource !== true ||
    !jsonEqual(
      ownerAuthorization.approvalActionTimeCurrentnessContract
        .requiredCurrentBeforeActionNamesExactly,
      ownerAuthorization.authorizationRequiredBeforeExactly,
    ) ||
    !jsonEqual(
      Object.keys(
        ownerAuthorization.approvalActionTimeCurrentnessContract,
      ),
      ownerCurrentnessFieldsExactly,
    )
  ) {
    add("cross_plane_owner_approval_nested_currentness_schema");
  }

  const ownerApprovalReceiptShapes = {
    personal_session_precommit:
      omr.personalSessionEventLogPrecommitReceiptShape,
    evaluation_precommit: omr.evaluationBindingPrecommitReceiptShape,
    commitment_policy: omr.commitmentPolicyReceiptShape,
    ephemeral_bridge_policy: omr.ephemeralBridgePolicyReceiptShape,
    final_cross_plane_binding:
      omr.crossPlaneEvaluationBindingReceiptShape,
  };
  for (const [shapeName, shape] of Object.entries(
    ownerApprovalReceiptShapes,
  )) {
    if (
      !includesAll(shape.requiredFields, ownerApprovalFields) ||
      !includesAll(
        shape.receiptDigestContract.coveredFieldsExactly,
        ownerApprovalFields,
      ) ||
      !shape.bindingInvariants.some((invariant) =>
        invariant.includes("owner_scope_decision_receipt_reference"),
      ) ||
      !shape.bindingInvariants.some((invariant) =>
        invariant.includes(
          "owner_scope_decision_equals_timedOmrReadinessContract.dataBoundary.crossPlaneApprovalRequired",
        ),
      )
    ) {
      add(`cross_plane_owner_approval_receipt:${shapeName}`);
    }
  }
  if (omr.crossPlaneEvaluationBindingReceiptShape.bodyless !== true) {
    add("cross_plane_owner_approval_bodyless");
  }

  const privacySupport = supports["privacy-lifecycle-source.v1"];
  const privacyOwnerReference = privacySupport.sourceReferenceContractsExactly
    .find(({ sourceRole }) => sourceRole === "owner_cross_plane_scope_decision");
  const privacyProfile = globalProfiles["privacy-lifecycle-five-phase.v1"];
  const privacyMatcher = predicates.privacy_lifecycle_matches_data_boundary;
  if (
    !includesAll(
      privacySupport.requiredTypedPayloadFieldsExactly,
      ownerApprovalFields,
    ) ||
    !privacySupport.referenceFields.includes(ownerReferenceField) ||
    privacySupport.sourceReferenceCardinality !== "exactly_4" ||
    privacyOwnerReference?.typedPayloadReferenceField !==
      ownerReferenceField ||
    privacyOwnerReference?.requiredShapeOrContractId !== ownerEvidenceShape ||
    privacyOwnerReference?.requiredDecision !== ownerDecision ||
    !includesAll(privacyProfile.rowRequiredFieldsExactly, ownerApprovalFields) ||
    !privacyProfile.crossRowEqualityFieldsExactly.includes(
      `/${ownerReferenceField}`,
    ) ||
    !privacyProfile.crossRowEqualityFieldsExactly.includes(
      `/${ownerDecisionField}`,
    ) ||
    !privacyProfile.typedConditionsExactly.some(
      ({ conditionId, literalJsonValue }) =>
        conditionId === "owner_scope_decision_exact" &&
        literalJsonValue === ownerDecision,
    ) ||
    !privacyMatcher.evaluation.includes(
      "every_row_owner_scope_decision_equals_right.crossPlaneApprovalRequired",
    ) ||
    !privacyMatcher.evaluation.includes(
      "observed_before_session_collection_processing_opening_evaluation_and_cross_plane_output",
    )
  ) {
    add("privacy_owner_approval_binding");
  }

  const crossPlaneInput =
    later.O3B.requiredInputProjectionContractRegistry
      .cross_plane_evaluation_binding_and_nonidentifying_comparison_receipt_set;
  const crossPlaneOwnerBinding = crossPlaneInput.ownerApprovalBindingContract;
  if (
    !includesAll(crossPlaneInput.contractJsonPointers, [
      "/laterGateEvidence/O3B/ownerScopeContract",
      "/timedOmrReadinessContract/dataBoundary",
    ]) ||
    !crossPlaneInput.requiredEvidenceProjection.requiredShapeOrContractIds
      .includes(ownerEvidenceShape) ||
    crossPlaneOwnerBinding.ownerEvidenceInputName !== ownerEvidenceInput ||
    crossPlaneOwnerBinding.ownerEvidenceShapeId !== ownerEvidenceShape ||
    crossPlaneOwnerBinding.requiredDecision !== ownerDecision ||
    !jsonEqual(
      crossPlaneOwnerBinding.referencingReceiptFieldsExactly,
      {
        personal_session_precommit: ownerReferenceField,
        privacy_lifecycle_phase: ownerReferenceField,
        evaluation_precommit: ownerReferenceField,
        commitment_policy: ownerReferenceField,
        ephemeral_bridge_policy: ownerReferenceField,
        final_cross_plane_binding: ownerReferenceField,
      },
    ) ||
    crossPlaneOwnerBinding
      .everyReferenceIdentityMustEqualExactScopeInputEvidenceIdVersionAndSha256 !==
      true ||
    crossPlaneOwnerBinding
      .approvalMustBeCurrentBeforeCollectionProcessingOpeningEvaluationAndOutput !==
      true ||
    !later.O3B.expiryTriggers.includes(
      "owner_scope_decision_identity_status_decision_reviewer_time_or_expiry_changes",
    ) ||
    !later.O3B.requiredInputExpiryCoverage
      .cross_plane_evaluation_binding_and_nonidentifying_comparison_receipt_set
      .includes(
        "owner_scope_decision_identity_status_decision_reviewer_time_or_expiry_changes",
      )
  ) {
    add("cross_plane_owner_approval_gate_projection");
  }

  const ownerApprovalPointerRows = [
    "/timedOmrReadinessContract/dataBoundary",
    "/goldHeldOutSeparationContract/heldOutIngressReceiptShape",
    "/goldHeldOutSeparationContract/crossBoundaryRules",
  ];
  const ownerSource =
    supports["o3b-owner-scope-decision-source.v1"];
  const ownerSourceReference = ownerSource.sourceReferenceContractsExactly
    .find(
      ({ requiredSignedPayloadSchemaId }) =>
        requiredSignedPayloadSchemaId ===
        "owner-o3b-scope-decision-attestation.v1",
    );
  const ownerSignedSchema =
    later.rootAuthorityEvidenceReceiptShape.signedPayloadSchemaDefinitions[
      "owner-o3b-scope-decision-attestation.v1"
    ];
  const ownerSignedFields = [
    "owner_identity",
    "program_scope_id",
    "decision_type",
    "included_values",
    "excluded_values",
    "cross_plane_authorization_boundary",
    "owner_scope_contract_sha256",
    "ordered_authorization_contract_pointer_digest_rows",
    "ordered_authorization_contract_pointer_digest_rows_digest",
    "root_trust_anchor_projection_reference",
    "root_trust_anchor_projection_sha256",
    "decision_payload_sha256",
    "decided_at",
  ];
  if (
    !jsonEqual(
      ownerAuthorization.approvalBoundContractJsonPointersExactly,
      ownerApprovalPointerRows,
    ) ||
    !jsonEqual(
      ownerAuthorization.approvalBoundContractPointerDigestRowFieldsExactly,
      ["json_pointer", "resolved_value_sha256"],
    ) ||
    ownerAuthorization.approvalBoundContractPointerDigestContract
      ?.resolvedValueRule !==
      "resolved_value_sha256_equals_SHA256_RFC8785_of_the_exact_pointer_value_at_the_O3B_evaluation_head_and_tree" ||
    ownerSource?.typedPayloadNestedContracts
      ?.authorizationContractPointerDigestRowContract
      ?.jsonPointerOrderSource !==
      "laterGateEvidence.O3B.ownerScopeContract.crossPlaneAuthorizationBoundary.approvalBoundContractJsonPointersExactly" ||
    ownerSource?.typedPayloadNestedContracts
      ?.authorizationContractPointerDigestRowContract
      ?.missingExtraDuplicateReorderedUnresolvableOrMismatchedRowFailsClosed !==
      true ||
    ownerSourceReference?.payloadBindingsExactly
      ?.filter(({ supportingPayloadJsonPointer }) =>
        [
          "/cross_plane_authorization_boundary",
          "/owner_scope_contract_sha256",
          "/ordered_authorization_contract_pointer_digest_rows",
          "/ordered_authorization_contract_pointer_digest_rows_digest",
        ].includes(supportingPayloadJsonPointer),
      ).length !== 4
  ) {
    add("owner_scope_bound_contract_digest");
  }
  if (
    ownerSignedSchema?.denyUnknownFields !== true ||
    !jsonEqual(ownerSignedSchema?.requiredFieldsExactly, ownerSignedFields) ||
    !jsonEqual(
      Object.keys(ownerSignedSchema?.fieldTypesExactly ?? {}),
      ownerSignedFields,
    ) ||
    ownerSignedSchema?.fieldTypesExactly?.program_scope_id !==
      "literal_s235b_s236b_to_o3b_owner_gate_v1" ||
    ownerSignedSchema?.fieldTypesExactly?.decision_type !==
      "literal_exact_O3B_scope_and_exclusions" ||
    ownerSignedSchema?.fieldTypesExactly?.included_values !==
      "closed_array_exactly_matching_laterGateEvidence.O3B.ownerScopeContract.includedActions" ||
    ownerSignedSchema?.fieldTypesExactly?.excluded_values !==
      "closed_array_exactly_matching_laterGateEvidence.O3B.ownerScopeContract.excludedActions" ||
    ownerSourceReference?.requiredShapeOrContractId !==
      "laterGateEvidence.rootAuthorityEvidenceReceiptShape" ||
    ownerSourceReference?.requiredDecision !==
      "verified_owner_identity_attestation" ||
    !jsonEqual(
      ownerSourceNestedContracts?.decisionPayloadDigestContract
        ?.preimageFieldsCoveredExactly,
      ownerSignedFields.filter(
        (field) => field !== "decision_payload_sha256",
      ),
    ) ||
    ownerSourceNestedContracts?.decisionPayloadDigestContract
      ?.receiptFieldMustEqualComputedDigest !== "decision_payload_sha256" ||
    ownerSourceNestedContracts?.decisionPayloadDigestContract?.algorithm !==
      "sha256" ||
    ownerSourceNestedContracts?.decisionPayloadDigestContract?.hexEncoding !==
      "lowercase_64" ||
    ownerSourceNestedContracts?.decisionPayloadDigestContract
      ?.canonicalization !== "RFC_8785_JSON_Canonicalization_Scheme" ||
    ownerSourceNestedContracts?.decisionPayloadDigestContract
      ?.unknownMissingExtraReorderedOrSelfFieldFailsClosed !== true
  ) {
    add("owner_scope_root_attestation_schema");
  }
  const ownerAnchorSelectors =
    ownerVirtualAssertion?.sourceSelectorsExactly.filter(({ sourceRole }) =>
      expectedOwnerAnchorSelectors.some(
        (expected) => expected.sourceRole === sourceRole,
      ),
    );
  const ownerAnchorConditions =
    ownerVirtualAssertion?.passPredicate.conditionsExactly.filter(
      ({ conditionId }) => ownerAnchorConditionIds.includes(conditionId),
    );
  if (
    !jsonEqual(
      later.pinnedRootTrustAnchorContract
        .ownerDecisionBindingConditionIdsExactly,
      ownerAnchorConditionIds,
    ) ||
    later.pinnedRootTrustAnchorContract
      .ownerDecisionAnchorMismatchFailsClosed !== true ||
    !later.pinnedRootTrustAnchorContract.ownerDecisionBinding.includes(
      "owner-scope-decision-evidence.v1_complete_input_evidence_gate_context_selectors_and_exact_equality_conditions",
    ) ||
    !jsonEqual(ownerAnchorSelectors, expectedOwnerAnchorSelectors) ||
    !jsonEqual(ownerAnchorConditions, expectedOwnerAnchorConditions) ||
    !jsonEqual(
      later.underlyingEvidenceResolutionContract.gateContextContract
        .gatePacketContextFieldsExactly,
      [
        "repository_identity",
        "scope_id",
        "evaluation_head_sha",
        "evaluation_tree_sha",
        "root_trust_anchor_projection_reference",
        "root_trust_anchor_projection_sha256",
        "ordered_contract_pointer_value_rows",
        "ordered_contract_pointer_value_rows_digest",
      ],
    ) ||
    later.underlyingEvidenceResolutionContract.gateContextContract
      .unknownContextSourceOrFieldAllowed !== false
  ) {
    add("owner_scope_root_anchor_gate_binding");
  }

  const privacyInputName =
    "privacy_consent_purpose_retention_revocation_and_deletion_receipt_bundle";
  const personalLogInputName =
    "personal_event_log_inception_lineage_precommit_source_segment_head_and_completeness_receipt_set";
  const privacyPrecommitDimension =
    later.gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.O3B
      .find(
        ({ dimensionId }) =>
          dimensionId === "privacy_timed_session_precommit_identity",
      );
  const privacyPrecommitFields = [
    "evidence_id",
    "evidence_version",
    "evidence_sha256",
  ];
  const privacyPrecommitSpecIds = {
    [privacyInputName]:
      `O3B.privacy_timed_session_precommit_identity.${privacyInputName}.v1`,
    [personalLogInputName]:
      `O3B.privacy_timed_session_precommit_identity.${personalLogInputName}.v1`,
  };
  const privacyPrecommitSpecs =
    later.gateCrossInputCoherenceReceiptShape
      .canonicalRootDerivationSpecRegistry;
  const privacyPrecommitTransforms =
    later.gateCrossInputCoherenceReceiptShape
      .canonicalSourceTransformationRegistry;
  const privacyPrecommitPrivacySpec =
    privacyPrecommitSpecs[privacyPrecommitSpecIds[privacyInputName]];
  const privacyPrecommitPersonalSpec =
    privacyPrecommitSpecs[privacyPrecommitSpecIds[personalLogInputName]];
  const expectedPrivacyReferencePointers = {
    evidence_id:
      "/typed_payload/timed_session_precommit_reference/evidence_id",
    evidence_version:
      "/typed_payload/timed_session_precommit_reference/evidence_version",
    evidence_sha256:
      "/typed_payload/timed_session_precommit_reference/evidence_sha256",
  };
  const expectedPersonalReceiptPointers = {
    evidence_id: "/receipt_id",
    evidence_version: "/receipt_version",
    evidence_sha256: "/receipt_sha256",
  };
  if (
    !jsonEqual(privacyPrecommitDimension?.participatingInputsExactly, [
      privacyInputName,
      personalLogInputName,
    ]) ||
    privacyPrecommitDimension?.comparisonOperator !== "all_equal" ||
    !jsonEqual(privacyPrecommitDimension?.canonicalRootPreimage, {
      schemaVersion:
        "o3b.privacy-timed-session-precommit-reference-root.v1",
      orderedFieldsExactly: privacyPrecommitFields,
      recordOrder: "single",
    }) ||
    !jsonEqual(
      privacyPrecommitDimension?.derivationSpecIdByInputExactly,
      privacyPrecommitSpecIds,
    ) ||
    privacyPrecommitFields.some((field) => {
      const privacyRow =
        privacyPrecommitPrivacySpec?.canonicalFieldSourceByNameExactly[
          field
        ]?.sourceRowsExactly[0];
      const personalRow =
        privacyPrecommitPersonalSpec?.canonicalFieldSourceByNameExactly[
          field
        ]?.sourceRowsExactly[0];
      return (
        privacyRow?.sourceKind !==
          "transitive_authoritative_supporting_evidence" ||
        privacyRow?.requiredShapeOrContractIdOrNull !==
          "privacy-lifecycle-source.v1" ||
        privacyRow?.reachableThroughPayloadSchemaVersionOrNull !==
          "privacy-lifecycle-receipt-bundle.v1" ||
        privacyRow?.absoluteJsonPointer !==
          expectedPrivacyReferencePointers[field] ||
        privacyRow?.exactCardinality !==
          "exactly_5_all_values_must_agree" ||
        personalRow?.sourceKind !== "resolved_direct_domain_receipt" ||
        personalRow?.requiredShapeOrContractIdOrNull !==
          "timedOmrReadinessContract.omrShape.personalSessionEventLogPrecommitReceiptShape" ||
        personalRow?.absoluteJsonPointer !==
          expectedPersonalReceiptPointers[field]
      );
    }) ||
    Object.values(privacyPrecommitTransforms).filter(
      ({ dimensionId }) =>
        dimensionId === "privacy_timed_session_precommit_identity",
    ).length !== 6 ||
    !globalProfiles[
      "privacy-lifecycle-five-phase.v1"
    ].crossRowEqualityFieldsExactly.includes(
      "/timed_session_precommit_reference",
    ) ||
    !later.gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.O3B
      .find(({ dimensionId }) => dimensionId === "timed_session_identity")
      ?.participatingInputsExactly.includes(personalLogInputName)
  ) {
    add("privacy_timed_session_precommit_identity");
  }

  const ownerParticipants = [
    "exact_scope_and_excluded_actions",
    "privacy_consent_purpose_retention_revocation_and_deletion_receipt_bundle",
    "personal_event_log_inception_lineage_precommit_source_segment_head_and_completeness_receipt_set",
    "response_record_timed_session_evaluation_precommit_scoring_and_final_binding_receipt_set",
    "cross_plane_evaluation_binding_and_nonidentifying_comparison_receipt_set",
  ];
  const ownerExpiryParticipants = ownerParticipants.slice(1);
  const ownerEvidenceContractPrefix =
    "laterGateEvidence.virtualUnderlyingEvidenceShapeRegistry.owner-scope-decision-evidence.v1";
  for (const inputName of ownerParticipants) {
    const projection =
      later.O3B.requiredInputProjectionContractRegistry[inputName];
    const evidence =
      later.O3B.requiredInputEvidenceContractRegistry[inputName];
    if (
      projection.requiredEvidenceProjection.requiredShapeOrContractIds[0] !==
        ownerEvidenceShape ||
      !evidence.contractId.includes(ownerEvidenceContractPrefix)
    ) {
      add(`owner_scope_projection:${inputName}`);
    }
  }
  for (const inputName of ownerExpiryParticipants) {
    const coverage = later.O3B.requiredInputExpiryCoverage[inputName];
    if (
      !Array.isArray(coverage) ||
      !coverage.includes(
        "owner_scope_decision_identity_status_decision_reviewer_time_or_expiry_changes",
      )
    ) {
      add(`owner_scope_expiry:${inputName}`);
    }
  }

  const ownerDimension =
    later.gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.O3B
      .find(({ dimensionId }) => dimensionId === "owner_scope_decision_identity");
  const ownerRootFields = [
    "evidence_id",
    "evidence_version",
    "evidence_sha256",
  ];
  const ownerSpecIds = ownerDimension
    ? Object.values(ownerDimension.derivationSpecIdByInputExactly)
    : [];
  const ownerSpecs = ownerSpecIds.map(
    (specId) =>
      later.gateCrossInputCoherenceReceiptShape
        .canonicalRootDerivationSpecRegistry[specId],
  );
  if (
    !jsonEqual(ownerDimension?.participatingInputsExactly, ownerParticipants) ||
    !jsonEqual(
      ownerDimension?.canonicalRootPreimage.orderedFieldsExactly,
      ownerRootFields,
    ) ||
    ownerSpecs.length !== 5 ||
    ownerSpecs.some(
      (spec) =>
        !spec ||
        !jsonEqual(
          Object.keys(spec.canonicalFieldSourceByNameExactly),
          ownerRootFields,
        ) ||
        Object.values(spec.canonicalFieldSourceByNameExactly).some(
          ({ sourceRowsExactly }) =>
            sourceRowsExactly.length !== 1 ||
            sourceRowsExactly[0].sourceKind !==
              "resolved_virtual_underlying_evidence_receipt" ||
            sourceRowsExactly[0].requiredShapeOrContractIdOrNull !==
              ownerEvidenceShape ||
            !["/receipt_id", "/receipt_version", "/receipt_sha256"].includes(
              sourceRowsExactly[0].absoluteJsonPointer,
            ),
        ),
    )
  ) {
    add("owner_scope_coherence_contract");
  }

  const gateInputShape = later.gateInputEvidenceReceiptShape;
  const coherenceDerivation =
    later.gateCoherenceRootDerivationReceiptShape;
  const ownerCarrier =
    gateInputShape.ownerScopeDecisionCoherenceCarrierContract;
  if (
    ownerCarrier.directProjectionMembershipRequiredForEveryNonNullCarrier !==
      true ||
    ownerCarrier.ownerVirtualProjectionMustBeFirstForEveryParticipant !==
      true ||
    ownerCarrier.selfReferenceOrDigestCycleAllowed !== false ||
    !ownerCarrier.coherenceDerivationSource.includes(
      "never_this_carrier_field_or_the_enclosing_gate_input_receipt",
    ) ||
    gateInputShape.coherenceRootSourceKindVocabulary.includes(
      "selected_gate_input_evidence_receipt",
    ) ||
    !gateInputShape.coherenceRootSourceKindVocabulary.includes(
      "resolved_virtual_underlying_evidence_receipt",
    ) ||
    gateInputShape.coherenceRootClaimDerivationContract
      .selfReferenceOrDigestCycleAllowed !== false ||
    coherenceDerivation.sourceKindVocabulary.includes(
      "selected_gate_input_evidence_receipt",
    ) ||
    !coherenceDerivation.sourceKindVocabulary.includes(
      "resolved_virtual_underlying_evidence_receipt",
    ) ||
    coherenceDerivation.sourceRowSourceKindConditionalContract
      ?.enclosingGateInputReceiptOrAnyDigestDependentReceiptMayBeASource !==
      false ||
    !coherenceDerivation.bindingInvariants.some((invariant) =>
      invariant.includes("self_reference_or_digest_cycle_fails_closed"),
    )
  ) {
    add("owner_scope_coherence_non_circular");
  }

  const actionCurrentness =
    dataBoundary.crossPlaneApprovalActionTimeCurrentnessContract;
  const ownerActionCurrentness =
    ownerAuthorization.approvalActionTimeCurrentnessContract;
  const privacyActionCurrentness =
    privacySupport.ownerScopeDecisionActionTimeCurrentnessContract;
  if (
    !jsonEqual(
      actionCurrentness?.requiredCurrentBeforeActionNamesExactly,
      dataBoundary.crossPlaneApprovalMustBeCurrentBeforeExactly,
    ) ||
    !jsonEqual(actionCurrentness, ownerActionCurrentness) ||
    actionCurrentness?.reResolveImmediatelyBeforeEveryAction !== true ||
    actionCurrentness?.reviewedAtAloneIsSufficient !== false ||
    privacyActionCurrentness
      ?.resolvedExpiryMustBeNonNullAndStrictlyAfterEveryNonNullActionTimestamp !==
      true ||
    privacyActionCurrentness
      ?.reResolveImmediatelyBeforeSessionCollectionProcessingRevocationDeletionAndOutput !==
      true ||
    privacyActionCurrentness?.reviewedAtAloneIsSufficient !== false ||
    privacyProfile.ownerScopeDecisionActionTimeCurrentnessContract
      ?.everyNonNullActionTimestampMustPass !== true ||
    !privacyMatcher.evaluation.includes(
      "owner_scope_decision_is_re_resolved_immediately_before_every_nonnull_action_timestamp",
    ) ||
    Object.values(ownerApprovalReceiptShapes).some(
      (shape) =>
        !shape.bindingInvariants.some(
          (invariant) =>
            invariant.includes("expires_at_is_nonnull") ||
            invariant.includes("nonnull_expiry"),
        ),
    ) ||
    !omr.comparisonEvidenceReceiptShape.bindingInvariants.some((invariant) =>
      invariant.includes(
        "re_resolved_immediately_before_opening_bridge_activation_and_comparison",
      ),
    )
  ) {
    add("owner_scope_action_time_currentness");
  }

  for (const gateId of ["S236B", "O3B"]) {
    const gate = later[gateId];
    for (const registryName of [
      "requiredInputAcceptanceContract",
      "requiredInputEvidenceContractRegistry",
      "requiredInputProjectionContractRegistry",
    ]) {
      if (
        !jsonEqual(
          sorted(Object.keys(gate[registryName])),
          sorted(gate.requiredInputs),
        )
      ) {
        add(`gate_registry_keyset:${gateId}:${registryName}`);
      }
    }
  }

  const resolveSourceTarget = (id) => {
    if (id === "laterGateEvidence.rootAuthorityEvidenceReceiptShape") {
      return { kind: "root", value: later.rootAuthorityEvidenceReceiptShape };
    }
    if (supports[id]) return { kind: "support", value: supports[id] };
    if (virtuals[id]) return { kind: "virtual", value: virtuals[id] };
    const direct = resolveDottedPath(candidate, id);
    return direct ? { kind: "direct", value: direct } : null;
  };

  for (const [shapeId, shape] of Object.entries(supports)) {
    const referenceFields = shape.referenceFields ?? [];
    const sourceContracts = shape.sourceReferenceContractsExactly ?? [];
    const contractReferenceFields = sourceContracts.map(
      (entry) => entry.typedPayloadReferenceField,
    );
    if (!jsonEqual(referenceFields, contractReferenceFields)) {
      add(`support_reference_order:${shapeId}`);
    }
    for (const field of referenceFields) {
      if (!shape.requiredTypedPayloadFieldsExactly.includes(field)) {
        add(`support_reference_not_typed:${shapeId}:${field}`);
      }
    }

    sourceContracts.forEach((sourceContract, index) => {
      const keys = Object.keys(sourceContract);
      const missing = supportReceipt.sourceReferenceContractShape.requiredFields
        .filter((field) => !keys.includes(field));
      const extra = keys.filter((field) => !sourceContractFields.has(field));
      if (missing.length || extra.length) {
        add(`support_source_contract_shape:${shapeId}:${index}`);
      }
      const target = resolveSourceTarget(
        sourceContract.requiredShapeOrContractId,
      );
      if (!target) {
        add(`support_source_target:${shapeId}:${index}`);
      }
      for (const binding of sourceContract.payloadBindingsExactly ?? []) {
        if (!bindingOperators.has(binding.operator)) {
          add(`payload_binding_operator:${shapeId}:${binding.operator}`);
        }
        const supportField = topPointerField(
          binding.supportingPayloadJsonPointer,
        );
        if (
          supportField === undefined ||
          (supportField !== null &&
            !shape.requiredTypedPayloadFieldsExactly.includes(supportField))
        ) {
          add(`payload_binding_support_pointer:${shapeId}:${index}`);
        }
        const sourceField = topPointerField(
          binding.sourceSignedPayloadJsonPointer,
        );
        if (sourceField === undefined) {
          add(`payload_binding_source_pointer:${shapeId}:${index}`);
        } else if (
          sourceField !== null &&
          target?.kind === "support" &&
          !target.value.requiredTypedPayloadFieldsExactly.includes(sourceField)
        ) {
          add(`payload_binding_source_pointer:${shapeId}:${index}`);
        } else if (
          sourceField !== null &&
          target?.kind === "direct" &&
          Array.isArray(target.value.requiredFields) &&
          !target.value.requiredFields.includes(sourceField)
        ) {
          add(`payload_binding_source_pointer:${shapeId}:${index}`);
        }
      }
    });

    const nested = shape.typedPayloadNestedContracts;
    for (const condition of nested?.typedConditionsExactly ?? []) {
      if (!predicates[condition.operator]) {
        add(`support_predicate_operator:${shapeId}:${condition.operator}`);
      }
      if (
        condition.validationProfileId &&
        !globalProfiles[condition.validationProfileId] &&
        !nested.validationProfiles?.[condition.validationProfileId]
      ) {
        add(`support_validation_profile:${shapeId}`);
      }
    }
  }

  for (const [profileId, profile] of Object.entries(globalProfiles)) {
    for (const condition of [
      ...(profile.typedConditionsExactly ?? []),
      ...(profile.rowSetConditionsExactly ?? []),
    ]) {
      if (!predicates[condition.operator]) {
        add(`global_profile_operator:${profileId}:${condition.operator}`);
      }
    }
  }
  visitObjects(later, [], (value, path) => {
    if (typeof value.operator !== "string") return;
    const profileLiteral =
      typeof value.literalJsonValue === "string"
        ? value.literalJsonValue
        : value.right?.literalJsonValue;
    if (
      typeof profileLiteral === "string" &&
      profileLiteral.startsWith("privacy-lifecycle-") &&
      !globalProfiles[profileLiteral]
    ) {
      add(`unresolved_privacy_profile_literal:${path.join(".")}`);
    }
  });

  for (const [virtualId, virtual] of Object.entries(virtuals)) {
    for (const assertion of virtual.assertionContractsExactly ?? []) {
      const roles = new Set(
        assertion.sourceSelectorsExactly.map((selector) => selector.sourceRole),
      );
      for (const selector of assertion.sourceSelectorsExactly) {
        if (
          selector.requiredShapeOrContractIdOrNull &&
          !resolveSourceTarget(selector.requiredShapeOrContractIdOrNull)
        ) {
          add(`virtual_source_target:${virtualId}:${assertion.assertionId}`);
        }
      }
      for (const condition of assertion.passPredicate.conditionsExactly) {
        if (!predicates[condition.operator]) {
          add(`virtual_predicate_operator:${virtualId}:${condition.operator}`);
        }
        for (const operand of [condition.left, condition.right]) {
          if (operand.sourceRole && !roles.has(operand.sourceRole)) {
            add(`virtual_unbound_source_role:${virtualId}:${condition.conditionId}`);
          }
        }
      }
    }
  }

  const coherence = later.gateCrossInputCoherenceReceiptShape;
  const matrix = coherence.crossInputCoherenceMatrix;
  const specs = coherence.canonicalRootDerivationSpecRegistry;
  const transforms = coherence.canonicalSourceTransformationRegistry;
  const derivationSourceKinds = new Set(
    later.gateCoherenceRootDerivationReceiptShape.sourceKindVocabulary,
  );
  const derivationSourceKindContracts =
    later.gateCoherenceRootDerivationReceiptShape
      .sourceRowSourceKindConditionalContract ?? {};
  const matrixLocations = [];
  const transformationIds = [];
  const transformationRows = new Map();

  for (const gateId of ["S236B", "O3B"]) {
    for (const dimension of matrix[gateId]) {
      if (
        !jsonEqual(
          sorted(Object.keys(dimension.derivationSpecIdByInputExactly)),
          sorted(dimension.participatingInputsExactly),
        )
      ) {
        add(`matrix_participant_spec_keyset:${gateId}:${dimension.dimensionId}`);
      }
      for (const inputName of dimension.participatingInputsExactly) {
        const specId = dimension.derivationSpecIdByInputExactly[inputName];
        matrixLocations.push({ gateId, dimension, inputName, specId });
      }
    }
  }

  if (
    !jsonEqual(
      sorted(Object.keys(specs)),
      sorted(matrixLocations.map(({ specId }) => specId)),
    )
  ) {
    add("matrix_spec_union");
  }

  for (const { gateId, dimension, inputName, specId } of matrixLocations) {
    const spec = specs[specId];
    if (!spec) continue;
    if (
      spec.gateId !== gateId ||
      spec.dimensionId !== dimension.dimensionId ||
      spec.inputName !== inputName
    ) {
      add(`spec_identity:${specId}`);
    }
    const evidenceRegistry =
      later[gateId].requiredInputEvidenceContractRegistry[inputName];
    const projectionRegistry =
      later[gateId].requiredInputProjectionContractRegistry[inputName];
    if (
      spec.requiredInputContractId !== evidenceRegistry.contractId ||
      !jsonEqual(
        spec.requiredContractJsonPointersExactly,
        projectionRegistry.contractJsonPointers,
      ) ||
      !jsonEqual(
        spec.requiredEvidenceShapeOrContractIdsExactly,
        projectionRegistry.requiredEvidenceProjection
          .requiredShapeOrContractIds,
      )
    ) {
      add(`spec_input_registry:${specId}`);
    }
    if (!jsonEqual(spec.canonicalRootPreimage, dimension.canonicalRootPreimage)) {
      add(`spec_preimage:${specId}`);
    }
    if (
      !jsonEqual(
        Object.keys(spec.canonicalFieldSourceByNameExactly),
        spec.canonicalRootPreimage.orderedFieldsExactly,
      )
    ) {
      add(`spec_field_keyset:${specId}`);
    }
    for (const [fieldName, fieldSource] of Object.entries(
      spec.canonicalFieldSourceByNameExactly,
    )) {
      for (const sourceRow of fieldSource.sourceRowsExactly) {
        const transformationId = sourceRow.transformationId;
        if (
          !derivationSourceKinds.has(sourceRow.sourceKind) ||
          !Object.hasOwn(
            derivationSourceKindContracts,
            sourceRow.sourceKind,
          )
        ) {
          add(`source_kind:${transformationId}`);
        }
        if (
          sourceRow.sourceKind === "selected_gate_input_evidence_receipt" ||
          sourceRow.requiredShapeOrContractIdOrNull ===
            "laterGateEvidence.gateInputEvidenceReceiptShape"
        ) {
          add(`derivation_self_reference:${transformationId}`);
        }
        transformationIds.push(transformationId);
        if (!transformationRows.has(transformationId)) {
          transformationRows.set(transformationId, []);
        }
        transformationRows
          .get(transformationId)
          .push(withoutKey(sourceRow, "transformationId"));
        const transformation = transforms[transformationId];
        if (!transformation) {
          add(`transform_missing:${transformationId}`);
          continue;
        }
        if (
          transformation.gateId !== gateId ||
          transformation.dimensionId !== dimension.dimensionId ||
          transformation.inputName !== inputName ||
          transformation.canonicalFieldName !== fieldName
        ) {
          add(`transform_mirror:${transformationId}`);
        }
        const absoluteField = topPointerField(sourceRow.absoluteJsonPointer);
        if (absoluteField === undefined) {
          add(`selector_pointer:${transformationId}`);
        }
        if (
          sourceRow.selectorKind === "direct_json_pointer" &&
          sourceRow.rowFieldJsonPointerOrNull !== null
        ) {
          add(`selector_direct_shape:${transformationId}`);
        }
        if (
          sourceRow.selectorKind === "array_field_projection" &&
          (typeof sourceRow.rowFieldJsonPointerOrNull !== "string" ||
            !sourceRow.rowFieldJsonPointerOrNull.startsWith("/"))
        ) {
          add(`selector_array_shape:${transformationId}`);
        }
        if (
          !["direct_json_pointer", "array_field_projection"].includes(
            sourceRow.selectorKind,
          )
        ) {
          add(`selector_kind:${transformationId}`);
        }
      }
    }
  }

  for (const [transformationId, rows] of transformationRows) {
    if (
      transforms[transformationId] &&
      !jsonEqual(transforms[transformationId].orderedSourceRowsExactly, rows)
    ) {
      add(`transform_mirror:${transformationId}`);
    }
  }
  if (
    !jsonEqual(
      sorted(Object.keys(transforms)),
      sorted(new Set(transformationIds)),
    )
  ) {
    add("transform_union");
  }

  const supportAndVirtualIds = new Set([
    ...Object.keys(supports),
    ...Object.keys(virtuals),
  ]);
  const dependencyGraph = new Map(
    [...supportAndVirtualIds].map((id) => [id, new Set()]),
  );
  for (const [id, shape] of Object.entries(supports)) {
    for (const source of shape.sourceReferenceContractsExactly ?? []) {
      if (supportAndVirtualIds.has(source.requiredShapeOrContractId)) {
        dependencyGraph.get(id).add(source.requiredShapeOrContractId);
      }
    }
  }
  for (const [id, shape] of Object.entries(virtuals)) {
    for (const assertion of shape.assertionContractsExactly ?? []) {
      for (const selector of assertion.sourceSelectorsExactly ?? []) {
        if (supportAndVirtualIds.has(selector.requiredShapeOrContractIdOrNull)) {
          dependencyGraph.get(id).add(selector.requiredShapeOrContractIdOrNull);
        }
      }
    }
  }

  const forbiddenS236Dependencies = new Set([
    "post-s236b-benchmark-execution-source.v1",
  ]);
  const visitDependencies = (origin, node, visiting, visited) => {
    if (forbiddenS236Dependencies.has(node)) {
      add(`s236_forbidden_dependency:${origin}:${node}`);
    }
    if (visiting.has(node)) {
      add(`dependency_cycle:${origin}:${node}`);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const child of dependencyGraph.get(node) ?? []) {
      visitDependencies(origin, child, visiting, visited);
    }
    visiting.delete(node);
    visited.add(node);
  };
  for (const inputName of later.S236B.requiredInputs) {
    for (const shapeId of later.S236B.requiredInputProjectionContractRegistry[
      inputName
    ].requiredEvidenceProjection.requiredShapeOrContractIds) {
      if (forbiddenS236Dependencies.has(shapeId)) {
        add(`s236_forbidden_dependency:${inputName}:${shapeId}`);
      }
      if (supportAndVirtualIds.has(shapeId)) {
        visitDependencies(inputName, shapeId, new Set(), new Set());
      }
    }
  }

  const supplyProfile =
    derivation.predicateValidationProfileRegistry["model-asset-rights-row.v1"];
  const supplyShape = supports["supply-chain-scan-source.v1"];
  const supplyDecision =
    supplyShape.typedPayloadNestedContracts.typedConditionsExactly.find(
      ({ conditionId }) => conditionId === "all_model_asset_rights_allowed",
    )?.literalJsonValue;
  const profileDecision = supplyProfile.typedConditionsExactly.find(
    ({ conditionId }) => conditionId === "rights_decision_exact",
  )?.literalJsonValue;
  if (
    supplyDecision !== profileDecision ||
    !supplyProfile.rowRequiredFieldsExactly.includes(
      "model_asset_rights_evidence_reference",
    )
  ) {
    add("model_asset_rights_contract");
  }

  if (
    !packetShape.sourceRowRequiredFields &&
    packetShape.gateIdVocabulary === undefined
  ) {
    // Keep the packet shape in the same validation surface without inventing
    // a separate execution engine in this contract-only work.
    add("gate_packet_shape_unreachable");
  }

  return errors;
}

function collectGateSampleErrors(sample) {
  const errors = [];
  const reviewedAt = Date.parse(sample.reviewedAt);
  for (const row of sample.inputRows) {
    if (
      row.scopeId !== sample.scopeId ||
      row.evaluationHeadSha !== sample.evaluationHeadSha ||
      row.evaluationTreeSha !== sample.evaluationTreeSha
    ) {
      errors.push(`mixed_cohort:${row.inputName}`);
    }
    if (
      !Number.isFinite(Date.parse(row.expiresAt)) ||
      Date.parse(row.expiresAt) <= reviewedAt
    ) {
      errors.push(`stale_expiry:${row.inputName}`);
    }
  }
  return errors;
}

function duplicateJsonKeyPaths(raw) {
  let cursor = 0;
  const duplicates = [];
  const skipWhitespace = () => {
    while (/\s/.test(raw[cursor] ?? "")) cursor += 1;
  };
  const parseString = () => {
    const start = cursor;
    cursor += 1;
    let escaped = false;
    while (cursor < raw.length) {
      const character = raw[cursor];
      cursor += 1;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') break;
    }
    return JSON.parse(raw.slice(start, cursor));
  };
  const parseValue = (path) => {
    skipWhitespace();
    if (raw[cursor] === "{") {
      cursor += 1;
      skipWhitespace();
      const keys = new Set();
      while (raw[cursor] !== "}") {
        const key = parseString();
        if (keys.has(key)) duplicates.push([...path, key].join("."));
        keys.add(key);
        skipWhitespace();
        assert.equal(raw[cursor], ":");
        cursor += 1;
        parseValue([...path, key]);
        skipWhitespace();
        if (raw[cursor] === ",") {
          cursor += 1;
          skipWhitespace();
        } else {
          break;
        }
      }
      cursor += 1;
      return;
    }
    if (raw[cursor] === "[") {
      cursor += 1;
      skipWhitespace();
      let index = 0;
      while (raw[cursor] !== "]") {
        parseValue([...path, index]);
        index += 1;
        skipWhitespace();
        if (raw[cursor] === ",") {
          cursor += 1;
          skipWhitespace();
        } else {
          break;
        }
      }
      cursor += 1;
      return;
    }
    if (raw[cursor] === '"') {
      parseString();
      return;
    }
    while (
      cursor < raw.length &&
      ![",", "]", "}"].includes(raw[cursor]) &&
      !/\s/.test(raw[cursor])
    ) {
      cursor += 1;
    }
  };
  parseValue([]);
  skipWhitespace();
  assert.equal(cursor, raw.length);
  return duplicates;
}

test("S235B stays contract-only on the exact authorized start and owned files", () => {
  assert.equal(contract.schemaVersion, "dabangil.first_round_foundation.v1");
  assert.equal(contract.roadmapItem, "S235B");
  assert.equal(contract.contractState, "contract_only");
  assert.equal(
    contract.liveStart.main,
    "9150aa788ca33be613640bfbe6e531d9993eb983",
  );
  assert.equal(
    contract.liveStart.tree,
    "9199ac07bb664fd6f0926314a26b94d7c235b7e7",
  );
  assert.equal(contract.liveStart.trackingIssue, 653);
  assert.deepEqual(contract.ownedFileManifest, [
    docPath,
    contractPath,
    evidencePath,
    "tests/s235b-first-round-adaptive-mcq-foundation-contract.test.mjs",
    "tests/agent-factory-github-actions-button.test.mjs",
    "tests/agent-factory-roadmap-runner.test.mjs",
    "tests/dabangil-premium-alignment.test.mjs",
    "tests/practice-answer-review-engine.test.mjs",
    "tests/s214-reference-answer-pipeline.test.mjs",
    "tests/s215-reference-answer-release-gate.test.mjs",
    "tests/s216-error-notebook-gap-taxonomy.test.mjs",
    "tests/s217-personal-core-concept-graph.test.mjs",
    "tests/s218-similar-question-review-scheduler.test.mjs",
    "tests/s219-learner-catalog-usage-ledger.test.mjs",
    "tests/s220-billing-entitlement-credit-usage.test.mjs",
    "tests/s221-paid-trust-privacy-cost-guardrails.test.mjs",
    "tests/s222-academy-answer-operations-tenant-boundary.test.mjs",
    "tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs",
    "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
    "tests/theory-answer-review-engine.test.mjs",
    roadmapPath,
  ]);
  assert.deepEqual(contract.closeout.s235aManifestOverlap, [
    ...contract.closeout.serializedSharedTestMutations.paths,
    roadmapPath,
  ]);
  assert.equal(contract.closeout.s235aManifestOverlapPathCount, 17);
  assert.equal(
    contract.closeout.s235aManifestOverlapDerivation,
    "exact_intersection_of_live_merged_PR_656_changed_file_manifest_and_ownedFileManifest",
  );
  assert.deepEqual(
    contract.closeout.laneSpecificPathsDisjointFromS235A,
    contract.ownedFileManifest.slice(0, 4),
  );
  assert.equal(
    contract.closeout.allOverlapMutationsSerializedAfterS235AMerge,
    true,
  );
  assert.equal(
    contract.closeout.state,
    "s235a_priority_merge_reconciled_roadmap_closeout_serialized",
  );
  assert.equal(contract.closeout.s235aMergedPullRequest, 656);
  assert.equal(
    contract.closeout.s235aMergedCommit,
    "dac5777dab76c95a1451e2adef147b976909c4bd",
  );
  assert.equal(
    contract.closeout.s235aMergedTree,
    "5bad82f70346adfaa7dbe71268c5cb07769756aa",
  );
  assert.equal(contract.closeout.overlapReleasedAfterPriorityMerge, true);
  assert.equal(contract.closeout.sharedRoadmapMutationAllowedNow, true);
  assert.deepEqual(contract.closeout.serializedRoadmapMutation, {
    path: roadmapPath,
    itemId: "S235B",
    field: "status",
    from: "queued",
    to: "completed",
    allOtherRoadmapFieldsUnchanged: true,
    downstreamStatusMutationAllowed: false,
    automaticDownstreamStartAllowed: false,
  });
  assert.deepEqual(contract.closeout.serializedSharedTestMutations, {
    paths: [
      "tests/agent-factory-github-actions-button.test.mjs",
      "tests/agent-factory-roadmap-runner.test.mjs",
      "tests/dabangil-premium-alignment.test.mjs",
      "tests/practice-answer-review-engine.test.mjs",
      "tests/s214-reference-answer-pipeline.test.mjs",
      "tests/s215-reference-answer-release-gate.test.mjs",
      "tests/s216-error-notebook-gap-taxonomy.test.mjs",
      "tests/s217-personal-core-concept-graph.test.mjs",
      "tests/s218-similar-question-review-scheduler.test.mjs",
      "tests/s219-learner-catalog-usage-ledger.test.mjs",
      "tests/s220-billing-entitlement-credit-usage.test.mjs",
      "tests/s221-paid-trust-privacy-cost-guardrails.test.mjs",
      "tests/s222-academy-answer-operations-tenant-boundary.test.mjs",
      "tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs",
      "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
      "tests/theory-answer-review-engine.test.mjs",
    ],
    scope:
      "update_only_live_roadmap_status_ready_set_and_report_only_target_expectations_for_s235b_closeout",
    expectedReadyItemIds: ["O3A", "S236B"],
    reportOnlyPlannerTargetChangedFrom: "S235B",
    reportOnlyPlannerTargetChangedTo: "S236B",
    selectionAutomaticallyStartsWork: false,
    allOtherSharedTestsUnchanged: true,
  });

  assert.equal(contract.authorizationBoundary.contractsOnly, true);
  for (const field of [
    "realContentImported",
    "ocrBenchmarkExecuted",
    "learnerRuntimeImplemented",
    "learnerRuntimeActivated",
    "navigationExposed",
    "onboardingExposed",
    "pricingOrBillingChanged",
    "productionTelemetryClaimed",
    "schemaOrPersistenceChanged",
    "rlsChanged",
    "authChanged",
    "routesChanged",
    "providerModelPromptChanged",
    "dependencyOrEnvironmentChanged",
    "flagsOrAllowlistsChanged",
    "previewOrProductionChanged",
    "publicProductClaimAuthorized",
  ]) {
    assert.equal(contract.authorizationBoundary[field], false, field);
  }
});

test("official rules and five scored subjects are pinned without overstating raw evidence", () => {
  const rules = contract.officialRuleManifest;
  assert.equal(rules.examYear, 2026);
  assert.equal(rules.examRound, 37);
  assert.equal(rules.firstRoundExamDate, "2026-04-04");
  assert.equal(rules.subjectStructure.statutorySubjectCount, 6);
  assert.equal(rules.subjectStructure.scoredMcqSubjectCount, 5);
  assert.equal(rules.subjectStructure.statutorySubjectsIncludeEnglish, true);
  assert.equal(
    rules.subjectStructure.englishRule.kind,
    "external_qualifying_score_replacement",
  );
  assert.equal(rules.questionFormat.choiceCount, 5);
  assert.equal(rules.questionFormat.questionsPerScoredSubject, 40);
  assert.equal(rules.questionFormat.totalScoredQuestions, 200);
  assert.equal(rules.sessions[0].durationMinutes, 120);
  assert.equal(rules.sessions[1].durationMinutes, 80);
  assert.equal(rules.passRule.minimumPerScoredSubject, 40);
  assert.equal(rules.passRule.minimumAverageAcrossScoredSubjects, 60);
  assert.equal(rules.passRule.passProbabilityClaimAllowed, false);
  assert.equal(rules.evidenceIntegrityBoundary.noticeBodyCommitted, false);
  assert.equal(
    rules.evidenceIntegrityBoundary.noticeAssetRawBytesPersistedOrImportedByS235B,
    false,
  );
  assert.equal(
    rules.evidenceIntegrityBoundary.noticeAssetRawDigestComputedByS235B,
    false,
  );

  assert.deepEqual(
    contract.subjectTaxonomy.subjects.map((subject) => subject.subjectId),
    [
      "civil_law",
      "economics_principles",
      "real_estate_principles",
      "appraiser_related_law",
      "accounting",
    ],
  );
  assert.equal(
    contract.subjectTaxonomy.subjects.every(
      (subject) => subject.adapterState === "contract_only",
    ),
    true,
  );
  assert.equal(
    contract.subjectTaxonomy.detailedConceptTaxonomyOfficiallyVerified,
    false,
  );
});

test("per-post and per-asset Q-Net rights require exact tuples and typed authority", () => {
  const rights = contract.sourceRightsManifest;
  const receipt = rights.futureO3BReceiptContract;
  const scope = receipt.decisionScopeContract;

  assert.equal(rights.policy.publicAvailabilityImpliesRedistribution, false);
  assert.equal(rights.policy.postRightsRecordedSeparately, true);
  assert.equal(rights.policy.assetRightsRecordedSeparately, true);
  assert.equal(rights.policy.learnerPublicationAllowed, false);
  assert.equal(rights.posts.length, 3);
  assert.deepEqual(
    rights.posts.map((post) => post.postId),
    ["5250965", "5258924", "5262739"],
  );
  assert.deepEqual(
    rights.posts.flatMap((post) => post.assets.map((asset) => asset.assetId)),
    ["2247052", "2247053", "2253620", "2253621", "2256457"],
  );
  for (const asset of rights.posts.flatMap((post) => post.assets)) {
    assert.equal(asset.hashStatus, "raw_bytes_not_persisted_or_hashed_by_s235b");
    assert.equal(asset.sha256, null);
    assert.equal(asset.reviewStatus, "pending_O3B");
    assert.equal(asset.redistributionAllowedByThisContract, false);
  }

  assert.deepEqual(scope.scopeTupleRequiredFields, [
    "plane",
    "use",
    "audience",
  ]);
  assert.equal(scope.scopeTupleAdditionalFieldsAllowed, false);
  assert.equal(scope.unknownOrMissingScopeValueFailsClosed, true);
  assert.deepEqual(
    scope.audienceToPrincipalClassMapping.heldout_evaluator,
    "role:heldout_evaluator",
  );
  assert.deepEqual(
    scope.audienceToPrincipalClassMapping.heldout_readiness_runner,
    "workload:heldout_readiness_runner",
  );
  assert.equal(
    scope.finalDecisionScopeTupleCeilings
      .approved_cleared_redistribution_with_attribution.filter(
        (entry) => entry.plane === "first-round-heldout-vault-v1",
      ).length,
    2,
  );

  const authority = receipt.grantorAuthorityToLicenseEvidenceReceiptShape;
  const permissionEvidence =
    receipt.thirdPartyPermissionEvidenceReceiptShape;
  const permission = receipt.thirdPartyPermissionReceiptShape;
  assert.equal(authority.bodyless, true);
  assert.equal(
    authority.requiredDecision,
    "verified_current_grantor_authority_to_license",
  );
  assert.equal(
    authority.requiredFields.includes("raw_authority_evidence_sha256"),
    true,
  );
  assert.equal(
    authority.requiredFields.includes("revocation_status"),
    true,
  );
  assert.equal(
    permissionEvidence.requiredFields.includes(
      "grantor_authority_to_license_evidence_reference",
    ),
    true,
  );
  assertIncludesInvariant(
    permissionEvidence,
    "resolves_to_grantorAuthorityToLicenseEvidenceReceiptShape",
  );
  assertIncludesInvariant(
    permission,
    "resolves_to_thirdPartyPermissionEvidenceReceiptShape",
  );

  const crosswalk =
    receipt.rightsBasisEvidenceToPrimaryBasisCrosswalk;
  assert.equal(crosswalk.closedWorld, true);
  assert.deepEqual(crosswalk.rowKeyFieldsExactly, [
    "evidence_kind",
    "evidence_decision",
    "basis_type",
    "basis_decision",
  ]);
  assert.deepEqual(
    crosswalk.rowsExactly,
    expectedRightsBasisCrosswalkRows(contract),
  );
  const byEvidenceKind = new Map(
    crosswalk.rowsExactly.map((row) => [row.evidence_kind, row]),
  );
  assert.deepEqual(
    byEvidenceKind.get("authoritative_no_basis_evidence"),
    expectedRightsBasisCrosswalkRows(contract).at(-1),
  );
  assert.deepEqual(
    byEvidenceKind.get("authoritative_metadata_link_citation_policy")
      .maximum_allowed_scope_tuples_exactly,
    [],
  );
  assert.deepEqual(
    byEvidenceKind.get("authoritative_owner_private_policy")
      .maximum_allowed_scope_tuples_exactly,
    scope.finalDecisionScopeTupleCeilings.approved_owner_private_use,
  );
  assert.deepEqual(
    byEvidenceKind.get("official_post_license_label_or_terms")
      .maximum_allowed_scope_tuples_exactly,
    scope.finalDecisionScopeTupleCeilings
      .approved_cleared_redistribution_with_attribution,
  );
});

test("Law and K-IFRS version evidence is raw-identity and extraction bound", () => {
  const law = contract.versionStatusManifests.law;
  const kifrs = contract.versionStatusManifests.kifrs;

  assert.equal(law.examDate, "2026-04-04");
  assert.equal(law.releaseOnUnresolvedAllowed, false);
  assert.equal(law.requiredAuthorities.length, 10);
  assert.equal(
    law.requiredAuthorities.every(
      (entry) =>
        entry.examDateVersionStatus ===
        "unresolved_requires_exact_official_snapshot",
    ),
    true,
  );
  assert.equal(
    law.examDateApplicabilityProofContract
      .officialVersionHistoryReceiptShape.requiredFields.includes(
        "history_extraction_receipt_reference",
      ),
    true,
  );
  assert.equal(
    law.examDateApplicabilityProofContract
      .officialVersionHistoryExtractionReceiptShape.requiredFields.includes(
        "raw_history_sha256",
      ),
    true,
  );
  assert.equal(
    law.examDateApplicabilityProofContract.proofBindingInvariants.some(
      (entry) => entry.includes("exam_date_equals"),
    ),
    true,
  );

  assert.equal(kifrs.examDate, "2026-04-04");
  assert.equal(kifrs.releaseOnUnresolvedAllowed, false);
  assert.equal(kifrs.standardTextStored, false);
  assert.equal(
    kifrs.examDateCompletenessStatus,
    "unresolved_requires_amendment_review_through_2026-04-04",
  );
  const proof = kifrs.examDateCompletenessProofContract;
  assert.ok(proof.indexPageEntryExtractionReceiptShape);
  assert.equal(
    proof.inventoryRecordRequiredFields.includes(
      "source_index_entry_extraction_receipt_reference",
    ),
    true,
  );
  assert.equal(
    proof.indexCoverageInvariants.some((entry) =>
      entry.includes("exact_ordered_indexId_projection"),
    ),
    true,
  );
});

test("private capture and rapid answer grid are Personal-vault, bodyless, and dormant", () => {
  const capture = contract.intakeContracts.privateCapture;
  const grid = contract.intakeContracts.rapidAnswerGrid;

  assert.equal(capture.rawPlane, "Personal Raw Vault");
  assert.equal(capture.rightsStatus, "private_personal_use_only");
  assert.equal(capture.collectionAllowedNow, false);
  assert.equal(capture.mayEnterClearedContentBank, false);
  assert.equal(capture.runtimeImplementedByThisWork, false);

  assert.equal(grid.bodyless, true);
  assert.equal(grid.dataPlane, "Personal Raw Vault");
  assert.equal(grid.crossVaultEqualityHandleAllowed, false);
  assert.equal(grid.collectionAllowedNow, false);
  assert.equal(grid.runtimeImplementedByThisWork, false);
  assert.deepEqual(
    grid.fieldDefinitions.map((entry) => entry.field),
    grid.requiredFields,
  );
  assert.deepEqual(grid.forbiddenFields, [
    "raw_question_body",
    "raw_answer_body",
    "raw_ocr_body",
    "source_excerpt",
  ]);
  assert.equal(grid.futureSharedSignalAdapter.collectionOrExportAllowedNow, false);
  assert.equal(
    grid.futureSharedSignalAdapter.rapidGridResponseCommitmentContract
      .rawGridIdItemReferenceChoiceOrKeyMayEnterExport,
    false,
  );
});

test("five-choice release is static while attempt feedback and validators are closed", () => {
  const five = contract.fiveChoiceCorrectionContract;
  const release = five.releaseReceiptContract;

  assert.equal(five.choiceCount, 5);
  assert.equal(five.officialKeyMayBeSetByModel, false);
  assert.equal(
    release.requiredFields.includes("five_choice_feedback_bundle_receipt_reference_or_null"),
    true,
  );
  assert.equal(release.requiredFields.includes("feedback_state"), false);
  for (const field of [
    "ordered_content_attribution_rows",
    "ordered_content_attribution_rows_digest",
    "ordered_unique_attributions",
    "ordered_unique_attributions_digest",
  ]) {
    assert.equal(release.requiredFields.includes(field), true, field);
  }
  assert.deepEqual(
    release.verifiedOfficialKeyReceiptShape
      .keyAttributionProjectionContract.orderedSourceFieldsExactly,
    ["key_post_exact_attribution", "key_asset_exact_attribution"],
  );
  assert.equal(
    release.verifiedOfficialKeyReceiptShape
      .keyAttributionProjectionContract.normalizationAllowed,
    false,
  );
  assert.deepEqual(
    release.contentRightsAttributionProjectionContract
      .orderedSourceProjectionExactly.map(({ content_role }) => content_role),
    [
      "question_source_post",
      "question_source_asset",
      "question_item_object",
      "official_key_source_post",
      "official_key_source_asset",
      "choice_correction_object",
      "choice_explanation_object",
    ],
  );
  assert.match(
    release.contentRightsAttributionProjectionContract
      .orderedUniqueAttributionContract.deterministicDisplayRule,
    /separate_attribution_block/,
  );
  const unequalAttributionFixture = [
    "Question attribution A",
    "Key attribution B",
    "Feedback attribution C",
    "Key attribution B",
    "question attribution a",
  ];
  assert.deepEqual(
    unequalAttributionFixture.filter(
      (value, index, values) => values.indexOf(value) === index,
    ),
    [
      "Question attribution A",
      "Key attribution B",
      "Feedback attribution C",
      "question attribution a",
    ],
  );
  assert.deepEqual(
    five.fiveChoiceFeedbackBundleReceiptShape
      .feedbackAttributionKindVocabulary,
    ["correction_object", "explanation_object"],
  );
  assert.equal(
    five.fiveChoiceFeedbackBundleReceiptShape.requiredFields.includes(
      "ordered_feedback_attribution_rows",
    ),
    true,
  );
  assert.equal(
    release.receiptBindingInvariants.some((entry) =>
      entry.includes("attempt_scoped_feedback_cause_gap_action_and_retry"),
    ),
    true,
  );
  assert.equal(five.causeRules.primaryCauseMax, 1);
  assert.equal(five.causeRules.secondaryCauseCodesAllowed, false);
  assert.equal(
    five.feedbackOutcome.reviewedFeedbackReceiptShape.storagePlane,
    "Personal Raw Vault",
  );

  const matrixIds = Object.entries(
    five.deterministicValidatorContractMatrix,
  )
    .filter(([, value]) => Array.isArray(value))
    .flatMap(([, value]) => value);
  const definitions = five.deterministicValidatorRegistry.definitions;
  assertSameMembers(Object.keys(definitions), matrixIds);
  for (const [id, definition] of Object.entries(definitions)) {
    assert.ok(definition.contractVersion, id);
    assert.ok(definition.inputProjectionSchemaVersion, id);
    assert.ok(definition.validatorInputFactsRequiredFieldsExactly.length > 0, id);
    assertSameMembers(
      Object.keys(definition.validatorInputFactFieldContracts),
      definition.validatorInputFactsRequiredFieldsExactly,
      id,
    );
    assert.ok(definition.requiredAssertionIdsExactly.length > 0, id);
    assertSameMembers(
      Object.keys(definition.assertionToleranceAndUnitById),
      definition.requiredAssertionIdsExactly,
      id,
    );
  }
  assert.equal(
    five.deterministicValidatorInputDerivationReceiptShape.requiredDecision,
    "verified_deterministic_validator_input_derivation",
  );
  assertIncludesInvariant(
    five.deterministicValidatorResultArtifactReceiptShape,
    "no_missing_extra_duplicate_or_unknown_id",
  );
});

test("QTI stays static and mapping-only while xAPI and Caliper carry attempt cause", () => {
  const standards = contract.standardsMappingContracts;
  const cause = contract.fiveChoiceCorrectionContract.causeRules;

  assert.match(cause.adapterPlacement.qti, /never_serialized_into_QTI/);
  assert.match(cause.adapterPlacement.xapi, /Statement\.context\.extensions/);
  assert.match(cause.adapterPlacement.caliper, /Event\.extensions/);
  assert.deepEqual(
    standards.qti.metadataExtensionDefinitions.map(
      (entry) => entry.sourceField,
    ),
    ["source_version_manifest_ids"],
  );
  assert.equal(
    standards.qti.metadataExtensionDefinitions.some((entry) =>
      entry.sourceField.includes("cause"),
    ),
    false,
  );
  assert.equal(standards.qti.catOrAdaptiveRuntimeImplied, false);
  assert.equal(standards.qti.importerExporterImplemented, false);
  for (const field of [
    "five_choice_release_receipt_reference_or_null",
    "ordered_content_attribution_rows_digest_or_null",
    "ordered_unique_attributions_or_null",
    "ordered_unique_attributions_digest_or_null",
  ]) {
    assert.equal(
      standards.internalItemSchema.fields.some(
        (definition) => definition.field === field,
      ),
      true,
      field,
    );
  }
  const itemBodyMapping = standards.qti.mappingRecords.find(
    ({ targetField }) => targetField === "qti-item-body",
  );
  const modalMapping = standards.qti.mappingRecords.find(
    ({ targetField }) =>
      targetField ===
      "qti-modal-feedback@identifier, @outcome-identifier, @show-hide, qti-content-body",
  );
  assert.match(itemBodyMapping.constraint, /separate attribution block/);
  assert.match(modalMapping.constraint, /separate attribution block/);
  assert.match(
    standards.qti.responseProcessingContract.customInlineScoreAndFeedback
      .feedbackContentResolution,
    /ordered_unique_attribution.*separate_attribution_block/,
  );
  assert.equal(
    standards.qti.contentPackageManifestContract.packageClaim,
    "mapping_ready_only_not_validated_or_conformant",
  );
  assert.equal(standards.xapi.lrsTransportStorageQueryImplemented, false);
  assert.equal(standards.caliper.sensorOrDeliveryImplemented, false);
  assert.equal(standards.caliper.analyticsEfficacyClaimAllowed, false);
  assert.equal(standards.internalEventEnvelope.productionCollectionAuthorized, false);
});

test("Gold and held-out ingress prove target bytes and exact per-object rights", () => {
  const separation = contract.goldHeldOutSeparationContract;
  const rightsProjection =
    separation.ingressedObjectBindingRecordContract
      .sourceRightsExactProjectionByContentClass;

  assert.equal(separation.physicalSeparationRequired, true);
  assert.equal(separation.physicalSeparationImplementedByThisWork, false);
  assert.equal(separation.crossBoundaryRules.sharedStorageRootAllowed, false);
  assert.equal(separation.crossBoundaryRules.sharedEncryptionKeyAllowed, false);
  assert.equal(separation.targetVaultObjectReferenceShape.bodyless, true);
  assert.equal(
    separation.targetVaultWriteContentIdentityReceiptShape.requiredDecision,
    "verified_target_vault_write_and_content_identity",
  );
  assertIncludesInvariant(
    separation.targetVaultWriteContentIdentityReceiptShape,
    "target_content_sha256_equals_target_object_reference.object_sha256_equals_source_content_sha256",
  );

  assert.equal(rightsProjection.question_item.requiredReferenceCount, 3);
  assert.equal(rightsProjection.verified_official_key.requiredReferenceCount, 2);
  assert.equal(rightsProjection.correction_object.requiredReferenceCount, 1);
  assert.equal(rightsProjection.explanation_object.requiredReferenceCount, 1);
  assert.deepEqual(
    rightsProjection.verified_official_key
      .orderedAttributionSourceProjectionExactly,
    [
      "resolved_verified_official_key_receipt.key_post_exact_attribution",
      "resolved_verified_official_key_receipt.key_asset_exact_attribution",
    ],
  );
  assert.deepEqual(
    rightsProjection.correction_object
      .orderedAttributionSourceProjectionExactly,
    ["resolved_correction_object_rights_receipt.exact_attribution"],
  );
  assert.deepEqual(
    rightsProjection.explanation_object
      .orderedAttributionSourceProjectionExactly,
    ["resolved_explanation_object_rights_receipt.exact_attribution"],
  );
  assert.equal(
    separation.ingressedObjectBindingRecordContract.requiredFields.includes(
      "source_exact_attributions",
    ),
    true,
  );
  for (const ingress of [
    separation.goldIngressReceiptShape,
    separation.heldOutIngressReceiptShape,
  ]) {
    for (const field of [
      "ordered_content_attribution_rows",
      "ordered_content_attribution_rows_digest",
      "ordered_unique_attributions",
      "ordered_unique_attributions_digest",
    ]) {
      assert.equal(ingress.requiredFields.includes(field), true, field);
    }
  }
  assertIncludesInvariant(
    separation.ingressedObjectBindingRecordContract,
    "is_nonempty_unique_and_equals_sourceRightsExactProjectionByContentClass",
  );
  assertIncludesInvariant(
    separation.goldIngressReceiptShape,
    "same_cardinality_and_members_as_ordered_unique_attributions_independent_of_binding_record_order",
  );
  assertIncludesInvariant(
    separation.heldOutIngressReceiptShape,
    "same_cardinality_and_members_as_ordered_unique_attributions_independent_of_binding_record_order",
  );

  const goldTuples =
    separation.goldIngressReceiptShape.ingressDecisionMatrix[
      "Cleared Content Bank"
    ].requiredDecisionScopeTuplesExactly;
  const heldoutTuples =
    separation.heldOutIngressReceiptShape.ingressDecisionMatrix[
      "Cleared Content Bank"
    ].requiredDecisionScopeTuplesExactly;
  assert.equal(goldTuples.length, 2);
  assert.equal(heldoutTuples.length, 2);
  assertSameMembers(
    heldoutTuples.map((entry) => entry.audience),
    ["heldout_evaluator", "heldout_readiness_runner"],
  );
  assertIncludesInvariant(
    separation.heldOutIngressReceiptShape,
    "one_record_for_every_nonnull_correction_and_explanation",
  );
  assert.equal(
    separation.manifestItemCommonRequiredFields.includes(
      "target_object_references",
    ),
    true,
  );
  assert.equal(
    contract.timedOmrReadinessContract.omrShape.formManifestReceiptShape
      .positionEntryRequiredFields.includes(
        "target_question_item_object_reference",
      ),
    true,
  );
  assertIncludesInvariant(
    separation.heldoutNormalizedInputManifestReceiptShape,
    "Cleared_Content_Bank_or_source_question_reference_dereference_for_normalization_is_forbidden",
  );
  assertIncludesInvariant(
    separation.contaminationResultArtifactReceiptShape,
    "resolves_only_in_the_exact_heldout_target_vault",
  );
});

test("comparison contamination evidence is authoritative, extracted, and replayed", () => {
  const separation = contract.goldHeldOutSeparationContract;
  const representation =
    separation.comparisonSetSourceRepresentationReceiptShape;
  const extraction = separation.comparisonSetSourceExtractionReceiptShape;
  const completeness =
    separation.comparisonSetSourceCompletenessReceiptShape;

  assert.equal(
    representation.requiredDecision,
    "verified_authoritative_comparison_source_representation",
  );
  assert.equal(
    extraction.requiredDecision,
    "verified_complete_comparison_source_extraction",
  );
  assertIncludesInvariant(
    extraction,
    "omitted_added_reordered_or_altered_record_fails_closed",
  );
  assertIncludesInvariant(
    completeness,
    "exact_concatenation_of_all_ordered_segment_change_rows",
  );
  assertIncludesInvariant(
    completeness,
    "applying_each_add_update_or_delete",
  );
  assert.equal(
    separation.contaminationResultArtifactReceiptShape.bindingInvariants.some(
      (entry) => entry.includes("exactly_one_result_for_every_heldout_item"),
    ),
    true,
  );
  assert.equal(
    separation.heldOutAccessLogCompletenessReceiptShape.requiredDecision,
    "verified_gap_free_access_log_coverage",
  );
});

test("Personal event logs, exposure lineage, timing, and OMR are precommitted", () => {
  const omr = contract.timedOmrReadinessContract.omrShape;
  const boundary = contract.timedOmrReadinessContract.dataBoundary;
  const ownerDecision = "owner_approved_exact_O3B_scope_and_exclusions";

  for (const key of [
    "personalEventLogPolicyReceiptShape",
    "personalEventLogSourceReceiptShape",
    "personalEventLogSegmentReceiptShape",
    "personalEventLogHeadCheckpointReceiptShape",
    "personalEventLogCompletenessReceiptShape",
    "personalExposureTrackingInceptionReceiptShape",
    "personalSessionEventLogPrecommitReceiptShape",
    "personalLineageKeyRotationChainReceiptShape",
    "personalStableLineageDerivationReceiptShape",
    "personalExposureLineageReceiptShape",
  ]) {
    assert.ok(omr[key], key);
  }
  assertIncludesInvariant(
    omr.personalEventLogCompletenessReceiptShape,
    "exact_concatenation",
  );
  assertIncludesInvariant(
    omr.personalExposureTrackingInceptionReceiptShape,
    "before_any_system_path_could_present",
  );
  assertIncludesInvariant(
    omr.personalSessionEventLogPrecommitReceiptShape,
    "committed_at_lte_session_started_at",
  );
  assert.equal(boundary.crossPlaneApprovalRequired, ownerDecision);
  assert.equal(
    boundary.crossPlaneApprovalEvidenceContractId,
    "owner-scope-decision-evidence.v1",
  );
  for (const shape of [
    omr.personalSessionEventLogPrecommitReceiptShape,
    omr.evaluationBindingPrecommitReceiptShape,
    omr.commitmentPolicyReceiptShape,
    omr.ephemeralBridgePolicyReceiptShape,
    omr.crossPlaneEvaluationBindingReceiptShape,
  ]) {
    assert.equal(
      shape.requiredFields.includes(
        "owner_scope_decision_receipt_reference",
      ),
      true,
    );
    assert.equal(shape.requiredFields.includes("owner_scope_decision"), true);
    assertIncludesInvariant(
      shape,
      "owner_scope_decision_equals_timedOmrReadinessContract.dataBoundary.crossPlaneApprovalRequired",
    );
  }
  assertIncludesInvariant(
    omr.personalLineageKeyRotationChainReceiptShape,
    "epoch_count_equals_one",
  );
  assertIncludesInvariant(
    omr.personalStableLineageDerivationReceiptShape,
    "fresh_stable_token",
  );
  assert.equal(
    omr.personalExposureLineageReceiptShape.lineageRowRequiredFields.includes(
      "stable_lineage_derivation_receipt_reference",
    ),
    true,
  );
  assert.equal(
    omr.personalExposureLedgerReceiptShape.requiredFields.includes(
      "complete_exposure_event_log_receipt_reference",
    ),
    true,
  );
  assert.equal(
    omr.personalAssistanceAuditReceiptShape.requiredFields.includes(
      "complete_assistance_event_log_receipt_reference",
    ),
    true,
  );
  assert.equal(
    omr.timingProvenanceReceiptShape.requiredFields.includes(
      "complete_timing_event_log_completeness_receipt_reference",
    ),
    true,
  );

  assertIncludesInvariant(
    omr.evaluationBindingPrecommitReceiptShape,
    "timed_session_receipt_is_finalized",
  );
  assertIncludesInvariant(
    omr.scoringReceiptShape,
    "evaluation_binding_precommit",
  );
  assertIncludesInvariant(
    omr.crossPlaneEvaluationBindingReceiptShape,
    "evaluation_started_at_lte_every_bound_scoring_receipt",
  );
  assert.equal(omr.crossPlaneEvaluationBindingReceiptShape.bodyless, true);
  const crossPlaneProjection =
    contract.laterGateEvidence.O3B.requiredInputProjectionContractRegistry
      .cross_plane_evaluation_binding_and_nonidentifying_comparison_receipt_set;
  assert.equal(
    crossPlaneProjection.requiredEvidenceProjection.requiredShapeOrContractIds
      .includes("owner-scope-decision-evidence.v1"),
    true,
  );
  assert.equal(
    crossPlaneProjection.ownerApprovalBindingContract
      .everyReferenceIdentityMustEqualExactScopeInputEvidenceIdVersionAndSha256,
    true,
  );
  assert.equal(
    contract.timedOmrReadinessContract.runtimeImplementedByThisWork,
    false,
  );
});

test("S236B and O3B packets are exact, current, accepted, and non-automatic", () => {
  const later = contract.laterGateEvidence;
  const packet = later.gateEvidencePacketReceiptShape;
  const inputEvidence = later.gateInputEvidenceReceiptShape;

  assert.equal(packet.denyUnknownFields, true);
  assert.equal(packet.inputRowsDigestContract.algorithm, "sha256");
  assert.equal(
    packet.inputRowsDigestContract.canonicalization,
    "RFC_8785_JSON_Canonicalization_Scheme",
  );
  assert.equal(packet.requiredFields.includes("packet_valid_until"), true);
  assertIncludesInvariant(
    packet,
    "no_missing_extra_duplicate_or_unknown_input",
  );
  assertIncludesInvariant(packet, "requiredInputAcceptanceContract");
  assertIncludesInvariant(packet, "strictly_before_packet_valid_until");
  assert.equal(
    inputEvidence.requiredDecision,
    "verified_current_gate_input_evidence",
  );

  for (const gateId of ["S236B", "O3B"]) {
    const gate = later[gateId];
    assert.ok(gate.exactScopeId);
    assert.equal(
      gate.immutableInputBindingContract.requiredPacketReceiptShape,
      "gateEvidencePacketReceiptShape",
    );
    assert.equal(
      gate.immutableInputBindingContract.requiredPacketSchemaVersion,
      "appraiser.first.gate-evidence-packet.v1",
    );
    assertSameMembers(
      Object.keys(gate.requiredInputAcceptanceContract),
      gate.requiredInputs,
      `${gateId} acceptance registry`,
    );
    assertSameMembers(
      Object.keys(gate.requiredInputEvidenceContractRegistry),
      gate.requiredInputs,
      `${gateId} evidence registry`,
    );
    for (const inputName of gate.requiredInputs) {
      const registry = gate.requiredInputEvidenceContractRegistry[inputName];
      assert.ok(registry.contractId, `${gateId}:${inputName}`);
      assert.ok(registry.requiredPayloadSchemaVersion, `${gateId}:${inputName}`);
      assert.equal(registry.requiredUnderlyingStatus, "verified_current");
      assert.ok(registry.requiredUnderlyingDecision, `${gateId}:${inputName}`);
      assert.ok(registry.requiredIssuerOrReviewerClass, `${gateId}:${inputName}`);
      assert.equal(registry.nullExpiryAllowed, false);
    }
  }
  assert.equal(later.S236B.status, "queued_not_started");
  assert.equal(later.S236B.automaticStartAllowed, false);
  assert.equal(later.O3B.status, "queued_unapproved");
  assert.equal(later.O3B.automaticApprovalAllowed, false);
});

test("gate registries, source references, predicates, specs, and transforms close mechanically", () => {
  assert.deepEqual(collectContractErrors(contract), []);

  const later = contract.laterGateEvidence;
  const coherence = later.gateCrossInputCoherenceReceiptShape;
  assert.deepEqual(
    coherence.crossInputCoherenceMatrix.S236B.map(
      (dimension) => dimension.dimensionId,
    ),
    [
      "candidate_set_preimage",
      "candidate_set_scalar_carriers",
      "candidate_configuration_preimage",
      "candidate_configuration_scalar_carriers",
      "fixture_manifest_sha256",
      "environment_identity",
      "rollback_state_sha256",
    ],
  );
  assert.equal(
    Object.keys(coherence.canonicalRootDerivationSpecRegistry).length,
    88,
  );
  const ownerScopeDimension = coherence.crossInputCoherenceMatrix.O3B.find(
    ({ dimensionId }) => dimensionId === "owner_scope_decision_identity",
  );
  assert.deepEqual(
    ownerScopeDimension.canonicalRootPreimage.orderedFieldsExactly,
    ["evidence_id", "evidence_version", "evidence_sha256"],
  );
  assert.equal(
    Object.keys(coherence.canonicalSourceTransformationRegistry)
      .filter((key) =>
        key.startsWith("O3B.owner_scope_decision_identity."),
      ).length,
    15,
  );
  const privacyPrecommitDimension =
    coherence.crossInputCoherenceMatrix.O3B.find(
      ({ dimensionId }) =>
        dimensionId === "privacy_timed_session_precommit_identity",
    );
  assert.deepEqual(
    privacyPrecommitDimension.canonicalRootPreimage.orderedFieldsExactly,
    ["evidence_id", "evidence_version", "evidence_sha256"],
  );
  assert.equal(
    Object.keys(coherence.canonicalSourceTransformationRegistry)
      .filter((key) =>
        key.startsWith(
          "O3B.privacy_timed_session_precommit_identity.",
        ),
      ).length,
    6,
  );

  const candidateSetDimension =
    coherence.crossInputCoherenceMatrix.S236B.find(
      ({ dimensionId }) => dimensionId === "candidate_set_preimage",
    );
  const candidateConfigurationDimension =
    coherence.crossInputCoherenceMatrix.S236B.find(
      ({ dimensionId }) => dimensionId === "candidate_configuration_preimage",
    );
  assert.deepEqual(
    candidateSetDimension.canonicalRootPreimage,
    contract.ocrBenchmarkContract.coherenceRootContracts.candidateSetSha256
      .canonicalPreimageValueContract,
  );
  assert.deepEqual(
    candidateConfigurationDimension.canonicalRootPreimage,
    contract.ocrBenchmarkContract.coherenceRootContracts
      .candidateConfigurationSha256.canonicalPreimageValueContract,
  );
  for (const root of Object.values(
    contract.ocrBenchmarkContract.coherenceRootContracts,
  ).filter((value) => value.preimageFieldsExactly)) {
    assert.deepEqual(root.preimageFieldsExactly, [
      "canonical_preimage_schema_version",
      "canonical_preimage_value",
    ]);
  }

  assert.deepEqual(
    later.gateCoherenceRootDerivationReceiptShape.sourceRowRequiredFields,
    later.gateInputEvidenceReceiptShape
      .coherenceRootSourceProjectionRowRequiredFields,
  );
  assert.equal(
    later.gateCoherenceRootDerivationReceiptShape
      .canonicalPreimageValueAssemblyContract.scalarObjectShape
      .everyFieldHasExactlyOneEmittedValue,
    true,
  );

  const preS236 =
    later.authoritativeSupportingEvidenceShapeRegistry[
      "benchmark-execution-source.v1"
    ];
  const postS236 =
    later.authoritativeSupportingEvidenceShapeRegistry[
      "post-s236b-benchmark-execution-source.v1"
    ];
  assert.equal(
    preS236.referenceFields.some((field) => field.includes("s236b_gate")),
    false,
  );
  assert.equal(
    postS236.referenceFields.includes("s236b_gate_packet_reference"),
    true,
  );
  assert.equal(
    postS236.referenceFields.includes(
      "s236b_trusted_git_snapshot_reference",
    ),
    true,
  );
});

test("applicability, population, privacy, supply-chain, and signature evidence is recomputable", () => {
  const five = contract.fiveChoiceCorrectionContract;
  assert.equal(
    five.subjectValidatorReceiptShape.requiredFields.includes(
      "deterministic_validator_applicability_receipt_references",
    ),
    true,
  );
  assert.match(
    five.subjectValidatorReceiptShape.bindingInvariants.join(" "),
    /applicable_projection/,
  );

  const later = contract.laterGateEvidence;
  const supports = later.authoritativeSupportingEvidenceShapeRegistry;
  const privacyProfile =
    later.gateAssertionDerivationReceiptShape
      .predicateValidationProfileRegistry["privacy-lifecycle-five-phase.v1"];
  assert.equal(privacyProfile.rowRequiredFieldsExactly.length, 19);
  assert.deepEqual(
    privacyProfile.positionalFieldValuesExactly
      .filter(({ jsonPointer }) => jsonPointer === "/phase_sequence_ordinal")
      .map(({ literalJsonValue }) => literalJsonValue),
    [1, 2, 3, 4, 5],
  );
  const privacyProfileLiterals = [];
  visitObjects(later, [], (value) => {
    if (typeof value.operator !== "string") return;
    const literal =
      typeof value.literalJsonValue === "string"
        ? value.literalJsonValue
        : value.right?.literalJsonValue;
    if (
      typeof literal === "string" &&
      literal.startsWith("privacy-lifecycle-")
    ) {
      privacyProfileLiterals.push(literal);
    }
  });
  assert.deepEqual(privacyProfileLiterals, [
    "privacy-lifecycle-five-phase.v1",
    "privacy-lifecycle-five-phase.v1",
    "privacy-lifecycle-five-phase.v1",
  ]);
  assertSameMembers(
    privacyProfile.rowSetConditionsExactly.map(({ operator }) => operator),
    [
      "privacy_lifecycle_temporal_chain_valid",
      "privacy_lifecycle_zero_residual_deletion_valid",
    ],
  );

  const supply = supports["supply-chain-scan-source.v1"];
  assert.equal(
    supply.requiredTypedPayloadFieldsExactly.includes(
      "ordered_candidate_inventory_disposition_rows_digest",
    ),
    true,
  );
  assert.equal(
    supply.referenceFields.includes(
      "ordered_component_none_required_evidence_references",
    ),
    true,
  );
  assert.equal(
    supply.referenceFields.includes(
      "ordered_model_asset_none_required_evidence_references",
    ),
    true,
  );

  const count = supports["count-computation-source.v1"];
  assert.equal(
    count.requiredTypedPayloadFieldsExactly.includes(
      "ordered_population_member_rows",
    ),
    true,
  );
  assert.equal(
    count.referenceFields.includes(
      "ordered_population_member_evidence_references",
    ),
    true,
  );
  assert.equal(
    count.typedPayloadNestedContracts.populationMemberRowAdditionalFieldsAllowed,
    false,
  );

  const official = supports["official-source-representation-source.v1"];
  assert.deepEqual(
    official.sourceReferenceContractsExactly.map(
      ({ typedPayloadReferenceField }) => typedPayloadReferenceField,
    ),
    official.referenceFields,
  );
  assert.equal(official.representationManifestContract.exactRepresentationCount, 7);

  const root = later.rootAuthorityEvidenceReceiptShape;
  assert.equal(
    root.signatureVerificationContract.algorithmEncodingContracts
      .ECDSA_P256_SHA256.malleabilityRule,
    "high_S_signatures_are_rejected_and_not_normalized",
  );
  assert.deepEqual(
    Object.keys(root.signedPayloadSchemaDefinitions).filter(
      (key) => key.endsWith(".v1"),
    ),
    [
      "github.merged-pr-ancestry-snapshot.v1",
      "program-lane-merge-owner-review.v1",
      "owner-o3b-scope-decision-attestation.v1",
    ],
  );
  for (const shapeName of [
    "commitmentPolicyReceiptShape",
    "ephemeralBridgePolicyReceiptShape",
    "rawChoiceDestructionReceiptShape",
  ]) {
    assert.ok(
      contract.timedOmrReadinessContract.omrShape[shapeName]
        .receiptDigestContract,
      shapeName,
    );
  }

  const omr = contract.timedOmrReadinessContract.omrShape;
  assert.deepEqual(omr.choiceCommitmentContract.saltRequirements, {
    decodedByteLength: 32,
    generator: "cryptographically_secure_random_number_generator",
    uniquePerSessionPosition: true,
    reuseAllowed: false,
    creationAndDurableOpeningMaterialPlane: "Personal Raw Vault",
    ephemeralOpeningScope:
      "future_owner_approved_memory_only_comparison_bridge",
    retentionInEvaluatorReceiptLogCacheBackupOrStoreAllowed: false,
  });
  assert.equal(
    omr.comparisonEvidenceReceiptShape.requiredFields.includes(
      "opening_salt_retained_in_receipt",
    ),
    true,
  );
  assert.equal(
    omr.comparisonEvidenceReceiptShape.requiredFields.includes(
      "commitment_salt_present",
    ),
    false,
  );
  assert.equal(
    omr.commitmentPolicyReceiptShape.requiredFields.includes(
      "opening_salt_required",
    ),
    true,
  );
  assert.equal(
    omr.commitmentPolicyReceiptShape.requiredFields.includes(
      "opening_salt_retention_in_evaluator_receipt_allowed",
    ),
    true,
  );
  assert.equal(
    omr.commitmentPolicyReceiptShape.bindingInvariants.includes(
      "opening_salt_retention_in_evaluator_receipt_allowed_is_false",
    ),
    true,
  );
  assert.match(
    doc,
    /unique 32-byte salt\s+is required in the Personal-vault\s+commitment and opening/i,
  );
  assert.match(
    evidence,
    /opening salt may enter only the\s+future Owner-approved memory-only bridge/i,
  );
  assert.doesNotMatch(doc, /no-salt, short-lived policy/i);
  assert.doesNotMatch(evidence, /no-salt commitment policy/i);
});

test("hostile mutations are rejected by the same mechanical validator", () => {
  const later = contract.laterGateEvidence;
  const firstDimension =
    later.gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.S236B[0];
  const firstInput = firstDimension.participatingInputsExactly[0];
  const firstSpecId = firstDimension.derivationSpecIdByInputExactly[firstInput];

  const missingSpec = structuredClone(contract);
  delete missingSpec.laterGateEvidence.gateCrossInputCoherenceReceiptShape
    .canonicalRootDerivationSpecRegistry[firstSpecId];
  assert.equal(
    collectContractErrors(missingSpec).includes("matrix_spec_union"),
    true,
  );

  const swappedReferences = structuredClone(contract);
  const swapped =
    swappedReferences.laterGateEvidence
      .authoritativeSupportingEvidenceShapeRegistry[
      "supply-chain-scan-source.v1"
    ].referenceFields;
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  assert.equal(
    collectContractErrors(swappedReferences).some((error) =>
      error.startsWith("support_reference_order:"),
    ),
    true,
  );

  const wrongPointer = structuredClone(contract);
  const wrongPointerSpec =
    wrongPointer.laterGateEvidence.gateCrossInputCoherenceReceiptShape
      .canonicalRootDerivationSpecRegistry[firstSpecId];
  const firstField = wrongPointerSpec.canonicalRootPreimage.orderedFieldsExactly[0];
  wrongPointerSpec.canonicalFieldSourceByNameExactly[
    firstField
  ].sourceRowsExactly[0].absoluteJsonPointer = "/rows/dimension_id=wrong";
  assert.equal(
    collectContractErrors(wrongPointer).some(
      (error) =>
        error.startsWith("selector_pointer:") ||
        error.startsWith("transform_mirror:"),
    ),
    true,
  );

  const wrongRoot = structuredClone(contract);
  wrongRoot.laterGateEvidence.gateCrossInputCoherenceReceiptShape
    .canonicalRootDerivationSpecRegistry[firstSpecId]
    .canonicalRootPreimage.schemaVersion = "wrong-root.v1";
  assert.equal(
    collectContractErrors(wrongRoot).includes(`spec_preimage:${firstSpecId}`),
    true,
  );

  const undefinedOwnerApproval = structuredClone(contract);
  undefinedOwnerApproval.timedOmrReadinessContract.dataBoundary
    .crossPlaneApprovalRequired = "undefined_owner_approval";
  assert.equal(
    collectContractErrors(undefinedOwnerApproval).includes(
      "cross_plane_owner_approval_contract",
    ),
    true,
  );

  const missingOwnerProjection = structuredClone(contract);
  missingOwnerProjection.laterGateEvidence.O3B
    .requiredInputProjectionContractRegistry
    .privacy_consent_purpose_retention_revocation_and_deletion_receipt_bundle
    .requiredEvidenceProjection.requiredShapeOrContractIds.shift();
  assert.equal(
    collectContractErrors(missingOwnerProjection).some(
      (error) =>
        error.startsWith("owner_scope_projection:") ||
        error.startsWith("spec_input_registry:"),
    ),
    true,
  );

  const missingOwnerReceiptReference = structuredClone(contract);
  const missingOwnerPrecommit =
    missingOwnerReceiptReference.timedOmrReadinessContract.omrShape
      .personalSessionEventLogPrecommitReceiptShape;
  missingOwnerPrecommit.requiredFields =
    missingOwnerPrecommit.requiredFields.filter(
      (field) => field !== "owner_scope_decision_receipt_reference",
    );
  assert.equal(
    collectContractErrors(missingOwnerReceiptReference).some((error) =>
      error.startsWith("cross_plane_owner_approval_receipt:"),
    ),
    true,
  );

  const missingPrivacyOwnerSource = structuredClone(contract);
  missingPrivacyOwnerSource.laterGateEvidence
    .authoritativeSupportingEvidenceShapeRegistry[
      "privacy-lifecycle-source.v1"
    ].sourceReferenceContractsExactly =
      missingPrivacyOwnerSource.laterGateEvidence
        .authoritativeSupportingEvidenceShapeRegistry[
          "privacy-lifecycle-source.v1"
        ].sourceReferenceContractsExactly.filter(
          ({ sourceRole }) =>
            sourceRole !== "owner_cross_plane_scope_decision",
        );
  assert.equal(
    collectContractErrors(missingPrivacyOwnerSource).some(
      (error) =>
        error === "privacy_owner_approval_binding" ||
        error.startsWith("support_reference_order:"),
    ),
    true,
  );

  const changedOwnerBoundPointer = structuredClone(contract);
  changedOwnerBoundPointer.laterGateEvidence.O3B.ownerScopeContract
    .crossPlaneAuthorizationBoundary
    .approvalBoundContractJsonPointersExactly[1] =
      "/goldHeldOutSeparationContract/goldIngressReceiptShape";
  assert.equal(
    collectContractErrors(changedOwnerBoundPointer).includes(
      "owner_scope_bound_contract_digest",
    ),
    true,
  );

  const missingOwnerCurrentnessNestedSchema = structuredClone(contract);
  const missingOwnerCurrentnessNestedContracts =
    missingOwnerCurrentnessNestedSchema.laterGateEvidence
      .authoritativeSupportingEvidenceShapeRegistry[
        "o3b-owner-scope-decision-source.v1"
      ].typedPayloadNestedContracts;
  missingOwnerCurrentnessNestedContracts
    .crossPlaneAuthorizationBoundaryContract.requiredFieldsExactly =
      missingOwnerCurrentnessNestedContracts
        .crossPlaneAuthorizationBoundaryContract.requiredFieldsExactly.filter(
          (field) => field !== "approvalActionTimeCurrentnessContract",
        );
  delete missingOwnerCurrentnessNestedContracts
    .approvalActionTimeCurrentnessContract;
  assert.equal(
    collectContractErrors(missingOwnerCurrentnessNestedSchema).includes(
      "cross_plane_owner_approval_nested_currentness_schema",
    ),
    true,
  );

  const alteredOwnerCurrentnessNestedSchema = structuredClone(contract);
  alteredOwnerCurrentnessNestedSchema.laterGateEvidence
    .authoritativeSupportingEvidenceShapeRegistry[
      "o3b-owner-scope-decision-source.v1"
    ].typedPayloadNestedContracts.approvalActionTimeCurrentnessContract
    .fieldContracts.reResolveImmediatelyBeforeEveryAction = "literal_false";
  assert.equal(
    collectContractErrors(alteredOwnerCurrentnessNestedSchema).includes(
      "cross_plane_owner_approval_nested_currentness_schema",
    ),
    true,
  );

  const mismatchedOwnerParticipant = structuredClone(contract);
  mismatchedOwnerParticipant.laterGateEvidence
    .gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.O3B
    .find(
      ({ dimensionId }) => dimensionId === "owner_scope_decision_identity",
    ).participatingInputsExactly.pop();
  assert.equal(
    collectContractErrors(mismatchedOwnerParticipant).includes(
      "owner_scope_coherence_contract",
    ),
    true,
  );

  const missingOwnerExpiryCoverage = structuredClone(contract);
  missingOwnerExpiryCoverage.laterGateEvidence.O3B
    .requiredInputExpiryCoverage
    .personal_event_log_inception_lineage_precommit_source_segment_head_and_completeness_receipt_set =
      "personal_log_inception_lineage_precommit_source_segment_head_or_completeness_changes";
  assert.equal(
    collectContractErrors(missingOwnerExpiryCoverage).some((error) =>
      error.startsWith("owner_scope_expiry:"),
    ),
    true,
  );

  const missingOwnerSignedSchema = structuredClone(contract);
  delete missingOwnerSignedSchema.laterGateEvidence
    .rootAuthorityEvidenceReceiptShape.signedPayloadSchemaDefinitions[
      "owner-o3b-scope-decision-attestation.v1"
    ];
  assert.equal(
    collectContractErrors(missingOwnerSignedSchema).includes(
      "owner_scope_root_attestation_schema",
    ),
    true,
  );

  const wrongOwnerSignedLiteral = structuredClone(contract);
  wrongOwnerSignedLiteral.laterGateEvidence.rootAuthorityEvidenceReceiptShape
    .signedPayloadSchemaDefinitions[
      "owner-o3b-scope-decision-attestation.v1"
    ].fieldTypesExactly.decision_type =
      "literal_owner_approved_exact_O3B_scope_and_exclusions";
  assert.equal(
    collectContractErrors(wrongOwnerSignedLiteral).includes(
      "owner_scope_root_attestation_schema",
    ),
    true,
  );

  const missingOwnerDecisionDigestRecomputation = structuredClone(contract);
  delete missingOwnerDecisionDigestRecomputation.laterGateEvidence
    .authoritativeSupportingEvidenceShapeRegistry[
      "o3b-owner-scope-decision-source.v1"
    ].typedPayloadNestedContracts.decisionPayloadDigestContract;
  assert.equal(
    collectContractErrors(missingOwnerDecisionDigestRecomputation).includes(
      "owner_scope_root_attestation_schema",
    ),
    true,
  );

  const alteredOwnerDecisionDigestRecomputation = structuredClone(contract);
  alteredOwnerDecisionDigestRecomputation.laterGateEvidence
    .authoritativeSupportingEvidenceShapeRegistry[
      "o3b-owner-scope-decision-source.v1"
    ].typedPayloadNestedContracts.decisionPayloadDigestContract.algorithm =
      "sha512";
  assert.equal(
    collectContractErrors(alteredOwnerDecisionDigestRecomputation).includes(
      "owner_scope_root_attestation_schema",
    ),
    true,
  );

  const wrongOwnerAnchorReferenceBinding = structuredClone(contract);
  wrongOwnerAnchorReferenceBinding.laterGateEvidence
    .virtualUnderlyingEvidenceShapeRegistry["owner-scope-decision-evidence.v1"]
    .assertionContractsExactly[0].passPredicate.conditionsExactly.find(
      ({ conditionId }) =>
        conditionId ===
        "O3B_owner_root_anchor_reference_matches_gate",
    ).right.jsonPointer = "/root_trust_anchor_projection_sha256";
  assert.equal(
    collectContractErrors(wrongOwnerAnchorReferenceBinding).includes(
      "owner_scope_root_anchor_gate_binding",
    ),
    true,
  );

  const wrongOwnerAnchorDigestBinding = structuredClone(contract);
  wrongOwnerAnchorDigestBinding.laterGateEvidence
    .virtualUnderlyingEvidenceShapeRegistry["owner-scope-decision-evidence.v1"]
    .assertionContractsExactly[0].passPredicate.conditionsExactly.find(
      ({ conditionId }) =>
        conditionId === "O3B_owner_root_anchor_digest_matches_gate",
    ).left.jsonPointer =
      "/typed_payload/root_trust_anchor_projection_reference";
  assert.equal(
    collectContractErrors(wrongOwnerAnchorDigestBinding).includes(
      "owner_scope_root_anchor_gate_binding",
    ),
    true,
  );

  const mismatchedPrivacySessionBridge = structuredClone(contract);
  const privacyBridgeSpec =
    mismatchedPrivacySessionBridge.laterGateEvidence
      .gateCrossInputCoherenceReceiptShape
      .canonicalRootDerivationSpecRegistry[
        "O3B.privacy_timed_session_precommit_identity.privacy_consent_purpose_retention_revocation_and_deletion_receipt_bundle.v1"
      ];
  privacyBridgeSpec.canonicalFieldSourceByNameExactly
    .evidence_sha256.sourceRowsExactly[0].absoluteJsonPointer =
      "/typed_payload/timed_session_precommit_reference/evidence_version";
  assert.equal(
    collectContractErrors(mismatchedPrivacySessionBridge).some(
      (error) =>
        error === "privacy_timed_session_precommit_identity" ||
        error.startsWith("transform_mirror:"),
    ),
    true,
  );
  const privacySessionA = {
    evidence_id: "privacy-session-a",
    evidence_version: "precommit.v1",
    evidence_sha256: "a".repeat(64),
  };
  const personalSessionB = {
    evidence_id: "personal-session-b",
    evidence_version: "precommit.v1",
    evidence_sha256: "b".repeat(64),
  };
  const privacyBridgeFields = [
    "evidence_id",
    "evidence_version",
    "evidence_sha256",
  ];
  assert.equal(
    privacyBridgeFields.every(
      (field) => privacySessionA[field] === personalSessionB[field],
    ),
    false,
    "privacy session A must not cohere with Personal-log session B",
  );

  const cyclicOwnerDerivation = structuredClone(contract);
  const cyclicOwnerDimension =
    cyclicOwnerDerivation.laterGateEvidence
      .gateCrossInputCoherenceReceiptShape.crossInputCoherenceMatrix.O3B
      .find(
        ({ dimensionId }) => dimensionId === "owner_scope_decision_identity",
      );
  const cyclicOwnerSpecId =
    cyclicOwnerDimension.derivationSpecIdByInputExactly[
      cyclicOwnerDimension.participatingInputsExactly[0]
    ];
  const cyclicOwnerSpec =
    cyclicOwnerDerivation.laterGateEvidence
      .gateCrossInputCoherenceReceiptShape
      .canonicalRootDerivationSpecRegistry[cyclicOwnerSpecId];
  cyclicOwnerSpec.canonicalFieldSourceByNameExactly
    .evidence_id.sourceRowsExactly[0].sourceKind =
      "selected_gate_input_evidence_receipt";
  cyclicOwnerSpec.canonicalFieldSourceByNameExactly
    .evidence_id.sourceRowsExactly[0].requiredShapeOrContractIdOrNull =
      "laterGateEvidence.gateInputEvidenceReceiptShape";
  assert.equal(
    collectContractErrors(cyclicOwnerDerivation).some(
      (error) =>
        error.startsWith("source_kind:") ||
        error.startsWith("derivation_self_reference:"),
    ),
    true,
  );

  const offsetXapiTimestamp = structuredClone(contract);
  offsetXapiTimestamp.standardsMappingContracts.internalSchema
    .occurredAtContract.exactRegex =
      "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|[+-]\\d{2}:\\d{2})$";
  assert.equal(
    collectContractErrors(offsetXapiTimestamp).includes(
      "xapi_timestamp_contract",
    ),
    true,
  );

  const futureXapiTimestamp = structuredClone(contract);
  futureXapiTimestamp.standardsMappingContracts.xapi
    .statementTimestampContract.futureTimestampAllowed = true;
  assert.equal(
    collectContractErrors(futureXapiTimestamp).includes(
      "xapi_timestamp_contract",
    ),
    true,
  );

  const forbiddenBootstrap = structuredClone(contract);
  forbiddenBootstrap.laterGateEvidence.S236B
    .requiredInputProjectionContractRegistry.tested_rollback_receipt
    .requiredEvidenceProjection.requiredShapeOrContractIds.push(
      "post-s236b-benchmark-execution-source.v1",
    );
  assert.equal(
    collectContractErrors(forbiddenBootstrap).some((error) =>
      error.startsWith("s236_forbidden_dependency:"),
    ),
    true,
  );

  const rightsMismatch = structuredClone(contract);
  const rightsProfile =
    rightsMismatch.laterGateEvidence.gateAssertionDerivationReceiptShape
      .predicateValidationProfileRegistry["model-asset-rights-row.v1"];
  rightsProfile.typedConditionsExactly.find(
    ({ conditionId }) => conditionId === "rights_decision_exact",
  ).literalJsonValue = "wrong_rights_decision";
  assert.equal(
    collectContractErrors(rightsMismatch).includes(
      "model_asset_rights_contract",
    ),
    true,
  );

  const noBasisEscalation = structuredClone(contract);
  noBasisEscalation.sourceRightsManifest.futureO3BReceiptContract
    .rightsBasisEvidenceToPrimaryBasisCrosswalk.rowsExactly.find(
      ({ evidence_kind }) =>
        evidence_kind === "authoritative_no_basis_evidence",
    ).evidence_decision = "verified_current_basis_evidence";
  assert.equal(
    collectContractErrors(noBasisEscalation).includes(
      "rights_basis_crosswalk",
    ),
    true,
  );

  const metadataScopeEscalation = structuredClone(contract);
  metadataScopeEscalation.sourceRightsManifest.futureO3BReceiptContract
    .rightsBasisEvidenceToPrimaryBasisCrosswalk.rowsExactly.find(
      ({ evidence_kind }) =>
        evidence_kind === "authoritative_metadata_link_citation_policy",
    ).maximum_allowed_scope_tuples_exactly.push({
      plane: "Personal Raw Vault",
      use: "personal_service_processing",
      audience: "owner_user_private",
    });
  assert.equal(
    collectContractErrors(metadataScopeEscalation).includes(
      "rights_basis_crosswalk",
    ),
    true,
  );

  const privateScopeEscalation = structuredClone(contract);
  privateScopeEscalation.sourceRightsManifest.futureO3BReceiptContract
    .rightsBasisEvidenceToPrimaryBasisCrosswalk.rowsExactly.find(
      ({ evidence_kind }) =>
        evidence_kind === "authoritative_owner_private_policy",
    ).maximum_allowed_scope_tuples_exactly.push({
      plane: "Cleared Content Bank",
      use: "cleared_redistribution",
      audience: "authorized_learner",
    });
  assert.equal(
    collectContractErrors(privateScopeEscalation).includes(
      "rights_basis_crosswalk",
    ),
    true,
  );

  const omittedKeyAttribution = structuredClone(contract);
  const hostileKey =
    omittedKeyAttribution.fiveChoiceCorrectionContract.releaseReceiptContract
      .verifiedOfficialKeyReceiptShape;
  hostileKey.requiredFields = hostileKey.requiredFields.filter(
    (field) => field !== "key_asset_exact_attribution",
  );
  hostileKey.receiptDigestContract.coveredFieldsExactly =
    hostileKey.receiptDigestContract.coveredFieldsExactly.filter(
      (field) => field !== "key_asset_exact_attribution",
    );
  assert.equal(
    collectContractErrors(omittedKeyAttribution).includes(
      "content_attribution_receipt_fields",
    ),
    true,
  );

  const collapsedDifferentAttributions = structuredClone(contract);
  collapsedDifferentAttributions.fiveChoiceCorrectionContract
    .releaseReceiptContract.contentRightsAttributionProjectionContract
    .orderedUniqueAttributionContract.normalizationAllowed = true;
  assert.equal(
    collectContractErrors(collapsedDifferentAttributions).includes(
      "content_attribution_projection",
    ),
    true,
  );

  const omittedFeedbackAttribution = structuredClone(contract);
  omittedFeedbackAttribution.fiveChoiceCorrectionContract
    .releaseReceiptContract.contentRightsAttributionProjectionContract
    .orderedSourceProjectionExactly.pop();
  assert.equal(
    collectContractErrors(omittedFeedbackAttribution).includes(
      "content_attribution_projection",
    ),
    true,
  );

  const substitutedIngressAttribution = structuredClone(contract);
  substitutedIngressAttribution.goldHeldOutSeparationContract
    .ingressedObjectBindingRecordContract
    .sourceRightsExactProjectionByContentClass.explanation_object
    .orderedAttributionSourceProjectionExactly[0] =
      "resolved_question_item_object_rights_receipt.exact_attribution";
  assert.equal(
    collectContractErrors(substitutedIngressAttribution).includes(
      "content_attribution_object_binding",
    ),
    true,
  );

  const qtiAttributionOmitted = structuredClone(contract);
  qtiAttributionOmitted.standardsMappingContracts.internalItemSchema.fields =
    qtiAttributionOmitted.standardsMappingContracts.internalItemSchema.fields
      .filter(
        ({ field }) =>
          field !== "ordered_unique_attributions_or_null",
      );
  assert.equal(
    collectContractErrors(qtiAttributionOmitted).includes(
      "qti_content_attribution_projection",
    ),
    true,
  );

  const incompatibleIngressOrder = structuredClone(contract);
  const safeSetInvariant =
    incompatibleIngressOrder.goldHeldOutSeparationContract
      .goldIngressReceiptShape.bindingInvariants.findIndex((invariant) =>
        invariant.includes(
          "same_cardinality_and_members_as_ordered_unique_attributions_independent_of_binding_record_order",
        ),
      );
  incompatibleIngressOrder.goldHeldOutSeparationContract
    .goldIngressReceiptShape.bindingInvariants[safeSetInvariant] =
      "the_order_preserving_union_must_equal_release_order";
  assert.equal(
    collectContractErrors(incompatibleIngressOrder).includes(
      "content_attribution_ingress_projection",
    ),
    true,
  );

  const unresolvedPrivacyProfile = structuredClone(contract);
  unresolvedPrivacyProfile.laterGateEvidence
    .gateAssertionDerivationReceiptShape.predicateValidationProfileRegistry[
      "privacy-lifecycle-five-phase.v1"
    ].rowSetConditionsExactly.find(
      ({ operator }) => operator === "privacy_lifecycle_temporal_chain_valid",
    ).literalJsonValue = "privacy-lifecycle-five-phase.v2";
  assert.equal(
    collectContractErrors(unresolvedPrivacyProfile).some((error) =>
      error.startsWith("unresolved_privacy_profile_literal:"),
    ),
    true,
  );

  const incompleteS235AOverlap = structuredClone(contract);
  incompleteS235AOverlap.closeout.s235aManifestOverlap = [roadmapPath];
  incompleteS235AOverlap.closeout.s235aManifestOverlapPathCount = 1;
  assert.equal(
    collectContractErrors(incompleteS235AOverlap).includes(
      "s235a_overlap_intersection",
    ),
    true,
  );

  const validGateSample = {
    scopeId: "s235b_to_s236b_ocr_benchmark_entry_v1",
    evaluationHeadSha: "1".repeat(40),
    evaluationTreeSha: "2".repeat(40),
    reviewedAt: "2026-07-23T12:00:00Z",
    inputRows: [
      {
        inputName: "pinned_candidate_versions",
        scopeId: "s235b_to_s236b_ocr_benchmark_entry_v1",
        evaluationHeadSha: "1".repeat(40),
        evaluationTreeSha: "2".repeat(40),
        expiresAt: "2026-07-23T13:00:00Z",
      },
    ],
  };
  assert.deepEqual(collectGateSampleErrors(validGateSample), []);

  const mixedCohort = structuredClone(validGateSample);
  mixedCohort.inputRows[0].evaluationHeadSha = "3".repeat(40);
  assert.deepEqual(collectGateSampleErrors(mixedCohort), [
    "mixed_cohort:pinned_candidate_versions",
  ]);

  const stale = structuredClone(validGateSample);
  stale.inputRows[0].expiresAt = stale.reviewedAt;
  assert.deepEqual(collectGateSampleErrors(stale), [
    "stale_expiry:pinned_candidate_versions",
  ]);
});

test("contradiction examples are represented by fail-closed contract checks", () => {
  const five = contract.fiveChoiceCorrectionContract;
  const separation = contract.goldHeldOutSeparationContract;

  const definition =
    five.deterministicValidatorRegistry.definitions.economics_formula_check;
  const requiredAssertions = new Set(definition.requiredAssertionIdsExactly);
  const injectedAssertions = [
    ...definition.requiredAssertionIdsExactly,
    "irrelevant_passing_assertion",
  ];
  assert.equal(
    injectedAssertions.every((value) => requiredAssertions.has(value)) &&
      injectedAssertions.length === requiredAssertions.size,
    false,
    "extra passing assertion must not satisfy the closed validator set",
  );

  const questionRights =
    separation.ingressedObjectBindingRecordContract
      .sourceRightsExactProjectionByContentClass.question_item;
  assert.equal(
    [].length === questionRights.requiredReferenceCount,
    false,
    "empty rights projection must not authorize target ingress",
  );
  assert.equal(
    questionRights.orderedProjectionExactly.slice(0, 2).length ===
      questionRights.requiredReferenceCount,
    false,
    "missing one question-object rights reference must fail",
  );

  const missingInput = structuredClone(contract);
  missingInput.laterGateEvidence.S236B.requiredInputs.pop();
  assert.equal(
    collectContractErrors(missingInput).some((error) =>
      error.startsWith("gate_registry_keyset:S236B:"),
    ),
    true,
  );
  assert.equal(
    omitsPriorExposureByLateOrigin({
      certifiedHistoryOrigin: "2026-07-23T10:00:00Z",
      firstPossiblePresentation: "2026-07-23T09:00:00Z",
    }),
    true,
  );

  function omitsPriorExposureByLateOrigin({
    certifiedHistoryOrigin,
    firstPossiblePresentation,
  }) {
    return (
      new Date(certifiedHistoryOrigin).getTime() >
      new Date(firstPossiblePresentation).getTime()
    );
  }
});

test("receipt fields are canonical-digest complete and declarative field sets are unique", () => {
  assert.deepEqual(duplicateJsonKeyPaths(rawContract), []);
  visitObjects(contract, [], (value, path) => {
    if (
      Array.isArray(value.requiredFields) &&
      Array.isArray(value.receiptDigestContract?.coveredFieldsExactly)
    ) {
      assertSameMembers(
        value.requiredFields.filter((field) => field !== "receipt_sha256"),
        value.receiptDigestContract.coveredFieldsExactly,
        `receipt digest mismatch at ${path.join(".")}`,
      );
    }

    for (const [key, entry] of Object.entries(value)) {
      if (
        Array.isArray(entry) &&
        (key.endsWith("RequiredFields") ||
          key.endsWith("FieldsExactly") ||
          key.endsWith("Vocabulary") ||
          /^accepted(?:Left|Right)?Types$/.test(key))
      ) {
        assert.equal(
          new Set(entry.map((item) => JSON.stringify(item))).size,
          entry.length,
          `duplicate declarative value at ${[...path, key].join(".")}`,
        );
      }
    }
  });
});

test("docs, evidence, roadmap, and post-merge safe state preserve queued boundaries", () => {
  assert.match(doc, /contracts and evidence requirements only/i);
  assert.match(doc, /static QTI item\/content-package mapping shape/i);
  assert.match(doc, /target-vault specific/i);
  assert.match(doc, /read-after-write\s+receipt/i);
  assert.match(
    doc,
    /canonical UTC-`Z` millisecond event time/i,
  );
  assert.match(
    doc,
    /never reads the enclosing gate-input receipt/i,
  );
  assert.match(
    doc,
    /A policy\s+`reviewed_at`\s+value alone is insufficient/i,
  );
  assert.match(doc, /S236B remains queued/i);
  assert.match(doc, /O3B remains queued and unapproved/i);
  assert.match(doc, /no passing-gate, benchmark, runtime, or Production/i);
  assert.match(evidence, /OCR benchmark: not executed/i);
  assert.match(evidence, /No raw asset body was retained, imported, committed, or hashed/i);
  assert.match(evidence, /Neither gate is started or approved/i);
  assert.match(
    evidence,
    /five-input coherence root compares the receipt's exact/i,
  );
  assert.match(
    evidence,
    /rejects an offset spelling, invalid calendar instant/i,
  );
  assert.match(evidence, /explicit squash merge/i);
  assert.match(evidence, /no PR-level auto-merge was enabled/i);
  assert.doesNotMatch(doc, /Secondary cause codes may be retained/i);
  assert.doesNotMatch(doc, /cause metadata only in the QTI Content Package/i);
  assert.doesNotMatch(doc, /attachment was not fetched/i);
  assert.doesNotMatch(evidence, /No asset was downloaded/i);

  assert.equal(roadmapStatus("S235B"), "completed");
  assert.equal(roadmapStatus("S236B"), "queued");
  assert.equal(roadmapStatus("O3B"), "queued");
  assert.equal(contract.postMergeSafeState.S236B, "queued_not_started");
  assert.equal(contract.postMergeSafeState.O3B, "queued_unapproved");
  assert.equal(
    contract.postMergeSafeState.firstRoundLearnerRuntime,
    "not_started_by_s235b",
  );
  assert.equal(contract.postMergeSafeState.automaticDownstreamTransitionAllowed, false);
  assert.equal(contract.ocrBenchmarkContract.status, "not_executed");
  assert.equal(contract.ocrBenchmarkContract.executionAuthorizedByS235B, false);
});
