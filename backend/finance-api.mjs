import {randomUUID} from 'node:crypto';
import {fail} from './validation.mjs';
import * as finance from './finance.mjs';
import {enrichEntries,insightReport,operationMetadata,csvDocument} from './finance-insights.mjs';

export function databaseError(error){
  if(!error)return;
  if(['PGRST205','PGRST202','42P01'].includes(error.code))fail(503,'O novo financeiro ainda está sendo preparado. Tente novamente em instantes.');
  if(['40001','PT409'].includes(error.code))fail(409,'Este registro foi alterado em outro acesso. Atualize os dados antes de continuar.');
  if(error.code==='23505')fail(409,'Este registro já existe. Atualize os dados antes de repetir a operação.');
  console.error('TravelPro finance:',error.code);fail(500,'Não foi possível concluir a operação financeira.');
}
const result=response=>{databaseError(response.error);return response.data;};
export function supabaseRepository(a){
  const table=name=>a.db.from('travelpro_finance_'+name);
  return {
    async entries(){const rows=[];for(let offset=0;offset<=50000;offset+=1000){const page=result(await table('entries').select('data,version').eq('workspace_id',a.wid).order('id').range(offset,offset+999));rows.push(...page.map(r=>({...r.data,version:r.version})));if(rows.length>50000)fail(422,'O relatório excede 50 mil registros. Solicite uma exportação assistida.');if(page.length<1000)break;}return rows;},
    async ready(){return Boolean(result(await table('migrations').select('workspace_id').eq('workspace_id',a.wid).maybeSingle()));},
    async get(id,kind='entries'){const row=result(await table(kind).select('data,version').eq('workspace_id',a.wid).eq('id',id).maybeSingle());if(!row)fail(404,'Registro financeiro não encontrado.');return {...row.data,version:row.version};},
    async catalogs(){const rows=[];for(let offset=0;offset<=5000;offset+=1000){const page=result(await table('catalogs').select('data,version').eq('workspace_id',a.wid).order('id').range(offset,offset+999));rows.push(...page.map(r=>({...r.data,version:r.version})));if(rows.length>5000)fail(422,'Limite de cadastros financeiros atingido.');if(page.length<1000)break;}return rows;},
    async report(f){return result(await a.db.rpc('travelpro_finance_report',{p_workspace:a.wid,p_filters:f}));},
    async write(action,id,version,data,reason=''){return result(await a.db.rpc('travelpro_finance_write',{p_workspace:a.wid,p_user:a.user.id,p_action:action,p_id:id,p_version:version,p_data:data,p_reason:reason}));},
    async history(id){return result(await table('events').select('id,action,reason,previous,next,created_at').eq('workspace_id',a.wid).eq('entry_id',id).order('id',{ascending:false}).limit(50));}
  };
}

export async function handleFinance({path,method,input={},query={},repo,getWorkspace,manager}){
  if(!await repo.ready()){
    const old=await getWorkspace();await repo.write('bootstrap','migration',old.version,finance.migrateLegacy(old.state.transactions));
  }
  const requireManager=()=>{if(!manager)fail(403,'Somente o responsável pela agência pode alterar cadastros, cancelar ou estornar.');};
  const context=async()=>{const [catalogs,workspace,rows]=await Promise.all([repo.catalogs(),getWorkspace(),repo.entries()]);return {catalogs,state:workspace.state,rows:enrichEntries(rows,catalogs,workspace.state)};};
  if(path==='finance/insights'&&method==='GET'){
    const {state,catalogs,rows}=await context(),f={...finance.filters(query),allTime:query.allTime==='1'};
    const report=insightReport(state,catalogs,rows,f);
    if(query.export){const val=v=>v===null?'A informar':(v/100).toFixed(2);return {csv:query.export==='clients'?csvDocument(['Cliente','Compras no período','Compras no histórico','Volume vendido','Receita conhecida da agência','Última compra / período','Indicações','Origem','Indicado por','Relacionamento'],report.clients.map(c=>[c.name,c.purchases,c.lifetimePurchases,val(c.volumeCents),val(c.revenueCents),c.lastPurchase,c.referrals,c.origin,c.referredByName,c.relationship])):csvDocument(['Viagem','Cliente','Status','Data','Base da data','Volume vendido','Comissão','Consultoria','Custos diretos','Receita da agência','Resultado antes de despesas gerais e tributos'],report.operations.map(o=>[o.title,o.clientName,o.status,o.date,o.dateBasis,...['volumeCents','commissionCents','consultancyCents','costsCents','revenueCents','resultCents'].map(k=>val(o[k]))]))};}
    return report;
  }
  if(path.startsWith('finance/operations/')&&method==='PUT'){
    const tripId=decodeURIComponent(path.slice('finance/operations/'.length)),{state,catalogs}=await context(),t=state.trips.find(t=>t.id===tripId);
    if(!t)fail(404,'Viagem não encontrada.');
    const previous=catalogs.find(c=>c.kind==='operation'&&c.tripId===tripId);
    if(Number(input.version)!==(previous?.version||0))fail(409,'A operação mudou. Atualize antes de salvar.');
    const item=operationMetadata(input,t,previous);return repo.write('catalog',item.id,previous?.version||0,item,'Valores gerenciais da viagem revisados.');
  }
  if(/^finance\/entries\/[^/]+\/link$/.test(path)&&method==='PUT'){
    const entryId=decodeURIComponent(path.split('/')[2]);await repo.get(entryId);
    const {state,catalogs}=await context(),previous=catalogs.find(c=>c.kind==='entry-link'&&c.entryId===entryId);
    if(Number(input.version)!==(previous?.version||0))fail(409,'O vínculo mudou. Atualize antes de salvar.');
    const tripId=String(input.tripId||''),t=state.trips.find(t=>t.id===tripId),clientId=String(input.clientId||t?.client||'');
    if(tripId&&!t||clientId&&!state.clients.some(c=>c.id===clientId)||t&&clientId!==t.client)fail(422,'Selecione cliente e viagem correspondentes.');
    const serviceType=input.serviceType||'';if(!['','commission','consultancy'].includes(serviceType))fail(422,'Natureza inválida.');
    const entry=await repo.get(entryId);if(serviceType&&!['income','commission'].includes(entry.type))fail(422,'Comissão e consultoria precisam ser recebimentos.');
    const item={id:'link-'+entryId,kind:'entry-link',name:entry.title,entryId,tripId,clientId,serviceType,archived:false};
    return repo.write('catalog',item.id,previous?.version||0,item,'Vínculo gerencial; lançamento de origem preservado.');
  }
  if(path==='finance'&&method==='GET'){
    const f=finance.filters(query),catalogs=await repo.catalogs(),{state}=await getWorkspace();
    const extended=f.tripId||f.clientId||['consultancy','commission'].includes(f.type);
    const data=extended?finance.report(enrichEntries(await repo.entries(),catalogs,state),catalogs,f):await repo.report(f);
    data.items=enrichEntries(data.items,catalogs,state);
    for(const account of catalogs.filter(c=>c.kind==='account'&&c.source==='granatum')){const balance=data.balances.find(b=>b.id===account.id);if(balance)balance.balanceCents=account.reportedBalanceCents;}
    return {...data,catalogs,clients:state.clients.map(c=>({id:c.id,name:c.name})),filters:f,manager,today:f.today};
  }
  if(path==='finance/export'&&method==='GET'){
    const {state,catalogs,rows}=await context(),f=finance.filters(query),filtered=rows.filter(r=>finance.matches(r,f)).sort((a,b)=>a[f.basis].localeCompare(b[f.basis])||a.id.localeCompare(b.id));
    const name=id=>catalogs.find(c=>c.id===id)?.name||'';
    return {csv:csvDocument(['ID','Descrição','Tipo','Valor','Baixado','Em aberto','Vencimento','Competência','Situação','Conta','Conta destino','Categoria','Cliente/Fornecedor','Cliente','Viagem','Origem','ID externo','Documento','Observações'],filtered.map(e=>[e.id,e.title,e.serviceType==='consultancy'?'Consultoria':e.serviceType==='commission'?'Comissão':e.type,((e.type==='opening'?e.openingSignedCents:e.amountCents)/100).toFixed(2),(finance.paid(e)/100).toFixed(2),((e.canceled?0:e.amountCents-finance.paid(e))/100).toFixed(2),e.dueDate,e.competenceDate,finance.status(e),name(e.accountId),name(e.toAccountId),name(e.categoryId),name(e.personId),state.clients.find(c=>c.id===e.clientId)?.name||'',state.trips.find(t=>t.id===e.tripId)?.title||'',e.source,e.externalId,e.document,e.notes]))};
  }

  if(path==='finance/catalogs'&&method==='POST'){
    requireManager();const data=finance.catalog(input),catalogs=await repo.catalogs();
    if(catalogs.some(c=>c.kind===data.kind&&!c.archived&&c.name.toLowerCase()===data.name.toLowerCase()))fail(409,'Já existe um cadastro ativo com esse nome.');
    return {id:data.id,...await repo.write('catalog',data.id,0,data)};
  }
  const parts=path.split('/'),id=parts[2];
  if(parts[1]==='catalogs'&&id&&method==='PUT'){
    requireManager();const previous=await repo.get(id,'catalogs');checkVersion(input,previous);
    if(!['account','category','person'].includes(previous.kind))fail(422,'Use a tela da operação para editar estes dados.');
    if(previous.source==='granatum')fail(409,'Este cadastro é sincronizado. Faça a alteração no Granatum.');
    const data=input.archive!==undefined?{...previous,archived:Boolean(input.archive)}:finance.catalog(input,previous);delete data.version;
    return repo.write('catalog',id,previous.version,data);
  }
  if(path==='finance/entries'&&method==='POST'){
    const catalogs=await repo.catalogs(),base=finance.entry(input,catalogs);await checkTrip(base,getWorkspace);
    const requestId=input.requestId||randomUUID(),rows=finance.installments(base,input.installments||1,requestId);
    return repo.write('create',requestId,0,rows);
  }
  if(parts[1]==='entries'&&id){
    if(parts[3]==='history'&&method==='GET')return {events:await repo.history(id)};
    const previous=await repo.get(id);
    if(method==='GET'){const catalogs=await repo.catalogs(),{state}=await getWorkspace();return enrichEntries([previous],catalogs,state)[0];}
    checkVersion(input,previous);let data,action=parts[3]||'edited';
    if(previous.source==='granatum')fail(409,'Este lançamento é sincronizado. Faça a alteração no Granatum.');
    if(method==='PUT'&&parts.length===3){data=finance.entry(input,await repo.catalogs(),previous);await checkTrip(data,getWorkspace);}
    else if(method==='POST'&&action==='payments')data=finance.settle(previous,input);
    else if(method==='POST'&&action==='reverse'){requireManager();data=finance.reverse(previous,input);}
    else if(method==='POST'&&['cancel','restore'].includes(action)){
      requireManager();if((input.reason||'').trim().length<3)fail(422,'Informe o motivo da alteração.');
      if(action==='cancel'&&finance.paid(previous)>0)fail(409,'Estorne as baixas antes de cancelar o lançamento.');data={...previous,canceled:action==='cancel'};
    }else fail(405,'Operação financeira não permitida.');
    delete data.version;return repo.write(action,id,previous.version,data,String(input.reason||'').slice(0,500));
  }
  fail(404,'Operação financeira não encontrada.');
}
function checkVersion(input,previous){if(!Number.isInteger(input.version)||input.version!==previous.version)fail(409,'Este registro mudou. Atualize antes de continuar.');}
async function checkTrip(data,getWorkspace){const {state}=await getWorkspace(),trip=state.trips.find(t=>t.id===data.tripId);if(data.tripId&&!trip||data.clientId&&!state.clients.some(c=>c.id===data.clientId)||trip&&data.clientId&&trip.client!==data.clientId)fail(422,'Confira o cliente e a viagem vinculados.');}
