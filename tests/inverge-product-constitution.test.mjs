import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const requiredDocs = [
  "docs/inverge-product-constitution.md",
  "docs/inverge-master-roadmap.md",
  "docs/inverge-curriculum-system.md",
  "docs/inverge-study-schedule-system.md",
  "docs/inverge-explanation-ladder.md",
  "docs/inverge-data-boundary.md",
  "docs/inverge-addiction-loop.md",
  "docs/inverge-business-model.md",
  "docs/inverge-agent-factory-completion.md",
];

const referenceJsonFiles = [
  "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/study_tracks.json",
  "reference_corpus/curriculum/appraiser/explanation_ladder.json",
];

const explanationLabels = [
  "1타 쉬운풀이",
  "합격 한 줄",
  "출제자 함정",
  "10초 확인",
];

async function read(path) {
  return readFile(path, "utf8");
}

function walk(value, visitor, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visitor(key, child, `${path}.${key}`);
      walk(child, visitor, `${path}.${key}`);
    }
  }
}

test("required product constitution docs exist", async () => {
  for (const path of requiredDocs) {
    assert.equal(existsSync(path), true, `${path} should exist`);
    assert.ok((await read(path)).length > 300, `${path} should contain substantive policy content`);
  }
});

test("product constitution locks the learning OS direction and non-goals", async () => {
  const constitution = await read("docs/inverge-product-constitution.md");

  assert.match(constitution, /not:\s*[\s\S]{0,200}problem bank/i);
  assert.match(constitution, /OCR-only app/i);
  assert.match(constitution, /score-first AI grader/i);
  assert.match(constitution, /manual wrong-answer notebook/i);
  assert.match(constitution, /Capture-to-Plan learning OS/i);
  assert.match(constitution, /learning OS/i);
  assert.match(constitution, /Today Plan max 3/i);
});

test("master roadmap records AF010 through AF016 completion and product transition", async () => {
  const roadmap = await read("docs/inverge-master-roadmap.md");

  assert.match(roadmap, /AF010 through AF016 are complete/i);
  assert.match(roadmap, /Product roadmap work now resumes/i);
  assert.match(roadmap, /Capture-to-Note is prioritized before any public historical archive/i);
  assert.match(roadmap, /Raw historical corpus expansion[\s\S]{0,160}deferred/i);
});

test("docs preserve Today Plan max 3, separation, and no official claims", async () => {
  const docs = (await Promise.all(requiredDocs.map(read))).join("\n");

  assert.match(docs, /Today Plan max 3|Today Plan shows max 3|Today Plan must show \*\*max 3\*\*/i);
  assert.match(docs, /Learner\/Instructor Separation|learner\/instructor separation|learner app.*separate B2B/i);
  assert.match(docs, /official grading/i);
  assert.match(docs, /official model-answer|official model answer/i);
  assert.match(docs, /must not claim[\s\S]{0,180}official grading/i);
});

test("explanation ladder includes all four required labels", async () => {
  const doc = await read("docs/inverge-explanation-ladder.md");
  const data = JSON.parse(await read("reference_corpus/curriculum/appraiser/explanation_ladder.json"));
  const labels = new Set(data.labels.map((item) => item.label));

  for (const label of explanationLabels) {
    assert.ok(doc.includes(label), `doc must include ${label}`);
    assert.ok(labels.has(label), `JSON must include ${label}`);
  }
});

test("curriculum docs mention first-round compatibility and second-round active subjects", async () => {
  const doc = await read("docs/inverge-curriculum-system.md");

  assert.match(doc, /First-round curriculum data[\s\S]{0,120}frozen compatibility metadata/i);
  assert.match(doc, /민법/);
  assert.match(doc, /경제학원론/);
  assert.match(doc, /부동산학원론/);
  assert.match(doc, /감정평가관계법규/);
  assert.match(doc, /회계학/);
  assert.match(doc, /감정평가실무/);
  assert.match(doc, /감정평가이론/);
  assert.match(doc, /감정평가 및 보상법규/);
});

test("study tracks include required compatibility templates", async () => {
  const data = JSON.parse(await read("reference_corpus/curriculum/appraiser/study_tracks.json"));

  for (const trackId of ["first_30", "first_60", "first_90", "first_120", "second_90", "second_180", "second_365"]) {
    assert.ok(data.tracks[trackId], `missing ${trackId}`);
  }
});

test("data boundary forbids raw user OCR answer and problem text in global reference data", async () => {
  const doc = await read("docs/inverge-data-boundary.md");

  assert.match(doc, /no raw learner answer in global reference data/i);
  assert.match(doc, /no raw OCR text in global reference data/i);
  assert.match(doc, /no raw problem or copyrighted question text in global reference data/i);
  assert.match(doc, /Aggregated product intelligence layer/i);
});

test("reference JSON remains metadata-only and free of raw payload fields", async () => {
  const forbiddenKeyPattern = /raw(?:User|Learner|Ocr|OCR|Answer|Problem|Question|Text)|userAnswer|answerText|problemText|questionText|ocrText|ocrPayload|providerPayload|secret|token|apiKey|password/i;

  for (const path of referenceJsonFiles) {
    const parsed = JSON.parse(await read(path));
    assert.ok(parsed.sourceStatus, `${path} must include sourceStatus`);
    assert.equal(parsed.needsOfficialVerification, true, `${path} must require official verification`);
    assert.ok(parsed.lastReviewedAt, `${path} must include lastReviewedAt`);
    assert.match(parsed.storagePolicy, /metadata_only/, `${path} must state metadata-only storage`);

    walk(parsed, (key, value, jsonPath) => {
      assert.equal(forbiddenKeyPattern.test(key), false, `${path} has forbidden raw/provider/secret key at ${jsonPath}`);
      if (typeof value === "string") {
        assert.doesNotMatch(value, /sk-[A-Za-z0-9]{20,}|service_role|PRIVATE KEY|BEGIN RSA/i, `${path} has secret-like value at ${jsonPath}`);
      }
    });
  }
});

test("business model keeps payment execution deferred", async () => {
  const business = await read("docs/inverge-business-model.md");

  assert.match(business, /Commercial execution remains deferred/i);
  assert.match(business, /does not add a payment provider/i);
  assert.match(business, /billing enforcement/i);
  assert.match(business, /usage ledger/i);
});

test("Agent Factory completion keeps future execution approval-gated", async () => {
  const completion = await read("docs/inverge-agent-factory-completion.md");

  assert.match(completion, /AF010 through AF016 completed/i);
  assert.match(completion, /can now plan/i);
  assert.match(completion, /still cannot execute Codex/i);
  assert.match(completion, /Future execution automation remains approval-gated/i);
});
