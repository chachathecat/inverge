import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadReferenceCorpus } from "../lib/review-os/reference-corpus.ts";
import {
  createOrGetContextCache,
  fallbackWithoutCache,
  getReferenceContextForRequest,
  invalidateReferenceCache,
  sanitizeReferenceRequestInput,
} from "../lib/review-os/reference-context.ts";
import { buildFirstOxReferenceRequest, normalizeFiveChoiceItemToStatements } from "../lib/review-os/first-ox-engine.ts";
import { buildSecondAnswerRewriteReferenceRequest } from "../lib/review-os/second-answer-rewrite.ts";

const firstStatement = normalizeFiveChoiceItemToStatements({
  id: "ref-test-1",
  subject: "민법",
  stem: "다음 선지를 판단하세요.",
  choices: ["① 취소와 무효를 구별한다.", "② 원칙과 예외를 확인한다.", "③ 전부와 일부를 구별한다.", "④ 추인을 확인한다.", "⑤ 요건을 확인한다."],
  expectedOxByChoice: ["O", "O", "O", "O", "O"],
  topicCandidate: "법률행위",
  conceptCandidate: "무효와 취소",
})[0];

test("reference context loads sample corpus", async () => {
  const corpus = await loadReferenceCorpus();
  assert.ok(corpus.length >= 4);
  assert.ok(corpus.some((entry) => entry.referenceId === "civil-law-juristic-act-void-cancel-001"));
  assert.ok(corpus.every((entry) => entry.snippet.length <= 420));
});

test("reference context filters by examMode, subject, and topic", async () => {
  const result = await getReferenceContextForRequest({
    examMode: "first",
    subject: "민법",
    topicCandidate: "법률행위",
    conceptCandidate: "무효와 취소",
    taskType: "first_ox",
    maxSnippets: 2,
  });
  assert.equal(result.usedFallback, false);
  assert.ok(result.snippets.length > 0);
  assert.equal(result.snippets[0].subject, "민법");
  assert.equal(result.snippets[0].usedFallback, false);
  assert.match(result.snippets[0].referenceId, /civil-law/);
});

test("cache-disabled fallback does not crash", async () => {
  invalidateReferenceCache();
  const noProvider = fallbackWithoutCache({ examMode: "second", subject: "감정평가이론", taskType: "second_answer_rewrite", maxSnippets: 1 });
  assert.deepEqual(noProvider.snippets, []);
  assert.equal(noProvider.usedFallback, true);

  const disabled = await createOrGetContextCache(
    { examMode: "second", subject: "감정평가이론", topicCandidate: "수익환원법", taskType: "second_answer_rewrite", maxSnippets: 1 },
    { cacheEnabled: false },
  );
  assert.equal(disabled.cacheHit, false);
  assert.equal(disabled.cacheEnabled, false);
});

test("provider/model is configurable and not hard-coded in learner UI", async () => {
  const result = await getReferenceContextForRequest(
    { examMode: "first", subject: "민법", topicCandidate: "법률행위", taskType: "concept_review", maxSnippets: 1 },
    { provider: "local-test-provider", modelName: "reference-test-model", cacheEnabled: false },
  );
  assert.equal(result.provider, "local-test-provider");
  assert.equal(result.modelName, "reference-test-model");

  const learnerSources = await Promise.all([
    readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8"),
    readFile("components/review-os/today-session-runner.tsx", "utf8"),
    readFile("components/learner/learner-ui.tsx", "utf8"),
  ]);
  for (const source of learnerSources) {
    assert.equal(/gemini|openai|gpt-|claude|modelName/i.test(source), false);
  }
});

test("user raw OCR and answer text are not passed into reference corpus request", () => {
  const sanitized = sanitizeReferenceRequestInput({
    examMode: "second",
    subject: "감정평가이론",
    topicCandidate: "수익방식",
    conceptCandidate: "누락 논점",
    taskType: "second_answer_rewrite",
    maxSnippets: 2,
    rawOcrText: "학습자 OCR 원문",
    userAnswerText: "학습자 답안 원문",
    uploadedPdfText: "업로드 PDF 텍스트",
    fullProblemText: "문제 전문",
    rewriteParagraph: "다시쓴 문단",
    rawHandwrittenContent: "필기 원문",
  });
  const serialized = JSON.stringify(sanitized);
  assert.equal(/학습자|업로드|문제 전문|다시쓴 문단|필기/.test(serialized), false);
  assert.equal(sanitized.subject, "감정평가이론");
  assert.equal(sanitized.conceptCandidate, "누락 논점");
});

test("reference requests use only safe skeleton metadata", () => {
  const firstRequest = buildFirstOxReferenceRequest(firstStatement);
  assert.equal(firstRequest.examMode, "first");
  assert.equal(firstRequest.taskType, "first_ox");
  assert.equal(JSON.stringify(firstRequest).includes(firstStatement.statementText), false);

  const secondRequest = buildSecondAnswerRewriteReferenceRequest({
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    topicTag: "수익환원법",
    missingIssue: "환원이율 선택 근거",
    biggestGap: "근거 부족",
    supportedCalculatorTemplateId: "appraisal_income_capitalization",
  });
  assert.equal(secondRequest.examMode, "second");
  assert.equal(secondRequest.taskType, "second_answer_rewrite");
  assert.equal(JSON.stringify(secondRequest).includes("학습자 답안"), false);
});

test("reference snippets are optional and collapsed in learner surfaces", async () => {
  const firstOxSource = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  const sessionSource = await readFile("components/review-os/today-session-runner.tsx", "utf8");
  assert.ok(firstOxSource.includes("<details"));
  assert.ok(firstOxSource.includes("참고 근거 힌트 보기 (선택)"));
  assert.ok(firstOxSource.includes("concept.referenceSnippets?.length"));
  assert.ok(sessionSource.includes("<details"));
  assert.ok(sessionSource.includes("참고 근거 힌트 보기 (선택)"));
  assert.ok(sessionSource.includes("note?.referenceSnippets?.length"));
  assert.equal(/<table/.test(firstOxSource + sessionSource), false);
});
