import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const page = read("app/app/page.tsx");
const todayAlias = read("app/app/today/page.tsx");

test("S232D.5 gives Today one labelled V3-language primary mission", () => {
  assert.match(page, /data-s232d5-today-page="single-priority"/);
  assert.match(page, /<section[\s\S]*?aria-labelledby="s232d5-today-title"[\s\S]*?data-s232d5-today-primary/);
  assert.match(page, /<header data-s232d5-today-meta>/);
  assert.match(page, /오늘 할 일 · 오늘의 1개/);
  assert.match(
    page,
    /<h1 id="s232d5-today-title" className="v3-type-screen[^\"]*">[\s\S]*?\{missionTitle\}[\s\S]*?<\/h1>/,
  );
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((page.match(/data-s232d5-today-primary-cta\b/g) ?? []).length, 1);
  assert.match(page, /data-s232d5-today-primary-cta[\s\S]*?\{missionPrimaryLabel\}/);
});

test("S232D.5 expresses Today context as reason, duration, continuation, then CTA", () => {
  const primaryStart = page.indexOf("data-s232d5-today-primary");
  const secondaryStart = page.indexOf("data-s232d5-today-secondary", primaryStart);
  assert.ok(primaryStart >= 0, "missing S232D.5 primary Today surface");
  assert.ok(secondaryStart > primaryStart, "missing S232D.5 secondary boundary");

  const primary = page.slice(primaryStart, secondaryStart);
  assert.match(primary, /<dl[^>]*data-s232d5-today-context>/);
  assert.equal((primary.match(/<dt\b/g) ?? []).length, 3);
  assert.equal((primary.match(/<dd\b/g) ?? []).length, 3);
  const order = [
    "data-s232d5-today-reason",
    "data-s232d5-today-duration",
    "data-s232d5-today-continuation",
    "data-s232d5-today-primary-cta",
  ].map((needle) => primary.indexOf(needle));
  assert.ok(order.every((index) => index >= 0), `missing Today hierarchy marker: ${order.join(",")}`);
  assert.deepEqual(order, [...order].sort((left, right) => left - right));
  assert.match(primary, /왜 이걸 하나요/);
  assert.match(primary, /예상 시간/);
  assert.match(primary, /끝나면 이어질 것/);
  assert.match(primary, /\{missionWhy\}/);
  assert.match(primary, /\{missionMinutes\}/);
  assert.match(primary, /\{missionAfter\}/);
  assert.match(primary, /href=\{heroPrimaryHref\}/);
});

test("S232D.5 preserves Today selection, max-three, task, and compatibility-route behavior", () => {
  assert.match(page, /buildLearnerTodayPlanTasksWithGatedDurableConceptGraph\s*\(/);
  assert.match(page, /selectActiveTodayPlanTasks\s*\(/);
  assert.match(page, /TODAY_PLAN_MAX_PRIMARY_TASKS/);
  assert.match(page, /const visibleTodayPlanTasks = todayPlanTasks/);
  assert.match(page, /visibleTodayPlanTasks\.map\(\(task, index\)/);
  assert.match(page, /data-today-plan-primary-task data-s232d5-today-task/);
  assert.match(page, /<details[\s\S]*?data-s232d5-today-secondary/);
  assert.doesNotMatch(page, /<details[^>]*\sopen(?:=|\s|>)/);
  assert.doesNotMatch(page, /todayPlanTasks\.(?:sort|toSorted)\(/);

  for (const preserved of [
    "LocalBetaTodayReflection",
    "TodaySubjectSelector",
    "ReviewOsFeedbackButton",
    "getSimilarQuestionReferenceCandidates",
  ]) {
    assert.match(page, new RegExp(preserved));
  }

  assert.match(todayAlias, /mode === "second"[\s\S]*?redirect\("\/app\?mode=second"\)/);
  assert.match(todayAlias, /mode === "first"[\s\S]*?redirect\("\/app\?mode=first"\)/);
  assert.match(todayAlias, /redirect\("\/app"\)/);
});

test("S232D.5 does not invent unsupported V3 component or authority contracts", () => {
  assert.doesNotMatch(page, /\bBiggestGap\b|\bStateChip\b|\bEvidenceExcerpt\b/);
  assert.doesNotMatch(page, /\bOfficial\b|\bConfirmed\b/);
});

test("S232D.5 runtime gate is exact-head, same-document, action-safe, and scalar-only", () => {
  const spec = read("tests/e2e/s232d5-today-primary-ia.spec.ts");
  const workflow = read(".github/workflows/s232d5-runtime.yml");
  const doc = read("docs/qa/s232d5-today-primary-ia.md");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  for (const marker of [
    "data-s232d5-today-page",
    "data-s232d5-today-primary",
    "data-s232d5-today-meta",
    "data-s232d5-today-context",
    "data-s232d5-today-reason",
    "data-s232d5-today-duration",
    "data-s232d5-today-continuation",
    "data-s232d5-today-primary-cta",
    "data-s232d5-today-secondary",
    "data-s232d5-today-task",
  ]) {
    assert.match(spec, new RegExp(marker));
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232D\.5"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /setViewportSize\(\{ width: viewports\[0\]\.width/);
  assert.doesNotMatch(spec, /page\.goto\(/);
  assert.match(spec, /request\.isNavigationRequest\(\)/);
  assert.match(spec, /request\.resourceType\(\) === "document"/);
  assert.match(spec, /__s232d5TodayDocumentIdentity/);
  assert.match(spec, /resizedSameDocumentVerified =/);
  assert.match(spec, /mainFrameDocumentNavigationRequestCount/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /element === document\.activeElement/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /!readOnlyMethods\.has\(request\.method\(\)\)/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.match(spec, /learnerActionMutationRequestCount/);
  assert.match(spec, /readBrowserStorageDigest/);
  assert.match(spec, /readAnalyticsLengths/);
  assert.match(spec, /new AxeBuilder/);
  assert.doesNotMatch(spec, /primaryCta\.(?:click|press)\(/);

  for (const privacyFlag of [
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "questionTextCaptured",
    "taskTitleCaptured",
    "subjectCaptured",
    "urlCaptured",
    "emailCaptured",
    "domCaptured",
    "screenshotCaptured",
    "traceCaptured",
    "videoCaptured",
  ]) {
    assert.match(spec, new RegExp(`${privacyFlag}: false`));
  }
  assert.match(spec, /globalDatabaseImmutabilityClaimed: false/);

  assert.match(workflow, /agent\/s232d5-today-ia/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232d5-today-primary-ia\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232D\.5 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232d5-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /390px[\s\S]*768px[\s\S]*1440px/i);
});
