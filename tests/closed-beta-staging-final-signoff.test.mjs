import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const signoffPath = "docs/qa/closed-beta-staging-final-signoff.md";

function readSignoff() {
  assert.equal(existsSync(signoffPath), true, `${signoffPath} should exist`);
  return readFileSync(signoffPath, "utf8");
}

function assertIncludesAll(source, required, label) {
  for (const expected of required) {
    assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
  }
}

test("closed-beta staging final sign-off document exists and records staging-only status", () => {
  const signoff = readSignoff();

  assertIncludesAll(signoff, [
    "STAGING CLOSED-BETA READY WITH PRODUCTION BLOCKED",
    "This is not production rollout approval.",
    "Production rollout remains not approved.",
  ], signoffPath);
});

test("closed-beta staging final sign-off covers PRs and required command evidence", () => {
  const signoff = readSignoff();

  assertIncludesAll(signoff, [
    "#331",
    "#332",
    "#333",
    "#334",
    "#335",
    "#345",
    "npm run build",
    "npm run verify:learner-loop:ci",
    "npm run check:closed-beta-readiness",
    "npm run check:taxonomy",
    "npm run lint",
    "npm run check:durable-today-plan-rollout",
    "521 tests",
    "521 pass",
    "passed_durable_today_plan_rollout_readiness",
  ], signoffPath);
});

test("closed-beta staging final sign-off documents staging flags, production-off flags, and rollback flags", () => {
  const signoff = readSignoff();

  assertIncludesAll(signoff, [
    "PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase",
    "PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1",
    "PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1",
    "PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0",
    "PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0",
    "or unset",
    "Rollback is flag-only",
  ], signoffPath);
});

test("closed-beta staging final sign-off includes manual QA routes", () => {
  const signoff = readSignoff();

  assertIncludesAll(signoff, [
    "/",
    "/login",
    "/exams",
    "/app?mode=first",
    "/app?mode=second",
    "/app/capture?mode=first",
    "/app/capture?mode=second",
    "/app/session?mode=first",
    "/app/review?mode=first",
    "/app/first/ox",
    "/app/write?mode=second",
    "/app/calculator?mode=first&context=accounting&focus=accounting_template",
    "/app/calculator?mode=second&context=practice&focus=casio",
    "/instructor/second-grading",
    "/admin",
    "/studio",
  ], signoffPath);
});

test("closed-beta staging final sign-off enforces visible action, data-boundary, and restricted-route guardrails", () => {
  const signoff = readSignoff();

  assertIncludesAll(signoff, [
    "Today Plan visible primary tasks must be max 3",
    "Secondary actions are collapsed or labeled as “다른 작업” / “입력 방식”",
    "No raw OCR/problem/answer/source/copyright/official/model/score/instructor fields",
    "Restricted routes must be blocked for normal learner",
    "No raw text leak",
    "No service role key is used for learner runtime QA",
    "PR #345 reduces mobile capture friction",
    "Text-first capture is the primary closed-beta path",
    "OCR/PDF remains draft/fallback",
    "Low-confidence OCR requires confirmation before practice",
  ], signoffPath);
});
