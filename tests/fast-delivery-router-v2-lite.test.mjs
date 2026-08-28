import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  classify,
  declaredLaneRiskFromBody,
  evaluateMediumSourceOnlyEligibility,
  loadRouterContract,
  normalizeRepositoryPath,
} from "../scripts/automation/classify-risk.mjs";
import {
  evaluateAutomaticMergeEvidence,
  reviewEvidence,
} from "../scripts/automation/automatic-merge-v2-lite.mjs";

const contract = loadRouterContract();
const head = "a".repeat(40);

function classificationFor(files, options = {}) {
  return classify(files, options.signals ?? [], options.contract ?? contract, {
    declaredLaneRisk: options.declaredLaneRisk,
  });
}

function assertProfile(files, profile, options = {}) {
  const result = classificationFor(Array.isArray(files) ? files : [files], options);
  assert.equal(result.profile, profile, `${JSON.stringify(files)} should be ${profile}`);
  return result;
}

function greenChecks() {
  return Object.fromEntries(contract.requiredExactHeadChecks.map((name, index) => [
    name,
    contract.requiredCheckProducers[name].source === "check_run"
      ? {
        id: index + 1,
        terminal: true,
        success: true,
        state: "success",
        source: "check_run",
        appSlug: contract.requiredCheckProducers[name].appSlug,
        appId: contract.requiredCheckProducers[name].appId,
      }
      : {
        id: index + 1,
        terminal: true,
        success: true,
        state: "success",
        source: "commit_status",
        avatarUrl: `${contract.requiredCheckProducers[name].avatarUrlPrefix}?v=4`,
        targetUrl: `${contract.requiredCheckProducers[name].targetUrlPrefix}fixture`,
      },
  ]));
}

function pullRequest(overrides = {}) {
  return {
    state: "OPEN",
    isDraft: true,
    isCrossRepository: false,
    mergeable: "MERGEABLE",
    headRefName: "codex/fixture",
    headRefOid: head,
    baseRefName: "main",
    labels: { nodes: [], pageInfo: { hasNextPage: false } },
    files: { nodes: [{ path: "docs/qa/fixture.md" }], pageInfo: { hasNextPage: false } },
    reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } },
    ...overrides,
  };
}

function review(overrides = {}) {
  return {
    formalReviewClean: true,
    trustedCleanReviewCount: 1,
    latestChangesRequestedCount: 0,
    unresolvedThreadCount: 0,
    ...overrides,
  };
}

function automaticDecision(overrides = {}) {
  return evaluateAutomaticMergeEvidence({
    contract,
    pr: pullRequest(overrides.pr),
    expectedHead: overrides.expectedHead ?? head,
    classification: overrides.classification ?? assertProfile("docs/qa/fixture.md", "LOW"),
    checkStates: overrides.checkStates ?? greenChecks(),
    review: review(overrides.review),
    mediumSourceOnly: overrides.mediumSourceOnly ?? { eligible: false },
    baseContained: overrides.baseContained ?? true,
    ruleset: overrides.ruleset ?? { clean: true, blockers: [] },
  });
}

test("machine contract has exactly three public profiles and an empty installed source-only registry", () => {
  assert.deepEqual(contract.publicProfilesExactly, ["LOW", "MEDIUM", "HIGH"]);
  assert.equal(contract.unknownEquals, "HIGH");
  assert.equal(contract.mediumSourceOnly.isNotAPublicProfile, true);
  assert.equal(contract.mediumSourceOnly.isAConditionalEligibilitySubtypeOf, "MEDIUM");
  assert.deepEqual(contract.mediumSourceOnly.registeredLanes, []);
  assert.deepEqual(contract.automaticMerge.allowedCandidateKindsExactly, ["LOW", "MEDIUM_SOURCE_ONLY"]);
  assert.equal(contract.automaticMerge.ordinaryMediumEnabled, false);
  assert.equal(contract.automaticMerge.highEnabled, false);
  assert.equal(contract.automaticMerge.unknownEnabled, false);
  assert.equal(contract.protectedMainRuleset.target, "branch");
  assert.deepEqual(contract.protectedMainRuleset.refNameIncludeExactly, ["~DEFAULT_BRANCH"]);
  assert.deepEqual(
    Object.keys(contract.requiredCheckProducers).sort(),
    [...contract.requiredExactHeadChecks].sort(),
  );
});

test("only exact non-executable allowlist combinations classify LOW", () => {
  for (const filePath of [
    "config/examples/sample.json",
    "docs/examples/sample.md",
    "docs/qa/sample.md",
  ]) {
    const result = assertProfile(filePath, "LOW");
    assert.equal(result.automaticMergeCandidate, true);
    assert.equal(result.automaticMergeEligible, false);
    assert.equal(result.ownerApprovalRequired, false);
  }
});

test("hostile LOW escapes cannot remain LOW", () => {
  assertProfile("docs/qa/executable.mjs", "MEDIUM");
  assertProfile("tests/fixtures/executable.ts", "MEDIUM");
  for (const filePath of [
    "README.md",
    "docs/readme.md",
    "docs/qaish/sample.md",
    "docs/qa/sample.css",
    "docs/strategy/product.md",
    "evals/fixtures/quality.json",
    "tests/fixtures/acceptance.json",
    "docs/qa/../decisions/owner.md",
    "docs\\qa\\sample.md",
    "/docs/qa/sample.md",
    "C:/docs/qa/sample.md",
    "docs//qa/sample.md",
    "docs/qa/sample.md ",
  ]) {
    const result = assertProfile(filePath, "HIGH");
    assert.equal(result.ownerApprovalRequired, true);
  }
  assert.equal(normalizeRepositoryPath("docs/qa/sample.md"), "docs/qa/sample.md");
});

test("every executable source or test outside HIGH has a MEDIUM floor", () => {
  for (const filePath of [
    "lib/review-os/example.ts",
    "components/example.tsx",
    "tests/example.test.mjs",
    "scripts/helpers/example.mjs",
    "tools/example.py",
    "tools/example.ps1",
    "tools/example.sh",
  ]) {
    const result = assertProfile(filePath, "MEDIUM");
    assert.equal(result.automaticMergeCandidate, false);
    assert.equal(result.ownerApprovalRequired, false);
  }
});

test("closed authority and runtime path families classify HIGH", () => {
  for (const filePath of [
    ".github/workflows/ci-fast.yml",
    ".github/dependabot.yml",
    "AGENTS.md",
    "nested/AGENTS.md",
    "config/agent-risk-policy.yml",
    "config/dabangil-fast-delivery-router-v2-lite.json",
    "docs/decisions/2026-08-28-owner.md",
    "docs/exec-plans/active/program.md",
    "roadmap/active-program.yml",
    "package.json",
    "package-lock.json",
    "packages/example/package.json",
    "app/api/example/route.ts",
    "src/pages/api/example.ts",
    "app/example/route.ts",
    "server/example.ts",
    "workers/example.ts",
    "supabase/migrations/example.sql",
    "lib/auth/example.ts",
    "lib/providers/example.ts",
    "src/lib/network/example.ts",
    "lib/payments/example.ts",
    "lib/stripe/example.ts",
    "public/activation.json",
    "scripts/automation/classify-risk.mjs",
    "scripts/automation/release-candidate.mjs",
    "next.config.mjs",
    "vercel.json",
    "unknown/path.txt",
  ]) {
    const result = assertProfile(filePath, "HIGH");
    assert.equal(result.automaticMergeEligible, false);
    assert.equal(result.ownerApprovalRequired, true);
  }
});

test("signals and lane declarations only raise the computed floor", () => {
  assertProfile("docs/qa/sample.md", "HIGH", { signals: ["new_dependency"] });
  assertProfile("docs/qa/sample.md", "HIGH", { signals: ["not_a_registered_signal"] });
  assertProfile("docs/qa/sample.md", "HIGH", { declaredLaneRisk: "HIGH" });
  assertProfile("tests/example.test.mjs", "MEDIUM", { declaredLaneRisk: "LOW" });
  assertProfile(".github/workflows/ci.yml", "HIGH", { declaredLaneRisk: "LOW" });
  assertProfile("docs/qa/sample.md", "HIGH", { declaredLaneRisk: "invented" });
  assert.equal(declaredLaneRiskFromBody("FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK HIGH"), "HIGH");
  assert.equal(declaredLaneRiskFromBody("FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK LOW extra"), "INVALID");
  assert.equal(declaredLaneRiskFromBody([
    "FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK LOW",
    "FAST_DELIVERY_ROUTER_V2_LITE_DECLARED_RISK HIGH",
  ].join("\n")), "INVALID");
});

test("empty, duplicate and oversized changed-path evidence fails closed", () => {
  assertProfile([], "HIGH");
  assertProfile(["docs/qa/a.md", "docs/qa/a.md"], "HIGH");
  assertProfile(Array.from({ length: 201 }, (_, index) => `docs/qa/${index}.md`), "HIGH");
});

test("runtime evidence compatibility is preserved for governed runtime paths", () => {
  const migration = assertProfile("supabase/migrations/20260828_fixture.sql", "HIGH");
  assert.equal(migration.runtimeEvidenceRequired, true);
  const workflow = assertProfile(".github/workflows/ci-fast.yml", "HIGH");
  assert.equal(workflow.runtimeEvidenceRequired, false);
});

test("MEDIUM_SOURCE_ONLY fails without a trusted-main registration", () => {
  const classification = assertProfile("lib/offline-lane/foundry.ts", "MEDIUM");
  const result = evaluateMediumSourceOnlyEligibility({
    classification,
    contract,
    laneDeclaration: { laneId: "offline", branch: "codex/offline" },
    headRefName: "codex/offline",
    evidence: Object.fromEntries(contract.mediumSourceOnly.requiredEvidenceKeys.map((key) => [key, true])),
  });
  assert.equal(result.eligible, false);
  assert(result.blockers.includes("lane_not_registered_on_trusted_main"));
});

test("MEDIUM_SOURCE_ONLY requires exact registration, ownership and every closed evidence key", () => {
  const registered = structuredClone(contract);
  registered.mediumSourceOnly.registeredLanes = [{
    laneId: "offline",
    branch: "codex/offline",
    ownedPathPrefixes: ["lib/offline-lane/"],
    inertSourceOnly: true,
    activationDefaultOff: true,
    runtimeConnected: false,
    remoteMutationAllowed: false,
  }];
  const classification = assertProfile("lib/offline-lane/foundry.ts", "MEDIUM", { contract: registered });
  const evidence = Object.fromEntries(registered.mediumSourceOnly.requiredEvidenceKeys.map((key) => [key, true]));
  const eligible = evaluateMediumSourceOnlyEligibility({
    classification,
    contract: registered,
    laneDeclaration: { laneId: "offline", branch: "codex/offline" },
    headRefName: "codex/offline",
    evidence,
  });
  assert.deepEqual(eligible, { eligible: true, candidateKind: "MEDIUM_SOURCE_ONLY", blockers: [], laneId: "offline" });

  const missingEvidence = { ...evidence, noExistingRuntimeReference: false };
  const blocked = evaluateMediumSourceOnlyEligibility({
    classification,
    contract: registered,
    laneDeclaration: { laneId: "offline", branch: "codex/offline" },
    headRefName: "codex/offline",
    evidence: missingEvidence,
  });
  assert.equal(blocked.eligible, false);
  assert(blocked.blockers.includes("missing_evidence:noExistingRuntimeReference"));

  const outsideOwnership = assertProfile("lib/other-lane/foundry.ts", "MEDIUM", { contract: registered });
  assert.equal(evaluateMediumSourceOnlyEligibility({
    classification: outsideOwnership,
    contract: registered,
    laneDeclaration: { laneId: "offline", branch: "codex/offline" },
    headRefName: "codex/offline",
    evidence,
  }).eligible, false);

  assert.equal(evaluateMediumSourceOnlyEligibility({
    classification,
    contract: registered,
    laneDeclaration: { laneId: "offline", branch: "codex/offline" },
    headRefName: "codex/different",
    evidence,
  }).eligible, false);
});

test("the latest trusted exact-head review must carry the clean formal marker", () => {
  const marker = `${contract.automaticMerge.freshTrustedReviewMarker} head=${head} actionable=0/0/0`;
  const cleanReview = {
    author: { login: "owner" },
    authorAssociation: "OWNER",
    body: marker,
    state: "COMMENTED",
    submittedAt: "2026-08-28T00:00:00Z",
    commit: { oid: head },
  };
  const pr = {
    reviews: { nodes: [cleanReview] },
    reviewThreads: { nodes: [] },
  };
  assert.equal(reviewEvidence(pr, head, contract).formalReviewClean, true);

  const laterNonterminalReview = {
    ...cleanReview,
    body: "A later review without the clean terminal marker.",
    submittedAt: "2026-08-28T00:01:00Z",
  };
  assert.equal(reviewEvidence({ ...pr, reviews: { nodes: [cleanReview, laterNonterminalReview] } }, head, contract).formalReviewClean, false);

  const laterChangesRequested = {
    ...cleanReview,
    state: "CHANGES_REQUESTED",
    body: "Actionable finding",
    submittedAt: "2026-08-28T00:02:00Z",
  };
  const blocked = reviewEvidence({ ...pr, reviews: { nodes: [cleanReview, laterChangesRequested] } }, head, contract);
  assert.equal(blocked.formalReviewClean, false);
  assert.equal(blocked.latestChangesRequestedCount, 1);
});

test("LOW automatic merge gate requires every exact-head proof", () => {
  assert.deepEqual(automaticDecision(), {
    eligible: true,
    candidateKind: "LOW",
    computedProfile: "LOW",
    ownerApprovalRequired: false,
    blockers: [],
  });

  const hostileCases = [
    automaticDecision({ expectedHead: "b".repeat(40) }),
    automaticDecision({ baseContained: false }),
    automaticDecision({ ruleset: { clean: false, blockers: ["ruleset_required_check_drift"] } }),
    automaticDecision({ pr: { mergeable: "CONFLICTING" } }),
    automaticDecision({ pr: { isCrossRepository: true } }),
    automaticDecision({ pr: { labels: { nodes: [{ name: "do-not-merge" }], pageInfo: { hasNextPage: false } } } }),
    automaticDecision({ pr: { files: { nodes: [], pageInfo: { hasNextPage: true } } } }),
    automaticDecision({ review: { formalReviewClean: false } }),
    automaticDecision({ review: { latestChangesRequestedCount: 1 } }),
    automaticDecision({ review: { unresolvedThreadCount: 1 } }),
  ];
  for (const result of hostileCases) assert.equal(result.eligible, false);

  const missingCheck = greenChecks();
  delete missingCheck[contract.requiredExactHeadChecks[0]];
  assert.equal(automaticDecision({ checkStates: missingCheck }).eligible, false);
  const failedCheck = greenChecks();
  failedCheck[contract.requiredExactHeadChecks[1]] = { terminal: true, success: false };
  assert.equal(automaticDecision({ checkStates: failedCheck }).eligible, false);

  const spoofedActionCheck = greenChecks();
  spoofedActionCheck["risk-classifier"] = { ...spoofedActionCheck["risk-classifier"], appId: 1 };
  assert.equal(automaticDecision({ checkStates: spoofedActionCheck }).eligible, false);
  const ambiguousActionCheck = greenChecks();
  ambiguousActionCheck["risk-classifier"] = { ...ambiguousActionCheck["risk-classifier"], ambiguousSources: true };
  assert.equal(automaticDecision({ checkStates: ambiguousActionCheck }).eligible, false);
  const spoofedVercel = greenChecks();
  spoofedVercel.Vercel = { ...spoofedVercel.Vercel, targetUrl: "https://example.invalid/deployment" };
  assert.equal(automaticDecision({ checkStates: spoofedVercel }).eligible, false);
});

test("HIGH, unknown and ordinary MEDIUM can never pass the automatic gate", () => {
  const high = automaticDecision({ classification: assertProfile("unknown/file.txt", "HIGH") });
  assert.equal(high.eligible, false);
  assert.equal(high.ownerApprovalRequired, true);
  assert(high.blockers.includes("profile_not_automatically_mergeable:HIGH"));

  const medium = automaticDecision({ classification: assertProfile("tests/example.test.mjs", "MEDIUM") });
  assert.equal(medium.eligible, false);
  assert(medium.blockers.includes("profile_not_automatically_mergeable:MEDIUM"));

  const registeredMedium = automaticDecision({
    classification: assertProfile("tests/example.test.mjs", "MEDIUM"),
    mediumSourceOnly: { eligible: true },
  });
  assert.equal(registeredMedium.eligible, true);
  assert.equal(registeredMedium.candidateKind, "MEDIUM_SOURCE_ONLY");
});

test("workflow wiring stays trusted-main, stable-name and free of PR #737 upgrades", () => {
  const autoWorkflow = fs.readFileSync(".github/workflows/auto-merge.yml", "utf8");
  const riskWorkflow = fs.readFileSync(".github/workflows/risk-classifier.yml", "utf8");
  assert.match(autoWorkflow, /pull_request_review:/);
  assert.match(autoWorkflow, /ref: main/);
  assert.match(autoWorkflow, /persist-credentials: false/);
  assert.doesNotMatch(autoWorkflow, /pull_request_target/);
  assert.doesNotMatch(autoWorkflow, /ref:\s*\$\{\{[^\n]*head/);
  assert.match(riskWorkflow, /name: risk-classifier/);
  assert.match(riskWorkflow, /classify-risk\.mjs --validate-route/);
  assert.match(riskWorkflow, /fast-delivery-router-v2-lite\.test\.mjs/);
  const actor = fs.readFileSync("scripts/automation/automatic-merge-v2-lite.mjs", "utf8");
  assert.match(actor, /--match-head-commit/);
  for (const workflow of [autoWorkflow, riskWorkflow]) {
    assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node|upload-artifact)@v7/);
  }

  const workflowCount = fs.readdirSync(path.resolve(".github/workflows"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name)).length;
  assert.equal(workflowCount, contract.workflowCount.before);
  assert.equal(workflowCount, contract.workflowCount.after);
});

test("router is path-only and does not install semantic or data-flow analysis", () => {
  const classifier = fs.readFileSync("scripts/automation/classify-risk.mjs", "utf8");
  const actor = fs.readFileSync("scripts/automation/automatic-merge-v2-lite.mjs", "utf8");
  assert.doesNotMatch(classifier, /from\s+["']typescript["']|createSourceFile|CodeQL|data[-_ ]flow/i);
  assert.doesNotMatch(actor, /checkout[^\n]*pull_request|pull_request_target|from\s+["']typescript["']/i);
  assert.equal(contract.activationBoundary.public, false);
  assert.equal(contract.activationBoundary.payment, false);
  assert.equal(contract.activationBoundary.externalLearner, false);
  assert.equal(contract.activationBoundary.remoteSupabase, false);
  assert.equal(contract.activationBoundary.production, false);
});

test("contract owns exactly ten disjoint candidate paths", () => {
  assert.equal(contract.changedPathsExactly.length, 10);
  assert.equal(new Set(contract.changedPathsExactly).size, 10);
  assert(contract.changedPathsExactly.every((filePath) => !filePath.startsWith("scripts/run-node-tests.mjs")));
  assert(contract.changedPathsExactly.every((filePath) => !filePath.includes("fast-owner-preview-runtime")));
});
