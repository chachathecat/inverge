import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const script = "scripts/check-durable-today-plan-rollout-readiness.mjs";
const checklistPath = "docs/qa/durable-today-plan-staging-rollout-checklist.md";

function read(file) {
  return readFileSync(file, "utf8");
}

function runReadiness(env = {}) {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      ...env,
    },
  });
  return {
    ...result,
    json: JSON.parse(result.stdout),
    output: `${result.stdout}\n${result.stderr}`,
  };
}

test("production env fails if durable reads flag is on", () => {
  const result = runReadiness({ NODE_ENV: "production", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" });
  assert.equal(result.status, 1);
  assert.deepEqual(result.json, {
    status: "failed_durable_today_plan_rollout_readiness",
    reason: "production_durable_today_plan_flags_enabled",
  });
});

test("production env fails if Today Plan rollout flag is on", () => {
  const result = runReadiness({ VERCEL_ENV: "production", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1" });
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, "production_durable_today_plan_flags_enabled");
});

test("production env passes when both flags are off or unset", () => {
  const off = runReadiness({ VERCEL_ENV: "production", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "0", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "0" });
  const unset = runReadiness({ VERCEL_ENV: "production" });
  assert.equal(off.status, 0);
  assert.equal(unset.status, 0);
  assert.equal(off.json.status, "passed_durable_today_plan_rollout_readiness");
  assert.equal(unset.json.status, "passed_durable_today_plan_rollout_readiness");
});

test("preview/staging env requires explicit allow flag", () => {
  const blocked = runReadiness({
    VERCEL_ENV: "preview",
    PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
    PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
  });
  const allowed = runReadiness({
    VERCEL_ENV: "preview",
    PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
    PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
    DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING: "1",
  });

  assert.equal(blocked.status, 1);
  assert.equal(blocked.json.reason, "staging_durable_today_plan_flags_require_explicit_allow");
  assert.equal(allowed.status, 0);
  assert.equal(allowed.json.environment, "preview");
});

test("staging with both flags on requires repository=supabase", () => {
  const result = runReadiness({
    VERCEL_ENV: "preview",
    PERSONAL_CONCEPT_GRAPH_REPOSITORY: "memory",
    PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
    DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING: "1",
  });

  assert.equal(result.status, 1);
  assert.equal(result.json.reason, "repository_supabase_required_for_rollout");
});

test("partial flag combinations warn but do not enable route behavior", () => {
  const durableOnly = runReadiness({ VERCEL_ENV: "preview", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1", DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING: "1" });
  const rolloutOnly = runReadiness({ VERCEL_ENV: "preview", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1", DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING: "1" });

  assert.equal(durableOnly.status, 0);
  assert.equal(rolloutOnly.status, 0);
  assert.deepEqual(durableOnly.json.warnings, ["partial_durable_today_plan_flags_do_not_enable_route_behavior"]);
  assert.deepEqual(rolloutOnly.json.warnings, ["partial_durable_today_plan_flags_do_not_enable_route_behavior"]);
});

test("script output does not contain token/key/password/JWT/secret values", () => {
  const result = runReadiness({
    VERCEL_ENV: "preview",
    PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING: "1",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key-must-not-print",
    ACCESS_TOKEN: "access-token-must-not-print",
    DATABASE_PASSWORD: "password-must-not-print",
    JWT: "jwt-must-not-print",
    SECRET_VALUE: "secret-must-not-print",
  });

  assert.equal(result.status, 0);
  for (const forbidden of ["service-role-key-must-not-print", "access-token-must-not-print", "password-must-not-print", "jwt-must-not-print", "secret-must-not-print"]) {
    assert.equal(result.output.includes(forbidden), false, `${forbidden} should not be printed`);
  }
  assert.equal(result.json.verified.includes("no_secret_output"), true);
});

test("rollout checklist doc exists and documents rollback, production-off posture, service-role ban, raw-field ban, and full flag matrix", () => {
  assert.equal(existsSync(checklistPath), true);
  const checklist = read(checklistPath);

  for (const required of [
    "This checklist is for staging/closed-beta enablement only.",
    "Production durable Today Plan reads remain OFF.",
    "PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase",
    "PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1",
    "PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1",
    "PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0",
    "PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0",
    "Do not use service role keys for learner runtime smoke",
    "raw OCR/problem/answer/source/copyright/official/model/score/instructor fields",
    "Rollback is flag-only",
  ]) {
    assert.equal(checklist.includes(required), true, `${required} should be documented`);
  }

  for (const row of [
    "| memory/unset",
    "| supabase                         | off",
    "| supabase                         | on",
    "any + missing userId",
    "any + unsupported examMode",
    "supabase/on/on + durable failure",
    "Final output max 3",
  ]) {
    assert.equal(checklist.includes(row), true, `flag matrix row ${row} should be present`);
  }
});

test("app route imports durable Today Plan route helper and route helper keeps all gates plus max-three merge", () => {
  const appRoute = read("app/app/page.tsx");
  const helper = read("lib/review-os/today-plan-learner-route-integration.ts");
  const integration = read("lib/review-os/today-plan-durable-graph-integration.ts");

  assert.equal(appRoute.includes("buildLearnerTodayPlanTasksWithGatedDurableConceptGraph"), true);
  assert.equal(appRoute.includes("today-plan-learner-route-integration"), true);
  assert.equal(helper.includes('getPersonalConceptGraphRepositoryMode(input.env) === "supabase"'), true);
  assert.equal(helper.includes('input.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READS === "1"'), true);
  assert.equal(helper.includes('input.env.PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT === "1"'), true);
  assert.equal(helper.includes("Boolean(input.userId?.trim())"), true);
  assert.equal(helper.includes('input.examMode === "first" || input.examMode === "second"'), true);
  assert.equal(helper.includes("actions.slice(0, 3)"), true);
  assert.equal(integration.includes("compressUnifiedTodayPlanToMaxThree"), true);
});
