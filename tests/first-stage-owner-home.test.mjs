import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { build } from "esbuild";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const componentPath = "components/review-os/first-stage-mcq-loop.tsx";
const componentSource = fs.readFileSync(path.join(root, componentPath), "utf8");

const reviewedEndpoints = [
  "/api/review-os/first-stage/sessions",
  "/api/review-os/first-stage/accounting/sessions",
  "/api/review-os/first-stage/civil-law/sessions",
  "/api/review-os/first-stage/real-estate-principles/sessions",
  "/api/review-os/first-stage/appraiser-related-law/sessions",
];
const trialEndpoint = "/api/review-os/first-stage/economics-trial/sessions";

function availability(state, count = 0, blocker = null, bankPractice = false) {
  return JSON.stringify({
    ok: true,
    availability: {
      state,
      blocker,
      bankPractice,
      questions: Array.from({ length: count }, (_, index) => ({
        questionId: `bodyless-${index + 1}`,
        subjectId: "metadata-only",
        questionNumber: index + 1,
      })),
    },
  });
}

test("Owner home keeps all five subject routes bodyless and one primary fallback order", () => {
  for (const endpoint of [...reviewedEndpoints, trialEndpoint]) {
    assert.ok(componentSource.includes(endpoint), `missing availability endpoint ${endpoint}`);
  }
  for (const href of [
    "/app/first-stage/practice",
    "/app/first-stage/accounting",
    "/app/first-stage/civil-law",
    "/app/first-stage/real-estate-principles",
    "/app/first-stage/appraiser-related-law",
    "/app/first-stage/economics-trial",
    "/app?mode=second",
  ]) {
    assert.ok(componentSource.includes(href), `missing handoff ${href}`);
  }
  assert.equal((componentSource.match(/data-primary-owner-action/gu) ?? []).length, 1);
  assert.match(componentSource, /questions\.length/u);
  assert.match(componentSource, /cache: "no-store"/u);
  assert.match(componentSource, /credentials: "same-origin"/u);
  assert.match(componentSource, /15_000/u);
  assert.match(componentSource, /학습 효능, 합격 가능성, 과목 완성이나 공식 결과를 주장하지 않습니다/u);
  assert.doesNotMatch(componentSource, /question\.stem|choice\.body|correctChoice|explanation\.text/u);
});

test("real browser selects reviewed stock, then local trial, then second-stage handoff", async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from "react"; import { createRoot } from "react-dom/client";
        import { FirstStageMcqLoop } from "./components/review-os/first-stage-mcq-loop";
        createRoot(document.getElementById("root")).render(React.createElement(FirstStageMcqLoop));`,
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
        esbuild.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next/link", namespace: "owner-home-shim" }));
        esbuild.onLoad({ filter: /.*/, namespace: "owner-home-shim" }, () => ({
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

  let scenario = "reviewed";
  let origin = "";
  const requests = [];
  const serverErrors = [];
  const external = [];
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url, origin);
      if (url.pathname === "/entry.js") {
        response.writeHead(200, { "content-type": "application/javascript" });
        response.end(Buffer.from(bundle.outputFiles[0].contents));
        return;
      }
      if (url.pathname === "/app/first-stage") {
        response.writeHead(200, { "content-type": "text/html" });
        response.end('<!doctype html><html lang="ko"><body><div id="root"></div><script src="/entry.js"></script></body></html>');
        return;
      }
      if ([...reviewedEndpoints, trialEndpoint].includes(url.pathname)) {
        requests.push(`${scenario}:${url.pathname}`);
        response.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "private, no-store, max-age=0",
        });
        if (scenario === "reviewed" && url.pathname === reviewedEndpoints[1]) {
          response.end(availability("available", 2));
        } else if (scenario === "trial" && url.pathname === trialEndpoint) {
          response.end(availability("available", 7));
        } else {
          response.end(availability(
            "blocked",
            0,
            url.pathname === trialEndpoint ? "owner_local_trial_content_required" : "approved_content_required",
          ));
        }
        return;
      }
      response.writeHead(404).end();
    } catch {
      serverErrors.push("test-server-error");
      response.writeHead(500).end();
    }
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
    page.on("pageerror", (error) => serverErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") serverErrors.push(message.text());
    });

    async function verify(expectedSummary, expectedLabel, expectedHref) {
      await page.goto(`${origin}/app/first-stage`);
      await page.getByText(expectedSummary, { exact: true }).waitFor();
      const primary = page.locator("[data-primary-owner-action]");
      assert.equal(await primary.count(), 1);
      assert.equal((await primary.textContent())?.trim(), expectedLabel);
      assert.equal(await primary.getAttribute("href"), expectedHref);
      assert.equal(await page.getByRole("heading", { name: "1차 오늘 학습" }).count(), 1);
      assert.doesNotMatch(await page.locator("body").innerText(), /PRIVATE_BODY|QUESTION_STEM|CORRECT_ANSWER/u);
    }

    await verify("학습 가능 1/5과목", "회계학 연습 시작", "/app/first-stage/accounting");
    scenario = "trial";
    await verify("학습 가능 0/5과목", "경제학 PC 시험 이어가기", "/app/first-stage/economics-trial");
    scenario = "second";
    await verify("학습 가능 0/5과목", "2차 오늘 할 일 계속하기", "/app?mode=second");

    for (const currentScenario of ["reviewed", "trial", "second"]) {
      const seen = requests.filter((entry) => entry.startsWith(`${currentScenario}:`)).map((entry) => entry.slice(currentScenario.length + 1));
      assert.deepEqual([...new Set(seen)].sort(), [...reviewedEndpoints, trialEndpoint].sort());
    }
    assert.deepEqual(serverErrors, []);
    assert.deepEqual(external, []);
    await context.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
