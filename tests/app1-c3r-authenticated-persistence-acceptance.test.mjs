import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

import {
  App1C3rReviewOsAdapterError,
  materializeApp1C3rReviewOsAdapterV1,
} from "../lib/review-os/app1-c3r-review-os-adapter.ts";
import {
  ORACLE_IMAGE,
  ORACLE_PLATFORM,
} from "../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_ID = "11111111-1111-5111-a111-111111111111";
const QUEUE_ID = "22222222-2222-5222-a222-222222222222";
const SIGNAL_ID = "33333333-3333-5333-a333-333333333333";
const DUE_AT = "2026-09-04T00:00:00.000Z";
const UPDATED_AT = "2026-09-03T12:00:00.000Z";
const RAW_MARKER = "SYNTHETIC_RAW_LEARNER_BODY_MUST_NOT_DERIVE";

function candidate() {
  return {
    schemaVersion: "app1_c3r_handoff_candidate.v1",
    state: "D1_UNAIDED_REVIEW_REQUIRED",
    sourceItemId: ITEM_ID,
    conceptNodeId: "synthetic-concept-1",
    track: "THEORY",
    c3rRoute: "/app/c3r-t",
    journeyKey: "app1-c3r:theory:" + ITEM_ID,
    reviewUnitKey: "app1-c3r:theory:" + ITEM_ID + ":d1",
    reviewPhase: "D1",
    assistanceClass: "NONE",
    learnerVisible: true,
    requiresUnaidedAttempt: true,
    sameItemMasteryGainAllowed: false,
    transferEvidenceEligible: false,
    durableC3rJourneyCreated: false,
    durableReviewUnitCreated: false,
    authority: "EXISTING_C3R_AND_REVIEW_QUEUE_ONLY",
  };
}

function rawPayload() {
  return {
    synthetic_raw_answer: RAW_MARKER,
    user_confirmed_fields: {
      persistence_work_revision_id: "revision-1",
    },
    app1_post_insert_replay_v1: {
      itemId: ITEM_ID,
      queueId: QUEUE_ID,
      learningSignalId: SIGNAL_ID,
      workRevisionId: "revision-1",
      queue: {
        scheduleInput: {
          mode: "second",
          isCorrect: false,
          confidence: "낮음",
          mistakeType: "논점 누락",
          hasWeakParagraph: true,
          scheduledAt: UPDATED_AT,
          nextReviewDateOverride: "2026-09-04",
        },
      },
      learningSignal: {
        metadataJson: {
          app1_c3r_handoff_candidate: candidate(),
        },
      },
    },
  };
}

function item() {
  return {
    id: ITEM_ID,
    userId: USER_ID,
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    updatedAt: UPDATED_AT,
    rawPayload: rawPayload(),
  };
}

function sqlLiteral(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function jsonLiteral(value) {
  return sqlLiteral(JSON.stringify(value)) + "::jsonb";
}

function docker(args, options = {}) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

test("authenticated APP-1 save reuses one Queue row and persists one bodyless C3R journey", { timeout: 120_000 }, async () => {
  const dockerCheck = spawnSync("docker", ["version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(dockerCheck.status, 0, dockerCheck.stderr || "docker unavailable");

  const container =
    "inverge-app1-c3r-acceptance-" + process.pid + "-" + Date.now();
  let containerStarted = false;
  const query = (statement, authenticated = true) => {
    const wrapped = authenticated
      ? [
          "begin",
          "set local role authenticated",
          "set local \"request.jwt.claim.sub\" = " +
            sqlLiteral(USER_ID) +
            "",
          statement,
          "commit",
        ].join(";") + ";"
      : statement;
    return docker([
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-At",
      "-c",
      wrapped,
    ]);
  };

  const queueInsert = () =>
    [
      "insert into public.review_queue_items",
      "(id,user_id,exam_id,subject_id,stage,source_submission_id,source_kind,status,raw_payload,derived_payload)",
      "values (" +
        [
          sqlLiteral(QUEUE_ID) + "::uuid",
          sqlLiteral(USER_ID) + "::uuid",
          "'wrong_answer_os'",
          "'감정평가이론'",
          "'alpha'",
          sqlLiteral(ITEM_ID) + "::uuid",
          "'wrong_answer'",
          "'pending'",
          jsonLiteral({ dueAt: DUE_AT }),
          jsonLiteral({ recurrenceCount: 1 }),
        ].join(",") +
        ")",
    ].join(" ");

  try {
    docker([
      "run",
      "--detach",
      "--name",
      container,
      "--platform",
      ORACLE_PLATFORM,
      "--network",
      "none",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912",
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      ORACLE_IMAGE,
    ]);
    containerStarted = true;

    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const probe = spawnSync(
        "docker",
        [
          "exec",
          container,
          "pg_isready",
          "--host",
          "127.0.0.1",
          "-U",
          "postgres",
          "-d",
          "postgres",
        ],
        { encoding: "utf8", windowsHide: true },
      );
      if (probe.status === 0) {
        ready = true;
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
    assert.equal(ready, true, "isolated PostgreSQL did not become ready");

    query(
      [
        "create schema auth",
        "create role authenticated nologin",
        "create table auth.users (id uuid primary key, email text not null)",
        "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$",
        "create table public.wrong_answer_items (id uuid primary key, user_id uuid not null references auth.users(id), exam_name text not null, subject_label text not null, raw_payload jsonb not null, created_at timestamptz not null, updated_at timestamptz not null)",
        "create table public.review_queue_items (id uuid primary key, user_id uuid not null references auth.users(id), exam_id text not null, subject_id text not null, stage text not null, source_submission_id uuid not null references public.wrong_answer_items(id), source_kind text not null, status text not null, raw_payload jsonb not null, derived_payload jsonb not null)",
        "create table public.learning_signal_events (id uuid primary key, user_id uuid not null references auth.users(id), exam_mode text not null, subject text not null, source_type text not null, derived_tags text[] not null, related_formulas text[] not null, next_task_type text not null, next_task text not null, metadata_json jsonb not null, created_at timestamptz not null)",
        "create table public.c3r_evidence_events (id uuid primary key, user_id uuid not null references auth.users(id), evidence_kind text not null)",
        "grant usage on schema auth, public to authenticated",
        "grant select on auth.users to authenticated",
        "grant select, insert, update, delete on public.wrong_answer_items, public.review_queue_items, public.learning_signal_events, public.c3r_evidence_events to authenticated",
        "alter table public.wrong_answer_items enable row level security",
        "alter table public.review_queue_items enable row level security",
        "alter table public.learning_signal_events enable row level security",
        "alter table public.c3r_evidence_events enable row level security",
        "create policy own_wrong_answer on public.wrong_answer_items using (user_id = auth.uid()) with check (user_id = auth.uid())",
        "create policy own_review_queue on public.review_queue_items using (user_id = auth.uid()) with check (user_id = auth.uid())",
        "create policy own_learning_signal on public.learning_signal_events using (user_id = auth.uid()) with check (user_id = auth.uid())",
        "create policy own_c3r_evidence on public.c3r_evidence_events using (user_id = auth.uid()) with check (user_id = auth.uid())",
        "insert into auth.users values (" +
          sqlLiteral(USER_ID) +
          "::uuid, 'synthetic-owner@app1.invalid')",
      ].join(";") + ";",
      false,
    );

    query(
      [
        "insert into public.wrong_answer_items (id,user_id,exam_name,subject_label,raw_payload,created_at,updated_at) values (" +
          [
            sqlLiteral(ITEM_ID) + "::uuid",
            sqlLiteral(USER_ID) + "::uuid",
            "'감정평가사 2차'",
            "'감정평가이론'",
            jsonLiteral(rawPayload()),
            sqlLiteral(UPDATED_AT) + "::timestamptz",
            sqlLiteral(UPDATED_AT) + "::timestamptz",
          ].join(",") +
          ")",
        queueInsert(),
      ].join(";") + ";",
    );

    const storage = {
      async loadReviewQueueUnit(input) {
        const output = query(
          "select row_to_json(q)::text from (select id::text as \"reviewUnitId\", user_id::text as \"userId\", source_submission_id::text as \"itemId\", subject_id as subject, status, raw_payload->>'dueAt' as \"dueAt\", (derived_payload->>'recurrenceCount')::int as \"recurrenceCount\" from public.review_queue_items where id = " +
            sqlLiteral(input.reviewUnitId) +
            "::uuid and user_id = " +
            sqlLiteral(input.userId) +
            "::uuid and source_submission_id = " +
            sqlLiteral(input.itemId) +
            "::uuid) q",
        );
        return output ? JSON.parse(output) : null;
      },
      async ensureJourneyProjection(projection) {
        const metadata = {
          contractVersion: projection.contractVersion,
          journeyKey: projection.journeyKey,
          app1ReceiptId: projection.app1ReceiptId,
          itemId: projection.itemId,
          repairRevisionId: projection.repairRevisionId,
          reviewUnitId: projection.reviewUnitId,
          reviewUnitKey: projection.reviewUnitKey,
          d1DueAt: projection.d1DueAt,
          track: projection.track,
          c3rRoute: projection.c3rRoute,
          state: projection.state,
          masteryCreated: false,
          transferCreated: false,
          containsRawContent: false,
        };
        const status = query(
          "with inserted as (insert into public.learning_signal_events (id,user_id,exam_mode,subject,source_type,derived_tags,related_formulas,next_task_type,next_task,metadata_json,created_at) values (" +
            [
              sqlLiteral(projection.journeyId) + "::uuid",
              sqlLiteral(projection.userId) + "::uuid",
              "'감정평가사 2차'",
              sqlLiteral(projection.subject),
              "'app1_c3r_handoff'",
              "array['app1_c3r','theory','d1_unaided_review_required']",
              "array[]::text[]",
              "'c3r_d1_unaided_review'",
              "'D+1 synthetic unaided review'",
              jsonLiteral(metadata),
              sqlLiteral(projection.createdAt) + "::timestamptz",
            ].join(",") +
            ") on conflict (id) do nothing returning 1) select case when exists(select 1 from inserted) then 'created' else 'existing' end",
        );
        const stored = JSON.parse(
          query(
            "select row_to_json(s)::text from (select id::text as id, user_id::text as \"userId\", subject, metadata_json as metadata from public.learning_signal_events where id = " +
              sqlLiteral(projection.journeyId) +
              "::uuid and user_id = " +
              sqlLiteral(projection.userId) +
              "::uuid) s",
          ),
        );
        assert.equal(stored.id, projection.journeyId);
        assert.equal(stored.userId, projection.userId);
        assert.equal(stored.subject, projection.subject);
        assert.deepEqual(stored.metadata, metadata);
        return {
          status,
          value: projection,
        };
      },
    };

    const first = await materializeApp1C3rReviewOsAdapterV1({
      userId: USER_ID,
      item: item(),
      storage,
    });
    const retry = await materializeApp1C3rReviewOsAdapterV1({
      userId: USER_ID,
      item: item(),
      storage,
    });
    assert.equal(first.journeyStatus, "created");
    assert.equal(retry.journeyStatus, "existing");
    assert.equal(first.reviewUnit.reviewUnitId, QUEUE_ID);
    assert.equal(retry.reviewUnit.reviewUnitId, QUEUE_ID);
    assert.equal(first.queueReused, true);
    assert.equal(first.duplicateQueueCreated, false);

    assert.equal(query("select count(*) from public.wrong_answer_items"), "1");
    assert.equal(query("select count(*) from public.review_queue_items"), "1");
    assert.equal(query("select count(*) from public.learning_signal_events"), "1");
    assert.equal(query("select count(*) from public.c3r_evidence_events"), "0");
    const derived = query(
      "select metadata_json::text from public.learning_signal_events",
    );
    assert.equal(derived.includes(RAW_MARKER), false);
    assert.equal(
      /rawAnswer|rawQuestion|ocr|prompt|learnerBody/iu.test(derived),
      false,
    );
    assert.ok(derived.includes('"masteryCreated": false'));
    assert.ok(derived.includes('"transferCreated": false'));
    assert.ok(derived.includes('"containsRawContent": false'));

    query("delete from public.review_queue_items");
    await assert.rejects(
      () =>
        materializeApp1C3rReviewOsAdapterV1({
          userId: USER_ID,
          item: item(),
          storage,
        }),
      (error) =>
        error instanceof App1C3rReviewOsAdapterError &&
        error.code === "REVIEW_QUEUE_MISSING",
    );
    query(queueInsert());

    const hostileItems = [
      ["item", (value) => {
        value.rawPayload.app1_post_insert_replay_v1.itemId =
          "44444444-4444-5444-a444-444444444444";
      }],
      ["revision", (value) => {
        value.rawPayload.user_confirmed_fields.persistence_work_revision_id =
          "revision-drift";
      }],
      ["route", (value) => {
        value.rawPayload.app1_post_insert_replay_v1.learningSignal.metadataJson
          .app1_c3r_handoff_candidate.c3rRoute = "/app/c3r-l";
      }],
    ];
    for (const [, mutate] of hostileItems) {
      const hostile = structuredClone(item());
      mutate(hostile);
      await assert.rejects(
        () =>
          materializeApp1C3rReviewOsAdapterV1({
            userId: USER_ID,
            item: hostile,
            storage,
          }),
        (error) => error instanceof App1C3rReviewOsAdapterError,
      );
    }

    query(
      "update public.review_queue_items set subject_id = '감정평가 및 보상법규'",
    );
    await assert.rejects(
      () =>
        materializeApp1C3rReviewOsAdapterV1({
          userId: USER_ID,
          item: item(),
          storage,
        }),
      (error) =>
        error instanceof App1C3rReviewOsAdapterError &&
        error.code === "REVIEW_QUEUE_BINDING_CONFLICT",
    );
    query("update public.review_queue_items set subject_id = '감정평가이론'");

    query(
      "update public.review_queue_items set raw_payload = jsonb_set(raw_payload, '{dueAt}', " +
        jsonLiteral("2026-09-05T00:00:00.000Z") +
        ")",
    );
    const mislabeledLaterReview = structuredClone(item());
    mislabeledLaterReview.rawPayload.app1_post_insert_replay_v1.queue
      .scheduleInput.nextReviewDateOverride = "2026-09-05";
    await assert.rejects(
      () =>
        materializeApp1C3rReviewOsAdapterV1({
          userId: USER_ID,
          item: mislabeledLaterReview,
          storage,
        }),
      (error) =>
        error instanceof App1C3rReviewOsAdapterError &&
        error.code === "REVIEW_QUEUE_BINDING_CONFLICT",
    );
    query(
      "update public.review_queue_items set raw_payload = jsonb_set(raw_payload, '{dueAt}', " +
        jsonLiteral(DUE_AT) +
        "), derived_payload = jsonb_set(derived_payload, '{recurrenceCount}', '2'::jsonb)",
    );
    await assert.rejects(
      () =>
        materializeApp1C3rReviewOsAdapterV1({
          userId: USER_ID,
          item: item(),
          storage,
        }),
      (error) =>
        error instanceof App1C3rReviewOsAdapterError &&
        error.code === "REVIEW_QUEUE_BINDING_CONFLICT",
    );
    query(
      "update public.review_queue_items set derived_payload = jsonb_set(derived_payload, '{recurrenceCount}', '1'::jsonb)",
    );

    query(
      "update public.review_queue_items set raw_payload = jsonb_set(raw_payload, '{dueAt}', " +
        jsonLiteral("2026-09-04T00:00:01.000Z") +
        ")",
    );
    await assert.rejects(
      () =>
        materializeApp1C3rReviewOsAdapterV1({
          userId: USER_ID,
          item: item(),
          storage,
        }),
      (error) =>
        error instanceof App1C3rReviewOsAdapterError &&
        error.code === "REVIEW_QUEUE_BINDING_CONFLICT",
    );

    query(
      "delete from public.learning_signal_events; delete from public.review_queue_items; delete from public.c3r_evidence_events; delete from public.wrong_answer_items",
    );
    query(
      "delete from auth.users where id = " + sqlLiteral(USER_ID) + "::uuid",
      false,
    );
    assert.equal(
      query(
        "select (select count(*) from auth.users) || ':' || (select count(*) from public.wrong_answer_items) || ':' || (select count(*) from public.review_queue_items) || ':' || (select count(*) from public.learning_signal_events)",
        false,
      ),
      "0:0:0:0",
    );

    process.stdout.write(
      JSON.stringify({
        acceptance: "APP1_C3R_AUTHENTICATED_PERSISTENCE_ACCEPTED",
        database: "isolated_local_postgresql_15_8",
        syntheticUserCleaned: true,
        syntheticRecordsCleaned: true,
        queueRows: 1,
        journeyRows: 1,
        retryReused: true,
        masteryEvidenceRows: 0,
        transferEvidenceRows: 0,
      }) + "\n",
    );
  } finally {
    if (containerStarted) {
      spawnSync("docker", ["rm", "--force", container], {
        encoding: "utf8",
        windowsHide: true,
      });
    }
  }
});
