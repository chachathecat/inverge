import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AMENDMENT_ID,
  QF_ORDER,
  REQUIRED_STABLE_CHECKS,
  evaluateAutomaticMerge,
  evaluateMergeReceiptEvidence,
  validateAuthority,
  validateCandidateChangedPaths,
  validateLaneChangedPaths,
} from "../scripts/automation/fast-delivery-parallel-v2.mjs";
import {
  classify,
  deriveSemanticHighRiskSignals,
  findRegisteredLaneProfileOverride,
  findRegisteredLaneRegistration,
  parsePolicy,
} from "../scripts/automation/classify-risk.mjs";
import { parseChangedJson, selectChangedEvidence } from "../scripts/automation/validation-profile-v2.mjs";

const root = new URL("../", import.meta.url);
const contract = JSON.parse(await readFile(new URL("../config/dabangil-fast-delivery-parallel-execution-v2.json", import.meta.url), "utf8"));

function clone(value) {
  return structuredClone(value);
}

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

function passingSnapshot(overrides = {}) {
  const headSha = "a".repeat(40);
  const completedAt = "2026-08-27T01:00:00.000Z";
  return {
    state: "OPEN",
    isDraft: true,
    mergeStateStatus: "BLOCKED",
    baseRefName: "main",
    sameRepository: true,
    registeredLane: true,
    registeredLaneId: QF_ORDER[1],
    pathOwnershipValid: true,
    isolatedWorktreeDeclared: true,
    expectedHeadSha: headSha,
    headSha,
    profile: "LOW",
    classifierHeadSha: headSha,
    derivedHighRiskSignals: [],
    semanticSignalEvidenceComplete: true,
    changedPathCount: 3,
    laneGateEvidence: {
      currentLaneId: QF_ORDER[1],
      currentPullRequestNumber: 900,
      currentPullRequestObservedOnce: true,
      currentLanePriorMergedCount: 0,
      currentMainSha: "b".repeat(40),
      requiredReceiptIds: [AMENDMENT_ID, QF_ORDER[0]],
      validatedReceiptIds: [AMENDMENT_ID, QF_ORDER[0]],
      directDependencyIds: [QF_ORDER[0]],
      directDependenciesSatisfied: true,
      declaredMergePrefixSatisfied: true,
      openLaneIds: [QF_ORDER[1]],
      concurrencyValid: true,
    },
    labels: [],
    checks: Object.fromEntries(REQUIRED_STABLE_CHECKS.map((name) => [name, {
      headSha,
      conclusion: "SUCCESS",
      completedAt,
    }])),
    finalReview: {
      headSha,
      actionableP0P1P2: [0, 0, 0],
      formal: true,
      trustedReviewer: true,
      submittedAt: "2026-08-27T01:01:00.000Z",
    },
    unresolvedNonOutdatedReviewThreads: 0,
    blockingCurrentHeadReviewCount: 0,
    mergeable: "MERGEABLE",
    ...overrides,
  };
}

function passingReceipt(laneId = AMENDMENT_ID) {
  const headSha = "c".repeat(40);
  const baseSha = laneId === AMENDMENT_ID ? contract.deliveryControl.baseSha : "b".repeat(40);
  const lane = laneId === AMENDMENT_ID
    ? contract.candidateLane
    : contract.questionFoundrySplitCampaign.lanes.find((entry) => entry.laneId === laneId);
  return {
    state: "MERGED",
    mergedAt: "2026-08-27T01:04:00.000Z",
    mergeCommitOnMain: true,
    summaryHeadSha: headSha,
    headSha,
    headRefName: lane.branch,
    baseRefName: "main",
    baseSha,
    mergeParentSha: baseSha,
    mergeParentCount: 1,
    baseCommitOnMain: true,
    sameRepository: true,
    changedPaths: [...lane.ownedPathsExactly],
    worktreeDeclarationCount: 1,
    checks: Object.fromEntries(REQUIRED_STABLE_CHECKS.map((name) => [name, {
      headSha,
      conclusion: "SUCCESS",
      completedAt: "2026-08-27T01:00:00.000Z",
    }])),
    finalReview: {
      headSha,
      actionableP0P1P2: [0, 0, 0],
      formal: true,
      trustedReviewer: true,
      submittedAt: "2026-08-27T01:01:00.000Z",
    },
    ownerApproval: laneId === AMENDMENT_ID ? {
      headSha,
      marker: `${contract.mergePolicy.v2OwnerApprovalReceiptMarkerPrefix}${headSha}`,
      authorLogin: contract.mergePolicy.v2OwnerApprovalActorLogin,
      authorAssociation: contract.mergePolicy.v2OwnerApprovalAuthorAssociation,
      submittedAt: "2026-08-27T01:02:00.000Z",
    } : null,
    unresolvedNonOutdatedReviewThreads: 0,
    blockingCurrentHeadReviewCount: 0,
  };
}

test("V2 authority is closed, fail-closed, and product-inert", () => {
  assert.deepEqual(validateAuthority(contract), { ok: true, errors: [] });
  assert.equal(contract.authorityStatus, "effective_only_after_exact_head_owner_approved_squash_merge_and_validated_github_receipt");
  assert.deepEqual(contract.stableRequiredCheckNames, REQUIRED_STABLE_CHECKS);
  assert.deepEqual(contract.questionFoundrySplitCampaign.declaredIntegrationAndMergeOrder, QF_ORDER);
  assert.equal(contract.questionFoundrySplitCampaign.monolithicReplacementProhibited, true);
  assert.equal(contract.questionFoundrySplitCampaign.maximumConcurrentMergeProducingLanes, 2);
  assert.equal(contract.riskClassifier.registeredLaneProfileCannotOverrideSemanticHighRiskSignal, true);
  assert.equal(contract.mergePolicy.completePostReadyGateReevaluationRequired, true);
  assert.equal(contract.mergePolicy.validatedReceiptBindsExactLanePathsAndDeclaration, true);
  assert.equal(contract.mergePolicy.receiptReviewAndApprovalMustPrecedeMerge, true);
  assert.equal(contract.mergePolicy.registeredLaneMayMergeOnlyOnce, true);
  assert.ok(Object.values(contract.activationBoundary).every((value) => value === false));
  assert.deepEqual(validateCandidateChangedPaths(contract, contract.candidateLane.ownedPathsExactly), { ok: true, errors: [] });
  assert.match(
    validateCandidateChangedPaths(contract, contract.candidateLane.ownedPathsExactly.slice(1)).errors.join("\n"),
    /candidate manifest path is missing/u,
  );
});

test("Question Foundry manifests are exact, disjoint, and dependency ordered", () => {
  const allPaths = contract.questionFoundrySplitCampaign.lanes.flatMap((lane) => lane.ownedPathsExactly);
  assert.equal(new Set(allPaths).size, allPaths.length);
  assert.ok(allPaths.every((value) => !/[?*\[\]{}\\]/u.test(value)));
  const s1 = contract.questionFoundrySplitCampaign.lanes[1];
  assert.deepEqual(validateLaneChangedPaths(contract, s1.laneId, s1.ownedPathsExactly), { ok: true, errors: [] });
  assert.match(
    validateLaneChangedPaths(contract, s1.laneId, [...s1.ownedPathsExactly, "docs/exec-plans/active/inverge-owner-study-os.md"], { includeSerialIntegrationPaths: true }).errors.join("\n"),
    /undeclared changed path/u,
  );
  const escaped = validateLaneChangedPaths(contract, s1.laneId, [...s1.ownedPathsExactly, "../outside"]);
  assert.equal(escaped.ok, false);
  assert.match(escaped.errors.join("\n"), /invalid or globbed|undeclared changed path/u);
});

test("authority rejects path overlap, release leakage, and dependency drift", () => {
  const overlapping = clone(contract);
  overlapping.questionFoundrySplitCampaign.lanes[2].ownedPathsExactly[0] =
    overlapping.questionFoundrySplitCampaign.lanes[1].ownedPathsExactly[0];
  assert.match(validateAuthority(overlapping).errors.join("\n"), /owned path overlap/u);

  const expanded = clone(contract);
  expanded.questionFoundrySplitCampaign.lanes[1].ownedPathsExactly.push("config/dabangil-fast-delivery-parallel-execution-v2.json");
  assert.match(validateAuthority(expanded).errors.join("\n"), /exact path manifest drifted/u);

  const released = clone(contract);
  released.questionFoundrySplitCampaign.lanes[0].releaseStatesAvailable = ["PERSONAL_LEARNING_USABLE"];
  assert.match(validateAuthority(released).errors.join("\n"), /QF-0 must expose no release state/u);

  const earlyIntegration = clone(contract);
  earlyIntegration.questionFoundrySplitCampaign.lanes[4].dependencies.pop();
  assert.match(validateAuthority(earlyIntegration).errors.join("\n"), /QF-I1 dependency drifted/u);

  const parallelSharedMutation = clone(contract);
  parallelSharedMutation.questionFoundrySplitCampaign.lanes[1].serialIntegrationPathsExactly = ["scripts/run-node-tests.mjs"];
  assert.match(validateAuthority(parallelSharedMutation).errors.join("\n"), /shared serial integration paths are prohibited/u);
});

test("risk routing is specific-low before broad-medium and unknown fails HIGH", () => {
  const policy = parsePolicy(new URL("../config/agent-risk-policy.yml", import.meta.url));
  assert.equal(classify(["docs/qa/example.md"], [], policy).profile, "LOW");
  assert.equal(classify(["lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs"], [], policy).profile, "LOW");
  assert.equal(classify(["lib/question-foundry/quarantine-core-v1.mjs"], [], policy).profile, "MEDIUM");
  assert.equal(classify([".github/workflows/ci-fast.yml"], [], policy).profile, "HIGH");
  assert.equal(classify(["unclassified/new-kind.bin"], [], policy).profile, "HIGH");

  const s1 = contract.questionFoundrySplitCampaign.lanes[1];
  const registeredPaths = [...s1.ownedPathsExactly];
  const override = findRegisteredLaneProfileOverride(registeredPaths, s1.branch);
  assert.equal(override, "LOW");
  assert.equal(classify(registeredPaths, [], policy, { profileOverride: override }).profile, "LOW");
  assert.equal(classify(registeredPaths, ["durable_release_authority"], policy, { profileOverride: override }).profile, "HIGH");
  assert.equal(
    findRegisteredLaneProfileOverride([...registeredPaths, contract.questionFoundrySplitCampaign.serialProgramLogIntegration.path], s1.branch),
    null,
  );
  assert.equal(findRegisteredLaneProfileOverride([...registeredPaths, "AGENTS.md"], s1.branch), null);

  const semanticSignals = deriveSemanticHighRiskSignals([{
    path: "lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs",
    patch: "@@ -0,0 +1 @@\n+return 'TRANSFER_VERIFIED';\n",
  }]);
  assert.deepEqual(semanticSignals, ["durable_release_authority"]);
  assert.equal(classify(registeredPaths, semanticSignals, policy, { profileOverride: override }).profile, "HIGH");
  assert.deepEqual(deriveSemanticHighRiskSignals([{ path: registeredPaths[0] }]), ["uninspectable_change"]);
  assert.deepEqual(deriveSemanticHighRiskSignals([{
    path: registeredPaths[0],
    patch: "@@ -0,0 +1 @@\n+export const safe = true;\n",
    patchComplete: false,
  }]), ["uninspectable_change"]);
  assert.deepEqual(deriveSemanticHighRiskSignals([{
    path: "lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs",
    patch: "@@ -1 +1 @@\n-throw new Error('fail closed');\n+return candidate;\n",
  }]), ["security_boundary_weakening"]);
  assert.equal(classify(registeredPaths, ["uninspectable_change"], policy, { profileOverride: override }).profile, "HIGH");

  const networkModules = [
    "http", "node:http", "https", "node:https", "http2", "node:http2", "net", "node:net",
    "tls", "node:tls", "dns", "node:dns", "dgram", "node:dgram", "undici", "undici/index.js",
    "axios", "axios/index.js", "got", "got/dist/source", "@supabase/supabase-js", "stripe", "@stripe/stripe-js",
  ];
  for (const networkModule of networkModules) {
    for (const networkSource of [
      `import {\n  request as transmit\n} from /* boundary */ "${networkModule}";`,
      `export {\n  request as transmit\n} from /* boundary */ "${networkModule}";`,
      `const client = await import(/* boundary */ "${networkModule}");`,
      `const client = require(/* boundary */ "${networkModule}");`,
      `} from "${networkModule}";`,
    ]) {
      const addedNetworkSource = networkSource.split("\n").map((line) => `+${line}`).join("\n");
      const dynamicNetworkSignals = deriveSemanticHighRiskSignals([{
        path: "lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs",
        patch: `@@ -0,0 +1 @@\n${addedNetworkSource}\n`,
      }]);
      assert.equal(dynamicNetworkSignals.includes("remote_or_production_or_payment"), true);
      assert.equal(classify(registeredPaths, dynamicNetworkSignals, policy, { profileOverride: override }).profile, "HIGH");
    }
  }
  const jsonActivationSignals = deriveSemanticHighRiskSignals([{
    path: "config/dabangil-question-foundry-bounded-similarity-corpus-v1.json",
    patch: "@@ -1 +1 @@\n-  \"providerOrNetwork\": false\n+  \"providerOrNetwork\": true\n",
  }]);
  assert.deepEqual(jsonActivationSignals, ["remote_or_production_or_payment"]);
  assert.equal(classify(registeredPaths, jsonActivationSignals, policy, { profileOverride: override }).profile, "HIGH");
  assert.deepEqual(deriveSemanticHighRiskSignals([{
    path: "config/dabangil-question-foundry-bounded-similarity-corpus-v1.json",
    patch: "@@ -1 +1 @@\n-  \"remoteSupabaseMutation\": false\n+  \"remoteSupabaseMutation\": true\n",
  }]), ["remote_or_production_or_payment"]);

  const qfI1 = contract.questionFoundrySplitCampaign.lanes[4];
  assert.deepEqual(
    validateLaneChangedPaths(contract, qfI1.laneId, [...qfI1.ownedPathsExactly, ...qfI1.serialIntegrationPathsExactly], { includeSerialIntegrationPaths: true }),
    { ok: true, errors: [] },
  );
  const qfI1Registration = findRegisteredLaneRegistration(qfI1.ownedPathsExactly, qfI1.branch);
  const qfI1Classification = classify(qfI1.ownedPathsExactly, [], policy, {
    profileOverride: qfI1Registration.profile,
    registeredLaneId: qfI1Registration.laneId,
  });
  assert.equal(qfI1Classification.profile, "HIGH");
  assert.equal(qfI1Classification.validationRoute, "QF_I1_BOUNDED_HIGH");
  assert.equal(qfI1Classification.heavyWindowsRequired, false);
  assert.equal(qfI1Classification.learnerLoopRequired, false);
});

test("semantic network call extraction is bounded, literal-first, and overrides registered LOW lanes", () => {
  const policy = parsePolicy(new URL("../config/agent-risk-policy.yml", import.meta.url));
  const lane = contract.questionFoundrySplitCampaign.lanes[1];
  const registeredPaths = [...lane.ownedPathsExactly];
  const registeredSourcePath = registeredPaths.find((file) => file.endsWith(".mjs"));
  assert.equal(typeof registeredSourcePath, "string");
  const registration = findRegisteredLaneRegistration(registeredPaths, lane.branch);
  assert.deepEqual(registration, { laneId: lane.laneId, profile: "LOW" });

  const networkModules = [
    "http", "node:http", "https", "node:https", "http2", "node:http2", "net", "node:net",
    "tls", "node:tls", "dns", "node:dns", "dgram", "node:dgram", "undici", "undici/index.js",
    "axios", "axios/index.js", "got", "got/dist/source", "@supabase/supabase-js", "stripe", "@stripe/stripe-js",
  ];
  const patchFor = (source) => `@@ -0,0 +1 @@\n${source.split("\n").map((line) => `+${line}`).join("\n")}\n`;
  const signalsFor = (source) => deriveSemanticHighRiskSignals([{
    path: registeredSourcePath,
    patch: patchFor(source),
  }]);

  for (const networkModule of networkModules) {
    const governedForms = [
      `const client = await import("${networkModule}");`,
      `const client = await import("${networkModule}",);`,
      `const client = await import("${networkModule}", { with: {} });`,
      `const client = await import(\n  "${networkModule}",\n  { with: {} },\n);`,
      `const client = await import(\n  /* specifier */\n  "${networkModule}"\n  /* after specifier */,\n  { with: {} },\n);`,
      `const client = await import(\n  // specifier follows\n  "${networkModule}" // options follow\n  , { with: {} }\n);`,
      `const client = require("${networkModule}");`,
      `const client = require("${networkModule}",);`,
      `const client = require("${networkModule}", undefined);`,
      `const client = require /* call */ (\n  "${networkModule}",\n);`,
      `const client = await import('${networkModule}', { with: {} });`,
      `const client = require('${networkModule}', undefined);`,
      `const client = await import(\`${networkModule}\`,);`,
    ];

    for (const source of governedForms) {
      const signals = signalsFor(source);
      assert.deepEqual(signals, ["remote_or_production_or_payment"], `${networkModule}: ${source}`);
      const classification = classify(registeredPaths, signals, policy, {
        profileOverride: registration.profile,
        registeredLaneId: registration.laneId,
      });
      assert.equal(classification.risk, "high", `${networkModule}: ${source}`);
      assert.equal(classification.profile, "HIGH", `${networkModule}: ${source}`);
      assert.equal(
        classification.reasons.some((reason) =>
          reason.kind === "signal" && reason.signal === "remote_or_production_or_payment"),
        true,
        `${networkModule}: ${source}`,
      );
      assert.equal(classification.automaticMergeEligible, false, `${networkModule}: ${source}`);
      assert.equal(classification.ownerApprovalRequired, true, `${networkModule}: ${source}`);

      const mediumAttempt = classify(registeredPaths, signals, policy, {
        profileOverride: "MEDIUM",
        registeredLaneId: registration.laneId,
      });
      assert.equal(mediumAttempt.profile, "HIGH", `${networkModule}: MEDIUM ${source}`);
      assert.equal(mediumAttempt.automaticMergeEligible, false, `${networkModule}: MEDIUM ${source}`);
      assert.equal(mediumAttempt.ownerApprovalRequired, true, `${networkModule}: MEDIUM ${source}`);
    }
  }

  for (const unsafeFirstArgument of [
    "const client = await import(moduleSpecifier);",
    "const client = require(moduleSpecifier);",
    "const client = await import(`node:${protocol}`);",
    "const client = await import(\"./local-\" + suffix);",
  ]) {
    assert.deepEqual(
      signalsFor(unsafeFirstArgument),
      ["remote_or_production_or_payment"],
      `unsafe governed call must fail closed: ${unsafeFirstArgument}`,
    );
  }

  const negativeControls = [
    "const client = await import(\"./local-module\", { with: {} });",
    "const client = require(\"./https\",);",
    "const prose = 'import(\"node:https\",)';",
    "// import(\"node:https\",)",
    "/* require(\"https\", undefined) */",
    "const client = await import(\"node:https-extra\",);",
    "const client = await import(\"https-extra\", { with: {} });",
    "const client = require(\"axios-extra\",);",
    "const client = require(\"preaxios\",);",
    "const client = await import(\"@supabaseish/supabase-js\",);",
    "const client = await import(\"stripe-extra\",);",
    "const client = loader.import(\"node:https\",);",
    "const client = loader.require(\"https\",);",
    "export const boundedSimilarity = true;",
  ];
  for (const source of negativeControls) {
    const signals = signalsFor(source);
    assert.equal(signals.includes("remote_or_production_or_payment"), false, source);
    const classification = classify(registeredPaths, signals, policy, {
      profileOverride: registration.profile,
      registeredLaneId: registration.laneId,
    });
    assert.equal(classification.risk, "low", source);
    assert.equal(classification.profile, "LOW", source);
    assert.equal(classification.automaticMergeEligible, true, source);
    assert.equal(classification.ownerApprovalRequired, false, source);
  }
});

test("explicit CHANGED_FILES stays path-only even when a CI event is present", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fast-delivery-v2-risk-"));
  const eventPath = path.join(directory, "event.json");
  await writeFile(eventPath, JSON.stringify({
    pull_request: {
      base: { sha: "b".repeat(40) },
      head: { sha: "a".repeat(40), ref: "codex/manual-risk-check" },
    },
  }));

  try {
    const result = spawnSync(process.execPath, ["scripts/automation/classify-risk.mjs"], {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        CHANGED_FILES: "docs/readme.md",
        GITHUB_EVENT_PATH: eventPath,
        PR_SIGNALS: "",
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const classification = JSON.parse(result.stdout);
    assert.equal(classification.risk, "low");
    assert.equal(classification.semanticSignalEvidenceComplete, false);
    assert.deepEqual(classification.derivedHighRiskSignals, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("validation evidence selection is deterministic and schema parsing fails closed", () => {
  const selected = selectChangedEvidence([
    "tests/z.test.mjs",
    "config/example.json",
    "tests/e2e/example.spec.ts",
    "tests/z.test.mjs",
  ]);
  assert.deepEqual(selected.focusedTests, ["tests/z.test.mjs"]);
  assert.deepEqual(selected.representativeE2e, ["tests/e2e/example.spec.ts"]);
  assert.deepEqual(selected.jsonSchemas, ["config/example.json"]);
  assert.equal(parseChangedJson(["config/dabangil-fast-delivery-parallel-execution-v2.json"]).length, 0);
});

test("LOW and MEDIUM automatic merge require exact-head post-check clean review", () => {
  assert.deepEqual(evaluateAutomaticMerge(contract, passingSnapshot()), { eligible: true, errors: [] });
  assert.deepEqual(evaluateAutomaticMerge(contract, passingSnapshot({ profile: "MEDIUM" })), { eligible: true, errors: [] });

  const high = evaluateAutomaticMerge(contract, passingSnapshot({ profile: "HIGH" }));
  assert.equal(high.eligible, false);
  assert.match(high.errors.join("\n"), /Owner approval/u);

  const stale = passingSnapshot();
  stale.checks["fast-ci"].headSha = "b".repeat(40);
  assert.match(evaluateAutomaticMerge(contract, stale).errors.join("\n"), /fast-ci: check is missing or stale/u);

  const earlyReview = passingSnapshot();
  earlyReview.finalReview.submittedAt = "2026-08-27T00:59:59.000Z";
  assert.match(evaluateAutomaticMerge(contract, earlyReview).errors.join("\n"), /postdate/u);

  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ labels: ["do-not-merge"] })).errors.join("\n"), /blocking label/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ pathOwnershipValid: false })).errors.join("\n"), /exact ownership/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ unresolvedNonOutdatedReviewThreads: 1 })).errors.join("\n"), /threads must be zero/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ blockingCurrentHeadReviewCount: 1 })).errors.join("\n"), /changes-requested/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ isDraft: false, mergeStateStatus: "BLOCKED" })).errors.join("\n"), /ruleset merge state/u);

  const missingReceipt = passingSnapshot();
  missingReceipt.laneGateEvidence.validatedReceiptIds.pop();
  assert.match(evaluateAutomaticMerge(contract, missingReceipt).errors.join("\n"), /prior lane/u);

  const reorderedReceipt = passingSnapshot();
  reorderedReceipt.laneGateEvidence.validatedReceiptIds.reverse();
  assert.match(evaluateAutomaticMerge(contract, reorderedReceipt).errors.join("\n"), /prior lane/u);

  const overlappingLane = passingSnapshot();
  overlappingLane.laneGateEvidence.openLaneIds = [QF_ORDER[1], QF_ORDER[3]];
  overlappingLane.laneGateEvidence.concurrencyValid = false;
  assert.match(evaluateAutomaticMerge(contract, overlappingLane).errors.join("\n"), /lane cap|parallel-pair/u);

  assert.match(
    evaluateAutomaticMerge(contract, passingSnapshot({ semanticSignalEvidenceComplete: false })).errors.join("\n"),
    /semantic HIGH-signal/u,
  );

  const reusedLane = passingSnapshot();
  reusedLane.laneGateEvidence.currentLanePriorMergedCount = 1;
  assert.match(evaluateAutomaticMerge(contract, reusedLane).errors.join("\n"), /already produced a merge/u);
});

test("validated receipts bind exact lane scope, chronology, and V2 Owner approval", () => {
  assert.deepEqual(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, passingReceipt()), { validated: true, errors: [] });
  assert.deepEqual(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], passingReceipt(QF_ORDER[0])), { validated: true, errors: [] });

  const missingBase = passingReceipt();
  delete missingBase.baseSha;
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, missingBase).errors.join("\n"), /base SHA is missing or invalid/u);

  const wrongPinnedBase = passingReceipt();
  wrongPinnedBase.baseSha = "d".repeat(40);
  wrongPinnedBase.mergeParentSha = wrongPinnedBase.baseSha;
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, wrongPinnedBase).errors.join("\n"), /pinned V2 base/u);

  const wrongMergeParent = passingReceipt(QF_ORDER[0]);
  wrongMergeParent.mergeParentSha = "d".repeat(40);
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], wrongMergeParent).errors.join("\n"), /exact squash merge parent/u);

  const nonSquashMerge = passingReceipt(QF_ORDER[0]);
  nonSquashMerge.mergeParentCount = 2;
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], nonSquashMerge).errors.join("\n"), /one-parent squash history/u);

  const baseOffMain = passingReceipt(QF_ORDER[0]);
  baseOffMain.baseCommitOnMain = false;
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], baseOffMain).errors.join("\n"), /not on protected main/u);

  const wrongPath = passingReceipt(QF_ORDER[0]);
  wrongPath.changedPaths.push("lib/question-foundry/release-integration-v1.mjs");
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], wrongPath).errors.join("\n"), /undeclared changed path/u);

  const missingDeclaration = passingReceipt(QF_ORDER[0]);
  missingDeclaration.worktreeDeclarationCount = 0;
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], missingDeclaration).errors.join("\n"), /worktree declaration/u);

  const lateReview = passingReceipt(QF_ORDER[0]);
  lateReview.finalReview.submittedAt = "2026-08-27T01:05:00.000Z";
  assert.match(evaluateMergeReceiptEvidence(contract, QF_ORDER[0], lateReview).errors.join("\n"), /after merge/u);

  const missingApproval = passingReceipt();
  missingApproval.ownerApproval = null;
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, missingApproval).errors.join("\n"), /Owner approval is missing/u);

  const wrongApproval = passingReceipt();
  wrongApproval.ownerApproval.marker = `${contract.mergePolicy.v2OwnerApprovalReceiptMarkerPrefix}${"d".repeat(40)}`;
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, wrongApproval).errors.join("\n"), /Owner approval marker drifted/u);

  const earlyApproval = passingReceipt();
  earlyApproval.ownerApproval.submittedAt = "2026-08-27T00:59:00.000Z";
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, earlyApproval).errors.join("\n"), /predates final review/u);

  for (const authorAssociation of ["MEMBER", "COLLABORATOR"]) {
    const nonOwnerApproval = passingReceipt();
    nonOwnerApproval.ownerApproval.authorAssociation = authorAssociation;
    assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, nonOwnerApproval).errors.join("\n"), /author association drifted/u);
  }
  const wrongOwnerLogin = passingReceipt();
  wrongOwnerLogin.ownerApproval.authorLogin = "another-maintainer";
  assert.match(evaluateMergeReceiptEvidence(contract, AMENDMENT_ID, wrongOwnerLogin).errors.join("\n"), /actor login drifted/u);
});

test("workflows retain stable checks, gate heavy jobs, and keep HIGH out of auto-merge", async () => {
  const [risk, fast, full, heavy, merge, runtime, learner, automatic] = await Promise.all([
    read(".github/workflows/risk-classifier.yml"),
    read(".github/workflows/ci-fast.yml"),
    read(".github/workflows/ci-full.yml"),
    read(".github/workflows/reusable-heavy-validation-v2.yml"),
    read(".github/workflows/auto-merge.yml"),
    read(".github/workflows/runtime-gate.yml"),
    read(".github/workflows/learner-loop-health.yml"),
    read("scripts/automation/automatic-merge-v2.mjs"),
  ]);
  assert.match(risk, /name: risk-classifier/u);
  assert.match(fast, /name: fast-ci/u);
  assert.match(full, /name: full-ci\b/u);
  assert.match(full, /name: full-ci-windows/u);
  assert.match(full, /profile == 'MEDIUM' \|\| needs\.classify\.outputs\.profile == 'HIGH'/u);
  assert.match(full, /profile == 'HIGH'/u);
  assert.match(heavy, /workflow_call:/u);
  assert.match(heavy, /HIGH full test suite/u);
  assert.match(heavy, /QF-I1 exact bounded test suite/u);
  assert.match(heavy, /qf-i1-tests/u);
  assert.match(heavy, /--production-audit/u);
  assert.match(heavy, /--full-audit/u);
  assert.match(heavy, /--policy config\/foundation-continuous-security-automation-v1\.json/u);
  assert.match(heavy, /--sbom/u);
  assert.match(heavy, /--package package\.json/u);
  assert.match(heavy, /--output/u);
  assert.match(runtime, /name: runtime-gate/u);
  assert.match(learner, /name: Learner Loop Health/u);
  assert.match(merge, /github\.ref == 'refs\/heads\/main'/u);
  assert.match(merge, /pull_request_review:/u);
  assert.match(merge, /head\.repo\.full_name == github\.repository/u);
  assert.match(merge, /contains\(github\.event\.review\.body, 'FAST_DELIVERY_V2_FINAL_REVIEW'\)/u);
  assert.match(merge, /automatic-merge-v2\.mjs/u);
  assert.doesNotMatch(merge, /pull_request_target/u);
  assert.match(automatic, /deriveSemanticHighRiskSignals/u);
  assert.match(automatic, /readLaneGateEvidence/u);
  const readyIndex = automatic.indexOf('gh(["pr", "ready"');
  assert.ok(readyIndex > 0);
  assert.ok(automatic.indexOf("const refreshedDecision = evaluateAutomaticMerge", readyIndex) > readyIndex);
});

test("V2 PR contract is exact-scope Draft and reference-only", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fast-delivery-v2-pr-"));
  const eventPath = path.join(directory, "event.json");
  const body = `## Goal
Install the bounded V2 operating amendment.

Refs #714
Issue #714 remains open; this operating amendment closes no issue and starts no product mutation.

## Non-goals
No product mutation.
## Risk classification
- Risk: [high]
## Data boundary
No data.
## Schema / API / environment changes
None.
## Tests and evidence
Focused and HIGH checks.
## Runtime evidence
Not applicable to source-only workflow authority.
## Rollout and rollback
Merge only after Owner approval; revert the squash commit.
## Remaining risks
None after gates.
## Merge recommendation
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
  const delivery = contract.deliveryControl;
  await writeFile(eventPath, JSON.stringify({
    repository: { full_name: delivery.repository },
    pull_request: {
      body,
      base: { ref: delivery.baseRef, sha: delivery.baseSha },
      head: { ref: delivery.headRef, repo: { full_name: delivery.headRepository } },
      title: delivery.pullRequestTitle,
      draft: true,
    },
  }));
  try {
    const result = spawnSync(process.execPath, ["scripts/automation/validate-pr-contract.mjs"], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /validate-pr-contract: pass/u);

    const invalid = JSON.parse(await readFile(eventPath, "utf8"));
    invalid.pull_request.body = invalid.pull_request.body.replace("Refs #714", "Closes #714");
    await writeFile(eventPath, JSON.stringify(invalid));
    const rejected = spawnSync(process.execPath, ["scripts/automation/validate-pr-contract.mjs"], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /reference-only #714/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("decision, AGENTS, roadmap, and program log bind the exact bounded gate", async () => {
  const [decision, agents, roadmap, log, runner] = await Promise.all([
    read("docs/decisions/2026-08-27-owner-fast-delivery-parallel-execution-v2.md"),
    read("AGENTS.md"),
    read("roadmap/active-program.yml"),
    read("docs/exec-plans/active/inverge-owner-study-os.md"),
    read("scripts/run-node-tests.mjs"),
  ]);
  assert.match(decision, /HIGH-risk candidate/u);
  assert.match(decision, /QF-S1 and QF-S2 are the only parallel pair/u);
  assert.match(decision, /installs no Question Foundry product code/u);
  assert.match(agents, /2026-08-27-owner-fast-delivery-parallel-execution-v2\.md/u);
  assert.match(roadmap, /ownerStudyOsQuestionFoundryProductMutationStartAllowed: false/u);
  assert.match(log, /QUESTION_FOUNDRY_R5_CLOSED_UNMERGED_SCOPE_SPLIT_DONOR/u);
  assert.match(log, /FAST_DELIVERY_PARALLEL_V2_OWNER_APPROVAL_REQUIRED/u);
  assert.match(runner, /tests\/fast-delivery-parallel-execution-v2\.test\.mjs/u);
});
