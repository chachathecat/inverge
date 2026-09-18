import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=process.env.INVERGE_CAPTURE_EVIDENCE_DIR;
assert.ok(dir&&path.isAbsolute(dir));assert.equal(process.platform,'win32');
const runtime=JSON.parse(await readFile(path.join(process.env.LOCALAPPDATA,'Inverge/theory-development-20260916/runtime.json'),'utf8'));
assert.equal(runtime.userId,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const base='http://127.0.0.1:3884',browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();const errors=[],mutations=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(request.method()!=='GET')mutations.push(new URL(request.url()).pathname);});
 await page.goto(base+'/login?returnTo=%2Fapp%3Fmode%3Dsecond');
 await page.locator('input[type=email]').fill(runtime.email);
 await page.locator('input[type=password]').fill(runtime.password);
 await page.locator('button[type=submit]').click();
 await page.waitForURL(url=>url.pathname.startsWith('/app'),{timeout:60000});
 for(const kind of ['pdf','photo']) {
  const evidence=JSON.parse(await readFile(path.join(dir,`local-ocr-${kind}-browser-evidence.json`),'utf8'));
  assert.match(evidence.itemId,/^[a-f0-9-]{36}$/);
  await page.goto(base+'/app/capture/repair?itemId='+evidence.itemId);
  try {await page.getByRole('heading',{name:'분석할 내용을 먼저 확인하세요',exact:true}).waitFor({timeout:45000});} catch(error) {console.log(JSON.stringify({kind,body:(await page.locator('body').innerText()).slice(0,5000),errors}));await page.screenshot({path:path.join(dir,'reopen-debug.png'),fullPage:true});throw error;}
  if(await page.locator('[data-app1-error]').count()) {console.log(JSON.stringify({kind,error:await page.locator('[data-app1-error]').innerText()}));throw Error('actual_source_ui_failed');}
  const text=await page.locator('[data-app1-preserved-source]').innerText();
  assert.match(text,/2,222/);assert.match(text,/37,033\.33/);
  await page.locator('[data-app1-functional-test]').waitFor();
  await page.screenshot({path:path.join(dir,`local-ocr-${kind}-loaded.png`),fullPage:true});
  const response=await context.request.get(base+'/api/os/items/'+evidence.itemId);assert.equal(response.status(),200);
  const item=(await response.json()).detail.item;
  assert.equal(item.rawPayload.user_confirmed_fields.pageCount,2);
  assert.equal(item.rawPayload.user_confirmed_fields.capture_review_provenance.learningMaterial,'ai_example_functional_test');
  evidence.loadedUiVerified=true;evidence.freshLogin=true;evidence.reopenReadOnlyAt=new Date().toISOString();
  await writeFile(path.join(dir,`local-ocr-${kind}-browser-evidence.json`),JSON.stringify(evidence,null,2));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,['/api/auth/sign-in']);
 console.log(JSON.stringify({loadedUiVerified:2,freshNormalLogin:true,newOcrCalls:0,saves:0,modelCalls:0,errors:0}));
} finally {await browser.close();}
