import { AsyncLocalStorage } from "node:async_hooks";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import type { PrivateFirstStageCatalog } from "./session-service";
import type { QfI1CandidateV1 } from "../../../question-foundry/runtime/qf-i1-bank-first";
import { genuineTrialSession } from "./owner-local-trial-boundary";
import { reviewedBankCandidates } from "./private-reviewed-content";
import type { QuestionReference } from "../kernel/domain";
import { isOwnerOriginalAdapter, ownerOriginalEnvironment, OWNER_ORIGINAL_IDS, OWNER_INVESTMENT_IDS, OWNER_MARKET_IDS, matchesOwnerOriginalReference } from "./owner-original-boundary";

// Request-local capability only. No client flag, stored receipt or adapter ID
// alone can authorize a calculation-backed, human-unreviewed response.
const active = new AsyncLocalStorage<{ open: boolean; adapters: WeakSet<object>;
  catalogs: WeakMap<object, readonly QfI1CandidateV1[]>; history: WeakMap<object, readonly QfI1CandidateV1[]>; candidates: WeakSet<object> }>();
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
  return activeOwnerOriginalAdapter(adapter) && matchesOwnerOriginalReference(reference);
}
export function authorizeOwnerOriginalCatalog(catalog: PrivateFirstStageCatalog, candidates: readonly QfI1CandidateV1[], assignableIds?: readonly string[]) {
  const scope=active.getStore();
  const ids=catalog.initialReferences.map(reference=>reference.questionId);
  const allowed=[[OWNER_ORIGINAL_IDS[0]],[OWNER_INVESTMENT_IDS[0],OWNER_INVESTMENT_IDS[2]],
    [OWNER_ORIGINAL_IDS[0],OWNER_INVESTMENT_IDS[0],OWNER_INVESTMENT_IDS[2]],
    [OWNER_MARKET_IDS[0],OWNER_MARKET_IDS[2]], [OWNER_ORIGINAL_IDS[0],OWNER_MARKET_IDS[0],OWNER_MARKET_IDS[2]],
    [OWNER_ORIGINAL_IDS[0],OWNER_INVESTMENT_IDS[0],OWNER_INVESTMENT_IDS[2],OWNER_MARKET_IDS[0],OWNER_MARKET_IDS[2]]];
  if(!scope?.open || !activeOwnerOriginalAdapter(catalog.registry.require("real_estate_principles")) ||
    !allowed.some(value=>JSON.stringify(value)===JSON.stringify(ids)) ||
    !catalog.initialReferences.every(matchesOwnerOriginalReference) ||
    candidates.length!==ids.length || candidates.some((candidate,index)=>candidate.candidateId!==ids[index]) ||
    (assignableIds && (new Set(assignableIds).size!==assignableIds.length || assignableIds.some(id=>!ids.includes(id))))) throw new Error("owner_original_unavailable");
  scope.history.set(catalog,Object.freeze([...candidates]));
  scope.catalogs.set(catalog,Object.freeze(candidates.filter(candidate=>!assignableIds || assignableIds.includes(candidate.candidateId))));
  for(const candidate of candidates)scope.candidates.add(candidate);
}
export function ownerOriginalHistoryCandidates(catalog: PrivateFirstStageCatalog) {
  const scope=active.getStore();return scope?.open ? scope.history.get(catalog)??null : null;
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
      const scope={open:true,adapters:new WeakSet<object>(),candidates:new WeakSet<object>(),catalogs:new WeakMap<object,readonly QfI1CandidateV1[]>(),history:new WeakMap<object,readonly QfI1CandidateV1[]>()};
      try{return await active.run(scope,()=>createPrivateSessionApplication({...dependencies,environment:()=>env,session:async()=>session})(canonical));}
      finally{scope.open=false;}
    }catch{return Response.json({ok:false,error:"temporarily_unavailable"},{status:503,headers});}
  };
}

/** Existing reviewed-subject availability alone may validate exact authored
 * peer history. Mutations and addressed-session reads keep their original
 * composition; this does not supply authored stock to another subject. */
export function createOwnerOriginalPeerReadApplication(dependencies: PrivateSessionApplicationDependencies, loadPeer: () => Promise<PrivateFirstStageCatalog | readonly PrivateFirstStageCatalog[] | null>) {
  const scoped = createOwnerOriginalApplication({...dependencies, peerCatalogs: async () => {
    const peers = await dependencies.peerCatalogs?.() ?? [];
    const original = await loadPeer();
    return original ? [...peers, ...(Array.isArray(original) ? original : [original as PrivateFirstStageCatalog])] : peers;
  }});
  return async (request: Request): Promise<Response> => {
    if (request.method === "GET" && !new URL(request.url).search && dependencies.environment().INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED === "true") return scoped(request);
    const {createPrivateSessionApplication} = await import("./session-application");
    return createPrivateSessionApplication(dependencies)(request);
  };
}

/** Preserve reviewed real-estate history beside this exact authored catalog.
 * The reviewed loader's object capability is required; a digest alone is not authority. */
export function compatibleOwnerOriginalReviewedCatalog(primary: PrivateFirstStageCatalog, peer: PrivateFirstStageCatalog) {
  return activeOwnerOriginalCatalog(primary) && peer.digest !== primary.digest &&
    peer.initialReferences.length > 0 && peer.initialReferences.every(reference => reference.subjectId === "real_estate_principles") &&
    (reviewedBankCandidates(peer) !== null || activeOwnerOriginalCatalog(peer));
}
export function catalogForOwnerOriginalHistory(primary: PrivateFirstStageCatalog, peers: readonly PrivateFirstStageCatalog[], digest: string) {
  if (primary.digest === digest) return primary;
  const matches = peers.filter(peer => peer.digest === digest && compatibleOwnerOriginalReviewedCatalog(primary, peer));
  if (matches.length !== 1) throw new Error("owner_original_history_catalog_mismatch");
  return matches[0];
}
