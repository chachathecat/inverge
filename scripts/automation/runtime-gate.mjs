#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";

export const RUNTIME_EVIDENCE_SCHEMA_VERSION = "inverge.runtime_evidence.v2";
export const RUNTIME_EVIDENCE_PRODUCER_VERSION = "s233r.postgres.s233a.v1";
export const S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION =
  "s236p.postgres.owner-private.v5";
export const C2R_C_P_RUNTIME_EVIDENCE_PRODUCER_VERSION =
  "c2r-c-p.postgres.practice-trusted-repair.v2";
export const C2R_C_T_RUNTIME_EVIDENCE_PRODUCER_VERSION =
  "c2r-c-t.postgres.theory-trusted-repair.v1";
export const C2R_C_L_RUNTIME_EVIDENCE_PRODUCER_VERSION =
  "c2r-c-l.postgres.law-trusted-repair.v1";
export const WCV_C3_RUNTIME_EVIDENCE_PRODUCER_VERSION =
  "wcv-c3.postgres.durable-learning.v1";
export const RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "migration_prerequisites_and_target_applied",
  "learner_rls_two_user_isolation",
  "anonymous_read_denied",
  "cross_user_read_denied",
  "authenticated_direct_mutation_denied",
  "service_rpc_claim_transition_only",
  "fake_grader_single_execution",
  "idempotent_replay_no_duplicate_work",
  "stale_cas_transition_rejected",
  "terminal_review_mutation_rejected",
  "queue_today_atomic_namespace_restricted",
  "cleanup_complete",
]);
export const S236P_RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "ordered_migration_quadruple_applied",
  "owner_a_metadata_storage_create_read_delete_allowed",
  "bidirectional_owner_rls_isolation",
  "anonymous_access_denied",
  "authenticated_download_info_operation_scoped",
  "expiry_read_gate_enforced",
  "expiry_cleanup_delete_operations_preserved",
  "signed_access_disabled",
  "immutable_original_append_only_revision_enforced",
  "metadata_first_orphan_safe_delete_verified",
  "retention_temporary_ttl_cache_delete_sla_enforced",
  "deterministic_expiry_verified",
  "reviewed_forward_disable_recipe_verified",
  "provider_mode_none_and_external_calls_zero",
  "raw_emission_and_real_content_zero",
  "persistent_event_log_disabled",
  "cleanup_complete",
]);
export const C2R_C_P_RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "practice_migration_applied",
  "forced_rls_all_tables",
  "practice_only_subject_constraint",
  "authenticated_session_read_denied",
  "anonymous_read_denied",
  "authenticated_private_body_read_denied",
  "authenticated_direct_mutation_denied",
  "service_only_rpc_execution",
  "idempotent_create_replay_no_duplicate_work",
  "exposure_and_state_transition_atomic",
  "free_form_transition_excludes_structured_proof",
  "stale_cas_transition_rejected",
  "cleanup_complete",
]);
export const C2R_C_T_RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "theory_delta_migration_applied",
  "practice_and_theory_subject_bindings_exact",
  "forced_rls_all_tables_preserved",
  "authenticated_session_read_denied",
  "anonymous_read_denied",
  "authenticated_private_body_read_denied",
  "authenticated_direct_mutation_denied",
  "service_only_rpc_execution",
  "idempotent_theory_create_replay_no_duplicate_work",
  "free_form_transition_excludes_structured_proof",
  "stale_cas_transition_rejected",
  "practice_rows_preserved_by_theory_delta",
  "cleanup_complete",
]);
export const C2R_C_L_RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "law_delta_migration_applied",
  "practice_theory_and_law_subject_bindings_exact",
  "law_exact_proof_trigger_installed",
  "forced_rls_all_tables_preserved",
  "authenticated_session_read_denied",
  "anonymous_read_denied",
  "authenticated_private_body_read_denied",
  "authenticated_direct_mutation_denied",
  "service_only_rpc_execution",
  "idempotent_law_create_replay_no_duplicate_work",
  "unverified_law_transition_rejected",
  "practice_and_theory_rows_preserved_by_law_delta",
  "cleanup_complete",
]);
export const WCV_C3_RUNTIME_EVIDENCE_ASSERTION_IDS = Object.freeze([
  "c2_prerequisites_and_c3_delta_applied",
  "forced_rls_all_c3_tables",
  "authenticated_direct_read_denied",
  "service_only_rpc_execution",
  "verified_c2_source_required",
  "idempotent_case_create_by_source",
  "attempt_event_and_private_artifact_atomic",
  "projection_bodyless",
  "stale_cas_rejected",
  "learner_delete_receipt_and_cascade",
  "c2_source_preserved",
  "cleanup_complete",
]);
const C2R_C_P_MIGRATION_PATH =
  "supabase/migrations/20260817090000_c2r_c_p_structured_practice_proof.sql";
const C2R_C_T_MIGRATION_PATH =
  "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql";
const C2R_C_L_MIGRATION_PATH =
  "supabase/migrations/20260817170000_c2r_c_l_exact_law_applicability.sql";
const WCV_C3_MIGRATION_PATH =
  "supabase/migrations/20260817190000_wcv_c3_durable_learning_daily_command.sql";
const S236P_MIGRATION_PATHS = Object.freeze([
  "supabase/migrations/20260730025332_s236p_lean_owner_private.sql",
  "supabase/migrations/20260730060233_s236p_owner_private_lifecycle_hardening.sql",
  "supabase/migrations/20260730065744_s236p_owner_private_authenticated_download_info.sql",
  "supabase/migrations/20260730151052_s236p_owner_private_expiry_read_gate.sql",
]);

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "producerVersion",
  "status",
  "sourceLevelOnly",
  "verifiedAt",
  "pullRequestHeadSha",
  "githubRunId",
  "githubRunAttempt",
  "riskFileSha256",
  "migrations",
  "isolatedEnvironment",
  "assertions",
  "cleanup",
  "dataBoundary",
];
const MIGRATION_KEYS = ["path", "sha256"];
const ENVIRONMENT_KEYS = ["kind", "engine", "networkExposure", "syntheticUserCount"];
const ASSERTION_KEYS = ["id", "passed"];
const CLEANUP_KEYS = ["status"];
const DATA_BOUNDARY_KEYS = [
  "metadataOnly",
  "rawLearnerContentPersisted",
  "sourceTextPersisted",
  "credentialMaterialPersisted",
  "learnerIdentifiersPersisted",
  "rowBodiesPersisted",
  "providerBodiesPersisted",
];

function fail(message) {
  console.error(`runtime-gate: ${message}`);
  process.exitCode = 1;
}

function readJsonWithBytes(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file is missing: ${filePath}`);
  }

  const bytes = fs.readFileSync(filePath);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    throw new Error(`${label} file is not valid JSON: ${filePath}`);
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  let riskFile = process.env.RISK_FILE ?? ".agent-factory/risk.json";

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--risk-file" && args[index + 1]) {
      riskFile = args[index + 1];
      index += 1;
    }
  }

  return { riskFile: path.resolve(riskFile) };
}

function inferRuntimeRequirement(riskResult) {
  const changedFiles = Array.isArray(riskResult.changedFiles) ? riskResult.changedFiles : [];
  const pathRequiresRuntime = runtimeRequiredPathRecords(changedFiles).length > 0;
  return riskResult.runtimeEvidenceRequired === true || pathRequiresRuntime;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertExactKeys(value, expectedKeys, label) {
  assertPlainObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} contains missing or unknown keys.`);
  }
}

function requireString(value, label, pattern) {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function requireInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} is invalid.`);
  return value;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function expectedRuntimeContract(riskResult, headSha) {
  if (riskResult.changedFilesTruncated === true) {
    throw new Error("risk classification changed-files list is truncated.");
  }
  const changedFiles = Array.isArray(riskResult.changedFiles) ? riskResult.changedFiles : [];
  const migrationPaths = changedFiles
    .filter((file) => /^supabase\/migrations\/[^/]+\.sql$/.test(file))
    .sort();
  const runtimeRequiredPaths = runtimeRequiredPathRecords(changedFiles).map(({ path: file }) => file).sort();
  if (
    runtimeRequiredPaths.length !== migrationPaths.length ||
    runtimeRequiredPaths.some((file, index) => file !== migrationPaths[index])
  ) {
    throw new Error("no closed runtime-evidence adapter supports this runtime-sensitive change set.");
  }

  const migrations = migrationPaths.map((migrationPath) => {
    let content;
    try {
      content = execFileSync("git", ["show", `${headSha}:${migrationPath}`], {
        encoding: null,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      throw new Error(`changed migration is missing from the pull-request head: ${migrationPath}`);
    }
    return {
      content,
      path: migrationPath,
      sha256: sha256(content),
    };
  });
  let assertionIds;
  let markerSets;
  let producerVersion;
  let markerError;
  if (
    migrations.length === 1 &&
    /^supabase\/migrations\/\d+_s233a_answer_review_persistence\.sql$/.test(
      migrations[0].path,
    )
  ) {
    assertionIds = RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [[
        "claim_s233a_answer_review_v1",
        "transition_s233a_answer_review_v1",
        "s233a review queue rpc insert namespace",
        "s233a today seed rpc insert namespace",
    ]];
    markerError =
      "S233A migration does not match the supported adapter contract.";
  } else if (
    migrations.length === S236P_MIGRATION_PATHS.length &&
    migrations.every(
      (migration, index) => migration.path === S236P_MIGRATION_PATHS[index],
    )
  ) {
    assertionIds = S236P_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [
      [
        "s236p-owner-private-v1",
        "public.s236p_owner_private_objects",
        "public.s236p_owner_private_events",
        "public.s236p_authorize_signed_url_v1",
        "public.s236p_expired_object_paths_v1",
        "contains_real_content",
      ],
      [
        "s236p_owner_private_lifecycle_hardening",
        "parent_object_ref",
        "revision_number",
        "signed URL and signed-upload issuance disabled",
        "drop table if exists public.s236p_owner_private_events",
        "storage.allow_only_operation('storage.object.upload')",
      ],
      [
        "s236p_owner_private_authenticated_download_info",
        "object.get_authenticated_info",
        "storage.object.get_authenticated",
        "s236p owner private select",
      ],
      [
        "s236p_owner_private_expiry_read_gate",
        'alter policy "s236p owner private select"',
        "metadata.content_expires_at > statement_timestamp()",
        "metadata.temporary_expires_at > statement_timestamp()",
        "storage.object.delete_many",
        "Reviewed forward-disable procedure",
      ],
    ];
    markerError =
      "S236P ordered migration quadruple does not match the supported adapter contract.";
  } else if (
    migrations.length === 1 &&
    migrations[0].path === C2R_C_P_MIGRATION_PATH
  ) {
    assertionIds = C2R_C_P_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = C2R_C_P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [[
      "subject text not null check (subject = 'appraisal_practical')",
      "alter table public.wcv_c2_trusted_repair_sessions force row level security",
      "public.wcv_c2_create_trusted_repair_session_v1",
      "public.wcv_c2_apply_trusted_repair_transition_v1",
      "validator:practice-calculation-claim@2",
      "'proofEvaluation'",
    ]];
    markerError =
      "C2R-C-P Practice migration does not match the supported adapter contract.";
  } else if (
    migrations.length === 1 &&
    migrations[0].path === C2R_C_T_MIGRATION_PATH
  ) {
    assertionIds = C2R_C_T_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = C2R_C_T_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [[
      "wcv_c2_trusted_repair_sessions_subject_binding_check",
      "subject = 'appraisal_theory'",
      "validator:theory-scoped-predicate@1",
      "theory-target:synthetic-income-approach",
      "WCV_C2_STRUCTURED_THEORY_PROOF_REQUIRED",
      "create or replace function public.wcv_c2_apply_trusted_repair_transition_v1",
    ]];
    markerError =
      "C2R-C-T Theory migration does not match the supported adapter contract.";
  } else if (
    migrations.length === 1 &&
    migrations[0].path === C2R_C_L_MIGRATION_PATH
  ) {
    assertionIds = C2R_C_L_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = C2R_C_L_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [[
      "subject = 'appraisal_law'",
      "validator:law-exact-applicability@1",
      "law-source:synthetic-official-act@2026-01-01",
      "law-anchor:synthetic-official-act:article-10@2026-01-01",
      "WCV_C2_STRUCTURED_LAW_PROOF_REQUIRED",
      "wcv_c2_validate_exact_law_proof_v1",
    ]];
    markerError =
      "C2R-C-L Law migration does not match the supported adapter contract.";
  } else if (
    migrations.length === 1 &&
    migrations[0].path === WCV_C3_MIGRATION_PATH
  ) {
    assertionIds = WCV_C3_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = WCV_C3_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    markerSets = [[
      "public.wcv_c3_gap_closure_cases",
      "public.wcv_c3_private_attempt_artifacts",
      "public.wcv_c3_evidence_events",
      "public.wcv_c3_create_gap_closure_case_v1",
      "public.wcv_c3_apply_transition_v1",
      "public.wcv_c3_delete_owned_case_v1",
      "alter table public.wcv_c3_gap_closure_cases force row level security",
      "containsBody",
    ]];
    markerError =
      "WCV-C3 durable-learning migration does not match the supported adapter contract.";
  } else {
    throw new Error(
      "no closed runtime-evidence adapter supports this runtime-sensitive change set.",
    );
  }
  migrations.forEach((migration, index) => {
    const text = migration.content.toString("utf8");
    for (const marker of markerSets[index]) {
      if (!text.includes(marker)) throw new Error(markerError);
    }
  });
  return {
    assertionIds,
    migrations: migrations.map(({ path: migrationPath, sha256: digest }) => ({
      path: migrationPath,
      sha256: digest,
    })),
    producerVersion,
  };
}

export function validateRuntimeEvidence(evidence, { riskResult, riskBytes }) {
  assertExactKeys(evidence, TOP_LEVEL_KEYS, "runtime evidence");

  if (evidence.schemaVersion !== RUNTIME_EVIDENCE_SCHEMA_VERSION) {
    throw new Error(`runtime evidence schema must be ${RUNTIME_EVIDENCE_SCHEMA_VERSION}.`);
  }
  if (evidence.status !== "verified") throw new Error("runtime evidence status must be `verified`.");
  if (evidence.sourceLevelOnly !== false) {
    throw new Error("source-level evidence cannot satisfy the runtime gate.");
  }

  const verifiedAt = requireString(evidence.verifiedAt, "runtime evidence verifiedAt");
  const verifiedMs = Date.parse(verifiedAt);
  if (!Number.isFinite(verifiedMs)) throw new Error("runtime evidence verifiedAt is invalid.");
  const ageMs = Date.now() - verifiedMs;
  if (ageMs < -5 * 60_000 || ageMs > 30 * 60_000) {
    throw new Error("runtime evidence verifiedAt is stale or in the future.");
  }

  const expectedHeadSha = requireString(
    process.env.PR_HEAD_SHA,
    "PR_HEAD_SHA",
    /^[0-9a-f]{40}$/,
  ).toLowerCase();
  if (requireString(evidence.pullRequestHeadSha, "runtime evidence pullRequestHeadSha", /^[0-9a-f]{40}$/).toLowerCase() !== expectedHeadSha) {
    throw new Error("runtime evidence pull-request head SHA does not match.");
  }

  const expectedRunId = requireString(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const expectedRunAttempt = requireInteger(Number(process.env.GITHUB_RUN_ATTEMPT), "GITHUB_RUN_ATTEMPT");
  if (requireString(evidence.githubRunId, "runtime evidence githubRunId", /^\d+$/) !== expectedRunId) {
    throw new Error("runtime evidence GitHub run ID does not match.");
  }
  if (requireInteger(evidence.githubRunAttempt, "runtime evidence githubRunAttempt") !== expectedRunAttempt) {
    throw new Error("runtime evidence GitHub run attempt does not match.");
  }

  if (requireString(evidence.riskFileSha256, "runtime evidence riskFileSha256", /^[0-9a-f]{64}$/) !== sha256(riskBytes)) {
    throw new Error("runtime evidence risk-file digest does not match.");
  }

  if (!Array.isArray(evidence.migrations)) throw new Error("runtime evidence migrations must be an array.");
  const expectedContract = expectedRuntimeContract(riskResult, expectedHeadSha);
  if (evidence.producerVersion !== expectedContract.producerVersion) {
    throw new Error(
      `runtime evidence producer must be ${expectedContract.producerVersion}.`,
    );
  }
  const expectedMigrations = expectedContract.migrations;
  if (evidence.migrations.length !== expectedMigrations.length) {
    throw new Error("runtime evidence migration set does not match the risk classification.");
  }
  evidence.migrations.forEach((migration, index) => {
    assertExactKeys(migration, MIGRATION_KEYS, `runtime evidence migration ${index}`);
    if (migration.path !== expectedMigrations[index].path || migration.sha256 !== expectedMigrations[index].sha256) {
      throw new Error("runtime evidence migration path or digest does not match the pull-request head.");
    }
  });

  assertExactKeys(evidence.isolatedEnvironment, ENVIRONMENT_KEYS, "runtime evidence isolatedEnvironment");
  if (
    evidence.isolatedEnvironment.kind !== "disposable_local_postgres" ||
    evidence.isolatedEnvironment.engine !== "postgresql_15" ||
    evidence.isolatedEnvironment.networkExposure !== "none" ||
    evidence.isolatedEnvironment.syntheticUserCount !== 2
  ) {
    throw new Error("runtime evidence isolated environment is invalid.");
  }

  if (!Array.isArray(evidence.assertions)) throw new Error("runtime evidence assertions must be an array.");
  const assertionIds = evidence.assertions.map((assertion, index) => {
    assertExactKeys(assertion, ASSERTION_KEYS, `runtime evidence assertion ${index}`);
    if (assertion.passed !== true) throw new Error("runtime evidence contains a failed assertion.");
    return requireString(assertion.id, `runtime evidence assertion ${index} id`);
  });
  if (
    assertionIds.length !== expectedContract.assertionIds.length ||
    assertionIds.some(
      (id, index) => id !== expectedContract.assertionIds[index],
    )
  ) {
    throw new Error("runtime evidence required assertion set is missing, duplicated, or reordered.");
  }

  assertExactKeys(evidence.cleanup, CLEANUP_KEYS, "runtime evidence cleanup");
  if (evidence.cleanup.status !== "complete") throw new Error("runtime evidence cleanup is incomplete.");

  assertExactKeys(evidence.dataBoundary, DATA_BOUNDARY_KEYS, "runtime evidence dataBoundary");
  if (
    evidence.dataBoundary.metadataOnly !== true ||
    DATA_BOUNDARY_KEYS.slice(1).some((key) => evidence.dataBoundary[key] !== false)
  ) {
    throw new Error("runtime evidence data boundary is invalid.");
  }
}

function writeStatus(status) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`, "utf8");
  }
  console.log(JSON.stringify({ status }));
}

function main() {
  const { riskFile } = parseArguments();
  const { bytes: riskBytes, value: riskResult } = readJsonWithBytes(riskFile, "risk classification");
  const runtimeRequired = inferRuntimeRequirement(riskResult);

  if (!runtimeRequired) {
    writeStatus("not_required");
    return;
  }

  const evidencePath = process.env.RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) {
    throw new Error("runtime evidence is required, but RUNTIME_EVIDENCE_PATH is not set.");
  }

  const { value: evidence } = readJsonWithBytes(path.resolve(evidencePath), "runtime evidence");
  validateRuntimeEvidence(evidence, { riskResult, riskBytes });
  writeStatus("verified");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
