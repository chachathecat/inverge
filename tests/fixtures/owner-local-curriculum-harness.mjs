import { syntheticTrialInput, trialHarness } from './first-stage-owner-local-trial-harness.mjs';
import { loadOwnerLocalCurriculumContent, CURRICULUM_SAMPLE_VERSION as version } from '../../lib/review-os/first-stage/runtime/owner-local-curriculum-content.ts';
import { privateSessionDigest as digest } from '../../lib/review-os/first-stage/runtime/session-service.ts';
export function curriculumFixture(){
 const fixture=syntheticTrialInput({numericTrialModels:true});
 const models=[
  {number:58,model:{kind:'ceiling_transfer',demandIntercept:30,demandSlope:1,supplyIntercept:0,supplySlope:1,ceiling:10},answer:'50',unitId:'econ_supply_demand',topicId:'price_ceiling_transfer'},
  {number:62,model:{kind:'money_velocity',coefficient:0.5,interestRate:0.1,nominalGdp:50},answer:'0.2',unitId:'econ_money_policy',topicId:'money_velocity'},
  {number:65,model:{kind:'separate_fiscal_shocks',mpc:0.5,initialIncome:50,governmentChange:3,taxChange:2},answer:'8',unitId:'econ_macro',topicId:'separate_fiscal_multipliers'},
 ];
 const rows=models.flatMap(({number,model,answer,unitId,topicId})=>['original','practice_retry'].map(kind=>({number,kind,version,dataClass:'synthetic_test_only',
  authority:'LEARNING_ONLY',humanReview:false,reviewer:null,reviewedAt:null,sourcePage:1,transcription:'synthetic_only',
  sourceQuestionId:`qnet-2025-36-s1-A-${number}`,questionId:kind==='original'?`qnet-2025-36-s1-A-${number}`:`issue883-curriculum-r${number}`,
  stem:`SYNTHETIC ${number} ${kind}`,choices:['101',answer,'103','104','105'],correctChoice:2,model,
  easyExplanation:`SYNTHETIC_SECRET_SOLUTION_${number}`,choiceExplanations:['synthetic a','synthetic b','synthetic c','synthetic d','synthetic e'],
  aids:{unitId,topicId,title:`Synthetic group ${number}`,concept:`SYNTHETIC_SECRET_CONCEPT_${number}`,prerequisite:`SYNTHETIC_SECRET_PREREQUISITE_${number}`},
  ...(kind==='practice_retry'?{difference:'synthetic independent fixture, not actual stock'}:{})})));
 const key=JSON.parse(fixture.artifacts.keyObservation);for(const {number}of models)key.groups[1].answers[number-41]=[2];fixture.rebind('keyObservation',key);
 const names={'qnet-2230215-session1.pdf':'pdf','qnet-2243629-final-key.hwp':'key','complete-key-observation-r3-ai-v1.json':'keyObservation','issue-883-economics-r3-review/source-observation.json':'observation'};
 const packet={schemaVersion:'issue883.economics.curriculum_sample.v1',version,dataClass:'synthetic_test_only',authority:'LEARNING_ONLY',humanReviewComplete:false,
  exam:{year:2025,round:36,session:1,booklet:'A',keyBookletExplicit:null},rows,
  files:Object.fromEntries(Object.entries(names).map(([file,key])=>[file,fixture.input.installation.fileSha256[key]])),
  humanChecks:['source_transcription','rights_and_booklet','answer_keys','feedback','model_assumptions','practice_retry_lineage'].map(check=>({check,reviewer:null,reviewedAt:null,decision:null})),limitations:['synthetic only']};
 fixture.input.sampleSource=Buffer.from(JSON.stringify(packet));fixture.input.syntheticSamplePins=Object.fromEntries(rows.map(row=>[row.questionId,digest(row)]));
 return {...fixture,packet,refresh(){fixture.input.sampleSource=Buffer.from(JSON.stringify(packet));}};
}
export function curriculumHarness(options={}){return trialHarness({...options,fixture:options.fixture??curriculumFixture(),catalogLoader:loadOwnerLocalCurriculumContent});}
