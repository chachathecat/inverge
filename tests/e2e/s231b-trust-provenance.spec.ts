import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  captureSanitizedScreenshot,
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S231B_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const fixtures = [
  { state: "confirmed_record", evidenceKind: "learner_confirmation" },
  { state: "needs_review", evidenceKind: "review_requirement" },
  { state: "conflict", evidenceKind: "conflict_record" },
  { state: "offline", evidenceKind: "offline_state" },
  { state: "unavailable", evidenceKind: "unavailable" },
] as const;

test.use({
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(
  !runtimeEnabled,
  "Set S231B_AUTH_RUNTIME=1 for exact-head trust/provenance acceptance.",
);

test.describe.configure({ timeout: 300_000, retries: 0 });

async function verifySkipLink(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#learner-main"]');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  const outline = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: Number.parseFloat(style.outlineWidth) || 0,
      style: style.outlineStyle,
    };
  });
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.style).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  );
}

async function hasForbiddenAuthorityClaim(page: Page) {
  return page.locator("body").evaluate((body) => {
    const text = body.innerText;
    return /공식\s*모범답안(?![이가]?\s*아닙니다)|확정\s*점수(?![이가]?\s*아닙니다)|합격\s*(?:확률|가능성|보장)(?![이가]?\s*아닙니다)|기기\s*검증\s*(?:완료|확정)(?![이가]?\s*아닙니다)|official\s+grading\s+result(?!\s+is\s+not)/i.test(text);
  });
}

async function captureFixture(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof viewports)[number],
  state: (typeof fixtures)[number]["state"],
) {
  const fileName = `s231b-${viewport.label}-${state}.png`;
  await captureSanitizedScreenshot(page, testInfo, fileName);
  return fileName;
}

test("S231B trust/provenance stays evidence-backed at 390/768/1440", async ({ page }, testInfo) => {
  requireSafeAuthenticatedRuntime("S231B", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S231B");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  const observedVersion = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return {
      status: response.status,
      body: (await response.json()) as { ready?: boolean; deploymentSha?: string },
    };
  });
  expect(observedVersion.status).toBe(200);
  expect(observedVersion.body.ready).toBe(true);
  expect(observedVersion.body.deploymentSha).toBe(runtimeTargetSha);

  const viewportEvidence: Array<Record<string, unknown>> = [];
  const screenshots: string[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const fixture of fixtures) {
      await page.goto(`/app/acceptance/trust-provenance/${fixture.state}?mode=second`, {
        waitUntil: "domcontentloaded",
      });

      const harness = page.locator(`[data-s231b-trust-acceptance="${fixture.state}"]`);
      const layer = page.locator("[data-trust-provenance-layer]");
      await expect(harness).toHaveAttribute("data-private-learner-data", "absent");
      await expect(page.locator("[data-private-account-usage]")).toHaveCount(0);
      await expect(layer).toHaveCount(1);
      await expect(layer).toHaveAttribute("data-trust-state", fixture.state);
      await expect(layer).toHaveAttribute("data-trust-evidence-kind", fixture.evidenceKind);
      await expect(layer).not.toHaveAttribute("role", /.+/);
      await expect(layer).not.toHaveAttribute("aria-live", /.+/);

      const announcer = layer.locator("[data-trust-state-announcer]");
      if (fixture.state === "conflict" || fixture.state === "offline") {
        await expect(announcer).toHaveCount(1);
        await expect(announcer).toHaveAttribute("role", "status");
        await expect(announcer).toHaveAttribute("aria-live", "polite");
      } else {
        await expect(announcer).toHaveCount(0);
      }

      const overflow = await horizontalOverflow(page);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(await hasForbiddenAuthorityClaim(page)).toBe(false);
      await verifySkipLink(page);
      screenshots.push(await captureFixture(page, testInfo, viewport, fixture.state));

      viewportEvidence.push({
        viewport: `${viewport.width}x${viewport.height}`,
        state: fixture.state,
        evidenceKind: fixture.evidenceKind,
        trustLayerCount: 1,
        liveAnnouncerCount:
          fixture.state === "conflict" || fixture.state === "offline" ? 1 : 0,
        horizontalOverflow: overflow,
        skipLinkTransferredFocus: true,
        metadataOnly: true,
        privateAccountTelemetryAbsent: true,
      });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/answer-review?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-trust-provenance-layer]")).toHaveCount(1);
  await expect(page.locator('[data-trust-layer="answer-review-shell"]')).toHaveCount(1);
  await expect(page.locator("[data-trust-provenance-layer]")).toHaveAttribute(
    "data-trust-state",
    "unavailable",
  );

  await page.goto("/app/capture?mode=second", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "텍스트 붙여넣기" }).click();
  await expect(page.locator("[data-trust-provenance-layer]")).toHaveCount(1);
  await expect(page.locator('[data-trust-layer="capture-intake"]')).toHaveCount(1);
  await expect(page.locator("[data-trust-provenance-layer]")).toHaveAttribute(
    "data-trust-state",
    "unavailable",
  );
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  expect(runtimeErrors.consoleErrors).toEqual([]);
  expect(runtimeErrors.pageErrors).toEqual([]);
  expect(runtimeErrors.sameOriginRequestFailures).toEqual([]);

  const manifest = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.body.deploymentSha,
    signInAttempts,
    viewportEvidence,
    screenshotCount: screenshots.length,
    screenshots,
    actualSurfaceEvidence: {
      answerReviewTrustLayerCount: 1,
      captureTrustLayerCount: 1,
      studyLedgerAdapterCoveredByConflictFixture: true,
      firstFiveAdapterCoveredByUnavailableFixture: true,
    },
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    syntheticMetadataOnly: true,
    privateAccountTelemetryAbsent: true,
    credentialsRedacted: true,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(
    testInfo.outputPath("s231b-runtime.json"),
    JSON.stringify(manifest, null, 2),
  );
});
