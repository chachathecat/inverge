import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => text.split(needle).length - 1;

test("S228 Study Ledger v3 exposes reusable, honest learning primitives", () => {
  const ui = read("components/learner/study-ledger-ui.tsx");

  for (const primitive of [
    "StateChip",
    "StudyLedgerTrustBar",
    "BiggestGap",
    "EvidenceExcerpt",
    "StudyLedgerEvidenceEmpty",
    "RewriteComparisonPanel",
    "StudyLedgerSupportingEvidencePanel",
    "StickyAction",
    "StudyLedgerDetail",
  ]) {
    assert.ok(ui.includes("export function " + primitive), "missing primitive: " + primitive);
  }

  for (const phrase of [
    "가장 큰 간극",
    "참고용 근거",
    "원 출처 확인 필요",
    "채점 결과로 확정하지 않습니다.",
    "10분 문단 다시쓰기",
    "복습 예정",
    "전·후 비교가 준비되었습니다.",
  ]) {
    assert.ok(ui.includes(phrase), "missing honest Korean copy: " + phrase);
  }

  assert.equal(count(ui, "data-s228-primary-action"), 1);
  assert.match(ui, /min-h-11/);
  assert.match(ui, /--ledger-reading-column/);
  assert.match(ui, /--ledger-evidence-rail/);
  assert.doesNotMatch(ui, /<main/);
  assert.match(ui, /<article/);
  assert.match(ui, /safe-area-inset-bottom/);
  const detail = ui.slice(ui.indexOf("export function StudyLedgerDetail"));
  const readingStart = detail.indexOf("data-s232d2-reading-column");
  const railStart = detail.indexOf("<aside", readingStart);
  const reading = detail.slice(readingStart, railStart);
  const rail = detail.slice(railStart, detail.indexOf("</aside>", railStart));
  assert.ok(reading.indexOf("<EvidenceExcerpt") < reading.indexOf("<StickyAction"));
  assert.doesNotMatch(rail, /<EvidenceExcerpt|<StickyAction/);
});

test("S228 retains second-round completion, comparison, calculator, and support paths", () => {
  const route = read("app/app/items/[itemId]/page.tsx");

  assert.match(route, /import \{ StudyLedgerDetail \} from "@\/components\/learner"/);
  assert.match(route, /if \(isSecond\) \{/);
  assert.ok(route.indexOf("const rewriteComparison") < route.indexOf("if (isSecond)"));
  assert.ok(route.indexOf("const questionReferenceHints") < route.indexOf("if (isSecond)"));
  assert.match(route, /completed=\{rewriteCompleted\}/);
  assert.match(route, /comparison=\{rewriteComparison\}/);
  assert.match(route, /calculatorHref=\{calculatorHref\}/);
  assert.match(route, /supportingEvidence=\{supportingEvidence\}/);
  assert.match(route, /ReviewOsFeedbackButton/);
  assert.match(route, /rewriteParagraph\?\.trim\(\) \|\|/);
  assert.match(route, /referenceStructure\?\.trim\(\) \|\|/);
});

test("S228 route states cover loading, empty, recoverable error, and real offline detection", () => {
  const loading = read("app/app/items/[itemId]/loading.tsx");
  const empty = read("app/app/items/[itemId]/not-found.tsx");
  const error = read("app/app/items/[itemId]/error.tsx");
  const ui = read("components/learner/study-ledger-ui.tsx");
  const trust = read("components/review-os/trust-provenance-layer.tsx");

  assert.match(loading, /data-s228-state="loading"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(empty, /data-s228-state="empty"/);
  assert.match(empty, /학습 노트로 돌아가기/);
  assert.match(error, /useSyncExternalStore/);
  assert.match(error, /data-s228-state=\{isOnline \? "error" : "offline"\}/);
  assert.match(error, /navigator\.onLine/);
  assert.match(error, /현재 오프라인입니다/);
  assert.match(ui, /data-s228-state="completed"/);
  assert.match(ui, /evidenceConflict/);
  assert.match(ui, /announceChange=\{evidenceConflict\}/);
  assert.match(trust, /announceChange && model\.actionableChange/);
  assert.match(trust, /role="status"/);
  assert.match(trust, /aria-live="polite"/);
  assert.doesNotMatch(trust, /role="alert"/);
});

test("S228 keeps one action, strong focus contrast, and scoped editorial geometry", () => {
  const ui = read("components/learner/study-ledger-ui.tsx");
  const globals = read("app/globals.css");

  assert.equal(count(ui, "data-s228-primary-action"), 1);
  assert.match(globals, /--text-tertiary:\s*#647080/);
  assert.match(globals, /--cue-review-text:\s*#7a430c/i);
  assert.match(globals, /--focus-ring:\s*var\(--cue-focus\)/i);
  assert.match(globals, /--ledger-radius-control:\s*12px/);
  assert.match(globals, /--ledger-radius-card:\s*14px/);
  assert.match(globals, /--ledger-radius-panel:\s*16px/);
  assert.match(globals, /--ledger-reading-column:\s*680px/);
  assert.match(globals, /--ledger-evidence-rail:\s*288px/);
});

test("S228 does not introduce unsupported authority or gamification claims", () => {
  const ui = read("components/learner/study-ledger-ui.tsx");

  for (const pattern of [
    /합격\s*(가능성|확률|보장)/,
    /정답\s*보장/,
    /AI\s*최종\s*판정/,
    /공식\s*모범답안/,
    /레벨|포인트|연속\s*학습|리더보드/,
    /\b\d{1,3}%\b/,
  ]) {
    assert.doesNotMatch(ui, pattern);
  }

  for (const forbidden of ["migration", "payment", "stripe", "prisma", "raw_ocr_text"]) {
    assert.equal(ui.toLowerCase().includes(forbidden), false, "out-of-scope dependency: " + forbidden);
  }
});
