import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = new URL("../scripts/verify-personal-concept-graph-durable-read.mjs", import.meta.url);
const scriptFile = scriptPath.pathname;

function runScript(env = {}) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", scriptFile],
    {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_OPTIONS: process.env.NODE_OPTIONS,
        ...env,
      },
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

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /refused_missing_personal_concept_graph_durable_read_smoke_flag/);
  assert.match(result.stdout, /PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE=1/);
});

test("durable read runtime smoke refuses to run unless repository mode is Supabase", () => {
  const result = runScript({ PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE: "1", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /refused_missing_supabase_repository_mode/);
  assert.match(result.stdout, /PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase/);
});

test("durable read runtime smoke refuses to run unless durable reads flag is enabled", () => {
  const result = runScript({ PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE: "1", PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /refused_missing_personal_concept_graph_durable_reads_flag/);
  assert.match(result.stdout, /PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1/);
});

test("durable read runtime smoke source contains no hardcoded token, key, or password", async () => {
  const source = await readFile(scriptPath, "utf8");

  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /sbp_[A-Za-z0-9_\-]{20,}/i);
  assert.doesNotMatch(source, /service[_-]?role\s*[:=]\s*["'`][^"'`]{12,}["'`]/i);
  assert.doesNotMatch(source, /(?:password|passwd|pwd)\s*[:=]\s*["'`][^"'`]{8,}["'`]/i);
  assert.doesNotMatch(source, /(?:access[_-]?token|anon[_-]?key|api[_-]?key)\s*[:=]\s*["'`][A-Za-z0-9._\-]{12,}["'`]/i);
});

test("durable read runtime smoke source rejects forbidden raw fields", async () => {
  const source = await readFile(scriptPath, "utf8");

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
  const source = await readFile(scriptPath, "utf8");

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
  const source = await readFile(scriptPath, "utf8");

  assert.match(source, /async function cleanupBothUsers/);
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /cleanup\(userA, idsA\)/);
  assert.match(source, /cleanup\(userB, \[idB\]\)/);
  assert.doesNotMatch(source, /cleanup\(userA, idsA\)\.then\(\(\) => cleanup\(userB, \[idB\]\)\)/);
  assert.match(source, /cleanup_failed_after_attempting_both_users/);
});

test("no live app route imports durable read helper without explicit durable read or product gate", async () => {
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const files = await collectSourceFiles(join(root, "app"), root);
  const matches = [];

  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (
      /maybeBuildTodayPlanActionsFromDurableConceptGraph|listPersonalConceptNodesForTodayFromSupabase|personal_concept_nodes/.test(source) &&
      !/PERSONAL_CONCEPT_GRAPH_DURABLE_READS|explicitProductGate|durableReadProductGate/.test(source)
    ) {
      matches.push(file);
    }
  }

  assert.deepEqual(matches, []);
});