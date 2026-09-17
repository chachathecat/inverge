import {chromium} from "playwright";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
assert.equal(process.platform,"win32","existing isolated PC environment required");
assert.equal(process.env.VERCEL,undefined);
const base="http://127.0.0.1:3884";
const sourceType=process.argv[2]??"photo";
assert.ok(["photo","pdf"].includes(sourceType));
const artifacts=path.resolve(process.env.INVERGE_CAPTURE_EVIDENCE_DIR??".agent-factory/evidence/capture-input");
await mkdir(artifacts,{recursive:true});
const runtime=JSON.parse(await readFile(path.join(process.env.LOCALAPPDATA,"Inverge/theory-development-20260916/runtime.json"),"utf8"));
assert.equal(runtime.userId,"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const problem=sourceType==="pdf"?"Original source-confirmation regression: Explain how ordinary market exposure differs from the seller urgent financial need when interpreting market value.":"독자 합성 원문 확인 회귀: 통상적인 시장 노출 기간과 개별 매도인의 급박한 매각 사정을 구분하여 시장가치 판단의 조건을 설명하시오.";
const answer=sourceType==="pdf"?"Market value assumes ordinary exposure and typical transaction participants. A seller urgent need is an individual circumstance and must be distinguished from general market conditions. This is an original synthetic answer for input preservation.":"시장가치는 통상적인 시장 노출과 거래 당사자를 전제로 한다. 개별 매도인의 급박한 매각 사정은 시장 일반의 조건과 구분하여 판단한다. 이는 입력 보존을 위한 독자 합성 답안이다.";
const combined="[Page 1]\n"+problem+"\n\n[Page 2]\n"+answer;
function databaseRead(sql){return execFileSync("C:/Program Files/Docker/Docker/resources/bin/docker.exe",["exec","-i","inverge_theory_development_db","psql","-U","postgres","-d","postgres","-X","-q","-At","-v","ON_ERROR_STOP=1"],{input:"begin read only;"+sql+";commit;",encoding:"utf8",windowsHide:true}).trim();}
// Compare all existing learning records in this isolated DB, including disabled accounts.
const learningCounts=()=>JSON.parse(databaseRead("select json_build_object("+["wrong_answer_notes","review_queue_items","learning_signal_events","study_logs"].map(table=>"'"+table+"',(select json_build_object('count',count(*),'digest',md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb)::text)) from public."+table+" r)").join(",")+")"));
const beforeCounts=learningCounts();
function syntheticTwoPagePdf(){
 const wrap=text=>text.match(/.{1,65}(?: |$)/g).map(line=>line.trim());
 const streams=[problem,answer].map((text,index)=>"BT /F1 12 Tf 50 790 Td (Synthetic page "+(index+1)+") Tj "+wrap(text).map(line=>"0 -20 Td ("+line+") Tj").join(" ")+" ET");
 const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",...streams.map(stream=>"<< /Length "+Buffer.byteLength(stream)+" >>\nstream\n"+stream+"\nendstream")];
 let doc="%PDF-1.4\n",offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(doc));doc+=(i+1)+" 0 obj\n"+objects[i]+"\nendobj\n";}const xref=Buffer.byteLength(doc);doc+="xref\n0 8\n0000000000 65535 f \n"+offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";return Buffer.from(doc);
}
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route("**/*",route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
const page=await context.newPage();page.setDefaultTimeout(30000);
const requests=[],errors=[];let phase="login";
page.on("request",request=>{if(request.method()!=="GET")requests.push({method:request.method(),path:new URL(request.url()).pathname});});
page.on("pageerror",e=>errors.push(e.message));
try {
 await page.goto(base+"/login?returnTo=%2Fapp%3Fmode%3Dsecond",{timeout:60000});
 await page.locator('input[type="email"]').fill(runtime.email);
 await page.locator('input[type="password"]').fill(runtime.password);
 await page.locator('button[type="submit"]').click();
 await page.waitForURL(url=>url.pathname.startsWith("/app"),{timeout:60000});
 phase="normal_menu";
 await page.locator('a[href^="/app/capture"]:visible').first().click();
 await page.locator('[data-owner-analysis-subject] select').selectOption("감정평가이론");
 phase=sourceType+"_import";
 if(sourceType==="photo") {
 const tinyPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jHckAAAAASUVORK5CYII=","base64");
 await page.locator('input[type="file"][multiple]:not([capture])').setInputFiles([{name:"synthetic-page-1.png",mimeType:"image/png",buffer:tinyPng},{name:"synthetic-page-2.png",mimeType:"image/png",buffer:tinyPng}]);
 await page.getByText("인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 직접 붙여넣거나 다시 찍기로 계속할 수 있습니다.",{exact:true}).waitFor();
 await page.getByPlaceholder("OCR 결과를 확인하고 바로 수정하세요.",{exact:true}).fill(combined);
 } else {
 await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles({name:"synthetic-two-page.pdf",mimeType:"application/pdf",buffer:syntheticTwoPagePdf()});
 await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(combined);
 }
 assert.equal(await page.locator("[data-owner-analysis-subject] select").inputValue(),"감정평가이론");
 await page.getByRole("button",{name:"이미 쓴 답안 AI 검토",exact:true}).click();
 phase="source_editor_confirmation";
 const confirmationLabel="원본과 대조해 문제·답안 구분과 숫자·용어를 확인했습니다";
 const returnToPreparation=async()=>page.getByRole("button",{name:"이미 쓴 답안 AI 검토",exact:true}).click();
 await page.getByRole("checkbox",{name:confirmationLabel}).check();
 await page.getByRole("button",{name:"원문 입력으로 돌아가기",exact:true}).click();
 await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(combined+" 원문 대조 수정");
 await returnToPreparation();
 assert.equal(await page.getByRole("checkbox",{name:confirmationLabel}).isChecked(),false);

 await page.getByRole("button",{name:"원문 입력으로 돌아가기",exact:true}).click();
 await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(combined);
 await returnToPreparation();
 if(sourceType==="photo") {
   await page.getByRole("checkbox",{name:confirmationLabel}).check();
   await page.getByRole("button",{name:"원문 입력으로 돌아가기",exact:true}).click();
   await page.getByRole("button",{name:"1페이지 · synthetic-page-1.png 아래로 이동",exact:true}).click();
   await returnToPreparation();
   assert.equal(await page.getByRole("checkbox",{name:confirmationLabel}).isChecked(),false);
   await page.getByRole("button",{name:"원문 입력으로 돌아가기",exact:true}).click();
   await page.getByRole("button",{name:"2페이지 · synthetic-page-1.png 위로 이동",exact:true}).click();
   await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(combined);
   await returnToPreparation();
 }
 await page.reload();
 assert.equal(await page.getByRole("checkbox",{name:confirmationLabel}).isChecked(),false);
 phase="separate_and_confirm";
 const question=page.getByLabel("분석할 문제",{exact:true});
 await question.evaluate((element,start)=>{element.focus();element.setSelectionRange(start,element.value.length);element.dispatchEvent(new Event("select",{bubbles:true}));element.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));document.dispatchEvent(new Event("selectionchange"));},combined.indexOf("[Page 2]"));
 await page.getByRole("button",{name:"선택한 내용을 답안으로 옮기기",exact:true}).click();
 assert.equal(await question.inputValue(),"[Page 1]\n"+problem+"\n\n");
 assert.equal(await page.getByLabel("분석할 답안",{exact:true}).inputValue(),"[Page 2]\n"+answer);
 const confirm=page.getByRole("checkbox",{name:"원본과 대조해 문제·답안 구분과 숫자·용어를 확인했습니다"});
 assert.equal(await page.locator('[data-owner-prepare-analysis]').isEnabled(),false);
 await confirm.check();
 await page.getByRole("button",{name:"답안 작성으로 돌아가기",exact:true}).click();
 await page.locator('[data-s232e-second-write-panel="3"] textarea').fill("[Page 2]\n"+answer+" 이전 편집 화면 수정");
 await returnToPreparation();
 assert.equal(await confirm.isChecked(),false);
 await page.reload();
 assert.equal(await confirm.isChecked(),false);
 await confirm.check();
 await page.getByLabel("분석할 답안",{exact:true}).fill("[Page 2]\n"+answer+" 직접 수정한 결론을 보존한다.");
 assert.equal(await confirm.isChecked(),false);
 await confirm.check();
 await page.reload();
 assert.equal(await page.getByRole("checkbox",{name:"원본과 대조해 문제·답안 구분과 숫자·용어를 확인했습니다"}).isChecked(),true);
 await page.screenshot({path:artifacts+"/post951-capture-"+sourceType+"-confirmed.png",fullPage:true});
 phase="save";
 const savedResponsePromise=page.waitForResponse(response=>response.request().method()==="POST"&&new URL(response.url()).pathname==="/api/os/items");
 await page.locator('[data-owner-prepare-analysis]').click();
 const savedResponse=await savedResponsePromise;
 assert.equal(savedResponse.status(),200,"source-only API must confirm a durable save");
 await page.waitForURL("**/app/capture/repair?itemId=*",{timeout:45000});
 const itemId=new URL(page.url()).searchParams.get("itemId");
 const response=await context.request.get(base+"/api/os/items/"+itemId);
 assert.equal(response.status(),200);const detail=(await response.json()).detail;
 assert.equal(detail.item.rawPayload.raw_ocr_text,combined);
 assert.equal(detail.item.rawQuestionText,"[Page 1]\n"+problem+"\n\n");
 assert.equal(detail.item.userAnswer,"[Page 2]\n"+answer+" 직접 수정한 결론을 보존한다.");
 assert.equal(detail.item.rawPayload.user_confirmed_fields.ocrConfirmedByLearner,true);
 assert.equal(detail.item.rawPayload.user_confirmed_fields.pageCount,sourceType==="pdf"?0:2);
 phase="reconnect";const savedUrl=page.url();await page.goto("about:blank");await page.goto(savedUrl);await page.reload();
 const readback=await context.request.get(base+"/api/os/items/"+itemId);assert.equal(readback.status(),200);
 assert.deepEqual((await readback.json()).detail.item,detail.item);
 assert.equal(requests.some(r=>r.path==="/api/answer-review/structure"),false);
 assert.deepEqual(errors,[]);
 assert.deepEqual(learningCounts(),beforeCounts);
 assert.match(itemId,/^[a-f0-9-]{36}$/);
 const sqlReadback=JSON.parse(databaseRead("select json_build_object('id',id,'sourceHash',md5(raw_payload->>'raw_ocr_text'),'diagnosis',raw_payload->'user_confirmed_fields'->'capture_review_provenance'->>'diagnosis') from public.wrong_answer_items where id='"+itemId+"' and user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'"));
 assert.equal(sqlReadback.sourceHash,createHash("md5").update(combined).digest("hex"));
 assert.equal(sqlReadback.diagnosis,"not_analyzed");
 const evidence={at:new Date().toISOString(),base,environment:"actual Next.js; real Auth/API/PostgREST/Postgres",normalMenu:true,source:sourceType==="pdf"?"two-page original synthetic PDF; manual corrected text":"two synthetic image files; provider-disabled manual transcription",sqlReadback,learningCountsUnchanged:true,actualOcr:false,actualModel:false,itemId,rawOcrSha256:createHash("sha256").update(combined).digest("hex"),sourcePreserved:true,questionAnswerSeparated:true,confirmationInvalidatedOnEdit:true,legacyAnswerEditorInvalidates:true,sourceEditorInvalidates:true,pageReorderInvalidates:sourceType==="photo",unconfirmedReloadPreserved:true,refreshPreserved:true,authenticatedRequery:true,requests,errors};
 await writeFile(artifacts+"/post951-capture-"+sourceType+"-browser-evidence.json",JSON.stringify(evidence,null,2)+"\n");
 console.log(JSON.stringify({ok:true,itemId,actualOcr:false,actualModel:false,sourcePreserved:true,reconnected:true}));
} catch(error) {
 console.log(JSON.stringify({ok:false,phase,message:String(error.message).slice(0,600),url:page.url(),links:await page.locator('a[href^="/app/"]:visible').evaluateAll(nodes=>nodes.slice(0,12).map(n=>({text:n.textContent?.slice(0,50),href:n.getAttribute('href')}))).catch(()=>[])}));
 process.exitCode=1;
} finally {await browser.close();}
