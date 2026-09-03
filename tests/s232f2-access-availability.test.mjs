import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  REVIEW_OS_ACCESS_UNAVAILABLE_REASONS,
  buildReviewOsAccessResult,
  buildReviewOsAccessUnavailableResult,
} from "../lib/review-os/access-result.ts";
import { buildFailureAwareStateModel } from "../lib/review-os/failure-aware-state.ts";
import { normalizeRepositoryPath } from "./platform-text.mjs";

const read = (path) => readFileSync(path, "utf8");

function collectPageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectPageFiles(fullPath);
    return entry.isFile() && entry.name === "page.tsx"
      ? [normalizeRepositoryPath(fullPath)]
      : [];
  });
}

const allowedAccess = Object.freeze({
  allowed: true,
  inviteStatus: "active",
  entitlementTier: "core",
  email: "invited@example.test",
});

const deniedAccess = Object.freeze({
  allowed: false,
  inviteStatus: "pending",
  entitlementTier: "free_trial",
  email: "pending@example.test",
});

test("S232F.2 access results keep allowed, denied, and unavailable mutually exclusive", () => {
  const allowed = buildReviewOsAccessResult(allowedAccess);
  const denied = buildReviewOsAccessResult(deniedAccess);

  assert.deepEqual(allowed, {
    status: "allowed",
    access: allowedAccess,
  });
  assert.deepEqual(denied, {
    status: "denied",
    access: deniedAccess,
  });
  assert.equal(allowed.access.allowed, true);
  assert.equal(denied.access.allowed, false);
  assert.equal(Object.hasOwn(allowed, "reason"), false);
  assert.equal(Object.hasOwn(denied, "reason"), false);
  assert.equal(Object.isFrozen(allowed), true);
  assert.equal(Object.isFrozen(allowed.access), true);
  assert.equal(Object.isFrozen(denied), true);
  assert.equal(Object.isFrozen(denied.access), true);

  for (const reason of REVIEW_OS_ACCESS_UNAVAILABLE_REASONS) {
    const unavailable = buildReviewOsAccessUnavailableResult(reason);
    assert.deepEqual(unavailable, {
      status: "unavailable",
      reason,
      retryable: true,
      safety: {
        kind: "unknown",
        preservationKnown: false,
      },
    });
    assert.equal(Object.hasOwn(unavailable, "access"), false);
    assert.equal(Object.isFrozen(unavailable), true);
    assert.equal(Object.isFrozen(unavailable.safety), true);
  }

  assert.throws(
    () => buildReviewOsAccessUnavailableResult("unknown_failure"),
    /unsupported-unavailable-reason/,
  );
});

test("S232F.2 unavailable copy is retryable while preservation and automatic sync remain unknown", () => {
  const model = buildFailureAwareStateModel({
    kind: "error",
    retryable: true,
    safety: {
      kind: "unknown",
      preservationKnown: false,
    },
  });

  assert.equal(model.state, "error");
  assert.equal(model.retryable, true);
  assert.equal(model.safety.kind, "unknown");
  assert.equal(model.autoSyncEligible, false);
  assert.equal(model.persistence, null);
  assert.match(model.safety.message, /보존 여부를 확인할 수 없습니다/);
  assert.doesNotMatch(
    `${model.title} ${model.happened} ${model.safety.message} ${model.nextAction}`,
    /저장이 끝났습니다|저장소의 기록으로 남아|데이터는 바뀌지 않았습니다|자동 재시도가 대기열에 등록|인터넷 연결이 없습니다/,
  );
});

test("S232F.2 server access resolution isolates access failures from later profile and usage work", () => {
  const server = read("lib/review-os/server.ts");
  const service = read("lib/review-os/service.ts");

  assert.match(
    server,
    /requireServerSession\(\s*await\s+resolveReviewOsReturnTo\(\s*returnTo\s*,?\s*\)\s*,?\s*\)/,
    "unauthenticated sessions must keep the existing redirect boundary and returnTo",
  );
  assert.match(server, /await resolveReviewOsAccess\(session\.userId, session\.email\)/);
  assert.match(server, /const resolveReviewOsAccess = cache\(async function resolveReviewOsAccess/);
  assert.match(server, /if \(access\.status !== "allowed"\)/);
  assert.match(server, /return \{ session, access, profile: null, usage: null \}/);
  assert.match(server, /await reviewOsRepository\.ensureAccess\(userId, email\)/);
  assert.match(server, /if \(!reason\) throw error/);
  assert.match(server, /isSupabasePersistenceUnavailableError\(error\)/);
  assert.match(server, /return "persistence_unavailable"/);
  assert.match(server, /isSupabasePersistenceOperationError\(error\)/);
  assert.match(server, /return "persistence_operation_failed"/);
  assert.match(server, /console\.warn\("\[review-os\] access check unavailable", \{ reason \}\)/);
  assert.doesNotMatch(server, /console\.warn\([^\n]*error/);
  assert.doesNotMatch(server, /buildFallbackAccess|closed beta access fallback/);
  assert.match(
    server,
    /getUsageSummaryAfterAccessCheck\(\s*session\.userId\s*,\s*access\s*,?\s*\)/,
  );
  assert.doesNotMatch(server, /getUsageSummary\(session\.userId, session\.email\)/);
  assert.match(service, /async getUsageSummaryAfterAccessCheck\(/);
  assert.match(service, /if \(access\.status !== "allowed" \|\| !access\.access\.allowed\)/);
  assert.match(service, /return this\.buildUsageSummary\(userId, access\.access\.entitlementTier\)/);

  const accessIndex = server.indexOf("const access = await resolveReviewOsAccess");
  const accessGateIndex = server.indexOf('if (access.status !== "allowed")');
  const profileIndex = server.indexOf("const profile =");
  const usageIndex = server.indexOf("const usage =");
  assert.ok(accessIndex >= 0 && accessIndex < accessGateIndex);
  assert.ok(accessGateIndex < profileIndex && profileIndex < usageIndex);
});

test("S232F.2 shell and route-level guards never present access unavailability as denial or empty data", () => {
  const layout = read("app/app/layout.tsx");
  const accessState = read("components/review-os/review-os-access-state.tsx");
  const state = read("components/review-os/access-check-unavailable-state.tsx");

  assert.match(layout, /if \(access\.status !== "allowed"\)/);
  assert.match(layout, /return <ReviewOsAccessState access=\{access\} \/>/);
  assert.match(accessState, /if \(access\.status === "unavailable"\)/);
  assert.match(accessState, /return <AccessCheckUnavailableState embedded=\{embedded\} \/>/);
  assert.match(accessState, /data-review-os-access-status="denied"/);
  assert.match(accessState, /아직 초대 승인 전입니다/);

  assert.match(state, /^"use client";/);
  assert.match(state, /<FailureAwareState/);
  assert.match(state, /kind: "error"/);
  assert.match(state, /retryable: true/);
  assert.match(state, /kind: "unknown"/);
  assert.match(state, /preservationKnown: false/);
  assert.match(state, /window\.location\.reload\(\)/);
  assert.match(state, /const Content = embedded \? "section" : "main"/);
  assert.match(state, /aria-labelledby="review-os-access-unavailable-title"/);
  assert.match(state, /현재 화면 다시 확인/);
  assert.match(state, /접근 상태를 확인하지 못했습니다/);
  assert.match(state, /이 화면은 초대 미승인 결과가 아닙니다/);
  assert.match(state, /data-review-os-access-status="unavailable"/);
  assert.doesNotMatch(
    state,
    /저장 완료|저장되었습니다|변경되지 않았|오프라인 저장|자동 (?:재시도|동기화)|대기열에 등록/,
  );
  assert.doesNotMatch(state, /searchParams|process\.env|cookies\(|localStorage|sessionStorage/);
});

test("S232F.2 every data-bearing app page gates a fresh access result before downstream work", () => {
  const guardedPages = [
    "app/app/agenda/page.tsx",
    "app/app/calculator/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/first/ox/page.tsx",
    "app/app/items/[itemId]/page.tsx",
    "app/app/items/[itemId]/support/page.tsx",
    "app/app/items/page.tsx",
    "app/app/mode-migration/page.tsx",
    "app/app/onboarding/page.tsx",
    "app/app/page.tsx",
    "app/app/review/page.tsx",
    "app/app/session/page.tsx",
    "app/app/sets/page.tsx",
    "app/app/settings/notifications/page.tsx",
    "app/app/settings/page.tsx",
    "app/app/study-log/page.tsx",
    "app/app/weekly/page.tsx",
    "app/app/write/page.tsx",
  ].sort();
  const delegatedOrFixturePages = [
    "app/app/acceptance/trust-provenance/[state]/page.tsx",
    "app/app/entry/page.tsx",
    "app/app/input/page.tsx",
    "app/app/notes/page.tsx",
    "app/app/today/page.tsx",
  ].sort();
  const specializedGuardPages = [
    "app/app/c3r-p/page.tsx",
    "app/app/c3r-l/page.tsx",
    "app/app/c3r-t/page.tsx",
    "app/app/capture/repair/page.tsx",
    "app/app/core-blitz/support/[itemId]/page.tsx",
    "app/app/trusted-repair/page.tsx",
  ].sort();
  const allPages = collectPageFiles("app/app").sort();

  assert.deepEqual(
    allPages,
    [...guardedPages, ...delegatedOrFixturePages, ...specializedGuardPages].sort(),
  );

  for (const page of guardedPages) {
    const source = read(page);
    const contextIndex = source.indexOf("await getReviewOsServerContext(");
    const guardIndex = source.indexOf('if (access.status !== "allowed")');
    const embeddedStateIndex = source.indexOf("<ReviewOsAccessState access={access} embedded />");

    assert.ok(contextIndex >= 0, `${page} must resolve access in its own server render`);
    assert.ok(guardIndex > contextIndex, `${page} must gate the resolved access result`);
    assert.ok(embeddedStateIndex > guardIndex, `${page} must render the non-nested route state`);

    const downstreamIndexes = [
      source.indexOf("reviewOsService."),
      source.indexOf("resolveAppraisalMode(", contextIndex),
      source.indexOf("resolveModeState(", contextIndex),
      source.indexOf("getEntitlementLimit(", contextIndex),
      source.indexOf("redirect(", contextIndex),
      source.indexOf("buildBeginnerFirstPlan(", contextIndex),
    ].filter((index) => index >= 0);
    for (const downstreamIndex of downstreamIndexes) {
      assert.ok(guardIndex < downstreamIndex, `${page} performs downstream work before its access gate`);
    }
  }

  assert.match(read("app/app/entry/page.tsx"), /redirect\(`\/app\/capture/);
  assert.match(read("app/app/input/page.tsx"), /redirect\(`\/app\/capture/);
  assert.match(read("app/app/today/page.tsx"), /redirect\("\/app/);
  assert.match(read("app/app/notes/page.tsx"), /ReviewOsItemsPage/);
  assert.equal(read("app/app/acceptance/trust-provenance/[state]/page.tsx").includes("getReviewOsServerContext"), false);

  const trustedRepairPage = read("app/app/trusted-repair/page.tsx");
  const trustedRepairContextIndex = trustedRepairPage.indexOf("await requireTrustedRepairAccess()");
  const trustedRepairDeniedIndex = trustedRepairPage.indexOf("isTrustedRepairAccessError(error)");
  const trustedRepairNotFoundIndex = trustedRepairPage.indexOf("notFound()", trustedRepairDeniedIndex);
  const trustedRepairRethrowIndex = trustedRepairPage.indexOf("throw error", trustedRepairNotFoundIndex);
  const trustedRepairLoopIndex = trustedRepairPage.indexOf(
    "<TrustedRepairLoop",
  );
  assert.ok(trustedRepairContextIndex >= 0, "trusted repair must resolve its specialized access gate");
  assert.ok(trustedRepairDeniedIndex > trustedRepairContextIndex);
  assert.ok(trustedRepairNotFoundIndex > trustedRepairDeniedIndex);
  assert.ok(trustedRepairRethrowIndex > trustedRepairNotFoundIndex);
  assert.ok(trustedRepairLoopIndex > trustedRepairRethrowIndex);

  const app1CaptureRepairPage = read("app/app/capture/repair/page.tsx");
  const app1ItemValidationIndex = app1CaptureRepairPage.indexOf(
    "if (!ITEM_ID_PATTERN.test(itemId)) notFound()",
  );
  const app1AccessIndex = app1CaptureRepairPage.indexOf(
    "await requireTrustedRepairAccess()",
  );
  const app1DeniedIndex = app1CaptureRepairPage.indexOf(
    "isTrustedRepairAccessError(error)",
    app1AccessIndex,
  );
  const app1AccessNotFoundIndex = app1CaptureRepairPage.indexOf(
    "notFound()",
    app1DeniedIndex,
  );
  const app1RethrowIndex = app1CaptureRepairPage.indexOf(
    "throw error",
    app1AccessNotFoundIndex,
  );
  const app1LoopIndex = app1CaptureRepairPage.indexOf(
    "<App1CaptureRepairLoop",
    app1RethrowIndex,
  );
  assert.ok(app1ItemValidationIndex >= 0, "APP-1 repair must validate itemId");
  assert.ok(
    app1AccessIndex > app1ItemValidationIndex,
    "APP-1 repair must validate itemId before resolving trusted access",
  );
  assert.ok(app1DeniedIndex > app1AccessIndex);
  assert.ok(app1AccessNotFoundIndex > app1DeniedIndex);
  assert.ok(app1RethrowIndex > app1AccessNotFoundIndex);
  assert.ok(
    app1LoopIndex > app1RethrowIndex,
    "APP-1 repair must render only after its specialized access boundary",
  );
  assert.doesNotMatch(
    app1CaptureRepairPage.slice(0, app1AccessIndex),
    /<App1CaptureRepairLoop|reviewOsService\.|\bfetch\s*\(/,
    "APP-1 repair must not fetch learner detail or begin downstream work before trusted access",
  );

  const c3rTPage = read("app/app/c3r-t/page.tsx");
  const c3rTAccessIndex = c3rTPage.indexOf("await requireC3RTAccess()");
  const c3rTDeniedIndex = c3rTPage.indexOf("error instanceof C3RTError");
  const c3rTNotFoundIndex = c3rTPage.indexOf("notFound()", c3rTDeniedIndex);
  const c3rTRethrowIndex = c3rTPage.indexOf("throw error", c3rTNotFoundIndex);
  const c3rTLoopIndex = c3rTPage.indexOf("<C3RTTheoryLoop");
  assert.ok(c3rTAccessIndex >= 0, "C3R-T must resolve its specialized access gate");
  assert.ok(c3rTDeniedIndex > c3rTAccessIndex);
  assert.ok(c3rTNotFoundIndex > c3rTDeniedIndex);
  assert.ok(c3rTRethrowIndex > c3rTNotFoundIndex);
  assert.ok(c3rTLoopIndex > c3rTRethrowIndex);

  const c3rLPage = read("app/app/c3r-l/page.tsx");
  const c3rLAccessIndex = c3rLPage.indexOf("await requireC3RLAccess()");
  const c3rLDeniedIndex = c3rLPage.indexOf("error instanceof C3RLError");
  const c3rLNotFoundIndex = c3rLPage.indexOf("notFound()", c3rLDeniedIndex);
  const c3rLRethrowIndex = c3rLPage.indexOf("throw error", c3rLNotFoundIndex);
  const c3rLLoopIndex = c3rLPage.indexOf("<C3RLLawLoop");
  assert.ok(c3rLAccessIndex >= 0, "C3R-L must resolve its specialized access gate");
  assert.ok(c3rLDeniedIndex > c3rLAccessIndex);
  assert.ok(c3rLNotFoundIndex > c3rLDeniedIndex);
  assert.ok(c3rLRethrowIndex > c3rLNotFoundIndex);
  assert.ok(c3rLLoopIndex > c3rLRethrowIndex);

  const firstStagePage = read("app/(owner-first-stage)/app/first-stage/page.tsx");
  const firstStageFlagIndex = firstStagePage.indexOf("process.env[FIRST_STAGE_FEATURE_FLAG]");
  const firstStageSessionIndex = firstStagePage.indexOf("await getServerSessionUser()");
  const firstStageAdminIndex = firstStagePage.indexOf("process.env.ALPHA_ADMIN_EMAILS");
  const firstStageOwnerIndex = firstStagePage.indexOf("process.env[FIRST_STAGE_OWNER_ALLOWLIST]");
  const firstStageDeniedIndex = firstStagePage.lastIndexOf("notFound()");
  const firstStageShellIndex = firstStagePage.indexOf("<ReviewOsAppShell email={email}>");
  const firstStageLoopIndex = firstStagePage.indexOf("<FirstStageMcqLoop />");
  assert.ok(firstStageFlagIndex >= 0, "first-stage must resolve its default-off feature gate");
  assert.ok(firstStageSessionIndex > firstStageFlagIndex, "first-stage must authenticate after its feature gate");
  assert.ok(firstStageAdminIndex > firstStageSessionIndex, "first-stage must require the alpha admin allowlist");
  assert.ok(firstStageOwnerIndex > firstStageAdminIndex, "first-stage must require its narrower Owner allowlist");
  assert.ok(firstStageDeniedIndex > firstStageOwnerIndex, "first-stage must fail closed after both allowlists");
  assert.ok(firstStageShellIndex > firstStageDeniedIndex,
    "first-stage must render its learner shell only after its specialized gate");
  assert.ok(firstStageLoopIndex > firstStageShellIndex,
    "first-stage must render its loop inside the authorized learner shell");

  assert.equal(existsSync("app/app/first-stage/page.tsx"), false,
    "first-stage must live outside the generic Review OS parent layout");
  assert.doesNotMatch(firstStagePage,
    /getReviewOsServerContext|ensureAccess|includeProfile|includeUsage/,
    "first-stage must not call the generic profile or usage access path");

  const capacityPage = read("app/(owner-first-stage)/app/first-stage/capacity/page.tsx");
  const capacityKernelFlagIndex = capacityPage.indexOf("process.env[FIRST_STAGE_FEATURE_FLAG]");
  const capacityFlagIndex = capacityPage.indexOf("process.env[FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG]");
  const capacitySessionIndex = capacityPage.indexOf("await getServerSessionUser()");
  const capacityAdminIndex = capacityPage.indexOf("process.env.ALPHA_ADMIN_EMAILS");
  const capacityOwnerIndex = capacityPage.indexOf("process.env[FIRST_STAGE_OWNER_ALLOWLIST]");
  const capacityDeniedIndex = capacityPage.lastIndexOf("notFound()");
  const capacityShellIndex = capacityPage.indexOf("<ReviewOsAppShell email={email}>");
  const capacityPlannerIndex = capacityPage.indexOf("<FirstStageStudyCapacityPlanner />");
  assert.ok(capacityKernelFlagIndex >= 0, "capacity bridge must preserve the Kernel gate");
  assert.ok(capacityFlagIndex > capacityKernelFlagIndex, "capacity bridge must require its own default-off gate");
  assert.ok(capacitySessionIndex > capacityFlagIndex, "capacity bridge must authenticate only after both flags");
  assert.ok(capacityAdminIndex > capacitySessionIndex, "capacity bridge must require alpha admin");
  assert.ok(capacityOwnerIndex > capacityAdminIndex, "capacity bridge must require the narrower Owner allowlist");
  assert.ok(capacityDeniedIndex > capacityOwnerIndex, "capacity bridge must fail closed after both allowlists");
  assert.ok(capacityShellIndex > capacityDeniedIndex, "capacity bridge must render its shell only after access");
  assert.ok(capacityPlannerIndex > capacityShellIndex, "capacity planner must render inside the authorized shell");
  assert.equal(existsSync("app/app/first-stage/capacity/page.tsx"), false,
    "capacity bridge must live outside the generic Review OS parent layout");
  assert.doesNotMatch(capacityPage,
    /getReviewOsServerContext|ensureAccess|includeProfile|includeUsage/,
    "capacity bridge must not call the generic profile or usage access path");
});

test("S232F.2 documents the failure boundary and registers the contract in the full suite", () => {
  const doc = read("docs/qa/s232f2-access-availability.md");
  const runner = read("scripts/run-node-tests.mjs");
  const repository = read("lib/review-os/repository.ts");

  assert.match(doc, /allowed.*denied.*unavailable/is);
  assert.match(doc, /safety.*unknown/is);
  assert.match(doc, /window\.location\.reload\(\)/);
  assert.match(doc, /route-level early guard/i);
  assert.match(doc, /search-parameter-only navigation/i);
  assert.match(doc, /request-memoized/);
  assert.match(doc, /does not introduce a production-only test switch/i);
  assert.match(doc, /no schema, API, auth, or environment/i);
  assert.match(doc, /runtime.*not added/is);
  assert.match(
    repository,
    /Routine access checks must never reset invite\/entitlement state for existing users/,
  );
  assert.ok(runner.includes("tests/s232f2-access-availability.test.mjs"));
});