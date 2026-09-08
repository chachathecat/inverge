import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

import * as domain from "../lib/review-os/first-stage/kernel/domain.ts";
import { privateRoute } from "./fixtures/first-stage-private-route-harness.mjs";
import { verifyPrivateBrowser } from "./fixtures/first-stage-private-browser-harness.mjs";
import { verifyPrivateSubjectNavigation } from "./fixtures/first-stage-private-navigation-browser.mjs";
import { harness as kernelHarness, SUBMIT, submission } from "./fixtures/first-stage-private-session-harness.mjs";
import { economicsCatalog } from "./fixtures/first-stage-economics-content-harness.mjs";
import { loadEconomicsContent } from "../lib/review-os/first-stage/runtime/economics-content.ts";
import { economicsReleaseInput } from "./fixtures/first-stage-economics-applicability-harness.mjs";
import { accountingCatalog } from "./fixtures/first-stage-accounting-content-harness.mjs";
import { remainingCatalogs, SUBJECT_CASES } from "./fixtures/first-stage-remaining-content-harness.mjs";
import { trialHarness, startTrial, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { ORACLE_IMAGE, ORACLE_PLATFORM } from "../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TABLE = "public.first_stage_private_sessions";
const literal = value => `'${String(value).replaceAll("'", "''")}'`;

// Compile the real repository, replacing ONLY the server-only import marker.
// The real Supabase SDK serializes requests; its fetch transport goes solely to
// an isolated Docker PostgreSQL instance. Auth/catalog/clock are test ports,
// not real content or remote authentication evidence.
function repositoryFactory() {
  const url = new URL("../lib/review-os/first-stage/runtime/session-repository.ts", import.meta.url);
  const compiled = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports){${compiled}\n})`)((name) => {
    if (name === "server-only") return {};
    assert.equal(name, "../kernel/domain"); return domain;
  }, loaded, loaded.exports);
  return loaded.exports.createPrivateSessionRepository;
}

test("late durable response from the previous subject cannot rewrite the newly selected subject URL",
  { timeout: 60_000 }, verifyPrivateSubjectNavigation);

test("all five browser routes consume their server blocker on POST, reload and reconnect without retry advice",
  { timeout: 60_000 }, async () => {
    for (const subject of ["economics_principles", "accounting", ...SUBJECT_CASES.map(spec => spec.id)]) {
      const h = kernelHarness();
      let unavailable = false;
      const route = privateRoute(h, { subject, get noCatalog() { return unavailable; } });
      const result = await verifyPrivateBrowser({ route, subject, blockCatalog() { unavailable = true; },
        blockedMessage: "사용 불가 — 권리·정답·인적 검토가 승인된 콘텐츠가 아직 없습니다. 개발 후보나 합성 자료는 학습 재고가 아닙니다." });
      assert.equal(result.blocked, true); assert.equal(result.externalRequests, 0); assert.equal(result.browserErrors, 0);
      assert.equal(route.counts.repository, 0); assert.equal(h.rows.size, 0);
    }
  });

const convertedInput = (await economicsReleaseInput()).input;
const convertedCatalog = await loadEconomicsContent(convertedInput);
assert.ok(convertedCatalog);
const postgresCases = [
  ...Object.entries({ economics_principles: economicsCatalog, accounting: accountingCatalog, ...remainingCatalogs })
    .map(([subject, catalog]) => ({ subject, catalog, label: subject, contentInput: undefined })),
  { subject: "economics_principles", catalog: convertedCatalog, label: "economics_r3_candidate", contentInput: convertedInput },
];
for (const { subject, catalog, label, contentInput } of postgresCases) {
const harness = options => kernelHarness({ ...options, catalog });
const reference = () => catalog.initialReferences[0];
const EXPLANATION = catalog.explanation(reference()).text;
const BODY = catalog.registry.require(subject).presentQuestion(reference()).stem;
test(`local PostgreSQL ${label} enforces actual route/browser durable retry/CAS with synthetic auth ports`, { timeout: 240_000 }, async () => {
  const container = `inverge-first-private-${process.pid}-${Date.now()}`;
  const docker = args => execFileSync("docker", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let started = false;
  let loseNextWriteResponse = false;
  const sql = (statement, role = "service_role") => new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "postgres", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"], { windowsHide: true });
    let out = "", err = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { err += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve(out.trim());
      else { const error = new Error("isolated-sql-rejected"); error.code = err.match(/ERROR:\s+([0-9A-Z]{5}):/u)?.[1] ?? "unknown"; reject(error); }
    });
    child.stdin.end("\\set VERBOSITY verbose\n" + (role
      ? `begin; set local role ${role}; set local statement_timeout='15s'; ${statement}; commit;`
      : statement));
  });
  const identifier = value => { assert.match(value, /^[a-z_]+$/u); return `"${value}"`; };
  const transport = async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "http://127.0.0.1");
    assert.equal(url.pathname, "/rest/v1/first_stage_private_sessions");
    const method = init.method ?? "GET";
    const filters = [...url.searchParams.entries()].filter(([key]) => key !== "select");
    for (const [key, value] of filters) {
      assert.ok(["owner_id", "session_id", "revision"].includes(key));
      assert.ok(value.startsWith("eq."));
    }
    const where = filters.length ? " where " + filters.map(([key, value]) => `${identifier(key)}=${literal(value.slice(3))}`).join(" and ") : "";
    const columns = (url.searchParams.get("select") ?? "*").split(",").map(column => column === "*" ? "*" : identifier(column)).join(",");
    try {
      let result;
      if (method === "GET") {
        result = await sql(`select coalesce(jsonb_agg(to_jsonb(r)), '[]') from (select ${columns} from ${TABLE}${where}) r`);
      } else {
        const value = JSON.parse(init.body);
        const json = `${literal(JSON.stringify(value))}::jsonb`;
        const names = Object.keys(value).map(identifier).join(",");
        if (method === "POST") {
          await sql(`insert into ${TABLE} (${names}) select ${names} from jsonb_populate_record(null::${TABLE},${json})`);
          return new Response(null, { status: 201 });
        }
        assert.equal(method, "PATCH");
        result = await sql(`with changed as (update ${TABLE} set (${names})=(select ${names} from jsonb_populate_record(null::${TABLE},${json}))${where} returning ${columns}) select coalesce(jsonb_agg(to_jsonb(changed)), '[]') from changed`);
        if (loseNextWriteResponse) { loseNextWriteResponse = false; throw new Error("synthetic-response-lost-after-commit"); }
      }
      const rows = JSON.parse(result);
      const accept = new Headers(init.headers).get("accept") ?? "";
      return Response.json(accept.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
    } catch (error) {
      if (error.code) return Response.json({ code: error.code, message: "synthetic-db-rejection" }, { status: 409 });
      throw error;
    }
  };
  try {
    // A cached image only: this test cannot pull a provider or contact a database.
    docker(["image", "inspect", ORACLE_IMAGE]);
    docker(["run", "--detach", "--pull=never", "--name", container, "--platform", ORACLE_PLATFORM,
      "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912",
      "--env", "POSTGRES_HOST_AUTH_METHOD=trust", ORACLE_IMAGE]);
    started = true;
    let ready = false;
    for (let count = 0; count < 80; count++) {
      if (spawnSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { windowsHide: true }).status === 0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.equal(ready, true);
    await sql(`create schema auth; create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls;
      create table auth.users(id uuid primary key);
      grant usage on schema public to anon,authenticated,service_role;
      insert into auth.users values (${literal(OWNER)}),(${literal(OTHER)});`, null);
    const syntheticDesign = readFileSync(new URL("../supabase/local-designs/first-stage-private-sessions.sql", import.meta.url), "utf8");
    const design = contentInput ? readFileSync(new URL("../supabase/local-designs/first-stage-owner-local-sessions.sql", import.meta.url), "utf8") : syntheticDesign;
    await assert.rejects(sql(design, null), { code: "P0001" });
    if (contentInput) {
      // Verify the proposed persistent design in a disposable fixture only.
      // This setting in a synthetic test is NOT a performed personal-use approval.
      await assert.rejects(sql(`set inverge.local_first_stage_design='synthetic_only';\n${design}`, null), { code: "P0001" });
      await sql("set inverge.local_first_stage_design='';", null);
      const tableDdl = source => source.slice(source.indexOf("create table"), source.indexOf("\n);") + 4);
      assert.equal(tableDdl(design), tableDdl(syntheticDesign)
          .replace("payload->>'schemaVersion' = 'first_stage.private_session.v1'",
            "payload->>'schemaVersion' in ('first_stage.private_session.v1', 'first_stage.owner_local_trial_session.v1')"));
      const securityDdl = source => source.slice(source.indexOf("alter table public.first_stage_private_sessions enable"), source.indexOf("comment on table"));
      assert.equal(securityDdl(design), securityDdl(syntheticDesign));
    }
    // The unchanged synthetic CREATE/constraints are byte-identical to the old
    // personal table. Exercise an EXISTING old table with records, not just a
    // fresh table that already accepts the new trial schema.
    const legacyTable = syntheticDesign.slice(syntheticDesign.indexOf("create table"), syntheticDesign.indexOf("comment on table"));
    for (let replay = 0; replay < 2; replay++) {
      await sql(contentInput ? `begin;\n${legacyTable}\ncommit;`
        : "set inverge.local_first_stage_design='synthetic_only';\n" + design, null);
    }
    for (const role of ["anon", "authenticated"]) {
      await assert.rejects(sql(`select * from ${TABLE}`, role), { code: "42501" });
      await assert.rejects(sql(`delete from ${TABLE}`, role), { code: "42501" });
    }
    const repository = repositoryFactory();
    const sdk = () => createClient("http://127.0.0.1", "synthetic-test-key", {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: transport },
    });
    const first = harness({ store: repository(sdk()) });
    const second = harness({ store: repository(sdk()) });
    const handler = h => privateRoute(h, { ownerId: OWNER, client: sdk(), repository, subject, contentInput });
    const post = (h, body) => handler(h).POST(new Request("http://127.0.0.1/sessions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    const create = { action: "create", requestId: "postgres-create", questionId: reference().questionId };
    const created = await Promise.all([post(first, create), post(second, create)]);
    for (const response of created) assert.equal(response.status, 200);
    const initial = await created[0].json();
    const sessionId = initial.view.sessionId;
    assert.equal((await created[1].json()).view.sessionId, sessionId);
    assert.equal(initial.view.explanation, null);
    const begun = await post(first, { sessionId, command: { action: "begin", requestId: "postgres-begin", expectedRevision: 1, questionId: reference().questionId } });
    assert.equal(begun.status, 200);
    const attemptId = (await begun.json()).view.attempt.attemptId;
    first.setClock(SUBMIT); second.setClock(SUBMIT);
    const command = { sessionId, command: submission(attemptId) };
    loseNextWriteResponse = true;
    const lost = await post(first, command);
    assert.equal(lost.status, 503);
    assert.equal((await lost.text()).includes(EXPLANATION), false);
    assert.equal(first.counts.explanations, 0);
    const recovered = await Promise.all([post(first, command), post(second, command)]);
    for (const response of recovered) assert.equal(response.status, 200);
    const saved = await recovered[0].json();
    assert.deepEqual(await recovered[1].json(), saved);
    assert.equal(saved.view.explanation.text, EXPLANATION);
    assert.equal(saved.view.reviewTasks[0].dueAt, "2026-09-07T10:01:00.000Z");
    const reopened = harness({ store: repository(sdk()) });
    assert.deepEqual(await reopened.service.view(OWNER, sessionId), saved.view);
    await assert.rejects(reopened.service.view(OTHER, sessionId), { code: "not_found" });
    assert.equal(await sql(`select count(*) from ${TABLE}`), "1");
    const persisted = await sql(`select payload::text from ${TABLE}`);
    assert.equal(persisted.includes(BODY), false);
    assert.equal(persisted.includes(EXPLANATION), false);
    const tasks = JSON.parse(persisted).state.reviewTasks;
    assert.equal(tasks.length, 1);
    await assert.rejects(sql(`update ${TABLE} set payload=jsonb_set(payload,'{ownerId}','null')`), { code: "23514" });
    await assert.rejects(sql(`update ${TABLE} set payload=jsonb_set(payload,'{state,schemaVersion}','null')`), { code: "23514" });
    await assert.rejects(sql(`update ${TABLE} set owner_id=${literal(OTHER)}`), { code: "23514" });
    assert.equal(await sql(`select payload::text from ${TABLE}`), persisted);
    reopened.setClock(tasks[0].dueAt);
    const retry = await reopened.service.execute(OWNER, sessionId, { action: "retry", requestId: "postgres-retry", expectedRevision: 3, reviewTaskId: tasks[0].reviewTaskId });
    reopened.setClock("2026-09-07T10:02:00.000Z");
    const completed = await reopened.service.execute(OWNER, sessionId, { ...submission(retry.state.attempts.at(-1).attemptId, contentInput ? 4 : 2), requestId: "postgres-retry-submit", expectedRevision: 4 });
    assert.equal(completed.state.reviewTasks[0].status, "completed");
    const oldRequest = await post(second, command);
    assert.equal(oldRequest.status, 200);
    const final = (await oldRequest.json()).view;
    assert.equal(final.reviewTasks.length, 1);
    assert.equal(final.reviewTasks[0].status, "completed");
    assert.equal(final.reviewTasks[0].dueAt, tasks[0].dueAt);
    assert.equal(final.masteryClaim, false);
    assert.equal(final.transferEvidence, false);
    const browserHarness = harness({ store: repository(sdk()) });
    const browserResult = await verifyPrivateBrowser({ route: handler(browserHarness), subject,
      ...(contentInput ? { questionNumber: 46, retryChoice: 4 } : {}),
      ...(catalog.questionAttributions ? { expectedAttributions: { question: catalog.questionAttributions(reference()),
        feedback: catalog.explanation(reference()).attributions } } : {}),
      clock: { set: browserHarness.setClock, advance: ms => browserHarness.setClock(
        new Date(Date.parse(browserHarness.getClock()) + ms).toISOString()) },
      failNextWrite: () => { loseNextWriteResponse = true; },
    });
    const browserSaved = await browserHarness.service.view(OWNER, browserResult.sessionId);
    assert.equal(browserSaved.reviewTasks[0].status, "completed");
    assert.equal(browserSaved.reviewTasks[0].dueAt, browserResult.dueAt);
    assert.equal(await sql(`select count(*) from ${TABLE}`), "2");
    if(contentInput) {
      // Same real SDK/repository and disposable PostgreSQL, but the actual trial
      // loader -> adapter -> HTTP scope; no reviewed catalog substitution.
      const fixture=syntheticTrialInput({numericTrialModels:true});
      const trial=trialHarness({fixture,store:repository(sdk()),session:{userId:OWNER}});
      const preserved=await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`);
      const deniedLegacy=await trial.send({action:"create",requestId:"legacy-trial-probe",questionId:"qnet-2025-36-s1-A-46"});
      assert.equal(deniedLegacy.status,503);assert.equal(deniedLegacy.body.view,undefined);
      const otherConstraints=await sql(`select jsonb_agg(jsonb_build_array(conname,pg_get_constraintdef(oid)) order by conname)::text from pg_constraint where conrelid='${TABLE}'::regclass and conname <> 'first_stage_private_sessions_payload_check4'`,null);
      for(let replay=0;replay<2;replay++) {
        await sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null);
        assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),preserved);
        assert.equal(await sql(`select jsonb_agg(jsonb_build_array(conname,pg_get_constraintdef(oid)) order by conname)::text from pg_constraint where conrelid='${TABLE}'::regclass and conname <> 'first_stage_private_sessions_payload_check4'`,null),otherConstraints);
      }
      assert.equal(await sql(`select relrowsecurity and relforcerowsecurity from pg_class where oid='${TABLE}'::regclass`,null),"t");
      await Promise.all([0,1].map(()=>sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null)));
      assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),preserved);
      for(const role of ["anon","authenticated"]) await assert.rejects(sql(`select * from ${TABLE}`,role),{code:"42501"});
      const ids=await startTrial(trial);trial.setClock(SUBMIT);
      const trialCommand={sessionId:ids.sessionId,command:submission(ids.attemptId,2)};
      loseNextWriteResponse=true;
      const lostTrial=await trial.send(trialCommand);
      assert.equal(lostTrial.status,503);assert.equal(lostTrial.body.view,undefined);
      const retries=await Promise.all([trial.send(trialCommand),trial.send(trialCommand)]);
      assert.equal(retries[0].status,200);assert.deepEqual(retries[1].body,retries[0].body);
      const trialSaved=JSON.parse(await sql(`select payload::text from ${TABLE} where session_id=${literal(ids.sessionId)}`));
      assert.equal(trialSaved.schemaVersion,"first_stage.owner_local_trial_session.v1");
      assert.equal(trialSaved.state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.reviewerIdentity,null);
      assert.equal(trialSaved.state.reviewTasks.length,1);
      assert.equal(JSON.stringify(trialSaved).includes("SYNTHETIC_CANDIDATE_EXPLANATION"),false);
      const reconnect=trialHarness({fixture,store:repository(sdk()),session:{userId:OWNER}});
      const opened=await reconnect.send(undefined,`?sessionId=${ids.sessionId}`);
      assert.deepEqual(opened.body,retries[0].body);
      await assert.rejects(reopened.service.view(OWNER,ids.sessionId),{code:"adapter_mismatch"});
      const task=trialSaved.state.reviewTasks[0];reconnect.setClock(task.dueAt);
      const trialRetry=await reconnect.send({sessionId:ids.sessionId,command:{action:"retry",requestId:"pg-trial-retry",expectedRevision:3,reviewTaskId:task.reviewTaskId}});
      assert.equal(trialRetry.status,200);assert.equal(trialRetry.body.view.explanation,null);
      reconnect.setClock("2026-09-07T10:02:00.000Z");
      assert.equal((await reconnect.send({sessionId:ids.sessionId,command:{...submission(trialRetry.body.view.attempt.attemptId,4),requestId:"pg-trial-retry-submit",expectedRevision:4}})).status,200);
      const after=await trial.send(trialCommand);
      assert.equal(after.body.view.reviewTasks[0].status,"completed");assert.equal(after.body.view.reviewTasks[0].dueAt,task.dueAt);
      assert.equal(after.body.view.humanReviewComplete,false);assert.equal(after.body.view.measurementEvidence,false);
      assert.equal(after.body.view.masteryClaim,false);assert.equal(after.body.view.transferEvidence,false);
      assert.equal(await sql(`select count(*) from ${TABLE}`),"3");
      for(const number of [49,51,53]) {
        const questionId=`qnet-2025-36-s1-A-${number}`,create={action:"create",requestId:`pg-bundle-${number}`,questionId};
        const pair=trialHarness({fixture,store:repository(sdk()),session:{userId:OWNER}});
        const [a,b]=await Promise.all([pair.send(create),pair.send(create)]);
        assert.equal(a.status,200);assert.deepEqual(a.body,b.body);
        const sessionId=a.body.view.sessionId;
        const begin=await pair.send({sessionId,command:{action:"begin",requestId:`pg-begin-${number}`,expectedRevision:1,questionId}});
        assert.equal(begin.status,200);assert.equal(begin.body.view.explanation,null);pair.setClock(SUBMIT);
        const command=submission(begin.body.view.attempt.attemptId,2);
        loseNextWriteResponse=true;
        const lost=await pair.send({sessionId,command});assert.equal(lost.status,503);assert.equal(lost.body.view,undefined);
        const [saved,replay]=await Promise.all([pair.send({sessionId,command}),pair.send({sessionId,command})]);
        assert.equal(saved.status,200);assert.deepEqual(saved.body,replay.body);
        const next=trialHarness({fixture,store:repository(sdk()),session:{userId:OWNER}});
        assert.deepEqual((await next.send(undefined,`?sessionId=${sessionId}`)).body,saved.body);
        const task=saved.body.view.reviewTasks[0];next.setClock(task.dueAt);
        const retry=await next.send({sessionId,command:{action:"retry",requestId:`pg-retry-${number}`,expectedRevision:3,reviewTaskId:task.reviewTaskId}});
        assert.equal(retry.status,200);assert.equal(retry.body.view.question.questionReference.questionId,`issue883-r3-r${number}`);
        next.setClock("2026-09-07T10:02:00.000Z");
        const finished=await next.send({sessionId,command:{...submission(retry.body.view.attempt.attemptId,4),requestId:`pg-finish-${number}`,expectedRevision:4}});
        assert.equal(finished.status,200);assert.equal(finished.body.view.reviewTasks[0].status,"completed");
        assert.equal(finished.body.view.reviewTasks[0].dueAt,task.dueAt);
        assert.deepEqual((await pair.send({sessionId,command})).body,finished.body);
        await assert.rejects(reopened.service.view(OWNER,sessionId),{code:"adapter_mismatch"});
      }
      assert.equal(await sql(`select count(*) from ${TABLE}`),"6");
      const trialBrowser=trialHarness({fixture,store:repository(sdk()),session:{userId:OWNER}});
      const bridge=async request=>{
        // Explicit synthetic transport canonicalization, NOT genuine auth proof:
        // the test browser uses a random loopback port; the real handler still
        // receives its exact permitted Host/Origin through the shared harness.
        const result=await trialBrowser.send(request.method==="POST"?await request.json():undefined,new URL(request.url).search);
        return Response.json(result.body,{status:result.status,headers:result.headers});
      };
      const trialBrowserResult=await verifyPrivateBrowser({route:{GET:bridge,POST:bridge},ownerLocalTrial:true,questionNumber:49,retryChoice:4,
        clock:{set:trialBrowser.setClock,advance:ms=>trialBrowser.setClock(new Date(Date.parse(trialBrowser.getClock())+ms).toISOString())},
        failNextWrite:()=>{loseNextWriteResponse=true;}});
      assert.equal(trialBrowserResult.externalRequests,0);assert.equal(trialBrowserResult.browserErrors,0);
      assert.equal(await sql(`select count(*) from ${TABLE}`),"7");
      // Read/replay of the original trial survives all additions with no write.
      assert.deepEqual((await trial.send(trialCommand)).body,after.body);
      const withTrial=await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`);
      await sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null);
      assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),withTrial);
      await assert.rejects(sql(`update ${TABLE} set payload=jsonb_set(payload,'{schemaVersion}','"unsupported.session.v1"')`),{code:"23514"});
      // A custom/missing constraint must not be silently replaced by preparation.
      await sql(`alter table ${TABLE} drop constraint first_stage_private_sessions_payload_check4; alter table ${TABLE} add constraint first_stage_private_sessions_payload_check4 check (true);`,null);
      await assert.rejects(sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null),{code:"P0001"});
      assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),withTrial);
      await sql(`alter table ${TABLE} drop constraint first_stage_private_sessions_payload_check4`,null);
      await assert.rejects(sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null),{code:"P0001"});
      assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by session_id)::text from ${TABLE} r`),withTrial);
      process.stdout.write("legacy personal-table upgrade: denied before upgrade; reviewed/trial records and other constraints preserved across reapply; RLS/privileges unchanged\n");
      process.stdout.write("trial isolated PG: actual loader/HTTP/repository, lost durable response, concurrent replay, reconnect, D+1 and reviewed-mixing denial passed; synthetic only\n");
    }
    process.stdout.write(JSON.stringify({ subject, browser: "passed", screenshot: browserResult.screenshot,
      externalRequests: browserResult.externalRequests, browserErrors: browserResult.browserErrors }) + "\n");
    await sql(`delete from auth.users where id in (${literal(OWNER)},${literal(OTHER)})`, null);
    assert.equal(await sql(`select count(*) from ${TABLE}`, null), "0");
    assert.equal(await sql("select count(*) from auth.users", null), "0");
    process.stdout.write("first-stage isolated PG: CAS/replay/readback/completion passed; synthetic rows/users=0; no network\n");
  } finally {
    if (started) docker(["rm", "--force", container]);
  }
});
}
