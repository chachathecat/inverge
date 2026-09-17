import test from "node:test";
import assert from "node:assert/strict";
import {productionHarness,memoryTransport,seedRows,OWNER_ID,SOURCE_ID} from "./fixtures/app1-production-persistence-harness.mjs";
function fixture(subject="감정평가실무"){
 const rows=seedRows();rows.wrong_answer_items[0].subject_label=subject;
 rows.review_queue_items.push({id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",user_id:OWNER_ID,source_submission_id:SOURCE_ID,source_kind:"wrong_answer",subject_id:subject,exam_id:"wrong_answer_os",status:"pending",priority_score:80,raw_payload:{dueAt:"2026-09-17T00:00:00Z"},derived_payload:{},created_at:"2026-09-17T00:00:00Z"});
 const store=memoryTransport(rows),app=productionHarness(store.execute);
 return {store,app,service:app.load("lib/review-os/service").reviewOsService};
}
test("Practice queue completion persists recalculation and keeps Theory semantics separate",async()=>{
 for(const action of ["second_calculation_retry","second_paragraph_rewrite"]){
  const f=fixture();await f.service.completeReview(OWNER_ID,"synthetic-owner@example.invalid","eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",action,{recallOutcome:"fuzzy",rewriteParagraph:"2,222만원 / 0.06 = 37,033.3만원, 소수점 첫째 자리 반올림"});
  assert.equal(f.store.tables.review_queue_items[0].status,"completed");
  const next=f.store.tables.review_queue_items.find(x=>x.status==="pending");
  assert.match(next.raw_payload.recalculation_draft,/2,222만원/);
  assert.ok(!JSON.stringify(f.store.tables.usage_events).includes("2,222만원"));
  assert.equal(next.derived_payload.completionAction,"second_calculation_retry");
  assert.equal(next.derived_payload.rewriteTaskType,"practice_calculation_retry");
  assert.match(next.raw_payload.reviewReason,/실무.*재계산/);
  assert.equal(f.store.tables.usage_events.find(x=>x.event_type==="review_complete"||x.event_name==="review_complete")?.metadata_json?.action,"second_calculation_retry");
 }
});
test("Theory cannot accept a Practice calculation completion action",async()=>{
 const f=fixture("감정평가이론");
 await assert.rejects(f.service.completeReview(OWNER_ID,"synthetic-owner@example.invalid","eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","second_calculation_retry"));
 assert.equal(f.store.tables.review_queue_items[0].status,"pending");
});

test("Practice follow-up keeps the same subject and a recalculation action in Today",async()=>{
 const f=fixture();
 await f.service.completeReview(OWNER_ID,"synthetic-owner@example.invalid","eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","second_calculation_retry",{recallOutcome:"fuzzy",rewriteParagraph:"2,222만원 / 0.06 = 37,033.3만원, 소수점 첫째 자리 반올림"});
 const queue=await f.app.repository.listReviewQueue(OWNER_ID,100);
 const tasks=f.app.load("lib/review-os/today-plan-engine").buildTodayPlanTasks({mode:"second",queue,items:[],learningSignals:[],now:new Date("2026-09-20T00:00:00Z")});
 assert.ok(tasks.length>0);
 const task=tasks.find(x=>x.subject==="감정평가실무");
 assert.ok(task);assert.equal(task.task_type,"practice_calculation_retry");
 assert.equal(task.primary_cta.hrefKind,"review");assert.match(task.one_next_action,/산식.*단위.*반올림/);
 assert.doesNotMatch(task.one_next_action,/문단/);
});

test("Practice cannot complete from a hint or rating without a preserved calculation",async()=>{
 for(const metadata of [{},{recallOutcome:"fuzzy"},{rewriteParagraph:" "},{rewriteParagraph:"짧음"},{rewriteParagraph:"2,222만원 / 0.06 = 37,033.3만원"},{rewriteParagraph:"2,222만원 / 0.06 = 37,033.3만원",recallOutcome:"invalid"}]){
  const f=fixture();await f.service.ensureAccess(OWNER_ID,"synthetic-owner@example.invalid");const before=structuredClone(f.store.tables);
  await assert.rejects(f.service.completeReview(OWNER_ID,"synthetic-owner@example.invalid","eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","second_calculation_retry",metadata));
  assert.deepEqual(f.store.tables,before);
 }
});
