#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";
import {
  isOracleRiskCandidate,
  producePostgresSecurityOracleEvidence,
} from "./wcv-c3-pre-p-postgresql-security-state-oracle.mjs";
import {
  isC3RPRiskCandidate,
  produceC3RPNativeEvidence,
} from "./wcv-c3r-p-practice-common-runtime.mjs";

export const SCHEMA_VERSION = "inverge.runtime_evidence.v2";
export const PRODUCER_VERSION = "s233r.postgres.s233a.v1";
export const S236P_PRODUCER_VERSION = "s236p.postgres.owner-private.v5";
export const C2R_C_P_PRODUCER_VERSION =
  "c2r-c-p.postgres.practice-trusted-repair.v2";
export const C2R_C_T_PRODUCER_VERSION =
  "c2r-c-t.postgres.theory-trusted-repair.v1";
export const C2R_C_L_PRODUCER_VERSION =
  "c2r-c-l.postgres.law-trusted-repair.v1";
export const POSTGRES_IMAGE = "postgres:15.8-bookworm";
export const ASSERTION_IDS = Object.freeze([
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
export const S236P_ASSERTION_IDS = Object.freeze([
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
export const C2R_C_P_ASSERTION_IDS = Object.freeze([
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
export const C2R_C_T_ASSERTION_IDS = Object.freeze([
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
export const C2R_C_L_ASSERTION_IDS = Object.freeze([
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
export const C2R_C_P_MIGRATION_PATH =
  "supabase/migrations/20260817090000_c2r_c_p_structured_practice_proof.sql";
export const C2R_C_T_MIGRATION_PATH =
  "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql";
export const C2R_C_L_MIGRATION_PATH =
  "supabase/migrations/20260817170000_c2r_c_l_exact_law_applicability.sql";
export const S236P_MIGRATION_PATHS = Object.freeze([
  "supabase/migrations/20260730025332_s236p_lean_owner_private.sql",
  "supabase/migrations/20260730060233_s236p_owner_private_lifecycle_hardening.sql",
  "supabase/migrations/20260730065744_s236p_owner_private_authenticated_download_info.sql",
  "supabase/migrations/20260730151052_s236p_owner_private_expiry_read_gate.sql",
]);
export const S236P_MIGRATION_PATH = S236P_MIGRATION_PATHS[0];
export const PREREQUISITE_MIGRATIONS = Object.freeze([
  "supabase/migrations/20260422_inverge_service_core.sql",
  "supabase/migrations/20260423_inverge_service_role_grants.sql",
  "supabase/migrations/20260424_review_os_alpha.sql",
  "supabase/migrations/20260605_create_personal_concept_nodes.sql",
  "supabase/migrations/20260623_personal_concept_graph_atomic_transition.sql",
  "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
]);

export function shouldRunFakeGrader(claimStatus) {
  return claimStatus === "claimed" || claimStatus === "retry_claimed";
}

export function s236pMigrationExecutionSteps(migrations) {
  if (
    !Array.isArray(migrations) ||
    migrations.length !== S236P_MIGRATION_PATHS.length
  ) {
    throw new Error("S236P execution requires the exact migration quadruple.");
  }
  return migrations.flatMap((migration, index) => [
    {
      label: `ordered S236P migration ${index + 1}`,
      migration,
    },
    {
      label: `idempotent ordered S236P migration replay ${index + 1}`,
      migration,
    },
  ]);
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const REVIEW_ID = "s233r-review-a";
const IDEMPOTENCY_KEY = "s233r-idempotency-a";
const INPUT_FINGERPRINT = "a".repeat(64);
const QUEUE_ID = "s233r-queue-a";
const FAILED_QUEUE_ID = "s233r-queue-atomic-failure";
const TODAY_ID = "33333333-3333-4333-8333-333333333333";
const CONFLICT_TODAY_ID = "44444444-4444-4444-8444-444444444444";
const S236P_USER_A = "55555555-5555-4555-8555-555555555555";
const S236P_USER_B = "66666666-6666-4666-8666-666666666666";
const S236P_VAULT_A = "77777777-7777-4777-8777-777777777777";
const S236P_VAULT_B = "88888888-8888-4888-8888-888888888888";
const S236P_OBJECT_A = "99999999-9999-4999-8999-999999999999";
const S236P_OBJECT_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const S236P_TEMP_OBJECT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const S236P_REVISION_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const S236P_ORPHAN_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const S236P_EXPIRY_CONTENT_OBJECT =
  "e1111111-1111-4111-8111-111111111111";
const S236P_EXPIRY_TEMPORARY_OBJECT =
  "e2222222-2222-4222-8222-222222222222";
const S236P_DELETE_REQUESTED_OBJECT =
  "e3333333-3333-4333-8333-333333333333";
const S236P_EXPIRY_BOUNDARY_OBJECT =
  "e4444444-4444-4444-8444-444444444444";
const S236P_METADATA_MISSING_OBJECT =
  "e5555555-5555-4555-8555-555555555555";
const S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS = Object.freeze([
  S236P_OBJECT_A,
  S236P_REVISION_A,
  S236P_TEMP_OBJECT,
]);
const C2R_C_P_SESSION_A = "c1111111-1111-4111-8111-111111111111";
const C2R_C_P_SESSION_B = "c2222222-2222-4222-8222-222222222222";
const C2R_C_P_SESSION_C = "c7777777-7777-4777-8777-777777777777";
const C2R_C_P_ARTIFACT_A = "c3333333-3333-4333-8333-333333333333";
const C2R_C_P_ARTIFACT_B = "c4444444-4444-4444-8444-444444444444";
const C2R_C_P_ARTIFACT_C = "c8888888-8888-4888-8888-888888888888";
const C2R_C_P_CREATE_COMMAND_A = "c5555555-5555-4555-8555-555555555555";
const C2R_C_P_CREATE_COMMAND_B = "c6666666-6666-4666-8666-666666666666";
const C2R_C_P_CREATE_COMMAND_C = "c9999999-9999-4999-8999-999999999999";
const C2R_C_P_TRANSITION_COMMAND_A = "c7777777-7777-4777-8777-777777777777";
const C2R_C_P_STALE_COMMAND_A = "c8888888-8888-4888-8888-888888888888";
const C2R_C_P_ATOMIC_COMMAND_A = "c9999999-9999-4999-8999-999999999999";
const C2R_C_P_EXPOSURE_A = "caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const C2R_C_P_MISSING_REVISION = "cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  console.error(`runtime-evidence-producer: ${message}`);
  process.exitCode = 1;
}

function safeToken(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function readJsonWithBytes(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} file is missing.`);
  const bytes = fs.readFileSync(filePath);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    throw new Error(`${label} file is not valid JSON.`);
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  let riskFile = process.env.RISK_FILE ?? ".agent-factory/risk.json";
  let cleanupOnly = false;
  let requireComplete = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--risk-file" && args[index + 1]) {
      riskFile = args[index + 1];
      index += 1;
    } else if (args[index] === "--cleanup") {
      cleanupOnly = true;
    } else if (args[index] === "--require-complete") {
      requireComplete = true;
    }
  }
  return { cleanupOnly, requireComplete, riskFile: path.resolve(riskFile) };
}

function executionContext() {
  const headSha = safeToken(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", /^[0-9a-f]{40}$/);
  const runId = safeToken(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const runAttemptText = safeToken(process.env.GITHUB_RUN_ATTEMPT, "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const runAttempt = Number(runAttemptText);
  if (!Number.isSafeInteger(runAttempt) || runAttempt < 1) throw new Error("GITHUB_RUN_ATTEMPT is invalid.");
  return {
    containerName: `inverge-runtime-${runId}-${runAttemptText}`,
    headSha: headSha.toLowerCase(),
    runAttempt,
    runId,
  };
}

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    ...options,
  });
}

function cleanupContainer(containerName) {
  docker(["rm", "--force", containerName]);
  const inspected = docker(["inspect", containerName]);
  if (inspected.status === 0) return false;
  return inspected.status !== null && /no such (?:object|container)/i.test(inspected.stderr);
}

function startContainer(containerName) {
  if (!cleanupContainer(containerName)) throw new Error("isolated Postgres preflight cleanup is incomplete.");
  const started = docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    POSTGRES_IMAGE,
  ]);
  if (started.status !== 0) throw new Error("isolated Postgres failed to start.");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = docker([
      "exec",
      containerName,
      "pg_isready",
      "--host",
      "127.0.0.1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ]);
    if (ready.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error("isolated Postgres did not become ready.");
}

function psql(containerName, sql, { allowFailure = false } = {}) {
  const result = docker(
    [
      "exec",
      "--interactive",
      containerName,
      "psql",
      "--host",
      "127.0.0.1",
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ],
    { input: sql },
  );
  if (!allowFailure && result.status !== 0) throw new Error("isolated Postgres statement failed.");
  return result;
}

function applySql(containerName, sql, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  if (result.status !== 0) throw new Error(`${label} failed to apply.`);
}

function scalar(containerName, sql, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  if (result.status !== 0) throw new Error(`${label} failed.`);
  const values = result.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (values.length !== 1) throw new Error(`${label} returned an invalid result shape.`);
  return values[0];
}

function assertScalar(containerName, sql, expected, label) {
  if (scalar(containerName, sql, label) !== expected) throw new Error(`${label} did not pass.`);
}

function assertSqlDenied(containerName, sql, expectedPattern, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  const diagnostic = `${result.stderr}\n${result.stdout}`;
  if (result.status === 0 || !expectedPattern.test(diagnostic)) throw new Error(`${label} did not fail closed.`);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function ownerRef(userId) {
  return `learner-${sha256(`s233a-owner-ref:${userId}`).slice(0, 32)}`;
}

function identity(version, expectedPreviousVersion, overall) {
  return {
    reviewId: REVIEW_ID,
    learnerOwnerRefId: ownerRef(USER_A),
    reviewRecordVersion: version,
    expectedPreviousReviewRecordVersion: expectedPreviousVersion,
    idempotency: { key: IDEMPOTENCY_KEY, inputFingerprint: INPUT_FINGERPRINT },
    stageStatus: { overall },
    queueTodayLinkage: { reviewQueueItemId: QUEUE_ID, todayPlanTaskId: TODAY_ID },
    rewriteRegradeLineage: { predecessorReviewId: null },
    dataBoundary: { metadataOnly: true, containsRawContent: false },
  };
}

function claimSql(reviewIdentity) {
  return `
    begin;
    set local role service_role;
    select claim_status
      from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(reviewIdentity)}, ${sqlLiteral("receipt-claim-a")}
      );
    commit;
  `;
}

function transitionSql({
  expectedVersion,
  nextIdentity,
  evaluationContext = null,
  evidenceBundles = [],
  conceptTransitions = [],
  queueLinkage = null,
  receiptId,
}) {
  const nullableJson = (value) => value === null ? "null::jsonb" : jsonLiteral(value);
  return `
    begin;
    set local role service_role;
    select result.review_identity ->> 'reviewRecordVersion'
      from public.transition_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${expectedVersion},
        ${jsonLiteral(nextIdentity)}, ${nullableJson(evaluationContext)}, ${jsonLiteral(evidenceBundles)},
        ${jsonLiteral(conceptTransitions)}, ${nullableJson(queueLinkage)}, ${sqlLiteral(receiptId)}
      ) as result;
    commit;
  `;
}

function storageOperationHeader(operation) {
  return operation
    ? `set local "request.headers" to ${sqlLiteral(JSON.stringify({
        "x-supabase-storage-operation": operation,
      }))};`
    : "";
}

function authenticatedContext(userId, statement, operation = null) {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" to ${sqlLiteral(userId)};
    ${storageOperationHeader(operation)}
    ${statement}
    rollback;
  `;
}

function anonymousContext(statement, operation = null) {
  return `begin; set local role anon; ${storageOperationHeader(operation)} ${statement} rollback;`;
}

function gitBlob(headSha, filePath) {
  try {
    return execFileSync("git", ["show", `${headSha}:${filePath}`], {
      encoding: null,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(`required pull-request file is missing: ${filePath}`);
  }
}

export function resolveTargetMigration(riskResult, headSha) {
  if (riskResult.changedFilesTruncated === true || !Array.isArray(riskResult.changedFiles)) {
    throw new Error("risk classification cannot bind the complete changed-file set.");
  }
  const migrationPaths = riskResult.changedFiles
    .filter((file) => /^supabase\/migrations\/[^/]+\.sql$/.test(file))
    .sort();
  const runtimeRequiredPaths = runtimeRequiredPathRecords(riskResult.changedFiles)
    .map(({ path: file }) => file)
    .sort();
  if (
    runtimeRequiredPaths.length !== migrationPaths.length ||
    runtimeRequiredPaths.some((file, index) => file !== migrationPaths[index])
  ) {
    throw new Error("no closed runtime-evidence adapter supports this runtime-sensitive change set.");
  }

  let adapter;
  let markerSets;
  let markerError;
  if (
    migrationPaths.length === 1 &&
    /^supabase\/migrations\/\d+_s233a_answer_review_persistence\.sql$/.test(
      migrationPaths[0],
    )
  ) {
    adapter = "s233a";
    markerSets = [[
        "claim_s233a_answer_review_v1",
        "transition_s233a_answer_review_v1",
        "s233a review queue rpc insert namespace",
        "s233a today seed rpc insert namespace",
    ]];
    markerError = "S233A migration does not match the supported adapter contract.";
  } else if (
    migrationPaths.length === S236P_MIGRATION_PATHS.length &&
    migrationPaths.every(
      (migrationPath, index) =>
        migrationPath === S236P_MIGRATION_PATHS[index],
    )
  ) {
    adapter = "s236p";
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
    migrationPaths.length === 1 &&
    migrationPaths[0] === C2R_C_P_MIGRATION_PATH
  ) {
    adapter = "c2r-c-p";
    markerSets = [[
      "subject text not null check (subject = 'appraisal_practical')",
      "alter table public.wcv_c2_trusted_repair_sessions force row level security",
      "public.wcv_c2_create_trusted_repair_session_v1",
      "public.wcv_c2_apply_trusted_repair_transition_v1",
      "validator:practice-calculation-claim@2",
      "'structuredClaim'",
      "'proofEvaluation'",
      "WCV_C2_STRUCTURED_PROOF_REQUIRED",
    ]];
    markerError =
      "C2R-C-P Practice migration does not match the supported adapter contract.";
  } else if (
    migrationPaths.length === 1 &&
    migrationPaths[0] === C2R_C_T_MIGRATION_PATH
  ) {
    adapter = "c2r-c-t";
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
    migrationPaths.length === 1 &&
    migrationPaths[0] === C2R_C_L_MIGRATION_PATH
  ) {
    adapter = "c2r-c-l";
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
  } else {
    throw new Error("no closed runtime-evidence adapter supports this runtime-sensitive change set.");
  }

  const migrations = migrationPaths.map((migrationPath, index) => {
    const content = gitBlob(headSha, migrationPath);
    const text = content.toString("utf8");
    for (const requiredMarker of markerSets[index]) {
      if (!text.includes(requiredMarker)) throw new Error(markerError);
    }
    return {
      content,
      path: migrationPath,
      sha256: sha256(content),
    };
  });
  if (adapter === "s233a") {
    return { adapter, ...migrations[0], migrations };
  }
  if (adapter === "c2r-c-t" || adapter === "c2r-c-l") {
    const practicePrerequisiteContent = gitBlob(
      headSha,
      C2R_C_P_MIGRATION_PATH,
    );
    const result = {
      adapter,
      migrations,
      practicePrerequisite: {
        content: practicePrerequisiteContent,
        path: C2R_C_P_MIGRATION_PATH,
        sha256: sha256(practicePrerequisiteContent),
      },
    };
    if (adapter === "c2r-c-l") {
      const theoryPrerequisiteContent = gitBlob(
        headSha,
        C2R_C_T_MIGRATION_PATH,
      );
      return {
        ...result,
        theoryPrerequisite: {
          content: theoryPrerequisiteContent,
          path: C2R_C_T_MIGRATION_PATH,
          sha256: sha256(theoryPrerequisiteContent),
        },
      };
    }
    return result;
  }
  return { adapter, migrations };
}

function evidenceContract(targetMigration) {
  if (targetMigration.adapter === "s236p") {
    return {
      assertionIds: S236P_ASSERTION_IDS,
      producerVersion: S236P_PRODUCER_VERSION,
    };
  }
  if (targetMigration.adapter === "c2r-c-p") {
    return {
      assertionIds: C2R_C_P_ASSERTION_IDS,
      producerVersion: C2R_C_P_PRODUCER_VERSION,
    };
  }
  if (targetMigration.adapter === "c2r-c-t") {
    return {
      assertionIds: C2R_C_T_ASSERTION_IDS,
      producerVersion: C2R_C_T_PRODUCER_VERSION,
    };
  }
  if (targetMigration.adapter === "c2r-c-l") {
    return {
      assertionIds: C2R_C_L_ASSERTION_IDS,
      producerVersion: C2R_C_L_PRODUCER_VERSION,
    };
  }
  return {
    assertionIds: ASSERTION_IDS,
    producerVersion: PRODUCER_VERSION,
  };
}

function bootstrapSql() {
  return `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create extension pgcrypto with schema extensions;
    grant usage on schema extensions to service_role;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid
      language sql stable
      set search_path = ''
      as $$
        select coalesce(
          nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
          nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid
      $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    insert into auth.users (id) values (${sqlLiteral(USER_A)}), (${sqlLiteral(USER_B)});
  `;
}

function runS233ADatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  applySql(containerName, bootstrapSql(), "isolated Supabase role bootstrap");
  for (const migrationPath of PREREQUISITE_MIGRATIONS) {
    applySql(containerName, fs.readFileSync(path.resolve(migrationPath), "utf8"), `prerequisite ${migrationPath}`);
  }
  applySql(containerName, targetMigration.content, "pull-request migration");
  assertScalar(
    containerName,
    "select count(*)::text from pg_proc where proname in ('claim_s233a_answer_review_v1', 'transition_s233a_answer_review_v1');",
    "2",
    "migration application assertion",
  );
  passedAssertions.add("migration_prerequisites_and_target_applied");

  let fakeGraderCalls = 0;
  const fakeGrader = () => {
    fakeGraderCalls += 1;
    return { schemaVersion: "fake-deterministic-grader.v1", disposition: "verified", metadataOnly: true };
  };
  const gradeForClaim = (claimStatus) => shouldRunFakeGrader(claimStatus) ? fakeGrader() : null;
  const pendingV1 = identity(1, null, "pending");
  const initialClaimStatus = scalar(containerName, claimSql(pendingV1), "service claim assertion");
  if (initialClaimStatus !== "claimed") throw new Error("service claim assertion did not pass.");
  const fakeEvaluation = gradeForClaim(initialClaimStatus);
  if (!fakeEvaluation) throw new Error("owned claim did not execute the fake deterministic grader.");
  const activeReplayStatus = scalar(containerName, claimSql(pendingV1), "active replay assertion");
  if (activeReplayStatus !== "in_progress" || gradeForClaim(activeReplayStatus) !== null) {
    throw new Error("active replay attempted duplicate grading.");
  }

  const partialV2 = identity(2, 1, "partial");
  assertScalar(
    containerName,
    transitionSql({ expectedVersion: 1, nextIdentity: partialV2, receiptId: "receipt-partial-a" }),
    "2",
    "partial transition assertion",
  );
  assertSqlDenied(
    containerName,
    transitionSql({ expectedVersion: 1, nextIdentity: partialV2, receiptId: "receipt-stale-a" }),
    /s233a_cas_conflict/,
    "stale CAS assertion",
  );
  passedAssertions.add("stale_cas_transition_rejected");

  assertScalar(
    containerName,
    authenticatedContext(USER_A, "select count(*)::text from public.s233a_answer_reviews;"),
    "1",
    "learner A own read assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(USER_B, "select count(*)::text from public.s233a_answer_reviews;"),
    "0",
    "learner B isolation assertion",
  );
  passedAssertions.add("learner_rls_two_user_isolation");
  passedAssertions.add("cross_user_read_denied");
  assertSqlDenied(
    containerName,
    anonymousContext("select count(*) from public.s233a_answer_reviews;"),
    /permission denied/,
    "anonymous read assertion",
  );
  passedAssertions.add("anonymous_read_denied");
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `update public.s233a_answer_reviews set record_version = 99 where review_id = ${sqlLiteral(REVIEW_ID)};`,
    ),
    /permission denied/,
    "authenticated direct mutation assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.s233a_answer_reviews (
        user_id, review_id, idempotency_key, input_fingerprint, record_version,
        review_identity, persistence_receipt_id
      ) values (
        ${sqlLiteral(USER_A)}, 'forged-review', 'forged-idempotency', ${sqlLiteral("b".repeat(64))},
        1, ${jsonLiteral(pendingV1)}, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "authenticated direct insert assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `delete from public.s233a_answer_reviews where review_id = ${sqlLiteral(REVIEW_ID)};`,
    ),
    /permission denied/,
    "authenticated direct delete assertion",
  );
  passedAssertions.add("authenticated_direct_mutation_denied");
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `select claim_status from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(pendingV1)}, ${sqlLiteral("receipt-forged-a")}
      );`,
    ),
    /permission denied/,
    "authenticated RPC assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `select * from public.transition_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, 1, '{}'::jsonb, null::jsonb,
        '[]'::jsonb, '[]'::jsonb, null::jsonb, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "authenticated transition RPC assertion",
  );
  assertSqlDenied(
    containerName,
    anonymousContext(
      `select claim_status from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(pendingV1)}, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "anonymous RPC assertion",
  );
  passedAssertions.add("service_rpc_claim_transition_only");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.review_queue_items (
        id, user_id, exam_id, subject_id, stage, source_kind, status
      ) values ('forged-s233a-queue', ${sqlLiteral(USER_A)}, 'appraiser_second', 'law', 'answer_review', 's233a_answer_review', 'pending');`,
    ),
    /row-level security/,
    "Queue namespace assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.action_seeds (
        id, user_id, source_type, seed_type, rendered_text
      ) values ('55555555-5555-4555-8555-555555555555', ${sqlLiteral(USER_A)}, 's233a_answer_review', 'rewrite', 'synthetic-action');`,
    ),
    /row-level security/,
    "Today namespace assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      USER_A,
      `with inserted as (
        insert into public.review_queue_items (
          id, user_id, exam_id, subject_id, stage, source_kind, status
        ) values ('allowed-non-s233a-queue', ${sqlLiteral(USER_A)}, 'appraiser_second', 'law', 'review', 'submission', 'pending')
        returning 1
      ) select count(*)::text from inserted;`,
    ),
    "1",
    "non-S233A namespace preservation assertion",
  );

  applySql(
    containerName,
    `insert into public.action_seeds (
      id, user_id, source_type, seed_type, rendered_text
    ) values (${sqlLiteral(CONFLICT_TODAY_ID)}, ${sqlLiteral(USER_A)}, 'runtime_fixture', 'fixture', 'synthetic-fixture');`,
    "atomicity fixture",
  );

  const terminalV3 = identity(3, 2, "completed");
  const evidenceBundle = {
    record: {
      emitter: "lane_a",
      state: "detected",
      containsRawContent: false,
      learnerOwnerRefId: ownerRef(USER_A),
      learnerReviewId: REVIEW_ID,
      evidenceStateId: "s233r-evidence-a",
    },
  };
  const conceptTransition = {
    eventId: "s233r-concept-event-a",
    subjectId: "law",
    unitId: "s233r-unit-a",
    taskType: "rewrite",
    result: "correct",
    confidence: "high",
    occurredAt: "2026-07-21T00:00:00.000Z",
    containsRawContent: false,
  };
  const queueLinkage = {
    containsRawContent: false,
    reviewId: REVIEW_ID,
    reviewQueueItemId: QUEUE_ID,
    todayPlanTaskId: TODAY_ID,
    subject: "law",
    answerSubmissionId: "s233r-submission-a",
    priorityScore: 1,
    skillId: "s233r-skill-a",
    actionType: "rewrite",
    dueAt: "2026-07-22T00:00:00.000Z",
    renderedText: "synthetic-next-action",
  };
  const failingQueueLinkage = {
    ...queueLinkage,
    reviewQueueItemId: FAILED_QUEUE_ID,
    todayPlanTaskId: CONFLICT_TODAY_ID,
  };
  const failingIdentity = {
    ...terminalV3,
    queueTodayLinkage: {
      reviewQueueItemId: FAILED_QUEUE_ID,
      todayPlanTaskId: CONFLICT_TODAY_ID,
    },
  };

  assertSqlDenied(
    containerName,
    transitionSql({
      expectedVersion: 2,
      nextIdentity: failingIdentity,
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [conceptTransition],
      queueLinkage: failingQueueLinkage,
      receiptId: "receipt-atomic-failure-a",
    }),
    /duplicate key/,
    "Queue and Today atomic rollback assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select record_version from public.s233a_answer_reviews where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(FAILED_QUEUE_ID)})
    );`,
    "2:2:0:0:0",
    "atomic rollback persistence assertion",
  );
  const failedTransitionReplayStatus = scalar(
    containerName,
    claimSql(pendingV1),
    "failed-transition replay claim assertion",
  );
  if (
    failedTransitionReplayStatus !== "in_progress" ||
    gradeForClaim(failedTransitionReplayStatus) !== null
  ) {
    throw new Error("failed-transition replay attempted duplicate grading.");
  }
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(FAILED_QUEUE_ID)})
    );`,
    "2:0:0:0",
    "failed-transition replay persistence assertion",
  );

  assertScalar(
    containerName,
    transitionSql({
      expectedVersion: 2,
      nextIdentity: terminalV3,
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [conceptTransition],
      queueLinkage,
      receiptId: "receipt-terminal-a",
    }),
    "3",
    "terminal transition assertion",
  );
  assertSqlDenied(
    containerName,
    transitionSql({
      expectedVersion: 3,
      nextIdentity: identity(4, 3, "completed"),
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [],
      queueLinkage,
      receiptId: "receipt-terminal-mutation-a",
    }),
    /s233a_cas_conflict/,
    "terminal immutability assertion",
  );
  passedAssertions.add("terminal_review_mutation_rejected");

  const replayStatus = scalar(containerName, claimSql(pendingV1), "terminal replay assertion");
  if (replayStatus !== "replayed") throw new Error("terminal replay did not converge.");
  if (gradeForClaim(replayStatus) !== null) throw new Error("terminal replay attempted duplicate grading.");
  if (fakeGraderCalls !== 1) throw new Error("fake deterministic grader execution count is invalid.");
  passedAssertions.add("fake_grader_single_execution");
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(QUEUE_ID)}),
      (select count(*) from public.action_seeds where id = ${sqlLiteral(TODAY_ID)})
    );`,
    "3:1:1:1:1",
    "idempotent persistence assertion",
  );
  passedAssertions.add("idempotent_replay_no_duplicate_work");
  passedAssertions.add("queue_today_atomic_namespace_restricted");
  return passedAssertions;
}

function authenticatedCommitContext(userId, statement, operation = null) {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" to ${sqlLiteral(userId)};
    ${storageOperationHeader(operation)}
    ${statement}
    commit;
  `;
}

function s236pBootstrapSql() {
  return `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create schema storage;
    create extension pgcrypto with schema extensions;
    alter database postgres set search_path = public, extensions;

    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid
      language sql stable
      set search_path = ''
      as $$
        select coalesce(
          nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
          nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid
      $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    create function storage.allow_only_operation(expected text)
    returns boolean
    language sql stable
    set search_path = ''
    as $$
      select coalesce(
        nullif(pg_catalog.current_setting('request.headers', true), ''),
        '{}'
      )::jsonb ->> 'x-supabase-storage-operation' = expected
    $$;
    create function storage.allow_any_operation(expected text[])
    returns boolean
    language sql stable
    set search_path = ''
    as $$
      select (
        coalesce(
          nullif(pg_catalog.current_setting('request.headers', true), ''),
          '{}'
        )::jsonb ->> 'x-supabase-storage-operation'
      ) = any(expected)
    $$;
    grant execute on function storage.allow_only_operation(text)
      to anon, authenticated, service_role;
    grant execute on function storage.allow_any_operation(text[])
      to anon, authenticated, service_role;

    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default extensions.gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null,
      owner_id text,
      metadata jsonb not null default '{}'::jsonb,
      unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select, insert, update, delete on table storage.objects
      to anon, authenticated, service_role;
    grant select, insert, update, delete on table storage.buckets
      to service_role;

    insert into auth.users (id)
    values (${sqlLiteral(S236P_USER_A)}), (${sqlLiteral(S236P_USER_B)});
  `;
}

function s236pStoragePath(vaultId, objectId, storageClass = "private") {
  return storageClass === "temporary"
    ? `${vaultId}/temporary/${objectId}`
    : `${vaultId}/${objectId}`;
}

function s236pObjectInsertStatement({
  objectId,
  ownerId,
  vaultId,
  storageClass = "private",
  parentObjectId = null,
  revisionNumber = parentObjectId === null ? 1 : 2,
  contentRetentionDays = 365,
  temporaryTtlSeconds = storageClass === "temporary" ? 300 : 0,
  applicationCacheTtlSeconds = 0,
  exportDeleteSlaSeconds = 604800,
  providerMode = "none",
  providerCalls = 0,
  rawEmissions = 0,
  containsRealContent = false,
}) {
  return `
    insert into public.s236p_owner_private_objects (
      object_ref,
      owner_id,
      parent_object_ref,
      revision_number,
      bucket_id,
      storage_path,
      storage_class,
      object_state,
      object_version,
      content_retention_days,
      temporary_ttl_seconds,
      application_cache_ttl_seconds,
      export_delete_sla_seconds,
      ocr_ai_provider_mode,
      external_ocr_ai_provider_call_count,
      raw_external_emission_count,
      contains_real_content
    ) values (
      ${sqlLiteral(objectId)}::uuid,
      ${sqlLiteral(ownerId)}::uuid,
      ${parentObjectId === null ? "null" : `${sqlLiteral(parentObjectId)}::uuid`},
      ${revisionNumber},
      's236p-owner-private-v1',
      ${sqlLiteral(s236pStoragePath(vaultId, objectId, storageClass))},
      ${sqlLiteral(storageClass)},
      'active',
      1,
      ${contentRetentionDays},
      ${temporaryTtlSeconds},
      ${applicationCacheTtlSeconds},
      ${exportDeleteSlaSeconds},
      ${sqlLiteral(providerMode)},
      ${providerCalls},
      ${rawEmissions},
      ${containsRealContent ? "true" : "false"}
    );
  `;
}

function s236pStorageInsertStatement({
  objectId,
  ownerId,
  vaultId,
  storageClass = "private",
}) {
  return `
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      's236p-owner-private-v1',
      ${sqlLiteral(s236pStoragePath(vaultId, objectId, storageClass))},
      ${sqlLiteral(ownerId)},
      '{"cacheControl":"0","synthetic":true}'::jsonb
    );
  `;
}

function s236pBoundaryReadStatement(operation, offsetExpression) {
  const boundaryPath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_EXPIRY_BOUNDARY_OBJECT,
  );
  return `
    begin;
    grant update (content_expires_at)
      on public.s236p_owner_private_objects to authenticated;
    set local session_replication_role = replica;
    create or replace function
      pg_temp.s236p_boundary_visible_v1(p_offset interval)
    returns text
    language plpgsql
    volatile
    set search_path = ''
    as $boundary$
    declare
      v_visible_count text;
    begin
      update public.s236p_owner_private_objects
         set content_expires_at = statement_timestamp() + p_offset
       where object_ref =
         ${sqlLiteral(S236P_EXPIRY_BOUNDARY_OBJECT)}::uuid;
      select count(*)::text
        into v_visible_count
        from storage.objects
       where name = ${sqlLiteral(boundaryPath)};
      return v_visible_count;
    end;
    $boundary$;
    grant execute on function
      pg_temp.s236p_boundary_visible_v1(interval) to authenticated;
    set local role authenticated;
    set local "request.jwt.claim.sub" to ${sqlLiteral(S236P_USER_A)};
    ${storageOperationHeader(operation)}
    select pg_temp.s236p_boundary_visible_v1(${offsetExpression});
    rollback;
  `;
}

function s236pExpectedOwnerASetValues() {
  return S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS.map(
    (objectId) => `(${sqlLiteral(objectId)}::uuid)`,
  ).join(",\n");
}

function s236pFutureSelectPolicySql(readOperations) {
  const deleteBranch = `storage.allow_any_operation(array[
      'storage.object.delete',
      'storage.object.delete_many'
    ])`;
  if (readOperations.length === 0) {
    return `
      alter policy "s236p owner private select"
      on storage.objects
      to authenticated
      using (
        bucket_id = 's236p-owner-private-v1'
        and owner_id = (select auth.uid()::text)
        and ${deleteBranch}
      );
    `;
  }
  return `
    alter policy "s236p owner private select"
    on storage.objects
    to authenticated
    using (
      bucket_id = 's236p-owner-private-v1'
      and owner_id = (select auth.uid()::text)
      and (
        (
          storage.allow_any_operation(array[
            ${readOperations.map(sqlLiteral).join(",\n            ")}
          ])
          and exists (
            select 1
            from public.s236p_owner_private_objects as metadata
            where metadata.owner_id = (select auth.uid())
              and metadata.bucket_id = storage.objects.bucket_id
              and metadata.storage_path = storage.objects.name
              and metadata.object_state = 'active'
              and metadata.content_expires_at > statement_timestamp()
              and (
                metadata.temporary_expires_at is null
                or metadata.temporary_expires_at > statement_timestamp()
              )
          )
        )
        or ${deleteBranch}
      )
    );
  `;
}

function runS236PExpiryReadGateAssertions(containerName) {
  const readOperations = [
    "storage.object.list",
    "storage.object.list_v2",
    "storage.object.get_authenticated",
    "object.get_authenticated_info",
  ];
  const deleteOperations = [
    "storage.object.delete",
    "storage.object.delete_many",
  ];
  const activePath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_OBJECT_A,
  );
  const contentExpiredPath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_EXPIRY_CONTENT_OBJECT,
  );
  const temporaryExpiredPath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_EXPIRY_TEMPORARY_OBJECT,
    "temporary",
  );
  const deleteRequestedPath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_DELETE_REQUESTED_OBJECT,
  );
  const metadataMissingPath = s236pStoragePath(
    S236P_VAULT_A,
    S236P_METADATA_MISSING_OBJECT,
  );

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      [
        s236pObjectInsertStatement({
          objectId: S236P_EXPIRY_CONTENT_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pObjectInsertStatement({
          objectId: S236P_EXPIRY_TEMPORARY_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          storageClass: "temporary",
        }),
        s236pObjectInsertStatement({
          objectId: S236P_DELETE_REQUESTED_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pObjectInsertStatement({
          objectId: S236P_EXPIRY_BOUNDARY_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pObjectInsertStatement({
          objectId: S236P_METADATA_MISSING_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_EXPIRY_CONTENT_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_EXPIRY_TEMPORARY_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          storageClass: "temporary",
        }),
        s236pStorageInsertStatement({
          objectId: S236P_DELETE_REQUESTED_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_EXPIRY_BOUNDARY_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_METADATA_MISSING_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "expiry read-gate fixtures",
  );
  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      `delete from public.s236p_owner_private_objects
        where object_ref =
          ${sqlLiteral(S236P_METADATA_MISSING_OBJECT)}::uuid;`,
    ),
    "metadata-missing expiry fixture transition",
  );
  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      `update public.s236p_owner_private_objects
          set object_state = 'delete_requested'
        where object_ref =
          ${sqlLiteral(S236P_DELETE_REQUESTED_OBJECT)}::uuid;`,
    ),
    "delete-requested expiry fixture transition",
  );
  applySql(
    containerName,
    `
      begin;
      set local session_replication_role = replica;
      update public.s236p_owner_private_objects
         set content_expires_at = statement_timestamp() - interval '1 second'
       where object_ref =
         ${sqlLiteral(S236P_EXPIRY_CONTENT_OBJECT)}::uuid;
      update public.s236p_owner_private_objects
         set temporary_expires_at =
           statement_timestamp() - interval '1 second'
       where object_ref =
         ${sqlLiteral(S236P_EXPIRY_TEMPORARY_OBJECT)}::uuid;
      commit;
    `,
    "isolated privileged expiry fixture setup",
  );

  for (const operation of readOperations) {
    assertScalar(
      containerName,
      authenticatedContext(
        S236P_USER_A,
        `select count(*)::text from storage.objects
          where name = ${sqlLiteral(activePath)};`,
        operation,
      ),
      "1",
      `${operation} active unexpired Owner A assertion`,
    );
    assertScalar(
      containerName,
      authenticatedContext(
        S236P_USER_B,
        `select count(*)::text from storage.objects
          where name = ${sqlLiteral(activePath)};`,
        operation,
      ),
      "0",
      `${operation} cross-Owner assertion`,
    );
    assertScalar(
      containerName,
      anonymousContext(
        `select count(*)::text from storage.objects
          where name = ${sqlLiteral(activePath)};`,
        operation,
      ),
      "0",
      `${operation} anonymous assertion`,
    );
    for (const [caseName, storagePath] of [
      ["delete requested", deleteRequestedPath],
      ["content expired", contentExpiredPath],
      ["temporary expired", temporaryExpiredPath],
      ["metadata missing", metadataMissingPath],
    ]) {
      assertScalar(
        containerName,
        authenticatedContext(
          S236P_USER_A,
          `select count(*)::text from storage.objects
            where name = ${sqlLiteral(storagePath)};`,
          operation,
        ),
        "0",
        `${operation} ${caseName} assertion`,
      );
    }
    assertScalar(
      containerName,
      s236pBoundaryReadStatement(operation, "interval '1 millisecond'"),
      "1",
      `${operation} expiry plus-one-millisecond assertion`,
    );
    assertScalar(
      containerName,
      s236pBoundaryReadStatement(operation, "interval '0 milliseconds'"),
      "0",
      `${operation} expiry equality assertion`,
    );
    assertScalar(
      containerName,
      s236pBoundaryReadStatement(operation, "interval '-1 millisecond'"),
      "0",
      `${operation} expiry minus-one-millisecond assertion`,
    );
  }

  for (const operation of deleteOperations) {
    for (const [caseName, storagePath] of [
      ["active", activePath],
      ["content expired", contentExpiredPath],
      ["delete requested", deleteRequestedPath],
      ["metadata missing", metadataMissingPath],
    ]) {
      assertScalar(
        containerName,
        authenticatedContext(
          S236P_USER_A,
          `with removed as (
            delete from storage.objects
             where name = ${sqlLiteral(storagePath)}
             returning 1
          ) select count(*)::text from removed;`,
          operation,
        ),
        "1",
        `${operation} Owner A ${caseName} cleanup assertion`,
      );
    }
    assertScalar(
      containerName,
      authenticatedContext(
        S236P_USER_B,
        `with removed as (
          delete from storage.objects
           where name = ${sqlLiteral(activePath)}
           returning 1
        ) select count(*)::text from removed;`,
        operation,
      ),
      "0",
      `${operation} cross-Owner cleanup assertion`,
    );
    assertScalar(
      containerName,
      anonymousContext(
        `with removed as (
          delete from storage.objects
           where name = ${sqlLiteral(activePath)}
           returning 1
        ) select count(*)::text from removed;`,
        operation,
      ),
      "0",
      `${operation} anonymous cleanup assertion`,
    );
  }

  for (const operation of [
    "storage.object.sign",
    "storage.object.sign_many",
    "storage.object.sign_upload_url",
    "storage.object.upload_signed",
    "storage.object.upload_update",
    "storage.object.copy",
    "storage.object.move",
    "object.head_authenticated_info",
    "storage.s3.get_object",
    "storage.object.upload_resumable",
    "unknown.operation",
    null,
  ]) {
    assertScalar(
      containerName,
      authenticatedContext(
        S236P_USER_A,
        `select count(*)::text from storage.objects
          where name = ${sqlLiteral(activePath)};`,
        operation,
      ),
      "0",
      `${operation ?? "missing operation"} denial assertion`,
    );
  }

  const targetedDisableReadOperations = [
    "storage.object.list",
    "storage.object.list_v2",
    "storage.object.get_authenticated",
  ];
  assertScalar(
    containerName,
    `
      begin;
      ${s236pFutureSelectPolicySql(targetedDisableReadOperations)}
      set local role authenticated;
      set local "request.jwt.claim.sub" to ${sqlLiteral(S236P_USER_A)};
      ${storageOperationHeader("object.get_authenticated_info")}
      select count(*)::text from storage.objects
       where name = ${sqlLiteral(activePath)};
      rollback;
    `,
    "0",
    "targeted authenticated-info forward-disable assertion",
  );
  assertScalar(
    containerName,
    `
      begin;
      ${s236pFutureSelectPolicySql(targetedDisableReadOperations)}
      set local role authenticated;
      set local "request.jwt.claim.sub" to ${sqlLiteral(S236P_USER_A)};
      ${storageOperationHeader("storage.object.delete_many")}
      with removed as (
        delete from storage.objects
         where name = ${sqlLiteral(metadataMissingPath)}
         returning 1
      ) select count(*)::text from removed;
      rollback;
    `,
    "1",
    "targeted forward-disable cleanup preservation assertion",
  );
  assertScalar(
    containerName,
    `
      begin;
      ${s236pFutureSelectPolicySql([])}
      set local role authenticated;
      set local "request.jwt.claim.sub" to ${sqlLiteral(S236P_USER_A)};
      ${storageOperationHeader("storage.object.get_authenticated")}
      select count(*)::text from storage.objects
       where name = ${sqlLiteral(activePath)};
      rollback;
    `,
    "0",
    "delete-only forward-disable read assertion",
  );
  assertScalar(
    containerName,
    `
      begin;
      ${s236pFutureSelectPolicySql([])}
      set local role authenticated;
      set local "request.jwt.claim.sub" to ${sqlLiteral(S236P_USER_A)};
      ${storageOperationHeader("storage.object.delete")}
      with removed as (
        delete from storage.objects
         where name = ${sqlLiteral(metadataMissingPath)}
         returning 1
      ) select count(*)::text from removed;
      rollback;
    `,
    "1",
    "delete-only forward-disable cleanup preservation assertion",
  );

  applySql(
    containerName,
    `
      delete from storage.objects
       where name in (
         ${[
           contentExpiredPath,
           temporaryExpiredPath,
           deleteRequestedPath,
           s236pStoragePath(
             S236P_VAULT_A,
             S236P_EXPIRY_BOUNDARY_OBJECT,
           ),
           metadataMissingPath,
         ].map(sqlLiteral).join(",\n         ")}
       );
      delete from public.s236p_owner_private_objects
       where object_ref in (
         ${[
           S236P_EXPIRY_CONTENT_OBJECT,
           S236P_EXPIRY_TEMPORARY_OBJECT,
           S236P_DELETE_REQUESTED_OBJECT,
           S236P_EXPIRY_BOUNDARY_OBJECT,
         ].map((objectId) => `${sqlLiteral(objectId)}::uuid`).join(",\n         ")}
       );
    `,
    "isolated expiry fixture cleanup",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from storage.objects
        where name in (
          ${[
            contentExpiredPath,
            temporaryExpiredPath,
            deleteRequestedPath,
            s236pStoragePath(
              S236P_VAULT_A,
              S236P_EXPIRY_BOUNDARY_OBJECT,
            ),
            metadataMissingPath,
          ].map(sqlLiteral).join(",\n          ")}
        )),
      (select count(*) from public.s236p_owner_private_objects
        where object_ref in (
          ${[
            S236P_EXPIRY_CONTENT_OBJECT,
            S236P_EXPIRY_TEMPORARY_OBJECT,
            S236P_DELETE_REQUESTED_OBJECT,
            S236P_EXPIRY_BOUNDARY_OBJECT,
          ].map((objectId) => `${sqlLiteral(objectId)}::uuid`).join(",\n          ")}
        ))
    );`,
    "0:0",
    "isolated expiry fixture cleanup assertion",
  );
}

function runS236PDatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  applySql(
    containerName,
    s236pBootstrapSql(),
    "isolated Supabase Storage and Auth role bootstrap",
  );
  for (const step of s236pMigrationExecutionSteps(
    targetMigration.migrations,
  )) {
    applySql(
      containerName,
      step.migration.content,
      step.label,
    );
  }
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from storage.buckets where id = 's236p-owner-private-v1' and public = false),
      (select count(*) from pg_class where oid =
        'public.s236p_owner_private_objects'::regclass
        and relrowsecurity and relforcerowsecurity),
      (to_regclass('public.s236p_owner_private_events') is null)::text,
      (to_regprocedure('public.s236p_authorize_signed_url_v1(uuid,integer)') is null)::text,
      (select count(*) from pg_proc where proname = 's236p_expired_object_paths_v1'),
      (select count(*) from pg_policies where policyname like 's236p owner private%'),
      (select count(*) from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and cmd = 'UPDATE'
          and policyname like 's236p owner private%'),
      (select count(*) from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and cmd = 'SELECT'
          and policyname = 's236p owner private select'),
      (select count(*) from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and cmd = 'SELECT'
          and policyname like 's236p owner private%'
          and policyname <> 's236p owner private select')
    );`,
    "1:1:true:true:1:7:0:1:0",
    "S236P ordered migration application assertion",
  );
  passedAssertions.add("ordered_migration_quadruple_applied");

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      [
        s236pObjectInsertStatement({
          objectId: S236P_OBJECT_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_OBJECT_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "Owner A synthetic fixture",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select concat_ws(':',
        (select count(*) from public.s236p_owner_private_objects where object_ref = ${sqlLiteral(S236P_OBJECT_A)}::uuid),
        (select count(*) from storage.objects where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))})
      );`,
      "storage.object.list",
    ),
    "1:1",
    "Owner A read-after-write assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select count(*)::text from storage.objects
        where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))};`,
      "object.get_authenticated_info",
    ),
    "1",
    "Owner A authenticated download-info assertion",
  );
  passedAssertions.add("authenticated_download_info_operation_scoped");

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      [
        s236pObjectInsertStatement({
          objectId: S236P_REVISION_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          parentObjectId: S236P_OBJECT_A,
          revisionNumber: 2,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_REVISION_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "Owner A append-only revision fixture",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select concat_ws(':',
        (select count(*) from public.s236p_owner_private_objects
          where object_ref in (
            ${sqlLiteral(S236P_OBJECT_A)}::uuid,
            ${sqlLiteral(S236P_REVISION_A)}::uuid
          )
          and object_version = 1),
        (select revision_number::text from public.s236p_owner_private_objects
          where object_ref = ${sqlLiteral(S236P_REVISION_A)}::uuid),
        (select count(*) from storage.objects
          where name in (
            ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))},
            ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_REVISION_A))}
          ))
      );`,
      "storage.object.list",
    ),
    "2:2:2",
    "Owner A immutable original and append-only revision assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `with mutated as (
        update storage.objects
           set metadata = '{"cacheControl":"0","synthetic":true,"overwrite":true}'::jsonb
         where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))}
         returning 1
       ) select count(*)::text from mutated;`,
      "storage.object.upload_update",
    ),
    "0",
    "Owner A same-path Storage overwrite assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `update public.s236p_owner_private_objects
         set revision_number = 3
       where object_ref = ${sqlLiteral(S236P_REVISION_A)}::uuid;`,
    ),
    /permission denied|s236p_immutable_object_field/,
    "Owner A immutable revision metadata assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      s236pObjectInsertStatement({
        objectId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        ownerId: S236P_USER_A,
        vaultId: S236P_VAULT_A,
        parentObjectId: S236P_OBJECT_A,
        revisionNumber: 4,
      }),
    ),
    /s236p_revision_sequence_invalid/,
    "Owner A nonsequential revision assertion",
  );
  passedAssertions.add("immutable_original_append_only_revision_enforced");

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_B,
      [
        s236pObjectInsertStatement({
          objectId: S236P_OBJECT_B,
          ownerId: S236P_USER_B,
          vaultId: S236P_VAULT_B,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_OBJECT_B,
          ownerId: S236P_USER_B,
          vaultId: S236P_VAULT_B,
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "Owner B synthetic fixture",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_B,
      `select concat_ws(':',
        (select count(*) from public.s236p_owner_private_objects where object_ref = ${sqlLiteral(S236P_OBJECT_A)}::uuid),
        (select count(*) from storage.objects where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))})
      );`,
      "storage.object.list",
    ),
    "0:0",
    "Owner B cannot read Owner A assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select concat_ws(':',
        (select count(*) from public.s236p_owner_private_objects where object_ref = ${sqlLiteral(S236P_OBJECT_B)}::uuid),
        (select count(*) from storage.objects where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_B, S236P_OBJECT_B))})
      );`,
      "storage.object.list",
    ),
    "0:0",
    "Owner A cannot read Owner B assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      S236P_USER_B,
      s236pObjectInsertStatement({
        objectId: "c0000000-0000-4000-8000-000000000002",
        ownerId: S236P_USER_A,
        vaultId: S236P_VAULT_A,
      }),
    ),
    /row-level security/,
    "cross-owner metadata insert assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_B,
      `with mutated as (
        update public.s236p_owner_private_objects
           set object_state = 'delete_requested'
         where object_ref = ${sqlLiteral(S236P_OBJECT_A)}::uuid
         returning 1
       ) select count(*)::text from mutated;`,
    ),
    "0",
    "cross-owner metadata update assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_B,
      `with removed as (
        delete from storage.objects
         where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))}
         returning 1
       ) select count(*)::text from removed;`,
      "storage.object.delete",
    ),
    "0",
    "cross-owner Storage delete assertion",
  );
  passedAssertions.add("bidirectional_owner_rls_isolation");

  assertSqlDenied(
    containerName,
    anonymousContext(
      "select count(*) from public.s236p_owner_private_objects;",
    ),
    /permission denied/,
    "anonymous metadata read assertion",
  );
  assertScalar(
    containerName,
    anonymousContext(
      "select count(*)::text from storage.objects where bucket_id = 's236p-owner-private-v1';",
      "storage.object.list",
    ),
    "0",
    "anonymous Storage read assertion",
  );
  assertSqlDenied(
    containerName,
    anonymousContext(
      `insert into storage.objects (bucket_id, name, owner_id)
       values (
         's236p-owner-private-v1',
         ${sqlLiteral("c0000000-0000-4000-8000-000000000003/c0000000-0000-4000-8000-000000000004")},
         ${sqlLiteral(S236P_USER_A)}
       );`,
      "storage.object.upload",
    ),
    /row-level security/,
    "anonymous Storage insert assertion",
  );
  assertSqlDenied(
    containerName,
    anonymousContext(
      `select * from public.s236p_authorize_signed_url_v1(
        ${sqlLiteral(S236P_OBJECT_A)}::uuid,
        300
      );`,
    ),
    /does not exist|permission denied/,
    "anonymous signed URL authorization assertion",
  );
  passedAssertions.add("anonymous_access_denied");

  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select count(*)::text from storage.objects
        where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))};`,
      "storage.object.sign",
    ),
    "0",
    "single signed URL operation assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select count(*)::text from storage.objects
        where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))};`,
      "storage.object.sign_many",
    ),
    "0",
    "bulk signed URL operation assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select count(*)::text from storage.objects
        where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_OBJECT_A))};`,
      "object.head_authenticated_info",
    ),
    "0",
    "unnecessary authenticated head-info operation assertion",
  );
  passedAssertions.add("signed_access_disabled");

  const invalidObjectCases = [
    [
      "content retention",
      "c0000000-0000-4000-8000-000000000010",
      { contentRetentionDays: 366 },
      /retention_max_365/,
    ],
    [
      "temporary TTL",
      "c0000000-0000-4000-8000-000000000011",
      { storageClass: "temporary", temporaryTtlSeconds: 301 },
      /temporary_ttl_max_300/,
    ],
    [
      "application cache TTL",
      "c0000000-0000-4000-8000-000000000012",
      { applicationCacheTtlSeconds: 1 },
      /application_cache_ttl_zero/,
    ],
    [
      "export delete SLA",
      "c0000000-0000-4000-8000-000000000013",
      { exportDeleteSlaSeconds: 604801 },
      /export_delete_sla_max_7d/,
    ],
  ];
  for (const [label, objectId, overrides, pattern] of invalidObjectCases) {
    assertSqlDenied(
      containerName,
      authenticatedContext(
        S236P_USER_A,
        s236pObjectInsertStatement({
          objectId,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          ...overrides,
        }),
      ),
      pattern,
      `${label} constraint assertion`,
    );
  }
  passedAssertions.add(
    "retention_temporary_ttl_cache_delete_sla_enforced",
  );

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      [
        s236pObjectInsertStatement({
          objectId: S236P_TEMP_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          storageClass: "temporary",
        }),
        s236pStorageInsertStatement({
          objectId: S236P_TEMP_OBJECT,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          storageClass: "temporary",
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "temporary expiry fixture",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select concat_ws(':',
        (select count(*) from public.s236p_expired_object_paths_v1(
          (select temporary_expires_at - interval '1 millisecond'
             from public.s236p_owner_private_objects
            where object_ref = ${sqlLiteral(S236P_TEMP_OBJECT)}::uuid)
        ) where object_ref = ${sqlLiteral(S236P_TEMP_OBJECT)}::uuid),
        (select count(*) from public.s236p_expired_object_paths_v1(
          (select temporary_expires_at + interval '1 millisecond'
             from public.s236p_owner_private_objects
            where object_ref = ${sqlLiteral(S236P_TEMP_OBJECT)}::uuid)
        ) where object_ref = ${sqlLiteral(S236P_TEMP_OBJECT)}::uuid)
      );`,
    ),
    "0:1",
    "deterministic temporary expiry assertion",
  );
  passedAssertions.add("deterministic_expiry_verified");

  runS236PExpiryReadGateAssertions(containerName);
  passedAssertions.add("expiry_read_gate_enforced");
  passedAssertions.add("expiry_cleanup_delete_operations_preserved");
  passedAssertions.add("reviewed_forward_disable_recipe_verified");

  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `with expected(object_ref) as (
         values ${s236pExpectedOwnerASetValues()}
       ),
       visible as (
         select object_ref
           from public.s236p_owner_private_objects
       )
       select concat_ws(':',
         (select count(*) from visible),
         (select count(*) from expected),
         (select count(*)
            from visible
            left join expected using (object_ref)
           where expected.object_ref is null),
         (select count(*)
            from expected
            left join visible using (object_ref)
           where visible.object_ref is null)
       );`,
    ),
    `${S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS.length}:${S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS.length}:0:0`,
    "Owner A exact visible fixture-set assertion",
  );

  const providerBoundaryCases = [
    [
      "provider mode",
      "c0000000-0000-4000-8000-000000000020",
      { providerMode: "external" },
      /provider_mode_none/,
    ],
    [
      "provider calls",
      "c0000000-0000-4000-8000-000000000021",
      { providerCalls: 1 },
      /provider_calls_zero/,
    ],
  ];
  for (const [label, objectId, overrides, pattern] of providerBoundaryCases) {
    assertSqlDenied(
      containerName,
      authenticatedContext(
        S236P_USER_A,
        s236pObjectInsertStatement({
          objectId,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          ...overrides,
        }),
      ),
      pattern,
      `${label} constraint assertion`,
    );
  }
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `with expected(object_ref) as (
         values ${s236pExpectedOwnerASetValues()}
       )
       select count(*)::text
         from public.s236p_owner_private_objects as visible
         join expected using (object_ref)
        where visible.ocr_ai_provider_mode = 'none'
          and visible.external_ocr_ai_provider_call_count = 0;`,
    ),
    String(S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS.length),
    "provider-none and call-zero assertion",
  );
  passedAssertions.add("provider_mode_none_and_external_calls_zero");

  const rawBoundaryCases = [
    [
      "raw emission",
      "c0000000-0000-4000-8000-000000000022",
      { rawEmissions: 1 },
      /raw_emissions_zero/,
    ],
    [
      "real content",
      "c0000000-0000-4000-8000-000000000023",
      { containsRealContent: true },
      /synthetic_only/,
    ],
  ];
  for (const [label, objectId, overrides, pattern] of rawBoundaryCases) {
    assertSqlDenied(
      containerName,
      authenticatedContext(
        S236P_USER_A,
        s236pObjectInsertStatement({
          objectId,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
          ...overrides,
        }),
      ),
      pattern,
      `${label} constraint assertion`,
    );
  }
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `with expected(object_ref) as (
         values ${s236pExpectedOwnerASetValues()}
       )
       select count(*)::text
         from public.s236p_owner_private_objects as visible
         join expected using (object_ref)
        where visible.raw_external_emission_count = 0
          and visible.contains_real_content = false;`,
    ),
    String(S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS.length),
    "raw-zero and synthetic-only assertion",
  );
  passedAssertions.add("raw_emission_and_real_content_zero");

  assertScalar(
    containerName,
    "select (to_regclass('public.s236p_owner_private_events') is null)::text;",
    "true",
    "persistent event log absence assertion",
  );
  passedAssertions.add("persistent_event_log_disabled");

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      [
        s236pObjectInsertStatement({
          objectId: S236P_ORPHAN_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
        s236pStorageInsertStatement({
          objectId: S236P_ORPHAN_A,
          ownerId: S236P_USER_A,
          vaultId: S236P_VAULT_A,
        }),
      ].join("\n"),
      "storage.object.upload",
    ),
    "metadata-first recovery fixture",
  );
  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      `delete from public.s236p_owner_private_objects
        where object_ref = ${sqlLiteral(S236P_ORPHAN_A)}::uuid;`,
    ),
    "metadata-first recovery metadata delete",
  );
  assertScalar(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      `with removed as (
        delete from storage.objects
         where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_ORPHAN_A))}
         returning 1
       ) select count(*)::text from removed;`,
      "storage.object.delete",
    ),
    "1",
    "metadata-first orphan-safe Storage delete assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      S236P_USER_A,
      `select count(*)::text from storage.objects
        where name = ${sqlLiteral(s236pStoragePath(S236P_VAULT_A, S236P_ORPHAN_A))};`,
      "storage.object.list",
    ),
    "0",
    "metadata-first orphan cleanup assertion",
  );
  passedAssertions.add("metadata_first_orphan_safe_delete_verified");

  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_A,
      `delete from storage.objects
        where owner_id = ${sqlLiteral(S236P_USER_A)};
       delete from public.s236p_owner_private_objects
        where owner_id = ${sqlLiteral(S236P_USER_A)}::uuid
          and parent_object_ref is not null;
       delete from public.s236p_owner_private_objects
        where owner_id = ${sqlLiteral(S236P_USER_A)}::uuid;`,
      "storage.object.delete",
    ),
    "Owner A synthetic cleanup",
  );
  applySql(
    containerName,
    authenticatedCommitContext(
      S236P_USER_B,
      `delete from storage.objects
        where owner_id = ${sqlLiteral(S236P_USER_B)};
       delete from public.s236p_owner_private_objects
        where owner_id = ${sqlLiteral(S236P_USER_B)}::uuid;`,
      "storage.object.delete",
    ),
    "Owner B synthetic cleanup",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from storage.objects where bucket_id = 's236p-owner-private-v1'),
      (select count(*) from public.s236p_owner_private_objects),
      (to_regclass('public.s236p_owner_private_events') is null)::text
    );`,
    "0:0:true",
    "S236P synthetic row cleanup assertion",
  );
  passedAssertions.add(
    "owner_a_metadata_storage_create_read_delete_allowed",
  );
  passedAssertions.add("cleanup_complete");

  return passedAssertions;
}

function c2rCPSessionPayload({ sessionId, userId, subject = "appraisal_practical" }) {
  const timestamp = "2026-08-17T00:00:00.000Z";
  const theory = subject === "appraisal_theory";
  const law = subject === "appraisal_law";
  return {
    sessionId,
    userId,
    fixtureId: law
      ? "wcv-c2-law-canonical"
      : theory
      ? "wcv-c2-theory-canonical"
      : "wcv-c2-practice-net-income",
    subject,
    state: "editable_capture_draft",
    recordVersion: 1,
    confirmedRevisionId: null,
    primaryGapId: null,
    outcome: null,
    assistanceLevel: 0,
    independentAttemptBeforeHelp: false,
    contractVersion: law
      ? "wcv_c2r_c_l_exact_law_applicability_proof.v1"
      : theory
      ? "wcv_c2r_c_t_structured_theory_proof.v1"
      : "wcv_c2r_c_p_structured_practice_proof.v2",
    fixtureVersion: law
      ? "wcv_c2r_c_l_law_rights_safe_fixtures.2026-08-17.v1"
      : theory
      ? "wcv_c2r_c_t_theory_rights_safe_fixtures.2026-08-17.v1"
      : "wcv_c2r_c_p_practice_rights_safe_fixtures.2026-08-17.v1",
    sourceVersion: "synthetic-owner-test-only.2026-08-17.v1",
    rubricVersion: law
      ? "wcv_c2r_c_l_law_exact_applicability_rubric.v1"
      : theory
      ? "wcv_c2r_c_t_theory_target_scope_rubric.v1"
      : "wcv_c2r_c_p_practice_relation_rubric.v1",
    policyVersion: "wcv_c2r_c_p_exposure_and_independence_policy.v1",
    validatorVersion: law
      ? "validator:law-exact-applicability@1"
      : theory
      ? "validator:theory-scoped-predicate@1"
      : "validator:practice-calculation-claim@2",
    stateData: {
      inputMode: "TYPED_TEXT",
      revisionNumber: 0,
      prediction: null,
      predictionConfidence: null,
      selfDiagnosisCode: null,
      gapCandidates: [],
      repairNeed: null,
      repairPath: null,
      continuation: null,
      structuredClaim: null,
      proofEvaluation: null,
      resultReasonCodes: [],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function c2rCPArtifactPayload(artifactId) {
  return {
    artifactId,
    revisionNumber: 0,
    kind: "capture_draft",
    inputMode: "TYPED_TEXT",
    body: "합성 실무 입력: 총수익 120,000,000원 - 운영비용 20,000,000원 = 순수익 100,000,000원/년",
    createdAt: "2026-08-17T00:00:00.000Z",
  };
}

function c2rCPCreateSql({ session, artifact, commandId }) {
  return `
    begin;
    set local role service_role;
    select concat_ws(':', out_session_id::text, out_record_version::text, out_state, replayed::text)
      from public.wcv_c2_create_trusted_repair_session_v1(
        ${jsonLiteral(session)}, ${jsonLiteral(artifact)}, ${sqlLiteral(commandId)}::uuid
      );
    commit;
  `;
}

function c2rCPTransitionSql({
  commandId,
  expectedVersion,
  expectedState,
  nextState,
  exposure,
  sessionId = C2R_C_P_SESSION_A,
  userId = USER_A,
  primaryGapId = "practice-net-income-relation",
}) {
  const stateData = {
    inputMode: "TYPED_TEXT",
    revisionNumber: 0,
    prediction: "net_income_relation",
    predictionConfidence: "high",
    selfDiagnosisCode: "relation_ready",
    gapCandidates: [{ gapId: "practice-net-income-relation", priority: 1 }],
    repairNeed: "ordered_calculation_relation",
    repairPath: "smallest_eligible_scaffold",
    continuation: "VERIFY_AND_CONTINUE",
    structuredClaim: null,
    proofEvaluation: null,
    resultReasonCodes: ["free_form_candidate_only"],
  };
  const exposureJson = exposure === null ? "null::jsonb" : jsonLiteral(exposure);
  return `
    begin;
    set local role service_role;
    select concat_ws(':', out_record_version::text, out_state, replayed::text)
      from public.wcv_c2_apply_trusted_repair_transition_v1(
        ${sqlLiteral(sessionId)}::uuid,
        ${sqlLiteral(userId)}::uuid,
        ${sqlLiteral(commandId)}::uuid,
        ${expectedVersion},
        ${sqlLiteral(expectedState)},
        ${sqlLiteral(nextState)},
        ${jsonLiteral(stateData)},
        null::uuid,
        ${sqlLiteral(primaryGapId)},
        ${sqlLiteral("partial")},
        1::smallint,
        false,
        null::jsonb,
        ${exposureJson}
      );
    commit;
  `;
}

function runC2RCPDatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  const migration = targetMigration.migrations[0];
  applySql(containerName, bootstrapSql(), "isolated Supabase role bootstrap");
  applySql(containerName, migration.content, "C2R-C-P Practice migration");

  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from pg_class where relname like 'wcv_c2_trusted_repair_%' and relkind = 'r'),
      (select count(*) from pg_proc where proname in (
        'wcv_c2_create_trusted_repair_session_v1',
        'wcv_c2_apply_trusted_repair_transition_v1'
      ))
    );`,
    "5:2",
    "C2R-C-P migration inventory assertion",
  );
  passedAssertions.add("practice_migration_applied");

  assertScalar(
    containerName,
    `select count(*)::text from pg_class
      where relname in (
        'wcv_c2_trusted_repair_sessions',
        'wcv_c2_trusted_repair_private_artifacts',
        'wcv_c2_trusted_repair_exposure_events',
        'wcv_c2_trusted_repair_command_receipts',
        'wcv_c2_trusted_repair_scarcity_events'
      ) and relrowsecurity and relforcerowsecurity;`,
    "5",
    "C2R-C-P forced RLS assertion",
  );
  passedAssertions.add("forced_rls_all_tables");

  const sessionA = c2rCPSessionPayload({
    sessionId: C2R_C_P_SESSION_A,
    userId: USER_A,
  });
  const artifactA = c2rCPArtifactPayload(C2R_C_P_ARTIFACT_A);
  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: sessionA,
      artifact: artifactA,
      commandId: C2R_C_P_CREATE_COMMAND_A,
    }),
    `${C2R_C_P_SESSION_A}:1:editable_capture_draft:false`,
    "C2R-C-P service-only create assertion",
  );

  assertSqlDenied(
    containerName,
    c2rCPCreateSql({
      session: c2rCPSessionPayload({
        sessionId: C2R_C_P_SESSION_B,
        userId: USER_B,
        subject: "appraisal_theory",
      }),
      artifact: c2rCPArtifactPayload(C2R_C_P_ARTIFACT_B),
      commandId: C2R_C_P_CREATE_COMMAND_B,
    }),
    /subject|check constraint/i,
    "C2R-C-P Practice-only subject assertion",
  );
  passedAssertions.add("practice_only_subject_constraint");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
    /permission denied/i,
    "C2R-C-P authenticated owner session read denial assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_B,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
    /permission denied/i,
    "C2R-C-P authenticated cross-user session read denial assertion",
  );
  passedAssertions.add("authenticated_session_read_denied");

  assertSqlDenied(
    containerName,
    anonymousContext("select count(*) from public.wcv_c2_trusted_repair_sessions;"),
    /permission denied/i,
    "C2R-C-P anonymous read assertion",
  );
  passedAssertions.add("anonymous_read_denied");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      "select count(*) from public.wcv_c2_trusted_repair_private_artifacts;",
    ),
    /permission denied/i,
    "C2R-C-P authenticated private body read assertion",
  );
  passedAssertions.add("authenticated_private_body_read_denied");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `update public.wcv_c2_trusted_repair_sessions set state='blocked' where id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid;`,
    ),
    /permission denied/i,
    "C2R-C-P authenticated direct mutation assertion",
  );
  passedAssertions.add("authenticated_direct_mutation_denied");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `select * from public.wcv_c2_create_trusted_repair_session_v1('{}'::jsonb, '{}'::jsonb, ${sqlLiteral(C2R_C_P_CREATE_COMMAND_B)}::uuid);`,
    ),
    /permission denied/i,
    "C2R-C-P authenticated RPC execution assertion",
  );
  passedAssertions.add("service_only_rpc_execution");

  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: sessionA,
      artifact: artifactA,
      commandId: C2R_C_P_CREATE_COMMAND_A,
    }),
    `${C2R_C_P_SESSION_A}:1:editable_capture_draft:true`,
    "C2R-C-P idempotent create replay assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.wcv_c2_trusted_repair_sessions),
      (select count(*) from public.wcv_c2_trusted_repair_private_artifacts),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts)
    );`,
    "1:1:1",
    "C2R-C-P replay row cardinality assertion",
  );
  passedAssertions.add("idempotent_create_replay_no_duplicate_work");

  const exposure = {
    exposureId: C2R_C_P_EXPOSURE_A,
    revisionId: C2R_C_P_ARTIFACT_A,
    gapId: "practice-net-income-relation",
    assistanceLevel: 1,
    scaffoldKind: "smallest_eligible_scaffold",
    occurredAt: "2026-08-17T00:01:00.000Z",
  };
  assertScalar(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_TRANSITION_COMMAND_A,
      expectedVersion: 1,
      expectedState: "editable_capture_draft",
      nextState: "exposure_committed",
      exposure,
    }),
    "2:exposure_committed:false",
    "C2R-C-P exposure transition assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select record_version from public.wcv_c2_trusted_repair_sessions where id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid),
      (select count(*) from public.wcv_c2_trusted_repair_exposure_events where session_id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts where session_id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid)
    );`,
    "2:1:2",
    "C2R-C-P exposure and transition atomicity assertion",
  );
  passedAssertions.add("exposure_and_state_transition_atomic");

  assertScalar(
    containerName,
    `select concat_ws(':',
        jsonb_typeof(state_data -> 'structuredClaim'),
        jsonb_typeof(state_data -> 'proofEvaluation')
      )
      from public.wcv_c2_trusted_repair_sessions
      where id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid;`,
    "null:null",
    "C2R-C-P free-form transition excludes structured proof assertion",
  );
  passedAssertions.add("free_form_transition_excludes_structured_proof");

  assertSqlDenied(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_STALE_COMMAND_A,
      expectedVersion: 1,
      expectedState: "editable_capture_draft",
      nextState: "partial",
      exposure: null,
    }),
    /WCV_C2_CAS_CONFLICT/i,
    "C2R-C-P stale CAS assertion",
  );
  assertSqlDenied(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_ATOMIC_COMMAND_A,
      expectedVersion: 2,
      expectedState: "exposure_committed",
      nextState: "partial",
      exposure: { ...exposure, exposureId: C2R_C_P_ATOMIC_COMMAND_A, revisionId: C2R_C_P_MISSING_REVISION },
    }),
    /foreign key constraint/i,
    "C2R-C-P failed exposure atomic rollback assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select record_version from public.wcv_c2_trusted_repair_sessions where id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid),
      (select count(*) from public.wcv_c2_trusted_repair_exposure_events where session_id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts where session_id=${sqlLiteral(C2R_C_P_SESSION_A)}::uuid)
    );`,
    "2:1:2",
    "C2R-C-P failed transitions leave no partial writes assertion",
  );
  passedAssertions.add("stale_cas_transition_rejected");

  return passedAssertions;
}

function runC2RCTDatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  const theoryMigration = targetMigration.migrations[0];
  applySql(containerName, bootstrapSql(), "isolated Supabase role bootstrap");
  applySql(
    containerName,
    targetMigration.practicePrerequisite.content,
    "C2R-C-P Practice prerequisite migration",
  );
  applySql(
    containerName,
    theoryMigration.content,
    "C2R-C-T Theory delta migration",
  );
  passedAssertions.add("theory_delta_migration_applied");

  assertScalar(
    containerName,
    `select count(*)::text from pg_class
      where relname in (
        'wcv_c2_trusted_repair_sessions',
        'wcv_c2_trusted_repair_private_artifacts',
        'wcv_c2_trusted_repair_exposure_events',
        'wcv_c2_trusted_repair_command_receipts',
        'wcv_c2_trusted_repair_scarcity_events'
      ) and relrowsecurity and relforcerowsecurity;`,
    "5",
    "C2R-C-T forced RLS preservation assertion",
  );
  passedAssertions.add("forced_rls_all_tables_preserved");

  const practiceSession = c2rCPSessionPayload({
    sessionId: C2R_C_P_SESSION_A,
    userId: USER_A,
  });
  const theorySession = c2rCPSessionPayload({
    sessionId: C2R_C_P_SESSION_B,
    userId: USER_B,
    subject: "appraisal_theory",
  });
  const practiceArtifact = c2rCPArtifactPayload(C2R_C_P_ARTIFACT_A);
  const theoryArtifact = c2rCPArtifactPayload(C2R_C_P_ARTIFACT_B);
  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: practiceSession,
      artifact: practiceArtifact,
      commandId: C2R_C_P_CREATE_COMMAND_A,
    }),
    `${C2R_C_P_SESSION_A}:1:editable_capture_draft:false`,
    "C2R-C-T Practice preservation create assertion",
  );
  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: theorySession,
      artifact: theoryArtifact,
      commandId: C2R_C_P_CREATE_COMMAND_B,
    }),
    `${C2R_C_P_SESSION_B}:1:editable_capture_draft:false`,
    "C2R-C-T Theory create assertion",
  );
  assertScalar(
    containerName,
    `select string_agg(subject || ':' || validator_version, ',' order by subject)
       from public.wcv_c2_trusted_repair_sessions;`,
    "appraisal_practical:validator:practice-calculation-claim@2,appraisal_theory:validator:theory-scoped-predicate@1",
    "C2R-C-T subject-exact binding assertion",
  );
  passedAssertions.add("practice_and_theory_subject_bindings_exact");
  passedAssertions.add("practice_rows_preserved_by_theory_delta");

  for (const [assertionId, sql, expected, label] of [
    [
      "authenticated_session_read_denied",
      authenticatedContext(
        USER_A,
        "select count(*) from public.wcv_c2_trusted_repair_sessions;",
      ),
      /permission denied/i,
      "C2R-C-T authenticated session read denial assertion",
    ],
    [
      "anonymous_read_denied",
      anonymousContext(
        "select count(*) from public.wcv_c2_trusted_repair_sessions;",
      ),
      /permission denied/i,
      "C2R-C-T anonymous read denial assertion",
    ],
    [
      "authenticated_private_body_read_denied",
      authenticatedContext(
        USER_B,
        "select count(*) from public.wcv_c2_trusted_repair_private_artifacts;",
      ),
      /permission denied/i,
      "C2R-C-T private body read denial assertion",
    ],
    [
      "authenticated_direct_mutation_denied",
      authenticatedContext(
        USER_B,
        `update public.wcv_c2_trusted_repair_sessions set state='blocked'
          where id=${sqlLiteral(C2R_C_P_SESSION_B)}::uuid;`,
      ),
      /permission denied/i,
      "C2R-C-T direct mutation denial assertion",
    ],
    [
      "service_only_rpc_execution",
      authenticatedContext(
        USER_B,
        `select * from public.wcv_c2_create_trusted_repair_session_v1(
          '{}'::jsonb, '{}'::jsonb, ${sqlLiteral(C2R_C_P_STALE_COMMAND_A)}::uuid
        );`,
      ),
      /permission denied/i,
      "C2R-C-T RPC execution denial assertion",
    ],
  ]) {
    assertSqlDenied(containerName, sql, expected, label);
    passedAssertions.add(assertionId);
  }

  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: theorySession,
      artifact: theoryArtifact,
      commandId: C2R_C_P_CREATE_COMMAND_B,
    }),
    `${C2R_C_P_SESSION_B}:1:editable_capture_draft:true`,
    "C2R-C-T idempotent Theory create replay assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.wcv_c2_trusted_repair_sessions),
      (select count(*) from public.wcv_c2_trusted_repair_private_artifacts),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts)
    );`,
    "2:2:2",
    "C2R-C-T replay row cardinality assertion",
  );
  passedAssertions.add("idempotent_theory_create_replay_no_duplicate_work");

  assertScalar(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_TRANSITION_COMMAND_A,
      expectedVersion: 1,
      expectedState: "editable_capture_draft",
      nextState: "exposure_committed",
      exposure: null,
      sessionId: C2R_C_P_SESSION_B,
      userId: USER_B,
      primaryGapId: "theory-income-approach-scope",
    }),
    "2:exposure_committed:false",
    "C2R-C-T free-form transition assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      jsonb_typeof(state_data -> 'structuredClaim'),
      jsonb_typeof(state_data -> 'proofEvaluation')
    ) from public.wcv_c2_trusted_repair_sessions
      where id=${sqlLiteral(C2R_C_P_SESSION_B)}::uuid;`,
    "null:null",
    "C2R-C-T free-form candidate-only assertion",
  );
  passedAssertions.add("free_form_transition_excludes_structured_proof");

  assertSqlDenied(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_STALE_COMMAND_A,
      expectedVersion: 1,
      expectedState: "editable_capture_draft",
      nextState: "partial",
      exposure: null,
      sessionId: C2R_C_P_SESSION_B,
      userId: USER_B,
      primaryGapId: "theory-income-approach-scope",
    }),
    /WCV_C2_CAS_CONFLICT/i,
    "C2R-C-T stale CAS assertion",
  );
  passedAssertions.add("stale_cas_transition_rejected");

  applySql(
    containerName,
    `begin;
      delete from public.wcv_c2_trusted_repair_sessions
      where id in (
        ${sqlLiteral(C2R_C_P_SESSION_A)}::uuid,
        ${sqlLiteral(C2R_C_P_SESSION_B)}::uuid
      ); commit;`,
    "C2R-C-T synthetic cleanup",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.wcv_c2_trusted_repair_sessions),
      (select count(*) from public.wcv_c2_trusted_repair_private_artifacts),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts)
    );`,
    "0:0:0",
    "C2R-C-T cleanup assertion",
  );
  passedAssertions.add("cleanup_complete");
  return passedAssertions;
}

function runC2RCLDatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  const lawMigration = targetMigration.migrations[0];
  applySql(containerName, bootstrapSql(), "isolated Supabase role bootstrap");
  applySql(
    containerName,
    targetMigration.practicePrerequisite.content,
    "C2R-C-P Practice prerequisite migration",
  );
  applySql(
    containerName,
    targetMigration.theoryPrerequisite.content,
    "C2R-C-T Theory prerequisite migration",
  );
  applySql(containerName, lawMigration.content, "C2R-C-L Law delta migration");
  passedAssertions.add("law_delta_migration_applied");

  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from pg_class where relname like 'wcv_c2_trusted_repair_%'
        and relkind='r' and relrowsecurity and relforcerowsecurity),
      (select count(*) from pg_trigger
        where tgname='wcv_c2_validate_exact_law_proof_v1' and not tgisinternal)
    );`,
    "5:1",
    "C2R-C-L forced RLS and Law trigger assertion",
  );
  passedAssertions.add("forced_rls_all_tables_preserved");
  passedAssertions.add("law_exact_proof_trigger_installed");

  const sessions = [
    [
      c2rCPSessionPayload({ sessionId: C2R_C_P_SESSION_A, userId: USER_A }),
      c2rCPArtifactPayload(C2R_C_P_ARTIFACT_A),
      C2R_C_P_CREATE_COMMAND_A,
    ],
    [
      c2rCPSessionPayload({
        sessionId: C2R_C_P_SESSION_B,
        userId: USER_B,
        subject: "appraisal_theory",
      }),
      c2rCPArtifactPayload(C2R_C_P_ARTIFACT_B),
      C2R_C_P_CREATE_COMMAND_B,
    ],
    [
      c2rCPSessionPayload({
        sessionId: C2R_C_P_SESSION_C,
        userId: USER_A,
        subject: "appraisal_law",
      }),
      c2rCPArtifactPayload(C2R_C_P_ARTIFACT_C),
      C2R_C_P_CREATE_COMMAND_C,
    ],
  ];
  for (const [session, artifact, commandId] of sessions) {
    assertScalar(
      containerName,
      c2rCPCreateSql({ session, artifact, commandId }),
      `${session.sessionId}:1:editable_capture_draft:false`,
      `C2R-C-L ${session.subject} create assertion`,
    );
  }
  assertScalar(
    containerName,
    `select string_agg(subject || ':' || validator_version, ',' order by subject)
       from public.wcv_c2_trusted_repair_sessions;`,
    "appraisal_law:validator:law-exact-applicability@1,appraisal_practical:validator:practice-calculation-claim@2,appraisal_theory:validator:theory-scoped-predicate@1",
    "C2R-C-L subject-exact binding assertion",
  );
  passedAssertions.add("practice_theory_and_law_subject_bindings_exact");
  passedAssertions.add("practice_and_theory_rows_preserved_by_law_delta");

  for (const [assertionId, sql, expected, label] of [
    [
      "authenticated_session_read_denied",
      authenticatedContext(USER_A, "select count(*) from public.wcv_c2_trusted_repair_sessions;"),
      /permission denied/i,
      "C2R-C-L authenticated session read denial assertion",
    ],
    [
      "anonymous_read_denied",
      anonymousContext("select count(*) from public.wcv_c2_trusted_repair_sessions;"),
      /permission denied/i,
      "C2R-C-L anonymous read denial assertion",
    ],
    [
      "authenticated_private_body_read_denied",
      authenticatedContext(USER_B, "select count(*) from public.wcv_c2_trusted_repair_private_artifacts;"),
      /permission denied/i,
      "C2R-C-L private body read denial assertion",
    ],
    [
      "authenticated_direct_mutation_denied",
      authenticatedContext(
        USER_A,
        `update public.wcv_c2_trusted_repair_sessions set state='blocked'
          where id=${sqlLiteral(C2R_C_P_SESSION_C)}::uuid;`,
      ),
      /permission denied/i,
      "C2R-C-L direct mutation denial assertion",
    ],
    [
      "service_only_rpc_execution",
      authenticatedContext(
        USER_A,
        `select * from public.wcv_c2_create_trusted_repair_session_v1(
          '{}'::jsonb, '{}'::jsonb, ${sqlLiteral(C2R_C_P_STALE_COMMAND_A)}::uuid
        );`,
      ),
      /permission denied/i,
      "C2R-C-L RPC execution denial assertion",
    ],
  ]) {
    assertSqlDenied(containerName, sql, expected, label);
    passedAssertions.add(assertionId);
  }

  const lawSession = sessions[2][0];
  const lawArtifact = sessions[2][1];
  assertScalar(
    containerName,
    c2rCPCreateSql({
      session: lawSession,
      artifact: lawArtifact,
      commandId: C2R_C_P_CREATE_COMMAND_C,
    }),
    `${C2R_C_P_SESSION_C}:1:editable_capture_draft:true`,
    "C2R-C-L idempotent Law create replay assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.wcv_c2_trusted_repair_sessions),
      (select count(*) from public.wcv_c2_trusted_repair_private_artifacts),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts));`,
    "3:3:3",
    "C2R-C-L replay row cardinality assertion",
  );
  passedAssertions.add("idempotent_law_create_replay_no_duplicate_work");

  assertSqlDenied(
    containerName,
    c2rCPTransitionSql({
      commandId: C2R_C_P_TRANSITION_COMMAND_A,
      expectedVersion: 1,
      expectedState: "editable_capture_draft",
      nextState: "verified",
      exposure: null,
      sessionId: C2R_C_P_SESSION_C,
      userId: USER_A,
      primaryGapId: "law-exact-article-10-applicability",
    }),
    /WCV_C2_STRUCTURED_LAW_PROOF_REQUIRED/i,
    "C2R-C-L unverified Law transition assertion",
  );
  passedAssertions.add("unverified_law_transition_rejected");

  applySql(
    containerName,
    `begin;
      delete from public.wcv_c2_trusted_repair_sessions
      where id in (
        ${sqlLiteral(C2R_C_P_SESSION_A)}::uuid,
        ${sqlLiteral(C2R_C_P_SESSION_B)}::uuid,
        ${sqlLiteral(C2R_C_P_SESSION_C)}::uuid
      ); commit;`,
    "C2R-C-L synthetic cleanup",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.wcv_c2_trusted_repair_sessions),
      (select count(*) from public.wcv_c2_trusted_repair_private_artifacts),
      (select count(*) from public.wcv_c2_trusted_repair_command_receipts));`,
    "0:0:0",
    "C2R-C-L cleanup assertion",
  );
  passedAssertions.add("cleanup_complete");
  return passedAssertions;
}

function runDatabaseAssertions(containerName, targetMigration) {
  if (targetMigration.adapter === "s236p") {
    return runS236PDatabaseAssertions(containerName, targetMigration);
  }
  if (targetMigration.adapter === "c2r-c-p") {
    return runC2RCPDatabaseAssertions(containerName, targetMigration);
  }
  if (targetMigration.adapter === "c2r-c-t") {
    return runC2RCTDatabaseAssertions(containerName, targetMigration);
  }
  if (targetMigration.adapter === "c2r-c-l") {
    return runC2RCLDatabaseAssertions(containerName, targetMigration);
  }
  return runS233ADatabaseAssertions(containerName, targetMigration);
}

function writeEvidence({ context, migration, passedAssertions, riskBytes }) {
  const evidencePath = process.env.RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const resolvedPath = path.resolve(evidencePath);
  const contract = evidenceContract(migration);
  const evidence = {
    schemaVersion: SCHEMA_VERSION,
    producerVersion: contract.producerVersion,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: new Date().toISOString(),
    pullRequestHeadSha: context.headSha,
    githubRunId: context.runId,
    githubRunAttempt: context.runAttempt,
    riskFileSha256: sha256(riskBytes),
    migrations: migration.migrations.map(({ path: migrationPath, sha256: digest }) => ({
      path: migrationPath,
      sha256: digest,
    })),
    isolatedEnvironment: {
      kind: "disposable_local_postgres",
      engine: "postgresql_15",
      networkExposure: "none",
      syntheticUserCount: 2,
    },
    assertions: contract.assertionIds.map((id) => ({
      id,
      passed: passedAssertions.has(id),
    })),
    cleanup: { status: "complete" },
    dataBoundary: {
      metadataOnly: true,
      rawLearnerContentPersisted: false,
      sourceTextPersisted: false,
      credentialMaterialPersisted: false,
      learnerIdentifiersPersisted: false,
      rowBodiesPersisted: false,
      providerBodiesPersisted: false,
    },
  };
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const temporaryPath = `${resolvedPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, resolvedPath);
  console.log(
    JSON.stringify({
      status: "verified",
      assertionsPassed: contract.assertionIds.length,
      cleanup: "complete",
    }),
  );
}

function produce(riskFile) {
  const context = executionContext();
  const { bytes: riskBytes, value: riskResult } = readJsonWithBytes(riskFile, "risk classification");
  if (riskResult.runtimeEvidenceRequired !== true) throw new Error("runtime evidence was not requested.");
  if (isOracleRiskCandidate(riskResult)) {
    producePostgresSecurityOracleEvidence({
      context,
      evidencePath: process.env.RUNTIME_EVIDENCE_PATH,
      riskBytes,
      riskResult,
    });
    return;
  }
  if (isC3RPRiskCandidate(riskResult)) {
    produceC3RPNativeEvidence({
      context,
      evidencePath: process.env.RUNTIME_EVIDENCE_PATH,
      riskBytes,
      riskResult,
    });
    return;
  }
  const migration = resolveTargetMigration(riskResult, context.headSha);
  let cleanupComplete = false;
  let passedAssertions;
  try {
    startContainer(context.containerName);
    passedAssertions = runDatabaseAssertions(context.containerName, migration);
  } finally {
    cleanupComplete = cleanupContainer(context.containerName);
  }
  if (!cleanupComplete) throw new Error("isolated Postgres cleanup is incomplete.");
  passedAssertions.add("cleanup_complete");
  const contract = evidenceContract(migration);
  if (
    passedAssertions.size !== contract.assertionIds.length ||
    contract.assertionIds.some((id) => !passedAssertions.has(id))
  ) {
    throw new Error("required runtime assertion set is incomplete.");
  }
  writeEvidence({ context, migration, passedAssertions, riskBytes });
}

function main() {
  const options = parseArguments();
  if (options.cleanupOnly) {
    const complete = cleanupContainer(executionContext().containerName);
    if (options.requireComplete && !complete) throw new Error("isolated Postgres cleanup is incomplete.");
    console.log(JSON.stringify({ cleanup: complete ? "complete" : "incomplete" }));
    return;
  }
  produce(options.riskFile);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
