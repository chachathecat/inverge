import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232D4_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232D4_AUTH_RUNTIME=1 for exact-head Review IA acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

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

function isCompletionPost(request: Request) {
  if (request.method() !== "POST") return false;
  const pathname = new URL(request.url()).pathname;
  return /^\/api\/os\/review-queue\/[^/]+\/complete$/.test(pathname);
}

async function readFocusStyle(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outline: `${style.outlineWidth}|${style.outlineStyle}|${style.outlineColor}`,
      boxShadow: style.boxShadow,
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
    };
  });
}

async function expectVisibleKeyboardFocus(
  target: Locator,
  unfocusedStyle: Awaited<ReturnType<typeof readFocusStyle>>,
) {
  await expect(target).toBeFocused();
  const focus = await readFocusStyle(target);
  expect(focus.focusVisible, "The keyboard target must match :focus-visible.").toBe(true);
  expect(
    focus.outline !== unfocusedStyle.outline ||
      focus.boxShadow !== unfocusedStyle.boxShadow ||
      focus.borderColor !== unfocusedStyle.borderColor ||
      focus.backgroundColor !== unfocusedStyle.backgroundColor,
    "The focused target must expose a computed visual-style delta.",
  ).toBe(true);
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  unfocusedStyle: Awaited<ReturnType<typeof readFocusStyle>>,
  maxSteps: number,
  description: string,
) {
  let reached = false;
  for (let step = 0; step < maxSteps; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, description).toBe(true);
  await expectVisibleKeyboardFocus(target, unfocusedStyle);
}

async function exerciseLocalReviewState(page: Page, primary: Locator) {
  const recallInput = primary.locator("[data-review-recall-input]");
  const confirmAction = primary.locator("[data-s232d4-confirm-action]");
  const recallUnfocusedStyle = await readFocusStyle(recallInput);
  const confirmUnfocusedStyle = await readFocusStyle(confirmAction);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#learner-main"]');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();

  await tabUntilFocused(
    page,
    recallInput,
    recallUnfocusedStyle,
    80,
    "Recall textarea must be reachable from the skip link with real Tab navigation.",
  );
  await recallInput.fill("검증용 회상");
  await tabUntilFocused(
    page,
    confirmAction,
    confirmUnfocusedStyle,
    12,
    "Confirm action must follow the recall textarea in real Tab navigation.",
  );
  await page.keyboard.press("Enter");

  const check = primary.locator("[data-s232d4-review-check]");
  const selfRating = primary.locator("[data-s232d4-review-self-rating]");
  await expect(check).toBeVisible();
  await expect(selfRating).toBeVisible();

  const rating = selfRating.locator("[data-review-recall-outcome]").first();
  const ratingUnfocusedStyle = await readFocusStyle(rating);
  await tabUntilFocused(
    page,
    rating,
    ratingUnfocusedStyle,
    24,
    "A self-rating must be reachable after the local confirm action.",
  );
  await page.keyboard.press("Space");
  await expect(rating).toHaveAttribute("aria-pressed", "true");

  const completion = selfRating.locator("[data-s232d4-review-completion]");
  await expect(completion).toBeVisible();
  await expect(completion).toBeEnabled();
}

test("S232D.4 exact-head Review IA is responsive, accessible, and completion-safe", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232D.4", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  await establishProtectedPreviewSession(page, "S232D.4");
  const runtimeErrors = monitorRuntimeErrors(page);
  let completionPostCount = 0;
  page.on("request", (request) => {
    if (isCompletionPost(request)) completionPostCount += 1;
  });
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  await page.goto("/app/review?mode=second", { waitUntil: "domcontentloaded" });
  const observedBefore = await readObservedDeploymentSha(page);
  expect(observedBefore).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  let pageHeadingCount = 0;
  let primarySurfaceCount = 0;
  let forbiddenPrimitiveCount = 0;
  let forbiddenAuthorityLabelCount = 0;
  let axeBlockingCount = 0;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/app/review?mode=second", { waitUntil: "domcontentloaded" });

    const pageRoot = page.locator('[data-s232d4-review-page="priority-first"]');
    const queueContainer = pageRoot.locator("[data-s232d4-review-queue-container]");
    const queue = queueContainer.locator("[data-s232d4-review-queue]");
    const primary = queue.locator("[data-s232d4-review-primary]");
    const heading = page.getByRole("heading", { level: 1, name: "복습", exact: true });
    const currentReviewLink = page
      .getByRole("navigation", { name: "학습 메뉴" })
      .getByRole("link", { name: "복습", exact: true });

    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(pageRoot).toHaveCount(1);
    await expect(pageRoot.locator("[data-s232d4-review-header]")).toHaveCount(1);
    await expect(queueContainer).toHaveCount(1);
    await expect(queue).toHaveCount(1);
    await expect(heading).toHaveCount(1);
    await expect(currentReviewLink).toHaveAttribute("aria-current", "page");
    await expect(primary).toHaveCount(1);
    await expect(queue.locator("[data-review-primary-surface]")).toHaveCount(1);
    expect(await primary.getAttribute("data-review-primary-surface")).not.toBeNull();
    pageHeadingCount = 1;
    primarySurfaceCount = 1;

    const hierarchy = await primary.evaluate((element) => {
      const meta = element.querySelector("[data-s232d4-review-meta]");
      const reason = element.querySelector("[data-s232d4-review-reason]");
      const nextAction = element.querySelector("[data-s232d4-review-next-action]");
      const recall = element.querySelector("[data-s232d4-review-recall]");
      if (!meta || !reason || !nextAction || !recall) return false;
      const follows = (before: Node, after: Node) =>
        Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
      return follows(meta, reason) && follows(reason, nextAction) && follows(nextAction, recall);
    });
    expect(hierarchy, "Primary Review DOM order must be meta → reason → next action → recall.").toBe(true);

    const primitiveCount = await queue
      .locator(
        '[data-v3-component="BiggestGap"], [data-v3-component="StateChip"], [data-v3-component="EvidenceExcerpt"]',
      )
      .count();
    const authorityLabelCount = await queue.getByText(/\b(?:Official|Confirmed)\b/i).count();
    expect(primitiveCount).toBe(0);
    expect(authorityLabelCount).toBe(0);
    forbiddenPrimitiveCount += primitiveCount;
    forbiddenAuthorityLabelCount += authorityLabelCount;

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);

    await exerciseLocalReviewState(page, primary);
    expect(completionPostCount, "Local confirm and self-rating must never submit Review completion.").toBe(0);

    const axe = await new AxeBuilder({ page })
      .include('[data-s232d4-review-page="priority-first"]')
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

  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  expect(completionPostCount, "Completion POST count must stay zero for the full acceptance run.").toBe(0);
  expect(runtimeErrors.consoleErrors.length, "Console error count must be zero").toBe(0);
  expect(runtimeErrors.pageErrors.length, "Page error count must be zero").toBe(0);
  expect(runtimeErrors.sameOriginRequestFailures.length, "Same-origin request failure count must be zero").toBe(0);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedAfter.deploymentSha,
    signInAttempts,
    viewportCount: viewports.length,
    pageHeadingCount,
    currentNavigationVerified: true,
    primarySurfaceCount,
    reviewHierarchyVerified: true,
    keyboardFocusVerified: true,
    localRecallInteractionVerified: true,
    localConfirmInteractionVerified: true,
    localSelfRatingVerified: true,
    completionPostCount,
    forbiddenPrimitiveCount,
    forbiddenAuthorityLabelCount,
    responsiveOverflowVerified: true,
    axeBlockingCount,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    questionTextCaptured: false,
    titleCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  const serializedEvidence = JSON.stringify(evidence);
  expect(serializedEvidence).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  expect(serializedEvidence).not.toMatch(/https?:\/\/|\/app\//i);
  await writeFile(testInfo.outputPath("s232d4-runtime.json"), JSON.stringify(evidence, null, 2));
});
