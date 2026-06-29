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
import {
  appendAgentFactoryRunHistory,
  blockedReasonCodesFromReasons,
  createAgentFactoryPayloadDigest,
} from "../lib/agent-factory/run-history.ts";

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
  return process.env.GITHUB_WORKFLOW ?? "Agent Factory Codex Invocation";
}

function defaultHistoryPath() {
  return process.env.AGENT_FACTORY_RUN_HISTORY_JSONL ?? ".agent-factory/run-history.jsonl";
}

function defaultHistoryMarkdownPath() {
  return process.env.AGENT_FACTORY_RUN_HISTORY_MARKDOWN ?? ".agent-factory/run-history.md";
}

function approvalGateOutcome(plan, options) {
  if (plan?.dryRun === true || String(options?.dryRun ?? "true").toLowerCase() !== "false") {
    return "dry_run_not_required";
  }
  if (plan?.approvedForInvocation === true) return "approved_but_blocked";
  return "missing_or_invalid";
}

function targetTaskId(plan) {
  return plan?.taskPackage?.packageSummary?.itemId ?? plan?.taskPackage?.requestedItemId ?? null;
}

function appendInvocationHistory(options, status, input, plan, artifactPaths, error) {
  const blockedReasons = [
    ...(Array.isArray(plan?.blockedReasons) ? plan.blockedReasons : []),
    ...(error ? [error instanceof Error ? error.message : String(error)] : []),
  ];
  const explicitCodes = Array.isArray(plan?.blockedReasonCodes) ? plan.blockedReasonCodes : [];
  const payloadDigests = [
    createAgentFactoryPayloadDigest("invocation_options", {
      dryRun: options?.dryRun,
      itemId: options?.itemId,
      packageIndex: options?.packageIndex,
    }),
  ];

  if (input !== undefined) {
    payloadDigests.push(createAgentFactoryPayloadDigest("task_package_input", input));
  }
  if (plan) payloadDigests.push(createAgentFactoryPayloadDigest("codex_invocation_plan", plan));

  return appendAgentFactoryRunHistory({
    source: "agent-factory-codex-invocation",
    actorName: githubActor(),
    repository: process.env.GITHUB_REPOSITORY ?? null,
    workflowName: workflowName(),
    workflowRunId: workflowRunId(),
    mode: plan?.invocation?.mode ?? "dry_run_plan_only",
    mutationIntent: null,
    targetPrNumber: null,
    targetTaskId: targetTaskId(plan),
    status,
    dryRun: plan?.dryRun ?? String(options?.dryRun ?? "true").toLowerCase() !== "false",
    approvalGateOutcome: approvalGateOutcome(plan, options),
    artifactPaths: artifactPaths.map(relativePath),
    payloadDigests,
    blockedReasons,
    blockedReasonCodes: blockedReasonCodesFromReasons(blockedReasons, explicitCodes),
    guardrailSummary: {
      codexExecuted: false,
    },
  }, {
    historyPath: defaultHistoryPath(),
    markdownPath: defaultHistoryMarkdownPath(),
  });
}

function rawOption(argv, flags, fallback) {
  for (let index = 0; index < argv.length; index += 1) {
    if (flags.includes(argv[index])) {
      return argv[index + 1] && !String(argv[index + 1]).startsWith("--") ? argv[index + 1] : "";
    }
  }

  return fallback;
}

function safeOptionsFromArgv(argv) {
  if (argv.includes("--help")) return null;

  return {
    dryRun: rawOption(argv, ["--dry-run", "--dry_run"], process.env.AGENT_FACTORY_CODEX_INVOCATION_DRY_RUN ?? "true"),
    itemId: rawOption(argv, ["--item-id", "--item_id"], process.env.AGENT_FACTORY_CODEX_INVOCATION_ITEM_ID ?? ""),
    packageIndex: rawOption(argv, ["--package-index", "--package_index"], process.env.AGENT_FACTORY_CODEX_INVOCATION_PACKAGE_INDEX ?? ""),
  };
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const input = readInput(options);
  const plan = createCodexInvocationPlan(input, {
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
  appendInvocationHistory(
    options,
    plan.status === "rejected" ? "rejected" : "success",
    input,
    plan,
    [
      path.resolve(process.cwd(), options.jsonPath),
      path.resolve(process.cwd(), options.markdownPath),
      path.resolve(process.cwd(), options.summaryPath),
    ],
    null,
  );

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
  const options = safeOptionsFromArgv(process.argv.slice(2));
  if (options) {
    try {
      appendInvocationHistory(options, "failed", undefined, null, [], error);
    } catch (historyError) {
      console.error(`agent-factory-run-history: ${historyError instanceof Error ? historyError.message : String(historyError)}`);
    }
  }
  console.error(
    `agent-factory-codex-invocation: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
