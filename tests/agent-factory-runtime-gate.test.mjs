import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const SCRIPT = path.resolve("scripts/automation/runtime-gate.mjs");

function writeJson(directory, name, value) {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
  return filePath;
}

function run(risk, evidence) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-runtime-gate-"));
  const riskPath = writeJson(directory, "risk.json", risk);
  const env = { ...process.env };

  if (evidence) env.RUNTIME_EVIDENCE_PATH = writeJson(directory, "evidence.json", evidence);
  else delete env.RUNTIME_EVIDENCE_PATH;

  return spawnSync(process.execPath, [SCRIPT, "--risk-file", riskPath], {
    encoding: "utf8",
    env,
  });
}

test("runtime-not-required returns explicit not_required", () => {
  const result = run({ runtimeEvidenceRequired: false, changedFiles: ["docs/readme.md"] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "not_required");
});

test("runtime-required without evidence fails", () => {
  const result = run({ runtimeEvidenceRequired: true, changedFiles: ["supabase/migrations/a.sql"] });
  assert.notEqual(result.status, 0);
});

test("verified runtime evidence passes", () => {
  const result = run(
    { runtimeEvidenceRequired: true, changedFiles: ["supabase/migrations/a.sql"] },
    { status: "verified", sourceLevelOnly: false, verifiedAt: "2026-06-24T08:00:00.000Z" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "verified");
});

test("source-only evidence does not pass", () => {
  const result = run(
    { runtimeEvidenceRequired: true, changedFiles: ["supabase/migrations/a.sql"] },
    { status: "verified", sourceLevelOnly: true, verifiedAt: "2026-06-24T08:00:00.000Z" },
  );
  assert.notEqual(result.status, 0);
});
