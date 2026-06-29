#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  AF010_APPROVAL_PHRASE,
  buildCodexInvocationPlanMarkdown,
  buildCodexInvocationSummary,
  createCodexInvocationPlan,
} from "../lib/agent-factory/codex-invocation-adapter.ts";

const STDOUT_MODES = ["markdown", "json", "none"];

function parseArguments(argv) {
  const options = {
    inputPath:
      process.env.AGENT_FACTORY_CODEX_INVOCATION_INPUT ??
      ".agent-factory/sanitized-codex-task-package.json",
    jsonPath:
      process.env.AGENT_FACTORY_CODEX_INVOCATION_JSON ??
      ".agent-factory/codex-invocation-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_CODEX_INVOCATION_MARKDOWN ??
      ".agent-factory/codex-invocation-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_CODEX_INVOCATION_SUMMARY ??
      ".agent-factory/agent-factory-codex-invocation-summary.md",
    stdout: process.env.AGENT_FACTORY_CODEX_INVOCATION_STDOUT ?? "markdown",
    dryRun: process.env.AGENT_FACTORY_CODEX_INVOCATION_DRY_RUN ?? "true",
    approvalPhrase: process.env.AGENT_FACTORY_CODEX_INVOCATION_APPROVAL_PHRASE ?? "",
    itemId: process.env.AGENT_FACTORY_CODEX_INVOCATION_ITEM_ID ?? "",
    packageIndex: process.env.AGENT_FACTORY_CODEX_INVOCATION_PACKAGE_INDEX ?? "",
    stdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--input" || arg === "--task-package") && next) {
      options.inputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdin") {
      options.stdin = true;
      continue;
    }

    if ((arg === "--dry-run" || arg === "--dry_run") && next) {
      options.dryRun = next;
      index += 1;
      continue;
    }

    if ((arg === "--approval-phrase" || arg === "--approval_phrase") && next) {
      options.approvalPhrase = next;
      index += 1;
      continue;
    }

    if ((arg === "--item-id" || arg === "--item_id") && next) {
      options.itemId = next;
      index += 1;
      continue;
    }

    if ((arg === "--package-index" || arg === "--package_index") && next) {
      options.packageIndex = next;
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

    if (arg === "--summary" && next) {
      options.summaryPath = next;
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

  return validateOptions(options);
}

function validateOptions(options) {
  const stdout = String(options.stdout).trim();
  const dryRun = String(options.dryRun).trim().toLowerCase();

  if (options.help) return { ...options, stdout, dryRun };

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  if (!["true", "false"].includes(dryRun)) {
    throw new Error('dry_run must be "true" or "false".');
  }

  if (options.packageIndex && !/^\d+$/.test(String(options.packageIndex).trim())) {
    throw new Error("package_index must be a zero-based integer when provided.");
  }

  return {
    ...options,
    stdout,
    dryRun,
    inputPath: String(options.inputPath),
    jsonPath: String(options.jsonPath),
    markdownPath: String(options.markdownPath),
    summaryPath: String(options.summaryPath),
    approvalPhrase: String(options.approvalPhrase ?? ""),
    itemId: String(options.itemId ?? "").trim(),
    packageIndex: String(options.packageIndex ?? "").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:codex-invocation -- [options]",
    "",
    "Options:",
    "  --input <path>              Sanitized task package JSON. Default: .agent-factory/sanitized-codex-task-package.json",
    "  --task-package <path>       Alias for --input.",
    "  --stdin                     Read sanitized task package JSON from stdin.",
    '  --dry-run <true|false>     Defaults to true. false always fails closed in AF010 v1.',
    `  --approval-phrase <text>   Required for any future dry_run=false path. Exact phrase: ${AF010_APPROVAL_PHRASE}`,
    "  --item-id <id>              Select a package by itemId when input has a packages array.",
    "  --package-index <index>     Select a package by zero-based index when input has a packages array.",
    "  --json <path>              JSON plan artifact path. Default: .agent-factory/codex-invocation-plan.json",
    "  --markdown <path>          Markdown plan artifact path. Default: .agent-factory/codex-invocation-plan.md",
    "  --summary <path>           Markdown summary path. Default: .agent-factory/agent-factory-codex-invocation-summary.md",
    "  --stdout <mode>            markdown, json, or none. Default: markdown",
    "",
    "AF010 v1 prepares metadata-only invocation plans. It never executes Codex.",
  ].join("\n");
}

function readJsonFile(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}. Use --input, --task-package, or --stdin.`);
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    throw new Error(`Input JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readInput(options) {
  if (options.stdin) {
    try {
      return JSON.parse(fs.readFileSync(0, "utf8"));
    } catch (error) {
      throw new Error(`stdin JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return readJsonFile(options.inputPath);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${String(content).replace(/\s*$/, "")}\n`, "utf8");
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const plan = createCodexInvocationPlan(readInput(options), {
    dryRun: options.dryRun,
    approvalPhrase: options.approvalPhrase,
    itemId: options.itemId || null,
    packageIndex: options.packageIndex || null,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildCodexInvocationPlanMarkdown(plan);
  const summary = buildCodexInvocationSummary(plan);

  writeFile(path.resolve(process.cwd(), options.jsonPath), json);
  writeFile(path.resolve(process.cwd(), options.markdownPath), markdown);
  writeFile(path.resolve(process.cwd(), options.summaryPath), summary);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(summary);
  }

  if (plan.status === "rejected") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-codex-invocation: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
