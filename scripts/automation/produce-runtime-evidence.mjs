#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { runtimeRequiredPathRecords } from "./runtime-risk-contract.mjs";

export const SCHEMA_VERSION = "inverge.runtime_evidence.v2";
export const PRODUCER_VERSION = "s233r.postgres.s233a.v1";
export const POSTGRES_IMAGE = "postgres:15.8-bookworm";
export const ASSERTION_IDS = Object.freeze([
  "migration_prerequisites_and_target_applied",
  "learner_rls_two_user_isolation",
  "anonymous_read_denied",
  "cross_user_read_denied",
  "authenticated_direct_mutation_denied",
  "service_rpc_claim_transition_only",
  "fake_grader_single_execution",
  "idempotent_replay_no_duplicate_work",
  "stale_cas_transition_rejected",
  "terminal_review_mutation_rejected",
  "queue_today_atomic_namespace_restricted",
  "cleanup_complete",
]);
export const PREREQUISITE_MIGRATIONS = Object.freeze([
  "supabase/migrations/20260422_inverge_service_core.sql",
  "supabase/migrations/20260423_inverge_service_role_grants.sql",
  "supabase/migrations/20260424_review_os_alpha.sql",
  "supabase/migrations/20260605_create_personal_concept_nodes.sql",
  "supabase/migrations/20260623_personal_concept_graph_atomic_transition.sql",
  "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
]);

export function shouldRunFakeGrader(claimStatus) {
  return claimStatus === "claimed" || claimStatus === "retry_claimed";
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const REVIEW_ID = "s233r-review-a";
const IDEMPOTENCY_KEY = "s233r-idempotency-a";
const INPUT_FINGERPRINT = "a".repeat(64);
const QUEUE_ID = "s233r-queue-a";
const FAILED_QUEUE_ID = "s233r-queue-atomic-failure";
const TODAY_ID = "33333333-3333-4333-8333-333333333333";
const CONFLICT_TODAY_ID = "44444444-4444-4444-8444-444444444444";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  console.error(`runtime-evidence-producer: ${message}`);
  process.exitCode = 1;
}

function safeToken(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function readJsonWithBytes(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} file is missing.`);
  const bytes = fs.readFileSync(filePath);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    throw new Error(`${label} file is not valid JSON.`);
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  let riskFile = process.env.RISK_FILE ?? ".agent-factory/risk.json";
  let cleanupOnly = false;
  let requireComplete = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--risk-file" && args[index + 1]) {
      riskFile = args[index + 1];
      index += 1;
    } else if (args[index] === "--cleanup") {
      cleanupOnly = true;
    } else if (args[index] === "--require-complete") {
      requireComplete = true;
    }
  }
  return { cleanupOnly, requireComplete, riskFile: path.resolve(riskFile) };
}

function executionContext() {
  const headSha = safeToken(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", /^[0-9a-f]{40}$/);
  const runId = safeToken(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const runAttemptText = safeToken(process.env.GITHUB_RUN_ATTEMPT, "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const runAttempt = Number(runAttemptText);
  if (!Number.isSafeInteger(runAttempt) || runAttempt < 1) throw new Error("GITHUB_RUN_ATTEMPT is invalid.");
  return {
    containerName: `inverge-runtime-${runId}-${runAttemptText}`,
    headSha: headSha.toLowerCase(),
    runAttempt,
    runId,
  };
}

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    ...options,
  });
}

function cleanupContainer(containerName) {
  docker(["rm", "--force", containerName]);
  const inspected = docker(["inspect", containerName]);
  if (inspected.status === 0) return false;
  return inspected.status !== null && /no such (?:object|container)/i.test(inspected.stderr);
}

function startContainer(containerName) {
  if (!cleanupContainer(containerName)) throw new Error("isolated Postgres preflight cleanup is incomplete.");
  const started = docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    POSTGRES_IMAGE,
  ]);
  if (started.status !== 0) throw new Error("isolated Postgres failed to start.");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = docker([
      "exec",
      containerName,
      "pg_isready",
      "--host",
      "127.0.0.1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ]);
    if (ready.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error("isolated Postgres did not become ready.");
}

function psql(containerName, sql, { allowFailure = false } = {}) {
  const result = docker(
    [
      "exec",
      "--interactive",
      containerName,
      "psql",
      "--host",
      "127.0.0.1",
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ],
    { input: sql },
  );
  if (!allowFailure && result.status !== 0) throw new Error("isolated Postgres statement failed.");
  return result;
}

function applySql(containerName, sql, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  if (result.status !== 0) throw new Error(`${label} failed to apply.`);
}

function scalar(containerName, sql, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  if (result.status !== 0) throw new Error(`${label} failed.`);
  const values = result.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (values.length !== 1) throw new Error(`${label} returned an invalid result shape.`);
  return values[0];
}

function assertScalar(containerName, sql, expected, label) {
  if (scalar(containerName, sql, label) !== expected) throw new Error(`${label} did not pass.`);
}

function assertSqlDenied(containerName, sql, expectedPattern, label) {
  const result = psql(containerName, sql, { allowFailure: true });
  const diagnostic = `${result.stderr}\n${result.stdout}`;
  if (result.status === 0 || !expectedPattern.test(diagnostic)) throw new Error(`${label} did not fail closed.`);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function ownerRef(userId) {
  return `learner-${sha256(`s233a-owner-ref:${userId}`).slice(0, 32)}`;
}

function identity(version, expectedPreviousVersion, overall) {
  return {
    reviewId: REVIEW_ID,
    learnerOwnerRefId: ownerRef(USER_A),
    reviewRecordVersion: version,
    expectedPreviousReviewRecordVersion: expectedPreviousVersion,
    idempotency: { key: IDEMPOTENCY_KEY, inputFingerprint: INPUT_FINGERPRINT },
    stageStatus: { overall },
    queueTodayLinkage: { reviewQueueItemId: QUEUE_ID, todayPlanTaskId: TODAY_ID },
    rewriteRegradeLineage: { predecessorReviewId: null },
    dataBoundary: { metadataOnly: true, containsRawContent: false },
  };
}

function claimSql(reviewIdentity) {
  return `
    begin;
    set local role service_role;
    select claim_status
      from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(reviewIdentity)}, ${sqlLiteral("receipt-claim-a")}
      );
    commit;
  `;
}

function transitionSql({
  expectedVersion,
  nextIdentity,
  evaluationContext = null,
  evidenceBundles = [],
  conceptTransitions = [],
  queueLinkage = null,
  receiptId,
}) {
  const nullableJson = (value) => value === null ? "null::jsonb" : jsonLiteral(value);
  return `
    begin;
    set local role service_role;
    select result.review_identity ->> 'reviewRecordVersion'
      from public.transition_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${expectedVersion},
        ${jsonLiteral(nextIdentity)}, ${nullableJson(evaluationContext)}, ${jsonLiteral(evidenceBundles)},
        ${jsonLiteral(conceptTransitions)}, ${nullableJson(queueLinkage)}, ${sqlLiteral(receiptId)}
      ) as result;
    commit;
  `;
}

function authenticatedContext(userId, statement) {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" to ${sqlLiteral(userId)};
    ${statement}
    rollback;
  `;
}

function anonymousContext(statement) {
  return `begin; set local role anon; ${statement} rollback;`;
}

function gitBlob(headSha, filePath) {
  try {
    return execFileSync("git", ["show", `${headSha}:${filePath}`], {
      encoding: null,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(`required pull-request file is missing: ${filePath}`);
  }
}

export function resolveTargetMigration(riskResult, headSha) {
  if (riskResult.changedFilesTruncated === true || !Array.isArray(riskResult.changedFiles)) {
    throw new Error("risk classification cannot bind the complete changed-file set.");
  }
  const migrations = riskResult.changedFiles
    .filter((file) => /^supabase\/migrations\/[^/]+\.sql$/.test(file))
    .sort();
  const runtimeRequiredPaths = runtimeRequiredPathRecords(riskResult.changedFiles)
    .map(({ path: file }) => file)
    .sort();
  if (
    migrations.length !== 1 ||
    !/^supabase\/migrations\/\d+_s233a_answer_review_persistence\.sql$/.test(migrations[0]) ||
    runtimeRequiredPaths.length !== 1 ||
    runtimeRequiredPaths[0] !== migrations[0]
  ) {
    throw new Error("no closed runtime-evidence adapter supports this runtime-sensitive change set.");
  }
  const content = gitBlob(headSha, migrations[0]);
  const text = content.toString("utf8");
  for (const requiredMarker of [
    "claim_s233a_answer_review_v1",
    "transition_s233a_answer_review_v1",
    "s233a review queue rpc insert namespace",
    "s233a today seed rpc insert namespace",
  ]) {
    if (!text.includes(requiredMarker)) throw new Error("S233A migration does not match the supported adapter contract.");
  }
  return { content, path: migrations[0], sha256: sha256(content) };
}

function bootstrapSql() {
  return `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create extension pgcrypto with schema extensions;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid
      language sql stable
      set search_path = ''
      as $$
        select coalesce(
          nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
          nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid
      $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    insert into auth.users (id) values (${sqlLiteral(USER_A)}), (${sqlLiteral(USER_B)});
  `;
}

function runDatabaseAssertions(containerName, targetMigration) {
  const passedAssertions = new Set();
  applySql(containerName, bootstrapSql(), "isolated Supabase role bootstrap");
  for (const migrationPath of PREREQUISITE_MIGRATIONS) {
    applySql(containerName, fs.readFileSync(path.resolve(migrationPath), "utf8"), `prerequisite ${migrationPath}`);
  }
  applySql(containerName, targetMigration.content, "pull-request migration");
  assertScalar(
    containerName,
    "select count(*)::text from pg_proc where proname in ('claim_s233a_answer_review_v1', 'transition_s233a_answer_review_v1');",
    "2",
    "migration application assertion",
  );
  passedAssertions.add("migration_prerequisites_and_target_applied");

  let fakeGraderCalls = 0;
  const fakeGrader = () => {
    fakeGraderCalls += 1;
    return { schemaVersion: "fake-deterministic-grader.v1", disposition: "verified", metadataOnly: true };
  };
  const gradeForClaim = (claimStatus) => shouldRunFakeGrader(claimStatus) ? fakeGrader() : null;
  const pendingV1 = identity(1, null, "pending");
  const initialClaimStatus = scalar(containerName, claimSql(pendingV1), "service claim assertion");
  if (initialClaimStatus !== "claimed") throw new Error("service claim assertion did not pass.");
  const fakeEvaluation = gradeForClaim(initialClaimStatus);
  if (!fakeEvaluation) throw new Error("owned claim did not execute the fake deterministic grader.");
  const activeReplayStatus = scalar(containerName, claimSql(pendingV1), "active replay assertion");
  if (activeReplayStatus !== "in_progress" || gradeForClaim(activeReplayStatus) !== null) {
    throw new Error("active replay attempted duplicate grading.");
  }

  const partialV2 = identity(2, 1, "partial");
  assertScalar(
    containerName,
    transitionSql({ expectedVersion: 1, nextIdentity: partialV2, receiptId: "receipt-partial-a" }),
    "2",
    "partial transition assertion",
  );
  assertSqlDenied(
    containerName,
    transitionSql({ expectedVersion: 1, nextIdentity: partialV2, receiptId: "receipt-stale-a" }),
    /s233a_cas_conflict/,
    "stale CAS assertion",
  );
  passedAssertions.add("stale_cas_transition_rejected");

  assertScalar(
    containerName,
    authenticatedContext(USER_A, "select count(*)::text from public.s233a_answer_reviews;"),
    "1",
    "learner A own read assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(USER_B, "select count(*)::text from public.s233a_answer_reviews;"),
    "0",
    "learner B isolation assertion",
  );
  passedAssertions.add("learner_rls_two_user_isolation");
  passedAssertions.add("cross_user_read_denied");
  assertSqlDenied(
    containerName,
    anonymousContext("select count(*) from public.s233a_answer_reviews;"),
    /permission denied/,
    "anonymous read assertion",
  );
  passedAssertions.add("anonymous_read_denied");
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `update public.s233a_answer_reviews set record_version = 99 where review_id = ${sqlLiteral(REVIEW_ID)};`,
    ),
    /permission denied/,
    "authenticated direct mutation assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.s233a_answer_reviews (
        user_id, review_id, idempotency_key, input_fingerprint, record_version,
        review_identity, persistence_receipt_id
      ) values (
        ${sqlLiteral(USER_A)}, 'forged-review', 'forged-idempotency', ${sqlLiteral("b".repeat(64))},
        1, ${jsonLiteral(pendingV1)}, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "authenticated direct insert assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `delete from public.s233a_answer_reviews where review_id = ${sqlLiteral(REVIEW_ID)};`,
    ),
    /permission denied/,
    "authenticated direct delete assertion",
  );
  passedAssertions.add("authenticated_direct_mutation_denied");
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `select claim_status from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(pendingV1)}, ${sqlLiteral("receipt-forged-a")}
      );`,
    ),
    /permission denied/,
    "authenticated RPC assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `select * from public.transition_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, 1, '{}'::jsonb, null::jsonb,
        '[]'::jsonb, '[]'::jsonb, null::jsonb, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "authenticated transition RPC assertion",
  );
  assertSqlDenied(
    containerName,
    anonymousContext(
      `select claim_status from public.claim_s233a_answer_review_v1(
        ${sqlLiteral(USER_A)}, ${sqlLiteral(REVIEW_ID)}, ${sqlLiteral(IDEMPOTENCY_KEY)},
        ${sqlLiteral(INPUT_FINGERPRINT)}, ${jsonLiteral(pendingV1)}, 'forged-receipt'
      );`,
    ),
    /permission denied/,
    "anonymous RPC assertion",
  );
  passedAssertions.add("service_rpc_claim_transition_only");

  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.review_queue_items (
        id, user_id, exam_id, subject_id, stage, source_kind, status
      ) values ('forged-s233a-queue', ${sqlLiteral(USER_A)}, 'appraiser_second', 'law', 'answer_review', 's233a_answer_review', 'pending');`,
    ),
    /row-level security/,
    "Queue namespace assertion",
  );
  assertSqlDenied(
    containerName,
    authenticatedContext(
      USER_A,
      `insert into public.action_seeds (
        id, user_id, source_type, seed_type, rendered_text
      ) values ('55555555-5555-4555-8555-555555555555', ${sqlLiteral(USER_A)}, 's233a_answer_review', 'rewrite', 'synthetic-action');`,
    ),
    /row-level security/,
    "Today namespace assertion",
  );
  assertScalar(
    containerName,
    authenticatedContext(
      USER_A,
      `with inserted as (
        insert into public.review_queue_items (
          id, user_id, exam_id, subject_id, stage, source_kind, status
        ) values ('allowed-non-s233a-queue', ${sqlLiteral(USER_A)}, 'appraiser_second', 'law', 'review', 'submission', 'pending')
        returning 1
      ) select count(*)::text from inserted;`,
    ),
    "1",
    "non-S233A namespace preservation assertion",
  );

  applySql(
    containerName,
    `insert into public.action_seeds (
      id, user_id, source_type, seed_type, rendered_text
    ) values (${sqlLiteral(CONFLICT_TODAY_ID)}, ${sqlLiteral(USER_A)}, 'runtime_fixture', 'fixture', 'synthetic-fixture');`,
    "atomicity fixture",
  );

  const terminalV3 = identity(3, 2, "completed");
  const evidenceBundle = {
    record: {
      emitter: "lane_a",
      state: "detected",
      containsRawContent: false,
      learnerOwnerRefId: ownerRef(USER_A),
      learnerReviewId: REVIEW_ID,
      evidenceStateId: "s233r-evidence-a",
    },
  };
  const conceptTransition = {
    eventId: "s233r-concept-event-a",
    subjectId: "law",
    unitId: "s233r-unit-a",
    taskType: "rewrite",
    result: "correct",
    confidence: "high",
    occurredAt: "2026-07-21T00:00:00.000Z",
    containsRawContent: false,
  };
  const queueLinkage = {
    containsRawContent: false,
    reviewId: REVIEW_ID,
    reviewQueueItemId: QUEUE_ID,
    todayPlanTaskId: TODAY_ID,
    subject: "law",
    answerSubmissionId: "s233r-submission-a",
    priorityScore: 1,
    skillId: "s233r-skill-a",
    actionType: "rewrite",
    dueAt: "2026-07-22T00:00:00.000Z",
    renderedText: "synthetic-next-action",
  };
  const failingQueueLinkage = {
    ...queueLinkage,
    reviewQueueItemId: FAILED_QUEUE_ID,
    todayPlanTaskId: CONFLICT_TODAY_ID,
  };
  const failingIdentity = {
    ...terminalV3,
    queueTodayLinkage: {
      reviewQueueItemId: FAILED_QUEUE_ID,
      todayPlanTaskId: CONFLICT_TODAY_ID,
    },
  };

  assertSqlDenied(
    containerName,
    transitionSql({
      expectedVersion: 2,
      nextIdentity: failingIdentity,
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [conceptTransition],
      queueLinkage: failingQueueLinkage,
      receiptId: "receipt-atomic-failure-a",
    }),
    /duplicate key/,
    "Queue and Today atomic rollback assertion",
  );
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select record_version from public.s233a_answer_reviews where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(FAILED_QUEUE_ID)})
    );`,
    "2:2:0:0:0",
    "atomic rollback persistence assertion",
  );
  const failedTransitionReplayStatus = scalar(
    containerName,
    claimSql(pendingV1),
    "failed-transition replay claim assertion",
  );
  if (
    failedTransitionReplayStatus !== "in_progress" ||
    gradeForClaim(failedTransitionReplayStatus) !== null
  ) {
    throw new Error("failed-transition replay attempted duplicate grading.");
  }
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(FAILED_QUEUE_ID)})
    );`,
    "2:0:0:0",
    "failed-transition replay persistence assertion",
  );

  assertScalar(
    containerName,
    transitionSql({
      expectedVersion: 2,
      nextIdentity: terminalV3,
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [conceptTransition],
      queueLinkage,
      receiptId: "receipt-terminal-a",
    }),
    "3",
    "terminal transition assertion",
  );
  assertSqlDenied(
    containerName,
    transitionSql({
      expectedVersion: 3,
      nextIdentity: identity(4, 3, "completed"),
      evaluationContext: fakeEvaluation,
      evidenceBundles: [evidenceBundle],
      conceptTransitions: [],
      queueLinkage,
      receiptId: "receipt-terminal-mutation-a",
    }),
    /s233a_cas_conflict/,
    "terminal immutability assertion",
  );
  passedAssertions.add("terminal_review_mutation_rejected");

  const replayStatus = scalar(containerName, claimSql(pendingV1), "terminal replay assertion");
  if (replayStatus !== "replayed") throw new Error("terminal replay did not converge.");
  if (gradeForClaim(replayStatus) !== null) throw new Error("terminal replay attempted duplicate grading.");
  if (fakeGraderCalls !== 1) throw new Error("fake deterministic grader execution count is invalid.");
  passedAssertions.add("fake_grader_single_execution");
  assertScalar(
    containerName,
    `select concat_ws(':',
      (select count(*) from public.s233a_answer_review_revisions where user_id = ${sqlLiteral(USER_A)} and review_id = ${sqlLiteral(REVIEW_ID)}),
      (select count(*) from public.s233a_evidence_state_records where user_id = ${sqlLiteral(USER_A)}),
      (select count(*) from public.personal_concept_transition_events where user_id = ${sqlLiteral(USER_A)} and event_id = 's233r-concept-event-a'),
      (select count(*) from public.review_queue_items where id = ${sqlLiteral(QUEUE_ID)}),
      (select count(*) from public.action_seeds where id = ${sqlLiteral(TODAY_ID)})
    );`,
    "3:1:1:1:1",
    "idempotent persistence assertion",
  );
  passedAssertions.add("idempotent_replay_no_duplicate_work");
  passedAssertions.add("queue_today_atomic_namespace_restricted");
  return passedAssertions;
}

function writeEvidence({ context, migration, passedAssertions, riskBytes }) {
  const evidencePath = process.env.RUNTIME_EVIDENCE_PATH;
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const resolvedPath = path.resolve(evidencePath);
  const evidence = {
    schemaVersion: SCHEMA_VERSION,
    producerVersion: PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    verifiedAt: new Date().toISOString(),
    pullRequestHeadSha: context.headSha,
    githubRunId: context.runId,
    githubRunAttempt: context.runAttempt,
    riskFileSha256: sha256(riskBytes),
    migrations: [{ path: migration.path, sha256: migration.sha256 }],
    isolatedEnvironment: {
      kind: "disposable_local_postgres",
      engine: "postgresql_15",
      networkExposure: "none",
      syntheticUserCount: 2,
    },
    assertions: ASSERTION_IDS.map((id) => ({ id, passed: passedAssertions.has(id) })),
    cleanup: { status: "complete" },
    dataBoundary: {
      metadataOnly: true,
      rawLearnerContentPersisted: false,
      sourceTextPersisted: false,
      credentialMaterialPersisted: false,
      learnerIdentifiersPersisted: false,
      rowBodiesPersisted: false,
      providerBodiesPersisted: false,
    },
  };
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const temporaryPath = `${resolvedPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, resolvedPath);
  console.log(JSON.stringify({ status: "verified", assertionsPassed: ASSERTION_IDS.length, cleanup: "complete" }));
}

function produce(riskFile) {
  const context = executionContext();
  const { bytes: riskBytes, value: riskResult } = readJsonWithBytes(riskFile, "risk classification");
  if (riskResult.runtimeEvidenceRequired !== true) throw new Error("runtime evidence was not requested.");
  const migration = resolveTargetMigration(riskResult, context.headSha);
  let cleanupComplete = false;
  let passedAssertions;
  try {
    startContainer(context.containerName);
    passedAssertions = runDatabaseAssertions(context.containerName, migration);
  } finally {
    cleanupComplete = cleanupContainer(context.containerName);
  }
  if (!cleanupComplete) throw new Error("isolated Postgres cleanup is incomplete.");
  passedAssertions.add("cleanup_complete");
  if (
    passedAssertions.size !== ASSERTION_IDS.length ||
    ASSERTION_IDS.some((id) => !passedAssertions.has(id))
  ) {
    throw new Error("required runtime assertion set is incomplete.");
  }
  writeEvidence({ context, migration, passedAssertions, riskBytes });
}

function main() {
  const options = parseArguments();
  if (options.cleanupOnly) {
    const complete = cleanupContainer(executionContext().containerName);
    if (options.requireComplete && !complete) throw new Error("isolated Postgres cleanup is incomplete.");
    console.log(JSON.stringify({ cleanup: complete ? "complete" : "incomplete" }));
    return;
  }
  produce(options.riskFile);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
