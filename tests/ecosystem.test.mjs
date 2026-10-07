import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import {ecosystemPayload,issueEcosystemCode,redeemEcosystemCode} from '../backend/ecosystem.mjs';
const actor={wid:randomUUID(),user:{id:randomUUID(),email:'bridge@example.invalid',email_confirmed_at:'2026-01-01',user_metadata:{name:'Test'}}};
const state={agency:'Test agency',clients:[{id:'c',name:'Private client',email:'private@example.invalid',phone:'555',documentNumber:'SECRET'}],trips:[{id:'t',client:'c',title:'Viagem',destination:'Lisboa',travelers:2,notes:'PRIVATE'}],budgets:[{id:'b',name:'Private client proposal',destination:'Lisboa',travelers:2,discount:10,items:[{name:'Hotel',qty:1,unit:100}],notes:'PRIVATE'}]};
function store(){const rows=new Map();return {put:async(k,v)=>rows.set(k,{value:v,token:randomUUID()}),get:async(w,k)=>w===actor.wid?rows.get(k):null,consume:async(w,k,token)=>w===actor.wid&&rows.get(k)?.token===token&&rows.delete(k)};}
test('ecosystem exports only selected agency record and marketplace payload omits customer data',()=>{
 const p=ecosystemPayload(actor,state,'travelmatch','b');assert.equal(p.record.title,'Lisboa');assert.doesNotMatch(JSON.stringify(p),/PRIVATE|SECRET|private@example|Private client/);
 const t=ecosystemPayload(actor,state,'vuei','t');assert.equal(t.record.client.name,'Private client');assert.equal(t.record.client.documentNumber,undefined);
 assert.throws(()=>ecosystemPayload(actor,state,'vuei','foreign'));assert.throws(()=>ecosystemPayload({...actor,user:{...actor.user,email_confirmed_at:null}},state,'vuei',''));
});
test('handoffs enforce destination, PKCE, expiry, tenant and single use',async()=>{
 const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url'),repo=store(),payload=ecosystemPayload(actor,state,'vuei','t');
 const code=await issueEcosystemCode(repo,{payload,challenge,now:100});
 for(const args of [{target:'travelmatch'},{verifier:randomBytes(32).toString('base64url')},{code:randomUUID()+'.'+code.split('.')[1]},{now:120101}])await assert.rejects(redeemEcosystemCode(repo,{code,verifier,target:'vuei',now:101,...args}));
 const results=await Promise.allSettled([1,2].map(()=>redeemEcosystemCode(repo,{code,verifier,target:'vuei',now:101})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 await assert.rejects(redeemEcosystemCode(repo,{code,verifier,target:'vuei',now:101}));
});
