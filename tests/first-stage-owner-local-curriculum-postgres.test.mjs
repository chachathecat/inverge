import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumFixture,curriculumHarness } from './fixtures/owner-local-curriculum-harness.mjs';
import { trialHarness } from './fixtures/first-stage-owner-local-trial-harness.mjs';
import { isolatedPlanningPostgres,PG_OWNER } from './fixtures/owner-local-planning-postgres-harness.mjs';
import { verifyOwnerLocalTodayBrowser } from './fixtures/owner-local-today-browser-harness.mjs';
import { submission } from './fixtures/first-stage-private-session-harness.mjs';

test('isolated PostgreSQL + actual HTTP/repositories/React: all three groups, durable help, lost response and reconnect',{timeout:180000},async()=>{
 const pg=await isolatedPlanningPostgres();
 try {
  const fixture=curriculumFixture(),h=curriculumHarness({fixture,store:pg.repository(),planningStore:pg.planningRepository(),session:{userId:PG_OWNER}});
  h.setClock('2026-09-08T00:00:00.000Z');await verifyOwnerLocalTodayBrowser(h,{curriculum:true});
  const snapshot=await pg.snapshot(),rows=JSON.parse(snapshot);assert.equal(rows.length,3);
  for(const row of rows) {assert.equal(row.payload.state.attempts[0].ownerLocalAssistance.length,1);assert.equal(row.payload.state.attempts[0].assistanceLevel,'hint_or_scaffold');assert.equal(row.payload.state.reviewTasks.length,1);}
  assert.doesNotMatch(snapshot,/SYNTHETIC_SECRET_/);
  const restored=curriculumHarness({fixture,store:pg.repository(),planningStore:pg.planningRepository(),session:{userId:PG_OWNER}});restored.setClock(h.getClock());
  const today=(await restored.send(undefined,'?view=today')).body.today;assert.equal(today.remainingMinutes,105);assert.equal(today.history.length,3);
  const due=rows[0].payload.state.reviewTasks[0].dueAt;restored.setClock(due);
  const id=rows[0].payload.sessionId,task=rows[0].payload.state.reviewTasks[0],request={sessionId:id,command:{action:'retry',requestId:'d1-practice',expectedRevision:4,reviewTaskId:task.reviewTaskId}};
  const begun=await restored.send(request);assert.equal(begun.status,200,JSON.stringify(begun.body));
  const denied=await restored.send({sessionId:id,command:{action:'help',requestId:'retry-help',expectedRevision:5,attemptId:begun.body.view.attempt.attemptId,kind:'concept'}});
  assert.equal(denied.status,409);assert.doesNotMatch(JSON.stringify(denied.body),/SYNTHETIC_SECRET_/);
  restored.setClock(new Date(Date.parse(due)+1000).toISOString());
  pg.loseNext('session:PATCH');const finish={sessionId:id,command:{...submission(begun.body.view.attempt.attemptId,2),expectedRevision:5,requestId:'finish-retry'}};
  assert.equal((await restored.send(finish)).status,503);const completed=await restored.send(finish);assert.equal(completed.status,200);
  assert.equal(completed.body.view.reviewTasks[0].status,'completed');assert.equal(completed.body.view.reviewTasks[0].dueAt,due);
  const final=await pg.snapshot();assert.equal((await restored.send(request)).status,200);assert.equal(await pg.snapshot(),final);
  await pg.cleanup();
 } finally {pg.close();}
});

test('isolated existing planning row gains optional columns without record rewrite; midnight budget and catalog expansion survive CAS',{timeout:90000},async()=>{
 const pg=await isolatedPlanningPostgres();
 try {
  const fixture=curriculumFixture(),base=trialHarness({fixture,store:pg.repository(),planningStore:pg.planningRepository(),session:{userId:PG_OWNER}});
  base.setClock('2026-09-08T00:00:00.000Z');
  const prefs={remainingMinutes:75,lifeMode:'custom',phase:'coverage',windows:[{id:'desk',startMinute:540,endMinute:1440,environment:'desk',interruptibility:'low'}]};
  const declared=await base.send({action:'save_availability',input:{requestId:'old-date',expectedRevision:0,preferences:prefs}},'?view=today');assert.equal(declared.status,200);
  const plan=declared.body.today,start={action:'start_planned',input:{planId:plan.planId,actionId:plan.actions[0].id}};assert.equal((await base.send(start,'?view=today')).status,200);
  const old=await pg.snapshot();await pg.apply();assert.equal(await pg.snapshot(),old);
  const h=curriculumHarness({fixture,store:pg.repository(),planningStore:pg.planningRepository(),session:{userId:PG_OWNER}});h.setClock(base.getClock());
  assert.equal((await h.send(start,'?view=today')).status,200);assert.equal(await pg.snapshot(),old);
  h.setClock('2026-09-08T15:00:00.000Z');const fresh=(await h.send(undefined,'?view=today')).body.today;assert.equal(fresh.remainingMinutes,null);
  const save={action:'save_availability',input:{requestId:'new-date',expectedRevision:fresh.preferencesRevision,preferences:{...prefs,remainingMinutes:30}}};
  pg.loseNext('planning:PATCH');assert.equal((await h.send(save,'?view=today')).status,503);
  const results=await Promise.all([h.send(save,'?view=today'),h.send(save,'?view=today')]);assert.ok(results.every(row=>row.status===200));
  assert.deepEqual(results[0].body.today.priorDateBudgets,[{date:'2026-09-08',declaredAt:'2026-09-08T00:00:00.000Z',declaredMinutes:75}]);
  assert.equal(await pg.snapshot(),old);await pg.cleanup();
 } finally {pg.close();}
});
