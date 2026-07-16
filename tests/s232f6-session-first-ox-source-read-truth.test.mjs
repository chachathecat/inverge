import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  missingRequestedCoreRouteRead,
  resolveRequestedCoreRouteRead,
} from "../lib/review-os/core-route-read-outcome.ts";
import {
  classifyFirstOxSourceResponse,
  isSafeRequestedSourceId,
  readFirstOxSourceDetail,
} from "../lib/review-os/first-ox-source-read.ts";

const read = (path) => readFileSync(path, "utf8");
const sessionPage = read("app/app/session/page.tsx");
const firstOxPage = read("app/app/first/ox/page.tsx");
const requestedClient = read(
  "components/review-os/first-ox/first-ox-requested-source-client.tsx",
);
const practiceClient = read(
  "components/review-os/first-ox/first-ox-practice-client.tsx",
);
const sourceState = read("components/review-os/requested-source-read-state.tsx");
const repository = read("lib/review-os/repository.ts");
const runtimeSpec = read("tests/e2e/s232f6-source-read-truth.spec.ts");
const runtimeWorkflow = read(".github/workflows/s232f6-runtime.yml");
const qa = read("docs/qa/s232f6-session-first-ox-source-read-truth.md");
const nodeRunner = read("scripts/run-node-tests.mjs");

const detail = Object.freeze({
  item: Object.freeze({
    id: "item-1",
    userId: "user-1",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
  }),
});

test("S232F.6 requested reads keep ready, missing, and unavailable mutually exclusive", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const ready = await resolveRequestedCoreRouteRead(
      "session_saved_capture_detail",
      async () => detail,
      (value) => value.item.userId === "user-1",
    );
    const rejected = await resolveRequestedCoreRouteRead(
      "session_saved_capture_detail",
      async () => detail,
      () => false,
    );
    const missing = await resolveRequestedCoreRouteRead(
      "session_saved_capture_detail",
      async () => null,
      () => true,
    );
    const unavailable = await resolveRequestedCoreRouteRead(
      "session_saved_capture_detail",
      async () => {
        throw new Error("private learner text learner@example.test item-1");
      },
      () => true,
    );

    assert.deepEqual(ready, { status: "ready", value: detail });
    assert.deepEqual(rejected, { status: "missing" });
    assert.deepEqual(missing, { status: "missing" });
    assert.deepEqual(unavailable, {
      status: "unavailable",
      retryable: true,
      safety: { kind: "unknown", preservationKnown: false },
    });
    for (const outcome of [ready, rejected, missing, unavailable]) {
      assert.equal(Object.isFrozen(outcome), true);
    }
    assert.deepEqual(warnings, [
      [
        "[review-os] core route read unavailable",
        { source: "session_saved_capture_detail", criticality: "essential" },
      ],
    ]);
    assert.doesNotMatch(
      JSON.stringify(warnings),
      /learner@example|private learner|item-1/,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(missingRequestedCoreRouteRead(), { status: "missing" });
  assert.equal(Object.isFrozen(missingRequestedCoreRouteRead()), true);
});

test("S232F.6 First OX API response classification fails closed", () => {
  const ready = classifyFirstOxSourceResponse(200, { ok: true, detail });
  assert.equal(ready.status, "ready");
  assert.equal(ready.status === "ready" && ready.detail, detail);

  for (const [status, body] of [[200, { ok: true, detail: null }]]) {
    assert.deepEqual(classifyFirstOxSourceResponse(status, body), {
      status: "missing",
    });
  }

  for (const [status, body] of [
    [200, { ok: true }],
    [200, { ok: false, detail }],
    [200, { ok: true, detail: { item: { id: "partial" } } }],
    [401, { ok: false }],
    [403, { ok: false }],
    [404, { ok: false }],
    [429, { ok: false }],
    [500, { ok: false }],
    [503, { ok: false }],
  ]) {
    assert.deepEqual(classifyFirstOxSourceResponse(status, body), {
      status: "unavailable",
      retryable: true,
      safety: { kind: "unknown", preservationKnown: false },
    });
  }
});

test("S232F.6 First OX detail fetch is GET-only, bounded, and content-silent", async () => {
  assert.equal(isSafeRequestedSourceId("abc_DEF-123"), true);
  assert.equal(isSafeRequestedSourceId(""), false);
  assert.equal(isSafeRequestedSourceId("../private"), false);
  assert.equal(isSafeRequestedSourceId("x".repeat(129)), false);

  let calls = 0;
  const controller = new AbortController();
  const missing = await readFirstOxSourceDetail(
    "safe-item",
    controller.signal,
    async (input, init) => {
      calls += 1;
      assert.equal(input, "/api/os/items/safe-item");
      assert.equal(init.method, "GET");
      assert.equal(init.credentials, "same-origin");
      assert.equal(init.cache, "no-store");
      assert.deepEqual(init.headers, { Accept: "application/json" });
      return { status: 200, json: async () => ({ ok: true, detail: null }) };
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(missing, { status: "missing" });

  const invalid = await readFirstOxSourceDetail(
    "../private",
    controller.signal,
    async () => {
      throw new Error("must not execute");
    },
  );
  assert.deepEqual(invalid, { status: "missing" });
});

test("S232F.6 access gates precede all requested source reads and nullable email is allowed", () => {
  assert.ok(
    sessionPage.indexOf('if (access.status !== "allowed")') <
      sessionPage.indexOf("resolveRequestedCoreRouteRead("),
  );
  assert.ok(
    firstOxPage.indexOf('if (access.status !== "allowed")') <
      firstOxPage.indexOf("<FirstOxRequestedSourceClient"),
  );
  assert.equal(sessionPage.includes("!session.email"), false);
  assert.equal(firstOxPage.includes("!session.email"), false);
  assert.equal(sessionPage.includes(".catch(() => null)"), false);
  assert.equal(firstOxPage.includes(".catch(() => null)"), false);
  assert.match(sessionPage, /\(\) =>\s*reviewOsService\.getWrongAnswerDetail\(/);
  assert.match(sessionPage, /session\.email/);
  assert.match(firstOxPage, /includeProfile: false/);
  assert.match(firstOxPage, /includeUsage: false/);
});

test("S232F.6 Session confirms only the exact readable capture detail", () => {
  assert.match(sessionPage, /savedCaptureItemId[\s\S]*?missingRequestedCoreRouteRead\(\)/);
  assert.match(sessionPage, /detail\.item\.userId === session\.userId/);
  assert.match(sessionPage, /detail\.item\.createdFromCapture === true/);
  assert.match(sessionPage, /detail\.item\.examName === config\.label/);
  assert.ok(
    sessionPage.indexOf('savedCaptureRead?.status === "unavailable"') <
      sessionPage.indexOf('title="오늘 계획에 반영했습니다."'),
  );
  assert.ok(
    sessionPage.indexOf('savedCaptureRead?.status === "missing"') <
      sessionPage.indexOf('title="오늘 계획에 반영했습니다."'),
  );
  assert.match(sessionPage, /\{savedCaptureDetail \? \(/);
  assert.equal(sessionPage.includes("activeDetail"), false);
  assert.match(
    sessionPage,
    /savedCaptureDetail\?\.item\.id === queueItem\.itemId[\s\S]*?\? savedCaptureDetail/,
  );
  assert.match(sessionPage, /const savedCaptureNote = savedCaptureDetail/);
  assert.match(sessionPage, /const queueItemNote = queueItemDetail/);

  const successStart = sessionPage.indexOf("<DailyCommandCard");
  const successEnd = sessionPage.indexOf("</DailyCommandCard>", successStart);
  const successCard = sessionPage.slice(successStart, successEnd);
  assert.equal(successCard.includes("queueItemDetail"), false);
  assert.equal(successCard.includes("queueItemNote"), false);
});

test("S232F.6 requested First OX never falls through to generic samples", () => {
  assert.match(firstOxPage, /if \(!sourceKind\)[\s\S]*?<FirstOxPracticeClient/);
  assert.match(
    firstOxPage,
    /if \(!requestedItemId \|\| !isSafeRequestedSourceId\(requestedItemId\)\)[\s\S]*?status="missing"/,
  );
  assert.match(firstOxPage, /key=\{`\$\{session\.userId\}:\$\{sourceKind\}:\$\{requestedItemId\}`\}/);
  assert.match(requestedClient, /outcome\.detail\.item\.userId !== expectedUserId/);
  assert.match(requestedClient, /state\.status !== "ready"/);
  assert.match(requestedClient, /status=\{state\.status\}/);
  assert.match(requestedClient, /initialStatements: \[\]/);
  assert.match(
    practiceClient,
    /retryStatements \?\? \(isGenericSource \? buildSampleStatements\(\) : \[\]\)/,
  );
  assert.match(practiceClient, /\{statements\.length > 0 \? \(/);
  assert.equal(practiceClient.includes('retryLoadStatus === "not_found"'), false);
  assert.equal(practiceClient.includes("불러오지 못해 기본 O/X 연습"), false);
});

test("S232F.6 First OX writes no learner content to browser storage and validates receipts per attempt", () => {
  assert.equal(practiceClient.includes("localStorage"), false);
  assert.equal(practiceClient.includes("sessionStorage"), false);
  assert.match(practiceClient, /receipt\.ok !== true/);
  assert.match(practiceClient, /receipt\.saved !== true/);
  assert.match(practiceClient, /saveStateByStatementId/);
  assert.match(practiceClient, /attemptCreatedAt/);
  assert.match(practiceClient, /saveGenerationRef/);
  assert.match(practiceClient, /현재 화면에만 남아 있으며 저장 완료로 표시하지 않습니다/);
  assert.match(practiceClient, /aria-live="polite"/);
  assert.match(practiceClient, /aria-atomic="true"/);
});

test("S232F.6 missing and unavailable UI is enumeration-safe and retryable", () => {
  assert.match(sourceState, /data-s232f6-source-read-state=\{status\}/);
  assert.match(sourceState, /삭제되었거나 현재 계정에서 볼 수 없는 기록입니다/);
  assert.match(sourceState, /기본 예제로 바꾸지 않았습니다/);
  assert.match(sourceState, /원본 기록 다시 확인/);
  assert.match(sourceState, /FailureAwareState/);
  assert.doesNotMatch(sourceState, /itemId|userId|email|owner/i);
});

test("S232F.6 repository ownership and exact-head runtime evidence fail closed", () => {
  const itemReadStart = repository.indexOf("async getWrongAnswerItem(userId: string, itemId: string)");
  const itemReadEnd = repository.indexOf("async listWrongAnswerItems", itemReadStart);
  const itemRead = repository.slice(itemReadStart, itemReadEnd);
  assert.match(itemRead, /\.eq\("user_id", userId\)/);
  assert.match(itemRead, /\.eq\("id", itemId\)/);
  assert.match(itemRead, /\.maybeSingle\(\)/);

  assert.match(runtimeWorkflow, /agent\/s232f6-source-read-truth/);
  assert.match(runtimeWorkflow, /<!-- run-s232f6-auth-e2e -->/);
  assert.match(runtimeWorkflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(runtimeWorkflow, /payload\.deploymentSha !== process\.env\.EXPECTED_SHA/);
  assert.match(runtimeWorkflow, /retention-days: 7/);
  assert.match(runtimeSpec, /establishProtectedPreviewSession\(page, "S232F\.6"\)/);
  assert.match(runtimeSpec, /requireExactHead: true/);
  assert.match(runtimeSpec, /status: 503/);
  assert.match(runtimeSpec, /syntheticCrossAccountUiDenialCount: 1/);
  assert.match(runtimeSpec, /realCrossAccountApiDenialCount/);
  assert.match(runtimeSpec, /realCrossAccountUiDenialCount/);
  assert.match(runtimeSpec, /realCrossAccountOwnerReadablePositiveControlCount/);
  assert.match(runtimeSpec, /realCrossAccountUnexpectedRuntimeErrorCount/);
  assert.match(runtimeSpec, /realTwoAccountDenialClaimed: true/);
  assert.match(runtimeSpec, /boundedCrossAccountStage/);
  assert.match(runtimeSpec, /cross-account stage failed: \$\{stage\}/);
  assert.match(runtimeSpec, /Date\.now\(\) \+ 180_000/);
  assert.match(runtimeSpec, /remainingBudget <= 0/);
  assert.match(runtimeSpec, /"a-context"/);
  assert.match(runtimeSpec, /"b-context"/);
  assert.match(runtimeSpec, /closeCrossAccountContext/);
  assert.match(runtimeSpec, /const cleanupResults = await Promise\.all/);
  assert.match(runtimeSpec, /cleanup-incomplete/);
  assert.match(runtimeSpec, /"b-api-denial"/);
  assert.match(runtimeSpec, /"b-first-ox-ui-denial"/);
  assert.match(runtimeSpec, /"b-session-ui-denial"/);
  assert.match(runtimeSpec, /"a-owner-positive-after"/);
  assert.match(runtimeSpec, /installContextWideMutationProbe/);
  assert.match(runtimeSpec, /if \(!active && kind !== "barrier"\) return;/);
  assert.match(runtimeSpec, /excludedPreviewToolbarInstrumentationCount/);
  assert.match(
    runtimeSpec,
    /hostname === "vercel\.live" \|\| hostname\.endsWith\("\.vercel\.live"\)/,
  );
  assert.match(runtimeSpec, /return "unclassified-cross-origin";/);
  assert.match(runtimeSpec, /__s232f6RecordMutation/);
  assert.match(runtimeSpec, /localInstrumentationErrorCount/);
  assert.match(runtimeSpec, /browserInstrumentationErrorCount/);
  assert.match(runtimeSpec, /first100WrongAnswerIdsFinalDigestUnchanged/);
  assert.match(runtimeSpec, /entry\.pathname === exactSyntheticPath/);
  assert.match(runtimeSpec, /globalDatabaseImmutabilityClaimed: false/);
  assert.match(runtimeSpec, /screenshot: "off"/);
  assert.match(runtimeSpec, /trace: "off"/);
  assert.match(runtimeSpec, /video: "off"/);
  assert.match(runtimeSpec, /new AxeBuilder/);
  assert.match(runtimeSpec, /desktopZoomWidthEquivalentPercent: 200/);
  assert.match(runtimeSpec, /postLoginBrowserMutationRequestCount/);
  assert.match(runtimeSpec, /blockedPreviewToolbarMutationCount/);
  assert.match(runtimeSpec, /blockedPreviewToolbarConsoleErrorCount/);
  assert.match(runtimeSpec, /blockedPreviewToolbarConsolePattern/);
  assert.match(runtimeSpec, /entry\.sourceClass === "vercel-preview-toolbar"/);
  assert.match(
    runtimeSpec,
    /blockedPreviewToolbarConsoleErrorCount\)\.toBeLessThanOrEqual\(\s*blockedPreviewToolbarMutationCount/,
  );
  assert.match(runtimeSpec, /requestClass === "vercel-preview-toolbar"/);
  assert.match(runtimeSpec, /previewToolbarExcludedFromProductMutationGate: true/);
  assert.match(runtimeWorkflow, /blockedPreviewToolbarMutationCount must be a bounded integer/);
  assert.match(
    runtimeWorkflow,
    /blockedPreviewToolbarConsoleErrorCount must be a bounded integer/,
  );
  assert.match(
    runtimeWorkflow,
    /excludedPreviewToolbarInstrumentationCount must be a bounded integer/,
  );
  assert.match(runtimeWorkflow, /secrets\.E2E_USER_A_EMAIL/);
  assert.match(runtimeWorkflow, /secrets\.E2E_USER_A_PASSWORD/);
  assert.match(runtimeWorkflow, /secrets\.E2E_USER_B_EMAIL/);
  assert.match(runtimeWorkflow, /secrets\.E2E_USER_B_PASSWORD/);
  assert.match(
    runtimeWorkflow,
    /secrets\.E2E_USER_A_EMAIL \|\| secrets\.E2E_USER_EMAIL/,
  );
  assert.match(
    runtimeWorkflow,
    /secrets\.E2E_USER_B_EMAIL \|\| secrets\.TEST_USER_EMAIL/,
  );
  assert.match(qa, /two isolated real invited-account sessions/i);
  assert.match(qa, /first-100 visible ID\s+digest is a final-state backstop/i);
  assert.match(qa, /not database-wide immutability/i);
  assert.match(
    nodeRunner,
    /tests\/s232f6-session-first-ox-source-read-truth\.test\.mjs/,
  );
});
