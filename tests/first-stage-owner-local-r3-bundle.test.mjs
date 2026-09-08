import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { trialHarness, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { prepareEconomicsRuntimeCandidate } from "../lib/review-os/first-stage/runtime/economics-review-candidate.mjs";
import { supportsR3RecordedPair } from "../lib/review-os/first-stage/runtime/owner-local-r3-pair-evidence.ts";

const legacy = JSON.parse(fs.readFileSync(new URL("./fixtures/owner-local-r3-v1-session.json", import.meta.url), "utf8"));
const numbers = [46,49,51,53];
const bundleHarness = () => trialHarness({fixture:syntheticTrialInput({numericTrialModels:true})});
test("fixed r3 bundle availability is metadata-only and every pair completes its own durable HTTP loop", async () => {
  const h = bundleHarness();
  const available = await h.send();
  assert.deepEqual(available.body.availability.questions.map(row => row.questionNumber), numbers);
  assert.doesNotMatch(JSON.stringify(available.body), /SYNTHETIC_CANDIDATE|correctChoice|EXPLANATION/);
  for (const number of numbers) {
    const questionId = `qnet-2025-36-s1-A-${number}`;
    const create = {action:"create",requestId:`create-${number}`,questionId};
    const [a,b] = await Promise.all([h.send(create),h.send(create)]);
    assert.equal(a.status,200); assert.deepEqual(a.body,b.body);
    const sessionId=a.body.view.sessionId;
    const begun=await h.send({sessionId,command:{action:"begin",requestId:`begin-${number}`,expectedRevision:1,questionId}});
    assert.equal(begun.status,200); assert.equal(begun.body.view.explanation,null);
    assert.ok(begun.body.view.questionAttributions.some(text=>text.includes(`${number}번`)));
    if(number===53) assert.ok(begun.body.view.questionAttributions.some(text=>text.includes("정규화")));
    h.setClock(new Date(Date.parse(h.getClock())+60000).toISOString());
    const command=submission(begun.body.view.attempt.attemptId,2);
    const saved=await h.send({sessionId,command}); assert.equal(saved.status,200);
    assert.deepEqual((await h.send(undefined,`?sessionId=${sessionId}`)).body,saved.body);
    const task=saved.body.view.reviewTasks[0]; h.setClock(task.dueAt);
    const retry=await h.send({sessionId,command:{action:"retry",requestId:`retry-${number}`,expectedRevision:3,reviewTaskId:task.reviewTaskId}});
    assert.equal(retry.status,200); assert.equal(retry.body.view.question.questionReference.questionId,`issue883-r3-r${number}`);
    assert.equal(retry.body.view.explanation,null);
    h.setClock(new Date(Date.parse(h.getClock())+60000).toISOString());
    const finished=await h.send({sessionId,command:{...submission(retry.body.view.attempt.attemptId,4),requestId:`finish-${number}`,expectedRevision:4}});
    assert.equal(finished.status,200); assert.equal(finished.body.view.reviewTasks[0].status,"completed");
    const replay=await h.send({sessionId,command}); assert.deepEqual(replay.body,finished.body);
    assert.equal(finished.body.view.reviewTasks[0].dueAt,task.dueAt);
    for(const flag of ["humanReviewComplete","masteryClaim","transferEvidence","measurementEvidence"]) assert.equal(finished.body.view[flag],false);
    assert.equal((await h.send({action:"create",requestId:`variant-${number}`,questionId:`issue883-r3-r${number}`})).status,404);
    assert.equal((await h.send({...create,questionId:`qnet-2025-36-s1-A-${number===46?49:46}`})).status,409);
  }
  assert.equal(h.rows.size,4);
  for(const row of h.rows.values()) { assert.equal(row.state.attempts.length,2); assert.equal(row.state.reviewTasks.length,1); }
});

test("pre-expansion production-constructor snapshots reopen and replay without rewriting any saved 46 state",async()=>{
  assert.equal(legacy.dataClass,"synthetic_test_only");
  for(const original of legacy.states) {
    const h=trialHarness(), key=`${original.ownerId}/${original.sessionId}`;
    h.rows.set(key,structuredClone(original)); h.setClock("2026-09-08T10:02:00.000Z");
    const before=digest(original);
    const reopened=await h.send(undefined,`?sessionId=${original.sessionId}`);
    assert.equal(reopened.status,200,`revision ${original.state.revision}`);
    assert.equal(digest(h.rows.get(key)),before);
    for(const command of legacy.commands.slice(0,original.state.revision)) {
      assert.equal((await h.send(command)).status,200);
      assert.equal(digest(h.rows.get(key)),before);
    }
  }
});

test("legacy compatibility is exact-installation and original-46 only, never a general catalog-drift bypass",async()=>{
  const h=bundleHarness();
  const created=await h.send({action:"create",requestId:"not-46",questionId:"qnet-2025-36-s1-A-49"});
  assert.equal(created.status,200);
  const [key,row]=[...h.rows.entries()][0];
  row.catalogDigest=digest({mode:"owner-local-r3-unreviewed",installed:h.fixture.input.installation,selection:[46]});
  assert.equal((await h.send(undefined,`?sessionId=${row.sessionId}`)).status,503);
  h.rows.clear();const old=structuredClone(legacy.states[2]);
  old.catalogDigest="f".repeat(64);h.rows.set(`${old.ownerId}/${old.sessionId}`,old);
  assert.equal((await h.send(undefined,`?sessionId=${old.sessionId}`)).status,503);
  assert.ok(key); // the denial must not manufacture or rewrite a stored record.
});

test("expanded catalog consumes precisely its unchanged installation's previous 46 digest",async()=>{
  const h=bundleHarness();
  const created=await h.send({action:"create",requestId:"legacy-selection",questionId:"qnet-2025-36-s1-A-46"});
  assert.equal(created.status,200);
  const [key,row]=[...h.rows.entries()][0];
  row.catalogDigest=digest({mode:"owner-local-r3-unreviewed",installed:h.fixture.input.installation,selection:[46]});
  const before=digest(row);
  assert.equal((await h.send(undefined,`?sessionId=${row.sessionId}`)).status,200);
  assert.equal(digest(h.rows.get(key)),before);
});

test("symbolic choice-mapping gap stays pending; neither HTTP nor report approval flags install it",async()=>{
  const h=bundleHarness();
  for(const questionId of ["qnet-2025-36-s1-A-52","issue883-r3-r52"])
    assert.equal((await h.send({action:"create",requestId:"pending-52",questionId})).status,404);
  assert.equal(h.rows.size,0);
});

test("per-pair recorded-model tampering is denied even after consistent local artifact rebinding",async()=>{
  for(const [number,field,value] of [[49,"follower","999"],[49,"zeroRegimeBestQuantity","1"],
    [49,"zeroRegimeDerivativeAtBest","1"],[49,"zeroRegimeBestProfit","999"],
    [51,"cartelTotal","99"],[51,"deviator","1"],[53,"socialQuantity","13"],[53,"unitTax","1"],
    [53,"welfareImprovement","1"],[49,"price","1/0"]]) {
    const fixture=syntheticTrialInput({numericTrialModels:true});
    const calculations=JSON.parse(fixture.artifacts.calculations);
    calculations.results.find(row=>row.id===`original-${number}`).values[field]=value;
    fixture.rebind("calculations",calculations);
    const candidate=prepareEconomicsRuntimeCandidate({reviewSource:fixture.artifacts.review.toString(),
      calculationSource:fixture.artifacts.calculations.toString(),aiEvidenceSource:fixture.artifacts.ai.toString(),
      sourceObservationSource:fixture.artifacts.observation.toString(),humanChecklistSource:fixture.artifacts.checklist.toString()}).candidate;
    candidate.dataClass="synthetic_test_only";fixture.rebind("candidate",candidate);
    const h=trialHarness({fixture}),available=await h.send();
    assert.equal(available.status,200);
    assert.equal(available.body.availability.questions.some(row=>row.questionNumber===number),false,`${number}/${field}`);
    assert.equal((await h.send({action:"create",requestId:"bad-model",questionId:`qnet-2025-36-s1-A-${number}`})).status,404);
    assert.equal(h.rows.size,0);
  }
});

test("every added original remains bound to its exact full-key position",async()=>{
  for(const number of [49,51,53]) {
    const fixture=syntheticTrialInput({numericTrialModels:true});
    const key=JSON.parse(fixture.artifacts.keyObservation);key.groups[1].answers[number-41]=[5];
    fixture.rebind("keyObservation",key);
    const h=trialHarness({fixture}),r=await h.send();
    assert.equal(r.body.availability.state,"blocked");assert.equal(h.rows.size,0);
  }
});

test("51 profit must follow its recorded deviation objective, not just match a positive answer",async()=>{
  for(const id of ["original-51","r51"]) {
    for(const mutation of ["profit-only","coherent-quantities"]) {
      const fixture=syntheticTrialInput({numericTrialModels:true});
      const calculations=JSON.parse(fixture.artifacts.calculations);
      const row=calculations.results.find(entry=>entry.id===id);
      if(mutation==="profit-only") row.values.profit=String(Number(row.values.profit)+1);
      else for(const field of ["cartelTotal","follower","deviator"]) row.values[field]=String(Number(row.values[field])*2);
      // Even a consistently rebound answer must not authorize an unrelated profit.
      const review=JSON.parse(fixture.artifacts.review);
      const question=id==="original-51"?review.originals.find(entry=>entry.number===51):review.retryCandidates.find(entry=>entry.id===id);
      question.choices[(id==="original-51"?question.officialKeyObserved:question.proposedChoice)-1]=id==="original-51"?row.values.profit:row.values.deviator;
      fixture.rebind("review",review);
      calculations.reviewPacketSha256=fixture.input.installation.fileSha256.review;
      fixture.rebind("calculations",calculations);
      const ai=JSON.parse(fixture.artifacts.ai);
      ai.packetSha256=calculations.reviewPacketSha256;fixture.rebind("ai",ai);
      const candidate=prepareEconomicsRuntimeCandidate({reviewSource:fixture.artifacts.review.toString(),
        calculationSource:fixture.artifacts.calculations.toString(),aiEvidenceSource:fixture.artifacts.ai.toString(),
        sourceObservationSource:fixture.artifacts.observation.toString(),humanChecklistSource:fixture.artifacts.checklist.toString()}).candidate;
      candidate.dataClass="synthetic_test_only";fixture.rebind("candidate",candidate);
      const h=trialHarness({fixture}),available=await h.send();
      assert.equal(available.status,200);
      assert.equal(available.body.availability.questions.some(entry=>entry.questionNumber===51),false,`${id}/${mutation}`);
      assert.equal((await h.send({action:"create",requestId:"bad-51-profit",questionId:"qnet-2025-36-s1-A-51"})).status,404);
      assert.equal(h.rows.size,0);
    }
  }
});

test("49 price and objective observations cannot self-authorize by rebinding their answer",async()=>{
  for(const id of ["r49","original-49"]) {
    for(const field of ["price","profit","zeroRegimeBestProfit","zeroRegimeDerivativeAtBest"]) {
      const fixture=syntheticTrialInput({numericTrialModels:true});
      const calculations=JSON.parse(fixture.artifacts.calculations);
      const row=calculations.results.find(entry=>entry.id===id);
      row.values[field]=String(Number(row.values[field])+1);
      const review=JSON.parse(fixture.artifacts.review);
      if(id==="r49"&&field==="price") {
        const question=review.retryCandidates.find(entry=>entry.id===id);
        question.choices[question.proposedChoice-1]=row.values.price;
      }
      fixture.rebind("review",review);
      calculations.reviewPacketSha256=fixture.input.installation.fileSha256.review;
      fixture.rebind("calculations",calculations);
      const ai=JSON.parse(fixture.artifacts.ai);ai.packetSha256=calculations.reviewPacketSha256;fixture.rebind("ai",ai);
      const candidate=prepareEconomicsRuntimeCandidate({reviewSource:fixture.artifacts.review.toString(),
        calculationSource:fixture.artifacts.calculations.toString(),aiEvidenceSource:fixture.artifacts.ai.toString(),
        sourceObservationSource:fixture.artifacts.observation.toString(),humanChecklistSource:fixture.artifacts.checklist.toString()}).candidate;
      candidate.dataClass="synthetic_test_only";fixture.rebind("candidate",candidate);
      const h=trialHarness({fixture}),available=await h.send();
      assert.equal(available.status,200);
      assert.equal(available.body.availability.questions.some(entry=>entry.questionNumber===49),false,`${id}/${field}`);
      assert.equal((await h.send({action:"create",requestId:"bad-49-equation",questionId:"qnet-2025-36-s1-A-49"})).status,404);
      assert.equal(h.rows.size,0);
    }
  }
});

test("coherently rebound alternative models cannot replace the fixed r3 observations",async t=>{
  for(const number of [49,51,53]) for(const original of [true,false]) await t.test(`${original?"original-":"r"}${number}`,async()=>{
    const fixture=syntheticTrialInput({numericTrialModels:true}), id=original?`original-${number}`:`r${number}`;
    const calculations=JSON.parse(fixture.artifacts.calculations), row=calculations.results.find(entry=>entry.id===id);
    const v=row.values;
    if(number===49) {
      for(const field of ["leader","follower","zeroFollowerThreshold","zeroRegimeBestQuantity","zeroRegimeDerivativeAtBest"])v[field]=String(Number(v[field])*2);
      v.price=String((original?20:10)+Number(v.follower));
      for(const field of ["profit","zeroRegimeBestProfit"])v[field]=String(Number(v[field])*4);
    } else if(number===51) {
      for(const field of ["cartelTotal","follower","deviator"])v[field]=String(Number(v[field])*2);
      v.profit=String(Number(v.profit)*4);
    } else {
      for(const field of ["marketQuantity","socialQuantity","unitTax"])v[field]=String(Number(v[field])*2);
      v.welfareImprovement=String(Number(v.welfareImprovement)*4);
    }
    const review=JSON.parse(fixture.artifacts.review);
    const question=original?review.originals.find(entry=>entry.number===number):review.retryCandidates.find(entry=>entry.id===id);
    question.choices[(original?question.officialKeyObserved:question.proposedChoice)-1]=
      number===49?(original?v.leader:v.price):number===51?(original?v.profit:v.deviator):(original?v.welfareImprovement:v.unitTax);
    fixture.rebind("review",review);calculations.reviewPacketSha256=fixture.input.installation.fileSha256.review;
    fixture.rebind("calculations",calculations);
    const ai=JSON.parse(fixture.artifacts.ai);ai.packetSha256=calculations.reviewPacketSha256;fixture.rebind("ai",ai);
    const candidate=prepareEconomicsRuntimeCandidate({reviewSource:fixture.artifacts.review.toString(),
      calculationSource:fixture.artifacts.calculations.toString(),aiEvidenceSource:fixture.artifacts.ai.toString(),
      sourceObservationSource:fixture.artifacts.observation.toString(),humanChecklistSource:fixture.artifacts.checklist.toString()}).candidate;
    candidate.dataClass="synthetic_test_only";fixture.rebind("candidate",candidate);
    const h=trialHarness({fixture}),available=await h.send();
    assert.equal(available.status,200);
    assert.equal(available.body.availability.questions.some(entry=>entry.questionNumber===number),false);
    assert.equal((await h.send({action:"create",requestId:"different-model",questionId:`qnet-2025-36-s1-A-${number}`})).status,404);
    assert.equal(h.rows.size,0);
  });
});

test("synthetic observation pins require the explicit test port, never a relabeled installation or HTTP field",async()=>{
  const fixture=syntheticTrialInput({numericTrialModels:true});
  const candidate=JSON.parse(fixture.artifacts.candidate), calculations=JSON.parse(fixture.artifacts.calculations);
  for(const number of [49,51,53]) {
    const pair=candidate.questions.filter(row=>row.reference.questionNumber===number);
    assert.equal(supportsR3RecordedPair(number,pair[0],pair[1],calculations.results),false);
    assert.equal(supportsR3RecordedPair(number,pair[0],pair[1],calculations.results,"synthetic_test_only"),true);
  }
  delete fixture.input.expectedDataClass;
  fixture.input.installation.dataClass="private_review_candidate";
  candidate.dataClass="private_review_candidate";fixture.rebind("candidate",candidate);
  const h=trialHarness({fixture});
  const available=await h.send();
  assert.equal(available.body.availability.state,"blocked");
  assert.notEqual((await h.send(undefined,"?expectedDataClass=synthetic_test_only")).status,200);
  const forged=await h.send({action:"create",requestId:"forged-test-port",questionId:"qnet-2025-36-s1-A-49",expectedDataClass:"synthetic_test_only"});
  assert.notEqual(forged.status,200);assert.equal(h.rows.size,0);
});

test("fixed observation pins preserve the pre-pin 49 saved row and response identities",async()=>{
  // Digests recorded via the real constructor at reviewed head 07b813e BEFORE
  // adding pins; these describe synthetic state, not any personal record.
  const h=bundleHarness();
  const created=await h.send({action:"create",requestId:"fixed49-compat",questionId:"qnet-2025-36-s1-A-49"});
  const sessionId=created.body.view.sessionId;
  const begun=await h.send({sessionId,command:{action:"begin",requestId:"fixed49-begin",expectedRevision:1,questionId:"qnet-2025-36-s1-A-49"}});
  h.setClock(new Date(Date.parse(h.getClock())+60000).toISOString());
  const command=submission(begun.body.view.attempt.attemptId,2), saved=await h.send({sessionId,command});
  assert.equal(saved.status,200);
  const expectedRow="702637933e10f64722f27ec5bc4cf2c44e96ae5bd13862acb624b9ead0961daa";
  assert.equal(digest([...h.rows.values()][0]),expectedRow);
  assert.equal(digest(saved.body),"d89596756a2f050503d2015ab1cc758c2feee28914554496dc7e631c4cf6987b");
  assert.deepEqual((await h.send(undefined,`?sessionId=${sessionId}`)).body,saved.body);
  assert.deepEqual((await h.send({sessionId,command})).body,saved.body);
  assert.equal(digest([...h.rows.values()][0]),expectedRow);
});
