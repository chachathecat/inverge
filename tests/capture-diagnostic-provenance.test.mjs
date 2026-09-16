import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import React from "react";
import { renderToString } from "react-dom/server";
import { build } from "esbuild";
import { chromium } from "playwright";
import { productionHarness, memoryTransport, OWNER_ID, SOURCE_ID, seedRows } from "./fixtures/app1-production-persistence-harness.mjs";
import { secondWriteReferenceStatus, hasSecondWriteReferenceStep } from "../lib/review-os/second-write-reference-step.ts";

const provenance = { version:"capture_review_provenance.v1", diagnosis:"not_analyzed", referenceComparison:"deferred", learningMaterial:"ai_example_functional_test" };
const draftKey = `inverge:review-os:${OWNER_ID}:capture-draft:second`;
const draft = { subjectLabel:"감정평가이론", sourceType:"text", rawQuestionText:"합성 기능시험: 시장 노출 기간과 당사자의 개별 사정을 구분하여 시장가치 판단의 조건을 설명하시오.",
  userAnswer:"합성 AI 예시입니다. 시장가치는 통상적인 시장 노출과 거래 당사자를 전제로 합니다. 개별 당사자의 급박한 매각 사정은 시장 일반의 조건과 구분하여야 합니다.",
  issueRecall:"시장 노출 기간과 개별 사정을 구분", outlineDraft:"I. 정의 II. 시장 조건 III. 사례 적용 IV. 결론",
  correctAnswer:"", biggestGap:"정의만 있고 사례 적용 부족", productionBeforeComparison:true, referenceAnswerAddedAfterProduction:true,
  learningMaterial:"ai_example_functional_test", ocrConfirmedByLearner:true };

test("deferred reference is a completed choice, never completed comparison", () => {
  assert.equal(secondWriteReferenceStatus({correctAnswer:"",referenceAnswerAddedAfterProduction:true}),"deferred");
  assert.equal(secondWriteReferenceStatus({correctAnswer:"참고 내용",referenceAnswerAddedAfterProduction:false}),"not_started");
  assert.equal(secondWriteReferenceStatus({correctAnswer:"참고 내용",referenceAnswerAddedAfterProduction:true,referenceComparisonStatus:"deferred"}),"deferred");
  assert.equal(secondWriteReferenceStatus({correctAnswer:"참고 내용",referenceAnswerAddedAfterProduction:true,referenceComparisonStatus:"compared"}),"compared");
  assert.equal(hasSecondWriteReferenceStep({correctAnswer:"",referenceAnswerAddedAfterProduction:false,referenceComparisonStatus:"deferred"}),true);
});

test("both real Owner entry pages hydrate an existing Theory draft and preserve it through explicit source-only storage", {timeout:120000}, async () => {
  const store=memoryTransport(); Object.assign(store.tables,{study_profiles:[],action_seeds:[],study_logs:[]});
  const app=productionHarness(store.execute,{env:{ALPHA_ADMIN_EMAILS:"owner@localhost.test",WCV_C2R_C_T_OWNER_EMAILS:"owner@localhost.test"},overrides:({load,session})=>({
    "@/lib/owner-study/owner-pc-theory":{isOwnerPcTheoryEnabled:()=>true},
    "@/lib/review-os/server":{buildReviewOsReturnTo:x=>x,getReviewOsServerContext:async()=>({session,access:load("lib/review-os/access-result").buildReviewOsAccessResult(await load("lib/review-os/service").reviewOsService.ensureAccess(OWNER_ID,session.email)),profile:null})},
    "next/navigation":{useRouter:()=>({}),redirect(){throw new Error("unexpected redirect")},notFound(){throw new Error("unexpected notFound")}},
    "next/link":({children,href,...props})=>React.createElement("a",{...props,href},children),
  })});
  const findForm=node=>{if(!React.isValidElement(node))return null;if(node.type?.name==="WrongAnswerCaptureForm")return node;for(const child of React.Children.toArray(node.props.children)){const found=findForm(child);if(found)return found;}return null;};
  const entries=new Map();
  for(const route of ["write","capture"]){
    const tree=await app.load(`app/app/${route}/page.tsx`).default({searchParams:Promise.resolve({mode:"second"})});
    const form=findForm(tree); assert.ok(form); assert.equal(form.props.textOnly,true); assert.equal(form.props.ownerCaptureRepairEnabled,true); assert.deepEqual(form.props.ownerCaptureRepairSubjects,["appraisal_theory"]);
    entries.set(`/app/${route}`,{props:form.props,html:renderToString(form)});
  }
  const bundle=await build({stdin:{contents:`import React from 'react';import {hydrateRoot,createRoot} from 'react-dom/client';import {WrongAnswerCaptureForm} from './components/review-os/capture-form';import {App1CaptureRepairLoop} from './components/owner-study/app1-capture-repair-loop';const root=document.getElementById('root');if(window.captureProps)hydrateRoot(root,React.createElement(WrongAnswerCaptureForm,window.captureProps),{onRecoverableError:e=>{window.hydrationErrors.push(e.message)}});else createRoot(root).render(React.createElement(App1CaptureRepairLoop,{ownerTheoryMode:true,ownerScope:${JSON.stringify(OWNER_ID)},itemId:new URLSearchParams(location.search).get('itemId'),availableSubjects:['appraisal_theory']}));`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent",plugins:[{name:"navigation",setup(b){
    b.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"fake"}));b.onResolve({filter:/^next\/link$/},()=>({path:"link",namespace:"fake"}));
    b.onLoad({filter:/navigation/,namespace:"fake"},()=>({contents:'export function useRouter(){return {push:href=>location.assign(href),refresh(){}}}export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}',loader:"js"}));
    b.onLoad({filter:/link/,namespace:"fake"},()=>({contents:'import React from "react";export default function Link({href,children,prefetch,...props}){return React.createElement("a",{...props,href},children)}',loader:"js",resolveDir:process.cwd()}));
  }}]});
  let origin,browser;const requests=[],errors=[];
  const server=createServer(async(req,res)=>{try{
    const url=new URL(req.url,origin);
    if(url.pathname==="/entry.js"){res.writeHead(200,{"content-type":"application/javascript"});res.end(bundle.outputFiles[0].contents);return;}
    if(entries.has(url.pathname)||url.pathname==="/app/capture/repair"){
      const entry=entries.get(url.pathname);res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(`<!doctype html><html lang="ko"><body><div id="root">${entry?.html??""}</div><script>window.hydrationErrors=[];window.captureProps=${JSON.stringify(entry?.props??null)};</script><script src="/entry.js"></script></body></html>`);return;
    }
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==="GET"?{}:{body:Buffer.concat(chunks)})});
    requests.push(`${req.method} ${url.pathname}`);let response;
    if(req.method==="POST"&&url.pathname==="/api/os/items")response=await app.load("app/api/os/items/route").POST(request);
    else if(req.method==="GET"&&url.pathname.startsWith("/api/os/items/"))response=await app.load("app/api/os/items/[itemId]/route").GET(request,{params:Promise.resolve({itemId:url.pathname.split("/").at(-1)})});
    else throw new Error(`Unexpected request ${req.method} ${url.pathname}`);
    if(!response.ok)errors.push(await response.clone().text());res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){errors.push(error.stack);res.writeHead(500).end("synthetic test failure");}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try{
    browser=await chromium.launch({headless:true});const context=await browser.newContext();
    await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await context.addInitScript(({key,raw})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);},{key:draftKey,raw:JSON.stringify(draft)});
    const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
    for(const route of ["write","capture"]){
      await page.goto(`${origin}/app/${route}?mode=second`);
      await page.locator("[data-owner-analysis-preparation]").waitFor();
      assert.deepEqual(await page.evaluate(()=>window.hydrationErrors),[]);
      assert.equal(await page.getByLabel("분석할 문제",{exact:true}).inputValue(),draft.rawQuestionText);
      assert.equal(await page.getByLabel("분석할 답안",{exact:true}).inputValue(),draft.userAnswer);
      assert.equal(await page.locator("[data-owner-reference-status]").getAttribute("data-owner-reference-status"),"deferred");
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),draftKey),JSON.stringify(draft));
      assert.equal(requests.filter(x=>x.startsWith("POST")).length,0);
    }
    await page.getByLabel("분석할 답안",{exact:true}).fill("");
    assert.equal(await page.locator("[data-owner-analysis-preparation]").isVisible(),true,"editing does not discard or leave the preparation panel");
    assert.equal(await page.locator("[data-owner-prepare-analysis]").isEnabled(),false);
    await page.getByLabel("분석할 답안",{exact:true}).fill(draft.userAnswer);
    const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),draftKey);
    for(const key of ["rawQuestionText","userAnswer","issueRecall","outlineDraft","biggestGap"])assert.equal(restored[key],draft[key]);
    const persistedDraft=await page.evaluate(key=>localStorage.getItem(key),draftKey);
    await page.locator("[data-owner-prepare-analysis]").click();
    await page.waitForURL("**/app/capture/repair?itemId=*");
    await page.getByRole("button",{name:"선택한 문제·답안을 Gemini로 보내 분석",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"선택한 문제·답안을 Gemini로 보내 분석",exact:true}).isEnabled(),true);
    assert.equal(await page.locator("[data-app1-functional-test]").count(),1);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),draftKey),persistedDraft);
    assert.deepEqual(requests.filter(x=>x.startsWith("POST")),["POST /api/os/items"]);
    const id=new URL(page.url()).searchParams.get("itemId");const saved=await app.repository.getWrongAnswerItem(OWNER_ID,id);
    assert.equal(saved.rawQuestionText,draft.rawQuestionText);assert.equal(saved.userAnswer,draft.userAnswer);
    assert.equal(saved.rawPayload.issue_recall,draft.issueRecall);assert.equal(saved.rawPayload.outline_draft,draft.outlineDraft);
    assert.equal(saved.userReasonText,undefined);assert.equal(saved.rawPayload.biggest_gap,null);
    assert.deepEqual(saved.rawPayload.user_confirmed_fields.capture_review_provenance,provenance);
    for(const table of ["wrong_answer_notes","wrong_answer_tags","review_queue_items","learning_signal_events","recurrence_features","study_logs"])assert.equal(store.tables[table]?.length??0,0,table);
    const preview=app.load("lib/review-os/study-note").buildNotebookPreview(saved);
    assert.equal(preview.weakPoint,"AI 분석 전 · 진단 없음");assert.equal(preview.noteLabel,"AI 예시 기능시험");
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test("functional-test source cannot mint a learning repair through a forged or valid save command",async()=>{
  const seed=seedRows();seed.wrong_answer_items[0].raw_payload.user_confirmed_fields.capture_review_provenance=provenance;
  const store=memoryTransport(seed);const app=productionHarness(store.execute);const response=await app.save(await app.command("functional-test"));
  assert.equal(response.status,400);assert.equal(response.body.errorCode,"APP1_PERSISTENCE_COMMAND_INVALID");
  assert.equal(store.tables.wrong_answer_items.length,1);assert.equal(store.tables.review_queue_items.length,0);assert.equal(store.tables.learning_signal_events.length,0);
});

test("AI answer evidence is quoted only when the exact text exists in the submitted answer",async()=>{
  const app=productionHarness(memoryTransport().execute);
  const detail=await app.load("lib/review-os/service").reviewOsService.getWrongAnswerDetail(OWNER_ID,app.session.email,SOURCE_ID);
  const normalize=app.load("lib/evaluate/answer-review-structure").normalizeAnswerReviewStructureDraft;
  const vm=app.load("lib/owner-study/app1-capture-repair-view-model");
  const quote=vm.getApp1LearnerAnswer(detail).slice(0,40);
  const valid=vm.buildApp1PrimaryGap(detail,normalize({answerEvidenceQuote:quote}));
  assert.equal(valid.anchor,`AI가 선택한 답안 구절: 「${quote}」`);
  const invented=vm.buildApp1PrimaryGap(detail,normalize({answerEvidenceQuote:"답안에는 존재하지 않는 만들어낸 인용문입니다"}));
  assert.ok(!invented.anchor.includes("만들어낸"));
});


test("provenance replay preserves the exact source and refuses reclassification without changing records",async()=>{
  const store=memoryTransport();const app=productionHarness(store.execute);
  const service=app.load("lib/review-os/service").reviewOsService;
  const input={examName:"감정평가사 2차",subjectLabel:"감정평가이론",sourceType:"text",rawQuestionText:draft.rawQuestionText,userAnswer:draft.userAnswer,rawAnswerText:draft.userAnswer,correctAnswer:"-",issueRecall:draft.issueRecall,outlineDraft:draft.outlineDraft,extractionPayload:{user_confirmed_fields:{capture_review_provenance:provenance}}};
  const save=value=>service.createWrongAnswerItem(OWNER_ID,app.session.email,value);
  const before=store.tables.wrong_answer_items.length;
  const first=await save(input),replay=await save(input);
  assert.equal(replay.item.id,first.item.id);assert.equal(replay.deduped,true);
  await assert.rejects(save({...input,outlineDraft:"수정된 합성 목차"}),/capture-source-provenance-conflict/);
  await assert.rejects(save({...input,extractionPayload:{user_confirmed_fields:{capture_review_provenance:{...provenance,learningMaterial:"learner_input"}}}}),/capture-source-provenance-conflict/);
  await assert.rejects(save({...input,extractionPayload:{user_confirmed_fields:{capture_review_provenance:{...provenance,verified:true}}}}),/invalid-capture-review-provenance/);
  assert.equal(store.tables.wrong_answer_items.length,before+1);
  assert.equal(store.tables.review_queue_items.length,0);assert.equal(store.tables.learning_signal_events.length,0);
});
