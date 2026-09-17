import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {normalizeGranatum,granatumClient} from '../backend/granatum.mjs';
import {report,filters} from '../backend/finance.mjs';
const source=(id,valor,extra={})=>({id,valor,descricao:'Imported',conta_id:1,data_vencimento:'2026-01-10',data_pagamento:'2026-01-11',data_competencia:'2026-01-01',itens_adicionais:[],...extra});
const raw=()=>[{kind:'contas',data:{id:1,descricao:'A',ativo:true,saldo:'30.00'}},{kind:'contas',data:{id:2,descricao:'B',ativo:true,saldo:'20.00'}},...[
 source(1,'100.00'),source(2,'-20.00',{lancamento_transferencia_id:3}),source(3,'20.00',{conta_id:2,lancamento_transferencia_id:2}),
 source(4,'-50.00',{data_pagamento:null,lancamento_composto_id:99,itens_adicionais:[{id:5,valor:'-10.00',categoria_id:4}]}),source(5,'-10.00',{data_pagamento:null,categoria_id:4,lancamento_composto_id:99})
].map(data=>({kind:'entries',data}))];
test('Granatum maps transfers once, deduplicates compound children and preserves unpaid future entries',()=>{
 const result=normalizeGranatum(raw());assert.equal(result.entries.length,4);assert.equal(result.stats.sourceRows,5);assert.equal(result.stats.transfers,1);
 const transfer=result.entries.find(e=>e.type==='transfer');assert.equal(transfer.accountId,'granatum-account-1');assert.equal(transfer.toAccountId,'granatum-account-2');assert.equal(transfer.amountCents,2000);
 assert.equal(result.entries.find(e=>e.externalId==='4').payments.length,0);assert.equal(result.entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amountCents,0),6000);
 assert.throws(()=>normalizeGranatum(raw().filter(r=>r.data.id!==3)),/conciliação/);
});
test('Granatum transport only reads the provider, suppresses credential-bearing errors and rejects redirects',async()=>{
 let seen;const get=granatumClient('test-secret',async(url,options)=>{seen={url,options};return Response.json([]);});await get('contas');assert.equal(seen.options.method,'GET');assert.equal(seen.options.redirect,'error');assert.equal(seen.url.origin,'https://api.granatum.com.br');
 await assert.rejects(get('https://evil.example'),/inválida/);
 const broken=granatumClient('test-secret',()=>{throw new Error('url with test-secret');});await assert.rejects(broken('contas'),e=>!e.message.includes('test-secret'));
});
const opening={kind:'account-details',data:{id:1,lancamentos:[{id:1,valor:'100.00',data_pagamento:'2026-01-11'}]}};
test('Granatum opening balances do not inflate revenue, cashflow or account balance',()=>{
 const data=normalizeGranatum([...raw(),opening]),result=report(data.entries,data.catalogs,filters({from:'2026-01-01',to:'2026-01-31'}));
 assert.equal(data.entries.find(e=>e.externalId==='1').type,'opening');assert.equal(result.summary.received,0);assert.equal(result.monthly[0].received,0);assert.equal(result.balances.find(b=>b.id==='granatum-account-1').balanceCents,8000);
});
test('Granatum SQL keeps secrets private, leases exclusive and import atomic/idempotent',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table workspaces(id uuid primary key,type text);
 create table travelpro_state(workspace_id uuid primary key,data jsonb,version integer,updated_at timestamptz);
 create table travelpro_audit(workspace_id uuid,user_id uuid,action text);
 create schema vault;create table vault.secrets(id uuid primary key default gen_random_uuid(),name text,decrypted_secret text);
 create view vault.decrypted_secrets as select * from vault.secrets;
 create function vault.create_secret(s text,n text,d text) returns uuid language sql as $$insert into vault.secrets(name,decrypted_secret) values(n,s) returning id$$;
 insert into workspaces values('00000000-0000-0000-0000-000000000001','operations');
 insert into travelpro_state values('00000000-0000-0000-0000-000000000001','{"transactions":[]}',1,now());`);
 for(const file of ['20260917_finance.sql','20260918_finance_conflicts.sql','20260919_granatum.sql','20260921_granatum_opening.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 const wid='00000000-0000-0000-0000-000000000001',lease='00000000-0000-0000-0000-000000000003';
 await db.query("select travelpro_finance_write($1,null,'bootstrap','migration',1,'[]')",[wid]);
 await db.query('select travelpro_granatum_connect($1,$2)',[wid,'test-token-only-not-real-12345']);
 let claim=(await db.query('select travelpro_granatum_claim($1,$2,true) c',[wid,lease])).rows[0].c;assert.equal(claim.token,'test-token-only-not-real-12345');
 assert.equal((await db.query('select travelpro_granatum_claim($1,$2,true) c',[wid,lease])).rows[0].c,null);
 const progress={...claim.progress,phase:'apply'};await db.query('select travelpro_granatum_stage($1,$2,$3::jsonb,$4::jsonb)',[wid,lease,JSON.stringify(progress),JSON.stringify([{kind:'entries',id:'1',data:source(1,'100')}])]);
 const data=normalizeGranatum([...raw(),opening],'2026-01-01T00:00:00Z');
 const apply=deleted=>db.query('select travelpro_granatum_apply($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb)',[wid,lease,JSON.stringify(data.entries),JSON.stringify(data.catalogs),JSON.stringify(deleted),JSON.stringify(data.stats)]);
 await apply([]);assert.equal((await db.query('select count(*)::int n from travelpro_finance_entries')).rows[0].n,4);
 const sqlReport=(await db.query('select travelpro_finance_report($1,$2::jsonb) r',[wid,JSON.stringify(filters({from:'2026-01-01',to:'2026-01-31'}))])).rows[0].r;
 assert.equal(sqlReport.summary.received,0);assert.equal(sqlReport.monthly[0].received,0);assert.equal(sqlReport.balances.find(b=>b.id==='granatum-account-1').balanceCents,8000);
 const eventCount=(await db.query('select count(*)::int n from travelpro_finance_events')).rows[0].n;
 claim=(await db.query('select travelpro_granatum_claim($1,$2,true) c',[wid,lease])).rows[0].c;
 await db.query('select travelpro_granatum_stage($1,$2,$3::jsonb,$4::jsonb)',[wid,lease,JSON.stringify({...claim.progress,phase:'apply'}),'[]']);
 await apply([]);assert.equal((await db.query('select count(*)::int n from travelpro_finance_events')).rows[0].n,eventCount);
 claim=(await db.query('select travelpro_granatum_claim($1,$2,true) c',[wid,lease])).rows[0].c;
 await db.query('select travelpro_granatum_stage($1,$2,$3::jsonb,$4::jsonb)',[wid,lease,JSON.stringify({...claim.progress,phase:'apply'}),'[]']);
 await apply(['2']);assert.equal((await db.query("select (data->>'canceled')::boolean canceled from travelpro_finance_entries where data->>'type'='transfer'")).rows[0].canceled,true);
 assert.equal((await db.query("select has_function_privilege('anon','travelpro_granatum_claim(uuid,uuid,boolean)','execute') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_table_privilege('authenticated','travelpro_granatum_raw','select') allowed")).rows[0].allowed,false);
});
