import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { toTaxonomyCandidates } from "../lib/review-os/taxonomy-candidates.ts";

test("taxonomy candidate deserialization preserves required enrichment fields", () => {
  const candidates = toTaxonomyCandidates([
    {
      taxonomyNodeId: "second-theory-public-value",
      mode: "second",
      examYear: 2025,
      round: "36회",
      subject: "감정평가이론",
      unit: "감정평가 기초",
      topic: "공공성",
      subtopic: "감정평가의 사회적 기능",
      skill: "논점 구조화",
      examSkill: "이론 답안 구성",
      skeletonKeywords: ["공공성", "신뢰", 123, "시장보완"],
      commonGaps: ["논거 누락", false, "개념 정의 부족"],
      score: 17,
      confidence: 0.71,
      matchedKeywords: ["공공성", null, "신뢰"],
      skeletonKeywordHints: ["정의→기능→한계", {}, "사안 연결"],
      classificationStatus: "ai_suggested",
    },
  ]);

  assert.deepEqual(candidates, [
    {
      taxonomyNodeId: "second-theory-public-value",
      mode: "second",
      examYear: 2025,
      round: "36회",
      subject: "감정평가이론",
      unit: "감정평가 기초",
      topic: "공공성",
      subtopic: "감정평가의 사회적 기능",
      skill: "논점 구조화",
      examSkill: "이론 답안 구성",
      skeletonKeywords: ["공공성", "신뢰", "시장보완"],
      commonGaps: ["논거 누락", "개념 정의 부족"],
      score: 17,
      confidence: 0.71,
      matchedKeywords: ["공공성", "신뢰"],
      skeletonKeywordHints: ["정의→기능→한계", "사안 연결"],
      classificationStatus: "ai_suggested",
    },
  ]);
});

test("taxonomy candidate deserialization is backward compatible with older rows", () => {
  const candidates = toTaxonomyCandidates([
    {
      taxonomyNodeId: "first-civil-law-juristic-act",
      mode: "first",
      subject: "민법",
      unit: "권리 변동",
      topic: "법률행위",
      examSkill: "요건 판단",
    },
  ]);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].skill, "요건 판단");
  assert.equal(candidates[0].examSkill, "요건 판단");
  assert.deepEqual(candidates[0].skeletonKeywords, []);
  assert.deepEqual(candidates[0].commonGaps, []);
  assert.deepEqual(candidates[0].matchedKeywords, []);
  assert.deepEqual(candidates[0].skeletonKeywordHints, []);
  assert.equal(candidates[0].classificationStatus, "needs_review");
});

test("taxonomy candidate deserialization source does not introduce raw text fields", async () => {
  const source = await readFile(new URL("../lib/review-os/taxonomy-candidates.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /raw(?:Ocr|OCR|Problem|Answer|Source)|raw_ocr|problemText|answerText|sourceText|copyright|official|model|instructor/);
});
