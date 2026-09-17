import {createClient} from '@supabase/supabase-js';
import {normalizeGranatum,granatumStatus} from '../backend/granatum.mjs';
import {handleFinance,supabaseRepository} from '../backend/finance-api.mjs';
import assert from 'node:assert/strict';
process.loadEnvFile('.env');
const wid=process.argv[2];if(!wid)throw Error('Workspace ID required.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const checked=r=>{if(r.error)throw Error('Database check failed: '+r.error.code);return r.data;};
const connection=checked(await db.from('travelpro_granatum').select('progress').eq('workspace_id',wid).single());
const raw=[];for(let offset=0;;offset+=1000){const page=checked(await db.from('travelpro_granatum_raw').select('kind,id,data').eq('workspace_id',wid).eq('run_id',connection.progress.runId).order('kind').order('id').range(offset,offset+999));raw.push(...page);if(page.length<1000)break;}
const expected=normalizeGranatum(raw,connection.progress.startedAt),saved=[];
for(let offset=0;;offset+=1000){const page=checked(await db.from('travelpro_finance_entries').select('data').eq('workspace_id',wid).eq('data->>source','granatum').order('id').range(offset,offset+999));saved.push(...page.map(r=>r.data));if(page.length<1000)break;}
assert.equal(saved.length,expected.entries.length);
const byId=new Map(saved.map(e=>[e.id,e]));for(const e of expected.entries)assert.deepEqual(byId.get(e.id),e);
const openingIds=new Set(raw.filter(r=>r.kind==='account-details').flatMap(r=>(r.data.lancamentos||[]).map(e=>String(e.id))));
const totals={income:0,expense:0,transfer:0};for(const r of raw.filter(r=>r.kind==='entries'&&!openingIds.has(r.id))){const amount=Math.round(Number(r.data.valor)*100);totals[r.data.lancamento_transferencia_id?'transfer':amount<0?'expense':'income']+=amount;}
assert.equal(totals.transfer,0);assert.equal(totals.income,saved.filter(e=>e.type==='income').reduce((s,e)=>s+e.amountCents,0));assert.equal(-totals.expense,saved.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amountCents,0));
const report=await handleFinance({path:'finance',method:'GET',query:{from:expected.stats.from,to:expected.stats.to,source:'granatum'},repo:supabaseRepository({db,wid,user:{id:null}}),getWorkspace:()=>{throw Error('Unexpected legacy migration');},manager:true});
assert.equal(report.total,expected.stats.entries);for(const account of expected.catalogs.filter(c=>c.kind==='account'))assert.equal(report.balances.find(c=>c.id===account.id).balanceCents,account.reportedBalanceCents);
console.log(JSON.stringify({verified:true,records:saved.length,transfers:expected.stats.transfers,totalsMatch:true,balancesMatch:true,status:await granatumStatus(db,wid)}));
