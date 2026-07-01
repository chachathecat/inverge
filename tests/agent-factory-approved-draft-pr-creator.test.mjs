import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  AF018_APPROVAL_PHRASE,
  AF018_EFFORT,
  AF018_MODEL,
  assertAf018ArtifactSafe,
  assertAf018TextArtifactSafe,
  buildAf018DraftPrPlanMarkdown,
  buildAf018ValidationSummary,
  createAf018DraftPrPlan,
} from "../lib/agent-factory/approved-draft-pr-creator.ts";
import { prContractHeadings } from "../lib/agent-factory/pr-contract-doctor.ts";

const WORKFLOW_PATH = path.resolve(".github/workflows/agent-factory-codex-connected.yml");
const DOC_PATH = path.resolve("docs/agent-factory-github-codex-connected.md");
const PROMPT_PATH = path.resolve(".github/codex/prompts/agent-factory-approved-draft-pr.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-approved-draft-pr.mjs");
const PACKAGE_PATH = path.resolve("package.json");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function readNormalized(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
}

function safePackage(itemId = "S210", overrides = {}) {
  return {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: [itemId],
    packages: [
      {
        itemId,
        itemTitle: "Practice Calculation Unit OCR and Supported-Type Validator",
        repository: "chachathecat/inverge",
        branchName: "feat/s210-practice-calculation-unit-ocr-validator",
        worktreePathSuggestion: "..\\worktrees\\s210-practice-calculation-unit-ocr-validator",
        codexPrompt: "Implement metadata-safe validator work for the selected roadmap item.",
        prBodyTemplate: "Use the repository PR Contract.",
        validationCommands: [
          "npm run typecheck",
          "npm run lint",
          "npm test -- tests/agent-factory-approved-draft-pr-creator.test.mjs",
          "git diff --check",
        ],
        riskNotes: ["Roadmap risk: high."],
        ...overrides,
      },
    ],
  };
}

function planFor(overrides = {}) {
  return createAf018DraftPrPlan({
    packageInput: safePackage(),
    targetIssue: 507,
    targetRoadmapItem: "S210",
    actor: "chachathecat",
    changedFiles: [
      "lib/agent-factory/approved-draft-pr-creator.ts",
      "tests/agent-factory-approved-draft-pr-creator.test.mjs",
    ],
    dryRun: false,
    approvalPhrase: AF018_APPROVAL_PHRASE,
    now: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  });
}

function runCli(args) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      SCRIPT_PATH,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

test("AF018 docs, prompt, npm script, and workflow mode exist", () => {
  const workflow = readNormalized(WORKFLOW_PATH);
  const docs = readNormalized(DOC_PATH);
  const prompt = readNormalized(PROMPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:approved-draft-pr/);
  assert.match(workflow, /approved_draft_pr/);
  assert.match(workflow, /AF018_ALLOWED_ACTORS/);
  assert.match(workflow, new RegExp(AF018_APPROVAL_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workflow, /prompt-file: \.github\/codex\/prompts\/agent-factory-approved-draft-pr\.md/);
  assert.match(workflow, /sandbox: workspace-write/);
  assert.match(workflow, new RegExp(`model:\\s*${AF018_MODEL.replace(".", "\\.")}`));
  assert.match(workflow, new RegExp(`effort:\\s*${AF018_EFFORT}`));
  assert.match(docs, /dry-run first/i);
  assert.match(docs, /target issue/i);
  assert.match(docs, /target_roadmap_item/i);
  assert.match(prompt, /Do not create commits, push branches, open pull requests/);
});

test("approval phrase is required for non-dry-run", () => {
  const { plan } = planFor({ approvalPhrase: "approve" });

  assert.equal(plan.status, "rejected");
  assert.equal(plan.approvedForWrite, false);
  assert.equal(plan.canExecute, false);
  assert.ok(plan.blockedReasonCodes.includes("missing_approval_phrase"));
  assert.equal(plan.actions.willRunCodex, false);
  assert.equal(plan.actions.willOpenDraftPr, false);
});

test("actor allowlist is required", () => {
  const { plan } = planFor({ actor: "not-allowed" });

  assert.equal(plan.status, "rejected");
  assert.equal(plan.source.actorAllowed, false);
  assert.ok(plan.blockedReasonCodes.includes("actor_not_allowed"));
});

test("dry-run writes plan only and does not enable Codex or GitHub writes", () => {
  const { plan, generatedContract } = createAf018DraftPrPlan({
    packageInput: safePackage(),
    targetIssue: 507,
    targetRoadmapItem: "S210",
    actor: "chachathecat",
    dryRun: true,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.dryRun, true);
  assert.equal(plan.canExecute, false);
  assert.equal(plan.actions.willGenerateTaskPackage, true);
  assert.equal(plan.actions.willRunCodex, false);
  assert.equal(plan.actions.willCreateBranch, false);
  assert.equal(plan.actions.willCreateCommit, false);
  assert.equal(plan.actions.willPush, false);
  assert.equal(plan.actions.willOpenDraftPr, false);
  assert.equal(plan.permissions.contents, "read");
  assert.equal(plan.permissions.pullRequests, "read");
  assert.match(generatedContract, /Closes #507/);
});

test("approved non-dry-run plans only draft PR creation", () => {
  const { plan } = planFor();

  assert.equal(plan.status, "planned");
  assert.equal(plan.canExecute, true);
  assert.equal(plan.pullRequest.draftOnly, true);
  assert.equal(plan.pullRequest.autoMerge, false);
  assert.equal(plan.actions.willRunCodex, true);
  assert.equal(plan.actions.willCreateBranch, true);
  assert.equal(plan.actions.willCreateCommit, true);
  assert.equal(plan.actions.willPush, true);
  assert.equal(plan.actions.willOpenDraftPr, true);
  assert.equal(plan.actions.willMarkReadyForReview, false);
  assert.equal(plan.actions.willRerunWorkflow, false);
  assert.equal(plan.actions.willMergeOrRebase, false);
  assert.equal(plan.actions.willAutoMerge, false);
  assert.equal(plan.permissions.contents, "write");
  assert.equal(plan.permissions.pullRequests, "write");
  assert.equal(plan.permissions.workflows, "none");
  assert.equal(plan.permissions.merge, "none");
});

test("forbidden paths and outside allowlist paths fail closed", () => {
  const forbidden = planFor({
    changedFiles: [".github/workflows/agent-factory-codex-connected.yml"],
  }).plan;
  const outside = planFor({
    changedFiles: ["app/page.tsx"],
  }).plan;

  assert.equal(forbidden.status, "rejected");
  assert.ok(forbidden.blockedReasonCodes.includes("forbidden_path"));
  assert.equal(forbidden.changedFiles.violations[0].code, "forbidden_path");
  assert.equal(outside.status, "rejected");
  assert.ok(outside.blockedReasonCodes.includes("outside_path_allowlist"));
});

test("max changed file count fails closed", () => {
  const files = Array.from({ length: 13 }, (_, index) => `tests/agent-factory-af018-${index}.test.mjs`);
  const { plan } = planFor({ changedFiles: files, maxChangedFiles: 12 });

  assert.equal(plan.status, "rejected");
  assert.ok(plan.blockedReasonCodes.includes("changed_file_count_exceeded"));
});

test("generated PR body has required sections and exactly one closing reference", () => {
  const { plan, generatedContract } = planFor();

  for (const heading of prContractHeadings()) {
    assert.match(generatedContract, new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
  const closingReferences = generatedContract.match(/\b(?:Closes|Fixes)\s+#\d+\b/g) ?? [];
  assert.deepEqual(closingReferences, ["Closes #507"]);
  assert.equal(plan.pullRequest.closingReferenceCount, 1);
  assert.equal(plan.pullRequest.closingReferenceIssue, 507);
  assert.equal(plan.pullRequest.requiredHeadingsPresent, true);
  assert.match(generatedContract, /Roadmap item: S210/);
  assert.doesNotMatch(generatedContract, /Closes #210/);
});

test("target issue, roadmap item, and generated branch metadata are not confused", () => {
  const { plan, generatedContract } = planFor({
    branchName: "codex/af018-S210-issue-507-12345",
  });

  assert.equal(plan.target.issueNumber, 507);
  assert.equal(plan.target.roadmapItemId, "S210");
  assert.equal(plan.target.taskPackageItemId, "S210");
  assert.equal(plan.target.branchName, "codex/af018-s210-issue-507-12345");
  assert.match(generatedContract, /Closes #507/);
  assert.match(generatedContract, /Roadmap item: S210/);

  const mismatch = createAf018DraftPrPlan({
    packageInput: safePackage("S210"),
    targetIssue: 507,
    targetRoadmapItem: "S211",
    actor: "chachathecat",
    dryRun: true,
  }).plan;
  assert.equal(mismatch.status, "rejected");
  assert.ok(mismatch.blockedReasonCodes.includes("roadmap_target_mismatch"));
});

test("workflow creates draft PR only and does not grant merge, rebase, rerun, or workflow-write permissions", () => {
  const workflow = readNormalized(WORKFLOW_PATH);

  assert.match(workflow, /permissions:\n\s+contents: write\n\s+pull-requests: write\n\s+issues: read\n\s+actions: read\n\s+checks: read/);
  assert.match(workflow, /gh pr create --draft/);
  assert.match(workflow, /--body-file \.agent-factory\/af018-pr-body\.md/);
  assert.doesNotMatch(workflow, /actions:\s*write|workflows:\s*write/i);
  assert.doesNotMatch(workflow, /\bgh\s+pr\s+merge\b|\bgit\s+merge\b|\bgit\s+rebase\b/i);
  assert.doesNotMatch(workflow, /enable_auto_merge|auto-merge\s+--enable|mark_pull_request_ready|ready_for_review/i);
  assert.doesNotMatch(workflow, /\/rerun\b|rerun-failed-jobs|workflow-runs\/[^/]+\/rerun/i);
});

test("artifacts reject raw learner, OCR, problem, provider, private, billing, auth, payment, and secret content", () => {
  const { plan } = planFor();
  const markdown = buildAf018DraftPrPlanMarkdown(plan);
  const summary = buildAf018ValidationSummary({ plan });

  assert.doesNotThrow(() => assertAf018ArtifactSafe(plan));
  assert.doesNotThrow(() => assertAf018TextArtifactSafe(markdown, "markdown"));
  assert.doesNotThrow(() => assertAf018TextArtifactSafe(summary, "summary"));

  for (const key of [
    "rawLearnerAnswer",
    "ocrText",
    "problemText",
    "answerBody",
    "providerPayload",
    "privateUserContent",
    "billingData",
    "authData",
    "paymentData",
  ]) {
    const unsafe = JSON.parse(JSON.stringify(plan));
    unsafe[key] = "unsafe value must not be accepted";
    assert.throws(() => assertAf018ArtifactSafe(unsafe), /forbidden key/i);
  }

  for (const line of [
    "rawLearnerAnswer: unsafe",
    "ocrText: unsafe",
    "problemText: unsafe",
    "providerPayload: unsafe",
    "privateUserContent: unsafe",
    "billingData: unsafe",
    "authData: unsafe",
    "paymentData: unsafe",
    "token: ghp_should_not_escape12345",
  ]) {
    assert.throws(
      () => assertAf018TextArtifactSafe(line, "unsafe AF018 text"),
      /raw-content|credential|secret-like/i,
      `expected unsafe text rejection for ${line}`,
    );
  }
});

test("unsafe task package input is rejected without leaking unsafe payloads", () => {
  const unsafePackage = safePackage("S210", {
    rawLearnerContent: "learner answer must not escape",
    providerPayload: { text: "provider body must not escape" },
    codexPrompt: "token: ghp_should_not_escape12345",
  });
  const { plan } = planFor({ packageInput: unsafePackage });
  const serialized = JSON.stringify(plan);
  const markdown = buildAf018DraftPrPlanMarkdown(plan);

  assert.equal(plan.status, "rejected");
  assert.equal(plan.dataBoundary.promptInputSanitized, false);
  assert.ok(plan.blockedReasonCodes.includes("data_boundary_violation"));
  for (const forbidden of [
    "learner answer must not escape",
    "provider body must not escape",
    "ghp_should_not_escape12345",
    "rawLearnerContent",
    "providerPayload",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `plan leaked ${forbidden}`);
    assert.equal(markdown.includes(forbidden), false, `markdown leaked ${forbidden}`);
  }
});

test("CLI writes plan, PR body, and validation summary artifacts", () => {
  const dir = tempDir("af018-cli");
  const inputPath = path.join(dir, "packages.json");
  const changedPath = path.join(dir, "changed-files.txt");
  const jsonPath = path.join(dir, "plan.json");
  const markdownPath = path.join(dir, "plan.md");
  const bodyPath = path.join(dir, "body.md");
  const summaryPath = path.join(dir, "summary.md");
  fs.writeFileSync(inputPath, JSON.stringify(safePackage(), null, 2), "utf8");
  fs.writeFileSync(
    changedPath,
    [
      "lib/agent-factory/approved-draft-pr-creator.ts",
      "tests/agent-factory-approved-draft-pr-creator.test.mjs",
    ].join("\n"),
    "utf8",
  );

  const result = runCli([
    "--input",
    inputPath,
    "--changed-files",
    changedPath,
    "--json",
    jsonPath,
    "--markdown",
    markdownPath,
    "--pr-body",
    bodyPath,
    "--summary",
    summaryPath,
    "--target-issue",
    "507",
    "--target-roadmap-item",
    "S210",
    "--actor",
    "chachathecat",
    "--dry-run",
    "false",
    "--approval-phrase",
    AF018_APPROVAL_PHRASE,
    "--stdout",
    "none",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).adapter, "af018-approved-draft-pr-creator");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF018 Approved Draft PR Creator/);
  assert.match(fs.readFileSync(bodyPath, "utf8"), /Closes #507/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /AF018 Validation Summary/);
});

test("AF018 focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-approved-draft-pr-creator\.test\.mjs/);
});
