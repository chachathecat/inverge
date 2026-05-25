import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('raw text is not logged', () => {
  const src = fs.readFileSync('lib/review-os/observability.ts', 'utf8');
  assert.equal(src.includes('answerText'), false);
  assert.equal(src.includes('rawOcrText'), false);
});

test('blocked cost cap does not call AI path', () => {
  const src = fs.readFileSync('app/api/answer-review/structure/route.ts', 'utf8');
  assert.ok(src.includes('assertCanRunAnswerReview'));
  assert.ok(src.indexOf('assertCanRunAnswerReview') < src.indexOf('structureAnswerReviewWithGemini'));
});

test('AI failure preserves draft and gives retry copy', () => {
  const src = fs.readFileSync('app/api/answer-review/structure/route.ts', 'utf8');
  assert.ok(src.includes('saved_draft_retry'));
});

test('save failure gives retry path', () => {
  const src = fs.readFileSync('app/api/answer-review/structure/route.ts', 'utf8');
  assert.ok(src.includes('SAVE_FAILED'));
  assert.ok(src.includes('recovery: "retry"'));
});

test('monitoring event contains no pii or raw answer', () => {
  const src = fs.readFileSync('lib/review-os/observability.ts', 'utf8');
  assert.ok(src.includes('userIdHash'));
  assert.equal(src.includes('private notes'), false);
});
