import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const path = "reference_corpus/curriculum/appraiser/study_tracks.json";
const trackIds = ["first_30", "first_60", "first_90", "first_120", "second_90", "second_180", "second_365"];
const rules = ["due_review", "recent_wrong", "confidence_gap", "pass_risk", "exam_urgency", "missed_recently", "weak_structure"];

test("study tracks expose required draft metadata and priority rules", () => {
  const document = JSON.parse(readFileSync(path, "utf8"));
  for (const id of trackIds) {
    const track = document.tracks[id];
    assert.ok(track, `${id} missing`);
    assert.equal(track.durationDays, Number(id.split("_")[1]));
    assert.equal(track.todayPlanMaxTasks, 3);
    assert.equal(track.sourceStatus, "draft");
    assert.equal(track.needsOfficialVerification, true);
    for (const rule of rules) assert.equal(track.prioritizationRules.includes(rule), true);
    assert.ok(track.intendedLearner);
    assert.ok(Array.isArray(track.weeklyFocus));
    assert.ok(Array.isArray(track.dailyTemplate));
  }
});

test("study schedule helper selects tracks, ranks candidates, and caps Today Plan to 3", async () => {
  const engine = await import("../lib/review-os/study-schedule-engine.ts");
  assert.equal(engine.selectStudyTrack({ examMode: "first", daysUntilExam: 29, dailyAvailableMinutes: 60 }).selectedTrackId, "first_30");
  assert.equal(engine.selectStudyTrack({ examMode: "second", daysUntilExam: 181, dailyAvailableMinutes: 90 }).selectedTrackId, "second_365");
  const ranked = engine.rankTodayPlanCandidates({ candidates: [
    { id: "normal" },
    { id: "due", dueReview: true },
    { id: "weak", weakStructure: true },
    { id: "wrong", recentWrong: true },
  ], dueReviewCount: 2, dailyAvailableMinutes: 60 });
  assert.equal(ranked[0].id, "due");
  assert.deepEqual(engine.capTodayPlanTasks([1, 2, 3, 4, 5]), [1, 2, 3]);
  assert.deepEqual(engine.capTodayPlanTasks([1, 2, 3, 4, 5], 10), [1, 2, 3]);
});

test("no production flags are enabled by the curriculum schedule kernel", () => {
  const merged = [
    readFileSync(path, "utf8"),
    readFileSync("lib/review-os/study-schedule-engine.ts", "utf8"),
    readFileSync("lib/review-os/curriculum-engine.ts", "utf8"),
  ].join("\n");
  assert.doesNotMatch(merged, /PRODUCTION_.*=\s*["']?1|ROLLOUT_.*=\s*["']?1|ENABLE_.*PRODUCTION/i);
});
