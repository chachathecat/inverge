import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return readFileSync(relativePath, "utf8");
}

function walk(relativeDirectory) {
  return readdirSync(relativeDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

test("S231C enforces one light-only runtime contract", () => {
  const layout = read("app/layout.tsx");
  const globals = read("app/globals.css");
  const manifest = read("app/manifest.ts");
  const productionSources = [...walk("app"), ...walk("components"), ...walk("lib")]
    .map(read)
    .join("\n");

  assert.match(layout, /colorScheme:\s*"light"/);
  assert.match(layout, /<html[^>]+data-theme="light"/);
  assert.doesNotMatch(layout, /light dark|ThemeProvider|themeScript|localStorage|suppressHydrationWarning/);
  assert.match(globals, /:root\s*\{[\s\S]*?color-scheme:\s*light;/);
  assert.doesNotMatch(globals, /\[data-theme=["']?dark/);
  assert.match(manifest, /background_color:\s*"#f7f6f3"/);
  assert.equal(existsSync("components/shared/theme-provider.tsx"), false);
  assert.doesNotMatch(productionSources, /inverge:theme-mode|useThemeMode|ThemeProvider|type ThemeMode/);
});

test("S231C globally suppresses non-essential motion when the user requests it", () => {
  const globals = read("app/globals.css");

  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globals, /\*,\s*\*::before,\s*\*::after/);
  assert.match(globals, /animation-duration:\s*0\.01ms !important/);
  assert.match(globals, /animation-iteration-count:\s*1 !important/);
  assert.match(globals, /transition-duration:\s*0\.01ms !important/);
  assert.match(globals, /transition-delay:\s*0ms !important/);
  assert.match(globals, /scroll-behavior:\s*auto !important/);
});

test("S231C runtime acceptance is axe-backed, metadata-only, and honest about manual gaps", () => {
  const packageJson = JSON.parse(read("package.json"));
  const spec = read("tests/e2e/s231c-wcag-aa.spec.ts");
  const runner = read("scripts/run-node-tests.mjs");

  assert.equal(packageJson.devDependencies["@axe-core/playwright"], "^4.11.0");
  assert.match(spec, /new AxeBuilder\(\{ page \}\)/);
  for (const tag of ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]) {
    assert.ok(spec.includes(`"${tag}"`), `missing axe tag ${tag}`);
  }
  assert.match(spec, /critical|serious/);
  assert.match(spec, /focusContrast/);
  assert.match(spec, /keyboardCoreLoop/);
  assert.match(spec, /textResizePercent\s*=\s*200/);
  assert.match(spec, /desktopZoomEquivalentPercent\s*=\s*200/);
  assert.match(spec, /manualBrowserZoomCertification:\s*false/);
  assert.match(spec, /manualScreenReaderCertification:\s*false/);
  assert.match(spec, /screenshot:\s*"off"/);
  assert.match(spec, /trace:\s*"off"/);
  assert.match(spec, /video:\s*"off"/);
  assert.ok(runner.includes("tests/s231c-light-only-accessibility.test.mjs"));
  assert.ok(runner.includes("tests/focus-color-system.test.mjs"));
  assert.ok(runner.includes("tests/s231a-learner-shell-hardening.test.mjs"));
});

test("S231C keeps one dominant step action and announces focus and copy state", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const globals = read("app/globals.css");
  const spec = read("tests/e2e/s231c-wcag-aa.spec.ts");
  const gitignore = read(".gitignore");

  assert.equal((answerReview.match(/answer-review-build-feedback/g) ?? []).length, 1);
  assert.match(answerReview, /currentStep === 1[\s\S]*?answerTextRef\.current/);
  assert.match(answerReview, /stepTwoHeadingRef/);
  assert.match(answerReview, /stepThreeHeadingRef/);
  assert.match(answerReview, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(globals, /:where\(summary\)[\s\S]*?min-inline-size:\s*var\(--touch-target-min\)[\s\S]*?min-block-size:\s*var\(--touch-target-min\)/);
  assert.doesNotMatch(globals, /:where\(summary\)[\s\S]{0,160}display:\s*inline-flex/);
  assert.match(spec, /'a\[href\], button, summary,/);
  assert.match(spec, /element\.matches\('a\[href\]'\)[\s\S]*?display === "inline"/);
  assert.match(spec, /Keyboard traversal wrapped to the origin/);
  assert.match(spec, /name: "입력 수정하기", exact: true[\s\S]*?expect\(answer\)\.toBeFocused/);
  assert.match(spec, /name: "보강 문단 정리", exact: true[\s\S]*?toHaveCount\(1\)/);
  assert.match(gitignore, /^\/test-results\/$/m);
  assert.match(gitignore, /^\/playwright-report\/$/m);
});

test("S231C workflow is PR-scoped, exact-head, and publishes JSON-only evidence", () => {
  const workflow = read(".github/workflows/s231c-runtime.yml");

  assert.match(workflow, /pull_request\.number == 573/);
  assert.match(workflow, /run-s231c-auth-e2e/);
  assert.match(workflow, /agent\/s231c-light-accessibility-hardening/);
  assert.match(workflow, /inverge-git-agent-s231c-light-acc-ce4dd4-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /api\/runtime\/version/);
  assert.match(workflow, /deploymentSha !== process\.env\.EXPECTED_SHA/);
  assert.match(workflow, /s231c-wcag-aa\.spec\.ts/);
  assert.match(workflow, /s231c-runtime\.json/);
  assert.match(workflow, /manualBrowserZoomCertification !== false/);
  assert.match(workflow, /manualScreenReaderCertification !== false/);
  assert.match(workflow, /Screenshot, trace, or video output exists/);
  assert.match(workflow, /path: s231c-evidence\/s231c-runtime\.json/);
  assert.doesNotMatch(workflow, /tesseract|imagemagick|\.png\s*$/im);
});

test("S231C documents dark re-enable criteria and preserves the manual acceptance boundary", () => {
  const runbook = read("docs/qa/s231c-light-only-accessibility.md");

  for (const token of [
    "light-only",
    "Dark mode",
    "Browser 200%",
    "NVDA or VoiceOver",
    "manualScreenReaderCertification",
    "learner answer",
    "screenshot",
    "trace",
    "video",
  ]) {
    assert.ok(runbook.includes(token), `runbook is missing ${token}`);
  }
});
