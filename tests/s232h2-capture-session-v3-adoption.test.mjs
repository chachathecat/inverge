import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const capturePage = read("app/app/capture/page.tsx");
const captureForm = read("components/review-os/capture-form.tsx");
const globals = read("app/globals.css");
const answerReview = read("app/answer-review/answer-review-client.tsx");
const writePage = read("app/app/write/page.tsx");
const sessionPage = read("app/app/session/page.tsx");
const sessionRunner = read("components/review-os/today-session-runner.tsx");

test("capture and write routes reuse the V3 reading frame without changing the six-step controller", () => {
  assert.match(capturePage, /mode === "second" \? <V3RouteFrame className="space-y-6">\{captureContent\}<\/V3RouteFrame> : captureContent/);
  assert.match(capturePage, /data-v3-layout=\{mode === "second" \? "route-header" : undefined\}/);
  assert.match(capturePage, /className=\{mode === "first" \? "space-y-5" : undefined\}/);
  assert.match(writePage, /<V3RouteFrame className="space-y-7">/);
  assert.match(writePage, /<V3Surface as="section"/);
  assert.match(writePage, /workflow="second-write"/);

  for (const position of [1, 2, 3, 4, 5, 6]) {
    assert.match(captureForm, new RegExp(`data-s232e-second-write-primary-action="${position}"`));
  }
  assert.match(captureForm, /<TrustEvidenceBar/);
  assert.match(captureForm, /<LegacyTrustEvidenceBar/);
  assert.match(captureForm, /<BiggestGap/);
  assert.match(captureForm, /mode === "second"[\s\S]*?다른 입력 방식/);
  assert.match(captureForm, /mode === "second"[\s\S]*?color-background-brand-soft/);
  assert.match(captureForm, /mode === "second" \? \([\s\S]*?<TrustEvidenceBar[\s\S]*?: \([\s\S]*?<LegacyTrustEvidenceBar/);
  assert.match(captureForm, /mode === "second" \? "v3-capture-form" : ""/);
  assert.match(captureForm, /mode === "second"[\s\S]*?v3-type-caption hidden max-w-full[\s\S]*?rounded-\[var\(--v3-radius-control\)\]/);
  assert.match(captureForm, /mode === "second"[\s\S]*?v3-type-label-strong flex min-h-11[\s\S]*?다른 작업/);
  assert.match(globals, /\.v3-capture-form \.form-control \{[\s\S]*?border-radius: var\(--v3-radius-control\);[\s\S]*?font-family: var\(--font-ui\);/);
  assert.match(globals, /\.v3-capture-form \.form-control:focus-visible \{[\s\S]*?border-color: var\(--color-border-focus\);/);
});

test("asynchronous OCR completion discards stale semantic responses and keeps the latest learner revision", () => {
  assert.match(captureForm, /setForm\(\(prev\) => \{/);
  assert.match(captureForm, /const extractionEditRevisionRef = useRef\(0\)/);
  assert.match(captureForm, /const extractionRequestRevisionRef = useRef\(0\)/);
  assert.match(captureForm, /beginExtractionRequest\("image_import"\)/);
  assert.match(captureForm, /requestIsCurrent\(requestRevision\)/);
  assert.match(captureForm, /invalidatePendingExtraction\("pdf_import"\)/);
  assert.match(captureForm, /invalidatePendingExtraction\("reset"\)/);
  assert.match(captureForm, /syncPageLabels\(synced\.filter\([\s\S]*?"remove_page"\)/);
  assert.match(captureForm, /syncPageLabels\(next, "move_page"\)/);
  assert.match(captureForm, /setForm\(createInitialDraftState\(\)\)/);
  assert.match(captureForm, /const requestEditRevision = extractionEditRevisionRef\.current/);
  assert.match(captureForm, /learnerEditedDuringRequest/);
  assert.match(captureForm, /rebuildLatestLearnerDraftAfterStaleExtraction/);
  assert.match(captureForm, /normalizedDraft: undefined/);
  assert.match(captureForm, /rawExtractionJson: \{\}/);
  assert.match(captureForm, /extractionNeedsReview: true/);
  assert.match(captureForm, /learnerEditedDuringRequest[\s\S]*?rebuildLatestLearnerDraftAfterStaleExtraction\(prev, requestSemanticSnapshot\)[\s\S]*?: applyExtraction\(prev, extraction\)/);
  assert.match(captureForm, /captureQualityIssue: "edited_during_extraction"/);
  assert.match(captureForm, /setExtractionState\(learnerEditedDuringRequest \? "manual" : "succeeded"\)/);
  assert.match(captureForm, /preserveLatestLearnerImageWorkAfterStaleExtraction\(requestSemanticSnapshot\)/);
  assert.match(captureForm, /setExtractionState\(lowConfidenceFlag \? "manual" : "succeeded"\)/);
  assert.match(captureForm, /추출 중 입력이 수정되어 최신 내용을 유지했습니다/);
  assert.doesNotMatch(captureForm, /setForm\(persist\(applyExtraction\(form/);
});

test("second capture exposes one canonical primary per live step and truthful announced states", () => {
  const extractionPreview = captureForm.match(/function ExtractionPreview[\s\S]*?function ConfirmPanel/)?.[0] ?? "";
  const secondPreview = extractionPreview.slice(
    extractionPreview.indexOf('if (mode === "second")'),
    extractionPreview.indexOf('className="rounded-[var(--radius-card)]'),
  );

  assert.match(captureForm, /variant=\{hasActiveInput \? "outline" : undefined\}/);
  assert.match(captureForm, /mode === "first" \|\| stage === "intake"/);
  assert.match(captureForm, /mode === "first" \? stage !== "intake" : stage === "preview"/);
  assert.match(captureForm, /data-v3-capture-extraction-preview/);
  assert.match(captureForm, /<TrustEvidenceBar[\s\S]*?showSaveStatus=\{false\}/);
  assert.match(captureForm, /role="alert"[\s\S]*?aria-live="assertive"/);
  assert.match(captureForm, /role="status"[\s\S]*?aria-live="polite"/);
  assert.match(captureForm, /role="alert"[\s\S]*?data-capture-persistence-failure[\s\S]*?focusHeadingOnChange/);
  assert.match(captureForm, /아직 저장 전/);
  assert.doesNotMatch(captureForm, /학습 노트에 저장됨/);
  assert.doesNotMatch(secondPreview, /--radius-|--cue-|--muted|--foreground|--surface/);
  assert.doesNotMatch(secondPreview, /sm:grid-cols/);
});

test("answer review keeps first presentation intact while second adopts canonical trust and biggest-gap contracts", () => {
  assert.match(answerReview, /type StepId = 1 \| 2 \| 3/);
  assert.match(answerReview, /data-v3-layout="route-header"/);
  assert.match(answerReview, /<AnswerReviewFrame isSecond=\{examMode === "second"\}>/);
  assert.match(answerReview, /if \(isSecond\)[\s\S]*?<V3RouteFrame[\s\S]*?<RefinedShell/);
  assert.match(answerReview, /<TrustEvidenceBar/);
  assert.match(answerReview, /<TrustProvenanceLayer/);
  assert.match(answerReview, /<BiggestGap/);
  assert.match(
    answerReview,
    /<AnswerReviewGapContainer\s+isSecond=\{examMode === "second"\}\s*>/,
  );
  assert.match(answerReview, /showSaveStatus=\{false\}/);
  assert.match(answerReview, /채점 결과나 합격 여부를 확정하지 않습니다/);
  assert.match(answerReview, /공식 채점이나 합격 판정이 아닙니다/);
  assert.match(
    answerReview,
    /mode%3Dsecond"\s*:\s*"\/login\?returnTo=%2Fanswer-review%3Fmode%3Dfirst/,
  );
});

test("saved capture session requires exact capture provenance, gates V3 to second, and keeps Queue to Today links", () => {
  assert.match(
    sessionPage,
    /detail\.item\.rawPayload\?\.created_from_capture === true \|\|[\s\S]*detail\.item\.derivedPayload\?\.created_from_capture === true \|\|[\s\S]*detail\.item\.createdFromCapture === true/,
  );
  assert.match(sessionPage, /mode === "second" \? \([\s\S]*?<V3RouteFrame[\s\S]*?: \([\s\S]*?<div className="space-y-6">/);
  assert.match(sessionPage, /mode === "second" \? \([\s\S]*?<V3Surface[\s\S]*?: \([\s\S]*?<DailyCommandCard/);
  assert.match(sessionPage, /<BiggestGap/);
  assert.match(sessionPage, /headingId="session-saved-capture-biggest-gap"/);
  assert.match(sessionPage, /<V3RouteHeader[\s\S]*?title="오늘은 이것만 합니다\."/);
  assert.match(sessionPage, /showHeader=\{mode !== "second"\}/);
  assert.match(sessionPage, /학습 노트에 저장한 약점과 다음 행동을 복습 흐름으로 이어갑니다/);
  assert.match(sessionPage, /href="\/app\?mode=second"/);
  assert.match(sessionPage, /href="\/app\/review\?mode=second"/);
  assert.match(sessionPage, /tone="secondary"[\s\S]*?data-session-saved-capture-action="secondary"/);
  assert.match(sessionRunner, /const SessionContainer = mode === "second" \? V3Surface : Card/);
  assert.match(sessionRunner, /mode === "second" \? "space-y-5"/);
  assert.match(sessionRunner, /<BiggestGap/);
  assert.doesNotMatch(`${captureForm}\n${sessionPage}`, /<Link[^>]*>\s*<Button/);
});

test("second Today Session stages use shared V3 surfaces without changing first-mode Card semantics", () => {
  assert.match(sessionRunner, /function SessionStage/);
  assert.match(sessionRunner, /if \(mode === "second"\)[\s\S]*?<V3Surface/);
  assert.match(sessionRunner, /const SessionContainer = mode === "second" \? V3Surface : Card/);
  assert.match(sessionRunner, /const SessionContent = mode === "second" \? "div" : CardContent/);
  assert.match(sessionRunner, /today-session-runner-biggest-gap/);
  assert.match(sessionRunner, /today-session-comparison-biggest-gap/);
  assert.match(sessionRunner, /<SessionStage mode=\{mode\}[\s\S]*?tone=\{mode === "second" \? "attention" : "surface"\}/);
  assert.match(sessionRunner, /<SessionStage mode=\{mode\}[\s\S]*?tone=\{mode === "second" \? "stable" : "surface"\}/);
  assert.match(sessionRunner, /completeAndFinish\(mode === "second" \? "second_paragraph_rewrite" : "first_short_retry"/);
  assert.match(sessionRunner, /오늘은 여기까지 해도 됩니다/);
});

test("second completion uses a V3 single-flow result selector and leaves the generic control to first mode", () => {
  assert.match(sessionRunner, /function SecondExecutionResultControls/);
  assert.match(sessionRunner, /buildLearningSignalFromExecutionResult\(\{[\s\S]*?result: selectedResult/);
  assert.match(sessionRunner, /data-v3-presentation="execution-result"/);
  assert.match(sessionRunner, /data-v3-flow="single-primary"/);
  assert.match(sessionRunner, /SECOND_EXECUTION_RESULT_OPTIONS\.map[\s\S]*?tone="secondary"[\s\S]*?aria-pressed=\{selected\}/);
  assert.match(sessionRunner, /mode === "second" \? \([\s\S]*?<SecondExecutionResultControls[\s\S]*?: \([\s\S]*?<ExecutionResultControls/);
  assert.match(sessionRunner, /<V3ActionLink href=\{`\/app\?mode=\$\{mode\}`\}>종료하고 오늘 화면으로<\/V3ActionLink>/);
});

test("the scoped adoption adds no aggregate-only or first-OX instrumentation", () => {
  const scopedSource = [capturePage, captureForm, answerReview, writePage, sessionPage, sessionRunner].join("\n");
  assert.doesNotMatch(scopedSource, /data-s232g|unexpected-request-failures|aggregate workflow/i);
  assert.match(captureForm, /destination === "first-ox" && mode === "first"/);
  assert.match(captureForm, /presentation=\{mode === "second" \? "v3" : "legacy"\}/);
  assert.match(answerReview, /presentation=\{examMode === "second" \? "v3" : "legacy"\}/);
});
