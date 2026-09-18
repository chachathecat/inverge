import { OWNER_CONTENT_BUNDLES, OWNER_CONTENT_REGISTRATION } from "./owner-content-registration.mjs";
import { loadOwnerOriginalContent } from "./owner-original-content";
import { loadOwnerRegisteredContent, composeOwnerRegisteredCatalog } from "./owner-registered-content";
import type { PrivateFirstStageCatalog } from "./session-service";

/** No directory discovery or content-authored registration. Only installed,
 * separately approved server pins enter this existing Owner-local route. */
export async function loadOwnerRegisteredSupply(env:Readonly<Record<string,string|undefined>>,read:(path:string)=>Promise<Uint8Array>) {
  const leaves=new Map<string,PrivateFirstStageCatalog>();
  for(const bundle of OWNER_CONTENT_BUNDLES){
    const path=env[bundle.pathVariable];if(!path)continue;
    const leaf=bundle.validator==="legacy_direct_capitalization"?await loadOwnerOriginalContent(()=>read(path)):
      await loadOwnerRegisteredContent(bundle.key,()=>read(path),env[bundle.flag]==="true");
    if(leaf)leaves.set(bundle.key,leaf);
  }
  if(!leaves.has("original"))return {catalog:null,history:[]};
  const history:PrivateFirstStageCatalog[]=[];
  for(const keys of OWNER_CONTENT_REGISTRATION.catalogs){
    if(!keys.every(key=>leaves.has(key)))continue;
    let catalog=leaves.get(keys[0])!;
    for(const key of keys.slice(1)){
      const bundle=OWNER_CONTENT_BUNDLES.find(row=>row.key===key)!;
      catalog=composeOwnerRegisteredCatalog(key,catalog,leaves.get(key)!,env[bundle.flag]==="true");
    }
    if(!history.some(prior=>prior.digest===catalog.digest))history.push(catalog);
  }
  // All installed, admitted leaves must have one declared composition. Missing
  // registration cannot silently discard a saved bundle or mint a new digest.
  const expected=OWNER_CONTENT_BUNDLES.filter(bundle=>leaves.has(bundle.key)).flatMap(bundle=>bundle.ids.filter((_,i)=>i%2===0));
  const catalog=history.find(value=>JSON.stringify(value.initialReferences.map(r=>r.questionId))===JSON.stringify(expected))??null;
  return {catalog,history};
}
