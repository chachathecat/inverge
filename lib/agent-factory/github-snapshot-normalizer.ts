import type {
  GitHubReadonlyEndpointError,
  GitHubReadonlySnapshot,
  GitHubReadonlyWorkflowJob,
  GitHubReadonlyWorkflowRun,
  GitHubReadonlyWorkflowStep,
} from "./github-readonly-client";

export interface AgentFactoryGithubWorkflowCheck {
  name: string;
  workflowName: string | null;
  jobName: string | null;
  failureStep: string | null;
  status: string | null;
  conclusion: string | null;
  required: true;
  failureDomain?: "unknown_ci_failure";
}

export interface AgentFactoryGithubSnapshot {
  source: "github_live_readonly_normalized";
  fetchedAt: string;
  repo: string;
  repository: {
    nameWithOwner: string;
    defaultBranch: string | null;
    visibility: string | null;
    isPrivate: boolean | null;
    archived: boolean | null;
    disabled: boolean | null;
  };
  number: number;
  prNumber: number;
  pullRequest: {
    number: number;
    prNumber: number;
    title: string;
    state: string;
    isDraft: boolean;
    merged: boolean;
    baseRefOid: string | null;
    headRefOid: string | null;
    base: {
      ref: string | null;
      sha: string | null;
      repo: string | null;
    };
    head: {
      ref: string | null;
      sha: string | null;
      repo: string | null;
    };
    mergeable: boolean | null;
    mergeStateStatus: string;
    mergeability: "mergeable" | "conflict" | "unknown" | "behind_main" | "diverged";
    behindBy: number | null;
    commitsBehind: number | null;
    diverged: boolean;
    labels: { name: string }[];
    files: { path: string; status: string | null; additions: number | null; deletions: number | null }[];
    changedFiles: string[];
  };
  title: string;
  state: string;
  isDraft: boolean;
  merged: boolean;
  baseRefOid: string | null;
  headRefOid: string | null;
  base: {
    ref: string | null;
    sha: string | null;
    repo: string | null;
  };
  head: {
    ref: string | null;
    sha: string | null;
    repo: string | null;
  };
  mergeable: boolean | null;
  mergeStateStatus: string;
  mergeability: "mergeable" | "conflict" | "unknown" | "behind_main" | "diverged";
  behindBy: number | null;
  commitsBehind: number | null;
  diverged: boolean;
  labels: { name: string }[];
  files: { path: string; status: string | null; additions: number | null; deletions: number | null }[];
  changedFiles: string[];
  statusCheckRollup: AgentFactoryGithubWorkflowCheck[];
  workflowRunMetadata: {
    id: number | null;
    name: string | null;
    status: string | null;
    conclusion: string | null;
    headSha: string | null;
    runNumber: number | null;
    runAttempt: number | null;
  }[];
  workflowArtifacts: {
    id: number | null;
    runId: number | null;
    name: string | null;
    sizeInBytes: number | null;
    expired: boolean | null;
    createdAt: string | null;
    expiresAt: string | null;
  }[];
  closingReferences: {
    issueNumber: number;
    verb: string;
    source: "pr_body_text";
  }[];
  liveGithub: {
    readOnly: true;
    prMarkdownLength: number;
    workflowRunCount: number;
    workflowJobCount: number;
    workflowArtifactCount: number;
    endpointErrorCount: number;
    endpointErrors: {
      label: string;
      status: number | null;
      message: string;
      action: string;
      rateLimitRemaining: string | null;
      rateLimitReset: string | null;
    }[];
  };
}

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
] as const;

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
] as const;

const FAILURE_CONCLUSIONS = new Set([
  "failure",
  "failed",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
  "timedout",
  "action_required",
  "startup_failure",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (trimmed.length === 0) return null;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "[redacted-sensitive-metadata]";
  }
  return trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
}

function stringValue(value: unknown, fallback: string): string {
  return cleanText(value) ?? fallback;
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function failureStepFrom(steps: readonly GitHubReadonlyWorkflowStep[]): string | null {
  const failed = steps.find((step) => FAILURE_CONCLUSIONS.has(normalizeToken(step.conclusion)));
  return cleanText(failed?.name);
}

function checkFromJob(
  job: GitHubReadonlyWorkflowJob,
  run: GitHubReadonlyWorkflowRun | null,
): AgentFactoryGithubWorkflowCheck {
  const workflowName = cleanText(run?.workflowName ?? run?.name);
  const jobName = cleanText(job.name);
  const hasDeterministicName = Boolean(workflowName || jobName);
  const fallbackId = job.id ?? run?.id ?? "unknown";

  return {
    name: hasDeterministicName
      ? stringValue(jobName ?? workflowName, `workflow job ${fallbackId}`)
      : `unknown workflow/job ${fallbackId}`,
    workflowName,
    jobName,
    failureStep: failureStepFrom(job.steps),
    status: hasDeterministicName ? cleanText(job.status) : null,
    conclusion: hasDeterministicName ? cleanText(job.conclusion) : null,
    required: true,
  };
}

function checkFromRun(run: GitHubReadonlyWorkflowRun): AgentFactoryGithubWorkflowCheck {
  const workflowName = cleanText(run.workflowName ?? run.name);
  const hasDeterministicName = Boolean(workflowName);
  const fallbackId = run.id ?? "unknown";

  return {
    name: hasDeterministicName ? workflowName ?? `workflow run ${fallbackId}` : `unknown workflow run ${fallbackId}`,
    workflowName,
    jobName: null,
    failureStep: null,
    status: hasDeterministicName ? cleanText(run.status) : null,
    conclusion: hasDeterministicName ? cleanText(run.conclusion) : null,
    required: true,
  };
}

function checkFromEndpointError(error: GitHubReadonlyEndpointError): AgentFactoryGithubWorkflowCheck {
  const label = stringValue(error.label, "GitHub live metadata");
  const action = stringValue(error.action, "Grant read permissions or retry after GitHub metadata is available.");

  return {
    name: `GitHub metadata blocked: ${label}. ${action}`,
    workflowName: "GitHub Live Metadata",
    jobName: null,
    failureStep: null,
    status: null,
    conclusion: null,
    required: true,
    failureDomain: "unknown_ci_failure",
  };
}

function workflowChecksFrom(snapshot: GitHubReadonlySnapshot): AgentFactoryGithubWorkflowCheck[] {
  const runById = new Map<number, GitHubReadonlyWorkflowRun>();
  for (const run of snapshot.workflowRuns) {
    if (typeof run.id === "number") runById.set(run.id, run);
  }

  const jobsByRun = new Map<number, GitHubReadonlyWorkflowJob[]>();
  for (const job of snapshot.workflowJobs) {
    if (typeof job.runId !== "number") continue;
    const jobs = jobsByRun.get(job.runId) ?? [];
    jobs.push(job);
    jobsByRun.set(job.runId, jobs);
  }

  const checks: AgentFactoryGithubWorkflowCheck[] = [];
  for (const run of snapshot.workflowRuns) {
    const runId = run.id;
    const jobs = typeof runId === "number" ? jobsByRun.get(runId) ?? [] : [];

    if (jobs.length === 0) {
      checks.push(checkFromRun(run));
      continue;
    }

    for (const job of jobs) {
      checks.push(checkFromJob(job, run));
    }
  }

  for (const job of snapshot.workflowJobs) {
    if (typeof job.runId === "number" && runById.has(job.runId)) continue;
    checks.push(checkFromJob(job, null));
  }

  checks.push(...snapshot.endpointErrors.map(checkFromEndpointError));
  return checks;
}

function mergeabilityFrom(
  snapshot: GitHubReadonlySnapshot,
): AgentFactoryGithubSnapshot["mergeability"] {
  const compareStatus = normalizeToken(snapshot.compare?.status);

  if (compareStatus === "diverged") return "diverged";
  if ((snapshot.compare?.behindBy ?? 0) > 0) return "behind_main";
  if (snapshot.pullRequest.mergeable === false) return "conflict";
  if (snapshot.pullRequest.mergeable === true) return "mergeable";
  return "unknown";
}

function mergeStateStatusFrom(snapshot: GitHubReadonlySnapshot): string {
  const mergeability = mergeabilityFrom(snapshot);
  if (mergeability === "diverged") return "DIVERGED";
  if (mergeability === "behind_main") return "BEHIND";
  if (mergeability === "conflict") return "DIRTY";
  if (mergeability === "mergeable") return "CLEAN";
  return stringValue(snapshot.pullRequest.mergeStateStatus, "UNKNOWN").toUpperCase();
}

function artifactFrom(snapshot: GitHubReadonlySnapshot): AgentFactoryGithubSnapshot["workflowArtifacts"][number][] {
  return snapshot.workflowArtifacts.map((artifact) => ({
    id: artifact.id,
    runId: artifact.runId,
    name: cleanText(artifact.name),
    sizeInBytes: artifact.sizeInBytes,
    expired: artifact.expired,
    createdAt: artifact.createdAt,
    expiresAt: artifact.expiresAt,
  }));
}

function endpointErrorsFrom(
  snapshot: GitHubReadonlySnapshot,
): AgentFactoryGithubSnapshot["liveGithub"]["endpointErrors"] {
  return snapshot.endpointErrors.map((error) => ({
    label: stringValue(error.label, "GitHub metadata"),
    status: error.status,
    message: stringValue(error.message, "GitHub metadata fetch failed."),
    action: stringValue(error.action, "Grant read permissions or retry after GitHub metadata is available."),
    rateLimitRemaining: error.rateLimitRemaining,
    rateLimitReset: error.rateLimitReset,
  }));
}

export function normalizeGithubSnapshotForAgentFactory(
  snapshot: GitHubReadonlySnapshot,
): AgentFactoryGithubSnapshot {
  const workflowChecks = workflowChecksFrom(snapshot);
  const mergeability = mergeabilityFrom(snapshot);
  const files = snapshot.files.map((file) => ({
    path: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
  }));
  const labels = snapshot.pullRequest.labels.map((name) => ({ name }));
  const changedFiles = snapshot.files.map((file) => file.filename);
  const prMetadata = {
    number: snapshot.pullRequest.number,
    prNumber: snapshot.pullRequest.number,
    title: snapshot.pullRequest.title,
    state: snapshot.pullRequest.state,
    isDraft: snapshot.pullRequest.draft,
    merged: snapshot.pullRequest.merged,
    baseRefOid: snapshot.pullRequest.base.sha,
    headRefOid: snapshot.pullRequest.head.sha,
    base: { ...snapshot.pullRequest.base },
    head: { ...snapshot.pullRequest.head },
    mergeable: snapshot.pullRequest.mergeable,
    mergeStateStatus: mergeStateStatusFrom(snapshot),
    mergeability,
    behindBy: snapshot.compare?.behindBy ?? null,
    commitsBehind: snapshot.compare?.behindBy ?? null,
    diverged: mergeability === "diverged",
    labels,
    files,
    changedFiles,
  };
  const normalized: AgentFactoryGithubSnapshot = {
    source: "github_live_readonly_normalized",
    fetchedAt: snapshot.fetchedAt,
    repo: snapshot.repo,
    repository: {
      nameWithOwner: snapshot.repository.fullName,
      defaultBranch: snapshot.repository.defaultBranch,
      visibility: snapshot.repository.visibility,
      isPrivate: snapshot.repository.isPrivate,
      archived: snapshot.repository.archived,
      disabled: snapshot.repository.disabled,
    },
    number: snapshot.pullRequest.number,
    prNumber: snapshot.pullRequest.number,
    pullRequest: prMetadata,
    title: snapshot.pullRequest.title,
    state: snapshot.pullRequest.state,
    isDraft: snapshot.pullRequest.draft,
    merged: snapshot.pullRequest.merged,
    baseRefOid: snapshot.pullRequest.base.sha,
    headRefOid: snapshot.pullRequest.head.sha,
    base: { ...snapshot.pullRequest.base },
    head: { ...snapshot.pullRequest.head },
    mergeable: snapshot.pullRequest.mergeable,
    mergeStateStatus: mergeStateStatusFrom(snapshot),
    mergeability,
    behindBy: snapshot.compare?.behindBy ?? null,
    commitsBehind: snapshot.compare?.behindBy ?? null,
    diverged: mergeability === "diverged",
    labels,
    files,
    changedFiles,
    statusCheckRollup: workflowChecks,
    workflowRunMetadata: snapshot.workflowRuns.map((run) => ({
      id: run.id,
      name: cleanText(run.name ?? run.workflowName),
      status: cleanText(run.status),
      conclusion: cleanText(run.conclusion),
      headSha: cleanText(run.headSha),
      runNumber: run.runNumber,
      runAttempt: run.runAttempt,
    })),
    workflowArtifacts: artifactFrom(snapshot),
    closingReferences: snapshot.closingReferences.map((reference) => ({ ...reference })),
    liveGithub: {
      readOnly: true,
      prMarkdownLength: snapshot.pullRequest.bodyText.length,
      workflowRunCount: snapshot.workflowRuns.length,
      workflowJobCount: snapshot.workflowJobs.length,
      workflowArtifactCount: snapshot.workflowArtifacts.length,
      endpointErrorCount: snapshot.endpointErrors.length,
      endpointErrors: endpointErrorsFrom(snapshot),
    },
  };

  assertGithubSnapshotSafe(normalized);
  return normalized;
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

export function buildGithubLiveSnapshotMarkdown(snapshot: AgentFactoryGithubSnapshot): string {
  return [
    "# AF007 Live GitHub Read-only Snapshot",
    "",
    `Repository: ${snapshot.repo}`,
    `PR: #${snapshot.prNumber} ${snapshot.title}`,
    `Fetched at: ${snapshot.fetchedAt}`,
    `Read-only: ${snapshot.liveGithub.readOnly ? "yes" : "no"}`,
    `Mergeability: ${snapshot.mergeability}`,
    `Changed files: ${snapshot.changedFiles.length}`,
    `Workflow checks: ${snapshot.statusCheckRollup.length}`,
    `Workflow artifacts: ${snapshot.workflowArtifacts.length}`,
    `Endpoint errors: ${snapshot.liveGithub.endpointErrorCount}`,
    "",
    "## Changed Files",
    "",
    listOrNone(snapshot.changedFiles),
    "",
    "## Workflow Checks",
    "",
    listOrNone(
      snapshot.statusCheckRollup.map((check) =>
        `${check.name}: ${check.status ?? "unknown"}/${check.conclusion ?? "unknown"}`,
      ),
    ),
    "",
    "## Closing References",
    "",
    listOrNone(snapshot.closingReferences.map((reference) => `${reference.verb} #${reference.issueNumber}`)),
    "",
    "## Endpoint Errors",
    "",
    listOrNone(
      snapshot.liveGithub.endpointErrors.map((error) =>
        `${error.label}: ${error.status ?? "network"} - ${error.action}`,
      ),
    ),
    "",
    "## Guardrails",
    "",
    "- Live GitHub access is read-only and report-only.",
    "- Raw PR body text is not written to this snapshot artifact.",
    "- Missing permissions, rate limits, unknown workflow names, and ambiguous job states block green classification.",
  ].join("\n");
}

export function assertGithubSnapshotSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(current));
      if (secretPattern) {
        throw new Error(`GitHub snapshot output contains a secret-looking value at ${path}.`);
      }
      return;
    }

    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      const forbiddenPattern = FORBIDDEN_OUTPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbiddenPattern) {
        throw new Error(`GitHub snapshot output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
