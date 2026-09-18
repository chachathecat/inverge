import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {readFile,writeFile,mkdir,readdir,rename} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
const run=promisify(execFile);
if(process.platform!=="win32")throw Error("windows_ocr_build_requires_windows");
const root=process.cwd(),windows=process.env.SystemRoot??"C:\\Windows";
const framework=path.join(windows,"Microsoft.NET/Framework64/v4.0.30319");
const refs=[path.join(framework,"System.Runtime.WindowsRuntime.dll"),path.join(framework,"System.Web.Extensions.dll")];
for(const name of ["System.Runtime","System.Runtime.InteropServices.WindowsRuntime","System.Collections","System.ObjectModel","System.Threading.Tasks"]){
 const parent=path.join(windows,"Microsoft.NET/assembly/GAC_MSIL",name),versions=await readdir(parent);if(versions.length!==1)throw Error("windows_ocr_reference_ambiguous");refs.push(path.join(parent,versions[0],`${name}.dll`));
}
for(const name of ["Foundation","Media","Storage","Graphics","Globalization"])refs.push(path.join(windows,"System32/WinMetadata",`Windows.${name}.winmd`));
const source=path.join(root,"scripts/local/windows-ocr.cs"),dir=path.join(root,".agent-factory/local-ocr"),target=path.join(dir,"windows-ocr.exe"),pending=path.join(dir,"windows-ocr.pending.exe");
await mkdir(dir,{recursive:true});
try {await run(path.join(framework,"csc.exe"),["/nologo","/target:exe",`/out:${pending}`,...refs.map(p=>`/r:${p}`),source],{windowsHide:true,timeout:30000,maxBuffer:65536});}catch{throw Error("windows_ocr_build_failed");}
await rename(pending,target);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
// Optional existing CPU PDF renderer; no download or global installation.
let pdfTools;
if (process.argv[2]) {
 const renderer=path.resolve(process.argv[2]);
 if (path.basename(renderer).toLowerCase()!=="pdftoppm.exe") throw Error("pdf_renderer_invalid");
 const info=path.join(path.dirname(renderer),"pdfinfo.exe");
 const version=await run(renderer,["-v"],{windowsHide:true,timeout:10000,maxBuffer:16384});
 if (!/pdftoppm version [0-9.]+/.test(version.stderr)) throw Error("pdf_renderer_version_invalid");
 pdfTools={renderer,info,rendererSha256:hash(await readFile(renderer)),infoSha256:hash(await readFile(info)),version:version.stderr.split(/\r?\n/)[0]};
}
await writeFile(path.join(dir,"build.json"),JSON.stringify({schemaVersion:"local_ocr_build.v1",sourceSha256:hash(await readFile(source)),executableSha256:hash(await readFile(target)),pdfTools}));
console.log(JSON.stringify({built:true,engine:"windows_builtin_ko",downloads:0,policyChanges:0}));
