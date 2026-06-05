import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const docPath = "docs/persistence/personal-concept-graph-persistence-design.md";
const packagePath = "package.json";

const requiredColumns = [
  "id",
  "user_id",
  "exam_mode",
  "subject_id",
  "unit_id",
  "state",
  "confidence",
  "last_result",
  "last_task_type",
  "wrong_count",
  "recovery_count",
  "stable_count",
  "next_recommended_task_type",
  "next_due_at",
  "updated_at",
  "metadata_only",
];

const optionalColumns = ["created_at", "version", "source_status"];

const forbiddenFields = [
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
  "officialAnswer",
  "modelAnswer",
  "scorePrediction",
  "instructorComment",
];

async function read(path) {
  return readFile(path, "utf8");
}

test("Personal Concept Graph persistence design doc exists", async () => {
  const content = await read(docPath);
  assert.ok(content.length > 1000, "design doc should be substantive");
});

test("design doc includes proposed table name and columns", async () => {
  const content = await read(docPath);

  assert.match(content, /personal_concept_nodes/);
  for (const column of [...requiredColumns, ...optionalColumns]) {
    assert.match(content, new RegExp(`\\b${column}\\b`), `missing proposed column: ${column}`);
  }
  assert.match(content, /user_id \+ exam_mode \+ subject_id \+ unit_id/);
  assert.match(content, /Allowed values: `first`, `second`/);
  assert.match(content, /`unknown`, `confused`, `wrong`, `recovering`, and `stable`/);
});

test("design doc explicitly forbids raw OCR, problem, answer, and grading fields", async () => {
  const content = await read(docPath);

  for (const field of forbiddenFields) {
    assert.match(content, new RegExp(`\\b${field}\\b`), `missing forbidden field: ${field}`);
  }
  assert.match(content, /must not store raw OCR, problem, answer, source, official-answer, model-answer, grading, or instructor-feedback text/i);
});

test("design doc documents intended RLS boundaries and no public read access", async () => {
  const content = await read(docPath);

  assert.match(content, /Row-level security assumptions/);
  assert.match(content, /User can select only own rows/i);
  assert.match(content, /User can insert only own rows/i);
  assert.match(content, /User can update only own rows/i);
  assert.match(content, /User can delete only own rows/i);
  assert.match(content, /No public read access/i);
  assert.match(content, /No instructor cross-tenant access/i);
  assert.match(content, /No global training corpus access to raw user data/i);
});

test("design doc states no Supabase migration or production write path is added in this PR", async () => {
  const content = await read(docPath);

  assert.match(content, /No Supabase migration is created in this PR/i);
  assert.match(content, /This PR intentionally does not add a Supabase migration or production database writes/i);
  assert.match(content, /No production database writes/i);
});

test("design doc keeps learner product scope to 감정평가사 1차 and 2차", async () => {
  const content = await read(docPath);

  assert.match(content, /감정평가사 1차/);
  assert.match(content, /감정평가사 2차/);
  assert.doesNotMatch(content, /보험계리사|계리사|CPA|세무사|TOEFL|SAT|generic multi-exam|universal exam/i);
});

test("design doc does not include copied copyrighted problem text", async () => {
  const content = await read(docPath);

  assert.doesNotMatch(content, /제\s*\d+\s*문[\s\S]{80,}/, "must not include full exam problem blocks");
  assert.doesNotMatch(content, /문제\s*전문|답안\s*전문|OCR\s*원문/, "must not include full source text labels");
  assert.match(content, /must not persist copyrighted problem text/i);
});

test("learner-loop verify script includes the persistence design guardrail", async () => {
  const pkg = JSON.parse(await read(packagePath));
  assert.match(pkg.scripts["verify:learner-loop:ci"], /tests\/personal-concept-graph-persistence-design\.test\.mjs/);
});
