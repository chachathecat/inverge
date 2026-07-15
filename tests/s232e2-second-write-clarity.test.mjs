import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { hasSecondWriteReferenceStep } from "../lib/review-os/second-write-reference-step.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const capture = read("components/review-os/capture-form.tsx");
const writePage = read("app/app/write/page.tsx");

function functionBlock(name, nextName) {
  const start = capture.indexOf(`function ${name}(`);
  const end = capture.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing boundary ${nextName}`);
  return capture.slice(start, end);
}

test("S232E.2 exposes one truthful six-stage progress model", () => {
  const expected = [
    ["second-issue-recall", 1, "쟁점 회상"],
    ["second-outline", 2, "목차 정리"],
    ["second-answer", 3, "내 답안"],
    ["second-reference", 4, "참고 비교"],
    ["second-gap", 5, "가장 큰 약점"],
    ["second-rewrite", 6, "문단 다시쓰기"],
  ];

  let previousIndex = -1;
  for (const [stage, position, label] of expected) {
    const literal = `{ stage: "${stage}", position: ${position}, label: "${label}" }`;
    const index = capture.indexOf(literal);
    assert.ok(index > previousIndex, `${stage} must keep the controller order`);
    previousIndex = index;
  }

  assert.match(capture, /data-s232e-second-write-progress\b/);
  assert.match(capture, /aria-label="다시쓰기 6단계 흐름"/);
  assert.match(capture, /data-s232e-second-write-progress-step=\{item\.position\}/);
  assert.match(capture, /data-s232e-second-write-stage=\{item\.stage\}/);
  assert.match(capture, /aria-current=\{isCurrent \? "step" : undefined\}/);
  assert.match(capture, /stage === "confirm"[\s\S]{0,40}?stage === "saved-plan"/);
  assert.match(capture, /function getSecondWriteStepNumber\(stage: CaptureStage\)/);
  assert.match(capture, /data-s232e-capture-flow=\{secondWriteEnabled \? "second-write" : "four-stage"\}/);
});

test("S232E.2 binds every controller panel to an exact x/6 label and one dominant action", () => {
  const panelContracts = [
    ["SecondIssueRecallPanel", "SecondOutlinePanel", 1, "쟁점 회상"],
    ["SecondOutlinePanel", "SecondAnswerPanel", 2, "목차 정리"],
    ["SecondAnswerPanel", "SecondReferencePanel", 3, "내 답안 작성"],
    ["SecondReferencePanel", "SecondGapPanel", 4, "참고 정리 비교"],
    ["SecondGapPanel", "SecondGapRewritePanel", 5, "가장 큰 약점"],
    ["SecondGapRewritePanel", "RewriteContextPanel", 6, "문단 다시쓰기"],
  ];

  for (const [name, nextName, step, label] of panelContracts) {
    const block = functionBlock(name, nextName);
    assert.match(block, new RegExp(`data-s232e-second-write-panel="${step}"`));
    assert.match(block, new RegExp(`다시쓰기 · ${step}/6 · ${label}`));
    assert.match(block, new RegExp(`aria-labelledby="second-write-step-${step}-title"`));
    assert.match(block, new RegExp(`id="second-write-step-${step}-title"[^>]*v3-type-section`));
    assert.match(block, /--v3-radius-panel/);
    assert.match(block, /--v3-radius-control/);
    assert.match(block, /--color-text-primary/);
    assert.match(block, /--color-border-/);
    assert.match(block, /quiet-disclosure/);
    if (step < 6) {
      assert.equal(
        (block.match(new RegExp(`data-s232e-second-write-primary-action="${step}"`, "g")) ?? []).length,
        1,
        `${name} must expose exactly one dominant action`,
      );
    }
  }

  assert.equal(
    (capture.match(/data-s232e-second-write-primary-action="6"/g) ?? []).length,
    1,
    "step 6 must expose one dominant move to final confirmation",
  );
  assert.equal(
    (capture.match(/data-s232e-second-write-primary-action="[1-6]"/g) ?? []).length,
    6,
    "the six-stage flow must have exactly one dominant action contract per step",
  );
  assert.match(capture, /data-s232e-second-write-secondary-action="defer-reference"/);
});

test("S232E.2 preserves the established stage order, validation, and learner-data behavior", () => {
  const orderedTransitions = [
    'onNext={() => setStage("second-outline")}',
    'onNext={() => setStage("second-answer")}',
    'setStage("second-reference")',
    'setStage("second-gap")',
    'onNext={() => setStage("second-rewrite")}',
    'onClick={() => setStage("confirm")}',
  ];

  let previousIndex = capture.indexOf("secondWriteEnabled ? (");
  for (const transition of orderedTransitions) {
    const index = capture.indexOf(transition, previousIndex + 1);
    assert.ok(index > previousIndex, `missing ordered transition: ${transition}`);
    previousIndex = index;
  }

  for (const preserved of [
    "issueRecall.trim().length < 8",
    "outlineDraft.trim().length < 8",
    "answer.trim().length < 8",
    "reference.trim().length < 4",
    "biggestGap.trim().length < 4",
    'update("productionBeforeComparison", true)',
    'update("referenceAnswerAddedAfterProduction", true)',
    "saveReviewOsDraft",
    "saveReviewOsLocalBetaNoteWithStatus",
    "saveCaptureAfterConfirmation",
    "/api/inverge/ocr",
    "/api/os/items",
    'data-testid="second-write-final-textarea"',
    'data-testid={mode === "second" && stage === "second-rewrite" && !rewriteContext ? "second-write-submit" : undefined}',
  ]) {
    assert.ok(capture.includes(preserved), `missing preserved contract: ${preserved}`);
  }

  assert.match(capture, /stage === "second-gap" && !secondModeReferenceStepComplete/);
  assert.match(capture, /const secondModeReferenceStepComplete = hasSecondModeReferenceStep\(form\);/);
  const guardEffect = capture.match(/useEffect\(\(\) => \{\s*if \(!secondWriteEnabled\)[\s\S]*?\}, \[secondWriteEnabled[\s\S]*?\]\);/)?.[0] ?? "";
  assert.doesNotMatch(guardEffect, /stage === "second-gap" && form\.correctAnswer\.trim\(\)\.length < 8/);
});

test("S232E.2 reference guard accepts explicit defer and every valid 4–7 character reference", () => {
  assert.equal(
    hasSecondWriteReferenceStep({
      correctAnswer: "",
      referenceAnswerAddedAfterProduction: true,
    }),
    true,
    "an explicit defer/completed-reference choice must not bounce from step 5 back to step 4",
  );

  for (const correctAnswer of ["1234", "12345", "123456", "1234567"]) {
    assert.equal(
      hasSecondWriteReferenceStep({
        correctAnswer,
        referenceAnswerAddedAfterProduction: false,
      }),
      true,
      `${correctAnswer.length}-character reference must satisfy the same >=4 panel validation`,
    );
  }

  assert.equal(
    hasSecondWriteReferenceStep({
      correctAnswer: "123",
      referenceAnswerAddedAfterProduction: false,
    }),
    false,
  );
  assert.equal(
    hasSecondWriteReferenceStep({
      correctAnswer: "",
      referenceAnswerAddedAfterProduction: false,
    }),
    false,
  );
});

test("S232E.2 keeps Write semantics, V3 roles, and non-authoritative language", () => {
  assert.match(writePage, /data-s224v-surface="\/app\/write"/);
  assert.match(writePage, /data-s232e-second-write-page/);
  assert.match(writePage, /<h1 id="write-page-title" className="v3-type-screen/);
  assert.match(writePage, /labelledBy="write-page-title"/);
  assert.match(writePage, /workflow="second-write"/);
  assert.equal((writePage.match(/<h1\b/g) ?? []).length, 1);

  const surfaces = `${writePage}\n${capture}`;
  for (const token of [
    "v3-type-screen",
    "v3-type-section",
    "v3-type-label",
    "v3-type-caption",
    "--v3-radius-control",
    "--v3-radius-panel",
    "--color-background-surface",
    "--color-background-subtle",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-border-default",
  ]) {
    assert.ok(surfaces.includes(token), `missing V3 token or role: ${token}`);
  }

  assert.doesNotMatch(surfaces, /공식\s*채점(?!\s*아님)|확정\s*점수|합격\s*(?:판정|가능성|보장)/);
  assert.doesNotMatch(surfaces, /Figma\s*(?:픽셀|pixel)|pixel[- ]?parity/i);
});

test("S232E.2 runtime gate is exact-head, action-safe, and metadata-only", () => {
  const spec = read("tests/e2e/s232e2-second-write-clarity.spec.ts");
  const workflow = read(".github/workflows/s232e2-runtime.yml");
  const doc = read("docs/qa/s232e2-second-write-clarity.md");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  for (const marker of [
    "data-s232e-second-write-page",
    "data-s232e-second-write-progress",
    "data-s232e-second-write-stage-list",
    "data-s232e-second-write-progress-step",
    "data-s232e-second-write-panel",
    "data-s232e-second-write-primary-action",
  ]) {
    assert.ok(spec.includes(marker), `missing runtime marker: ${marker}`);
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232E\.2"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /page\.goto\("\/app\/write\?mode=second"/);
  assert.match(spec, /request\.isNavigationRequest\(\)/);
  assert.match(spec, /request\.resourceType\(\) === "document"/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /globalDatabaseImmutabilityClaimed: false/);
  assert.doesNotMatch(spec, /dominantAction\.(?:click|press|fill)\(/);

  for (const privacyFlag of [
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "referenceTextCaptured",
    "answerTextCaptured",
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

  assert.match(workflow, /agent\/s232e2-second-write-clarity/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /run-s232e2-auth-e2e/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232e2-second-write-clarity\.spec\.ts/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232e2-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /trace\.zip|video\.webm|\*\*\/\*\.png/);

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /390px[\s\S]*768px[\s\S]*1440px/i);
});
