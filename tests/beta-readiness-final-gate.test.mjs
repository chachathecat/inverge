import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const REQUIRED_DOCS = [
  'docs/beta-readiness-rubric.md',
  'docs/closed-beta-checklist.md',
  'docs/beta-readiness-final-review.md',
];

const REQUIRED_FINAL_REVIEW_PHRASES = [
  '9.0/10',
  '8.9/10',
  'closed beta',
  'learning operations system',
  'must-pass checklist',
  'do-not-launch blockers',
  'non-goals',
  'Vercel preview is success',
  'npm run build',
  '오늘 기록이 저장되었습니다.',
  '복습 큐에 들어갔습니다.',
  '오늘 계획에 반영되었습니다.',
  '가장 큰 간극:',
  '다음 행동:',
];

const CORE_FILES = [
  'app/app/page.tsx',
  'app/app/capture/page.tsx',
  'app/app/session/page.tsx',
  'components/review-os/capture-form.tsx',
  'components/review-os/review-queue-client.tsx',
  'lib/review-os/capture-learning-signals.ts',
  'lib/review-os/today-plan-engine.ts',
  'tests/closed-beta-smoke.test.mjs',
  'tests/mobile-empty-state-polish.test.mjs',
];

const LEARNER_LOOP_COPY = [
  '오늘 한 것 올리기',
  'OCR과 AI 정리는 학습 보조 초안입니다',
  '저장 전 직접 수정할 수 있습니다',
  '오늘 기록 기반',
  '오늘 계획에 반영했습니다.',
  '오늘 할 일 후보',
  '복습 후보',
  '학습 노트 상세에 저장했습니다.',
];

const PROHIBITED_LANGUAGE = [
  '합격 판정',
  '확정 점수',
  '모범답안 확정',
  'official grader',
  'pass/fail judge',
];

const PROVIDER_TOKENS = [
  '@google-cloud/vision',
  'DocumentProcessorServiceClient',
  'tesseract',
  'openai',
  'gemini',
  'documentai',
];

const LEARNER_SURFACE_FILES = [
  'app/app/page.tsx',
  'app/app/capture/page.tsx',
  'app/app/session/page.tsx',
  'components/review-os/capture-form.tsx',
  'components/review-os/review-queue-client.tsx',
];

test('required beta readiness docs exist', () => {
  REQUIRED_DOCS.forEach((docPath) => {
    assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  });
});

test('final review doc contains launch gate anchors', () => {
  const content = read('docs/beta-readiness-final-review.md');
  REQUIRED_FINAL_REVIEW_PHRASES.forEach((phrase) => {
    assert.ok(content.toLowerCase().includes(phrase.toLowerCase()), `Missing required phrase: ${phrase}`);
  });
});

test('core learner loop and test files exist', () => {
  CORE_FILES.forEach((filePath) => {
    assert.equal(existsSync(filePath), true, `${filePath} should exist`);
  });
});

test('learner surfaces include required core loop copy', () => {
  const joined = LEARNER_SURFACE_FILES.map((filePath) => read(filePath)).join('\n');
  LEARNER_LOOP_COPY.forEach((phrase) => {
    assert.ok(joined.includes(phrase), `Missing learner loop copy: ${phrase}`);
  });
});

test('learner surfaces exclude prohibited grading/pass-fail language', () => {
  const joined = LEARNER_SURFACE_FILES.map((filePath) => read(filePath)).join('\n').toLowerCase();
  assert.doesNotMatch(joined, /공식\s*채점(?!\s*아님)/, 'positive official grading claim found');
  PROHIBITED_LANGUAGE.forEach((token) => {
    assert.equal(joined.includes(token.toLowerCase()), false, `Prohibited language found: ${token}`);
  });
});

test('learner surfaces exclude OCR provider tokens', () => {
  const joined = LEARNER_SURFACE_FILES.map((filePath) => read(filePath)).join('\n').toLowerCase();
  PROVIDER_TOKENS.forEach((token) => {
    assert.equal(joined.includes(token.toLowerCase()), false, `Provider token found: ${token}`);
  });
});

test('instructor routes are not linked from learner pages', () => {
  const joined = LEARNER_SURFACE_FILES.map((filePath) => read(filePath)).join('\n');
  assert.equal(joined.includes('/instructor/source-review'), false);
  assert.equal(joined.includes('/instructor/second-grading'), false);
});

test('final review has explicit no-launch statements for critical failures', () => {
  const content = read('docs/beta-readiness-final-review.md').toLowerCase();
  [
    'launch should not proceed if vercel preview fails',
    'launch should not proceed if build fails',
    'launch should not proceed if capture save fails',
  ].forEach((line) => {
    assert.ok(content.includes(line), `Missing explicit blocker statement: ${line}`);
  });
});
