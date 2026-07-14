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

const runtimeEnabled = process.env.S231C_AUTH_RUNTIME === "1";

const routes = [
  { label: "today", path: "/app?mode=second", ready: '[data-s224v-surface="/app"]' },
  { label: "capture", path: "/app/capture?mode=second", ready: '[data-s224v-surface="/app/capture"]' },
  { label: "notes", path: "/app/notes?mode=second", ready: '[data-s224v-surface="/app/notes"]' },
  { label: "review", path: "/app/review?mode=second", ready: '[data-s224v-surface="/app/review"]' },
  { label: "agenda", path: "/app/agenda?mode=second", ready: "[data-s230-learning-record-timeline]" },
  { label: "answer-review", path: "/answer-review?mode=second", ready: '[data-s224v-surface="/answer-review?mode=second"]' },
] as const;

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S231C_AUTH_RUNTIME=1 for exact-head accessibility acceptance.");
test.describe.configure({ timeout: 420_000, retries: 0 });

function assertNoPrivateEvidence(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  expect(serialized).not.toMatch(/"(?:password|email|outerhtml|innerhtml|raw[_-]?(?:answer|ocr|problem|reference))"\s*:/i);
}

async function openRoute(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const route = routes.find((candidate) => candidate.path === path);
  if (route) await expect(page.locator(route.ready)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("main:visible")).toHaveCount(1);
  await expect(page.locator("h1:visible")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const theme = await page.evaluate(() => ({
    dataset: document.documentElement.dataset.theme,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(theme).toEqual({ dataset: "light", colorScheme: "light" });
}

async function scanAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags([...axeTags]).analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodeCount: violation.nodes.length,
    }));
  assertNoPrivateEvidence(blocking);
  expect(blocking).toEqual([]);
  return {
    blocking,
    nonBlockingCount: results.violations.length - blocking.length,
  };
}

async function productRuleFailures(page: Page) {
  return page.evaluate(() => {
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };

    const targetFailures = Array.from(document.querySelectorAll<HTMLElement>(
      'a[href], button, summary, [role="button"], input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea',
    )).flatMap((element) => {
      if (!visible(element)) return [];
      if (element.matches('a[href]') && getComputedStyle(element).display === "inline") return [];
      const rect = element.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{ tag: element.tagName.toLowerCase(), width: rect.width, height: rect.height }];
    });

    const textFailures = Array.from(document.querySelectorAll<HTMLElement>(
      "h1, h2, h3, p, span, label, button, a, summary, input, textarea, select",
    )).flatMap((element) => {
      if (!visible(element)) return [];
      const renderedText = element.innerText.trim() || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "";
      if (!renderedText) return [];
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      return fontSize >= 12 ? [] : [{ tag: element.tagName.toLowerCase(), fontSize }];
    });

    return { targetFailures, textFailures };
  });
}

async function layoutFailures(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const clippedCritical = Array.from(document.querySelectorAll<HTMLElement>(
      "h1, h2, button, input:not([type=file]), select, textarea, summary",
    )).flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") return [];
      const horizontallyClipped = rect.left < -1 || rect.right > viewportWidth + 1;
      const internallyClipped = ["hidden", "clip"].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
      return horizontallyClipped || internallyClipped ? [{ tag: element.tagName.toLowerCase() }] : [];
    });
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
      clippedCritical,
    };
  });
}

async function resetKeyboardStart(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    let origin = document.querySelector<HTMLElement>("#s231c-keyboard-origin");
    if (!origin) {
      origin = document.createElement("span");
      origin.id = "s231c-keyboard-origin";
      origin.tabIndex = 0;
      origin.setAttribute("aria-hidden", "true");
      origin.style.cssText = "position:fixed;inline-size:1px;block-size:1px;overflow:hidden;opacity:0;";
      document.body.prepend(origin);
    }
    origin.focus();
  });
}

async function tabTo(page: Page, target: Locator, maximumStops = 80) {
  for (let stop = 1; stop <= maximumStops; stop += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) return stop;
    const wrapped = await page.evaluate(() => document.activeElement?.id === "s231c-keyboard-origin");
    if (wrapped) throw new Error("Keyboard traversal wrapped to the origin before reaching the target.");
  }
  throw new Error(`Keyboard target was not reached within ${maximumStops} Tab stops.`);
}

async function focusContrast(page: Page, target: Locator) {
  return target.evaluate((element) => {
    const parseColor = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 4).map(Number) ?? [];
      if (channels.length < 3) throw new Error(`Unsupported focus color: ${value}`);
      return { red: channels[0], green: channels[1], blue: channels[2], alpha: channels[3] ?? 1 };
    };
    const luminance = (color: ReturnType<typeof parseColor>) => {
      const linear = [color.red, color.green, color.blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };

    const style = getComputedStyle(element);
    let ancestor = element.parentElement;
    let background = parseColor(getComputedStyle(document.body).backgroundColor);
    while (ancestor) {
      const candidate = parseColor(getComputedStyle(ancestor).backgroundColor);
      if (candidate.alpha > 0) {
        background = candidate;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const foreground = parseColor(style.outlineColor);
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return {
      ratio: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
    };
  });
}

async function verifyFocusAndNavigation(page: Page) {
  await openRoute(page, "/app?mode=second");
  await resetKeyboardStart(page);

  const ratios: number[] = [];
  const skipLink = page.locator('a[href="#learner-main"]');
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  let indicator = await focusContrast(page, skipLink);
  expect(indicator.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(indicator.outlineStyle).not.toBe("none");
  expect(indicator.ratio).toBeGreaterThanOrEqual(3);
  ratios.push(indicator.ratio);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();

  const navigation = page.getByRole("navigation", { name: "학습 메뉴" });
  for (const link of await navigation.getByRole("link").all()) {
    await resetKeyboardStart(page);
    const stops = await tabTo(page, link, 20);
    expect(stops).toBeGreaterThan(0);
    indicator = await focusContrast(page, link);
    expect(indicator.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(indicator.ratio).toBeGreaterThanOrEqual(3);
    ratios.push(indicator.ratio);
  }

  return { checkedStops: ratios.length, minimumRatio: Math.min(...ratios) };
}

async function verifyKeyboardCoreLoop(page: Page) {
  await page.route("**/api/answer-review/structure", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        draft: {
          questionSummary: "synthetic keyboard acceptance",
          coreConcepts: ["synthetic concept"],
          strengths: ["synthetic strength"],
          missingIssueCandidates: ["synthetic gap"],
          weakLogicPoint: "synthetic logic gap",
          weakParagraphPoint: "synthetic paragraph gap",
          rewriteTarget: "synthetic rewrite target",
          rewriteDraftSuggestion: "synthetic rewrite suggestion",
          nextAction: "synthetic next action",
        },
      }),
    });
  });

  await openRoute(page, "/answer-review?mode=second");
  await resetKeyboardStart(page);
  const skipLink = page.locator('a[href="#answer-review-main"]');
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#answer-review-main")).toBeFocused();

  const answer = page.getByTestId("answer-review-my-answer-input");
  const problem = page.getByTestId("answer-review-problem-input");
  const referenceDisclosure = page.locator("summary").filter({ hasText: "참고 정리/메모 입력 (선택)" });
  const reference = page.getByTestId("answer-review-reference-input");
  const start = page.getByTestId("answer-review-start");

  await resetKeyboardStart(page);
  await tabTo(page, answer);
  await page.keyboard.type("synthetic answer for keyboard-only acceptance");
  await tabTo(page, problem);
  await page.keyboard.type("synthetic problem context");
  await tabTo(page, referenceDisclosure);
  await page.keyboard.press("Enter");
  await tabTo(page, reference);
  await page.keyboard.type("synthetic reference context");
  await tabTo(page, start);
  await page.keyboard.press("Enter");

  const resultHeading = page.getByRole("heading", { name: "가장 큰 간극부터 확인", level: 2 });
  await expect(resultHeading).toBeVisible();
  await expect(resultHeading).toBeFocused();
  await expect(page.getByRole("button", { name: "보강 문단 정리", exact: true })).toHaveCount(1);

  const reviseInput = page.getByRole("button", { name: "입력 수정하기", exact: true });
  await resetKeyboardStart(page);
  await tabTo(page, reviseInput);
  await page.keyboard.press("Enter");
  await expect(answer).toBeFocused();
  await resetKeyboardStart(page);
  await tabTo(page, start);
  await page.keyboard.press("Enter");
  await expect(resultHeading).toBeFocused();

  const buildFeedback = page.getByTestId("answer-review-build-feedback");
  await expect(buildFeedback).toBeVisible();
  await resetKeyboardStart(page);
  await tabTo(page, buildFeedback);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "보강 문단 정리", level: 2 })).toBeFocused();
  await expect(page.getByRole("button", { name: "정리 내용 복사", exact: true })).toBeVisible();
  await page.unroute("**/api/answer-review/structure");

  return {
    skipLinkTransferredFocus: true,
    answerEnteredWithoutPointer: true,
    structureRequestedWithoutPointer: true,
    feedbackBuiltWithoutPointer: true,
  };
}

async function verifyReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/app?mode=second");
  const result = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "animate-in-up";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const parseMilliseconds = (value: string) =>
      Math.max(...value.split(",").map((entry) => {
        const trimmed = entry.trim();
        return trimmed.endsWith("ms") ? Number.parseFloat(trimmed) : Number.parseFloat(trimmed) * 1000;
      }));
    const evidence = {
      mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDurationMs: parseMilliseconds(style.animationDuration),
      transitionDurationMs: parseMilliseconds(style.transitionDuration),
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
    probe.remove();
    return evidence;
  });
  expect(result.mediaMatches).toBe(true);
  expect(result.animationDurationMs).toBeLessThanOrEqual(0.1);
  expect(result.transitionDurationMs).toBeLessThanOrEqual(0.1);
  expect(result.scrollBehavior).toBe("auto");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return result;
}

test("S231C exact-head light accessibility contract", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S231C", { requireTargetSha: true, requireExactHead: true });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("inverge:theme-mode", "dark");
    } catch {
      // Storage denial must not change the light-only runtime contract.
    }
  });
  await page.emulateMedia({ colorScheme: "dark" });

  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S231C");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  const observedVersion = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", { cache: "no-store", credentials: "same-origin" });
    return { status: response.status, body: await response.json() as { ready?: boolean; deploymentSha?: string } };
  });
  expect(observedVersion.status).toBe(200);
  expect(observedVersion.body.ready).toBe(true);
  expect(observedVersion.body.deploymentSha).toBe(runtimeTargetSha);

  const routeEvidence: Array<Record<string, unknown>> = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await openRoute(page, route.path);
      const axe = await scanAxe(page);
      const productRules = await productRuleFailures(page);
      const layout = await layoutFailures(page);
      expect(productRules.targetFailures).toEqual([]);
      expect(productRules.textFailures).toEqual([]);
      expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(layout.clippedCritical).toEqual([]);
      routeEvidence.push({
        route: route.label,
        viewport: viewport.label,
        axeBlockingCount: axe.blocking.length,
        axeNonBlockingCount: axe.nonBlockingCount,
        targetFailureCount: productRules.targetFailures.length,
        sub12TextCount: productRules.textFailures.length,
        horizontalOverflow: layout.horizontalOverflow,
        clippedCriticalCount: layout.clippedCritical.length,
        theme: "light",
      });
    }
  }

  const desktopZoomEquivalentPercent = 200;
  const reflowEvidence: Array<Record<string, unknown>> = [];
  await page.setViewportSize({ width: 720, height: 1024 });
  for (const route of routes) {
    await openRoute(page, route.path);
    const layout = await layoutFailures(page);
    expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(layout.clippedCritical).toEqual([]);
    reflowEvidence.push({ route: route.label, desktopZoomEquivalentPercent, ...layout });
  }

  const textResizePercent = 200;
  const textResizeEvidence: Array<Record<string, unknown>> = [];
  await page.setViewportSize({ width: 1440, height: 1024 });
  for (const route of routes) {
    await openRoute(page, route.path);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const layout = await layoutFailures(page);
    expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(layout.clippedCritical).toEqual([]);
    textResizeEvidence.push({ route: route.label, textResizePercent, ...layout });
  }

  await page.setViewportSize({ width: 1440, height: 1024 });
  const focusEvidence = await verifyFocusAndNavigation(page);
  const keyboardCoreLoop = await verifyKeyboardCoreLoop(page);
  const reducedMotion = await verifyReducedMotion(page);

  expect(runtimeErrors.consoleErrors.length).toBe(0);
  expect(runtimeErrors.pageErrors.length).toBe(0);
  expect(runtimeErrors.sameOriginRequestFailures.length).toBe(0);

  const manifest = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.body.deploymentSha,
    signInAttempts,
    routeEvidence,
    reflowEvidence,
    textResizeEvidence,
    focusContrast: focusEvidence,
    keyboardCoreLoop,
    reducedMotion,
    axeBlockingViolationCount: 0,
    desktopZoomEquivalentPercent,
    textResizePercent,
    manualBrowserZoomCertification: false,
    manualScreenReaderCertification: false,
    syntheticAccountOnly: true,
    credentialsRedacted: true,
    rawLearnerContentCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
  };
  assertNoPrivateEvidence(manifest);
  await writeFile(testInfo.outputPath("s231c-runtime.json"), JSON.stringify(manifest, null, 2));
});
