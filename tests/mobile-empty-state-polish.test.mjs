import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("/app includes empty today-plan, review queue framing, and capture-origin plan labels", () => {
  const source = read("app/app/page.tsx");
  assert.ok(source.includes("아직 오늘 계획이 없습니다") || source.includes("오늘 계획이 없습니다"));
  assert.ok(source.includes("기록 추가하기") || source.includes("오늘 한 것 올리기"));
  assert.ok(source.includes("복습 큐"));
  assert.ok(source.includes("오늘 기록 기반"));
});

test("/app/capture and capture-form include OCR draft guidance, editable capture, CTA, and calm error copy", () => {
  const merged = `${read("app/app/capture/page.tsx")}\n${read("components/review-os/capture-form.tsx")}`;
  ["오늘 한 것 올리기", "오늘 공부한 내용 또는 내 답안", "OCR 결과는 초안입니다", "저장 전 직접 확인해 주세요", "기록 시작하기", "정리하지 못했습니다"].forEach((phrase) => {
    assert.ok(merged.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("/app/session includes saved-state proof copy", () => {
  const source = read("app/app/session/page.tsx");
  ["오늘 기록이 저장되었습니다.", "복습 큐에 들어갔습니다.", "오늘 계획에 반영되었습니다.", "가장 큰 간극:", "다음 행동:"].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("review queue client includes empty-state and capture-origin review copy", () => {
  const source = read("components/review-os/review-queue-client.tsx");
  assert.ok(source.includes("아직 복습 큐가 비어 있습니다") || source.includes("아직 오늘 기록이 없습니다"));
  assert.ok(source.includes("오늘 기록 남기기") || source.includes("오늘 한 것"));
  assert.ok(source.includes("반복 신호와 최근 기록 기준"));
  assert.ok(source.includes("다시 보기"));
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

  ["/instructor", "공식 채점", "합격", "불합격", "pass/fail", "official model answer", "@google-cloud/vision", "documentprocessorserviceclient"].forEach((token) => {
    assert.equal(learner.includes(token.toLowerCase()), false, `Forbidden token found: ${token}`);
  });
});
