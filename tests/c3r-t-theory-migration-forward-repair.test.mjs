import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runbookPath = path.resolve("docs/qa/c3r-t-theory-migration-forward-repair.md");
const runbook = fs.readFileSync(runbookPath, "utf8");
const enumMigration = "supabase/migrations/20260825054823_c3r_t_theory_durable_learning_delta.sql";
const integrationMigration = "supabase/migrations/20260825055252_c3r_t_theory_common_substrate_integration.sql";

function occurrences(value) {
  return runbook.split(value).length - 1;
}

test("binds both exact Theory migrations once without mutating history", () => {
  assert.equal(occurrences(enumMigration), 1);
  assert.equal(occurrences(integrationMigration), 1);
  assert.match(runbook, /Never edit, replay, or replace either historical migration in place/i);
  assert.match(runbook, /cannot remove the `THEORY` label safely/i);
  assert.doesNotMatch(runbook, /\bDROP\s+(?:TYPE|TABLE|FUNCTION|SCHEMA)\b/i);
});

test("closes every pre-apply and interrupted-apply recovery state", () => {
  assert.match(runbook, /Neither migration applied/i);
  assert.match(runbook, /Only the enum migration applied/i);
  assert.match(runbook, /Integration migration partially or fully applied/i);
  assert.match(runbook, /new forward-only repair migration/i);
  assert.match(runbook, /verified pre-apply database backup/i);
  assert.match(runbook, /separate, explicit remote\/Production and destructive-recovery Owner gate/i);
  assert.match(runbook, /exact catalog diff and separate Owner migration authority/i);
});

test("preserves the default-off, isolation, and zero-remote boundary", () => {
  assert.match(runbook, /remote Supabase and Production mutation count is zero/i);
  assert.match(runbook, /WCV_C3R_T_THEORY_ENABLED=false/);
  assert.match(runbook, /public, payment, and external-learner activation remain off/i);
  assert.match(runbook, /no destructive SQL, linked Supabase command, remote schema\/history repair, or Production operation/i);
  assert.match(runbook, /PostgreSQL 15\.8/);
  assert.match(runbook, /full repository migration history twice/i);
});

test("requires read-only catalog and durable-boundary verification", () => {
  for (const required of [
    "pg_enum",
    "pg_constraint",
    "proargnames",
    "relforcerowsecurity",
    "PRACTICE",
    "THEORY",
    "forced RLS",
    "service-only mutation grants",
    "owner/isolation",
    "restore/export/delete",
    "cleanup",
    "default-off",
  ]) {
    assert.ok(runbook.includes(required), `missing recovery verification: ${required}`);
  }
});
