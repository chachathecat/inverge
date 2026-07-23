import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const requiredDocs = [
  "docs/dabangil-unified-program-contract.md",
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

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) return listFiles(path);
    return path;
  }));
  return files.flat();
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


test("verified curriculum references cite public sources and keep internal mappings unverified", async () => {
  for (const path of requiredJson.filter((item) => !item.endsWith("explanation_ladder.json"))) {
    const parsed = JSON.parse(await read(path));
    assert.ok(Array.isArray(parsed.sourceReferences) && parsed.sourceReferences.length >= 2, `${path} must include sourceReferences`);
    assert.ok(parsed.sourceReferences.some((source) => source.url.includes("law.go.kr")), `${path} must cite the public statutory source`);

    if (path.endsWith("study_tracks.json")) {
      for (const [trackId, track] of Object.entries(parsed.tracks)) {
        assert.equal(track.sourceStatus, "draft", `${trackId} must remain draft internal planning metadata`);
        assert.equal(track.needsOfficialVerification, true, `${trackId} must not be official curriculum`);
      }
      continue;
    }

    for (const subject of parsed.subjects) {
      assert.equal(subject.sourceStatus, "draft", `${subject.id} subject label must remain draft until exact official-source verification is recorded`);
      assert.equal(subject.needsOfficialVerification, true, `${subject.id} subject label must not be production authoritative`);
      for (const unit of subject.units) {
        assert.equal(unit.sourceStatus, "draft", `${unit.id} unit must remain internal mapping`);
        assert.equal(unit.needsOfficialVerification, true, `${unit.id} unit must not be falsely marked official`);
      }
    }
  }
});


test("first exam docs document English as official but excluded from active learning", async () => {
  const doc = await read("docs/inverge-curriculum-system.md");
  const firstExam = JSON.parse(await read("reference_corpus/curriculum/appraiser/first_exam_curriculum.json"));

  assert.ok(firstExam.officialExamSubjects.includes("영어"));
  assert.ok(firstExam.excludedOfficialSubjects.some((subject) => subject.name === "영어" && subject.reason.length > 20));
  assert.equal(firstExam.activeLearningSubjects.includes("영어"), false);
  assert.equal(firstExam.sourceStatus, "draft");
  assert.match(firstExam.verificationNote, /English|영어/);
  assert.match(doc, /Official 감정평가사 1차 includes 영어/);
  assert.match(doc, /does not model 영어 as an active learning curriculum track/);
  assert.match(doc, /product-scope exclusion, not a claim that 영어 is absent/);
  assert.match(doc, /Internal units remain internal planning metadata/);
});

test("English official-subject metadata does not introduce English learner route or UI scope", async () => {
  const appAndComponentFiles = (await Promise.all([listFiles("app"), listFiles("components")])).flat();
  const routePaths = appAndComponentFiles.filter((path) => /(^|\/)page\.tsx$|(^|\/)route\.ts$/.test(path));

  assert.equal(routePaths.some((path) => /english|영어/i.test(path)), false, "must not add an English learner route");

  for (const path of appAndComponentFiles.filter((filePath) => /\.(tsx|ts)$/.test(filePath))) {
    const content = await read(path);
    assert.equal(/영어/.test(content), false, `${path} must not expose 영어 as learner UI scope`);
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

test("legacy first-round templates stay frozen while Foundation contracts are separately queued", async () => {
  const curriculum = await read("docs/inverge-curriculum-system.md");
  const schedule = await read("docs/inverge-study-schedule-system.md");
  const roadmap = await read("docs/inverge-master-roadmap.md");
  const unified = await read("docs/dabangil-unified-program-contract.md");

  assert.match(curriculum, /legacy metadata[\s\S]{0,180}Foundation/i);
  assert.match(curriculum, /does not authorize[\s\S]{0,160}learner runtime/i);
  assert.match(curriculum, /historical PR covered first\/second compatibility metadata[\s\S]{0,180}does not\s+authorize current first-round learner-facing scope or runtime/i);
  assert.match(curriculum, /unpromoted curriculum material[\s\S]{0,300}approved Cleared Content Bank promotion[\s\S]{0,120}does not authorize that path/i);
  assert.match(schedule, /frozen compatibility metadata[\s\S]{0,260}Foundation lane owns new contracts only/i);
  assert.match(roadmap, /S235A[\s\S]{0,180}S235B/);
  assert.match(roadmap, /first-round runtime[\s\S]{0,180}queued behind unmet dependencies/i);
  assert.match(unified, /Q-Net rights evidence per post and per attached asset/i);
  assert.match(unified, /rapid answer grid/i);
  assert.match(unified, /five-choice true\/false correction and explanation/i);
  assert.match(unified, /`K\/C\/A\/R\/T\/G`/);
  assert.match(unified, /timed\/OMR readiness contracts/i);
});

test("docs mention Today Plan max 3 and official verification requirements", async () => {
  const docs = await Promise.all(requiredDocs.map(read)).then((parts) => parts.join("\n"));
  assert.match(docs, /Today Plan(?:[^\n]{0,80})max 3|Today Plan(?:[^\n]{0,80})최대 3|Today Plan[\s\S]{0,120}max three/i);
  assert.match(docs, /Q-Net\/current (?:public notice|official notice) verification|Q-Net\/current official notice verification|public official sources/);
});

test("docs preserve metadata-only raw OCR answer and problem text prohibition", async () => {
  const docs = await Promise.all(requiredDocs.map(read)).then((parts) => parts.join("\n"));

  assert.match(docs, /raw user OCR|raw OCR/i);
  assert.match(docs, /raw answer/i);
  assert.match(docs, /raw problem text|copyrighted problem text/i);
  assert.match(docs, /metadata(?:-| )only|safe metadata/i);
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
