import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");

test("S232D.1 preserves Study Ledger focus mode while allowing the canonical calculator focus surface", () => {
  const learnerShell = read("components/learner/learner-ui.tsx");
  const detailPage = read("app/app/items/[itemId]/page.tsx");

  assert.match(learnerShell, /usePathname\(\)/);
  assert.match(learnerShell, /useSearchParams\(\)/);
  assert.match(learnerShell, /const ledgerFocusMode = pathname\.startsWith\("\/app\/items\/"\) && searchParams\.get\("mode"\) === "second"/);
  assert.match(learnerShell, /const calculatorFocusMode =/);
  assert.match(learnerShell, /const focusMode = ledgerFocusMode \|\| calculatorFocusMode/);
  assert.match(learnerShell, /if \(focusMode\)/);
  assert.match(learnerShell, /data-learner-shell-mode="focus"/);
  assert.match(learnerShell, /data-learner-shell-mode="default"/);
  assert.equal((learnerShell.match(/<main id="learner-main" tabIndex=\{-1\}/g) ?? []).length, 2);
  assert.match(learnerShell, /const focusTarget = ledgerFocusMode/);
  assert.match(learnerShell, /"#study-ledger-content"[\s\S]*"#calculator-routine-content"[\s\S]*"#learner-main"/);
  assert.match(learnerShell, /LEARNER_NAV_ITEMS\.map/);
  assert.match(detailPage, /modeParam !== mode/);
  assert.match(detailPage, /redirect\(`\/app\/items\/\$\{encodeURIComponent\(itemId\)\}\?mode=\$\{mode\}`\)/);
});

test("S232D.1 chrome matches the directly observed mobile and desktop top bars", () => {
  const chrome = read("components/learner/study-ledger-focus-chrome.tsx");

  assert.match(chrome, /data-v3-mobile-node="56:3"/);
  assert.match(chrome, /data-v3-desktop-node="59:63"/);
  assert.match(chrome, /h-\[calc\(56px\+env\(safe-area-inset-top\)\)\][^\n]*lg:h-\[calc\(72px\+env\(safe-area-inset-top\)\)\]/);
  assert.match(chrome, /grid h-full grid-cols-\[44px_minmax\(0,1fr\)_auto\]/);
  assert.match(chrome, /inline-flex h-11 w-11/);
  assert.match(chrome, /aria-label="학습 노트로 돌아가기"/);
  assert.match(chrome, />학습 노트<\/p>/);
  assert.match(chrome, /hidden h-full[^\n]*gap-6[^\n]*lg:flex/);
  assert.match(chrome, /pl-\[max\(4rem,env\(safe-area-inset-left\)\)\]/);
  assert.match(chrome, /<span>답안길<\/span>/);
  assert.match(chrome, /<span[^>]*>by Inverge<\/span>/);
  assert.match(chrome, /`학습 노트 \/ \$\{title\.trim\(\)\}`/);
  assert.match(chrome, /\{mobileStatus\}/);
  assert.match(chrome, /\{desktopStatus\}/);
  assert.match(chrome, /searchParams\.get\("mode"\) !== "second"/);
  assert.doesNotMatch(chrome, /2분 전|학습 원장|onClick|fetch\(|localStorage|sessionStorage/);
});

test("S232D.1 shares honest focus chrome across success and route states", () => {
  const detail = read("components/learner/study-ledger-ui.tsx");
  const loading = read("app/app/items/[itemId]/loading.tsx");
  const error = read("app/app/items/[itemId]/error.tsx");
  const notFound = read("app/app/items/[itemId]/not-found.tsx");
  const states = `${loading}\n${error}\n${notFound}`;

  assert.match(detail, /<StudyLedgerFocusChrome/);
  assert.match(detail, /mobileStatus="저장됨"/);
  assert.match(detail, /desktopStatus=\{`저장됨 · \$\{formatRecordDate\(savedAt\)\}`\}/);
  assert.match(detail, /data-s228-study-ledger-detail/);
  assert.match(detail, /<TrustEvidenceBar/);
  assert.match(detail, /<BiggestGap/);
  assert.match(detail, /<StickyAction/);
  assert.match(detail, /id="study-ledger-content"/);
  assert.match(detail, /data-s232d1-ledger-workspace/);
  assert.doesNotMatch(detail, /학습 원장으로 돌아가기/);

  assert.equal((states.match(/<StudyLedgerFocusChrome/g) ?? []).length, 3);
  for (const status of ["불러오는 중", "확인 필요", "기록 없음"]) {
    assert.ok(states.includes(`mobileStatus="${status}"`), `missing honest route status: ${status}`);
  }
  assert.equal((states.match(/id="study-ledger-content"/g) ?? []).length, 3);
  assert.doesNotMatch(states, /학습 원장/);
});

test("S232D.1 keeps data, state inference, and learner-loop behavior unchanged", () => {
  const chrome = read("components/learner/study-ledger-focus-chrome.tsx");
  const learnerShell = read("components/learner/learner-ui.tsx");
  const appShell = read("components/review-os/app-shell.tsx");
  const combined = `${chrome}\n${learnerShell}\n${appShell}`;

  assert.doesNotMatch(combined, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|fetch\(|\/api\//);
  assert.doesNotMatch(combined, /official|confirmed score|pass probability/i);
});

test("S232D.1 runtime gate is exact-head and metadata-only", () => {
  const spec = read("tests/e2e/s232d1-study-ledger-focus-shell.spec.ts");
  const workflow = read(".github/workflows/s232d1-runtime.yml");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232D\.1"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /data-learner-shell-mode/);
  assert.match(spec, /enterVisibleStudyLedgerDetail/);
  assert.match(spec, /mobileBack\.click\(\)/);
  assert.match(spec, /page\.getByRole\("link", \{ name: "답안길 오늘 할 일로 이동" \}\)\.click\(\)/);
  assert.match(spec, /rawLearnerContentCaptured: false/);
  assert.match(spec, /screenshotCaptured: false/);
  assert.match(spec, /traceCaptured: false/);
  assert.match(spec, /videoCaptured: false/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /tests\/e2e\/s232d1-study-ledger-focus-shell\.spec\.ts/);
  assert.match(workflow, /metadata-only S232D\.1 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232d1-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);
});
