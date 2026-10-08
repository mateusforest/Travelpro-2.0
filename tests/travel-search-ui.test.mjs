import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=readFileSync(new URL('../dist/travel-search.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const provider={id:'test-hotels',name:'Fonte conectada',categories:['hotels','flights'],configured:true,implemented:true,status:'ready'};
const request=()=>({category:'hotels',origin:'',destination:'Lisboa',start:'2027-01-10',end:'2027-01-15',adults:2,childrenAges:[],rooms:1,currency:'BRL'});
const offer=(extra={})=>({id:'offer-1',provider:'test-hotels',source:'Hotel Example',category:'hotels',title:'Hotel Lisboa',sourceUrl:'https://example.test/hotel',capturedAt:new Date(Date.now()-30000).toISOString(),expiresAt:new Date(Date.now()+300000).toISOString(),requestSnapshot:request(),price:{amount:4200,currency:'BRL',basis:'stay',taxesIncluded:true},conditions:{cancellation:'Cancelamento até 08/01',mealPlan:'Café da manhã'},details:{rating:8.5},warnings:[],bookable:false,completeness:'complete',...extra});
const response=items=>({searchId:'s1',request:request(),offers:items??[offer()],providers:[{id:'test-hotels',name:'Fonte conectada',status:'success',offerCount:1,cached:false}],summary:{callsUsed:1,cacheHits:0},warnings:[]});

async function setup(t,options={}) {
  const dom=new JSDOM('<main id="host"></main>',{url:'https://travelpro.test/cotacao.html',runScripts:'outside-only'});
  t.after(()=>dom.window.close());const w=dom.window,root=w.document.querySelector('#host'),requests=[],chosen=[];
  w.eval(source);
  const context={api:{async request(path,optionsIn){requests.push({path,body:optionsIn?.body&&copy(optionsIn.body)});if(path.endsWith('/providers')){if(options.providerError)throw Error(options.providerError);return options.providersResponse??{providers:options.providers??[provider]};}if(options.error)throw Error(options.error);return options.search?options.search(path,optionsIn):response(options.offers);}},onChoose:(draft,offer)=>chosen.push({draft:copy(draft),offer:copy(offer)})};
  const find=selector=>root.querySelector(selector);
  const waitFor=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI timeout: '+root.textContent);};
  w.TravelSearch.mount(root,context);
  await waitFor(()=>!root.textContent.includes('Carregando fontes de pesquisa'));
  const input=(name,value,event='input')=>{const el=find(`[name="${name}"]`);assert.ok(el,name);el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));};
  const submit=()=>find('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const search=async()=>{input('destination','Lisboa');input('start','2027-01-10');input('end','2027-01-15');submit();await waitFor(()=>!find('.ts-spinner'));};
  return {w,root,context,requests,chosen,find,input,submit,search,waitFor};
}

test('no configured providers shows honest activation state, no illustrative prices and no search',async t=>{
  const ui=await setup(t,{providers:[{...provider,configured:false,status:'unconfigured'}]});
  assert.equal(ui.find('button[type="submit"]').disabled,true);
  assert.match(ui.root.textContent,/Nenhuma fonte conectada/);
  assert.match(ui.root.textContent,/cotações manuais continuam disponíveis/);
  assert.equal(ui.find('[name="provider"]').disabled,true);
  assert.equal(ui.find('.ts-card'),null);
  assert.equal(ui.requests.length,1);
});

test('search submits one structured request preserving children zero age and explicit call cap',async t=>{
  const ui=await setup(t);ui.input('childrenAges','0, 8');ui.input('maxCalls','4');ui.input('flexDays','1','change');
  await ui.search();
  assert.deepEqual(ui.requests[1],{path:'/travel-search',body:{...request(),childrenAges:[0,8],providers:['test-hotels'],flexDays:1,maxCalls:4,sort:'price'}});
  assert.equal(ui.find('.ts-card h3').textContent,'Hotel Lisboa');
  assert.match(ui.root.textContent,/Total da hospedagem/);
  assert.equal(ui.chosen.length,0);
});

test('invalid ages are rejected without issuing provider calls',async t=>{
  const ui=await setup(t);ui.input('childrenAges','3 anos');await ui.search();
  assert.match(ui.find('[role="alert"]').textContent,/idades separadas por vírgula/);
  assert.equal(ui.requests.length,1);
  ui.input('childrenAges','18');ui.submit();assert.match(ui.find('[role="alert"]').textContent,/0 e 17/);
  assert.equal(ui.requests.length,1);
});

test('partial outage is not represented as sold out and cached provenance retains original time',async t=>{
  const capturedAt='2026-10-08T01:23:45Z';const data=response([offer({capturedAt,cached:true})]);
  data.providers.push({id:'down',name:'Outra fonte',status:'timeout',message:'Consulta expirou',offerCount:0});
  data.summary.cacheHits=1;
  const ui=await setup(t,{search:()=>data});await ui.search();
  assert.match(ui.root.textContent,/respostas parciais/);
  assert.match(ui.root.textContent,/Tempo esgotado/);
  assert.match(ui.root.textContent,/resultado reaproveitado/);
  assert.ok(ui.root.textContent.includes(new ui.w.Date(capturedAt).toLocaleString('pt-BR')));
  assert.equal(ui.root.querySelectorAll('.ts-card').length,1);
});

test('all failures shows incomplete research rather than claiming no availability',async t=>{
  const data=response([]);data.providers=[{id:'down',status:'error',message:'Indisponível'}];
  const ui=await setup(t,{search:()=>data});await ui.search();
  assert.match(ui.root.textContent,/Não foi possível completar a pesquisa/);
  assert.match(ui.root.textContent,/não significa ausência de disponibilidade/);
});

test('network and malformed response errors retain request and unlock retry',async t=>{
  const ui=await setup(t,{error:'A fonte não respondeu.'});await ui.search();
  assert.equal(ui.find('[role="alert"]').textContent,'A fonte não respondeu.');
  assert.equal(ui.find('[name="destination"]').value,'Lisboa');
  assert.equal(ui.find('button[type="submit"]').disabled,false);
  ui.context.api.request=async()=>null;ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  assert.match(ui.find('[role="alert"]').textContent,/resposta da pesquisa veio incompleta/);
});

test('remote strings display literally, unsafe links and null records are ignored',async t=>{
  const attack='<img src=x onerror=alert(1)><script>window.injected=true</script>';
  const ui=await setup(t,{offers:[null,offer({title:attack,source:attack,sourceUrl:'javascript:alert(1)',conditions:{cancellation:attack},warnings:[attack,{},null]})]});
  await ui.search();assert.equal(ui.root.querySelector('img,script'),null);assert.equal(ui.w.injected,undefined);
  assert.equal(ui.find('.ts-card h3').textContent,attack);assert.equal(ui.find('.ts-card a'),null);
  assert.ok(ui.root.textContent.includes(attack));
});

test('documented total opens editable review only on choice and never assigns guaranteed validity or net cost',async t=>{
  const ui=await setup(t);await ui.search();ui.find('[data-ts="choose"]').click();
  assert.equal(ui.chosen.length,1);const {draft}=ui.chosen[0];
  assert.equal(draft.total,4200);assert.equal(draft.travelers,2);assert.equal(draft.valid,undefined);assert.equal(draft.netCost,undefined);
  assert.match(draft.terms,/Não representa reserva ou emissão/);assert.match(draft.terms,/https:\/\/example.test\/hotel/);
  assert.equal(ui.requests.length,2,'review is local and does not book or save');
});

test('unknown taxes require explicit warning in review draft and remain visible on result',async t=>{
  const ui=await setup(t,{offers:[offer({price:{amount:4200,currency:'BRL',basis:'stay',taxesIncluded:null}})]});await ui.search();
  assert.match(ui.root.textContent,/taxas não informadas/);const choose=ui.find('[data-ts="choose"]');assert.equal(choose.textContent,'Revisar cotação');choose.click();
  assert.match(ui.chosen[0].draft.terms,/não confirma todos os impostos e taxas/);
  assert.match(ui.chosen[0].draft.terms,/Conferir o valor final antes de enviar/);
});

test('from prices, expired offers, unknown occupancy and foreign currencies cannot become group totals',async t=>{
  const items=[offer({id:'from',price:{amount:100,currency:'BRL',basis:'from',taxesIncluded:true}}),offer({id:'expired',expiresAt:'2020-01-01T00:00:00Z'}),offer({id:'occupancy',requestSnapshot:{...request(),childrenAges:undefined}}),offer({id:'currency',price:{amount:100,currency:'EUR',basis:'stay',taxesIncluded:true}}),offer({id:'partial',completeness:'selection_required'}),offer({id:'unknown-price',price:null})];
  const ui=await setup(t,{offers:items});await ui.search();
  assert.equal(ui.root.querySelectorAll('[data-ts="choose"]').length,0);assert.match(ui.root.textContent,/Preço não informado/);
  for(const item of items)assert.equal(ui.w.TravelSearch.prefill(item),null);
  assert.equal(ui.root.querySelectorAll('.ts-card a').length,items.length);
});

test('shortlist limits comparison to three and supports filter without additional API calls',async t=>{
  const ui=await setup(t,{offers:[0,1,2,3].map(i=>offer({id:'offer-'+i,title:'Hotel '+i}))});await ui.search();
  for(let i=0;i<4;i++){const box=ui.find(`[data-ts-compare="${i}"]`);box.checked=true;box.dispatchEvent(new ui.w.Event('change',{bubbles:true}));}
  assert.equal(ui.root.querySelectorAll('[data-ts-compare]:checked').length,3);
  assert.match(ui.root.textContent,/até três opções/);
  assert.equal(ui.root.querySelectorAll('.ts-comparison thead th').length,4);
  ui.input('result-filter','Hotel 2');assert.equal(ui.root.querySelectorAll('.ts-card').length,1);assert.equal(ui.requests.length,2);
  ui.find('[data-ts="clear-compare"]').click();assert.equal(ui.find('.ts-comparison'),null);
});

test('re-mount preserves search state without provider refetch or persistent storage',async t=>{
  const ui=await setup(t);await ui.search();ui.root.remove();const next=ui.w.document.createElement('main');ui.w.document.body.append(next);
  ui.w.TravelSearch.mount(next,ui.context);
  assert.equal(next.querySelector('[name="destination"]').value,'Lisboa');assert.equal(next.querySelector('.ts-card h3').textContent,'Hotel Lisboa');
  assert.equal(ui.requests.length,2);assert.equal(ui.w.localStorage.length,0);assert.equal(ui.w.sessionStorage.length,0);
});

test('flight mode accepts one-way request with IATA airports and retains a blank return date',async t=>{
  const ui=await setup(t);ui.find('[data-category="flights"]').click();ui.input('origin','poa');ui.input('destination','gru');ui.input('start','2027-01-10');ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  assert.equal(ui.requests[1].body.category,'flights');assert.equal(ui.requests[1].body.origin,'POA');assert.equal(ui.requests[1].body.destination,'GRU');assert.equal(ui.requests[1].body.end,'');
});

test('provider discovery failure is visible outside advanced disclosure and can be retried',async t=>{
  const ui=await setup(t,{providerError:'Falha temporária.'});
  assert.match(ui.root.textContent,/Não foi possível carregar as fontes/);assert.equal(ui.find('button[type="submit"]').disabled,true);
  ui.context.api.request=async()=>({providers:[provider]});ui.find('[data-ts="reload"]').click();await ui.waitFor(()=>!ui.find('button[type="submit"]').disabled);
  assert.equal(ui.find('[name="provider"]').checked,true);
});

test('local price sorting uses server comparison groups and preserves unknown bases',async t=>{
  const items=[offer({id:'a',title:'Known high',price:{amount:900,currency:'BRL',basis:'stay'},comparison:{priceGroup:'same'}}),offer({id:'b',title:'Unknown cheap',price:{amount:1,currency:'BRL',basis:'unknown'}}),offer({id:'c',title:'Known low',price:{amount:400,currency:'BRL',basis:'stay'},comparison:{priceGroup:'same'}}),offer({id:'d',title:'Other date',price:{amount:50,currency:'BRL',basis:'stay'},comparison:{priceGroup:'other'}})];
  const ui=await setup(t,{offers:items});await ui.search();
  assert.deepEqual([...ui.root.querySelectorAll('.ts-card h3')].map(el=>el.textContent),['Known low','Unknown cheap','Known high','Other date']);
});

test('quality ranking only reorders ratings on a common documented scale',async t=>{
  const ui=await setup(t,{offers:[offer({id:'a',title:'Five scale',details:{rating:4.8,ratingScale:5}}),offer({id:'b',title:'Ten lower',details:{rating:8,ratingScale:10}}),offer({id:'c',title:'Missing scale',details:{rating:99}}),offer({id:'d',title:'Ten higher',details:{rating:9,ratingScale:10}})]});await ui.search();ui.input('result-sort','quality','change');
  assert.deepEqual([...ui.root.querySelectorAll('.ts-card h3')].map(el=>el.textContent),['Five scale','Ten higher','Missing scale','Ten lower']);
});

test('switching category clears old results and selections and uses server room limit',async t=>{
  const ui=await setup(t);assert.equal(ui.find('[name="rooms"]').max,'4');await ui.search();
  ui.find('[data-category="flights"]').click();assert.equal(ui.find('.ts-card'),null);assert.equal(ui.find('.ts-comparison'),null);assert.equal(ui.find('[name="destination"]').value,'');
});
