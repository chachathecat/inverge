import test from "node:test";
import assert from "node:assert/strict";

import { buildSecondRewriteComparison } from "../lib/review-os/second-rewrite-comparison.ts";

test("second rewrite comparison maps by subject", () => {
  const practice = buildSecondRewriteComparison({ subject: "감정평가실무", rewriteParagraph: "계산근거를 먼저 제시한다." });
  assert.ok(practice.nextSentenceAction.includes("결론 수치 명확성"));

  const theory = buildSecondRewriteComparison({ subject: "감정평가이론", rewriteParagraph: "정의와 논거를 연결한다." });
  assert.ok(theory.nextSentenceAction.includes("결론 구체성"));

  const law = buildSecondRewriteComparison({ subject: "감정평가 및 보상법규", rewriteParagraph: "조문/요건을 먼저 쓴다." });
  assert.ok(law.nextSentenceAction.includes("결론"));
});

test("second rewrite comparison keeps non-grading language", () => {
  const output = buildSecondRewriteComparison({
    subject: "감정평가이론",
    beforeWeakPoint: "정의 누락",
    skeletonKeywordHint: "정의",
    rewriteParagraph: "정의를 먼저 제시하고 논거를 연결합니다.",
  });

  const joined = [output.improvedPoint, output.remainingRisk, output.nextSentenceAction, output.caution].join(" ").toLowerCase();
  ["score", "pass", "fail", "official", "채점", "합격", "불합격", "모범답안"].forEach((token) => {
    assert.equal(joined.includes(token), false);
  });
});
