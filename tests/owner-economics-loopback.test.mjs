import assert from "node:assert/strict";
import test from "node:test";
import { planLoopbackContainer, validateLoopbackListeners } from "../scripts/local/owner-economics-loopback.mjs";
function source(){return {Name:"/supabase_db_owner-economics",State:{Running:false},Image:`sha256:${"a".repeat(64)}`,
  Config:{Labels:{"com.supabase.cli.project":"owner-economics"},Env:["SYNTHETIC_LOCAL_ONLY=not-a-real-key"]},
  HostConfig:{Privileged:false,AutoRemove:false,Binds:["supabase_db_owner-economics:/var/lib/postgresql/data"],
    PortBindings:{"5432/tcp":[{HostIp:"",HostPort:"55422"}]}},
  NetworkSettings:{Networks:{"inverge-owner-economics-loopback":{Aliases:["db"]}}}};}
test("PC listeners cover all dedicated ports with no IPv4 or IPv6 wildcard",()=>{
  const rows=[55421,55422,55423,55424].map(LocalPort=>({LocalPort,LocalAddress:"127.0.0.1"}));
  assert.equal(validateLoopbackListeners(rows),true);
  for(const value of [null,[],rows.slice(1),[...rows,{LocalPort:55421,LocalAddress:"0.0.0.0"}],
    [...rows,{LocalPort:55421,LocalAddress:"::"}],rows.map(row=>({...row,LocalAddress:"192.168.1.2"}))])
    assert.throws(()=>validateLoopbackListeners(value));
});
test("dedicated local plan explicitly binds host IPv4 loopback and preserves stopped source volumes",()=>{
  const original=source(),before=structuredClone(original),plan=planLoopbackContainer("db",original);
  assert.deepEqual(original,before);assert.deepEqual(plan.body.HostConfig.Binds,original.HostConfig.Binds);
  assert.deepEqual(plan.body.HostConfig.PortBindings,{"5432/tcp":[{HostIp:"127.0.0.1",HostPort:"55422"}]});
  assert.equal(plan.body.HostConfig.RestartPolicy.Name,"no");assert.equal(plan.body.HostConfig.AutoRemove,false);
  assert.equal(plan.body.Image,original.Image);assert.deepEqual(plan.body.Config,undefined);
  assert.equal(plan.body.Labels["com.supabase.cli.project"],undefined);
  assert.ok(plan.body.NetworkingConfig.EndpointsConfig["inverge-owner-economics-loopback"].Aliases.includes("supabase_db_owner-economics"));
});
test("unrelated, running, privileged, auto-removing or port-drift sources fail closed",()=>{
  for(const mutate of [s=>{s.Name="/unrelated"},s=>{s.State.Running=true},s=>{s.Config.Labels={}},
    s=>{s.Image="unversioned:latest"},s=>{s.HostConfig.Privileged=true},s=>{s.HostConfig.AutoRemove=true},
    s=>{s.HostConfig.PortBindings["5432/tcp"][0].HostPort="5432"},s=>{s.HostConfig.PortBindings["9999/tcp"]=[]},
    s=>{s.NetworkSettings.Networks={}}]){const value=source();mutate(value);assert.throws(()=>planLoopbackContainer("db",value));}
});
