import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildApp1PrimaryGap, evaluateApp1SameSessionRepair } from "../lib/owner-study/app1-capture-repair-view-model.ts";
const fixture=JSON.parse(readFileSync(new URL("./fixtures/practice-development-cases.json",import.meta.url),"utf8"));
const detail={item:{id:"11111111-1111-4111-8111-111111111111",userId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",subjectLabel:"감정평가실무",sourceType:"text",rawQuestionText:fixture.question,rawAnswerText:fixture.weak,userAnswer:fixture.weak,correctAnswer:"-",keyConcepts:[],coreFormula:"",rawPayload:{user_confirmed_fields:{ocrConfirmedByLearner:true,lowConfidenceFlag:false,pageCount:1}},derivedPayload:{}},note:null,tags:[],recurrence:null,reviewQueue:[]};
const gap=buildApp1PrimaryGap(detail,fixture.responses.weak);
function verify(answer,overrides={}) {return evaluateApp1SameSessionRepair({detail,requestedGap:gap,repairText:answer,repairDraft:{...fixture.responses.corrected,answerEvidenceQuote:answer,...overrides}});}
test("synthetic direct-capitalization oracle uses integer rational arithmetic and half-up rounding",()=>{
 const incomeWon=2222n*10000n, rateHundredths=6n;
 const valueThousandWon=(incomeWon*100n*2n+rateHundredths*1000n)/(2n*rateHundredths*1000n);
 assert.equal(valueThousandWon,370333n);
 assert.equal(valueThousandWon*1000n,370333000n);
});
test("correct Practice amount, unit and declared rounding receive same-session confirmation",()=>{
 assert.equal(verify(fixture.corrected).state,"repair_confirmed_for_this_session");
});
test("wrong rate, rounded amount and missing evidence never receive confirmation even if AI says clear",()=>{
 for(const answer of [fixture.weak,fixture.corrected.replace("37,033.3만원","37,033.4만원"),fixture.corrected.replace("37,033.3만원","37,033.3원"),fixture.corrected.replace("37,033.3만원","370,333,000원"),fixture.corrected.replace("소수점 첫째 자리까지 반올림했으며 ","")]){
  assert.notEqual(verify(answer).state,"repair_confirmed_for_this_session",answer);
 }
 assert.notEqual(verify(fixture.corrected,{answerEvidenceQuote:""}).state,"repair_confirmed_for_this_session");
});

test("source operand drift, ambiguity and extra calculations fail closed",()=>{
 const clear=fixture.responses.corrected;
 for(const question of [fixture.question.replace("6%(0.06)","6%(0.6)"),fixture.question.replace("2,222만원","2,223만원"),fixture.question+" 환원율 7%도 고려하시오.",fixture.question.replace("소수점 첫째","소수점 둘째"),fixture.question+" 추가 가산액 100만원을 반영하시오.",fixture.question.replace("다른 조정은 없습니다.", "별도 공제액을 반영하시오.")]){
  const result=evaluateApp1SameSessionRepair({detail:{...detail,item:{...detail.item,rawQuestionText:question}},requestedGap:gap,repairText:fixture.corrected,repairDraft:clear});
  assert.notEqual(result.state,"repair_confirmed_for_this_session",question);
 }
 assert.notEqual(verify(fixture.corrected+" 추가 계산: 1 + 1 = 2.").state,"repair_confirmed_for_this_session");
 assert.notEqual(verify(fixture.corrected+" 수익가액은 999만원이다.").state,"repair_confirmed_for_this_session");
 assert.notEqual(verify(fixture.corrected+" 수익가액은 2,222만원이다.").state,"repair_confirmed_for_this_session");
});

test("missing or ambiguous source requirements need a guided path, not a learner fault",()=>{
 const unknownDetail={...detail,item:{...detail.item,rawQuestionText:fixture.question.replace("다른 조정은 없습니다.","자료에서 조정 조건을 확인할 수 없습니다.")}};
 const result=evaluateApp1SameSessionRepair({detail:unknownDetail,requestedGap:gap,repairText:fixture.corrected,repairDraft:fixture.responses.corrected});
 assert.equal(result.state,"guided_path_needed");
});
