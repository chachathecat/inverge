#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRebaseMergePlan } from "../lib/agent-factory/rebase-merge-orchestrator.ts";

function parseArguments(argv) {
  const options = {
    inputPath:
      process.env.AGENT_FACTORY_MERGE_INPUT ??
      ".agent-factory/ci-watcher-report.json",
    snapshotPath: process.env.AGENT_FACTORY_MERGE_SNAPSHOT,
    repairPlanPath:
      process.env.AGENT_FACTORY_MERGE_REPAIR_PLAN ??
      ".agent-factory/safe-repair-plan.json",
    previousSnapshotPath: process.env.AGENT_FACTORY_MERGE_PREVIOUS_SNAPSHOT,
    siblingsPath: process.env.AGENT_FACTORY_MERGE_SIBLINGS,
    jsonPath:
      process.env.AGENT_FACTORY_MERGE_JSON ??
      ".agent-factory/rebase-merge-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_MERGE_MARKDOWN ??
      ".agent-factory/rebase-merge-plan.md",
    stdout: process.env.AGENT_FACTORY_MERGE_STDOUT ?? "markdown",
    repo: process.env.AGENT_FACTORY_REPO,
    stdin: false,
    reportOnly: process.env.AGENT_FACTORY_MERGE_REPORT_ONLY === "true",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--input" || arg === "--report") && next) {
      options.inputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdin") {
      options.stdin = true;
      continue;
    }

    if (arg === "--snapshot" && next) {
      options.snapshotPath = next;
      index += 1;
      continue;
    }

    if ((arg === "--repair-plan" || arg === "--repair") && next) {
      options.repairPlanPath = next;
      index += 1;
      continue;
    }

    if (arg === "--previous-snapshot" && next) {
      options.previousSnapshotPath = next;
      index += 1;
      continue;
    }

    if (arg === "--siblings" && next) {
      options.siblingsPath = next;
      index += 1;
      continue;
    }

    if (arg === "--repo" && next) {
      options.repo = next;
      index += 1;
      continue;
    }

    if (arg === "--json" && next) {
      options.jsonPath = next;
      index += 1;
      continue;
    }

    if (arg === "--markdown" && next) {
      options.markdownPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdout" && next) {
      options.stdout = next;
      index += 1;
      continue;
    }

    if (arg === "--report-only") {
      options.reportOnly = true;
      continue;
    }

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function helpText() {
  return [
    "Usage: npm run agent-factory:merge-plan -- [options]",
    "",
    "Options:",
    "  --input <path>              AF002 report or PR/check snapshot JSON. Default: .agent-factory/ci-watcher-report.json",
    "  --report <path>             Alias for --input.",
    "  --stdin                     Read AF002 report or snapshot JSON from stdin.",
    "  --snapshot <path>           Optional PR metadata snapshot for changed-file and label risk gates.",
    "  --repair-plan <path>        Optional AF004 repair-plan JSON. Default: .agent-factory/safe-repair-plan.json when present.",
    "  --previous-snapshot <path>  Optional earlier PR metadata snapshot to compare base/head/mergeability.",
    "  --siblings <path>           Optional JSON array of sibling PR metadata snapshots for merge-order notes.",
    "  --repo <owner/name>         Repository override used when inputs omit it.",
    "  --json <path>               JSON report path. Default: .agent-factory/rebase-merge-plan.json",
    "  --markdown <path>           Markdown report path. Default: .agent-factory/rebase-merge-plan.md",
    "  --stdout <mode>             markdown, json, or none. Default: markdown",
    "  --report-only               Mark output as report-only context.",
    "",
    "The command is read-only planner automation. It writes local artifacts only.",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\s*$/, "")}\n`, "utf8");
}

function readJsonFile(filePath, label) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${label} file not found: ${resolvedPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    throw new Error(`${label} JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readOptionalJsonFile(filePath, label) {
  if (!filePath) return undefined;
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) return undefined;
  return readJsonFile(filePath, label);
}

function readInput(options) {
  if (options.stdin) {
    try {
      return JSON.parse(fs.readFileSync(0, "utf8"));
    } catch (error) {
      throw new Error(`stdin JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const inputPath = path.resolve(process.cwd(), options.inputPath);
  if (fs.existsSync(inputPath)) {
    return readJsonFile(options.inputPath, "Input");
  }

  const fallbackSnapshot = ".agent-factory/pr-ci-snapshot.json";
  if (options.inputPath === ".agent-factory/ci-watcher-report.json" && fs.existsSync(fallbackSnapshot)) {
    return readJsonFile(fallbackSnapshot, "Fallback snapshot");
  }

  throw new Error(`Input file not found: ${inputPath}. Use --input, --snapshot, or --stdin.`);
}

function readSnapshot(options) {
  if (options.snapshotPath) {
    return readJsonFile(options.snapshotPath, "PR snapshot");
  }

  const defaultSnapshot = ".agent-factory/pr-ci-snapshot.json";
  if (fs.existsSync(path.resolve(process.cwd(), defaultSnapshot))) {
    return readJsonFile(defaultSnapshot, "Default PR snapshot");
  }

  return undefined;
}

function readSiblings(options) {
  const value = readOptionalJsonFile(options.siblingsPath, "Sibling PR snapshots");
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("Sibling PR snapshots JSON must be an array.");
  }
  return value;
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const input = readInput(options);
  const plan = createRebaseMergePlan(input, {
    repo: options.repo,
    prSnapshot: readSnapshot(options),
    repairPlan: readOptionalJsonFile(options.repairPlanPath, "AF004 repair plan"),
    previousSnapshot: readOptionalJsonFile(options.previousSnapshotPath, "Previous PR snapshot"),
    siblingPullRequests: readSiblings(options),
    reportOnly: options.reportOnly,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = plan.markdownSummary;

  writeFile(path.resolve(process.cwd(), options.jsonPath), json);
  writeFile(path.resolve(process.cwd(), options.markdownPath), markdown);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(markdown);
  } else if (options.stdout !== "none") {
    throw new Error("--stdout must be one of: markdown, json, none");
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-merge-plan: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
