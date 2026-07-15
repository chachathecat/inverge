import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const source = read("app/answer-review/answer-review-client.tsx");

const sliceBetween = (startNeedle, endNeedle, value = source) => {
  const start = value.indexOf(startNeedle);
  const end = value.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing start boundary: ${startNeedle}`);
  assert.ok(end > start, `missing end boundary: ${endNeedle}`);
  return value.slice(start, end);
};

test("S232E.4 scopes answer snap and text focus to entry step 1", () => {
  assert.match(source, /\{currentStep === 1 \? \([\s\S]*?data-s232e4-entry-actions-scoped="step-1"/);
  assert.match(source, /data-s232e4-entry-actions-scoped="step-1"[\s\S]*?답안 스냅[\s\S]*?텍스트 붙여넣기/);
  assert.equal((source.match(/data-s232e4-entry-actions-scoped/g) ?? []).length, 1);
  assert.equal((source.match(/data-testid="answer-review-build-feedback"/g) ?? []).length, 1);
  assert.equal((source.match(/data-testid="answer-review-copy-feedback"/g) ?? []).length, 1);
  assert.doesNotMatch(source, /\{currentStep !== 1 \? \([\s\S]{0,500}?data-testid=/);
});

test("S232E.4 makes one successful biggest-gap result lead to one rewrite action", () => {
  const resultStep = sliceBetween("{currentStep === 2 ? (", "{currentStep === 3 ? (");
  const result = sliceBetween('data-s232e4-answer-review-result="one-gap-first"', "{structureError ? (");
  assert.match(result, /\{structureDraft \? \([\s\S]*?data-s232e4-biggest-gap/);
  assert.match(result, /가장 먼저 고칠 1가지/);
  assert.match(result, /<h3[^>]*>가장 큰 간극<\/h3>/);
  assert.match(result, /<dt[^>]*>왜 중요한가<\/dt>/);
  assert.match(result, /<dt[^>]*>다시 쓸 대상<\/dt>/);
  assert.match(result, /data-testid="answer-review-build-feedback"/);
  assert.match(result, /data-s232e4-rewrite-entry/);
  assert.equal((result.match(/data-s232e4-biggest-gap/g) ?? []).length, 1);
  assert.equal((result.match(/data-testid="answer-review-build-feedback"/g) ?? []).length, 1);
  assert.ok(result.indexOf("data-s232e4-biggest-gap") < result.indexOf('data-testid="answer-review-build-feedback"'));
  assert.doesNotMatch(
    resultStep,
    /initial=\{shouldReduceMotion \? false : \{ opacity: 0|animate=\{shouldReduceMotion \? undefined/,
    "result text surfaces must not enter through a transient low-contrast opacity state",
  );
});

test("S232E.4 keeps result status, evidence, calculator, and diagnostics quiet", () => {
  for (const marker of [
    "data-s232e4-result-status-evidence",
    "data-s232e4-result-secondary",
    "data-s232e4-full-diagnostics",
  ]) {
    assert.equal((source.match(new RegExp(marker, "g")) ?? []).length, 1, `missing or duplicate ${marker}`);
  }
  assert.match(source, /<details[\s\S]*?data-s232e4-result-status-evidence/);
  assert.match(source, /<details[\s\S]*?data-s232e4-result-secondary/);
  assert.match(source, /data-s232e4-result-secondary[\s\S]*?open=\{resultSecondaryOpen\}[\s\S]*?onToggle=/);
  assert.match(source, /\{resultSecondaryOpen \? \([\s\S]*?<CalculatorRoutineTrainer/);
  assert.match(source, /data-s232e4-result-status-evidence[\s\S]*?referenceGrounding[\s\S]*?learningSignalStatus[\s\S]*?ResultFeedbackPrompt/);
  assert.match(source, /data-s232e4-result-secondary[\s\S]*?누락 논점[\s\S]*?약한 구조[\s\S]*?답안 구조/);
  assert.doesNotMatch(source, /<details[^>]+data-s232e4-(?:result-status-evidence|full-diagnostics)[^>]+\sopen(?:=|\s|>)/);
});

test("S232E.4 presents rewrite target, instruction, editor, then copy or continue", () => {
  const rewrite = sliceBetween('data-s232e4-answer-review-rewrite="single-paragraph"', "{currentStep !== 1 ? (");
  for (const marker of [
    "data-s232e4-rewrite-surface",
    'data-testid="answer-review-revision-input"',
    "data-s232e4-copy-or-continue",
    'data-testid="answer-review-copy-feedback"',
    "data-s232e4-answer-review-continue",
    "data-s232e4-rewrite-guidance",
    "data-s232e4-rewrite-details",
  ]) {
    assert.ok(rewrite.includes(marker), `rewrite hierarchy missing ${marker}`);
  }
  const order = [
    "다시 쓸 대상",
    "작성 지시",
    'data-testid="answer-review-revision-input"',
    "data-s232e4-copy-or-continue",
  ].map((marker) => rewrite.indexOf(marker));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(order, [...order].sort((left, right) => left - right));
  assert.match(rewrite, /htmlFor="answer-review-revision-input"[\s\S]*?id="answer-review-revision-input"/);
  assert.match(rewrite, /data-s232e4-copy-or-continue[\s\S]*?answer-review-copy-feedback[\s\S]*?오늘 학습으로 계속/);
  assert.match(rewrite, /data-s232e4-rewrite-guidance[\s\S]*?<CognitiveLearningActionCard/);
  assert.match(rewrite, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(
    rewrite,
    /initial=\{shouldReduceMotion \? false : \{ opacity: 0|animate=\{shouldReduceMotion \? undefined/,
    "rewrite text surfaces must not enter through a transient low-contrast opacity state",
  );
  assert.match(
    source,
    /currentStep === 3[\s\S]*?transition=\{\{ duration: shouldReduceMotion \? 0 : 0\.32/,
  );
  assert.match(rewrite, /transition=\{\{ duration: shouldReduceMotion \? 0 : 0\.28/);
});

test("S232E.4 preserves service, state, trial, handoff, clipboard, and cognitive contracts", () => {
  for (const preserved of [
    'fetch("/api/answer-review/structure"',
    "setStructureDraft(normalizedDraft)",
    "setMissingPointMemo(normalizedDraft.missingIssueCandidates.join",
    "setRevisionParagraph(normalizedDraft.rewriteDraftSuggestion)",
    'viewerMode === "anonymous"',
    "trialLimitReached",
    "Problem Snap에서 다시 푼 답안을 불러왔습니다.",
    "navigator.clipboard.writeText(feedbackDraftText)",
    "buildCognitiveLearningActionUnit",
    "CalculatorRoutineTrainer",
    'data-testid="answer-review-start"',
    'data-testid="answer-review-my-answer-input"',
    'data-testid="answer-review-build-feedback"',
    'data-testid="answer-review-copy-feedback"',
  ]) {
    assert.ok(source.includes(preserved), `preserved contract missing: ${preserved}`);
  }
  assert.doesNotMatch(source, /Figma V3 pixel parity|pixel-parity/i);
  assert.doesNotMatch(source, /Verified|Confirmed|Official|evidence count/i);
});

test("S232E.4 clears a prior successful result before every valid structure retry", () => {
  const runStructure = sliceBetween("  const runStructure = async () => {", "  const feedbackDraftText = useMemo");
  const firstDraftClear = runStructure.indexOf("setStructureDraft(null)");
  const structureRequest = runStructure.indexOf('fetch("/api/answer-review/structure"');
  const billingReturn = runStructure.indexOf('setStructureError(`${payload.error} (업그레이드 또는 지원팀 문의)`);');

  assert.ok(firstDraftClear >= 0, "the retry path must clear any stale successful draft");
  assert.ok(firstDraftClear < structureRequest, "the stale draft must clear before the structure request starts");
  assert.ok(firstDraftClear < billingReturn, "the stale draft must clear before billing/limit early returns");
  assert.match(runStructure, /setStructureDraft\(null\);[\s\S]*?setLearningSignalStatus\(null\);[\s\S]*?setReferenceGrounding\(null\);/);
});

test("S232E.4 keeps anonymous persistence promises conditional on login and save", () => {
  const anonymousResult = sliceBetween(
    'viewerMode === "anonymous" && structureDraft',
    "qualityView && qualityView.qualityWarnings.length > 0",
  );

  for (const conditionalPromise of [
    "로그인해 저장하면 약점 신호에 누적됩니다.",
    "로그인해 저장하면 복습에 남습니다.",
    "로그인해 저장하면 오늘 계획에 반영됩니다.",
  ]) {
    assert.ok(anonymousResult.includes(conditionalPromise), `missing conditional persistence copy: ${conditionalPromise}`);
  }
  assert.ok(anonymousResult.includes("로그인하고 기록 저장"), "the existing login/save CTA must remain available");
  assert.doesNotMatch(anonymousResult, /• 이 결과가 약점 신호에 누적됩니다\./);
});

test("S232E.4 runtime is exact-head, remotely read-only, and metadata-only", () => {
  const spec = read("tests/e2e/s232e4-answer-review-continuation.spec.ts");
  const workflow = read(".github/workflows/s232e4-runtime.yml");
  const doc = read("docs/qa/s232e4-answer-review-continuation.md");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport ${width}`);
  }
  for (const marker of [
    "data-s232e4-entry-actions-scoped",
    "data-s232e4-answer-review-result",
    "data-s232e4-biggest-gap",
    "data-s232e4-rewrite-entry",
    "data-s232e4-result-status-evidence",
    "data-s232e4-result-secondary",
    "data-s232e4-answer-review-rewrite",
    "data-s232e4-rewrite-surface",
    "data-s232e4-copy-or-continue",
  ]) {
    assert.ok(spec.includes(marker), `runtime missing marker ${marker}`);
  }
  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232E\.4"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /establishProtectedPreviewSession\(page, "S232E\.4"\)/);
  assert.match(spec, /loginWithDedicatedTestAccount\(page, "second"\)/);
  assert.match(spec, /page\.goto\("\/answer-review\?mode=second"/);
  assert.match(spec, /__s232e4AnswerReviewDocumentIdentity/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.match(spec, /route\.fulfill\(/);
  assert.match(spec, /requestUrl\.origin === runtimeOrigin/);
  assert.match(spec, /requestUrl\.pathname === structurePathname/);
  assert.match(spec, /requestUrl\.search === ""/);
  assert.match(spec, /requestUrl\.hash === ""/);
  assert.match(spec, /request\.method\(\) === "POST"/);
  assert.match(spec, /request\.resourceType\(\) === "fetch"/);
  assert.match(spec, /if \(!readOnlyMethods\.has\(request\.method\(\)\)\)/);
  assert.match(spec, /throw new Error\("S232E\.4 blocked an unexpected non-read network request\."\)/);
  assert.doesNotMatch(spec, /page\.route\("\*\*\/api\/answer-review\/structure"/);
  assert.doesNotMatch(spec, /request\.postData|request\.postDataBuffer|request\.postDataJSON/);
  assert.match(spec, /mockedStructureRequestCount\)\.toBe\(2\)/);
  assert.match(spec, /staleResultClearedOnFailedRetry/);
  assert.match(spec, /failedRetryError/);
  assert.match(spec, /biggestGap\)\.toHaveCount\(0\)/);
  assert.match(spec, /getByTestId\("answer-review-build-feedback"\)\)\.toHaveCount\(0\)/);
  assert.match(spec, /serverMutationRequestCount\)\.toBe\(0\)/);
  assert.match(spec, /storageAfter\)\.toBe\(storageBefore\)/);
  assert.match(spec, /readAnalyticsLengths/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.doesNotMatch(spec, /copyAction\.click\(|continueAction\.click\(/);

  for (const privacyFlag of [
    "rawLearnerDataPersisted",
    "globalDatabaseImmutabilityClaimed",
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "syntheticFixtureValueCaptured",
    "questionTextCaptured",
    "referenceTextCaptured",
    "subjectCaptured",
    "urlCaptured",
    "emailCaptured",
    "domCaptured",
    "screenshotCaptured",
    "traceCaptured",
    "videoCaptured",
  ]) {
    assert.match(spec, new RegExp(`${privacyFlag}: false`));
  }

  assert.match(workflow, /agent\/s232e4-answer-review-continuation/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /run-s232e4-auth-e2e/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232e4-answer-review-continuation\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232E\.4 evidence/);
  assert.match(workflow, /"staleResultClearedOnFailedRetry"/);
  assert.match(workflow, /evidence\.mockedStructureRequestCount !== 2/);
  assert.match(workflow, /evidence\.staleResultClearedOnFailedRetry !== true/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232e4-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /390px[\s\S]*768px[\s\S]*1440px/i);
  assert.match(doc, /locally fulfills only two exact Answer Review structure requests/i);
  assert.match(doc, /Every other non-read request at any origin[\s\S]*?blocked and fails the run/i);
  assert.match(doc, /stale-result clearing on a failed retry/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /flat scalar JSON/i);
});
