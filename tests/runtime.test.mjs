import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as runtime from '../backend/supabase/runtime.mjs';

test('cookie contexts remain isolated across simultaneous requests',async()=>{
  const run=value=>runtime.withRequest(new Request('https://example.com/api/auth/session',{headers:{Cookie:'session='+value}}),async()=>{
    await new Promise(resolve=>setImmediate(resolve));
    const jar=runtime.cookies();assert.equal(jar.get('session').value,value);
    jar.set('session',value+'-refreshed',{httpOnly:true,secure:true,sameSite:'lax',path:'/'});
    return runtime.ApiResponse.json({ok:true});
  });
  const [a,b]=await Promise.all([run('first'),run('second')]);
  assert.match(a.headers.getSetCookie()[0],/^session=first-refreshed;/);
  assert.match(b.headers.getSetCookie()[0],/^session=second-refreshed;/);
  assert.match(a.headers.getSetCookie()[0],/HttpOnly; Secure; SameSite=lax/);
});

test('Vercel adapter restores rewritten API path and preserves independent cookies',async()=>{
  const saved=Object.fromEntries(['VERCEL','VERCEL_ENV','TRAVELPRO_PUBLIC_URL'].map(k=>[k,process.env[k]]));
  Object.assign(process.env,{VERCEL:'1',VERCEL_ENV:'production',TRAVELPRO_PUBLIC_URL:'https://www.usetravelpro.com'});
  try{
    let calls=0;
    const imports={
      './app.mjs':{async handle(request){calls++;assert.equal(new URL(request.url).pathname,'/api/auth/login');assert.equal((await request.json()).email,'test@example.com');const jar=runtime.cookies();jar.set('first','one',{httpOnly:true,secure:true});jar.set('second','two',{httpOnly:true,secure:true});return runtime.ApiResponse.json({ok:true});}},
      './runtime.mjs':runtime
    };
    const module=new vm.SourceTextModule(readFileSync(new URL('../backend/supabase/node-handler.mjs',import.meta.url),'utf8'));
    await module.link(async name=>{const values=imports[name];return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value] of Object.entries(values))this.setExport(key,value);});});await module.evaluate();
    const req={url:'/api/index?route=auth/login',method:'POST',headers:{host:'www.usetravelpro.com',origin:'https://www.usetravelpro.com','content-type':'application/json'},body:{email:'test@example.com'}};
    const headers={};const res={setHeader(k,v){headers[k.toLowerCase()]=v;},end(body){this.body=JSON.parse(body.toString());}};
    await module.namespace.default(req,res);assert.equal(res.statusCode,200);assert.equal(headers['set-cookie'].length,2);assert.equal(calls,1);
    await module.namespace.default({...req,headers:{...req.headers,host:'evil.example'}},res);assert.equal(res.statusCode,403);assert.equal(calls,1);
  }finally{for(const [key,value]of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
