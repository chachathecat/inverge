import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const workflow = read(".github/workflows/wcv-c2-trusted-repair-runtime.yml");
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

test("C2 workflow is exact-head, same-repository, least-privilege, and cleanup-bound", () => {
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /types: \[opened, synchronize, reopened\]/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /name: wcv-c2-trusted-repair-runtime/);
  assert.match(workflow, /agent\/wcv-c2-first-trusted-repair-vertical/);
  assert.match(workflow, /head\.repo\.full_name == github\.repository/);
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

test("C2 persisted runtime assertions serialize booleans unambiguously", () => {
  const persistedRuntimeVerifier = verifier.match(
    /function verifyPersistedRuntime[\s\S]*?function runFinalRuntime/,
  )?.[0] ?? "";
  assert.equal(
    (persistedRuntimeVerifier.match(/\(count\(\*\) [=>] 0\)::text/g) ?? []).length,
    7,
  );
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
