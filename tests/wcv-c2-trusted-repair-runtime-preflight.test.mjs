import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { DEDICATED_RUNTIME_ADAPTER_PATHS } from "../scripts/automation/runtime-risk-contract.mjs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const workflow = read(".github/workflows/wcv-c2-trusted-repair-runtime.yml");
const workflowPullRequestPathsBlock =
  workflow.match(/\n    paths:\n((?:      - [^\n]+\n)+)/)?.[1] ?? "";
const workflowPullRequestPaths = [
  ...workflowPullRequestPathsBlock.matchAll(/^\s+- ["']([^"']+)["']\s*$/gm),
].map(([, protectedPath]) => protectedPath);
const C2_MIGRATION =
  "supabase/migrations/20260812011903_wcv_c2_trusted_repair_vertical.sql";
const LAW_REGISTRY = "lib/review-os/law-source-version-registry.ts";
const APP_LAYOUT = "app/app/layout.tsx";
const APP_SHELL = "components/review-os/app-shell.tsx";
const LEARNER_UI = "components/learner/learner-ui.tsx";
const DEDICATED_RUNTIME_PATHS = [
  C2_MIGRATION,
  LAW_REGISTRY,
  APP_LAYOUT,
  APP_SHELL,
  LEARNER_UI,
];
const c2Migration = read(C2_MIGRATION);
const machineContract = JSON.parse(
  read("config/wcv-c2-trusted-repair-contract-v1.json"),
);
const verifier = read("scripts/automation/verify-wcv-c2-trusted-repair-runtime.mjs");
const config = read("tests/runtime/wcv-c2-supabase/supabase/config.toml");
const migrationDirectory = path.join(
  root,
  "tests/runtime/wcv-c2-supabase/supabase/migrations",
);
const migrationNames = fs.readdirSync(migrationDirectory).sort();
const migration = read(
  `tests/runtime/wcv-c2-supabase/supabase/migrations/${migrationNames[0]}`,
);
const lockfile = JSON.parse(read("package-lock.json"));
const verifierModule = await import(
  pathToFileURL(path.join(root, "scripts/automation/verify-wcv-c2-trusted-repair-runtime.mjs"))
    .href
);

function assertDedicatedPathClosure(paths) {
  for (const delegatedPath of DEDICATED_RUNTIME_PATHS) {
    assert.equal(
      paths.filter((protectedPath) => protectedPath === delegatedPath).length,
      1,
      `${delegatedPath} must appear exactly once in pull_request.paths`,
    );
  }
}

function exactPersistedCheckValue(sql, column) {
  const checks = [
    ...sql.matchAll(
      new RegExp(
        `${column}\\s+text\\s+not\\s+null\\s+check\\s*\\(([\\s\\S]*?)\\)`,
        "g",
      ),
    ),
  ];
  assert.equal(checks.length, 1, `${column} must have one closed CHECK`);
  const equality = checks[0][1].match(
    new RegExp(`^\\s*${column}\\s*=\\s*'([^']+)'\\s*$`),
  );
  assert.ok(equality, `${column} must accept exactly one semantic version`);
  return equality[1];
}

test("C2 workflow is fork-safe, exact-head, path-triggered, least-privilege, and cleanup-bound", () => {
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /types: \[opened, synchronize, reopened\]/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.equal(
    workflow.match(/permissions:\s*\n\s+contents: read/)?.[0],
    "permissions:\n  contents: read",
  );
  assert.match(workflow, /name: wcv-c2-trusted-repair-runtime/);
  assert.match(
    workflow,
    /supabase\/migrations\/20260812011903_wcv_c2_trusted_repair_vertical\.sql/,
  );
  assert.deepEqual(DEDICATED_RUNTIME_ADAPTER_PATHS, DEDICATED_RUNTIME_PATHS);
  assert.deepEqual(
    machineContract.dedicatedRuntime.protectedPaths,
    DEDICATED_RUNTIME_PATHS,
  );
  assertDedicatedPathClosure(workflowPullRequestPaths);
  for (const delegatedPath of DEDICATED_RUNTIME_PATHS) {
    assert.throws(
      () =>
        assertDedicatedPathClosure(
          workflowPullRequestPaths.filter(
            (protectedPath) => protectedPath !== delegatedPath,
          ),
        ),
      `${delegatedPath} deletion must fail the focused contract`,
    );
  }
  assert.match(read(APP_LAYOUT), /requireTrustedRepairAccess\(\)/);
  assert.match(read(APP_LAYOUT), /trustedRepairEnabled/);
  assert.match(read(APP_SHELL), /trustedRepairEnabled=\{trustedRepairEnabled\}/);
  assert.match(read(LEARNER_UI), /trustedRepairEnabled\s*\?/);
  assert.match(read(LEARNER_UI), /href: "\/app\/trusted-repair"/);
  assert.doesNotMatch(
    workflow,
    /github\.event\.pull_request\.head\.ref\s*==/,
  );
  assert.doesNotMatch(workflow, /head\.repo|github\.repository|github\.actor/);
  assert.doesNotMatch(workflow, /\b(?:fork|source[_ -]?repo)\b/i);
  assert.doesNotMatch(workflow, /^\s*if:\s*.*(?:head|actor|repository)/im);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /cancel-in-progress: true/);
  const jobEnvironment = workflow.match(/\n    env:\n([\s\S]*?)\n\n    steps:/)?.[1] ?? "";
  assert.doesNotMatch(jobEnvironment, /runner\./);
  assert.equal(
    (workflow.match(/WCV_C2_SUPABASE_WORKDIR: \$\{\{ runner\.temp \}\}/g) ?? [])
      .length,
    2,
  );
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /--cleanup/);
  assert.match(workflow, /--require-complete/);
  assert.match(workflow, /if: success\(\)/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /permissions:[\s\S]*?\b(?:write|id-token)\b/i);
  assert.doesNotMatch(workflow, /- ["']app\/app\/\*\*["']/);
  assert.doesNotMatch(workflow, /- ["']components\/\*\*["']/);
  assert.doesNotMatch(workflow, /- ["']lib\/\*\*["']/);
  assert.doesNotMatch(workflow, /self-hosted/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /WCV_C2_RUNTIME_EVIDENCE_PATH/);
  assert.doesNotMatch(workflow, /\bnpx\b/);
  assert.doesNotMatch(workflow, /supabase\s+(?:login|link)|--linked|db\s+push/i);
});

test("C2 verifier uses locked local runtimes and suppresses remote credentials", () => {
  assert.equal(lockfile.packages["node_modules/supabase"].version, "2.95.0");
  assert.match(verifier, /node_modules\/\.bin\/supabase/);
  assert.match(verifier, /EXPECTED_CLI_VERSION = "2\.95\.0"/);
  assert.match(verifier, /SUPABASE_TELEMETRY_DISABLED = "1"/);
  assert.match(verifier, /DO_NOT_TRACK = "1"/);
  assert.match(verifier, /delete environment\[name\]/);
  assert.match(verifier, /::add-mask::/);
  assert.match(verifier, /"start"/);
  assert.match(verifier, /EXCLUDED_SERVICES\.join/);
  assert.match(verifier, /"stop"/);
  assert.match(verifier, /"--no-backup"/);
  assert.match(verifier, /two_local_authenticated_identities/);
  assert.match(verifier, /first_fresh_empty_state_migrations/);
  assert.match(verifier, /second_fresh_empty_state_migrations/);
  assert.match(verifier, /three_subject_actual_browser_to_postgres_chain/);
  assert.match(verifier, /cas_replay_and_exposure_failure_zero_help/);
  assert.match(verifier, /next_process_restart_recovery/);
  assert.match(verifier, /sanitizedBrowserFailureLocations/);
  assert.match(verifier, /allowFailure: true/);
  assert.match(verifier, /sanitized assertion line\(s\)/);
  assert.match(verifier, /crossUserReadRows/);
  assert.match(verifier, /crossUserDeleteRows/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.doesNotMatch(verifier, /https?:\/\/[a-z0-9-]+\.supabase\.co/i);
});

test("C2 migration preflight binds the current machine-contract semantic versions", () => {
  const currentBindings = {
    fixtureVersion: machineContract.fixtureVersion,
    rubricVersion: machineContract.rubricVersion,
  };
  assert.deepEqual(
    {
      fixtureVersion: exactPersistedCheckValue(c2Migration, "fixture_version"),
      rubricVersion: exactPersistedCheckValue(c2Migration, "rubric_version"),
    },
    currentBindings,
  );
  assert.match(currentBindings.fixtureVersion, /\.v2$/);
  assert.match(currentBindings.rubricVersion, /\.v2$/);
  for (const priorVersion of Object.values(currentBindings).map((version) =>
    version.replace(/\.v2$/, ".v1"),
  )) {
    assert.equal(c2Migration.split(priorVersion).length - 1, 0);
  }
});

test("C2 persisted runtime assertions serialize booleans unambiguously", () => {
  const persistedRuntimeVerifier = verifier.match(
    /function verifyPersistedRuntime[\s\S]*?function runFinalRuntime/,
  )?.[0] ?? "";
  assert.equal(
    (persistedRuntimeVerifier.match(/\(count\(\*\) [=>] 0\)::text/g) ?? []).length,
    7,
  );
  assert.equal(
    (
      persistedRuntimeVerifier.match(
        /\(select \(not exists\([\s\S]*?\)\)::text\)/g,
      ) ?? []
    ).length,
    2,
  );
  assert.doesNotMatch(persistedRuntimeVerifier, /\(select not exists\(/);
  assert.match(
    persistedRuntimeVerifier,
    /exposure_revision_binding_closed/,
  );
  assert.match(persistedRuntimeVerifier, /law_verified_release_zero/);
  assert.match(persistedRuntimeVerifier, /private_artifacts_immutable/);
  assert.match(persistedRuntimeVerifier, /failed\.join\(","\) \|\| "shape"/);
});

test("C2 runtime workdir remains local-only and retains the preflight tenant probe", () => {
  assert.equal(migrationNames.length, 1);
  assert.match(config, /^project_id = "wcv-c2-trusted-repair"/m);
  assert.match(config, /\[api\][\s\S]*enabled = true/);
  assert.match(config, /\[auth\][\s\S]*enabled = true/);
  assert.match(config, /\[realtime\][\s\S]*enabled = false/);
  assert.match(config, /\[storage\][\s\S]*enabled = false/);
  assert.doesNotMatch(config, /project_ref|access_token|supabase\.co|inverge-beta/i);

  assert.match(migration, /create table if not exists public\.wcv_c2_preflight_tenant_probe/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all[^;]+from public, anon, authenticated/s);
  assert.match(migration, /grant select, insert, delete[^;]+to authenticated/s);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /wcv_c2_preflight_tenant_probe_user_id_idx/);
  assert.doesNotMatch(migration, /security definer/i);
});

test("C2 command failures expose bounded structured diagnostics without protected canaries", () => {
  const canaries = {
    token: "TokenCanary-Aa1-7c7d4ed53f9b",
    password: "PasswordCanary-Aa1-9f8e7d6c",
    jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjYW5hcnkifQ.signatureCanary123",
    serviceRole: "ServiceRoleCanaryAa1_0123456789abcdefghijklmnopqrstuvwxyz",
    databaseUrl: "postgresql://canary_user:canary_password@localhost:5432/canary_db",
    email: "diagnostic-canary@example.test",
    uuid: "123e4567-e89b-12d3-a456-426614174000",
    learnerAnswer: "RAW_LEARNER_ANSWER_CANARY_Aa1",
    ocrBody: "RAW_OCR_BODY_CANARY_Aa1",
    problemBody: "RAW_PROBLEM_BODY_CANARY_Aa1",
    repairSubmission: "RAW_REPAIR_SUBMISSION_CANARY_Aa1",
    fixtureBody: "RAW_FIXTURE_BODY_CANARY_Aa1",
    providerPayload: "RAW_PROVIDER_PAYLOAD_CANARY_Aa1",
    sqlBody: "RAW_SQL_BODY_CANARY_Aa1",
    longSecret: "LongBase64CanaryAa10123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdef",
  };
  const injected = [
    "safe technical marker: synthetic child failed",
    `Authorization: Bearer ${canaries.token}`,
    `password=${canaries.password}`,
    `jwt=${canaries.jwt}`,
    `SUPABASE_SERVICE_ROLE_KEY=${canaries.serviceRole}`,
    `database_url=${canaries.databaseUrl}`,
    `email=${canaries.email}`,
    `session_id=${canaries.uuid}`,
    `learner_answer=${canaries.learnerAnswer}`,
    `ocr_body=${canaries.ocrBody}`,
    `problem_body=${canaries.problemBody}`,
    `repair_submission=${canaries.repairSubmission}`,
    `fixture_body=${canaries.fixtureBody}`,
    `provider_payload=${canaries.providerPayload}`,
    `select '${canaries.sqlBody}';`,
    `opaque=${canaries.longSecret}`,
  ].join("\n");
  let failure;
  try {
    verifierModule.run(
      process.execPath,
      [
        "-e",
        `process.stdout.write(${JSON.stringify(`stdout-safe\n${injected}\n`)}); process.stderr.write(${JSON.stringify(`stderr-safe\n${injected}\n`)}); process.exit(7);`,
      ],
      { commandSpec: verifierModule.COMMAND_SPECS.diagnostic_regression_failure },
    );
  } catch (error) {
    failure = error;
  }

  assert.ok(failure instanceof verifierModule.SanitizedCommandFailure);
  assert.deepEqual(Object.keys(failure.toSafeObject()), [
    "stageId",
    "commandId",
    "safeLabel",
    "status",
    "signal",
    "safeArgv",
    "stdoutExcerpt",
    "stderrExcerpt",
  ]);
  const output = verifierModule.formatRuntimeFailure(failure);
  assert.match(output, /stage_id: diagnostic_regression/);
  assert.match(output, /command_id: diagnostic_regression_failure/);
  assert.match(output, /safe_label: diagnostic regression failing child/);
  assert.match(output, /status: 7/);
  assert.match(output, /signal: none/);
  assert.match(output, /stderr-safe/);
  assert.match(output, /safe technical marker: synthetic child failed/);
  for (const canary of Object.values(canaries)) {
    assert.doesNotMatch(output, new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("C2 diagnostic tails truncate deterministically and retain the final relevant lines", () => {
  const input = Array.from(
    { length: 100 },
    (_, index) => `diagnostic-line-${String(index).padStart(3, "0")}-${"x".repeat(100)}`,
  ).join("\n");
  const first = verifierModule.boundedSanitizedExcerpt(input);
  const second = verifierModule.boundedSanitizedExcerpt(input);
  assert.equal(first, second);
  assert.match(first, /^<truncated>/);
  assert.match(first, /diagnostic-line-099/);
  assert.doesNotMatch(first, /diagnostic-line-000/);
  assert.ok(first.length <= verifierModule.DIAGNOSTIC_MAX_CHARS);
  assert.ok(first.split("\n").length <= verifierModule.DIAGNOSTIC_MAX_LINES);
});

test("C2 successful and explicitly allowed child-command behavior remains unchanged", () => {
  const success = verifierModule.run(
    process.execPath,
    ["-e", 'process.stdout.write("unchanged-success")'],
    { commandSpec: verifierModule.COMMAND_SPECS.diagnostic_regression_success },
  );
  assert.equal(success.status, 0);
  assert.equal(success.stdout, "unchanged-success");

  const allowed = verifierModule.run(
    process.execPath,
    ["-e", 'process.stderr.write("expected nonzero"); process.exit(9)'],
    {
      commandSpec: verifierModule.COMMAND_SPECS.diagnostic_regression_allow_failure,
      allowFailure: true,
    },
  );
  assert.equal(allowed.status, 9);
  assert.equal(allowed.stderr, "expected nonzero");
  assert.notEqual(allowed.status, 0);
});

test("C2 SQL and workdir argv diagnostics expose only query metadata and normalized shape", () => {
  const sql = "select 'SQL_ARGV_BODY_CANARY' from private_table where user_id='123e4567-e89b-12d3-a456-426614174000';";
  let failure;
  try {
    verifierModule.run(
      process.execPath,
      [
        "--command",
        sql,
        "--workdir",
        "/home/runner/work/_temp/wcv-c2-sensitive-workdir",
      ],
      { commandSpec: verifierModule.COMMAND_SPECS.verify_migrations_psql },
    );
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof verifierModule.SanitizedCommandFailure);
  const safeArgv = JSON.stringify(failure.safeArgv);
  assert.match(safeArgv, /query_id=verify_migrations/);
  assert.match(safeArgv, /sha256=[0-9a-f]{64}/);
  assert.match(safeArgv, /shape=schema existence predicates/);
  assert.match(safeArgv, /<runner-temp-workdir>/);
  assert.doesNotMatch(safeArgv, /SQL_ARGV_BODY_CANARY|private_table|123e4567/);
});

test("C2 workflow cleanup remains idempotent when shutdown is already nonzero", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(root, "wcv-c2-cleanup-test-"));
  fs.mkdirSync(path.join(temporaryRoot, "supabase"), { recursive: true });
  fs.writeFileSync(path.join(temporaryRoot, "supabase/config.toml"), "project_id='synthetic'\n");
  let stopCalls = 0;
  let snapshotCalls = 0;
  const dependencies = {
    stopStackFn: (_root, specification, allowFailure) => {
      stopCalls += 1;
      assert.equal(specification.commandId, "cleanup_only_supabase_stop");
      assert.equal(allowFailure, true);
      return { status: 1 };
    },
    assertNoDockerResourcesFn: (_label, specifications) => {
      snapshotCalls += 1;
      assert.equal(specifications.container.commandId, "cleanup_only_container_list");
      return { containers: [], volumes: [], networks: [] };
    },
  };

  verifierModule.cleanup(temporaryRoot, true, dependencies);
  verifierModule.cleanup(temporaryRoot, true, dependencies);
  assert.equal(stopCalls, 1);
  assert.equal(snapshotCalls, 2);
  assert.equal(fs.existsSync(temporaryRoot), false);
});

test("C2 browser failures retain only sanitized assertion locations", () => {
  const rawResult = {
    status: 5,
    signal: null,
    stdout: "learner_answer=BROWSER_RAW_ANSWER_CANARY\nwcv-c2-trusted-repair-runtime.spec.ts:321:9\n",
    stderr: "Bearer BrowserTokenCanaryAa1\nprovider_payload=BROWSER_PROVIDER_CANARY\n",
  };
  const failure = verifierModule.browserFailureFromResult(
    process.execPath,
    ["-e", "BROWSER_INLINE_CANARY"],
    verifierModule.COMMAND_SPECS.browser_acceptance,
    rawResult,
  );
  const output = verifierModule.formatRuntimeFailure(failure);
  assert.match(output, /command_id: browser_acceptance/);
  assert.match(output, /sanitized assertion line\(s\) 321/);
  assert.doesNotMatch(
    output,
    /BROWSER_RAW_ANSWER_CANARY|BrowserTokenCanaryAa1|BROWSER_PROVIDER_CANARY|BROWSER_INLINE_CANARY/,
  );
});

test("C2 diagnostic formatting cannot create runtime success, evidence, usage, or source mutation", () => {
  const before = spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: root,
    encoding: "utf8",
  }).stdout;
  const probe = path.join(
    os.tmpdir(),
    `wcv-c2-diagnostic-no-side-effect-${process.pid}-${Date.now()}.json`,
  );
  assert.equal(fs.existsSync(probe), false);
  const output = verifierModule.formatRuntimeFailure(
    new verifierModule.SanitizedCommandFailure({
      stageId: "diagnostic_regression",
      commandId: "diagnostic_no_side_effect",
      safeLabel: "diagnostic no-side-effect proof",
      status: 1,
      signal: null,
      safeArgv: Object.freeze(["synthetic"]),
      stdoutExcerpt: "",
      stderrExcerpt: "safe failure",
    }),
  );
  const after = spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: root,
    encoding: "utf8",
  }).stdout;
  assert.equal(before, after);
  assert.equal(fs.existsSync(probe), false);
  assert.doesNotMatch(
    output,
    /wcv-c2-complete-trusted-repair-runtime: pass|runtime success|artifact success|usage commit|learner evidence/i,
  );
});

test("C2 external command inventory has stable mandatory IDs and explicit sensitivity policies", () => {
  for (const commandId of [
    "pre_start_container_list",
    "pre_start_volume_list",
    "pre_start_network_list",
    "first_supabase_start",
    "first_supabase_status",
    "active_container_list",
    "database_image_inspect",
    "verify_migrations_psql",
    "verify_security_contract_psql",
    "verify_persisted_runtime_psql",
    "recovery_session_lookup_psql",
    "first_supabase_stop",
    "second_supabase_start",
    "second_database_container_list",
    "second_verify_migrations_psql",
    "second_verify_security_psql",
    "second_empty_database_psql",
    "final_supabase_stop",
  ]) {
    const specification = verifierModule.COMMAND_SPECS[commandId];
    assert.equal(specification.commandId, commandId);
    assert.ok(specification.stageId.length > 0);
    assert.ok(specification.safeLabel.length > 0);
    assert.ok(specification.sensitivityPolicy.length > 0);
  }
  assert.equal(
    verifierModule.COMMAND_SPECS.final_cleanup_container_list.stageId,
    "final_resource_cleanup",
  );
  assert.match(verifier, /formatRuntimeFailure\(error\)/);
  assert.doesNotMatch(verifier, /JSON\.stringify\(result\)/);
});
