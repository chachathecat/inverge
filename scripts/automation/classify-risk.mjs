#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { firstMatchingGlob } from "./glob-match.mjs";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";

const RISK_ORDER = { low: 0, medium: 1, high: 2 };

export function parsePolicy(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const policy = {
    highRiskPaths: [],
    highRiskSignals: [],
    mediumRiskPaths: [],
    lowRiskPaths: [],
    blockingLabels: [],
  };
  let currentList = null;

  for (const originalLine of text.split(/\r?\n/)) {
    const line = originalLine.replace(/\s+#.*$/, "").trim();
    if (!line) continue;

    const section = line.match(/^(highRiskPaths|highRiskSignals|mediumRiskPaths|lowRiskPaths|blockingLabels):\s*$/);
    if (section) {
      currentList = section[1];
      continue;
    }

    if (/^[A-Za-z][\w-]*:\s*$/.test(line)) {
      currentList = null;
      continue;
    }

    if (currentList && line.startsWith("-")) {
      const rawValue = line.slice(1).trim();
      const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
      policy[currentList].push(value);
    }
  }

  return policy;
}

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  return JSON.parse(fs.readFileSync(eventPath, "utf8"));
}

function validateSha(value) {
  return typeof value === "string" && /^[0-9a-f]{7,40}$/i.test(value);
}

export function getChangedFiles() {
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  }

  const event = readEvent();
  let baseSha = event?.pull_request?.base?.sha ?? event?.before;
  const headSha = event?.pull_request?.head?.sha ?? event?.after ?? process.env.GITHUB_SHA;

  if (/^0{40}$/u.test(baseSha ?? "") && validateSha(headSha)) {
    baseSha = execFileSync("git", ["rev-parse", `${headSha}^`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }

  if (!validateSha(baseSha) && validateSha(headSha) && !event?.pull_request) {
    baseSha = execFileSync("git", ["rev-parse", `${headSha}^`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }

  if (!validateSha(baseSha) || !validateSha(headSha)) {
    throw new Error("Unable to determine pull-request base/head SHAs. Set CHANGED_FILES for a manual run.");
  }

  const output = execFileSync(
    "git",
    ["diff", "--name-only", `${baseSha}...${headSha}`, "--"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  return output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

function getSignals() {
  return (process.env.PR_SIGNALS ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function raiseRisk(currentRisk, candidateRisk) {
  return RISK_ORDER[candidateRisk] > RISK_ORDER[currentRisk] ? candidateRisk : currentRisk;
}

export function classify(files, signals, policy, { profileOverride = null, registeredLaneId = null } = {}) {
  let risk = "low";
  const reasons = [];
  let allFilesExplicitlyLow = files.length > 0;

  for (const file of files) {
    const highPattern = firstMatchingGlob(policy.highRiskPaths, file);
    if (highPattern) {
      risk = "high";
      reasons.push({ kind: "path", level: "high", path: file, pattern: highPattern });
      allFilesExplicitlyLow = false;
      continue;
    }

    const lowPattern = firstMatchingGlob(policy.lowRiskPaths, file);
    if (lowPattern) continue;

    const mediumPattern = firstMatchingGlob(policy.mediumRiskPaths, file);
    if (mediumPattern) {
      risk = raiseRisk(risk, "medium");
      reasons.push({ kind: "path", level: "medium", path: file, pattern: mediumPattern });
      allFilesExplicitlyLow = false;
      continue;
    }

    risk = "high";
    reasons.push({ kind: "path", level: "high", path: file, pattern: "unclassified_path_fail_closed" });
    allFilesExplicitlyLow = false;
  }

  if (["LOW", "MEDIUM", "HIGH"].includes(profileOverride)) {
    risk = profileOverride.toLowerCase();
    allFilesExplicitlyLow = profileOverride === "LOW";
    reasons.push({ kind: "registered_lane", level: risk, profile: profileOverride });
  }

  for (const signal of signals) {
    if (policy.highRiskSignals.includes(signal)) {
      risk = "high";
      reasons.push({ kind: "signal", level: "high", signal });
    }
  }

  if (risk === "low" && !allFilesExplicitlyLow) {
    risk = "medium";
  }

  const runtimeReasons = runtimeRequiredPathRecords(files);
  const representativeE2eRequired = files.some((file) =>
    firstMatchingGlob(["app/**", "components/**"], file) !== null,
  );
  const validationRoute = registeredLaneId === "QF_I1_RELEASE_INTEGRATION" && risk === "high"
    ? "QF_I1_BOUNDED_HIGH"
    : `${risk.toUpperCase()}_STANDARD`;

  return {
    risk,
    profile: risk.toUpperCase(),
    registeredLaneId,
    validationRoute,
    reasons,
    runtimeEvidenceRequired: runtimeReasons.length > 0,
    runtimeReasons,
    representativeE2eRequired,
    heavyLinuxRequired: risk !== "low",
    heavyWindowsRequired: risk === "high" && validationRoute !== "QF_I1_BOUNDED_HIGH",
    learnerLoopRequired: runtimeReasons.length > 0,
    automaticMergeEligible: risk === "low" || risk === "medium",
    ownerApprovalRequired: risk === "high",
  };
}

export function findRegisteredLaneRegistration(files, headRef) {
  if (!headRef || !fs.existsSync("config/dabangil-fast-delivery-parallel-execution-v2.json")) return null;
  try {
    const contract = JSON.parse(fs.readFileSync("config/dabangil-fast-delivery-parallel-execution-v2.json", "utf8"));
    const lane = contract?.questionFoundrySplitCampaign?.lanes?.find((entry) => entry.branch === headRef);
    if (!lane || !["LOW", "MEDIUM", "HIGH"].includes(lane.profile)) return null;
    const allowed = new Set([
      ...(lane.ownedPathsExactly ?? []),
      ...(lane.serialIntegrationPathsExactly ?? []),
    ]);
    if (files.length === 0 || files.some((file) => !allowed.has(file))) return null;
    return { laneId: lane.laneId, profile: lane.profile };
  } catch {
    return null;
  }
}

export function findRegisteredLaneProfileOverride(files, headRef) {
  return findRegisteredLaneRegistration(files, headRef)?.profile ?? null;
}

function writeOutput(result) {
  const outputPath = process.env.RISK_OUTPUT_PATH;
  if (outputPath) {
    const resolvedPath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `risk=${result.risk}`,
        `profile=${result.profile}`,
        `registered_lane_id=${result.registeredLaneId ?? ""}`,
        `validation_route=${result.validationRoute}`,
        `runtime_evidence_required=${result.runtimeEvidenceRequired}`,
        `representative_e2e_required=${result.representativeE2eRequired}`,
        `heavy_linux_required=${result.heavyLinuxRequired}`,
        `heavy_windows_required=${result.heavyWindowsRequired}`,
        `learner_loop_required=${result.learnerLoopRequired}`,
        `automatic_merge_eligible=${result.automaticMergeEligible}`,
        `owner_approval_required=${result.ownerApprovalRequired}`,
        `changed_files_count=${result.changedFiles.length}`,
      ].join("\n") + "\n",
      "utf8",
    );
  }
}

function main() {
  const policy = parsePolicy(path.resolve("config/agent-risk-policy.yml"));
  const changedFiles = getChangedFiles();
  const signals = getSignals();
  const event = readEvent();
  const headRef = event?.pull_request?.head?.ref ?? process.env.PR_HEAD_REF ?? null;
  const registration = findRegisteredLaneRegistration(changedFiles, headRef);
  const classification = classify(changedFiles, signals, policy, {
    profileOverride: registration?.profile ?? null,
    registeredLaneId: registration?.laneId ?? null,
  });
  const result = {
    version: 2,
    headSha: readEvent()?.pull_request?.head?.sha ?? readEvent()?.after ?? process.env.GITHUB_SHA ?? null,
    ...classification,
    changedFiles: changedFiles.slice(0, 200),
    changedFilesTruncated: changedFiles.length > 200,
  };

  writeOutput(result);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
