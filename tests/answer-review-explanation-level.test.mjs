import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('answer review explanation level contract', () => {
  const structure = read('lib/evaluate/answer-review-structure.ts');
  for (const token of ['AnswerReviewExplanationLevel','plainExplanation','keyTermExplanations','stepByStepExplanation','examAnswerHints']) assert.ok(structure.includes(token));

  const client = read('app/answer-review/answer-review-client.tsx');
  for (const token of ['해설 난이도','쉽게 풀이','기본 해설','시험답안식','explanationLevel','쉬운 풀이는 이해용이고, 답안 구조는 작성용입니다.','핵심 해설','시험답안식 보강 포인트']) assert.ok(client.includes(token));

  const route = read('app/api/answer-review/structure/route.ts');
  for (const token of ['explanationLevel','standard','easy','exam','formData.get("explanationLevel")']) assert.ok(route.includes(token));

  const gemini = read('lib/evaluate/gemini.ts');
  for (const token of ['explanationLevel','중고등학생도 이해할 수 있게','전문용어는 괄호 안에 쉬운 말','법리·산식·필수 키워드를 왜곡하지 않는다','문장형 모범답안을 쓰지 않는다','plainExplanation','keyTermExplanations','stepByStepExplanation','examAnswerHints']) assert.ok(gemini.includes(token));

  const quality = read('lib/evaluate/answer-review-quality.ts');
  for (const token of ['explanation','keyTerms','steps','examHints']) assert.ok(quality.includes(token));
});

test('guardrails and payment terms are absent in learner/public files', () => {
  const files = [
    'app/answer-review/answer-review-client.tsx',
  ];
  const banned = ['확정 점수','모범답안 확정','official grader','pass/fail judge','정답 보장','합격 보장','합격 확률','checkout','payment','결제','구독','카드 등록'];
  for (const file of files) {
    const text = read(file);
    assert.doesNotMatch(text, /공식 채점(?!이나 합격 판정이 아닙니다)/);
    assert.doesNotMatch(text, /합격 판정(?!이 아닙니다)/);
    for (const term of banned) {
      assert.equal(text.includes(term), false, `${file} contains ${term}`);
    }
  }
});
