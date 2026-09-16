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
    const form=findForm(tree); assert.ok(form); assert.equal(form.props.textOnly,true); assert.equal(form.props.initialSubject,"감정평가이론"); assert.equal(form.props.ownerCaptureRepairEnabled,true); assert.deepEqual(form.props.ownerCaptureRepairSubjects,["appraisal_theory"]);
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
    // Re-entering after a successful handoff creates a fresh operation, but resumes
    // the exact stored source without forging a new receipt or duplicating records.
    const sourceCount=store.tables.wrong_answer_items.length;
    await page.goto(`${origin}/app/capture?mode=second`);
    await page.locator('[data-owner-prepare-analysis]').click();
    await page.waitForURL(`**/app/capture/repair?itemId=${id}`);
    assert.equal(store.tables.wrong_answer_items.length,sourceCount);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),draftKey),persistedDraft);
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
  const input={examName:"감정평가사 2차",subjectLabel:"감정평가이론",sourceType:"text",confidence:"중간",rawQuestionText:draft.rawQuestionText,userAnswer:draft.userAnswer,rawAnswerText:draft.userAnswer,correctAnswer:"-",issueRecall:draft.issueRecall,outlineDraft:draft.outlineDraft,extractionPayload:{user_confirmed_fields:{capture_review_provenance:provenance}}};
  const save=value=>service.createWrongAnswerItem(OWNER_ID,app.session.email,value);
  const before=store.tables.wrong_answer_items.length;
  const first=await save(input),replay=await save(input);
  assert.equal(replay.item.id,first.item.id);assert.equal(replay.deduped,true);assert.equal(replay.sourceInputMatched,true);
  await assert.rejects(save({...input,confidence:"높음"}),/capture-source-provenance-conflict/);
  await assert.rejects(save({...input,outlineDraft:"수정된 합성 목차"}),/capture-source-provenance-conflict/);
  await assert.rejects(save({...input,extractionPayload:{user_confirmed_fields:{capture_review_provenance:{...provenance,learningMaterial:"learner_input"}}}}),/capture-source-provenance-conflict/);
  await assert.rejects(save({...input,extractionPayload:{user_confirmed_fields:{capture_review_provenance:{...provenance,verified:true}}}}),/invalid-capture-review-provenance/);
  await assert.rejects(save({...input,extractionPayload:{user_confirmed_fields:{capture_review_provenance:{...provenance,learningMaterial:["ai_example_functional_test"]}}}}),/invalid-capture-review-provenance/);
  assert.equal(store.tables.wrong_answer_items.length,before+1);
  assert.equal(store.tables.review_queue_items.length,0);assert.equal(store.tables.learning_signal_events.length,0);
});


test("real initial-analysis API excludes functional tests from learning signals but retains ordinary analysis signals",async()=>{
  const modelDraft={diagnosticStatus:"finding",questionRequirementQuote:"시장가치 판단의 조건을 설명하시오.",answerEvidenceQuote:"시장가치는 통상적인 시장 노출과 거래 당사자를 전제로 합니다.",reviewedAnswerScope:"entire_submitted_answer",questionSummary:"시장가치 판단의 조건을 설명하는 합성 문제",coreConcepts:["시장가치","시장 노출"],requiredIssues:"시장 조건과 개별 사정의 구분",userAnswerSummary:"시장 노출 조건을 설명했으나 개별 사정과 연결이 약함",userAnswerStructure:"정의와 논거",referenceStructure:"참고자료 미제공",strengths:["시장 노출 조건을 제시함"],missingIssueCandidates:["개별 사정과 시장 조건의 적용 연결이 부족함"],weakParagraphPoint:"개별 사정을 시장 일반의 조건과 구분하는 문장을 작성하세요.",weakLogicPoint:"정의에서 사례 적용으로 연결이 필요함",rewriteTarget:"사례 적용 문장",nextAction:"개별 사정과 시장 조건을 구분해 한 문장으로 작성하세요."};
  for(const learningMaterial of ["ai_example_functional_test","learner_input"]){
    const seed=seedRows();Object.assign(seed.wrong_answer_items[0],{raw_question_text:draft.rawQuestionText,user_answer:draft.userAnswer,raw_answer_text:draft.userAnswer});seed.wrong_answer_items[0].raw_payload.user_confirmed_fields.capture_review_provenance={...provenance,learningMaterial};
    const store=memoryTransport(seed);let calls=0;
    const app=productionHarness(store.execute,{overrides:()=>({"@/lib/evaluate/gemini":{isGeminiConfigured:()=>true,GeminiEnvError:class extends Error{},GeminiStructureParseError:class extends Error{},isGeminiQuotaExceededError:()=>false,structureAnswerReviewWithGemini:async()=>{calls++;return modelDraft;}}})});
    const body=new FormData();body.set("requestPurpose","app1_initial_analysis");body.set("sourceItemId",SOURCE_ID);body.set("examMode","second");body.set("subject","감정평가이론");
    const response=await app.load("app/api/answer-review/structure/route").POST(new Request("http://localhost/api/answer-review/structure",{method:"POST",body}));
    const result=await response.json();assert.equal(response.status,200);assert.ok(calls>=1);assert.ok(result.analysisBinding);
    assert.equal(result.learningSignalStatus,learningMaterial==="ai_example_functional_test"?"skipped":"saved");
    assert.equal(store.tables.learning_signal_events.length,learningMaterial==="ai_example_functional_test"?0:1);
    if(learningMaterial==="ai_example_functional_test")assert.equal(result.learningSignalSkipReason,"functional_test");
    assert.equal(store.tables.review_queue_items.length,0);
  }
});


test("functional-test source stays addressable but never enters activity, meaningful-data, Today or weekly readers",async()=>{
  const store=memoryTransport();store.tables.wrong_answer_items=[];store.tables.study_logs=[];store.tables.study_profiles=[];store.tables.action_seeds=[];store.tables.weekly_learning_summaries=[];
  const app=productionHarness(store.execute);const service=app.load("lib/review-os/service").reviewOsService;
  const args=[OWNER_ID,app.session.email,"second"];
  const beforeToday=await service.getTodayFocus(...args),beforeWeek=await service.getWeeklyPlan(...args);
  const input={examName:"감정평가사 2차",subjectLabel:"감정평가이론",sourceType:"text",rawQuestionText:draft.rawQuestionText,userAnswer:draft.userAnswer,correctAnswer:"-",extractionPayload:{user_confirmed_fields:{capture_review_provenance:provenance}}};
  const saved=await service.createWrongAnswerItem(OWNER_ID,app.session.email,input);
  assert.ok(await service.getWrongAnswerDetail(OWNER_ID,app.session.email,saved.item.id),"explicit analysis can still read the preserved source");
  assert.deepEqual(await service.listWrongAnswerItems(OWNER_ID,app.session.email),[]);
  assert.equal(await service.hasMeaningfulLearningData(...args),false);
  const activity=await service.getDailyStudyActivity(...args);
  for(const field of ["savedCaptureToday","studiedToday","savedToday","completedToday"])assert.equal(activity[field],false,field);
  assert.equal(activity.currentGentleStreak,0);
  assert.deepEqual(await service.getTodayFocus(...args),beforeToday);
  assert.deepEqual(await service.getWeeklyPlan(...args),beforeWeek);
  assert.equal(await service.getWeeklySummary(OWNER_ID,app.session.email),null);
  assert.equal(store.tables.learning_signal_events.length,0);assert.equal(store.tables.review_queue_items.length,0);
  const ordinary=structuredClone(input);ordinary.rawQuestionText+=" 일반 학습자 기록 대조군";ordinary.extractionPayload.user_confirmed_fields.capture_review_provenance.learningMaterial="learner_input";
  await service.createWrongAnswerItem(OWNER_ID,app.session.email,ordinary);
  assert.equal((await service.listWrongAnswerItems(OWNER_ID,app.session.email)).length,1);
  assert.equal(await service.hasMeaningfulLearningData(...args),true);
  assert.equal((await service.getDailyStudyActivity(...args)).savedCaptureToday,true);
});


test("learning readers page beyond many excluded records without hiding older real records or another mode",async()=>{
  const seed=seedRows(),template=seed.wrong_answer_items[0];
  const row=(n,changes={})=>({...structuredClone(template),id:`eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12,"0")}`,created_at:new Date(Date.parse("2026-09-06T10:00:00.000Z")-n*1000).toISOString(),...changes});
  seed.wrong_answer_items=Array.from({length:205},(_,i)=>row(i,{raw_payload:{user_confirmed_fields:{capture_review_provenance:provenance}}}));
  seed.wrong_answer_items.push(...Array.from({length:25},(_,i)=>row(300+i)));
  seed.study_logs=[];seed.study_profiles=[];seed.action_seeds=[];seed.weekly_learning_summaries=[];
  const store=memoryTransport(seed),app=productionHarness(store.execute);const service=app.load("lib/review-os/service").reviewOsService;
  const list=await service.listWrongAnswerItems(OWNER_ID,app.session.email,20);
  assert.equal(list.length,20);assert.ok(list.every(item=>!item.rawPayload.user_confirmed_fields?.capture_review_provenance));
  const listQueries=app.calls.filter(q=>q.table==="wrong_answer_items");
  assert.equal(listQueries.length,3,"one query per page, no per-item hydration queries");
  assert.deepEqual(listQueries.map(q=>q.range),[[0,99],[100,199],[200,299]]);
  const repository=app.load("lib/review-os/repository").reviewOsRepository;
  for(const item of [list[0],list.at(-1)])assert.deepEqual(item,await repository.getWrongAnswerItem(OWNER_ID,item.id),"page mapping preserves the established item shape");
  assert.equal(await service.hasMeaningfulLearningData(OWNER_ID,app.session.email,"second"),true);
  assert.equal((await service.getDailyStudyActivity(OWNER_ID,app.session.email,"second")).savedCaptureToday,true);
  assert.ok(app.calls.some(q=>q.table==="wrong_answer_items"&&q.range?.[0]>=200));
  assert.ok(app.calls.filter(q=>q.table==="wrong_answer_items").every(q=>q.filters.some(([field,op,value])=>field==="user_id"&&op==="eq"&&value===OWNER_ID)));
  store.tables.wrong_answer_items.unshift(row(999,{exam_name:"감정평가사 1차",created_at:"2026-09-06T10:01:00.000Z"}));
  assert.equal((await service.listWrongAnswerItems(OWNER_ID,app.session.email,1,"second"))[0].examName,"감정평가사 2차");
});

test("saved same-session repair readback keeps the original gap historical and continues to review", async()=>{
  const store=memoryTransport();
  const app=productionHarness(store.execute,{overrides:()=>({
    "next/link":({children,href,...props})=>React.createElement("a",{...props,href},children),
    "next/navigation":{useSearchParams:()=>new URLSearchParams("mode=second"),usePathname:()=>"/app/items/synthetic"},
  })});
  const saved=await app.save(await app.command("confirmed-readback"));
  assert.equal(saved.status,200);
  const detail=await app.repository.getWrongAnswerDetail(OWNER_ID,saved.body.item.id);
  const source=await app.repository.getWrongAnswerDetail(OWNER_ID,SOURCE_ID);
  const notes=app.load("lib/review-os/study-note");
  const note=notes.buildDetailStudyNote(detail);
  const comparison=notes.buildRewriteComparisonNote(detail,note,source);
  assert.equal(note.sameSessionRepairConfirmed,true);
  assert.equal(comparison.sameSessionRepairConfirmed,true);
  assert.equal(comparison.sourceGap,detail.item.rawPayload.rewrite_source_gap);
  assert.ok(!comparison.remainingNextGap.includes(detail.item.rawPayload.aiDraft.weakStructurePoint));
  assert.match(comparison.improvement,/같은 세션/);
  assert.match(note.nextAction,/복습/);
  assert.doesNotMatch(note.summary,/먼저 보강할 지점/);
  const {StudyLedgerDetail}=app.load("components/learner/study-ledger-ui");
  const html=renderToString(React.createElement(StudyLedgerDetail,{
    itemId:detail.item.id,title:"합성 교정",subject:"감정평가이론",createdAt:detail.item.createdAt,savedAt:detail.item.updatedAt,
    biggestGap:comparison.sourceGap,biggestGapLabel:"교정 전 간극",nextAction:note.nextAction,coreLine:note.coreLine,keyTerms:[],
    learnerExcerpt:detail.item.userAnswer,nextReviewDate:note.nextReviewDate,recurrenceText:note.recurrenceText,
    reviewQueueCount:1,learnerConfirmed:true,completed:true,comparison,reviewHref:"/app/review?mode=second",
  }));
  assert.match(html,/교정 확인 범위/);
  assert.match(html,/복습 큐에서 다시 확인하기/);
  assert.doesNotMatch(html,/아직 남은 간극|남은 감점 원인|문단 한 번 더 다듬기/);
  for(const [key,value] of [["app1_same_session_only",false],["app1_mastery_created",true],["app1_transfer_created",true],["app1_contract_version","foreign"],["app1_source_item_id","foreign"]]){
    const changed=structuredClone(detail);
    changed.item.rawPayload.user_confirmed_fields[key]=value;
    assert.equal(notes.buildDetailStudyNote(changed).sameSessionRepairConfirmed,false,key);
  }
  const ordinary=structuredClone(detail);
  delete ordinary.item.rawPayload.user_confirmed_fields.app1_verification_state;
  assert.equal(notes.buildRewriteComparisonNote(ordinary,notes.buildDetailStudyNote(ordinary),source).sameSessionRepairConfirmed,false);
});
