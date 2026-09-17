import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as domain from "../../lib/review-os/first-stage/kernel/domain.ts";
import {compilePrivateSource,privateRoute,ENVIRONMENT} from "./first-stage-private-route-harness.mjs";
import {harness,submission} from "./first-stage-private-session-harness.mjs";
import {verifyPrivateBrowser} from "./first-stage-private-browser-harness.mjs";

const TABLE="public.first_stage_private_sessions";
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const START="2026-09-09T08:00:00.000Z";
const environment={...ENVIRONMENT,VERCEL_ENV:undefined,INVERGE_OWNER_REVIEWED_BANK_ENABLED:"true"};

/** Existing actual SDK -> translated transport -> isolated PostgreSQL only.
 * No personal/remote DB, real content, real reviewer, or clock mutation. */
export async function verifyReviewedBankPostgres({sql,sdk,repository,contentInput,catalog}) {
  const bankRepository=compilePrivateSource("lib/review-os/first-stage/runtime/reviewed-bank-repository.ts",{
    "server-only":{},"../kernel/domain":domain}).createReviewedBankRepository;
  const before=await sql(`select jsonb_agg(jsonb_build_array(owner_id,session_id,revision,payload) order by session_id)::text from ${TABLE}`);
  const design=readFileSync(new URL("../../supabase/local-designs/first-stage-reviewed-bank.sql",import.meta.url),"utf8");
  await assert.rejects(sql(design,null),{code:"P0001"});
  await assert.rejects(sql("set inverge.local_first_stage_design='synthetic_only';set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null),{code:"P0001"});
  const legacy=readFileSync(new URL("./first-stage-reviewed-bank-legacy-binding.sql",import.meta.url),"utf8");
  await sql("alter table public.first_stage_private_sessions add column if not exists reviewed_bank_assignment jsonb;\n"+legacy,null);
  for(let i=0;i<2;i++) {
    await sql("set inverge.local_first_stage_design='synthetic_only';\n"+design,null);
    assert.equal(await sql(`select jsonb_agg(jsonb_build_array(owner_id,session_id,revision,payload) order by session_id)::text from ${TABLE}`),before);
  }
  assert.equal(await sql(`select relrowsecurity and relforcerowsecurity from pg_class where oid='${TABLE}'::regclass`,null),"t");
  for(const role of ["anon","authenticated"]) {
    await assert.rejects(sql(`select * from ${TABLE}`,role),{code:"42501"});
    await assert.rejects(sql("select public.inverge_reviewed_bank_reserve(null,null,null,null)",role),{code:"42501"});
  }
  const owners=Array.from({length:6},(_,i)=>`cccccccc-cccc-4ccc-8ccc-${String(i+1).padStart(12,"0")}`);
  await sql(`insert into auth.users values ${owners.map(id=>`(${literal(id)})`).join(",")}`,null);
  const subject=catalog.initialReferences[0].subjectId;
  const retryChoice=subject==="economics_principles"?4:2;
  const apiPath=subject==="economics_principles"?"/api/review-os/first-stage/sessions":"/api/review-os/first-stage/real-estate-principles/sessions";
  const open=ownerId=>{
    const h=harness({store:repository(sdk()),catalog});h.setClock(START);
    const route=privateRoute(h,{subject,ownerId,client:sdk(),repository,bankRepository,contentInput,environment});
    const send=async (body,query="")=>{
      const request=new Request(`http://127.0.0.1${apiPath}${query}`,{method:body?"POST":"GET",
        headers:{"content-type":"application/json",origin:"http://127.0.0.1"},...(body?{body:JSON.stringify(body)}:{})});
      const result=await route[body?"POST":"GET"](request);
      assert.match(result.headers.get("cache-control"),/private, no-store/);
      return {status:result.status,body:await result.json()};
    };
    return {h,route,send,assign:id=>send({action:"assign_next",requestId:id},"?view=bank")};
  };
  try {
    const a=open(owners[0]),b=open(owners[0]);
    const parallel=await Promise.all(Array.from({length:6},(_,i)=>(i%2?a:b).assign("same-request")));
    for(const result of parallel) {assert.equal(result.status,200);assert.deepEqual(result.body,parallel[0].body);}
    const view=parallel[0].body.view,sessionId=view.sessionId;
    assert.equal(view.question,null);assert.equal(view.explanation,null);
    const stored=JSON.parse(await sql(`select payload::text from ${TABLE} where session_id=${literal(sessionId)}`));
    assert.equal(stored.state.attempts.length,0);
    const assignment=await sql(`select reviewed_bank_assignment::text from ${TABLE} where session_id=${literal(sessionId)}`);
    assert.equal(JSON.parse(assignment).assignedAt,START);
    assert.equal(JSON.parse(assignment).contentAuthority,"LEARNING_ONLY");
    const reference=stored.state.examCycle.questionReferences[0];
    const begun=await a.send({sessionId,command:{action:"begin",requestId:"bank-begin",expectedRevision:1,questionId:reference.questionId}});
    assert.equal(begun.status,200);assert.ok(begun.body.view.question);assert.equal(begun.body.view.explanation,null);
    a.h.setClock("2026-09-09T08:01:00.000Z");
    const command={sessionId,command:submission(begun.body.view.attempt.attemptId,1)};
    const saved=await a.send(command);assert.equal(saved.status,200);assert.ok(saved.body.view.explanation);
    const reconnect=open(owners[0]);assert.deepEqual((await reconnect.send(undefined,`?sessionId=${sessionId}`)).body,saved.body);
    assert.deepEqual((await reconnect.assign("same-request")).body,saved.body);
    const task=saved.body.view.reviewTasks[0];assert.equal(task.dueAt,"2026-09-10T08:01:00.000Z");
    const scheduled=(await a.send()).body.continuation;
    assert.equal(scheduled.action.kind,"review_scheduled");assert.equal(scheduled.action.actionAt,task.dueAt);
    reconnect.h.setClock(task.dueAt);
    assert.equal((await reconnect.send()).body.continuation.action.kind,"review_due");
    const retry=await reconnect.send({sessionId,command:{action:"retry",requestId:"bank-retry",expectedRevision:3,reviewTaskId:task.reviewTaskId}});
    assert.equal(retry.status,200);assert.equal(retry.body.view.explanation,null);
    reconnect.h.setClock("2026-09-10T08:02:00.000Z");
    const finished=await reconnect.send({sessionId,command:{...submission(retry.body.view.attempt.attemptId,retryChoice),expectedRevision:4,requestId:"bank-retry-finish"}});
    assert.equal(finished.status,200);assert.equal(finished.body.view.reviewTasks[0].status,"completed");
    assert.deepEqual((await reconnect.assign("same-request")).body,finished.body);
    assert.deepEqual((await reconnect.send(command)).body,finished.body);
    const persisted=JSON.parse(await sql(`select payload::text from ${TABLE} where session_id=${literal(sessionId)}`));
    assert.equal(persisted.state.attempts.length,2);assert.equal(persisted.state.reviewTasks[0].status,"completed");
    const afterReview=(await reconnect.send()).body.continuation;
    assert.equal(afterReview.state,"ready");assert.ok(!afterReview.action || afterReview.action.kind!=="review_due");
    assert.equal(finished.body.view.masteryClaim,false);assert.equal(finished.body.view.transferEvidence,false);
    assert.equal(await sql(`select reviewed_bank_assignment::text from ${TABLE} where session_id=${literal(sessionId)}`),assignment);
    assert.equal(await sql(`select count(*) from ${TABLE} where owner_id=${literal(owners[0])}`),"1");
    for(const key of ["contentAuthority","candidateId","assignedAt"]) {
      await assert.rejects(sql(`update ${TABLE} set reviewed_bank_assignment=jsonb_set(reviewed_bank_assignment,'{${key}}','"tampered"') where session_id=${literal(sessionId)}`),{code:"P0001"});
    }
    const manual=await a.send({action:"create",requestId:"manual-after-bank",questionId:reference.questionId});
    assert.equal(manual.status,409);
    // Distinct requests compete for one selected stock item, never duplicate it.
    const race=open(owners[1]);
    const results=await Promise.all(Array.from({length:8},(_,i)=>race.assign(`competing-${i}`)));
    assert.ok(results.some(r=>r.status===200));
    assert.ok(results.every(r=>[200,409].includes(r.status)));
    assert.equal(await sql(`select count(*)=count(distinct payload->'state'->'examCycle'->'questionReferences'->0->>'questionId') from ${TABLE} where owner_id=${literal(owners[1])}`),"t");
    // Manual and Bank insertion use the same original lock in both orderings.
    const manualFirst=open(owners[2]);
    assert.equal((await manualFirst.send({action:"create",requestId:"manual-first",questionId:reference.questionId})).status,200);
    const next=await manualFirst.assign("after-manual");
    if(catalog.initialReferences.length>1) {
      assert.equal(next.status,200);assert.ok(next.body.view.nextQuestionId);
      assert.notEqual(next.body.view.nextQuestionId,reference.questionId);
    } else {assert.equal(next.status,409);assert.equal(next.body.error,"bank_stock_unavailable");}
    const manualRace=open(owners[3]);
    const mixed=await Promise.all([manualRace.assign("mixed-bank"),manualRace.send({action:"create",requestId:"mixed-manual",questionId:reference.questionId})]);
    assert.ok(mixed.every(r=>[200,409].includes(r.status)));
    assert.equal(await sql(`select count(*)=count(distinct payload->'state'->'examCycle'->'questionReferences'->0->>'questionId') from ${TABLE} where owner_id=${literal(owners[3])}`),"t");
    // Real React path, durable response loss/reload, genuine route+SDK+SQL.
    const browser=open(owners[4]);
    let loseSubmission=false;
    const failingSdk=createClientWithLostPatch(sdk(),()=>{if(loseSubmission){loseSubmission=false;return true;}return false;});
    const browserRoute=privateRoute(browser.h,{subject,ownerId:owners[4],client:failingSdk,repository,bankRepository,contentInput,environment});
    const result=await verifyPrivateBrowser({route:browserRoute,subject,bankPractice:true,retryChoice,
      clock:{set:browser.h.setClock,advance:ms=>browser.h.setClock(new Date(Date.parse(browser.h.getClock())+ms).toISOString())},
      failNextWrite:()=>{loseSubmission=true;}});
    assert.equal(result.browserErrors,0);assert.equal(result.externalRequests,0);
    assert.equal(await sql(`select count(*) from ${TABLE} where owner_id=${literal(owners[4])}`),"1");
    const binding=await sql(`select pg_get_constraintdef(oid) from pg_constraint where conrelid='${TABLE}'::regclass and conname='first_stage_reviewed_bank_binding'`,null);
    const after=await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`);
    if(subject==="economics_principles") {
      await sql(`alter table ${TABLE} drop constraint first_stage_reviewed_bank_binding;\n`+legacy,null);
    }
    await sql("set inverge.local_first_stage_design='synthetic_only';\n"+design,null);
    assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),after);
    await sql(`alter table ${TABLE} drop constraint first_stage_reviewed_bank_binding; alter table ${TABLE} add constraint first_stage_reviewed_bank_binding check (true);`,null);
    await assert.rejects(sql("set inverge.local_first_stage_design='synthetic_only';\n"+design,null),{code:"P0001"});
    assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),after);
    assert.equal(await sql(`select pg_get_constraintdef(oid) from pg_constraint where conrelid='${TABLE}'::regclass and conname='first_stage_reviewed_bank_binding'`,null),"CHECK (true)");
    await sql(`alter table ${TABLE} drop constraint first_stage_reviewed_bank_binding; alter table ${TABLE} add constraint first_stage_reviewed_bank_binding ${binding};`,null);
    for(const value of ["accounting",null,"civil_law"]) {
      const invalid=structuredClone(stored);invalid.sessionId+="-invalid-"+String(value);
      invalid.state.examCycle.questionReferences[0].subjectId=value;
      const invalidAssignment={...JSON.parse(assignment),learnerScopeId:invalid.sessionId};
      await assert.rejects(sql(`insert into ${TABLE}(owner_id,session_id,revision,payload,reviewed_bank_assignment) values(${literal(owners[0])},${literal(invalid.sessionId)},1,${literal(JSON.stringify(invalid))}::jsonb,${literal(JSON.stringify(invalidAssignment))}::jsonb)`),{code:"23514"});
    }
    // Exact same owner/question identity from another subject must not block a
    // reservation. Both writes still pass the real SQL checks and insert guard.
    const foreign=structuredClone(stored);foreign.sessionId+="-foreign";
    foreign.state.examCycle.questionReferences[0].subjectId=subject==="economics_principles"?"real_estate_principles":"economics_principles";
    await sql(`insert into ${TABLE}(owner_id,session_id,revision,payload) values(${literal(owners[0])},${literal(foreign.sessionId)},1,${literal(JSON.stringify(foreign))}::jsonb)`);
    assert.equal(await sql(`select count(*) from ${TABLE} where owner_id=${literal(owners[0])}`),"2");
    const reverse=structuredClone(foreign);reverse.ownerId=owners[5];reverse.sessionId+="-reverse";
    await sql(`insert into ${TABLE}(owner_id,session_id,revision,payload) values(${literal(owners[5])},${literal(reverse.sessionId)},1,${literal(JSON.stringify(reverse))}::jsonb)`);
    assert.equal((await open(owners[5]).assign("after-other-subject")).status,200);
    assert.equal(await sql(`select count(*) from ${TABLE} where owner_id=${literal(owners[5])}`),"2");
    process.stdout.write(JSON.stringify({subject,reviewedBank:"loader/HTTP/SDK/SQL/browser passed",screenshot:result.screenshot,
      sameRequest:6,competingRequests:8,duplicateOriginals:0,providerCalls:0,syntheticOnly:true})+"\n");
  } finally {
    await sql(`delete from auth.users where id in (${owners.map(literal).join(",")})`,null);
  }
  assert.equal(await sql(`select jsonb_agg(jsonb_build_array(owner_id,session_id,revision,payload) order by session_id)::text from ${TABLE}`),before);
}

// Test-only failure port: the real repository still executes the real SDK
// update/CAS, but the caller loses that completed response. No saved result stub.
function createClientWithLostPatch(client,shouldLose) {
  return new Proxy(client,{get(target,key){
    if(key!=="from")return Reflect.get(target,key);
    return (...args)=>{
      const table=target.from(...args),update=table.update.bind(table);
      table.update=(...values)=>{
        const query=update(...values),single=query.maybeSingle.bind(query);
        query.maybeSingle=async()=>{const result=await single();if(shouldLose())throw new Error("synthetic-lost-durable-response");return result;};
        return query;
      };
      return table;
    };
  }});
}
