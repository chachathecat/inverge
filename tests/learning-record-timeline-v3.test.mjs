import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildLearningRecordTimelineModel } from "../lib/review-os/learning-agenda.ts";

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
