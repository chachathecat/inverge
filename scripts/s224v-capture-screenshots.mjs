import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function readArg(name, fallback) {
  const flag = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(flag));
  return match ? match.slice(flag.length) : fallback;
}

const baseUrl = readArg("base-url", "http://127.0.0.1:3000");
const outDir = readArg("out-dir", ".agent-factory/s224v-visual-taste-screenshots");

const routes = [
  { surface: "/app", path: "/app?mode=second", name: "app" },
  { surface: "/app/capture", path: "/app/capture?mode=second", name: "capture" },
  { surface: "/answer-review?mode=second", path: "/answer-review?mode=second", name: "answer-review" },
  { surface: "/app/review", path: "/app/review?mode=second", name: "review" },
  { surface: "/app/notes", path: "/app/notes?mode=second", name: "notes" },
];

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const consoleMessages = [];
      const pageErrors = [];

      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
        }
      });
      page.on("pageerror", (error) => {
        pageErrors.push(error.message.slice(0, 500));
      });

      const url = new URL(route.path, baseUrl).toString();
      const screenshotPath = path.join(outDir, `${route.name}-${viewport.name}.png`);
      let status = null;
      let finalUrl = url;
      let title = "";
      let markerPresent = false;

      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
        status = response?.status() ?? null;
        finalUrl = page.url();
        title = await page.title().catch(() => "");
        markerPresent = await page.locator("[data-s224v-surface], [data-s224v-surface-fragment]").first().isVisible().catch(() => false);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (error) {
        pageErrors.push(error instanceof Error ? error.message : String(error));
      }

      results.push({
        surface: route.surface,
        requestedPath: route.path,
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        status,
        finalUrl,
        screenshotPath,
        markerPresent,
        title,
        consoleMessages,
        pageErrors,
      });

      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ baseUrl, capturedAt: new Date().toISOString(), results }, null, 2));

const failures = results.filter((result) => result.pageErrors.length > 0 || (result.status !== null && result.status >= 400));
if (failures.length > 0) {
  console.error(`[s224v] captured ${results.length} screenshots with ${failures.length} route issue(s). See ${path.join(outDir, "manifest.json")}.`);
  process.exitCode = 1;
} else {
  console.log(`[s224v] captured ${results.length} screenshots. Manifest: ${path.join(outDir, "manifest.json")}`);
}
