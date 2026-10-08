import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createTravelSearchEngine,validateTravelSearch} from '../backend/travel-search.mjs';
import {createApp} from '../backend/app.mjs';

const at=Date.parse('2026-10-08T02:30:00Z');
const request={category:'hotels',destination:'Gramado',start:'2026-11-10',end:'2026-11-14',adults:2,childrenAges:[],rooms:1,currency:'BRL',maxCalls:6,flexDays:0,sort:'price'};
const quote=(extra={})=>({id:'hotel-room-1',source:'Hotel source',title:'Hotel real do fornecedor',sourceUrl:'https://booking.com/hotel/br/test.html',capturedAt:new Date(at).toISOString(),expiresAt:new Date(at+300000).toISOString(),price:{amount:1000,currency:'BRL',basis:'stay',taxesIncluded:true},conditions:{freeCancellation:true,mealPlan:'breakfast'},details:{rating:9,ratingScale:10},completeness:'complete',...extra});
function adapter(id,search,extra={}){return {id,name:id,categories:['hotels','flights'],requiresKey:null,implemented:true,configured:true,docsUrl:'https://example.com/docs',search,...extra};}
function engine(adapters,options={}){return createTravelSearchEngine({adapters,now:()=>at,...options});}
const scope={tenantId:'agency-a'};

test('search input validates real dates, occupancy, IATA and bounded work',()=>{
 const valid=validateTravelSearch(request,{now:at});assert.equal(valid.adults,2);assert.equal(valid.currency,'BRL');assert.deepEqual(valid.providers,[]);
 for(const patch of [{category:'all'},{start:'2026-02-30'},{start:'2026-01-01'},{start:'2029-01-01',end:'2029-01-02'},{end:'2026-11-09'},{end:'2027-03-01'},{adults:0},{adults:1,rooms:2},{adults:9,childrenAges:[1]},{childrenAges:[18]},{childrenAges:['4']},{maxCalls:13},{flexDays:3},{sort:'invented'},{currency:'USD'},{providers:['https://evil.example']},{category:'flights',origin:'Porto Alegre',destination:'REC'}])assert.throws(()=>validateTravelSearch({...request,...patch},{now:at}),{status:422},JSON.stringify(patch));
 const sameDay=validateTravelSearch({...request,start:'2026-10-07',end:'2026-10-08'},{now:at});assert.equal(sameDay.start,'2026-10-07','dates follow the agency timezone rather than UTC');
 const flight=validateTravelSearch({...request,category:'flights',origin:'poa',destination:'rec',end:''},{now:at});assert.equal(flight.origin,'POA');assert.equal(flight.end,'');
});

test('unconfigured and planned providers return no simulated offers or exposed secrets',async()=>{
 const service=createTravelSearchEngine({env:{},now:()=>at});const providers=service.providers();assert.ok(providers.length>=15);assert.ok(providers.some(p=>p.id==='firecrawl'&&!p.implemented));assert.ok(providers.filter(p=>p.implemented).every(p=>!p.configured));
 const result=await service.search(request,scope);assert.deepEqual(result.offers,[]);assert.equal(result.summary.callsUsed,0);assert.ok(result.providers.every(p=>p.status==='unconfigured'));assert.match(result.warnings.join(' '),/Não foram gerados preços/);
 const planned=await service.search({...request,providers:['firecrawl']},scope);assert.equal(planned.providers[0].status,'planned');
 await assert.rejects(service.search({...request,providers:['unknown-source']},scope),{status:422});await assert.rejects(service.search(request,{}),{status:422});
});

test('parallel providers preserve partial success and sanitize failed-source messages',async()=>{
 const service=engine([adapter('provider-a',async()=>({offers:[quote()],requestsUsed:1})),adapter('provider-b',async()=>{throw Error('secret-key-abc https://provider.com?api_key=secret');})]);
 const result=await service.search(request,scope);assert.equal(result.offers.length,1);assert.equal(result.summary.callsUsed,2);assert.equal(result.providers.find(p=>p.id==='provider-a').status,'success');assert.equal(result.providers.find(p=>p.id==='provider-b').status,'error');assert.ok(!JSON.stringify(result).includes('secret'));
 const offer=result.offers[0];assert.equal(offer.bookable,false);assert.equal(offer.provider,'provider-a');assert.deepEqual(offer.requestSnapshot,{category:'hotels',origin:'',destination:'Gramado',start:'2026-11-10',end:'2026-11-14',adults:2,childrenAges:[],rooms:1,currency:'BRL'});
});

test('date flexibility preserves trip duration, visits base date first, and respects strict call cap',async()=>{
 const calls=[];const service=engine(['provider-a','provider-b','provider-c'].map(id=>adapter(id,async r=>{calls.push({id,...r});return {offers:[quote()],requestsUsed:1};})));
 const result=await service.search({...request,flexDays:2,maxCalls:4},scope);assert.equal(calls.length,4);assert.equal(result.summary.callsUsed,4);assert.equal(result.summary.limited,true);assert.ok(calls.slice(0,3).every(r=>r.start===request.start));assert.ok(calls.every(r=>Date.parse(r.end)-Date.parse(r.start)===4*86400000));assert.equal(result.offers.length,4,'distinct date offers remain distinct');
 const todayCalls=[];await engine([adapter('today-source',async r=>{todayCalls.push(r.start);return {offers:[]};})]).search({...request,start:'2026-10-07',end:'2026-10-09',flexDays:2,maxCalls:12},scope);assert.deepEqual(todayCalls,['2026-10-07','2026-10-08','2026-10-09']);
});

test('provider concurrency is bounded to three and slow sources cannot exceed overall deadline',async()=>{
 let running=0,peak=0;const list=Array.from({length:5},(_,i)=>adapter('source-'+i,async()=>{running++;peak=Math.max(peak,running);await new Promise(resolve=>setTimeout(resolve,10));running--;return {offers:[]};}));
 await engine(list).search(request,scope);assert.equal(peak,3);
 let signal;const slow=engine([adapter('slow-source',async(_,ctx)=>{signal=ctx.signal;return new Promise(()=>{});})],{timeoutMs:20});const start=Date.now(),result=await slow.search(request,scope);assert.ok(Date.now()-start<500);assert.equal(signal.aborted,true);assert.equal(result.providers.find(p=>p.id==='slow-source').status,'timeout');assert.equal(result.summary.callsUsed,1);
});

test('cache is isolated by agency and credentials, retains original timestamps and expires',async()=>{
 let timestamp=at,calls=0;const env={GECKO_API_KEY:'key-one'};const service=engine([adapter('source-a',async()=>{calls++;return {offers:[quote({capturedAt:new Date(timestamp).toISOString(),expiresAt:new Date(timestamp+300000).toISOString()})],requestsUsed:1};})],{env,now:()=>timestamp});
 const first=await service.search(request,scope);timestamp+=1000;const cached=await service.search(request,scope);assert.equal(calls,1);assert.equal(cached.summary.callsUsed,0);assert.equal(cached.summary.cacheHits,1);assert.equal(cached.offers[0].capturedAt,first.offers[0].capturedAt);assert.equal(cached.offers[0].cached,true);assert.equal(cached.providers.find(p=>p.id==='source-a').cached,true);
 await service.search(request,{tenantId:'agency-b'});assert.equal(calls,2);env.GECKO_API_KEY='key-two';await service.search(request,scope);assert.equal(calls,3);timestamp+=300001;const fresh=await service.search(request,scope);assert.equal(calls,4);assert.equal(fresh.offers[0].cached,false);assert.ok(!JSON.stringify(fresh).includes('key-two'));
});

test('only valid observed amounts survive and incomplete terms cannot become a comparable quote',async()=>{
 const service=engine([adapter('source-a',async()=>({offers:[quote({price:{amount:NaN,currency:'BRL',basis:'stay'}}),quote({id:'zero',price:{amount:0,currency:'BRL',basis:'stay'}}),quote({id:'unknown',price:{amount:199,currency:'BRL',basis:'unknown',taxesIncluded:null}}),quote({id:'unsafe',sourceUrl:'javascript:alert(1)'}),quote({id:'stale',expiresAt:new Date(at-1000).toISOString()}),quote({id:'forex',price:{amount:50,currency:'USD',basis:'stay',taxesIncluded:true}}),quote({id:'missing-terms',conditions:{}}),quote()]}))]);
 const result=await service.search(request,scope);assert.equal(result.offers.length,6);assert.equal(result.offers.filter(o=>o.comparison.eligible).length,1);assert.ok(result.offers.filter(o=>o.price.basis==='unknown'||!o.sourceUrl||Date.parse(o.expiresAt)<at).every(o=>o.completeness==='unknown'));assert.ok(result.warnings.some(w=>w.includes('sem preço válido')));assert.ok(result.offers.every(o=>o.bookable===false));
});

test('equivalent prices sort within verified comparison groups, without merging suppliers',async()=>{
 const service=engine([adapter('source-a',async()=>({offers:[quote({id:'expensive',price:{amount:1500,currency:'BRL',basis:'stay',taxesIncluded:true}}),quote({id:'cheap',price:{amount:500,currency:'BRL',basis:'stay',taxesIncluded:true}})]})),adapter('source-b',async()=>({offers:[quote()]}))]);
 const result=await service.search(request,scope);assert.equal(result.offers.length,3);assert.deepEqual(result.offers.map(o=>o.price.amount),[500,1000,1500]);assert.equal(new Set(result.offers.map(o=>o.provider)).size,2);
});

test('unsupported occupancy consumes no outbound call and does not cache a misleading empty result',async()=>{
 const service=engine([adapter('source-a',async()=>({offers:[],warnings:['Quantidade de quartos não suportada.'],requestsUsed:0}))]);const result=await service.search({...request,rooms:2},scope);assert.equal(result.summary.callsUsed,0);assert.equal(result.summary.cacheHits,0);assert.match(result.warnings.join(' '),/quartos não suportada/);
 let actualCalls=0;const fallback=engine([adapter('unsupported-a',async()=>({offers:[],requestsUsed:0})),adapter('unsupported-b',async()=>({offers:[],requestsUsed:0})),adapter('actual-source',async()=>{actualCalls++;return {offers:[quote()],requestsUsed:1};})]);const fallbackResult=await fallback.search({...request,maxCalls:1},scope);assert.equal(actualCalls,1);assert.equal(fallbackResult.summary.callsUsed,1);assert.equal(fallbackResult.offers.length,1);assert.equal(fallbackResult.summary.limited,false);
});

test('travel search HTTP routes require login, same origin and CSRF, return only server readiness',async t=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'travelpro-search-test-'));const app=createApp({directory,dist:path.resolve('dist'),env:{}});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 const anonymous=await fetch(origin+'/api/travel-search/providers');assert.equal(anonymous.status,401);
 const registered=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Busca',agency:'Agência Busca',email:'search@example.invalid',password:'long-test-password'})});assert.equal(registered.status,201);const cookie=registered.headers.get('set-cookie').split(';')[0],session=await registered.json();
 const invoke=(body,extra={})=>fetch(origin+'/api/travel-search',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':session.csrf,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
 assert.equal((await invoke(request,{'X-CSRF-Token':'invalid'})).status,403);assert.equal((await invoke(request,{Origin:'https://evil.example'})).status,403);
 const catalog=await fetch(origin+'/api/travel-search/providers',{headers:{Cookie:cookie}});assert.equal(catalog.status,200);assert.ok((await catalog.json()).providers.every(p=>!p.configured));
 const date=new Date(Date.now()+7*86400000),end=new Date(Date.now()+9*86400000);const current={...request,start:date.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
 const result=await invoke(current);assert.equal(result.status,200);assert.deepEqual((await result.json()).offers,[]);assert.equal((await invoke({...current,maxCalls:99})).status,422);
});
