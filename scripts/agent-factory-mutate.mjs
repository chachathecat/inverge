#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createGitHubReadonlyClientFromEnvironment } from "../lib/agent-factory/github-readonly-client.ts";
import { normalizeGithubSnapshotForAgentFactory } from "../lib/agent-factory/github-snapshot-normalizer.ts";
import {
  AF009_APPROVAL_PHRASE,
  AF009_MUTATION_INTENTS,
  assertSafeMutationArtifactSafe,
  buildSafeMutationPlanMarkdown,
  buildSafeMutationSummary,
  createSafeMutationPlan,
  executeSafeMutation,
} from "../lib/agent-factory/safe-mutation-gate.ts";

const DEFAULT_OUTPUT_DIR = ".agent-factory";
const SUMMARY_FILE = "agent-factory-mutation-summary.md";
const STDOUT_MODES = ["markdown", "json", "none"];

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const SENSITIVE_LINE_PATTERNS = [
  /^\s*["']?(?:secret|token|password|api[_-]?key|private[_-]?key|service[_-]?role|cookie|session|credential)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_-]?answer|learner[_-]?answer|ocr[_-]?text|problem[_-]?text|question[_-]?(?:body|text)|answer[_-]?body|official[_-]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:source[_-]?excerpt|provider[_-]?payload|billing[_-]?data|private[_-]?user[_-]?content)["']?\s*[:=]/i,
];

function looksLikeFlag(value) {
  return typeof value === "string" && value.startsWith("--") && value.length > 2;
}

function optionalArgumentValue(argv, index) {
  if (index + 1 >= argv.length) {
    return { value: "", consumed: false };
  }

  const value = argv[index + 1];
  if (looksLikeFlag(value)) {
    return { value: "", consumed: false };
  }

  return { value, consumed: true };
}

function parseArguments(argv) {
  const options = {
    mutationIntent: process.env.AGENT_FACTORY_MUTATION_INTENT ?? "",
    prNumber: process.env.AGENT_FACTORY_PR_NUMBER ?? "",
    dryRun: process.env.AGENT_FACTORY_DRY_RUN ?? "true",
    approvalPhrase: process.env.AGENT_FACTORY_APPROVAL_PHRASE ?? "",
    evidenceText: process.env.AGENT_FACTORY_EVIDENCE_TEXT ?? "",
    evidenceSourcePath: process.env.AGENT_FACTORY_EVIDENCE_SOURCE_PATH ?? "",
    stdout: process.env.AGENT_FACTORY_STDOUT ?? "markdown",
    outputDir: process.env.AGENT_FACTORY_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR,
    repo: process.env.AGENT_FACTORY_REPO ?? "chachathecat/inverge",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--mutation-intent" || arg === "--mutation_intent") && next) {
      options.mutationIntent = next;
      index += 1;
      continue;
    }

    if (arg === "--pr-number" || arg === "--pr_number") {
      const parsed = optionalArgumentValue(argv, index);
      options.prNumber = parsed.value;
      if (parsed.consumed) index += 1;
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

    if ((arg === "--evidence-text" || arg === "--evidence_text") && next) {
      options.evidenceText = next;
      index += 1;
      continue;
    }

    if ((arg === "--comment-text" || arg === "--comment_text") && next) {
      options.commentText = next;
      index += 1;
      continue;
    }

    if ((arg === "--evidence-source-path" || arg === "--evidence_source_path") && next) {
      options.evidenceSourcePath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdout" && next) {
      options.stdout = next;
      index += 1;
      continue;
    }

    if (arg === "--output-dir" && next) {
      options.outputDir = next;
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
  const stdout = String(options.stdout).trim();
  const dryRun = String(options.dryRun).trim().toLowerCase();

  if (options.help) return { ...options, stdout, dryRun };

  if (!STDOUT_MODES.includes(stdout)) {
    throw new Error(`Invalid stdout "${stdout}". Use one of: ${STDOUT_MODES.join(", ")}.`);
  }

  if (!["true", "false"].includes(dryRun)) {
    throw new Error('dry_run must be "true" or "false".');
  }

  return {
    ...options,
    stdout,
    dryRun,
    mutationIntent: String(options.mutationIntent ?? "").trim(),
    prNumber: String(options.prNumber ?? "").trim(),
    approvalPhrase: String(options.approvalPhrase ?? ""),
    evidenceText: String(options.evidenceText ?? ""),
    commentText: String(options.commentText ?? options.evidenceText ?? ""),
    evidenceSourcePath: String(options.evidenceSourcePath ?? "").trim(),
    outputDir: String(options.outputDir ?? DEFAULT_OUTPUT_DIR),
    repo: String(options.repo ?? "chachathecat/inverge"),
  };
}

function helpText() {
  return [
    "Usage: npm run agent-factory:mutate -- [options]",
    "",
    "Options:",
    `  --mutation-intent <intent>       Required. One of: ${AF009_MUTATION_INTENTS.join(", ")}.`,
    "  --pr-number <number>             Required positive PR number.",
    '  --dry-run <true|false>           Defaults to true. false is required for a real metadata action.',
    `  --approval-phrase <phrase>       Required for dry_run=false. Exact phrase: ${AF009_APPROVAL_PHRASE}`,
    "  --evidence-text <text>           Metadata-only text for Runtime evidence or safe comment.",
    "  --comment-text <text>            Optional metadata-only comment text; falls back to evidence_text.",
    "  --evidence-source-path <path>    Optional committed metadata-only text file, read from the workspace.",
    "  --stdout <markdown|json|none>    Defaults to markdown.",
    "  --output-dir <path>              Artifact output directory. Default: .agent-factory.",
    "  --repo <owner/name>              Defaults to chachathecat/inverge.",
    "",
    "AF009 performs only approval-gated PR metadata mutations: Runtime evidence section update, one marker comment create/update, or draft ready-for-review.",
  ].join("\n");
}

function normalizePrNumber(value) {
  return /^\d+$/.test(String(value ?? "").trim()) ? Number(String(value).trim()) : null;
}

function normalizeDryRun(value) {
  return String(value).trim().toLowerCase() !== "false";
}

function parseRepo(repo) {
  const match = String(repo).trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) throw new Error(`Repository must be owner/name, received: ${repo}`);
  return { owner: match[1], name: match[2], fullName: `${match[1]}/${match[2]}` };
}

function encodePathPart(value) {
  return encodeURIComponent(String(value));
}

function readEvidenceSource(options) {
  if (!options.evidenceSourcePath) return options.evidenceText;

  const cwd = path.resolve(process.cwd());
  const resolved = path.resolve(cwd, options.evidenceSourcePath);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("evidence_source_path must resolve inside the repository workspace.");
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`evidence_source_path was not found: ${options.evidenceSourcePath}`);
  }

  return fs.readFileSync(resolved, "utf8");
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
    assertSafeMutationArtifactSafe(JSON.parse(text));
  }
}

function assertArtifactsSafe(paths) {
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    assertArtifactTextSafe(filePath, fs.readFileSync(filePath, "utf8"));
  }
}

function writePlanArtifacts(options, plan) {
  const jsonPath = resolveOutputPath(options, "mutation-plan.json");
  const markdownPath = resolveOutputPath(options, "mutation-plan.md");
  writeFile(jsonPath, JSON.stringify(plan, null, 2));
  writeFile(markdownPath, buildSafeMutationPlanMarkdown(plan));
  return [jsonPath, markdownPath];
}

function writeResultArtifact(options, result) {
  const resultPath = resolveOutputPath(options, "mutation-result.json");
  writeFile(resultPath, JSON.stringify(result, null, 2));
  return resultPath;
}

function writeSummary(options, summary) {
  const summaryPath = resolveOutputPath(options, SUMMARY_FILE);
  writeFile(summaryPath, summary);
  return summaryPath;
}

function stdoutResult(options, payload) {
  if (!options || options.stdout === "none") return;

  if (options.stdout === "json") {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const summaryPath = resolveOutputPath(options, SUMMARY_FILE);
  if (fs.existsSync(summaryPath)) {
    console.log(fs.readFileSync(summaryPath, "utf8").trimEnd());
  }
}

function rawOption(argv, flags, fallback) {
  for (let index = 0; index < argv.length; index += 1) {
    if (flags.includes(argv[index])) {
      return optionalArgumentValue(argv, index).value;
    }
  }

  return fallback;
}

function safeOptionsFromArgv(argv) {
  if (argv.includes("--help")) return null;
  const stdout = rawOption(argv, ["--stdout"], process.env.AGENT_FACTORY_STDOUT ?? "markdown");

  return {
    mutationIntent: rawOption(argv, ["--mutation-intent", "--mutation_intent"], process.env.AGENT_FACTORY_MUTATION_INTENT ?? "unknown"),
    prNumber: rawOption(argv, ["--pr-number", "--pr_number"], process.env.AGENT_FACTORY_PR_NUMBER ?? "unknown"),
    dryRun: rawOption(argv, ["--dry-run", "--dry_run"], process.env.AGENT_FACTORY_DRY_RUN ?? "true"),
    stdout: STDOUT_MODES.includes(stdout) ? stdout : "markdown",
    outputDir: rawOption(argv, ["--output-dir"], process.env.AGENT_FACTORY_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
    repo: rawOption(argv, ["--repo"], process.env.AGENT_FACTORY_REPO ?? "chachathecat/inverge"),
  };
}

async function responseMessage(response) {
  try {
    const body = await response.json();
    return typeof body?.message === "string" ? body.message : response.statusText;
  } catch {
    return response.statusText;
  }
}

class GitHubMutationClient {
  constructor(options) {
    this.repoParts = parseRepo(options.repo);
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/+$/, "");
    this.token = options.token?.trim() || "";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchIssueComments(prNumber) {
    const comments = await this.requestJson(
      `${this.repoEndpoint()}/issues/${encodePathPart(prNumber)}/comments?per_page=100`,
      "PR issue comments",
      "GET",
    );

    return Array.isArray(comments)
      ? comments.map((entry) => ({
          id: Number(entry?.id),
          body: typeof entry?.body === "string" ? entry.body : "",
          htmlUrl: typeof entry?.html_url === "string" ? entry.html_url : null,
          userLogin: typeof entry?.user?.login === "string" ? entry.user.login : null,
        })).filter((entry) => Number.isInteger(entry.id) && entry.id > 0)
      : [];
  }

  async updatePullRequestBody(prNumber, body) {
    const response = await this.requestJson(
      `${this.repoEndpoint()}/pulls/${encodePathPart(prNumber)}`,
      "update PR body",
      "PATCH",
      { body },
    );
    return { htmlUrl: typeof response?.html_url === "string" ? response.html_url : null };
  }

  async createIssueComment(prNumber, body) {
    const response = await this.requestJson(
      `${this.repoEndpoint()}/issues/${encodePathPart(prNumber)}/comments`,
      "create PR metadata comment",
      "POST",
      { body },
    );
    return {
      id: Number.isInteger(response?.id) ? response.id : null,
      htmlUrl: typeof response?.html_url === "string" ? response.html_url : null,
    };
  }

  async updateIssueComment(commentId, body) {
    const response = await this.requestJson(
      `${this.repoEndpoint()}/issues/comments/${encodePathPart(commentId)}`,
      "update PR metadata comment",
      "PATCH",
      { body },
    );
    return {
      id: Number.isInteger(response?.id) ? response.id : commentId,
      htmlUrl: typeof response?.html_url === "string" ? response.html_url : null,
    };
  }

  async markPullRequestReadyForReview(prNumber) {
    const pullRequest = await this.requestJson(
      `${this.repoEndpoint()}/pulls/${encodePathPart(prNumber)}`,
      "PR node id for ready-for-review mutation",
      "GET",
    );
    const nodeId = typeof pullRequest?.node_id === "string" ? pullRequest.node_id : "";
    if (!nodeId) {
      throw new Error("GitHub PR metadata did not include node_id; cannot mark ready for review.");
    }

    const response = await this.requestGraphql(
      "mark PR ready for review",
      {
        query: [
          "mutation MarkPullRequestReadyForReview($pullRequestId: ID!) {",
          "  markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {",
          "    pullRequest { id url isDraft }",
          "  }",
          "}",
        ].join("\n"),
        variables: { pullRequestId: nodeId },
      },
    );
    const pr = response?.data?.markPullRequestReadyForReview?.pullRequest;
    return { htmlUrl: typeof pr?.url === "string" ? pr.url : null };
  }

  repoEndpoint() {
    return `/repos/${encodePathPart(this.repoParts.owner)}/${encodePathPart(this.repoParts.name)}`;
  }

  async requestJson(endpoint, label, method, body) {
    const response = await this.fetchResponse(endpoint, label, method, body);
    return response.json();
  }

  async requestGraphql(label, body) {
    const response = await this.fetchResponse(this.graphqlEndpoint(), label, "POST", body);
    const payload = await response.json();
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(`${label} GraphQL request returned errors: ${payload.errors.map((entry) => entry?.message ?? "unknown").join("; ")}`);
    }
    return payload;
  }

  async fetchResponse(endpoint, label, method, body) {
    if ((method === "POST" || method === "PATCH") && !this.token) {
      throw new Error(`${label} requires GITHUB_TOKEN or AGENT_FACTORY_GITHUB_TOKEN with write permission.`);
    }

    const response = await this.fetchImpl(this.urlFor(endpoint), {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`${label} request failed with ${response.status}: ${await responseMessage(response)}`);
    }

    return response;
  }

  urlFor(endpoint) {
    if (/^https?:\/\//i.test(endpoint)) return endpoint;
    return `${this.apiBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  graphqlEndpoint() {
    if (this.apiBaseUrl.endsWith("/api/v3")) {
      return `${this.apiBaseUrl.slice(0, -"/api/v3".length)}/api/graphql`;
    }
    return `${this.apiBaseUrl}/graphql`;
  }

  headers() {
    const headers = {
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "inverge-agent-factory-af009",
      "x-github-api-version": "2022-11-28",
    };

    if (this.token) headers.authorization = `Bearer ${this.token}`;
    return headers;
  }
}

function pullRequestContextFromSnapshot(liveSnapshot, normalizedSnapshot) {
  return {
    repo: liveSnapshot.repo,
    normalizedSnapshot,
    pullRequest: {
      number: liveSnapshot.pullRequest.number,
      title: liveSnapshot.pullRequest.title,
      state: liveSnapshot.pullRequest.state,
      draft: liveSnapshot.pullRequest.draft,
      merged: liveSnapshot.pullRequest.merged,
      bodyText: liveSnapshot.pullRequest.bodyText,
      mergeable: liveSnapshot.pullRequest.mergeable,
      mergeStateStatus: liveSnapshot.pullRequest.mergeStateStatus,
      labels: liveSnapshot.pullRequest.labels.map((name) => ({ name })),
      changedFiles: liveSnapshot.files.map((file) => file.filename),
      files: liveSnapshot.files.map((file) => ({ path: file.filename })),
      statusCheckRollup: normalizedSnapshot.statusCheckRollup,
    },
  };
}

function failEarlyPlan(options, evidenceText) {
  return createSafeMutationPlan({
    mutationIntent: options.mutationIntent,
    prNumber: options.prNumber,
    dryRun: normalizeDryRun(options.dryRun),
    approvalPhrase: options.approvalPhrase,
    evidenceText,
    commentText: options.commentText || evidenceText,
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  const prNumber = normalizePrNumber(options.prNumber);
  const dryRun = normalizeDryRun(options.dryRun);
  const evidenceText = readEvidenceSource(options);
  const preliminary = failEarlyPlan(options, evidenceText);
  const preliminaryIsGlobalFailure =
    preliminary.plan.status === "rejected" &&
    (
      !AF009_MUTATION_INTENTS.includes(options.mutationIntent) ||
      prNumber === null ||
      (!dryRun && options.approvalPhrase !== AF009_APPROVAL_PHRASE)
    );

  if (preliminaryIsGlobalFailure) {
    const planArtifacts = writePlanArtifacts(options, preliminary.plan);
    const summaryPath = writeSummary(options, buildSafeMutationSummary({
      plan: preliminary.plan,
      status: "failed",
    }));
    assertArtifactsSafe([...planArtifacts, summaryPath]);
    stdoutResult(options, {
      version: 1,
      status: "failed",
      planPath: relativePath(planArtifacts[0]),
      summaryPath: relativePath(summaryPath),
    });
    process.exitCode = 1;
    return;
  }

  const readonlyClient = createGitHubReadonlyClientFromEnvironment({ repo: options.repo });
  const mutationClient = new GitHubMutationClient({
    repo: options.repo,
    apiBaseUrl: process.env.AGENT_FACTORY_GITHUB_API_BASE_URL ?? process.env.GITHUB_API_BASE_URL,
    token: process.env.AGENT_FACTORY_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  });
  const liveSnapshot = await readonlyClient.fetchPullRequestSnapshot(prNumber);
  const normalizedSnapshot = normalizeGithubSnapshotForAgentFactory(liveSnapshot);
  const comments = options.mutationIntent === "add_safe_pr_comment"
    ? await mutationClient.fetchIssueComments(prNumber)
    : [];
  const context = {
    ...pullRequestContextFromSnapshot(liveSnapshot, normalizedSnapshot),
    comments,
  };
  const prepared = createSafeMutationPlan({
    mutationIntent: options.mutationIntent,
    prNumber,
    dryRun,
    approvalPhrase: options.approvalPhrase,
    evidenceText,
    commentText: options.commentText || evidenceText,
    context,
  });
  const planArtifacts = writePlanArtifacts(options, prepared.plan);

  if (prepared.plan.status === "rejected") {
    const summaryPath = writeSummary(options, buildSafeMutationSummary({
      plan: prepared.plan,
      status: "failed",
    }));
    assertArtifactsSafe([...planArtifacts, summaryPath]);
    stdoutResult(options, {
      version: 1,
      status: "failed",
      planPath: relativePath(planArtifacts[0]),
      summaryPath: relativePath(summaryPath),
    });
    process.exitCode = 1;
    return;
  }

  let result = null;
  let resultPath = null;
  let runStatus = "success";
  let executionError = null;

  if (!dryRun && prepared.plan.canExecute) {
    try {
      result = await executeSafeMutation(prepared, mutationClient);
      resultPath = writeResultArtifact(options, result);
    } catch (error) {
      executionError = error;
      runStatus = "failed";
      result = {
        version: 1,
        intent: prepared.plan.intent,
        prNumber: prepared.plan.prNumber,
        dryRun: prepared.plan.dryRun,
        status: "rejected",
        action: prepared.plan.action,
        mutationAttempted: prepared.plan.canExecute,
        metadataOnly: true,
        mutatesCode: false,
        mutatesRuntimeState: false,
        mutatesBranchState: false,
        message: error instanceof Error ? error.message : String(error),
      };
      assertSafeMutationArtifactSafe(result);
      resultPath = writeResultArtifact(options, result);
    }
  }

  const summaryPath = writeSummary(options, buildSafeMutationSummary({
    plan: prepared.plan,
    result,
    status: runStatus,
    error: executionError,
  }));
  assertArtifactsSafe([...planArtifacts, ...(resultPath ? [resultPath] : []), summaryPath]);
  stdoutResult(options, {
    version: 1,
    status: runStatus,
    planPath: relativePath(planArtifacts[0]),
    resultPath: resultPath ? relativePath(resultPath) : null,
    summaryPath: relativePath(summaryPath),
  });

  if (runStatus === "failed") process.exitCode = 1;
}

main().catch((error) => {
  const options = safeOptionsFromArgv(process.argv.slice(2));
  if (options) {
    const summaryPath = writeSummary(options, buildSafeMutationSummary({
      plan: null,
      status: "failed",
      error,
    }));
    stdoutResult(options, {
      version: 1,
      status: "failed",
      summaryPath: relativePath(summaryPath),
      error: error instanceof Error ? error.message : String(error),
    });
  }
  console.error(`agent-factory-mutate: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
