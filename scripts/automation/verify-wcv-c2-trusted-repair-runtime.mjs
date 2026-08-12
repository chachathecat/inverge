#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const SOURCE_WORKDIR = path.join(
  REPOSITORY_ROOT,
  "tests/runtime/wcv-c2-supabase",
);
const C2_MIGRATION_PATH = path.join(
  REPOSITORY_ROOT,
  "supabase/migrations/20260812011903_wcv_c2_trusted_repair_vertical.sql",
);
const BROWSER_CONFIG_PATH = path.join(
  REPOSITORY_ROOT,
  "tests/e2e/wcv-c2-playwright.config.ts",
);
const PROJECT_ID = "wcv-c2-trusted-repair";
const EXPECTED_CLI_VERSION = "2.95.0";
const EXCLUDED_SERVICES = [
  "realtime",
  "storage-api",
  "imgproxy",
  "mailpit",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
];
const REQUIRED_CONTAINER_PREFIXES = [
  "supabase_db_",
  "supabase_auth_",
  "supabase_rest_",
  "supabase_kong_",
];
const FORBIDDEN_LOCAL_SOURCE = [
  /supabase_access_token/i,
  /supabase_db_password/i,
  /project_ref/i,
  /inverge-beta/i,
  /https?:\/\/[a-z0-9-]+\.supabase\.co/i,
  /\bsupabase\s+(?:login|link)\b/i,
  /\b--linked\b/i,
  /\bsupabase\s+db\s+(?:push|dump|pull)\b/i,
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const IMAGE_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/i;

const args = new Set(process.argv.slice(2));
const cleanupOnly = args.has("--cleanup");
const requireCompleteCleanup = args.has("--require-complete");

function required(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function commandEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (
      name.startsWith("SUPABASE_") ||
      /^(?:DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING)$/.test(name)
    ) {
      delete environment[name];
    }
  }
  environment.CI = "true";
  environment.SUPABASE_TELEMETRY_DISABLED = "1";
  environment.DO_NOT_TRACK = "1";
  return environment;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? REPOSITORY_ROOT,
    encoding: "utf8",
    env: options.env ?? commandEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    if (options.allowFailure) return result;
    throw new Error(`${options.label ?? command} could not execute`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${options.label ?? command} failed with status ${result.status}`);
  }
  return result;
}

function gitHead() {
  return run("git", ["rev-parse", "HEAD"], { label: "git head verification" })
    .stdout.trim().toLowerCase();
}

function verifyExactHead(headSha) {
  if (gitHead() !== headSha) throw new Error("checkout is not the exact PR head");
}

function docker(commandArgs, options = {}) {
  return run("docker", commandArgs, { ...options, label: options.label ?? "docker command" });
}

function supabase(commandArgs, options = {}) {
  const executable = path.join(REPOSITORY_ROOT, "node_modules/.bin/supabase");
  return run(executable, commandArgs, {
    ...options,
    label: options.label ?? "local Supabase CLI command",
  });
}

function runtimeRoot() {
  const root = path.resolve(
    process.env.WCV_C2_SUPABASE_WORKDIR ??
      path.join(REPOSITORY_ROOT, ".agent-factory/wcv-c2-supabase-runtime"),
  );
  const allowedRoot = path.resolve(
    process.env.RUNNER_TEMP ?? path.join(REPOSITORY_ROOT, ".agent-factory"),
  );
  if (root === allowedRoot || !root.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error("C2 runtime workdir is outside the bounded temporary root");
  }
  return root;
}

function prepareRuntimeWorkdir(root) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(path.join(SOURCE_WORKDIR, "supabase"), path.join(root, "supabase"), {
    recursive: true,
  });
  fs.copyFileSync(
    C2_MIGRATION_PATH,
    path.join(root, "supabase/migrations", path.basename(C2_MIGRATION_PATH)),
  );
}

function localSourceFiles() {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(absolute);
    }
  };
  visit(path.join(SOURCE_WORKDIR, "supabase"));
  files.push(C2_MIGRATION_PATH, BROWSER_CONFIG_PATH);
  files.push(
    path.join(
      REPOSITORY_ROOT,
      "tests/e2e/wcv-c2-trusted-repair-runtime.spec.ts",
    ),
  );
  return files.sort();
}

function verifyLocalOnlySource() {
  for (const file of localSourceFiles()) {
    const content = fs.readFileSync(file, "utf8");
    for (const forbidden of FORBIDDEN_LOCAL_SOURCE) {
      if (forbidden.test(content)) {
        throw new Error(`forbidden remote Supabase surface in ${path.relative(REPOSITORY_ROOT, file)}`);
      }
    }
  }
}

function migrationMetadata() {
  const files = [
    ...fs.readdirSync(path.join(SOURCE_WORKDIR, "supabase/migrations"))
      .map((name) => path.join(SOURCE_WORKDIR, "supabase/migrations", name)),
    C2_MIGRATION_PATH,
  ];
  return files
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(path.basename(file)))
    .sort()
    .map((file) => ({
      identity: path.basename(file).replace(/\.sql$/, ""),
      sha256: sha256(fs.readFileSync(file)),
    }));
}

function matchingDockerResources(kind) {
  const format = kind === "container" ? "{{.Names}}" : "{{.Name}}";
  const commandArgs =
    kind === "container"
      ? ["ps", "--all", "--format", format]
      : [kind, "ls", "--format", format];
  return docker(commandArgs).stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.includes(PROJECT_ID));
}

function dockerResourceSnapshot() {
  return {
    containers: matchingDockerResources("container"),
    volumes: matchingDockerResources("volume"),
    networks: matchingDockerResources("network"),
  };
}

function assertNoDockerResources(label) {
  const snapshot = dockerResourceSnapshot();
  if (snapshot.containers.length || snapshot.volumes.length || snapshot.networks.length) {
    throw new Error(`${label} left C2 Docker resources behind`);
  }
  return snapshot;
}

function stopStack(root, allowFailure = false) {
  return supabase(
    [
      "stop",
      "--workdir",
      root,
      "--project-id",
      PROJECT_ID,
      "--no-backup",
      "--yes",
    ],
    { allowFailure, label: "local Supabase shutdown" },
  );
}

function cleanup(root, requireComplete) {
  if (fs.existsSync(path.join(root, "supabase/config.toml"))) {
    // The verifier normally removes the stack itself. A second workflow-level
    // cleanup must therefore be idempotent: the CLI may report no running
    // project, while the resource assertion below remains authoritative.
    stopStack(root, true);
  }
  const snapshot = assertNoDockerResources("local Supabase cleanup");
  fs.rmSync(root, { recursive: true, force: true });
  if (requireComplete && (snapshot.containers.length || snapshot.volumes.length || snapshot.networks.length)) {
    throw new Error("complete C2 cleanup was not established");
  }
  return snapshot;
}

function parseJsonOutput(value, label) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`${label} did not return JSON`);
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function maskLocalValues(status) {
  for (const [name, value] of Object.entries(status)) {
    if (
      typeof value === "string" &&
      value.length >= 8 &&
      /(?:KEY|SECRET|PASSWORD|TOKEN|DB_URL)/i.test(name)
    ) {
      process.stdout.write(`::add-mask::${value}\n`);
    }
  }
}

function statusValue(status, names, label) {
  for (const name of names) {
    const value = status[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  throw new Error(`${label} is missing from local Supabase status`);
}

async function apiRequest(apiUrl, anonKey, requestPath, options = {}) {
  const response = await fetch(`${apiUrl}${requestPath}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken ?? anonKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${options.label ?? "local API request"} returned non-JSON`);
    }
  }
  return { status: response.status, body };
}

async function createSyntheticIdentity(apiUrl, anonKey, suffix) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const password = `WcvC2!${crypto.randomBytes(18).toString("base64url")}9a`;
  const email = `wcv-c2-${suffix}-${nonce}@localhost.test`;
  const result = await apiRequest(apiUrl, anonKey, "/auth/v1/signup", {
    method: "POST",
    body: {
      email,
      password,
    },
    label: "local Auth signup",
  });
  if (result.status !== 200) throw new Error("local Auth signup failed");
  const userId = result.body?.user?.id;
  const accessToken = result.body?.access_token;
  required(userId, "synthetic Auth user id", UUID_PATTERN);
  if (typeof accessToken !== "string" || accessToken.length < 32) {
    throw new Error("local Auth signup returned no session token");
  }
  process.stdout.write(`::add-mask::${accessToken}\n`);
  return { userId, accessToken, email, password };
}

function expectStatus(result, allowed, label) {
  if (!allowed.includes(result.status)) {
    throw new Error(`${label} returned unexpected status ${result.status}`);
  }
}

function activeStackIdentity() {
  const containers = docker(["ps", "--format", "{{.Names}}"]).stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.includes(PROJECT_ID));
  for (const prefix of REQUIRED_CONTAINER_PREFIXES) {
    if (!containers.some((name) => name.startsWith(prefix))) {
      throw new Error(`required local Supabase service ${prefix} is not running`);
    }
  }
  const databaseContainer = containers.find((name) => name.startsWith("supabase_db_"));
  const identity = docker([
    "inspect",
    "--format",
    "{{.Config.Image}}|{{.Image}}",
    databaseContainer,
  ]).stdout.trim();
  const [reference, digest] = identity.split("|");
  if (!reference || !IMAGE_DIGEST_PATTERN.test(digest ?? "")) {
    throw new Error("local database image identity is invalid");
  }
  return { reference, digest };
}

function databaseQuery(databaseContainer, sql) {
  return docker([
    "exec",
    databaseContainer,
    "psql",
    "--username",
    "postgres",
    "--dbname",
    "postgres",
    "--no-psqlrc",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--command",
    sql,
  ]).stdout.trim();
}

function verifyMigrationsApplied(databaseContainer) {
  const result = databaseQuery(
    databaseContainer,
    `select concat_ws('|',
      (to_regclass('public.wcv_c2_preflight_tenant_probe') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_sessions') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_private_artifacts') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_exposure_events') is not null)::text,
      (to_regprocedure('public.wcv_c2_apply_trusted_repair_transition_v1(uuid,uuid,uuid,bigint,text,text,jsonb,uuid,text,text,smallint,boolean,jsonb,jsonb)') is not null)::text
    );`,
  );
  if (result !== "true|true|true|true|true") {
    throw new Error("empty-state C2 migrations were not fully applied");
  }
}

function verifyDatabaseSecurityContract(databaseContainer) {
  const result = databaseQuery(
    databaseContainer,
    `select concat_ws('|',
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname like 'wcv_c2_trusted_repair_%'
         and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_sessions','SELECT')::text,
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_sessions','INSERT')::text,
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_private_artifacts','SELECT')::text,
      has_function_privilege('authenticated','public.wcv_c2_create_trusted_repair_session_v1(jsonb,jsonb,uuid)','EXECUTE')::text,
      has_function_privilege('service_role','public.wcv_c2_create_trusted_repair_session_v1(jsonb,jsonb,uuid)','EXECUTE')::text
    );`,
  );
  if (result !== "5|true|false|false|false|true") {
    throw new Error("C2 grants, forced RLS, or RPC privileges are not exact");
  }
}

function nextEnvironment(input) {
  return {
    ...commandEnvironment(),
    NEXT_PUBLIC_SUPABASE_URL: input.apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: input.serviceRoleKey,
    ALPHA_ADMIN_EMAILS: `${input.userA.email},${input.userB.email}`,
    WCV_C2_TRUSTED_REPAIR_ENABLED: input.enabled ? "true" : "false",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

async function waitForHttp(url, processHandle) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error("local Next server exited before becoming ready");
    }
    try {
      const response = await fetch(`${url}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The server may still be compiling its first route.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("local Next server did not become ready");
}

async function startNext(input) {
  const port = input.port ?? 3100;
  const baseUrl = `http://127.0.0.1:${port}`;
  const processHandle = spawn(
    path.join(REPOSITORY_ROOT, "node_modules/.bin/next"),
    ["dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: REPOSITORY_ROOT,
      env: nextEnvironment(input),
      stdio: "ignore",
      detached: false,
    },
  );
  await waitForHttp(baseUrl, processHandle);
  return { processHandle, baseUrl };
}

async function stopNext(server) {
  if (!server || server.processHandle.exitCode !== null) return;
  server.processHandle.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.processHandle.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (server.processHandle.exitCode === null) {
    server.processHandle.kill("SIGKILL");
    await new Promise((resolve) => server.processHandle.once("exit", resolve));
  }
}

async function verifyFlagOffBeforeBodyParsing(nextInput, databaseContainer) {
  const before = Number(
    databaseQuery(
      databaseContainer,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
  );
  const server = await startNext({ ...nextInput, enabled: false });
  try {
    const response = await fetch(`${server.baseUrl}/api/review-os/trusted-repair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{this-is-not-json",
    });
    if (response.status !== 404) {
      throw new Error("default-OFF API did not fail closed before body parsing");
    }
    const body = await response.json();
    if (body?.error !== "not_found") {
      throw new Error("default-OFF API returned an unsafe error shape");
    }
  } finally {
    await stopNext(server);
  }
  const after = Number(
    databaseQuery(
      databaseContainer,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
  );
  if (before !== after) throw new Error("default-OFF drill wrote a C2 session");
}

function playwrightEnvironment(input) {
  return {
    ...commandEnvironment(),
    E2E_BASE_URL: input.baseUrl,
    WCV_C2_USER_A_EMAIL: input.userA.email,
    WCV_C2_USER_A_PASSWORD: input.userA.password,
    WCV_C2_USER_B_EMAIL: input.userB.email,
    WCV_C2_USER_B_PASSWORD: input.userB.password,
    WCV_C2_BROWSER_EVIDENCE_PATH: input.browserEvidencePath,
    ...(input.recoverySessionId
      ? { WCV_C2_RECOVERY_SESSION_ID: input.recoverySessionId }
      : {}),
  };
}

function sanitizedBrowserFailureLocations(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const locations = [];
  for (const match of output.matchAll(
    /wcv-c2-trusted-repair-runtime\.spec\.ts:(\d+):\d+/g,
  )) {
    if (!locations.includes(match[1])) locations.push(match[1]);
  }
  return locations.slice(-5);
}

function runBrowserSuite(input) {
  const grepArgs = input.recoverySessionId
    ? ["--grep", "process restart recovers"]
    : ["--grep-invert", "process restart recovers"];
  const label = input.recoverySessionId
    ? "C2 process-restart browser recovery"
    : "C2 complete browser acceptance";
  const result = run(
    path.join(REPOSITORY_ROOT, "node_modules/.bin/playwright"),
    ["test", `--config=${BROWSER_CONFIG_PATH}`, ...grepArgs],
    {
      label,
      env: playwrightEnvironment(input),
      allowFailure: true,
    },
  );
  if (result.status !== 0) {
    const locations = sanitizedBrowserFailureLocations(result);
    const suffix = locations.length
      ? ` at sanitized assertion line(s) ${locations.join(",")}`
      : " with no safe assertion location";
    throw new Error(`${label} failed with status ${result.status}${suffix}`);
  }
}

async function verifyDirectRls(input) {
  const anonRead = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_sessions?select=id",
    { label: "anonymous C2 session read" },
  );
  expectStatus(anonRead, [401, 403], "anonymous C2 session read");

  const authenticatedInsert = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_sessions",
    {
      method: "POST",
      accessToken: input.userA.accessToken,
      body: {},
      label: "authenticated canonical session insert",
    },
  );
  expectStatus(authenticatedInsert, [401, 403], "authenticated canonical session insert");

  const privateRead = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_private_artifacts?select=id",
    {
      accessToken: input.userA.accessToken,
      label: "authenticated private artifact read",
    },
  );
  expectStatus(privateRead, [401, 403], "authenticated private artifact read");

  const directRpc = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/rpc/wcv_c2_create_trusted_repair_session_v1",
    {
      method: "POST",
      accessToken: input.userA.accessToken,
      body: {},
      label: "authenticated direct C2 RPC",
    },
  );
  expectStatus(directRpc, [401, 403, 404], "authenticated direct C2 RPC");
}

function verifyPersistedRuntime(databaseContainer) {
  const assertionIds = [
    "sessions_present",
    "private_artifacts_present",
    "exposure_events_present",
    "command_receipts_present",
    "exposure_revision_binding_closed",
    "law_verified_release_zero",
    "private_artifacts_immutable",
  ];
  const result = databaseQuery(
    databaseContainer,
    `select concat_ws('|',
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_sessions),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_private_artifacts),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_exposure_events),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_command_receipts),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_exposure_events e
        left join public.wcv_c2_trusted_repair_private_artifacts a
          on a.id=e.revision_id and a.session_id=e.session_id and a.user_id=e.user_id
        where a.id is null),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_sessions
        where subject='appraisal_compensation_law' and state='verified'),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_private_artifacts where immutable is not true)
    );`,
  );
  const values = result.split("|");
  const failed = assertionIds.filter((_, index) => values[index] !== "true");
  if (failed.length > 0 || values.length !== assertionIds.length) {
    throw new Error(
      `persisted C2 runtime invariants failed: ${failed.join(",") || "shape"}`,
    );
  }
}

async function runFinalRuntime() {
  const headSha = required(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", SHA_PATTERN).toLowerCase();
  const runId = required(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const runAttempt = required(process.env.GITHUB_RUN_ATTEMPT, "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const evidencePath = path.resolve(
    process.env.WCV_C2_RUNTIME_EVIDENCE_PATH ??
      path.join(REPOSITORY_ROOT, ".agent-factory/wcv-c2-trusted-repair-runtime-evidence.json"),
  );
  const browserEvidencePath = path.join(
    path.dirname(evidencePath),
    "wcv-c2-browser-metadata.json",
  );
  const root = runtimeRoot();
  const migrations = migrationMetadata();
  if (migrations.length !== 2) throw new Error("C2 final migration inventory is not exact");
  verifyExactHead(headSha);
  verifyLocalOnlySource();
  const cliVersion = supabase(["--version"], { label: "Supabase CLI version check" })
    .stdout.trim();
  if (cliVersion !== EXPECTED_CLI_VERSION) {
    throw new Error(`Supabase CLI version ${cliVersion || "missing"} is not ${EXPECTED_CLI_VERSION}`);
  }

  stopStack(root, true);
  assertNoDockerResources("pre-start cleanup");
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true, mode: 0o700 });
  fs.rmSync(evidencePath, { force: true });
  fs.rmSync(browserEvidencePath, { force: true });

  let runtimeError;
  let databaseImage;
  let browserEvidence;
  let cleanupResult;
  const assertions = [];
  const leakCounts = { crossUserReadRows: 0, crossUserDeleteRows: 0 };
  let server;
  try {
    prepareRuntimeWorkdir(root);
    supabase(
      [
        "start",
        "--workdir",
        root,
        "--exclude",
        EXCLUDED_SERVICES.join(","),
        "--output",
        "json",
        "--yes",
      ],
      { label: "first fresh isolated local Supabase startup" },
    );
    const status = parseJsonOutput(
      supabase(["status", "--workdir", root, "--output", "json"], {
        label: "local Supabase status",
      }).stdout,
      "local Supabase status",
    );
    maskLocalValues(status);
    const apiUrl = statusValue(status, ["API_URL", "api_url"], "local API URL");
    const anonKey = statusValue(
      status,
      ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"],
      "local anonymous key",
    );
    const serviceRoleKey = statusValue(
      status,
      ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"],
      "local service role key",
    );
    process.stdout.write(`::add-mask::${anonKey}\n::add-mask::${serviceRoleKey}\n`);

    databaseImage = activeStackIdentity();
    const databaseContainer = matchingDockerResources("container")
      .find((name) => name.startsWith("supabase_db_"));
    if (!databaseContainer) throw new Error("local database container is missing");
    verifyMigrationsApplied(databaseContainer);
    verifyDatabaseSecurityContract(databaseContainer);
    assertions.push({ id: "first_fresh_empty_state_migrations", result: "passed" });
    assertions.push({ id: "forced_rls_and_exact_grants", result: "passed" });
    assertions.push({ id: "minimum_local_services_healthy", result: "passed" });

    const userA = await createSyntheticIdentity(apiUrl, anonKey, "a");
    const userB = await createSyntheticIdentity(apiUrl, anonKey, "b");
    if (userA.userId === userB.userId) throw new Error("synthetic Auth identities are not distinct");
    assertions.push({ id: "two_local_authenticated_identities", result: "passed" });

    const sameUserInsert = await apiRequest(
      apiUrl,
      anonKey,
      "/rest/v1/wcv_c2_preflight_tenant_probe",
      {
        method: "POST",
        accessToken: userA.accessToken,
        prefer: "return=representation",
        body: { user_id: userA.userId, assertion: "same_user_permitted" },
        label: "same-user RLS insert",
      },
    );
    expectStatus(sameUserInsert, [201], "same-user RLS insert");
    const crossUserRead = await apiRequest(
      apiUrl,
      anonKey,
      `/rest/v1/wcv_c2_preflight_tenant_probe?select=id&user_id=eq.${userA.userId}`,
      { accessToken: userB.accessToken, label: "cross-user RLS read" },
    );
    expectStatus(crossUserRead, [200], "cross-user RLS read");
    if (!Array.isArray(crossUserRead.body) || crossUserRead.body.length !== 0) {
      throw new Error("cross-user preflight RLS read leaked rows");
    }
    const crossUserDelete = await apiRequest(
      apiUrl,
      anonKey,
      `/rest/v1/wcv_c2_preflight_tenant_probe?user_id=eq.${userA.userId}`,
      {
        method: "DELETE",
        accessToken: userB.accessToken,
        prefer: "return=representation",
        label: "cross-user RLS delete",
      },
    );
    expectStatus(crossUserDelete, [200], "cross-user RLS delete");
    if (!Array.isArray(crossUserDelete.body) || crossUserDelete.body.length !== 0) {
      throw new Error("cross-user preflight RLS delete affected rows");
    }
    await verifyDirectRls({ apiUrl, anonKey, userA });
    assertions.push({ id: "anonymous_authenticated_and_cross_user_denial", result: "passed" });

    const nextInput = { apiUrl, anonKey, serviceRoleKey, userA, userB };
    await verifyFlagOffBeforeBodyParsing(nextInput, databaseContainer);
    assertions.push({ id: "default_off_before_parse_and_write", result: "passed" });

    server = await startNext({ ...nextInput, enabled: true });
    runBrowserSuite({
      baseUrl: server.baseUrl,
      userA,
      userB,
      browserEvidencePath,
    });
    if (!fs.existsSync(browserEvidencePath)) {
      throw new Error("C2 browser suite produced no metadata evidence");
    }
    browserEvidence = JSON.parse(fs.readFileSync(browserEvidencePath, "utf8"));
    verifyPersistedRuntime(databaseContainer);
    assertions.push({ id: "three_subject_actual_browser_to_postgres_chain", result: "passed" });
    assertions.push({ id: "cas_replay_and_exposure_failure_zero_help", result: "passed" });
    assertions.push({ id: "responsive_keyboard_axe_and_input_modes", result: "passed" });
    assertions.push({ id: "new_browser_exact_user_recovery", result: "passed" });

    const recoverySessionId = required(
      databaseQuery(
        databaseContainer,
        `select id::text from public.wcv_c2_trusted_repair_sessions
         where user_id='${userA.userId}'::uuid order by updated_at desc limit 1;`,
      ),
      "bodyless recovery session id",
      UUID_PATTERN,
    );
    await stopNext(server);
    server = await startNext({ ...nextInput, enabled: true });
    runBrowserSuite({
      baseUrl: server.baseUrl,
      userA,
      userB,
      browserEvidencePath,
      recoverySessionId,
    });
    assertions.push({ id: "next_process_restart_recovery", result: "passed" });
    await stopNext(server);
    server = null;

    stopStack(root, false);
    assertNoDockerResources("first fresh runtime cleanup");
    fs.rmSync(root, { recursive: true, force: true });

    prepareRuntimeWorkdir(root);
    supabase(
      [
        "start",
        "--workdir",
        root,
        "--exclude",
        EXCLUDED_SERVICES.join(","),
        "--output",
        "json",
        "--yes",
      ],
      { label: "second fresh isolated local Supabase startup" },
    );
    const secondDatabaseContainer = matchingDockerResources("container")
      .find((name) => name.startsWith("supabase_db_"));
    if (!secondDatabaseContainer) throw new Error("second fresh database container is missing");
    verifyMigrationsApplied(secondDatabaseContainer);
    verifyDatabaseSecurityContract(secondDatabaseContainer);
    if (
      databaseQuery(
        secondDatabaseContainer,
        "select count(*) from public.wcv_c2_trusted_repair_sessions;",
      ) !== "0"
    ) {
      throw new Error("second fresh database was not empty");
    }
    assertions.push({ id: "second_fresh_empty_state_migrations", result: "passed" });
  } catch (error) {
    runtimeError = error;
  } finally {
    try {
      await stopNext(server);
      stopStack(root, true);
      cleanupResult = assertNoDockerResources("post-run cleanup");
      fs.rmSync(root, { recursive: true, force: true });
    } catch (cleanupError) {
      runtimeError = cleanupError;
    }
  }

  if (runtimeError) throw runtimeError;
  verifyExactHead(headSha);
  assertions.push({ id: "complete_no_backup_cleanup", result: "passed" });
  assertions.push({ id: "exact_head_unchanged", result: "passed" });

  const evidence = {
    schemaVersion: "wcv_c2_trusted_repair_runtime_evidence.v2",
    phase: "complete_trusted_repair_vertical",
    headSha,
    runId,
    runAttempt,
    cliVersion,
    databaseImage,
    migrations,
    assertions,
    browser: browserEvidence,
    counts: {
      authenticatedUsers: 2,
      syntheticSubjects: 3,
      freshDatabaseApplications: 2,
      inputModes: 5,
      repairPaths: 6,
      continuationCommands: 3,
    },
    leakCounts,
    cleanup: {
      result: "passed",
      containersRemaining: cleanupResult.containers.length,
      volumesRemaining: cleanupResult.volumes.length,
      networksRemaining: cleanupResult.networks.length,
      backupRetained: false,
    },
    remoteSupabaseUsed: false,
    repositorySecretsUsed: false,
    fixtureBodiesIncluded: false,
    learnerBodiesIncluded: false,
    screenshotsIncluded: false,
    tracesIncluded: false,
    liveProvidersUsed: false,
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.rmSync(browserEvidencePath, { force: true });
  process.stdout.write("wcv-c2-complete-trusted-repair-runtime: pass\n");
}

async function main() {
  const root = runtimeRoot();
  if (cleanupOnly) {
    if (!fs.existsSync(path.join(root, "supabase/config.toml"))) {
      prepareRuntimeWorkdir(root);
    }
    cleanup(root, requireCompleteCleanup);
    process.stdout.write("wcv-c2-local-stack-cleanup: pass\n");
    return;
  }
  await runFinalRuntime();
}

main().catch((error) => {
  process.stderr.write(`wcv-c2-runtime-verification: ${error.message}\n`);
  process.exitCode = 1;
});
