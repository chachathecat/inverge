import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {productionHarness,memoryTransport,seedRows,OWNER_ID,SOURCE_ID} from "./fixtures/app1-production-persistence-harness.mjs";
const data=JSON.parse(readFileSync(new URL("./fixtures/law-development-cases.json",import.meta.url)));
async function fixture(){
 const rows=seedRows();Object.assign(rows.wrong_answer_items[0],{subject_label:"감정평가 및 보상법규",raw_question_text:data.question,raw_answer_text:data.weak});
 const store=memoryTransport(rows),app=productionHarness(store.execute,{env:{WCV_C2R_C_L_LAW_ENABLED:"true",WCV_C2R_C_L_OWNER_EMAILS:"synthetic-owner@example.invalid"}});
 const detail=await app.repository.getWrongAnswerDetail(OWNER_ID,SOURCE_ID);
 const analysis=app.authority.createApp1AnalysisAuthority({userId:OWNER_ID,detail,draft:data.responses.weak});
 const args={userId:OWNER_ID,detail,...analysis,repairText:data.corrected,repairDraft:data.responses.corrected,lawBindingInput:data.binding,persistenceOperationId:randomUUID(),persistenceWorkRevisionId:randomUUID()};
 return {store,app,detail,analysis,args};
}
test("Law rejects arbitrary source, missing or mismatched structured applicability before confirmation",async()=>{
 const f=await fixture();
 for(const delta of [undefined,{}, {...data.binding,version:"2025-01-01"},{...data.binding,locator:"Article 11"},{...data.binding,effectiveFrom:"2026-08-16"},{...data.binding,applicableAsOf:"2025-08-15"},{...data.binding,effectiveTo:"2026-08-01"},{...data.binding,currentness:"미확인"},{...data.binding,blockerCount:"1"},{...data.binding,verified:true}])
  assert.throws(()=>f.app.authority.createApp1RepairVerificationAuthority({...f.args,lawBindingInput:delta}));
 assert.throws(()=>f.app.authority.createApp1AnalysisAuthority({userId:OWNER_ID,detail:{...f.detail,item:{...f.detail.item,rawQuestionText:data.question+" 다른 사안"}},draft:data.responses.weak}));
});
test("Law source-bound synthetic confirmation persists once and is readable without free-text proof",async()=>{
 const f=await fixture();
 const result=f.app.authority.createApp1RepairVerificationAuthority(f.args);
 assert.equal(result.verification.state,"repair_confirmed_for_this_session");assert.equal(result.verification.masteryCreated,false);
 const command={commandVersion:f.app.authority.APP1_PERSISTENCE_COMMAND_VERSION,sourceItemId:SOURCE_ID,...f.analysis,repairText:data.corrected,lawBindingInput:data.binding,persistenceOperationId:f.args.persistenceOperationId,persistenceWorkRevisionId:f.args.persistenceWorkRevisionId,verificationReceipt:result.verificationReceipt};
 const saved=await f.app.save(command);assert.equal(saved.status,200,JSON.stringify(saved.body));
 const replay=await f.app.save(command);assert.equal(replay.status,200,JSON.stringify(replay.body));
 const repairs=f.store.tables.wrong_answer_items.filter(x=>x.id!==SOURCE_ID);assert.equal(repairs.length,1);
 const reread=await f.app.repository.getWrongAnswerDetail(OWNER_ID,repairs[0].id);assert.equal(reread.item.rawAnswerText,data.corrected);
 assert.deepEqual(reread.item.rawPayload.user_confirmed_fields.app1_law_binding,data.binding);
 assert.ok(!JSON.stringify(f.store.tables.usage_events).includes(data.corrected));
 await assert.rejects(async()=>f.app.authority.authorizeApp1PersistenceCommand({userId:OWNER_ID,detail:f.detail,command:{...command,lawBindingInput:{...data.binding,applicableAsOf:"2026-08-16"}}}));
 const wrongBody=f.app.authority.createApp1RepairVerificationAuthority({...f.args,repairText:data.weak,repairDraft:{...data.responses.corrected,answerEvidenceQuote:"합성 법령"}});assert.equal(wrongBody.verificationReceipt,null);
 const note=f.app.load("lib/review-os/study-note").buildNotebookPreview(reread.item);assert.match(note.noteLabel,/실제 법률 미검증/);
 const noEvidence=f.app.authority.createApp1RepairVerificationAuthority({...f.args,repairDraft:{...data.responses.corrected,answerEvidenceQuote:"존재하지 않는 문장"}});assert.equal(noEvidence.verificationReceipt,null);
});

test("Law rejects contradictory corrected prose, stale registry and forged auxiliary fields",async()=>{
 const f=await fixture();
 for(const body of [data.weak,data.corrected.replaceAll("2026-08-15","2026-08-16"),data.corrected.replace("Article 10","Article 11"),data.corrected.replace("적용 가능","적용 불가"),data.corrected.replace("근거는 0개","근거는 1개"),data.corrected+" 또한 2025-08-15에 적용 가능하다."]){
  const result=f.app.authority.createApp1RepairVerificationAuthority({...f.args,repairText:body,repairDraft:{...data.responses.corrected,answerEvidenceQuote:body}});
  assert.equal(result.verificationReceipt,null,body);
 }
 const module=f.app.load("lib/review-os/trusted-repair-source-binding");
 const resolve=module.resolveTrustedRepairSourceBinding;
 module.resolveTrustedRepairSourceBinding=(...args)=>({...resolve(...args),sourceStatus:"UNKNOWN"});
 assert.throws(()=>f.app.authority.createApp1RepairVerificationAuthority(f.args));
});
test("unbound Law generic analysis is denied before any provider request",async()=>{
 const f=await fixture();let called=0;
 const provider=f.app.load("lib/evaluate/gemini");
 provider.structureAnswerReviewWithGemini=async()=>{called++;throw Error("provider_must_not_run_for_unbound_law");};
 const route=f.app.load("app/api/answer-review/structure/route");
 const form=new FormData();form.set("subject","감정평가 및 보상법규");form.set("examMode","second");form.set("questionText",data.question);form.set("answerText",data.weak);
 const response=await route.POST(new Request("http://localhost/api/answer-review/structure",{method:"POST",body:form}));
 assert.equal(response.status,403);assert.equal((await response.json()).errorCode,"APP1_LAW_SOURCE_UNAVAILABLE");assert.equal(called,0);
});

test("Law client fields carry no fixture bank and analysis cannot enrich with stored references",()=>{
 const fields=readFileSync(new URL("../lib/owner-study/app1-law-binding.ts",import.meta.url),"utf8");
 assert.ok(!fields.includes("trusted-repair-fixtures"));
 const route=readFileSync(new URL("../app/api/answer-review/structure/route.ts",import.meta.url),"utf8");
 assert.ok(route.includes('if (subject === "감정평가 및 보상법규") referenceText = "";'));
 assert.ok(route.includes('ownerTheoryAuthority || app1Detail?.item.subjectLabel === "감정평가 및 보상법규"'));
});
