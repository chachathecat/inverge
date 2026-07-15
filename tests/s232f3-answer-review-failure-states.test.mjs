import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildFailureAwareStateModel } from "../lib/review-os/failure-aware-state.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const source = read("app/answer-review/answer-review-client.tsx");

const sliceBetween = (startNeedle, endNeedle, value = source) => {
  const start = value.indexOf(startNeedle);
  const end = value.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing start boundary: ${startNeedle}`);
  assert.ok(end > start, `missing end boundary: ${endNeedle}`);
  return value.slice(start, end);
};

test("S232F.3 binds Answer Review loading and retryable error to memory-only F0 evidence", () => {
  const loading = buildFailureAwareStateModel({
    kind: "loading",
    safety: { kind: "memory_only", retainedInMemory: true },
  });
  const error = buildFailureAwareStateModel({
    kind: "error",
    retryable: true,
    safety: { kind: "memory_only", retainedInMemory: true },
  });
  const nonRetryableLimit = buildFailureAwareStateModel({
    kind: "error",
    retryable: false,
    safety: { kind: "memory_only", retainedInMemory: true },
  });

  assert.equal(loading.state, "loading");
  assert.equal(loading.safety.kind, "memory_only");
  assert.equal(loading.autoSyncEligible, false);
  assert.match(loading.safety.message, /현재 화면에만 남아/);

  assert.equal(error.state, "error");
  assert.equal(error.retryable, true);
  assert.equal(error.safety.kind, "memory_only");
  assert.equal(error.autoSyncEligible, false);
  assert.match(error.nextAction, /다시 시도/);
  assert.equal(nonRetryableLimit.retryable, false);
  assert.doesNotMatch(nonRetryableLimit.nextAction, /다시 시도/);
  assert.doesNotMatch(
    `${loading.happened} ${loading.safety.message} ${error.happened} ${error.safety.message}`,
    /저장 완료|자동 동기화|전송 대기열|서버에 저장/,
  );
});

test("S232F.3 renders F0 Loading while the current learner answer is locked in memory", () => {
  const entry = sliceBetween("{currentStep === 1 ? (", "{currentStep === 2 ? (");

  assert.match(source, /import \{ FailureAwareState \} from "@\/components\/learner\/failure-aware-state"/);
  assert.match(entry, /<fieldset[\s\S]*?disabled=\{isStructuring\}[\s\S]*?aria-busy=\{isStructuring \? true : undefined\}/);
  assert.match(entry, /data-s232f3-answer-input-lock=\{isStructuring \? "locked" : "editable"\}/);
  assert.match(entry, /\{isStructuring \? \([\s\S]*?data-s232f3-answer-review-loading="memory-only"/);
  assert.match(entry, /kind: "loading"[\s\S]*?kind: "memory_only", retainedInMemory: true/);
  assert.match(entry, /testId="answer-review-structure-loading"/);
  assert.match(source, /aria-label="내 답안 카메라 파일 선택" disabled=\{isStructuring\}/);
  assert.match(source, /data-s232e4-entry-actions-scoped="step-1"[\s\S]*?disabled=\{isStructuring\}/);
  assert.doesNotMatch(source, /setMyAnswerText\(""\)|setMyAnswerFiles\(\[\]\)/);
});

test("S232F.3 clears stale result evidence before every request and every failure exit", () => {
  const runStructure = sliceBetween("  const runStructure = async () => {", "  const feedbackDraftText = useMemo");
  const request = runStructure.indexOf('fetch("/api/answer-review/structure"');
  const initialDraftClear = runStructure.indexOf("setStructureDraft(null)");
  const loadingStepReset = runStructure.indexOf("setCurrentStep(1)");
  const billingBranch = sliceBetween(
    "if (!payload.ok && (isAnonymousTrialLimit || isAccountLimit))",
    "throw new Error",
    runStructure,
  );
  const catchBranch = sliceBetween("    } catch (error) {", "    } finally {", runStructure);

  assert.ok(initialDraftClear >= 0 && initialDraftClear < request);
  assert.ok(loadingStepReset >= 0 && loadingStepReset < request, "every valid retry must return to the visible F0 Loading step");
  for (const branch of [billingBranch, catchBranch]) {
    assert.match(branch, /setStructureDraft\(null\);[\s\S]*?setLearningSignalStatus\(null\);[\s\S]*?setReferenceGrounding\(null\);/);
  }

  assert.match(source, /data-s232e4-answer-review-result=\{structureDraft \? "one-gap-first" : undefined\}/);
  assert.match(source, /\{structureDraft \? \([\s\S]*?data-s232e4-rewrite-entry/);
  assert.match(source, /if \(currentStep === 2\) \{[\s\S]*?if \(!structureDraft\) return;/);
  assert.match(source, /\{currentStep === 3 && structureDraft \? \(/);
  assert.match(source, /\{currentStep !== 1 && structureDraft \? \(/);
});

test("S232F.3 renders transient errors as retryable F0 without removing the learner answer", () => {
  const resultStep = sliceBetween("{currentStep === 2 ? (", "{currentStep === 3 && structureDraft ? (");

  assert.match(resultStep, /data-s232f3-answer-review-error=\{isStructureErrorRetryable \? "retryable-memory-only" : "blocked-memory-only"\}/);
  assert.match(resultStep, /kind: "error"[\s\S]*?retryable: isStructureErrorRetryable[\s\S]*?kind: "memory_only", retainedInMemory: true/);
  assert.match(resultStep, /isStructureErrorRetryable[\s\S]*?kind: "button", label: "답안 검토 다시 시도"/);
  assert.match(resultStep, /label: "답안 검토 다시 시도", onAction: \(\) => void runStructure\(\)/);
  assert.match(resultStep, /testId="answer-review-structure-error"/);
  assert.match(resultStep, /role="alert" data-s232f3-answer-review-error-detail/);
  assert.match(resultStep, /현재 답안은 이 화면에 남아 있습니다/);
  assert.doesNotMatch(resultStep, /structureError[\s\S]{0,300}?data-s232e4-rewrite-entry/);
});

test("S232F.3 classifies entitlement and trial limits as non-retryable F0 errors", () => {
  const runStructure = sliceBetween("  const runStructure = async () => {", "  const feedbackDraftText = useMemo");
  const resultStep = sliceBetween("{currentStep === 2 ? (", "{currentStep === 3 && structureDraft ? (");
  const limitBranch = sliceBetween("const isAnonymousTrialLimit", "throw new Error", runStructure);
  const catchBranch = sliceBetween("    } catch (error) {", "    } finally {", runStructure);

  for (const code of [
    "ANONYMOUS_TRIAL_LIMIT",
    "FREE_TRIAL_LIMIT_REACHED",
    "CORE_LIMIT_REACHED",
    "BILLING_REQUIRED",
  ]) {
    assert.ok(limitBranch.includes(code), `missing non-retryable limit code: ${code}`);
  }
  assert.match(limitBranch, /setIsStructureErrorRetryable\(false\)/);
  assert.match(catchBranch, /setIsStructureErrorRetryable\(true\)/);
  assert.match(resultStep, /viewerMode === "anonymous" && trialLimitReached[\s\S]*?kind: "link", label: "로그인하고 계속"/);
  assert.match(resultStep, /kind: "link", label: "이용 범위 확인", href: "\/pricing"/);
  assert.match(resultStep, /blocked-memory-only/);
});

test("S232F.3 distinguishes analysis success from learning-signal persistence failure", () => {
  const resultStep = sliceBetween("{currentStep === 2 ? (", "{currentStep === 3 && structureDraft ? (");

  assert.match(resultStep, /structureDraft && learningSignalStatus === "failed"/);
  assert.match(resultStep, /data-s232f3-answer-review-analysis-status="succeeded"/);
  assert.match(resultStep, /data-s232f3-learning-signal-status="failed"/);
  assert.match(resultStep, /답안 분석은 완료됐지만 학습 기록은 저장되지 않았습니다/);
  assert.match(resultStep, /약점 신호·복습·오늘 계획 반영은 확인되지 않았습니다/);
  assert.doesNotMatch(resultStep, /학습 신호를 저장하지 못했습니다\. 직접 확인한 뒤 다시 저장해 주세요/);

  const successMarker = resultStep.indexOf('data-s232f3-answer-review-analysis-status="succeeded"');
  const statusDisclosure = resultStep.indexOf("data-s232e4-result-status-evidence");
  assert.ok(successMarker >= 0 && successMarker < statusDisclosure, "persistence failure must be visible before quiet status details");
});

test("S232F.3 adds no production fault-injection or query-param backdoor", () => {
  const productionFiles = [
    source,
    read("app/api/answer-review/structure/route.ts"),
  ].join("\n");

  assert.doesNotMatch(productionFiles, /S232F3_AUTH_RUNTIME|s232f3(?:Failure|Mock|Fixture)|force(?:Failure|Error)|mockStructure/i);
  assert.doesNotMatch(productionFiles, /searchParams\.get\([^)]*(?:fail|mock|fixture|error)/i);
  assert.doesNotMatch(productionFiles, /NEXT_PUBLIC_[A-Z0-9_]*(?:FAIL|MOCK|FIXTURE|BYPASS)/);
});

test("S232F.3 documentation and default runner preserve the evidence boundary", () => {
  const doc = read("docs/qa/s232f3-answer-review-failure-states.md");
  const runner = read("scripts/run-node-tests.mjs");

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /memory-only/i);
  assert.match(doc, /HTTP 200 negative acknowledgement/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /no production backdoor/i);
  assert.ok(runner.includes('"tests/s232f3-answer-review-failure-states.test.mjs"'));
});

test("S232F.3 runtime is exact-head, HTTP-200-negative-ack, remotely read-only, and metadata-only", () => {
  const spec = read("tests/e2e/s232f3-answer-review-failure-states.spec.ts");
  const workflow = read(".github/workflows/s232f3-runtime.yml");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport ${width}`);
  }
  for (const marker of [
    "data-s232f3-answer-review-analysis",
    "data-s232f3-answer-review-analysis-status",
    "data-s232f3-learning-signal-status",
    "answer-review-structure-loading",
    "data-s232f3-answer-input-lock",
    "answer-review-structure-error",
    "data-s232e4-biggest-gap",
    "data-s232e4-rewrite-entry",
  ]) {
    assert.ok(spec.includes(marker), `runtime missing marker ${marker}`);
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232F\.3"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /establishProtectedPreviewSession\(page, "S232F\.3"\)/);
  assert.match(spec, /loginWithDedicatedTestAccount\(page, "second"\)/);
  assert.match(spec, /page\.goto\("\/answer-review\?mode=second"/);
  assert.match(spec, /async function waitForReactHandler/);
  assert.match(spec, /key\.startsWith\("__reactProps\$"\)/);
  assert.match(spec, /typeof reactProps\?\.\[expectedEventName\] === "function"/);
  assert.match(spec, /__s232f3AnswerReviewDocumentIdentity/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /requestUrl\.origin === runtimeOrigin/);
  assert.match(spec, /requestUrl\.pathname === structurePathname/);
  assert.match(spec, /requestUrl\.search === ""/);
  assert.match(spec, /requestUrl\.hash === ""/);
  assert.match(spec, /request\.method\(\) === "POST"/);
  assert.match(spec, /request\.resourceType\(\) === "fetch"/);
  assert.match(spec, /await negativeAckGate/);
  assert.match(spec, /negativeAckStatus = 200/);
  assert.match(spec, /status: 200,[\s\S]*?ok: false/);
  assert.match(spec, /if \(!readOnlyMethods\.has\(request\.method\(\)\)\)/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.doesNotMatch(spec, /request\.postData|request\.postDataBuffer|request\.postDataJSON/);
  assert.match(spec, /mockedStructureRequestCount\)\.toBe\(2\)/);
  assert.match(spec, /runtimeErrors\.consoleErrors\)\.toEqual\(\[\]\)/);
  assert.match(spec, /runtimeErrors\.sameOriginRequestFailures\)\.toEqual\(\[\]\)/);
  assert.match(spec, /learnerAnswerPreservedAfterFailure/);
  assert.match(spec, /staleResultAbsentAfterFailure/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /\(element as HTMLFieldSetElement\)\.disabled/);
  assert.match(spec, /await expect\(requiredAnswer\)\.toBeDisabled\(\)/);
  assert.doesNotMatch(spec, /await expect\(entryFieldset\)\.toBeDisabled\(\)/);

  const firstChangeGuard = spec.indexOf('await waitForReactHandler(requiredAnswer, "onChange", "Answer Review learner answer")');
  const firstFill = spec.indexOf("await requiredAnswer.fill(syntheticAnswer)");
  const firstClickGuard = spec.indexOf('await waitForReactHandler(start, "onClick", "Answer Review start action")');
  const firstClick = spec.indexOf("await start.click()", firstFill);
  assert.ok(firstChangeGuard >= 0 && firstChangeGuard < firstFill, "onChange hydration guard must precede fill");
  assert.ok(firstClickGuard >= 0 && firstClickGuard < firstClick, "onClick hydration guard must precede click");
  assert.match(spec, /waitForReactHandler\(requiredAnswer, "onChange", "Remounted Answer Review learner answer"\)/);
  assert.match(spec, /waitForReactHandler\(start, "onClick", "Remounted Answer Review start action"\)/);

  for (const privacyFlag of [
    "rawLearnerDataPersisted",
    "globalDatabaseImmutabilityClaimed",
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "syntheticFixtureValueCaptured",
    "requestBodyCaptured",
    "responseBodyCaptured",
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

  assert.match(workflow, /agent\/s232f3-answer-review-states/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /run-s232f3-auth-e2e/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232f3-answer-review-failure-states\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232F\.3 evidence/);
  assert.match(workflow, /negativeAckHttpStatus: 200/);
  assert.match(workflow, /staleResultAbsentAfterFailure: true/);
  assert.match(workflow, /learnerAnswerPreservedAfterFailure: true/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232f3-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);
});
