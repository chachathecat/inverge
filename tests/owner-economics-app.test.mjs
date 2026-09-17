import test from "node:test";
import assert from "node:assert/strict";
import { ownerLocalAppEnvironment,ownerLocalLegalEnvironment,ownerLocalTheoryEnvironment,ownerLocalOriginalEnvironment } from "../scripts/local/owner-economics-app.mjs";
import path from "node:path";
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
test("explicit local bridge launch forwards only closed non-secret configuration; ordinary launch keeps it off",()=>{
  const root=path.resolve("synthetic-private-restore");
  const settings={INVERGE_OWNER_LEGAL_READER_ROOT:path.resolve("synthetic-reader"),INVERGE_OWNER_LEGAL_SNAPSHOT_ROOT:root,
    INVERGE_OWNER_LEGAL_CATALOG_PATH:path.join(root,"catalog.json"),INVERGE_OWNER_LEGAL_CATALOG_SHA256:"a".repeat(64),
    INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED:"true",OPENAI_API_KEY:"synthetic-forbidden",NODE_TLS_REJECT_UNAUTHORIZED:"0",
    VERCEL_ENV:"preview",SOME_OTHER_FEATURE_ENABLED:"true"};
  const keys={anon:"synthetic-anon",service:"synthetic-service"};
  assert.equal(ownerLocalAppEnvironment(settings,keys).INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED,undefined);
  const env=ownerLocalLegalEnvironment({},keys,settings);
  assert.equal(env.INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED,"true");
  assert.equal(env.INVERGE_OWNER_LEGAL_CATALOG_PATH,settings.INVERGE_OWNER_LEGAL_CATALOG_PATH);
  for(const name of ["OPENAI_API_KEY","NODE_TLS_REJECT_UNAUTHORIZED","VERCEL_ENV","SOME_OTHER_FEATURE_ENABLED"])assert.equal(env[name],undefined);
  for(const altered of [{...settings,INVERGE_OWNER_LEGAL_READER_ROOT:"relative"},
    {...settings,INVERGE_OWNER_LEGAL_CATALOG_SHA256:"invalid"},
    {...settings,INVERGE_OWNER_LEGAL_CATALOG_PATH:path.resolve("outside.json")}])
    assert.throws(()=>ownerLocalLegalEnvironment({},keys,altered),/local_legal_/);
});

test("exact original installation preserves economics/theory and cannot inherit or regrant a provider/budget",()=>{
 const hashes={contentSha256:"0a7039441edafa476973383fdd4f8fb1163ae9bee96da55aacc0eaf33b4d9fc9",sqlSha256:"5346dbf1caa872c880ab621ffd91c508791747e9c80112b1030f86642e307a3a"};
 const base=ownerLocalTheoryEnvironment({INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",GEMINI_API_KEY:"synthetic"},{anon:"synthetic-anon",service:"synthetic-service"},"a".repeat(43));
 assert.equal(base.INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED,undefined);
 const installation={schemaVersion:"owner_original_installation.v1",enabled:true,backupRestoreVerified:true,database:"inverge_owner_economics_db_loopback/postgres",...hashes};
 const contentPath=path.resolve("synthetic-private/candidate-v2.json");
 const env=ownerLocalOriginalEnvironment(base,installation,contentPath,hashes.contentSha256,hashes.sqlSha256);
 for(const [key,value] of Object.entries(base))assert.equal(env[key],value);
 assert.equal(env.INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED,"true");assert.equal(env.GEMINI_API_KEY,undefined);
 for(const delta of [{enabled:false},{backupRestoreVerified:false},{database:"remote/postgres"},{contentSha256:"f".repeat(64)},{sqlSha256:"f".repeat(64)}])assert.throws(()=>ownerLocalOriginalEnvironment(base,{...installation,...delta},contentPath,hashes.contentSha256,hashes.sqlSha256));
 assert.throws(()=>ownerLocalOriginalEnvironment({...base,VERCEL:"1"},installation,contentPath,hashes.contentSha256,hashes.sqlSha256));
});
