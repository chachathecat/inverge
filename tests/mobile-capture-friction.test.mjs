import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildLearningMetricEvent } from "../lib/review-os/learning-metrics.ts";
import { isLearningMetricsEnabled, recordLearningMetricIfEnabled } from "../lib/review-os/learning-metrics-sink.ts";

function read(file) {
  return readFileSync(file, "utf8");
}

const capturePage = () => read("app/app/capture/page.tsx");
const captureForm = () => read("components/review-os/capture-form.tsx");
const sessionPage = () => read("app/app/session/page.tsx");
const service = () => read("lib/review-os/service.ts");

const forbiddenLinkPattern = /href={[^}]*\/(?:instructor|admin|studio|checkout|payment|archive)|href=["'`][^"'`]*(?:\/instructor|\/admin|\/studio|checkout|payment|archive|native-app|mobile-app)/i;
const forbiddenClaimPattern = /공식\s*채점|공식\s*점수|합격\s*판정|불합격\s*판정|점수\s*예측|합격\s*보장|official\s+grading|official\s+score|pass\/?fail|model\s*answer/i;

// Field names may exist inside user-owned capture storage. This guard targets shared confirmation output.
const sharedOutputForbiddenPattern = /rawOcrText|raw_ocr_text|ocrText|problemText|questionText|rawQuestionText|rawAnswerText|sourceText|copyright|official|model|score|instructor/i;

test("/app/capture exposes mobile-first text-first copy", () => {
  const page = capturePage();
  const form = captureForm();
  const combined = `${page}\n${form}`;

  assert.match(combined, /오늘 한 것 올리기/);
  assert.match(combined, /사진\/PDF\/텍스트 중 하나로 시작하고, OCR\/AI 초안은 직접 확인합니다\./);
  assert.match(combined, /촬영하거나 업로드한 뒤 OCR 초안을 직접 확인합니다\./);
  assert.match(combined, /OCR\/AI 정리는 초안/);
  assert.match(form, /텍스트 붙여넣기/);
  assert.match(form, /AI로 정리/);
  assert.match(form, /AI가 이렇게 읽었습니다\. 틀린 부분만 고쳐 주세요\./);
});

test("quick text-first path keeps optional fields optional for basic save", () => {
  const form = captureForm();
  assert.match(form, /function getMissingConfirmationFields[\s\S]*key: "subject"/);
  assert.doesNotMatch(form.match(/function getMissingConfirmationFields[\s\S]*?function inferSourceTypeFromAction/)?.[0] ?? "", /correct|user|recall|reference|title|retrieval/);
  assert.match(form, /O\/X 저장에는 정답\/내 답 한 가지만 확인해 주세요\./);
  assert.match(form, /선택 정보/);
  assert.match(form, /소요 시간/);
  assert.match(form, /메모/);
});

test("second-mode normal capture routes preview through retrieval before final save", () => {
  const form = captureForm();
  assert.match(form, /onClick=\{\(\) =>\s*setStage\(\s*mode === "second" \? "second-issue-recall" : "confirm",?\s*\)\s*\}/);
  assert.match(form, /쟁점 회상부터 진행/);
  assert.match(form, /function hasSecondModeLearnerProducedResponse/);
  assert.match(form, /function hasSecondModeReferenceStep/);
  assert.match(form, /2차 저장 전에는 쟁점·목차·답안 중 하나를 직접 적어 주세요/);
  assert.match(form, /강의\/교재 정리 비교 또는 확인 보류를 선택한 뒤 저장해 주세요/);
  assert.match(form, /마지막 확인으로 이동/);
  assert.match(form, /강의\/교재 정리는 나중에 확인/);
  assert.doesNotMatch(form, /기준\s*답안|기준답안|모범답안|공식답안|공식\s*모범답안|공식\s*기준답안|합격\s*판정|점수\s*예측/);
});

test("second-mode retrieval-before-explanation guard remains documented in the flow copy", () => {
  const form = captureForm();
  assert.match(form, /강의\/교재 정리 보기 전, 쟁점 1개만 적으세요/);
  assert.match(form, /강의\/교재 정리를 보기 전에 이 체크포인트 중 3개를 떠올립니다/);
  assert.match(form, /비교는 작성 이후에 합니다/);
  assert.match(form, /작성한 뒤에만 강의\/교재 정리를 봅니다/);
});

test("after-save acknowledgement names Today Plan, Review Queue, note location, and safe CTAs", () => {
  const session = sessionPage();
  assert.match(session, /오늘 계획에 반영했습니다\./);
  assert.match(session, /Today Plan candidate/);
  assert.match(session, /Review Queue candidate/);
  assert.match(session, /Note\/details/);
  assert.match(session, /가장 큰 간극/);
  assert.match(session, /다음 행동/);
  assert.match(session, /오늘 계획으로 이동/);
  assert.match(session, /하나 더 올리기/);
  assert.match(session, /노트 보기/);
  assert.doesNotMatch(session, forbiddenClaimPattern);
});

test("no instructor/admin/payment/archive/native-app links are introduced in capture surfaces", () => {
  const combined = `${capturePage()}\n${captureForm()}\n${sessionPage()}`;
  assert.doesNotMatch(combined, forbiddenLinkPattern);
});

test("low-confidence OCR remains an ocr_confirmation candidate before practice", () => {
  const form = captureForm();
  const svc = service();
  assert.match(form, /lowConfidenceFlag/);
  assert.match(form, /ocrConfirmedByLearner/);
  assert.match(form, /form\.lowConfidenceFlag && !form\.ocrConfirmedByLearner/);
  assert.match(form, /OCR 확인 필요: 숫자\/용어를 직접 확인하거나 수정한 뒤 O\/X 연습으로 나눌 수 있습니다\./);
  assert.match(form, /lowConfidenceFlag && !form\.ocrConfirmedByLearner\s*\? null\s*: getCalculatorWorkflowForSubject/);
  assert.match(svc, /rawLowConfidenceCapture/);
  assert.match(svc, /lowConfidenceCapture = rawLowConfidenceCapture && confirmedFields\?\.ocrConfirmedByLearner !== true/);
  assert.match(svc, /OCR 숫자\/용어 확인 필요/);
  const todayPlanEngine = read("lib/review-os/today-plan-engine.ts");
  assert.match(todayPlanEngine, /taskType = "ocr_confirmation"/);
  assert.match(todayPlanEngine, /getRecordPayloadValue\(item, "ocrConfirmedByLearner"\) !== true/);
});

test("learning metrics remain metadata-only and disabled by default", () => {
  const previous = process.env.LEARNING_METRICS_ENABLED;
  delete process.env.LEARNING_METRICS_ENABLED;

  const svc = service();
  for (const eventName of ["capture_started", "capture_saved", "adaptive_today_plan_generated"]) {
    assert.match(svc, new RegExp(`eventName: "${eventName}"`));
  }

  const event = buildLearningMetricEvent({
    eventName: "capture_saved",
    examMode: "first",
    subject: "민법",
    properties: { status: "saved", rawOcrText: "문제 원문", score: 100 },
  });
  assert.equal(event.metadataOnly, true);
  assert.deepEqual(event.properties, { status: "saved" });
  assert.equal(isLearningMetricsEnabled(), false);
  assert.equal(recordLearningMetricIfEnabled(event).recorded, false);

  if (previous === undefined) delete process.env.LEARNING_METRICS_ENABLED;
  else process.env.LEARNING_METRICS_ENABLED = previous;
});

test("shared after-save output does not leak raw fields or forbidden claims", () => {
  const session = sessionPage();
  const outputSlice = session.match(/savedCapture \? \([\s\S]*?\) : null/)?.[0] ?? session;
  assert.doesNotMatch(outputSlice, sharedOutputForbiddenPattern);
  assert.doesNotMatch(outputSlice, forbiddenClaimPattern);
});
