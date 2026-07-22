#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";

const POSTGRES_IMAGE = "postgres:15.8-bookworm";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const EVIDENCE_PATH = path.resolve(
  process.env.OWNER_ALPHA_RUNTIME_EVIDENCE_PATH ??
    ".agent-factory/owner-alpha-runtime-evidence.json",
);
const MIGRATIONS = [
  "supabase/migrations/20260422_inverge_service_core.sql",
  "supabase/migrations/20260423_inverge_service_role_grants.sql",
  "supabase/migrations/20260424_review_os_alpha.sql",
  "supabase/migrations/20260605_create_personal_concept_nodes.sql",
  "supabase/migrations/20260623_personal_concept_graph_atomic_transition.sql",
  "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
  "supabase/migrations/20260721060237_s233a_answer_review_persistence.sql",
];

function required(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value.toLowerCase();
}

function docker(args, input) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    input,
  });
}

function removeContainer(name) {
  docker(["rm", "--force", name]);
  const result = docker(["inspect", name]);
  return result.status !== 0 && /no such (?:object|container)/i.test(result.stderr);
}

function psql(name, sql, allowFailure = false) {
  const result = docker(
    [
      "exec",
      "--interactive",
      name,
      "psql",
      "--host",
      "127.0.0.1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
    ],
    sql,
  );
  if (!allowFailure && result.status !== 0) {
    throw new Error("isolated Postgres statement failed");
  }
  return result;
}

function scalar(name, sql) {
  const result = psql(name, sql);
  const values = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length !== 1) throw new Error("isolated assertion returned an invalid shape");
  return values[0];
}

function assertScalar(name, sql, expected, label) {
  if (scalar(name, sql) !== expected) throw new Error(`${label} failed`);
}

function authenticated(userId, statements, terminal = "commit") {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" to '${userId}';
    ${statements}
    ${terminal};
  `;
}

function ownerRows(userId, suffix, subject) {
  return `
    insert into public.exam_sessions (
      id,user_id,exam_id,subject_id,stage,session_kind,source_label,raw_payload,derived_payload
    ) values (
      '${suffix}-session','${userId}','appraiser_second','${subject}','owner_alpha_practice_v0',
      'universal_appraisal_practice','Universal Practice v0','{}','{}'
    );
    insert into public.answer_submissions (
      id,user_id,exam_id,subject_id,stage,session_id,submission_kind,raw_payload,derived_payload
    ) values (
      '${suffix}-attempt','${userId}','appraiser_second','${subject}','owner_alpha_practice_v0',
      '${suffix}-session','independent_attempt','{}','{}'
    );
    insert into public.rewrite_submissions (
      id,user_id,exam_id,subject_id,stage,source_submission_id,rewrite_kind,raw_payload,derived_payload
    ) values (
      '${suffix}-rewrite','${userId}','appraiser_second','${subject}','owner_alpha_practice_v0',
      '${suffix}-attempt','recalculate','{}','{}'
    );
    insert into public.wrong_answer_items (
      id,user_id,exam_name,subject_label,source_type,correct_answer,user_answer,confidence,dedupe_key,raw_payload,derived_payload
    ) values (
      '${suffix === "a" ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',
      '${userId}','감정평가사 2차','${subject}','manual','synthetic','synthetic','중간','${suffix}-dedupe','{}','{}'
    );
    insert into public.review_queue_items (
      id,user_id,exam_id,subject_id,stage,source_submission_id,source_kind,status,raw_payload,derived_payload
    ) values (
      '${suffix}-queue','${userId}','wrong_answer_os','${subject}','alpha',
      '${suffix === "a" ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',
      'wrong_answer','pending','{}','{}'
    );
    insert into public.action_seeds (
      id,user_id,source_type,seed_type,rendered_text,raw_payload
    ) values (
      '${suffix === "a" ? "aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb"}',
      '${userId}','next_action','action','synthetic','{}'
    );
    insert into public.usage_events (
      id,user_id,event_name,entity_type,entity_id,metadata_json
    ) values (
      '${suffix === "a" ? "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb"}',
      '${userId}','post_save_execution_completed','owner_alpha_practice_session','${suffix}-session','{}'
    );
  `;
}

function crossUserCountSql(viewerId, targetId) {
  return authenticated(
    viewerId,
    `select
      (select count(*) from public.exam_sessions where user_id = '${targetId}') +
      (select count(*) from public.answer_submissions where user_id = '${targetId}') +
      (select count(*) from public.rewrite_submissions where user_id = '${targetId}') +
      (select count(*) from public.wrong_answer_items where user_id = '${targetId}') +
      (select count(*) from public.review_queue_items where user_id = '${targetId}') +
      (select count(*) from public.action_seeds where user_id = '${targetId}') +
      (select count(*) from public.usage_events where user_id = '${targetId}');`,
    "rollback",
  );
}

function main() {
  const headSha = required(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", /^[0-9a-f]{40}$/i);
  const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
  if (checkoutSha !== headSha) throw new Error("checkout is not the exact PR head");
  const runId = required(process.env.GITHUB_RUN_ID ?? "1", "GITHUB_RUN_ID", /^\d+$/);
  const attempt = required(process.env.GITHUB_RUN_ATTEMPT ?? "1", "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const container = `inverge-owner-alpha-${runId}-${attempt}`;
  fs.rmSync(EVIDENCE_PATH, { force: true });

  try {
    if (!removeContainer(container)) throw new Error("preflight cleanup failed");
    const started = docker([
      "run",
      "--detach",
      "--rm",
      "--name",
      container,
      "--network",
      "none",
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      POSTGRES_IMAGE,
    ]);
    if (started.status !== 0) throw new Error("isolated Postgres failed to start");
    let ready = false;
    for (let index = 0; index < 60; index += 1) {
      const result = docker([
        "exec", container, "pg_isready", "--host", "127.0.0.1", "--username", "postgres",
      ]);
      if (result.status === 0) {
        ready = true;
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
    if (!ready) throw new Error("isolated Postgres readiness failed");

    psql(container, `
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create schema extensions;
      create extension pgcrypto with schema extensions;
      create table auth.users (id uuid primary key);
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant usage on schema extensions to service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
    `);
    for (const migration of MIGRATIONS) {
      psql(container, fs.readFileSync(migration, "utf8"));
    }
    psql(container, `insert into auth.users(id) values ('${USER_A}'), ('${USER_B}');`);
    psql(container, authenticated(USER_A, ownerRows(USER_A, "a", "감정평가이론")));
    psql(container, authenticated(USER_B, ownerRows(USER_B, "b", "감정평가 및 보상법규")));
    psql(
      container,
      authenticated(
        USER_A,
        `insert into public.exam_sessions (
          id,user_id,exam_id,subject_id,stage,session_kind,source_label,raw_payload,derived_payload
        ) values (
          'a-practical-session','${USER_A}','appraiser_second','감정평가실무','owner_alpha_practice_v0',
          'universal_appraisal_practice','Universal Practice v0 · Subject Adapter v1','{}','{}'
        );`,
      ),
    );

    assertScalar(container, crossUserCountSql(USER_A, USER_B), "0", "A cannot read B");
    assertScalar(container, crossUserCountSql(USER_B, USER_A), "0", "B cannot read A");
    assertScalar(
      container,
      authenticated(
        USER_A,
        `with
          sessions as (
            update public.exam_sessions set source_label = 'forged'
            where id = 'b-session' returning id
          ),
          attempts as (
            update public.answer_submissions set source_label = 'forged'
            where id = 'b-attempt' returning id
          ),
          rewrites as (
            update public.rewrite_submissions set rewrite_kind = 'forged'
            where id = 'b-rewrite' returning id
          ),
          records as (
            update public.wrong_answer_items set confidence = 'forged'
            where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id
          ),
          queue as (
            update public.review_queue_items set status = 'forged'
            where id = 'b-queue' returning id
          ),
          today as (
            update public.action_seeds set rendered_text = 'forged'
            where id = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb' returning id
          ),
          usage as (
            update public.usage_events set event_name = 'forged'
            where id = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb' returning id
          )
        select
          (select count(*) from sessions) +
          (select count(*) from attempts) +
          (select count(*) from rewrites) +
          (select count(*) from records) +
          (select count(*) from queue) +
          (select count(*) from today) +
          (select count(*) from usage);`,
        "rollback",
      ),
      "0",
      "seven-table cross-user update",
    );
    const forgedInsert = psql(
      container,
      authenticated(
        USER_A,
        `insert into public.exam_sessions (
          id,user_id,exam_id,stage,session_kind,raw_payload,derived_payload
        ) values ('forged-session','${USER_B}','appraiser_second','owner_alpha_practice_v0',
          'universal_appraisal_practice','{}','{}');`,
        "rollback",
      ),
      true,
    );
    if (
      forgedInsert.status === 0 ||
      !/row-level security policy/i.test(`${forgedInsert.stderr}\n${forgedInsert.stdout}`)
    ) {
      throw new Error("cross-user insert did not fail closed");
    }
    const anonymousRead = psql(
      container,
      "begin; set local role anon; select count(*) from public.exam_sessions; rollback;",
      true,
    );
    if (anonymousRead.status === 0 || !/permission denied/i.test(anonymousRead.stderr)) {
      throw new Error("anonymous read did not fail closed");
    }
  } finally {
    if (!removeContainer(container)) throw new Error("isolated Postgres cleanup failed");
  }

  const evidence = {
    schemaVersion: "owner_alpha_practice_runtime.v1",
    status: "verified",
    pullRequestHeadSha: headSha,
    githubRunId: runId,
    githubRunAttempt: Number(attempt),
    isolatedEnvironment: {
      kind: "disposable_local_postgres",
      engine: "postgresql_15",
      networkExposure: "none",
      syntheticUserCount: 2,
      syntheticSubjectCount: 3,
    },
    contractCoverage: {
      kernelContractVersion: "owner_alpha_universal_appraisal_practice.v0",
      subjectAdapterContractVersion: "owner_alpha_subject_adapter.v1",
      subjects: [
        "appraisal_practical",
        "appraisal_theory",
        "appraisal_compensation_law",
      ],
    },
    assertions: [
      "exact_head_checkout",
      "current_native_and_s233a_migrations_applied",
      "seven_table_owner_rls_insert",
      "three_subject_ids_share_native_rls_tables",
      "two_user_cross_read_denied",
      "seven_table_cross_user_update_denied",
      "cross_user_insert_denied",
      "anonymous_read_denied",
      "cleanup_complete",
    ].map((id) => ({ id, passed: true })),
    dataBoundary: {
      metadataOnly: true,
      rowBodiesPersisted: false,
      learnerTextPersisted: false,
      providerBodiesPersisted: false,
      credentialMaterialPersisted: false,
    },
  };
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: evidence.status, assertions: evidence.assertions.length }));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "owner alpha runtime verification failed");
  process.exitCode = 1;
}
