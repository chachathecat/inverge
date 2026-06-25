#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { firstMatchingGlob } from "./glob-match.mjs";

const RUNTIME_REQUIRED_PATTERNS = [
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  "middleware.ts",
  "app/api/notifications/**",
  "lib/notifications/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "config/paid-launch-readiness.json",
  "vercel.json",
];

function fail(message) {
  console.error(`runtime-gate: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file is missing: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
  if (typeof riskResult.runtimeEvidenceRequired === "boolean") {
    return riskResult.runtimeEvidenceRequired;
  }

  const changedFiles = Array.isArray(riskResult.changedFiles) ? riskResult.changedFiles : [];
  return changedFiles.some((file) => firstMatchingGlob(RUNTIME_REQUIRED_PATTERNS, file));
}

function validateEvidence(evidence) {
  if (evidence?.status !== "verified") {
    throw new Error("runtime evidence status must be `verified`.");
  }

  if (evidence?.sourceLevelOnly === true) {
    throw new Error("source-level evidence cannot satisfy the runtime gate.");
  }

  if (typeof evidence?.verifiedAt !== "string" || !Number.isFinite(Date.parse(evidence.verifiedAt))) {
    throw new Error("runtime evidence must contain a valid `verifiedAt` timestamp.");
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
  const riskResult = readJson(riskFile, "risk classification");
  const runtimeRequired = inferRuntimeRequirement(riskResult);

  if (!runtimeRequired) {
    writeStatus("not_required");
    return;
  }

  const evidencePath = process.env.RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) {
    throw new Error("runtime evidence is required, but RUNTIME_EVIDENCE_PATH is not set.");
  }

  const evidence = readJson(path.resolve(evidencePath), "runtime evidence");
  validateEvidence(evidence);
  writeStatus("verified");
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
