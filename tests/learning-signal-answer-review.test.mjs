import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnswerReviewLearningSignalInput,
  getAnswerReviewInputQualityIssue,
  shouldSkipLearningSignalSave,
} from "../lib/review-os/learning-signal.ts";

test("separates first/second mode labels and normalizes subject", () => {
  const baseDraft = {
    questionSummary: "",
    requiredIssues: "",
    userAnswerStructure: "",
    referenceStructure: "",
    strengths: [],
    missingIssueCandidates: ["논점 누락"],
    weakParagraphPoint: "",
    weakLogicPoint: "",
    rewriteTarget: "",
    rewriteDraftSuggestion: "문단 다시 쓰기",
    nextAction: "논점 재작성",
    caution: "",
    coreConcepts: ["요건 판단"],
  };
  const first = buildAnswerReviewLearningSignalInput({
    examMode: "first",
    subjectInput: "민법",
    answerSourceType: "text",
    normalizedDraft: baseDraft,
  });
  const second = buildAnswerReviewLearningSignalInput({
    examMode: "second",
    subjectInput: "보상법규",
    answerSourceType: "file",
    normalizedDraft: baseDraft,
  });

  assert.equal(first.examMode, "감정평가사 1차");
  assert.equal(second.examMode, "감정평가사 2차");
  assert.equal(first.nextTaskType, "rewrite");
});

test("filters likely raw content from derived tags/formulas", () => {
  const noisy = "원문 복사 데이터입니다. ".repeat(20);
  const input = buildAnswerReviewLearningSignalInput({
    examMode: "first",
    subjectInput: "민법",
    answerSourceType: "text",
    normalizedDraft: {
      questionSummary: "",
      requiredIssues: "",
      userAnswerStructure: "",
      referenceStructure: "",
      strengths: [],
      missingIssueCandidates: [noisy, "논점 누락"],
      weakParagraphPoint: "",
      weakLogicPoint: "",
      rewriteTarget: "",
      rewriteDraftSuggestion: "",
      nextAction: "핵심 요건 정리",
      caution: "",
      coreConcepts: [noisy, "요건 공식"],
    },
  });
  assert.deepEqual(input.derivedTags, ["요건 공식", "논점 누락"]);
  assert.deepEqual(input.relatedFormulas, ["요건 공식"]);
  assert.equal(input.metadataJson.containsRawContent, false);
});

test("insufficient placeholder-like input is blocked before structure request", () => {
  const issue = getAnswerReviewInputQualityIssue({
    questionText: "",
    answerText: "asdf".repeat(20),
    referenceText: "",
    questionFileCount: 1,
    answerFileCount: 0,
    referenceFileCount: 0,
  });
  assert.equal(issue, "placeholder_like");
});

test("meaningful input passes quality gate", () => {
  const issue = getAnswerReviewInputQualityIssue({
    questionText: "임대차 보호 요건을 사례에 따라 검토하시오.",
    answerText: "사안에서는 대항력 요건과 우선변제권 요건을 분리해 판단해야 합니다.",
    referenceText: "쟁점별 법조문을 먼저 제시하고 사실관계를 대입합니다.",
    questionFileCount: 0,
    answerFileCount: 0,
    referenceFileCount: 0,
  });
  assert.equal(issue, null);
});

test("fallback-heavy structure skips learning signal save", () => {
  const skipReason = shouldSkipLearningSignalSave({
    questionSummary: "",
    requiredIssues: "",
    userAnswerSummary: "",
    userAnswerStructure: "",
    referenceStructure: "",
    strengths: [],
    missingIssueCandidates: [],
    weakParagraphPoint: "",
    weakLogicPoint: "",
    rewriteTarget: "",
    rewriteDraftSuggestion: "짧음",
    nextAction: "검토",
    caution: "",
    coreConcepts: [],
  });
  assert.equal(skipReason, "insufficient_structure");
});

test("normalized fallback draft is skipped", () => {
  const skipReason = shouldSkipLearningSignalSave({
    questionSummary: "문제 요구를 더 입력하면 구조화를 보강할 수 있습니다.",
    requiredIssues: "기준답안과 문제 요구를 더 입력하면 보강할 간극이 선명해집니다.",
    userAnswerSummary: "내 답안의 핵심을 한 줄로 정리해 주세요.",
    userAnswerStructure: "문단별 주장과 근거를 정리하면 구조 분석이 선명해집니다.",
    referenceStructure: "기준답안의 목차를 입력하면 비교가 정확해집니다.",
    strengths: [],
    missingIssueCandidates: [],
    weakParagraphPoint: "보강할 문단 포인트를 검토자가 직접 확인해 주세요.",
    weakLogicPoint: "논리 연결이 약한 지점을 검토자가 직접 확인해 주세요.",
    rewriteTarget: "교정 문단을 직접 작성해 다음 답안에 반영해 주세요.",
    rewriteDraftSuggestion: "교정 문단을 직접 작성해 다음 답안에 반영해 주세요.",
    nextAction: "문단 하나를 다시 쓰고 검토자 확인을 진행하세요.",
    caution: "구조화 결과는 검토 보조 초안이며 검토자 확인이 필요합니다.",
    coreConcepts: [],
  });
  assert.equal(skipReason, "insufficient_structure");
});

test("insufficient Gemini-style fallback text is skipped", () => {
  const skipReason = shouldSkipLearningSignalSave({
    questionSummary: "",
    requiredIssues: "",
    userAnswerSummary: "",
    userAnswerStructure: "",
    referenceStructure: "",
    strengths: [],
    missingIssueCandidates: ["답안 길이가 짧아 쟁점을 파악할 수 없습니다."],
    weakParagraphPoint: "",
    weakLogicPoint: "",
    rewriteTarget: "",
    rewriteDraftSuggestion: "답안을 더 입력하면 분석하기에 충분하지 않습니다.",
    nextAction: "검토자가 확인 후 직접 작성해 주세요.",
    caution: "",
    coreConcepts: ["추정 불가"],
  });
  assert.equal(skipReason, "insufficient_structure");
});

test("meaningful structure with real concepts is not skipped", () => {
  const skipReason = shouldSkipLearningSignalSave({
    questionSummary: "",
    requiredIssues: "",
    userAnswerSummary: "",
    userAnswerStructure: "",
    referenceStructure: "",
    strengths: [],
    missingIssueCandidates: ["우선변제권 성립요건 검토 누락"],
    weakParagraphPoint: "",
    weakLogicPoint: "",
    rewriteTarget: "",
    rewriteDraftSuggestion: "결론 문단에서 사실관계를 요건별로 다시 배치해 재작성하세요.",
    nextAction: "대항력·우선변제권을 분리한 2단락 개요를 먼저 작성하세요.",
    caution: "",
    coreConcepts: ["대항력 요건", "우선변제권 요건"],
  });
  assert.equal(skipReason, null);
});
