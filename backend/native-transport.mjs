import {createHash} from 'node:crypto';
import {createNativeCollector} from './native-http.mjs';

// Public pages, independently fetched by TravelPro. No supplier/search API or key.
export const nativeTransportCatalog=Object.freeze([
 {id:'native-gol',name:'GOL · coleta própria',categories:['flights'],requiresKey:null,implemented:true,configured:true,kind:'native',docsUrl:'https://www.voegol.com.br/br/voos-de-porto-alegre'},
 {id:'native-azul',name:'Azul · coleta própria',categories:['flights'],requiresKey:null,implemented:true,configured:true,kind:'native',docsUrl:'https://passagens.voeazul.com.br/pt/voos-de-porto-alegre'},
 {id:'native-movida-prepaid',name:'Movida Pré-Pago · coleta própria',categories:['cars'],requiresKey:null,implemented:true,configured:true,kind:'native',dateIndependent:true,docsUrl:'https://www.movida.com.br/prepago'}
].map(entry=>Object.freeze({...entry,coverage:{type:'published_catalog',limited:true,label:entry.id==='native-movida-prepaid'?'Pacotes públicos de cinco diárias, sem confirmar loja ou datas.':'Catálogo público de promoções; a rota e as datas precisam constar na página.'},capabilities:{modes:entry.id==='native-movida-prepaid'?['opportunities']:['quote','opportunities'],datedQuotes:false,publishedOffers:true,roomSelection:false}})));
const SOURCES={
 'native-gol':{name:'GOL',host:'www.voegol.com.br',defaultUrl:'https://www.voegol.com.br/br/voos',portoAlegre:'https://www.voegol.com.br/br/voos-de-porto-alegre',saoPaulo:'https://www.voegol.com.br/br/voos-de-porto-alegre-para-sao-paulo'},
 'native-azul':{name:'Azul',host:'passagens.voeazul.com.br',defaultUrl:'https://passagens.voeazul.com.br/pt/melhores-ofertas',portoAlegre:'https://passagens.voeazul.com.br/pt/voos-de-porto-alegre',saoPaulo:'https://passagens.voeazul.com.br/pt/voos-de-porto-alegre-para-s%C3%A3o-paulo'},
 'native-movida-prepaid':{name:'Movida Pré-Pago',host:'www.movida.com.br',defaultUrl:'https://www.movida.com.br/prepago'}
};
const MAX_BYTES=2*1024*1024;
const text=(value,max=350)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function failure(code,message){return Object.assign(new Error(message),{code});}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const stamp=Date.parse(value+'T00:00:00Z');return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value;}
function scriptData(html){
 if(typeof html!=='string'||Buffer.byteLength(html)>MAX_BYTES)throw failure('RESPONSE_TOO_LARGE','Página acima do limite de leitura.');
 const scripts=html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
 for(const [,attributes,content] of scripts)if(/\bid\s*=\s*(["'])__NEXT_DATA__\1/i.test(attributes)){
  try{return JSON.parse(content);}catch{throw failure('INVALID_PAGE','Os dados públicos da página não puderam ser lidos.');}
 }
 return null;
}
export function parseNativeTransport(html,{provider,sourceUrl,collectedAt=new Date().toISOString()}={}){
 const source=SOURCES[provider];if(!source)throw failure('UNKNOWN_SOURCE','Fonte de transporte desconhecida.');
 const url=new URL(sourceUrl);if(url.protocol!=='https:'||url.hostname!==source.host||url.username||url.password)throw failure('UNSAFE_SOURCE','Endereço de fonte não permitido.');
 const captured=Date.parse(collectedAt);if(!Number.isFinite(captured))throw failure('INVALID_DATE','Horário de coleta inválido.');
 const state=scriptData(html)?.props?.pageProps?.apolloState?.data;
 if(!state||typeof state!=='object')return {offers:[],warnings:['A página pública não contém os dados de tarifas esperados. Nenhum preço foi estimado.'],schema:'unavailable',counts:{published:0,redemptionsExcluded:0,invalidExcluded:0}};
 const offers=[],warnings=[],seen=new Set();let published=0,redemptionsExcluded=0,invalidExcluded=0;
 for(const [moduleId,module] of Object.entries(state)){
  if(!moduleId.startsWith('StandardFareModule:')||!Array.isArray(module?.fares))continue;
  for(const [fareIndex,fare] of module.fares.slice(0,150).entries()){
   published++;
   if(!fare||typeof fare!=='object'||Array.isArray(fare)){invalidExcluded++;continue;}
   // The live Azul HTML labels points entries BRL too; redemption is authoritative.
   if(fare.redemption||module.prepopulationSettings?.redemptionUnit&&module.prepopulationSettings.redemptionUnit!=='CURRENCY'){redemptionsExcluded++;continue;}
   const start=fare.departureDate,end=fare.returnDate||'',origin=fare.originAirportCode,destination=fare.destinationAirportCode,amount=fare.totalPrice,currency=fare.currencyCode;
   if(!/^[A-Z]{3}$/.test(origin||'')||!/^[A-Z]{3}$/.test(destination||'')||!validDate(start)||(end&&!validDate(end))||typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1e7||currency!=='BRL'||!['ONE_WAY','ROUND_TRIP'].includes(fare.flightType)||(fare.flightType==='ROUND_TRIP'&&!end)||(fare.flightType==='ONE_WAY'&&end)||(end&&end<start)){invalidExcluded++;continue;}
   const key=hash([provider,origin,destination,start,end,amount,currency,fare.travelClass,fare.brandedFareClass||null,fare.promoCode||null,module.prepopulationSettings?.numberOfPassengers??null]);if(seen.has(key))continue;seen.add(key);
   const passengers=module.prepopulationSettings?.numberOfPassengers;
   const advertisedPassengers=Number.isInteger(passengers)&&passengers>0?passengers:null;
   const agoValue=Number(fare.priceLastSeen?.value),agoUnit=text(fare.priceLastSeen?.unit,20);
   const priceLastSeen=Number.isFinite(agoValue)&&agoValue>=0&&/^(minute|hour|day)s?$/.test(agoUnit)?{value:agoValue,unit:agoUnit}:null;
   const sourceNote=text(module.metaData?.footer,700);
   offers.push({id:provider+'-'+key.slice(0,24),identityKey:hash([origin,destination,start,end,currency,fare.flightType,fare.travelClass,fare.brandedFareClass||null,fare.promoCode||null,advertisedPassengers]),identityKind:'published_product',provider,source:source.name,category:'flights',title:source.name+' · '+origin+' → '+destination,sourceUrl:url.href,capturedAt:new Date(captured).toISOString(),expiresAt:new Date(captured+300000).toISOString(),
    price:{amount,currency,basis:'from',taxesIncluded:null},
    conditions:{passengerPriceScope:'published_offer',advertisedPassengers,cabin:text(fare.formattedTravelClass||fare.travelClass,80),baggage:null,cancellation:null,availabilityConfirmed:false},
    details:{collectionMethod:'direct_public_html',priceKind:'published',priceScope:advertisedPassengers===1?'one_passenger':'unverified',sourceTimestampAvailable:false,publishedStart:start,publishedEnd:end,origin,destination,originCity:text(fare.originCity,120),destinationCity:text(fare.destinationCity,120),advertisedBasis:fare.flightType==='ROUND_TRIP'?'round_trip':'one_way',priceLastSeen,sourceNote,advertisedPassengers,evidence:{documentUrl:url.href,collectedAt:new Date(captured).toISOString(),parserVersion:'airtrfx-next-public-fares/v1',jsonPath:'$.props.pageProps.apolloState.data['+JSON.stringify(moduleId)+'].fares['+fareIndex+']',rawPrice:fare.totalPrice,rawCurrency:fare.currencyCode}},
    warnings:['Oferta publicada na página oficial, a partir do valor informado; não representa disponibilidade confirmada para os viajantes do pedido.','A companhia informa tarifas coletadas anteriormente; revalide preço, bagagem, taxas e regras antes de reservar.',...(advertisedPassengers===null?['O número de passageiros da tarifa publicada não foi informado.']:['Tarifa publicada para '+advertisedPassengers+' passageiro(s); o valor não foi multiplicado pelo tamanho do grupo.'])],
    bookable:false,completeness:'unknown',offerType:'published_opportunity'});
  }
 }
 if(redemptionsExcluded)warnings.push(redemptionsExcluded+' tarifas em pontos foram excluídas da comparação em reais.');
 if(invalidExcluded)warnings.push(invalidExcluded+' registros incompletos ou inválidos foram descartados.');
 return {offers,warnings,schema:'airtrfx-next-public-fares',counts:{published,redemptionsExcluded,invalidExcluded}};
}
function attribute(input,name){return input.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'))?.[2]||'';}
function plain(input){return text(input.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' '));}
export function parseMovidaPrepaid(html,{sourceUrl='https://www.movida.com.br/prepago',collectedAt=new Date().toISOString()}={}){
 const url=new URL(sourceUrl);if(url.protocol!=='https:'||url.hostname!=='www.movida.com.br'||url.pathname!=='/prepago'||url.username||url.password)throw failure('UNSAFE_SOURCE','Endereço de fonte não permitido.');
 if(typeof html!=='string'||Buffer.byteLength(html)>MAX_BYTES)throw failure('RESPONSE_TOO_LARGE','Página acima do limite de leitura.');
 const captured=Date.parse(collectedAt);if(!Number.isFinite(captured))throw failure('INVALID_DATE','Horário de coleta inválido.');
 const sourceText=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const validity=Number(sourceText.match(/at[eé]\s+(\d+)\s+meses/i)?.[1])||null,leadMinutes=Number(sourceText.match(/anteced[eê]ncia\s+de\s+(\d+)\s+minutos/i)?.[1])||null,maximumDays=Number(sourceText.match(/mais\s+de\s+(\d+)\s+di[aá]rias/i)?.[1])||null;
 const offers=[];let invalidExcluded=0;
 for(const card of html.split(/<div\b[^>]*class\s*=\s*['"]col-xs-12\s+col-md-4['"][^>]*>/i).slice(1)){
  const button=card.match(/<button\b([^>]*\bdata-price\s*=[^>]*)>/i);if(!button)continue;
  const id=attribute(button[1],'data-id'),amount=Number(attribute(button[1],'data-price')),title=plain(card.match(/<h4\b[^>]*>([\s\S]*?)<\/h4>/i)?.[1]||'');
  const select=card.match(/<select\b[^>]*class\s*=\s*['"][^'"]*selec-days[^'"]*['"][^>]*>([\s\S]*?)<\/select>/i)?.[1]||'';
  const firstOption=select.match(/<option\b([^>]*)>/i),days=Number(attribute(firstOption?.[1]||'','data-dia'));
  const displayed=card.match(/class\s*=\s*['"][^'"]*\bvalue-data\b[^'"]*['"][^>]*>\s*R\$\s*([\d.,]+)/i)?.[1];
  const shownAmount=displayed?Number(displayed.replace(/\./g,'').replace(',','.')):null;
  if(!/^\d+$/.test(id)||!title||!Number.isFinite(amount)||amount<=0||amount>1e6||days!==5||shownAmount===null||Math.abs(shownAmount-amount)>.001){invalidExcluded++;continue;}
  const model=plain(card.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
  offers.push({id:'native-movida-prepaid-'+hash([id,amount,days]).slice(0,24),identityKey:hash([id,days,title,model]),identityKind:'published_product',provider:'native-movida-prepaid',source:'Movida Pré-Pago',category:'cars',title:'Movida · '+title+' · pacote de '+days+' diárias',sourceUrl:url.href,capturedAt:new Date(captured).toISOString(),expiresAt:new Date(captured+300000).toISOString(),price:{amount,currency:'BRL',basis:'from',taxesIncluded:null},conditions:{availabilityConfirmed:false,packageDays:days,redemptionValidityMonths:validity,maximumPurchasedDays:maximumDays,redemptionLeadMinutes:leadMinutes,inclusions:[/di[aá]ria\s+de\s+27\s+horas/i.test(sourceText)?'Diária de 27 horas':null,/prote[çc][aã]o\s+b[aá]sica/i.test(sourceText)?'Proteção básica':null,/taxa\s+de\s+loca[çc][aã]o/i.test(sourceText)?'Taxa de locação':null].filter(Boolean),cityAvailabilityConfirmed:false},details:{collectionMethod:'direct_public_html',priceKind:'published',priceScope:'pacote_5_diarias',sourceTimestampAvailable:false,publishedStart:null,publishedEnd:null,requestedDatesMatched:false,carCategory:title,modelExamples:model,packageDays:days,evidence:{documentUrl:url.href,collectedAt:new Date(captured).toISOString(),parserVersion:'movida-prepaid-public-html/v1',selector:'button.btn-buy-carrosel[data-id="'+id+'"]',rawPrice:attribute(button[1],'data-price'),rawCurrency:'R$',rawDisplayPrice:displayed},advertisedDailyAmount:Number((amount/days).toFixed(2)),sourceNote:'Pacote pré-pago de diárias, sujeito às regras de resgate; não confirma carro, loja ou data.'},warnings:['Valor do pacote pré-pago de cinco diárias; não é o total de uma reserva para o período solicitado.',...(validity?['Prazo publicado de uso: '+validity+' meses após a aquisição.']:['Prazo de uso não identificado na página; verifique as condições.']),'Nenhuma disponibilidade foi verificada para o destino e as datas do pedido.'],bookable:false,completeness:'unknown',offerType:'published_opportunity'});
 }
 return {offers,warnings:invalidExcluded?[invalidExcluded+' produtos com valores ou estrutura divergentes foram descartados.']:[],schema:offers.length?'movida-prepaid-public-html':'unavailable',counts:{published:offers.length,invalidExcluded}};
}
function pageFor(provider,request){const source=SOURCES[provider];if(request.origin==='POA'&&source.portoAlegre)return ['CGH','GRU','SAO'].includes(request.destination)?source.saoPaulo:source.portoAlegre;return source.defaultUrl;}
function matchesRoute(offer,request){return (!request.origin||offer.details.origin===request.origin)&&(!request.destination||offer.details.destination===request.destination);}
function matchesDates(offer,request){return (!request.start||offer.details.publishedStart===request.start)&&(!request.end?offer.details.publishedEnd==='':offer.details.publishedEnd===request.end);}
export function createNativeTransportAdapters({collector=createNativeCollector(),now=()=>Date.now()}={}){
 async function collect(entry,request,signal){const sourceUrl=pageFor(entry.id,request),page=await collector.getHtml(sourceUrl,{signal,allowedHosts:[SOURCES[entry.id].host]}),options={provider:entry.id,sourceUrl:page.url||sourceUrl,collectedAt:page.fetchedAt||new Date(now()).toISOString()},parsed=entry.id==='native-movida-prepaid'?parseMovidaPrepaid(page.html,options):parseNativeTransport(page.html,options);const evidence={sourceUrl:page.url||sourceUrl,sha256:page.sha256,bytes:Buffer.byteLength(page.html),extracted:parsed.offers.length,collectedAt:page.fetchedAt||new Date(now()).toISOString(),schema:parsed.schema};return {parsed,page,evidence};}
 function support(entry,request){
  if(!entry.categories.includes(request.category))return {supported:false,code:'category',reason:'Categoria não atendida pelo conector.'};
  if(entry.id==='native-movida-prepaid'&&request.mode!=='opportunities')return {supported:false,code:'mode',reason:'A Movida Pré-Pago publica pacotes de diárias. Use o modo oportunidades; não há cotação por data neste conector.'};
  return {supported:true};
 }
 return nativeTransportCatalog.map(entry=>({...entry,supports:request=>support(entry,request),
  async search(request,{signal}={}){
   const supported=support(entry,request);if(!supported.supported)return {offers:[],warnings:[supported.reason],requestsUsed:0,networkRequests:0};
   const {parsed,page,evidence}=await collect(entry,request,signal);
   if(entry.id==='native-movida-prepaid')return {...parsed,offers:parsed.offers.map(o=>({...o,details:{...o.details,evidence:{...evidence,...o.details.evidence,sha256:evidence.sha256}}})),requestsUsed:1,networkRequests:page.networkRequests,evidence};
   const today=new Date(now()).toISOString().slice(0,10),routeOffers=parsed.offers.filter(o=>o.details.publishedStart>=today&&matchesRoute(o,request));
   const offers=routeOffers.filter(o=>request.mode==='opportunities'||matchesDates(o,request)).map(o=>({...o,details:{...o.details,requestedDatesMatched:matchesDates(o,request),evidence:{...evidence,...o.details.evidence,sha256:evidence.sha256}}}));
   return {offers,warnings:[...parsed.warnings,'A coleta lê as ofertas publicadas pela companhia e não consulta o estoque de reservas.',...(!offers.length&&routeOffers.length?['A página possui '+routeOffers.length+' ofertas para a rota, mas nenhuma nas datas exatas solicitadas.']:[])],requestsUsed:1,networkRequests:page.networkRequests,evidence:{...evidence,matched:offers.length}};
  },
  async discover(request={}, {signal}={}){
   const {parsed,page,evidence}=await collect(entry,request,signal);
   if(entry.id==='native-movida-prepaid')return {...parsed,offers:parsed.offers.map(o=>({...o,details:{...o.details,evidence:{...evidence,...o.details.evidence,sha256:evidence.sha256}}})),requestsUsed:1,networkRequests:page.networkRequests,evidence};
   const today=new Date(now()).toISOString().slice(0,10);
   const offers=parsed.offers.filter(o=>o.details.publishedStart>=today&&matchesRoute(o,request)&&(!request.start||o.details.publishedStart>=request.start)&&(!request.end||o.details.publishedStart<=request.end)).sort((a,b)=>a.price.amount-b.price.amount);
   return {...parsed,offers:offers.map(o=>({...o,details:{...o.details,requestedDatesMatched:matchesDates(o,request),evidence:{...evidence,...o.details.evidence,sha256:evidence.sha256}}})),requestsUsed:1,networkRequests:page.networkRequests,evidence:{...evidence,matched:offers.length}};
  }
 }));
}
