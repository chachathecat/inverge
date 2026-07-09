import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ANSWER_SUBMISSION_OCR_TRUST_COPY,
  buildLearnerAnswerSubmissionDerivedMetadata,
  buildLearnerAnswerSubmissionPersistenceContract,
  resolveLearnerAnswerSubmissionOcrState,
} from "../lib/review-os/answer-submission-contract.ts";
import { assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";

async function read(path) {
  return readFile(path, "utf8");
}

test("S204 contract normalizes text, image, and PDF-origin OCR confirmation states", () => {
  assert.equal(
    resolveLearnerAnswerSubmissionOcrState({ sourceType: "text" }),
    "not_required_text_input",
  );
  assert.equal(
    resolveLearnerAnswerSubmissionOcrState({ sourceType: "photo", lowConfidenceFlag: true }),
    "draft_needs_learner_confirmation",
  );
  assert.equal(
    resolveLearnerAnswerSubmissionOcrState({ sourceType: "pdf", captureQualityIssue: "pdf_manual_text_fallback" }),
    "manual_text_fallback",
  );
  assert.equal(
    resolveLearnerAnswerSubmissionOcrState({ sourceType: "image", hasManualCorrection: true }),
    "confirmed_by_learner",
  );
});

test("second-round learner submission contract is user-owned and schema-neutral", () => {
  const contract = buildLearnerAnswerSubmissionPersistenceContract({
    userId: "11111111-1111-4111-8111-111111111111",
    mode: "second",
    subject: "감정평가실무",
    sourceType: "photo",
    pageCount: 2,
    lowConfidenceFlag: true,
    captureQualityIssue: "low_confidence_ocr",
    confirmedText: "x".repeat(40),
  });

  assert.ok(contract);
  assert.equal(contract.version, "s204.learner_answer_submission.v1");
  assert.equal(contract.dataClass, "user_owned_service_data");
  assert.equal(contract.ownerBinding, "authenticated_request_user");
  assert.equal(contract.source.inputKind, "image");
  assert.equal(contract.source.uploadBytesPersisted, false);
  assert.equal(contract.ocr.state, "draft_needs_learner_confirmation");
  assert.equal(contract.ocr.editableBeforeSave, true);
  assert.equal(contract.ocr.trustCopy, ANSWER_SUBMISSION_OCR_TRUST_COPY);
  assert.equal(contract.save.target, "review_os_wrong_answer_item");
  assert.equal(contract.save.globalReferenceWrite, false);
  assert.equal(contract.save.modelTrainingUse, false);
  assert.equal(contract.save.instructorRouteSeparated, true);
  assert.equal(contract.save.resultStartsWithGapAndAction, true);
});

test("first-round capture does not receive the new S204 answer-submission contract", () => {
  const contract = buildLearnerAnswerSubmissionPersistenceContract({
    userId: "11111111-1111-4111-8111-111111111111",
    mode: "first",
    subject: "민법",
    sourceType: "text",
  });
  assert.equal(contract, null);
});

test("derived answer-submission metadata contains no raw learner fields", () => {
  const contract = buildLearnerAnswerSubmissionPersistenceContract({
    userId: "22222222-2222-4222-8222-222222222222",
    mode: "second",
    subject: "감정평가 및 보상법규",
    sourceType: "pdf",
    pageCount: 1,
    hasManualCorrection: true,
    ocrConfirmedByLearner: true,
    captureQualityIssue: "pdf_manual_text_fallback",
    confirmedText: "x".repeat(24),
  });
  const metadata = buildLearnerAnswerSubmissionDerivedMetadata(contract);

  assert.ok(metadata);
  assert.equal(metadata.inputKind, "pdf");
  assert.equal(metadata.ocrConfirmationState, "confirmed_by_learner");
  assert.equal(metadata.ocrConfirmedByLearner, true);
  assert.equal(metadata.editableBeforeSave, true);
  assert.equal(metadata.globalReferenceWrite, false);
  assert.equal(metadata.modelTrainingUse, false);
  assertNoRawUserDataInDerived(metadata);
  assert.doesNotMatch(JSON.stringify(metadata), /rawOcrText|raw_ocr_text|rawAnswerText|answerText|problemText|questionText|sourceText/i);
});

test("learner capture UI keeps OCR editable before save and uses required trust copy", async () => {
  const capturePage = await read("app/app/capture/page.tsx");
  const captureForm = await read("components/review-os/capture-form.tsx");
  const combined = `${capturePage}\n${captureForm}`;

  assert.equal(ANSWER_SUBMISSION_OCR_TRUST_COPY, "OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.");
  assert.ok(combined.includes("<TrustEvidenceBar"));
  assert.ok(combined.includes('data-trust-layer="capture-intake"'));
  assert.ok(combined.includes("OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다."));
  assert.equal(combined.includes("OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."), false);
  assert.ok(captureForm.includes("OCR 결과 확인 (편집 가능 · 자동 저장)"));
  assert.ok(captureForm.includes("value={form.rawQuestionText}"));
  assert.ok(captureForm.includes("onRawOcrChange(event.target.value)"));
  assert.ok(captureForm.includes('update("ocrConfirmedByLearner", true);'));
  assert.ok(captureForm.includes('fetch("/api/os/items"'));
});

test("durable save path binds to request user and separates instructor OCR", async () => {
  const osItemsRoute = await read("app/api/os/items/route.ts");
  const service = await read("lib/review-os/service.ts");
  const learnerCapture = await read("components/review-os/capture-form.tsx");
  const instructorOcrRoute = await read("app/api/instructor/second-grading/ocr/route.ts");

  assert.ok(osItemsRoute.includes("const userId = await requireRequestUserId(request);"));
  assert.ok(osItemsRoute.includes("reviewOsService.createWrongAnswerItem(userId, session.email, body)"));
  assert.ok(service.includes("buildLearnerAnswerSubmissionPersistenceContract"));
  assert.ok(service.includes("learner_answer_submission: answerSubmissionContract"));
  assert.ok(service.includes("learner_answer_submission: answerSubmissionDerivedMetadata"));
  assert.ok(service.includes('"answer_submission_saved"'));
  assert.equal(learnerCapture.includes("/api/instructor/second-grading/ocr"), false);
  assert.equal(learnerCapture.includes("/api/answer-review/grade-second"), false);
  assert.ok(instructorOcrRoute.includes("isAllowedAdminEmail"));
});

test("S204 data-boundary and rollback doc exists without raw examples", async () => {
  const doc = await read("docs/s204-answer-submission-ocr-save.md");

  for (const phrase of [
    "S204",
    "user-owned service data",
    "OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.",
    "No database migration",
    "Rollback",
  ]) {
    assert.ok(doc.includes(phrase), `Missing doc phrase: ${phrase}`);
  }

  assert.doesNotMatch(doc, /Raw learner answer text\s*:|OCR full text\s*:|문제 전문|답안 전문|기출문제 원문/);
});
