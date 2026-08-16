import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CONTRACT_PATH = "config/foundation-bounded-terminal-delivery-delegation-v1.json";
const DECISION_PATH = "docs/decisions/2026-08-16-owner-bounded-terminal-delivery-delegation.md";
const EXPECTED_TUPLE = ["WCV-C2", "C2", 717, "C2R-C-P", 703, "authorized_unstarted"];
const OWNER_RECORD_URL = "https://github.com/chachathecat/inverge/issues/736#issuecomment-5307469181";

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
  "review_database_id",
  "review_node_id",
  "review_api_url",
  "review_html_url",
  "reviewer_login",
  "reviewer_database_id",
  "review_commit_id",
  "cycle_head_sha",
  "remote_head_sha_at_review",
  "submitted_at",
  "review_body_sha256",
  "complete_review_comments",
  "derived_review_counts",
  "derived_terminal_result",
  "remote_check_results",
  "all_required_remote_checks_successful",
];

const REVIEW_COMMENT_FIELDS = [
  "comment_database_id",
  "comment_node_id",
  "comment_api_url",
  "comment_html_url",
  "review_database_id",
  "author_login",
  "author_database_id",
  "path",
  "finding_head_sha",
  "created_at",
  "updated_at",
  "body_sha256",
  "severity",
];

const LOCAL_VALIDATION_FIELDS = [
  "name",
  "platform",
  "command",
  "head_sha",
  "started_at",
  "exit_code",
  "conclusion",
  "completed_at",
];

const SUPERSEDED_PR_EVIDENCE_FIELDS = [
  "pull_request_number",
  "pull_request_node_id",
  "closed_at",
  "merged",
  "final_head_sha",
  "source_correction_count",
  "source_correction_head_shas",
  "source_correction_parent_chain_valid",
  "exact_head_review_cycle_count",
  "exact_head_review_evidence",
];

const OWNER_AUTHORIZATION_RECORD_FIELDS = [
  "decision_id",
  "record_url",
  "record_database_id",
  "record_body_sha256",
  "host_author_login",
  "host_author_database_id",
  "host_created_at",
  "host_updated_at",
  "owner_authorized_at",
  "repository",
  "delivery_issue",
  "replacement_pr",
  "superseded_pr",
  "superseded_finding_url",
  "replacement_finding_url",
  "classification",
  "authorized_action",
  "authorization_scope",
  "merge_authorized",
  "production_authority",
];

const THREAD_EVIDENCE_FIELDS = [
  "thread_node_id",
  "top_level_comment_database_id",
  "top_level_comment_node_id",
  "finding_head_sha",
  "correction_head_sha",
  "correction_commit_committed_at",
  "reply_comment_database_id",
  "reply_comment_node_id",
  "reply_author_login",
  "reply_author_database_id",
  "reply_created_at",
  "reply_body_sha256",
  "is_resolved",
  "resolved_by_login",
  "final_clean_review_database_id",
  "final_clean_review_commit_id",
  "final_clean_review_submitted_at",
];

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

const OWNER_GATES = [
  "production_migration_rls_or_storage_apply",
  "production_secret_or_environment_mutation",
  "actual_charge_price_refund_or_checkout_activation",
  "real_learner_or_instructor_invitation",
  "rights_unclear_content_or_unresolved_privacy_legal_authority",
  "public_release_or_domain_promotion",
  "destructive_or_irreversible_data_operation",
  "material_product_scope_change",
  "any_actionable_p0_or_p1_on_one_clean_replacement_requires_owner_classification_and_action",
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
  "replacement_review_evidence",
  "replacement_owner_gate",
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
  "thread_resolution_evidence",
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
  "premerge_live_verification",
  "postmerge_live_verification",
  "validated_at",
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

async function readContract() {
  return JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
}

function exactMembers(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label} must be an array`);
  assert.equal(actual.length, expected.length, `${label} length drifted`);
  assert.equal(new Set(actual).size, actual.length, `${label} contains duplicates`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} members drifted`);
}

function firstNonEmptyLine(body) {
  return body.replace(/\r\n?/g, "\n").split("\n").find((line) => line.length > 0) ?? "";
}

function normalizedBodySha256(body) {
  return createHash("sha256").update(body.replace(/\r\n?/g, "\n"), "utf8").digest("hex");
}

function deriveReviewAuthority(contract, { review, comments, complete = true, reported = null }) {
  const binding = contract.receipt_schema.review_evidence_binding;
  assert.equal(complete, true, "review comment pagination must be complete");
  assert.equal(review.reviewer_login, binding.required_reviewer_login);
  assert.equal(review.reviewer_database_id, binding.required_reviewer_database_id);
  assert.equal(review.review_commit_id, review.cycle_head_sha);

  const counts = { P0: 0, P1: 0, P2: 0 };
  const badge = new RegExp(binding.actionable_comment_badge_regex);
  for (const comment of comments) {
    assert.equal(comment.review_database_id, review.review_database_id);
    assert.equal(comment.author_login, binding.required_reviewer_login);
    assert.equal(comment.author_database_id, binding.required_reviewer_database_id);
    const match = firstNonEmptyLine(comment.body).match(badge);
    assert.ok(match, "every actionable review comment needs one exact badge");
    counts[match[1]] += 1;
  }
  const terminalResult = Object.values(counts).every((count) => count === 0) ? "clean" : "actionable";
  if (reported) {
    assert.deepEqual(reported.counts, counts, "receipt-authored counts cannot override GitHub evidence");
    assert.equal(reported.terminalResult, terminalResult, "receipt-authored terminal result cannot override GitHub evidence");
  }
  return { counts, terminalResult };
}

function replacementOwnerGate(contract, derivedCounts) {
  const replacement = contract.receipt_schema.replacement_binding;
  const required = derivedCounts.P0 + derivedCounts.P1 > 0;
  assert.equal(replacement.any_replacement_actionable_p0_or_p1_requires_owner_gate, true);
  assert.equal(replacement.owner_gate_depends_on_semantic_finding_identity, false);
  return required;
}

function validateOwnerAuthorizationEvidence(contract, record, resolved) {
  const binding = contract.receipt_schema.replacement_binding;
  assert.ok(resolved, "Owner authorization record must still resolve from GitHub");
  exactMembers(Object.keys(record), OWNER_AUTHORIZATION_RECORD_FIELDS, "Owner authorization record");
  assert.equal(record.record_url, resolved.html_url);
  assert.equal(record.record_database_id, resolved.database_id);
  assert.equal(record.record_body_sha256, normalizedBodySha256(resolved.body));
  assert.equal(record.host_author_login, resolved.author_login);
  assert.equal(record.host_author_login, binding.owner_authorization_record_host_author_login_must_equal);
  assert.equal(record.host_author_database_id, resolved.author_database_id);
  assert.equal(record.host_author_database_id, binding.owner_authorization_record_host_author_database_id_must_equal);
  assert.equal(record.host_created_at, resolved.created_at);
  assert.equal(record.host_updated_at, resolved.updated_at);
  assert.equal(record.owner_authorized_at, resolved.created_at);
  assert.equal(record.host_created_at, record.host_updated_at, "edited Owner record must fail closed");
  return true;
}

function validateRemoteMergeAuthority(contract, headSha, checks) {
  const binding = contract.receipt_schema.exact_head_checks_binding;
  const byName = new Map(checks.map((check) => [check.name, check]));
  for (const name of binding.required_names) {
    const check = byName.get(name);
    assert.ok(check, `missing exact-head GitHub check: ${name}`);
    assert.equal(check.head_sha, headSha);
    assert.equal(check.conclusion, binding.required_conclusion);
    assert.ok(["check_run", "commit_status"].includes(check.github_evidence_kind));
  }
  assert.equal(checks.length, binding.required_names.length);
  return true;
}

function validateThreadEvidence(contract, thread, checks) {
  const binding = contract.receipt_schema.thread_resolution_binding;
  validateRemoteMergeAuthority(contract, thread.correction_head_sha, checks);
  assert.ok(thread.reply_comment_database_id, "correction-bound reply is required");
  assert.equal(thread.reply_author_login, binding.reply_author_login_must_equal);
  assert.equal(thread.reply_author_database_id, binding.reply_author_database_id_must_equal);
  assert.ok(new Date(thread.reply_created_at) > new Date(thread.correction_commit_committed_at));
  for (const check of checks) {
    assert.ok(check.completed_at, `missing completion time for ${check.name}`);
    assert.ok(new Date(thread.reply_created_at) > new Date(check.completed_at), `reply predates ${check.name}`);
  }
  assert.ok(new Date(thread.reply_created_at) > new Date(thread.final_clean_review_submitted_at));
  assert.match(thread.reply_body, new RegExp(thread.correction_head_sha));
  assert.equal(thread.is_resolved, true, "thread must still be resolved live");
  assert.equal(thread.resolved_by_login, binding.resolved_by_login_must_equal);
  assert.ok(thread.final_clean_review_database_id, "later clean review is required");
  assert.equal(thread.final_clean_review_commit_id, thread.correction_head_sha);
  assert.ok(new Date(thread.final_clean_review_submitted_at) > new Date(thread.correction_commit_committed_at));
  return true;
}

function validateClosedContract(contract) {
  exactMembers(Object.keys(contract), TOP_LEVEL_KEYS, "top-level contract keys");
  assert.equal(contract.contract_id, "foundation-bounded-terminal-delivery-delegation-v1");
  assert.equal(contract.version, 1);
  assert.equal(contract.repository, "chachathecat/inverge");
  assert.equal(contract.delivery_issue, 736);
  assert.equal(contract.decision_path, DECISION_PATH);
  assert.equal(contract.authority.scope, "repository_delivery_control_plane_only");
  assert.equal(contract.authority.production_authority, "none");

  const writer = contract.writer_policy;
  assert.equal(writer.global_merge_producing_writer_limit, 1);
  assert.equal(writer.maximum_clean_replacement_prs_per_delivery, 1);
  for (const key of [
    "direct_main_push_allowed",
    "force_push_allowed",
    "amend_allowed",
    "rebase_allowed",
    "reset_allowed",
    "history_rewrite_allowed",
    "auto_merge_allowed",
    "ruleset_bypass_allowed",
  ]) assert.equal(writer[key], false, key);

  const correction = contract.correction_policy;
  assert.equal(correction.maximum_source_corrections_per_pr, 2);
  assert.equal(correction.maximum_exact_head_review_cycles_per_pr, 3);
  assert.equal(correction.maximum_clean_replacement_prs_per_delivery, 1);
  assert.equal(correction.any_actionable_p0_or_p1_on_clean_replacement_requires_owner_classification, true);
  assert.equal(correction.replacement_p2_only_requires_owner_classification, false);
  assert.deepEqual(correction.owner_classifications, ["same_root", "distinct_root"]);
  assert.deepEqual(correction.owner_authorized_actions, ["repair", "replan", "close"]);
  assert.equal(correction.automatic_semantic_finding_identity_inference_allowed, false);
  assert.equal(correction.title_hash_prose_equality_case_or_punctuation_may_satisfy_owner_gate, false);
  assert.equal(correction.correction_budget_exhaustion_requires_owner, false);

  assert.equal(contract.review_policy.complete_paginated_review_comment_set_required, true);
  assert.equal(contract.review_policy.review_counts_and_terminal_result_derived_from_resolved_github_review, true);
  assert.equal(contract.review_policy.receipt_authored_review_counts_or_terminal_result_have_authority, false);
  assert.equal(contract.review_policy.thread_resolution_requires_correction_bound_reply_and_later_clean_review, true);

  const review = contract.receipt_schema.review_evidence_binding;
  exactMembers(review.required_per_cycle_fields, REVIEW_EVIDENCE_FIELDS, "review cycle evidence fields");
  exactMembers(review.required_per_review_comment_fields, REVIEW_COMMENT_FIELDS, "review comment evidence fields");
  assert.equal(review.required_reviewer_login, "chatgpt-codex-connector[bot]");
  assert.equal(review.required_reviewer_database_id, 199175422);
  assert.equal(review.review_comments_api_must_be_paginated_to_completion_for_exact_review, true);
  assert.equal(review.every_resolved_review_comment_is_actionable_for_counting, true);
  assert.equal(review.derived_review_counts_must_equal_badge_counts_from_complete_comment_set, true);
  assert.equal(review.receipt_authored_review_counts_or_terminal_result_may_override_resolved_evidence, false);
  assert.equal(review.final_derived_terminal_result, "clean");
  assert.deepEqual(review.final_required_actionable_counts, { P0: 0, P1: 0, P2: 0 });

  const replacement = contract.receipt_schema.replacement_binding;
  exactMembers(replacement.required_per_superseded_pr_evidence_fields, SUPERSEDED_PR_EVIDENCE_FIELDS, "superseded PR evidence fields");
  assert.equal(replacement.replacement_pr_evidence_must_be_separate_from_superseded_pr_evidence, true);
  assert.equal(replacement.replacement_comments_must_resolve_symmetrically_with_superseded_comments, true);
  assert.equal(replacement.any_replacement_actionable_p0_or_p1_requires_owner_gate, true);
  assert.equal(replacement.replacement_p2_only_requires_owner_gate, false);
  assert.equal(replacement.owner_gate_depends_on_semantic_finding_identity, false);
  assert.equal(replacement.automatic_semantic_equivalence_inference_allowed, false);
  assert.equal(replacement.title_hash_prose_equality_punctuation_or_case_normalization_allowed, false);
  assert.equal(replacement.writer_selected_root_invariant_id_allowed, false);
  exactMembers(replacement.required_owner_authorization_record_fields, OWNER_AUTHORIZATION_RECORD_FIELDS, "Owner authorization fields");
  assert.equal(replacement.owner_authorization_record_required_fields_must_be_preserved_in_receipt, true);
  assert.equal(replacement.owner_authorization_record_host_author_login_must_equal, "chachathecat");
  assert.equal(replacement.owner_authorization_record_host_author_database_id_must_equal, 128282020);
  assert.equal(replacement.owner_authorization_record_host_updated_at_must_equal_resolved_github_record_updated_at, true);
  assert.equal(replacement.owner_authorization_decision_id_must_be_unique_on_delivery_issue, true);
  assert.equal(replacement.exactly_one_resolved_record_with_decision_id_required, true);
  assert.equal(replacement.owner_repair_authorization_does_not_authorize_merge, true);
  assert.equal(replacement.merge_authorized_false_until_fresh_exact_head_zero_zero_zero, true);
  for (const removed of [
    "finding_identity_preimage_fields",
    "finding_identity_canonicalization",
    "root_invariant_derivation",
    "required_per_replacement_finding_lineage_fields",
  ]) assert.equal(Object.hasOwn(replacement, removed), false, `${removed} must be removed`);

  const local = contract.receipt_schema.local_validation_binding;
  exactMembers(local.required_names, REQUIRED_LOCAL_VALIDATIONS, "local preflight names");
  exactMembers(local.required_per_validation_fields, LOCAL_VALIDATION_FIELDS, "local preflight fields");
  assert.deepEqual(local.canonical_commands_by_platform, CANONICAL_LOCAL_VALIDATION_COMMANDS);
  assert.equal(local.required_before_push_and_review, true);
  assert.equal(local.diagnostic_advisory_only, true);
  assert.equal(local.writer_authored_local_record_is_trusted_execution_provenance, false);
  assert.equal(local.writer_authored_local_record_may_authorize_merge_or_continuation, false);
  assert.equal(local.merge_authorizing_test_build_and_security_results_must_come_from_exact_head_checks_binding, true);

  const checks = contract.receipt_schema.exact_head_checks_binding;
  exactMembers(checks.required_names, REQUIRED_CHECKS, "required exact-head checks");
  exactMembers(checks.required_per_check_fields, CHECK_EVIDENCE_FIELDS, "GitHub check evidence fields");
  assert.equal(checks.required_conclusion, "success");
  assert.equal(checks.github_evidence_api_url_must_be_independently_resolvable, true);
  assert.equal(checks.resolved_evidence_must_bind_name_head_conclusion_details_url_and_completed_at, true);
  assert.equal(checks.missing_pending_skipped_cancelled_or_unsuccessful_blocks, true);

  const threads = contract.receipt_schema.thread_resolution_binding;
  exactMembers(threads.required_per_actionable_thread_fields, THREAD_EVIDENCE_FIELDS, "thread evidence fields");
  assert.equal(threads.correction_required_checks_must_resolve_through_exact_head_checks_binding, true);
  assert.equal(threads.each_correction_check_head_sha_must_equal_correction_head_sha, true);
  assert.equal(threads.reply_created_at_must_be_after_every_resolved_required_exact_head_check_completed_at, true);
  assert.equal(threads.reply_created_at_must_be_after_final_clean_review_submitted_at, true);
  assert.equal(threads.resolved_without_correction_bound_reply_blocks, true);
  assert.equal(threads.reply_with_unresolved_thread_blocks, true);
  assert.equal(threads.resolved_with_reply_but_without_later_clean_review_blocks, true);
  assert.equal(threads.receipt_thread_evidence_may_override_live_thread_state, false);
  assert.equal(threads.resolution_timestamp_field_allowed, false);

  const live = contract.receipt_schema.live_state_binding;
  assert.equal(live.receipt_role, "metadata_only_audit_summary_not_trust_root");
  assert.equal(live.receipt_values_may_substitute_for_live_pr_review_check_thread_ruleset_merge_main_issue_or_roadmap_state, false);
  assert.equal(live.stale_missing_or_mismatched_live_state_blocks_merge_or_continuation, true);
  assert.equal(live.next_stage_may_start_only_from_fresh_postmerge_live_state, true);

  const ruleset = contract.receipt_schema.ruleset_binding;
  assert.equal(ruleset.required_database_id, 20903914);
  assert.equal(ruleset.required_name, "main-pr-only");
  assert.equal(ruleset.required_enforcement, "active");
  assert.deepEqual(ruleset.required_bypass_actors, []);
  exactMembers(ruleset.required_rule_types, ["pull_request", "non_fast_forward", "deletion"], "ruleset rules");
  assert.equal(ruleset.ruleset_api_url_must_be_independently_resolved_immediately_before_merge, true);
  assert.equal(ruleset.maximum_observation_age_seconds_at_merge_request, 300);

  assert.equal(contract.receipt_schema.merge_binding.required_method, "squash");
  assert.equal(contract.receipt_schema.merge_binding.expected_head_must_equal_reviewed_head, true);
  assert.equal(contract.receipt_schema.merge_binding.expected_head_must_equal_remote_head, true);
  assert.equal(contract.receipt_schema.merge_binding.merge_parent_must_equal_refetched_base, true);
  assert.equal(contract.receipt_schema.merge_binding.merge_tree_must_equal_candidate_tree, true);
  exactMembers(contract.receipt_schema.required_fields, RECEIPT_FIELDS, "receipt fields");
  exactMembers(contract.owner_gates, OWNER_GATES, "Owner gates");
  assert.deepEqual(contract.delegated_start.expected_first_tuple, EXPECTED_TUPLE);
  assert.equal(contract.delegated_start.production_stage_allowed, false);
  return true;
}

function reviewFixture(overrides = {}) {
  const head = "a".repeat(40);
  return {
    review_database_id: 101,
    reviewer_login: "chatgpt-codex-connector[bot]",
    reviewer_database_id: 199175422,
    review_commit_id: head,
    cycle_head_sha: head,
    ...overrides,
  };
}

function commentFixture(severity, title = "Finding", overrides = {}) {
  return {
    review_database_id: 101,
    author_login: "chatgpt-codex-connector[bot]",
    author_database_id: 199175422,
    body: `**<sub><sub>![${severity} Badge](https://img.shields.io/badge/${severity}-orange?style=flat)</sub></sub>  ${title}**\n\nDetails`,
    ...overrides,
  };
}

function successfulChecks(contract, headSha) {
  return contract.receipt_schema.exact_head_checks_binding.required_names.map((name, index) => ({
    name,
    github_evidence_kind: index === 0 ? "commit_status" : "check_run",
    head_sha: headSha,
    conclusion: "success",
    completed_at: `2026-08-16T12:01:${String(index).padStart(2, "0")}Z`,
  }));
}

function validThreadFixture() {
  const correctionHead = "b".repeat(40);
  return {
    reply_comment_database_id: 202,
    reply_author_login: "chachathecat",
    reply_author_database_id: 128282020,
    correction_head_sha: correctionHead,
    correction_commit_committed_at: "2026-08-16T12:00:00Z",
    reply_created_at: "2026-08-16T12:03:00Z",
    reply_body: `Addressed at exact corrected head ${correctionHead}; focused and remote exact-head evidence are green.`,
    is_resolved: true,
    resolved_by_login: "chachathecat",
    final_clean_review_database_id: 303,
    final_clean_review_commit_id: correctionHead,
    final_clean_review_submitted_at: "2026-08-16T12:02:00Z",
  };
}

function ownerEvidenceFixture() {
  const body = "decision_id:\r\nowner-736-pr743-structural-simplification-2026-08-16\r\n";
  const resolved = {
    html_url: OWNER_RECORD_URL,
    database_id: 5307469181,
    body,
    author_login: "chachathecat",
    author_database_id: 128282020,
    created_at: "2026-08-16T12:37:22Z",
    updated_at: "2026-08-16T12:37:22Z",
  };
  return {
    resolved,
    record: {
      decision_id: "owner-736-pr743-structural-simplification-2026-08-16",
      record_url: resolved.html_url,
      record_database_id: resolved.database_id,
      record_body_sha256: normalizedBodySha256(resolved.body),
      host_author_login: resolved.author_login,
      host_author_database_id: resolved.author_database_id,
      host_created_at: resolved.created_at,
      host_updated_at: resolved.updated_at,
      owner_authorized_at: resolved.created_at,
      repository: "chachathecat/inverge",
      delivery_issue: 736,
      replacement_pr: 743,
      superseded_pr: 742,
      superseded_finding_url: "https://github.com/chachathecat/inverge/pull/742#discussion_r3791617114",
      replacement_finding_url: "https://github.com/chachathecat/inverge/pull/743#discussion_r3791696198",
      classification: "same_root",
      authorized_action: "structural_simplification_repair",
      authorization_scope: "the current five-file Foundation 5/5 control-plane PR only",
      merge_authorized: false,
      production_authority: "none",
    },
  };
}

test("installs the structurally simplified closed Owner delegation contract", async () => {
  const contract = await readContract();
  assert.equal(validateClosedContract(contract), true);
  const decision = await readFile(DECISION_PATH, "utf8");
  assert.match(decision, /owner_bounded_terminal_delivery_delegation_2026_08_16/);
  assert.ok(decision.includes(OWNER_RECORD_URL));
  assert.match(decision, /structural_simplification_repair/);
  assert.match(decision, /fresh exact-head `0\/0\/0`/);
});

test("binds the exact contiguous four-outcome foundation receipt chain", async () => {
  const { predecessor_receipts: receipts } = await readContract();
  assert.deepEqual(receipts.map(({ issue, pull_request, merge_sha }) => [issue, pull_request, merge_sha]), [
    [728, 729, "a8fd49ba2a31ea88b50a45e4ac218903f3ab0409"],
    [730, 731, "d3e48a8d2ad956d48faabad2c112e95a9ab1150b"],
    [732, 733, "54827475893a4884de9a9192f11b38bcba33f429"],
    [734, 735, "82cfbf73dbe7b94120c551f6e5459c41f96ee831"],
  ]);
  for (let index = 1; index < receipts.length; index += 1) {
    assert.equal(receipts[index].base_sha, receipts[index - 1].merge_sha);
  }
});

test("title rewording, punctuation, and case cannot bypass the replacement P1 Owner gate", async () => {
  const contract = await readContract();
  for (const title of [
    "Keep finding identity stable across title rewording",
    "keep finding identity stable across title rewording!",
    "A differently worded persistent control defect",
  ]) {
    const derived = deriveReviewAuthority(contract, {
      review: reviewFixture(),
      comments: [commentFixture("P1", title)],
    });
    assert.equal(replacementOwnerGate(contract, derived.counts), true);
  }
});

test("every replacement P1 requires Owner classification while P2-only does not", async () => {
  const contract = await readContract();
  const p1 = deriveReviewAuthority(contract, { review: reviewFixture(), comments: [commentFixture("P1")] });
  const p2 = deriveReviewAuthority(contract, { review: reviewFixture(), comments: [commentFixture("P2")] });
  assert.equal(replacementOwnerGate(contract, p1.counts), true);
  assert.equal(replacementOwnerGate(contract, p2.counts), false);
});

test("Owner authorization receipt preserves immutable GitHub identity, digest, author, and times", async () => {
  const contract = await readContract();
  const { record, resolved } = ownerEvidenceFixture();
  assert.equal(validateOwnerAuthorizationEvidence(contract, record, resolved), true);
  assert.throws(() => validateOwnerAuthorizationEvidence(contract, { ...record, record_url: undefined }, resolved));
  assert.throws(() => validateOwnerAuthorizationEvidence(contract, record, { ...resolved, body: `${resolved.body}edited` }));
  assert.throws(() => validateOwnerAuthorizationEvidence(contract, record, { ...resolved, updated_at: "2026-08-16T12:38:00Z" }));
  assert.throws(() => validateOwnerAuthorizationEvidence(contract, record, null));
});

test("resolved review comments derive counts and reject self-reported clean", async () => {
  const contract = await readContract();
  const review = reviewFixture();
  const comments = [commentFixture("P1"), commentFixture("P2", "Second finding")];
  assert.throws(() => deriveReviewAuthority(contract, {
    review,
    comments,
    reported: { counts: { P0: 0, P1: 0, P2: 0 }, terminalResult: "clean" },
  }));
  const derived = deriveReviewAuthority(contract, { review, comments });
  assert.deepEqual(derived, { counts: { P0: 0, P1: 1, P2: 1 }, terminalResult: "actionable" });
});

test("incomplete, badge-less, wrong-review, or missing replacement-comment evidence fails", async () => {
  const contract = await readContract();
  const review = reviewFixture();
  assert.throws(() => deriveReviewAuthority(contract, { review, comments: [commentFixture("P1")], complete: false }));
  assert.throws(() => deriveReviewAuthority(contract, {
    review,
    comments: [commentFixture("P1", "Finding", { body: "badge-less finding" })],
  }));
  assert.throws(() => deriveReviewAuthority(contract, {
    review,
    comments: [commentFixture("P1", "Finding", { review_database_id: 999 })],
  }));
  assert.equal(contract.receipt_schema.replacement_binding.replacement_comments_must_resolve_symmetrically_with_superseded_comments, true);
});

test("writer-authored local evidence cannot replace exact-head GitHub merge authority", async () => {
  const contract = await readContract();
  const head = "a".repeat(40);
  const local = contract.receipt_schema.local_validation_binding;
  assert.equal(local.diagnostic_advisory_only, true);
  assert.equal(local.writer_authored_local_record_may_authorize_merge_or_continuation, false);
  assert.throws(() => validateRemoteMergeAuthority(contract, head, []));
  assert.equal(validateRemoteMergeAuthority(contract, head, successfulChecks(contract, head)), true);
});

test("failed or missing exact-head GitHub checks block", async () => {
  const contract = await readContract();
  const head = "a".repeat(40);
  const missing = successfulChecks(contract, head).slice(1);
  assert.throws(() => validateRemoteMergeAuthority(contract, head, missing));
  const failed = successfulChecks(contract, head);
  failed[0] = { ...failed[0], conclusion: "failure" };
  assert.throws(() => validateRemoteMergeAuthority(contract, head, failed));
});

test("thread resolution requires correction reply, resolved state, and later clean review", async () => {
  const contract = await readContract();
  const valid = validThreadFixture();
  const checks = successfulChecks(contract, valid.correction_head_sha);
  assert.equal(validateThreadEvidence(contract, valid, checks), true);
  assert.throws(() => validateThreadEvidence(contract, { ...valid, reply_comment_database_id: null }, checks));
  assert.throws(() => validateThreadEvidence(contract, { ...valid, is_resolved: false }, checks));
  assert.throws(() => validateThreadEvidence(contract, { ...valid, final_clean_review_database_id: null }, checks));
  assert.throws(() => validateThreadEvidence(contract, { ...valid, reply_created_at: "2026-08-16T12:01:05Z" }, checks));
  assert.throws(() => validateThreadEvidence(contract, { ...valid, reply_created_at: "2026-08-16T12:01:30Z" }, checks));
});

test("receipt values cannot substitute for live repository state", async () => {
  const contract = await readContract();
  const live = contract.receipt_schema.live_state_binding;
  assert.equal(live.receipt_role, "metadata_only_audit_summary_not_trust_root");
  assert.equal(live.receipt_values_may_substitute_for_live_pr_review_check_thread_ruleset_merge_main_issue_or_roadmap_state, false);
  exactMembers(live.required_premerge_refetches, [
    "pull_request_base_head_state_and_mergeability",
    "exact_reviews_and_complete_paginated_review_comment_sets",
    "every_required_exact_head_check_run_or_commit_status",
    "every_actionable_review_thread_and_correction_bound_reply",
    "main_pr_only_ruleset_and_effective_main_rules",
    "current_merge_producing_writer_state",
    "delivery_issue_and_live_roadmap_authority",
  ], "premerge live refetches");
  assert.equal(live.next_stage_may_start_only_from_fresh_postmerge_live_state, true);
});

test("retains every Production, payment, learner, rights, privacy and destructive stop gate", async () => {
  const contract = await readContract();
  exactMembers(contract.owner_gates, OWNER_GATES, "Owner gates");
  for (const prohibited of [
    "production_mutation_without_owner_gate",
    "payment_or_checkout_activation_without_owner_gate",
    "real_user_invitation_without_owner_gate",
    "rights_unclear_content_use_without_owner_gate",
    "public_release_without_owner_gate",
    "destructive_operation_without_owner_gate",
    "material_product_scope_change_without_owner_gate",
    "direct_main_push",
    "force_push",
    "history_rewrite",
    "auto_merge",
    "test_weakening",
  ]) assert.ok(contract.prohibited_operations.includes(prohibited), prohibited);
});

test("fails closed under authority, review, local, thread, live-state, or Owner-gate weakening", async () => {
  const source = await readContract();
  const mutations = [
    (value) => value.writer_policy.global_merge_producing_writer_limit = 2,
    (value) => value.writer_policy.force_push_allowed = true,
    (value) => value.correction_policy.maximum_source_corrections_per_pr = 3,
    (value) => value.correction_policy.any_actionable_p0_or_p1_on_clean_replacement_requires_owner_classification = false,
    (value) => value.correction_policy.replacement_p2_only_requires_owner_classification = true,
    (value) => value.correction_policy.automatic_semantic_finding_identity_inference_allowed = true,
    (value) => value.review_policy.receipt_authored_review_counts_or_terminal_result_have_authority = true,
    (value) => value.receipt_schema.required_fields.pop(),
    (value) => value.receipt_schema.replacement_binding.any_replacement_actionable_p0_or_p1_requires_owner_gate = false,
    (value) => value.receipt_schema.replacement_binding.owner_gate_depends_on_semantic_finding_identity = true,
    (value) => value.receipt_schema.replacement_binding.replacement_comments_must_resolve_symmetrically_with_superseded_comments = false,
    (value) => value.receipt_schema.replacement_binding.required_owner_authorization_record_fields.pop(),
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_required_fields_must_be_preserved_in_receipt = false,
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_host_author_database_id_must_equal = 1,
    (value) => value.receipt_schema.replacement_binding.owner_authorization_record_host_updated_at_must_equal_resolved_github_record_updated_at = false,
    (value) => value.receipt_schema.replacement_binding.exactly_one_resolved_record_with_decision_id_required = false,
    (value) => value.receipt_schema.review_evidence_binding.required_per_review_comment_fields.pop(),
    (value) => value.receipt_schema.review_evidence_binding.review_comments_api_must_be_paginated_to_completion_for_exact_review = false,
    (value) => value.receipt_schema.review_evidence_binding.every_resolved_review_comment_is_actionable_for_counting = false,
    (value) => value.receipt_schema.review_evidence_binding.derived_review_counts_must_equal_badge_counts_from_complete_comment_set = false,
    (value) => value.receipt_schema.review_evidence_binding.receipt_authored_review_counts_or_terminal_result_may_override_resolved_evidence = true,
    (value) => value.receipt_schema.local_validation_binding.writer_authored_local_record_may_authorize_merge_or_continuation = true,
    (value) => value.receipt_schema.local_validation_binding.canonical_commands_by_platform.windows.full_tests = "Write-Output pass",
    (value) => value.receipt_schema.exact_head_checks_binding.required_conclusion = "neutral",
    (value) => value.receipt_schema.exact_head_checks_binding.missing_pending_skipped_cancelled_or_unsuccessful_blocks = false,
    (value) => value.receipt_schema.thread_resolution_binding.resolved_without_correction_bound_reply_blocks = false,
    (value) => value.receipt_schema.thread_resolution_binding.correction_required_checks_must_resolve_through_exact_head_checks_binding = false,
    (value) => value.receipt_schema.thread_resolution_binding.reply_created_at_must_be_after_every_resolved_required_exact_head_check_completed_at = false,
    (value) => value.receipt_schema.thread_resolution_binding.reply_created_at_must_be_after_final_clean_review_submitted_at = false,
    (value) => value.receipt_schema.thread_resolution_binding.reply_with_unresolved_thread_blocks = false,
    (value) => value.receipt_schema.thread_resolution_binding.resolved_with_reply_but_without_later_clean_review_blocks = false,
    (value) => value.receipt_schema.thread_resolution_binding.receipt_thread_evidence_may_override_live_thread_state = true,
    (value) => value.receipt_schema.live_state_binding.receipt_values_may_substitute_for_live_pr_review_check_thread_ruleset_merge_main_issue_or_roadmap_state = true,
    (value) => value.receipt_schema.ruleset_binding.required_name = "other",
    (value) => value.receipt_schema.ruleset_binding.required_bypass_actors.push({ actor_id: 1 }),
    (value) => value.receipt_schema.merge_binding.required_method = "merge",
    (value) => value.owner_gates.pop(),
    (value) => value.delegated_start.production_stage_allowed = true,
  ];
  for (const [index, mutate] of mutations.entries()) {
    const candidate = structuredClone(source);
    mutate(candidate);
    assert.throws(() => validateClosedContract(candidate), `mutation ${index} must fail closed`);
  }
});

test("AGENTS precedence, live tuple, and focused runner registration remain exact", async () => {
  const [agents, roadmap, runner] = await Promise.all([
    readFile("AGENTS.md", "utf8"),
    readFile("roadmap/active-program.yml", "utf8"),
    readFile("scripts/run-node-tests.mjs", "utf8"),
  ]);
  assert.ok(agents.indexOf(DECISION_PATH) < agents.indexOf("docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md"));
  assert.match(agents, /Every merge still requires actionable P0\/P1\/P2 `0\/0\/0`/);
  assert.match(agents, /No title hash, prose equality, punctuation\/case normalization/);
  assert.match(roadmap, /currentReplacementStage:\s*C2R-C-P/);
  assert.match(roadmap, /currentReplacementStageIssue:\s*703/);
  assert.match(roadmap, /c2rCPState:\s*authorized_unstarted/);
  assert.equal((runner.match(/foundation-bounded-terminal-delivery-delegation\.test\.mjs/g) ?? []).length, 1);
});
