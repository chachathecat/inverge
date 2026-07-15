import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("S232A self-hosts the three Figma V3 type families", () => {
  const packageJson = JSON.parse(read("package.json"));
  const layout = read("app/layout.tsx");

  assert.equal(packageJson.dependencies["@fontsource-variable/noto-sans-kr"], "5.2.10");
  assert.equal(packageJson.dependencies["@fontsource-variable/noto-serif-kr"], "5.2.10");
  assert.equal(packageJson.dependencies["@fontsource/ibm-plex-mono"], "5.2.7");
  assert.match(layout, /@fontsource-variable\/noto-sans-kr\/wght\.css/);
  assert.match(layout, /@fontsource-variable\/noto-serif-kr\/wght\.css/);
  assert.match(layout, /@fontsource\/ibm-plex-mono\/500\.css/);
});

test("S232A implements the exact light semantic color bridge from Figma node 43:2", () => {
  const globals = read("app/globals.css");

  for (const token of [
    "--bg-canvas: #f7f6f3",
    "--bg-surface: #ffffff",
    "--bg-subtle: #f2f0ea",
    "--bg-elevated: #fcfbf8",
    "--border-subtle: #e1ded6",
    "--border-strong: #c9c5bc",
    "--text-primary: #141821",
    "--text-secondary: #5a6472",
    "--text-tertiary: #647080",
    "--text-inverse: #ffffff",
    "--brand-900: #10233f",
    "--brand-800: #163053",
    "--brand-050: #eef4fb",
    "--cue-focus: #2b5c9a",
    "--cue-review-text: #7a430c",
    "--cue-risk-text: #8f3832",
    "--cue-stable: #2e6e58",
    "--cue-compare: #6b53a6",
    "--color-background-canvas: var(--bg-canvas)",
    "--color-text-link: var(--cue-focus)",
    "--color-border-default: var(--border-subtle)",
    "--color-icon-risk: var(--cue-risk-text)",
  ]) {
    assert.ok(globals.includes(token), `missing S232A color contract: ${token}`);
  }

  assert.match(globals, /color-scheme:\s*light/);
  assert.doesNotMatch(globals, /\[data-theme=["']?dark/);
});

test("S232A implements the exact Figma V3 spacing, radius, control, and layout primitives", () => {
  const globals = read("app/globals.css");

  for (const token of [
    "--space-0: 0px",
    "--space-4: 4px",
    "--space-8: 8px",
    "--space-12: 12px",
    "--space-16: 16px",
    "--space-20: 20px",
    "--space-24: 24px",
    "--space-28: 28px",
    "--space-32: 32px",
    "--space-40: 40px",
    "--space-48: 48px",
    "--space-64: 64px",
    "--space-section: 96px",
    "--space-page: 80px",
    "--v3-radius-control: 12px",
    "--v3-radius-card: 14px",
    "--v3-radius-panel: 16px",
    "--v3-radius-sheet: 20px",
    "--v3-radius-mark: 2px",
    "--v3-radius-micro: 4px",
    "--v3-radius-full: 9999px",
    "--touch-target-min: 44px",
    "--control-height: 52px",
    "--icon-size: 24px",
    "--layout-page-edge: 20px",
    "--layout-content-max: 1120px",
    "--layout-reading-column: 680px",
    "--layout-evidence-rail: 288px",
    "--layout-hairline: 1px",
    "--layout-focus-ring: 2px",
  ]) {
    assert.ok(globals.includes(token), `missing S232A layout contract: ${token}`);
  }

  assert.match(globals, /@media \(min-width: 48rem\)[\s\S]*?--layout-page-edge:\s*32px/);
});

test("S232A defines and applies V3 type roles to prose, headings, and calculator notation", () => {
  const globals = read("app/globals.css");
  const ledger = read("components/learner/study-ledger-ui.tsx");
  const calculator = read("components/review-os/calculator-routine-trainer.tsx");

  for (const token of [
    '--font-ui: "Noto Sans KR Variable"',
    '--font-prose: "Noto Serif KR Variable"',
    '--font-mono-code: "IBM Plex Mono"',
    "--type-display-size: 40px",
    "--type-display-line: 52px",
    "--type-display-tracking: -0.6px",
    "--type-screen-size: 28px",
    "--type-screen-line: 36px",
    "--type-screen-tracking: -0.4px",
    "--type-section-size: 20px",
    "--type-section-line: 28px",
    "--type-item-size: 18px",
    "--type-item-line: 26px",
    "--type-body-size: 16px",
    "--type-body-line: 26px",
    "--type-prose-size: 17px",
    "--type-prose-line: 30px",
    "--type-mono-display-size: 28px",
    "--type-mono-small-size: 13px",
    "--type-mono-small-line: 20px",
    "--focus-ring: var(--cue-focus)",
    ".v3-type-screen",
    ".v3-type-section",
    ".v3-type-item",
    ".v3-prose",
    ".v3-mono-small",
    ".v3-calculator-input",
    "max-inline-size: 42ch",
  ]) {
    assert.ok(globals.includes(token), `missing S232A typography contract: ${token}`);
  }

  assert.match(ledger, /data-v3-typography-role="heading-screen"/);
  assert.match(ledger, /data-v3-typography-role="prose"/);
  assert.match(calculator, /const calculatorNotationStepIds = new Set/);
  for (const stepId of ["formula", "numbers_units", "casio_input", "display_value", "answer_value", "unit_rounding"]) {
    assert.ok(calculator.includes(`"${stepId}"`), `calculator mono role is missing ${stepId}`);
  }
  assert.match(calculator, /usesCalculatorNotation && "v3-calculator-input"/);
  assert.match(calculator, /data-v3-typography-role=\{usesCalculatorNotation \? "calculator-mono" : "ui-body"\}/);
  assert.match(
    globals,
    /\.v3-mono-small,\s*\.v3-calculator-input\s*\{[\s\S]*?font-size:\s*var\(--type-mono-small-size\);[\s\S]*?font-weight:\s*500;[\s\S]*?line-height:\s*var\(--type-mono-small-line\);/,
  );
});

test("S232A QA evidence records source nodes, rollout boundary, and privacy boundary", () => {
  const runbook = read("docs/qa/s232a-figma-foundation-parity.md");
  const runner = read("scripts/run-node-tests.mjs");
  const runtimeSpec = read("tests/e2e/s232a-figma-foundation-runtime.spec.ts");
  const authRuntimeSpec = read("tests/e2e/s232a-authenticated-runtime.spec.ts");
  const workflow = read(".github/workflows/s232a-runtime.yml");

  for (const phrase of [
    "43:2",
    "44:9",
    "45:2",
    "47:28",
    "48:75",
    "50:59",
    "51:44",
    "52:42",
    "53:129",
    "light-only",
    "390px",
    "1440px",
    "learner answer",
    "screenshot",
    "runtime pending",
  ]) {
    assert.ok(runbook.includes(phrase), `S232A runbook is missing ${phrase}`);
  }

  assert.ok(runner.includes("tests/s232a-figma-foundation-parity.test.mjs"));
  assert.match(runtimeSpec, /width:\s*390/);
  assert.match(runtimeSpec, /width:\s*1440/);
  assert.match(runtimeSpec, /document\.fonts\.load/);
  assert.match(runtimeSpec, /browserErrors/);
  assert.match(runtimeSpec, /screenshot:\s*"off",\s*trace:\s*"off",\s*video:\s*"off"/);
  assert.match(authRuntimeSpec, /requireSafeAuthenticatedRuntime\("S232A", \{ requireTargetSha: true, requireExactHead: true \}\)/);
  assert.match(authRuntimeSpec, /data-v3-typography-role="calculator-mono"/);
  assert.match(authRuntimeSpec, /ledgerDetailViewports\.push\(viewport\.label\)/);
  assert.match(authRuntimeSpec, /expect\(ledgerDetailAvailable\)\.toBe\(true\)/);
  assert.match(authRuntimeSpec, /fontSize:\s*"13px", fontWeight:\s*"500", lineHeight:\s*"20px"/);
  assert.match(workflow, /pull_request\.number == 576/);
  assert.match(workflow, /pull_request\.number == 579/);
  assert.match(workflow, /agent\/s232a1-runtime-mono-hardening/);
  assert.match(workflow, /inverge-git-agent-s232a1-runtime-7a5613-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /run-s232a-auth-e2e/);
  assert.match(workflow, /deploymentSha !== process\.env\.EXPECTED_SHA/);
  assert.match(workflow, /s232a-runtime\.json/);
  assert.match(workflow, /Screenshot, trace, or video output exists/);
  assert.match(workflow, /manifest\.ledgerDetailAvailable !== true/);
  assert.match(workflow, /manifest\.ledgerDetailViewports\.includes\("390"\)/);
  assert.match(workflow, /manifest\.ledgerDetailViewports\.includes\("1440"\)/);
});
