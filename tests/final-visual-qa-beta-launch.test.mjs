import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const LEARNER_PUBLIC_FILES = [
  'app/page.tsx',
  'components/inverge/front-page.tsx',
  'components/inverge/front-page-hero-animation.tsx',
  'app/answer-review/answer-review-client.tsx',
  'app/app/page.tsx',
  'app/app/capture/page.tsx',
  'app/app/write/page.tsx',
  'components/review-os/capture-form.tsx',
];

test('final visual qa beta launch doc exists', () => {
  assert.equal(existsSync('docs/final-visual-qa-beta-launch.md'), true);
});

test('final visual qa doc has required sections and launch gate lines', () => {
  const content = read('docs/final-visual-qa-beta-launch.md');
  [
    'Color system check',
    'Public landing check',
    'Capture check',
    'Answer Review Studio check',
    'Mobile check',
    'Safety check',
    'Launch decision',
    'Pending manual visual QA',
    'invited users only',
    'no payment',
    'no broad public launch',
  ].forEach((phrase) => {
    assert.ok(content.includes(phrase), `Missing required phrase: ${phrase}`);
  });
});

test('global focus color tokens remain coherent', () => {
  const css = read('app/globals.css');
  [
    '--bg-canvas: #faf8f3',
    '--bg-subtle: #f3f6f8',
    '--text-primary: #101828',
    '--brand-900: #10233f',
  ].forEach((token) => {
    assert.ok(css.includes(token), `Missing token: ${token}`);
  });
});

test('public landing keeps proof/demo copy anchors', () => {
  const joined = [
    'components/inverge/front-page.tsx',
    'components/inverge/front-page-hero-animation.tsx',
  ].map(read).join('\n');

  [
    '답안 검토실 데모',
    '모범답안 구조 (Skeleton Framework)',
    '학습 보조 Skeleton',
    '오늘 입력 시작',
    '답안 검토실 보기',
  ].forEach((phrase) => {
    assert.ok(joined.includes(phrase), `Missing public landing phrase: ${phrase}`);
  });
});

test('answer review studio keeps key interaction and result anchors', () => {
  const content = read('app/answer-review/answer-review-client.tsx');
  [
    '답안 스냅으로 시작',
    '사례 스캔',
    'PDF/사진 불러오기',
    '텍스트 붙여넣기',
    '가장 큰 간극',
    '누락 논점',
    '약한 구조',
    '다시 쓸 문장',
    '다음 행동',
  ].forEach((phrase) => {
    assert.ok(content.includes(phrase), `Missing Answer Review Studio phrase: ${phrase}`);
  });
});

test('guardrails remain enforced on learner/public surfaces', () => {
  const joined = LEARNER_PUBLIC_FILES.map(read).join('\n').toLowerCase();
  [
    '공식 채점',
    '합격 판정',
    '확정 점수',
    '모범답안 확정',
    'official grader',
    'pass/fail judge',
    '정답 보장',
    '합격 보장',
    '/instructor/source-review',
    '/instructor/second-grading',
    '@google-cloud/vision',
    'documentprocessorserviceclient',
    'tesseract',
    'documentai',
  ].forEach((token) => {
    assert.equal(joined.includes(token.toLowerCase()), false, `Prohibited token found: ${token}`);
  });
});
