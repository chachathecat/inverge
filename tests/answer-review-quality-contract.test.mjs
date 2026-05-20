import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildAnswerReviewQualityView } from '../lib/evaluate/answer-review-quality.ts';

const warningText = '한국어 검토 문장이 부족합니다. 결과를 다시 확인해 주세요.';
const fixtureDir = 'tests/fixtures/answer-review-quality';

const loadFixture = (name) => JSON.parse(fs.readFileSync(`${fixtureDir}/${name}`, 'utf8'));

test('helper exists and returns contract shape', () => {
  assert.equal(typeof buildAnswerReviewQualityView, 'function');
  const output = buildAnswerReviewQualityView(loadFixture('second_good_korean.json'));
  assert.ok(output.primaryFix);
  assert.ok(output.skeleton);
  assert.equal(typeof output.nextAction, 'string');
  assert.ok(Array.isArray(output.qualityWarnings));
});

test('good korean fixture produces complete primary fix and skeleton', () => {
  const output = buildAnswerReviewQualityView(loadFixture('second_good_korean.json'));
  assert.ok(output.primaryFix.gap.length > 0);
  assert.ok(output.primaryFix.whyItMatters.length > 0);
  assert.ok(output.primaryFix.howToFix.length > 0);
  assert.ok(output.skeleton.issue.length >= 1);
  assert.ok(output.skeleton.rule.length >= 1);
  assert.ok(output.skeleton.application.length >= 1);
  assert.ok(output.skeleton.conclusion.length >= 1);
  assert.ok(output.nextAction.length <= 80);
  assert.ok(/다시|표시|써보세요|쓰세요/.test(output.nextAction));
});

test('english leak fixture triggers warning and korean fallback', () => {
  const output = buildAnswerReviewQualityView(loadFixture('second_english_leak.json'));
  assert.ok(output.qualityWarnings.includes(warningText));
  assert.ok(!/[A-Za-z]{20,}/.test(output.primaryFix.gap));
  assert.ok(/[가-힣]/.test(output.primaryFix.gap));
});

test('sparse input fixture still returns safe fallbacks', () => {
  const output = buildAnswerReviewQualityView(loadFixture('second_sparse_input.json'));
  assert.ok(output.primaryFix.gap.length > 0);
  assert.ok(output.primaryFix.whyItMatters.length > 0);
  assert.ok(output.primaryFix.howToFix.length > 0);
  assert.ok(output.skeleton.issue.length > 0);
  assert.ok(output.skeleton.rule.length > 0);
  assert.ok(output.skeleton.application.length > 0);
  assert.ok(output.skeleton.conclusion.length > 0);
  assert.ok(output.nextAction.length > 0);
});

test('duplicate skeleton fixture deduplicates sections', () => {
  const output = buildAnswerReviewQualityView(loadFixture('second_duplicate_skeleton.json'));
  assert.notEqual(output.skeleton.issue.join(' '), output.skeleton.rule.join(' '));
  const all = [...output.skeleton.issue, ...output.skeleton.rule, ...output.skeleton.application, ...output.skeleton.conclusion];
  assert.equal(new Set(all).size, all.length);
});

test('answer review client includes quality-view integration copy', () => {
  const source = fs.readFileSync('app/answer-review/answer-review-client.tsx', 'utf8');
  ['buildAnswerReviewQualityView', '검토 품질 확인 필요', '가장 먼저 고칠 1가지', '답안 구조 Skeleton'].forEach((text) => {
    assert.ok(source.includes(text), `missing copy: ${text}`);
  });
});

test('gemini prompt includes stricter korean output contract lines', () => {
  const source = fs.readFileSync('lib/evaluate/gemini.ts', 'utf8');
  [
    '모든 출력 필드는 한국어로 작성한다',
    'Skeleton은 목차와 필수 키워드만 제시한다',
    '가장 큰 간극은 1개만 고른다',
    '다음 행동은 10분 안에 실행 가능한 행동 1개',
    '공식 채점, 합격 판정, 점수, 등급 표현을 금지한다',
  ].forEach((line) => assert.ok(source.includes(line), `missing line: ${line}`));
});

test('guardrails and no payment keywords in learner/public files', () => {
  const files = ['app/answer-review/answer-review-client.tsx', 'app/app/page.tsx', 'app/page.tsx', 'app/(marketing)/page.tsx'].filter((p) => fs.existsSync(p));
  const text = files.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  ['공식 채점', '합격 판정', '확정 점수', '모범답안 확정', 'official grader', 'pass/fail judge', '정답 보장', '합격 보장', '합격 확률'].forEach((bad) => {
    assert.ok(!text.includes(bad), `forbidden guardrail copy found: ${bad}`);
  });
  ['checkout', 'payment', '결제', '구독', '카드 등록'].forEach((bad) => {
    assert.ok(!text.includes(bad), `forbidden payment copy found: ${bad}`);
  });
});
