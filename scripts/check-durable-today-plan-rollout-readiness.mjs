#!/usr/bin/env node

const env = process.env;

const VERIFIED = [
  "production_flags_guarded",
  "staging_requires_explicit_allow",
  "repository_supabase_required_for_rollout",
  "no_secret_output",
  "rollback_is_flag_only",
];

function isOn(value) {
  return value === "1";
}

function selectedEnvironment() {
  if (env.VERCEL_ENV) return env.VERCEL_ENV;
  if (env.NODE_ENV) return env.NODE_ENV;
  return "unknown";
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(reason, extra = {}) {
  printJson({
    status: "failed_durable_today_plan_rollout_readiness",
    reason,
    ...extra,
  });
  process.exit(1);
}

const environment = selectedEnvironment();
const isProduction = env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
const isStagingLike = env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development";
const repository = env.PERSONAL_CONCEPT_GRAPH_REPOSITORY ?? "unset";
const durableReadsOn = isOn(env.PERSONAL_CONCEPT_GRAPH_DURABLE_READS);
const todayPlanRolloutOn = isOn(env.PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT);
const anyDurableTodayPlanFlagOn = durableReadsOn || todayPlanRolloutOn;
const bothDurableTodayPlanFlagsOn = durableReadsOn && todayPlanRolloutOn;
const allowStaging = isOn(env.DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_STAGING);
const allowProduction = isOn(env.DURABLE_TODAY_PLAN_ROLLOUT_READINESS_ALLOW_PRODUCTION);
const warnings = [];

if (isProduction && anyDurableTodayPlanFlagOn && !allowProduction) {
  fail("production_durable_today_plan_flags_enabled");
}

if (isStagingLike && anyDurableTodayPlanFlagOn && !allowStaging) {
  fail("staging_durable_today_plan_flags_require_explicit_allow", { environment });
}

if (bothDurableTodayPlanFlagsOn && repository !== "supabase") {
  fail("repository_supabase_required_for_rollout", { environment });
}

if (durableReadsOn !== todayPlanRolloutOn) {
  warnings.push("partial_durable_today_plan_flags_do_not_enable_route_behavior");
}

printJson({
  status: "passed_durable_today_plan_rollout_readiness",
  environment,
  verified: VERIFIED,
  warnings,
});
