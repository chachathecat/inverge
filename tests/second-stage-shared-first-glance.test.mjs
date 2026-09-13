import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const sharedRoutePaths = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/session/page.tsx",
  "app/app/weekly/page.tsx",
  "app/app/items/page.tsx",
  "app/app/review/page.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/learning-agenda-client.tsx",
  "components/review-os/review-queue-client.tsx",
];
const sharedRoutes = new Map(sharedRoutePaths.map((relativePath) => [relativePath, read(relativePath)]));

test("shared second-stage routes consume the canonical learner-language contract", () => {
  for (const [relativePath, source] of sharedRoutes) {
    assert.match(
      source,
      /@\/lib\/review-os\/learner-language/,
      `${relativePath} must consume the canonical learner language`,
    );
  }

  assert.match(sharedRoutes.get("app/app/page.tsx"), /REVIEW_OS_LEARNER_LANGUAGE\.primaryTask/);
  assert.match(sharedRoutes.get("app/app/weekly/page.tsx"), /REVIEW_OS_LEARNER_LANGUAGE\.reviewQueue/);
  assert.match(sharedRoutes.get("app/app/items/page.tsx"), /REVIEW_OS_LEARNER_LANGUAGE\.studyLedger/);
  assert.match(sharedRoutes.get("app/app/review/page.tsx"), /title=\{REVIEW_OS_LEARNER_LANGUAGE\.reviewQueue\}/);
  assert.match(sharedRoutes.get("components/review-os/learning-agenda-client.tsx"), /eyebrow=\{REVIEW_OS_LEARNER_LANGUAGE\.studyLedger\}/);
  assert.match(sharedRoutes.get("components/review-os/review-queue-client.tsx"), /REVIEW_OS_LEARNER_LANGUAGE\.primaryTask/);
});

test("second-stage Capture and saved handoff use Korean visible and accessible labels", () => {
  const capturePage = sharedRoutes.get("app/app/capture/page.tsx");
  const captureForm = sharedRoutes.get("components/review-os/capture-form.tsx");
  const sessionPage = sharedRoutes.get("app/app/session/page.tsx");

  assert.match(capturePage, /mode === "second" \? `\$\{REVIEW_OS_LEARNER_LANGUAGE\.today\} 기록 · 4단계`/);
  assert.match(captureForm, /mode === "second" \? "오늘 기록 4단계 흐름" : "Capture 4단계 흐름"/);
  assert.match(captureForm, /mode === "second" \? "오늘 기록 진행" : "Capture 진행"/);
  assert.match(captureForm, /"2차 답안 기록"/);
  assert.match(captureForm, /REVIEW_OS_LEARNER_LANGUAGE\.biggestGap/);
  assert.match(captureForm, /REVIEW_OS_LEARNER_LANGUAGE\.d1/);
  assert.match(captureForm, /label=\{REVIEW_OS_LEARNER_LANGUAGE\.biggestGap\}/);
  const savedPanelStart = sessionPage.indexOf("const savedCapturePanel = savedCaptureDetail ? (");
  const secondPanelStart = sessionPage.indexOf('mode === "second" ? (', savedPanelStart);
  const firstPanelStart = sessionPage.indexOf(") : (", secondPanelStart);
  const secondPanel = sessionPage.slice(secondPanelStart, firstPanelStart);
  assert.ok(savedPanelStart >= 0 && secondPanelStart >= savedPanelStart && firstPanelStart > secondPanelStart);
  assert.doesNotMatch(secondPanel, /Capture → Today|가장 큰 간극/);
  assert.match(sessionPage.slice(firstPanelStart), /가장 큰 간극/);
  assert.match(sessionPage, /저장 → \$\{REVIEW_OS_LEARNER_LANGUAGE\.todayPlan\}/);
  assert.match(sessionPage, /label=\{REVIEW_OS_LEARNER_LANGUAGE\.biggestGap\}/);
});

test("second-stage BiggestGap cards override the legacy heading without changing its default", () => {
  const ledgerUi = read("components/learner/study-ledger-ui.tsx");
  const todaySession = read("components/review-os/today-session-runner.tsx");
  const itemDetail = read("app/app/items/[itemId]/page.tsx");

  assert.match(ledgerUi, /const normalizedLabel = label\?\.trim\(\) \|\| presentation\.label/);
  assert.match(todaySession, /label=\{REVIEW_OS_LEARNER_LANGUAGE\.biggestGap\}/);
  assert.match(itemDetail, /biggestGapLabel=\{REVIEW_OS_LEARNER_LANGUAGE\.biggestGap\}/);
});

test("Today keeps one action with what, why, minutes and continuation before secondary work", () => {
  const today = sharedRoutes.get("app/app/page.tsx");
  const primaryStart = today.indexOf("data-s232d5-today-primary");
  const secondaryStart = today.indexOf("data-s232d5-today-secondary", primaryStart);

  assert.ok(primaryStart >= 0);
  assert.ok(secondaryStart > primaryStart);
  for (const marker of [
    "id=\"s232d5-today-title\"",
    "data-s232d5-today-reason",
    "data-s232d5-today-duration",
    "data-s232d5-today-continuation",
    "data-s232d5-today-primary-cta",
  ]) assert.match(today, new RegExp(marker));
  assert.match(today, /data-s224v-primary-cta-count-above-fold="1"/);
  assert.match(today, /REVIEW_OS_LEARNER_LANGUAGE\.todayPlan/);
});

test("existing authenticated runtime gate covers responsive and accessible Capture behavior", () => {
  const spec = read("tests/e2e/s232e1-capture-outer-flow.spec.ts");
  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing ${width}px runtime coverage`);
  }
  assert.match(spec, /오늘 기록 4단계 흐름/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /mainFrameDocumentNavigationRequestCount/);
});

test("S2 remains presentation-only and preserves later hard gates", () => {
  const plan = read("docs/exec-plans/active/inverge-owner-study-os.md");
  const issueSection = plan.slice(plan.indexOf("## Active post-#928 Goal"), plan.indexOf("## Active post-#926 Goal"));
  assert.match(issueSection, /#928 integrated -> #929 shared-route Korean first glance/);
  assert.match(issueSection, /no S3 Production activation or S4 corpus\/runtime expansion/);
  assert.match(issueSection, /S4 remains blocked[\s\S]*S3 is separately approved and terminally completed/);
  assert.match(issueSection, /Do not treat this[\s\S]*as Goal completion/);

  const sources = [...sharedRoutes.values()].join("\n");
  assert.doesNotMatch(sources, /완전 정복|합격 확정|합격 보장|공식 채점 결과/);
});
