import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const files = ["app/problem-snap/page.tsx", "app/problem-snap/problem-snap-client.tsx", "app/api/problem-snap/solve/route.ts"];

test("route/page exists", () => files.forEach((f) => assert.ok(existsSync(f), `Missing ${f}`)));

test("UI contains required strings", () => {
  const text = readFileSync("app/problem-snap/problem-snap-client.tsx", "utf8") + readFileSync("components/inverge/front-page.tsx", "utf8") + readFileSync("app/app/page.tsx", "utf8") + readFileSync("app/app/write/page.tsx", "utf8");
  ["문제 스냅 풀이", "문제 풀이 흐름 만들기", "개념·공식·풀이 순서", "쉽게 풀이", "기본 해설", "시험답안식", "정답 확정이 아니라 학습 보조 풀이"].forEach((t) => assert.ok(text.includes(t), `Missing ${t}`));
});

test("API contains contract fields", () => {
  const source = readFileSync("app/api/problem-snap/solve/route.ts", "utf8");
  ["problemSummary", "requiredConcepts", "formulas", "stepByStepSolution", "examStyleStructure", "commonMistakes", "nextPracticeAction", "referenceGrounding"].forEach((t) => assert.ok(source.includes(t), `Missing ${t}`));
});

test("Gemini prompt contains policy lines", () => {
  const source = readFileSync("app/api/problem-snap/solve/route.ts", "utf8");
  ["모든 출력은 한국어", "중고등학생도 이해할 수 있게", "공식/산식은 왜곡하지 말 것", "모르면 검토 필요", "공식 채점, 점수, 합격 판정 금지"].forEach((t) => assert.ok(source.includes(t), `Missing ${t}`));
});

test("Guardrails/no archive/no payment forbidden strings absent", () => {
  const learner = ["app/problem-snap/problem-snap-client.tsx", "app/problem-snap/page.tsx", "components/inverge/front-page.tsx", "app/app/page.tsx", "app/app/write/page.tsx"].map((p) => readFileSync(p, "utf8")).join("\n");
  ["공식 모범답안", "공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장", "합격 확률", "/past-exams", "/exam-archive", "기출 아카이브", "20년치 기출", "checkout", "payment", "결제", "구독", "카드 등록"].forEach((t) => assert.equal(learner.includes(t), false, `Forbidden phrase found: ${t}`));
});
