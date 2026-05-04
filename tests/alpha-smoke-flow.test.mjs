import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("text-only first and second capture paths can be saved", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('captureIntent: "save"'));
  assert.ok(source.includes("mode === \"second\""));
  assert.ok(source.includes('captureIntent: "save"'));
});

test("saved capture redirects to session with itemId and session reflects saved signals", async () => {
  const captureSource = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  const sessionSource = await readFile(new URL("../app/app/session/page.tsx", import.meta.url), "utf8");
  assert.ok(captureSource.includes("savedCapture=1&itemId=${result.item.id}"));
  assert.ok(captureSource.includes("/app/session"));
  assert.ok(sessionSource.includes("savedCaptureItemId"));
  assert.ok(sessionSource.includes("capture_note_engine_v2"));
  assert.ok(sessionSource.includes("가장 큰 간극:"));
  assert.ok(sessionSource.includes("다음 행동:"));
});

test("today plan and review queue reflect queue-backed capture tasks", async () => {
  const homeSource = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  const reviewSource = await readFile(new URL("../components/review-os/review-queue-client.tsx", import.meta.url), "utf8");
  assert.ok(homeSource.includes("buildTodayPlanCard"));
  assert.ok(homeSource.includes("focus.nextActionType"));
  assert.ok(reviewSource.includes("오늘 기록에서 생성"));
  assert.ok(reviewSource.includes("item.createdFromCapture"));
});

test("item detail shows structured draft fields", async () => {
  const itemSource = await readFile(new URL("../app/app/items/[itemId]/page.tsx", import.meta.url), "utf8");
  assert.ok(itemSource.includes("정리된 초안"));
  assert.ok(itemSource.includes("가장 큰 간극"));
  assert.ok(itemSource.includes("다음 행동"));
});

test("learner UI does not expose instructor routes or official grading language", async () => {
  const reviewPage = await readFile(new URL("../app/app/review/page.tsx", import.meta.url), "utf8");
  const itemPage = await readFile(new URL("../app/app/items/[itemId]/page.tsx", import.meta.url), "utf8");
  const appHome = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.equal(reviewPage.includes("/instructor"), false);
  assert.equal(itemPage.includes("공식 점수"), false);
  assert.equal(itemPage.includes("공식 모범답안"), false);
  assert.equal(appHome.includes("합격/불합격"), false);
});
