import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const page = read("app/app/review/page.tsx");
const client = read("components/review-os/review-queue-client.tsx");

test("S232D.4 gives Review one semantic page heading and one primary work surface", () => {
  assert.match(page, /data-s232d4-review-page="priority-first"/);
  assert.match(page, /data-s232d4-review-header/);
  assert.match(page, /<h1[\s\S]*?>[\s\S]*?복습[\s\S]*?<\/h1>/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /data-s232d4-review-queue-container/);
  assert.equal((client.match(/data-s232d4-review-primary\b/g) ?? []).length, 1);
  assert.equal((client.match(/data-review-primary-surface\b/g) ?? []).length, 1);
  assert.ok(page.indexOf("data-s232d4-review-header") < page.indexOf("data-s232d4-review-queue-container"));
});

test("S232D.4 orders the primary Review task from context to retrieval", () => {
  const primaryStart = client.indexOf("data-s232d4-review-primary");
  const secondaryStart = client.indexOf("data-s232d4-review-secondary-list", primaryStart);
  assert.ok(primaryStart >= 0, "missing S232D.4 primary Review surface");
  assert.ok(secondaryStart > primaryStart, "missing S232D.4 secondary-list boundary");

  const primary = client.slice(primaryStart, secondaryStart);
  const order = [
    "data-s232d4-review-meta",
    "data-s232d4-review-reason",
    "data-s232d4-review-next-action",
    "data-s232d4-review-recall",
  ].map((needle) => primary.indexOf(needle));
  assert.ok(order.every((index) => index >= 0), `missing Review hierarchy marker: ${order.join(",")}`);
  assert.deepEqual(order, [...order].sort((left, right) => left - right));

  for (const marker of [
    "data-s232d4-confirm-action",
    "data-s232d4-review-check",
    "data-s232d4-review-self-rating",
    "data-s232d4-review-completion",
  ]) {
    assert.match(primary, new RegExp(marker));
  }
  assert.match(primary, /복습 이유/);
  assert.match(primary, /다음 행동/);
  assert.match(primary, /복습 근거 보기/);
  assert.doesNotMatch(primary, /왜 여기 있나|상세 신호 보기|이번 PR에서는/);
});

test("S232D.4 keeps Review queue and completion behavior unchanged", () => {
  assert.match(page, /reviewOsService\.getReviewQueue\(session\.userId, session\.email\)/);
  assert.match(page, /\.filter\(\s*\(item\) => item\.examName === config\.label/);
  assert.match(client, /const primaryItem = items\[0\]!/);
  assert.match(client, /const candidateItems = items\.slice\(1\)/);
  assert.match(client, /const visibleCandidateItems = candidateItems\.slice\(0, 3\)/);
  assert.doesNotMatch(client, /items\.(?:sort|toSorted)\(/);
  assert.match(client, /fetch\(`\/api\/os\/review-queue\/\$\{queueId\}\/complete`/);
  assert.match(client, /method: "POST"/);
  assert.match(client, /body: JSON\.stringify\(\{ action: selectedAction, metadata \}\)/);
  assert.match(client, /router\.refresh\(\)/);
  assert.match(client, /setRecallAttemptTextByQueueId/);
  assert.match(client, /setRevealedHintByQueueId/);
  assert.match(client, /setRecallOutcomeByQueueId/);
  assert.match(client, /disabled=\{pendingId === primaryItem\.queueId \|\| !primaryOutcome\}/);
});

test("S232D.4 does not invent unsupported V3 or authority semantics", () => {
  const scoped = `${page}\n${client}`;
  assert.doesNotMatch(scoped, /\bBiggestGap\b|\bStateChip\b|\bEvidenceExcerpt\b/);
  assert.doesNotMatch(scoped, /\bOfficial\b|\bConfirmed\b/);
});

test("S232D.4 runtime gate is exact-head, non-completing, responsive, and metadata-only", () => {
  const spec = read("tests/e2e/s232d4-review-ia.spec.ts");
  const workflow = read(".github/workflows/s232d4-runtime.yml");
  const doc = read("docs/qa/s232d4-review-ia.md");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  for (const marker of [
    "data-s232d4-review-page",
    "data-s232d4-review-header",
    "data-s232d4-review-queue-container",
    "data-s232d4-review-queue",
    "data-s232d4-review-primary",
    "data-s232d4-review-meta",
    "data-s232d4-review-reason",
    "data-s232d4-review-next-action",
    "data-s232d4-review-recall",
    "data-s232d4-confirm-action",
    "data-s232d4-review-check",
    "data-s232d4-review-self-rating",
    "data-s232d4-review-completion",
  ]) {
    assert.match(spec, new RegExp(marker));
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232D\.4"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /element === document\.activeElement/);
  assert.match(spec, /completionPostCount/);
  assert.match(spec, /expect\(completionPostCount[\s\S]*?\)\.toBe\(0\)/);
  assert.doesNotMatch(spec, /completion(?:Button)?\.click\(/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /rawLearnerContentCaptured: false/);
  assert.match(spec, /questionTextCaptured: false/);
  assert.match(spec, /titleCaptured: false/);
  assert.match(spec, /urlCaptured: false/);
  assert.match(spec, /emailCaptured: false/);
  assert.match(spec, /credentialsCaptured: false/);
  assert.match(spec, /domCaptured: false/);
  assert.match(spec, /screenshotCaptured: false/);
  assert.match(workflow, /agent\/s232d4-review-ia/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232d4-review-ia\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232D\.4 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232d4-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);
  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /never clicks?[^\n]*복습 완료/i);
});
