/** Dedicated persistent Owner trial only. Never pulls remote envs or resets records. */
import { readFile,writeFile,access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawn,spawnSync } from "node:child_process";
import { localDockerRequest as api,runLocalLoopback,validateLoopbackListeners } from "./owner-economics-loopback.mjs";

const PRIVATE_ROOT=path.join(process.env.USERPROFILE??"", ".cache","codex-runtimes","owner-private","issue-883-economics-2025");
const LOCAL_ROOT=path.join(process.env.LOCALAPPDATA??"", "Inverge","owner-economics");
export const OWNER_LOCAL_EMAIL="owner@localhost.test";
const ARTIFACTS={candidate:"economics-runtime-candidate-r3-v1.json",review:"issue-883-economics-r3-review/review-packet-r3.json",
  calculations:"issue-883-economics-r3-review/calculation-results.json",ai:"additional-ai-review-2026-09-07/review-evidence.json",
  observation:"issue-883-economics-r3-review/source-observation.json",checklist:"issue-883-economics-r3-review/REVIEW-r3.md",
  pdf:"qnet-2230215-session1.pdf",key:"qnet-2243629-final-key.hwp",keyObservation:"complete-key-observation-r3-ai-v1.json"};
function fail(code){throw new Error(code);}
export function ownerLocalAppEnvironment(base,keys,privateRoot=PRIVATE_ROOT){
  if(!keys?.anon||!keys?.service)fail("local_api_credentials_required");
  // Do not inherit provider keys, proxy routing, Node preload/TLS overrides or
  // remote/deployment variables from the caller. Only OS process plumbing survives.
  const env=Object.fromEntries(Object.entries(base).filter(([name])=>
    /^(path|pathext|systemroot|windir|comspec|userprofile|localappdata|appdata|temp|tmp|programfiles|programfiles\(x86\)|programw6432|number_of_processors|processor_architecture|lang|term)$/i.test(name)));
  return {...env,NODE_ENV:"development",NEXT_TELEMETRY_DISABLED:"1",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:keys.anon,SUPABASE_SERVICE_ROLE_KEY:keys.service,DEV_SMOKE_AUTH:"false",
    INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED:"true",INVERGE_OWNER_ECONOMICS_R3_SOURCE_ROOT:privateRoot,
    INVERGE_OWNER_FIRST_STAGE_EMAILS:OWNER_LOCAL_EMAIL,ALPHA_ADMIN_EMAILS:OWNER_LOCAL_EMAIL,
    INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED:"true"};
}
async function guardedEnvironment(){
  if(process.platform!=="win32"||process.env.VERCEL!==undefined||process.env.VERCEL_ENV!==undefined||process.env.CI==="true")fail("local_pc_required");
  const rows=await runLocalLoopback("inspect");if(rows.some(row=>!row.running||(row.health&&row.health!=="healthy")))fail("local_stack_not_healthy");
  const listeners=spawnSync("powershell.exe",["-NoProfile","-NonInteractive","-Command",
    "ConvertTo-Json -Compress -InputObject @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @(55421,55422,55423,55424) } | Select-Object LocalAddress,LocalPort)"],
  {encoding:"utf8",windowsHide:true,maxBuffer:65536});
  if(listeners.status!==0)fail("local_listener_probe_failed");validateLoopbackListeners(JSON.parse(listeners.stdout));
  const studio=(await api("GET","/containers/90ea6cb796b3fb6848af969ce7c6c86181481f81ad6cb72e55c48aec0f9b4374/json")).body;
  if(studio?.Name!=="/inverge_owner_economics_studio_loopback"||studio.Config.Labels?.["inverge.owner-local-persistent"]!=="economics-r3")fail("local_studio_identity_drift");
  const env=Object.fromEntries(studio.Config.Env.map(value=>{const i=value.indexOf("=");return [value.slice(0,i),value.slice(i+1)];}));
  if(!env.SUPABASE_ANON_KEY||!env.SUPABASE_SERVICE_KEY||env.SUPABASE_URL!=="http://supabase_kong_owner-economics:8000")fail("local_service_binding_drift");
  // Deliberately select only two local API credentials, not the Studio env as a whole.
  return {anon:env.SUPABASE_ANON_KEY,service:env.SUPABASE_SERVICE_KEY};
}
export async function prepareOwnerLocalApp(){
  await guardedEnvironment();
  const sql=await readFile(new URL("../../supabase/local-designs/first-stage-owner-local-sessions.sql",import.meta.url),"utf8");
  const applied=spawnSync("C:/Program Files/Docker/Docker/resources/bin/docker.exe",["exec","-i","inverge_owner_economics_db_loopback","psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],
    {input:"set inverge.local_first_stage_personal_use = 'owner_approved_persistent_local';\n"+sql,encoding:"utf8",windowsHide:true,maxBuffer:65536});
  if(applied.status!==0)fail("personal_local_schema_failed");
  const fileSha256={};
  for(const [key,file] of Object.entries(ARTIFACTS)){const b=await readFile(path.join(PRIVATE_ROOT,file));if(!b.length||b.length>2097152)fail("private_artifact_size");fileSha256[key]=createHash("sha256").update(b).digest("hex");}
  const installed=JSON.stringify({schemaVersion:"first_stage.owner_local_r3_installation.v1",dataClass:"private_review_candidate",fileSha256},null,2)+"\n";
  const target=path.join(LOCAL_ROOT,"trial-installation.json");
  const existing=await readFile(target,"utf8").catch(error=>{if(error.code!=="ENOENT")throw error;return null;});
  if(existing!==null&&existing!==installed)fail("existing_installation_drift_preserved");
  if(existing===null)await writeFile(target,installed,{flag:"wx",mode:0o600});
  return {personalLocalSchema:"prepared",installationPath:target,boundArtifacts:9,
    supportedQuestions:"determined_by_server_pair_evidence_checks",humanApprovedQuestions:0,recordsReset:false};
}
export async function startOwnerLocalApp(){
  const keys=await guardedEnvironment();
  for(const file of [".env",".env.local",".env.development",".env.development.local"]){if(await access(file).then(()=>true,()=>false))fail("existing_env_file_must_be_preserved");}
  await access(path.join(LOCAL_ROOT,"trial-installation.json"));
  const env=ownerLocalAppEnvironment(process.env,keys);
  // No secret argument, env file, remote fetch, smoke account or global TLS change.
  const child=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3883"],{env,stdio:"inherit",windowsHide:true});
  for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
  child.on("exit",code=>{process.exitCode=code??1;});return child;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const command=process.argv[2];
  (command==="prepare"?prepareOwnerLocalApp().then(result=>console.log(JSON.stringify(result))):command==="start"?startOwnerLocalApp():Promise.reject(new Error("invalid_local_command")))
    .catch(error=>{const message=String(error.message);console.error(/^[a-z_]+$/.test(message)?message:"local_trial_setup_failed");process.exitCode=1;});
}
