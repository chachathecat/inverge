import { FirstStageKernelError, exactObject, parseQuestionReference, type ChoiceId, type QuestionReference } from "../kernel/domain";
import { createSubjectAdapterRegistry, validateAttemptEvaluation, validatePresentation, type SubjectAdapterV1 } from "../subject-adapter/subject-adapter";
import { privateSessionDigest as digest, type PrivateFirstStageCatalog } from "./session-service";
import { loadOwnerLocalR3TrialContent, type TrialContentInput } from "./owner-local-trial-content";
import { activeOwnerLocalR3TrialAdapter, authorizeOwnerLocalR3TrialAdapter, authorizeOwnerLocalCurriculumCatalog } from "./owner-local-trial-context";
import { OWNER_LOCAL_R3_TRIAL_NOTICE } from "./owner-local-trial-boundary";
import { evaluateReviewedArithmetic } from "./foundation-real-estate-facts";
import { CURRICULUM_SAMPLE_VERSION, CURRICULUM_ROW_PINS } from "./owner-local-curriculum-policy.mjs";
export { CURRICULUM_SAMPLE_VERSION } from "./owner-local-curriculum-policy.mjs";
const PINS:Readonly<Record<string,string>>=CURRICULUM_ROW_PINS;
const fail=():never=>{throw new FirstStageKernelError("adapter_mismatch");};
type Model={kind:string;[name:string]:string|number};
type SampleRow={number:number;kind:"original"|"practice_retry";questionId:string;sourceQuestionId:string;version:string;
  dataClass:string;authority:string;humanReview:false;reviewer:null;reviewedAt:null;sourcePage:number;transcription:string;
  stem:string;choices:string[];correctChoice:ChoiceId;model:Model;easyExplanation:string;choiceExplanations:string[];
  aids:{unitId:string;topicId:string;title:string;concept:string;prerequisite:string};difference?:string};
type Expression=string|{operator:string;operands:Expression[]};
const op=(operator:string,...operands:Expression[]):Expression=>({operator,operands});
function calculate(expression:Expression,values:Record<string,number|string>):string {
  return evaluateReviewedArithmetic({canonical_formula_expression:JSON.stringify(expression),
    ordered_input_values_and_units:Object.entries(values).sort(([a],[b])=>a<b?-1:a>b?1:0)
      .map(([symbol,value])=>({symbol,decimal:String(value),unit:"1"})),
    declared_rounding_rule:{mode:"none",decimal_places:null}}).result.decimal;
}
/** Small closed economic models. Pins separately bind their interpretation to
 * source/body/choices; a coherent rewritten model/key does NOT certify itself. */
export function curriculumModelAnswer(model:Model):string {
  const m=exactObject(model,Object.keys(model));
  for(const [key,value] of Object.entries(m))if(key!=="kind" && (typeof value!=="number" || !Number.isFinite(value) || Math.abs(value)>1e6))fail();
  if(model.kind==="ceiling_transfer") {
    exactObject(model,["kind","demandIntercept","demandSlope","supplyIntercept","supplySlope","ceiling"]);
    const a=Number(m.demandIntercept),b=Number(m.demandSlope),c=Number(m.supplyIntercept),d=Number(m.supplySlope),p=Number(m.ceiling);
    const equilibrium=calculate(op("divide",op("subtract","a","c"),op("add","b","d")),{a,b,c,d});
    if(b<=0||d<=0||p<=0||Number(equilibrium)<=p||c+d*p<=0||a-b*p<=c+d*p)fail();
    return calculate(op("multiply",op("subtract","e","p"),op("add","c",op("multiply","d","p"))),{e:equilibrium,p,c,d});
  }
  if(model.kind==="money_velocity") {
    exactObject(model,["kind","coefficient","interestRate","nominalGdp"]);
    const k=Number(m.coefficient),i=Number(m.interestRate),y=Number(m.nominalGdp);
    if(k<=0||i<=0||i>=1||y<=0)fail();
    const money=calculate(op("divide",op("multiply","k","y"),"i"),{k,y,i});
    return calculate(op("divide","y","money"),{y,money});
  }
  if(model.kind==="separate_fiscal_shocks") {
    exactObject(model,["kind","mpc","initialIncome","governmentChange","taxChange"]);
    const c=Number(m.mpc),y=Number(m.initialIncome),g=Number(m.governmentChange),t=Number(m.taxChange);
    if(c<=0||c>=1||y<=0||g<=0||t<=0)fail();
    const increase=calculate(op("divide","g",op("subtract","one","c")),{g,one:1,c});
    const decrease=calculate(op("divide",op("multiply","c","t"),op("subtract","one","c")),{c,t,one:1});
    if(Number(decrease)>=y)fail();
    return calculate(op("subtract",op("add","y","increase"),op("subtract","y","decrease")),{y,increase,decrease});
  }
  return fail();
}
export type CurriculumSampleInput=TrialContentInput & { sampleSource?:Uint8Array;
  /** Explicit isolated test port. The production composer never supplies pins. */
  syntheticSamplePins?:Readonly<Record<string,string>> };
export async function loadOwnerLocalCurriculumContent(input:CurriculumSampleInput):Promise<PrivateFirstStageCatalog|null> {
  const base=await loadOwnerLocalR3TrialContent(input);
  if(!base)return null;
  const expected=input.expectedDataClass??"private_review_candidate";
  const pins=expected==="synthetic_test_only"?input.syntheticSamplePins:PINS;
  const numbers=[58,62,65];
  if(!pins)return base;
  const sampleDigest=(selected:readonly number[])=>digest({base:base.digest,
    sample:selected.flatMap(number=>[pins[`qnet-2025-36-s1-A-${number}`],pins[`issue883-curriculum-r${number}`]]),version:CURRICULUM_SAMPLE_VERSION});
  const compatibleDigests=Array.from({length:8},(_,mask)=>sampleDigest(numbers.filter((_,index)=>mask&(1<<index))));
  // Removal/corruption of the optional extension must not strand an unchanged
  // r3 question that was created while the additive catalog was installed.
  authorizeOwnerLocalCurriculumCatalog(base,base,compatibleDigests);
  if(input.sampleSource===undefined)return base;
  try {
    if(!input.sampleSource.length||input.sampleSource.length>262144)return base;
    const packet=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(input.sampleSource));
    if(!pins || packet.schemaVersion!=="issue883.economics.curriculum_sample.v1" || packet.version!==CURRICULUM_SAMPLE_VERSION ||
      packet.dataClass!==expected || packet.authority!=="LEARNING_ONLY" || packet.humanReviewComplete!==false ||
      digest(packet.exam)!==digest({year:2025,round:36,session:1,booklet:"A",keyBookletExplicit:null}) || !Array.isArray(packet.rows)||packet.rows.length>6)return base;
    const sourceFiles={"qnet-2230215-session1.pdf":"pdf","qnet-2243629-final-key.hwp":"key",
      "complete-key-observation-r3-ai-v1.json":"keyObservation","issue-883-economics-r3-review/source-observation.json":"observation"} as const;
    exactObject(packet.files,Object.keys(sourceFiles));
    for(const [file,artifact] of Object.entries(sourceFiles))if(packet.files[file]!==input.installation?.fileSha256[artifact])return base;
    const checks=["source_transcription","rights_and_booklet","answer_keys","feedback","model_assumptions","practice_retry_lineage"];
    if(digest(packet.humanChecks)!==digest(checks.map(check=>({check,reviewer:null,reviewedAt:null,decision:null}))))return base;
    const key=JSON.parse(new TextDecoder().decode(await input.readArtifact("keyObservation")));
    function eligible(row:SampleRow):boolean { try {
      if(!pins || digest(row)!==pins[row.questionId] || ![58,62,65].includes(row.number)||row.version!==CURRICULUM_SAMPLE_VERSION||
        row.dataClass!==expected || row.authority!=="LEARNING_ONLY" || row.humanReview!==false || row.reviewer!==null||row.reviewedAt!==null||
        !["original","practice_retry"].includes(row.kind)||row.sourceQuestionId!==`qnet-2025-36-s1-A-${row.number}` ||
        row.questionId!==(row.kind==="original"?row.sourceQuestionId:`issue883-curriculum-r${row.number}`) ||
        !Array.isArray(row.choices)||row.choices.length!==5||!Array.isArray(row.choiceExplanations)||row.choiceExplanations.length!==5)return false;
      if([row.stem,row.easyExplanation,...row.choices,...row.choiceExplanations,row.aids.concept,row.aids.prerequisite]
        .some(value=>typeof value!=="string"||!value.trim()||value.length>8000))return false;
      const answer=curriculumModelAnswer(row.model);
      const matching=row.choices.flatMap((choice,index)=>/^\d+(?:\.\d+)?$/.test(choice)&&calculate("v",{v:choice})===answer?[index+1]:[]);
      if(digest(matching)!==digest([row.correctChoice]) || (row.kind==="original"&&digest(key.groups[1].answers[row.number-41])!==digest(matching)))return false;
      return row.kind!=="practice_retry" || Boolean(row.difference);
    } catch {return false;} }
    const rows:SampleRow[]=[];
    for(const number of numbers) {
      const pair:SampleRow[]=packet.rows.filter((row:SampleRow)=>row?.number===number);
      const original=pair.find(row=>row.kind==="original"),retry=pair.find(row=>row.kind==="practice_retry");
      if(pair.length===2&&original&&retry&&eligible(original)&&eligible(retry)&&original.model.kind===retry.model.kind) rows.push(original,retry);
    }
    const references=new Map(rows.map(row=>[row.questionId,parseQuestionReference({schemaVersion:"first_stage.owner_local_trial_question_reference.v1",
      questionId:row.questionId,questionVersion:row.version,subjectId:"economics_principles",examYear:2025,examRound:36,sessionId:"qnet-2025-36-s1-A",
      questionNumber:row.number,choiceCount:5,sourceVersionManifestIds:[`issue883-curriculum-source-${row.number}`],rightsState:"observed_owner_local_only",currentnessState:"observed_historical_unreviewed"})]));
    const oldAdapter=base.registry.require("economics_principles");
    const rowFor=(reference:QuestionReference)=>rows.find(row=>digest(references.get(row.questionId))===digest(reference));
    const requireRow=(reference:QuestionReference)=>{if(!activeOwnerLocalR3TrialAdapter(adapter))return fail();return rowFor(reference)??fail();};
    const evidence=(kind:string,value:unknown)=>({schemaVersion:"first_stage.immutable_evidence_reference.v1" as const,
      evidenceId:`trial-curriculum-${kind}-${digest(value).slice(0,24)}`,evidenceVersion:CURRICULUM_SAMPLE_VERSION,evidenceSha256:digest(value)});
    const concept=(row:SampleRow)=>({schemaVersion:"first_stage.concept_binding.v1" as const,conceptId:row.aids.topicId,conceptVersion:row.version,
      subjectId:"economics_principles" as const,role:"primary" as const});
    const adapter:SubjectAdapterV1={...oldAdapter,
      assertQuestionReference(reference){if(rowFor(reference))requireRow(reference);else oldAdapter.assertQuestionReference(reference);},
      presentQuestion(reference){if(!rowFor(reference))return oldAdapter.presentQuestion(reference);const row=requireRow(reference);
        return validatePresentation(adapter,reference,{schemaVersion:"first_stage.mcq_question_presentation.v1",questionReference:reference,stem:row.stem,
          choices:row.choices.map((body,index)=>({choiceId:index+1 as ChoiceId,body})),sourceStatusLabel:reference.rightsState,
          currentnessStatusLabel:reference.currentnessState,learningReferenceDisclaimer:true});},
      evaluateSubmission(input){if(!rowFor(input.questionReference))return oldAdapter.evaluateSubmission(input);const row=requireRow(input.questionReference);
        return validateAttemptEvaluation(adapter,input,{schemaVersion:"first_stage.attempt_evaluation.v1",
          decision:input.submission.selectedChoice===null?"unanswered":input.submission.selectedChoice===row.correctChoice?"correct":"incorrect",
          errorCause:null,conceptBindings:[concept(row)],biggestGapCode:"compare-model-and-conditions-cause-unknown",nextActionCode:"review-then-practice-retry",
          retryDisposition:"review_then_retry",reviewAfterMs:86400000,evaluationPolicyVersion:CURRICULUM_SAMPLE_VERSION,
          evidenceEnvelope:{schemaVersion:"first_stage.attempt_evidence_envelope.v1",attemptId:input.attempt.attemptId,submissionSha256:input.submissionSha256,
            questionId:row.questionId,questionVersion:row.version,questionReferenceSha256:digest(input.questionReference),subjectId:adapter.subjectId,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,
            officialKeyReference:evidence(row.kind==="original"?"observed-original-key":"own-retry-key",{row,pin:pins[row.questionId]}),
            choiceSetReference:evidence("choices",row.choices),sourceReference:evidence("source",{files:packet.files,number:row.number,kind:row.kind}),
            versionDecisionReference:evidence("version",row),rightsDecisionReference:evidence("rights-observation",{files:packet.files,humanReview:false}),
            reviewedFeedback:{schemaVersion:"first_stage.owner_local_unreviewed_feedback.v1",state:"human_unreviewed_owner_local",receiptReference:null,reviewerIdentity:null,reviewerClass:null,modelAlone:true}}});},
      buildIndependentRetry(input){if(!rowFor(input.sourceQuestionReference))return oldAdapter.buildIndependentRetry(input);
        const original=requireRow(input.sourceQuestionReference),variant=rows.find(row=>row.number===original.number&&row.kind==="practice_retry")??fail();
        if(original.kind!=="original"||input.priorRetries.length||digest(input.reviewTask.conceptBindings)!==digest([concept(original)]))return fail();
        const reference=references.get(variant.questionId)!;
        return {schemaVersion:"first_stage.independent_retry_candidate.v1",questionReference:reference,lineageReceipt:{
          schemaVersion:"first_stage.independent_retry_lineage_receipt.v1",receiptId:`curriculum-lineage-${digest([input.reviewTask.reviewTaskId,reference]).slice(0,32)}`,
          receiptVersion:CURRICULUM_SAMPLE_VERSION,adapterId:adapter.adapterId,adapterVersion:adapter.adapterVersion,subjectId:adapter.subjectId,
          sourceQuestionId:original.questionId,sourceQuestionVersion:original.version,sourceQuestionReferenceSha256:digest(input.sourceQuestionReference),
          variantQuestionId:variant.questionId,variantQuestionVersion:variant.version,variantQuestionReferenceSha256:digest(reference),
          targetConceptBindingKeys:[`economics_principles:${original.aids.topicId}@${original.version}:primary`],priorRetryCount:0,decision:"unreviewed_owner_local_practice_retry"}};},
    };
    authorizeOwnerLocalR3TrialAdapter(adapter);
    const attribution=(row:SampleRow)=>[OWNER_LOCAL_R3_TRIAL_NOTICE,`한국산업인력공단 Q-Net · 2025 제36회 1차 1교시 A형 경제학 ${row.number}번 계열`,
      "공공누리 제1유형 게시물·첨부 관찰 · 정답표 A형 명시 없음 · 사람 검토 미완료",
      row.kind==="original"?"공식 원문 AI 전사 후보 · 수식 표기 정규화 · 전사 인적 미검토":"자체 작성 변형 · 별도 AI/계산 정답 · 공식성·숙달·전이·측정 권한 없음",
      "https://www.q-net.or.kr/cst003.do?artlSeq=5231525&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00309"];
    const catalog=Object.freeze<PrivateFirstStageCatalog>({digest:sampleDigest(numbers.filter(number=>rows.some(row=>row.number===number))),registry:createSubjectAdapterRegistry([adapter]),
      initialReferences:Object.freeze([...base.initialReferences,...rows.filter(row=>row.kind==="original").map(row=>references.get(row.questionId)!)]),
      questionAttributions(reference){const row=rowFor(reference);return row?attribution(requireRow(reference)):base.questionAttributions?.(reference)??[];},
      retryAvailability(reference,used){const row=rowFor(reference);if(!row)return base.retryAvailability(reference,used);requireRow(reference);
        return row.kind==="original"&&!used.includes(`issue883-curriculum-r${row.number}`)?"available":"exhausted";},
      explanation(reference){const row=rowFor(reference);if(!row)return base.explanation(reference);requireRow(reference);
        return {text:[`검토 전 제시 정답: ${row.correctChoice}`,row.easyExplanation,...row.choiceExplanations.map((body,i)=>`${i+1}. ${body}`)].join("\n\n"),
          sourceStatus:"human-unreviewed-owner-local-learning-only",learningReferenceDisclaimer:true,attributions:[...attribution(row),
            "https://www.q-net.or.kr/cst003.do?artlSeq=5246129&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00310"]};},
      curriculumBinding(reference){const row=rowFor(reference);if(!row){oldAdapter.assertQuestionReference(reference);return null;}
        requireRow(reference);return {unitId:row.aids.unitId,topicId:row.aids.topicId,title:row.aids.title,mappingVersion:CURRICULUM_SAMPLE_VERSION};},
      conceptAidDescriptor(reference,kind){if(!rowFor(reference))return null;const row=requireRow(reference);return {id:`${row.questionId}-${kind}`,version:row.version,sha256:digest({reference,kind,body:row.aids[kind]})};},
      conceptAid(reference,kind){const row=requireRow(reference);return {text:row.aids[kind],kind,humanReviewComplete:false};},
    });
    authorizeOwnerLocalCurriculumCatalog(catalog,base,compatibleDigests);return catalog;
  } catch{return base;}
}
