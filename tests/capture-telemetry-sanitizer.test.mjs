import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCaptureTelemetryMetadata } from "../lib/review-os/telemetry-sanitizer.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";

test("telemetry sanitizer removes forbidden keys recursively", () => {
  const result = sanitizeCaptureTelemetryMetadata({
    mode: "first",
    nested: {
      rawQuestionText: "secret",
      ok: true,
      arr: [{ raw_ocr_text: "x", subject: "민법" }],
    },
  });
  assert.equal("rawQuestionText" in result.nested, false);
  assert.equal("raw_ocr_text" in result.nested.arr[0], false);
  assert.equal(result.nested.arr[0].subject, "민법");
});

test("capture_saved metadata derives only allowed fields", () => {
  const metadata = sanitizeCaptureTelemetryMetadata({
    mode: "second",
    subject: "감정평가실무",
    sourceType: "ocr",
    confidence: "중간",
    nextTaskType: "rewrite",
    topicCandidate: "논점",
    mistakeType: "누락",
    weakStructurePoint: "문단 구조",
    missingIssue: "쟁점",
    createdFromCapture: true,
    rawQuestionText: "forbidden",
  });
  assert.equal("rawQuestionText" in metadata, false);
  assert.equal(metadata.createdFromCapture, true);
});

test("draft_field_edited keeps only field metadata semantics", () => {
  const metadata = sanitizeCaptureTelemetryMetadata({
    fieldName: "userAnswer",
    fieldChanged: true,
    value: "full answer",
    rawAnswerText: "forbidden",
  });
  assert.equal(metadata.fieldName, "userAnswer");
  assert.equal(metadata.fieldChanged, true);
  assert.equal("rawAnswerText" in metadata, false);
});

test("capture learning signal metadata excludes raw text fields", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "item-1",
    examName: "감정평가사 1차",
    subject: "민법",
    sourceType: "ocr",
    confidence: "낮음",
    createdFromCapture: true,
  });
  const json = signal.metadataJson ?? {};
  ["rawQuestionText", "rawAnswerText", "raw_ocr_text", "raw_extraction_json"].forEach((key) => {
    assert.equal(key in json, false);
  });
});
