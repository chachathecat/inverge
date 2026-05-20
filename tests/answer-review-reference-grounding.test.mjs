import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildAnswerReviewReferenceGrounding } from '../lib/review-os/answer-review-reference-grounding.ts';

test('helper exists and returns contract shape', () => {
  assert.equal(typeof buildAnswerReviewReferenceGrounding, 'function');
  const output = buildAnswerReviewReferenceGrounding({
    examMode: 'second',
    subject: '감정평가실무',
    normalizedDraft: {
      questionSummary: '',
      coreConcepts: ['평가방법'],
      requiredIssues: '조건 정리',
      userAnswerSummary: '',
      userAnswerStructure: '',
      referenceStructure: '',
      strengths: [],
      missingIssueCandidates: ['근거-수치 연결'],
      weakParagraphPoint: '전제 조건 누락',
      weakLogicPoint: '결론 근거 부족',
      rewriteTarget: '',
      rewriteDraftSuggestion: '',
      nextAction: '',
      caution: '',
    },
  });
  assert.ok(Array.isArray(output.references));
  assert.equal(typeof output.promptContext, 'string');
  assert.equal(typeof output.displayLabel, 'string');
});

test('helper source uses matching infra and safe field limits', () => {
  const source = fs.readFileSync('lib/review-os/answer-review-reference-grounding.ts', 'utf8');
  ['findPastExamReferenceMatches', 'listPastExamReferences', 'slice(0, 2)', 'expected_answer_skeleton', 'scoring_checkpoint_skeleton', 'common_gap_candidates'].forEach((token) => {
    assert.ok(source.includes(token), `missing token: ${token}`);
  });
  assert.ok(!source.includes('raw_text'), 'raw exam text should not be included');
});

test('api route includes reference grounding metadata contract', () => {
  const source = fs.readFileSync('app/api/answer-review/structure/route.ts', 'utf8');
  ['referenceGrounding', 'buildAnswerReviewReferenceGrounding', 'used', 'displayLabel'].forEach((token) => {
    assert.ok(source.includes(token), `missing token: ${token}`);
  });
});

test('gemini prompt includes reference grounding policy lines', () => {
  const source = fs.readFileSync('lib/evaluate/gemini.ts', 'utf8');
  ['referenceGroundingContext', '참고용 유사 기출 Skeleton', 'reference_only', '공식 답안', '입력 자료를 우선'].forEach((token) => {
    assert.ok(source.includes(token), `missing token: ${token}`);
  });
});

test('answer review client includes grounding note copy', () => {
  const source = fs.readFileSync('app/answer-review/answer-review-client.tsx', 'utf8');
  ['유사 기출 Skeleton을 참고해 검토했습니다', '유사 기출 reference 없이 입력 자료 기준으로 검토했습니다'].forEach((token) => {
    assert.ok(source.includes(token), `missing token: ${token}`);
  });
});

test('guardrails, no public archive, and no payment copy in learner/public files', () => {
  const files = ['app/answer-review/answer-review-client.tsx', 'app/app/page.tsx', 'app/page.tsx', 'app/(marketing)/page.tsx'].filter((p) => fs.existsSync(p));
  const text = files.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  ['공식 모범답안', '공식 채점', '합격 판정', '확정 점수', '모범답안 확정', 'official grader', 'pass/fail judge', '정답 보장', '합격 보장', '합격 확률'].forEach((bad) => {
    assert.ok(!text.includes(bad), `forbidden guardrail copy found: ${bad}`);
  });
  ['/past-exams', '/exam-archive', '기출 아카이브', '20년치 기출'].forEach((bad) => {
    assert.ok(!text.includes(bad), `forbidden archive copy found: ${bad}`);
  });
  ['checkout', 'payment', '결제', '구독', '카드 등록'].forEach((bad) => {
    assert.ok(!text.includes(bad), `forbidden payment copy found: ${bad}`);
  });
});
