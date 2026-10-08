import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {salesFlow as F,validateState} from '../backend/validation.mjs';
const price=(changes={})=>F.priceQuote({mode:'markup',cost:'10000',rate:'10',serviceFee:'0',paymentPercent:'0',paymentFixed:'0',...changes});
test('markup, target margin and processor costs remain distinct',()=>{
  assert.deepEqual(price().result,{costCents:1000000,saleCents:1100000,paymentFeeCents:0,contributionCents:100000});
  assert.equal(price({mode:'margin'}).result.saleCents,1111112);
  const p=price({paymentPercent:'3',paymentFixed:'1',serviceFee:'200'}).result;
  assert.equal(p.saleCents,1154743);assert.equal(p.paymentFeeCents,34742);assert.equal(p.contributionCents,120001);
  assert.equal(price({cost:'0.01',rate:'0',paymentPercent:'3'}).result.saleCents,2);
  for(const invalid of [{cost:''},{cost:-1},{cost:NaN},{rate:'1.001'},{mode:'margin',rate:'98',paymentPercent:'2'},{paymentPercent:'100'},{cost:'100000000',rate:'1000'}])assert.throws(()=>price(invalid));
});
test('server rejects forged pricing and customer proposals omit private costs',()=>{
  const s=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url)));s.agency='Agência';s.clients=[{id:'c',name:'Ana',phone:'',email:''}];
  const q={id:'q',source:'manual',trip:'t',client:'c',destination:'Roma',start:'2099-12-01',end:'2099-12-10',travelers:2,currency:'BRL',validUntil:'2099-11-30',reference:'Hotel',offers:[{name:'Hospedagem',total:11000,inclusions:['Hotel'],terms:''}],privatePricing:price()};
  const t={id:'t',client:'c',title:'Itália',destination:'Roma',start:q.start,end:q.end,travelers:2,value:0,sales:{quotes:[q]}};s.trips=[t];
  validateState(s);const b=F.buildBudget(t,q,0,'b');assert.equal(b.items[0].unit,11000);assert.equal('privatePricing' in b,false);assert.equal(JSON.stringify(b).includes('costCents'),false);assert.equal('privatePricing' in F.normalizeQuote(q),false);
  q.offers[0].total=11001;assert.throws(()=>validateState(s),/não fecham/);q.offers[0].total=11000;q.privatePricing.result.contributionCents=999999;assert.throws(()=>validateState(s),/não fecham/);
});
test('agency can save, reopen, recalculate and export a quote without private amounts',async t=>{
  const dom=new JSDOM('<div id="dialog"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;w.structuredClone=structuredClone;
  for(const name of ['sales-flow.js','sales-flow-ui.js','portal-fields.js'])w.eval(readFileSync(new URL('../dist/'+name,import.meta.url),'utf8'));
  const state={agency:'Agência',trips:[],clients:[],budgets:[]};let exported='';let n=0;
  const ui=w.TravelSalesUI.create({state,esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:x=>'R$ '+x.toFixed(2),dialog:(_,html)=>w.document.querySelector('#dialog').innerHTML=html,uid:()=>String(++n),flush:async()=>{},close:()=>{},render:()=>{},download:(_,html)=>{exported=html;}});
  ui.quickForm();w.TravelFields.enhance();let form=w.document.querySelector('form');form.elements.priceMethod.value='markup';form.elements.priceMethod.dispatchEvent(new w.Event('change',{bubbles:true}));
  form.elements.netCost.value='10000';form.elements.netCost.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(form.elements.total.value,'11000.00');assert.equal(form.querySelector('.portal-currency input').readOnly,true);
  const data={...Object.fromEntries(new w.FormData(form)),name:'Itália',origin:'Porto Alegre',destination:'Roma',start:'2099-12-01',end:'2099-12-10',valid:'2099-11-30',travelers:'2',inclusions:'Hotel',reference:'Hotel direto'};
  await ui.submitForm('sales-quick',data);assert.equal(state.quickQuotes[0].offers[0].total,11000);assert.equal(state.quickQuotes[0].privatePricing.result.costCents,1000000);
  assert.match(w.document.querySelector('#dialog').textContent,/Somente para a agência/);
  await ui.action('sales-quick-download','1');assert.match(exported,/11000.00/);assert.doesNotMatch(exported,/R\$ 10000\.00|R\$ 1000\.00|costCents|Somente para a agência|Resultado previsto/);
  ui.quickForm('1');assert.equal(w.document.querySelector('[name=netCost]').value,'10000');
  await ui.submitForm('sales-quick',{...data,id:'1',priceMethod:'final',total:'12000'});assert.equal(state.quickQuotes[0].privatePricing,undefined);assert.equal(state.quickQuotes[0].offers[0].total,12000);
});
