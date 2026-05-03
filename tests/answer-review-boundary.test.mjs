import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('learner answer-review does not expose second grader panel text', async () => {
  const source = await readFile(new URL('../app/answer-review/answer-review-client.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('2차 채점관 모드'), false);
});

test('instructor second grading page exists', async () => {
  const source = await readFile(new URL('../app/instructor/second-grading/page.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('SecondGradingClient'));
});

test('learner answer-review does not link instructor OCR route', async () => {
  const learnerSource = await readFile(new URL('../app/answer-review/answer-review-client.tsx', import.meta.url), 'utf8');
  assert.equal(learnerSource.includes('/api/instructor/second-grading/ocr'), false);
});

test('instructor second-grading OCR UI is scoped to instructor page', async () => {
  const instructorSource = await readFile(new URL('../app/instructor/second-grading/second-grading-client.tsx', import.meta.url), 'utf8');
  assert.ok(instructorSource.includes('/api/instructor/second-grading/ocr'));
  assert.ok(instructorSource.includes('accept="image/*,.pdf"'));
  assert.ok(instructorSource.includes('capture="environment"'));
});
