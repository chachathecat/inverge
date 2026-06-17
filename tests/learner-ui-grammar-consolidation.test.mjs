import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const learnerSurfaceFiles = [
  "components/learner/learner-ui.tsx",
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "components/review-os/capture-form.tsx",
  "app/app/review/page.tsx",
  "app/app/notes/page.tsx",
  "app/app/items/page.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/local-beta-note-reflection.tsx",
  "components/review-os/learning-agenda-client.tsx",
];

const joinedLearnerSurfaces = () => learnerSurfaceFiles.map(read).join("\n");

test("learner nav uses the consolidated Korean loop terms", () => {
  const shell = read("components/learner/learner-ui.tsx");

  [
    'label: "오늘 할 일"',
    'label: "오늘 한 것"',
    'label: "복습"',
    'label: "학습 노트"',
    'label: "학습 기록"',
  ].forEach((term) => assert.ok(shell.includes(term), term));
});

test("Capture, Today, Review, Notes, and Agenda expose the connected learner loop", () => {
  const combined = joinedLearnerSurfaces();

  [
    "오늘 한 것 올리기",
    "학습 노트 초안 만들기",
    "오늘 할 일",
    "복습",
    "학습 노트",
    "학습 기록",
    "가장 큰 약점",
    "다음 행동",
    "오늘 한 것 올리기 → 학습 노트 → 오늘 할 일 → 복습 → 학습 기록",
    "학습 노트 / 복습 / 오늘 할 일",
  ].forEach((term) => assert.ok(combined.includes(term), term));
});

test("empty states keep one clear next action back to Capture", () => {
  const reviewQueue = read("components/review-os/review-queue-client.tsx");
  const agenda = read("components/review-os/learning-agenda-client.tsx");
  const localBeta = read("components/review-os/local-beta-note-reflection.tsx");

  assert.ok(reviewQueue.includes("아직 계정 저장 기준으로 복습할 항목이 없습니다."));
  assert.ok(reviewQueue.includes("오늘 한 것 올리기"));
  assert.ok(agenda.includes("아직 쌓인 학습 기록이 없습니다."));
  assert.ok(agenda.includes("오늘 한 것 올리기"));
  assert.ok(localBeta.includes("오늘 한 것 1개를 올리면 오늘 할 일에 반영됩니다."));
});

test("learner routes remain present without adding product behavior", () => {
  assert.equal(existsSync("app/app/page.tsx"), true);
  assert.equal(existsSync("app/app/capture/page.tsx"), true);
  assert.equal(existsSync("app/app/review/page.tsx"), true);
  assert.equal(existsSync("app/app/notes/page.tsx"), true);
  assert.equal(existsSync("app/app/agenda/page.tsx"), true);

  const notes = read("app/app/notes/page.tsx");
  assert.ok(notes.includes("renderReviewOsItemsPage"));
});

test("learner grammar cleanup does not reintroduce forbidden wording or instructor links", () => {
  const combined = joinedLearnerSurfaces();

  assert.doesNotMatch(combined, /기준\s*답안|기준답안|모범답안|공식답안|공식 채점|점수예측|합격예측|합격 가능성 확정|정답 확정|최종 판단|pass\/fail/i);
  assert.doesNotMatch(combined, /\/instructor\/second-grading|grade-second|second-grading/);
  assert.doesNotMatch(combined, /Notes \/ Review \/ Today|Review Queue|Today Plan/);
  assert.doesNotMatch(combined, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});
