import { ownerContentBundle } from "./owner-content-registration.mjs";
import { investmentCalculation, type InvestmentModel } from "./owner-investment-calculation";
import crypto from "node:crypto";
import { FirstStageKernelError, parseQuestionReference, type ChoiceId, type QuestionReference, type ImmutableEvidenceReference } from "../kernel/domain";
import { createSubjectAdapterRegistry, SUBJECT_ADAPTER_SCHEMA_VERSION, validateAttemptEvaluation, validatePresentation, type SubjectAdapterV1 } from "../subject-adapter/subject-adapter";
import { privateSessionDigest as digest, type PrivateFirstStageCatalog } from "./session-service";
import { activeOwnerOriginalAdapter, authorizeOwnerOriginalAdapter, authorizeOwnerOriginalCatalog, ownerOriginalHistoryCandidates, ownerOriginalBankCandidates } from "./owner-original-context";
import { OWNER_ORIGINAL_ADAPTER, OWNER_ORIGINAL_NOTICE, OWNER_ORIGINAL_SCOPE } from "./owner-original-boundary";
import { marketCalculation, type MarketModel } from "./owner-market-calculation";

type Item={id:string;role:string;model:string;facts:Record<string,string>;prompt:string;choices:{id:ChoiceId;value:string;unit:string;label:string}[];answerChoice:ChoiceId;explanation:string;choiceFeedback:{choice:ChoiceId;text:string}[];calculation:{result:{decimal:string;unit:string}}};
const fail=():never=>{throw new FirstStageKernelError("adapter_mismatch");};
/** Calculation/schema validation only: no admission, catalog or capability.
 * Runtime admission still requires exact approved file bytes below. */
export function validateRegisteredCalculationItems(key:string,packet:{bundleId:string;items:Item[]}) {
  const registration=ownerContentBundle(key);
  if(!registration || registration.validator==="legacy_direct_capitalization")return fail();
  const {ids:IDS,version:VERSION}=registration;
  if(packet.bundleId!==VERSION||packet.items.length!==IDS.length)fail();
  const calculations=packet.items.map((item,index)=>{
    if(item.id!==IDS[index]||item.role!==(index%2?"practice_retry":"initial")||item.model!==registration.models?.[index]||item.choices.length!==5||item.choiceFeedback.length!==5||
      JSON.stringify(item.choices.map(c=>c.id))!==JSON.stringify([1,2,3,4,5])||JSON.stringify(item.choiceFeedback.map(c=>c.choice))!==JSON.stringify([1,2,3,4,5]))fail();
    const calculation=registration.validator==="market_calculation"?marketCalculation(item.model as MarketModel,item.facts):
      registration.validator==="investment_calculation"?investmentCalculation(item.model as InvestmentModel,item.facts):fail();
    if(digest(calculation.result)!==digest(item.calculation.result))fail();
    const matching=item.choices.filter(choice=>choice.value===calculation.result.decimal&&choice.unit===calculation.result.unit);
    if(matching.length!==1||matching[0].id!==item.answerChoice)fail();return calculation;
  });
  return calculations;
}
export async function loadOwnerRegisteredContent(key:string,readBytes:()=>Promise<Uint8Array>,assignmentEnabled=false):Promise<PrivateFirstStageCatalog|null>{
 try{
  const registration=ownerContentBundle(key);
  if(!registration || registration.validator === "legacy_direct_capitalization")return null;
  const {ids:IDS,version:VERSION,sha256:HASH}=registration;
  const bytes=await readBytes();if(!bytes.length||bytes.length>65536||crypto.createHash("sha256").update(bytes).digest("hex")!==HASH)return null;
  const packet=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as {bundleId:string;items:Item[]};
  const calculations=validateRegisteredCalculationItems(key,packet);
  const references=packet.items.map(item=>parseQuestionReference({schemaVersion:"first_stage.owner_original_question_reference.v1",questionId:item.id,questionVersion:VERSION,
    subjectId:"real_estate_principles",examYear:null,examRound:null,questionNumber:null,sessionId:registration.sessionId,choiceCount:5,
    sourceVersionManifestIds:[`owner-original-${HASH}`],rightsState:"owner_authorized_original",currentnessState:"stated_model_only"}));
  const concept=(index:number)=>({schemaVersion:"first_stage.concept_binding.v1" as const,conceptId:registration.concepts![Math.floor(index/2)],conceptVersion:"1",subjectId:"real_estate_principles" as const,role:"primary" as const});
  const evidence=(kind:string,value:unknown):ImmutableEvidenceReference=>({schemaVersion:"first_stage.immutable_evidence_reference.v1",evidenceId:`${registration.evidencePrefix}-${kind}`,evidenceVersion:VERSION,evidenceSha256:digest(value)});
  const indexFor=(reference:QuestionReference)=>{if(!activeOwnerOriginalAdapter(adapter))fail();const i=references.findIndex(row=>digest(row)===digest(reference));if(i<0)fail();return i;};
  const adapter:SubjectAdapterV1={schemaVersion:SUBJECT_ADAPTER_SCHEMA_VERSION,adapterId:OWNER_ORIGINAL_ADAPTER,adapterVersion:"1",subjectId:"real_estate_principles",
    assertQuestionReference(reference){indexFor(reference);},
    presentQuestion(reference){const item=packet.items[indexFor(reference)];return validatePresentation(adapter,reference,{schemaVersion:"first_stage.mcq_question_presentation.v1",questionReference:reference,stem:item.prompt,choices:item.choices.map(c=>({choiceId:c.id,body:c.label})),sourceStatusLabel:reference.rightsState,currentnessStatusLabel:reference.currentnessState,learningReferenceDisclaimer:true});},
    evaluateSubmission(input){const index=indexFor(input.questionReference),item=packet.items[index],choice=input.submission.selectedChoice;
      const decision=choice===null?"unanswered":choice===item.answerChoice?"correct":"incorrect";
      return validateAttemptEvaluation(adapter,input,{schemaVersion:"first_stage.attempt_evaluation.v1",decision,errorCause:null,conceptBindings:[concept(index)],
        biggestGapCode:decision==="correct"?"selected_answer_matches_stated_model":"answer_differs_from_stated_model",nextActionCode:decision==="correct"?"scheduled_practice":"compare_calculation_then_retry",
        retryDisposition:decision==="correct"?"review_then_retry":"retry_now",reviewAfterMs:decision==="correct"?86400000:0,evaluationPolicyVersion:registration.evaluationPolicy!,
        evidenceEnvelope:{schemaVersion:"first_stage.attempt_evidence_envelope.v1",attemptId:input.attempt.attemptId,submissionSha256:input.submissionSha256,questionId:item.id,questionVersion:VERSION,questionReferenceSha256:digest(input.questionReference),subjectId:adapter.subjectId,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,
          officialKeyReference:null,calculationKeyReference:evidence(`calculation-${item.id}`,calculations[index]),choiceSetReference:evidence(`choices-${item.id}`,item.choices),sourceReference:evidence("source",HASH),versionDecisionReference:evidence("version",VERSION),rightsDecisionReference:evidence("owner-private-use",{packet:HASH,scope:registration.rightsScope!,humanReviewer:null}),
          reviewedFeedback:{schemaVersion:"first_stage.owner_original_calculation_feedback.v1",state:"machine_checked_owner_local",receiptReference:null,reviewerIdentity:null,reviewerClass:null,modelAlone:true}}});},
    buildIndependentRetry(input){const i=indexFor(input.sourceQuestionReference),c=concept(i);if(i%2||input.priorRetries.length||digest(input.reviewTask.conceptBindings)!==digest([c]))fail();const source=references[i],variant=references[i+1];
      return {schemaVersion:"first_stage.independent_retry_candidate.v1",questionReference:variant,lineageReceipt:{schemaVersion:"first_stage.independent_retry_lineage_receipt.v1",receiptId:`${registration.evidencePrefix}-lineage-${digest(input.reviewTask.reviewTaskId).slice(0,40)}`,receiptVersion:VERSION,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,subjectId:adapter.subjectId,
        sourceQuestionId:source.questionId,sourceQuestionVersion:source.questionVersion,sourceQuestionReferenceSha256:digest(source),variantQuestionId:variant.questionId,variantQuestionVersion:variant.questionVersion,variantQuestionReferenceSha256:digest(variant),targetConceptBindingKeys:[`${c.subjectId}:${c.conceptId}@${c.conceptVersion}:${c.role}`],priorRetryCount:0,decision:"unreviewed_owner_local_practice_retry"}};}
  };
  authorizeOwnerOriginalAdapter(adapter);for(const reference of references)adapter.presentQuestion(reference);
  const catalog:PrivateFirstStageCatalog=Object.freeze({digest:digest({packet:HASH,adapter:adapter.adapterVersion,policy:registration.evaluationPolicy!}),registry:createSubjectAdapterRegistry([adapter]),initialReferences:Object.freeze(references.filter((_,index)=>index%2===0)),
    questionAttributions(reference:QuestionReference){indexFor(reference);return [OWNER_ORIGINAL_NOTICE,OWNER_ORIGINAL_SCOPE];},
    retryAvailability(reference:QuestionReference,used:readonly string[]){const i=indexFor(reference);return i%2===0&&!used.includes(IDS[i+1])?"available" as const:"exhausted" as const;},
    explanation(reference:QuestionReference){const item=packet.items[indexFor(reference)];return {text:[`계산 정답: ${item.answerChoice}`,item.explanation,...item.choiceFeedback.map(c=>`${c.choice}. ${c.text}`)].join("\n\n"),sourceStatus:OWNER_ORIGINAL_NOTICE,learningReferenceDisclaimer:true as const,attributions:[OWNER_ORIGINAL_SCOPE]};},
    curriculumBinding(reference:QuestionReference){const i=indexFor(reference);return {unitId:registration.unitId!,topicId:concept(i).conceptId,title:registration.titles![Math.floor(i/2)],mappingVersion:VERSION};}});
  authorizeOwnerOriginalCatalog(catalog,references.map((_,index)=>index).filter(index=>index%2===0).map((index,priority)=>({candidateId:references[index].questionId,candidateDigest:`sha256:${digest(references[index])}`,familyId:registration.families![Math.floor(index/2)],surfaceId:references[index].questionId,bankClass:"LEARNING_PRACTICE",origin:"BANK_STOCK",contentAuthority:"LEARNING_ONLY",rightsStatus:"OWNER_AUTHORIZED_ORIGINAL",sourceStatus:"STATED_MODEL_ONLY",releaseChainComplete:false,unseenEligibilitySnapshotSealed:false,nonSameSurfaceAsSource:false,familyIsolated:false,calibrationState:"UNASSESSED",timedProtocolBound:false,chronology:null,chronologyAuthority:null,availableAt:registration.availableAt!,priority})),assignmentEnabled?references.filter((_,index)=>index%2===0).map(r=>r.questionId):[]);
  return catalog;
 }catch{return null;}
}
/** Preserve the prior two-/six-item catalog identity and assignment switches. */
export function composeOwnerRegisteredCatalog(key:string,base:PrivateFirstStageCatalog,market:PrivateFirstStageCatalog,assignmentEnabled:boolean):PrivateFirstStageCatalog {
 const registration=ownerContentBundle(key);if(!registration?.compositionKey||!registration.compositionPolicy)fail();
 const VERSION=registration!.version;
 const baseStock=ownerOriginalBankCandidates(base)??fail();
 const history=[...(ownerOriginalHistoryCandidates(base)??fail()),...(ownerOriginalHistoryCandidates(market)??fail())];
 const leaf=(r:QuestionReference)=>r.questionVersion===VERSION?market:base;
 const adapter:SubjectAdapterV1={...base.registry.require("real_estate_principles"),
  assertQuestionReference(r){leaf(r).registry.require(r.subjectId).assertQuestionReference(r);},
  presentQuestion(r){return leaf(r).registry.require(r.subjectId).presentQuestion(r);},
  evaluateSubmission(input){return leaf(input.questionReference).registry.require(input.questionReference.subjectId).evaluateSubmission(input);},
  buildIndependentRetry(input){return leaf(input.sourceQuestionReference).registry.require(input.sourceQuestionReference.subjectId).buildIndependentRetry(input);}};
 authorizeOwnerOriginalAdapter(adapter);
 const catalog:PrivateFirstStageCatalog=Object.freeze({digest:digest({base:base.digest,[registration!.compositionKey!]:market.digest,policy:registration!.compositionPolicy!}),registry:createSubjectAdapterRegistry([adapter]),initialReferences:Object.freeze([...base.initialReferences,...market.initialReferences]),
  questionAttributions(r:QuestionReference){return leaf(r).questionAttributions?.(r)??[];},retryAvailability(r:QuestionReference,used:readonly string[]){return leaf(r).retryAvailability(r,used);},
  explanation(r:QuestionReference){return leaf(r).explanation(r);},curriculumBinding(r:QuestionReference){return leaf(r).curriculumBinding?.(r)??null;}});
 authorizeOwnerOriginalCatalog(catalog,history,[...baseStock.map(c=>c.candidateId),...(assignmentEnabled?market.initialReferences.map(r=>r.questionId):[])]);return catalog;
}
