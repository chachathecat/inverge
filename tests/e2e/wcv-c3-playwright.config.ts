import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "wcv-c3-durable-learning-runtime.spec.ts",
  timeout: 600_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    browserName: "chromium",
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
