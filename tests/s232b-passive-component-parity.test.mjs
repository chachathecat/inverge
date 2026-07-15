import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const ui = read("components/learner/study-ledger-ui.tsx");
const barrel = read("components/learner/index.ts");
const fixture = read("app/acceptance/figma-v3-passive/page.tsx");
const runtime = read("tests/e2e/s232b-passive-components.spec.ts");
const authRuntime = read("tests/e2e/s232b-authenticated-runtime.spec.ts");
const runner = read("scripts/run-node-tests.mjs");

const functionSource = (name, nextName) => {
  const start = ui.indexOf(`export function ${name}`);
  const end = ui.indexOf(nextName, start + 1);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${name} boundary must exist`);
  return ui.slice(start, end);
};

test("S232B StateChip implements the four evidence-backed Figma variants", () => {
  assert.match(ui, /StateChipState = "Unverified" \| "Weak" \| "Recovering" \| "Stable"/);
  for (const [state, label] of [
    ["Unverified", "미확인"],
    ["Weak", "취약"],
    ["Recovering", "회복 중"],
    ["Stable", "안정"],
  ]) {
    assert.match(ui, new RegExp(`${state}: \\{[\\s\\S]*?label: "${label}"`));
  }

  const chip = functionSource("StateChip", "export function StudyLedgerTrustBar");
  assert.match(chip, /data-v3-component="StateChip"/);
  assert.match(chip, /data-v3-state=\{state\}/);
  assert.match(chip, /data-s228-state-chip=\{legacyState\}/);
  assert.match(chip, /evidence: StateChipEvidence/);
  assert.match(chip, /requires non-empty evidence/);
  assert.match(chip, /distinctDaySuccessCount < 2/);
  assert.match(chip, /aria-label=\{showEvidence/);
  assert.doesNotMatch(chip, /children/);
  assert.doesNotMatch(chip, /role="status"|aria-live/);
});

test("S232B BiggestGap matches Figma type and density while keeping next action separate", () => {
  assert.match(ui, /BiggestGapType = "MissingLink" \| "Incorrect" \| "Unverified"/);
  assert.match(ui, /BiggestGapDensity = "Default" \| "Compact"/);
  for (const label of ["가장 큰 간극 1개", "잘못된 연결 1개", "확인할 근거 1개"]) {
    assert.ok(ui.includes(label), `missing BiggestGap label: ${label}`);
  }

  const gap = functionSource("BiggestGap", "export function EvidenceExcerpt");
  assert.match(gap, /data-v3-component="BiggestGap"/);
  assert.match(gap, /data-v3-biggest-gap/);
  assert.match(gap, /aria-labelledby=\{headingId\}/);
  assert.match(gap, /<h2 id=\{headingId\}/);
  assert.match(gap, /rounded-\[var\(--v3-radius-mark\)\]/);
  assert.doesNotMatch(gap, /nextAction/);
  assert.ok(ui.indexOf("<BiggestGap") < ui.indexOf("data-s228-next-action"));
  assert.equal((ui.match(/<BiggestGap/g) ?? []).length, 1);
});

test("S232B EvidenceExcerpt is provenance-aware, fluid, and honest about untyped references", () => {
  assert.match(ui, /EvidenceExcerptSource = "Learner" \| "Official" \| "AI"/);
  assert.match(ui, /EvidenceExcerptReview = "Default" \| "Confirmed"/);

  const excerpt = functionSource("EvidenceExcerpt", "function UntypedReferenceDisclosure");
  assert.match(excerpt, /data-v3-component="EvidenceExcerpt"/);
  assert.match(excerpt, /<figure/);
  assert.match(excerpt, /<figcaption/);
  assert.match(excerpt, /<blockquote/);
  assert.match(excerpt, /v3-prose/);
  assert.match(excerpt, /presentation\.label/);
  assert.match(excerpt, /확인됨/);
  assert.match(excerpt, /확인 필요/);
  assert.match(excerpt, /requires non-empty provenance/);
  assert.doesNotMatch(excerpt, /showProvenance/);
  assert.match(excerpt, /border-\[var\(--color-border-stable\)\]/);
  assert.doesNotMatch(excerpt, /h-\[190px\]|max-h-|overflow-auto|line-clamp|truncate/);

  assert.match(ui, /function UntypedReferenceDisclosure/);
  assert.match(ui, /data-s228-evidence-excerpt[\s\S]*data-s228-evidence-disclosure/);
  assert.match(ui, /sourceLabel="참고용 근거 · 원 출처 확인"/);
  assert.doesNotMatch(ui, /source="Official"[\s\S]{0,200}referenceEvidence|referenceEvidence[\s\S]{0,200}source="Official"/);
});

test("S232B Study Ledger conservatively adapts workflow state without false stability", () => {
  assert.match(ui, /export type LearningState = "scheduled" \| "attention" \| "ready" \| "completed"/);
  assert.match(ui, /state === "attention" \? "Unverified" : "Recovering"/);
  assert.match(ui, /basis: "missing-confirmation"/);
  assert.match(ui, /basis: "recovery-observed"/);
  assert.doesNotMatch(ui, /state === "completed"[^;]+"Stable"/);
  assert.match(ui, /showEvidence=\{false\}/);
  assert.match(ui, /evidence=\{stateChipEvidence\}/);
  assert.match(ui, /data-s228-state-chip/);
  assert.match(ui, /data-s228-biggest-gap/);
  assert.match(ui, /data-s228-evidence-excerpt/);
});

test("S232B public API and source stay on the shared semantic foundation", () => {
  for (const typeName of [
    "StateChipState",
    "StateChipEvidence",
    "BiggestGapType",
    "BiggestGapDensity",
    "EvidenceExcerptEvidence",
    "EvidenceExcerptSource",
    "EvidenceExcerptReview",
  ]) {
    assert.ok(barrel.includes(typeName), `missing public type export: ${typeName}`);
  }

  for (const literal of ["#f2f0ea", "#e1ded6", "#fdedec", "#b24d45", "#fef4e7", "#b56b16", "#eaf6f0", "#2e6e58", "#eef4fb", "#f2eefb", "#6b53a6"]) {
    assert.equal(ui.toLowerCase().includes(literal), false, `raw Figma literal must stay in semantic tokens: ${literal}`);
  }
  assert.match(ui, /bg-\[var\(--color-icon-risk\)\]/);
  assert.match(ui, /bg-\[var\(--color-icon-attention\)\]/);
  assert.match(ui, /bg-\[var\(--color-icon-stable\)\]/);
  assert.match(ui, /bg-\[var\(--color-icon-brand\)\]/);
});

test("S232B exposes a Preview-only, synthetic, privacy-safe component matrix", () => {
  assert.match(fixture, /VERCEL_ENV !== "preview"/);
  assert.match(fixture, /NODE_ENV !== "development"/);
  assert.match(fixture, /notFound\(\)/);
  assert.match(fixture, /data-private-learner-data="absent"/);
  assert.match(fixture, /stateChipFixtures\.map/);
  assert.match(fixture, /biggestGapTypes\.flatMap/);
  assert.match(fixture, /evidenceSources\.flatMap/);
  assert.doesNotMatch(
    fixture,
    /prisma|supabase|getReviewOsServerContext|cookies\(|headers\(|from\s+["'][^"']*auth[^"']*["']/i,
  );

  for (const width of [390, 768, 1440]) assert.ok(runtime.includes(`width: ${width}`));
  assert.match(runtime, /AxeBuilder/);
  assert.match(runtime, /screenshot: "off"/);
  assert.match(runtime, /trace: "off"/);
  assert.match(runtime, /video: "off"/);
  assert.match(runtime, /clippedComponents/);
  assert.match(runtime, /requestErrors/);
  assert.match(runtime, /requestfailed/);
  assert.match(runtime, /200% desktop zoom equivalent/);
  assert.doesNotMatch(runtime, /extraHTTPHeaders/);
  assert.match(runtime, /establishProtectedPreviewSession/);
  assert.ok(runner.includes("tests/s232b-passive-component-parity.test.mjs"));
});

test("S232B defines metadata-only exact-head authenticated integration evidence", () => {
  assert.match(authRuntime, /requireSafeAuthenticatedRuntime\("S232B", \{ requireTargetSha: true, requireExactHead: true \}\)/);
  assert.match(authRuntime, /S232B_AUTH_RUNTIME/);
  assert.match(authRuntime, /runtimeTargetSha/);
  assert.match(authRuntime, /componentEvidence/);
  assert.match(authRuntime, /\["390", "768", "1440"\]|label: "390"[\s\S]*label: "768"[\s\S]*label: "1440"/);
  assert.match(authRuntime, /persistedDetailAvailable: true/);
  assert.match(authRuntime, /rawLearnerContentCaptured: false/);
  assert.match(authRuntime, /screenshotCaptured: false/);
  assert.match(authRuntime, /traceCaptured: false/);
  assert.match(authRuntime, /videoCaptured: false/);
  assert.doesNotMatch(authRuntime, /page\.screenshot|outerHTML|innerHTML|localStorage|sessionStorage/);
});
