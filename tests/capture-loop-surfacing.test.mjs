import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("first capture save shows reflected today-plan message with one gap and next action", async () => {
  const source = await readFile(new URL("../app/app/session/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("방금 남긴 기록을 오늘 계획에 반영했습니다."));
  assert.ok(source.includes("가장 큰 간극:"));
  assert.ok(source.includes("다음 행동:"));
  assert.ok(source.includes("savedCaptureItemId"));
  assert.ok(source.includes("getWrongAnswerDetail(session.userId, session.email, savedCaptureItemId)"));
});

test("second capture save keeps rewrite action and review queue CTA", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("rewrite 저장하러 이동"));
  assert.ok(source.includes("/app/review?mode=${mode}"));
});

test("review queue marks only capture-originated items", async () => {
  const source = await readFile(new URL("../components/review-os/review-queue-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("item.createdFromCapture"));
  assert.ok(source.includes("오늘 기록에서 생성"));
});

test("item detail surfaces capture_note_engine_v2 fields without exposing raw OCR learning data", async () => {
  const source = await readFile(new URL("../app/app/items/[itemId]/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("capture_note_engine_v2"));
  assert.ok(source.includes("capture_note_engine_v1"));
  assert.ok(source.includes("정리된 초안"));
  assert.ok(source.includes("가장 큰 간극"));
  assert.ok(source.includes("다음 행동"));
  assert.ok(source.includes("논점 후보"));
  assert.ok(source.includes("오류 유형"));
  assert.ok(source.includes("다시쓰기 지시"));
  assert.ok(source.includes("다음 과제 유형"));
  assert.ok(source.includes("AI 정리는 초안입니다. 저장 전 직접 확인해 주세요."));
  assert.ok(source.includes("원문 OCR/텍스트는 사용자 소유 입력"));
  assert.ok(source.includes("관련 기출 후보"));
  assert.ok(source.includes("mapCaptureNoteToPastExamReferenceMatches"));
  assert.ok(source.includes("연결 이유"));
  assert.ok(source.includes("연결된 신호"));
  assert.ok(source.includes("formatMatchedFieldLabels"));
  assert.ok(source.includes("subject: \"과목\""));
  assert.ok(source.includes("topic_candidate: \"논점 후보\""));
  assert.ok(source.includes("mistake_type: \"오류 유형\""));
  assert.ok(source.includes("weak_structure_point: \"구조 약점\""));
  assert.ok(source.includes("issue_tags: \"논점 태그\""));
  assert.ok(source.includes("skill_tags: \"답안 기술\""));
  assert.ok(source.includes("skeleton: \"학습용 skeleton\""));
  assert.ok(source.includes("학습용 skeleton"));
  assert.ok(source.includes("자가 점검 질문"));
  assert.equal(source.includes("score="), false);
  assert.equal(source.includes("match.score"), false);
});

test("learner surfaces keep instructor routes and official grading language separated", async () => {
  const reviewSource = await readFile(new URL("../app/app/review/page.tsx", import.meta.url), "utf8");
  const itemSource = await readFile(new URL("../app/app/items/[itemId]/page.tsx", import.meta.url), "utf8");
  assert.equal(reviewSource.includes("/instructor/second-grading"), false);
  assert.equal(itemSource.includes("공식 점수"), false);
  assert.equal(itemSource.includes("공식 채점기준"), false);
  assert.equal(itemSource.includes("공식 모범답안"), false);
  assert.equal(itemSource.includes("공식 채점"), false);
  assert.equal(itemSource.includes("합격"), false);
  assert.equal(itemSource.includes("불합격"), false);
  assert.equal(itemSource.includes("official model answer"), false);
  assert.equal(itemSource.includes("pass/fail"), false);
  assert.equal(itemSource.includes("학습용 skeleton 단계"), true);
  assert.equal(itemSource.includes("자가 점검 질문"), true);
  assert.equal(itemSource.includes("자주 발생하는 간극"), true);
  assert.equal(itemSource.includes("다음 행동"), true);
});
