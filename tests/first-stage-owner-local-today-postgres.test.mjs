import assert from "node:assert/strict";
import test from "node:test";
import { isolatedPlanningPostgres, PG_OWNER, PG_OTHER, literal } from "./fixtures/owner-local-planning-postgres-harness.mjs";
import { trialHarness, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { verifyOwnerLocalTodayBrowser } from "./fixtures/owner-local-today-browser-harness.mjs";

test("S01/S04/S05/S07/S11 real local Today HTTP and SDK/PG persist/restart/replay without duplicate or reviewed mixing",{timeout:240_000},async()=>{
  const pg=await isolatedPlanningPostgres();
  try {
    const fixture=syntheticTrialInput({numericTrialModels:true});
    const make=(owner=PG_OWNER)=>{const h=trialHarness({fixture,store:pg.repository(),planningStore:pg.planningRepository(),session:{userId:owner}});h.setClock("2026-09-08T00:00:00.000Z");return h;};
    const h=make(),today=async instance=>(await instance.send(undefined,"?view=today")).body.today;
    const prefs={remainingMinutes:150,lifeMode:"custom",phase:"coverage",windows:[{id:"desk",startMinute:540,endMinute:1440,environment:"desk",interruptibility:"low"}]};
    assert.equal((await today(h)).state,"availability_required");
    const save={action:"save_availability",input:{requestId:"pg-prefs",expectedRevision:0,preferences:prefs}};
    pg.loseNext("planning:POST");assert.equal((await h.send(save,"?view=today")).status,503);
    const configured=await h.send(save,"?view=today");assert.equal(configured.status,200);assert.equal(configured.body.today.preferencesRevision,1);
    assert.deepEqual(await today(make()),configured.body.today);
    const notYet=configured.body.today.actions[1];
    const untouched=await pg.snapshot();
    assert.equal((await h.send({action:"start_planned",input:{planId:configured.body.today.planId,actionId:notYet.id}},"?view=today")).status,409);
    assert.equal(await pg.snapshot(),untouched);
    assert.equal((await today(make(PG_OTHER))).history.length,0);
    for(const role of ["anon","authenticated"]) {
      await assert.rejects(pg.sql("select * from public.first_stage_owner_local_planning",role),{code:"42501"});
      await assert.rejects(pg.sql(`select public.inverge_owner_local_reserve_original(${literal(PG_OWNER)}::uuid,'x','{}'::jsonb)`,role),{code:"42501"});
    }
    assert.equal(await pg.sql("select relrowsecurity and relforcerowsecurity from pg_class where oid='public.first_stage_owner_local_planning'::regclass",null),"t");
    // Three different post-commit failures: intent, original insert, begin CAS.
    let firstId,firstDue;
    for(const [number,point] of [[49,"session:PATCH"],[46,"planning:PATCH"],[51,"rpc"]]) {
      const plan=await today(h),action=plan.actions.find(item=>item.kind==="new"&&item.questionNumber===number);assert.ok(action);
      const scheduled=plan.plan.executionBlocks.find(block=>block.candidateId===action.id);
      h.setClock(new Date(Math.max(Date.parse(h.getClock()),Date.parse("2026-09-07T15:00:00.000Z")+scheduled.startMinute*60_000)+1_000).toISOString());
      const request={action:"start_planned",input:{planId:plan.planId,actionId:action.id}};
      pg.loseNext(point);assert.equal((await h.send(request,"?view=today")).status,503);
      const restart=make();restart.setClock(h.getClock());const [a,b]=await Promise.all([restart.send(request,"?view=today"),h.send(request,"?view=today")]);
      assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.body,b.body);
      const sessionId=a.body.started.sessionId,opened=(await h.send(undefined,`?sessionId=${sessionId}`)).body.view;
      assert.equal(opened.revision,2);assert.equal(opened.explanation,null);
      h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
      const command={sessionId,command:{...submission(opened.attempt.attemptId,2),requestId:`pg-submit-${number}`}};
      pg.loseNext("session:PATCH");assert.equal((await h.send(command)).status,503);
      const replay=await h.send(command);assert.equal(replay.status,200);
      assert.equal(replay.body.view.humanReviewComplete,false);assert.equal(replay.body.view.masteryClaim,false);assert.equal(replay.body.view.transferEvidence,false);
      if(number===46){firstId=sessionId;firstDue=replay.body.view.reviewTasks[0].dueAt;}
      const preserved=await pg.snapshot();assert.equal((await h.send(request,"?view=today")).status,200);assert.equal(await pg.snapshot(),preserved);
    }
    const after=await today(h);assert.equal(after.remainingMinutes,105);assert.equal(after.completionDebitMinutes,45);
    assert.equal(after.history.length,3);assert.equal(after.actions[0].questionNumber,53);
    assert.doesNotMatch(JSON.stringify(after),/SYNTHETIC_CANDIDATE|correctChoice|EXPLANATION|selectedChoice|workTrace|evidenceEnvelope/);
    assert.equal((await today(make())).history.find(row=>row.sessionId===firstId).reviews[0].dueAt,firstDue);
    const preserved=await pg.snapshot();await pg.apply();assert.equal(await pg.snapshot(),preserved);
    const security=await pg.sql("select coalesce(jsonb_agg(jsonb_build_array(relname,relrowsecurity,relforcerowsecurity)),'[]') from pg_class where relname in ('first_stage_private_sessions','first_stage_owner_local_planning')",null);
    assert.ok(!security.includes("false"));
    // Virtual clock ONLY in this networkless synthetic fixture; actual next-day observation stays separate.
    h.setClock(new Date(Date.parse(h.getClock())+86_400_000+60_000).toISOString());
    const old=await today(h);assert.equal(old.state,"availability_required");
    const tomorrow=await h.send({action:"save_availability",input:{requestId:"pg-next-day",expectedRevision:old.preferencesRevision,preferences:prefs}},"?view=today");
    assert.equal(tomorrow.status,200);assert.ok(tomorrow.body.today.actions.some(action=>action.kind==="retry"));
    const futureRetry=tomorrow.body.today.actions.find(action=>action.sessionId===firstId);
    assert.equal((await h.send({action:"start_planned",input:{planId:tomorrow.body.today.planId,actionId:futureRetry.id}},"?view=today")).status,409);
    const retryBlock=tomorrow.body.today.plan.executionBlocks.find(block=>block.candidateId===futureRetry.id);
    // Advance ONLY the isolated clock to the server-planned block, not a
    // fixture-authored date that bypasses scheduling. Reads must not slide it.
    h.setClock(new Date(Date.parse("2026-09-08T15:00:00.000Z")+retryBlock.startMinute*60_000+1_000).toISOString());
    assert.equal((await today(h)).planId,tomorrow.body.today.planId);
    const retryRequest={action:"start_planned",input:{planId:tomorrow.body.today.planId,actionId:futureRetry.id}};
    const retried=await h.send(retryRequest,"?view=today");assert.equal(retried.status,200);
    const active=(await h.send(undefined,`?sessionId=${firstId}`)).body.view;assert.equal(active.question.questionReference.questionId,"issue883-r3-r46");
    h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
    // This synthetic candidate's independently supplied proposed choice is 4;
    // a wrong choice correctly preserves a pending task, not a completion.
    assert.equal((await h.send({sessionId:firstId,command:{...submission(active.attempt.attemptId,4),expectedRevision:4,requestId:"pg-finish-retry"}})).status,200);
    const done=await today(h);assert.equal(done.history.find(row=>row.sessionId===firstId).reviews[0].status,"completed");
    assert.equal(done.history.find(row=>row.sessionId===firstId).reviews[0].dueAt,firstDue);
    const completed=await pg.snapshot();assert.equal((await h.send(retryRequest,"?view=today")).status,200);assert.equal(await pg.snapshot(),completed);
    assert.equal(await pg.sql("select count(*) from public.first_stage_private_sessions"),"3");
    // Manual create commits after planning intent but before atomic reservation.
    const racePlan=await today(h),raceAction=racePlan.actions.find(action=>action.kind==="new"&&action.questionNumber===53);
    const savePlanning=h.planningStore.save;let raced=false;
    h.planningStore.save=async(value,revision)=>{const saved=await savePlanning(value,revision);
      if(saved&&!raced){raced=true;assert.equal((await h.send({action:"create",requestId:"manual-pg-race",questionId:raceAction.questionId})).status,200);}return saved;};
    assert.equal((await h.send({action:"start_planned",input:{planId:racePlan.planId,actionId:raceAction.id}},"?view=today")).status,409);
    assert.equal(await pg.sql("select count(*) from public.first_stage_private_sessions"),"4");
    const browser=await verifyOwnerLocalTodayBrowser(make(PG_OTHER));assert.equal(browser.externalRequests,0);
    assert.equal(await pg.sql("select count(*) from public.first_stage_private_sessions"),"5");
    await pg.cleanup();
    process.stdout.write("Today isolated PG: durable preferences/intents, concurrent replay, restart, D+1 completion, no mixing; synthetic users/rows=0, network=none\n");
  } finally {pg.close();}
});
