import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {localDockerRequest} from './owner-economics-loopback.mjs';
export const LAW_TEST_ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const LAW_TEST_EMAIL='law-synthetic-20260917@localhost.test';
const root=path.join(process.env.LOCALAPPDATA??'','Inverge','theory-development-20260916');
export const LAW_TEST_FILE=path.join(root,'law-account-20260917.json');
export async function readLawTestAccount(){const c=JSON.parse(await readFile(LAW_TEST_FILE,'utf8'));if(c.id!==LAW_TEST_ID||c.email!==LAW_TEST_EMAIL||c.authorizedControlledCalls!==2)throw Error('law_test_identity_mismatch');return c;}
async function main(){
 if(process.platform!=='win32'||process.env.VERCEL!==undefined)throw Error('local_only');
 const db=await localDockerRequest('GET','/containers/inverge_theory_development_db/json');
 if(db.status!==200||!db.body.State.Running||db.body.Config.Labels?.['inverge.isolated-theory']!=='20260916')throw Error('isolated_identity_mismatch');
 const runtime=JSON.parse(await readFile(path.join(root,'runtime.json'),'utf8'));
 if(runtime.userId!=='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')throw Error('runtime_identity_mismatch');
 const headers={Authorization:`Bearer ${runtime.service}`,'Content-Type':'application/json'};
 const sql=q=>execFileSync('docker',['exec','-i','inverge_theory_development_db','psql','-U','postgres','-d','postgres','-X','-q','-At','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
 const oldDigest=()=>createHash('sha256').update(sql("select coalesce(jsonb_agg(to_jsonb(p) order by user_id),'[]')::text from public.profiles p where user_id <> '"+LAW_TEST_ID+"';")).digest('hex');
 const before=oldDigest();
 if(process.argv[2]==='create'){
  let c;try{c=await readLawTestAccount();}catch(e){if(e.code!=='ENOENT')throw e;c={id:LAW_TEST_ID,email:LAW_TEST_EMAIL,password:randomBytes(30).toString('base64url'),authorizedControlledCalls:2,createdAt:new Date().toISOString()};await writeFile(LAW_TEST_FILE,JSON.stringify(c),{flag:'wx',mode:0o600});}
  const existing=await fetch('http://127.0.0.1:55433/admin/users/'+c.id,{headers});
  if(existing.status===404){const r=await fetch('http://127.0.0.1:55433/admin/users',{method:'POST',headers,body:JSON.stringify({id:c.id,email:c.email,password:c.password,email_confirm:true})});if(!r.ok)throw Error('create_failed_'+r.status);}
  else if(!existing.ok||(await existing.json()).email!==c.email)throw Error('existing_identity_mismatch');
  sql("insert into public.profiles(user_id,email,invite_status,entitlement_tier) values ('"+c.id+"','"+c.email+"','active','core') on conflict(user_id) do nothing;");
  const profile=sql("select email||'|'||invite_status||'|'||entitlement_tier from public.profiles where user_id='"+c.id+"';");
  if(profile!==c.email+'|active|core')throw Error('profile_mismatch');
  console.log(JSON.stringify({createdOrReused:true,userId:c.id,profile:'active/core',controlledCallsAuthorized:2,oldProfilesUnchanged:before===oldDigest(),paidProvider:false}));
 } else if(process.argv[2]==='disable'){
  const c=await readLawTestAccount();const r=await fetch('http://127.0.0.1:55433/admin/users/'+c.id,{method:'PUT',headers,body:JSON.stringify({ban_duration:'876000h'})});if(!r.ok)throw Error('disable_failed_'+r.status);const u=await r.json();if(!u.banned_until||new Date(u.banned_until)<new Date())throw Error('disable_unconfirmed');console.log(JSON.stringify({disabledUserId:c.id,bannedUntil:u.banned_until,recordsPreserved:true,oldProfilesUnchanged:before===oldDigest()}));
 } else throw Error('invalid_command');
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,'').replaceAll('/','\\'))main().catch(()=>{console.error('law_test_account_operation_failed_no_secret_output');process.exitCode=1;});
