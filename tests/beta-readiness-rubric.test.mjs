import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const DOC_PATH = 'docs/beta-readiness-rubric.md';

const REQUIRED_PHRASES = [
  '9.0/10',
  '7.2/10',
  'learning operations system',
  'capture',
  'Review Queue',
  'Today Plan',
  'reference_only',
  'needs_review',
  'official grading',
  'pass/fail',
  'raw user',
  'derived',
  'do-not-launch',
  'mobile',
];

const BLOCKER_LINES = Array.from({ length: 10 }, (_, index) => `${index + 1}.`);

const NON_GOALS = [
  'Non-goals before closed beta',
  'Full 20-year past-exam archive as the main product surface.',
  'Real official grading.',
  'Final pass/fail prediction.',
  'Full derivation verifier.',
  'Broad exam expansion.',
  'Live payment.',
  'Public source archive.',
  'Learner-facing instructor tools.',
];

const FORBIDDEN_DESCRIPTIONS = [
  'Inverge is an official grader',
  'Inverge is a pass/fail judge',
  'Inverge is an official model-answer provider',
];

const EXPANSION_TERMS = ['CPA', 'tax', 'TOEFL', 'SAT', 'universal exam tracks'];
const CONTEXT_ANCHORS = ['non-goals', 'non-goal', 'prohibited', 'future-scope', 'no expansion'];

test('beta readiness rubric doc exists', () => {
  assert.equal(existsSync(DOC_PATH), true, `${DOC_PATH} should exist`);
});

test('beta readiness rubric includes required phrases', () => {
  const content = readFileSync(DOC_PATH, 'utf8');

  for (const phrase of REQUIRED_PHRASES) {
    assert.match(
      content.toLowerCase(),
      new RegExp(phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `Missing required phrase: ${phrase}`,
    );
  }
});

test('beta readiness rubric includes blocker list and non-goals', () => {
  const content = readFileSync(DOC_PATH, 'utf8');

  assert.match(content.toLowerCase(), /do-not-launch blockers:/i, 'Missing do-not-launch blockers section');
  for (const prefix of BLOCKER_LINES) {
    assert.match(content, new RegExp(`\\n${prefix}\\s`), `Missing blocker item ${prefix}`);
  }

  for (const item of NON_GOALS) {
    assert.match(content, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `Missing non-goal item: ${item}`);
  }
});

test('beta readiness rubric avoids forbidden product descriptions', () => {
  const content = readFileSync(DOC_PATH, 'utf8');

  for (const phrase of FORBIDDEN_DESCRIPTIONS) {
    assert.doesNotMatch(
      content,
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      `Found forbidden description: ${phrase}`,
    );
  }
});

test('prohibited expansion terms appear only in constrained context', () => {
  const content = readFileSync(DOC_PATH, 'utf8');
  const lines = content.split(/\r?\n/);

  EXPANSION_TERMS.forEach((term) => {
    const lineIndexes = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.toLowerCase().includes(term.toLowerCase()))
      .map(({ index }) => index);

    assert.ok(lineIndexes.length > 0, `Expected term to appear in document: ${term}`);

    lineIndexes.forEach((lineIndex) => {
      const windowText = lines
        .slice(Math.max(0, lineIndex - 4), Math.min(lines.length, lineIndex + 5))
        .join(' ')
        .toLowerCase();

      const hasContextAnchor = CONTEXT_ANCHORS.some((anchor) => windowText.includes(anchor));
      assert.ok(
        hasContextAnchor,
        `Term "${term}" must appear only in non-goal/prohibited/future-scope context`,
      );
    });
  });
});
