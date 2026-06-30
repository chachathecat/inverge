#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryOrchestratorMarkdown,
  buildAgentFactoryOrchestratorSummary,
  createAgentFactoryOrchestratorPlan,
} from "../lib/agent-factory/factory-orchestrator.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_ORCHESTRATOR_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_ORCHESTRATOR_JSON ??
      ".agent-factory/factory-orchestrator-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_ORCHESTRATOR_MARKDOWN ??
      ".agent-factory/factory-orchestrator-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_ORCHESTRATOR_SUMMARY ??
      ".agent-factory/agent-factory-orchestrator-summary.md",
    stdout: process.env.AGENT_FACTORY_ORCHESTRATOR_STDOUT ?? "markdown",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--artifact-dir" || arg === "--artifact_dir") && next) {
      options.artifactDir = next;
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

  if (options.help) return { ...options, stdout };

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  return {
    ...options,
    stdout,
    artifactDir: String(options.artifactDir ?? DEFAULT_ARTIFACT_DIR),
    jsonPath: String(options.jsonPath),
    markdownPath: String(options.markdownPath),
    summaryPath: String(options.summaryPath),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:orchestrate -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>       Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>               JSON plan artifact path. Default: .agent-factory/factory-orchestrator-plan.json",
    "  --markdown <path>           Markdown plan artifact path. Default: .agent-factory/factory-orchestrator-plan.md",
    "  --summary <path>            Markdown summary path. Default: .agent-factory/agent-factory-orchestrator-summary.md",
    "  --stdout <mode>             markdown, json, or none. Default: markdown",
    "",
    "AF012 v1 is report-only. It recommends the next safe Agent Factory step but never runs it.",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${String(content).replace(/\s*$/, "")}\n`, "utf8");
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll("\\", "/");
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function githubActor() {
  return process.env.GITHUB_ACTOR ?? process.env.USERNAME ?? process.env.USER ?? "local";
}

function workflowRunId() {
  return process.env.GITHUB_RUN_ID ?? null;
}

function workflowName() {
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory Orchestrator";
}

function appendHistory(options, plan, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-orchestrator",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? "chachathecat/inverge",
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "orchestrate",
    mutationIntent: null,
    targetPrNumber: null,
    targetTaskId: null,
    status: plan.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: "not_required",
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("factory_orchestrator_plan", plan),
    ],
    blockedReasons: plan.blockedReasons,
    blockedReasonCodes: plan.blockedReasonCodes,
    guardrailSummary: {
      codexExecuted: false,
      codeMutationAttempted: false,
      branchMutationAttempted: false,
      prMetadataMutationAttempted: false,
      workflowRerunAttempted: false,
    },
  }, {
    historyPath: historyPathFor(options),
    markdownPath: historyMarkdownPathFor(options),
  });
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const plan = createAgentFactoryOrchestratorPlan({
    artifactDir: options.artifactDir,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAgentFactoryOrchestratorMarkdown(plan);
  const summary = buildAgentFactoryOrchestratorSummary(plan);
  const jsonPath = path.resolve(process.cwd(), options.jsonPath);
  const markdownPath = path.resolve(process.cwd(), options.markdownPath);
  const summaryPath = path.resolve(process.cwd(), options.summaryPath);

  writeFile(jsonPath, json);
  writeFile(markdownPath, markdown);
  writeFile(summaryPath, summary);
  appendHistory(options, plan, [jsonPath, markdownPath, summaryPath]);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(summary);
  }

  if (plan.status === "blocked") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-orchestrate: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
