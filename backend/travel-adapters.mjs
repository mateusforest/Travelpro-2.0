import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

// Only documented search endpoints. No issuance, payment, retries or arbitrary URLs.
export const providerCatalog = Object.freeze([
  ['gecko-booking','Booking · GeckoAPI','hotels','gecko','https://geckoapi.com.br/docs/booking-com-br-plp/'],
  ['gecko-hoteis','Hoteis.com · GeckoAPI','hotels','gecko','https://geckoapi.com.br/docs/hoteis-com-plp/'],
  ['gecko-latam','LATAM · GeckoAPI','flights','gecko','https://geckoapi.com.br/docs/latamairlines-com-plp/'],
  ['gecko-gol','GOL · GeckoAPI','flights','gecko','https://geckoapi.com.br/docs/voegol-com-br-plp/'],
  ['gecko-azul','Azul · GeckoAPI','flights','gecko','https://geckoapi.com.br/docs/voeazul-com-br-plp/'],
  ['searchapi-hotels','Google Hotels · SearchApi','hotels','searchapi','https://www.searchapi.io/docs/google-hotels-api'],
  ['searchapi-flights','Google Flights · SearchApi','flights','searchapi','https://www.searchapi.io/docs/google-flights-api'],
  ['serpapi-hotels','Google Hotels · SerpApi','hotels','serpapi','https://serpapi.com/google-hotels-api'],
  ['serpapi-flights','Google Flights · SerpApi','flights','serpapi','https://serpapi.com/google-flights-api'],
].map(([id,name,category,requiresKey,docsUrl])=>Object.freeze({id,name,categories:Object.freeze([category]),requiresKey,implemented:true,docsUrl})));

const MAX_BYTES=2*1024*1024;
const MAX_RESULTS=100;
const list=value=>Array.isArray(value)?value:[];
const records=value=>list(value).filter(item=>item&&typeof item==='object'&&!Array.isArray(item));
const text=(value,max=400)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max):'';
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const positive=value=>numeric(value)!==null&&value>0?value:null;
const tri=value=>typeof value==='boolean'?value:null;
const currency=value=>typeof value==='string'&&/^[A-Z]{3}$/.test(value)?value:null;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const numberOrId=value=>typeof value==='number'&&Number.isFinite(value)?String(value):text(value,180);
function safeUrl(value){
  if(typeof value!=='string'||value.length>4096)return null;
  try{
    const u=new URL(value),host=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||u.username||u.password||isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost'))return null;
    // API self-links may contain account credentials; only public origin links leave this adapter.
    if(/(^|\.)(serpapi\.com|searchapi\.io|searchapi\.org|geckoapi\.com\.br)$/.test(host))return null;
    for(const name of [...u.searchParams.keys()])if(/^(api_?key|access_token|authorization|auth|secret|password)$/i.test(name))u.searchParams.delete(name);
    return u.href;
  }catch{return null;}
}
function failure(code,message){const error=new Error(message);error.code=code;return error;}
async function readJson(response){
  const size=Number(response.headers?.get?.('content-length'));
  if(size>MAX_BYTES){await response.body?.cancel?.();throw failure('RESPONSE_TOO_LARGE','A resposta do fornecedor excedeu o limite de leitura.');}
  if(!response.body?.getReader)throw failure('INVALID_RESPONSE','O fornecedor retornou uma resposta sem corpo legível.');
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>MAX_BYTES){await reader.cancel();throw failure('RESPONSE_TOO_LARGE','A resposta do fornecedor excedeu o limite de leitura.');}
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw failure('INVALID_RESPONSE','O fornecedor retornou um JSON inválido.');}
}
function unsupported(entry,request){
  if(!entry.categories.includes(request.category))return 'Categoria não atendida por este conector.';
  const ages=list(request.childrenAges);
  if(entry.requiresKey==='gecko'&&ages.length)return 'Este conector não documenta a cotação por idade das crianças; esta ocupação não foi consultada.';
  if(request.category==='flights'&&ages.length)return 'A conversão das idades em categorias tarifárias e o assento dos bebês precisam ser definidos; esta composição não foi consultada.';
  if(request.category==='flights'&&(!/^[A-Z]{3}$/.test(request.origin)||!/^[A-Z]{3}$/.test(request.destination)))return 'Informe os códigos IATA de três letras para origem e destino dos voos.';
  if(request.category==='hotels'&&request.rooms>1&&entry.requiresKey!=='gecko')return 'A API documentada não define a distribuição entre vários quartos; esta ocupação não foi consultada.';
  if(request.category==='hotels'&&entry.requiresKey!=='gecko'&&request.adults+ages.length>6)return 'O conector de hotéis aceita até seis hóspedes nesta modalidade.';
  if(entry.id==='searchapi-hotels'&&ages.some(age=>age<1))return 'A SearchApi documenta idades de 1 a 17 anos; a ocupação com bebê menor de um ano não foi consultada.';
  return null;
}
function buildCall(entry,request,key){
  const hotels=request.category==='hotels',headers={Accept:'application/json'};
  if(entry.requiresKey==='gecko'){
    const targets={'gecko-booking':'booking.com.br','gecko-hoteis':'hoteis.com','gecko-latam':'latamairlines.com','gecko-gol':'voegol.com.br','gecko-azul':'voeazul.com.br'};
    const body={target:targets[entry.id],type:'plp',numAdults:request.adults,numChildren:0};
    if(hotels){
      Object.assign(body,{checkinDate:request.start,checkoutDate:request.end,numRooms:request.rooms||1,page:1});
      body[entry.id==='gecko-booking'?'keyword':'location']=request.destination;
      if(entry.id==='gecko-booking')Object.assign(body,{currency:request.currency,lang:'pt-br'});
    }else{
      Object.assign(body,{from:request.origin,to:request.destination,departureDate:request.start,numInfants:0});
      if(request.end)body.returnDate=request.end;
      if(entry.id==='gecko-azul')Object.assign(body,{currency:request.currency,points:false});
    }
    return {url:'https://api.geckoapi.com.br/v1/extract',options:{method:'POST',headers:{...headers,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)}};
  }
  const serp=entry.requiresKey==='serpapi',url=new URL(serp?'https://serpapi.com/search.json':'https://www.searchapi.io/api/v1/search');
  const params={engine:hotels?'google_hotels':'google_flights',currency:request.currency,hl:'pt',gl:'br',adults:request.adults};
  if(hotels){
    Object.assign(params,{q:request.destination,check_in_date:request.start,check_out_date:request.end});
    if(!serp)params.property_type='hotel';
    if(serp)params.children=list(request.childrenAges).length;
    if(list(request.childrenAges).length)params.children_ages=request.childrenAges.map(age=>serp?Math.max(1,age):age).join(',');
  }else{
    Object.assign(params,{departure_id:request.origin,arrival_id:request.destination,outbound_date:request.start,children:0,infants_in_seat:0,infants_on_lap:0});
    if(request.end)params.return_date=request.end;
    if(serp){params.type=request.end?1:2;params.deep_search=true;}
    else params.flight_type=request.end?'round_trip':'one_way';
  }
  if(serp){params.api_key=key;params.no_cache=true;}else headers.Authorization=`Bearer ${key}`;
  for(const [name,value]of Object.entries(params))url.searchParams.set(name,String(value));
  return {url:url.href,options:{method:'GET',headers}};
}
function baseOffer(entry,request,payload,receivedAt,{key,title,url,amount,money,basis='unknown',conditions={},details={},warnings=[],completeness='unknown'}){
  if(positive(amount)===null||!currency(money))return null;
  const sourceTime=timestamp(payload.data?.extractedAt)||timestamp(payload.search_metadata?.created_at);
  const sourceUrl=safeUrl(url),messages=[...warnings];
  if(!sourceTime)messages.push('Horário original da coleta não informado; foi registrado o horário de recebimento.');
  if(!sourceUrl)messages.push('O fornecedor não retornou um link público válido para esta oferta.');
  return {
    id:`${entry.id}-${createHash('sha256').update(JSON.stringify([key,request.start,request.end,request.adults,request.childrenAges,request.rooms,money,amount])).digest('hex').slice(0,20)}`,
    provider:entry.id,source:entry.name.split(' · ')[0],category:request.category,title:text(title)||'Oferta sem título informado',sourceUrl,
    capturedAt:sourceTime||receivedAt,expiresAt:null,
    price:{amount,currency:money,basis,taxesIncluded:tri(conditions.taxesIncluded)},
    conditions,details:{...details,sourceTimestampAvailable:!!sourceTime,receivedAt,requestId:text(payload.requestId||payload.search_metadata?.id,180)},
    warnings:messages.slice(0,12),bookable:false,completeness,
  };
}
function googleHotelOffers(entry,request,payload,receivedAt){
  const serp=entry.requiresKey==='serpapi';
  return records(payload.properties).slice(0,MAX_RESULTS).map(item=>{
    const total=serp?item.total_rate?.extracted_lowest:item.total_price?.extracted_price;
    const nightly=serp?item.rate_per_night?.extracted_lowest:item.price_per_night?.extracted_price;
    const explicitTotal=positive(total)!==null;
    return baseOffer(entry,request,payload,receivedAt,{
      key:item.property_token||item.data_id||item.name,title:item.name,url:item.link,
      amount:explicitTotal?total:nightly,money:payload.search_parameters?.currency||request.currency,basis:explicitTotal?'stay':'unknown',
      completeness:explicitTotal?'complete':'unknown',
      conditions:{taxesIncluded:null,cancellation:null,mealPlan:null,occupancy:{adults:request.adults,childrenAges:request.childrenAges,rooms:1},occupancyScope:'requested'},
      details:{propertyId:text(item.property_token||item.data_id,500),rating:numeric(serp?item.overall_rating:item.rating),ratingScale:5,reviewCount:numeric(item.reviews),stars:numeric(item.extracted_hotel_class),nightlyAmount:positive(nightly),image:safeUrl(item.images?.[0]?.thumbnail),amenities:list(item.amenities).slice(0,20).map(x=>text(x,140))},
      warnings:[...(explicitTotal?[]:['O retorno contém somente uma diária; o total da estadia não foi calculado.']),'Quarto, alimentação, cancelamento e impostos precisam ser confirmados na oferta do vendedor.',...(request.childrenAges?.includes(0)&&serp?['O provedor representa menores de um ano como idade 1 na consulta.']:[])],
    });
  }).filter(Boolean);
}
function geckoHotelOffers(entry,request,payload,receivedAt){
  const booking=entry.id==='gecko-booking';
  return records(payload.data?.items).slice(0,MAX_RESULTS).filter(item=>item.soldOut!==true).map(item=>baseOffer(entry,request,payload,receivedAt,{
    key:item.propertyId||item.id||item.url,title:item.name,url:item.url,
    amount:booking?item.price:item.leadPrice?.amount,money:booking?(item.currency||payload.data.currency):item.leadPrice?.currency,
    conditions:{taxesIncluded:null,cancellation:null,freeCancellation:tri(item.freeCancellation),mealPlan:text(item.mealPlan,200)||null,taxesText:text(item.taxesAndFees,300)||null,occupancy:{adults:request.adults,childrenAges:[],rooms:request.rooms},occupancyScope:'requested'},
    details:{propertyId:numberOrId(item.propertyId||item.id),rating:numeric(booking?item.aggregateRating?.rating:item.reviewScore),ratingScale:10,reviewCount:numeric(booking?item.aggregateRating?.reviewCount:item.reviewCount),stars:numeric(item.starRating),nightlyAmount:positive(item.averagePricePerNight),image:safeUrl(item.thumbnail||item.image),city:text(item.city,150),sponsored:tri(item.sponsored)},
    warnings:['O conector informa um preço de vitrine sem confirmar sua base total; confirme período, ocupação, quarto e impostos antes de orçar.'],
  })).filter(Boolean);
}
function googleFlightOffers(entry,request,payload,receivedAt){
  const rows=[...records(payload.best_flights),...records(payload.other_flights)].slice(0,MAX_RESULTS);
  return rows.map(item=>{
    const segments=records(item.flights).slice(0,12).map(segment=>({
      origin:text(segment.departure_airport?.id,12),destination:text(segment.arrival_airport?.id,12),
      departure:text([segment.departure_airport?.date,segment.departure_airport?.time].filter(Boolean).join(' '),80),
      arrival:text([segment.arrival_airport?.date,segment.arrival_airport?.time].filter(Boolean).join(' '),80),
      airline:text(segment.airline,100),flightNumber:text(segment.flight_number,30),cabin:text(segment.travel_class,60),durationMinutes:numeric(segment.duration),
    }));
    return baseOffer(entry,request,payload,receivedAt,{
      key:[segments,item.departure_token,item.booking_token],title:`${request.origin} → ${request.destination} · ${[...new Set(segments.map(x=>x.airline).filter(Boolean))].join(', ')}`,
      url:payload.search_metadata?.google_flights_url||payload.search_metadata?.request_url,
      amount:item.price,money:payload.search_parameters?.currency||request.currency,
      basis:request.end?'from':'one_way',completeness:request.end?'selection_required':'unknown',
      conditions:{taxesIncluded:null,cancellation:null,baggage:null,passengerPriceScope:'unverified'},
      details:{segments,durationMinutes:numeric(item.total_duration),stops:Math.max(0,segments.length-1),departureToken:text(item.departure_token,6000)||null,bookingToken:text(item.booking_token,6000)||null,extensions:list(item.extensions).slice(0,15).map(x=>text(x,200)),tripType:request.end?'round_trip':'one_way'},
      warnings:[...(request.end?['É necessário selecionar a ida e consultar a volta para definir o itinerário completo; este valor não deve ser somado a outro preço de volta.']:[]),'Total para todos os passageiros, bagagem e condições ainda precisam ser confirmados.'],
    });
  }).filter(Boolean);
}
function geckoFlightOffers(entry,request,payload,receivedAt){
  const data=payload.data||{},rows=[];
  if(entry.id==='gecko-latam'){
    for(const item of records(data.items).slice(0,MAX_RESULTS))rows.push({key:[item.flight?.flightCode,item.fare?.brandId,item.route?.departure],amount:item.price?.total??item.price?.amount,money:item.price?.currency,brand:item.fare?.brandText,cabin:item.fare?.cabinLabel,origin:item.route?.originIata,destination:item.route?.destinationIata,departure:item.route?.departure,arrival:item.route?.arrival,stops:item.flight?.stops,durationMinutes:item.flight?.durationMinutes,flightNumber:item.flight?.flightCode});
  }else{
    const journeys=entry.id==='gecko-gol'?records(data.itineraries):records(data.trips).slice(0,10).flatMap(trip=>records(trip.journeys).slice(0,MAX_RESULTS));
    for(const trip of journeys.slice(0,MAX_RESULTS)){
      if(trip.available===false)continue;
      const fares=records(entry.id==='gecko-gol'?trip.offers:trip.fares);
      for(const fare of fares.slice(0,10))rows.push({key:[trip.id||trip.journeyKey,fare.key||fare.brandId||fare.productClass?.code],amount:fare.total?.amount,money:fare.total?.currency,brand:fare.brandLabel||fare.productClass?.name,cabin:fare.cabinClass||fare.cabin,origin:trip.origin,destination:trip.destination,departure:trip.departure,arrival:trip.arrival,stops:trip.stopsCount,duration:trip.duration,segments:list(trip.segments).slice(0,12).map(segment=>({origin:text(segment.origin,12),destination:text(segment.destination,12),departure:text(segment.departure,80),arrival:text(segment.arrival,80),flightNumber:text(segment.flight?.flightNumber,30),airline:text(segment.flight?.airlineCode||segment.flight?.carrierCode,20)}))});
    }
  }
  return rows.slice(0,MAX_RESULTS).map(row=>baseOffer(entry,request,payload,receivedAt,{
    key:row.key,title:`${text(row.origin,12)||request.origin} → ${text(row.destination,12)||request.destination} · ${entry.name.split(' · ')[0]}`,
    url:data.url||data.requestUrl,amount:row.amount,money:row.money,
    conditions:{taxesIncluded:null,cancellation:null,baggage:null,passengerPriceScope:'unverified',fareBrand:text(row.brand,120),cabin:text(row.cabin,80)},
    details:{origin:text(row.origin,12),destination:text(row.destination,12),departure:text(row.departure,80),arrival:text(row.arrival,80),stops:numeric(row.stops),durationMinutes:numeric(row.durationMinutes),duration:text(row.duration,100),flightNumber:text(row.flightNumber,30),segments:row.segments||[],tripType:text(data.searchType,40)},
    warnings:['O preço de origem não confirma o total de todos os passageiros e trechos; a base da tarifa permanece pendente de validação.'],
  })).filter(Boolean);
}

export function createTravelAdapters({credentials={},fetcher=globalThis.fetch}={}){
  return providerCatalog.map(entry=>{
    const key=typeof credentials[entry.requiresKey]==='string'?credentials[entry.requiresKey].trim():'';
    return {...entry,configured:!!key,async search(request,{signal}={}){
      if(!key)throw failure('NOT_CONFIGURED','Credencial do fornecedor não configurada.');
      const reason=unsupported(entry,request);
      if(reason)return {offers:[],warnings:[reason],requestsUsed:0};
      const call=buildCall(entry,request,key),timeout=AbortSignal.timeout(75_000);
      const combined=signal?AbortSignal.any([signal,timeout]):timeout;
      try{
        const response=await fetcher(call.url,{...call.options,signal:combined,redirect:'error'});
        if(!response.ok){await response.body?.cancel?.();throw failure(`HTTP_${response.status}`,response.status===401?'A credencial do fornecedor foi recusada.':response.status===429?'O fornecedor atingiu o limite de consultas.':'O fornecedor não concluiu a consulta.');}
        const payload=await readJson(response);
        if(!payload||typeof payload!=='object'||Array.isArray(payload))throw failure('INVALID_RESPONSE','Formato de resposta não reconhecido.');
        if(payload.error||payload.errorCode||payload.search_metadata?.status==='Error'||payload.data?.success===false)throw failure('PROVIDER_ERROR','O fornecedor informou falha na consulta.');
        if(entry.requiresKey==='gecko'&&payload.data===null&&payload.notFound===true)return {offers:[],warnings:['Nenhum resultado encontrado na fonte.'],requestsUsed:1};
        if(payload.search_metadata?.status==='Processing')return {offers:[],warnings:['A busca ainda está em processamento no fornecedor.'],requestsUsed:1};
        const collections=entry.requiresKey==='gecko'
          ?[entry.id==='gecko-gol'?payload.data?.itineraries:entry.id==='gecko-azul'?payload.data?.trips:payload.data?.items]
          :request.category==='hotels'?[payload.properties]:[payload.best_flights,payload.other_flights];
        if(!collections.some(Array.isArray))throw failure('INVALID_RESPONSE','O fornecedor não retornou a estrutura de resultados documentada.');
        const receivedAt=new Date().toISOString();
        const offers=entry.requiresKey==='gecko'
          ?(request.category==='hotels'?geckoHotelOffers:geckoFlightOffers)(entry,request,payload,receivedAt)
          :(request.category==='hotels'?googleHotelOffers:googleFlightOffers)(entry,request,payload,receivedAt);
        const warnings=[];
        if(!offers.length)warnings.push('A fonte não retornou ofertas com preço numérico e moeda identificáveis.');
        if(payload.data?.nextPage||payload.pagination?.next_page_token||payload.serpapi_pagination?.next_page_token)warnings.push('Há outras páginas disponíveis; esta consulta trouxe apenas a primeira página.');
        return {offers,warnings,requestsUsed:1};
      }catch(error){
        if(combined.aborted)throw failure('TIMEOUT','A consulta foi interrompida ou excedeu o tempo disponível.');
        if(error?.code&&['NOT_CONFIGURED','RESPONSE_TOO_LARGE','INVALID_RESPONSE','PROVIDER_ERROR'].includes(error.code)||/^HTTP_\d{3}$/.test(error?.code||''))throw error;
        // Network errors may contain the URL, including SerpApi credentials.
        throw failure('NETWORK_ERROR','Não foi possível consultar o fornecedor neste momento.');
      }
    }};
  });
}
