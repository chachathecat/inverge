import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { evaluateLegalGroundingGuard } from "../lib/legal/legal-grounded-explanation-guard.ts";

const migrationPath = "supabase/migrations/20260615_legal_grounding_guard.sql";
const helperPath = "lib/legal/legal-concept-source-anchors.ts";
const docsPath = "docs/inverge-legal-grounding-guard.md";
const testRunnerPath = "scripts/run-node-tests.mjs";

async function readText(path) {
  return readFile(path, "utf8");
}

test("legal grounding guard migration defines current-version concept anchor RPC", async () => {
  assert.equal(existsSync(migrationPath), true);
  const migration = await readText(migrationPath);

  const requiredFields = [
    "concept_key text",
    "concept_label text",
    "exam_subject text",
    "unit text",
    "concept_metadata jsonb",
    "anchor_type text",
    "anchor_confidence numeric",
    "anchor_metadata jsonb",
    "law_title text",
    "article_no text",
    "article_key text",
    "article_title text",
    "body_text text",
    "chunk_metadata jsonb",
    "source_status text",
    "needs_official_verification boolean",
  ];

  assert.match(migration, /create or replace function public\.get_legal_concept_source_anchors/);
  assert.match(migration, /concept_key_filter text default null/);
  assert.match(migration, /exam_subject_filter text default null/);
  assert.match(migration, /match_count integer default 12/);
  assert.match(migration, /language sql/);
  assert.match(migration, /stable/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path = public/);
  assert.match(migration, /from public\.legal_concept_nodes/);
  assert.match(migration, /join public\.legal_concept_anchors/);
  assert.match(migration, /join public\.legal_article_chunks/);
  assert.match(migration, /join public\.legal_versions/);
  assert.match(migration, /v\.is_current = true/);
  assert.match(migration, /grant execute on function public\.get_legal_concept_source_anchors\(text, text, integer\) to authenticated/);

  for (const field of requiredFields) {
    assert.match(migration, new RegExp(field.replace(/[()]/g, "\\$&")));
  }
});

test("legal grounding guard migration does not expose legal sync runs", async () => {
  const migration = await readText(migrationPath);

  assert.doesNotMatch(migration, /legal_sync_runs/);
});

test("legal concept source anchor helper preserves safe retrieval boundaries", async () => {
  const helper = await readText(helperPath);

  assert.match(helper, /get_legal_concept_source_anchors/);
  assert.match(helper, /createOptionalSupabaseServerClient/);
  assert.match(helper, /no_concept_source_anchor_found/);
  assert.match(helper, /normalizeLegalConceptAnchorFilter/);
  assert.doesNotMatch(helper, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|getSupabasePersistenceClient|service_role/i);
  assert.doesNotMatch(helper, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bopenai\b|generative-ai/i);
});

test("legal concept source anchor helper returns explicit no-anchor empty state", async () => {
  const helper = await readText(helperPath);

  assert.match(helper, /found: false/);
  assert.match(helper, /reason: "no_concept_source_anchor_found"/);
  assert.match(helper, /anchors: \[\]/);
  assert.match(helper, /return emptyLegalConceptSourceAnchorResult\(\)/);
  assert.match(helper, /get_legal_concept_source_anchors/);
});

test("legal grounding guard returns unsupported when no anchors or keyword candidates exist", () => {
  assert.deepEqual(evaluateLegalGroundingGuard({ conceptKey: "civil_missing", conceptAnchors: [], keywordCandidates: [] }), {
    status: "unsupported",
    canDraftLegalExplanation: false,
    needsReview: true,
    unsupported: true,
    conceptKey: "civil_missing",
    sourceCount: 0,
    candidateCount: 0,
  });
});

test("legal grounding guard returns source_candidates_only when only keyword candidates exist", () => {
  assert.deepEqual(evaluateLegalGroundingGuard({
    conceptKey: "civil_candidate",
    conceptAnchors: [],
    keywordCandidates: [{ articleKey: "000100" }],
  }), {
    status: "source_candidates_only",
    canDraftLegalExplanation: false,
    needsReview: true,
    unsupported: false,
    conceptKey: "civil_candidate",
    sourceCount: 0,
    candidateCount: 1,
  });
});

test("legal grounding guard returns grounded_draft for draft anchors and forces review", () => {
  const decision = evaluateLegalGroundingGuard({
    conceptKey: "civil_draft",
    conceptAnchors: [{ sourceStatus: "draft", needsOfficialVerification: true }],
    keywordCandidates: [],
  });

  assert.equal(decision.status, "grounded_draft");
  assert.equal(decision.canDraftLegalExplanation, false);
  assert.equal(decision.needsReview, true);
  assert.equal(decision.unsupported, false);
});

test("legal grounding guard returns grounded_verified for verified anchors", () => {
  const decision = evaluateLegalGroundingGuard({
    conceptKey: "civil_verified",
    conceptAnchors: [{ sourceStatus: "verified", needsOfficialVerification: false }],
    keywordCandidates: [],
  });

  assert.equal(decision.status, "grounded_verified");
  assert.equal(decision.canDraftLegalExplanation, true);
  assert.equal(decision.needsReview, false);
  assert.equal(decision.unsupported, false);
});

test("legal grounding guard does not treat needsOfficialVerification=true as production-ready", () => {
  const decision = evaluateLegalGroundingGuard({
    conceptKey: "civil_review_required",
    conceptAnchors: [{ sourceStatus: "verified", needsOfficialVerification: true }],
    keywordCandidates: [],
  });

  assert.equal(decision.status, "grounded_draft");
  assert.equal(decision.canDraftLegalExplanation, false);
  assert.equal(decision.needsReview, true);
});

test("legal grounding guard forces review when draft and verified anchors are mixed", () => {
  const decision = evaluateLegalGroundingGuard({
    conceptKey: "civil_mixed",
    conceptAnchors: [
      { sourceStatus: "verified", needsOfficialVerification: false },
      { sourceStatus: "draft", needsOfficialVerification: true },
    ],
    keywordCandidates: [],
  });

  assert.equal(decision.status, "grounded_draft");
  assert.equal(decision.canDraftLegalExplanation, false);
  assert.equal(decision.needsReview, true);
});

test("legal grounding guard forces review for unknown source status", () => {
  const decision = evaluateLegalGroundingGuard({
    conceptKey: "civil_unknown",
    conceptAnchors: [{ sourceStatus: "deprecated", needsOfficialVerification: false }],
    keywordCandidates: [],
  });

  assert.equal(decision.status, "grounded_draft");
  assert.equal(decision.canDraftLegalExplanation, false);
  assert.equal(decision.needsReview, true);
});

test("legal grounding guard docs preserve legal source and review boundaries", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = await readText(docsPath);
  const lowerDocs = docs.toLowerCase();

  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /source anchors, not official model answers/);
  assert.match(docs, /Human verification is required before production-grade legal explanations|human review/);
  assert.match(docs, /Keyword retrieval candidates are not enough for production-grade legal explanation/);
  assert.match(docs, /Learner raw input remains separate/);
  assert.match(docs, /Q-Net\/local official materials are out of scope/);
  assert.match(docs, /Capture\/Concept Detection -> Concept Anchors -> Guard -> Explanation Draft/);
});

test("legal grounding guard change does not touch learner UI or instructor grading files", () => {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);

  const changedPaths = result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);

  const forbidden = changedPaths.filter(
    (changedPath) =>
      changedPath.startsWith("app/") ||
      changedPath.startsWith("components/") ||
      changedPath.startsWith("app\\") ||
      changedPath.startsWith("components\\") ||
      changedPath.includes("instructor/second-grading") ||
      changedPath.includes("instructor\\second-grading"),
  );

  assert.deepEqual(forbidden, []);
});

test("legal grounding guard test is wired into the default node runner", async () => {
  const runner = await readText(testRunnerPath);

  assert.match(runner, /tests\/legal-grounding-guard\.test\.mjs/);
});
