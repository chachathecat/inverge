import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { establishProtectedPreviewSession } from "./support/authenticated-runtime";

const expectedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").origin;

test.use({ screenshot: "off", trace: "off", video: "off" });

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_BASE_URL) {
    await establishProtectedPreviewSession(page, "S232B.2 synthetic");
  }
});

const viewports = [
  { name: "mobile", width: 390, height: 844, pageEdge: "20px" },
  { name: "tablet", width: 768, height: 1024, pageEdge: "32px" },
  { name: "desktop", width: 1440, height: 1024, pageEdge: "32px" },
  { name: "desktop-200-percent-equivalent", width: 720, height: 1024, pageEdge: "20px" },
] as const;

const modes = ["Dock", "Inline"] as const;
const states = ["Ready", "Saving", "Offline", "Disabled"] as const;

const expectedColors = {
  Ready: {
    controlBackground: "rgb(16, 35, 63)",
    controlText: "rgb(255, 255, 255)",
    statusText: "rgb(90, 100, 114)",
  },
  Saving: {
    controlBackground: "rgb(238, 244, 251)",
    controlText: "rgb(16, 35, 63)",
    statusText: "rgb(90, 100, 114)",
  },
  Offline: {
    controlBackground: "rgb(254, 244, 231)",
    controlText: "rgb(122, 67, 12)",
    statusText: "rgb(122, 67, 12)",
  },
  Disabled: {
    controlBackground: "rgb(242, 240, 234)",
    controlText: "rgb(100, 112, 128)",
    statusText: "rgb(90, 100, 114)",
  },
} as const;

for (const viewport of viewports) {
  test(`S232B.2 exact StickyAction matrix at ${viewport.name}`, async ({ page }) => {
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
    const response = await page.goto("/acceptance/figma-v3-sticky-action", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBe(true);

    const harness = page.locator("[data-s232b2-sticky-action-acceptance]");
    const components = page.locator('[data-v3-component="StickyAction"]');
    await expect(harness).toBeVisible();
    await expect(harness).toHaveAttribute("data-private-learner-data", "absent");
    await expect(components).toHaveCount(8);

    for (const mode of modes) {
      await expect(page.locator(`[data-v3-component="StickyAction"][data-v3-mode="${mode}"]`)).toHaveCount(4);
      for (const state of states) {
        const fixture = page.getByTestId(`sticky-action-${mode}-${state}`);
        const control = page.getByTestId(`sticky-action-${mode}-${state}-control`);
        const status = fixture.getByRole("status");
        await expect(fixture).toHaveCount(1);
        await expect(fixture).toHaveAttribute("data-v3-mode", mode);
        await expect(fixture).toHaveAttribute("data-v3-state", state);
        await expect(fixture).toHaveAttribute("data-status-visible", "true");
        await expect(status).toContainText("2분 전 저장됨");
        await expect(control).toContainText("10분 문단 다시쓰기");

        if (state === "Ready") {
          await expect(control).toHaveJSProperty("tagName", "A");
          await expect(control).toHaveAttribute("href", "#ready-action-target");
        } else {
          await expect(control).toHaveJSProperty("tagName", "BUTTON");
          await expect(control).toBeDisabled();
        }
        if (state === "Saving") {
          await expect(control).toHaveAttribute("aria-busy", "true");
        } else {
          await expect(control).not.toHaveAttribute("aria-busy", "true");
        }

        const geometry = await fixture.evaluate((element) => {
          const statusElement = element.querySelector<HTMLElement>('[role="status"]');
          const controlElement = element.querySelector<HTMLElement>("a, button");
          if (!statusElement || !controlElement) return null;
          const shellRect = element.getBoundingClientRect();
          const statusRect = statusElement.getBoundingClientRect();
          const controlRect = controlElement.getBoundingClientRect();
          const shellStyle = getComputedStyle(element);
          const statusStyle = getComputedStyle(statusElement);
          const controlStyle = getComputedStyle(controlElement);
          return {
            shell: {
              width: shellRect.width,
              height: shellRect.height,
              background: shellStyle.backgroundColor,
              borderTopWidth: shellStyle.borderTopWidth,
              boxShadow: shellStyle.boxShadow,
            },
            status: {
              width: statusRect.width,
              height: statusRect.height,
              top: statusRect.top - shellRect.top,
              color: statusStyle.color,
              fontSize: statusStyle.fontSize,
              lineHeight: statusStyle.lineHeight,
              fontWeight: statusStyle.fontWeight,
              letterSpacing: statusStyle.letterSpacing,
            },
            control: {
              width: controlRect.width,
              height: controlRect.height,
              top: controlRect.top - shellRect.top,
              background: controlStyle.backgroundColor,
              color: controlStyle.color,
              borderRadius: controlStyle.borderRadius,
              fontSize: controlStyle.fontSize,
              lineHeight: controlStyle.lineHeight,
              fontWeight: controlStyle.fontWeight,
            },
          };
        });

        expect(geometry).not.toBeNull();
        expect(geometry?.status).toMatchObject({
          height: 18,
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: "500",
          letterSpacing: "0.1px",
          color: expectedColors[state].statusText,
        });
        expect(geometry?.control).toMatchObject({
          height: 52,
          background: expectedColors[state].controlBackground,
          color: expectedColors[state].controlText,
          borderRadius: "12px",
          fontSize: "15px",
          lineHeight: "22px",
          fontWeight: "700",
        });

        if (mode === "Dock") {
          expect(geometry?.shell.width).toBeCloseTo(390, 0);
          expect(geometry?.shell.height).toBeCloseTo(116, 0);
          expect(geometry?.status.width).toBeCloseTo(350, 0);
          expect(geometry?.control.width).toBeCloseTo(350, 0);
          expect(geometry?.status.top).toBeGreaterThanOrEqual(16);
          expect(geometry?.status.top).toBeLessThanOrEqual(17);
          expect(geometry?.control.top).toBeGreaterThanOrEqual(42);
          expect(geometry?.control.top).toBeLessThanOrEqual(43);
          expect(geometry?.shell.background).toBe("rgb(255, 255, 255)");
          expect(geometry?.shell.borderTopWidth).toBe("1px");
          expect(geometry?.shell.boxShadow).not.toBe("none");
        } else {
          expect(geometry?.shell.width).toBeCloseTo(300, 0);
          expect(geometry?.shell.height).toBeCloseTo(84, 0);
          expect(geometry?.status.width).toBeCloseTo(300, 0);
          expect(geometry?.control.width).toBeCloseTo(300, 0);
          expect(geometry?.status.top).toBeCloseTo(0, 0);
          expect(geometry?.control.top).toBeCloseTo(26, 0);
          expect(geometry?.shell.background).toBe("rgba(0, 0, 0, 0)");
          expect(geometry?.shell.borderTopWidth).toBe("0px");
          expect(geometry?.shell.boxShadow).toBe("none");
        }
      }
    }

    const runtime = await page.evaluate(() => ({
      pageEdge: getComputedStyle(document.documentElement)
        .getPropertyValue("--layout-page-edge")
        .trim(),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      clippedComponents: Array.from(
        document.querySelectorAll<HTMLElement>('[data-v3-component="StickyAction"]'),
      ).filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      ).length,
    }));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(runtime).toMatchObject({
      pageEdge: viewport.pageEdge,
      clippedComponents: 0,
    });
    expect(runtime.overflow).toBeLessThanOrEqual(1);
    expect(blockingAxe).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(requestErrors).toEqual([]);
  });
}

test("S232B.2 Ready uses keyboard navigation while non-ready controls stay unavailable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/acceptance/figma-v3-sticky-action", { waitUntil: "domcontentloaded" });

  const ready = page.getByTestId("sticky-action-Dock-Ready-control");
  await ready.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#ready-action-target$/);

  for (const state of ["Saving", "Offline", "Disabled"] as const) {
    const control = page.getByTestId(`sticky-action-Dock-${state}-control`);
    await expect(control).toBeDisabled();
  }
});
