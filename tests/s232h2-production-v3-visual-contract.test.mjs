import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  disposePreviewResponse,
  isPreviewJsonObject,
  PREVIEW_REQUEST_CODE_PREFIXES,
  previewRequestFailureCode,
  previewResponseMetadataFailureCode,
  retainFirstStableFailureCode,
} from "../scripts/support/s232h2-preview-response.mjs";

const read = (path) => readFileSync(path, "utf8");
const workflow = read(".github/workflows/s232h2-runtime.yml");
const ephemeralAccounts = read("scripts/s232h2-ephemeral-accounts.ts");
const exactFixture = read("scripts/support/s232h2-exact-fixture.ts");
const previewResponseSupport = read(
  "scripts/support/s232h2-preview-response.mjs",
);
const spec = read("tests/e2e/s232h2-production-v3-visual.spec.ts");
const authenticatedRuntime = read("tests/e2e/support/authenticated-runtime.ts");
const reviewQueueClient = read(
  "components/review-os/review-queue-client.tsx",
);
const calculatorRoutineTrainer = read(
  "components/review-os/calculator-routine-trainer.tsx",
);
const learnerUi = read("components/learner/learner-ui.tsx");
const sourceAuditRoute = read("app/api/os/visual-source-audit/route.ts");
const readOnlyRequest = read("lib/review-os/read-only-request.ts");
const reviewOsRepository = read("lib/review-os/repository.ts");
const reviewOsServer = read("lib/review-os/server.ts");
const reviewOsService = read("lib/review-os/service.ts");
const baselineSha = "35836d419161d7cfe55e3e3c088fcc4d66376a7d";
const snapshotDirectory =
  "tests/e2e/s232h2-production-v3-visual.spec.ts-snapshots";

const figmaSnapshots = [
  {
    file: "figma-mobile-ledger-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "afd49546f0554715ed4920dfc38e5913cde30d7bd52a7bece25442f4e33a07b1",
  },
  {
    file: "figma-desktop-ledger-chromium-linux.png",
    width: 1440,
    height: 1024,
    sha256: "ca596871993b272f81085ac586d3676536a2da6b7d009b4de14e95b722e9ac02",
  },
  {
    file: "figma-mobile-calculator-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "f3e9e7d3218f39eb2ef1e0d54e991346d31ddb9b9beb1e8ef3f7d4b3faa9e6a7",
  },
];

const requiredRoutes = [
  "/",
  "/login",
  "/app?mode=second",
  "/app/capture?mode=second",
  "/answer-review?mode=second",
  "/app/review?mode=second",
  "/app/notes?mode=second",
  "/app/items/",
  "/app/session?mode=second",
  "/app/agenda?mode=second",
  "/app/weekly?mode=second",
  "/app/write?mode=second",
  "/app/calculator?mode=second&context=practice&focus=casio",
];

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function blockBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing source marker: ${start}`);
  assert.ok(
    endIndex > startIndex,
    `missing source marker after ${start}: ${end}`,
  );
  return source.slice(startIndex, endIndex);
}

function readSourceTree(directory) {
  const sources = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      sources.push(readSourceTree(path));
    } else if (entry.isFile() && /\.(?:js|mjs|sql|ts|tsx)$/.test(entry.name)) {
      sources.push(read(path));
    }
  }
  return sources.join("\n");
}

test("workflow keeps exact-head and fixed-baseline provenance while splitting the gate", () => {
  assert.match(workflow, /agent\/figma-v3-production-routes/);
  assert.ok(
    workflow.includes(`<!-- run-s232h2-visual-e2e baseline=${baselineSha} -->`),
  );
  assert.ok(workflow.includes(`E2E_BASELINE_SHA: ${baselineSha}`));
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_RUNNER_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /deployments\?sha=\$\{target_sha\}&environment=Preview/,
  );
  assert.match(workflow, /api\/runtime\/version/);
  assert.match(
    workflow,
    /discover_preview "\$\{E2E_RUNNER_SHA\}"[^\n]*&[\s\S]*?discover_preview "\$\{E2E_BASELINE_SHA\}"[^\n]*&/,
  );
  assert.match(workflow, /wait "\$\{pr2_pid\}"/);
  assert.match(workflow, /wait "\$\{baseline_pid\}"/);
  assert.match(workflow, /git merge-base/);
  assert.match(workflow, /\^\{tree\}/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASE_URL\}"/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASELINE_URL\}"/);
  assert.match(workflow, /current_pr_head/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /deployments: read/);
  assert.match(workflow, /pull-requests: read/);
  const jobTimeout = Number(
    workflow.match(/timeout-minutes:\s*(\d+)/)?.[1] ?? 0,
  );
  const previewDiscoveryBound = Number(
    workflow.match(/local deadline=\$\(\(SECONDS \+ (\d+)\)\)/)?.[1] ?? 0,
  );
  const gateBounds = [
    ...workflow.matchAll(/timeout --signal=TERM --kill-after=10s (\d+)s/g),
  ].map((match) => Number(match[1]));
  assert.deepEqual(gateBounds, [180, 900, 900]);
  assert.ok(
    jobTimeout * 60 >=
      previewDiscoveryBound +
        gateBounds.reduce((sum, seconds) => sum + seconds, 0) +
        600,
    "the job must retain setup, cleanup, validation, and upload headroom",
  );
  assert.doesNotMatch(
    workflow,
    /contents: write|pull-requests: write|issues: write/,
  );

  const contractCommand = blockBetween(
    workflow,
    "Check the focused visual-gate contract",
    "Provision runner-only ephemeral S232H2 accounts",
  );
  assert.match(
    contractCommand,
    /node --test tests\/s232h2-production-v3-visual-contract\.test\.mjs/,
  );
  assert.doesNotMatch(contractCommand, /screenshot-boundary-policy/);

  const contractIndex = workflow.indexOf(
    "Check the focused visual-gate contract",
  );
  const provisionIndex = workflow.indexOf(
    "Provision runner-only ephemeral S232H2 accounts",
  );
  const browserIndex = workflow.indexOf("Install Playwright browser");
  const privacyIndex = workflow.indexOf(
    "Run privacy and auth source gate without screenshots",
  );
  const a11yIndex = workflow.indexOf(
    "Run bounded production V3 accessibility gate",
  );
  const visualIndex = workflow.indexOf(
    "Run one-pass production V3 visual and Figma gate",
  );
  const manifestIndex = workflow.indexOf(
    "Validate the isolated synthetic screenshot manifest",
  );
  assert.ok(
    contractIndex >= 0 &&
      provisionIndex > contractIndex &&
      browserIndex > provisionIndex &&
      privacyIndex > browserIndex &&
      a11yIndex > privacyIndex &&
      visualIndex > a11yIndex &&
      manifestIndex > visualIndex,
  );
  assert.match(workflow, /--grep "@privacy"/);
  assert.match(workflow, /--grep "@a11y"/);
  assert.match(workflow, /--grep "@visual"/);
  assert.match(workflow, /timeout[^\n]*180s/);
  assert.equal((workflow.match(/timeout[^\n]*900s/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /#624|s232g|workflow_dispatch|rerun|re-run/i);
});

test("workflow provisions exactly two runner-only candidates and always cleans them", () => {
  const provisionStep = blockBetween(
    workflow,
    "Provision runner-only ephemeral S232H2 accounts",
    "Install Playwright browser",
  );
  const privacyStep = blockBetween(
    workflow,
    "Run privacy and auth source gate without screenshots",
    "Run bounded production V3 accessibility gate",
  );
  const generatedCredentialNames = [
    "E2E_VISUAL_USER_EMAIL",
    "E2E_VISUAL_USER_PASSWORD",
    "E2E_USER_B_EMAIL",
    "E2E_USER_B_PASSWORD",
  ];
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.E2E_/);
  assert.doesNotMatch(workflow, /\bE2E_USER_A_(?:EMAIL|PASSWORD)\b/);
  assert.doesNotMatch(workflow, /\bE2E_USER_EMAIL\b/);
  assert.doesNotMatch(workflow, /\bE2E_USER_PASSWORD\b/);
  for (const name of generatedCredentialNames) {
    assert.doesNotMatch(workflow, new RegExp(`\\b${name}:`));
  }
  assert.match(
    provisionStep,
    /run: npx tsx scripts\/s232h2-ephemeral-accounts\.ts provision/,
  );
  assert.match(
    provisionStep,
    /S232H2_EPHEMERAL_STATE_PATH: \$\{\{ runner\.temp \}\}\/s232h2-ephemeral-state\.json/,
  );
  assert.match(
    privacyStep,
    /S232H2_VISUAL_PROOF_PATH: \$\{\{ runner\.temp \}\}\/s232h2-visual-proof\.json/,
  );
  assert.doesNotMatch(
    privacyStep,
    /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH/,
  );
  for (const stepName of [
    "Run bounded production V3 accessibility gate",
    "Run one-pass production V3 visual and Figma gate",
  ]) {
    const start = workflow.indexOf(stepName);
    const end = workflow.indexOf("\n      - name:", start + stepName.length);
    const step = workflow.slice(start, end < 0 ? undefined : end);
    assert.match(step, /S232H2_VISUAL_PROOF_PATH/);
    for (const name of generatedCredentialNames) {
      assert.doesNotMatch(step, new RegExp(`\\b${name}:`));
    }
    assert.doesNotMatch(
      step,
      /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH/,
    );
  }

  const adminSecretExpression =
    "${{ secrets.SUPABASE_SECRET_KEY || secrets.SUPABASE_SERVICE_ROLE_KEY }}";
  assert.equal(workflow.split(adminSecretExpression).length - 1, 2);
  const jobEnvironment = blockBetween(workflow, "    env:", "    steps:");
  assert.doesNotMatch(
    jobEnvironment,
    /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|S232H2_SUPABASE_ADMIN_KEY/,
  );
  assert.ok(provisionStep.includes(adminSecretExpression));

  const cleanupStep = blockBetween(
    workflow,
    "Revoke and delete runner-only ephemeral S232H2 accounts",
    "Remove the ephemeral visual-account proof",
  );
  assert.match(cleanupStep, /if: \$\{\{ always\(\) \}\}/);
  assert.ok(cleanupStep.includes(adminSecretExpression));
  assert.match(
    cleanupStep,
    /S232H2_EPHEMERAL_STATE_PATH: \$\{\{ runner\.temp \}\}\/s232h2-ephemeral-state\.json/,
  );
  assert.match(
    cleanupStep,
    /run: npx tsx scripts\/s232h2-ephemeral-accounts\.ts cleanup/,
  );
  assert.doesNotMatch(cleanupStep, /continue-on-error/);
  assert.ok(
    workflow.indexOf("Upload 28 synthetic and Figma-reference PNGs") <
      workflow.indexOf(
        "Revoke and delete runner-only ephemeral S232H2 accounts",
      ),
  );
  assert.ok(
    workflow.indexOf(
      "Revoke and delete runner-only ephemeral S232H2 accounts",
    ) < workflow.indexOf("Remove the ephemeral visual-account proof"),
  );
  assert.match(workflow, /Remove the ephemeral visual-account proof/);
  assert.match(workflow, /rm -f -- "\$\{S232H2_VISUAL_PROOF_PATH\}"/);

  const successfulArtifact = blockBetween(
    workflow,
    "Upload 28 synthetic and Figma-reference PNGs and one manifest",
    "Revoke and delete runner-only ephemeral S232H2 accounts",
  );
  assert.doesNotMatch(
    successfulArtifact,
    /runner\.temp|VISUAL_PROOF|EPHEMERAL_STATE|GITHUB_ENV|SUPABASE|EMAIL|PASSWORD/,
  );
});

test("runner API audit and browser visual contexts keep distinct bypass behavior", () => {
  const runnerSession = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function readPreviewSnapshot",
  );
  const runnerContext = blockBetween(
    runnerSession,
    "request.newContext({",
    "  });\n  try {",
  );
  assert.match(
    runnerContext,
    /"x-vercel-protection-bypass": preview\.bypassSecret/,
  );
  assert.doesNotMatch(runnerContext, /x-vercel-set-bypass-cookie/);
  assert.doesNotMatch(runnerContext, /x-vercel-skip-toolbar/);
  assert.doesNotMatch(ephemeralAccounts, /x-vercel-set-bypass-cookie/);
  assert.doesNotMatch(ephemeralAccounts, /x-vercel-skip-toolbar/);

  for (const request of [
    /runPreviewRequest\("runtime-version", \(\) =>\s*context\.get\("\/api\/runtime\/version"/,
    /runPreviewRequest\("sign-in", \(\) =>\s*context\.post\("\/api\/auth\/sign-in"/,
    /runPreviewRequest\("session", \(\) =>\s*context\.get\("\/api\/auth\/session"/,
  ]) {
    assert.match(runnerSession, request);
  }
  assert.match(
    runnerSession,
    /context\.get\("\/api\/auth\/session", \{\s*maxRedirects: 0/,
  );

  const sourceAudit = blockBetween(
    ephemeralAccounts,
    "async function readPreviewSnapshot",
    "function assertPreviewPrimaryExact",
  );
  assert.match(
    sourceAudit,
    /runPreviewRequest\("source-audit", \(\) =>\s*context\.get/,
  );
  assert.match(
    sourceAudit,
    /runPreviewRequest\(requestLabel, \(\) =>\s*context\.get/,
  );

  const browserHeaders = blockBetween(
    authenticatedRuntime,
    "export const protectionHeaders",
    "export async function establishProtectedPreviewSession",
  );
  assert.match(
    browserHeaders,
    /"x-vercel-protection-bypass": vercelBypassSecret/,
  );
  assert.match(browserHeaders, /"x-vercel-set-bypass-cookie": "true"/);
  assert.doesNotMatch(browserHeaders, /x-vercel-skip-toolbar/);
  const browserBootstrap = blockBetween(
    authenticatedRuntime,
    "export async function establishProtectedPreviewSession",
    "type RuntimeSafetyOptions",
  );
  assert.match(browserBootstrap, /headers: protectionHeaders/);
  assert.match(browserBootstrap, /cookieRedirectStatuses/);
  assert.match(browserBootstrap, /headersArray\(\)/);
  assert.match(browserBootstrap, /page\.context\(\)\.cookies/);
  assert.match(browserBootstrap, /const cookieProofResponse/);

  const visualBrowserHeaders = blockBetween(
    spec,
    "const visualBrowserHeaders",
    "test.use({",
  );
  assert.match(visualBrowserHeaders, /\.\.\.protectionHeaders/);
  assert.match(
    visualBrowserHeaders,
    /"x-vercel-skip-toolbar": "1"/,
  );
  assert.equal(
    (spec.match(/"x-vercel-skip-toolbar": "1"/g) ?? []).length,
    1,
  );
  const defaultVisualContext = blockBetween(spec, "test.use({", "test.skip(");
  assert.match(
    defaultVisualContext,
    /extraHTTPHeaders: visualBrowserHeaders/,
  );

  const visualContext = blockBetween(
    spec,
    "async function newPreviewContext",
    "function allErrorCounts",
  );
  assert.equal((spec.match(/browser\.newContext\(/g) ?? []).length, 1);
  assert.match(
    visualContext,
    /extraHTTPHeaders: \{\s*\.\.\.visualBrowserHeaders/,
  );

  const visualAuditHeaders = blockBetween(
    spec,
    "function visualAuditRequestHeaders",
    "function throwRuntimeMonitorFailure",
  );
  assert.match(visualAuditHeaders, /\.\.\.protectionHeaders/);
  assert.doesNotMatch(visualAuditHeaders, /visualBrowserHeaders/);
});

test("Preview response validation is request-specific, value-safe, and privacy-safe", async () => {
  const runnerSession = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function readPreviewSnapshot",
  );
  const sourceAudit = blockBetween(
    ephemeralAccounts,
    "async function readPreviewSnapshot",
    "function assertPreviewPrimaryExact",
  );
  const requestContracts = [
    ["runtime-version", "S232H2_PREVIEW_RUNTIME_VERSION"],
    ["sign-in", "S232H2_PREVIEW_SIGN_IN"],
    ["session", "S232H2_PREVIEW_SESSION"],
    ["source-audit", "S232H2_PREVIEW_SOURCE_AUDIT"],
    ["rls-owner-probe", "S232H2_PREVIEW_RLS_OWNER_PROBE"],
    ["rls-cross-account-probe", "S232H2_PREVIEW_RLS_CROSS_ACCOUNT_PROBE"],
  ];
  assert.deepEqual(
    Object.entries(PREVIEW_REQUEST_CODE_PREFIXES),
    requestContracts,
  );
  for (const [label, prefix] of requestContracts) {
    for (const [status, contentType, kind] of [
      [302, "text/html", "HTTP_REDIRECT"],
      [401, "application/json", "HTTP_CLIENT_ERROR"],
      [503, "application/json", "HTTP_SERVER_ERROR"],
      [204, "application/json", "HTTP_UNEXPECTED_STATUS"],
      [200, undefined, "CONTENT_TYPE_MISSING"],
      [200, "text/html", "CONTENT_TYPE_NON_JSON"],
      [200, "application/problem+json", "CONTENT_TYPE_NON_JSON"],
    ]) {
      assert.equal(
        previewResponseMetadataFailureCode(label, status, contentType),
        `${prefix}_${kind}`,
      );
    }
    assert.equal(
      previewResponseMetadataFailureCode(
        label,
        200,
        " Application/JSON ; charset=utf-8",
      ),
      null,
    );
    assert.equal(
      previewRequestFailureCode(label, "REQUEST_FAILED"),
      `${prefix}_REQUEST_FAILED`,
    );
    assert.equal(
      previewRequestFailureCode(label, "JSON_INVALID"),
      `${prefix}_JSON_INVALID`,
    );
    assert.equal(
      previewRequestFailureCode(label, "JSON_VALUE_INVALID"),
      `${prefix}_JSON_VALUE_INVALID`,
    );
  }
  assert.equal(isPreviewJsonObject({ ok: true }), true);
  assert.equal(isPreviewJsonObject(null), false);
  assert.equal(isPreviewJsonObject([]), false);
  assert.equal(isPreviewJsonObject("json"), false);
  assert.equal(
    retainFirstStableFailureCode(
      "S232H2_PRIVACY_RLS_OWNER_INITIAL_HTTP_SERVER_ERROR",
      "S232H2_PRIVACY_RLS_OWNER_INITIAL_DISPOSE_FAILED",
    ),
    "S232H2_PRIVACY_RLS_OWNER_INITIAL_HTTP_SERVER_ERROR",
  );
  assert.equal(
    retainFirstStableFailureCode(
      null,
      "S232H2_PRIVACY_RLS_OWNER_INITIAL_DISPOSE_FAILED",
    ),
    "S232H2_PRIVACY_RLS_OWNER_INITIAL_DISPOSE_FAILED",
  );
  const retainedFailure = blockBetween(
    previewResponseSupport,
    "export function retainFirstStableFailureCode",
    "/** @param {{ dispose(): Promise<void> }} response */",
  );
  assert.match(
    retainedFailure,
    /return primaryFailureCode \?\? cleanupFailureCode/,
  );
  assert.doesNotMatch(retainedFailure, /console\.|JSON\.stringify|throw/);

  const failureFactory = blockBetween(
    previewResponseSupport,
    "export function previewRequestFailureCode",
    "/**\n * @param {PreviewRequestLabel} requestLabel\n * @param {number} status",
  );
  assert.match(failureFactory, /PREVIEW_REQUEST_CODE_PREFIXES\[requestLabel\]/);
  assert.doesNotMatch(
    failureFactory,
    /error|status|contentType|response|body|headers|location|url|email|password|cookie|jwt|account|supabase/i,
  );

  const responseValidation = blockBetween(
    ephemeralAccounts,
    "async function runPreviewRequest",
    "async function createPreviewSession",
  );
  const metadataIndex = responseValidation.indexOf(
    "previewResponseMetadataFailureCode(",
  );
  const contentTypeIndex = responseValidation.indexOf(
    'response.headers()["content-type"]',
  );
  const jsonIndex = responseValidation.indexOf("value = await response.json()");
  const finallyIndex = responseValidation.indexOf("} finally {");
  const disposeIndex = responseValidation.indexOf(
    "await disposePreviewResponse(response)",
  );
  assert.ok(
    metadataIndex >= 0 &&
      contentTypeIndex > metadataIndex &&
      jsonIndex > contentTypeIndex &&
      finallyIndex > jsonIndex &&
      disposeIndex > finallyIndex,
  );
  assert.match(responseValidation, /if \(!isPreviewJsonObject\(value\)\)/);
  assert.match(responseValidation, /catch \{\s*fail\(/);
  assert.doesNotMatch(
    responseValidation,
    /response\.(?:body|text|url|statusText)\(|headersArray\(|\blocation\b|set-cookie|console\.|process\.(?:stdout|stderr)|JSON\.stringify/i,
  );
  assert.doesNotMatch(ephemeralAccounts, /S232H2_PREVIEW_JSON_INVALID/);

  let disposeCalls = 0;
  await disposePreviewResponse({
    async dispose() {
      disposeCalls += 1;
    },
  });
  assert.equal(disposeCalls, 1);
  await assert.doesNotReject(() =>
    disposePreviewResponse({
      async dispose() {
        throw new Error("bounded disposal failure");
      },
    }),
  );

  assert.match(
    runnerSession,
    /readPreviewJson\(\s*versionResponse,\s*"runtime-version"/,
  );
  assert.match(runnerSession, /readPreviewJson\(signInResponse, "sign-in"\)/);
  assert.match(runnerSession, /readPreviewJson\(sessionResponse, "session"\)/);
  assert.match(sourceAudit, /readPreviewJson\(response, "source-audit"\)/);
  assert.match(sourceAudit, /readPreviewJson\(response, requestLabel\)/);

  const rlsCalls = blockBetween(
    ephemeralAccounts,
    "async function verifyPreviewJwtAndRls",
    "async function writeRunnerState",
  );
  assert.match(rlsCalls, /"rls-owner-probe"/);
  assert.match(rlsCalls, /"rls-cross-account-probe"/);
});

test("artifact identity and network quiescence stay privacy-safe and fail-closed", () => {
  const runtimeRequestClassification = blockBetween(
    spec,
    "function normalizeRuntimeRequestResourceClass",
    "function monitorPageRuntime",
  );
  for (const resourceClass of [
    "document",
    "stylesheet",
    "image",
    "media",
    "font",
    "script",
    "texttrack",
    "xhr",
    "fetch",
    "eventsource",
    "websocket",
    "manifest",
    "other",
  ]) {
    assert.match(runtimeRequestClassification, new RegExp(`"${resourceClass}"`));
  }
  for (const statusClass of [
    "informational",
    "success",
    "redirect",
    "client-error",
    "server-error",
    "invalid",
  ]) {
    assert.match(runtimeRequestClassification, new RegExp(`"${statusClass}"`));
  }
  for (const contentClass of [
    "missing",
    "json",
    "html",
    "javascript",
    "css",
    "image",
    "font",
    "event-stream",
    "other",
  ]) {
    assert.match(runtimeRequestClassification, new RegExp(`"${contentClass}"`));
  }
  assert.match(
    runtimeRequestClassification,
    /response\.headers\(\)\["content-type"\]/,
  );
  assert.match(runtimeRequestClassification, /response\.status\(\)/);
  assert.match(runtimeRequestClassification, /:no-response/);
  assert.doesNotMatch(
    runtimeRequestClassification,
    /request\.url|response\.(?:url|body|text|statusText)|pathname|searchParams|headersArray|\blocation\b|console\.|JSON\.stringify/i,
  );

  const runtimeMonitor = blockBetween(
    spec,
    "function monitorPageRuntime",
    "function visualAuditRequestHeaders",
  );
  assert.match(runtimeMonitor, /headers\["next-router-prefetch"\] === "1"/);
  assert.doesNotMatch(runtimeMonitor, /next-router-prefetch[\s\S]*?=== "2"/);
  assert.match(runtimeMonitor, /same-origin-request-failure/);
  assert.match(runtimeMonitor, /same-origin-http-error/);
  assert.doesNotMatch(runtimeMonitor, /toolbar|x-vercel-skip-toolbar/i);
  assert.match(
    runtimeMonitor,
    /const trackedRequests = new WeakSet<Request>\(\)/,
  );
  assert.match(
    runtimeMonitor,
    /const trackedRequestClasses = new WeakMap</,
  );
  assert.match(runtimeMonitor, /pendingRequestClassCounts: new Map\(\)/);
  assert.match(
    runtimeMonitor,
    /updateTrackedRequestClass\([\s\S]*?respondedRuntimeRequestClass/,
  );
  assert.match(
    runtimeMonitor,
    /trackedRequestClasses\.delete\(request\)/,
  );
  const requestTracking = blockBetween(
    runtimeMonitor,
    'page.on("request",',
    'page.on("requestfinished"',
  );
  assert.match(
    requestTracking,
    /if \(url\.origin !== expectedOrigin\) return;[\s\S]*?trackedRequests\.add\(request\)/,
  );
  assert.doesNotMatch(
    requestTracking,
    /pathname|resourceType|isNavigationRequest|isExplicitPrefetch/,
  );
  assert.match(
    runtimeMonitor,
    /page\.on\("requestfinished", finishTrackedRequest\)/,
  );
  assert.match(
    runtimeMonitor,
    /page\.on\("requestfailed"[\s\S]*?finally \{[\s\S]*?finishTrackedRequest\(request\)/,
  );

  const boundary = blockBetween(
    spec,
    "async function inspectSyntheticArtifactBoundary",
    "async function captureSyntheticScreenshot",
  );
  const rawEmail = blockBetween(
    boundary,
    "const rawEmailOutsideMask",
    "const rawCredentialArtifactCount",
  );
  assert.match(
    rawEmail,
    /element instanceof HTMLScriptElement &&\s*!element\.hasAttribute\("src"\)/,
  );
  assert.match(
    rawEmail,
    /normalizedOwnText\.startsWith\(\s*"\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\("/,
  );
  assert.match(
    rawEmail,
    /normalizedOwnText\.startsWith\("self\.__next_f\.push\("\)/,
  );
  assert.match(
    rawEmail,
    /const ownText = isInlineNextFlightTransport \? "" : directOwnText/,
  );
  assert.doesNotMatch(rawEmail, /HTMLScriptElement\s*\? ""/);
  assert.match(rawEmail, /Array\.from\(element\.attributes\)/);
  assert.match(rawEmail, /element instanceof HTMLInputElement/);
  assert.match(rawEmail, /\[attributeText, ownText, value\]/);
  assert.match(
    boundary,
    /html\.includes\(password\) \|\| serializedValues\.includes\(password\)/,
  );
  assert.doesNotMatch(rawEmail, /querySelectorAll<HTMLElement>\("(?!body \*)/);

  const settle = blockBetween(
    spec,
    "async function settleRuntimeMonitors",
    "async function verifyRuntimeVersion",
  );
  const monitorFailure = blockBetween(
    spec,
    "function throwRuntimeMonitorFailure",
    "async function settleRuntimeMonitors",
  );
  const terminalMonitorFailure = blockBetween(
    spec,
    "function runtimeMonitorHasTerminalFailure",
    "async function settleRuntimeMonitors",
  );
  assert.doesNotMatch(settle, /waitForLoadState\("networkidle"/);
  assert.match(settle, /requireHealthyRuntimeMonitor\(page\)/);
  assert.match(settle, /pendingAuditRequestCount > 0/);
  assert.match(settle, /lastAuditRequestActivityAt < 250/);
  assert.match(settle, /const deadline = Date\.now\(\) \+ 10_000/);
  assert.match(settle, /S232H2_RUNTIME_REQUEST_QUIESCENCE_TIMEOUT/);
  assert.match(settle, /currentPendingRequestClasses\(state\)/);
  assert.match(monitorFailure, /S232H2_RUNTIME_MONITOR_REQUIRED/);
  assert.match(monitorFailure, /S232H2_RUNTIME_MONITOR_PAGE_CLOSED/);
  assert.match(settle, /S232H2_RUNTIME_RENDER_SETTLE_FAILED/);
  assert.match(monitorFailure, /state\.failureCode \?\?= failureCode/);
  assert.match(
    monitorFailure,
    /state\.failureRequestClasses \?\?= \[\.\.\.requestClasses\]/,
  );
  assert.match(
    monitorFailure,
    /error\[runtimePendingRequestClasses\] = state\.failureRequestClasses/,
  );
  assert.match(
    monitorFailure,
    /if \(state\.failureCode\)[\s\S]*?throwRuntimeMonitorFailure\(state, state\.failureCode\)/,
  );
  assert.match(monitorFailure, /error\.name = "TimeoutError"/);
  assert.match(terminalMonitorFailure, /runtimeMonitorStates\.get\(page\)/);
  assert.match(
    terminalMonitorFailure,
    /S232H2_RUNTIME_MONITOR_REQUIRED/,
  );
  assert.match(
    terminalMonitorFailure,
    /return state\.failureCode !== null/,
  );
  assert.doesNotMatch(
    terminalMonitorFailure,
    /failureCode\s*=|\.clear\(|\.delete\(|\bcatch\b|setTimeout|url|path|query|header|body|location|cookie|console|JSON\.stringify/i,
  );
  assert.doesNotMatch(settle, /page\.isClosed\(\)\) continue/);
  assert.doesNotMatch(settle, /\.catch\(/);

  const stableFailureClassification = blockBetween(
    spec,
    "function stableErrorFamily",
    "function resolveCredential",
  );
  assert.match(
    stableFailureClassification,
    /requestClasses: \[\.\.\.requestClasses\]/,
  );
  assert.doesNotMatch(
    stableFailureClassification,
    /url|path|query|header|body|location|cookie|jwt|email|account|console\.|JSON\.stringify/i,
  );
  assert.match(spec, /requestClasses\?: RuntimePendingRequestClass\[\]/);
  assert.match(
    spec,
    /\(candidate\.requestClasses \?\? \[\]\)\.join\("\|"\)/,
  );
  assert.equal((spec.match(/stableErrorFamily\(error\)/g) ?? []).length, 1);
  assert.ok(
    (spec.match(/\.\.\.stableFailureFields\(error\)/g) ?? []).length >= 13,
  );
  const routeAssertion = blockBetween(
    spec,
    "function assertRequiredRoute",
    "async function gotoRequiredRoute",
  );
  assert.match(routeAssertion, /observed\.pathname === expected\.pathname/);
  assert.match(routeAssertion, /observed\.searchParams\.get\(key\) === value/);
  const requiredRoute = blockBetween(
    spec,
    "async function gotoRequiredRoute",
    "async function gotoRequiredAuditRoute",
  );
  assert.match(requiredRoute, /await page\.goto\(requestedPath/);
  assert.match(requiredRoute, /await waitForStableRender\(page\)/);
  assert.match(requiredRoute, /assertRequiredRoute\(page, requestedPath\)/);
  assert.doesNotMatch(requiredRoute, /settleRuntimeMonitors/);
  const requiredAuditRoute = blockBetween(
    spec,
    "async function gotoRequiredAuditRoute",
    "async function visibleTargetFailures",
  );
  assert.match(
    requiredAuditRoute,
    /requireHealthyRuntimeMonitor\(page\);[\s\S]*?await gotoRequiredRoute\(page, requestedPath\);[\s\S]*?await settleRuntimeMonitors\(page\);[\s\S]*?assertRequiredRoute\(page, requestedPath\)/,
  );
  assert.doesNotMatch(requiredAuditRoute, /\bcatch\b/);

  const privacyRouteProbe = blockBetween(
    spec,
    "const ownerRead = await readRlsProbe",
    "const ownerReadAgain = await readRlsProbe",
  );
  assert.match(
    privacyRouteProbe,
    /gotoRequiredRoute\(selected\.page, "\/app\?mode=second"\)/,
  );
  assert.doesNotMatch(privacyRouteProbe, /gotoRequiredAuditRoute/);
  assert.match(privacyRouteProbe, /S232H2_PRIVACY_DOM_NAVIGATION_FAILED/);
  assert.match(
    privacyRouteProbe,
    /data-s224v-surface="\/app"[\s\S]*?data-s232d5-today-page="single-priority"/,
  );
  assert.match(
    privacyRouteProbe,
    /expectedSurface\.waitFor\(\{ state: "visible" \}\)/,
  );
  assert.match(
    privacyRouteProbe,
    /await expectedSurface\.count\(\)[\s\S]*?\.toBe\(1\)/,
  );
  assert.match(privacyRouteProbe, /S232H2_PRIVACY_DOM_SURFACE_INVALID/);
  assert.match(privacyRouteProbe, /S232H2_PRIVACY_DOM_CANARY_READ_FAILED/);
  assert.doesNotMatch(
    privacyRouteProbe,
    /console\.|response\.body|page\.url\(\)/,
  );

  const privacyRlsProbe = blockBetween(
    spec,
    "type PrivacyRlsProbeLabel",
    "function selectCleanVisualAccount",
  );
  for (const [label, prefix] of [
    ["owner-initial", "S232H2_PRIVACY_RLS_OWNER_INITIAL"],
    ["cross-account", "S232H2_PRIVACY_RLS_CROSS_ACCOUNT"],
    ["owner-repeat", "S232H2_PRIVACY_RLS_OWNER_REPEAT"],
  ]) {
    assert.match(privacyRlsProbe, new RegExp(`"${label}": "${prefix}"`));
  }
  const privacyRlsFailure = blockBetween(
    privacyRlsProbe,
    "function privacyRlsProbeFailureCode",
    "async function readRlsProbe",
  );
  assert.match(
    privacyRlsFailure,
    /privacyRlsProbeCodePrefixes\[requestLabel\][\s\S]*?failureKind[\s\S]*?PrivacyRlsProbeFailure/,
  );
  assert.doesNotMatch(
    privacyRlsFailure,
    /itemId|url|query|response|body|header|cookie|jwt|email|supabase|console/i,
  );
  const privacyRlsRead = privacyRlsProbe.slice(
    privacyRlsProbe.indexOf("async function readRlsProbe"),
  );
  const rlsStatusIndex = privacyRlsRead.indexOf(
    "const status = response.status()",
  );
  const rlsContentTypeIndex = privacyRlsRead.indexOf(
    'response.headers()["content-type"]',
  );
  const rlsJsonIndex = privacyRlsRead.indexOf("body = await response.json()");
  const rlsDisposeIndex = privacyRlsRead.indexOf("await response.dispose()");
  assert.ok(
    rlsStatusIndex >= 0 &&
      rlsContentTypeIndex > rlsStatusIndex &&
      rlsJsonIndex > rlsContentTypeIndex &&
      rlsDisposeIndex > rlsJsonIndex,
  );
  assert.match(privacyRlsRead, /maxRedirects: 0/);
  assert.match(privacyRlsRead, /timeout: 30_000/);
  for (const kind of [
    "REQUEST_FAILED",
    "HTTP_REDIRECT",
    "HTTP_CLIENT_ERROR",
    "HTTP_SERVER_ERROR",
    "HTTP_UNEXPECTED_STATUS",
    "CONTENT_TYPE_INVALID",
    "JSON_INVALID",
    "JSON_VALUE_INVALID",
    "RESPONSE_VALIDATION_FAILED",
    "DISPOSE_FAILED",
  ]) {
    assert.match(privacyRlsRead, new RegExp(`"${kind}"`));
  }
  assert.match(privacyRlsRead, /contentType !== "application\/json"/);
  assert.match(
    privacyRlsRead,
    /hasExactObjectKeys\(body, \["ok", "rlsProbeVisible"\]\)/,
  );
  assert.match(
    privacyRlsRead,
    /finally \{[\s\S]*?await response\.dispose\(\)[\s\S]*?disposalFailureCode = privacyRlsProbeFailureCode\([\s\S]*?DISPOSE_FAILED/,
  );
  assert.match(
    privacyRlsRead,
    /const failureCode = retainFirstStableFailureCode\([\s\S]*?primaryFailureCode,[\s\S]*?disposalFailureCode[\s\S]*?if \(failureCode\) throw new Error\(failureCode\)/,
  );
  assert.match(
    privacyRlsRead,
    /error instanceof PrivacyRlsProbeFailure[\s\S]*?error\.stableCode[\s\S]*?RESPONSE_VALIDATION_FAILED/,
  );
  assert.doesNotMatch(
    privacyRlsRead,
    /console\.|error\.(?:message|stack|cause)|String\(error\)|throw error|response\.(?:body|text|url|statusText)\(|headersArray\(|\blocation\b|set-cookie/i,
  );
  const completePrivacyGate = blockBetween(
    spec,
    'test("@privacy S232H.2 privacy/auth source gate"',
    'test("@a11y S232H.2 split accessibility gate"',
  );
  for (const label of ["owner-initial", "cross-account", "owner-repeat"]) {
    assert.equal(
      [...completePrivacyGate.matchAll(new RegExp(`"${label}"`, "g"))].length,
      1,
      `privacy RLS request label must be used exactly once: ${label}`,
    );
  }

  assert.equal(
    [...spec.matchAll(/\bgotoRequiredRoute\(/g)].length,
    3,
    "base navigation is limited to its definition, the audit wrapper, and the privacy probe",
  );
  assert.equal(
    [...spec.matchAll(/\bgotoRequiredAuditRoute\(/g)].length,
    12,
    "all eleven audited navigation sites must retain strict quiescence",
  );
  const existingAuditRoute = blockBetween(
    spec,
    "async function settleExistingAuditRoute",
    "async function visibleTargetFailures",
  );
  assert.match(existingAuditRoute, /requireHealthyRuntimeMonitor\(page\)/);
  assert.equal(
    [...existingAuditRoute.matchAll(/assertRequiredRoute\(page, requestedPath\)/g)]
      .length,
    2,
  );
  assert.match(
    existingAuditRoute,
    /waitForStableRender\(page\)[\s\S]*?settleRuntimeMonitors\(page\)/,
  );
  assert.doesNotMatch(
    existingAuditRoute,
    /gotoRequiredRoute|page\.goto|\.catch\(/,
  );

  const exactAuditNavigationBlocks = [
    ["auditRoute", "async function auditRoute(", "function hasExactQuery"],
    [
      "prepareInitialRoute",
      "async function prepareInitialRoute",
      "async function runIsolatedDynamicCandidate",
    ],
    [
      "capture",
      "async function prepareCaptureExtractionPreview",
      "async function prepareAnswerReviewResult",
    ],
    [
      "answer-review",
      "async function prepareAnswerReviewResult",
      "async function prepareReviewSelectedState",
    ],
    [
      "review",
      "async function prepareReviewSelectedState",
      "async function clickCalculatorFocusAction",
    ],
  ];
  for (const [label, start, end] of exactAuditNavigationBlocks) {
    const source = blockBetween(spec, start, end);
    assert.equal(
      [...source.matchAll(/\bgotoRequiredAuditRoute\(/g)].length,
      1,
      `${label} must use exactly one audit navigation`,
    );
    assert.doesNotMatch(
      source,
      /\bgotoRequiredRoute\(/,
      `${label} must not bypass audit quiescence`,
    );
  }

  const a11yDynamicNavigation = blockBetween(
    spec,
    "const dynamicCandidates = [",
    "for (const dynamic of dynamicCandidates)",
  );
  const visualDynamicNavigation = blockBetween(
    spec,
    "const dynamicVisuals = [",
    "for (const dynamic of dynamicVisuals)",
  );
  const assertExactAuditCandidate = (source, label, expectedPath) => {
    assert.equal(
      [...source.matchAll(/\bgotoRequiredAuditRoute\(/g)].length,
      1,
      `${label} must use exactly one audit navigation`,
    );
    assert.match(source, expectedPath);
    assert.doesNotMatch(source, /\bgotoRequiredRoute\(/);
  };
  for (const [label, source] of [
    ["a11y", a11yDynamicNavigation],
    ["visual", visualDynamicNavigation],
  ]) {
    const sessionCandidate = blockBetween(
      source,
      'routeId: "session"',
      'routeId: "calculator"',
    );
    const calculatorCandidate = source.slice(
      source.lastIndexOf('routeId: "calculator"'),
    );
    assertExactAuditCandidate(
      sessionCandidate,
      `${label} dynamic session`,
      /\/app\/session\?mode=second/,
    );
    assertExactAuditCandidate(
      calculatorCandidate,
      `${label} dynamic calculator`,
      /\/app\/calculator\?mode=second/,
    );
  }

  const baselineNavigation = blockBetween(
    spec,
    "const baselineLedgerPath =",
    "await verifyRuntimeVersion(targetPage, runtimeRunnerSha)",
  );
  const baselineLedger = blockBetween(
    baselineNavigation,
    "const baselineLedgerPath =",
    "const beforeCalculator",
  );
  const baselineCalculator = baselineNavigation.slice(
    baselineNavigation.indexOf("const beforeCalculator"),
  );
  assertExactAuditCandidate(
    baselineLedger,
    "baseline ledger",
    /\/app\/items\//,
  );
  assertExactAuditCandidate(
    baselineCalculator,
    "baseline calculator",
    /\/app\/calculator\?mode=second/,
  );
  assert.match(
    baselineLedger,
    /let baselineLedgerNavigationAttempted = false/,
  );
  const baselineLedgerAttemptDeclaration = baselineLedger.indexOf(
    "let baselineLedgerNavigationAttempted = false",
  );
  const baselineLedgerViewportLoop = baselineLedger.indexOf(
    "for (const viewport of [viewports[0], viewports[2]])",
  );
  assert.ok(
    baselineLedgerAttemptDeclaration >= 0 &&
      baselineLedgerAttemptDeclaration < baselineLedgerViewportLoop,
  );
  assert.equal(
    [
      ...baselineLedger.matchAll(
        /baselineLedgerNavigationAttempted\s*=\s*false/g,
      ),
    ].length,
    1,
  );
  assert.equal(
    [
      ...baselineLedger.matchAll(
        /for \(const viewport of \[viewports\[0\], viewports\[2\]\]\)/g,
      ),
    ].length,
    1,
  );
  assert.match(
    baselineLedger,
    /if \(baselineLedgerNavigationAttempted\) \{[\s\S]*?settleExistingAuditRoute\([\s\S]*?baselinePage,[\s\S]*?baselineLedgerPath,[\s\S]*?\)[\s\S]*?\} else \{[\s\S]*?baselineLedgerNavigationAttempted = true;[\s\S]*?gotoRequiredAuditRoute\(baselinePage, baselineLedgerPath\)/,
  );
  assert.equal(
    [...baselineLedger.matchAll(/\bgotoRequiredAuditRoute\(/g)].length,
    1,
  );
  assert.equal(
    [...baselineLedger.matchAll(/\bsettleExistingAuditRoute\(/g)].length,
    1,
  );
  assert.match(
    baselineNavigation,
    /const baselineCalculatorPage = await baselineContext\.newPage\(\)[\s\S]*?monitorPageRuntime\([\s\S]*?baselineCalculatorPage,[\s\S]*?new URL\(baselineUrl\)\.origin/,
  );
  assert.match(
    baselineNavigation,
    /runtimeErrorGroups\.push\(baselineCalculatorErrors\)/,
  );
  assert.match(baselineCalculator, /page: baselineCalculatorPage/);
  assert.match(
    baselineCalculator,
    /gotoRequiredAuditRoute\([\s\S]*?baselineCalculatorPage,[\s\S]*?\/app\/calculator/,
  );
  assert.doesNotMatch(baselineCalculator, /page: baselinePage/);
  const baselinePostflightSettle = blockBetween(
    spec,
    "if (!runtimeMonitorHasTerminalFailure(baselinePage))",
    "await settleRuntimeMonitors(\n      targetPage,",
  );
  assert.equal(
    [
      ...baselinePostflightSettle.matchAll(
        /await settleRuntimeMonitors\(baselinePage\)/g,
      ),
    ].length,
    1,
  );
  assert.doesNotMatch(
    baselinePostflightSettle,
    /gotoRequired|\.goto\(|\.reload\(|\bcatch\b/,
  );
  const finalRuntimeSettle = blockBetween(
    spec,
    "await settleRuntimeMonitors(\n      targetPage,",
    "const runtimeErrorCount =",
  );
  assert.match(finalRuntimeSettle, /baselineCalculatorPage/);
  assert.doesNotMatch(finalRuntimeSettle, /baselinePage/);
  assert.equal(
    [
      ...spec.matchAll(
        /runtimeMonitorHasTerminalFailure\(baselinePage\)/g,
      ),
    ].length,
    1,
  );
  const visualRuntimePostflight = blockBetween(
    spec,
    'test("@visual S232H.2 one-pass visual and Figma gate"',
    "let finalAudit: VisualAccountAudit | null = null",
  );
  const finalRuntimeErrorCount = blockBetween(
    visualRuntimePostflight,
    "const runtimeErrorCount =",
    "if (runtimeErrorCount > 0)",
  );
  for (const evidence of [
    "consoleErrors",
    "pageErrors",
    "sameOriginRequestFailures",
  ]) {
    assert.match(
      finalRuntimeErrorCount,
      new RegExp(`baselineCalculatorErrors\\.${evidence}\\.length`),
    );
  }

  assert.equal(
    [...spec.matchAll(/page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/g)]
      .length,
    2,
    "only the calculator and capture recovery reloads are permitted",
  );
  const calculatorReload = blockBetween(
    spec,
    "async function advanceCalculatorToCasioInput",
    "async function completeCalculatorRoutine",
  );
  assert.match(
    calculatorReload,
    /page\.reload[\s\S]*?waitForStableRender[\s\S]*?settleRuntimeMonitors/,
  );
  assert.doesNotMatch(calculatorReload, /page\.reload[\s\S]*?\bcatch\b/);
  const captureReload = blockBetween(
    spec,
    "async function prepareCaptureExtractionPreview",
    "async function prepareAnswerReviewResult",
  );
  assert.match(
    captureReload,
    /page\.reload[\s\S]*?waitForStableRender[\s\S]*?settleRuntimeMonitors/,
  );
  assert.doesNotMatch(captureReload, /page\.reload[\s\S]*?\bcatch\b/);
});

test("review selected-state preparation follows the bounded fill-triggered reveal", () => {
  assert.match(
    reviewQueueClient,
    /const hasRevealedHint =[^;]*primaryRecallText\.trim\(\)\.length > 0/s,
    "non-empty recall text must remain the reveal trigger",
  );

  const timeoutMatch = spec.match(
    /const REVIEW_PREPARATION_ACTION_TIMEOUT_MS = ([\d_]+);/,
  );
  assert.ok(timeoutMatch, "review preparation must declare an action bound");
  const actionTimeout = Number(timeoutMatch[1].replaceAll("_", ""));
  assert.ok(actionTimeout > 0 && actionTimeout <= 20_000);

  const preparation = blockBetween(
    spec,
    "async function prepareReviewSelectedState",
    "async function clickCalculatorFocusAction",
  );
  assert.doesNotMatch(
    preparation,
    /확인하기|force:\s*true|dispatchEvent|page\.evaluate|waitForTimeout|Promise\.race/,
    "review preparation must not revive or bypass the removed confirm button",
  );
  assert.equal(
    [...preparation.matchAll(/runReviewPreparationStage\(/g)].length,
    9,
  );
  assert.equal(
    [
      ...preparation.matchAll(
        /timeout: REVIEW_PREPARATION_ACTION_TIMEOUT_MS/g,
      ),
    ].length,
    8,
    "every Review locator action and assertion must carry the finite bound",
  );

  const orderedStages = [
    "review-route",
    "review-queue-visible",
    "review-title-match",
    "review-recall-fill",
    "review-check-visible",
    "review-rating-visible",
    "review-outcome-select",
    "review-outcome-selected",
    "review-interval-visible",
  ];
  let previousStageIndex = -1;
  for (const stage of orderedStages) {
    const stageIndex = preparation.indexOf(`"${stage}"`);
    assert.ok(
      stageIndex > previousStageIndex,
      `review stage is out of order: ${stage}`,
    );
    previousStageIndex = stageIndex;
  }
  assert.ok(
    preparation.indexOf(".fill(") <
      preparation.indexOf('[data-s232d4-review-check]'),
  );
  assert.ok(
    preparation.indexOf('[data-s232d4-review-check]') <
      preparation.indexOf('[data-s232d4-review-self-rating]'),
  );
  assert.ok(
    preparation.indexOf('[data-s232d4-review-self-rating]') <
      preparation.indexOf('selected.click({ timeout:'),
  );
  assert.match(
    preparation,
    /toHaveAttribute\("data-v3-selected", "true", \{/,
  );
  assert.match(preparation, /\[data-review-interval-suggestion\]/);

  const stageType = blockBetween(
    spec,
    "type ReviewPreparationStage",
    "type ScreenshotEvidence",
  );
  assert.deepEqual(
    [...stageType.matchAll(/\| "([a-z-]+)"/g)].map((match) => match[1]),
    orderedStages,
  );
  const sanitizedError = blockBetween(
    spec,
    "class ReviewPreparationError",
    "type FigmaComparison",
  );
  assert.match(sanitizedError, /S232H2_DYNAMIC_PREPARATION_FAILED/);
  assert.match(
    sanitizedError,
    /this\[runtimePendingRequestClasses\] = \[\.\.\.fields\.requestClasses\]/,
  );
  assert.doesNotMatch(
    sanitizedError,
    /cause|\.message|\.stack|JSON\.stringify|console\.|url|query|header|body|location|cookie|jwt|email|account/i,
  );
  const stageWrapper = blockBetween(
    spec,
    "async function runReviewPreparationStage",
    "async function writeVisualProof",
  );
  assert.match(stageWrapper, /stableFailureFields\(error\)/);
  assert.doesNotMatch(
    stageWrapper,
    /cause|error\.message|error\.stack|JSON\.stringify\(error\)|console\./,
  );
  const failureFields = blockBetween(
    spec,
    "function stableFailureFields",
    "function resolveCredential",
  );
  assert.match(
    failureFields,
    /preparationStage: error\[reviewPreparationStage\]/,
  );
  assert.match(
    failureFields,
    /fields\.requestClasses = \[\.\.\.requestClasses\]/,
  );
  const recorder = blockBetween(
    spec,
    "function recordStableGateFailure",
    "function stableErrorFamily",
  );
  assert.match(
    recorder,
    /candidate\.preparationStage === failure\.preparationStage/,
  );
});

test("direct Figma calculator capture preserves the truthful Current state only", () => {
  assert.match(
    spec,
    /type CalculatorCasioPreparation = "complete" \| "current-stuck";/,
  );
  assert.match(
    spec,
    /type InitialRoutePreparationOptions = \{[\s\S]*?calculatorCasioPreparation: CalculatorCasioPreparation;[\s\S]*?\};/,
  );
  const preparation = blockBetween(
    spec,
    "async function advanceCalculatorToCasioInput",
    "async function compareScreenshotToFigmaReference",
  );
  assert.match(
    preparation,
    /preparation: CalculatorCasioPreparation,[\s\S]*?if \(preparation === "current-stuck"\)/,
  );
  const currentStuck = blockBetween(
    preparation,
    'if (preparation === "current-stuck") {',
    "} else {",
  );
  assert.match(currentStuck, /expect\(casioInput\)\.toHaveValue\(""\)/);
  assert.match(currentStuck, /name: "이 단계에서 막힘"/);
  assert.match(
    spec,
    /const CALCULATOR_PREPARATION_ACTION_TIMEOUT_MS = 20_000;/,
  );
  assert.match(
    currentStuck,
    /stuckAction\.click\(\{[\s\S]*?timeout: CALCULATOR_PREPARATION_ACTION_TIMEOUT_MS,[\s\S]*?\}\)/,
  );
  assert.match(
    currentStuck,
    /expect\(calculatorStep\)\.toHaveAttribute\("data-v3-state", "Current"\)/,
  );
  assert.match(
    currentStuck,
    /expect\(focusAction\)\.toHaveAttribute\("data-v3-state", "Ready"\)/,
  );
  assert.match(currentStuck, /calculator-focus-action-control/);
  assert.match(currentStuck, /toBeEnabled\(\)/);
  assert.doesNotMatch(currentStuck, /calculatorCasioFixtureInput|\.fill\(/);

  const currentStuckStart = preparation.indexOf(
    'if (preparation === "current-stuck") {',
  );
  const completeStart = preparation.indexOf("} else {", currentStuckStart);
  assert.ok(currentStuckStart >= 0 && completeStart > currentStuckStart);
  const complete = preparation.slice(completeStart);
  assert.match(complete, /casioInput\.fill\(calculatorCasioFixtureInput\)/);
  assert.match(
    complete,
    /expect\(calculatorStep\)\.toHaveAttribute\("data-v3-state", "Complete"\)/,
  );

  const a11yInitial = blockBetween(
    spec,
    "for (const route of requiredRoutes) {",
    "const dynamicCandidates = [",
  );
  assert.doesNotMatch(a11yInitial, /current-stuck/);
  assert.match(
    a11yInitial,
    /prepareInitialRoute\([\s\S]*?\{ calculatorCasioPreparation: "complete" \},[\s\S]*?\)/,
  );
  const initialPreparation = blockBetween(
    spec,
    "async function prepareInitialRoute",
    "async function runIsolatedDynamicCandidate",
  );
  assert.match(
    initialPreparation,
    /advanceCalculatorToCasioInput\([\s\S]*?page,[\s\S]*?options\.calculatorCasioPreparation,[\s\S]*?\)/,
  );
  const directFigmaInitial = blockBetween(
    spec,
    "for (const viewport of viewports) {\n      for (const route of requiredRoutes) {",
    "const dynamicVisuals = [",
  );
  assert.match(
    directFigmaInitial,
    /calculatorCasioPreparation:[\s\S]*?route\.id === "calculator" \? "current-stuck" : "complete"/,
  );
  const dynamicVisuals = blockBetween(
    spec,
    "const dynamicVisuals = [",
    "for (const dynamic of dynamicVisuals)",
  );
  assert.doesNotMatch(dynamicVisuals, /current-stuck/);
  assert.match(
    dynamicVisuals,
    /advanceCalculatorToCasioInput\(page, "complete"\)/,
  );
  const dynamicA11y = blockBetween(
    spec,
    "const dynamicCandidates = [",
    "for (const dynamic of dynamicCandidates)",
  );
  assert.doesNotMatch(dynamicA11y, /current-stuck/);
  assert.match(
    dynamicA11y,
    /advanceCalculatorToCasioInput\(page, "complete"\)/,
  );
  const baselineVisuals = blockBetween(
    spec,
    "const baselineLedgerPath =",
    "await verifyRuntimeVersion(targetPage, runtimeRunnerSha)",
  );
  assert.doesNotMatch(baselineVisuals, /current-stuck/);
  assert.match(
    baselineVisuals,
    /advanceCalculatorToCasioInput\(baselineCalculatorPage, "complete"\)/,
  );
  assert.equal(
    [...spec.matchAll(/advanceCalculatorToCasioInput\([^,]+, "complete"\)/g)]
      .length,
    3,
  );
});

test("calculator completed-state geometry is strict, state-aware, and bounded", () => {
  assert.match(
    calculatorRoutineTrainer,
    /isFocusPresentation && trainerState !== "completed"/,
    "the product must keep the completed state free of an active StickyAction",
  );
  assert.match(
    calculatorRoutineTrainer,
    /trainerState === "completed"[\s\S]*?<RoutineCompletedSurface/,
  );

  const timeoutMatch = spec.match(
    /const REPRESENTATIVE_STRUCTURE_TIMEOUT_MS = ([\d_]+);/,
  );
  assert.ok(timeoutMatch, "representative structure reads must be bounded");
  const structureTimeout = Number(timeoutMatch[1].replaceAll("_", ""));
  assert.ok(structureTimeout > 0 && structureTimeout <= 20_000);

  const boxHelper = blockBetween(
    spec,
    "async function requiredRepresentativeBox",
    "async function verifyRepresentativeFigmaStructure",
  );
  assert.match(
    boxHelper,
    /locator\.boundingBox\(\{[\s\S]*?timeout: REPRESENTATIVE_STRUCTURE_TIMEOUT_MS/,
  );
  assert.match(boxHelper, /expect\(box\)\.not\.toBeNull\(\)/);

  const representative = blockBetween(
    spec,
    "async function verifyRepresentativeFigmaStructure",
    "type ShellCapabilities",
  );
  assert.match(representative, /state: string/);
  assert.doesNotMatch(
    representative,
    /\.boundingBox\(/,
    "all representative box reads must flow through the bounded helper",
  );
  const contentIndex = representative.indexOf(
    'page.locator("#calculator-routine-content")',
  );
  const trustIndex = representative.indexOf(
    'page.getByTestId("calculator-focus-trust")',
  );
  const completedIndex = representative.indexOf(
    'if (state === "completed-saved")',
  );
  assert.ok(
    contentIndex >= 0 &&
      trustIndex > contentIndex &&
      completedIndex > trustIndex,
    "calculator shell geometry must remain common to active and completed states",
  );

  const completed = blockBetween(
    representative,
    'if (state === "completed-saved")',
    "const step = await requiredRepresentativeBox",
  );
  assert.match(
    completed,
    /data-calculator-routine-state=\"completed\"\]\[data-calculator-routine-view-state=\"completed\"/,
  );
  assert.match(
    completed,
    /data-v3-component=\"Surface\"\]\[data-v3-tone=\"stable\"/,
  );
  assert.match(
    completed,
    /data-calculator-routine-sync-state=\"saved\"\]\[data-v3-system-state=\"completed\"/,
  );
  assert.match(completed, /name: "입력 수정", exact: true/);
  assert.match(
    completed,
    /data-v3-component=\"CalculatorStep\"[\s\S]*?toHaveCount\(0, \{ timeout: REPRESENTATIVE_STRUCTURE_TIMEOUT_MS \}\)/,
  );
  assert.match(
    completed,
    /data-v3-component=\"StickyAction\"[\s\S]*?toHaveCount\(0, \{ timeout: REPRESENTATIVE_STRUCTURE_TIMEOUT_MS \}\)/,
  );
  assert.match(completed, /expect\(edit\.height\)\.toBeGreaterThanOrEqual\(44\)/);
  assert.match(completed, /return;/);

  const active = representative.slice(
    representative.indexOf("const step = await requiredRepresentativeBox"),
  );
  for (const selector of [
    'data-v3-component="CalculatorStep"',
    "data-calculator-step-display",
    'data-v3-component="StickyAction"',
  ]) {
    assert.ok(active.includes(selector), `active geometry lost: ${selector}`);
  }

  const audit = blockBetween(
    spec,
    "async function auditRoute",
    "function hasExactQuery",
  );
  assert.match(
    audit,
    /verifyRepresentativeFigmaStructure\([\s\S]*?options\.state \?\? "initial"/,
  );
  assert.match(
    audit,
    /route\.id === "calculator" && options\.state !== "completed-saved"/,
  );
  assert.match(
    audit,
    /else if \(styles\.fixedDocks\.length !== 0\)/,
    "the completed state must still fail if any fixed dock remains",
  );
  assert.match(audit, /visibleTargetFailures\(page\)/);
  assert.match(audit, /new AxeBuilder\(\{ page \}\)/);

  const completion = blockBetween(
    spec,
    "async function completeCalculatorRoutine",
    "async function newPreviewContext",
  );
  assert.match(
    completion,
    /toHaveAttribute\([\s\S]*?"data-calculator-routine-state",[\s\S]*?"completed"/,
  );
  assert.match(
    completion,
    /data-calculator-routine-sync-state=\"saved\"/,
  );
});

test("ephemeral runner is pinned to the exact project, repository, PR, and head", () => {
  for (const contract of [
    /S232H2_EPHEMERAL_PROJECT_REF = "vajcduseyicjhyhrclax"/,
    /S232H2_EPHEMERAL_PROJECT_URL =\s*`https:\/\/\$\{S232H2_EPHEMERAL_PROJECT_REF\}\.supabase\.co`/,
    /S232H2_EXPECTED_REPOSITORY = "chachathecat\/inverge"/,
    /S232H2_EXPECTED_PR_NUMBER = 627/,
  ]) {
    assert.match(ephemeralAccounts, contract);
  }
  assert.match(
    ephemeralAccounts,
    /createClient\(S232H2_EPHEMERAL_PROJECT_URL, adminKey/,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /process\.env\.(?:NEXT_PUBLIC_)?SUPABASE_(?:URL|PROJECT)|NEXT_PUBLIC_SUPABASE|S232H2_SUPABASE_URL/,
  );

  const config = blockBetween(
    ephemeralAccounts,
    "async function readRunnerConfig",
    "function createAdminClient",
  );
  for (const name of [
    "S232H2_SUPABASE_ADMIN_KEY",
    "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_REPOSITORY",
    "GITHUB_EVENT_PATH",
    "RUNNER_TEMP",
    "E2E_RUNNER_SHA",
    "S232H2_EPHEMERAL_STATE_PATH",
  ]) {
    assert.ok(config.includes(`requiredEnv("${name}")`), `missing ${name}`);
  }
  assert.match(
    config,
    /resolve\(statePath\) !== resolve\(runnerTemp, "s232h2-ephemeral-state\.json"\)/,
  );
  assert.match(config, /event\.repository\?\.full_name/);
  assert.match(config, /event\.pull_request\?\.number/);
  assert.match(config, /event\.pull_request\.head\?\.sha !== headSha/);
  assert.match(config, /event\.pull_request\.head\.repo\?\.full_name/);

  const productionSurfaces = [
    readSourceTree("app/api"),
    readSourceTree("supabase/migrations"),
  ].join("\n");
  assert.doesNotMatch(
    productionSurfaces,
    /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH|s232h2-ephemeral-accounts|s232h2_test|s232h2-production-v3-visual/,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /NextRequest|NextResponse|export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b|auth\.users|\.rpc\(|\b(?:create|alter|drop)\s+policy\b|row level security/i,
  );
});

test("ephemeral credentials are random, masked first, and published only to job env", () => {
  const credentialBuilder = blockBetween(
    ephemeralAccounts,
    "function newCredential",
    "function buildMarker",
  );
  const emailIndex = credentialBuilder.indexOf("const email =");
  const emailMaskIndex = credentialBuilder.indexOf("maskImmediately(email)");
  const passwordIndex = credentialBuilder.indexOf("const password =");
  const passwordMaskIndex = credentialBuilder.indexOf(
    "maskImmediately(password)",
  );
  assert.ok(
    emailIndex >= 0 &&
      emailMaskIndex > emailIndex &&
      passwordIndex > emailMaskIndex &&
      passwordMaskIndex > passwordIndex,
  );
  assert.match(credentialBuilder, /randomBytes\(8\)\.toString\("hex"\)/);
  assert.match(credentialBuilder, /randomBytes\(36\)\.toString\("base64url"\)/);

  const publisher = blockBetween(
    ephemeralAccounts,
    "export async function publishMaskedCredentials",
    "async function deleteByUser",
  );
  assert.match(publisher, /requiredEnv\("GITHUB_ENV"\)/);
  assert.ok(
    publisher.indexOf("maskImmediately(value)") <
      publisher.indexOf("await appendFile"),
  );
  assert.deepEqual(
    [
      ...publisher.matchAll(
        /`(E2E_(?:VISUAL_USER|USER_B)_(?:EMAIL|PASSWORD))=\$\{/g,
      ),
    ].map((match) => match[1]),
    [
      "E2E_VISUAL_USER_EMAIL",
      "E2E_VISUAL_USER_PASSWORD",
      "E2E_USER_B_EMAIL",
      "E2E_USER_B_PASSWORD",
    ],
  );
  assert.doesNotMatch(publisher, /E2E_USER_A_|GITHUB_OUTPUT|set-output/);
  assert.doesNotMatch(ephemeralAccounts, /GITHUB_OUTPUT|set-output/);

  const stateType = blockBetween(
    ephemeralAccounts,
    "type RunnerState =",
    "type VisualSourceName",
  );
  const stateWrite = blockBetween(
    ephemeralAccounts,
    'activeStage = "state-write"',
    'activeStage = "credential-publish"',
  );
  for (const stateSource of [stateType, stateWrite]) {
    assert.doesNotMatch(
      stateSource,
      /email|password|accessToken|refreshToken|adminKey|credential/i,
    );
  }
  assert.match(ephemeralAccounts, /writeFile\([\s\S]*?mode: 0o600/);
  assert.equal(
    [...ephemeralAccounts.matchAll(/process\.stdout\.write\(/g)].length,
    3,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /process\.(?:stdout|stderr)\.write\([^\n]*(?:email|password|accessToken|refreshToken|adminKey)/i,
  );
});

test("exact cleanup metadata is bounded and never participates in authorization", () => {
  for (const contract of [
    /S232H2_EPHEMERAL_SUITE = "s232h2-production-v3-visual"/,
    /S232H2_EPHEMERAL_MARKER_VERSION = 1/,
    /S232H2_AUTH_PAGE_SIZE = 100/,
    /S232H2_AUTH_MAX_PAGES = 10/,
    /S232H2_STALE_MAX_USERS = 20/,
    /S232H2_STALE_AFTER_MS = 6 \* 60 \* 60 \* 1_000/,
    /S232H2_CURRENT_MAX_USERS = 2/,
  ]) {
    assert.match(ephemeralAccounts, contract);
  }
  const markerParser = blockBetween(
    ephemeralAccounts,
    "function parseExactMarker",
    "export function isExactS232h2MarkerUser",
  );
  for (const key of [
    "version",
    "suite",
    "repository",
    "pr_number",
    "head_sha",
    "run_id",
    "run_attempt",
    "role",
    "created_at",
  ]) {
    assert.ok(markerParser.includes(`"${key}"`), `marker omits ${key}`);
  }
  assert.match(markerParser, /user\.app_metadata\?\.s232h2_test/);
  assert.match(markerParser, /candidate\.repository/);
  assert.match(markerParser, /candidate\.pr_number/);
  assert.match(markerParser, /candidate\.head_sha/);
  assert.match(markerParser, /candidate\.role !== "primary"/);
  assert.match(markerParser, /candidate\.role !== "isolation"/);
  assert.match(markerParser, /expectedEmail\.test\(user\.email\)/);
  assert.match(markerParser, /Math\.abs\(authCreatedAt - markerCreatedAt\)/);

  const authScan = blockBetween(
    ephemeralAccounts,
    "async function listBoundedAuthUsers",
    "async function runReadOnlyCompatibilityProbe",
  );
  assert.match(
    authScan,
    /page <= S232H2_AUTH_MAX_PAGES[\s\S]*?perPage: S232H2_AUTH_PAGE_SIZE/,
  );
  assert.match(authScan, /S232H2_AUTH_SCAN_BOUND_EXHAUSTED/);
  const staleCleanup = blockBetween(
    ephemeralAccounts,
    "async function cleanupStaleMarkedUsers",
    "async function currentRunUsers",
  );
  assert.match(staleCleanup, /parseExactMarker\(user\)/);
  assert.match(staleCleanup, /!isCurrentRunMarker\(marker, config\)/);
  assert.match(staleCleanup, />= S232H2_STALE_AFTER_MS/);
  assert.match(staleCleanup, /stale\.length > S232H2_STALE_MAX_USERS/);

  const cleanupUser = blockBetween(
    ephemeralAccounts,
    "async function cleanupMarkedUser",
    "async function cleanupStaleMarkedUsers",
  );
  assert.match(cleanupUser, /if \(!isExactS232h2MarkerUser\(user\)\)/);
  assert.doesNotMatch(spec, /app_metadata|s232h2_test/);
  assert.doesNotMatch(exactFixture, /app_metadata|s232h2_test/);
});

test("provisioning and cleanup prove the exact graph, JWT boundary, and deletion", () => {
  const createUser = blockBetween(
    ephemeralAccounts,
    "async function createMarkedUser",
    "async function insertRows",
  );
  assert.match(createUser, /auth\.admin\.createUser\(/);
  assert.match(createUser, /email_confirm: true/);
  assert.match(createUser, /app_metadata: \{ s232h2_test: marker \}/);
  assert.match(createUser, /parseExactMarker\(result\.data\.user\)/);

  const seed = blockBetween(
    ephemeralAccounts,
    "async function seedFixtureGraph",
    "function canonicalJson",
  );
  assert.match(seed, /buildExactPrimaryFixtureGraph\(primary\.id, timestamp\)/);
  assert.match(seed, /\[primary, isolation\]\.map/);
  assert.match(seed, /invite_status: "active"/);
  assert.match(seed, /entitlement_tier: "core"/);
  assert.match(seed, /\[\.\.\.graph\.items, isolationCanary\.row\]/);

  const adminVerify = blockBetween(
    ephemeralAccounts,
    "async function verifyAdminFixtureGraph",
    "function requirePreviewConfig",
  );
  for (const family of [
    "PRIMARY_ITEMS_NOT_EXACT",
    "PRIMARY_NOTES_NOT_EXACT",
    "PRIMARY_TAGS_NOT_EXACT",
    "PRIMARY_RECURRENCE_NOT_EXACT",
    "PRIMARY_QUEUE_NOT_EXACT",
    "PRIMARY_SIGNALS_NOT_EXACT",
    "PRIMARY_USAGE_NOT_EXACT",
    "PRIMARY_UNRELATED_ROWS_PRESENT",
    "ISOLATION_CANARY_NOT_EXACT",
    "ISOLATION_GRAPH_OVERGROWN",
  ]) {
    assert.ok(adminVerify.includes(`S232H2_${family}`), `missing ${family}`);
  }
  const previewVerify = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function writeRunnerState",
  );
  assert.match(previewVerify, /context\.post\("\/api\/auth\/sign-in"/);
  assert.match(previewVerify, /context\.get\("\/api\/auth\/session"/);
  assert.match(previewVerify, /"\/api\/os\/visual-source-audit"/);
  assert.match(previewVerify, /body\.truncated\[name\] !== false/);
  assert.match(previewVerify, /const ownerVisible = await readRlsProbe/);
  assert.match(previewVerify, /const primaryHidden = await readRlsProbe/);
  assert.match(previewVerify, /if \(!ownerVisible \|\| primaryHidden\)/);
  assert.match(previewVerify, /canonicalStableSnapshot\(primaryBefore\)/);
  assert.match(previewVerify, /canonicalStableSnapshot\(primaryAfter\)/);

  const provision = blockBetween(
    ephemeralAccounts,
    "async function provision",
    "async function cleanup",
  );
  const orderedStages = [
    "compatibility-probe",
    "stale-cleanup",
    "account-create",
    "fixture-seed",
    "admin-fixture-verify",
    "preview-jwt-audit",
    "state-write",
    "credential-publish",
  ];
  let previous = -1;
  for (const stage of orderedStages) {
    const index = provision.indexOf(`activeStage = "${stage}"`);
    assert.ok(index > previous, `provision stage is out of order: ${stage}`);
    previous = index;
  }
  assert.equal([...provision.matchAll(/newCredential\(/g)].length, 2);
  assert.match(provision, /newCredential\("primary", config\)/);
  assert.match(provision, /newCredential\("isolation", config\)/);

  const revoke = blockBetween(
    ephemeralAccounts,
    "export async function revokeAllSessions",
    "export async function confirmAccountCleanup",
  );
  assert.match(revoke, /auth\.admin\.updateUserById/);
  assert.match(revoke, /auth\.signInWithPassword/);
  assert.match(revoke, /maskImmediately\(accessToken\)/);
  assert.match(revoke, /maskImmediately\(refreshToken\)/);
  assert.match(revoke, /auth\.admin\.signOut\(accessToken, "global"\)/);
  assert.match(revoke, /auth\.refreshSession/);
  assert.match(revoke, /S232H2_SESSION_REVOCATION_UNCONFIRMED/);

  const deleteUser = blockBetween(
    ephemeralAccounts,
    "async function cleanupMarkedUser",
    "async function cleanupStaleMarkedUsers",
  );
  const deleteOrder = [
    'deleteItemChildren(client, "wrong_answer_notes"',
    'deleteItemChildren(client, "wrong_answer_tags"',
    "USER_TABLES_IN_SAFE_DELETE_ORDER",
    'deleteByUser(client, "profiles"',
    "auth.admin.deleteUser(user.id, false)",
    "confirmAccountCleanup(client, user.id)",
  ];
  previous = -1;
  for (const operation of deleteOrder) {
    const index = deleteUser.indexOf(operation);
    assert.ok(index > previous, `cleanup is out of order: ${operation}`);
    previous = index;
  }
  assert.match(ephemeralAccounts, /confirmed\.count !== 0/);
  assert.match(ephemeralAccounts, /auth\.admin\.getUserById\(userId\)/);
  assert.match(ephemeralAccounts, /remaining\.length !== 0/);
  assert.match(ephemeralAccounts, /if \(!stateMatches\)/);
});

test("provision failure preserves only its first stable stage and code", () => {
  const stableCode = blockBetween(
    ephemeralAccounts,
    "function stableFailureCode",
    "function assertSafeScalar",
  );
  assert.match(stableCode, /error instanceof SafeFailure/);
  assert.match(stableCode, /\^S232H2_\[A-Z0-9_\]\+\$/);
  assert.match(stableCode, /S232H2_UNEXPECTED_FAILURE/);
  assert.doesNotMatch(stableCode, /stack|cause|response|url|email|password/i);

  const cli = blockBetween(
    ephemeralAccounts,
    "async function runCli",
    "const isDirectExecution",
  );
  assert.match(cli, /catch \(error\)/);
  assert.match(cli, /const failedStage = activeStage/);
  assert.match(cli, /activeStage = "provision-failure-cleanup"/);
  assert.match(cli, /activeStage = failedStage;\s*throw error/);
  assert.doesNotMatch(cli, /S232H2_PROVISION_FAILED/);

  const directExecution = ephemeralAccounts.slice(
    ephemeralAccounts.indexOf("const isDirectExecution"),
  );
  assert.match(directExecution, /catch\(\(error: unknown\) =>/);
  assert.match(
    directExecution,
    /S232H2_EPHEMERAL_FAILED:\$\{activeStage\}:\$\{stableFailureCode\(error\)\}/,
  );
});

test("browser and provisioner reuse one exact synthetic fixture grammar", () => {
  assert.match(
    spec,
    /from "\.\.\/\.\.\/scripts\/support\/s232h2-exact-fixture"/,
  );
  assert.match(ephemeralAccounts, /from "\.\/support\/s232h2-exact-fixture"/);
  for (const contract of [
    /export function exactFixtureGeneratedArtifacts/,
    /export function exactFixtureInput/,
    /export function exactFixtureProductionMetadata/,
    /export function buildExactFixtureLearningSignal/,
    /export function buildExactPrimaryFixtureGraph/,
    /const ledger = buildFixtureItem\(userId, "ledger", now\)/,
    /const queueAnchor = buildFixtureItem\(userId, "queue-anchor", now\)/,
  ]) {
    assert.match(exactFixture, contract);
  }
  assert.match(spec, /buildExactFixtureLearningSignal/);
  assert.match(spec, /exactFixtureGeneratedArtifacts/);
  assert.match(ephemeralAccounts, /buildExactPrimaryFixtureGraph/);
});

test("workflow preserves failure PNGs only after the privacy gate proves isolation", () => {
  const failureUpload = blockBetween(
    workflow,
    "Upload bounded synthetic PNG diagnostics after visual gate failure",
    "Recheck both exact deployment SHAs",
  );
  assert.match(
    failureUpload,
    /failure\(\) && steps\.privacy_gate\.outcome == 'success' && steps\.visual_gate\.outcome == 'failure'/,
  );
  for (const fileName of [
    "s232h2-after-ledger-390.png",
    "s232h2-figma-mobile-ledger-56-2.png",
    "s232h2-after-ledger-1440.png",
    "s232h2-figma-desktop-ledger-59-62.png",
    "s232h2-after-calculator-390.png",
    "s232h2-figma-mobile-calculator-57-34.png",
  ]) {
    assert.ok(failureUpload.includes(`test-results/**/${fileName}`));
  }
  assert.equal(
    [...failureUpload.matchAll(/test-results\/\*\*\/s232h2-[a-z0-9-]+\.png/g)]
      .length,
    6,
  );
  assert.match(failureUpload, /retention-days: 7/);
  assert.doesNotMatch(
    failureUpload,
    /s232h2-\*\.png|manifest|trace\.zip|\.webm|playwright-report|VISUAL_PROOF|EPHEMERAL_STATE|GITHUB_ENV|SUPABASE|EMAIL|PASSWORD/,
  );
  assert.doesNotMatch(
    workflow,
    /test-results\/\*\*\/\*\.png|trace\.zip|playwright-report/,
  );
});

test("spec exposes bounded source, accessibility, and visual gates", () => {
  for (const tag of ["@privacy", "@a11y", "@visual"]) {
    assert.match(
      spec,
      new RegExp(`test\\(\\s*[\\"'\\x60][^\\"'\\x60]*${tag}`),
      `missing ${tag} Playwright gate`,
    );
  }
  assert.match(spec, /test\.use\(\{[\s\S]*?video: "off"/);
  assert.match(spec, /test\.use\(\{[\s\S]*?screenshot: "off"/);
  assert.match(spec, /test\.use\(\{[\s\S]*?trace: "off"/);
  assert.doesNotMatch(spec, /1_500_000/);
  assert.doesNotMatch(spec, /S232H2_PREFLIGHT_OPEN/);

  const boundedTests = [
    {
      source: blockBetween(
        spec,
        'test("@privacy',
        'test("@a11y S232H.2 split accessibility gate',
      ),
      outerSeconds: 180,
    },
    {
      source: blockBetween(
        spec,
        'test("@a11y S232H.2 split accessibility gate',
        'test("@visual',
      ),
      outerSeconds: 900,
    },
    { source: spec.slice(spec.indexOf('test("@visual')), outerSeconds: 900 },
  ];
  for (const bounded of boundedTests) {
    const match = bounded.source.match(/test\.setTimeout\(([\d_]+)\)/);
    assert.ok(match, "each remote gate must declare its own timeout");
    const milliseconds = Number(match[1].replaceAll("_", ""));
    assert.ok(milliseconds > 0);
    assert.ok(
      milliseconds < bounded.outerSeconds * 1_000,
      "the shell bound must retain cleanup and reporter headroom",
    );
  }

  const a11yTestSources = [
    blockBetween(
      spec,
      'test("@a11y S232H.2 deterministic focus-origin micro-fixture',
      'test("@privacy',
    ),
    blockBetween(
      spec,
      'test("@a11y S232H.2 split accessibility gate',
      'test("@visual',
    ),
  ];
  const a11yTimeouts = a11yTestSources.map((source) => {
    const matches = [...source.matchAll(/test\.setTimeout\(([\d_]+)\)/g)];
    assert.equal(matches.length, 1);
    return Number(matches[0][1].replaceAll("_", ""));
  });
  assert.deepEqual(a11yTimeouts, [15_000, 840_000]);
  assert.ok(
    a11yTimeouts.reduce((total, timeout) => total + timeout, 0) < 900_000,
    "all @a11y test bounds must retain aggregate shell headroom",
  );
});

test("privacy source gate selects the first clean candidate in exact priority", () => {
  const candidates = blockBetween(
    spec,
    "const visualCredentialCandidates",
    "async function auditVisualAccountCandidate",
  );
  let previous = -1;
  for (const name of [
    "E2E_VISUAL_USER_EMAIL",
    "E2E_VISUAL_USER_PASSWORD",
    "E2E_USER_B_EMAIL",
    "E2E_USER_B_PASSWORD",
  ]) {
    const index = candidates.indexOf(name);
    assert.ok(index > previous, `credential priority is not exact: ${name}`);
    previous = index;
  }
  assert.doesNotMatch(candidates, /E2E_USER_A_(?:EMAIL|PASSWORD)/);
  assert.match(spec, /visualCredentialCandidates\.length !== 2/);
  assert.doesNotMatch(spec, /\bprocess\.env\.E2E_USER_EMAIL\b/);
  assert.doesNotMatch(spec, /\bprocess\.env\.E2E_USER_PASSWORD\b/);

  const selection = blockBetween(
    spec,
    "function selectCleanVisualAccount",
    "function safeProofIds",
  );
  assert.match(
    selection,
    /for \(const credential of visualCredentialCandidates/,
  );
  assert.doesNotMatch(selection, /console\.(?:log|info|warn|error)/);
  const candidateHandle = blockBetween(
    spec,
    "async function openCandidateHandle",
    "function selectCleanVisualAccount",
  );
  assert.match(candidateHandle, /newPreviewContext\(browser, runtimeBaseUrl\)/);
  assert.match(candidateHandle, /auditVisualAccountCandidate/);
  assert.match(spec, /nonFixtureRowCount === 0/);
  const privacyTest = blockBetween(spec, "@privacy", "@a11y");
  assert.match(
    privacyTest,
    /finally \{[\s\S]*?handles\.map[\s\S]*?handle\.context\.close\(\)[\s\S]*?stableStep: "cleanup"/,
  );
  assert.doesNotMatch(
    privacyTest,
    /handle\.context\.close\(\)\.catch\(\(\) => undefined\)/,
  );
  assert.match(privacyTest, /cleanupFailures\.length > 0/);
  assert.match(privacyTest, /unlink\(visualProofPath\)/);
});

test("privacy source audit is read-only, complete, and screenshot-free", () => {
  assert.match(spec, /"\/api\/auth\/session"/);
  assert.match(spec, /"\/api\/os\/visual-source-audit"/);
  assert.match(spec, /readVisualSourceSnapshot/);
  assert.match(spec, /readVisualEndpointAudit/);
  for (const endpoint of [
    "/api/os/items?limit=501",
    "/api/os/study-logs?mode=second&limit=501",
    "/api/os/review-queue",
    "/api/os/today-focus?mode=second",
    "/api/os/weekly-summary?mode=second",
  ]) {
    assert.ok(spec.includes(endpoint), `missing source GET audit: ${endpoint}`);
  }
  assert.match(spec, /endpointReadSucceeded/);
  assert.match(spec, /visualSourceNames\.every/);
  assert.match(spec, /observed\.truncated\[name\] === false/);
  assert.match(spec, /listedItems\.length < 501/);
  assert.match(spec, /logs\.length < 501/);
  assert.match(spec, /unknownLearnerEndpointCount/);
  assert.match(spec, /unknownLearnerRowCount/);
  assert.match(spec, /sameStringSequenceMembers/);
  assert.match(spec, /endpointItems\.length === endpointItemIds\.length/);
  assert.match(spec, /weeklySummary === null/);
  assert.match(spec, /recoveryTask && knownQueueCard\(recoveryTask\)/);
  assert.match(spec, /S232H2_UNKNOWN_ENDPOINT/);
  assert.match(spec, /S232H2_UNKNOWN_ROW/);
  assert.doesNotMatch(
    spec,
    /context\(\)\.request\.post\(\s*["']\/api\/os\/items|request\.post\(\s*["']\/api\/os\/items/,
  );
  assert.doesNotMatch(spec, /postSyntheticItem|ensureSyntheticLedgerFixture/);

  assert.match(sourceAuditRoute, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(sourceAuditRoute, /x-s232h2-audit-sha/);
  assert.match(sourceAuditRoute, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(sourceAuditRoute, /createSupabaseServerClient/);
  assert.match(sourceAuditRoute, /supabase\.auth\.getUser/);
  for (const table of [
    "wrong_answer_items",
    "wrong_answer_notes",
    "wrong_answer_tags",
    "recurrence_features",
    "review_queue_items",
    "study_logs",
    "weekly_learning_summaries",
    "learning_signal_events",
    "usage_events",
    "action_seeds",
    "study_profiles",
    "personal_concept_nodes",
  ]) {
    assert.ok(sourceAuditRoute.includes(`.from("${table}")`));
  }
  assert.doesNotMatch(
    sourceAuditRoute,
    /createSupabaseAdminClient|reviewOsRepository|\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );
  assert.match(sourceAuditRoute, /AUDIT_ROW_LIMIT = 501/);
  assert.match(sourceAuditRoute, /rlsProbeVisible/);
  assert.match(sourceAuditRoute, /post_save_execution_started/);
  assert.match(sourceAuditRoute, /review_followup_scheduled/);
  assert.match(spec, /"studyProfiles"/);
  assert.match(spec, /"conceptNodes"/);
  const canonicalRows = blockBetween(
    spec,
    "function canonicalSourceRows",
    "function sourceFingerprint",
  );
  assert.doesNotMatch(canonicalRows, /new Set/);
  assert.doesNotMatch(canonicalRows, /omittedKeys|\.filter\(/);

  const privacyTest = blockBetween(spec, "@privacy", "@a11y");
  assert.doesNotMatch(privacyTest, /page\.screenshot\(/);
  assert.match(privacyTest, /screenshotCallCount:\s*0/);
  assert.match(privacyTest, /scheduledCandidates/);
  assert.match(privacyTest, /completedAudits/);
  assert.match(privacyTest, /notRunCount:\s*0/);
  assert.equal(
    [...privacyTest.matchAll(/cleanVisualAccountRequired\(\)/g)].length,
    2,
    "the clean-account code is reserved for missing candidates or no clean selection",
  );
  assert.doesNotMatch(
    blockBetween(
      spec,
      'test("@a11y S232H.2 split accessibility gate',
      'test("@visual',
    ),
    /cleanVisualAccountRequired\(\)/,
  );
  assert.doesNotMatch(
    spec.slice(spec.indexOf('test("@visual')),
    /cleanVisualAccountRequired\(\)/,
  );
  assert.match(spec, /S232H2_VISUAL_PROOF_CONTRACT_REQUIRED/);
  assert.match(privacyTest, /S232H2_CROSS_ACCOUNT_GATE_OPEN/);
});

test("exact-SHA Preview read mode suppresses every visual GET side effect", () => {
  assert.match(readOnlyRequest, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(readOnlyRequest, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(readOnlyRequest, /x-s232h2-audit-sha/);
  assert.match(
    readOnlyRequest,
    /requestHeaders\.get\(AUDIT_SHA_HEADER\) === deploymentSha/,
  );
  assert.match(reviewOsRepository, /async readAccess[\s\S]*?\.select\(/);
  const readAccess = blockBetween(
    reviewOsRepository,
    "async readAccess",
    "async getStudyProfile",
  );
  assert.doesNotMatch(
    readAccess,
    /\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );
  assert.match(reviewOsServer, /isPreviewExactShaReadOnlyRequest/);
  assert.match(reviewOsServer, /reviewOsRepository\.readAccess/);
  for (const method of [
    "getReviewQueue",
    "getTodayFocus",
    "getWeeklyPlan",
    "getWeeklySummary",
  ]) {
    const start = reviewOsService.indexOf(`async ${method}`);
    const next = reviewOsService.indexOf("\n  async ", start + 8);
    const body = reviewOsService.slice(start, next < 0 ? undefined : next);
    assert.ok(start >= 0, `missing read-only service method: ${method}`);
    assert.match(body, /isPreviewExactShaReadOnlyRequest/);
    assert.match(body, /if \(readOnlyRequest\)/);
  }
});

test("privacy proof is mode-0600, value-free, fail-fast, and RLS-negative", () => {
  assert.match(spec, /S232H2_VISUAL_PROOF_PATH/);
  assert.match(spec, /writeFile\([\s\S]*?mode:\s*0o600/);
  assert.match(spec, /selectedSlot/);
  assert.match(spec, /selectedFingerprint/);
  assert.match(spec, /sourceFingerprint/);
  assert.match(spec, /snapshotReadSucceeded/);
  assert.match(spec, /snapshotStable/);
  assert.match(spec, /crossAccountDenied/);
  assert.match(spec, /deniedCanaryDomCount/);
  assert.match(spec, /fixtureOwnershipClosed/);
  assert.match(spec, /targetSessionBound/);
  assert.match(spec, /baselineSessionBound/);
  assert.match(spec, /baselineUsesSelectedFixture/);
  assert.match(spec, /ownerRead/);
  assert.match(spec, /const denied =/);
  assert.match(spec, /deniedCanary/);
  assert.match(
    spec,
    /S232H2_CLEAN_VISUAL_ACCOUNT_REQUIRED E2E_VISUAL_USER_EMAIL E2E_VISUAL_USER_PASSWORD/,
  );
  const cleanAccountErrorStart = spec.indexOf(
    "S232H2_CLEAN_VISUAL_ACCOUNT_REQUIRED",
  );
  const cleanAccountError = spec.slice(
    cleanAccountErrorStart,
    cleanAccountErrorStart + 220,
  );
  assert.doesNotMatch(
    cleanAccountError,
    /E2E_USER_[AB]_(?:EMAIL|PASSWORD)|error\.message|JSON\.stringify/,
  );
  assert.doesNotMatch(spec, /selectedSlot:\s*candidate\.(?:email|password)/);
});

test("dirty-account substring policy and real persistence are disconnected", () => {
  for (const forbidden of [
    /screenshot-boundary-policy/,
    /createScreenshotDataBoundary/,
    /collectNestedLearnerContent/,
    /addScreenshotBoundaryFragment/,
    /screenshotDataBoundaryFingerprint/,
    /fragmentDescriptors/,
    /unrestrictedFragments/,
    /sensitiveFragments/,
    /buildScreenshotBoundaryPolicyTable/,
    /collectSyntheticPayloadFailurePaths/,
    /historical-synthetic-fixtures/,
    /NodeFilter\.SHOW_TEXT/,
    /S232H2_SCREENSHOT_BOUNDARY_OPEN/,
  ]) {
    assert.doesNotMatch(spec, forbidden);
  }
  assert.match(spec, /installDeterministicVisualMocks/);
  assert.match(spec, /route\.fulfill\(/);
  assert.match(spec, /blockUnexpectedLearnerMutation/);
  assert.match(spec, /fixtureOwnershipClosed/);
  assert.match(spec, /identityMasked/);
  assert.match(spec, /rawIdentityArtifactCount/);
  assert.match(spec, /actualAccountArtifactCount/);
  assert.match(spec, /exactFixturePayloadClosed/);
  assert.match(spec, /exactFixtureLearningSignal/);
  assert.match(exactFixture, /export function exactFixtureGeneratedArtifacts/);
  assert.match(exactFixture, /export function exactFixtureProductionMetadata/);
  assert.match(spec, /canonicalCaptureFixtureProjection/);
  assert.match(spec, /captureFixtureTimingClosed/);
  assert.match(spec, /derived\.recurrenceCount === 1/);
  assert.match(spec, /second_stage_weak_paragraph_48h/);
  assert.match(spec, /derivedPayload\.retryDueAt !== null/);
  assert.match(spec, /derivedPayload\.followUpReviewAt !== null/);
  assert.match(spec, /fixtureMultiplicityClosed/);
  assert.match(spec, /usageMultiplicityClosed/);
  assert.match(
    spec,
    /privateLearnerContentCaptured:\s*actualAccountArtifactCount !== 0/,
  );
});

test("screenshot identity policy is exact, fail-closed, and value-safe", () => {
  const policyType = blockBetween(
    spec,
    "type ScreenshotIdentityPolicy",
    "const requiredRoutes",
  );
  assert.match(policyType, /"masked-shell" \| "identity-absent"/);
  assert.doesNotMatch(spec, /identityMaskRequired/);

  const initialPolicies = blockBetween(
    spec,
    "const initialIdentityPolicyByRoute",
    "const routeContractNodes",
  );
  const expectedInitialPolicies = {
    home: "identity-absent",
    login: "identity-absent",
    today: "masked-shell",
    capture: "masked-shell",
    "answer-review": "identity-absent",
    review: "masked-shell",
    notes: "masked-shell",
    ledger: "identity-absent",
    session: "masked-shell",
    agenda: "masked-shell",
    weekly: "masked-shell",
    write: "masked-shell",
    calculator: "identity-absent",
  };
  for (const [routeId, policy] of Object.entries(expectedInitialPolicies)) {
    const key = routeId === "answer-review" ? `"${routeId}"` : routeId;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      initialPolicies,
      new RegExp(`${escapedKey}: "${policy}"`),
      `wrong initial identity policy for ${routeId}`,
    );
  }
  assert.equal([...initialPolicies.matchAll(/: "masked-shell"/g)].length, 8);
  assert.equal([...initialPolicies.matchAll(/: "identity-absent"/g)].length, 5);

  const dynamicPolicies = blockBetween(
    spec,
    "const dynamicVisuals = [",
    "for (const dynamic of dynamicVisuals)",
  );
  const expectedDynamicPolicies = [
    ["capture", "extraction-preview", "masked-shell"],
    ["answer-review", "result", "identity-absent"],
    ["answer-review", "rewrite", "identity-absent"],
    ["review", "revealed-selected", "masked-shell"],
    ["session", "saved-capture", "masked-shell"],
    ["calculator", "completed-saved", "identity-absent"],
  ];
  for (const [routeId, state, policy] of expectedDynamicPolicies) {
    assert.match(
      dynamicPolicies,
      new RegExp(
        `routeId: "${routeId}"[\\s\\S]*?state: "${state}"[\\s\\S]*?identityPolicy: "${policy}"`,
      ),
      `wrong dynamic identity policy for ${routeId}-${state}`,
    );
  }
  assert.equal(
    [...dynamicPolicies.matchAll(/identityPolicy: "masked-shell"/g)].length,
    3,
  );
  assert.equal(
    [...dynamicPolicies.matchAll(/identityPolicy: "identity-absent"/g)].length,
    3,
  );

  const baselinePolicies = blockBetween(
    spec,
    "const baselineLedgerPath =",
    "await verifyRuntimeVersion(targetPage",
  );
  assert.match(
    baselinePolicies,
    /routeStateAlias: "before-ledger"[\s\S]*?identityPolicy: "identity-absent"/,
  );
  assert.match(
    baselinePolicies,
    /routeStateAlias: "before-calculator"[\s\S]*?identityPolicy: "masked-shell"/,
  );
  const candidatePolicies = [
    ...Object.values(expectedInitialPolicies),
    expectedInitialPolicies.today,
    expectedInitialPolicies.ledger,
    expectedInitialPolicies.ledger,
    ...expectedDynamicPolicies.map(([, , policy]) => policy),
    "identity-absent",
    "identity-absent",
    "masked-shell",
  ];
  assert.equal(candidatePolicies.length, 25);
  assert.equal(
    candidatePolicies.filter((policy) => policy === "masked-shell").length,
    13,
  );
  assert.equal(
    candidatePolicies.filter((policy) => policy === "identity-absent").length,
    12,
  );

  const boundary = blockBetween(
    spec,
    "async function inspectSyntheticArtifactBoundary",
    "async function captureSyntheticScreenshot",
  );
  for (const field of [
    "identitySurfaceCount",
    "visibleIdentitySurfaceCount",
    "identityMaskCount",
  ]) {
    assert.match(boundary, new RegExp(field));
  }
  const identityPolicyValidator = blockBetween(
    spec,
    "function screenshotIdentityPolicyError",
    "function recordArtifactBoundaryFailures",
  );
  assert.match(identityPolicyValidator, /policy === "masked-shell"/);
  assert.match(identityPolicyValidator, /boundary\.identitySurfaceCount !== 1/);
  assert.match(
    identityPolicyValidator,
    /boundary\.visibleIdentitySurfaceCount !== 1/,
  );
  assert.match(identityPolicyValidator, /boundary\.identityMaskCount !== 1/);
  assert.match(identityPolicyValidator, /boundary\.identitySurfaceCount !== 0/);
  assert.match(
    identityPolicyValidator,
    /boundary\.visibleIdentitySurfaceCount !== 0/,
  );
  assert.match(identityPolicyValidator, /boundary\.identityMaskCount !== 0/);
  const capture = blockBetween(
    spec,
    "async function captureSyntheticScreenshot",
    "async function prepareInitialRoute",
  );
  assert.match(capture, /recordArtifactBoundaryFailures\(/);
  for (const field of [
    "visibleEmailOutsideMask",
    "rawCredentialArtifactCount",
    "rawIdentifierArtifactCount",
    "deniedCanaryDomCount",
    "opaqueSurfaceCount",
  ]) {
    assert.match(capture, new RegExp(`boundary\\.${field} > 0`));
    assert.match(capture, new RegExp(`postCaptureBoundary\\.${field} > 0`));
  }
  assert.equal(
    [...capture.matchAll(/inspectSyntheticArtifactBoundary\(/g)].length,
    2,
  );
  assert.equal(
    [...capture.matchAll(/screenshotIdentityPolicyError\(/g)].length,
    2,
  );
  const screenshotIndex = capture.indexOf("page.screenshot(");
  assert.ok(
    capture.indexOf("inspectSyntheticArtifactBoundary(") < screenshotIndex &&
      capture.lastIndexOf("inspectSyntheticArtifactBoundary(") >
        screenshotIndex,
  );
  assert.match(capture, /page\.locator\(screenshotIdentitySelector\)/);
  assert.match(capture, /mask: \[identity\]/);
  assert.match(capture, /style: screenshotIdentityPrivacyStyle/);
  assert.doesNotMatch(capture, /identity\.all\(\)/);
  assert.match(capture, /boundary: postCaptureBoundary/);
  assert.match(
    spec,
    /screenshotIdentityPrivacyStyle[\s\S]*?color: transparent !important[\s\S]*?-webkit-text-fill-color: transparent !important/,
  );
  for (const family of [
    "visible-identity-outside-mask",
    "raw-credential-artifact",
    "visible-identifier-artifact",
    "identity-mask-missing",
    "identity-mask-mismatch",
    "unexpected-identity-surface",
  ]) {
    assert.ok(spec.includes(`"${family}"`), `missing safe family ${family}`);
  }
  assert.doesNotMatch(spec, /errorFamily: "identity"/);

  const identityClosure = blockBetween(
    spec,
    "const identityMasked =",
    "const actualAccountArtifactCount",
  );
  assert.match(identityClosure, /identityPolicy === "masked-shell"/);
  assert.match(identityClosure, /identityPolicy === "identity-absent"/);
  assert.match(identityClosure, /identitySurfaceCount === 1/);
  assert.match(identityClosure, /visibleIdentitySurfaceCount === 1/);
  assert.match(identityClosure, /identityMaskCount === 1/);
  assert.match(identityClosure, /identitySurfaceCount === 0/);
  assert.match(identityClosure, /visibleIdentitySurfaceCount === 0/);
  assert.match(identityClosure, /identityMaskCount === 0/);

  assert.match(
    learnerUi,
    /const focusMode = ledgerFocusMode \|\| calculatorFocusMode/,
  );
  const focusShell = blockBetween(
    learnerUi,
    "if (focusMode) {",
    "\n  return (\n    <div",
  );
  assert.match(focusShell, /data-learner-shell-mode="focus"/);
  assert.doesNotMatch(focusShell, /data-s224v-learner-mode-entry/);
  const defaultShell = learnerUi.slice(
    learnerUi.indexOf('data-learner-shell-mode="default"'),
  );
  assert.match(defaultShell, /data-s224v-learner-mode-entry="second-only"/);
});

test("a11y runs full mobile, lightweight wide geometry, and bounded keyboard profiles", () => {
  for (const route of requiredRoutes) {
    assert.ok(spec.includes(route), `missing production route: ${route}`);
  }
  for (const width of [390, 768, 1440]) {
    assert.ok(spec.includes(`width: ${width}`), `missing viewport: ${width}`);
  }
  assert.match(spec, /"mobile-full"/);
  assert.match(spec, /"geometry"/);
  assert.match(spec, /mobileFullScheduled/);
  assert.match(spec, /mobileFullCompleted/);
  assert.match(spec, /geometryScheduled/);
  assert.match(spec, /geometryCompleted/);
  assert.match(spec, /keyboardScheduled/);
  assert.match(spec, /keyboardCompleted/);
  assert.match(spec, /scheduledCandidates:\s*45/);
  assert.match(spec, /completedAudits/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /serious.*critical/s);
  assert.match(spec, /horizontalOverflow/);
  assert.match(spec, /visibleH1Count/);
  assert.match(spec, /targetRect\.width >= 44 && targetRect\.height >= 44/);
  assert.match(spec, /viewportBoundsFailureCount/);

  const a11yTest = blockBetween(spec, "@a11y", "@visual");
  const initialMatrix = blockBetween(
    a11yTest,
    "for (const route of requiredRoutes)",
    "const dynamicCandidates",
  );
  assert.ok(
    initialMatrix.indexOf("for (const route of requiredRoutes)") <
      initialMatrix.indexOf("for (const viewport of viewports)"),
  );
  assert.match(
    initialMatrix,
    /let routePrepared = false[\s\S]*?const requiresRouteNavigation =\s*!routePrepared \|\| requiresCalculatorWideReset/,
  );
  assert.match(
    initialMatrix,
    /requiresCalculatorWideReset[\s\S]*?CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX/,
  );
  assert.match(
    initialMatrix,
    /routePrepared = false;[\s\S]*?await prepareInitialRoute[\s\S]*?routePrepared = true/,
  );
  assert.match(
    initialMatrix,
    /else \{[\s\S]*?setViewportSize[\s\S]*?waitForStableRender/,
  );
  assert.match(
    initialMatrix,
    /await settleRuntimeMonitors\(routePage\);[\s\S]*?auditRows\.push\(row\)/,
  );
  const initialFinally = initialMatrix.slice(
    initialMatrix.lastIndexOf("} finally {"),
  );
  assert.doesNotMatch(initialFinally, /settleRuntimeMonitors/);
  assert.match(initialFinally, /removeKeyboardTraversalOrigin/);
  assert.match(a11yTest, /mobileFullScheduled:\s*19/);
  assert.match(a11yTest, /geometryScheduled:\s*26/);
  assert.match(a11yTest, /keyboardScheduled:\s*3/);
  assert.match(a11yTest, /route\.id === "today" \|\| route\.id === "ledger"/);
  assert.match(
    a11yTest,
    /dynamic\.routeId === "answer-review"[\s\S]*?dynamic\.state === "rewrite"/,
  );
  assert.doesNotMatch(
    a11yTest,
    /for[^\n]*requiredRoutes[\s\S]{0,300}?verifyKeyboardFocus/,
  );
});

test("skip-link, public landmark, and login focus contracts are capability-based", () => {
  const capabilities = blockBetween(
    spec,
    "async function inspectShellCapabilities",
    "async function auditRoute",
  );
  assert.match(capabilities, /data-learner-shell/);
  assert.match(capabilities, /data-answer-review-stage/);
  assert.match(capabilities, /data-standalone-learner-tool-nav/);
  assert.match(capabilities, /input\[type="email"\]/);
  assert.match(capabilities, /input\[type="password"\]/);
  assert.match(capabilities, /button\[type="submit"\]/);
  assert.doesNotMatch(capabilities, /route(?:Id|Alias|\.id)|"home"|"login"/);
  assert.match(spec, /"learner-shell"/);
  assert.match(spec, /"standalone-tool"/);
  assert.match(spec, /"public"/);
  assert.match(spec, /"login-form"/);
  assert.match(spec, /a\[data-v3-skip-link\]/);
  assert.match(spec, /S232H2_SKIP_LINK_COUNT_INVALID/);
  assert.match(
    spec,
    /capabilities\.requiresSkipLink && capabilities\.skipLinkCount !== 1/,
  );
  assert.match(spec, /const visibleH1Count =[\s\S]*?visibleH1Count !== 1/);
  assert.match(
    spec,
    /capabilities\.kind === "login-form"[\s\S]*?auditLoginFormFocus/,
  );
  assert.match(capabilities, /learnerShell > 0 \|\| answerReviewShell > 0/);
  assert.match(capabilities, /structureValid/);
  assert.match(spec, /!capabilities\.structureValid/);
});

test("dynamic candidates use fresh contexts, deterministic mocks, and finally cleanup", () => {
  const dynamic = blockBetween(
    spec,
    "async function runIsolatedDynamicCandidate",
    "async function runVisualCandidate",
  );
  assert.match(dynamic, /newPreviewContext\(browser, runtimeBaseUrl\)/);
  assert.match(dynamic, /installDeterministicVisualMocks/);
  assert.match(spec, /route\.fallback\(\)/);
  assert.match(spec, /request\.method\(\) !== "POST"/);
  assert.match(spec, /searchParams\.keys/);
  assert.match(spec, /postDataBuffer/);
  assert.match(dynamic, /phase: "a11y" \| "visual"/);
  assert.match(dynamic, /phase,/);
  assert.match(dynamic, /try \{/);
  assert.match(
    dynamic,
    /finally \{[\s\S]*?unrouteAll\(\{ behavior: "wait" \}\)[\s\S]*?context\.close\(\)/,
  );
  assert.doesNotMatch(dynamic, /sharedPage|sharedContext/);
  for (const state of [
    "capture-extraction-preview",
    "answer-review-result",
    "answer-review-rewrite",
    "review-revealed-selected",
    "session-saved-capture",
    "calculator-completed-saved",
  ]) {
    assert.ok(spec.includes(state), `missing isolated dynamic state: ${state}`);
  }
});

test("failure records are stable metadata and distinguish snapshot read from drift", () => {
  assert.match(spec, /phase/);
  assert.match(spec, /routeStateAlias/);
  assert.match(spec, /viewport/);
  assert.match(spec, /stableStep/);
  assert.match(spec, /errorFamily/);
  assert.match(spec, /"snapshot-read-failed"/);
  assert.match(spec, /"snapshot-drift"/);
  assert.match(spec, /snapshotReadSucceeded/);
  assert.match(spec, /snapshotStable/);
  const closure = blockBetween(
    spec,
    "const snapshotReadSucceeded = Boolean",
    "const diagnosticActualNames",
  );
  assert.match(
    closure,
    /if \(!snapshotReadSucceeded\)[\s\S]*?stableStep: "snapshot-read"[\s\S]*?errorFamily: "snapshot-read-failed"/,
  );
  assert.match(closure, /else if \(!snapshotStable\)/);
  assert.match(
    closure,
    /privacyClosureOpen[\s\S]*?"snapshot-read"[\s\S]*?"snapshot-drift"/,
  );
  const failureRecord = blockBetween(
    spec,
    "type StableGateFailure",
    "type ScreenshotEvidence",
  );
  assert.doesNotMatch(
    failureRecord,
    /message|stack|dom|text|email|itemId|userId|response|url/i,
  );
  const recorder = blockBetween(
    spec,
    "function recordStableGateFailure",
    "function stableErrorFamily",
  );
  assert.doesNotMatch(
    recorder,
    /error\.message|error\.stack|JSON\.stringify\(error/,
  );
});

test("visual gate is a single prepare-inspect-screenshot pass with post-read closure", () => {
  const visualCandidate = blockBetween(
    spec,
    "async function runVisualCandidate",
    "async function compareScreenshotToFigmaReference",
  );
  const prepareIndex = visualCandidate.indexOf("await prepare()");
  const inspectIndex = visualCandidate.indexOf("captureSyntheticScreenshot(");
  const cleanupIndex = visualCandidate.indexOf("finally {");
  assert.ok(
    prepareIndex >= 0 &&
      inspectIndex > prepareIndex &&
      cleanupIndex > inspectIndex,
  );
  const capture = blockBetween(
    spec,
    "async function captureSyntheticScreenshot",
    "async function prepareInitialRoute",
  );
  assert.match(
    capture,
    /inspectSyntheticArtifactBoundary[\s\S]*?page\.screenshot\(/,
  );
  assert.equal([...spec.matchAll(/page\.screenshot\(/g)].length, 1);
  assert.doesNotMatch(spec, /runPreflightCandidate|options\.preflight/);
  assert.match(spec, /visualGate[\s\S]*?scheduledCandidates:\s*25/);
  assert.match(spec, /completedAudits/);
  for (const field of [
    "preparationBlockerCount",
    "cleanupBlockerCount",
    "visualBlockerCount",
    "privacyBlockerCount",
  ]) {
    assert.match(spec, new RegExp(`${field}:\\s*0`));
  }
  assert.match(
    spec,
    /let finalAudit[\s\S]*?snapshotReadSucceeded[\s\S]*?snapshotStable[\s\S]*?for \(const screenshot[\s\S]*?writeFile/,
  );
  assert.match(spec, /selectedFingerprint/);
  assert.match(spec, /sourceFingerprint/);
  const visualTest = spec.slice(spec.indexOf('test("@visual'));
  assert.match(visualTest, /verifySessionBinding/);
  assert.match(visualTest, /proof\.selectedSessionFingerprint/);
  assert.match(
    visualTest,
    /targetAudit\?\.fingerprint === proof\.selectedFingerprint/,
  );
  assert.match(visualTest, /sameStringSet\(/);
  for (const family of [
    "items",
    "notes",
    "tags",
    "recurrence",
    "reviewQueue",
    "studyLogs",
    "weeklySummaries",
    "learningSignals",
    "agendaUsage",
    "todaySeeds",
    "studyProfiles",
    "conceptNodes",
  ]) {
    assert.ok(spec.includes(family), `fingerprint omits ${family}`);
  }
});

test("the 45-audit and 28-PNG matrix remains exact", () => {
  assert.match(
    spec,
    /initialAuditRowCount: proof\.auditRows![\s\S]*?auditKind === "initial-route"/,
  );
  assert.match(
    spec,
    /dynamicAuditRowCount: proof\.auditRows![\s\S]*?auditKind === "dynamic-state"/,
  );
  assert.match(spec, /auditRowCount: proof\.auditRows!\.length/);
  assert.match(spec, /beforeScreenshotCount: baselineScreenshots\.length/);
  assert.match(spec, /initialAfterScreenshotCount,/);
  assert.match(spec, /dynamicScreenshotCount:\s*dynamicAfterScreenshotCount/);
  assert.match(spec, /const dynamicScreenshotNames = new Set/);
  assert.match(spec, /afterScreenshotCount: afterScreenshots\.length/);
  assert.match(
    spec,
    /figmaReferenceScreenshotCount: figmaReferenceScreenshots\.length/,
  );
  assert.match(spec, /figmaComparisonCount: figmaComparisons\.length/);
  assert.match(spec, /screenshotCount: screenshotNames\.length/);
  assert.match(spec, /screenshotCallCount,/);
  assert.match(spec, /s232h2-before-ledger-/);
  assert.match(spec, /s232h2-before-calculator-390\.png/);
  assert.match(
    spec,
    /"s232h2-after-" \+ route\.id \+ "-" \+ viewport\.label \+ "\.png"/,
  );
  for (const name of [
    "s232h2-figma-mobile-ledger-56-2.png",
    "s232h2-figma-desktop-ledger-59-62.png",
    "s232h2-figma-mobile-calculator-57-34.png",
  ]) {
    assert.ok(spec.includes(name), `missing evidence PNG: ${name}`);
  }
  assert.match(workflow, /screenshotCount !== 28/);
  assert.match(workflow, /value\.screenshotCallCount !== 25/);
  assert.match(workflow, /a11yGate\.scheduledCandidates !== 45/);
  assert.match(workflow, /a11yGate\.completedAudits !== 45/);
  assert.match(workflow, /visualGate\.scheduledCandidates !== 25/);
  assert.match(workflow, /visualGate\.completedAudits !== 25/);
  assert.match(
    workflow,
    /privacyGate\.completedAudits !== privacyGate\.scheduledCandidates/,
  );
  assert.match(workflow, /privacyGate\.notRunCount !== 0/);
  assert.match(workflow, /privacyGate\.endpointReadSucceeded !== true/);
  assert.match(workflow, /privacyGate\.scheduledCandidates !== 2/);
  assert.match(
    workflow,
    /privacyGate\.selectedExactFixtureCount !== privacyGate\.selectedAccountItemCount/,
  );
  assert.match(workflow, /visualGate\.screenshotCallCount !== 25/);
  assert.match(workflow, /snapshotReadSucceeded !== true/);
  assert.match(workflow, /snapshotStable !== true/);
});

test("manifest and artifacts fail closed on blockers or real-account material", () => {
  assert.match(spec, /schemaVersion:\s*4/);
  assert.match(spec, /privacyGate/);
  assert.match(spec, /a11yGate/);
  assert.match(spec, /visualGate/);
  assert.match(spec, /credentialsRedacted/);
  assert.match(spec, /identityMasked/);
  assert.match(spec, /actualAccountArtifactCount:\s*0/);
  assert.match(
    spec,
    /privateLearnerContentCaptured:\s*actualAccountArtifactCount !== 0/,
  );
  assert.match(spec, /rawInputArtifactCaptured:\s*false/);
  assert.match(spec, /domCaptured:\s*false/);
  assert.match(spec, /traceCaptured:\s*false/);
  assert.match(spec, /videoCaptured:\s*false/);
  assert.match(
    spec,
    /result: figmaComparisons\.every\(\(comparison\) => comparison\.passed\)[\s\S]*?\? "pass"[\s\S]*?: "fail"/,
  );
  assert.match(
    spec,
    /expect\([\s\S]*?visualGate[\s\S]*?completedAudits: 25[\s\S]*?snapshotStable: true/,
  );
  assert.doesNotMatch(spec, /result:\s*["']pass["']/);
  assert.match(workflow, /privacyGate\.blockerCount !== 0/);
  assert.match(workflow, /privacyGate\.targetSessionBound !== true/);
  assert.match(workflow, /privacyGate\.baselineSessionBound !== true/);
  assert.match(workflow, /privacyGate\.baselineUsesSelectedFixture !== true/);
  assert.match(workflow, /a11yGate\.blockerCount !== 0/);
  for (const field of [
    "preparationBlockerCount",
    "cleanupBlockerCount",
    "visualBlockerCount",
    "privacyBlockerCount",
  ]) {
    assert.match(workflow, new RegExp(`visualGate\\.${field} !== 0`));
  }
  assert.match(workflow, /rawIdentityArtifactCount !== 0/);
  assert.match(workflow, /actualAccountArtifactCount !== 0/);
  assert.match(workflow, /forbiddenArtifactKeys/);
  for (const key of [
    "selectedSlot",
    "selectedFingerprint",
    "selectedSessionFingerprint",
    "fixtureIds",
    "ledgerItemId",
    "deniedCanary",
    "sessionUserId",
  ]) {
    assert.ok(workflow.includes(`"${key}"`));
  }
  assert.match(workflow, /\[0-9a-f\]\{64\}/);
  assert.match(workflow, /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}/);
  assert.match(workflow, /physicalScreenshots\.length !== 28/);
  assert.match(workflow, /s232h2-visual-manifest\.json/);
  assert.match(workflow, /test-results\/\*\*\/s232h2-\*\.png/);
});

test("Figma references remain pinned and hostile comparisons remain direct", () => {
  for (const snapshot of figmaSnapshots) {
    const buffer = readFileSync(`${snapshotDirectory}/${snapshot.file}`);
    assert.deepEqual(pngDimensions(buffer), {
      width: snapshot.width,
      height: snapshot.height,
    });
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      snapshot.sha256,
    );
  }
  for (const snapshotName of [
    "figma-mobile-ledger.png",
    "figma-desktop-ledger.png",
    "figma-mobile-calculator.png",
  ]) {
    assert.ok(
      spec.includes(snapshotName),
      `missing direct Figma snapshot: ${snapshotName}`,
    );
  }
  assert.match(spec, /compareScreenshotToFigmaReference/);
  assert.match(spec, /testInfo\.snapshotPath\(reference\.snapshotName\)/);
  assert.match(spec, /meanColorDelta/);
  assert.match(spec, /nearPixelRatio/);
  assert.match(spec, /edgeGridCorrelation/);
  assert.match(spec, /dilatedEdgeF1/);
  assert.match(spec, /anchorMaxRgbMeanDelta/);
  assert.match(spec, /anchorMinEdgeDensityRatio/);
  const desktopLedgerAnchors = blockBetween(
    spec,
    '"59:62": [',
    '"57:34": [',
  );
  const parsedDesktopLedgerAnchors = [
    ...desktopLedgerAnchors.matchAll(
      /\[(\d+), (\d+), (\d+), (\d+)\]/g,
    ),
  ].map((match) => match.slice(1).map(Number));
  assert.deepEqual(parsedDesktopLedgerAnchors, [
    [0, 0, 1440, 73],
    [220, 258, 900, 330],
    [220, 351, 900, 481],
    [220, 551, 900, 741],
    [932, 112, 1220, 292],
    [932, 312, 1220, 572],
    [932, 592, 1220, 847],
    [220, 771, 520, 838],
  ]);
  assert.doesNotMatch(desktopLedgerAnchors, /\[220, 786, 520, 838\]/);
  const directComparison = blockBetween(
    spec,
    "async function compareScreenshotToFigmaReference",
    "async function prepareCaptureExtractionPreview",
  );
  for (const threshold of [
    /metrics\.bluePixelRatioDelta <= 0\.12/,
    /metrics\.anchorMaxRgbMeanDelta <= 0\.18/,
    /metrics\.anchorMaxLuminanceStdDelta <= 0\.18/,
    /metrics\.anchorMaxDarkRatioDelta <= 0\.2/,
    /metrics\.anchorMinEdgeDensityRatio >= 0\.2/,
    /metrics\.anchorMaxEdgeDensityRatio <= 3\.5/,
  ]) {
    assert.match(directComparison, threshold);
  }
  assert.match(workflow, /comparison\.passed !== true/);
  assert.match(workflow, /comparison\.meanColorDelta > 0\.18/);
  assert.match(workflow, /comparison\.nearPixelRatio < 0\.5/);
  assert.match(workflow, /comparison\.edgeGridCorrelation < 0\.5/);
  for (const node of [
    "43:2",
    "44:9",
    "45:2",
    "47:28",
    "48:75",
    "50:59",
    "51:44",
    "52:42",
    "53:129",
    "56:2",
    "57:34",
    "59:62",
    "61:2",
    "61:80",
  ]) {
    assert.ok(
      spec.includes(`"${node}"`),
      `missing canonical Figma node: ${node}`,
    );
  }
});
