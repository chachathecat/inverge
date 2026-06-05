import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = new URL("../scripts/verify-personal-concept-graph-rls.mjs", import.meta.url);
const docPath = new URL("../docs/qa/personal-concept-graph-runtime-rls-smoke.md", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const scriptFile = fileURLToPath(scriptPath);

function resultOutput(result) {
  return `${result.stdout ?? ""}
${result.stderr ?? ""}`;
}

function assertNoSpawnError(result) {
  assert.equal(result.error, undefined, result.error ? `spawn failed: ${result.error.message}` : undefined);
}

test("runtime RLS smoke script and QA doc exist", () => {
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(docPath), true);
});

test("runtime RLS smoke script requires explicit PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1 flag", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /PERSONAL_CONCEPT_GRAPH_RLS_SMOKE/);
  assert.match(source, /process\.env\[SMOKE_FLAG\]\s*!==\s*"1"/);

  const result = spawnSync(process.execPath, [scriptFile], {
    cwd: repoRoot,
    env: cleanSmokeEnv({}),
    encoding: "utf8",
  });

  assertNoSpawnError(result);
  const output = resultOutput(result);
  assert.notEqual(result.status, 0, output);
  assert.match(output, /refused_missing_personal_concept_graph_rls_smoke_flag/);
});

test("runtime RLS smoke script does not print or depend on service-role secrets", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /redact/);
  assert.doesNotMatch(source, /process\.env\.SUPABASE_SERVICE_ROLE_KEY|process\.env\["SUPABASE_SERVICE_ROLE_KEY"\]/);
  assert.doesNotMatch(source, /createSupabaseAdminClient|getSupabasePersistenceClient/);
});


test("runtime RLS smoke script accepts permission-denied anon read as denial", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /function isPermissionDeniedError\(error\)/);
  assert.match(source, /error\?\.code === "42501"|code === "42501"/);
  assert.match(source, /permission denied/);
  assert.match(source, /insufficient privilege/);
  assert.match(source, /expectAnonCannotReadRows\("anon_cannot_read_rows"/);
  assert.match(source, /await expectNoRows\("user_a_cannot_read_user_b_row"/);
});

test("runtime RLS smoke script does not add or recommend anon table SELECT grants", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.doesNotMatch(source, /grant\s+select\s+(?:on|to).*anon|grant\s+select.*anon/i);
});

test("runtime RLS smoke script does not reference service role key in browser or client path", async () => {
  const browserClientSource = await readFile(new URL("../lib/supabase/client.ts", import.meta.url), "utf8");
  const routeHandlerSource = await readFile(new URL("../lib/supabase/route-handler.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${browserClientSource}\n${routeHandlerSource}`, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test("runtime RLS smoke script intentionally skips missing Supabase env after static contract checks", () => {
  const result = spawnSync(process.execPath, [scriptFile], {
    cwd: repoRoot,
    env: cleanSmokeEnv({ PERSONAL_CONCEPT_GRAPH_RLS_SMOKE: "1" }),
    encoding: "utf8",
  });

  assertNoSpawnError(result);
  const output = resultOutput(result);
  assert.equal(result.status, 0, output);
  assert.match(output, /passed_static_repository_contract_probe/);
  assert.match(output, /skipped_runtime_rls_due_missing_env/);
  assert.doesNotMatch(output, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test("QA doc states production learner writes remain disabled and cross-user RLS is required", async () => {
  const doc = await readFile(docPath, "utf8");
  assert.match(doc, /Production learner writes remain disabled/);
  assert.match(doc, /cross-user RLS must be verified before enabling durable writes/);
  assert.match(doc, /skipped_runtime_rls_due_missing_env/);
  assert.match(doc, /skipped_runtime_rls_due_missing_test_auth/);
});

test("QA doc explains anon permission denied is acceptable without public grants", async () => {
  const doc = await readFile(docPath, "utf8");
  assert.match(doc, /anonymous read denial/);
  assert.match(doc, /zero rows/);
  assert.match(doc, /permission-denied|permission denied/);
  assert.match(doc, /42501/);
  assert.match(doc, /No anon `SELECT` table grant is required/);
  assert.match(doc, /Do not add public or anon table grants/);
});

test("package exposes non-default RLS smoke script and includes static test in learner-loop CI", async () => {
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(pkg.scripts["check:personal-concept-graph-rls"], "node scripts/verify-personal-concept-graph-rls.mjs");
  assert.match(pkg.scripts["verify:learner-loop:ci"], /tests\/personal-concept-graph-runtime-rls-smoke\.test\.mjs/);
});

function cleanSmokeEnv(extra) {
  const env = { ...process.env, ...extra };
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ID",
    "PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ACCESS_TOKEN",
    "PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ID",
    "PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ACCESS_TOKEN",
    "PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE",
    "VERCEL_ENV",
  ]) {
    delete env[key];
  }
  env.NODE_ENV = "test";
  return env;
}
