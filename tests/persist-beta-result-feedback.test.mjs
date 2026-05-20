import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("result feedback prompt is wired to persistence API", () => {
  const source = read("components/shared/result-feedback-prompt.tsx");
  assert.equal(source.includes("로컬 상태만 저장"), false);
  ["fetch(", "/api/review-os/feedback", "의견이 저장되었습니다", "의견을 저장하지 못했습니다", "의견 보내기", "route?", "pageContext?"].forEach((token) => assert.ok(source.includes(token)));
});

test("review os feedback API route exists and supports rating payload", () => {
  assert.equal(existsSync("app/api/review-os/feedback/route.ts"), true);
  const source = read("app/api/review-os/feedback/route.ts");
  ["POST", "helpful", "unclear", "not_helpful", "reviewOsService", "{ ok: true }"]
    .forEach((token) => assert.ok(source.includes(token)));
});

test("answer review result screen passes route context", () => {
  const source = read("app/answer-review/answer-review-client.tsx");
  ["ResultFeedbackPrompt", 'route="/answer-review"', "answer-review-result"].forEach((token) => assert.ok(source.includes(token)));
});

test("session saved capture passes route context", () => {
  const source = read("app/app/session/page.tsx");
  ["ResultFeedbackPrompt", 'route="/app/session"', "saved-capture"].forEach((token) => assert.ok(source.includes(token)));
});

test("guardrails and payment terms absent from learner/public surfaces", () => {
  const merged = [
    read("app/page.tsx"),
    read("app/answer-review/page.tsx"),
    read("app/answer-review/answer-review-client.tsx"),
    read("app/app/page.tsx"),
    read("app/app/capture/page.tsx"),
    read("app/app/review/page.tsx"),
    read("app/app/session/page.tsx"),
    read("components/shared/result-feedback-prompt.tsx"),
  ].join("\n").toLowerCase();

  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장", "합격 확률", "checkout", "payment", "결제", "구독", "카드 등록"].forEach((phrase) => {
    assert.equal(merged.includes(phrase.toLowerCase()), false);
  });
});
