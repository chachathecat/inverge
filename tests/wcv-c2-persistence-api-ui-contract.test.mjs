import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEDICATED_RUNTIME_ADAPTER_PATHS,
  runtimeRequiredPathRecords,
} from "../scripts/automation/runtime-risk-contract.mjs";

const SQL = "supabase/migrations/20260812011903_wcv_c2_trusted_repair_vertical.sql";
const REPOSITORY = "lib/review-os/trusted-repair-repository.ts";
const ROUTE = "app/api/review-os/trusted-repair/route.ts";
const ACCESS = "lib/review-os/trusted-repair-access.ts";
const SERVER = "lib/review-os/trusted-repair-server.ts";
const UI = "components/review-os/trusted-repair-loop.tsx";
const WORKFLOW = ".github/workflows/wcv-c2-trusted-repair-runtime.yml";

test("migration is service-only, exact-user, forced-RLS, append-only and CAS/replay atomic", async () => {
  const sql = await readFile(SQL, "utf8");
  for (const table of [
    "sessions",
    "private_artifacts",
    "exposure_events",
    "command_receipts",
    "scarcity_events",
  ]) {
    assert.match(sql, new RegExp(`wcv_c2_trusted_repair_${table} enable row level security`));
    assert.match(sql, new RegExp(`wcv_c2_trusted_repair_${table} force row level security`));
  }
  assert.match(sql, /revoke all on table public\.wcv_c2_trusted_repair_private_artifacts\s+from public, anon, authenticated/);
  assert.match(sql, /grant select, insert\s+on table public\.wcv_c2_trusted_repair_private_artifacts to service_role/);
  assert.doesNotMatch(sql, /grant select, insert, update, delete/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*authenticated/i);
  assert.match(sql, /session\.user_id = p_user_id/);
  assert.match(sql, /session\.record_version = v_current_version/);
  assert.match(sql, /session\.state = v_current_state/);
  assert.match(sql, /WCV_C2_CAS_CONFLICT/);
  assert.match(sql, /receipt\.command_id = p_command_id/);
  assert.ok(sql.indexOf("insert into public.wcv_c2_trusted_repair_exposure_events") < sql.indexOf("update public.wcv_c2_trusted_repair_sessions as session"));
  assert.match(sql, /security invoker\s+set search_path = ''/g);
  assert.doesNotMatch(sql, /https?:\/\//);
  assert.doesNotMatch(sql, /supabase\s+(?:link|db push|login)/i);
});

test("repository has no user-client fallback and scopes every read or receipt to exact identity", async () => {
  const source = await readFile(REPOSITORY, "utf8");
  assert.match(source, /createSupabaseAdminClient/);
  assert.doesNotMatch(source, /createSupabaseServerClient|createBrowserClient/);
  assert.ok((source.match(/\.eq\("user_id", authenticatedUserId\)/g) ?? []).length >= 4);
  assert.ok((source.match(/\.eq\("session_id", sessionId\)/g) ?? []).length >= 2);
  assert.match(source, /\.eq\("session_kind", SESSION_KIND\)/);
  assert.match(source, /p_expected_version: session\.recordVersion/);
  assert.match(source, /p_expected_state: input\.plan\.expectedState/);
  assert.match(
    source,
    /result\.data\.resulting_record_version === input\.currentRecordVersion/,
  );
  assert.match(source, /result\.data\.resulting_state === input\.currentState/);
});

test("route checks default-off Owner access before parsing and rejects extra JSON keys", async () => {
  const [route, access] = await Promise.all([readFile(ROUTE, "utf8"), readFile(ACCESS, "utf8")]);
  const accessIndex = route.indexOf("await requireTrustedRepairAccess()");
  assert.ok(accessIndex >= 0);
  assert.ok(accessIndex < route.indexOf("request.headers.get(\"content-type\")"));
  assert.ok(accessIndex < route.indexOf("await request.json()"));
  assert.match(route, /exactObject\(raw,/);
  assert.match(route, /Cache-Control.*private, no-store/);
  assert.match(route, /Vary: "Cookie"/);
  assert.match(access, /process\.env\[TRUSTED_REPAIR_FLAG\] === "true"/);
  assert.match(access, /export function isTrustedRepairOwner/);
  assert.match(access, /return isAllowedAdminEmail\(email\)/);
  assert.match(access, /isTrustedRepairOwner\(session\.email\)/);
  assert.match(await readFile(".env.example", "utf8"), /WCV_C2_TRUSTED_REPAIR_ENABLED=false/);
});

test("DTO and UI expose bounded fields only after committed help and support durable accessible recovery", async () => {
  const [server, ui] = await Promise.all([readFile(SERVER, "utf8"), readFile(UI, "utf8")]);
  assert.match(server, /matchingExposure/);
  assert.match(server, /selectTrustedRepairScaffoldExposure\(aggregate\)/);
  assert.match(server, /if \(!primary \|\| !matchingExposure\) return null/);
  assert.match(server, /trustedRepairSourceBindingMatches/);
  assert.match(server, /trustedRepairAggregateForRelease/);
  assert.match(server, /sourceBindingCurrent &&/);
  assert.match(server, /sameSessionCriterionOnly: true/);
  for (const claim of ["masteryClaimed", "transferClaimed", "stabilityClaimed", "scoreClaimed", "passClaimed"]) {
    assert.match(server, new RegExp(`${claim}: false`));
  }
  assert.doesNotMatch(server, /referenceAnswer|policySecret|credentialValue/);
  assert.doesNotMatch(server, /artifactBody\(|workspace:/);
  assert.match(ui, /sessionId=/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
  assert.equal((ui.match(/data-primary-action/g) ?? []).length, 1);
  assert.match(ui, /다른 방식으로 하기/);
  assert.match(ui, /VERIFY_AND_CONTINUE/);
  assert.match(ui, /DEFER_FOR_NOW/);
  assert.match(ui, /SWITCH_TO_GUIDED/);
  assert.match(ui, /aria-labelledby/);
  assert.match(ui, /role="alert"/);
  assert.doesNotMatch(ui, /openai|anthropic|gemini|chat\/completions/i);
});

test("generic Runtime Gate delegates only the exact C2 migration to its branch-agnostic stricter check", async () => {
  const workflow = await readFile(WORKFLOW, "utf8");
  assert.deepEqual(DEDICATED_RUNTIME_ADAPTER_PATHS, [SQL]);
  assert.deepEqual(runtimeRequiredPathRecords([SQL]), []);
  assert.match(workflow, new RegExp(`- ["']${SQL}["']`));
  assert.doesNotMatch(
    workflow,
    /github\.event\.pull_request\.head\.ref\s*==/,
  );
  assert.match(
    workflow,
    /if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.deepEqual(
    runtimeRequiredPathRecords(["supabase/migrations/20990101000000_unreviewed.sql"]),
    [{
      path: "supabase/migrations/20990101000000_unreviewed.sql",
      pattern: "supabase/migrations/**",
    }],
  );
});

test("machine contract maps all four issues and exactly eight C2 allocations", async () => {
  const contract = JSON.parse(
    await readFile("config/wcv-c2-trusted-repair-contract-v1.json", "utf8"),
  );
  assert.deepEqual(Object.keys(contract.issueAcceptance), ["702", "703", "704", "705"]);
  assert.deepEqual(Object.keys(contract.issue714C2Allocations), [
    "adaptive_expertise_controller",
    "cognitive_load_budget",
    "concept_repair_need_decision",
    "concept_repair_input_modes_and_private_artifact_boundary",
    "concept_progression_gate_and_three_continue_semantics",
    "episode_metacognitive_prediction_and_self_diagnosis",
    "initial_scaffold_fading_and_control_transfer",
    "same_session_reconstruction_application_and_no_shortcut_invariants",
  ]);
  assert.equal(contract.fixtureInventory.total, 21);
  assert.equal(contract.fixtureInventory.goldCandidateCount, 18);
  assert.equal(contract.lawBoundary.verifiedOutcomeAllowedOnCurrentRepositoryState, false);
  assert.equal(contract.rollout.defaultOff, true);
});
