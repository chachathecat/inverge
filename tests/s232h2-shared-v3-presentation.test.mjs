import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const feedback = read("components/review-os/feedback-button.tsx");
const cognitive = read("components/review-os/cognitive-learning-action-card.tsx");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);

  assert.ok(start >= 0, `missing start boundary: ${startNeedle}`);
  assert.ok(end > start, `missing end boundary: ${endNeedle}`);
  return source.slice(start, end);
}

test("shared review components keep legacy as the explicit default", () => {
  for (const source of [feedback, cognitive]) {
    assert.match(source, /presentation\?: "legacy" \| "v3"/);
    assert.match(source, /presentation = "legacy"/);
  }
});

test("feedback V3 uses canonical surface, action, divider, focus, and risk contracts", () => {
  const legacyBranch = sliceBetween(
    feedback,
    "  if (!isV3) {",
    '  return (\n    <div className="space-y-3" data-feedback-presentation="v3">',
  );
  const v3Branch = feedback.slice(feedback.indexOf('data-feedback-presentation="v3"'));

  assert.match(legacyBranch, /<Button type="button" variant="outline"/);
  assert.match(legacyBranch, /rounded-\[var\(--radius-md\)\]/);
  assert.match(legacyBranch, /rounded-2xl/);

  assert.match(v3Branch, /<V3ActionButton/);
  assert.match(v3Branch, /data-v3-component="Surface"/);
  assert.match(v3Branch, /rounded-\[var\(--v3-radius-panel\)\]/);
  assert.match(v3Branch, /border-t border-\[var\(--color-border-default\)\]/);
  assert.match(v3Branch, /aria-expanded=\{open\}/);
  assert.match(v3Branch, /aria-controls=\{feedbackPanelId\}/);
  assert.match(v3Branch, /border-\[var\(--color-border-risk\)\]/);
  assert.match(v3Branch, /bg-\[var\(--color-background-risk\)\]/);
  assert.match(v3Branch, /text-\[var\(--color-text-risk\)\]/);
  assert.doesNotMatch(v3Branch, /rounded-2xl|--radius-md|--surface-soft|<Button\b/);
});

test("cognitive V3 keeps exact learning-action data in one semantic divided list", () => {
  const v3Branch = sliceBetween(
    cognitive,
    '  if (presentation === "v3") {',
    "\n\n  return (\n    <section",
  );
  const legacyBranch = cognitive.slice(cognitive.indexOf("\n\n  return (\n    <section") + 2);

  assert.match(v3Branch, /data-v3-component="Surface"/);
  assert.match(v3Branch, /<dl className="[^"]*divide-y/);
  assert.match(cognitive, /<dt className="v3-type-caption/);
  assert.match(cognitive, /<dd className="v3-type-body/);
  for (const field of [
    "unit.oneBiggestGap",
    "unit.nextRewriteAction",
    "unit.retrievalCheck.label",
    "unit.retrievalCheck.prompt",
    "unit.continuation.reviewQueueCandidate",
    "unit.continuation.todayPlanMaxPrimaryTasks",
  ]) {
    assert.ok(v3Branch.includes(field), `V3 learning-action list lost ${field}`);
  }
  assert.doesNotMatch(v3Branch, /md:grid-cols-2|<article|<ActionLine|--radius-sm|--surface-soft/);

  assert.match(legacyBranch, /md:grid-cols-2/);
  assert.match(legacyBranch, /<ActionLine/);
  assert.match(legacyBranch, /<article className="rounded-\[var\(--radius-sm\)\]/);
});
