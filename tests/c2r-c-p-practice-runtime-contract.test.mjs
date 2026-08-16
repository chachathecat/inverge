import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  COMMAND_SPECS,
  DIAGNOSTIC_MAX_CHARS,
  DIAGNOSTIC_MAX_LINES,
  boundedSanitizedExcerpt,
  sanitizeDiagnosticText,
  sanitizedBrowserFailureLocations,
} from "../scripts/automation/verify-c2r-c-p-practice-runtime.mjs";
import {
  isTrustedRepairOwnerEmail,
  parseTrustedRepairOwnerEmails,
} from "../lib/review-os/trusted-repair-owner-allowlist.ts";
import { readTextFileSync } from "./platform-text.mjs";

const ROOT = process.cwd();
const read = (relativePath) =>
  readTextFileSync(path.join(ROOT, relativePath));

const MIGRATION =
  "supabase/migrations/20260817010000_c2r_c_p_practice_trusted_repair.sql";
const WORKFLOW =
  ".github/workflows/c2r-c-p-practice-trusted-repair-runtime.yml";
const VERIFIER = "scripts/automation/verify-c2r-c-p-practice-runtime.mjs";

test("[C2R-C-P-R01] Practice persistence is forced-RLS, CAS/idempotent, and runtime-gated", () => {
  const sql = read(MIGRATION);
  for (const table of [
    "wcv_c2_trusted_repair_sessions",
    "wcv_c2_trusted_repair_private_artifacts",
    "wcv_c2_trusted_repair_exposure_events",
    "wcv_c2_trusted_repair_command_receipts",
    "wcv_c2_trusted_repair_scarcity_events",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table}`));
  }
  assert.match(sql, /subject text not null check \(subject = 'appraisal_practical'\)/);
  assert.doesNotMatch(sql, /subject in \([^)]*appraisal_theory/i);
  assert.match(sql, /contract_version = 'wcv_c2r_c_p_practice_trusted_repair\.v1'/);
  assert.match(sql, /validator_version = 'validator:practice-calculation-relation@1'/);
  assert.match(sql, /'proofEvaluation'/);
  assert.match(sql, /WCV_C2_CAS_CONFLICT/);
  assert.match(sql, /wcv_c2_trusted_repair_command_receipts/);
  const commandLock = sql.indexOf("pg_catalog.pg_advisory_xact_lock");
  const receiptLookup = sql.indexOf(
    "from public.wcv_c2_trusted_repair_command_receipts as receipt",
    commandLock,
  );
  const sessionLock = sql.indexOf("for update", receiptLookup);
  assert.ok(commandLock > 0 && receiptLookup > commandLock);
  assert.ok(sessionLock > receiptLookup);
  assert.match(sql, /p_user_id::text \|\| ':' \|\| p_session_id::text \|\| ':' \|\| p_command_id::text/);
  assert.match(
    sql,
    /revoke all on function public\.wcv_c2_create_trusted_repair_session_v1\([\s\S]*?from public, anon, authenticated;/,
  );
  assert.match(
    sql,
    /grant execute on function public\.wcv_c2_create_trusted_repair_session_v1\([\s\S]*?to service_role;/,
  );
  assert.doesNotMatch(
    sql,
    /grant (?:select|insert|update|delete)[^;]*wcv_c2_trusted_repair_private_artifacts[^;]*authenticated/i,
  );
  const exposureInsert = sql.indexOf(
    "insert into public.wcv_c2_trusted_repair_exposure_events",
  );
  const sessionUpdate = sql.indexOf(
    "update public.wcv_c2_trusted_repair_sessions as session",
  );
  assert.ok(exposureInsert > 0 && sessionUpdate > exposureInsert);
});

test("[C2R-C-P-R11] API and learner shell remain Owner-only default-off", () => {
  const route = read("app/api/review-os/trusted-repair/route.ts");
  assert.ok(
    route.indexOf("await requireTrustedRepairAccess()") <
      route.indexOf("await request.json()"),
  );
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /Vary: "Cookie"/);
  assert.match(route, /exactObject\(raw, \["action", "subject", "inputMode", "commandId"\]\)/);
  assert.match(route, /isTrustedRepairSubject/);
  assert.doesNotMatch(route, /referenceAnswer|officialAnswer|mastery=true/i);

  const access = read("lib/review-os/trusted-repair-access.ts");
  assert.match(access, /process\.env\[TRUSTED_REPAIR_FLAG\] === "true"/);
  assert.match(access, /process\.env\.WCV_C2R_C_P_OWNER_EMAILS/);
  assert.doesNotMatch(access, /isAllowedAdminEmail/);
  assert.ok(
    access.indexOf("if (!isTrustedRepairEnabled())") <
      access.indexOf("getServerSessionUser()"),
  );
  assert.match(
    read(".env.example"),
    /WCV_C2R_C_P_PRACTICE_ENABLED=false/,
  );
  assert.match(read(".env.example"), /WCV_C2R_C_P_OWNER_EMAILS=/);
  assert.match(
    read("app/app/layout.tsx"),
    /isTrustedRepairEnabled\(\) && isTrustedRepairOwner\(session\.email\)/,
  );
  assert.match(
    read("components/learner/learner-ui.tsx"),
    /trustedRepairEnabled \? \(/,
  );
});

test("trusted repair owner access fails closed without an explicit allowlist", () => {
  assert.deepEqual(parseTrustedRepairOwnerEmails(undefined), []);
  assert.deepEqual(parseTrustedRepairOwnerEmails(" ,  "), []);
  assert.equal(isTrustedRepairOwnerEmail("owner@example.test", undefined), false);
  assert.equal(isTrustedRepairOwnerEmail("owner@example.test", ""), false);
  assert.equal(isTrustedRepairOwnerEmail(null, "owner@example.test"), false);
  assert.equal(
    isTrustedRepairOwnerEmail(
      "OWNER@example.test",
      " second@example.test, owner@example.test ",
    ),
    true,
  );
  assert.equal(
    isTrustedRepairOwnerEmail(
      "learner@example.test",
      "owner@example.test",
    ),
    false,
  );
});

test("[C2R-C-P-R08/R11/R14] workflow is fork-safe, shell-complete, and credential-free", () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /pull_request:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /playwright install -- --with-deps chromium/);
  assert.match(workflow, /node scripts\/automation\/verify-c2r-c-p-practice-runtime\.mjs/);
  assert.match(workflow, /--cleanup\s+--require-complete/);
  assert.match(workflow, /git diff --exit-code -- package\.json package-lock\.json/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /if: success\(\)/);
  assert.doesNotMatch(workflow, /github\.event\.pull_request\.head\.repo\.full_name/);
  assert.doesNotMatch(workflow, /pull_request_target|persist-credentials: true|SUPABASE_ACCESS_TOKEN/);

  const verifier = read(VERIFIER);
  assert.match(verifier, /EXPECTED_CLI_VERSION = "2\.114\.0"/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.match(verifier, /repositorySecretsUsed: false/);
  assert.match(verifier, /liveProvidersUsed: false/);
  assert.match(verifier, /syntheticSubjects: 1/);
  assert.match(verifier, /practice_actual_browser_to_postgres_chain/);
  assert.match(verifier, /state_data->'proofEvaluation'->>'state'/);
  assert.match(verifier, /is distinct from 'PASS'/);
  assert.doesNotMatch(verifier, /appraisal_compensation_law|three_subject_actual/);
});

test("required runtime-gate has an exact closed C2R-C-P migration adapter", () => {
  const producer = read("scripts/automation/produce-runtime-evidence.mjs");
  const gate = read("scripts/automation/runtime-gate.mjs");
  for (const source of [producer, gate]) {
    assert.match(source, /20260817010000_c2r_c_p_practice_trusted_repair\.sql/);
    assert.match(source, /c2r-c-p\.postgres\.practice-trusted-repair\.v1/);
    assert.match(source, /practice_only_subject_constraint/);
    assert.match(source, /proof_evaluation_persisted/);
    assert.match(source, /exposure_and_state_transition_atomic/);
  }
  assert.match(producer, /runC2RCPDatabaseAssertions/);
  assert.match(producer, /anonymous_read_denied/);
  assert.match(producer, /authenticated_private_body_read_denied/);
  assert.match(producer, /stale_cas_transition_rejected/);
});

test("runtime evidence surfaces contain no remote project command and diagnostics redact secrets", () => {
  for (const relativePath of [
    WORKFLOW,
    "tests/runtime/wcv-c2-supabase/supabase/config.toml",
    "tests/e2e/c2r-c-p-practice-trusted-repair-runtime.spec.ts",
  ]) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /supabase\s+(?:login|link)|--linked|supabase\s+db\s+(?:push|pull|dump)/i);
    assert.doesNotMatch(source, /https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  }
  assert.match(read(VERIFIER), /FORBIDDEN_LOCAL_SOURCE/);
  assert.match(read(VERIFIER), /supabase\\s\+\(\?:login\|link\)/);

  const sensitiveDiagnostic =
    "SUPABASE_SERVICE_ROLE_KEY=secret https://demo.supabase.co Authorization: Bearer abc.def.ghi\n".repeat(80);
  const sanitized = sanitizeDiagnosticText(sensitiveDiagnostic);
  assert.doesNotMatch(sanitized, /=secret(?:\s|$)|demo\.supabase\.co|abc\.def\.ghi/);
  const bounded = boundedSanitizedExcerpt(sensitiveDiagnostic);
  assert.ok(bounded.length <= DIAGNOSTIC_MAX_CHARS);
  assert.ok(bounded.split(/\r?\n/).length <= DIAGNOSTIC_MAX_LINES);
  assert.deepEqual(
    sanitizedBrowserFailureLocations({
      stdout: "tests/e2e/c2r-c-p-practice-trusted-repair-runtime.spec.ts:123:9\n",
      stderr: "tests/e2e/c2r-c-p-practice-trusted-repair-runtime.spec.ts:127:4\n",
    }),
    ["123", "127"],
  );
  assert.equal(COMMAND_SPECS.browser_acceptance.sensitivityPolicy, "browser_assertion_locations_only");
});

test("C2R-C-P stage config declares complete Practice layers and no Theory/Law runtime", () => {
  const configPath = path.join(
    ROOT,
    "config/dabangil-c2r-c-p-practice-trusted-repair-v1.json",
  );
  const contract = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(contract.stage.stageId, "C2R-C-P");
  assert.equal(contract.stage.leadIssue, 703);
  assert.deepEqual(contract.subjectBoundary.implementedSubjectsExactly, [
    "appraisal_practical",
  ]);
  assert.deepEqual(contract.subjectBoundary.deferredSubjectsExactly, [
    "appraisal_theory",
    "appraisal_compensation_law",
  ]);
  assert.equal(contract.subjectBoundary.deferredSubjectRuntimeExists, false);
  assert.equal(contract.practiceProof.type, "CalculationRelationAnchorV1");
  assert.equal(contract.practiceProof.onlyPassCreatesVerified, true);
  assert.equal(
    contract.completeOutcomeLayers.independentRollback.killSwitch,
    "WCV_C2R_C_P_PRACTICE_ENABLED",
  );
  assert.equal(contract.activationBoundary.productionAuthorized, false);
  assert.equal(contract.activationBoundary.remoteMigrationApplyAuthorized, false);
  assert.deepEqual(contract.regressionCoverageCandidate.rows, [
    1, 2, 4, 6, 8, 9, 10, 11, 12, 14, 19,
  ]);
});
