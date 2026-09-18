import assert from "node:assert/strict";
import test from "node:test";
import { verifyStatedMarketRelation, validateRegisteredRelationItems } from "../lib/review-os/first-stage/runtime/owner-market-relation.ts";
import { ownerContentBundle } from "../lib/review-os/first-stage/runtime/owner-content-registration.mjs";
import { loadOwnerRegisteredContent } from "../lib/review-os/first-stage/runtime/owner-registered-content.ts";
import { parseQuestionReference } from "../lib/review-os/first-stage/kernel/domain.ts";
import { createOwnerOriginalApplication, authorizeOwnerOriginalAdapter } from "../lib/review-os/first-stage/runtime/owner-original-context.ts";
import { OWNER_ORIGINAL_ADAPTER, ownerOriginalVerification } from "../lib/review-os/first-stage/runtime/owner-original-boundary.ts";
import { validateAttemptEvaluation } from "../lib/review-os/first-stage/subject-adapter/subject-adapter.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";
const b=ownerContentBundle("market_relations");
const proof=i=>verifyStatedMarketRelation({pattern:b.models[i],conditions:b.relationBindings[i].conditions});
function packet(){return {schemaVersion:"owner_stated_market_relation_candidate.v1",bundleId:b.version,status:"synthetic_no_authority",source:"independently_authored_stated_model",humanReviewer:null,officialExam:null,assumptions:"Synthetic stated scope",assumptionsApplyTo:b.ids.slice(1),concepts:[{id:"movement",text:"Synthetic concept"},{id:"joint",text:"Synthetic concept"}],verificationLabel:"Synthetic",limits:[],items:b.ids.map((id,i)=>({id,role:i%2?"practice_retry":"initial",pair:i<2?"movement":"joint",model:b.models[i],prompt:"Synthetic unapproved body",choices:[1,2,3,4,5].map(id=>({id,label:`Synthetic ${id}`})),answerChoice:[2,3,4,1][i],explanation:"Synthetic",choiceReasons:Array(5).fill("Synthetic"),retryId:i%2?null:b.ids[i+1]}))};}
test("exact relation registration and closed sign proof with all indeterminate witnesses",()=>{
 assert.equal(b.sha256,"59c78f868bf4e83afa99712d63505deb0b2ad4b8885ee19074c51bf993b9b21b");
 assert.deepEqual(b.activationModes,["start-theory-approved"]);
 assert.equal(proof(0).witnesses[0].before.decimal,"80");assert.equal(proof(0).witnesses[0].after.decimal,"70");
 const p=proof(1).witnesses[0];assert.ok(Number(p.after.price.decimal)>Number(p.before.price.decimal));assert.ok(Number(p.after.quantity.decimal)>Number(p.before.quantity.decimal));
 for(const [i,unknown,positive] of [[2,"price","quantity"],[3,"quantity","price"]]){
 const witnesses=proof(i).witnesses;assert.deepEqual(witnesses.map(w=>Math.sign(Number(w.after[unknown].decimal)-Number(w.before[unknown].decimal))),[1,0,-1]);
 assert.ok(witnesses.every(w=>Number(w.after[positive].decimal)>Number(w.before[positive].decimal)));
 }
 for(let i=0;i<4;i++)for(const conditions of [[],b.relationBindings[i].conditions.slice(1),[...b.relationBindings[i].conditions,"real_market"],[...b.relationBindings[i].conditions].reverse()])assert.throws(()=>verifyStatedMarketRelation({pattern:b.models[i],conditions}));
 for(const pattern of ["eval","toString","general_concept","law"])assert.throws(()=>verifyStatedMarketRelation({pattern,conditions:[]}));
 assert.throws(()=>verifyStatedMarketRelation({pattern:b.models[0],conditions:b.relationBindings[0].conditions,code:"throw 1"}));
});
test("schema/key/pair tampering fails; correct synthetic relations cannot admit unapproved bytes",async()=>{
 const p=packet();assert.equal(validateRegisteredRelationItems(b.key,p).items.length,4);
 const changes=[p=>p.items[0].answerChoice=1,p=>p.items[0].retryId=b.ids[3],p=>p.items[1].retryId=b.ids[0],p=>p.items[1].role="initial",p=>p.items[0].pair="joint",p=>p.items[0].model=b.models[1],p=>p.items[0].choices[1].id=1,p=>p.assumptionsApplyTo=b.ids,p=>p.items[0].code="process.exit()",p=>p.items[0].choices[0].value="self_authorized",p=>p.humanReviewer="owner",p=>p.officialExam=2025,p=>p.items.reverse()];
 for(const change of changes){const hostile=structuredClone(p);change(hostile);assert.throws(()=>validateRegisteredRelationItems(b.key,hostile));}
 assert.equal(await loadOwnerRegisteredContent(b.key,async()=>Buffer.from(JSON.stringify(p)),true),null);
 assert.throws(()=>validateRegisteredRelationItems("market",p));
});
const ref=bundle=>parseQuestionReference({schemaVersion:"first_stage.owner_original_question_reference.v1",questionId:bundle.ids[0],questionVersion:bundle.version,subjectId:"real_estate_principles",examYear:null,examRound:null,questionNumber:null,sessionId:bundle.sessionId,choiceCount:5,sourceVersionManifestIds:[`owner-original-${bundle.sha256}`],rightsState:"owner_authorized_original",currentnessState:"stated_model_only"});
const evidence=()=>({schemaVersion:"first_stage.immutable_evidence_reference.v1",evidenceId:"synthetic-proof",evidenceVersion:"v1",evidenceSha256:digest("proof")});
async function scope(run){let error;const app=createOwnerOriginalApplication({environment:()=>({NODE_ENV:"development",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55431",INVERGE_OWNER_ORIGINAL_TEST_ONLY:"isolated_synthetic",INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED:"true",INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"true",ALPHA_ADMIN_EMAILS:"synthetic@example.test",INVERGE_OWNER_FIRST_STAGE_EMAILS:"synthetic@example.test"}),session:async()=>({isAuthenticated:true,isDemo:false,source:"supabase",userId:"synthetic",email:"synthetic@example.test"}),repository:()=>{throw Error("unused");},catalog:async()=>{try{run();}catch(e){error=e;}return null;}});await app(new Request("http://127.0.0.1:3884/api/unit"));if(error)throw error;}
test("exact reference determines evidence kind, forbids key mixing, preserves old envelope shape",async()=>scope(()=>{
 const adapter={schemaVersion:"dabangil.first_stage.subject_adapter.v1",adapterId:OWNER_ORIGINAL_ADAPTER,adapterVersion:"1",subjectId:"real_estate_principles",assertQuestionReference(){},presentQuestion(){},evaluateSubmission(){},buildIndependentRetry(){}};authorizeOwnerOriginalAdapter(adapter);
 for(const [bundle,key,schema] of [[b,"relationKeyReference","first_stage.owner_original_relation_feedback.v1"],[ownerContentBundle("original"),"calculationKeyReference","first_stage.owner_original_calculation_feedback.v1"]]){
 const r=ref(bundle),input={schemaVersion:"first_stage.subject_evaluation_input.v1",questionReference:r,attempt:{attemptId:"synthetic-attempt",questionReference:r,state:"in_progress",submission:null,evaluation:null},submission:{selectedChoice:2},submissionSha256:digest("submission")};
 const value={schemaVersion:"first_stage.attempt_evaluation.v1",decision:"correct",errorCause:null,conceptBindings:[{schemaVersion:"first_stage.concept_binding.v1",conceptId:"synthetic",conceptVersion:"v1",subjectId:r.subjectId,role:"primary"}],biggestGapCode:"selection",nextActionCode:"retry",retryDisposition:"retry_now",reviewAfterMs:0,evaluationPolicyVersion:"synthetic-v1",evidenceEnvelope:{schemaVersion:"first_stage.attempt_evidence_envelope.v1",attemptId:input.attempt.attemptId,submissionSha256:input.submissionSha256,questionId:r.questionId,questionVersion:r.questionVersion,questionReferenceSha256:digest(r),subjectId:r.subjectId,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,officialKeyReference:null,[key]:evidence(),choiceSetReference:evidence(),sourceReference:evidence(),versionDecisionReference:evidence(),rightsDecisionReference:evidence(),reviewedFeedback:{schemaVersion:schema,state:"machine_checked_owner_local",receiptReference:null,reviewerIdentity:null,reviewerClass:null,modelAlone:true}}};
 const other=key==="relationKeyReference"?"calculationKeyReference":"relationKeyReference";
 assert.deepEqual(validateAttemptEvaluation(adapter,input,value).evidenceEnvelope,value.evidenceEnvelope);
 for(const change of [e=>delete e[key],e=>e[other]=evidence(),e=>{e[other]=e[key];delete e[key];},e=>e.reviewedFeedback.schemaVersion=schema.includes("relation")?"first_stage.owner_original_calculation_feedback.v1":"first_stage.owner_original_relation_feedback.v1",e=>e.reviewedFeedback.reviewerIdentity="owner",e=>e.officialKeyReference=evidence()]){const bad=structuredClone(value);change(bad.evidenceEnvelope);assert.throws(()=>validateAttemptEvaluation(adapter,input,bad));}
 assert.throws(()=>validateAttemptEvaluation({...adapter},input,value));
 assert.equal(ownerOriginalVerification(r).verificationKind,key==="relationKeyReference"?"stated_relation":"calculation");
 }
}));
