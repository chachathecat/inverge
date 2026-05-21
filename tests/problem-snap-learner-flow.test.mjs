import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("problem snap learner flow exposes camera-first premium inputs", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("문제 사진 찍기"));
  assert.ok(source.includes("PDF/사진 불러오기"));
  assert.ok(source.includes("텍스트 붙여넣기"));
  assert.ok(source.includes("<select className=\"mt-1 w-full rounded border p-2\" value={subject}"));
  assert.ok(source.includes("감정평가실무"));
  assert.ok(source.includes("감정평가이론"));
  assert.ok(source.includes("감정평가 및 보상법규"));
});

test("problem snap result hero, save CTA, and grounding copy are rendered", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("가장 먼저 이해할 1가지"));
  assert.ok(source.includes("핵심 공식/논점"));
  assert.ok(source.includes("지금 다시 풀 행동 1개"));
  assert.ok(source.includes("주의할 함정 1개"));
  assert.ok(source.includes("유사 기출 Skeleton을 참고해 정리했습니다."));
  assert.ok(source.includes("입력 자료 기준으로 정리했습니다."));
  assert.equal(source.includes("이 문제를 복습 큐에 저장</button>"), true);
  assert.equal(source.includes("<button disabled className"), false);
});

test("problem snap learner copy avoids endorsement, grading, and payment claims", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("공식 보증"), false);
  assert.equal(source.includes("결제"), false);
  assert.equal(source.includes("checkout"), false);
  assert.equal(source.includes("합격 보장"), false);
  assert.equal(source.includes("공식 채점"), false);
});
