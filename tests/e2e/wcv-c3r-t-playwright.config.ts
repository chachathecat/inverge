import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "wcv-c3r-t-theory-runtime.spec.ts",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
