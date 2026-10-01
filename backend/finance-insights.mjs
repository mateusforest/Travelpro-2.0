import {fail} from './validation.mjs';
import {cents,validDate,paid} from './finance.mjs';

const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const isOperation=t=>! /cancelad|perdid|recusad/.test(norm(t.status))&&(/confirmad|emitid|finalizad|concluid|encerrad|andamento|em viagem|viajando/.test(norm(t.status))||t.sales?.fulfillment?.reservation==='confirmed'||t.sales?.fulfillment?.emission==='issued');
const amount=value=>Number.isFinite(Number(value))&&Number(value)>0?Math.round(Number(value)*100):null;
export function enrichEntries(rows,catalogs,state){
  const links=new Map(catalogs.filter(c=>c.kind==='entry-link').map(c=>[c.entryId,c]));
  const trips=new Map(state.trips.map(t=>[t.id,t]));
  return rows.map(e=>{const link=links.get(e.id),tripId=link?link.tripId:e.tripId||'';return {...e,tripId,clientId:(link?link.clientId:e.clientId)||trips.get(tripId)?.client||'',serviceType:['income','commission'].includes(e.type)?(link?link.serviceType:e.serviceType||''):'',linkVersion:link?.version||0};});
}
export function operationRows(state,catalogs,entries){
  const metadata=new Map(catalogs.filter(c=>c.kind==='operation').map(c=>[c.tripId,c]));
  return state.trips.filter(isOperation).map(t=>{
    const m=metadata.get(t.id)||{},client=state.clients.find(c=>c.id===t.client),related=entries.filter(e=>e.tripId===t.id&&!e.canceled&&!['transfer','opening'].includes(e.type));
    const commissions=related.filter(e=>e.serviceType==='commission'||e.type==='commission'&&e.serviceType!=='consultancy');
    const consultancy=related.filter(e=>e.serviceType==='consultancy');
    const expenses=related.filter(e=>e.type==='expense');
    const sum=list=>list.reduce((n,e)=>n+e.amountCents,0);
    const volume=amount(t.value),commission=m.commissionMode==='percent'?(volume===null?null:Math.round(volume*m.commissionRate/100)):m.commissionCents??(commissions.length?sum(commissions):null);
    const fee=consultancy.length?sum(consultancy):m.consultancyCents??0;
    const costs=expenses.length?sum(expenses):m.costsCents??null;
    const confirmed=t.sales?.confirmedAt;
    const recordedDate=m.saleDate||(confirmed&&Number.isFinite(Date.parse(confirmed))?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(confirmed)):'');
    const date=validDate(recordedDate)?recordedDate:validDate(t.start)?t.start:'';
    const revenue=commission===null?null:commission+fee;
    return {id:t.id,title:t.title,clientId:t.client,clientName:client?.name||'Cliente',status:t.status,date,dateBasis:recordedDate?'Confirmação / venda':'Período da viagem',volumeCents:volume,commissionCents:commission,consultancyCents:fee,costsCents:costs,revenueCents:revenue,resultCents:revenue===null||costs===null?null:revenue-costs,receivedCents:[...commissions,...consultancy].reduce((n,e)=>n+paid(e),0),commissionLinked:commissions.length>0,costsLinked:expenses.length>0,consultancyLinked:consultancy.length>0,entryCount:related.length,metadata:m};
  });
}
export function insightReport(state,catalogs,entries,f){
  const all=operationRows(state,catalogs,entries);
  const rows=all.filter(o=>(!f.clientId||o.clientId===f.clientId)&&(!f.tripId||o.id===f.tripId)&&(!f.q||norm(o.title+' '+o.clientName).includes(norm(f.q)))&&(f.allTime||o.date>=f.from&&o.date<=f.to));
  const sum=key=>rows.reduce((n,r)=>n+(r[key]||0),0);
  const clients=state.clients.filter(c=>(!f.clientId||c.id===f.clientId)&&(!f.tripId||state.trips.some(t=>t.id===f.tripId&&t.client===c.id))&&(!f.q||norm(c.name).includes(norm(f.q))||rows.some(o=>o.clientId===c.id))).map(c=>{
    const purchases=rows.filter(o=>o.clientId===c.id),lifetime=all.filter(o=>o.clientId===c.id);
    return {id:c.id,name:c.name,purchases:purchases.length,lifetimePurchases:lifetime.length,volumeCents:purchases.reduce((n,o)=>n+(o.volumeCents||0),0),missingValues:purchases.filter(o=>o.volumeCents===null).length,revenueCents:purchases.reduce((n,o)=>n+(o.revenueCents||0),0),lastPurchase:lifetime.map(o=>o.date).filter(Boolean).sort().at(-1)||'',referrals:state.clients.filter(x=>x.referredBy===c.id).length,origin:c.acquisitionSource||'',referredByName:state.clients.find(x=>x.id===c.referredBy)?.name||'',relationship:c.relationship||'',trips:state.trips.filter(t=>t.client===c.id).map(t=>({id:t.id,title:t.title,status:t.status,start:t.start,value:t.value}))};
  }).sort((a,b)=>b.volumeCents-a.volumeCents||b.purchases-a.purchases||a.name.localeCompare(b.name));
  return {operations:rows,clients,summary:{operations:rows.length,volumeCents:sum('volumeCents'),commissionCents:sum('commissionCents'),consultancyCents:sum('consultancyCents'),revenueCents:sum('commissionCents')+sum('consultancyCents'),resultCents:sum('resultCents'),incomplete:rows.filter(r=>r.resultCents===null||r.volumeCents===null).length},undated:all.filter(o=>!o.date).length};
}
export function operationMetadata(input,trip,previous){
  const optional=value=>value===''||value==null?null:cents(value,{zero:true});
  const mode=input.commissionMode||'amount',rate=mode==='percent'?Number(String(input.commissionRate).replace(',','.')):0;
  if(!['amount','percent'].includes(mode)||mode==='percent'&&(input.commissionRate==null||String(input.commissionRate).trim()==='')||!Number.isFinite(rate)||rate<0||rate>100)fail(422,'Confira o percentual da comissão (0 a 100).');
  if(input.saleDate&&!validDate(input.saleDate))fail(422,'Confira a data da venda.');
  return {id:'operation-'+trip.id,kind:'operation',name:trip.title,tripId:trip.id,saleDate:input.saleDate||'',commissionMode:mode,commissionRate:rate,commissionCents:mode==='amount'?optional(input.commission):null,consultancyCents:input.consultancy===undefined?(previous?.consultancyCents??0):optional(input.consultancy)??0,costsCents:input.costs===undefined?(previous?.costsCents??null):optional(input.costs),notes:String(input.notes||'').slice(0,3000),archived:false};
}
export function csvDocument(heading,rows){
  const cell=value=>'"'+String(value??'').replace(/^[\s\uFEFF]*[=+\-@]/,m=>"'"+m).replaceAll('"','""')+'"';
  return '\uFEFF'+[heading,...rows].map(r=>r.map(cell).join(';')).join('\r\n');
}
