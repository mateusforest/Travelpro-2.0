import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createApp} from '../backend/app.mjs';
import {handleTravelPlans,compactPlanOffer,validateTravelPlans,travelPlanLimits} from '../backend/travel-plans.mjs';
import {validateState} from '../backend/validation.mjs';
const initial=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url),'utf8'));
initial.agency='Fixture Agency';
const offer=()=>({id:'room-1',category:'hotels',provider:'native-laghetto',source:'Laghetto',title:'Quarto casal',sourceUrl:'https://reservas.laghetto.com.br/hotelresults?q=7620',capturedAt:'2026-10-08T04:00:00Z',expiresAt:'2099-11-01T00:00:00Z',bookable:true,completeness:'complete',price:{amount:1434.93,currency:'BRL',basis:'stay',taxesIncluded:true},requestSnapshot:{category:'hotels',destination:'Rio Grande',start:'2026-11-10',end:'2026-11-15',adults:2,rooms:1,childrenAges:[]},planningRequest:{category:'trip',destination:'Rio Grande'},details:{priceKind:'dated_quote',hotelId:'7620'},evidence:{sha256:'a'.repeat(64),rawPrice:'1434.93'}});
function repository(seed=initial){let row={state:structuredClone(seed),version:1};return {load:async()=>structuredClone(row),save:async(state,version)=>{assert.equal(version,row.version);validateState(state);row={state:structuredClone(state),version:version+1};return row.version;},get row(){return structuredClone(row);}};}

test('plans save compact historical references without promoting a browser price to a verified quote',async()=>{
 const repo=repository(),original={...offer(),identityKey:'b'.repeat(64),identityKind:'dated_quote'};original.requestSnapshot.currency='BRL';original.extraPayload={html:'unneeded'};
 const result=await handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'Viagem da família',items:[original]}}});
 const item=result.plan.items[0];assert.equal(item.identityKey,'b'.repeat(64));assert.equal(item.identityKind,'dated_quote');assert.equal(item.requestSnapshot.currency,'BRL');assert.equal(item.savedReference,true);assert.equal(item.expiresAt,'');assert.equal(item.completeness,'unknown');assert.equal(item.bookable,false);assert.equal(item.extraPayload,undefined);assert.equal(item.price.amount,1434.93);assert.equal(item.requestSnapshot.adults,2);assert.equal(item.planningRequest.category,'trip');assert.equal(original.completeness,'complete');assert.equal(result.version,2);
 assert.equal(result.plan.revision,1);assert.equal((await handleTravelPlans({...repo,path:result.plan.id})).plan.name,'Viagem da família');
 validateTravelPlans(repo.row.state);assert.equal(validateState(initial),initial);
});
test('plans reject credentials, private pricing, untrusted client links, invalid dates, duplicates and limits',async()=>{
 for(const patch of [{privatePricing:{margin:10}},{details:{apiKey:'secret'}},{requestSnapshot:{start:'2026-02-30'}},{price:{amount:Infinity}}]){
  const repo=repository();await assert.rejects(handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'Teste',items:[{...offer(),...patch}]}}}),{status:422});assert.equal(repo.row.version,1);
 }
 const repo=repository();for(const plan of [{name:'Cliente de outra agência',clientId:'foreign',items:[]},{name:'Duplicado',items:[offer(),offer()]},{name:'Excesso',items:Array.from({length:13},(_,i)=>({...offer(),id:String(i)}))}])await assert.rejects(handleTravelPlans({...repo,method:'POST',input:{version:1,plan}}),{status:422});
 await assert.rejects(handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'Grande',notes:'x'.repeat(180001),items:[]}}}),{status:413});
 for(let i=0;i<30;i++)await handleTravelPlans({...repo,method:'POST',input:{version:i+1,plan:{name:'Plano '+i,items:[]}}});
 await assert.rejects(handleTravelPlans({...repo,method:'POST',input:{version:31,plan:{name:'Excesso',items:[]}}}),{status:422});
 assert.equal(compactPlanOffer({...offer(),sourceUrl:'https://example.com/?token=secret'}).sourceUrl,'');
 for(const identity of [{identityKey:'forged',identityKind:'dated_quote'},{identityKey:'a'.repeat(64),identityKind:'trusted_price'}])assert.equal(compactPlanOffer({...offer(),...identity}).identityKey,undefined);
});
test('update and deletion require both current workspace version and current plan revision',async()=>{
 const repo=repository(),created=await handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'Original',items:[offer()]}}});
 const key=created.plan.id;
 for(const input of [{plan:{name:'Sem versão',items:[]}},{version:1,revision:1,plan:{name:'Desatualizado',items:[]}},{version:2,revision:2,plan:{name:'Revisão errada',items:[]}}])await assert.rejects(handleTravelPlans({...repo,path:key,method:'PUT',input}),{status:input.version?409:422});
 const changed=await handleTravelPlans({...repo,path:key,method:'PUT',input:{version:2,revision:1,plan:{name:'Renomeado',items:[]}}});assert.equal(changed.plan.revision,2);assert.equal(changed.plan.createdAt,created.plan.createdAt);
 await assert.rejects(handleTravelPlans({...repo,path:key,method:'DELETE',input:{version:3,revision:1}}),{status:409});
 const deleted=await handleTravelPlans({...repo,path:key,method:'DELETE',input:{version:3,revision:2}});assert.equal(deleted.version,4);assert.deepEqual(deleted.plans,[]);
});

test('SQLite plan endpoints enforce sessions, CSRF, agency isolation and concurrent updates',async t=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'travelpro-plans-')),app=createApp({directory,dist:path.resolve('dist'),env:{TRAVELPRO_NATIVE_SEARCH:'false'}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);t.after(()=>{app.close();rmSync(directory,{recursive:true,force:true});});
 const client=()=>({cookie:'',csrf:'',async request(route,method='GET',body,extra={}){const res=await fetch(origin+'/api'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:this.cookie,'X-CSRF-Token':this.csrf,...extra},body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.has('set-cookie'))this.cookie=res.headers.get('set-cookie').split(';')[0];const data=await res.json();if(data.csrf)this.csrf=data.csrf;return {status:res.status,...data};}});
 const a=client(),b=client(),anon=client();for(const [c,name]of [[a,'A'],[b,'B']])assert.equal((await c.request('/auth/register','POST',{agency:name,name,email:name+'@plans.test',password:'fixture-password-123'})).status,201);
 assert.equal((await anon.request('/travel-plans')).status,401);
 const body={version:1,plan:{name:'Plano A',items:[offer()]}};
 assert.equal((await a.request('/travel-plans','POST',body,{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await a.request('/travel-plans','POST',body,{Origin:'https://evil.test'})).status,403);
 const created=await a.request('/travel-plans','POST',body);assert.equal(created.status,201,JSON.stringify(created));const route='/travel-plans/'+created.plan.id;
 assert.deepEqual((await b.request('/travel-plans')).plans,[]);assert.equal((await b.request(route)).status,404);assert.equal((await b.request(route,'DELETE',{version:1,revision:1})).status,404);
 const parallel=await Promise.all(['Primeiro','Segundo'].map(name=>a.request(route,'PUT',{version:2,revision:1,plan:{name,items:[offer()]}})));assert.deepEqual(parallel.map(x=>x.status).sort(),[200,409]);
 const workspace=await a.request('/workspace');delete workspace.state.travelPlans;
 const generic=await a.request('/workspace','PUT',{version:workspace.version,state:workspace.state});assert.equal(generic.status,200);
 const persisted=await a.request('/travel-plans');assert.equal(persisted.plans.length,1);assert.equal(persisted.plans[0].revision,2);
 assert.equal((await a.request(route,'DELETE',{version:persisted.version,revision:1})).status,409);
 assert.equal((await a.request(route,'DELETE',{version:persisted.version,revision:2})).status,200);assert.deepEqual((await a.request('/travel-plans')).plans,[]);
});

test('portal plan bridge serializes mutations and preserves edits made while saving',async()=>{
 const source=readFileSync(new URL('../dist/portal.js',import.meta.url),'utf8'),start=source.indexOf('  async function travelPlansRequest('),end=source.indexOf('  async function refreshWorkspace()',start);assert.ok(start>0&&end>start);
 let release;const pending=new Promise(resolve=>release=resolve),state={agency:'Before',travelPlans:[]},calls=[];
 const ctx=vm.createContext({state,backendReady:true,backendBlocked:false,backendQueue:Promise.resolve(),backendSaving:false,backendBaseline:JSON.stringify(state),backend:{version:1,async request(route,options){calls.push({route,options});await pending;return {version:2,plans:[{id:'saved'}]};}},persist:async()=>{},syncLabel:()=>{},syncError:()=>{}});
 vm.runInContext(source.slice(start,end),ctx);const saving=vm.runInContext("travelPlansRequest('',{method:'POST',body:{version:999,plan:{name:'Saved',items:[]}}})",ctx);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.backendSaving,true);state.agency='Edited while saving';release();await saving;
 assert.equal(calls[0].options.body.version,1);assert.equal(ctx.backend.version,2);assert.equal(state.agency,'Edited while saving');assert.equal(JSON.parse(ctx.backendBaseline).agency,'Before');assert.deepEqual(JSON.parse(ctx.backendBaseline).travelPlans,[{id:'saved'}]);assert.equal(ctx.backendSaving,false);
});


test('aggregate plan size rejects creation and update without changing data or version',async()=>{
 const repo=repository(),base=offer(),longPlan={name:'Plano detalhado',notes:'n'.repeat(3000),items:Array.from({length:12},(_,i)=>({...base,id:'room-'+i,conditions:{mealPlan:'a'.repeat(1000),cancellation:'b'.repeat(1000),baggage:'c'.repeat(1000),roomType:'d'.repeat(1000)},warnings:Array.from({length:12},(_,j)=>String(j)+'e'.repeat(490))}))};
 const empty=await handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'Pequeno',items:[]}}});
 let rejected=false;
 for(let count=0;count<15;count++){
  const before=repo.row;
  try{await handleTravelPlans({...repo,method:'POST',input:{version:before.version,plan:longPlan}});}catch(error){assert.equal(error.status,413);assert.match(error.message,/1 MB/);assert.deepEqual(repo.row,before);rejected=true;break;}
 }
 assert.equal(rejected,true);assert.ok(Buffer.byteLength(JSON.stringify(repo.row.state.travelPlans))<=travelPlanLimits.maxCollectionBytes);
 const before=repo.row;
 await assert.rejects(handleTravelPlans({...repo,path:empty.plan.id,method:'PUT',input:{version:before.version,revision:1,plan:longPlan}}),{status:413});assert.deepEqual(repo.row,before);
 const oversized={...before.state,travelPlans:[...before.state.travelPlans,...before.state.travelPlans]};assert.throws(()=>validateTravelPlans(oversized),{status:413});
});

test('workspace size budget blocks new plan data but permits deletion to recover space',async()=>{
 const seed=structuredClone(initial);seed.documentArchive=Array.from({length:10},()=> 'x'.repeat(398000));
 const repo=repository(seed),created=await handleTravelPlans({...repo,method:'POST',input:{version:1,plan:{name:'A remover',items:[]}}});
 const before=repo.row,large={name:'Excesso',items:Array.from({length:12},(_,i)=>({...offer(),id:'room-'+i,conditions:{cancellation:'x'.repeat(1000),mealPlan:'y'.repeat(1000)}}))};
 await assert.rejects(handleTravelPlans({...repo,method:'POST',input:{version:before.version,plan:large}}),{status:413});assert.deepEqual(repo.row,before);
 await assert.rejects(handleTravelPlans({...repo,path:created.plan.id,method:'PUT',input:{version:before.version,revision:1,plan:large}}),{status:413});assert.deepEqual(repo.row,before);
 const overgrown=repo.row.state;overgrown.documentArchive.push('z'.repeat(100000));const recovery=repository(overgrown);
 const removed=await handleTravelPlans({...recovery,path:created.plan.id,method:'DELETE',input:{version:1,revision:1}});assert.equal(removed.version,2);assert.deepEqual(removed.plans,[]);
});
