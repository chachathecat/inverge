#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createCiWatcherReport } from "../lib/agent-factory/ci-watcher.ts";

function parseArguments(argv) {
  const options = {
    snapshotPath:
      process.env.AGENT_FACTORY_CI_SNAPSHOT ??
      ".agent-factory/pr-ci-snapshot.json",
    jsonPath:
      process.env.AGENT_FACTORY_CI_REPORT_JSON ??
      ".agent-factory/ci-watcher-report.json",
    markdownPath:
      process.env.AGENT_FACTORY_CI_REPORT_MARKDOWN ??
      ".agent-factory/ci-watcher-report.md",
    stdout: process.env.AGENT_FACTORY_CI_STDOUT ?? "markdown",
    repo: process.env.AGENT_FACTORY_REPO,
    stdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--snapshot" && next) {
      options.snapshotPath = next;
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

    if (arg === "--repo" && next) {
      options.repo = next;
      index += 1;
      continue;
    }

    if (arg === "--stdin") {
      options.stdin = true;
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
    "Usage: npm run agent-factory:watch -- [options]",
    "",
    "Options:",
    "  --snapshot <path>   PR/check JSON snapshot. Default: .agent-factory/pr-ci-snapshot.json",
    "  --stdin             Read the snapshot JSON from stdin instead of --snapshot.",
    "  --repo <owner/name> Repository name override used when the snapshot omits it.",
    "  --json <path>       JSON report path. Default: .agent-factory/ci-watcher-report.json",
    "  --markdown <path>   Markdown report path. Default: .agent-factory/ci-watcher-report.md",
    "  --stdout <mode>     markdown, json, or none. Default: markdown",
    "",
    "Snapshot hint:",
    "  gh pr view <number> --json number,title,state,isDraft,baseRefOid,headRefOid,mergeable,mergeStateStatus,labels,files,statusCheckRollup > .agent-factory/pr-ci-snapshot.json",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\s*$/, "")}\n`, "utf8");
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function readSnapshot(options) {
  if (options.stdin) return readStdin();

  const snapshotPath = path.resolve(process.cwd(), options.snapshotPath);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found: ${snapshotPath}. Run with --snapshot, --stdin, or create the default gh pr view snapshot.`);
  }

  return fs.readFileSync(snapshotPath, "utf8");
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(readSnapshot(options));
  } catch (error) {
    throw new Error(`Snapshot JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const report = createCiWatcherReport(snapshot, {
    repo: options.repo,
  });
  const json = JSON.stringify(report, null, 2);
  const markdown = report.markdownSummary;

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
    `agent-factory-watch: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
