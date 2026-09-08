import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";
import * as domain from "../../lib/review-os/first-stage/kernel/domain.ts";
import { ORACLE_IMAGE, ORACLE_PLATFORM } from "../../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";

export const PG_OWNER="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", PG_OTHER="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TABLE="public.first_stage_private_sessions", PLANNING="public.first_stage_owner_local_planning";
export const literal=value=>`'${String(value).replaceAll("'","''")}'`;
function compile(file,exportName) {
  const compiled=ts.transpileModule(readFileSync(new URL(`../../lib/review-os/first-stage/runtime/${file}.ts`,import.meta.url),"utf8"),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const loaded={exports:{}};
  runInThisContext(`(function(require,module,exports){${compiled}\n})`)(name=>{
    if(name==="server-only")return {};
    assert.equal(name,"../kernel/domain");return domain;
  },loaded,loaded.exports);
  return loaded.exports[exportName];
}
const sessions=compile("session-repository","createPrivateSessionRepository");
const planning=compile("owner-local-planning-repository","createOwnerLocalPlanningRepository");

/** Real SDK/repositories/SQL. ONLY the network transport is redirected to an
 * isolated PostgreSQL 15.8 container (no network, ports, volume or personal data). */
export async function isolatedPlanningPostgres() {
  const container=`inverge-planning-synthetic-${process.pid}-${Date.now()}`;
  const docker=args=>execFileSync("docker",args,{encoding:"utf8",windowsHide:true,stdio:["ignore","pipe","pipe"]});
  let started=false,loss=null;
  const sql=(statement,role="service_role")=>new Promise((resolve,reject)=>{
    const child=spawn("docker",["exec","-i",container,"psql","-h","127.0.0.1","-U","postgres","-d","postgres","-X","-q","-At","-v","ON_ERROR_STOP=1"],{windowsHide:true});
    let output="",error="";child.stdout.on("data",value=>output+=value);child.stderr.on("data",value=>error+=value);
    child.on("error",reject);child.on("close",code=>{if(code===0)resolve(output.trim());else {const failure=new Error("synthetic-pg-rejection");failure.code=error.match(/ERROR:\s+([0-9A-Z]{5}):/u)?.[1]??"unknown";reject(failure);}});
    child.stdin.end("\\set VERBOSITY verbose\n"+(role?`begin; set local role ${role}; set local statement_timeout='15s'; ${statement}; commit;`:statement));
  });
  const lose=point=>{if(loss===point){loss=null;throw new Error("synthetic-durable-response-lost");}};
  const identifier=value=>{assert.match(value,/^[a-z_]+$/u);return `"${value}"`;};
  const transport=async(input,init={})=>{
    const url=new URL(String(input));assert.equal(url.origin,"http://127.0.0.1");
    const method=init.method??"GET";
    try {
      if(url.pathname==="/rest/v1/rpc/inverge_owner_local_reserve_original") {
        assert.equal(method,"POST");const value=JSON.parse(init.body);
        const result=await sql(`select public.inverge_owner_local_reserve_original(${literal(value.p_owner)}::uuid,${literal(value.p_session)},${literal(JSON.stringify(value.p_payload))}::jsonb)::text`);
        lose("rpc");return Response.json(result?JSON.parse(result):null);
      }
      const table=url.pathname==="/rest/v1/first_stage_private_sessions"?TABLE:PLANNING;
      assert.ok(["/rest/v1/first_stage_private_sessions","/rest/v1/first_stage_owner_local_planning"].includes(url.pathname));
      const name=table===TABLE?"session":"planning";
      const filters=[...url.searchParams].filter(([key])=>!["select","order","offset","limit"].includes(key));
      const where=filters.length?" where "+filters.map(([key,value])=>{
        assert.ok(["owner_id","session_id","revision","payload->>schemaVersion"].includes(key));assert.ok(value.startsWith("eq."));
        return `${key==="payload->>schemaVersion"?"payload->>'schemaVersion'":identifier(key)}=${literal(value.slice(3))}`;
      }).join(" and "):"";
      const columns=(url.searchParams.get("select")??"*").split(",").map(value=>value==="*"?"*":identifier(value)).join(",");
      let result,count;
      if(method==="GET") {
        const offset=Number(url.searchParams.get("offset")??0),limit=Number(url.searchParams.get("limit")??10000);
        assert.ok(Number.isInteger(offset)&&offset>=0&&Number.isInteger(limit)&&limit>=0&&limit<=10000);
        if(url.searchParams.has("order"))assert.equal(url.searchParams.get("order"),"session_id.asc");
        // One statement snapshot, including exact count, like PostgREST.
        const data=JSON.parse(await sql(`with filtered as materialized(select ${columns} from ${table}${where}), page as(select * from filtered ${url.searchParams.has("order")?"order by session_id":""} offset ${offset} limit ${limit}) select jsonb_build_object('count',(select count(*) from filtered),'rows',(select coalesce(jsonb_agg(to_jsonb(page)),'[]') from page))::text`));
        result=data.rows;count=data.count;
      } else {
        const value=JSON.parse(init.body),names=Object.keys(value).map(identifier).join(","),json=`${literal(JSON.stringify(value))}::jsonb`;
        if(method==="POST") {
          await sql(`insert into ${table} (${names}) select ${names} from jsonb_populate_record(null::${table},${json})`);
          lose(`${name}:POST`);return new Response(null,{status:201});
        }
        assert.equal(method,"PATCH");
        result=JSON.parse(await sql(`with changed as(update ${table} set (${names})=(select ${names} from jsonb_populate_record(null::${table},${json}))${where} returning ${columns}) select coalesce(jsonb_agg(to_jsonb(changed)),'[]') from changed`));
        lose(`${name}:PATCH`);
      }
      const headers=new Headers(init.headers),single=headers.get("accept")?.includes("vnd.pgrst.object");
      return Response.json(single?result[0]??null:result,{headers:count===undefined?{}:{"content-range":result.length?`0-${result.length-1}/${count}`:`*/${count}`}});
    } catch(error) {if(error.code)return Response.json({code:error.code,message:"synthetic-db-rejection"},{status:409});throw error;}
  };
  const sdk=()=>createClient("http://127.0.0.1","synthetic-only-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}});
  const design=readFileSync(new URL("../../supabase/local-designs/first-stage-owner-local-planning.sql",import.meta.url),"utf8");
  const apply=()=>sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+design,null);
  const close=()=>{if(started){docker(["rm","--force",container]);started=false;}};
  try {
    docker(["image","inspect",ORACLE_IMAGE]);
    docker(["run","--detach","--pull=never","--name",container,"--platform",ORACLE_PLATFORM,"--network","none","--tmpfs","/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=536870912","--env","POSTGRES_HOST_AUTH_METHOD=trust",ORACLE_IMAGE]);started=true;
    let ready=false;
    for(let n=0;n<80;n++){if(spawnSync("docker",["exec",container,"pg_isready","-h","127.0.0.1","-U","postgres"],{windowsHide:true,stdio:"ignore"}).status===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,250));}
    assert.ok(ready);const actual=JSON.parse(docker(["inspect",container]))[0];
    assert.equal(actual.HostConfig.NetworkMode,"none");assert.deepEqual(actual.NetworkSettings.Ports,{});
    await sql(`create schema auth; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create table auth.users(id uuid primary key); grant usage on schema public to anon,authenticated,service_role; insert into auth.users values(${literal(PG_OWNER)}),(${literal(PG_OTHER)});`,null);
    await sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local';\n"+readFileSync(new URL("../../supabase/local-designs/first-stage-owner-local-sessions.sql",import.meta.url),"utf8"),null);
    await assert.rejects(sql(design,null),{code:"P0001"});
    await assert.rejects(sql("set inverge.local_first_stage_personal_use='owner_approved_persistent_local'; set inverge.local_first_stage_design='synthetic_only';\n"+design,null),{code:"P0001"});
    await apply();
    return {sql,apply,close,repository:()=>sessions(sdk()),planningRepository:()=>planning(sdk()),loseNext:point=>{loss=point;},
      snapshot:()=>sql(`select coalesce(jsonb_agg(to_jsonb(r) order by owner_id,session_id),'[]')::text from ${TABLE} r`),
      cleanup:async()=>{await sql(`delete from auth.users where id in (${literal(PG_OWNER)},${literal(PG_OTHER)})`,null);
        for(const table of [TABLE,PLANNING,"auth.users"])assert.equal(await sql(`select count(*) from ${table}`,null),"0");}};
  } catch(error){close();throw error;}
}
