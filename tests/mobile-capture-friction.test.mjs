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
  assert.match(combined, /사진\/PDF\/텍스트 중 하나로 시작하세요\./);
  assert.match(combined, /OCR 결과는 초안/);
  assert.match(form, /텍스트 붙여넣기/);
  assert.match(form, /AI로 정리/);
  assert.match(form, /AI가 이렇게 읽었습니다\. 틀린 부분만 고쳐 주세요\./);
});

test("quick text-first path keeps optional fields optional for basic save", () => {
  const form = captureForm();
  assert.match(form, /function getMissingConfirmationFields[\s\S]*key: "subject"/);
  assert.doesNotMatch(form.match(/function getMissingConfirmationFields[\s\S]*?function inferSourceTypeFromAction/)?.[0] ?? "", /correct|user|recall|reference|title|retrieval/);
  assert.match(form, /O\/X 저장에는 정답\/내 답 한 가지만 확인해 주세요\./);
  assert.doesNotMatch(form, /if \(mode === "second" && !rewriteContext\)[\s\S]*내 답안을 먼저 작성해 주세요/);
  assert.match(form, /선택 정보/);
  assert.match(form, /소요 시간/);
  assert.match(form, /메모/);
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
  assert.match(form, /OCR 확인 필요: 숫자\/용어를 직접 확인한 뒤 O\/X 연습으로 나눌 수 있습니다\./);
  assert.match(svc, /lowConfidenceCapture/);
  assert.match(svc, /OCR 숫자\/용어 확인 필요/);
  assert.match(read("lib/review-os/today-plan-engine.ts"), /taskType = "ocr_confirmation"/);
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
