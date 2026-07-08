import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("beta banner copy exists", () => {
  const merged = ["app/page.tsx", "app/answer-review/page.tsx", "app/app/page.tsx", "app/app/capture/page.tsx", "app/app/review/page.tsx", "components/shared/closed-beta-banner.tsx"].map(read).join("\n");
  ["초대 베타", "학습 보조 초안", "공식 채점 아님"].forEach((phrase) => assert.ok(merged.includes(phrase)));
  assert.equal(merged.includes("감정평가사 1차/2차 학습 운영 흐름"), false);
});

test("feedback prompt exists", () => {
  const merged = ["app/answer-review/answer-review-client.tsx", "app/app/session/page.tsx", "components/shared/result-feedback-prompt.tsx"].map(read).join("\n");
  ["이 결과가 도움이 되었나요?", "도움됨", "애매함", "도움 안 됨"].forEach((phrase) => assert.ok(merged.includes(phrase)));
});

test("anonymous signup value copy exists", () => {
  const source = read("app/answer-review/answer-review-client.tsx");
  ["로그인하고 기록 저장", "복습", "오늘 계획"].forEach((phrase) => assert.ok(source.includes(phrase)));
});

test("runbook exists with required checklist lines", () => {
  assert.equal(existsSync("docs/closed-beta-operator-runbook.md"), true);
  const source = read("docs/closed-beta-operator-runbook.md");
  ["Invite 3–5 users", "first confusion point", "would use again tomorrow", "would pay", "Stop conditions"].forEach((phrase) => assert.ok(source.includes(phrase)));
});

test("guardrails: prohibited claims/providers are absent in learner/public files", () => {
  const merged = [
    read("app/page.tsx"),
    read("app/answer-review/page.tsx"),
    read("app/answer-review/answer-review-client.tsx"),
    read("app/app/page.tsx"),
    read("app/app/capture/page.tsx"),
    read("app/app/review/page.tsx"),
    read("components/review-os/capture-form.tsx"),
  ].join("\n").toLowerCase();

  ["확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장", "/instructor/source-review", "/instructor/second-grading", "@google-cloud/vision", "documentprocessorserviceclient", "tesseract", "documentai"].forEach((phrase) => assert.equal(merged.includes(phrase.toLowerCase()), false));
  assert.doesNotMatch(merged, /공식 채점(?!\s*아님|이나)/);
  assert.doesNotMatch(merged, /합격 판정(?!이 아닙니다|이 아님| 아님)/);
});
