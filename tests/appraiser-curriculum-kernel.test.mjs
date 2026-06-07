import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const firstPath = "reference_corpus/curriculum/appraiser/first_exam_curriculum.json";
const secondPath = "reference_corpus/curriculum/appraiser/second_exam_curriculum.json";
const docs = ["docs/inverge-curriculum-system.md", "docs/inverge-study-schedule-system.md", "docs/inverge-explanation-ladder.md"];
const rawFieldPattern = /\b(rawText|rawUserText|rawOcrText|rawAnswerText|rawProblemText|ocrText|userAnswerText|answerText|problemText|questionText|uploadedProblemText|copyrightedText|originalText|fullText|sourceText)\b/;
const problemCopyPattern = /(다음\s+중|옳은\s+것은|틀린\s+것은|제시문|문항|정답\s*[:：])/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function allNodes(document) {
  assert.ok(Array.isArray(document.nodes));
  return document.nodes;
}

test("appraiser curriculum JSON files exist and expose metadata-only nodes", () => {
  assert.equal(existsSync(firstPath), true);
  assert.equal(existsSync(secondPath), true);
  for (const path of [firstPath, secondPath]) {
    const raw = readFileSync(path, "utf8");
    assert.doesNotMatch(raw, rawFieldPattern);
    assert.doesNotMatch(raw, problemCopyPattern);
    const document = JSON.parse(raw);
    assert.match(document.productionVerificationNote, /Q-Net|official sources|official/i);
    for (const node of allNodes(document)) {
      assert.equal(node.sourceStatus, "draft");
      assert.equal(node.needsOfficialVerification, true);
      assert.match(node.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test("first and second appraiser subjects stay in fixed product scope", () => {
  const firstSubjects = new Set(allNodes(readJson(firstPath)).map((node) => node.subject));
  for (const subject of ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"]) {
    assert.equal(firstSubjects.has(subject), true, `${subject} missing`);
  }
  const secondSubjects = new Set(allNodes(readJson(secondPath)).map((node) => node.subject));
  for (const subject of ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"]) {
    assert.equal(secondSubjects.has(subject), true, `${subject} missing`);
  }
});

test("second law and practice nodes carry appropriate answer contracts", () => {
  const secondNodes = allNodes(readJson(secondPath));
  const lawNodes = secondNodes.filter((node) => node.subject === "감정평가 및 보상법규");
  assert.ok(lawNodes.length > 0);
  for (const node of lawNodes) {
    assert.ok(node.issue);
    assert.ok(Array.isArray(node.answerSkeleton));
    assert.ok(node.taskTypes.includes("legal_application"));
    assert.equal(node.taskTypes.includes("casio_step"), false);
  }
  const practiceNodes = secondNodes.filter((node) => node.subject === "감정평가실무");
  assert.ok(practiceNodes.some((node) => node.taskTypes.includes("calculation_template") || node.taskTypes.includes("casio_step")));
});

test("curriculum docs state official verification and raw/private data boundaries", () => {
  for (const path of docs) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /Q-Net|official sources|official/i);
    assert.match(source, /Raw user OCR|raw user OCR|user-owned service data|private/i);
    assert.match(source, /not a question archive/i);
  }
});

test("curriculum engine returns deterministic metadata-only candidates safely", async () => {
  const engine = await import("../lib/review-os/curriculum-engine.ts");
  const first = engine.getAppraiserCurriculumNodes("first");
  const second = engine.getAppraiserCurriculumNodes("second");
  assert.ok(first.length >= 5);
  assert.ok(second.length >= 3);
  assert.equal(engine.findCurriculumNodeById("first_accounting_inventory_lcm")?.topic, "재고자산 저가법");
  assert.deepEqual(engine.findCurriculumCandidates({ examMode: "first", subject: "민법", text: "무효", taskType: "ox" }).map((node) => node.id).includes("first_civil_nullity_rescission"), true);
  assert.deepEqual(engine.findCurriculumCandidates({ examMode: "second", subject: "감정평가실무", text: "수익", taskType: "casio_step" }).length > 0, true);
  assert.deepEqual(engine.findCurriculumCandidates({ examMode: "first", subject: "민법", text: "전혀없는검색어" }), []);
  assert.deepEqual(engine.getDefaultTaskTypesForNode("unknown"), []);
  assert.equal(engine.getDefaultReviewPatternForNode("unknown"), null);
});
