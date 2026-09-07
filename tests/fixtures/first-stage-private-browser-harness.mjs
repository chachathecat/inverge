import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { SUBJECT_CASES } from "./first-stage-remaining-content-harness.mjs";

/** Real component + real compiled route entry + supplied isolated repository.
 * This is a localhost test host, NOT a Next deployment or remote auth acceptance.
 */
export async function verifyPrivateBrowser({ route, clock, failNextWrite, subject = "economics_principles", blockCatalog, blockedMessage, expectedAttributions, questionNumber = 1, retryChoice = 2 }) {
  assert.ok(["economics_principles", "accounting", ...SUBJECT_CASES.map(spec => spec.id)].includes(subject));
  const slug = SUBJECT_CASES.find(spec => spec.id === subject)?.slug ?? "accounting";
  const pagePath = subject === "economics_principles" ? "/app/first-stage/practice" : `/app/first-stage/${slug}`;
  const apiPath = subject === "economics_principles" ? "/api/review-os/first-stage/sessions" : `/api/review-os/first-stage/${slug}/sessions`;
  const bundle = await build({ stdin: {
    contents: `import React from "react"; import {createRoot} from "react-dom/client"; import {FirstStagePrivatePractice} from "./components/review-os/first-stage-private-practice"; createRoot(document.getElementById("root")).render(React.createElement(FirstStagePrivatePractice, {subject: ${JSON.stringify(subject)}}));`,
    resolveDir: process.cwd(), loader: "tsx",
  }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
  let origin = "", browser;
  const failures = [], external = [], consoleErrors = [];
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, origin);
      if (url.pathname === "/entry.js") {
        outgoing.writeHead(200, { "content-type": "application/javascript", "cache-control": "no-store" });
        outgoing.end(bundle.outputFiles[0].contents); return;
      }
      if (url.pathname === pagePath) {
        outgoing.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store",
          "referrer-policy": "no-referrer" });
        outgoing.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>Synthetic private flow</title><div id="root"></div><script src="/entry.js"></script></html>'); return;
      }
      if (url.pathname !== apiPath) { outgoing.writeHead(404).end(); return; }
      const method = incoming.method;
      const request = new Request(url, { method, headers: incoming.headers,
        ...(method === "POST" ? { body: Readable.toWeb(incoming), duplex: "half" } : {}) });
      const response = await route[method](request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { failures.push("local-host-failure"); outgoing.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.route("**/*", intercepted => {
      if (new URL(intercepted.request().url()).origin === origin) return intercepted.continue();
      external.push("blocked-external-request"); return intercepted.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", () => failures.push("browser-page-error"));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto(`${origin}${pagePath}`);
    if (blockCatalog) {
      // Availability can change between GET and POST. Use the actual server
      // blocker, then verify reload and existing-session GET consume it too.
      await page.getByRole("button", { name: "검토된 1번 시작" }).waitFor();
      blockCatalog();
      await page.getByRole("button", { name: "검토된 1번 시작" }).click();
      const assertBlocked = async () => {
        await page.getByText(blockedMessage, { exact: true }).waitFor();
        assert.equal(await page.getByRole("button", { name: "같은 요청 다시 확인" }).count(), 0);
        assert.equal(await page.getByRole("button", { name: "검토된 1번 시작" }).count(), 0);
        assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
      };
      await assertBlocked();
      await page.reload(); // Includes the old createId/questionId; must not offer retry.
      await assertBlocked();
      await page.goto(`${origin}${pagePath}?sessionId=synthetic-existing-session`);
      await assertBlocked();
      assert.deepEqual(failures, []); assert.deepEqual(external, []);
      assert.ok(consoleErrors.every(message => /Failed to load resource.*(?:503|404)/u.test(message)));
      return { blocked: true, browserErrors: failures.length, externalRequests: external.length };
    }
    await page.getByRole("button", { name: `검토된 ${questionNumber}번 시작` }).evaluate(button => {
      button.click(); button.click();
    });
    await page.getByRole("button", { name: "문제 열고 먼저 풀기" }).click();
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
    if (expectedAttributions) {
      await page.locator('[data-content-attribution="question"]').first().waitFor();
      assert.deepEqual(await page.locator('[data-content-attribution="question"]').allTextContents(), expectedAttributions.question);
      assert.equal(await page.locator('[data-content-attribution="feedback"]').count(), 0);
    }
    await page.getByRole("radio").nth(0).check();
    await page.getByRole("radio").nth(1).check();
    await page.getByRole("radio").nth(0).check();
    clock.advance(60_000); failNextWrite();
    await page.getByRole("button", { name: "응답 저장 후 해설 확인" }).click();
    await page.getByRole("button", { name: "같은 요청 다시 확인" }).waitFor();
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
    await page.getByRole("button", { name: "같은 요청 다시 확인" }).click();
    await page.getByRole("region", { name: "저장된 응답 해설" }).waitFor();
    if (expectedAttributions) assert.deepEqual(await page.locator('[data-content-attribution="feedback"]').allTextContents(), expectedAttributions.feedback);
    const reconnectUrl = page.url();
    const sessionId = new URL(reconnectUrl).searchParams.get("sessionId");
    assert.ok(sessionId);
    const dueAt = await page.locator("time").getAttribute("datetime");
    const retryButton = page.getByRole("button", { name: "예정 시각 이후 새 문제로 복습" });
    assert.equal(await retryButton.isDisabled(), true);
    await retryButton.evaluate(button => button.click());
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 1);
    await page.reload();
    await page.getByRole("region", { name: "저장된 응답 해설" }).waitFor();
    assert.equal(await page.locator("time").getAttribute("datetime"), dueAt);
    clock.set(dueAt);
    await page.reload();
    await page.getByRole("region", { name: "저장된 응답 해설" }).waitFor();
    assert.equal(await retryButton.isEnabled(), true);
    await page.getByRole("button", { name: "예정 시각 이후 새 문제로 복습" }).click();
    await page.getByRole("radio").nth(retryChoice - 1).check();
    clock.advance(60_000);
    await page.getByRole("button", { name: "응답 저장 후 해설 확인" }).click();
    await page.getByText("이 복습 처리 완료 — 학습 성공·숙달 판정과는 별개입니다.").waitFor();
    await page.reload();
    await page.getByText("이 복습 처리 완료 — 학습 성공·숙달 판정과는 별개입니다.").waitFor();
    assert.equal(await page.getByRole("button", { name: "예정 시각 이후 새 문제로 복습" }).count(), 0);
    assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 });
    const screenshot = join(tmpdir(), `inverge-first-stage-private-browser-${subject}-${process.pid}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    assert.deepEqual(failures, []); assert.deepEqual(external, []);
    // One deliberate 503 and a favicon 404 are browser resource diagnostics only.
    assert.ok(consoleErrors.every(message => /Failed to load resource.*(?:503|404)/u.test(message)));
    return { sessionId, dueAt, screenshot, browserErrors: failures.length, externalRequests: external.length };
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
