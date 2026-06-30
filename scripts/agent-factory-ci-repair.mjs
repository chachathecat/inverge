#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryCiRepairMarkdown,
  buildAgentFactoryCiRepairSummary,
  createAgentFactoryCiRepairPlan,
} from "../lib/agent-factory/ci-repair-loop.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const APPROVAL_GATES = ["not_requested", "missing", "approved", "failed_closed"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_CI_REPAIR_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_CI_REPAIR_JSON ??
      ".agent-factory/ci-repair-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_CI_REPAIR_MARKDOWN ??
      ".agent-factory/ci-repair-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_CI_REPAIR_SUMMARY ??
      ".agent-factory/agent-factory-ci-repair-summary.md",
    stdout: process.env.AGENT_FACTORY_CI_REPAIR_STDOUT ?? "markdown",
    approvalGate: process.env.AGENT_FACTORY_CI_REPAIR_APPROVAL_GATE ?? "not_requested",
    prNumber: process.env.AGENT_FACTORY_CI_REPAIR_PR_NUMBER ?? "",
    headSha: process.env.AGENT_FACTORY_CI_REPAIR_HEAD_SHA ?? "",
    branchName: process.env.AGENT_FACTORY_CI_REPAIR_BRANCH ?? "",
    baseBranch: process.env.AGENT_FACTORY_CI_REPAIR_BASE_BRANCH ?? "main",
    taskId: process.env.AGENT_FACTORY_CI_REPAIR_TASK_ID ?? "",
    maxSuggestedFiles: process.env.AGENT_FACTORY_CI_REPAIR_MAX_SUGGESTED_FILES ?? "8",
    maxSuggestedPatchBytes:
      process.env.AGENT_FACTORY_CI_REPAIR_MAX_SUGGESTED_PATCH_BYTES ?? "60000",
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

    if ((arg === "--approval-gate" || arg === "--approval_gate") && next) {
      options.approvalGate = next;
      index += 1;
      continue;
    }

    if ((arg === "--pr-number" || arg === "--pr_number") && next) {
      options.prNumber = next;
      index += 1;
      continue;
    }

    if ((arg === "--head-sha" || arg === "--head_sha") && next) {
      options.headSha = next;
      index += 1;
      continue;
    }

    if ((arg === "--branch" || arg === "--branch-name" || arg === "--branch_name") && next) {
      options.branchName = next;
      index += 1;
      continue;
    }

    if ((arg === "--base-branch" || arg === "--base_branch") && next) {
      options.baseBranch = next;
      index += 1;
      continue;
    }

    if ((arg === "--task-id" || arg === "--task_id") && next) {
      options.taskId = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-suggested-files" || arg === "--max_suggested_files") && next) {
      options.maxSuggestedFiles = next;
      index += 1;
      continue;
    }

    if (
      (arg === "--max-suggested-patch-bytes" ||
        arg === "--max_suggested_patch_bytes") &&
      next
    ) {
      options.maxSuggestedPatchBytes = next;
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
  const approvalGate = String(options.approvalGate).trim();

  if (options.help) return { ...options, stdout, approvalGate };

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  if (!APPROVAL_GATES.includes(approvalGate)) {
    throw new Error(`Invalid approval gate "${approvalGate}". Use one of: ${APPROVAL_GATES.join(", ")}.`);
  }

  if (options.prNumber && !/^\d+$/.test(String(options.prNumber).trim())) {
    throw new Error("pr_number must be a positive integer when provided.");
  }

  return {
    ...options,
    stdout,
    approvalGate,
    artifactDir: String(options.artifactDir ?? DEFAULT_ARTIFACT_DIR),
    jsonPath: String(options.jsonPath),
    markdownPath: String(options.markdownPath),
    summaryPath: String(options.summaryPath),
    prNumber: String(options.prNumber ?? "").trim(),
    headSha: String(options.headSha ?? "").trim(),
    branchName: String(options.branchName ?? "").trim(),
    baseBranch: String(options.baseBranch ?? "main").trim() || "main",
    taskId: String(options.taskId ?? "").trim(),
    maxSuggestedFiles: String(options.maxSuggestedFiles ?? "8").trim(),
    maxSuggestedPatchBytes: String(options.maxSuggestedPatchBytes ?? "60000").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:ci-repair -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>                 Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>                         JSON plan artifact path. Default: .agent-factory/ci-repair-plan.json",
    "  --markdown <path>                     Markdown plan artifact path. Default: .agent-factory/ci-repair-plan.md",
    "  --summary <path>                      Markdown summary path. Default: .agent-factory/agent-factory-ci-repair-summary.md",
    "  --stdout <mode>                       markdown, json, or none. Default: markdown",
    "  --approval-gate <gate>                not_requested, missing, approved, or failed_closed.",
    "  --pr-number <number>                  Optional PR number metadata.",
    "  --head-sha <sha>                      Optional head SHA metadata.",
    "  --branch <branch>                     Optional branch metadata.",
    "  --base-branch <branch>                Base branch metadata. Default: main",
    "  --task-id <id>                        Optional task id metadata.",
    "  --max-suggested-files <number>        Boundary metadata. Default: 8",
    "  --max-suggested-patch-bytes <number>  Boundary metadata. Default: 60000",
    "  --help                                Show this help text.",
    "",
    "AF014 v1 is metadata-only. It classifies local CI metadata and writes an inert repair plan without rerunning workflows or mutating Git/GitHub/source.",
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
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory CI Repair";
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function approvalGateOutcome(plan) {
  if (plan.repairBoundary.approvalGate === "approved") return "approved_but_blocked";
  if (
    plan.repairBoundary.approvalGate === "missing" ||
    plan.repairBoundary.approvalGate === "failed_closed"
  ) {
    return "missing_or_invalid";
  }
  return "dry_run_not_required";
}

function appendHistory(options, plan, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-ci-repair",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? plan.source.repository,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "ci_repair_plan",
    mutationIntent: "ci_repair_report_only",
    targetPrNumber: plan.target.prNumber,
    targetTaskId: plan.target.taskId,
    status: plan.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: approvalGateOutcome(plan),
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("ci_repair_plan", plan),
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

  const plan = createAgentFactoryCiRepairPlan({
    artifactDir: options.artifactDir,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    actor: githubActor(),
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    prNumber: options.prNumber || null,
    headSha: options.headSha || null,
    branchName: options.branchName || null,
    baseBranch: options.baseBranch,
    taskId: options.taskId || null,
    maxSuggestedFiles: options.maxSuggestedFiles,
    maxSuggestedPatchBytes: options.maxSuggestedPatchBytes,
    approvalGate: options.approvalGate,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAgentFactoryCiRepairMarkdown(plan);
  const summary = buildAgentFactoryCiRepairSummary(plan);
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
    `agent-factory-ci-repair: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
