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
  assert.match(shell, /href="#learner-main"/);
  assert.match(shell, /<main id="learner-main" tabIndex=\{-1\}/);
  assert.equal((shell.match(/<main\b/g) ?? []).length, 1);
  assert.ok(
    shell.indexOf('href="#learner-main"') < shell.indexOf("<header"),
    "skip link must be the first focusable shell control",
  );
});

test("S231A shell covers every viewport safe area without losing the bottom action inset", () => {
  const shell = read("components/learner/learner-ui.tsx");
  const ledger = read("components/learner/study-ledger-ui.tsx");

  for (const side of ["top", "right", "bottom", "left"]) {
    assert.ok(shell.includes(`safe-area-inset-${side}`), `learner shell is missing ${side} safe-area coverage`);
  }
  assert.match(shell, /pl-\[max\(1rem,env\(safe-area-inset-left\)\)\]/);
  assert.match(shell, /pr-\[max\(1rem,env\(safe-area-inset-right\)\)\]/);
  assert.match(shell, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(shell, /lg:pb-12/);
  assert.doesNotMatch(shell, /sm:pb-12/);
  assert.match(shell, /BottomPrimaryAction/);
  assert.match(ledger, /left-\[max\(1rem,env\(safe-area-inset-left\)\)\]/);
  assert.match(ledger, /right-\[max\(1rem,env\(safe-area-inset-right\)\)\]/);
});

test("S231A mobile navigation is stable, second-round only, and semantically current", () => {
  const shell = read("components/learner/learner-ui.tsx");

  assert.match(shell, /grid grid-cols-5 gap-1 sm:flex/);
  for (const label of ["오늘", "답안", "교정 노트", "복습", "기록"]) {
    assert.ok(shell.includes(`mobileLabel: "${label}"`), `missing mobile learner label: ${label}`);
  }
  assert.doesNotMatch(shell, /aria-label=\{item\.label\}/);
  assert.doesNotMatch(shell, /aria-hidden="true" className="(?:sm:hidden|hidden sm:inline)"/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  for (const activeHref of ["/app/today", "/app/session", "/app/weekly", "/app/calculator", "/app/study-log"]) {
    assert.ok(shell.includes(`"${activeHref}"`), `missing active-route mapping: ${activeHref}`);
  }
  assert.match(shell, /inline-flex min-h-11 min-w-0/);
  assert.match(
    shell,
    /border-\[color:var\(--brand-700\)\] bg-\[color:var\(--brand-050\)\] text-\[color:var\(--brand-900\)\]/,
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
  const calculator = read("components/review-os/calculator-workflow-page.tsx");
  const accounting = read("components/review-os/accounting-template-card.tsx");
  const cloze = read("components/review-os/smart-cloze-review.tsx");

  assert.match(standaloneNav, /inline-flex min-h-11 items-center justify-center/);
  assert.match(calculatorCandidates, /inline-flex min-h-11 items-center justify-center/);
  assert.equal((answerReview.match(/login\?returnTo=[^\n]+min-h-11/g) ?? []).length, 2);
  assert.match(answerReview, /label key=\{option\.value\} className="flex min-h-11 items-center/);
  assert.equal((session.match(/<summary className="flex min-h-11/g) ?? []).length, 2);
  assert.match(capture, /<summary className="flex min-h-11 cursor-pointer items-center whitespace-nowrap/);
  assert.equal((todaySession.match(/<summary className="flex min-h-11 cursor-pointer items-center px-3 py-2/g) ?? []).length, 2);
  assert.match(calculator, /<summary className="flex min-h-11 cursor-pointer items-center/);
  assert.match(accounting, /<summary className="flex min-h-11 cursor-pointer items-center/);
  assert.match(cloze, /<summary className="flex min-h-11 cursor-pointer items-center/);
});
