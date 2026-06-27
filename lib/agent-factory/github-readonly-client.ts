export interface GitHubReadonlyEndpointError {
  endpoint: string;
  label: string;
  status: number | null;
  message: string;
  action: string;
  rateLimitRemaining: string | null;
  rateLimitReset: string | null;
}

export interface GitHubReadonlyRepository {
  id: number | null;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  visibility: string | null;
  isPrivate: boolean | null;
  archived: boolean | null;
  disabled: boolean | null;
}

export interface GitHubReadonlyPullRequest {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  merged: boolean;
  bodyText: string;
  mergeable: boolean | null;
  mergeStateStatus: string | null;
  labels: string[];
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
  userLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GitHubReadonlyChangedFile {
  filename: string;
  status: string | null;
  additions: number | null;
  deletions: number | null;
  changes: number | null;
}

export interface GitHubReadonlyCompare {
  status: string | null;
  aheadBy: number | null;
  behindBy: number | null;
  totalCommits: number | null;
}

export interface GitHubReadonlyWorkflowStep {
  name: string | null;
  status: string | null;
  conclusion: string | null;
  number: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GitHubReadonlyWorkflowJob {
  id: number | null;
  runId: number | null;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string | null;
  steps: GitHubReadonlyWorkflowStep[];
}

export interface GitHubReadonlyWorkflowRun {
  id: number | null;
  name: string | null;
  workflowName: string | null;
  event: string | null;
  status: string | null;
  conclusion: string | null;
  headSha: string | null;
  runNumber: number | null;
  runAttempt: number | null;
  htmlUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GitHubReadonlyWorkflowArtifact {
  id: number | null;
  runId: number | null;
  name: string | null;
  sizeInBytes: number | null;
  expired: boolean | null;
  createdAt: string | null;
  expiresAt: string | null;
}

export interface GitHubReadonlyClosingReference {
  issueNumber: number;
  verb: string;
  source: "pr_body_text";
}

export interface GitHubReadonlySnapshot {
  source: "github_live_readonly";
  fetchedAt: string;
  repo: string;
  repository: GitHubReadonlyRepository;
  pullRequest: GitHubReadonlyPullRequest;
  files: GitHubReadonlyChangedFile[];
  compare: GitHubReadonlyCompare | null;
  workflowRuns: GitHubReadonlyWorkflowRun[];
  workflowJobs: GitHubReadonlyWorkflowJob[];
  workflowArtifacts: GitHubReadonlyWorkflowArtifact[];
  closingReferences: GitHubReadonlyClosingReference[];
  endpointErrors: GitHubReadonlyEndpointError[];
}

export interface GitHubReadonlyClientOptions {
  repo: string;
  apiBaseUrl?: string;
  token?: string;
  userAgent?: string;
  maxWorkflowRuns?: number;
  fetchImpl?: typeof fetch;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_API_BASE_URL = "https://api.github.com";
const DEFAULT_USER_AGENT = "inverge-agent-factory-readonly";
const DEFAULT_MAX_WORKFLOW_RUNS = 8;
const MAX_PAGES = 10;
const CLOSING_REFERENCE_PATTERN =
  /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi;

class GitHubReadonlyHttpError extends Error {
  endpointError: GitHubReadonlyEndpointError;

  constructor(endpointError: GitHubReadonlyEndpointError) {
    super(endpointError.message);
    this.name = "GitHubReadonlyHttpError";
    this.endpointError = endpointError;
  }
}

export class GitHubReadonlyClientError extends Error {
  endpointError: GitHubReadonlyEndpointError;

  constructor(endpointError: GitHubReadonlyEndpointError) {
    super(`${endpointError.message} ${endpointError.action}`);
    this.name = "GitHubReadonlyClientError";
    this.endpointError = endpointError;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\u0000-\u001f]/g, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return cleanText(value) ?? fallback;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value);
  return null;
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function parseRepo(repo: string): { owner: string; name: string; fullName: string } {
  const normalized = repo.trim();
  const match = normalized.match(/^([^/\s]+)\/([^/\s]+)$/);

  if (!match) {
    throw new Error(`Repository must be owner/name, received: ${repo}`);
  }

  return {
    owner: match[1],
    name: match[2],
    fullName: `${match[1]}/${match[2]}`,
  };
}

function encodePathPart(value: string | number): string {
  return encodeURIComponent(String(value));
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return cleanText(entry);
      const record = asRecord(entry);
      return cleanText(record?.name);
    })
    .filter((entry): entry is string => Boolean(entry));
}

function repositoryFrom(input: unknown, fallbackRepo: string): GitHubReadonlyRepository {
  const record = asRecord(input) ?? {};
  const owner = asRecord(record.owner);
  const parsed = parseRepo(fallbackRepo);

  return {
    id: numberValue(record.id),
    name: stringValue(record.name, parsed.name),
    fullName: stringValue(record.full_name, fallbackRepo),
    owner: stringValue(owner?.login, parsed.owner),
    defaultBranch: cleanText(record.default_branch),
    visibility: cleanText(record.visibility),
    isPrivate: booleanValue(record.private),
    archived: booleanValue(record.archived),
    disabled: booleanValue(record.disabled),
  };
}

function repositoryFullName(value: unknown): string | null {
  const record = asRecord(value);
  return cleanText(record?.full_name);
}

function pullRequestFrom(input: unknown): GitHubReadonlyPullRequest {
  const record = asRecord(input);

  if (!record) {
    throw new Error("GitHub pull request response was not a JSON object.");
  }

  const base = asRecord(record.base) ?? {};
  const head = asRecord(record.head) ?? {};
  const user = asRecord(record.user);

  return {
    number: numberValue(record.number) ?? 0,
    title: stringValue(record.title, "Untitled PR"),
    state: stringValue(record.state, "unknown"),
    draft: booleanValue(record.draft) === true,
    merged: booleanValue(record.merged) === true,
    bodyText: typeof record.body === "string" ? record.body : "",
    mergeable: booleanValue(record.mergeable),
    mergeStateStatus: cleanText(record.mergeable_state),
    labels: safeStringArray(record.labels),
    base: {
      ref: cleanText(base.ref),
      sha: cleanText(base.sha),
      repo: repositoryFullName(base.repo),
    },
    head: {
      ref: cleanText(head.ref),
      sha: cleanText(head.sha),
      repo: repositoryFullName(head.repo),
    },
    userLogin: cleanText(user?.login),
    createdAt: cleanText(record.created_at),
    updatedAt: cleanText(record.updated_at),
  };
}

function changedFileFrom(input: unknown): GitHubReadonlyChangedFile | null {
  const record = asRecord(input);
  const filename = cleanText(record?.filename);
  if (!record || !filename) return null;

  return {
    filename,
    status: cleanText(record.status),
    additions: numberValue(record.additions),
    deletions: numberValue(record.deletions),
    changes: numberValue(record.changes),
  };
}

function compareFrom(input: unknown): GitHubReadonlyCompare {
  const record = asRecord(input) ?? {};

  return {
    status: cleanText(record.status),
    aheadBy: numberValue(record.ahead_by),
    behindBy: numberValue(record.behind_by),
    totalCommits: numberValue(record.total_commits),
  };
}

function workflowRunFrom(input: unknown): GitHubReadonlyWorkflowRun | null {
  const record = asRecord(input);
  if (!record) return null;

  return {
    id: numberValue(record.id),
    name: cleanText(record.name),
    workflowName: cleanText(record.name),
    event: cleanText(record.event),
    status: cleanText(record.status),
    conclusion: cleanText(record.conclusion),
    headSha: cleanText(record.head_sha),
    runNumber: numberValue(record.run_number),
    runAttempt: numberValue(record.run_attempt),
    htmlUrl: cleanText(record.html_url),
    createdAt: cleanText(record.created_at),
    updatedAt: cleanText(record.updated_at),
  };
}

function workflowStepFrom(input: unknown): GitHubReadonlyWorkflowStep | null {
  const record = asRecord(input);
  if (!record) return null;

  return {
    name: cleanText(record.name),
    status: cleanText(record.status),
    conclusion: cleanText(record.conclusion),
    number: numberValue(record.number),
    startedAt: cleanText(record.started_at),
    completedAt: cleanText(record.completed_at),
  };
}

function workflowJobFrom(input: unknown, runId: number | null): GitHubReadonlyWorkflowJob | null {
  const record = asRecord(input);
  if (!record) return null;

  return {
    id: numberValue(record.id),
    runId: numberValue(record.run_id) ?? runId,
    name: cleanText(record.name),
    status: cleanText(record.status),
    conclusion: cleanText(record.conclusion),
    startedAt: cleanText(record.started_at),
    completedAt: cleanText(record.completed_at),
    htmlUrl: cleanText(record.html_url),
    steps: Array.isArray(record.steps)
      ? record.steps.map(workflowStepFrom).filter((entry): entry is GitHubReadonlyWorkflowStep => Boolean(entry))
      : [],
  };
}

function workflowArtifactFrom(input: unknown, runId: number | null): GitHubReadonlyWorkflowArtifact | null {
  const record = asRecord(input);
  if (!record) return null;

  return {
    id: numberValue(record.id),
    runId,
    name: cleanText(record.name),
    sizeInBytes: numberValue(record.size_in_bytes),
    expired: booleanValue(record.expired),
    createdAt: cleanText(record.created_at),
    expiresAt: cleanText(record.expires_at),
  };
}

function closingReferencesFrom(body: string): GitHubReadonlyClosingReference[] {
  const references = new Map<number, GitHubReadonlyClosingReference>();

  for (const match of body.matchAll(CLOSING_REFERENCE_PATTERN)) {
    const issueNumber = Number(match[2]);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0 || references.has(issueNumber)) {
      continue;
    }

    references.set(issueNumber, {
      issueNumber,
      verb: match[1],
      source: "pr_body_text",
    });
  }

  return [...references.values()];
}

function actionForStatus(status: number | null, label: string): string {
  if (status === 401) {
    return "Provide the default GitHub Actions token as GITHUB_TOKEN or AGENT_FACTORY_GITHUB_TOKEN with read-only repository access.";
  }

  if (status === 403) {
    return `Grant the workflow read permissions needed for ${label}; AF007 expects contents: read, actions: read, pull-requests: read, and checks: read.`;
  }

  if (status === 404) {
    return `Confirm the repository, PR number, and read permissions for ${label}; AF007 will not invent missing GitHub metadata.`;
  }

  if (status === null) {
    return `Retry after network access is available for ${label}; AF007 performs no fallback mutation.`;
  }

  return `Inspect GitHub API availability for ${label}; AF007 failed closed without mutating GitHub.`;
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const record = asRecord(body);
    return cleanText(record?.message) ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export class GitHubReadonlyClient {
  private readonly repoParts: { owner: string; name: string; fullName: string };
  private readonly apiBaseUrl: string;
  private readonly token: string | undefined;
  private readonly userAgent: string;
  private readonly maxWorkflowRuns: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubReadonlyClientOptions) {
    this.repoParts = parseRepo(options.repo);
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
    this.token = cleanText(options.token) ?? undefined;
    this.userAgent = cleanText(options.userAgent) ?? DEFAULT_USER_AGENT;
    this.maxWorkflowRuns = Math.max(1, Math.min(options.maxWorkflowRuns ?? DEFAULT_MAX_WORKFLOW_RUNS, 20));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchPullRequestSnapshot(prNumber: number): Promise<GitHubReadonlySnapshot> {
    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      throw new Error(`pr_number must be a positive integer for live GitHub modes; received ${prNumber}.`);
    }

    const repository = repositoryFrom(
      await this.requestJson(this.repoEndpoint(), "repository metadata"),
      this.repoParts.fullName,
    );
    const pullRequest = pullRequestFrom(
      await this.requestJson(this.pullRequestEndpoint(prNumber), `PR #${prNumber} metadata`),
    );
    const endpointErrors: GitHubReadonlyEndpointError[] = [];
    const filesResult = await this.tryPaginatedJson(
      this.pullRequestFilesEndpoint(prNumber),
      `PR #${prNumber} changed files`,
    );
    endpointErrors.push(...filesResult.errors);

    const compareResult = pullRequest.base.sha && pullRequest.head.sha
      ? await this.tryJson(
          this.compareEndpoint(pullRequest.base.sha, pullRequest.head.sha),
          `PR #${prNumber} compare state`,
        )
      : { value: null, error: null };
    if (compareResult.error) endpointErrors.push(compareResult.error);

    const runsResult = pullRequest.head.sha
      ? await this.tryJson(
          this.workflowRunsEndpoint(pullRequest.head.sha),
          `workflow runs for PR #${prNumber} head commit`,
        )
      : { value: null, error: null };
    if (runsResult.error) endpointErrors.push(runsResult.error);

    const workflowRuns = this.workflowRunsFrom(runsResult.value).slice(0, this.maxWorkflowRuns);
    const jobAndArtifactResults = await Promise.all(
      workflowRuns.map((run) => this.fetchRunDetails(run.id)),
    );
    const workflowJobs = jobAndArtifactResults.flatMap((result) => result.jobs);
    const workflowArtifacts = jobAndArtifactResults.flatMap((result) => result.artifacts);
    endpointErrors.push(...jobAndArtifactResults.flatMap((result) => result.errors));

    return {
      source: "github_live_readonly",
      fetchedAt: new Date().toISOString(),
      repo: this.repoParts.fullName,
      repository,
      pullRequest,
      files: filesResult.values.map(changedFileFrom).filter((entry): entry is GitHubReadonlyChangedFile => Boolean(entry)),
      compare: compareResult.value ? compareFrom(compareResult.value) : null,
      workflowRuns,
      workflowJobs,
      workflowArtifacts,
      closingReferences: closingReferencesFrom(pullRequest.bodyText),
      endpointErrors,
    };
  }

  private repoEndpoint(): string {
    return `/repos/${encodePathPart(this.repoParts.owner)}/${encodePathPart(this.repoParts.name)}`;
  }

  private pullRequestEndpoint(prNumber: number): string {
    return `${this.repoEndpoint()}/pulls/${encodePathPart(prNumber)}`;
  }

  private pullRequestFilesEndpoint(prNumber: number): string {
    return `${this.pullRequestEndpoint(prNumber)}/files`;
  }

  private compareEndpoint(baseSha: string, headSha: string): string {
    return `${this.repoEndpoint()}/compare/${encodePathPart(baseSha)}...${encodePathPart(headSha)}`;
  }

  private workflowRunsEndpoint(headSha: string): string {
    return `${this.repoEndpoint()}/actions/runs?head_sha=${encodePathPart(headSha)}&per_page=${this.maxWorkflowRuns}`;
  }

  private runJobsEndpoint(runId: number): string {
    return `${this.repoEndpoint()}/actions/runs/${encodePathPart(runId)}/jobs`;
  }

  private runArtifactsEndpoint(runId: number): string {
    return `${this.repoEndpoint()}/actions/runs/${encodePathPart(runId)}/artifacts`;
  }

  private async fetchRunDetails(runId: number | null): Promise<{
    jobs: GitHubReadonlyWorkflowJob[];
    artifacts: GitHubReadonlyWorkflowArtifact[];
    errors: GitHubReadonlyEndpointError[];
  }> {
    if (runId === null) {
      return {
        jobs: [],
        artifacts: [],
        errors: [{
          endpoint: "workflow-run-details",
          label: "workflow run details",
          status: null,
          message: "A workflow run did not include a numeric run id.",
          action: "Wait for GitHub Actions metadata to become complete before treating live CI as green.",
          rateLimitRemaining: null,
          rateLimitReset: null,
        }],
      };
    }

    const [jobsResult, artifactsResult] = await Promise.all([
      this.tryJson(this.runJobsEndpoint(runId), `workflow jobs for run ${runId}`),
      this.tryJson(this.runArtifactsEndpoint(runId), `workflow artifacts for run ${runId}`),
    ]);
    const errors = [
      jobsResult.error,
      artifactsResult.error,
    ].filter((entry): entry is GitHubReadonlyEndpointError => Boolean(entry));

    return {
      jobs: this.workflowJobsFrom(jobsResult.value, runId),
      artifacts: this.workflowArtifactsFrom(artifactsResult.value, runId),
      errors,
    };
  }

  private workflowRunsFrom(value: unknown): GitHubReadonlyWorkflowRun[] {
    const record = asRecord(value);
    const runs = Array.isArray(record?.workflow_runs) ? record.workflow_runs : [];
    return runs.map(workflowRunFrom).filter((entry): entry is GitHubReadonlyWorkflowRun => Boolean(entry));
  }

  private workflowJobsFrom(value: unknown, runId: number): GitHubReadonlyWorkflowJob[] {
    const record = asRecord(value);
    const jobs = Array.isArray(record?.jobs) ? record.jobs : [];
    return jobs.map((entry) => workflowJobFrom(entry, runId)).filter((entry): entry is GitHubReadonlyWorkflowJob => Boolean(entry));
  }

  private workflowArtifactsFrom(value: unknown, runId: number): GitHubReadonlyWorkflowArtifact[] {
    const record = asRecord(value);
    const artifacts = Array.isArray(record?.artifacts) ? record.artifacts : [];
    return artifacts
      .map((entry) => workflowArtifactFrom(entry, runId))
      .filter((entry): entry is GitHubReadonlyWorkflowArtifact => Boolean(entry));
  }

  private async requestJson(endpoint: string, label: string): Promise<unknown> {
    const response = await this.fetchResponse(endpoint, label);

    try {
      return await response.json();
    } catch (error) {
      const endpointError: GitHubReadonlyEndpointError = {
        endpoint,
        label,
        status: response.status,
        message: `${label} response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        action: "Retry after GitHub returns valid JSON metadata; AF007 will not invent missing fields.",
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
        rateLimitReset: response.headers.get("x-ratelimit-reset"),
      };
      throw new GitHubReadonlyHttpError(endpointError);
    }
  }

  private async tryJson(endpoint: string, label: string): Promise<{
    value: unknown | null;
    error: GitHubReadonlyEndpointError | null;
  }> {
    try {
      return {
        value: await this.requestJson(endpoint, label),
        error: null,
      };
    } catch (error) {
      return {
        value: null,
        error: this.endpointErrorFromUnknown(error, endpoint, label),
      };
    }
  }

  private async tryPaginatedJson(endpoint: string, label: string): Promise<{
    values: unknown[];
    errors: GitHubReadonlyEndpointError[];
  }> {
    const values: unknown[] = [];
    const errors: GitHubReadonlyEndpointError[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const separator = endpoint.includes("?") ? "&" : "?";
      const pageEndpoint = `${endpoint}${separator}per_page=100&page=${page}`;
      const result = await this.tryJson(pageEndpoint, label);

      if (result.error) {
        errors.push(result.error);
        break;
      }

      if (!Array.isArray(result.value)) break;
      values.push(...result.value);
      if (result.value.length < 100) break;
    }

    return { values, errors };
  }

  private async fetchResponse(endpoint: string, label: string): Promise<Response> {
    let response: Response;

    try {
      response = await this.fetchImpl(this.urlFor(endpoint), {
        method: "GET",
        headers: this.headers(),
      });
    } catch (error) {
      throw new GitHubReadonlyHttpError({
        endpoint,
        label,
        status: null,
        message: `${label} could not be fetched: ${error instanceof Error ? error.message : String(error)}`,
        action: actionForStatus(null, label),
        rateLimitRemaining: null,
        rateLimitReset: null,
      });
    }

    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      const rateLimited = response.status === 403 && remaining === "0";
      const action = rateLimited
        ? `GitHub API rate limit was reached for ${label}; wait until reset ${reset ?? "is reported by GitHub"} and rerun.`
        : actionForStatus(response.status, label);

      throw new GitHubReadonlyHttpError({
        endpoint,
        label,
        status: response.status,
        message: `${label} request failed with ${response.status}: ${await responseMessage(response)}`,
        action,
        rateLimitRemaining: remaining,
        rateLimitReset: reset,
      });
    }

    return response;
  }

  private urlFor(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) return endpoint;
    return `${this.apiBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  private headers(): HeadersInit {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "user-agent": this.userAgent,
      "x-github-api-version": "2022-11-28",
    };

    if (this.token) {
      headers.authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private endpointErrorFromUnknown(
    error: unknown,
    endpoint: string,
    label: string,
  ): GitHubReadonlyEndpointError {
    if (error instanceof GitHubReadonlyHttpError) return error.endpointError;
    if (error instanceof GitHubReadonlyClientError) return error.endpointError;

    return {
      endpoint,
      label,
      status: null,
      message: `${label} could not be fetched: ${error instanceof Error ? error.message : String(error)}`,
      action: actionForStatus(null, label),
      rateLimitRemaining: null,
      rateLimitReset: null,
    };
  }
}

export function createGitHubReadonlyClientFromEnvironment(
  options: Pick<GitHubReadonlyClientOptions, "repo"> &
    Partial<Omit<GitHubReadonlyClientOptions, "repo">> = {
      repo: process.env.AGENT_FACTORY_REPO ?? "chachathecat/inverge",
    },
): GitHubReadonlyClient {
  return new GitHubReadonlyClient({
    ...options,
    repo: options.repo,
    apiBaseUrl:
      options.apiBaseUrl ??
      process.env.AGENT_FACTORY_GITHUB_API_BASE_URL ??
      process.env.GITHUB_API_BASE_URL ??
      DEFAULT_API_BASE_URL,
    token:
      options.token ??
      process.env.AGENT_FACTORY_GITHUB_TOKEN ??
      process.env.GITHUB_TOKEN ??
      process.env.GH_TOKEN,
  });
}
