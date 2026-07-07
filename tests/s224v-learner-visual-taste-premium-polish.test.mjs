import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const requiredSurfaceFiles = [
  { route: "/app", file: "app/app/page.tsx", marker: 'data-s224v-surface="/app"' },
  { route: "/app/capture", file: "app/app/capture/page.tsx", marker: 'data-s224v-surface="/app/capture"' },
  { route: "/answer-review?mode=second", file: "app/answer-review/answer-review-client.tsx", marker: 'data-s224v-surface="/answer-review?mode=second"' },
  { route: "/app/review", file: "app/app/review/page.tsx", marker: 'data-s224v-surface="/app/review"' },
  { route: "/app/notes", file: "app/app/items/page.tsx", marker: '"/app/notes"' },
];

const learnerPolishFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/answer-review/answer-review-client.tsx",
  "app/app/review/page.tsx",
  "app/app/items/page.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/today-first-subject-selector.tsx",
  "components/learner/learner-ui.tsx",
  "components/shared/closed-beta-banner.tsx",
  "app/globals.css",
];

test("S224V screenshot and taste QA document exists with required sections", () => {
  const docPath = "docs/s224v-learner-visual-taste-qa.md";
  assert.equal(existsSync(docPath), true);
  const doc = read(docPath);

  for (const phrase of [
    "Screenshot Commands",
    "Visual Density Audit",
    "Desktop Checklist",
    "Mobile Checklist",
    "Runtime Status",
    ".agent-factory/s224v-visual-taste-screenshots",
    "does not approve S225 public paid launch readiness",
  ]) {
    assert.ok(doc.includes(phrase), `missing QA doc phrase: ${phrase}`);
  }

  for (const route of ["/app", "/app/capture", "/answer-review?mode=second", "/app/review", "/app/notes"]) {
    assert.ok(doc.includes(route), `missing QA route: ${route}`);
  }
});

test("launch-critical surfaces expose S224V density markers and one-primary-action rule", () => {
  for (const { route, file, marker } of requiredSurfaceFiles) {
    const source = read(file);
    assert.ok(source.includes(marker), `${route} missing surface marker in ${file}`);
    assert.ok(source.includes('data-s224v-primary-cta-count-above-fold="1"'), `${route} missing one-primary-CTA marker`);
    assert.ok(source.includes("data-s224v-visible-trust-layer-count"), `${route} missing trust-layer count marker`);
    assert.ok(source.includes("data-s224v-visible-primary-work-items-max"), `${route} missing visible work-item cap marker`);
    assert.ok(source.includes('data-s224v-secondary-diagnostics="quiet-disclosure"'), `${route} missing quiet diagnostics rule`);
    assert.ok(source.includes('data-s224v-equal-weight-card-grid="absent"'), `${route} missing equal-weight grid absence marker`);
    assert.ok(source.includes('data-s224v-repeated-warning-copy="absent"'), `${route} missing repeated warning absence marker`);
  }

  const actionSources = [
    read("components/review-os/today-first-subject-selector.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("app/answer-review/answer-review-client.tsx"),
    read("components/review-os/review-queue-client.tsx"),
    read("app/app/items/page.tsx"),
  ].join("\n");
  assert.match(actionSources, /data-s224v-dominant-primary-action/);
});

test("trust layers and secondary diagnostics are compact and explicit", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const reviewQueue = read("components/review-os/review-queue-client.tsx");
  const notes = read("app/app/items/page.tsx");

  assert.match(capturePage, /data-s224v-visible-trust-layer-count="1"/);
  assert.match(answerReview, /data-s224v-visible-trust-layer-count="1"/);
  assert.doesNotMatch(captureForm, /CAPTURE_TRUST_LAYER_COPY\}\s*<\/p>\s*<p[^>]*>\{ANSWER_SUBMISSION_OCR_TRUST_COPY\}/);
  assert.match(captureForm, /data-s224v-stage-indicator="compact"/);
  assert.match(captureForm, /data-s224v-secondary-input-options="quiet"/);
  assert.match(answerReview, /data-answer-review-secondary-details data-s224v-secondary-diagnostics/);
  assert.match(reviewQueue, /data-review-secondary-list[\s\S]*data-s224v-secondary-diagnostics/);
  assert.match(notes, /foldedItems[\s\S]*data-s224v-secondary-diagnostics/);
});

test("learner chrome uses the 답안길 second-round identity without a first-round mode entry", () => {
  const learnerShell = read("components/learner/learner-ui.tsx");
  const betaBanner = read("components/shared/closed-beta-banner.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");

  assert.match(learnerShell, /답안길/);
  assert.match(learnerShell, /data-s224v-learner-mode-entry="second-only"/);
  assert.match(answerReview, /data-s224v-answer-review-scope="second-only"/);
  assert.match(betaBanner, /답안길은 감정평가사 2차 답안 운영 흐름/);
  assert.doesNotMatch(`${learnerShell}\n${betaBanner}`, /Inverge/);
  assert.doesNotMatch(learnerShell, /mode:\s*"first"|mode=first|1차/);
  assert.doesNotMatch(answerReview, /<option value="first"|시험 모드/);
  assert.doesNotMatch(betaBanner, /1차\/2차|1차·2차/);
});

test("S224V avoids prohibited positive authority, hype, and scope-expansion copy", () => {
  const combined = learnerPolishFiles.map(read).join("\n");

  assert.doesNotMatch(combined, /합격\s*(가능성|확률|보장)|AI\s*최종\s*판정|정답\s*보장|pass probability|guarantee/i);
  assert.doesNotMatch(combined, /공식\s*채점\s*(결과|완료|확인|입니다)|확정\s*점수\s*(결과|확인|입니다)|official\s+score\s+prediction/i);
  assert.doesNotMatch(combined, /혁신적인\s*AI|AI가\s*완벽|AI\s*채점기|AI\s*자동\s*판정/i);
});

test("S224V does not add commercial, provider, OCR runtime, or sensitive fixture expansion", () => {
  const changedRuntimeScope = [
    ...learnerPolishFiles,
    "scripts/s224v-capture-screenshots.mjs",
  ].map(read).join("\n");

  assert.doesNotMatch(changedRuntimeScope, /checkout|payment webhook|provider runtime|ocr runtime|openai|gemini|tesseract|documentprocessor|@google-cloud/i);

  const qaDoc = read("docs/s224v-learner-visual-taste-qa.md");
  assert.doesNotMatch(qaDoc, /learner answer body|raw OCR text|raw problem text|raw source excerpt|paymentData|auth token|secret/i);
  assert.equal(existsSync("tests/fixtures/s224v"), false, "S224V must not add fixture payloads");
});

test("S224V does not claim S225 launch readiness", () => {
  const combined = [
    read("docs/s224v-learner-visual-taste-qa.md"),
    ...learnerPolishFiles.map(read),
  ].join("\n");

  assert.doesNotMatch(combined, /S225\s+(?:is\s+)?(?:ready|approved|cleared)|S225\s+may\s+resume:\s*yes|launch readiness\s+approved/i);
  assert.match(read("docs/s224v-learner-visual-taste-qa.md"), /S225 must not resume solely from this PR/);
});
