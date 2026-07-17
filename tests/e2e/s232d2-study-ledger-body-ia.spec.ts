import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232D2_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844, expectedReadingWidth: 350, split: false },
  { label: "768", width: 768, height: 1024, expectedReadingWidth: 728, split: false },
  { label: "1440", width: 1440, height: 1024, expectedReadingWidth: 680, split: true },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232D2_AUTH_RUNTIME=1 for exact-head Ledger body IA acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function findLearnerEvidenceDetail(page: Page) {
  await page.goto("/app/notes?mode=second", { waitUntil: "domcontentloaded" });
  const hrefs = await page.locator('a[href^="/app/items/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))] as string[],
  );

  for (const href of hrefs.slice(0, 16)) {
    try {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      const detail = page.locator("[data-s228-study-ledger-detail]");
      await expect(detail).toBeVisible({ timeout: 10_000 });
      if (
        (await detail
          .locator('[data-s232d2-learner-evidence] [data-v3-component="EvidenceExcerpt"][data-v3-source="Learner"]')
          .count()) === 1
      ) {
        const url = new URL(page.url());
        return `${url.pathname}${url.search}`;
      }
    } catch {
      // A stale list item must not prevent checking the remaining persisted records.
    }
  }

  throw new Error("An invited-account Study Ledger detail with persisted learner evidence is required for S232D.2.");
}

async function readObservedDeploymentSha(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { ready?: boolean; deploymentSha?: string };
    return { status: response.status, ready: body.ready, deploymentSha: body.deploymentSha };
  });
}

async function expectKeyboardReachableFocus(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const skipLink = page.locator('a[href="#study-ledger-content"]');
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  let reached = false;
  for (let step = 0; step < 80; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, "Target must be reachable from the skip link with real Tab navigation.").toBe(true);

  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    (focus.outlineWidth >= 2 && focus.outlineStyle !== "none") || focus.boxShadow !== "none",
    "Keyboard target must expose a visible focus indicator.",
  ).toBe(true);
}

test("S232D.2 exact-head Ledger owns body evidence and review context correctly", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232D.2", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232D.2");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  const detailHref = await findLearnerEvidenceDetail(page);
  const observedVersion = await readObservedDeploymentSha(page);
  expect(observedVersion).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  let axeBlockingCount = 0;
  let untypedReferenceCount = 0;
  let officialPromotionCount = 0;
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(detailHref, { waitUntil: "domcontentloaded" });

    const detail = page.locator("[data-s228-study-ledger-detail]");
    const workspace = detail.locator("[data-s232d2-ledger-workspace]");
    const reading = detail.locator("[data-s232d2-reading-column]");
    const rail = detail.locator("[data-s232d2-evidence-rail]");
    const learner = reading.locator(
      '[data-s232d2-learner-evidence] [data-v3-component="EvidenceExcerpt"][data-v3-source="Learner"]',
    );
    const review = rail.locator("[data-s232d2-review-context]");
    const recoveryContext = rail.locator("[data-s232d2-recovery-context]");
    const referenceSlot = rail.locator("[data-s232d2-reference-slot]");
    const action = reading.locator('[data-v3-component="StickyAction"]');

    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(detail).toHaveCount(1);
    await expect(workspace).toHaveCount(1);
    await expect(reading).toHaveCount(1);
    await expect(rail).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="TrustEvidenceBar"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="BiggestGap"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="StickyAction"]')).toHaveCount(1);
    await expect(learner).toHaveCount(1);
    await expect(review).toHaveCount(1);
    await expect(recoveryContext).toHaveCount(1);
    await expect(referenceSlot).toHaveCount(1);
    await expect(rail.locator('[data-v3-component="EvidenceExcerpt"][data-v3-source="Learner"]')).toHaveCount(0);
    await expect(reading.locator("[data-s232d2-review-context]")).toHaveCount(0);
    await expect(reading.locator("[data-s232d2-recovery-context]")).toHaveCount(0);
    await expect(reading.locator("[data-s232d2-state-evidence]")).toBeVisible();
    await expect(reading.locator("[data-s232d2-reading-header]")).toHaveCSS("border-bottom-width", "0px");
    await expect(rail.locator('[data-v3-component="TrustEvidenceBar"], [data-v3-component="BiggestGap"], [data-v3-component="StickyAction"]')).toHaveCount(0);
    const promotionCount = await referenceSlot
      .locator(
        '[data-v3-component="EvidenceExcerpt"][data-v3-source="Official"], [data-v3-component="EvidenceExcerpt"][data-v3-review="Confirmed"]',
      )
      .count();
    expect(promotionCount).toBe(0);
    officialPromotionCount = Math.max(officialPromotionCount, promotionCount);

    const referenceCounts = {
      untyped: await referenceSlot.locator("[data-s232d2-reference-untyped]").count(),
      empty: await referenceSlot.locator('[data-s232d2-reference-state="empty"]').count(),
    };
    expect(referenceCounts.untyped + referenceCounts.empty).toBe(1);
    untypedReferenceCount = Math.max(untypedReferenceCount, referenceCounts.untyped);

    const metrics = await page.evaluate(() => {
      const detailElement = document.querySelector<HTMLElement>("[data-s228-study-ledger-detail]");
      const workspaceElement = detailElement?.querySelector<HTMLElement>("[data-s232d2-ledger-workspace]");
      const readingElement = detailElement?.querySelector<HTMLElement>("[data-s232d2-reading-column]");
      const railElement = detailElement?.querySelector<HTMLElement>("[data-s232d2-evidence-rail]");
      const trust = readingElement?.querySelector<HTMLElement>('[data-v3-component="TrustEvidenceBar"]');
      const gap = readingElement?.querySelector<HTMLElement>('[data-v3-component="BiggestGap"]');
      const recoveryHeading = readingElement?.querySelector<HTMLElement>("[data-s232d2-recovery-heading]");
      const learnerEvidence = readingElement?.querySelector<HTMLElement>("[data-s232d2-learner-evidence]");
      const sticky = readingElement?.querySelector<HTMLElement>('[data-v3-component="StickyAction"]');
      const recoveryContext = railElement?.querySelector<HTMLElement>("[data-s232d2-recovery-context]");
      const supplementalContext = railElement?.querySelector<HTMLDetailsElement>("[data-s232d2-supplemental-context]");
      if (!workspaceElement || !readingElement || !railElement || !trust || !gap || !recoveryHeading || !learnerEvidence || !sticky || !recoveryContext || !supplementalContext) {
        return null;
      }
      const follows = (before: Node, after: Node) =>
        Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
      const workspaceStyle = getComputedStyle(workspaceElement);
      return {
        tracks: workspaceStyle.gridTemplateColumns.trim().split(/\s+/).filter(Boolean),
        columnGap: Number.parseFloat(workspaceStyle.columnGap),
        readingWidth: readingElement.getBoundingClientRect().width,
        railWidth: railElement.getBoundingClientRect().width,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        readingOrder: follows(trust, gap) && follows(gap, recoveryHeading) && follows(recoveryHeading, learnerEvidence) && follows(learnerEvidence, sticky),
        railAfterReading: follows(readingElement, railElement),
        recoveryContextInRail: recoveryContext.closest("[data-s232d2-evidence-rail]") === railElement,
        initialRailSurfaceCount: railElement.children.length,
        supplementalClosed: !supplementalContext.open,
        supportingInSupplemental: supplementalContext.querySelectorAll("[data-s228-supporting-evidence]").length,
        linkedInSupplemental: supplementalContext.querySelectorAll("[data-s232d2-linked-learning]").length,
        supportingInReading: readingElement.querySelectorAll("[data-s228-supporting-evidence]").length,
        supportingInRail: railElement.querySelectorAll("[data-s228-supporting-evidence]").length,
        supportingTotal: detailElement.querySelectorAll("[data-s228-supporting-evidence]").length,
        linkedInReading: readingElement.querySelectorAll("[data-s232d2-linked-learning]").length,
        linkedInRail: railElement.querySelectorAll("[data-s232d2-linked-learning]").length,
        linkedTotal: detailElement.querySelectorAll("[data-s232d2-linked-learning]").length,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(metrics?.readingOrder).toBe(true);
    expect(metrics?.railAfterReading).toBe(true);
    expect(metrics?.recoveryContextInRail).toBe(true);
    expect(metrics?.initialRailSurfaceCount).toBe(3);
    expect(metrics?.supplementalClosed).toBe(true);
    expect(metrics?.readingWidth).toBeCloseTo(viewport.expectedReadingWidth, 0);
    expect(metrics?.supportingInReading).toBe(0);
    expect(metrics?.supportingInRail).toBe(metrics?.supportingTotal);
    expect(metrics?.supportingInSupplemental).toBe(metrics?.supportingTotal);
    expect(metrics?.linkedInReading).toBe(0);
    expect(metrics?.linkedInRail).toBe(metrics?.linkedTotal);
    expect(metrics?.linkedInSupplemental).toBe(metrics?.linkedTotal);
    if (viewport.split) {
      expect(metrics?.tracks).toHaveLength(2);
      expect(Number.parseFloat(metrics!.tracks[0]!)).toBeCloseTo(680, 0);
      expect(Number.parseFloat(metrics!.tracks[1]!)).toBeCloseTo(288, 0);
      expect(metrics?.railWidth).toBeCloseTo(288, 0);
      expect(metrics?.columnGap).toBeCloseTo(32, 0);
    } else {
      expect(metrics?.tracks).toHaveLength(1);
      expect(metrics?.railWidth).toBeCloseTo(viewport.expectedReadingWidth, 0);
    }

    const trustToggle = reading.locator('[data-v3-component="TrustEvidenceBar"] button');
    await expectKeyboardReachableFocus(page, trustToggle);
    const wasExpanded = await trustToggle.getAttribute("aria-expanded");
    await page.keyboard.press("Enter");
    await expect(trustToggle).toHaveAttribute("aria-expanded", wasExpanded === "true" ? "false" : "true");
    await page.keyboard.press("Enter");
    await expect(trustToggle).toHaveAttribute("aria-expanded", wasExpanded ?? "false");
    await expectKeyboardReachableFocus(page, action.getByRole("link"));
    if (referenceCounts.untyped === 1) {
      await expectKeyboardReachableFocus(page, referenceSlot.locator("summary"));
    }

    const axe = await new AxeBuilder({ page })
      .include("[data-s228-study-ledger-detail]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    axeBlockingCount += blockingAxe.length;
    const blockingRuleIds = [...new Set(blockingAxe.map((violation) => violation.id))].sort();
    expect(
      blockingAxe.length,
      `Axe blocking rule count must be zero; ids=${blockingRuleIds.join(",") || "none"}`,
    ).toBe(0);
  }

  expect(runtimeErrors.consoleErrors.length, "Console error count must be zero").toBe(0);
  expect(runtimeErrors.pageErrors.length, "Page error count must be zero").toBe(0);
  expect(runtimeErrors.sameOriginRequestFailures.length, "Same-origin request failure count must be zero").toBe(0);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.deploymentSha,
    signInAttempts,
    viewportCount: viewports.length,
    learnerOwnershipVerified: true,
    reviewRailOwnershipVerified: true,
    referenceFailClosedVerified: true,
    untypedReferenceCount,
    officialPromotionCount,
    readingOrderVerified: true,
    keyboardFocusVerified: true,
    responsiveGeometryVerified: true,
    primitiveCountVerified: true,
    axeBlockingCount,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  expect(JSON.stringify(evidence)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(testInfo.outputPath("s232d2-runtime.json"), JSON.stringify(evidence, null, 2));
});
