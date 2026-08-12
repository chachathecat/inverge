#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const SOURCE_WORKDIR = path.join(
  REPOSITORY_ROOT,
  "tests/runtime/wcv-c2-supabase",
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
    env: commandEnvironment(),
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
  const migrationDirectory = path.join(SOURCE_WORKDIR, "supabase/migrations");
  return fs.readdirSync(migrationDirectory)
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .sort()
    .map((name) => ({
      identity: name.replace(/\.sql$/, ""),
      sha256: sha256(fs.readFileSync(path.join(migrationDirectory, name))),
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
  const result = await apiRequest(apiUrl, anonKey, "/auth/v1/signup", {
    method: "POST",
    body: {
      email: `wcv-c2-${suffix}-${nonce}@localhost.test`,
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
  return { userId, accessToken };
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

function verifyMigrationApplied(databaseContainer) {
  const result = docker([
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
    "select (to_regclass('public.wcv_c2_preflight_tenant_probe') is not null)::text;",
  ]).stdout.trim();
  if (result !== "true") throw new Error("empty-state preflight migration was not applied");
}

async function runPreflight() {
  const headSha = required(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", SHA_PATTERN).toLowerCase();
  const runId = required(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const runAttempt = required(process.env.GITHUB_RUN_ATTEMPT, "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const evidencePath = path.resolve(
    process.env.WCV_C2_RUNTIME_EVIDENCE_PATH ??
      path.join(REPOSITORY_ROOT, ".agent-factory/wcv-c2-trusted-repair-runtime-evidence.json"),
  );
  const root = runtimeRoot();
  const migrations = migrationMetadata();
  if (migrations.length === 0) throw new Error("C2 preflight migration inventory is empty");
  verifyExactHead(headSha);
  verifyLocalOnlySource();
  const cliVersion = supabase(["--version"], { label: "Supabase CLI version check" })
    .stdout.trim();
  if (cliVersion !== EXPECTED_CLI_VERSION) {
    throw new Error(`Supabase CLI version ${cliVersion || "missing"} is not ${EXPECTED_CLI_VERSION}`);
  }

  prepareRuntimeWorkdir(root);
  stopStack(root, true);
  assertNoDockerResources("pre-start cleanup");
  fs.rmSync(evidencePath, { force: true });

  let databaseImage;
  let preflightError;
  let assertions = [];
  let leakCounts = { crossUserReadRows: null, crossUserDeleteRows: null };
  let cleanupResult;
  try {
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
      { label: "isolated local Supabase startup" },
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
    process.stdout.write(`::add-mask::${anonKey}\n`);

    databaseImage = activeStackIdentity();
    const databaseContainer = matchingDockerResources("container")
      .find((name) => name.startsWith("supabase_db_"));
    if (!databaseContainer) throw new Error("local database container is missing");
    verifyMigrationApplied(databaseContainer);
    assertions.push({ id: "empty_state_migration_applied", result: "passed" });
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
    if (!Array.isArray(sameUserInsert.body) || sameUserInsert.body.length !== 1) {
      throw new Error("same-user RLS insert returned an invalid shape");
    }
    assertions.push({ id: "same_user_operation_permitted", result: "passed" });

    const crossUserRead = await apiRequest(
      apiUrl,
      anonKey,
      `/rest/v1/wcv_c2_preflight_tenant_probe?select=id&user_id=eq.${userA.userId}`,
      { accessToken: userB.accessToken, label: "cross-user RLS read" },
    );
    expectStatus(crossUserRead, [200], "cross-user RLS read");
    if (!Array.isArray(crossUserRead.body)) {
      throw new Error("cross-user RLS read returned an invalid shape");
    }
    leakCounts.crossUserReadRows = crossUserRead.body.length;
    if (leakCounts.crossUserReadRows !== 0) throw new Error("cross-user RLS read leaked rows");

    const crossUserWrite = await apiRequest(
      apiUrl,
      anonKey,
      "/rest/v1/wcv_c2_preflight_tenant_probe",
      {
        method: "POST",
        accessToken: userB.accessToken,
        prefer: "return=minimal",
        body: { user_id: userA.userId, assertion: "same_user_permitted" },
        label: "cross-user RLS write",
      },
    );
    expectStatus(crossUserWrite, [401, 403], "cross-user RLS write");

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
    if (!Array.isArray(crossUserDelete.body)) {
      throw new Error("cross-user RLS delete returned an invalid shape");
    }
    leakCounts.crossUserDeleteRows = crossUserDelete.body.length;
    if (leakCounts.crossUserDeleteRows !== 0) throw new Error("cross-user RLS delete affected rows");
    assertions.push({ id: "cross_user_rls_denial", result: "passed" });
  } catch (error) {
    preflightError = error;
  } finally {
    try {
      stopStack(root, false);
      cleanupResult = assertNoDockerResources("post-run cleanup");
      fs.rmSync(root, { recursive: true, force: true });
    } catch (cleanupError) {
      preflightError = cleanupError;
    }
  }

  if (preflightError) throw preflightError;
  verifyExactHead(headSha);
  assertions.push({ id: "complete_no_backup_cleanup", result: "passed" });
  assertions.push({ id: "exact_head_unchanged", result: "passed" });

  const evidence = {
    schemaVersion: "wcv_c2_trusted_repair_runtime_evidence.v1",
    phase: "infrastructure_preflight",
    headSha,
    runId,
    runAttempt,
    cliVersion,
    databaseImage,
    migrations,
    assertions,
    counts: {
      authenticatedUsers: 2,
      syntheticSubjects: 0,
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
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  process.stdout.write("wcv-c2-infrastructure-preflight: pass\n");
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
  await runPreflight();
}

main().catch((error) => {
  process.stderr.write(`wcv-c2-runtime-verification: ${error.message}\n`);
  process.exitCode = 1;
});
