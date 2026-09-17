import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import * as f from '../backend/finance.mjs';
const account={id:'bank-a',kind:'account',name:'Banco A',openingCents:10000,openingDate:'2026-01-01',archived:false};
const other={...account,id:'bank-b',name:'Banco B',openingCents:0};
const base=()=>f.entry({title:'Serviço',type:'income',amount:'100.00',dueDate:'2026-01-31',accountId:account.id},[account,other]);
test('finance uses exact cents and splits installments without losing money',()=>{
 assert.equal(f.cents('123,45'),12345);assert.throws(()=>f.cents('12.345'));assert.throws(()=>f.cents('-1'));assert.throws(()=>f.cents('1e3'));
 const rows=f.installments(base(),3,'request-test-00001');assert.deepEqual(rows.map(r=>r.amountCents),[3334,3333,3333]);assert.deepEqual(rows.map(r=>r.dueDate),['2026-01-31','2026-02-28','2026-03-31']);assert.equal(rows.reduce((n,r)=>n+r.amountCents,0),10000);
});
test('partial payments, reversals and transfers preserve accounting invariants',()=>{
 let e=f.settle(base(),{amount:'40',date:'2026-02-02'});assert.equal(f.paid(e),4000);assert.equal(f.status(e),'partial');assert.throws(()=>f.settle(e,{amount:'61',date:'2026-02-03'}));
 assert.throws(()=>f.entry({...e,amount:'100',accountId:other.id},[account,other],e));
 e=f.reverse(e,{paymentId:e.payments[0].id,reason:'Registro duplicado'});assert.equal(f.paid(e),0);
 assert.throws(()=>f.entry({title:'Transferência',type:'transfer',amount:'10',dueDate:'2026-01-01',accountId:account.id,toAccountId:account.id},[account]));
});
test('legacy paid entries keep their status without inventing a payment date',()=>{
 const [e]=f.migrateLegacy([{id:'old',title:'Antigo',type:'receber',amount:50,date:'2026-01-01',status:'Recebido'}]);assert.equal(f.paid(e),5000);assert.equal(e.payments.length,0);assert.equal(e.legacyPaid,true);
});
test('Postgres migration, reports, isolation, optimistic writes and idempotency',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table workspaces(id uuid primary key);
 create table travelpro_state(workspace_id uuid primary key,data jsonb,version integer,updated_at timestamptz);
 create table travelpro_audit(workspace_id uuid,user_id uuid,action text);
 insert into workspaces values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
 insert into travelpro_state values('00000000-0000-0000-0000-000000000001','{"transactions":[]}',1,now());`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260917_finance.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20260918_finance_conflicts.sql',import.meta.url),'utf8'));
 const wid='00000000-0000-0000-0000-000000000001',otherWid='00000000-0000-0000-0000-000000000002';
 const write=async(action,id,version,data)=>{const r=await db.query('select travelpro_finance_write($1,null,$2,$3,$4,$5::jsonb) result',[wid,action,id,version,JSON.stringify(data)]);return r.rows[0].result;};
 await write('bootstrap','migration',1,[]);
 await write('catalog',account.id,0,account);await write('catalog',other.id,0,other);
 const income=f.settle(base(),{amount:'40',date:'2026-02-02'});
 const transfer=f.settle(f.entry({title:'Entre contas',type:'transfer',amount:'20',accountId:account.id,toAccountId:other.id,dueDate:'2026-02-03'},[account,other]),{amount:'20',date:'2026-02-03'});
 const rows=[income,transfer];await write('create','create-test-000001',0,rows);await write('create','create-test-000001',0,rows);
 assert.equal((await db.query('select count(*)::integer n from travelpro_finance_entries')).rows[0].n,2);
 const filters={...f.filters({from:'2026-01-01',to:'2026-03-31'}),today:'2026-09-17'};
 const data=(await db.query('select travelpro_finance_report($1,$2::jsonb) result',[wid,JSON.stringify(filters)])).rows[0].result;
 const local=f.report(rows,[account,other],filters);assert.deepEqual(data.summary,local.summary);assert.deepEqual(data.monthly,local.monthly);assert.deepEqual(data.balances.sort((a,b)=>a.id.localeCompare(b.id)),local.balances);assert.equal(data.summary.received,4000);assert.equal(data.summary.receivable,6000);assert.equal(data.total,2);
 const isolated=(await db.query('select travelpro_finance_report($1,$2::jsonb) result',[otherWid,JSON.stringify(filters)])).rows[0].result;assert.equal(isolated.total,0);
 await write('edited',income.id,1,{...income,title:'Atualizado'});await assert.rejects(write('edited',income.id,1,income),e=>e.code==='PT409');
 await assert.rejects(db.query('select travelpro_save_state($1,1,$2::jsonb,null)',[wid,JSON.stringify({transactions:[{id:'late'}]})]),e=>e.code==='PT409');
 assert.equal((await db.query("select has_table_privilege('anon','travelpro_finance_entries','select') allowed")).rows[0].allowed,false);
});
