import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CONTRACT_PATH = "config/foundation-bounded-terminal-delivery-delegation-v1.json";
const DECISION_PATH = "docs/decisions/2026-08-16-owner-bounded-terminal-delivery-delegation.md";
const EXPECTED_TUPLE = ["WCV-C2", "C2", 717, "C2R-C-P", 703, "authorized_unstarted"];
const REQUIRED_CHECKS = [
  "pr-contract",
  "risk-classifier",
  "runtime-gate",
  "fast-ci",
  "full-ci",
  "full-ci-windows",
  "Learner Loop Health",
  "security-audit-sbom",
  "Vercel",
];
const REQUIRED_LOCAL_VALIDATIONS = [
  "focused_contract_test",
  "typecheck",
  "lint",
  "full_tests",
  "build",
  "diff_check",
];
const REVIEW_EVIDENCE_FIELDS = [
  "review_run_id",
  "review_url",
  "reviewer",
  "reviewer_database_id",
  "cycle_head_sha",
  "remote_head_sha_at_review",
  "reviewed_head_sha",
  "submitted_at",
  "terminal_result",
  "review_counts",
  "remote_check_results",
  "all_required_remote_checks_successful",
  "local_validation_results",
  "all_required_local_validations_successful",
];
const LOCAL_VALIDATION_EVIDENCE_FIELDS = [
  "name",
  "platform",
  "command",
  "head_sha",
  "started_at",
  "exit_code",
  "conclusion",
  "completed_at",
  "execution_evidence_url",
  "execution_evidence_sha256",
];
const CANONICAL_LOCAL_VALIDATION_COMMANDS = {
  windows: {
    focused_contract_test: "node --test tests/foundation-bounded-terminal-delivery-delegation.test.mjs",
    typecheck: "npm.cmd run typecheck",
    lint: "npm.cmd run lint",
    full_tests: "npm.cmd test",
    build: "npm.cmd run build",
    diff_check: "git diff --check origin/main...HEAD",
  },
  posix: {
    focused_contract_test: "node --test tests/foundation-bounded-terminal-delivery-delegation.test.mjs",
    typecheck: "npm run typecheck",
    lint: "npm run lint",
    full_tests: "npm test",
    build: "npm run build",
    diff_check: "git diff --check origin/main...HEAD",
  },
};
const SUPERSEDED_PR_EVIDENCE_FIELDS = [
  "pull_request_number",
  "closed_at",
  "merged",
  "final_head_sha",
  "source_correction_count",
  "source_correction_head_shas",
  "source_correction_parent_chain_valid",
  "exact_head_review_cycle_count",
  "exact_head_review_evidence",
  "actionable_finding_evidence",
];
const ACTIONABLE_FINDING_EVIDENCE_FIELDS = [
  "finding_identity_sha256",
  "severity",
  "root_invariant_id",
  "review_finding_title",
  "path",
  "review_comment_database_id",
  "review_comment_author_login",
  "review_comment_author_database_id",
  "review_comment_body_sha256",
  "review_comment_created_at",
  "review_comment_updated_at",
  "review_url",
  "first_observed_cycle_head_sha",
  "last_observed_cycle_head_sha",
  "status_at_supersession",
];
const REPLACEMENT_FINDING_LINEAGE_FIELDS = [
  "finding_identity_sha256",
  "superseded_review_url",
  "replacement_review_url_or_null",
  "replacement_severity_or_null",
  "same_actionable_finding_verdict",
  "owner_gate_required",
  "owner_authorization_record_url_or_null",
  "owner_authorization_record_database_id_or_null",
  "owner_authorization_record_sha256_or_null",
  "owner_authorization_decision_or_null",
  "owner_authorization_actor_or_null",
  "owner_authorization_record_host_author_login_or_null",
  "owner_authorization_record_host_author_database_id_or_null",
  "owner_authorization_record_host_created_at_or_null",
  "owner_authorized_at_or_null",
];
const VALIDATION_HEAD_REFERENCE_BY_CONTEXT = {
  top_level_receipt: "expected_head_sha",
  review_cycle: "cycle_head_sha",
};
const FINDING_IDENTITY_PREIMAGE_FIELDS = [
  "repository",
  "delivery_issue",
  "root_invariant_id",
  "path",
];
const FINDING_IDENTITY_CANONICALIZATION = {
  version: "finding-identity-rfc8785-jcs-sha256-v1",
  standard: "RFC 8785 JSON Canonicalization Scheme",
  preimage_type: "json_object",
  exact_object_members: FINDING_IDENTITY_PREIMAGE_FIELDS,
  string_normalization_before_canonicalization: "Unicode_NFC_and_no_leading_or_trailing_whitespace",
  member_ordering: "lexicographic_UTF16_code_units_per_RFC8785",
  repository_value: "chachathecat/inverge",
  delivery_issue_value: 736,
  root_invariant_id_pattern: "^[a-f0-9]{64}$",
  path_normalization: "repository_relative_forward_slash_unicode_NFC_no_empty_or_dot_segments",
  path_case_sensitive: true,
  no_additional_object_members: true,
  preimage_bytes: "UTF-8_of_RFC8785_canonicalized_object",
  digest: "SHA-256_lowercase_hex",
};
const ROOT_INVARIANT_DERIVATION = {
  version: "review-finding-title-nfc-sha256-v1",
  source: "independently_resolved_digest_bound_unedited_github_review_comment_body",
  line_endings_before_extraction: "CRLF_and_CR_to_LF",
  title_source_line: "first_non_empty_line",
  title_extraction_regex: "^\\*\\*<sub><sub>!\\[(P[0-2]) Badge\\]\\(https://img\\.shields\\.io/badge/\\1-[^\\r\\n)]*\\)</sub></sub> {2}([^\\r\\n]+)\\*\\*$",
  priority_capture_group: 1,
  priority_capture_group_required: true,
  priority_capture_group_must_equal_severity: true,
  title_capture_group: 2,
  exactly_one_title_capture_required: true,
  title_must_be_non_empty_single_line_plain_text: true,
  unicode_version: "15.1.0",
  normalization: "Unicode_NFC_trim_and_collapse_each_Unicode_15_1_White_Space_property_run_to_U+0020_case_and_punctuation_preserved",
  normalized_title_must_equal_receipt_review_finding_title: true,
  preimage_bytes: "UTF-8_of_normalized_review_finding_title",
  root_invariant_id: "SHA-256_lowercase_hex",
  root_invariant_id_pattern: "^[a-f0-9]{64}$",
};
const CHECK_EVIDENCE_FIELDS = [
  "name",
  "github_evidence_kind",
  "github_evidence_database_id",
  "github_evidence_api_url",
  "head_sha",
  "conclusion",
  "details_url",
  "completed_at",
];
const GITHUB_CHECK_EVIDENCE_KINDS = ["check_run", "commit_status"];
const RESOLVED_CHECK_FIELD_MAPPING = {
  check_run: {
    name: "name",
    head_sha: "head_sha",
    conclusion: "conclusion",
    details_url: "details_url",
    completed_at: "completed_at",
  },
  commit_status: {
    name: "context",
    head_sha: "resolved_commit_sha",
    conclusion: "state",
    details_url: "target_url",
    completed_at: "updated_at",
  },
};
const DELIVERY_SEQUENCE = [
  "refresh_live_main_github_authority_dependencies_and_writer_state",
  "select_one_dependency_ready_non_production_stage",
  "acquire_single_merge_producing_writer_slot",
  "create_feature_branch_and_complete_focused_candidate",
  "run_exhaustive_same_root_audit_and_batch_findings_before_review",
  "commit_intentionally_after_same_root_audit",
  "run_scoped_local_and_repository_baseline_validation_on_exact_committed_head",
  "push_by_ordinary_non_force_update",
  "create_or_synchronize_pull_request_body_to_pushed_head",
  "run_and_require_all_fresh_remote_checks_successful_on_exact_head",
  "request_fresh_hostile_review_on_exact_head",
  "apply_one_batched_source_correction_when_actionable_and_cycle_remains",
  "rerun_local_remote_and_fresh_exact_head_review_after_each_correction",
  "reply_and_resolve_threads_only_after_verified_correction",
  "after_three_exact_head_review_cycles_close_unmerged_and_open_one_clean_replacement",
  "continue_clean_replacement_until_zero_actionable_findings_same_p0_p1_owner_gate_or_new_focused_replan",
  "require_zero_actionable_p0_p1_p2_and_all_threads_resolved",
  "refetch_base_head_ruleset_and_writer_state_before_merge",
  "squash_merge_with_reviewed_head_as_expected_head",
  "validate_merge_receipt_and_synchronize_issue_roadmap_current_stage",
  "release_writer_and_start_next_dependency_ready_non_production_stage",
];
const PULL_REQUEST_RULE_PARAMETERS = {
  allowed_merge_methods: ["squash"],
  required_approving_review_count: 0,
  required_review_thread_resolution: true,
  dismiss_stale_reviews_on_push: false,
  require_code_owner_review: false,
  require_last_push_approval: false,
  required_reviewers: [],
};
const RULESET_CONDITIONS = {
  ref_name: {
    include: ["~DEFAULT_BRANCH"],
    exclude: [],
  },
};

const TOP_LEVEL_KEYS = [
  "$schema",
  "contract_id",
  "version",
  "dated",
  "repository",
  "delivery_issue",
  "decision_path",
  "authority",
  "predecessor_receipts",
  "writer_policy",
  "delivery_sequence",
  "correction_policy",
  "review_policy",
  "merge_policy",
  "receipt_schema",
  "synchronization_policy",
  "delegated_start",
  "owner_gates",
  "preserved_boundaries",
  "prohibited_operations",
];

const OWNER_GATES = [
  "production_migration_rls_or_storage_apply",
  "production_secret_or_environment_mutation",
  "actual_charge_price_refund_or_checkout_activation",
  "real_learner_or_instructor_invitation",
  "rights_unclear_content_or_unresolved_privacy_legal_authority",
  "public_release_or_domain_promotion",
  "destructive_or_irreversible_data_operation",
  "material_product_scope_change",
  "same_actionable_p0_or_p1_persists_after_one_clean_replacement_pr",
];

const RECEIPT_FIELDS = [
  "repository",
  "issue_number",
  "pull_request_number",
  "base_sha",
  "expected_head_sha",
  "initial_reviewed_head_sha",
  "reviewed_head_sha",
  "remote_head_sha",
  "active_merge_producing_writer_count",
  "writer_slot_identity",
  "replacement_pr_count",
  "superseded_pr_numbers",
  "superseded_pr_evidence",
  "replacement_finding_lineage",
  "replacement_policy_compliant",
  "source_correction_count",
  "source_correction_head_shas",
  "source_correction_parent_chain_valid",
  "source_correction_budget_compliant",
  "exact_head_review_cycle_count",
  "exact_head_review_evidence",
  "all_required_exact_head_reviews_terminal",
  "review_cycle_budget_compliant",
  "merge_sha",
  "merge_parent_sha",
  "candidate_tree_sha",
  "merge_tree_sha",
  "merge_method",
  "merge_completed_at",
  "exact_head_checks",
  "all_required_exact_head_checks_successful",
  "local_validation_results",
  "all_required_local_validations_successful",
  "review_counts",
  "all_threads_resolved",
  "ruleset_database_id",
  "ruleset_api_url",
  "ruleset_record_sha256",
  "ruleset_record_updated_at",
  "ruleset_record_response_date",
  "ruleset_record_response_etag",
  "ruleset_record_response_request_id",
  "ruleset_effective_rules_api_url",
  "ruleset_effective_rules_sha256",
  "ruleset_effective_rules_response_date",
  "ruleset_effective_rules_response_etag",
  "ruleset_effective_rules_response_request_id",
  "ruleset_observed_at",
  "ruleset_name",
  "ruleset_enforcement",
  "ruleset_bypass_actor_count",
  "ruleset_rule_types",
  "ruleset_pull_request_parameters",
  "issue_association_kind",
  "issue_closure_authorized_for_stage",
  "issue_state_after_merge",
  "roadmap_state_after_merge",
  "next_authorized_stage_tuple",
  "validated_at",
];

async function readContract() {
  return JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
}

function exactMembers(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label} must be an array`);
  assert.equal(actual.length, expected.length, `${label} length drifted`);
  assert.equal(new Set(actual).size, actual.length, `${label} contains duplicates`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} members drifted`);
}

function validateClosedContract(contract) {
  exactMembers(Object.keys(contract), TOP_LEVEL_KEYS, "top-level contract keys");
  assert.equal(contract.contract_id, "foundation-bounded-terminal-delivery-delegation-v1");
  assert.equal(contract.version, 1);
  assert.equal(contract.repository, "chachathecat/inverge");
  assert.equal(contract.delivery_issue, 736);
  assert.equal(contract.decision_path, DECISION_PATH);
  assert.deepEqual(contract.authority.effective_only_after, [
    "expected_head_pinned_squash_merge",
    "validated_delegation_receipt",
  ]);
  assert.equal(contract.authority.scope, "repository_delivery_control_plane_only");
  assert.equal(contract.authority.product_authority_tuple_changed, false);
  assert.equal(contract.authority.general_automatic_start_flags_mutated, false);
  assert.equal(contract.authority.production_authority, "none");
  assert.deepEqual(contract.delivery_sequence, DELIVERY_SEQUENCE);
  assert.equal(contract.writer_policy.global_merge_producing_writer_limit, 1);
  assert.equal(contract.writer_policy.maximum_clean_replacement_prs_per_delivery, 1);
  assert.equal(contract.writer_policy.automatic_ci_and_review_repair_required, true);
  assert.equal(contract.writer_policy.automatic_expected_head_pinned_squash_merge_after_gates, true);
  assert.equal(contract.correction_policy.maximum_source_corrections_per_pr, 2);
  assert.equal(contract.correction_policy.maximum_exact_head_review_cycles_per_pr, 3);
  assert.equal(contract.correction_policy.maximum_clean_replacement_prs_per_delivery, 1);
  assert.equal(contract.correction_policy.automatic_replacement_when_focused_pr_exhausts_safe_scope, true);
  assert.equal(contract.correction_policy.correction_budget_exhaustion_requires_owner, false);
  assert.equal(
    contract.correction_policy.same_actionable_p0_or_p1_surviving_clean_replacement_requires_owner,
    true,
  );
  assert.deepEqual(contract.review_policy.required_premerge_counts, { P0: 0, P1: 0, P2: 0 });
  exactMembers(contract.owner_gates, OWNER_GATES, "Owner gates");
  exactMembers(contract.receipt_schema.required_fields, RECEIPT_FIELDS, "receipt fields");
  const replacement = contract.receipt_schema.replacement_binding;
  assert.equal(replacement.maximum_clean_replacement_prs, 1);
  exactMembers(
    replacement.required_per_superseded_pr_evidence_fields,
    SUPERSEDED_PR_EVIDENCE_FIELDS,
    "superseded PR evidence fields",
  );
  exactMembers(
    replacement.required_per_actionable_finding_fields,
    ACTIONABLE_FINDING_EVIDENCE_FIELDS,
    "actionable finding evidence fields",
  );
  exactMembers(
    replacement.required_per_replacement_finding_lineage_fields,
    REPLACEMENT_FINDING_LINEAGE_FIELDS,
    "replacement finding lineage fields",
  );
  exactMembers(
    replacement.finding_identity_preimage_fields,
    FINDING_IDENTITY_PREIMAGE_FIELDS,
    "finding identity preimage fields",
  );
  assert.deepEqual(replacement.finding_identity_canonicalization, FINDING_IDENTITY_CANONICALIZATION);
  assert.equal(replacement.each_superseded_pr_review_cycle_count_must_equal_maximum, true);
  assert.equal(
    replacement.each_superseded_pr_review_evidence_must_satisfy_per_cycle_exact_head_and_validation_bindings,
    true,
  );
  assert.equal(replacement.finding_identity_must_be_lowercase_sha256_of_canonical_preimage, true);
  assert.equal(
    replacement.finding_identity_preimage_must_be_recomputed_from_receipt_and_review_metadata,
    true,
  );
  assert.equal(replacement.finding_review_path_must_equal_normalized_canonical_preimage_path, true);
  assert.equal(replacement.every_superseded_actionable_finding_must_have_exactly_one_lineage_entry, true);
  assert.equal(replacement.same_actionable_p0_or_p1_requires_owner_gate_true, true);
  assert.equal(replacement.same_actionable_p0_or_p1_requires_non_null_owner_authorization_record_fields, true);
  assert.equal(replacement.every_replacement_actionable_finding_must_be_compared_against_all_superseded_finding_identities, true);
  assert.equal(replacement.matching_p0_or_p1_finding_identity_requires_same_finding_verdict_true, true);
  assert.equal(replacement.owner_authorization_record_url_must_be_independently_resolvable, true);
  assert.equal(replacement.owner_authorization_record_sha256_must_hash_exact_resolved_record, true);
  assert.equal(replacement.owner_authorization_decision_must_equal, "authorized");
  assert.equal(replacement.owner_authorization_actor_must_equal, "chachathecat");
  assert.equal(replacement.missing_or_invalid_owner_authorization_blocks_receipt, true);
  assert.equal(contract.receipt_schema.writer_binding.required_active_merge_producing_writer_count, 1);
  assert.equal(contract.receipt_schema.review_evidence_binding.maximum_exact_head_review_cycles_per_pr, 3);
  exactMembers(
    contract.receipt_schema.review_evidence_binding.required_per_cycle_fields,
    REVIEW_EVIDENCE_FIELDS,
    "review evidence fields",
  );
  assert.equal(
    contract.receipt_schema.review_evidence_binding.each_cycle_all_required_remote_checks_successful_must_be_true,
    true,
  );
  assert.equal(contract.receipt_schema.review_evidence_binding.each_cycle_remote_check_binding_context, "review_cycle");
  assert.equal(
    contract.receipt_schema.review_evidence_binding.each_cycle_all_required_local_validations_successful_must_be_true,
    true,
  );
  assert.equal(contract.receipt_schema.review_evidence_binding.each_cycle_local_validation_binding_context, "review_cycle");
  assert.deepEqual(
    contract.receipt_schema.exact_head_checks_binding.head_reference_by_context,
    VALIDATION_HEAD_REFERENCE_BY_CONTEXT,
  );
  assert.equal(contract.receipt_schema.exact_head_checks_binding.check_head_must_equal_resolved_context_head, true);
  exactMembers(
    contract.receipt_schema.local_validation_binding.required_names,
    REQUIRED_LOCAL_VALIDATIONS,
    "local validation names",
  );
  exactMembers(
    contract.receipt_schema.local_validation_binding.required_per_validation_fields,
    LOCAL_VALIDATION_EVIDENCE_FIELDS,
    "local validation evidence fields",
  );
  assert.deepEqual(
    contract.receipt_schema.local_validation_binding.canonical_commands_by_platform,
    CANONICAL_LOCAL_VALIDATION_COMMANDS,
  );
  assert.equal(
    contract.receipt_schema.local_validation_binding.command_must_exactly_equal_canonical_command_for_name_and_platform,
    true,
  );
  assert.equal(contract.receipt_schema.local_validation_binding.exit_code_must_equal, 0);
  assert.deepEqual(
    contract.receipt_schema.local_validation_binding.head_reference_by_context,
    VALIDATION_HEAD_REFERENCE_BY_CONTEXT,
  );
  assert.equal(contract.receipt_schema.local_validation_binding.validation_head_must_equal_resolved_context_head, true);
  assert.equal(
    contract.receipt_schema.local_validation_binding.execution_evidence_url_must_be_independently_resolvable,
    true,
  );
  assert.equal(
    contract.receipt_schema.local_validation_binding.execution_evidence_sha256_must_hash_exact_resolved_evidence_content,
    true,
  );
  assert.equal(contract.receipt_schema.ruleset_binding.required_name, "main-pr-only");
  assert.equal(contract.receipt_schema.ruleset_binding.required_enforcement, "active");
  assert.equal(contract.receipt_schema.ruleset_binding.required_bypass_actor_count, 0);
  assert.equal(contract.receipt_schema.merge_binding.required_method, "squash");
  exactMembers(
    contract.receipt_schema.issue_association_binding.allowed_kinds,
    ["closing", "non_closing"],
    "issue association kinds",
  );
  assert.equal(contract.receipt_schema.synchronization_binding.writer_slot_release_requires_complete_valid_receipt, true);
  assert.equal(contract.synchronization_policy.exactly_one_issue_association_required, true);
  assert.equal(
    contract.synchronization_policy.closing_reference_required_only_when_live_stage_authority_allows_issue_closure,
    true,
  );
  return true;
}

test("installs one closed dated Owner delegation decision and machine contract", async () => {
  const contract = await readContract();
  assert.equal(validateClosedContract(contract), true);
  const decision = await readFile(DECISION_PATH, "utf8");
  assert.match(decision, /decision_id: "owner_bounded_terminal_delivery_delegation_2026_08_16"/);
  assert.match(decision, /expected_head_pinned_squash_merge_and_validated_736_receipt/);
  assert.match(decision, /config\/foundation-bounded-terminal-delivery-delegation-v1\.json/);
});

test("binds the exact contiguous four-outcome foundation receipt chain", async () => {
  const { predecessor_receipts: receipts } = await readContract();
  assert.deepEqual(
    receipts.map(({ outcome, issue, pull_request, merge_sha }) => [outcome, issue, pull_request, merge_sha]),
    [
      ["windows_linux_baseline_parity", 728, 729, "a8fd49ba2a31ea88b50a45e4ac218903f3ab0409"],
      ["production_dependency_security", 730, 731, "d3e48a8d2ad956d48faabad2c112e95a9ab1150b"],
      ["development_toolchain_security", 732, 733, "54827475893a4884de9a9192f11b38bcba33f429"],
      ["continuous_security_automation", 734, 735, "82cfbf73dbe7b94120c551f6e5459c41f96ee831"],
    ],
  );
  for (let index = 1; index < receipts.length; index += 1) {
    assert.equal(receipts[index].base_sha, receipts[index - 1].merge_sha);
  }
  for (const receipt of receipts) {
    assert.match(receipt.base_sha, /^[0-9a-f]{40}$/);
    assert.match(receipt.candidate_sha, /^[0-9a-f]{40}$/);
    assert.match(receipt.merge_sha, /^[0-9a-f]{40}$/);
  }
});

test("allows exactly one protected merge-producing writer and no history rewrite", async () => {
  const { writer_policy: writer, merge_policy: merge } = await readContract();
  assert.equal(writer.global_merge_producing_writer_limit, 1);
  assert.equal(writer.feature_branch_required, true);
  assert.equal(writer.pull_request_required, true);
  assert.equal(writer.ordinary_non_force_push_only, true);
  assert.equal(writer.superseded_pr_must_close_unmerged_before_replacement, true);
  assert.equal(writer.maximum_clean_replacement_prs_per_delivery, 1);
  assert.equal(writer.automatic_ci_and_review_repair_required, true);
  assert.equal(writer.automatic_expected_head_pinned_squash_merge_after_gates, true);
  for (const key of [
    "direct_main_push_allowed",
    "force_push_allowed",
    "amend_allowed",
    "rebase_allowed",
    "reset_allowed",
    "history_rewrite_allowed",
    "auto_merge_allowed",
    "ruleset_bypass_allowed",
  ]) {
    assert.equal(writer[key], false, key);
  }
  assert.equal(merge.method, "squash");
  assert.equal(merge.main_ruleset_name, "main-pr-only");
  assert.equal(merge.main_ruleset_enforcement, "active");
  assert.deepEqual(merge.main_ruleset_bypass_actors, []);
  exactMembers(merge.required_rules, ["pull_request", "non_fast_forward", "deletion"], "ruleset rules");
  assert.deepEqual(merge.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
  exactMembers(merge.required_exact_head_checks, REQUIRED_CHECKS, "required exact-head checks");
  assert.equal(merge.all_required_exact_head_checks_must_succeed, true);
});

test("freezes the ordered exact-head delivery, correction and thread cycle", async () => {
  const contract = await readContract();
  assert.deepEqual(contract.delivery_sequence, DELIVERY_SEQUENCE);
  assert.equal(contract.correction_policy.maximum_source_corrections_per_pr, 2);
  assert.equal(contract.correction_policy.maximum_exact_head_review_cycles_per_pr, 3);
  assert.equal(contract.correction_policy.maximum_clean_replacement_prs_per_delivery, 1);
  assert.equal(contract.correction_policy.automatic_replacement_when_focused_pr_exhausts_safe_scope, true);
  assert.equal(contract.correction_policy.pr_body_metadata_only_correction_counts_as_source_correction, false);
  assert.equal(contract.correction_policy.correction_budget_exhaustion_requires_owner, false);
  assert.equal(
    contract.correction_policy.correction_budget_exhaustion_action,
    "automatic_clean_replacement_or_safe_replan",
  );
  assert.equal(
    contract.correction_policy.same_actionable_p0_or_p1_surviving_clean_replacement_requires_owner,
    true,
  );
  assert.equal(
    contract.correction_policy.new_or_distinct_findings_after_replacement_require_autonomous_repair_or_replan,
    true,
  );
  assert.equal(
    contract.correction_policy.replacement_cycle_exhaustion_with_new_or_distinct_findings_action,
    "automatic_campaign_replan_into_new_focused_delivery",
  );
  assert.equal(contract.correction_policy.unresolved_p2_blocks_merge, true);
  assert.equal(contract.correction_policy.test_weakening_or_deletion_allowed, false);
  assert.deepEqual(contract.review_policy.actionable_severities, ["P0", "P1", "P2"]);
  assert.deepEqual(contract.review_policy.required_premerge_counts, { P0: 0, P1: 0, P2: 0 });
  assert.equal(contract.review_policy.prior_head_review_reusable_after_source_change, false);
  assert.equal(contract.review_policy.exhaustive_same_root_audit_before_each_review, true);
  assert.equal(contract.review_policy.same_root_findings_batched_per_cycle, true);
  assert.equal(contract.review_policy.thread_reply_only_after_verified_correction, true);
  assert.equal(contract.review_policy.thread_resolution_only_after_verified_correction, true);
});

test("requires expected-head squash tree equality and a closed metadata-only receipt", async () => {
  const { merge_policy: merge, receipt_schema: receipt } = await readContract();
  for (const key of [
    "expected_head_required",
    "expected_head_must_equal_reviewed_head",
    "merge_parent_must_equal_refetched_base",
    "merge_tree_must_equal_candidate_tree",
    "rollback_through_protected_follow_up_pr",
  ]) {
    assert.equal(merge[key], true, key);
  }
  exactMembers(receipt.required_fields, RECEIPT_FIELDS, "receipt fields");
  assert.deepEqual(receipt.source_correction_binding, {
    maximum_source_corrections: 2,
    count_must_equal_correction_head_count: true,
    correction_head_shas_must_be_unique_exact_40_hex: true,
    each_correction_head_parent_must_equal_previous_reviewed_or_correction_head: true,
    final_reviewed_head_must_equal_last_correction_head_when_count_positive: true,
    final_reviewed_head_must_equal_initial_reviewed_head_when_count_zero: true,
    budget_compliance_verdict_must_be_true: true,
  });
  const replacement = receipt.replacement_binding;
  assert.equal(replacement.maximum_clean_replacement_prs, 1);
  assert.equal(replacement.count_must_equal_superseded_pr_number_count, true);
  assert.equal(replacement.superseded_pr_numbers_must_be_unique_positive_integers, true);
  assert.equal(replacement.superseded_prs_must_be_closed_unmerged_before_replacement, true);
  exactMembers(
    replacement.required_per_superseded_pr_evidence_fields,
    SUPERSEDED_PR_EVIDENCE_FIELDS,
    "superseded PR evidence fields",
  );
  assert.equal(replacement.superseded_pr_evidence_count_must_equal_replacement_pr_count, true);
  assert.equal(replacement.superseded_pr_numbers_must_equal_evidence_pr_numbers, true);
  assert.equal(replacement.each_superseded_pr_must_be_closed_and_merged_false, true);
  assert.equal(replacement.each_superseded_pr_review_cycle_count_must_equal_evidence_count, true);
  assert.equal(replacement.each_superseded_pr_review_cycle_count_must_equal_maximum, true);
  assert.equal(
    replacement.each_superseded_pr_review_evidence_must_satisfy_per_cycle_exact_head_and_validation_bindings,
    true,
  );
  assert.equal(replacement.each_superseded_pr_source_correction_chain_must_satisfy_source_correction_binding, true);
  exactMembers(
    replacement.required_per_actionable_finding_fields,
    ACTIONABLE_FINDING_EVIDENCE_FIELDS,
    "actionable finding evidence fields",
  );
  exactMembers(
    replacement.finding_identity_preimage_fields,
    FINDING_IDENTITY_PREIMAGE_FIELDS,
    "finding identity preimage fields",
  );
  assert.deepEqual(replacement.finding_identity_canonicalization, FINDING_IDENTITY_CANONICALIZATION);
  assert.deepEqual(replacement.root_invariant_derivation, ROOT_INVARIANT_DERIVATION);
  assert.equal(replacement.finding_identity_must_be_lowercase_sha256_of_canonical_preimage, true);
  assert.equal(replacement.finding_identity_preimage_must_be_recomputed_from_receipt_and_review_metadata, true);
  assert.equal(replacement.root_invariant_id_must_be_recomputed_from_resolved_review_comment_title, true);
  exactMembers(replacement.severity_must_be_one_of, ["P0", "P1", "P2"], "actionable severity values");
  assert.equal(replacement.severity_must_equal_mandatory_resolved_review_priority_capture, true);
  assert.equal(replacement.badge_less_or_unstructured_actionable_review_comment_blocks_receipt, true);
  assert.equal(replacement.receipt_writer_supplied_root_invariant_id_without_exact_derivation_is_invalid, true);
  assert.equal(replacement.review_comment_database_id_and_url_must_equal_resolved_github_comment, true);
  assert.equal(replacement.review_comment_author_login_and_database_id_must_equal_resolved_github_comment_author, true);
  assert.equal(
    replacement.review_comment_body_sha256_preimage,
    "UTF-8_of_exact_resolved_comment_body_after_CRLF_and_CR_to_LF",
  );
  assert.equal(replacement.review_comment_body_sha256_must_be_lowercase_64_hex, true);
  assert.equal(replacement.review_comment_body_sha256_must_hash_exact_resolved_comment_body, true);
  assert.equal(replacement.review_comment_created_and_updated_at_must_equal_resolved_github_comment, true);
  assert.equal(replacement.review_comment_created_at_must_equal_updated_at, true);
  assert.equal(replacement.finding_review_path_must_equal_normalized_canonical_preimage_path, true);
  assert.equal(replacement.finding_review_comment_and_url_must_resolve_to_superseded_pr, true);
  assert.equal(replacement.every_actionable_finding_at_supersession_must_be_represented_exactly_once, true);
  exactMembers(
    replacement.required_per_replacement_finding_lineage_fields,
    REPLACEMENT_FINDING_LINEAGE_FIELDS,
    "replacement finding lineage fields",
  );
  assert.equal(replacement.every_superseded_actionable_finding_must_have_exactly_one_lineage_entry, true);
  assert.equal(replacement.lineage_finding_identity_must_equal_superseded_finding_identity, true);
  assert.equal(
    replacement.same_finding_verdict_requires_matching_identity_and_independently_verifiable_review_urls,
    true,
  );
  assert.equal(replacement.same_actionable_p0_or_p1_requires_owner_gate_true, true);
  assert.equal(replacement.same_actionable_p0_or_p1_requires_non_null_owner_authorization_record_fields, true);
  assert.equal(replacement.every_replacement_actionable_finding_must_be_compared_against_all_superseded_finding_identities, true);
  assert.equal(replacement.matching_p0_or_p1_finding_identity_requires_same_finding_verdict_true, true);
  assert.equal(replacement.owner_authorization_record_url_must_be_independently_resolvable, true);
  assert.equal(
    replacement.owner_authorization_record_url_must_resolve_to_github_record_in_repository,
    "chachathecat/inverge",
  );
  assert.equal(replacement.owner_authorization_record_database_id_must_equal_resolved_github_record, true);
  assert.equal(
    replacement.owner_authorization_record_sha256_preimage,
    "UTF-8_of_exact_resolved_record_body_after_CRLF_and_CR_to_LF",
  );
  assert.equal(replacement.owner_authorization_record_sha256_must_hash_exact_resolved_record, true);
  assert.equal(replacement.owner_authorization_decision_must_equal, "authorized");
  assert.equal(replacement.owner_authorization_actor_must_equal, "chachathecat");
  assert.equal(replacement.owner_authorization_record_host_author_login_must_be_resolved_from_github_record, true);
  assert.equal(replacement.owner_authorization_record_host_author_login_must_equal, "chachathecat");
  assert.equal(replacement.owner_authorization_record_host_author_database_id_must_be_resolved_from_github_record, true);
  assert.equal(replacement.owner_authorization_record_host_author_database_id_must_equal, 128282020);
  assert.equal(replacement.owner_authorization_actor_must_equal_resolved_host_author_login, true);
  assert.equal(replacement.owner_authorization_record_host_created_at_must_equal_resolved_github_record_created_at, true);
  assert.equal(replacement.owner_authorized_at_must_equal_resolved_host_created_at, true);
  assert.equal(
    replacement.owner_authorization_record_must_bind_repository_replacement_pr_finding_identity_and_review_url,
    true,
  );
  assert.equal(replacement.owner_authorization_must_postdate_replacement_finding, true);
  assert.equal(replacement.missing_or_invalid_owner_authorization_blocks_receipt, true);
  assert.equal(replacement.non_triggered_owner_gate_requires_authorization_fields_null, true);
  assert.equal(replacement.absent_or_distinct_replacement_finding_requires_same_finding_verdict_false, true);
  assert.equal(replacement.replacement_policy_compliance_verdict_must_be_true, true);
  assert.equal(replacement.correction_budget_exhaustion_alone_may_require_owner, false);
  assert.equal(replacement.same_actionable_p0_or_p1_must_survive_clean_replacement_for_owner_gate, true);
  assert.deepEqual(receipt.writer_binding, {
    required_active_merge_producing_writer_count: 1,
    writer_slot_identity_must_bind_repository_branch_and_pull_request: true,
    superseded_pr_writer_slot_must_be_released_before_replacement: true,
  });
  assert.equal(receipt.review_evidence_binding.maximum_exact_head_review_cycles_per_pr, 3);
  exactMembers(
    receipt.review_evidence_binding.required_per_cycle_fields,
    REVIEW_EVIDENCE_FIELDS,
    "review evidence fields",
  );
  assert.equal(receipt.review_evidence_binding.review_run_ids_and_urls_must_be_unique, true);
  assert.equal(receipt.review_evidence_binding.required_reviewer_login, "chatgpt-codex-connector[bot]");
  assert.equal(receipt.review_evidence_binding.required_reviewer_database_id, 199175422);
  assert.equal(receipt.review_evidence_binding.review_run_url_must_resolve_reviewer_login_and_database_id, true);
  assert.equal(receipt.review_evidence_binding.every_actionable_review_comment_author_must_equal_cycle_reviewer, true);
  assert.equal(receipt.review_evidence_binding.cycle_count_must_equal_review_evidence_count, true);
  assert.equal(receipt.review_evidence_binding.cycle_count_must_equal_source_correction_count_plus_one, true);
  assert.equal(receipt.review_evidence_binding.cycle_head_must_equal_remote_head_at_review, true);
  assert.equal(receipt.review_evidence_binding.reviewed_head_sha_must_equal_cycle_head, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_remote_check_results_must_satisfy_exact_head_checks_binding, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_remote_check_binding_context, "review_cycle");
  assert.equal(receipt.review_evidence_binding.each_cycle_remote_check_head_must_equal_cycle_head, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_all_required_remote_checks_successful_must_be_true, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_local_validation_results_must_satisfy_local_validation_binding, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_local_validation_binding_context, "review_cycle");
  assert.equal(receipt.review_evidence_binding.each_cycle_local_validation_head_must_equal_cycle_head, true);
  assert.equal(receipt.review_evidence_binding.each_cycle_all_required_local_validations_successful_must_be_true, true);
  assert.equal(receipt.review_evidence_binding.final_reviewed_head_must_equal_expected_head, true);
  assert.equal(receipt.review_evidence_binding.final_terminal_result, "clean");
  assert.deepEqual(receipt.review_evidence_binding.final_required_actionable_counts, { P0: 0, P1: 0, P2: 0 });
  assert.equal(receipt.review_evidence_binding.all_required_reviews_terminal_verdict_must_be_true, true);
  assert.equal(receipt.review_evidence_binding.review_cycle_budget_compliance_verdict_must_be_true, true);
  assert.equal(receipt.review_evidence_binding.independently_verifiable_github_reference_required, true);
  exactMembers(receipt.exact_head_checks_binding.required_names, REQUIRED_CHECKS, "receipt check names");
  assert.equal(receipt.exact_head_checks_binding.required_conclusion, "success");
  exactMembers(
    receipt.exact_head_checks_binding.required_per_check_fields,
    CHECK_EVIDENCE_FIELDS,
    "check evidence fields",
  );
  exactMembers(
    receipt.exact_head_checks_binding.github_evidence_kinds,
    GITHUB_CHECK_EVIDENCE_KINDS,
    "GitHub check evidence kinds",
  );
  assert.deepEqual(receipt.exact_head_checks_binding.resolved_field_mapping_by_kind, RESOLVED_CHECK_FIELD_MAPPING);
  assert.deepEqual(receipt.exact_head_checks_binding.head_reference_by_context, VALIDATION_HEAD_REFERENCE_BY_CONTEXT);
  assert.equal(receipt.exact_head_checks_binding.top_level_binding_context, "top_level_receipt");
  assert.equal(receipt.exact_head_checks_binding.check_head_must_equal_resolved_context_head, true);
  assert.equal(receipt.exact_head_checks_binding.each_required_name_must_appear_exactly_once, true);
  assert.equal(receipt.exact_head_checks_binding.github_evidence_api_url_must_be_independently_resolvable, true);
  assert.equal(receipt.exact_head_checks_binding.github_evidence_api_url_must_target_same_repository, true);
  assert.equal(receipt.exact_head_checks_binding.github_evidence_database_id_must_be_positive_integer, true);
  assert.equal(receipt.exact_head_checks_binding.github_evidence_database_id_must_equal_resolved_object, true);
  assert.equal(
    receipt.exact_head_checks_binding.github_evidence_api_url_must_equal_resolved_object_url_or_exact_head_status_collection_url,
    true,
  );
  assert.equal(receipt.exact_head_checks_binding.github_evidence_kind_must_match_resolved_object, true);
  assert.equal(
    receipt.exact_head_checks_binding.resolved_evidence_must_bind_name_head_conclusion_details_url_and_completed_at,
    true,
  );
  assert.equal(receipt.exact_head_checks_binding.commit_status_must_resolve_from_exact_head_commit_status_collection, true);
  assert.equal(receipt.exact_head_checks_binding.fabricated_unresolved_or_mismatched_check_evidence_blocks, true);
  assert.equal(receipt.exact_head_checks_binding.missing_pending_skipped_cancelled_or_unsuccessful_blocks, true);
  exactMembers(
    receipt.local_validation_binding.required_names,
    REQUIRED_LOCAL_VALIDATIONS,
    "local validation names",
  );
  exactMembers(
    receipt.local_validation_binding.required_per_validation_fields,
    LOCAL_VALIDATION_EVIDENCE_FIELDS,
    "local validation evidence fields",
  );
  assert.deepEqual(
    receipt.local_validation_binding.canonical_commands_by_platform,
    CANONICAL_LOCAL_VALIDATION_COMMANDS,
  );
  assert.equal(receipt.local_validation_binding.platform_must_be_windows_or_posix, true);
  assert.equal(
    receipt.local_validation_binding.command_must_exactly_equal_canonical_command_for_name_and_platform,
    true,
  );
  assert.equal(receipt.local_validation_binding.exit_code_must_equal, 0);
  assert.equal(receipt.local_validation_binding.execution_evidence_url_must_be_independently_resolvable, true);
  assert.equal(receipt.local_validation_binding.execution_evidence_sha256_must_be_exact_lowercase_64_hex, true);
  assert.equal(
    receipt.local_validation_binding.execution_evidence_url_content_must_bind_name_platform_command_head_start_completion_exit_and_conclusion,
    true,
  );
  assert.equal(receipt.local_validation_binding.execution_evidence_sha256_must_hash_exact_resolved_evidence_content, true);
  assert.equal(receipt.local_validation_binding.required_conclusion, "success");
  assert.deepEqual(receipt.local_validation_binding.head_reference_by_context, VALIDATION_HEAD_REFERENCE_BY_CONTEXT);
  assert.equal(receipt.local_validation_binding.top_level_binding_context, "top_level_receipt");
  assert.equal(receipt.local_validation_binding.validation_head_must_equal_resolved_context_head, true);
  assert.equal(receipt.local_validation_binding.missing_or_unsuccessful_blocks, true);
  assert.equal(receipt.local_validation_binding.all_successful_verdict_must_be_true, true);
  const ruleset = receipt.ruleset_binding;
  assert.equal(ruleset.required_database_id, 20903914);
  assert.equal(ruleset.required_api_url, "https://api.github.com/repos/chachathecat/inverge/rulesets/20903914");
  assert.equal(ruleset.required_effective_rules_api_url, "https://api.github.com/repos/chachathecat/inverge/rules/branches/main");
  assert.equal(ruleset.required_target, "branch");
  assert.equal(ruleset.required_name, "main-pr-only");
  assert.equal(ruleset.required_enforcement, "active");
  assert.equal(ruleset.required_bypass_actor_count, 0);
  exactMembers(ruleset.required_bypass_actors, [], "receipt ruleset bypass actors");
  assert.deepEqual(ruleset.required_conditions, RULESET_CONDITIONS);
  exactMembers(ruleset.required_rule_types, merge.required_rules, "receipt ruleset types");
  assert.deepEqual(ruleset.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
  assert.deepEqual(ruleset.pull_request_rule_parameters, merge.pull_request_rule_parameters);
  assert.equal(ruleset.ruleset_api_url_must_be_independently_resolved_immediately_before_merge, true);
  assert.deepEqual(ruleset.ruleset_api_request_headers, {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Cache-Control": "no-cache",
  });
  assert.equal(ruleset.both_ruleset_responses_must_be_authenticated_https_200_not_304, true);
  assert.equal(
    ruleset.ruleset_database_id_api_url_target_name_enforcement_conditions_and_bypass_actors_must_equal_resolved_record,
    true,
  );
  assert.equal(ruleset.resolved_rule_types_must_exactly_equal_required_rule_types, true);
  assert.equal(ruleset.resolved_pull_request_parameters_must_exactly_equal_required_parameters, true);
  assert.equal(ruleset.ruleset_record_sha256_preimage, "UTF-8_RFC8785_JCS_of_exact_resolved_ruleset_JSON");
  assert.equal(ruleset.ruleset_record_sha256_must_be_lowercase_64_hex_and_match_resolved_record, true);
  assert.equal(ruleset.ruleset_record_updated_at_must_equal_resolved_record_updated_at, true);
  assert.equal(ruleset.ruleset_record_response_date_and_etag_must_equal_resolved_https_response_headers, true);
  assert.equal(ruleset.ruleset_record_response_request_id_must_equal_non_empty_X_GitHub_Request_Id, true);
  assert.equal(ruleset.effective_rules_api_url_must_be_independently_resolved_for_main, true);
  assert.equal(ruleset.effective_rules_must_include_all_required_rule_types, true);
  assert.equal(ruleset.effective_rules_sha256_preimage, "UTF-8_RFC8785_JCS_of_exact_resolved_effective_rules_JSON");
  assert.equal(ruleset.effective_rules_sha256_must_be_lowercase_64_hex_and_match_resolved_record, true);
  assert.equal(ruleset.effective_rules_response_date_and_etag_must_equal_resolved_https_response_headers, true);
  assert.equal(ruleset.effective_rules_response_request_id_must_equal_non_empty_X_GitHub_Request_Id, true);
  assert.equal(ruleset.ruleset_response_dates_must_be_valid_IMF_fixdate_and_within_seconds, 30);
  assert.equal(ruleset.ruleset_observed_at_must_equal_later_github_response_date, true);
  assert.equal(ruleset.both_ruleset_response_dates_must_postdate_final_review_and_all_required_checks, true);
  assert.equal(ruleset.ruleset_observed_at_must_precede_expected_head_pinned_merge_request, true);
  assert.equal(ruleset.maximum_observation_age_seconds_at_merge_request, 300);
  assert.equal(ruleset.ruleset_observed_at_must_precede_resolved_pull_request_merged_at, true);
  assert.equal(
    ruleset.resolved_pull_request_merged_at_minus_ruleset_observed_at_must_be_between_zero_and_300_seconds,
    true,
  );
  assert.equal(ruleset.stale_unresolved_disabled_bypassed_or_mismatched_ruleset_blocks, true);
  assert.deepEqual(receipt.merge_binding, {
    required_method: "squash",
    expected_head_must_equal_reviewed_head: true,
    expected_head_must_equal_remote_head: true,
    merge_parent_must_equal_refetched_base: true,
    merge_tree_must_equal_candidate_tree: true,
    merge_completed_at_must_equal_resolved_pull_request_merged_at: true,
  });
  assert.deepEqual(receipt.issue_association_binding, {
    allowed_kinds: ["closing", "non_closing"],
    kind_must_be_closing_iff_issue_closure_authorized_for_stage: true,
    nonterminal_stage_must_bind_non_closing: true,
    issue_closure_authority_must_come_from_live_repository_authority: true,
  });
  assert.deepEqual(receipt.synchronization_binding, {
    issue_roadmap_and_current_stage_must_be_read_after_merge: true,
    issue_state_must_match_association_kind_and_closure_authority: true,
    roadmap_state_may_lead_validated_receipt: false,
    next_authorized_stage_tuple_must_come_from_live_repository_authority: true,
    writer_slot_release_requires_complete_valid_receipt: true,
  });
  assert.equal(receipt.metadata_only, true);
  assert.equal(receipt.raw_diff_or_source_body_allowed, false);
  assert.equal(receipt.raw_learner_or_ocr_content_allowed, false);
  assert.equal(receipt.secret_or_credential_allowed, false);
});

test("synchronizes branch, PR, issue, roadmap and current stage without receipt substitution", async () => {
  const { synchronization_policy: sync } = await readContract();
  assert.equal(sync.branch_commit_push_pr_body_same_head_required, true);
  assert.equal(sync.exactly_one_issue_association_required, true);
  assert.equal(sync.closing_reference_required_only_when_live_stage_authority_allows_issue_closure, true);
  assert.equal(sync.nonterminal_stage_requires_non_closing_issue_association, true);
  assert.equal(sync.c2r_c_p_c2r_c_t_may_close_703_704_or_705, false);
  assert.equal(sync.only_terminal_c2r_c_l_may_close_703_704_or_705, true);
  assert.equal(sync.issue_roadmap_current_stage_synchronized_after_receipt, true);
  assert.equal(sync.issue_state_may_substitute_for_merge_receipt, false);
  assert.equal(sync.roadmap_state_may_lead_validated_repository_receipt, false);
  assert.equal(sync.writer_slot_released_only_after_receipt, true);
});

test("authorizes only bounded dependency-ready non-Production continuation", async () => {
  const { delegated_start: start } = await readContract();
  assert.equal(start.enabled, true);
  assert.equal(start.available_only_after_this_contract_receipt, true);
  assert.equal(start.selector, "next_dependency_ready_non_production_stage_from_live_repository_authority");
  assert.equal(start.expected_first_stage, "C2R-C-P");
  assert.equal(start.expected_first_issue, 703);
  assert.deepEqual(start.expected_first_tuple, EXPECTED_TUPLE);
  assert.deepEqual(
    start.expected_first_stage_terminal_receipts.map(
      ({ stage, issue, pull_request, merge_sha, receipt_scope, issue_state_after_receipt }) =>
        [stage, issue, pull_request, merge_sha, receipt_scope, issue_state_after_receipt],
    ),
    [
      [
        "C2R-A",
        702,
        724,
        "2f0638469119e4f43578c0c96b11c8097a924bee",
        "complete_source_only",
        "closed",
      ],
      [
        "C2R-B",
        714,
        726,
        "cc3cfcc1c2f20f89633e5f5c1efe5ac68081f903",
        "complete_source_only_issue_714_allocation_c2",
        "open_c3_c4_c6_preserved",
      ],
    ],
  );
  assert.equal(
    start.expected_first_stage_terminal_receipts[1].base_sha,
    start.expected_first_stage_terminal_receipts[0].merge_sha,
  );
  assert.equal(start.issue_state_alone_may_start_stage, false);
  assert.equal(start.general_queue_runner_authorized, false);
  assert.equal(start.auto_merge_authorized, false);
  assert.equal(start.existing_stage_automatic_start_flags_rewritten, false);
  assert.equal(start.production_stage_allowed, false);
  assert.equal(start.routine_owner_prompt_required, false);
  assert.equal(start.correction_budget_exhaustion_may_interrupt_owner, false);
});

test("retains the exact nine Owner gates and fail-closed private boundaries", async () => {
  const contract = await readContract();
  exactMembers(contract.owner_gates, OWNER_GATES, "Owner gates");
  exactMembers(
    contract.preserved_boundaries,
    [
      "exact_head_evidence",
      "one_merge_producing_writer",
      "rights_privacy_source_and_effective_version_fail_closed",
      "no_raw_learner_body_in_logs_analytics_or_artifacts",
      "rollback_per_pr",
      "no_direct_main_or_force_push_authority",
      "no_gate_weakening",
    ],
    "preserved boundaries",
  );
  for (const prohibited of ["direct_main_push", "force_push", "history_rewrite", "auto_merge", "test_weakening"]) {
    assert.ok(contract.prohibited_operations.includes(prohibited), prohibited);
  }
});

test("fails closed under widened writer, review, receipt, start or Owner-gate mutations", async () => {
  const source = await readContract();
  const mutations = [
    (value) => value.writer_policy.global_merge_producing_writer_limit = 2,
    (value) => value.writer_policy.force_push_allowed = true,
    (value) => value.writer_policy.maximum_clean_replacement_prs_per_delivery = 2,
    (value) => value.writer_policy.automatic_ci_and_review_repair_required = false,
    (value) => value.delivery_sequence.splice(4, 2),
    (value) => value.correction_policy.maximum_source_corrections_per_pr = 3,
    (value) => value.correction_policy.maximum_exact_head_review_cycles_per_pr = 4,
    (value) => value.correction_policy.correction_budget_exhaustion_requires_owner = true,
    (value) => value.review_policy.required_premerge_counts.P1 = 1,
    (value) => value.merge_policy.all_required_exact_head_checks_must_succeed = false,
    (value) => value.merge_policy.pull_request_rule_parameters.required_review_thread_resolution = false,
    (value) => value.receipt_schema.required_fields.pop(),
    (value) => value.receipt_schema.source_correction_binding.maximum_source_corrections = 3,
    (value) => value.receipt_schema.source_correction_binding.count_must_equal_correction_head_count = false,
    (value) => value.receipt_schema.source_correction_binding.each_correction_head_parent_must_equal_previous_reviewed_or_correction_head = false,
    (value) => value.receipt_schema.exact_head_checks_binding.required_conclusion = "neutral",
    (value) => value.receipt_schema.exact_head_checks_binding.required_per_check_fields.pop(),
    (value) => value.receipt_schema.exact_head_checks_binding.github_evidence_kinds.pop(),
    (value) => value.receipt_schema.exact_head_checks_binding.resolved_field_mapping_by_kind.commit_status.head_sha = "head_sha",
    (value) => value.receipt_schema.exact_head_checks_binding.github_evidence_api_url_must_be_independently_resolvable = false,
    (value) => value.receipt_schema.exact_head_checks_binding.github_evidence_database_id_must_be_positive_integer = false,
    (value) => value.receipt_schema.exact_head_checks_binding.github_evidence_database_id_must_equal_resolved_object = false,
    (value) => value.receipt_schema.exact_head_checks_binding.resolved_evidence_must_bind_name_head_conclusion_details_url_and_completed_at = false,
    (value) => value.receipt_schema.replacement_binding.maximum_clean_replacement_prs = 2,
    (value) => value.receipt_schema.replacement_binding.required_per_superseded_pr_evidence_fields.pop(),
    (value) => value.receipt_schema.replacement_binding.each_superseded_pr_review_cycle_count_must_equal_maximum = false,
    (value) => value.receipt_schema.replacement_binding.required_per_actionable_finding_fields.pop(),
    (value) => value.receipt_schema.replacement_binding.finding_identity_preimage_fields.pop(),
    (value) => value.receipt_schema.replacement_binding.finding_identity_canonicalization.member_ordering = "implementation_defined",
    (value) => value.receipt_schema.replacement_binding.finding_identity_canonicalization.path_normalization = "platform_default",
    (value) => value.receipt_schema.replacement_binding.root_invariant_derivation.source = "receipt_writer",
    (value) => value.receipt_schema.replacement_binding.root_invariant_derivation.priority_capture_group_required = false,
    (value) => value.receipt_schema.replacement_binding.root_invariant_id_must_be_recomputed_from_resolved_review_comment_title = false,
    (value) => value.receipt_schema.replacement_binding.severity_must_equal_mandatory_resolved_review_priority_capture = false,
    (value) => value.receipt_schema.replacement_binding.review_comment_body_sha256_must_hash_exact_resolved_comment_body = false,
    (value) => value.receipt_schema.replacement_binding.review_comment_created_at_must_equal_updated_at = false,
    (value) => value.receipt_schema.replacement_binding.finding_identity_preimage_must_be_recomputed_from_receipt_and_review_metadata = false,
    (value) => value.receipt_schema.replacement_binding.finding_review_path_must_equal_normalized_canonical_preimage_path = false,
    (value) => value.receipt_schema.replacement_binding.every_superseded_actionable_finding_must_have_exactly_one_lineage_entry = false,
    (value) => value.receipt_schema.replacement_binding.same_actionable_p0_or_p1_requires_owner_gate_true = false,
    (value) => value.receipt_schema.replacement_binding.same_actionable_p0_or_p1_requires_non_null_owner_authorization_record_fields = false,
    (value) => value.receipt_schema.replacement_binding.every_replacement_actionable_finding_must_be_compared_against_all_superseded_finding_identities = false,
    (value) => value.receipt_schema.replacement_binding.matching_p0_or_p1_finding_identity_requires_same_finding_verdict_true = false,
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_sha256_must_hash_exact_resolved_record = false,
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_sha256_preimage = "implementation_defined",
    (value) => value.receipt_schema.replacement_binding.owner_authorization_actor_must_equal = "any_admin",
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_host_author_login_must_equal = "any_admin",
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_host_author_database_id_must_equal = 1,
    (value) => value.receipt_schema.replacement_binding.owner_authorization_actor_must_equal_resolved_host_author_login = false,
    (value) => value.receipt_schema.replacement_binding.missing_or_invalid_owner_authorization_blocks_receipt = false,
    (value) => value.receipt_schema.writer_binding.required_active_merge_producing_writer_count = 2,
    (value) => value.receipt_schema.review_evidence_binding.maximum_exact_head_review_cycles_per_pr = 4,
    (value) => value.receipt_schema.review_evidence_binding.required_per_cycle_fields.pop(),
    (value) => value.receipt_schema.review_evidence_binding.required_reviewer_database_id = 1,
    (value) => value.receipt_schema.review_evidence_binding.every_actionable_review_comment_author_must_equal_cycle_reviewer = false,
    (value) => value.receipt_schema.review_evidence_binding.each_cycle_all_required_remote_checks_successful_must_be_true = false,
    (value) => value.receipt_schema.review_evidence_binding.each_cycle_remote_check_binding_context = "top_level_receipt",
    (value) => value.receipt_schema.review_evidence_binding.each_cycle_all_required_local_validations_successful_must_be_true = false,
    (value) => value.receipt_schema.review_evidence_binding.each_cycle_local_validation_binding_context = "top_level_receipt",
    (value) => value.receipt_schema.exact_head_checks_binding.head_reference_by_context.review_cycle = "expected_head_sha",
    (value) => value.receipt_schema.exact_head_checks_binding.check_head_must_equal_resolved_context_head = false,
    (value) => value.receipt_schema.local_validation_binding.required_names.pop(),
    (value) => value.receipt_schema.local_validation_binding.required_per_validation_fields.pop(),
    (value) => value.receipt_schema.local_validation_binding.canonical_commands_by_platform.windows.full_tests = "Write-Output pass",
    (value) => value.receipt_schema.local_validation_binding.command_must_exactly_equal_canonical_command_for_name_and_platform = false,
    (value) => value.receipt_schema.local_validation_binding.execution_evidence_url_must_be_independently_resolvable = false,
    (value) => value.receipt_schema.local_validation_binding.execution_evidence_sha256_must_hash_exact_resolved_evidence_content = false,
    (value) => value.receipt_schema.local_validation_binding.head_reference_by_context.review_cycle = "expected_head_sha",
    (value) => value.receipt_schema.local_validation_binding.validation_head_must_equal_resolved_context_head = false,
    (value) => value.receipt_schema.ruleset_binding.required_name = "other",
    (value) => value.receipt_schema.ruleset_binding.required_database_id = 1,
    (value) => value.receipt_schema.ruleset_binding.required_bypass_actors.push({ actor_id: 1 }),
    (value) => value.receipt_schema.ruleset_binding.ruleset_api_url_must_be_independently_resolved_immediately_before_merge = false,
    (value) => value.receipt_schema.ruleset_binding.both_ruleset_responses_must_be_authenticated_https_200_not_304 = false,
    (value) => value.receipt_schema.ruleset_binding.ruleset_record_sha256_must_be_lowercase_64_hex_and_match_resolved_record = false,
    (value) => value.receipt_schema.ruleset_binding.effective_rules_must_include_all_required_rule_types = false,
    (value) => value.receipt_schema.ruleset_binding.ruleset_observed_at_must_equal_later_github_response_date = false,
    (value) => value.receipt_schema.ruleset_binding.maximum_observation_age_seconds_at_merge_request = 3600,
    (value) => value.receipt_schema.merge_binding.required_method = "merge",
    (value) => value.receipt_schema.merge_binding.merge_completed_at_must_equal_resolved_pull_request_merged_at = false,
    (value) => value.receipt_schema.issue_association_binding.allowed_kinds.push("unbound"),
    (value) => value.receipt_schema.synchronization_binding.writer_slot_release_requires_complete_valid_receipt = false,
    (value) => value.receipt_schema.ruleset_binding.pull_request_rule_parameters.allowed_merge_methods = ["merge"],
    (value) => value.synchronization_policy.exactly_one_issue_association_required = false,
    (value) => value.synchronization_policy.closing_reference_required_only_when_live_stage_authority_allows_issue_closure = false,
    (value) => value.owner_gates.pop(),
    (value) => value.delegated_start.production_stage_allowed = true,
    (value) => value.authority.general_automatic_start_flags_mutated = true,
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(source);
    mutate(candidate);
    assert.throws(() => {
      validateClosedContract(candidate);
      assert.equal(candidate.writer_policy.global_merge_producing_writer_limit, 1);
      assert.equal(candidate.writer_policy.force_push_allowed, false);
      assert.equal(candidate.writer_policy.maximum_clean_replacement_prs_per_delivery, 1);
      assert.equal(candidate.writer_policy.automatic_ci_and_review_repair_required, true);
      assert.equal(candidate.correction_policy.maximum_source_corrections_per_pr, 2);
      assert.equal(candidate.correction_policy.maximum_exact_head_review_cycles_per_pr, 3);
      assert.equal(candidate.correction_policy.correction_budget_exhaustion_requires_owner, false);
      assert.deepEqual(candidate.review_policy.required_premerge_counts, { P0: 0, P1: 0, P2: 0 });
      assert.equal(candidate.merge_policy.all_required_exact_head_checks_must_succeed, true);
      assert.deepEqual(candidate.merge_policy.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
      assert.equal(candidate.receipt_schema.exact_head_checks_binding.required_conclusion, "success");
      exactMembers(
        candidate.receipt_schema.exact_head_checks_binding.required_per_check_fields,
        CHECK_EVIDENCE_FIELDS,
        "check evidence fields",
      );
      exactMembers(
        candidate.receipt_schema.exact_head_checks_binding.github_evidence_kinds,
        GITHUB_CHECK_EVIDENCE_KINDS,
        "GitHub check evidence kinds",
      );
      assert.deepEqual(
        candidate.receipt_schema.exact_head_checks_binding.resolved_field_mapping_by_kind,
        RESOLVED_CHECK_FIELD_MAPPING,
      );
      assert.equal(
        candidate.receipt_schema.exact_head_checks_binding.github_evidence_api_url_must_be_independently_resolvable,
        true,
      );
      assert.equal(
        candidate.receipt_schema.exact_head_checks_binding.github_evidence_database_id_must_equal_resolved_object,
        true,
      );
      assert.equal(
        candidate.receipt_schema.exact_head_checks_binding.github_evidence_database_id_must_be_positive_integer,
        true,
      );
      assert.equal(
        candidate.receipt_schema.exact_head_checks_binding.resolved_evidence_must_bind_name_head_conclusion_details_url_and_completed_at,
        true,
      );
      assert.deepEqual(candidate.receipt_schema.source_correction_binding, {
        maximum_source_corrections: 2,
        count_must_equal_correction_head_count: true,
        correction_head_shas_must_be_unique_exact_40_hex: true,
        each_correction_head_parent_must_equal_previous_reviewed_or_correction_head: true,
        final_reviewed_head_must_equal_last_correction_head_when_count_positive: true,
        final_reviewed_head_must_equal_initial_reviewed_head_when_count_zero: true,
        budget_compliance_verdict_must_be_true: true,
      });
      const replacement = candidate.receipt_schema.replacement_binding;
      assert.equal(replacement.maximum_clean_replacement_prs, 1);
      exactMembers(
        replacement.required_per_superseded_pr_evidence_fields,
        SUPERSEDED_PR_EVIDENCE_FIELDS,
        "superseded PR evidence fields",
      );
      exactMembers(
        replacement.required_per_actionable_finding_fields,
        ACTIONABLE_FINDING_EVIDENCE_FIELDS,
        "actionable finding evidence fields",
      );
      exactMembers(
        replacement.finding_identity_preimage_fields,
        FINDING_IDENTITY_PREIMAGE_FIELDS,
        "finding identity preimage fields",
      );
      assert.deepEqual(replacement.finding_identity_canonicalization, FINDING_IDENTITY_CANONICALIZATION);
      assert.deepEqual(replacement.root_invariant_derivation, ROOT_INVARIANT_DERIVATION);
      assert.equal(replacement.each_superseded_pr_review_cycle_count_must_equal_maximum, true);
      assert.equal(
        replacement.finding_identity_preimage_must_be_recomputed_from_receipt_and_review_metadata,
        true,
      );
      assert.equal(replacement.root_invariant_id_must_be_recomputed_from_resolved_review_comment_title, true);
      assert.equal(replacement.severity_must_equal_mandatory_resolved_review_priority_capture, true);
      assert.equal(replacement.review_comment_body_sha256_must_hash_exact_resolved_comment_body, true);
      assert.equal(replacement.review_comment_created_at_must_equal_updated_at, true);
      assert.equal(replacement.finding_review_path_must_equal_normalized_canonical_preimage_path, true);
      assert.equal(replacement.every_superseded_actionable_finding_must_have_exactly_one_lineage_entry, true);
      assert.equal(replacement.same_actionable_p0_or_p1_requires_owner_gate_true, true);
      assert.equal(replacement.same_actionable_p0_or_p1_requires_non_null_owner_authorization_record_fields, true);
      assert.equal(
        replacement.every_replacement_actionable_finding_must_be_compared_against_all_superseded_finding_identities,
        true,
      );
      assert.equal(replacement.matching_p0_or_p1_finding_identity_requires_same_finding_verdict_true, true);
      assert.equal(replacement.owner_authorization_record_sha256_must_hash_exact_resolved_record, true);
      assert.equal(
        replacement.owner_authorization_record_sha256_preimage,
        "UTF-8_of_exact_resolved_record_body_after_CRLF_and_CR_to_LF",
      );
      assert.equal(replacement.owner_authorization_actor_must_equal, "chachathecat");
      assert.equal(replacement.owner_authorization_record_host_author_login_must_equal, "chachathecat");
      assert.equal(replacement.owner_authorization_record_host_author_database_id_must_equal, 128282020);
      assert.equal(replacement.owner_authorization_actor_must_equal_resolved_host_author_login, true);
      assert.equal(replacement.missing_or_invalid_owner_authorization_blocks_receipt, true);
      assert.equal(candidate.receipt_schema.writer_binding.required_active_merge_producing_writer_count, 1);
      assert.equal(candidate.receipt_schema.review_evidence_binding.maximum_exact_head_review_cycles_per_pr, 3);
      exactMembers(
        candidate.receipt_schema.review_evidence_binding.required_per_cycle_fields,
        REVIEW_EVIDENCE_FIELDS,
        "review evidence fields",
      );
      assert.equal(candidate.receipt_schema.review_evidence_binding.required_reviewer_database_id, 199175422);
      assert.equal(
        candidate.receipt_schema.review_evidence_binding.every_actionable_review_comment_author_must_equal_cycle_reviewer,
        true,
      );
      assert.equal(
        candidate.receipt_schema.review_evidence_binding.each_cycle_all_required_remote_checks_successful_must_be_true,
        true,
      );
      assert.equal(
        candidate.receipt_schema.review_evidence_binding.each_cycle_remote_check_binding_context,
        "review_cycle",
      );
      assert.equal(
        candidate.receipt_schema.review_evidence_binding.each_cycle_all_required_local_validations_successful_must_be_true,
        true,
      );
      assert.equal(
        candidate.receipt_schema.review_evidence_binding.each_cycle_local_validation_binding_context,
        "review_cycle",
      );
      assert.deepEqual(
        candidate.receipt_schema.exact_head_checks_binding.head_reference_by_context,
        VALIDATION_HEAD_REFERENCE_BY_CONTEXT,
      );
      assert.equal(
        candidate.receipt_schema.exact_head_checks_binding.check_head_must_equal_resolved_context_head,
        true,
      );
      exactMembers(
        candidate.receipt_schema.local_validation_binding.required_names,
        REQUIRED_LOCAL_VALIDATIONS,
        "local validation names",
      );
      exactMembers(
        candidate.receipt_schema.local_validation_binding.required_per_validation_fields,
        LOCAL_VALIDATION_EVIDENCE_FIELDS,
        "local validation evidence fields",
      );
      assert.deepEqual(
        candidate.receipt_schema.local_validation_binding.canonical_commands_by_platform,
        CANONICAL_LOCAL_VALIDATION_COMMANDS,
      );
      assert.equal(
        candidate.receipt_schema.local_validation_binding.command_must_exactly_equal_canonical_command_for_name_and_platform,
        true,
      );
      assert.equal(
        candidate.receipt_schema.local_validation_binding.execution_evidence_url_must_be_independently_resolvable,
        true,
      );
      assert.equal(
        candidate.receipt_schema.local_validation_binding.execution_evidence_sha256_must_hash_exact_resolved_evidence_content,
        true,
      );
      assert.deepEqual(
        candidate.receipt_schema.local_validation_binding.head_reference_by_context,
        VALIDATION_HEAD_REFERENCE_BY_CONTEXT,
      );
      assert.equal(
        candidate.receipt_schema.local_validation_binding.validation_head_must_equal_resolved_context_head,
        true,
      );
      assert.equal(candidate.receipt_schema.ruleset_binding.required_name, "main-pr-only");
      assert.equal(candidate.receipt_schema.ruleset_binding.required_database_id, 20903914);
      exactMembers(candidate.receipt_schema.ruleset_binding.required_bypass_actors, [], "receipt ruleset bypass actors");
      assert.equal(
        candidate.receipt_schema.ruleset_binding.ruleset_api_url_must_be_independently_resolved_immediately_before_merge,
        true,
      );
      assert.equal(
        candidate.receipt_schema.ruleset_binding.both_ruleset_responses_must_be_authenticated_https_200_not_304,
        true,
      );
      assert.equal(
        candidate.receipt_schema.ruleset_binding.ruleset_record_sha256_must_be_lowercase_64_hex_and_match_resolved_record,
        true,
      );
      assert.equal(candidate.receipt_schema.ruleset_binding.effective_rules_must_include_all_required_rule_types, true);
      assert.equal(candidate.receipt_schema.ruleset_binding.ruleset_observed_at_must_equal_later_github_response_date, true);
      assert.equal(candidate.receipt_schema.ruleset_binding.maximum_observation_age_seconds_at_merge_request, 300);
      assert.equal(candidate.receipt_schema.merge_binding.required_method, "squash");
      assert.equal(
        candidate.receipt_schema.merge_binding.merge_completed_at_must_equal_resolved_pull_request_merged_at,
        true,
      );
      exactMembers(
        candidate.receipt_schema.issue_association_binding.allowed_kinds,
        ["closing", "non_closing"],
        "issue association kinds",
      );
      assert.equal(
        candidate.receipt_schema.synchronization_binding.writer_slot_release_requires_complete_valid_receipt,
        true,
      );
      assert.deepEqual(candidate.receipt_schema.ruleset_binding.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
      assert.equal(candidate.synchronization_policy.exactly_one_issue_association_required, true);
      assert.equal(
        candidate.synchronization_policy.closing_reference_required_only_when_live_stage_authority_allows_issue_closure,
        true,
      );
      assert.equal(candidate.delegated_start.production_stage_allowed, false);
    });
  }
});

test("AGENTS precedence installs the narrow delegation while preserving the live tuple", async () => {
  const [agents, roadmap, runner] = await Promise.all([
    readFile("AGENTS.md", "utf8"),
    readFile("roadmap/active-program.yml", "utf8"),
    readFile("scripts/run-node-tests.mjs", "utf8"),
  ]);
  const delegationIndex = agents.indexOf(DECISION_PATH);
  const c2rBIndex = agents.indexOf("docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md");
  assert.ok(delegationIndex >= 0 && delegationIndex < c2rBIndex);
  assert.match(agents, /direct, bounded Owner continuation instruction/);
  assert.match(agents, /Every merge still requires actionable P0\/P1\/P2 `0\/0\/0`/);
  assert.match(roadmap, /currentReplacementStage:\s*C2R-C-P/);
  assert.match(roadmap, /currentReplacementStageIssue:\s*703/);
  assert.match(roadmap, /c2rCPState:\s*authorized_unstarted/);
  assert.equal((runner.match(/foundation-bounded-terminal-delivery-delegation\.test\.mjs/g) ?? []).length, 1);
});
