import {randomUUID} from 'node:crypto';
import {fail} from './validation.mjs';

export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const text=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
export function cents(value,{signed=false,zero=false}={}){
  const str=String(value??'').trim().replace(',','.');
  if(!(signed?/^-?\d{1,10}(?:\.\d{1,2})?$/:/^\d{1,10}(?:\.\d{1,2})?$/).test(str))fail(422,'Informe um valor com até duas casas decimais.');
  const negative=str.startsWith('-'),[whole,fraction='']=str.replace('-','').split('.');
  const result=(Number(whole)*100+Number(fraction.padEnd(2,'0')))*(negative?-1:1);
  if(!Number.isSafeInteger(result)||(!signed&&result<(zero?0:1)))fail(422,'Informe um valor positivo.');
  return result;
}
export const paid=e=>e.legacyPaid?e.amountCents:(e.payments||[]).reduce((sum,p)=>sum+p.amountCents,0);
export const status=(e,date=today())=>e.canceled?'canceled':paid(e)>=e.amountCents?'paid':paid(e)>0?'partial':e.dueDate<date?'overdue':'open';
export function filters(input={}){
  const date=today(),from=input.from||date.slice(0,7)+'-01',to=input.to||new Date(Number(date.slice(0,4)),Number(date.slice(5,7)),0).toISOString().slice(0,10);
  if(!validDate(from)||!validDate(to)||from>to)fail(422,'Confira o período inicial e final.');
  const out={from,to,basis:input.basis||'dueDate',type:input.type||'',status:input.status||'',accountId:text(input.accountId,100),categoryId:text(input.categoryId,100),personId:text(input.personId,100),source:input.source||'',q:text(input.q,150),today:date,page:Number(input.page||1),pageSize:50};
  if(!['dueDate','competenceDate'].includes(out.basis)||!['','income','expense','commission','transfer','opening'].includes(out.type)||!['','open','paid','partial','overdue','canceled'].includes(out.status)||!['','manual','legacy','granatum'].includes(out.source)||!Number.isInteger(out.page)||out.page<1||out.page>1000000)fail(422,'Filtro financeiro inválido.');
  return out;
}
export function catalog(input,previous){
  const kind=previous?.kind||input.kind,name=text(input.name,150);
  if(!['account','category','person'].includes(kind)||!name)fail(422,'Informe o nome do cadastro.');
  const data={id:previous?.id||randomUUID(),kind,name,archived:previous?.archived||false};
  if(kind==='account'){
    data.openingCents=cents(input.openingAmount||'0',{signed:true,zero:true});data.openingDate=input.openingDate;
    if(!validDate(data.openingDate)||data.openingDate>today())fail(422,'Informe uma data para o saldo inicial até hoje.');
  }
  if(kind==='category'){data.type=input.type||'both';if(!['income','expense','both'].includes(data.type))fail(422,'Tipo de categoria inválido.');}
  if(kind==='person'){data.role=input.role||'supplier';if(!['client','supplier','both'].includes(data.role))fail(422,'Tipo de contato inválido.');data.email=text(input.email,254);data.document=text(input.document,30);data.phone=text(input.phone,40);}
  return data;
}
function reference(catalogs,id,kind,previousId){
  if(!id)return '';
  if(kind==='account'&&catalogs.some(c=>c.id===id&&c.source==='granatum'))fail(422,'Use uma conta TravelPro para lançamentos manuais. Contas Granatum são sincronizadas na origem.');
  if(!catalogs.some(c=>c.id===id&&c.kind===kind&&(!c.archived||id===previousId)))fail(422,'Selecione um cadastro financeiro ativo.');return id;
}
export function entry(input,catalogs,previous){
  if(previous?.canceled)fail(409,'Reabra o lançamento antes de editar.');
  const type=input.type,title=text(input.title,200),amountCents=cents(input.amount),dueDate=input.dueDate,competenceDate=input.competenceDate||dueDate;
  if(!title||!['income','expense','commission','transfer'].includes(type)||!validDate(dueDate)||!validDate(competenceDate))fail(422,'Confira descrição, tipo e datas do lançamento.');
  const data={...previous,id:previous?.id||randomUUID(),title,type,amountCents,dueDate,competenceDate,accountId:reference(catalogs,input.accountId,'account',previous?.accountId),toAccountId:reference(catalogs,type==='transfer'?input.toAccountId:'','account',previous?.toAccountId),categoryId:reference(catalogs,type==='transfer'?'':input.categoryId,'category',previous?.categoryId),personId:reference(catalogs,input.personId,'person',previous?.personId),tripId:text(input.tripId,100),document:text(input.document,100),notes:text(input.notes,5000),source:previous?.source||'manual',externalId:previous?.externalId||'',payments:previous?.payments||[],canceled:false,legacyPaid:previous?.legacyPaid||false};
  if(type==='transfer'&&(!data.accountId||!data.toAccountId||data.accountId===data.toAccountId))fail(422,'Escolha contas diferentes para origem e destino.');
  const category=catalogs.find(c=>c.id===data.categoryId),categoryType=type==='expense'?'expense':'income';
  if(category&&category.type!=='both'&&category.type!==categoryType)fail(422,'A categoria não corresponde ao tipo de lançamento.');
  if(previous&&paid(previous)>0&&(amountCents<paid(previous)||type!==previous.type||data.accountId!==previous.accountId||data.toAccountId!==previous.toAccountId||previous.legacyPaid&&amountCents!==previous.amountCents))fail(409,'Estorne as baixas antes de alterar contas, tipo ou reduzir o valor abaixo do realizado.');
  return data;
}
function shiftedDate(date,index){const [year,month,day]=date.split('-').map(Number),first=new Date(Date.UTC(year,month-1+index,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(day,last));return first.toISOString().slice(0,10);}
export function installments(base,count=1,requestId=randomUUID()){
  count=Number(count);if(!Number.isInteger(count)||count<1||count>120||base.amountCents<count)fail(422,'Use de 1 a 120 parcelas, com pelo menos um centavo por parcela.');
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))fail(422,'Identificador da operação inválido.');
  const quotient=Math.floor(base.amountCents/count),remainder=base.amountCents%count;
  return Array.from({length:count},(_,i)=>({...base,id:requestId+'-'+(i+1),amountCents:quotient+(i<remainder?1:0),dueDate:shiftedDate(base.dueDate,i),competenceDate:shiftedDate(base.competenceDate,i),installment:count>1?{groupId:requestId,number:i+1,total:count}:null}));
}
export function settle(previous,input){
  if(previous.canceled||previous.legacyPaid)fail(409,'Este lançamento não permite uma nova baixa.');
  if(!previous.accountId)fail(422,'Edite o lançamento e selecione a conta antes de registrar a baixa.');
  const amountCents=cents(input.amount),date=input.date;
  if(!validDate(date)||date>today())fail(422,'A baixa precisa ter uma data válida, até hoje.');
  if(amountCents>previous.amountCents-paid(previous))fail(422,'O valor da baixa excede o saldo em aberto.');
  if(previous.payments.length>=500)fail(422,'Limite de baixas deste lançamento atingido.');
  return {...previous,payments:[...previous.payments,{id:randomUUID(),amountCents,date,note:text(input.note,500)}]};
}
export function reverse(previous,input){
  const reason=text(input.reason,500);if(reason.length<3)fail(422,'Informe o motivo do estorno.');
  if(previous.legacyPaid&&input.paymentId==='legacy')return {...previous,legacyPaid:false};
  if(!previous.payments.some(p=>p.id===input.paymentId))fail(404,'Baixa não encontrada.');
  return {...previous,payments:previous.payments.filter(p=>p.id!==input.paymentId)};
}
export function migrateLegacy(rows=[]){
  return rows.map(row=>{
    const amountCents=Math.round(Number(row.amount)*100);if(!Number.isSafeInteger(amountCents)||amountCents<=0||!validDate(row.date))fail(409,'Há um lançamento antigo com valor ou data inválidos. Corrija-o antes da migração.');
    return {id:'legacy-'+row.id,title:row.title,type:row.type==='pagar'?'expense':row.type==='comissao'?'commission':'income',amountCents,dueDate:row.date,competenceDate:row.competenceDate||row.date,accountId:'',toAccountId:'',categoryId:'',personId:'',tripId:row.trip||'',document:'',notes:row.notes||'',source:'legacy',externalId:row.id,payments:[],legacyPaid:['Pago','Recebido'].includes(row.status),canceled:false};
  });
}
export function matches(e,f,withDates=true){
  const s=status(e,f.today),date=e[f.basis],q=(f.q||'').toLocaleLowerCase('pt-BR');
  return (!withDates||date>=f.from&&date<=f.to)&&(!f.type||e.type===f.type)&&(!f.status?!e.canceled:f.status==='open'?!e.canceled&&paid(e)<e.amountCents:f.status==='overdue'?!e.canceled&&paid(e)<e.amountCents&&e.dueDate<f.today:s===f.status)&&(!f.accountId||e.accountId===f.accountId||e.toAccountId===f.accountId)&&(!f.categoryId||e.categoryId===f.categoryId)&&(!f.personId||e.personId===f.personId)&&(!f.source||e.source===f.source)&&(!q||[e.title,e.document,e.notes].join(' ').toLocaleLowerCase('pt-BR').includes(q));
}
export function report(rows,catalogs,f){
  const found=rows.filter(r=>matches(r.data||r,f)).sort((a,b)=>(a.data||a)[f.basis].localeCompare((b.data||b)[f.basis])||(a.data||a).id.localeCompare((b.data||b).id));
  const summary={receivable:0,payable:0,received:0,paid:0,overdue:0,legacyUndated:0};
  for(const row of found){const e=row.data||row;if(e.canceled||['transfer','opening'].includes(e.type))continue;const settled=paid(e),remaining=e.amountCents-settled;summary[e.type==='expense'?'payable':'receivable']+=remaining;summary[e.type==='expense'?'paid':'received']+=settled;if(e.dueDate<f.today)summary.overdue+=remaining;if(e.legacyPaid)summary.legacyUndated++;}
  const monthly=new Map(),add=(date,key,value)=>{if(date<f.from||date>f.to)return;const month=date.slice(0,7),row=monthly.get(month)||{month,received:0,paid:0,receivable:0,payable:0};row[key]+=value;monthly.set(month,row);};
  for(const row of rows){const e=row.data||row;if(e.canceled||['transfer','opening'].includes(e.type)||!matches(e,f,false))continue;for(const p of e.payments)add(p.date,e.type==='expense'?'paid':'received',p.amountCents);add(e.dueDate,e.type==='expense'?'payable':'receivable',e.amountCents-paid(e));}
  const balances=catalogs.filter(c=>c.kind==='account').map(c=>{let balance=c.openingCents;for(const row of rows){const e=row.data||row;if(e.canceled||e.type==='opening')continue;for(const p of e.payments)if(p.date>=c.openingDate&&p.date<=f.today){if(e.accountId===c.id)balance+=(e.type==='expense'||e.type==='transfer'?-1:1)*p.amountCents;if(e.type==='transfer'&&e.toAccountId===c.id)balance+=p.amountCents;}}return {id:c.id,balanceCents:balance};});
  return {items:found.slice((f.page-1)*f.pageSize,f.page*f.pageSize).map(row=>({...row.data||row,version:row.version||1})),total:found.length,summary,monthly:[...monthly.values()].sort((a,b)=>a.month.localeCompare(b.month)),balances};
}
