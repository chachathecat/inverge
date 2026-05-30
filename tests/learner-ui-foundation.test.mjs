import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const learnerUi = await readFile(new URL("../components/learner/learner-ui.tsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../components/review-os/app-shell.tsx", import.meta.url), "utf8");
const autosave = await readFile(new URL("../hooks/use-learner-autosave-draft.ts", import.meta.url), "utf8");

test("learner shell uses a mobile-first constrained layout without horizontal overflow patterns", () => {
  assert.match(learnerUi, /max-w-\[760px\]/, "learner shell should constrain reading width on desktop");
  assert.match(learnerUi, /overflow-x-hidden/, "learner shell should guard against horizontal page overflow");
  assert.doesNotMatch(learnerUi, /overflow-x-auto/, "learner foundation should not rely on horizontal scrolling navigation");
  assert.match(learnerUi, /grid grid-cols-2 gap-2/, "mode switch should fit mobile width without horizontal scrolling");
});

test("bottom primary action remains reachable on mobile with a safe-area sticky footer", () => {
  assert.match(learnerUi, /function BottomPrimaryAction/, "bottom primary action primitive should exist");
  assert.match(learnerUi, /fixed inset-x-0 bottom-0/, "mobile CTA should be fixed to the bottom");
  assert.match(learnerUi, /env\(safe-area-inset-bottom\)/, "mobile CTA should respect device safe areas");
  assert.match(learnerUi, /min-h-11/, "learner actions should keep at least a 44px touch target");
});

test("collapsible details hide advanced content by default", () => {
  assert.match(learnerUi, /function CollapsibleDetails/, "collapsible details primitive should exist");
  assert.match(learnerUi, /<details className=/, "native details should be used for accessible progressive disclosure");
  assert.doesNotMatch(learnerUi, /<details[^>]*\sopen[=\s>]/, "details must not be open by default");
  assert.match(learnerUi, /<summary/, "collapsible details should expose an accessible summary control");
});

test("learner shell does not import instructor, admin, debug, or raw grading surfaces", () => {
  const combined = `${learnerUi}\n${shell}`;
  assert.doesNotMatch(combined, /@\/components\/(admin|instructor)/);
  assert.doesNotMatch(combined, /@\/lib\/(auth\/admin|.*admin|.*instructor)/);
  assert.doesNotMatch(combined, /debug|raw JSON|grading internals/i);
});

test("autosave draft utility provides visible status states for long learner input", () => {
  assert.match(autosave, /useLearnerAutosaveDraft/, "autosave hook should be exported");
  assert.match(autosave, /localStorage\.setItem/, "autosave should persist drafts locally");
  assert.match(autosave, /setStatus\("saving"\)/, "autosave should expose saving state");
  assert.match(autosave, /setStatus\("saved"\)/, "autosave should expose saved state");
  assert.match(autosave, /setStatus\("error"\)/, "autosave should expose recoverable error state");
});
