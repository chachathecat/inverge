import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

/** Real component + real compiled route entry + supplied isolated repository.
 * This is a localhost test host, NOT a Next deployment or remote auth acceptance.
 */
export async function verifyPrivateBrowser({ route, clock, failNextWrite }) {
  const bundle = await build({ stdin: {
    contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import {FirstStagePrivatePractice} from "./components/review-os/first-stage-private-practice"; createRoot(document.getElementById("root")).render(React.createElement(FirstStagePrivatePractice));',
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
      if (url.pathname === "/app/first-stage/practice") {
        outgoing.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store",
          "referrer-policy": "no-referrer" });
        outgoing.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>Synthetic private flow</title><div id="root"></div><script src="/entry.js"></script></html>'); return;
      }
      if (url.pathname !== "/api/review-os/first-stage/sessions") { outgoing.writeHead(404).end(); return; }
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
    await page.goto(`${origin}/app/first-stage/practice`);
    await page.getByRole("button", { name: "검토된 1번 시작" }).evaluate(button => {
      button.click(); button.click();
    });
    await page.getByRole("button", { name: "문제 열고 먼저 풀기" }).click();
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
    await page.getByRole("radio").nth(0).check();
    await page.getByRole("radio").nth(1).check();
    await page.getByRole("radio").nth(0).check();
    clock.advance(60_000); failNextWrite();
    await page.getByRole("button", { name: "응답 저장 후 해설 확인" }).click();
    await page.getByRole("button", { name: "같은 요청 다시 확인" }).waitFor();
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
    await page.getByRole("button", { name: "같은 요청 다시 확인" }).click();
    await page.getByRole("region", { name: "저장된 응답 해설" }).waitFor();
    const reconnectUrl = page.url();
    const sessionId = new URL(reconnectUrl).searchParams.get("sessionId");
    assert.ok(sessionId);
    const dueAt = await page.locator("time").getAttribute("datetime");
    await page.reload();
    await page.getByRole("region", { name: "저장된 응답 해설" }).waitFor();
    assert.equal(await page.locator("time").getAttribute("datetime"), dueAt);
    clock.set(dueAt);
    await page.getByRole("button", { name: "예정 시각 이후 새 문제로 복습" }).click();
    await page.getByRole("radio").nth(1).check();
    clock.advance(60_000);
    await page.getByRole("button", { name: "응답 저장 후 해설 확인" }).click();
    await page.getByText("이 복습 처리 완료 — 학습 성공·숙달 판정과는 별개입니다.").waitFor();
    await page.reload();
    await page.getByText("이 복습 처리 완료 — 학습 성공·숙달 판정과는 별개입니다.").waitFor();
    assert.equal(await page.getByRole("button", { name: "예정 시각 이후 새 문제로 복습" }).count(), 0);
    assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 });
    const screenshot = join(tmpdir(), `inverge-first-stage-private-browser-${process.pid}.png`);
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
