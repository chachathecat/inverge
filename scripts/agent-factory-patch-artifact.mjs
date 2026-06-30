#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryPatchArtifactMarkdown,
  buildAgentFactoryPatchArtifactSummary,
  createAgentFactoryPatchArtifactPlan,
} from "../lib/agent-factory/patch-artifact-adapter.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const APPROVAL_GATES = ["not_requested", "missing", "approved", "failed_closed"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_PATCH_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_PATCH_ARTIFACT_JSON ??
      ".agent-factory/factory-patch-artifact-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_PATCH_ARTIFACT_MARKDOWN ??
      ".agent-factory/factory-patch-artifact-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_PATCH_ARTIFACT_SUMMARY ??
      ".agent-factory/agent-factory-patch-artifact-summary.md",
    stdout: process.env.AGENT_FACTORY_PATCH_ARTIFACT_STDOUT ?? "markdown",
    taskId: process.env.AGENT_FACTORY_PATCH_ARTIFACT_TASK_ID ?? "",
    prNumber: process.env.AGENT_FACTORY_PATCH_ARTIFACT_PR_NUMBER ?? "",
    baseBranch: process.env.AGENT_FACTORY_PATCH_ARTIFACT_BASE_BRANCH ?? "main",
    proposedBranchName: process.env.AGENT_FACTORY_PATCH_ARTIFACT_PROPOSED_BRANCH ?? "",
    proposedWorkspacePath: process.env.AGENT_FACTORY_PATCH_ARTIFACT_WORKSPACE ?? "",
    maxChangedFiles: process.env.AGENT_FACTORY_PATCH_ARTIFACT_MAX_CHANGED_FILES ?? "8",
    maxPatchBytes: process.env.AGENT_FACTORY_PATCH_ARTIFACT_MAX_PATCH_BYTES ?? "60000",
    approvalGate: process.env.AGENT_FACTORY_PATCH_ARTIFACT_APPROVAL_GATE ?? "not_requested",
    nextHumanStepLabel: process.env.AGENT_FACTORY_PATCH_ARTIFACT_NEXT_LABEL ?? "",
    inertCommandPreview: process.env.AGENT_FACTORY_PATCH_ARTIFACT_INERT_COMMAND_PREVIEW ?? "",
    allowedPathPrefixes: [],
    forbiddenPathPrefixes: [],
    proposedPatchArtifactPaths: [],
    instructions: [],
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

    if ((arg === "--proposed-branch" || arg === "--proposed_branch") && next) {
      options.proposedBranchName = next;
      index += 1;
      continue;
    }

    if ((arg === "--workspace" || arg === "--proposed-workspace") && next) {
      options.proposedWorkspacePath = next;
      index += 1;
      continue;
    }

    if ((arg === "--allowed-path-prefix" || arg === "--allowed_path_prefix") && next) {
      options.allowedPathPrefixes.push(next);
      index += 1;
      continue;
    }

    if ((arg === "--forbidden-path-prefix" || arg === "--forbidden_path_prefix") && next) {
      options.forbiddenPathPrefixes.push(next);
      index += 1;
      continue;
    }

    if ((arg === "--max-changed-files" || arg === "--max_changed_files") && next) {
      options.maxChangedFiles = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-patch-bytes" || arg === "--max_patch_bytes") && next) {
      options.maxPatchBytes = next;
      index += 1;
      continue;
    }

    if ((arg === "--approval-gate" || arg === "--approval_gate") && next) {
      options.approvalGate = next;
      index += 1;
      continue;
    }

    if (
      (arg === "--patch-artifact" ||
        arg === "--proposed-patch-artifact" ||
        arg === "--proposed_patch_artifact") &&
      next
    ) {
      options.proposedPatchArtifactPaths.push(next);
      index += 1;
      continue;
    }

    if ((arg === "--next-label" || arg === "--next_label") && next) {
      options.nextHumanStepLabel = next;
      index += 1;
      continue;
    }

    if ((arg === "--inert-command-preview" || arg === "--inert_command_preview") && next) {
      options.inertCommandPreview = next;
      index += 1;
      continue;
    }

    if (arg === "--instruction" && next) {
      options.instructions.push(next);
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
    taskId: String(options.taskId ?? "").trim(),
    prNumber: String(options.prNumber ?? "").trim(),
    baseBranch: String(options.baseBranch ?? "main").trim() || "main",
    proposedBranchName: String(options.proposedBranchName ?? "").trim(),
    proposedWorkspacePath: String(options.proposedWorkspacePath ?? "").trim(),
    maxChangedFiles: String(options.maxChangedFiles ?? "8").trim(),
    maxPatchBytes: String(options.maxPatchBytes ?? "60000").trim(),
    nextHumanStepLabel: String(options.nextHumanStepLabel ?? "").trim(),
    inertCommandPreview: String(options.inertCommandPreview ?? "").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:patch-artifact -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>             Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>                     JSON plan artifact path. Default: .agent-factory/factory-patch-artifact-plan.json",
    "  --markdown <path>                 Markdown plan artifact path. Default: .agent-factory/factory-patch-artifact-plan.md",
    "  --summary <path>                  Markdown summary path. Default: .agent-factory/agent-factory-patch-artifact-summary.md",
    "  --stdout <mode>                   markdown, json, or none. Default: markdown",
    "  --task-id <id>                    Optional task id to record in metadata.",
    "  --pr-number <number>              Optional PR number to record in metadata.",
    "  --base-branch <branch>             Base branch metadata. Default: main",
    "  --proposed-branch <branch>         Proposed branch metadata.",
    "  --workspace <path>                 Proposed isolated workspace path metadata.",
    "  --allowed-path-prefix <prefix>     Repeatable allowed path prefix metadata.",
    "  --forbidden-path-prefix <prefix>   Repeatable forbidden path prefix metadata.",
    "  --max-changed-files <number>       Boundary metadata. Default: 8",
    "  --max-patch-bytes <number>         Boundary metadata. Default: 60000",
    "  --approval-gate <gate>             not_requested, missing, approved, or failed_closed.",
    "  --patch-artifact <path>            Repeatable local patch/diff review artifact path to hash only.",
    "  --instruction <text>               Repeatable human instruction metadata.",
    "",
    "AF013B v1 is report-only. It writes local patch artifact metadata and never applies patches or mutates code/GitHub.",
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
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory Patch Artifact";
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function approvalGateOutcome(plan) {
  if (plan.patchBoundary.approvalGate === "approved") return "approved_but_blocked";
  if (plan.patchBoundary.approvalGate === "missing" || plan.patchBoundary.approvalGate === "failed_closed") {
    return "missing_or_invalid";
  }
  return "dry_run_not_required";
}

function appendHistory(options, plan, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-patch-artifact",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? plan.source.repository,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "patch_artifact_plan",
    mutationIntent: null,
    targetPrNumber: plan.target.prNumber,
    targetTaskId: plan.target.taskId,
    status: plan.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: approvalGateOutcome(plan),
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("patch_artifact_plan", plan),
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

  const plan = createAgentFactoryPatchArtifactPlan({
    artifactDir: options.artifactDir,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    actor: githubActor(),
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    taskId: options.taskId || null,
    prNumber: options.prNumber || null,
    baseBranch: options.baseBranch,
    proposedBranchName: options.proposedBranchName || null,
    proposedWorkspacePath: options.proposedWorkspacePath || null,
    allowedPathPrefixes: options.allowedPathPrefixes,
    forbiddenPathPrefixes: options.forbiddenPathPrefixes,
    maxChangedFiles: options.maxChangedFiles,
    maxPatchBytes: options.maxPatchBytes,
    approvalGate: options.approvalGate,
    proposedPatchArtifactPaths: options.proposedPatchArtifactPaths,
    nextHumanStepLabel: options.nextHumanStepLabel || null,
    inertCommandPreview: options.inertCommandPreview || null,
    instructions: options.instructions,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAgentFactoryPatchArtifactMarkdown(plan);
  const summary = buildAgentFactoryPatchArtifactSummary(plan);
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
    `agent-factory-patch-artifact: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
