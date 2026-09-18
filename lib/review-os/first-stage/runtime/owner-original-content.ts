import { ownerContentBundle } from "./owner-content-registration.mjs";
import crypto from "node:crypto";
import { FirstStageKernelError, parseQuestionReference, type ChoiceId, type ImmutableEvidenceReference, type QuestionReference } from "../kernel/domain";
import { createSubjectAdapterRegistry, SUBJECT_ADAPTER_SCHEMA_VERSION, validateAttemptEvaluation, validatePresentation, type SubjectAdapterV1 } from "../subject-adapter/subject-adapter";
import { privateSessionDigest as digest, type PrivateFirstStageCatalog } from "./session-service";
import { evaluateReviewedArithmetic } from "./foundation-real-estate-facts";
import { activeOwnerOriginalAdapter, authorizeOwnerOriginalAdapter, authorizeOwnerOriginalCatalog } from "./owner-original-context";
import { OWNER_ORIGINAL_ADAPTER, OWNER_ORIGINAL_NOTICE, OWNER_ORIGINAL_SCOPE } from "./owner-original-boundary";

type Item = { id:string; role:string; prompt:string; choices:{id:ChoiceId;value:number;label:string}[]; answerChoice:ChoiceId;
  facts:{potentialAnnualIncome:number;annualOperatingExpense:number;capitalizationBasisPoints:number;vacancyBasisPoints?:number;targetValue?:number;currencyUnit:string;rateDenominator:number;rounding:string};
  explanation:string; choiceFeedback:{choice:ChoiceId;text:string}[] };
const fail=():never=>{throw new FirstStageKernelError("adapter_mismatch");};
const op=(operator:string,...operands:unknown[])=>({operator,operands});
const priceFormula=op("divide",op("subtract",op("multiply","gross",op("subtract","one","vacancy")),"expense"),"rate");
const vacancyFormula=op("subtract","one",op("divide",op("add",op("multiply","target","rate"),"expense"),"gross"));
function calculation(item:Item, vacancy?:number) {
  const f=item.facts, inverse=item.role==="independent_retry"&&vacancy===undefined;
  if(f.currencyUnit!=="만원"||f.rateDenominator!==10000||f.rounding!=="none")fail();
  const values:Record<string,{decimal:string;unit:string}>={gross:{decimal:String(f.potentialAnnualIncome*10000),unit:"KRW*YEAR^-1"},
    expense:{decimal:String(f.annualOperatingExpense*10000),unit:"KRW*YEAR^-1"},one:{decimal:"1",unit:"1"},
    rate:{decimal:String(f.capitalizationBasisPoints/10000),unit:"YEAR^-1"},
    ...(inverse?{target:{decimal:String(f.targetValue!*10000),unit:"KRW"}}:{vacancy:{decimal:String((vacancy??f.vacancyBasisPoints!)/10000),unit:"1"}})};
  return evaluateReviewedArithmetic({canonical_formula_expression:JSON.stringify(inverse?vacancyFormula:priceFormula),
    ordered_input_values_and_units:Object.keys(values).sort().map(symbol=>({symbol,...values[symbol]})),declared_rounding_rule:{mode:"none",decimal_places:null}});
}
/** Immutable draft bytes were subsequently authorized by the dated Owner
 * decision. Draft self-claims cannot grant use; only this exact server pin can. */
export async function loadOwnerDirectCapitalizationContent(key:string,readBytes:()=>Promise<Uint8Array>,assignmentEnabled=true):Promise<PrivateFirstStageCatalog|null> {
  try {
    const registration=ownerContentBundle(key);
    if(!registration||registration.validator!=="legacy_direct_capitalization"||registration.ids.length!==2)return null;
    const {ids:OWNER_ORIGINAL_IDS,version:OWNER_ORIGINAL_VERSION,sha256:OWNER_ORIGINAL_PACKET_SHA256}=registration;
    const bytes=await readBytes();
    if(bytes.length===0||bytes.length>65536||crypto.createHash("sha256").update(bytes).digest("hex")!==OWNER_ORIGINAL_PACKET_SHA256)return null;
    const packet=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as {items:Item[];proposalId:string};
    if(packet.proposalId!==OWNER_ORIGINAL_VERSION||packet.items.length!==2)fail();
    const references=packet.items.map((item,index)=>{
      if(item.id!==OWNER_ORIGINAL_IDS[index]||item.choices.length!==5||item.choiceFeedback.length!==5)fail();
      const result=calculation(item).result;
      const matches=item.choices.filter(choice=>index===0 ? String(choice.value*10000)===result.decimal&&result.unit==="KRW"
        : String(choice.value/10000)===result.decimal&&result.unit==="1");
      if(matches.length!==1||matches[0].id!==item.answerChoice)fail();
      if(index===1&&item.choices.filter(choice=>calculation(item,choice.value).result.decimal===String(item.facts.targetValue!*10000)).length!==1)fail();
      return parseQuestionReference({schemaVersion:"first_stage.owner_original_question_reference.v1",questionId:item.id,
        questionVersion:OWNER_ORIGINAL_VERSION,subjectId:"real_estate_principles",examYear:null,examRound:null,questionNumber:null,
        sessionId:registration.sessionId,choiceCount:5,sourceVersionManifestIds:[`owner-original-${OWNER_ORIGINAL_PACKET_SHA256}`],
        rightsState:"owner_authorized_original",currentnessState:"stated_model_only"});
    });
    const concept={schemaVersion:"first_stage.concept_binding.v1" as const,conceptId:registration.concepts![0],conceptVersion:"1",subjectId:"real_estate_principles" as const,role:"primary" as const};
    const evidence=(kind:string,value:unknown):ImmutableEvidenceReference=>({schemaVersion:"first_stage.immutable_evidence_reference.v1",
      evidenceId:`${registration.evidencePrefix}-${kind}`,evidenceVersion:OWNER_ORIGINAL_VERSION,evidenceSha256:digest(value)});
    const requireItem=(reference:QuestionReference)=>{
      if(!activeOwnerOriginalAdapter(adapter))fail();
      const index=references.findIndex(row=>digest(row)===digest(reference));if(index<0)fail();return packet.items[index];
    };
    const adapter:SubjectAdapterV1={schemaVersion:SUBJECT_ADAPTER_SCHEMA_VERSION,adapterId:OWNER_ORIGINAL_ADAPTER,adapterVersion:"1",subjectId:"real_estate_principles",
      assertQuestionReference(reference){requireItem(reference);},
      presentQuestion(reference){const item=requireItem(reference);return validatePresentation(adapter,reference,{schemaVersion:"first_stage.mcq_question_presentation.v1",questionReference:reference,
        stem:item.prompt,choices:item.choices.map(x=>({choiceId:x.id,body:x.label})),sourceStatusLabel:reference.rightsState,currentnessStatusLabel:reference.currentnessState,learningReferenceDisclaimer:true});},
      evaluateSubmission(input){const item=requireItem(input.questionReference),choice=input.submission.selectedChoice;
        const decision=choice===null?"unanswered":choice===item.answerChoice?"correct":"incorrect";
        return validateAttemptEvaluation(adapter,input,{schemaVersion:"first_stage.attempt_evaluation.v1",decision,errorCause:null,
          conceptBindings:[concept],biggestGapCode:decision==="correct"?"selected_answer_matches_stated_model":"answer_differs_from_stated_model",
          nextActionCode:decision==="correct"?"scheduled_practice":"compare_calculation_then_retry",
          retryDisposition:decision==="correct"?"review_then_retry":"retry_now",reviewAfterMs:decision==="correct"?86400000:0,evaluationPolicyVersion:registration.evaluationPolicy!,
          evidenceEnvelope:{schemaVersion:"first_stage.attempt_evidence_envelope.v1",attemptId:input.attempt.attemptId,submissionSha256:input.submissionSha256,
            questionId:item.id,questionVersion:OWNER_ORIGINAL_VERSION,questionReferenceSha256:digest(input.questionReference),subjectId:adapter.subjectId,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,
            officialKeyReference:null,calculationKeyReference:evidence(`calculation-${item.id}`,calculation(item)),choiceSetReference:evidence(`choices-${item.id}`,item.choices),
            sourceReference:evidence("source",OWNER_ORIGINAL_PACKET_SHA256),versionDecisionReference:evidence("version",OWNER_ORIGINAL_VERSION),
            rightsDecisionReference:evidence("owner-private-use",{packet:OWNER_ORIGINAL_PACKET_SHA256,scope:registration.rightsScope!,humanReviewer:null}),
            reviewedFeedback:{schemaVersion:"first_stage.owner_original_calculation_feedback.v1",state:"machine_checked_owner_local",receiptReference:null,reviewerIdentity:null,reviewerClass:null,modelAlone:true}}});},
      buildIndependentRetry(input){requireItem(input.sourceQuestionReference);
        if(input.sourceQuestionReference.questionId!==OWNER_ORIGINAL_IDS[0]||input.priorRetries.length!==0||digest(input.reviewTask.conceptBindings)!==digest([concept]))throw new FirstStageKernelError("adapter_unavailable");
        return {schemaVersion:"first_stage.independent_retry_candidate.v1",questionReference:references[1],lineageReceipt:{schemaVersion:"first_stage.independent_retry_lineage_receipt.v1",
          receiptId:`${registration.evidencePrefix}-lineage-${digest(input.reviewTask.reviewTaskId).slice(0,40)}`,receiptVersion:OWNER_ORIGINAL_VERSION,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,subjectId:adapter.subjectId,
          sourceQuestionId:references[0].questionId,sourceQuestionVersion:references[0].questionVersion,sourceQuestionReferenceSha256:digest(references[0]),
          variantQuestionId:references[1].questionId,variantQuestionVersion:references[1].questionVersion,variantQuestionReferenceSha256:digest(references[1]),
          targetConceptBindingKeys:[`${concept.subjectId}:${concept.conceptId}@${concept.conceptVersion}:${concept.role}`],priorRetryCount:0,decision:"unreviewed_owner_local_practice_retry"}};}
    };
    authorizeOwnerOriginalAdapter(adapter);for(const reference of references)adapter.presentQuestion(reference);
    const catalog:PrivateFirstStageCatalog=Object.freeze({digest:digest({packet:OWNER_ORIGINAL_PACKET_SHA256,adapter:adapter.adapterVersion,policy:registration.evaluationPolicy!}),
      registry:createSubjectAdapterRegistry([adapter]),initialReferences:Object.freeze([references[0]]),
      questionAttributions(reference:QuestionReference){requireItem(reference);return [OWNER_ORIGINAL_NOTICE,OWNER_ORIGINAL_SCOPE];},
      retryAvailability(reference:QuestionReference,used:readonly string[]){requireItem(reference);return reference.questionId===OWNER_ORIGINAL_IDS[0]&&!used.includes(OWNER_ORIGINAL_IDS[1])?"available" as const:"exhausted" as const;},
      explanation(reference:QuestionReference){const item=requireItem(reference);return {text:[`계산 정답: ${item.answerChoice}`,item.explanation,...item.choiceFeedback.map(x=>`${x.choice}. ${x.text}`)].join("\n\n"),
        sourceStatus:OWNER_ORIGINAL_NOTICE,learningReferenceDisclaimer:true as const,attributions:[OWNER_ORIGINAL_SCOPE]};}});
    authorizeOwnerOriginalCatalog(catalog,[Object.freeze({candidateId:references[0].questionId,candidateDigest:`sha256:${digest(references[0])}`,
      familyId:registration.families![0],surfaceId:references[0].questionId,bankClass:"LEARNING_PRACTICE",origin:"BANK_STOCK",contentAuthority:"LEARNING_ONLY",
      rightsStatus:"OWNER_AUTHORIZED_ORIGINAL",sourceStatus:"STATED_MODEL_ONLY",releaseChainComplete:false,unseenEligibilitySnapshotSealed:false,nonSameSurfaceAsSource:false,
      familyIsolated:false,calibrationState:"UNASSESSED",timedProtocolBound:false,chronology:null,chronologyAuthority:null,availableAt:registration.availableAt!,priority:0})],assignmentEnabled?[references[0].questionId]:[]);
    return catalog;
  }catch{return null;}
}

/** Byte-stable legacy entry point; additional exact approvals use the same parser. */
export const loadOwnerOriginalContent=(readBytes:()=>Promise<Uint8Array>)=>loadOwnerDirectCapitalizationContent("original",readBytes,true);
