import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const forbiddenLaunchCopy = [
  "1차 오답",
  "1차 세트 풀이",
  "합격 가능성",
  "확정 점수",
  "공식 모범답안",
];

test("S220C answer review route defaults into second-round first-minute flow", () => {
  const page = read("app/answer-review/page.tsx");

  assert.match(page, /redirect\("\/answer-review\?mode=second"\)/);
  assert.match(page, /S220CFirstFiveMinuteMagic/);
  assert.match(page, /id="answer-review-start"/);
});

test("S220C first five-minute component exposes staged capture-to-review wizard copy", () => {
  const source = read("components/review-os/s220c-first-five-minute-magic.tsx");

  for (const phrase of [
    "첫 5분 흐름",
    "오늘 쓴 답안 하나만 올리세요.",
    "답안 사진",
    "PDF/파일",
    "텍스트 붙여넣기",
    "1. 답안 입력/업로드",
    "2. OCR/텍스트 확인",
    "3. 감점 위험 확인",
    "4. 다시쓰기/복습 연결",
    "학습 보조 초안",
    "저장 전 직접 확인해 주세요.",
    "감점 위험 preview",
    "다시 쓸 문단 preview",
    "Today Plan",
    "Review Queue",
    "Notes",
  ]) {
    assert.ok(source.includes(phrase), `missing S220C phrase: ${phrase}`);
  }

  assert.equal((source.match(/buttonVariants\(\{ size: "lg" \}\)/g) ?? []).length, 1);
  assert.match(source, /href="#answer-review-start"/);
});

test("S220C preserves existing editable text and upload entry points without first-round launch promotion", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const component = read("components/review-os/s220c-first-five-minute-magic.tsx");
  const combined = `${answerReview}\n${component}`;

  assert.match(answerReview, /capture="environment"/);
  assert.match(answerReview, /accept="image\/\*,\.pdf"/);
  assert.match(answerReview, /answerTextRef/);
  assert.match(answerReview, /value=\{myAnswerText\}/);
  assert.match(answerReview, /setMyAnswerText/);
  assert.match(answerReview, /답안 스냅으로 시작/);
  assert.match(answerReview, /텍스트 붙여넣기/);
  assert.match(answerReview, /가장 큰 간극/);
  assert.match(answerReview, /다음 행동/);

  for (const phrase of forbiddenLaunchCopy) {
    assert.equal(component.includes(phrase), false, `forbidden S220C launch copy: ${phrase}`);
  }
  assert.doesNotMatch(combined, /checkout|payment webhook|billing provider|entitlement enforcement|production pricing/i);
});
