import test from 'node:test';
import assert from 'node:assert/strict';
import {isOwnerLocalOcrEnabled,canUseOwnerLocalOcr,resolveLocalOcrRequest,validateLocalOcrFiles,validateLocalOcrSignature,validateLocalOcrResponse,readLocalOcrForm,readPdfPageCount,assertLocalOcrTime} from '../lib/owner-study/local-ocr.ts';
const env={NODE_ENV:'development',INVERGE_LOCAL_OCR_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:55431',ALPHA_ADMIN_EMAILS:'owner-test@localhost.test'};
const code=expected=>error=>error.code===expected;
test('local OCR is explicit Windows/loopback/Owner-only and never enabled in Preview/Production/CI',()=>{
 assert.equal(isOwnerLocalOcrEnabled(env,'win32'),true);
 assert.equal(canUseOwnerLocalOcr('owner-test@localhost.test',env,'win32'),true);
 for(const email of [null,'','different@localhost.test']) assert.equal(canUseOwnerLocalOcr(email,env,'win32'),false);
 for(const change of [{INVERGE_LOCAL_OCR_ENABLED:undefined},{NODE_ENV:'production'},{VERCEL:'1'},{VERCEL_ENV:'preview'},{CI:'true'},{NEXT_PUBLIC_SUPABASE_URL:'https://remote.example'}]) assert.equal(isOwnerLocalOcrEnabled({...env,...change},'win32'),false);
 assert.equal(isOwnerLocalOcrEnabled(env,'linux'),false);
});
test('stale local page fails closed after disable instead of selecting Gemini',()=>{
 assert.equal(resolveLocalOcrRequest('windows_builtin_ko',true),true);
 assert.throws(()=>resolveLocalOcrRequest('windows_builtin_ko',false),code('LOCAL_OCR_DISABLED'));
 assert.throws(()=>resolveLocalOcrRequest('other',false),code('LOCAL_OCR_UNSUPPORTED_ENGINE'));
 assert.equal(resolveLocalOcrRequest(null,false),false);
 assert.equal(resolveLocalOcrRequest(null,true),false);
});
test('images and one PDF obey aggregate bytes, MIME and file-count limits',()=>{
 const png={type:'image/png',size:2048},pdf={type:'application/pdf',size:2048};
 validateLocalOcrFiles([png]);validateLocalOcrFiles([pdf]);
 for(const files of [[],Array(5).fill(png),[{...png,size:8*1024*1024+1}],[{...png,size:0}],[{...png,type:'text/html'}],[pdf,png]]) assert.throws(()=>validateLocalOcrFiles(files));
 validateLocalOcrSignature('image/png',Buffer.from([137,80,78,71,13,10,26,10]));
 validateLocalOcrSignature('application/pdf',Buffer.from('%PDF-1.4'));
 assert.throws(()=>validateLocalOcrSignature('image/png',Buffer.from('<html>')),code('LOCAL_OCR_UNSUPPORTED_FILE'));
});
test('only bounded, explicitly unconfirmed OCR output is accepted',()=>{
 const draft={schemaVersion:'local_ocr_draft.v1',engine:'windows_builtin_ko',needsReview:true,texts:['2,222 / 0.06 = 37,033.33']};
 assert.deepEqual(validateLocalOcrResponse(draft),draft.texts);
 for(const change of [{needsReview:false},{engine:'provider'},{texts:['x'.repeat(40001)]},{texts:[]},{texts:['']},{texts:['  \n\t']},{texts:['one','unexpected second']}]) assert.throws(()=>validateLocalOcrResponse({...draft,...change}),code('LOCAL_OCR_INVALID_RESPONSE'));
});
test('encrypted, unknown and excessive PDF page counts fail before rendering',()=>{
 assert.equal(readPdfPageCount('Pages: 2\nEncrypted: no\n'),2);
 for(const info of ['Pages: 5\nEncrypted: no\n','Pages: 0\nEncrypted: no\n','Pages: 2\nPages: 3\nEncrypted: no\n','Pages: 2\nEncrypted: yes\n','Encrypted: no\n']) assert.throws(()=>readPdfPageCount(info));
});
test('multipart bytes are bounded before multipart parsing and invalid forms have a fixed error',async()=>{
 const body=new FormData();body.set('mode','second');body.set('images',new File(['synthetic'],'test.png',{type:'image/png'}));
 const parsed=await readLocalOcrForm(new Request('http://localhost',{method:'POST',body}));assert.equal(parsed.get('images').size,9);
 await assert.rejects(readLocalOcrForm(new Request('http://localhost',{method:'POST',body:'not multipart'})),code('LOCAL_OCR_INVALID_FORM'));
 await assert.rejects(readLocalOcrForm(new Request('http://localhost',{method:'POST',body:new Uint8Array(8*1024*1024+65537)})),code('LOCAL_OCR_SIZE_LIMIT'));
});
import {productionHarness,memoryTransport} from './fixtures/app1-production-persistence-harness.mjs';
import * as localOcr from '../lib/owner-study/local-ocr.ts';

test('real OCR route denies stale local mode, other accounts, quota and helper failure without provider fallback',async()=>{
 for(const scenario of ['disabled','unauthenticated','wrong_owner','quota','helper_failure','success']) {
  let providerCalls=0,helperCalls=0,quotaCalls=0;
  class Blocked extends Error {code='CAPTURE_UPLOAD_LIMIT';feature='capture';}
  const app=productionHarness(memoryTransport().execute,{now:new Date().toISOString(),overrides:({session})=>{
   if(scenario==='unauthenticated')session.userId=null;
   return {
    '@/lib/owner-study/local-ocr':{...localOcr,isOwnerLocalOcrEnabled:()=>scenario!=='disabled',canUseOwnerLocalOcr:()=>scenario!=='wrong_owner',extractWithLocalWindowsOcr:async(files,options)=>{assert.ok(options.deadline>Date.now() && options.deadline<=Date.now()+60000);assert.ok(options.signal instanceof AbortSignal);helperCalls++;if(scenario==='helper_failure')throw new localOcr.LocalOcrError('LOCAL_OCR_PROCESS_FAILED');return [{pageNumber:1,name:'1페이지',text:'합성 원문 2222'}];}},
    '@/lib/review-os/entitlement-enforcement':{EntitlementBlockedError:Blocked,assertCanUploadCapture:async()=>{quotaCalls++;if(scenario==='quota')throw new Blocked();}},
    '@/lib/evaluate/gemini':{extractStructuredDraftWithGemini:async()=>{providerCalls++;throw Error('forbidden');},extractTranscriptionFromImages:async()=>{providerCalls++;throw Error('forbidden');}},
    '@/lib/owner-study/owner-pc-theory':{isOwnerPcTheoryEnabled:()=>false},
    '@/lib/review-os/repository':{reviewOsRepository:{logUsageEvent:async()=>{}}},
   };
  }});
  const body=new FormData();body.set('mode','second');body.set('images',new File(['original synthetic'],'input.png',{type:'image/png'}));
  const result=await app.load('app/api/inverge/ocr/route').POST(new Request('http://localhost/api/inverge/ocr',{method:'POST',body,headers:{'x-inverge-ocr-engine':'windows_builtin_ko'}}));
  const payload=await result.json();
  assert.equal(providerCalls,0,scenario);
  assert.equal(result.status,{disabled:400,unauthenticated:403,wrong_owner:403,quota:402,helper_failure:400,success:200}[scenario]);
  assert.equal(helperCalls,['helper_failure','success'].includes(scenario)?1:0,scenario);
  assert.equal(quotaCalls,['quota','helper_failure','success'].includes(scenario)?1:0,scenario);
  if(scenario==='success'){assert.equal(payload.externalTransmission,false);assert.equal(payload.ocrVerification,'unconfirmed');assert.equal(payload.needs_review,true);}
 }
});


test('upload consumes the request deadline and abort cancels a stalled body',async()=>{
 assert.throws(()=>assertLocalOcrTime(Date.now()-1),code('LOCAL_OCR_TIMEOUT'));
 const controller=new AbortController();let cancelled=false;
 const body=new ReadableStream({cancel(){cancelled=true;}});
 const request=new Request('http://localhost',{method:'POST',body,duplex:'half',signal:controller.signal});
 const pending=readLocalOcrForm(request,Date.now()+5000);
 controller.abort();
 await assert.rejects(pending,code('LOCAL_OCR_TIMEOUT'));
 assert.equal(cancelled,true);
 let expiredCancelled=false;
 const slow=new ReadableStream({cancel(){expiredCancelled=true;}});
 await assert.rejects(readLocalOcrForm(new Request('http://localhost',{method:'POST',body:slow,duplex:'half'}),Date.now()+25),code('LOCAL_OCR_TIMEOUT'));
 assert.equal(expiredCancelled,true);
});

test('legacy provider intent is preserved when local OCR is enabled',async()=>{
 let localCalls=0,providerCalls=0;
 const app=productionHarness(memoryTransport().execute,{now:new Date().toISOString(),overrides:()=>({
  '@/lib/owner-study/local-ocr':{...localOcr,isOwnerLocalOcrEnabled:()=>true,extractWithLocalWindowsOcr:async()=>{localCalls++;throw Error('wrong_engine');}},
  '@/lib/review-os/entitlement-enforcement':{EntitlementBlockedError:class extends Error{},assertCanUploadCapture:async()=>{}},
  '@/lib/evaluate/gemini':{extractTranscriptionFromImages:async()=>{providerCalls++;return 'controlled legacy response';}},
  '@/lib/owner-study/owner-pc-theory':{isOwnerPcTheoryEnabled:()=>false},
  '@/lib/review-os/repository':{reviewOsRepository:{logUsageEvent:async()=>{}}},
 })});
 const body=new FormData();body.set('images',new File(['synthetic'],'test.png',{type:'image/png'}));
 const response=await app.load('app/api/inverge/ocr/route').POST(new Request('http://localhost',{method:'POST',body}));
 assert.equal(response.status,200);assert.equal(localCalls,0);assert.equal(providerCalls,1);
});
