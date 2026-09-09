import assert from "node:assert/strict";
import test from "node:test";
import { createPrivateSessionApplication } from "../lib/review-os/first-stage/runtime/session-application.ts";
import { loadEconomicsContent } from "../lib/review-os/first-stage/runtime/economics-content.ts";
import { economicsReleaseInput } from "./fixtures/first-stage-economics-applicability-harness.mjs";
import { harness } from "./fixtures/first-stage-private-session-harness.mjs";
import { reviewedEconomicsBankCandidates } from "../lib/review-os/first-stage/runtime/private-reviewed-content.ts";
import { economicsCatalog } from "./fixtures/first-stage-economics-content-harness.mjs";
import { privateRoute, ENVIRONMENT } from "./fixtures/first-stage-private-route-harness.mjs";
import { verifyPrivateBrowser } from "./fixtures/first-stage-private-browser-harness.mjs";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const URL = "http://127.0.0.1/api/review-os/first-stage/sessions?view=bank";
const NOW = "2026-09-09T08:00:00.000Z";
async function bankHarness(options = {}) {
  const { input } = await economicsReleaseInput();
  const catalog = options.catalog ?? await loadEconomicsContent(input);
  assert.ok(catalog);
  const h = harness({ catalog });
  const assignments = new Map();
  const store = h.store;
  const counts = { auth: 0, catalog: 0, store: 0 };
  let clock = NOW, failBefore = false, failAfter = false, loseRead = false, afterMissingBank, beforeSnapshot;
  store.listOwnerSnapshot = async () => {
    if(beforeSnapshot){const callback=beforeSnapshot;beforeSnapshot=undefined;await callback();}
    return { sessions: [...h.rows.values()], complete: options.complete ?? true };
  };
  const app = createPrivateSessionApplication({
    environment: () => ({ NODE_ENV: "test", INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "true",
      INVERGE_OWNER_REVIEWED_BANK_ENABLED: "true", ALPHA_ADMIN_EMAILS: "synthetic@example.test",
      INVERGE_OWNER_FIRST_STAGE_EMAILS: "synthetic@example.test", ...options.environment }),
    session: async () => { counts.auth++; return { isAuthenticated: true, userId: OWNER, email: "synthetic@example.test", ...options.user }; },
    catalog: async () => { counts.catalog++; return catalog; }, repository: () => { counts.store++; return store; },
    bankRepository: () => ({
      async load(owner, id) { if (loseRead) { loseRead = false; throw new Error("synthetic-read-outage"); }
        const value = assignments.get(`${owner}:${id}`);
        if(!value && afterMissingBank){const callback=afterMissingBank;afterMissingBank=undefined;await callback();}
        return value ? { ...value, session: await store.load(owner, id) } : null; },
      async reserve(session, assignment) {
        if (failBefore) { failBefore = false; throw new Error("synthetic-write-outage"); }
        const key = `${session.ownerId}:${session.sessionId}`;
        if (assignments.has(key)) return assignments.get(key);
        if ([...h.rows.values()].some(row => row.state.examCycle.questionReferences[0].questionId ===
          session.state.examCycle.questionReferences[0].questionId)) return null;
        const saved = await store.create(session);
        const value = { session: saved, assignment };
        assignments.set(key, value);
        if (failAfter) { failAfter = false; loseRead = true; throw new Error("synthetic-response-loss"); }
        return value;
      },
    }), now: () => clock,
  });
  return { app, h, assignments, counts, catalog, input, getClock:()=>clock, setClock: at => { clock = at; },
    interleave:(point,callback)=>{if(point==="afterMissingBank")afterMissingBank=callback;else beforeSnapshot=callback;},
    failBefore: () => { failBefore = true; }, failAfter: () => { failAfter = true; } };
}
const assign = (app, id = "bank-one", fields = {}) => app(new Request(URL, { method: "POST",
  headers: { "content-type": "application/json", origin: "http://127.0.0.1" },
  body: JSON.stringify({ action: "assign_next", requestId: id, ...fields }) }));

test("actual Foundation loader -> HTTP assigns reviewed Bank stock without a client question or authority", async () => {
  const { app, h, assignments } = await bankHarness();
  const request = () => new Request(URL, { method: "POST", headers: { "content-type": "application/json", origin: "http://127.0.0.1" },
    body: JSON.stringify({ action: "assign_next", requestId: "bank-request-one" }) });
  const response = await app(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true); assert.equal(body.view.question, null);
  assert.equal(body.view.explanation, null); assert.equal(body.view.masteryClaim, false);
  assert.equal(assignments.size, 1); assert.equal(h.rows.size, 1);
  const again = await app(request());
  assert.equal(again.status, 200); assert.deepEqual(await again.json(), body);
  assert.equal(assignments.size, 1); assert.equal(h.rows.size, 1);
});

test("OFF, unauthenticated, non-Owner and every deployment deny before stock or storage", async () => {
  for (const environment of [{ INVERGE_OWNER_REVIEWED_BANK_ENABLED: undefined },
    { INVERGE_OWNER_REVIEWED_BANK_ENABLED: "false" }, { VERCEL: "1" }, { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" }, { VERCEL_ENV: "custom" }, { NODE_ENV: "production" }]) {
    const h = await bankHarness({ environment });
    assert.equal((await assign(h.app)).status, 404);
    assert.deepEqual(h.counts, { auth: 0, catalog: 0, store: 0 });
  }
  for (const user of [{ isAuthenticated: false }, { email: "other@example.test" }]) {
    const h = await bankHarness({ user }); assert.equal((await assign(h.app)).status, 404);
    assert.equal(h.counts.catalog, 0); assert.equal(h.counts.store, 0);
  }
});

test("legacy six-check or cloned catalog and client authority cannot enter bank assignment", async () => {
  const valid = await bankHarness();
  assert.ok(reviewedEconomicsBankCandidates(valid.catalog));
  for (const catalog of [economicsCatalog, { ...valid.catalog }]) {
    const h = await bankHarness({ catalog }); assert.equal((await assign(h.app)).status, 503);
    assert.equal(h.rows?.size ?? h.h.rows.size, 0);
  }
  for (const fields of [{ questionId: "client-picked" }, { purpose: "D7_TRANSFER" },
    { purpose: "TIMED_MEASUREMENT" }, { candidates: [] }, { rightsStatus: "VERIFIED" }, { asOf: NOW }]) {
    const h = await bankHarness(); assert.equal((await assign(h.app, "forged", fields)).status, 400);
    assert.equal(h.counts.store, 0); assert.equal(h.assignments.size, 0);
  }
});

test("write failure discloses nothing; committed response loss reuses exact sealed assignment after clock changes", async () => {
  const h = await bankHarness(); h.failBefore();
  const failed = await assign(h.app); assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok: false, error: "temporarily_unavailable" });
  assert.equal(h.h.rows.size, 0); assert.equal(h.assignments.size, 0);
  h.failAfter(); assert.equal((await assign(h.app)).status, 503);
  assert.equal(h.h.rows.size, 1); assert.equal(h.assignments.size, 1);
  const sealed = structuredClone([...h.assignments.values()][0].assignment);
  h.setClock("2026-09-10T08:00:00.000Z");
  assert.equal((await assign(h.app)).status, 200);
  assert.deepEqual([...h.assignments.values()][0].assignment, sealed);
  assert.equal(h.h.rows.size, 1);
});

test("a ready reservation consumes no exposure but prevents reassignment; incomplete history is not absence", async () => {
  const h = await bankHarness();
  for (let i = 0; i < h.catalog.initialReferences.length; i++) assert.equal((await assign(h.app, `reserve-${i}`)).status, 200);
  assert.equal([...h.h.rows.values()].every(row => row.state.attempts.length === 0), true);
  const exhausted = await assign(h.app, "exhausted"); assert.equal(exhausted.status, 409);
  assert.deepEqual(await exhausted.json(), { ok: false, error: "bank_stock_unavailable", providerExecutionAllowed: false });
  const overflow = await bankHarness({ complete: false }); assert.equal((await assign(overflow.app)).status, 409);
  assert.equal(overflow.assignments.size, 0);
});

test("rehydration rejects persisted privilege, time or question binding drift", async () => {
  for (const mutate of [a => { a.contentAuthority = "MEASUREMENT"; }, a => { a.assignedAt = "2026-09-11T08:00:00.000Z"; },
    a => { a.candidateId = "different-question"; }, a => { a.assignmentId = "forged"; }]) {
    const h = await bankHarness(); assert.equal((await assign(h.app)).status, 200);
    const entry = [...h.assignments.values()][0]; const altered = structuredClone(entry.assignment); mutate(altered);
    h.assignments.set([...h.assignments.keys()][0], { ...entry, assignment: altered });
    const response = await assign(h.app); assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: "temporarily_unavailable" });
  }
});

test("source-use expiry is rechecked before, at and after the boundary without changing the registry or OS clock", async t => {
  t.mock.timers.enable({apis:["Date"],now:new Date("2099-12-30T00:00:00.000Z")});
  const h=await bankHarness();
  const inputBefore=JSON.stringify(h.input.applicability);
  assert.equal((await assign(h.app)).status,200);
  for(const at of ["2099-12-31T00:00:00.000Z","2100-01-01T00:00:00.000Z"]) {
    t.mock.timers.setTime(Date.parse(at));
    assert.equal((await assign(h.app)).status,503);
    assert.equal((await assign(h.app,"new-after-expiry")).status,503);
    assert.equal(await loadEconomicsContent(h.input),null);
    assert.equal(h.assignments.size,1);
  }
  assert.equal(JSON.stringify(h.input.applicability),inputBefore);
});

test("actual route composition denies deployed requests before auth, source loading, store or body", async () => {
  for(const env of [{VERCEL_ENV:"preview"},{VERCEL_ENV:"production"},{VERCEL:"1"},{NODE_ENV:"production"}]) {
    const h=harness();
    const route=privateRoute(h,{environment:{...ENVIRONMENT,VERCEL_ENV:undefined,
      INVERGE_OWNER_REVIEWED_BANK_ENABLED:"true",...env}});
    const request=new Request(URL,{method:"POST",body:"not-json"});
    const result=await route.POST(request);
    assert.equal(result.status,404);assert.equal(request.bodyUsed,false);
    assert.deepEqual(route.counts,{auth:0,catalog:0,repository:0});
    assert.match(result.headers.get("cache-control"),/private, no-store/);
  }
});

test("the actual Foundation loader rejects missing final review, key drift and changed neutral content", async () => {
  for(const [id,mutate] of [["q1-asset-rights",r=>{r.decision_scope.decision="unapproved";}],
    ["subject-validator-0",r=>{r.reviewer="unknown-client";}]]) {
    const {input}=await economicsReleaseInput((name,row)=>{if(name===id)mutate(row);});
    assert.equal(await loadEconomicsContent(input),null);
  }
  const {input}=await economicsReleaseInput();
  const bytes=await input.readBytes();
  for(const change of [value=>{value.questions[0].reference.questionVersion="changed";},
    value=>{value.untrustedClientApproved=true;}]) {
    const value=JSON.parse(bytes);change(value);
    assert.equal(await loadEconomicsContent({...input,readBytes:async()=>Buffer.from(JSON.stringify(value))}),null);
  }
});

test("React Bank-first request, lost response, reconnect, explanation and D+1 use the real loader/HTTP with synthetic storage", {timeout:60_000}, async () => {
  const h=await bankHarness();
  const result=await verifyPrivateBrowser({route:{GET:h.app,POST:h.app},bankPractice:true,retryChoice:4,
    clock:{set:h.setClock,advance:ms=>h.setClock(new Date(Date.parse(h.getClock())+ms).toISOString())},
    failNextWrite:h.h.failNextWrite});
  assert.equal(result.browserErrors,0);assert.equal(result.externalRequests,0);
  assert.equal(h.h.rows.size,1);assert.equal(h.assignments.size,1);
  const row=[...h.h.rows.values()][0];
  assert.equal(row.state.reviewTasks[0].status,"completed");
  assert.equal(row.state.reviewTasks[0].dueAt,result.dueAt);
  process.stdout.write(JSON.stringify({bankBrowser:"synthetic-memory-only",screenshot:result.screenshot})+"\n");
});

for(const point of ["afterMissingBank","beforeSnapshot"]) test(`identical request committed ${point} returns its durable winner, not conflict or exhausted stock`,async()=>{
  const h=await bankHarness();
  for(let i=0;i<h.catalog.initialReferences.length-1;i++)assert.equal((await assign(h.app,`prefill-${i}`)).status,200);
  let winner;
  h.interleave(point,async()=>{const response=await assign(h.app,"interleaved");assert.equal(response.status,200);winner=await response.json();});
  const response=await assign(h.app,"interleaved");
  assert.equal(response.status,200);assert.deepEqual(await response.json(),winner);
  assert.equal(h.h.rows.size,h.catalog.initialReferences.length);
});
