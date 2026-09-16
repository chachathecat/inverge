import { OwnerTheoryError } from "../../lib/owner-study/owner-pc-theory-budget.mjs";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { chromium } from "playwright";
import { productionHarness, OWNER_ID, SOURCE_ID, NOW } from "./app1-production-persistence-harness.mjs";

// Existing Capture source + real repair UI, API, authority, service, repository,
// saved-item, Review and Today pages. Only auth/model/clock/storage transport are
// synthetic. Never loads the Owner's account, environment or personal database.
export async function verifyApp1SavedRecordBrowser(execute, { screenshotPath, captureInput = false, ownerTheory = null, actionTimeout = 15_000, requestRecovery = null } = {}) {
  const repairText = "임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했습니다.";
  const draft = {
    questionSummary: "합성 문제 구조", coreConcepts: ["정의", "논거", "적용"], requiredIssues: "정의, 논거, 적용",
    answerEvidenceQuote: "임대료 미납 사실과 계약 해지 논거를 제시했다.", userAnswerSummary: "논거에서 적용 연결이 약함", userAnswerStructure: "정의 → 논거", referenceStructure: "정의 → 논거 → 적용 → 결론",
    strengths: ["정의와 핵심 논거가 확인됩니다."], missingIssueCandidates: ["사례 사실과 논거의 연결이 약합니다."],
    weakParagraphPoint: "사례 사실을 논거에 연결하는 한 문장을 직접 적으세요.", weakLogicPoint: "논거에서 사례로 이어지는 연결이 필요합니다.",
    rewriteTarget: "적용 연결 문장", rewriteDraftSuggestion: "직접 작성해야 합니다.", nextAction: "사실과 논거를 직접 연결하세요.",
    caution: "합성 학습 보조 초안", plainExplanation: "한 연결 보강", keyTermExplanations: [], stepByStepExplanation: [], examAnswerHints: [],
  };
  let origin, browser, page, savedId, sourceId = SOURCE_ID, modelCalls = 0;
  const failures = [], external = [], writes = [], reads = [], interrupted = [], saveCommands = [];
  let fault = null;
  const armFault = kind => new Promise(resolve => { fault = { kind, resolve }; });
  const expireWait = async (handled, ms) => { await handled; await page.clock.fastForward(ms + 1); };
  const app = productionHarness(execute, { env: ownerTheory ? {ALPHA_ADMIN_EMAILS:"owner@localhost.test",WCV_C2R_C_T_OWNER_EMAILS:"owner@localhost.test"} : {}, overrides: ({ load, session }) => ({
    ...(ownerTheory ? {"@/lib/owner-study/owner-pc-theory": {
      isOwnerPcTheoryEnabled: () => true, OwnerTheoryError,
      generateOwnerTheoryStructure: async (authority,request) => {
        modelCalls++;
        const corrected=JSON.stringify(request).includes(repairText);
        const result=corrected ? {...draft,strengths:[repairText],missingIssueCandidates:["결론 문장의 범위를 한정할 필요가 있습니다."],weakParagraphPoint:"결론 문장의 범위를 한정해 다시 적으세요.",weakLogicPoint:"결론 범위를 확인하세요."} : draft;
        return ownerTheory.generate(authority,request,result);
      },
    }} : {"@/lib/evaluate/gemini": {
      isGeminiConfigured: () => true,
      GeminiEnvError: class extends Error {}, GeminiStructureParseError: class extends Error {}, isGeminiQuotaExceededError: () => false,
      structureAnswerReviewWithGemini: async ({ answerText }) => {
        modelCalls++;
        return answerText === repairText ? { ...draft, strengths: [repairText], missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."], weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.", weakLogicPoint: "결론 범위를 확인하세요." } : draft;
      },
    },
    }),
    "@/lib/review-os/server": {
      buildReviewOsReturnTo: (url, mode) => `${url}?mode=${mode}`,
      getReviewOsServerContext: async () => ({ session, access: load("lib/review-os/access-result").buildReviewOsAccessResult(await load("lib/review-os/service").reviewOsService.ensureAccess(OWNER_ID, session.email)), profile: null }),
    },
    "next/link": ({ children, href, prefetch, ...props }) => { void prefetch; return React.createElement("a", { ...props, href }, children); },
    "next/navigation": { notFound() { throw new Error("synthetic-page-not-found"); }, redirect(href) { throw new Error(`unexpected-redirect:${href}`); }, useRouter: () => ({}), usePathname: () => "/app/items", useSearchParams: () => new URLSearchParams("mode=second") },
  }) });
  if(ownerTheory) app.session.email="owner@localhost.test";
  const bundle = await build({ stdin: { contents: `import React from "react";import {createRoot} from "react-dom/client";import {App1CaptureRepairLoop} from "./components/owner-study/app1-capture-repair-loop";import {WrongAnswerCaptureForm} from "./components/review-os/capture-form";const capture=location.pathname==="/app/capture";createRoot(document.getElementById("root")).render(capture?React.createElement(WrongAnswerCaptureForm,{userId:${JSON.stringify(OWNER_ID)},mode:"second",textOnly:${Boolean(ownerTheory)},initialSubject:"감정평가이론",ownerCaptureRepairEnabled:true,ownerCaptureRepairSubjects:["appraisal_theory"]}):React.createElement(App1CaptureRepairLoop,{ownerTheoryMode:${Boolean(ownerTheory)},ownerScope:${JSON.stringify(OWNER_ID)},itemId:new URLSearchParams(location.search).get("itemId"),availableSubjects:["appraisal_theory"]}));`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent", plugins: [{name:"synthetic-navigation",setup(b) {
    b.onResolve({filter:/^next\/link$/},()=>({path:"link",namespace:"synthetic"}));
    b.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"synthetic"}));
    b.onLoad({filter:/^navigation$/,namespace:"synthetic"},()=>({contents:'export function useRouter(){return {push:href=>location.assign(href),refresh(){}}}export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}',loader:"js"}));
    b.onLoad({filter:/.*/,namespace:"synthetic"},()=>({contents:'import React from "react";export default function Link({href,children,prefetch,...props}){return React.createElement("a",{...props,href},children)}',loader:"js",resolveDir:process.cwd()}));
  }}] });
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      if (url.pathname === "/entry.js") { res.writeHead(200, {"content-type":"application/javascript"});res.end(bundle.outputFiles[0].contents);return; }
      if (url.pathname === "/app/capture/repair" || url.pathname === "/app/capture") { res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>합성 2차 연결 검증</title><div id="root"></div><script src="/entry.js"></script></html>');return; }
      const chunks=[];for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, {method:req.method,headers:req.headers,...(req.method === "GET" ? {} : {body:Buffer.concat(chunks)})});
      let operation = req.method === "GET" && url.pathname.startsWith("/api/os/items/") ? "read" : null;
      if (url.pathname === "/api/answer-review/structure") operation = (await request.clone().formData()).get("requestPurpose") === "repair_verification" ? "verify" : "analyze";
      if (req.method === "POST" && url.pathname === "/api/os/items") {
        const command = await request.clone().json();
        if (command.commandVersion === "App1VerifiedRepairPersistenceCommandV1") { operation = "save"; saveCommands.push(command); }
      }
      let response;
      if (req.method === "POST") {
        writes.push(url.pathname);
        if (url.pathname === "/api/answer-review/structure") response=await app.load("app/api/answer-review/structure/route").POST(request);
        else if (url.pathname === "/api/inverge/ocr") response=await app.load("app/api/inverge/ocr/route").POST(request);
        else if (url.pathname === "/api/os/items") { response=await app.load("app/api/os/items/route").POST(request);savedId=(await response.clone().json()).item?.id; }
      } else if (url.pathname.startsWith("/api/os/items/")) {
        const itemId=url.pathname.split("/").at(-1);reads.push(itemId);
        response=await app.load("app/api/os/items/[itemId]/route").GET(request,{params:Promise.resolve({itemId})});
      } else {
        let page;
        if (url.pathname.startsWith("/app/items/")) page=await app.load("app/app/items/[itemId]/page.tsx").default({params:Promise.resolve({itemId:url.pathname.split("/").at(-1)}),searchParams:Promise.resolve({mode:"second"})});
        else if (url.pathname === "/app/review") page=await app.load("app/app/review/page.tsx").default({searchParams:Promise.resolve({mode:"second"})});
        else if (url.pathname === "/app") page=await app.load("app/app/page.tsx").default({searchParams:Promise.resolve({mode:"second"})});
        if (page) response=new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><body>${renderToStaticMarkup(page)}</body></html>`,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
      }
      if (!response) {res.writeHead(404).end();return;}
      if(response.status>=400) failures.push(`${req.method} ${url.pathname}: ${response.status} ${await response.clone().text()}`);
      if (fault && (fault.kind === operation || (["load", "queue"].includes(fault.kind) && operation === "read"))) {
        const active = fault; fault = null; interrupted.push(active.kind);
        if (requestRecovery === "body") { res.writeHead(200,{"content-type":"application/json"});res.write('{"ok":'); }
        active.resolve();return; // Backend already completed; intentionally lose its response.
      }
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    } catch(error) { failures.push(error.stack);res.writeHead(500).end("synthetic-route-failed"); }
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try {
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.route("**/*",route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
    page=await context.newPage();page.setDefaultTimeout(actionTimeout);page.setDefaultNavigationTimeout(actionTimeout);page.on("pageerror",e=>failures.push(e.stack));
    await page.addInitScript(() => { window.process = {env:{NODE_ENV:"production"}}; });
    if (requestRecovery) await page.clock.install({time:new Date(NOW)});
    else await page.clock.setFixedTime(new Date(NOW));
    const loadFault = requestRecovery ? armFault("load") : null;
    if (captureInput) {
      await page.goto(`${origin}/app/capture?mode=second`);
      if (!ownerTheory) {
        await page.getByRole("button",{name:"사진·PDF·텍스트로 시작",exact:true}).click();
        await page.getByRole("button",{name:"텍스트 붙여넣기",exact:true}).click();
      } else { await page.locator("[data-owner-theory-text-only]").waitFor(); assert.equal(modelCalls,0); }
      await page.getByLabel("오늘 공부한 내용 또는 내 답안",{exact:true}).fill("임대료 미납 사례에서 계약 해지 논거를 설명하시오.");
      await page.getByRole("button",{name:"입력 내용 확인하기",exact:true}).click();
      await page.getByRole("button",{name:"쟁점 회상부터 진행",exact:true}).click();
      for (const [step, text] of [[1,"임대료 미납 사실과 계약 해지 논거의 연결"],[2,"정의\n논거\n사례 적용 및 결론"],[3,"임대료 미납 사실과 계약 해지 논거를 제시했다. 적용 연결이 부족했다."]]) {
        await page.locator(`[data-s232e-second-write-panel="${step}"] textarea`).fill(text);
        await page.locator(`[data-s232e-second-write-primary-action="${step}"]`).click();
      }
      await page.locator('[data-s232e-second-write-secondary-action="defer-reference"]').click();
      if (ownerTheory) {
        await page.locator("[data-owner-analysis-preparation]").waitFor();
        assert.equal(await page.locator("[data-owner-reference-status]").getAttribute("data-owner-reference-status"),"deferred");
        assert.equal(modelCalls,0);
        assert.equal(writes.filter(p=>p==="/api/os/items").length,0);
        await page.locator("[data-owner-prepare-analysis]").click();
      } else {
      await page.locator('[data-s232e-second-write-panel="5"] textarea').fill("사례 사실과 논거의 적용 연결이 부족합니다.");
      await page.locator('[data-s232e-second-write-primary-action="5"]').click();
      await page.getByTestId("second-write-final-textarea").fill("임대료 미납 사실과 계약 해지 논거를 제시했다. 적용 연결이 부족했다.");
      await page.locator('[data-s232e-second-write-primary-action="6"]').click();
      await page.getByRole("combobox",{name:"2차 과목",exact:true}).selectOption("감정평가이론");
      assert.equal(writes.filter(p=>p==="/api/os/items").length,0,"final confirmation must not implicitly submit");
      await page.getByRole("button",{name:/^저장하고 .*에 반영$/}).click();
      }
      await page.waitForURL("**/app/capture/repair?itemId=*");
      sourceId=new URL(page.url()).searchParams.get("itemId");
      assert.ok(sourceId);assert.notEqual(sourceId,SOURCE_ID);
    } else await page.goto(`${origin}/app/capture/repair?itemId=${sourceId}`);
    if (requestRecovery) {
      await expireWait(loadFault,15_000);
      await page.locator('[data-app1-error]').waitFor();assert.equal(modelCalls,0);
      await page.reload();await page.getByRole("button",{name:ownerTheory ? "선택한 문제·답안을 Gemini로 보내 분석" : "이 내용으로 분석",exact:true}).waitFor();
    }
    if(ownerTheory) {
      assert.equal(modelCalls,0,"page loads and local Capture do not call Gemini");
      const body=new FormData();body.set("requestPurpose","app1_initial_analysis");body.set("sourceItemId",sourceId);body.set("examMode","second");body.set("subject","감정평가이론");
      const denied=await app.load("app/api/answer-review/structure/route").POST(new Request(`${origin}/api/answer-review/structure`,{method:"POST",body}));
      assert.equal(denied.status,403,"missing explicit selected-text consent fails before provider");
      assert.equal(modelCalls,0);
    }
    const analysisButton=page.getByRole("button",{name:ownerTheory ? "선택한 문제·답안을 Gemini로 보내 분석" : "이 내용으로 분석",exact:true});
    if (requestRecovery) {
      const stalled=armFault("analyze");await analysisButton.click();await expireWait(stalled,90_000);
      await page.locator('[data-app1-error]').waitFor();assert.equal(writes.filter(p=>p==="/api/answer-review/structure").length,1,"timeout never automatically repeats analysis");
      assert.equal(await page.getByRole("button",{name:"직접 복구하기",exact:true}).count(),0);
    }
    await analysisButton.click();
    await page.getByRole("button",{name:"직접 복구하기",exact:true}).click();
    await page.getByLabel("내 복구 입력").fill(repairText);
    if (requestRecovery) {
      const before=writes.filter(p=>p==="/api/answer-review/structure").length,stalled=armFault("verify");await page.getByRole("button",{name:"복구 확인",exact:true}).click();await expireWait(stalled,90_000);
      await page.locator('[data-app1-error]').waitFor();assert.equal(writes.filter(p=>p==="/api/answer-review/structure").length,before+1,"timeout never automatically repeats verification");
      assert.equal(await page.getByRole("button",{name:"복구 결과 저장하고 다음 복습 만들기",exact:true}).count(),0);
      await page.getByRole("button",{name:"직접 복구 다시 시도",exact:true}).click();assert.equal(await page.getByLabel("내 복구 입력").inputValue(),repairText);
    }
    await page.getByRole("button",{name:"복구 확인",exact:true}).click();
    const saveButton=page.getByRole("button",{name:"복구 결과 저장하고 다음 복습 만들기",exact:true});
    if (requestRecovery) {
      await saveButton.waitFor();
      const before=modelCalls,stalled=armFault("save");await saveButton.click();await expireWait(stalled,30_000);
      await page.locator('[data-app1-error]').waitFor();assert.equal(saveCommands.length,1,"no automatic save replay");
      assert.equal(modelCalls,before);assert.equal(await page.locator('[data-app1-queue-receipt="valid"]').count(),0);
      const queueFault=armFault("queue");await saveButton.click();await expireWait(queueFault,15_000);
      await page.locator('[data-app1-saved-without-queue]').waitFor();assert.equal(saveCommands.length,2);
      assert.deepEqual(saveCommands[1],saveCommands[0],"unknown committed save reuses the exact existing idempotent command");
      assert.deepEqual(interrupted,["load","analyze","verify","save","queue"]);
    } else {await saveButton.click();await page.locator('[data-app1-queue-receipt="valid"]').waitFor();}
    assert.ok(savedId);assert.notEqual(savedId,sourceId);
    await page.getByRole("link",{name:requestRecovery ? "저장 기록 확인" : "저장한 교정 기록 확인",exact:true}).click();
    assert.equal(page.url(),`${origin}/app/items/${savedId}?mode=second`);
    const savedUrl=page.url();await page.reload();assert.equal(page.url(),savedUrl);
    assert.match(await page.locator("body").innerText(),/감정평가이론/);
    assert.match(await page.locator("body").innerText(),new RegExp(repairText));
    if(screenshotPath) await page.screenshot({path:screenshotPath,fullPage:true});
    const service=app.load("lib/review-os/service").reviewOsService;
    const detail=await service.getWrongAnswerDetail(OWNER_ID,app.session.email,savedId);
    assert.equal(detail.reviewQueue.length,1);const queue=detail.reviewQueue[0];
    assert.equal(queue.dueAt,"2026-09-07T00:00:00.000Z");
    const before=await app.repository.listReviewQueue(OWNER_ID,100);
    await page.goto(`${origin}/app/review?mode=second`);
    assert.match(await page.locator("body").innerText(),/감정평가이론/);
    await page.goto(`${origin}/app?mode=second`);
    assert.match(await page.locator("body").innerText(),/오늘 할 일/);
    assert.equal((await service.getTodayFocus(OWNER_ID,app.session.email,"second")).sourceItemId,savedId);
    assert.ok(await page.locator(`a[href*="${savedId}"]`).count(), "Today links the exact saved correction");
    assert.deepEqual(await app.repository.listReviewQueue(OWNER_ID,100),before);
    assert.equal((await app.repository.listWrongAnswerItems(OWNER_ID,100)).length,captureInput?3:2);
    assert.equal(writes.filter(p=>p==="/api/os/items").length,(captureInput?2:1)+(requestRecovery?1:0));
    assert.ok(modelCalls>=2);assert.ok(reads.includes(sourceId));assert.ok(reads.includes(savedId));
    assert.deepEqual(failures,[]);assert.deepEqual(external,[]);
    return {savedId,sourceId,modelCalls};
  } catch(error) { throw new Error(`${error.message}\n${failures.join("\n")}\n${await page?.locator("body").innerText().catch(()=>"")}`,{cause:error}); }
  finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
