#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { firstMatchingGlob } from "./glob-match.mjs";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";
import {
  ORACLE_ALLOWED_CHANGED_PATHS,
  ORACLE_IMAGE,
  ORACLE_RUNTIME_REQUIRED_PATHS,
  ORACLE_SERVER_VERSION_NUM,
  producePostgresSecurityOracleEvidence,
} from "./wcv-c3-pre-p-postgresql-security-state-oracle.mjs";

export const C3R_P_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json";
export const C3R_P_APPEND_PATH =
  "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql";
export const C3R_T_ENUM_MIGRATION_PATH =
  "supabase/migrations/20260825054823_c3r_t_theory_durable_learning_delta.sql";
export const C3R_T_INTEGRATION_MIGRATION_PATH =
  "supabase/migrations/20260825055252_c3r_t_theory_common_substrate_integration.sql";
export const C3R_L_ENUM_MIGRATION_PATH =
  "supabase/migrations/20260825122242_c3r_l_law_durable_learning_delta.sql";
export const C3R_L_INTEGRATION_MIGRATION_PATH =
  "supabase/migrations/20260825122257_c3r_l_law_common_substrate_integration.sql";
// The validated PR #800 squash result is the immutable Practice inventory
// boundary. Successor stages may append migrations, while every path that
// existed at this boundary must still be present with its validated bytes.
export const C3R_P_VALIDATED_RESULTING_MAIN_SHA =
  "71fd878a7369c25a153bc90389347039684c501f";
export const C3R_P_VALIDATED_RESULTING_MAIN_TREE =
  "f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c";
export const C3R_P_AUTHORIZED_EXISTING_MIGRATION_PATHS = Object.freeze([
  "supabase/migrations/20260608090000_create_personal_learning_states.sql",
  "supabase/migrations/20260615090000_legal_grounding.sql",
  "supabase/migrations/20260615100000_legal_article_chunk_identity.sql",
  "supabase/migrations/20260615110000_legal_retrieval.sql",
  "supabase/migrations/20260615120000_legal_grounding_guard.sql",
  "supabase/migrations/20260616100000_legal_grounding_guard_service_role_grant.sql",
  "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
]);
const C3R_P_MIGRATION_AUTHORITY_PATH =
  "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json";
export const C3R_P_RUNTIME_SCHEMA_VERSION =
  "inverge.wcv_c3r_p.practice_runtime.v1";
export const C3R_P_RUNTIME_PRODUCER_VERSION =
  "wcv-c3r-p.practice-common-durable-runtime.v1";
export const C3R_P_NATIVE_SCHEMA_VERSION =
  "inverge.runtime_evidence.c3r_p.v1";
export const C3R_T_NATIVE_SCHEMA_VERSION =
  "inverge.runtime_evidence.c3r_t.v1";
export const C3R_T_RUNTIME_PRODUCER_VERSION =
  "wcv-c3r-t.theory-durable-learning-delta.v1";
export const C3R_L_NATIVE_SCHEMA_VERSION =
  "inverge.runtime_evidence.c3r_l.v1";
export const C3R_L_RUNTIME_PRODUCER_VERSION =
  "wcv-c3r-l.law-durable-learning-delta.v1";
export const C3R_P_RUNTIME_REQUIRED_PATTERNS = Object.freeze([
  C3R_P_CONTRACT_PATH,
  ...C3R_P_AUTHORIZED_EXISTING_MIGRATION_PATHS,
  C3R_P_APPEND_PATH,
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
  "app/api/review-os/c3r-p/**",
  "lib/review-os/c3r-p-*.ts",
]);
export const C3R_T_RUNTIME_REQUIRED_PATHS = Object.freeze([
  C3R_T_ENUM_MIGRATION_PATH,
  C3R_T_INTEGRATION_MIGRATION_PATH,
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
]);
export const C3R_L_RUNTIME_REQUIRED_PATHS = Object.freeze([
  C3R_L_ENUM_MIGRATION_PATH,
  C3R_L_INTEGRATION_MIGRATION_PATH,
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
]);

const SHA40 = /^[0-9a-f]{40}$/;
const SHA64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISPOSABLE_PROFILE_CONTAINER = /^supabase_db_c3r-p-cycle-[12]-\d+-\d+$/;
const DISPOSABLE_PROFILE_EMAILS = Object.freeze([
  /^c3r-p-a-[12]-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\.invalid$/i,
  /^c3r-p-b-[12]-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\.invalid$/i,
  /^c3r-p-non-owner-[12]-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\.invalid$/i,
]);
const ENTRY_CLASSIFICATIONS = Object.freeze([
  "C3R_P_ENTRY_AUTH_SESSION_NOT_VISIBLE",
  "C3R_P_ENTRY_GENERIC_APP_ACCESS_DENIED",
  "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED",
  "C3R_P_ENTRY_NOT_FOUND",
  "C3R_P_ENTRY_CLIENT_API_TIMEOUT",
  "C3R_P_ENTRY_NEXT_RENDER_ERROR",
  "C3R_P_ENTRY_VERIFIED",
]);
const ENTRY_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "artifactKind",
  "classification",
  "loginResponseStatus",
  "browserSessionVisible",
  "gotoStatus",
  "gotoFailureCategory",
  "finalPathname",
  "reachedLogin",
  "notFoundSurface",
  "genericReviewOsAccessState",
  "c3rPLoadingSurface",
  "c3rPRuntimeMarker",
  "apiStatus",
  "apiErrorCode",
  "browserConsoleErrorCategories",
  "pageErrorCategories",
  "requestFailures",
  "cookies",
]);
const ENTRY_DIAGNOSTIC_MAX_BYTES = 64 * 1024;
const RUNTIME_ARTIFACT_KEYS = Object.freeze([
  "schemaVersion",
  "producerVersion",
  "artifactKind",
  "artifactRef",
  "artifactSha256",
  "browserToPostgresEvidenceRef",
  "practiceEvidenceRefs",
  "perItemRuntimeEvidenceRefs",
  "candidateHead",
  "candidateTree",
  "practiceEvidenceDigest",
  "migrationInventory",
  "appendIdentity",
  "resetReplayCycles",
  "oracle",
  "security",
  "featureBoundary",
  "dataBoundary",
  "mutationBoundary",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function capUtf8Tail(value, maximumBytes) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length <= maximumBytes) return value;
  return bytes.subarray(bytes.length - maximumBytes).toString("utf8").replace(/^\uFFFD+/, "");
}

export function redactC3RPEntryDiagnosticText(value, secretValues = []) {
  let redacted = String(value);
  for (const secret of secretValues) {
    if (typeof secret === "string" && secret.length >= 4) {
      redacted = redacted.replaceAll(secret, "[REDACTED]");
    }
  }
  return redacted
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]")
    .replace(/((?:cookie|set-cookie)\s*:\s*)[^\r\n]*/gi, "$1[REDACTED]")
    .replace(/((?:authorization|cookie|set-cookie|password|api[_-]?key|secret)\s*[:=]\s*)[^\s,;]+/gi,
      "$1[REDACTED]")
    .replace(/((?:token|key|password|code)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi, "Bearer [REDACTED]");
}

export function createC3RPEntryDiagnosticLog(
  filePath,
  secretValues = [],
  maximumBytes = ENTRY_DIAGNOSTIC_MAX_BYTES,
) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error("C3R-P diagnostic log byte cap is invalid.");
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "", { mode: 0o600 });
  let pendingRaw = "";
  let retained = "";
  let finished = false;
  const flush = (force = false) => {
    const retainForBoundary = force ? 0 : 1_024;
    if (pendingRaw.length <= retainForBoundary && !force) return;
    const splitAt = Math.max(0, pendingRaw.length - retainForBoundary);
    retained = capUtf8Tail(
      retained + redactC3RPEntryDiagnosticText(pendingRaw.slice(0, splitAt), secretValues),
      maximumBytes,
    );
    pendingRaw = pendingRaw.slice(splitAt);
    fs.writeFileSync(filePath, retained, { mode: 0o600 });
  };
  return {
    append(chunk) {
      if (finished) return;
      pendingRaw += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      flush(false);
    },
    finish() {
      if (finished) return;
      finished = true;
      flush(true);
    },
  };
}

function metadataCategory(value) {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(value);
}

export function validateC3RPEntryReceipt(receipt) {
  exactKeys(receipt, ENTRY_RECEIPT_KEYS, "C3R-P entry receipt");
  if (receipt.schemaVersion !== "inverge.c3r_p.entry_metadata.v1" ||
    receipt.artifactKind !== "C3R_P_ENTRY_METADATA" ||
    !ENTRY_CLASSIFICATIONS.includes(receipt.classification)) {
    throw new Error("C3R-P entry receipt identity is invalid.");
  }
  for (const status of [receipt.loginResponseStatus, receipt.gotoStatus, receipt.apiStatus]) {
    if (status !== null && (!Number.isSafeInteger(status) || status < 100 || status > 599)) {
      throw new Error("C3R-P entry receipt status is invalid.");
    }
  }
  if (typeof receipt.finalPathname !== "string" || !receipt.finalPathname.startsWith("/") ||
    receipt.finalPathname.includes("?") || receipt.finalPathname.length > 256) {
    throw new Error("C3R-P entry receipt pathname is invalid.");
  }
  for (const key of [
    "browserSessionVisible", "reachedLogin", "notFoundSurface", "genericReviewOsAccessState",
    "c3rPLoadingSurface", "c3rPRuntimeMarker",
  ]) {
    if (typeof receipt[key] !== "boolean") throw new Error(`C3R-P entry receipt ${key} is invalid.`);
  }
  if (receipt.gotoFailureCategory !== null && !metadataCategory(receipt.gotoFailureCategory)) {
    throw new Error("C3R-P entry receipt navigation category is invalid.");
  }
  if (receipt.apiErrorCode !== null &&
    (typeof receipt.apiErrorCode !== "string" || !/^[a-z0-9_-]{1,64}$/.test(receipt.apiErrorCode))) {
    throw new Error("C3R-P entry receipt API error code is invalid.");
  }
  for (const categories of [receipt.browserConsoleErrorCategories, receipt.pageErrorCategories]) {
    if (!Array.isArray(categories) || categories.length > 20 || !categories.every(metadataCategory)) {
      throw new Error("C3R-P entry receipt browser category is invalid.");
    }
  }
  if (!Array.isArray(receipt.requestFailures) || receipt.requestFailures.length > 20) {
    throw new Error("C3R-P entry receipt request failures are invalid.");
  }
  for (const failure of receipt.requestFailures) {
    exactKeys(failure, ["pathname", "category"], "C3R-P entry request failure");
    if (typeof failure.pathname !== "string" || failure.pathname.includes("?") ||
      failure.pathname.length > 256 || !metadataCategory(failure.category)) {
      throw new Error("C3R-P entry request failure metadata is invalid.");
    }
  }
  if (!Array.isArray(receipt.cookies) || receipt.cookies.length > 32) {
    throw new Error("C3R-P entry receipt cookie metadata is invalid.");
  }
  for (const cookie of receipt.cookies) {
    exactKeys(cookie, ["name", "domain", "path"], "C3R-P entry cookie metadata");
    if (![cookie.name, cookie.domain, cookie.path].every((item) =>
      typeof item === "string" && item.length > 0 && item.length <= 256)) {
      throw new Error("C3R-P entry cookie metadata value is invalid.");
    }
  }
  const serialized = JSON.stringify(receipt);
  if (/@|\beyJ[A-Za-z0-9_-]{10,}\.|password|cookieValue|learnerBody/i.test(serialized)) {
    throw new Error("C3R-P entry receipt contains prohibited private or credential data.");
  }
  return { classification: receipt.classification, finalPathname: receipt.finalPathname };
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are not exact.`);
  }
}

function uniqueExact(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${label} does not match the closed ordered inventory.`);
  }
}

function readContract(repositoryRoot = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, C3R_P_CONTRACT_PATH), "utf8"));
}

function evidenceDigest(input) {
  return sha256(Buffer.from(canonicalJson({
    artifactRef: input.artifactRef,
    browserToPostgresEvidenceRef: input.browserToPostgresEvidenceRef,
    candidateHead: input.candidateHead,
    candidateTree: input.candidateTree,
    perItemRuntimeEvidenceRefs: input.perItemRuntimeEvidenceRefs,
    practiceEvidenceRefs: input.practiceEvidenceRefs,
  }), "utf8"));
}

function artifactDigest(artifact) {
  const payload = { ...artifact };
  delete payload.artifactSha256;
  return sha256(Buffer.from(canonicalJson(payload), "utf8"));
}

function perItemReferences(practiceEvidenceRefs) {
  return practiceEvidenceRefs.map((evidenceRef) => {
    const match = evidenceRef.match(/#(706|707|708):([A-Z0-9_]+)$/);
    if (!match) throw new Error("Practice evidence reference has an invalid identity.");
    return {
      issue: Number(match[1]),
      evidenceId: match[2],
      evidenceRef,
      runtimeEvidenceRef: evidenceRef,
    };
  });
}

export function createPracticeRuntimeArtifact(input, repositoryRoot = process.cwd()) {
  const contract = readContract(repositoryRoot);
  const authority = contract.practiceRuntimeArtifact;
  const migrationInventory = input.migrationInventory;
  const artifact = {
    schemaVersion: C3R_P_RUNTIME_SCHEMA_VERSION,
    producerVersion: C3R_P_RUNTIME_PRODUCER_VERSION,
    artifactKind: "PRACTICE_RUNTIME",
    artifactRef: authority.artifactRef,
    artifactSha256: "",
    browserToPostgresEvidenceRef: authority.browserToPostgresEvidenceRef,
    practiceEvidenceRefs: [...authority.practiceEvidenceRefs],
    perItemRuntimeEvidenceRefs: perItemReferences(authority.practiceEvidenceRefs),
    candidateHead: input.candidateHead,
    candidateTree: input.candidateTree,
    practiceEvidenceDigest: "",
    migrationInventory,
    appendIdentity: input.appendIdentity,
    resetReplayCycles: input.resetReplayCycles,
    oracle: input.oracle,
    security: input.security,
    featureBoundary: {
      flag: contract.runtimeBoundary.featureFlag,
      defaultOff: true,
      ownerAllowlistRequired: true,
      productionDenied: true,
      providerCalls: 0,
    },
    dataBoundary: {
      metadataOnly: true,
      rawLearnerBodies: 0,
      sharedPrivateBodies: 0,
    },
    mutationBoundary: {
      remoteSupabase: 0,
      production: 0,
      successorStarted: false,
    },
  };
  artifact.practiceEvidenceDigest = evidenceDigest(artifact);
  artifact.artifactSha256 = artifactDigest(artifact);
  return artifact;
}

export function validatePracticeRuntimeArtifact(artifact, repositoryRoot = process.cwd()) {
  const contract = readContract(repositoryRoot);
  const authority = contract.practiceRuntimeArtifact;
  exactKeys(artifact, RUNTIME_ARTIFACT_KEYS, "Practice runtime artifact");
  if (artifact.schemaVersion !== C3R_P_RUNTIME_SCHEMA_VERSION ||
    artifact.producerVersion !== C3R_P_RUNTIME_PRODUCER_VERSION ||
    artifact.artifactKind !== "PRACTICE_RUNTIME" ||
    artifact.artifactRef !== authority.artifactRef) {
    throw new Error("Practice runtime artifact identity is invalid.");
  }
  if (!SHA40.test(artifact.candidateHead) || !SHA40.test(artifact.candidateTree)) {
    throw new Error("Practice runtime candidate head/tree identity is invalid.");
  }
  if (process.env.PR_HEAD_SHA && artifact.candidateHead !== process.env.PR_HEAD_SHA.toLowerCase()) {
    throw new Error("Practice runtime candidate head does not match the exact PR head.");
  }
  if (process.env.PR_HEAD_SHA) {
    validateC3RPMigrationAuthorityBinding(repositoryRoot, artifact.candidateHead);
  }
  uniqueExact(artifact.practiceEvidenceRefs, authority.practiceEvidenceRefs,
    "Practice evidence references");
  if (artifact.browserToPostgresEvidenceRef !== authority.browserToPostgresEvidenceRef) {
    throw new Error("Browser-to-Postgres evidence reference is not cross-bound.");
  }
  const expectedPerItem = perItemReferences(authority.practiceEvidenceRefs);
  if (canonicalJson(artifact.perItemRuntimeEvidenceRefs) !== canonicalJson(expectedPerItem)) {
    throw new Error("Per-item runtime evidence references are not cross-bound.");
  }
  if (artifact.practiceEvidenceDigest !== evidenceDigest(artifact)) {
    throw new Error("Practice evidence digest is invalid.");
  }
  if (!SHA64.test(artifact.artifactSha256) || artifact.artifactSha256 !== artifactDigest(artifact)) {
    throw new Error("Practice runtime artifact SHA-256 is invalid.");
  }
  if (!Array.isArray(artifact.migrationInventory) || artifact.migrationInventory.length !== 26 ||
    new Set(artifact.migrationInventory.map((entry) => entry.path)).size !== 26 ||
    artifact.migrationInventory.some((entry) => !SHA64.test(entry.sha256))) {
    throw new Error("Practice runtime migration inventory is not the exact 26-file inventory.");
  }
  if (artifact.appendIdentity.path !== C3R_P_APPEND_PATH ||
    !SHA40.test(artifact.appendIdentity.gitBlob) || !SHA64.test(artifact.appendIdentity.sha256) ||
    artifact.migrationInventory.find((entry) => entry.path === C3R_P_APPEND_PATH)?.sha256 !==
      artifact.appendIdentity.sha256) {
    throw new Error("Practice append identity is invalid.");
  }
  if (!Array.isArray(artifact.resetReplayCycles) || artifact.resetReplayCycles.length !== 2) {
    throw new Error("Exactly two reset/replay cycles are required.");
  }
  const uniqueCycleKeys = ["receiptId", "databaseIdentity", "containerIdentity", "volumeIdentity"];
  for (const [index, cycle] of artifact.resetReplayCycles.entries()) {
    exactKeys(cycle, [
      "cycle", "receiptId", "databaseIdentity", "containerIdentity", "volumeIdentity",
      "migrationCount", "serverVersionNum", "browserToPostgres", "restartRestore",
      "exportDelete", "reopenedCompletion", "planBlockCompletion",
      "completeLearnerExport", "transferTaskClosure", "planBlockStateClosure",
      "planProjectionClosure", "deleteMutationSerialization", "deleteWinsBothLockOrders",
      "proposedPlanTerminalization",
      "assistedD1History", "assistedD1Rescheduling", "delayedReviewEligibility",
      "stateMachineMatrixPairs",
      "stateMachineMatrixResult",
      "oracleEvidenceSha256", "cleanup",
    ], `reset/replay cycle ${index + 1}`);
    if (cycle.cycle !== index + 1 || cycle.migrationCount !== 26 ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
      cycle.browserToPostgres !== true || cycle.restartRestore !== true ||
      cycle.exportDelete !== true || cycle.reopenedCompletion !== true ||
      cycle.planBlockCompletion !== true || cycle.completeLearnerExport !== true ||
      cycle.transferTaskClosure !== true || cycle.planBlockStateClosure !== true ||
      cycle.planProjectionClosure !== true || cycle.deleteMutationSerialization !== true ||
      cycle.deleteWinsBothLockOrders !== true ||
      cycle.proposedPlanTerminalization !== true ||
      cycle.assistedD1History !== true || cycle.assistedD1Rescheduling !== true ||
      cycle.delayedReviewEligibility !== true ||
      cycle.stateMachineMatrixPairs !== 112 ||
      cycle.stateMachineMatrixResult !== "passed" ||
      cycle.cleanup !== "complete" ||
      !SHA64.test(cycle.oracleEvidenceSha256)) {
      throw new Error(`reset/replay cycle ${index + 1} is incomplete.`);
    }
  }
  for (const key of uniqueCycleKeys) {
    if (artifact.resetReplayCycles[0][key] === artifact.resetReplayCycles[1][key]) {
      throw new Error(`reset/replay cycles reused ${key}.`);
    }
  }
  if (artifact.oracle?.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
    artifact.oracle?.cycleEvidenceCount !== 2 || artifact.oracle?.status !== "verified") {
    throw new Error("PostgreSQL 15.8 oracle binding is invalid.");
  }
  if (artifact.security?.rls !== "enabled_and_forced" ||
    artifact.security?.anonymous !== "denied" ||
    artifact.security?.authenticatedDirectMutation !== "denied" ||
    artifact.security?.crossUser !== "denied_both_directions" ||
    artifact.security?.serviceOnlyMutation !== "verified" ||
    artifact.security?.subjectIdentity !== "PRACTICE_ONLY") {
    throw new Error("Practice runtime database security binding is invalid.");
  }
  if (artifact.featureBoundary?.defaultOff !== true ||
    artifact.featureBoundary?.ownerAllowlistRequired !== true ||
    artifact.featureBoundary?.productionDenied !== true ||
    artifact.featureBoundary?.providerCalls !== 0 ||
    artifact.dataBoundary?.metadataOnly !== true ||
    artifact.dataBoundary?.rawLearnerBodies !== 0 ||
    artifact.dataBoundary?.sharedPrivateBodies !== 0 ||
    artifact.mutationBoundary?.remoteSupabase !== 0 ||
    artifact.mutationBoundary?.production !== 0 ||
    artifact.mutationBoundary?.successorStarted !== false) {
    throw new Error("Practice runtime privacy, feature, or mutation boundary is invalid.");
  }
  return {
    artifactRef: artifact.artifactRef,
    artifactSha256: artifact.artifactSha256,
    practiceEvidenceRefs: [...artifact.practiceEvidenceRefs],
    browserToPostgresEvidenceRef: artifact.browserToPostgresEvidenceRef,
    perItemRuntimeEvidenceRefs: artifact.perItemRuntimeEvidenceRefs.map((item) => ({ ...item })),
    candidateHead: artifact.candidateHead,
    candidateTree: artifact.candidateTree,
    practiceEvidenceDigest: artifact.practiceEvidenceDigest,
  };
}

export function isC3RPRiskCandidate(riskResult) {
  if (riskResult?.changedFilesTruncated !== false ||
    !Array.isArray(riskResult.changedFiles)) return false;
  const runtimeRequiredPaths = runtimeRequiredPathRecords(riskResult.changedFiles)
    .map(({ path: file }) => file);
  return runtimeRequiredPaths.length > 0 && runtimeRequiredPaths.every(
    (file) => firstMatchingGlob(C3R_P_RUNTIME_REQUIRED_PATTERNS, file) !== null,
  );
}

export function isC3RTRiskCandidate(riskResult) {
  if (riskResult?.runtimeEvidenceRequired !== true ||
    riskResult.changedFilesTruncated !== false || !Array.isArray(riskResult.changedFiles) ||
    !Array.isArray(riskResult.runtimeReasons)) return false;
  const changedFiles = riskResult.changedFiles;
  if (new Set(changedFiles).size !== changedFiles.length ||
    !changedFiles.includes(C3R_T_ENUM_MIGRATION_PATH) ||
    !changedFiles.includes(C3R_T_INTEGRATION_MIGRATION_PATH)) return false;
  const runtimeRequiredPaths = runtimeRequiredPathRecords(changedFiles)
    .map(({ path: file }) => file);
  return runtimeRequiredPaths.length > 0 && runtimeRequiredPaths.every(
    (file) => C3R_T_RUNTIME_REQUIRED_PATHS.includes(file),
  ) && canonicalJson(riskResult.runtimeReasons) === canonicalJson(
    runtimeRequiredPathRecords(changedFiles),
  );
}

export function isC3RLRiskCandidate(riskResult) {
  if (riskResult?.runtimeEvidenceRequired !== true ||
    riskResult.changedFilesTruncated !== false || !Array.isArray(riskResult.changedFiles) ||
    !Array.isArray(riskResult.runtimeReasons)) return false;
  const changedFiles = riskResult.changedFiles;
  if (new Set(changedFiles).size !== changedFiles.length ||
    !changedFiles.includes(C3R_L_ENUM_MIGRATION_PATH) ||
    !changedFiles.includes(C3R_L_INTEGRATION_MIGRATION_PATH)) return false;
  const runtimeRequiredPaths = runtimeRequiredPathRecords(changedFiles)
    .map(({ path: file }) => file);
  return runtimeRequiredPaths.length > 0 && runtimeRequiredPaths.every(
    (file) => C3R_L_RUNTIME_REQUIRED_PATHS.includes(file),
  ) && canonicalJson(riskResult.runtimeReasons) === canonicalJson(
    runtimeRequiredPathRecords(changedFiles),
  );
}

function git(repositoryRoot, args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

const GIT_ANCESTRY_RETRY_DELAYS_MS = Object.freeze([0, 100, 250]);
const GIT_ANCESTRY_MAX_RAW_COMMITS = 10_000;

function waitForGitAncestryRetry(delayMs) {
  if (delayMs <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
}

function resolveRawCommitOid(spawnGit, repositoryRoot, value) {
  if (value !== "HEAD" && !SHA40.test(value)) {
    throw new Error("C3R-P Git ancestry identity is invalid.");
  }
  const result = spawnGit(
    "git",
    ["--no-replace-objects", "rev-parse", "--verify", `${value}^{commit}`],
    { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  if (result.status !== 0 || typeof result.stdout !== "string") {
    throw new Error("C3R-P Git ancestry identity was unavailable.");
  }
  const resolved = result.stdout.trim();
  if (!SHA40.test(resolved) || (value !== "HEAD" && resolved !== value)) {
    throw new Error("C3R-P Git ancestry identity was unavailable.");
  }
  return resolved;
}

function rawCommitParents(spawnGit, repositoryRoot, commitSha) {
  const type = spawnGit("git", ["--no-replace-objects", "cat-file", "-t", commitSha], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (type.status !== 0 || typeof type.stdout !== "string" || type.stdout.trim() !== "commit") {
    throw new Error("C3R-P raw commit ancestry proof was unavailable.");
  }
  const object = spawnGit("git", ["--no-replace-objects", "cat-file", "-p", commitSha], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (object.status !== 0 || typeof object.stdout !== "string") {
    throw new Error("C3R-P raw commit ancestry proof was unavailable.");
  }
  const headerEnd = object.stdout.search(/\r?\n\r?\n/);
  if (headerEnd < 0) throw new Error("C3R-P raw commit ancestry proof was malformed.");
  const header = object.stdout.slice(0, headerEnd).split(/\r?\n/);
  if (!/^tree [0-9a-f]{40}$/.test(header[0] ?? "")) {
    throw new Error("C3R-P raw commit ancestry proof was malformed.");
  }
  const parents = [];
  let index = 1;
  while (index < header.length && header[index].startsWith("parent ")) {
    const line = header[index];
    const match = line.match(/^parent ([0-9a-f]{40})$/);
    if (!match) throw new Error("C3R-P raw commit ancestry proof was malformed.");
    parents.push(match[1]);
    index += 1;
  }
  if (header.slice(index).some((line) => /^parent(?:\s|$)/.test(line))) {
    throw new Error("C3R-P raw commit ancestry proof was malformed.");
  }
  return parents;
}

export function isC3RPGitAncestor(
  repositoryRoot,
  ancestorSha,
  descendantSha,
  options = {},
) {
  const spawnGit = options.spawnGit ?? spawnSync;
  const wait = options.wait ?? waitForGitAncestryRetry;
  const resolvedAncestor = resolveRawCommitOid(spawnGit, repositoryRoot, ancestorSha);
  const resolvedDescendant = resolveRawCommitOid(spawnGit, repositoryRoot, descendantSha);
  for (const delayMs of GIT_ANCESTRY_RETRY_DELAYS_MS) {
    wait(delayMs);
    const result = spawnGit(
      "git",
      ["--no-replace-objects", "merge-base", "--is-ancestor", resolvedAncestor, resolvedDescendant],
      { cwd: repositoryRoot, stdio: "ignore" },
    );
    if (result.status === 0) return true;
  }

  const pending = [resolvedDescendant];
  const discovered = new Set(pending);
  while (pending.length > 0) {
    const current = pending.pop();
    const parents = rawCommitParents(spawnGit, repositoryRoot, current);
    if (current === resolvedAncestor) return true;
    for (const parent of parents) {
      if (discovered.has(parent)) continue;
      if (discovered.size >= GIT_ANCESTRY_MAX_RAW_COMMITS) {
        throw new Error("C3R-P raw commit ancestry proof exceeded its bounded traversal.");
      }
      discovered.add(parent);
      pending.push(parent);
    }
  }
  return false;
}

export function assertC3RPGitAncestor(
  repositoryRoot,
  ancestorSha,
  descendantSha,
  options = {},
) {
  if (isC3RPGitAncestor(repositoryRoot, ancestorSha, descendantSha, options)) return;
  throw new Error("C3R-P head does not descend from the validated authority merge.");
}

export function c3rPReceiptBoundaryRef(repositoryRoot, headSha = "HEAD") {
  const resolvedHead = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${headSha}^{commit}`,
  ]);
  if (!isC3RPGitAncestor(
    repositoryRoot,
    C3R_P_VALIDATED_RESULTING_MAIN_SHA,
    resolvedHead,
  )) {
    return { inventoryRef: resolvedHead, contentRef: resolvedHead };
  }
  const boundaryTree = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify",
    `${C3R_P_VALIDATED_RESULTING_MAIN_SHA}^{tree}`,
  ]);
  if (boundaryTree !== C3R_P_VALIDATED_RESULTING_MAIN_TREE) {
    throw new Error("validated C3R-P resulting-main tree is unavailable or mismatched.");
  }
  return {
    inventoryRef: C3R_P_VALIDATED_RESULTING_MAIN_SHA,
    contentRef: resolvedHead,
  };
}

export function exactMigrationInventory(repositoryRoot, headSha = "HEAD") {
  const { inventoryRef, contentRef } = c3rPReceiptBoundaryRef(repositoryRoot, headSha);
  const names = git(repositoryRoot, [
    "--no-replace-objects", "ls-tree", "-r", "--name-only", inventoryRef,
    "--", "supabase/migrations",
  ])
    .split(/\r?\n/).filter((name) => /^supabase\/migrations\/\d{8,14}_[a-z0-9_]+\.sql$/.test(name));
  if (names.length !== 26) throw new Error("effective migration inventory must contain exactly 26 paths.");
  return names.map((migrationPath) => ({
    path: migrationPath,
    sha256: sha256(Buffer.from(execFileSync("git", [
      "--no-replace-objects", "show", `${contentRef}:${migrationPath}`,
    ], {
      cwd: repositoryRoot,
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
    }))),
  }));
}

export function validateC3RPMigrationAuthorityBinding(
  repositoryRoot = process.cwd(),
  headSha = "HEAD",
) {
  const contract = readContract(repositoryRoot);
  const authorityContract = JSON.parse(fs.readFileSync(
    path.join(repositoryRoot, C3R_P_MIGRATION_AUTHORITY_PATH),
    "utf8",
  ));
  const authority = contract.authority;
  const binding = contract.migrationAuthorityBinding;
  const specification = authorityContract.futureC3rPMigrationAuthorityBindingV1;
  exactKeys(binding, specification.requiredFieldsExactly, "C3R-P migration authority binding");
  if (binding.authorityDecisionSha256 !== authority.authorityDecisionSha256 ||
    binding.authorityContractSha256 !== authority.authorityContractSha256 ||
    binding.validatedAuthorityResultingMainSha !== authority.validatedAuthorityResultingMainSha ||
    binding.validatedAuthorityResultingMainTree !== authority.validatedAuthorityResultingMainTree ||
    binding.appendPath !== C3R_P_APPEND_PATH || binding.remoteMutationCount !== 0) {
    throw new Error("C3R-P migration authority identity or mutation boundary is invalid.");
  }
  if (!Array.isArray(binding.operationBindings) ||
    binding.operationBindings.length !== specification.operationIdsExactly.length ||
    !Array.isArray(contract.pathManifest?.operationPaths) ||
    contract.pathManifest.operationPaths.length !== binding.operationBindings.length) {
    throw new Error("C3R-P migration operation binding inventory is invalid.");
  }
  for (const [index, operation] of binding.operationBindings.entries()) {
    exactKeys(operation, specification.operationBindingFieldsExactly,
      `C3R-P migration operation binding ${index + 1}`);
    const paths = contract.pathManifest.operationPaths[index];
    exactKeys(paths, ["operationId", "currentPath", "futurePath"],
      `C3R-P migration operation path ${index + 1}`);
    if (operation.operationId !== specification.operationIdsExactly[index] ||
      paths.operationId !== operation.operationId) {
      throw new Error("C3R-P migration operation order or path identity is invalid.");
    }
    const bytes = execFileSync("git", ["show", `${headSha}:${paths.futurePath}`], {
      cwd: repositoryRoot,
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
    });
    const canonical = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
    if (git(repositoryRoot, ["rev-parse", `${headSha}:${paths.futurePath}`]) !== operation.futureGitBlob ||
      sha256(bytes) !== operation.futureRawSha256 ||
      sha256(canonical) !== operation.futureCanonicalUtf8LfSha256) {
      throw new Error(`C3R-P migration operation digest drifted: ${operation.operationId}.`);
    }
    const oldPathStatus = spawnSync("git", ["cat-file", "-e", `${headSha}:${paths.currentPath}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    }).status;
    if (paths.currentPath !== paths.futurePath && oldPathStatus === 0) {
      throw new Error(`C3R-P renamed source still exists: ${paths.currentPath}.`);
    }
  }
  const appendBytes = execFileSync("git", ["show", `${headSha}:${C3R_P_APPEND_PATH}`], {
    cwd: repositoryRoot,
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  const inventory = exactMigrationInventory(repositoryRoot, headSha);
  if (sha256(appendBytes) !== binding.candidateSqlSha256 ||
    sha256(Buffer.from(canonicalJson(inventory), "utf8")) !== binding.effectiveInventorySha256) {
    throw new Error("C3R-P append or effective inventory digest is invalid.");
  }
  assertC3RPGitAncestor(repositoryRoot, binding.validatedAuthorityResultingMainSha, headSha);
  for (const [artifactPath, expectedSha256] of [
    [authority.authorityDecisionRef, authority.authorityDecisionSha256],
    [authority.authorityContractRef, authority.authorityContractSha256],
  ]) {
    for (const ref of [binding.validatedAuthorityResultingMainSha, headSha]) {
      const bytes = execFileSync("git", ["show", `${ref}:${artifactPath}`], {
        cwd: repositoryRoot,
        encoding: "buffer",
        maxBuffer: 32 * 1024 * 1024,
      });
      if (sha256(bytes) !== expectedSha256) {
        throw new Error(`C3R-P authority artifact drifted: ${artifactPath}.`);
      }
    }
  }
  return inventory;
}

export function runInstalledOracle(input) {
  const riskResult = {
    version: 1,
    risk: "high",
    reasons: [],
    runtimeEvidenceRequired: true,
    runtimeReasons: ORACLE_RUNTIME_REQUIRED_PATHS.map((file) => ({ path: file, pattern: file })),
    changedFiles: [...ORACLE_ALLOWED_CHANGED_PATHS],
    changedFilesTruncated: false,
  };
  const riskBytes = Buffer.from(`${JSON.stringify(riskResult)}\n`, "utf8");
  producePostgresSecurityOracleEvidence({
    context: input.context,
    evidencePath: input.evidencePath,
    repoRoot: input.repositoryRoot,
    riskBytes,
    riskResult,
  });
  const evidence = JSON.parse(fs.readFileSync(input.evidencePath, "utf8"));
  if (evidence.oracle?.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
    evidence.status !== "verified" || evidence.cleanup?.status !== "complete") {
    throw new Error("installed PostgreSQL 15.8 oracle did not verify.");
  }
  return { evidence, sha256: sha256(fs.readFileSync(input.evidencePath)) };
}

function nativeEvidenceKeys() {
  return [
    "schemaVersion", "producerVersion", "status", "sourceLevelOnly", "verifiedAt",
    "pullRequestHeadSha", "pullRequestHeadTree", "githubRunId", "githubRunAttempt",
    "riskFileSha256", "migrations", "cycles", "assertions", "cleanup", "dataBoundary",
  ];
}

const C3R_T_NATIVE_ASSERTION_IDS = Object.freeze([
  "validated_c3r_p_inventory_inherited",
  "exact_synthetic_prerequisite_closure",
  "exact_two_theory_migrations_bound",
  "exact_three_repository_files_applied_per_cycle",
  "postgresql_15_8",
  "two_isolated_cycles",
  "exact_forced_rls_table_set",
  "practice_and_theory_enum_labels",
  "theory_start_idempotency",
  "practice_start_idempotency_preserved",
  "practice_wrapper_argument_names_preserved",
  "theory_postgrest_argument_names_bound",
  "cross_target_validator_unsupported",
  "cross_subject_insert_denied",
  "authenticated_table_insert_denied",
  "authenticated_validator_execute_denied",
  "cleanup_complete",
]);
const C3R_T_FORCED_RLS_TABLES = Object.freeze([
  "c3r_p_assistance_events",
  "c3r_p_attempts",
  "c3r_p_command_receipts",
  "c3r_p_failure_notes",
  "c3r_p_learning_gaps",
  "c3r_p_learning_records",
  "c3r_p_ledger_entries",
  "c3r_p_plan_blocks",
  "c3r_p_plans",
  "c3r_p_transfer_tasks",
]);
const C3R_P_PRACTICE_WRAPPER_ARGUMENTS = Object.freeze([
  Object.freeze({
    signature: "public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)",
    names: "p_user_id,p_command_id,p_expected_version,p_action,p_payload",
  }),
  Object.freeze({
    signature:
      "public.c3r_p_create_plan_v1(uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)",
    names:
      "p_user_id,p_command_id,p_plan_id,p_plan_kind,p_available_minutes,p_as_of,p_blocks",
  }),
  Object.freeze({
    signature:
      "public.c3r_p_decide_plan_v1(uuid,uuid,uuid,bigint,text,timestamptz,jsonb)",
    names:
      "p_user_id,p_command_id,p_plan_id,p_expected_version,p_decision,p_as_of,p_blocks",
  }),
  Object.freeze({
    signature: "public.c3r_p_delete_learner_data_v1(uuid)",
    names: "p_user_id",
  }),
  Object.freeze({
    signature: "public.c3r_p_eligibility_digest_v1(uuid,timestamptz)",
    names: "p_user_id,p_as_of",
  }),
  Object.freeze({
    signature: "public.c3r_p_export_learner_data_v1(uuid)",
    names: "p_user_id",
  }),
  Object.freeze({
    signature: "public.c3r_p_find_record_v1(uuid,text,text,text,text,text)",
    names: "p_user_id,p_source_id,p_problem_id,p_revision_id,p_item_id,p_artifact_id",
  }),
  Object.freeze({
    signature: "public.c3r_p_load_dashboard_v1(uuid,timestamptz)",
    names: "p_user_id,p_as_of",
  }),
  Object.freeze({
    signature: "public.c3r_p_restore_record_v1(uuid,uuid)",
    names: "p_user_id,p_record_id",
  }),
  Object.freeze({
    signature: "public.c3r_p_review_state_digest_v1(uuid)",
    names: "p_user_id",
  }),
]);
const C3R_P_PRACTICE_WRAPPER_ARGUMENT_CATALOG =
  `${C3R_P_PRACTICE_WRAPPER_ARGUMENTS.length}#${C3R_P_PRACTICE_WRAPPER_ARGUMENTS
    .map(({ signature, names }) => `${signature.slice("public.".length).split("(")[0]}:${names}`)
    .join("|")}`;
const C3R_T_POSTGREST_WRAPPER_ARGUMENTS = Object.freeze([
  Object.freeze({
    signature: "public.c3r_t_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)",
    names: "p_user_id,p_command_id,p_expected_version,p_action,p_payload",
  }),
  Object.freeze({
    signature:
      "public.c3r_t_create_plan_v1(uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)",
    names:
      "p_user_id,p_command_id,p_plan_id,p_plan_kind,p_available_minutes,p_as_of,p_blocks",
  }),
  Object.freeze({
    signature:
      "public.c3r_t_decide_plan_v1(uuid,uuid,uuid,bigint,text,timestamptz,jsonb)",
    names:
      "p_user_id,p_command_id,p_plan_id,p_expected_version,p_decision,p_as_of,p_blocks",
  }),
  Object.freeze({
    signature: "public.c3r_t_delete_learner_data_v1(uuid)",
    names: "p_user_id",
  }),
  Object.freeze({
    signature: "public.c3r_t_export_learner_data_v1(uuid)",
    names: "p_user_id",
  }),
  Object.freeze({
    signature: "public.c3r_t_find_record_v1(uuid,text,text,text,text,text)",
    names: "p_user_id,p_source_id,p_problem_id,p_revision_id,p_item_id,p_artifact_id",
  }),
  Object.freeze({
    signature: "public.c3r_t_load_dashboard_v1(uuid,timestamptz)",
    names: "p_user_id,p_as_of",
  }),
  Object.freeze({
    signature: "public.c3r_t_restore_record_v1(uuid,uuid)",
    names: "p_user_id,p_record_id",
  }),
]);
const C3R_T_POSTGREST_WRAPPER_ARGUMENT_CATALOG =
  `${C3R_T_POSTGREST_WRAPPER_ARGUMENTS.length}#${C3R_T_POSTGREST_WRAPPER_ARGUMENTS
    .map(({ signature, names }) => `${signature.slice("public.".length).split("(")[0]}:${names}`)
    .join("|")}`;

function practiceWrapperArgumentCatalogSql() {
  const signatures = C3R_P_PRACTICE_WRAPPER_ARGUMENTS
    .map(({ signature }) => `to_regprocedure('${signature}')`).join(",");
  return `select concat_ws('#', count(*)::text, coalesce(string_agg(
    concat(p.proname, ':', array_to_string(p.proargnames, ',')),
    '|' order by p.proname), ''))
  from pg_proc p where p.oid = any(array[${signatures}]);`;
}

function assertPracticeWrapperArgumentCatalog(value, stage) {
  if (value !== C3R_P_PRACTICE_WRAPPER_ARGUMENT_CATALOG) {
    throw new Error(`C3R-T Practice wrapper argument catalog changed during ${stage}.`);
  }
  return true;
}

function theoryPostgrestArgumentCatalogSql() {
  const signatures = C3R_T_POSTGREST_WRAPPER_ARGUMENTS
    .map(({ signature }) => `to_regprocedure('${signature}')`).join(",");
  return `select concat_ws('#', count(*)::text, coalesce(string_agg(
    concat(p.proname, ':', array_to_string(p.proargnames, ',')),
    '|' order by p.proname), ''))
  from pg_proc p where p.oid = any(array[${signatures}]);`;
}

function assertTheoryPostgrestArgumentCatalog(value, stage) {
  if (value !== C3R_T_POSTGREST_WRAPPER_ARGUMENT_CATALOG) {
    throw new Error(`C3R-T PostgREST wrapper argument catalog is invalid during ${stage}.`);
  }
  return true;
}

function theoryNativeEvidenceKeys() {
  return [
    "schemaVersion", "producerVersion", "status", "sourceLevelOnly", "verifiedAt",
    "pullRequestHeadSha", "pullRequestHeadTree", "githubRunId", "githubRunAttempt",
    "riskFileSha256", "practiceBase", "prerequisiteClosure", "theoryDelta", "cycles",
    "assertions", "cleanup", "dataBoundary",
  ];
}

export function createC3RTNativeEvidence(input) {
  return {
    schemaVersion: C3R_T_NATIVE_SCHEMA_VERSION,
    producerVersion: C3R_T_RUNTIME_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
    pullRequestHeadSha: input.headSha,
    pullRequestHeadTree: input.headTree,
    githubRunId: input.runId,
    githubRunAttempt: input.runAttempt,
    riskFileSha256: sha256(input.riskBytes),
    practiceBase: input.practiceBase,
    prerequisiteClosure: input.prerequisiteClosure,
    theoryDelta: input.theoryDelta,
    cycles: input.cycles,
    assertions: C3R_T_NATIVE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
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
}

export function validateC3RTNativeEvidence(evidence, { riskResult, riskBytes },
  repositoryRoot = process.cwd()) {
  if (!isC3RTRiskCandidate(riskResult)) throw new Error("not a C3R-T runtime risk candidate.");
  exactKeys(evidence, theoryNativeEvidenceKeys(), "C3R-T native runtime evidence");
  if (evidence.schemaVersion !== C3R_T_NATIVE_SCHEMA_VERSION ||
    evidence.producerVersion !== C3R_T_RUNTIME_PRODUCER_VERSION ||
    evidence.status !== "verified" || evidence.sourceLevelOnly !== false ||
    evidence.riskFileSha256 !== sha256(riskBytes)) {
    throw new Error("C3R-T native runtime evidence identity is invalid.");
  }
  const verifiedMs = typeof evidence.verifiedAt === "string"
    ? Date.parse(evidence.verifiedAt)
    : Number.NaN;
  const ageMs = Date.now() - verifiedMs;
  if (!Number.isFinite(verifiedMs) || new Date(verifiedMs).toISOString() !== evidence.verifiedAt ||
    ageMs < -5 * 60_000 || ageMs > 30 * 60_000) {
    throw new Error("C3R-T native runtime evidence is stale or in the future.");
  }
  const expectedHead = process.env.PR_HEAD_SHA?.toLowerCase();
  const expectedRunId = process.env.GITHUB_RUN_ID;
  const expectedRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
  const expectedHeadTree = expectedHead && SHA40.test(expectedHead)
    ? git(repositoryRoot, [
      "--no-replace-objects", "rev-parse", "--verify", `${expectedHead}^{tree}`,
    ])
    : undefined;
  const checkoutTree = expectedHeadTree
    ? git(repositoryRoot, [
      "--no-replace-objects", "rev-parse", "--verify", "HEAD^{tree}",
    ])
    : undefined;
  if (!expectedHead || !SHA40.test(expectedHead) || evidence.pullRequestHeadSha !== expectedHead ||
    evidence.pullRequestHeadTree !== expectedHeadTree || checkoutTree !== expectedHeadTree ||
    !/^\d+$/.test(expectedRunId ?? "") ||
    !Number.isSafeInteger(expectedRunAttempt) || expectedRunAttempt < 1 ||
    evidence.githubRunId !== expectedRunId || evidence.githubRunAttempt !== expectedRunAttempt) {
    throw new Error("C3R-T native evidence does not bind the exact execution head/tree/run.");
  }
  const expectedPracticeInventory = validateC3RPMigrationAuthorityBinding(
    repositoryRoot,
    expectedHead,
  );
  const expectedAppend = expectedPracticeInventory.find(
    (identity) => identity.path === C3R_P_APPEND_PATH,
  );
  exactKeys(evidence.practiceBase, [
    "validatedInventoryCount", "inventorySha256", "appendPath", "appendSha256",
  ], "C3R-T native Practice base");
  const expectedPracticeBase = {
    validatedInventoryCount: 26,
    inventorySha256: sha256(Buffer.from(canonicalJson(expectedPracticeInventory), "utf8")),
    appendPath: C3R_P_APPEND_PATH,
    appendSha256: expectedAppend?.sha256,
  };
  const expectedTheoryDelta = theoryHeadMigrationIdentities(repositoryRoot, expectedHead);
  if (expectedPracticeInventory.length !== 26 || !expectedAppend ||
    canonicalJson(evidence.practiceBase) !== canonicalJson(expectedPracticeBase) ||
    canonicalJson(evidence.theoryDelta) !== canonicalJson(expectedTheoryDelta)) {
    throw new Error("C3R-T native evidence Practice base or Theory delta identity is invalid.");
  }
  exactKeys(evidence.prerequisiteClosure, [
    "schemaVersion", "bootstrapSha256", "inheritedInventoryExecuted",
  ], "C3R-T native prerequisite closure");
  if (canonicalJson(evidence.prerequisiteClosure) !==
    canonicalJson(c3rTNativePrerequisiteClosure())) {
    throw new Error("C3R-T native prerequisite closure is invalid.");
  }
  if (!Array.isArray(evidence.cycles) || evidence.cycles.length !== 2) {
    throw new Error("C3R-T native evidence requires exactly two cycles.");
  }
  for (const [index, cycle] of evidence.cycles.entries()) {
    exactKeys(cycle, [
      "cycle", "databaseIdentity", "containerIdentity", "serverVersionNum",
      "appliedRepositoryFilesExactly", "forcedRlsTables", "subjectLabels",
      "theoryStartIdempotent", "practiceStartIdempotentPreserved",
      "practiceWrapperArgumentNamesPreserved", "theoryPostgrestArgumentNamesBound",
      "crossTargetValidatorUnsupported", "crossSubjectInsertDenied",
      "authenticatedTableInsertDenied", "authenticatedValidatorExecuteDenied", "cleanup",
    ], `C3R-T native cycle ${index + 1}`);
    const number = index + 1;
    if (cycle.cycle !== number ||
      cycle.databaseIdentity !== `c3r-t-native-${expectedRunId}-${expectedRunAttempt}-${number}` ||
      cycle.containerIdentity !==
        `inverge-runtime-${expectedRunId}-${expectedRunAttempt}-c3r-t-${number}` ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
      canonicalJson(cycle.appliedRepositoryFilesExactly) !== canonicalJson([
        C3R_P_APPEND_PATH, C3R_T_ENUM_MIGRATION_PATH, C3R_T_INTEGRATION_MIGRATION_PATH,
      ]) ||
      canonicalJson(cycle.forcedRlsTables) !== canonicalJson(C3R_T_FORCED_RLS_TABLES) ||
      canonicalJson(cycle.subjectLabels) !== canonicalJson(["PRACTICE", "THEORY"]) ||
      cycle.theoryStartIdempotent !== true || cycle.practiceStartIdempotentPreserved !== true ||
      cycle.practiceWrapperArgumentNamesPreserved !== true ||
      cycle.theoryPostgrestArgumentNamesBound !== true ||
      cycle.crossTargetValidatorUnsupported !== true || cycle.crossSubjectInsertDenied !== true ||
      cycle.authenticatedTableInsertDenied !== true ||
      cycle.authenticatedValidatorExecuteDenied !== true || cycle.cleanup !== "complete") {
      throw new Error(`C3R-T native cycle ${number} is invalid.`);
    }
  }
  if (evidence.cycles[0].databaseIdentity === evidence.cycles[1].databaseIdentity ||
    evidence.cycles[0].containerIdentity === evidence.cycles[1].containerIdentity) {
    throw new Error("C3R-T native cycles reused an isolation identity.");
  }
  for (const [index, assertion] of evidence.assertions?.entries?.() ?? []) {
    exactKeys(assertion, ["id", "passed"], `C3R-T native assertion ${index + 1}`);
  }
  if (!Array.isArray(evidence.assertions) ||
    canonicalJson(evidence.assertions) !== canonicalJson(
      C3R_T_NATIVE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
    )) {
    throw new Error("C3R-T native assertion set is incomplete, duplicated, or reordered.");
  }
  exactKeys(evidence.cleanup, ["status"], "C3R-T native cleanup");
  exactKeys(evidence.dataBoundary, [
    "metadataOnly", "rawLearnerContentPersisted", "sourceTextPersisted",
    "credentialMaterialPersisted", "learnerIdentifiersPersisted", "rowBodiesPersisted",
    "providerBodiesPersisted",
  ], "C3R-T native data boundary");
  if (evidence.cleanup.status !== "complete" || evidence.dataBoundary.metadataOnly !== true ||
    Object.entries(evidence.dataBoundary).some(
      ([key, value]) => key !== "metadataOnly" && value !== false,
    )) {
    throw new Error("C3R-T native cleanup or metadata-only boundary is invalid.");
  }
}

export function createC3RPNativeEvidence(input) {
  return {
    schemaVersion: C3R_P_NATIVE_SCHEMA_VERSION,
    producerVersion: C3R_P_RUNTIME_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: new Date().toISOString(),
    pullRequestHeadSha: input.headSha,
    pullRequestHeadTree: input.headTree,
    githubRunId: input.runId,
    githubRunAttempt: input.runAttempt,
    riskFileSha256: sha256(input.riskBytes),
    migrations: input.migrations,
    cycles: input.cycles,
    assertions: [
      "exact_26_file_inventory", "postgresql_15_8", "two_isolated_cycles",
      "practice_only_subject", "forced_rls", "service_only_mutation",
      "idempotency_and_cas", "metadata_only", "cleanup_complete",
    ].map((id) => ({ id, passed: true })),
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
}

export function validateC3RPNativeEvidence(evidence, { riskResult, riskBytes }, repositoryRoot = process.cwd()) {
  if (!isC3RPRiskCandidate(riskResult)) throw new Error("not a C3R-P runtime risk candidate.");
  exactKeys(evidence, nativeEvidenceKeys(), "C3R-P native runtime evidence");
  if (evidence.schemaVersion !== C3R_P_NATIVE_SCHEMA_VERSION ||
    evidence.producerVersion !== C3R_P_RUNTIME_PRODUCER_VERSION ||
    evidence.status !== "verified" || evidence.sourceLevelOnly !== false ||
    evidence.riskFileSha256 !== sha256(riskBytes)) {
    throw new Error("C3R-P native runtime evidence identity is invalid.");
  }
  const expectedHead = process.env.PR_HEAD_SHA?.toLowerCase();
  if (!expectedHead || evidence.pullRequestHeadSha !== expectedHead ||
    evidence.pullRequestHeadTree !== git(repositoryRoot, ["show", "-s", "--format=%T", expectedHead])) {
    throw new Error("C3R-P native evidence does not bind the exact PR head/tree.");
  }
  const expectedInventory = exactMigrationInventory(repositoryRoot, expectedHead);
  if (canonicalJson(evidence.migrations) !== canonicalJson(expectedInventory)) {
    throw new Error("C3R-P native evidence migration inventory is invalid.");
  }
  if (!Array.isArray(evidence.cycles) || evidence.cycles.length !== 2 ||
    evidence.cycles.some((cycle, index) => cycle.cycle !== index + 1 ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM || cycle.cleanup !== "complete") ||
    evidence.cycles[0].containerIdentity === evidence.cycles[1].containerIdentity) {
    throw new Error("C3R-P native evidence does not contain two isolated PostgreSQL 15.8 cycles.");
  }
  if (!Array.isArray(evidence.assertions) || evidence.assertions.length !== 9 ||
    evidence.assertions.some((item) => item.passed !== true) ||
    evidence.cleanup?.status !== "complete" || evidence.dataBoundary?.metadataOnly !== true ||
    Object.entries(evidence.dataBoundary).some(([key, value]) => key !== "metadataOnly" && value !== false)) {
    throw new Error("C3R-P native runtime assertions or data boundary are invalid.");
  }
}

const NATIVE_BOOTSTRAP_SQL = `
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
do $$ begin create role anon noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role service_role noinherit bypassrls; exception when duplicate_object then null; end $$;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable set search_path=''
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant usage on schema extensions to service_role;
create table if not exists public.personal_concept_nodes (id uuid primary key default gen_random_uuid());
create or replace function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) returns jsonb language sql as $$ select '{}'::jsonb $$;
`;

export function c3rTNativePrerequisiteClosure() {
  return {
    schemaVersion: "c3r-t-native-prerequisite.v1",
    bootstrapSha256: sha256(Buffer.from(NATIVE_BOOTSTRAP_SQL, "utf8")),
    inheritedInventoryExecuted: false,
  };
}

export function c3rLNativePrerequisiteClosure() {
  return {
    schemaVersion: "c3r-l-native-prerequisite.v1",
    bootstrapSha256: sha256(Buffer.from(NATIVE_BOOTSTRAP_SQL, "utf8")),
    inheritedInventoryExecuted: false,
    inheritedTheoryMigrationsExecuted: true,
  };
}

function nativeDocker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    input: options.input,
    stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });
}

export function isNativeContainerVerifiedAbsent(inspected) {
  return inspected?.status !== 0 && /no such (?:object|container)/i.test(
    `${inspected.stderr ?? ""}\n${inspected.stdout ?? ""}`,
  );
}

function removeNativeContainer(name) {
  nativeDocker(["rm", "--force", name]);
  return isNativeContainerVerifiedAbsent(nativeDocker(["inspect", name]));
}

export function boundedNativePostgresDiagnostic(result) {
  const source = result?.stderr || result?.stdout || "";
  const sourceWithoutBearerCredentials = String(source).replace(
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/giu,
    "Bearer [REDACTED]",
  );
  const diagnostic = redactC3RPEntryDiagnosticText(sourceWithoutBearerCredentials)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/\x1b\[[0-9;]*m/gu, "").trim())
    .filter((line) => /^(?:ERROR|HINT):/iu.test(line))
    .slice(0, 8)
    .map((line) => line.slice(0, 256))
    .join(" | ")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu,
      "[uuid]")
    .replace(/https?:\/\/[^\s|]+/giu, "[url]")
    .replace(/synthetic-private-[a-z0-9_-]+/giu, "[private]");
  const bytes = Buffer.from(diagnostic, "utf8");
  const bounded = bytes.length <= 2_048
    ? diagnostic
    : bytes.subarray(0, 2_048).toString("utf8").replace(/\uFFFD+$/u, "");
  return bounded || "no bounded PostgreSQL ERROR/HINT diagnostic";
}

const C3R_T_NATIVE_SERVICE_EXPECTATIONS = Object.freeze([
  Object.freeze({ code: "theory_start_initial_status", value: "applied" }),
  Object.freeze({ code: "theory_start_replay_status", value: "applied" }),
  Object.freeze({ code: "practice_start_initial_status", value: "applied" }),
  Object.freeze({ code: "practice_start_replay_status", value: "applied" }),
  Object.freeze({ code: "theory_record_count", value: "1" }),
  Object.freeze({ code: "practice_record_count", value: "1" }),
  Object.freeze({ code: "cross_target_validator_state", value: "UNSUPPORTED" }),
]);

export function classifyC3RTNativeServiceAssertions(stdout) {
  if (typeof stdout !== "string") return ["output_shape"];
  const lines = stdout.replace(/\r\n/gu, "\n").replace(/\n$/u, "").split("\n");
  if (lines.length !== 2) {
    return ["output_shape"];
  }
  const statusFields = lines[0].split("|");
  const postMutationFields = lines[1].split("|");
  if (statusFields.length !== 4 || postMutationFields.length !== 3 ||
    [...statusFields, ...postMutationFields].some((field) => field.length === 0)) {
    return ["output_shape"];
  }
  const fields = [...statusFields, ...postMutationFields];
  return C3R_T_NATIVE_SERVICE_EXPECTATIONS
    .filter((expectation, index) => fields[index] !== expectation.value)
    .map((expectation) => expectation.code);
}

function nativePsql(name, sql, allowFailure = false, stage = "assertion") {
  const result = nativeDocker(["exec", "--interactive", name, "psql", "--no-psqlrc", "--quiet",
    "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--username", "postgres",
    "--dbname", "postgres"], { input: sql });
  if (!allowFailure && result.status !== 0) {
    const status = Number.isInteger(result.status) ? result.status : "spawn_error";
    throw new Error(`C3R-P native PostgreSQL ${stage} failed (${status}): ${
      boundedNativePostgresDiagnostic(result)}`);
  }
  return result;
}

function startNativeContainer(name) {
  if (!removeNativeContainer(name)) throw new Error("C3R-P native pre-cleanup failed.");
  const started = nativeDocker(["run", "--detach", "--rm", "--name", name, "--network", "none",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912",
    "--env", "POSTGRES_HOST_AUTH_METHOD=trust", ORACLE_IMAGE]);
  if (started.status !== 0) throw new Error("C3R-P native PostgreSQL container failed to start.");
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = nativeDocker(["exec", name, "pg_isready", "--host", "127.0.0.1",
      "--username", "postgres", "--dbname", "postgres"]);
    if (ready.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error("C3R-P native PostgreSQL readiness timed out.");
}

function nativeCycle(name, appendSql, cycle) {
  let cleanup = false;
  try {
    startNativeContainer(name);
    nativePsql(name, "show server_version_num;\n", false, "server-version assertion");
    nativePsql(name, NATIVE_BOOTSTRAP_SQL, false, "bootstrap");
    nativePsql(name, appendSql, false, "append application");
    nativePsql(name, appendSql, false, "append recovery reapplication");
    const catalog = nativePsql(name, `select concat_ws('|', current_setting('server_version_num'),
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname like 'c3r_p_%' and c.relkind='r'
         and c.relrowsecurity and c.relforcerowsecurity),
      (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum e
       join pg_type t on t.oid=e.enumtypid where t.typname='c3r_p_subject'),
      has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
      has_function_privilege('authenticated','public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
      has_function_privilege('service_role','public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'));
    `, false, "catalog assertion").stdout.trim();
    if (catalog !== "150008|10|PRACTICE|f|f|t") {
      throw new Error("C3R-P native catalog contract failed.");
    }
    const userId = `11111111-1111-4111-8111-11111111111${cycle}`;
    const recordId = `22222222-2222-4222-8222-22222222222${cycle}`;
    const commandId = `33333333-3333-4333-8333-33333333333${cycle}`;
    const attemptId = `44444444-4444-4444-8444-44444444444${cycle}`;
    const payload = JSON.stringify({
      artifactId: "artifact:practice:synthetic-v1", attemptBody: "synthetic-private-body",
      configurationSnapshot: { policy: "synthetic-frozen-v1" },
      configurationDigest: "d".repeat(64),
      attemptId, confidence: "medium", itemId: "practice-item-1",
      occurredAt: "2026-08-23T00:00:00.000Z", prediction: "likely_partial",
      problemId: "practice-problem-1", recordId,
      revisionId: "practice-revision-1", sourceId: "practice-source-1", surfaceId: "native-runtime",
    }).replaceAll("'", "''");
    const command = `insert into auth.users(id) values ('${userId}'); set role service_role;
      select public.c3r_p_apply_learning_command_v1('${userId}','${commandId}',0,'start','${payload}'::jsonb)->>'status';
      select public.c3r_p_apply_learning_command_v1('${userId}','${commandId}',0,'start','${payload}'::jsonb)->>'status';
      reset role;`;
    const commandLines = nativePsql(name, command, false, "service command").stdout
      .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (commandLines.join("|") !== "applied|applied") {
      throw new Error("C3R-P native service command idempotency failed.");
    }
    const direct = nativePsql(name, `set role authenticated;
      set local request.jwt.claim.sub='${userId}';
      insert into public.c3r_p_learning_records(id,user_id,source_id,problem_id,revision_id,item_id,
        artifact_id,initial_surface_id,prediction,confidence,d0_basis)
      values (gen_random_uuid(),'${userId}','x','x','x','x','x','x','likely_partial','medium','{}');`,
    true, "authenticated direct mutation");
    if (direct.status === 0 || !/permission denied/i.test(`${direct.stderr}\n${direct.stdout}`)) {
      throw new Error("C3R-P native authenticated direct mutation did not fail closed.");
    }
    return { cycle, serverVersionNum: ORACLE_SERVER_VERSION_NUM, containerIdentity: name, cleanup: "complete" };
  } finally {
    cleanup = removeNativeContainer(name);
    if (!cleanup) throw new Error("C3R-P native container cleanup failed.");
  }
}

function nativeTheoryCycle(name, databaseIdentity, sql, cycle) {
  try {
    startNativeContainer(name);
    nativePsql(name, "show server_version_num;\n", false, "Theory server-version assertion");
    nativePsql(name, NATIVE_BOOTSTRAP_SQL, false, "Theory bootstrap");
    nativePsql(name, sql.append, false, "Practice substrate application");
    const practiceWrapperArgumentsBefore = nativePsql(
      name,
      practiceWrapperArgumentCatalogSql(),
      false,
      "pre-Theory Practice wrapper argument catalog",
    ).stdout.trim();
    assertPracticeWrapperArgumentCatalog(practiceWrapperArgumentsBefore, "native pre-migration");
    nativePsql(name, sql.enum, false, "Theory enum migration application");
    nativePsql(name, sql.integration, false, "Theory integration migration application");
    const practiceWrapperArgumentsAfter = nativePsql(
      name,
      practiceWrapperArgumentCatalogSql(),
      false,
      "post-Theory Practice wrapper argument catalog",
    ).stdout.trim();
    assertPracticeWrapperArgumentCatalog(practiceWrapperArgumentsAfter, "native post-migration");
    if (practiceWrapperArgumentsAfter !== practiceWrapperArgumentsBefore) {
      throw new Error("C3R-T native Practice wrapper argument names changed across migration.");
    }
    const catalog = nativePsql(name, `select concat_ws('|',
      current_setting('server_version_num'),
      (select string_agg(concat(c.relname, ':', c.relrowsecurity::text, ':',
        c.relforcerowsecurity::text), ',' order by c.relname)
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname like 'c3r_p_%' and c.relkind='r'),
      (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum e
       join pg_type t on t.oid=e.enumtypid where t.typname='c3r_p_subject'),
      has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
      has_function_privilege('authenticated',
        'public.c3r_t_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
      has_function_privilege('service_role',
        'public.c3r_t_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
      has_function_privilege('service_role',
        'public.c3r_t_validate_theory_claim_v1(jsonb,text,timestamptz)','EXECUTE'),
      (to_regprocedure(
        'public.c3r_p_apply_learning_command_practice_legacy_v1(uuid,uuid,bigint,text,jsonb)')
        is not null)::text);
    `, false, "Theory catalog assertion").stdout.trim();
    const exactRlsCatalog = C3R_T_FORCED_RLS_TABLES
      .map((table) => `${table}:true:true`).join(",");
    if (catalog !== `150008|${exactRlsCatalog}|` +
      "PRACTICE,THEORY|f|f|t|t|true") {
      throw new Error("C3R-T native catalog, RLS, grants, subject, or Practice binding failed.");
    }
    assertTheoryPostgrestArgumentCatalog(
      nativePsql(
        name,
        theoryPostgrestArgumentCatalogSql(),
        false,
        "Theory PostgREST wrapper argument catalog",
      ).stdout.trim(),
      "native cycle",
    );
    const theoryUserId = crypto.randomUUID();
    const practiceUserId = crypto.randomUUID();
    const theoryRecordId = crypto.randomUUID();
    const theoryCommandId = crypto.randomUUID();
    const theoryAttemptId = crypto.randomUUID();
    const practiceRecordId = crypto.randomUUID();
    const practiceCommandId = crypto.randomUUID();
    const practiceAttemptId = crypto.randomUUID();
    const configurationDigest = "d".repeat(64);
    const theoryPayload = JSON.stringify({
      artifactId: "artifact:theory:synthetic-v1",
      attemptBody: "synthetic-private-theory-body",
      attemptId: theoryAttemptId,
      confidence: "medium",
      itemId: "theory-item-1",
      configurationDigest,
      configurationSnapshot: { policy: "synthetic-frozen-v1" },
      occurredAt: "2026-08-25T00:00:00.000Z",
      prediction: "likely_partial",
      problemId: "theory-problem-1",
      recordId: theoryRecordId,
      revisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
      sourceId: "theory-source-1",
      surfaceId: "native-runtime",
    }).replaceAll("'", "''");
    const practicePayload = JSON.stringify({
      artifactId: "artifact:practice:synthetic-v1",
      attemptBody: "synthetic-private-practice-body",
      attemptId: practiceAttemptId,
      confidence: "medium",
      itemId: "practice-item-1",
      configurationDigest,
      configurationSnapshot: { policy: "synthetic-frozen-v1" },
      occurredAt: "2026-08-25T00:00:00.000Z",
      prediction: "likely_partial",
      problemId: "practice-problem-1",
      recordId: practiceRecordId,
      revisionId: "practice-revision-1",
      sourceId: "practice-source-1",
      surfaceId: "native-runtime",
    }).replaceAll("'", "''");
    const crossTargetClaim = JSON.stringify({
      sourceRevisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
      anchorId: "repair-anchor:theory:synthetic-income-approach",
      anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1",
      targetScopeId: "theory-target:synthetic-income-approach",
      clauses: [{
        clauseIndex: 1,
        scopeResolution: "EXACT",
        scopeId: "theory-target:synthetic-cost-approach",
        predicates: [{
          predicateId: "converts_expected_income_to_value",
          polarity: "ASSERTED",
        }],
      }],
      confirmationMode: "MANUAL_STRUCTURED",
    }).replaceAll("'", "''");
    const service = nativePsql(name, `begin;
      insert into auth.users(id) values ('${theoryUserId}'), ('${practiceUserId}');
      set local role service_role;
      select concat_ws('|',
        (public.c3r_t_apply_learning_command_v1(
          '${theoryUserId}','${theoryCommandId}',0,'start','${theoryPayload}'::jsonb)->>'status'),
        (public.c3r_t_apply_learning_command_v1(
          '${theoryUserId}','${theoryCommandId}',0,'start','${theoryPayload}'::jsonb)->>'status'),
        (public.c3r_p_apply_learning_command_v1(
          '${practiceUserId}','${practiceCommandId}',0,'start','${practicePayload}'::jsonb)->>'status'),
        (public.c3r_p_apply_learning_command_v1(
          '${practiceUserId}','${practiceCommandId}',0,'start','${practicePayload}'::jsonb)->>'status'));
      select concat_ws('|',
        (select count(*) from public.c3r_p_learning_records
          where user_id='${theoryUserId}' and subject='THEORY'),
        (select count(*) from public.c3r_p_learning_records
          where user_id='${practiceUserId}' and subject='PRACTICE'),
        (public.c3r_t_validate_theory_claim_v1('${crossTargetClaim}'::jsonb,
          'b8e6d6e9-8c0c-4b54-9c1e-608d33245001',
          '2026-08-25T00:01:00.000Z'::timestamptz)->>'state'));
      commit;`, false, "Theory and Practice service command assertions").stdout.trim();
    const serviceMismatchCodes = classifyC3RTNativeServiceAssertions(service);
    if (serviceMismatchCodes.length > 0) {
      throw new Error(`C3R-T native service assertion mismatch: ${
        serviceMismatchCodes.join(",")}.`);
    }
    const crossSubject = nativePsql(name, `begin;
      set local role service_role;
      insert into public.c3r_p_attempts (
        id, record_id, user_id, subject, source_id, problem_id, revision_id, item_id,
        artifact_id, surface_id, phase, outcome, body, occurred_at
      ) values (
        gen_random_uuid(), '${theoryRecordId}', '${theoryUserId}', 'PRACTICE',
        'theory-source-1', 'theory-problem-1',
        'b8e6d6e9-8c0c-4b54-9c1e-608d33245001', 'theory-item-1',
        'artifact:theory:synthetic-v1', 'native-runtime', 'D0', 'FAILURE',
        'synthetic-private-cross-subject-body', statement_timestamp()
      );
      commit;`, true, "Theory cross-subject foreign-key assertion");
    if (crossSubject.status === 0 || !/c3r_attempts_subject_record_fk/i.test(
      `${crossSubject.stderr}\n${crossSubject.stdout}`,
    )) {
      throw new Error("C3R-T native cross-subject foreign key did not fail closed.");
    }
    const directMutation = nativePsql(name, `set role authenticated;
      set local request.jwt.claim.sub='${theoryUserId}';
      insert into public.c3r_p_learning_records(id,user_id,subject,source_id,problem_id,
        revision_id,item_id,artifact_id,initial_surface_id,prediction,confidence,d0_basis)
      values (gen_random_uuid(),'${theoryUserId}','THEORY','x','x','x','x','x','x',
        'likely_partial','medium','{}');`, true, "Theory authenticated direct mutation");
    if (directMutation.status === 0 ||
      !/(permission denied|row-level security)/i.test(
        `${directMutation.stderr}\n${directMutation.stdout}`,
      )) {
      throw new Error("C3R-T native authenticated direct mutation did not fail closed.");
    }
    const directProof = nativePsql(name, `set role authenticated;
      select public.c3r_t_validate_theory_claim_v1('${crossTargetClaim}'::jsonb,
        'b8e6d6e9-8c0c-4b54-9c1e-608d33245001', statement_timestamp());`,
    true, "Theory authenticated proof validation");
    if (directProof.status === 0 ||
      !/(permission denied|service_role_required)/i.test(
        `${directProof.stderr}\n${directProof.stdout}`,
      )) {
      throw new Error("C3R-T native authenticated proof validation did not fail closed.");
    }
    return {
      cycle,
      databaseIdentity,
      containerIdentity: name,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      appliedRepositoryFilesExactly: [
        C3R_P_APPEND_PATH,
        C3R_T_ENUM_MIGRATION_PATH,
        C3R_T_INTEGRATION_MIGRATION_PATH,
      ],
      forcedRlsTables: [...C3R_T_FORCED_RLS_TABLES],
      subjectLabels: ["PRACTICE", "THEORY"],
      theoryStartIdempotent: true,
      practiceStartIdempotentPreserved: true,
      practiceWrapperArgumentNamesPreserved: true,
      theoryPostgrestArgumentNamesBound: true,
      crossTargetValidatorUnsupported: true,
      crossSubjectInsertDenied: true,
      authenticatedTableInsertDenied: true,
      authenticatedValidatorExecuteDenied: true,
      cleanup: "complete",
    };
  } finally {
    if (!removeNativeContainer(name)) {
      throw new Error("C3R-T native container cleanup failed.");
    }
  }
}

export function cleanupC3RTNativeEvidence(context) {
  let complete = true;
  for (const cycle of [1, 2]) {
    complete = removeNativeContainer(`${context.containerName}-c3r-t-${cycle}`) && complete;
  }
  return complete;
}

export function produceC3RTNativeEvidence({ context, evidencePath, riskBytes, riskResult,
  repositoryRoot = process.cwd() }) {
  if (!isC3RTRiskCandidate(riskResult)) throw new Error("not a C3R-T runtime risk candidate.");
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const inheritedInventory = validateC3RPMigrationAuthorityBinding(
    repositoryRoot,
    context.headSha,
  );
  if (inheritedInventory.length !== 26) {
    throw new Error("C3R-T native inherited Practice inventory is not exactly 26 migrations.");
  }
  const migrations = theoryHeadMigrationIdentities(repositoryRoot, context.headSha);
  const committedSql = (migrationPath) => execFileSync("git", [
    "--no-replace-objects", "show", `${context.headSha}:${migrationPath}`,
  ], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const sql = {
    append: committedSql(C3R_P_APPEND_PATH),
    enum: committedSql(C3R_T_ENUM_MIGRATION_PATH),
    integration: committedSql(C3R_T_INTEGRATION_MIGRATION_PATH),
  };
  const cycles = [1, 2].map((cycle) => nativeTheoryCycle(
    `${context.containerName}-c3r-t-${cycle}`,
    `c3r-t-native-${context.runId}-${context.runAttempt}-${cycle}`,
    sql,
    cycle,
  ));
  const appendIdentity = inheritedInventory.find(
    (identity) => identity.path === C3R_P_APPEND_PATH,
  );
  if (!appendIdentity) {
    throw new Error("C3R-T native inherited Practice append identity is missing.");
  }
  const evidence = createC3RTNativeEvidence({
    headSha: context.headSha,
    headTree: git(repositoryRoot, [
      "--no-replace-objects", "rev-parse", "--verify", `${context.headSha}^{tree}`,
    ]),
    runId: context.runId,
    runAttempt: context.runAttempt,
    riskBytes,
    practiceBase: {
      validatedInventoryCount: inheritedInventory.length,
      inventorySha256: sha256(Buffer.from(canonicalJson(inheritedInventory), "utf8")),
      appendPath: C3R_P_APPEND_PATH,
      appendSha256: appendIdentity.sha256,
    },
    prerequisiteClosure: c3rTNativePrerequisiteClosure(),
    theoryDelta: migrations,
    cycles,
  });
  validateC3RTNativeEvidence(evidence, { riskResult, riskBytes }, repositoryRoot);
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify({
    status: "verified", assertionsPassed: C3R_T_NATIVE_ASSERTION_IDS.length,
    cleanup: "complete",
  }));
}

const C3R_L_NATIVE_ASSERTION_IDS = Object.freeze([
  "validated_c3r_p_inventory_inherited",
  "validated_c3r_t_delta_applied",
  "exact_two_law_migrations_bound",
  "exact_five_repository_files_applied_per_cycle",
  "postgresql_15_8",
  "two_isolated_cycles",
  "exact_forced_rls_table_set",
  "practice_theory_and_law_enum_labels",
  "law_start_idempotency",
  "theory_start_idempotency_preserved",
  "practice_start_idempotency_preserved",
  "practice_and_theory_wrapper_argument_names_preserved",
  "law_postgrest_argument_names_bound",
  "law_drift_validator_unsupported",
  "cross_subject_insert_denied",
  "authenticated_table_insert_denied",
  "authenticated_validator_execute_denied",
  "cleanup_complete",
]);

const C3R_L_POSTGREST_WRAPPER_ARGUMENTS = Object.freeze([
  Object.freeze({ signature: "public.c3r_l_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)", names: "p_user_id,p_command_id,p_expected_version,p_action,p_payload" }),
  Object.freeze({ signature: "public.c3r_l_create_plan_v1(uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)", names: "p_user_id,p_command_id,p_plan_id,p_plan_kind,p_available_minutes,p_as_of,p_blocks" }),
  Object.freeze({ signature: "public.c3r_l_decide_plan_v1(uuid,uuid,uuid,bigint,text,timestamptz,jsonb)", names: "p_user_id,p_command_id,p_plan_id,p_expected_version,p_decision,p_as_of,p_blocks" }),
  Object.freeze({ signature: "public.c3r_l_delete_learner_data_v1(uuid)", names: "p_user_id" }),
  Object.freeze({ signature: "public.c3r_l_export_learner_data_v1(uuid)", names: "p_user_id" }),
  Object.freeze({ signature: "public.c3r_l_find_record_v1(uuid,text,text,text,text,text)", names: "p_user_id,p_source_id,p_problem_id,p_revision_id,p_item_id,p_artifact_id" }),
  Object.freeze({ signature: "public.c3r_l_load_dashboard_v1(uuid,timestamptz)", names: "p_user_id,p_as_of" }),
  Object.freeze({ signature: "public.c3r_l_restore_record_v1(uuid,uuid)", names: "p_user_id,p_record_id" }),
]);
const C3R_L_POSTGREST_WRAPPER_ARGUMENT_CATALOG =
  `${C3R_L_POSTGREST_WRAPPER_ARGUMENTS.length}#${C3R_L_POSTGREST_WRAPPER_ARGUMENTS
    .map(({ signature, names }) => `${signature.slice("public.".length).split("(")[0]}:${names}`)
    .join("|")}`;

function lawPostgrestArgumentCatalogSql() {
  const signatures = C3R_L_POSTGREST_WRAPPER_ARGUMENTS
    .map(({ signature }) => `to_regprocedure('${signature}')`).join(",");
  return `select concat_ws('#', count(*)::text, coalesce(string_agg(
    concat(p.proname, ':', array_to_string(p.proargnames, ',')),
    '|' order by p.proname), ''))
  from pg_proc p where p.oid = any(array[${signatures}]);`;
}

function assertLawPostgrestArgumentCatalog(value, stage) {
  if (value !== C3R_L_POSTGREST_WRAPPER_ARGUMENT_CATALOG) {
    throw new Error(`C3R-L PostgREST wrapper argument catalog is invalid during ${stage}.`);
  }
  return true;
}

function lawNativeEvidenceKeys() {
  return [
    "schemaVersion", "producerVersion", "status", "sourceLevelOnly", "verifiedAt",
    "pullRequestHeadSha", "pullRequestHeadTree", "githubRunId", "githubRunAttempt",
    "riskFileSha256", "practiceBase", "prerequisiteClosure", "theoryBase", "lawDelta",
    "cycles", "assertions", "cleanup", "dataBoundary",
  ];
}

export function createC3RLNativeEvidence(input) {
  return {
    schemaVersion: C3R_L_NATIVE_SCHEMA_VERSION,
    producerVersion: C3R_L_RUNTIME_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
    pullRequestHeadSha: input.headSha,
    pullRequestHeadTree: input.headTree,
    githubRunId: input.runId,
    githubRunAttempt: input.runAttempt,
    riskFileSha256: sha256(input.riskBytes),
    practiceBase: input.practiceBase,
    prerequisiteClosure: input.prerequisiteClosure,
    theoryBase: input.theoryBase,
    lawDelta: input.lawDelta,
    cycles: input.cycles,
    assertions: C3R_L_NATIVE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
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
}

export function validateC3RLNativeEvidence(evidence, { riskResult, riskBytes },
  repositoryRoot = process.cwd()) {
  if (!isC3RLRiskCandidate(riskResult)) throw new Error("not a C3R-L runtime risk candidate.");
  exactKeys(evidence, lawNativeEvidenceKeys(), "C3R-L native runtime evidence");
  if (evidence.schemaVersion !== C3R_L_NATIVE_SCHEMA_VERSION ||
    evidence.producerVersion !== C3R_L_RUNTIME_PRODUCER_VERSION ||
    evidence.status !== "verified" || evidence.sourceLevelOnly !== false ||
    evidence.riskFileSha256 !== sha256(riskBytes)) {
    throw new Error("C3R-L native runtime evidence identity is invalid.");
  }
  const verifiedMs = typeof evidence.verifiedAt === "string"
    ? Date.parse(evidence.verifiedAt) : Number.NaN;
  const ageMs = Date.now() - verifiedMs;
  const expectedHead = process.env.PR_HEAD_SHA?.toLowerCase();
  const expectedRunId = process.env.GITHUB_RUN_ID;
  const expectedRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
  if (!Number.isFinite(verifiedMs) || new Date(verifiedMs).toISOString() !== evidence.verifiedAt ||
    ageMs < -5 * 60_000 || ageMs > 30 * 60_000 || !expectedHead || !SHA40.test(expectedHead) ||
    !/^\d+$/.test(expectedRunId ?? "") || !Number.isSafeInteger(expectedRunAttempt) ||
    expectedRunAttempt < 1) {
    throw new Error("C3R-L native evidence execution identity is invalid.");
  }
  const expectedTree = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${expectedHead}^{tree}`,
  ]);
  if (evidence.pullRequestHeadSha !== expectedHead ||
    evidence.pullRequestHeadTree !== expectedTree ||
    git(repositoryRoot, ["--no-replace-objects", "rev-parse", "--verify", "HEAD^{tree}"]) !== expectedTree ||
    evidence.githubRunId !== expectedRunId || evidence.githubRunAttempt !== expectedRunAttempt) {
    throw new Error("C3R-L native evidence does not bind the exact head/tree/run.");
  }
  const inherited = validateC3RPMigrationAuthorityBinding(repositoryRoot, expectedHead);
  const append = inherited.find((identity) => identity.path === C3R_P_APPEND_PATH);
  const expectedPracticeBase = {
    validatedInventoryCount: 26,
    inventorySha256: sha256(Buffer.from(canonicalJson(inherited), "utf8")),
    appendPath: C3R_P_APPEND_PATH,
    appendSha256: append?.sha256,
  };
  if (inherited.length !== 26 || !append ||
    canonicalJson(evidence.practiceBase) !== canonicalJson(expectedPracticeBase) ||
    canonicalJson(evidence.prerequisiteClosure) !== canonicalJson(c3rLNativePrerequisiteClosure()) ||
    canonicalJson(evidence.theoryBase) !== canonicalJson(theoryHeadMigrationIdentities(repositoryRoot, expectedHead)) ||
    canonicalJson(evidence.lawDelta) !== canonicalJson(lawHeadMigrationIdentities(repositoryRoot, expectedHead))) {
    throw new Error("C3R-L native prerequisite or migration identity is invalid.");
  }
  if (!Array.isArray(evidence.cycles) || evidence.cycles.length !== 2) {
    throw new Error("C3R-L native evidence requires exactly two cycles.");
  }
  const appliedFiles = [C3R_P_APPEND_PATH, C3R_T_ENUM_MIGRATION_PATH,
    C3R_T_INTEGRATION_MIGRATION_PATH, C3R_L_ENUM_MIGRATION_PATH,
    C3R_L_INTEGRATION_MIGRATION_PATH];
  for (const [index, cycle] of evidence.cycles.entries()) {
    exactKeys(cycle, [
      "cycle", "databaseIdentity", "containerIdentity", "serverVersionNum",
      "appliedRepositoryFilesExactly", "forcedRlsTables", "subjectLabels",
      "lawStartIdempotent", "theoryStartIdempotentPreserved",
      "practiceStartIdempotentPreserved", "practiceWrapperArgumentNamesPreserved",
      "theoryWrapperArgumentNamesPreserved", "lawPostgrestArgumentNamesBound",
      "lawDriftValidatorUnsupported", "crossSubjectInsertDenied",
      "authenticatedTableInsertDenied", "authenticatedValidatorExecuteDenied", "cleanup",
    ], `C3R-L native cycle ${index + 1}`);
    const number = index + 1;
    const booleans = Object.entries(cycle).filter(([key]) => ![
      "cycle", "databaseIdentity", "containerIdentity", "serverVersionNum",
      "appliedRepositoryFilesExactly", "forcedRlsTables", "subjectLabels", "cleanup",
    ].includes(key));
    if (cycle.cycle !== number ||
      cycle.databaseIdentity !== `c3r-l-native-${expectedRunId}-${expectedRunAttempt}-${number}` ||
      cycle.containerIdentity !== `inverge-runtime-${expectedRunId}-${expectedRunAttempt}-c3r-l-${number}` ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
      canonicalJson(cycle.appliedRepositoryFilesExactly) !== canonicalJson(appliedFiles) ||
      canonicalJson(cycle.forcedRlsTables) !== canonicalJson(C3R_T_FORCED_RLS_TABLES) ||
      canonicalJson(cycle.subjectLabels) !== canonicalJson(["PRACTICE", "THEORY", "LAW"]) ||
      booleans.some(([, value]) => value !== true) || cycle.cleanup !== "complete") {
      throw new Error(`C3R-L native cycle ${number} is invalid.`);
    }
  }
  if (canonicalJson(evidence.assertions) !== canonicalJson(
    C3R_L_NATIVE_ASSERTION_IDS.map((id) => ({ id, passed: true }))) ||
    evidence.cleanup?.status !== "complete" || canonicalJson(evidence.dataBoundary) !== canonicalJson({
      metadataOnly: true, rawLearnerContentPersisted: false, sourceTextPersisted: false,
      credentialMaterialPersisted: false, learnerIdentifiersPersisted: false,
      rowBodiesPersisted: false, providerBodiesPersisted: false,
    })) {
    throw new Error("C3R-L native evidence boundary is invalid.");
  }
  return evidence;
}

const C3R_L_NATIVE_SERVICE_EXPECTATIONS = Object.freeze([
  { value: "applied", code: "law_start_initial_status" },
  { value: "applied", code: "law_start_replay_status" },
  { value: "applied", code: "theory_start_initial_status" },
  { value: "applied", code: "theory_start_replay_status" },
  { value: "applied", code: "practice_start_initial_status" },
  { value: "applied", code: "practice_start_replay_status" },
  { value: "1", code: "law_record_count" },
  { value: "1", code: "theory_record_count" },
  { value: "1", code: "practice_record_count" },
  { value: "UNSUPPORTED", code: "law_drift_validator_state" },
]);

export function classifyC3RLNativeServiceAssertions(stdout) {
  if (typeof stdout !== "string" || stdout !== stdout.trimEnd() || stdout.includes("\r")) {
    return ["output_shape"];
  }
  const lines = stdout.split("\n");
  if (lines.length !== 2) return ["output_shape"];
  const fields = [...lines[0].split("|"), ...lines[1].split("|")];
  if (fields.length !== C3R_L_NATIVE_SERVICE_EXPECTATIONS.length ||
    fields.some((field) => field.length === 0)) return ["output_shape"];
  return C3R_L_NATIVE_SERVICE_EXPECTATIONS
    .filter((expectation, index) => fields[index] !== expectation.value)
    .map((expectation) => expectation.code);
}

function nativeLawCycle(name, databaseIdentity, sql, cycle) {
  try {
    startNativeContainer(name);
    nativePsql(name, NATIVE_BOOTSTRAP_SQL, false, "Law bootstrap");
    nativePsql(name, sql.append, false, "Practice substrate application");
    nativePsql(name, sql.theoryEnum, false, "Theory enum application");
    nativePsql(name, sql.theoryIntegration, false, "Theory integration application");
    const practiceBefore = nativePsql(name, practiceWrapperArgumentCatalogSql(), false,
      "pre-Law Practice wrapper catalog").stdout.trim();
    const theoryBefore = nativePsql(name, theoryPostgrestArgumentCatalogSql(), false,
      "pre-Law Theory wrapper catalog").stdout.trim();
    assertPracticeWrapperArgumentCatalog(practiceBefore, "Law native pre-migration");
    assertTheoryPostgrestArgumentCatalog(theoryBefore, "Law native pre-migration");
    nativePsql(name, sql.lawEnum, false, "Law enum application");
    nativePsql(name, sql.lawIntegration, false, "Law integration application");
    assertPracticeWrapperArgumentCatalog(nativePsql(name, practiceWrapperArgumentCatalogSql(), false,
      "post-Law Practice wrapper catalog").stdout.trim(), "Law native post-migration");
    assertTheoryPostgrestArgumentCatalog(nativePsql(name, theoryPostgrestArgumentCatalogSql(), false,
      "post-Law Theory wrapper catalog").stdout.trim(), "Law native post-migration");
    assertLawPostgrestArgumentCatalog(nativePsql(name, lawPostgrestArgumentCatalogSql(), false,
      "Law PostgREST wrapper catalog").stdout.trim(), "Law native cycle");
    const catalog = nativePsql(name, `select concat_ws('|', current_setting('server_version_num'),
      (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum e
       join pg_type t on t.oid=e.enumtypid where t.typname='c3r_p_subject'),
      has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
      has_function_privilege('authenticated','public.c3r_l_validate_law_claim_v1(jsonb,text,timestamptz)','EXECUTE'),
      has_function_privilege('service_role','public.c3r_l_validate_law_claim_v1(jsonb,text,timestamptz)','EXECUTE'));
    `, false, "Law catalog assertion").stdout.trim();
    if (catalog !== "150008|PRACTICE,THEORY,LAW|f|f|t") {
      throw new Error("C3R-L native catalog or grant boundary failed.");
    }
    const lawUserId = crypto.randomUUID();
    const theoryUserId = crypto.randomUUID();
    const practiceUserId = crypto.randomUUID();
    const startPayload = (subject, revisionId) => JSON.stringify({
      artifactId: `artifact:${subject}:synthetic-v1`, attemptBody: `synthetic-private-${subject}-body`,
      attemptId: crypto.randomUUID(), confidence: "medium", itemId: `${subject}-item-1`,
      configurationDigest: "d".repeat(64), configurationSnapshot: { policy: "synthetic-frozen-v1" },
      occurredAt: "2026-08-25T00:00:00.000Z", prediction: "likely_partial",
      problemId: `${subject}-problem-1`, recordId: crypto.randomUUID(), revisionId,
      sourceId: `${subject}-source-1`, surfaceId: "native-runtime",
    });
    const lawPayload = startPayload("law", "d9f7e7fa-9d1d-4c65-8d2f-719e44356001");
    const theoryPayload = startPayload("theory", "b8e6d6e9-8c0c-4b54-9c1e-608d33245001");
    const practicePayload = startPayload("practice", "practice-revision-1");
    const commandIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const driftClaim = JSON.stringify({
      sourceRevisionId: "d9f7e7fa-9d1d-4c65-8d2f-719e44356001",
      anchorId: "repair-anchor:law:synthetic-article-10",
      anchorVersionId: "repair-anchor:law:synthetic-article-10@1",
      lawSourceBindingId: "law-binding:synthetic-official-act:article-10",
      sourceId: "law-source:synthetic-official-act",
      sourceVersionId: "law-source:synthetic-official-act@2026-01-01",
      lawAnchorId: "law-anchor:synthetic-official-act:article-10",
      lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01",
      exactLocator: "Article 11", exactVersionIdentity: "2026-01-01",
      effectiveFrom: "2026-01-01", effectiveTo: null, applicableAsOf: "2026-08-15",
      currentLawApplicability: "APPLICABLE_CURRENT",
      blockerState: { openBlockingReferenceIds: [], blockerCount: 0 },
      confirmationMode: "MANUAL_STRUCTURED",
    });
    const q = (value) => value.replaceAll("'", "''");
    const service = nativePsql(name, `begin;
      insert into auth.users(id) values ('${lawUserId}'),('${theoryUserId}'),('${practiceUserId}');
      set local role service_role;
      select concat_ws('|',
        public.c3r_l_apply_learning_command_v1('${lawUserId}','${commandIds[0]}',0,'start','${q(lawPayload)}'::jsonb)->>'status',
        public.c3r_l_apply_learning_command_v1('${lawUserId}','${commandIds[0]}',0,'start','${q(lawPayload)}'::jsonb)->>'status',
        public.c3r_t_apply_learning_command_v1('${theoryUserId}','${commandIds[1]}',0,'start','${q(theoryPayload)}'::jsonb)->>'status',
        public.c3r_t_apply_learning_command_v1('${theoryUserId}','${commandIds[1]}',0,'start','${q(theoryPayload)}'::jsonb)->>'status',
        public.c3r_p_apply_learning_command_v1('${practiceUserId}','${commandIds[2]}',0,'start','${q(practicePayload)}'::jsonb)->>'status',
        public.c3r_p_apply_learning_command_v1('${practiceUserId}','${commandIds[2]}',0,'start','${q(practicePayload)}'::jsonb)->>'status');
      select concat_ws('|',
        (select count(*) from public.c3r_p_learning_records where user_id='${lawUserId}' and subject='LAW'),
        (select count(*) from public.c3r_p_learning_records where user_id='${theoryUserId}' and subject='THEORY'),
        (select count(*) from public.c3r_p_learning_records where user_id='${practiceUserId}' and subject='PRACTICE'),
        public.c3r_l_validate_law_claim_v1('${q(driftClaim)}'::jsonb,
          'd9f7e7fa-9d1d-4c65-8d2f-719e44356001','2026-08-25T00:01:00Z')->>'state');
      commit;`, false, "Law, Theory, and Practice service assertions").stdout.trim();
    const mismatches = classifyC3RLNativeServiceAssertions(service);
    if (mismatches.length > 0) throw new Error(`C3R-L native service mismatch: ${mismatches.join(",")}.`);
    const lawRecordId = JSON.parse(lawPayload).recordId;
    const crossSubject = nativePsql(name, `begin; set local role service_role;
      insert into public.c3r_p_attempts(id,record_id,user_id,subject,source_id,problem_id,
        revision_id,item_id,artifact_id,surface_id,phase,outcome,body,occurred_at)
      values(gen_random_uuid(),'${lawRecordId}','${lawUserId}','THEORY','law-source-1',
        'law-problem-1','d9f7e7fa-9d1d-4c65-8d2f-719e44356001','law-item-1',
        'artifact:law:synthetic-v1','native-runtime','D0','FAILURE','private',statement_timestamp());
      commit;`, true, "Law cross-subject assertion");
    if (crossSubject.status === 0 || !/c3r_attempts_subject_record_fk/i.test(
      `${crossSubject.stderr}\n${crossSubject.stdout}`)) {
      throw new Error("C3R-L native cross-subject insert did not fail closed.");
    }
    const directMutation = nativePsql(name, `set role authenticated;
      insert into public.c3r_p_learning_records(id,user_id,subject,source_id,problem_id,
        revision_id,item_id,artifact_id,initial_surface_id,prediction,confidence,d0_basis)
      values(gen_random_uuid(),'${lawUserId}','LAW','x','x','x','x','x','x','likely_partial','medium','{}');`,
    true, "Law authenticated table mutation");
    if (directMutation.status === 0 || !/(permission denied|row-level security)/i.test(
      `${directMutation.stderr}\n${directMutation.stdout}`)) {
      throw new Error("C3R-L native authenticated mutation did not fail closed.");
    }
    const directProof = nativePsql(name, `set role authenticated;
      select public.c3r_l_validate_law_claim_v1('${q(driftClaim)}'::jsonb,
        'd9f7e7fa-9d1d-4c65-8d2f-719e44356001',statement_timestamp());`,
    true, "Law authenticated validator execution");
    if (directProof.status === 0 || !/(permission denied|service_role_required)/i.test(
      `${directProof.stderr}\n${directProof.stdout}`)) {
      throw new Error("C3R-L native authenticated validator execution did not fail closed.");
    }
    return {
      cycle, databaseIdentity, containerIdentity: name,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      appliedRepositoryFilesExactly: [C3R_P_APPEND_PATH, C3R_T_ENUM_MIGRATION_PATH,
        C3R_T_INTEGRATION_MIGRATION_PATH, C3R_L_ENUM_MIGRATION_PATH,
        C3R_L_INTEGRATION_MIGRATION_PATH],
      forcedRlsTables: [...C3R_T_FORCED_RLS_TABLES],
      subjectLabels: ["PRACTICE", "THEORY", "LAW"],
      lawStartIdempotent: true, theoryStartIdempotentPreserved: true,
      practiceStartIdempotentPreserved: true, practiceWrapperArgumentNamesPreserved: true,
      theoryWrapperArgumentNamesPreserved: true, lawPostgrestArgumentNamesBound: true,
      lawDriftValidatorUnsupported: true, crossSubjectInsertDenied: true,
      authenticatedTableInsertDenied: true, authenticatedValidatorExecuteDenied: true,
      cleanup: "complete",
    };
  } finally {
    if (!removeNativeContainer(name)) throw new Error("C3R-L native container cleanup failed.");
  }
}

export function cleanupC3RLNativeEvidence(context) {
  let complete = true;
  for (const cycle of [1, 2]) {
    complete = removeNativeContainer(`${context.containerName}-c3r-l-${cycle}`) && complete;
  }
  return complete;
}

export function produceC3RLNativeEvidence({ context, evidencePath, riskBytes, riskResult,
  repositoryRoot = process.cwd() }) {
  if (!isC3RLRiskCandidate(riskResult)) throw new Error("not a C3R-L runtime risk candidate.");
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const inherited = validateC3RPMigrationAuthorityBinding(repositoryRoot, context.headSha);
  if (inherited.length !== 26) throw new Error("C3R-L inherited Practice inventory is not 26.");
  const committedSql = (migrationPath) => execFileSync("git", [
    "--no-replace-objects", "show", `${context.headSha}:${migrationPath}`,
  ], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const sql = {
    append: committedSql(C3R_P_APPEND_PATH),
    theoryEnum: committedSql(C3R_T_ENUM_MIGRATION_PATH),
    theoryIntegration: committedSql(C3R_T_INTEGRATION_MIGRATION_PATH),
    lawEnum: committedSql(C3R_L_ENUM_MIGRATION_PATH),
    lawIntegration: committedSql(C3R_L_INTEGRATION_MIGRATION_PATH),
  };
  const cycles = [1, 2].map((cycle) => nativeLawCycle(
    `${context.containerName}-c3r-l-${cycle}`,
    `c3r-l-native-${context.runId}-${context.runAttempt}-${cycle}`, sql, cycle,
  ));
  const append = inherited.find((identity) => identity.path === C3R_P_APPEND_PATH);
  const evidence = createC3RLNativeEvidence({
    headSha: context.headSha,
    headTree: git(repositoryRoot, ["--no-replace-objects", "rev-parse", "--verify", `${context.headSha}^{tree}`]),
    runId: context.runId, runAttempt: context.runAttempt, riskBytes,
    practiceBase: { validatedInventoryCount: inherited.length,
      inventorySha256: sha256(Buffer.from(canonicalJson(inherited), "utf8")),
      appendPath: C3R_P_APPEND_PATH, appendSha256: append?.sha256 },
    prerequisiteClosure: c3rLNativePrerequisiteClosure(),
    theoryBase: theoryHeadMigrationIdentities(repositoryRoot, context.headSha),
    lawDelta: lawHeadMigrationIdentities(repositoryRoot, context.headSha),
    cycles,
  });
  validateC3RLNativeEvidence(evidence, { riskResult, riskBytes }, repositoryRoot);
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "verified",
    assertionsPassed: C3R_L_NATIVE_ASSERTION_IDS.length, cleanup: "complete" }));
}

export function produceC3RPNativeEvidence({ context, evidencePath, riskBytes, riskResult,
  repositoryRoot = process.cwd() }) {
  if (!isC3RPRiskCandidate(riskResult)) throw new Error("not a C3R-P runtime risk candidate.");
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const migrations = validateC3RPMigrationAuthorityBinding(repositoryRoot, context.headSha);
  const appendSql = execFileSync("git", ["show", `${context.headSha}:${C3R_P_APPEND_PATH}`], {
    cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  const cycles = [1, 2].map((cycle) => nativeCycle(`${context.containerName}-c3r-p-${cycle}`, appendSql, cycle));
  const evidence = createC3RPNativeEvidence({
    headSha: context.headSha,
    headTree: git(repositoryRoot, ["show", "-s", "--format=%T", context.headSha]),
    runId: context.runId,
    runAttempt: context.runAttempt,
    riskBytes,
    migrations,
    cycles,
  });
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "verified", assertionsPassed: 9, cleanup: "complete" }));
}

const EXCLUDED_SUPABASE_SERVICES = [
  "realtime", "imgproxy", "mailpit", "postgres-meta", "studio",
  "edge-runtime", "logflare", "vector", "supavisor",
];

function boundedRuntimeRoot(repositoryRoot) {
  const root = path.resolve(process.env.C3R_P_SUPABASE_WORKDIR ??
    path.join(repositoryRoot, ".agent-factory/c3r-p-runtime"));
  const boundary = path.resolve(process.env.RUNNER_TEMP ?? path.join(repositoryRoot, ".agent-factory"));
  if (root === boundary || !root.startsWith(`${boundary}${path.sep}`)) {
    throw new Error("C3R-P runtime workdir is outside the bounded temporary root.");
  }
  return root;
}

function boundedTheoryRuntimeRoot(repositoryRoot) {
  const root = path.resolve(process.env.C3R_T_SUPABASE_WORKDIR ??
    path.join(repositoryRoot, ".agent-factory/c3r-t-runtime"));
  const boundary = path.resolve(process.env.RUNNER_TEMP ?? path.join(repositoryRoot, ".agent-factory"));
  if (root === boundary || !root.startsWith(`${boundary}${path.sep}`)) {
    throw new Error("C3R-T runtime workdir is outside the bounded temporary root.");
  }
  return root;
}

function boundedLawRuntimeRoot(repositoryRoot) {
  const root = path.resolve(process.env.C3R_L_SUPABASE_WORKDIR ??
    path.join(repositoryRoot, ".agent-factory/c3r-l-runtime"));
  const boundary = path.resolve(process.env.RUNNER_TEMP ?? path.join(repositoryRoot, ".agent-factory"));
  if (root === boundary || !root.startsWith(`${boundary}${path.sep}`)) {
    throw new Error("C3R-L runtime workdir is outside the bounded temporary root.");
  }
  return root;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    input: options.input,
    stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const diagnostic = options.reportOutput === true
      ? `${result.stdout}\n${result.stderr}`.trim().replaceAll(/\r?\n/g, " | ").slice(-2_000)
      : options.reportStderr === true
        ? result.stderr.trim().replaceAll(/\r?\n/g, " | ").slice(-2_000)
      : "";
    throw new Error(`${options.label ?? command} failed (${result.status ?? "spawn"})${
      diagnostic ? `: ${diagnostic}` : "."
    }`);
  }
  return result.stdout.trim();
}

function supabase(repositoryRoot, args, options = {}) {
  return run(process.execPath, [
    path.join(repositoryRoot, "node_modules/supabase/dist/supabase.js"), ...args,
  ], options);
}

function parseStatus(output) {
  for (let index = output.lastIndexOf("{"); index >= 0; index = output.lastIndexOf("{", index - 1)) {
    try { return JSON.parse(output.slice(index)); } catch { /* try an earlier JSON boundary */ }
  }
  throw new Error("local Supabase status was not valid JSON.");
}

function statusValue(status, names) {
  for (const name of names) {
    if (typeof status[name] === "string" && status[name]) return status[name];
  }
  throw new Error("local Supabase status omitted a required value.");
}

function prepareCycle(repositoryRoot, cycleRoot, projectId) {
  fs.rmSync(cycleRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(cycleRoot, "supabase/migrations"), { recursive: true });
  fs.mkdirSync(path.join(cycleRoot, "c3r-p-migrations"), { recursive: true });
  const sourceConfig = fs.readFileSync(
    path.join(repositoryRoot, "tests/runtime/wcv-c2-supabase/supabase/config.toml"), "utf8",
  );
  const config = sourceConfig
    .replace('project_id = "c2r-c-p-practice-repair"', `project_id = "${projectId}"`)
    .replace("major_version = 17", "major_version = 15")
    .replace("[storage]\nenabled = false", "[storage]\nenabled = true");
  if (!config.includes(`project_id = "${projectId}"`) || !config.includes("major_version = 15") ||
    !config.includes("[storage]\nenabled = true")) {
    throw new Error("C3R-P local Supabase config could not be pinned.");
  }
  fs.writeFileSync(path.join(cycleRoot, "supabase/config.toml"), config, { mode: 0o600 });
  for (const entry of exactMigrationInventory(repositoryRoot)) {
    const name = path.basename(entry.path);
    fs.copyFileSync(path.join(repositoryRoot, entry.path),
      path.join(cycleRoot, "c3r-p-migrations", name));
  }
  if (fs.readdirSync(path.join(cycleRoot, "supabase/migrations")).length !== 0 ||
    fs.readdirSync(path.join(cycleRoot, "c3r-p-migrations")).length !== 26) {
    throw new Error("C3R-P cycle did not receive the exact 26 migrations.");
  }
}

function stopSupabase(repositoryRoot, cycleRoot) {
  if (!fs.existsSync(path.join(cycleRoot, "supabase/config.toml"))) return;
  spawnSync(process.execPath, [path.join(repositoryRoot, "node_modules/supabase/dist/supabase.js"),
    "stop", "--workdir", cycleRoot, "--no-backup"], {
    encoding: "utf8", stdio: "ignore", timeout: 120_000,
  });
}

function psql(container, sql, label = "C3R-P database assertion") {
  return run("docker", ["exec", "--interactive", container, "psql", "--no-psqlrc",
    "--quiet", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1",
    "--username", "postgres", "--dbname", "postgres"], {
    input: sql, label, reportStderr: true,
  });
}

export function seedDisposableReviewOsProfiles(container, identities, executePsql = psql) {
  if (!DISPOSABLE_PROFILE_CONTAINER.test(container) || typeof executePsql !== "function" ||
    !Array.isArray(identities) || identities.length !== 3) {
    throw new Error("C3R-P disposable profile fixture boundary is invalid.");
  }
  const payload = identities.map((identity, index) => {
    if (!identity || typeof identity !== "object" || !UUID.test(identity.userId) ||
      typeof identity.email !== "string" || !DISPOSABLE_PROFILE_EMAILS[index].test(identity.email)) {
      throw new Error("C3R-P disposable profile fixture identity is invalid.");
    }
    return { user_id: identity.userId.toLowerCase(), email: identity.email.toLowerCase() };
  });
  if (new Set(payload.map((identity) => identity.user_id)).size !== 3 ||
    new Set(payload.map((identity) => identity.email)).size !== 3) {
    throw new Error("C3R-P disposable profile fixture identities are not unique.");
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const result = executePsql(container, `with fixture as (
    select input.user_id::uuid as user_id, input.email
    from jsonb_to_recordset(
      convert_from(decode('${payloadBase64}', 'base64'), 'utf8')::jsonb
    ) as input(user_id text, email text)
  ), bound_fixture as (
    select fixture.user_id, fixture.email
    from fixture
    join auth.users as auth_user
      on auth_user.id = fixture.user_id and auth_user.email = fixture.email
  ), upserted as (
    insert into public.profiles as profile (
      user_id, email, invite_status, entitlement_tier, updated_at
    )
    select user_id, email, 'active', 'free_trial', statement_timestamp()
    from bound_fixture
    on conflict (user_id) do update set
      email = excluded.email,
      invite_status = 'active',
      entitlement_tier = 'free_trial',
      updated_at = statement_timestamp()
    returning profile.user_id, profile.invite_status, profile.entitlement_tier
  )
  select concat_ws('|',
    (select count(*) from upserted),
    (select count(*) from upserted where invite_status = 'active'),
    (select count(*) from upserted where entitlement_tier = 'free_trial'),
    (select count(*) from upserted
      where not exists (select 1 from fixture where fixture.user_id = upserted.user_id))
  );`, "C3R-P disposable Review OS profile fixture");
  if (!/^\d+\|\d+\|\d+\|\d+$/.test(result)) {
    throw new Error("C3R-P disposable profile fixture receipt is invalid.");
  }
  const [matchedRowCount, activeRowCount, freeTrialRowCount, unrelatedRowMutationCount] =
    result.split("|").map(Number);
  const receipt = Object.freeze({
    matchedRowCount,
    activeRowCount,
    freeTrialRowCount,
    unrelatedRowMutationCount,
  });
  if (matchedRowCount !== 3 || activeRowCount !== 3 || freeTrialRowCount !== 3 ||
    unrelatedRowMutationCount !== 0) {
    throw new Error("C3R-P disposable profile fixture assertion failed.");
  }
  return receipt;
}

function assertExternalMigrationSubstrate(container) {
  const value = psql(container, `select concat_ws('|',
    (to_regclass('auth.users') is not null)::text,
    (to_regprocedure('auth.uid()') is not null)::text,
    (to_regclass('storage.buckets') is not null)::text,
    (to_regclass('storage.objects') is not null)::text,
    (to_regprocedure('storage.allow_only_operation(text)') is not null)::text,
    (to_regprocedure('storage.allow_any_operation(text[])') is not null)::text,
    (select relrowsecurity::text from pg_class where oid = 'storage.objects'::regclass)
  );`, "C3R-P external Supabase substrate preflight");
  if (value !== "true|true|true|true|true|true|true") {
    throw new Error(`C3R-P external Supabase substrate is incomplete before replay (${value}).`);
  }
}

function applyExactMigrationHistory(cycleRoot, container) {
  const migrationRoot = path.join(cycleRoot, "c3r-p-migrations");
  const names = fs.readdirSync(migrationRoot).sort();
  if (names.length !== 26 || names.some((name) => !/^\d{8,14}_[a-z0-9_]+\.sql$/.test(name))) {
    throw new Error("C3R-P exact migration history is invalid before application.");
  }
  for (const name of names) {
    const sql = fs.readFileSync(path.join(migrationRoot, name), "utf8");
    psql(container, `begin;\n${sql}\ncommit;\n`, `C3R-P migration ${name}`);
  }
  psql(container, "notify pgrst, 'reload schema';\n", "C3R-P PostgREST schema reload");
}

function prepareTheoryCycle(repositoryRoot, cycleRoot, projectId) {
  prepareCycle(repositoryRoot, cycleRoot, projectId);
  const migrationRoot = path.join(cycleRoot, "c3r-t-migrations");
  fs.mkdirSync(migrationRoot, { recursive: true });
  for (const migrationPath of [C3R_T_ENUM_MIGRATION_PATH, C3R_T_INTEGRATION_MIGRATION_PATH]) {
    fs.copyFileSync(path.join(repositoryRoot, migrationPath),
      path.join(migrationRoot, path.basename(migrationPath)));
  }
  const names = fs.readdirSync(migrationRoot).sort();
  if (names.length !== 2 || names[0] !== path.basename(C3R_T_ENUM_MIGRATION_PATH) ||
    names[1] !== path.basename(C3R_T_INTEGRATION_MIGRATION_PATH)) {
    throw new Error("C3R-T cycle did not receive the exact two forward migrations.");
  }
}

function prepareLawCycle(repositoryRoot, cycleRoot, projectId) {
  prepareTheoryCycle(repositoryRoot, cycleRoot, projectId);
  const migrationRoot = path.join(cycleRoot, "c3r-l-migrations");
  fs.mkdirSync(migrationRoot, { recursive: true });
  for (const migrationPath of [C3R_L_ENUM_MIGRATION_PATH, C3R_L_INTEGRATION_MIGRATION_PATH]) {
    fs.copyFileSync(path.join(repositoryRoot, migrationPath),
      path.join(migrationRoot, path.basename(migrationPath)));
  }
  const names = fs.readdirSync(migrationRoot).sort();
  if (names.length !== 2 || names[0] !== path.basename(C3R_L_ENUM_MIGRATION_PATH) ||
    names[1] !== path.basename(C3R_L_INTEGRATION_MIGRATION_PATH)) {
    throw new Error("C3R-L cycle did not receive the exact two forward migrations.");
  }
}

function seedLegacyPracticePlannerReceipts(container, identity) {
  if (!identity || !UUID.test(identity.userId)) {
    throw new Error("C3R-T legacy Practice planner identity fixture is invalid.");
  }
  const fixture = {
    userId: identity.userId.toLowerCase(),
    createCommandId: crypto.randomUUID(),
    decideCommandId: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    asOf: "2026-08-25T00:00:00.000Z",
    blocks: [{
      blockId: crypto.randomUUID(), blockKind: "CORE_OUTCOME",
      recordId: crypto.randomUUID(), gapId: crypto.randomUUID(),
      reviewPhase: "D1", ordinal: 1, minutes: 30,
    }],
  };
  const blocksBase64 = Buffer.from(JSON.stringify(fixture.blocks), "utf8").toString("base64");
  psql(container, `with inputs as (
    select '${fixture.userId}'::uuid as user_id,
      '${fixture.createCommandId}'::uuid as create_command_id,
      '${fixture.decideCommandId}'::uuid as decide_command_id,
      '${fixture.planId}'::uuid as plan_id,
      '${fixture.asOf}'::timestamptz as as_of,
      convert_from(decode('${blocksBase64}', 'base64'), 'UTF8')::jsonb as blocks
  ) insert into public.c3r_p_command_receipts (
    command_id, user_id, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) select create_command_id, user_id, 'create_plan',
      encode(extensions.digest(convert_to(concat_ws(chr(31), plan_id::text,
        'TODAY', '30', as_of::text, blocks::text), 'UTF8'), 'sha256'), 'hex'),
      plan_id, 1, jsonb_build_object('planId', plan_id, 'recordVersion', 1,
        'state', 'PROPOSED', 'status', 'applied')
    from inputs
  union all
  select decide_command_id, user_id, 'decide_plan',
      encode(extensions.digest(convert_to(concat_ws(chr(31), plan_id::text,
        '1', 'ACCEPT', as_of::text, ''), 'UTF8'), 'sha256'), 'hex'),
      plan_id, 1, jsonb_build_object('planId', plan_id, 'recordVersion', 1,
        'state', 'ACCEPTED', 'status', 'applied')
    from inputs;`, "C3R-T legacy Practice planner receipt fixture");
  return fixture;
}

function assertLegacyPracticePlannerReceiptReplay(container, fixture) {
  const blocksBase64 = Buffer.from(JSON.stringify(fixture.blocks), "utf8").toString("base64");
  const result = psql(container, `begin;
    set local role service_role;
    select concat_ws('|',
      (public.c3r_p_create_plan_v1(
        '${fixture.userId}'::uuid, '${fixture.createCommandId}'::uuid,
        '${fixture.planId}'::uuid, 'TODAY', 30, '${fixture.asOf}'::timestamptz,
        convert_from(decode('${blocksBase64}', 'base64'), 'UTF8')::jsonb
      ) ->> 'status'),
      (public.c3r_p_decide_plan_v1(
        '${fixture.userId}'::uuid, '${fixture.decideCommandId}'::uuid,
        '${fixture.planId}'::uuid, 1, 'ACCEPT', '${fixture.asOf}'::timestamptz, null
      ) ->> 'status'),
      (select count(*)::text from public.c3r_p_command_receipts
        where user_id='${fixture.userId}'::uuid and subject='PRACTICE')
    );
    commit;`, "C3R-T post-migration legacy Practice planner receipt replay");
  if (result !== "applied|applied|2") {
    throw new Error("C3R-T changed a legacy Practice planner idempotency hash.");
  }
}

function applyTheoryMigrationHistory(cycleRoot, container, legacyPracticeIdentity) {
  const legacyPracticePlannerReceipts = seedLegacyPracticePlannerReceipts(
    container,
    legacyPracticeIdentity,
  );
  const practiceWrapperArgumentsBefore = psql(
    container,
    practiceWrapperArgumentCatalogSql(),
    "C3R-T pre-migration Practice wrapper argument catalog",
  );
  assertPracticeWrapperArgumentCatalog(practiceWrapperArgumentsBefore, "dedicated pre-migration");
  const migrationRoot = path.join(cycleRoot, "c3r-t-migrations");
  for (const name of fs.readdirSync(migrationRoot).sort()) {
    const sql = fs.readFileSync(path.join(migrationRoot, name), "utf8");
    psql(container, `begin;\n${sql}\ncommit;\n`, `C3R-T migration ${name}`);
  }
  const practiceWrapperArgumentsAfter = psql(
    container,
    practiceWrapperArgumentCatalogSql(),
    "C3R-T post-migration Practice wrapper argument catalog",
  );
  assertPracticeWrapperArgumentCatalog(practiceWrapperArgumentsAfter, "dedicated post-migration");
  if (practiceWrapperArgumentsAfter !== practiceWrapperArgumentsBefore) {
    throw new Error("C3R-T Practice wrapper argument names changed across migration.");
  }
  const theoryPostgrestArguments = psql(
    container,
    theoryPostgrestArgumentCatalogSql(),
    "C3R-T Theory PostgREST wrapper argument catalog",
  );
  assertTheoryPostgrestArgumentCatalog(theoryPostgrestArguments, "dedicated post-migration");
  psql(container, "notify pgrst, 'reload schema';\n", "C3R-T PostgREST schema reload");
  assertLegacyPracticePlannerReceiptReplay(container, legacyPracticePlannerReceipts);
  return {
    practiceWrapperArgumentNamesPreserved: true,
    theoryPostgrestArgumentNamesBound: true,
  };
}

function applyLawMigrationHistory(cycleRoot, container, legacyPracticeIdentity) {
  const theoryResult = applyTheoryMigrationHistory(cycleRoot, container, legacyPracticeIdentity);
  const practiceBefore = psql(container, practiceWrapperArgumentCatalogSql(),
    "C3R-L pre-migration Practice wrapper argument catalog");
  const theoryBefore = psql(container, theoryPostgrestArgumentCatalogSql(),
    "C3R-L pre-migration Theory wrapper argument catalog");
  assertPracticeWrapperArgumentCatalog(practiceBefore, "Law dedicated pre-migration");
  assertTheoryPostgrestArgumentCatalog(theoryBefore, "Law dedicated pre-migration");
  const migrationRoot = path.join(cycleRoot, "c3r-l-migrations");
  for (const name of fs.readdirSync(migrationRoot).sort()) {
    const sql = fs.readFileSync(path.join(migrationRoot, name), "utf8");
    psql(container, `begin;\n${sql}\ncommit;\n`, `C3R-L migration ${name}`);
  }
  const practiceAfter = psql(container, practiceWrapperArgumentCatalogSql(),
    "C3R-L post-migration Practice wrapper argument catalog");
  const theoryAfter = psql(container, theoryPostgrestArgumentCatalogSql(),
    "C3R-L post-migration Theory wrapper argument catalog");
  assertPracticeWrapperArgumentCatalog(practiceAfter, "Law dedicated post-migration");
  assertTheoryPostgrestArgumentCatalog(theoryAfter, "Law dedicated post-migration");
  if (practiceAfter !== practiceBefore || theoryAfter !== theoryBefore) {
    throw new Error("C3R-L changed a predecessor PostgREST wrapper argument catalog.");
  }
  const lawArguments = psql(container, lawPostgrestArgumentCatalogSql(),
    "C3R-L Law PostgREST wrapper argument catalog");
  assertLawPostgrestArgumentCatalog(lawArguments, "dedicated post-migration");
  psql(container, "notify pgrst, 'reload schema';\n", "C3R-L PostgREST schema reload");
  return {
    ...theoryResult,
    theoryWrapperArgumentNamesPreserved: true,
    lawPostgrestArgumentNamesBound: true,
  };
}

async function createIdentity(apiUrl, anonKey, label) {
  const email = `c3r-p-${label}-${crypto.randomUUID()}@example.invalid`;
  const password = `C3rP!${crypto.randomBytes(14).toString("hex")}aA1`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("local synthetic Auth identity creation failed.");
  const body = await response.json();
  if (!body?.user?.id || !body?.access_token) throw new Error("local synthetic Auth response is incomplete.");
  return { email, password, userId: body.user.id, accessToken: body.access_token };
}

async function createTheoryIdentity(apiUrl, anonKey, label) {
  const email = `c3r-t-${label}-${crypto.randomUUID()}@example.invalid`;
  const password = `C3rT!${crypto.randomBytes(14).toString("hex")}aA1`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("local synthetic Theory Auth identity creation failed.");
  const body = await response.json();
  if (!body?.user?.id || !body?.access_token) {
    throw new Error("local synthetic Theory Auth response is incomplete.");
  }
  return { email, password, userId: body.user.id, accessToken: body.access_token };
}

async function createLawIdentity(apiUrl, anonKey, label) {
  const email = `c3r-l-${label}-${crypto.randomUUID()}@example.invalid`;
  const password = `C3rL!${crypto.randomBytes(14).toString("hex")}aA1`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("local synthetic Law Auth identity creation failed.");
  const body = await response.json();
  if (!body?.user?.id || !body?.access_token) {
    throw new Error("local synthetic Law Auth response is incomplete.");
  }
  return { email, password, userId: body.user.id, accessToken: body.access_token };
}

function seedTheoryIdentityRelations(container, identities) {
  if (!/^supabase_db_c3r-t-cycle-[12]-\d+-\d+$/.test(container) ||
    !Array.isArray(identities) || identities.length !== 3 ||
    identities.some((identity) => !UUID.test(identity.userId) ||
      !/^c3r-t-[a-z0-9-]+-[0-9a-f-]{36}@example\.invalid$/i.test(identity.email))) {
    throw new Error("C3R-T disposable profile fixture boundary is invalid.");
  }
  const payload = identities.map((identity) => ({
    user_id: identity.userId.toLowerCase(), email: identity.email.toLowerCase(),
  }));
  if (new Set(payload.map((identity) => identity.user_id)).size !== 3 ||
    new Set(payload.map((identity) => identity.email)).size !== 3) {
    throw new Error("C3R-T disposable identity fixtures are not unique.");
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const result = psql(container, `with fixture as (
    select input.user_id::uuid as user_id, input.email
    from jsonb_to_recordset(
      convert_from(decode('${payloadBase64}', 'base64'), 'utf8')::jsonb
    ) as input(user_id text, email text)
  ), upserted as (
    insert into public.profiles as profile (
      user_id, email, invite_status, entitlement_tier, updated_at
    ) select user_id, email, 'active', 'free_trial', statement_timestamp()
      from fixture
    on conflict (user_id) do update set
      email=excluded.email, invite_status='active', entitlement_tier='free_trial',
      updated_at=statement_timestamp()
    returning profile.user_id
  ) select concat_ws('|',
    (select count(*) from auth.users as auth_user join fixture
      on auth_user.id = fixture.user_id and lower(auth_user.email) = fixture.email),
    (select count(*) from upserted),
    (select count(*) from upserted where user_id in (select user_id from fixture)));`,
  "C3R-T disposable Auth and Review OS profile fixture");
  if (result !== "3|3|3") {
    throw new Error("C3R-T disposable Auth/profile identity fixture assertion failed.");
  }
}

function seedLawIdentityRelations(container, identities) {
  if (!/^supabase_db_c3r-l-cycle-[12]-\d+-\d+$/.test(container) ||
    !Array.isArray(identities) || identities.length !== 3 ||
    identities.some((identity) => !UUID.test(identity.userId) ||
      !/^c3r-l-[a-z0-9-]+-[0-9a-f-]{36}@example\.invalid$/i.test(identity.email))) {
    throw new Error("C3R-L disposable profile fixture boundary is invalid.");
  }
  const payload = identities.map((identity) => ({
    user_id: identity.userId.toLowerCase(), email: identity.email.toLowerCase(),
  }));
  if (new Set(payload.map((identity) => identity.user_id)).size !== 3 ||
    new Set(payload.map((identity) => identity.email)).size !== 3) {
    throw new Error("C3R-L disposable identity fixtures are not unique.");
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const result = psql(container, `with fixture as (
    select input.user_id::uuid as user_id, input.email
    from jsonb_to_recordset(
      convert_from(decode('${payloadBase64}', 'base64'), 'utf8')::jsonb
    ) as input(user_id text, email text)
  ), upserted as (
    insert into public.profiles as profile (
      user_id, email, invite_status, entitlement_tier, updated_at
    ) select user_id, email, 'active', 'free_trial', statement_timestamp()
      from fixture
    on conflict (user_id) do update set
      email=excluded.email, invite_status='active', entitlement_tier='free_trial',
      updated_at=statement_timestamp()
    returning profile.user_id
  ) select concat_ws('|',
    (select count(*) from auth.users as auth_user join fixture
      on auth_user.id = fixture.user_id and lower(auth_user.email) = fixture.email),
    (select count(*) from upserted),
    (select count(*) from upserted where user_id in (select user_id from fixture)));`,
  "C3R-L disposable Auth and Review OS profile fixture");
  if (result !== "3|3|3") {
    throw new Error("C3R-L disposable Auth/profile identity fixture assertion failed.");
  }
}

async function verifyDirectBoundaries(apiUrl, anonKey, user) {
  const table = `${apiUrl}/rest/v1/c3r_p_learning_records?select=id`;
  const anonymous = await fetch(table, { headers: { apikey: anonKey } });
  if (anonymous.status === 200 && (await anonymous.json()).length !== 0) {
    throw new Error("anonymous C3R-P table access leaked rows.");
  }
  const direct = await fetch(`${apiUrl}/rest/v1/c3r_p_learning_records`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ id: crypto.randomUUID(), user_id: user.userId }),
  });
  if (direct.ok) throw new Error("authenticated direct C3R-P mutation was allowed.");
}

function databaseSecurity(container) {
  const value = psql(container, `select concat_ws('|',
    current_setting('server_version_num'),
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname like 'c3r_p_%' and c.relkind='r'
        and c.relrowsecurity and c.relforcerowsecurity),
    (select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid
      where t.typname='c3r_p_subject' and e.enumlabel='PRACTICE'),
    (select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid
      where t.typname='c3r_p_subject'),
    has_table_privilege('anon','public.c3r_p_learning_records','SELECT'),
    has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
    has_function_privilege('authenticated','public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    has_function_privilege('service_role','public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    (select rolbypassrls from pg_roles where rolname='service_role'),
    (select pg_get_userbyid(relowner) from pg_class where oid='public.c3r_p_learning_records'::regclass)
  );`);
  if (value !== "150008|10|1|1|f|f|f|t|t|postgres") {
    throw new Error("C3R-P catalog, grants, RLS, subject, owner, or PostgreSQL version is invalid.");
  }
}

function theoryDatabaseSecurity(container) {
  const value = psql(container, `select concat_ws('|',
    current_setting('server_version_num'),
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname like 'c3r_p_%' and c.relkind='r'
        and c.relrowsecurity and c.relforcerowsecurity),
    (select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid
      where t.typname='c3r_p_subject'),
    has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
    has_function_privilege('authenticated',
      'public.c3r_t_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    has_function_privilege('service_role',
      'public.c3r_t_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    has_function_privilege('service_role',
      'public.c3r_t_validate_theory_claim_v1(jsonb,text,timestamptz)','EXECUTE'),
    (select count(*) from information_schema.columns where table_schema='public'
      and table_name='c3r_p_attempts'
      and column_name in ('proof_claim','proof_evaluation','proof_reason_codes')),
    (to_regprocedure(
      'public.c3r_p_apply_learning_command_practice_legacy_v1(uuid,uuid,bigint,text,jsonb)')
      is not null)::text,
    (select rolbypassrls from pg_roles where rolname='service_role'),
    (select pg_get_userbyid(relowner) from pg_class
      where oid='public.c3r_p_learning_records'::regclass)
  );`, "C3R-T database security assertion");
  if (value !== "150008|10|2|f|f|t|t|3|true|t|postgres") {
    throw new Error("C3R-T catalog, grants, RLS, subject, proof, or PostgreSQL version is invalid.");
  }
}

function lawDatabaseSecurity(container) {
  const value = psql(container, `select concat_ws('|',
    current_setting('server_version_num'),
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname like 'c3r_p_%' and c.relkind='r'
        and c.relrowsecurity and c.relforcerowsecurity),
    (select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid
      where t.typname='c3r_p_subject'),
    has_table_privilege('authenticated','public.c3r_p_learning_records','INSERT'),
    has_function_privilege('authenticated',
      'public.c3r_l_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    has_function_privilege('service_role',
      'public.c3r_l_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)','EXECUTE'),
    has_function_privilege('authenticated',
      'public.c3r_l_validate_law_claim_v1(jsonb,text,timestamptz)','EXECUTE'),
    has_function_privilege('service_role',
      'public.c3r_l_validate_law_claim_v1(jsonb,text,timestamptz)','EXECUTE'),
    (select count(*) from information_schema.columns where table_schema='public'
      and table_name='c3r_p_attempts'
      and column_name in ('proof_claim','proof_evaluation','proof_reason_codes')),
    (to_regprocedure(
      'public.c3r_p_apply_learning_command_practice_legacy_v1(uuid,uuid,bigint,text,jsonb)')
      is not null)::text,
    (select rolbypassrls from pg_roles where rolname='service_role'),
    (select pg_get_userbyid(relowner) from pg_class
      where oid='public.c3r_p_learning_records'::regclass)
  );`, "C3R-L database security assertion");
  if (value !== "150008|10|3|f|f|t|f|t|3|true|t|postgres") {
    throw new Error("C3R-L catalog, grants, RLS, subject, proof, or PostgreSQL version is invalid.");
  }
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("local Next server exited before readiness.");
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch { /* compilation or startup is still in progress */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("local Next server readiness timed out.");
}

async function startNext(repositoryRoot, port, env, diagnosticPath, secretValues) {
  const diagnostic = createC3RPEntryDiagnosticLog(diagnosticPath, secretValues);
  const child = spawn(process.execPath, [path.join(repositoryRoot, "node_modules/next/dist/bin/next"),
    "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: repositoryRoot,
    env: { ...process.env, ...env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => diagnostic.append(chunk));
  child.stderr.on("data", (chunk) => diagnostic.append(chunk));
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, child);
    return { child, baseUrl, diagnostic, diagnosticPath };
  } catch (error) {
    if (child.exitCode === null) child.kill("SIGTERM");
    diagnostic.finish();
    throw error;
  }
}

async function stopNext(server) {
  if (!server) return;
  if (server.child.exitCode === null) {
    server.child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]);
    if (server.child.exitCode === null) server.child.kill("SIGKILL");
  }
  server.diagnostic.finish();
}

function runBrowser(repositoryRoot, baseUrl, identities, browserEvidencePath, options) {
  run(process.execPath, [path.join(repositoryRoot, "node_modules/@playwright/test/cli.js"), "test",
    `--config=${path.join(repositoryRoot, "tests/e2e/wcv-c3r-p-playwright.config.ts")}`], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
      C3R_P_USER_A_EMAIL: identities[0].email,
      C3R_P_USER_A_PASSWORD: identities[0].password,
      C3R_P_USER_B_EMAIL: identities[1].email,
      C3R_P_USER_B_PASSWORD: identities[1].password,
      C3R_P_USER_C_EMAIL: identities[2].email,
      C3R_P_USER_C_PASSWORD: identities[2].password,
      C3R_P_BROWSER_EVIDENCE_PATH: browserEvidencePath,
      C3R_P_RESTORE_ONLY: options.restoreOnly ? "true" : "false",
      C3R_P_ENTRY_ONLY: options.entryOnly ? "true" : "false",
      C3R_P_ENTRY_ACTOR: options.entryActor,
      C3R_P_ENTRY_EXPECTATION: options.expectedClassification,
      C3R_P_ENTRY_EVIDENCE_PATH: options.entryEvidencePath,
      C3R_P_PLAYWRIGHT_CONTEXT_PATH: options.playwrightContextPath,
      C3R_P_DATABASE_CONTAINER: options.databaseContainer ?? "",
    },
    label: options.label,
    reportOutput: true,
  });
}

function runTheoryBrowser(repositoryRoot, baseUrl, identities, browserEvidencePath,
  practiceCompatibilityEvidencePath, databaseContainer, browserMode, failureStagePath) {
  run(process.execPath, [path.join(repositoryRoot, "node_modules/@playwright/test/cli.js"), "test",
    `--config=${path.join(repositoryRoot, "tests/e2e/wcv-c3r-t-playwright.config.ts")}`], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
      C3R_T_OWNER_EMAIL: identities[0].email,
      C3R_T_OWNER_PASSWORD: identities[0].password,
      C3R_T_OTHER_OWNER_EMAIL: identities[1].email,
      C3R_T_OTHER_OWNER_PASSWORD: identities[1].password,
      C3R_T_NON_OWNER_EMAIL: identities[2].email,
      C3R_T_NON_OWNER_PASSWORD: identities[2].password,
      C3R_T_BROWSER_EVIDENCE_PATH: browserEvidencePath,
      C3R_T_PRACTICE_COMPATIBILITY_EVIDENCE_PATH: practiceCompatibilityEvidencePath,
      C3R_T_DATABASE_CONTAINER: databaseContainer,
      C3R_T_BROWSER_MODE: browserMode,
      C3R_T_BROWSER_FAILURE_STAGE_PATH: failureStagePath,
    },
    label: `C3R-T ${browserMode} browser verification`,
    reportOutput: true,
  });
}

function runLawBrowser(repositoryRoot, baseUrl, identities, browserEvidencePath,
  practiceCompatibilityEvidencePath, databaseContainer, browserMode, failureStagePath) {
  run(process.execPath, [path.join(repositoryRoot, "node_modules/@playwright/test/cli.js"), "test",
    `--config=${path.join(repositoryRoot, "tests/e2e/wcv-c3r-l-playwright.config.ts")}`], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
      C3R_L_OWNER_EMAIL: identities[0].email,
      C3R_L_OWNER_PASSWORD: identities[0].password,
      C3R_L_OTHER_OWNER_EMAIL: identities[1].email,
      C3R_L_OTHER_OWNER_PASSWORD: identities[1].password,
      C3R_L_NON_OWNER_EMAIL: identities[2].email,
      C3R_L_NON_OWNER_PASSWORD: identities[2].password,
      C3R_L_BROWSER_EVIDENCE_PATH: browserEvidencePath,
      C3R_L_PRACTICE_COMPATIBILITY_EVIDENCE_PATH: practiceCompatibilityEvidencePath,
      C3R_L_DATABASE_CONTAINER: databaseContainer,
      C3R_L_BROWSER_MODE: browserMode,
      C3R_L_BROWSER_FAILURE_STAGE_PATH: failureStagePath,
    },
    label: `C3R-L ${browserMode} browser verification`,
    reportOutput: true,
  });
}

export function classifyC3RLNextFailureDiagnostic(value) {
  const diagnostic = redactC3RPEntryDiagnosticText(String(value))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "");
  if (/\b(?:GET|POST) \/api\/review-os\/c3r-l(?:\?[^\s]*)? 503\b/u.test(diagnostic)) {
    return "C3R_L_API_TEMPORARILY_UNAVAILABLE";
  }
  if (/\b(?:GET|POST) \/api\/review-os\/c3r-l(?:\?[^\s]*)? 404\b/u.test(diagnostic)) {
    return "C3R_L_API_NOT_FOUND";
  }
  if (/\bGET \/app\/c3r-l(?:\?[^\s]*)? 404\b/u.test(diagnostic)) {
    return "C3R_L_PAGE_NOT_FOUND";
  }
  if (/\b(?:Failed to compile|Build Error|Module not found)\b/iu.test(diagnostic)) {
    return "C3R_L_NEXT_COMPILE_FAILURE";
  }
  return "C3R_L_NEXT_FAILURE_UNCLASSIFIED";
}

const C3R_L_BROWSER_FAILURE_STAGE_SCHEMA_VERSION =
  "inverge.c3r_l.browser_failure_stage.v1";
const C3R_L_BROWSER_FAILURE_STAGES = Object.freeze({
  journey: Object.freeze([
    "LOAD_RETRY_INITIAL", "LOAD_RETRY_ERROR_VISIBLE", "LOAD_RETRY_COMPLETE",
    "STALE_BOOKMARK_INITIAL", "STALE_BOOKMARK_ERROR_VISIBLE",
    "STALE_BOOKMARK_RECOVERY_COMPLETE",
    "INITIAL_RUNTIME", "LAW_START", "FEEDBACK_COMMIT", "FEEDBACK_UI",
    "DIRECT_RPC_DENIALS", "REPAIR_REPLAY", "EARLY_D1_UI", "ASSISTED_REVIEW",
    "D1_PLAN_COMPLETE", "EARLY_D7_UI", "D7_PLAN_COMPLETE", "EARLY_RECURRENCE_UI",
    "RECURRENCE", "TERMINAL_PLAN_UI", "REOPEN", "EARLY_REOPEN_UI",
    "REOPEN_COMPLETE", "PRACTICE_COMPAT_THEORY_START", "PRACTICE_COMPATIBILITY",
    "PRACTICE_START", "THEORY_COMPATIBILITY",
    "THEORY_COMPAT_START", "THEORY_COMPAT_FEEDBACK", "THEORY_COMPAT_REJECTED_REPAIR",
    "THEORY_COMPAT_REPAIR", "THEORY_COMPAT_ASSISTED", "THEORY_COMPAT_D1_PLAN",
    "THEORY_COMPAT_D1_COMPLETE", "THEORY_COMPAT_D7_PLAN", "THEORY_COMPAT_D7_PRESENT",
    "THEORY_COMPAT_D7_COMPLETE", "THEORY_COMPAT_RECURRENCE", "THEORY_COMPAT_REOPEN",
    "THEORY_COMPAT_REOPEN_COMPLETE", "THEORY_COMPAT_RESTORE", "THEORY_COMPAT_EXPORT",
    "THEORY_COMPAT_DELETE", "THEORY_COMPAT_ISOLATION", "THEORY_START", "ISOLATION",
    "PERSISTENCE_EVIDENCE", "TERMINAL_CONTEXT_CLOSE", "COMPLETE",
  ]),
  restore: Object.freeze(["RESTORE_LOAD", "EXPORT", "DELETE_ISOLATION", "COMPLETE"]),
  feature_off: Object.freeze(["ACCESS_GATE", "COMPLETE"]),
  production_denied: Object.freeze(["ACCESS_GATE", "COMPLETE"]),
});

export function classifyC3RLBrowserFailureStage(value, expectedMode) {
  try {
    exactKeys(value, ["schemaVersion", "mode", "stage"], "C3R-L browser failure stage");
    if (value.schemaVersion !== C3R_L_BROWSER_FAILURE_STAGE_SCHEMA_VERSION ||
      value.mode !== expectedMode ||
      !Object.hasOwn(C3R_L_BROWSER_FAILURE_STAGES, expectedMode) ||
      !C3R_L_BROWSER_FAILURE_STAGES[expectedMode].includes(value.stage)) {
      return "C3R_L_BROWSER_STAGE_INVALID";
    }
    return `C3R_L_BROWSER_${expectedMode.toUpperCase()}_${value.stage}`;
  } catch {
    return "C3R_L_BROWSER_STAGE_INVALID";
  }
}

export function readC3RLBrowserFailureStage(filePath, expectedMode) {
  if (!fs.existsSync(filePath)) return "C3R_L_BROWSER_STAGE_MISSING";
  try {
    return classifyC3RLBrowserFailureStage(
      JSON.parse(fs.readFileSync(filePath, "utf8")),
      expectedMode,
    );
  } catch {
    return "C3R_L_BROWSER_STAGE_INVALID";
  }
}

async function runLawBrowserWithClosedDiagnostic(input) {
  try {
    runLawBrowser(
      input.repositoryRoot,
      input.server.baseUrl,
      input.identities,
      input.browserEvidencePath,
      input.practiceCompatibilityEvidencePath,
      input.databaseContainer,
      input.browserMode,
      input.failureStagePath,
    );
  } catch {
    await stopNext(input.server);
    const diagnostic = fs.existsSync(input.server.diagnosticPath)
      ? fs.readFileSync(input.server.diagnosticPath, "utf8")
      : "";
    const nextClassification = classifyC3RLNextFailureDiagnostic(diagnostic);
    const stageClassification = readC3RLBrowserFailureStage(
      input.failureStagePath,
      input.browserMode,
    );
    const classification = stageClassification.startsWith(
      `C3R_L_BROWSER_${input.browserMode.toUpperCase()}_`,
    ) ? stageClassification
      : nextClassification === "C3R_L_NEXT_FAILURE_UNCLASSIFIED"
        ? stageClassification
        : nextClassification;
    throw new Error(`C3R-L ${input.browserMode} browser verification failed: ${classification}.`);
  }
}

export function classifyC3RTNextFailureDiagnostic(value) {
  const diagnostic = redactC3RPEntryDiagnosticText(String(value))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "");
  if (/\b(?:GET|POST) \/api\/review-os\/c3r-t(?:\?[^\s]*)? 503\b/u.test(diagnostic)) {
    return "C3R_T_API_TEMPORARILY_UNAVAILABLE";
  }
  if (/\b(?:GET|POST) \/api\/review-os\/c3r-t(?:\?[^\s]*)? 404\b/u.test(diagnostic)) {
    return "C3R_T_API_NOT_FOUND";
  }
  if (/\bGET \/app\/c3r-t(?:\?[^\s]*)? 404\b/u.test(diagnostic)) {
    return "C3R_T_PAGE_NOT_FOUND";
  }
  if (/\b(?:Failed to compile|Build Error|Module not found)\b/iu.test(diagnostic)) {
    return "C3R_T_NEXT_COMPILE_FAILURE";
  }
  return "C3R_T_NEXT_FAILURE_UNCLASSIFIED";
}

const C3R_T_BROWSER_FAILURE_STAGE_SCHEMA_VERSION =
  "inverge.c3r_t.browser_failure_stage.v1";
const C3R_T_BROWSER_FAILURE_STAGES = Object.freeze({
  journey: Object.freeze([
    "INITIAL_RUNTIME",
    "PRACTICE_START",
    "THEORY_START",
    "PRACTICE_COMPATIBILITY",
    "FEEDBACK",
    "DIRECT_RPC_DENIALS",
    "REPAIR_REPLAY",
    "EARLY_D1_UI",
    "ASSISTED_REVIEW",
    "D1_PLAN_COMPLETE",
    "EARLY_D7_UI",
    "D7_PLAN_COMPLETE",
    "EARLY_RECURRENCE_UI",
    "RECURRENCE",
    "TERMINAL_PLAN_UI",
    "REOPEN",
    "EARLY_REOPEN_UI",
    "REOPEN_COMPLETE",
    "ISOLATION",
    "PERSISTENCE_EVIDENCE",
    "COMPLETE",
  ]),
  restore: Object.freeze([
    "RESTORE_LOAD",
    "EXPORT",
    "DELETE_ISOLATION",
    "COMPLETE",
  ]),
  feature_off: Object.freeze(["ACCESS_GATE", "COMPLETE"]),
  production_denied: Object.freeze(["ACCESS_GATE", "COMPLETE"]),
});

export function classifyC3RTBrowserFailureStage(value, expectedMode) {
  try {
    exactKeys(value, ["schemaVersion", "mode", "stage"], "C3R-T browser failure stage");
    if (value.schemaVersion !== C3R_T_BROWSER_FAILURE_STAGE_SCHEMA_VERSION ||
      value.mode !== expectedMode ||
      !Object.hasOwn(C3R_T_BROWSER_FAILURE_STAGES, expectedMode) ||
      !C3R_T_BROWSER_FAILURE_STAGES[expectedMode].includes(value.stage)) {
      return "C3R_T_BROWSER_STAGE_INVALID";
    }
    return `C3R_T_BROWSER_${expectedMode.toUpperCase()}_${value.stage}`;
  } catch {
    return "C3R_T_BROWSER_STAGE_INVALID";
  }
}

export function readC3RTBrowserFailureStage(filePath, expectedMode) {
  if (!fs.existsSync(filePath)) return "C3R_T_BROWSER_STAGE_MISSING";
  try {
    return classifyC3RTBrowserFailureStage(
      JSON.parse(fs.readFileSync(filePath, "utf8")),
      expectedMode,
    );
  } catch {
    return "C3R_T_BROWSER_STAGE_INVALID";
  }
}

async function runTheoryBrowserWithClosedDiagnostic(input) {
  try {
    runTheoryBrowser(
      input.repositoryRoot,
      input.server.baseUrl,
      input.identities,
      input.browserEvidencePath,
      input.practiceCompatibilityEvidencePath,
      input.databaseContainer,
      input.browserMode,
      input.failureStagePath,
    );
  } catch {
    await stopNext(input.server);
    const diagnostic = fs.existsSync(input.server.diagnosticPath)
      ? fs.readFileSync(input.server.diagnosticPath, "utf8")
      : "";
    const nextClassification = classifyC3RTNextFailureDiagnostic(diagnostic);
    const stageClassification = readC3RTBrowserFailureStage(
      input.failureStagePath,
      input.browserMode,
    );
    const classification = stageClassification.startsWith(
      `C3R_T_BROWSER_${input.browserMode.toUpperCase()}_`,
    ) ? stageClassification
      : nextClassification === "C3R_T_NEXT_FAILURE_UNCLASSIFIED"
        ? stageClassification
        : nextClassification;
    throw new Error(`C3R-T ${input.browserMode} browser verification failed: ${classification}.`);
  }
}

function entryDiagnosticPaths(diagnosticRoot, cycle, label, nextDiagnosticPath) {
  const prefix = `cycle-${cycle}-${label}`;
  return {
    receipt: path.join(diagnosticRoot, `entry-proof-${prefix}.json`),
    playwright: path.join(diagnosticRoot, `playwright-entry-${prefix}.json`),
    next: nextDiagnosticPath,
    failureReceipt: path.join(diagnosticRoot, `failure-entry-receipt-${prefix}.json`),
    failurePlaywright: path.join(diagnosticRoot, `failure-playwright-context-${prefix}.json`),
    failureNext: path.join(diagnosticRoot, `failure-next-${prefix}.log`),
  };
}

function readEntryReceipt(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const receipt = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateC3RPEntryReceipt(receipt);
  return receipt;
}

function preserveEntryFailure(paths) {
  for (const [source, destination] of [
    [paths.receipt, paths.failureReceipt],
    [paths.playwright, paths.failurePlaywright],
    [paths.next, paths.failureNext],
  ]) {
    if (fs.existsSync(source)) fs.renameSync(source, destination);
  }
}

function discardEntryContext(paths, discardNext = false) {
  fs.rmSync(paths.playwright, { force: true });
  if (discardNext) fs.rmSync(paths.next, { force: true });
}

async function runEntryProbe(input) {
  const paths = entryDiagnosticPaths(
    input.diagnosticRoot,
    input.cycle,
    input.label,
    input.server.diagnosticPath,
  );
  try {
    runBrowser(
      input.repositoryRoot,
      input.server.baseUrl,
      input.identities,
      input.browserEvidencePath,
      {
        restoreOnly: false,
        entryOnly: input.entryOnly,
        entryActor: input.entryActor,
        expectedClassification: input.expectedClassification,
        entryEvidencePath: paths.receipt,
        playwrightContextPath: paths.playwright,
        label: `C3R-P ${input.label} entry probe`,
      },
    );
    const receipt = readEntryReceipt(paths.receipt);
    if (!receipt || receipt.classification !== input.expectedClassification) {
      throw new Error(`C3R-P ${input.label} entry receipt is missing or mismatched.`);
    }
    discardEntryContext(paths, false);
    return receipt;
  } catch (error) {
    await stopNext(input.server);
    const receipt = readEntryReceipt(paths.receipt);
    if (!receipt || receipt.classification !== input.expectedClassification) {
      preserveEntryFailure(paths);
    } else {
      discardEntryContext(paths, true);
    }
    throw error;
  }
}

async function stopAndDiscardNext(server) {
  if (!server) return;
  await stopNext(server);
  fs.rmSync(server.diagnosticPath, { force: true });
}

async function runDedicatedCycle(input) {
  const projectId = `c3r-p-cycle-${input.cycle}-${input.runId}-${input.runAttempt}`;
  const cycleRoot = path.join(input.runtimeRoot, `cycle-${input.cycle}`);
  const diagnosticRoot = path.join(input.runtimeRoot, "entry-diagnostics");
  const browserEvidencePath = path.join(cycleRoot, "browser-metadata.json");
  let server;
  let oracle;
  try {
    prepareCycle(input.repositoryRoot, cycleRoot, projectId);
    supabase(input.repositoryRoot, ["start", "--workdir", cycleRoot, "--exclude",
      EXCLUDED_SUPABASE_SERVICES.join(","), "--output", "json", "--yes"], {
      label: `C3R-P Supabase cycle ${input.cycle} start`,
    });
    const status = parseStatus(supabase(input.repositoryRoot,
      ["status", "--workdir", cycleRoot, "--output", "json"], { label: "C3R-P Supabase status" }));
    const apiUrl = statusValue(status, ["API_URL", "api_url"]);
    const anonKey = statusValue(status, ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"]);
    const serviceRoleKey = statusValue(status,
      ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"]);
    const databaseContainer = `supabase_db_${projectId}`;
    assertExternalMigrationSubstrate(databaseContainer);
    applyExactMigrationHistory(cycleRoot, databaseContainer);
    databaseSecurity(databaseContainer);
    const identities = [
      await createIdentity(apiUrl, anonKey, `a-${input.cycle}`),
      await createIdentity(apiUrl, anonKey, `b-${input.cycle}`),
      await createIdentity(apiUrl, anonKey, `non-owner-${input.cycle}`),
    ];
    seedDisposableReviewOsProfiles(databaseContainer, identities);
    await verifyDirectBoundaries(apiUrl, anonKey, identities[0]);
    const nextEnv = {
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      ALPHA_INVITE_EMAILS: identities.map((identity) => identity.email).join(","),
      ALPHA_ADMIN_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_PRACTICE_ENABLED: "true",
      C3R_P_LOCAL_EVIDENCE_MODE: "true",
      VERCEL_ENV: "preview",
    };
    const secretValues = [apiUrl, anonKey, serviceRoleKey,
      ...identities.flatMap((identity) => [identity.email, identity.password, identity.accessToken])];
    const startFor = (label, env = nextEnv) => startNext(
      input.repositoryRoot,
      3110 + input.cycle,
      env,
      path.join(diagnosticRoot, `next-cycle-${input.cycle}-${label}.log`),
      secretValues,
    );
    const probe = (
      label,
      expectedClassification,
      entryActor,
      entryOnly = true,
      probeIdentities = identities,
    ) => runEntryProbe({
      repositoryRoot: input.repositoryRoot,
      server,
      identities: probeIdentities,
      browserEvidencePath,
      diagnosticRoot,
      cycle: input.cycle,
      label,
      expectedClassification,
      entryActor,
      entryOnly,
    });

    server = await startFor("normal-entry");
    await probe("owner-a-positive", "C3R_P_ENTRY_VERIFIED", "owner");
    await probe("owner-b-positive", "C3R_P_ENTRY_VERIFIED", "owner", true,
      [identities[1], identities[0], identities[2]]);
    if (input.cycle === 1) {
      await probe("unauthenticated-negative", "C3R_P_ENTRY_AUTH_SESSION_NOT_VISIBLE", "unauthenticated");
      await probe("non-owner-negative", "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED", "non_owner");
    }
    await stopAndDiscardNext(server);
    server = null;

    if (input.cycle === 1) {
      server = await startFor("feature-off", { ...nextEnv, WCV_C3R_P_PRACTICE_ENABLED: "false" });
      await probe("feature-off-negative", "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED", "owner");
      await stopAndDiscardNext(server);
      server = null;

      server = await startFor("production-denied", { ...nextEnv, VERCEL_ENV: "production" });
      await probe("production-negative", "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED", "owner");
      await stopAndDiscardNext(server);
      server = null;
    }

    server = await startFor("journey");
    await probe("journey", "C3R_P_ENTRY_VERIFIED", "owner", false);
    await stopAndDiscardNext(server);
    server = null;

    server = await startFor("restart-restore");
    const restorePaths = entryDiagnosticPaths(
      diagnosticRoot,
      input.cycle,
      "restart-restore",
      server.diagnosticPath,
    );
    runBrowser(input.repositoryRoot, server.baseUrl, identities, browserEvidencePath, {
      restoreOnly: true,
      entryOnly: false,
      entryActor: "owner",
      expectedClassification: "C3R_P_ENTRY_VERIFIED",
      entryEvidencePath: restorePaths.receipt,
      playwrightContextPath: restorePaths.playwright,
      databaseContainer,
      label: "C3R-P restart browser verification",
    });
    const browserEvidence = JSON.parse(fs.readFileSync(browserEvidencePath, "utf8"));
    if (browserEvidence.browserToPostgres !== true || browserEvidence.restartRestore !== true ||
      browserEvidence.crossUserDenied !== true || browserEvidence.exportDelete !== true ||
      browserEvidence.reopenedCompletion !== true || browserEvidence.planBlockCompletion !== true ||
      browserEvidence.completeLearnerExport !== true ||
      browserEvidence.assistedRetryDenied !== true || browserEvidence.incorrectRetryDenied !== true ||
      browserEvidence.staleRetryDenied !== true ||
      browserEvidence.duplicateRetryIdempotent !== true ||
      browserEvidence.crossUserRetryDenied !== true ||
      browserEvidence.unrelatedPlanBlockUnchanged !== true ||
      browserEvidence.laterFailureReopensAgain !== true ||
      browserEvidence.completedPlanBlockReuseDenied !== true ||
      browserEvidence.completedPlanBlockNotResent !== true ||
      browserEvidence.completedPriorPhasePlanIgnored !== true ||
      browserEvidence.currentPlanHistorySeparated !== true ||
      browserEvidence.deterministicPlanHistory !== true ||
      browserEvidence.terminalPlanCannotReactivate !== true ||
      browserEvidence.completedPlanHistoryVisible !== true ||
      browserEvidence.assistanceExportedExactlyOnce !== true ||
      browserEvidence.todayAndFullDayBlocksExported !== true ||
      browserEvidence.editedPlanBlocksExportFinalValues !== true ||
      browserEvidence.crossUserExportRowsAbsent !== true ||
      browserEvidence.emptyExportCollectionsAreArrays !== true ||
      browserEvidence.deleteRemovesExportedData !== true ||
      browserEvidence.deleteMutationSerialization !== true ||
      browserEvidence.deleteWinsBothLockOrders !== true ||
      browserEvidence.planHistoryRestartRestored !== true ||
      browserEvidence.planHistoryExportedAndDeleted !== true ||
      browserEvidence.sealedTransferTaskPersisted !== true ||
      browserEvidence.transferTaskPresentedBeforeSubmission !== true ||
      browserEvidence.originalTaskReuseDenied !== true ||
      browserEvidence.fabricatedTransferTaskDenied !== true ||
      browserEvidence.transferTaskRestoredAfterRefresh !== true ||
      browserEvidence.transferTaskExportedMetadataOnly !== true ||
      browserEvidence.everyReviewPhasePlanBlockCompleted !== true ||
      browserEvidence.missingCurrentPlanBlockDenied !== true ||
      browserEvidence.stalePlanVersionDenied !== true ||
      browserEvidence.wrongPlanBindingDenied !== true ||
      browserEvidence.ambiguousPlanBlocksDenied !== true ||
      browserEvidence.planlessCompletionAllowedWithoutActivePlan !== true ||
      browserEvidence.proposedPlanTerminalizedOnReviewAdvance !== true ||
      browserEvidence.staleReviewStateDigestDenied !== true ||
      browserEvidence.unrelatedPlanBlockPreserved !== true ||
      browserEvidence.dayCompleteRecomputedHonestly !== true ||
      browserEvidence.assistedD1AttemptPersisted !== true ||
      browserEvidence.assistedD1AssistanceEventPersisted !== true ||
      browserEvidence.assistedD1LedgerPersisted !== true ||
      browserEvidence.assistedD1RestoredAfterRefresh !== true ||
      browserEvidence.assistedD1Rescheduling !== true ||
      browserEvidence.assistedD1ImmediateCompletionDenied !== true ||
      browserEvidence.assistedD1UiSuppressed !== true ||
      browserEvidence.assistedD1RefreshAndSecondBrowser !== true ||
      browserEvidence.assistedD1DuplicateIdempotent !== true ||
      browserEvidence.assistedD1StaleVersionDenied !== true ||
      browserEvidence.assistedD1CrossUserDenied !== true ||
      browserEvidence.assistedD1PriorPlanStaled !== true ||
      browserEvidence.assistedD1LaterIndependentSucceeded !== true ||
      browserEvidence.delayedD7ControlGated !== true ||
      browserEvidence.d7PreDueInteractionSuppressed !== true ||
      browserEvidence.d7CanonicalEligibilityAtDue !== true ||
      browserEvidence.recurrenceControlGated !== true ||
      browserEvidence.recurrencePreDueInteractionSuppressed !== true ||
      browserEvidence.recurrenceCanonicalEligibilityAtDue !== true ||
      browserEvidence.eligibilityRefreshAndSecondBrowser !== true ||
      browserEvidence.foreignQueueCannotEnable !== true ||
      browserEvidence.staleTerminalQueueCannotEnable !== true ||
      browserEvidence.earlyDelayedCommandsFailClosed !== true ||
      browserEvidence.stateMachineMatrixPairs !== 112 ||
      browserEvidence.stateMachineMatrixResult !== "passed" ||
      browserEvidence.rawLearnerBodyInEvidence !== false || browserEvidence.providerCalls !== 0) {
      throw new Error(`C3R-P browser evidence cycle ${input.cycle} is incomplete.`);
    }
    await stopAndDiscardNext(server);
    server = null;
    stopSupabase(input.repositoryRoot, cycleRoot);
    const oraclePath = path.join(cycleRoot, "oracle-metadata.json");
    oracle = runInstalledOracle({
      repositoryRoot: input.repositoryRoot,
      evidencePath: oraclePath,
      context: {
        containerName: `inverge-c3r-p-oracle-${input.runId}-${input.runAttempt}-${input.cycle}`,
        headSha: input.headSha,
        runId: input.runId,
        runAttempt: input.runAttempt,
      },
    });
    return {
      cycle: input.cycle,
      receiptId: crypto.randomUUID(),
      databaseIdentity: projectId,
      containerIdentity: databaseContainer,
      volumeIdentity: `supabase_db_${projectId}`,
      migrationCount: 26,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      browserToPostgres: true,
      restartRestore: true,
      exportDelete: true,
      reopenedCompletion: true,
      planBlockCompletion: true,
      completeLearnerExport: true,
      transferTaskClosure: true,
      planBlockStateClosure: true,
      planProjectionClosure: true,
      deleteMutationSerialization: true,
      deleteWinsBothLockOrders: true,
      proposedPlanTerminalization: true,
      assistedD1History: true,
      assistedD1Rescheduling: true,
      delayedReviewEligibility: true,
      stateMachineMatrixPairs: 112,
      stateMachineMatrixResult: "passed",
      oracleEvidenceSha256: oracle.sha256,
      cleanup: "complete",
    };
  } finally {
    await stopAndDiscardNext(server);
    stopSupabase(input.repositoryRoot, cycleRoot);
    fs.rmSync(cycleRoot, { recursive: true, force: true });
  }
}

const C3R_T_BROWSER_ASSERTIONS = Object.freeze([
  "browserToPostgres", "directRpcForgedProofDenied", "directRpcCrossTargetPassDenied",
  "nonEvidenceRetryIdempotent", "theoryProofClaimEvaluationPersisted",
  "exactFailureStateReasonPersisted", "todayAndFullDay", "d1AssistanceRescheduled",
  "earlyD1UiSuppressed", "earlyD7UiSuppressed", "earlyRecurrenceUiSuppressed",
  "earlyReopenedUiSuppressed", "preDuePlanUiSuppressed", "terminalPlanUiSuppressed",
  "sealedD7Transfer", "timedRecurrence", "laterFailureReopen",
  "postReopenIndependentCompletion", "crossUserTheoryRestoreCamouflaged",
  "crossSubjectPracticeRestoreCamouflaged", "ownerOnly", "restartRestore",
  "completeLearnerExport", "theoryDeletePreservesPractice", "restoreExportDelete",
]);
const C3R_T_BROWSER_EVIDENCE_KEYS = Object.freeze([
  "schemaVersion", ...C3R_T_BROWSER_ASSERTIONS, "rawLearnerBodyInEvidence", "providerCalls",
  "cleanupReady",
]);
const C3R_T_PRACTICE_COMPATIBILITY_ASSERTIONS = Object.freeze([
  "browserToPostgres", "practiceVertical", "plannerCreateDecide", "d1", "d7",
  "recurrence", "reopen", "restoreDashboard", "completeLearnerExport", "delete",
  "negativeValidatorDenied", "practiceExportExcludesTheory", "practiceDeletePreservesTheory",
]);

function validateTheoryBrowserEvidence(evidence) {
  exactKeys(evidence, C3R_T_BROWSER_EVIDENCE_KEYS, "C3R-T browser evidence");
  if (!evidence || typeof evidence !== "object" || evidence.schemaVersion !==
      "inverge.c3r_t.browser_metadata.v1" || evidence.rawLearnerBodyInEvidence !== false ||
    evidence.providerCalls !== 0 || C3R_T_BROWSER_ASSERTIONS.some((key) => evidence[key] !== true) ||
    evidence.cleanupReady !== true) {
    throw new Error("C3R-T browser-to-Postgres evidence is incomplete or non-metadata-only.");
  }
  return evidence;
}

function validateTheoryPracticeCompatibilityEvidence(evidence) {
  exactKeys(evidence, [
    "schemaVersion", ...C3R_T_PRACTICE_COMPATIBILITY_ASSERTIONS,
    "rawLearnerBodyInEvidence", "providerCalls",
  ], "C3R-T Practice compatibility evidence");
  if (evidence.schemaVersion !== "inverge.c3r_t.practice_compatibility_metadata.v1" ||
    evidence.rawLearnerBodyInEvidence !== false || evidence.providerCalls !== 0 ||
    C3R_T_PRACTICE_COMPATIBILITY_ASSERTIONS.some((key) => evidence[key] !== true)) {
    throw new Error("C3R-T Practice compatibility evidence is incomplete or non-metadata-only.");
  }
  return evidence;
}

async function runTheoryDedicatedCycle(input) {
  const projectId = `c3r-t-cycle-${input.cycle}-${input.runId}-${input.runAttempt}`;
  const cycleRoot = path.join(input.runtimeRoot, `cycle-${input.cycle}`);
  const browserEvidencePath = path.join(cycleRoot, "browser-metadata.json");
  const practiceCompatibilityEvidencePath = path.join(
    cycleRoot,
    "practice-compatibility-metadata.json",
  );
  let server;
  try {
    prepareTheoryCycle(input.repositoryRoot, cycleRoot, projectId);
    supabase(input.repositoryRoot, ["start", "--workdir", cycleRoot, "--exclude",
      EXCLUDED_SUPABASE_SERVICES.join(","), "--output", "json", "--yes"], {
      label: `C3R-T Supabase cycle ${input.cycle} start`,
    });
    const status = parseStatus(supabase(input.repositoryRoot,
      ["status", "--workdir", cycleRoot, "--output", "json"], {
        label: "C3R-T Supabase status",
      }));
    const apiUrl = statusValue(status, ["API_URL", "api_url"]);
    const anonKey = statusValue(status,
      ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"]);
    const serviceRoleKey = statusValue(status,
      ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"]);
    const databaseContainer = `supabase_db_${projectId}`;
    assertExternalMigrationSubstrate(databaseContainer);
    applyExactMigrationHistory(cycleRoot, databaseContainer);
    const identities = [
      await createTheoryIdentity(apiUrl, anonKey, `owner-a-${input.cycle}`),
      await createTheoryIdentity(apiUrl, anonKey, `owner-b-${input.cycle}`),
      await createTheoryIdentity(apiUrl, anonKey, `non-owner-${input.cycle}`),
    ];
    seedTheoryIdentityRelations(databaseContainer, identities);
    const {
      practiceWrapperArgumentNamesPreserved,
      theoryPostgrestArgumentNamesBound,
    } = applyTheoryMigrationHistory(
      cycleRoot,
      databaseContainer,
      identities[0],
    );
    theoryDatabaseSecurity(databaseContainer);
    await verifyDirectBoundaries(apiUrl, anonKey, identities[0]);
    const nextEnv = {
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      ALPHA_INVITE_EMAILS: identities.map((identity) => identity.email).join(","),
      ALPHA_ADMIN_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_T_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_PRACTICE_ENABLED: "true",
      WCV_C3R_T_THEORY_ENABLED: "true",
      C3R_P_LOCAL_EVIDENCE_MODE: "true",
      C3R_T_LOCAL_EVIDENCE_MODE: "true",
      VERCEL_ENV: "preview",
    };
    const secretValues = [apiUrl, anonKey, serviceRoleKey,
      ...identities.flatMap((identity) => [identity.email, identity.password, identity.accessToken])];
    const startFor = (label, env = nextEnv) => startNext(
      input.repositoryRoot,
      3210 + input.cycle,
      env,
      path.join(cycleRoot, `next-${label}.log`),
      secretValues,
    );

    server = await startFor("journey");
    await runTheoryBrowserWithClosedDiagnostic({
      repositoryRoot: input.repositoryRoot, server, identities, browserEvidencePath,
      practiceCompatibilityEvidencePath, databaseContainer, browserMode: "journey",
      failureStagePath: path.join(cycleRoot, "browser-stage-journey.json"),
    });
    await stopAndDiscardNext(server);
    server = null;

    server = await startFor("restart-restore");
    await runTheoryBrowserWithClosedDiagnostic({
      repositoryRoot: input.repositoryRoot, server, identities, browserEvidencePath,
      practiceCompatibilityEvidencePath, databaseContainer, browserMode: "restore",
      failureStagePath: path.join(cycleRoot, "browser-stage-restore.json"),
    });
    await stopAndDiscardNext(server);
    server = null;

    if (input.cycle === 1) {
      server = await startFor("feature-off", { ...nextEnv, WCV_C3R_T_THEORY_ENABLED: "false" });
      await runTheoryBrowserWithClosedDiagnostic({
        repositoryRoot: input.repositoryRoot, server, identities, browserEvidencePath,
        practiceCompatibilityEvidencePath, databaseContainer, browserMode: "feature_off",
        failureStagePath: path.join(cycleRoot, "browser-stage-feature_off.json"),
      });
      await stopAndDiscardNext(server);
      server = null;
      server = await startFor("production-denied", { ...nextEnv, VERCEL_ENV: "production" });
      await runTheoryBrowserWithClosedDiagnostic({
        repositoryRoot: input.repositoryRoot, server, identities, browserEvidencePath,
        practiceCompatibilityEvidencePath, databaseContainer, browserMode: "production_denied",
        failureStagePath: path.join(cycleRoot, "browser-stage-production_denied.json"),
      });
      await stopAndDiscardNext(server);
      server = null;
    }
    const browserEvidence = validateTheoryBrowserEvidence(
      JSON.parse(fs.readFileSync(browserEvidencePath, "utf8")),
    );
    const practiceCompatibilityEvidence = validateTheoryPracticeCompatibilityEvidence(
      JSON.parse(fs.readFileSync(practiceCompatibilityEvidencePath, "utf8")),
    );
    return {
      cycle: input.cycle,
      receiptId: crypto.randomUUID(),
      databaseIdentity: projectId,
      containerIdentity: databaseContainer,
      migrationCount: 28,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      browserEvidenceSha256: sha256(Buffer.from(canonicalJson(browserEvidence), "utf8")),
      practiceCompatibilityEvidenceSha256: sha256(Buffer.from(
        canonicalJson(practiceCompatibilityEvidence),
        "utf8",
      )),
      browserToPostgres: true,
      restartRestore: true,
      restoreExportDelete: true,
      hostileDirectRpcDenied: true,
      legacyPracticePlannerReceiptReplay: true,
      practiceCompatibilityPreserved: practiceCompatibilityEvidence.practiceVertical,
      practiceWrapperArgumentNamesPreserved,
      theoryPostgrestArgumentNamesBound,
      cleanup: "complete",
    };
  } finally {
    await stopAndDiscardNext(server);
    stopSupabase(input.repositoryRoot, cycleRoot);
    fs.rmSync(cycleRoot, { recursive: true, force: true });
  }
}

const C3R_L_BROWSER_ASSERTIONS = Object.freeze([
  "browserToPostgres", "directRpcForgedProofDenied", "directRpcCrossTargetPassDenied",
  "nonEvidenceRetryIdempotent", "lawProofClaimEvaluationPersisted",
  "exactFailureStateReasonPersisted", "todayAndFullDay", "d1AssistanceRescheduled",
  "earlyD1UiSuppressed", "earlyD7UiSuppressed", "earlyRecurrenceUiSuppressed",
  "earlyReopenedUiSuppressed", "preDuePlanUiSuppressed", "terminalPlanUiSuppressed",
  "sealedD7Transfer", "timedRecurrence", "laterFailureReopen",
  "postReopenIndependentCompletion", "crossUserLawRestoreCamouflaged",
  "crossSubjectPracticeRestoreCamouflaged", "theoryDurableCompatibility",
  "theoryDeletePreservesPracticeAndLaw", "ownerOnly", "restartRestore",
  "completeLearnerExport", "lawDeletePreservesPractice", "lawDeletePreservesTheory",
  "restoreExportDelete",
]);
const C3R_L_BROWSER_EVIDENCE_KEYS = Object.freeze([
  "schemaVersion", ...C3R_L_BROWSER_ASSERTIONS, "rawLearnerBodyInEvidence", "providerCalls",
  "cleanupReady",
]);
const C3R_L_PRACTICE_COMPATIBILITY_ASSERTIONS = Object.freeze([
  "browserToPostgres", "practiceVertical", "plannerCreateDecide", "d1", "d7",
  "recurrence", "reopen", "restoreDashboard", "completeLearnerExport",
  "practiceExportExcludesLaw", "practiceExportExcludesTheory", "delete",
  "practiceDeletePreservesLaw", "practiceDeletePreservesTheory", "negativeValidatorDenied",
]);

function validateLawBrowserEvidence(evidence) {
  exactKeys(evidence, C3R_L_BROWSER_EVIDENCE_KEYS, "C3R-L browser evidence");
  if (!evidence || typeof evidence !== "object" || evidence.schemaVersion !==
      "inverge.c3r_l.browser_metadata.v1" || evidence.rawLearnerBodyInEvidence !== false ||
    evidence.providerCalls !== 0 || C3R_L_BROWSER_ASSERTIONS.some((key) => evidence[key] !== true) ||
    evidence.cleanupReady !== true) {
    throw new Error("C3R-L browser-to-Postgres evidence is incomplete or non-metadata-only.");
  }
  return evidence;
}

function validateLawPracticeCompatibilityEvidence(evidence) {
  exactKeys(evidence, [
    "schemaVersion", ...C3R_L_PRACTICE_COMPATIBILITY_ASSERTIONS,
    "rawLearnerBodyInEvidence", "providerCalls",
  ], "C3R-L Practice compatibility evidence");
  if (evidence.schemaVersion !== "inverge.c3r_l.practice_compatibility_metadata.v1" ||
    evidence.rawLearnerBodyInEvidence !== false || evidence.providerCalls !== 0 ||
    C3R_L_PRACTICE_COMPATIBILITY_ASSERTIONS.some((key) => evidence[key] !== true)) {
    throw new Error("C3R-L Practice compatibility evidence is incomplete or non-metadata-only.");
  }
  return evidence;
}

async function runLawDedicatedCycle(input) {
  const projectId = `c3r-l-cycle-${input.cycle}-${input.runId}-${input.runAttempt}`;
  const cycleRoot = path.join(input.runtimeRoot, `cycle-${input.cycle}`);
  const browserEvidencePath = path.join(cycleRoot, "browser-metadata.json");
  const practiceCompatibilityEvidencePath = path.join(
    cycleRoot,
    "practice-compatibility-metadata.json",
  );
  let server;
  try {
    prepareLawCycle(input.repositoryRoot, cycleRoot, projectId);
    supabase(input.repositoryRoot, ["start", "--workdir", cycleRoot, "--exclude",
      EXCLUDED_SUPABASE_SERVICES.join(","), "--output", "json", "--yes"], {
      label: `C3R-L Supabase cycle ${input.cycle} start`,
      reportOutput: true,
    });
    const status = parseStatus(supabase(input.repositoryRoot,
      ["status", "--workdir", cycleRoot, "--output", "json"], {
        label: "C3R-L Supabase status",
      }));
    const apiUrl = statusValue(status, ["API_URL", "api_url"]);
    const anonKey = statusValue(status,
      ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"]);
    const serviceRoleKey = statusValue(status,
      ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"]);
    const databaseContainer = `supabase_db_${projectId}`;
    assertExternalMigrationSubstrate(databaseContainer);
    applyExactMigrationHistory(cycleRoot, databaseContainer);
    const identities = [
      await createLawIdentity(apiUrl, anonKey, `owner-a-${input.cycle}`),
      await createLawIdentity(apiUrl, anonKey, `owner-b-${input.cycle}`),
      await createLawIdentity(apiUrl, anonKey, `non-owner-${input.cycle}`),
    ];
    seedLawIdentityRelations(databaseContainer, identities);
    const migrationResult = applyLawMigrationHistory(
      cycleRoot,
      databaseContainer,
      identities[0],
    );
    lawDatabaseSecurity(databaseContainer);
    await verifyDirectBoundaries(apiUrl, anonKey, identities[0]);
    const nextEnv = {
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      ALPHA_INVITE_EMAILS: identities.map((identity) => identity.email).join(","),
      ALPHA_ADMIN_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_T_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_L_OWNER_EMAILS: identities.slice(0, 2).map((identity) => identity.email).join(","),
      WCV_C3R_P_PRACTICE_ENABLED: "true",
      WCV_C3R_T_THEORY_ENABLED: "true",
      WCV_C3R_L_LAW_ENABLED: "true",
      C3R_P_LOCAL_EVIDENCE_MODE: "true",
      C3R_T_LOCAL_EVIDENCE_MODE: "true",
      C3R_L_LOCAL_EVIDENCE_MODE: "true",
      VERCEL_ENV: "preview",
    };
    const secretValues = [apiUrl, anonKey, serviceRoleKey,
      ...identities.flatMap((identity) => [identity.email, identity.password, identity.accessToken])];
    const startFor = (label, env = nextEnv) => startNext(
      input.repositoryRoot,
      3220 + input.cycle,
      env,
      path.join(cycleRoot, `next-${label}.log`),
      secretValues,
    );

    const runMode = async (label, browserMode, env = nextEnv) => {
      server = await startFor(label, env);
      await runLawBrowserWithClosedDiagnostic({
        repositoryRoot: input.repositoryRoot, server, identities, browserEvidencePath,
        practiceCompatibilityEvidencePath, databaseContainer, browserMode,
        failureStagePath: path.join(cycleRoot, `browser-stage-${browserMode}.json`),
      });
      await stopAndDiscardNext(server);
      server = null;
    };
    await runMode("journey", "journey");
    await runMode("restart-restore", "restore");
    if (input.cycle === 1) {
      await runMode("feature-off", "feature_off", {
        ...nextEnv, WCV_C3R_L_LAW_ENABLED: "false",
      });
      await runMode("production-denied", "production_denied", {
        ...nextEnv, VERCEL_ENV: "production",
      });
    }
    const browserEvidence = validateLawBrowserEvidence(
      JSON.parse(fs.readFileSync(browserEvidencePath, "utf8")),
    );
    const practiceCompatibilityEvidence = validateLawPracticeCompatibilityEvidence(
      JSON.parse(fs.readFileSync(practiceCompatibilityEvidencePath, "utf8")),
    );
    return {
      cycle: input.cycle,
      receiptId: crypto.randomUUID(),
      databaseIdentity: projectId,
      containerIdentity: databaseContainer,
      migrationCount: 30,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      browserEvidenceSha256: sha256(Buffer.from(canonicalJson(browserEvidence), "utf8")),
      practiceCompatibilityEvidenceSha256: sha256(Buffer.from(
        canonicalJson(practiceCompatibilityEvidence),
        "utf8",
      )),
      browserToPostgres: true,
      restartRestore: true,
      restoreExportDelete: true,
      hostileDirectRpcDenied: true,
      legacyPracticePlannerReceiptReplay: true,
      practiceCompatibilityPreserved: practiceCompatibilityEvidence.practiceVertical &&
        practiceCompatibilityEvidence.practiceDeletePreservesLaw &&
        practiceCompatibilityEvidence.practiceDeletePreservesTheory,
      theoryCompatibilityPreserved: browserEvidence.theoryDurableCompatibility &&
        browserEvidence.theoryDeletePreservesPracticeAndLaw &&
        browserEvidence.lawDeletePreservesTheory,
      practiceWrapperArgumentNamesPreserved:
        migrationResult.practiceWrapperArgumentNamesPreserved,
      theoryWrapperArgumentNamesPreserved:
        migrationResult.theoryWrapperArgumentNamesPreserved,
      lawPostgrestArgumentNamesBound: migrationResult.lawPostgrestArgumentNamesBound,
      cleanup: "complete",
    };
  } finally {
    await stopAndDiscardNext(server);
    stopSupabase(input.repositoryRoot, cycleRoot);
    fs.rmSync(cycleRoot, { recursive: true, force: true });
  }
}

export function createTheoryRuntimeArtifact(input) {
  const base = {
    schemaVersion: "inverge.wcv_c3r_t.theory_runtime.v1",
    artifactKind: "THEORY_RUNTIME",
    artifactRef: "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1",
    browserToPostgresEvidenceRef:
      "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#browser-to-postgres",
    practiceCompatibilityEvidenceRef:
      "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#practice-compatibility",
    candidateHead: input.candidateHead,
    candidateTree: input.candidateTree,
    migrationIdentities: input.migrationIdentities,
    resetReplayCycles: input.resetReplayCycles,
    security: {
      rls: "enabled_and_forced",
      serviceOnlyMutation: "verified",
      crossUser: "denied_both_directions",
      subjectIdentity: "PRACTICE_AND_THEORY_CLOSED",
      databaseAuthoritativeTheoryProof: true,
    },
    featureBoundary: {
      defaultOff: true, ownerOnly: true, productionDenied: true,
    },
    mutationBoundary: {
      remoteSupabase: 0, production: 0, providerCalls: 0,
    },
  };
  return { ...base, artifactSha256: sha256(Buffer.from(canonicalJson(base), "utf8")) };
}

function theoryHeadMigrationIdentities(repositoryRoot, headSha) {
  return [C3R_T_ENUM_MIGRATION_PATH, C3R_T_INTEGRATION_MIGRATION_PATH]
    .map((migrationPath) => {
      const committedBytes = execFileSync("git", [
        "--no-replace-objects", "show", `${headSha}:${migrationPath}`,
      ], { cwd: repositoryRoot });
      const diskBytes = fs.readFileSync(path.join(repositoryRoot, migrationPath));
      if (!diskBytes.equals(committedBytes)) {
        throw new Error(`C3R-T migration worktree bytes drifted from ${headSha}:${migrationPath}.`);
      }
      return { path: migrationPath, sha256: sha256(committedBytes) };
    });
}

function lawHeadMigrationIdentities(repositoryRoot, headSha) {
  return [C3R_L_ENUM_MIGRATION_PATH, C3R_L_INTEGRATION_MIGRATION_PATH]
    .map((migrationPath) => {
      const committedBytes = execFileSync("git", [
        "--no-replace-objects", "show", `${headSha}:${migrationPath}`,
      ], { cwd: repositoryRoot });
      const diskBytes = fs.readFileSync(path.join(repositoryRoot, migrationPath));
      if (!diskBytes.equals(committedBytes)) {
        throw new Error(`C3R-L migration worktree bytes drifted from ${headSha}:${migrationPath}.`);
      }
      return { path: migrationPath, sha256: sha256(committedBytes) };
    });
}

export function createLawRuntimeArtifact(input) {
  const base = {
    schemaVersion: "inverge.wcv_c3r_l.law_runtime.v1",
    artifactKind: "LAW_RUNTIME",
    artifactRef: "LAW_RUNTIME:c3r-l-law-durable-learning-v1",
    browserToPostgresEvidenceRef:
      "LAW_RUNTIME:c3r-l-law-durable-learning-v1#browser-to-postgres",
    predecessorCompatibilityEvidenceRef:
      "LAW_RUNTIME:c3r-l-law-durable-learning-v1#predecessor-compatibility",
    candidateHead: input.candidateHead,
    candidateTree: input.candidateTree,
    migrationIdentities: input.migrationIdentities,
    resetReplayCycles: input.resetReplayCycles,
    security: {
      rls: "enabled_and_forced",
      serviceOnlyMutation: "verified",
      crossUser: "denied_both_directions",
      subjectIdentity: "PRACTICE_THEORY_AND_LAW_CLOSED",
      databaseAuthoritativeLawProof: true,
      practiceCompatibility: true,
      theoryCompatibility: true,
    },
    featureBoundary: {
      defaultOff: true, ownerOnly: true, productionDenied: true,
    },
    mutationBoundary: {
      remoteSupabase: 0, production: 0, providerCalls: 0,
    },
  };
  return { ...base, artifactSha256: sha256(Buffer.from(canonicalJson(base), "utf8")) };
}

export function validateLawRuntimeArtifact(artifact, repositoryRoot = process.cwd()) {
  exactKeys(artifact, [
    "schemaVersion", "artifactKind", "artifactRef", "browserToPostgresEvidenceRef",
    "predecessorCompatibilityEvidenceRef", "candidateHead", "candidateTree",
    "migrationIdentities", "resetReplayCycles", "security", "featureBoundary",
    "mutationBoundary", "artifactSha256",
  ], "LAW_RUNTIME artifact");
  if (artifact.schemaVersion !== "inverge.wcv_c3r_l.law_runtime.v1" ||
    artifact.artifactKind !== "LAW_RUNTIME" ||
    artifact.artifactRef !== "LAW_RUNTIME:c3r-l-law-durable-learning-v1" ||
    artifact.browserToPostgresEvidenceRef !==
      "LAW_RUNTIME:c3r-l-law-durable-learning-v1#browser-to-postgres" ||
    artifact.predecessorCompatibilityEvidenceRef !==
      "LAW_RUNTIME:c3r-l-law-durable-learning-v1#predecessor-compatibility" ||
    !SHA40.test(artifact.candidateHead) || !SHA40.test(artifact.candidateTree) ||
    !SHA64.test(artifact.artifactSha256)) {
    throw new Error("LAW_RUNTIME artifact is invalid.");
  }
  const resolvedCandidateHead = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${artifact.candidateHead}^{commit}`,
  ]);
  const resolvedCandidateTree = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${resolvedCandidateHead}^{tree}`,
  ]);
  if (resolvedCandidateHead !== artifact.candidateHead ||
    resolvedCandidateTree !== artifact.candidateTree) {
    throw new Error("LAW_RUNTIME artifact candidate head/tree Git objects are mismatched.");
  }
  if (process.env.PR_HEAD_SHA) {
    const expectedHead = process.env.PR_HEAD_SHA.toLowerCase();
    if (artifact.candidateHead !== expectedHead || git(repositoryRoot, [
      "--no-replace-objects", "rev-parse", "--verify", "HEAD^{commit}",
    ]) !== expectedHead) {
      throw new Error("LAW_RUNTIME artifact is not bound to the exact checked-out head/tree.");
    }
  }
  const exactMigrationPaths = [C3R_L_ENUM_MIGRATION_PATH, C3R_L_INTEGRATION_MIGRATION_PATH];
  if (!Array.isArray(artifact.migrationIdentities) ||
    artifact.migrationIdentities.length !== exactMigrationPaths.length) {
    throw new Error("LAW_RUNTIME migration identities are invalid.");
  }
  for (const [index, identity] of artifact.migrationIdentities.entries()) {
    exactKeys(identity, ["path", "sha256"], `LAW_RUNTIME migration identity ${index + 1}`);
    const expectedPath = exactMigrationPaths[index];
    const committedBytes = execFileSync("git", [
      "--no-replace-objects", "show", `${resolvedCandidateHead}:${expectedPath}`,
    ], { cwd: repositoryRoot });
    const diskBytes = fs.readFileSync(path.join(repositoryRoot, expectedPath));
    if (identity.path !== expectedPath || identity.sha256 !== sha256(committedBytes) ||
      !diskBytes.equals(committedBytes)) {
      throw new Error("LAW_RUNTIME migration identities do not match the closed ordered head files.");
    }
  }
  if (new Set(artifact.migrationIdentities.map((identity) => identity.path)).size !== 2 ||
    !Array.isArray(artifact.resetReplayCycles) || artifact.resetReplayCycles.length !== 2) {
    throw new Error("LAW_RUNTIME artifact is invalid.");
  }
  const cycleIdentityKeys = ["receiptId", "databaseIdentity", "containerIdentity"];
  let executionIdentity = null;
  for (const [index, cycle] of artifact.resetReplayCycles.entries()) {
    exactKeys(cycle, [
      "cycle", "receiptId", "databaseIdentity", "containerIdentity", "migrationCount",
      "serverVersionNum", "browserEvidenceSha256", "practiceCompatibilityEvidenceSha256",
      "browserToPostgres", "restartRestore", "restoreExportDelete", "hostileDirectRpcDenied",
      "legacyPracticePlannerReceiptReplay", "practiceCompatibilityPreserved",
      "theoryCompatibilityPreserved", "practiceWrapperArgumentNamesPreserved",
      "theoryWrapperArgumentNamesPreserved", "lawPostgrestArgumentNamesBound", "cleanup",
    ], `LAW_RUNTIME reset/replay cycle ${index + 1}`);
    const identityMatch = new RegExp(`^c3r-l-cycle-${index + 1}-(\\d+)-(\\d+)$`, "u")
      .exec(cycle.databaseIdentity);
    if (cycle.cycle !== index + 1 || cycle.migrationCount !== 30 ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM || !UUID.test(cycle.receiptId) ||
      !SHA64.test(cycle.browserEvidenceSha256) ||
      !SHA64.test(cycle.practiceCompatibilityEvidenceSha256) || !identityMatch ||
      cycle.containerIdentity !== `supabase_db_${cycle.databaseIdentity}` ||
      cycle.browserToPostgres !== true || cycle.restartRestore !== true ||
      cycle.restoreExportDelete !== true || cycle.hostileDirectRpcDenied !== true ||
      cycle.legacyPracticePlannerReceiptReplay !== true ||
      cycle.practiceCompatibilityPreserved !== true ||
      cycle.theoryCompatibilityPreserved !== true ||
      cycle.practiceWrapperArgumentNamesPreserved !== true ||
      cycle.theoryWrapperArgumentNamesPreserved !== true ||
      cycle.lawPostgrestArgumentNamesBound !== true || cycle.cleanup !== "complete") {
      throw new Error(`LAW_RUNTIME reset/replay cycle ${index + 1} is invalid.`);
    }
    const currentExecutionIdentity = `${identityMatch[1]}:${identityMatch[2]}`;
    executionIdentity ??= currentExecutionIdentity;
    if (executionIdentity !== currentExecutionIdentity) {
      throw new Error("LAW_RUNTIME reset/replay cycles do not share one execution identity.");
    }
  }
  for (const key of cycleIdentityKeys) {
    if (artifact.resetReplayCycles[0][key] === artifact.resetReplayCycles[1][key]) {
      throw new Error(`LAW_RUNTIME reset/replay cycles reused ${key}.`);
    }
  }
  exactKeys(artifact.security, [
    "rls", "serviceOnlyMutation", "crossUser", "subjectIdentity",
    "databaseAuthoritativeLawProof", "practiceCompatibility", "theoryCompatibility",
  ], "LAW_RUNTIME security");
  exactKeys(artifact.featureBoundary, [
    "defaultOff", "ownerOnly", "productionDenied",
  ], "LAW_RUNTIME feature boundary");
  exactKeys(artifact.mutationBoundary, [
    "remoteSupabase", "production", "providerCalls",
  ], "LAW_RUNTIME mutation boundary");
  if (artifact.security.rls !== "enabled_and_forced" ||
    artifact.security.serviceOnlyMutation !== "verified" ||
    artifact.security.crossUser !== "denied_both_directions" ||
    artifact.security.subjectIdentity !== "PRACTICE_THEORY_AND_LAW_CLOSED" ||
    artifact.security.databaseAuthoritativeLawProof !== true ||
    artifact.security.practiceCompatibility !== true ||
    artifact.security.theoryCompatibility !== true ||
    artifact.featureBoundary.defaultOff !== true || artifact.featureBoundary.ownerOnly !== true ||
    artifact.featureBoundary.productionDenied !== true ||
    canonicalJson(artifact.mutationBoundary) !== canonicalJson({
      remoteSupabase: 0, production: 0, providerCalls: 0,
    })) {
    throw new Error("LAW_RUNTIME artifact is invalid.");
  }
  const { artifactSha256, ...base } = artifact;
  if (sha256(Buffer.from(canonicalJson(base), "utf8")) !== artifactSha256) {
    throw new Error("LAW_RUNTIME artifact digest is invalid.");
  }
  return artifact;
}

export function validateTheoryRuntimeArtifact(artifact, repositoryRoot = process.cwd()) {
  exactKeys(artifact, [
    "schemaVersion", "artifactKind", "artifactRef", "browserToPostgresEvidenceRef",
    "practiceCompatibilityEvidenceRef", "candidateHead", "candidateTree",
    "migrationIdentities", "resetReplayCycles", "security", "featureBoundary",
    "mutationBoundary", "artifactSha256",
  ], "THEORY_RUNTIME artifact");
  if (
    artifact.schemaVersion !== "inverge.wcv_c3r_t.theory_runtime.v1" ||
    artifact.artifactKind !== "THEORY_RUNTIME" ||
    artifact.artifactRef !== "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1" ||
    artifact.browserToPostgresEvidenceRef !==
      "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#browser-to-postgres" ||
    artifact.practiceCompatibilityEvidenceRef !==
      "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#practice-compatibility" ||
    !SHA40.test(artifact.candidateHead) || !SHA40.test(artifact.candidateTree) ||
    !SHA64.test(artifact.artifactSha256)) {
    throw new Error("THEORY_RUNTIME artifact is invalid.");
  }
  const resolvedCandidateHead = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${artifact.candidateHead}^{commit}`,
  ]);
  const resolvedCandidateTree = git(repositoryRoot, [
    "--no-replace-objects", "rev-parse", "--verify", `${resolvedCandidateHead}^{tree}`,
  ]);
  if (resolvedCandidateHead !== artifact.candidateHead ||
    resolvedCandidateTree !== artifact.candidateTree) {
    throw new Error("THEORY_RUNTIME artifact candidate head/tree Git objects are mismatched.");
  }
  if (process.env.PR_HEAD_SHA) {
    const expectedHead = process.env.PR_HEAD_SHA.toLowerCase();
    if (artifact.candidateHead !== expectedHead || git(repositoryRoot, [
      "--no-replace-objects", "rev-parse", "--verify", "HEAD^{commit}",
    ]) !== expectedHead) {
      throw new Error("THEORY_RUNTIME artifact is not bound to the exact checked-out head/tree.");
    }
  }
  if (!Array.isArray(artifact.migrationIdentities) ||
    artifact.migrationIdentities.length !== 2) {
    throw new Error("THEORY_RUNTIME migration identities are invalid.");
  }
  const exactMigrationPaths = [C3R_T_ENUM_MIGRATION_PATH, C3R_T_INTEGRATION_MIGRATION_PATH];
  for (const [index, identity] of artifact.migrationIdentities.entries()) {
    exactKeys(identity, ["path", "sha256"], `THEORY_RUNTIME migration identity ${index + 1}`);
    const expectedPath = exactMigrationPaths[index];
    const committedBytes = execFileSync("git", [
      "--no-replace-objects", "show", `${resolvedCandidateHead}:${expectedPath}`,
    ], { cwd: repositoryRoot });
    const diskBytes = fs.readFileSync(path.join(repositoryRoot, expectedPath));
    if (identity.path !== expectedPath || identity.sha256 !== sha256(committedBytes) ||
      !diskBytes.equals(committedBytes)) {
      throw new Error("THEORY_RUNTIME migration identities do not match the closed ordered head files.");
    }
  }
  if (new Set(artifact.migrationIdentities.map((identity) => identity.path)).size !== 2 ||
    !Array.isArray(artifact.resetReplayCycles) || artifact.resetReplayCycles.length !== 2) {
    throw new Error("THEORY_RUNTIME artifact is invalid.");
  }
  const cycleIdentityKeys = ["receiptId", "databaseIdentity", "containerIdentity"];
  let executionIdentity = null;
  for (const [index, cycle] of artifact.resetReplayCycles.entries()) {
    exactKeys(cycle, [
      "cycle", "receiptId", "databaseIdentity", "containerIdentity", "migrationCount",
      "serverVersionNum", "browserEvidenceSha256", "practiceCompatibilityEvidenceSha256",
      "browserToPostgres", "restartRestore", "restoreExportDelete", "hostileDirectRpcDenied",
      "legacyPracticePlannerReceiptReplay", "practiceCompatibilityPreserved",
      "practiceWrapperArgumentNamesPreserved", "theoryPostgrestArgumentNamesBound", "cleanup",
    ], `THEORY_RUNTIME reset/replay cycle ${index + 1}`);
    const identityMatch = new RegExp(`^c3r-t-cycle-${index + 1}-(\\d+)-(\\d+)$`, "u")
      .exec(cycle.databaseIdentity);
    if (cycle.cycle !== index + 1 || cycle.migrationCount !== 28 ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM || !UUID.test(cycle.receiptId) ||
      !SHA64.test(cycle.browserEvidenceSha256) ||
      !SHA64.test(cycle.practiceCompatibilityEvidenceSha256) || !identityMatch ||
      cycle.containerIdentity !== `supabase_db_${cycle.databaseIdentity}` ||
      cycle.browserToPostgres !== true || cycle.restartRestore !== true ||
      cycle.restoreExportDelete !== true || cycle.hostileDirectRpcDenied !== true ||
      cycle.legacyPracticePlannerReceiptReplay !== true ||
      cycle.practiceCompatibilityPreserved !== true ||
      cycle.practiceWrapperArgumentNamesPreserved !== true ||
      cycle.theoryPostgrestArgumentNamesBound !== true || cycle.cleanup !== "complete") {
      throw new Error(`THEORY_RUNTIME reset/replay cycle ${index + 1} is invalid.`);
    }
    const currentExecutionIdentity = `${identityMatch[1]}:${identityMatch[2]}`;
    executionIdentity ??= currentExecutionIdentity;
    if (executionIdentity !== currentExecutionIdentity) {
      throw new Error("THEORY_RUNTIME reset/replay cycles do not share one execution identity.");
    }
  }
  for (const key of cycleIdentityKeys) {
    if (artifact.resetReplayCycles[0][key] === artifact.resetReplayCycles[1][key]) {
      throw new Error(`THEORY_RUNTIME reset/replay cycles reused ${key}.`);
    }
  }
  exactKeys(artifact.security, [
    "rls", "serviceOnlyMutation", "crossUser", "subjectIdentity",
    "databaseAuthoritativeTheoryProof",
  ], "THEORY_RUNTIME security");
  exactKeys(artifact.featureBoundary, [
    "defaultOff", "ownerOnly", "productionDenied",
  ], "THEORY_RUNTIME feature boundary");
  exactKeys(artifact.mutationBoundary, [
    "remoteSupabase", "production", "providerCalls",
  ], "THEORY_RUNTIME mutation boundary");
  if (artifact.security.rls !== "enabled_and_forced" ||
    artifact.security.serviceOnlyMutation !== "verified" ||
    artifact.security.crossUser !== "denied_both_directions" ||
    artifact.security.subjectIdentity !== "PRACTICE_AND_THEORY_CLOSED" ||
    artifact.security.databaseAuthoritativeTheoryProof !== true ||
    artifact.featureBoundary.defaultOff !== true || artifact.featureBoundary.ownerOnly !== true ||
    artifact.featureBoundary.productionDenied !== true ||
    canonicalJson(artifact.mutationBoundary) !== canonicalJson({
      remoteSupabase: 0, production: 0, providerCalls: 0,
    })) {
    throw new Error("THEORY_RUNTIME artifact is invalid.");
  }
  const { artifactSha256, ...base } = artifact;
  if (sha256(Buffer.from(canonicalJson(base), "utf8")) !== artifactSha256) {
    throw new Error("THEORY_RUNTIME artifact digest is invalid.");
  }
  return artifact;
}

async function runLawDedicated() {
  const repositoryRoot = process.cwd();
  const headSha = (process.env.PR_HEAD_SHA ?? "").toLowerCase();
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? "");
  if (!SHA40.test(headSha) || !/^\d+$/.test(runId) ||
    !Number.isSafeInteger(runAttempt) || runAttempt < 1) {
    throw new Error("C3R-L exact-head GitHub execution context is invalid.");
  }
  if (git(repositoryRoot, ["rev-parse", "HEAD"]) !== headSha) {
    throw new Error("C3R-L workflow checkout is not the exact PR head.");
  }
  validateC3RPMigrationAuthorityBinding(repositoryRoot, headSha);
  theoryHeadMigrationIdentities(repositoryRoot, headSha);
  const migrationIdentities = lawHeadMigrationIdentities(repositoryRoot, headSha);
  const runtimeRoot = boundedLawRuntimeRoot(repositoryRoot);
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const cycles = [];
  for (let cycle = 1; cycle <= 2; cycle += 1) {
    cycles.push(await runLawDedicatedCycle({
      cycle, repositoryRoot, runtimeRoot, headSha, runId, runAttempt,
    }));
  }
  const artifact = createLawRuntimeArtifact({
    candidateHead: headSha,
    candidateTree: git(repositoryRoot, ["show", "-s", "--format=%T", headSha]),
    migrationIdentities,
    resetReplayCycles: cycles,
  });
  validateLawRuntimeArtifact(artifact);
  const evidencePath = process.env.C3R_L_RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) throw new Error("C3R_L_RUNTIME_EVIDENCE_PATH is not set.");
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(artifact, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify({ status: "verified", artifactSha256: artifact.artifactSha256 }));
}

function cleanupLawDedicated() {
  const repositoryRoot = process.cwd();
  const root = boundedLawRuntimeRoot(repositoryRoot);
  for (const cycle of [1, 2]) {
    stopSupabase(repositoryRoot, path.join(root, `cycle-${cycle}`));
  }
  fs.rmSync(root, { recursive: true, force: true });
  console.log(JSON.stringify({ cleanup: "complete" }));
}

async function runTheoryDedicated() {
  const repositoryRoot = process.cwd();
  const headSha = (process.env.PR_HEAD_SHA ?? "").toLowerCase();
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? "");
  if (!SHA40.test(headSha) || !/^\d+$/.test(runId) ||
    !Number.isSafeInteger(runAttempt) || runAttempt < 1) {
    throw new Error("C3R-T exact-head GitHub execution context is invalid.");
  }
  if (git(repositoryRoot, ["rev-parse", "HEAD"]) !== headSha) {
    throw new Error("C3R-T workflow checkout is not the exact PR head.");
  }
  validateC3RPMigrationAuthorityBinding(repositoryRoot, headSha);
  const migrationIdentities = theoryHeadMigrationIdentities(repositoryRoot, headSha);
  const runtimeRoot = boundedTheoryRuntimeRoot(repositoryRoot);
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const cycles = [];
  for (let cycle = 1; cycle <= 2; cycle += 1) {
    cycles.push(await runTheoryDedicatedCycle({
      cycle, repositoryRoot, runtimeRoot, headSha, runId, runAttempt,
    }));
  }
  const artifact = createTheoryRuntimeArtifact({
    candidateHead: headSha,
    candidateTree: git(repositoryRoot, ["show", "-s", "--format=%T", headSha]),
    migrationIdentities,
    resetReplayCycles: cycles,
  });
  validateTheoryRuntimeArtifact(artifact);
  const evidencePath = process.env.C3R_T_RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) throw new Error("C3R_T_RUNTIME_EVIDENCE_PATH is not set.");
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(artifact, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify({ status: "verified", artifactSha256: artifact.artifactSha256 }));
}

function cleanupTheoryDedicated() {
  const repositoryRoot = process.cwd();
  const root = boundedTheoryRuntimeRoot(repositoryRoot);
  for (const cycle of [1, 2]) {
    stopSupabase(repositoryRoot, path.join(root, `cycle-${cycle}`));
  }
  fs.rmSync(root, { recursive: true, force: true });
  console.log(JSON.stringify({ cleanup: "complete" }));
}

async function runDedicated() {
  const repositoryRoot = process.cwd();
  const headSha = (process.env.PR_HEAD_SHA ?? "").toLowerCase();
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? "");
  if (!SHA40.test(headSha) || !/^\d+$/.test(runId) || !Number.isSafeInteger(runAttempt) || runAttempt < 1) {
    throw new Error("C3R-P exact-head GitHub execution context is invalid.");
  }
  if (git(repositoryRoot, ["rev-parse", "HEAD"]) !== headSha) {
    throw new Error("C3R-P workflow checkout is not the exact PR head.");
  }
  const headTree = git(repositoryRoot, ["show", "-s", "--format=%T", headSha]);
  const migrations = validateC3RPMigrationAuthorityBinding(repositoryRoot, headSha);
  const runtimeRoot = boundedRuntimeRoot(repositoryRoot);
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const cycles = [];
  for (let cycle = 1; cycle <= 2; cycle += 1) {
    cycles.push(await runDedicatedCycle({
      cycle, repositoryRoot, runtimeRoot, headSha, runId, runAttempt,
    }));
  }
  const appendBytes = execFileSync("git", ["show", `${headSha}:${C3R_P_APPEND_PATH}`], {
    cwd: repositoryRoot, encoding: "buffer",
  });
  const artifact = createPracticeRuntimeArtifact({
    candidateHead: headSha,
    candidateTree: headTree,
    migrationInventory: migrations,
    appendIdentity: {
      path: C3R_P_APPEND_PATH,
      gitBlob: git(repositoryRoot, ["rev-parse", `${headSha}:${C3R_P_APPEND_PATH}`]),
      sha256: sha256(appendBytes),
    },
    resetReplayCycles: cycles,
    oracle: { status: "verified", serverVersionNum: ORACLE_SERVER_VERSION_NUM, cycleEvidenceCount: 2 },
    security: {
      rls: "enabled_and_forced",
      anonymous: "denied",
      authenticatedDirectMutation: "denied",
      crossUser: "denied_both_directions",
      serviceOnlyMutation: "verified",
      subjectIdentity: "PRACTICE_ONLY",
    },
  }, repositoryRoot);
  validatePracticeRuntimeArtifact(artifact, repositoryRoot);
  const evidencePath = process.env.C3R_P_RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) throw new Error("C3R_P_RUNTIME_EVIDENCE_PATH is not set.");
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "verified", artifactSha256: artifact.artifactSha256 }));
}

function cleanupDedicated() {
  const repositoryRoot = process.cwd();
  const root = boundedRuntimeRoot(repositoryRoot);
  for (const cycle of [1, 2]) stopSupabase(repositoryRoot, path.join(root, `cycle-${cycle}`));
  fs.rmSync(root, { recursive: true, force: true });
  console.log(JSON.stringify({ cleanup: "complete" }));
}

function fail(message) {
  console.error(`wcv-c3r-p-runtime: ${message}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes("--c3r-l-dedicated")) {
      await runLawDedicated();
    } else if (process.argv.includes("--c3r-l-cleanup")) {
      cleanupLawDedicated();
    } else if (process.argv.includes("--verify-c3r-l-artifact")) {
      const artifactPath = process.env.C3R_L_RUNTIME_EVIDENCE_PATH;
      if (!artifactPath) throw new Error("C3R_L_RUNTIME_EVIDENCE_PATH is not set.");
      validateLawRuntimeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
      console.log(JSON.stringify({ status: "verified" }));
    } else if (process.argv.includes("--c3r-t-dedicated")) {
      await runTheoryDedicated();
    } else if (process.argv.includes("--c3r-t-cleanup")) {
      cleanupTheoryDedicated();
    } else if (process.argv.includes("--verify-c3r-t-artifact")) {
      const artifactPath = process.env.C3R_T_RUNTIME_EVIDENCE_PATH;
      if (!artifactPath) throw new Error("C3R_T_RUNTIME_EVIDENCE_PATH is not set.");
      validateTheoryRuntimeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
      console.log(JSON.stringify({ status: "verified" }));
    } else if (process.argv.includes("--dedicated")) {
      await runDedicated();
    } else if (process.argv.includes("--cleanup")) {
      cleanupDedicated();
    } else if (process.argv.includes("--verify-artifact")) {
      const artifactPath = process.env.C3R_P_RUNTIME_EVIDENCE_PATH;
      if (!artifactPath) throw new Error("C3R_P_RUNTIME_EVIDENCE_PATH is not set.");
      validatePracticeRuntimeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
      console.log(JSON.stringify({ status: "verified" }));
    } else {
      throw new Error("use the dedicated C3R-P workflow entry point or --verify-artifact.");
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
