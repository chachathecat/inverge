/** Dedicated PC-local Supabase runtime. Reuses stopped CLI-created images and
 * persistent volumes; never deletes/reinitializes them or changes Docker globals.
 * No remote socket, credentials output, deployment or automatic cleanup. */
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROLES = ["db", "auth", "rest", "pg_meta", "inbucket", "kong", "studio"];
const PORTS = { db: { "5432/tcp": "55422" }, kong: { "8000/tcp": "55421" },
  studio: { "3000/tcp": "55423" }, inbucket: { "8025/tcp": "55424" } };
const NETWORK = "inverge-owner-economics-loopback";
const original = role => `supabase_${role}_owner-economics`;
const target = role => `inverge_owner_economics_${role}_loopback`;
function fail(code) { throw new Error(code); }
export function validateLoopbackListeners(rows) {
  const ports=[55421,55422,55423,55424];
  if(!Array.isArray(rows)||rows.some(row=>!ports.includes(row.LocalPort)||row.LocalAddress!=="127.0.0.1")||
    ports.some(port=>!rows.some(row=>row.LocalPort===port)))fail("host_loopback_not_confirmed");
  return true;
}
async function verifyWindowsListeners() {
  for(let attempt=0;attempt<10;attempt++) {
    const probe=spawnSync("powershell.exe",["-NoProfile","-NonInteractive","-Command",
      "ConvertTo-Json -Compress -InputObject @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @(55421,55422,55423,55424) } | Select-Object LocalAddress,LocalPort)"],
    {encoding:"utf8",maxBuffer:65536,windowsHide:true});
    if(probe.status!==0)fail("host_listener_probe_failed");
    const rows=JSON.parse(probe.stdout);
    if(!Array.isArray(rows))fail("host_listener_probe_failed");
    // Any observed public listener is terminal, never retryable warmup.
    if(rows.some(row=>row.LocalAddress!=="127.0.0.1"))fail("host_public_listener");
    try {validateLoopbackListeners(rows);return;} catch {}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  fail("host_loopback_not_confirmed");
}
export function planLoopbackContainer(role, source) {
  if (!ROLES.includes(role) || source.Name !== `/${original(role)}` || source.State?.Running ||
    source.Config?.Labels?.["com.supabase.cli.project"] !== "owner-economics" ||
    !/^sha256:[a-f0-9]{64}$/.test(source.Image) || source.HostConfig.Privileged || source.HostConfig.AutoRemove) fail("invalid_local_source");
  const expected = PORTS[role] ?? {}, existing = source.HostConfig.PortBindings ?? {};
  if (JSON.stringify(Object.keys(existing).sort()) !== JSON.stringify(Object.keys(expected).sort())) fail("unexpected_published_port");
  const bindings = {};
  for (const [port, hostPort] of Object.entries(expected)) {
    if (existing[port]?.length !== 1 || existing[port][0].HostPort !== hostPort) fail("unexpected_host_port");
    bindings[port] = [{ HostIp: "127.0.0.1", HostPort: hostPort }];
  }
  // Preserve the original stopped runtime and every bind/volume. The new
  // container has explicit HostIp, not an inherited bridge default.
  const aliases = source.NetworkSettings.Networks[NETWORK]?.Aliases;
  if (!Array.isArray(aliases)) fail("unexpected_local_network");
  return { name: target(role), body: { ...source.Config, Image: source.Image,
    Labels: { "inverge.owner-local-persistent": "economics-r3", "inverge.local-role": role },
    HostConfig: { ...source.HostConfig, PortBindings: bindings, AutoRemove: false,
      RestartPolicy: { Name: "no", MaximumRetryCount: 0 }, NetworkMode: NETWORK },
    NetworkingConfig: { EndpointsConfig: { [NETWORK]: { Aliases: [...new Set([original(role), ...aliases])] } } } } };
}
export function localDockerRequest(method, url, body, raw = false) {
  return new Promise((resolve,reject)=>{
    const bytes = body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body);
    const request = http.request({ socketPath: "\\\\.\\pipe\\dockerDesktopLinuxEngine", path: `/v1.51${url}`, method,
      headers: bytes === undefined ? {} : { "Content-Type":Buffer.isBuffer(body)?"application/x-tar":"application/json", "Content-Length":Buffer.byteLength(bytes) } },response=>{
      const chunks=[];let total=0;response.on("data",b=>{total+=b.length;if(total>8*1024*1024)request.destroy(new Error("response_too_large"));else chunks.push(b);});
      response.on("end",()=>{try {const buffer=Buffer.concat(chunks);resolve({status:response.statusCode,body:raw?buffer:buffer.length?JSON.parse(buffer.toString()):null});}catch{reject(new Error("invalid_local_response"));}});
    });
    request.setTimeout(30000,()=>request.destroy(new Error("local_engine_timeout")));request.on("error",reject);request.end(bytes);
  });
}
const api = localDockerRequest;
async function inspect(name) { return api("GET",`/containers/${name}/json`); }
async function waitReady(role) {
  for(let attempt=0;attempt<30;attempt++) {
    const found=await inspect(target(role));
    if(found.status!==200||!found.body.State.Running)fail(`unhealthy_${role}`);
    validateTarget(role,found.body,true);
    const health=found.body.State.Health?.Status;
    if(!health||health==="healthy")return;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  fail(`health_timeout_${role}`);
}
function validateTarget(role, row, actual = false) {
  const expected=PORTS[role]??{};
  if(row.Name!==`/${target(role)}`||row.Config.Labels?.["inverge.owner-local-persistent"]!=="economics-r3"||row.HostConfig.Privileged)fail("invalid_target");
  const bindings=actual?row.NetworkSettings.Ports:row.HostConfig.PortBindings;
  const published=Object.entries(bindings??{}).filter(([,v])=>Array.isArray(v)&&v.length);
  if(published.length!==Object.keys(expected).length)fail("unexpected_target_ports");
  for(const [port,values] of published)if(values.length!==1||values[0].HostIp!=="127.0.0.1"||values[0].HostPort!==expected[port])fail("non_loopback_target");
}
async function stopTargets() { for(const role of [...ROLES].reverse()) {const found=await inspect(target(role));
  if(found.status===200&&found.body.Config.Labels?.["inverge.owner-local-persistent"]==="economics-r3"&&found.body.State.Running)
    await api("POST",`/containers/${target(role)}/stop?t=10`); } }
export async function runLocalLoopback(command) {
  if(process.platform!=="win32"||!["plan","prepare","start","inspect","stop"].includes(command))fail("invalid_local_command");
  if(command==="stop"){await stopTargets();return {stopped:true,volumesPreserved:true};}
  if(command==="inspect") {const results=[];for(const role of ROLES){const found=await inspect(target(role));
    if(found.status!==200)fail("target_missing");validateTarget(role,found.body,found.body.State.Running);
    results.push({role,running:found.body.State.Running,health:found.body.State.Health?.Status??null,ports:found.body.NetworkSettings.Ports});}return results;}
  // Always refuse concurrent original writers, including when a target exists.
  const plans=[];for(const role of ROLES){const source=await inspect(original(role));if(source.status!==200)fail("source_missing");plans.push(planLoopbackContainer(role,source.body));}
  if(command==="plan")return plans.map((plan,i)=>({role:ROLES[i],name:plan.name,ports:plan.body.HostConfig.PortBindings,preservesVolumes:true}));
  for(const [i,plan] of plans.entries()) {
    let found=await inspect(plan.name);
    if(found.status===404){const created=await api("POST",`/containers/create?name=${plan.name}`,plan.body);if(created.status!==201)fail(`create_${ROLES[i]}_${created.status}`);found=await inspect(plan.name);}
    if(found.status!==200)fail("target_inspect_failed");validateTarget(ROLES[i],found.body);
    if(found.body.Image!==plan.body.Image||JSON.stringify(found.body.HostConfig.Binds)!==JSON.stringify(plan.body.HostConfig.Binds))fail("persistent_binding_drift");
  }
  if(command==="prepare")return {prepared:plans.length,started:false};
  try {
    for(const role of ROLES){const result=await api("POST",`/containers/${target(role)}/start`);if(![204,304].includes(result.status))fail(`start_${role}_${result.status}`);
      const found=await inspect(target(role));validateTarget(role,found.body,true);await waitReady(role);}
    await verifyWindowsListeners();
    return {started:plans.length,explicitLoopback:true,windowsListenersLoopback:true,accountOrContentCreated:false};
  } catch(error) {await stopTargets();throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  runLocalLoopback(process.argv[2]).then(value=>console.log(JSON.stringify(value))).catch(error=>{
    // Closed diagnostic codes only. Never print Docker response/config/env.
    const code=String(error.message);console.error(/^[a-z0-9_]+$/.test(code)?code:"local_loopback_setup_failed");process.exitCode=1;});
}
