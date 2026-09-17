// Shared HTTP contract, exercised against SQLite and the real Supabase adapter.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function verifyFinance(a,b){
 const period='?from=2026-01-01&to=2026-12-31';
 const call=async(path,method='GET',body)=>{const r=await a.call('/finance'+path,method,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 const initial=await call(period);assert.ok(Array.isArray(initial.catalogs));
 const account=await call('/catalogs','POST',{kind:'account',name:'Banco teste',openingAmount:'100',openingDate:'2026-01-01'});
 const other=await call('/catalogs','POST',{kind:'account',name:'Caixa teste',openingAmount:'0',openingDate:'2026-01-01'});
 const requestId=randomUUID(),payload={requestId,title:'Recebimento teste',type:'income',amount:'100',dueDate:'2026-01-31',competenceDate:'2026-01-31',accountId:account.id,installments:3};
 assert.equal((await call('/entries','POST',payload)).count,3);
 assert.equal((await call('/entries','POST',payload)).count,3);
 let list=await call(period+'&q=Recebimento');assert.equal(list.total,3);assert.deepEqual(list.items.map(e=>e.amountCents),[3334,3333,3333]);
 const id=requestId+'-1';let e=await call('/entries/'+id);
 assert.equal((await b.call('/finance/entries/'+id)).status,404);
 await call('/entries/'+id+'/payments','POST',{version:e.version,amount:'10',date:'2026-02-01'});
 assert.equal((await a.call('/finance/entries/'+id+'/payments','POST',{version:e.version,amount:'10',date:'2026-02-01'})).status,409);
 e=await call('/entries/'+id);assert.equal(e.payments.length,1);
 assert.equal((await a.call('/finance/entries/'+id+'/payments','POST',{version:e.version,amount:'24',date:'2026-02-01'})).status,422);
 list=await call(period+'&q=Recebimento');assert.equal(list.summary.received,1000);assert.equal(list.summary.receivable,9000);assert.equal(list.monthly.find(m=>m.month==='2026-02').received,1000);
 const transferId=randomUUID();await call('/entries','POST',{requestId:transferId,title:'Transferencia teste',type:'transfer',amount:'20',dueDate:'2026-02-02',accountId:account.id,toAccountId:other.id});
 await call('/entries/'+transferId+'-1/payments','POST',{version:1,amount:'20',date:'2026-02-02'});
 list=await call(period);assert.equal(list.balances.find(c=>c.id===account.id).balanceCents,9000);assert.equal(list.balances.find(c=>c.id===other.id).balanceCents,2000);
 const exportFile=await call('/export'+period);assert.ok(exportFile.csv.includes('Recebimento teste'));
 await call('/entries/'+id+'/reverse','POST',{version:e.version,paymentId:e.payments[0].id,reason:'Teste de estorno'});
 e=await call('/entries/'+id);assert.equal(e.payments.length,0);
 await call('/entries/'+id+'/cancel','POST',{version:e.version,reason:'Teste de cancelamento'});
 assert.ok((await call('/entries/'+id)).canceled);
 assert.ok((await call('/entries/'+id+'/history')).events.length>=4);
 const state=(await a.call('/workspace')).data;
 const modified=structuredClone(state.state);modified.transactions.push({id:'late',title:'Late',amount:1,date:'2026-01-01',type:'receber',status:'Pendente',trip:''});
 assert.equal((await a.call('/workspace','PUT',{state:modified,version:state.version})).status,409);
 assert.equal((await a.call('/workspace','PUT',{state:state.state,version:state.version})).status,200);
}
