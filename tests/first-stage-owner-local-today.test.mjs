import assert from "node:assert/strict";
import test from "node:test";
import { trialHarness, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateSessionDigest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { NextRequest } from "next/server.js";
import { projectOwnerLocalRecovery } from "../lib/review-os/first-stage/runtime/owner-local-recovery.ts";

const query="?view=today";
const make=()=>{const h=trialHarness({fixture:syntheticTrialInput({numericTrialModels:true})});h.setClock("2026-09-08T00:00:00.000Z");return h;};
const prefs=(remainingMinutes=150,phase="coverage",windows=[{id:"desk",startMinute:540,endMinute:1440,environment:"desk",interruptibility:"low"}])=>({remainingMinutes,lifeMode:"custom",phase,windows});
const current=async h=>(await h.send(undefined,query)).body.today;
async function configure(h,preferences=prefs()) {
  const before=await current(h);
  const result=await h.send({action:"save_availability",input:{requestId:`availability-${before.preferencesRevision}`,expectedRevision:before.preferencesRevision,preferences}},query);
  assert.equal(result.status,200,JSON.stringify(result.body));return result.body.today;
}
const startPlan=(h,plan,action=plan.actions[0])=>h.send({action:"start_planned",input:{planId:plan.planId,actionId:action.id}},query);

test("saved mismatch receives recovery priority over matched practice through actual HTTP",async()=>{
  const h=make();
  const matched=await manual(h,49,"matched",{choice:2});
  const mismatched=await manual(h,46,"mismatched",{choice:1});
  assert.equal(matched.view.attempt.decision,"correct");
  assert.equal(mismatched.view.attempt.decision,"incorrect");
  const before=privateSessionDigest([...h.rows.values()]);
  h.setClock("2026-09-09T00:03:00.000Z");
  const plan=await configure(h,prefs(150,"recovery"));
  const next=plan.actions.find(action=>action.id===plan.nextActionId);
  assert.equal(next.questionNumber,46,"validated mismatch must influence due-practice placement");
  const recovery=plan.recovery.find(row=>row.sessionId===mismatched.sessionId);
  assert.equal(recovery.need,"key_mismatch");
  assert.equal(recovery.cause,"not_inferred");
  assert.equal(recovery.next,"due_practice");
  assert.equal(recovery.independentPerformanceEstablished,false);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
  assert.ok(plan.plan.coreOutcomes.length<=3);
  assert.doesNotMatch(JSON.stringify(plan),/SYNTHETIC_SECRET|selectedChoice|workTrace|evidenceEnvelope/);
  const reconnected=trialHarness({fixture:h.fixture,rows:h.rows,planningRows:h.planningRows});
  reconnected.setClock(h.getClock());
  assert.deepEqual(await current(reconnected),plan);
  const started=await startPlan(h,plan,next);
  assert.equal(started.status,200);
  const active=(await h.send(undefined,`?sessionId=${mismatched.sessionId}`)).body.view;
  assert.equal(active.explanation,null);
  assert.equal(active.reviewTasks[0].dueAt,mismatched.view.reviewTasks[0].dueAt);
});

test("recovery before D+1 shows wait and never constructs feedback or changes due times",async()=>{
  const h=make(),saved=await manual(h,49,"wait");
  const before=privateSessionDigest([...h.rows.values()]);
  const today=await current(h),recovery=today.recovery.find(row=>row.sessionId===saved.sessionId);
  assert.equal(recovery.next,"wait_until_due");
  assert.equal(recovery.dueAt,saved.view.reviewTasks[0].dueAt);
  assert.equal(recovery.feedbackAvailable,true);
  assert.equal(recovery.need,"key_mismatch");
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
  assert.doesNotMatch(JSON.stringify(today),/EXPLANATION|SYNTHETIC_SECRET|selectedChoice|workTrace/);
});

test("wrong original and wrong practice retry preserve unresolved need without inventing stock or changing completion",async()=>{
  const h=make(),first=await manual(h,46,"repeated");
  const task=first.view.reviewTasks[0];h.setClock(task.dueAt);
  const retry={sessionId:first.sessionId,command:{action:"retry",requestId:"repeat-retry",expectedRevision:3,reviewTaskId:task.reviewTaskId}};
  const started=await h.send(retry);assert.equal(started.status,200);
  let recovery=(await current(h)).recovery[0];
  assert.equal(recovery.next,"resume");assert.equal(recovery.feedbackAvailable,false);
  h.setClock(new Date(Date.parse(task.dueAt)+60_000).toISOString());
  const command={sessionId:first.sessionId,command:{...submission(started.body.view.attempt.attemptId,1),expectedRevision:4,requestId:"repeat-wrong"}};
  const saved=await Promise.all([h.send(command),h.send(command)]);
  assert.deepEqual(saved.map(result=>result.status),[200,200]);
  assert.equal(saved[0].body.view.attempt.decision,"incorrect");
  const before=privateSessionDigest([...h.rows.values()]);
  recovery=(await current(h)).recovery[0];
  assert.equal(recovery.need,"repeated_key_mismatch");
  assert.equal(recovery.mismatchCount,2);assert.equal(recovery.observedAttemptCount,2);
  assert.equal(recovery.next,"stock_required");
  // Existing kernel reschedules a failed retry; the new read projection must
  // report that actual durable value, not freeze it at the initial D+1.
  assert.equal(recovery.dueAt,saved[0].body.view.reviewTasks[0].dueAt);
  assert.equal(recovery.cause,"not_inferred");assert.equal(recovery.masteryClaim,false);
  assert.equal((await h.send(command)).status,200);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
  const restarted=trialHarness({fixture:h.fixture,rows:h.rows,planningRows:h.planningRows});restarted.setClock(h.getClock());
  assert.deepEqual((await current(restarted)).recovery,[recovery]);
  const plan=await configure(h,prefs(150,"recovery"));
  assert.equal(plan.actions.some(action=>action.sessionId===first.sessionId),false);
  assert.equal(h.rows.size,1);assert.equal([...h.rows.values()][0].state.reviewTasks.length,1);
});

test("local recovery cannot relabel reviewed history and never interprets incomplete history as new stock",async()=>{
  const h=make(),saved=await manual(h,46,"guard");
  const state=await current(h),row=state.history[0];
  assert.throws(()=>projectOwnerLocalRecovery({...row,contentMode:"first_stage.private_session.v1"},h.getClock()),{code:"adapter_mismatch"});
  assert.throws(()=>projectOwnerLocalRecovery(row,"not-a-clock"));
  h.store.listOwnerSnapshot=async()=>({sessions:[...h.rows.values()],complete:false});
  const incomplete=await current(h);assert.equal(incomplete.state,"history_incomplete");
  assert.deepEqual(incomplete.actions,[]);assert.equal(incomplete.recovery[0].sessionId,saved.sessionId);
  [...h.rows.values()][0].state.attempts[0].evaluation.decision="correct";
  const quarantined=await current(h);assert.equal(quarantined.recovery.length,0);
  assert.equal(quarantined.unavailableSessionCount,1);
});

test("scheduled dispatch rejects future blocks before any durable intent and starts only inside the server window",async()=>{
  const h=make(),plan=await configure(h,prefs(150,"coverage",[
    {id:"evening",startMinute:1080,endMinute:1200,environment:"desk",interruptibility:"low"}]));
  const before=privateSessionDigest([...h.planningRows.values()]);
  assert.equal((await startPlan(h,plan)).status,409);
  assert.equal(privateSessionDigest([...h.planningRows.values()]),before);assert.equal(h.rows.size,0);
  assert.deepEqual(plan.executableNowActionIds,[]);
  h.setClock("2026-09-08T09:00:30.000Z");
  const evening=await current(h);
  assert.deepEqual(evening.executableNowActionIds,[evening.actions[0].id]);
  assert.equal((await startPlan(h,evening,evening.actions[1])).status,409);
  const started=await startPlan(h,evening);assert.equal(started.status,200);
  const stored=[...h.rows.values()][0];assert.equal(stored.state.revision,2);
  h.setClock("2026-09-08T11:00:00.000Z");
  const digest=privateSessionDigest([...h.rows.values()]);
  assert.equal((await startPlan(h,evening)).status,200); // durable command replay, not a new start
  assert.equal(privateSessionDigest([...h.rows.values()]),digest);
});
async function manual(h,number,id,{finish=true,choice=1}={}) {
  const questionId=`qnet-2025-36-s1-A-${number}`;
  const created=await h.send({action:"create",requestId:`create-${id}`,questionId});assert.equal(created.status,200);
  const sessionId=created.body.view.sessionId;
  const begun=await h.send({sessionId,command:{action:"begin",requestId:`begin-${id}`,expectedRevision:1,questionId}});assert.equal(begun.status,200);
  if(!finish)return {sessionId,view:begun.body.view};
  h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
  const saved=await h.send({sessionId,command:{...submission(begun.body.view.attempt.attemptId,choice),requestId:`submit-${id}`}});assert.equal(saved.status,200);
  return {sessionId,view:saved.body.view};
}

test("block expiry during durable original creation preserves the row without beginning outside availability",async()=>{
  const h=make(),plan=await configure(h,prefs(150,"coverage",[
    {id:"short-desk",startMinute:540,endMinute:630,environment:"desk",interruptibility:"low"}]));
  const create=h.store.createOriginalIfAbsent.bind(h.store);
  h.store.createOriginalIfAbsent=async value=>{const result=await create(value);h.setClock("2026-09-08T01:30:00.000Z");return result;};
  assert.equal((await startPlan(h,plan)).status,409);
  assert.equal(h.rows.size,1);assert.equal([...h.rows.values()][0].state.revision,1);
  assert.equal((await startPlan(h,plan)).status,409);
});

test("later blocks arrive without sliding on read; expired slots need explicit replan, never fake completion",async()=>{
  const h=make(),plan=await configure(h),later=plan.actions[1];
  const block=plan.plan.executionBlocks.find(item=>item.candidateId===later.id);
  const before=privateSessionDigest([...h.planningRows.values()]);
  h.setClock(new Date(Date.parse("2026-09-07T15:00:00.000Z")+block.startMinute*60_000+30_000).toISOString());
  const refreshed=await current(h);
  assert.equal(refreshed.planId,plan.planId);assert.deepEqual(refreshed.plan.executionBlocks,plan.plan.executionBlocks);
  assert.equal(refreshed.nextActionId,later.id);assert.ok(refreshed.executableNowActionIds.includes(later.id));
  assert.equal(privateSessionDigest([...h.planningRows.values()]),before);
  assert.equal((await startPlan(h,plan,plan.actions[0])).status,409);
  assert.equal((await startPlan(h,plan,later)).status,200);assert.equal(h.rows.size,1);
  assert.equal([...h.rows.values()][0].state.examCycle.questionReferences[0].questionId,later.questionId);
  h.setClock("2026-09-08T14:59:00.000Z");
  const expired=await current(h);assert.equal(expired.nextActionId,null);assert.ok(expired.expiredBlockCount>0);
  assert.equal(expired.history[0].committedAttempts.length,0);
});

test("legacy planning records preserve settings but cannot invent a declaration timestamp",async()=>{
  const h=make();await configure(h);await manual(h,46,"legacy");
  for(const value of h.planningRows.values())delete value.declaredAt;
  const before=privateSessionDigest([...h.rows.values()]);const legacy=await current(h);
  assert.equal(legacy.state,"availability_required");assert.equal(legacy.history.length,1);
  assert.equal(legacy.remainingMinutes,135);
  assert.equal((await configure(h,prefs(75))).remainingMinutes,75);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
});

test("a later block retains its valid time through partial original creation and lost begin",async()=>{
  const h=make(),plan=await configure(h),later=plan.actions[1];
  const block=plan.plan.executionBlocks.find(item=>item.candidateId===later.id);
  h.setClock(new Date(Date.parse("2026-09-07T15:00:00.000Z")+block.startMinute*60_000+30_000).toISOString());
  h.failNextWrite();assert.equal((await startPlan(h,plan,later)).status,503);
  assert.equal([...h.rows.values()][0].state.revision,1);
  const retry=await startPlan(h,plan,later);assert.equal(retry.status,200);
  assert.equal(h.rows.size,1);assert.equal([...h.rows.values()][0].state.revision,2);
});

test("S01 actual local-trial HTTP exposes planning setup without creating sessions or assistance", async () => {
  const h = trialHarness({ fixture: syntheticTrialInput({ numericTrialModels: true }) });
  const result = await h.send(undefined, "?view=today");
  assert.equal(result.status, 200);
  assert.equal(result.body.today.state, "availability_required");
  assert.equal(result.body.today.inventory.originalCount, 4);
  assert.equal(result.body.today.humanReviewComplete, false);
  assert.equal(h.rows.size, 0);
  assert.doesNotMatch(JSON.stringify(result.body), /SYNTHETIC_CANDIDATE|correctChoice|EXPLANATION|selectedChoice/);
});

test("S01/S04/S11 plan -> genuine session commands -> durable result -> replan keeps trial evidence separate",async()=>{
  const h=make(); const first=await configure(h);
  assert.equal(first.state,"planned"); assert.ok(first.actions.length>0);
  assert.equal(first.actions[0].kind,"new");
  const started=await startPlan(h,first);assert.equal(started.status,200);
  const sessionId=started.body.started.sessionId;
  const begun=await h.send(undefined,`?sessionId=${sessionId}`);assert.equal(begun.body.view.revision,2);
  assert.equal(begun.body.view.explanation,null);
  const ongoing=await current(h);assert.equal(ongoing.actions[0].kind,"resume");assert.equal(ongoing.inProgressReservedMinutes,15);
  h.setClock("2026-09-08T00:01:00.000Z");
  const result=await h.send({sessionId,command:submission(begun.body.view.attempt.attemptId,1)});assert.equal(result.status,200);
  const due=result.body.view.reviewTasks[0].dueAt;
  const after=await current(h);assert.equal(after.remainingMinutes,135);assert.equal(after.completedSinceDeclaration,1);
  assert.ok(!after.actions.some(action=>action.sessionId===sessionId));
  assert.ok(after.history[0].committedAttempts.length===1);
  assert.equal(after.history[0].reviews[0].dueAt,due);
  assert.equal(after.humanReviewComplete,false);assert.equal(after.transferEvidence,false);
  assert.doesNotMatch(JSON.stringify(after),/EXPLANATION|SYNTHETIC_CANDIDATE|selectedChoice|workTrace|evidenceEnvelope/);
  const restored=trialHarness({fixture:h.fixture,rows:h.rows,planningRows:h.planningRows});restored.setClock(h.getClock());
  assert.deepEqual(await current(restored),after);
});

test("S11 concurrent tabs, lost response and completed replay reuse one planned start",async()=>{
  const h=make(),plan=await configure(h);
  const [a,b]=await Promise.all([startPlan(h,plan),startPlan(h,plan)]);
  assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.body,b.body);assert.equal(h.rows.size,1);
  const reopened=trialHarness({fixture:h.fixture,rows:h.rows,planningRows:h.planningRows});reopened.setClock(h.getClock());
  assert.deepEqual((await startPlan(reopened,plan)).body,a.body);
  const sessionId=a.body.started.sessionId,live=(await h.send(undefined,`?sessionId=${sessionId}`)).body.view;
  h.setClock("2026-09-08T00:01:00.000Z");await h.send({sessionId,command:submission(live.attempt.attemptId,2)});
  const before=privateSessionDigest([...h.rows.values()]);
  assert.equal((await startPlan(h,plan)).status,200);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
});

test("S11 partial durable create retries the persisted dispatch without duplicate rows",async()=>{
  const h=make(),plan=await configure(h);h.failNextWrite();
  const first=await startPlan(h,plan);assert.equal(first.status,503);
  const retry=await startPlan(h,plan);assert.equal(retry.status,200);assert.equal(h.rows.size,1);
  assert.equal([...h.rows.values()][0].state.revision,2);
});

test("S05 valid real-session backlog beyond a Today cap preserves one new opportunity",async()=>{
  const h=make();
  for(let i=0;i<16;i++)await manual(h,46,`backlog-${i}`);
  h.setClock("2026-09-10T00:00:00.000Z");
  const before=privateSessionDigest([...h.rows.values()]);
  const plan=await configure(h,prefs(150));
  assert.equal(plan.history.length,16);assert.equal(plan.historyComplete,true);
  assert.equal(plan.actions[0].kind,"new");assert.equal(plan.actions[0].questionNumber,49);
  assert.equal(plan.newStudyOpportunity.selected,true);
  assert.ok(plan.plan.coreOutcomes.length<=3);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
  assert.ok(plan.plan.deferredTasks.length>0);
});

test("S06 time windows, capacity, recovery and unlimited-day shortage are explicit",async()=>{
  for(const minutes of [150,600]) {
    const h=make(),plan=await configure(h,prefs(minutes));
    assert.ok(plan.plan.plannedActiveMinutes<=minutes);
    assert.ok(plan.plan.executionBlocks.filter(block=>block.countsTowardActiveStudy).length<=4);
    assert.ok(plan.unallocatedMinutes>0);assert.equal(plan.inventory.originalCount,4);
    assert.equal(plan.plan.planGap,null);
  }
  const h=make(),fragmented=await configure(h,prefs(30,"coverage",[
    {id:"a",startMinute:540,endMinute:550,environment:"desk",interruptibility:"low"},
    {id:"b",startMinute:600,endMinute:610,environment:"desk",interruptibility:"low"},
    {id:"c",startMinute:660,endMinute:670,environment:"desk",interruptibility:"low"}]));
  assert.equal(fragmented.actions.length,0);assert.equal(fragmented.newStudyOpportunity.exception,"continuous_window_missing");
  const recovery=await configure(h,prefs(150,"recovery"));assert.equal(recovery.actions.length,0);
  assert.ok(recovery.plan.deferredTasks.every(task=>task.reason==="recovery_mode"));
});

test("S07 time reduction keeps completed work, ongoing work and original due times",async()=>{
  const h=make();const saved=await manual(h,46,"saved");await manual(h,49,"ongoing",{finish:false});
  const before=privateSessionDigest([...h.rows.values()]);
  await configure(h,prefs(600));const reduced=await configure(h,prefs(30));
  assert.equal(reduced.history.find(row=>row.sessionId===saved.sessionId).reviews[0].dueAt,saved.view.reviewTasks[0].dueAt);
  assert.equal(reduced.inProgressReservedMinutes,15);assert.equal(reduced.remainingMinutes,30);
  assert.equal(reduced.history.flatMap(row=>row.committedAttempts).length,1);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
});

test("S10 drift quarantines the affected action and preserves unrelated validated history",async()=>{
  const h=make();await manual(h,46,"a");await manual(h,49,"b");await configure(h);
  const rows=[...h.rows.values()];rows[0].catalogDigest="f".repeat(64);
  const before=privateSessionDigest(rows),plan=await current(h);
  assert.equal(plan.unavailableSessionCount,1);assert.equal(plan.history.length,1);
  assert.equal(plan.actions.filter(action=>action.kind==="new").length,0);
  assert.equal(privateSessionDigest([...h.rows.values()]),before);
});

test("S13 clients cannot inject authority/clock/owner or weaken local gates",async()=>{
  const h=make();
  for(const key of ["ownerId","state","trustedNow","declaredAt","humanReviewComplete","priorities"]) {
    const result=await h.send({action:"save_availability",input:{requestId:"invalid",expectedRevision:0,preferences:{...prefs(),[key]:true}}},query);
    assert.equal(result.status,400);
  }
  for(const env of [{VERCEL_ENV:"production"},{VERCEL_ENV:"preview"},{INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED:"false"}]) {
    const denied=trialHarness({env});assert.equal((await denied.send(undefined,query)).status,404);assert.equal(denied.catalogReads(),0);
  }
  assert.equal(h.rows.size,0);assert.equal(h.planningRows.size,0);
});

test("S11 manual original creation between plan intent and dispatch cannot produce a duplicate",async()=>{
  const h=make(),plan=await configure(h);
  const save=h.planningStore.save;let interleaved=false;
  h.planningStore.save=async(value,revision)=>{
    const saved=await save(value,revision);
    if(saved && value.dispatches.length && !interleaved) {
      interleaved=true;
      const created=await h.send({action:"create",requestId:"manual-race",questionId:plan.actions[0].questionId});
      assert.equal(created.status,200);
    }
    return saved;
  };
  const result=await startPlan(h,plan);
  assert.equal(result.status,409);
  assert.equal(h.rows.size,1);
  assert.equal([...h.rows.values()][0].state.revision,1);
});

test("S06 unsuitable early windows do not consume a later feasible desk opportunity",async()=>{
  const h=make(),windows=[
    {id:"commute",startMinute:540,endMinute:600,environment:"commute_public_transit",interruptibility:"low"},
    {id:"desk",startMinute:615,endMinute:645,environment:"desk",interruptibility:"low"}];
  const first=await configure(h,prefs(90,"coverage",windows));
  assert.ok(first.actions.length>0);
  const reordered=await configure(h,prefs(90,"coverage",[...windows].reverse()));
  assert.deepEqual(reordered.plan.executionBlocks,first.plan.executionBlocks);
});

test("S07/S11 an uncommitted persisted intent cannot start after midnight, exhausted capacity or a vanished window",async()=>{
  for(const change of ["midnight","zero","expired_window"]) {
    const h=make(),plan=await configure(h);h.failNextWrite();
    assert.equal((await startPlan(h,plan)).status,503);
    assert.equal([...h.rows.values()][0].state.revision,1);
    if(change==="midnight")h.setClock("2026-09-09T00:00:00.000Z");
    if(change==="zero")await configure(h,prefs(0));
    if(change==="expired_window")h.setClock("2026-09-08T14:59:59.000Z");
    const before=privateSessionDigest([...h.rows.values()]);
    assert.equal((await startPlan(h,plan)).status,409,change);
    assert.equal(privateSessionDigest([...h.rows.values()]),before);
  }
});

test("S05/S09 complete capped history protects new stock before candidate cap; overflow disables absence claims",{timeout:90_000},async()=>{
  const h=make();
  for(let i=0;i<256;i++)await manual(h,46,`cap-${i}`);
  h.setClock("2026-09-10T00:00:00.000Z");
  const before=privateSessionDigest([...h.rows.values()]),plan=await configure(h,prefs(600));
  assert.equal(plan.historyComplete,true);assert.equal(plan.history.length,256);
  assert.equal(plan.actions[0].kind,"new");assert.equal(plan.actions[0].questionNumber,49);
  assert.equal(plan.overflowCount,3);assert.equal(privateSessionDigest([...h.rows.values()]),before);
  await manual(h,46,"cap-overflow");const incomplete=await current(h);
  assert.equal(incomplete.state,"history_incomplete");assert.equal(incomplete.history.length,256);
  assert.equal(incomplete.historyComplete,false);assert.deepEqual(incomplete.actions,[]);
  const overflowSnapshot=privateSessionDigest([...h.rows.values()]);assert.equal((await startPlan(h,plan)).status,409);
  assert.equal(privateSessionDigest([...h.rows.values()]),overflowSnapshot);
});

test("S05/S09 sufficient successive plans cover remaining originals without cycling back; exhausted stock is explicit",async()=>{
  const h=make();await manual(h,46,"existing");const due=(await current(h)).history[0].reviews[0].dueAt;
  h.setClock("2026-09-10T00:00:00.000Z");await configure(h,prefs(600));
  for(const number of [49,51,53]) {
    const plan=await current(h);assert.equal(plan.actions[0].kind,"new");assert.equal(plan.actions[0].questionNumber,number);
    const result=await startPlan(h,plan);assert.equal(result.status,200);const sessionId=result.body.started.sessionId;
    const live=(await h.send(undefined,`?sessionId=${sessionId}`)).body.view;
    h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
    assert.equal((await h.send({sessionId,command:{...submission(live.attempt.attemptId,2),requestId:`coverage-${number}`}})).status,200);
  }
  const all=await current(h);assert.equal(all.actions.some(action=>action.kind==="new"),false);
  assert.equal(all.history.length,4);assert.equal(all.history.find(row=>row.questionNumber===46).reviews[0].dueAt,due);
  const short=make();for(const number of [46,49,51,53])await manual(short,number,`exhaust-${number}`);
  const none=await configure(short,prefs(600));assert.equal(none.stockExhausted,true);assert.equal(none.plan.plannedActiveMinutes,0);
  assert.equal(none.unallocatedMinutes,600);
});

test("S06 recovery defers new learning but preserves feasible required due practice without cloning it",async()=>{
  const h=make();await manual(h,46,"recovery");h.setClock("2026-09-15T00:00:00.000Z");
  const before=privateSessionDigest([...h.rows.values()]),plan=await configure(h,prefs(150,"recovery"));
  assert.ok(plan.actions.some(action=>action.kind==="retry"));assert.ok(plan.actions.every(action=>action.kind!=="new"));
  assert.equal(privateSessionDigest([...h.rows.values()]),before);assert.equal(h.rows.size,1);
});

test("S13 Today enforces actual streamed byte cap, CSRF and no-store before selector or persistence",async()=>{
  const h=make(),command=JSON.stringify({action:"save_availability",input:{requestId:"bounded",expectedRevision:0,preferences:prefs()}});
  const send=async(size,origin="http://127.0.0.1:3883")=>{
    const bytes=new TextEncoder().encode(command+" ".repeat(size-new TextEncoder().encode(command).length));let offset=0;
    const stream=new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+137));offset=Math.min(bytes.length,offset+137);}});
    const response=await h.application(new NextRequest("http://127.0.0.1:3883/api/trial?view=today",{method:"POST",headers:{host:"127.0.0.1:3883",origin,"content-type":"application/json","content-length":"1"},body:stream,duplex:"half"}));
    assert.match(response.headers.get("cache-control"),/private, no-store/);return response;
  };
  assert.equal((await send(16384)).status,200);
  const before=privateSessionDigest([...h.planningRows.values()]),reads=h.catalogReads();
  assert.equal((await send(16385)).status,413);assert.equal(h.catalogReads(),reads);
  assert.equal((await send(16384,"http://other.invalid")).status,404);assert.equal(h.catalogReads(),reads);
  assert.equal(privateSessionDigest([...h.planningRows.values()]),before);assert.equal(h.rows.size,0);
});
