import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const answerReviewClient = fs.readFileSync('app/answer-review/answer-review-client.tsx', 'utf8');
const appHome = fs.readFileSync('app/app/page.tsx', 'utf8');

const learnerPublicFiles = [
  'app/answer-review/answer-review-client.tsx',
  'app/app/page.tsx',
  'app/page.tsx',
  'app/(marketing)/page.tsx',
].filter((path) => fs.existsSync(path));

const learnerPublicText = learnerPublicFiles
  .map((path) => fs.readFileSync(path, 'utf8'))
  .join('\n');

test('answer review result hierarchy copy is present', () => {
  [
    '가장 먼저 고칠 1가지',
    '가장 큰 간극',
    '왜 중요한가',
    '어떻게 고칠까',
    '답안 구조',
    'Ⅰ. 논점의 정리',
    'Ⅱ. 기준/법리',
    'Ⅲ. 사안의 적용',
    'Ⅳ. 결론',
    '다음 행동',
  ].forEach((copy) => assert.ok(answerReviewClient.includes(copy), `missing copy: ${copy}`));
});

test('anonymous signup value card copy is present', () => {
  [
    '로그인하고 기록 저장',
    '약점 신호에 누적됩니다',
    '복습에 남습니다',
    '오늘 계획에 반영됩니다',
    '결과만 계속 보기',
  ].forEach((copy) => assert.ok(answerReviewClient.includes(copy), `missing copy: ${copy}`));
});

test('learner home weakness diagnostic copy is present', () => {
  [
    '반복 약점 신호를 수집 중입니다.',
    '가장 큰 약점',
    '오늘은 이 약점 하나만 줄입니다.',
    '오늘 다시 볼 항목',
  ].forEach((copy) => assert.ok(appHome.includes(copy), `missing copy: ${copy}`));
});

test('guardrails: no official grading or pass-fail claims in learner/public files', () => {
  [
    '확정 점수',
    '모범답안 확정',
    'official grader',
    'pass/fail judge',
    '정답 보장',
    '합격 보장',
    '합격 확률',
  ].forEach((forbidden) => assert.ok(!learnerPublicText.includes(forbidden), `forbidden guardrail copy found: ${forbidden}`));
  assert.doesNotMatch(learnerPublicText, /공식 채점(?!\s*아님|이나)/);
  assert.doesNotMatch(learnerPublicText, /합격 판정(?!이 아닙니다|이 아니라|이 아님| 아님)/);
});

test('no payment keywords added', () => {
  [
    'checkout',
    'payment',
    '결제',
    '구독',
    '카드 등록',
  ].forEach((forbidden) => assert.ok(!learnerPublicText.includes(forbidden), `forbidden payment copy found: ${forbidden}`));
});
