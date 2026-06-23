import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const nodeCommand = process.execPath;

const goldenRouteSources = [
  { route: "/app", file: "app/app/page.tsx" },
  { route: "/app/capture", file: "app/app/capture/page.tsx" },
  { route: "/app/input", file: "app/app/input/page.tsx", alias: true },
  { route: "/app/entry", file: "app/app/entry/page.tsx", alias: true },
  { route: "/app/notes", file: "app/app/notes/page.tsx" },
  { route: "/app/review", file: "app/app/review/page.tsx" },
];

const learnerRuntimeFiles = [
  "components/learner/learner-ui.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/local-beta-note-reflection.tsx",
  "components/review-os/review-queue-client.tsx",
  "lib/review-os/browser-storage.ts",
  "lib/review-os/capture-save-persistence.ts",
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/input/page.tsx",
  "app/app/entry/page.tsx",
  "app/app/items/page.tsx",
  "app/app/notes/page.tsx",
  "app/app/review/page.tsx",
];

const m418RequiredFiles = [
  "app/manifest.ts",
  "public/sw.js",
  "components/pwa/service-worker-registration.tsx",
  "components/notifications/notification-settings-client.tsx",
  "app/app/settings/notifications/page.tsx",
  "public/icons/inverge-apple-touch-180.png",
  "public/icons/inverge-icon-192.png",
  "public/icons/inverge-icon-512.png",
  "public/icons/inverge-maskable-512.png",
  "app/api/notifications/settings/route.ts",
  "app/api/notifications/subscribe/route.ts",
  "app/api/notifications/unsubscribe/route.ts",
  "app/api/notifications/test/route.ts",
  "app/api/cron/notifications/route.ts",
  "lib/notifications/push-payload.ts",
  "lib/notifications/notification-plan.ts",
  "lib/notifications/web-push-server.ts",
  "supabase/migrations/20260622_mobile_pwa_web_push_reminder.sql",
  "tests/mobile-pwa-web-push-reminder-v1.test.mjs",
  "tests/web-push-data-boundary.test.mjs",
  "tests/push-subscription-persistence.test.mjs",
  "tests/scheduled-reminder-idempotency.test.mjs",
  "tests/notification-settings-ui.test.mjs",
];

const prohibitedLearnerCopyPatterns = [
  { label: "official grading", pattern: /공식\s*채점|official\s+grading/i },
  { label: "official model answer", pattern: /공식\s*모범\s*답안|공식\s*모범답안|모범답안|official\s+model\s+answer/i },
  { label: "score prediction", pattern: /점수\s*예측|공식\s*점수|official\s+score|score\s+prediction/i },
  { label: "pass/fail judgment", pattern: /합격\s*\/\s*불합격\s*판정|합격\s*판정|불합격\s*판정|pass\s*\/\s*fail|pass-fail/i },
  { label: "payment", pattern: /결제|payment|checkout|paywall/i },
  { label: "instructor console", pattern: /강사용\s*콘솔|학원용\s*답안\s*운영\s*콘솔|instructor\s+console/i },
  { label: "public archive", pattern: /public\s+archive|공개\s+아카이브/i },
  { label: "problem bank positioning", pattern: /problem\s+bank|문제은행/i },
  { label: "instructor route exposure", pattern: /\/(?:instructor|studio)(?:\/|["'`?])/i },
];

const unsafeTrackedOfficialMaterialPathPatterns = [
  { label: "qnet_manifest.json", pattern: /(?:^|\/)qnet_manifest\.json$/i },
  { label: "local official material directory", pattern: /(?:^|\/)(?:local[-_]official[-_]materials|official[-_]materials[-_]local)(?:\/|$)/i },
  {
    label: "raw official binary in Q-Net/official path",
    pattern: /(?:^|\/)(?:qnet|official|raw[-_]official|official[-_]raw|ocr[-_]raw|answer[-_]raw|model[-_]answer)[^/]*\.(?:pdf|zip|hwp|hwpx|docx?|png|jpe?g|webp)$/i,
  },
  {
    label: "raw OCR/answer dump in tracked files",
    pattern: /(?:^|\/)(?:qnet|official|raw[-_]official|official[-_]raw|local[-_]official)[^/]*(?:full|raw|dump|body|text)[^/]*\.(?:txt|json|md)$/i,
  },
];

function readSource(file, failures) {
  if (!existsSync(file)) {
    failures.push(`missing required file: ${file}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function check(condition, message, failures) {
  if (!condition) failures.push(message);
}

function has(source, needle) {
  return source.includes(needle);
}

function learnerVisibleSource(file, source) {
  if (file !== "components/review-os/capture-form.tsx") return source;
  return source.replace(/findField\(sourceText,\s*\[[^\]]+\]\)/g, "findField(sourceText, [])");
}

function runStaticReadinessGate() {
  const failures = [];

  const sourcesByFile = new Map();
  const getSource = (file) => {
    if (!sourcesByFile.has(file)) sourcesByFile.set(file, readSource(file, failures));
    return sourcesByFile.get(file);
  };

  for (const routeSource of goldenRouteSources) {
    const source = getSource(routeSource.file);
    check(Boolean(source), `${routeSource.route} source must exist at ${routeSource.file}`, failures);
    if (routeSource.alias) {
      check(has(source, "redirect(`/app/capture"), `${routeSource.route} must redirect to /app/capture`, failures);
      check(has(source, 'params.set("mode", mode)'), `${routeSource.route} must preserve mode`, failures);
      check(has(source, 'params.set("subject", query.subject)'), `${routeSource.route} must preserve subject`, failures);
      check(!/\/(?:instructor|studio)(?:\/|["'`?])/.test(source), `${routeSource.route} alias must not expose instructor routes`, failures);
    }
  }

  const learnerShell = getSource("components/learner/learner-ui.tsx");
  check(has(learnerShell, 'href: "/app"'), "learner nav must include Today /app", failures);
  check(has(learnerShell, 'href: "/app/capture"'), "learner nav must include Capture /app/capture", failures);
  check(has(learnerShell, 'href: "/app/review"'), "learner nav must include Review /app/review", failures);
  check(has(learnerShell, 'href: "/app/notes"'), "learner nav must include Notes /app/notes", failures);
  check(has(learnerShell, '`${href}?mode=${currentMode}`'), "learner nav must preserve mode", failures);

  const capturePage = getSource("app/app/capture/page.tsx");
  const captureForm = getSource("components/review-os/capture-form.tsx");
  const localStorage = getSource("lib/review-os/browser-storage.ts");
  const localReflection = getSource("components/review-os/local-beta-note-reflection.tsx");
  const persistence = getSource("lib/review-os/capture-save-persistence.ts");
  const todayPage = getSource("app/app/page.tsx");
  const notesPage = getSource("app/app/notes/page.tsx");
  const itemsPage = getSource("app/app/items/page.tsx");
  const reviewPage = getSource("app/app/review/page.tsx");
  const notificationPayload = getSource("lib/notifications/push-payload.ts");
  const notificationCron = getSource("app/api/cron/notifications/route.ts");
  const notificationMigration = getSource("supabase/migrations/20260622_mobile_pwa_web_push_reminder.sql");

  const goldenFlowSource = `${capturePage}\n${captureForm}\n${localReflection}\n${todayPage}\n${notesPage}\n${reviewPage}`;
  check(has(goldenFlowSource, "오늘 한 것 올리기"), "golden flow must keep warm capture CTA copy", failures);
  check(has(goldenFlowSource, "Notes"), "golden flow must mention Notes", failures);
  check(has(goldenFlowSource, "Review"), "golden flow must mention Review", failures);
  check(has(goldenFlowSource, "Today"), "golden flow must mention Today", failures);
  check(/브라우저\s*임시/.test(goldenFlowSource), "golden flow must identify browser-local temporary fallback records", failures);
  check(/다음\s*행동/.test(goldenFlowSource), "golden flow must end reflection in a next action", failures);

  check(has(captureForm, 'fetch("/api/os/items"'), "capture save must still attempt durable server persistence", failures);
  check(has(captureForm, "saveReviewOsLocalBetaNoteWithStatus"), "capture save must keep browser-local fallback path", failures);
  check(has(persistence, "durable_saved"), "persistence model must include durable_saved", failures);
  check(has(persistence, "local_fallback_saved"), "persistence model must include local_fallback_saved", failures);
  check(has(persistence, "save_failed"), "persistence model must include save_failed", failures);
  check(/durable_saved[\s\S]*저장되었습니다/.test(persistence), "durable save copy must keep clean saved confirmation", failures);
  check(/local_fallback_saved[\s\S]*브라우저[\s\S]*임시/.test(persistence), "fallback save copy must clearly say browser-local temporary", failures);

  check(has(localStorage, "metadataOnly: true"), "local beta note storage must remain metadataOnly", failures);
  check(has(localStorage, 'safeUse: "closed_beta_local_note"'), "local beta note storage must keep closed_beta_local_note safeUse", failures);
  check(has(localReflection, '"use client";'), "local beta reflection must remain client-only", failures);
  check(has(localReflection, "useEffect"), "local beta reflection must load localStorage from client effects", failures);
  check(has(localReflection, "window.setTimeout"), "local beta reflection must settle after hydration", failures);
  check(has(localReflection, "닫힌 베타 브라우저 임시 기록"), "local beta reflection cards must disclose browser-local temporary records", failures);
  check(has(notesPage, "renderReviewOsItemsPage"), "Notes must render the shared notes page", failures);
  check(has(itemsPage, "LocalBetaNotesSection"), "Notes must include local beta reflection surface through the shared items route", failures);
  check(has(reviewPage, "LocalBetaReviewCandidateSection"), "Review must include local beta reflection surface", failures);
  check(has(todayPage, "LocalBetaTodayReflection"), "Today must include local beta reflection surface", failures);
  check(!/(raw\s*OCR|rawOcrText|rawAnswerText|official\s+corpus|global\s+corpus|공식\s*원문|원문\s*저장)/i.test(`${localStorage}\n${localReflection}`), "local beta browser fallback must not store or expose raw official/OCR corpus text", failures);

  for (const file of m418RequiredFiles) {
    check(existsSync(file), `M418 required file must exist: ${file}`, failures);
  }
  check(has(getSource("app/app/settings/page.tsx"), "/app/settings/notifications?mode="), "M418 Settings surface must link to notification settings as a secondary action", failures);
  check(has(notificationPayload, "NOTIFICATION_ALLOWED_KEYS"), "M418 notification payload must use an exact allowlist", failures);
  check(has(notificationPayload, "NOTIFICATION_ALLOWED_URLS"), "M418 notification payload must restrict click URLs", failures);
  check(has(notificationCron, "CRON_SECRET"), "M418 cron route must require CRON_SECRET", failures);
  check(has(notificationCron, "delivery_key"), "M418 cron route must use delivery-key dedupe", failures);
  check(has(notificationMigration, "enable row level security"), "M418 notification tables must enable RLS", failures);
  check(!/raw_ocr|problem_text|question_text|answer_text|official_answer|formula|casio|score|pass_fail/i.test(notificationMigration), "M418 notification persistence must not add raw learner content columns", failures);

  for (const file of learnerRuntimeFiles) {
    const source = learnerVisibleSource(file, getSource(file));
    for (const { label, pattern } of prohibitedLearnerCopyPatterns) {
      check(!pattern.test(source), `${file} must not contain prohibited learner copy: ${label}`, failures);
    }
  }

  let trackedFiles = [];
  try {
    trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((file) => file.replace(/\\/g, "/"))
      .filter(Boolean)
      .filter((file) => !/^(?:node_modules|\.next|coverage|test-results)\//.test(file));
  } catch (error) {
    failures.push(`could not list tracked files for official-material boundary: ${error.message}`);
  }

  for (const file of trackedFiles) {
    for (const { label, pattern } of unsafeTrackedOfficialMaterialPathPatterns) {
      check(!pattern.test(file), `tracked file violates official-material boundary (${label}): ${file}`, failures);
    }
  }

  if (failures.length > 0) {
    console.error("\n[closed-beta-readiness] Static gate failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("[closed-beta-readiness] Static gate passed: golden routes, capture aliases, learner copy guardrails, local beta metadata safety, persistence status copy, and official-material boundaries.");
}

function npmStep(label, scriptName) {
  return {
    label,
    command: process.platform === "win32" ? "cmd.exe" : "npm",
    args: process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", "run", scriptName] : ["run", scriptName],
  };
}

runStaticReadinessGate();

const steps = [
  npmStep("official-source verification", "check:official-source-verification"),
  npmStep("M418 mobile PWA Web Push reminder checks", "check:mobile-pwa-web-push-reminder"),
  npmStep("learner-loop verification (includes guardrail audit)", "verify:learner-loop:ci"),
  {
    label: "data-boundary tests",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/data-boundary-hardening.test.mjs"],
  },
  {
    label: "question-reference tests",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/question-reference-db.test.mjs"],
  },

  npmStep("staging learner route checks", "check:staging-learner-routes"),
  {
    label: "route/source guard checks",
    command: nodeCommand,
    args: [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      "--test",
      "tests/closed-beta-learner-loop-smoke.test.mjs",
      "tests/closed-beta-final-pass.test.mjs",
    ],
  },
  npmStep("build", "build"),
];

for (const step of steps) {
  console.log(`\n[closed-beta-readiness] ${step.label}`);
  const result = spawnSync(step.command, step.args, { stdio: "inherit", shell: false, env: process.env });
  if (result.error) {
    console.error(`[closed-beta-readiness] ERROR in ${step.label}:`, result.error);
    process.exitCode = 1;
    break;
  }
  if (result.status !== 0) {
    console.error(`[closed-beta-readiness] FAIL: ${step.label}`);
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) {
  console.log("\n[closed-beta-readiness] PASS: official-source verification, closed beta learner loop, guardrail audit, data boundary, route/source guards, question references, and build passed.");
}
