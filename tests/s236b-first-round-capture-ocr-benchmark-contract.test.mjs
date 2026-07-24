import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const contractPath =
  "config/s236b-first-round-capture-ocr-benchmark-contract.json";
const s235bPath =
  "config/s235b-first-round-adaptive-mcq-foundation-contract.json";
const candidateLockPath = "benchmarks/s236b/candidate-lock.json";
const resultPath = "benchmarks/s236b/bodyless-benchmark-result.json";
const fieldManifestPath =
  "benchmarks/s236b/field-ground-truth-manifest.json";
const sbomPath = "benchmarks/s236b/runtime-sbom.json";
const rightsPath = "benchmarks/s236b/model-rights-review.json";
const rollbackPath = "benchmarks/s236b/rollback-evidence.json";
const evaluatorPath = "benchmarks/s236b/evaluate_bodyless.py";
const cleanupPath = "benchmarks/s236b/cleanup_ephemeral.py";
const faultProducerPath = "benchmarks/s236b/exercise_rollback_fault.py";
const roadmapPath = "roadmap/active-program.yml";

const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const s235b = JSON.parse(readFileSync(s235bPath, "utf8"));
const candidateLock = JSON.parse(readFileSync(candidateLockPath, "utf8"));
const result = JSON.parse(readFileSync(resultPath, "utf8"));
const fieldManifest = JSON.parse(readFileSync(fieldManifestPath, "utf8"));
const sbom = JSON.parse(readFileSync(sbomPath, "utf8"));
const rights = JSON.parse(readFileSync(rightsPath, "utf8"));
const rollback = JSON.parse(readFileSync(rollbackPath, "utf8"));
const roadmap = readFileSync(roadmapPath, "utf8");

const riskFields = [
  "negation",
  "numbers",
  "signs",
  "percentages",
  "choice_order",
  "law_dates",
  "tables",
  "formulas",
];

const riskFieldCounts = {
  negation: 4,
  numbers: 4,
  signs: 4,
  percentages: 4,
  choice_order: 20,
  law_dates: 4,
  tables: 16,
  formulas: 4,
};

const requiredSinks = [
  "git_worktree_index_untracked_ignored_and_new_blobs",
  "github_issue_pr_review_and_comment_bodies",
  "github_check_logs_and_uploaded_artifacts",
  "stdout_stderr_and_exception_messages",
  "telemetry_otel_error_reporting_spools",
  "screenshots_dom_traces_and_video",
  "temporary_files_core_dumps_swap_and_memory_buffers",
  "ocr_model_and_application_caches",
  "clipboard_thumbnail_and_recent_file_sinks",
  "shared_corpora_reference_corpora_and_model_eval_body_storage",
  "persistent_database_and_object_storage",
  "post_merge_github_and_cache_rescan",
];

const expectedOwnedFiles = [
  "benchmarks/s236b/.gitignore",
  "benchmarks/s236b/README.md",
  "benchmarks/s236b/bodyless-benchmark-result.json",
  "benchmarks/s236b/candidate-lock.json",
  "benchmarks/s236b/cleanup_ephemeral.py",
  "benchmarks/s236b/evaluate_bodyless.py",
  "benchmarks/s236b/exercise_rollback_fault.py",
  fieldManifestPath,
  "benchmarks/s236b/generate_synthetic.py",
  "benchmarks/s236b/model-rights-review.json",
  "benchmarks/s236b/network_deny.c",
  "benchmarks/s236b/rollback-evidence.json",
  "benchmarks/s236b/run_candidate.py",
  "benchmarks/s236b/runtime-sbom.json",
  "benchmarks/s236b/scan_runtime_sbom.py",
  contractPath,
  "docs/qa/s236b-first-round-capture-ocr-benchmark-evidence.md",
  "docs/s236b-first-round-capture-ocr-benchmark-contract.md",
  "tests/s236b-first-round-capture-ocr-benchmark-contract.test.mjs",
];

const expectedSharedFilesHeldForLaneA = [
  "roadmap/active-program.yml",
  "scripts/run-node-tests.mjs",
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
  "tests/s235b-first-round-adaptive-mcq-foundation-contract.test.mjs",
  "tests/theory-answer-review-engine.test.mjs",
];

const expectedGateReadiness = [
  ["s235b_merged_sha_and_tree", "observed_at_live_start", "pending_final_exact_head_and_tree_review"],
  ["ocr_benchmark_contract_version", "bound", "pending_named_contract_reviewer"],
  ["private_capture_boundary", "local_zero_residual_scan_with_thirty_nine_unresolved_members_or_sink_proofs", "blocked_local_remote_and_provider_sink_proofs"],
  ["risk_field_taxonomy", "complete_bodyless", "pending_named_contract_reviewer"],
  ["synthetic_or_separately_authorized_private_fixture_manifest", "synthetic_field_manifest_committed_bodylessly", "pending_named_fixture_reviewer_and_heldout_attestation"],
  ["proposed_candidate_lifecycle_and_benchmark_only_ceiling", "complete", "pending_named_contract_reviewer"],
  ["pinned_candidate_versions", "selected_installed_distribution_inventories_and_imported_module_origins_matched_model_hashes_checked_full_runtime_provenance_incomplete", "pending_named_benchmark_reviewer"],
  ["license_and_SBOM_receipt", "incomplete", "blocked_17_components_without_complete_license_artifact_and_vulnerability_review"],
  ["model_asset_rights_receipt", "incomplete", "blocked_2_asset_rights_reviews"],
  ["isolated_benchmark_environment_receipt", "partial_process_shim_only", "blocked_trusted_provider_and_named_environment_reviewer"],
  ["native_manual_fallback_receipt", "in_process_authenticated_revision_boundary_passed_OS_write_once_and_storage_append_only_false", "pending_named_human_fallback_receipt"],
  ["named_benchmark_owner", "missing", "blocked_named_human_owner_required"],
  ["tested_rollback_receipt", "normal_actual_roots_cleaned_four_failure_probes_used_proxy_fault_roots_actual_pre_evaluator_failure_cleanup_unproven", "blocked_actual_root_failure_supervision_and_named_rollback_reviewer"],
  ["source_and_rights_manifest_version", "bodyless_manifest_version_bound", "pending_named_rights_reviewer"],
  ["no_real_content_import_proof", "local_zero_residual_with_thirty_nine_unresolved_and_remote_pending", "blocked_exact_head_remote_provider_and_post_merge_scans"],
  ["explicit_manual_owner_selection", "request_scope_observed_not_a_signed_receipt", "blocked_named_human_signed_owner_selection_required"],
].map(([inputName, machineEvidenceStatus, gateReceiptStatus]) => ({
  inputName,
  machineEvidenceStatus,
  gateReceiptStatus,
}));

const expectedPostMergeSafeState = {
  o3bStatusExpected: "queued_not_started",
  s237bStatusExpected: "queued_not_started",
  firstRoundLearnerRuntimeExpected: "not_started_not_activated",
  downstreamAutomaticStartExpected: false,
  nextOwnerGate:
    "resolve_S236B_rights_supply_chain_isolation_privacy_heldout_human_and_root_trust_inputs_then_regenerate_exact_head_evidence",
  nextOwnerGateAutomaticallyStarted: false,
};

const expectedBlockingItems = [
  "all 17 Python runtime components remain unresolved because license policy, complete install provenance, Python and native closure, artifact hashes, native inventory, and vulnerability review are incomplete",
  "immutable exact-byte license receipt for korean_PP-OCRv5_mobile_rec is absent",
  "source-commit and immutable license receipt for the synthetic rendering font are absent",
  "trusted execution environment provider attestation and kernel-grade isolation proof are absent",
  "prior held-out expectation access exclusion and post-open retry or tuning counts are not attested",
  "per-fixture timeout supervision is absent, so failure-taxonomy completeness is not established",
  "protocol-log execution redirection and cache-environment bindings are absent; local/provider privacy sink proofs, exact-head GitHub scans, and post-merge scans are unresolved",
  "four failure cleanup observations use proxy fault roots; actual pre-evaluator runner and authority failure cleanup is not proven",
  "named benchmark owner and named supply-chain, rights, environment, rollback, fallback, contract, fixture, and gate reviewers are absent",
  "signed root-key registry, trust-anchor projection, per-input receipts, passing packet, and seven-dimension coherence receipt are absent",
  "post-squash merged-main evidence cannot exist before merge",
  "Lane A priority requires final shared-file and live-main reconciliation",
];

const expectedAcceptanceAndMergePolicy = {
  focusedTestsRequired: true,
  fullTestsRequired: true,
  typecheckRequired: true,
  lintRequired: true,
  buildRequired: true,
  gitDiffCheckRequired: true,
  freshExactHeadHostileReviewP0P1Required: 0,
  finalLiveStateRereadRequired: true,
  autoMergeAllowed: false,
  mergeMethodIfEveryGatePasses: "explicit_squash_only",
  mergeApprovedNow: false,
  reason:
    "pre-entry exploratory execution plus absent human, rights, supply-chain, privacy, isolation, held-out, root-trust, Lane-A serialization, exact-head CI, and hostile-review gates",
};

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Bytes(canonicalJson(value));
}

function fileSha256(path) {
  return sha256Bytes(readFileSync(path));
}

function withoutKey(value, key) {
  return Object.fromEntries(
    Object.entries(value).filter(([candidate]) => candidate !== key),
  );
}

function clone(value) {
  return structuredClone(value);
}

function roadmapItemBlock(id) {
  const marker = `  - id: ${id}\n`;
  const start = roadmap.indexOf(marker);
  assert.notEqual(start, -1, `${id} missing from roadmap`);
  const next = roadmap.indexOf("  - id: ", start + marker.length);
  return roadmap.slice(start, next === -1 ? undefined : next);
}

function roadmapStatus(id) {
  const match = roadmapItemBlock(id).match(/\n    status: ([a-z_]+)\n/);
  assert.ok(match, `${id} status missing`);
  return match[1];
}

function listFiles(root) {
  const rows = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      rows.push(...listFiles(path));
    } else if (entry.isFile()) {
      rows.push(relative(".", path));
    }
  }
  return rows.sort();
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    const selected = grouped.get(value) ?? [];
    selected.push(row);
    grouped.set(value, selected);
  }
  return grouped;
}

function gitOutput(arguments_) {
  const child = spawnSync("git", arguments_, {
    cwd: resolve("."),
    encoding: "utf8",
    env: {
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      PATH: process.env.PATH,
    },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  return child.stdout.split("\n").filter(Boolean);
}

function effectiveChangedFilesFromBase(base) {
  return [
    ...new Set([
      ...gitOutput(["diff", "--name-only", base, "HEAD"]),
      ...gitOutput(["diff", "--cached", "--name-only", base]),
      ...gitOutput(["diff", "--name-only"]),
      ...gitOutput(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ].sort();
}

function collectErrors(candidate) {
  const errors = [];
  const gate = candidate.s235bGatePacketContract;
  const sourceGate = s235b.laterGateEvidence.S236B;
  const sourceMatrix =
    s235b.laterGateEvidence.gateCrossInputCoherenceReceiptShape
      .crossInputCoherenceMatrix.S236B;

  if (
    candidate.schemaVersion !==
      "s236b.first-round-capture-ocr-benchmark-contract.v3" ||
    candidate.title !==
      "S236B First-Round Capture and OCR Benchmark Contracts and Evidence" ||
    candidate.selectedAt !== "2026-07-24"
  ) {
    errors.push("contract_identity");
  }
  if (
    JSON.stringify(candidate.liveStart) !==
    JSON.stringify({
      mainCommitSha: "f28ef275d918c3b6ee2afcd0a393959fd4763fb3",
      mainTreeSha: "95d1efcf5e3eed12516fbd58da2dcc81bf604064",
      s235bMergedPullRequest: 657,
      s235bCorrectivePullRequest: 658,
      s235bMergedComposition: "merged_657_plus_corrective_658",
      s235bContractPath: s235bPath,
      s235bContractSha256: fileSha256(s235bPath),
      trackingIssue: 659,
      ownerDecision:
        "docs/decisions/2026-07-23-post-650-unified-program-reset.md",
      ownerDecisionStatus:
        "bounded_metadata_only_first_round_foundation_authorized_activation_not_authorized",
    })
  ) {
    errors.push("live_start");
  }
  if (
    candidate.contractState !==
    "disposable_pre_entry_exploratory_evidence_complete_S236B_entry_gate_not_satisfied"
  ) {
    errors.push("contract_state");
  }
  if (
    gate.scopeId !== sourceGate.exactScopeId ||
    gate.gateId !== "S236B" ||
    gate.packetSchemaVersion !==
      "appraiser.first.gate-evidence-packet.v1" ||
    gate.requiredDecision !==
      "verified_complete_current_S236B_gate_packet" ||
    gate.canonicalization !== "RFC_8785_JSON_Canonicalization_Scheme" ||
    gate.exactHeadAndTreeRequired !== true
  ) {
    errors.push("gate_identity");
  }
  const expectedSourceBindings = {
    sourceContractPath: s235bPath,
    sourceContractFileSha256: fileSha256(s235bPath),
    sourceContractCanonicalSha256: sha256Json(s235b),
    sourceGateCanonicalSha256: sha256Json(sourceGate),
    immutableInputBindingContractCanonicalSha256: sha256Json(
      sourceGate.immutableInputBindingContract,
    ),
    requiredInputAcceptanceContractCanonicalSha256: sha256Json(
      sourceGate.requiredInputAcceptanceContract,
    ),
    requiredInputEvidenceContractRegistryCanonicalSha256: sha256Json(
      sourceGate.requiredInputEvidenceContractRegistry,
    ),
    requiredInputProjectionContractRegistryCanonicalSha256: sha256Json(
      sourceGate.requiredInputProjectionContractRegistry,
    ),
    expiryTriggersCanonicalSha256: sha256Json(sourceGate.expiryTriggers),
    crossInputCoherenceMatrixCanonicalSha256: sha256Json(sourceMatrix),
  };
  if (
    JSON.stringify(gate.sourceContractBindings) !==
    JSON.stringify(expectedSourceBindings)
  ) {
    errors.push("gate_source_bindings");
  }
  if (
    gate.requiredInputCount !== 16 ||
    JSON.stringify(gate.requiredInputNamesExactly) !==
      JSON.stringify(sourceGate.requiredInputs) ||
    JSON.stringify(gate.orderedInputReadiness) !==
      JSON.stringify(expectedGateReadiness)
  ) {
    errors.push("gate_inputs");
  }
  if (
    gate.modelMayIssueOrReviewReceipt !== false ||
    gate.namedBenchmarkOwner !== null ||
    gate.explicitManualOwnerSelectionReceipt !== null ||
    gate.rootKeyRegistryReceipt !== null ||
    gate.rootTrustAnchorProjectionReceipt !== null ||
    gate.passingPacket !== null ||
    gate.preEntryExecutionQualifies !== false ||
    gate.qualifyingRerunRequiredAfterPassingPacket !== true ||
    gate.status !== "not_constructed_fail_closed" ||
    gate.decision !==
      "required_human_rights_supply_chain_privacy_isolation_and_root_trust_evidence_absent"
  ) {
    errors.push("gate_fail_closed");
  }
  if (
    candidate.crossInputCoherence.dimensionCount !== 7 ||
    candidate.crossInputCoherence.matrixVersion !==
      "appraiser.first.gate-cross-input-coherence.v2" ||
    candidate.crossInputCoherence.sourceMatrixCanonicalSha256 !==
      sha256Json(sourceMatrix) ||
    JSON.stringify(
      candidate.crossInputCoherence.orderedDimensions.map(
        (row) => row.dimensionId,
      ),
    ) !== JSON.stringify(sourceMatrix.map((row) => row.dimensionId)) ||
    candidate.crossInputCoherence.signedCrossInputCoherenceReceipt !== null ||
    candidate.crossInputCoherence.status !== "not_constructed_fail_closed" ||
    candidate.crossInputCoherence.decision !==
      "not_verified_cross_input_coherence"
  ) {
    errors.push("coherence_identity");
  }
  for (const [index, dimension] of
    candidate.crossInputCoherence.orderedDimensions.entries()) {
    const source = sourceMatrix[index];
    if (
      dimension.dimensionId !== source?.dimensionId ||
      dimension.comparisonOperator !== source?.comparisonOperator ||
      JSON.stringify(dimension.participatingInputsExactly) !==
        JSON.stringify(source?.participatingInputsExactly) ||
      JSON.stringify(dimension.canonicalRootPreimage) !==
        JSON.stringify(source?.canonicalRootPreimage) ||
      JSON.stringify(dimension.derivationSpecIdByInputExactly) !==
        JSON.stringify(source?.derivationSpecIdByInputExactly) ||
      dimension.machineCommonValueOrNull !== null ||
      dimension.machineCarrierProjectionStatus !==
        "raw_local_observation_not_current_signed_S235B_coherence" ||
      dimension.signedCoherenceStatus !== "pending"
    ) {
      errors.push(`coherence_${dimension.dimensionId}`);
    }
  }
  if (
    JSON.stringify(candidate.fixtureAndGroundTruthContract.riskFieldsExactly) !==
      JSON.stringify(riskFields) ||
    candidate.fixtureAndGroundTruthContract.fixtureImageCount !== 32 ||
    candidate.fixtureAndGroundTruthContract.fieldCount !== 60 ||
    candidate.fixtureAndGroundTruthContract.realLearnerContentCount !== 0 ||
    candidate.fixtureAndGroundTruthContract
      .copyrightedPrivateContentCount !== 0
  ) {
    errors.push("fixture_boundary");
  }
  const expectedBenchmarkEvidence = {
    resultArtifactSha256: result.result_artifact_sha256,
    failureTaxonomySha256: sha256Json(result.ordered_failure_rows),
    fieldAccuracyRowsSha256: sha256Json(
      result.ordered_field_accuracy_rows,
    ),
    groupStructureRowsSha256: sha256Json(
      result.ordered_group_structure_rows,
    ),
    fixtureCount: result.fixture_count,
    fieldCount: result.field_count,
    correctCount: result.correct_count,
    missCount: result.miss_count,
    abstainCount: result.abstain_count,
    timeoutCount: result.timeout_count,
    overallAccuracyPpm: result.overall_accuracy_ppm,
    candidateProducedChoiceStructureCount:
      result.ordered_group_structure_rows.find(
        (row) => row.risk_field === "choice_order",
      ).candidate_structure_observed_count,
    candidateProducedTableStructureCount:
      result.ordered_group_structure_rows.find(
        (row) => row.risk_field === "tables",
      ).candidate_structure_observed_count,
    processFailureCount: result.process_failure_count,
    unclassifiedFailureCount: result.unclassified_failure_count,
    latencyClock: result.latency.clock,
    latencySampleCount: result.latency.end_to_end.sample_count,
    modelLoadNs: result.latency.model_load_ns,
    endToEndP50Ns: result.latency.end_to_end.p50_ns,
    endToEndP95Ns: result.latency.end_to_end.p95_ns,
    endToEndP99Ns: result.latency.end_to_end.p99_ns,
    endToEndMaxNs: result.latency.end_to_end.max_ns,
    peakRssKib: result.latency.peak_rss_kib,
    failureTaxonomyCompletenessStatus:
      result.failure_taxonomy_completeness_status,
    status: result.status,
    decision: result.decision,
  };
  if (
    JSON.stringify(candidate.benchmarkEvidence) !==
    JSON.stringify(expectedBenchmarkEvidence)
  ) {
    errors.push("benchmark_evidence_binding");
  }
  if (
    candidate.heldOutIntegrity.readinessEligible !== false ||
    candidate.heldOutIntegrity.priorExpectationOpenExclusionVerified !==
      false ||
    candidate.heldOutIntegrity.retryAfterExpectedOpenCountOrNull !== null ||
    candidate.heldOutIntegrity.tuningAfterExpectedOpenCountOrNull !== null ||
    candidate.heldOutIntegrity.decision !==
      "not_verified_held_out_integrity_pre_entry_exploratory_run_only"
  ) {
    errors.push("heldout_truth");
  }
  if (
    candidate.immutableOriginalAndRevisionBoundary.machineOriginalImmutable !==
      false ||
    candidate.immutableOriginalAndRevisionBoundary.revisionAppendOnly !==
      false ||
    candidate.immutableOriginalAndRevisionBoundary
      .machineOriginalOsWriteOnceEnforced !== false ||
    candidate.immutableOriginalAndRevisionBoundary
      .revisionStorageAppendOnlyEnforced !== false ||
    candidate.immutableOriginalAndRevisionBoundary
      .revisionInProcessAuthenticatedHashChainValidated !== true ||
    candidate.immutableOriginalAndRevisionBoundary
      .revisionAtomicExpectedHeadLockUsed !== true ||
    candidate.immutableOriginalAndRevisionBoundary
      .editedRevisionUsedForAccuracy !== false ||
    candidate.immutableOriginalAndRevisionBoundary
      .duplicateRevisionOrdinalRejected !== true ||
    candidate.immutableOriginalAndRevisionBoundary.predecessorMismatchRejected !==
      true ||
    candidate.nativeManualFallback.mode !==
      "local_human_transcription_to_separate_locked_authenticated_revision_chain" ||
    candidate.nativeManualFallback.machineOriginalRemainsImmutable !== false ||
    candidate.nativeManualFallback.machineOriginalUnchangedDuringHarness !==
      true ||
    candidate.nativeManualFallback
      .machineOriginalLogicalOverwriteProhibitedByContract !== true ||
    candidate.nativeManualFallback.revisionStorageAppendOnlyEnforced !== false
  ) {
    errors.push("revision_boundary");
  }
  if (
    JSON.stringify(candidate.privacyBoundary.requiredSinkIdsExactly) !==
      JSON.stringify(requiredSinks) ||
    candidate.privacyBoundary.localResidualCount !== 0 ||
    candidate.privacyBoundary.localUnresolvedCount !== 39 ||
    candidate.privacyBoundary.completeZeroResidualProof !== false ||
    candidate.privacyBoundary.directRawTextValueScanPerformed !== false ||
    candidate.privacyBoundary.repositoryPathAndHeadTreeStatusBound !== true ||
    candidate.privacyBoundary.gitReplaceObjectsDisabled !== true ||
    JSON.stringify(
      candidate.privacyBoundary.executionRepositoryIdentityBefore,
    ) !==
      JSON.stringify({
        headSha:
          result.local_privacy_scan.repository_identity_before.head_sha,
        treeSha:
          result.local_privacy_scan.repository_identity_before.tree_sha,
        statusSha256:
          result.local_privacy_scan.repository_identity_before.status_sha256,
        worktreeStateSha256:
          result.local_privacy_scan.repository_identity_before
            .worktree_state_sha256,
      }) ||
    candidate.privacyBoundary
      .executionRepositoryIdentityUnchangedDuringScan !== true ||
    candidate.privacyBoundary.gitWorktreeAndDotGitScannedMemberCount !==
      result.local_privacy_scan.ordered_sink_rows.find(
        (row) =>
          row.sink_id ===
          "git_worktree_index_untracked_ignored_and_new_blobs",
      ).worktree_and_git_storage_member_count ||
    candidate.privacyBoundary.decodedGitBlobCount !==
      result.local_privacy_scan.ordered_sink_rows.find(
        (row) =>
          row.sink_id ===
          "git_worktree_index_untracked_ignored_and_new_blobs",
      ).decoded_git_blob_count ||
    candidate.privacyBoundary
      .protocolLogExecutionRedirectionBindingVerified !== false ||
    candidate.privacyBoundary.cacheEnvironmentBindingVerified !== false
  ) {
    errors.push("privacy_truth");
  }
  if (
    candidate.candidateContract.productionFitnessClaimed !== false ||
    candidate.candidateContract.fullPageLayoutCoverageClaimed !== false ||
    candidate.candidateContract.structuralTableModelCoverageClaimed !==
      false ||
    candidate.candidateContract.formulaModelCoverageClaimed !== false ||
    candidate.candidateContract.paddleOcrFamilySourceCodeExecuted !== false ||
    candidate.candidateContract
      .installedRuntimeAndModelBytesVerifiedBeforeExecution !== false ||
    candidate.candidateContract.perFixtureTimeoutSupervision !== false ||
    candidate.candidateContract.preEntryExecutionQualifiesForS236BGate !==
      false ||
    candidate.candidateContract.executionDependencyAndModelByteVerification
      .pythonExecutableBytesVerified !== false ||
    candidate.candidateContract.executionDependencyAndModelByteVerification
      .nativeDependencyClosureVerified !== false ||
    candidate.candidateContract.executionDependencyAndModelByteVerification
      .sysPathAllowlisted !== false ||
    candidate.candidateContract.executionDependencyAndModelByteVerification
      .modelReadOnlyMountVerified !== false ||
    candidate.candidateContract.executionDependencyAndModelByteVerification
      .wheelPinsLinkedToInstalledArtifactsByReceipt !== false ||
    candidate.authorizationBoundary.candidateLifecycleState !== "proposed"
  ) {
    errors.push("candidate_claim_ceiling");
  }
  if (
    candidate.supplyChainAndRights.forbiddenLicenseCountOrNull !== null ||
    candidate.supplyChainAndRights.unresolvedRuntimeComponentCount !== 17 ||
    candidate.supplyChainAndRights
      .unresolvedModelAndFixtureAssetRightsCount !== 2 ||
    candidate.supplyChainAndRights
      .wheelHashesAreDeclaredCandidatePinsNotVerifiedInstallReceipts !== true ||
    candidate.supplyChainAndRights.status !== "incomplete"
  ) {
    errors.push("supply_chain_truth");
  }
  if (
    candidate.environmentAndRollback.networkAbsenceProven !== false ||
    candidate.environmentAndRollback.isolationCompletenessStatus !==
      "partial_process_shim_only" ||
    candidate.environmentAndRollback.scenarioCount !== 6 ||
    candidate.environmentAndRollback.secretsMountedOrExposedProvenFalse !==
      false ||
    candidate.environmentAndRollback
      .normalRunnerAndAuthorityRootCleanupProven !== true ||
    candidate.environmentAndRollback
      .failureScenarioEvidenceUsesProxyFaultRoots !== true ||
    candidate.environmentAndRollback
      .actualPreEvaluatorRunnerAndAuthorityFailureCleanupProven !== false ||
    candidate.environmentAndRollback.qualifyingTestedRollbackReceipt !==
      false ||
    candidate.environmentAndRollback.environmentIdentity !==
      rollback.environmentIdentity ||
    candidate.environmentAndRollback.environmentConfigurationSha256 !==
      rollback.environmentConfigurationSha256 ||
    candidate.environmentAndRollback.rollbackReceiptSetSha256 !==
      rollback.rollbackReceiptSetSha256 ||
    candidate.environmentAndRollback.rollbackTargetPolicySha256 !==
      rollback.rollbackTargetPolicySha256
  ) {
    errors.push("isolation_truth");
  }
  if (
    JSON.stringify(candidate.acceptanceAndMergePolicy) !==
    JSON.stringify(expectedAcceptanceAndMergePolicy)
  ) {
    errors.push("merge_fail_closed");
  }
  if (
    candidate.authorizationBoundary.o3bStarted !== false ||
    candidate.authorizationBoundary.s237bStarted !== false ||
    candidate.authorizationBoundary
      .firstRoundLearnerRuntimeImplementedOrActivated !== false ||
    candidate.authorizationBoundary
      .firstRoundNavigationOnboardingPricingOrPublicClaimsExposed !== false ||
    candidate.authorizationBoundary
      .productionDependenciesModelsTelemetryOrContentActivated !== false ||
    candidate.authorizationBoundary
      .sharedSchemaPersistenceAuthRlsOrBillingChanged !== false ||
    candidate.authorizationBoundary.qtiXapiOrCaliperConformanceClaimed !==
      false ||
    candidate.authorizationBoundary.downstreamAutomaticStartAllowed !== false
  ) {
    errors.push("downstream_state");
  }
  if (
    candidate.laneSerialization.sharedFilesChangedByThisContract.length !==
      0 ||
    candidate.laneSerialization.overallMutationWipMaximum !== 2 ||
    candidate.laneSerialization.laneALockIndependent !== true ||
    candidate.laneSerialization
      .laneAHasSharedRoadmapAndControlPlanePriority !== true ||
    JSON.stringify(
      candidate.laneSerialization.sharedFilesHeldForLaneAPriority,
    ) !== JSON.stringify(expectedSharedFilesHeldForLaneA) ||
    candidate.laneSerialization.reconcileAfterLaneAMergeRequired !== true ||
    candidate.laneSerialization
      .exactHeadEvidenceRegenerationAfterAnyRebaseOrMergeRequired !== true ||
    JSON.stringify(candidate.ownedFileManifest) !==
      JSON.stringify(expectedOwnedFiles) ||
    candidate.ownedFileManifest.some((path) =>
      /^(app|src|supabase|roadmap|scripts)\//.test(path),
    )
  ) {
    errors.push("owned_file_scope");
  }
  if (
    JSON.stringify(candidate.postMergeSafeState) !==
    JSON.stringify(expectedPostMergeSafeState) ||
    JSON.stringify(candidate.blockingItems) !==
      JSON.stringify(expectedBlockingItems)
  ) {
    errors.push("blocking_and_postmerge_state");
  }
  return errors;
}

test("S236B owns exactly 19 lane-local files and shared state stays queued", () => {
  assert.deepEqual(contract.ownedFileManifest, expectedOwnedFiles);
  assert.deepEqual(
    listFiles("benchmarks/s236b"),
    expectedOwnedFiles
      .filter((path) => path.startsWith("benchmarks/s236b/"))
      .sort(),
  );
  for (const path of expectedOwnedFiles) {
    assert.equal(statSync(path).isFile(), true, `${path} must exist`);
  }
  assert.deepEqual(
    effectiveChangedFilesFromBase(contract.liveStart.mainCommitSha),
    expectedOwnedFiles,
  );
  assert.deepEqual(
    contract.laneSerialization.sharedFilesChangedByThisContract,
    [],
  );
  assert.equal(
    contract.ownedFileManifest.some((path) =>
      contract.laneSerialization.sharedFilesHeldForLaneAPriority.includes(path),
    ),
    false,
  );
  assert.equal(roadmapStatus("S236B"), "queued");
  assert.equal(roadmapStatus("O3B"), "queued");
  assert.equal(roadmapStatus("S237B"), "queued");
});

test("RFC 8785-compatible candidate, artifact, component, and model roots reproduce", () => {
  assert.equal(
    candidateLock.candidateConfiguration.opencv.clahe_clip_limit,
    "2.0",
  );
  const setPreimage = {
    canonical_preimage_schema_version: "s236b.candidate-set-preimage.v2",
    canonical_preimage_value: candidateLock.orderedCandidateRows.map((row) => ({
      candidate_name: row.candidate_name,
      candidate_lifecycle_state: row.lifecycle_state,
    })),
  };
  const configurationPreimage = {
    canonical_preimage_schema_version:
      "s236b.candidate-configuration-preimage.v2",
    canonical_preimage_value: candidateLock.orderedCandidateRows.map((row) => ({
      candidate_name: row.candidate_name,
      pinned_version: row.pinned_version,
      candidate_artifact_sha256: row.candidate_artifact_sha256,
      candidate_configuration_sha256: row.candidate_configuration_sha256,
      component_set_sha256: row.component_set_sha256,
      model_asset_set_sha256: row.model_asset_set_sha256,
    })),
  };

  assert.equal(
    sha256Json(setPreimage),
    contract.candidateContract.candidateSetSha256,
  );
  assert.equal(
    sha256Json(configurationPreimage),
    contract.candidateContract.candidateConfigurationSha256,
  );
  assert.equal(
    sha256Json(candidateLock.candidateConfiguration),
    candidateLock.benchmarkConfigurationBundleSha256,
  );
  assert.notEqual(
    candidateLock.benchmarkConfigurationBundleSha256,
    contract.candidateContract.candidateConfigurationSha256,
  );
  assert.equal(
    sha256Json(candidateLock.orderedCandidateRows),
    candidateLock.orderedCandidateRowsDigest,
  );

  for (const [candidateName, configurationKey] of [
    ["OpenCV", "opencv"],
    ["PaddleOCR", "paddleocr"],
  ]) {
    const row = candidateLock.orderedCandidateRows.find(
      (candidate) => candidate.candidate_name === candidateName,
    );
    assert.ok(row);
    assert.equal(
      sha256Json(candidateLock.candidateArtifactPreimages[candidateName]),
      row.candidate_artifact_sha256,
    );
    assert.equal(
      sha256Json(candidateLock.candidateConfiguration[configurationKey]),
      row.candidate_configuration_sha256,
    );
    assert.equal(
      sha256Json(candidateLock.modelAssetSetPreimages[candidateName]),
      row.model_asset_set_sha256,
    );
    assert.equal(
      sha256Json(candidateLock.componentSetPreimage),
      row.component_set_sha256,
    );
  }
  assert.equal(
    candidateLock.coherenceRoots.candidateSetSha256,
    contract.candidateContract.candidateSetSha256,
  );
  assert.equal(
    candidateLock.coherenceRoots.candidateConfigurationSha256,
    contract.candidateContract.candidateConfigurationSha256,
  );
});

test("raw local candidate rows match while S235B coherence stays null", () => {
  assert.deepEqual(sbom.ordered_candidate_rows, candidateLock.orderedCandidateRows);
  assert.deepEqual(rights.orderedCandidateRows, candidateLock.orderedCandidateRows);
  assert.deepEqual(
    sbom.component_set_preimage,
    candidateLock.componentSetPreimage,
  );
  assert.ok(
    contract.crossInputCoherence.orderedDimensions.every(
      (row) =>
        row.machineCommonValueOrNull === null &&
        row.signedCoherenceStatus === "pending",
    ),
  );
  assert.deepEqual(
    rights.modelAssetSetPreimages,
    candidateLock.modelAssetSetPreimages,
  );
  assert.equal(
    sbom.ordered_candidate_rows_digest,
    candidateLock.orderedCandidateRowsDigest,
  );
  assert.equal(
    rights.orderedCandidateRowsDigest,
    candidateLock.orderedCandidateRowsDigest,
  );
  assert.deepEqual(
    rights.candidateModelAssetSetSha256,
    Object.fromEntries(
      candidateLock.orderedCandidateRows.map((row) => [
        row.candidate_name,
        row.model_asset_set_sha256,
      ]),
    ),
  );
});

test("bodyless field manifest covers 60 fields and candidate-scale structures", () => {
  const rows = fieldManifest.ordered_field_rows;
  assert.equal(fieldManifest.synthetic_fixture_count, 32);
  assert.equal(fieldManifest.synthetic_field_count, 60);
  assert.equal(fieldManifest.real_learner_content_count, 0);
  assert.equal(fieldManifest.copyrighted_private_content_count, 0);
  assert.equal(fieldManifest.separately_authorized_private_fixture_count, 0);
  assert.equal(rows.length, 60);
  assert.equal(new Set(rows.map((row) => row.field_id)).size, 60);
  assert.equal(new Set(rows.map((row) => row.fixture_id)).size, 32);

  for (const risk of riskFields) {
    assert.equal(
      rows.filter((row) => row.risk_field === risk).length,
      riskFieldCounts[risk],
    );
  }
  for (const row of rows) {
    assert.match(row.expected_value_hmac_sha256, /^[0-9a-f]{64}$/);
    assert.match(row.split_class_hmac_sha256, /^[0-9a-f]{64}$/);
    assert.match(row.image_sha256, /^[0-9a-f]{64}$/);
    assert.equal("expected_value" in row, false);
    assert.equal("raw_output" in row, false);
  }

  const splitCounts = [...groupBy(rows, "split_class_hmac_sha256").values()]
    .map((selected) => selected.length)
    .sort((left, right) => left - right);
  assert.deepEqual(splitCounts, [15, 45]);

  const choiceFixtures = groupBy(
    rows.filter((row) => row.risk_field === "choice_order"),
    "fixture_id",
  );
  assert.equal(choiceFixtures.size, 4);
  for (const selected of choiceFixtures.values()) {
    assert.equal(selected.length, 5);
    assert.deepEqual(
      selected
        .map((row) => row.structure.ordinal)
        .sort((left, right) => left - right),
      [1, 2, 3, 4, 5],
    );
  }

  const tableFixtures = groupBy(
    rows.filter((row) => row.risk_field === "tables"),
    "fixture_id",
  );
  assert.equal(tableFixtures.size, 4);
  for (const selected of tableFixtures.values()) {
    assert.equal(selected.length, 4);
    assert.deepEqual(
      new Set(selected.map((row) => `${row.structure.row}:${row.structure.column}`)),
      new Set(["0:0", "0:1", "1:0", "1:1"]),
    );
  }
});

test("bodyless result partitions every field and preserves failed structures", () => {
  assert.equal(result.fixture_count, 32);
  assert.equal(result.field_count, 60);
  assert.equal(result.risk_field_count, 8);
  assert.deepEqual(
    result.ordered_field_accuracy_rows.map((row) => row.risk_field),
    riskFields,
  );
  for (const row of result.ordered_field_accuracy_rows) {
    assert.equal(
      row.correct + row.miss + row.abstain + row.timeout,
      row.denominator,
    );
    assert.equal(
      row.accuracy_ppm,
      Math.floor((row.correct * 1_000_000) / row.denominator),
    );
  }
  assert.equal(
    result.correct_count +
      result.miss_count +
      result.abstain_count +
      result.timeout_count,
    result.field_count,
  );
  assert.equal(
    result.ordered_failure_rows.reduce((sum, row) => sum + row.count, 0),
    result.miss_count + result.abstain_count + result.timeout_count,
  );
  assert.equal(result.correct_count, 7);
  assert.equal(result.miss_count, 17);
  assert.equal(result.abstain_count, 36);
  assert.equal(result.overall_accuracy_ppm, 116666);
  assert.equal(result.process_failure_count, 0);
  assert.equal(result.unclassified_failure_count, 12);
  assert.equal(result.latency.per_fixture_timeout_supervision, false);
  assert.equal(
    result.failure_taxonomy_completeness_status,
    "diagnosed_causes_only_ambiguous_mismatches_unclassified_and_per_fixture_timeout_supervision_absent",
  );
  assert.equal(
    sha256Json(withoutKey(result, "result_artifact_sha256")),
    result.result_artifact_sha256,
  );
  assert.equal(
    sha256Json(result.ordered_failure_rows),
    contract.benchmarkEvidence.failureTaxonomySha256,
  );

  for (const risk of ["choice_order", "tables"]) {
    const row = result.ordered_group_structure_rows.find(
      (candidate) => candidate.risk_field === risk,
    );
    assert.ok(row);
    assert.equal(row.candidate_structure_observed_count, 0);
    assert.equal(row.group_correct, 0);
  }
  assert.equal(result.s236b_gate_packet_satisfied, false);
  assert.equal(result.production_fitness_claim_allowed, false);
  assert.equal(result.decision, "not_accepted_S236B_benchmark_evidence");
});

test("status failures take priority over semantic equality", () => {
  const source = String.raw`
import importlib.util
import os
spec = importlib.util.spec_from_file_location("s236b_evaluator", os.environ["EVALUATOR_PATH"])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for status, failure_code, bucket in (
    ("decode_failure", "decode_failure", "miss"),
    ("fixture_digest_mismatch", "fixture_digest_mismatch", "miss"),
    ("timeout", "timeout", "timeout"),
    ("out_of_memory", "out_of_memory", "miss"),
    ("process_failure", "process_failure", "miss"),
):
    rows = [
        {
            "field_id": risk,
            "fixture_id": risk,
            "group_id": risk,
            "risk_field": risk,
            "expected_value": "1)A" if risk == "choice_order" else "x",
            "structure": {"ordinal": 1, "row": 0, "column": 0},
        }
        for risk in module.RISK_FIELDS
    ]
    outputs = {
        risk: {
            "status": "completed",
            "raw_output": "1)A" if risk == "choice_order" else "x",
        }
        for risk in module.RISK_FIELDS
    }
    outputs["negation"]["status"] = status
    metrics, failures, decisions, _ = module.field_metrics(
        rows, outputs
    )
    assert decisions["negation"] is False
    assert failures[failure_code] == 1
    assert metrics[0][bucket] == 1
`;
  const child = spawnSync("python3", ["-c", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      EVALUATOR_PATH: resolve(evaluatorPath),
      PYTHONDONTWRITEBYTECODE: "1",
    },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("semantic causes and shuffled five-choice order are diagnosed conservatively", () => {
  const source = String.raw`
import importlib.util
import os
spec = importlib.util.spec_from_file_location("s236b_evaluator", os.environ["EVALUATOR_PATH"])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
values = ["3)A", "1)B", "5)C", "2)D", "4)E"]
rows = [{"expected_value": value} for value in values]
perfect = module.exact_choice_structure("\n".join(values), rows)
assert perfect["structure_valid"] is True
assert perfect["order_failure_diagnosed"] is False
ascending = module.exact_choice_structure(
    "\n".join(["1)B", "2)D", "3)A", "4)E", "5)C"]),
    rows,
)
assert ascending["structure_valid"] is False
assert ascending["order_failure_diagnosed"] is True
duplicate = module.exact_choice_structure(
    "\n".join(values + ["4)E"]),
    rows,
)
assert duplicate["structure_valid"] is False
text_only = module.exact_choice_structure(
    "\n".join(["3)X", "1)B", "5)C", "2)D", "4)E"]),
    rows,
)
assert text_only["structure_valid"] is False
assert text_only["order_failure_diagnosed"] is False
table_rows = [
    {
        "expected_value": value,
        "structure": {"row": row, "column": column},
    }
    for row, column, value in (
        (0, 0, "A1"),
        (0, 1, "B2"),
        (1, 0, "C3"),
        (1, 1, "D4"),
    )
]
grid = module.exact_table_structure("A1\tB2\nC3\tD4", table_rows)
assert grid["structure_valid"] is True
assert grid["structure_available"] is True
for flattened in ("A1B2C3D4", "A1 B2 C3 D4", "A1\nB2\nC3\nD4"):
    rejected = module.exact_table_structure(flattened, table_rows)
    assert rejected["structure_valid"] is False
    assert rejected["structure_available"] is False
cases = (
    ("negation", "\uac00\ub098\ub2e4\uc774 \uc544\ub2d8", "\uac00\ub098\ub2e4\uc774 \uc784", "negation_marker_loss_or_flip"),
    ("negation", "\uac00\ub098\ub2e4\uc774 \uc544\ub2d8", "\uac00\ub77c\ub9c8\uc774 \uc544\ub2d8", "unclassified_review_required"),
    ("signs", "\u221212.3", "12.3", "sign_loss_or_flip"),
    ("signs", "\u221212.3", "\u221213.3", "unclassified_review_required"),
    ("percentages", "12.3%", "12.3", "percent_loss_or_scale_change"),
    ("percentages", "12.3%", "0.123", "percent_loss_or_scale_change"),
    ("law_dates", "\ubc95\ub960 2031.01.02", "\ubc95\ub960 2031.01.03", "law_date_component_or_order_error"),
    ("law_dates", "\ubc95\ub960 2031.01.02", "\uba85\ub960 2031.01.02", "unclassified_review_required"),
    ("formulas", "(x\u00b9\u2212y\u00f72)+z\u2081=0", "(x\u2212y\u00f72)+z\u2081=0", "formula_token_or_structure_loss"),
    ("formulas", "(x\u00b9\u2212y\u00f72)+z\u2081=0", "(q\u00b9\u2212y\u00f72)+z\u2081=0", "unclassified_review_required"),
)
for risk, expected, candidate, failure in cases:
    assert module.diagnosed_mismatch_code(risk, expected, candidate) == failure
`;
  const child = spawnSync("python3", ["-c", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      EVALUATOR_PATH: resolve(evaluatorPath),
      PYTHONDONTWRITEBYTECODE: "1",
    },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("latency, held-out limitations, and truthful revision boundary stay exact", () => {
  for (const stage of [
    result.latency.opencv_preprocess,
    result.latency.paddleocr_family_model_direct,
    result.latency.end_to_end,
  ]) {
    assert.equal(stage.sample_count, 32);
    assert.ok(stage.p50_ns <= stage.p95_ns);
    assert.ok(stage.p95_ns <= stage.p99_ns);
    assert.ok(stage.p99_ns <= stage.max_ns);
  }
  assert.deepEqual(result.hidden_test_integrity, {
    calibration_field_count: 15,
    expectation_authority_root_supplied_to_runner: false,
    hidden_field_count: 45,
    output_committed_before_evaluator_expected_open: true,
    prior_expectation_open_exclusion_verified: false,
    readiness_eligible: false,
    retry_after_expected_open_count_or_null: null,
    runner_and_authority_roots_distinct: true,
    split_class: "ocr_benchmark_hidden_test",
    trusted_provider_attestation_status: "pending",
    tuning_after_expected_open_count_or_null: null,
  });
  const boundary = result.immutable_original_and_revision_boundary;
  assert.equal(boundary.original_unchanged_during_revision, true);
  assert.equal(boundary.original_os_write_once_enforced, false);
  assert.equal(boundary.revision_storage_append_only_enforced, false);
  assert.equal(boundary.revision_in_process_hash_chain_validated, true);
  assert.equal(boundary.revision_atomic_expected_head_lock_used, true);
  assert.equal(boundary.valid_second_append_passed, true);
  assert.equal(boundary.edited_revision_used_for_accuracy, false);
  assert.equal(boundary.candidate_call_count_during_manual_revision, 0);
  assert.equal(boundary.duplicate_ordinal_rejected, true);
  assert.equal(boundary.predecessor_mismatch_rejected, true);
  assert.equal(boundary.journal_edit_rejected_with_expected_head, true);
  assert.equal(boundary.journal_truncate_rejected_with_expected_head, true);
  assert.equal(boundary.journal_delete_rejected_with_expected_head, true);
  assert.equal(boundary.metric_root_unchanged, true);
  assert.equal(
    boundary.machine_original_file_sha256_before,
    boundary.machine_original_file_sha256_after,
  );
  assert.equal(
    boundary.metric_root_before_sha256,
    boundary.metric_root_after_sha256,
  );
});

test("revision journal rejects identity, schema, keyset, symlink, and stale-head attacks", () => {
  const source = String.raw`
import hashlib
import hmac
import importlib.util
import multiprocessing
import os
import pathlib
import shutil
import tempfile
spec = importlib.util.spec_from_file_location("s236b_evaluator", os.environ["EVALUATOR_PATH"])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
root = pathlib.Path(tempfile.mkdtemp(prefix="s236b-revision-", dir=os.environ["TEST_PARENT"]))
key = b"k" * 32
original_id = "a" * 64
original_commitment = "b" * 64
def record(ordinal, previous, body):
    return {
        "schema_version": "s236b.ephemeral-ocr-revision.v3",
        "machine_original_id": original_id,
        "machine_original_commitment_sha256": original_commitment,
        "revision_ordinal": ordinal,
        "previous_revision_commitment_hmac_sha256": previous,
        "revision_commitment_hmac_sha256": hmac.new(key, body.encode(), hashlib.sha256).hexdigest(),
        "revision_actor_class": "native_manual_fallback_harness_not_human",
        "revision_reason_code": "synthetic_manual_correction_path_test",
        "revision_body": body,
    }
try:
    journal = root / "journal.jsonl"
    first = record(1, None, "one")
    head = module.append_revision(
        journal, first, original_id, original_commitment, key, None
    )
    barrier = multiprocessing.get_context("fork").Barrier(2)
    queue = multiprocessing.get_context("fork").Queue()
    def append_concurrently(body):
        selected = record(
            2, first["revision_commitment_hmac_sha256"], body
        )
        barrier.wait()
        try:
            module.append_revision(
                journal,
                selected,
                original_id,
                original_commitment,
                key,
                head,
            )
            queue.put("ok")
        except ValueError:
            queue.put("rejected")
    processes = [
        multiprocessing.get_context("fork").Process(
            target=append_concurrently, args=(body,)
        )
        for body in ("two-a", "two-b")
    ]
    for process in processes:
        process.start()
    for process in processes:
        process.join(5)
        assert process.exitcode == 0
    outcomes = sorted(queue.get(timeout=1) for _ in processes)
    assert outcomes == ["ok", "rejected"]
    current = module.file_sha256(journal)
    third = record(3, "0" * 64, "three")
    wrong_id = dict(third)
    wrong_id["machine_original_id"] = "c" * 64
    for hostile in (
        wrong_id,
        {**third, "schema_version": "wrong"},
        {**third, "extra": True},
    ):
        try:
            module.append_revision(
                journal,
                hostile,
                original_id,
                original_commitment,
                key,
                current,
            )
            raise AssertionError("hostile revision accepted")
        except ValueError:
            pass
    symlink_journal = root / "symlink.jsonl"
    symlink_journal.symlink_to(journal)
    try:
        module.append_revision(
            symlink_journal,
            first,
            original_id,
            original_commitment,
            key,
            None,
        )
        raise AssertionError("symlink journal accepted")
    except ValueError:
        pass
finally:
    shutil.rmtree(root)
`;
  const child = spawnSync("python3", ["-c", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      EVALUATOR_PATH: resolve(evaluatorPath),
      PYTHONDONTWRITEBYTECODE: "1",
      TEST_PARENT: resolve(".."),
    },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("committed JSON is bodyless and all 12 privacy sinks fail closed", () => {
  const bodylessFiles = [
    resultPath,
    fieldManifestPath,
    sbomPath,
    rightsPath,
    rollbackPath,
    candidateLockPath,
    contractPath,
  ];
  const forbiddenKeys = new Set([
    "raw_output",
    "expected_value",
    "commitment_key_base64",
    "leak_canary",
    "relative_fixture_locator",
    "fixture_path",
    "image_base64",
    "source_text",
    "revision_text",
  ]);

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(
        forbiddenKeys.has(key),
        false,
        `forbidden raw key persisted: ${key}`,
      );
      visit(child);
    }
  }

  for (const path of bodylessFiles) {
    const raw = readFileSync(path, "utf8");
    assert.equal(/\p{Script=Hangul}/u.test(raw), false, `${path} has body text`);
    visit(JSON.parse(raw));
  }

  const localRows = result.local_privacy_scan.ordered_sink_rows;
  const remoteRows = result.remote_privacy_scan.ordered_sink_rows;
  assert.deepEqual(contract.privacyBoundary.requiredSinkIdsExactly, requiredSinks);
  assert.deepEqual(
    new Set([...localRows, ...remoteRows].map((row) => row.sink_id)),
    new Set(requiredSinks),
  );
  assert.equal(
    localRows.reduce((sum, row) => sum + row.residual_count, 0),
    0,
  );
  assert.equal(
    localRows.reduce((sum, row) => sum + row.unresolved_count, 0),
    38,
  );
  assert.equal(result.local_privacy_scan.unresolved_count, 39);
  assert.equal(result.local_privacy_scan.complete_zero_residual_proof, false);
  assert.equal(result.local_privacy_scan.direct_raw_text_value_scan, false);
  assert.equal(
    result.remote_privacy_scan.status,
    "pending_exact_head_and_post_merge_scan",
  );
});

test("privacy scanner fails closed on missing, symlink, packed Git, and submodule state", () => {
  const source = String.raw`
import importlib.util
import os
import pathlib
import secrets
import shutil
import subprocess
import tempfile
spec = importlib.util.spec_from_file_location("s236b_evaluator", os.environ["EVALUATOR_PATH"])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parent = pathlib.Path(os.environ["TEST_PARENT"])
root = pathlib.Path(tempfile.mkdtemp(prefix="s236b-scanner-", dir=parent))
try:
    pattern = secrets.token_bytes(24)
    assert module.git_environment()["GIT_NO_REPLACE_OBJECTS"] == "1"
    evaluator_repository = pathlib.Path(
        os.environ["EVALUATOR_PATH"]
    ).resolve().parents[2]
    assert module.require_evaluator_repository(
        evaluator_repository
    ) == evaluator_repository
    try:
        module.require_evaluator_repository(root)
        raise AssertionError("wrong repository accepted")
    except SystemExit as error:
        assert str(error) == "S236B_REPOSITORY_MUST_EQUAL_EVALUATOR_REPOSITORY"

    missing = module.scan_tree(root / "missing", [pattern], {})
    assert missing["unresolved_count"] == 1
    scan_root = root / "tree"
    scan_root.mkdir()
    clean = scan_root / "clean.bin"
    clean.write_bytes(b"clean")
    sibling = scan_root / "sibling.bin"
    sibling.write_bytes(pattern)
    exact = module.scan_file(clean, [pattern], {})
    assert exact["match_count"] == 0
    link = scan_root / "link.bin"
    link.symlink_to(sibling)
    tree = module.scan_tree(scan_root, [pattern], {})
    assert tree["unresolved_count"] >= 1
    assert tree["match_count"] >= 1
    bound_root = root / "bound-runner"
    bound_root.mkdir()
    bound_log = bound_root / "protocol.log"
    bound_log.write_bytes(b"")
    bound_cache = bound_root / "cache"
    bound_cache.mkdir()
    assert module.require_descendant_file_or_directory(
        bound_log, bound_root, "file"
    ) == bound_log.resolve()
    assert module.require_descendant_file_or_directory(
        bound_cache, bound_root, "directory"
    ) == bound_cache.resolve()
    try:
        module.require_descendant_file_or_directory(
            sibling, bound_root, "file"
        )
        raise AssertionError("outside sink accepted")
    except SystemExit as error:
        assert str(error) == "S236B_BOUND_SINK_OUTSIDE_RUNNER_ROOT"

    repository = root / "repository"
    repository.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=repository, check=True)
    subprocess.run(["git", "config", "user.email", "s236b@example.invalid"], cwd=repository, check=True)
    subprocess.run(["git", "config", "user.name", "S236B"], cwd=repository, check=True)
    committed = repository / "committed.bin"
    committed.write_bytes(pattern)
    subprocess.run(["git", "add", "committed.bin"], cwd=repository, check=True)
    subprocess.run(["git", "commit", "-qm", "fixture"], cwd=repository, check=True)
    committed.unlink()
    subprocess.run(["git", "gc", "--prune=now", "-q"], cwd=repository, check=True)
    prior = os.environ.get("GIT_OBJECT_DIRECTORY")
    os.environ["GIT_OBJECT_DIRECTORY"] = str(root / "wrong-object-store")
    try:
        decoded = module.scan_decoded_git_blobs(repository, [pattern], {})
    finally:
        if prior is None:
            os.environ.pop("GIT_OBJECT_DIRECTORY", None)
        else:
            os.environ["GIT_OBJECT_DIRECTORY"] = prior
    assert decoded["match_count"] >= 1
    assert decoded["unresolved_count"] == 0

    replace_repository = root / "replace-repository"
    replace_repository.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=replace_repository, check=True)
    raw_object = subprocess.run(
        ["git", "hash-object", "-w", "--stdin"],
        cwd=replace_repository,
        check=True,
        input=pattern,
        stdout=subprocess.PIPE,
    ).stdout.decode("ascii").strip()
    clean_object = subprocess.run(
        ["git", "hash-object", "-w", "--stdin"],
        cwd=replace_repository,
        check=True,
        input=b"x" * len(pattern),
        stdout=subprocess.PIPE,
    ).stdout.decode("ascii").strip()
    subprocess.run(
        ["git", "replace", raw_object, clean_object],
        cwd=replace_repository,
        check=True,
    )
    replace_scan = module.scan_decoded_git_blobs(
        replace_repository, [pattern], {}
    )
    assert replace_scan["match_count"] >= 1
    assert replace_scan["unresolved_count"] == 0

    head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repository,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout.strip()
    subprocess.run(
        ["git", "update-index", "--add", "--cacheinfo", f"160000,{head},submodule"],
        cwd=repository,
        check=True,
    )
    with_submodule = module.scan_decoded_git_blobs(repository, [pattern], {})
    assert with_submodule["match_count"] >= 1
    assert with_submodule["unresolved_count"] >= 1
finally:
    shutil.rmtree(root)
`;
  const child = spawnSync("python3", ["-c", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      EVALUATOR_PATH: resolve(evaluatorPath),
      PYTHONDONTWRITEBYTECODE: "1",
      TEST_PARENT: resolve(".."),
    },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("runtime inventory and asset rights remain truthfully unresolved", () => {
  assert.equal(sha256Json(withoutKey(sbom, "sbom_sha256")), sbom.sbom_sha256);
  assert.equal(
    sha256Json(sbom.ordered_component_rows),
    sbom.ordered_component_rows_digest,
  );
  assert.equal(
    sha256Json(sbom.component_set_preimage),
    sbom.component_set_sha256,
  );
  assert.equal(sbom.component_count, 17);
  assert.equal(sbom.ordered_component_rows.length, 17);
  assert.equal(sbom.unexpected_component_count, 0);
  assert.equal(sbom.missing_component_count, 0);
  assert.equal(sbom.version_mismatch_count, 0);
  assert.equal(sbom.license_file_missing_count, 0);
  assert.equal(sbom.forbidden_license_count_or_null, null);
  assert.equal(
    sbom.license_policy_evaluation_status,
    "not_run_named_human_review_required",
  );
  assert.equal(sbom.native_os_and_driver_inventory_status, "not_inventoried");
  assert.equal(sbom.wheel_hash_coverage_count, 2);
  assert.equal(sbom.wheel_hash_missing_count, 15);
  assert.equal(sbom.unresolved_component_count, 17);
  assert.equal(
    sbom.vulnerability_scan_status,
    "not_run_offline_database_snapshot_unavailable",
  );
  assert.equal(sbom.stock_paddleocr_present, false);
  assert.equal(sbom.paddlex_present, false);
  assert.equal(sbom.aistudio_sdk_present, false);
  assert.equal(sbom.decision, "not_a_verified_license_and_SBOM_receipt");

  assert.equal(rights.unresolvedRightsCount, 2);
  assert.equal(rights.reviewer, null);
  assert.equal(rights.reviewedAt, null);
  assert.equal(
    rights.fullTextLayoutTableFormulaAssetSet.status,
    "not_acquired_not_executed",
  );
  assert.equal(
    rights.orderedAssetRows.some(
      (row) => row.paddleocrSourceCodeExecuted === true,
    ),
    false,
  );
  assert.equal(rights.decision, "not_a_verified_model_asset_rights_receipt");
});

test("runner and generator bind installed, model, adapter, and font bytes", () => {
  const runner = readFileSync("benchmarks/s236b/run_candidate.py", "utf8");
  const generator = readFileSync(
    "benchmarks/s236b/generate_synthetic.py",
    "utf8",
  );
  for (const required of [
    "S236B_CANDIDATE_LOCK_DIGEST_MISMATCH",
    "S236B_RUNNER_DIGEST_MISMATCH",
    "S236B_RUNNER_SBOM_DIGEST_MISMATCH",
    "S236B_RUNNER_PYTHON_VERSION_MISMATCH",
    "verify_execution_dependencies(",
    "verify_imported_module_origin(",
    "verify_model_files(args.model_dir, lock)",
    '"imported_module_origins_matched_distribution_inventories": True',
    '"model_files_hash_verified_before_and_after_inference": True',
    "S236B_CV2_RUNTIME_VERSION_MISMATCH",
  ]) {
    assert.ok(runner.includes(required), required);
  }
  assert.equal(
    runner.match(/verify_model_files\(args\.model_dir, lock\)/g)?.length,
    2,
  );
  for (const required of [
    "S236B_FONT_DIGEST_MISMATCH",
    "S236B_GENERATOR_DIGEST_MISMATCH",
    "S236B_GENERATOR_SBOM_DIGEST_MISMATCH",
    "S236B_GENERATOR_PYTHON_VERSION_MISMATCH",
    "verify_execution_dependencies(",
    "verify_imported_module_origin(",
    '"imported_module_origins_matched_distribution_inventories": True',
    "write_owner_sentinel(",
  ]) {
    assert.ok(generator.includes(required), required);
  }
  assert.equal(sbom.scanner_sha256, fileSha256("benchmarks/s236b/scan_runtime_sbom.py"));
  assert.equal(sbom.python_version, "3.12.13");
  assert.equal(
    sbom.wheel_hashes_are_declared_candidate_pins_not_verified_install_receipts,
    true,
  );
  for (const row of sbom.ordered_component_rows) {
    assert.equal(
      row.wheel_pin_provenance_status,
      row.wheel_sha256_or_null === null
        ? "not_available"
        : "declared_candidate_pin_not_local_artifact_or_install_receipt",
    );
  }
  assert.equal(
    result.runtime_sbom_file_sha256,
    fileSha256(sbomPath),
  );
  assert.equal(
    candidateLock.candidateConfiguration.paddleocr
      .candidate_family_source_code_executed,
    false,
  );
  assert.equal(candidateLock.claims.paddleocrSourceCodeExecuted, false);
});

test("isolation identities reproduce and six rollback scenarios clean up", () => {
  assert.equal(
    sha256Json(rollback.environmentIdentityPreimage),
    rollback.environmentIdentity,
  );
  assert.equal(
    sha256Json(rollback.environmentConfigurationPreimage),
    rollback.environmentConfigurationSha256,
  );
  assert.equal(
    sha256Json(rollback.rollbackTargetPolicyPreimage),
    rollback.rollbackTargetPolicySha256,
  );
  assert.equal(
    sha256Json(rollback.orderedScenarioRows),
    rollback.rollbackReceiptSetSha256,
  );
  assert.equal(
    sha256Json(rollback.expectedAndActualEmptyState),
    rollback.rollbackStateSha256,
  );
  assert.equal(rollback.rollbackTargetSha256, rollback.rollbackStateSha256);
  assert.deepEqual(
    rollback.orderedScenarioRows.map((row) => row.scenarioId),
    contract.environmentAndRollback.scenarioIdsExactly,
  );
  assert.equal(rollback.normalRunnerAndAuthorityRootCleanupProven, true);
  assert.equal(rollback.failureScenarioEvidenceUsesProxyFaultRoots, true);
  assert.equal(
    rollback.actualPreEvaluatorRunnerAndAuthorityFailureCleanupProven,
    false,
  );
  assert.equal(rollback.qualifyingTestedRollbackReceipt, false);
  for (const [index, scenario] of rollback.orderedScenarioRows.entries()) {
    assert.equal(scenario.rollbackSuccess, true);
    assert.equal(scenario.rollbackTargetSha256, rollback.rollbackTargetSha256);
    assert.equal(scenario.rollbackStateSha256, rollback.rollbackStateSha256);
    assert.equal(
      scenario.actualPostStateSha256,
      rollback.rollbackStateSha256,
    );
    assert.ok(scenario.preStatePayloadFileCount >= 1);
    assert.equal(scenario.receiptOutsideTarget, true);
    assert.equal(scenario.failedRollbackAssertionCount, 0);
    assert.equal(scenario.residualFileCount, 0);
    assert.equal(scenario.residualByteCount, 0);
    assert.equal(
      scenario.evidenceTargetClass,
      index < 4
        ? "proxy_fault_root_not_candidate_runner_or_authority"
        : index === 4
          ? "actual_candidate_runner_root"
          : "actual_expectation_authority_root",
    );
  }
  assert.equal(rollback.receiptInsideTargetAttemptRejected, true);
  assert.equal(
    rollback.networkIsolation.networkAccessDuringFixtureExecutionProvenAbsent,
    false,
  );
  assert.equal(rollback.networkIsolation.ipv4SocketDenialTestPassed, true);
  assert.equal(rollback.networkIsolation.ipv6SocketDenialTestPassed, true);
  assert.equal(rollback.networkIsolation.dnsDenialTestPassed, true);
  assert.equal(
    rollback.networkIsolation.isolationCompletenessStatus,
    "partial_process_shim_only",
  );
  assert.equal(rollback.trustedExecutionEnvironmentProviderReference, null);
  assert.equal(rollback.secretsMountedOrExposedProvenFalse, false);
});

test("cleanup binds target identity, payload, evidence, and outside receipt", () => {
  const workspaceParent = resolve("..");
  const target = mkdtempSync(join(workspaceParent, "s236b-fault-"));
  const replayTarget = mkdtempSync(join(workspaceParent, "s236b-fault-"));
  const metadataOnlyTarget = mkdtempSync(
    join(workspaceParent, "s236b-fault-"),
  );
  const insideReceipt = join(target, "receipt.json");
  const outsideReceipt = join(
    workspaceParent,
    `${basename(target)}-receipt.json`,
  );
  const cleanupSha256 = fileSha256(cleanupPath);
  const producerSha256 = fileSha256(faultProducerPath);
  const runId = "hostile-cleanup-test";

  function writeControl(selectedTarget, withPayload) {
    const parentSha256 = sha256Bytes(workspaceParent);
    const basenameSha256 = sha256Bytes(basename(selectedTarget));
    const locatorSha256 = sha256Bytes(resolve(selectedTarget));
    const owner = {
      approved_parent_sha256: parentSha256,
      benchmark_configuration_bundle_sha256:
        contract.candidateContract.benchmarkConfigurationBundleSha256,
      candidate_configuration_sha256:
        contract.candidateContract.candidateConfigurationSha256,
      root_instance_nonce: sha256Bytes(`${basename(selectedTarget)}-nonce`),
      root_role: "fault",
      run_id: runId,
      schema_version: "s236b.root-owner-sentinel.v2",
      target_basename_sha256: basenameSha256,
      target_locator_sha256: locatorSha256,
    };
    const ownerPath = join(selectedTarget, ".s236b-root-owner.json");
    writeFileSync(ownerPath, canonicalJson(owner));
    const evidence = {
      approved_parent_sha256: parentSha256,
      attestation_status:
        "local_machine_observation_not_independently_attested",
      benchmark_configuration_bundle_sha256:
        contract.candidateContract.benchmarkConfigurationBundleSha256,
      candidate_configuration_sha256:
        contract.candidateContract.candidateConfigurationSha256,
      fixture_manifest_sha256: result.fixture_manifest_sha256,
      observation_nonce: sha256Bytes(`${basename(selectedTarget)}-observation`),
      outcome_observed: true,
      producer_implementation_sha256: producerSha256,
      producer_observation: {
        interrupt_signal: "SIGTERM",
        process_exit_observed: true,
      },
      reason_code: "interrupted_execution",
      root_instance_nonce: owner.root_instance_nonce,
      root_role: "fault",
      run_id: runId,
      schema_version: "s236b.cleanup-observation-evidence.v2",
      target_basename_sha256: basenameSha256,
      target_locator_sha256: locatorSha256,
    };
    const evidencePath = join(
      selectedTarget,
      "cleanup-evidence.bodyless.json",
    );
    writeFileSync(evidencePath, canonicalJson(evidence));
    const sentinel = {
      approved_parent_sha256: parentSha256,
      benchmark_configuration_bundle_sha256:
        contract.candidateContract.benchmarkConfigurationBundleSha256,
      candidate_configuration_sha256:
        contract.candidateContract.candidateConfigurationSha256,
      fixture_manifest_sha256: result.fixture_manifest_sha256,
      observation_evidence_relative_path:
        "cleanup-evidence.bodyless.json",
      observation_evidence_sha256: fileSha256(evidencePath),
      owner_sentinel_sha256: fileSha256(ownerPath),
      producer_implementation_sha256: producerSha256,
      reason_code: "interrupted_execution",
      root_instance_nonce: owner.root_instance_nonce,
      root_role: "fault",
      run_id: runId,
      schema_version: "s236b.cleanup-target-sentinel.v2",
      target_basename_sha256: basenameSha256,
      target_locator_sha256: locatorSha256,
    };
    writeFileSync(
      join(selectedTarget, ".s236b-cleanup-sentinel.json"),
      canonicalJson(sentinel),
    );
    if (withPayload) {
      writeFileSync(join(selectedTarget, "ephemeral-payload.bin"), "payload");
    }
    return {
      evidenceSha256: fileSha256(evidencePath),
      ownerSha256: fileSha256(ownerPath),
    };
  }

  function cleanupArgs(selectedTarget, receipt, control) {
    return [
      resolve(cleanupPath),
      "--target",
      selectedTarget,
      "--approved-parent",
      workspaceParent,
      "--receipt",
      receipt,
      "--expected-cleanup-sha256",
      cleanupSha256,
      "--expected-owner-sentinel-sha256",
      control.ownerSha256,
      "--expected-producer-implementation-sha256",
      producerSha256,
      "--expected-run-id",
      runId,
      "--expected-candidate-configuration-sha256",
      contract.candidateContract.candidateConfigurationSha256,
      "--expected-benchmark-configuration-bundle-sha256",
      contract.candidateContract.benchmarkConfigurationBundleSha256,
      "--expected-fixture-manifest-sha256",
      result.fixture_manifest_sha256,
      "--expected-observation-evidence-sha256",
      control.evidenceSha256,
      "--reason-code",
      "interrupted_execution",
    ];
  }

  const control = writeControl(target, true);
  const metadataOnlyControl = writeControl(metadataOnlyTarget, false);

  try {
    const hostile = spawnSync(
      "python3",
      cleanupArgs(target, insideReceipt, control),
      {
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.notEqual(hostile.status, 0);
    assert.match(
      hostile.stderr + hostile.stdout,
      /S236B_CLEANUP_RECEIPT_MUST_BE_OUTSIDE_TARGET/,
    );
    assert.equal(existsSync(target), true);

    const missingTarget = join(
      workspaceParent,
      `s236b-fault-intentionally-missing-${basename(target)}`,
    );
    const missing = spawnSync(
      "python3",
      cleanupArgs(
        missingTarget,
        `${outsideReceipt}.missing`,
        control,
      ),
      {
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.notEqual(missing.status, 0);
    assert.match(
      missing.stderr + missing.stdout,
      /S236B_CLEANUP_TARGET_MUST_EXIST/,
    );

    for (const name of [
      ".s236b-root-owner.json",
      "cleanup-evidence.bodyless.json",
      ".s236b-cleanup-sentinel.json",
      "ephemeral-payload.bin",
    ]) {
      copyFileSync(join(target, name), join(replayTarget, name));
    }
    const replay = spawnSync(
      "python3",
      cleanupArgs(
        replayTarget,
        `${outsideReceipt}.replay`,
        control,
      ),
      {
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.notEqual(replay.status, 0);
    assert.match(
      replay.stderr + replay.stdout,
      /S236B_CLEANUP_OWNER_SENTINEL_MISMATCH/,
    );
    assert.equal(existsSync(replayTarget), true);

    const metadataOnly = spawnSync(
      "python3",
      cleanupArgs(
        metadataOnlyTarget,
        `${outsideReceipt}.metadata-only`,
        metadataOnlyControl,
      ),
      {
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.notEqual(metadataOnly.status, 0);
    assert.match(
      metadataOnly.stderr + metadataOnly.stdout,
      /S236B_CLEANUP_PRE_STATE_NOT_MEANINGFUL/,
    );
    assert.equal(existsSync(metadataOnlyTarget), true);

    const accepted = spawnSync(
      "python3",
      cleanupArgs(target, outsideReceipt, control),
      {
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
    );
    assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
    assert.equal(existsSync(target), false);
    const receipt = JSON.parse(readFileSync(outsideReceipt, "utf8"));
    assert.equal(receipt.receipt_outside_target, true);
    assert.equal(receipt.rollback_success, true);
    assert.equal(receipt.residual_file_count, 0);
    assert.equal(
      receipt.rollback_state_sha256,
      receipt.actual_post_state_sha256,
    );
  } finally {
    rmSync(target, { force: true, recursive: true });
    rmSync(replayTarget, { force: true, recursive: true });
    rmSync(metadataOnlyTarget, { force: true, recursive: true });
    rmSync(outsideReceipt, { force: true });
    rmSync(`${outsideReceipt}.missing`, { force: true });
    rmSync(`${outsideReceipt}.replay`, { force: true });
    rmSync(`${outsideReceipt}.metadata-only`, { force: true });
  }
});

test("S235B exact 16-input and seven-dimension contracts are preserved", () => {
  const sourceGate = s235b.laterGateEvidence.S236B;
  const sourceMatrix =
    s235b.laterGateEvidence.gateCrossInputCoherenceReceiptShape
      .crossInputCoherenceMatrix.S236B;
  assert.equal(
    contract.s235bGatePacketContract.scopeId,
    sourceGate.exactScopeId,
  );
  assert.deepEqual(
    contract.s235bGatePacketContract.requiredInputNamesExactly,
    sourceGate.requiredInputs,
  );
  assert.deepEqual(
    contract.crossInputCoherence.orderedDimensions.map((row) => ({
      canonicalRootPreimage: row.canonicalRootPreimage,
      comparisonOperator: row.comparisonOperator,
      derivationSpecIdByInputExactly: row.derivationSpecIdByInputExactly,
      dimensionId: row.dimensionId,
      participatingInputsExactly: row.participatingInputsExactly,
    })),
    sourceMatrix,
  );
  const bindings = contract.s235bGatePacketContract.sourceContractBindings;
  assert.equal(
    bindings.sourceContractFileSha256,
    fileSha256(s235bPath),
  );
  assert.equal(
    bindings.sourceContractCanonicalSha256,
    sha256Json(s235b),
  );
  assert.equal(
    bindings.sourceGateCanonicalSha256,
    sha256Json(sourceGate),
  );
  assert.equal(
    bindings.immutableInputBindingContractCanonicalSha256,
    sha256Json(sourceGate.immutableInputBindingContract),
  );
  assert.equal(
    bindings.requiredInputAcceptanceContractCanonicalSha256,
    sha256Json(sourceGate.requiredInputAcceptanceContract),
  );
  assert.equal(
    bindings.requiredInputEvidenceContractRegistryCanonicalSha256,
    sha256Json(sourceGate.requiredInputEvidenceContractRegistry),
  );
  assert.equal(
    bindings.requiredInputProjectionContractRegistryCanonicalSha256,
    sha256Json(sourceGate.requiredInputProjectionContractRegistry),
  );
  assert.equal(
    bindings.expiryTriggersCanonicalSha256,
    sha256Json(sourceGate.expiryTriggers),
  );
  assert.equal(
    bindings.crossInputCoherenceMatrixCanonicalSha256,
    sha256Json(sourceMatrix),
  );
  assert.equal(
    contract.crossInputCoherence.sourceMatrixCanonicalSha256,
    sha256Json(sourceMatrix),
  );
  assert.ok(
    contract.crossInputCoherence.orderedDimensions.every(
      (row) =>
        row.machineCommonValueOrNull === null &&
        row.machineCarrierProjectionStatus ===
          "raw_local_observation_not_current_signed_S235B_coherence" &&
        row.signedCoherenceStatus === "pending",
    ),
  );
  assert.equal(
    contract.crossInputCoherence.orderedDimensions[6]
      .rawLocalObservationOrNull,
    rollback.rollbackStateSha256,
  );
  assert.equal(rollback.rollbackTargetSha256, rollback.rollbackStateSha256);
});

test("exact source and evidence hashes are bound", () => {
  for (const row of contract.benchmarkHarness.scriptIdentitiesAtExecution) {
    assert.equal(fileSha256(row.path), row.sha256, row.path);
  }
  assert.equal(
    fileSha256(resultPath),
    contract.benchmarkHarness.bodylessBenchmarkResultFileSha256,
  );
  assert.equal(
    fileSha256(fieldManifestPath),
    contract.benchmarkHarness.fieldGroundTruthManifestFileSha256,
  );
  assert.equal(
    fileSha256(sbomPath),
    contract.benchmarkHarness.runtimeSbomFileSha256,
  );
  assert.equal(
    fileSha256(rollbackPath),
    contract.benchmarkHarness.rollbackEvidenceFileSha256,
  );
  assert.equal(
    fileSha256(candidateLockPath),
    contract.candidateContract.candidateLockFileSha256,
  );
  assert.equal(
    fileSha256(rightsPath),
    contract.supplyChainAndRights.modelRightsReviewFileSha256,
  );
  assert.equal(
    result.candidate_configuration_sha256,
    contract.candidateContract.candidateConfigurationSha256,
  );
  assert.equal(
    result.benchmark_configuration_bundle_sha256,
    contract.candidateContract.benchmarkConfigurationBundleSha256,
  );
});

test("hostile gate, receipt, lifecycle, and evidence mutations fail closed", () => {
  assert.deepEqual(collectErrors(contract), []);

  const cases = [
    (candidate) => (candidate.schemaVersion = "wrong"),
    (candidate) => (candidate.liveStart.mainTreeSha = "0".repeat(40)),
    (candidate) => (candidate.contractState = "verified_complete"),
    (candidate) => (candidate.s235bGatePacketContract.gateId = "O3B"),
    (candidate) =>
      (candidate.s235bGatePacketContract.scopeId = "wrong_scope"),
    (candidate) =>
      (candidate.s235bGatePacketContract.packetSchemaVersion = "wrong"),
    (candidate) =>
      (candidate.s235bGatePacketContract.requiredDecision = "passing"),
    (candidate) =>
      (candidate.s235bGatePacketContract.canonicalization = "ad_hoc"),
    (candidate) =>
      (candidate.s235bGatePacketContract.exactHeadAndTreeRequired = false),
    (candidate) =>
      (candidate.s235bGatePacketContract.sourceContractBindings
        .expiryTriggersCanonicalSha256 = "0".repeat(64)),
    (candidate) =>
      candidate.s235bGatePacketContract.requiredInputNamesExactly.push(
        "extra",
      ),
    (candidate) =>
      (candidate.s235bGatePacketContract.orderedInputReadiness[0]
        .machineEvidenceStatus = "forged"),
    (candidate) =>
      (candidate.s235bGatePacketContract.orderedInputReadiness[0]
        .gateReceiptStatus = "passing"),
    (candidate) =>
      (candidate.s235bGatePacketContract.passingPacket = {
        gateId: "S236B",
        decision: "verified_complete_current_S236B_gate_packet",
        exactHeadAndTree: true,
      }),
    (candidate) =>
      (candidate.s235bGatePacketContract.rootKeyRegistryReceipt = {
        forged: true,
      }),
    (candidate) =>
      (candidate.s235bGatePacketContract.rootTrustAnchorProjectionReceipt = {
        forged: true,
      }),
    (candidate) =>
      (candidate.crossInputCoherence.signedCrossInputCoherenceReceipt = {
        forged: true,
      }),
    (candidate) =>
      candidate.crossInputCoherence.orderedDimensions.pop(),
    (candidate) =>
      (candidate.crossInputCoherence.sourceMatrixCanonicalSha256 =
        "0".repeat(64)),
    (candidate) =>
      (candidate.crossInputCoherence.orderedDimensions[0]
        .comparisonOperator = "any_equal"),
    (candidate) =>
      (candidate.crossInputCoherence.orderedDimensions[0]
        .canonicalRootPreimage.schemaVersion = "wrong"),
    (candidate) =>
      (candidate.crossInputCoherence.orderedDimensions[0]
        .derivationSpecIdByInputExactly.pinned_candidate_versions = "wrong"),
    (candidate) =>
      (candidate.crossInputCoherence.orderedDimensions[0]
        .machineCommonValueOrNull =
        candidate.candidateContract.candidateSetSha256),
    (candidate) =>
      (candidate.fixtureAndGroundTruthContract.realLearnerContentCount = 1),
    (candidate) => (candidate.benchmarkEvidence.correctCount = 60),
    (candidate) =>
      (candidate.heldOutIntegrity.priorExpectationOpenExclusionVerified = true),
    (candidate) =>
      (candidate.heldOutIntegrity.retryAfterExpectedOpenCountOrNull = 0),
    (candidate) =>
      (candidate.immutableOriginalAndRevisionBoundary
        .machineOriginalImmutable = true),
    (candidate) =>
      (candidate.immutableOriginalAndRevisionBoundary.revisionAppendOnly =
        true),
    (candidate) =>
      (candidate.nativeManualFallback.machineOriginalRemainsImmutable = true),
    (candidate) => (candidate.privacyBoundary.localUnresolvedCount = 0),
    (candidate) => (candidate.privacyBoundary.completeZeroResidualProof = true),
    (candidate) =>
      (candidate.privacyBoundary
        .protocolLogExecutionRedirectionBindingVerified = true),
    (candidate) =>
      (candidate.privacyBoundary.cacheEnvironmentBindingVerified = true),
    (candidate) =>
      (candidate.privacyBoundary.executionRepositoryIdentityBefore
        .worktreeStateSha256 = "0".repeat(64)),
    (candidate) =>
      (candidate.candidateContract.paddleOcrFamilySourceCodeExecuted = true),
    (candidate) =>
      (candidate.candidateContract.perFixtureTimeoutSupervision = true),
    (candidate) =>
      (candidate.supplyChainAndRights.forbiddenLicenseCountOrNull = 0),
    (candidate) =>
      (candidate.supplyChainAndRights.unresolvedRuntimeComponentCount = 0),
    (candidate) =>
      (candidate.supplyChainAndRights
        .wheelHashesAreDeclaredCandidatePinsNotVerifiedInstallReceipts =
        false),
    (candidate) =>
      (candidate.environmentAndRollback.networkAbsenceProven = true),
    (candidate) =>
      (candidate.environmentAndRollback
        .actualPreEvaluatorRunnerAndAuthorityFailureCleanupProven = true),
    (candidate) =>
      (candidate.environmentAndRollback.qualifyingTestedRollbackReceipt =
        true),
    (candidate) =>
      (candidate.environmentAndRollback.rollbackReceiptSetSha256 =
        "0".repeat(64)),
    (candidate) =>
      (candidate.acceptanceAndMergePolicy.mergeApprovedNow = true),
    (candidate) => (candidate.acceptanceAndMergePolicy.autoMergeAllowed = true),
    (candidate) => (candidate.authorizationBoundary.o3bStarted = true),
    (candidate) =>
      (candidate.authorizationBoundary.candidateLifecycleState = "active"),
    (candidate) =>
      (candidate.authorizationBoundary
        .firstRoundNavigationOnboardingPricingOrPublicClaimsExposed = true),
    (candidate) =>
      (candidate.authorizationBoundary
        .productionDependenciesModelsTelemetryOrContentActivated = true),
    (candidate) =>
      (candidate.authorizationBoundary
        .sharedSchemaPersistenceAuthRlsOrBillingChanged = true),
    (candidate) =>
      (candidate.authorizationBoundary.qtiXapiOrCaliperConformanceClaimed =
        true),
    (candidate) =>
      (candidate.laneSerialization.overallMutationWipMaximum = 3),
    (candidate) =>
      candidate.laneSerialization.sharedFilesHeldForLaneAPriority.pop(),
    (candidate) =>
      (candidate.laneSerialization
        .exactHeadEvidenceRegenerationAfterAnyRebaseOrMergeRequired = false),
    (candidate) => candidate.blockingItems.pop(),
    (candidate) =>
      (candidate.postMergeSafeState.downstreamAutomaticStartExpected = true),
    (candidate) =>
      candidate.ownedFileManifest.push("roadmap/active-program.yml"),
  ];

  for (const mutate of cases) {
    const hostile = clone(contract);
    mutate(hostile);
    assert.notDeepEqual(collectErrors(hostile), []);
  }
});
