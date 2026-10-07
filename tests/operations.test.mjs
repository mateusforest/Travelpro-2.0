import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {window:{}, Date};
vm.runInNewContext(fs.readFileSync(new URL('../dist/operations.js', import.meta.url), 'utf8'), context);
const operations = context.window.TravelOperations;
const now = new Date(2026, 8, 26, 14, 0, 0);
const base = () => ({clients:[{id:'c1', name:'Ágata Souza', email:'agata@example.test', phone:''}], trips:[], budgets:[], events:[]});
const trip = (id, status = 'Novo pedido', extra = {}) => ({id, client:'c1', title:'Viagem ' + id, destination:'Lisboa', status, ...extra});
const ctx = state => ({state, now, icon:() => '', dateLabel:value => value});

test('issuance deadlines take priority until emission is confirmed', () => {
  const state=base();
  state.trips=[trip('held','Aguardando pagamento',{sales:{fulfillment:{deadline:new Date(now.getTime()+3600000).toISOString(),emission:'pending'}}}),trip('done','Confirmada',{sales:{fulfillment:{deadline:new Date(now.getTime()-3600000).toISOString(),emission:'issued'}}})];
  const model=operations.model(ctx(state));
  assert.equal(model.priorities[0].id,'emission:held');
  assert.equal(model.priorities[0].badge,'Emissão pendente');
  assert.ok(!model.priorities.some(p=>p.id==='emission:done'));
});

test('real operational indicators exclude closed trips and approved proposals without claiming a payment', () => {
  const state = base();
  state.trips = [trip('draft', 'Proposta', {start:'2026-09-27'}), trip('quoting', 'Em cotação', {start:'2026-09-27'}), trip('confirmed', 'Confirmada', {start:'2026-09-28'}), trip('closed', 'Concluída', {start:'2026-09-28'}), trip('cancelled', 'Cancelada'), trip('past', 'Confirmada', {start:'2026-09-25'}), trip('invalid', 'Confirmada', {start:'2026-02-30'})];
  state.budgets = [{id:'open', client:'c1', name:'A', status:'Rascunho', valid:'2026-09-27'}, {id:'approved', status:'Aprovado na prévia'}, {id:'cancelled', status:'Cancelada'}];
  const model = operations.model(ctx(state));
  assert.equal(model.active.length, 5);
  assert.equal(model.openBudgets.length, 1);
  assert.deepEqual(Array.from(model.departures, item => item.id), ['confirmed']);
  assert.ok(!model.departures.some(item => item.id === 'quoting' || item.id === 'draft'));
  const html = operations.today(ctx(state));
  assert.match(html, /Datas cadastradas/);
  assert.doesNotMatch(html, /Pagamento confirmado|Comissão recebida/);
});

test('past appointments are for checking, completed events are omitted, and missing dates remain separate', () => {
  const state = base(); state.trips = [trip('a')];
  state.events = [
    {id:'past', trip:'a', title:'Ligar para cliente', date:'2026-09-25', time:'10:00'},
    {id:'today', title:'Revisar apresentação', date:'2026-09-26', time:''},
    {id:'done', title:'Concluído', date:'2026-09-25', completed:true},
    {id:'unknown', trip:'a', title:'Combinar retorno', date:'', time:'16:00'},
    {id:'invalid', title:'Conferir data', date:'2026-02-30'}
  ];
  const model = operations.model(ctx(state));
  assert.ok(model.priorities.some(item => item.id === 'event:past' && item.badge === 'Data passada'));
  assert.ok(!model.priorities.some(item => item.id === 'event:done'));
  assert.equal(model.noDate.length, 2);
  assert.ok(model.noDate.every(item => !item.detail.includes('16:00')));
  assert.match(operations.today(ctx(state)), /Conferir compromisso de/);
});

test('a date-only proposal remains valid for its whole calendar day and no time is invented', () => {
  const state = base();
  state.budgets = [
    {id:'yesterday', name:'Ontem', client:'c1', valid:'2026-09-25'},
    {id:'today', name:'Hoje', client:'c1', valid:'2026-09-26'},
    {id:'tomorrow', name:'Amanhã', client:'c1', valid:'2026-09-27'},
    {id:'unknown', name:'Sem validade', client:'c1', valid:''}
  ];
  const model = operations.model(ctx(state));
  assert.equal(model.priorities.find(item => item.id === 'budget:yesterday').badge, 'Revalidar cotação');
  assert.equal(model.priorities.find(item => item.id === 'budget:today').badge, 'Validade hoje');
  assert.equal(model.priorities.find(item => item.id === 'budget:tomorrow').badge, 'Validade próxima');
  assert.equal(model.noDate[0].badge, 'Validade a confirmar');
  assert.doesNotMatch(operations.today(ctx(state)), /16:00|00:00|23:59/);
});

test('exact validity timestamps use the supplied offset, while a timestamp without a timezone needs review', () => {
  const state = base();
  state.budgets = [
    {id:'past', name:'Passada', validUntil:'2026-09-26T11:00:00-03:00'},
    {id:'future', name:'Futura', validUntil:'2026-09-26T18:00:00-03:00'},
    {id:'ambiguous', name:'Sem fuso', validUntil:'2026-09-26T16:00:00'}
  ];
  const model = operations.model({...ctx(state), now:'2026-09-26T14:00:00-03:00'});
  assert.equal(model.priorities.find(item => item.id === 'budget:past').badge, 'Revalidar cotação');
  assert.equal(model.priorities.find(item => item.id === 'budget:future').badge, 'Validade próxima');
  assert.equal(model.noDate[0].badge, 'Validade a conferir');
});

test('next contact uses future events for that exact trip, not proposals from the same client', () => {
  const state = base(); state.trips = [trip('a'), trip('b')];
  state.events = [{id:'future', trip:'a', title:'Retorno marcado', date:'2026-09-28', time:'09:00'}];
  state.budgets = [{id:'budget', client:'c1', name:'Outra proposta', valid:'2026-09-27'}];
  const model = operations.model(ctx(state));
  assert.equal(model.nextEvent('a').id, 'future');
  assert.equal(model.nextEvent('b'), undefined);
  assert.ok(!model.priorities.some(item => item.id === 'contact:a'));
  assert.ok(model.priorities.some(item => item.id === 'contact:b'));
  assert.equal(model.priorities.find(item => item.id === 'budget:budget').href, '#orcamento/budget');
  assert.match(operations.inboxResults(ctx(state)), /Retorno marcado/);
});

test('an uncompleted event today or in the past suppresses the duplicate next-contact priority', () => {
  const state = base();
  state.trips = [trip('today'), trip('past'), trip('future'), trip('done')];
  state.events = [
    {id:'today', trip:'today', title:'Retorno de hoje', type:'Retorno', date:'2026-09-26', time:'15:00'},
    {id:'past', trip:'past', title:'Conferir retorno anterior', type:'Retorno', date:'2026-09-25', time:'09:00'},
    {id:'future', trip:'future', title:'Retorno futuro', type:'Retorno', date:'2026-09-27', time:'09:00'},
    {id:'done', trip:'done', title:'Retorno concluído', type:'Retorno', date:'2026-09-26', time:'12:00', completed:true}
  ];
  const model = operations.model({...ctx(state), now:new Date(2026, 8, 26, 16, 0, 0)});
  assert.ok(model.priorities.some(item => item.id === 'event:today' && item.badge === 'Hoje'));
  assert.ok(model.priorities.some(item => item.id === 'event:past' && item.badge === 'Data passada'));
  assert.ok(!model.priorities.some(item => ['contact:today', 'contact:past', 'contact:future'].includes(item.id)));
  assert.ok(model.priorities.some(item => item.id === 'contact:done'));
  assert.equal(model.priorityCount, 3);
});

test('the attendance list shows the most recent uncompleted past appointment for review when no future one exists', () => {
  const state = base(); state.trips = [trip('portugal')];
  state.events = [
    {id:'older', trip:'portugal', title:'Retorno anterior', date:'2026-09-25', time:'11:00'},
    {id:'recent', trip:'portugal', title:'Retorno Portugal', date:'2026-09-26', time:'15:00'},
    {id:'done', trip:'portugal', title:'Reunião concluída', date:'2026-09-26', time:'15:30', completed:true},
    {id:'invalid', trip:'portugal', title:'Sem data válida', date:'2026-02-30', time:'16:00'}
  ];
  const options = {...ctx(state), now:new Date(2026, 8, 26, 16, 0, 0)};
  const model = operations.model(options);
  assert.equal(model.nextEvent('portugal'), undefined);
  assert.equal(model.previousEvent('portugal').id, 'recent');
  const html = operations.inboxResults(options);
  assert.match(html, /Retorno Portugal/);
  assert.match(html, /Conferir registro · 2026-09-26 · 15:00/);
  assert.doesNotMatch(html, /Definir próximo contato|Nenhum compromisso futuro registrado|Reunião concluída|Retorno anterior/);
  state.events.push({id:'future', trip:'portugal', title:'Próximo retorno Portugal', date:'2026-09-27', time:'09:00'});
  const withFuture = operations.inboxResults(options);
  assert.match(withFuture, /Próximo retorno Portugal/);
  assert.doesNotMatch(withFuture, /Conferir registro/);
});

test('search and filters match accents, preserve recorded status and include related clients once', () => {
  const state = base();
  state.trips = [trip('commercial'), trip('confirmed', 'Confirmada'), trip('closed', 'Encerrada', {participants:['c1']})];
  assert.match(operations.inboxResults(ctx(state), 'agata', 'commercial'), /Viagem commercial/);
  assert.doesNotMatch(operations.inboxResults(ctx(state), '', 'commercial'), /Viagem confirmed|Viagem closed/);
  assert.match(operations.inboxResults(ctx(state), '', 'confirmed'), /Viagem confirmed/);
  assert.doesNotMatch(operations.inboxResults(ctx(state), '', 'confirmed'), /Viagem commercial/);
  assert.match(operations.clientResults(ctx(state), 'agata'), /3 atendimentos vinculados/);
  assert.match(operations.inboxResults(ctx(state), 'inexistente'), /Nenhum atendimento encontrado/);
});

test('all user-controlled names, details, dates and identifiers are escaped', () => {
  const attack = '"><img src=x onerror=alert(1)>';
  const state = base();
  state.clients[0].id = attack; state.clients[0].name = attack; state.clients[0].phone = attack;
  state.trips = [trip(attack, attack, {client:attack, title:attack, destination:attack, start:'2026-09-27'})];
  state.events = [{id:'e', trip:attack, title:attack, date:'2026-09-26', time:'10:00'}];
  state.budgets = [{id:attack, client:attack, name:attack, valid:'2026-09-25'}];
  for (const html of [operations.today(ctx(state)), operations.inbox(ctx(state)), operations.clients(ctx(state))]) {
    assert.doesNotMatch(html, /<img|<script|href="[^"]*" onerror=/);
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /undefined/);
  }
  assert.match(operations.inbox(ctx(state)), /%22%3E%3Cimg/);
  assert.match(operations.today({...ctx(state), dateLabel:() => attack}), /&lt;img/);
});

test('empty accounts have useful empty states and no fictitious agency data', () => {
  const state = {clients:[], trips:[], budgets:[], events:[]};
  assert.match(operations.today(ctx(state)), /primeiro atendimento/);
  assert.match(operations.today(ctx(state)), /Nenhum embarque informado/);
  assert.match(operations.inbox(ctx(state)), /Nenhum atendimento cadastrado/);
  assert.match(operations.clients(ctx(state)), /Nenhum cliente cadastrado/);
  assert.doesNotMatch(operations.today(ctx(state)), /Atelier|Ana|Pedro|2026-09-10/);
});

test('model and every render function leave persisted state unchanged and cap overview lists', () => {
  const state = base();
  state.trips = Array.from({length:12}, (_, index) => trip(String(index), 'Confirmada', {start:'2026-09-27'}));
  const before = JSON.stringify(state);
  const freeze = item => {if (item && typeof item === 'object') {Object.freeze(item); Object.values(item).forEach(freeze);} return item;};
  freeze(state);
  const model = operations.model(ctx(state));
  assert.equal(model.priorityCount, 12); assert.equal(model.priorities.length, 6);
  operations.today(ctx(state)); operations.inbox(ctx(state)); operations.clients(ctx(state));
  operations.inboxResults(ctx(state), 'lisboa', 'all'); operations.clientResults(ctx(state), 'agata');
  assert.equal(JSON.stringify(state), before);
  const html = operations.today(ctx(state));
  assert.equal((html.match(/Datas cadastradas/g) || []).length, 1);
  assert.match(html, /6 de 12 itens/);
});
test('calendar combines appointments with departure, travel period and return without creating events',()=>{
  const state=base();state.trips=[trip('confirmed','Confirmada',{start:'2026-10-01',end:'2026-10-03'}),trip('pending','Novo pedido',{start:'2026-10-01',end:'2026-10-03'}),trip('canceled','Cancelada',{start:'2026-10-01',end:'2026-10-03'})];
  state.events=[{id:'meeting',title:'Contato',date:'2026-10-02',time:'10:00',type:'Retorno'}];
  const before=JSON.stringify(state);
  assert.equal(operations.calendarItems(ctx(state),'2026-10-01').find(x=>x.id==='confirmed').label,'Embarque');
  const middle=operations.calendarItems(ctx(state),'2026-10-02');
  assert.equal(middle.length,3);assert.equal(middle[0].id,'meeting');assert.equal(middle.find(x=>x.id==='confirmed').label,'Em viagem');assert.equal(middle.find(x=>x.id==='pending').label,'Viagem prevista');
  assert.equal(operations.calendarItems(ctx(state),'2026-10-03').find(x=>x.id==='confirmed').label,'Retorno');
  assert.equal(operations.calendarItems(ctx(state),'2026-10-04').length,0);assert.equal(JSON.stringify(state),before);
});

test('attendance order defaults to newest creation and period includes overlapping trips',()=>{
 const state=base();state.trips=[trip('old','Novo pedido',{createdAt:'2026-01-01',start:'2026-10-01',end:'2026-10-12'}),trip('new','Novo pedido',{createdAt:'2026-09-01',start:'2026-10-15',end:'2026-10-20'}),trip('pending')];
 const html=operations.inboxResults(ctx(state));assert.ok(html.indexOf('Viagem new')<html.indexOf('Viagem old'));
 const reversed=operations.inboxResults({...ctx(state),options:{sort:'oldest'}});assert.ok(reversed.indexOf('Viagem old')<reversed.indexOf('Viagem new'));
 const filtered=operations.inboxResults({...ctx(state),options:{from:'2026-10-10',to:'2026-10-11'}});assert.match(filtered,/Viagem old/);assert.doesNotMatch(filtered,/Viagem new|Viagem pending/);
 assert.match(operations.inboxResults({...ctx(state),options:{from:'2026-10-12',to:'2026-10-01'}}),/Confira o período/);
});

test('birthdays recur annually without records and handle leap days and deleted clients',()=>{
 const state=base();state.events=[];state.trips=[];state.clients=[
  {id:'regular',name:'Ana',birthDate:'1990-10-07'},
  {id:'leap',name:'Bia',birthDate:'2000-02-29'},
  {id:'deleted',name:'Excluído',birthDate:'1990-10-07',deletedAt:'2026-01-01'},
  {id:'bad',name:'Inválido',birthDate:'1990-02-30'},
  {id:'empty',name:'Sem data'}];
 const before=JSON.stringify(state);
 for(const year of [2026,2027])assert.deepEqual(operations.calendarItems(ctx(state),year+'-10-07').map(x=>x.client),['regular']);
 assert.equal(operations.calendarItems(ctx(state),'2027-02-28')[0].client,'leap');
 assert.equal(operations.calendarItems(ctx(state),'2028-02-28').length,0);
 assert.equal(operations.calendarItems(ctx(state),'2028-02-29')[0].client,'leap');
 assert.equal(JSON.stringify(state),before);
});
