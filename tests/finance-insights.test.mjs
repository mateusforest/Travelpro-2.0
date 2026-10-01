import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createApp} from '../backend/app.mjs';
import {entry,filters,report} from '../backend/finance.mjs';
import {enrichEntries,operationRows,operationMetadata,insightReport,csvDocument} from '../backend/finance-insights.mjs';
const state={clients:[{id:'c1',name:'Ana'},{id:'c2',name:'Bia',referredBy:'c1'}],trips:[{id:'t1',title:'Portugal',client:'c1',value:10000,status:'Confirmada',start:'2026-10-01'},{id:'t2',title:'Chile',client:'c2',value:3000,status:'Em cotação',start:'2026-10-01'}]};
test('confirmed operations appear once without creating cash entries or inventing profit',()=>{
 const raw=structuredClone(state);const a=operationRows(state,[],[]),b=operationRows(state,[],[]);assert.deepEqual(a,b);assert.deepEqual(state,raw);assert.equal(a.length,1);assert.equal(a[0].volumeCents,1000000);assert.equal(a[0].commissionCents,null);assert.equal(a[0].resultCents,null);assert.equal(a[0].receivedCents,0);
 const m=operationMetadata({commissionMode:'percent',commissionRate:'12.5',consultancy:'200',costs:'50'},state.trips[0]);const o=operationRows(state,[m],[])[0];assert.equal(o.commissionCents,125000);assert.equal(o.revenueCents,145000);assert.equal(o.resultCents,140000);
 assert.equal(operationRows({...state,trips:[{...state.trips[0],status:'Cancelada',sales:{fulfillment:{reservation:'confirmed'}}}]},[m],[]).length,0);
 assert.throws(()=>operationMetadata({commissionMode:'percent',commissionRate:''},state.trips[0]));assert.throws(()=>operationMetadata({commissionMode:'percent',commissionRate:101},state.trips[0]));
 assert.equal(operationRows({...state,trips:[{...state.trips[0],value:0}]},[m],[])[0].commissionCents,null);
 assert.equal(operationRows(state,[operationMetadata({commission:'0',costs:'0'},state.trips[0])],[])[0].resultCents,0);
});
test('Granatum links preserve source and avoid counting consultancy as commission twice',()=>{
 const e={id:'g1',source:'granatum',type:'commission',amountCents:20000,payments:[{amountCents:20000,date:'2026-10-01'}],dueDate:'2026-10-01',competenceDate:'2026-10-01'};
 const original=structuredClone(e),links=[{kind:'entry-link',entryId:'g1',tripId:'t1',clientId:'c1',serviceType:'consultancy',version:1}];const enriched=enrichEntries([e],links,state);assert.deepEqual(e,original);const m=operationMetadata({commission:'1000',costs:'0'},state.trips[0]);const o=operationRows(state,[m],enriched)[0];assert.equal(o.commissionCents,100000);assert.equal(o.consultancyCents,20000);assert.equal(o.receivedCents,20000);assert.equal(o.resultCents,120000);
 assert.equal(report(enriched,[],filters({from:'2026-10-01',to:'2026-10-31',type:'consultancy',clientId:'c1'})).total,1);assert.equal(report(enriched,[],filters({from:'2026-10-01',to:'2026-10-31',type:'commission'})).total,0);
 const unlinked=enrichEntries(enriched,[{...links[0],tripId:'',clientId:'',serviceType:''}],state)[0];assert.equal(unlinked.tripId,'');assert.equal(unlinked.clientId,'');assert.equal(unlinked.serviceType,'');
});
test('consultancy is cash income; reporting respects period, client, trip and referrals',()=>{
 const e=entry({title:'Consultoria',type:'consultancy',amount:'150',dueDate:'2026-10-01',tripId:'t1',clientId:'c1'},[]);assert.equal(e.type,'income');assert.equal(e.serviceType,'consultancy');assert.equal(report([e],[],filters({from:'2026-10-01',to:'2026-10-31'})).summary.receivable,15000);
 const r=insightReport(state,[],[],{from:'2026-10-01',to:'2026-10-31',clientId:'c1'});assert.equal(r.operations.length,1);assert.equal(r.clients[0].referrals,1);assert.equal(r.clients[0].lifetimePurchases,1);
 assert.equal(insightReport(state,[],[],{from:'2026-11-01',to:'2026-11-30'}).operations.length,0);assert.equal(insightReport(state,[],[],{allTime:true,tripId:'t1'}).clients.length,1);assert.match(csvDocument(['Cliente'],[['=HYPERLINK("bad")']]),/"'=HYPERLINK/);
});
test('real UI and API save commission, export filtered reports, link entries and retain tenant isolation',async t=>{
 const app=createApp({directory:mkdtempSync(path.join(tmpdir(),'travelpro-insights-')),dist:path.resolve('dist'),env:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);
 function session(){let cookie='',csrf='';return {async request(p,{method='GET',body}={}){const r=await fetch(origin+'/api'+p,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const d=await r.json();if(d.csrf)csrf=d.csrf;if(!r.ok)throw Object.assign(Error(d.error),{status:r.status});return d;}};}
 const api=session(),other=session();for(const [a,email] of [[api,'one@finance.invalid'],[other,'two@finance.invalid']])await a.request('/auth/register',{method:'POST',body:{name:'Teste',agency:'Teste',email,password:'isolated-test-password'}});
 const ws=await api.request('/workspace');ws.state.clients=state.clients.map(c=>({...c,phone:'',email:''}));ws.state.trips=state.trips.map(t=>({...t,destination:t.title,end:'2026-10-10',travelers:1}));await api.request('/workspace',{method:'PUT',body:ws});
 const dom=new JSDOM('<main data-fin-root><p data-fin-notice></p></main>',{url:origin,runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,d=w.document;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.eval(readFileSync('dist/finance.js','utf8'));w.TravelFinance.mount(d.querySelector('main'),{api,trips:ws.state.trips});
 async function wait(predicate){for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error(d.body.textContent);}
 const click=(action,id)=>{const el=d.querySelector(`[data-fin-action="${action}"]${id?`[data-id="${id}"]`:''}`);assert.ok(el,action);el.click();};
 await wait(()=>d.querySelector('[data-fin-action="new"]'));click('tab','operations');await wait(()=>d.querySelector('.fin-insight-filters'));const f=d.querySelector('[data-fin-form="filter"]');f.elements.allTime.value='1';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>!f.isConnected);click('operation','t1');const form=d.querySelector('[data-fin-form="operation"]');form.elements.commissionMode.value='percent';form.elements.commissionMode.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(form.elements.commission.disabled);form.elements.commissionRate.value='10';form.elements.costs.value='0';form.elements.consultancy.value='50';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>!form.isConnected);
 let r=await api.request('/finance/insights?allTime=1');assert.equal(r.operations[0].resultCents,105000);assert.equal((await api.request('/finance')).total,0);
 await assert.rejects(other.request('/finance/operations/t1',{method:'PUT',body:{version:0,commission:100}}),e=>e.status===404);await assert.rejects(api.request('/finance/operations/t1',{method:'PUT',body:{version:0,commission:100}}),e=>e.status===409);
 await api.request('/finance/entries',{method:'POST',body:{requestId:'consultancy-test-00001',title:'Consultoria Portugal',type:'consultancy',amount:'80',dueDate:'2026-10-01',tripId:'t1',clientId:'c1'}});r=await api.request('/finance/insights?allTime=1');assert.equal(r.operations[0].consultancyCents,8000);assert.equal(r.operations[0].resultCents,108000);
 const ex=await api.request('/finance/export?from=2026-10-01&to=2026-10-31&type=consultancy&clientId=c1&tripId=t1');assert.match(ex.csv,/Consultoria Portugal/);assert.match(ex.csv,/Ana/);assert.match((await api.request('/finance/insights?allTime=1&export=clients')).csv,/Indicado por/);
 const before=await api.request('/finance/entries/consultancy-test-00001-1');await assert.rejects(api.request('/finance/entries/'+before.id+'/link',{method:'PUT',body:{version:0,tripId:'t1',clientId:'c2'}}),e=>e.status===422);await api.request('/finance/entries/'+before.id+'/link',{method:'PUT',body:{version:0,tripId:'t1',clientId:'c1',serviceType:'commission'}});assert.equal((await api.request('/finance/entries/'+before.id)).amountCents,before.amountCents);assert.equal((await api.request('/finance?from=2026-10-01&to=2026-10-31&type=commission')).total,1);
 click('reports');assert.ok(d.querySelector('[data-fin-form="report"] [name=clientId]'));assert.ok(d.querySelector('[data-fin-form="report"] [name=tripId]'));
});
