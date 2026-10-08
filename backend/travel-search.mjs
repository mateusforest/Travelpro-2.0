import {createHash,randomUUID} from 'node:crypto';
import {providerCatalog,createTravelAdapters} from './travel-adapters.mjs';
import {createNativeTravelAdapters} from './native-travel.mjs';

export const travelSearchLimits=Object.freeze({maxCalls:12,timeoutMs:25000,cacheTtlMs:300000,maxConcurrent:3,maxCacheEntries:500,maxOffersPerCall:100});
const DAY=86400000;
export const travelCategories=Object.freeze(['hotels','flights','activities','tickets','cars','transfers']);
const plannedSources=[
 ['firecrawl','Firecrawl','https://docs.firecrawl.dev/'],
 ['apify','Apify','https://docs.apify.com/'],
 ['browser-use','Browser Use','https://docs.browser-use.com/'],
 ['stagehand','Stagehand','https://docs.stagehand.dev/'],
 ['crawl4ai','Crawl4AI','https://docs.crawl4ai.com/'],
 ['crawlee','Crawlee','https://crawlee.dev/'],
 ['bright-data','Bright Data','https://docs.brightdata.com/'],
 ['oxylabs','Oxylabs','https://developers.oxylabs.io/'],
 ['dataforseo','DataForSEO','https://docs.dataforseo.com/']
].map(([id,name,docsUrl])=>({id,name,docsUrl,categories:['hotels','flights'],requiresKey:null,implemented:false,configured:false,status:'planned'}));
const reject=message=>{const error=new Error(message);error.status=422;throw error;};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clean=(value,max=300)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const strings=(value,limit=20)=>Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,limit).map(x=>clean(x,400)).filter(Boolean):[];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
function day(value,label){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))reject('Informe '+label+' no formato AAAA-MM-DD.');const stamp=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==value)reject('A data de '+label+' é inválida.');return stamp;}
function todayAt(now){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');}
function integer(value,fallback,min,max,label){const actual=value===undefined?fallback:value;if(!Number.isInteger(actual)||actual<min||actual>max)reject(label+' deve estar entre '+min+' e '+max+'.');return actual;}
export function validateTravelSearch(input,{now=Date.now()}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))reject('Informe os dados da viagem.');
 const category=input.category;if(![...travelCategories,'trip'].includes(category))reject('Escolha uma categoria de viagem.');
 const destination=clean(input.destination,150),origin=clean(input.origin,150);if(destination.length<2)reject('Informe o destino.');
 if(category==='flights'&&(!/^[A-Za-z]{3}$/.test(origin)||!/^[A-Za-z]{3}$/.test(destination)))reject('Use códigos de aeroportos com três letras para origem e destino dos voos.');
 if(category==='flights'&&origin.toUpperCase()===destination.toUpperCase())reject('Origem e destino precisam ser diferentes.');
 const start=day(input.start,'ida ou entrada'),end=input.end?day(input.end,'volta ou saída'):null,today=day(todayAt(now),'hoje');
 if(start<today)reject('A data de início não pode estar no passado.');if(start>today+730*DAY)reject('Pesquise viagens nos próximos dois anos.');
 if(['hotels','trip','cars'].includes(category)&&(end===null||end<=start))reject('O fim do período deve ser posterior ao início.');
 if(end!==null&&(end<start||end-start>90*DAY||end>today+730*DAY))reject('Informe um período de até 90 dias, com volta após a ida.');
 const adults=integer(input.adults,2,1,9,'O número de adultos'),rooms=integer(input.rooms,1,1,4,'O número de quartos');
 const childrenAges=input.childrenAges===undefined?[]:input.childrenAges;if(!Array.isArray(childrenAges)||childrenAges.length>8||childrenAges.some(age=>!Number.isInteger(age)||age<0||age>17)||adults+childrenAges.length>9)reject('Informe até nove viajantes e idades das crianças entre 0 e 17 anos.');
 if(['hotels','trip'].includes(category)&&rooms>adults)reject('Informe pelo menos um adulto por quarto.');
 const currency=input.currency??'BRL';if(currency!=='BRL')reject('Esta versão consulta preços em BRL.');
 const providers=input.providers??[];if(!Array.isArray(providers)||providers.length>24||providers.some(id=>typeof id!=='string'||!/^[a-z0-9-]{2,50}$/.test(id)))reject('A seleção de fontes é inválida.');
 const sort=input.sort??'price';if(!['price','quality'].includes(sort))reject('Escolha a ordenação por preço ou qualidade.');
 if(input.refresh!==undefined&&typeof input.refresh!=='boolean')reject('A opção de atualizar a consulta deve ser verdadeira ou falsa.');
 const mode=input.mode??'quote';if(!['quote','opportunities'].includes(mode))reject('Escolha a busca por datas ou por oportunidades.');
 const originAirport=clean(input.originAirport,3).toUpperCase(),destinationAirport=clean(input.destinationAirport,3).toUpperCase();
 for(const value of [input.originAirport,input.destinationAirport])if(value!==undefined&&value!==''&&(typeof value!=='string'||!/^[a-z]{3}$/i.test(value)))reject('Use códigos IATA com três letras nos aeroportos da viagem.');
 if(originAirport&&originAirport===destinationAirport)reject('Os aeroportos de origem e destino precisam ser diferentes.');
 const hotelId=input.hotelId===undefined?'':String(input.hotelId);if(hotelId&&(!/^\d{1,8}$/.test(hotelId)||category!=='hotels'))reject('Selecione um hotel válido para consultar os quartos.');
 return {category,origin:category==='flights'?origin.toUpperCase():origin,destination:category==='flights'?destination.toUpperCase():destination,start:input.start,end:input.end||'',adults,childrenAges:[...childrenAges],rooms,currency,providers:[...new Set(providers)],flexDays:integer(input.flexDays,0,0,2,'A flexibilidade de datas'),maxCalls:integer(input.maxCalls,6,1,12,'O limite de consultas'),sort,mode,refresh:input.refresh===true,...(originAirport?{originAirport}:{}),...(destinationAirport?{destinationAirport}:{}),...(hotelId?{hotelId}:{})};
}
function snapshot(request){const {category,origin,destination,start,end,adults,childrenAges,rooms,currency}=request;return {category,origin,destination,start,end,adults,childrenAges:[...childrenAges],rooms,currency,...(request.mode==='opportunities'?{mode:'opportunities'}:{}),...(request.originAirport?{originAirport:request.originAirport}:{}),...(request.destinationAirport?{destinationAirport:request.destinationAirport}:{}),...(request.hotelId?{hotelId:request.hotelId}:{})};}
function variants(request,now){const shifts=[0];for(let d=1;d<=request.flexDays;d++)shifts.push(-d,d);const today=todayAt(now);return shifts.map(shift=>({...snapshot(request),start:new Date(Date.parse(request.start+'T00:00:00Z')+shift*DAY).toISOString().slice(0,10),end:request.end?new Date(Date.parse(request.end+'T00:00:00Z')+shift*DAY).toISOString().slice(0,10):''})).filter(r=>r.start>=today);}
function safeUrl(value){try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.hostname==='localhost'||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)||url.hostname.startsWith('['))return '';return url.href;}catch{return '';}}
function object(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};try{const text=JSON.stringify(value);return text.length<=20000?JSON.parse(text):{};}catch{return {};}}
function normalizeOffer(raw,adapter,request,now){
 if(!raw||typeof raw!=='object')return null;
 const title=clean(raw.title),amount=raw.price?.amount,currency=raw.price?.currency;
 if(!title||typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1e9||typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))return null;
 const sourceUrl=safeUrl(raw.sourceUrl),conditions=object(raw.conditions),details=object(raw.details);
 const captured=Date.parse(raw.capturedAt),capturedMs=Number.isFinite(captured)&&captured<=now+60000?captured:now;
 const expiry=Date.parse(raw.expiresAt),expiresMs=Number.isFinite(expiry)?Math.min(expiry,capturedMs+travelSearchLimits.cacheTtlMs):capturedMs+travelSearchLimits.cacheTtlMs;
 const basis=['stay','round_trip','one_way','from','unknown'].includes(raw.price?.basis)?raw.price.basis:'unknown';
 const taxesIncluded=typeof raw.price?.taxesIncluded==='boolean'?raw.price.taxesIncluded:null;
 let completeness=['complete','selection_required','unknown'].includes(raw.completeness)?raw.completeness:'unknown';
 const warnings=strings(raw.warnings);if(!sourceUrl)warnings.push('O endereço direto da oferta não foi informado.');
 if(basis==='unknown'||basis==='from'||!sourceUrl||expiresMs<=now)completeness='unknown';
 if(expiresMs<=now)warnings.push('Preço anterior ao período de validade; consulte novamente antes de usar.');
 if(taxesIncluded!==true)warnings.push('A inclusão de todos os impostos e taxas não foi confirmada.');
 if(currency!==request.currency)warnings.push('O fornecedor retornou outra moeda; não houve conversão automática.');
 const category=travelCategories.includes(raw.category)&&adapter.categories.includes(raw.category)?raw.category:request.category;
 if(!travelCategories.includes(category)||request.category!=='trip'&&category!==request.category)return null;
 if(details.priceKind==='published')completeness='unknown';
 const requestSnapshot=snapshot({...request,category});
 // Keep uncertain offers separate. A common comparison group requires known terms;
 // matching names is never evidence that two hotels, rooms or fares are identical.
 const knownTerms=category==='hotels'?typeof conditions.freeCancellation==='boolean'&&typeof conditions.mealPlan==='string'&&conditions.mealPlan.length>0:category==='flights'&&typeof conditions.baggage==='string'&&conditions.baggage.length>0&&conditions.passengerPriceScope==='all_travelers';
 const comparable=completeness==='complete'&&taxesIncluded===true&&currency===request.currency&&knownTerms;
 const comparisonKey=comparable?hash([requestSnapshot,currency,basis,conditions]):null;
 const priceGroup=details.priceKind!=='published'&&['stay','round_trip','one_way'].includes(basis)?hash([requestSnapshot,currency,basis,taxesIncluded,conditions.passengerPriceScope||null]):null;
 // A price-changing observation keeps its identity only when the owned parser provides
 // a precise product/rate key. Provider IDs and titles alone may hide price hashes,
 // multiple rooms, options or flight times, so legacy adapters deliberately return null.
 const identityKind=['dated_quote','published_product'].includes(raw.identityKind)?raw.identityKind:null;
 const {mode:ignoredMode,hotelId:ignoredHotel,originAirport:ignoredOriginAirport,destinationAirport:ignoredDestinationAirport,...identityRequest}=requestSnapshot;
 const identityKey=identityKind&&typeof raw.identityKey==='string'&&raw.identityKey.length>0&&raw.identityKey.length<=1000&&sourceUrl?hash(canonical(['travel-offer-identity-v1',adapter.id,raw.identityKey,identityKind,identityRequest,currency,basis,taxesIncluded,conditions])):null;
 const id=hash([adapter.id,raw.id||sourceUrl||title,requestSnapshot,amount,currency,basis,conditions]).slice(0,32);
 return {id,identityKey,identityKind:identityKey?identityKind:null,provider:adapter.id,source:clean(raw.source||adapter.name,100),category,title,sourceUrl,capturedAt:new Date(capturedMs).toISOString(),expiresAt:new Date(expiresMs).toISOString(),price:{amount,currency,basis,taxesIncluded},conditions,details,warnings:[...new Set(warnings)],bookable:false,completeness,requestSnapshot,cached:false,comparison:{eligible:comparable,key:comparisonKey,priceGroup}};
}
function publicProvider(item){const implemented=item.implemented!==false,configured=implemented&&item.configured===true;return {id:item.id,name:item.name,categories:item.categories||[],requiresKey:item.requiresKey||null,kind:item.kind==='native'?'native':'api',implemented,configured,status:!implemented?'planned':configured?'ready':'unconfigured',docsUrl:safeUrl(item.docsUrl),destinations:strings(item.destinations,100),dateIndependent:item.dateIndependent===true,coverage:object(item.coverage),capabilities:object(item.capabilities)};}
function errorMessage(error){if(error?.name==='AbortError'||error?.name==='TimeoutError'||error?.code==='TIMEOUT')return {status:'timeout',message:'A fonte não respondeu dentro do prazo. As outras respostas foram preservadas.'};if(['ROBOTS_DISALLOWED','SOURCE_BLOCKED'].includes(error?.code))return {status:'blocked',message:'A fonte restringiu o acesso automatizado. A coleta foi interrompida.'};if(error?.code==='SOURCE_RATE_LIMIT')return {status:'rate_limited',message:'O intervalo de acesso da fonte exige aguardar antes da próxima coleta.'};return {status:'error',message:'Não foi possível consultar esta fonte. Tente novamente mais tarde.'};}

export function createTravelSearchEngine({env={},adapters,nativeAdapters,now=()=>Date.now(),timeoutMs=travelSearchLimits.timeoutMs}={}){
 const cache=new Map();const timeout=Math.min(travelSearchLimits.timeoutMs,Math.max(1,Number(timeoutMs)||travelSearchLimits.timeoutMs));
 const native=nativeAdapters??(adapters===undefined?createNativeTravelAdapters():[]);
 function configuration(){const credentials={gecko:env.GECKO_API_KEY||'',searchapi:env.SEARCHAPI_API_KEY||'',serpapi:env.SERPAPI_API_KEY||''};const current=adapters??[...native.map(item=>({...item,configured:env.TRAVELPRO_NATIVE_SEARCH!=='false'&&item.configured!==false})),...createTravelAdapters({credentials})];const list=Array.isArray(current)?current:Object.values(current);const catalog=new Map(providerCatalog.map(x=>[x.id,x]));for(const item of list)catalog.set(item.id,{...catalog.get(item.id),...item});for(const item of plannedSources)if(!catalog.has(item.id))catalog.set(item.id,item);return {list,catalog,fingerprint:hash([credentials,env.TRAVELPRO_NATIVE_SEARCH])};}
 function providers(){return [...configuration().catalog.values()].map(publicProvider);}
 function adapterRequest(request,adapter){
  if(request.category!=='trip')return request;
  const category=adapter.categories.length===1?adapter.categories[0]:(adapter.kind==='native'?'trip':adapter.categories[0]);
  return {...request,category,...(category==='flights'?{origin:request.originAirport,destination:request.destinationAirport}:{})};
 }
 function prune(timestamp){for(const [key,entry] of cache)if(entry.until<=timestamp)cache.delete(key);while(cache.size>travelSearchLimits.maxCacheEntries)cache.delete(cache.keys().next().value);}
 async function search(input,{tenantId}={}){
  if(typeof tenantId!=='string'||!tenantId.trim())reject('A agência precisa estar identificada para pesquisar.');
  const started=now(),request=validateTravelSearch(input,{now:started}),{list,catalog,fingerprint}=configuration();
  for(const provider of request.providers)if(!catalog.has(provider))reject('Fonte de pesquisa não reconhecida: '+provider+'.');
  prune(started);const available=new Map(list.map(x=>[x.id,x]));
  const supports=meta=>request.category==='trip'?meta.categories?.some(c=>travelCategories.includes(c)):meta.categories?.includes(request.category);
  const selected=request.providers.length?request.providers:[...catalog.values()].filter(x=>x.implemented!==false&&supports(x)).sort((a,b)=>(a.kind==='native'?0:1)-(b.kind==='native'?0:1)).map(x=>x.id);
  const reports=new Map(),active=[];
  for(const providerId of selected){const meta=catalog.get(providerId),adapter=available.get(providerId);const report={id:providerId,name:meta.name,status:'pending',message:'',offerCount:0,cached:false,calls:0,cacheHits:0};reports.set(providerId,report);
   if(meta.implemented===false){report.status='planned';report.message='Fonte catalogada; integração ainda não implementada.';}
   else if(!supports(meta)){report.status='unsupported';report.message='Esta fonte não atende à categoria selecionada.';}
   else if(request.category==='trip'&&meta.categories?.includes('flights')&&(!request.originAirport||!request.destinationAirport)){report.status='unsupported';report.message='Informe os aeroportos da viagem para incluir voos.';}
   else if(!adapter?.configured||typeof adapter.search!=='function'){report.status='unconfigured';report.message='Fonte aguardando credencial no servidor.';}
   else{
    const support=typeof adapter.supports==='function'?adapter.supports(adapterRequest(request,adapter)):null;
    if(support?.supported===false){report.status='unsupported';report.supportCode=clean(support.code,80)||'unsupported_request';report.message=clean(support.reason,500)||'Esta fonte não atende aos dados deste pedido.';}
    else active.push(adapter);
   }
  }
  const queue=[];for(const initialVariant of variants(request,started))for(const adapter of active){let variant=initialVariant;
   variant=adapterRequest(initialVariant,adapter);
   // Published catalogs do not change when dates flex; avoid downloading them repeatedly.
   if(adapter.kind==='native'&&adapter.dateIndependent===true&&request.mode==='opportunities'&&initialVariant.start!==request.start)continue;
   queue.push({adapter,variant});
  }
  let cursor=0,reserved=0,callsUsed=0,cacheHits=0,networkRequests=0,limited=false;const offers=[],warnings=[],deferred=[],controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new DOMException('Prazo de pesquisa excedido.','TimeoutError')),timeout);
  const aborted=new Promise((_,rejectAbort)=>controller.signal.addEventListener('abort',()=>rejectAbort(controller.signal.reason),{once:true}));
  async function worker(){while(cursor<queue.length){const {adapter,variant}=queue[cursor++],report=reports.get(adapter.id),key=hash([tenantId,fingerprint,adapter.id,variant]);let result,cached=false;
    const entry=request.refresh?null:cache.get(key);if(entry&&entry.until>now()){result=structuredClone(entry.result);cached=true;cacheHits++;report.cacheHits++;}
    else if(controller.signal.aborted){report.timedOut=true;continue;}
    else if(reserved>=request.maxCalls){deferred.push({adapter,variant});continue;}
    else{if(request.refresh)cache.delete(key);reserved++;callsUsed++;report.calls++;try{result=await Promise.race([Promise.resolve().then(()=>adapter.search(variant,{signal:controller.signal})),aborted]);if(!result||!Array.isArray(result.offers))throw new Error('Invalid source response');
      if(result.requestsUsed===0){reserved--;callsUsed--;report.calls--;}
      networkRequests+=Number.isInteger(result.networkRequests)&&result.networkRequests>=0?Math.min(result.networkRequests,100):result.requestsUsed===0?0:1;
      const normalized=result.offers.slice(0,travelSearchLimits.maxOffersPerCall).map(o=>normalizeOffer(o,adapter,variant,now())).filter(Boolean);
      const discarded=result.offers.length-normalized.length;result={offers:normalized,warnings:strings(result.warnings),requestsUsed:result.requestsUsed,partial:result.partial===true};if(discarded)result.warnings.push('Alguns resultados sem preço válido ou além do limite não foram incluídos.');
      const until=Math.min(now()+travelSearchLimits.cacheTtlMs,...normalized.map(o=>Date.parse(o.expiresAt)));if(until>now()&&result.requestsUsed!==0&&!result.partial){cache.set(key,{until,result:structuredClone(result)});prune(now());}
     }catch(error){networkRequests+=Number.isInteger(error?.networkRequests)&&error.networkRequests>=0?Math.min(error.networkRequests,100):0;const failure=errorMessage(error);report.failures=(report.failures||0)+1;report.failure=failure;continue;}}
    report.completed=(report.completed||0)+1;report.offerCount+=result.offers.length;if(result.partial)report.partial=true;
    for(const offer of result.offers)offers.push({...offer,cached});
    for(const warning of strings(result.warnings))warnings.push(adapter.name+': '+warning);
   }}
  const runWorkers=()=>Promise.all(Array.from({length:Math.min(travelSearchLimits.maxConcurrent,queue.length-cursor)},()=>worker()));
  try{await runWorkers();while(deferred.length&&reserved<request.maxCalls&&!controller.signal.aborted){queue.push(...deferred.splice(0));await runWorkers();}}finally{clearTimeout(timer);}
  for(const {adapter} of deferred){const report=reports.get(adapter.id);if(controller.signal.aborted)report.timedOut=true;else{limited=true;report.limited=true;}}
  for(const report of reports.values())if(report.status==='pending'){
   report.cached=report.cacheHits>0&&report.calls===0;
   if(report.completed){report.status=report.failures||report.timedOut||report.limited||report.partial?'partial':report.offerCount?'success':'empty';report.message=report.status==='partial'?'Resultado parcial; algumas consultas não foram concluídas.':report.offerCount?(report.cached?'Resultados recentes reutilizados; veja o horário da coleta.':'Consulta concluída; preços sujeitos à revalidação.'):'A fonte não retornou ofertas para este pedido.';}
   else if(report.failure){report.status=report.failure.status;report.message=report.failure.message;}
   else if(report.timedOut){report.status='timeout';report.message='O prazo total da pesquisa foi atingido.';}
   else{report.status='budget_limited';report.message='Fonte não consultada: limite de consultas atingido.';}
   delete report.completed;delete report.failures;delete report.failure;delete report.timedOut;delete report.limited;delete report.partial;
  }
  const unique=[...new Map(offers.map(o=>[o.id,o])).values()];
  // Multiple distinct observations under the same candidate identity are ambiguous.
  // Refuse an automatic replacement instead of arbitrarily choosing one price.
  const identityCounts=new Map();for(const offer of unique)if(offer.identityKey)identityCounts.set(offer.identityKey,(identityCounts.get(offer.identityKey)||0)+1);
  for(const offer of unique)if(offer.identityKey&&identityCounts.get(offer.identityKey)>1){offer.identityKey=null;offer.identityKind=null;}
  unique.sort((a,b)=>{
   if(request.sort==='quality'){const qa=Number(a.details.rating),qb=Number(b.details.rating),scaleA=Number(a.details.ratingScale),scaleB=Number(b.details.ratingScale);if(Number.isFinite(qa)&&Number.isFinite(qb)&&scaleA>0&&scaleA===scaleB&&qa!==qb)return qb-qa;}
   if(Boolean(a.comparison.priceGroup)!==Boolean(b.comparison.priceGroup))return a.comparison.priceGroup?-1:1;
   if(a.comparison.priceGroup&&a.comparison.priceGroup===b.comparison.priceGroup)return a.price.amount-b.price.amount;
   if(a.comparison.priceGroup&&b.comparison.priceGroup)return a.comparison.priceGroup.localeCompare(b.comparison.priceGroup);
   return a.requestSnapshot.start.localeCompare(b.requestSnapshot.start)||a.provider.localeCompare(b.provider)||a.title.localeCompare(b.title);
  });
  if(!active.length)warnings.push('Nenhuma fonte selecionada está pronta para consultar. Não foram gerados preços de demonstração.');
  if(limited)warnings.push('O limite de consultas foi respeitado. Nem todas as fontes ou datas alternativas foram pesquisadas.');
  if(cacheHits)warnings.push('Há resultados de cache de até cinco minutos. O horário original da coleta foi mantido.');
  if(unique.some(o=>o.comparison.priceGroup&&!o.comparison.eligible))warnings.push('A ordenação compara preços informados para as mesmas datas, viajantes, moeda e base de cobrança. Quartos, tarifas e condições ainda podem ser diferentes.');
  warnings.push('A pesquisa não reserva nem emite serviços. Preço e disponibilidade precisam ser confirmados no canal de origem.');
  const providerReports=[...reports.values()];return {searchId:randomUUID(),request,offers:unique,providers:providerReports,summary:{refresh:request.refresh,callsUsed,networkRequests,cacheHits,providersSucceeded:providerReports.filter(x=>['success','empty','partial'].includes(x.status)).length,providersFailed:providerReports.filter(x=>['error','timeout'].includes(x.status)).length,totalOffers:unique.length,limited,capturedAt:new Date(started).toISOString()},warnings:[...new Set(warnings)]};
 }
 return {providers,search};
}
