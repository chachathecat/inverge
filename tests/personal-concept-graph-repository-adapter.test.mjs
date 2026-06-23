import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getPersonalConceptGraphRepositoryAdapter,
  getPersonalConceptGraphRepositoryMode,
} from "../lib/review-os/personal-concept-graph-repository-adapter.ts";

test("Personal Concept Graph repository adapter defaults to memory mode when env is missing", () => {
  assert.equal(getPersonalConceptGraphRepositoryMode({}), "memory");
  assert.equal(getPersonalConceptGraphRepositoryAdapter({}).mode, "memory");
});

test("Personal Concept Graph repository adapter activates Supabase only with explicit env flag", () => {
  assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }), "supabase");
  assert.equal(getPersonalConceptGraphRepositoryAdapter({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }).mode, "supabase");
  assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "true" }), "memory");
  assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "SUPABASE" }), "memory");
});

test("memory adapter keeps existing in-memory repository as the default implementation", () => {
  const adapter = getPersonalConceptGraphRepositoryAdapter({});
  assert.equal(adapter.mode, "memory");
  assert.equal(adapter.upsertPersonalConceptNode.constructor.name, "Function");
  assert.equal(adapter.transitionPersonalConceptNode.constructor.name, "Function");
  assert.equal(adapter.deletePersonalConceptNode, undefined);
});

test("Supabase adapter exposes only the RPC write boundary", () => {
  const adapter = getPersonalConceptGraphRepositoryAdapter({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" });
  assert.equal(adapter.mode, "supabase");
  assert.equal("upsertPersonalConceptNode" in adapter, false);
  assert.equal(adapter.transitionPersonalConceptNode.constructor.name, "AsyncFunction");
  assert.equal(adapter.deletePersonalConceptNode.constructor.name, "AsyncFunction");
});

test("adapter source documents the explicit feature flag and lazy Supabase selection", async () => {
  const source = await readFile(new URL("../lib/review-os/personal-concept-graph-repository-adapter.ts", import.meta.url), "utf8");
  assert.match(source, /PERSONAL_CONCEPT_GRAPH_REPOSITORY\s*===\s*"supabase"/);
  assert.match(source, /return import\("\.\/personal-concept-graph-supabase-repository"\)/);
  assert.match(source, /transitionPersonalConceptNodeInSupabase/);
  assert.doesNotMatch(source, /upsertPersonalConceptNodeToSupabase/);
  assert.doesNotMatch(source, /process\.env\.PERSONAL_CONCEPT_GRAPH_REPOSITORY\s*!==\s*"memory"/);
});
