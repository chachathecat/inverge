import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,readdir,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {THEORY_POLICY as policy, initializeTheoryBudget,testOwnerTheoryConnection,authorizeTheoryDevelopment,readTheoryDevelopmentApproval,reserveTheoryDevelopmentCall,authorizeAdditionalTheoryDevelopmentCall,readTheoryBudget,authorizePracticeDevelopment,readPracticeDevelopmentApproval,readPracticeDevelopmentCallLimit,readPracticeDevelopmentUsage,authorizeAdditionalPracticeDevelopmentCall,reservePracticeDevelopmentCall,generateOwnerTheory} from "../lib/owner-study/owner-pc-theory-budget.mjs";
const userId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function fixture(){
 const root=path.join(await mkdtemp(path.join(os.tmpdir(),"practice-shared-budget-")),"budget");
 const settings={version:policy.version,model:policy.model,ownerId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",projectId:"synthetic-project",apiKey:"synthetic-not-a-provider-key",paidProjectVerified:true,dataSharingEnabled:false,verifiedAt:new Date().toISOString(),verificationEvidenceSha256:"a".repeat(64)};
 await initializeTheoryBudget(root,settings);
 await testOwnerTheoryConnection(root,settings,async()=>Response.json({modelVersion:policy.model,candidates:[{finishReason:"STOP",content:{parts:[{text:"READY"}]}}]}));
 await authorizeTheoryDevelopment(root,settings,{userId,questionSha256:"b".repeat(64),supabaseUrl:"http://127.0.0.1:55431"});
 const theory={userId,sourceItemId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",purpose:"app1_initial_analysis",questionSha256:"b".repeat(64),development:await readTheoryDevelopmentApproval(root,settings)};
 for(let i=0;i<5;i++)await reserveTheoryDevelopmentCall(root,settings,theory);
 await authorizeAdditionalTheoryDevelopmentCall(root,settings);
 for(let i=0;i<2;i++)await reserveTheoryDevelopmentCall(root,settings,theory);
 const input={userId,questionSha256:"d".repeat(64),supabaseUrl:"http://127.0.0.1:55431",maximumCalls:4};
 const authority={userId,sourceItemId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",purpose:"app1_initial_analysis",questionSha256:input.questionSha256,practiceDevelopment:{approvalId:"owner-practice-development-20260917",supabaseUrl:input.supabaseUrl}};
 return {root,settings,theory,input,authority};
}
test("Practice requires separate approval and retains all original seven calls and personal binding",async()=>{
 const f=await fixture(), before=await readTheoryBudget(f.root,f.settings);
 const originals=new Map(await Promise.all((await readdir(f.root)).map(async n=>[n,await readFile(path.join(f.root,n),"utf8")])));
 await assert.rejects(reservePracticeDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_PRACTICE_APPROVAL_REQUIRED"});
 assert.deepEqual(await readTheoryBudget(f.root,f.settings),before);
 await authorizePracticeDevelopment(f.root,f.settings,f.input);
 await assert.rejects(authorizePracticeDevelopment(f.root,f.settings,f.input),{code:"EEXIST"});
 const out=await Promise.allSettled(Array.from({length:8},()=>reservePracticeDevelopmentCall(f.root,f.settings,f.authority)));
 assert.equal(out.filter(x=>x.status==="fulfilled").length,4);
 assert.ok(out.filter(x=>x.status==="rejected").every(x=>x.reason.code==="OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"));
 const after=await readTheoryBudget(f.root,f.settings);
 assert.equal(after.developmentUsedCalls,7);assert.equal(after.usedReservations,12);
 assert.equal(after.caseId,null);assert.equal(after.remainingMicros,948644);
 for(const [n,body]of originals)assert.equal(await readFile(path.join(f.root,n),"utf8"),body,n);
 await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.theory),{code:"OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"});
 const restarted=await import("../lib/owner-study/owner-pc-theory-budget.mjs?practice-restart");
 await assert.rejects(restarted.reservePracticeDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"});
});
test("Practice binds exact isolated account, DB and problem and never borrows Theory authority",async()=>{
 const f=await fixture();await authorizePracticeDevelopment(f.root,f.settings,f.input);
 for(const delta of [{userId:f.settings.ownerId},{questionSha256:"e".repeat(64)},{development:f.theory.development},{practiceDevelopment:{...f.authority.practiceDevelopment,supabaseUrl:"http://127.0.0.1:55421"}}])
  await assert.rejects(reservePracticeDevelopmentCall(f.root,f.settings,{...f.authority,...delta}),{code:"OWNER_THEORY_DEVELOPMENT_BINDING_MISMATCH"});
 assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,8);
 for(const suffix of ["1","2","3"])await reservePracticeDevelopmentCall(f.root,f.settings,{...f.authority,sourceItemId:"dddddddd-dddd-4ddd-8ddd-"+suffix.padStart(12,"0")});
 await assert.rejects(reservePracticeDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_DEVELOPMENT_SOURCE_LIMIT"});
});
test("unknown Practice provider outcome retains the full shared reservation without raw text",async()=>{
 const f=await fixture();await authorizePracticeDevelopment(f.root,f.settings,f.input);
 const request={contents:[{role:"user",parts:[{text:"PRIVATE_SYNTHETIC_CALCULATION"}]}],generationConfig:{temperature:0.1}};
 await assert.rejects(generateOwnerTheory(f.root,f.settings,f.authority,request,async()=>{throw Error("unknown_transport");}));
 const budget=await readTheoryBudget(f.root,f.settings);assert.equal(budget.usedReservations,9);
 const result=JSON.parse(await readFile(path.join(f.root,"result-09.json"),"utf8"));
 assert.equal(result.status,"unknown");assert.equal(result.estimatedCostMicros,null);
 for(const n of await readdir(f.root))assert.ok(!(await readFile(path.join(f.root,n),"utf8")).includes("PRIVATE_SYNTHETIC_CALCULATION"));
 assert.equal((await readPracticeDevelopmentApproval(f.root,f.settings)).maximumCalls,4);
});

test("explicit fifth Practice call preserves original approval and UNKNOWN while enforcing the shared cap across restart/concurrency",async()=>{
 const f=await fixture();await authorizePracticeDevelopment(f.root,f.settings,f.input);
 const approvalFile=path.join(path.dirname(f.root),"practice-development-approval-20260917.json");
 const originalApproval=await readFile(approvalFile,"utf8");
 await assert.rejects(authorizeAdditionalPracticeDevelopmentCall(f.root,f.settings),{code:"OWNER_THEORY_PRACTICE_EXTENSION_NOT_READY"});
 for(let i=0;i<3;i++)await reservePracticeDevelopmentCall(f.root,f.settings,f.authority);
 const originals=new Map(await Promise.all((await readdir(f.root)).map(async n=>[n,await readFile(path.join(f.root,n),"utf8")])));
 assert.deepEqual(await readPracticeDevelopmentUsage(f.root,f.settings),{usedCalls:3,maximumCalls:4});
 await authorizeAdditionalPracticeDevelopmentCall(f.root,f.settings);
 await assert.rejects(authorizeAdditionalPracticeDevelopmentCall(f.root,f.settings),{code:"EEXIST"});
 assert.equal(await readPracticeDevelopmentCallLimit(f.root,f.settings),5);
 assert.equal(await readFile(approvalFile,"utf8"),originalApproval);
 const restarted=await import("../lib/owner-study/owner-pc-theory-budget.mjs?practice-fifth-restart");
 const results=await Promise.allSettled(Array.from({length:8},()=>restarted.reservePracticeDevelopmentCall(f.root,f.settings,f.authority)));
 assert.equal(results.filter(x=>x.status==="fulfilled").length,2);
 assert.ok(results.filter(x=>x.status==="rejected").every(x=>x.reason.code==="OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"));
 assert.deepEqual(await readPracticeDevelopmentUsage(f.root,f.settings),{usedCalls:5,maximumCalls:5});
 const budget=await readTheoryBudget(f.root,f.settings);
 assert.equal(budget.usedReservations,13);assert.equal(budget.reservedMicros,4388969);assert.equal(budget.remainingMicros,611031);
 assert.equal(budget.developmentUsedCalls,7);assert.equal(budget.caseId,null);
 for(const [n,body]of originals)assert.equal(await readFile(path.join(f.root,n),"utf8"),body,n);
 await assert.rejects(reserveTheoryDevelopmentCall(f.root,f.settings,f.theory),{code:"OWNER_THEORY_DEVELOPMENT_CALL_LIMIT"});
});

test("Practice extension rejects altered authority or a forged higher original cap",async()=>{
 const f=await fixture();
 await assert.rejects(authorizePracticeDevelopment(f.root,f.settings,{...f.input,maximumCalls:5}),{code:"OWNER_THEORY_PRACTICE_APPROVAL_REQUIRED"});
 await authorizePracticeDevelopment(f.root,f.settings,f.input);
 for(let i=0;i<3;i++)await reservePracticeDevelopmentCall(f.root,f.settings,f.authority);
 await authorizeAdditionalPracticeDevelopmentCall(f.root,f.settings);
 const file=path.join(path.dirname(f.root),"practice-call-extension-20260917.json");
 const extension=JSON.parse(await readFile(file,"utf8"));
 for(const delta of [{maximumPracticeCalls:6},{additionalReservationMicros:0},{practiceApprovalSha256:"0".repeat(64)}]){
  await writeFile(file,JSON.stringify({...extension,...delta}));
  await assert.rejects(reservePracticeDevelopmentCall(f.root,f.settings,f.authority),{code:"OWNER_THEORY_PRACTICE_EXTENSION_INVALID"});
  assert.equal((await readTheoryBudget(f.root,f.settings)).usedReservations,11);
 }
});
