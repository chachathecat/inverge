#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { firstMatchingGlob } from "./glob-match.mjs";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";

export const ROUTER_CONTRACT_PATH = "config/dabangil-fast-delivery-router-v2-lite.json";
export const PUBLIC_PROFILES = Object.freeze(["LOW", "MEDIUM", "HIGH"]);

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function loadRouterContract(filePath = path.resolve(ROUTER_CONTRACT_PATH)) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (parsed.schemaVersion !== "DabangilFastDeliveryRouterV2LiteV1") {
    throw new Error(`Unsupported Router V2 Lite contract: ${parsed.schemaVersion ?? "missing"}`);
  }
  if (JSON.stringify(parsed.publicProfilesExactly) !== JSON.stringify(PUBLIC_PROFILES)) {
    throw new Error("Router contract must expose exactly LOW, MEDIUM and HIGH.");
  }
  if (parsed.unknownEquals !== "HIGH") {
    throw new Error("Router contract must fail unknown paths closed as HIGH.");
  }
  if (JSON.stringify(parsed.profileOrder) !== JSON.stringify({ LOW: 0, MEDIUM: 1, HIGH: 2 })) {
    throw new Error("Router contract profile order must be the closed LOW/MEDIUM/HIGH order.");
  }
  if (JSON.stringify(Object.keys(parsed.requiredCheckProducers).sort()) !== JSON.stringify([...parsed.requiredExactHeadChecks].sort())) {
    throw new Error("Every required check must bind exactly one trusted producer.");
  }
  return parsed;
}

// Compatibility export for callers that previously loaded the YAML policy.
// V2 Lite has one machine authority and intentionally ignores alternate paths.
export function parsePolicy() {
  return loadRouterContract();
}

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  return JSON.parse(fs.readFileSync(eventPath, "utf8"));
}

function validateSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

export function normalizeRepositoryPath(value) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return null;
  if (value.includes("\\") || value.includes("\0") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) return null;
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return null;
  return value;
}

function changedFilesFromEnvironment() {
  if (!Object.hasOwn(process.env, "CHANGED_FILES")) return null;
  return process.env.CHANGED_FILES.split(/\r?\n/).filter((value) => value.length > 0);
}

export function getChangedFiles() {
  const supplied = changedFilesFromEnvironment();
  if (supplied) return supplied;

  const event = readEvent();
  const baseSha = event?.pull_request?.base?.sha;
  const headSha = event?.pull_request?.head?.sha;
  if (!validateSha(baseSha) || !validateSha(headSha)) {
    throw new Error("Unable to determine exact pull-request base/head SHAs. Set CHANGED_FILES for a manual run.");
  }
  const output = execFileSync(
    "git",
    ["diff", "--name-only", `${baseSha}...${headSha}`, "--"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return output.split(/\r?\n/).filter((value) => value.length > 0);
}

export function getSignals() {
  return sortedUnique(
    (process.env.PR_SIGNALS ?? "")
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function extensionOf(filePath) {
  return path.posix.extname(filePath).toLowerCase();
}

function lowAllowlistMatch(filePath, contract) {
  for (const entry of contract.lowAllowlist) {
    if (!filePath.startsWith(entry.prefix) || filePath.length === entry.prefix.length) continue;
    const extension = extensionOf(filePath);
    if (entry.extensions.includes(extension)) return `${entry.prefix}*${extension}`;
  }
  return null;
}

function highPathMatch(filePath, contract) {
  if (contract.highRisk.exactPaths.includes(filePath)) return { kind: "exact", pattern: filePath };
  const prefix = contract.highRisk.pathPrefixes.find((candidate) => filePath.startsWith(candidate));
  if (prefix) return { kind: "prefix", pattern: `${prefix}**` };
  const glob = firstMatchingGlob(contract.highRisk.pathGlobs, filePath);
  return glob ? { kind: "glob", pattern: glob } : null;
}

function profileMaximum(left, right, contract) {
  return contract.profileOrder[right] > contract.profileOrder[left] ? right : left;
}

function pathClassification(filePath, contract) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized) {
    return { path: String(filePath), profile: "HIGH", reason: "unsafe_or_noncanonical_path", rule: "UNKNOWN_EQUALS_HIGH" };
  }
  const highMatch = highPathMatch(normalized, contract);
  if (highMatch) {
    return {
      path: normalized,
      profile: "HIGH",
      reason: "high_authority_or_runtime_path",
      rule: highMatch.pattern,
      matchKind: highMatch.kind,
    };
  }
  if (contract.executableExtensions.includes(extensionOf(normalized))) {
    return {
      path: normalized,
      profile: "MEDIUM",
      reason: "executable_source_or_test_floor",
      rule: `executable:${extensionOf(normalized)}`,
    };
  }
  const lowMatch = lowAllowlistMatch(normalized, contract);
  if (lowMatch) {
    return { path: normalized, profile: "LOW", reason: "exact_nonexecutable_allowlist", rule: lowMatch };
  }
  return { path: normalized, profile: "HIGH", reason: "unclassified_path", rule: "UNKNOWN_EQUALS_HIGH" };
}

function declaredLaneProfile(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).toUpperCase();
  return PUBLIC_PROFILES.includes(normalized) ? normalized : "HIGH";
}

export function declaredLaneRiskFromBody(body) {
  const prefix = "FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK ";
  const declarations = String(body ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix));
  if (declarations.length === 0) return null;
  if (declarations.length !== 1) return "INVALID";
  const match = declarations[0].match(/^FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK (LOW|MEDIUM|HIGH)$/);
  return match?.[1] ?? "INVALID";
}

export function resolveDeclaredLaneRisk(eventBody, environment = process.env) {
  if (Object.hasOwn(environment, "DECLARED_LANE_RISK")) return environment.DECLARED_LANE_RISK;
  if (Object.hasOwn(environment, "CHANGED_FILES")) return null;
  return declaredLaneRiskFromBody(eventBody);
}

export function classify(files, signals = [], contract = loadRouterContract(), options = {}) {
  const inputFiles = Array.isArray(files) ? files : [];
  const pathRecords = inputFiles.map((file) => pathClassification(file, contract));
  const reasons = pathRecords.map((record) => ({
    kind: "path",
    level: record.profile.toLowerCase(),
    path: record.path,
    reason: record.reason,
    rule: record.rule,
  }));

  let profile = "LOW";
  if (pathRecords.length === 0) {
    profile = "HIGH";
    reasons.push({ kind: "scope", level: "high", reason: "empty_changed_path_set" });
  }
  for (const record of pathRecords) profile = profileMaximum(profile, record.profile, contract);

  const duplicatePaths = inputFiles.filter((file, index) => inputFiles.indexOf(file) !== index);
  if (duplicatePaths.length > 0) {
    profile = "HIGH";
    reasons.push({ kind: "scope", level: "high", reason: "duplicate_changed_paths", paths: sortedUnique(duplicatePaths) });
  }
  if (inputFiles.length > contract.maximumChangedFiles) {
    profile = "HIGH";
    reasons.push({
      kind: "scope",
      level: "high",
      reason: "changed_path_limit_exceeded",
      maximum: contract.maximumChangedFiles,
      observed: inputFiles.length,
    });
  }

  for (const signal of sortedUnique((Array.isArray(signals) ? signals : []).map((value) => String(value)))) {
    profile = "HIGH";
    reasons.push({
      kind: "signal",
      level: "high",
      signal,
      reason: contract.highRisk.signals.includes(signal) ? "governed_high_signal" : "unknown_signal_fails_closed",
    });
  }

  const requestedLaneProfile = declaredLaneProfile(options.declaredLaneRisk ?? process.env.DECLARED_LANE_RISK);
  if (requestedLaneProfile) {
    const before = profile;
    profile = profileMaximum(profile, requestedLaneProfile, contract);
    reasons.push({
      kind: "declared_lane",
      level: profile.toLowerCase(),
      declared: requestedLaneProfile,
      computedBeforeDeclaration: before,
      computedAfterDeclaration: profile,
      loweredComputedFloor: false,
    });
  }

  const normalizedFiles = pathRecords.map((record) => record.path);
  const runtimeReasons = runtimeRequiredPathRecords(normalizedFiles.filter((file) => normalizeRepositoryPath(file)));
  const automaticMergeCandidate = profile === "LOW";
  return {
    profile,
    risk: profile.toLowerCase(),
    validationProfile: profile,
    reasons,
    pathRecords,
    runtimeEvidenceRequired: runtimeReasons.length > 0,
    runtimeReasons,
    automaticMergeCandidate,
    automaticMergeCandidateKind: automaticMergeCandidate ? "LOW" : null,
    automaticMergeEligible: false,
    ownerApprovalRequired: profile === "HIGH",
  };
}

function pathOwnedByRegistration(filePath, registration) {
  if (registration.ownedPathsExactly?.includes(filePath)) return true;
  return registration.ownedPathPrefixes?.some((prefix) => filePath.startsWith(prefix)) ?? false;
}

export function evaluateMediumSourceOnlyEligibility({
  classification,
  contract = loadRouterContract(),
  laneDeclaration,
  headRefName,
  evidence = {},
}) {
  const blockers = [];
  if (classification?.profile !== "MEDIUM") blockers.push("computed_profile_must_be_MEDIUM");
  if (!laneDeclaration || typeof laneDeclaration !== "object") blockers.push("missing_lane_declaration");
  if (laneDeclaration && laneDeclaration.branch !== headRefName) blockers.push("lane_branch_does_not_match_pull_request");
  const registration = laneDeclaration
    ? contract.mediumSourceOnly.registeredLanes.find((candidate) => (
      candidate.laneId === laneDeclaration.laneId && candidate.branch === laneDeclaration.branch
    ))
    : null;
  if (!registration) blockers.push("lane_not_registered_on_trusted_main");

  if (registration) {
    if (registration.inertSourceOnly !== true) blockers.push("registration_not_inert_source_only");
    if (registration.activationDefaultOff !== true) blockers.push("registration_not_default_off");
    if (registration.runtimeConnected !== false) blockers.push("registration_runtime_connected");
    if (registration.remoteMutationAllowed !== false) blockers.push("registration_remote_mutation_not_zero");
    for (const filePath of classification.pathRecords.map((record) => record.path)) {
      if (!pathOwnedByRegistration(filePath, registration)) blockers.push(`path_not_owned:${filePath}`);
    }
  }
  for (const key of contract.mediumSourceOnly.requiredEvidenceKeys) {
    if (evidence[key] !== true) blockers.push(`missing_evidence:${key}`);
  }
  return {
    eligible: blockers.length === 0,
    candidateKind: blockers.length === 0 ? "MEDIUM_SOURCE_ONLY" : null,
    blockers: sortedUnique(blockers),
    laneId: registration?.laneId ?? null,
  };
}

function outputPathInsideWorkspace(outputPath) {
  const workspace = path.resolve(process.cwd());
  const resolved = path.resolve(outputPath);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("RISK_OUTPUT_PATH must stay inside the workspace.");
  }
  return resolved;
}

export function writeOutput(result) {
  if (process.env.RISK_OUTPUT_PATH) {
    const resolvedPath = outputPathInsideWorkspace(process.env.RISK_OUTPUT_PATH);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `risk=${result.risk}`,
        `profile=${result.profile}`,
        `runtime_evidence_required=${result.runtimeEvidenceRequired}`,
        `automatic_merge_candidate=${result.automaticMergeCandidate}`,
        `owner_approval_required=${result.ownerApprovalRequired}`,
        `changed_files_count=${result.changedFiles.length}`,
      ].join("\n") + "\n",
      "utf8",
    );
  }
}

function exactDiffRange() {
  const event = readEvent();
  const baseSha = event?.pull_request?.base?.sha;
  const headSha = event?.pull_request?.head?.sha;
  return validateSha(baseSha) && validateSha(headSha) ? `${baseSha}...${headSha}` : null;
}

export function validateChangedRoute(files) {
  for (const filePath of files) {
    const normalized = normalizeRepositoryPath(filePath);
    if (!normalized) throw new Error(`Unsafe changed path cannot be validated: ${filePath}`);
    if (extensionOf(normalized) === ".json" && fs.existsSync(normalized)) {
      JSON.parse(fs.readFileSync(normalized, "utf8"));
    }
  }
  const range = exactDiffRange();
  execFileSync("git", range ? ["diff", "--check", range, "--"] : ["diff", "--check"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { jsonFilesParsed: files.filter((file) => extensionOf(file) === ".json").length, diffCheck: "passed" };
}

export function runClassifier() {
  const contract = loadRouterContract();
  const changedFiles = getChangedFiles();
  const event = readEvent();
  const declaredLaneRisk = resolveDeclaredLaneRisk(event?.pull_request?.body);
  const classification = classify(changedFiles, getSignals(), contract, { declaredLaneRisk });
  const result = {
    version: 2,
    contractId: contract.contractId,
    ...classification,
    changedFiles: changedFiles.slice(0, contract.maximumChangedFiles),
    changedFilesTruncated: changedFiles.length > contract.maximumChangedFiles,
  };
  if (process.argv.includes("--validate-route")) result.routeValidation = validateChangedRoute(changedFiles);
  writeOutput(result);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) {
  try {
    runClassifier();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
