/** One PC-local gateway placement. No existing key reads, host key files or image commits. */
import { spawnSync } from "node:child_process";
import { createPrivateKey, X509Certificate } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { localDockerRequest as api, runLocalLoopback } from "./owner-economics-loopback.mjs";

const SOURCE="7f1ddb9f2bd2e98f2b323ae0c3278c61d6e6302dfc1e90a1d5e05883c78c13fa";
const TARGET="1923d23577149191d7036de815adf43b60d9be32e3e56f8baf0744a2768fe6cd";
const CONFIGS=["custom_nginx.template","kong.yml"];
function fail(code){throw new Error(code);}
export function validateServerLeaf(certBytes,keyBytes,now=Date.now()) {
  const cert=new X509Certificate(certBytes);
  if(cert.ca||!cert.checkIP("127.0.0.1")||!cert.checkHost("localhost")||
    cert.keyUsage?.length!==1||cert.keyUsage[0]!=="1.3.6.1.5.5.7.3.1"||
    Date.parse(cert.validFrom)>now||Date.parse(cert.validTo)<=now||
    Date.parse(cert.validTo)-Date.parse(cert.validFrom)>31*86400000||
    !cert.verify(cert.publicKey)||!cert.checkPrivateKey(createPrivateKey(keyBytes)))fail("invalid_server_leaf");
  return cert;
}
export function generateServerLeaf() {
  const executable=process.platform==="win32"?"C:/Program Files/Git/usr/bin/openssl.exe":"openssl";
  const result=spawnSync(executable,["req","-new","-x509","-newkey","rsa:2048","-noenc","-batch",
    "-subj","/CN=owner-economics-local","-days","30","-addext","basicConstraints=critical,CA:FALSE",
    "-addext","keyUsage=critical,digitalSignature,keyEncipherment","-addext","extendedKeyUsage=serverAuth",
    "-addext","subjectAltName=DNS:localhost,IP:127.0.0.1","-keyout","-","-out","-"],
  {maxBuffer:65536,windowsHide:true});
  try {
    if(result.status!==0)fail("leaf_generation_failed");
    const output=result.stdout.toString();
    const cert=output.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
    const key=output.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/g);
    if(cert?.length!==1||key?.length!==1)fail("leaf_generation_failed");
    const value={cert:Buffer.from(cert[0]+"\n"),key:Buffer.from(key[0]+"\n")};
    validateServerLeaf(value.cert,value.key);return value;
  } finally {result.stdout?.fill(0);result.stderr?.fill(0);}
}
export function packGatewayFiles(files) {
  const chunks=[];
  for(const file of files){
    if(![...CONFIGS,"localhost.crt","localhost.key"].includes(file.name)||!Buffer.isBuffer(file.bytes)||file.bytes.length>131072)fail("invalid_gateway_file");
    const header=Buffer.alloc(512);
    const octal=(offset,length,value)=>header.write(value.toString(8).padStart(length-1,"0")+"\0",offset,length,"ascii");
    header.write(file.name,0,100,"ascii");octal(100,8,file.name==="localhost.crt"?0o644:0o600);
    octal(108,8,100);octal(116,8,65533);octal(124,12,file.bytes.length);octal(136,12,Math.floor(Date.now()/1000));
    header.fill(32,148,156);header[156]=48;header.write("ustar\0",257);header.write("00",263);
    octal(148,8,header.reduce((a,b)=>a+b,0));chunks.push(header,file.bytes,Buffer.alloc((512-file.bytes.length%512)%512));
  }
  return Buffer.concat([...chunks,Buffer.alloc(1024)]);
}
export function unpackGatewayFile(tar,name) {
  if(!Buffer.isBuffer(tar)||tar.length>262144)fail("invalid_gateway_archive");
  let found=null;
  for(let offset=0;offset+512<=tar.length;){const h=tar.subarray(offset,offset+512);if(h.every(b=>b===0))break;
    const text=(a,b)=>h.subarray(a,b).toString().replace(/\0.*$/s,"");
    const size=parseInt(text(124,136).trim(),8),sum=parseInt(text(148,156).trim(),8);
    if(!Number.isSafeInteger(size)||size<0||offset+512+size>tar.length||
      h.reduce((a,b,i)=>a+(i>=148&&i<156?32:b),0)!==sum||
      (h[156]!==48&&h[156]!==0)||text(0,100)!==name||text(345,500)||found)fail("invalid_gateway_archive");
    found=Buffer.from(tar.subarray(offset+512,offset+512+size));offset+=512+Math.ceil(size/512)*512;
  }
  if(!found)fail("gateway_file_missing");return found;
}
async function readFile(container,name) {
  // This allowlist makes the pre-existing source CA key inaccessible to this tool.
  if(container===SOURCE&&!CONFIGS.includes(name))fail("source_key_read_forbidden");
  const result=await api("GET",`/containers/${container}/archive?path=${encodeURIComponent(`/home/kong/${name}`)}`,undefined,true);
  if(result.status!==200)fail("gateway_file_read_failed");
  try{return unpackGatewayFile(result.body,name);}finally{result.body.fill(0);}
}
async function preflight() {
  await runLocalLoopback("plan");
  const source=(await api("GET",`/containers/${SOURCE}/json`)).body;
  const target=(await api("GET",`/containers/${TARGET}/json`)).body;
  if(source?.Id!==SOURCE||target?.Id!==TARGET||source.State.Running||target.State.Running||
    source.Name!=="/supabase_kong_owner-economics"||target.Name!=="/inverge_owner_economics_kong_loopback"||
    source.Config.Labels?.["com.supabase.cli.project"]!=="owner-economics"||
    target.Config.Labels?.["inverge.owner-local-persistent"]!=="economics-r3"||
    source.Image!==target.Image||JSON.stringify(source.Config.Env)!==JSON.stringify(target.Config.Env)||
    target.Config.User!=="kong"||target.HostConfig.Privileged||
    JSON.stringify(target.HostConfig.PortBindings)!==JSON.stringify({"8000/tcp":[{HostIp:"127.0.0.1",HostPort:"55421"}]}))fail("gateway_identity_drift");
}
export async function installGatewayFiles() {
  if(process.platform!=="win32")fail("pc_local_only");await preflight();
  // Never overwrite a prior generated key or records on a rerun.
  const existing=await api("GET",`/containers/${TARGET}/archive?path=%2Fhome%2Fkong%2Flocalhost.crt`,undefined,true);
  if(existing.status!==404)fail("gateway_already_placed_or_unavailable");
  const files=[];let leaf,archive;
  try {
    for(const name of CONFIGS)files.push({name,bytes:await readFile(SOURCE,name)});
    leaf=generateServerLeaf();files.push({name:"localhost.crt",bytes:leaf.cert},{name:"localhost.key",bytes:leaf.key});
    archive=packGatewayFiles(files);
    const put=await api("PUT",`/containers/${TARGET}/archive?path=%2Fhome%2Fkong&noOverwriteDirNonDir=true`,archive,true);
    if(put.status!==200)fail("gateway_placement_failed");
    for(const file of files){const copied=await readFile(TARGET,file.name);try{if(!copied.equals(file.bytes))fail("gateway_copy_mismatch");}finally{copied.fill(0);}}
    validateServerLeaf(leaf.cert,leaf.key);
    return {target:TARGET,paths:files.map(f=>`/home/kong/${f.name}`),placement:"pass",exactCopy:"pass",newServerLeaf:"pass",sourcePrivateKeyAccess:false};
  }finally{archive?.fill(0);for(const file of files)file.bytes.fill(0);leaf?.key.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv[2]!=="install")fail("invalid_local_command");
  installGatewayFiles().then(value=>console.log(JSON.stringify(value))).catch(()=>{console.error("gateway_placement_failed_no_secret_output");process.exitCode=1;});
}
