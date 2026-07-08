import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/provider-disabled-synthetic-image-ocr-smoke-runbook.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

function expectIncludes(text, phrases) {
  phrases.forEach((phrase) => assert.equal(text.includes(phrase), true, `expected ${phrase}`));
}

test("provider-disabled synthetic image OCR smoke runbook doc exists and states purpose", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  expectIncludes(doc, [
    "Provider-Disabled Synthetic Image OCR Smoke Runbook v1",
    "provider-disabled synthetic image OCR smoke",
    "Close the #381 image OCR runtime partial safely",
    "Prove image capture UX can be tested without OCR provider calls",
    "Preserve learner-owned, draft, editable-before-save behavior",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook defines allowed test input and provider-disabled requirements", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Allowed Test Input",
    "synthetic learner-created image only",
    "Use no Q-Net material",
    "Use no official material",
    "Use no copied problem text",
    "Use no copied answer text",
    "Do not commit the image to the repo",
    "Do not commit OCR full text to the repo",
    "Evidence must be metadata-only",
    "Provider-disabled Requirement",
    "provider mode: disabled",
    "provider mode: mock",
    "provider mode: manual-no-submit",
    "Expected OCR provider request count: 0",
    "`/api/inverge/ocr` or equivalent provider endpoint must not be called",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook includes draft and editable-before-save requirements", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Draft And Editability Requirements",
    "OCR result is a draft",
    "The learner must confirm or edit before save",
    "Output text area is editable before save",
    "The learner can replace the draft manually when OCR is disabled",
    "Saving must create a learner-owned note from edited draft or manual replacement text",
    "OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.",
    "공식 채점이나 모범답안이 아니라, 내 공부 기록을 정리하는 기능입니다.",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook includes scenarios A-O", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Manual Smoke Scenarios",
    "| A | Image upload/camera control is reachable.",
    "| B | Synthetic learner-created image can be selected locally without committing the file.",
    "| C | Provider-disabled mode is confirmed before execution.",
    "| D | OCR provider request count remains 0.",
    "| E | Draft framing is visible.",
    "| F | Output text area is editable before save.",
    "| G | Learner can replace draft with synthetic text manually if OCR is disabled.",
    "| H | Save path can create learner-owned note from edited draft or manual replacement.",
    "| I | one biggestGap exists or is required by contract.",
    "| J | one nextAction exists or is required by contract.",
    "| K | Today Plan / Review Queue linkage semantics remain safe.",
    "| L | No official grading/model-answer/score/pass-fail copy appears.",
    "| M | No raw official material, local official path, or OCR full text is exposed or committed.",
    "| N | Provider-free telemetry can record metadata-only capture event.",
    "| O | If provider-disabled execution is unavailable, mark partial honestly and preserve Conditional Go.",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook includes evidence fields, stop rules, and follow-up implementation criteria", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Evidence Table Fields",
    "scenario",
    "status: pass / partial / blocked / not_applicable",
    "route",
    "source type: image",
    "provider mode: disabled / mock / manual-no-submit / unavailable",
    "provider request count",
    "persistence status:",
    "evidence summary",
    "follow-up needed",
    "Stop Rules",
    "OCR provider call occurs unexpectedly",
    "Raw image or OCR full text is committed",
    "Q-Net/local official material is used",
    "image output is not editable before save",
    "provider-disabled mode cannot be verified",
    "Follow-up Implementation Criteria",
    "adds a safe test-double or mock OCR mode",
    "ensures provider request count remains zero",
    "prevents raw test uploads from being committed",
    "keeps learner-facing draft/editable copy intact",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook includes required safety boundaries and validation commands", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "no OCR provider calls",
    "no AI provider calls",
    "no analytics provider calls",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no raw official text",
    "no OCR full text",
    "no uploaded images committed",
    "no screenshots committed",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no raw learner text in reports",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ]);
});

test("provider-disabled synthetic image OCR smoke runbook avoids local paths, raw official paths, screenshot paths, transient files, raw binary paths, committed uploads, OCR full text examples, and raw learner answer/problem examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /committed uploads?:\s*.+/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /raw learner answer text\s*:/i);
  assert.doesNotMatch(doc, /raw learner problem text\s*:/i);
});

test("provider-disabled synthetic image OCR smoke runbook test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/provider-disabled-synthetic-image-ocr-smoke-runbook.test.mjs"), true);
});
