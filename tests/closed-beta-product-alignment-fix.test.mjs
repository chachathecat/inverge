import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appPagePath = "app/app/page.tsx";
const capturePagePath = "app/app/capture/page.tsx";
const captureFormPath = "components/review-os/capture-form.tsx";
const todaySubjectSelectorPath = "components/review-os/today-first-subject-selector.tsx";
const appraisalPath = "lib/review-os/appraisal.ts";
const typesPath = "lib/review-os/types.ts";
const todayPlanEnginePath = "lib/review-os/today-plan-engine.ts";

const firstSubjects = ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"];
const secondSubjects = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"];
const forbiddenLearnerCopy =
  /기준\s*답안|기준답안|공식\s*채점(?!\s*아님)|모범답안|공식답안|점수예측|합격예측|합격\s*가능성\s*확정|official\s+grading|official\s+model\s+answer|pass\/fail\s+prediction/i;

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludesAll(source, values, label) {
  for (const value of values) {
    assert.ok(source.includes(value), `${label} should include ${value}`);
  }
}

test("Today surfaces expose all 1차 and 2차 subjects through a visible selector", () => {
  const appPage = read(appPagePath);
  const selector = read(todaySubjectSelectorPath);
  const types = read(typesPath);

  assert.match(appPage, /<TodaySubjectSelector/);
  assert.match(appPage, /mode=\{mode\}/);
  assert.match(selector, /data-today-subject-selector=\{mode\}/);
  assert.match(selector, /role="group"/);
  assert.match(selector, /config\.subjects\.map/);
  assert.match(selector, /setSubject\(option\)/);
  assertIncludesAll(types, firstSubjects, "1차 subject registry");
  assertIncludesAll(types, secondSubjects, "2차 subject registry");
});

test("Capture first frame exposes subject selection above input for both modes", () => {
  const form = read(captureFormPath);
  const intake = form.match(/function IntakePanel[\s\S]*?function ConfirmPanel/)?.[0] ?? "";

  assert.match(intake, /data-capture-subject-selector=\{mode\}/);
  assert.match(form, /role="group"/);
  assert.match(form, /subjects\.map/);
  assertIncludesAll(read(typesPath), firstSubjects, "1차 capture subjects");
  assertIncludesAll(read(typesPath), secondSubjects, "2차 capture subjects");

  const subjectIndex = intake.indexOf("data-capture-subject-selector");
  const inputOptionsIndex = intake.indexOf("data-capture-input-options");
  const textAreaIndex = intake.indexOf("<Textarea");
  assert.ok(subjectIndex >= 0, "subject selector should exist in intake");
  assert.ok(inputOptionsIndex > subjectIndex, "input options should come after subject selector");
  assert.ok(textAreaIndex > inputOptionsIndex, "main textarea should come after first-frame options");
});

test("Capture first frame keeps photo, PDF, and text as visible input options", () => {
  const form = read(captureFormPath);
  const intake = form.match(/function IntakePanel[\s\S]*?function ConfirmPanel/)?.[0] ?? "";

  for (const phrase of ["사진 찍기", "PDF 선택", "텍스트 붙여넣기"]) {
    assert.match(intake, new RegExp(phrase));
  }
  assert.match(intake, /현재 PDF는 내용 확인 후 직접 붙여넣을 수 있습니다\./);
  assert.match(form, /OCR과 AI 정리는 학습 보조 초안입니다\. 저장 전 직접 수정할 수 있습니다\./);
  assert.match(intake, /CAPTURE_TRUST_LAYER_COPY/);
});

test("Mode copy is neutral and does not hard-code one subject as the only start", () => {
  const appraisal = read(appraisalPath);
  const selector = read(todaySubjectSelectorPath);
  const capturePage = read(capturePagePath);
  const captureForm = read(captureFormPath);

  assert.match(appraisal, /1차 오답 1개로 시작하세요/);
  assert.match(selector, /오늘 본 과목을 선택하고 오답 1개를 기록하세요\./);
  assert.match(selector, /과목을 고르면 오늘 할 일과 복습 큐에 반영됩니다\./);
  assert.match(appraisal, /2차 답안 한 건으로 시작하세요/);
  assert.match(selector, /오늘 본 과목을 선택하고 답안\/강의 정리\/필기 중 하나를 올리세요\./);
  assert.match(selector, /과목을 고르면 보강할 논점과 다음 복습에 반영됩니다\./);
  assert.doesNotMatch(capturePage, /사진\/PDF\/텍스트 중 하나로 시작하고/);
  assert.match(captureForm, /사진, PDF, 텍스트 중 하나로 시작하세요\./);

  assert.doesNotMatch(appraisal, /민법 오답 1개로 시작하세요|민법 오답 1개를 기록/);
  assert.doesNotMatch(appraisal, /감정평가실무.*으로 시작하세요/);
});

test("Mode config learner copy avoids English rewrite and compare wording", () => {
  const appraisal = read(appraisalPath);
  const secondConfig = appraisal.match(/second:\s*\{[\s\S]*?nextActionFallback:[\s\S]*?\n  \},/)?.[0] ?? "";

  assert.match(secondConfig, /recentTitle:\s*"최근 교정 \/ 다시쓰기 흐름"/);
  assert.match(secondConfig, /recentDescription:\s*"비교에서 잡힌 누락 논점과 다음 다시쓰기 행동입니다\."/);
  assert.match(secondConfig, /priorityCopy:\s*"오늘 보강할 누락 논점과 다시쓰기 행동 하나만 남깁니다\."/);
  assert.doesNotMatch(secondConfig, /recentTitle:\s*"[^"]*rewrite/i);
  assert.doesNotMatch(secondConfig, /recentDescription:\s*"[^"]*(?:compare|rewrite)/i);
  assert.doesNotMatch(secondConfig, /priorityCopy:\s*"[^"]*rewrite/i);
});

test("Today detail hints use learner-facing structure wording", () => {
  const appPage = read(appPagePath);

  assert.match(appPage, /학습 구조:\s*\{hint\.skeletonId\}/);
  assert.doesNotMatch(appPage, /skeleton:\s*\{hint\.skeletonId\}/);
});

test("Today subject fallback uses selected subject instead of first subject default", () => {
  const appPage = read(appPagePath);

  assert.match(appPage, /selectedQueueItem\?\.subjectLabel \?\? selectedSubject/);
  assert.doesNotMatch(appPage, /selectedQueueItem\?\.subjectLabel \?\? config\.subjects\[0\]/);
  assert.doesNotMatch(appPage, /config\.subjects\[0\]/);
});

test("Selected subject is preserved across learner loop links where applicable", () => {
  const appPage = read(appPagePath);
  const form = read(captureFormPath);

  assert.match(appPage, /firstSetHref = `\/app\/sets\?mode=first&subject=/);
  assert.match(appPage, /firstCaptureHref = `\/app\/capture\?mode=first&subject=/);
  assert.match(appPage, /firstStudyLogHref = `\/app\/study-log\?mode=first&subject=/);
  assert.match(appPage, /secondCaptureHref = `\/app\/capture\?mode=second&subject=/);
  assert.match(appPage, /secondReviewHref = `\/app\/review\?mode=second&subject=/);
  assert.match(form, /href=\{`\/app\/review\?mode=\$\{mode\}&subject=\$\{encodedSubject\}`\}/);
  assert.match(form, /href=\{`\/app\/notes\?mode=\$\{mode\}&subject=\$\{encodedSubject\}`\}/);
  assert.match(form, /href=\{`\/app\?mode=\$\{mode\}&subject=\$\{encodedSubject\}`\}/);
});

test("Forbidden learner-facing answer or grading claims remain absent in touched learner surfaces", () => {
  const combined = [
    read(appPagePath),
    read(capturePagePath),
    read(captureFormPath),
    read(todaySubjectSelectorPath),
    read(appraisalPath),
  ].join("\n");

  assert.doesNotMatch(combined, forbiddenLearnerCopy);
  assert.doesNotMatch(combined, /\/instructor|second-grading|grade-second/i);
});

test("Today Plan max 3 protection remains intact", () => {
  const appPage = read(appPagePath);
  const engine = read(todayPlanEnginePath);

  assert.match(engine, /export const TODAY_PLAN_MAX_PRIMARY_TASKS = 3/);
  assert.match(appPage, /selectActiveTodayPlanTasks\(/);
  assert.match(appPage, /data-visible-primary-task-cap=\{TODAY_PLAN_MAX_PRIMARY_TASKS\}/);
});
