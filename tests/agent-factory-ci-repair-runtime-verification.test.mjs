import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createAgentFactoryCiRepairPlan } from "../lib/agent-factory/ci-repair-loop.ts";

const DOC_PATH = path.resolve("docs/agent-factory-ci-repair-runtime-verification.md");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");

function readNormalized(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
}

function escapedPattern(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function writeJson(dir, fileName, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(value, null, 2), "utf8");
}

test("AF014-V runtime verification doc records required artifact, classification, and safety evidence", () => {
  assert.equal(fs.existsSync(DOC_PATH), true);
  const doc = readNormalized(DOC_PATH);

  for (const requiredText of [
    ".agent-factory/ci-repair-plan.json",
    ".agent-factory/ci-repair-plan.md",
    ".agent-factory/agent-factory-ci-repair-summary.md",
    ".agent-factory/run-history.jsonl",
    ".agent-factory/run-history.md",
    "metadata-only",
    "pr_contract classification",
    "failureClass: pr_contract",
    "pr_contract_missing_required_section",
    "pr_contract_missing_risk_line",
    "pr_contract_missing_merge_recommendation",
    "pr_body_repair",
    "no raw CI logs",
    "no raw PR body",
    "no raw comments",
    "no raw patch text",
    "no raw diff text",
    "no raw prompt text",
    "no raw task-package prompt",
    "no learner answers",
    "no OCR payload",
    "no provider payload",
    "no credentials/secrets",
    "no secrets",
    "Codex executed: no",
    "workflow rerun by AF014: no",
    "branch/commit/push/PR/merge/rebase mutation: no",
    "AF015 Roadmap Autopilot",
  ]) {
    assert.match(doc, escapedPattern(requiredText));
  }
});

test("AF014-V synthetic PR Contract metadata produces bounded PR body repair metadata", () => {
  const dir = tempDir("af014-v-runtime");
  writeJson(dir, "ci-log-summary.json", {
    generatedAt: "2026-06-30T00:00:00.000Z",
    failures: [
      {
        workflowName: "PR Contract",
        jobName: "validate-pr-contract",
        stepName: "Required sections",
        conclusion: "failure",
        failureClass: "pr_contract",
        closingReferenceCount: 1,
        missingRequiredSections: ["Goal", "Risk classification", "Merge recommendation"],
      },
      {
        workflowName: "PR Contract",
        jobName: "validate-pr-contract",
        stepName: "Risk line",
        conclusion: "failure",
        failureClass: "pr_contract",
        closingReferenceCount: 1,
        missingRiskLine: true,
      },
      {
        workflowName: "PR Contract",
        jobName: "validate-pr-contract",
        stepName: "Merge recommendation",
        conclusion: "failure",
        failureClass: "pr_contract",
        closingReferenceCount: 1,
        missingMergeRecommendation: true,
      },
    ],
  });

  const plan = createAgentFactoryCiRepairPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
    prNumber: 495,
    branchName: "feat/af014-v-ci-repair-runtime-verification",
    baseBranch: "main",
    taskId: "AF014-V",
  });
  const reasonCodes = plan.failureClassifications.map((entry) => entry.reasonCode);

  assert.equal(plan.status, "planned");
  assert.equal(plan.repairBoundary.metadataOnlyPlan, true);
  assert.equal(plan.dataBoundary.metadataOnly, true);
  assert.equal(plan.failureClassifications.every((entry) => entry.failureClass === "pr_contract"), true);
  assert.ok(reasonCodes.includes("pr_contract_missing_required_section"));
  assert.ok(reasonCodes.includes("pr_contract_missing_risk_line"));
  assert.ok(reasonCodes.includes("pr_contract_missing_merge_recommendation"));
  assert.ok(plan.proposedRepairSteps.some((step) => step.repairClass === "pr_body_repair"));
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(JSON.stringify(plan).includes("raw PR body"), false);
});

test("AF014-V keeps generated Agent Factory artifacts untracked and wired into default node tests", () => {
  const trackedAgentFactoryArtifacts = spawnSync("git", ["ls-files", ".agent-factory"], {
    encoding: "utf8",
  });
  const runner = readNormalized(TEST_RUNNER_PATH);

  assert.equal(trackedAgentFactoryArtifacts.status, 0, trackedAgentFactoryArtifacts.stderr);
  assert.equal(trackedAgentFactoryArtifacts.stdout.trim(), "");
  assert.match(runner, /tests\/agent-factory-ci-repair-runtime-verification\.test\.mjs/);
});
