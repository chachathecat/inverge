import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const DOC_PATH = 'docs/closed-beta-qa-run.md';
const read = (path) => readFileSync(path, 'utf8');

const REQUIRED_PHRASES = [
  '9.0/10',
  'Vercel preview',
  'Empty learner check',
  'Appraiser 1st-stage capture check',
  'Appraiser 2nd-stage capture check',
  'Mobile check',
  'Unauthorized instructor access check',
  'Safety copy check',
  'Build/deployment check',
  'Launch blockers',
  'Launch decision',
  'invited users only',
  '감정평가사 1차',
  '감정평가사 2차',
];

const REQUIRED_SAVED_STATE_COPY = [
  '오늘 기록이 저장되었습니다.',
  '복습 큐에 들어갔습니다.',
  '오늘 계획에 반영되었습니다.',
  '가장 큰 간극:',
  '다음 행동:',
];

const PROHIBITED_CLAIMS = [
  'official grader',
  'pass/fail judge',
  '공식 채점',
  '합격 판정',
  '확정 점수',
  '모범답안 확정',
];

test('closed beta QA run doc exists', () => {
  assert.equal(existsSync(DOC_PATH), true, `${DOC_PATH} should exist`);
});

test('closed beta QA run doc contains required sections and scope', () => {
  const content = read(DOC_PATH);
  REQUIRED_PHRASES.forEach((phrase) => {
    assert.ok(content.includes(phrase), `Missing required phrase: ${phrase}`);
  });
});

test('closed beta QA run doc contains saved-state proof copy', () => {
  const content = read(DOC_PATH);
  REQUIRED_SAVED_STATE_COPY.forEach((phrase) => {
    assert.ok(content.includes(phrase), `Missing saved-state proof copy: ${phrase}`);
  });
});

test('closed beta QA run doc does not approve launch by default', () => {
  const content = read(DOC_PATH);
  assert.ok(content.includes('Decision: Pending / Approved / Blocked'), 'Missing decision template with Pending');

  const normalized = content.toLowerCase();
  assert.equal(
    normalized.includes('decision: approved'),
    false,
    'Launch should not be approved by default',
  );
});

test('closed beta QA run doc excludes prohibited product claims', () => {
  const normalized = read(DOC_PATH).toLowerCase();
  PROHIBITED_CLAIMS.forEach((claim) => {
    assert.equal(normalized.includes(claim.toLowerCase()), false, `Prohibited claim found: ${claim}`);
  });
});
