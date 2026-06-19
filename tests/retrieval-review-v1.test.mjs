import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getRecallOutcomeCopy,
  getRetrievalPrompt,
  getSuggestedReviewIntervalCopy,
  RECALL_OUTCOME_OPTIONS,
} from "../lib/review-os/retrieval-review.ts";
import { TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

const read = (path) => readFileSync(path, "utf8");

const bannedLearnerCopy = /공식\s*채점|모범답안|기준답안|점수예측|합격예측|합격\s*가능성\s*확정/;

function item(subjectLabel, mode = "first") {
  return {
    subjectLabel,
    topicTag: mode === "second" ? "쟁점" : "개념",
    mistakeType: mode === "second" ? "구조 약함" : "조건 누락",
  };
}

test("Review Queue primary surface starts with active recall before details", () => {
  const source = read("components/review-os/review-queue-client.tsx");

  assert.ok(source.includes("data-review-primary-surface"));
  assert.ok(source.includes("지금 복습할 1개"));
  assert.ok(source.includes('data-review-retrieval-step="recall"'));
  assert.ok(source.includes("먼저 떠올리기"));
  assert.ok(source.includes("문단/기준 먼저 떠올리기"));
  assert.ok(source.includes("data-review-recall-input"));
  assert.ok(source.includes("답을 보기 전, 기억나는 기준을 먼저 적어보세요."));
  assert.ok(source.includes("확인하기"));

  assert.ok(source.indexOf('data-review-retrieval-step="check"') < source.indexOf("data-review-extra-signals"));
  assert.ok(source.includes("상세 신호와 학습 노트는 먼저 떠올린 뒤 확인합니다."));
});

test("Review Queue self-rating outcomes and learning-signal copy are present", () => {
  const source = read("components/review-os/review-queue-client.tsx");
  const helper = read("lib/review-os/retrieval-review.ts");
  const combined = `${source}\n${helper}`;

  ["기억남", "헷갈림", "틀림", "확신하고 틀림"].forEach((label) => assert.ok(combined.includes(label), label));
  assert.ok(source.includes("이 평가는 점수가 아니라 다음 복습 간격을 정하기 위한 학습 신호입니다."));
  assert.ok(source.includes("data-review-interval-suggestion"));
  assert.ok(source.includes("이번 PR에서는 복습 완료 신호만 저장하고, 세부 간격 조정은 다음 단계에서 연결합니다."));
  assert.ok(source.includes("복습 완료"));
  assert.ok(source.includes("disabled={pendingId === primaryItem.queueId || !primaryOutcome}"));
  assert.ok(source.includes("retrievalReviewVersion: \"v1\""));
  assert.ok(source.includes("recallOutcome"));
  assert.ok(source.includes("suggestedReviewInterval"));
});

test("recall outcome helper copy maps to suggested review intervals", () => {
  assert.deepEqual(RECALL_OUTCOME_OPTIONS.map((option) => option.label), ["기억남", "헷갈림", "틀림", "확신하고 틀림"]);
  assert.equal(getRecallOutcomeCopy("remembered"), "기억남");
  assert.equal(getSuggestedReviewIntervalCopy("remembered"), "며칠 뒤 다시 확인");
  assert.equal(getSuggestedReviewIntervalCopy("fuzzy"), "내일 또는 3일 뒤 다시 확인");
  assert.equal(getSuggestedReviewIntervalCopy("wrong"), "내일 다시 확인");
  assert.equal(getSuggestedReviewIntervalCopy("confident_wrong"), "오늘 한 번 더 + 내일 다시 확인");
});

test("1차 subjects map to retrieval prompts instead of rereading copy", () => {
  const prompts = [
    getRetrievalPrompt(item("민법"), "first"),
    getRetrievalPrompt(item("경제학원론"), "first"),
    getRetrievalPrompt(item("부동산학원론"), "first"),
    getRetrievalPrompt(item("감정평가관계법규"), "first"),
    getRetrievalPrompt(item("회계학"), "first"),
  ];

  [
    "요건/효과/예외 중 하나를 먼저 떠올려 보세요.",
    "그래프 이동 방향 또는 균형 변화를 먼저 떠올려 보세요.",
    "정의 또는 계산 조건 1개를 먼저 떠올려 보세요.",
    "조문/요건/절차 중 하나를 먼저 떠올려 보세요.",
    "분개 방향, 인식 시점, 계산 조건 중 하나를 먼저 떠올려 보세요.",
  ].forEach((expected) => assert.ok(prompts.includes(expected), expected));
  prompts.forEach((prompt) => assert.doesNotMatch(prompt, /다시\s*읽|수동|reread/i));
});

test("2차 subjects map to structure, rewrite, and calculation retrieval prompts", () => {
  const prompts = [
    getRetrievalPrompt(item("감정평가실무", "second"), "second"),
    getRetrievalPrompt(item("감정평가이론", "second"), "second"),
    getRetrievalPrompt(item("감정평가 및 보상법규", "second"), "second"),
  ];

  assert.ok(prompts.includes("산식, 단위, 결론 기재값 중 하나를 먼저 적어 보세요."));
  assert.ok(prompts.includes("정의, 논거, 사례 적용 키워드 3개를 먼저 떠올려 보세요."));
  assert.ok(prompts.includes("쟁점, 조문/요건, 사안 포섭 순서를 먼저 떠올려 보세요."));
  prompts.forEach((prompt) => assert.match(prompt, /먼저/));
});

test("Retrieval Review v1 keeps banned learner-facing copy out and Today Plan max 3 intact", () => {
  const combined = [
    "components/review-os/review-queue-client.tsx",
    "lib/review-os/retrieval-review.ts",
    "lib/review-os/types.ts",
  ].map(read).join("\n");

  assert.doesNotMatch(combined, bannedLearnerCopy);
  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
});
