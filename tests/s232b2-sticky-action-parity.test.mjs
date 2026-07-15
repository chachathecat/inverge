import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => text.split(needle).length - 1;
const ui = read("components/learner/study-ledger-ui.tsx");
const barrel = read("components/learner/index.ts");
const fixture = read("app/acceptance/figma-v3-sticky-action/page.tsx");
const qa = read("docs/qa/s232b2-sticky-action-parity.md");

const stickyStart = ui.indexOf("export function StickyAction");
const stickyEnd = ui.indexOf("export function StudyLedgerDetail", stickyStart);
assert.notEqual(stickyStart, -1, "StickyAction must remain exported from study-ledger-ui");
assert.notEqual(stickyEnd, -1, "StickyAction source boundary must exist");
const sticky = ui.slice(stickyStart, stickyEnd);

test("S232B.2 implements the exact Dock/Inline by Ready/Saving/Offline/Disabled contract", () => {
  assert.match(ui, /StickyActionMode = "Dock" \| "Inline"/);
  assert.match(ui, /StickyActionState = "Ready" \| "Saving" \| "Offline" \| "Disabled"/);
  assert.match(ui, /label = "10분 문단 다시쓰기"/);
  assert.match(ui, /status = "2분 전 저장됨"/);
  assert.match(ui, /showStatus = true/);

  for (const state of ["Ready", "Saving", "Offline", "Disabled"]) {
    assert.match(ui, new RegExp(`${state}: \\{[\\s\\S]*?accessibleLabel:`));
  }

  assert.match(sticky, /data-v3-component="StickyAction"/);
  assert.match(sticky, /data-v3-mode=\{responsive \? undefined : mode\}/);
  assert.match(sticky, /data-v3-state=\{state\}/);
  assert.match(sticky, /data-status-visible=\{showStatus\}/);
});

test("S232B.2 uses semantic state tokens and exact reference geometry", () => {
  for (const token of [
    "--color-background-brand",
    "--color-text-inverse",
    "--color-background-brand-soft",
    "--color-text-brand",
    "--color-background-attention",
    "--color-text-attention",
    "--color-background-subtle",
    "--color-text-tertiary",
  ]) {
    assert.ok(ui.includes(`var(${token})`), `missing semantic token: ${token}`);
  }

  assert.match(sticky, /min-h-\[116px\]/);
  assert.match(sticky, /max-w-\[390px\]/);
  assert.match(sticky, /px-5/);
  assert.match(sticky, /pt-4/);
  assert.match(sticky, /pb-\[max\(20px,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(sticky, /shadow-\[0_-6px_20px_-8px_rgba\(20,23,33,0\.08\)\]/);
  assert.match(sticky, /min-h-\[84px\]/);
  assert.match(sticky, /lg:w-\[300px\]/);
  assert.match(sticky, /max-w-\[300px\]/);
  assert.match(sticky, /min-h-\[52px\]/);
  assert.match(sticky, /rounded-\[var\(--v3-radius-control\)\]/);
  assert.match(sticky, /text-\[15px\][\s\S]*leading-\[22px\]/);
  assert.match(sticky, /text-\[12px\][\s\S]*leading-\[18px\][\s\S]*tracking-\[0\.1px\]/);
  assert.doesNotMatch(sticky, /truncate|line-clamp|max-h-|overflow-hidden|opacity-/);
});

test("S232B.2 preserves one action and enforces explicit non-ready controller evidence", () => {
  assert.equal(count(ui, "data-s228-primary-action"), 1);
  assert.match(sticky, /const control = props\.state === undefined \|\| props\.state === "Ready"/);
  assert.match(sticky, /<Link[\s\S]*href=\{props\.href\}/);
  assert.match(sticky, /<button[\s\S]*disabled/);
  assert.match(sticky, /aria-busy=\{state === "Saving" \? true : undefined\}/);
  assert.match(sticky, /role="status"/);
  assert.match(sticky, /aria-live="polite"/);
  assert.match(sticky, /aria-atomic="true"/);
  assert.doesNotMatch(sticky, /role="alert"|aria-live="assertive"/);

  assert.match(ui, /state: "Saving"[\s\S]*controllerEvidence: Extract<[\s\S]*save-in-progress/);
  assert.match(ui, /state: "Offline"[\s\S]*controllerEvidence: Extract<[\s\S]*network-offline/);
  assert.match(ui, /state: "Disabled"[\s\S]*controllerEvidence: Extract<[\s\S]*action-disabled/);
  assert.match(ui, /href\?: never/);
});

test("S232B.2 production keeps the rewrite URL and adopts Ready in the reading column", () => {
  assert.match(
    ui,
    /"\/app\/capture\?mode=second&rewriteFrom=" \+ encodeURIComponent\(rewriteFromItemId \?\? itemId\)/,
  );
  assert.equal((ui.match(/<StickyAction\s/g) ?? []).length, 1);

  const detailStart = ui.indexOf("export function StudyLedgerDetail");
  const detail = ui.slice(detailStart);
  const actionIndex = detail.indexOf("<StickyAction");
  const railIndex = detail.indexOf("<aside data-s228-evidence-rail");
  assert.ok(actionIndex > -1 && actionIndex < railIndex, "StickyAction must belong to the reading column");
  assert.doesNotMatch(detail.slice(railIndex), /<StickyAction/);
  assert.match(detail.slice(actionIndex, railIndex), /responsive[\s\S]*state="Ready"[\s\S]*href=\{actionHref\}/);
  assert.doesNotMatch(detail.slice(actionIndex, railIndex), /state=\{completed/);
  assert.match(detail, /completed \? "문단 한 번 더 다듬기" : "10분 문단 다시쓰기"/);
  assert.match(detail, /completed \? "남은 간극 1개만 다시 확인합니다\." : "가장 큰 간극 1개만 보강합니다\."/);
  assert.match(detail, /max-lg:pb-\[calc\(136px\+env\(safe-area-inset-bottom\)\)\]/);
});

test("S232B.2 exports its typed public boundary", () => {
  for (const typeName of [
    "StickyActionControllerEvidence",
    "StickyActionMode",
    "StickyActionProps",
    "StickyActionState",
  ]) {
    assert.ok(barrel.includes(typeName), `missing public type export: ${typeName}`);
  }
  assert.match(barrel, /StickyAction,/);
});

test("S232B.2 exposes a Preview-only privacy-safe exact 2 by 4 matrix", () => {
  assert.match(fixture, /VERCEL_ENV !== "preview"/);
  assert.match(fixture, /NODE_ENV !== "development"/);
  assert.match(fixture, /notFound\(\)/);
  assert.match(fixture, /data-private-learner-data="absent"/);
  assert.match(fixture, /modes: readonly StickyActionMode\[\] = \["Dock", "Inline"\]/);
  assert.match(fixture, /states: readonly StickyActionState\[\] = \["Ready", "Saving", "Offline", "Disabled"\]/);
  assert.match(fixture, /modes\.map/);
  assert.match(fixture, /states\.map/);
  assert.match(fixture, /label: "10분 문단 다시쓰기"/);
  assert.match(fixture, /status: "2분 전 저장됨"/);
  assert.match(fixture, /controllerEvidence=\{\{ kind: "save-in-progress", saveInProgress: true \}\}/);
  assert.match(fixture, /controllerEvidence=\{\{ kind: "network-offline", isOnline: false \}\}/);
  assert.match(fixture, /kind: "action-disabled"/);
  assert.doesNotMatch(
    fixture,
    /prisma|supabase|getReviewOsServerContext|cookies\(|headers\(|from\s+["'][^"']*auth[^"']*["']/i,
  );
});

test("S232B.2 QA contract records scoped parity and exact-head requirements", () => {
  assert.match(qa, /component set: `51:44`/);
  assert.match(qa, /390×116/);
  assert.match(qa, /300×84/);
  assert.match(qa, /exactly one responsive component/);
  assert.match(qa, /completion changes only the existing label\/status copy/i);
  assert.match(qa, /metadata-only/);
  assert.match(qa, /exact Preview SHA before and after/);
  assert.match(qa, /## Rollback/);
});
