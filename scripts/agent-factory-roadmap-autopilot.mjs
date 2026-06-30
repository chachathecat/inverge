#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildAgentFactoryRoadmapAutopilotMarkdown,
  buildAgentFactoryRoadmapAutopilotSummary,
  createAgentFactoryRoadmapAutopilotPlan,
} from "../lib/agent-factory/roadmap-autopilot.ts";
import {
  appendAgentFactoryRunHistory,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

const STDOUT_MODES = ["markdown", "json", "none"];
const APPROVAL_GATES = ["not_requested", "missing", "approved", "failed_closed"];
const CI_CONCLUSIONS = ["success", "failure", "cancelled", "skipped", "unknown"];
const DEFAULT_ARTIFACT_DIR = ".agent-factory";

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    jsonPath:
      process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_JSON ??
      ".agent-factory/roadmap-autopilot-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_MARKDOWN ??
      ".agent-factory/roadmap-autopilot-plan.md",
    summaryPath:
      process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_SUMMARY ??
      ".agent-factory/agent-factory-roadmap-autopilot-summary.md",
    stdout: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_STDOUT ?? "markdown",
    approvalGate: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_APPROVAL_GATE ?? "not_requested",
    currentPhase: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_CURRENT_PHASE ?? "",
    lastCompletedStep: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_LAST_COMPLETED_STEP ?? "",
    openIssueCount: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_OPEN_ISSUE_COUNT ?? "",
    openPrCount: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_OPEN_PR_COUNT ?? "",
    latestCiConclusion: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_LATEST_CI_CONCLUSION ?? "",
    maxCandidateCount: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_MAX_CANDIDATES ?? "5",
    maxPromptBytes: process.env.AGENT_FACTORY_ROADMAP_AUTOPILOT_MAX_PROMPT_BYTES ?? "4000",
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

    if ((arg === "--current-phase" || arg === "--current_phase") && next) {
      options.currentPhase = next;
      index += 1;
      continue;
    }

    if ((arg === "--last-completed-step" || arg === "--last_completed_step") && next) {
      options.lastCompletedStep = next;
      index += 1;
      continue;
    }

    if ((arg === "--open-issue-count" || arg === "--open_issue_count") && next) {
      options.openIssueCount = next;
      index += 1;
      continue;
    }

    if ((arg === "--open-pr-count" || arg === "--open_pr_count") && next) {
      options.openPrCount = next;
      index += 1;
      continue;
    }

    if ((arg === "--latest-ci-conclusion" || arg === "--latest_ci_conclusion") && next) {
      options.latestCiConclusion = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-candidates" || arg === "--max_candidates") && next) {
      options.maxCandidateCount = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-prompt-bytes" || arg === "--max_prompt_bytes") && next) {
      options.maxPromptBytes = next;
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
  const latestCiConclusion = String(options.latestCiConclusion ?? "").trim();

  if (options.help) return { ...options, stdout, approvalGate, latestCiConclusion };

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  if (!APPROVAL_GATES.includes(approvalGate)) {
    throw new Error(`Invalid approval gate "${approvalGate}". Use one of: ${APPROVAL_GATES.join(", ")}.`);
  }

  if (latestCiConclusion && !CI_CONCLUSIONS.includes(latestCiConclusion)) {
    throw new Error(`Invalid latest CI conclusion "${latestCiConclusion}". Use one of: ${CI_CONCLUSIONS.join(", ")}.`);
  }

  for (const [label, value] of [
    ["open_issue_count", options.openIssueCount],
    ["open_pr_count", options.openPrCount],
  ]) {
    if (value && !/^\d+$/.test(String(value).trim())) {
      throw new Error(`${label} must be zero or a positive integer when provided.`);
    }
  }

  for (const [label, value] of [
    ["max_candidates", options.maxCandidateCount],
    ["max_prompt_bytes", options.maxPromptBytes],
  ]) {
    if (value && (!/^\d+$/.test(String(value).trim()) || Number(String(value).trim()) <= 0)) {
      throw new Error(`${label} must be a positive integer when provided.`);
    }
  }

  return {
    ...options,
    stdout,
    approvalGate,
    latestCiConclusion,
    artifactDir: String(options.artifactDir ?? DEFAULT_ARTIFACT_DIR),
    jsonPath: String(options.jsonPath),
    markdownPath: String(options.markdownPath),
    summaryPath: String(options.summaryPath),
    currentPhase: String(options.currentPhase ?? "").trim(),
    lastCompletedStep: String(options.lastCompletedStep ?? "").trim(),
    openIssueCount: String(options.openIssueCount ?? "").trim(),
    openPrCount: String(options.openPrCount ?? "").trim(),
    maxCandidateCount: String(options.maxCandidateCount ?? "5").trim(),
    maxPromptBytes: String(options.maxPromptBytes ?? "4000").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:roadmap-autopilot -- [options]",
    "",
    "Options:",
    "  --artifact-dir <path>              Local generated Agent Factory artifact directory. Default: .agent-factory",
    "  --json <path>                      JSON plan artifact path. Default: .agent-factory/roadmap-autopilot-plan.json",
    "  --markdown <path>                  Markdown plan artifact path. Default: .agent-factory/roadmap-autopilot-plan.md",
    "  --summary <path>                   Markdown summary path. Default: .agent-factory/agent-factory-roadmap-autopilot-summary.md",
    "  --stdout <mode>                    markdown, json, or none. Default: markdown",
    "  --approval-gate <gate>             not_requested, missing, approved, or failed_closed.",
    "  --current-phase <text>             Optional current roadmap phase metadata.",
    "  --last-completed-step <text>       Optional last completed Agent Factory step metadata.",
    "  --open-issue-count <number>        Optional open issue count metadata.",
    "  --open-pr-count <number>           Optional open PR count metadata.",
    "  --latest-ci-conclusion <value>     success, failure, cancelled, skipped, or unknown.",
    "  --max-candidates <number>          Maximum roadmap candidates to emit. Default: 5",
    "  --max-prompt-bytes <number>        Maximum bytes per generated preview. Default: 4000",
    "  --help                             Show this help text.",
    "",
    "AF015 v1 is metadata-only. It proposes the next roadmap work item without creating issues, running Codex, mutating Git/GitHub, rerunning workflows, or editing source.",
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
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory Roadmap Autopilot";
}

function historyPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.jsonl");
}

function historyMarkdownPathFor(options) {
  return path.resolve(process.cwd(), options.artifactDir, "run-history.md");
}

function approvalGateOutcome(plan) {
  if (plan.autopilotBoundary.approvalGate === "approved") return "approved_but_blocked";
  if (
    plan.autopilotBoundary.approvalGate === "missing" ||
    plan.autopilotBoundary.approvalGate === "failed_closed"
  ) {
    return "missing_or_invalid";
  }
  return "dry_run_not_required";
}

function appendHistory(options, plan, artifactPaths) {
  return appendAgentFactoryRunHistory({
    source: "agent-factory-roadmap-autopilot",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? plan.source.repository,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: "roadmap_autopilot_plan",
    mutationIntent: "roadmap_autopilot_report_only",
    targetPrNumber: null,
    targetTaskId: plan.selectedCandidate.id,
    status: plan.status === "blocked" ? "rejected" : "success",
    dryRun: true,
    approvalGateOutcome: approvalGateOutcome(plan),
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests: [
      createAgentFactoryPayloadDigest("roadmap_autopilot_plan", plan),
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

  const plan = createAgentFactoryRoadmapAutopilotPlan({
    artifactDir: options.artifactDir,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    actor: githubActor(),
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    currentPhase: options.currentPhase || null,
    lastCompletedStep: options.lastCompletedStep || null,
    openIssueCount: options.openIssueCount || null,
    openPrCount: options.openPrCount || null,
    latestCiConclusion: options.latestCiConclusion || null,
    maxCandidateCount: options.maxCandidateCount,
    maxPromptBytes: options.maxPromptBytes,
    approvalGate: options.approvalGate,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAgentFactoryRoadmapAutopilotMarkdown(plan);
  const summary = buildAgentFactoryRoadmapAutopilotSummary(plan);
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
    `agent-factory-roadmap-autopilot: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
