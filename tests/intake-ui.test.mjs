import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source = readFileSync(new URL('../dist/intake.js', import.meta.url), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const identified = () => ({mode:'ai', summary:'Pedido de uma viagem para Portugal.', warnings:[], draft:{name:'Ana Lima', phone:'', email:'', destination:'Portugal', start:'', end:'', travelers:2, notes:'Viagem em casal.'}});

function setup(t, options = {}) {
  const dom = new JSDOM('<main id="host"></main>', {url:'https://travelpro.test/portal.html', runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const {window:w} = dom, root = w.document.querySelector('#host');
  const requests = [], executions = [], opened = [], createdUrls = [], revokedUrls = [];
  w.URL.createObjectURL = file => {createdUrls.push(file.name); return 'blob:https://travelpro.test/print-' + createdUrls.length;};
  w.URL.revokeObjectURL = url => revokedUrls.push(url);
  w.eval(source);
  const context = {
    clients:options.clients || [],
    services:options.services || [{service:'openai', configured:true}],
    api:{async request(path, request) {requests.push({path,...copy(request)});return options.request ? options.request(path, request) : identified();}},
    async onExecute(payload) {executions.push(copy(payload));return options.onExecute ? options.onExecute(payload, executions.length) : {clientId:'new-client', tripId:'new-trip', replayed:false};},
    onOpen(result) {opened.push(copy(result));}
  };
  w.TravelIntake.mount(root, context);
  const find = selector => root.querySelector(selector);
  const click = action => {const element = find(`[data-intake="${action}"]`);assert.ok(element, action);element.click();};
  const input = (selector, value, kind = 'input') => {const element = find(selector);assert.ok(element, selector);element.value = value;element.dispatchEvent(new w.Event(kind, {bubbles:true}));};
  const submit = () => {const form = find('#intake-review-form');assert.ok(form);form.dispatchEvent(new w.Event('submit', {bubbles:true,cancelable:true}));};
  const waitFor = async predicate => {for(let count=0;count<100;count++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Intake UI timeout: '+root.textContent);};
  const analyze = async (text = 'Ana quer viajar para Portugal em casal.') => {input('#intake-text',text);click('analyze');await waitFor(()=>find('#intake-review-form'));};
  const upload = file => {const field=find('#intake-image');Object.defineProperty(field,'files',{configurable:true,value:[file]});field.dispatchEvent(new w.Event('change',{bubbles:true}));};
  return {w,root,context,requests,executions,opened,createdUrls,revokedUrls,find,click,input,submit,waitFor,analyze,upload};
}

test('unconfigured AI checks current server availability, reports the error and unlocks manual review', async t => {
  const ui = setup(t, {services:[],request:async()=>{throw Object.assign(new Error('IA aguarda ativação pela equipe.'),{status:503});}});
  const sourceText = 'Joana, telefone 11999999999, quer ir para Itália dia 20/12/2026 com 3 pessoas.';
  ui.input('#intake-text', sourceText);
  assert.equal(ui.find('[data-intake="analyze"]').disabled, false);
  ui.click('analyze');
  await ui.waitFor(()=>ui.find('.intake-error'));
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.find('[data-intake="analyze"]').disabled, false);
  assert.equal(ui.find('#intake-text').value, sourceText);
  ui.click('manual');
  assert.ok(ui.find('#intake-review-form'));
  assert.match(ui.root.textContent, /Nenhuma informação foi extraída automaticamente/);
  for (const name of ['name','phone','email','destination','start','end','travelers']) assert.equal(ui.find(`[name="${name}"]`).value, '', name);
  assert.equal(ui.find('[name="notes"]').value, sourceText);
  assert.equal(ui.executions.length, 0);
  assert.equal(ui.requests.length, 1);
});

test('long manual conversations retain their source and ask for a shorter note instead of submitting oversized notes', t => {
  const ui = setup(t, {services:[]});
  const sourceText = 'a'.repeat(6500);
  ui.input('#intake-text', sourceText);
  ui.click('manual');
  assert.equal(ui.find('#intake-text').value, sourceText);
  assert.equal(ui.find('[name="notes"]').value, '');
  assert.match(ui.root.textContent, /Resuma o pedido em até 6.000 caracteres/);
  assert.equal(ui.executions.length, 0);
});

test('analysis only opens editable review; execution uses the reviewed values after explicit submit', async t => {
  const ui = setup(t);
  await ui.analyze();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].path, '/cos/intake/analyze');
  assert.equal(ui.requests[0].method, 'POST');
  assert.equal(ui.executions.length, 0);
  assert.equal(ui.opened.length, 0);
  assert.equal(ui.find('[name="destination"]').disabled, false);
  const edits = {name:'Ana Maria Lima',phone:'11987654321',email:'ana@example.test',destination:'Lisboa e Porto',start:'2026-11-02',end:'2026-11-12',travelers:'3',notes:'Incluir a mãe no pedido. Datas confirmadas com a cliente.'};
  for (const [name, value] of Object.entries(edits)) ui.input(`[name="${name}"]`, value);
  ui.submit();
  await ui.waitFor(()=>ui.opened.length === 1);
  assert.equal(ui.executions.length, 1);
  const submitted = ui.executions[0];
  assert.equal(submitted.action, 'attendance');
  assert.equal(submitted.clientId, '');
  assert.match(submitted.requestId,/^[0-9a-f-]{36}$/i);
  assert.deepEqual(submitted.draft, {...edits, travelers:3});
  assert.equal(ui.find('#intake-review-form'), null);
  assert.equal(ui.find('#intake-text').value, '');
});

test('choosing an existing client preserves its profile and allows a reviewed attendance without new-client requirements', async t => {
  const clients = [{id:'existing-client', name:'Perfil preservado', phone:'1133334444', email:'cadastro@example.test', notes:'Preferências existentes'}];
  const before = copy(clients);
  Object.freeze(clients[0]);Object.freeze(clients);
  const result = identified();result.draft.name = '';result.draft.phone='1199990000';result.draft.email='extraido@example.test';
  const ui = setup(t, {clients, request:async()=>result});
  await ui.analyze();
  ui.input('[name="destination"]', 'Portugal em família');
  ui.input('[name="clientId"]', 'existing-client', 'change');
  assert.equal(ui.find('.intake-new-client').hidden, true);
  assert.equal(ui.find('[name="name"]').required, false);
  assert.equal(ui.find('[name="destination"]').value, 'Portugal em família');
  assert.match(ui.root.textContent, /O cadastro existente será preservado/);
  ui.submit();await ui.waitFor(()=>ui.opened.length === 1);
  assert.equal(ui.executions[0].clientId, 'existing-client');
  assert.equal(ui.executions[0].draft.destination, 'Portugal em família');
  assert.deepEqual(clients, before);
});

test('switching to an existing client discards irrelevant invalid contact edits from validation and execution', async t => {
  const clients=[{id:'existing-client',name:'Ana cadastrada',phone:'1133334444',email:'cadastro@example.test'}];
  const ui=setup(t,{clients});
  await ui.analyze();
  ui.input('[name="email"]','isto não é um e-mail');
  ui.input('[name="phone"]','telefone desconhecido');
  ui.input('[name="destination"]','Porto revisado');
  ui.input('[name="clientId"]','existing-client','change');
  assert.equal(ui.find('.intake-new-client').hidden,true);
  assert.equal(ui.find('#intake-review-form').checkValidity(),true,'hidden new-client fields cannot block reuse');
  ui.submit();await ui.waitFor(()=>ui.opened.length === 1);
  assert.equal(ui.executions[0].clientId,'existing-client');
  assert.equal(ui.executions[0].draft.destination,'Porto revisado');
  assert.notEqual(ui.executions[0].draft.email,'isto não é um e-mail');
  assert.notEqual(ui.executions[0].draft.phone,'telefone desconhecido');
  assert.equal(clients[0].email,'cadastro@example.test');
  assert.equal(clients[0].phone,'1133334444');
});

test('an uncertain network result retries the exact same requestId and payload with source and fields locked', async t => {
  const ui = setup(t, {onExecute:async(payload, attempt)=>{if(attempt===1)throw new Error('Resposta não recebida.');return {clientId:'existing',tripId:'created',replayed:true};}});
  await ui.analyze();
  ui.input('[name="notes"]','Revisão humana já concluída.');
  ui.submit();
  await ui.waitFor(()=>ui.find('[role="alert"]')?.textContent === 'Resposta não recebida.');
  assert.equal(ui.executions.length,1);
  assert.equal(ui.opened.length,0);
  assert.equal(ui.find('#intake-text').disabled,true);
  assert.equal(ui.find('#intake-review-form fieldset').disabled,true);
  assert.equal(ui.find('[data-intake="cancel"]').disabled,true);
  assert.match(ui.find('#intake-review-form button[type="submit"]').textContent,/Tentar confirmar novamente/);
  ui.submit();await ui.waitFor(()=>ui.opened.length === 1);
  assert.equal(ui.executions.length,2);
  assert.deepEqual(ui.executions[0],ui.executions[1]);
  assert.match(ui.root.textContent,/Nenhum registro foi duplicado/);
});

test('changing source text invalidates the previous review and cannot execute the stale draft', async t => {
  const ui = setup(t);await ui.analyze();
  const oldReview=ui.find('#intake-review-form');
  ui.input('#intake-text','Agora o pedido é outro: somente uma pessoa para Recife.');
  assert.equal(ui.find('#intake-review-form'),null);
  assert.equal(oldReview.isConnected,false);
  assert.equal(ui.executions.length,0);
  ui.click('analyze');await ui.waitFor(()=>ui.find('#intake-review-form'));
  assert.equal(ui.requests.length,2);
  assert.equal(ui.requests[1].body.text,'Agora o pedido é outro: somente uma pessoa para Recife.');
  assert.equal(ui.executions.length,0);
});

test('model and client text is displayed literally without HTML injection in editable review', async t => {
  const attack='"><img src=x onerror=alert(1)><script>window.injected=true</script>';
  const result=identified();result.summary=attack;result.warnings=[attack];
  Object.assign(result.draft,{name:attack,phone:attack,email:attack,destination:attack,notes:'</textarea>'+attack});
  const ui=setup(t,{request:async()=>result,clients:[{id:attack,name:attack}]});
  await ui.analyze();
  assert.equal(ui.root.querySelector('script'),null);
  assert.equal(ui.root.querySelector('img'),null);
  assert.equal(ui.w.injected,undefined);
  assert.equal(ui.find('[name="name"]').value,attack);
  assert.equal(ui.find('[name="notes"]').value,'</textarea>'+attack);
  assert.equal(ui.find('[name="clientId"]').options[1].value,attack);
  assert.equal(ui.find('[name="clientId"]').options[1].textContent,attack);
  assert.ok(ui.root.textContent.includes(attack));
});

test('print input rejects unsupported types and files over 3 MB without calling analysis', async t => {
  const ui=setup(t);
  ui.upload(new ui.w.File(['document'],'pedido.pdf',{type:'application/pdf'}));
  assert.match(ui.root.textContent,/PNG, JPG ou WebP de até 3 MB/);
  assert.equal(ui.createdUrls.length,0);
  ui.upload(new ui.w.File([new Uint8Array(3*1024*1024+1)],'grande.png',{type:'image/png'}));
  assert.match(ui.root.textContent,/PNG, JPG ou WebP de até 3 MB/);
  assert.equal(ui.createdUrls.length,0);
  assert.equal(ui.requests.length,0);
  assert.equal(ui.executions.length,0);
});

test('a supported print is previewed and only sent to analysis on request; removing it revokes preview and review', async t => {
  const ui=setup(t);
  ui.upload(new ui.w.File(['image bytes'],'pedido.png',{type:'image/png'}));
  await ui.waitFor(()=>ui.find('.intake-attachment img'));
  assert.equal(ui.requests.length,0);
  assert.equal(ui.createdUrls.length,1);
  assert.match(ui.find('.intake-attachment img').src,/^blob:/);
  ui.click('analyze');await ui.waitFor(()=>ui.find('#intake-review-form'));
  assert.equal(ui.requests[0].body.image.name,'pedido.png');
  assert.equal(ui.requests[0].body.image.mime,'image/png');
  assert.equal(ui.requests[0].body.image.base64,Buffer.from('image bytes').toString('base64'));
  assert.equal(ui.executions.length,0);
  ui.click('remove-image');
  assert.equal(ui.find('.intake-attachment'),null);
  assert.equal(ui.find('#intake-review-form'),null);
  assert.equal(ui.revokedUrls.length,1);
});
