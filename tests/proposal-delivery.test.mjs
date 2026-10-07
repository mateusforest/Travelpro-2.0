import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposalSnapshot,deliveryEligibility,deliverProposal,proposalPreview} from '../backend/proposal-delivery.mjs';
import {salesFlow,validateState} from '../backend/validation.mjs';
const config={token:'test',phoneId:'12345',version:'v25.0',appSecret:'test',verifyToken:'test'};
function fixture(){
 const state=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url),'utf8'));
 state.agency='Atelier Viagens';state.clients=[{id:'c',name:'Marina Costa',phone:'+5511999999999',email:''}];
 const trip={id:'t',client:'c',title:'Itália com calma',destination:'Itália',start:'2027-07-01',end:'2027-07-15',travelers:2,value:0};
 const q={id:'q',trip:'t',client:'c',source:'manual',destination:trip.destination,start:trip.start,end:trip.end,travelers:2,currency:'BRL',validUntil:'2099-12-30',offers:[{name:'Itália a dois',total:24500,inclusions:['Voos de ida e volta','Hospedagem e traslados'],terms:'Sujeito à disponibilidade.'}]};
 trip.sales={quotes:[q],quoteId:'q',budgetId:'b'};state.trips=[trip];state.events=[];state.documents=[];state.itineraries=[];state.transactions=[];state.budgets=[salesFlow.buildBudget(trip,q,0,'b')];
 state.whatsapp.threads=[{id:'w',name:'Marina',phone:'5511999999999',clientId:'c',channel:'live',lastInbound:Date.now()-1000,mode:'human',profile:{},events:[],messages:[]}];
 let stored=structuredClone(state),version=1;const outbox=new Map(),calls=[];
 const repo={load:async()=>({state:structuredClone(stored),version}),save:async(s,v)=>{assert.equal(v,version);validateState(s);stored=structuredClone(s);version++;},find:async id=>outbox.get(id),claim:async id=>{if(outbox.has(id))return false;outbox.set(id,{status:'sending'});return true;},update:async(id,status,remote_id)=>outbox.set(id,{status,remote_id})};
 const request=async(url,opt)=>{calls.push({url,opt});return url.endsWith('/media')?{id:'media-1'}:{messages:[{id:'message-1'}]};};
 return {state,repo,calls,outbox,request,get stored(){return stored;},input(){return {id:'b',fingerprint:proposalSnapshot(stored,'b').fingerprint,message:'Olá, Marina. Sua viagem está no PDF.'};}};
}
test('proposal PDF is real, scoped and preserves quotation values',async()=>{const f=fixture(),p=await proposalPreview(f.state,'b',config);assert.equal(Buffer.from(p.base64,'base64').subarray(0,5).toString(),'%PDF-');assert.equal(p.ready,true);assert.match(p.message,/24.500,00/);await assert.rejects(()=>proposalPreview(f.state,'other',config),/não encontrada/);});
test('manual proposals use the personalized PDF without unlocking delivery',async()=>{
 const f=fixture();delete f.state.budgets[0].quoteId;delete f.state.budgets[0].trip;f.state.trips=[];
 const p=await proposalPreview(f.state,'b',config);
 assert.equal(Buffer.from(p.base64,'base64').subarray(0,5).toString(),'%PDF-');
 assert.match(p.filename,/\.pdf$/);assert.equal(p.ready,false);assert.match(p.reason,/Vincule/);
 assert.throws(()=>proposalSnapshot(f.state,'b'),/Vincule/);
});
test('delivery uploads PDF and sends it once with the personalized caption',async()=>{const f=fixture(),input=f.input();assert.equal((await deliverProposal(f.repo,input,config,{request:f.request})).status,'sent');assert.equal(f.calls.length,2);assert.equal(f.calls[0].opt.body.get('file').type,'application/pdf');const payload=JSON.parse(f.calls[1].opt.body);assert.equal(payload.to,'5511999999999');assert.equal(payload.document.caption,input.message);assert.equal(payload.document.id,'media-1');assert.equal(f.stored.budgets[0].status,'Aguardando aprovação');assert.equal(f.stored.whatsapp.threads[0].messages.length,1);assert.equal((await deliverProposal(f.repo,input,config,{request:f.request})).status,'sent');assert.equal(f.calls.length,2);});
test('missing connection, expired quote, closed window and mismatched recipient prevent sending',()=>{const f=fixture(),s=proposalSnapshot(f.state,'b');assert.equal(deliveryEligibility(f.state,s,{}).ready,false);f.state.whatsapp.threads[0].lastInbound=Date.now()-86400001;assert.match(deliveryEligibility(f.state,s,config).reason,/24 horas/);f.state.whatsapp.threads[0].lastInbound=Date.now()-1000;f.state.whatsapp.threads[0].clientId='other';assert.equal(deliveryEligibility(f.state,s,config).ready,false);f.state.whatsapp.threads[0].clientId='c';s.b.validUntil='2000-01-01';assert.match(deliveryEligibility(f.state,s,config).reason,/venceu/);});
test('stale PDF and uncertain sends never silently retry or advance status',async()=>{const f=fixture();await assert.rejects(()=>deliverProposal(f.repo,{...f.input(),fingerprint:'old'},config,{request:f.request}),/mudou/);assert.equal(f.calls.length,0);let calls=0;const request=async()=>{calls++;throw Error('network');};await assert.rejects(()=>deliverProposal(f.repo,f.input(),config,{request}),/não foi confirmado/);assert.equal((await deliverProposal(f.repo,f.input(),config,{request})).status,'unknown');assert.equal(calls,1);assert.equal(f.stored.budgets[0].status,'Rascunho');});
test('two dominant brand colors are extracted without white background or transparent pixels',()=>{const B=globalThis.TravelProposalBrand,p=[];for(let i=0;i<100;i++)p.push(255,255,255,255);for(let i=0;i<50;i++)p.push(20,80,50,255);for(let i=0;i<25;i++)p.push(230,120,20,255);for(let i=0;i<100;i++)p.push(10,10,255,0);assert.deepEqual(B.palette(p),['#145032','#e67814']);assert.equal(B.ink('#ffffff'),'#14251e');assert.throws(()=>B.normalize({logo:'https://external/logo.svg'}));assert.throws(()=>B.normalize({primary:'red;display:none'}));});

test('agency gradient preserves contrast for light, dark and identical brand colors',()=>{const B=globalThis.TravelProposalBrand;for(const [primary,secondary] of [['#ef2950','#ef2950'],['#ffffff','#ffff00'],['#000000','#121212'],['#51daba','#ee6677']]){const theme=B.theme({primary,secondary});assert.equal(B.ink(theme.from),'#ffffff');assert.equal(B.ink(theme.to),'#ffffff');assert.match(theme.tint,/^#[a-f0-9]{6}$/);}assert.notEqual(B.theme({primary:'#ef2950',secondary:'#ef2950'}).from,B.theme({primary:'#ef2950',secondary:'#ef2950'}).to);});
