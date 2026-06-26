#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createSafeRepairPlan } from "../lib/agent-factory/safe-repair-loop.ts";

function parseArguments(argv) {
  const options = {
    inputPath:
      process.env.AGENT_FACTORY_REPAIR_INPUT ??
      ".agent-factory/ci-watcher-report.json",
    doctorPath: process.env.AGENT_FACTORY_REPAIR_DOCTOR,
    jsonPath:
      process.env.AGENT_FACTORY_REPAIR_JSON ??
      ".agent-factory/safe-repair-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_REPAIR_MARKDOWN ??
      ".agent-factory/safe-repair-plan.md",
    stdout: process.env.AGENT_FACTORY_REPAIR_STDOUT ?? "markdown",
    repo: process.env.AGENT_FACTORY_REPO,
    focusedTestCommand: process.env.AGENT_FACTORY_FOCUSED_TEST_COMMAND,
    stdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--input" || arg === "--report" || arg === "--snapshot") && next) {
      options.inputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdin") {
      options.stdin = true;
      continue;
    }

    if (arg === "--doctor" && next) {
      options.doctorPath = next;
      index += 1;
      continue;
    }

    if (arg === "--repo" && next) {
      options.repo = next;
      index += 1;
      continue;
    }

    if (arg === "--focused-test-command" && next) {
      options.focusedTestCommand = next;
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
    "Usage: npm run agent-factory:repair-plan -- [options]",
    "",
    "Options:",
    "  --input <path>                  AF002 report or PR/check snapshot JSON. Default: .agent-factory/ci-watcher-report.json",
    "  --report <path>                 Alias for --input.",
    "  --snapshot <path>               Alias for --input.",
    "  --stdin                         Read AF002 report or snapshot JSON from stdin.",
    "  --doctor <path>                 Optional AF003 PR Contract Doctor report JSON.",
    "  --repo <owner/name>             Repository override used when the input omits it.",
    "  --focused-test-command <cmd>    Focused test command override for focused_test_repair.",
    "  --json <path>                   JSON report path. Default: .agent-factory/safe-repair-plan.json",
    "  --markdown <path>               Markdown report path. Default: .agent-factory/safe-repair-plan.md",
    "  --stdout <mode>                 markdown, json, prompt, or none. Default: markdown",
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

function readInput(options) {
  if (options.stdin) {
    try {
      return JSON.parse(fs.readFileSync(0, "utf8"));
    } catch (error) {
      throw new Error(`stdin JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const primaryPath = path.resolve(process.cwd(), options.inputPath);
  if (fs.existsSync(primaryPath)) {
    return readJsonFile(options.inputPath, "Input");
  }

  const fallbackSnapshot = ".agent-factory/pr-ci-snapshot.json";
  if (options.inputPath === ".agent-factory/ci-watcher-report.json" && fs.existsSync(fallbackSnapshot)) {
    return readJsonFile(fallbackSnapshot, "Fallback snapshot");
  }

  throw new Error(`Input file not found: ${primaryPath}. Use --input, --snapshot, or --stdin.`);
}

function readDoctorReport(options) {
  if (!options.doctorPath) return undefined;
  return readJsonFile(options.doctorPath, "Doctor report");
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const plan = createSafeRepairPlan(readInput(options), {
    repo: options.repo,
    doctorReport: readDoctorReport(options),
    focusedTestCommand: options.focusedTestCommand,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = plan.markdownSummary;

  writeFile(path.resolve(process.cwd(), options.jsonPath), json);
  writeFile(path.resolve(process.cwd(), options.markdownPath), markdown);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(markdown);
  } else if (options.stdout === "prompt") {
    console.log(plan.repairPrompt);
  } else if (options.stdout !== "none") {
    throw new Error("--stdout must be one of: markdown, json, prompt, none");
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-repair-plan: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
