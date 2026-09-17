import { AsyncLocalStorage } from "node:async_hooks";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import type { PrivateFirstStageCatalog } from "./session-service";
import type { QfI1CandidateV1 } from "../../../question-foundry/runtime/qf-i1-bank-first";
import { genuineTrialSession } from "./owner-local-trial-boundary";
import type { QuestionReference } from "../kernel/domain";
import { isOwnerOriginalAdapter, ownerOriginalEnvironment, OWNER_ORIGINAL_IDS, OWNER_ORIGINAL_VERSION, OWNER_ORIGINAL_PACKET_SHA256 } from "./owner-original-boundary";

// Request-local capability only. No client flag, stored receipt or adapter ID
// alone can authorize a calculation-backed, human-unreviewed response.
const active = new AsyncLocalStorage<{ open: boolean; adapters: WeakSet<object>;
  catalogs: WeakMap<object, readonly QfI1CandidateV1[]>; candidates: WeakSet<object> }>();
export function authorizeOwnerOriginalAdapter(adapter: {adapterId:string;adapterVersion:string;subjectId:string}) {
  const scope=active.getStore();
  if(!scope?.open || !isOwnerOriginalAdapter(adapter)) throw new Error("owner_original_unavailable");
  scope.adapters.add(adapter);
}
export function activeOwnerOriginalAdapter(adapter: object) {
  const scope=active.getStore();return scope?.open===true && scope.adapters.has(adapter);
}
/** Shared branches must prove the exact authored reference as well as capability. */
export function activeOwnerOriginalReference(adapter: object, reference: QuestionReference) {
  return activeOwnerOriginalAdapter(adapter) && reference.schemaVersion === "first_stage.owner_original_question_reference.v1" &&
    reference.subjectId === "real_estate_principles" && reference.questionVersion === OWNER_ORIGINAL_VERSION &&
    (OWNER_ORIGINAL_IDS as readonly string[]).includes(reference.questionId) && reference.examYear === null &&
    reference.examRound === null && reference.questionNumber === null && reference.sessionId === "owner-original-real-estate-v2" &&
    reference.rightsState === "owner_authorized_original" && reference.currentnessState === "stated_model_only" &&
    JSON.stringify(reference.sourceVersionManifestIds) === JSON.stringify([`owner-original-${OWNER_ORIGINAL_PACKET_SHA256}`]);
}
export function authorizeOwnerOriginalCatalog(catalog: PrivateFirstStageCatalog, candidates: readonly QfI1CandidateV1[]) {
  const scope=active.getStore();
  if(!scope?.open || !activeOwnerOriginalAdapter(catalog.registry.require("real_estate_principles")) ||
    catalog.initialReferences.length!==1 || catalog.initialReferences[0].questionId!==OWNER_ORIGINAL_IDS[0] ||
    candidates.length!==1 || candidates[0].candidateId!==OWNER_ORIGINAL_IDS[0]) throw new Error("owner_original_unavailable");
  scope.catalogs.set(catalog,Object.freeze(candidates));
  for(const candidate of candidates)scope.candidates.add(candidate);
}
export function ownerOriginalBankCandidates(catalog: PrivateFirstStageCatalog) {
  const scope=active.getStore();return scope?.open ? scope.catalogs.get(catalog)??null : null;
}
export function activeOwnerOriginalCandidate(candidate:object) { const scope=active.getStore();return scope?.open===true&&scope.candidates.has(candidate); }
export function activeOwnerOriginalCatalog(catalog: PrivateFirstStageCatalog) { return ownerOriginalBankCandidates(catalog)!==null; }

export function createOwnerOriginalApplication(dependencies: PrivateSessionApplicationDependencies) {
  return async (request: Request): Promise<Response> => {
    const headers={"Cache-Control":"private, no-store, max-age=0","Referrer-Policy":"no-referrer",Vary:"Cookie, Authorization"};
    const deny=()=>Response.json({ok:false,error:"not_found"},{status:404,headers});
    try {
      const env=dependencies.environment(), origin=ownerOriginalEnvironment(env);if(!origin)return deny();
      const url=new URL(request.url), expected=new URL(origin), host=request.headers.get("host");
      if(!((url.origin===origin && (host===null||host===expected.host)) ||
        (url.origin===`http://localhost:${expected.port}`&&host===expected.host)) ||
        (request.headers.get("origin")!==null&&request.headers.get("origin")!==origin)) return deny();
      const session=await dependencies.session();
      const {privateFirstStageOwner,createPrivateSessionApplication}=await import("./session-application");
      if(!genuineTrialSession(session)||!await privateFirstStageOwner(env,async()=>session))return deny();
      url.hostname="127.0.0.1";
      const canonical=new Request(url,request);
      const scope={open:true,adapters:new WeakSet<object>(),candidates:new WeakSet<object>(),catalogs:new WeakMap<object,readonly QfI1CandidateV1[]>()};
      try{return await active.run(scope,()=>createPrivateSessionApplication({...dependencies,environment:()=>env,session:async()=>session})(canonical));}
      finally{scope.open=false;}
    }catch{return Response.json({ok:false,error:"temporarily_unavailable"},{status:503,headers});}
  };
}
