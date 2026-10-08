import {randomUUID} from 'node:crypto';

export const travelPlanLimits=Object.freeze({maxPlans:30,maxItems:12,maxBytes:180000,maxCollectionBytes:1000000,maxWorkspaceBytes:4000000});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const categories=new Set(['hotels','flights','activities','tickets','cars','transfers','trip']);
const clean=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
const date=value=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}catch{return false;}};
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():'';
const safeUrl=value=>{try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.href.length>3000)return '';for(const key of url.searchParams.keys())if(/token|secret|password|authorization|api.?key|signature/i.test(key))return '';return url.href;}catch{return '';}};
function inspect(input){
  if(!object(input))fail(422,'Plano de viagem inválido.');
  if(Buffer.byteLength(JSON.stringify(input))>travelPlanLimits.maxBytes)fail(413,'O plano excede o tamanho permitido. Remova detalhes extensos.');
  const scan=(value,depth=0)=>{if(depth>12)fail(422,'Estrutura de plano inválida.');if(object(value)||Array.isArray(value))for(const [key,child]of Object.entries(value)){if(/^(?:__proto__|constructor|prototype|privatePricing|apiKey|api_key|authorization|cookie|password|secret|token)$/i.test(key))fail(422,'Não inclua credenciais ou preços privados no organizador.');scan(child,depth+1);}};scan(input);
}
function request(input){
  if(!object(input))return {};
  const out={};
  if(categories.has(input.category))out.category=input.category;
  if(['quote','opportunities'].includes(input.mode))out.mode=input.mode;
  if(/^[A-Z]{3}$/.test(input.currency))out.currency=input.currency;
  for(const key of ['origin','destination'])if(clean(input[key]))out[key]=clean(input[key]);
  for(const key of ['originAirport','destinationAirport'])if(/^[A-Z]{3}$/.test(input[key]))out[key]=input[key];
  for(const key of ['start','end'])if(input[key]){if(!date(input[key]))fail(422,'Confira as datas das opções salvas.');out[key]=input[key];}
  if(out.end&&out.start&&out.end<out.start)fail(422,'Confira a ordem das datas.');
  for(const [key,max]of [['adults',100],['rooms',30]])if(input[key]!==undefined){if(!Number.isInteger(input[key])||input[key]<1||input[key]>max)fail(422,'Confira os viajantes e quartos.');out[key]=input[key];}
  if(input.childrenAges!==undefined){if(!Array.isArray(input.childrenAges)||input.childrenAges.length>30||input.childrenAges.some(age=>!Number.isInteger(age)||age<0||age>17))fail(422,'Confira a idade das crianças.');out.childrenAges=[...input.childrenAges];}
  if(/^\d{1,8}$/.test(input.hotelId))out.hotelId=String(input.hotelId);
  return out;
}
const conditionKeys=['mealPlan','board','cancellation','cancellationPolicy','baggage','refundable','freeCancellation','roomType','taxes','payment','airline','duration','stops','rating','address','room','fare','departure','arrival','departureTime','arrivalTime','minimumParticipants','packageDays','redemptionValidityMonths','advertisedPassengers','passengerPriceScope'];
const detailKeys=['priceKind','requestedDatesMatched','hotelId','roomId','rateId','publishedStart','publishedEnd','priceScope','origin','destination','advertisedBasis',...conditionKeys];
function fields(input,keys){const out={};if(!object(input))return out;for(const key of keys){const value=input[key];if(typeof value==='string')out[key]=value.slice(0,1000);else if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))out[key]=value;}return out;}
export function compactPlanOffer(input){
  if(!object(input)||!categories.has(input.category)||input.category==='trip'||!clean(input.title)||!clean(input.id))fail(422,'Revise as opções do organizador.');
  const p=object(input.price)?input.price:{};
  if(p.amount!==null&&p.amount!==undefined&&(!Number.isFinite(p.amount)||p.amount<=0||p.amount>100000000))fail(422,'Preço de referência inválido.');
  const evidence=object(input.evidence)?input.evidence:object(input.details?.evidence)?input.details.evidence:{};
  return {
    id:clean(input.id,250),category:input.category,title:clean(input.title,500),provider:clean(input.provider,100),source:clean(input.source,200),sourceUrl:safeUrl(input.sourceUrl),
    capturedAt:time(input.capturedAt),expiresAt:'',savedReference:true,bookable:false,completeness:'unknown',
    ...(/^[a-f0-9]{64}$/.test(input.identityKey)&&['dated_quote','published_product'].includes(input.identityKind)?{identityKey:input.identityKey,identityKind:input.identityKind}:{}),
    requestSnapshot:request(input.requestSnapshot||input.request),planningRequest:request(input.planningRequest),
    price:{amount:p.amount??null,currency:/^[A-Z]{3}$/.test(p.currency)?p.currency:'',basis:['stay','round_trip','one_way','from','night','day','per_person','unknown'].includes(p.basis)?p.basis:'unknown',taxesIncluded:typeof p.taxesIncluded==='boolean'?p.taxesIncluded:null},
    conditions:fields(input.conditions,conditionKeys),details:fields(input.details,detailKeys),
    evidence:{...fields(evidence,['parserVersion','selector','jsonPath','rawPrice','rawCurrency']),documentUrl:safeUrl(evidence.documentUrl),sha256:/^[a-f0-9]{64}$/.test(evidence.sha256)?evidence.sha256:''},
    warnings:[...new Set((Array.isArray(input.warnings)?input.warnings:[]).filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,500)).concat('Referência salva. Consulte novamente para confirmar preço e disponibilidade.'))]
  };
}
function planData(input,state){
  inspect(input);
  const name=clean(input.name,150);if(!name)fail(422,'Dê um nome ao plano de viagem.');
  const clientId=clean(input.clientId,100);if(clientId&&!state.clients.some(c=>c.id===clientId&&!c.deletedAt))fail(422,'Cliente não encontrado nesta agência.');
  if(!Array.isArray(input.items)||input.items.length>travelPlanLimits.maxItems)fail(422,'Guarde até 12 opções por plano.');
  const items=input.items.map(compactPlanOffer),keys=new Set();for(const item of items){const key=JSON.stringify([item.category,item.provider,item.id,item.sourceUrl,item.requestSnapshot.start,item.requestSnapshot.end]);if(keys.has(key))fail(422,'A mesma opção aparece mais de uma vez no plano.');keys.add(key);}
  return {name,clientId,notes:clean(input.notes,3000),items};
}
export function validateTravelPlans(state){
  if(state.travelPlans===undefined)return;
  if(!Array.isArray(state.travelPlans)||state.travelPlans.length>travelPlanLimits.maxPlans)fail(422,'Limite de planos de viagem excedido.');
  if(Buffer.byteLength(JSON.stringify(state.travelPlans))>travelPlanLimits.maxCollectionBytes)fail(413,'Os planos salvos excedem 1 MB. Remova planos antigos ou reduza os detalhes das opções.');
  const ids=new Set();for(const plan of state.travelPlans){
    if(!object(plan)||!/^[\da-f-]{36}$/i.test(plan.id)||ids.has(plan.id)||!Number.isInteger(plan.revision)||plan.revision<1||!time(plan.createdAt)||!time(plan.updatedAt))fail(422,'Plano salvo inválido.');ids.add(plan.id);
    // Server-owned collection; validate shape without requiring a historical client's continued presence.
    const normalized=planData({...plan,clientId:''},{clients:[]});
    if(!Array.isArray(plan.items)||plan.items.some((item,i)=>JSON.stringify(item)!==JSON.stringify(normalized.items[i])))fail(422,'As opções salvas precisam permanecer como referências históricas.');
  }
}
export async function handleTravelPlans({path='',method='GET',input={},load,save,now=()=>new Date(),id=randomUUID}){
  const key=path.replace(/^\//,'');if(key&&!/^[\da-f-]{36}$/i.test(key))fail(404,'Plano não encontrado.');
  const row=await load(),plans=row.state.travelPlans||[];
  const existing=key?plans.find(plan=>plan.id===key):null;
  if(method==='GET'){if(key&&!existing)fail(404,'Plano não encontrado.');return key?{plan:existing,version:row.version}:{plans,version:row.version,limits:travelPlanLimits};}
  if(!['POST','PUT','DELETE'].includes(method)||method==='POST'&&key||method!=='POST'&&!key)fail(405,'Operação de plano inválida.');
  if(key&&!existing)fail(404,'Plano não encontrado.');
  if(!object(input)||!Number.isInteger(input.version))fail(422,'Versão dos dados ausente.');
  if(input.version!==row.version)fail(409,'A agência mudou em outro acesso. Recarregue os dados antes de salvar o plano.');
  if(existing&&(!Number.isInteger(input.revision)||input.revision!==existing.revision))fail(409,'Este plano mudou em outro acesso. Reabra a versão salva antes de editar.');
  if(method==='POST'&&plans.length>=travelPlanLimits.maxPlans)fail(422,'A agência já possui 30 planos. Remova um plano antes de criar outro.');
  const state=structuredClone(row.state);let plan;
  if(method==='DELETE')state.travelPlans=plans.filter(p=>p.id!==key);
  else {const stamp=now().toISOString();plan={...planData(input.plan,state),id:existing?.id||id(),revision:(existing?.revision||0)+1,createdAt:existing?.createdAt||stamp,updatedAt:stamp};state.travelPlans=existing?plans.map(p=>p.id===key?plan:p):[plan,...plans];}
  if(method!=='DELETE'){
    validateTravelPlans(state);
    if(Buffer.byteLength(JSON.stringify(state))>travelPlanLimits.maxWorkspaceBytes)fail(413,'A agência atingiu o limite de dados para novos planos. Reduza documentos extensos ou exclua planos antigos antes de salvar.');
  }
  const version=await save(state,row.version);
  return {plans:state.travelPlans,version,...(plan?{plan}:{deletedId:key})};
}
