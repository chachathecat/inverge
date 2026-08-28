import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CLASSIFIER_ID,
  CLASSIFIER_VERSION,
  MACHINE_LIMITS,
  classifyRepositoryDiff,
  classifySourcePair,
  extractSemanticFacts,
  isGovernedNetworkModuleSpecifier,
} from "../scripts/automation/semantic-risk-classifier-v2.mjs";

const contract = JSON.parse(await readFile(
  new URL("../config/dabangil-semantic-risk-classifier-v2.json", import.meta.url),
  "utf8",
));

function assertSemanticHigh(report, label = "semantic HIGH") {
  assert.equal(report.semanticHighSignals.length > 0, true, label);
  assert.equal(report.integrationBoundary.riskFloor, "HIGH", label);
  assert.equal(report.integrationBoundary.lowerProfilesCannotOverride, true, label);
  assert.equal(report.integrationBoundary.automaticMergeEligible, false, label);
  assert.equal(report.integrationBoundary.ownerApprovalRequired, true, label);
  for (const requestedProfile of ["LOW", "MEDIUM"]) {
    const futureIntegratedRisk = report.integrationBoundary.riskFloor ?? requestedProfile;
    assert.equal(futureIntegratedRisk, "HIGH", `${label}: ${requestedProfile}`);
    assert.equal(report.integrationBoundary.automaticMergeEligible, false, `${label}: ${requestedProfile}`);
    assert.equal(report.integrationBoundary.ownerApprovalRequired, true, `${label}: ${requestedProfile}`);
  }
}

function assertNoSemanticHigh(report, label = "no semantic HIGH") {
  assert.deepEqual(report.semanticHighSignals, [], label);
  assert.deepEqual(report.introducedFacts, [], label);
  assert.equal(report.analysisComplete, true, label);
  assert.equal(report.integrationBoundary.riskFloor, null, label);
  assert.equal(report.integrationBoundary.automaticMergeEligible, null, label);
  assert.equal(report.integrationBoundary.ownerApprovalRequired, null, label);
}

function classifyHead(headSource, filePath = "lib/future-lane/example.mjs", baseSource = "") {
  return classifySourcePair({ filePath, baseSource, headSource });
}

function runGit(directory, args) {
  const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("machine contract is exact, bounded, inert, and router-free", async () => {
  assert.equal(contract.classifierId, CLASSIFIER_ID);
  assert.equal(contract.classifierVersion, CLASSIFIER_VERSION);
  assert.deepEqual(contract.delivery, {
    repository: "chachathecat/inverge",
    baseRef: "main",
    baseSha: "fd8d0039bbeb2981935fdb671094e37d73a34400",
    baseTree: "1d338b7be92cfc98c00611b4ff3f2b75dea1784d",
    branch: "codex/semantic-risk-classifier-v2-clean-r1",
    pullRequestTitle: "[FDV2-A] Install standalone Semantic Risk Classifier V2 — clean replacement",
    risk: "HIGH",
    draftUntilOwnerGate: true,
    squashMergeOnly: true,
  });
  assert.deepEqual(contract.machineLimits, {
    ...MACHINE_LIMITS,
    callerOverrideAllowed: false,
  });
  assert.deepEqual(contract.scope.changedPathsExactly, [
    "config/dabangil-semantic-risk-classifier-v2.json",
    "docs/decisions/2026-08-27-owner-semantic-risk-classifier-v2-foundation.md",
    "docs/qa/semantic-risk-classifier-v2-validation.md",
    "scripts/automation/semantic-risk-classifier-v2.mjs",
    "scripts/run-node-tests.mjs",
    "tests/semantic-risk-classifier-v2.test.mjs",
  ]);
  assert.equal(contract.scope.routerOrAutomaticMergeAuthorityIncluded, false);
  assert.equal(contract.scope.workflowMutationAllowed, false);
  assert.equal(contract.scope.dependencyOrLockfileMutationAllowed, false);
  assert.deepEqual(contract.donorEvidence, {
    pullRequest: 852,
    branch: "codex/semantic-risk-classifier-v2",
    head: "a5f0ff5828c259d2a41c8bc7b90a740746f91d03",
    tree: "b75aa2743ca5d29df706c727effdd2fd29207b56",
    terminalDisposition: "SEMANTIC_RISK_CLASSIFIER_V2_PR852_CLOSED_UNMERGED_PR_CONTRACT_SCOPE_SPLIT_DONOR",
    commitAncestryReusable: false,
  });
  assert.equal(contract.donorEvidence.commitAncestryReusable, false);
  assert.ok(Object.values(contract.activationBoundary).every((value) => value === false));

  const [decision, validation, runner] = await Promise.all([
    readFile(new URL("../docs/decisions/2026-08-27-owner-semantic-risk-classifier-v2-foundation.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/qa/semantic-risk-classifier-v2-validation.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/run-node-tests.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(decision, /changes no workflow/u);
  assert.match(decision, /Workflow Router \/ Automatic Merge Authority V2/u);
  assert.match(validation, /exact base\/head blobs/u);
  assert.match(runner, /tests\/semantic-risk-classifier-v2\.test\.mjs/u);
});

test("closed network module roots and subpaths are exact", () => {
  const governed = [
    "http", "http/client", "node:http", "node:http/client",
    "https", "https/client", "node:https", "node:https/client",
    "http2", "http2/client", "node:http2", "node:http2/client",
    "net", "net/client", "node:net", "node:net/client",
    "tls", "tls/client", "node:tls", "node:tls/client",
    "dns", "dns/promises", "node:dns", "node:dns/promises",
    "dgram", "dgram/client", "node:dgram", "node:dgram/client",
    "undici", "undici/index.js", "axios", "axios/index.js", "got", "got/dist/source",
    "stripe", "stripe/lib/stripe.core.js", "@supabase/supabase-js", "@supabase/postgrest-js",
    "@stripe/stripe-js", "@stripe/react-stripe-js",
  ];
  for (const specifier of governed) assert.equal(isGovernedNetworkModuleSpecifier(specifier), true, specifier);

  const inertNearMatches = [
    "node:https-extra", "https-extra", "undici-local", "axiosish", "got-local",
    "stripe-local", "@supabase/", "@supabaseish/example", "@stripe/", "@stripeish/example",
    "./https", "../stripe", "local-module",
  ];
  for (const specifier of inertNearMatches) assert.equal(isGovernedNetworkModuleSpecifier(specifier), false, specifier);
});

test("full-file AST comparison preserves unchanged multiline call context", () => {
  const baseSource = `
export async function load() {
  return import(
    /* exact first argument */
    "./local-module",
    { with: { type: "json" } },
  );
}
`;
  const headSource = baseSource.replace('"./local-module"', '"node:https"');
  const report = classifyHead(headSource, "lib/future-lane/context.mjs", baseSource);
  assertSemanticHigh(report, "changed multiline specifier");
  assert.deepEqual(report.introducedFacts.map((entry) => entry.fact), [{
    category: "network_module_load",
    form: "dynamic_import",
    target: "node:https",
  }]);
});

test("AST module forms, options, comments, interpolation, and trailing commas fail closed", () => {
  const hostileSources = [
    ['import value from "node:https";', "example.mjs"],
    ['import "node:https";', "example.mjs"],
    ['export { request } from "node:https";', "example.mjs"],
    ['import https = require("node:https");', "example.ts"],
    ['const client = await import("node:https");', "example.mjs"],
    ['const client = await import("node:https",);', "example.mjs"],
    ['const client = await import("node:https", { with: {} });', "example.mjs"],
    [`const client = await import(
      /* specifier */
      "node:https"
      /* after specifier */,
      { with: {} },
    );`, "example.mjs"],
    ['const client = await import(`node:https`);', "example.mjs"],
    ['const client = await import(`node:${kind}`);', "example.mjs"],
    ['const client = await import(moduleName);', "example.mjs"],
    ['const client = await import("./local-" + suffix);', "example.mjs"],
    ['const client = require("https",);', "example.cjs"],
    ['const client = require("https", undefined);', "example.cjs"],
    [`const client = require /* call */ (
      "https",
    );`, "example.cjs"],
    ["const client = require('https',);", "example.cjs"],
    ['const client = require(moduleName);', "example.cjs"],
    ['const client = module.require("https");', "example.cjs"],
    ['const client = module.require(dynamicName);', "example.cjs"],
    ['const rendered = `${await import("node:https")}`;', "example.mjs"],
    ['const escaped = await import("node:\\u0068ttps");', "example.mjs"],
  ];

  for (const [source, fileName] of hostileSources) {
    const report = classifyHead(source, `lib/future-lane/${fileName}`);
    assertSemanticHigh(report, source);
  }

  const sideEffect = classifyHead('import "node:https";');
  assert.equal(sideEffect.introducedFacts[0].fact.form, "side_effect_import");
});

test("every governed module family creates a non-overridable semantic HIGH fact", () => {
  const specifiers = [
    "http", "node:http", "https", "node:https", "http2", "node:http2",
    "net", "node:net", "tls", "node:tls", "dns", "node:dns", "dgram", "node:dgram",
    "undici", "undici/index.js", "axios", "axios/index.js", "got", "got/dist/source",
    "@supabase/supabase-js", "stripe", "stripe/lib/stripe.core.js", "@stripe/stripe-js",
  ];
  for (const specifier of specifiers) {
    for (const quote of ['"', "'"]) {
      const source = `const client = await import(${quote}${specifier}${quote}, { with: {} });`;
      assertSemanticHigh(classifyHead(source), `${specifier} ${quote}`);
    }
  }
});

test("governed direct network calls are AST facts while unrelated properties remain inert", () => {
  const governed = [
    "fetch('/resource');",
    "globalThis.fetch('/resource');",
    "window.fetch('/resource');",
    "new WebSocket('wss://example.invalid');",
    "EventSource('/events');",
    "navigator.sendBeacon('/event');",
    "http.get('/resource');",
    "https.request('/resource');",
    "createClient('placeholder');",
    "postgres('placeholder');",
  ];
  for (const source of governed) assertSemanticHigh(classifyHead(source), source);

  const unrelated = [
    "cache.fetch('local-key');",
    "object.WebSocket('local');",
    "service.sendBeacon('local');",
    "transport.http.get('local');",
  ];
  for (const source of unrelated) assertNoSemanticHigh(classifyHead(source), source);
});

test("strings, comments, local loads, arbitrary properties, prose, and near-prefixes stay inert", () => {
  const negativeSources = [
    'const client = await import("./local-module", { with: {} });',
    'const client = require("./https",);',
    'const prose = \'import("node:https")\';',
    'const prose = "fetch(";',
    '// import("node:https")',
    '/* require("https") */',
    'const prose = `ordinary prose: import("node:https")`;',
    'const client = obj.require("https");',
    'const client = service.require("https");',
    'const client = object.import("node:https");',
    'const client = await import("node:https-extra");',
    'const client = await import("stripe-local");',
    'const client = await import("@stripeish/example");',
  ];
  for (const source of negativeSources) assertNoSemanticHigh(classifyHead(source), source);
});

test("unchanged pre-existing and moved identical facts are not newly introduced", () => {
  const existing = 'const client = await import("node:https");\nexport const value = 1;\n';
  const unrelatedEdit = existing.replace("value = 1", "value = 2");
  assertNoSemanticHigh(classifyHead(unrelatedEdit, "lib/future-lane/existing.mjs", existing), "unrelated edit");

  const moved = 'export const value = 1;\nconst client = await import("node:https");\n';
  assertNoSemanticHigh(classifyHead(moved, "lib/future-lane/existing.mjs", existing), "moved fact");

  const duplicated = `${existing}const second = await import("node:https");\n`;
  const duplicateReport = classifyHead(duplicated, "lib/future-lane/existing.mjs", existing);
  assertSemanticHigh(duplicateReport, "increased multiplicity");
  assert.equal(duplicateReport.introducedFacts[0].count, 1);

  const changedUnsafe = classifyHead(
    "const client = await import(otherModuleName);\n",
    "lib/future-lane/existing.mjs",
    "const client = await import(moduleName);\n",
  );
  assertSemanticHigh(changedUnsafe, "materially changed unsafe fact");

  const formattedUnsafe = classifyHead(
    "const client = await import( /* moved */ moduleName );\n",
    "lib/future-lane/existing.mjs",
    "const client = await import(moduleName);\n",
  );
  assertNoSemanticHigh(formattedUnsafe, "unsafe fact formatting only");
});

test("blocking parse diagnostics and machine bounds produce explicit uninspectable HIGH", () => {
  const invalid = classifyHead("export const broken = ;");
  assertSemanticHigh(invalid, "invalid head");
  assert.deepEqual(invalid.semanticHighSignals, ["uninspectable_change"]);
  assert.equal(invalid.failures.some((failure) => failure.code === "BLOCKING_PARSE_DIAGNOSTIC" && failure.side === "head"), true);

  const oversized = extractSemanticFacts(
    "lib/future-lane/oversized.mjs",
    " ".repeat(MACHINE_LIMITS.maximumSourceBytesPerFile + 1),
  );
  assert.equal(oversized.complete, false);
  assert.deepEqual(oversized.failures.map((failure) => failure.code), ["SOURCE_SIZE_LIMIT_EXCEEDED"]);
});

test("repository diff reads exact full blobs and fails closed when exact identities are unavailable", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "semantic-risk-v2-"));
  try {
    runGit(directory, ["init", "-b", "main"]);
    runGit(directory, ["config", "user.email", "semantic-risk@example.invalid"]);
    runGit(directory, ["config", "user.name", "Semantic Risk Test"]);
    const sourcePath = path.join(directory, "example.mjs");
    const baseSource = `export async function load() {
  return import(
    "./local-module",
    { with: {} },
  );
}
`;
    await writeFile(sourcePath, baseSource, "utf8");
    runGit(directory, ["add", "example.mjs"]);
    runGit(directory, ["commit", "-m", "base"]);
    const baseSha = runGit(directory, ["rev-parse", "HEAD"]);

    await writeFile(sourcePath, baseSource.replace('"./local-module"', '"node:https"'), "utf8");
    runGit(directory, ["add", "example.mjs"]);
    runGit(directory, ["commit", "-m", "head"]);
    const headSha = runGit(directory, ["rev-parse", "HEAD"]);

    const report = classifyRepositoryDiff({ repoRoot: directory, baseSha, headSha });
    assertSemanticHigh(report, "exact repository blobs");
    assert.deepEqual(report.analyzedFiles, ["example.mjs"]);
    assert.equal(report.introducedFacts[0].fact.target, "node:https");

    const unavailable = classifyRepositoryDiff({ repoRoot: directory, baseSha, headSha: "f".repeat(40) });
    assertSemanticHigh(unavailable, "missing exact head");
    assert.deepEqual(unavailable.semanticHighSignals, ["uninspectable_change"]);
    assert.equal(unavailable.failures[0].code, "BASE_HEAD_COMPARISON_INCOMPLETE");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
