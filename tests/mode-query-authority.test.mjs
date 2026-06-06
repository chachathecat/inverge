import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("/app?mode=first source contract keeps URL mode authoritative and does not default to second", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /const modeParam = query\?\.mode/);
  assert.match(appPage, /resolveAppraisalMode\(profile, modeParam\)/);
  assert.match(appPage, /reviewOsService\.getTodayFocus\(session\.userId, session\.email, mode\)/);
  assert.match(appPage, /allItems\.filter\(\(item\) => item\.examName === config\.label\)/);
  assert.match(appPage, /focus\.queue\.filter\(\(item\) => item\.examName === config\.label\)/);
  assert.doesNotMatch(appPage, /mode\s*=\s*["']second["']/);
});

test("/app?mode=second source contract keeps URL mode authoritative and does not default to first", () => {
  const appPage = read("app/app/page.tsx");
  assert.match(appPage, /const inputOptions =\s*mode === "first"[\s\S]*SECOND_MODE_INPUT_OPTIONS/);
  assert.match(appPage, /modeCaptureHref = mode === "second" \? "\/app\/write\?mode=second"/);
  assert.doesNotMatch(appPage, /const mode\s*=\s*"first"/);
});

test("capture and session routes resolve URL mode over stale profile mode", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const sessionPage = read("app/app/session/page.tsx");
  for (const source of [capturePage, sessionPage]) {
    assert.match(source, /const modeParam = query\?\.mode/);
    assert.match(source, /resolveAppraisalMode\(profile, modeParam\)/);
  }
});

test("capture save redirect uses the saved item mode", () => {
  const captureForm = read("components/review-os/capture-form.tsx");
  assert.match(captureForm, /`\/app\/first\/ox\?sourceItemId=\$\{encodeURIComponent\(result\.item\.id\)\}&mode=first`/);
  assert.match(captureForm, /`\/app\/session\?mode=\$\{mode\}&savedCapture=1&itemId=\$\{result\.item\.id\}`/);
});

test("header mode pills and tabs include the correct mode query", () => {
  const learnerShell = read("components/learner/learner-ui.tsx");
  assert.match(learnerShell, /parseAppraisalMode\(searchParams\.get\("mode"\)\) \?\? mode/);
  assert.match(learnerShell, /href=\{`\$\{pathname\}\?mode=\$\{item\.mode\}`\}/);
  assert.match(learnerShell, /const nextHref = item\.preserveMode \? `\$\{href\}\?mode=\$\{currentMode\}` : href/);
});
