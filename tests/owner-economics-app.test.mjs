import test from "node:test";
import assert from "node:assert/strict";
import { ownerLocalAppEnvironment } from "../scripts/local/owner-economics-app.mjs";
import { FIRST_STAGE_FEATURE_FLAG,FIRST_STAGE_OWNER_ALLOWLIST } from "../lib/review-os/first-stage/kernel/domain.ts";
import { ownerLocalR3TrialEnvironment } from "../lib/review-os/first-stage/runtime/owner-local-trial-boundary.ts";
test("dedicated app launcher activates only the exact local trial and excludes inherited credentials/overrides",()=>{
  const base={Path:"OS-path",SystemRoot:"OS-root",OPENAI_API_KEY:"synthetic-forbidden",NODE_OPTIONS:"synthetic-preload",
    NODE_EXTRA_CA_CERTS:"synthetic-global-trust",HTTP_PROXY:"synthetic-proxy",VERCEL:"1",NEXT_PUBLIC_SUPABASE_URL:"https://remote.invalid",
    SUPABASE_SERVICE_ROLE_KEY:"synthetic-remote",DEV_SMOKE_AUTH:"true",SOME_OTHER_FEATURE_ENABLED:"true"};
  const env=ownerLocalAppEnvironment(base,{anon:"synthetic-local-anon",service:"synthetic-local-service"},"synthetic-private-root");
  assert.equal(env.Path,base.Path);assert.equal(env.SystemRoot,base.SystemRoot);
  for(const name of ["OPENAI_API_KEY","NODE_OPTIONS","NODE_EXTRA_CA_CERTS","HTTP_PROXY","VERCEL","SOME_OTHER_FEATURE_ENABLED"])assert.equal(env[name],undefined);
  assert.equal(ownerLocalR3TrialEnvironment(env),true);assert.equal(env[FIRST_STAGE_FEATURE_FLAG],"true");
  assert.equal(env[FIRST_STAGE_OWNER_ALLOWLIST],"owner@localhost.test");assert.equal(env.SUPABASE_SERVICE_ROLE_KEY,"synthetic-local-service");
  assert.equal(env.DEV_SMOKE_AUTH,"false");assert.equal(env.NEXT_TELEMETRY_DISABLED,"1");
  assert.throws(()=>ownerLocalAppEnvironment(base,{}));
});
