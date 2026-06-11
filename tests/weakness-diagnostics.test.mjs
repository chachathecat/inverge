import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const helperPath = "lib/review-os/weakness-diagnostics.ts";
const homePath = "app/app/page.tsx";
const learnerFiles = [homePath, "app/app/items/page.tsx", helperPath];

test("weakness diagnostic helper exists with required fields", () => {
  assert.equal(existsSync(helperPath), true);
  const source = readFileSync(helperPath, "utf8");
  [
    "buildWeaknessDiagnostic",
    "buildPersonalWeaknessProfile",
    "topWeaknesses",
    "weakestSubject",
    "repeatedSignalCount",
    "overdueReviewCount",
    "primaryDiagnosticLine",
    "nextActionLine",
  ].forEach((needle) => assert.equal(source.includes(needle), true, `${needle} missing`));
});

test("home page renders weakness diagnostic labels", () => {
  const source = readFileSync(homePath, "utf8");
  ["우선순위 근거 보기", "반복 신호", "오늘은 이 약점 하나만 줄입니다.", "오늘 한 것 올리기"].forEach((needle) =>
    assert.equal(source.includes(needle), true, `${needle} missing`),
  );
  assert.equal(source.includes("내 답안에서 반복되는 약점"), false, "competing weakness card should be removed");
});

test("guardrails: no score/pass-fail/official grading claims in learner files", () => {
  const banned = ["합격 확률", "합격 판정", "공식 채점", "확정 점수", "pass/fail", "official grader"];
  learnerFiles.forEach((file) => {
    const source = readFileSync(file, "utf8").toLowerCase();
    banned.forEach((term) => assert.equal(source.includes(term.toLowerCase()), false, `${file} contains ${term}`));
  });
});

test("no heavy dashboard terms in learner files", () => {
  const banned = ["leaderboard", "ranking board", "control room", "analytics dashboard"];
  learnerFiles.forEach((file) => {
    const source = readFileSync(file, "utf8").toLowerCase();
    banned.forEach((term) => assert.equal(source.includes(term), false, `${file} contains ${term}`));
  });
});
