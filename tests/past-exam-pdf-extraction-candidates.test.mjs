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

test("past exam extraction candidates module tokens exist", () => {
  assert.equal(existsSync(sourcePath), true);
  const source = read(sourcePath);

  [
    "findPastExamPdfExtractionCandidatesBySourceDocumentId",
    "findPastExamPdfStructuredCandidatesBySourceDocumentId",
    "getPastExamPdfIntakeCoverageSummary",
    "extraction_status",
    "candidate_status",
    "reference_only",
    "needs_review",
  ].forEach((token) => {
    assert.ok(source.includes(token), `${token} should exist in source module`);
  });
});

test("extraction candidates exist for 2023-2025 second-stage core subjects", async () => {
  const mod = await import("../lib/review-os/past-exam-pdf-source.ts");
  const candidates = mod.listPastExamPdfExtractionCandidates();
  const docs = mod.listPastExamPdfSourceDocuments();
  const view = candidates
    .map((candidate) => {
      const doc = docs.find((item) => item.id === candidate.source_document_id);
      return `${doc?.exam_year ?? ""} ${doc?.subject ?? ""}`;
    })
    .join("\n");

  ["2023", "2024", "2025", "감정평가실무", "감정평가이론", "감정평가 및 보상법규"].forEach((token) => {
    assert.ok(view.includes(token), `${token} should be present in extraction candidates`);
  });
});

test("structured candidates remain reference-only and needs_review", async () => {
  const mod = await import("../lib/review-os/past-exam-pdf-source.ts");
  const structured = mod.listPastExamPdfStructuredCandidates();

  assert.ok(structured.length > 0, "structured candidates should exist");
  structured.forEach((candidate) => {
    assert.equal(candidate.raw_text_policy, "reference_only");
    assert.equal(candidate.candidate_status, "needs_review");
  });
  assert.equal(structured.some((candidate) => candidate.candidate_status === "verified"), false);
});

test("coverage summary returns expected keys and review counts", async () => {
  const mod = await import("../lib/review-os/past-exam-pdf-source.ts");
  const summary = mod.getPastExamPdfIntakeCoverageSummary();

  [
    "sourceDocumentCount",
    "extractionCandidateCount",
    "structuredCandidateCount",
    "years",
    "subjects",
    "verifiedCount",
    "needsReviewCount",
  ].forEach((key) => {
    assert.ok(Object.hasOwn(summary, key), `${key} should exist in coverage summary`);
  });
});

test("runbook includes extraction candidate workflow policy", () => {
  assert.equal(existsSync(runbookPath), true);
  const runbook = read(runbookPath);

  [
    "Extraction candidate workflow",
    "Upload/store PDF privately",
    "page-range extraction candidate",
    "extracted text reference_only",
    "Human review before verified",
    "Only verified references may be prioritized",
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
