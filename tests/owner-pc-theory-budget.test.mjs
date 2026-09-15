import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { THEORY_POLICY as policy, initializeTheoryBudget, reserveTheoryCall, readTheoryBudget,
  generateOwnerTheory, validateTheorySettings } from "../lib/owner-study/owner-pc-theory-budget.mjs";
const settings = () => ({ version: policy.version, model: policy.model, apiKey: "synthetic-never-provider-key", projectId: "synthetic-project",
  ownerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", paidProjectVerified: true, dataSharingEnabled: false,
  verifiedAt: new Date().toISOString(), verificationEvidenceSha256: "a".repeat(64) });
const authority = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sourceItemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", purpose: "app1_initial_analysis" };
const request = { contents: [{role: "user", parts: [{text: "SYNTHETIC_BODY_NOT_IN_LEDGER"}]}], generationConfig: {temperature: 0.1, responseMimeType: "application/json"} };
async function fixture() { const root = path.join(await mkdtemp(path.join(os.tmpdir(), "theory-budget-")), "budget"); const config = settings(); await initializeTheoryBudget(root, config); return {root, config}; }
test("all billable input/output/thinking is reserved under one permanent USD 5 cap", () => {
  assert.equal(policy.reservationMicros, Math.ceil(policy.inputTokenMaximum * 0.30 + (policy.maxOutputTokens + policy.thinkingBudget) * 2.50));
  assert.ok(policy.maximumCalls * policy.reservationMicros <= policy.budgetMicros);
  assert.ok((policy.maximumCalls + 1) * policy.reservationMicros > policy.budgetMicros);
});
test("atomic reservations survive independent processes and exhaust without reset or raw bodies", async () => {
  const {root, config} = await fixture();
  await reserveTheoryCall(root, config, authority);
  const moduleUrl = new URL("../lib/owner-study/owner-pc-theory-budget.mjs", import.meta.url).href;
  const script = `import {reserveTheoryCall} from ${JSON.stringify(moduleUrl)}; const [root,config,authority]=JSON.parse(process.argv[1]); try {await reserveTheoryCall(root,config,authority); process.exitCode=0;} catch(e){process.exitCode=e.code==='OWNER_THEORY_BUDGET_EXHAUSTED'?2:3;}`;
  const codes = await Promise.all(Array.from({length: 24}, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script, JSON.stringify([root,config,authority])], {stdio:"ignore",windowsHide:true});
    child.on("error", reject); child.on("exit",resolve);
  })));
  assert.equal(codes.filter(x => x===0).length, 13); assert.equal(codes.filter(x => x===2).length, 11);
  assert.equal((await readTheoryBudget(root,config)).remainingCalls,0);
  await assert.rejects(initializeTheoryBudget(root,config), {code:"EEXIST"});
  const tomorrow={...config,verifiedAt:new Date(Date.now()-86400000).toISOString()};
  await assert.rejects(reserveTheoryCall(root,tomorrow,authority), {code:"OWNER_THEORY_BUDGET_EXHAUSTED"});
  for(const name of await readdir(root)) { const body=await readFile(path.join(root,name),"utf8"); assert.ok(!body.includes(config.apiKey)); assert.ok(!body.includes("SYNTHETIC_BODY_NOT_IN_LEDGER")); }
});
test("unknown timeout, partial reservation and manual retry never release spend", async () => {
  const {root, config}=await fixture(); let calls=0;
  await assert.rejects(generateOwnerTheory(root,config,authority,request,async()=>{calls++;throw new Error("timeout");}));
  await writeFile(path.join(root,"call-02.json"),"",{flag:"wx"});
  assert.equal((await readTheoryBudget(root,config)).usedReservations,2);
  await generateOwnerTheory(root,config,{...authority,purpose:"repair_verification"},request,async(url,init)=>{
    calls++; assert.match(url,/models\/gemini-2\.5-flash:generateContent$/);
    const body=JSON.parse(init.body); assert.equal(body.generationConfig.maxOutputTokens,8192); assert.equal(body.generationConfig.thinkingConfig.thinkingBudget,1024);
    assert.equal(body.generationConfig.candidateCount,1); assert.equal(init.redirect,"error");
    assert.equal((await readTheoryBudget(root,config)).usedReservations,3);
    return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:"{}"}]}}]});
  });
  assert.equal(calls,2); assert.equal((await readTheoryBudget(root,config)).usedReservations,3);
});
test("unpaid/stale/shared configuration, different case/key and unbounded requests never call provider", async () => {
  const {root,config}=await fixture(); let calls=0;const transport=async()=>{calls++;throw Error("must not call");};
  for(const delta of [{paidProjectVerified:false},{dataSharingEnabled:true},{model:"other-model"},{verifiedAt:"2020-01-01"},{verificationEvidenceSha256:""}]) {
    assert.throws(()=>validateTheorySettings({...config,...delta}));
    await assert.rejects(generateOwnerTheory(root,{...config,...delta},authority,request,transport));
  }
  await reserveTheoryCall(root,config,authority);
  await assert.rejects(reserveTheoryCall(root,config,{...authority,sourceItemId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}),{code:"OWNER_THEORY_ONE_CASE_ONLY"});
  await assert.rejects(reserveTheoryCall(root,{...config,apiKey:"different-synthetic-key"},authority),{code:"OWNER_THEORY_BUDGET_BINDING_CHANGED"});
  for(const bad of [{...request,tools:[{}]}, {...request,generationConfig:{maxOutputTokens:999999}}, {...request,contents:[{role:"user",parts:[{inlineData:{data:"no"}}]}]}, {...request,contents:[{role:"user",parts:[{text:"x".repeat(140000)}]}]}]) await assert.rejects(generateOwnerTheory(root,config,authority,bad,transport));
  assert.equal(calls,0); assert.equal((await readTheoryBudget(root,config)).usedReservations,1);
});

test("ordinary economics startup and rollback never inherit Theory/provider authority", async () => {
 const {ownerLocalAppEnvironment,ownerLocalTheoryEnvironment}=await import("../scripts/local/owner-economics-app.mjs");
 const base={LOCALAPPDATA:"C:/synthetic",GEMINI_API_KEY:"do-not-inherit",INVERGE_OWNER_PC_THEORY_ENABLED:"true",AI_COST_GUARDRAIL_ADMIN_OVERRIDE:"true",WCV_C2R_C_P_ENABLED:"true"};
 const keys={anon:"synthetic-anon",service:"synthetic-service"};
 const economics=ownerLocalAppEnvironment(base,keys,"C:/synthetic-private");
 assert.equal(economics.INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED,"true");
 for(const key of ["GEMINI_API_KEY","INVERGE_OWNER_PC_THEORY_ENABLED","AI_COST_GUARDRAIL_ADMIN_OVERRIDE","APP1_VERIFICATION_SIGNING_SECRET"]) assert.equal(economics[key],undefined);
 const theory=ownerLocalTheoryEnvironment(base,keys,"a".repeat(43),"C:/synthetic-private");
 assert.equal(theory.INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED,"true");assert.equal(theory.INVERGE_OWNER_PC_THEORY_ENABLED,"true");
 assert.equal(theory.WCV_C2R_C_T_THEORY_ENABLED,"true");assert.equal(theory.GEMINI_API_KEY,undefined);
 assert.equal(theory.AI_COST_GUARDRAIL_ADMIN_OVERRIDE,undefined);
});
