import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const capture = read("components/review-os/capture-form.tsx");
const capturePage = read("app/app/capture/page.tsx");
const writePage = read("app/app/write/page.tsx");

test("S232E.1 exposes one semantic four-stage Capture shell", () => {
  assert.match(capture, /const CAPTURE_FLOW_STEPS = \[/);
  for (const copy of [
    "1. 입력",
    "2. OCR/텍스트 확인",
    "3. 가장 큰 약점",
    "4. 오늘 계획 반영",
    "지금 할 일",
    "왜 필요한가",
    "다음 결과",
  ]) {
    assert.ok(capture.includes(copy), `missing Capture flow copy: ${copy}`);
  }

  assert.match(capture, /data-s232e-capture-flow=\{secondWriteEnabled \? "second-write" : "four-stage"\}/);
  assert.match(capture, /data-s232e-capture-step=\{currentCaptureStep\}/);
  assert.match(capture, /data-s232e-capture-stage=\{stage\}/);
  assert.match(capture, /data-capture-stage-flow/);
  assert.match(capture, /className="sr-only[^\"]*sm:not-sr-only sm:grid/);
  assert.match(capture, /aria-label="Capture 4단계 흐름"/);
  assert.match(capture, /aria-current=\{currentCaptureStep === step \? "step" : undefined\}/);
  assert.match(capture, /const SECOND_CAPTURE_FLOW_STEPS = \[/);
  assert.match(capture, /3\. 회상·비교·수정/);
  assert.match(capture, /4\. 저장·오늘 계획/);
  assert.match(capture, /data-capture-stage-context/);
  assert.match(capture, /aria-labelledby="capture-stage-current-title"/);
  assert.match(capture, /<dl[^>]*data-capture-stage-explanation>/);
  assert.equal((capturePage.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((capture.match(/<h1\b/g) ?? []).length, 0);
  assert.match(capturePage, /<h1 id="capture-page-title" className="v3-type-screen/);
  assert.match(capture, /aria-labelledby=\{labelledBy\}/);
  assert.match(capture, /<h2 className=\{mode === "second" \? "v3-type-section[^\"]*color-text-primary[^\"]*" : "v3-type-section[^\"]*foreground-strong[^\"]*"\}>입력 방식 선택<\/h2>/);
  assert.match(capture, /ref=\{captureStageHeadingRef\}/);
  assert.match(capture, /tabIndex=\{-1\}/);
  assert.match(capture, /captureStageHeadingRef\.current\?\.focus\(\)/);
});

test("S232E.1 preserves a single page heading when the Capture form is reused by Write", () => {
  assert.equal((writePage.match(/<h1\b/g) ?? []).length, 1);
  assert.match(writePage, /<h1 id="write-page-title" className="v3-type-screen/);
  assert.match(writePage, /labelledBy="write-page-title"/);
  assert.match(writePage, /workflow="second-write"/);
  assert.match(writePage, /data-s232e-write-flow="capture-form"/);
  assert.match(capture, /data-s232e-second-write-position=\{stage\}/);
  assert.match(capture, /"second-issue-recall": "1\/6 · 쟁점 회상"/);
  assert.match(capture, /"second-rewrite": "6\/6 · 문단 다시쓰기"/);
});

test("S232E.1 locks the controller-stage and current-work copy inventory without changing actions", () => {
  assert.match(capture, /function getCaptureStep\(stage: CaptureStage, mode: AppraisalMode\)/);
  assert.match(capture, /if \(stage === "intake"\) return 1;/);
  assert.match(capture, /if \(stage === "preview"\) return 2;/);
  assert.match(capture, /if \(stage === "saved-plan"\) return 4;/);
  assert.match(capture, /if \(stage === "confirm"\) return mode === "second" \? 4 : 3;/);
  assert.match(capture, /if \(stage\.startsWith\("second-"\)\) return 3;/);

  assert.match(capture, /intake: CAPTURE_FLOW_STEPS\[0\]/);
  assert.match(capture, /preview: CAPTURE_FLOW_STEPS\[1\]/);
  assert.match(capture, /"saved-plan": CAPTURE_FLOW_STEPS\[3\]/);
  const literalStageContexts = [
    ["confirm", "저장 전 확인"],
    ["second-issue-recall", "세부 작업 1/6 · 쟁점 회상"],
    ["second-outline", "세부 작업 2/6 · 목차 정리"],
    ["second-answer", "세부 작업 3/6 · 내 답안 작성"],
    ["second-reference", "세부 작업 4/6 · 참고 정리 비교"],
    ["second-gap", "세부 작업 5/6 · 가장 큰 약점"],
    ["second-rewrite", "세부 작업 6/6 · 문단 다시쓰기"],
  ];
  for (const [stage, eyebrow] of literalStageContexts) {
    const key = stage === "confirm" ? "confirm" : `"${stage}"`;
    assert.match(
      capture,
      new RegExp(`${key}: \\{[\\s\\S]{0,120}?eyebrow: "${eyebrow}"`),
      `missing bound current-work context for ${stage}`,
    );
  }
  assert.match(capture, /stage === "preview" && mode === "second"/);
  assert.match(capture, /확인한 내용을 닫고, 참고자료 없이 쟁점 회상부터 시작합니다\./);
  assert.match(capture, /hasRewriteContext && mode === "second"/);
  assert.match(capture, /이전 답안의 가장 큰 약점을 반영해 한 문단을 다시 씁니다\./);

  for (const preserved of [
    "saveQuickCaptureFromIntake",
    "generateStructuredDraft",
    "saveCaptureAfterConfirmation",
    "saveLocalCaptureConfirmation",
    "saveReviewOsDraft",
    "saveReviewOsLocalBetaNoteWithStatus",
    "/api/inverge/ocr",
    "/api/os/items",
    "ocrConfirmedByLearner",
    "hasManualCorrection",
    "productionBeforeComparison",
    "referenceAnswerAddedAfterProduction",
    "BottomPrimaryAction",
  ]) {
    assert.ok(capture.includes(preserved), `missing preserved Capture contract: ${preserved}`);
  }
});

test("S232E.1 uses established V3 roles and does not invent evidence authority", () => {
  const captureSurfaces = `${capturePage}\n${writePage}\n${capture}`;
  for (const token of [
    "v3-type-screen",
    "v3-type-section",
    "v3-type-body",
    "v3-type-label",
    "v3-type-caption",
    "--v3-radius-control",
    "--v3-radius-panel",
    "--color-background-subtle",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-border-default",
  ]) {
    assert.ok(captureSurfaces.includes(token), `missing V3 token or role: ${token}`);
  }

  assert.doesNotMatch(captureSurfaces, /\bStateChip\b|\bEvidenceExcerpt\b/);
  assert.doesNotMatch(captureSurfaces, /공식\s*채점(?!\s*아님)|확정\s*점수|합격\s*(?:판정|가능성|보장)/);
});

test("S232E.1 runtime gate is exact-head, action-safe, and metadata-only", () => {
  const spec = read("tests/e2e/s232e1-capture-outer-flow.spec.ts");
  const workflow = read(".github/workflows/s232e1-runtime.yml");
  const doc = read("docs/qa/s232e1-capture-outer-flow.md");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  for (const marker of [
    "data-s232e-capture-flow",
    "data-s232e-capture-step",
    "data-s232e-capture-stage",
    "accessibleStageList",
    "data-capture-stage-flow",
    "data-capture-stage-context",
    "data-capture-stage-current",
    "data-capture-stage-explanation",
    "data-s232e-capture-optional-inputs",
    "data-s226-capture-primary-action",
  ]) {
    assert.match(spec, new RegExp(marker));
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232E\.1"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /setViewportSize\(\{ width: viewports\[0\]\.width/);
  assert.match(spec, /request\.isNavigationRequest\(\)/);
  assert.match(spec, /request\.resourceType\(\) === "document"/);
  assert.match(spec, /__s232e1CaptureDocumentIdentity/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /!readOnlyMethods\.has\(request\.method\(\)\)/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.match(spec, /new AxeBuilder/);
  assert.doesNotMatch(spec, /dominantInput\.(?:click|press)\(/);
  assert.match(spec, /globalDatabaseImmutabilityClaimed: false/);
  assert.match(spec, /v3RoleClassesPresent: true/);
  assert.doesNotMatch(spec, /v3TypographyVerified/);

  for (const privacyFlag of [
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "ocrTextCaptured",
    "questionTextCaptured",
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

  assert.match(workflow, /agent\/s232e1-capture-outer-flow/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232e1-capture-outer-flow\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232E\.1 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232e1-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /390px[\s\S]*768px[\s\S]*1440px/i);
});
