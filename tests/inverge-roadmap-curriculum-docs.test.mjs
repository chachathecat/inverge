import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const requiredDocs = [
  "docs/inverge-master-roadmap.md",
  "docs/inverge-curriculum-system.md",
  "docs/inverge-study-schedule-system.md",
  "docs/inverge-explanation-ladder.md",
  "docs/inverge-business-model.md",
  "docs/inverge-addiction-loop.md",
];

const requiredJson = [
  "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/study_tracks.json",
  "reference_corpus/curriculum/appraiser/explanation_ladder.json",
];

const rawTextFieldPatterns = [
  /raw(?:Ocr|OCR|User|Answer|Problem|Question)?Text/i,
  /userAnswerText/i,
  /uploadedProblemText/i,
  /problemText/i,
  /questionText/i,
  /answerText/i,
  /ocrText/i,
  /fullText/i,
  /본문/,
  /문제 전문/,
  /답안 전문/,
  /OCR 원문/,
];

async function read(path) {
  return readFile(path, "utf8");
}

test("all roadmap and curriculum source-of-truth docs exist", async () => {
  for (const path of requiredDocs) {
    const content = await read(path);
    assert.ok(content.length > 400, `${path} should contain substantive source-of-truth content`);
  }
});

test("curriculum reference JSON files exist and are metadata-only", async () => {
  for (const path of requiredJson) {
    const content = await read(path);
    const parsed = JSON.parse(content);
    assert.equal(parsed.needsOfficialVerification, true, `${path} must require official verification`);
    assert.ok(parsed.sourceStatus, `${path} must include sourceStatus`);
    assert.ok(parsed.lastReviewedAt, `${path} must include lastReviewedAt`);
    assert.match(parsed.storagePolicy, /metadata_only/, `${path} must state metadata-only storage`);

    for (const pattern of rawTextFieldPatterns) {
      assert.equal(pattern.test(content), false, `${path} must not include raw text field pattern ${pattern}`);
    }
  }
});

test("copyrighted problem text examples are not included", async () => {
  const combined = await Promise.all([...requiredDocs, ...requiredJson].map(read)).then((parts) => parts.join("\n"));
  const forbiddenPhrases = [
    "다음 중 옳은 것은",
    "다음 중 틀린 것은",
    "위 사례에서",
    "물음 1",
    "물음1",
    "제시문을 읽고",
    "아래 자료를 이용하여",
    "기출문제 원문",
    "문제 전문",
    "답안 전문",
  ];
  for (const phrase of forbiddenPhrases) {
    assert.equal(combined.includes(phrase), false, `must not include copyrighted/raw problem text marker: ${phrase}`);
  }
});

test("explanation ladder includes the four required labels", async () => {
  const doc = await read("docs/inverge-explanation-ladder.md");
  const data = JSON.parse(await read("reference_corpus/curriculum/appraiser/explanation_ladder.json"));
  const labels = new Set(data.labels.map((item) => item.label));

  for (const label of ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"]) {
    assert.ok(doc.includes(label), `doc must include ${label}`);
    assert.ok(labels.has(label), `JSON must include ${label}`);
  }
});

test("study tracks include 1차 and 2차 track templates", async () => {
  const data = JSON.parse(await read("reference_corpus/curriculum/appraiser/study_tracks.json"));
  for (const trackId of ["first_30", "first_60", "first_90", "first_120", "second_90", "second_180", "second_365"]) {
    assert.ok(data.tracks[trackId], `missing ${trackId}`);
  }
  assert.ok(Object.values(data.tracks).some((track) => track.examMode === "first"));
  assert.ok(Object.values(data.tracks).some((track) => track.examMode === "second"));
});

test("docs mention Today Plan max 3 and official verification requirements", async () => {
  const docs = await Promise.all(requiredDocs.map(read)).then((parts) => parts.join("\n"));
  assert.match(docs, /Today Plan(?:[^\n]{0,80})max 3|Today Plan(?:[^\n]{0,80})최대 3|Today Plan[\s\S]{0,120}max three/i);
  assert.match(docs, /Q-Net\/current (?:public notice|official notice) verification|Q-Net\/current official notice verification/);
});

test("existing learner loop remains the roadmap benchmark", async () => {
  const roadmap = await read("docs/inverge-master-roadmap.md");
  for (const term of ["Input", "Diagnosis", "Tracking", "Prediction", "Recommendation", "Execution", "Retry/rewrite"]) {
    assert.ok(roadmap.includes(term), `roadmap must include ${term}`);
  }
  assert.ok(roadmap.includes("input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite"));
  assert.ok(roadmap.includes("감정평가사 1차"));
  assert.ok(roadmap.includes("감정평가사 2차"));
});
