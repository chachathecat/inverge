import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { establishProtectedPreviewSession } from "./support/authenticated-runtime";

const expectedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").origin;

test.use({
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_BASE_URL) await establishProtectedPreviewSession(page, "S232B synthetic");
});

const viewports = [
  { name: "mobile", width: 390, height: 844, pageEdge: "20px" },
  { name: "tablet", width: 768, height: 1024, pageEdge: "32px" },
  { name: "desktop", width: 1440, height: 1024, pageEdge: "32px" },
] as const;

for (const viewport of viewports) {
  test(`S232B passive matrix at ${viewport.name}`, async ({ page }) => {
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
    const response = await page.goto("/acceptance/figma-v3-passive", { waitUntil: "domcontentloaded" });

    expect(response?.ok()).toBe(true);
    const acceptanceSurface = page.locator("[data-s232b-passive-acceptance]");
    await expect(acceptanceSurface).toBeVisible();
    await expect(acceptanceSurface).toHaveAttribute("data-private-learner-data", "absent");
    await expect(page.locator('[data-v3-component="StateChip"]')).toHaveCount(5);
    await expect(page.locator('[data-v3-component="BiggestGap"]')).toHaveCount(6);
    await expect(page.locator('[data-v3-component="EvidenceExcerpt"]')).toHaveCount(6);
    for (const [state, label] of [
      ["Unverified", "미확인"],
      ["Weak", "취약"],
      ["Recovering", "회복 중"],
      ["Stable", "안정"],
    ] as const) {
      await expect(
        page.locator(`[data-v3-component="StateChip"][data-v3-state="${state}"]`).first(),
      ).toContainText(label);
    }
    for (const [type, label] of [
      ["MissingLink", "가장 큰 간극 1개"],
      ["Incorrect", "잘못된 연결 1개"],
      ["Unverified", "확인할 근거 1개"],
    ] as const) {
      const gaps = page.locator(`[data-v3-component="BiggestGap"][data-v3-type="${type}"]`);
      await expect(gaps).toHaveCount(2);
      await expect(gaps.first()).toContainText(label);
      for (const density of ["Default", "Compact"] as const) {
        await expect(
          page.locator(`[data-v3-component="BiggestGap"][data-v3-type="${type}"][data-v3-density="${density}"]`),
        ).toHaveCount(1);
      }
    }
    await expect(page.locator('[data-v3-component="BiggestGap"][data-v3-density="Default"]')).toHaveCount(3);
    await expect(page.locator('[data-v3-component="BiggestGap"][data-v3-density="Compact"]')).toHaveCount(3);
    for (const [source, label] of [
      ["Learner", "학습자 근거"],
      ["Official", "공식 근거"],
      ["AI", "AI 제안"],
    ] as const) {
      const excerpts = page.locator(`[data-v3-component="EvidenceExcerpt"][data-v3-source="${source}"]`);
      await expect(excerpts).toHaveCount(2);
      await expect(excerpts.first()).toContainText(label);
      for (const review of ["Default", "Confirmed"] as const) {
        await expect(
          page.locator(`[data-v3-component="EvidenceExcerpt"][data-v3-source="${source}"][data-v3-review="${review}"]`),
        ).toHaveCount(1);
      }
    }
    for (const [review, label] of [["Default", "확인 필요"], ["Confirmed", "확인됨"]] as const) {
      const excerpts = page.locator(`[data-v3-component="EvidenceExcerpt"][data-v3-review="${review}"]`);
      await expect(excerpts).toHaveCount(3);
      await expect(excerpts.first()).toContainText(label);
    }

    const runtime = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const stableChip = getComputedStyle(document.querySelector('[data-v3-component="StateChip"][data-v3-state="Stable"]')!);
      const officialConfirmed = getComputedStyle(document.querySelector('[data-v3-component="EvidenceExcerpt"][data-v3-source="Official"][data-v3-review="Confirmed"]')!);
      const prose = getComputedStyle(document.querySelector('[data-v3-component="EvidenceExcerpt"] blockquote')!);
      return {
        pageEdge: root.getPropertyValue("--layout-page-edge").trim(),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        stableChip: {
          background: stableChip.backgroundColor,
          border: stableChip.borderColor,
        },
        officialConfirmedBorder: officialConfirmed.borderColor,
        prose: {
          family: prose.fontFamily,
          size: prose.fontSize,
          lineHeight: prose.lineHeight,
        },
        clippedComponents: Array.from(document.querySelectorAll("[data-v3-component]")).filter((node) => {
          const element = node as HTMLElement;
          return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
        }).length,
      };
    });

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");

    expect(runtime.pageEdge).toBe(viewport.pageEdge);
    expect(runtime.overflow).toBeLessThanOrEqual(1);
    expect(runtime.clippedComponents).toBe(0);
    expect(runtime.stableChip).toEqual({ background: "rgb(234, 246, 240)", border: "rgb(46, 110, 88)" });
    expect(runtime.officialConfirmedBorder).toBe("rgb(46, 110, 88)");
    expect(runtime.prose.family).toContain("Noto Serif KR Variable");
    expect(runtime.prose).toMatchObject({ size: "17px", lineHeight: "30px" });
    expect(blockingAxe).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(requestErrors).toEqual([]);
  });
}

test("S232B passive matrix reflows at a 200% desktop zoom equivalent", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1024 });
  const response = await page.goto("/acceptance/figma-v3-passive", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
  await expect(page.locator("[data-s232b-passive-acceptance]")).toBeVisible();

  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    clippedComponents: Array.from(document.querySelectorAll("[data-v3-component]")).filter((node) => {
      const element = node as HTMLElement;
      return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
    }).length,
  }));

  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.clippedComponents).toBe(0);
});
