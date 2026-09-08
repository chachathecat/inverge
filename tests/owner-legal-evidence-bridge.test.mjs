import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSnapshotBridge } from "../lib/legal/owner-snapshot-bridge.ts";
import { bridgeHarness, held, input, reference, syntheticBody, digest } from "./fixtures/owner-legal-evidence-bridge-harness.mjs";

test("bridge actual HTTP composition lists, searches and reopens only exact selected native JSON reference",async()=>{
  const h=bridgeHarness(),list=await h.send();
  assert.equal(list.status,200);assert.deepEqual(list.body.snapshots,[held]);assert.deepEqual(list.body.anchors,[]);
  assert.ok(!JSON.stringify(list).includes(syntheticBody));
  const first=await h.send({action:"search",input}),second=await h.send({action:"reopen",reference:first.body.anchors[0].reference});
  assert.equal(first.body.anchors[0].bodyText,syntheticBody);assert.equal(second.body.originalReopened,true);
  assert.deepEqual(second.body.anchors,first.body.anchors);
  assert.equal(first.body.currentness,"UNVERIFIED");assert.equal(first.body.dateApplicability,"NOT_ASSESSED");
  assert.equal(first.body.examApplicabilityCertified,false);
  assert.ok(!JSON.stringify(first.body).includes("SYNTHETIC_ORIGINAL_FRAGMENT"));
  for(const result of [list,first,second]) {assert.match(result.headers.get("cache-control"),/no-store/);assert.equal(result.headers.get("referrer-policy"),"no-referrer");}
});
test("denied environment/session/host never loads source, catalog, body or reader",async()=>{
  for(const options of [
    {env:{INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED:undefined}},{env:{INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED:"false"}},
    {env:{INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"false"}},{env:{NODE_ENV:"production"}},{env:{VERCEL_ENV:"production"}},
    {env:{VERCEL_ENV:"preview"}},{env:{VERCEL:"1"}},{env:{CI:"true"}},{env:{DEV_SMOKE_AUTH:"true"}},
    {env:{NEXT_PUBLIC_SUPABASE_URL:"https://remote.invalid"}},{session:{isAuthenticated:false}},
    {session:{isDemo:true}},{session:{source:"smoke"}},{session:{authEnabled:false}},{session:{email:"other@example.test"}}
  ]) {const h=bridgeHarness(options),r=await h.send({action:"search",input});assert.equal(r.status,404);assert.equal(h.counts().loads,0);assert.equal(h.counts().reads,0);}
  for(const headers of [{host:"attacker.invalid","x-forwarded-host":"127.0.0.1:3883"},{host:"localhost:3883"},
    {host:"127.0.0.1:3884"},{origin:"https://attacker.invalid"},{"sec-fetch-site":"cross-site"},{"sec-fetch-site":"same-site"}]) {
    const h=bridgeHarness(),r=await h.send({action:"search",input},{headers});assert.equal(r.status,404);assert.equal(h.counts().sessionReads,0);assert.equal(h.counts().loads,0);
  }
});
test("scope filtering, unsupported date, no results and context/path injection fail closed",async()=>{
  const h=bridgeHarness();
  for(const [change,state] of [[{lawId:"999998"},"LAW_NOT_HELD"],[{mst:"2"},"VERSION_NOT_HELD"],
    [{manifestSha256:"0".repeat(64)},"VERSION_NOT_HELD"],[{effectiveDate:"20250101"},"VERSION_NOT_HELD"],
    [{applicableOn:"2026-01-01"},"UNSUPPORTED"],[{root:"/etc"},"INVALID_INPUT"],[{sessionId:"unseen-attempt"},"INVALID_INPUT"],
    [{purpose:"MEASUREMENT"},"INVALID_INPUT"],[{queryText:"also"},"INVALID_INPUT"],[{matchCount:21},"INVALID_INPUT"]]) {
    assert.equal((await h.send({action:"search",input:{...input,...change}})).body.state,state);
  }
  assert.equal(h.counts().reads,0);
  assert.equal((await h.send({action:"search",input:{...input,articleNumber:"999"}})).body.state,"NO_RESULTS");
  assert.equal((await h.send({action:"search",input},{query:"?root=private"})).status,400);
  assert.equal((await h.send({action:"search",input,reference})).status,400);
});
test("failed and tampered references do not leak original body or exception/path",async()=>{
  const h=bridgeHarness();
  for(const ref of [{...reference,textSha256:"0".repeat(64)},{...reference,mst:"2"},{...reference,jsonPointer:"/elsewhere"},
    {...reference,raw_xml_sha256:"fake"},{schemaVersion:"DatabaseReference",id:"not-a-uuid"}]) {
    const r=await h.send({action:"reopen",reference:ref});assert.equal(r.body.state,"INTEGRITY_ERROR");assert.deepEqual(r.body.anchors,[]);
  }
  for(const state of ["INTEGRITY_ERROR","SEARCH_FAILED"]) {
    h.fail(state);const r=await h.send({action:"search",input});assert.equal(r.status,503);assert.deepEqual(r.body.anchors,[]);
  }
  const throwing=bridgeHarness({reader:{listSnapshots(){throw Error("PRIVATE_PATH_AND_BODY");}}});
  assert.ok(!JSON.stringify(await throwing.send()).includes("PRIVATE_PATH_AND_BODY"));
  assert.equal((await bridgeHarness({notConfigured:true}).send()).body.state,"NOT_CONFIGURED");
});
test("bounded parser rejects duplicate keys, invalid UTF-8 and real oversized bytes before reader access",async()=>{
  const h=bridgeHarness();
  assert.equal((await h.send('{"action":"search","action":"reopen","input":{}}')).status,400);
  assert.equal((await h.send(" ".repeat(16385),{headers:{"content-length":"1"}})).status,413);
  assert.equal(h.counts().loads,0);
  let canceled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(16384));controller.enqueue(new Uint8Array(1));},cancel(){canceled=true;}});
  const r=await h.handler(new Request("http://127.0.0.1:3883/api/bridge",{method:"POST",headers:{host:"127.0.0.1:3883","content-type":"application/json"},body:stream,duplex:"half"}));
  assert.equal(r.status,413);assert.equal(canceled,true);assert.equal(h.counts().loads,0);
  const bad=await h.handler(new Request("http://127.0.0.1:3883/api/bridge",{method:"POST",headers:{host:"127.0.0.1:3883","content-type":"application/json"},body:new Uint8Array([255])}));
  assert.equal(bad.status,400);
  const denied=bridgeHarness({env:{INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED:"false"}});
  let pulled=false;const deniedBody=new ReadableStream({pull(){pulled=true;}},{highWaterMark:0});
  const blocked=await denied.handler(new Request("http://127.0.0.1:3883/api/bridge",{method:"POST",headers:{host:"127.0.0.1:3883"},body:deniedBody,duplex:"half"}));
  assert.equal(blocked.status,404);assert.equal(pulled,false);
});
test("pinned source loader loads exact dependency bytes and rejects source/dependency/path drift",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"synthetic-bridge-")),sourceRoot=path.join(root,"source"),restore=path.join(root,"restore");
  fs.mkdirSync(path.join(sourceRoot,"src"),{recursive:true});fs.mkdirSync(restore);
  const entry='import {state} from "./dependency.mjs";export const createStatuteSnapshotReader=()=>({listSnapshots:()=>({state,snapshots:[]}),search:()=>({state}),readReference:()=>({state})});';
  const dep='export const state="OK";';
  fs.writeFileSync(path.join(sourceRoot,"src/statute-snapshot-reader.mjs"),entry);fs.writeFileSync(path.join(sourceRoot,"src/dependency.mjs"),dep);
  const source={revision:"1".repeat(40),tree:"2".repeat(40),entry:"src/statute-snapshot-reader.mjs",dependencyFiles:[
    {path:"src/statute-snapshot-reader.mjs",sha256:digest(entry),bytes:Buffer.byteLength(entry)},
    {path:"src/dependency.mjs",sha256:digest(dep),bytes:Buffer.byteLength(dep)}]};
  const settings={sourceRoot,root:restore,catalogPath:path.join(restore,"catalog.json"),catalogSha256:digest("catalog")};
  try {
    assert.equal((await loadSnapshotBridge(settings,source)).list().state,"OK");
    fs.appendFileSync(path.join(sourceRoot,"src/dependency.mjs")," ");
    assert.equal((await loadSnapshotBridge(settings,source)).list().state,"INTEGRITY_ERROR");
    assert.equal((await loadSnapshotBridge({...settings,catalogPath:path.join(root,"escape.json")},source)).list().state,"INTEGRITY_ERROR");
    assert.equal((await loadSnapshotBridge(settings,{...source,dependencyFiles:[]})).list().state,"INTEGRITY_ERROR");
  }finally {fs.rmSync(root,{recursive:true,force:true});}
});
test("route/page use production composition; initial server page has no body props or learning execution entry",()=>{
  const page=fs.readFileSync("app/(owner-first-stage)/app/first-stage/legal-evidence/page.tsx","utf8");
  assert.match(page,/requireOwnerLegalEvidencePage/);assert.match(page,/<OwnerLegalEvidence\s*\/>/);
  assert.doesNotMatch(page,/loadSnapshotBridge|bodyText|readReference|catalogPath/);
  const route=fs.readFileSync("app/api/review-os/first-stage/legal-evidence/route.ts","utf8");
  assert.match(route,/GET = handleOwnerLegalEvidence/);assert.match(route,/POST = handleOwnerLegalEvidence/);
  for(const file of ["components/review-os/owner-local-trial-workbench.tsx","components/review-os/first-stage-private-practice.tsx"]) {
    assert.doesNotMatch(fs.readFileSync(file,"utf8"),/legal-evidence|owner-snapshot-bridge/);
  }
});
