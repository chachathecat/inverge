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
  "s236p.postgres.owner-private.v1";
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
  "migration_prerequisites_and_target_applied",
  "owner_a_metadata_storage_crud_allowed",
  "bidirectional_owner_rls_isolation",
  "anonymous_access_denied",
  "signed_url_ttl_boundary_enforced",
  "retention_temporary_ttl_cache_delete_sla_enforced",
  "deterministic_expiry_verified",
  "provider_mode_none_and_external_calls_zero",
  "raw_emission_and_real_content_zero",
  "metadata_event_retention_enforced",
  "cleanup_complete",
]);
const S236P_MIGRATION_PATH =
  "supabase/migrations/20260730023248_s236p_lean_owner_private.sql";

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
    migrationPaths.length !== 1 ||
    runtimeRequiredPaths.length !== 1 ||
    runtimeRequiredPaths[0] !== migrationPaths[0]
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
  const migration = migrations[0];
  const text = migration.content.toString("utf8");
  let assertionIds;
  let producerVersion;
  let requiredMarkers;
  let markerError;
  if (
    /^supabase\/migrations\/\d+_s233a_answer_review_persistence\.sql$/.test(
      migration.path,
    )
  ) {
    assertionIds = RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = RUNTIME_EVIDENCE_PRODUCER_VERSION;
    requiredMarkers = [
      "claim_s233a_answer_review_v1",
      "transition_s233a_answer_review_v1",
      "s233a review queue rpc insert namespace",
      "s233a today seed rpc insert namespace",
    ];
    markerError =
      "S233A migration does not match the supported adapter contract.";
  } else if (migration.path === S236P_MIGRATION_PATH) {
    assertionIds = S236P_RUNTIME_EVIDENCE_ASSERTION_IDS;
    producerVersion = S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    requiredMarkers = [
      "s236p-owner-private-v1",
      "public.s236p_owner_private_objects",
      "public.s236p_owner_private_events",
      "public.s236p_authorize_signed_url_v1",
      "public.s236p_expired_object_paths_v1",
      "s236p owner private select",
      "contains_real_content",
    ];
    markerError =
      "S236P migration does not match the supported adapter contract.";
  } else {
    throw new Error(
      "no closed runtime-evidence adapter supports this runtime-sensitive change set.",
    );
  }
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) throw new Error(markerError);
  }
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
