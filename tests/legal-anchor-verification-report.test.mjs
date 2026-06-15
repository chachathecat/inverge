import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const scriptPath = "scripts/legal/export-legal-anchor-verification-report.ts";
const docsPath = "docs/inverge-legal-anchor-verification-report.md";
const gitignorePath = ".gitignore";
const packagePath = "package.json";
const testRunnerPath = "scripts/run-node-tests.mjs";

async function readText(path) {
  return readFile(path, "utf8");
}

test("legal anchor verification report script exists", () => {
  assert.equal(existsSync(scriptPath), true);
});

test("legal anchor verification report script is read-only against Supabase", async () => {
  const script = await readText(scriptPath);

  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});

test("legal anchor verification report script uses concept source anchor RPC", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /rpc\("get_legal_concept_source_anchors"/);
  assert.match(script, /concept_key_filter: null/);
  assert.match(script, /exam_subject_filter: null/);
  assert.match(script, /match_count: matchCount/);
});

test("legal anchor verification report script does not expose service role key in output strings", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(script, /console\.(log|info|warn|error)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(script, /new Error\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
});

test("legal anchor verification report script writes csv markdown and summary json files", async () => {
  const script = await readText(scriptPath);

  assert.match(script, /legal-anchor-verification-report\.csv/);
  assert.match(script, /legal-anchor-verification-report\.md/);
  assert.match(script, /legal-anchor-verification-summary\.json/);
  assert.match(script, /\.data", "legal-anchor-verification"/);
  assert.match(script, /LEGAL_ANCHOR_REPORT_DIR/);
  assert.match(script, /LEGAL_ANCHOR_REPORT_LIMIT/);
});

test("legal anchor verification report includes required csv columns and risk flags", async () => {
  const script = await readText(scriptPath);
  const columns = [
    "conceptKey",
    "conceptLabel",
    "examSubject",
    "unit",
    "lawTitle",
    "articleNo",
    "articleKey",
    "articleTitle",
    "anchorType",
    "anchorRole",
    "confidence",
    "sourceStatus",
    "needsOfficialVerification",
    "preview",
    "riskFlags",
    "verificationDecision",
    "reviewerNotes",
  ];
  const riskFlags = [
    "draft_needs_review",
    "missing_article_title",
    "heading_like_chunk",
    "short_body_text",
    "broad_concept_single_anchor",
    "low_confidence",
    "keyword_candidate_only",
  ];

  for (const column of columns) {
    assert.match(script, new RegExp(`"${column}"`));
  }

  for (const riskFlag of riskFlags) {
    assert.match(script, new RegExp(`"${riskFlag}"`));
  }
});

test("generated legal anchor verification output directory is gitignored", async () => {
  const gitignore = await readText(gitignorePath);

  assert.match(gitignore, /\/\.data\/legal-anchor-verification\//);
});

test("legal anchor verification report docs preserve source and review boundaries", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = await readText(docsPath);
  const lowerDocs = docs.toLowerCase();

  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /Draft anchors are not production-ready/);
  assert.match(docs, /Source anchors are not official model answers/);
  assert.match(docs, /Do not commit generated reports/);
  assert.match(docs, /Q-Net\/local official materials are out of scope/);
  assert.match(docs, /Legal Anchor Verification Apply v1/);
});

test("package exposes legal anchor verification export command", async () => {
  const packageJson = JSON.parse(await readText(packagePath));

  assert.equal(
    packageJson.scripts["export:legal-anchor-verification-report"],
    "tsx scripts/legal/export-legal-anchor-verification-report.ts",
  );
});

test("legal anchor verification report test is wired into the default node runner", async () => {
  const runner = await readText(testRunnerPath);

  assert.match(runner, /tests\/legal-anchor-verification-report\.test\.mjs/);
});
