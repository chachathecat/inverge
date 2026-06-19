import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildConceptNodeCandidate,
  buildNextTaskTypeForConcept,
  buildRetrievalPromptForConcept,
  inferConceptFamilyFromMetadata,
  mapSubjectToConceptFamilies,
} from "../lib/review-os/concept-node-mapping.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";
import { buildCaptureNoteSignals } from "../lib/review-os/capture-note-engine.ts";
import { getRetrievalPrompt } from "../lib/review-os/retrieval-review.ts";
import { buildTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

const read = (path) => readFileSync(path, "utf8");

const firstSubjects = ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"];
const secondSubjects = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"];

test("concept family registry covers the learner-facing 1차 and 2차 subjects only", () => {
  for (const subject of firstSubjects) {
    assert.ok(mapSubjectToConceptFamilies("first", subject).length > 0, subject);
  }
  for (const subject of secondSubjects) {
    assert.ok(mapSubjectToConceptFamilies("second", subject).length > 0, subject);
  }

  assert.deepEqual(mapSubjectToConceptFamilies("first", "CPA"), []);
  assert.deepEqual(mapSubjectToConceptFamilies("second", "보험계리사"), []);
});

test("metadata inference maps required capture examples to concept families", () => {
  const cases = [
    ["first", "민법", { topic_candidate: "무효 취소 추인 소급효" }, "무효와 취소"],
    ["first", "회계학", { keyConcepts: ["재고 저가법 순실현가능가치"] }, "재고자산"],
    ["first", "회계학", { topic_candidate: "사채 상각후원가 이자비용" }, "부채/사채"],
    ["first", "경제학원론", { topic_candidate: "탄력성" }, "탄력성"],
    ["first", "경제학원론", { topic_candidate: "IS-LM" }, "IS-LM"],
    ["second", "감정평가실무", { topic_candidate: "수익 환원 환원이율 순수익" }, "수익방식"],
    ["second", "감정평가실무", { calculationRisk: "CASIO 검산 단위 반올림" }, "검산/CASIO"],
    ["second", "감정평가 및 보상법규", { missing_issue: "사업인정 처분성" }, "사업인정"],
    ["second", "감정평가 및 보상법규", { missing_issue: "수용재결 이의재결" }, "수용재결"],
    ["second", "감정평가이론", { topic_candidate: "최고최선이용" }, "최고최선이용"],
    ["second", "감정평가이론", { topic_candidate: "시장가치 공정가치" }, "시장가치/공정가치"],
  ];

  for (const [mode, subject, metadata, expected] of cases) {
    assert.equal(inferConceptFamilyFromMetadata(mode, subject, metadata), expected, `${subject} ${expected}`);
  }
});

test("candidate output is metadata-only draft reference data and excludes raw text-like fields", () => {
  const candidate = buildConceptNodeCandidate({
    mode: "first",
    subject: "민법",
    mistakeType: "조건 누락",
    metadata: {
      topic_candidate: "대리",
      rawQuestionText: "무효 취소 추인 소급효가 포함된 원문 전체",
      userAnswerText: "내 답안 원문",
      officialAnswer: "공식 해설 본문",
      sourceText: "저작권 있는 원문",
    },
  });

  assert.equal(candidate.metadataOnly, true);
  assert.equal(candidate.examMode, "first");
  assert.equal(candidate.subject, "민법");
  assert.equal(candidate.conceptFamily, "대리");
  assert.equal(candidate.sourceStatus, "draft");
  assert.equal(candidate.needsOfficialVerification, true);
  assert.match(candidate.retrievalPrompt, /대리/);

  const serialized = JSON.stringify(candidate);
  assert.doesNotMatch(serialized, /rawQuestionText|userAnswerText|officialAnswer|sourceText/);
  assert.doesNotMatch(serialized, /원문 전체|내 답안 원문|공식 해설 본문|저작권 있는 원문/);
});

test("prompt and task builders keep subject-specific retrieval behavior", () => {
  assert.match(buildRetrievalPromptForConcept("first", "민법", "무효와 취소"), /요건\/효과\/예외\/판례 연결/);
  assert.equal(buildNextTaskTypeForConcept("first", "회계학", "재고자산", "계산 실수"), "accounting_template");
  assert.equal(buildNextTaskTypeForConcept("second", "감정평가실무", "검산/CASIO", "단위 확인"), "calculator_routine");
  assert.equal(buildNextTaskTypeForConcept("second", "감정평가 및 보상법규", "사업인정", "처분성 누락"), "legal_issue_recall");
});

test("capture learning signal and capture note metadata carry concept candidates safely", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "item-1",
    examName: "감정평가사 1차",
    subject: "회계학",
    sourceType: "text",
    confidence: "낮음",
    mistakeReason: "계산 실수",
    keyConcepts: ["재고 저가법 순실현가능가치"],
    nextAction: "저가법 판단 기준을 먼저 회상합니다.",
    createdFromCapture: true,
  });

  assert.equal(signal.metadataJson?.concept_node_candidate?.metadataOnly, true);
  assert.equal(signal.metadataJson?.concept_node_candidate?.conceptFamily, "재고자산");
  assert.equal(signal.metadataJson?.conceptFamily, "재고자산");
  assert.equal(signal.metadataJson?.conceptNextTaskType, "accounting_template");
  assert.ok(signal.derivedTags.includes("재고자산"));

  const note = buildCaptureNoteSignals("second", {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "text",
    problemTitle: "CASIO 검산 단위 반올림",
    correctAnswer: "",
    userAnswer: "",
    confidence: "중간",
    missingIssue: "검산 누락",
    weakStructurePoint: "단위 확인 부족",
    createdFromCapture: true,
  });

  assert.equal(note.concept_node_candidate.metadataOnly, true);
  assert.equal(note.concept_node_candidate.conceptFamily, "검산/CASIO");
  assert.doesNotMatch(JSON.stringify(note.concept_node_candidate), /correctAnswer|userAnswer|raw/);
});

test("Retrieval Review and Today Plan prefer concept-node prompt and family when available", () => {
  const candidate = buildConceptNodeCandidate({
    mode: "first",
    subject: "민법",
    mistakeType: "조건 누락",
    metadata: { topic_candidate: "무효 취소 추인 소급효" },
  });
  const queueItem = {
    queueId: "queue-1",
    itemId: "item-1",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    problemTitle: "민법 오답",
    topicTag: "일반 개념",
    mistakeType: "조건 누락",
    reviewReason: "오늘 다시 볼 항목입니다.",
    priorityScore: 90,
    dueAt: "2026-06-18T00:00:00.000Z",
    recurrenceCount: 1,
    confidence: "낮음",
    timeSpentSeconds: 120,
    createdFromCapture: true,
    itemCreatedAt: "2026-06-18T00:00:00.000Z",
    conceptNodeCandidate: candidate,
  };

  assert.equal(getRetrievalPrompt(queueItem, "first"), candidate.retrievalPrompt);

  const tasks = buildTodayPlanTasks({
    mode: "first",
    queue: [queueItem, { ...queueItem, queueId: "queue-2", itemId: "item-2" }, { ...queueItem, queueId: "queue-3", itemId: "item-3" }, { ...queueItem, queueId: "queue-4", itemId: "item-4" }],
    now: new Date("2026-06-19T00:00:00.000Z"),
  });

  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].one_next_action, candidate.retrievalPrompt);
  assert.match(tasks[0].one_biggest_gap, /무효와 취소/);
  assert.match(tasks[0].title, /무효와 취소|무효·취소/);
});

test("concept-node cleanup keeps learner-facing forbidden claims and accent focus token out", () => {
  const combined = [
    "lib/review-os/concept-node-mapping.ts",
    "lib/review-os/retrieval-review.ts",
    "lib/review-os/today-plan-engine.ts",
    "lib/review-os/capture-learning-signals.ts",
    "lib/review-os/capture-note-engine.ts",
    "components/review-os/review-queue-client.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(combined, /기준\s*답안|공식\s*채점|모범답안|점수예측|합격예측|합격\s*가능성\s*확정/);
  assert.doesNotMatch(combined, /focus:border-\[color:var\(--accent\)\]/);
  assert.match(combined, /focus:border-\[color:var\(--brand-700\)\]/);
});
