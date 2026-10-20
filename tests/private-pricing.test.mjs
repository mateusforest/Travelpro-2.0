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
test('search prefills a review draft without saving, supplier validity or fabricated net cost',t=>{
  const dom=new JSDOM('<div id="dialog"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
  for(const name of ['sales-flow.js','sales-flow-ui.js'])w.eval(readFileSync(new URL('../dist/'+name,import.meta.url),'utf8'));
  const state={quickQuotes:[]};let title='';
  const ui=w.TravelSalesUI.create({state,esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:x=>String(x),dialog:(name,html)=>{title=name;w.document.querySelector('#dialog').innerHTML=html;}});
  ui.quickForm('',{name:'Hotel encontrado',origin:'',destination:'Lisboa',start:'2099-01-02',end:'2099-01-05',travelers:2,total:1500,reference:'Busca',inclusions:'Hospedagem',terms:'Impostos precisam ser conferidos.'});
  const form=w.document.querySelector('form');assert.equal(title,'Revisar cotação da busca');assert.equal(form.elements.total.value,'1500');assert.equal(form.elements.name.value,'Hotel encontrado');assert.equal(form.elements.valid.value,'');assert.equal(form.elements.netCost.value,'');assert.equal(form.elements.priceMethod.value,'final');assert.equal(form.elements.id.value,'');assert.match(form.elements.terms.value,/Impostos/);assert.equal(state.quickQuotes.length,0);
});

test('using a researched price as cost requires an explicit agency action and recalculates immediately',t=>{
  const dom=new JSDOM('<div id="dialog"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
  for(const name of ['sales-flow.js','sales-flow-ui.js'])w.eval(readFileSync(new URL('../dist/'+name,import.meta.url),'utf8'));
  const state={quickQuotes:[]};const ui=w.TravelSalesUI.create({state,esc:x=>String(x??''),money:x=>String(x),dialog:(_,html)=>w.document.querySelector('#dialog').innerHTML=html});
  ui.quickForm('',{name:'Hotel',destination:'Lisboa',start:'2027-01-10',end:'2027-01-15',travelers:2,total:1500,inclusions:'Hotel'});
  const form=w.document.querySelector('form');assert.equal(form.elements.origin.required,false);assert.equal(form.elements.end.required,false);assert.equal(form.elements.netCost.value,'');
  form.elements.priceMethod.value='markup';form.elements.priceMethod.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(form.elements.netCost.value,'');
  form.querySelector('[data-pricing-use-total]').click();assert.equal(form.elements.netCost.value,'1500');assert.equal(form.elements.total.value,'1650.00');assert.equal(state.quickQuotes.length,0);
});

test('quick proposal links an immutable private quote while the customer budget contains only sale values',()=>{
  const s=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url)));s.agency='Agência';
  const client={id:'c',name:'Ana',phone:'',email:''};s.clients=[client];
  const quote={id:'quick',name:'Lisboa',request:{origin:'',destination:'Lisboa',start:'2099-12-01',end:'',travelers:2},source:'manual',currency:'BRL',validUntil:'2099-11-30',reference:'Hotel',offers:[{name:'Hospedagem',total:11000,inclusions:['Hotel'],terms:'Conferir disponibilidade'}],privatePricing:price(),updatedAt:'2026-10-20T10:00:00Z'};
  const before=structuredClone(quote);const built=F.buildQuickProposal(quote,client,{trip:'t',quote:'q',budget:'b'});
  assert.deepEqual(quote,before);assert.equal(built.trip.sales.quotes[0].privatePricing.result.costCents,1000000);assert.equal(built.budget.items[0].unit,11000);assert.equal(built.budget.end,quote.request.start);
  assert.doesNotMatch(JSON.stringify(built.budget),/privatePricing|costCents|contributionCents/);s.quickQuotes=[quote];s.trips=[built.trip];s.budgets=[built.budget];validateState(s);
  assert.throws(()=>F.buildQuickProposal({...quote,validUntil:'2000-01-01'},client,{trip:'t2',quote:'q2',budget:'b2'}),/venceu/);
  assert.throws(()=>F.buildQuickProposal(quote,{...client,deletedAt:'2026-01-01'},{trip:'t2',quote:'q2',budget:'b2'}),/cliente ativo/);
});

test('a failed proposal save can be retried without duplicating a newly selected client or proposal',async t=>{
  const dom=new JSDOM('<div id="dialog"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;w.structuredClone=structuredClone;
  for(const name of ['sales-flow.js','sales-flow-ui.js'])w.eval(readFileSync(new URL('../dist/'+name,import.meta.url),'utf8'));
  const quote={id:'quick',name:'Lisboa',request:{origin:'',destination:'Lisboa',start:'2099-12-01',end:'2099-12-05',travelers:2},source:'manual',currency:'BRL',validUntil:'2099-11-30',reference:'Hotel',offers:[{name:'Hotel',total:1100,inclusions:['Hotel'],terms:''}],updatedAt:'2026-10-20T10:00:00Z'};
  const state={agency:'Agência',quickQuotes:[quote],clients:[],trips:[],budgets:[]};let saves=0,n=0,opened='';
  const ui=w.TravelSalesUI.create({state,esc:String,uid:prefix=>prefix+(++n),flush:async()=>{if(++saves===1)throw Error('Falha ao salvar');},close:()=>{},nav:path=>{opened=path;}});
  const data={id:'quick',revision:quote.updatedAt,client:'new',clientName:'Ana'};
  await assert.rejects(()=>ui.submitForm('sales-quick-proposal',data),/Falha ao salvar/);assert.equal(opened,'');
  await ui.submitForm('sales-quick-proposal',data);assert.equal(state.clients.length,1);assert.equal(state.trips.length,1);assert.equal(state.budgets.length,1);assert.equal(opened,'orcamento/'+state.budgets[0].id);
});
