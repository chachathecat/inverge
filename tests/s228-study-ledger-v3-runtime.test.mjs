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
  ]) {
    assert.ok(ui.includes(phrase), "missing honest Korean copy: " + phrase);
  }

  assert.equal(count(ui, "data-s228-primary-action"), 1);
  assert.match(ui, /min-h-11/);
  assert.match(ui, /--ledger-reading-column/);
  assert.match(ui, /--ledger-evidence-rail/);
});

test("S228 applies the new detail only to the second-round route", () => {
  const route = read("app/app/items/[itemId]/page.tsx");

  assert.match(route, /import \{ StudyLedgerDetail \} from "@\/components\/learner"/);
  assert.match(route, /if \(isSecond\) \{\s*return \(\s*<StudyLedgerDetail/s);
  assert.ok(route.indexOf("if (isSecond)") < route.indexOf("const calculatorWorkflow"));
  assert.match(route, /rewriteParagraph \?\? resolvedDetail\.item\.userAnswer/);
  assert.match(route, /referenceStructure \?\? resolvedDetail\.item\.correctAnswer/);
});

test("S228 keeps one action, AA tertiary text, and scoped editorial geometry", () => {
  const ui = read("components/learner/study-ledger-ui.tsx");
  const globals = read("app/globals.css");

  assert.equal(count(ui, "data-s228-primary-action"), 1);
  assert.match(globals, /--text-tertiary:\s*#647080/);
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
