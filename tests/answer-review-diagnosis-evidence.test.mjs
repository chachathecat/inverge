import test from "node:test";import assert from "node:assert/strict";
import {normalizeAnswerReviewStructureDraft,groundAnswerReviewDiagnosis} from "../lib/evaluate/answer-review-structure.ts";
import {buildAnswerReviewQualityView} from "../lib/evaluate/answer-review-quality.ts";
const q="창작 사례의 거래조건을 시장가치의 전제와 구분하여 적용하시오.",a="시장가치는 통상적인 시장 노출과 합리적인 당사자를 전제로 합니다.";
test("empty fields cannot become a personal omission or weak application diagnosis",()=>{const d=normalizeAnswerReviewStructureDraft({});assert.equal(d.weakLogicPoint,"");assert.equal(d.weakParagraphPoint,"");assert.deepEqual(d.missingIssueCandidates,[]);assert.match(buildAnswerReviewQualityView(d).primaryFix.gap,/확인하지 못했습니다/);assert.equal(groundAnswerReviewDiagnosis(d,q,a).diagnosticStatus,"insufficient_evidence");});
test("finding requires exact requirement and answer quotes with explicit reviewed scope",()=>{const d=normalizeAnswerReviewStructureDraft({diagnosticStatus:"finding",questionRequirementQuote:"거래조건을 시장가치의 전제와 구분",answerEvidenceQuote:"통상적인 시장 노출",reviewedAnswerScope:"entire_submitted_answer",missingIssueCandidates:["창작 사례의 특수한 거래조건이 설명되지 않았습니다."]});assert.equal(groundAnswerReviewDiagnosis(d,q,a).diagnosticStatus,"finding");for(const delta of [{questionRequirementQuote:"존재하지 않는 문제 요구"},{answerEvidenceQuote:"존재하지 않는 답안 문장"},{reviewedAnswerScope:undefined}]){const r=groundAnswerReviewDiagnosis({...d,...delta},q,a);assert.equal(r.diagnosticStatus,"insufficient_evidence");assert.deepEqual(r.missingIssueCandidates,[]);assert.equal(r.answerEvidenceQuote,undefined);}});
test("no clear gap, insufficient evidence and failed analysis never produce repair targets",()=>{for(const status of ["no_clear_gap","insufficient_evidence","analysis_failed"]){const d=groundAnswerReviewDiagnosis(normalizeAnswerReviewStructureDraft({diagnosticStatus:status,questionRequirementQuote:"거래조건을 시장가치의 전제와 구분",answerEvidenceQuote:"통상적인 시장 노출",reviewedAnswerScope:"entire_submitted_answer",weakLogicPoint:"untrusted residual",missingIssueCandidates:["untrusted residual"]}),q,a);assert.equal(d.diagnosticStatus,status);assert.deepEqual(d.missingIssueCandidates,[]);assert.equal(d.weakLogicPoint,"");assert.equal(d.rewriteTarget,"");}});

import {productionHarness,memoryTransport,seedRows,SOURCE_ID} from "./fixtures/app1-production-persistence-harness.mjs";
import {shouldSkipLearningSignalSave} from "../lib/review-os/learning-signal.ts";
test("ordinary non-Owner App1 never signs a non-finding or saves its learning signal",async()=>{
 for(const value of ["no_clear_gap","insufficient_evidence","analysis_failed",undefined]){
 const seed=seedRows();Object.assign(seed.wrong_answer_items[0],{raw_question_text:q,user_answer:a,raw_answer_text:a});
 const store=memoryTransport(seed);let status="finding";
 const model=()=>({diagnosticStatus:status,questionRequirementQuote:"거래조건을 시장가치의 전제와 구분",answerEvidenceQuote:"통상적인 시장 노출",reviewedAnswerScope:"entire_submitted_answer",questionSummary:q,requiredIssues:q,coreConcepts:["시장가치"],strengths:[a],missingIssueCandidates:["사례 조건과 기준의 적용 연결이 부족합니다."],weakLogicPoint:"사례 조건을 시장가치 기준에 연결할 필요가 있습니다.",weakParagraphPoint:"사례 조건과 기준을 연결하여 결론을 적으세요.",nextAction:"사례 사실과 기준의 연결을 직접 작성하세요."});
 const app=productionHarness(store.execute,{overrides:()=>({"@/lib/evaluate/gemini":{isGeminiConfigured:()=>true,GeminiEnvError:class extends Error{},GeminiStructureParseError:class extends Error{},isGeminiQuotaExceededError:()=>false,structureAnswerReviewWithGemini:async()=>model()}})});
 const post=async(purpose,extra={})=>{const body=new FormData();for(const [k,v] of Object.entries({requestPurpose:purpose,sourceItemId:SOURCE_ID,examMode:"second",subject:"감정평가이론",...extra}))body.set(k,v);const response=await app.load("app/api/answer-review/structure/route").POST(new Request("http://localhost/api/answer-review/structure",{method:"POST",body}));assert.equal(response.status,200);return response.json();};
 const positive=await post("app1_initial_analysis");assert.ok(positive.analysisBinding);const signalCount=store.tables.learning_signal_events.length;assert.equal(signalCount,1);
 status=value;const result=await post("app1_initial_analysis");assert.equal(result.analysisBinding,undefined);assert.equal(result.primaryGap,undefined);assert.equal(result.learningSignalStatus,"skipped");assert.equal(store.tables.learning_signal_events.length,signalCount);assert.equal(shouldSkipLearningSignalSave(result.draft),"insufficient_structure");
  if(value!=="no_clear_gap"){const verify=await post("repair_verification",{answerText:a,analysisBinding:positive.analysisBinding,primaryGap:JSON.stringify(positive.primaryGap),persistenceOperationId:crypto.randomUUID(),persistenceWorkRevisionId:crypto.randomUUID()});assert.equal(verify.verificationReceipt,undefined);assert.equal(verify.verification,undefined);}
 }
});


import { readFileSync } from "node:fs";
import { buildApp1PrimaryGap, evaluateApp1SameSessionRepair } from "../lib/owner-study/app1-capture-repair-view-model.ts";
const realRepair = JSON.parse(readFileSync(new URL("./fixtures/theory-real-repair-regression.json", import.meta.url), "utf8"));
function checkRealRepair(repairText = realRepair.repairText, patch = {}) {
  return evaluateApp1SameSessionRepair({ detail: realRepair.detail, requestedGap: realRepair.requestedGap,
    repairText, repairDraft: { ...realRepair.actualRepairDraft, ...patch } });
}
test("real model no-clear-gap with an incomplete evidence quote reports a validator limit, not an invented omission", () => {
  const result = checkRealRepair();
  assert.equal(result.state, "guided_path_needed");
  assert.match(result.reason, /자동 확인하지 못했습니다/u);
  assert.equal(result.masteryCreated, false);
});
test("a controlled exact quote of the reconstructed negative conclusion can confirm only this session", () => {
  const quote = realRepair.repairText.split(". ").at(-1);
  const normalized = normalizeAnswerReviewStructureDraft({ ...realRepair.actualRepairDraft, answerEvidenceQuote: quote });
  assert.equal(normalized.answerEvidenceQuote, quote);
  assert.ok(quote.length > 120);
  const result = checkRealRepair(undefined, normalized);
  assert.equal(result.state, "repair_confirmed_for_this_session");
  assert.equal(result.sameSessionOnly, true);
  assert.equal(result.masteryCreated, false);
  assert.equal(result.transferCreated, false);
});
test("no-clear-gap cannot bless fabricated quotes, unsupported text or missing reviewed scope", () => {
  for (const patch of [
    { answerEvidenceQuote: realRepair.repairText + " 존재하지 않는 문장" },
    { answerEvidenceQuote: realRepair.repairText, reviewedAnswerScope: undefined },
  ]) assert.notEqual(checkRealRepair(undefined, patch).state, "repair_confirmed_for_this_session");
  assert.notEqual(checkRealRepair(realRepair.detail.item.userAnswer, { answerEvidenceQuote: realRepair.repairText }).state, "repair_confirmed_for_this_session");
});
test("modal promises, an inability to repair, and contradictory outcomes stay unconfirmed", () => {
  const target = realRepair.repairText.split(". ").at(-1);
  for (const repairText of [
    target + " 사례 사실과 기준의 연결은 아직 보강할 수 없다.",
    target.replace("채택할 수 없다는", "채택할 수 없다면 가능한"),
    target.replace("도출된다", "도출될 수 있다"),
    target + " " + target.replace("충족하지 않으므로", "충족하므로").replace("채택할 수 없다는", "채택된다는"),
  ]) assert.notEqual(checkRealRepair(repairText, { answerEvidenceQuote: repairText }).state, "repair_confirmed_for_this_session", repairText);
});

test("a premise-application defect does not acquire a paragraph-structure obligation from action prose", () => {
  const result = evaluateApp1SameSessionRepair({ detail: realRepair.detail, requestedGap: realRepair.secondRequestedGap,
    repairText: realRepair.repairText, repairDraft: { ...realRepair.actualRepairDraft, answerEvidenceQuote: realRepair.repairText } });
  assert.equal(result.state, "repair_confirmed_for_this_session");
});


import { app1ResumeDraftKey, readApp1ResumeDraft, writeApp1ResumeDraft } from "../lib/owner-study/app1-resume-draft.ts";
test("tab repair drafts isolate owners/items and preserve text without trusting local authority", () => {
  const values = new Map(); const storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  const draft = { repairText: realRepair.repairText, analysisBinding: "untrusted-local-token", gap: realRepair.requestedGap };
  writeApp1ResumeDraft(storage, "owner-one", SOURCE_ID, draft);
  assert.deepEqual(readApp1ResumeDraft(storage, "owner-one", SOURCE_ID), draft);
  for (const length of [4001, 50000]) {
    const oversized = { ...draft, repairText: "가".repeat(length) + "\n끝" };
    writeApp1ResumeDraft(storage, "owner-one", SOURCE_ID, oversized);
    assert.deepEqual(readApp1ResumeDraft(storage, "owner-one", SOURCE_ID), oversized);
  }
  assert.equal(readApp1ResumeDraft(storage, "owner-two", SOURCE_ID), null);
  assert.equal(readApp1ResumeDraft(storage, "owner-one", crypto.randomUUID()), null);
  values.set(app1ResumeDraftKey("owner-one", SOURCE_ID), '{"version":1}');
  assert.equal(readApp1ResumeDraft(storage, "owner-one", SOURCE_ID), null);
});
test("analysis reconnect reuses a valid signature, creates no model call/signal, and rejects stale authority", async () => {
  const store = memoryTransport();
  const app = productionHarness(store.execute);
  const command = await app.command("resume-check");
  async function resume(runtime, overrides = {}) {
    const body = new FormData();
    for (const [key,value] of Object.entries({ requestPurpose: "app1_resume_analysis", examMode: "second", subject: "감정평가이론", sourceItemId: SOURCE_ID,
      analysisBinding: command.analysisBinding, primaryGap: JSON.stringify(command.primaryGap), ...overrides })) body.set(key,value);
    return runtime.load("app/api/answer-review/structure/route").POST(new Request("http://localhost/api/answer-review/structure", {method:"POST",body}));
  }
  const beforeSignals = store.tables.learning_signal_events.length;
  const result = await resume(app);
  assert.equal(result.status,200); assert.equal((await result.json()).analysisBinding,command.analysisBinding);
  assert.equal(store.tables.learning_signal_events.length,beforeSignals);
  assert.equal((await resume(app, { primaryGap: JSON.stringify({...command.primaryGap,gap:"tampered"}) })).status,400);
  app.session.isAuthenticated = false; assert.equal((await resume(app)).status,401); app.session.isAuthenticated = true;
  const expired = productionHarness(store.execute,{now:"2026-09-07T10:00:00.000Z"});
  assert.equal((await resume(expired)).status,410);
  store.tables.wrong_answer_items[0].user_answer += " changed source";
  assert.equal((await resume(app)).status,400);
});

test("long exact finding quotes keep a bounded exact anchor instead of silently losing evidence", () => {
  const gap = buildApp1PrimaryGap(realRepair.detail, { ...realRepair.actualRepairDraft, diagnosticStatus: "finding", answerEvidenceQuote: realRepair.detail.item.userAnswer });
  assert.equal(gap.anchorKind, "exact");
  assert.ok(gap.anchor.includes(realRepair.detail.item.userAnswer.slice(0,120)));
  assert.ok(gap.anchor.length < 240);
});

test("an asserted application and its denial remain contradictory despite a no-gap model status", () => {
  const repairText = "소유자 B의 매각 조건과 인접 소유자 C의 편익이라는 사례 사실에는 시장가치 기준을 적용하므로 시장가치 결론이 도출되지만, 이 기준은 같은 사례에 적용되지 않는다고 연결했다.";
  assert.notEqual(checkRealRepair(repairText, { answerEvidenceQuote: repairText }).state, "repair_confirmed_for_this_session");
});

test("no-clear-gap requires its exact target quote even with a fabricated positive strength", () => {
  const fabricated = realRepair.repairText.split(". ").at(-1).replace("소유자 B", "매도자 D");
  assert.equal(realRepair.repairText.includes(fabricated), false);
  const result = checkRealRepair(undefined, { strengths: [fabricated] });
  assert.equal(result.state, "guided_path_needed");
  assert.equal(result.masteryCreated, false);
});

test("a grounded no-gap correction ignores a fabricated strength polarity but still checks the learner body", () => {
  const quote = realRepair.repairText.split(". ").at(-1);
  const fabricated = quote.replace("충족하지 않으므로", "충족하므로").replace("채택할 수 없다는", "채택된다는");
  assert.equal(realRepair.repairText.includes(fabricated), false);
  assert.equal(checkRealRepair(undefined, { answerEvidenceQuote: quote, strengths: [fabricated] }).state, "repair_confirmed_for_this_session");
  assert.notEqual(checkRealRepair(realRepair.repairText + " " + fabricated, { answerEvidenceQuote: quote, strengths: [] }).state, "repair_confirmed_for_this_session");
});
