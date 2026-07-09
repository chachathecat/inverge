import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

const learnerSurfaceFiles = [
  "components/inverge/front-page.tsx",
  "components/learner/learner-ui.tsx",
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/trust-status-card.tsx",
];

test("S226 source of truth is second-round 답안길 only for current learner surfaces", () => {
  const agents = read("AGENTS.md");
  const designSpec = read("docs/DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md");
  const learnerShell = read("components/learner/learner-ui.tsx");
  const landing = read("components/inverge/front-page.tsx");

  assert.match(agents, /focused ONLY on learner-facing .*2차/s);
  assert.match(designSpec, /Current learner-facing scope is fixed to 감정평가사 2차 only/);
  assert.doesNotMatch(designSpec, /persistent,\s*clearly visible\s*1차\s*\|\s*2차\s*mode switch/i);
  assert.doesNotMatch(`${learnerShell}\n${landing}`, /mode=first|1차 오답|감정평가사 1차|1차\s*\|\s*2차/);
  assert.match(`${learnerShell}\n${landing}`, /답안길/);
});

test("S226 globals define the required warm neutral visual primitives", () => {
  const globals = read("app/globals.css");

  for (const token of [
    "--bg-canvas: #f7f6f3",
    "--bg-surface: #ffffff",
    "--bg-subtle: #f2f0ea",
    "--bg-elevated: #fcfbf8",
    "--border-subtle: #e6e1d7",
    "--text-primary: #141821",
    "--text-secondary: #5a6472",
    "--brand-900: #10233f",
    "--brand-050: #eef4fb",
    "--cue-review-bg: #fef4e7",
    ".operating-surface",
    ".mission-surface",
    ".evidence-bar",
    ".trust-evidence",
    ".density-quiet",
    ".primary-action",
    ".secondary-action",
    ".status-review",
    ".status-risk",
    ".status-stable",
    ".status-compare",
    "--touch-target-min",
    ".ko-keep",
    ".hero-balance",
    ".text-readable",
    ".long-token",
  ]) {
    assert.ok(globals.includes(token), `missing S226 token or primitive: ${token}`);
  }
});

test("S226 landing, home, and capture each expose one dominant marker", () => {
  const landing = read("components/inverge/front-page.tsx");
  const home = read("app/app/page.tsx");
  const capture = read("components/review-os/capture-form.tsx");

  assert.equal(count(landing, "data-s226-primary-cta"), 1);
  assert.equal(count(home, "data-s226-primary-mission"), 1);
  assert.equal(count(capture, "data-s226-capture-primary-action"), 1);

  for (const phrase of ["답안 올리기", "근거 확인", "가장 큰 간극 1개", "다시 쓸 문단", "복습 예약"]) {
    assert.ok(landing.includes(phrase), `missing Korean transformation step: ${phrase}`);
  }
  for (const phrase of ["Raw answer / photo / text", "Evidence Review", "rewrite mission", "scheduled review"]) {
    assert.equal(landing.includes(phrase), false, `generic landing process label remains: ${phrase}`);
  }
  assert.match(home, /오늘의 1개/);
  assert.match(home, /data-s226-diagnostics-disclosure/);
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("과목 확인"));
});

test("S226 trust evidence is compact and OCR caveat is not repeated", () => {
  const trust = read("components/review-os/trust-status-card.tsx");
  const capture = read("components/review-os/capture-form.tsx");

  assert.match(trust, /TrustEvidenceBar/);
  assert.match(trust, /data-s226-trust-evidence/);
  assert.match(trust, /공식 채점 아님/);
  assert.equal(count(capture, "OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다."), 1);
  assert.match(capture, /<TrustEvidenceBar/);
  assert.match(capture, /data-capture-ocr-status-disclosure/);
  assert.ok(capture.indexOf("<TrustEvidenceBar") < capture.indexOf("data-capture-ocr-status-disclosure"));
});

test("S226 forbids decorative colors, glass styling, and positive authority claims", () => {
  const combined = learnerSurfaceFiles.map(read).join("\n").toLowerCase();

  for (const token of ["fuchsia", "lime", "salmon", "neon", "glassmorphism", "backdrop-blur", "linear-gradient"]) {
    assert.equal(combined.includes(token), false, `forbidden visual token remains: ${token}`);
  }

  const original = learnerSurfaceFiles.map(read).join("\n");
  for (const pattern of [
    /공식\s*채점(?!\s*(아님|이나))/,
    /공식\s*모범답안/,
    /확정\s*점수\s*(결과|확인|입니다|제공)/,
    /합격\s*(가능성|확률|보장)/,
    /AI\s*최종\s*판정/,
    /정답\s*보장/,
    /official grader/i,
    /pass probability/i,
    /pass guarantee/i,
  ]) {
    assert.doesNotMatch(original, pattern);
  }
});

test("S226 screenshot QA evidence document exists with honest viewport status", () => {
  const qa = read("docs/qa/s226-world-class-visual-system.md");

  for (const phrase of [
    "/",
    "/login",
    "/app?mode=second",
    "/app/capture?mode=second",
    "390px",
    "768px",
    "1440px",
    "Real browser screenshots were not generated",
  ]) {
    assert.ok(qa.includes(phrase), `missing S226 QA phrase: ${phrase}`);
  }
});
