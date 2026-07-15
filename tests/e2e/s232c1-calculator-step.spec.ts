import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { establishProtectedPreviewSession } from "./support/authenticated-runtime";

const expectedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").origin;

test.use({ screenshot: "off", trace: "off", video: "off" });

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_BASE_URL) {
    await establishProtectedPreviewSession(page, "S232C.1 synthetic");
  }
});

const viewports = [
  { name: "mobile", width: 390, height: 844, expectedWidth: 350, expectedMinHeight: 380 },
  { name: "tablet", width: 768, height: 1024, expectedWidth: 552, expectedMinHeight: 350 },
  { name: "desktop", width: 1440, height: 1024, expectedWidth: 552, expectedMinHeight: 350 },
  { name: "desktop-200-percent-equivalent", width: 720, height: 1024, expectedWidth: 552, expectedMinHeight: 350 },
] as const;

const steps = ["KeyInput", "Display", "Transfer"] as const;
const states = ["Current", "Error", "Complete"] as const;

const stateContract = {
  Current: {
    label: "현재 단계",
    background: "rgb(237, 244, 252)",
    border: "rgb(43, 92, 154)",
    emphasis: "rgb(43, 92, 154)",
  },
  Error: {
    label: "입력 오류",
    background: "rgb(253, 237, 236)",
    border: "rgb(178, 77, 69)",
    emphasis: "rgb(143, 56, 50)",
  },
  Complete: {
    label: "확인 완료",
    background: "rgb(234, 246, 240)",
    border: "rgb(46, 110, 88)",
    emphasis: "rgb(46, 110, 88)",
  },
} as const;

for (const viewport of viewports) {
  test(`S232C.1 exact CalculatorStep matrix at ${viewport.name}`, async ({ page }) => {
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
    const response = await page.goto("/acceptance/figma-v3-calculator-step", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBe(true);

    const harness = page.locator("[data-s232c1-calculator-step-acceptance]");
    const matrix = page.locator(
      '[data-v3-component="CalculatorStep"]:not([data-testid="calculator-step-real-mobile"])',
    );
    await expect(harness).toBeVisible();
    await expect(harness).toHaveAttribute("data-private-learner-data", "absent");
    await expect(matrix).toHaveCount(9);

    for (const step of steps) {
      await expect(
        page.locator(
          `[data-v3-component="CalculatorStep"][data-v3-step="${step}"]:not([data-testid="calculator-step-real-mobile"])`,
        ),
      ).toHaveCount(3);
      await expect(
        page.locator(`[data-v3-component="CalculatorStep"][data-v3-step="${step}"]`),
      ).toHaveCount(step === "KeyInput" ? 4 : 3);
      for (const state of states) {
        const fixture = page.getByTestId(`calculator-step-${step}-${state}`);
        const stateLabel = fixture.locator("[data-calculator-step-state-label]");
        const verification = fixture.locator("[data-calculator-step-verification]");
        const display = fixture.locator("[data-calculator-step-display]");
        const keys = fixture.locator("[data-calculator-step-key-sequence]");
        const hint = fixture.locator("[data-calculator-step-hint]");

        await expect(fixture).toHaveCount(1);
        await expect(fixture).toHaveAttribute("data-v3-step", step);
        await expect(fixture).toHaveAttribute("data-v3-state", state);
        await expect(fixture).toHaveAttribute("data-device-verified", "false");
        await expect(fixture).toHaveAttribute("data-hint-visible", "true");
        await expect(fixture).toHaveAttribute("data-state-label-visible", "true");
        await expect(fixture).toHaveAttribute("data-verification-visible", "true");
        await expect(stateLabel).toHaveText(stateContract[state].label);
        await expect(verification).toHaveText("기기 검증 전");

        const geometry = await fixture.evaluate((element) => {
          const stateLabelElement = element.querySelector<HTMLElement>("[data-calculator-step-state-label]");
          const displayElement = element.querySelector<HTMLElement>("[data-calculator-step-display]");
          const keyElement = element.querySelector<HTMLElement>("[data-calculator-step-key-sequence]");
          const hintElement = element.querySelector<HTMLElement>("[data-calculator-step-hint]");
          if (!stateLabelElement || !displayElement || !keyElement || !hintElement) return null;
          const shellRect = element.getBoundingClientRect();
          const shellStyle = getComputedStyle(element);
          const stateStyle = getComputedStyle(stateLabelElement);
          const displayRect = displayElement.getBoundingClientRect();
          const displayStyle = getComputedStyle(displayElement);
          const keyRect = keyElement.getBoundingClientRect();
          const hintRect = hintElement.getBoundingClientRect();
          const code = keyElement.querySelector<HTMLElement>("code");
          const value = displayElement.querySelector<HTMLElement>("output");
          return {
            shell: {
              width: shellRect.width,
              height: shellRect.height,
              padding: shellStyle.padding,
              gap: shellStyle.gap,
              borderRadius: shellStyle.borderRadius,
              borderColor: shellStyle.borderColor,
              background: shellStyle.backgroundColor,
            },
            state: {
              color: stateStyle.color,
              fontSize: stateStyle.fontSize,
              lineHeight: stateStyle.lineHeight,
              fontWeight: stateStyle.fontWeight,
            },
            display: {
              width: displayRect.width,
              height: displayRect.height,
              borderRadius: displayStyle.borderRadius,
              background: displayStyle.backgroundColor,
              valueFontSize: value ? getComputedStyle(value).fontSize : "",
              valueLineHeight: value ? getComputedStyle(value).lineHeight : "",
            },
            keys: {
              width: keyRect.width,
              height: keyRect.height,
              codeFontSize: code ? getComputedStyle(code).fontSize : "",
              codeLineHeight: code ? getComputedStyle(code).lineHeight : "",
            },
            hint: { width: hintRect.width, height: hintRect.height },
          };
        });

        expect(geometry).not.toBeNull();
        expect(geometry?.shell.width).toBeCloseTo(viewport.expectedWidth, 0);
        expect(geometry?.shell.height ?? 0).toBeGreaterThanOrEqual(viewport.expectedMinHeight);
        expect(geometry?.shell).toMatchObject({
          padding: "24px",
          gap: "12px",
          borderRadius: "16px",
          borderColor: stateContract[state].border,
          background: stateContract[state].background,
        });
        expect(geometry?.state).toMatchObject({
          color: stateContract[state].emphasis,
          fontSize: "13px",
          lineHeight: "20px",
          fontWeight: "500",
        });
        expect(geometry?.display).toMatchObject({
          borderRadius: "12px",
          background: "rgb(16, 35, 63)",
          valueFontSize: "28px",
          valueLineHeight: "36px",
        });
        expect(geometry?.display.height ?? 0).toBeGreaterThanOrEqual(124);
        if (viewport.name !== "mobile") {
          expect(geometry?.display.height).toBe(124);
        }
        expect(geometry?.keys.codeFontSize).toBe("13px");
        expect(geometry?.keys.codeLineHeight).toBe("20px");
        expect(geometry?.keys.height ?? 0).toBeGreaterThanOrEqual(66);
        expect(geometry?.hint.height ?? 0).toBeGreaterThanOrEqual(46);
        await expect(display).toBeVisible();
        await expect(keys).toBeVisible();
        await expect(hint).toBeVisible();
      }
    }

    const realMobile = page.getByTestId("calculator-step-real-mobile");
    await expect(realMobile).toHaveAttribute("data-state-label-visible", "false");
    await expect(realMobile.locator("[data-calculator-step-state-label]")).toHaveCount(0);
    await expect(realMobile.locator("[data-calculator-step-verification]")).toHaveText("기기 검증 전");
    await expect(realMobile.locator("[data-calculator-step-hint]")).toBeVisible();
    const realGeometry = await realMobile.evaluate((element) => {
      const shell = element.getBoundingClientRect();
      const display = element.querySelector<HTMLElement>("[data-calculator-step-display]")?.getBoundingClientRect();
      const keys = element.querySelector<HTMLElement>("[data-calculator-step-key-sequence]")?.getBoundingClientRect();
      const hint = element.querySelector<HTMLElement>("[data-calculator-step-hint]")?.getBoundingClientRect();
      return {
        width: shell.width,
        height: shell.height,
        display: display ? { width: display.width, height: display.height, top: display.top - shell.top } : null,
        keys: keys ? { width: keys.width, height: keys.height, top: keys.top - shell.top } : null,
        hint: hint ? { width: hint.width, height: hint.height, top: hint.top - shell.top } : null,
      };
    });
    expect(realGeometry.width).toBeCloseTo(350, 0);
    expect(realGeometry.height).toBeGreaterThanOrEqual(380);
    expect(realGeometry.display).toMatchObject({ width: 302, height: 124, top: 58 });
    expect(realGeometry.keys).toMatchObject({ width: 302, height: 86, top: 194 });
    expect(realGeometry.hint).toMatchObject({ width: 302, height: 46, top: 292 });

    const runtime = await page.evaluate(() => {
      const components = Array.from(
        document.querySelectorAll<HTMLElement>('[data-v3-component="CalculatorStep"]'),
      );
      const unexpectedTabStops = components.reduce(
        (count, element) =>
          count + element.querySelectorAll("a[href],button,input,textarea,select,[tabindex]").length,
        0,
      );
      return {
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        clippedComponents: components.filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
        ).length,
        unexpectedTabStops,
      };
    });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(runtime).toMatchObject({ clippedComponents: 0, unexpectedTabStops: 0 });
    expect(runtime.overflow).toBeLessThanOrEqual(1);
    expect(blockingAxe).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(requestErrors).toEqual([]);
  });
}
