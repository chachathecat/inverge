import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const itemsPage = read("app/app/items/page.tsx");
const learnerShell = read("components/learner/learner-ui.tsx");
const todayPage = read("app/app/page.tsx");
const trustStatus = read("components/review-os/trust-status-card.tsx");
const recentCardsStart = itemsPage.indexOf("{visibleItems.map((item)");
const notesBranchStart = itemsPage.indexOf("if (isNotesRoute)", recentCardsStart);
const legacyCardsStart = itemsPage.indexOf("<section key={item.id} className=", notesBranchStart);
const recentCardsEnd = itemsPage.indexOf("{foldedItems.length > 0", legacyCardsStart);
const notesBranch = itemsPage.slice(notesBranchStart, legacyCardsStart);
const legacyCards = itemsPage.slice(legacyCardsStart, recentCardsEnd);

test("S232D.3 keeps the Notes list recent-first without changing persisted order", () => {
  assert.match(itemsPage, /data-s232d3-notes-list=\{isNotesRoute \? "recent-first" : undefined\}/);
  assert.match(itemsPage, /const visibleItems = isNotesRoute \? items\.slice\(0, 3\) : items/);
  assert.match(itemsPage, /const foldedItems = isNotesRoute \? items\.slice\(3\) : \[\]/);
  assert.match(itemsPage, /data-s224v-visible-primary-work-items-max=\{isNotesRoute \? 3 : 8\}/);
  assert.doesNotMatch(itemsPage, /items\.(?:sort|toSorted)\(/);
});

test("S232D.3 gives every recent Note card one canonical information hierarchy", () => {
  assert.ok(recentCardsStart >= 0, "missing recent Notes card map");
  assert.ok(notesBranchStart > recentCardsStart, "missing Notes-only branch");
  assert.ok(legacyCardsStart > notesBranchStart, "missing legacy /app/items branch boundary");
  assert.ok(recentCardsEnd > legacyCardsStart, "missing recent card-map boundary");

  const order = [
    "data-s232d3-note-meta",
    "<BiggestGap",
    "data-s232d3-next-action",
    "data-s232d3-detail-link",
    "data-s232d3-secondary-connections",
  ].map((needle) => notesBranch.indexOf(needle));
  assert.ok(order.every((index) => index >= 0), `missing Notes hierarchy marker: ${order.join(",")}`);
  assert.deepEqual(order, [...order].sort((left, right) => left - right));

  assert.match(notesBranch, /data-s232d3-note-card/);
  assert.match(notesBranch, /<BiggestGap[\s\S]*density="Compact"/);
  assert.match(notesBranch, /headingId=\{`notes-biggest-gap-\$\{item\.id\}`\}/);
  assert.equal((notesBranch.match(/<BiggestGap/g) ?? []).length, 1);
  assert.equal((notesBranch.match(/data-s232d3-next-action/g) ?? []).length, 1);
  assert.equal((notesBranch.match(/data-s232d3-detail-link/g) ?? []).length, 1);
  assert.match(notesBranch, /aria-label=\{`노트 자세히 보기: \$\{title\}`\}/);
  assert.match(notesBranch, /break-words text-sm/);
});

test("S232D.3 fails closed instead of inventing a review-queue state", () => {
  assert.doesNotMatch(notesBranch, /복습 연결:\s*복습 예정/);
  assert.doesNotMatch(notesBranch, /<StateChip|data-v3-component="StateChip"/);
  assert.match(notesBranch, /복습에 남길 내용/);
  assert.match(legacyCards, /복습 연결:\s*복습 예정/);
  assert.doesNotMatch(legacyCards, /data-s232d3-/);
});

test("S232D.3 uses the canonical 학습 노트 term on connected learner surfaces", () => {
  for (const [name, source] of [
    ["learner shell", learnerShell],
    ["Today", todayPage],
    ["trust continuation", trustStatus],
  ]) {
    assert.match(source, /학습 노트/, `${name} must use the canonical term`);
    assert.doesNotMatch(source, /교정 노트/, `${name} retains the deprecated term`);
  }
  assert.match(learnerShell, /mobileLabel: "학습 노트"/);
});

test("S232D.3 runtime gate is exact-head, responsive, and metadata-only", () => {
  const spec = read("tests/e2e/s232d3-notes-list-ia.spec.ts");
  const workflow = read(".github/workflows/s232d3-runtime.yml");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232D\.3"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /data-s232d3-notes-list/);
  assert.match(spec, /data-s232d3-note-card/);
  assert.match(spec, /data-s232d3-note-meta/);
  assert.match(spec, /data-s232d3-next-action/);
  assert.match(spec, /data-s232d3-detail-link/);
  assert.match(spec, /data-s232d3-secondary-connections/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /element === document\.activeElement/);
  assert.match(spec, /rawLearnerContentCaptured: false/);
  assert.match(spec, /screenshotCaptured: false/);
  assert.match(workflow, /agent\/s232d3-notes-ia/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232d3-notes-list-ia\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232D\.3 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232d3-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);
});
