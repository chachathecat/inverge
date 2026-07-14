import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildLearningRecordTimelineModel,
  buildLocalBetaLearningAgendaEvents,
} from "../lib/review-os/learning-agenda.ts";

const read = (path) => readFileSync(path, "utf8");

function event(id, type, date, extra = {}) {
  return { id, type, title: `합성 ${type}`, date, ...extra };
}

test("S230 builds sparse and dense editorial timelines without changing event payloads", () => {
  const now = new Date("2026-07-15T12:00:00+09:00");
  const sparse = buildLearningRecordTimelineModel([
    event("history", "note_created", "2026-07-10T09:00:00+09:00", { noteId: "item-history", subject: "감정평가이론" }),
    event("today", "today_task_completed", "2026-07-14T10:00:00+09:00", { todayTaskId: "task-today" }),
    event("next", "review_due", "2026-07-16T09:00:00+09:00", { reviewItemId: "queue-next", sourceId: "item-next", subject: "감정평가실무" }),
  ], now);

  assert.equal(sparse.thisWeek.length, 2);
  assert.equal(sparse.history.length, 1);
  assert.equal(sparse.nextReview?.id, "next");
  assert.equal(sparse.completedWeek, false);

  const denseEvents = Array.from({ length: 14 }, (_, index) =>
    event(
      `dense-${index}`,
      index % 3 === 0 ? "review_completed" : "note_created",
      `2026-07-${String(13 + (index % 3)).padStart(2, "0")}T${String(8 + (index % 8)).padStart(2, "0")}:00:00+09:00`,
      index % 3 === 0 ? { reviewItemId: `queue-${index}` } : { noteId: `item-${index}` },
    ),
  );
  const dense = buildLearningRecordTimelineModel(denseEvents, now);

  assert.equal(dense.thisWeek.length, 14);
  assert.equal(dense.completedWeek, true);
  assert.equal(dense.nextReview, null);
  assert.deepEqual(dense.thisWeek.map((item) => item.id), [...dense.thisWeek].sort((left, right) => Date.parse(left.date) - Date.parse(right.date)).map((item) => item.id));
});

test("S230 selects the nearest upcoming review and falls back honestly to an overdue review", () => {
  const now = new Date("2026-07-15T12:00:00+09:00");
  const upcoming = buildLearningRecordTimelineModel([
    event("later", "review_due", "2026-07-20T09:00:00+09:00", { reviewItemId: "queue-later" }),
    event("nearest", "review_due", "2026-07-16T09:00:00+09:00", { reviewItemId: "queue-nearest" }),
    event("overdue", "review_due", "2026-07-14T09:00:00+09:00", { reviewItemId: "queue-overdue" }),
  ], now);
  assert.equal(upcoming.nextReview?.id, "nearest");

  const overdueOnly = buildLearningRecordTimelineModel([
    event("older", "review_due", "2026-07-10T09:00:00+09:00", { reviewItemId: "queue-older" }),
    event("recent", "review_due", "2026-07-14T09:00:00+09:00", { reviewItemId: "queue-recent" }),
  ], now);
  assert.equal(overdueOnly.nextReview?.id, "recent");
});

test("S230 never turns browser-local note IDs into durable Study Ledger deep links", () => {
  const localEvents = buildLocalBetaLearningAgendaEvents([
    {
      id: "browser-only-note",
      mode: "second",
      subjectLabel: "감정평가이론",
      createdAt: "2026-07-15T09:00:00+09:00",
    },
  ], "second");

  assert.equal(localEvents.length, 2);
  assert.ok(localEvents.every((item) => item.sourceId === "browser-only-note"));
  assert.ok(localEvents.every((item) => item.noteId === undefined));
});

test("S230 presentation keeps one timeline, one dominant action, real states, and supported deep links", () => {
  const client = read("components/review-os/learning-agenda-client.tsx");
  const loading = read("app/app/agenda/loading.tsx");
  const error = read("app/app/agenda/error.tsx");

  for (const contract of [
    "data-s230-learning-record-timeline",
    "data-s230-primary-timeline",
    "data-s230-next-review",
    "data-s230-dense-timeline-disclosure",
    "data-s230-completed-week-state",
    "회복의 시간순 기록",
    "다음 복습 이어가기",
    "이번 주 기록은 아직 없습니다.",
    "현재 오프라인입니다.",
  ]) {
    assert.ok(client.includes(contract), `missing S230 contract: ${contract}`);
  }

  assert.equal(client.split("data-s230-dominant-next-action").length - 1, 1);
  assert.match(client, /event\.noteId/);
  assert.match(client, /event\.reviewItemId/);
  assert.match(client, /\/app\/items\/\$\{encodeURIComponent\(event\.noteId\)\}/);
  assert.match(client, /\/app\/review\?mode=\$\{mode\}/);
  assert.match(client, /<ol/);
  assert.match(client, /min-h-11/);
  assert.match(client, /focus-visible:ring-2/);
  assert.match(client, /overflow-x-hidden/);
  assert.match(client, /data-s230-responsive-viewports="390,768,1440"/);
  assert.match(client, /data-s230-responsive-priority="next-review-first"/);
  assert.ok(client.indexOf("data-s230-next-review") < client.indexOf("data-s230-primary-timeline"));
  assert.match(client, /lg:col-start-2 lg:row-start-1/);
  assert.match(client, /lg:col-start-1 lg:row-start-1/);

  assert.match(loading, /data-s230-state="loading"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /useSyncExternalStore/);
  assert.match(error, /data-s230-state=\{isOnline \? "error" : "offline"\}/);
  assert.match(error, /navigator\.onLine/);
});

test("S230 contains no heatmap gamification, raw learner content, or authority claims", () => {
  const client = read("components/review-os/learning-agenda-client.tsx");
  const combined = [client, read("lib/review-os/learning-agenda.ts")].join("\n");

  for (const pattern of [
    /히트맵|heatmap/i,
    /연속\s*학습|streak/i,
    /리더보드|leaderboard/i,
    /레벨|포인트/,
    /숙달률|합격\s*(확률|가능성|보장)/,
    /\b\d{1,3}%\b/,
  ]) {
    assert.doesNotMatch(combined, pattern);
  }
  assert.doesNotMatch(client, /rawOcrText|rawAnswerText|rawQuestionText|rawProblemText|ocrText|answerText|questionText|problemText/);
});

test("S230 authenticated runtime lane is exact-Preview, secret-backed, and sanitized", () => {
  const workflow = read(".github/workflows/s230-runtime.yml");
  const spec = read("tests/e2e/learning-record-timeline-v3.spec.ts");

  assert.match(workflow, /github\.event\.pull_request\.number == 566/);
  assert.match(workflow, /<!-- run-s230-auth-e2e -->/);
  assert.match(workflow, /S230_AUTH_RUNTIME: "1"/);
  assert.match(workflow, /secrets\.E2E_USER_EMAIL \|\| secrets\.TEST_USER_EMAIL/);
  assert.match(workflow, /secrets\.E2E_USER_PASSWORD \|\| secrets\.TEST_USER_PASSWORD/);
  assert.match(workflow, /secrets\.VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(workflow, /test-results\/\*\*\/s230-runtime\.json/);

  assert.match(spec, /expectedPreviewHost/);
  assert.match(spec, /refuses any host except the exact PR #566 Vercel Preview/);
  assert.match(spec, /trace: "off"/);
  assert.match(spec, /video: "off"/);
  assert.match(spec, /390x844/);
  assert.match(spec, /768x1024/);
  assert.match(spec, /1440x1024/);
  assert.match(spec, /sanitizeEvidence/);
  assert.match(spec, /mask: \[accountIdentity, page\.getByText\(testEmail/);
  assert.match(spec, /The login form must be client-hydrated before submission/);
  assert.match(spec, /hydration-check@inverge\.invalid/);
  assert.match(spec, /toBeEnabled\(\{ timeout: 20_000 \}\)/);
  assert.match(spec, /waitForResponse\(isSignInResponse, \{ timeout: 20_000 \}\)/);
  assert.match(spec, /\[400, 401, 403\]\.includes\(status\)/);
  assert.match(spec, /test\.describe\.configure\(\{ retries: 0/);
  assert.match(spec, /targetDeploymentSha: runtimeTargetDeploymentSha/);
  assert.match(spec, /targetProductEquivalentContractSha/);
  assert.match(spec, /toBeFocused\(\)/);
  assert.match(spec, /toBeInViewport\(\{ ratio: 0\.8 \}\)/);
  assert.match(spec, /element\.matches\(":focus-visible"\)/);
  assert.match(spec, /s230-focus-failure-390\.png/);
  assert.doesNotMatch(spec, /scrollIntoViewIfNeeded/);
  assert.match(spec, /The dominant next review must precede the long timeline in DOM order/);
  assert.match(spec, /The dominant action must start above the long mobile\/tablet timeline/);
  assert.match(spec, /data-s224v-learner-mode-entry/);
  assert.match(spec, /Every visible email-like identity must be inside the masked account region/);
  assert.match(workflow, /Reject email-like text in screenshots/);
  assert.match(workflow, /tesseract/);
  assert.match(workflow, /if: always\(\) && steps\.redaction_guard\.outcome == 'success'/);
});
