import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,readdir,writeFile} from "node:fs/promises";
import os from "node:os";import path from "node:path";
import {THEORY_POLICY as policy,authorizeAdditionalTheoryDevelopmentCall,readTheoryDevelopmentCallLimit,initializeTheoryBudget,testOwnerTheoryConnection,authorizeTheoryDevelopment,readTheoryDevelopmentApproval,reserveTheoryDevelopmentCall,reserveTheoryCall,readTheoryBudget,generateOwnerTheory} from "../lib/owner-study/owner-pc-theory-budget.mjs";
const user="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function fixture(){const root=path.join(await mkdtemp(path.join(os.tmpdir(),"theory-dev-")),"budget");const settings={version:policy.version,model:policy.model,ownerId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",projectId:"synthetic-project",apiKey:"synthetic-not-a-provider-key",paidProjectVerified:true,dataSharingEnabled:false,verifiedAt:new Date().toISOString(),verificationEvidenceSha256:"a".repeat(64)};await initializeTheoryBudget(root,settings);await testOwnerTheoryConnection(root,settings,async()=>Response.json({modelVersion:policy.model,candidates:[{finishReason:"STOP",content:{parts:[{text:"READY"}]}}]}));await authorizeTheoryDevelopment(root,settings,{userId:user,questionSha256:"b".repeat(64),supabaseUrl:"http://127.0.0.1:55431"});const development=await readTheoryDevelopmentApproval(root,settings);return {root,settings,authority:{userId:user,sourceItemId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",purpose:"app1_initial_analysis",questionSha256:"b".repeat(64),development}};}
test("development shares existing spend without consuming or replacing personal case",async()=>{const f=await fixture();const before=await readFile(path.join(f.root,"installation.json"),"utf8");await reserveTheoryDevelopmentCall(f.root,f.settings,f.authority);const b=await readTheoryBudget(f.root,f.settings);assert.equal(b.usedReservations,2);assert.equal(b.caseId,null);assert.equal(b.remainingMicros,policy.budgetMicros-2*policy.reservationMicros);assert.equal(await readFile(path.join(f.root,"installation.json"),"utf8"),before);await reserveTheoryCall(f.root,f.settings,{userId:f.settings.ownerId,sourceItemId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",purpose:"app1_initial_analysis"});assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,3);assert.equal((await readTheoryBudget(f.root,f.settings)).caseId,"dddddddd-dddd-4ddd-8ddd-dddddddddddd");await assert.rejects(authorizeTheoryDevelopment(f.root,f.settings,{userId:user,questionSha256:"b".repeat(64),supabaseUrl:"http://127.0.0.1:55431"}),{code:"EEXIST"});});
test("six concurrent development reservations are permanent across restart and same global cap",async()=>{const f=await fixture();const out=await Promise.allSettled(Array.from({length:12},()=>reserveTheoryDevelopmentCall(f.root,f.settings,f.authority)));assert.equal(out.filter(x=>x.status==="fulfilled").length,6);assert.ok(out.filter(x=>x.status==="rejected").every(x=>x.reason.code==="OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"), JSON.stringify(out.map(x=>x.status==="fulfilled" ? {slot:x.value} : {code:x.reason.code,syscall:x.reason.syscall})));assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,7);await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"});});
test("development binds exact question, isolated account and local DB, at most three source items",async()=>{const f=await fixture();for(const delta of [{userId:f.settings.ownerId},{questionSha256:"c".repeat(64)},{development:{...f.authority.development,supabaseUrl:"http://127.0.0.1:55421"}}])await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,{...f.authority,...delta}),{code:"OWNER_THEORY_DEVELOPMENT_BINDING_MISMATCH"});for(const n of [1,2,3])await reserveTheoryDevelopmentCall(f.root,f.settings,{...f.authority,sourceItemId:`dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12,"0")}`});await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_SOURCE_LIMIT"});assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,4);});
test("unknown development transport is charged and cannot be refunded by retry",async()=>{const f=await fixture();const req={contents:[{role:"user",parts:[{text:"SYNTHETIC_PRIVATE_BODY"}]}],generationConfig:{temperature:0.1}};await assert.rejects(generateOwnerTheory(f.root,f.settings,f.authority,req,async()=>{throw Error("unknown timeout");}));assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,2);const result=JSON.parse(await readFile(path.join(f.root,"result-02.json"),"utf8"));assert.equal(result.status,"unknown");assert.equal(result.estimatedCostMicros,null);for(const name of await readdir(f.root))assert.ok(!(await readFile(path.join(f.root,name),"utf8")).includes("SYNTHETIC_PRIVATE_BODY"));});

test("development cannot take slot one before an existing probe or personal case",async()=>{
 const root=path.join(await mkdtemp(path.join(os.tmpdir(),"theory-dev-unstarted-")),"budget");
 const settings={version:policy.version,model:policy.model,ownerId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",projectId:"synthetic-project",apiKey:"synthetic-not-a-provider-key",paidProjectVerified:true,dataSharingEnabled:false,verifiedAt:new Date().toISOString(),verificationEvidenceSha256:"a".repeat(64)};
 await initializeTheoryBudget(root,settings);
 await assert.rejects(authorizeTheoryDevelopment(root,settings,{userId:user,questionSha256:"b".repeat(64),supabaseUrl:"http://127.0.0.1:55431"}),{code:"OWNER_THEORY_CONNECTION_NOT_READY"});
 assert.equal((await readTheoryBudget(root,settings)).usedReservations,0);
 assert.deepEqual(await readdir(root),["installation.json"]);
});

test("an existing development lock is never reclaimed or charged by a waiting reservation",async()=>{
 const f=await fixture();const lock=path.join(f.root,"development-reservation.lock");
 await writeFile(lock,"unknown previous operation",{flag:"wx"});
 await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_BUSY"});
 assert.equal(await readFile(lock,"utf8"),"unknown previous operation");
 assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,1);
});

test("one explicit extra-call amendment preserves five used calls and the original personal ledger",async()=>{
 const f=await fixture();
 const original=new Map(await Promise.all((await readdir(f.root)).map(async name=>[name,await readFile(path.join(f.root,name),"utf8")])));
 await assert.rejects(authorizeAdditionalTheoryDevelopmentCall(f.root,f.settings),{code:"OWNER_THEORY_DEVELOPMENT_EXTENSION_NOT_READY"});
 assert.equal(await readTheoryDevelopmentCallLimit(f.root,f.settings),6);
 for(let i=0;i<5;i++)await reserveTheoryDevelopmentCall(f.root,f.settings,f.authority);
 const before=await readTheoryBudget(f.root,f.settings);
 await authorizeAdditionalTheoryDevelopmentCall(f.root,f.settings);
 assert.equal(await readTheoryDevelopmentCallLimit(f.root,f.settings),7);
 assert.deepEqual(await readTheoryBudget(f.root,f.settings),before);
 for(const [name,body] of original)assert.equal(await readFile(path.join(f.root,name),"utf8"),body);
 await assert.rejects(authorizeAdditionalTheoryDevelopmentCall(f.root,f.settings),{code:"EEXIST"});
 const out=await Promise.allSettled(Array.from({length:6},()=>reserveTheoryDevelopmentCall(f.root,f.settings,f.authority)));
 assert.equal(out.filter(x=>x.status==="fulfilled").length,2);
 assert.ok(out.filter(x=>x.status==="rejected").every(x=>x.reason.code==="OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"));
 const after=await readTheoryBudget(f.root,f.settings);
 assert.equal(after.developmentUsedCalls,7);assert.equal(after.caseId,null);assert.equal(after.usedReservations,8);
 assert.equal(after.reservedMicros,8*policy.reservationMicros);assert.equal(after.remainingMicros,policy.budgetMicros-8*policy.reservationMicros);
 const restarted=await import(`../lib/owner-study/owner-pc-theory-budget.mjs?restart=${Date.now()}`);
 await assert.rejects(restarted.reserveTheoryDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"});
});

test("a changed or foreign extension fails closed without reserving a call",async()=>{
 const f=await fixture();for(let i=0;i<5;i++)await reserveTheoryDevelopmentCall(f.root,f.settings,f.authority);
 await authorizeAdditionalTheoryDevelopmentCall(f.root,f.settings);
 const file=path.join(path.dirname(f.root),"development-call-extension-20260916.json");
 const extension=JSON.parse(await readFile(file,"utf8"));
 for(const delta of [{maximumDevelopmentCalls:8},{additionalReservationMicros:0},{developmentApprovalSha256:"f".repeat(64)},{approvalId:"unapproved"}]){
  await writeFile(file,JSON.stringify({...extension,...delta}));
  await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_EXTENSION_INVALID"});
 }
 assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,6);
});

test("development status keeps shared spend but never links a personal source from the other database",async()=>{
 const {default:ts}=await import("typescript");const {runInNewContext}=await import("node:vm");
 const source=await readFile(new URL("../lib/owner-study/owner-pc-theory.ts",import.meta.url),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const personalId="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
 const shared={connectionPending:false,usedReservations:6,reservedMicros:6*policy.reservationMicros,remainingMicros:policy.budgetMicros-6*policy.reservationMicros,remainingCalls:8,caseId:personalId,developmentUsedCalls:5};
 for(const development of [false,true]){
  const output={exports:{}};
  const modules={"server-only":{},"node:path":path,"node:fs/promises":{readFile:async()=>"{}"},"./owner-pc-theory-budget.mjs":{
   validateTheorySettings:x=>x,readTheoryDevelopmentApproval:async()=>({}),readTheoryDevelopmentCallLimit:async()=>7,readTheoryBudget:async()=>shared,
  }};
  runInNewContext(compiled,{module:output,exports:output.exports,require:name=>{assert.ok(Object.hasOwn(modules,name));return modules[name];},process:{platform:"win32",env:{INVERGE_OWNER_PC_THEORY_ENABLED:"true",INVERGE_OWNER_PC_THEORY_DEVELOPMENT_ENABLED:String(development),NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:development?"http://127.0.0.1:55431":"http://127.0.0.1:55421",LOCALAPPDATA:"synthetic-private"}}});
  const status=await output.exports.ownerTheoryStatus();
  assert.equal(status.ready,true);assert.equal(status.caseId,development?null:personalId);
  assert.equal(status.remainingCalls,development?2:8);assert.equal(status.reservedMicros,shared.reservedMicros);assert.equal(status.remainingMicros,shared.remainingMicros);
  assert.equal(shared.caseId,personalId,"display projection must not rewrite the personal binding");
 }
});

test("actual Owner subject selector keeps personal Theory, explicit Practice development and disabled fallback separate",async()=>{
 const {default:ts}=await import("typescript"),{runInNewContext}=await import("node:vm");
 const source=await readFile(new URL("../lib/owner-study/owner-pc-theory.ts",import.meta.url),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const output={exports:{}},env={};
 const modules={"server-only":{},"node:path":path,"node:fs/promises":{},"./owner-pc-theory-budget.mjs":{}};
 runInNewContext(compiled,{module:output,exports:output.exports,require:name=>{assert.ok(Object.hasOwn(modules,name));return modules[name];},process:{platform:"win32",env}});
 assert.equal(output.exports.ownerPcSecondInitialSubject(),undefined);
 env.INVERGE_OWNER_PC_THEORY_ENABLED="true";assert.equal(output.exports.ownerPcSecondInitialSubject(),"감정평가이론");
 env.INVERGE_OWNER_PC_PRACTICE_DEVELOPMENT_ENABLED="true";assert.equal(output.exports.ownerPcSecondInitialSubject(),"감정평가이론");
 env.INVERGE_OWNER_PC_THEORY_DEVELOPMENT_ENABLED="true";assert.equal(output.exports.ownerPcSecondInitialSubject(),"감정평가실무");
 env.INVERGE_OWNER_PC_THEORY_ENABLED="false";assert.equal(output.exports.ownerPcSecondInitialSubject(),undefined);
});
