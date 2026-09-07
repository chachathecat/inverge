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
import { accountingCatalog } from "./fixtures/first-stage-accounting-content-harness.mjs";
import { remainingCatalogs } from "./fixtures/first-stage-remaining-content-harness.mjs";
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

for (const [subject, catalog] of Object.entries({ economics_principles: economicsCatalog, accounting: accountingCatalog, ...remainingCatalogs })) {
const harness = options => kernelHarness({ ...options, catalog });
const reference = () => catalog.initialReferences[0];
const EXPLANATION = catalog.explanation(reference()).text;
const BODY = catalog.registry.require(subject).presentQuestion(reference()).stem;
test(`local PostgreSQL ${subject} enforces actual route/browser durable retry/CAS with synthetic auth ports`, { timeout: 240_000 }, async () => {
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
    const design = readFileSync(new URL("../supabase/local-designs/first-stage-private-sessions.sql", import.meta.url), "utf8");
    await assert.rejects(sql(design, null), { code: "P0001" });
    for (let replay = 0; replay < 2; replay++) {
      await sql(`set inverge.local_first_stage_design='synthetic_only';\n${design}`, null);
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
    const handler = h => privateRoute(h, { ownerId: OWNER, client: sdk(), repository, subject });
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
    const completed = await reopened.service.execute(OWNER, sessionId, { ...submission(retry.state.attempts.at(-1).attemptId, 2), requestId: "postgres-retry-submit", expectedRevision: 4 });
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
      clock: { set: browserHarness.setClock, advance: ms => browserHarness.setClock(
        new Date(Date.parse(browserHarness.getClock()) + ms).toISOString()) },
      failNextWrite: () => { loseNextWriteResponse = true; },
    });
    const browserSaved = await browserHarness.service.view(OWNER, browserResult.sessionId);
    assert.equal(browserSaved.reviewTasks[0].status, "completed");
    assert.equal(browserSaved.reviewTasks[0].dueAt, browserResult.dueAt);
    assert.equal(await sql(`select count(*) from ${TABLE}`), "2");
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
