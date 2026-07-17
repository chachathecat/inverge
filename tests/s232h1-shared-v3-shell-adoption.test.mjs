import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("S232H.1 exposes one reusable V3 route grammar instead of route-specific cards", () => {
  const primitives = read("components/learner/v3-route-ui.tsx");
  const barrel = read("components/learner/index.ts");

  for (const component of [
    "V3RouteFrame",
    "V3RouteHeader",
    "V3SectionHeader",
    "V3Surface",
    "V3ActionLink",
    "V3ActionButton",
    "V3QuietDisclosure",
  ]) {
    assert.match(primitives, new RegExp(`export function ${component}`));
    assert.match(barrel, new RegExp(component));
  }

  for (const token of [
    "--layout-reading-column",
    "--layout-content-max",
    "--v3-radius-control",
    "--v3-radius-panel",
    "--control-height",
    "--color-background-surface",
    "--color-background-elevated",
    "--color-border-default",
    "--color-text-primary",
    "--color-text-secondary",
  ]) {
    assert.ok(primitives.includes(token), `missing V3 primitive token: ${token}`);
  }

  assert.doesNotMatch(primitives, /shadow-|linear-gradient|rounded-full/);
  assert.match(primitives, /as: Element = "div"/);
  assert.match(primitives, /type = "button"/);
});

test("S232H.1 aligns public and learner chrome to the 20/32/1120 V3 shell", () => {
  const shell = read("components/learner/learner-ui.tsx");
  const publicShell = read("components/shared/public-shell.tsx");
  const publicHeader = read("components/shared/site-header.tsx");
  const footer = read("components/shared/footer.tsx");

  assert.match(shell, /max-w-\[var\(--layout-content-max\)\]/);
  assert.match(shell, /var\(--layout-page-edge\)/);
  assert.match(shell, /overflow-x-auto/);
  for (const label of ["오늘 할 일", "오늘 한 것", "학습 노트", "복습", "학습 기록"]) {
    assert.match(shell, new RegExp(`label: "${label}"`));
  }
  assert.match(shell, /data-learner-shell-mode="focus"/);
  assert.match(shell, /data-learner-shell-mode="default"/);
  assert.doesNotMatch(shell, /fixed inset-x-0 bottom-0/);

  assert.match(publicShell, /data-v3-shell="public"/);
  assert.match(publicHeader, /data-v3-shell="public-header"/);
  assert.match(publicHeader, /h-14/);
  assert.match(publicHeader, /md:h-\[72px\]/);
  assert.match(publicHeader, /max-w-\[var\(--layout-content-max\)\]/);
  assert.match(footer, /v3-type-caption/);
});

test("S232H.1 keeps second-round shared study and access surfaces on V3 roles", () => {
  const minimal = read("components/review-os/minimal-study-system.tsx");
  const unavailable = read("components/review-os/access-check-unavailable-state.tsx");
  const denied = read("components/review-os/review-os-access-state.tsx");
  const learner = read("components/learner/learner-ui.tsx");

  assert.match(minimal, /V3Surface/);
  assert.match(minimal, /v3-type-(?:caption|section|body|label-strong|compact)/);
  assert.doesNotMatch(
    minimal,
    /--surface(?:Base|Elevated|Quiet)|--text(?:Strong|Body|Muted)/,
  );

  assert.match(learner, /data-v3-system-state="error"/);
  assert.match(unavailable, /V3RouteHeader/);
  assert.doesNotMatch(unavailable, /v3-type-page/);
  assert.match(denied, /V3ActionLink/);
  assert.match(denied, /const Content = embedded \? "section" : "main"/);
  assert.doesNotMatch(denied, /<Link[\s\S]*?<Button/);
});
