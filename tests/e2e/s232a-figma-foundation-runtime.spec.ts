import { expect, test } from "@playwright/test";

test.use({ screenshot: "off", trace: "off", video: "off" });

const viewports = [
  { name: "mobile", width: 390, height: 844, expectedPageEdge: "20px" },
  { name: "desktop", width: 1440, height: 1000, expectedPageEdge: "32px" },
] as const;

for (const viewport of viewports) {
  test(`S232A V3 foundations render at ${viewport.name}`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.ok()).toBe(true);
    await expect(page.locator("body")).toContainText("답안길");
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);

    const runtime = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('16px "Noto Sans KR Variable"', "답안길"),
        document.fonts.load('17px "Noto Serif KR Variable"', "학습 근거"),
        document.fonts.load('13px "IBM Plex Mono"', "123.45"),
      ]);

      const sampleStyle = (className: string, text: string) => {
        const sample = document.createElement("span");
        sample.className = className;
        sample.textContent = text;
        sample.style.position = "absolute";
        sample.style.insetInlineStart = "-10000px";
        document.body.append(sample);
        const computed = getComputedStyle(sample);
        const result = {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
        };
        sample.remove();
        return result;
      };

      const root = getComputedStyle(document.documentElement);
      return {
        pageEdge: root.getPropertyValue("--layout-page-edge").trim(),
        contentMax: root.getPropertyValue("--layout-content-max").trim(),
        readingColumn: root.getPropertyValue("--layout-reading-column").trim(),
        evidenceRail: root.getPropertyValue("--layout-evidence-rail").trim(),
        bodyFont: getComputedStyle(document.body).fontFamily,
        prose: sampleStyle("v3-prose", "학습 근거"),
        calculator: sampleStyle("v3-calculator-input", "123.45"),
        fonts: {
          ui: document.fonts.check('16px "Noto Sans KR Variable"', "답안길"),
          prose: document.fonts.check('17px "Noto Serif KR Variable"', "학습 근거"),
          mono: document.fonts.check('13px "IBM Plex Mono"', "123.45"),
        },
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        hasContent: document.body.innerText.trim().length > 0,
      };
    });

    expect(runtime.hasContent).toBe(true);
    expect(runtime.overflow).toBeLessThanOrEqual(1);
    expect(runtime.pageEdge).toBe(viewport.expectedPageEdge);
    expect(runtime.contentMax).toBe("1120px");
    expect(runtime.readingColumn).toBe("680px");
    expect(runtime.evidenceRail).toBe("288px");
    expect(runtime.bodyFont).toContain("Noto Sans KR Variable");
    expect(runtime.prose).toMatchObject({ fontSize: "17px", lineHeight: "30px" });
    expect(runtime.prose.fontFamily).toContain("Noto Serif KR Variable");
    expect(runtime.calculator.fontFamily).toContain("IBM Plex Mono");
    expect(runtime.fonts).toEqual({ ui: true, prose: true, mono: true });
    expect(browserErrors).toEqual([]);
  });
}
