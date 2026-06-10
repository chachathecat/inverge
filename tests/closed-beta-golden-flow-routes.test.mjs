import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
  assert.equal(captureForm.includes('data-testid="capture-note-summary"'), true, "save confirmation summary should exist");
  assert.equal(captureForm.includes("buildCaptureNoteSummary"), true, "summary should include derived capture-note signals");
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
