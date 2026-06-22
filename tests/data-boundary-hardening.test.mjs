import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  RAW_USER_DATA_KEYS,
  REFERENCE_CORPUS_KEYS,
  SAFE_DERIVED_SIGNAL_KEYS,
  assertNoRawUserDataInDerived,
  sanitizeDerivedMetadata,
  sanitizeLearningSignalMetadata,
  sanitizeReferenceRequest,
} from "../lib/review-os/data-boundary.ts";
import { sanitizeCaptureTelemetryMetadata } from "../lib/review-os/telemetry-sanitizer.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";
import { buildFirstOxLearningSignalInput, evaluateFirstOxAttempt, normalizeFiveChoiceItemToStatements } from "../lib/review-os/first-ox-engine.ts";
import { buildAccountingDerivedMetadata, calculateFromAccountingParseResult } from "../lib/review-os/accounting-template-engine.ts";
import { buildSecondAnswerRewriteReferenceRequest, buildSecondAnswerRewriteSignal } from "../lib/review-os/second-answer-rewrite.ts";
import { sanitizeReferenceRequestInput } from "../lib/review-os/reference-context.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const rawTokens = ["학습자 OCR 원문", "내 답안 전문", "다시쓴 문단 전문", "원 선지 전문", "문제 원문 전문"];

function assertNoRawTokens(value) {
  const serialized = JSON.stringify(value);
  for (const token of rawTokens) assert.equal(serialized.includes(token), false, `raw token leaked: ${token}`);
}

async function collectJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(full);
    if (entry.isFile() && entry.name.endsWith(".json")) return [full];
    return [];
  }));
  return nested.flat();
}

test("data boundary key lists are explicit and exported", () => {
  assert.ok(RAW_USER_DATA_KEYS.includes("raw_ocr_text"));
  assert.ok(RAW_USER_DATA_KEYS.includes("rewriteParagraph"));
  assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes("examMode"));
  assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes("templateId"));
  assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes("completionFingerprint"));
  assert.ok(REFERENCE_CORPUS_KEYS.includes("citationLabel"));
});

test("raw OCR text is removed from derived metadata", () => {
  const metadata = sanitizeDerivedMetadata({
    examMode: "감정평가사 1차",
    subject: "회계학",
    raw_ocr_text: "학습자 OCR 원문",
    nested: { rawOcrText: "학습자 OCR 원문", pageCount: 2 },
  });
  assert.equal("raw_ocr_text" in metadata, false);
  assert.equal("rawOcrText" in metadata.nested, false);
  assert.equal(metadata.nested.pageCount, 2);
  assertNoRawTokens(metadata);
});

test("camelCase raw upload and payload keys are removed from derived metadata", () => {
  const uploadedPdf = sanitizeDerivedMetadata({ uploadedPdfText: "raw", safe: "ok" });
  assert.equal("uploadedPdfText" in uploadedPdf, false);
  assert.equal(uploadedPdf.safe, "ok");

  const uploadedImage = sanitizeDerivedMetadata({ uploadedImageText: "raw" });
  assert.equal("uploadedImageText" in uploadedImage, false);

  const rawPayload = sanitizeDerivedMetadata({ rawPayload: { rawAnswerText: "raw" } });
  assert.equal("rawPayload" in rawPayload, false);

  const metadata = sanitizeDerivedMetadata({
    subject: "감정평가실무",
    topicCandidate: "수익방식",
    mistakeType: "계산 실수",
    pageCount: 3,
    lowConfidenceFlag: true,
    supportedCalculatorTemplateId: "appraisal_income_capitalization",
    nested: {
      rawOcrPayload: { rawAnswerText: "raw" },
      uploadedImageContent: "raw",
      originalAnswerText: "raw",
      userAnswerBody: "raw",
      problemContent: "raw",
      safe: { uploadedFileContent: "raw", topicCandidate: "환원이율" },
    },
  });

  assert.equal(metadata.subject, "감정평가실무");
  assert.equal(metadata.topicCandidate, "수익방식");
  assert.equal(metadata.mistakeType, "계산 실수");
  assert.equal(metadata.pageCount, 3);
  assert.equal(metadata.lowConfidenceFlag, true);
  assert.equal(metadata.supportedCalculatorTemplateId, "appraisal_income_capitalization");
  assert.deepEqual(metadata.nested, { safe: { topicCandidate: "환원이율" } });
  assertNoRawUserDataInDerived(metadata);
});

test("user answer text is removed from learning signal metadata", () => {
  const metadata = sanitizeLearningSignalMetadata({
    examMode: "감정평가사 2차",
    subject: "감정평가실무",
    userAnswerText: "내 답안 전문",
    rawAnswerText: "내 답안 전문",
    missingIssueCandidate: "논점 누락",
  });
  assert.equal("userAnswerText" in metadata, false);
  assert.equal("rawAnswerText" in metadata, false);
  assert.equal(metadata.missingIssueCandidate, "논점 누락");
  assertNoRawUserDataInDerived(metadata);
});

test("rewriteParagraph is not logged in telemetry", () => {
  const metadata = sanitizeCaptureTelemetryMetadata({
    event: "second_stage_rewrite_completed",
    rewriteParagraph: "다시쓴 문단 전문",
    nested: { rawRewriteParagraph: "다시쓴 문단 전문", rewrite_completed: true },
  });
  assert.equal("rewriteParagraph" in metadata, false);
  assert.equal("rawRewriteParagraph" in metadata.nested, false);
  assert.equal(metadata.nested.rewrite_completed, true);
  assertNoRawTokens(metadata);
});

test("original first O/X statement text is not copied into derived metadata", () => {
  const statement = normalizeFiveChoiceItemToStatements({
    id: "ox-boundary",
    subject: "민법",
    stem: "문제 원문 전문",
    choices: ["① 원 선지 전문은 무효와 취소를 항상 같다고 본다."],
    expectedOxByChoice: ["X"],
    topicCandidate: "법률행위",
    conceptCandidate: "무효와 취소",
  })[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-31T00:00:00.000Z");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.ok(signal);
  assertNoRawTokens(signal.metadataJson);
  assert.equal(JSON.stringify(signal.metadataJson).includes(statement.statementText), false);
});

test("reference request sanitization removes raw user fields", () => {
  const sanitized = sanitizeReferenceRequestInput({
    examMode: "second",
    subject: "감정평가이론",
    topicCandidate: "수익방식",
    conceptCandidate: "논점 누락",
    taskType: "second_answer_rewrite",
    maxSnippets: 2,
    rawOcrText: "학습자 OCR 원문",
    userAnswerText: "내 답안 전문",
    problemText: "문제 원문 전문",
    rewriteParagraph: "다시쓴 문단 전문",
    derivedTags: ["second_answer_rewrite"],
  });
  assert.equal(sanitized.subject, "감정평가이론");
  assert.equal(sanitized.taskType, "second_answer_rewrite");
  assertNoRawTokens(sanitized);

  const generic = sanitizeReferenceRequest({ examMode: "first", subject: "민법", taskType: "first_ox", statementText: "원 선지 전문", safeSkeletonIds: ["sk-1"] });
  assert.equal("statementText" in generic, false);
  assert.deepEqual(generic.safeSkeletonIds, ["sk-1"]);
});

test("reference corpus files do not contain user-owned sample text fields", async () => {
  const files = await collectJsonFiles("reference_corpus");
  assert.ok(files.length > 0);
  const forbidden = /"(?:rawOcrText|raw_ocr_text|userAnswerText|rawAnswerText|statementText|rewriteParagraph|problemText|uploadedPdfText|uploadedImageText)"\s*:/;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.equal(forbidden.test(source), false, `${file} contains user-owned raw field`);
  }
});

test("accounting derived metadata excludes raw OCR and problem text", () => {
  const parseResult = {
    subject: "회계학",
    templateId: "accounting_ppe_depreciation",
    confidence: 0.91,
    extractedInputs: { cost: 1000, salvageValue: 0, usefulLifeYears: 5 },
    extractedLabels: ["취득원가"],
    needsHumanConfirmation: false,
    raw_ocr_text: "학습자 OCR 원문",
    problemText: "문제 원문 전문",
  };
  const { validation } = calculateFromAccountingParseResult(parseResult, true);
  const metadata = buildAccountingDerivedMetadata(parseResult, validation);
  assert.equal(metadata.templateId, "accounting_ppe_depreciation");
  assertNoRawTokens(metadata);
  assert.equal("raw_ocr_text" in metadata, false);
  assert.equal("problemText" in metadata, false);
});

test("second rewrite metadata excludes raw answer and OCR text", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "second-raw-boundary",
    examName: "감정평가사 2차",
    subject: "감정평가실무",
    sourceType: "ocr",
    confidence: "낮음",
    biggestGap: "단위 누락",
    missingIssue: "단위 결론 누락",
    weakStructurePoint: "결론 분리 부족",
    rewriteInstruction: "결론 단위를 다시 쓰기",
    calculationRisk: "rounding",
    unitRisk: "unit",
    supportedCalculatorTemplateId: "appraisal_unit_price",
    createdFromCapture: true,
  });
  const metadata = sanitizeLearningSignalMetadata({
    ...signal.metadataJson,
    rawAnswerText: "내 답안 전문",
    raw_ocr_text: "학습자 OCR 원문",
    rewriteParagraph: "다시쓴 문단 전문",
  });
  assertNoRawTokens(metadata);
  assert.equal(metadata.supportedCalculatorTemplateId, "appraisal_unit_price");

  const referenceRequest = buildSecondAnswerRewriteReferenceRequest({
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    missingIssue: "단위 결론 누락",
    biggestGap: "단위 누락",
    supportedCalculatorTemplateId: "appraisal_unit_price",
    rawAnswerText: "내 답안 전문",
  });
  assertNoRawTokens(referenceRequest);
});

test("telemetry sanitizer removes forbidden keys recursively", () => {
  const telemetry = sanitizeCaptureTelemetryMetadata({
    rawQuestionText: "문제 원문 전문",
    nested: {
      answerText: "내 답안 전문",
      children: [{ raw_extraction_json: { text: "학습자 OCR 원문" }, unitRisk: "단위 확인" }],
    },
  });
  assert.equal("rawQuestionText" in telemetry, false);
  assert.equal("answerText" in telemetry.nested, false);
  assert.equal("raw_extraction_json" in telemetry.nested.children[0], false);
  assert.equal(telemetry.nested.children[0].unitRisk, "단위 확인");
  assertNoRawTokens(telemetry);
});

test("existing learner loop still builds a sanitized next task", () => {
  const rewriteSignal = buildSecondAnswerRewriteSignal({
    caseSummary: "사례 요약",
    myAnswerSummary: "답안 요약",
    missingIssue: "환원이율 근거 누락",
    weakStructurePoint: "산식과 결론 분리 부족",
    supportedCalculatorTemplateId: "appraisal_income_capitalization",
  });
  assert.equal(rewriteSignal.supportedCalculatorTemplateId, "appraisal_income_capitalization");

  const tasks = buildTodayPlanTasks({
    mode: "second",
    queue: [],
    learningSignals: [{
      id: "sig-boundary",
      userId: "user-1",
      examMode: "감정평가사 2차",
      subject: "감정평가실무",
      sourceType: "problem-snap",
      derivedTags: ["second_answer_rewrite"],
      relatedFormulas: [],
      nextTaskType: "rewrite",
      nextTask: "누락 논점 1개를 다시 씁니다.",
      metadataJson: { missingIssueCandidate: "환원이율 근거 누락" },
      createdAt: new Date().toISOString(),
    }],
    items: [],
    now: new Date(),
  });
  assert.ok(Array.isArray(tasks));
});
