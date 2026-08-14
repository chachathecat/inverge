import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { countReferencedOpenBlockingLawSourceBlockers } from "../lib/review-os/law-source-version-registry.ts";
import {
  DEDICATED_RUNTIME_ADAPTER_PATHS,
  RUNTIME_REQUIRED_PATTERNS,
  runtimeRequiredPathRecords,
} from "../scripts/automation/runtime-risk-contract.mjs";

const SQL = "supabase/migrations/20260812011903_wcv_c2_trusted_repair_vertical.sql";
const CONTRACT = "lib/review-os/trusted-repair-contract.ts";
const MACHINE_CONTRACT = "config/wcv-c2-trusted-repair-contract-v1.json";
const LAW_REGISTRY = "lib/review-os/law-source-version-registry.ts";
const REPOSITORY = "lib/review-os/trusted-repair-repository.ts";
const ROUTE = "app/api/review-os/trusted-repair/route.ts";
const ACCESS = "lib/review-os/trusted-repair-access.ts";
const SERVER = "lib/review-os/trusted-repair-server.ts";
const ENGINE = "lib/review-os/trusted-repair-engine.ts";
const ENGINE_TEST = "tests/wcv-c2-trusted-repair-engine.test.mjs";
const SOURCE_BINDING = "lib/review-os/trusted-repair-source-binding.ts";
const UI = "components/review-os/trusted-repair-loop.tsx";
const WORKFLOW = ".github/workflows/wcv-c2-trusted-repair-runtime.yml";
const DECISION =
  "docs/decisions/2026-08-12-wcv-c2-first-trusted-repair-vertical.md";
const QA = "docs/qa/wcv-c2-first-trusted-repair-validation.md";
const APP_LAYOUT = "app/app/layout.tsx";
const APP_SHELL = "components/review-os/app-shell.tsx";
const LEARNER_UI = "components/learner/learner-ui.tsx";
const DEDICATED_RUNTIME_PATHS = [
  SQL,
  LAW_REGISTRY,
  APP_LAYOUT,
  APP_SHELL,
  LEARNER_UI,
];
const GENERIC_RUNTIME_PATTERNS = [
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  "middleware.ts",
  "app/api/notifications/**",
  "lib/notifications/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "config/paid-launch-readiness.json",
  "vercel.json",
];

function exportedStringConstant(source, constantName) {
  const match = source.match(
    new RegExp(
      `export const ${constantName}\\s*=\\s*["']([^"']+)["']\\s+as const;`,
    ),
  );
  assert.ok(match, `${constantName} must remain an exact exported string constant`);
  return match[1];
}

function exactPersistedCheckValue(sql, column) {
  const checks = [
    ...sql.matchAll(
      new RegExp(
        `${column}\\s+text\\s+not\\s+null\\s+check\\s*\\(([\\s\\S]*?)\\)`,
        "g",
      ),
    ),
  ];
  assert.equal(checks.length, 1, `${column} must have one closed CHECK`);
  const equality = checks[0][1].match(
    new RegExp(`^\\s*${column}\\s*=\\s*'([^']+)'\\s*$`),
  );
  assert.ok(equality, `${column} must accept exactly one semantic version`);
  return equality[1];
}

function sessionBindingSymbol(source, property) {
  const sessionCreation =
    source.match(/const session = \{[\s\S]*?\n      \};/)?.[0] ?? "";
  const match = sessionCreation.match(
    new RegExp(`${property}:\\s*([A-Z][A-Z0-9_]+),`),
  );
  assert.ok(match, `${property} must be assigned from an exported constant`);
  return match[1];
}

function exactCheckoutStep(source) {
  const lines = source.split("\n");
  const header = "      - name: Check out exact PR head";
  const starts = lines.flatMap((line, index) =>
    line === header ? [index] : [],
  );
  assert.equal(starts.length, 1, "workflow must have one exact checkout step");
  const start = starts[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("      - ")) {
      end = index;
      break;
    }
  }
  return {
    block: lines.slice(start, end).join("\n"),
    laterSteps: lines.slice(end).join("\n"),
  };
}

function assertCheckoutCredentialBoundary(source) {
  const { block, laterSteps } = exactCheckoutStep(source);
  const withBlock =
    block.match(/^        with:\n((?:          [^\n]+\n?)*)/m)?.[1] ?? "";
  assert.notEqual(withBlock, "", "exact checkout step must have a with block");
  assert.equal(
    (block.match(/^        uses: actions\/checkout@v4$/gm) ?? []).length,
    1,
    "exact checkout step must use actions/checkout@v4 once",
  );
  assert.equal(
    (source.match(/^\s*uses: actions\/checkout@/gm) ?? []).length,
    1,
    "workflow must have no later checkout operation",
  );
  assert.equal(
    (
      withBlock.match(
        /^          ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}$/gm,
      ) ?? []
    ).length,
    1,
    "exact checkout step must bind the pull-request head SHA",
  );
  assert.equal(
    (withBlock.match(/^          fetch-depth: 0$/gm) ?? []).length,
    1,
    "exact checkout step must retain complete history",
  );
  assert.equal(
    (withBlock.match(/^          persist-credentials: false$/gm) ?? []).length,
    1,
    "exact checkout step must disable credential persistence",
  );
  assert.equal(
    (source.match(/^\s*persist-credentials: false$/gm) ?? []).length,
    1,
    "workflow must disable credential persistence exactly once",
  );
  assert.equal(
    (source.match(/^\s*persist-credentials: true$/gm) ?? []).length,
    0,
    "workflow must never enable credential persistence",
  );
  assert.doesNotMatch(withBlock, /^\s*token:/m);
  assert.doesNotMatch(
    laterSteps,
    /\bgit\b[^\n]*\b(?:push|pull|fetch|clone|ls-remote)\b/im,
  );
  assert.doesNotMatch(laterSteps, /^\s*uses: actions\/checkout@/im);
  assert.doesNotMatch(
    laterSteps,
    /\bgit\b[^\n]*(?:credential(?:[.-]helper|\s+helper)|extraheader)\b|\bcredential-helper\b/im,
  );
}

function contractBlocker(blockerId, status, severity) {
  return {
    blockerId,
    kind: "release_ready_blocked",
    status,
    severity,
    summary: `Contract blocker ${blockerId}`,
    requiredResolver: "human_decision",
    sourceIds: [],
    sourceAnchorIds: [],
    referencePackageLinkIds: [],
    evidenceReviewLinkIds: [],
  };
}

function assertCrossSentenceScopeReduction(source) {
  assert.match(source, /const MAX_SUBJECT_LOOKBACK_TOKENS = \d+;/);
  assert.match(source, /const MAX_SUBJECT_SCOPE_KEY_LENGTH = \d+;/);
  assert.match(source, /const occurrencesByScope = new Map/);
  assert.match(source, /if \(states\.size > 1\) return "ambiguous";/);
  assert.match(source, /sameTargetConflict: aggregate\.states\.size > 1/);
  assert.match(source, /unresolvedExplicitConflict/);
  assert.match(source, /unresolvedUnscopedConflict/);
}

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

test("persisted semantic versions stay closed across TypeScript, JSON, server, and SQL", async () => {
  const [contractSource, machineContractSource, server, sql] = await Promise.all([
    readFile(CONTRACT, "utf8"),
    readFile(MACHINE_CONTRACT, "utf8"),
    readFile(SERVER, "utf8"),
    readFile(SQL, "utf8"),
  ]);
  const machineContract = JSON.parse(machineContractSource);
  const typescriptBindings = {
    fixtureVersion: exportedStringConstant(
      contractSource,
      "TRUSTED_REPAIR_FIXTURE_VERSION",
    ),
    rubricVersion: exportedStringConstant(
      contractSource,
      "TRUSTED_REPAIR_RUBRIC_VERSION",
    ),
  };
  const machineBindings = {
    fixtureVersion: machineContract.fixtureVersion,
    rubricVersion: machineContract.rubricVersion,
  };
  const serverBindings = {
    fixtureVersion: sessionBindingSymbol(server, "fixtureVersion"),
    rubricVersion: sessionBindingSymbol(server, "rubricVersion"),
  };
  const persistedBindings = {
    fixtureVersion: exactPersistedCheckValue(sql, "fixture_version"),
    rubricVersion: exactPersistedCheckValue(sql, "rubric_version"),
  };

  assert.deepEqual(machineBindings, typescriptBindings);
  assert.deepEqual(serverBindings, {
    fixtureVersion: "TRUSTED_REPAIR_FIXTURE_VERSION",
    rubricVersion: "TRUSTED_REPAIR_RUBRIC_VERSION",
  });
  assert.deepEqual(persistedBindings, typescriptBindings);
  assert.match(typescriptBindings.fixtureVersion, /\.v2$/);
  assert.match(typescriptBindings.rubricVersion, /\.v2$/);

  for (const priorVersion of Object.values(typescriptBindings).map((version) =>
    version.replace(/\.v2$/, ".v1"),
  )) {
    assert.equal(sql.split(priorVersion).length - 1, 0);
  }
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
  const [server, engine, ui] = await Promise.all([
    readFile(SERVER, "utf8"),
    readFile(ENGINE, "utf8"),
    readFile(UI, "utf8"),
  ]);
  assert.match(server, /matchingExposure/);
  assert.match(server, /selectTrustedRepairScaffoldExposure\(aggregate\)/);
  assert.match(server, /if \(!primary \|\| !matchingExposure\) return null/);
  assert.match(server, /trustedRepairSourceBindingMatches/);
  assert.match(server, /trustedRepairAggregateForRelease/);
  assert.match(server, /sourceBindingCurrent &&/);
  assert.match(server, /trustedRepairPartialRetryAvailable/);
  assert.match(server, /repairSubmissionCount/);
  assert.match(engine, /maximumImmediatePartialRetries/);
  assert.match(engine, /bounded_partial_retry_submission_committed/);
  assert.match(engine, /guardState\(input\.aggregate, \["exposure_committed", "partial"\]\)/);
  assert.match(engine, /trustedRepairSourceBindingMatches\(input\)/);
  assert.match(engine, /repair\.revisionNumber !== input\.aggregate\.session\.stateData\.revisionNumber/);
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
  assert.match(ui, /남은 기준 다시 쓰기/);
  assert.match(ui, /immediatePartialRetryAvailable/);
  assert.match(ui, /\["diagnosed", "repair_submitted", "partial"\]/);
  assert.match(ui, /aria-labelledby/);
  assert.match(ui, /role="alert"/);
  assert.doesNotMatch(ui, /openai|anthropic|gemini|chat\/completions/i);
});

test("cross-layer semantic scope reduction is bounded, fail-closed, and version preserving", async () => {
  const [engine, engineTest, machineSource, decision, qa] = await Promise.all([
    readFile(ENGINE, "utf8"),
    readFile(ENGINE_TEST, "utf8"),
    readFile(MACHINE_CONTRACT, "utf8"),
    readFile(DECISION, "utf8"),
    readFile(QA, "utf8"),
  ]);
  const machine = JSON.parse(machineSource);

  assertCrossSentenceScopeReduction(engine);
  assert.match(engine, /for \(const occurrence of occurrences\)/);
  assert.match(engine, /SUBJECT_PARTICLES = new Set\(\["은", "는", "이", "가"\]\)/);
  assert.match(engine, /ANAPHORIC_SUBJECT_SCOPES/);
  assert.match(engine, /candidate\.kind === "anaphoric"[\s\S]{0,120}lastExplicitScope/);
  assert.match(engine, /unscoped !== undefined && unscoped\.state !== "positive"/);
  assert.match(engine, /DISTINCT_COUNTEREXAMPLE_SCOPE/);
  assert.match(engine, /entry\.hasPositiveOccurrence/);
  assert.match(engine, /forbidden_claim_contradictory_positive/);
  assert.doesNotMatch(engine, /openai|anthropic|gemini|embedding|chat\/completions/i);

  assert.equal(
    machine.semanticAnchorPolarity.crossSentenceSameTargetConflict,
    "ambiguous",
  );
  assert.equal(
    machine.semanticAnchorPolarity.anaphoricTargetConflictFailsClosed,
    true,
  );
  assert.equal(machine.semanticAnchorPolarity.unscopedConflictFailsClosed, true);
  assert.equal(
    machine.semanticAnchorPolarity.distinctExplicitCounterexampleMayNotEraseCleanTargetPositive,
    true,
  );
  assert.equal(
    machine.semanticAnchorPolarity.forbiddenPositiveOccurrenceSurvivesAggregateConflict,
    true,
  );
  assert.equal(machine.semanticAnchorPolarity.externalNlpModelProviderUsed, false);

  for (const source of [decision, qa]) {
    assert.match(source, /across sentences|문장 간|문장/u);
    assert.match(source, /anaphoric|대명|지시/u);
    assert.match(source, /unscoped|unscoped|범위/u);
    assert.match(source, /distinct explicit counterexample|명시적 반례|명시적.*counterexample/u);
    assert.match(source, /positive forbidden occurrence|positive occurrence|긍정.*금지/u);
    assert.match(source, /no external NLP|외부 NLP/iu);
    assert.match(source, /semantic v2/);
  }
  assert.match(
    engineTest,
    /최유효이용은 합리적이고 가능하다\. 최유효이용은 합리적이지 않다\./,
  );
  assert.match(engineTest, /"ambiguous"/);

  const withoutSameTargetReduction = engine.replace(
    'if (states.size > 1) return "ambiguous";',
    'if (false) return "ambiguous";',
  );
  assert.notEqual(withoutSameTargetReduction, engine);
  assert.throws(
    () => assertCrossSentenceScopeReduction(withoutSameTargetReduction),
    /sameTargetConflict/,
  );

  assert.equal(
    machine.fixtureVersion,
    "wcv_c2_rights_safe_fixtures.2026-08-12.v2",
  );
  assert.equal(machine.rubricVersion, "wcv_c2_semantic_anchor_rubric.v2");
});

test("Law source binding counts only unique referenced open blocking records and fails closed", async () => {
  const [sourceBinding, registry, engine, machineContractSource] =
    await Promise.all([
      readFile(SOURCE_BINDING, "utf8"),
      readFile(LAW_REGISTRY, "utf8"),
      readFile(ENGINE, "utf8"),
      readFile(MACHINE_CONTRACT, "utf8"),
    ]);
  const machineContract = JSON.parse(machineContractSource);
  const helperSource = registry.match(
    /export function countReferencedOpenBlockingLawSourceBlockers[\s\S]*?\n}\n\nfunction hasOpenBlockingBlockers/,
  )?.[0];
  assert.ok(helperSource, "registry must export one shared active-blocker helper");

  assert.match(
    sourceBinding,
    /countReferencedOpenBlockingLawSourceBlockers,\s*\n\s*loadLawSourceVersionRegistry,/,
  );
  assert.match(
    sourceBinding,
    /const blockerIds = \[\s*\.\.\.source\.blockerIds,\s*\.\.\.anchor\.blockerIds,\s*\];/,
  );
  assert.match(
    sourceBinding,
    /countReferencedOpenBlockingLawSourceBlockers\(\s*blockerIds,\s*registry\.blockers,\s*\)/,
  );
  assert.doesNotMatch(sourceBinding, /blockerCount:\s*new Set/);
  assert.match(
    registry,
    /return blocker\.status === "open" && blocker\.severity === "blocking";/,
  );
  assert.match(registry, /unknown law-source blocker reference/);
  assert.doesNotMatch(helperSource, /console\.|rawContent|bodyText/);

  const blockers = [
    contractBlocker("contract-resolved-blocking", "resolved", "blocking"),
    contractBlocker("contract-open-warning", "open", "warning"),
    contractBlocker("contract-open-blocking", "open", "blocking"),
  ];
  assert.equal(
    countReferencedOpenBlockingLawSourceBlockers(
      ["contract-resolved-blocking", "contract-open-warning"],
      blockers,
    ),
    0,
  );
  assert.equal(
    countReferencedOpenBlockingLawSourceBlockers(
      ["contract-open-blocking", "contract-open-blocking"],
      blockers,
    ),
    1,
  );
  assert.throws(
    () =>
      countReferencedOpenBlockingLawSourceBlockers(
        ["contract-unknown-blocker"],
        blockers,
      ),
    /unknown law-source blocker reference/,
  );

  assert.match(
    sourceBinding,
    /sourceType === "synthetic"[\s\S]*return SYNTHETIC_SOURCE_BINDING;/,
  );
  assert.match(
    sourceBinding,
    /if \(!source \|\| !anchor\)[\s\S]*blockerCount: 1,/,
  );
  assert.match(
    engine,
    /`blockers-\$\{sourceBinding\.blockerCount\}`/,
  );
  assert.match(engine, /trustedRepairSourceBindingMatches\(input\)/);
  assert.match(
    engine,
    /input\.sourceBinding\.sourceStatus !== "verified" \|\|[\s\S]{0,400}input\.sourceBinding\.blockerCount > 0/,
  );
  assert.equal(
    machineContract.lawBoundary.verifiedOutcomeAllowedOnCurrentRepositoryState,
    false,
  );
});

test("generic Runtime Gate delegates exact C2 paths to a fork-safe read-only pull_request check", async () => {
  const [workflow, appLayout, appShell, learnerUi] = await Promise.all([
    readFile(WORKFLOW, "utf8"),
    readFile(APP_LAYOUT, "utf8"),
    readFile(APP_SHELL, "utf8"),
    readFile(LEARNER_UI, "utf8"),
  ]);
  assert.deepEqual(DEDICATED_RUNTIME_ADAPTER_PATHS, DEDICATED_RUNTIME_PATHS);
  assert.deepEqual(RUNTIME_REQUIRED_PATTERNS, GENERIC_RUNTIME_PATTERNS);
  assert.deepEqual(runtimeRequiredPathRecords(DEDICATED_RUNTIME_PATHS), []);
  for (const delegatedPath of DEDICATED_RUNTIME_ADAPTER_PATHS) {
    assert.equal(
      (workflow.match(new RegExp(`- ["']${delegatedPath}["']`, "g")) ?? [])
        .length,
      1,
    );
  }
  assert.match(appLayout, /requireTrustedRepairAccess\(\)/);
  assert.match(appLayout, /trustedRepairEnabled/);
  assert.match(appShell, /trustedRepairEnabled=\{trustedRepairEnabled\}/);
  assert.match(learnerUi, /trustedRepairEnabled\s*\?/);
  assert.match(learnerUi, /href: "\/app\/trusted-repair"/);
  assert.doesNotMatch(
    workflow,
    /github\.event\.pull_request\.head\.ref\s*==/,
  );
  assert.match(workflow, /on:\s*\n\s+pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(workflow, /head\.repo|github\.repository|github\.actor/);
  assert.doesNotMatch(workflow, /\b(?:fork|source[_ -]?repo)\b/i);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /permissions:[\s\S]*?\b(?:write|id-token)\b/i);
  assert.doesNotMatch(workflow, /- ["']app\/app\/\*\*["']/);
  assert.doesNotMatch(workflow, /- ["']components\/\*\*["']/);
  assert.doesNotMatch(workflow, /- ["']lib\/\*\*["']/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /--cleanup/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assertCheckoutCredentialBoundary(workflow);
  const workflowWithoutCredentialBoundary = workflow.replace(
    /^          persist-credentials: false\n/m,
    "",
  );
  assert.notEqual(workflowWithoutCredentialBoundary, workflow);
  assert.throws(
    () => assertCheckoutCredentialBoundary(workflowWithoutCredentialBoundary),
    /disable credential persistence/,
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
  assert.deepEqual(contract.partialRepairRetry, {
    immediateRetryLimit: 1,
    sameSessionRequired: true,
    confirmedRevisionAndPrimaryGapPreserved: true,
    repairSubmissionsAppendOnly: true,
    latestEligibleRepairEvaluated: true,
    serverEnforced: true,
    casAndIdempotencyRequired: true,
    afterLimitAlternatives: ["DEFER_FOR_NOW", "SWITCH_TO_GUIDED"],
    positiveEvidenceCreatedByPartialOrRetrySubmission: false,
  });
  assert.equal(contract.semanticAnchorPolarity.positiveAssertionRequired, true);
  assert.equal(
    contract.semanticAnchorPolarity.negatedOrAntonymOccurrenceCountsAsPositive,
    false,
  );
  assert.deepEqual(contract.semanticAnchorPolarity.assertionStates, [
    "positive",
    "negated",
    "ambiguous",
    "absent",
  ]);
  assert.deepEqual(contract.semanticAnchorPolarity.oneBoundedEvaluatorFor, [
    "requiredConcepts",
    "acceptableAlternatives",
    "forbiddenFalseClaims",
  ]);
  assert.equal(
    contract.semanticAnchorPolarity.forbiddenFalseClaimsBlockOnlyWhenPositive,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.acceptableAlternativesSatisfyExplicitMappedConceptsOnly,
    true,
  );
  assert.equal(contract.semanticAnchorPolarity.completeSemanticTokenRequired, true);
  assert.equal(
    contract.semanticAnchorPolarity.unrelatedLexicalSubstringCountsAsOccurrence,
    false,
  );
  assert.equal(
    contract.semanticAnchorPolarity.sameClausePositiveNegatedConflict,
    "ambiguous",
  );
  assert.equal(
    contract.semanticAnchorPolarity.sameClauseAmbiguousMixFailsClosed,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.everyOccurrenceInspectedBeforeClauseDecision,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.independentCleanPositiveClauseMayWinOverSeparateNegatedCounterexample,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.crossSentenceSameTargetConflict,
    "ambiguous",
  );
  assert.equal(
    contract.semanticAnchorPolarity.anaphoricTargetConflictFailsClosed,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.unscopedConflictFailsClosed,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.distinctExplicitCounterexampleMayNotEraseCleanTargetPositive,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.forbiddenPositiveOccurrenceSurvivesAggregateConflict,
    true,
  );
  assert.equal(
    contract.semanticAnchorPolarity.externalNlpModelProviderUsed,
    false,
  );
  assert.equal(
    contract.fixtureVersion,
    "wcv_c2_rights_safe_fixtures.2026-08-12.v2",
  );
  assert.equal(contract.rubricVersion, "wcv_c2_semantic_anchor_rubric.v2");
  assert.deepEqual(contract.dedicatedRuntime, {
    protectedPaths: DEDICATED_RUNTIME_PATHS,
    event: "pull_request",
    sameRepositoryPullRequests: true,
    forkPullRequests: true,
    pullRequestTargetAllowed: false,
    permissions: { contents: "read" },
    repositorySecretsAllowed: false,
    writeCapableTokensAllowed: false,
    githubHostedEphemeralRunnerRequired: true,
    exactPullRequestHeadCheckout: true,
    remoteSupabaseOrProviderAccessAllowed: false,
    metadataOnlyArtifact: true,
  });
});
