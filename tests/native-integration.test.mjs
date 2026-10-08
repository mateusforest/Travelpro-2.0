import test from 'node:test';
import assert from 'node:assert/strict';
import {createTravelSearchEngine,validateTravelSearch} from '../backend/travel-search.mjs';

const now=Date.parse('2026-10-08T03:00:00Z');
const request={category:'trip',origin:'São Paulo',destination:'Porto Alegre',originAirport:'GRU',destinationAirport:'POA',start:'2026-11-10',end:'2026-11-15',adults:2,rooms:1,childrenAges:[],mode:'opportunities',maxCalls:6};
const scoped={tenantId:'agency-test'};
const offer=(category,extra={})=>({id:category,title:'Test only '+category,category,source:'Fixture',sourceUrl:'https://example.com/offer',capturedAt:new Date(now).toISOString(),price:{amount:150,currency:'BRL',basis:'from',taxesIncluded:null},completeness:'unknown',details:{priceKind:'published',evidence:{documentUrl:'https://example.com/offer',sha256:'a'.repeat(64),rawPrice:'150',rawCurrency:'BRL'}},...extra});
const adapter=(id,categories,search)=>({id,name:id,categories,kind:'native',configured:true,implemented:true,requiresKey:null,search});

test('native collection is available without paid API credentials across all six categories',()=>{
 const service=createTravelSearchEngine({env:{}}),sources=service.providers().filter(p=>p.kind==='native'&&p.configured);
 assert.ok(sources.length>=7);
 for(const category of ['hotels','flights','activities','tickets','cars','transfers'])assert.ok(sources.some(s=>s.categories.includes(category)),category);
 assert.ok(sources.every(s=>s.requiresKey===null));
 assert.equal(service.providers().find(p=>p.id==='native-hoteis-public').configured,false);
});

test('one trip query routes city and airport context correctly and preserves experience categories',async()=>{
 const calls=[];
 const service=createTravelSearchEngine({now:()=>now,adapters:[
  adapter('native-test-flights',['flights'],async r=>{calls.push(r);return {offers:[offer('flights')],requestsUsed:1,networkRequests:2};}),
  adapter('native-test-stay',['hotels'],async r=>{calls.push(r);return {offers:[offer('hotels')],requestsUsed:1,networkRequests:3};}),
  adapter('native-test-experiences',['activities','tickets','transfers'],async r=>{calls.push(r);return {offers:['activities','tickets','transfers'].map(c=>offer(c)),requestsUsed:1,networkRequests:2};})
 ]});
 const result=await service.search(request,scoped);
 assert.equal(calls.length,3);assert.equal(calls[0].category,'flights');assert.equal(calls[0].origin,'GRU');assert.equal(calls[0].destination,'POA');assert.equal(calls[1].destination,'Porto Alegre');assert.equal(calls[2].category,'trip');
 assert.equal(result.offers.length,5);assert.deepEqual(new Set(result.offers.map(o=>o.category)),new Set(['flights','hotels','activities','tickets','transfers']));assert.equal(result.summary.networkRequests,7);
 assert.equal(result.offers.find(o=>o.category==='tickets').requestSnapshot.category,'tickets');
 assert.equal(result.request.destination,'Porto Alegre');assert.ok(result.offers.every(o=>o.details.evidence.sha256.length===64));
});

test('published fare cannot become a complete quote and catalog flexibility does not recrawl each day',async()=>{
 let calls=0;
 const source={...adapter('native-test-catalog',['activities'],async()=>{calls++;return {offers:[offer('activities',{completeness:'complete',price:{amount:100,currency:'BRL',basis:'stay',taxesIncluded:true}})],requestsUsed:1,networkRequests:2};}),dateIndependent:true};
 const service=createTravelSearchEngine({now:()=>now,adapters:[source]});
 const result=await service.search({...request,category:'activities',flexDays:2},scoped);assert.equal(calls,1);assert.equal(result.offers[0].completeness,'unknown');assert.equal(result.offers[0].comparison.eligible,false);assert.equal(result.offers[0].comparison.priceGroup,null);
 await service.search({...request,category:'activities',flexDays:2},scoped);assert.equal(calls,1);
 await service.search({...request,category:'activities',mode:'quote',flexDays:0},scoped);assert.equal(calls,2,'mode is part of the cache key');
});

test('missing trip airports skips only flights, blocks stay visible, and source failures count traffic',async()=>{
 let flightCalls=0;
 const service=createTravelSearchEngine({now:()=>now,adapters:[adapter('native-flight',['flights'],async()=>{flightCalls++;return {offers:[]};}),adapter('native-block',['hotels'],async()=>{throw Object.assign(new Error('private detail'),{code:'ROBOTS_DISALLOWED',networkRequests:1});})]});
 const {originAirport,destinationAirport,...input}=request;const result=await service.search(input,scoped);
 assert.equal(flightCalls,0);assert.equal(result.providers.find(p=>p.id==='native-flight').status,'unsupported');assert.equal(result.providers.find(p=>p.id==='native-block').status,'blocked');assert.equal(result.summary.networkRequests,1);assert.ok(!JSON.stringify(result).includes('private detail'));
});

test('room deepening validates numeric hotel ID and isolates hotel-specific cached requests',async()=>{
 const calls=[];const service=createTravelSearchEngine({now:()=>now,adapters:[adapter('native-stay',['hotels'],async r=>{calls.push(r.hotelId);return {offers:[offer('hotels')],requestsUsed:1};})]});
 for(const hotelId of ['7620','3497'])await service.search({...request,category:'hotels',hotelId},scoped);
 assert.deepEqual(calls,['7620','3497']);
 for(const hotelId of ['https://127.0.0.1','../../private','7620&x=1',-1])assert.throws(()=>validateTravelSearch({...request,category:'hotels',hotelId},{now}),{status:422});
 assert.throws(()=>validateTravelSearch({...request,hotelId:'7620'},{now}),{status:422});
});
