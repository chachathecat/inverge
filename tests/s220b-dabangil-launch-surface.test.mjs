import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const FORBIDDEN_LAUNCH_CLAIMS = [
  "공식 모범답안",
  "공식 모델답안",
  "확정 점수",
  "합격 가능성",
  "합격 판정",
  "pass probability",
  "guarantee",
];

test("S220B learner-facing metadata and manifest use 답안길 second-round positioning", () => {
  const layout = read("app/layout.tsx");
  const manifest = read("app/manifest.ts");

  assert.match(layout, /applicationName:\s*"답안길"/);
  assert.match(layout, /title:\s*"답안길 \| 감정평가사 2차 답안 훈련 OS"/);
  assert.match(layout, /appleWebApp:[\s\S]*title:\s*"답안길"/);
  assert.match(layout, /2차 답안/);
  assert.doesNotMatch(layout, /1차 오답|1차\/2차 공부/);

  assert.match(manifest, /name:\s*"답안길"/);
  assert.match(manifest, /short_name:\s*"답안길"/);
  assert.match(manifest, /start_url:\s*"\/answer-review\?mode=second"/);
  assert.doesNotMatch(manifest, /name:\s*"Inverge"|short_name:\s*"Inverge"/);
});

test("S220B home surface has one primary second-round answer CTA and no first-round launch copy", () => {
  const source = read("components/inverge/front-page.tsx");

  assert.match(source, /답안길 · 감정평가사 2차 답안 훈련 OS/);
  assert.match(source, /답안 올리고 감점 위험 찾기/);
  assert.match(source, /href="\/answer-review\?mode=second"/);
  assert.equal((source.match(/buttonVariants\(\{ size: "lg" \}\)/g) ?? []).length, 1);
  assert.doesNotMatch(source, /1차 오답|1차 세트 풀이|1차\/2차 공부|감정평가사 1차/);
});

test("S220B exams page is a second-round handoff, not equal first/second track selection", () => {
  const source = read("app/exams/page.tsx");

  assert.match(source, /답안길 시작/);
  assert.match(source, /감정평가사 2차 답안 훈련/);
  assert.match(source, /2차 답안 올리기/);
  assert.match(source, /\/app\/capture\?mode=second/);
  assert.doesNotMatch(source, /title:\s*"감정평가사 1차"/);
  assert.doesNotMatch(source, /감정평가사 1차와 2차만 제공합니다/);
  assert.doesNotMatch(source, /mode=first/);
});

test("S220B launch copy keeps claim and runtime boundaries closed", () => {
  const launchSources = [
    "app/layout.tsx",
    "app/manifest.ts",
    "components/inverge/front-page.tsx",
    "app/exams/page.tsx",
  ].map((path) => read(path)).join("\n");

  for (const token of FORBIDDEN_LAUNCH_CLAIMS) {
    assert.equal(launchSources.toLowerCase().includes(token.toLowerCase()), false, `forbidden launch claim leaked: ${token}`);
  }

  assert.doesNotMatch(launchSources, /checkout|webhook|billing provider|entitlement enforcement|provider runtime|OCR runtime/i);
  assert.match(launchSources, /학습 보조 초안/);
  assert.match(launchSources, /공식 채점[^\n]*아닙니다/);
});
