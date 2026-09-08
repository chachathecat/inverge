import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { createOwnerLocalTrialApplication, authorizeOwnerLocalR3TrialAdapter,
  activeOwnerLocalR3TrialAdapter } from "../lib/review-os/first-stage/runtime/owner-local-trial-context.ts";
import { ownerLocalR3TrialEnvironment, ownerLocalR3TrialRequest, genuineTrialSession,
  OWNER_LOCAL_R3_TRIAL_FLAG, isOwnerLocalR3TrialAdapter } from "../lib/review-os/first-stage/runtime/owner-local-trial-boundary.ts";
const local = { NODE_ENV: "development", [OWNER_LOCAL_R3_TRIAL_FLAG]: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55421" };

test("NextRequest loopback normalization retains the exact HTTP Host boundary",()=>{
  const request=new NextRequest("http://127.0.0.1:3883/api/trial",{headers:{host:"127.0.0.1:3883"}});
  assert.equal(new URL(request.url).hostname,"localhost");
  assert.equal(ownerLocalR3TrialRequest(local,request),true);
  for(const headers of [{host:"localhost:3883"},{host:"evil.invalid"},{"x-forwarded-host":"127.0.0.1:3883"},
    {host:"127.0.0.1:3883",origin:"http://evil.invalid"},{host:"127.0.0.1:3883",origin:"http://localhost:3883"}])
    assert.equal(ownerLocalR3TrialRequest(local,new NextRequest("http://127.0.0.1:3883/api/trial",{headers})),false);
});
test("Owner r3 trial defaults off and denies non-local deployment facts before content/auth", () => {
  assert.equal(ownerLocalR3TrialEnvironment(local), true);
  for (const delta of [{ [OWNER_LOCAL_R3_TRIAL_FLAG]: undefined }, { [OWNER_LOCAL_R3_TRIAL_FLAG]: "false" },
    { NODE_ENV: "production" }, { NODE_ENV: "test" }, { VERCEL: "1" }, { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { CI: "true" }, { DEV_SMOKE_AUTH: "true" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }, { NEXT_PUBLIC_SUPABASE_URL: "http://192.168.1.2:55421" }])
    assert.equal(ownerLocalR3TrialEnvironment({ ...local, ...delta }), false);
  assert.equal(ownerLocalR3TrialRequest(local, new Request("http://127.0.0.1:3883/api/trial")), true);
  for (const url of ["http://localhost:3883/api/trial", "https://127.0.0.1:3883/api/trial", "https://example.test/api/trial"])
    assert.equal(ownerLocalR3TrialRequest(local, new Request(url, { headers: { "x-forwarded-host": "127.0.0.1:3883" } })), false);
  assert.equal(ownerLocalR3TrialRequest(local, new Request("http://127.0.0.1:3883/api/trial", { headers: { origin: "https://example.test" } })), false);
});
test("trial rejects smoke/demo authentication and another subject adapter", () => {
  assert.equal(genuineTrialSession({ isAuthenticated: true, isDemo: false, source: "supabase" }), true);
  for (const source of ["smoke", "demo", undefined]) assert.equal(genuineTrialSession({ isAuthenticated: true, isDemo: false, source }), false);
  assert.equal(genuineTrialSession({ isAuthenticated: false, isDemo: false, source: "supabase" }), false);
  assert.equal(isOwnerLocalR3TrialAdapter({ adapterId: "owner-local-economics-r3-experiment", adapterVersion: "1", subjectId: "economics_principles" }), true);
  assert.equal(isOwnerLocalR3TrialAdapter({ adapterId: "owner-local-economics-r3-experiment", adapterVersion: "1", subjectId: "accounting" }), false);
});

test("trial authority exists only inside an authenticated, allowlisted local HTTP request", async () => {
  const adapter = { adapterId: "owner-local-economics-r3-experiment", adapterVersion: "1", subjectId: "economics_principles" };
  assert.throws(() => authorizeOwnerLocalR3TrialAdapter(adapter));
  assert.equal(activeOwnerLocalR3TrialAdapter(adapter), false);
  let reads = 0;
  let resume;
  let afterResponse;
  const environment = { ...local, INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "true",
    ALPHA_ADMIN_EMAILS: "synthetic@example.test", INVERGE_OWNER_FIRST_STAGE_EMAILS: "synthetic@example.test" };
  const session = { isAuthenticated: true, isDemo: false, source: "supabase", userId: "synthetic-user", email: "synthetic@example.test" };
  const dependencies = { environment: () => environment, session: async () => session,
    catalog: async () => { reads++; authorizeOwnerLocalR3TrialAdapter(adapter);
      afterResponse = new Promise(resolve => { resume = resolve; }).then(() => {
        assert.throws(() => authorizeOwnerLocalR3TrialAdapter(adapter));
        return activeOwnerLocalR3TrialAdapter(adapter);
      });
      assert.equal(activeOwnerLocalR3TrialAdapter(adapter), true); return null; },
    repository: () => { throw new Error("No content installed"); } };
  const request = () => new Request("http://127.0.0.1:3883/api/trial");
  assert.equal((await createOwnerLocalTrialApplication(dependencies)(request())).status, 200);
  assert.equal(reads, 1);
  resume();
  assert.equal(await afterResponse, false);
  assert.equal(activeOwnerLocalR3TrialAdapter(adapter), false);
  assert.throws(() => authorizeOwnerLocalR3TrialAdapter(adapter));
  for (const changed of [{ ...session, source: "smoke" }, { ...session, isAuthenticated: false },
    { ...session, email: "other@example.test" }]) {
    assert.equal((await createOwnerLocalTrialApplication({ ...dependencies, session: async () => changed })(request())).status, 404);
  }
  assert.equal(reads, 1);
});
