import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { build } from "esbuild";
import { chromium } from "playwright";
import { harness } from "./first-stage-private-session-harness.mjs";
import { privateRoute } from "./first-stage-private-route-harness.mjs";

export async function verifyPrivateSubjectNavigation() {
  const bundle = await build({ stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client";
    import {FirstStagePrivatePractice} from "./components/review-os/first-stage-private-practice";
    function TestHost(){const [subject,setSubject]=React.useState("economics_principles");return React.createElement(React.Fragment,null,
      React.createElement("button",{onClick(){window.history.replaceState(null,"","/app/first-stage/civil-law");setSubject("civil_law");}},"Switch subject"),
      React.createElement(FirstStagePrivatePractice,{subject}));}createRoot(document.getElementById("root")).render(React.createElement(TestHost));`,
    resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
  const h = harness(), routes = {
    "/api/review-os/first-stage/sessions": privateRoute(h),
    "/api/review-os/first-stage/civil-law/sessions": privateRoute(h, { subject: "civil_law" }),
  };
  let origin = "", browser, release, signalSaved;
  const held = new Promise(resolve => { release = resolve; });
  const saved = new Promise(resolve => { signalSaved = resolve; });
  const serverErrors = [], external = [];
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, origin);
      if (url.pathname === "/entry.js") { outgoing.writeHead(200, { "content-type": "application/javascript" }); outgoing.end(bundle.outputFiles[0].contents); return; }
      if (url.pathname === "/app/first-stage/practice") {
        outgoing.writeHead(200, { "content-type": "text/html" }); outgoing.end('<!doctype html><html><div id="root"></div><script src="/entry.js"></script></html>'); return;
      }
      const route = routes[url.pathname];
      if (!route) { outgoing.writeHead(404).end(); return; }
      const request = new Request(url, { method: incoming.method, headers: incoming.headers,
        ...(incoming.method === "POST" ? { body: Readable.toWeb(incoming), duplex: "half" } : {}) });
      const response = await route[incoming.method](request);
      if (incoming.method === "POST") { signalSaved(); await held; }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { serverErrors.push("test-host-failure"); outgoing.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.route("**/*", intercepted => {
      if (new URL(intercepted.request().url()).origin === origin) return intercepted.continue();
      external.push("blocked-external"); return intercepted.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", () => serverErrors.push("browser-error"));
    await page.goto(`${origin}/app/first-stage/practice`);
    await page.getByRole("button", { name: "검토된 1번 시작" }).click(); await saved;
    assert.equal(h.rows.size, 1); // The original durable write must survive navigation.
    await page.getByRole("button", { name: "Switch subject" }).click();
    await page.getByRole("heading", { name: "민법 비공개 연습" }).waitFor();
    await page.getByRole("button", { name: "검토된 1번 시작" }).waitFor();
    const response = page.waitForResponse(item => item.request().method() === "POST"); release(); await response;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(new URL(page.url()).pathname, "/app/first-stage/civil-law");
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.getByRole("region", { name: "저장된 응답 해설" }).count(), 0);
    assert.equal(h.rows.size, 1); assert.deepEqual(serverErrors, []); assert.deepEqual(external, []);
  } finally {
    release(); await browser?.close(); await new Promise(resolve => server.close(resolve)); h.rows.clear();
  }
}
