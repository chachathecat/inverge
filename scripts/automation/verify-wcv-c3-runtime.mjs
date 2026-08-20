#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { formatMigrationFailureDiagnostic } from "./wcv-c3-migration-diagnostics.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(MODULE_PATH), "../..");
const PROJECT_ID = "wcv-c3-durable-runtime";
const cleanupOnly = process.argv.includes("--cleanup");
const requireComplete = process.argv.includes("--require-complete");
const migrations = [
  "supabase/migrations/20260817090000_c2r_c_p_structured_practice_proof.sql",
  "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql",
  "supabase/migrations/20260817170000_c2r_c_l_exact_law_applicability.sql",
  "supabase/migrations/20260817190000_wcv_c3_durable_learning_daily_command.sql",
].map((value) => path.join(ROOT, value));
const migrationHistory = fs.readdirSync(path.join(ROOT, "supabase/migrations"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && /^[0-9][0-9A-Za-z._-]*\.sql$/.test(entry.name))
  .map((entry) => path.join(ROOT, "supabase/migrations", entry.name))
  .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
if (migrationHistory.length === 0 || migrations.some((migration) => !migrationHistory.includes(migration))) {
  throw new Error("complete local migration history is missing a required WCV-C2/C3 migration");
}
const workdir = path.resolve(
  process.env.WCV_C3_SUPABASE_WORKDIR ?? path.join(ROOT, ".agent-factory/wcv-c3-supabase-runtime"),
);
const allowedRoot = path.resolve(process.env.RUNNER_TEMP ?? path.join(ROOT, ".agent-factory"));
const evidencePath = path.resolve(
  process.env.WCV_C3_RUNTIME_EVIDENCE_PATH ?? path.join(ROOT, ".agent-factory/wcv-c3-runtime-evidence.json"),
);
const transientPath = path.join(path.dirname(evidencePath), "wcv-c3-private-restart.json");
const excludedServices = ["realtime", "storage-api", "imgproxy", "mailpit", "postgres-meta", "studio", "edge-runtime", "logflare", "vector", "supavisor"];
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";

function assertBoundedWorkdir() {
  if (workdir === allowedRoot || !workdir.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error("WCV-C3 runtime workdir is outside the bounded temporary root");
  }
}

function command(executable, args, label, options = {}) {
  const capture = options.capture === true || options.migrationDiagnostic !== undefined;
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "ignore",
    maxBuffer: 4 * 1024 * 1024,
    timeout: options.timeout ?? 900_000,
  });
  if (result.status !== 0 && !options.allowFailure) {
    if (options.migrationDiagnostic) {
      throw new Error(formatMigrationFailureDiagnostic({
        ...options.migrationDiagnostic,
        stdout: result.stdout,
        stderr: result.stderr,
      }));
    }
    throw new Error(`${label} failed with exit ${result.status ?? "unknown"}`);
  }
  return result;
}

function redactedBrowserDiagnostic(value, input) {
  let safe = String(value ?? "");
  for (const secret of [input.userA.email, input.userA.password, input.userB.email, input.userB.password]) {
    if (secret) safe = safe.split(secret).join("[redacted]");
  }
  safe = safe
    .replace(/[\w.+-]+@localhost\.test/gi, "[redacted-email]")
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, "[redacted-token]")
    .replace(/비공개[^\r\n]*/g, "[private-synthetic-body-redacted]")
    .replace(/후속 독립 실패/g, "[private-synthetic-body-redacted]");
  return safe.slice(-12_000);
}

function supabase(args, label, options = {}) {
  return command(npxExecutable, ["--no-install", "supabase", ...args], label, options);
}

function docker(args, label, options = {}) {
  return command("docker", args, label, { capture: true, ...options });
}

function resources() {
  const names = (kind) => {
    const args = kind === "container" ? ["ps", "--all", "--format", "{{.Names}}"] : [kind, "ls", "--format", "{{.Name}}"];
    return (docker(args, `${kind} inventory`).stdout ?? "").split(/\r?\n/).filter((name) => name.includes(PROJECT_ID));
  };
  return { containers: names("container"), volumes: names("volume"), networks: names("network") };
}

function cleanup() {
  assertBoundedWorkdir();
  if (fs.existsSync(path.join(workdir, "supabase/config.toml"))) {
    supabase(["stop", "--workdir", workdir, "--project-id", PROJECT_ID, "--no-backup", "--yes"], "local Supabase stop", { allowFailure: true });
  }
  const remaining = resources();
  fs.rmSync(workdir, { recursive: true, force: true });
  fs.rmSync(transientPath, { force: true });
  if (requireComplete && Object.values(remaining).some((entries) => entries.length > 0)) {
    throw new Error("WCV-C3 local runtime cleanup was incomplete");
  }
  return remaining;
}

function prepare() {
  assertBoundedWorkdir();
  fs.rmSync(workdir, { recursive: true, force: true });
  fs.mkdirSync(workdir, { recursive: true });
  fs.cpSync(path.join(ROOT, "tests/runtime/wcv-c2-supabase/supabase"), path.join(workdir, "supabase"), { recursive: true });
  const configPath = path.join(workdir, "supabase/config.toml");
  const source = fs.readFileSync(configPath, "utf8");
  const marker = 'project_id = "c2r-c-p-practice-repair"';
  if (source.split(marker).length !== 2) throw new Error("local Supabase project marker is not exact");
  fs.writeFileSync(configPath, source.replace(marker, `project_id = "${PROJECT_ID}"`), { mode: 0o600 });
  for (const migration of migrationHistory) {
    fs.copyFileSync(migration, path.join(workdir, "supabase/migrations", path.basename(migration)));
  }
}

function parseStatus(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("local Supabase status did not return JSON");
  return JSON.parse(output.slice(start, end + 1));
}

function statusValue(status, candidates) {
  for (const candidate of candidates) {
    if (typeof status[candidate] === "string" && status[candidate]) return status[candidate];
  }
  throw new Error("local Supabase status omitted a required value");
}

async function identity(apiUrl, anonKey, suffix) {
  const email = `wcv-c3-${suffix}-${crypto.randomBytes(8).toString("hex")}@localhost.test`;
  const password = `WcvC3!${crypto.randomBytes(18).toString("base64url")}9a`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  if (response.status !== 200 || typeof body?.access_token !== "string" || typeof body?.user?.id !== "string") {
    throw new Error("local synthetic identity creation failed");
  }
  process.stdout.write(`::add-mask::${email}\n::add-mask::${password}\n::add-mask::${body.access_token}\n`);
  return { email, password, userId: body.user.id, accessToken: body.access_token };
}

function databaseContainer() {
  const values = (docker(["ps", "--format", "{{.Names}}"], "active container inventory").stdout ?? "").split(/\r?\n/);
  const found = values.find((value) => value.startsWith("supabase_db_") && value.includes(PROJECT_ID));
  if (!found) throw new Error("local database container is missing");
  return found;
}

function sql(container, query, label, migrationDiagnostic = null) {
  const args = ["exec", container, "psql", "--username", "postgres", "--dbname", "postgres", "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--set", "VERBOSITY=verbose", "--command", query];
  const result = docker(args, label, migrationDiagnostic
    ? { allowFailure: true }
    : {});
  if (result.status !== 0 && migrationDiagnostic) {
    throw new Error(formatMigrationFailureDiagnostic({
      ...migrationDiagnostic,
      stdout: result.stdout,
      stderr: result.stderr,
    }));
  }
  return (result.stdout ?? "").trim();
}

function nextEnvironment(input) {
  const owners = `${input.userA.email},${input.userB.email}`;
  const trustedRepairEnabled = input.trustedRepairEnabled === false ? "false" : "true";
  return {
    ...process.env,
    CI: "true",
    NEXT_PUBLIC_SUPABASE_URL: input.apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: input.serviceRoleKey,
    ALPHA_ADMIN_EMAILS: owners,
    WCV_C2R_C_P_OWNER_EMAILS: owners,
    WCV_C2R_C_P_PRACTICE_ENABLED: trustedRepairEnabled,
    WCV_C2R_C_T_OWNER_EMAILS: owners,
    WCV_C2R_C_T_THEORY_ENABLED: trustedRepairEnabled,
    WCV_C2R_C_L_OWNER_EMAILS: owners,
    WCV_C2R_C_L_LAW_ENABLED: trustedRepairEnabled,
    WCV_C3_OWNER_EMAILS: owners,
    WCV_C3_DURABLE_LEARNING_ENABLED: input.enabled ? "true" : "false",
    WCV_C3_SYNTHETIC_RUNTIME: input.syntheticRuntime === false ? "false" : "true",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

async function startNext(input) {
  const port = 3123;
  const baseUrl = `http://127.0.0.1:${port}`;
  const handle = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: ROOT,
    env: nextEnvironment(input),
    stdio: "ignore",
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (handle.exitCode !== null) throw new Error("local Next server exited before readiness");
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return { handle, baseUrl };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  handle.kill("SIGKILL");
  throw new Error("local Next server readiness timed out");
}

async function stopNext(server) {
  if (!server || server.handle.exitCode !== null) return;
  server.handle.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.handle.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 10_000))]);
  if (server.handle.exitCode === null) server.handle.kill("SIGKILL");
}

function runBrowser(server, input, recoveryCaseId = "", focusedTest = "") {
  const startedAt = Date.now();
  const selection = focusedTest
    ? ["--grep", focusedTest]
    : recoveryCaseId
      ? ["--grep", "process restart restores"]
      : ["--grep-invert", "process restart restores"];
  const result = command(process.execPath, [path.join(ROOT, "node_modules/@playwright/test/cli.js"), "test", "--config=tests/e2e/wcv-c3-playwright.config.ts", ...selection], "WCV-C3 browser acceptance", {
    capture: true,
    env: {
      ...process.env,
      E2E_BASE_URL: server.baseUrl,
      WCV_C3_USER_A_EMAIL: input.userA.email,
      WCV_C3_USER_A_PASSWORD: input.userA.password,
      WCV_C3_USER_B_EMAIL: input.userB.email,
      WCV_C3_USER_B_PASSWORD: input.userB.password,
      WCV_C3_TRANSIENT_EVIDENCE_PATH: transientPath,
      WCV_C3_REAL_TIME_C3_ONLY: input.realTimeC3Only ? "true" : "false",
      ...(recoveryCaseId ? { WCV_C3_RECOVERY_CASE_ID: recoveryCaseId } : {}),
    },
    allowFailure: true,
  });
  if (result.status !== 0) {
    process.stderr.write(`WCV-C3 browser acceptance diagnostic (${Date.now() - startedAt}ms)\n`);
    process.stderr.write(redactedBrowserDiagnostic(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, input));
    throw new Error("WCV-C3 browser acceptance failed");
  }
}

async function verifyDefaultOff(input, container) {
  const before = sql(container, "select count(*) from public.wcv_c3_gap_closure_cases;", "default-off count before");
  const server = await startNext({ ...input, enabled: false });
  try {
    const response = await fetch(`${server.baseUrl}/api/review-os/durable-learning`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not-json" });
    if (response.status !== 404 || (await response.json())?.error !== "not_found") {
      throw new Error("WCV-C3 default-off API did not fail before parsing");
    }
  } finally {
    await stopNext(server);
  }
  const after = sql(container, "select count(*) from public.wcv_c3_gap_closure_cases;", "default-off count after");
  if (before !== after) throw new Error("WCV-C3 default-off request wrote state");
}

function verifyReviewOutputRollback(container) {
  sql(container, `do $wcv_c3_atomic$
declare
  candidate record;
  before_artifacts bigint;
  before_events bigint;
  before_receipts bigint;
  before_deletion_receipts bigint;
  before_version bigint;
  before_state text;
  before_state_data jsonb;
  before_recurring_signature jsonb;
  before_updated_at timestamptz;
  source_event record;
  source_artifact record;
  attempt_id uuid := pg_catalog.gen_random_uuid();
  artifact_id uuid := pg_catalog.gen_random_uuid();
begin
  select id, user_id, state, record_version, state_data, updated_at
  into candidate
  from public.wcv_c3_gap_closure_cases
  order by created_at
  limit 1;
  select count(*) into before_artifacts
  from public.wcv_c3_private_attempt_artifacts
  where case_id = candidate.id and user_id = candidate.user_id;
  select count(*) into before_events
  from public.wcv_c3_evidence_events
  where case_id = candidate.id and user_id = candidate.user_id;
  select count(*) into before_receipts
  from public.wcv_c3_command_receipts
  where case_id = candidate.id and user_id = candidate.user_id;
  select count(*) into before_deletion_receipts
  from public.wcv_c3_deletion_receipts
  where case_id = candidate.id and user_id = candidate.user_id;
  before_version := candidate.record_version;
  before_state := candidate.state;
  before_state_data := candidate.state_data;
  before_recurring_signature := candidate.state_data -> 'recurringSignature';
  before_updated_at := candidate.updated_at;

  begin
    perform * from public.wcv_c3_apply_transition_v1(
      candidate.id,
      candidate.user_id,
      pg_catalog.gen_random_uuid(),
      candidate.record_version,
      candidate.state,
      candidate.state,
      candidate.state_data,
      pg_catalog.jsonb_build_object(
        'artifactId', artifact_id,
        'attemptId', attempt_id,
        'stage', 'D1',
        'body', 'atomic-output-failure',
        'createdAt', pg_catalog.statement_timestamp()
      ),
      pg_catalog.jsonb_build_object(
        'eventId', pg_catalog.gen_random_uuid(),
        'eventType', 'INDEPENDENT_FAILURE_RECORDED',
        'attemptId', attempt_id,
        'artifactId', artifact_id,
        'itemId', 'atomic-output-failure-item',
        'itemFamilyId', 'atomic-output-failure-family',
        'transferDistance', 'NEAR_TRANSFER',
        'outcome', 'FAILURE',
        'payload', pg_catalog.jsonb_build_object('containsBody', false),
        'occurredAt', pg_catalog.statement_timestamp()
      )
    );
    raise exception 'WCV_C3_ATOMIC_FAILURE_INJECTION_DID_NOT_FAIL';
  exception when others then
    if sqlerrm not like '%WCV_C3_REQUIRED_REVIEW_OUTPUT_INVALID%' then
      raise;
    end if;
  end;

  select * into source_event
  from public.wcv_c3_evidence_events
  where id = (
    candidate.state_data -> 'latestReviewOutcome' -> 'binding' ->> 'evidenceEventId'
  )::uuid;
  select * into source_artifact
  from public.wcv_c3_private_attempt_artifacts
  where id = (
    candidate.state_data -> 'latestReviewOutcome' -> 'binding' ->> 'privateArtifactId'
  )::uuid;

  begin
    perform * from public.wcv_c3_apply_transition_v1(
      candidate.id,
      candidate.user_id,
      pg_catalog.gen_random_uuid(),
      candidate.record_version,
      candidate.state,
      candidate.state,
      candidate.state_data,
      pg_catalog.jsonb_build_object(
        'artifactId', source_artifact.id,
        'attemptId', source_artifact.attempt_id,
        'stage', source_artifact.stage,
        'body', source_artifact.body,
        'createdAt', source_artifact.created_at
      ),
      pg_catalog.jsonb_build_object(
        'eventId', source_event.id,
        'eventType', source_event.event_type,
        'attemptId', source_event.attempt_id,
        'artifactId', source_event.artifact_id,
        'itemId', source_event.item_id,
        'itemFamilyId', source_event.item_family_id,
        'transferDistance', source_event.transfer_distance,
        'outcome', source_event.outcome,
        'payload', source_event.payload,
        'occurredAt', source_event.occurred_at
      )
    );
    raise exception 'WCV_C3_BINDING_MISMATCH_INJECTION_DID_NOT_FAIL';
  exception when others then
    if sqlerrm not like '%WCV_C3_REVIEW_SOURCE_BINDING_MISMATCH%' then
      raise;
    end if;
  end;

  if (select count(*) from public.wcv_c3_private_attempt_artifacts where case_id = candidate.id and user_id = candidate.user_id) <> before_artifacts
    or (select count(*) from public.wcv_c3_evidence_events where case_id = candidate.id and user_id = candidate.user_id) <> before_events
    or (select count(*) from public.wcv_c3_command_receipts where case_id = candidate.id and user_id = candidate.user_id) <> before_receipts
    or (select count(*) from public.wcv_c3_deletion_receipts where case_id = candidate.id and user_id = candidate.user_id) <> before_deletion_receipts
    or (select record_version from public.wcv_c3_gap_closure_cases where id = candidate.id and user_id = candidate.user_id) is distinct from before_version
    or (select state from public.wcv_c3_gap_closure_cases where id = candidate.id and user_id = candidate.user_id) is distinct from before_state
    or (select state_data from public.wcv_c3_gap_closure_cases where id = candidate.id and user_id = candidate.user_id) is distinct from before_state_data
    or (select state_data -> 'recurringSignature' from public.wcv_c3_gap_closure_cases where id = candidate.id and user_id = candidate.user_id) is distinct from before_recurring_signature
    or (select updated_at from public.wcv_c3_gap_closure_cases where id = candidate.id and user_id = candidate.user_id) is distinct from before_updated_at
  then
    raise exception 'WCV_C3_ATOMIC_OUTPUT_FAILURE_CHANGED_STATE_SIGNATURE_RECEIPT_TUPLE';
  end if;
end
$wcv_c3_atomic$;`, "atomic review-output rollback");
}

async function runRuntime() {
  assertBoundedWorkdir();
  const headSha = process.env.PR_HEAD_SHA ?? "";
  if (!/^[0-9a-f]{40}$/.test(headSha)) throw new Error("PR_HEAD_SHA is missing or invalid");
  const currentHead = command("git", ["rev-parse", "HEAD"], "exact-head lookup", { capture: true }).stdout.trim();
  if (currentHead !== headSha) throw new Error("runtime checkout is not the exact PR head");
  if (command("git", ["status", "--porcelain"], "clean-worktree start gate", { capture: true }).stdout.trim()) {
    throw new Error("runtime checkout is not clean at start");
  }
  const version = supabase(["--version"], "Supabase CLI version", { capture: true }).stdout.trim();
  if (version !== "2.114.0") throw new Error("Supabase CLI version is not locked to 2.114.0");
  cleanup();
  prepare();
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true, mode: 0o700 });
  fs.rmSync(evidencePath, { force: true });
  let server = null;
  let finalCleanup;
  try {
    supabase(
      ["start", "--workdir", workdir, "--exclude", excludedServices.join(","), "--output", "json", "--yes"],
      "first fresh local Supabase start",
      {
        migrationDiagnostic: {
          migrationFilename: "auto",
          statementIdentifier: "complete_migration_history_fresh_start_1",
        },
      },
    );
    supabase(
      ["db", "reset", "--workdir", workdir, "--local", "--yes"],
      "first complete-history local database reset",
      {
        migrationDiagnostic: {
          migrationFilename: "auto",
          statementIdentifier: "complete_migration_history_reset_1",
        },
      },
    );
    const firstCycleCleanup = cleanup();
    if (Object.values(firstCycleCleanup).some((entries) => entries.length > 0)) {
      throw new Error("first migration cycle did not remove its local Supabase volume");
    }
    prepare();
    supabase(
      ["start", "--workdir", workdir, "--exclude", excludedServices.join(","), "--output", "json", "--yes"],
      "second fresh local Supabase start",
      {
        migrationDiagnostic: {
          migrationFilename: "auto",
          statementIdentifier: "complete_migration_history_fresh_start_2",
        },
      },
    );
    supabase(
      ["db", "reset", "--workdir", workdir, "--local", "--yes"],
      "second complete-history local database reset",
      {
        migrationDiagnostic: {
          migrationFilename: "auto",
          statementIdentifier: "complete_migration_history_reset_2",
        },
      },
    );
    const statusResult = supabase(["status", "--workdir", workdir, "--output", "json"], "local Supabase status", { capture: true });
    const status = parseStatus(statusResult.stdout);
    const apiUrl = statusValue(status, ["API_URL", "api_url"]);
    const anonKey = statusValue(status, ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"]);
    const serviceRoleKey = statusValue(status, ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"]);
    process.stdout.write(`::add-mask::${anonKey}\n::add-mask::${serviceRoleKey}\n`);
    const container = databaseContainer();
    const schema = sql(container, `select concat_ws('|',
      (to_regclass('public.wcv_c3_gap_closure_cases') is not null)::text,
      (to_regclass('public.wcv_c3_private_attempt_artifacts') is not null)::text,
      (to_regclass('public.wcv_c3_evidence_events') is not null)::text,
      (to_regprocedure('public.wcv_c3_load_gap_closure_case_v1(uuid,uuid)') is not null)::text,
      (select provolatile = 's' from pg_catalog.pg_proc where oid = to_regprocedure('public.wcv_c3_load_gap_closure_case_v1(uuid,uuid)'))::text,
      (to_regprocedure('public.wcv_c3_apply_transition_v1(uuid,uuid,uuid,bigint,text,text,jsonb,jsonb,jsonb)') is not null)::text,
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'wcv_c3_%' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
      has_table_privilege('authenticated','public.wcv_c3_gap_closure_cases','SELECT')::text,
      has_function_privilege('authenticated','public.wcv_c3_load_gap_closure_case_v1(uuid,uuid)','EXECUTE')::text,
      has_function_privilege('authenticated','public.wcv_c3_create_gap_closure_case_v1(jsonb,jsonb,uuid)','EXECUTE')::text,
      has_function_privilege('service_role','public.wcv_c3_load_gap_closure_case_v1(uuid,uuid)','EXECUTE')::text,
      has_function_privilege('service_role','public.wcv_c3_create_gap_closure_case_v1(jsonb,jsonb,uuid)','EXECUTE')::text);`, "WCV-C3 schema and grants");
    if (schema !== "true|true|true|true|true|true|5|false|false|false|true|true") throw new Error("WCV-C3 schema, stable aggregate read, forced RLS, or grants are not exact");
    sql(
      container,
      fs.readFileSync(migrations.at(-1), "utf8"),
      "WCV-C3 migration replay",
      {
        migrationFilename: migrations.at(-1),
        statementIdentifier: "public.wcv_c3_apply_transition_v1",
      },
    );

    const userA = await identity(apiUrl, anonKey, "a");
    const userB = await identity(apiUrl, anonKey, "b");
    const input = { apiUrl, anonKey, serviceRoleKey, userA, userB };
    const direct = await fetch(`${apiUrl}/rest/v1/wcv_c3_gap_closure_cases?select=id`, { headers: { apikey: anonKey, Authorization: `Bearer ${userA.accessToken}` } });
    if (![401, 403].includes(direct.status)) throw new Error("authenticated direct C3 table access was not denied");
    await verifyDefaultOff(input, container);

    server = await startNext({ ...input, enabled: true });
    runBrowser(server, input);
    verifyReviewOutputRollback(container);
    const transient = JSON.parse(fs.readFileSync(transientPath, "utf8"));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(transient.recoveryCaseId) || transient.counts.completedSubjects !== 3) {
      throw new Error("transient browser evidence is incomplete");
    }
    await stopNext(server);
    server = null;
    server = await startNext({ ...input, enabled: true });
    runBrowser(server, input, transient.recoveryCaseId);
    await stopNext(server);
    server = null;
    const c3OnlyInput = {
      ...input,
      enabled: true,
      syntheticRuntime: false,
      trustedRepairEnabled: false,
      realTimeC3Only: true,
    };
    server = await startNext(c3OnlyInput);
    const boundaryFixture = sql(container, `with updated as (
      update public.wcv_c3_gap_closure_cases
      set state_data = pg_catalog.jsonb_set(
            state_data,
            '{nextEligibleAt}',
            pg_catalog.to_jsonb(pg_catalog.statement_timestamp() + interval '20 seconds'),
            false
          ),
          updated_at = pg_catalog.statement_timestamp()
      where id = '${transient.recoveryCaseId}'::uuid
      returning state_data
    )
    select concat_ws('|',
      pg_catalog.count(*),
      pg_catalog.bool_and(state_data -> 'latestReviewOutcome' is not null)::text,
      pg_catalog.bool_and(pg_catalog.jsonb_array_length(state_data -> 'failureNotes') > 0)::text
    )
    from updated;`, "eligibility boundary fixture");
    if (boundaryFixture !== "1|true|true") {
      throw new Error("eligibility boundary fixture did not preserve failed-review feedback");
    }
    runBrowser(
      server,
      c3OnlyInput,
      transient.recoveryCaseId,
      "real-time waiting and C3-only navigation",
    );
    await stopNext(server);
    server = null;

    const invariants = sql(container, `select concat_ws('|',
      (select count(*) from public.wcv_c3_gap_closure_cases),
      (select count(*) from public.wcv_c3_private_attempt_artifacts),
      (select count(*) from public.wcv_c3_deletion_receipts),
      (select count(*) from public.wcv_c3_gap_closure_cases where state='CURRENTLY_CLEAR'),
      (select count(*) from public.wcv_c3_gap_closure_cases where state='REOPENED'),
      (select count(*) from public.wcv_c3_evidence_events where payload::text ~* '"(rawBody|learnerText|answerBody|ocrBody|noteBody|credential|token|secret|password)"[[:space:]]*:'),
      (select count(*) from public.wcv_c3_evidence_events where payload->>'containsBody' is distinct from 'false'),
      (select count(*) from public.wcv_c3_private_attempt_artifacts where immutable is not true),
      (select count(*) from public.wcv_c3_evidence_events
        where event_type in ('D1_REPRODUCED','D7_TRANSFER_OBSERVED','TIMED_RECURRENCE_CONFIRMED','RECURRENCE_RECONFIRMED','INDEPENDENT_FAILURE_RECORDED')
          and pg_catalog.jsonb_typeof(payload->'reviewOutput') is distinct from 'object'),
      (select count(*) from public.wcv_c3_evidence_events
        where payload::text ~* '"(explanationKo|instructionKo|learnerFacingSummaryKo)"[[:space:]]*:'),
      (select coalesce(sum(pg_catalog.jsonb_array_length(state_data->'failureNotes')), 0) from public.wcv_c3_gap_closure_cases),
      (select count(*) from public.wcv_c3_gap_closure_cases where pg_catalog.jsonb_typeof(state_data->'latestReviewOutcome') = 'object'));
      `, "persisted C3 invariants");
    if (invariants !== "2|7|1|1|1|0|0|0|0|0|1|2") throw new Error("persisted WCV-C3 runtime invariants failed");

    const evidence = {
      schemaVersion: "wcv_c3_durable_learning_runtime_evidence.v1",
      headSha,
      runId: process.env.GITHUB_RUN_ID ?? "local",
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "1",
      migrations: migrationHistory.map((file) => ({ identity: path.basename(file, ".sql"), sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") })),
      assertions: ["exact_head", "complete_migration_history_fresh_start", "complete_migration_history_reset_twice", "second_reset_new_local_volume", "target_migration_replay", "sanitized_migration_failure_diagnostics", "two_fresh_authenticated_identities", "default_off_before_parse", "forced_rls_service_only", "stable_transactional_aggregate_read", "three_subject_browser_chain", "responsive_390_768_1440", "keyboard_and_axe", "private_body_projection_separation", "review_outputs_all_subjects", "bodyless_learning_gap_and_concept_signals", "source_bound_private_failure_note", "atomic_review_output_rollback", "source_binding_mismatch_rollback", "idempotent_review_output_replay", "planner_review_state_separation", "cross_user_denial", "export_delete", "process_restart_restore", "second_browser_restore", "real_time_waiting_action", "eligibility_boundary_crossing_preserves_feedback", "waiting_plan_substitutes_eligible_audit", "c3_only_navigation_kill_switch", "reopen_after_later_failure", "bounded_daily_plan"],
      counts: { completedSubjects: 3, persistedCases: 2, privateArtifacts: 7, deletionReceipts: 1 },
      remoteSupabaseUsed: false,
      repositorySecretsUsed: false,
      rawBodiesIncluded: false,
      privateIdentifiersIncluded: false,
      screenshotsIncluded: false,
      tracesIncluded: false,
      productionUsed: false,
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    fs.rmSync(transientPath, { force: true });
    if (command("git", ["rev-parse", "HEAD"], "final exact-head lookup", { capture: true }).stdout.trim() !== headSha) throw new Error("runtime head changed");
    if (command("git", ["status", "--porcelain"], "clean-worktree final gate", { capture: true }).stdout.trim()) {
      throw new Error("runtime checkout is not clean after verification");
    }
  } finally {
    await stopNext(server);
    finalCleanup = cleanup();
  }
  if (Object.values(finalCleanup).some((entries) => entries.length > 0)) throw new Error("final WCV-C3 cleanup left resources");
  process.stdout.write("wcv-c3-durable-learning-runtime: pass\n");
}

if (cleanupOnly) {
  cleanup();
  process.stdout.write("wcv-c3-runtime-cleanup: pass\n");
} else {
  runRuntime().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "WCV-C3 runtime failed"}\n`);
    process.exitCode = 1;
  });
}
