import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  assertExplanationQuality,
  evaluateExplanationLadderQuality,
  evaluateTenSecondCheck,
  evaluateTrapPoint,
  scoreExplanationQuality,
} from "../lib/review-os/explanation-quality-eval.ts";
import { buildExplanationLadder, validateExplanationLadder } from "../lib/review-os/explanation-ladder.ts";

const fixtureDir = "tests/fixtures/explanation-quality";
const rawFieldPattern = /rawOcrText|raw_ocr_text|ocrText|problemText|questionText|rawQuestionText|userAnswerText|rawAnswerText|sourceText|copyrightedText|originalText/i;
const forbiddenClaimPattern = /공식\s*채점|공식\s*정답|공식\s*모범\s*답안|official\s+grading|official\s+answer|model\s+answer|점수\s*(?:예측|확정|보장)|pass\s*fail|합격\s*보장|합격보장|불합격\s*(?:예측|확정|판정)/i;

function loadFixtures() {
  return readdirSync(fixtureDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({ file, ...JSON.parse(readFileSync(join(fixtureDir, file), "utf8")) }));
}

function fixtureByFile(fileName) {
  const fixture = loadFixtures().find((candidate) => candidate.file === fileName);
  assert.ok(fixture, `${fileName} fixture should exist`);
  return fixture;
}

function evaluateFixture(fileName) {
  const fixture = fixtureByFile(fileName);
  return evaluateExplanationLadderQuality(fixture.ladder, fixture.context);
}

test("valid explanation quality fixtures pass", () => {
  const validFixtures = loadFixtures().filter((fixture) => fixture.expectedStatus === "pass");
  assert.equal(validFixtures.length, 4);

  for (const fixture of validFixtures) {
    const result = evaluateExplanationLadderQuality(fixture.ladder, fixture.context);
    assert.equal(result.metadataOnly, true, fixture.file);
    assert.equal(result.status, "pass", `${fixture.file}: ${JSON.stringify(result)}`);
    assert.equal(result.score, 100, fixture.file);
    assert.deepEqual(result.failedChecks, [], fixture.file);
    assertExplanationQuality(result);
    assert.equal(scoreExplanationQuality(result), 100);
  }
});

test("generic explanation fails specificity", () => {
  const result = evaluateFixture("invalid-generic-explanation.json");
  assert.equal(result.status, "needs_revision");
  assert.equal(result.failedChecks.includes("beginnerClarity"), true);
  assert.equal(result.failedChecks.includes("examUsefulness"), true);
  assert.equal(result.failedChecks.includes("trapPointSpecificity"), true);
});

test("official answer claim fails", () => {
  const result = evaluateFixture("invalid-official-model-answer-claim.json");
  assert.equal(result.status, "fail");
  assert.equal(result.failedChecks.includes("noForbiddenClaims"), true);
  assert.equal(result.failedChecks.includes("noOfficialAnswerClaim"), true);
});

test("score/pass-fail claim fails", () => {
  const result = evaluateFixture("invalid-score-pass-fail-guarantee-claim.json");
  assert.equal(result.status, "fail");
  assert.equal(result.failedChecks.includes("noForbiddenClaims"), true);
  assert.equal(result.failedChecks.includes("noScoreOrPassFail"), true);
});

test("합격보장 claim fails", () => {
  const result = evaluateFixture("invalid-score-pass-fail-guarantee-claim.json");
  assert.equal(result.status, "fail");
  assert.equal(result.failedChecks.includes("noScoreOrPassFail"), true);
});

test("raw text leak fails", () => {
  const result = evaluateFixture("invalid-raw-text-leak.json");
  assert.equal(result.status, "fail");
  assert.equal(result.failedChecks.includes("noRawTextLeak"), true);
});

test("10초 확인 without O/X or cloze shape fails", () => {
  const result = evaluateFixture("invalid-ten-second-not-convertible.json");
  assert.equal(result.status, "needs_revision");
  assert.equal(result.failedChecks.includes("tenSecondCheckConvertible"), true);

  const checkResult = evaluateTenSecondCheck("수익환원법 내용을 다시 읽어 봅니다.", { conceptLabel: "수익환원법", subject: "감정평가실무", examMode: "second" });
  assert.equal(checkResult.failedChecks.includes("tenSecondCheckConvertible"), true);
});

test("trap point too vague fails", () => {
  const result = evaluateFixture("invalid-trap-point-too-vague.json");
  assert.equal(result.status, "needs_revision");
  assert.equal(result.failedChecks.includes("trapPointSpecificity"), true);

  const trapResult = evaluateTrapPoint("중요한 부분이니 주의하세요.", { conceptLabel: "사업인정의 처분성", subject: "감정평가 및 보상법규", examMode: "second" });
  assert.equal(trapResult.failedChecks.includes("trapPointSpecificity"), true);
});

test("generated ladder from curriculum concept passes", () => {
  const ladder = buildExplanationLadder({ conceptLabel: "사업인정의 처분성", subject: "감정평가 및 보상법규", examMode: "second" });
  const result = evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode });

  assert.equal(validateExplanationLadder(ladder), true);
  assert.equal(result.status, "pass");
  assert.deepEqual(ladder.entries.map((entry) => entry.label), ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"]);
});

test("generated ladder from unsafe concept label sanitizes and passes", () => {
  const ladder = buildExplanationLadder({
    conceptLabel: "공식 정답과 합격보장 점수 예측",
    subject: "문제 원문: 다음 중 옳은 것은",
    examMode: "first",
    learnerLevel: "official model answer",
  });
  const serialized = JSON.stringify(ladder);
  const result = evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode });

  assert.equal(ladder.conceptLabel, "확인할 개념");
  assert.equal(ladder.subject, "해당 과목");
  assert.equal(ladder.learnerLevel, undefined);
  assert.equal(validateExplanationLadder(ladder), true);
  assert.equal(result.status, "pass");
  assert.doesNotMatch(serialized, forbiddenClaimPattern);
  assert.doesNotMatch(serialized, rawFieldPattern);
});

test("evaluator output is metadataOnly and no raw fields appear", () => {
  const result = evaluateFixture("valid-civil-nullity-rescission.json");
  const serialized = JSON.stringify(result);

  assert.equal(result.metadataOnly, true);
  assert.doesNotMatch(serialized, rawFieldPattern);
  assert.doesNotMatch(serialized, /다음\s+중|옳은\s+것은|문제\s*원문|답안\s*원문|OCR\s*원문/);
  assert.deepEqual(Object.keys(result).sort(), ["checks", "failedChecks", "metadataOnly", "safeRevisionHints", "score", "status", "warnings"].sort());
});
