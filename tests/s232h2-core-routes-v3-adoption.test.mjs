import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const today = read("app/app/page.tsx");
const selector = read("components/review-os/today-first-subject-selector.tsx");
const reflection = read("components/review-os/local-beta-note-reflection.tsx");
const reviewPage = read("app/app/review/page.tsx");
const reviewQueue = read("components/review-os/review-queue-client.tsx");
const notes = read("app/app/items/page.tsx");
const agendaPage = read("app/app/agenda/page.tsx");
const agenda = read("components/review-os/learning-agenda-client.tsx");
const weekly = read("app/app/weekly/page.tsx");

test("S232H.2 adopts the merged V3 route grammar on second-round core routes", () => {
  assert.match(today, /mode === "second"[\s\S]*?<V3RouteFrame width="content">/);
  assert.match(today, /<TodayActionLink[\s\S]*?data-s232d5-today-primary-cta/);
  assert.match(selector, /if \(mode === "second"\)[\s\S]*?<V3Surface[\s\S]*?<V3ActionLink[\s\S]*?<V3QuietDisclosure/);
  assert.match(reflection, /if \(mode === "second"\)[\s\S]*?<V3Surface/);
  assert.match(reviewPage, /mode === "second"[\s\S]*?<V3RouteHeader[\s\S]*?<V3RouteFrame/);
  assert.match(reviewQueue, /mode === "second"[\s\S]*?<V3ActionButton/);
  assert.match(notes, /const RecordsSurface = isSecondRound \? V3Surface : Card/);
  assert.match(notes, /<V3RouteFrame width="reading">/);
  assert.match(agendaPage, /data-v3-route=\{mode === "second" \? "learning-agenda" : undefined\}/);
  assert.match(agenda, /mode === "second"[\s\S]*?<V3RouteHeader/);
  assert.match(agenda, /<V3RouteFrame width="content">/);
  assert.match(weekly, /if \(mode === "second"\)[\s\S]*?<V3RouteFrame width="reading"[\s\S]*?<V3Surface/);
});

test("S232H.2 keeps one-column tablet reflow and 44px-or-larger controls", () => {
  assert.match(today, /mode === "second" \? "space-y-4" : "grid gap-5 lg:grid-cols/);
  assert.match(today, /divide-y divide-\[var\(--color-border-default\)\]/);
  assert.match(selector, /className="mt-4 grid gap-2 lg:grid-cols-3"/);
  assert.match(selector, /min-h-11/);
  assert.match(reviewQueue, /mode === "second" \? "mt-3 grid gap-2 lg:grid-cols-4"/);
  assert.match(reviewQueue, /min-h-11/);
  assert.match(agenda, /lg:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
  assert.match(weekly, /divide-y divide-\[var\(--color-border-default\)\]/);
});

test("S232H.2 preserves Today ranking and the maximum-three work boundary", () => {
  assert.match(today, /selectActiveTodayPlanTasks\([\s\S]*?TODAY_PLAN_MAX_PRIMARY_TASKS/);
  assert.match(today, /const visibleTodayPlanTasks = todayPlanTasks/);
  assert.match(today, /const heroTodayPlanTasks = todayPlanTasks\.slice\(0, TODAY_PLAN_MAX_PRIMARY_TASKS\)/);
  assert.match(today, /data-visible-primary-task-cap=\{TODAY_PLAN_MAX_PRIMARY_TASKS\}/);
  assert.doesNotMatch(today, /todayPlanTasks\.(?:sort|toSorted)\(/);
});

test("S232H.2 preserves Review queue order, local state, and completion mutation", () => {
  assert.match(reviewQueue, /const primaryItem = items\[0\]!/);
  assert.match(reviewQueue, /const candidateItems = items\.slice\(1\)/);
  assert.match(reviewQueue, /const visibleCandidateItems = candidateItems\.slice\(0, 3\)/);
  assert.doesNotMatch(reviewQueue, /items\.(?:sort|toSorted)\(/);
  assert.match(reviewQueue, /fetch\(`\/api\/os\/review-queue\/\$\{queueId\}\/complete`/);
  assert.match(reviewQueue, /body: JSON\.stringify\(\{ action: selectedAction, metadata \}\)/);
  assert.match(reviewQueue, /router\.refresh\(\)/);
  assert.match(reviewQueue, /disabled=\{pendingId === primaryItem\.queueId \|\| !primaryOutcome\}/);
});

test("S232H.2 keeps Review reveal and self-rating on one second-round primary action", () => {
  assert.match(reviewQueue, /!hasRevealedHint \? \([\s\S]*?data-s232d4-confirm-action[\s\S]*?: mode === "second" \? \(/);
  assert.match(reviewQueue, /tone=\{mode === "second" \? "secondary"/);
  assert.match(reviewQueue, /data-v3-selected=\{mode === "second" && primaryOutcome === option\.value \? "true" : undefined\}/);
  assert.match(reviewQueue, /data-review-interval-suggestion[\s\S]*?data-v3-state=\{mode === "second" \? "interval-suggestion"/);
  assert.match(reviewQueue, /color-border-attention[\s\S]*?color-background-attention/);
  assert.match(reviewQueue, /data-s232d4-review-completion/);
});

test("S232H.2 preserves recent-three Notes, BiggestGap, and folded history", () => {
  assert.match(notes, /const visibleItems = isNotesRoute \? items\.slice\(0, 3\) : items/);
  assert.match(notes, /const foldedItems = isNotesRoute \? items\.slice\(3\) : \[\]/);
  assert.match(notes, /<BiggestGap/);
  assert.match(notes, /이전 학습 노트 \{foldedItems\.length\}개 보기/);
  assert.match(notes, /href=\{`\/app\/items\/\$\{item\.id\}\?mode=\$\{mode\}`\}/);
  assert.doesNotMatch(notes, /items\.(?:sort|toSorted)\(/);
});

test("S232H.2 preserves Agenda local storage, offline truth, and timeline order", () => {
  for (const contract of [
    "listReviewOsLocalBetaNotesWithStatus",
    "buildLocalBetaLearningAgendaEvents",
    "mergeLearningAgendaEvents",
    "useSyncExternalStore",
    "navigator.onLine",
    "data-s230-next-review",
    "data-s230-primary-timeline",
  ]) {
    assert.match(agenda, new RegExp(contract.replaceAll(".", "\\.")));
  }
  assert.ok(agenda.indexOf("data-s230-next-review") < agenda.indexOf("data-s230-primary-timeline"));
  assert.match(agenda, /data-s230-state=\{routeState\}/);
  assert.match(agenda, /data-s232f4b-agenda-local-read=\{localRead\.status\}/);
});

test("S232H.2 renders Agenda dynamic states with V3 utilities while retaining first-round legacy branches", () => {
  assert.match(agenda, /mode === "second" \? \([\s\S]*?<V3Surface as="section" tone="attention"/);
  assert.match(agenda, /data-v3-state=\{mode === "second" \? "disabled"/);
  assert.match(agenda, /data-v3-state=\{mode === "second" \? "completed"/);
  assert.match(agenda, /data-v3-state=\{mode === "second" \? "empty"/);
  assert.match(agenda, /data-s230-dense-timeline-disclosure[\s\S]*?<V3QuietDisclosure/);
  assert.match(agenda, /data-s230-secondary-history[\s\S]*?<V3QuietDisclosure/);
  assert.match(agenda, /border-\[var\(--status-green\)\]/);
  assert.match(agenda, /<details className="mt-4 rounded-\[var\(--radius-md\)\]/);
});

test("S232H.2 preserves Weekly max-three, recovery, and degraded-read truth", () => {
  assert.match(weekly, /const visibleTasks = plan\.tasks\.slice\(0, 3\)/);
  assert.match(weekly, /const primaryTask = plan\.recovery\?\.task \?\? plan\.tasks\[0\] \?\? null/);
  assert.match(weekly, /countDegradedCoreRouteReads\(\[/);
  assert.match(weekly, /<CoreRouteReadDegradedNotice count=\{degradedReadCount\} \/>/);
  assert.match(weekly, /if \(plan\.tasks\.length === 0\)/);
  assert.match(weekly, /plan\.recovery \? "attention" : "focus"/);
  assert.match(weekly, /이번 주 작업은 최대 3개만 먼저 제시합니다/);
});

test("S232H.2 keeps V3 adoption presentation-only", () => {
  const scoped = [today, selector, reflection, reviewPage, reviewQueue, notes, agendaPage, agenda, weekly].join("\n");
  assert.doesNotMatch(scoped, /공식\s*채점|점수\s*예측|합격\s*(?:확률|보장)|streak|leaderboard/i);
  assert.doesNotMatch(scoped, /SUPABASE_SERVICE_ROLE_KEY|service_role|\/instructor\/second-grading/);
  assert.doesNotMatch(scoped, /data-s232g|unexpected-request-failures|PR #624|#624/);
});
