import { FirstStageKernelError, exactObject } from "../kernel/domain";
import type { PrivateSessionApplicationDependencies } from "./session-application";
import { createOwnerLocalTodayService } from "./owner-local-today";
import { readPrivateSessionCommand, RequestTooLarge } from "./session-http";

const HEADERS = { "Cache-Control":"private, no-store, max-age=0",Pragma:"no-cache",
  Vary:"Cookie, Authorization","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer" };
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:HEADERS});
/** Invoked ONLY inside the authenticated, server-owned local trial request scope. */
export async function handleOwnerLocalToday(request:Request, dependencies:PrivateSessionApplicationDependencies, ownerId:string) {
  try {
    const url=new URL(request.url);
    if(url.search!=="?view=today") throw new FirstStageKernelError("invalid_input");
    if(!["GET","POST"].includes(request.method)) return response({ok:false,error:"method_not_allowed"},405);
    if(request.method==="POST" && (request.headers.get("origin")!==url.origin || request.headers.get("sec-fetch-site")==="cross-site")) {
      return response({ok:false,error:"not_found"},404);
    }
    const input=request.method==="POST" ? exactObject(await readPrivateSessionCommand(request),["action","input"]) : null;
    const catalog=await dependencies.catalog();
    if(!catalog || !dependencies.planningRepository) return response({ok:false,error:"owner_local_trial_content_required"},503);
    const service=createOwnerLocalTodayService(dependencies.repository(),dependencies.planningRepository(),catalog,
      dependencies.now ?? (()=>new Date().toISOString()));
    if(!input) return response({ok:true,today:await service.view(ownerId)});
    if(input.action==="save_availability") return response({ok:true,today:await service.savePreferences(ownerId,input.input)});
    if(input.action==="start_planned") return response({ok:true,started:await service.dispatch(ownerId,input.input)});
    throw new FirstStageKernelError("invalid_input");
  } catch(error) {
    if(error instanceof RequestTooLarge) return response({ok:false,error:"request_too_large"},413);
    if(error instanceof FirstStageKernelError) {
      if(error.code==="invalid_input") return response({ok:false,error:"invalid_input"},400);
      if(error.code==="stale_state" || error.code==="invalid_transition") return response({ok:false,error:"state_conflict"},409);
    }
    return response({ok:false,error:"temporarily_unavailable"},503);
  }
}
