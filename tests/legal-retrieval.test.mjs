import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { requireLegalSourceAnchors } from "../lib/legal/legal-grounding-policy.ts";

const migrationPath = "supabase/migrations/20260615_legal_retrieval.sql";
const docsPath = "docs/inverge-legal-retrieval.md";
const retrievalHelperPath = "lib/legal/legal-retrieval.ts";
const groundingPolicyPath = "lib/legal/legal-grounding-policy.ts";
const testRunnerPath = "scripts/run-node-tests.mjs";

async function readText(path) {
  return readFile(path, "utf8");
}

test("legal retrieval migration defines authenticated keyword RPC with required return fields", async () => {
  assert.equal(existsSync(migrationPath), true);

  const migration = await readText(migrationPath);
  const requiredFields = [
    "id uuid",
    "source_id uuid",
    "version_id uuid",
    "law_title text",
    "article_no text",
    "article_key text",
    "article_title text",
    "body_text text",
    "metadata jsonb",
    "rank_score double precision",
  ];

  assert.match(migration, /create or replace function public\.search_legal_chunks_keyword/);
  assert.match(migration, /query_text text/);
  assert.match(migration, /law_title_filter text default null/);
  assert.match(migration, /match_count integer default 8/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /v\.is_current = true/);
  assert.match(migration, /grant execute on function public\.search_legal_chunks_keyword\(text, text, integer\) to authenticated/);
  assert.match(migration, /revoke all on function public\.search_legal_chunks_keyword\(text, text, integer\) from anon/);

  for (const field of requiredFields) {
    assert.match(migration, new RegExp(field.replace(/[()]/g, "\\$&")));
  }
});

test("legal retrieval docs preserve no-source no-claim and corpus separation boundaries", async () => {
  assert.equal(existsSync(docsPath), true);

  const docs = await readText(docsPath);
  const lowerDocs = docs.toLowerCase();

  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /source anchors, not official model answers/);
  assert.match(docs, /Legal retrieval is a precondition/);
  assert.match(docs, /Learner raw input remains separate from the legal corpus/);
  assert.match(docs, /raw user OCR text/);
  assert.match(docs, /raw learner answers or problem text/);
  assert.match(docs, /Vector retrieval can be added later/);
});

test("grounding policy blocks legal claims without source anchors", () => {
  assert.deepEqual(requireLegalSourceAnchors([]), {
    grounded: false,
    needsReview: false,
    unsupported: true,
    sourceCount: 0,
  });

  assert.deepEqual(requireLegalSourceAnchors(null), {
    grounded: false,
    needsReview: false,
    unsupported: true,
    sourceCount: 0,
  });
});

test("grounding policy treats returned candidates as source-backed but review-required", () => {
  assert.deepEqual(requireLegalSourceAnchors([{ articleKey: "000100" }, { articleKey: "000200" }]), {
    grounded: true,
    needsReview: true,
    unsupported: false,
    sourceCount: 2,
  });
});

test("retrieval layer does not expose sync runs, service keys, or external calls", async () => {
  const migration = await readText(migrationPath);
  const retrievalHelper = await readText(retrievalHelperPath);
  const groundingPolicy = await readText(groundingPolicyPath);
  const combined = `${migration}\n${retrievalHelper}\n${groundingPolicy}`;

  assert.doesNotMatch(combined, /legal_sync_runs/);
  assert.doesNotMatch(retrievalHelper, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|getSupabasePersistenceClient|service_role/i);
  assert.doesNotMatch(retrievalHelper, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bopenai\b|generative-ai/i);
});

test("retrieval helper returns explicit no-source-anchor empty state", async () => {
  const source = await readText(retrievalHelperPath);

  assert.match(source, /grounded: false/);
  assert.match(source, /reason: "no_source_anchor_found"/);
  assert.match(source, /candidates: \[\]/);
  assert.match(source, /search_legal_chunks_keyword/);
  assert.match(source, /normalizeLegalRetrievalQuery/);
});

test("default node test runner includes legal retrieval tests", async () => {
  const runner = await readText(testRunnerPath);

  assert.match(runner, /tests\/legal-retrieval\.test\.mjs/);
});
