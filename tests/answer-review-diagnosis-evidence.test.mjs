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
import { evaluateApp1SameSessionRepair } from "../lib/owner-study/app1-capture-repair-view-model.ts";
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
