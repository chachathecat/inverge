import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { trialHarness, startTrial, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { createPrivateSessionApplication } from "../lib/review-os/first-stage/runtime/session-application.ts";
import { loadPrivateReviewedContent } from "../lib/review-os/first-stage/runtime/private-reviewed-content.ts";
import { harness as reviewedHarness } from "./fixtures/first-stage-private-session-harness.mjs";
import { createPrivateFirstStageSessionService } from "../lib/review-os/first-stage/runtime/session-service.ts";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { compilePrivateSource } from "./fixtures/first-stage-private-route-harness.mjs";
import { createOwnerLocalTrialApplication } from "../lib/review-os/first-stage/runtime/owner-local-trial-context.ts";

test("actual loader/HTTP reconnect returns the durable submitted choice, not client memory",async()=>{
  const h=trialHarness();h.setClock("2026-09-08T00:00:00.000Z");const ids=await startTrial(h);
  assert.equal(ids.begun.body.view.submittedResponse,null);
  h.setClock("2026-09-08T00:01:00.000Z");
  const request={sessionId:ids.sessionId,command:submission(ids.attemptId,1)};
  const saved=await h.send(request);assert.equal(saved.status,200);
  const recap=saved.body.view.submittedResponse;
  assert.equal(recap.selectedChoice,1);assert.equal(recap.previousChoice,null);
  assert.equal(recap.confidence,"medium");assert.equal(recap.answerChanged,false);
  assert.equal(recap.submittedAt,h.getClock());assert.equal(recap.attemptId,ids.attemptId);
  assert.equal(recap.assistanceLevel,"none");assert.equal(recap.contentMode,"first_stage.owner_local_trial_session.v1");
  assert.doesNotMatch(JSON.stringify(recap),/workTrace|correctChoice|evidenceEnvelope|SYNTHETIC_SECRET/);
  const snapshot=JSON.stringify([...h.rows.values()]);
  const reopened=trialHarness({rows:h.rows,fixture:h.fixture});reopened.setClock(h.getClock());
  // Simulate a lost successful response: reload and identical retry must read
  // the same stored winner rather than echoing an optimistic request.
  assert.deepEqual((await reopened.send(undefined,`?sessionId=${ids.sessionId}`)).body.view.submittedResponse,recap);
  assert.deepEqual((await reopened.send(request)).body.view.submittedResponse,recap);
  const today=(await reopened.send(undefined,"?view=today")).body;
  assert.doesNotMatch(JSON.stringify(today),/selectedChoice|previousChoice|submittedResponse/);
  assert.equal(JSON.stringify([...h.rows.values()]),snapshot);
});

test("failed save exposes no recap; competing submissions return only the durable winner",async()=>{
  const h=trialHarness();h.setClock("2026-09-08T00:00:00.000Z");const ids=await startTrial(h);
  h.setClock("2026-09-08T00:01:00.000Z");h.failNextWrite();
  const failed=await h.send({sessionId:ids.sessionId,command:submission(ids.attemptId,1)});
  assert.notEqual(failed.status,200);assert.equal(failed.body.view,undefined);
  assert.equal((await h.send(undefined,`?sessionId=${ids.sessionId}`)).body.view.submittedResponse,null);
  const requests=[1,2].map(choice=>({sessionId:ids.sessionId,command:{...submission(ids.attemptId,choice),requestId:`choice-${choice}`}}));
  const results=await Promise.all(requests.map(request=>h.send(request)));
  assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);
  const winner=results.find(row=>row.status===200).body.view;
  const durable=[...h.rows.values()][0].state.attempts[0];
  assert.equal(winner.submittedResponse.selectedChoice,durable.submission.selectedChoice);
  assert.deepEqual((await h.send(undefined,`?sessionId=${ids.sessionId}`)).body.view.submittedResponse,winner.submittedResponse);
  assert.equal(winner.reviewTasks.length,1);assert.equal(h.rows.size,1);
});

test("recap preserves submitted confidence/change and distinguishes an unanswered response",async()=>{
  for(const unanswered of [false,true]) {
    const h=trialHarness();h.setClock("2026-09-08T00:00:00.000Z");const ids=await startTrial(h);
    h.setClock("2026-09-08T00:01:00.000Z");const command=submission(ids.attemptId,1);
    command.submission={...command.submission,selectedChoice:unanswered?null:1,
      confidence:unanswered?"low":"high",answerChanged:!unanswered,previousChoice:unanswered?null:2,
      workTrace:{schemaVersion:"first_stage.work_trace.v1",steps:unanswered?[
        {sequence:1,kind:"read_stem",atElapsedMs:1000,choiceId:null}]:[
        {sequence:1,kind:"select_answer",atElapsedMs:1000,choiceId:2},
        {sequence:2,kind:"change_answer",atElapsedMs:2000,choiceId:1}]}};
    const result=await h.send({sessionId:ids.sessionId,command});assert.equal(result.status,200,JSON.stringify(result.body));
    const recap=result.body.view.submittedResponse;
    assert.equal(recap.selectedChoice,unanswered?null:1);assert.equal(recap.confidence,unanswered?"low":"high");
    assert.equal(recap.answerChanged,!unanswered);assert.equal(recap.previousChoice,unanswered?null:2);
    assert.deepEqual(Object.keys(recap).sort(),["attemptId","questionId","questionVersion","questionNumber","selectedChoice",
      "confidence","answerChanged","previousChoice","submittedAt","assistanceLevel","contentMode"].sort());
  }
});

test("active retry suppresses original recap; completed retry and old request replay show latest durable attempt",async()=>{
  const h=trialHarness();h.setClock("2026-09-08T00:00:00.000Z");const ids=await startTrial(h);
  h.setClock("2026-09-08T00:01:00.000Z");const original={sessionId:ids.sessionId,command:submission(ids.attemptId,1)};
  const first=(await h.send(original)).body.view;h.setClock(first.reviewTasks[0].dueAt);
  const begun=await h.send({sessionId:ids.sessionId,command:{action:"retry",requestId:"recap-retry",expectedRevision:first.revision,reviewTaskId:first.reviewTasks[0].reviewTaskId}});
  assert.equal(begun.status,200);assert.equal(begun.body.view.submittedResponse,null);assert.equal(begun.body.view.explanation,null);
  h.setClock(new Date(Date.parse(h.getClock())+60_000).toISOString());
  const retried=await h.send({sessionId:ids.sessionId,command:{...submission(begun.body.view.attempt.attemptId,2),requestId:"recap-retry-submit",expectedRevision:begun.body.view.revision}});
  assert.equal(retried.status,200);const recap=retried.body.view.submittedResponse;
  assert.equal(recap.selectedChoice,2);assert.notEqual(recap.attemptId,ids.attemptId);
  const latest=[...h.rows.values()][0].state.attempts.at(-1);
  assert.equal(recap.questionId,latest.questionReference.questionId);assert.equal(recap.questionVersion,latest.questionReference.questionVersion);
  const snapshot=JSON.stringify([...h.rows.values()]);
  assert.deepEqual((await h.send(original)).body.view.submittedResponse,recap);
  assert.equal(JSON.stringify([...h.rows.values()]),snapshot);
});

test("recap remains unavailable to other owners, client projections and invalid stored versions",async()=>{
  const h=trialHarness();h.setClock("2026-09-08T00:00:00.000Z");const ids=await startTrial(h);
  h.setClock("2026-09-08T00:01:00.000Z");
  const request={sessionId:ids.sessionId,command:submission(ids.attemptId,1)};
  assert.equal((await h.send({...request,command:{...request.command,submittedResponse:{selectedChoice:2}}})).status,400);
  assert.equal((await h.send(request)).status,200);
  const other=trialHarness({fixture:h.fixture,rows:h.rows,session:{userId:"another-owner"}});
  const denied=await other.send(undefined,`?sessionId=${ids.sessionId}`);assert.notEqual(denied.status,200);assert.equal(denied.body.view,undefined);
  const stored=[...h.rows.values()][0];stored.state.attempts[0].questionReference.questionVersion="invalid-version";
  const corrupt=await h.send(undefined,`?sessionId=${ids.sessionId}`);assert.notEqual(corrupt.status,200);assert.equal(corrupt.body.view,undefined);
});

test("actual NextRequest GET/POST normalization preserves CSRF and durable trial command flow",async()=>{
  const h=trialHarness();
  const send=async(body,headers={})=>{
    const response=await h.application(new NextRequest("http://127.0.0.1:3883/api/trial",{
      method:"POST",headers:{host:"127.0.0.1:3883",origin:"http://127.0.0.1:3883","content-type":"application/json",...headers},body:JSON.stringify(body)}));
    return {status:response.status,body:await response.json()};
  };
  const create={action:"create",requestId:"next-create",questionId:"qnet-2025-36-s1-A-46"};
  assert.equal((await send(create,{origin:"http://evil.invalid"})).status,404);assert.equal(h.rows.size,0);
  assert.equal((await send(create,{"sec-fetch-site":"cross-site"})).status,404);assert.equal(h.rows.size,0);
  assert.equal((await send({...create,padding:"x".repeat(16385)})).status,413);assert.equal(h.rows.size,0);
  const created=await send(create);assert.equal(created.status,200);
  const sessionId=created.body.view.sessionId;
  const begun=await send({sessionId,command:{action:"begin",requestId:"next-begin",expectedRevision:1,questionId:create.questionId}});
  assert.equal(begun.status,200);assert.equal(begun.body.view.explanation,null);
  h.setClock(new Date(Date.parse(h.getClock())+60000).toISOString());
  const command=submission(begun.body.view.attempt.attemptId,2);
  const [saved,retry]=await Promise.all([send({sessionId,command}),send({sessionId,command})]);
  assert.equal(saved.status,200);assert.deepEqual(retry,saved);assert.equal(h.rows.size,1);
  const reopened=await h.application(new NextRequest(`http://127.0.0.1:3883/api/trial?sessionId=${sessionId}`,{headers:{host:"127.0.0.1:3883"}}));
  assert.equal(reopened.status,200);assert.deepEqual((await reopened.json()).view,saved.body.view);
});

test("real loader/adapter/HTTP keeps trial presentation, durable evaluation, reconnect and D+1 retry explicitly unreviewed", async () => {
  const h = trialHarness();
  const available = await h.send(); assert.equal(available.status,200);
  assert.equal(available.body.availability.questions.length,1);
  assert.equal(JSON.stringify(available.body).includes("SYNTHETIC_CANDIDATE_EXPLANATION"),false);
  const {sessionId,attemptId,begun} = await startTrial(h);
  assert.equal(begun.body.view.explanation,null);
  assert.equal(begun.body.view.question.questionReference.rightsState,"observed_owner_local_only");
  h.setClock("2026-09-06T10:01:00.000Z");
  const command = submission(attemptId,2);
  h.failNextWrite(); const failed = await h.send({sessionId,command});
  assert.equal(failed.status,503); assert.equal(JSON.stringify(failed.body).includes("EXPLANATION"),false);
  const [a,b] = await Promise.all([h.send({sessionId,command}),h.send({sessionId,command})]);
  for(const result of [a,b]) {
    assert.equal(result.status,200); assert.equal(result.body.view.contentStatus,"human_unreviewed_owner_local");
    assert.match(result.body.view.explanation.text,/SYNTHETIC_CANDIDATE_EXPLANATION/);
    assert.equal(result.body.view.humanReviewComplete,false); assert.equal(result.body.view.masteryClaim,false);
    assert.equal(result.body.view.measurementEvidence,false); assert.equal(result.body.view.transferEvidence,false);
  }
  const saved = [...h.rows.values()][0];
  assert.equal(saved.schemaVersion,"first_stage.owner_local_trial_session.v1");
  assert.equal(saved.state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.reviewerIdentity,null);
  assert.equal(saved.state.reviewTasks.length,1); assert.equal(h.rows.size,1);
  assert.equal(JSON.stringify(saved).includes("SYNTHETIC_CANDIDATE_EXPLANATION"),false);
  assert.equal((await h.send(undefined,`?sessionId=${sessionId}`)).body.view.explanation.text,a.body.view.explanation.text);
  const reviewTaskId=saved.state.reviewTasks[0].reviewTaskId, dueAt=saved.state.reviewTasks[0].dueAt;
  assert.equal(dueAt,"2026-09-07T10:01:00.000Z"); h.setClock(dueAt);
  const retry = await h.send({sessionId,command:{action:"retry",requestId:"retry-1",expectedRevision:3,reviewTaskId}});
  assert.equal(retry.status,200); assert.equal(retry.body.view.explanation,null);
  h.setClock("2026-09-07T10:02:00.000Z");
  const retryCommand={...submission(retry.body.view.attempt.attemptId,4),requestId:"retry-submit",expectedRevision:4};
  assert.equal((await h.send({sessionId,command:retryCommand})).status,200);
  const replay=await h.send({sessionId,command}); assert.equal(replay.body.view.reviewTasks[0].status,"completed");
  const final=[...h.rows.values()][0];
  assert.equal(final.state.independentRetries.length,1);
  assert.equal(final.state.independentRetries[0].lineageReceipt.decision,"unreviewed_owner_local_practice_retry");
  assert.equal(final.state.attempts[1].exposureState,"unreviewed_local_variant");
  assert.equal(final.state.reviewTasks[0].dueAt,dueAt);
  assert.ok(final.state.conceptStates.every(row=>row.masteryClaim===false));
});

test("missing/tampered evidence, changed version and original key mismatch cannot enter the HTTP trial inventory", async () => {
  for(const kind of ["missing","byte-change","version","official-key","missing-key-row","synthetic-default"]) {
    const fixture=syntheticTrialInput();
    if(kind==="missing") fixture.input.installation=null;
    if(kind==="byte-change") fixture.artifacts.candidate=Buffer.from("{}");
    if(kind==="version") {const c=JSON.parse(fixture.artifacts.candidate);c.version="changed-v2";fixture.rebind("candidate",c);}
    if(kind==="official-key"||kind==="missing-key-row") {const k=JSON.parse(fixture.artifacts.keyObservation);
      if(kind==="official-key") k.groups[1].answers[5]=[3];else k.groups[2].answers.pop();fixture.rebind("keyObservation",k);}
    if(kind==="synthetic-default") delete fixture.input.expectedDataClass;
    const h=trialHarness({fixture}),result=await h.send();
    assert.equal(result.body.availability.state,"blocked",kind);assert.equal(h.rows.size,0);
  }
});

test("reconnect rejects persisted trial promotion and reviewed services reject trial sessions even with a matching catalog digest",async()=>{
  const h=trialHarness(),{sessionId,attemptId}=await startTrial(h);h.setClock("2026-09-06T10:01:00.000Z");
  assert.equal((await h.send({sessionId,command:submission(attemptId,2)})).status,200);
  const [key,original]=[...h.rows.entries()][0];
  for(const mutate of [row=>{row.schemaVersion="first_stage.private_session.v1"},
    row=>{row.state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.state="reviewed_available"},
    row=>{row.state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.reviewerIdentity="invented-human"},
    row=>{row.state.conceptStates[0].masteryClaim=true}]) {
    const changed=structuredClone(original);mutate(changed);h.rows.set(key,changed);
    const response=await h.send(undefined,`?sessionId=${sessionId}`);
    assert.ok(response.status>=400);assert.equal(response.body.view,undefined);
  }
  h.rows.set(key,original);
  const normal=reviewedHarness(),forgedDigestCatalog={...normal.catalog,digest:original.catalogDigest};
  const ordinary=createPrivateFirstStageSessionService(h.store,forgedDigestCatalog);
  await assert.rejects(ordinary.view(original.ownerId,sessionId),{code:"adapter_mismatch"});
  assert.equal((await h.send(undefined,`?sessionId=${sessionId}`)).body.view.contentStatus,"human_unreviewed_owner_local");
});
test("trial content cannot enter the reviewed loader or be authorized by HTTP fields or non-local sessions",async()=>{
  const fixture=syntheticTrialInput();
  assert.equal(await loadPrivateReviewedContent("economics_principles",{approvals:[],readBytes:()=>fixture.input.readArtifact("candidate")}),null);
  for(const options of [{env:{INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED:"false"}},{env:{VERCEL_ENV:"preview"}},
    {env:{VERCEL_ENV:"production"}},{session:{source:"smoke"}},{session:{isAuthenticated:false}},{session:{email:"another@example.test"}}]) {
    const h=trialHarness(options);assert.equal((await h.send()).status,404);assert.equal(h.catalogReads(),0);
  }
  const h=trialHarness();
  for(const extra of [{mode:"trial"},{reviewed:true},{ownerId:"other"}]) assert.equal((await h.send({action:"create",requestId:"inject",questionId:"qnet-2025-36-s1-A-46",...extra})).status,400);
  // Even the same server loader cannot register this adapter in the normal app.
  const ordinary=createPrivateSessionApplication({environment:()=>h.env,session:async()=>({isAuthenticated:true,userId:"synthetic-owner",email:"synthetic@example.test"}),
    catalog:async()=>{const {loadOwnerLocalR3TrialContent}=await import("../lib/review-os/first-stage/runtime/owner-local-trial-content.ts");return loadOwnerLocalR3TrialContent(fixture.input);},repository:()=>h.store});
  const result=await ordinary(new Request("http://127.0.0.1:3883/api/normal"));
  assert.equal((await result.json()).availability.state,"blocked");
});

test("actual trial page/RSC passes choice-mode metadata only, has no assisted content, and denied page renders no shell",async()=>{
  const component=compilePrivateSource("components/review-os/first-stage-private-practice.tsx",{react:React,"react/jsx-runtime":jsx});
  const workbench=compilePrivateSource("components/review-os/owner-local-trial-workbench.tsx",{react:React,"react/jsx-runtime":jsx,
    "./first-stage-private-practice":component});
  let allowed=true,shells=0;
  const page=compilePrivateSource("app/(owner-first-stage)/app/first-stage/economics-trial/page.tsx",{
    "react/jsx-runtime":jsx,"next/navigation":{notFound(){throw new Error("not_found")}},
    "@/components/review-os/app-shell":{ReviewOsAppShell:({children})=>{shells++;return children}},
    "@/components/review-os/owner-local-trial-workbench":workbench,
    "@/lib/review-os/first-stage/runtime/owner-local-trial-server":{requireOwnerLocalTrialPage:async()=>allowed?{email:"synthetic@example.test"}:null}
  });
  const tree=await page.default();assert.deepEqual(tree.props.children.props,{});
  const html=renderToStaticMarkup(tree);
  assert.match(html,/로컬 학습 경로를 확인합니다/);
  assert.doesNotMatch(html,/SYNTHETIC_CANDIDATE|correctChoice|EXPLANATION|검토 전 제시 정답/);
  allowed=false;await assert.rejects(page.default(),/not_found/);assert.equal(shells,1);
});

test("auth or environment failures return a closed no-store error without exception data or catalog access",async()=>{
  const h=trialHarness();let reads=0;
  for(const failAt of ["auth","environment"]) {
    const app=createOwnerLocalTrialApplication({environment:()=>{if(failAt==="environment")throw new Error("PRIVATE_CONFIGURATION");return h.env;},
      session:async()=>{throw new Error("PRIVATE_AUTH_EXCEPTION")},catalog:async()=>{reads++;return null},repository:()=>h.store});
    const response=await app(new Request("http://127.0.0.1:3883/api/trial"));
    assert.equal(response.status,503);assert.match(response.headers.get("cache-control"),/private, no-store/);
    assert.deepEqual(await response.json(),{ok:false,error:"temporarily_unavailable"});
  }
  assert.equal(reads,0);
});
