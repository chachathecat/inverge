import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guide = readFileSync("lib/evaluate/casio-fx9860giii-guide.ts", "utf8");
const route = readFileSync("app/api/problem-snap/solve/route.ts", "utf8");
const ui = readFileSync("app/problem-snap/problem-snap-client.tsx", "utf8");
const learner = [
  "app/problem-snap/problem-snap-client.tsx",
  "app/problem-snap/page.tsx",
  "components/inverge/front-page.tsx",
  "app/app/page.tsx",
  "app/app/write/page.tsx",
].map((p) => readFileSync(p, "utf8")).join("\n");

test("helper contract exists and no eval", () => {
  ["buildCasioFx9860GiiiGuide", "CASIO fx-9860GIII", "RUN-MAT", "검토 필요"].forEach((t) => assert.ok(guide.includes(t), `Missing ${t}`));
  assert.equal(guide.includes("eval("), false, "eval should not exist");
});

test("API/result contains calculator guide fields", () => {
  ["calculatorGuide", "calculatorModel", "recommendedMode", "keystrokeSteps", "expectedDisplay", "answerRounding", "caution"].forEach((t) => assert.ok(route.includes(t), `Missing ${t}`));
});

test("UI contains CASIO section labels", () => {
  ["CASIO fx-9860GIII로 누르는 법", "계산 목적", "추천 모드", "버튼 순서", "화면에 나와야 할 값", "답안에 적는 값", "주의할 점"].forEach((t) => assert.ok(ui.includes(t), `Missing ${t}`));
});

test("Gemini prompt contains calculator guide policy lines", () => {
  [
    "계산이 필요한 문제라면 CASIO fx-9860GIII 입력 순서를 제시한다",
    "버튼 순서는 실제로 누르는 단위",
    "RUN-MAT 일반 계산을 우선한다",
    "검증되지 않은 특수 기능 경로는 단정하지 않는다",
    "반올림/단위 표시를 따로 적는다",
    "산식과 단위를 왜곡하지 않는다",
  ].forEach((t) => assert.ok(route.includes(t), `Missing ${t}`));
});

test("guardrails/no archive/no payment forbidden strings absent", () => {
  ["공식 모범답안", "공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장", "합격 확률", "CASIO 공식 보증", "CASIO 공식 인증", "/past-exams", "/exam-archive", "기출 아카이브", "20년치 기출", "checkout", "payment", "결제", "구독", "카드 등록"].forEach((t) => assert.equal(learner.includes(t), false, `Forbidden phrase found: ${t}`));
});
