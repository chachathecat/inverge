#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createRoadmapRunnerPlan,
  parseActiveProgramYaml,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  assertPlannerOutputSafe,
  buildTaskFactoryMarkdown,
  createCodexTaskFactoryOutput,
} from "../lib/agent-factory/codex-task-package.ts";
import {
  assertCiWatcherReportSafe,
  createCiWatcherReport,
} from "../lib/agent-factory/ci-watcher.ts";
import {
  assertPrContractDoctorReportSafe,
  createPrContractDoctorReport,
} from "../lib/agent-factory/pr-contract-doctor.ts";
import {
  assertSafeRepairPlanOutputSafe,
  createSafeRepairPlan,
} from "../lib/agent-factory/safe-repair-loop.ts";
import {
  assertRebaseMergePlanSafe,
  createRebaseMergePlan,
} from "../lib/agent-factory/rebase-merge-orchestrator.ts";
import { createGitHubReadonlyClientFromEnvironment } from "../lib/agent-factory/github-readonly-client.ts";
import {
  assertGithubSnapshotSafe,
  buildGithubLiveSnapshotMarkdown,
  normalizeGithubSnapshotForAgentFactory,
} from "../lib/agent-factory/github-snapshot-normalizer.ts";

const MODES = [
  "plan_only",
  "watch_snapshot",
  "watch_live",
  "doctor_pr_body",
  "doctor_pr_body_live",
  "repair_plan",
  "repair_plan_live",
  "merge_plan",
  "merge_plan_live",
];

const LIVE_MODES = [
  "watch_live",
  "doctor_pr_body_live",
  "repair_plan_live",
  "merge_plan_live",
];

const STDOUT_MODES = ["markdown", "json", "none"];
const DEFAULT_OUTPUT_DIR = ".agent-factory";
const SUMMARY_FILE = "agent-factory-run-summary.md";

const FORBIDDEN_OUTPUT_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /service[_-]?role/i,
  /cookie/i,
  /session/i,
  /raw.*answer/i,
  /ocr.*text/i,
  /problem.*text/i,
  /question.*body/i,
  /answer.*body/i,
  /source.*excerpt/i,
  /provider.*payload/i,
  /billing.*data/i,
  /private.*user.*content/i,
];

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const SENSITIVE_LINE_PATTERNS = [
  /^\s*["']?(secret|token|password|api[_-]?key|private[_-]?key|service[_-]?role|cookie|session)["']?\s*[:=]/i,
  /^\s*["']?(raw[_-]?answer|ocr[_-]?text|problem[_-]?text|question[_-]?body|answer[_-]?body)["']?\s*[:=]/i,
  /^\s*["']?(source[_-]?excerpt|provider[_-]?payload|billing[_-]?data|private[_-]?user[_-]?content)["']?\s*[:=]/i,
];

function parseArguments(argv) {
  const options = {
    mode: process.env.AGENT_FACTORY_MODE ?? "plan_only",
    target: process.env.AGENT_FACTORY_TARGET ?? "auto",
    prNumber: process.env.AGENT_FACTORY_PR_NUMBER ?? "",
    maxTasks: process.env.AGENT_FACTORY_MAX_TASKS ?? "1",
    stdout: process.env.AGENT_FACTORY_STDOUT ?? "markdown",
    allowMutation: process.env.AGENT_FACTORY_ALLOW_MUTATION ?? "false",
    outputDir: process.env.AGENT_FACTORY_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR,
    roadmapPath: process.env.ROADMAP_PATH ?? "roadmap/active-program.yml",
    repo: process.env.AGENT_FACTORY_REPO ?? "chachathecat/inverge",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--mode" && next) {
      options.mode = next;
      index += 1;
      continue;
    }

    if (arg === "--target" && next) {
      options.target = next;
      index += 1;
      continue;
    }

    if ((arg === "--pr-number" || arg === "--pr_number") && next) {
      options.prNumber = next;
      index += 1;
      continue;
    }

    if ((arg === "--max-tasks" || arg === "--max_tasks") && next) {
      options.maxTasks = next;
      index += 1;
      continue;
    }

    if (arg === "--stdout" && next) {
      options.stdout = next;
      index += 1;
      continue;
    }

    if ((arg === "--allow-mutation" || arg === "--allow_mutation") && next) {
      options.allowMutation = next;
      index += 1;
      continue;
    }

    if (arg === "--output-dir" && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }

    if (arg === "--roadmap" && next) {
      options.roadmapPath = next;
      index += 1;
      continue;
    }

    if (arg === "--repo" && next) {
      options.repo = next;
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
  const mode = String(options.mode).trim();
  const stdout = String(options.stdout).trim();
  const allowMutation = String(options.allowMutation).trim().toLowerCase();
  const maxTasks = Number(options.maxTasks);
  const target = String(options.target ?? "auto").trim() || "auto";
  const prNumberText = String(options.prNumber ?? "").trim() || (
    LIVE_MODES.includes(mode) && /^\d+$/.test(target) ? target : ""
  );
  const prNumber = /^\d+$/.test(prNumberText) ? Number(prNumberText) : null;

  if (options.help) return { ...options, mode, stdout, allowMutation, maxTasks: 1, prNumber };

  if (!MODES.includes(mode)) {
    throw new Error(`Invalid mode "${mode}". Use one of: ${MODES.join(", ")}.`);
  }

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  if (allowMutation !== "false") {
    throw new Error("allow_mutation must be false in AF006/AF007; read-only/report-only runs fail closed for any true value.");
  }

  if (![1, 2].includes(maxTasks)) {
    throw new Error("max_tasks must be 1 or 2.");
  }

  if (LIVE_MODES.includes(mode) && prNumber === null) {
    throw new Error("pr_number is required for live GitHub modes and must be a positive integer.");
  }

  return {
    ...options,
    mode,
    stdout,
    allowMutation,
    maxTasks,
    target,
    prNumber,
    outputDir: String(options.outputDir ?? DEFAULT_OUTPUT_DIR),
    roadmapPath: String(options.roadmapPath ?? "roadmap/active-program.yml"),
    repo: String(options.repo ?? "chachathecat/inverge"),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:run -- [options]",
    "",
    "Options:",
    "  --mode <mode>              plan_only, snapshot modes, or live read-only modes.",
    "  --target <target>          auto, a roadmap item id, a PR number, or a sanitized fixture path.",
    "  --pr-number <number>       Required for watch_live, doctor_pr_body_live, repair_plan_live, and merge_plan_live.",
    "  --max-tasks <1|2>          Maximum AF001 task packages for plan_only. Default: 1.",
    "  --stdout <mode>            markdown, json, or none. Default: markdown.",
    "  --allow-mutation <false>   Must be false in AF006/AF007.",
    "  --output-dir <path>        Artifact output directory. Default: .agent-factory.",
    "  --roadmap <path>           Roadmap path for plan_only. Default: roadmap/active-program.yml.",
    "",
    `Modes: ${MODES.join(", ")}.`,
    "",
    "AF006/AF007 is read-only/report-only. Live modes fetch GitHub metadata with GET requests only and never mutate GitHub.",
  ].join("\n");
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll("\\", "/");
}

function resolveOutputPath(options, fileName) {
  return path.resolve(process.cwd(), options.outputDir, fileName);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${String(content).replace(/\s*$/, "")}\n`, "utf8");
}

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readLiveGithubSnapshot(options) {
  const client = createGitHubReadonlyClientFromEnvironment({
    repo: options.repo,
  });
  const liveSnapshot = await client.fetchPullRequestSnapshot(options.prNumber);
  const normalizedSnapshot = normalizeGithubSnapshotForAgentFactory(liveSnapshot);

  return {
    liveSnapshot,
    normalizedSnapshot,
  };
}

function writeGithubLiveSnapshotArtifacts(options, normalizedSnapshot) {
  const jsonPath = resolveOutputPath(options, "github-live-snapshot.json");
  const markdownPath = resolveOutputPath(options, "github-live-snapshot.md");

  assertGithubSnapshotSafe(normalizedSnapshot);
  writeFile(jsonPath, JSON.stringify(normalizedSnapshot, null, 2));
  writeFile(markdownPath, buildGithubLiveSnapshotMarkdown(normalizedSnapshot));

  return [jsonPath, markdownPath];
}

function issueNumberForDoctor(normalizedSnapshot) {
  return normalizedSnapshot.closingReferences.length === 1
    ? String(normalizedSnapshot.closingReferences[0].issueNumber)
    : undefined;
}

function isAutoTarget(target) {
  return target === "auto" || target === "";
}

function isPrNumber(target) {
  return /^\d+$/.test(target);
}

function looksLikePath(target) {
  return /[\\/]/.test(target) || /\.(json|md|txt|yml|yaml)$/i.test(target);
}

function pathCandidate(target) {
  return looksLikePath(target) ? [target] : [];
}

function outputRelative(options, fileName) {
  return path.join(options.outputDir, fileName).replaceAll("\\", "/");
}

function existingPath(candidates) {
  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return null;
}

function requiredInputPath({ mode, target, label, candidates }) {
  const found = existingPath(candidates);
  if (found) return found;

  throw new Error(
    [
      `${label} file not found for mode ${mode} and target ${target}.`,
      `Checked: ${candidates.join(", ")}.`,
      "Provide target as a sanitized fixture path, or create the documented local artifact before rerunning.",
      "Snapshot modes do not live-fetch GitHub data; use an explicit *_live mode with pr_number for read-only live metadata.",
    ].join(" "),
  );
}

function ciSnapshotCandidates(target) {
  if (!isAutoTarget(target)) {
    if (isPrNumber(target)) {
      return [
        `.agent-factory/pr-${target}-ci-snapshot.json`,
        `.agent-factory/pr-ci-snapshot-${target}.json`,
        ".agent-factory/pr-ci-snapshot.json",
      ];
    }

    return pathCandidate(target).length > 0 ? pathCandidate(target) : [target];
  }

  return [".agent-factory/pr-ci-snapshot.json"];
}

function prBodyCandidates(target) {
  if (!isAutoTarget(target)) {
    if (isPrNumber(target)) {
      return [
        `.agent-factory/pr-${target}-body.md`,
        `.agent-factory/pr-body-${target}.md`,
        ".agent-factory/pr-body.md",
      ];
    }

    return pathCandidate(target).length > 0 ? pathCandidate(target) : [target];
  }

  return [".agent-factory/pr-body.md"];
}

function reportOrSnapshotCandidates(target) {
  if (!isAutoTarget(target)) {
    if (isPrNumber(target)) {
      return [
        `.agent-factory/pr-${target}-ci-watcher-report.json`,
        `.agent-factory/pr-${target}-ci-snapshot.json`,
        ".agent-factory/ci-watcher-report.json",
        ".agent-factory/pr-ci-snapshot.json",
      ];
    }

    return pathCandidate(target).length > 0 ? pathCandidate(target) : [target];
  }

  return [
    ".agent-factory/ci-watcher-report.json",
    ".agent-factory/pr-ci-snapshot.json",
  ];
}

function maybeExistingPath(candidates) {
  return existingPath(candidates);
}

function selectedFromAnalysis(analysis) {
  return {
    itemId: analysis.itemId,
    itemTitle: analysis.itemTitle,
    priority: analysis.priority,
    dependencies: analysis.dependencies,
    lockGroup: analysis.lockGroup,
    risk: analysis.risk,
    readinessStatus: "ready",
    blockedReasons: analysis.blockedReasons,
  };
}

function planForTarget(plan, options) {
  if (!isAutoTarget(options.target) && !isPrNumber(options.target) && !looksLikePath(options.target)) {
    const analysis = plan.analyses.find((entry) => entry.itemId === options.target);
    if (!analysis) {
      throw new Error(`Roadmap item ${options.target} was not found in ${options.roadmapPath}.`);
    }

    if (analysis.readinessStatus !== "ready") {
      const reasons = analysis.blockedReasons.map((reason) => reason.message).join(" ");
      throw new Error(`Roadmap item ${options.target} is ${analysis.readinessStatus}, not ready. ${reasons}`);
    }

    return {
      ...plan,
      selectionSlots: 1,
      selectedItemIds: [analysis.itemId],
      selectedItems: [selectedFromAnalysis(analysis)],
    };
  }

  const selectedItems = plan.selectedItems.slice(0, options.maxTasks);

  return {
    ...plan,
    selectionSlots: Math.min(plan.selectionSlots, options.maxTasks),
    selectedItemIds: selectedItems.map((entry) => entry.itemId),
    selectedItems,
  };
}

function runPlanOnly(options) {
  const roadmapPath = path.resolve(process.cwd(), options.roadmapPath);
  if (!fs.existsSync(roadmapPath)) {
    throw new Error(`Roadmap file not found: ${roadmapPath}`);
  }

  const roadmap = parseActiveProgramYaml(fs.readFileSync(roadmapPath, "utf8"));
  const plan = planForTarget(createRoadmapRunnerPlan(roadmap), options);
  const output = createCodexTaskFactoryOutput(plan, {
    roadmapPath: relativePath(roadmapPath),
    repository: options.repo,
  });
  const json = JSON.stringify(output, null, 2);
  const markdown = buildTaskFactoryMarkdown(output);
  const jsonPath = resolveOutputPath(options, "codex-task-packages.json");
  const markdownPath = resolveOutputPath(options, "codex-task-packages.md");

  assertPlannerOutputSafe(output);
  writeFile(jsonPath, json);
  writeFile(markdownPath, markdown);

  return {
    title: "AF001 planner task packages generated.",
    detail: `Selected task packages: ${output.selectedItemIds.length === 0 ? "none" : output.selectedItemIds.join(", ")}.`,
    artifacts: [jsonPath, markdownPath],
    stdoutPayload: output,
  };
}

function runWatchSnapshot(options) {
  const snapshotPath = requiredInputPath({
    mode: options.mode,
    target: options.target,
    label: "CI snapshot",
    candidates: ciSnapshotCandidates(options.target),
  });
  const report = createCiWatcherReport(readJsonFile(snapshotPath, "CI snapshot"), {
    repo: options.repo,
  });
  const jsonPath = resolveOutputPath(options, "ci-watcher-report.json");
  const markdownPath = resolveOutputPath(options, "ci-watcher-report.md");

  assertCiWatcherReportSafe(report);
  writeFile(jsonPath, JSON.stringify(report, null, 2));
  writeFile(markdownPath, report.markdownSummary);

  return {
    title: "AF002 CI watcher report generated.",
    detail: `Snapshot: ${relativePath(snapshotPath)}. Actions: ${report.recommendedNextActions.join(", ") || "none"}.`,
    artifacts: [jsonPath, markdownPath],
    stdoutPayload: report,
  };
}

async function runWatchLive(options) {
  const { normalizedSnapshot } = await readLiveGithubSnapshot(options);
  const liveArtifacts = writeGithubLiveSnapshotArtifacts(options, normalizedSnapshot);
  const report = createCiWatcherReport(normalizedSnapshot, {
    repo: options.repo,
  });
  const jsonPath = resolveOutputPath(options, "ci-watcher-report.json");
  const markdownPath = resolveOutputPath(options, "ci-watcher-report.md");

  assertCiWatcherReportSafe(report);
  writeFile(jsonPath, JSON.stringify(report, null, 2));
  writeFile(markdownPath, report.markdownSummary);

  return {
    title: "AF002 live CI watcher report generated.",
    detail: `Live PR #${options.prNumber}. Actions: ${report.recommendedNextActions.join(", ") || "none"}. Read-only GitHub metadata only.`,
    artifacts: [...liveArtifacts, jsonPath, markdownPath],
    stdoutPayload: report,
  };
}

function runDoctorPrBody(options) {
  const bodyPath = requiredInputPath({
    mode: options.mode,
    target: options.target,
    label: "PR body",
    candidates: prBodyCandidates(options.target),
  });
  const issueNumber = isPrNumber(options.target) ? options.target : undefined;
  const report = createPrContractDoctorReport(fs.readFileSync(bodyPath, "utf8"), {
    issueNumber,
  });
  const jsonPath = resolveOutputPath(options, "pr-contract-doctor-report.json");
  const markdownPath = resolveOutputPath(options, "pr-contract-doctor-report.md");
  const repairedPath = resolveOutputPath(options, "repaired-pr-body.md");

  assertPrContractDoctorReportSafe(report);
  writeFile(jsonPath, JSON.stringify(report, null, 2));
  writeFile(markdownPath, report.markdownSummary);
  writeFile(repairedPath, report.repairedBody);

  return {
    title: "AF003 PR Contract Doctor report generated.",
    detail: `Valid after repair: ${report.validAfter ? "yes" : "no"}. Review repaired-pr-body.md before any manual paste.`,
    artifacts: [jsonPath, markdownPath, repairedPath],
    stdoutPayload: report,
  };
}

async function runDoctorPrBodyLive(options) {
  const { liveSnapshot, normalizedSnapshot } = await readLiveGithubSnapshot(options);
  const liveArtifacts = writeGithubLiveSnapshotArtifacts(options, normalizedSnapshot);
  const report = createPrContractDoctorReport(liveSnapshot.pullRequest.bodyText, {
    issueNumber: issueNumberForDoctor(normalizedSnapshot),
    changedFiles: normalizedSnapshot.changedFiles,
  });
  const jsonPath = resolveOutputPath(options, "pr-contract-doctor-report.json");
  const markdownPath = resolveOutputPath(options, "pr-contract-doctor-report.md");
  const repairedPath = resolveOutputPath(options, "repaired-pr-body.md");

  assertPrContractDoctorReportSafe(report);
  writeFile(jsonPath, JSON.stringify(report, null, 2));
  writeFile(markdownPath, report.markdownSummary);
  writeFile(repairedPath, report.repairedBody);

  return {
    title: "AF003 live PR Contract Doctor report generated.",
    detail: `Live PR #${options.prNumber}. Valid after repair: ${report.validAfter ? "yes" : "no"}. Review repaired-pr-body.md before any manual paste.`,
    artifacts: [...liveArtifacts, jsonPath, markdownPath, repairedPath],
    stdoutPayload: report,
  };
}

function runRepairPlan(options) {
  const inputPath = requiredInputPath({
    mode: options.mode,
    target: options.target,
    label: "AF002 report or PR/check snapshot",
    candidates: reportOrSnapshotCandidates(options.target),
  });
  const doctorPath = maybeExistingPath([
    outputRelative(options, "pr-contract-doctor-report.json"),
    ".agent-factory/pr-contract-doctor-report.json",
  ]);
  const doctorReport = doctorPath ? readJsonFile(doctorPath, "AF003 doctor report") : undefined;
  const plan = createSafeRepairPlan(readJsonFile(inputPath, "Repair input"), {
    repo: options.repo,
    doctorReport,
  });
  const jsonPath = resolveOutputPath(options, "safe-repair-plan.json");
  const markdownPath = resolveOutputPath(options, "safe-repair-plan.md");

  assertSafeRepairPlanOutputSafe(plan);
  writeFile(jsonPath, JSON.stringify(plan, null, 2));
  writeFile(markdownPath, plan.markdownSummary);

  return {
    title: "AF004 safe repair plan generated.",
    detail: `Repair domain: ${plan.repairDomain}. Repair allowed: ${plan.repairAllowed ? "yes" : "no"}.`,
    artifacts: [jsonPath, markdownPath],
    stdoutPayload: plan,
  };
}

async function runRepairPlanLive(options) {
  const { liveSnapshot, normalizedSnapshot } = await readLiveGithubSnapshot(options);
  const liveArtifacts = writeGithubLiveSnapshotArtifacts(options, normalizedSnapshot);
  const watcherReport = createCiWatcherReport(normalizedSnapshot, {
    repo: options.repo,
  });
  const doctorReport = createPrContractDoctorReport(liveSnapshot.pullRequest.bodyText, {
    issueNumber: issueNumberForDoctor(normalizedSnapshot),
    changedFiles: normalizedSnapshot.changedFiles,
  });
  const plan = createSafeRepairPlan(normalizedSnapshot, {
    repo: options.repo,
    doctorReport,
  });
  const watcherJsonPath = resolveOutputPath(options, "ci-watcher-report.json");
  const watcherMarkdownPath = resolveOutputPath(options, "ci-watcher-report.md");
  const doctorJsonPath = resolveOutputPath(options, "pr-contract-doctor-report.json");
  const doctorMarkdownPath = resolveOutputPath(options, "pr-contract-doctor-report.md");
  const repairedPath = resolveOutputPath(options, "repaired-pr-body.md");
  const jsonPath = resolveOutputPath(options, "safe-repair-plan.json");
  const markdownPath = resolveOutputPath(options, "safe-repair-plan.md");

  assertCiWatcherReportSafe(watcherReport);
  assertPrContractDoctorReportSafe(doctorReport);
  assertSafeRepairPlanOutputSafe(plan);
  writeFile(watcherJsonPath, JSON.stringify(watcherReport, null, 2));
  writeFile(watcherMarkdownPath, watcherReport.markdownSummary);
  writeFile(doctorJsonPath, JSON.stringify(doctorReport, null, 2));
  writeFile(doctorMarkdownPath, doctorReport.markdownSummary);
  writeFile(repairedPath, doctorReport.repairedBody);
  writeFile(jsonPath, JSON.stringify(plan, null, 2));
  writeFile(markdownPath, plan.markdownSummary);

  return {
    title: "AF004 live safe repair plan generated.",
    detail: `Live PR #${options.prNumber}. Repair domain: ${plan.repairDomain}. Repair allowed: ${plan.repairAllowed ? "yes" : "no"}.`,
    artifacts: [
      ...liveArtifacts,
      watcherJsonPath,
      watcherMarkdownPath,
      doctorJsonPath,
      doctorMarkdownPath,
      repairedPath,
      jsonPath,
      markdownPath,
    ],
    stdoutPayload: plan,
  };
}

function runMergePlan(options) {
  const inputPath = requiredInputPath({
    mode: options.mode,
    target: options.target,
    label: "AF002/AF004 report or PR/check snapshot",
    candidates: reportOrSnapshotCandidates(options.target),
  });
  const snapshotPath = maybeExistingPath(ciSnapshotCandidates(options.target));
  const repairPlanPath = maybeExistingPath([
    outputRelative(options, "safe-repair-plan.json"),
    ".agent-factory/safe-repair-plan.json",
  ]);
  const plan = createRebaseMergePlan(readJsonFile(inputPath, "Merge input"), {
    repo: options.repo,
    prSnapshot: snapshotPath ? readJsonFile(snapshotPath, "PR snapshot") : undefined,
    repairPlan: repairPlanPath ? readJsonFile(repairPlanPath, "AF004 repair plan") : undefined,
    reportOnly: true,
  });
  const jsonPath = resolveOutputPath(options, "merge-plan.json");
  const markdownPath = resolveOutputPath(options, "merge-plan.md");

  assertRebaseMergePlanSafe(plan);
  writeFile(jsonPath, JSON.stringify(plan, null, 2));
  writeFile(markdownPath, plan.markdownSummary);

  return {
    title: "AF005 merge-readiness report generated.",
    detail: `Merge readiness: ${plan.mergeReadiness}. Merge candidate from AF006 workflow output: no; human approval remains required for any real merge.`,
    artifacts: [jsonPath, markdownPath],
    stdoutPayload: plan,
  };
}

async function runMergePlanLive(options) {
  const { liveSnapshot, normalizedSnapshot } = await readLiveGithubSnapshot(options);
  const liveArtifacts = writeGithubLiveSnapshotArtifacts(options, normalizedSnapshot);
  const watcherReport = createCiWatcherReport(normalizedSnapshot, {
    repo: options.repo,
  });
  const doctorReport = createPrContractDoctorReport(liveSnapshot.pullRequest.bodyText, {
    issueNumber: issueNumberForDoctor(normalizedSnapshot),
    changedFiles: normalizedSnapshot.changedFiles,
  });
  const repairPlan = createSafeRepairPlan(normalizedSnapshot, {
    repo: options.repo,
    doctorReport,
  });
  const plan = createRebaseMergePlan(watcherReport, {
    repo: options.repo,
    prSnapshot: normalizedSnapshot,
    repairPlan,
    reportOnly: true,
  });
  const watcherJsonPath = resolveOutputPath(options, "ci-watcher-report.json");
  const watcherMarkdownPath = resolveOutputPath(options, "ci-watcher-report.md");
  const doctorJsonPath = resolveOutputPath(options, "pr-contract-doctor-report.json");
  const doctorMarkdownPath = resolveOutputPath(options, "pr-contract-doctor-report.md");
  const repairedPath = resolveOutputPath(options, "repaired-pr-body.md");
  const repairJsonPath = resolveOutputPath(options, "safe-repair-plan.json");
  const repairMarkdownPath = resolveOutputPath(options, "safe-repair-plan.md");
  const jsonPath = resolveOutputPath(options, "merge-plan.json");
  const markdownPath = resolveOutputPath(options, "merge-plan.md");

  assertCiWatcherReportSafe(watcherReport);
  assertPrContractDoctorReportSafe(doctorReport);
  assertSafeRepairPlanOutputSafe(repairPlan);
  assertRebaseMergePlanSafe(plan);
  writeFile(watcherJsonPath, JSON.stringify(watcherReport, null, 2));
  writeFile(watcherMarkdownPath, watcherReport.markdownSummary);
  writeFile(doctorJsonPath, JSON.stringify(doctorReport, null, 2));
  writeFile(doctorMarkdownPath, doctorReport.markdownSummary);
  writeFile(repairedPath, doctorReport.repairedBody);
  writeFile(repairJsonPath, JSON.stringify(repairPlan, null, 2));
  writeFile(repairMarkdownPath, repairPlan.markdownSummary);
  writeFile(jsonPath, JSON.stringify(plan, null, 2));
  writeFile(markdownPath, plan.markdownSummary);

  return {
    title: "AF005 live merge-readiness report generated.",
    detail: `Live PR #${options.prNumber}. Merge readiness: ${plan.mergeReadiness}. Merge candidate from AF007 workflow output: no; human approval remains required for any real merge.`,
    artifacts: [
      ...liveArtifacts,
      watcherJsonPath,
      watcherMarkdownPath,
      doctorJsonPath,
      doctorMarkdownPath,
      repairedPath,
      repairJsonPath,
      repairMarkdownPath,
      jsonPath,
      markdownPath,
    ],
    stdoutPayload: plan,
  };
}

async function runMode(options) {
  if (options.mode === "plan_only") return runPlanOnly(options);
  if (options.mode === "watch_snapshot") return runWatchSnapshot(options);
  if (options.mode === "watch_live") return runWatchLive(options);
  if (options.mode === "doctor_pr_body") return runDoctorPrBody(options);
  if (options.mode === "doctor_pr_body_live") return runDoctorPrBodyLive(options);
  if (options.mode === "repair_plan") return runRepairPlan(options);
  if (options.mode === "repair_plan_live") return runRepairPlanLive(options);
  if (options.mode === "merge_plan") return runMergePlan(options);
  if (options.mode === "merge_plan_live") return runMergePlanLive(options);
  throw new Error(`Invalid mode "${options.mode}". Use one of: ${MODES.join(", ")}.`);
}

function assertNoForbiddenKeys(value, label) {
  const seen = new Set();

  function visit(current, currentPath) {
    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${currentPath}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      const forbidden = FORBIDDEN_OUTPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`${label} contains forbidden artifact key ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}

function assertArtifactTextSafe(filePath, text) {
  const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(text));
  if (secretPattern) {
    throw new Error(`${relativePath(filePath)} contains a secret-looking value and will not be uploaded.`);
  }

  const unsafeLine = text.split(/\r?\n/).find((line) =>
    SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)),
  );
  if (unsafeLine) {
    throw new Error(`${relativePath(filePath)} contains a secret-looking or raw-content-looking field and will not be uploaded.`);
  }

  if (filePath.endsWith(".json")) {
    assertNoForbiddenKeys(JSON.parse(text), relativePath(filePath));
  }
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function assertUploadDirectorySafe(outputDir) {
  const resolved = path.resolve(process.cwd(), outputDir);
  for (const filePath of listFiles(resolved)) {
    const text = fs.readFileSync(filePath, "utf8");
    assertArtifactTextSafe(filePath, text);
  }
}

function buildSummary({ options, status, result, error }) {
  const artifacts = result?.artifacts ?? [];
  const artifactLines = artifacts.length > 0
    ? artifacts.map((artifact) => `- \`${relativePath(artifact)}\``)
    : ["- None generated."];
  const message = status === "success"
    ? result.detail
    : error instanceof Error
      ? error.message
      : String(error);

  return [
    "# AF006 Agent Factory Run",
    "",
    `Status: ${status}`,
    `Mode: ${options?.mode ?? "unknown"}`,
    `Target: ${options?.target ?? "unknown"}`,
    `PR number: ${options?.prNumber ?? "none"}`,
    `Max tasks: ${options?.maxTasks ?? "unknown"}`,
    "Mutation: disabled (allow_mutation=false)",
    "AF006 v1: read-only/report-only",
    "AF007 live GitHub modes: read-only/report-only",
    "",
    "## Result",
    "",
    status === "success" ? result.title : "Run failed safely before any mutation.",
    message,
    "",
    "## Artifacts",
    "",
    ...artifactLines,
    `- \`${path.join(options?.outputDir ?? DEFAULT_OUTPUT_DIR, SUMMARY_FILE).replaceAll("\\", "/")}\``,
    "",
    "## Guardrails",
    "",
    "- No branches, commits, pushes, PR updates, workflow reruns, rebases, or merges are performed.",
    "- No GitHub mutation APIs, learner runtime, OCR, provider, billing, auth, production API, or Codex invocation is used.",
    "- Snapshot modes require sanitized local fixtures or fail with instructions.",
    "- Live modes use GitHub metadata GET requests only and fail closed on missing permissions, rate limits, or ambiguous workflow data.",
    "- Human approval is required for any real merge or mutation outside AF006.",
  ].join("\n");
}

function writeSummary(options, summary) {
  const summaryPath = resolveOutputPath(options, SUMMARY_FILE);
  writeFile(summaryPath, summary);
  return summaryPath;
}

function stdoutResult(options, status, result, summaryPath, error) {
  if (!options || options.stdout === "none") return;

  if (options.stdout === "json") {
    console.log(JSON.stringify({
      version: 1,
      status,
      mode: options.mode,
      target: options.target,
      reportOnly: true,
      summaryPath: relativePath(summaryPath),
      artifactPaths: (result?.artifacts ?? []).map(relativePath),
      error: error ? (error instanceof Error ? error.message : String(error)) : null,
    }, null, 2));
    return;
  }

  console.log(fs.readFileSync(summaryPath, "utf8").trimEnd());
}

function rawOption(argv, flags, fallback) {
  for (let index = 0; index < argv.length; index += 1) {
    if (flags.includes(argv[index]) && argv[index + 1]) {
      return argv[index + 1];
    }
  }

  return fallback;
}

function safeOptionsFromArgv(argv) {
  if (argv.includes("--help")) return null;

  const stdout = rawOption(argv, ["--stdout"], process.env.AGENT_FACTORY_STDOUT ?? "markdown");

  return {
    mode: rawOption(argv, ["--mode"], process.env.AGENT_FACTORY_MODE ?? "unknown"),
    target: rawOption(argv, ["--target"], process.env.AGENT_FACTORY_TARGET ?? "unknown"),
    prNumber: rawOption(argv, ["--pr-number", "--pr_number"], process.env.AGENT_FACTORY_PR_NUMBER ?? "none"),
    maxTasks: rawOption(argv, ["--max-tasks", "--max_tasks"], process.env.AGENT_FACTORY_MAX_TASKS ?? "unknown"),
    stdout: STDOUT_MODES.includes(stdout) ? stdout : "markdown",
    allowMutation: rawOption(argv, ["--allow-mutation", "--allow_mutation"], process.env.AGENT_FACTORY_ALLOW_MUTATION ?? "false"),
    outputDir: rawOption(argv, ["--output-dir"], process.env.AGENT_FACTORY_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
    roadmapPath: rawOption(argv, ["--roadmap"], process.env.ROADMAP_PATH ?? "roadmap/active-program.yml"),
    repo: rawOption(argv, ["--repo"], process.env.AGENT_FACTORY_REPO ?? "chachathecat/inverge"),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const result = await runMode(options);
  assertUploadDirectorySafe(options.outputDir);
  const summaryPath = writeSummary(options, buildSummary({ options, status: "success", result }));
  stdoutResult(options, "success", result, summaryPath);
}

main().catch((error) => {
  const options = safeOptionsFromArgv(process.argv.slice(2));
  if (options) {
    const summaryPath = writeSummary(options, buildSummary({ options, status: "failed", error }));
    stdoutResult(options, "failed", null, summaryPath, error);
  }
  console.error(`agent-factory-run: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
