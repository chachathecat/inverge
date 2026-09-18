/** Compatibility entry points; server pins and shared parsing live in one place. */
import { loadOwnerRegisteredContent, composeOwnerRegisteredCatalog } from "./owner-registered-content";
import type { PrivateFirstStageCatalog } from "./session-service";
export const loadOwnerMarketContent=(readBytes:()=>Promise<Uint8Array>,assignmentEnabled=false)=>loadOwnerRegisteredContent("market",readBytes,assignmentEnabled);
export const composeOwnerMarketCatalog=(base:PrivateFirstStageCatalog,addition:PrivateFirstStageCatalog,assignmentEnabled:boolean)=>composeOwnerRegisteredCatalog("market",base,addition,assignmentEnabled);
export async function extendOwnerMarketSupply(base:PrivateFirstStageCatalog|null,readMarket?:()=>Promise<Uint8Array>,assignmentEnabled=false){
 if(!base||!readMarket)return base;
 const market=await loadOwnerMarketContent(readMarket,assignmentEnabled);return market?composeOwnerMarketCatalog(base,market,assignmentEnabled):base;
}
