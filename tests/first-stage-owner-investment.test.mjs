import assert from "node:assert/strict";
import test from "node:test";
import { parseQuestionReference } from "../lib/review-os/first-stage/kernel/domain.ts";
import * as boundary from "../lib/review-os/first-stage/runtime/owner-original-boundary.ts";
import { investmentCalculation } from "../lib/review-os/first-stage/runtime/owner-investment-calculation.ts";
import { composeOwnerOriginalCatalog, loadOwnerInvestmentContent } from "../lib/review-os/first-stage/runtime/owner-investment-content.ts";
import { createOwnerOriginalApplication, authorizeOwnerOriginalAdapter, authorizeOwnerOriginalCatalog, ownerOriginalBankCandidates, ownerOriginalHistoryCandidates, activeOwnerOriginalReference, catalogForOwnerOriginalHistory } from "../lib/review-os/first-stage/runtime/owner-original-context.ts";
import { createSubjectAdapterRegistry } from "../lib/review-os/first-stage/subject-adapter/subject-adapter.ts";
import { createPrivateFirstStageSessionService, privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
import { createReviewedBankService } from "../lib/review-os/first-stage/runtime/reviewed-bank-service.ts";
import { harness } from "./fixtures/first-stage-private-session-harness.mjs";
import { ownerLocalInvestmentEnvironment } from "../scripts/local/owner-economics-app.mjs";
const env={NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55431",INVERGE_OWNER_ORIGINAL_TEST_ONLY:"isolated_synthetic",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"true",ALPHA_ADMIN_EMAILS:"synthetic@example.test",INVERGE_OWNER_FIRST_STAGE_EMAILS:"synthetic@example.test"};
const auth={isAuthenticated:true,isDemo:false,source:"supabase",userId:"synthetic-owner",email:"synthetic@example.test"};
const now=()=>"2026-09-19T12:00:00.000Z";
const reference=(investment,index)=>parseQuestionReference({schemaVersion:"first_stage.owner_original_question_reference.v1",questionId:(investment?boundary.OWNER_INVESTMENT_IDS:boundary.OWNER_ORIGINAL_IDS)[index],questionVersion:investment?boundary.OWNER_INVESTMENT_VERSION:boundary.OWNER_ORIGINAL_VERSION,subjectId:"real_estate_principles",examYear:null,examRound:null,questionNumber:null,sessionId:investment?boundary.OWNER_INVESTMENT_SESSION:"owner-original-real-estate-v2",choiceCount:5,sourceVersionManifestIds:[`owner-original-${investment?boundary.OWNER_INVESTMENT_PACKET_SHA256:boundary.OWNER_ORIGINAL_PACKET_SHA256}`],rightsState:"owner_authorized_original",currentnessState:"stated_model_only"});
function leaf(investment=false,enabled=true){
 const refs=investment?[reference(true,0),reference(true,2)]:[reference(false,0)];
 const a={schemaVersion:"dabangil.first_stage.subject_adapter.v1",adapterId:boundary.OWNER_ORIGINAL_ADAPTER,adapterVersion:"1",subjectId:"real_estate_principles",assertQuestionReference(r){assert.ok(activeOwnerOriginalReference(a,r));assert.equal(r.questionVersion,refs[0].questionVersion);},presentQuestion(r){this.assertQuestionReference(r);return {schemaVersion:"first_stage.mcq_question_presentation.v1",questionReference:r,stem:"Synthetic unit-only problem",choices:[1,2,3,4,5].map(choiceId=>({choiceId,body:`Synthetic ${choiceId}`})),sourceStatusLabel:r.rightsState,currentnessStatusLabel:r.currentnessState,learningReferenceDisclaimer:true};},evaluateSubmission(){throw Error("not used by reservation unit");},buildIndependentRetry(){throw Error("not used by reservation unit");}};
 authorizeOwnerOriginalAdapter(a);
 const c={digest:digest(investment?"unit-addition":"unit-legacy"),registry:createSubjectAdapterRegistry([a]),initialReferences:refs,retryAvailability:()=>"available",explanation:()=>({text:"Synthetic explanation",sourceStatus:"machine_checked_owner_local",learningReferenceDisclaimer:true})};
 const candidates=refs.map((r,i)=>({candidateId:r.questionId,candidateDigest:`sha256:${digest(r)}`,familyId:`unit-family-${r.questionId}`,surfaceId:r.questionId,bankClass:"LEARNING_PRACTICE",origin:"BANK_STOCK",contentAuthority:"LEARNING_ONLY",rightsStatus:"OWNER_AUTHORIZED_ORIGINAL",sourceStatus:"STATED_MODEL_ONLY",releaseChainComplete:false,unseenEligibilitySnapshotSealed:false,nonSameSurfaceAsSource:false,familyIsolated:false,calibrationState:"UNASSESSED",timedProtocolBound:false,chronology:null,chronologyAuthority:null,availableAt:"2026-09-17T00:00:00.000Z",priority:i}));
 authorizeOwnerOriginalCatalog(c,candidates,enabled?refs.map(r=>r.questionId):[]);return c;
}
async function scope(run){let error;const app=createOwnerOriginalApplication({environment:()=>env,session:async()=>auth,repository:()=>{throw Error("unit only");},catalog:async()=>{try{await run();}catch(e){error=e;}return null;}});await app(new Request("http://127.0.0.1:3884/api/unit"));if(error)throw error;}
test("four closed calculations retain time units and reject unsupported assumptions",()=>{
 const npv={initialPrice:"1000",end1Income:"110",end2Income:"121",end2Sale:"1089",oneYearDiscountRate:"0.1"};
 assert.deepEqual(investmentCalculation("npv_two_years",npv).result,{decimal:"100",unit:"KRW"});
 const {initialPrice,...flows}=npv;assert.deepEqual(investmentCalculation("npv_zero_price",flows).result,{decimal:"1100",unit:"KRW"});
 const equity={purchasePrice:"1000",loanPrincipal:"600",annualInterestRate:"0.05",annualNetOperatingIncome:"80"};
 assert.deepEqual(investmentCalculation("equity_cash_yield",equity).result,{decimal:"0.125",unit:"YEAR^-1"});
 const {annualNetOperatingIncome,...loan}=equity;assert.deepEqual(investmentCalculation("equity_required_income",{...loan,targetAnnualCashYield:"0.125"}).result,{decimal:"80",unit:"KRW*YEAR^-1"});
 for(const facts of [{...equity,loanPrincipal:"1000"},{...equity,annualInterestRate:"0"},{...equity,principalRepayment:"10"},{...equity,annualNetOperatingIncome:"80.0"}])assert.throws(()=>investmentCalculation("equity_cash_yield",facts));
 assert.throws(()=>investmentCalculation("irr",npv));assert.throws(()=>investmentCalculation("npv_zero_price",npv));
});
test("new reference remains exact subject, hash, ID, version and source tuple",async()=>{
 for(let i=0;i<4;i++)for(const delta of [{questionId:"new-unapproved"},{questionVersion:boundary.OWNER_ORIGINAL_VERSION},{examYear:2026},{sessionId:"owner-original-real-estate-v2"},{sourceVersionManifestIds:[`owner-original-${boundary.OWNER_ORIGINAL_PACKET_SHA256}`]},{subjectId:"accounting"}])assert.throws(()=>parseQuestionReference({...reference(true,i),...delta}));
 assert.equal(await loadOwnerInvestmentContent(async()=>new TextEncoder().encode("{}"),true),null);
});
test("legacy reservation survives extension, cannot be reassigned, and assignment-off retains exact replays",async()=>scope(async()=>{
 const base=leaf(),added=leaf(true),combined=composeOwnerOriginalCatalog(base,added,true),h=harness({catalog:base}),assignments=new Map();
 const bank={async load(owner,id){const assignment=assignments.get(id);return assignment?{session:await h.store.load(owner,id),assignment}:null;},async reserve(value,assignment){assert.ok(![...h.rows.values()].some(r=>r.ownerId===value.ownerId&&r.state.examCycle.questionReferences[0].questionId===assignment.candidateId),"duplicate identity reached reservation");const session=await h.store.create(value);assignments.set(session.sessionId,assignment);return {session,assignment};}};
 const legacy=createReviewedBankService(h.store,bank,base,now);const old=await legacy.assign(auth.userId,"legacy");const snapshot=structuredClone(await h.store.load(auth.userId,old.view.sessionId));
 const peers=async()=>[base,added];const current=createReviewedBankService(h.store,bank,combined,now,peers);
 assert.equal((await current.availability(auth.userId)).availableOriginals,2);
 const first=await current.assign(auth.userId,"addition-1"),second=await current.assign(auth.userId,"addition-2");
 assert.equal((await current.availability(auth.userId)).availableOriginals,0);assert.equal(h.rows.size,3);
 assert.deepEqual(await h.store.load(auth.userId,old.view.sessionId),snapshot);
 const off=composeOwnerOriginalCatalog(base,added,false);assert.equal(off.digest,combined.digest);assert.equal(ownerOriginalBankCandidates(off).length,1);assert.equal(ownerOriginalHistoryCandidates(off).length,3);
 const disabled=createReviewedBankService(h.store,bank,off,now,peers);
 for(const [key,expected] of [["legacy",old],["addition-1",first],["addition-2",second]])assert.deepEqual(await disabled.assign(auth.userId,key),expected);
 assert.equal((await disabled.assign(auth.userId,"new-disabled")).status,"no_available_stock");
 const service=createPrivateFirstStageSessionService(h.store,off,now);
 await assert.rejects(()=>service.create(auth.userId,{requestId:"manual-bypass",questionId:reference(true,0).questionId}));
 assert.equal(catalogForOwnerOriginalHistory(off,[base],base.digest),base);
 assert.throws(()=>catalogForOwnerOriginalHistory(off,[{...base}],base.digest));
 assert.equal((await service.getTodayContinuation(auth.userId,peers)).state,"ready");
 assert.equal(h.rows.size,3);
}));
test("content-only launcher pins exact installation and preserves existing environment",()=>{
 const base={NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",preserved:"yes"};
 const installation={schemaVersion:"owner_investment_installation.v1",assignmentEnabled:true,backupVerified:true,database:"inverge_owner_economics_db_loopback/postgres",contentSha256:boundary.OWNER_INVESTMENT_PACKET_SHA256};
 const path=process.platform==="win32"?"C:/private/candidate.json":"/private/candidate.json";
 const enabled=ownerLocalInvestmentEnvironment(base,installation,path,installation.contentSha256);assert.equal(enabled.preserved,"yes");assert.equal(enabled.INVERGE_OWNER_INVESTMENT_ASSIGNMENT_ENABLED,"true");
 const off=ownerLocalInvestmentEnvironment(base,{...installation,assignmentEnabled:false},path,installation.contentSha256);assert.equal(off.INVERGE_OWNER_INVESTMENT_ASSIGNMENT_ENABLED,"false");assert.equal(off.INVERGE_OWNER_INVESTMENT_CONTENT_PATH,path);
 for(const change of [{contentSha256:"0".repeat(64)},{database:"remote/postgres"},{backupVerified:false},{assignmentEnabled:"true"}])assert.throws(()=>ownerLocalInvestmentEnvironment(base,{...installation,...change},path,installation.contentSha256));
 assert.throws(()=>ownerLocalInvestmentEnvironment({...base,VERCEL:"1"},installation,path,installation.contentSha256));
});
