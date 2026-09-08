import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const CURRICULUM_SAMPLE_VERSION="issue883-economics-curriculum-v1";
export const CURRICULUM_SAMPLE_FILE="economics-curriculum-sample-v1.json";
export const CURRICULUM_INSTALLATION_FILE="curriculum-installation-v1.json";
// Exact AI/independent arithmetic audited PRIVATE rows. No problem bodies,
// human signatures, release authority or operating environment values here.
export const CURRICULUM_ROW_PINS=Object.freeze({
  "qnet-2025-36-s1-A-58":"9e8e8aff77b78822822403d8611d83185b008fdcc3ab9a94963a92d8d2942045",
  "issue883-curriculum-r58":"6e7335096598dc3e6d833fc23ae2eea137b59e94f3ed118b7ef1c5985863feef",
  "qnet-2025-36-s1-A-62":"3171029209ae91970b82c058222c21362049659f4368137c0d074b9cfad5e1a1",
  "issue883-curriculum-r62":"3ac890a0d940994878a381a6c969dd28131d7e227dba8eed29e3be6b722e2a3e",
  "qnet-2025-36-s1-A-65":"95d3b51386508ea2836749fdf24cb96015b93b3cd173b64940871eb001b72580",
  "issue883-curriculum-r65":"3da1efaeca676408b4b1bf5cfdb77c2ee6d0cfc107beb41f3979f95757471b85",
});
export const CURRICULUM_INSTALLATION=Object.freeze({schemaVersion:"first_stage.owner_local_curriculum_installation.v1",
  sampleVersion:CURRICULUM_SAMPLE_VERSION,fileName:CURRICULUM_SAMPLE_FILE,dataClass:"private_review_candidate",
  humanReviewComplete:false,rowSha256:CURRICULUM_ROW_PINS});
function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
export function assertInstallableCurriculumSample(bytes){
  if(!bytes?.length||bytes.length>262144)throw new Error("private_sample_unavailable");
  const packet=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(packet.version!==CURRICULUM_SAMPLE_VERSION||packet.dataClass!=="private_review_candidate"||packet.humanReviewComplete!==false||
    !Array.isArray(packet.rows)||packet.rows.length!==6||new Set(packet.rows.map(row=>row.questionId)).size!==6||
    packet.rows.some(row=>createHash("sha256").update(canonical(row)).digest("hex")!==CURRICULUM_ROW_PINS[row.questionId]))throw new Error("private_sample_unavailable");
  // Actual source/key/rights/semantic admission still runs in the authenticated
  // loader. This check installs no runtime trust and cannot create human review.
}
/** Missing/invalid OPTIONAL extension keeps the independently validated r3 base.
 * Do not load any body until the exact local installation is present. */
export async function readInstalledCurriculumSample(readInstallation,readSample){
  try {
    const bytes=await readInstallation();
    if(!bytes?.length||bytes.length>8192)return new Uint8Array();
    if(!isDeepStrictEqual(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)),CURRICULUM_INSTALLATION))return new Uint8Array();
    return await readSample();
  } catch {return new Uint8Array();}
}
