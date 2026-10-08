import test from 'node:test';
import assert from 'node:assert/strict';
import {createTravelAdapters,providerCatalog} from '../backend/travel-adapters.mjs';

const request={category:'hotels',origin:'POA',destination:'Recife',start:'2099-11-10',end:'2099-11-15',adults:2,childrenAges:[],rooms:1,currency:'BRL'};
const stamp='2099-10-08T12:00:00.000Z';
function adapter(id,payload,{fetcher}={}){
  const calls=[];
  const wrapped=async(url,options)=>{calls.push({url,options});return fetcher?fetcher(url,options):new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}});};
  return {calls,api:createTravelAdapters({credentials:{gecko:'gecko-secret',searchapi:'search-secret',serpapi:'serp-secret'},fetcher:wrapped}).find(x=>x.id===id)};
}

test('catalog reports implementation separately from configured credentials',async()=>{
  assert.equal(providerCatalog.length,9);
  const entries=createTravelAdapters();assert.ok(entries.every(x=>x.implemented&&!x.configured));
  await assert.rejects(entries[0].search(request),error=>error.code==='NOT_CONFIGURED');
});

test('Booking preserves documented fields without treating uncertain card price as a stay total',async()=>{
  const {api,calls}=adapter('gecko-booking',{data:{extractedAt:stamp,nextPage:2,items:[{propertyId:42,name:'Hotel',url:'https://www.booking.com/hotel/br/example.html',price:1234.5,currency:'BRL',averagePricePerNight:246.9,freeCancellation:true,aggregateRating:{rating:9.1,reviewCount:40}}]}});
  const result=await api.search(request);
  const body=JSON.parse(calls[0].options.body);
  assert.equal(body.target,'booking.com.br');assert.equal(body.keyword,'Recife');assert.equal(body.page,1);
  assert.equal(calls[0].options.headers.Authorization,'Bearer gecko-secret');
  assert.equal(result.requestsUsed,1);assert.equal(result.offers[0].price.amount,1234.5);
  assert.equal(result.offers[0].price.basis,'unknown');assert.equal(result.offers[0].completeness,'unknown');
  assert.equal(result.offers[0].conditions.freeCancellation,true);assert.equal(result.offers[0].conditions.cancellation,null);assert.equal(result.offers[0].capturedAt,stamp);
  assert.equal(result.offers[0].price.taxesIncluded,null);assert.match(result.warnings[0],/primeira página/);
});

test('Hoteis lead price is not multiplied by nights or room count',async()=>{
  const {api,calls}=adapter('gecko-hoteis',{data:{items:[{propertyId:'h1',name:'Hotel',leadPrice:{amount:675,currency:'BRL'},taxesAndFees:'inclui impostos e taxas'}]}});
  const result=await api.search({...request,rooms:2});
  assert.equal(JSON.parse(calls[0].options.body).location,'Recife');
  assert.equal(result.offers[0].price.amount,675);assert.equal(result.offers[0].price.basis,'unknown');
  assert.equal(result.offers[0].price.taxesIncluded,null);assert.equal(result.offers[0].sourceUrl,null);
  assert.equal(result.offers[0].conditions.taxesText,'inclui impostos e taxas');
});

test('unsupported occupancy makes zero provider requests',async()=>{
  for(const [id,changes]of [['gecko-booking',{childrenAges:[5]}],['searchapi-hotels',{rooms:2}],['serpapi-hotels',{rooms:2}],['searchapi-hotels',{childrenAges:[0]}],['searchapi-flights',{category:'flights',destination:'REC',childrenAges:[1]}]]){
    const {api,calls}=adapter(id,{});const result=await api.search({...request,...changes});
    assert.equal(calls.length,0,id);assert.equal(result.requestsUsed,0,id);assert.equal(result.offers.length,0,id);assert.equal(result.warnings.length,1,id);
  }
});

test('SearchApi Hotels uses total_price independently of nightly price and sends supported occupancy',async()=>{
  const {api,calls}=adapter('searchapi-hotels',{search_metadata:{created_at:stamp},search_parameters:{currency:'BRL'},properties:[{name:'Hotel teste',property_token:'token',link:'https://hotel.example.com/',price_per_night:{extracted_price:200},total_price:{extracted_price:1050,extracted_price_before_taxes:1000},rating:4.4}]});
  const result=await api.search({...request,childrenAges:[5]});const url=new URL(calls[0].url);
  assert.equal(url.searchParams.get('children_ages'),'5');assert.equal(url.searchParams.get('property_type'),'hotel');
  assert.equal(url.searchParams.has('api_key'),false);assert.equal(calls[0].options.headers.Authorization,'Bearer search-secret');
  assert.equal(result.offers[0].price.amount,1050);assert.equal(result.offers[0].price.basis,'stay');
  assert.equal(result.offers[0].price.taxesIncluded,null);assert.equal(result.offers[0].completeness,'complete');assert.equal(result.offers[0].bookable,false);
});

test('SerpApi uses distinct hotel total_rate schema and its documented under-one age representation',async()=>{
  const {api,calls}=adapter('serpapi-hotels',{search_parameters:{currency:'BRL'},properties:[{name:'Hotel',total_rate:{extracted_lowest:202},rate_per_night:{extracted_lowest:40},overall_rating:4.5}],serpapi_pagination:{next_page_token:'next'}});
  const result=await api.search({...request,childrenAges:[0,8]});const url=new URL(calls[0].url);
  assert.equal(url.searchParams.get('children'),'2');assert.equal(url.searchParams.get('children_ages'),'1,8');
  assert.equal(url.searchParams.get('no_cache'),'true');assert.equal(url.searchParams.get('api_key'),'serp-secret');
  assert.equal(result.offers[0].price.amount,202);assert.ok(result.offers[0].warnings.some(x=>x.includes('idade 1')));
  assert.equal(result.offers[0].details.rating,4.5);assert.equal(result.requestsUsed,1);
});

test('nightly-only hotels remain unpriced for the complete stay; no fabricated totals',async()=>{
  const {api}=adapter('searchapi-hotels',{properties:[{name:'Hotel',price_per_night:{extracted_price:200}}]});
  const result=await api.search(request);assert.equal(result.offers[0].price.amount,200);
  assert.equal(result.offers[0].price.basis,'unknown');assert.equal(result.offers[0].completeness,'unknown');
});

test('Google flight roundtrip preserves outbound selection state and never invents a return leg',async()=>{
  for(const id of ['serpapi-flights','searchapi-flights']){
    const {api,calls}=adapter(id,{search_metadata:{created_at:stamp,google_flights_url:'https://www.google.com/travel/flights'},best_flights:[{price:1999,departure_token:'opaque-next',flights:[{departure_airport:{id:'POA',date:'2099-11-10',time:'10:00'},arrival_airport:{id:'REC',date:'2099-11-10',time:'14:00'},flight_number:'LA 123',airline:'LATAM'}]}]});
    const result=await api.search({...request,category:'flights',destination:'REC'});
    assert.equal(calls.length,1);assert.equal(result.offers[0].details.segments.length,1);
    assert.equal(result.offers[0].price.amount,1999);assert.equal(result.offers[0].price.basis,'from');
    assert.equal(result.offers[0].completeness,'selection_required');assert.equal(result.offers[0].details.departureToken,'opaque-next');
    assert.equal(result.offers[0].conditions.passengerPriceScope,'unverified');
  }
});

test('airline-specific Gecko response shapes are parsed without claiming passenger or return totals',async()=>{
  const cases=[
    ['gecko-latam',{items:[{route:{originIata:'POA',destinationIata:'REC'},flight:{flightCode:'LA 123'},price:{currency:'BRL',total:450},fare:{brandText:'Light'}}]}],
    ['gecko-gol',{itineraries:[{id:'gol-1',origin:'POA',destination:'REC',offers:[{brandId:'LIGHT',brandLabel:'Light',total:{currency:'BRL',amount:451}}]}]}],
    ['gecko-azul',{trips:[{journeys:[{id:'azul-1',origin:'POA',destination:'REC',available:true,fares:[{key:'f1',productClass:{name:'Azul'},total:{currency:'BRL',amount:452}}]}]}]}],
  ];
  for(const [index,[id,data]]of cases.entries()){
    const {api,calls}=adapter(id,{data});const result=await api.search({...request,category:'flights',destination:'REC'});
    assert.equal(result.offers.length,1,id);assert.equal(result.offers[0].price.amount,450+index,id);
    assert.equal(result.offers[0].price.basis,'unknown',id);assert.equal(result.offers[0].bookable,false,id);
    assert.equal(JSON.parse(calls[0].options.body).returnDate,request.end);
  }
});

test('unsafe output links are removed and unsupported numerical prices are not coerced',async()=>{
  const {api}=adapter('searchapi-hotels',{properties:[
    {name:'Unsafe',link:'javascript:alert(1)',total_price:{extracted_price:100}},
    {name:'Private',link:'https://127.0.0.1/',total_price:{extracted_price:100}},
    {name:'Credential',link:'https://serpapi.com/search.json?api_key=secret',total_price:{extracted_price:100}},
    {name:'String price',total_price:{extracted_price:'1.999,90'}},
    {name:'Public',link:'https://hotel.example.com/?api_key=secret&offer=1',total_price:{extracted_price:100}},
  ]});
  const result=await api.search(request);assert.equal(result.offers.length,4);
  assert.ok(result.offers.slice(0,3).every(x=>x.sourceUrl===null));
  assert.equal(result.offers[3].sourceUrl,'https://hotel.example.com/?offer=1');
});

test('provider errors and network failures never echo credentials or raw provider response',async()=>{
  for(const fetcher of [async()=>{throw new Error('https://serpapi.com/?api_key=serp-secret');},async()=>new Response('{"error":"search-secret"}'),async()=>new Response('gecko-secret',{status:401})]){
    const {api}=adapter('serpapi-hotels',null,{fetcher});
    await assert.rejects(api.search(request),error=>{assert.doesNotMatch(error.message,/secret/);assert.ok(error.code);return true;});
  }
});

test('body-size limit applies before JSON parsing and no redirect following is enabled',async()=>{
  const {api,calls}=adapter('serpapi-hotels',null,{fetcher:async()=>new Response('x',{headers:{'content-length':String(3*1024*1024)}})});
  await assert.rejects(api.search(request),error=>error.code==='RESPONSE_TOO_LARGE');
  assert.equal(calls[0].options.redirect,'error');
});

test('200 notFound is a completed empty result; provider failure is not empty inventory',async()=>{
  const {api}=adapter('gecko-booking',{data:null,notFound:true});const result=await api.search(request);
  assert.deepEqual(result.offers,[]);assert.equal(result.requestsUsed,1);
  const failed=adapter('gecko-gol',{data:{success:false}}).api;
  await assert.rejects(failed.search({...request,category:'flights',destination:'REC'}),error=>error.code==='PROVIDER_ERROR');
});

test('schema drift and oversized chunked responses are explicit failures, not fabricated no-results',async()=>{
  const drift=adapter('searchapi-hotels',{unexpected:{price:100}}).api;
  await assert.rejects(drift.search(request),error=>error.code==='INVALID_RESPONSE');
  const oversized=adapter('searchapi-hotels',null,{fetcher:async()=>new Response(' '.repeat(2*1024*1024+1))}).api;
  await assert.rejects(oversized.search(request),error=>error.code==='RESPONSE_TOO_LARGE');
});
