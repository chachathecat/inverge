import { createHash } from "node:crypto";
import { createSnapshotBridge } from "../../lib/legal/owner-snapshot-bridge.ts";
import { createSnapshotBridgeHandler } from "../../lib/legal/owner-snapshot-bridge-http.ts";

export const digest = value => createHash("sha256").update(value).digest("hex");
export const held = { lawId:"999999",lawName:"합성 법령",mst:"1",effectiveDate:"20260101",manifestSha256:digest("synthetic manifest") };
export const syntheticBody = "SYNTHETIC_STATUTE_BODY_ONLY — 합성 규칙. 실제 법령이 아님.";
export const reference = {schemaVersion:"StatuteSnapshotReferenceV1",projectRef:"synthetic-only",bucket:"synthetic-only",
  catalogSha256:digest("catalog"),catalogObjectKey:"synthetic/catalog",...held,promulgationDate:"20250101",collectedAt:"2026-09-01T00:00:00Z",
  section:"MAIN",articleKey:"main:2",storedArticleKey:"2",supplementaryKey:null,jsonPointer:"/synthetic/2",originalFormat:"JSON",
  originalJsonSha256:digest("original"),normalizedSha256:digest("normalized"),originalObjectKey:"synthetic/original",
  manifestObjectKey:"synthetic/manifest",normalizedObjectKey:"synthetic/normalized",originalFragmentSha256:digest("fragment"),textSha256:digest(syntheticBody)};
export const anchor = { reference,articleNumber:"2",branchNumber:null,title:"합성 조문",bodyText:syntheticBody,deleted:false,score:1,
  originalFragment:{DO_NOT_SERIALIZE:"SYNTHETIC_ORIGINAL_FRAGMENT"} };
export const environment = {NODE_ENV:"development",INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED:"true",
  NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"true",
  ALPHA_ADMIN_EMAILS:"synthetic@example.test",INVERGE_OWNER_FIRST_STAGE_EMAILS:"synthetic@example.test"};
export const ownerSession = {isAuthenticated:true,isDemo:false,authEnabled:true,source:"supabase",userId:"synthetic-owner",email:"synthetic@example.test"};
export const input = {lawId:held.lawId,mst:held.mst,effectiveDate:held.effectiveDate,manifestSha256:held.manifestSha256,articleNumber:"2"};
export function bridgeHarness(options={}) {
  let loads=0,sessionReads=0,reads=0,reopens=0,failure=null;
  const env={...environment,...options.env},session={...ownerSession,...options.session};
  const native = {listSnapshots:()=>failure ? {state:failure} : {state:"OK",snapshots:[held]},
    search: value=>{reads++; if(failure)return {state:failure};
      if(value.articleNumber!=="2"&&value.queryText!=="합성")return {state:"NO_RESULTS",anchors:[]};
      return {state:"OK",anchors:[anchor],totalMatches:1,returnedCount:1}; },
    readReference: value=>{reopens++; if(failure)return {state:failure};
      if(JSON.stringify(value)!==JSON.stringify(reference))return {state:"INTEGRITY_ERROR"};
      return {state:"OK",anchors:[anchor],originalReopened:true}; }};
  const bridge=createSnapshotBridge(options.reader??native);
  const handler=createSnapshotBridgeHandler({environment:()=>env,session:async()=>{sessionReads++;return session;},
    bridge:async()=>{loads++;return options.notConfigured?null:bridge;}});
  const send=async(body,options={})=>{
    const request=new Request("http://127.0.0.1:3883/api/review-os/first-stage/legal-evidence"+(options.query??""),{
      method:body===undefined?"GET":"POST",headers:{host:"127.0.0.1:3883","content-type":"application/json",origin:"http://127.0.0.1:3883",...options.headers},
      ...(body===undefined?{}:{body:typeof body==="string"?body:JSON.stringify(body)})});
    const response=await handler(request);
    return {status:response.status,headers:response.headers,body:await response.json()};
  };
  return {handler,send,env,session,bridge,fail:state=>{failure=state;},counts:()=>({loads,sessionReads,reads,reopens})};
}
