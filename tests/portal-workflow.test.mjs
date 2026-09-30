import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/portal-workflow.js';
const {category}=globalThis.TravelWorkflow;
test('trips distinguish sales, confirmed, issued and calendar phases without mutation',()=>{
  const date='2026-09-30',base={start:'2026-10-02',end:'2026-10-10'};
  assert.equal(category({...base,status:'Em cotação'},date),null);
  assert.equal(category({...base,status:'Confirmada'},date),'confirmadas');
  const issued={...base,status:'Confirmada',sales:{fulfillment:{reservation:'confirmed',payment:'paid',emission:'issued'}}};const copy=structuredClone(issued);
  assert.equal(category(issued,date),'emitidas');assert.deepEqual(issued,copy);
  assert.equal(category({...issued,start:'2026-09-30'},date),'andamento');
  assert.equal(category({...issued,start:'2026-09-01',end:'2026-09-29'},date),'finalizadas');
  assert.equal(category({...issued,start:'2026-09-01',end:date},date),'andamento');
  assert.equal(category({...issued,status:'Cancelada'},date),null);
  assert.equal(category({...base,status:'Finalizada'},date),'finalizadas');
  assert.equal(category({...base,status:'Em viagem'},date),'andamento');
  assert.equal(category({...issued,start:'2026-02-30'},date),'emitidas');
  assert.equal(category({...issued,datesPending:true,start:'2026-01-01',end:'2026-01-02'},date),'emitidas');
});
