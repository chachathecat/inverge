import assert from "node:assert/strict";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium } from "playwright";

/** Real React workbench/practice + real HTTP application. Auth/catalog/clock are
 * explicitly synthetic test ports, never genuine local-login evidence. */
export async function verifyOwnerLocalTodayBrowser(h,{curriculum=false}={}) {
  const root="/app/first-stage/economics-trial",api="/api/review-os/first-stage/economics-trial/sessions";
  const bundle=await build({stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import {OwnerLocalTrialWorkbench} from "./components/review-os/owner-local-trial-workbench";createRoot(document.getElementById("root")).render(React.createElement(OwnerLocalTrialWorkbench));',resolveDir:process.cwd(),loader:"tsx"},
    bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent"});
  let origin,loseStart=true,deny=false,browser;const failures=[],external=[],statuses=[];
  const server=createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,origin);
      if(url.pathname==="/entry.js"){res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-store"});res.end(bundle.outputFiles[0].contents);return;}
      if(url.pathname===root){res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>Synthetic Today</title><div id="root"></div><script src="/entry.js"></script></html>');return;}
      if(url.pathname!==api){res.writeHead(404).end();return;}
      if(deny){res.writeHead(404,{"content-type":"application/json","cache-control":"no-store"});res.end('{"ok":false,"error":"not_found"}');return;}
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw new Error("test-input-overflow");chunks.push(chunk);}
      const body=bytes?JSON.parse(Buffer.concat(chunks).toString("utf8")):undefined;
      const result=await h.send(body,url.search);statuses.push(result.status);
      if(body?.action==="start_planned" && loseStart){loseStart=false;assert.equal(result.status,200);res.writeHead(503,{"content-type":"application/json","cache-control":"no-store"});res.end('{"ok":false,"error":"temporarily_unavailable"}');return;}
      res.writeHead(result.status,Object.fromEntries(result.headers));res.end(JSON.stringify(result.body));
    }catch {failures.push("synthetic-host-failure");res.writeHead(500).end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try {
    browser=await chromium.launch({headless:true});const context=await browser.newContext();
    await context.route("**/*",route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push("external-blocked");return route.abort();});
    const page=await context.newPage();page.on("pageerror",()=>failures.push("browser-error"));
    await page.goto(origin+root);await page.getByRole("button",{name:"남은 시간 저장·재계획"}).waitFor();
    assert.equal(await page.getByRole("radio").count(),0);assert.equal(await page.getByRole("region",{name:"저장된 응답 해설"}).count(),0);
    await page.getByLabel("구간 1 시작",{exact:true}).fill("18:00");await page.getByLabel("구간 1 종료",{exact:true}).fill("23:59");
    await page.getByLabel("남은 공부시간",{exact:true}).fill("150");await page.getByRole("button",{name:"남은 시간 저장·재계획"}).click();
    await page.getByRole("button",{name:"새 문제 · 경제학 46번",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"새 문제 · 경제학 46번",exact:true}).isDisabled(),true);
    await page.getByText("아직 이 블록의 시작 시간이 아닙니다.",{exact:false}).waitFor();
    await page.getByText("Full-Day 시간표와 보류 항목",{exact:true}).click();
    for(const button of await page.getByRole("button",{name:"이 블록 시작",exact:true}).all())assert.equal(await button.isDisabled(),true);
    // An explicit availability edit, not a client clock/authority override.
    await page.getByText("남은 시간·생활 조건 설정",{exact:true}).click();
    await page.getByLabel("구간 1 시작",{exact:true}).fill("09:00");
    await page.getByRole("button",{name:"남은 시간 저장·재계획"}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="새 문제 · 경제학 46번"&&!button.disabled));
    if(curriculum) {
      for(const [index,[number,title]] of [[58,"가격상한과 잉여 이전"],[62,"화폐수요와 유통속도"],[65,"별도 재정 변화의 승수"]].entries()) {
        const topic=page.getByRole("listitem").filter({has:page.getByText(`${title} · ${number}번`,{exact:true})});
        await topic.getByRole("button",{name:"이 미학습 주제로 재계획",exact:true}).click();
        await page.getByRole("button",{name:`새 문제 · 경제학 ${number}번`,exact:true}).click();
        if(index===0) {await page.getByRole("button",{name:"같은 계획 요청 다시 확인"}).waitFor();await page.reload();
          await page.getByRole("button",{name:"같은 계획 요청 다시 확인"}).click();}
        await page.getByRole("radio").first().waitFor();
        assert.equal(await page.getByRole("region",{name:"저장 후 공개된 개념 도움"}).count(),0);
        assert.equal(await page.getByRole("region",{name:"저장된 응답 해설"}).count(),0);
        await page.getByRole("radio").nth(1).check();
        await page.getByText("막혔다면 개념·선행 도움",{exact:true}).click();
        await page.getByRole("button",{name:"선행 계산 도움 보기",exact:true}).click();
        await page.getByRole("region",{name:"저장 후 공개된 개념 도움"}).waitFor();
        assert.equal(await page.getByRole("radio").nth(1).isChecked(),true);
        assert.doesNotMatch(await page.locator("body").innerText(),/SYNTHETIC_SECRET_(SOLUTION|CONCEPT)_/);
        h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
        await page.getByRole("button",{name:"응답 저장 후 해설 확인"}).click();
        await page.getByRole("region",{name:"저장된 응답 해설"}).waitFor();
        const saved=page.url();await page.reload();await page.getByRole("region",{name:"저장된 응답 해설"}).waitFor();assert.equal(page.url(),saved);
        await page.getByRole("link",{name:"Today로 돌아가 저장 결과·계획 확인"}).click();
        await page.getByText(`오늘 남은 ${150-(index+1)*15}분`,{exact:false}).waitFor();
        await page.reload();await page.getByText(`오늘 남은 ${150-(index+1)*15}분`,{exact:false}).waitFor();
      }
      assert.deepEqual(failures,[]);assert.deepEqual(external,[]);assert.ok(statuses.every(status=>status===200));
      return {browserErrors:0,externalRequests:0,threeTeachingGroups:true,selectedAidOnly:true,draftAnswerPreserved:true,persistedResume:true};
    }
    await page.getByRole("button",{name:"새 문제 · 경제학 46번",exact:true}).evaluate(button=>{button.click();button.click();});
    await page.getByRole("button",{name:"같은 계획 요청 다시 확인"}).waitFor();const pending=page.url();assert.ok(new URL(pending).searchParams.has("planId"));
    await page.reload();await page.getByRole("button",{name:"같은 계획 요청 다시 확인"}).waitFor();assert.equal(page.url(),pending);
    await page.getByRole("button",{name:"같은 계획 요청 다시 확인"}).click();await page.getByRole("radio").first().waitFor();
    assert.equal(await page.getByRole("region",{name:"저장된 응답 해설"}).count(),0);
    await page.getByRole("radio").first().check();h.setClock("2026-09-08T00:01:00.000Z");
    await page.getByRole("button",{name:"응답 저장 후 해설 확인"}).click();
    await page.getByRole("region",{name:"저장된 응답 해설"}).waitFor();
    const saved=page.url();await page.reload();await page.getByRole("region",{name:"저장된 응답 해설"}).waitFor();assert.equal(page.url(),saved);
    await page.getByRole("link",{name:"Today로 돌아가 저장 결과·계획 확인"}).click();
    await page.getByText("오늘 남은 135분",{exact:false}).waitFor();
    await page.getByRole("button",{name:"새 문제 · 경제학 49번",exact:true}).waitFor();
    assert.equal(await page.getByRole("link",{name:/경제학 46번 · 응답 저장 1회/}).count(),1);
    await page.reload();await page.getByText("오늘 남은 135분",{exact:false}).waitFor();
    await page.getByText("남은 시간·생활 조건 설정",{exact:true}).click();assert.equal(await page.getByLabel("남은 공부시간",{exact:true}).inputValue(),"135");
    await page.getByLabel("생활 조건",{exact:true}).selectOption("full_time_employed");
    const changed=page.waitForResponse(response=>response.url().includes("?view=today")&&response.request().method()==="POST");
    await page.getByRole("button",{name:"남은 시간 저장·재계획"}).click();assert.equal((await changed).status(),200);
    await page.getByText("오늘 남은 135분",{exact:false}).waitFor();
    assert.equal(await page.getByLabel("남은 공부시간",{exact:true}).inputValue(),"135");
    await page.getByLabel("남은 공부시간",{exact:true}).fill("30");await page.getByRole("button",{name:"남은 시간 저장·재계획"}).click();
    await page.getByText("오늘 남은 30분",{exact:false}).waitFor();
    deny=true;await page.reload();await page.getByRole("link",{name:"기존 로컬 계정으로 다시 로그인"}).waitFor();
    assert.equal(await page.getByRole("button",{name:/새 문제 ·/}).count(),0);
    assert.deepEqual(failures,[]);assert.deepEqual(external,[]);assert.ok(statuses.every(status=>status===200));
    return {browserErrors:0,externalRequests:0,persistedResume:true,remainingReplan:true,expiredLoginDenied:true,futureBlocksDisabled:true};
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
