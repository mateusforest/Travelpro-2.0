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
  if(options.locations)w.eval(readFileSync(new URL('../dist/travel-locations.js',import.meta.url),'utf8'));
  w.eval(source);
  const context={api:{async request(path,optionsIn){requests.push({path,body:optionsIn?.body&&copy(optionsIn.body)});if(path.endsWith('/providers')){if(options.providerError)throw Error(options.providerError);return options.providersResponse??{providers:options.providers??[provider]};}if(options.error)throw Error(options.error);return options.search?options.search(path,optionsIn):response(options.offers);}},onChoose:(draft,offer)=>chosen.push({draft:copy(draft),offer:copy(offer)})};
  if(options.plans)context.plans={request:options.plans};if(options.agencyId)context.agencyId=options.agencyId;
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
  assert.deepEqual(ui.requests[1],{path:'/travel-search',body:{...request(),mode:'quote',childrenAges:[0,8],providers:['test-hotels'],flexDays:1,maxCalls:4,sort:'price'}});
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

test('whole trip accepts cities and optional paired airports and lists own collectors without keys',async t=>{
  const native={...provider,id:'native-hotel',name:'Coletor de hospedagem',kind:'native',requiresKey:false,categories:['hotels']};
  const ui=await setup(t,{providers:[native,{...provider,id:'native-activity',kind:'native',categories:['activities','tickets']},provider]});
  assert.match(ui.root.textContent,/Coleta direta · Pronto para consultar/);
  assert.match(ui.root.textContent,/Fonte conectada · Pronto para consultar/);
  for(const category of ['hotels','flights','activities','tickets','cars','transfers','trip'])assert.ok(ui.find(`[data-category="${category}"]`));
  ui.find('[data-category="trip"]').click();ui.input('origin','Porto Alegre');ui.input('destination','Lisboa');ui.input('start','2027-01-10');ui.input('end','2027-01-15');ui.input('originAirport','poa');ui.input('destinationAirport','lis');ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  const body=ui.requests[1].body;assert.equal(body.category,'trip');assert.equal(body.origin,'Porto Alegre');assert.equal(body.destination,'Lisboa');assert.equal(body.originAirport,'POA');assert.equal(body.destinationAirport,'LIS');
  assert.deepEqual(body.providers,['native-hotel','native-activity','test-hotels']);
  ui.input('destinationAirport','');ui.submit();assert.match(ui.find('[role="alert"]').textContent,/dois aeroportos/);assert.equal(ui.requests.length,2);
});

test('published prices are separated, show their dates and evidence, and never prefill as dated group totals',async t=>{
  const published=offer({id:'published',title:'Voo anunciado',category:'flights',price:{amount:890,currency:'BRL',basis:'round_trip'},details:{priceKind:'published',publishedStart:'2027-03-03',publishedEnd:'2027-03-11',priceScope:'Por pessoa',requestedDatesMatched:false},completeness:'complete',requestSnapshot:{...request(),category:'flights',origin:'POA',destination:'LIS'},conditions:{passengerPriceScope:'all_travelers'},evidence:{documentUrl:'https://example.test/fare',sha256:'abc123',parserVersion:'native-v1',jsonPath:'$.fare.amount',rawPrice:'890',rawCurrency:'BRL'}});
  const ui=await setup(t,{offers:[offer(),published]});await ui.search();
  assert.equal(ui.root.querySelectorAll('[data-price-kind="published"] .ts-card').length,1);assert.equal(ui.root.querySelectorAll('[data-price-kind="quote"] .ts-card').length,1);
  const card=ui.find('[data-offer="1"]');assert.match(card.querySelector('.ts-request-label').textContent,/2027-03-03 a 2027-03-11/);assert.doesNotMatch(card.querySelector('.ts-request-label').textContent,/2027-01/);
  assert.match(card.textContent,/Não confirma disponibilidade/);assert.match(card.textContent,/abc123/);assert.equal(card.querySelector('[data-ts="choose"]'),null);assert.equal(ui.w.TravelSearch.prefill(published),null);
  ui.input('mode','opportunities','change');await ui.search();assert.equal(ui.requests[2].body.mode,'opportunities');
});

test('organizer keeps selections across categories, excludes published rates from subtotals and allows removal',async t=>{
  const activity=offer({id:'walk',title:'Passeio publicado',category:'activities',price:{amount:90,currency:'BRL',basis:'from'},details:{priceKind:'published'}});
  const ui=await setup(t,{offers:[offer(),activity]});await ui.search();
  ui.find('[data-ts="add-plan"][data-index="0"]').click();ui.find('[data-ts="add-plan"][data-index="1"]').click();
  assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,2);assert.equal(ui.find('[data-ts="add-plan"][data-index="0"]').disabled,true);
  assert.match(ui.find('.ts-plan-subtotal').textContent,/4.200,00/);assert.doesNotMatch(ui.find('.ts-plan-subtotal').textContent,/4.290,00/);assert.match(ui.find('.ts-planner').textContent,/total pendente/);
  ui.find('[data-category="activities"]').click();assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,2);assert.equal(ui.find('.ts-card'),null);
  ui.find('[data-ts="remove-plan"][data-index="0"]').click();assert.equal(ui.find('.ts-plan-subtotal'),null);assert.match(ui.find('.ts-planner').textContent,/O total da viagem está pendente/);
  assert.equal(ui.w.localStorage.length,0);assert.equal(ui.w.sessionStorage.length,0);assert.equal(ui.requests.length,2);
  ui.find('[data-ts="clear-plan"]').click();assert.equal(ui.find('.ts-planner'),null);
});

test('organizer never adds hotel alternatives and keeps different dates in separate subtotals',async t=>{
  const items=[offer(),offer({id:'alternative',title:'Outra hospedagem'}),offer({id:'other-dates',title:'Outro período',requestSnapshot:{...request(),start:'2027-02-10',end:'2027-02-15'}})];
  const ui=await setup(t,{offers:items});await ui.search();ui.find('[data-ts="add-plan"][data-index="0"]').click();ui.find('[data-ts="add-plan"][data-index="1"]').click();
  assert.equal(ui.find('.ts-plan-subtotal'),null);assert.match(ui.find('.ts-planner').textContent,/alternativas da mesma categoria/);
  ui.find('[data-ts="remove-plan"][data-index="1"]').click();ui.find('[data-ts="add-plan"][data-index="2"]').click();
  assert.equal(ui.root.querySelectorAll('.ts-plan-subtotal').length,2);assert.match(ui.find('.ts-planner').textContent,/subtotais separados/);assert.doesNotMatch(ui.find('.ts-planner').textContent,/8.400,00/);
});

test('whole trip organizer can combine one dated hotel and an all-travelers flight with the same party and dates',async t=>{
  const flight=offer({id:'flight',title:'Voo para Lisboa',category:'flights',requestSnapshot:{...request(),category:'flights',origin:'POA',destination:'LIS'},price:{amount:6000,currency:'BRL',basis:'round_trip',taxesIncluded:true},conditions:{passengerPriceScope:'all_travelers'}});
  const data={...response([offer(),flight]),request:{...request(),category:'trip',origin:'Porto Alegre',originAirport:'POA',destinationAirport:'LIS'}};
  const ui=await setup(t,{search:()=>data});await ui.search();ui.find('[data-ts="add-plan"][data-index="0"]').click();ui.find('[data-ts="add-plan"][data-index="1"]').click();
  assert.equal(ui.root.querySelectorAll('.ts-plan-subtotal').length,1);assert.match(ui.find('.ts-plan-subtotal').textContent,/10.200,00/);assert.doesNotMatch(ui.find('.ts-plan-subtotal').textContent,/confirmado/i);
});

test('organizer bounds selection at twelve without booking or persisting offers',async t=>{
  const ui=await setup(t,{offers:Array.from({length:13},(_,i)=>offer({id:'item-'+i,title:'Opção '+i}))});await ui.search();
  for(let i=0;i<13;i++)ui.find(`[data-ts="add-plan"][data-index="${i}"]`).click();
  assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,12);assert.match(ui.root.textContent,/até 12 opções/);assert.equal(ui.requests.length,2);
});

test('organizer exports research references locally without private pricing fields',async t=>{
  const ui=await setup(t,{offers:[offer({privatePricing:{netCost:3500,margin:25},netCost:3500})]});await ui.search();ui.find('[data-ts="add-plan"]').click();
  let blob,filename;ui.w.URL.createObjectURL=value=>{blob=value;return 'blob:local';};ui.w.URL.revokeObjectURL=()=>{};ui.w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
  ui.find('[data-ts="export-plan"]').click();
  const raw=await new Promise((resolve,reject)=>{const reader=new ui.w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(blob);});
  const data=JSON.parse(raw);assert.equal(filename,'travelpro-organizador.json');assert.equal(data.items[0].price.amount,4200);assert.equal(data.items[0].sourceUrl,'https://example.test/hotel');assert.doesNotMatch(raw,/netCost|privatePricing|margin/);assert.equal(ui.requests.length,2);
});

test('Laghetto published hotel drills into dated room search without changing occupancy or creating a booking',async t=>{
  const ui=await setup(t,{providers:[{...provider,id:'native-laghetto',kind:'native',categories:['hotels']}],offers:[offer({provider:'native-laghetto',title:'Hotel da rede',details:{priceKind:'published',hotelId:'1234'}})]});
  await ui.search();assert.ok(ui.find('[data-ts="hotel-rooms"]'));
  ui.context.api.request=async(path,options)=>{ui.requests.push({path,body:copy(options.body)});return response([offer({provider:'native-laghetto',title:'Quarto Duplo',requestSnapshot:{...request(),hotelId:'1234'}})]);};
  ui.find('[data-ts="hotel-rooms"]').click();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  assert.deepEqual(ui.requests[2],{path:'/travel-search',body:{...request(),category:'hotels',mode:'quote',providers:['native-laghetto'],hotelId:'1234',flexDays:0,maxCalls:1,sort:'price'}});
  assert.equal(ui.find('.ts-card h3').textContent,'Quarto Duplo');assert.equal(ui.find('[data-ts="hotel-rooms"]'),null);assert.equal(ui.chosen.length,0);assert.equal(ui.find('[name="destination"]').value,'Lisboa');
});

test('published conditions show minimum party and plain price scope, with direct network count',async t=>{
  const data=response([offer({category:'transfers',conditions:{minimumParticipants:2,packageDays:5,redemptionValidityMonths:12,advertisedPassengers:1},details:{priceKind:'published',priceScope:'pacote_5_diarias'}}),offer({id:'room',details:{priceKind:'published',priceScope:'one_room_starting_rate'}})]);
  data.summary.networkRequests=7;data.providers.push({id:'limited',status:'rate_limited',offerCount:0});
  const ui=await setup(t,{search:()=>data});await ui.search();
  const rows=ui.find('.ts-card .ts-conditions').textContent;assert.match(rows,/Mínimo de participantes2/);assert.match(rows,/Diárias no pacote5/);assert.match(rows,/Prazo de uso · meses12/);assert.match(rows,/Passageiros na oferta1/);
  assert.match(ui.root.textContent,/Pacote de cinco diárias/);assert.match(ui.root.textContent,/Valor inicial para um quarto/);assert.doesNotMatch(ui.root.textContent,/pacote_5_diarias|one_room_starting_rate/);assert.match(ui.find('.ts-status').textContent,/7 requisição\(ões\) de rede/);assert.match(ui.find('.ts-status').textContent,/Limite temporário de consultas/);
});

const stableOffer=(extra={})=>offer({identityKey:'a'.repeat(64),identityKind:'dated_quote',...extra});
const savedPlan=items=>({id:'12345678-1234-1234-1234-123456789012',name:'Lisboa em família',revision:3,items:items??[stableOffer()],createdAt:'2026-10-08T01:00:00Z',updatedAt:'2026-10-08T01:00:00Z'});

test('saving a named agency plan is explicit and updates using its revision without auto booking',async t=>{
  const calls=[];let revision=0;
  const ui=await setup(t,{offers:[stableOffer()],plans:async(path,options)=>{calls.push({path,...copy(options||{})});if(!options)return {plans:[]};const plan={...savedPlan(options.body.plan.items),name:options.body.plan.name,revision:++revision};return {plan,plans:[plan]};}});
  await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);await ui.search();ui.find('[data-ts="add-plan"]').click();
  assert.equal(calls.length,1);ui.find('[data-ts="save-plan"]').click();assert.match(ui.root.textContent,/Dê um nome/);assert.equal(calls.length,1);
  ui.input('plan-name','Férias Lisboa');ui.find('[data-ts="save-plan"]').click();await ui.waitFor(()=>!ui.find('[data-ts="save-plan"]').disabled);
  assert.equal(calls[1].method,'POST');assert.equal(calls[1].body.plan.name,'Férias Lisboa');assert.equal(calls[1].body.plan.items.length,1);assert.equal(calls[1].body.revision,undefined);
  assert.match(ui.find('.ts-plan-subtotal').textContent,/4.200,00/,'saving does not replace this session fresh prices with stored history');
  ui.input('plan-name','Férias Lisboa atualizada');ui.find('[data-ts="save-plan"]').click();await ui.waitFor(()=>!ui.find('[data-ts="save-plan"]').disabled);
  assert.equal(calls[2].method,'PUT');assert.equal(calls[2].body.revision,1);assert.equal(ui.chosen.length,0);
});

test('resuming a saved plan forces historical prices and excludes subtotal even if server returned a future expiry',async t=>{
  const ui=await setup(t,{plans:async()=>({plans:[savedPlan()]})});await ui.waitFor(()=>ui.root.querySelectorAll('[name="saved-plan"] option').length===2);
  ui.input('saved-plan',savedPlan().id,'change');
  assert.match(ui.root.textContent,/Referência histórica/);assert.equal(ui.find('.ts-plan-subtotal'),null);assert.ok(ui.find('.ts-planner [data-ts="refresh-offer"]'));assert.equal(ui.find('[name="plan-name"]').value,'Lisboa em família');
});

test('new plan warns before discarding local changes and deleting saved plan requires an explicit second choice',async t=>{
  const calls=[];const ui=await setup(t,{plans:async(path,options)=>{calls.push({path,...copy(options||{})});return {plans:options?[]:[savedPlan()]};}});
  await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);ui.input('saved-plan',savedPlan().id,'change');ui.input('plan-name','Nome editado');
  ui.find('[data-ts="new-plan"]').click();assert.match(ui.root.textContent,/Descartar estas alterações/);assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,1);ui.find('[data-ts="cancel-plan"]').click();
  ui.find('[data-ts="delete-plan"]').click();assert.equal(calls.length,1);ui.find('[data-ts="confirm-plan"]').click();await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);
  assert.equal(calls[1].method,'DELETE');assert.equal(calls[1].body.revision,3);assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,0);
});

test('plan save conflicts preserve unsaved selection and display the server recovery message',async t=>{
  const ui=await setup(t,{plans:async(path,options)=>{if(options)throw Error('Este plano mudou em outro acesso. Reabra a versão salva antes de editar.');return {plans:[savedPlan()]};}});
  await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);ui.input('saved-plan',savedPlan().id,'change');ui.input('plan-name','Minhas alterações');ui.find('[data-ts="save-plan"]').click();await ui.waitFor(()=>!ui.find('[data-ts="save-plan"]').disabled);
  assert.match(ui.root.textContent,/mudou em outro acesso/);assert.equal(ui.find('[name="plan-name"]').value,'Minhas alterações');assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,1);
});

test('refresh bypasses offer cache and stages an exact fare price change until the user accepts',async t=>{
  let initial=true;const old=stableOffer(),updated=stableOffer({id:'updated-id',price:{...old.price,amount:3990}});
  const ui=await setup(t,{search:()=>{const value=response([initial?old:updated]);initial=false;return value;}});await ui.search();
  ui.find('[data-ts="refresh-offer"]').click();await ui.waitFor(()=>ui.find('[data-ts="accept-refresh"]'));
  assert.equal(ui.requests[2].body.refresh,true);assert.deepEqual(ui.requests[2].body.providers,['test-hotels']);assert.equal(ui.requests[2].body.flexDays,0);assert.equal(ui.requests[2].body.maxCalls,1);
  assert.match(ui.find('.ts-card .ts-price').textContent,/4.200,00/);assert.match(ui.root.textContent,/diminuiu R\$\s*210,00/);assert.equal(ui.chosen.length,0);
  ui.find('[data-ts="accept-refresh"]').click();assert.match(ui.find('.ts-card .ts-price').textContent,/3.990,00/);ui.find('[data-ts="choose"]').click();assert.equal(ui.chosen[0].draft.total,3990);
});

test('saved plan revalidation restores a fresh subtotal only after accepting the same identity',async t=>{
  const ui=await setup(t,{plans:async()=>({plans:[savedPlan()]}),search:()=>response([stableOffer()])});await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);
  ui.input('saved-plan',savedPlan().id,'change');ui.find('.ts-planner [data-ts="refresh-offer"]').click();await ui.waitFor(()=>ui.find('.ts-planner [data-ts="accept-refresh"]'));
  assert.equal(ui.find('.ts-plan-subtotal'),null);assert.match(ui.root.textContent,/preço se manteve/);ui.find('.ts-planner [data-ts="accept-refresh"]').click();assert.match(ui.find('.ts-plan-subtotal').textContent,/4.200,00/);assert.match(ui.root.textContent,/alterações ainda não salvas/);
});

test('refresh does not substitute a different identity, a cached reply, or an ambiguous set of equivalent fares',async t=>{
  const ui=await setup(t,{offers:[stableOffer()]});await ui.search();
  for(const values of [[stableOffer({identityKey:'b'.repeat(64)})],[stableOffer({cached:true})],[stableOffer(),stableOffer({id:'duplicate'})]]){
    ui.context.api.request=async()=>response(values);ui.find('[data-ts="refresh-offer"]').click();await ui.waitFor(()=>!ui.find('[data-ts="refresh-offer"]').disabled);
    assert.equal(ui.find('[data-ts="accept-refresh"]'),null);assert.match(ui.find('.ts-card .ts-price').textContent,/4.200,00/);assert.match(ui.find('.ts-refresh').textContent,/referência anterior foi mantida/);
  }
});

test('airport suggestions resolve explicit choices and reject ambiguous city names without a request',async t=>{
  const ui=await setup(t,{locations:true});ui.find('[data-category="flights"]').click();ui.input('origin','Porto Alegre');ui.input('destination','São Paulo');ui.input('start','2027-01-10');ui.submit();
  assert.match(ui.find('[role="alert"]').textContent,/mais de um aeroporto/);assert.equal(ui.requests.length,1);
  const choices=[...ui.root.querySelectorAll('#ts-destination-locations option')].map(el=>el.value);assert.ok(choices.some(label=>label.includes('CGH')));assert.ok(choices.some(label=>label.includes('GRU')));
  ui.input('destination',choices.find(label=>label.includes('CGH')));ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));assert.equal(ui.requests[1].body.origin,'POA');assert.equal(ui.requests[1].body.destination,'CGH');
});

test('automatic source selection honors destination coverage, occupancy and flexible call budget',async t=>{
  const hotel={...provider,id:'rio-only',kind:'native',categories:['hotels'],coverage:{type:'destinations',destinations:['Rio Grande'],label:'Rede em Rio Grande'},capabilities:{datedQuotes:true,occupancy:{maxRooms:1,children:false}}};
  const sources=[hotel,...Array.from({length:5},(_,i)=>({...provider,id:'source-'+i}))];const ui=await setup(t,{providers:sources});ui.input('destination','Lisboa','change');ui.input('maxCalls','4','change');ui.input('flexDays','1','change');
  assert.equal(ui.find('[name="provider"][value="rio-only"]').disabled,true);assert.equal(ui.root.querySelectorAll('[name="provider"]:checked').length,1);assert.match(ui.root.textContent,/Fora da cobertura/);
  await ui.search();assert.equal(ui.requests[1].body.providers.length,1);
  ui.input('destination','Rio Grande','change');ui.input('childrenAges','5','change');assert.equal(ui.find('[name="provider"][value="rio-only"]').disabled,true);assert.match(ui.root.textContent,/ainda não consulta hospedagem com crianças/);
});

test('switching agency clears saved selections and ignores late responses from the previous agency',async t=>{
  let finish;const ui=await setup(t,{agencyId:'agency-a',offers:[stableOffer()]});await ui.search();ui.find('[data-ts="add-plan"]').click();
  ui.context.api.request=()=>new Promise(resolve=>{finish=resolve;});ui.find('[data-ts="refresh-offer"][data-location="card"]').click();
  ui.w.TravelSearch.mount(ui.root,{agencyId:'agency-b',api:{request:async()=>({providers:[provider]})}});await ui.waitFor(()=>!ui.root.textContent.includes('Carregando fontes'));
  finish(response([stableOffer({price:{amount:1,currency:'BRL',basis:'stay',taxesIncluded:true}})]));await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(ui.find('.ts-plan-items'),null);assert.equal(ui.find('.ts-card'),null);assert.doesNotMatch(ui.root.textContent,/4.200|1,00/);
});

test('source capability modes keep prepaid car packages in opportunities and their flexible request costs one call',async t=>{
  const cars={...provider,id:'native-movida-prepaid',kind:'native',categories:['cars'],dateIndependent:true,capabilities:{modes:['opportunities'],publishedOffers:true,datedQuotes:false}};
  const ui=await setup(t,{providers:[cars]});ui.find('[data-category="cars"]').click();assert.equal(ui.find('[name="provider"]'),null);
  ui.input('mode','opportunities','change');ui.input('destination','Porto Alegre');ui.input('maxCalls','1','change');ui.input('flexDays','2','change');ui.input('start','2027-01-10');ui.input('end','2027-01-15');ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  assert.equal(ui.requests[1].body.providers[0],'native-movida-prepaid');assert.equal(ui.requests[1].body.maxCalls,1);assert.match(ui.root.textContent,/Referências publicadas/);
});

test('removing the last saved item permits saving an empty existing plan and preserves client metadata',async t=>{
  const calls=[];const original={...savedPlan(),clientId:'client-1',notes:'Preferência por voo direto'};
  const ui=await setup(t,{plans:async(path,options)=>{if(options){calls.push(copy(options));return {plan:{...original,...options.body.plan,revision:4},plans:[]};}return {plans:[original]};}});
  await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);ui.input('saved-plan',original.id,'change');ui.find('[data-ts="remove-plan"]').click();assert.equal(ui.find('[data-ts="save-plan"]').disabled,false);
  ui.find('[data-ts="save-plan"]').click();await ui.waitFor(()=>calls.length===1&&!ui.find('[data-ts="save-plan"]').disabled);
  assert.deepEqual(calls[0].body.plan.items,[]);assert.equal(calls[0].body.plan.clientId,'client-1');assert.equal(calls[0].body.plan.notes,original.notes);
});

test('saved hotel starting prices open room selection instead of comparing a nightly reference with a stay total',async t=>{
  const published=stableOffer({provider:'native-laghetto',identityKind:'published_product',details:{priceKind:'published',hotelId:'7620'},price:{amount:280,currency:'BRL',basis:'from',taxesIncluded:false}});
  const ui=await setup(t,{providers:[{...provider,id:'native-laghetto'}],plans:async()=>({plans:[savedPlan([published])]}),search:()=>response([stableOffer({provider:'native-laghetto'})])});await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);
  ui.input('saved-plan',savedPlan().id,'change');assert.equal(ui.find('.ts-planner [data-ts="refresh-offer"]'),null);ui.find('.ts-planner [data-ts="hotel-rooms"]').click();await ui.waitFor(()=>!ui.find('.ts-spinner'));
  assert.equal(ui.requests[1].body.hotelId,'7620');assert.equal(ui.requests[1].body.category,'hotels');assert.equal(ui.requests[1].body.mode,'quote');assert.equal(ui.find('.ts-plan-subtotal'),null);assert.equal(ui.root.querySelectorAll('.ts-plan-items>li').length,1);
});

test('accepting a saved fare update exposes editable quotation review without saving or booking automatically',async t=>{
  const calls=[];const ui=await setup(t,{plans:async(path,options)=>{calls.push(options?.method||'GET');return {plans:[savedPlan()]};},search:()=>response([stableOffer()])});await ui.waitFor(()=>!ui.find('[data-ts="reload-plans"]').disabled);
  ui.input('saved-plan',savedPlan().id,'change');assert.equal(ui.find('[data-ts="choose-plan"]'),null);ui.find('.ts-planner [data-ts="refresh-offer"]').click();await ui.waitFor(()=>ui.find('[data-ts="accept-refresh"]'));ui.find('[data-ts="accept-refresh"]').click();ui.find('[data-ts="choose-plan"]').click();
  assert.equal(ui.chosen.length,1);assert.equal(ui.chosen[0].draft.total,4200);assert.deepEqual(calls,['GET']);assert.equal(ui.chosen[0].draft.netCost,undefined);
});

test('whole-trip automatic selection leaves flight-only sources outside the budget until airports are selected',async t=>{
  const ui=await setup(t,{locations:true,providers:[{...provider,id:'flights-only',categories:['flights']},{...provider,id:'hotels-only',categories:['hotels']}]});ui.find('[data-category="trip"]').click();
  assert.equal(ui.find('[name="provider"][value="flights-only"]').disabled,true);ui.input('originAirport','Porto Alegre','change');ui.input('destinationAirport','Lisboa','change');assert.equal(ui.find('[name="provider"][value="flights-only"]').checked,true);
});

test('a one-call budget still searches the base dates when flexible dates request additional attempts',async t=>{
  const ui=await setup(t);ui.input('maxCalls','1','change');ui.input('flexDays','2','change');
  assert.equal(ui.find('button[type="submit"]').disabled,false);assert.match(ui.root.textContent,/Datas alternativas dependem do limite/);await ui.search();
  assert.equal(ui.requests[1].body.maxCalls,1);assert.equal(ui.requests[1].body.flexDays,2);assert.deepEqual(ui.requests[1].body.providers,['test-hotels']);
});

test('Laghetto destination coverage accepts the same state and country suffixes as its collector',async t=>{
  const hotel={...provider,id:'native-laghetto',categories:['hotels'],coverage:{type:'destinations',destinations:['Gramado']}};
  const ui=await setup(t,{providers:[hotel]});for(const destination of ['Gramado, RS','Gramado / RS / Brasil','Gramado - Brazil']){ui.input('destination',destination,'change');assert.equal(ui.find('[name="provider"]').disabled,false,destination);assert.equal(ui.find('[name="provider"]').checked,true,destination);}
  ui.input('destination','Gramado, RS','change');ui.input('start','2027-01-10');ui.input('end','2027-01-15');ui.submit();await ui.waitFor(()=>!ui.find('.ts-spinner'));assert.equal(ui.requests[1].body.destination,'Gramado, RS');
});
