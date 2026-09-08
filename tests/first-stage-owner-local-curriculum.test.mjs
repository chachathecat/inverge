import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumFixture,curriculumHarness } from './fixtures/owner-local-curriculum-harness.mjs';
import { submission } from './fixtures/first-stage-private-session-harness.mjs';
import { privateSessionDigest as digest } from '../lib/review-os/first-stage/runtime/session-service.ts';
import { trialHarness } from './fixtures/first-stage-owner-local-trial-harness.mjs';
import { CURRICULUM_INSTALLATION,readInstalledCurriculumSample,assertInstallableCurriculumSample } from '../lib/review-os/first-stage/runtime/owner-local-curriculum-policy.mjs';
const noBodies=body=>assert.doesNotMatch(JSON.stringify(body),/SYNTHETIC_SECRET_/);
test('new curriculum obeys genuine Owner/local gates before reading the catalog and rejects client-selected authority',async()=>{
 for(const options of [
  {env:{INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED:undefined}},{env:{INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED:'false'}},
  {env:{VERCEL_ENV:'preview'}},{env:{VERCEL_ENV:'production'}},{env:{NODE_ENV:'production'}},{env:{CI:'true'}},
  {session:{isAuthenticated:false}},{session:{isDemo:true}},{session:{source:'test'}},{session:{email:'non-owner@example.test'}},
 ]) {
  const h=curriculumHarness(options);for(const q of ['', '?view=today'])assert.equal((await h.send(undefined,q)).status,404);
  assert.equal(h.catalogReads(),0);assert.equal(h.rows.size,0);assert.equal(h.planningRows.size,0);
 }
 const h=curriculumHarness();for(const key of ['syntheticSamplePins','humanReviewComplete','rightsState','trustedNow','ownerId']) {
  const result=await h.send({action:'create',requestId:'hostile',questionId:'qnet-2025-36-s1-A-58',[key]:true});
  assert.equal(result.status,400);noBodies(result.body);
 }
 assert.equal(h.rows.size,0);
});
test('production installation consumer never reads sample bodies without its exact server-owned installation; synthetic pins cannot install stock',async()=>{
 let reads=0;const sample=async()=>{reads++;return Buffer.from('synthetic-body');};
 for(const value of [null,{...CURRICULUM_INSTALLATION,humanReviewComplete:true},{...CURRICULUM_INSTALLATION,fileName:'other.json'},{...CURRICULUM_INSTALLATION,syntheticSamplePins:{}},{}]) {
  const bytes=await readInstalledCurriculumSample(async()=>Buffer.from(JSON.stringify(value)),sample);assert.equal(bytes.length,0);
 }
 assert.equal(reads,0);
 assert.equal((await readInstalledCurriculumSample(async()=>Buffer.from(JSON.stringify(CURRICULUM_INSTALLATION)),sample)).toString(),'synthetic-body');assert.equal(reads,1);
 assert.throws(()=>assertInstallableCurriculumSample(curriculumFixture().input.sampleSource));
});
async function begin(h,number){const c=await h.send({action:'create',requestId:`create-${number}`,questionId:`qnet-2025-36-s1-A-${number}`});assert.equal(c.status,200,JSON.stringify(c.body));
 const sessionId=c.body.view.sessionId;const b=await h.send({sessionId,command:{action:'begin',requestId:`begin-${number}`,expectedRevision:1,questionId:`qnet-2025-36-s1-A-${number}`}});
 assert.equal(b.status,200,JSON.stringify(b.body));noBodies(b.body);return b.body.view;}
test('actual loader and HTTP admit three new groups, deny missing/coherently altered authority and withhold every aid/answer on initial reads',async()=>{
 const h=curriculumHarness();const a=await h.send();assert.equal(a.status,200);assert.equal(a.body.availability.questions.length,7);noBodies(a.body);
 for(const n of [58,62,65])await begin(h,n);
 for(const change of [p=>p.rows[0].correctChoice=1,p=>p.rows[0].stem+=' drift',p=>p.rows[0].model.ceiling=9,p=>p.rows[0].humanReview=true,p=>p.exam.year=2026,p=>p.rows[0].aids.concept+=' drift']){
  const f=curriculumFixture();change(f.packet);f.refresh();const denied=await curriculumHarness({fixture:f}).send();
  assert.equal(denied.status,200);assert.ok([4,6].includes(denied.body.availability.questions.length));
  assert.ok(!denied.body.availability.questions.some(row=>row.questionId==='qnet-2025-36-s1-A-58'));noBodies(denied.body);
 }
 const f=curriculumFixture();delete f.input.expectedDataClass;assert.equal((await curriculumHarness({fixture:f}).send()).body.availability.state,'blocked');
});
test('help persistence precedes disclosure, exposes only the selected projection and retries without duplicate exposure',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');const view=await begin(h,58);
 const command={sessionId:view.sessionId,command:{action:'help',requestId:'help-1',expectedRevision:2,attemptId:view.attempt.attemptId,kind:'prerequisite'}};
 const replace=h.store.replace;h.store.replace=async()=>{throw new Error('synthetic failure')};
 const failed=await h.send(command);assert.equal(failed.status,503);noBodies(failed.body);assert.equal([...h.rows.values()][0].state.revision,2);
 h.store.replace=replace;h.setClock('2026-09-09T00:00:01.000Z');const helped=await h.send(command);assert.equal(helped.status,200,JSON.stringify(helped.body));
 assert.equal(helped.body.view.assistanceLevel,'hint_or_scaffold');assert.equal(helped.body.view.conceptAid.kind,'prerequisite');
 assert.match(JSON.stringify(helped.body),/SYNTHETIC_SECRET_PREREQUISITE_58/);assert.doesNotMatch(JSON.stringify(helped.body),/SYNTHETIC_SECRET_(SOLUTION|CONCEPT)_/);
 const before=digest([...h.rows.values()]);assert.equal((await h.send(command)).status,200);assert.equal(digest([...h.rows.values()]),before);
 const reopened=await h.send(undefined,`?sessionId=${view.sessionId}`);assert.deepEqual(reopened.body.view,helped.body.view);
 h.setClock('2026-09-09T00:01:00.000Z');const saved=await h.send({sessionId:view.sessionId,command:{...submission(view.attempt.attemptId,1),expectedRevision:3,requestId:'submit-helped'}});
 assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.view.assistanceLevel,'hint_or_scaffold');assert.equal(saved.body.view.masteryClaim,false);
 assert.equal([...h.rows.values()][0].state.attempts[0].evaluation.errorCause,null);assert.equal(saved.body.view.reviewTasks[0].dueAt,'2026-09-10T00:01:00.000Z');
});
test('original records and legacy catalog remain byte-identical after additive loading',async()=>{
 const fixture=curriculumFixture(),old=trialHarness({fixture});old.setClock('2026-09-09T00:00:00.000Z');
 const created=await begin(old,46),command={sessionId:created.sessionId,command:submission(created.attempt.attemptId,1)};
 old.setClock('2026-09-09T00:01:00.000Z');const saved=await old.send(command);assert.equal(saved.status,200);
 const h=curriculumHarness({fixture,rows:old.rows,planningRows:old.planningRows});h.setClock(old.getClock());const before=digest([...h.rows.values()]);
 assert.equal((await h.send(undefined,`?sessionId=${created.sessionId}`)).status,200);
 assert.equal((await h.send(command)).status,200);assert.equal(digest([...h.rows.values()]),before);
 h.setClock(saved.body.view.reviewTasks[0].dueAt);
 const retry=await h.send({sessionId:created.sessionId,command:{action:'retry',requestId:'legacy-retry',expectedRevision:3,reviewTaskId:saved.body.view.reviewTasks[0].reviewTaskId}});
 assert.equal(retry.status,200,JSON.stringify(retry.body));
 const row=[...h.rows.values()][0];row.state.attempts[0].assistanceLevel='hint_or_scaffold';
 assert.ok([400,503].includes((await h.send(undefined,`?sessionId=${created.sessionId}`)).status));
});

const query='?view=today';
const today=async h=>{const r=await h.send(undefined,query);assert.equal(r.status,200,JSON.stringify(r.body));noBodies(r.body);return r.body.today;};
const preferences=(remainingMinutes=150,phase='coverage')=>({remainingMinutes,lifeMode:'custom',phase,windows:[{id:'desk',startMinute:540,endMinute:1440,environment:'desk',interruptibility:'low'}]});
async function configure(h,p=preferences()) {const state=await today(h);const command={action:'save_availability',input:{requestId:`availability-${state.preferencesRevision}`,expectedRevision:state.preferencesRevision,preferences:p}};
 const r=await h.send(command,query);assert.equal(r.status,200,JSON.stringify(r.body));return {view:r.body.today,command};}
async function select(h,number) {const view=await today(h),topic=view.curriculum.topics.find(row=>row.number===number);
 const command={action:'select_topic',input:{requestId:`topic-${number}-${view.preferencesRevision}`,expectedRevision:view.preferencesRevision,topicId:topic.topicId,mappingVersion:topic.mappingVersion,questionVersion:topic.questionVersion}};
 const response=await h.send(command,query);assert.equal(response.status,200,JSON.stringify(response.body));return {view:response.body.today,command};}

test('S01/S02/S04/S05 three real loader groups select -> optional help -> submit -> Today/reconnect without diagnosis or false independence',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');
 const initial=await today(h);assert.equal(initial.curriculum.sourcePositionCount,40);assert.equal(initial.curriculum.topics.length,40);
 assert.equal(initial.curriculum.usableOriginalCount,7);assert.equal(initial.curriculum.noSupplyCount,30);assert.equal(initial.curriculum.excludedCount,3);
 assert.equal(initial.curriculum.topics.find(row=>row.number===42).evidence,'no_attempt_evidence');
 assert.equal(initial.curriculum.topics.find(row=>row.number===42).supply,'no_usable_supply');assert.equal(h.rows.size,0);
 await configure(h);
 for(const n of [58,62,65]) {
  const selected=await select(h,n),action=selected.view.actions.find(row=>row.questionNumber===n);
  assert.equal(selected.view.newStudyOpportunity.reason,'declared_unstudied_topic');assert.ok(selected.view.executableNowActionIds.includes(action.id));
  const start={action:'start_planned',input:{planId:selected.view.planId,actionId:action.id}};
  const response=await h.send(start,query);assert.equal(response.status,200,JSON.stringify(response.body));const id=response.body.started.sessionId;
  let view=(await h.send(undefined,`?sessionId=${id}`)).body.view;noBodies(view);
  h.setClock(new Date(Date.parse(h.getClock())+1000).toISOString());
  const help=await h.send({sessionId:id,command:{action:'help',requestId:`help-${n}`,expectedRevision:2,attemptId:view.attempt.attemptId,kind:'concept'}});
  assert.equal(help.status,200);view=help.body.view;
  assert.equal((await today(h)).completionDebitMinutes,(h.rows.size-1)*15);
  const saved=await h.send({sessionId:id,command:{...submission(view.attempt.attemptId,1),expectedRevision:3,requestId:`submit-${n}`}});assert.equal(saved.status,200,JSON.stringify(saved.body));
  const result=await today(h);assert.equal(result.curriculum.topics.find(row=>row.number===n).evidence,'assisted_practice_observed');
  assert.equal(result.curriculum.topics.find(row=>row.number===n).independentPerformanceEstablished,false);
  assert.equal([...h.rows.values()].find(row=>row.sessionId===id).state.attempts[0].evaluation.errorCause,null);
  const reopened=curriculumHarness({fixture:h.fixture,rows:h.rows,planningRows:h.planningRows});reopened.setClock(h.getClock());
  assert.deepEqual(await today(reopened),result);assert.equal((await reopened.send(start,query)).status,200);
 }
 assert.equal((await today(h)).remainingMinutes,105);assert.equal(h.rows.size,3);
});

test('S10 only a changed pair is quarantined; old/new unrelated records and completed intents survive',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');await configure(h);
 const selected=await select(h,62),action=selected.view.actions.find(row=>row.questionNumber===62);
 const command={action:'start_planned',input:{planId:selected.view.planId,actionId:action.id}};
 const started=await h.send(command,query);assert.equal(started.status,200);const id=started.body.started.sessionId;
 await begin(h,58);await begin(h,46);const before=digest([...h.rows.values()]);
 h.fixture.packet.rows.find(row=>row.questionId==='qnet-2025-36-s1-A-58').aids.concept+=' changed';h.fixture.refresh();
 assert.equal((await h.send(undefined,`?sessionId=${id}`)).status,200);assert.equal((await h.send(command,query)).status,200);
 const state=(await select(h,65)).view;assert.equal(state.unavailableSessionCount,1);assert.equal(state.curriculum.usableOriginalCount,6);
 assert.ok(state.actions.some(row=>row.questionNumber===62));assert.ok(state.actions.some(row=>row.questionNumber===46));
 assert.ok(state.actions.some(row=>row.questionNumber===65));assert.ok(!state.actions.some(row=>row.questionNumber===58));
 assert.equal(digest([...h.rows.values()]),before);
});

test('S11 KST rollover retains prior dated declaration exactly once, never carries 75 minutes, including response loss/concurrency',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T14:59:00.000Z');const {command}=await configure(h,preferences(75));
 const old=structuredClone([...h.planningRows.values()][0]);h.setClock('2026-09-09T15:00:00.000Z');
 const changed=await today(h);assert.equal(changed.date,'2026-09-10');assert.equal(changed.remainingMinutes,null);assert.equal(changed.preferences,null);
 assert.equal((await h.send(command,query)).status,200);assert.deepEqual([...h.planningRows.values()][0],old);
 const newCommand={action:'save_availability',input:{requestId:'new-day',expectedRevision:old.revision,preferences:preferences(30)}};
 const save=h.planningStore.save;let lost=false;h.planningStore.save=async(value,revision)=>{const done=await save(value,revision);if(done&&!lost){lost=true;throw new Error('response lost');}return done;};
 const concurrent=await Promise.all([h.send(newCommand,query),h.send(newCommand,query)]);assert.ok(concurrent.some(row=>row.status===200));
 const retry=await h.send(newCommand,query);assert.equal(retry.status,200);assert.equal(retry.body.today.remainingMinutes,30);
 assert.deepEqual(retry.body.today.priorDateBudgets,[{date:'2026-09-09',declaredAt:old.declaredAt,declaredMinutes:75}]);
 const saved=[...h.planningRows.values()][0];assert.equal(saved.priorDates.length,1);assert.deepEqual(saved.priorDates[0].preferences,old.preferences);
 assert.equal(h.rows.size,0);
});

test('help CAS, lost committed response and backwards time never disclose unauthored or unpersisted assistance',async()=>{
 for(const competitor of ['concept','submit']) {
  const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');const view=await begin(h,58);
  h.setClock('2026-09-09T00:00:01.000Z');
  const help={sessionId:view.sessionId,command:{action:'help',requestId:'help-race',expectedRevision:2,attemptId:view.attempt.attemptId,kind:'prerequisite'}};
  const other={sessionId:view.sessionId,command:competitor==='submit'?submission(view.attempt.attemptId,1):{...help.command,kind:'concept',requestId:'other-help'}};
  const responses=await Promise.all([h.send(help),h.send(other)]);assert.deepEqual(responses.map(row=>row.status).sort(),[200,409]);
  noBodies(responses.find(row=>row.status!==200).body);assert.equal([...h.rows.values()][0].state.revision,3);
 }
 const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');const view=await begin(h,62);
 h.setClock('2026-09-09T00:00:10.000Z');const command={sessionId:view.sessionId,command:{action:'help',requestId:'lost-help',expectedRevision:2,attemptId:view.attempt.attemptId,kind:'concept'}};
 const replace=h.store.replace;let lost=false;h.store.replace=async(value,rev)=>{const done=await replace(value,rev);if(done&&!lost){lost=true;throw new Error('response lost');}return done;};
 assert.equal((await h.send(command)).status,503);const before=digest([...h.rows.values()]);assert.equal((await h.send(command)).status,200);assert.equal(digest([...h.rows.values()]),before);
 h.setClock('2026-09-09T00:00:09.000Z');
 for(const next of [{...command.command,expectedRevision:3,kind:'prerequisite',requestId:'back-help'},{...submission(view.attempt.attemptId,1),expectedRevision:3,requestId:'back-submit'}]) {
  const r=await h.send({sessionId:view.sessionId,command:next});assert.equal(r.status,409);noBodies(r.body);
 }
 assert.equal(digest([...h.rows.values()]),before);
 [...h.rows.values()][0].state.attempts[0].ownerLocalAssistance[0].aidSha256='0'.repeat(64);
 const denied=await h.send(undefined,`?sessionId=${view.sessionId}`);assert.equal(denied.status,503);noBodies(denied.body);
});

test('a topic-selection request crossing KST midnight never poisons yesterday planning state',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T14:59:59.000Z');await configure(h,preferences(75));
 const current=await today(h),topic=current.curriculum.topics.find(row=>row.number===58),before=digest([...h.planningRows.values()]);
 const load=h.planningStore.load;let reads=0;h.planningStore.load=async owner=>{const row=await load(owner);if(++reads===2)h.setClock('2026-09-09T15:00:00.000Z');return row;};
 const result=await h.send({action:'select_topic',input:{requestId:'cross-midnight',expectedRevision:current.preferencesRevision,topicId:topic.topicId,mappingVersion:topic.mappingVersion,questionVersion:topic.questionVersion}},query);
 assert.equal(result.status,409);assert.equal(digest([...h.planningRows.values()]),before);
 assert.equal((await today(h)).state,'availability_required');assert.equal((await configure(h,preferences(30))).view.remainingMinutes,30);
});

test('optional extension removal keeps exact r3 references but not new or arbitrary catalog references',async()=>{
 for(const change of [f=>delete f.input.sampleSource,f=>f.input.sampleSource=new Uint8Array(),f=>{f.packet.exam.year=2026;f.refresh();},f=>f.input.sampleSource=Buffer.from('{')]) {
  const h=curriculumHarness(),old=await begin(h,46),added=await begin(h,58),before=digest([...h.rows.values()]);change(h.fixture);
  assert.equal((await h.send(undefined,`?sessionId=${old.sessionId}`)).status,200);
  assert.ok([400,503].includes((await h.send(undefined,`?sessionId=${added.sessionId}`)).status));assert.equal(digest([...h.rows.values()]),before);
  [...h.rows.values()].find(row=>row.sessionId===old.sessionId).catalogDigest='f'.repeat(64);
  assert.equal((await h.send(undefined,`?sessionId=${old.sessionId}`)).status,503);
 }
});

test('a known quarantined pair does not block next-day redeclaration or retroactively debit recovered historical completion',async()=>{
 const h=curriculumHarness();h.setClock('2026-09-09T00:00:00.000Z');await configure(h,preferences(75));
 const view=await begin(h,58);h.setClock('2026-09-09T00:01:00.000Z');assert.equal((await h.send({sessionId:view.sessionId,command:submission(view.attempt.attemptId,1)})).status,200);
 const original=structuredClone(h.fixture.packet);h.fixture.packet.rows[0].stem+=' changed';h.fixture.refresh();
 h.setClock('2026-09-09T15:00:00.000Z');const redeclared=await configure(h,preferences(30));assert.equal(redeclared.view.remainingMinutes,30);assert.equal(redeclared.view.unavailableSessionCount,1);
 h.fixture.packet.rows=original.rows;h.fixture.refresh();const recovered=await today(h);
 assert.equal(recovered.history.length,1);assert.equal(recovered.remainingMinutes,30);assert.equal(recovered.completionDebitMinutes,0);
 assert.equal(recovered.curriculum.topics.find(row=>row.number===58).selectable,false);
});
