import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { after, test } from "node:test";

import {
  RUNTIME_EVIDENCE_ASSERTION_IDS,
  RUNTIME_EVIDENCE_PRODUCER_VERSION,
  RUNTIME_EVIDENCE_SCHEMA_VERSION,
} from "../scripts/automation/runtime-gate.mjs";
import {
  ASSERTION_IDS,
  PREREQUISITE_MIGRATIONS,
  PRODUCER_VERSION,
  SCHEMA_VERSION,
  resolveTargetMigration,
  shouldRunFakeGrader,
} from "../scripts/automation/produce-runtime-evidence.mjs";

const WORKSPACE_ROOT = process.cwd();
const SCRIPT = path.resolve(WORKSPACE_ROOT, "scripts/automation/runtime-gate.mjs");
const WORKFLOW = path.resolve(WORKSPACE_ROOT, ".github/workflows/runtime-gate.yml");
const MIGRATION_PATH = "supabase/migrations/20260721060237_s233a_answer_review_persistence.sql";
const UNSUPPORTED_MIGRATION_PATH = "supabase/migrations/20260721060238_unrelated.sql";
const FIXTURE_REPO = fs.mkdtempSync(path.join(WORKSPACE_ROOT, "runtime-gate-git-test-"));
fs.mkdirSync(path.join(FIXTURE_REPO, "supabase/migrations"), { recursive: true });
fs.writeFileSync(path.join(FIXTURE_REPO, MIGRATION_PATH), "select 's233a-runtime-fixture';\n", "utf8");
fs.writeFileSync(path.join(FIXTURE_REPO, UNSUPPORTED_MIGRATION_PATH), "select 'unsupported-runtime-fixture';\n", "utf8");
execFileSync("git", ["init", "--quiet"], { cwd: FIXTURE_REPO });
execFileSync("git", ["config", "user.name", "Runtime Evidence Test"], { cwd: FIXTURE_REPO });
execFileSync("git", ["config", "user.email", "runtime-evidence@example.invalid"], { cwd: FIXTURE_REPO });
execFileSync("git", ["add", "."], { cwd: FIXTURE_REPO });
execFileSync("git", ["commit", "--quiet", "-m", "runtime evidence fixtures"], { cwd: FIXTURE_REPO });
const HEAD_SHA = execFileSync("git", ["rev-parse", "HEAD"], { cwd: FIXTURE_REPO, encoding: "utf8" }).trim();
const MIGRATION_SHA256 = crypto
  .createHash("sha256")
  .update(execFileSync("git", ["show", `${HEAD_SHA}:${MIGRATION_PATH}`], { cwd: FIXTURE_REPO }))
  .digest("hex");
const UNSUPPORTED_MIGRATION_SHA256 = crypto
  .createHash("sha256")
  .update(execFileSync("git", ["show", `${HEAD_SHA}:${UNSUPPORTED_MIGRATION_PATH}`], { cwd: FIXTURE_REPO }))
  .digest("hex");
const RUN_ID = "900100200";
const RUN_ATTEMPT = 1;

after(() => fs.rmSync(FIXTURE_REPO, { force: true, recursive: true }));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeJson(directory, name, value) {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
  return filePath;
}

function validEvidence(riskBytes) {
  return {
    schemaVersion: RUNTIME_EVIDENCE_SCHEMA_VERSION,
    producerVersion: RUNTIME_EVIDENCE_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: new Date().toISOString(),
    pullRequestHeadSha: HEAD_SHA,
    githubRunId: RUN_ID,
    githubRunAttempt: RUN_ATTEMPT,
    riskFileSha256: sha256(riskBytes),
    migrations: [{ path: MIGRATION_PATH, sha256: MIGRATION_SHA256 }],
    isolatedEnvironment: {
      kind: "disposable_local_postgres",
      engine: "postgresql_15",
      networkExposure: "none",
      syntheticUserCount: 2,
    },
    assertions: RUNTIME_EVIDENCE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
    cleanup: { status: "complete" },
    dataBoundary: {
      metadataOnly: true,
      rawLearnerContentPersisted: false,
      sourceTextPersisted: false,
      credentialMaterialPersisted: false,
      learnerIdentifiersPersisted: false,
      rowBodiesPersisted: false,
      providerBodiesPersisted: false,
    },
  };
}

function run(risk, mutateEvidence, options = {}) {
  const directory = fs.mkdtempSync(path.join(WORKSPACE_ROOT, "runtime-gate-test-"));
  try {
    const riskPath = writeJson(directory, "risk.json", risk);
    const riskBytes = fs.readFileSync(riskPath);
    const env = {
      ...process.env,
      PR_HEAD_SHA: HEAD_SHA,
      GITHUB_RUN_ID: RUN_ID,
      GITHUB_RUN_ATTEMPT: String(RUN_ATTEMPT),
    };

    if (options.evidencePath) {
      env.RUNTIME_EVIDENCE_PATH = options.evidencePath;
    } else if (mutateEvidence) {
      const evidence = validEvidence(riskBytes);
      mutateEvidence(evidence);
      env.RUNTIME_EVIDENCE_PATH = writeJson(directory, "evidence.json", evidence);
    } else {
      delete env.RUNTIME_EVIDENCE_PATH;
    }

    if (options.env) Object.assign(env, options.env);
    return spawnSync(process.execPath, [SCRIPT, "--risk-file", riskPath], {
      cwd: FIXTURE_REPO,
      encoding: "utf8",
      env,
    });
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
}

function requiredRisk() {
  return {
    version: 1,
    risk: "high",
    reasons: [],
    runtimeEvidenceRequired: true,
    runtimeReasons: [{ path: MIGRATION_PATH, pattern: "supabase/migrations/**" }],
    changedFiles: [MIGRATION_PATH],
    changedFilesTruncated: false,
  };
}

test("runtime-not-required returns explicit not_required without evidence or database setup", () => {
  const result = run({ runtimeEvidenceRequired: false, changedFiles: ["docs/readme.md"] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "not_required");
});

test("runtime-required without an evidence path or file fails closed", () => {
  const missingPath = run(requiredRisk());
  assert.notEqual(missingPath.status, 0);
  assert.match(missingPath.stderr, /RUNTIME_EVIDENCE_PATH is not set/);

  const missingFile = run(requiredRisk(), null, { evidencePath: path.join(WORKSPACE_ROOT, "does-not-exist-runtime-evidence.json") });
  assert.notEqual(missingFile.status, 0);
  assert.match(missingFile.stderr, /file is missing/);
});

test("runtime-sensitive paths cannot be bypassed by a false risk boolean", () => {
  const risk = requiredRisk();
  risk.runtimeEvidenceRequired = false;
  const result = run(risk);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RUNTIME_EVIDENCE_PATH is not set/);
});

test("exact, metadata-only, head-bound runtime evidence passes", () => {
  const result = run(requiredRisk(), () => {});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "verified");
});

test("runtime evidence rejects weak status, source-only, invalid time, and stale time", async (t) => {
  const cases = [
    ["non-verified status", (evidence) => { evidence.status = "pending"; }, /status must be/],
    ["source-only", (evidence) => { evidence.sourceLevelOnly = true; }, /source-level evidence/],
    ["invalid time", (evidence) => { evidence.verifiedAt = "not-a-date"; }, /verifiedAt is invalid/],
    ["stale time", (evidence) => { evidence.verifiedAt = "2020-01-01T00:00:00.000Z"; }, /stale or in the future/],
  ];
  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const result = run(requiredRisk(), mutate);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, pattern);
    });
  }
});

test("runtime evidence is bound to PR head, run, attempt, risk digest, and exact migration blob", async (t) => {
  const cases = [
    ["head", (evidence) => { evidence.pullRequestHeadSha = "f".repeat(40); }, /head SHA does not match/],
    ["run", (evidence) => { evidence.githubRunId = "900100201"; }, /run ID does not match/],
    ["attempt", (evidence) => { evidence.githubRunAttempt = 2; }, /run attempt does not match/],
    ["risk digest", (evidence) => { evidence.riskFileSha256 = "b".repeat(64); }, /risk-file digest does not match/],
    ["migration digest", (evidence) => { evidence.migrations[0].sha256 = "c".repeat(64); }, /migration path or digest/],
    ["migration missing", (evidence) => { evidence.migrations = []; }, /migration set does not match/],
  ];
  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const result = run(requiredRisk(), mutate);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, pattern);
    });
  }
});

test("validator rejects evidence for a migration without a closed producer adapter", () => {
  const risk = requiredRisk();
  risk.runtimeReasons = [{ path: UNSUPPORTED_MIGRATION_PATH, pattern: "supabase/migrations/**" }];
  risk.changedFiles = [UNSUPPORTED_MIGRATION_PATH];
  const result = run(risk, (evidence) => {
    evidence.migrations = [{ path: UNSUPPORTED_MIGRATION_PATH, sha256: UNSUPPORTED_MIGRATION_SHA256 }];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no closed runtime-evidence adapter supports this runtime-sensitive change set/);
});

test("validator rejects a supported migration mixed with an uncovered runtime-sensitive path", () => {
  const risk = requiredRisk();
  risk.runtimeReasons.push({ path: "app/api/auth/runtime-fixture.ts", pattern: "app/api/auth/**" });
  risk.changedFiles.push("app/api/auth/runtime-fixture.ts");
  const result = run(risk, () => {});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no closed runtime-evidence adapter supports this runtime-sensitive change set/);
});

test("runtime evidence rejects missing assertions, incomplete cleanup, unsafe flags, and unknown raw fields", async (t) => {
  const cases = [
    ["assertion", (evidence) => { evidence.assertions.pop(); }, /required assertion set/],
    ["failed assertion", (evidence) => { evidence.assertions[0].passed = false; }, /failed assertion/],
    ["cleanup", (evidence) => { evidence.cleanup.status = "pending"; }, /cleanup is incomplete/],
    ["data boundary", (evidence) => { evidence.dataBoundary.rowBodiesPersisted = true; }, /data boundary is invalid/],
    ["unknown raw field", (evidence) => { evidence.rawLearnerAnswer = "forbidden"; }, /missing or unknown keys/],
    ["unknown nested field", (evidence) => { evidence.migrations[0].credential = "forbidden"; }, /missing or unknown keys/],
  ];
  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const result = run(requiredRisk(), mutate);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, pattern);
    });
  }
});

test("runtime evidence contract and producer versions stay locked together", () => {
  assert.equal(SCHEMA_VERSION, RUNTIME_EVIDENCE_SCHEMA_VERSION);
  assert.equal(PRODUCER_VERSION, RUNTIME_EVIDENCE_PRODUCER_VERSION);
  assert.deepEqual(ASSERTION_IDS, RUNTIME_EVIDENCE_ASSERTION_IDS);
  for (const migrationPath of PREREQUISITE_MIGRATIONS) {
    assert.equal(fs.existsSync(path.join(WORKSPACE_ROOT, migrationPath)), true, migrationPath);
  }
});

test("fake grader runs only for a newly owned or atomically reclaimed request", () => {
  assert.equal(shouldRunFakeGrader("claimed"), true);
  assert.equal(shouldRunFakeGrader("retry_claimed"), true);
  assert.equal(shouldRunFakeGrader("in_progress"), false);
  assert.equal(shouldRunFakeGrader("replayed"), false);
});

test("S233A adapter binds the exact pull-request migration blob and rejects unsupported migration sets", () => {
  const directory = fs.mkdtempSync(path.join(WORKSPACE_ROOT, "runtime-producer-git-test-"));
  execFileSync("git", ["init", "--quiet"], { cwd: directory });
  execFileSync("git", ["config", "user.name", "Runtime Evidence Test"], { cwd: directory });
  execFileSync("git", ["config", "user.email", "runtime-evidence@example.invalid"], { cwd: directory });
  const migrationPath = "supabase/migrations/20260721060237_s233a_answer_review_persistence.sql";
  fs.mkdirSync(path.join(directory, "supabase/migrations"), { recursive: true });
  const sql = [
    "create function claim_s233a_answer_review_v1() returns void language sql as 'select';",
    "create function transition_s233a_answer_review_v1() returns void language sql as 'select';",
    "-- s233a review queue rpc insert namespace",
    "-- s233a today seed rpc insert namespace",
  ].join("\n");
  fs.writeFileSync(path.join(directory, migrationPath), sql, "utf8");
  execFileSync("git", ["add", migrationPath], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: directory });
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  const originalCwd = process.cwd();
  try {
    process.chdir(directory);
    const target = resolveTargetMigration(
      { changedFiles: [migrationPath], changedFilesTruncated: false },
      headSha,
    );
    assert.equal(target.path, migrationPath);
    assert.equal(target.sha256, sha256(Buffer.from(sql)));
    assert.throws(
      () => resolveTargetMigration(
        { changedFiles: ["supabase/migrations/20260721060238_unrelated.sql"], changedFilesTruncated: false },
        headSha,
      ),
      /no closed runtime-evidence adapter/,
    );
    assert.throws(
      () => resolveTargetMigration(
        {
          changedFiles: [migrationPath, "lib/billing/runtime-fixture.ts"],
          changedFilesTruncated: false,
        },
        headSha,
      ),
      /no closed runtime-evidence adapter supports this runtime-sensitive change set/,
    );
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test("workflow statically enforces same-job generation, cleanup, validation, and metadata-only upload", () => {
  const workflow = fs.readFileSync(WORKFLOW, "utf8");
  assert.match(workflow, /id: risk/);
  assert.match(workflow, /PR_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /RUNTIME_EVIDENCE_PATH: \$\{\{ github\.workspace \}\}\/\.agent-factory\/runtime-evidence\.json/);
  assert.match(workflow, /if: steps\.risk\.outputs\.runtime_evidence_required == 'true'\s+run: node scripts\/automation\/produce-runtime-evidence\.mjs/);
  assert.match(workflow, /if: always\(\) && steps\.risk\.outputs\.runtime_evidence_required == 'true'\s+run: node scripts\/automation\/produce-runtime-evidence\.mjs --cleanup --require-complete/);
  assert.match(workflow, /if: always\(\)\s+run: node scripts\/automation\/runtime-gate\.mjs/);
  assert.match(workflow, /id: runtime_gate\s+if: always\(\)/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /if: steps\.risk\.outputs\.runtime_evidence_required == 'true' && steps\.runtime_gate\.outcome == 'success'\s+uses: actions\/upload-artifact@v4/);
  assert.match(workflow, /path: \$\{\{ env\.RUNTIME_EVIDENCE_PATH \}\}/);
  assert.doesNotMatch(workflow, /download-artifact|services:\s*\n/);
  assert.doesNotMatch(workflow, /if: always\(\)[^\n]*\n\s+uses: actions\/upload-artifact@v4/);
  const producer = fs.readFileSync(path.join(WORKSPACE_ROOT, "scripts/automation/produce-runtime-evidence.mjs"), "utf8");
  assert.match(producer, /"--network",\s*"none"/);
});

test("producer forces PostgreSQL readiness and statements through loopback TCP", () => {
  const producer = fs.readFileSync(path.join(WORKSPACE_ROOT, "scripts/automation/produce-runtime-evidence.mjs"), "utf8");
  const readinessProbe = producer.match(/const ready = docker\(\[[\s\S]*?\]\);/)?.[0] ?? "";
  const psqlHelper = producer.match(/function psql\([\s\S]*?\n}/)?.[0] ?? "";

  assert.match(
    readinessProbe,
    /"pg_isready",\s*"--host",\s*"127\.0\.0\.1",\s*"--username",\s*"postgres",\s*"--dbname",\s*"postgres"/,
  );
  assert.match(psqlHelper, /"psql",\s*"--host",\s*"127\.0\.0\.1"/);
  assert.equal((producer.match(/"pg_isready"/g) ?? []).length, 1);
  assert.equal((producer.match(/"psql"/g) ?? []).length, 1);
});
