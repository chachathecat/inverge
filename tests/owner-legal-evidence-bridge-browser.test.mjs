import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "playwright";
import { bridgeHarness, syntheticBody } from "./fixtures/owner-legal-evidence-bridge-harness.mjs";

test("isolated actual React UI: safe initial render, held selection, search, exact reopen, errors and expired access",{timeout:90_000},async()=>{
  const client='import React from "react";import {createRoot} from "react-dom/client";import {OwnerLegalEvidence} from "./components/review-os/owner-legal-evidence";createRoot(document.getElementById("root")).render(React.createElement(OwnerLegalEvidence));';
  const options={bundle:true,write:false,jsx:"automatic",logLevel:"silent"};
  const bundle=await build({...options,stdin:{contents:client,resolveDir:process.cwd(),loader:"tsx"},platform:"browser",format:"iife",define:{"process.env.NODE_ENV":'"production"'}});
  const ssr=await build({...options,stdin:{contents:'import React from "react";import {renderToString} from "react-dom/server";import {OwnerLegalEvidence} from "./components/review-os/owner-legal-evidence";export const html=renderToString(React.createElement(OwnerLegalEvidence));',resolveDir:process.cwd(),loader:"tsx"},platform:"node",format:"cjs",packages:"external"});
  const mod={exports:{}};new Function("require","module","exports",ssr.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  assert.ok(mod.exports.html.includes("보유 법령 근거 보기"));assert.ok(!mod.exports.html.includes(syntheticBody));
  assert.ok(!bundle.outputFiles[0].text.includes(syntheticBody));assert.ok(!bundle.outputFiles[0].text.includes("createStatuteSnapshotReader"));
  const h=bridgeHarness(),errors=[],external=[];let origin,browser,lastRequest,deny=false;
  const server=createServer(async(req,res)=>{
    try {
      if(req.url==="/entry.js"){res.writeHead(200,{"content-type":"application/javascript"});res.end(bundle.outputFiles[0].contents);return;}
      if(req.url==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>Synthetic bridge</title><div id="root"></div><script src="/entry.js"></script></html>');return;}
      if(req.url!=="/api/review-os/first-stage/legal-evidence"){res.writeHead(404).end();return;}
      const chunks=[];let count=0;for await(const chunk of req){count+=chunk.length;if(count>16384)throw Error("synthetic-input-limit");chunks.push(chunk);}
      const body=count?Buffer.concat(chunks).toString("utf8"):undefined;lastRequest=body&&JSON.parse(body);
      if(deny)h.session.isAuthenticated=false;
      // Only this test host substitutes the synthetic authenticated session and canonical local Host.
      const result=await h.send(body);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(JSON.stringify(result.body));
    }catch {errors.push("test-host-failure");res.writeHead(500).end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin="http://127.0.0.1:"+server.address().port;
  try {
    browser=await chromium.launch({headless:true});const context=await browser.newContext();
    await context.route("**/*",route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push("blocked");return route.abort();});
    const page=await context.newPage();page.on("pageerror",()=>errors.push("pageerror"));
    await page.goto(origin);await page.getByText("보유 자료에서 확인했습니다.",{exact:true}).waitFor();
    assert.equal(await page.getByRole("region",{name:"보유 조문 조회 결과"}).count(),0);
    await page.getByLabel("보유 법령·버전").selectOption({label:"합성 법령 · 시행 2026-01-01 · MST 1"});
    await page.getByLabel("조문 번호",{exact:true}).fill("2");await page.getByRole("button",{name:"보유 버전에서 조회"}).click();
    await page.getByText(syntheticBody,{exact:true}).waitFor();const first=lastRequest;
    assert.equal(first.input.articleNumber,"2");assert.equal(new URL(page.url()).search,"");assert.equal(new URL(page.url()).hash,"");
    await page.getByRole("button",{name:"같은 원문 다시 확인"}).click();
    await page.getByText("동일 reference의 보유 원문·본문 무결성을 다시 확인했습니다.",{exact:true}).waitFor();
    assert.equal(lastRequest.action,"reopen");assert.equal(lastRequest.reference.articleKey,"main:2");
    await page.getByLabel("조회 방식").selectOption("queryText");await page.getByLabel("검색어",{exact:true}).fill("합성");
    await page.getByRole("button",{name:"보유 버전에서 조회"}).click();await page.getByText(syntheticBody,{exact:true}).waitFor();
    fs.mkdirSync("node_modules/.cache",{recursive:true});
    await page.screenshot({path:"node_modules/.cache/bridge-synthetic-ui.png",fullPage:true});
    h.fail("INTEGRITY_ERROR");await page.getByRole("button",{name:"같은 원문 다시 확인"}).click();
    await page.getByText("참조 또는 파일 무결성을 확인하지 못했습니다. 다른 버전으로 대체하지 않습니다.",{exact:true}).waitFor();
    assert.equal(await page.getByText(syntheticBody,{exact:true}).count(),0);
    h.fail(null);await page.getByLabel("검색어",{exact:true}).fill("없는 검색어");await page.getByRole("button",{name:"보유 버전에서 조회"}).click();
    await page.getByText("이 보유 버전에 일치하는 결과가 없습니다.",{exact:true}).waitFor();
    deny=true;await page.reload();await page.getByText("이 로컬 화면에 접근할 수 없습니다.",{exact:true}).waitFor();
    assert.equal(await page.getByLabel("보유 법령·버전").getByRole("option").count(),1);assert.equal(await page.getByText(syntheticBody,{exact:true}).count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  }finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
