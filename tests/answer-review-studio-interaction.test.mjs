import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('app/answer-review/answer-review-client.tsx', 'utf8');

const mustContain = [
  '답안 훈련',
  '답안 스냅으로 시작',
  '사례 스캔',
  'PDF/사진 불러오기',
  '텍스트 붙여넣기',
  '내 답안 불러오기',
  '문제/사례 불러오기',
  '검토 참고자료 추가',
  '계산기 입력은 원문 숫자와 단위를 기준으로 본인 계산기에서 직접 확인해 주세요.',
  'answerCameraInputRef',
  'problemCameraInputRef',
  'generalFileInputRef',
  'answerTextRef',
  'capture="environment"',
  'accept="image/*"',
  'accept="image/*,.pdf"',
  'scrollIntoView',
  'focus',
  '내 답안',
  '필수',
  '내 답안만 있어도 검토를 시작할 수 있습니다',
  '답안 정리 시작',
  '가장 큰 간극',
  '누락 논점',
  '약한 구조',
  '다시 쓸 문장',
  '다음 행동',
  '보강 문단 정리',
];

for (const token of mustContain) {
  test(`contains required token: ${token}`, () => {
    assert.ok(source.includes(token));
  });
}

test('guardrail terms are absent in learner answer-review files', () => {
  const blocked = ['확정 점수', '모범답안 확정', 'official grader', 'pass/fail judge'];
  for (const token of blocked) {
    assert.equal(source.includes(token), false, `blocked token found: ${token}`);
  }
  assert.doesNotMatch(source, /공식 채점(?!\s*아님|이나)/);
  assert.doesNotMatch(source, /합격 판정(?!이 아닙니다|이 아니라|이 아님| 아님)/);
});

test('no new OCR provider tokens introduced', () => {
  const blocked = ['@google-cloud/vision', 'DocumentProcessorServiceClient', 'tesseract', 'documentai'];
  for (const token of blocked) {
    assert.equal(source.includes(token), false, `provider token found: ${token}`);
  }
});

test('no instructor route leakage', () => {
  const blocked = ['/instructor/source-review', '/instructor/second-grading'];
  for (const token of blocked) {
    assert.equal(source.includes(token), false, `instructor token found: ${token}`);
  }
});
