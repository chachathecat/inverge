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
const PULL_REQUEST_RULE_PARAMETERS = {
  allowed_merge_methods: ["squash"],
  required_approving_review_count: 0,
  required_review_thread_resolution: true,
  dismiss_stale_reviews_on_push: false,
  require_code_owner_review: false,
  require_last_push_approval: false,
  required_reviewers: [],
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
  "rights_unclear_content",
  "public_release_or_domain_promotion",
  "destructive_or_irreversible_data_operation",
  "material_product_scope_change",
  "unresolved_p0_or_p1_after_source_correction_budget",
];

const RECEIPT_FIELDS = [
  "repository",
  "issue_number",
  "pull_request_number",
  "base_sha",
  "expected_head_sha",
  "reviewed_head_sha",
  "remote_head_sha",
  "merge_sha",
  "merge_parent_sha",
  "candidate_tree_sha",
  "merge_tree_sha",
  "merge_method",
  "exact_head_checks",
  "all_required_exact_head_checks_successful",
  "review_counts",
  "all_threads_resolved",
  "ruleset_name",
  "ruleset_enforcement",
  "ruleset_bypass_actor_count",
  "ruleset_rule_types",
  "ruleset_pull_request_parameters",
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
  exactMembers(contract.owner_gates, OWNER_GATES, "Owner gates");
  exactMembers(contract.receipt_schema.required_fields, RECEIPT_FIELDS, "receipt fields");
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
  assert.equal(contract.delivery_sequence.length, 16);
  assert.equal(contract.delivery_sequence[0], "refresh_live_main_github_authority_dependencies_and_writer_state");
  assert.equal(contract.delivery_sequence.at(-1), "release_writer_and_start_next_dependency_ready_non_production_stage");
  assert.equal(contract.correction_policy.maximum_source_corrections_per_pr, 2);
  assert.equal(contract.correction_policy.pr_body_metadata_only_correction_counts_as_source_correction, false);
  assert.equal(contract.correction_policy.unresolved_p0_or_p1_after_budget_requires_owner, true);
  assert.equal(contract.correction_policy.unresolved_p2_blocks_merge, true);
  assert.equal(contract.correction_policy.test_weakening_or_deletion_allowed, false);
  assert.deepEqual(contract.review_policy.actionable_severities, ["P0", "P1", "P2"]);
  assert.deepEqual(contract.review_policy.required_premerge_counts, { P0: 0, P1: 0, P2: 0 });
  assert.equal(contract.review_policy.prior_head_review_reusable_after_source_change, false);
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
  exactMembers(receipt.exact_head_checks_binding.required_names, REQUIRED_CHECKS, "receipt check names");
  assert.equal(receipt.exact_head_checks_binding.required_conclusion, "success");
  assert.equal(receipt.exact_head_checks_binding.check_head_must_equal_expected_head, true);
  assert.equal(receipt.exact_head_checks_binding.missing_pending_skipped_cancelled_or_unsuccessful_blocks, true);
  exactMembers(receipt.ruleset_binding.required_rule_types, merge.required_rules, "receipt ruleset types");
  assert.deepEqual(receipt.ruleset_binding.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
  assert.deepEqual(receipt.ruleset_binding.pull_request_rule_parameters, merge.pull_request_rule_parameters);
  assert.equal(receipt.metadata_only, true);
  assert.equal(receipt.raw_diff_or_source_body_allowed, false);
  assert.equal(receipt.raw_learner_or_ocr_content_allowed, false);
  assert.equal(receipt.secret_or_credential_allowed, false);
});

test("synchronizes branch, PR, issue, roadmap and current stage without receipt substitution", async () => {
  const { synchronization_policy: sync } = await readContract();
  assert.equal(sync.branch_commit_push_pr_body_same_head_required, true);
  assert.equal(sync.exactly_one_issue_closing_reference_required, true);
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
    (value) => value.correction_policy.maximum_source_corrections_per_pr = 3,
    (value) => value.review_policy.required_premerge_counts.P1 = 1,
    (value) => value.merge_policy.all_required_exact_head_checks_must_succeed = false,
    (value) => value.merge_policy.pull_request_rule_parameters.required_review_thread_resolution = false,
    (value) => value.receipt_schema.required_fields.pop(),
    (value) => value.receipt_schema.exact_head_checks_binding.required_conclusion = "neutral",
    (value) => value.receipt_schema.ruleset_binding.pull_request_rule_parameters.allowed_merge_methods = ["merge"],
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
      assert.equal(candidate.correction_policy.maximum_source_corrections_per_pr, 2);
      assert.deepEqual(candidate.review_policy.required_premerge_counts, { P0: 0, P1: 0, P2: 0 });
      assert.equal(candidate.merge_policy.all_required_exact_head_checks_must_succeed, true);
      assert.deepEqual(candidate.merge_policy.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
      assert.equal(candidate.receipt_schema.exact_head_checks_binding.required_conclusion, "success");
      assert.deepEqual(candidate.receipt_schema.ruleset_binding.pull_request_rule_parameters, PULL_REQUEST_RULE_PARAMETERS);
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
