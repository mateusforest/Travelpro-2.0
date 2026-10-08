import {createHash} from 'node:crypto';

// Owned parsers for public supplier HTML. Fetching/robots/limits belong to native-http.
const LIMIT=100,MAX_HTML=3*1024*1024;
const aliases=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const bounded=(value,max=300)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max):'';
const array=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function decode(value){
  return String(value||'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';})
    .replace(/&(amp|quot|apos|lt|gt|nbsp|euro|pound);/g,(_,key)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',euro:'€',pound:'£'}[key]));
}
const plain=value=>bounded(decode(String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim(),400);
function attribute(tag,name){const m=String(tag).match(new RegExp('\\b'+name+'\\s*=\\s*(["\'])([\\s\\S]*?)\\1','i'));return m?decode(m[2]):null;}
function sameHostUrl(value,pageUrl){
  if(typeof value!=='string'||!value.trim())return null;
  try{const u=new URL(decode(value),pageUrl),page=new URL(pageUrl);if(u.protocol!=='https:'||u.host!==page.host||u.username||u.password)return null;u.hash='';return u.href;}catch{return null;}
}
function numeric(value){
  if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
  if(typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())){const n=Number(value);return Number.isFinite(n)?n:null;}
  return null;
}
function visibleMoney(fragment){
  const value=plain(fragment),match=value.match(/(US\$|R\$|A\$|C\$|€|£)\s*([0-9][\d.,\s]*)/);
  if(!match)return null;
  let number=match[2].replace(/\s/g,'');
  if(number.includes(','))number=number.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(number))number=number.replace(/\./g,'');
  const amount=numeric(number);if(amount===null)return null;
  return {amount,currency:{'US$':'USD','R$':'BRL','A$':'AUD','C$':'CAD','€':'EUR','£':'GBP'}[match[1]],rawPrice:match[2].trim(),rawCurrency:match[1],text:value};
}
function categoryFor(name,fallback='activities'){
  const title=aliases(name);
  if(/seguro|\besim\b|chip de|chip esim/.test(title))return null;
  if(/^(?:transfers?\b|traslados?\b|transporte entre\b|transporte.*aeroporto)/.test(title))return 'transfers';
  if(/^(?:ingressos?\b|bilhetes?\b|entradas?\b)/.test(title))return 'tickets';
  return fallback;
}
function jsonEntities(html){
  const found=[];let block=0,nodes=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(attribute(match[1],'type')?.toLowerCase()!=='application/ld+json')continue;
    const index=block++;if(block>40||match[2].length>600000)continue;
    let root;try{root=JSON.parse(match[2]);}catch{continue;}
    const visit=(node,path,depth)=>{
      if(depth>16||++nodes>10000||!node||typeof node!=='object')return;
      if(node.name&&node.offers&&['Product','Event','TouristTrip','Service'].some(type=>array(node['@type']).includes(type)||node['@type']===type))found.push({node,path});
      for(const[key,value]of Object.entries(node))if(value&&typeof value==='object')visit(value,`${path}.${key}`,depth+1);
    };
    visit(root,`jsonld[${index}]`,0);
  }
  return found.slice(0,300);
}
function makeOffer({provider,url,capturedAt,sha256},data){
  const sourceUrl=sameHostUrl(data.url,url);if(!sourceUrl||!data.title||numeric(data.amount)===null||!/^[A-Z]{3}$/.test(data.currency||''))return null;
  const category=categoryFor(data.title,data.category);if(!category)return null;
  return {
    id:`native-${provider}-${createHash('sha256').update(JSON.stringify([sourceUrl,data.title,data.details?.productId||null,data.publishedStart||null,data.priceScope||'unknown',data.amount,data.currency])).digest('hex').slice(0,20)}`,
    identityKey:createHash('sha256').update(JSON.stringify([sourceUrl,data.title,data.details?.productId||null,data.publishedStart||null,data.priceScope||'unknown'])).digest('hex'),identityKind:'published_product',
    provider:`native-${provider}`,source:{civitatis:'Civitatis',tiqets:'Tiqets',getyourguide:'GetYourGuide',siga:'Siga Turismo'}[provider],
    category,title:bounded(data.title),sourceUrl,capturedAt,collectedAt:capturedAt,expiresAt:null,
    price:{amount:data.amount,currency:data.currency,basis:'from',taxesIncluded:null},
    bookable:false,completeness:'unknown',
    conditions:{cancellation:null,participantsVerified:false,requestedDatesMatched:false,...data.conditions},
    details:{priceKind:'published',priceScope:data.priceScope||'unknown',requestedDatesMatched:false,publishedStart:data.publishedStart||null,publishedEnd:null,
      evidence:{format:data.format,path:bounded(data.path,250),excerpt:bounded(data.excerpt,300),pageUrl:url,documentUrl:url,parserVersion:'native-experiences/1.0.0',rawPrice:bounded(String(data.rawPrice??data.text??data.amount),100),rawCurrency:bounded(data.rawCurrency||data.currency,20),sha256},...data.details},
    warnings:['Preço publicado de referência; data, horário, participantes e disponibilidade ainda não foram consultados.',...(data.warnings||[])],
  };
}
function parseCivitatis(html,context){
  const structured=new Map(jsonEntities(html).map(({node,path})=>[sameHostUrl(node.url,context.url),{node,path}]));
  const offers=[],warnings=[];
  for(const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)){
    if(offers.length>=LIMIT)break;
    if(!/(?:^|\s)comfort-card(?:\s|$)/.test(attribute(match[1],'class')||''))continue;
    const card=match[2],title=plain(card.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
    const priceStart=card.search(/<span\b[^>]*class=["'][^"']*\bcomfort-card__price__text\b[^"']*["'][^>]*>/i);
    if(priceStart<0)continue;
    // Read only the price wrapper, never another card or an unrelated global currency variable.
    const fragment=card.slice(priceStart).split('</div>')[0],money=visibleMoney(fragment);if(!money)continue;
    const links=[...card.matchAll(/<a\b[^>]*>/gi)].map(x=>attribute(x[0],'href')).filter(x=>x&&x!=='#');
    const publicUrl=links.map(x=>sameHostUrl(x,context.url)).find(Boolean);if(!publicUrl)continue;
    const linked=structured.get(publicUrl),declared=array(linked?.node?.offers).length?linked.node.offers[0]:linked?.node?.offers;
    const contradiction=declared?.priceCurrency&&declared.priceCurrency!==money.currency;
    const details={productId:attribute(match[1],'data-activity')||null};
    if(contradiction){details.structuredPriceConflict={currency:declared.priceCurrency,amount:numeric(declared.price),path:linked.path+'.offers'};warnings.push('Civitatis: moeda do JSON-LD diverge da moeda explícita no preço do card; foi mantida a moeda visível.');}
    const offer=makeOffer(context,{title,url:publicUrl,...money,format:'html-card',path:`article.comfort-card[data-activity="${details.productId||''}"] .comfort-card__price__text`,excerpt:`${title}: ${money.text}`,details,
      warnings:contradiction?['A moeda do JSON-LD diverge do preço visível; confira a oferta no fornecedor antes de utilizá-la.']:[]});
    if(offer)offers.push(offer);
  }
  return {offers,warnings:[...new Set(warnings)]};
}
function parseStructured(html,context){
  const entities=jsonEntities(html),offers=[],hasEvents=entities.some(({node})=>node['@type']==='Event');
  for(const {node,path}of entities){
    if(offers.length>=LIMIT)break;
    // Venue AggregateOffer may represent a related product (e.g. VR outside the Louvre), not admission.
    if(hasEvents&&node['@type']==='Product')continue;
    for(const value of (Array.isArray(node.offers)?node.offers:[node.offers]).slice(0,5)){
      if(!object(value)||/SoldOut|OutOfStock|Discontinued/i.test(value.availability||''))continue;
      const amount=numeric(value.price??value.lowPrice);if(amount===null)continue;
      const offer=makeOffer(context,{title:plain(node.name),url:value.url||node.url,amount,currency:value.priceCurrency,category:context.provider==='tiqets'?'tickets':'activities',
        format:'jsonld',path:path+'.offers',excerpt:`${plain(node.name)} | ${value.priceCurrency} ${amount}`,rawPrice:value.price??value.lowPrice,
        publishedStart:bounded(node.startDate,60)||null,details:{structuredType:bounded(node['@type'],40),availabilityLabel:bounded(value.availability,100)||null},
        warnings:node.startDate?['A data publicada no catálogo não confirma a data solicitada para a viagem.']:[]});
      if(offer)offers.push(offer);
    }
  }
  return {offers,warnings:[]};
}
function parseSiga(html,context){
  const offers=[];
  for(const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
    if(offers.length>=LIMIT)break;
    const card=match[2];if(!/class=["'][^"']*\bpayt-card-wrapper\b/.test(card))continue;
    const title=plain(card.match(/<div\b[^>]*class=["'][^"']*\bpayt-card-excursion-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]);
    const money=visibleMoney(card.match(/<strong\b[^>]*class=["'][^"']*\bpayt-card-price-value\b[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i)?.[1]);
    if(!money)continue;
    const perPerson=/Preço\s+POR\s+PESSOA/i.test(plain(card)),minimumTwo=/Reserva\s+M[ií]nima\s+de\s+DUAS\s+PESSOAS/i.test(plain(card));
    const nextDate=plain(card.match(/<div\b[^>]*class=["'][^"']*\bpayt-card-atividade-badge-date\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]);
    const offer=makeOffer(context,{title,url:attribute(match[1],'href'),...money,format:'html-card',path:'a .payt-card-wrapper .payt-card-price-value',excerpt:`${title}: ${money.text}`,
      priceScope:perPerson?'per_person':'unknown',conditions:{minimumParticipants:minimumTwo?2:null},publishedStart:/^\d{2}\/\d{2}\/\d{4}$/.test(nextDate)?nextDate.split('/').reverse().join('-'):null});
    if(offer)offers.push(offer);
  }
  return {offers,warnings:[]};
}

export function parseNativeExperiences(html,{url,provider,capturedAt=new Date().toISOString(),sha256,category}={}){
  if(typeof html!=='string'||Buffer.byteLength(html)>MAX_HTML)throw new Error('Documento HTML inválido ou acima do limite.');
  if(!['civitatis','tiqets','getyourguide','siga'].includes(provider))throw new Error('Fonte de experiências não suportada.');
  const hosts={civitatis:'www.civitatis.com',tiqets:'www.tiqets.com',getyourguide:'www.getyourguide.com',siga:'sigaturismo.com.br'};
  const page=new URL(url);if(page.protocol!=='https:'||page.host!==hosts[provider])throw new Error('Domínio de experiências não permitido.');
  const context={url:page.href,provider,capturedAt,sha256:sha256||createHash('sha256').update(html).digest('hex')};
  const result=provider==='civitatis'?parseCivitatis(html,context):provider==='siga'?parseSiga(html,context):parseStructured(html,context);
  if(category)result.offers=result.offers.filter(offer=>offer.category===category);
  result.offers=[...new Map(result.offers.map(offer=>[offer.id,offer])).values()];
  if(!result.offers.length)result.warnings.push('A página não apresentou preços publicados verificáveis para esta categoria.');
  return result;
}

// Civitatis paths observed in its own public navigation; other source locations were fetched directly.
const civitatisCities=Object.fromEntries(['porto-alegre','roma','paris','nova-york','cracovia','londres','florenca','budapeste','madrid','barcelona','cairo','milao','marrakech','granada','edimburgo','atenas','toquio','istambul','lisboa','sevilha','praga'].map(slug=>[slug.replaceAll('-',' '),slug]));
civitatisCities['new york']='nova-york';
const sourceDefinitions=[
  {id:'native-civitatis',source:'civitatis',name:'Civitatis · coleta própria',categories:['activities','tickets','transfers'],host:'www.civitatis.com',destinations:Object.keys(civitatisCities),page:destination=>civitatisCities[destination]?`https://www.civitatis.com/br/${civitatisCities[destination]}/`:null},
  {id:'native-getyourguide',source:'getyourguide',name:'GetYourGuide · coleta própria',categories:['activities','transfers'],host:'www.getyourguide.com',destinations:['porto alegre'],page:destination=>destination==='porto alegre'?'https://www.getyourguide.com/pt-br/porto-alegre-l32362/tours-guiados-tc1144/':null},
  {id:'native-tiqets',source:'tiqets',name:'Tiqets · coleta própria',categories:['tickets'],host:'www.tiqets.com',destinations:['paris','louvre'],page:destination=>['paris','louvre'].includes(destination)?'https://www.tiqets.com/pt/bilhetes-museu-do-louvre-l124297/':null,coverageWarning:'A fonte Tiqets está limitada ao catálogo público do Louvre nesta etapa.'},
  {id:'native-siga',source:'siga',name:'Siga Turismo · fornecedor direto',categories:['activities','transfers'],host:'sigaturismo.com.br',destinations:['porto alegre'],page:destination=>destination==='porto alegre'?'https://sigaturismo.com.br/':null},
];
export const nativeExperienceCatalog=Object.freeze(sourceDefinitions.map(({page,source,host,coverageWarning,...entry})=>Object.freeze({...entry,requiresKey:null,implemented:true,configured:true,kind:'native',dateIndependent:true,docsUrl:`https://${host}/`,categories:Object.freeze(entry.categories),destinations:Object.freeze(entry.destinations),coverage:{type:'destinations',limited:true,destinations:entry.destinations,label:coverageWarning||'Catálogo público dos destinos listados; data, participantes e disponibilidade precisam de confirmação.'},capabilities:{modes:['quote','opportunities'],datedQuotes:false,publishedOffers:true,roomSelection:false}})));
export function createNativeExperienceAdapters({collector}={}){
  if(!collector?.getHtml)throw new Error('Coletor HTTP nativo obrigatório.');
  function support(entry,request){
    if(request.category!=='trip'&&!entry.categories.includes(request.category))return {supported:false,code:'category',reason:'Categoria não atendida nesta fonte.'};
    if(!sourceDefinitions.find(x=>x.id===entry.id).page(aliases(request.destination)))return {supported:false,code:'destination',reason:'Destino ainda não mapeado para coleta própria nesta fonte.'};
    return {supported:true};
  }
  return nativeExperienceCatalog.map(entry=>({...entry,supports:request=>support(entry,request),async search(request,{signal}={}){
    const source=sourceDefinitions.find(x=>x.id===entry.id);
    const supported=support(entry,request);if(!supported.supported)return {offers:[],warnings:[supported.reason],requestsUsed:0,networkRequests:0};
    const url=source.page(aliases(request.destination));
    const page=await collector.getHtml(url,{signal,allowedHosts:[source.host]});
    const result=parseNativeExperiences(page.html,{provider:source.source,url:page.url,capturedAt:page.fetchedAt,sha256:page.sha256,category:request.category==='trip'?undefined:request.category});
    if(source.coverageWarning)result.warnings.push(source.coverageWarning);
    for(const offer of result.offers){offer.details.requestedStart=request.start||null;offer.details.requestedEnd=request.end||null;offer.details.collection='direct_http';}
    return {...result,requestsUsed:1,networkRequests:page.networkRequests??1};
  }}));
}
