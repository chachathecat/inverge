import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const migrationPath = "supabase/migrations/20260616_legal_grounding_guard_service_role_grant.sql";
const examplePath = "reference_corpus/legal/appraiser/legal_anchor_verification_decisions.example.json";
const scriptPath = "scripts/legal/apply-legal-anchor-verification.ts";
const docsPath = "docs/inverge-legal-anchor-verification-apply.md";
const packagePath = "package.json";
const testRunnerPath = "scripts/run-node-tests.mjs";

const forbiddenFields = new Set([
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "rawQuestionText",
  "userAnswer",
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "score",
  "passFail",
]);

async function readText(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function walkForbidden(value, file = "root") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => walkForbidden(child, `${file}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `${file}.${key} must not appear in example verification decisions`);
    walkForbidden(child, `${file}.${key}`);
  }
}

test("legal anchor verification apply migration grants execute to service_role only", async () => {
  assert.equal(existsSync(migrationPath), true);
  const migration = await readText(migrationPath);

  assert.match(migration, /grant execute on function public\.get_legal_concept_source_anchors\(text, text, integer\) to service_role/);
});

test("legal anchor verification apply migration does not grant function execute to anon or public", async () => {
  const migration = await readText(migrationPath);

  assert.doesNotMatch(
    migration,
    /grant execute on function public\.get_legal_concept_source_anchors\(text, text, integer\) to anon|grant execute on function public\.get_legal_concept_source_anchors\(text, text, integer\) to public/,
  );
});

test("legal anchor verification decisions example file exists", async () => {
  assert.equal(existsSync(examplePath), true);
  const example = await readJson(examplePath);

  assert.equal(Array.isArray(example), true);
  assert.equal(example.length >= 4, true);

  walkForbidden(example);
});

test("legal anchor verification apply script exists and validates required fields", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /LEGAL_ANCHOR_VERIFICATION_DECISIONS_PATH/);
  assert.match(script, /LEGAL_ANCHOR_VERIFICATION_DRY_RUN/);
  assert.match(script, /readFile/);
  assert.match(script, /parseDecisionItem/);
  assert.match(script, /verified requires reviewer and reviewedAt/);
  assert.match(script, /missing conceptKey/);
  assert.match(script, /missing articleKey/);
});

test("legal anchor verification apply script refuses verified decision without reviewer/reviewedAt", async () => {
  const script = await readText(scriptPath);

  assert.match(
    script,
    /if \(decision === "verified" && \(!reviewer \|\| !reviewedAt\)\) \{\s*throw new Error\(`legal anchor verification decision #\$\{index\} verified requires reviewer and reviewedAt`\);\s*\}/,
  );
});

test("legal anchor verification apply script is dry-run safe and does not delete anchors", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /dryRun/);
  assert.match(script, /dry-run summary only/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /DELETE\s+FROM/i);
});

test("legal anchor verification apply script does not mutate unrelated legal tables", async () => {
  const script = await readText(scriptPath);

  assert.doesNotMatch(script, /\.update\([^\)]*legal_article_chunks[^\)]*\)/);
  assert.doesNotMatch(script, /\.update\([^\)]*legal_versions[^\)]*\)/);
  assert.doesNotMatch(script, /\.update\([^\)]*legal_sources[^\)]*\)/);
  assert.doesNotMatch(script, /\.update\([^\)]*legal_sync_runs[^\)]*\)/);
});

test("legal anchor verification apply script updates legal_concept_anchors metadata and confidence only", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /from\("legal_concept_anchors"\)/);
  assert.match(script, /metadata: nextMetadata/);
  assert.match(script, /confidence/);
});

test("legal anchor verification apply script does not log service role secret", async () => {
  const script = await readText(scriptPath);

  assert.doesNotMatch(script, /console\.(log|info|warn|error)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(script, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("legal anchor verification apply docs define human-reviewed-only policy", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = await readText(docsPath);
  const lowerDocs = docs.toLowerCase();

  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /does not auto-verify/);
  assert.match(lowerDocs, /human-reviewed/);
  assert.match(docs, /requires human review metadata|verified requires/i);
  assert.match(docs, /no service key|service role key|SUPABASE_SERVICE_ROLE_KEY|supabase.*service role/i);
  assert.match(docs, /raw learner answers|raw problem text/);
  assert.match(docs, /Q-Net\/local official materials are out of scope/i);
});

test("legal anchor verification apply package script and runner are wired", async () => {
  const packageJson = await readJson(packagePath);
  const runner = await readText(testRunnerPath);

  assert.equal(packageJson.scripts["apply:legal-anchor-verification"], "tsx scripts/legal/apply-legal-anchor-verification.ts");
  assert.match(runner, /tests\/legal-anchor-verification-apply\.test\.mjs/);
});
