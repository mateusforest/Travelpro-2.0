import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNativeTransport,parseMovidaPrepaid,createNativeTransportAdapters} from '../backend/native-transport.mjs';

const collectedAt='2026-10-08T03:00:00.000Z';
const fare={__typename:'Fare',originAirportCode:'POA',destinationAirportCode:'CGH',originCity:'Porto Alegre',destinationCity:'São Paulo',departureDate:'2026-12-17',returnDate:'',flightType:'ONE_WAY',totalPrice:512.41,currencyCode:'BRL',redemption:null,travelClass:'Economy',priceLastSeen:{value:'4',unit:'minutes'}};
function html(fares,metadata={}){return '<!doctype html><script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{apolloState:{data:{'StandardFareModule:{"id":"observed-shape"}':{fares,prepopulationSettings:{redemptionUnit:'CURRENCY',numberOfPassengers:1,...metadata},metaData:{footer:'Valores coletados nas últimas 48 horas.'}}}}}}})+'</script>';}
const opts={provider:'native-gol',sourceUrl:'https://www.voegol.com.br/br/voos-de-porto-alegre-para-sao-paulo',collectedAt};
const prepaid='<p>Diária de 27 horas + Proteção básica + Taxa de Locação. Utilização em até 6 meses. Resgate com antecedência de 60 minutos. Não permitido acumular mais de 25 diárias.</p><div class="col-xs-12 col-md-4"><h4>Econômico</h4><p>Fiat Mobi, Renault Kwid</p><div class="value-data value-data-8">R$ 1.099,50</div><select class="selec-days selec-days-8"><option data-dia="5">5 dias</option><option data-dia="10">10 dias</option></select><button data-id="8" data-price="1099.50">COMPRAR</button></div>';

test('native parser reads only public fare modules and retains published scope, dates and evidence meaning',()=>{
 const result=parseNativeTransport(html([fare]),opts);assert.equal(result.offers.length,1);const offer=result.offers[0];assert.equal(offer.price.amount,512.41);assert.equal(offer.price.basis,'from');assert.equal(offer.conditions.advertisedPassengers,1);assert.equal(offer.details.publishedStart,'2026-12-17');assert.equal(offer.details.priceScope,'one_passenger');assert.deepEqual(offer.details.priceLastSeen,{value:4,unit:'minutes'});assert.equal(offer.bookable,false);assert.equal(offer.completeness,'unknown');assert.equal(offer.capturedAt,collectedAt);
});

test('redemption fares labelled BRL are excluded and never mistaken for cash prices',()=>{
 const points={...fare,totalPrice:12000,redemption:{unit:'POINTS',amount:12000}};const result=parseNativeTransport(html([fare,points]),opts);assert.equal(result.offers.length,1);assert.equal(result.counts.redemptionsExcluded,1);
 const allPoints=parseNativeTransport(html([fare],{redemptionUnit:'POINTS'}),opts);assert.equal(allPoints.offers.length,0);
});

test('incomplete or invalid fares are rejected and repeated source entries deduplicated conservatively',()=>{
 const result=parseNativeTransport(html([fare,{...fare},{...fare,totalPrice:0},{...fare,departureDate:'2026-02-30'},{...fare,flightType:'ROUND_TRIP'},{...fare,destinationAirportCode:''}]),opts);assert.equal(result.offers.length,1);assert.equal(result.counts.invalidExcluded,4);
 const noModule=parseNativeTransport('<script>window.fakeFare={price:100};throw Error("no execution");</script>',opts);assert.deepEqual(noModule.offers,[]);assert.equal(noModule.schema,'unavailable');assert.throws(()=>parseNativeTransport(html([fare]),{...opts,sourceUrl:'https://evil.example'}),{code:'UNSAFE_SOURCE'});
});

test('native exact search does not replace requested dates or invent a total for two travelers',async()=>{
 const calls=[];const collector={async getHtml(url,options){calls.push({url,options});return {html:html([fare,{...fare,departureDate:'2026-12-18',totalPrice:550}]),url,fetchedAt:collectedAt,sha256:'source-hash',networkRequests:2};}};
 const source=createNativeTransportAdapters({collector,now:()=>Date.parse(collectedAt)})[0];const request={category:'flights',origin:'POA',destination:'CGH',start:'2026-12-17',end:'',adults:2,childrenAges:[],currency:'BRL'};
 const result=await source.search(request);assert.equal(calls.length,1);assert.deepEqual(calls[0].options.allowedHosts,['www.voegol.com.br']);assert.equal(result.offers.length,1);assert.equal(result.offers[0].price.amount,512.41);assert.equal(result.offers[0].details.requestedDatesMatched,true);assert.equal(result.offers[0].details.evidence.sha256,'source-hash');assert.equal(result.networkRequests,2);
 const missing=await source.search({...request,start:'2026-12-20'});assert.equal(missing.offers.length,0);assert.match(missing.warnings.join(' '),/nenhuma nas datas exatas/);
 const opportunities=await source.search({...request,mode:'opportunities'});assert.equal(opportunities.offers.length,2);assert.equal(opportunities.offers[1].details.requestedDatesMatched,false);assert.equal(opportunities.offers[1].details.publishedStart,'2026-12-18');
});

test('past and other-route fares are excluded; source errors propagate without retry or fallback prices',async()=>{
 let calls=0;const source=createNativeTransportAdapters({collector:{async getHtml(url){calls++;return {url,html:html([{...fare,departureDate:'2026-01-01'},{...fare,destinationAirportCode:'GRU'}]),fetchedAt:collectedAt};}},now:()=>Date.parse(collectedAt)})[0];const result=await source.search({category:'flights',origin:'POA',destination:'CGH',mode:'opportunities'});assert.equal(result.offers.length,0);assert.equal(calls,1);
 const blocked=createNativeTransportAdapters({collector:{async getHtml(){throw Object.assign(Error('Disallowed'),{code:'ROBOTS_DENIED'});}}})[0];await assert.rejects(blocked.search({category:'flights',origin:'POA',destination:'CGH'}),{code:'ROBOTS_DENIED'});
});

test('Movida extraction preserves bundle price and conditions without presenting trip availability',()=>{
 const result=parseMovidaPrepaid(prepaid,{collectedAt});assert.equal(result.offers.length,1);const offer=result.offers[0];assert.equal(offer.price.amount,1099.5);assert.equal(offer.details.advertisedDailyAmount,219.9);assert.equal(offer.details.priceScope,'pacote_5_diarias');assert.equal(offer.conditions.redemptionValidityMonths,6);assert.equal(offer.conditions.redemptionLeadMinutes,60);assert.equal(offer.conditions.maximumPurchasedDays,25);assert.equal(offer.conditions.availabilityConfirmed,false);assert.equal(offer.details.requestedDatesMatched,false);assert.equal(offer.price.taxesIncluded,null);
 assert.equal(parseMovidaPrepaid(prepaid.replace('1099.50','899.50'),{collectedAt}).offers.length,0,'DOM display and structured price must agree');
});

test('Movida only runs for opportunities and never forces its five-day package into exact-date search',async()=>{
 let calls=0;const source=createNativeTransportAdapters({collector:{async getHtml(url,options){calls++;assert.deepEqual(options.allowedHosts,['www.movida.com.br']);return {url,html:prepaid,fetchedAt:collectedAt,sha256:'car-hash',networkRequests:1};}},now:()=>Date.parse(collectedAt)}).find(x=>x.id==='native-movida-prepaid');
 const exact=await source.search({category:'cars',mode:'exact',destination:'Porto Alegre',start:'2026-12-17',end:'2026-12-19'});assert.equal(exact.requestsUsed,0);assert.equal(calls,0);
 const opportunities=await source.search({category:'cars',mode:'opportunities',destination:'Porto Alegre',start:'2026-12-17',end:'2026-12-19'});assert.equal(opportunities.offers[0].price.amount,1099.5);assert.equal(opportunities.offers[0].details.publishedStart,null);assert.equal(opportunities.offers[0].details.evidence.sha256,'car-hash');assert.equal(calls,1);
});
