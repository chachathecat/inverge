import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { OWNER_CONTENT_REGISTRATION as R, OWNER_CONTENT_BUNDLES, ownerContentBundle } from "../lib/review-os/first-stage/runtime/owner-content-registration.mjs";
import { validateRegisteredCalculationItems, loadOwnerRegisteredContent } from "../lib/review-os/first-stage/runtime/owner-registered-content.ts";
import { marketCalculation } from "../lib/review-os/first-stage/runtime/owner-market-calculation.ts";
import { ownerLocalRegisteredEnvironment } from "../scripts/local/owner-economics-app.mjs";
const bundle=ownerContentBundle("market");
const facts=[{demandIntercept:"160",supplyIntercept:"40",demandSlopePerKrw:"0.0001",supplySlopePerKrw:"0.0001"},
 {demandIntercept:"160",supplyIntercept:"40",demandSlopePerKrw:"0.0001",supplySlopePerKrw:"0.0001",targetRent:"700000"},
 {oldRent:"400000",newRent:"600000",oldQuantity:"120",newQuantity:"80"},
 {oldRent:"400000",newRent:"600000",oldQuantity:"120",targetElasticity:"1.25"}];
function synthetic(){return {bundleId:bundle.version,items:bundle.ids.map((id,i)=>{
 const result=marketCalculation(bundle.models[i],facts[i]).result;
 return {id,role:i%2?"practice_retry":"initial",model:bundle.models[i],facts:facts[i],prompt:"Synthetic validation fixture; not admitted content",choices:[1,2,3,4,5].map(id=>({id,value:id===1?result.decimal:String(10000000+id),unit:result.unit,label:`synthetic ${id}`})),answerChoice:1,explanation:"Synthetic",choiceFeedback:[1,2,3,4,5].map(choice=>({choice,text:"Synthetic"})),calculation:{result}};
 })};}
test("registration remains the exact ten approved identities; cannot be mutated at runtime",()=>{
 const pins=OWNER_CONTENT_BUNDLES.map(b=>Object.fromEntries(["key","version","sha256","ids","sessionId"].map(k=>[k,b[k]])));
 assert.equal(createHash("sha256").update(JSON.stringify(pins)).digest("hex"),"dc02617a0b12fceefc7defb5116f70fbf2817925343de92b346ad10f1e8b531c");
 assert.equal(R.schemaVersion,"owner_approved_content_registration.v1");assert.equal(OWNER_CONTENT_BUNDLES.length,3);
 assert.equal(new Set(OWNER_CONTENT_BUNDLES.flatMap(b=>b.ids)).size,10);
 assert.equal(new Set(OWNER_CONTENT_BUNDLES.map(b=>b.sha256)).size,3);
 assert.ok(OWNER_CONTENT_BUNDLES.every(b=>Object.isFrozen(b)&&Object.isFrozen(b.ids)));
 assert.throws(()=>bundle.ids.push("self-approved"));assert.throws(()=>bundle.sha256="0".repeat(64));
 assert.equal(ownerContentBundle("unknown"),null);
});
test("calculation validation rejects wrong model, result, key, role and pair without admitting bytes",async()=>{
 const packet=synthetic();assert.equal(validateRegisteredCalculationItems("market",packet).length,4);
 const cases=[p=>p.items[1].id=p.items[0].id,p=>p.items[1].role="initial",p=>p.items[1].model=p.items[0].model,
 p=>p.items[0].answerChoice=2,p=>p.items[0].calculation.result.decimal="0",p=>p.items[0].choices[0].unit="COUNT",
 p=>p.items[0].choices[1]={...p.items[0].choices[0],id:2},p=>p.items[0].choices[1].id=1,
 p=>p.items[0].choiceFeedback[1].choice=1,p=>p.items[0].model="eval",p=>p.items[0].facts.code="process.exit()",
 p=>p.bundleId="self-approved",p=>p.items.reverse(),p=>p.items.push(p.items[0])];
 for(const mutate of cases){const copy=structuredClone(packet);mutate(copy);assert.throws(()=>validateRegisteredCalculationItems("market",copy));}
 // Successful math/schema validation grants no authority and cannot admit synthetic bytes.
 const bytes=new TextEncoder().encode(JSON.stringify(packet));assert.equal(await loadOwnerRegisteredContent("market",async()=>bytes,true),null);
 let read=false;assert.equal(await loadOwnerRegisteredContent("self-approved",async()=>{read=true;return bytes;},true),null);assert.equal(read,false);
});
test("registered launcher admits only pinned installation, preserves OFF path and unrelated settings",()=>{
 const env={NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",existingSetting:"preserved"};
 const path=process.platform==="win32"?"C:/private/candidate.json":"/private/candidate.json";
 for(const b of OWNER_CONTENT_BUNDLES.filter(b=>b.key!=="original")){
 const installation={schemaVersion:b.installationSchema,assignmentEnabled:false,backupVerified:true,database:R.database,contentSha256:b.sha256};
 const result=ownerLocalRegisteredEnvironment(b.key,env,installation,path,b.sha256);assert.equal(result.existingSetting,"preserved");assert.equal(result[b.pathVariable],path);assert.equal(result[b.flag],"false");
 for(const patch of [{schemaVersion:"self-approved"},{backupVerified:false},{database:"other/postgres"},{contentSha256:"0".repeat(64)},{assignmentEnabled:"true"}])assert.throws(()=>ownerLocalRegisteredEnvironment(b.key,env,{...installation,...patch},path,b.sha256));
 assert.throws(()=>ownerLocalRegisteredEnvironment("unknown",env,installation,path,b.sha256));
 }
});
