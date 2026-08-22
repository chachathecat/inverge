import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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

test("[WCV-C3 PRE-P] native Runtime Gate dispatches the exact PostgreSQL 15.8 oracle without workflow widening", async () => {
  const [workflow, risk, gate, producer, oracle, manifest] = await Promise.all([
    read(".github/workflows/runtime-gate.yml"),
    read("scripts/automation/runtime-risk-contract.mjs"),
    read("scripts/automation/runtime-gate.mjs"),
    read("scripts/automation/produce-runtime-evidence.mjs"),
    read("scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs"),
    read("config/dabangil-wcv-c3-pre-p-postgresql-security-state-oracle-v1.json"),
  ]);
  const workflowBlob = execFileSync(
    "git",
    ["show", "HEAD:.github/workflows/runtime-gate.yml"],
    { cwd: root, encoding: null },
  );
  assert.equal(
    crypto.createHash("sha256").update(workflowBlob).digest("hex"),
    "529a28f0c644867acd0177e939bb768c708c7e8eb402fd0ae8e46646b0f6e90e",
  );
  for (const filePath of [
    "config/dabangil-wcv-c3-pre-p-postgresql-security-state-oracle-v1.json",
    "docs/qa/wcv-c3-pre-p-postgresql-security-state-oracle-validation.md",
    "scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs",
    "tests/wcv-c3-pre-p-postgresql-security-state-oracle.test.mjs",
  ]) assert.match(risk, new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.match(producer, /isOracleRiskCandidate\(riskResult\)/u);
  assert.match(producer, /producePostgresSecurityOracleEvidence/u);
  assert.match(gate, /validatePostgresSecurityOracleEvidence/u);
  assert.match(oracle, /eb3747f5d0a92195ca486d2f15d9a4ee5e9461b0332fe87fbc59069490a5c659/u);
  assert.match(oracle, /`postgres@sha256:\$\{ORACLE_IMAGE_DIGEST\}`/u);
  assert.match(oracle, /"--platform",\s*ORACLE_PLATFORM/u);
  assert.match(oracle, /"--network",\s*"none"/u);
  assert.match(oracle, /"--tmpfs",\s*`\$\{ORACLE_TMPFS_DESTINATION\}/u);
  assert.match(oracle, /detail\?\.HostConfig\?\.Tmpfs/u);
  assert.match(oracle, /bindOrVolumeMounts\.length !== 0/u);
  assert.match(oracle, /POSTGRES_HOST_AUTH_METHOD=trust/u);
  assert.match(oracle, /"SHOW server_version_num;\\n"/u);
  assert.match(oracle, /ORACLE_MISMATCH_CLASSIFICATION/u);
  assert.match(oracle, /detail\?\.Config\?\.Image !== ORACLE_IMAGE\) mismatch\(\)/u);
  assert.ok(
    oracle.indexOf('"SHOW server_version_num;\\n"') <
      oracle.indexOf('oraclePsql(context.containerName, "postgres", BOOTSTRAP_SQL)'),
  );
  assert.match(manifest, /"canonicalStage": null/u);
  assert.match(manifest, /"c3rSuccessorRuntimeStarted": false/u);
  assert.doesNotMatch(workflow, /postgresql-security-state-oracle|SUPABASE_ACCESS_TOKEN/u);
});
