#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { getChangedFiles } from "./classify-risk.mjs";

const TEST_PATTERN = /^tests\/(?!e2e\/).+\.test\.mjs$/u;
const E2E_PATTERN = /^tests\/e2e\/.+\.spec\.ts$/u;
const LINT_PATTERN = /\.(?:[cm]?js|jsx|ts|tsx)$/u;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

export function selectChangedEvidence(changedFiles) {
  const normalized = [...new Set(changedFiles)].sort();
  return {
    changedFiles: normalized,
    focusedTests: normalized.filter((value) => TEST_PATTERN.test(value)),
    representativeE2e: normalized.filter((value) => E2E_PATTERN.test(value)),
    jsonSchemas: normalized.filter((value) => value.endsWith(".json")),
    lintFiles: normalized.filter((value) => LINT_PATTERN.test(value) && fs.existsSync(value)),
  };
}

export function parseChangedJson(paths) {
  const errors = [];
  for (const filePath of paths) {
    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      errors.push(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

export function requireFocusedTests(selection) {
  if (selection.focusedTests.length === 0) {
    throw new Error("the selected validation profile requires at least one changed focused deterministic test");
  }
  for (const testPath of selection.focusedTests) {
    if (!fs.existsSync(testPath)) throw new Error(`focused test does not exist: ${testPath}`);
  }
  return selection.focusedTests;
}

function runNodeTests(testPaths) {
  run(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "--test",
    ...testPaths,
  ]);
}

function selectQfI1BoundedTests() {
  const questionFoundryTests = fs.readdirSync("tests", { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^question-foundry.*\.test\.mjs$/u.test(entry.name))
    .map((entry) => `tests/${entry.name}`);
  const adjacentTests = [
    "tests/rights-safe-adaptive-variant-foundry-contract.test.mjs",
    "tests/wcv-c3-foundation-freeze.test.mjs",
    "tests/first-stage-common-mcq-kernel.test.mjs",
    "tests/first-stage-study-capacity-runtime-bridge.test.mjs",
    "tests/dabangil-study-capacity-life-mode-contract.test.mjs",
    "tests/study-capacity-life-mode-orchestrator.test.mjs",
  ];
  const selected = [...new Set([...questionFoundryTests, ...adjacentTests])].sort();
  if (questionFoundryTests.length < 5 || selected.some((testPath) => !fs.existsSync(testPath))) {
    throw new Error("QF-I1 bounded suite requires all five split Question Foundry tests and every governing adjacent regression");
  }
  return selected;
}

function runDiffCheck() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let range = null;
  if (eventPath && fs.existsSync(eventPath)) {
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    const base = event?.pull_request?.base?.sha ?? event?.before;
    const head = event?.pull_request?.head?.sha ?? event?.after;
    if (base && head && !/^0{40}$/u.test(base)) range = `${base}...${head}`;
  }
  const args = ["diff", "--check"];
  if (range) args.push(range);
  execFileSync("git", args, { stdio: "inherit" });
}

function main() {
  const [command] = process.argv.slice(2);
  const selection = selectChangedEvidence(getChangedFiles());

  if (command === "describe") {
    process.stdout.write(`${JSON.stringify(selection, null, 2)}\n`);
    return;
  }
  if (command === "focused-tests" || command === "affected-tests") {
    runNodeTests(requireFocusedTests(selection));
    return;
  }
  if (command === "qf-i1-tests") {
    runNodeTests(selectQfI1BoundedTests());
    return;
  }
  if (command === "schema-parse") {
    const errors = parseChangedJson(selection.jsonSchemas);
    if (errors.length > 0) throw new Error(errors.join("\n"));
    process.stdout.write(`parsed ${selection.jsonSchemas.length} changed JSON file(s)\n`);
    return;
  }
  if (command === "changed-file-lint") {
    if (selection.lintFiles.length === 0) {
      process.stdout.write("no changed lintable files\n");
      return;
    }
    run(process.execPath, ["node_modules/eslint/bin/eslint.js", ...selection.lintFiles]);
    return;
  }
  if (command === "representative-e2e") {
    if (process.env.REPRESENTATIVE_E2E_REQUIRED !== "true") {
      process.stdout.write("representative E2E is not applicable\n");
      return;
    }
    if (selection.representativeE2e.length !== 1) {
      throw new Error("an applicable MEDIUM profile requires exactly one changed representative E2E spec");
    }
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    run(npx, ["playwright", "test", selection.representativeE2e[0], "--project=chromium", "--workers=1"]);
    return;
  }
  if (command === "diff-check") {
    runDiffCheck();
    return;
  }
  throw new Error(`unknown validation command: ${String(command)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
