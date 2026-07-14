import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

function cssHex(name) {
  const match = globals.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `Missing six-digit CSS color token: --${name}`);
  return match[1];
}

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first, second) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test("light semantic text and action pairs meet WCAG AA", () => {
  const normalTextPairs = [
    ["text-primary", "bg-canvas"],
    ["text-primary", "bg-surface"],
    ["text-secondary", "bg-canvas"],
    ["text-secondary", "bg-surface"],
    ["cue-review-text", "cue-review-bg"],
  ];

  for (const [foreground, background] of normalTextPairs) {
    assert.ok(
      contrast(cssHex(foreground), cssHex(background)) >= 4.5,
      `--${foreground} on --${background} must be at least 4.5:1`,
    );
  }

  assert.ok(
    contrast(cssHex("brand-900"), cssHex("text-inverse")) >= 4.5,
    "primary CTA text must be at least 4.5:1",
  );
});

test("focus and control boundaries meet the 3:1 non-text contrast floor", () => {
  for (const background of ["bg-canvas", "bg-surface", "bg-subtle", "bg-elevated"]) {
    assert.ok(
      contrast(cssHex("focus-ring"), cssHex(background)) >= 3,
      `--focus-ring on --${background} must be at least 3:1`,
    );
  }

  for (const background of ["bg-canvas", "bg-surface"]) {
    assert.ok(
      contrast(cssHex("control-border"), cssHex(background)) >= 3,
      `--control-border on --${background} must be at least 3:1`,
    );
  }
});

test("the color system is explicitly light-only and preserves visible focus", () => {
  assert.match(globals, /:root\s*\{[\s\S]*?color-scheme:\s*light;/);
  assert.doesNotMatch(globals, /\[data-theme=["']?dark/);
  assert.match(globals, /:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--focus-ring\)/);
  assert.match(globals, /--touch-target-min:\s*44px/);
});

test("learner surfaces use the dedicated review text token", () => {
  const learnerSources = [
    "components/learner/study-ledger-ui.tsx",
    "components/review-os/capture-form.tsx",
    "app/app/items/[itemId]/page.tsx",
  ].map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(learnerSources, /text-\[(?:color:)?var\(--cue-review\)\]/);
  assert.match(learnerSources, /text-\[(?:color:)?var\(--cue-review-text\)\]/);
});
