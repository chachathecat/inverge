import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const SCORECARD_PATH = 'docs/problem-snap-field-qa-scorecard.md';
const FIXTURE_PATH = 'tests/fixtures/problem-snap-field-qa/README.md';

const SCORECARD_PHRASES = [
  'Problem recognition',
  'Concept/formula quality',
  'Explanation level fit',
  'Calculation walkthrough',
  'CASIO keystroke usefulness',
  'Next practice action',
  'Trust/safety',
  'Average >= 4.0',
  'would pay',
  'Critical failures',
];

const FIXTURE_PHRASES = [
  'Sample ID',
  'Expected formulas',
  'Observed CASIO guide',
  'CASIO keystroke usefulness score',
  'Would use again',
  'Would pay',
  'Critical failure',
];

const DISALLOWED_TERMS = [
  '공식 모범답안',
  '공식 채점',
  '합격 판정',
  '확정 점수',
  '모범답안 확정',
  'official grader',
  'pass/fail judge',
  '정답 보장',
  '합격 보장',
  '합격 확률',
  'CASIO 공식 보증',
  'CASIO 공식 인증',
  '/past-exams',
  '/exam-archive',
  '기출 아카이브',
  '20년치 기출',
  'checkout',
  'payment',
  '결제',
  '구독',
  '카드 등록',
];

const LEARNER_PUBLIC_FILES = [
  'docs/problem-snap-field-qa-scorecard.md',
  'tests/fixtures/problem-snap-field-qa/README.md',
];

test('scorecard document exists and contains required sections', () => {
  assert.equal(existsSync(SCORECARD_PATH), true, `${SCORECARD_PATH} should exist`);
  const content = readFileSync(SCORECARD_PATH, 'utf8');

  for (const phrase of SCORECARD_PHRASES) {
    assert.match(content, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Missing required phrase: ${phrase}`);
  }
});

test('fixture template exists and contains required fields', () => {
  assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_PATH} should exist`);
  const content = readFileSync(FIXTURE_PATH, 'utf8');

  for (const phrase of FIXTURE_PHRASES) {
    assert.match(content, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Missing fixture field: ${phrase}`);
  }
});

test('guardrails: no grading/safety/payment/archive expansion language in learner/public fixtures', () => {
  const scannedText = LEARNER_PUBLIC_FILES
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');

  for (const term of DISALLOWED_TERMS) {
    assert.doesNotMatch(
      scannedText,
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      `Found disallowed term in learner/public files: ${term}`,
    );
  }
});
