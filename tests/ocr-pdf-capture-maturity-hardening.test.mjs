import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  validateCaptureToNoteQualityContract,
} from "../lib/review-os/capture-note-quality.ts";

const docPath = "docs/ocr-pdf-capture-maturity-hardening.md";
const testPath = "tests/ocr-pdf-capture-maturity-hardening.test.mjs";
const fixturePaths = [
  "tests/fixtures/learner-loop/ocr-pdf-capture-maturity/first-ox-image.json",
  "tests/fixtures/learner-loop/ocr-pdf-capture-maturity/first-accounting-pdf.json",
  "tests/fixtures/learner-loop/ocr-pdf-capture-maturity/second-practice-image.json",
  "tests/fixtures/learner-loop/ocr-pdf-capture-maturity/second-theory-pdf.json",
  "tests/fixtures/learner-loop/ocr-pdf-capture-maturity/second-law-text.json",
];

const forbiddenFields = [
  "score",
  "passFail",
  "officialGrade",
  "officialAnswer",
  "modelAnswer",
  "instructorComment",
  "rawOfficialPath",
  "qnetRawPath",
  "localOfficialMaterialsPath",
  "ocrFullText",
  "officialAnswerBody",
  "copiedProblemText",
  "copiedAnswerText",
];

const forbiddenUnsafePatterns = [
  /local_official_materials[\\/]/i,
  /qnet_manifest\.json(?:["'`]\)|[\\/])/i,
  /raw official problem text\s*:/i,
  /raw official answer text\s*:/i,
  /official answer body\s*:/i,
  /OCR full text\s*:/i,
  /[A-Za-z]:\\.*\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp)\b/i,
  /(?:^|[\\/])[^\\/]+\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp)\b/i,
];

function read(file) {
  return readFileSync(file, "utf8");
}

function readFixture(file) {
  return JSON.parse(read(file));
}

function assertSingleLine(label, value, fixtureId) {
  assert.equal(typeof value, "string", `${fixtureId} should include ${label}`);
  assert.ok(value.trim().length > 0, `${fixtureId} ${label} should not be empty`);
  assert.equal(value.includes("\n"), false, `${fixtureId} should include exactly one ${label}`);
}

test("OCR/PDF capture maturity checklist doc exists and records safety contract", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "OCR/PDF Capture Maturity Hardening v1",
    "OCR/PDF/text capture -> editable draft -> learner-owned note",
    "OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.",
    "editable before save",
    "learner-owned note",
    "one `biggestGap`",
    "one `nextAction`",
    "Today Plan max 3",
    "Review Queue linkage semantics",
    "safe synthetic",
    "metadataOnly: true",
    "learnerOwned: true",
    "closed_beta_ocr_pdf_capture_maturity",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
    "npm.cmd run typecheck",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should mention ${phrase}`));
});

test("OCR/PDF maturity fixtures are metadata-only learner-owned synthetic drafts", () => {
  const fixtures = fixturePaths.map(readFixture);
  assert.equal(fixtures.length, 5);
  assert.deepEqual(new Set(fixtures.map((fixture) => fixture.fixtureId)).size, fixtures.length);

  const sourceTypes = new Set(fixtures.map((fixture) => fixture.sourceType));
  assert.equal(sourceTypes.has("image"), true);
  assert.equal(sourceTypes.has("pdf"), true);
  assert.equal(sourceTypes.has("text"), true);

  for (const fixture of fixtures) {
    assert.equal(fixture.ocrDraftStatus, "draft", `${fixture.fixtureId} should keep OCR/PDF output as draft`);
    assert.equal(fixture.editableBeforeSave, true, `${fixture.fixtureId} should be editable before save`);
    assert.equal(fixture.learnerOwned, true, `${fixture.fixtureId} should be learner-owned`);
    assert.equal(fixture.metadataOnly, true, `${fixture.fixtureId} should be metadata-only`);
    assert.equal(fixture.forbiddenFieldsAbsent, true, `${fixture.fixtureId} should declare forbidden fields absent`);
    assert.equal(fixture.safeUse, "closed_beta_ocr_pdf_capture_maturity");
    assert.equal(["first", "second"].includes(fixture.examMode), true);
    assert.equal(["image", "pdf", "text"].includes(fixture.sourceType), true);
    assert.ok(CAPTURE_NOTE_ALLOWED_TASK_TYPES.includes(fixture.expectedTaskType), `${fixture.fixtureId} task type should be allowed`);
    assertSingleLine("biggestGap", fixture.biggestGap, fixture.fixtureId);
    assertSingleLine("nextAction", fixture.nextAction, fixture.fixtureId);
  }
});

test("OCR/PDF maturity fixtures create safe capture-to-note candidates", () => {
  for (const fixture of fixturePaths.map(readFixture)) {
    const validated = validateCaptureToNoteQualityContract({
      examMode: fixture.examMode,
      subject: fixture.subject,
      learnerNoteText: fixture.syntheticInputSummary,
      biggestGap: fixture.biggestGap,
      nextAction: fixture.nextAction,
      nextActionTaskType: fixture.expectedTaskType,
      learnerOwned: fixture.learnerOwned,
      metadataOnly: fixture.metadataOnly,
    });

    assert.equal(validated.learnerOwned, true);
    assert.equal(validated.metadataOnly, true);
    assert.equal(validated.safeUse, "closed_beta_capture_note_quality");
    assert.equal(validated.biggestGap, fixture.biggestGap);
    assert.equal(validated.nextAction, fixture.nextAction);
    assert.equal(validated.nextActionTaskType, fixture.expectedTaskType);
  }
});

test("OCR/PDF capture route keeps draft and editable-before-save framing", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const combined = `${capturePage}\n${captureForm}`;

  assert.equal(combined.includes("OCR/AI 정리는 초안입니다. 저장 전 직접 확인해 주세요."), true);
  assert.equal(combined.includes("사진/PDF 인식이 불안정하면 텍스트로 붙여넣어도 됩니다."), true);
  assert.equal(captureForm.includes("OCR 결과 확인 (편집 가능 · 자동 저장)"), true);
  assert.equal(captureForm.includes("현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요."), true);
  assert.equal(captureForm.includes("value={form.rawQuestionText}"), true);
  assert.equal(captureForm.includes('update("rawQuestionText", value)'), true);
  assert.equal(captureForm.includes("inferSourceTypeFromAction(\"pdf\")"), true);
  assert.equal(captureForm.includes("inferSourceTypeFromAction(\"camera\")"), true);
  assert.equal(captureForm.includes("pdfInputRef"), true);
  assert.equal(captureForm.includes('accept="application/pdf"'), true);
});

test("OCR/PDF maturity docs and fixtures avoid official/raw material dependencies", () => {
  const docsAndFixtures = [
    docPath,
    ...fixturePaths,
  ].map((file) => `${file}\n${read(file)}`).join("\n");

  for (const field of forbiddenFields) {
    for (const fixture of fixturePaths.map(readFixture)) {
      assert.equal(Object.hasOwn(fixture, field), false, `${fixture.fixtureId} should not include ${field}`);
    }
  }

  for (const pattern of forbiddenUnsafePatterns) {
    assert.doesNotMatch(docsAndFixtures, pattern, `docs/fixtures should avoid ${pattern}`);
  }

  assert.doesNotMatch(docsAndFixtures, /official grading (?:is|result|available|feature|product)/i);
  assert.doesNotMatch(docsAndFixtures, /model answer (?:is|result|available|feature|product)/i);
  assert.doesNotMatch(docsAndFixtures, /score prediction (?:is|result|available|feature|product)/i);
  assert.doesNotMatch(docsAndFixtures, /pass\/fail (?:is|result|available|feature|product)/i);
  assert.doesNotMatch(docsAndFixtures, /public archive (?:is|available|access|feature|promise|product)/i);
});

test("OCR/PDF maturity test is hooked into the node test runner without local official reads", () => {
  const runner = read("scripts/run-node-tests.mjs");
  const source = read(testPath);

  assert.equal(runner.includes("tests/ocr-pdf-capture-maturity-hardening.test.mjs"), true);
  assert.doesNotMatch(source, /\b(?:readdir|opendir|glob)\s*\(/i, "test must not enumerate local raw materials");
  assert.doesNotMatch(source, /readFileSync\(["'`]local_official_materials/i, "test must not read local official materials");
  assert.doesNotMatch(source, /qnet_manifest\.json["'`]\)/i, "test must not read manifest files");
});
