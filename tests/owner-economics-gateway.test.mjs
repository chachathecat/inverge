import assert from "node:assert/strict";
import test from "node:test";
import https from "node:https";
import { generateServerLeaf,validateServerLeaf,packGatewayFiles,unpackGatewayFile } from "../scripts/local/owner-economics-gateway.mjs";

test("new server leaf is CA:false, serverAuth-only, address/time bound and key-matched",()=>{
  const leaf=generateServerLeaf(),other=generateServerLeaf();
  try{assert.equal(validateServerLeaf(leaf.cert,leaf.key).ca,false);
    assert.throws(()=>validateServerLeaf(leaf.cert,other.key));
    assert.throws(()=>validateServerLeaf(leaf.cert,leaf.key,Date.now()+31*86400000));
    assert.throws(()=>validateServerLeaf(leaf.cert,leaf.key,Date.now()-86400000));
  }finally{leaf.key.fill(0);other.key.fill(0);}
});
test("closed in-memory archives preserve only exact paths and minimum ownership",()=>{
  const bytes=Buffer.from("synthetic-not-a-key"),archive=packGatewayFiles([{name:"localhost.key",bytes}]);
  assert.deepEqual(unpackGatewayFile(archive,"localhost.key"),bytes);
  assert.equal(parseInt(archive.subarray(100,108).toString(),8),0o600);
  assert.equal(parseInt(archive.subarray(108,116).toString(),8),100);
  assert.throws(()=>packGatewayFiles([{name:"../other.key",bytes}]));
  assert.throws(()=>unpackGatewayFile(archive,"other.key"));
  const symlink=Buffer.from(archive);symlink[156]=50;assert.throws(()=>unpackGatewayFile(symlink,"localhost.key"));
});
test("real TLS handshake uses connection-scoped public trust and rejects wrong certificate/name",async()=>{
  const leaf=generateServerLeaf(),wrong=generateServerLeaf();
  const server=https.createServer({key:leaf.key,cert:leaf.cert},(_req,res)=>res.end("synthetic-ok"));
  server.on("tlsClientError",()=>{});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const request=(ca,servername="localhost")=>new Promise((resolve,reject)=>{
    const req=https.get({host:"127.0.0.1",port:server.address().port,ca,servername,rejectUnauthorized:true,agent:false},res=>{res.resume();res.on("end",()=>resolve(res.statusCode));});
    req.on("error",reject);req.setTimeout(3000,()=>req.destroy(new Error("timeout")));
  });
  try{assert.equal(await request(leaf.cert),200);
    await assert.rejects(request(wrong.cert));
    await assert.rejects(request(leaf.cert,"wrong.invalid"),{code:"ERR_TLS_CERT_ALTNAME_INVALID"});
    await assert.rejects(request(undefined));
  }finally{await new Promise(resolve=>server.close(resolve));leaf.key.fill(0);wrong.key.fill(0);}
});
