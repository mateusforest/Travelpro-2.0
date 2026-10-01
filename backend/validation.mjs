import '../dist/itinerary-models.js';
import '../dist/sales-flow.js';
import '../dist/proposal-brand.js';
export const salesFlow=globalThis.TravelSalesFlow;
export const itineraryModels=globalThis.TravelItineraryModels;
export const collections=['clients','trips','events','transactions','templates','itineraries','documents','campaigns','budgets'];
export function fail(status,message){const e=new Error(message);e.status=status;throw e;}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validateState(s){
  if(!object(s)||typeof s.agency!=='string'||!s.agency.trim()||s.agency.length>150)fail(422,'Informe o nome da agência.');
  const scan=(x,depth=0)=>{if(depth>18)fail(422,'Estrutura de dados muito profunda.');if(typeof x==='string'&&x.length>500000)fail(422,'Conteúdo muito longo.');if(x&&typeof x==='object')for(const [k,v]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(k))fail(422,'Campo inválido.');scan(v,depth+1);}};scan(s);
  for(const key of collections){if(!Array.isArray(s[key])||s[key].length>10000)fail(422,'Lista inválida: '+key);const ids=new Set();for(const row of s[key]){if(!object(row)||typeof row.id!=='string'||!row.id||row.id.length>100||ids.has(row.id))fail(422,'Identificador inválido em '+key);ids.add(row.id);}}
  const refs=(key,id)=>s[key].some(x=>x.id===id),num=(v,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min;
  const date=x=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;}catch{return false;}};
  for(const c of s.clients)if(typeof c.name!=='string'||!c.name.trim()||typeof c.phone!=='string'||typeof c.email!=='string')fail(422,'Cliente inválido.');
  for(const c of s.clients){if(c.referredBy&&(c.referredBy===c.id||!refs('clients',c.referredBy)))fail(422,'Confira quem indicou o cliente.');if(c.acquisitionSource!==undefined&&(typeof c.acquisitionSource!=='string'||c.acquisitionSource.length>200))fail(422,'Informe uma origem com até 200 caracteres.');if(c.relationship&&!['Em construção','Próximo','Fidelizado','Requer atenção'].includes(c.relationship))fail(422,'Selecione o relacionamento com o cliente.');}
  for(const t of s.trips){
    const validDates=t.datesPending===true?(!t.start||date(t.start))&&(!t.end||date(t.end)):date(t.start)&&date(t.end);
    if(!refs('clients',t.client)||!t.title?.trim()||!t.destination?.trim()||!validDates||(t.start&&t.end&&t.end<t.start)||!num(t.value)||!Number.isInteger(t.travelers)||t.travelers<1)fail(422,'Revise o cliente, período e valores da viagem.');
    if(t.participants&&(!Array.isArray(t.participants)||new Set(t.participants).size!==t.participants.length||t.participants.some(id=>!refs('clients',id))))fail(422,'Revise os viajantes vinculados.');
    if(t.reservations){if(!Array.isArray(t.reservations)||t.reservations.length>1000)fail(422,'Reservas inválidas.');const ids=new Set();for(const r of t.reservations){if(!r.id||ids.has(r.id)||!r.title?.trim()||typeof r.details!=='string'||(r.start&&!date(r.start))||(r.end&&!date(r.end))||(r.start&&r.end&&r.end<r.start))fail(422,'Revise os dados da reserva.');ids.add(r.id);}}
  }
  for(const key of ['events','transactions','documents','itineraries'])for(const r of s[key])if(r.trip&&!refs('trips',r.trip))fail(422,'Viagem vinculada não encontrada.');
  for(const e of s.events)if(!e.title?.trim()||!date(e.date)||!/^\d{2}:\d{2}$/.test(e.time))fail(422,'Compromisso inválido.');
  for(const f of s.transactions)if(!f.title?.trim()||!num(f.amount,0.01)||!date(f.date)||!['receber','pagar','comissao'].includes(f.type))fail(422,'Lançamento inválido.');
  for(const b of s.budgets){if(!refs('clients',b.client)||!b.name?.trim()||!date(b.start)||!date(b.end)||b.end<b.start||!date(b.valid)||!Number.isInteger(b.travelers)||b.travelers<1||!Array.isArray(b.items)||!b.items.length||!num(b.discount))fail(422,'Orçamento inválido.');for(const i of b.items)if(!i.name?.trim()||!Number.isInteger(i.qty)||i.qty<1||!num(i.unit))fail(422,'Serviço inválido no orçamento.');if(b.discount>b.items.reduce((n,i)=>n+i.qty*i.unit,0))fail(422,'Desconto maior que o orçamento.');}
  for(const r of s.itineraries)if(!r.name?.trim()||!Array.isArray(r.days)||r.days.length>200)fail(422,'Roteiro inválido.');
  for(const d of s.documents){if(!d.name?.trim()||typeof d.content!=='string')fail(422,'Documento inválido.');if(d.signatureDraft&&(!object(d.signatureDraft)||!['prepared','needs_review'].includes(d.signatureDraft.status)||!Array.isArray(d.signatureDraft.clients)||!d.signatureDraft.clients.length||d.signatureDraft.clients.some(id=>!refs('clients',id))))fail(422,'Confira os signatários do documento.');if(d.expiry&&!date(d.expiry))fail(422,'Validade do documento inválida.');if(d.clients&&(!Array.isArray(d.clients)||d.clients.some(id=>!refs('clients',id))))fail(422,'Cliente do documento não encontrado.');}
  if(!object(s.whatsapp)||!Array.isArray(s.whatsapp.threads)||s.whatsapp.threads.length>10000||!object(s.whatsapp.config))fail(422,'Atendimento inválido.');
  const threadIds=new Set();for(const t of s.whatsapp.threads){if(!t.id||threadIds.has(t.id)||!t.name?.trim()||!['cos','human','closed'].includes(t.mode)||!object(t.profile)||!Array.isArray(t.messages)||!Array.isArray(t.events))fail(422,'Conversa inválida.');threadIds.add(t.id);if(t.clientId&&!refs('clients',t.clientId))fail(422,'Cliente do atendimento não encontrado.');}
  if(!Array.isArray(s.messages)||s.messages.length>2000)fail(422,'Histórico do COS excedeu o limite.');
  if(!['essencial','pro','completo'].includes(s.plan))fail(422,'Plano inválido.');
  if(!object(s.security)||!['15','30','60'].includes(String(s.security.timeout)))fail(422,'Escolha 15, 30 ou 60 minutos para a sessão.');
  salesFlow.validateState(s);
  try{if(s.proposalBrand)globalThis.TravelProposalBrand.normalize(s.proposalBrand);for(const b of s.budgets)if(b.brand)globalThis.TravelProposalBrand.normalize(b.brand);}catch(error){fail(422,error.message);}
  return s;
}
export function validateSalesTransition(previous,next){
  for(const r of next.itineraries){const old=previous.itineraries.find(x=>x.id===r.id);if(r.trip&&(!old||old.trip!==r.trip)&&!salesFlow.canItinerary(next.trips.find(t=>t.id===r.trip)))fail(422,'Confirme reserva, pagamento e emissão antes de preparar o roteiro desta viagem.');}
  for(const t of previous.trips){for(const q of t.sales?.quotes||[]){const stored=next.trips.find(x=>x.id===t.id)?.sales?.quotes.find(x=>x.id===q.id);if(!stored||JSON.stringify(stored)!==JSON.stringify(q))fail(422,'Preserve a cotação recebida. Registre uma nova versão para atualizar valores.');}}
}
export function operatorRequest(input,state){
  if(!input||typeof input.destination!=='string'||!input.destination.trim()||typeof input.origin!=='string'||!input.origin.trim()||!salesFlow.date(input.start)||!salesFlow.date(input.end)||input.end<input.start||!Number.isInteger(Number(input.travelers))||Number(input.travelers)<1||Number(input.travelers)>100||!state.clients.some(c=>c.id===input.client))fail(422,'Confira cliente, destino, origem, datas e viajantes.');
  if(input.trip&&!state.trips.some(t=>t.id===input.trip&&t.client===input.client))fail(422,'Atendimento não encontrado nesta agência.');
  return {trip:input.trip||'',client:input.client,destination:input.destination.slice(0,200),origin:input.origin.slice(0,200),start:input.start,end:input.end,travelers:Number(input.travelers),notes:String(input.notes||'').slice(0,6000)};
}
export function operatorResult(result){try{return {...salesFlow.normalizeQuote(result),source:'operator'};}catch(error){fail(502,'Resposta incompatível da operadora: '+error.message);}}
