import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {productionHarness,memoryTransport,seedRows,OWNER_ID,SOURCE_ID} from './fixtures/app1-production-persistence-harness.mjs';

// Component regression with real completion service/repository on memory transport.
// This does not replace actual Next.js/auth/Postgres acceptance.
test('Today paragraph self-rating reaches real completion validation for Theory and Law',async()=>{
 const subjects=['감정평가이론','감정평가 및 보상법규'];
 const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{TodaySessionRunner}from'./components/review-os/today-session-runner';createRoot(document.getElementById('root')).render(React.createElement(TodaySessionRunner,window.props));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent',plugins:[{name:'test-navigation',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test-navigation'}));b.onLoad({filter:/.*/,namespace:'test-navigation'},()=>({contents:"import React from 'react';export default function Link({children,...p}){return React.createElement('a',p,children)}",loader:'js',resolveDir:process.cwd()}));}}]});
 const browser=await chromium.launch({headless:true});
 try{for(const subject of subjects){
  const rows=seedRows();rows.wrong_answer_items[0].subject_label=subject;
  const queueId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  rows.review_queue_items.push({id:queueId,user_id:OWNER_ID,source_submission_id:SOURCE_ID,source_kind:'wrong_answer',subject_id:subject,exam_id:'wrong_answer_os',status:'pending',priority_score:80,raw_payload:{dueAt:'2026-09-17T00:00:00Z'},derived_payload:{},created_at:'2026-09-17T00:00:00Z'});
  const store=memoryTransport(rows),app=productionHarness(store.execute),service=app.load('lib/review-os/service').reviewOsService;
  const props={mode:'second',modeLabel:'2차',focus:{reason:'합성 회상 검사',estimatedDurationMinutes:10,primaryTaskLabel:'합성 문단 다시쓰기',nextAction:'직접 회상'},queueItem:{queueId,subjectLabel:subject,confidence:'medium',recurrenceCount:1,mistakeType:'조건 확인'},note:{weakPoint:'적용일 확인',missingIssue:'적용일 확인',rewriteInstruction:'합성 문단을 직접 다시 쓰세요.',nextReviewDate:'2026-09-19'}};
  const requests=[],errors=[];
  const server=createServer(async(req,res)=>{try{if(req.url==='/entry.js'){res.setHeader('content-type','application/javascript; charset=utf-8');res.end(bundle.outputFiles[0].contents);return;}
    if(req.method==='POST'){let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests.push(body);await service.completeReview(OWNER_ID,'synthetic-owner@example.invalid',queueId,body.action,body.metadata);res.setHeader('content-type','application/json');res.end('{}');return;}
    res.setHeader('content-type','text/html; charset=utf-8');res.end('<div id="root"></div><script>window.props='+JSON.stringify(props)+'</script><script src="/entry.js"></script>');
  }catch(e){errors.push(e.message);res.writeHead(500).end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const page=await browser.newPage();await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(origin);await page.getByRole('button',{name:'10분 다시 쓰기',exact:true}).click();await page.getByLabel('회상한 쟁점').fill('합성 적용일을 확인');await page.getByRole('button',{name:'다음: 문단 1개 다시쓰기',exact:true}).click();
    const paragraph='합성 법령의 버전과 적용일을 구분하고 제시된 날짜의 효력을 직접 대조하였다.';
    await page.getByLabel('보강할 문단').fill(paragraph);await page.getByRole('button',{name:'문단 1개만 보강',exact:true}).click();await page.getByRole('button',{name:'다음 보강 예약',exact:true}).click();
    const complete=page.getByRole('button',{name:'다음 보강 예약',exact:true});assert.equal(await complete.isDisabled(),true);assert.equal(requests.length,0);
    await page.getByRole('button',{name:'헷갈림',exact:true}).click();assert.equal(await complete.isEnabled(),true);
    const response=page.waitForResponse(r=>r.request().method()==='POST');await complete.click();assert.equal((await response).status(),200);
    assert.equal(requests.length,1);assert.equal(requests[0].metadata.recallOutcome,'fuzzy');assert.equal(requests[0].metadata.rewriteParagraph,paragraph);
    assert.equal(store.tables.review_queue_items[0].status,'completed');assert.equal(store.tables.review_queue_items.find(r=>r.status==='pending').raw_payload.rewrite_paragraph,paragraph);
    assert.ok(!JSON.stringify(store.tables.usage_events).includes(paragraph));assert.deepEqual(errors,[]);
  }catch(e){throw new Error(JSON.stringify({cause:e.message,browserErrors:errors,body:await page.locator('body').innerText()}));}finally{await page.close();await new Promise(resolve=>server.close(resolve));}
 }}finally{await browser.close();}
});
