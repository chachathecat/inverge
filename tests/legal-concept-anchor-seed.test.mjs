import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  runLegalConceptAnchorSeed,
  selectLegalAnchorChunk,
} from "../scripts/legal/seed-legal-concept-anchors.ts";

const seedPath = "reference_corpus/legal/appraiser/legal_concept_anchor_seed.json";
const scriptPath = "scripts/legal/seed-legal-concept-anchors.ts";
const docsPath = "docs/inverge-legal-concept-anchors.md";
const packagePath = "package.json";
const testRunnerPath = "scripts/run-node-tests.mjs";

const requiredConceptKeys = [
  "civil_invalid_cancel",
  "civil_agency",
  "compensation_project_approval",
  "compensation_expropriation_ruling",
  "appraisal_business_scope",
];

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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assertNoForbiddenFields(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenFields(child, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `${path}.${key} must not appear in legal concept anchor seed`);
    assertNoForbiddenFields(child, `${path}.${key}`);
  }
}

test("legal concept anchor seed exists with at least 50 metadata-only concept nodes", async () => {
  assert.equal(existsSync(seedPath), true);
  const seed = await readJson(seedPath);

  assert.equal(Array.isArray(seed), true);
  assert.equal(seed.length >= 50, true);

  const keys = new Set(seed.map((item) => item.conceptKey));
  for (const requiredKey of requiredConceptKeys) {
    assert.equal(keys.has(requiredKey), true, `${requiredKey} must be seeded`);
  }

  assertNoForbiddenFields(seed);
});

test("every legal concept anchor seed item has required anchor hint metadata", async () => {
  const seed = await readJson(seedPath);

  for (const item of seed) {
    assert.equal(typeof item.conceptKey, "string");
    assert.match(item.conceptKey, /^[a-z0-9_]+$/);
    assert.match(item.examMode, /^(first|second|both)$/);
    assert.equal(typeof item.examSubject, "string");
    assert.equal(typeof item.unit, "string");
    assert.equal(typeof item.label, "string");
    assert.equal(typeof item.description, "string");
    assert.equal(item.sourceStatus, "draft");
    assert.equal(item.needsOfficialVerification, true);
    assert.equal(item.lastReviewedAt, null);
    assert.equal(item.safeUse, "legal_concept_anchor_seed");
    assert.equal(Array.isArray(item.anchorHints), true);
    assert.equal(item.anchorHints.length > 0, true, `${item.conceptKey} must have at least one anchorHint`);

    for (const hint of item.anchorHints) {
      assert.equal(typeof hint.lawTitle, "string");
      assert.equal(hint.lawTitle.trim().length > 0, true);
      assert.equal(typeof hint.articleNo, "string");
      assert.match(hint.articleNo, /^제\d+조(?:의\d+)?$/);
      assert.match(
        hint.anchorType,
        /^(primary_source|supporting_source|exception_source|definition_source|procedure_source)$/,
      );
      assert.equal(typeof hint.anchorRole, "string");
      assert.equal(hint.anchorRole.trim().length > 0, true);
    }
  }
});

test("dry-run legal concept anchor seed script does not require Supabase service role", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";

  try {
    const summary = await runLegalConceptAnchorSeed({ dryRun: true });

    assert.equal(summary.dryRun, true);
    assert.equal(summary.conceptCount >= 50, true);
    assert.equal(summary.upsertedConceptCount, 0);
    assert.equal(summary.upsertedAnchorCount, 0);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }
  }
});

test("legal concept anchor matching heuristic prefers titled article chunks over heading-only chunks", () => {
  const resolution = selectLegalAnchorChunk("제20조", [
    {
      id: "heading-only",
      article_no: "제20조",
      article_title: null,
      body_text: "제20조 사업인정",
    },
    {
      id: "titled-substantive",
      article_no: "제20조",
      article_title: "사업인정",
      body_text:
        "제20조(사업인정) 이 조문은 사업인정 절차와 관련된 공식 법령 본문 후보를 대표하는 합성 테스트 문장입니다.",
    },
  ]);

  assert.equal(resolution.status, "matched");
  assert.equal(resolution.chunk.id, "titled-substantive");
});

test("legal concept anchor seed docs preserve grounding and human review boundaries", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = await readFile(docsPath, "utf8");
  const lowerDocs = docs.toLowerCase();

  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /source anchors, not official model answers/);
  assert.match(docs, /Human verification is required before production-grade legal explanations/);
  assert.match(docs, /Learner raw input must remain separate from the legal corpus/);
  assert.match(docs, /Q-Net\/local official materials are out of scope/);
});

test("legal concept anchor seed script is local operator-only and resolves current legal versions", async () => {
  const source = await readFile(scriptPath, "utf8");

  assert.match(source, /LEGAL_CONCEPT_ANCHOR_DRY_RUN/);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /legal_versions!inner\(is_current\)/);
  assert.match(source, /onConflict: "concept_key"/);
  assert.match(source, /onConflict: "concept_node_id,article_chunk_id,anchor_type"/);
  assert.doesNotMatch(source, /console\.(log|info|warn|error)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
});

test("legal concept anchor seed package script and default node test runner are wired", async () => {
  const packageJson = await readJson(packagePath);
  const runner = await readFile(testRunnerPath, "utf8");

  assert.equal(packageJson.scripts["seed:legal-concept-anchors"], "tsx scripts/legal/seed-legal-concept-anchors.ts");
  assert.match(runner, /tests\/legal-concept-anchor-seed\.test\.mjs/);
});
