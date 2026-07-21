#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { firstMatchingGlob } from "./glob-match.mjs";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";

const RISK_ORDER = { low: 0, medium: 1, high: 2 };

function parsePolicy(filePath) {
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

function getChangedFiles() {
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  }

  const event = readEvent();
  const baseSha = event?.pull_request?.base?.sha;
  const headSha = event?.pull_request?.head?.sha;

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

function classify(files, signals, policy) {
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

    const mediumPattern = firstMatchingGlob(policy.mediumRiskPaths, file);
    if (mediumPattern) {
      risk = raiseRisk(risk, "medium");
      reasons.push({ kind: "path", level: "medium", path: file, pattern: mediumPattern });
      allFilesExplicitlyLow = false;
      continue;
    }

    const lowPattern = firstMatchingGlob(policy.lowRiskPaths, file);
    if (!lowPattern) {
      risk = raiseRisk(risk, "medium");
      reasons.push({ kind: "path", level: "medium", path: file, pattern: "unclassified_path" });
      allFilesExplicitlyLow = false;
    }
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

  return {
    risk,
    reasons,
    runtimeEvidenceRequired: runtimeReasons.length > 0,
    runtimeReasons,
  };
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
        `runtime_evidence_required=${result.runtimeEvidenceRequired}`,
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
  const classification = classify(changedFiles, signals, policy);
  const result = {
    version: 1,
    ...classification,
    changedFiles: changedFiles.slice(0, 200),
    changedFilesTruncated: changedFiles.length > 200,
  };

  writeOutput(result);
  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
