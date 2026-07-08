import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("S220B launch surface smoke", () => {
  const layout = read("app/layout.tsx");
  const manifest = read("app/manifest.ts");
  const home = read("components/inverge/front-page.tsx");
  const exams = read("app/exams/page.tsx");

  assert.equal(layout.includes("답안길"), true);
  assert.equal(manifest.includes("답안길"), true);
  assert.equal(manifest.includes('start_url: "/app?mode=second"'), true);
  assert.equal(manifest.includes('url: "/app/capture?mode=second"'), true);
  assert.equal(manifest.includes('url: "/app/review?mode=second"'), true);
  assert.equal(home.includes("/app/capture?mode=second"), true);
  assert.equal(home.includes("/login?returnTo=/app/capture?mode=second"), true);
  assert.equal(home.includes("/answer-review?mode=second"), false);
  assert.equal(exams.includes("/app/capture?mode=second"), true);
  assert.equal(home.includes("1차 오답"), false);
  assert.equal(home.includes("1차 세트 풀이"), false);
  assert.equal(exams.includes('title: "감정평가사 1차"'), false);
});
