import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = new URL("../scripts/verify-personal-concept-graph-rls.mjs", import.meta.url);
const docPath = new URL("../docs/qa/personal-concept-graph-runtime-rls-smoke.md", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

test("runtime RLS smoke script and QA doc exist", () => {
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(docPath), true);
});

test("runtime RLS smoke script requires explicit PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1 flag", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /PERSONAL_CONCEPT_GRAPH_RLS_SMOKE/);
  assert.match(source, /process\.env\[SMOKE_FLAG\]\s*!==\s*"1"/);

  const result = spawnSync(process.execPath, [scriptPath.pathname], {
    cwd: new URL("..", import.meta.url).pathname,
    env: cleanSmokeEnv({}),
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /refused_missing_personal_concept_graph_rls_smoke_flag/);
});

test("runtime RLS smoke script does not print or depend on service-role secrets", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /redact/);
  assert.doesNotMatch(source, /process\.env\.SUPABASE_SERVICE_ROLE_KEY|process\.env\["SUPABASE_SERVICE_ROLE_KEY"\]/);
  assert.doesNotMatch(source, /createSupabaseAdminClient|getSupabasePersistenceClient/);
});

test("runtime RLS smoke script does not reference service role key in browser or client path", async () => {
  const browserClientSource = await readFile(new URL("../lib/supabase/client.ts", import.meta.url), "utf8");
  const routeHandlerSource = await readFile(new URL("../lib/supabase/route-handler.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${browserClientSource}\n${routeHandlerSource}`, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test("runtime RLS smoke script intentionally skips missing Supabase env after static contract checks", () => {
  const result = spawnSync(process.execPath, [scriptPath.pathname], {
    cwd: new URL("..", import.meta.url).pathname,
    env: cleanSmokeEnv({ PERSONAL_CONCEPT_GRAPH_RLS_SMOKE: "1" }),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /passed_static_repository_contract_probe/);
  assert.match(result.stdout, /skipped_runtime_rls_due_missing_env/);
  assert.doesNotMatch(result.stdout + result.stderr, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test("QA doc states production learner writes remain disabled and cross-user RLS is required", async () => {
  const doc = await readFile(docPath, "utf8");
  assert.match(doc, /Production learner writes remain disabled/);
  assert.match(doc, /cross-user RLS must be verified before enabling durable writes/);
  assert.match(doc, /skipped_runtime_rls_due_missing_env/);
  assert.match(doc, /skipped_runtime_rls_due_missing_test_auth/);
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
