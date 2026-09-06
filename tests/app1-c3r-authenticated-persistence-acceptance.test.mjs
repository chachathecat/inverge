import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { productionHarness, completedQueueRetryScenario, seedRows, OWNER_ID, RAW_MARKER as PRODUCTION_RAW_MARKER } from "./fixtures/app1-production-persistence-harness.mjs";

import {
  App1C3rReviewOsAdapterError,
  materializeApp1C3rReviewOsAdapterV1,
} from "../lib/review-os/app1-c3r-review-os-adapter.ts";
import { resolveApp1FirstRecurrenceD1Schedule } from "../lib/review-os/scheduling.ts";
import {
  ORACLE_IMAGE,
  ORACLE_PLATFORM,
} from "../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_ID = "11111111-1111-5111-a111-111111111111";
const QUEUE_ID = "22222222-2222-5222-a222-222222222222";
const SIGNAL_ID = "33333333-3333-5333-a333-333333333333";
const UPDATED_AT = "2026-09-03T12:00:00.000Z";
const PRODUCTION_SCHEDULE_INPUT = Object.freeze({
  mode: "second",
  isCorrect: false,
  confidence: "낮음",
  mistakeType: "논점 누락",
  recurrenceCount: 1,
  reviewUnitRecurrenceCount: 1,
  hasWeakParagraph: true,
  now: new Date(UPDATED_AT),
  nextReviewDateOverride: null,
});

// Ten complete repairs plus cross-worker retries use disposable psql transports.
// The former five-repair 240s budget expires before the added completion cases.
test("actual authenticated production constructor/service/repository recover repeat repairs in isolated PostgreSQL", { timeout: 900_000 }, async () => {
  const container = `inverge-app1-production-${process.pid}-${Date.now()}`;
  let started = false;
  const sql = (statement, authenticated = true) => new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-q", "-At"], { windowsHide: true });
    let out = "", err = "";
    child.stdout.on("data", b => { out += b; });
    child.stderr.on("data", b => { err += b; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
    child.stdin.end("\\set VERBOSITY verbose\n" + (authenticated
      ? `begin; set local role authenticated; set local "request.jwt.claim.sub" = ${sqlLiteral(OWNER_ID)}; ${statement}; commit;`
      : statement));
  });
  const tableNames = Object.keys(seedRows());
  const identifier = value => { assert.match(value, /^[a-z_]+$/); return `"${value}"`; };
  const expression = field => {
    if (field.includes("->>")) { const [column, key] = field.split("->>"); return `${identifier(column)}->>${sqlLiteral(key)}`; }
    return identifier(field);
  };
  const literal = value => value === null ? "null" : typeof value === "object" ? jsonLiteral(value) : sqlLiteral(value);
  const transport = async q => {
    assert.ok(tableNames.includes(q.table));
    const table = `public.${identifier(q.table)}`;
    const predicates = q.filters.map(([field, operator, value]) => operator === "notNull"
      ? `${expression(field)} is not null` : operator === "in"
      ? `${expression(field)} in (${value.map(literal).join(",")})`
      : `${expression(field)} ${operator === "eq" ? "=" : operator === "lt" ? "<" : ">="} ${literal(value)}`);
    const where = predicates.length ? " where " + predicates.join(" and ") : "";
    try {
      if (q.operation === "insert") {
        const columns = Object.keys(q.values);
        await sql(`insert into ${table} (${columns.map(identifier).join(",")}) select ${columns.map(identifier).join(",")} from jsonb_populate_record(null::${table}, ${jsonLiteral(q.values)})`);
        return { data: null, error: null };
      }
      if (q.operation === "update") {
        const columns = Object.keys(q.values).map(identifier).join(",");
        await sql(`update ${table} set (${columns}) = (select ${columns} from jsonb_populate_record(null::${table}, ${jsonLiteral(q.values)}))${where}`);
        return { data: null, error: null };
      }
      const count = q.count ? Number(await sql(`select count(*) from ${table}${where}`)) : undefined;
      if (q.head) return { count, data: null, error: null };
      const columns = q.columns === "*" ? "*" : q.columns.split(",").map(c => identifier(c.trim())).join(",");
      const ordering = q.orders ? " order by " + q.orders.map(([field,asc]) => `${expression(field)} ${asc ? "asc" : "desc"}`).join(",") : "";
      const paging = q.range ? ` limit ${q.range[1]-q.range[0]+1} offset ${q.range[0]}` : q.limit !== undefined ? ` limit ${q.limit}` : "";
      const rows = JSON.parse(await sql(`select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (select ${columns} from ${table}${where}${ordering}${paging}) r`));
      return { data: q.single ? rows[0] ?? null : rows, count, error: null };
    } catch (error) {
      if (/23505/.test(error.message)) return { data: null, error: { code: "23505" } };
      throw error;
    }
  };
  try {
    docker(["run", "--detach", "--name", container, "--platform", ORACLE_PLATFORM, "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", ORACLE_IMAGE]);
    started = true;
    let ready = false;
    for (let attempt=0; attempt<60; attempt++) {
      // The image's temporary initialization server accepts Unix sockets only.
      const probe=spawnSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { windowsHide: true });
      if(probe.status===0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve,250));
    }
    assert.equal(ready, true, "isolated PostgreSQL final server must be ready");
    await sql(`
      create schema auth; create role authenticated nologin;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table profiles(user_id uuid primary key references auth.users(id), email text, invite_status text, entitlement_tier text, updated_at timestamptz default now());
      create table wrong_answer_items(id uuid primary key, user_id uuid references auth.users(id), exam_name text, subject_label text, source_type text, source_label text, problem_title text, problem_identifier text, raw_question_text text, raw_answer_text text, correct_answer text, user_answer text, user_reason_text text, user_reason_preset text, confidence text, time_spent_seconds numeric, dedupe_key text, processing_status text, raw_payload jsonb, derived_payload jsonb, created_at timestamptz default now(), updated_at timestamptz default now(), unique(user_id,dedupe_key));
      create table wrong_answer_notes(id uuid primary key, wrong_answer_item_id uuid references wrong_answer_items(id), ai_summary text, key_distinction text, review_checkpoint text, next_try_tip text, generation_source text, created_at timestamptz default now());
      create table wrong_answer_tags(id uuid primary key, wrong_answer_item_id uuid references wrong_answer_items(id), topic_tag text, mistake_type text, task_type text, classifier_source text, confidence numeric, recurrence_candidate boolean, created_at timestamptz default now());
      create table recurrence_features(id uuid primary key, user_id uuid references auth.users(id), exam_name text, subject_label text, topic_tag text, mistake_type text, recurrence_count integer, last_seen_at timestamptz, risk_level text, created_at timestamptz default now(), updated_at timestamptz default now(), unique(user_id,exam_name,subject_label,topic_tag,mistake_type));
      create table review_queue_items(id uuid primary key, user_id uuid references auth.users(id), exam_id text, subject_id text, stage text, source_submission_id uuid references wrong_answer_items(id), source_kind text, status text, priority_score numeric, raw_payload jsonb, derived_payload jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
      create table learning_signal_events(id uuid primary key, user_id uuid references auth.users(id), exam_mode text, subject text, source_type text, derived_tags text[], related_formulas text[], next_task_type text, next_task text, metadata_json jsonb, created_at timestamptz default now());
      create table usage_events(id uuid primary key, user_id uuid references auth.users(id), event_name text, entity_type text, entity_id uuid, metadata_json jsonb, created_at timestamptz default now());
      grant usage on schema auth,public to authenticated; grant select on auth.users to authenticated;
      grant select,insert,update,delete on all tables in schema public to authenticated;
      ${tableNames.map(table => `alter table ${table} enable row level security; alter table ${table} force row level security; create policy own_row on ${table} to authenticated using (${table === "wrong_answer_notes" || table === "wrong_answer_tags" ? "exists(select 1 from wrong_answer_items i where i.id=wrong_answer_item_id and i.user_id=auth.uid())" : "user_id=auth.uid()"});`).join("\n")}
      insert into auth.users values (${sqlLiteral(OWNER_ID)},'synthetic-owner@example.invalid');
    `, false);
    for (const [table, rows] of Object.entries(seedRows())) for (const values of rows) await transport({ table, values, operation: "insert", filters: [] });
    assert.equal(await sql("select current_user || ':' || auth.uid()"), `authenticated:${OWNER_ID}`);
    const app=productionHarness(transport);
    const saved=[];
    const first=await app.save(await app.command("postgres-prior"));
    assert.equal(first.status,200,JSON.stringify(first.body)); saved.push(first.body.item.id);
    for (const table of ["wrong_answer_items", "review_queue_items"]) {
      let fail=true;
      const interrupted=productionHarness(transport, { afterQuery(q,result) {
        if(fail && q.operation==="insert" && q.table===table && !result.error) { fail=false; throw new Error("synthetic-response-loss"); }
      } });
      const command=await app.command(`postgres-${table}`);
      assert.equal((await interrupted.save(command)).status,500);
      const results=await Promise.all([app.save(command),productionHarness(transport).save(command)]);
      for(const result of results) assert.equal(result.status,200,JSON.stringify(result.body));
      assert.equal(results[0].body.item.id,results[1].body.item.id); saved.push(results[0].body.item.id);
      assert.equal((await app.save(command)).status,200);
    }
    // Also exercise competing first inserts in independent worker graphs.
    const command=await app.command("postgres-concurrent-new");
    const results=await Promise.all([app.save(command),productionHarness(transport, { now: "2026-09-06T10:00:01.000Z" }).save(command)]);
    for(const result of results) assert.equal(result.status,200,JSON.stringify(result.body));
    assert.equal(results[0].body.item.id,results[1].body.item.id); saved.push(results[0].body.item.id);
    // A pending repair remains resumable after its original D+1 and receipt
    // expiry. Recover that overdue unit; do not schedule a new later D+1.
    let loseQueueResponse = true;
    const interrupted = productionHarness(transport, { afterQuery(q, result) {
      if (loseQueueResponse && q.table === "review_queue_items" && q.operation === "insert" && !result.error) {
        loseQueueResponse = false; throw new Error("synthetic-delayed-queue-response-loss");
      }
    } });
    const delayedCommand = await app.command("postgres-delayed-retry");
    assert.equal((await interrupted.save(delayedCommand)).status, 500);
    const lateApp = productionHarness(transport, { now: "2026-09-08T10:00:00.000Z" });
    const delayed = await lateApp.save(delayedCommand);
    assert.equal(delayed.status, 200, JSON.stringify(delayed.body));
    assert.equal((await lateApp.save(delayedCommand)).status, 200);
    saved.push(delayed.body.item.id);
    for (const scenario of ["completed_after_full_save", "completed_after_queue_only", "completion_before_link", "completion_after_link", "legacy_completed_concurrent"]) {
      saved.push(await completedQueueRetryScenario(transport, scenario));
      process.stdout.write(JSON.stringify({ completedQueueScenario: scenario, result: "passed" }) + "\n");
    }
    const counts=await sql("select (select count(*) from wrong_answer_items)||':'||(select count(*) from review_queue_items)||':'||(select count(*) from learning_signal_events where source_type='app1_c3r_handoff')||':'||(select count(*) from learning_signal_events where source_type<>'app1_c3r_handoff')||':'||(select recurrence_count from recurrence_features)");
    assert.equal(counts,"11:10:10:10:10");
    const bindings=JSON.parse(await sql("select jsonb_agg(jsonb_build_object('due',q.raw_payload->>'dueAt','ordinal',q.derived_payload->'reviewUnitRecurrenceCount','topicCount',q.derived_payload->'recurrenceCount','journey',s.metadata_json)) from review_queue_items q join learning_signal_events s on s.metadata_json->>'reviewUnitId'=q.id::text where s.source_type='app1_c3r_handoff'"));
    assert.equal(bindings.length,10);
    for(const binding of bindings) {
      assert.equal(binding.ordinal,1);
      assert.equal(binding.due,"2026-09-07T00:00:00.000Z");
      assert.equal(binding.journey.d1DueAt,binding.due);
      assert.equal(binding.journey.masteryCreated,false);
      assert.equal(binding.journey.transferCreated,false);
    }
    assert.deepEqual(bindings.map(b=>b.topicCount).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
    const derived=await sql("select coalesce(string_agg(metadata_json::text,''),'') from learning_signal_events");
    assert.equal(derived.includes(PRODUCTION_RAW_MARKER),false);
    await sql("delete from learning_signal_events; delete from usage_events; delete from review_queue_items; delete from wrong_answer_tags; delete from wrong_answer_notes; delete from recurrence_features; delete from wrong_answer_items; delete from profiles");
    await sql("delete from auth.users",false);
    assert.equal(await sql(`select ${[...tableNames,"auth.users"].map(table=>`(select count(*) from ${table})`).join("+")}`,false),"0");
    process.stdout.write(JSON.stringify({ acceptance:"APP1_PRODUCTION_REPEAT_REPAIR_POSTGRESQL_ACCEPTED", previousTopicHistoryPreserved:true, repairCount:saved.length, queueCount:10, journeyCount:10, completedQueueCases:5, currentPendingMatchesListReviewQueue:true, noCompletedH0Issued:true, legacyLinkNormalizationAccepted:true, identicalAndConcurrentRetriesAccepted:true, delayedRetryPreservesOriginalD1:true, syntheticRowsAndUserCleaned:true })+"\n");
  } finally {
    if(started) { docker(["rm","--force",container]); }
  }
});
const PRODUCTION_SCHEDULE = resolveApp1FirstRecurrenceD1Schedule(
  PRODUCTION_SCHEDULE_INPUT,
);
const DUE_AT = PRODUCTION_SCHEDULE.dueAt;
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
          nextReviewDateOverride:
            PRODUCTION_SCHEDULE.sealedNextReviewDateOverride,
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
  assert.equal(PRODUCTION_SCHEDULE_INPUT.nextReviewDateOverride, null);
  assert.equal(PRODUCTION_SCHEDULE.initialNextReviewDateOverride, null);
  assert.equal(PRODUCTION_SCHEDULE.sealedNextReviewDateOverride, "2026-09-04");
  assert.equal(PRODUCTION_SCHEDULE.dueAt, DUE_AT);

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
          linkKind: projection.linkKind,
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
    assert.equal(query("select count(*) from public.wrong_answer_items"), "1");
    assert.equal(query("select count(*) from public.review_queue_items"), "0");
    assert.equal(query("select count(*) from public.learning_signal_events"), "0");

    query(queueInsert());
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
