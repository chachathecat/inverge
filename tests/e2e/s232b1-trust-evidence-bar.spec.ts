import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { establishProtectedPreviewSession } from "./support/authenticated-runtime";

const expectedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").origin;

test.use({ screenshot: "off", trace: "off", video: "off" });

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_BASE_URL) {
    await establishProtectedPreviewSession(page, "S232B.1 synthetic");
  }
});

const viewports = [
  { name: "mobile", width: 390, height: 844, pageEdge: "20px" },
  { name: "tablet", width: 768, height: 1024, pageEdge: "32px" },
  { name: "desktop", width: 1440, height: 1024, pageEdge: "32px" },
  { name: "desktop-200-percent-equivalent", width: 720, height: 1024, pageEdge: "32px" },
] as const;

for (const viewport of viewports) {
  test(`S232B.1 TrustEvidenceBar matrix at ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const requestErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === expectedOrigin && response.status() >= 400) {
        requestErrors.push(`${response.status()} ${url.pathname}`);
      }
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown";
      if (url.origin === expectedOrigin && !failure.includes("ERR_ABORTED")) {
        requestErrors.push(`failed ${url.pathname} ${failure}`);
      }
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto("/acceptance/figma-v3-trust-evidence", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBe(true);

    const harness = page.locator("[data-s232b1-trust-acceptance]");
    const bars = page.locator('[data-v3-component="TrustEvidenceBar"]');
    await expect(harness).toBeVisible();
    await expect(harness).toHaveAttribute("data-private-learner-data", "absent");
    await expect(bars).toHaveCount(6);

    for (const state of ["Verified", "NeedsReview", "Conflict"] as const) {
      await expect(
        page.locator(`[data-v3-component="TrustEvidenceBar"][data-v3-state="${state}"]`),
      ).toHaveCount(2);
      await expect(page.locator(`[data-v3-state="${state}"][data-v3-view="Collapsed"]`)).toHaveCount(1);
      await expect(page.locator(`[data-v3-state="${state}"][data-v3-view="Expanded"]`)).toHaveCount(1);
    }

    const collapsed = page.locator('[data-v3-component="TrustEvidenceBar"][data-v3-view="Collapsed"]');
    const expanded = page.locator('[data-v3-component="TrustEvidenceBar"][data-v3-view="Expanded"]');
    await expect(collapsed).toHaveCount(3);
    await expect(expanded).toHaveCount(3);
    for (const bar of await collapsed.all()) {
      expect((await bar.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(72);
      await expect(bar.getByRole("button")).toContainText("보기");
      await expect(bar.getByRole("button")).toHaveAttribute("aria-expanded", "false");
      await expect(bar.locator("[data-v3-trust-details]")).toBeHidden();
    }
    for (const bar of await expanded.all()) {
      expect((await bar.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(170);
      await expect(bar.getByRole("button")).toContainText("접기");
      await expect(bar.getByRole("button")).toHaveAttribute("aria-expanded", "true");
      await expect(bar.locator("[data-v3-trust-details]")).toBeVisible();
    }

    const runtime = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-v3-component="TrustEvidenceBar"] button'),
      );
      return {
        pageEdge: getComputedStyle(document.documentElement)
          .getPropertyValue("--layout-page-edge")
          .trim(),
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        clippedComponents: Array.from(
          document.querySelectorAll<HTMLElement>('[data-v3-component="TrustEvidenceBar"]'),
        ).filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
        ).length,
        buttonTargetsValid: buttons.every((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        }),
        controlsResolve: buttons.every((button) => {
          const id = button.getAttribute("aria-controls");
          return Boolean(id && button.closest("[data-v3-component]")?.querySelector(`#${CSS.escape(id)}`));
        }),
      };
    });

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodeCount: violation.nodes.length,
      }));

    expect(runtime).toMatchObject({
      pageEdge: viewport.pageEdge,
      clippedComponents: 0,
      buttonTargetsValid: true,
      controlsResolve: true,
    });
    expect(runtime.overflow).toBeLessThanOrEqual(1);
    expect(blockingAxe).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(requestErrors).toEqual([]);
  });
}

test("S232B.1 native disclosure toggles with Enter and Space", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/acceptance/figma-v3-trust-evidence", {
    waitUntil: "domcontentloaded",
  });

  const bar = page.locator('[data-v3-state="Verified"][data-v3-view="Collapsed"]');
  const button = bar.getByRole("button");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(bar).toHaveAttribute("data-v3-view", "Expanded");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(bar.locator("[data-v3-trust-details]")).toBeVisible();
  expect((await bar.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(170);

  await page.keyboard.press("Space");
  await expect(bar).toHaveAttribute("data-v3-view", "Collapsed");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(bar.locator("[data-v3-trust-details]")).toBeHidden();
});
