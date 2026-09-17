import test from "node:test";
import assert from "node:assert/strict";
import { moveCaptureSelectionToAnswer } from "../lib/review-os/capture-input-separation.ts";

test("selected multi-page answer moves without replacing prior answer or unrelated source",()=>{
  const question="[Page 1]\n독자 합성 문제입니다.\n\n[Page 2]\n직접 작성한 답안입니다.\n[Page 3]\n두 번째 답안 문단입니다.";
  const start=question.indexOf("[Page 2]");
  const result=moveCaptureSelectionToAnswer({questionText:question,answerText:"보존할 기존 답안",selectedFrom:question,start,end:question.length});
  assert.equal(result.questionText,question.slice(0,start));
  assert.equal(result.answerText,"보존할 기존 답안\n\n"+question.slice(start));
  assert.equal(result.questionText+result.answerText.slice("보존할 기존 답안\n\n".length),question);
});
test("stale, invalid and blank selections cannot remove source text",()=>{
  const input={questionText:"문제  답안",answerText:"기존",selectedFrom:"문제  답안",start:4,end:6};
  for(const change of [{selectedFrom:"이전 문제"},{start:-1},{end:99},{start:1.5},{start:4,end:4},{start:2,end:4}])
    assert.equal(moveCaptureSelectionToAnswer({...input,...change}),null);
});
