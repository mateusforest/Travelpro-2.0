import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNativeExperiences,createNativeExperienceAdapters,nativeExperienceCatalog} from '../backend/native-experiences.mjs';

const capturedAt='2026-10-08T02:59:27.000Z';
const context={provider:'civitatis',url:'https://www.civitatis.com/br/porto-alegre/',capturedAt};
const card=({name='Passeio de teste',url='/br/porto-alegre/passeio/',amount='100,10',symbol='US$',id='123'}={})=>`<article class="comfort-card _cancelation" data-activity="${id}"><a href="${url}"><h2 class="comfort-card__title">${name}</h2><div><span class="comfort-card__price__text"><span><bdi>${symbol}</bdi></span>${amount}</span></div></a></article>`;
const jsonld=node=>`<script type="application/ld+json">${JSON.stringify(node)}</script>`;
const event=(changes={})=>({'@type':'Event',name:'Atividade de teste',url:'https://www.getyourguide.com/pt-br/teste-t123/',offers:{'@type':'Offer',price:'179.00',priceCurrency:'BRL'},startDate:'2026-10-08',...changes});

test('Civitatis uses the explicit visible currency when JSON-LD contradicts the displayed amount',()=>{
  const html=card()+jsonld({'@type':'Event',name:'Passeio de teste',url:'https://www.civitatis.com/br/porto-alegre/passeio/',offers:{price:100.1,priceCurrency:'BRL'}});
  const {offers,warnings}=parseNativeExperiences(html,context);
  assert.equal(offers.length,1);assert.equal(offers[0].price.amount,100.1);assert.equal(offers[0].price.currency,'USD');
  assert.equal(offers[0].details.structuredPriceConflict.currency,'BRL');assert.equal(warnings.length,1);
  assert.match(offers[0].details.evidence.sha256,/^[a-f0-9]{64}$/);assert.match(offers[0].details.evidence.excerpt,/US\$/);
  assert.equal(offers[0].collectedAt,capturedAt);assert.equal(offers[0].details.evidence.documentUrl,context.url);
  assert.equal(offers[0].details.evidence.rawPrice,'100,10');assert.equal(offers[0].details.evidence.rawCurrency,'US$');
});

test('native extraction never promotes catalogue availability or date into a passenger-specific quote',()=>{
  const html=jsonld({'@type':'ItemList',itemListElement:[{item:event({offers:{price:179,priceCurrency:'BRL',availability:'https://schema.org/InStock'}})}]});
  const {offers}=parseNativeExperiences(html,{provider:'getyourguide',url:'https://www.getyourguide.com/pt-br/porto-alegre-l32362/',capturedAt});
  assert.equal(offers[0].price.amount,179);assert.equal(offers[0].price.basis,'from');assert.equal(offers[0].bookable,false);
  assert.equal(offers[0].details.priceKind,'published');assert.equal(offers[0].details.publishedStart,'2026-10-08');
  assert.equal(offers[0].details.requestedDatesMatched,false);assert.equal(offers[0].conditions.participantsVerified,false);
  assert.equal(offers[0].completeness,'unknown');assert.equal(offers[0].price.taxesIncluded,null);
});

test('Tiqets venue minimum is not confused with its individual admission products',()=>{
  const html=jsonld({'@graph':[
    {'@type':'Product',name:'Lugar de teste',url:'https://www.tiqets.com/pt/lugar-l1/',offers:{lowPrice:'5.00',priceCurrency:'GBP'}},
    {'@type':'ItemList',itemListElement:[{item:event({name:'Entrada e visita guiada',url:'https://www.tiqets.com/pt/bilhete-p1/',offers:{price:'54.27',priceCurrency:'GBP'}})}]},
  ]});
  const {offers}=parseNativeExperiences(html,{provider:'tiqets',url:'https://www.tiqets.com/pt/lugar-l1/',capturedAt});
  assert.equal(offers.length,1);assert.equal(offers[0].price.amount,54.27);assert.equal(offers[0].category,'tickets');
});

test('activities, public transfer references, insurance and eSIM are not conflated',()=>{
  const html=card()+card({name:'Transporte entre o Aeroporto e Gramado',url:'/br/porto-alegre/transporte/',id:'2'})+card({name:'Seguro viagem',id:'3'})+card({name:'Chip eSIM',id:'4'});
  const all=parseNativeExperiences(html,context).offers;assert.equal(all.length,2);
  const transfer=parseNativeExperiences(html,{...context,category:'transfers'}).offers;assert.equal(transfer.length,1);
  assert.equal(transfer[0].details.requestedDatesMatched,false);assert.equal(transfer[0].details.priceScope,'unknown');
});

test('Siga supplier cards retain per-person price and minimum participants without multiplying',()=>{
  const html='<a href="https://sigaturismo.com.br/passeio/teste"><div class="payt-card-wrapper atividade"><div class="payt-card-excursion-title">Passeio próprio</div><span>Preço POR PESSOA</span><span>Reserva Mínima de DUAS PESSOAS</span><div class="payt-card-atividade-badge-date">08/10/2026</div><strong class="payt-card-price-value">R$ 194,00</strong></div></a>';
  const {offers}=parseNativeExperiences(html,{provider:'siga',url:'https://sigaturismo.com.br/',capturedAt});
  assert.equal(offers[0].price.amount,194);assert.equal(offers[0].details.priceScope,'per_person');assert.equal(offers[0].conditions.minimumParticipants,2);
  assert.equal(offers[0].details.publishedStart,'2026-10-08');
});

test('foreign links, malformed prices and sold-out structured offers are excluded',()=>{
  const html=jsonld({'@type':'ItemList',itemListElement:[
    {item:event({url:'https://evil.example/p1'})},
    {item:event({offers:{price:'179x',priceCurrency:'BRL'}})},
    {item:event({offers:{price:50,priceCurrency:'BRL',availability:'https://schema.org/SoldOut'}})},
  ]});
  const result=parseNativeExperiences(html,{provider:'getyourguide',url:'https://www.getyourguide.com/pt-br/porto-alegre-l32362/',capturedAt});
  assert.deepEqual(result.offers,[]);assert.ok(result.warnings.length);
  assert.throws(()=>parseNativeExperiences(card(),{...context,url:'https://evil.example/'}),/Domínio/);
});

test('malformed JSON-LD does not execute scripts or permit an oversized document',()=>{
  const html='<script type="application/ld+json">{broken}</script><script>throw new Error("must not run")</script>';
  const result=parseNativeExperiences(html,context);assert.deepEqual(result.offers,[]);
  assert.throws(()=>parseNativeExperiences(' '.repeat(3*1024*1024+1),context),/limite/);
});

test('adapters use only mapped public pages through the shared collector, preserving network accounting',async()=>{
  const calls=[];const collector={async getHtml(url,options){calls.push({url,options});return {url,html:card(),fetchedAt:capturedAt,sha256:'a'.repeat(64),networkRequests:2};}};
  const entries=createNativeExperienceAdapters({collector});assert.ok(entries.every(x=>x.configured&&x.requiresKey===null&&x.kind==='native'&&x.dateIndependent));
  assert.equal(nativeExperienceCatalog.length,4);
  const api=entries.find(x=>x.id==='native-civitatis');
  const result=await api.search({destination:'Porto Alegre',category:'activities',start:'2027-01-01',end:'2027-01-05'});
  assert.equal(calls[0].url,'https://www.civitatis.com/br/porto-alegre/');assert.deepEqual(calls[0].options.allowedHosts,['www.civitatis.com']);
  assert.equal(result.requestsUsed,1);assert.equal(result.networkRequests,2);assert.equal(result.offers[0].details.requestedStart,'2027-01-01');
  assert.equal(result.offers[0].details.requestedDatesMatched,false);
  const skipped=await api.search({destination:'https://evil.example',category:'activities'});
  assert.equal(skipped.requestsUsed,0);assert.equal(calls.length,1);
});

test('a whole-trip invocation gathers distinct experience categories with a single page fetch',async()=>{
  let calls=0;
  const collector={async getHtml(url){calls++;return {url,html:card()+card({name:'Transfer do aeroporto',url:'/br/porto-alegre/transfer/',id:'2'})+card({name:'Ingresso de museu',url:'/br/porto-alegre/museu/',id:'3'}),fetchedAt:capturedAt,networkRequests:2};}};
  const adapter=createNativeExperienceAdapters({collector}).find(x=>x.id==='native-civitatis');
  const result=await adapter.search({destination:'Porto Alegre',category:'trip'});
  assert.equal(calls,1);assert.equal(result.requestsUsed,1);assert.equal(result.networkRequests,2);
  assert.deepEqual(result.offers.map(x=>x.category),['activities','transfers','tickets']);
  assert.ok(result.offers.every(x=>x.details.evidence.parserVersion==='native-experiences/1.0.0'));
});

test('experience identity follows a published product across price updates without merging different products',()=>{
 const a=parseNativeExperiences(card(),context).offers[0],b=parseNativeExperiences(card({amount:'125,00'}),context).offers[0];
 assert.equal(a.identityKind,'published_product');assert.equal(a.identityKey,b.identityKey);assert.notEqual(a.id,b.id);
 const distinct=parseNativeExperiences(card()+card({name:'Outro passeio',id:'999'}),context).offers;
 assert.equal(distinct.length,2);assert.notEqual(distinct[0].identityKey,distinct[1].identityKey);
});
