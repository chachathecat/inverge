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
const PR_CONTRACT_VALIDATOR = path.resolve("scripts/automation/validate-pr-contract.mjs");
const EXACT_REFERENCE_LINE = "Refs #714";
const EXACT_DISPOSITION_LINE =
  "Issue #714 remains open; this standalone security foundation closes no issue and starts no product mutation.";

function prContractBody({ relationshipLines = [EXACT_REFERENCE_LINE], disposition = EXACT_DISPOSITION_LINE } = {}) {
  const relationship = relationshipLines.join("\n");
  const dispositionBlock = disposition === null ? "" : `\n\n${disposition}`;
  return `## Goal

Validate one exact reference-only foundation.

${relationship}${dispositionBlock}

## Non-goals

No product or workflow activation.

## Risk classification

- Risk: [high]

## Data boundary

Repository source only.

## Schema / API / environment changes

None.

## Tests and evidence

Focused hostile regressions.

## Runtime evidence

Not applicable; source-only validation.

## Rollout and rollback

Draft only; revert an eventual authorized squash merge.

## Remaining risks

Owner approval remains required.

## Merge recommendation

- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

function exactPrEvent(body = prContractBody()) {
  return {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      body,
      draft: true,
      title: "[FDV2-A] Install standalone Semantic Risk Classifier V2",
      base: {
        ref: "main",
        sha: "fd8d0039bbeb2981935fdb671094e37d73a34400",
      },
      head: {
        ref: "codex/semantic-risk-classifier-v2",
        repo: { full_name: "chachathecat/inverge" },
      },
    },
  };
}

async function runPrContractEvent(event) {
  const directory = await mkdtemp(path.join(tmpdir(), "semantic-risk-pr-contract-"));
  const eventPath = path.join(directory, "event.json");
  try {
    await writeFile(eventPath, `${JSON.stringify(event)}\n`, "utf8");
    return spawnSync(process.execPath, [PR_CONTRACT_VALIDATOR], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath, PR_BODY: "" },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runPrContractBodyOnly(body) {
  const environment = { ...process.env, PR_BODY: body };
  delete environment.GITHUB_EVENT_PATH;
  return spawnSync(process.execPath, [PR_CONTRACT_VALIDATOR], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: environment,
  });
}

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
  assert.deepEqual(contract.machineLimits, {
    ...MACHINE_LIMITS,
    callerOverrideAllowed: false,
  });
  assert.deepEqual(contract.scope.changedPathsExactly, [
    "config/dabangil-semantic-risk-classifier-v2.json",
    "docs/decisions/2026-08-27-owner-semantic-risk-classifier-v2-foundation.md",
    "docs/qa/semantic-risk-classifier-v2-validation.md",
    "scripts/automation/semantic-risk-classifier-v2.mjs",
    "scripts/automation/validate-pr-contract.mjs",
    "scripts/run-node-tests.mjs",
    "tests/semantic-risk-classifier-v2.test.mjs",
  ]);
  assert.equal(contract.scope.routerOrAutomaticMergeAuthorityIncluded, false);
  assert.equal(contract.scope.workflowMutationAllowed, false);
  assert.equal(contract.scope.dependencyOrLockfileMutationAllowed, false);
  assert.equal(contract.donorEvidence.terminalDisposition, "FAST_DELIVERY_PARALLEL_V2_CLOSED_UNMERGED_SCOPE_SPLIT_DONOR");
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

test("exact reference-only PR exception is closed, identity-pinned, and fail-closed", async () => {
  const valid = await runPrContractEvent(exactPrEvent());
  assert.equal(valid.status, 0, valid.stderr);

  for (const closingLine of [
    "Closes #714", "Fixes #714", "Resolves #714",
    "Closed #714", "Fixed #714", "Resolved #714",
  ]) {
    const closing = await runPrContractEvent(exactPrEvent(prContractBody({
      relationshipLines: [closingLine],
    })));
    assert.notEqual(closing.status, 0, closingLine);
    assert.match(closing.stderr, /reference-only #714/u);
  }

  const identityMutations = [
    (event) => { event.repository.full_name = "other/inverge"; },
    (event) => { event.pull_request.base.ref = "release"; },
    (event) => { event.pull_request.base.sha = "0".repeat(40); },
    (event) => { event.pull_request.head.ref = "codex/unrelated"; },
    (event) => { event.pull_request.head.repo.full_name = "other/inverge"; },
    (event) => { event.pull_request.title = "Unrelated Draft"; },
    (event) => { event.pull_request.draft = false; },
  ];
  for (const mutate of identityMutations) {
    const event = structuredClone(exactPrEvent());
    mutate(event);
    const result = await runPrContractEvent(event);
    assert.notEqual(result.status, 0, mutate.toString());
  }

  const invalidBodies = [
    prContractBody({ relationshipLines: [] }),
    prContractBody({ relationshipLines: [EXACT_REFERENCE_LINE, EXACT_REFERENCE_LINE] }),
    prContractBody({ relationshipLines: [EXACT_REFERENCE_LINE, "refs #714"] }),
    prContractBody({ relationshipLines: [EXACT_REFERENCE_LINE, "- Refs #714"] }),
    prContractBody({ disposition: null }),
    prContractBody({ disposition: `${EXACT_DISPOSITION_LINE} altered` }),
    `${prContractBody()}\nIssue #714 remains open; altered duplicate disposition.\n`,
    `${prContractBody()}\n* Issue #714 remains open; altered duplicate disposition.\n`,
  ];
  for (const body of invalidBodies) {
    const result = await runPrContractEvent(exactPrEvent(body));
    assert.notEqual(result.status, 0, body);
    assert.match(result.stderr, /reference-only #714/u);
  }

  const unrelated = exactPrEvent();
  unrelated.pull_request.head.ref = "codex/unrelated";
  unrelated.pull_request.title = "Unrelated Draft";
  const unrelatedResult = await runPrContractEvent(unrelated);
  assert.notEqual(unrelatedResult.status, 0);
  assert.match(unrelatedResult.stderr, /exactly one issue-closing reference/u);

  const bodyOnly = runPrContractBodyOnly(prContractBody());
  assert.notEqual(bodyOnly.status, 0);
  assert.match(bodyOnly.stderr, /exactly one issue-closing reference/u);

  const ordinary = exactPrEvent(prContractBody({
    relationshipLines: ["Closes #123"],
    disposition: null,
  }));
  ordinary.pull_request.head.ref = "codex/ordinary-change";
  ordinary.pull_request.title = "Ordinary change";
  const ordinaryResult = await runPrContractEvent(ordinary);
  assert.equal(ordinaryResult.status, 0, ordinaryResult.stderr);
});

test("all pre-existing exact reference-only PR exceptions remain valid", async () => {
  const paths = {
    a0: "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    a1: "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
    oracle: "config/dabangil-wcv-c3-pre-p-postgresql-security-state-oracle-v1.json",
    minimal: "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
    practice: "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json",
  };
  const entries = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [
    key,
    JSON.parse(await readFile(filePath, "utf8")),
  ])));

  const a0 = entries.a0.deliveryControl.sourceAuthorityIssueLink;
  const a1 = entries.a1.deliveryControl.referenceOnlyIssueLinks;
  const oracle = entries.oracle.deliveryControl;
  const minimal = entries.minimal.deliveryControl;
  const practice = entries.practice;
  const cases = [
    {
      scope: a0,
      references: [a0.requiredReferenceLine],
      disposition: a0.requiredDispositionLine,
      draft: true,
    },
    {
      scope: a1,
      references: a1.requiredReferenceLinesExactly,
      disposition: a1.requiredDispositionLine,
      draft: true,
    },
    {
      scope: oracle,
      references: oracle.referenceOnlyIssueLinks.requiredReferenceLinesExactly,
      disposition: oracle.referenceOnlyIssueLinks.requiredDispositionLine,
      draft: oracle.draftRequired,
    },
    {
      scope: minimal,
      references: minimal.referenceOnlyIssueLinks.requiredReferenceLinesExactly,
      disposition: minimal.referenceOnlyIssueLinks.requiredDispositionLine,
      draft: minimal.draftRequired,
    },
    {
      scope: {
        repository: practice.authority.repository,
        baseRef: "main",
        baseSha: practice.authority.baseSha,
        headRef: practice.authority.headRef,
        headRepository: practice.authority.repository,
        pullRequestTitle: practice.authority.pullRequestTitle,
      },
      references: practice.deliveryControl.requiredReferenceLinesExactly,
      disposition: practice.deliveryControl.requiredDispositionLine,
      draft: practice.deliveryControl.draftRequired,
    },
  ];

  for (const candidate of cases) {
    const event = {
      repository: { full_name: candidate.scope.repository },
      pull_request: {
        body: prContractBody({
          relationshipLines: candidate.references,
          disposition: candidate.disposition,
        }),
        draft: candidate.draft,
        title: candidate.scope.pullRequestTitle,
        base: { ref: candidate.scope.baseRef, sha: candidate.scope.baseSha },
        head: {
          ref: candidate.scope.headRef,
          repo: { full_name: candidate.scope.headRepository },
        },
      },
    };
    const result = await runPrContractEvent(event);
    assert.equal(result.status, 0, `${candidate.scope.headRef}: ${result.stderr}`);
  }
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
