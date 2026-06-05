import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = "supabase/migrations/20260605_create_personal_concept_nodes.sql";

const requiredColumns = [
  "id uuid primary key",
  "user_id uuid not null references auth.users(id) on delete cascade",
  "exam_mode text not null",
  "subject_id text not null",
  "unit_id text not null",
  "state text not null",
  "confidence text not null",
  "last_result text not null",
  "last_task_type text not null",
  "wrong_count integer not null default 0",
  "recovery_count integer not null default 0",
  "stable_count integer not null default 0",
  "next_recommended_task_type text not null",
  "next_due_at timestamptz not null",
  "updated_at timestamptz not null default now()",
  "created_at timestamptz not null default now()",
  "metadata_only boolean not null default true",
  "version integer not null default 1",
  "source_status text not null default 'production_schema_ready_no_write_path'",
];

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

function normalize(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

async function readMigration() {
  return readFile(migrationPath, "utf8");
}

test("migration creates personal_concept_nodes with required metadata columns", async () => {
  const sql = await readMigration();
  const normalized = normalize(sql);

  assert.match(normalized, /create table if not exists public\.personal_concept_nodes \(/);
  for (const column of requiredColumns) {
    assert.match(normalized, new RegExp(column.replace(/[()]/g, "\\$&")), `missing column definition: ${column}`);
  }
});

test("migration includes key table constraints", async () => {
  const normalized = normalize(await readMigration());

  assert.match(normalized, /unique \(user_id, exam_mode, subject_id, unit_id\)/);
  assert.match(normalized, /exam_mode in \('first', 'second'\)/);
  assert.match(normalized, /state in \('unknown', 'confused', 'wrong', 'recovering', 'stable'\)/);
  assert.match(normalized, /check \(wrong_count >= 0\)/);
  assert.match(normalized, /check \(recovery_count >= 0\)/);
  assert.match(normalized, /check \(stable_count >= 0\)/);
  assert.match(normalized, /metadata_only boolean not null default true/);
  assert.match(normalized, /check \(metadata_only is true\)/);
  assert.match(normalized, /check \(length\(trim\(subject_id\)\) > 0\)/);
  assert.match(normalized, /check \(length\(trim\(unit_id\)\) > 0\)/);
  assert.match(normalized, /check \(length\(trim\(next_recommended_task_type\)\) > 0\)/);
});

test("migration includes required indexes", async () => {
  const normalized = normalize(await readMigration());

  assert.match(normalized, /on public\.personal_concept_nodes \(user_id\)/);
  assert.match(normalized, /on public\.personal_concept_nodes \(user_id, exam_mode\)/);
  assert.match(normalized, /on public\.personal_concept_nodes \(user_id, next_due_at\)/);
  assert.match(normalized, /on public\.personal_concept_nodes \(user_id, state\)/);
  assert.match(normalized, /on public\.personal_concept_nodes \(user_id, exam_mode, next_due_at\)/);
});

test("migration enables RLS and includes own-row policies for all learner operations", async () => {
  const normalized = normalize(await readMigration());

  assert.match(normalized, /alter table public\.personal_concept_nodes enable row level security/);
  assert.match(normalized, /grant select, insert, update, delete on table public\.personal_concept_nodes to authenticated/);

  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(normalized, new RegExp(`create policy "personal_concept_nodes_${operation}_own".* for ${operation} .*to authenticated`));
  }

  assert.match(normalized, /using \(auth\.uid\(\) is not null and user_id = auth\.uid\(\)\)/);
  assert.match(normalized, /with check \(auth\.uid\(\) is not null and user_id = auth\.uid\(\)\)/);
});

test("migration does not introduce broad tenant or public access policies", async () => {
  const sql = await readMigration();
  const normalized = normalize(sql);

  assert.doesNotMatch(normalized, /\bto\s+anon\b/);
  assert.doesNotMatch(normalized, /\bgrant\b[^;]*\bto\s+anon\b/);
  assert.doesNotMatch(normalized, /for select[^;]*using \(true\)/);
  assert.doesNotMatch(normalized, /\bto\s+public\b/);
  assert.doesNotMatch(normalized, /\badmin\b|\binstructor\b|cross-tenant|cross tenant|service_role/);
});

test("migration stays metadata-only and excludes forbidden raw fields", async () => {
  const sql = await readMigration();

  for (const field of forbiddenFields) {
    assert.doesNotMatch(sql, new RegExp(field, "i"), `forbidden field should not appear: ${field}`);
  }
});
