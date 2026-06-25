import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function runClassifier(changedFiles) {
  const result = spawnSync(process.execPath, ["scripts/automation/classify-risk.mjs"], {
    encoding: "utf8",
    env: { ...process.env, CHANGED_FILES: changedFiles, PR_SIGNALS: "" },
  });

  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("docs-only change is low risk", () => {
  assert.equal(runClassifier("docs/readme.md").risk, "low");
});

test("learner API change is at least medium risk", () => {
  assert.equal(runClassifier("app/api/learner/route.ts").risk, "medium");
});

test("Supabase migration is high risk and runtime-required", () => {
  const result = runClassifier("supabase/migrations/20260624_example.sql");
  assert.equal(result.risk, "high");
  assert.equal(result.runtimeEvidenceRequired, true);
});

test("workflow change is high risk but not live-runtime-required", () => {
  const result = runClassifier(".github/workflows/ci-fast.yml");
  assert.equal(result.risk, "high");
  assert.equal(result.runtimeEvidenceRequired, false);
});

test("mixed paths take the highest risk", () => {
  const result = runClassifier("docs/readme.md\nsupabase/migrations/20260624_example.sql");
  assert.equal(result.risk, "high");
});
