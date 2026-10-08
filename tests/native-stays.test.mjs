import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeStayCatalog,nativeStayUrl,parseNativeStays,parseNativeStayRates,createNativeStayAdapters} from '../backend/native-stays.mjs';
const request=()=>({category:'hotels',destination:'Gramado',origin:'',start:'2026-11-10',end:'2026-11-15',adults:2,childrenAges:[],rooms:1,currency:'BRL'});
const at='2026-10-08T03:00:00.000Z';
const card=({id='3484',name='Hotel Laghetto Toscana',address='Avenida das Hortênsias, 2600, Gramado, Brasil',price='979,<span class="decimal_value_price">02</span>',prefix='A partir de',basis='/noite',tax='tax_string_info_not_included'}={})=>`<div class="property-offer"><div class="property-offer-top"><p class="property-name">${name}</p><p class="property-address">${address}</p><div class="price"><div class="price-start-message-holder">${prefix}</div><div class="property-price-per-night"><span class="property-price"><span class="currency_symbol_price">R$</span> ${price}</span><span class="per_night">${basis}</span></div><div class="${tax}">Impostos e taxas não inclusos</div><div data-hotelid="${id}"></div></div></div></div>`;
const page=(cards=card(),edits={})=>`<!doctype html><html><body><form>${Object.entries({CheckIn:'10112026',CheckOut:'15112026',NRooms:'1',ad:'2',ch:'',currencyId:'16',...edits}).map(([name,value])=>`<input name="${name}" value="${value}">`).join('')}</form>${cards}</body></html>`;
const parse=(html,req=request(),opts={})=>parseNativeStays(html,{request:req,sourceUrl:nativeStayUrl(req),collectedAt:at,...opts});

test('public hotel source URL has verified chain, city folder, dates and one-room occupancy',()=>{
 const url=new URL(nativeStayUrl(request()));assert.equal(url.hostname,'reservas.laghetto.com.br');assert.equal(url.pathname,'/chainresults');assert.equal(url.searchParams.get('c'),'2143');assert.equal(url.searchParams.get('hotel_folder'),'458');assert.equal(url.searchParams.get('CheckIn'),'10112026');assert.equal(url.searchParams.get('CheckOut'),'15112026');assert.equal(url.searchParams.get('ad'),'2');
 assert.throws(()=>nativeStayUrl({...request(),destination:'hotel.example.test'}),{code:'UNSUPPORTED_REQUEST'});
 assert.throws(()=>nativeStayUrl(request(),{hotelId:'1&secret=true'}),{code:'INVALID_HOTEL'});
});

test('native card parser extracts actual nightly starting rate and never multiplies into a stay total',()=>{
 const html=page(),out=parse(html);assert.equal(out.offers.length,1);const o=out.offers[0];
 assert.equal(o.title,'Hotel Laghetto Toscana');assert.equal(o.price.amount,979.02);assert.equal(o.price.basis,'from');assert.equal(o.price.taxesIncluded,false);assert.equal(o.completeness,'selection_required');assert.equal(o.bookable,false);assert.equal(o.details.advertisedBasis,'nightly');assert.equal(o.conditions.datesVerified,true);assert.equal(o.conditions.occupancyVerified,true);assert.equal(o.details.evidence.rawPrice,'R$ 979,02');assert.equal(o.details.evidence.sha256,createHash('sha256').update(html).digest('hex'));assert.equal(o.details.evidence.collectedAt,at);assert.match(o.sourceUrl,/q=3484/);assert.match(o.warnings.join(' '),/não foi multiplicado/);
});

test('different city, missing price, ambiguous amount and duplicate cards cannot pollute destination results',()=>{
 const html=page(card()+card()+card({id:'7620',name:'Rio Grande hotel',address:'Rua Aquidaban, 703, Rio Grande, Brasil'})+card({id:'3497',price:''})+card({id:'1234',price:'1234.50'})+card({id:'5678',prefix:'Total',basis:'/estadia'}));
 const out=parse(html);assert.equal(out.offers.length,1);assert.equal(out.counts.cards,6);assert.equal(out.counts.matchingCity,5);assert.equal(out.counts.excluded,4);
});

test('response must confirm exact dates, occupancy and currency from form and final URL',()=>{
 for(const edits of [{CheckIn:'11112026'},{CheckOut:'16112026'},{ad:'1'},{NRooms:'2'},{ch:'1'},{currencyId:'1'}]){const out=parse(page(card(),edits));assert.equal(out.offers.length,0);assert.match(out.warnings.join(' '),/não confirmou/);}
 const mismatch=nativeStayUrl(request()).replace('CheckIn=10112026','CheckIn=11112026');assert.equal(parse(page(),request(),{sourceUrl:mismatch}).offers.length,0);
});

test('children and multiple rooms are explicitly unsupported before network access',async()=>{
 let called=0;const [adapter]=createNativeStayAdapters({collector:{getHtml:async()=>{called++;throw Error('not expected');}}});
 for(const req of [{...request(),childrenAges:[8]},{...request(),rooms:2},{...request(),destination:'Lisboa'}]){const out=await adapter.search(req);assert.equal(out.offers.length,0);assert.equal(out.requestsUsed,0);assert.equal(out.networkRequests,0);assert.ok(out.warnings.length);}
 assert.equal(called,0);
});

test('inert DOM parser never executes document scripts and preserves evidence provenance',()=>{
 const html=page(card({name:'Hotel <script>globalThis.__nativeInjected=true</script>Seguro'}))+'<script>throw Error("executed")</script>';
 const out=parse(html);assert.equal(globalThis.__nativeInjected,undefined);assert.equal(out.offers[0].title,'Hotel Seguro');
 assert.throws(()=>parse(page(),request(),{sourceUrl:'https://evil.test/chainresults'}),{code:'UNSAFE_SOURCE'});assert.throws(()=>parse('x'.repeat(3*1024*1024+1)),{code:'RESPONSE_TOO_LARGE'});
});

test('unexpected markup returns no guessed prices and communicates parsing limitation',()=>{
 const out=parse(page('<p>Pacote especial R$ 999,00</p>'));assert.equal(out.offers.length,0);assert.match(out.warnings.join(' '),/formato esperado/);
});

test('adapter uses own collector with allowlisted host and passes robots and hash evidence',async()=>{
 const calls=[],[adapter]=createNativeStayAdapters({collector:{async getHtml(url,options){calls.push({url,options});return {html:page(),url,fetchedAt:at,sha256:'a'.repeat(64),networkRequests:2,robots:{status:'allowed'}};}}});
 const out=await adapter.search(request());assert.equal(calls.length,2);assert.deepEqual(calls[0].options.allowedHosts,['reservas.laghetto.com.br']);assert.equal(out.offers.length,1);assert.equal(out.requestsUsed,1);assert.equal(out.networkRequests,4);assert.equal(out.offers[0].details.evidence.sha256,'a'.repeat(64));assert.deepEqual(out.evidence.documents[0].robots,{status:'allowed'});
});

test('Hotels.com direct search remains disabled after verified robots disallow',()=>{
 const source=nativeStayCatalog.find(s=>s.id==='native-hoteis-public');assert.equal(source.configured,false);assert.equal(source.implemented,false);assert.match(source.reason,/bloqueia/);assert.equal(createNativeStayAdapters({collector:{}}).some(a=>a.id===source.id),false);
});

const rateRequest=()=>({...request(),destination:'Rio Grande',hotelId:'7620'});
const hotel={hotelId:'7620',name:'Hotel Laghetto Rio Grande',city:'Rio Grande'};
function ratePage(overrides={}){
 const attrs={'has-loyalty':'false','start':'2026-11-10','end':'2026-11-15','adults':'2','children':'0','children-ages':'','nights':'5','rate-currency-string-symbol':'BRL','rate-currency':'16','max-quantity':'89','total-price-before-tax-public':'1379.74','total-price-after-tax-public':'1434.9296','total-taxes':'55.1896','room-name':'Luxo (Cama Casal)','room-id':'48110','rate-id':'140677','board':'Café da Manhã','free-cancel':'true',...overrides};
 const attributes=Object.entries(attrs).map(([k,v])=>`data-${k}="${v}"`).join(' ');
 return page(`<p class="hotel_name">Hotel Laghetto Rio Grande</p><div class="roomrate"><div class="room-tax-holder" data-room-id="48110" data-rate-id="140677"><div class="room-tax-total-price-public">R$ 55,19</div></div><div class="rate_plan roomrateinfo" ${attributes}><div class="public-rate"><span class="price-total-bold">R$ 1.379,74</span></div><span class="cancellation-text-policy-wrapper">Cancelamento gratuito até 08/11/2026</span></div></div>`,{q:'7620'});
}
const parseRate=html=>parseNativeStayRates(html,{request:rateRequest(),sourceUrl:nativeStayUrl(rateRequest(),{hotelId:'7620'}),collectedAt:at,hotel});

test('room parser validates published after-tax total against displayed subtotal, listed tax, date and party',()=>{
 const out=parseRate(ratePage()),o=out.offers[0];assert.equal(out.offers.length,1);assert.equal(o.price.amount,1434.93);assert.equal(o.price.basis,'stay');assert.equal(o.price.taxesIncluded,true);assert.equal(o.completeness,'complete');assert.equal(o.details.priceKind,'dated_quote');assert.equal(o.details.staySubtotal,1379.74);assert.equal(o.details.listedTaxes,55.19);assert.equal(o.details.evidence.rawPrice,'1434.9296');assert.equal(o.conditions.roomType,'Luxo (Cama Casal)');assert.equal(o.conditions.mealPlan,'Café da Manhã');assert.equal(o.conditions.freeCancellation,true);assert.equal(o.bookable,false);
});

test('inconsistent or member room rates never become verified totals',()=>{
 for(const override of [{'total-price-after-tax-public':'1435.93'},{'total-price-before-tax-public':'1000'},{'total-taxes':'0'},{'has-loyalty':'true'},{'start':'2026-11-11'},{'adults':'1'},{'children':'1'},{'nights':'6'},{'rate-currency-string-symbol':'USD'},{'max-quantity':'0'},{'max-quantity':'NaN'},{'max-quantity':''}])assert.equal(parseRate(ratePage(override)).offers.length,0,JSON.stringify(override));
 assert.equal(parseRate(ratePage().replace('R$ 55,19','R$ 45,19')).offers.length,0);
 assert.throws(()=>parseNativeStayRates(ratePage(),{request:rateRequest(),sourceUrl:nativeStayUrl(rateRequest(),{hotelId:'7620'}),collectedAt:at,hotel:{...hotel,city:'Gramado'}}),{code:'UNSAFE_SOURCE'});
});

test('explicit verified hotel reads one room page and does not search the chain again',async()=>{
 const calls=[],[adapter]=createNativeStayAdapters({collector:{async getHtml(url){calls.push(url);return {html:ratePage(),url,fetchedAt:at,networkRequests:2};}}});
 const out=await adapter.search(rateRequest());assert.equal(calls.length,1);assert.equal(new URL(calls[0]).pathname,'/hotelresults');assert.equal(out.offers[0].price.amount,1434.93);assert.equal(out.evidence.detailedHotels,1);assert.equal(out.requestsUsed,1);assert.equal(out.networkRequests,2);
 const invalid=await adapter.search({...rateRequest(),hotelId:'3497'});assert.equal(invalid.requestsUsed,0);assert.equal(calls.length,1);
});

test('default source reads at most one listing and two hotel pages and retains partial results',async()=>{
 let called=0;const [adapter]=createNativeStayAdapters({collector:{async getHtml(url){called++;if(new URL(url).pathname==='/chainresults')return {html:page(card()+card({id:'6458',name:'Hotel Bangalôs da Serra',price:'669,20'})+card({id:'4744',name:'Hotel Laghetto Pedras Altas',price:'1.320,79'})),url,fetchedAt:at,networkRequests:1};throw Error('Temporarily unavailable');}}});
 const out=await adapter.search(request());assert.equal(called,3);assert.equal(out.offers.length,3);assert.match(out.warnings.join(' '),/demais respostas foram preservadas/);
});
