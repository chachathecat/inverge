/** Compatibility entry points; server pins and shared parsing live in one place. */
import { loadOwnerRegisteredContent, composeOwnerRegisteredCatalog } from "./owner-registered-content";
import type { PrivateFirstStageCatalog } from "./session-service";
export const loadOwnerInvestmentContent=(readBytes:()=>Promise<Uint8Array>,assignmentEnabled=false)=>loadOwnerRegisteredContent("investment",readBytes,assignmentEnabled);
export const composeOwnerOriginalCatalog=(base:PrivateFirstStageCatalog,addition:PrivateFirstStageCatalog,assignmentEnabled:boolean)=>composeOwnerRegisteredCatalog("investment",base,addition,assignmentEnabled);
import { loadOwnerOriginalContent } from "./owner-original-content";
export async function loadOwnerOriginalSupply(readBase:()=>Promise<Uint8Array>,readAddition?:()=>Promise<Uint8Array>,assignmentEnabled=false){
 const base=await loadOwnerOriginalContent(readBase);if(!base||!readAddition)return base;
 const addition=await loadOwnerInvestmentContent(readAddition,assignmentEnabled);return addition?composeOwnerOriginalCatalog(base,addition,assignmentEnabled):base;
}
