import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { saveReviewOsLocalBetaNote } from "../lib/review-os/browser-storage.ts";
import { resolveCaptureConfirmationCopy } from "../lib/review-os/capture-confirmation-copy.ts";
import { sanitizeLocalLearnerAnalyticsEvent } from "../lib/review-os/local-analytics.ts";

function read(file) {
  return readFileSync(file, "utf8");
}

function assertExists(file) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const forbiddenLearnerRoutePattern = /\/(?:instructor|studio)(?:\/|["'`?])/i;

test("closed beta top nav routes to canonical Today, Capture, Review, and Notes tabs with mode preserved", () => {
  const learnerShell = read("components/learner/learner-ui.tsx");

  assert.equal(learnerShell.includes('href: "/app"'), true, "Today tab should target /app");
  assert.equal(learnerShell.includes('href: "/app/capture"'), true, "Input tab should target /app/capture");
  assert.equal(learnerShell.includes('href: "/app/review"'), true, "Review tab should target /app/review");
  assert.equal(learnerShell.includes('href: "/app/notes"'), true, "Notes tab should target /app/notes");
  assert.equal(learnerShell.includes('second: "/app/write"'), false, "Input tab should not route second mode to /app/write");
  assert.equal(learnerShell.includes('`${href}?mode=${currentMode}`'), true, "tab links should preserve the active exam mode");
  assert.equal(learnerShell.includes('activeHrefs: ["/app/capture", "/app/input", "/app/entry", "/app/write"]'), true);
  assert.equal(learnerShell.includes('activeHrefs: ["/app/notes", "/app/items"]'), true);
  assert.equal(forbiddenLearnerRoutePattern.test(learnerShell), false, "learner nav must not expose instructor/studio routes");
});

test("/app/input and /app/entry resolve to capture instead of not-found and keep mode", () => {
  for (const file of ["app/app/input/page.tsx", "app/app/entry/page.tsx"]) {
    assertExists(file);
    const source = read(file);
    assert.equal(source.includes("redirect(`/app/capture"), true, `${file} should redirect to capture`);
    assert.equal(source.includes('params.set("mode", mode)'), true, `${file} should preserve mode`);
    assert.equal(source.includes('params.set("subject", query.subject)'), true, `${file} should preserve subject when present`);
  }
});


test("/exams CTAs use absolute learner app routes and second track starts at capture", () => {
  const examsPage = read("app/exams/page.tsx");

  assert.equal(examsPage.includes('const appHref = `/app?mode=${mode}`'), true, "authenticated track entry should use an absolute /app route");
  assert.equal(examsPage.includes('return mode === "first" ? "/app/capture?mode=first" : "/app/capture?mode=second";'), true, "empty second-track entry should route to capture, not write");
  assert.equal(examsPage.includes('"/app/write?mode=second"'), false, "public second-track CTA should not send learners to the specialized write route");
  assert.equal(/href:\s*[`'"]app\//.test(examsPage), false, "CTA hrefs should not be relative app/* paths");
});

test("learner route sources never construct duplicated /app/app paths", () => {
  const files = [
    "app/exams/page.tsx",
    "components/learner/learner-ui.tsx",
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/input/page.tsx",
    "app/app/entry/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes("/app/app"), false, `${file} must not contain a duplicated /app/app route`);
    assert.equal(/(?:href|router\.push|redirect)\s*=*\(?[`'"]app\//.test(source), false, `${file} must use root-absolute /app links`);
  }
});

test("/app/capture provides editable text-first capture and existing safe save path", () => {
  assertExists("app/app/capture/page.tsx");
  const capturePage = read("app/app/capture/page.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const combined = `${capturePage}\n${captureForm}`;

  assert.equal(combined.includes("오늘 한 것 올리기"), true);
  assert.equal(combined.includes("ClosedBetaBanner"), true);
  assert.equal(combined.includes("OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."), true);
  assert.equal(combined.includes('sourceType: "text"'), true, "text should be the default capture source");
  assert.equal(combined.includes("inferSourceTypeFromAction(\"pdf\")"), true, "PDF source selection should exist");
  assert.equal(combined.includes("inferSourceTypeFromAction(\"camera\")"), true, "photo source selection should exist");
  assert.equal(captureForm.includes("value={form.rawQuestionText}"), true, "textarea should be controlled by editable learner draft text");
  assert.equal(captureForm.includes('update("rawQuestionText", value)'), true, "textarea edits should update the draft");
  assert.equal(captureForm.includes('fetch("/api/os/items"'), true, "save should use the existing user-owned note persistence endpoint");
  assert.equal(captureForm.includes("createdFromCapture: true"), true, "save should create capture-derived learning signal metadata");
  assert.equal(captureForm.includes('data-testid="capture-save-primary"'), true, "visible primary save CTA should be present in the capture form");
  assert.equal(captureForm.includes('data-testid="capture-save-action-bar"'), true, "save CTA should live in the same visible section as learner input");
  assert.equal(captureForm.includes("저장하고 오늘 계획에 반영"), true, "save CTA copy should match closed-beta QA expectation");
  assert.equal(captureForm.includes("disabled={!canQuickSave || saving || extracting}"), true, "save CTA should render before input and stay disabled until content exists");
  assert.equal(captureForm.includes("getLearnerCaptureContent"), true, "save readiness should account for learner text beyond raw OCR text");
  assert.equal(captureForm.includes("source.userAnswer"), true, "save CTA should enable from userAnswer/study note text");
  assert.equal(captureForm.includes("uploadedPages.length > 0"), true, "save CTA should enable from uploaded pages");
  assert.equal(captureForm.includes("saveQuickCaptureFromIntake"), true, "text-first intake should have a direct save path");
  assert.equal(captureForm.includes("saveReviewOsLocalBetaNote"), true, "save should fall back to the safe local beta note path when durable persistence is unavailable");
  assert.equal(captureForm.includes('data-testid="capture-note-summary"'), true, "save confirmation summary should exist");
  assert.equal(captureForm.includes("buildCaptureNoteSummary"), true, "summary should include derived capture-note signals");
});

test("capture save CTA is not hidden inside collapsed details-only path", () => {
  const captureForm = read("components/review-os/capture-form.tsx");
  const ctaIndex = captureForm.indexOf('data-testid="capture-save-primary"');
  assert.notEqual(ctaIndex, -1, "save CTA should exist");
  const actionBarIndex = captureForm.lastIndexOf('data-testid="capture-save-action-bar"', ctaIndex);
  const detailsIndex = captureForm.lastIndexOf("<details", ctaIndex);
  assert.notEqual(actionBarIndex, -1, "save CTA should be inside the visible action bar");
  assert.ok(actionBarIndex > detailsIndex, "nearest visible action wrapper should come after any preceding collapsed details block");
});

test("capture save confirmation includes biggest gap, next action, and Review/Notes/Today links", () => {
  const captureForm = read("components/review-os/capture-form.tsx");
  const browserStorage = read("lib/review-os/browser-storage.ts");

  assert.equal(captureForm.includes('data-testid="capture-save-confirmation"'), true, "save confirmation panel should render in capture");
  assert.equal(captureForm.includes("저장되었습니다"), true, "confirmation should say the save completed");
  assert.equal(captureForm.includes("가장 큰 약점 1개"), true, "confirmation should identify one biggest gap candidate");
  assert.equal(captureForm.includes("다음 행동 1개"), true, "confirmation should identify one next action candidate");
  assert.equal(captureForm.includes("AI가 찾은 약점 후보입니다. 저장 전 직접 확인해 주세요."), true, "confirmation should use beta-safe candidate copy");
  assert.equal(captureForm.includes("다음 행동 후보입니다."), true, "confirmation should frame next action as a candidate");
  assert.equal(captureForm.includes('href={`/app/review?mode=${mode}`}'), true, "confirmation should link to Review with mode");
  assert.equal(captureForm.includes('href={`/app/notes?mode=${mode}`}'), true, "confirmation should link to Notes with mode");
  assert.equal(captureForm.includes('href={`/app?mode=${mode}`}'), true, "confirmation should link back to Today with mode");
  assert.equal(browserStorage.includes('safeUse: "closed_beta_local_note"'), true, "local note fallback should be explicitly closed-beta safe");
});

test("second law local beta confirmation preserves disposition context instead of calculation fallback", () => {
  const safeText =
    "오늘 감정평가 및 보상법규 사업인정 처분성 부분을 복습했다. 처분성 판단 기준이 헷갈렸다. 다음에는 처분성 판단 기준을 한 문단으로 다시 써보고 싶다.";

  const copy = resolveCaptureConfirmationCopy({
    mode: "second",
    subjectLabel: "감정평가 및 보상법규",
    rawQuestionText: safeText,
    userAnswer: safeText,
    biggestGap: "계산 근거 누락",
    missingIssue: "계산 근거 누락",
    rewriteInstruction: "산식과 계산 근거를 먼저 쓰고 결론 문장까지 다시 연결하기",
  });

  assert.doesNotMatch(copy.biggestGap, /계산|산식|단위|검산/);
  assert.doesNotMatch(copy.nextAction, /계산|산식|단위|검산/);
  assert.match(copy.biggestGap, /사업인정|처분성|판단 기준/);
  assert.match(copy.nextAction, /사업인정|처분성|문단|판단 기준/);
});

test("second theory fallback is keyword or outline oriented, while practice can keep calculation copy", () => {
  const theory = resolveCaptureConfirmationCopy({
    mode: "second",
    subjectLabel: "감정평가이론",
    rawQuestionText: "이론 키워드와 목차 연결이 약해서 문단 전개가 흔들렸다.",
    biggestGap: "계산 근거 누락",
    rewriteInstruction: "산식과 계산 근거를 먼저 쓰기",
  });

  assert.doesNotMatch(theory.biggestGap, /계산|산식|단위|검산/);
  assert.match(`${theory.biggestGap} ${theory.nextAction}`, /키워드|논거|목차|문단/);

  const practice = resolveCaptureConfirmationCopy({
    mode: "second",
    subjectLabel: "감정평가실무",
    rawQuestionText: "수익환원법 계산 산식과 단위가 헷갈렸다.",
    biggestGap: "계산 근거 누락",
  });

  assert.match(`${practice.biggestGap} ${practice.nextAction}`, /계산|산식|단위|검산/);
});

test("local beta note fallback remains metadata-only and client reflection stays hydration-safe", () => {
  const copy = resolveCaptureConfirmationCopy({
    mode: "second",
    subjectLabel: "감정평가 및 보상법규",
    rawQuestionText: "사업인정 처분성 판단 기준을 다시 확인했다.",
  });
  const note = saveReviewOsLocalBetaNote({
    mode: "second",
    subjectLabel: "감정평가 및 보상법규",
    sourceType: "text",
    problemTitle: "사업인정 처분성 학습 메모",
    biggestGap: copy.biggestGap,
    nextAction: copy.nextAction,
  });
  const reflection = read("components/review-os/local-beta-note-reflection.tsx");

  assert.equal(note.metadataOnly, true);
  assert.equal(note.safeUse, "closed_beta_local_note");
  assert.equal(reflection.startsWith('"use client";'), true, "local beta reflection must remain client-only");
  assert.equal(reflection.includes("useEffect"), true, "localStorage reads should stay inside client effects");
  assert.equal(reflection.includes("window.setTimeout"), true, "client state should settle after hydration");
});

test("capture save local analytics emits only safe derived fields", () => {
  const captureForm = read("components/review-os/capture-form.tsx");
  const localAnalytics = read("lib/review-os/local-analytics.ts");
  const eventIndex = captureForm.indexOf('event: "capture_saved"');
  assert.notEqual(eventIndex, -1, "capture save event should exist");
  const eventBlock = captureForm.slice(eventIndex, captureForm.indexOf("});", eventIndex));

  assert.equal(localAnalytics.includes("window.dataLayer"), true, "local analytics should expose window.dataLayer when available");
  assert.equal(localAnalytics.includes("window.invergeDataLayer"), true, "local analytics should expose an Inverge-owned local buffer");

  for (const forbidden of ["rawQuestionText", "rawOcrText", "rawAnswerText", "userAnswer", "correctAnswer", "email"]) {
    assert.equal(eventBlock.includes(forbidden), false, `capture analytics event must not include ${forbidden}`);
  }

  const sanitized = sanitizeLocalLearnerAnalyticsEvent({
    event: "capture_saved",
    surface: "capture",
    route: "/app/capture",
    mode: "second",
    action: "save",
    subject: "감정평가이론",
    sourceType: "text",
    status: "saved",
    createdFromCapture: true,
    nextTaskType: "rewrite",
    email: "learner@example.com",
    rawQuestionText: "do-not-copy",
    rawAnswerText: "do-not-copy",
    userAnswer: "do-not-copy",
  });

  assert.deepEqual(Object.keys(sanitized).filter((key) => /email|raw|answer|question|ocr/i.test(key)), []);
  assert.equal(sanitized.metadataOnly, true);
  assert.equal(sanitized.safeUse, "closed_beta_local_analytics");
  assert.equal(sanitized.mode, "second");
  assert.equal(sanitized.sourceType, "text");
});

test("Notes tab has a real learner route and review action does not point to a missing page", () => {
  assertExists("app/app/notes/page.tsx");
  assertExists("app/app/items/[itemId]/page.tsx");

  const notesPage = read("app/app/notes/page.tsx");
  const itemsPage = read("app/app/items/page.tsx");
  const reviewQueue = read("components/review-os/review-queue-client.tsx");
  const sessionPage = read("app/app/session/page.tsx");

  assert.equal(notesPage.includes("renderReviewOsItemsPage"), true, "notes should render the learner-owned notes list");
  assert.equal(itemsPage.includes('routePath = "/app/items"'), true, "existing items route should remain valid");
  assert.equal(reviewQueue.includes("router.push(`/app/items/${item.itemId}?mode=${mode}`)"), true, "review action should target existing item detail route");
  assert.equal(sessionPage.includes("/app/review?mode=${mode}"), true, "post-save confirmation should link to review queue");
  assert.equal(sessionPage.includes("/app/notes?mode=${mode}"), true, "post-save note link should use /app/notes");
});

test("Today and empty states use capture for generic input while preserving specialized write tasks", () => {
  const todayPage = read("app/app/page.tsx");
  const reviewPage = read("app/app/review/page.tsx");
  const itemsPage = read("app/app/items/page.tsx");
  const weeklyPage = read("app/app/weekly/page.tsx");

  assert.equal(todayPage.includes('const modeCaptureHref = mode === "second" ? "/app/capture?mode=second" : firstCaptureHref'), true);
  assert.equal(todayPage.includes('option.hrefKey === "capture"'), true, "second-mode input option should use capture");
  assert.equal(todayPage.includes('"/app/notes?mode=second"'), true, "second-mode notes list should be routed through /app/notes");
  assert.equal(todayPage.includes('if (hrefKind === "write") return "/app/write?mode=second";'), true, "specialized write tasks should remain available");
  assert.equal(reviewPage.includes('<Link href={`/app/capture?mode=${mode}`}>'), true, "empty review state should not send learners to a missing input route");
  assert.equal(itemsPage.includes('<Link href={`/app/capture?mode=${mode}`'), true, "empty notes state should send learners to capture");
  assert.equal(weeklyPage.includes('const inputStartHref = `/app/capture?mode=${mode}`;'), true, "weekly input CTA should use capture");
});

test("golden flow learner surfaces do not expose instructor, payment, public archive, or official grading claims", () => {
  const files = [
    "components/learner/learner-ui.tsx",
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/input/page.tsx",
    "app/app/entry/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.equal(forbiddenLearnerRoutePattern.test(source), false, `${file} must not expose instructor/studio routes`);
    assert.equal(/\b(?:payment|checkout|paywall)\b/i.test(source), false, `${file} must not add billing or payment flow`);
    assert.equal(/\barchive\b/i.test(source), false, `${file} must not add a public archive`);
    assert.equal(/official\s+grading|official\s+score|model\s+answer|pass\/fail|score\s+prediction/i.test(source), false, `${file} must not add official grading/model answer/pass-fail claims`);
  }
});

test("PR359 owner QA evidence preserves closed-beta golden flow release decision", () => {
  const docPath = "docs/closed-beta-owner-qa-pr-359.md";
  assertExists(docPath);

  const doc = read(docPath);

  assert.equal(doc.includes("PR: #359 Capture Save Durability & Notes Reflection v1"), true);
  assert.equal(doc.includes("Capture -> Save -> Notes -> Review -> Today"), true);
  assert.equal(doc.includes("AUTH_BLOCKED"), true);
  assert.equal(doc.includes("official grading/model-answer/score/pass-fail copy"), true);
  assert.equal(doc.includes("metadata-safe"), true);
  assert.equal(doc.includes("local beta note reflection"), true);
  assert.equal(doc.includes("계산 근거 누락"), true);
  assert.equal(doc.includes("사업인정 처분성 판단 기준 혼동"), true);
  assert.equal(doc.includes("사업인정 처분성 판단 기준을 한 문단으로 다시 써보기"), true);
});
