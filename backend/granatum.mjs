import {randomUUID} from 'node:crypto';
import {fail} from './validation.mjs';
import {cents,validDate} from './finance.mjs';
import {databaseError} from './finance-api.mjs';

const id=(kind,value)=>value==null?'':`granatum-${kind}-${value}`;
const integer=value=>{if(!/^\d+$/.test(String(value)))fail(422,'O Granatum retornou um identificador inválido.');return String(value);};
const checked=r=>{databaseError(r.error);return r.data;};
const kinds=['contas','categorias','clientes','fornecedores','centros_custo_lucro','formas_pagamento','tags'];
export function granatumClient(token,fetcher=fetch){
  return async(path,params={})=>{
    if(!/^(contas(?:\/\d+)?|categorias|clientes|fornecedores|centros_custo_lucro|formas_pagamento|tags|lancamentos)$/.test(path))fail(422,'Consulta Granatum inválida.');
    const url=new URL('https://api.granatum.com.br/v1/'+path);url.searchParams.set('access_token',token);
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
    let response;try{response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});}catch{fail(502,'O Granatum não respondeu. A sincronização pode ser retomada.');}
    if(response.status===401||response.status===403)fail(422,'O token não foi aceito pelo Granatum.');
    if(response.status===429)fail(429,'Limite do Granatum atingido. A sincronização será retomada depois.');
    if(!response.ok)fail(502,'Não foi possível consultar o Granatum (HTTP '+response.status+').');
    try{return await response.json();}catch{fail(502,'O Granatum retornou uma resposta inválida.');}
  };
}
function flatten(rows,children){return rows.flatMap(row=>[row,...flatten(row[children]||[],children)]);}
export function normalizeGranatum(raw,syncedAt=new Date().toISOString()){
  const catalogs=[],byKind=kind=>raw.filter(r=>r.kind===kind).map(r=>r.data),accounts=byKind('contas');
  for(const c of accounts)catalogs.push({id:id('account',integer(c.id)),kind:'account',name:c.descricao,archived:c.ativo===false,source:'granatum',externalId:String(c.id),openingCents:0,openingDate:'1900-01-01',reportedBalanceCents:cents(c.saldo,{signed:true,zero:true}),balanceAt:syncedAt});
  for(const c of flatten(byKind('categorias'),'categorias_filhas'))catalogs.push({id:id('category',integer(c.id)),kind:'category',name:c.descricao,archived:c.ativo===false,source:'granatum',externalId:String(c.id),type:Number(c.tipo_categoria_id)===1?'expense':'income',parentId:id('category',c.parent_id)});
  const people=new Map();for(const c of [...byKind('clientes'),...byKind('fornecedores')])people.set(String(c.id),{...people.get(String(c.id)),...c});
  for(const c of people.values())catalogs.push({id:id('person',integer(c.id)),kind:'person',name:c.nome||c.nome_fantasia||'Contato Granatum',archived:c.ativo===false,source:'granatum',externalId:String(c.id),role:c.cliente&&c.fornecedor?'both':c.cliente?'client':'supplier',email:c.email||'',document:c.documento||'',phone:c.telefone||''});
  const refs=new Set(catalogs.map(c=>c.id));
  const rows=new Map();for(const c of byKind('entries')){rows.set(integer(c.id),c);for(const child of c.itens_adicionais||[])if(!rows.has(String(child.id)))rows.set(integer(child.id),{...c,...child,itens_adicionais:[]});}
  const entries=[],done=new Set(),extras=kind=>new Map(flatten(byKind(kind),kind+'_filhos').map(c=>[String(c.id),c.descricao]));
  const centers=extras('centros_custo_lucro'),methods=extras('formas_pagamento'),tags=extras('tags');
  for(const row of rows.values()){
    const key=String(row.id);if(done.has(key))continue;done.add(key);
    const signed=cents(row.valor,{signed:true,zero:true}),amount=Math.abs(signed);
    if(!validDate(row.data_vencimento)||!validDate(row.data_competencia||row.data_vencimento)||row.data_pagamento&&!validDate(row.data_pagamento))fail(422,'Revise as datas do lançamento Granatum '+key+'.');
    let source=row,destination=null,externalId=key,ids=[key];
    if(row.lancamento_transferencia_id){
      const pair=rows.get(String(row.lancamento_transferencia_id));
      if(!pair||String(pair.lancamento_transferencia_id)!==key||cents(pair.valor,{signed:true,zero:true})!==-signed||pair.data_pagamento!==row.data_pagamento)fail(422,'Transferência Granatum '+key+' precisa de conciliação antes da importação.');
      source=signed<0?row:pair;destination=signed<0?pair:row;done.add(String(pair.id));ids=[key,String(pair.id)].sort();externalId='transfer-'+ids.join('-');
    }
    const accountId=id('account',source.conta_id),toAccountId=destination?id('account',destination.conta_id):'';
    if(!refs.has(accountId)||toAccountId&&!refs.has(toAccountId))fail(422,'Conta não encontrada para o lançamento Granatum '+key+'.');
    // Missing archived categories/contacts remain identifiable, without silently attaching another record.
    for(const [field,kind,label]of [['categoria_id','category','Categoria'],['pessoa_id','person','Contato']])if(row[field]&&!refs.has(id(kind,row[field]))){const fallback={id:id(kind,row[field]),kind,name:label+' Granatum #'+row[field],source:'granatum',externalId:String(row[field]),archived:true,...(kind==='category'?{type:'both'}:{role:'both',email:'',document:'',phone:''})};catalogs.push(fallback);refs.add(fallback.id);}
    entries.push({id:id('entry',externalId),title:row.descricao||'Lançamento Granatum',type:destination?'transfer':signed<0?'expense':'income',amountCents:amount,dueDate:row.data_vencimento,competenceDate:row.data_competencia||row.data_vencimento,accountId,toAccountId,categoryId:destination?'':id('category',row.categoria_id),personId:id('person',row.pessoa_id),tripId:'',document:row.documento||'',notes:row.observacao||'',source:'granatum',externalId,granatumIds:ids,payments:row.data_pagamento?[{id:'granatum-payment-'+externalId,amountCents:amount,date:row.data_pagamento,note:'Baixa registrada no Granatum'}]:[],legacyPaid:false,canceled:false,installment:Number(row.total_repeticoes)>1?{groupId:String(row.grupo_id),number:Number(row.numero_repeticao),total:Number(row.total_repeticoes)}:null,granatum:{groupId:row.grupo_id,compoundId:row.lancamento_composto_id,infinite:Boolean(row.infinito),periodicity:row.periodicidade,center:centers.get(String(row.centro_custo_lucro_id))||'',paymentMethod:methods.get(String(row.forma_pagamento_id))||'',tags:(row.tags||[]).map(t=>tags.get(String(t.id))||String(t.id)),attachments:(row.anexos||[]).map(a=>({id:a.id})),modified:row.modified}});
  }
  const dates=entries.map(e=>e.dueDate).sort();
  return {entries,catalogs:[...new Map(catalogs.map(c=>[c.id,c])).values()],stats:{sourceRows:rows.size,entries:entries.length,transfers:entries.filter(e=>e.type==='transfer').length,accounts:accounts.length,from:dates[0]||null,to:dates.at(-1)||null}};
}

export async function granatumStatus(db,wid){
  const row=checked(await db.from('travelpro_granatum').select('enabled,progress,last_sync,last_error,stats,locked_until').eq('workspace_id',wid).maybeSingle());
  if(!row)return {connected:false};return {connected:true,enabled:row.enabled,lastSync:row.last_sync,error:row.last_error,stats:row.stats,running:row.progress?.phase&&row.progress.phase!=='done',phase:row.progress?.phase||'pending'};
}
export async function runGranatum(db,wid,{force=false,budgetMs=35000}={}){
  const lease=randomUUID(),start=Date.now();
  const connection=checked(await db.rpc('travelpro_granatum_claim',{p_workspace:wid,p_lease:lease,p_force:force}));
  if(!connection)return {...await granatumStatus(db,wid),busy:true};
  const get=granatumClient(connection.token),p=connection.progress;
  const commit=async(rows=[])=>checked(await db.rpc('travelpro_granatum_stage',{p_workspace:wid,p_lease:lease,p_progress:p,p_rows:rows}));
  const wrap=(kind,rows)=>rows.map(r=>({kind,id:integer(r.id),data:r}));
  try{
    while(Date.now()-start<budgetMs){
      if(p.phase==='catalogs'){
        const kind=kinds[p.index],rows=await get(kind,{considerar_inativos:true});if(!Array.isArray(rows))fail(502,'Lista Granatum inválida.');
        if(kind==='contas')p.accounts=rows.map(a=>String(a.id));p.index++;
        if(p.index>=kinds.length){p.phase='entries';p.index=0;p.offset=0;p.expected=null;}
        await commit(wrap(kind,rows));
      }else if(p.phase==='entries'){
        if(p.index>=p.accounts.length){p.phase='deletions';p.index=0;p.offset=0;await commit();continue;}
        const account=p.accounts[p.index];
        if(p.expected==null){const count=await get('lancamentos',{conta_id:account,tipo_view:'count'});p.expected=Number(count[0]);if(!Number.isSafeInteger(p.expected)||p.expected<0)fail(502,'Contagem Granatum inválida.');await commit();}
        else{
          const rows=await get('lancamentos',{conta_id:account,limit:500,start:p.offset});if(!Array.isArray(rows))fail(502,'Lista de lançamentos Granatum inválida.');
          p.offset+=rows.length;p.loaded=(p.loaded||0)+rows.length;
          if(rows.length<500){if(p.offset!==p.expected)fail(409,'O Granatum mudou durante a leitura. Reinicie a sincronização.');p.index++;p.offset=0;p.expected=null;}
          if(p.loaded>100000)fail(422,'Esta base precisa de uma importação assistida acima de 100 mil registros.');await commit(wrap('entries',rows));
        }
      }else if(p.phase==='deletions'){
        if(!connection.last_sync||p.index>=p.accounts.length){p.phase='apply';await commit();continue;}
        const since=new Date(new Date(connection.last_sync).getTime()-86400000).toISOString().slice(0,19).replace('T',' ');
        const rows=await get('lancamentos',{conta_id:p.accounts[p.index],excluido_apos:since,limit:500,start:p.offset});if(!Array.isArray(rows))fail(502,'Lista de exclusões Granatum inválida.');
        p.offset+=rows.length;if(rows.length<500){p.index++;p.offset=0;}await commit(wrap('deleted',rows));
      }else if(p.phase==='apply'){
        const raw=[];for(let offset=0;;offset+=1000){const page=checked(await db.from('travelpro_granatum_raw').select('kind,id,data').eq('workspace_id',wid).eq('run_id',p.runId).order('kind').order('id').range(offset,offset+999));raw.push(...page);if(page.length<1000)break;}
        const sourceRows=raw.filter(r=>r.kind==='entries');if(sourceRows.length!==p.loaded)fail(409,'A paginação do Granatum mudou. Reinicie para evitar registros ausentes.');
        const snapshot=normalizeGranatum(raw,p.startedAt);
        const liveIds=new Set(sourceRows.map(r=>r.id));
        checked(await db.rpc('travelpro_granatum_apply',{p_workspace:wid,p_lease:lease,p_entries:snapshot.entries,p_catalogs:snapshot.catalogs,p_deleted:raw.filter(r=>r.kind==='deleted'&&!liveIds.has(r.id)).map(r=>r.id),p_stats:snapshot.stats}));
        return await granatumStatus(db,wid);
      }else break;
      await new Promise(r=>setTimeout(r,1700));
    }
    checked(await db.rpc('travelpro_granatum_release',{p_workspace:wid,p_lease:lease,p_error:''}));
  }catch(error){await db.rpc('travelpro_granatum_release',{p_workspace:wid,p_lease:lease,p_error:error.status?error.message:'Não foi possível concluir a sincronização. Tente novamente.'});throw error;}
  return granatumStatus(db,wid);
}
