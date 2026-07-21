import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const productionSourceFiles = [...walk("app"), ...walk("components")];
const nonAdminSourceFiles = productionSourceFiles.filter(
  (relativePath) =>
    !relativePath.startsWith(`app${path.sep}admin${path.sep}`) &&
    !relativePath.startsWith(`components${path.sep}admin${path.sep}`),
);

test("S231A keeps every non-admin learner label at 12px or larger", () => {
  const offenders = nonAdminSourceFiles.flatMap((relativePath) => {
    const lines = read(relativePath).split("\n");
    return lines
      .map((line, index) => ({ relativePath, line, lineNumber: index + 1 }))
      .filter(({ line }) => /text-\[(?:9|10|11)px\]/.test(line))
      .map(({ relativePath: file, lineNumber }) => `${file}:${lineNumber}`);
  });

  assert.deepEqual(offenders, [], `sub-12px learner labels remain: ${offenders.join(", ")}`);
});

test("S231A shell exposes one skip target before its single main landmark", () => {
  const shell = read("components/learner/learner-ui.tsx");

  assert.match(shell, /data-learner-shell/);
  assert.match(shell, /const focusTarget = ledgerFocusMode/);
  assert.match(shell, /"#study-ledger-content"[\s\S]*"#calculator-routine-content"[\s\S]*"#learner-main"/);
  assert.match(shell, /href=\{focusTarget\}/);
  assert.match(shell, /<main id="learner-main" tabIndex=\{-1\}/);
  assert.equal((shell.match(/<main\b/g) ?? []).length, 2);
  assert.match(shell, /data-learner-shell-mode="focus"/);
  assert.match(shell, /data-learner-shell-mode="default"/);
  assert.ok(
    shell.indexOf("const skipLink") < shell.indexOf("<header"),
    "skip link must be the first focusable shell control",
  );
});

test("S231A shell covers safe areas and reserves a fixed dock for the canonical Ledger action", () => {
  const shell = read("components/learner/learner-ui.tsx");
  const ledger = read("components/learner/study-ledger-ui.tsx");

  for (const side of ["top", "right", "bottom", "left"]) {
    assert.ok(shell.includes(`safe-area-inset-${side}`), `learner shell is missing ${side} safe-area coverage`);
  }
  assert.match(shell, /pl-\[max\(var\(--layout-page-edge\),env\(safe-area-inset-left\)\)\]/);
  assert.match(shell, /pr-\[max\(var\(--layout-page-edge\),env\(safe-area-inset-right\)\)\]/);
  assert.match(shell, /pb-\[calc\(var\(--space-32\)\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(shell, /lg:pb-12/);
  assert.doesNotMatch(shell, /sm:pb-12/);
  assert.match(shell, /data-v3-placement="inline-action"/);
  assert.doesNotMatch(shell, /fixed inset-x-0 bottom-0/);
  assert.match(ledger, /inset-x-0/);
  assert.match(ledger, /pl-\[max\(20px,env\(safe-area-inset-left\)\)\]/);
  assert.match(ledger, /pr-\[max\(20px,env\(safe-area-inset-right\)\)\]/);
  assert.match(ledger, /pb-\[max\(20px,env\(safe-area-inset-bottom\)\)\]/);
});

test("S231A mobile navigation is stable, second-round only, and semantically current", () => {
  const shell = read("components/learner/learner-ui.tsx");

  assert.match(shell, /flex max-w-full gap-1 overflow-x-auto/);
  for (const label of ["오늘", "답안", "학습 노트", "복습", "기록"]) {
    assert.ok(shell.includes(`mobileLabel: "${label}"`), `missing mobile learner label: ${label}`);
  }
  assert.doesNotMatch(shell, /aria-label=\{item\.label\}/);
  assert.doesNotMatch(shell, /aria-hidden="true" className="(?:sm:hidden|hidden sm:inline)"/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  for (const activeHref of ["/app/today", "/app/session", "/app/weekly", "/app/calculator", "/app/study-log"]) {
    assert.ok(shell.includes(`"${activeHref}"`), `missing active-route mapping: ${activeHref}`);
  }
  assert.match(shell, /inline-flex min-h-11 shrink-0/);
  assert.match(
    shell,
    /border-\[var\(--color-border-focus\)\] bg-\[var\(--color-background-brand-soft\)\] text-\[var\(--color-text-brand\)\]/,
  );
  assert.doesNotMatch(shell, /mode=first/);
  assert.doesNotMatch(shell, /inline-flex min-h-10 items-center justify-center rounded-full border/);
});

test("S231A uses the high-contrast semantic focus token instead of translucent rings", () => {
  const focusSources = [
    "components/learner/learner-ui.tsx",
    "components/ui/button.tsx",
    "components/ui/textarea.tsx",
    "components/review-os/capture-form.tsx",
    "components/review-os/standalone-learner-tool-nav.tsx",
  ].map(read);
  const combined = focusSources.join("\n");

  for (const source of focusSources) assert.match(source, /focus-visible:ring-\[var\(--focus-ring\)\]/);
  assert.doesNotMatch(combined, /focus-visible:ring-[^\n]*(?:rgba|\/20)/);
});

test("S231A normalizes identified learner controls to explicit 44px targets", () => {
  const formerlyFortyPixelFiles = [
    "app/app/page.tsx",
    "app/app/settings/page.tsx",
    "components/learner/learner-ui.tsx",
    "components/notifications/notification-settings-client.tsx",
    "components/review-os/capture-form.tsx",
    "components/review-os/today-first-subject-selector.tsx",
  ];

  for (const relativePath of formerlyFortyPixelFiles) {
    assert.doesNotMatch(read(relativePath), /min-h-10\b/, `${relativePath} still declares a 40px target`);
  }

  const standaloneNav = read("components/review-os/standalone-learner-tool-nav.tsx");
  const calculatorCandidates = read("components/review-os/calculator-routine-review-candidates.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const session = read("app/app/session/page.tsx");
  const capture = read("components/review-os/capture-form.tsx");
  const todaySession = read("components/review-os/today-session-runner.tsx");
  const v3RouteUi = read("components/learner/v3-route-ui.tsx");
  const calculator = read("components/review-os/calculator-workflow-page.tsx");
  const accounting = read("components/review-os/accounting-template-card.tsx");
  const cloze = read("components/review-os/smart-cloze-review.tsx");

  assert.match(standaloneNav, /inline-flex min-h-11 items-center justify-center/);
  assert.match(calculatorCandidates, /<V3ActionLink[\s\S]*?tone="secondary"/);
  assert.equal(
    (
      answerReview.match(
        /<Link\s+href="\/login\?returnTo=%2Fanswer-review%3Fmode%3Dfirst"[\s\S]{0,240}?min-h-11/g,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    answerReview,
    /structureErrorAction === "login"[\s\S]*?kind:\s*"link",\s*label:\s*"로그인하고 계속"/,
  );
  assert.match(
    answerReview,
    /<label\s+key=\{option\.value\}\s+className=\{\s*examMode === "second"\s*\?\s*"[^"]*min-h-11[^"]*"\s*:\s*"[^"]*min-h-11/,
  );
  assert.equal((session.match(/<V3QuietDisclosure/g) ?? []).length, 2);
  assert.match(capture, /v3-type-label-strong flex min-h-11 cursor-pointer items-center whitespace-nowrap/);
  assert.match(capture, /"flex min-h-11 cursor-pointer items-center whitespace-nowrap/);
  assert.ok((todaySession.match(/<V3QuietDisclosure/g) ?? []).length >= 2);
  assert.match(v3RouteUi, /<summary className="v3-type-label-strong flex min-h-11/);
  assert.match(calculator, /<summary className="flex min-h-11 cursor-pointer items-center/);
  assert.match(accounting, /<summary className="flex min-h-11 cursor-pointer items-center/);
  assert.match(cloze, /<summary className="flex min-h-11 cursor-pointer items-center/);
});

test("S231A exact-head runtime covers responsive, keyboard, and accessibility semantics", () => {
  const spec = read("tests/e2e/s231a-learner-shell-accessibility.spec.ts");

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing runtime viewport: ${width}`);
  }
  for (const label of ["오늘", "답안", "학습 노트", "복습", "기록"]) {
    assert.ok(spec.includes(`"${label}"`), `missing runtime mobile label: ${label}`);
  }
  assert.match(spec, /requireSafeAuthenticatedRuntime\("S231A"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /test\.describe\.configure\(\{ timeout: 180_000, retries: 0 \}\)/);
  assert.match(spec, /rect\.width >= 44 && rect\.height >= 44/);
  assert.match(spec, /scrollWidth.*innerWidth/s);
  assert.match(spec, /outlineWidth.*GreaterThanOrEqual\(2\)/s);
  assert.match(spec, /main#learner-main.*toBeFocused/s);
  assert.match(spec, /aria-current/);
  assert.match(spec, /consoleErrorCount/);
  assert.match(spec, /sameOriginRequestFailureCount/);
  assert.match(spec, /captureSanitizedScreenshot/);
  assert.match(spec, /manualScreenReaderCertification: false/);
  assert.match(spec, /traceCaptured: false/);
  assert.match(spec, /videoCaptured: false/);
});

test("S231A workflow is one-shot, exact-head, and privacy fail-closed", () => {
  const workflow = read(".github/workflows/s231a-runtime.yml");
  const jobEnvironment = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  assert.match(workflow, /github\.event\.pull_request\.number == 569/);
  assert.match(workflow, /<!-- run-s231a-auth-e2e -->/);
  assert.match(workflow, /types: \[opened, synchronize, reopened, edited\]/);
  assert.ok(workflow.includes("E2E_RUNNER_SHA: ${{ github.event.pull_request.head.sha }}"));
  assert.ok(workflow.includes("E2E_TARGET_SHA: ${{ github.event.pull_request.head.sha }}"));
  assert.match(workflow, /inverge-git-agent-s231a-learner-s-239037-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /secrets\.E2E_USER_EMAIL \|\| secrets\.TEST_USER_EMAIL/);
  assert.match(workflow, /secrets\.E2E_USER_PASSWORD \|\| secrets\.TEST_USER_PASSWORD/);
  assert.match(workflow, /secrets\.VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.doesNotMatch(jobEnvironment, /secrets\./);
  assert.match(workflow, /id: runtime_acceptance/);
  assert.match(workflow, /RUNTIME_OUTCOME: \$\{\{ steps\.runtime_acceptance\.outcome \}\}/);
  assert.match(workflow, /tests\/e2e\/s231a-learner-shell-accessibility\.spec\.ts/);
  assert.match(workflow, /tesseract-ocr imagemagick/);
  assert.match(workflow, /Email-like text remained after deterministic redaction/);
  assert.match(workflow, /A successful runtime must produce exactly one S231A manifest/);
  assert.match(workflow, /manifest\.targetDeploymentSha === expectedSha/);
  assert.match(workflow, /viewportLabels\.has\("1440"\)/);
  assert.match(workflow, /if: always\(\) && steps\.redaction_guard\.outcome == 'success'/);
  assert.match(workflow, /test-results\/\*\*\/s231a-\*\.png/);
  assert.match(workflow, /test-results\/\*\*\/s231a-runtime\.json/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.doesNotMatch(workflow, /trace\.zip|\*\*\/\*\.png/);
});
