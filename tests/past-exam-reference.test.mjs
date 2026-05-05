import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildAnswerSkeletonGuide,
  findPastExamReferenceMatches,
  listPastExamReferences,
  mapCaptureNoteToPastExamReferences,
} from "../lib/review-os/past-exam-reference.ts";

const subjectFixtures = [
  {
    name: "실무",
    subject: "감정평가실무",
    input: { topicCandidate: "평가방법", mistakeType: "계산 실수", weakStructurePoint: "결론" },
  },
  {
    name: "이론",
    subject: "감정평가이론",
    input: { topicCandidate: "개념정의", mistakeType: "개념 혼동", weakStructurePoint: "사례 적용" },
  },
  {
    name: "법규",
    subject: "감정평가 및 보상법규",
    input: { topicCandidate: "요건", mistakeType: "암기 누락", weakStructurePoint: "조문" },
  },
];

const seededYearRange = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const requiredSubjects = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"];

test("2019/2020/2021/2022/2023/2024/2025 second-stage reference seeds are loaded", () => {
  const refs = listPastExamReferences("second");
  const years = new Set(refs.map((item) => item.exam_year));
  for (const year of seededYearRange) {
    assert.ok(years.has(year), `missing seeded year: ${year}`);
  }
});

test("each seeded year has all three second-stage subjects", () => {
  const refs = listPastExamReferences("second");
  for (const year of seededYearRange) {
    const yearRefs = refs.filter((item) => item.exam_year === year);
    const subjects = new Set(yearRefs.map((item) => item.subject));
    for (const subject of requiredSubjects) {
      assert.ok(subjects.has(subject), `${year} is missing subject: ${subject}`);
    }
  }
});

test("all references use learner-safe source policy fields", () => {
  const refs = listPastExamReferences("second");
  for (const ref of refs) {
    assert.equal(ref.source_status, "needs_review");
    assert.equal(ref.raw_text_policy, "reference_only");
  }
});

test("all ids are unique and subject-clear", () => {
  const refs = listPastExamReferences("second");
  const ids = refs.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const ref of refs) {
    if (ref.subject === "감정평가실무") assert.match(ref.id, /practice/);
    if (ref.subject === "감정평가이론") assert.match(ref.id, /theory/);
    if (ref.subject === "감정평가 및 보상법규") assert.match(ref.id, /law/);
  }
});

test("similar_question_refs resolve without dangling references", () => {
  const refs = listPastExamReferences("second");
  const idSet = new Set(refs.map((item) => item.id));

  for (const ref of refs) {
    for (const similarId of ref.similar_question_refs) {
      assert.ok(idSet.has(similarId), `${ref.id} has dangling similar_question_refs: ${similarId}`);
    }
  }
});

test("all seeded refs keep non-empty taxonomy and skeleton fields", () => {
  const refs = listPastExamReferences("second");
  for (const ref of refs) {
    assert.ok(ref.topic_tags.length > 0, `${ref.id} has empty topic_tags`);
    assert.ok(ref.issue_tags.length > 0, `${ref.id} has empty issue_tags`);
    assert.ok(ref.skill_tags.length > 0, `${ref.id} has empty skill_tags`);
    assert.ok(ref.expected_answer_skeleton.length > 0, `${ref.id} has empty expected_answer_skeleton`);
    assert.ok(ref.scoring_checkpoint_skeleton.length > 0, `${ref.id} has empty scoring_checkpoint_skeleton`);
    assert.ok(ref.common_gap_candidates.length > 0, `${ref.id} has empty common_gap_candidates`);
    assert.ok(ref.related_mistake_types.length > 0, `${ref.id} has empty related_mistake_types`);
  }
});



test("tie scores prefer recent exam year then stable id", () => {
  const matches = findPastExamReferenceMatches({
    mode: "second",
    subject: "감정평가실무",
    topicCandidate: "평가방법",
  });

  assert.ok(matches.length >= 2);
  for (let i = 1; i < matches.length; i += 1) {
    const prev = matches[i - 1];
    const curr = matches[i];
    assert.ok(prev.score >= curr.score);
    if (prev.score === curr.score) {
      assert.ok(prev.reference.exam_year >= curr.reference.exam_year);
      if (prev.reference.exam_year === curr.reference.exam_year) {
        assert.ok(prev.reference.id.localeCompare(curr.reference.id) <= 0);
      }
    }
  }
});

test("subject-aligned signals return same-subject references near top", () => {
  for (const fixture of subjectFixtures) {
    const matches = findPastExamReferenceMatches({
      mode: "second",
      subject: fixture.subject,
      ...fixture.input,
    });

    assert.ok(matches.length > 0, `${fixture.name} should return at least one match`);
    assert.ok(matches.length <= 3, `${fixture.name} should return up to 3 matches`);
    assert.equal(matches[0].reference.subject, fixture.subject);

    for (const match of matches) {
      assert.ok(match.matched_fields.length > 0);
      assert.match(match.reason, /[가-힣]/);
      assert.equal(match.reason.includes("score"), false);
      assert.equal(/(?:score\s*[:=]|\d+(?:\.\d+)?\s*(?:점|%))/i.test(match.reason), false);
      assert.equal(Object.prototype.hasOwnProperty.call(match, "score"), true);
    }
  }
});

test("mode mismatch excludes first-stage references for second-stage input", () => {
  const matches = findPastExamReferenceMatches({
    mode: "second",
    subject: "감정평가실무",
    topicCandidate: "시점수정",
    mistakeType: "조건 누락",
    weakStructurePoint: "단위",
  });

  assert.ok(matches.length > 0);
  assert.ok(matches.every((match) => match.reference.stage === "second"));
});

test("buildAnswerSkeletonGuide returns actionable guidance for every seeded ref", () => {
  const refs = listPastExamReferences("second");

  assert.ok(refs.length > 0);
  for (const ref of refs) {
    const guide = buildAnswerSkeletonGuide(ref);
    assert.equal(guide.referenceId, ref.id);
    assert.ok(guide.skeleton_steps.length > 0);
    assert.ok(guide.checkpoint_questions.length > 0);
    assert.ok(guide.common_gap_warnings.length > 0);
    assert.ok(guide.next_action.length > 0);
  }
});

test("skeleton guides avoid official answer/scoring/pass-fail language", () => {
  const refs = listPastExamReferences("second");
  const forbidden = ["공식 모범답안", "공식 채점", "합격/불합격", "pass/fail", "정답 확정", "채점 확정"];

  for (const ref of refs) {
    const guide = buildAnswerSkeletonGuide(ref);
    const joined = JSON.stringify(guide);
    for (const keyword of forbidden) {
      assert.equal(joined.includes(keyword), false, `${ref.id} guide includes forbidden keyword: ${keyword}`);
    }
  }
});

test("capture note maps to past-exam reference candidates by tags", () => {
  const candidates = mapCaptureNoteToPastExamReferences({
    mode: "second",
    subject: "감정평가이론",
    topic_candidate: "사례적용",
    mistake_type: "구조 약함",
    weak_structure_point: "결론",
  });
  assert.ok(candidates.some((item) => item.subject === "감정평가이론"));
});

test("reference module does not include prohibited official grading/pass-fail language", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  const forbidden = [
    "공식 모범답안",
    "공식 채점",
    "합격/불합격",
    "official model answer",
    "pass/fail",
    "archive",
    "아카이브",
  ];

  for (const keyword of forbidden) {
    assert.equal(source.includes(keyword), false, `forbidden language found: ${keyword}`);
  }
});

test("reference module does not include raw user OCR text keys", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  assert.equal(source.includes("raw_ocr"), false);
  assert.equal(source.includes("user_ocr"), false);
  assert.equal(source.includes("rawQuestionText"), false);
});
