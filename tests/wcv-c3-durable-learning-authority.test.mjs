import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("WCV-C3 is one complete #706/#707/#708 vertical and remains default-off", async () => {
  const contract = JSON.parse(await read("config/dabangil-wcv-c3-durable-learning-daily-command-v1.json"));
  assert.equal(contract.stage, "WCV-C3");
  assert.equal(contract.coveringPr, 780);
  assert.equal(contract.stageBoundProof.required, true);
  assert.equal(contract.stageBoundProof.fixtureReleaseVersion, "dabangil.wcv_c3.rights_safe_transfer_fixtures.2026-08-17.v2");
  assert.equal(contract.stageBoundProof.crossStageCommitmentReusePasses, false);
  assert.equal(contract.stageBoundProof.omittedClosedBooleanOrZeroPasses, false);
  assert.equal(contract.stageBoundProof.expectedJudgmentNotDisclosedBeforeCommit, true);
  assert.equal(contract.stageBoundProof.expectedTheoryOptionNotMarkedBeforeCommit, true);
  assert.equal(contract.stageBoundProof.problemAndSourceContextExposedBeforeCommit, true);
  assert.equal(contract.stageBoundProof.neutralTheoryOptionsMarkExpected, false);
  assert.equal(contract.stageBoundProof.serverBindsNonAnswerInputContext, true);
  assert.equal(contract.stageBoundProof.learnerSubmissionAcceptsOnlyAnswerFields, true);
  assert.equal(contract.stageBoundProof.browserExpectedFixtureImport, false);
  assert.equal(contract.stageBoundProof.freshRetryVariantAfterNonD1Failure, true);
  assert.equal(contract.stageBoundProof.retryVariantsRemainRightsSafeSynthetic, true);
  assert.equal(contract.stageBoundProof.untimedRecurrenceEvent, "RECURRENCE_RECONFIRMED");
  assert.deepEqual(contract.jointIssues, [706, 707, 708]);
  assert.equal(contract.proofObjects.length, 14);
  assert.equal(contract.reviewOutputs.nonSuccessEmitsExactlyOneFailureNote, true);
  assert.equal(contract.reviewOutputs.signalsAreBodylessEvidenceContributionsOnly, true);
  assert.equal(contract.reviewOutputs.signalsCreateCanonicalState, false);
  assert.equal(contract.reviewOutputs.allOutputsCommitInExistingTransitionRpc, true);
  assert.equal(contract.migrationRecovery.completeHistoryFreshStart, true);
  assert.equal(contract.migrationRecovery.completeHistoryResetCount, 2);
  assert.equal(contract.migrationRecovery.secondReplayUsesNewlyRemovedLocalVolume, true);
  assert.equal(contract.migrationRecovery.nestedJsonbDeletionRequiresExplicitParentheses, true);
  assert.deepEqual(contract.migrationRecovery.failureDiagnosticFields, [
    "migrationFilename",
    "statementIdentifier",
    "sqlstate",
    "errorClass",
    "boundedMessage",
  ]);
  assert.equal(contract.migrationRecovery.failureDiagnosticIncludesSqlBody, false);
  assert.equal(contract.planner.reviewOutcomeSeparatedFromPlannerStatus, true);
  assert.equal(contract.planner.plannerCannotOverwriteReviewFeedback, true);
  assert.deepEqual(contract.subjects, ["appraisal_practical", "appraisal_theory", "appraisal_law"]);
  assert.equal(contract.planner.availableMinutesMinimum, 30);
  assert.equal(contract.planner.availableMinutesMaximum, 720);
  assert.equal(contract.planner.coreOutcomeMaximum, 3);
  assert.equal(contract.activationBoundary.flagDefault, false);
  assert.equal(contract.activationBoundary.hardProductionDeny, true);
  assert.equal(contract.activationBoundary.productionAuthorized, false);
  assert.equal(contract.activationBoundary.realLearnerAuthorized, false);
  assert.equal(contract.activationBoundary.remoteMigrationApplyAuthorized, false);
  assert.equal(contract.candidateRepresentsPostMergeState, true);
  assert.equal(contract.completedIssue714Allocation, "C3");
  assert.deepEqual(contract.remainingIssue714Allocations, ["C4", "C6"]);
});

test("WCV-C3 completion leaves no authorized automatic product successor", async () => {
  const [roadmap, unified, launch, agents] = await Promise.all([
    read("roadmap/active-program.yml"),
    read("config/dabangil-unified-program-contract.json").then(JSON.parse),
    read("config/dabangil-unified-product-multisurface-launch-v1.json").then(JSON.parse),
    read("AGENTS.md"),
  ]);
  assert.match(roadmap, /soleNextImplementationItem: null/);
  assert.match(roadmap, /- id: WCV-C3[\s\S]*?status: completed[\s\S]*?coveringPr: 780[\s\S]*?issue714CompletedAllocation: C3/);
  assert.match(roadmap, /- id: ULC-M1[\s\S]*?dependencies: \[WCV-C3, S241A\]/);
  assert.equal(unified.launchConvergenceAmendment.soleNextImplementationItem, null);
  assert.equal(unified.launchConvergenceAmendment.wcvC3Complete, true);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, null);
  assert.equal(launch.preservedCurrentAuthority.nextRoadmapItemId, null);
  assert.equal(launch.preservedCurrentAuthority.ulcM1BlockedByIncompleteDependency, "S241A");
  assert.match(agents, /no authorized automatic successor: ULC-M1 remains blocked/);
  assert.match(roadmap, /- id: S236B[\s\S]*?status: queued[\s\S]*?candidateQualifies: false[\s\S]*?nextWorkAuthorized: false/);
});

test("WCV-C3 persistence separates bodies, forces RLS and exposes only service RPCs", async () => {
  const [sql, repository] = await Promise.all([
    read("supabase/migrations/20260817190000_wcv_c3_durable_learning_daily_command.sql"),
    read("lib/review-os/durable-learning-repository.ts"),
  ]);
  assert.match(sql, /wcv_c3_private_attempt_artifacts/);
  assert.match(sql, /wcv_c3_evidence_events/);
  assert.match(sql, /wcv_c3_private_attempt_artifacts_user_idx/);
  assert.match(sql, /wcv_c3_command_receipts_case_idx/);
  assert.match(sql, /payload @> '\{"containsBody":false\}'::jsonb/);
  assert.match(sql, /force row level security/g);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/g);
  assert.match(sql, /to service_role/g);
  assert.match(sql, /WCV_C3_CAS_CONFLICT/);
  assert.match(sql, /WCV_C3_REQUIRED_REVIEW_OUTPUT_INVALID/);
  assert.match(sql, /WCV_C3_REVIEW_SOURCE_BINDING_MISMATCH/);
  assert.match(sql, /WCV_C3_FAILURE_NOTE_REQUIRED/);
  assert.match(sql, /WCV_C3_SUCCESS_MUST_NOT_CREATE_FAILURE_NOTE/);
  assert.match(sql, /WCV_C3_PLAN_REVIEW_STATE_SEPARATION_REQUIRED/);
  assert.match(sql, /WCV_C3_REVIEW_STATE_CHANGE_REQUIRES_TERMINAL_EVENT/);
  assert.match(sql, /dabangil\.wcv_c3\.safe_learning_gap_signal\.v1/);
  assert.match(sql, /s216\.error_notebook_gap_taxonomy\.v1/);
  assert.match(sql, /s217\.personal_core_concept_graph\.v1/);
  assert.match(sql, /pg_catalog\.jsonb_array_length\(p_state_data -> 'failureNotes'\)[\s\S]*?\+ 1/);
  assert.match(sql, /p_state_data -> 'failureNotes'[\s\S]*?is distinct from v_current_state_data -> 'failureNotes'/);
  const nestedJsonbDeletionExpressions = sql.match(
    /\([^()\r\n]+->\s*'[^']+'\)\s*-\s*array\s*\[/gi,
  ) ?? [];
  assert.equal(nestedJsonbDeletionExpressions.length, 8);
  assert.doesNotMatch(
    sql,
    /\b(?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*\s*->\s*'[^']+'\s*-\s*array\s*\[/i,
  );
  assert.equal((sql.match(/create table if not exists public\.wcv_c3_/g) ?? []).length, 5);
  assert.match(sql, /wcv_c3_deletion_receipts/);
  assert.match(sql, /create or replace function public\.wcv_c3_load_gap_closure_case_v1\([\s\S]*?language sql[\s\S]*?stable[\s\S]*?security invoker/);
  assert.match(sql, /revoke all on function public\.wcv_c3_load_gap_closure_case_v1\(uuid, uuid\)[\s\S]*?from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.wcv_c3_load_gap_closure_case_v1\(uuid, uuid\)[\s\S]*?to service_role/);
  assert.match(repository, /\.rpc\("wcv_c3_load_gap_closure_case_v1"/);
  assert.doesNotMatch(repository, /Promise\.all\(\[[\s\S]*?wcv_c3_gap_closure_cases/);
  assert.match(sql, /references public\.wcv_c3_private_attempt_artifacts\(id, case_id, user_id\)[\s\S]*on delete cascade/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /truncate table|drop table/i);
});

test("complete migration history has unique dependency-ordered versions", async () => {
  const migrationNames = (await readdir(new URL("supabase/migrations/", root)))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const versions = migrationNames.map((name) => {
    const match = /^(\d+)_/.exec(name);
    assert.ok(match, `migration filename is not versioned: ${name}`);
    return match[1];
  });
  assert.equal(new Set(versions).size, versions.length);
  assert.deepEqual(
    migrationNames.filter((name) => name.includes("legal_") && name.startsWith("2026061")),
    [
      "20260615090000_legal_grounding.sql",
      "20260615100000_legal_article_chunk_identity.sql",
      "20260615110000_legal_retrieval.sql",
      "20260615120000_legal_grounding_guard.sql",
      "20260616100000_legal_grounding_guard_service_role_grant.sql",
    ],
  );
  const learningStateMigration = await read(
    "supabase/migrations/20260608_create_personal_learning_states.sql",
  );
  assert.equal((learningStateMigration.match(/\bfrom walk\b/g) ?? []).length, 2);
  assert.match(learningStateMigration, /cross join lateral \([\s\S]*?jsonb_each[\s\S]*?union all[\s\S]*?jsonb_array_elements/);
});

test("WCV-C3 API/UI and exact-head runtime enforce trusted timing and metadata safety", async () => {
  const [route, server, engine, page, layout, ui, access, env, qa, workflow, verifier, browser] = await Promise.all([
    read("app/api/review-os/durable-learning/route.ts"),
    read("lib/review-os/durable-learning-server.ts"),
    read("lib/review-os/durable-learning-engine.ts"),
    read("app/app/durable-learning/page.tsx"),
    read("app/app/layout.tsx"),
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
  assert.match(server, /isBeforeDurableEligibility\([\s\S]*?evaluatedAt,[\s\S]*?nextEligibleAt/);
  assert.match(server, /"WAIT_FOR_ELIGIBILITY"/);
  assert.match(engine, /trustedStartedAt/);
  assert.match(engine, /elapsedSeconds < fixture\.minimumElapsedSeconds/);
  assert.match(engine, /durableCommitmentPasses\(fixture, input\.commitment\)/);
  assert.doesNotMatch(server, /expectedCommitment/);
  assert.match(engine, /RECURRENCE_RECONFIRMED/);
  assert.match(engine, /next_eligible_at_not_reached/);
  assert.match(engine, /outcomeTemplate\(input\.aggregate, waitingForEligibility\)/);
  assert.match(engine, /caseRecordVersion: input\.aggregate\.caseRecord\.recordVersion/);
  assert.match(engine, /recordVersion !== proposalContext\.caseRecordVersion \+ 1/);
  assert.match(engine, /DurableLearningContractError\("stale_plan"\)/);
  assert.match(engine, /replacementApplied: Boolean\(input\.replacement\)/);
  assert.match(engine, /snapshot\.digest === digest\(preimage\)/);
  assert.match(engine, /snapshot\.contentReleaseVersion === DURABLE_LEARNING_FIXTURE_VERSION/);
  assert.match(page, /requireDurableLearningAccess/);
  assert.match(layout, /currentPath\.startsWith\("\/app\/durable-learning"\)[\s\S]*?trustedRepairEnabled=\{[\s\S]*?isTrustedRepairEnabled\(\) && isTrustedRepairOwner\(session\.email\)/);
  assert.match(ui, /data-wcv-c3-durable-learning/);
  assert.match(ui, /nextAction === "WAIT_FOR_ELIGIBILITY"/);
  assert.match(ui, /code === "stale_plan"/);
  assert.match(ui, /다음 가능 시점까지 대기/);
  assert.match(ui, /D\+1 · D\+7 · 시간제한/);
  assert.match(route, /parseDurableLearnerResponse/);
  assert.match(route, /learnerResponse/);
  assert.match(server, /bindDurableLearnerResponse/);
  assert.match(server, /inputContext: fixture\.inputContext/);
  assert.match(server, /latestReviewOutcome/);
  assert.match(server, /latestFailureNote/);
  assert.match(engine, /buildDurableReviewOutputs/);
  assert.match(engine, /DURABLE_LEARNING_GAP_SIGNAL_VERSION/);
  assert.match(engine, /DURABLE_CONCEPT_STATE_SIGNAL_VERSION/);
  assert.match(engine, /DURABLE_FAILURE_NOTE_VERSION/);
  assert.match(engine, /latestReviewOutcome: outputs\.reviewOutcome/);
  assert.match(engine, /failureNotes: outputs\.failureNote/);
  assert.match(engine, /plannerStatus:/);
  assert.doesNotMatch(engine, /latestPlan: plan,[\s\S]{0,160}resultReasonCodes:/);
  assert.match(ui, /learnerResponseFieldsComplete/);
  assert.match(ui, /data-wcv-c3-input-context/);
  assert.match(ui, /preserveAttemptDraft/);
  assert.match(ui, /next\.attempt\?\.attemptId === currentAttemptId/);
  assert.match(ui, /data-wcv-c3-result-note/);
  assert.match(ui, /view\.latestReviewOutcome/);
  assert.match(ui, /view\.latestFailureNote/);
  assert.match(ui, /왜 틀렸는가/);
  assert.match(ui, /실패한 기준/);
  assert.match(ui, /다음 행동 1개/);
  assert.match(ui, /다음 검토/);
  assert.match(ui, /forbiddenPredicateAsserted: explicitBoolean/);
  assert.match(ui, /blockerCount: explicitNumber/);
  assert.match(ui, /decision: "EDITED"[\s\S]*\.\.\.currentPlanFields\(\)/);
  assert.match(access, /DURABLE_LEARNING_OWNER_EMAILS/);
  assert.match(access, /vercelEnvironment !== "production"/);
  assert.match(access, /process\.env\.NODE_ENV !== "production"/);
  assert.match(env, /WCV_C3_DURABLE_LEARNING_ENABLED=false/);
  assert.match(env, /WCV_C3_SYNTHETIC_RUNTIME=false/);
  assert.match(qa, /remote Supabase or repository secrets/);
  assert.match(qa, /2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation/);
  assert.match(qa, /2026-08-16-owner-github-native-delivery-control/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /git diff --exit-code -- package\.json package-lock\.json/);
  assert.match(workflow, /lib\/review-os\/trusted-repair-\*\.ts/);
  assert.match(workflow, /scripts\/automation\/wcv-c3-migration-diagnostics\.mjs/);
  assert.match(workflow, /supabase\/migrations\/\*\*/);
  assert.doesNotMatch(workflow, /pull_request_target|persist-credentials: true|SUPABASE_ACCESS_TOKEN/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.match(verifier, /repositorySecretsUsed: false/);
  assert.match(verifier, /const migrationHistory = fs\.readdirSync/);
  assert.equal((verifier.match(/\["db", "reset"/g) ?? []).length, 2);
  assert.match(verifier, /firstCycleCleanup/);
  assert.match(verifier, /complete_migration_history_reset_twice/);
  assert.match(verifier, /formatMigrationFailureDiagnostic/);
  assert.match(verifier, /process_restart_restore/);
  assert.match(verifier, /real_time_waiting_action/);
  assert.match(verifier, /eligibility_boundary_crossing_preserves_feedback/);
  assert.match(verifier, /waiting_plan_substitutes_eligible_audit/);
  assert.match(verifier, /c3_only_navigation_kill_switch/);
  assert.match(verifier, /verifyReviewOutputRollback/);
  assert.match(verifier, /before_receipts/);
  assert.match(verifier, /before_state_data/);
  assert.match(verifier, /before_recurring_signature/);
  assert.match(verifier, /WCV_C3_REQUIRED_REVIEW_OUTPUT_INVALID/);
  assert.match(verifier, /atomic_review_output_rollback/);
  assert.match(verifier, /source_binding_mismatch_rollback/);
  assert.match(verifier, /idempotent_review_output_replay/);
  assert.match(verifier, /planner_review_state_separation/);
  assert.match(browser, /width: 390/);
  assert.match(browser, /width: 768/);
  assert.match(browser, /width: 1440/);
  assert.match(browser, /new AxeBuilder/);
  assert.match(browser, /fillLearnerResponse/);
  assert.match(browser, /waitForResponse/);
  assert.match(browser, /postDataJSON\(\)\?\.action === action/);
  assert.match(browser, /activate\("start", "검증된 C2 복구에서 시작"\)/);
  assert.match(browser, /activate\("prepare_attempt", \/독립 시도 시작\//);
  assert.match(browser, /activate\("record_evidence", "독립 시도 제출 및 검증"\)/);
  assert.match(browser, /activate\("evaluate_currently_clear", \/현재 안정 확인\//);
  assert.match(browser, /responseFor\("build_plan"\)/);
  assert.match(browser, /toHaveValue\(answerBody\)/);
  assert.match(browser, /data-wcv-c3-result-note/);
  assert.match(browser, /assertRuntimeReviewOutputs/);
  assert.match(browser, /replayedFailureResponse/);
  assert.match(browser, /secondBrowserView/);
  assert.match(browser, /practiceExport/);
  assert.match(browser, /nextAction\)\.toBe\("WAIT_FOR_ELIGIBILITY"\)/);
  assert.match(browser, /coreOutcomes\.map\(\(outcome\) => outcome\.kind\)\)\.toEqual\(\["EVIDENCE_AUDIT"\]\)/);
  assert.match(browser, /next_eligible_at_not_reached/);
  assert.match(browser, /automaticBoundaryRefresh/);
  assert.match(browser, /latestReviewOutcome\)\.toEqual\(preservedBoundaryReview\)/);
  assert.match(browser, /a\[href="\/app\/trusted-repair"\]/);
  assert.match(ui, /waitingCaseId/);
  assert.match(ui, /eligibleAtMs - Date\.now\(\) \+ 50/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /window\.clearTimeout\(timer\)/);
  assert.doesNotMatch(browser, /expectedCommitmentForFixture/);
  assert.match(browser, /cross-user|denied/);
  assert.match(await read("tests/e2e/wcv-c3-playwright.config.ts"), /timeout: 600_000/);
  assert.match(verifier, /redactedBrowserDiagnostic/);
});
