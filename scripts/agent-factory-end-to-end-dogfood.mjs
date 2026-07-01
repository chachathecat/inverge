#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryEndToEndDogfoodMarkdown,
  buildAgentFactoryEndToEndDogfoodSummary,
  createAgentFactoryEndToEndDogfoodPlan,
} from "../lib/agent-factory/end-to-end-dogfood.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_JSON ??
      ".agent-factory/end-to-end-factory-dogfood-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_MARKDOWN ??
      ".agent-factory/end-to-end-factory-dogfood-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_SUMMARY ??
      ".agent-factory/agent-factory-end-to-end-dogfood-summary.md",
    stdout: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_STDOUT ?? "markdown",
    taskId: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_TASK_ID ?? "",
    issueNumber: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_ISSUE_NUMBER ?? "",
    prNumber: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_PR_NUMBER ?? "",
    baseBranch: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_BASE_BRANCH ?? "main",
    headSha: process.env.AGENT_FACTORY_END_TO_END_DOGFOOD_HEAD_SHA ?? "",
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

    if ((arg === "--task-id" || arg === "--task_id") && next) {
      options.taskId = next;
      index += 1;
      continue;
    }

    if ((arg === "--issue-number" || arg === "--issue_number") && next) {
      options.issueNumber = next;
      index += 1;
      continue;
    }

    if ((arg === "--pr-number" || arg === "--pr_number") && next) {
      options.prNumber = next;
      index += 1;
      continue;
    }

    if ((arg === "--base-branch" || arg === "--base_branch") && next) {
      options.baseBranch = next;
      index += 1;
      continue;
    }

    if ((arg === "--head-sha" || arg === "--head_sha") && next) {
      options.headSha = next;
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

  if (options.issueNumber && !/^\d+$/.test(String(options.issueNumber).trim())) {
    throw new Error("issue_number must be a positive integer when provided.");
  }

  if (options.prNumber && !/^\d+$/.test(String(options.prNumber).trim())) {
    throw new Error("pr_number must be a positive integer when provided.");
  }

  return {
    ...options,
    stdout,
    artifactDir: String(options.artifactDir ?? DEFAULT_ARTIFACT_DIR),
    jsonPath: String(options.jsonPath),
    markdownPath: String(options.markdownPath),
    summaryPath: String(options.summaryPath),
    taskId: String(options.taskId ?? "").trim(),
    issueNumber: String(options.issueNumber ?? "").trim(),
    prNumber: String(options.prNumber ?? "").trim(),
    baseBranch: String(options.baseBranch ?? "main").trim() || "main",
    headSha: String(options.headSha ?? "").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:end-to-end-dogfood -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>       Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>               JSON plan artifact path. Default: .agent-factory/end-to-end-factory-dogfood-plan.json",
    "  --markdown <path>           Markdown plan artifact path. Default: .agent-factory/end-to-end-factory-dogfood-plan.md",
    "  --summary <path>            Markdown summary path. Default: .agent-factory/agent-factory-end-to-end-dogfood-summary.md",
    "  --stdout <mode>             markdown, json, or none. Default: markdown",
    "  --task-id <id>              Optional task id metadata.",
    "  --issue-number <number>     Optional GitHub issue number metadata.",
    "  --pr-number <number>        Optional PR number metadata.",
    "  --base-branch <branch>      Base branch metadata. Default: main",
    "  --head-sha <sha>            Optional head SHA metadata.",
    "  --help                      Show this help text.",
    "",
    "AF016 v1 is metadata-only. It dogfoods the local AF010 through AF015 planning chain without running Codex, shell commands, patches, Git, GitHub, or workflow mutation.",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${String(content).replace(/\s*$/, "")}\n`, "utf8");
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll("\\", "/");
}

function githubActor() {
  return process.env.GITHUB_ACTOR ?? process.env.USERNAME ?? process.env.USER ?? "local";
}

function workflowRunId() {
  return process.env.GITHUB_RUN_ID ?? null;
}

function workflowName() {
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory End-to-End Dogfood";
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function appendHistory(options, plan, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-end-to-end-dogfood",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? plan.source.repository,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "end_to_end_factory_dogfood_plan",
    mutationIntent: "end_to_end_factory_dogfood_report_only",
    targetPrNumber: plan.target.prNumber,
    targetTaskId: plan.target.taskId,
    status: plan.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("end_to_end_factory_dogfood_plan", plan),
    ],
    blockedReasons: plan.blockedReasons,
    blockedReasonCodes: plan.blockedReasonCodes,
    guardrailSummary: {
      codexExecuted: false,
      codeMutationAttempted: false,
      branchMutationAttempted: false,
      prMetadataMutationAttempted: false,
      workflowRerunAttempted: false,
      learnerRuntimeTouched: false,
      ocrTouched: false,
      providerTouched: false,
      billingTouched: false,
      authTouched: false,
      paymentTouched: false,
      productionApiTouched: false,
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

  const plan = createAgentFactoryEndToEndDogfoodPlan({
    artifactDir: options.artifactDir,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    actor: githubActor(),
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    taskId: options.taskId || null,
    issueNumber: options.issueNumber || null,
    prNumber: options.prNumber || null,
    baseBranch: options.baseBranch,
    headSha: options.headSha || null,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAgentFactoryEndToEndDogfoodMarkdown(plan);
  const summary = buildAgentFactoryEndToEndDogfoodSummary(plan);
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
    `agent-factory-end-to-end-dogfood: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
