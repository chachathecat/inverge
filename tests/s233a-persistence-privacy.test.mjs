import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { validateS233aAdditiveMigrationSql } from "../lib/review-os/s233a-additive-sql-validator.ts";

const migrationPath = "supabase/migrations/20260721060237_s233a_answer_review_persistence.sql";

test("trusted SQL validator binds the one additive migration to its exact content hash", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const review = validateS233aAdditiveMigrationSql({ path: migrationPath, sql });
  assert.equal(review.validatorId, "trusted_sql_additivity_validator");
  assert.equal(review.verdict, "additive_only");
  assert.equal(review.destructiveOperationsDetected, false);
  assert.match(review.contentSha256, /^[0-9a-f]{64}$/);
  assert.throws(
    () => validateS233aAdditiveMigrationSql({ path: migrationPath, sql: `${sql}\ndrop table public.s233a_answer_reviews;` }),
    /destructive-operation/,
  );
});

test("migration enforces learner RLS, RPC-only writes, CAS, terminal immutability, and atomic lineage", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /record_version <> p_expected_version/);
  assert.match(sql, /request_active boolean not null default true/);
  assert.match(sql, /'retry_claimed'::text/);
  assert.match(sql, /'in_progress'::text/);
  assert.match(sql, /v_existing\.terminal/);
  assert.match(sql, /insert into public\.s233a_answer_review_revisions/);
  assert.match(sql, /insert into public\.s233a_evidence_state_records/);
  assert.match(sql, /transition_personal_concept_node_v1/);
  assert.match(sql, /insert into public\.review_queue_items/);
  assert.match(sql, /insert into public\.action_seeds/);
  assert.equal(/security\s+definer/i.test(sql), false);
  assert.equal(sql.match(/security\s+invoker/gi)?.length, 2);
  assert.match(sql, /set search_path = ''/g);
  assert.match(sql, /current_user::text <> 'service_role'/g);
  assert.match(sql, /p_user_id uuid/g);
  assert.match(sql, /set_config\('request\.jwt\.claim\.sub', v_user_id::text, true\)/);
  assert.match(sql, /'request\.jwt\.claims'/);
  assert.match(sql, /revoke insert, update, delete on table public\.s233a_answer_reviews from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.s233a_answer_reviews to authenticated/);
  assert.match(sql, /revoke all on function public\.claim_s233a_answer_review_v1[\s\S]+from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.claim_s233a_answer_review_v1[\s\S]+to service_role/);
  for (const command of ["insert", "update", "delete"]) {
    assert.match(sql, new RegExp(`create policy "s233a review queue rpc ${command} namespace" on public\\.review_queue_items[\\s\\S]+as restrictive for ${command} to authenticated[\\s\\S]+coalesce\\(source_kind, ''\\) <> 's233a_answer_review'`));
    assert.match(sql, new RegExp(`create policy "s233a today seed rpc ${command} namespace" on public\\.action_seeds[\\s\\S]+as restrictive for ${command} to authenticated[\\s\\S]+coalesce\\(source_type, ''\\) <> 's233a_answer_review'`));
  }
  assert.equal(/as restrictive for select to authenticated/.test(sql), false);
  assert.equal(/grant\s+[^;]*\b(?:insert|update|delete)\b[^;]*\bto\s+authenticated\s*;/i.test(sql), false);
  assert.equal(/\b(answer_text|ocr_text|provider_body|credential)\b/i.test(sql), false);
  assert.match(sql, /revoke all on function[\s\S]+from public, anon/);
});

test("API route requires real authentication and never logs or returns raw learner content", async () => {
  const route = await readFile("app/api/answer-review/s233a/route.ts", "utf8");
  const repository = await readFile("lib/review-os/s233a-supabase-repository.ts", "utf8");
  assert.match(route, /session\.isAuthenticated/);
  assert.match(route, /MAX_REQUEST_BYTES/);
  assert.match(route, /await assertCanRunAnswerReview\(session\.userId\)/);
  assert.match(route, /answer_review_structure_success/);
  assert.match(route, /result\.cascadeBundle\?\.trace\.primarySubjectGrader\.status !== "not_run"/);
  assert.ok(route.indexOf("await assertCanRunAnswerReview(session.userId)") < route.indexOf("const primary = createS233aGeminiPrimaryGrader()"));
  assert.match(route, /"answer_review",\s*null,\s*\{ runtimeVersion: "s233a", subject: input\.subject \}/);
  assert.equal(/entityId:\s*(?:input|result|session)/.test(route), false);
  assert.equal(/console\.|logServerEvent|rawAnswerText|rawOcrText/.test(route), false);
  assert.equal(/answerText:\s*result|questionText:\s*result/.test(route), false);
  assert.match(route, /findings: result\.findingBundles/);
  assert.match(route, /evidenceStates: result\.evidenceBundles/);
  assert.match(repository, /auth\.data\.user\.id !== authenticatedUserId/);
  assert.match(repository, /createSupabaseAdminClient/);
  assert.match(repository, /p_user_id: authenticatedUserId/);
});

test("SQL validator rejects destructive, direct-write, and unsecured privileged variants", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.throws(() => validateS233aAdditiveMigrationSql({ path: migrationPath, sql: `${sql}\ndelete from public.review_queue_items;` }), /destructive/);
  assert.throws(
    () => validateS233aAdditiveMigrationSql({
      path: migrationPath,
      sql: `${sql}\ngrant update on table public.s233a_answer_reviews to authenticated;`,
    }),
    /authenticated-direct-write/,
  );
  assert.throws(
    () => validateS233aAdditiveMigrationSql({ path: migrationPath, sql: sql.replace("security invoker", "security definer") }),
    /privileged-function-boundary/,
  );
  assert.throws(
    () => validateS233aAdditiveMigrationSql({
      path: migrationPath,
      sql: sql.replace("as restrictive for insert to authenticated", "as permissive for insert to authenticated"),
    }),
    /queue-today-write-boundary/,
  );
});
