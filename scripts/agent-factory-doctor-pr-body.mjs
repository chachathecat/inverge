#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createPrContractDoctorReport } from "../lib/agent-factory/pr-contract-doctor.ts";

function parseArguments(argv) {
  const options = {
    bodyPath:
      process.env.AGENT_FACTORY_PR_BODY_PATH ??
      ".agent-factory/pr-body.md",
    jsonPath:
      process.env.AGENT_FACTORY_PR_DOCTOR_JSON ??
      ".agent-factory/pr-contract-doctor-report.json",
    markdownPath:
      process.env.AGENT_FACTORY_PR_DOCTOR_MARKDOWN ??
      ".agent-factory/pr-contract-doctor-report.md",
    repairedPath:
      process.env.AGENT_FACTORY_PR_DOCTOR_REPAIRED ??
      ".agent-factory/pr-body.repaired.md",
    stdout: process.env.AGENT_FACTORY_PR_DOCTOR_STDOUT ?? "markdown",
    issueNumber: process.env.AGENT_FACTORY_ISSUE_NUMBER,
    defaultRisk: process.env.AGENT_FACTORY_DEFAULT_RISK,
    sourceLevelOnly: process.env.AGENT_FACTORY_SOURCE_LEVEL_ONLY === "true",
    stdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--body" && next) {
      options.bodyPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdin") {
      options.stdin = true;
      continue;
    }

    if (arg === "--issue" && next) {
      options.issueNumber = next;
      index += 1;
      continue;
    }

    if (arg === "--risk" && next) {
      options.defaultRisk = next;
      index += 1;
      continue;
    }

    if (arg === "--source-level-only") {
      options.sourceLevelOnly = true;
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

    if (arg === "--repaired" && next) {
      options.repairedPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdout" && next) {
      options.stdout = next;
      index += 1;
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
    "Usage: npm run agent-factory:doctor-pr-body -- [options]",
    "",
    "Options:",
    "  --body <path>          PR body Markdown path. Default: .agent-factory/pr-body.md",
    "  --stdin                Read PR body Markdown from stdin instead of --body.",
    "  --issue <number>       Insert Closes #<number> when the body has no closing issue.",
    "  --risk <level>         Default risk when missing: low, medium, or high.",
    "  --source-level-only    Allow low risk inference when risk is missing and no sensitive hints are present.",
    "  --json <path>          JSON report path. Default: .agent-factory/pr-contract-doctor-report.json",
    "  --markdown <path>      Markdown report path. Default: .agent-factory/pr-contract-doctor-report.md",
    "  --repaired <path>      Repaired body path. Default: .agent-factory/pr-body.repaired.md",
    "  --stdout <mode>        markdown, json, body, or none. Default: markdown",
    "",
    "The command is source-level and does not call GitHub or mutate PR state.",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\s*$/, "")}\n`, "utf8");
}

function readBody(options) {
  if (options.stdin) return fs.readFileSync(0, "utf8");

  const bodyPath = path.resolve(process.cwd(), options.bodyPath);
  if (fs.existsSync(bodyPath)) return fs.readFileSync(bodyPath, "utf8");

  if (typeof process.env.PR_BODY === "string" && process.env.PR_BODY.trim()) {
    return process.env.PR_BODY;
  }

  throw new Error(`PR body file not found: ${bodyPath}. Use --body, --stdin, or PR_BODY.`);
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const report = createPrContractDoctorReport(readBody(options), {
    issueNumber: options.issueNumber,
    defaultRisk: options.defaultRisk,
    sourceLevelOnly: options.sourceLevelOnly,
  });
  const json = JSON.stringify(report, null, 2);
  const markdown = report.markdownSummary;

  writeFile(path.resolve(process.cwd(), options.jsonPath), json);
  writeFile(path.resolve(process.cwd(), options.markdownPath), markdown);
  writeFile(path.resolve(process.cwd(), options.repairedPath), report.repairedBody);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(markdown);
  } else if (options.stdout === "body") {
    console.log(report.repairedBody.trimEnd());
  } else if (options.stdout !== "none") {
    throw new Error("--stdout must be one of: markdown, json, body, none");
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-doctor-pr-body: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
