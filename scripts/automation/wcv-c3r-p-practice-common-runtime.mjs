#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
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
const C3R_P_MIGRATION_AUTHORITY_PATH =
  "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json";
export const C3R_P_RUNTIME_SCHEMA_VERSION =
  "inverge.wcv_c3r_p.practice_runtime.v1";
export const C3R_P_RUNTIME_PRODUCER_VERSION =
  "wcv-c3r-p.practice-common-durable-runtime.v1";
export const C3R_P_NATIVE_SCHEMA_VERSION =
  "inverge.runtime_evidence.c3r_p.v1";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA64 = /^[0-9a-f]{64}$/;
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
      "exportDelete", "oracleEvidenceSha256", "cleanup",
    ], `reset/replay cycle ${index + 1}`);
    if (cycle.cycle !== index + 1 || cycle.migrationCount !== 26 ||
      cycle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
      cycle.browserToPostgres !== true || cycle.restartRestore !== true ||
      cycle.exportDelete !== true || cycle.cleanup !== "complete" ||
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
  return Array.isArray(riskResult?.changedFiles) &&
    riskResult.changedFiles.includes(C3R_P_APPEND_PATH) &&
    riskResult.changedFiles.includes(C3R_P_CONTRACT_PATH);
}

function git(repositoryRoot, args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

export function exactMigrationInventory(repositoryRoot, headSha = "HEAD") {
  const names = git(repositoryRoot, ["ls-tree", "-r", "--name-only", headSha, "--", "supabase/migrations"])
    .split(/\r?\n/).filter((name) => /^supabase\/migrations\/\d{8,14}_[a-z0-9_]+\.sql$/.test(name));
  if (names.length !== 26) throw new Error("effective migration inventory must contain exactly 26 paths.");
  return names.map((migrationPath) => ({
    path: migrationPath,
    sha256: sha256(Buffer.from(execFileSync("git", ["show", `${headSha}:${migrationPath}`], {
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
  if (spawnSync("git", ["merge-base", "--is-ancestor",
    binding.validatedAuthorityResultingMainSha, headSha], {
    cwd: repositoryRoot,
    stdio: "ignore",
  }).status !== 0) {
    throw new Error("C3R-P head does not descend from the validated authority merge.");
  }
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

function nativeDocker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    input: options.input,
    stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });
}

function removeNativeContainer(name) {
  nativeDocker(["rm", "--force", name]);
  const inspected = nativeDocker(["inspect", name]);
  return inspected.status !== 0;
}

function nativePsql(name, sql, allowFailure = false, stage = "assertion") {
  const result = nativeDocker(["exec", "--interactive", name, "psql", "--no-psqlrc", "--quiet",
    "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--username", "postgres",
    "--dbname", "postgres"], { input: sql });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`C3R-P native PostgreSQL ${stage} failed.`);
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
    if (catalog !== "150008|9|PRACTICE|f|f|t") {
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
  for (const name of fs.readdirSync(path.join(repositoryRoot, "supabase/migrations")).sort()) {
    if (/^\d{8,14}_[a-z0-9_]+\.sql$/.test(name)) {
      fs.copyFileSync(path.join(repositoryRoot, "supabase/migrations", name),
        path.join(cycleRoot, "c3r-p-migrations", name));
    }
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
  if (value !== "150008|9|1|1|f|f|f|t|t|postgres") {
    throw new Error("C3R-P catalog, grants, RLS, subject, owner, or PostgreSQL version is invalid.");
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
    },
    label: options.label,
    reportOutput: true,
  });
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
    await verifyDirectBoundaries(apiUrl, anonKey, identities[0]);
    const nextEnv = {
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
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
    const probe = (label, expectedClassification, entryActor, entryOnly = true) => runEntryProbe({
      repositoryRoot: input.repositoryRoot,
      server,
      identities,
      browserEvidencePath,
      diagnosticRoot,
      cycle: input.cycle,
      label,
      expectedClassification,
      entryActor,
      entryOnly,
    });

    server = await startFor("normal-entry");
    await probe("owner-positive", "C3R_P_ENTRY_VERIFIED", "owner");
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
      label: "C3R-P restart browser verification",
    });
    const browserEvidence = JSON.parse(fs.readFileSync(browserEvidencePath, "utf8"));
    if (browserEvidence.browserToPostgres !== true || browserEvidence.restartRestore !== true ||
      browserEvidence.crossUserDenied !== true || browserEvidence.exportDelete !== true ||
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
      oracleEvidenceSha256: oracle.sha256,
      cleanup: "complete",
    };
  } finally {
    await stopAndDiscardNext(server);
    stopSupabase(input.repositoryRoot, cycleRoot);
    fs.rmSync(cycleRoot, { recursive: true, force: true });
  }
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
    if (process.argv.includes("--dedicated")) {
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
