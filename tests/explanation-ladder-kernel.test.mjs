import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { evaluateExplanationLadderQuality } from "../lib/review-os/explanation-quality-eval.ts";

const path = "reference_corpus/curriculum/appraiser/explanation_ladder.json";
const requiredLabels = ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"];

test("explanation ladder metadata includes required labels and original concept examples", () => {
  const raw = readFileSync(path, "utf8");
  assert.doesNotMatch(raw, /다음\s+중|옳은\s+것은|틀린\s+것은|정답\s*[:：]/);
  const ladder = JSON.parse(raw);
  const labels = ladder.labels.map((entry) => entry.label);
  for (const label of requiredLabels) assert.equal(labels.includes(label), true);
  const concepts = new Set(ladder.templates.map((entry) => entry.concept));
  for (const concept of ["의사무능력자의 법률행위", "무효와 취소", "재고자산 저가법", "수익환원법", "사업인정의 처분성"]) {
    assert.equal(concepts.has(concept), true, `${concept} missing`);
  }
  for (const template of ladder.templates) {
    for (const label of requiredLabels) assert.equal(typeof template.ladder[label], "string");
    assert.match(template.ladder["10초 확인"], /O\/X|cloze|____|빈칸/);
    const result = evaluateExplanationLadderQuality({
      metadataOnly: true,
      conceptLabel: template.concept,
      subject: "감정평가사",
      entries: requiredLabels.map((label) => ({ label, text: template.ladder[label] })),
    }, { conceptLabel: template.concept });
    assert.equal(result.status, "pass", `${template.concept} should pass quality eval: ${JSON.stringify(result)}`);
  }
});

test("explanation ladder helper builds and validates O/X or cloze-compatible checks", async () => {
  const helper = await import("../lib/review-os/explanation-ladder.ts");
  const ladder = helper.buildExplanationLadder({ conceptLabel: "사업인정의 처분성", subject: "감정평가 및 보상법규", examMode: "second" });
  for (const label of requiredLabels) assert.equal(ladder.entries.some((entry) => entry.label === label), true);
  assert.equal(helper.validateExplanationLadder(ladder), true);
  assert.equal(evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode }).status, "pass");
  const check = helper.toTenSecondCheck(ladder);
  assert.ok(check);
  assert.match(check.text, /O\/X|cloze|____|빈칸/);
  assert.doesNotMatch(JSON.stringify(ladder), /공식\s*정답|최종\s*정답|점수\s*보장|합격\s*보장|불합격\s*확정/);
});


test("fallback explanation ladder sanitizes forbidden learner-derived labels", async () => {
  const helper = await import("../lib/review-os/explanation-ladder.ts");
  const ladder = helper.buildExplanationLadder({
    conceptLabel: "합격 보장 핵심 공식",
    subject: "최종 정답 보장 과목",
    examMode: "first",
    learnerLevel: "점수 예측 상위권",
  });
  const serialized = JSON.stringify(ladder);

  assert.equal(helper.validateExplanationLadder(ladder), true);
  assert.equal(evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode }).status, "pass");
  assert.equal(ladder.conceptLabel, "확인할 개념");
  assert.equal(ladder.subject, "해당 과목");
  assert.equal(ladder.learnerLevel, undefined);
  for (const label of requiredLabels) assert.equal(ladder.entries.some((entry) => entry.label === label), true);
  assert.match(helper.toTenSecondCheck(ladder).text, /O\/X|cloze|____|빈칸/);
  assert.doesNotMatch(serialized, /합격\s*보장|합격보장|최종\s*정답|점수\s*예측|공식\s*채점|자동\s*채점|불합격\s*확정|모범\s*답안\s*확정|모범답안\s*확정/);
});

test("fallback explanation ladder sanitizes unsafe subject without emitting it", async () => {
  const helper = await import("../lib/review-os/explanation-ladder.ts");
  const ladder = helper.buildExplanationLadder({ conceptLabel: "처음 보는 논점", subject: "합격보장 민법", examMode: "second" });
  const serialized = JSON.stringify(ladder);

  assert.equal(helper.validateExplanationLadder(ladder), true);
  assert.equal(evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode }).status, "pass");
  assert.equal(ladder.conceptLabel, "처음 보는 논점");
  assert.equal(ladder.subject, "해당 과목");
  for (const label of requiredLabels) assert.equal(ladder.entries.some((entry) => entry.label === label), true);
  assert.match(helper.toTenSecondCheck(ladder).text, /O\/X|cloze|____|빈칸/);
  assert.doesNotMatch(serialized, /합격\s*보장|합격보장|공식\s*정답|최종\s*정답|점수\s*(?:보장|예측|확정)|불합격\s*(?:예측|확정)|모범\s*답안\s*확정|모범답안\s*확정/);
});
