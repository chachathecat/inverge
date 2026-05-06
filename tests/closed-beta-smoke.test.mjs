import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildCaptureLearningSignal, buildCaptureReviewReason, computeCaptureQueuePriority } from "../lib/review-os/capture-learning-signals.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const read = (path) => readFileSync(path, "utf8");

const RAW_FIELDS = ["rawQuestionText", "rawAnswerText", "raw_ocr_text", "raw_extraction_json"];

const FORBIDDEN_PROVIDER_TOKENS = [
  "@google-cloud/vision",
  "DocumentProcessorServiceClient",
  "tesseract",
  "openai",
  "gemini",
  "documentai",
];

const FORBIDDEN_GRADING_CLAIMS = [
  "공식 채점",
  "합격 판정",
  "확정 점수",
  "모범답안 확정",
  "official grader",
  "pass/fail judge",
];

const LEARNER_FILES = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/session/page.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/review-queue-client.tsx",
];

test("learner home contains operational copy", () => {
  const source = read("app/app/page.tsx");
  assert.ok(source.includes("오늘은 이것부터 하세요") || source.includes("오늘의 우선순위"));
  assert.ok(source.includes("오늘 기록 기반"));
  assert.ok(source.includes("공부한 흔적"));
  assert.ok(source.includes("복습 큐"));
  assert.ok(source.includes("오늘 계획"));
});

test("capture page contains capture+note framing copy", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const merged = `${capturePage}\n${captureForm}`;
  ["오늘 한 것 올리기", "오늘 공부한 내용 또는 내 답안", "사진 찍기", "앨범에서 선택", "OCR 결과는 초안입니다", "기록 시작하기", "가장 큰 gap", "다음 행동"].forEach((phrase) => {
    assert.ok(merged.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("capture learning signal for 1차 is safe and retry/review oriented", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "first-1",
    examName: "감정평가사 1차",
    subject: "민법",
    sourceType: "manual",
    confidence: "낮음",
    timeSpentSeconds: 220,
    biggestGap: "요건 누락",
    nextAction: "요건 3개 회상 후 재시도",
    mistakeReason: "조건 누락",
    keyConcepts: ["요건"],
    createdFromCapture: true,
  });
  assert.equal(signal.examMode, "감정평가사 1차");
  assert.ok(signal.derivedTags.includes("objective_mistake"));
  assert.ok(signal.derivedTags.includes("review_needed"));
  assert.ok(["retry", "review", "recall"].includes(signal.nextTaskType));
  const metadata = JSON.stringify(signal.metadataJson);
  RAW_FIELDS.forEach((field) => assert.equal(metadata.includes(field), false));
  assert.ok(computeCaptureQueuePriority({ examName: "감정평가사 1차", confidence: "낮음", timeSpentSeconds: 220, mistakeOrWeakPoint: "조건 누락" }) >= 60);
  assert.ok(buildCaptureReviewReason({ examName: "감정평가사 1차", confidence: "낮음", mistakeReason: "조건 누락" }).length > 0);
});

test("capture learning signal for 2차 is safe and rewrite oriented", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "second-1",
    examName: "감정평가사 2차",
    subject: "감정평가이론",
    sourceType: "manual",
    confidence: "중간",
    biggestGap: "답안 구조 약점",
    nextAction: "논점 순서 재정렬",
    weakStructurePoint: "결론 먼저 배치 안 됨",
    missingIssue: "시장가치 논점 누락",
    rewriteInstruction: "누락 논점을 첫 문단에 추가 후 다시 쓰기",
    createdFromCapture: true,
  });
  assert.equal(signal.examMode, "감정평가사 2차");
  assert.ok(signal.derivedTags.includes("answer_structure"));
  assert.ok(signal.derivedTags.includes("rewrite_needed"));
  assert.equal(signal.nextTaskType, "rewrite");
  const metadata = JSON.stringify(signal.metadataJson);
  RAW_FIELDS.forEach((field) => assert.equal(metadata.includes(field), false));
  assert.ok(computeCaptureQueuePriority({ examName: "감정평가사 2차", confidence: "중간", mistakeOrWeakPoint: "논점 누락", weakStructurePoint: "구조 약점", missingIssue: "논점 누락" }) >= 65);
  assert.ok(buildCaptureReviewReason({ examName: "감정평가사 2차", confidence: "중간", missingIssue: "논점 누락" }).includes("누락"));
});

test("review queue keeps learner-visible capture loop proof copy", () => {
  const source = read("components/review-os/review-queue-client.tsx");
  ["오늘 한 것", "반복 신호와 최근 기록 기준", "다시 보기", "공부한 흔적을 하나 올리면 오늘 계획과 복습 큐가 업데이트됩니다."].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("today plan tasks from capture origin are bounded and action-oriented", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    now: new Date("2026-05-06T12:00:00.000Z"),
    queue: [
      {
        queueId: "q-second-1",
        itemId: "i-second-1",
        examName: "감정평가사 2차",
        subjectLabel: "감정평가이론",
        problemTitle: "시장가치 논점",
        topicTag: "시장가치",
        mistakeType: "논점 누락",
        reviewReason: "rewrite 후속",
        priorityScore: 80,
        dueAt: "2026-05-05T00:00:00.000Z",
        recurrenceCount: 2,
        confidence: "중간",
        timeSpentSeconds: 900,
        createdFromCapture: true,
        itemCreatedAt: "2026-05-06T09:00:00.000Z",
      },
    ],
  });
  assert.ok(tasks.length >= 1);
  assert.ok(tasks.length <= 3);
  assert.equal(tasks[0].created_from_capture, true);
  assert.equal(tasks[0].source_label, "오늘 기록 기반");
  assert.ok(String(tasks[0].one_next_action).length > 0);
  assert.ok(tasks.some((task) => task.task_type === "rewrite" || /문단|논점|다시/.test(task.one_next_action)));
});

test("saved capture confirmation copy exists", () => {
  const source = read("app/app/session/page.tsx");
  ["오늘 기록이 저장되었습니다.", "복습 큐에 들어갔습니다.", "오늘 계획에 반영되었습니다.", "가장 큰 간극:", "다음 행동:"].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("safety guardrails prevent instructor leakage, provider tokens, and official grading claims", () => {
  const learnerJoined = LEARNER_FILES.map((file) => read(file)).join("\n");
  assert.equal(learnerJoined.includes("/instructor/source-review"), false);
  assert.equal(learnerJoined.includes("/instructor/second-grading"), false);
  FORBIDDEN_PROVIDER_TOKENS.forEach((token) => assert.equal(learnerJoined.toLowerCase().includes(token.toLowerCase()), false, `Forbidden provider token found: ${token}`));
  FORBIDDEN_GRADING_CLAIMS.forEach((claim) => assert.equal(learnerJoined.toLowerCase().includes(claim.toLowerCase()), false, `Forbidden grading claim found: ${claim}`));
});

test("beta readiness docs exist and keep closed-beta anchors", () => {
  assert.equal(existsSync("docs/beta-readiness-rubric.md"), true);
  assert.equal(existsSync("docs/closed-beta-checklist.md"), true);
  const rubric = read("docs/beta-readiness-rubric.md").toLowerCase();
  ["9.0/10", "do-not-launch", "learning operations system", "reference_only", "needs_review"].forEach((phrase) => {
    assert.ok(rubric.includes(phrase.toLowerCase()), `Missing phrase: ${phrase}`);
  });
});
