import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

const sourcePath = "lib/review-os/past-exam-pdf-source.ts";
const runbookPath = "docs/past-exam-pdf-intake-runbook.md";

function read(path) {
  return readFileSync(path, "utf8");
}

function scanPaths(paths) {
  return execFileSync("rg", ["--no-heading", "--line-number", "--color=never", ".", ...paths], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

test("past exam pdf source module contract exists", () => {
  assert.equal(existsSync(sourcePath), true);
  const source = read(sourcePath);

  [
    "PastExamPdfSourceDocument",
    "PastExamPdfExtractionCandidate",
    "PastExamPdfStructuredCandidate",
    "listPastExamPdfSourceDocuments",
    "listPastExamPdfExtractionCandidates",
    "listPastExamPdfStructuredCandidates",
    "buildPastExamPdfIntakePlan",
    "reference_only",
    "needs_review",
    "verified",
  ].forEach((token) => {
    assert.ok(source.includes(token), `${token} should exist in source module`);
  });
});

test("source documents include 2023-2025 second-stage core subjects", async () => {
  const mod = await import("../lib/review-os/past-exam-pdf-source.ts");
  const docs = mod.listPastExamPdfSourceDocuments();
  const asJson = JSON.stringify(docs);
  ["2023", "2024", "2025", "감정평가실무", "감정평가이론", "감정평가 및 보상법규"].forEach((token) => {
    assert.ok(asJson.includes(token), `${token} should be present in seeded source docs`);
  });
});

test("runbook exists with required safety language", () => {
  assert.equal(existsSync(runbookPath), true);
  const runbook = read(runbookPath);
  [
    "Past Exam PDF Intake Runbook",
    "private/reference grounding material",
    "no public archive",
    "raw text is reference_only",
    "Human review",
    "verified",
    "2023–2025 second-stage PDFs",
  ].forEach((token) => {
    assert.ok(runbook.includes(token), `${token} should exist in runbook`);
  });
});

const learnerSurfaceText = scanPaths(["app/answer-review/page.tsx", "app/answer-review/answer-review-client.tsx", "components/review-os/capture-form.tsx"]);

test("guardrails: prohibited official/final-judgment claims are absent from learner/public files", () => {
  [
    "공식 모범답안",
    "공식 채점",
    "합격 판정",
    "확정 점수",
    "모범답안 확정",
    "official grader",
    "pass/fail judge",
    "정답 보장",
    "합격 보장",
    "합격 확률",
  ].forEach((term) => {
    assert.ok(!learnerSurfaceText.includes(term), `${term} should not appear in learner/public surface`);
  });
});

test("guardrails: no public past exam archive route language", () => {
  ["/past-exams", "/exam-archive", "기출 아카이브", "20년치 기출"].forEach((term) => {
    assert.ok(!learnerSurfaceText.includes(term), `${term} should not appear in learner/public surface`);
  });
});

test("guardrails: no payment terms", () => {
  ["checkout", "payment", "결제", "구독", "카드 등록"].forEach((term) => {
    assert.ok(!learnerSurfaceText.includes(term), `${term} should not appear in learner/public surface`);
  });
});
