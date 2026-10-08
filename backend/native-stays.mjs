import {createHash} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
import {createNativeCollector} from './native-http.mjs';

const HOST='reservas.laghetto.com.br';
const VERSION='laghetto-chain-html-v1';
const MAX_BYTES=3*1024*1024;
// City folders were read from the hotel's public booking form. No guessed IDs.
const cities=Object.freeze([
 {name:'Gramado',key:'gramado',folder:'458'},
 {name:'Canela',key:'canela',folder:'462'},
 {name:'Rio de Janeiro',key:'rio de janeiro',folder:'459'},
 {name:'Bento Gonçalves',key:'bento goncalves',folder:'460'},
 {name:'Porto Alegre',key:'porto alegre',folder:'461'},
 {name:'Rio Grande',key:'rio grande',folder:'504'},
 {name:'São Paulo',key:'sao paulo',folder:'838'},
]);
// Public hotel IDs and city folders observed in the official booking selector.
const hotelCatalog=Object.freeze([{"hotelId":"3480","name":"Hotel Laghetto Gramado","city":"Gramado"},{"hotelId":"3483","name":"Hotel Laghetto Siena","city":"Gramado"},{"hotelId":"3484","name":"Hotel Laghetto Toscana","city":"Gramado"},{"hotelId":"3491","name":"Hotel Laghetto Viale","city":"Gramado"},{"hotelId":"3497","name":"Hotel Laghetto Premio","city":"Gramado"},{"hotelId":"3501","name":"Hotel Laghetto Bento","city":"Bento Gonçalves"},{"hotelId":"3502","name":"Hotel Laghetto Moinhos","city":"Porto Alegre"},{"hotelId":"3807","name":"Hotel Laghetto Stilo Centro","city":"Gramado"},{"hotelId":"4744","name":"Hotel Laghetto Pedras Altas","city":"Gramado"},{"hotelId":"5705","name":"Hotel Laghetto Stilo Barra","city":"Rio de Janeiro"},{"hotelId":"6174","name":"Hotel Laghetto Stilo Borges","city":"Gramado"},{"hotelId":"6175","name":"Hotel Laghetto Vivace","city":"Canela"},{"hotelId":"6458","name":"Hotel Bangalôs da Serra","city":"Gramado"},{"hotelId":"6657","name":"Hotel Laghetto Stilo Higienópolis","city":"Porto Alegre"},{"hotelId":"7620","name":"Hotel Laghetto Rio Grande","city":"Rio Grande"},{"hotelId":"9220","name":"Hotel Laghetto Fratello","city":"Gramado"},{"hotelId":"9221","name":"Hotel Laghetto Estação","city":"Bento Gonçalves"},{"hotelId":"10571","name":"Hotel Laghetto Villa Moura","city":"Rio Grande"},{"hotelId":"13135","name":"Hotel Laghetto Stilo Vita","city":"Gramado"},{"hotelId":"13592","name":"Laghetto Resort Golden","city":"Gramado"},{"hotelId":"15352","name":"Hotel Chateau Laghetto Collection","city":"Gramado"},{"hotelId":"15353","name":"Hotel Laghetto Canela","city":"Canela"},{"hotelId":"16608","name":"Hotel Laghetto Stilo São Paulo","city":"São Paulo"},{"hotelId":"19036","name":"Lifestyle Laghetto Collection","city":"Rio de Janeiro"},{"hotelId":"20922","name":"Laghetto Stilo Garden","city":"Gramado"}]);
export const nativeStayCatalog=Object.freeze([
 Object.freeze({id:'native-laghetto',name:'Laghetto · coleta própria',categories:['hotels'],requiresKey:null,implemented:true,configured:true,kind:'native',docsUrl:'https://reservas.laghetto.com.br/chain/2143/hotels?lang=pt-BR&currencyId=16'}),
 Object.freeze({id:'native-hoteis-public',name:'Hoteis.com · acesso direto restrito',categories:['hotels'],requiresKey:null,implemented:false,configured:false,kind:'native',docsUrl:'https://www.hoteis.com/robots.txt',reason:'A política pública para robôs bloqueia /Hotel-Search. Coleta direta desativada.'}),
]);
const clean=(value,max=500)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,max):'';
const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fail=(code,message)=>Object.assign(new Error(message),{code});
const day=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:null;};
const brDate=value=>value.slice(8,10)+value.slice(5,7)+value.slice(0,4);
function cityFor(value){const q=normalize(value).replace(/\s*[,/-]\s*(?:rs|rj|sp|brasil|brazil)(?:\s*[,/-]\s*(?:brasil|brazil))?$/,'');return cities.find(city=>city.key===q)||null;}
function validateRequest(request){
 if(request?.category!=='hotels')return 'Esta fonte consulta hospedagens.';
 if(!cityFor(request.destination))return 'A coleta própria da Laghetto atende Gramado, Canela, Bento Gonçalves, Porto Alegre, Rio Grande, Rio de Janeiro e São Paulo.';
 if(request.rooms!==1||!Array.isArray(request.childrenAges)||request.childrenAges.length)return 'Esta fonte direta foi validada apenas para um quarto e sem crianças. Use outra fonte para esta ocupação.';
 if(!Number.isInteger(request.adults)||request.adults<1||request.adults>9)return 'Informe a quantidade de adultos.';
 if(!day(request.start)||!day(request.end)||request.end<=request.start)return 'Informe entrada e saída válidas para a hospedagem.';
 if(request.currency!=='BRL')return 'Esta fonte foi validada em reais.';
 return null;
}
export function nativeStayUrl(request,{hotelId}={}){
 const invalid=validateRequest(request);if(invalid)throw fail('UNSUPPORTED_REQUEST',invalid);
 if(hotelId!==undefined&&!/^\d{1,8}$/.test(String(hotelId)))throw fail('INVALID_HOTEL','Identificador do hotel inválido.');
 const url=new URL(hotelId?'https://'+HOST+'/hotelresults':'https://'+HOST+'/chainresults');
 url.searchParams.set('c','2143');
 if(hotelId)url.searchParams.set('q',String(hotelId));
 else url.searchParams.set('hotel_folder',cityFor(request.destination).folder);
 for(const [key,value] of Object.entries({NRooms:'1',CheckIn:brDate(request.start),CheckOut:brDate(request.end),ad:String(request.adults),ch:'',ag:'',Code:'',group_code:'',lang:'pt-BR',currencyId:'16',version:'4'}))url.searchParams.set(key,value);
 return url.href;
}
function decimalPrice(raw){const v=clean(raw);const m=v.match(/^R\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})$/);if(!m)return null;const n=Number(m[1].replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n>0&&n<1e8?n:null;}
function pageUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===HOST&&!u.username&&!u.password&&u.pathname==='/chainresults'?u:null;}catch{return null;}}
export function parseNativeStays(html,{request,sourceUrl,collectedAt=new Date().toISOString(),sha256}={}){
 const invalid=validateRequest(request);if(invalid)throw fail('UNSUPPORTED_REQUEST',invalid);
 if(typeof html!=='string'||Buffer.byteLength(html)>MAX_BYTES)throw fail('RESPONSE_TOO_LARGE','A página ultrapassou o limite da coleta.');
 const source=pageUrl(sourceUrl);if(!source)throw fail('UNSAFE_SOURCE','Endereço da fonte não permitido.');
 const time=Date.parse(collectedAt);if(!Number.isFinite(time))throw fail('INVALID_DATE','Horário de coleta inválido.');
 const dom=new JSDOM(html,{url:source.href,virtualConsole:new VirtualConsole()});
 try{
  const d=dom.window.document;d.querySelectorAll('script,style,noscript').forEach(el=>el.remove());
  const field=name=>d.querySelector('input[name="'+name+'"]')?.value;
  const q=source.searchParams;
  const dateMatch=field('CheckIn')===brDate(request.start)&&field('CheckOut')===brDate(request.end)&&q.get('CheckIn')===brDate(request.start)&&q.get('CheckOut')===brDate(request.end);
  const occupancyMatch=field('ad')===String(request.adults)&&field('NRooms')==='1'&&['','0'].includes(field('ch'))&&q.get('ad')===String(request.adults)&&q.get('NRooms')==='1'&&['','0'].includes(q.get('ch'));
  const currencyMatch=field('currencyId')==='16'&&q.get('currencyId')==='16';
  const allCards=[...d.querySelectorAll('.property-offer')];
  const base={schema:VERSION,counts:{cards:allCards.length,matchingCity:0,priced:0,excluded:0},offers:[],warnings:[]};
  if(!dateMatch||!occupancyMatch||!currencyMatch){base.warnings.push('A página não confirmou as datas, a ocupação ou a moeda do pedido. Nenhum preço foi aproveitado.');return base;}
  const city=cityFor(request.destination),seen=new Set(),digest=sha256||createHash('sha256').update(html).digest('hex');
  for(const card of allCards.slice(0,80)){
   const title=clean(card.querySelector('.property-name')?.textContent,200),address=clean(card.querySelector('.property-address')?.textContent,350);
   // Match the explicit city in the address, not a hotel name mentioning a place.
   const place=normalize(address).split(',').map(v=>v.trim()).filter(Boolean);
   if(place.at(-1)!=='brasil'||place.at(-2)!==city.key)continue;base.counts.matchingCity++;
   const priceElement=card.querySelector('.property-offer-top .property-price-per-night .property-price')||card.querySelector('.property-price-per-night .property-price');
   const rawPrice=clean(priceElement?.textContent,80),amount=decimalPrice(rawPrice),id=card.querySelector('[data-hotelid]')?.getAttribute('data-hotelid');
   const priceArea=priceElement?.closest('.price'),startsAt=clean(priceArea?.querySelector('.price-start-message-holder')?.textContent),perNight=clean(priceElement?.parentElement?.querySelector('.per_night')?.textContent);
   if(!title||amount===null||!/^\d{1,8}$/.test(id||'')||normalize(startsAt)!=='a partir de'||perNight!=='/noite'||seen.has(id)){base.counts.excluded++;continue;}seen.add(id);base.counts.priced++;
   const excludedTaxes=!!priceArea.querySelector('.tax_string_info_not_included'),includedTaxes=!!priceArea.querySelector('.tax_string_info_included');
   const taxesIncluded=excludedTaxes?false:includedTaxes?true:null;
   base.offers.push({id:'native-laghetto-'+id,provider:'native-laghetto',source:'Laghetto · site oficial',category:'hotels',title,sourceUrl:nativeStayUrl(request,{hotelId:id}),capturedAt:new Date(time).toISOString(),expiresAt:new Date(time+300000).toISOString(),
    price:{amount,currency:'BRL',basis:'from',taxesIncluded},
    conditions:{datesVerified:true,occupancyVerified:true,priceScope:'starting_nightly_rate',availabilityConfirmed:false,roomSelectionRequired:true,mealPlan:null,cancellation:null},
    details:{address,destination:city.name,collectionMethod:'direct_public_html',priceKind:'published',advertisedBasis:'nightly',priceScope:'one_room_starting_rate',sourceTimestampAvailable:false,publishedStart:request.start,publishedEnd:request.end,publishedAdults:request.adults,publishedRooms:1,hotelId:id,
     evidence:{documentUrl:source.href,sha256:digest,parserVersion:VERSION,selector:'.property-offer .property-price-per-night .property-price',rawPrice,rawCurrency:'R$',rawPriceBasis:'A partir de · /noite',collectedAt:new Date(time).toISOString()}},
    warnings:['Preço inicial por noite encontrado no site oficial para o período pesquisado; não é o total da hospedagem.','Selecione o quarto e a tarifa na fonte para confirmar disponibilidade, total e condições. O valor não foi multiplicado pelas noites.',...(taxesIncluded===false?['A fonte informa impostos e taxas não inclusos.']:taxesIncluded===null?['A inclusão de impostos e taxas não foi confirmada.']:[])],
    bookable:false,completeness:'selection_required',offerType:'published_opportunity'});
  }
  if(!allCards.length)base.warnings.push('O site não retornou o formato esperado da lista de hotéis. Nenhum preço foi estimado.');
  if(base.counts.matchingCity&&!base.offers.length)base.warnings.push('A página listou hotéis no destino, mas não apresentou preços iniciais válidos para leitura. Isso não confirma indisponibilidade.');
  base.warnings.push('Tarifas iniciais por noite, com seleção de quarto pendente; não equivalem a cotações totais de operadora.');
  return base;
 }finally{dom.window.close();}
}

export function parseNativeStayRates(html,{request,sourceUrl,collectedAt=new Date().toISOString(),sha256,hotel}={}){
 const invalid=validateRequest(request);if(invalid)throw fail('UNSUPPORTED_REQUEST',invalid);
 if(typeof html!=='string'||Buffer.byteLength(html)>MAX_BYTES)throw fail('RESPONSE_TOO_LARGE','A página ultrapassou o limite da coleta.');
 const url=new URL(sourceUrl),hotelId=url.searchParams.get('q');
 if(url.protocol!=='https:'||url.hostname!==HOST||url.username||url.password||url.pathname!=='/hotelresults'||!/^\d{1,8}$/.test(hotelId||'')||hotel?.hotelId!==hotelId||cityFor(request.destination)?.key!==normalize(hotel?.city))throw fail('UNSAFE_SOURCE','O hotel não pertence ao destino confirmado na pesquisa.');
 const time=Date.parse(collectedAt);if(!Number.isFinite(time))throw fail('INVALID_DATE','Horário de coleta inválido.');
 const dom=new JSDOM(html,{url:url.href,virtualConsole:new VirtualConsole()});
 try{
  const d=dom.window.document;d.querySelectorAll('script,style,noscript').forEach(el=>el.remove());
  const field=name=>d.querySelector('input[name="'+name+'"]')?.value,q=url.searchParams;
  const matched=field('q')===hotelId&&field('CheckIn')===brDate(request.start)&&field('CheckOut')===brDate(request.end)&&q.get('CheckIn')===brDate(request.start)&&q.get('CheckOut')===brDate(request.end)&&field('ad')===String(request.adults)&&field('NRooms')==='1'&&['','0'].includes(field('ch'))&&field('currencyId')==='16'&&q.get('ad')===String(request.adults)&&q.get('NRooms')==='1'&&q.get('currencyId')==='16'&&['','0'].includes(q.get('ch'));
  const hotelName=clean(d.querySelector('.hotel_name')?.textContent,200),rates=[...d.querySelectorAll('.roomrate .rate_plan.roomrateinfo')];
  const out={offers:[],warnings:[],schema:'laghetto-room-html-v1',counts:{rates:rates.length,excluded:0}};
  if(!matched||!hotelName||normalize(hotelName)!==normalize(hotel.name)){out.warnings.push('A página do hotel não confirmou o hotel, as datas, a ocupação e a moeda do pedido.');return out;}
  const nights=(Date.parse(request.end)-Date.parse(request.start))/86400000,digest=sha256||createHash('sha256').update(html).digest('hex'),seen=new Set();
  const decimal=value=>typeof value==='string'&&/^\d+(?:\.\d{1,6})?$/.test(value)?Number(value):NaN;
  for(const rate of rates.slice(0,100)){
   const attr=name=>rate.getAttribute('data-'+name),room=clean(attr('room-name'),150),roomId=attr('room-id'),rateId=attr('rate-id');
   const publicArea=rate.querySelector('.public-rate'),rawPrice=attr('total-price-after-tax-public'),before=decimal(attr('total-price-before-tax-public')),after=decimal(rawPrice),taxes=decimal(attr('total-taxes'));
   const visiblePrice=clean(publicArea?.querySelector('.price-total-bold')?.textContent,80),displayed=decimalPrice(visiblePrice);
   const taxHolder=[...rate.closest('.roomrate').querySelectorAll('.room-tax-holder')].find(el=>el.getAttribute('data-room-id')===roomId&&el.getAttribute('data-rate-id')===rateId);
   const taxVisible=decimalPrice(clean(taxHolder?.querySelector('.room-tax-total-price-public')?.textContent,80));
   const consistent=Number.isFinite(before)&&Number.isFinite(after)&&Number.isFinite(taxes)&&after>0&&after<1e8&&before>0&&taxes>=0&&Math.abs(before+taxes-after)<0.005&&displayed!==null&&Math.abs(displayed-before)<0.005&&taxVisible!==null&&Math.abs(taxVisible-taxes)<0.005;
   const available=/^\d+$/.test(attr('max-quantity')||'')&&Number(attr('max-quantity'))>0;
   if(!publicArea||!room||!/^\d+$/.test(roomId||'')||!/^\d+$/.test(rateId||'')||attr('has-loyalty')!=='false'||attr('start')!==request.start||attr('end')!==request.end||attr('adults')!==String(request.adults)||attr('children')!=='0'||attr('children-ages')!==''||Number(attr('nights'))!==nights||attr('rate-currency-string-symbol')!=='BRL'||attr('rate-currency')!=='16'||!available||!consistent){out.counts.excluded++;continue;}
   const key=hotelId+'-'+roomId+'-'+rateId;if(seen.has(key))continue;seen.add(key);
   const cancellation=clean(rate.querySelector('.cancellation-text-policy-wrapper')?.textContent,250)||null;
   out.offers.push({id:'native-laghetto-rate-'+key,provider:'native-laghetto',source:'Laghetto · tarifa pública do hotel',category:'hotels',title:hotelName+' · '+room,sourceUrl:url.href,capturedAt:new Date(time).toISOString(),expiresAt:new Date(time+300000).toISOString(),price:{amount:Math.round(after*100)/100,currency:'BRL',basis:'stay',taxesIncluded:true},
    conditions:{datesVerified:true,occupancyVerified:true,priceScope:'one_room_stay',roomType:room,mealPlan:clean(attr('board'),150)||null,freeCancellation:attr('free-cancel')==='true'?true:attr('free-cancel')==='false'?false:null,cancellation,availabilityConfirmed:false},
    details:{hotelId,roomId,rateId,fare:clean(attr('rate-name'),150),roomType:room,collectionMethod:'direct_public_html',priceKind:'dated_quote',publishedStart:request.start,publishedEnd:request.end,publishedAdults:request.adults,publishedRooms:1,staySubtotal:Math.round(before*100)/100,listedTaxes:Math.round(taxes*100)/100,
     evidence:{documentUrl:url.href,sha256:digest,parserVersion:'laghetto-room-html-v1',selector:'.roomrate .rate_plan.roomrateinfo[data-total-price-after-tax-public]',rawPrice,rawCurrency:'BRL',rawDisplayedSubtotal:visiblePrice,rawListedTaxes:attr('total-taxes'),collectedAt:new Date(time).toISOString()}},
    warnings:['Total da tarifa pública para um quarto, com os impostos informados pelo hotel; extras opcionais podem ser cobrados separadamente.','Preço e disponibilidade observados na consulta; reconfirme no hotel antes de reservar. Esta pesquisa não emite nem garante a tarifa.'],bookable:false,completeness:'complete',offerType:'quoted_public_rate'});
  }
  if(!rates.length)out.warnings.push('O hotel não apresentou tarifas públicas legíveis para este período. Nenhum valor foi estimado.');
  if(out.counts.excluded)out.warnings.push('Algumas tarifas foram omitidas porque datas, ocupação, moeda ou composição do total não puderam ser conferidas.');
  return out;
 }finally{dom.window.close();}
}
export function createNativeStayAdapters({collector=createNativeCollector(),now=()=>Date.now()}={}){
 return nativeStayCatalog.filter(entry=>entry.implemented).map(entry=>({...entry,
  async search(request,{signal}={}){
   const invalid=validateRequest(request);if(invalid)return {offers:[],warnings:[invalid],requestsUsed:0,networkRequests:0};
   const direct=request.hotelId===undefined?null:hotelCatalog.find(h=>h.hotelId===String(request.hotelId)&&normalize(h.city)===cityFor(request.destination).key);
   if(request.hotelId!==undefined&&!direct)return {offers:[],warnings:['Este hotel não pertence ao catálogo verificado para o destino.'],requestsUsed:0,networkRequests:0};
   const documents=[],warnings=[];let networkRequests=0,offers=[];
   async function collect(url){const page=await collector.getHtml(url,{signal,allowedHosts:[HOST]});networkRequests+=page.networkRequests??1;documents.push({documentUrl:page.url||url,sha256:page.sha256,fetchedAt:page.fetchedAt,robots:page.robots});return page;}
   let selected;
   if(direct)selected=[direct];
   else{
    const sourceUrl=nativeStayUrl(request),page=await collect(sourceUrl);
    const parsed=parseNativeStays(page.html,{request,sourceUrl:page.url||sourceUrl,collectedAt:page.fetchedAt||new Date(now()).toISOString(),sha256:page.sha256});
    offers=parsed.offers;warnings.push(...parsed.warnings);
    // Bounded follow-up: read at most two actual hotel pages from parsed cards.
    selected=[...offers].sort((a,b)=>a.price.amount-b.price.amount).slice(0,2).map(o=>({hotelId:o.details.hotelId,name:o.title,city:o.details.destination}));
   }
   const rooms=await Promise.all(selected.map(async hotel=>{
    try{const sourceUrl=nativeStayUrl(request,{hotelId:hotel.hotelId}),page=await collect(sourceUrl),parsed=parseNativeStayRates(page.html,{request,sourceUrl:page.url||sourceUrl,collectedAt:page.fetchedAt||new Date(now()).toISOString(),sha256:page.sha256,hotel});warnings.push(...parsed.warnings);return parsed.offers;}
    catch(error){networkRequests+=Number(error?.networkRequests)||0;warnings.push('Não foi possível conferir os quartos de '+hotel.name+'. As demais respostas foram preservadas.');return [];}
   }));
   const detailed=rooms.flat(),detailedHotels=new Set(detailed.map(o=>o.details.hotelId));
   offers=[...detailed,...offers.filter(o=>!detailedHotels.has(o.details.hotelId))];
   return {offers,warnings:[...new Set(warnings)],requestsUsed:1,networkRequests,evidence:{documents,parserVersion:direct?'laghetto-room-html-v1':VERSION,extracted:offers.length,detailedHotels:detailedHotels.size,pagesRead:documents.length}};
  }
 }));
}
