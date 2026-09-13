import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { build } from "esbuild";
import { chromium } from "playwright";

import {
  buildSecondStageOwnerHome,
  SECOND_STAGE_OWNER_SUBJECTS,
} from "../lib/review-os/second-stage-owner-home.ts";

const root = path.resolve(import.meta.dirname, "..");

const ready = (subjectId, overrides = {}) => ({
  subjectId,
  readState: "ready",
  record: null,
  queue: [],
  ...overrides,
});

test("second-stage Owner home chooses reopened, D1, D7 and recurrence work before active records", () => {
  const view = buildSecondStageOwnerHome([
    ready("practice", {
      record: { id: "practice-record", state: "D0_OPEN", updatedAt: "2026-09-13T08:00:00.000Z" },
    }),
    ready("theory", {
      record: { id: "theory-record", state: "D1_COMPLETE", updatedAt: "2026-09-13T09:00:00.000Z" },
      queue: [{ recordId: "theory-record", reviewPhase: "D7_TRANSFER", dueAt: "2026-09-13T00:00:00.000Z", eligible: true, gapState: "OPEN" }],
    }),
    ready("law", {
      record: { id: "law-record", state: "REOPENED", updatedAt: "2026-09-12T09:00:00.000Z" },
      queue: [{ recordId: "law-record", reviewPhase: "REOPENED_REVIEW", dueAt: "2026-09-13T12:00:00.000Z", eligible: true, gapState: "REOPENED" }],
    }),
  ]);

  assert.equal(view.primaryAction.kind, "due");
  assert.equal(view.primaryAction.subjectId, "law");
  assert.equal(view.primaryAction.label, "법규 다시 확인하기");
  assert.equal(view.primaryAction.href, "/app/c3r-l?recordId=law-record");
  assert.equal(view.subjects.find((subject) => subject.subjectId === "theory")?.eligibleReviewCount, 1);
});

test("second-stage Owner home resumes the most recently updated unfinished record", () => {
  const view = buildSecondStageOwnerHome([
    ready("practice", {
      record: { id: "older", state: "FEEDBACK_COMMITTED", updatedAt: "2026-09-12T08:00:00.000Z" },
    }),
    ready("theory", {
      record: { id: "newer", state: "REPAIRED", updatedAt: "2026-09-13T08:00:00.000Z" },
    }),
    ready("law", {
      record: { id: "closed", state: "CLOSED", updatedAt: "2026-09-13T09:00:00.000Z" },
    }),
  ]);

  assert.equal(view.primaryAction.kind, "resume");
  assert.equal(view.primaryAction.subjectId, "theory");
  assert.equal(view.primaryAction.href, "/app/c3r-t?recordId=newer");
});

test("second-stage Owner home starts an admitted empty subject and keeps partial gates truthful", () => {
  const view = buildSecondStageOwnerHome([
    ready("practice"),
    { subjectId: "theory", readState: "unavailable", record: null, queue: [] },
    { subjectId: "law", readState: "error", record: null, queue: [] },
  ]);

  assert.equal(view.admittedSubjectCount, 2);
  assert.equal(view.readErrorCount, 1);
  assert.equal(view.primaryAction.kind, "start");
  assert.equal(view.primaryAction.href, "/app/c3r-p");
  assert.equal(view.subjects.find((subject) => subject.subjectId === "theory")?.status, "unavailable");
  assert.equal(view.subjects.find((subject) => subject.subjectId === "law")?.status, "error");
});

test("second-stage Owner home retries when admitted reads are unknown and starts a new capture only after closed records", () => {
  const retry = buildSecondStageOwnerHome([
    { subjectId: "practice", readState: "error", record: null, queue: [] },
    { subjectId: "theory", readState: "unavailable", record: null, queue: [] },
    { subjectId: "law", readState: "error", record: null, queue: [] },
  ]);
  assert.equal(retry.primaryAction.kind, "retry");
  assert.equal(retry.primaryAction.href, "/app/second-stage");

  const closed = buildSecondStageOwnerHome(
    SECOND_STAGE_OWNER_SUBJECTS.map((subject, index) =>
      ready(subject.id, {
        record: { id: `${subject.id}-closed`, state: "CLOSED", updatedAt: `2026-09-1${index}T08:00:00.000Z` },
      }),
    ),
  );
  assert.equal(closed.primaryAction.kind, "new_capture");
  assert.equal(closed.primaryAction.href, "/app/capture?mode=second");
  assert.ok(closed.subjects.every((subject) => subject.status === "stable"));
});

test("second-stage Owner home refuses to render without an admitted existing gate", () => {
  assert.throws(
    () => buildSecondStageOwnerHome(
      SECOND_STAGE_OWNER_SUBJECTS.map((subject) => ({
        subjectId: subject.id,
        readState: "unavailable",
        record: null,
        queue: [],
      })),
    ),
    /no-admitted-subject/,
  );
});

test("route and presentation reuse existing gates, project bodyless metadata and keep one dominant action", () => {
  const page = readFileSync("app/app/second-stage/page.tsx", "utf8");
  const component = readFileSync("components/review-os/second-stage-owner-home.tsx", "utf8");
  const layout = readFileSync("app/app/layout.tsx", "utf8");
  const shell = readFileSync("components/learner/learner-ui.tsx", "utf8");

  for (const token of [
    "requireC3RPAccess",
    "requireC3RTAccess",
    "requireC3RLAccess",
    "createC3RPService",
    "createC3RTService",
    "createC3RLService",
  ]) {
    assert.match(page, new RegExp(token));
  }
  assert.match(page, /error instanceof C3RPError/);
  assert.match(page, /error instanceof C3RTError/);
  assert.match(page, /error instanceof C3RLError/);
  assert.match(page, /throw error/);
  for (const forbidden of ["prompt", "scaffold", "attempts", "failureNotes", "body", "claim"]) {
    assert.doesNotMatch(page, new RegExp(`\\b${forbidden}\\b`));
  }
  assert.match(page, /snapshots\.every\(\(snapshot\) => snapshot\.readState === "unavailable"\)/);
  assert.match(page, /notFound\(\)/);
  assert.equal((component.match(/data-second-stage-owner-primary-cta/g) ?? []).length, 1);
  assert.match(component, /실무·이론·법규, 지금 할 한 가지/);
  assert.match(component, /기존 2차 흐름 보기/);
  assert.match(component, /\/app\/capture\?mode=second/);
  assert.match(component, /\/app\?mode=second/);
  assert.doesNotMatch(component, /공식|합격|점수|마스터|완성/);
  assert.match(layout, /Promise\.allSettled\(\[/);
  assert.match(layout, /results\.some\(\(result\) => result\.status === "fulfilled"\)/);
  assert.match(layout, /secondStageOwnerHomeEnabled=\{secondStageOwnerHomeEnabled\}/);
  assert.match(shell, /secondStageOwnerHomeEnabled \? \(/);
  assert.match(shell, /href: "\/app\/second-stage"/);
  assert.match(shell, /"\/app\/c3r-p", "\/app\/c3r-t", "\/app\/c3r-l"/);
});

test("390px Owner home keeps the primary action first, readable and bodyless", async () => {
  const view = buildSecondStageOwnerHome([
    ready("practice", {
      record: { id: "practice-mobile", state: "REPAIRED", updatedAt: "2026-09-13T08:00:00.000Z" },
      queue: [{ recordId: "practice-mobile", reviewPhase: "D1", dueAt: "2026-09-13T09:00:00.000Z", eligible: true, gapState: "OPEN" }],
    }),
    ready("theory"),
    { subjectId: "law", readState: "unavailable", record: null, queue: [] },
  ]);
  const bundle = await build({
    stdin: {
      contents: `import React from "react"; import { createRoot } from "react-dom/client";
        import { SecondStageOwnerHome } from "./components/review-os/second-stage-owner-home";
        createRoot(document.getElementById("root")).render(React.createElement(SecondStageOwnerHome, { view: ${JSON.stringify(view)} }));`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
    plugins: [{
      name: "next-link-browser-shim",
      setup(esbuild) {
        esbuild.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next/link", namespace: "second-stage-home-shim" }));
        esbuild.onLoad({ filter: /.*/, namespace: "second-stage-home-shim" }, () => ({
          loader: "jsx",
          resolveDir: root,
          contents: `import React from "react";
            export default function Link({ href, prefetch, children, ...props }) {
              return <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>;
            }`,
        }));
      },
    }],
  });

  const errors = [];
  const external = [];
  let origin = "";
  const server = createServer((request, response) => {
    const url = new URL(request.url, origin);
    if (url.pathname === "/entry.js") {
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end(Buffer.from(bundle.outputFiles[0].contents));
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<!doctype html><html lang="ko"><body><div id="root"></div><script src="/entry.js"></script></body></html>');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${origin}/app/second-stage`);
    await page.getByRole("heading", { name: "실무·이론·법규, 지금 할 한 가지" }).waitFor();

    const primary = page.locator("[data-second-stage-owner-primary]");
    const primaryCta = page.locator("[data-second-stage-owner-primary-cta] a");
    assert.equal(await primary.count(), 1);
    assert.equal(await primaryCta.count(), 1);
    assert.equal((await primaryCta.textContent())?.trim(), "실무 다음 날 혼자 해보기");
    assert.equal(await primaryCta.getAttribute("href"), "/app/c3r-p?recordId=practice-mobile");
    assert.equal(await page.locator("[data-second-stage-owner-subject]").count(), 3);
    assert.equal(await page.locator("details[open]").count(), 0);
    assert.equal(await page.evaluate(() => {
      const first = document.querySelector("[data-second-stage-owner-primary]");
      const subjects = document.querySelector("[data-second-stage-owner-subjects]");
      return Boolean(first && subjects && (first.compareDocumentPosition(subjects) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.doesNotMatch(await page.locator("body").innerText(), /PRIVATE_BODY|QUESTION_STEM|CORRECT_ANSWER|SCAFFOLD_BODY/);

    await page.keyboard.press("Tab");
    assert.equal(await primaryCta.evaluate((element) => element === document.activeElement), true);
    await page.setViewportSize({ width: 768, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
