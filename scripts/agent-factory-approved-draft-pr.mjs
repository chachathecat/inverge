#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  AF018_APPROVAL_PHRASE,
  buildAf018DraftPrPlanMarkdown,
  buildAf018ValidationSummary,
  createAf018DraftPrPlan,
} from "../lib/agent-factory/approved-draft-pr-creator.ts";

const STDOUT_MODES = ["markdown", "json", "none"];

function readTextIfExists(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) return null;
  return fs.readFileSync(resolved, "utf8");
}

function readJsonFile(filePath, label) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function readChangedFiles(filePath) {
  const text = readTextIfExists(filePath);
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function writeFile(filePath, content) {
  const resolved = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${String(content).replace(/\s*$/, "")}\n`, "utf8");
}

function optionalValue(argv, index) {
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) return { value: "", consumed: false };
  return { value: next, consumed: true };
}

function parseArguments(argv) {
  const options = {
    input: process.env.AGENT_FACTORY_AF018_PACKAGE_JSON ?? ".agent-factory/codex-task-packages.json",
    changedFilesPath:
      process.env.AGENT_FACTORY_AF018_CHANGED_FILES ?? ".agent-factory/af018-changed-files.txt",
    jsonPath:
      process.env.AGENT_FACTORY_AF018_JSON ?? ".agent-factory/af018-draft-pr-plan.json",
    markdownPath:
      process.env.AGENT_FACTORY_AF018_MARKDOWN ?? ".agent-factory/af018-draft-pr-plan.md",
    contractPath:
      process.env.AGENT_FACTORY_AF018_PR_BODY ?? ".agent-factory/af018-pr-body.md",
    summaryPath:
      process.env.AGENT_FACTORY_AF018_SUMMARY ?? ".agent-factory/af018-validation-summary.md",
    validationSummaryInput: process.env.AGENT_FACTORY_AF018_VALIDATION_SUMMARY_INPUT ?? "",
    stdout: process.env.AGENT_FACTORY_AF018_STDOUT ?? "markdown",
    targetIssue: process.env.AGENT_FACTORY_AF018_TARGET_ISSUE ?? "",
    targetRoadmapItem: process.env.AGENT_FACTORY_AF018_TARGET_ROADMAP_ITEM ?? "",
    actor: process.env.AGENT_FACTORY_AF018_ACTOR ?? process.env.GITHUB_ACTOR ?? process.env.USERNAME ?? process.env.USER ?? "local",
    repository: process.env.GITHUB_REPOSITORY ?? "chachathecat/inverge",
    workflowName: process.env.GITHUB_WORKFLOW ?? "Agent Factory Codex Connected",
    workflowRunId: process.env.GITHUB_RUN_ID ?? "",
    dryRun: process.env.AGENT_FACTORY_AF018_DRY_RUN ?? "true",
    approvalPhrase: process.env.AGENT_FACTORY_AF018_APPROVAL_PHRASE ?? "",
    baseBranch: process.env.AGENT_FACTORY_AF018_BASE_BRANCH ?? "main",
    branchName: process.env.AGENT_FACTORY_AF018_BRANCH ?? "",
    commitTitle: process.env.AGENT_FACTORY_AF018_COMMIT_TITLE ?? "",
    prTitle: process.env.AGENT_FACTORY_AF018_PR_TITLE ?? "",
    maxChangedFiles: process.env.AGENT_FACTORY_AF018_MAX_CHANGED_FILES ?? "12",
    allowedActors: [],
    allowedPathPrefixes: [],
    forbiddenPathPrefixes: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
      continue;
    }

    if ((arg === "--changed-files" || arg === "--changed_files") && next) {
      options.changedFilesPath = next;
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

    if ((arg === "--pr-body" || arg === "--pr_body") && next) {
      options.contractPath = next;
      index += 1;
      continue;
    }

    if (arg === "--summary" && next) {
      options.summaryPath = next;
      index += 1;
      continue;
    }

    if ((arg === "--validation-summary-input" || arg === "--validation_summary_input") && next) {
      options.validationSummaryInput = next;
      index += 1;
      continue;
    }

    if ((arg === "--target-issue" || arg === "--target_issue") && next) {
      options.targetIssue = next;
      index += 1;
      continue;
    }

    if ((arg === "--target-roadmap-item" || arg === "--target_roadmap_item") && next) {
      options.targetRoadmapItem = next;
      index += 1;
      continue;
    }

    if (arg === "--actor" && next) {
      options.actor = next;
      index += 1;
      continue;
    }

    if ((arg === "--allowed-actor" || arg === "--allowed_actor") && next) {
      options.allowedActors.push(next);
      index += 1;
      continue;
    }

    if ((arg === "--dry-run" || arg === "--dry_run") && next) {
      options.dryRun = next;
      index += 1;
      continue;
    }

    if ((arg === "--approval-phrase" || arg === "--approval_phrase")) {
      const parsed = optionalValue(argv, index);
      options.approvalPhrase = parsed.value;
      if (parsed.consumed) index += 1;
      continue;
    }

    if ((arg === "--base-branch" || arg === "--base_branch") && next) {
      options.baseBranch = next;
      index += 1;
      continue;
    }

    if (arg === "--branch" && next) {
      options.branchName = next;
      index += 1;
      continue;
    }

    if ((arg === "--commit-title" || arg === "--commit_title") && next) {
      options.commitTitle = next;
      index += 1;
      continue;
    }

    if ((arg === "--pr-title" || arg === "--pr_title") && next) {
      options.prTitle = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-changed-files" || arg === "--max_changed_files") && next) {
      options.maxChangedFiles = next;
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
    targetIssue: String(options.targetIssue ?? "").trim(),
    targetRoadmapItem: String(options.targetRoadmapItem ?? "").trim(),
    dryRun: String(options.dryRun ?? "true").trim(),
    approvalPhrase: String(options.approvalPhrase ?? ""),
    maxChangedFiles: String(options.maxChangedFiles ?? "12").trim(),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:approved-draft-pr -- [options]",
    "",
    "Required target options:",
    "  --target-issue <number>          GitHub issue for the single closing reference.",
    "  --target-roadmap-item <id>       Roadmap item id selected from the task package.",
    "",
    "Safety options:",
    `  --dry-run <true|false>          Defaults to true. false requires: ${AF018_APPROVAL_PHRASE}`,
    "  --approval-phrase <text>         Exact approval phrase for non-dry-run.",
    "  --allowed-actor <login>          Repeatable actor allowlist entry. Default: chachathecat.",
    "  --changed-files <path>           Newline-delimited changed file list.",
    "  --max-changed-files <number>     Default: 12.",
    "",
    "Output options:",
    "  --json <path>                    Default: .agent-factory/af018-draft-pr-plan.json",
    "  --markdown <path>                Default: .agent-factory/af018-draft-pr-plan.md",
    "  --pr-body <path>                 Default: .agent-factory/af018-pr-body.md",
    "  --summary <path>                 Default: .agent-factory/af018-validation-summary.md",
    "  --stdout <markdown|json|none>    Default: markdown.",
  ].join("\n");
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const packageInput = readJsonFile(options.input, "AF018 package input");
  const validationSummaryText = readTextIfExists(options.validationSummaryInput);
  const { plan, generatedContract } = createAf018DraftPrPlan({
    packageInput,
    changedFiles: readChangedFiles(options.changedFilesPath),
    targetIssue: options.targetIssue,
    targetRoadmapItem: options.targetRoadmapItem,
    actor: options.actor,
    allowedActors: options.allowedActors,
    repository: options.repository,
    workflowName: options.workflowName,
    workflowRunId: options.workflowRunId,
    dryRun: options.dryRun,
    approvalPhrase: options.approvalPhrase,
    baseBranch: options.baseBranch,
    branchName: options.branchName,
    commitTitle: options.commitTitle,
    prTitle: options.prTitle,
    maxChangedFiles: options.maxChangedFiles,
    allowedPathPrefixes: options.allowedPathPrefixes,
    forbiddenPathPrefixes: options.forbiddenPathPrefixes,
    validationSummaryText,
    generatedContractPath: options.contractPath,
    validationSummaryPath: options.summaryPath,
  });
  const json = JSON.stringify(plan, null, 2);
  const markdown = buildAf018DraftPrPlanMarkdown(plan);
  const generatedSummary = validationSummaryText
    ? validationSummaryText
    : buildAf018ValidationSummary({ plan });

  writeFile(options.jsonPath, json);
  writeFile(options.markdownPath, markdown);
  writeFile(options.contractPath, generatedContract);
  writeFile(options.summaryPath, generatedSummary);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(markdown);
  }

  if (plan.status === "rejected") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`agent-factory-approved-draft-pr: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
