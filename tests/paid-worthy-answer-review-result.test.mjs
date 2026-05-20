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
    '답안 구조 Skeleton',
    '문장형 답안이 아니라 목차와 필수 키워드',
    'Ⅰ. 논점의 정리',
    'Ⅱ. 기준/법리',
    'Ⅲ. 사안의 적용',
    'Ⅳ. 결론',
    '다음 행동',
  ].forEach((copy) => assert.ok(answerReviewClient.includes(copy), `missing copy: ${copy}`));
});

test('anonymous signup value card copy is present', () => {
  [
    '계정 만들고 기록 저장',
    '약점 신호에 누적됩니다',
    '복습 큐에 들어갑니다',
    '오늘 계획에 반영됩니다',
    '결과만 계속 보기',
  ].forEach((copy) => assert.ok(answerReviewClient.includes(copy), `missing copy: ${copy}`));
});

test('learner home weakness diagnostic copy is present', () => {
  [
    '내 답안에서 반복되는 약점',
    '가장 많이 반복된 약점',
    '다시 볼 과목',
    '오늘 줄일 실수',
  ].forEach((copy) => assert.ok(appHome.includes(copy), `missing copy: ${copy}`));
});

test('guardrails: no official grading or pass-fail claims in learner/public files', () => {
  [
    '공식 채점',
    '합격 판정',
    '확정 점수',
    '모범답안 확정',
    'official grader',
    'pass/fail judge',
    '정답 보장',
    '합격 보장',
    '합격 확률',
  ].forEach((forbidden) => assert.ok(!learnerPublicText.includes(forbidden), `forbidden guardrail copy found: ${forbidden}`));
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
