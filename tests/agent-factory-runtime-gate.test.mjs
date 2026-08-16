import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { after, test } from "node:test";

import {
  C2R_C_P_RUNTIME_EVIDENCE_ASSERTION_IDS,
  C2R_C_P_RUNTIME_EVIDENCE_PRODUCER_VERSION,
  RUNTIME_EVIDENCE_ASSERTION_IDS,
  RUNTIME_EVIDENCE_PRODUCER_VERSION,
  RUNTIME_EVIDENCE_SCHEMA_VERSION,
  S236P_RUNTIME_EVIDENCE_ASSERTION_IDS,
  S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION,
} from "../scripts/automation/runtime-gate.mjs";
import {
  ASSERTION_IDS,
  C2R_C_P_ASSERTION_IDS,
  C2R_C_P_MIGRATION_PATH,
  C2R_C_P_PRODUCER_VERSION,
  PREREQUISITE_MIGRATIONS,
  PRODUCER_VERSION,
  SCHEMA_VERSION,
  S236P_ASSERTION_IDS,
  S236P_MIGRATION_PATHS,
  S236P_PRODUCER_VERSION,
  resolveTargetMigration,
  s236pMigrationExecutionSteps,
  shouldRunFakeGrader,
} from "../scripts/automation/produce-runtime-evidence.mjs";
import {
  readTextFileSync,
} from "./platform-text.mjs";

const WORKSPACE_ROOT = process.cwd();
const SCRIPT = path.resolve(WORKSPACE_ROOT, "scripts/automation/runtime-gate.mjs");
const WORKFLOW = path.resolve(WORKSPACE_ROOT, ".github/workflows/runtime-gate.yml");
const MIGRATION_PATH = "supabase/migrations/20260721060237_s233a_answer_review_persistence.sql";
const UNSUPPORTED_MIGRATION_PATH = "supabase/migrations/20260721060238_unrelated.sql";
const FIXTURE_REPO = fs.mkdtempSync(path.join(WORKSPACE_ROOT, "runtime-gate-git-test-"));
fs.mkdirSync(path.join(FIXTURE_REPO, "supabase/migrations"), { recursive: true });
const S233A_FIXTURE_SQL = [
  "select 'claim_s233a_answer_review_v1';",
  "select 'transition_s233a_answer_review_v1';",
  "-- s233a review queue rpc insert namespace",
  "-- s233a today seed rpc insert namespace",
  "",
].join("\n");
const S236P_FIXTURE_SQLS = [
  [
    "select 's236p-owner-private-v1';",
    "select 'public.s236p_owner_private_objects';",
    "select 'public.s236p_owner_private_events';",
    "select 'public.s236p_authorize_signed_url_v1';",
    "select 'public.s236p_expired_object_paths_v1';",
    "select 'contains_real_content';",
    "",
  ].join("\n"),
  [
    "select 's236p_owner_private_lifecycle_hardening';",
    "select 'parent_object_ref';",
    "select 'revision_number';",
    "select 'signed URL and signed-upload issuance disabled';",
    "select 'drop table if exists public.s236p_owner_private_events';",
    "select $$storage.allow_only_operation('storage.object.upload')$$;",
    "",
  ].join("\n"),
  [
    "select 's236p_owner_private_authenticated_download_info';",
    "select 'object.get_authenticated_info';",
    "select 'storage.object.get_authenticated';",
    "select 's236p owner private select';",
    "",
  ].join("\n"),
  [
    "select 's236p_owner_private_expiry_read_gate';",
    "select $$alter policy \"s236p owner private select\"$$;",
    "select 'metadata.content_expires_at > statement_timestamp()';",
    "select 'metadata.temporary_expires_at > statement_timestamp()';",
    "select 'storage.object.delete_many';",
    "select 'Reviewed forward-disable procedure';",
    "",
  ].join("\n"),
];
const C2R_C_P_FIXTURE_SQL = [
  "-- subject text not null check (subject = 'appraisal_practical')",
  "alter table public.wcv_c2_trusted_repair_sessions force row level security;",
  "select 'public.wcv_c2_create_trusted_repair_session_v1';",
  "select 'public.wcv_c2_apply_trusted_repair_transition_v1';",
  "select 'validator:practice-calculation-relation@1';",
  "select $$'proofEvaluation'$$;",
  "",
].join("\n");
fs.writeFileSync(path.join(FIXTURE_REPO, MIGRATION_PATH), S233A_FIXTURE_SQL, "utf8");
S236P_MIGRATION_PATHS.forEach((migrationPath, index) => {
  fs.writeFileSync(
    path.join(FIXTURE_REPO, migrationPath),
    S236P_FIXTURE_SQLS[index],
    "utf8",
  );
});
fs.writeFileSync(
  path.join(FIXTURE_REPO, C2R_C_P_MIGRATION_PATH),
  C2R_C_P_FIXTURE_SQL,
  "utf8",
);
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
const S236P_MIGRATION_SHA256S = S236P_MIGRATION_PATHS.map((migrationPath) =>
  crypto
    .createHash("sha256")
    .update(
      execFileSync("git", ["show", `${HEAD_SHA}:${migrationPath}`], {
        cwd: FIXTURE_REPO,
      }),
    )
    .digest("hex"),
);
const C2R_C_P_MIGRATION_SHA256 = crypto
  .createHash("sha256")
  .update(
    execFileSync("git", ["show", `${HEAD_SHA}:${C2R_C_P_MIGRATION_PATH}`], {
      cwd: FIXTURE_REPO,
    }),
  )
  .digest("hex");
const S236P_RECONCILED_MIGRATIONS = Object.freeze([
  {
    path: "supabase/migrations/20260730025332_s236p_lean_owner_private.sql",
    lengthBytes: 21073,
    sha256:
      "476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b",
  },
  {
    path: "supabase/migrations/20260730060233_s236p_owner_private_lifecycle_hardening.sql",
    lengthBytes: 13691,
    sha256:
      "e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1",
  },
  {
    path: "supabase/migrations/20260730065744_s236p_owner_private_authenticated_download_info.sql",
    lengthBytes: 1068,
    sha256:
      "632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb",
  },
  {
    path: "supabase/migrations/20260730151052_s236p_owner_private_expiry_read_gate.sql",
    lengthBytes: 2705,
    sha256:
      "416fa80acea48bf4d170661a4f5259632b4d9e3fd740007bd65cbf1ded6103f1",
  },
]);
const S236P_OBSOLETE_LOCAL_TIMESTAMP_PATHS = Object.freeze([
  "supabase/migrations/20260730023248_s236p_lean_owner_private.sql",
  "supabase/migrations/20260730053324_s236p_owner_private_lifecycle_hardening.sql",
  "supabase/migrations/20260730065040_s236p_owner_private_authenticated_download_info.sql",
  "supabase/migrations/20260730113505_s236p_owner_private_expiry_read_gate.sql",
]);
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

function validEvidence(riskBytes, options = {}) {
  const assertionIds =
    options.assertionIds ?? RUNTIME_EVIDENCE_ASSERTION_IDS;
  return {
    schemaVersion: RUNTIME_EVIDENCE_SCHEMA_VERSION,
    producerVersion:
      options.producerVersion ?? RUNTIME_EVIDENCE_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: new Date().toISOString(),
    pullRequestHeadSha: HEAD_SHA,
    githubRunId: RUN_ID,
    githubRunAttempt: RUN_ATTEMPT,
    riskFileSha256: sha256(riskBytes),
    migrations:
      options.migrations ?? [
        {
          path: options.migrationPath ?? MIGRATION_PATH,
          sha256: options.migrationSha256 ?? MIGRATION_SHA256,
        },
      ],
    isolatedEnvironment: {
      kind: "disposable_local_postgres",
      engine: "postgresql_15",
      networkExposure: "none",
      syntheticUserCount: 2,
    },
    assertions: assertionIds.map((id) => ({ id, passed: true })),
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

test("exact S236P migration selects its closed runtime adapter and evidence contract", () => {
  const risk = requiredRisk();
  risk.runtimeReasons = S236P_MIGRATION_PATHS.map((migrationPath) => ({
    path: migrationPath,
    pattern: "supabase/migrations/**",
  }));
  risk.changedFiles = [...S236P_MIGRATION_PATHS];
  const result = run(risk, (evidence) => {
    evidence.producerVersion = S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    evidence.migrations = S236P_MIGRATION_PATHS.map(
      (migrationPath, index) => ({
        path: migrationPath,
        sha256: S236P_MIGRATION_SHA256S[index],
      }),
    );
    evidence.assertions = S236P_RUNTIME_EVIDENCE_ASSERTION_IDS.map((id) => ({
      id,
      passed: true,
    }));
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "verified");
});

test("exact C2R-C-P Practice migration selects its closed runtime adapter and evidence contract", () => {
  const risk = requiredRisk();
  risk.runtimeReasons = [{
    path: C2R_C_P_MIGRATION_PATH,
    pattern: "supabase/migrations/**",
  }];
  risk.changedFiles = [C2R_C_P_MIGRATION_PATH];
  const result = run(risk, (evidence) => {
    evidence.producerVersion = C2R_C_P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
    evidence.migrations = [{
      path: C2R_C_P_MIGRATION_PATH,
      sha256: C2R_C_P_MIGRATION_SHA256,
    }];
    evidence.assertions = C2R_C_P_RUNTIME_EVIDENCE_ASSERTION_IDS.map((id) => ({
      id,
      passed: true,
    }));
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "verified");
});

test("S236P runtime gate rejects missing, reordered, extra, and arbitrary migrations", async (t) => {
  const risk = requiredRisk();
  risk.runtimeReasons = S236P_MIGRATION_PATHS.map((migrationPath) => ({
    path: migrationPath,
    pattern: "supabase/migrations/**",
  }));
  risk.changedFiles = [...S236P_MIGRATION_PATHS];
  const exactMigrations = S236P_MIGRATION_PATHS.map(
    (migrationPath, index) => ({
      path: migrationPath,
      sha256: S236P_MIGRATION_SHA256S[index],
    }),
  );

  const cases = [
    ["missing", exactMigrations.slice(0, -1)],
    ["reordered", [...exactMigrations].reverse()],
    [
      "extra",
      [
        ...exactMigrations,
        {
          path: UNSUPPORTED_MIGRATION_PATH,
          sha256: UNSUPPORTED_MIGRATION_SHA256,
        },
      ],
    ],
    [
      "arbitrary",
      exactMigrations.map((migration, index) =>
        index === exactMigrations.length - 1
          ? {
              path: UNSUPPORTED_MIGRATION_PATH,
              sha256: UNSUPPORTED_MIGRATION_SHA256,
            }
          : migration,
      ),
    ],
  ];
  for (const [name, migrations] of cases) {
    await t.test(name, () => {
      const result = run(risk, (evidence) => {
        evidence.producerVersion =
          S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION;
        evidence.migrations = migrations;
        evidence.assertions = S236P_RUNTIME_EVIDENCE_ASSERTION_IDS.map(
          (id) => ({ id, passed: true }),
        );
      });
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /migration (?:set|path or digest) does not match/,
      );
    });
  }
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
  assert.equal(
    S236P_PRODUCER_VERSION,
    S236P_RUNTIME_EVIDENCE_PRODUCER_VERSION,
  );
  assert.deepEqual(
    S236P_ASSERTION_IDS,
    S236P_RUNTIME_EVIDENCE_ASSERTION_IDS,
  );
  assert.equal(
    C2R_C_P_PRODUCER_VERSION,
    C2R_C_P_RUNTIME_EVIDENCE_PRODUCER_VERSION,
  );
  assert.deepEqual(
    C2R_C_P_ASSERTION_IDS,
    C2R_C_P_RUNTIME_EVIDENCE_ASSERTION_IDS,
  );
  for (const migrationPath of PREREQUISITE_MIGRATIONS) {
    assert.equal(fs.existsSync(path.join(WORKSPACE_ROOT, migrationPath)), true, migrationPath);
  }
});

test("S236P source uses exact live-ledger versions and unchanged SQL bytes", () => {
  assert.deepEqual(
    S236P_MIGRATION_PATHS,
    S236P_RECONCILED_MIGRATIONS.map(({ path: migrationPath }) => migrationPath),
  );

  for (const migration of S236P_RECONCILED_MIGRATIONS) {
    const absolutePath = path.join(WORKSPACE_ROOT, migration.path);
    const bytes = fs.readFileSync(absolutePath);
    assert.equal(bytes.byteLength, migration.lengthBytes, migration.path);
    assert.equal(sha256(bytes), migration.sha256, migration.path);
  }

  for (const obsoletePath of S236P_OBSOLETE_LOCAL_TIMESTAMP_PATHS) {
    assert.equal(
      fs.existsSync(path.join(WORKSPACE_ROOT, obsoletePath)),
      false,
      obsoletePath,
    );
  }
});

test("fake grader runs only for a newly owned or atomically reclaimed request", () => {
  assert.equal(shouldRunFakeGrader("claimed"), true);
  assert.equal(shouldRunFakeGrader("retry_claimed"), true);
  assert.equal(shouldRunFakeGrader("in_progress"), false);
  assert.equal(shouldRunFakeGrader("replayed"), false);
});

test("S236P replays each migration before applying its successor", () => {
  const migrations = S236P_MIGRATION_PATHS.map((migrationPath) => ({
    path: migrationPath,
  }));
  assert.deepEqual(
    s236pMigrationExecutionSteps(migrations).map(
      ({ label, migration }) => [label, migration.path],
    ),
    migrations.flatMap((migration, index) => [
      [`ordered S236P migration ${index + 1}`, migration.path],
      [
        `idempotent ordered S236P migration replay ${index + 1}`,
        migration.path,
      ],
    ]),
  );
  assert.throws(
    () => s236pMigrationExecutionSteps(migrations.slice(0, 2)),
    /exact migration quadruple/,
  );
});

test("S236P provider and raw checkpoints bind the named Owner A fixture set", () => {
  const producer = readTextFileSync(
    path.resolve(
      WORKSPACE_ROOT,
      "scripts/automation/produce-runtime-evidence.mjs",
    ),
    "utf8",
  );
  assert.match(
    producer,
    /S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS = Object\.freeze\(\[/,
  );
  assert.match(producer, /Owner A exact visible fixture-set assertion/);
  assert.match(
    producer,
    /String\(S236P_OWNER_A_EXPECTED_VISIBLE_OBJECT_IDS\.length\)/g,
  );
  assert.doesNotMatch(
    producer,
    /"4",\s*"provider-none and call-zero assertion"/,
  );
  assert.doesNotMatch(
    producer,
    /"4",\s*"raw-zero and synthetic-only assertion"/,
  );
});

test("S236P expiry matrix covers exact boundaries, missing metadata, cleanup, and disable shapes", () => {
  const producer = readTextFileSync(
    path.resolve(
      WORKSPACE_ROOT,
      "scripts/automation/produce-runtime-evidence.mjs",
    ),
    "utf8",
  );
  for (const marker of [
    "expiry plus-one-millisecond assertion",
    "expiry equality assertion",
    "expiry minus-one-millisecond assertion",
    "pg_temp.s236p_boundary_visible_v1",
    "metadata-missing expiry fixture transition",
    'const deleteOperations = [\n    "storage.object.delete",\n    "storage.object.delete_many",',
    '["metadata missing", metadataMissingPath]',
    "`${operation} Owner A ${caseName} cleanup assertion`",
    "targeted authenticated-info forward-disable assertion",
    "targeted forward-disable cleanup preservation assertion",
    "delete-only forward-disable read assertion",
    "delete-only forward-disable cleanup preservation assertion",
  ]) {
    assert.match(producer, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(producer, /with aligned as \(\s*update public\.s236p_owner_private_objects/);
});

test("closed S233A, S236P, and C2R-C-P adapters bind exact migrations and reject unsupported sets", () => {
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
  S236P_MIGRATION_PATHS.forEach((s236pMigrationPath, index) => {
    fs.writeFileSync(
      path.join(directory, s236pMigrationPath),
      S236P_FIXTURE_SQLS[index],
      "utf8",
    );
  });
  fs.writeFileSync(
    path.join(directory, C2R_C_P_MIGRATION_PATH),
    C2R_C_P_FIXTURE_SQL,
    "utf8",
  );
  execFileSync("git", ["add", migrationPath, ...S236P_MIGRATION_PATHS, C2R_C_P_MIGRATION_PATH], {
    cwd: directory,
  });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: directory });
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  const originalCwd = process.cwd();
  try {
    process.chdir(directory);
    const target = resolveTargetMigration(
      { changedFiles: [migrationPath], changedFilesTruncated: false },
      headSha,
    );
    assert.equal(target.adapter, "s233a");
    assert.equal(target.path, migrationPath);
    assert.equal(target.sha256, sha256(Buffer.from(sql)));
    const s236pTarget = resolveTargetMigration(
      {
        changedFiles: [...S236P_MIGRATION_PATHS],
        changedFilesTruncated: false,
      },
      headSha,
    );
    assert.equal(s236pTarget.adapter, "s236p");
    assert.deepEqual(
      s236pTarget.migrations.map(({ path: migrationPathValue, sha256 }) => ({
        path: migrationPathValue,
        sha256,
      })),
      S236P_MIGRATION_PATHS.map((s236pMigrationPath, index) => ({
        path: s236pMigrationPath,
        sha256: sha256(Buffer.from(S236P_FIXTURE_SQLS[index])),
      })),
    );
    const c2rCpTarget = resolveTargetMigration(
      {
        changedFiles: [C2R_C_P_MIGRATION_PATH],
        changedFilesTruncated: false,
      },
      headSha,
    );
    assert.equal(c2rCpTarget.adapter, "c2r-c-p");
    assert.deepEqual(
      c2rCpTarget.migrations.map(({ path: migrationPathValue, sha256 }) => ({
        path: migrationPathValue,
        sha256,
      })),
      [{
        path: C2R_C_P_MIGRATION_PATH,
        sha256: sha256(Buffer.from(C2R_C_P_FIXTURE_SQL)),
      }],
    );
    assert.throws(
      () =>
        resolveTargetMigration(
          {
            changedFiles: S236P_MIGRATION_PATHS.slice(0, 2),
            changedFilesTruncated: false,
          },
          headSha,
        ),
      /no closed runtime-evidence adapter/,
    );
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
  const workflow = readTextFileSync(WORKFLOW);
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
  const producer = readTextFileSync(path.join(WORKSPACE_ROOT, "scripts/automation/produce-runtime-evidence.mjs"));
  assert.match(producer, /"--network",\s*"none"/);
});

test("producer forces PostgreSQL readiness and statements through loopback TCP", () => {
  const producer = readTextFileSync(path.join(WORKSPACE_ROOT, "scripts/automation/produce-runtime-evidence.mjs"));
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

test("producer grants the synthetic service role access to the isolated extension schema", () => {
  const producer = readTextFileSync(path.join(WORKSPACE_ROOT, "scripts/automation/produce-runtime-evidence.mjs"));
  const bootstrap = producer.match(/function bootstrapSql\(\)[\s\S]*?\n}/)?.[0] ?? "";

  assert.match(
    bootstrap,
    /create extension pgcrypto with schema extensions;\s+grant usage on schema extensions to service_role;/,
  );
  assert.equal((bootstrap.match(/grant usage on schema extensions to service_role;/g) ?? []).length, 1);
});
