#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { getChangedFiles } from "./classify-risk.mjs";

export const AUTHORITY_SCHEMA_VERSION = "fast_delivery_parallel_execution_v2.authority.v1";
export const AMENDMENT_ID = "FAST_DELIVERY_AND_PARALLEL_EXECUTION_V2";
export const REQUIRED_STABLE_CHECKS = Object.freeze([
  "pr-contract",
  "risk-classifier",
  "runtime-gate",
  "fast-ci",
  "full-ci",
  "full-ci-windows",
  "Learner Loop Health",
]);
export const QF_ORDER = Object.freeze([
  "QF_0_QUARANTINE_CORE",
  "QF_S1_BOUNDED_SIMILARITY_CORPUS_V1",
  "QF_S2_CANDIDATE_TIME_AWARE_AUDIT_PRELUDE_V1",
  "QF_S3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_V1",
  "QF_I1_RELEASE_INTEGRATION",
]);
const FROZEN_AMENDMENT_ARTIFACTS = Object.freeze([
  "config/dabangil-fast-delivery-parallel-execution-v2.json",
  "docs/decisions/2026-08-27-owner-fast-delivery-parallel-execution-v2.md",
  "scripts/automation/fast-delivery-parallel-v2.mjs",
]);
const QF_LANE_BOUNDARIES = Object.freeze({
  QF_0_QUARANTINE_CORE: Object.freeze({
    branch: "codex/question-foundry-quarantine-core-v1",
    worktreePath: ".agent-factory/worktrees/question-foundry-quarantine-core-v1",
    ownedPathsExactly: Object.freeze([
      "config/dabangil-question-foundry-quarantine-core-v1.json",
      "lib/question-foundry/quarantine-core-v1.mjs",
      "tests/question-foundry-quarantine-core-v1.test.mjs",
    ]),
  }),
  QF_S1_BOUNDED_SIMILARITY_CORPUS_V1: Object.freeze({
    branch: "codex/question-foundry-bounded-similarity-corpus-v1",
    worktreePath: ".agent-factory/worktrees/question-foundry-bounded-similarity-corpus-v1",
    ownedPathsExactly: Object.freeze([
      "config/dabangil-question-foundry-bounded-similarity-corpus-v1.json",
      "lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs",
      "tests/question-foundry-bounded-similarity-corpus-v1.test.mjs",
    ]),
  }),
  QF_S2_CANDIDATE_TIME_AWARE_AUDIT_PRELUDE_V1: Object.freeze({
    branch: "codex/question-foundry-candidate-time-audit-prelude-v1",
    worktreePath: ".agent-factory/worktrees/question-foundry-candidate-time-audit-prelude-v1",
    ownedPathsExactly: Object.freeze([
      "config/dabangil-question-foundry-candidate-time-audit-prelude-v1.json",
      "lib/question-foundry/audit-prelude/candidate-time-audit-prelude-v1.mjs",
      "tests/question-foundry-candidate-time-audit-prelude-v1.test.mjs",
    ]),
  }),
  QF_S3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_V1: Object.freeze({
    branch: "codex/question-foundry-transfer-chronology-v1",
    worktreePath: ".agent-factory/worktrees/question-foundry-transfer-chronology-v1",
    ownedPathsExactly: Object.freeze([
      "config/dabangil-question-foundry-transfer-chronology-v1.json",
      "lib/question-foundry/transfer-chronology/dependency-ranked-transfer-chronology-v1.mjs",
      "tests/question-foundry-transfer-chronology-v1.test.mjs",
    ]),
  }),
  QF_I1_RELEASE_INTEGRATION: Object.freeze({
    branch: "codex/question-foundry-release-integration-v1",
    worktreePath: ".agent-factory/worktrees/question-foundry-release-integration-v1",
    ownedPathsExactly: Object.freeze([
      "config/dabangil-question-foundry-release-integration-v1.json",
      "lib/question-foundry/release-integration-v1.mjs",
      "tests/question-foundry-release-integration-v1.test.mjs",
    ]),
  }),
});
export const QF_REQUIRED_INVARIANTS = Object.freeze({
  QF_0_QUARANTINE_CORE: Object.freeze([
    "closed_contracts", "exact_identities_and_digests", "source_and_rights_authority",
    "exact_decimal_arithmetic_and_calculation_validation", "trusted_model_execution_identity",
    "generator_solver_judge_separation_contracts", "solution_first_candidate_generation",
    "candidate_quarantine", "lifecycle_identity", "bodyless_bank_scarcity_event",
    "offline_execution", "zero_mutation_boundary",
  ]),
  QF_S1_BOUNDED_SIMILARITY_CORPUS_V1: Object.freeze([
    "machine_owned_maximum_reference_count", "machine_owned_total_corpus_character_and_token_caps",
    "machine_owned_per_reference_limits", "machine_owned_deterministic_work_unit_cap",
    "every_reference_counts_including_unchanged_short_ineligible_and_skipped",
    "malformed_or_over_budget_fails_before_scanning", "bounded_transformed_window_detection_both_directions",
    "whole_body_jaccard_remains_separate", "number_name_and_word_only_preserve_meaningful_token_order",
    "word_only_does_not_reduce_unrelated_calculations_to_numeric_skeleton",
    "order_only_rejects_arbitrary_generic_token_bags", "machine_owned_protected_minimum_span",
    "short_generic_phrases_and_shared_numeric_layouts_are_negative_controls",
    "no_caller_threshold_or_work_bound_override",
  ]),
  QF_S2_CANDIDATE_TIME_AWARE_AUDIT_PRELUDE_V1: Object.freeze([
    "exact_evidence_timestamps_preserved", "candidate_generated_and_quarantined_use_candidate_own_time",
    "solution_commitment_precedes_authorized_candidate", "candidate_specific_prerequisites_are_causally_attached",
    "distinct_candidate_times_cannot_create_non_monotonic_prelude",
    "equal_times_use_immutable_deterministic_tie_breakers", "duplicate_immutable_evidence_fails_closed",
  ]),
  QF_S3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_V1: Object.freeze([
    "individual_transfer_receipts_precede_aggregate", "all_required_receipts_precede_owner_adjudication",
    "owner_adjudication_precedes_release", "release_decision_is_terminal",
    "timestamps_are_never_fabricated_or_normalized", "same_rank_orders_by_occurred_at_then_immutable_identity",
    "dependent_timestamp_before_required_cause_fails_closed", "equal_time_aggregate_cannot_precede_receipt",
    "stable_topological_order_is_byte_reproducible", "cycles_missing_parents_and_duplicate_identities_fail_closed",
  ]),
  QF_I1_RELEASE_INTEGRATION: Object.freeze([
    "similarity_corpus_bounded_before_release", "false_positive_controls_pass",
    "candidate_time_aware_audit_prelude", "exact_causal_transfer_chronology",
    "sealed_variants_independently_validated", "judge_drift_identities_and_artifacts_exact_and_distinct",
    "source_rights_and_effective_versions_current", "generator_self_approval_impossible",
    "ai_only_ceiling_personal_learning_usable",
    "provider_network_database_remote_and_production_mutation_zero",
  ]),
});
const QF_I1_FINAL_VALIDATION = Object.freeze([
  "complete_question_foundry_focused_suite", "all_split_module_hostile_tests", "governing_c2r_a_tests",
  "adjacent_foundation_kernel_study_capacity_regressions", "schema_and_exact_path_validation",
  "typecheck", "changed_file_lint", "production_build", "git_diff_check",
  "repository_required_exact_head_ci", "one_independent_adversarial_review",
  "one_fresh_formal_exact_head_review", "one_post_ready_review", "zero_unresolved_actionable_threads",
]);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const SAFE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[^*?\[\]{}]+$/u;
const BLOCKING_LABELS = new Set(["blocked", "human-decision", "do-not-merge", "needs-live-runtime"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateOwnedPath(value, errors, laneId) {
  add(errors, typeof value === "string" && SAFE_PATH_PATTERN.test(value), `${laneId}: invalid or globbed owned path: ${String(value)}`);
  add(errors, typeof value !== "string" || value === value.replaceAll("//", "/"), `${laneId}: non-canonical owned path: ${String(value)}`);
}

export function validateAuthority(contract) {
  const errors = [];
  add(errors, isRecord(contract), "authority must be an object");
  if (!isRecord(contract)) return { ok: false, errors };

  add(errors, contract.schemaVersion === AUTHORITY_SCHEMA_VERSION, "schemaVersion is invalid");
  add(errors, contract.amendmentId === AMENDMENT_ID, "amendmentId is invalid");
  add(errors, contract.programId === "INVERGE_OWNER_STUDY_OS", "programId is invalid");
  add(errors, contract.authorityDecisionPath === "docs/decisions/2026-08-27-owner-fast-delivery-parallel-execution-v2.md", "authorityDecisionPath is invalid");
  add(errors, SHA_PATTERN.test(contract.candidateBase?.protectedMainSha ?? ""), "candidate protected-main SHA is invalid");
  add(errors, SHA_PATTERN.test(contract.candidateBase?.protectedMainTree ?? ""), "candidate protected-main tree is invalid");
  add(errors, contract.deliveryControl?.repository === "chachathecat/inverge", "delivery repository drifted");
  add(errors, contract.deliveryControl?.baseRef === "main" && contract.deliveryControl?.baseSha === contract.candidateBase?.protectedMainSha, "delivery base drifted");
  add(errors, contract.deliveryControl?.headRef === "codex/fast-delivery-parallel-execution-v2", "delivery branch drifted");
  add(errors, contract.deliveryControl?.draftRequired === true && contract.deliveryControl?.closingKeywordsAllowed === false, "delivery must remain Draft and reference-only");
  add(errors, contract.candidateLane?.laneId === AMENDMENT_ID && contract.candidateLane?.profile === "HIGH", "candidate lane identity or profile drifted");
  add(errors, contract.candidateLane?.branch === "codex/fast-delivery-parallel-execution-v2", "candidate lane branch drifted");
  add(errors, contract.candidateLane?.worktreePath === ".agent-factory/worktrees/fast-delivery-parallel-execution-v2", "candidate lane worktree drifted");
  add(errors, Array.isArray(contract.candidateLane?.ownedPathsExactly) && contract.candidateLane.ownedPathsExactly.length > 0, "candidate exact path manifest is missing");
  const candidatePaths = contract.candidateLane?.ownedPathsExactly ?? [];
  for (const candidatePath of candidatePaths) validateOwnedPath(candidatePath, errors, AMENDMENT_ID);
  add(errors, new Set(candidatePaths).size === candidatePaths.length, "candidate exact path manifest contains duplicates");
  add(errors, contract.riskClassifier?.alwaysRunsOnPullRequests === true, "risk classifier must always run on pull requests");
  add(errors, contract.riskClassifier?.changedPathsRequired === true, "risk classifier must require changed paths");
  add(errors, contract.riskClassifier?.unknownPathDisposition === "HIGH", "unknown paths must fail closed to HIGH");
  add(errors, contract.riskClassifier?.registeredLaneExactPathProfileOverridesGenericPathProfile === true, "registered exact-lane profile routing is required");
  add(errors, contract.riskClassifier?.exactDiffSemanticHighRiskSignalsRequired === true, "exact-diff semantic HIGH signals are required");
  add(errors, contract.riskClassifier?.registeredLaneProfileCannotOverrideSemanticHighRiskSignal === true, "registered lanes must not suppress semantic HIGH signals");
  add(errors, contract.riskClassifier?.uninspectableChangedFileDisposition === "HIGH", "uninspectable changed files must fail closed to HIGH");
  add(errors, sameArray(contract.stableRequiredCheckNames, REQUIRED_STABLE_CHECKS), "stable required-check names drifted");

  for (const profile of ["LOW", "MEDIUM", "HIGH"]) {
    add(errors, isRecord(contract.validationProfiles?.[profile]), `${profile} validation profile is missing`);
    add(errors, Array.isArray(contract.validationProfiles?.[profile]?.required) && contract.validationProfiles[profile].required.length > 0, `${profile} required checks are missing`);
  }
  add(errors, contract.validationProfiles?.LOW?.forbidden?.includes("windows_full_suite"), "LOW must forbid the Windows full suite");
  add(errors, contract.validationExecution?.implementationLoop === "focused_tests_only", "implementation loop must be focused-tests-only");
  add(errors, contract.validationExecution?.finalApplicablePassCount === 1, "exactly one final applicable validation pass is required");
  add(errors, contract.validationExecution?.finalFormalReviewCount === 1, "exactly one final formal review is required");
  add(errors, contract.mergePolicy?.LOW?.startsWith("conditional_automatic_ready"), "LOW automatic Ready/merge policy is missing");
  add(errors, contract.mergePolicy?.MEDIUM?.startsWith("conditional_automatic_ready"), "MEDIUM automatic Ready/merge policy is missing");
  add(errors, contract.mergePolicy?.HIGH === "exact_head_owner_approval_required", "HIGH must require exact-head Owner approval");
  add(errors, contract.mergePolicy?.formalReviewMarkerTemplate === "FAST_DELIVERY_V2_FINAL_REVIEW head=<40_hex_sha> actionable=0/0/0", "formal review marker drifted");
  add(errors, contract.mergePolicy?.v2OwnerApprovalReceiptMarkerPrefix === "FAST_DELIVERY_PARALLEL_V2_EXACT_HEAD_SQUASH_MERGE_APPROVED_", "V2 Owner approval receipt marker drifted");
  add(errors, sameArray(contract.mergePolicy?.actionableP0P1P2Required, [0, 0, 0]), "merge review counts must be 0/0/0");
  add(errors, contract.mergePolicy?.registeredLaneOrExactFutureAuthorityRequired === true, "automatic merge must require a registered lane");
  add(errors, contract.mergePolicy?.exactChangedPathOwnershipRequired === true, "automatic merge must require exact changed-path ownership");
  add(errors, contract.mergePolicy?.isolatedWorktreeDeclarationRequired === true, "automatic merge must require isolated-worktree evidence");
  add(errors, contract.mergePolicy?.liveDependencyAndDeclaredOrderReceiptsRequired === true, "automatic merge must require live dependency and order receipts");
  add(errors, contract.mergePolicy?.validatedReceiptBindsExactLanePathsAndDeclaration === true, "validated receipts must bind exact lane paths and declaration");
  add(errors, contract.mergePolicy?.receiptReviewAndApprovalMustPrecedeMerge === true, "receipt review and approval must precede merge");
  add(errors, contract.mergePolicy?.registeredLaneMayMergeOnlyOnce === true, "registered lane identities must be single-merge");
  add(errors, contract.mergePolicy?.liveLaneConcurrencyRevalidatedBeforeMerge === true, "automatic merge must revalidate live lane concurrency");
  add(errors, contract.mergePolicy?.completePostReadyGateReevaluationRequired === true, "automatic merge must fully re-evaluate after Ready");
  add(errors, contract.laneIsolation?.oneIsolatedGitWorktreePerLane === true, "one isolated worktree per lane is required");
  add(errors, contract.laneIsolation?.exactRepoRelativePathOwnershipRequired === true, "exact path ownership is required");
  add(errors, contract.laneIsolation?.overlapDisposition === "fail_closed", "path overlap must fail closed");
  add(errors, contract.laneIsolation?.validatedResultingMainReceiptRequiredForEveryPriorLane === true, "every prior lane requires a validated resulting-main receipt");
  add(errors, sameArray(contract.frozenAmendmentArtifacts, FROZEN_AMENDMENT_ARTIFACTS), "frozen amendment artifacts drifted");

  const campaign = contract.questionFoundrySplitCampaign;
  add(errors, campaign?.monolithicReplacementProhibited === true, "monolithic Question Foundry replacement must be prohibited");
  add(errors, campaign?.maximumConcurrentMergeProducingLanes === 2, "Question Foundry split lane cap must be two");
  add(errors, sameArray(campaign?.declaredIntegrationAndMergeOrder, QF_ORDER), "Question Foundry integration order drifted");
  add(errors, sameArray(campaign?.parallelPairExactly, QF_ORDER.slice(1, 3)), "the sole parallel pair must be QF-S1/QF-S2");
  add(errors, Array.isArray(campaign?.lanes) && campaign.lanes.length === QF_ORDER.length, "exactly five split milestones are required");

  const lanes = Array.isArray(campaign?.lanes) ? campaign.lanes : [];
  const laneById = new Map();
  const ownerByPath = new Map();
  const seenBranches = new Set();
  const seenWorktrees = new Set();
  for (const lane of lanes) {
    add(errors, isRecord(lane), "lane must be an object");
    if (!isRecord(lane)) continue;
    add(errors, !laneById.has(lane.laneId), `duplicate lane: ${String(lane.laneId)}`);
    laneById.set(lane.laneId, lane);
    add(errors, typeof lane.branch === "string" && lane.branch.startsWith("codex/"), `${lane.laneId}: codex branch is required`);
    add(errors, typeof lane.worktreePath === "string" && lane.worktreePath.startsWith(".agent-factory/worktrees/"), `${lane.laneId}: isolated worktree path is required`);
    add(errors, !seenBranches.has(lane.branch), `${lane.laneId}: duplicate branch`);
    add(errors, !seenWorktrees.has(lane.worktreePath), `${lane.laneId}: duplicate worktree path`);
    seenBranches.add(lane.branch);
    seenWorktrees.add(lane.worktreePath);
    const frozenBoundary = QF_LANE_BOUNDARIES[lane.laneId];
    add(errors, lane.branch === frozenBoundary?.branch, `${lane.laneId}: branch drifted`);
    add(errors, lane.worktreePath === frozenBoundary?.worktreePath, `${lane.laneId}: worktree path drifted`);
    add(errors, sameArray(lane.ownedPathsExactly, frozenBoundary?.ownedPathsExactly ?? []), `${lane.laneId}: exact path manifest drifted`);
    add(errors, ["LOW", "MEDIUM", "HIGH"].includes(lane.profile), `${lane.laneId}: invalid profile`);
    add(errors, Array.isArray(lane.dependencies) && lane.dependencies.length > 0, `${lane.laneId}: dependencies are required`);
    add(errors, Array.isArray(lane.ownedPathsExactly) && lane.ownedPathsExactly.length > 0, `${lane.laneId}: owned paths are required`);
    for (const ownedPath of lane.ownedPathsExactly ?? []) {
      validateOwnedPath(ownedPath, errors, lane.laneId);
      if (ownerByPath.has(ownedPath)) errors.push(`owned path overlap: ${ownedPath}`);
      ownerByPath.set(ownedPath, lane.laneId);
    }
    for (const serialPath of lane.serialIntegrationPathsExactly ?? []) validateOwnedPath(serialPath, errors, lane.laneId);
  }
  add(errors, QF_ORDER.every((laneId) => laneById.has(laneId)), "split milestone set drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[0])?.dependencies, [AMENDMENT_ID]), "QF-0 dependency drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[1])?.dependencies, [QF_ORDER[0]]), "QF-S1 dependency drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[2])?.dependencies, [QF_ORDER[0]]), "QF-S2 dependency drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[3])?.dependencies, [QF_ORDER[2]]), "QF-S3 dependency drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[4])?.dependencies, QF_ORDER.slice(0, 4)), "QF-I1 dependency drifted");
  add(errors, laneById.get(QF_ORDER[0])?.everyCandidateState === "QUARANTINED", "QF-0 must quarantine every candidate");
  add(errors, sameArray(laneById.get(QF_ORDER[0])?.requiredCapabilities, QF_REQUIRED_INVARIANTS[QF_ORDER[0]]), "QF-0 capabilities drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[0])?.hardBoundaries, ["no_release_artifact", "no_bank_assignment", "no_learner_runtime", "no_provider_or_network", "no_database"]), "QF-0 hard boundaries drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[1])?.requiredInvariants, QF_REQUIRED_INVARIANTS[QF_ORDER[1]]), "QF-S1 invariants drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[1])?.forbiddenMutations, ["audit", "release_policy"]), "QF-S1 mutation boundary drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[2])?.requiredInvariants, QF_REQUIRED_INVARIANTS[QF_ORDER[2]]), "QF-S2 invariants drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[2])?.forbiddenMutations, ["release", "transfer_aggregate", "owner_adjudication", "similarity"]), "QF-S2 mutation boundary drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[3])?.requiredInvariants, QF_REQUIRED_INVARIANTS[QF_ORDER[3]]), "QF-S3 invariants drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[3])?.forbiddenMutations, ["similarity"]), "QF-S3 mutation boundary drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[4])?.requiredIntegrationProofs, QF_REQUIRED_INVARIANTS[QF_ORDER[4]]), "QF-I1 integration proofs drifted");
  for (const laneId of QF_ORDER.slice(0, 4)) {
    add(errors, sameArray(laneById.get(laneId)?.serialIntegrationPathsExactly ?? [], []), `${laneId}: shared serial integration paths are prohibited`);
  }
  add(errors, sameArray(laneById.get(QF_ORDER[4])?.serialIntegrationPathsExactly, [
    "docs/exec-plans/active/inverge-owner-study-os.md",
    "scripts/run-node-tests.mjs",
  ]), "QF-I1 serial integration paths drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[4])?.finalValidationExactly, QF_I1_FINAL_VALIDATION), "QF-I1 final validation drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[4])?.forbiddenValidation, ["postgresql", "browser_to_database", "migrations", "inherited_durable_runtimes", "remote_supabase", "production"]), "QF-I1 forbidden validation drifted");
  add(errors, sameArray(laneById.get(QF_ORDER[0])?.releaseStatesAvailable, []), "QF-0 must expose no release state");
  add(errors, laneById.get(QF_ORDER[4])?.maximumAiOnlyReleaseState === "PERSONAL_LEARNING_USABLE", "AI-only release ceiling drifted");
  add(errors, laneById.get(QF_ORDER[4])?.measurementCalibratedRequiresActualOwnerResponseEvidence === true, "measurement calibration must require actual Owner response evidence");
  add(errors, campaign?.serialProgramLogIntegration?.ownedBySplitImplementationLanes === false, "parallel split lanes must not own the shared program log");
  add(errors, campaign?.serialProgramLogIntegration?.singleIntegrationCoordinatorOnly === true, "the shared program log requires one serial integration coordinator");
  add(errors, campaign?.serialProgramLogIntegration?.updateOnlyAtValidatedMergeOrFinalGate === true, "the shared program log update cadence drifted");
  add(errors, campaign?.failurePolicy?.maximumCleanReplacementCount === 1 && campaign.failurePolicy.thirdReplacementAllowed === false, "split failure budget drifted");

  for (const [key, value] of Object.entries(contract.activationBoundary ?? {})) {
    if (key === "learningEfficacyClaim" || key === "calibratedExamItemQualityClaim" || key.endsWith("InstalledByThisAmendment") || ["learnerRuntime", "providerOrNetwork", "databaseOrRls", "payment", "publicActivation", "externalLearnerActivation", "remoteSupabaseMutation", "productionMutation"].includes(key)) {
      add(errors, value === false, `activation boundary must remain false: ${key}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateLaneChangedPaths(contract, laneId, changedPaths, { includeSerialIntegrationPaths = false } = {}) {
  const authority = validateAuthority(contract);
  if (!authority.ok) return authority;
  const lane = contract.questionFoundrySplitCampaign.lanes.find((entry) => entry.laneId === laneId);
  if (!lane) return { ok: false, errors: [`unknown lane: ${laneId}`] };
  const allowed = new Set(lane.ownedPathsExactly);
  if (includeSerialIntegrationPaths) {
    for (const value of lane.serialIntegrationPathsExactly ?? []) allowed.add(value);
  }
  const errors = [];
  for (const changedPath of changedPaths) {
    validateOwnedPath(changedPath, errors, laneId);
    if (!allowed.has(changedPath)) errors.push(`${laneId}: undeclared changed path: ${changedPath}`);
  }
  if (new Set(changedPaths).size !== changedPaths.length) errors.push(`${laneId}: duplicate changed path evidence`);
  return { ok: errors.length === 0, errors };
}

export function validateCandidateChangedPaths(contract, changedPaths) {
  const authority = validateAuthority(contract);
  if (!authority.ok) return authority;
  const expected = new Set(contract.candidateLane.ownedPathsExactly);
  const actual = new Set(changedPaths);
  const errors = [];
  if (actual.size !== changedPaths.length) errors.push("candidate changed-path evidence contains duplicates");
  for (const changedPath of changedPaths) {
    validateOwnedPath(changedPath, errors, AMENDMENT_ID);
    if (!expected.has(changedPath)) errors.push(`candidate undeclared changed path: ${changedPath}`);
  }
  for (const expectedPath of expected) if (!actual.has(expectedPath)) errors.push(`candidate manifest path is missing from the diff: ${expectedPath}`);
  return { ok: errors.length === 0, errors };
}

export function evaluateMergeReceiptEvidence(contract, laneId, evidence) {
  const errors = [];
  const authority = validateAuthority(contract);
  errors.push(...authority.errors);
  add(errors, isRecord(evidence), "merge receipt evidence must be an object");
  if (!isRecord(evidence)) return { validated: false, errors };

  const lane = laneId === AMENDMENT_ID
    ? contract.candidateLane
    : contract.questionFoundrySplitCampaign?.lanes?.find((entry) => entry.laneId === laneId);
  add(errors, isRecord(lane), `merge receipt lane is not registered: ${String(laneId)}`);
  if (!isRecord(lane)) return { validated: false, errors };

  add(errors, evidence.state === "MERGED", `${laneId}: receipt pull request is not merged`);
  add(errors, evidence.headRefName === lane.branch, `${laneId}: receipt branch identity drifted`);
  add(errors, evidence.baseRefName === "main", `${laneId}: receipt base must be main`);
  add(errors, evidence.sameRepository === true, `${laneId}: receipt must use the authority repository`);
  add(errors, evidence.mergeCommitOnMain === true, `${laneId}: resulting merge commit is not on protected main`);
  add(errors, SHA_PATTERN.test(evidence.summaryHeadSha ?? "") && evidence.headSha === evidence.summaryHeadSha,
    `${laneId}: receipt head identity drifted`);

  const changedPaths = Array.isArray(evidence.changedPaths) ? evidence.changedPaths : [];
  add(errors, changedPaths.length > 0, `${laneId}: receipt changed paths are missing`);
  const pathValidation = laneId === AMENDMENT_ID
    ? validateCandidateChangedPaths(contract, changedPaths)
    : validateLaneChangedPaths(contract, laneId, changedPaths, { includeSerialIntegrationPaths: true });
  errors.push(...pathValidation.errors.map((message) => `${laneId}: ${message}`));
  add(errors, evidence.worktreeDeclarationCount === 1, `${laneId}: exact worktree declaration must occur once`);

  const mergedAt = Date.parse(evidence.mergedAt ?? "");
  add(errors, Number.isFinite(mergedAt), `${laneId}: merge timestamp is invalid`);
  const checks = isRecord(evidence.checks) ? evidence.checks : {};
  const completedTimes = [];
  for (const checkName of REQUIRED_STABLE_CHECKS) {
    const check = checks[checkName];
    add(errors, check?.headSha === evidence.headSha, `${laneId}: ${checkName} receipt check is missing or stale`);
    add(errors, check?.conclusion === "SUCCESS", `${laneId}: ${checkName} receipt check is not green`);
    const completedAt = Date.parse(check?.completedAt ?? "");
    add(errors, Number.isFinite(completedAt), `${laneId}: ${checkName} receipt completion time is invalid`);
    if (Number.isFinite(completedAt)) completedTimes.push(completedAt);
  }

  const review = evidence.finalReview;
  add(errors, isRecord(review), `${laneId}: exact-head final review is missing`);
  let reviewSubmittedAt = Number.NaN;
  if (isRecord(review)) {
    add(errors, review.headSha === evidence.headSha, `${laneId}: final review head drifted`);
    add(errors, sameArray(review.actionableP0P1P2, [0, 0, 0]), `${laneId}: final review is not actionable 0/0/0`);
    add(errors, review.formal === true && review.trustedReviewer === true, `${laneId}: final review is not trusted and formal`);
    reviewSubmittedAt = Date.parse(review.submittedAt ?? "");
    add(errors, Number.isFinite(reviewSubmittedAt), `${laneId}: final review timestamp is invalid`);
    if (Number.isFinite(reviewSubmittedAt) && completedTimes.length === REQUIRED_STABLE_CHECKS.length) {
      add(errors, reviewSubmittedAt >= Math.max(...completedTimes), `${laneId}: final review predates required checks`);
    }
    if (Number.isFinite(reviewSubmittedAt) && Number.isFinite(mergedAt)) {
      add(errors, reviewSubmittedAt <= mergedAt, `${laneId}: final review occurred after merge`);
    }
  }
  add(errors, evidence.unresolvedNonOutdatedReviewThreads === 0, `${laneId}: unresolved review threads remain`);
  add(errors, evidence.blockingCurrentHeadReviewCount === 0, `${laneId}: current-head changes-requested review remains`);

  if (laneId === AMENDMENT_ID) {
    const approval = evidence.ownerApproval;
    add(errors, isRecord(approval), `${laneId}: exact-head Owner approval is missing`);
    if (isRecord(approval)) {
      const expectedMarker = `${contract.mergePolicy.v2OwnerApprovalReceiptMarkerPrefix}${evidence.headSha}`;
      add(errors, approval.headSha === evidence.headSha, `${laneId}: Owner approval head drifted`);
      add(errors, approval.marker === expectedMarker, `${laneId}: Owner approval marker drifted`);
      add(errors, approval.trustedReviewer === true, `${laneId}: Owner approval is not trusted`);
      const approvalSubmittedAt = Date.parse(approval.submittedAt ?? "");
      add(errors, Number.isFinite(approvalSubmittedAt), `${laneId}: Owner approval timestamp is invalid`);
      if (Number.isFinite(approvalSubmittedAt) && Number.isFinite(reviewSubmittedAt)) {
        add(errors, approvalSubmittedAt >= reviewSubmittedAt, `${laneId}: Owner approval predates final review`);
      }
      if (Number.isFinite(approvalSubmittedAt) && Number.isFinite(mergedAt)) {
        add(errors, approvalSubmittedAt <= mergedAt, `${laneId}: Owner approval occurred after merge`);
      }
    }
  }

  return { validated: errors.length === 0, errors };
}

export function evaluateAutomaticMerge(contract, snapshot) {
  const errors = [];
  const authority = validateAuthority(contract);
  errors.push(...authority.errors);
  add(errors, isRecord(snapshot), "merge snapshot must be an object");
  if (!isRecord(snapshot)) return { eligible: false, errors };

  add(errors, snapshot.state === "OPEN", "pull request must be open");
  add(errors, snapshot.isDraft === true || snapshot.isDraft === false, "Draft state must be explicit");
  add(errors, snapshot.baseRefName === "main", "base branch must be main");
  add(errors, snapshot.sameRepository === true, "automatic merge requires a same-repository branch");
  add(errors, snapshot.registeredLane === true, "automatic merge requires a registered exact lane");
  const lane = contract.questionFoundrySplitCampaign?.lanes?.find((entry) => entry.laneId === snapshot.registeredLaneId);
  add(errors, isRecord(lane), "automatic merge requires an exact registered lane identity");
  add(errors, snapshot.pathOwnershipValid === true, "live changed paths must equal the lane's exact ownership boundary");
  add(errors, snapshot.isolatedWorktreeDeclared === true, "exact isolated-worktree declaration is missing");
  add(errors, SHA_PATTERN.test(snapshot.expectedHeadSha ?? "") && snapshot.headSha === snapshot.expectedHeadSha, "live head must equal the expected head");
  add(errors, ["LOW", "MEDIUM"].includes(snapshot.profile), "HIGH and unknown profiles require Owner approval");
  add(errors, snapshot.classifierHeadSha === snapshot.headSha, "risk classification must bind the live head");
  add(errors, snapshot.semanticSignalEvidenceComplete === true, "semantic HIGH-signal evidence must cover every changed file");
  add(errors, snapshot.changedPathCount > 0, "changed-path evidence is required");

  const laneGate = snapshot.laneGateEvidence;
  add(errors, isRecord(laneGate), "live lane dependency and concurrency evidence is required");
  if (isRecord(lane) && isRecord(laneGate)) {
    const laneIndex = QF_ORDER.indexOf(lane.laneId);
    const requiredReceiptIds = [AMENDMENT_ID, ...QF_ORDER.slice(0, laneIndex)];
    add(errors, laneGate.currentLaneId === lane.laneId, "live lane evidence must bind the current lane");
    add(errors, Number.isInteger(laneGate.currentPullRequestNumber) && laneGate.currentPullRequestNumber > 0,
      "live lane evidence must bind the current pull request");
    add(errors, laneGate.currentPullRequestObservedOnce === true, "current registered lane pull request must be uniquely open");
    add(errors, laneGate.currentLanePriorMergedCount === 0, "current registered lane identity has already produced a merge");
    add(errors, SHA_PATTERN.test(laneGate.currentMainSha ?? ""), "live protected-main identity is required");
    add(errors, sameArray(laneGate.requiredReceiptIds, requiredReceiptIds), "declared merge-order receipt set is stale or incomplete");
    add(errors, sameArray(laneGate.validatedReceiptIds, requiredReceiptIds), "every prior lane must have one validated resulting-main receipt");
    add(errors, sameArray(laneGate.directDependencyIds, lane.dependencies), "direct dependency evidence drifted");
    add(errors, laneGate.directDependenciesSatisfied === true, "live direct dependency receipts are incomplete");
    add(errors, laneGate.declaredMergePrefixSatisfied === true, "declared integration and merge order is not satisfied");
    add(errors, Array.isArray(laneGate.openLaneIds) && new Set(laneGate.openLaneIds).size === laneGate.openLaneIds.length &&
      laneGate.openLaneIds.includes(lane.laneId), "live open-lane evidence is invalid");
    add(errors, laneGate.concurrencyValid === true, "live merge-producing lane cap or parallel-pair boundary is violated");
  }

  const labelNames = Array.isArray(snapshot.labels) ? snapshot.labels.map((value) => String(value).toLowerCase()) : [];
  for (const label of labelNames) if (BLOCKING_LABELS.has(label)) errors.push(`blocking label: ${label}`);

  const checks = isRecord(snapshot.checks) ? snapshot.checks : {};
  for (const checkName of REQUIRED_STABLE_CHECKS) {
    add(errors, checks[checkName]?.headSha === snapshot.headSha, `${checkName}: check is missing or stale`);
    add(errors, checks[checkName]?.conclusion === "SUCCESS", `${checkName}: check is not green`);
  }
  const completedTimes = REQUIRED_STABLE_CHECKS.map((name) => Date.parse(checks[name]?.completedAt ?? ""));
  add(errors, completedTimes.every(Number.isFinite), "stable check completion times are required");

  const review = snapshot.finalReview;
  add(errors, isRecord(review), "one final formal review is required");
  if (isRecord(review)) {
    add(errors, review.headSha === snapshot.headSha, "final review must bind the live head");
    add(errors, sameArray(review.actionableP0P1P2, [0, 0, 0]), "final review must report actionable 0/0/0");
    add(errors, review.formal === true, "final review must be formal");
    add(errors, review.trustedReviewer === true, "final review must come from a trusted reviewer");
    const submittedAt = Date.parse(review.submittedAt ?? "");
    add(errors, Number.isFinite(submittedAt), "final review submittedAt is invalid");
    if (Number.isFinite(submittedAt) && completedTimes.every(Number.isFinite)) {
      add(errors, submittedAt >= Math.max(...completedTimes), "final review must postdate all applicable stable checks");
    }
  }
  add(errors, snapshot.unresolvedNonOutdatedReviewThreads === 0, "unresolved non-outdated review threads must be zero");
  add(errors, snapshot.blockingCurrentHeadReviewCount === 0, "current-head changes-requested reviews must be zero");
  add(errors, snapshot.mergeable === "MERGEABLE", "pull request is not mergeable");
  add(errors,
    snapshot.isDraft ? ["BLOCKED", "CLEAN"].includes(snapshot.mergeStateStatus) : snapshot.mergeStateStatus === "CLEAN",
    "ruleset merge state is not clean for the current Ready state",
  );

  return { eligible: errors.length === 0, errors };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function main() {
  const [command = "validate-authority", inputPath] = process.argv.slice(2);
  const contractPath = process.env.FAST_DELIVERY_V2_CONTRACT ?? "config/dabangil-fast-delivery-parallel-execution-v2.json";
  const contract = loadJson(contractPath);
  let result;
  if (command === "validate-authority") {
    result = validateAuthority(contract);
  } else if (command === "validate-candidate-paths") {
    result = validateCandidateChangedPaths(contract, getChangedFiles());
  } else if (command === "validate-merge-snapshot") {
    if (!inputPath) throw new Error("validate-merge-snapshot requires a JSON input path");
    result = evaluateAutomaticMerge(contract, loadJson(inputPath));
  } else {
    throw new Error(`unknown command: ${command}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!(result.ok ?? result.eligible)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
