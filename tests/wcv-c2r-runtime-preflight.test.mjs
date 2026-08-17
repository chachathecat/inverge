import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("[C2R-C-L-R07] a Law-registry-only PR triggers exact fork-safe C2R-C-L runtime evidence", async () => {
  const [workflow, risk, gate, producer] = await Promise.all([
    read(".github/workflows/c2r-c-l-law-trusted-repair-runtime.yml"),
    read("scripts/automation/runtime-risk-contract.mjs"),
    read("scripts/automation/runtime-gate.mjs"),
    read("scripts/automation/produce-runtime-evidence.mjs"),
  ]);
  assert.match(workflow, /pull_request:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /lib\/review-os\/law-source-version-registry\.ts/);
  assert.match(workflow, /config\/dabangil-c2r-c-l-exact-law-applicability-v1\.json/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /C2R_RUNTIME_SUBJECT: appraisal_law/);
  assert.match(workflow, /--cleanup\s+--require-complete/);
  assert.doesNotMatch(workflow, /pull_request_target|SUPABASE_ACCESS_TOKEN|persist-credentials: true/);
  assert.match(risk, /"supabase\/migrations\/\*\*"/);
  assert.match(gate, /c2r-c-l\.postgres\.law-trusted-repair\.v1/);
  assert.match(producer, /adapter = "c2r-c-l"/);
  assert.match(producer, /theoryPrerequisite/);
});
