import test from "node:test";
import assert from "node:assert/strict";

import { buildAnswerReviewLearningSignalInput } from "../lib/review-os/learning-signal.ts";

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
