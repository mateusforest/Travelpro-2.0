import * as ecosystem from '../backend/ecosystem.mjs';
// Runs the actual API module with isolated Supabase substitutes. No real account or DB writes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as crypto from 'node:crypto';
import * as validation from '../backend/validation.mjs';
import * as granatum from '../backend/granatum.mjs';
import * as financeAPI from '../backend/finance-api.mjs';
import * as providers from '../backend/providers.mjs';
import * as integrationAccess from '../backend/integration-access.mjs';
import * as cosSupport from '../backend/cos-support.mjs';
import * as intake from '../backend/intake.mjs';
import * as proposalDelivery from '../backend/proposal-delivery.mjs';
import * as visualItinerary from '../backend/visual-itinerary.mjs';
import * as templateExtraction from '../backend/template-extraction.mjs';
const initial=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url)));
const analyzedDraft={name:'Clara Intake',email:'',phone:'',destination:'Lisboa',start:'',end:'',notes:'Hotel central.',travelers:null};
async function fixture({role='owner',workspaceId='agency-a',version=1,platformAdminIds='',aiConfigured=false,integrationConfigs={},storedFiles={},connectHarness=false}={}){
  const env={TRAVELPRO_PLATFORM_ADMIN_IDS:platformAdminIds,...(aiConfigured?{OPENAI_API_KEY:'fixture-openai-key',OPENAI_MODEL:'fixture-model'}:{})};
  const state=structuredClone(initial);state.agency='Agency A';
  let stored={data:structuredClone(state),version},writes=0;
  const calls=[],providerCalls=[];
  const db={from(table){const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},order(){return q;},range(){return q;},maybeSingle(){return run();},single(){return run();},then(ok,bad){return run().then(ok,bad);}};
    async function run(){calls.push({table,filters:{...filters}});if(table==='travelpro_state')return {data:structuredClone(stored),error:null};if(table==='travelpro_integrations')return {data:integrationConfigs[filters.service]?{config:structuredClone(integrationConfigs[filters.service]),secret:null}:null,error:null};throw Error('Unexpected table '+table);}return q;},
    async rpc(name,args){if(name==='travelpro_rate_limit'){assert.match(args.p_key,/^user-a:/);return {data:true,error:null};}assert.equal(name,'travelpro_save_state');assert.equal(args.p_workspace,workspaceId);if(args.p_version!==stored.version)return {error:{code:'40001'}};stored={data:structuredClone(args.p_data),version:stored.version+1};writes++;return {data:stored.version,error:null};}};
  const user={id:'user-a',email:'test@example.invalid',user_metadata:{name:'Test'}};
  db.storage={from(bucket){assert.equal(bucket,'travelpro-private');return {async upload(key,bytes,options){calls.push({bucket,key,options});if(/[^a-z0-9/_.-]/i.test(key))return {error:{message:'Invalid key'}};return {data:{path:key},error:null};},async createSignedUploadUrl(key,options){calls.push({bucket,key,options});return {data:{signedUrl:'https://example.supabase.co/storage/v1/object/upload/sign/'+key+'?token=test'},error:null};},async download(key){calls.push({bucket,key});return Object.hasOwn(storedFiles,key)?{data:new Blob([storedFiles[key]]),error:null}:{data:null,error:{message:'not found'}};}};}};
  const access={workspace:workspaceId?{id:workspaceId,name:'Agency A',type:'operations'}:null,membershipRole:role,profile:null};
  class ApiResponse extends Response{static json(body,init){return new ApiResponse(JSON.stringify(body),{...init,headers:{...init?.headers,'Content-Type':'application/json'}});}static redirect(url){return new ApiResponse(null,{status:307,headers:{Location:String(url)}});}}
  const imports={
    "../ecosystem.mjs":ecosystem,
    '../exchange.mjs':{exchangeRates:async()=>({rates:{BRL:1,USD:5,EUR:6},dates:{USD:'2026-10-01',EUR:'2026-10-01'},stale:false})},
    '../template-extraction.mjs':templateExtraction,
    '../visual-itinerary.mjs':visualItinerary,
    '../cos-support.mjs':cosSupport,
    'node:crypto':crypto,'./runtime.mjs':{ApiResponse,after:()=>{},cookies:async()=>({get:()=>undefined})},
    '@supabase/supabase-js':{createClient:()=>{throw Error('Unexpected external auth');}},
    './clients.mjs':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user}})}}),createSupabaseAdminClient:()=>db,supabaseConfigured:()=>true},
    './access.mjs':{getUserAccessForUser:async()=>access,ensureAppAccessForUser:async()=>({access}),canManageWorkspace:a=>['owner','admin'].includes(a.membershipRole),resolvePostAuthPath:()=>'/portal'},
    '../initial-state.json':{default:initial},'../granatum.mjs':connectHarness?{...granatum,connectGranatum:async(db,wid,token)=>{calls.push({connectWorkspace:wid});return {connected:true};}}:granatum,'../finance-api.mjs':connectHarness?{...financeAPI,handleFinance:async()=>({})}:financeAPI,'../validation.mjs':validation,'../providers.mjs':{...providers,cosReply:async()=>null,remote:async()=>{throw Error('Unexpected provider request');}},
    '../integration-access.mjs':{...integrationAccess,isPlatformAdmin:id=>integrationAccess.isPlatformAdmin(id,env),requirePlatformAdmin:id=>integrationAccess.requirePlatformAdmin(id,env)},
    '../proposal-delivery.mjs':proposalDelivery,
    '../intake.mjs':{...intake,analyzeIntake:(config,input)=>intake.analyzeIntake(config,input,{request:async(url,options)=>{providerCalls.push({url,options});assert.equal(url,'https://api.openai.com/v1/responses');return {status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({draft:analyzedDraft,summary:'Pedido para Lisboa.',warnings:['Revise os dados antes de salvar.']})}]}]};}})}
  };
  const context=vm.createContext({process:{env},URL,Buffer,console,structuredClone,fetch:async()=>{throw Error('Unexpected external request');}});
  const module=new vm.SourceTextModule(readFileSync(new URL('../backend/supabase/app.mjs',import.meta.url),'utf8'),{context});
  await module.link(async name=>{const values=imports[name];assert.ok(values,'Unexpected import '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});});await module.evaluate();
  const request=(path,method='GET',body)=>module.namespace.handle(new Request('http://localhost:3000/api/'+path,{method,headers:{Host:'localhost:3000',Origin:'http://localhost:3000','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
  return {request,state,calls,providerCalls,get writes(){return writes;},get stored(){return structuredClone(stored);}};
}
test('authenticated workspace queries are scoped to the selected agency',async()=>{const f=await fixture();const res=await f.request('workspace');assert.equal(res.status,200);assert.equal((await res.json()).state.agency,'Agency A');assert.ok(f.calls.length>1);assert.ok(f.calls.every(c=>c.filters.workspace_id==='agency-a'));});
test('user without workspace cannot reach database',async()=>{const f=await fixture({workspaceId:null});const res=await f.request('workspace');assert.equal(res.status,403);assert.equal(f.calls.length,0);});
test('ordinary member cannot change agency configuration',async()=>{const f=await fixture({role:'member'});f.state.agency='Another agency';const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,403);assert.equal(f.writes,0);});
test('ordinary member can save operational data',async()=>{const f=await fixture({role:'member'});f.state.clients.push({id:'new-client',name:'Client',email:'',phone:''});const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,200);assert.equal(f.writes,1);});
test('stale versions cannot overwrite a newer workspace',async()=>{const f=await fixture({version:2});const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,409);assert.equal(f.writes,0);});
test('concurrent saves permit only one write for each version',async()=>{const f=await fixture();const results=await Promise.all([f.request('workspace','PUT',{version:1,state:f.state}),f.request('workspace','PUT',{version:1,state:f.state})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(f.writes,1);});
test('agency owner, admin and member cannot set platform integration secrets',async()=>{
  for(const role of ['owner','admin','member']){
    const f=await fixture({role});
    for(const service of ['openai','operator','payments','whatsapp']){const res=await f.request('integrations/'+service,'PUT',{config:{key:'test'}});assert.equal(res.status,403,role+' / '+service);assert.match((await res.json()).error,/equipe TravelPro/);}
    assert.equal(f.calls.length,0);assert.equal(f.writes,0);
  }
});

test('integration status hides technical configuration except from an exact platform ID',async()=>{
  const integrationConfigs={openai:{key:'fixture-secret',model:'fixture-model'},operator:{endpoint:'https://operator.example.invalid/api',key:'fixture-operator-secret'}};
  for(const platformAdminIds of ['', 'owner,admin,test@example.invalid,user-a-extra', ' user-a , user-b ']){
    const allowed=platformAdminIds.includes(' user-a '),f=await fixture({platformAdminIds,integrationConfigs});
    for(const route of ['workspace','integrations']){
      const res=await f.request(route);assert.equal(res.status,200);const data=await res.json();assert.equal(data.capabilities.platformAdmin,allowed);
      assert.ok(!JSON.stringify(data).includes('fixture-secret'));assert.ok(!JSON.stringify(data).includes('fixture-operator-secret'));
      for(const service of data.services){assert.equal(service.management,'platform');assert.equal(Object.hasOwn(service,'config'),allowed);assert.equal(Object.hasOwn(service,'missing'),allowed);}
      const operator=data.services.find(item=>item.service==='operator');assert.equal(operator.configured,true);
      if(allowed){assert.equal(operator.config.endpoint,integrationConfigs.operator.endpoint);assert.equal(data.services.find(item=>item.service==='openai').config.model,'fixture-model');}
      else{assert.ok(!JSON.stringify(data.services).includes('fixture-model'));assert.ok(!JSON.stringify(data.services).includes('operator.example.invalid'));}
    }
  }
});

test('intake analysis requires configured AI and never persists text or a draft',async()=>{
  const missing=await fixture(),before=missing.stored;
  const unavailable=await missing.request('cos/intake/analyze','POST',{text:'Clara deseja ir para Lisboa.'});assert.equal(unavailable.status,503);assert.equal(missing.providerCalls.length,0);assert.equal(missing.writes,0);assert.deepEqual(missing.stored,before);
  const ready=await fixture({aiConfigured:true,role:'member'}),readyBefore=ready.stored;
  const analyzed=await ready.request('cos/intake/analyze','POST',{text:'Clara Intake deseja ir para Lisboa e prefere hotel central.'});assert.equal(analyzed.status,200);const result=await analyzed.json();assert.deepEqual(result.draft,analyzedDraft);assert.equal(result.mode,'ai');assert.equal(ready.providerCalls.length,1);assert.equal(ready.writes,0);assert.deepEqual(ready.stored,readyBefore);
});

test('reviewed intake persists once, replays an original version and rejects changed or stale requests',async()=>{
  const f=await fixture({role:'member'}),other=await fixture({workspaceId:'agency-b'});
  const payload={version:1,review:{requestId:crypto.randomUUID(),action:'attendance',draft:analyzedDraft}};
  const response=await f.request('cos/intake/execute','POST',payload);assert.equal(response.status,201);const created=await response.json();assert.equal(created.replayed,false);assert.equal(created.version,2);assert.equal(created.state.clients.length,1);assert.equal(created.state.trips.length,1);assert.equal(created.state.trips[0].client,created.clientId);assert.equal(created.state.trips[0].id,created.tripId);assert.equal(created.state.trips[0].datesPending,true);assert.equal(f.writes,1);
  const replayResponse=await f.request('cos/intake/execute','POST',payload);assert.equal(replayResponse.status,200);const replay=await replayResponse.json();assert.equal(replay.replayed,true);assert.equal(replay.version,created.version);assert.equal(replay.clientId,created.clientId);assert.equal(replay.tripId,created.tripId);assert.deepEqual(replay.state,created.state);assert.equal(f.writes,1);
  const changed=structuredClone(payload);changed.review.draft.destination='Madrid';assert.equal((await f.request('cos/intake/execute','POST',changed)).status,409);
  const stale={version:1,review:{requestId:crypto.randomUUID(),action:'client',draft:{name:'Stale client'}}};assert.equal((await f.request('cos/intake/execute','POST',stale)).status,409);assert.equal(f.writes,1);
  const foreign={version:1,review:{requestId:crypto.randomUUID(),action:'attendance',clientId:created.clientId,draft:{destination:'Porto'}}};assert.equal((await other.request('cos/intake/execute','POST',foreign)).status,422);assert.equal(other.writes,0);assert.equal(other.stored.data.clients.length,0);
  const ownResponse=await other.request('cos/intake/execute','POST',payload);assert.equal(ownResponse.status,201);const own=await ownResponse.json();assert.notEqual(own.clientId,created.clientId);assert.notEqual(own.tripId,created.tripId);assert.equal(own.replayed,false);
  assert.ok(f.calls.every(call=>call.filters.workspace_id==='agency-a'));assert.ok(other.calls.every(call=>call.filters.workspace_id==='agency-b'));
});

test('workspace saves cannot forge or erase server intake receipts',async()=>{
  const f=await fixture(),forged={requestId:crypto.randomUUID(),hash:'forged',clientId:'forged-client'};
  f.state.intakeReceipts=[forged];assert.equal((await f.request('workspace','PUT',{state:f.state,version:1})).status,200);assert.equal(Object.hasOwn(f.stored.data,'intakeReceipts'),false);
  const payload={version:2,review:{requestId:crypto.randomUUID(),action:'client',draft:{name:'Client only'}}};
  const response=await f.request('cos/intake/execute','POST',payload);assert.equal(response.status,201);const created=await response.json();assert.equal(created.state.trips.length,0);assert.equal(Object.hasOwn(created,'tripId'),false);
  const receipts=structuredClone(created.state.intakeReceipts);
  for(const incoming of [[],[forged],undefined]){
    const current=f.stored;current.data.intakeReceipts=incoming;
    assert.equal((await f.request('workspace','PUT',{state:current.data,version:current.version})).status,200);assert.deepEqual(f.stored.data.intakeReceipts,receipts);
  }
  const writes=f.writes,replayResponse=await f.request('cos/intake/execute','POST',payload);assert.equal(replayResponse.status,200);const replay=await replayResponse.json();assert.equal(replay.replayed,true);assert.equal(replay.state.clients.length,1);assert.equal(replay.version,f.stored.version);assert.equal(f.writes,writes);
});
test('member cannot trigger Granatum sync or restart',async()=>{const f=await fixture({role:'member'});const res=await f.request('finance/granatum/sync','POST',{restart:true});assert.equal(res.status,403);assert.equal(f.calls.length,0);});
test('ordinary members cannot connect Granatum or select another agency',async()=>{
 const f=await fixture({role:'member'});const res=await f.request('finance/granatum/connect','POST',{token:'test-token-not-a-real-credential',workspace:'another-agency'});
 assert.equal(res.status,403);assert.equal(f.calls.length,0);
});
test('Granatum setup uses the signed-in agency and ignores a supplied workspace id',async()=>{
 for(const role of ['owner','admin']){const f=await fixture({role,workspaceId:'wife-agency',connectHarness:true});const res=await f.request('finance/granatum/connect','POST',{token:'test-token-not-a-real-credential',workspace:'husband-agency'});assert.equal(res.status,200);assert.deepEqual(f.calls,[{connectWorkspace:'wife-agency'}]);assert.deepEqual(await res.json(),{connected:true});}
});
test('Granatum cron refuses requests without its dedicated credential',async()=>{const f=await fixture();const res=await f.request('cron/granatum','POST',{});assert.equal(res.status,401);assert.equal(f.calls.length,0);});

test('COS prepares attachment operations and executes them with concurrency protection in Supabase',async()=>{
  const f=await fixture();f.state.clients.push({id:'ana',name:'Ana Lima',email:'',phone:''});
  f.state.documents.push({id:'doc',name:'Voucher.pdf',type:'Anexo',content:'',file:{id:'file-one'}});
  assert.equal((await f.request('workspace','PUT',{state:f.state,version:1})).status,200);
  const chat=await f.request('cos/chat','POST',{text:'Vincule o voucher à Ana Lima',attachmentId:'file-one',version:2});
  assert.equal(chat.status,200);const prepared=await chat.json();assert.equal(prepared.mode,'operational');
  assert.equal(prepared.response.operation.clientId,'ana');assert.equal(f.stored.data.documents[0].clients,undefined);
  const wrong=await f.request('cos/documents/organize','POST',{operation:prepared.response.operation,version:2});assert.equal(wrong.status,409);
  const result=await f.request('cos/documents/organize','POST',{operation:prepared.response.operation,version:prepared.version});assert.equal(result.status,200);
  assert.deepEqual(f.stored.data.documents[0].clients,['ana']);assert.equal(f.stored.data.documents.length,1);
});

test('Supabase template extraction scopes private storage and leaves workspace unchanged',async()=>{
 const id='12345678-1234-4234-8234-123456789012/Modelo%20da%20ag%C3%AAncia.txt';
 const f=await fixture({role:'member',storedFiles:{['agency-a/'+id]:'Dia 1 - Lisboa\nTransfer contratado.'}});
 const res=await f.request('templates/extract','POST',{fileId:id});assert.equal(res.status,200);assert.match((await res.json()).days[0].text,/Transfer contratado/);assert.equal(f.writes,0);
 assert.equal(f.calls.find(c=>c.bucket).key,'agency-a/'+id);
 const other=await fixture({workspaceId:'agency-b',storedFiles:{['agency-a/'+id]:'private'}});
 assert.equal((await other.request('templates/extract','POST',{fileId:id})).status,404);
 assert.equal((await f.request('templates/extract','POST',{fileId:'../agency-b/'+id})).status,404);
 assert.equal(f.writes,0);
});

test('large original PDF upload is private, scoped and limited without passing bytes through serverless',async()=>{
 const f=await fixture();const res=await f.request('templates/upload','POST',{name:'Modelo da agência.pdf',size:6500000});assert.equal(res.status,200);const data=await res.json();assert.equal(data.direct,true);assert.ok(data.file.id);assert.equal(f.writes,0);const upload=f.calls.find(c=>c.bucket);assert.ok(upload.key.startsWith('agency-a/'));assert.equal(upload.options.upsert,false);
 for(const input of [{name:'../other.pdf',size:20},{name:'script.html',size:20},{name:'a.pdf',size:21000000}])assert.equal((await f.request('templates/upload','POST',input)).status,422);
 const noWorkspace=await fixture({workspaceId:null});assert.equal((await noWorkspace.request('templates/upload','POST',{name:'a.pdf',size:10})).status,403);
});

test('customer documents with spaces accents and symbols use valid private storage keys',async()=>{
 const f=await fixture();
 for(const name of ['Documento João.pdf','RG da Júlia (frente).jpg','Seguro 100% válido + cópia.pdf','证件.pdf']){
  const response=await f.request('files','POST',{name,base64:Buffer.from('isolated test document').toString('base64')});assert.equal(response.status,201);
  const file=await response.json();assert.equal(file.name,name);assert.match(file.id,/^[a-f0-9-]+\/[a-z0-9_-]+\.[a-z]+$/i);
  assert.equal(f.calls.at(-1).key,'agency-a/'+file.id);assert.equal(f.calls.at(-1).options.upsert,false);
 }
 const template=await f.request('templates/upload','POST',{name:'Roteiro São Paulo.pdf',size:1234});assert.equal(template.status,200);assert.match((await template.json()).file.id,/Roteiro-Sao-Paulo\.pdf$/);
});

test('ecosystem authorization requires the workspace owner and a confirmed email',async()=>{
 for(const role of ['member','admin','owner']){const f=await fixture({role});const res=await f.request('ecosystem/authorize','POST',{target:'vuei',challenge:'A'.repeat(43)});assert.equal(res.status,403);assert.equal(f.writes,0);}
});
