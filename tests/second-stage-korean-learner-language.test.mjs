import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  REVIEW_OS_LEARNER_LANGUAGE,
  learnerDueAtLabel,
  learnerExecutionStateLabel,
  learnerGapStateLabel,
  learnerLedgerEntryLabel,
  learnerPlanBlockLabel,
  learnerPlanCompletionLabel,
  learnerPlanKindLabel,
  learnerPlanStateLabel,
  learnerPlanTerminalLabel,
  learnerRecordStateLabel,
  learnerReviewPhaseLabel,
} from "../lib/review-os/learner-language.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const components = [
  "components/review-os/c3r-p-practice-loop.tsx",
  "components/review-os/c3r-t-theory-loop.tsx",
  "components/review-os/c3r-l-law-loop.tsx",
].map(read);

test("three second-stage loops share one canonical learner vocabulary", () => {
  assert.deepEqual(REVIEW_OS_LEARNER_LANGUAGE, {
    today: "오늘",
    primaryTask: "오늘의 한 가지",
    todayPlan: "오늘 할 일",
    fullDayPlan: "오늘 전체 공부표",
    reviewQueue: "복습 대기",
    studyLedger: "내 공부 기록",
    biggestGap: "가장 큰 감점 원인",
    repair: "지금 고치기",
    d1: "다음 날 혼자 해보기",
    d7: "일주일 뒤 다른 문제",
    recurrence: "제한시간 실전 확인",
    stable: "현재 안정",
    reopened: "다시 확인 필요",
    unavailable: "확인 필요",
  });

  for (const source of components) {
    assert.match(source, /@\/lib\/review-os\/learner-language/);
    assert.match(source, /다음 날 혼자 해보기/);
    assert.match(source, /일주일 뒤 다른 문제/);
    assert.match(source, /제한시간 실전 확인/);
    assert.match(source, /복습 대기/);
    assert.match(source, /내 공부 기록/);
    assert.match(source, /grid-cols-1[\s\S]*sm:grid-cols-2/);
  }
});

test("known internal values map to Korean labels and unknown values fail closed", () => {
  const cases = [
    [learnerRecordStateLabel, "D0_OPEN", "첫 답안 작성 중"],
    [learnerRecordStateLabel, "CLOSED", "현재 안정"],
    [learnerReviewPhaseLabel, "D7_TRANSFER", "일주일 뒤 다른 문제"],
    [learnerPlanKindLabel, "FULL_DAY", "오늘 전체 공부표"],
    [learnerPlanStateLabel, "EDITED", "고쳐서 수락함"],
    [learnerPlanCompletionLabel, "TERMINAL_INCOMPLETE", "미완료 종료"],
    [learnerPlanTerminalLabel, "SUPERSEDED", "새 계획으로 바뀜"],
    [learnerPlanBlockLabel, "CORE_OUTCOME", "중요 학습"],
    [learnerExecutionStateLabel, "PENDING", "할 일"],
    [learnerGapStateLabel, "REOPENED", "다시 확인 필요"],
    [learnerLedgerEntryLabel, "D1_ASSISTED", "도움을 사용한 다음 날 복습"],
  ];
  for (const [mapper, internalValue, expectedLabel] of cases) {
    assert.equal(mapper(internalValue), expectedLabel);
    assert.notEqual(mapper(internalValue), internalValue);
    assert.equal(mapper("FUTURE_UNKNOWN_VALUE"), "확인 필요");
  }
  assert.equal(learnerPlanTerminalLabel(null), "해당 없음");
});

test("learner dates are localized and invalid values never leak", () => {
  const localized = learnerDueAtLabel("2026-09-13T10:40:54.000Z");
  assert.match(localized, /2026/);
  assert.match(localized, /9(?:월|\.)/);
  assert.equal(learnerDueAtLabel("not-a-date"), "확인 필요");
  assert.equal(learnerDueAtLabel(null), "확인 필요");
});

test("default learner presentation omits legacy shorthand and raw planner labels", () => {
  const forbiddenVisibleCopy = [
    "D+1 복습은",
    "D+1 독립 재구성",
    "D+7 전이 과업",
    "Review Queue · Today",
    "Personal Study Ledger",
    "CoreOutcome은",
    "계획 상태:",
    "dayComplete:",
    "Owner-only · 기본 OFF",
    "durable-learning",
  ];
  for (const source of components) {
    for (const copy of forbiddenVisibleCopy) assert.equal(source.includes(copy), false, copy);
  }

  const lawSource = components[2];
  assert.match(lawSource, /<details[^>]*data-testid="c3r-l-direct-repair-reference"/);
  assert.match(lawSource, /<summary className="cursor-pointer font-semibold">검증용 기술 정보<\/summary>/);
});

test("active execution receipt keeps this change in S2 and preserves the S3/S4 gate", () => {
  const plan = read("docs/exec-plans/active/inverge-owner-study-os.md");
  assert.match(plan, /#926 integrated -> #927 Korean learner language/);
  assert.match(plan, /next bounded S2 slice/);
  assert.match(plan, /S4[\s\S]*blocked until S3 is separately approved and terminally completed/);
  assert.match(plan, /Do not[\s\S]*treat this presentation slice or its PR as Goal completion/);
});
