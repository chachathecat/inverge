#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryPlannerNoteMarkdown,
  buildAgentFactoryPlannerNoteSummary,
  createAgentFactoryPlannerNote,
} from "../lib/agent-factory/factory-planner-notes.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const APPROVAL_GATES = ["not_requested", "missing", "approved", "failed_closed"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_PLANNER_NOTES_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_PLANNER_NOTES_JSON ??
      ".agent-factory/factory-planner-note.json",
    markdownPath:
      process.env.AGENT_FACTORY_PLANNER_NOTES_MARKDOWN ??
      ".agent-factory/factory-planner-note.md",
    summaryPath:
      process.env.AGENT_FACTORY_PLANNER_NOTES_SUMMARY ??
      ".agent-factory/agent-factory-planner-note-summary.md",
    stdout: process.env.AGENT_FACTORY_PLANNER_NOTES_STDOUT ?? "markdown",
    taskId: process.env.AGENT_FACTORY_PLANNER_NOTES_TASK_ID ?? "",
    prNumber: process.env.AGENT_FACTORY_PLANNER_NOTES_PR_NUMBER ?? "",
    baseBranch: process.env.AGENT_FACTORY_PLANNER_NOTES_BASE_BRANCH ?? "main",
    proposedBranchName: process.env.AGENT_FACTORY_PLANNER_NOTES_PROPOSED_BRANCH ?? "",
    proposedWorkspacePath: process.env.AGENT_FACTORY_PLANNER_NOTES_WORKSPACE ?? "",
    maxChangedFiles: process.env.AGENT_FACTORY_PLANNER_NOTES_MAX_CHANGED_FILES ?? "8",
    maxDiffBytes: process.env.AGENT_FACTORY_PLANNER_NOTES_MAX_DIFF_BYTES ?? "60000",
    approvalGate: process.env.AGENT_FACTORY_PLANNER_NOTES_APPROVAL_GATE ?? "not_requested",
    nextHumanStepLabel: process.env.AGENT_FACTORY_PLANNER_NOTES_NEXT_LABEL ?? "",
    inertCommandPreview: process.env.AGENT_FACTORY_PLANNER_NOTES_INERT_COMMAND_PREVIEW ?? "",
    allowedPathPrefixes: [],
    forbiddenPathPrefixes: [],
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

    if ((arg === "--max-diff-bytes" || arg === "--max_diff_bytes") && next) {
      options.maxDiffBytes = next;
      index += 1;
      continue;
    }

    if ((arg === "--approval-gate" || arg === "--approval_gate") && next) {
      options.approvalGate = next;
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
    maxDiffBytes: String(options.maxDiffBytes ?? "60000").trim(),
    nextHumanStepLabel: String(options.nextHumanStepLabel ?? "").trim(),
    inertCommandPreview: String(options.inertCommandPreview ?? "").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:planner-notes -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>          Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>                  JSON note artifact path. Default: .agent-factory/factory-planner-note.json",
    "  --markdown <path>              Markdown note artifact path. Default: .agent-factory/factory-planner-note.md",
    "  --summary <path>               Markdown summary path. Default: .agent-factory/agent-factory-planner-note-summary.md",
    "  --stdout <mode>                markdown, json, or none. Default: markdown",
    "  --task-id <id>                 Optional task id to record in metadata.",
    "  --pr-number <number>           Optional PR number to record in metadata.",
    "  --base-branch <branch>          Base branch metadata. Default: main",
    "  --proposed-branch <branch>      Proposed branch metadata.",
    "  --workspace <path>              Proposed isolated workspace path metadata.",
    "  --allowed-path-prefix <prefix>  Repeatable allowed path prefix metadata.",
    "  --forbidden-path-prefix <prefix> Repeatable forbidden path prefix metadata.",
    "  --max-changed-files <number>    Boundary metadata. Default: 8",
    "  --max-diff-bytes <number>       Boundary metadata. Default: 60000",
    "  --approval-gate <gate>          not_requested, missing, approved, or failed_closed.",
    "  --instruction <text>            Repeatable human instruction metadata.",
    "",
    "AF013A v1 is report-only. It writes local planning notes and never executes commands or mutates code/GitHub.",
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
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory Planner Notes";
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function approvalGateOutcome(note) {
  if (note.boundary.approvalGate === "approved") return "approved_but_blocked";
  if (note.boundary.approvalGate === "missing" || note.boundary.approvalGate === "failed_closed") {
    return "missing_or_invalid";
  }
  return "dry_run_not_required";
}

function appendHistory(options, note, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-planner-notes",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? note.source.repository,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "planner_note",
    mutationIntent: null,
    targetPrNumber: note.target.prNumber,
    targetTaskId: note.target.taskId,
    status: note.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: approvalGateOutcome(note),
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("factory_planner_note", note),
    ],
    blockedReasons: note.blockedReasons,
    blockedReasonCodes: note.blockedReasonCodes,
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

  const note = createAgentFactoryPlannerNote({
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
    maxDiffBytes: options.maxDiffBytes,
    approvalGate: options.approvalGate,
    nextHumanStepLabel: options.nextHumanStepLabel || null,
    inertCommandPreview: options.inertCommandPreview || null,
    instructions: options.instructions,
  });
  const json = JSON.stringify(note, null, 2);
  const markdown = buildAgentFactoryPlannerNoteMarkdown(note);
  const summary = buildAgentFactoryPlannerNoteSummary(note);
  const jsonPath = path.resolve(process.cwd(), options.jsonPath);
  const markdownPath = path.resolve(process.cwd(), options.markdownPath);
  const summaryPath = path.resolve(process.cwd(), options.summaryPath);

  writeFile(jsonPath, json);
  writeFile(markdownPath, markdown);
  writeFile(summaryPath, summary);
  appendHistory(options, note, [jsonPath, markdownPath, summaryPath]);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(summary);
  }

  if (note.status === "blocked") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-planner-notes: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
