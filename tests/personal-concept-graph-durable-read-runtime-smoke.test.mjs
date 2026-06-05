import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repoRoot, "app");
const scriptFile = fileURLToPath(new URL("../scripts/verify-personal-concept-graph-durable-read.mjs", import.meta.url));

function smokeEnv(env = {}) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_OPTIONS: process.env.NODE_OPTIONS,
    ...env,
  };
}

function resultOutput(result) {
  return `${result.stdout ?? ""}
${result.stderr ?? ""}`;
}

function assertNoSpawnError(result) {
  assert.equal(result.error, undefined, result.error ? `spawn failed: ${result.error.message}` : undefined);
}

function runScript(env = {}) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", scriptFile],
    {
      cwd: repoRoot,
      env: smokeEnv(env),
      encoding: "utf8",
    },
  );
}

async function collectSourceFiles(root, base = root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath, base)));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath.slice(base.length + 1).replaceAll("\\", "/"));
    }
  }
  return files;
}

test("durable read runtime smoke refuses to run without explicit smoke flag", () => {
  const result = runScript({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" });

  assertNoSpawnError(result);
  const output = resultOutput(result);
  assert.notEqual(result.status, 0, output);
  assert.match(output, /refused_missing_personal_concept_graph_durable_read_smoke_flag/);
  assert.match(output, /PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE=1/);
});

test("durable read runtime smoke refuses to run unless repository mode is Supabase", () => {
  const result = runScript({ PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE: "1", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" });

  assertNoSpawnError(result);
  const output = resultOutput(result);
  assert.notEqual(result.status, 0, output);
  assert.match(output, /refused_missing_supabase_repository_mode/);
  assert.match(output, /PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase/);
});

test("durable read runtime smoke refuses to run unless durable reads flag is enabled", () => {
  const result = runScript({ PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE: "1", PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" });

  assertNoSpawnError(result);
  const output = resultOutput(result);
  assert.notEqual(result.status, 0, output);
  assert.match(output, /refused_missing_personal_concept_graph_durable_reads_flag/);
  assert.match(output, /PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1/);
});

test("durable read runtime smoke source contains no hardcoded token, key, or password", async () => {
  const source = await readFile(scriptFile, "utf8");

  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /sbp_[A-Za-z0-9_\-]{20,}/i);
  assert.doesNotMatch(source, /service[_-]?role\s*[:=]\s*["'`][^"'`]{12,}["'`]/i);
  assert.doesNotMatch(source, /(?:password|passwd|pwd)\s*[:=]\s*["'`][^"'`]{8,}["'`]/i);
  assert.doesNotMatch(source, /(?:access[_-]?token|anon[_-]?key|api[_-]?key)\s*[:=]\s*["'`][A-Za-z0-9._\-]{12,}["'`]/i);
});

test("durable read runtime smoke source rejects forbidden raw fields", async () => {
  const source = await readFile(scriptFile, "utf8");

  for (const field of [
    "rawUserText",
    "rawOcrText",
    "rawAnswerText",
    "answerText",
    "problemText",
    "questionText",
    "copyrightedText",
    "sourceText",
    "officialAnswer",
    "modelAnswer",
    "scorePrediction",
    "instructorComment",
  ]) {
    assert.match(source, new RegExp(field), `missing forbidden field guard for ${field}`);
  }
  assert.match(source, /assertNoForbiddenLeak/);
});

test("durable read runtime smoke expected success JSON includes passed status", async () => {
  const source = await readFile(scriptFile, "utf8");

  assert.match(source, /passed_durable_graph_read_runtime_smoke/);
  for (const verified of [
    "explicit_flags_required",
    "supabase_repository_mode",
    "metadata_only_rows",
    "helper_returns_max_3_actions",
    "no_raw_text_leak",
    "unsupported_exam_rejection",
    "cross_user_read_denied",
    "cleanup_attempted",
  ]) {
    assert.match(source, new RegExp(verified));
  }
});

test("durable read runtime smoke cleanup attempts both users independently", async () => {
  const source = await readFile(scriptFile, "utf8");

  assert.match(source, /async function cleanupBothUsers/);
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /cleanup\(userA, idsA\)/);
  assert.match(source, /cleanup\(userB, \[idB\]\)/);
  assert.doesNotMatch(source, /cleanup\(userA, idsA\)\.then\(\(\) => cleanup\(userB, \[idB\]\)\)/);
  assert.match(source, /cleanup_failed_after_attempting_both_users/);
});

test("no live app route imports durable read helper without explicit durable read or product gate", async () => {
  const files = await collectSourceFiles(appRoot, repoRoot);
  const matches = [];

  for (const file of files) {
    const source = await readFile(join(repoRoot, file), "utf8");
    if (
      /maybeBuildTodayPlanActionsFromDurableConceptGraph|listPersonalConceptNodesForTodayFromSupabase|personal_concept_nodes/.test(source) &&
      !/PERSONAL_CONCEPT_GRAPH_DURABLE_READS|explicitProductGate|durableReadProductGate/.test(source)
    ) {
      matches.push(file);
    }
  }

  assert.deepEqual(matches, []);
});