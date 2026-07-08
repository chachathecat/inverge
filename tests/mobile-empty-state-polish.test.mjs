import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("/app includes empty today-plan, review queue framing, and capture-origin plan labels", () => {
  const source = read("app/app/page.tsx");
  assert.ok(source.includes("오늘 할 일이 아직 없습니다."));
  assert.ok(source.includes("오늘 한 것 올리기"));
  assert.ok(source.includes("복습"));
  assert.ok(source.includes("오늘 기록 기반"));
});

test("/app/capture and capture-form include OCR draft guidance, editable capture, CTA, and calm error copy", () => {
  const merged = `${read("app/app/capture/page.tsx")}\n${read("components/review-os/capture-form.tsx")}`;
  ["오늘 한 것 올리기", "오늘 공부한 내용 또는 내 답안", "OCR과 AI 정리는 학습 보조 초안입니다", "저장 전 직접 수정할 수 있습니다", "입력 내용 확인하기", "정리하지 못했습니다"].forEach((phrase) => {
    assert.ok(merged.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("/app/session includes saved-state proof copy", () => {
  const source = read("app/app/session/page.tsx");
  ["오늘 계획에 반영했습니다.", "오늘 계획에 반영", "복습에 남길 내용", "학습 노트 상세에 저장했습니다.", "가장 큰 간극:", "다음 행동:"].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("review queue client includes empty-state and capture-origin review copy", () => {
  const source = read("components/review-os/review-queue-client.tsx");
  assert.ok(source.includes("지금 복습할 항목이 없습니다."));
  assert.ok(source.includes("오늘 한 것 올리기"));
  assert.ok(source.includes("오늘 한 것을 올리면 복습할 항목이 만들어집니다."));
  assert.ok(source.includes("다음 행동"));
});

test("mobile-friendly learner layout classes exist and no table-heavy learner layout introduced", () => {
  const joined = [
    read("app/app/page.tsx"),
    read("app/app/capture/page.tsx"),
    read("app/app/review/page.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("components/review-os/review-queue-client.tsx"),
  ].join("\n");
  assert.ok(joined.includes("w-full"));
  assert.ok(joined.includes("sm:w-auto") || joined.includes("md:w-auto"));
  assert.ok(joined.includes("grid gap") || joined.includes("flex-col"));
  assert.equal(joined.includes("<table"), false);
});

test("guardrails: no instructor leakage, no official grading/pass-fail claims, no OCR provider tokens, no raw field exposure", () => {
  const learner = [
    read("app/app/page.tsx"),
    read("app/app/capture/page.tsx"),
    read("app/app/session/page.tsx"),
    read("app/app/review/page.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("components/review-os/review-queue-client.tsx"),
  ].join("\n").toLowerCase();

  ["/instructor", "공식 채점", "합격 판정", "불합격 판정", "pass/fail", "official model answer", "@google-cloud/vision", "documentprocessorserviceclient"].forEach((token) => {
    if (token === "공식 채점") {
      assert.doesNotMatch(learner, /공식\s*채점(?!\s*아님)/, `Forbidden token found: ${token}`);
      return;
    }
    assert.equal(learner.includes(token.toLowerCase()), false, `Forbidden token found: ${token}`);
  });
});
