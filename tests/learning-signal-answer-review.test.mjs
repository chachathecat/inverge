import test from "node:test";
import assert from "node:assert/strict";

import { buildAnswerReviewLearningSignalInput } from "../lib/review-os/learning-signal";

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
  const noisy = "이 문장은 매우 길고 상세한 원문 데이터로 보이며 문제와 답안의 내용을 거의 그대로 복사한 텍스트입니다. 따라서 저장하면 안 됩니다.";
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
