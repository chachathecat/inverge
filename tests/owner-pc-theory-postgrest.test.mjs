import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { ORACLE_IMAGE, ORACLE_PLATFORM } from "../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";
import { seedRows, OWNER_ID } from "./fixtures/app1-production-persistence-harness.mjs";
import { verifyApp1SavedRecordBrowser } from "./fixtures/app1-saved-record-browser.mjs";
import { THEORY_POLICY, initializeTheoryBudget, generateOwnerTheory, readTheoryBudget } from "../lib/owner-study/owner-pc-theory-budget.mjs";
const REST_IMAGE="public.ecr.aws/supabase/postgrest@sha256:5922bde07147b82b1c9d8f749e48c1e5b99ebb233f3888bb7ab65f07cf4ac82d";
const secret="synthetic-local-only-postgrest-jwt-key-at-least-32-chars";
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
function jwt(role,sub=OWNER_ID) { const parts=[{alg:"HS256",typ:"JWT"},{role,sub,exp:Math.floor(Date.now()/1000)+1200}].map(x=>Buffer.from(JSON.stringify(x)).toString("base64url"));return [...parts,createHmac("sha256",secret).update(parts.join(".")).digest("base64url")].join("."); }
function docker(args,options={}) { return execFileSync("docker",args,{encoding:"utf8",windowsHide:true,maxBuffer:1024*1024,...options}).trim(); }
test("Owner Theory uses exact additive SQL, actual PostgREST/RLS and budgeted Capture-to-saved-record browser flow",{timeout:240000},async()=>{
 // Dedicated disposable synthetic bridge. Only REST publishes a loopback port;
 // the database publishes none. Provider transport is replaced and browser egress denied.
 const prefix=`inverge-theory-test-${process.pid}-${Date.now()}`, db=prefix+"-db",rest=prefix+"-rest",network=prefix+"-net";
 let dbStarted=false,restStarted=false,networkStarted=false;
 const sql=statement=>docker(["exec","-i",db,"psql","-h","127.0.0.1","-U","postgres","-d","postgres","-X","-q","-At","-v","ON_ERROR_STOP=1"],{input:statement});
 try {
  docker(["network","create",network]);networkStarted=true;
  docker(["run","-d","--name",db,"--platform",ORACLE_PLATFORM,"--network",network,"--tmpfs","/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912","-e","POSTGRES_HOST_AUTH_METHOD=trust",ORACLE_IMAGE]);dbStarted=true;
  let ready=false;for(let i=0;i<60;i++){if(spawnSync("docker",["exec",db,"pg_isready","-h","127.0.0.1","-U","postgres"],{windowsHide:true}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
  sql(`create schema auth; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator login noinherit;
   grant anon,authenticated,service_role to authenticator;
   create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
   grant usage on schema public,auth to anon,authenticated,service_role;
   insert into auth.users values (${literal(OWNER_ID)},'owner@localhost.test'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','synthetic-other@example.invalid');`);
  const schema=await readFile(new URL("../supabase/local-designs/owner-pc-theory-one-case.sql",import.meta.url),"utf8");
  assert.throws(()=>sql(schema),/owner_theory_local_approval_required/);
  const apply="set inverge.local_owner_theory='owner_approved_one_case_20260915';\n"+schema;
  sql(apply);sql(apply);
  assert.equal(sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity"),"12");
  docker(["run","-d","--name",rest,"--network",network,"-p","127.0.0.1::3000","-e",`PGRST_DB_URI=postgres://authenticator@${db}:5432/postgres`,"-e","PGRST_DB_SCHEMAS=public","-e","PGRST_DB_ANON_ROLE=anon","-e",`PGRST_JWT_SECRET=${secret}`,REST_IMAGE]);restStarted=true;
  let binding;
  for(let i=0;i<20;i++) { binding=JSON.parse(docker(["inspect","--format","{{json .NetworkSettings.Ports}}",rest]))["3000/tcp"]?.[0]; if(binding)break; await new Promise(r=>setTimeout(r,250)); }
  if(!binding) throw new Error("synthetic PostgREST did not start: "+docker(["logs",rest]));
  assert.equal(binding.HostIp,"127.0.0.1");
  const origin=`http://127.0.0.1:${binding.HostPort}`;
  for(let i=0;i<60;i++){try {const res=await fetch(origin);if(res.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  const transport=async q=>{
   const url=new URL(`${origin}/${q.table}`);url.searchParams.set("select",q.columns??"*");
   for(const [key,op,value] of q.filters){url.searchParams.append(key,op==="notNull"?"not.is.null":op==="in"?`in.(${value.map(v=>JSON.stringify(v)).join(",")})`:`${op}.${value}`);}
   if(q.orders)url.searchParams.set("order",q.orders.map(([field,asc])=>`${field}.${asc?"asc":"desc"}`).join(","));
   if(q.limit!==undefined)url.searchParams.set("limit",q.limit);
   if(q.range){url.searchParams.set("offset",q.range[0]);url.searchParams.set("limit",q.range[1]-q.range[0]+1);}
   if(q.onConflict)url.searchParams.set("on_conflict",q.onConflict);
   const headers={Authorization:`Bearer ${jwt("service_role")}`,"Content-Type":"application/json",Prefer:q.count?"count=exact":q.operation==="upsert"?"resolution=merge-duplicates,return=minimal":"return=minimal"};
   const method=["insert","upsert"].includes(q.operation)?"POST":q.operation==="update"?"PATCH":q.head?"HEAD":"GET";
   const res=await fetch(url,{method,headers,...(q.values?{body:JSON.stringify(q.values)}:{})});
   if(!res.ok) return {data:null,error:await res.json()};
   const body=method==="GET"?await res.json():null;
   return {data:q.single?body?.[0]??null:body,error:null,count:q.count?Number(res.headers.get("content-range")?.split("/")[1]):undefined};
  };
  for(const [table,rows] of Object.entries(seedRows()))for(const values of rows){const r=await transport({table,values,operation:"insert",filters:[]});assert.equal(r.error,null,JSON.stringify(r.error));}
  const own=await fetch(`${origin}/wrong_answer_items`,{headers:{Authorization:`Bearer ${jwt("authenticated")}`}});assert.equal(own.status,200);assert.equal((await own.json()).length,1);
  const other=await fetch(`${origin}/wrong_answer_items`,{headers:{Authorization:`Bearer ${jwt("authenticated","cccccccc-cccc-4ccc-8ccc-cccccccccccc")}`}});assert.deepEqual(await other.json(),[]);
  for(const role of ["anon","authenticated"]){const denied=await fetch(`${origin}/wrong_answer_items`,{method:"POST",headers:{Authorization:`Bearer ${jwt(role)}`,"Content-Type":"application/json"},body:JSON.stringify(seedRows().wrong_answer_items[0])});assert.ok([401,403].includes(denied.status));}
  const base=await mkdtemp(path.join(os.tmpdir(),"owner-theory-browser-")),budgetRoot=path.join(base,"budget");
  const settings={version:THEORY_POLICY.version,model:THEORY_POLICY.model,ownerId:OWNER_ID,projectId:"synthetic-project",apiKey:"synthetic-never-provider-key",paidProjectVerified:true,dataSharingEnabled:false,verifiedAt:new Date().toISOString(),verificationEvidenceSha256:"a".repeat(64)};
  await initializeTheoryBudget(budgetRoot,settings);let providerCalls=0;
  const evidence=await verifyApp1SavedRecordBrowser(transport,{captureInput:true,ownerTheory:{generate:(authority,request,draft)=>generateOwnerTheory(budgetRoot,settings,authority,request,async(url,init)=>{
    providerCalls++;assert.equal((await readTheoryBudget(budgetRoot,settings)).usedReservations,providerCalls);
    assert.equal(JSON.parse(init.body).generationConfig.candidateCount,1);
    return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(draft)}]}}]});
  })}});
  assert.equal(providerCalls,2);assert.equal((await readTheoryBudget(budgetRoot,settings)).usedReservations,2);
  assert.equal(sql("select count(*) from review_queue_items"),"2", "preserve Capture review plus the saved correction review");
  assert.equal(sql(`select count(*) from review_queue_items where source_submission_id=${literal(evidence.savedId)}`),"1", "exact saved correction has one canonical review");
  assert.equal(sql("select count(*) from wrong_answer_items"),"3");
  assert.ok(evidence);
 } finally {
  if(restStarted)docker(["rm","-f",rest]);
  if(dbStarted)docker(["rm","-f",db]);
  if(networkStarted)docker(["network","rm",network]);
 }
});
