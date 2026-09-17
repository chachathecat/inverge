/** Isolated actual Next.js + GoTrue + PostgREST. Never reads or copies personal DB rows. */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";import http from "node:http";
import {randomBytes,createHmac,createHash} from "node:crypto";
import {spawn,execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {localDockerRequest as api} from "./owner-economics-loopback.mjs";
import {ORACLE_IMAGE} from "../automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";
import {authorizeAdditionalTheoryDevelopmentCall,readTheoryDevelopmentCallLimit,authorizeTheoryDevelopment,readTheoryDevelopmentApproval,readTheoryBudget,validateTheorySettings} from "../../lib/owner-study/owner-pc-theory-budget.mjs";
const root=path.resolve(fileURLToPath(new URL("../../",import.meta.url)));
const privateRoot=path.join(process.env.LOCALAPPDATA??"","Inverge","theory-development-20260916");
const runtimeFile=path.join(privateRoot,"runtime.json");
const network="inverge-theory-development-20260916";
const names={db:"inverge_theory_development_db",auth:"inverge_theory_development_auth",rest:"inverge_theory_development_rest"};
const userId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const email="owner@localhost.test";
function fail(code){throw Error(code);}
const inspect=async name=>api("GET",`/containers/${name}/json`);
const jwt=(secret,role)=>{const parts=[{alg:"HS256",typ:"JWT"},{iss:"supabase-demo",role,exp:Math.floor(Date.now()/1000)+86400*365}].map(x=>Buffer.from(JSON.stringify(x)).toString("base64url"));return [...parts,createHmac("sha256",secret).update(parts.join(".")).digest("base64url")].join(".");};
function sql(text){return execFileSync("docker",["exec","-i",names.db,"psql","-U","postgres","-d","postgres","-X","-q","-At","-v","ON_ERROR_STOP=1"],{input:text,encoding:"utf8",windowsHide:true,stdio:["pipe","pipe","pipe"]}).trim();}
async function config(){return JSON.parse(await readFile(runtimeFile,"utf8"));}
async function startContainer(role,body){let row=await inspect(names[role]);if(row.status===404){const created=await api("POST",`/containers/create?name=${names[role]}`,{...body,Labels:{"inverge.isolated-theory":"20260916"}});if(created.status!==201)fail(`create_${role}_${created.status}`);row=await inspect(names[role]);}if(row.status!==200||row.body.Config.Labels?.["inverge.isolated-theory"]!=="20260916")fail("isolated_identity_mismatch");if(!row.body.State.Running){const started=await api("POST",`/containers/${names[role]}/start`);if(![204,304].includes(started.status))fail(`start_${role}`);}return row.body;}
async function waitFor(fn){for(let i=0;i<60;i++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}fail("isolated_dependency_timeout");}
async function prepare(){
 if(process.platform!=="win32"||process.env.VERCEL!==undefined)fail("pc_local_only");
 await mkdir(privateRoot,{recursive:true});let c;try{c=await config();}catch(e){if(e.code!=="ENOENT")throw e;const secret=randomBytes(40).toString("base64url");c={version:"20260916",userId,email,password:randomBytes(24).toString("base64url"),jwtSecret:secret,anon:jwt(secret,"anon"),service:jwt(secret,"service_role"),signingSecret:randomBytes(32).toString("base64url")};await writeFile(runtimeFile,JSON.stringify(c),{flag:"wx",mode:0o600});}
 if(c.userId!==userId||c.version!=="20260916")fail("isolated_config_mismatch");
 const net=await api("GET",`/networks/${network}`);if(net.status===404){const made=await api("POST","/networks/create",{Name:network,CheckDuplicate:true,Labels:{"inverge.isolated-theory":"20260916"}});if(made.status!==201)fail("isolated_network_failed");}
 const authImage=(await inspect("inverge_owner_economics_auth_loopback")).body.Image;
 const restImage=(await inspect("inverge_owner_economics_rest_loopback")).body.Image;
 const host={NetworkMode:network,RestartPolicy:{Name:"no"}};
 await startContainer("db",{Image:ORACLE_IMAGE,Env:["POSTGRES_HOST_AUTH_METHOD=trust"],HostConfig:{...host,Mounts:[{Type:"volume",Source:"inverge_theory_development_20260916",Target:"/var/lib/postgresql/data"}]}});
 await waitFor(()=>sql("select 1")==="1");
 sql(`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role authenticator login noinherit;grant anon,authenticated,service_role to authenticator;create role supabase_auth_admin login createrole;end if;end $$;create schema if not exists auth authorization supabase_auth_admin;grant all on schema auth to supabase_auth_admin;alter role supabase_auth_admin set search_path=auth,public;grant usage on schema public to supabase_auth_admin;do $$ begin if to_regprocedure('auth.uid()') is not null then alter function auth.uid() owner to supabase_auth_admin;end if;end $$;grant usage on schema public,auth to anon,authenticated,service_role;`);
 await startContainer("auth",{Image:authImage,Env:["GOTRUE_API_HOST=0.0.0.0","GOTRUE_API_PORT=9999","GOTRUE_DB_DRIVER=postgres",`GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin@${names.db}:5432/postgres?sslmode=disable`,"GOTRUE_SITE_URL=http://127.0.0.1:3884","API_EXTERNAL_URL=http://127.0.0.1:55431","GOTRUE_JWT_AUD=authenticated","GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated","GOTRUE_JWT_ADMIN_ROLES=service_role",`GOTRUE_JWT_SECRET=${c.jwtSecret}`,"GOTRUE_JWT_EXP=3600","GOTRUE_DISABLE_SIGNUP=true","GOTRUE_EXTERNAL_EMAIL_ENABLED=true","GOTRUE_MAILER_AUTOCONFIRM=true"],HostConfig:{...host,PortBindings:{"9999/tcp":[{HostIp:"127.0.0.1",HostPort:"55433"}]}}});
 await waitFor(async()=> (await fetch("http://127.0.0.1:55433/health")).ok);
 const headers={Authorization:`Bearer ${c.service}`,"Content-Type":"application/json"};
 const existing=await fetch(`http://127.0.0.1:55433/admin/users/${userId}`,{headers});
 if(existing.status===404){const result=await fetch("http://127.0.0.1:55433/admin/users",{method:"POST",headers,body:JSON.stringify({id:userId,email,password:c.password,email_confirm:true})});if(!result.ok)fail(`isolated_account_${result.status}`);}else if(!existing.ok)fail("isolated_account_read_failed");
 sql("create or replace function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;");
 const schema=await readFile(path.join(root,"supabase/local-designs/owner-pc-theory-one-case.sql"),"utf8");sql("set inverge.local_owner_theory='owner_approved_one_case_20260915';\n"+schema);
 sql(`insert into public.profiles(user_id,email,invite_status,entitlement_tier) values ('${userId}','${email}','active','core') on conflict(user_id) do update set invite_status='active',entitlement_tier='core';`);
 await startContainer("rest",{Image:restImage,Env:[`PGRST_DB_URI=postgres://authenticator@${names.db}:5432/postgres`,"PGRST_DB_SCHEMAS=public","PGRST_DB_ANON_ROLE=anon",`PGRST_JWT_SECRET=${c.jwtSecret}`],HostConfig:{...host,PortBindings:{"3000/tcp":[{HostIp:"127.0.0.1",HostPort:"55432"}]}}});
 await waitFor(async()=> (await fetch("http://127.0.0.1:55432/")).ok);
 console.log(JSON.stringify({prepared:true,isolatedUserId:userId,containers:Object.values(names),privateRoot,personalDatabaseAccess:false}));
}
// Explicit Owner-approved one-time development binding. Never creates a new budget or key.
async function authorizeDevelopment(){
 if(process.platform!=="win32"||process.env.VERCEL!==undefined)fail("pc_local_only");
 const c=await config();if(c.userId!==userId)fail("isolated_config_mismatch");
 const providerRoot=path.join(process.env.LOCALAPPDATA,"Inverge","owner-economics","theory-one-case-20260915");
 const settings=validateTheorySettings(JSON.parse(await readFile(path.join(providerRoot,"provider.json"),"utf8")));
 const budgetRoot=path.join(providerRoot,"budget");
 const fixture=JSON.parse(await readFile(path.join(root,"tests/fixtures/theory-development-cases.json"),"utf8"));
 const expected={userId,questionSha256:createHash("sha256").update(fixture.question.trim()).digest("hex"),supabaseUrl:"http://127.0.0.1:55431"};
 let approval;
 try {approval=await readTheoryDevelopmentApproval(budgetRoot,settings);}
 catch(error){if(error.code!=="ENOENT")throw error;await authorizeTheoryDevelopment(budgetRoot,settings,expected);approval=await readTheoryDevelopmentApproval(budgetRoot,settings);}
 if(Object.entries(expected).some(([name,value])=>approval[name]!==value))fail("isolated_approval_mismatch");
 const budget=await readTheoryBudget(budgetRoot,settings);
 console.log(JSON.stringify({approvalId:approval.approvalId,projectId:settings.projectId,model:settings.model,...budget}));
}
async function authorizeAdditionalCall(){
 if(process.platform!=="win32"||process.env.VERCEL!==undefined)fail("pc_local_only");
 const c=await config();if(c.userId!==userId)fail("isolated_config_mismatch");
 const providerRoot=path.join(process.env.LOCALAPPDATA,"Inverge","owner-economics","theory-one-case-20260915");
 const settings=validateTheorySettings(JSON.parse(await readFile(path.join(providerRoot,"provider.json"),"utf8")));
 const budgetRoot=path.join(providerRoot,"budget");
 const approval=await readTheoryDevelopmentApproval(budgetRoot,settings);
 const fixture=JSON.parse(await readFile(path.join(root,"tests/fixtures/theory-development-cases.json"),"utf8"));
 if(approval.userId!==userId||approval.supabaseUrl!=="http://127.0.0.1:55431"||approval.questionSha256!==createHash("sha256").update(fixture.question.trim()).digest("hex"))fail("isolated_approval_mismatch");
 if(await readTheoryDevelopmentCallLimit(budgetRoot,settings)===6)await authorizeAdditionalTheoryDevelopmentCall(budgetRoot,settings);
 const budget=await readTheoryBudget(budgetRoot,settings);
 console.log(JSON.stringify({maximumDevelopmentCalls:await readTheoryDevelopmentCallLimit(budgetRoot,settings),developmentUsedCalls:budget.developmentUsedCalls,reservedMicros:budget.reservedMicros,remainingMicros:budget.remainingMicros}));
}
async function serve(production=false, controlledPractice=false, paidPractice=false){
 const c=await config();if(c.userId!==userId)fail("isolated_config_mismatch");
 for(const role of Object.keys(names)){const row=await inspect(names[role]);if(!row.body?.State?.Running||row.body.Config.Labels?.["inverge.isolated-theory"]!=="20260916")fail("isolated_stack_not_ready");}
 const gateway=http.createServer((req,res)=>{const match=req.url.startsWith("/auth/v1/")?{prefix:"/auth/v1",port:55433}:req.url.startsWith("/rest/v1/")?{prefix:"/rest/v1",port:55432}:null;if(!match){res.writeHead(404).end();return;}const upstream=http.request({hostname:"127.0.0.1",port:match.port,path:req.url.slice(match.prefix.length),method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.on("error",()=>res.writeHead(502).end());req.pipe(upstream);});
 await new Promise((resolve,reject)=>{gateway.once("error",reject);gateway.listen(55431,"127.0.0.1",resolve);});
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>/^(path|pathext|systemroot|windir|comspec|userprofile|localappdata|appdata|temp|tmp|programfiles|programfiles\(x86\)|programw6432|number_of_processors|processor_architecture|lang|term)$/i.test(name)));
 Object.assign(env,{NODE_ENV:production?"production":"development",NEXT_TELEMETRY_DISABLED:"1",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55431",NEXT_PUBLIC_SUPABASE_ANON_KEY:c.anon,SUPABASE_SERVICE_ROLE_KEY:c.service,DEV_SMOKE_AUTH:"false",ALPHA_ADMIN_EMAILS:email,INVERGE_OWNER_PC_THEORY_ENABLED:"true",INVERGE_OWNER_PC_THEORY_DEVELOPMENT_ENABLED:"true",WCV_C2R_C_T_THEORY_ENABLED:"true",WCV_C2R_C_T_OWNER_EMAILS:email,APP1_VERIFICATION_SIGNING_SECRET:c.signingSecret});
 if(paidPractice) Object.assign(env,{INVERGE_OWNER_PC_PRACTICE_DEVELOPMENT_ENABLED:"true",WCV_C2R_C_T_THEORY_ENABLED:"false",WCV_C2R_C_P_PRACTICE_ENABLED:"true",WCV_C2R_C_P_OWNER_EMAILS:email});
 if(controlledPractice) Object.assign(env,{INVERGE_OWNER_PC_THEORY_ENABLED:"false",INVERGE_OWNER_PC_THEORY_DEVELOPMENT_ENABLED:"false",WCV_C2R_C_T_THEORY_ENABLED:"false",WCV_C2R_C_P_PRACTICE_ENABLED:"true",WCV_C2R_C_P_OWNER_EMAILS:email,GEMINI_API_KEY:"synthetic-practice-no-live-key",GEMINI_MODEL:"gemini-2.5-flash",INVERGE_PRACTICE_CONTROLLED_PROVIDER:"true",NODE_OPTIONS:`--import=${new URL("./practice-development-provider.mjs",import.meta.url).href}`});
 for(const file of [".env",".env.local",".env.development",".env.development.local"]){try{await readFile(path.join(root,file));fail("unexpected_env_file");}catch(e){if(e.code!=="ENOENT")throw e;}}
 if(production)try{await new Promise((resolve,reject)=>{const build=spawn(process.execPath,["node_modules/next/dist/bin/next","build"],{cwd:root,env,stdio:"inherit",windowsHide:true});build.on("error",reject);build.on("exit",code=>code===0?resolve():reject(Error("isolated_build_failed")));});}catch(error){gateway.close();throw error;}
 const child=spawn(process.execPath,["node_modules/next/dist/bin/next",production?"start":"dev","--hostname","127.0.0.1","--port","3884"],{cwd:root,env,stdio:"inherit",windowsHide:true});child.on("exit",code=>{gateway.close();process.exitCode=code??1;});
}
const command=process.argv[2];(command==="prepare"?prepare():command==="serve"?serve():command==="serve-production"?serve(true):command==="serve-practice-controlled"?serve(true,true):command==="serve-practice-paid"?serve(true,false,true):command==="authorize-development"?authorizeDevelopment():command==="authorize-additional-call"?authorizeAdditionalCall():Promise.reject(Error("invalid_isolated_command"))).catch(error=>{console.error(/^[a-z0-9_]+$/.test(error.message)?error.message:"isolated_runtime_failed_no_secret_output");process.exitCode=1;});
