/** External provider test double only; all Next.js authentication/routes/SQL remain real. */
import {readFileSync} from "node:fs";
const fixture=JSON.parse(readFileSync(new URL("../../tests/fixtures/law-development-cases.json",import.meta.url),"utf8"));
if(process.env.INVERGE_LAW_CONTROLLED_PROVIDER!=="true" || process.env.NEXT_PUBLIC_SUPABASE_URL!=="http://127.0.0.1:55431" || process.env.GEMINI_API_KEY!=="synthetic-law-no-live-key" || process.env.VERCEL!==undefined || process.env.CI==="true") throw Error("controlled_law_local_isolation_required");
const originalFetch=globalThis.fetch;
let requests=0;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==="string"||input instanceof URL?String(input):input.url);
 if(url.hostname!=="generativelanguage.googleapis.com") return originalFetch(input,init);
 if(url.pathname!=="/v1beta/models/gemini-2.5-flash:generateContent" || ++requests>12) throw Error("controlled_law_request_rejected");
 const request=JSON.parse(typeof init?.body==="string"?init.body:await input.clone().text());
 const text=request.contents?.flatMap(c=>c.parts??[]).map(p=>p.text??"").join("\n")??"";
 const question=text.split("questionText:\n")[1]?.split("\n\nanswerText:")[0]?.trim();
 const answer=text.split("answerText:\n")[1]?.split("\n\nreferenceText:")[0]?.trim();
 if(question!==fixture.question) throw Error("controlled_law_fixture_required");
 const key=["weak","corrected","insufficient"].find(k=>fixture[k]===answer);
 if(!key) throw Error("controlled_law_answer_required");
 console.log(JSON.stringify({controlledLawProvider:true,actualModel:false,fixture:key,requestNumber:requests}));
 return new Response(JSON.stringify({candidates:[{content:{role:"model",parts:[{text:JSON.stringify(fixture.responses[key])}]},finishReason:"STOP"}],modelVersion:"controlled-law-response"}),{status:200,headers:{"content-type":"application/json"}});
};
