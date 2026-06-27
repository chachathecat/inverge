import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { test } from "node:test";
import { createCiWatcherReport } from "../lib/agent-factory/ci-watcher.ts";
import { createPrContractDoctorReport } from "../lib/agent-factory/pr-contract-doctor.ts";
import { createSafeRepairPlan } from "../lib/agent-factory/safe-repair-loop.ts";
import { createRebaseMergePlan } from "../lib/agent-factory/rebase-merge-orchestrator.ts";
import {
  assertGithubSnapshotSafe,
  normalizeGithubSnapshotForAgentFactory,
} from "../lib/agent-factory/github-snapshot-normalizer.ts";

const RUN_SCRIPT = path.resolve("scripts/agent-factory-run.mjs");
const WORKFLOW_PATH = path.resolve(".github/workflows/agent-factory-run.yml");
const BUTTON_DOC_PATH = path.resolve("docs/agent-factory-github-actions-button.md");
const LIVE_DOC_PATH = path.resolve("docs/agent-factory-live-github-readonly.md");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";
const BASE_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);
const LIVE_MODES = [
  "watch_live",
  "doctor_pr_body_live",
  "repair_plan_live",
  "merge_plan_live",
];

const VALID_PR_BODY = [
  "## Goal",
  "",
  "Closes #463",
  "Ship AF007 live read-only GitHub metadata integration.",
  "",
  "## Non-goals",
  "",
  "- Do not mutate GitHub state.",
  "",
  "## Risk classification",
  "",
  "- Risk: [low]",
  "",
  "## Data boundary",
  "",
  "- Metadata-only Agent Factory automation.",
  "",
  "## Schema / API / environment changes",
  "",
  "None.",
  "",
  "## Tests and evidence",
  "",
  "- Focused AF007 tests.",
  "",
  "## Runtime evidence",
  "",
  "- Required: GitHub Actions manual run after PR open.",
  "- Result: Pending.",
  "- Artifact: Pending.",
  "",
  "## Rollout and rollback",
  "",
  "- Rollout: Merge after review.",
  "- Rollback: Revert this PR.",
  "",
  "## Remaining risks",
  "",
  "- Human review must confirm live workflow behavior.",
  "",
  "## Merge recommendation",
  "",
  "- [ ] Auto-merge candidate",
  "- [x] Human approval required",
  "- [ ] Blocked",
].join("\n");

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function runDispatcherSync(args, env = {}) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      RUN_SCRIPT,
      ...args,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

function runDispatcherAsync(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        NODE_TEST_LOADER,
        RUN_SCRIPT,
        ...args,
      ],
      {
        env: { ...process.env, ...env },
      },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function readSummary(outputDir) {
  return fs.readFileSync(path.join(outputDir, "agent-factory-run-summary.md"), "utf8");
}

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

function assertNoUnsafeArtifactText(outputDir) {
  for (const file of listFiles(outputDir)) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("ghp_should_not_escape"), false, file);
    assert.equal(text.includes("secretToken"), false, file);
    assert.equal(text.includes("rawAnswer"), false, file);
    assert.equal(text.includes("learner answer must not escape"), false, file);
    assert.equal(text.includes("providerPayload"), false, file);
  }
}

function liveSnapshot(overrides = {}) {
  return {
    source: "github_live_readonly",
    fetchedAt: "2026-06-27T00:00:00.000Z",
    repo: "chachathecat/inverge",
    repository: {
      id: 1,
      name: "inverge",
      fullName: "chachathecat/inverge",
      owner: "chachathecat",
      defaultBranch: "main",
      visibility: "private",
      isPrivate: true,
      archived: false,
      disabled: false,
    },
    pullRequest: {
      number: 463,
      title: "[AF007] Live GitHub Read-only Integration for Agent Factory",
      state: "open",
      draft: false,
      merged: false,
      bodyText: VALID_PR_BODY,
      mergeable: true,
      mergeStateStatus: "clean",
      labels: [],
      base: { ref: "main", sha: BASE_SHA, repo: "chachathecat/inverge" },
      head: { ref: "feat/af007-live-github-readonly", sha: HEAD_SHA, repo: "chachathecat/inverge" },
      userLogin: "octocat",
      createdAt: "2026-06-27T00:00:00Z",
      updatedAt: "2026-06-27T00:00:00Z",
    },
    files: [
      {
        filename: "lib/agent-factory/github-readonly-client.ts",
        status: "added",
        additions: 10,
        deletions: 0,
        changes: 10,
      },
      {
        filename: "tests/agent-factory-live-github-readonly.test.mjs",
        status: "added",
        additions: 10,
        deletions: 0,
        changes: 10,
      },
    ],
    compare: { status: "ahead", aheadBy: 1, behindBy: 0, totalCommits: 1 },
    workflowRuns: [
      {
        id: 9001,
        name: "Fast CI",
        workflowName: "Fast CI",
        event: "pull_request",
        status: "completed",
        conclusion: "success",
        headSha: HEAD_SHA,
        runNumber: 12,
        runAttempt: 1,
        htmlUrl: "https://github.example/runs/9001",
        createdAt: "2026-06-27T00:00:00Z",
        updatedAt: "2026-06-27T00:00:00Z",
      },
    ],
    workflowJobs: [
      {
        id: 1,
        runId: 9001,
        name: "typecheck",
        status: "completed",
        conclusion: "success",
        startedAt: "2026-06-27T00:00:00Z",
        completedAt: "2026-06-27T00:01:00Z",
        htmlUrl: "https://github.example/jobs/1",
        steps: [{ name: "tsc", status: "completed", conclusion: "success", number: 1 }],
      },
      {
        id: 2,
        runId: 9001,
        name: "lint",
        status: "completed",
        conclusion: "success",
        startedAt: "2026-06-27T00:00:00Z",
        completedAt: "2026-06-27T00:01:00Z",
        htmlUrl: "https://github.example/jobs/2",
        steps: [{ name: "eslint", status: "completed", conclusion: "success", number: 1 }],
      },
      {
        id: 3,
        runId: 9001,
        name: "unit tests",
        status: "completed",
        conclusion: "success",
        startedAt: "2026-06-27T00:00:00Z",
        completedAt: "2026-06-27T00:01:00Z",
        htmlUrl: "https://github.example/jobs/3",
        steps: [{ name: "node --test", status: "completed", conclusion: "success", number: 1 }],
      },
      {
        id: 4,
        runId: 9001,
        name: "build",
        status: "completed",
        conclusion: "success",
        startedAt: "2026-06-27T00:00:00Z",
        completedAt: "2026-06-27T00:01:00Z",
        htmlUrl: "https://github.example/jobs/4",
        steps: [{ name: "next build", status: "completed", conclusion: "success", number: 1 }],
      },
    ],
    workflowArtifacts: [
      {
        id: 77,
        runId: 9001,
        name: "agent-factory-report",
        sizeInBytes: 1234,
        expired: false,
        createdAt: "2026-06-27T00:00:00Z",
        expiresAt: "2026-07-11T00:00:00Z",
      },
    ],
    closingReferences: [{ issueNumber: 463, verb: "Closes", source: "pr_body_text" }],
    endpointErrors: [],
    ...overrides,
  };
}

function mockGitHubResponses(bodyText = VALID_PR_BODY) {
  return {
    "/repos/chachathecat/inverge": {
      id: 1,
      name: "inverge",
      full_name: "chachathecat/inverge",
      owner: { login: "chachathecat" },
      default_branch: "main",
      visibility: "private",
      private: true,
      archived: false,
      disabled: false,
    },
    "/repos/chachathecat/inverge/pulls/463": {
      number: 463,
      title: "[AF007] Live GitHub Read-only Integration for Agent Factory",
      state: "open",
      draft: false,
      merged: false,
      body: bodyText,
      mergeable: true,
      mergeable_state: "clean",
      labels: [],
      base: { ref: "main", sha: BASE_SHA, repo: { full_name: "chachathecat/inverge" } },
      head: {
        ref: "feat/af007-live-github-readonly",
        sha: HEAD_SHA,
        repo: { full_name: "chachathecat/inverge" },
      },
      user: { login: "octocat" },
      created_at: "2026-06-27T00:00:00Z",
      updated_at: "2026-06-27T00:00:00Z",
    },
    "/repos/chachathecat/inverge/pulls/463/files": [
      { filename: "lib/agent-factory/github-readonly-client.ts", status: "added", additions: 10, deletions: 0, changes: 10 },
      { filename: "tests/agent-factory-live-github-readonly.test.mjs", status: "added", additions: 10, deletions: 0, changes: 10 },
      { filename: "docs/agent-factory-live-github-readonly.md", status: "added", additions: 10, deletions: 0, changes: 10 },
    ],
    [`/repos/chachathecat/inverge/compare/${BASE_SHA}...${HEAD_SHA}`]: {
      status: "ahead",
      ahead_by: 1,
      behind_by: 0,
      total_commits: 1,
    },
    "/repos/chachathecat/inverge/actions/runs": {
      workflow_runs: [
        {
          id: 9001,
          name: "Fast CI",
          event: "pull_request",
          status: "completed",
          conclusion: "success",
          head_sha: HEAD_SHA,
          run_number: 12,
          run_attempt: 1,
          html_url: "https://github.example/runs/9001",
          created_at: "2026-06-27T00:00:00Z",
          updated_at: "2026-06-27T00:01:00Z",
        },
      ],
    },
    "/repos/chachathecat/inverge/actions/runs/9001/jobs": {
      jobs: [
        { id: 1, run_id: 9001, name: "typecheck", status: "completed", conclusion: "success", steps: [{ name: "tsc", status: "completed", conclusion: "success", number: 1 }] },
        { id: 2, run_id: 9001, name: "lint", status: "completed", conclusion: "success", steps: [{ name: "eslint", status: "completed", conclusion: "success", number: 1 }] },
        { id: 3, run_id: 9001, name: "unit tests", status: "completed", conclusion: "success", steps: [{ name: "node --test", status: "completed", conclusion: "success", number: 1 }] },
        { id: 4, run_id: 9001, name: "build", status: "completed", conclusion: "success", steps: [{ name: "next build", status: "completed", conclusion: "success", number: 1 }] },
      ],
    },
    "/repos/chachathecat/inverge/actions/runs/9001/artifacts": {
      artifacts: [
        { id: 77, name: "agent-factory-report", size_in_bytes: 1234, expired: false, created_at: "2026-06-27T00:00:00Z", expires_at: "2026-07-11T00:00:00Z" },
      ],
    },
  };
}

async function withMockGitHubServer(callback, bodyText = VALID_PR_BODY) {
  const responses = mockGitHubResponses(bodyText);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const payload = responses[url.pathname];

    if (payload === undefined) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: `No mock for ${url.pathname}` }));
      return;
    }

    response.writeHead(200, {
      "content-type": "application/json",
      "x-ratelimit-remaining": "4999",
    });
    response.end(JSON.stringify(payload));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runLiveMode(mode, baseUrl, bodyText = VALID_PR_BODY) {
  const outputDir = tempDir(`af007-${mode}`);
  const result = await runDispatcherAsync(
    [
      "--mode",
      mode,
      "--pr-number",
      "463",
      "--output-dir",
      outputDir,
      "--stdout",
      "none",
      "--allow-mutation",
      "false",
    ],
    {
      AGENT_FACTORY_GITHUB_API_BASE_URL: baseUrl,
      AGENT_FACTORY_GITHUB_TOKEN: "",
      GITHUB_TOKEN: "",
    },
  );

  return { outputDir, result, bodyText };
}

test("live modes are listed in workflow, docs, help, and default test runner", () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
  const buttonDoc = fs.readFileSync(BUTTON_DOC_PATH, "utf8");
  const liveDoc = fs.readFileSync(LIVE_DOC_PATH, "utf8");
  const runner = fs.readFileSync(TEST_RUNNER_PATH, "utf8");
  const help = runDispatcherSync(["--help"]);

  assert.equal(help.status, 0, help.stderr);
  for (const mode of LIVE_MODES) {
    assert.match(workflow, new RegExp(`- ${mode}`));
    assert.match(buttonDoc, new RegExp(`\\b${mode}\\b`));
    assert.match(liveDoc, new RegExp(`\\b${mode}\\b`));
    assert.match(help.stdout, new RegExp(`\\b${mode}\\b`));
  }

  assert.match(workflow, /pr_number:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /checks: read/);
  assert.match(runner, /tests\/agent-factory-live-github-readonly\.test\.mjs/);
});

test("pr_number is required for live modes", () => {
  const outputDir = tempDir("af007-missing-pr");
  const result = runDispatcherSync([
    "--mode",
    "watch_live",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pr_number is required/);
  assert.match(readSummary(outputDir), /pr_number is required/);
});

test("allow_mutation true fails closed for live modes before GitHub fetch", () => {
  const outputDir = tempDir("af007-allow-mutation");
  const result = runDispatcherSync([
    "--mode",
    "watch_live",
    "--pr-number",
    "463",
    "--allow-mutation",
    "true",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /allow_mutation must be false/);
  assert.match(readSummary(outputDir), /read-only\/report-only/);
});

test("mocked GitHub PR metadata normalizes into AF002-compatible snapshot", () => {
  const normalized = normalizeGithubSnapshotForAgentFactory(liveSnapshot());

  assert.equal(normalized.source, "github_live_readonly_normalized");
  assert.equal(normalized.prNumber, 463);
  assert.equal(normalized.mergeability, "mergeable");
  assert.deepEqual(normalized.changedFiles, [
    "lib/agent-factory/github-readonly-client.ts",
    "tests/agent-factory-live-github-readonly.test.mjs",
  ]);
  assert.equal(normalized.statusCheckRollup.length, 4);
  assert.equal(normalized.closingReferences[0].issueNumber, 463);
  assert.equal(JSON.stringify(normalized).includes(VALID_PR_BODY), false);
  assert.doesNotThrow(() => assertGithubSnapshotSafe(normalized));
});

test("mocked workflow runs, jobs, and steps normalize into expected workflow summary", () => {
  const normalized = normalizeGithubSnapshotForAgentFactory(
    liveSnapshot({
      workflowJobs: [
        {
          id: 1,
          runId: 9001,
          name: "lint",
          status: "completed",
          conclusion: "failure",
          startedAt: null,
          completedAt: null,
          htmlUrl: null,
          steps: [
            { name: "install", status: "completed", conclusion: "success", number: 1 },
            { name: "eslint", status: "completed", conclusion: "failure", number: 2 },
          ],
        },
      ],
    }),
  );
  const report = createCiWatcherReport(normalized);

  assert.equal(report.workflowSummary.failed, 1);
  assert.deepEqual(report.failedDomains, ["lint_failure"]);
  assert.ok(normalized.statusCheckRollup[0].failureStep.includes("eslint"));
});

test("missing GitHub permissions fail safely with blocked AF002 reason", () => {
  const normalized = normalizeGithubSnapshotForAgentFactory(
    liveSnapshot({
      workflowRuns: [],
      workflowJobs: [],
      endpointErrors: [
        {
          endpoint: "/repos/chachathecat/inverge/actions/runs",
          label: "workflow runs for PR #463 head commit",
          status: 403,
          message: "Resource not accessible by integration",
          action: "Grant actions: read to the Agent Factory workflow permissions.",
          rateLimitRemaining: "4999",
          rateLimitReset: null,
        },
      ],
    }),
  );
  const report = createCiWatcherReport(normalized);

  assert.equal(report.workflowSummary.state, "pending");
  assert.equal(report.mergeCandidate, false);
  assert.ok(report.recommendedNextActions.includes("blocked"));
  assert.ok(report.blockedReasons.some((reason) => reason.includes("GitHub metadata blocked")));
});

test("unknown workflow or job names fail safely as pending/blocked, not green", () => {
  const normalized = normalizeGithubSnapshotForAgentFactory(
    liveSnapshot({
      workflowRuns: [
        {
          id: 9002,
          name: null,
          workflowName: null,
          event: "pull_request",
          status: "completed",
          conclusion: "success",
          headSha: HEAD_SHA,
          runNumber: 13,
          runAttempt: 1,
          htmlUrl: null,
          createdAt: null,
          updatedAt: null,
        },
      ],
      workflowJobs: [],
    }),
  );
  const report = createCiWatcherReport(normalized);

  assert.equal(report.workflowSummary.state, "pending");
  assert.equal(report.workflowSummary.unknown, 1);
  assert.equal(report.mergeCandidate, false);
  assert.ok(report.blockedReasons.some((reason) => reason.includes("unknown workflow run")));
});

test("live watcher output feeds AF002 classification through dispatcher", async () => {
  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("watch_live", baseUrl);

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(outputDir, "ci-watcher-report.json"), "utf8"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(outputDir, "github-live-snapshot.json"), "utf8"));

    assert.equal(report.prNumber, 463);
    assert.equal(report.workflowSummary.state, "all_green");
    assert.equal(snapshot.liveGithub.readOnly, true);
    assert.match(readSummary(outputDir), /AF002 live CI watcher report generated/);
  });
});

test("live doctor output feeds AF003 report-only analysis through dispatcher", async () => {
  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("doctor_pr_body_live", baseUrl);

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(outputDir, "pr-contract-doctor-report.json"), "utf8"));

    assert.equal(report.validAfter, true);
    assert.equal(report.issueReferenceStatus.issueNumber, "463");
    assert.match(readSummary(outputDir), /AF003 live PR Contract Doctor report generated/);
  });
});

test("live repair output feeds AF004 report-only plan through dispatcher", async () => {
  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("repair_plan_live", baseUrl);

    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(fs.readFileSync(path.join(outputDir, "safe-repair-plan.json"), "utf8"));

    assert.equal(plan.humanApprovalRequired, true);
    assert.equal(plan.repairDomain, "human_review_required");
    assert.match(readSummary(outputDir), /AF004 live safe repair plan generated/);
  });
});

test("live merge output feeds AF005 report-only recommendation through dispatcher", async () => {
  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("merge_plan_live", baseUrl);

    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(fs.readFileSync(path.join(outputDir, "merge-plan.json"), "utf8"));

    assert.equal(plan.validationSummary.metadataOnly, true);
    assert.equal(plan.validationSummary.mutatesGitHub, false);
    assert.equal(plan.validationSummary.reportOnly, true);
    assert.equal(plan.mergeReadiness, "human_approval_required");
    assert.equal(plan.mergeCandidate, false);
    assert.match(readSummary(outputDir), /human approval remains required/);
  });
});

test("live artifacts contain no secret-looking keys or raw-content fields", async () => {
  const unsafeBody = `${VALID_PR_BODY}\nsecret: ghp_should_not_escape\nrawAnswer: learner answer must not escape\nproviderPayload: provider payload must not escape\n`;

  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("doctor_pr_body_live", baseUrl, unsafeBody);

    assert.equal(result.status, 0, result.stderr);
    assertNoUnsafeArtifactText(outputDir);
    assert.equal(
      fs.readFileSync(path.join(outputDir, "github-live-snapshot.json"), "utf8").includes("bodyText"),
      false,
    );
  }, unsafeBody);
});

test("live normalized outputs feed AF002 through AF005 in memory", () => {
  const normalized = normalizeGithubSnapshotForAgentFactory(liveSnapshot());
  const watcher = createCiWatcherReport(normalized);
  const doctor = createPrContractDoctorReport(VALID_PR_BODY, {
    issueNumber: "463",
    changedFiles: normalized.changedFiles,
  });
  const repair = createSafeRepairPlan(normalized, { doctorReport: doctor });
  const merge = createRebaseMergePlan(watcher, {
    prSnapshot: normalized,
    repairPlan: repair,
    reportOnly: true,
  });

  assert.equal(watcher.workflowSummary.state, "all_green");
  assert.equal(doctor.validAfter, true);
  assert.equal(repair.humanApprovalRequired, true);
  assert.equal(merge.validationSummary.af002ReportObserved, true);
  assert.equal(merge.validationSummary.af004RepairPlanObserved, true);
});

test("workflow docs and job summary state read-only/report-only mode", async () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
  const liveDoc = fs.readFileSync(LIVE_DOC_PATH, "utf8");

  await withMockGitHubServer(async (baseUrl) => {
    const { outputDir, result } = await runLiveMode("watch_live", baseUrl);
    const summary = readSummary(outputDir);

    assert.equal(result.status, 0, result.stderr);
    assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
    assert.match(liveDoc, /read-only\/report-only/);
    assert.match(summary, /AF007 live GitHub modes: read-only\/report-only/);
    assert.match(summary, /Live modes use GitHub metadata GET requests only/);
  });
});
