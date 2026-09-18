import assert from "node:assert/strict";
import test from "node:test";
import { parseQuestionReference } from "../lib/review-os/first-stage/kernel/domain.ts";
import * as boundary from "../lib/review-os/first-stage/runtime/owner-original-boundary.ts";
import { marketCalculation } from "../lib/review-os/first-stage/runtime/owner-market-calculation.ts";
import { composeOwnerMarketCatalog, loadOwnerMarketContent } from "../lib/review-os/first-stage/runtime/owner-market-content.ts";
import { composeOwnerOriginalCatalog, loadOwnerInvestmentContent } from "../lib/review-os/first-stage/runtime/owner-investment-content.ts";
import { createOwnerOriginalApplication, authorizeOwnerOriginalAdapter, authorizeOwnerOriginalCatalog, ownerOriginalBankCandidates, ownerOriginalHistoryCandidates, activeOwnerOriginalReference, catalogForOwnerOriginalHistory } from "../lib/review-os/first-stage/runtime/owner-original-context.ts";
import { createSubjectAdapterRegistry } from "../lib/review-os/first-stage/subject-adapter/subject-adapter.ts";
import { createPrivateFirstStageSessionService, privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { createReviewedBankService } from "../lib/review-os/first-stage/runtime/reviewed-bank-service.ts";
import { harness } from "./fixtures/first-stage-private-session-harness.mjs";
import { ownerLocalMarketEnvironment } from "../scripts/local/owner-economics-app.mjs";
const env={NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55431",INVERGE_OWNER_ORIGINAL_TEST_ONLY:"isolated_synthetic",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"true",ALPHA_ADMIN_EMAILS:"synthetic@example.test",INVERGE_OWNER_FIRST_STAGE_EMAILS:"synthetic@example.test"};
const auth={isAuthenticated:true,isDemo:false,source:"supabase",userId:"synthetic-owner",email:"synthetic@example.test"};
const now=()=>"2026-09-19T12:00:00.000Z";
const reference=(kind,index)=>parseQuestionReference({schemaVersion:"first_stage.owner_original_question_reference.v1",questionId:(kind===2?boundary.OWNER_MARKET_IDS:kind===1?boundary.OWNER_INVESTMENT_IDS:boundary.OWNER_ORIGINAL_IDS)[index],questionVersion:kind===2?boundary.OWNER_MARKET_VERSION:kind===1?boundary.OWNER_INVESTMENT_VERSION:boundary.OWNER_ORIGINAL_VERSION,subjectId:"real_estate_principles",examYear:null,examRound:null,questionNumber:null,sessionId:kind===2?boundary.OWNER_MARKET_SESSION:kind===1?boundary.OWNER_INVESTMENT_SESSION:"owner-original-real-estate-v2",choiceCount:5,sourceVersionManifestIds:[`owner-original-${kind===2?boundary.OWNER_MARKET_PACKET_SHA256:kind===1?boundary.OWNER_INVESTMENT_PACKET_SHA256:boundary.OWNER_ORIGINAL_PACKET_SHA256}`],rightsState:"owner_authorized_original",currentnessState:"stated_model_only"});
function leaf(kind=0,enabled=true){
 const refs=kind?[reference(kind,0),reference(kind,2)]:[reference(0,0)];
 const a={schemaVersion:"dabangil.first_stage.subject_adapter.v1",adapterId:boundary.OWNER_ORIGINAL_ADAPTER,adapterVersion:"1",subjectId:"real_estate_principles",assertQuestionReference(r){assert.ok(activeOwnerOriginalReference(a,r));assert.equal(r.questionVersion,refs[0].questionVersion);},presentQuestion(r){this.assertQuestionReference(r);return {schemaVersion:"first_stage.mcq_question_presentation.v1",questionReference:r,stem:"Synthetic unit-only problem",choices:[1,2,3,4,5].map(choiceId=>({choiceId,body:`Synthetic ${choiceId}`})),sourceStatusLabel:r.rightsState,currentnessStatusLabel:r.currentnessState,learningReferenceDisclaimer:true};},evaluateSubmission(){throw Error("not used by reservation unit");},buildIndependentRetry(){throw Error("not used by reservation unit");}};
 authorizeOwnerOriginalAdapter(a);
 const c={digest:digest(`unit-leaf-${kind}`),registry:createSubjectAdapterRegistry([a]),initialReferences:refs,retryAvailability:()=>"available",explanation:()=>({text:"Synthetic explanation",sourceStatus:"machine_checked_owner_local",learningReferenceDisclaimer:true})};
 const candidates=refs.map((r,i)=>({candidateId:r.questionId,candidateDigest:`sha256:${digest(r)}`,familyId:`unit-family-${r.questionId}`,surfaceId:r.questionId,bankClass:"LEARNING_PRACTICE",origin:"BANK_STOCK",contentAuthority:"LEARNING_ONLY",rightsStatus:"OWNER_AUTHORIZED_ORIGINAL",sourceStatus:"STATED_MODEL_ONLY",releaseChainComplete:false,unseenEligibilitySnapshotSealed:false,nonSameSurfaceAsSource:false,familyIsolated:false,calibrationState:"UNASSESSED",timedProtocolBound:false,chronology:null,chronologyAuthority:null,availableAt:"2026-09-17T00:00:00.000Z",priority:i}));
 authorizeOwnerOriginalCatalog(c,candidates,enabled?refs.map(r=>r.questionId):[]);return c;
}
async function scope(run){let error;const app=createOwnerOriginalApplication({environment:()=>env,session:async()=>auth,repository:()=>{throw Error("unit only");},catalog:async()=>{try{await run();}catch(e){error=e;}return null;}});await app(new Request("http://127.0.0.1:3884/api/unit"));if(error)throw error;}
test("market closed models reproduce approved results and reject unsupported directions",()=>{
 const equilibrium={demandIntercept:"160",supplyIntercept:"40",demandSlopePerKrw:"0.0001",supplySlopePerKrw:"0.0001"};
 assert.deepEqual(marketCalculation("linear_rent_equilibrium",equilibrium).result,{decimal:"600000",unit:"KRW"});
 assert.deepEqual(marketCalculation("demand_intercept_shift",{...equilibrium,targetRent:"700000"}).result,{decimal:"20",unit:"COUNT"});
 const arc={oldRent:"400000",newRent:"600000",oldQuantity:"120",newQuantity:"80"};
 assert.deepEqual(marketCalculation("midpoint_arc_elasticity",arc).result,{decimal:"1",unit:"1"});
 const inverse={oldRent:"400000",newRent:"600000",oldQuantity:"120",targetElasticity:"1.25"};
 assert.deepEqual(marketCalculation("midpoint_target_quantity",inverse).result,{decimal:"72",unit:"COUNT"});
 for(const delta of [{demandSlopePerKrw:"0"},{demandSlopePerKrw:"-0.1"},{demandIntercept:"40"},{other:"1"}])assert.throws(()=>marketCalculation("linear_rent_equilibrium",{...equilibrium,...delta}));
 for(const targetRent of ["600000","599999"])assert.throws(()=>marketCalculation("demand_intercept_shift",{...equilibrium,targetRent}));
 for(const delta of [{newRent:"400000"},{newRent:"300000"},{newQuantity:"120"},{newQuantity:"0"},{oldQuantity:"120.0"}])assert.throws(()=>marketCalculation("midpoint_arc_elasticity",{...arc,...delta}));
 for(const targetElasticity of ["0","5","5.1"])assert.throws(()=>marketCalculation("midpoint_target_quantity",{...inverse,targetElasticity}));
 assert.throws(()=>marketCalculation("prediction",arc));
});
test("market references reject wrong IDs, binding and official metadata",async()=>{
 for(let i=0;i<4;i++)for(const delta of [{questionId:"unapproved"},{questionVersion:boundary.OWNER_INVESTMENT_VERSION},{examYear:2026},{sessionId:boundary.OWNER_INVESTMENT_SESSION},{sourceVersionManifestIds:[`owner-original-${boundary.OWNER_INVESTMENT_PACKET_SHA256}`]},{subjectId:"accounting"}])assert.throws(()=>parseQuestionReference({...reference(2,i),...delta}));
 assert.equal(await loadOwnerMarketContent(async()=>new TextEncoder().encode("{}"),true),null);
});
test("independent flags preserve stable five-initial history and disabled stock",async()=>scope(()=>{
 const base=leaf(),investment=leaf(1),market=leaf(2);let identity;
 for(const investmentOn of [false,true])for(const marketOn of [false,true]){
  const old=composeOwnerOriginalCatalog(base,investment,investmentOn),all=composeOwnerMarketCatalog(old,market,marketOn);
  identity??=all.digest;assert.equal(all.digest,identity);assert.equal(ownerOriginalHistoryCandidates(all).length,5);
  assert.deepEqual(ownerOriginalBankCandidates(all).map(c=>c.candidateId),[boundary.OWNER_ORIGINAL_IDS[0],...(investmentOn?[boundary.OWNER_INVESTMENT_IDS[0],boundary.OWNER_INVESTMENT_IDS[2]]:[]),...(marketOn?[boundary.OWNER_MARKET_IDS[0],boundary.OWNER_MARKET_IDS[2]]:[])]);
 }
}));
test("old six/intermediate history survive; OFF blocks remaining stock but preserves replay",async()=>scope(async()=>{
 const legacy=leaf(),investment=leaf(1),market=leaf(2),old=composeOwnerOriginalCatalog(legacy,investment,true),intermediate=composeOwnerMarketCatalog(legacy,market,true),combined=composeOwnerMarketCatalog(old,market,true);
 const h=harness({catalog:legacy}),assignments=new Map();
 const bank={async load(owner,id){const assignment=assignments.get(id);return assignment?{session:await h.store.load(owner,id),assignment}:null;},async reserve(value,assignment){assert.ok(![...h.rows.values()].some(r=>r.ownerId===value.ownerId&&r.state.examCycle.questionReferences[0].questionId===assignment.candidateId),"duplicate reservation");const session=await h.store.create(value);assignments.set(session.sessionId,assignment);return {session,assignment};}};
 const older=createReviewedBankService(h.store,bank,legacy,now),oldest=await older.assign(auth.userId,"legacy");
 const prior=createReviewedBankService(h.store,bank,old,now,async()=>[legacy]);await prior.assign(auth.userId,"investment-1");await prior.assign(auth.userId,"investment-2");
 const snapshot=structuredClone([...h.rows.values()]);
 const partial=createReviewedBankService(h.store,bank,intermediate,now,async()=>[legacy,old]);const first=await partial.assign(auth.userId,"market-1");
 const peers=async()=>[legacy,old,intermediate],current=createReviewedBankService(h.store,bank,combined,now,peers);
 assert.equal((await current.availability(auth.userId)).availableOriginals,1);
 const off=composeOwnerMarketCatalog(old,market,false);assert.equal(off.digest,combined.digest);
 const disabled=createReviewedBankService(h.store,bank,off,now,peers);assert.equal((await disabled.availability(auth.userId)).availableOriginals,0);
 assert.equal((await disabled.assign(auth.userId,"new-disabled")).status,"no_available_stock");assert.equal(h.rows.size,4);
 assert.deepEqual(await disabled.assign(auth.userId,"legacy"),oldest);assert.deepEqual(await disabled.assign(auth.userId,"market-1"),first);
 const service=createPrivateFirstStageSessionService(h.store,off,now);await assert.rejects(()=>service.create(auth.userId,{requestId:"manual-bypass",questionId:reference(2,2).questionId}));
 assert.equal(catalogForOwnerOriginalHistory(off,[intermediate],intermediate.digest),intermediate);assert.throws(()=>catalogForOwnerOriginalHistory(off,[{...intermediate}],intermediate.digest));
 assert.equal((await service.getTodayContinuation(auth.userId,peers)).state,"ready");
 const second=await current.assign(auth.userId,"market-2");assert.equal(second.status,"assigned");assert.equal((await current.availability(auth.userId)).availableOriginals,0);assert.equal(h.rows.size,5);
 assert.deepEqual([...h.rows.values()].slice(0,3),snapshot);
}));
test("market launcher pins exact target/hash while preserving old config and OFF path",()=>{
 const base={NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",INVERGE_OWNER_INVESTMENT_ASSIGNMENT_ENABLED:"false",preserved:"yes"};
 const installation={schemaVersion:"owner_market_installation.v1",assignmentEnabled:true,backupVerified:true,database:"inverge_owner_economics_db_loopback/postgres",contentSha256:boundary.OWNER_MARKET_PACKET_SHA256};
 const path=process.platform==="win32"?"C:/private/candidate.json":"/private/candidate.json";
 const enabled=ownerLocalMarketEnvironment(base,installation,path,installation.contentSha256);assert.equal(enabled.preserved,"yes");assert.equal(enabled.INVERGE_OWNER_MARKET_ASSIGNMENT_ENABLED,"true");assert.equal(enabled.INVERGE_OWNER_INVESTMENT_ASSIGNMENT_ENABLED,"false");
 const off=ownerLocalMarketEnvironment(base,{...installation,assignmentEnabled:false},path,installation.contentSha256);assert.equal(off.INVERGE_OWNER_MARKET_ASSIGNMENT_ENABLED,"false");assert.equal(off.INVERGE_OWNER_MARKET_CONTENT_PATH,path);
 for(const change of [{contentSha256:"0".repeat(64)},{database:"remote/postgres"},{backupVerified:false},{assignmentEnabled:"true"}])assert.throws(()=>ownerLocalMarketEnvironment(base,{...installation,...change},path,installation.contentSha256));
 for(const change of [{VERCEL:"1"},{CI:"true"},{NEXT_PUBLIC_SUPABASE_URL:"https://remote.invalid"}])assert.throws(()=>ownerLocalMarketEnvironment({...base,...change},installation,path,installation.contentSha256));
});
