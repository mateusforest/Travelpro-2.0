import {randomUUID} from 'node:crypto';
import {fail} from './validation.mjs';
import * as finance from './finance.mjs';

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
  if(path==='finance'&&method==='GET'){
    const f=finance.filters(query),[data,catalogs]=await Promise.all([repo.report(f),repo.catalogs()]);
    return {...data,catalogs,filters:f,manager,today:f.today};
  }
  if(path==='finance/export'&&method==='GET'){
    const f={...finance.filters(query),page:1,pageSize:500},rows=[];let page=await repo.report(f);
    if(page.total>20000)fail(422,'Selecione um período com até 20 mil lançamentos para exportar.');
    const expected=page.total;rows.push(...page.items);
    while(rows.length<expected){page=await repo.report({...f,page:++f.page});if(!page.items.length)fail(409,'Os dados mudaram durante a exportação. Tente novamente.');rows.push(...page.items);}
    if(new Set(rows.map(r=>r.id)).size!==rows.length||rows.length!==expected)fail(409,'Os dados mudaram durante a exportação. Tente novamente.');
    const catalogs=await repo.catalogs(),name=id=>catalogs.find(c=>c.id===id)?.name||'';
    const csv=value=>'"'+String(value??'').replace(/^[\s\uFEFF]*[=+\-@]/,match=>"'"+match).replaceAll('"','""')+'"';
    const heading=['ID','Descrição','Tipo','Valor','Baixado','Em aberto','Vencimento','Competência','Situação','Conta','Conta destino','Categoria','Cliente/Fornecedor','Origem','ID externo','Documento','Observações'];
    return {csv:'\uFEFF'+[heading,...rows.map(e=>[e.id,e.title,e.type,(e.amountCents/100).toFixed(2),(finance.paid(e)/100).toFixed(2),((e.amountCents-finance.paid(e))/100).toFixed(2),e.dueDate,e.competenceDate,finance.status(e),name(e.accountId),name(e.toAccountId),name(e.categoryId),name(e.personId),e.source,e.externalId,e.document,e.notes])].map(row=>row.map(csv).join(';')).join('\r\n')};
  }
  if(path==='finance/catalogs'&&method==='POST'){
    requireManager();const data=finance.catalog(input),catalogs=await repo.catalogs();
    if(catalogs.some(c=>c.kind===data.kind&&!c.archived&&c.name.toLowerCase()===data.name.toLowerCase()))fail(409,'Já existe um cadastro ativo com esse nome.');
    return {id:data.id,...await repo.write('catalog',data.id,0,data)};
  }
  const parts=path.split('/'),id=parts[2];
  if(parts[1]==='catalogs'&&id&&method==='PUT'){
    requireManager();const previous=await repo.get(id,'catalogs');checkVersion(input,previous);
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
    if(method==='GET')return previous;
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
async function checkTrip(data,getWorkspace){if(data.tripId&&!(await getWorkspace()).state.trips.some(t=>t.id===data.tripId))fail(422,'Viagem vinculada não encontrada.');}
