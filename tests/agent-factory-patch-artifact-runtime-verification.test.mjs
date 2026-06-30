import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const DOC_PATH = path.resolve("docs/agent-factory-patch-artifact-runtime-verification.md");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");

function readNormalized(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
}

test("AF013B-V runtime verification doc records required artifact and safety evidence", () => {
  assert.equal(fs.existsSync(DOC_PATH), true);
  const doc = readNormalized(DOC_PATH);

  for (const requiredText of [
    ".agent-factory/factory-patch-artifact-plan.json",
    ".agent-factory/factory-patch-artifact-plan.md",
    ".agent-factory/agent-factory-patch-artifact-summary.md",
    ".agent-factory/run-history.jsonl",
    ".agent-factory/run-history.md",
    "metadata-only",
    "no raw patch text",
    "no raw diff text",
    "no raw prompt text",
    "no raw task-package prompt",
    "no raw PR body",
    "no raw comments",
    "no learner answers",
    "no OCR payload",
    "no provider payload",
    "no credentials/secrets",
    "no secrets",
    "Codex executed: no",
    "patches applied: no",
    "branch/commit/push/PR/workflow/merge/rebase mutation: no",
    "AF010",
    "AF011",
    "AF012",
    "AF013A",
    "AF013B",
    "AF013C approval-gated branch/commit/PR adapter",
  ]) {
    assert.match(doc, new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("AF013B-V keeps generated Agent Factory artifacts untracked and wired into default node tests", () => {
  const trackedAgentFactoryArtifacts = spawnSync("git", ["ls-files", ".agent-factory"], {
    encoding: "utf8",
  });
  const runner = readNormalized(TEST_RUNNER_PATH);

  assert.equal(trackedAgentFactoryArtifacts.status, 0, trackedAgentFactoryArtifacts.stderr);
  assert.equal(trackedAgentFactoryArtifacts.stdout.trim(), "");
  assert.match(runner, /tests\/agent-factory-patch-artifact-runtime-verification\.test\.mjs/);
});
