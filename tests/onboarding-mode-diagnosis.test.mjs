import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("onboarding asks only 3 core diagnosis questions", async () => {
  const source = await readFile(new URL("../components/review-os/profile-setup-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("준비 단계"));
  assert.ok(source.includes("가장 막히는 것"));
  assert.ok(source.includes("오늘 가능한 시간"));
  assert.equal(source.includes("목표 시험일"), false);
});

test("mode routing guardrails for capture/write and no grading claims", async () => {
  const source = await readFile(new URL("../components/review-os/profile-setup-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('`/app/capture?mode=first&subject=${encodeURIComponent(preferredSubject)}`'));
  assert.ok(source.includes('"/app/capture?mode=second"'));
  assert.ok(source.includes('"/app/write?mode=second"'));
  ["pass/fail", "합격/불합격", "공식 채점", "/instructor"].forEach((forbidden) => {
    assert.equal(source.includes(forbidden), false, `Forbidden claim found: ${forbidden}`);
  });
});
