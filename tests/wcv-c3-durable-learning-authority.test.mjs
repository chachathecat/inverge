import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("WCV-C3 is one complete #706/#707/#708 vertical and remains default-off", async () => {
  const contract = JSON.parse(await read("config/dabangil-wcv-c3-durable-learning-daily-command-v1.json"));
  assert.equal(contract.stage, "WCV-C3");
  assert.equal(contract.coveringPr, 766);
  assert.equal(contract.stageBoundProof.required, true);
  assert.equal(contract.stageBoundProof.fixtureReleaseVersion, "dabangil.wcv_c3.rights_safe_transfer_fixtures.2026-08-17.v2");
  assert.equal(contract.stageBoundProof.crossStageCommitmentReusePasses, false);
  assert.equal(contract.stageBoundProof.omittedClosedBooleanOrZeroPasses, false);
  assert.equal(contract.stageBoundProof.freshRetryVariantAfterNonD1Failure, true);
  assert.equal(contract.stageBoundProof.retryVariantsRemainRightsSafeSynthetic, true);
  assert.equal(contract.stageBoundProof.untimedRecurrenceEvent, "RECURRENCE_RECONFIRMED");
  assert.deepEqual(contract.jointIssues, [706, 707, 708]);
  assert.equal(contract.proofObjects.length, 9);
  assert.deepEqual(contract.subjects, ["appraisal_practical", "appraisal_theory", "appraisal_law"]);
  assert.equal(contract.planner.availableMinutesMinimum, 30);
  assert.equal(contract.planner.availableMinutesMaximum, 720);
  assert.equal(contract.planner.coreOutcomeMaximum, 3);
  assert.equal(contract.activationBoundary.flagDefault, false);
  assert.equal(contract.activationBoundary.productionAuthorized, false);
  assert.equal(contract.activationBoundary.realLearnerAuthorized, false);
  assert.equal(contract.activationBoundary.remoteMigrationApplyAuthorized, false);
  assert.equal(contract.candidateRepresentsPostMergeState, true);
  assert.equal(contract.completedIssue714Allocation, "C3");
  assert.deepEqual(contract.remainingIssue714Allocations, ["C4", "C6"]);
});

test("WCV-C3 completion leaves no dependency-ready successor while S241A is incomplete", async () => {
  const [roadmap, unified, launch, agents] = await Promise.all([
    read("roadmap/active-program.yml"),
    read("config/dabangil-unified-program-contract.json").then(JSON.parse),
    read("config/dabangil-unified-product-multisurface-launch-v1.json").then(JSON.parse),
    read("AGENTS.md"),
  ]);
  assert.match(roadmap, /soleNextImplementationItem: null/);
  assert.match(roadmap, /- id: WCV-C3[\s\S]*?status: completed[\s\S]*?coveringPr: 766[\s\S]*?issue714CompletedAllocation: C3/);
  assert.match(roadmap, /- id: ULC-M1[\s\S]*?dependencies: \[WCV-C3, S241A\]/);
  assert.equal(unified.launchConvergenceAmendment.soleNextImplementationItem, null);
  assert.equal(unified.launchConvergenceAmendment.wcvC3Complete, true);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, null);
  assert.equal(launch.preservedCurrentAuthority.nextRoadmapItemId, null);
  assert.equal(launch.preservedCurrentAuthority.ulcM1BlockedByIncompleteDependency, "S241A");
  assert.match(agents, /no dependency-ready successor: ULC-M1 remains blocked/);
});

test("WCV-C3 persistence separates bodies, forces RLS and exposes only service RPCs", async () => {
  const sql = await read("supabase/migrations/20260817190000_wcv_c3_durable_learning_daily_command.sql");
  assert.match(sql, /wcv_c3_private_attempt_artifacts/);
  assert.match(sql, /wcv_c3_evidence_events/);
  assert.match(sql, /payload @> '\{"containsBody":false\}'::jsonb/);
  assert.match(sql, /force row level security/g);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/g);
  assert.match(sql, /to service_role/g);
  assert.match(sql, /WCV_C3_CAS_CONFLICT/);
  assert.match(sql, /wcv_c3_deletion_receipts/);
  assert.match(sql, /references public\.wcv_c3_private_attempt_artifacts\(id, case_id, user_id\)[\s\S]*on delete cascade/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /truncate table|drop table/i);
});

test("WCV-C3 API/UI and exact-head runtime enforce trusted timing and metadata safety", async () => {
  const [route, server, engine, page, ui, access, env, qa, workflow, verifier, browser] = await Promise.all([
    read("app/api/review-os/durable-learning/route.ts"),
    read("lib/review-os/durable-learning-server.ts"),
    read("lib/review-os/durable-learning-engine.ts"),
    read("app/app/durable-learning/page.tsx"),
    read("components/review-os/durable-learning-command.tsx"),
    read("lib/review-os/durable-learning-access.ts"),
    read(".env.example"),
    read("docs/qa/wcv-c3-durable-learning-daily-command-validation.md"),
    read(".github/workflows/wcv-c3-durable-learning-runtime.yml"),
    read("scripts/automation/verify-wcv-c3-runtime.mjs"),
    read("tests/e2e/wcv-c3-durable-learning-runtime.spec.ts"),
  ]);
  assert.match(route, /action === "prepare_attempt"/);
  assert.match(route, /parseJsonRejectingDuplicateKeys/);
  assert.match(route, /requestText\.length > 20_000/);
  assert.match(route, /Feature and identity checks deliberately precede/);
  assert.doesNotMatch(route, /elapsedSeconds|startedAt/);
  assert.match(server, /process\.env\.CI === "true"/);
  assert.match(server, /process\.env\.VERCEL_ENV !== "production"/);
  assert.match(engine, /trustedStartedAt/);
  assert.match(engine, /elapsedSeconds < fixture\.minimumElapsedSeconds/);
  assert.match(engine, /durableCommitmentPasses\(fixture, input\.commitment\)/);
  assert.match(engine, /RECURRENCE_RECONFIRMED/);
  assert.match(engine, /replacementApplied: Boolean\(input\.replacement\)/);
  assert.match(engine, /snapshot\.digest === digest\(preimage\)/);
  assert.match(engine, /snapshot\.contentReleaseVersion === DURABLE_LEARNING_FIXTURE_VERSION/);
  assert.match(page, /requireDurableLearningAccess/);
  assert.match(ui, /data-wcv-c3-durable-learning/);
  assert.match(ui, /D\+1 · D\+7 · 시간제한/);
  assert.match(ui, /commitmentFieldsComplete/);
  assert.match(ui, /forbiddenPredicateAsserted: explicitBoolean/);
  assert.match(ui, /blockerCount: explicitNumber/);
  assert.match(ui, /decision: "EDITED"[\s\S]*\.\.\.currentPlanFields\(\)/);
  assert.match(access, /DURABLE_LEARNING_OWNER_EMAILS/);
  assert.match(env, /WCV_C3_DURABLE_LEARNING_ENABLED=false/);
  assert.match(env, /WCV_C3_SYNTHETIC_RUNTIME=false/);
  assert.match(qa, /remote Supabase or repository secrets/);
  assert.match(qa, /2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation/);
  assert.match(qa, /2026-08-16-owner-github-native-delivery-control/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /git diff --exit-code -- package\.json package-lock\.json/);
  assert.doesNotMatch(workflow, /pull_request_target|persist-credentials: true|SUPABASE_ACCESS_TOKEN/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.match(verifier, /repositorySecretsUsed: false/);
  assert.match(verifier, /process_restart_restore/);
  assert.match(browser, /width: 390/);
  assert.match(browser, /width: 768/);
  assert.match(browser, /width: 1440/);
  assert.match(browser, /new AxeBuilder/);
  assert.match(browser, /cross-user|denied/);
});
