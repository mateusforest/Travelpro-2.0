import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {validateState,validateSalesTransition} from '../backend/validation.mjs';
import {applyIntake} from '../backend/intake.mjs';
import {proposalPreview} from '../backend/proposal-delivery.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
async function waitFor(predicate,label){
  for(let i=0;i<100;i++){
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw new Error('Portal did not reach expected state: '+label);
}

async function fixture(t,{pathname='/portal.html',workspace,chatGate,intake=false,intakeGate,dropFirstIntakeResponse=false,extractError=false}={}){
  let saved=clone(workspace||JSON.parse(read('backend/initial-state.json'))),version=1;
  saved.agency='Agência de teste isolada';
  const writes=[],chats=[],uploads=[],intakes=[];
  const dom=new JSDOM(read('dist/portal.html'),{url:'http://localhost'+pathname,runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window,d=w.document;
  w.scrollTo=()=>{};
  w.structuredClone=structuredClone;
  w.URL.createObjectURL=blob=>{assert.equal(blob.type,'application/pdf');return 'blob:http://localhost/test-proposal';};
  w.URL.revokeObjectURL=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const services=['openai','operator','whatsapp'].map(service=>({service,configured:false}));
  const api={version:1,user:{id:'isolated-user',name:'Pessoa de teste',email:'portal@example.invalid'},
    async session(){return this.user;},
    async request(route,options={}){
      if(route==='/workspace'&&options.method==='PUT'){
        assert.equal(options.body.version,version,'workspace write uses current server version');
        const next=clone(options.body.state);validateState(next);validateSalesTransition(saved,next);
        saved=next;writes.push(clone(next));return {version:++version};
      }
      if(route==='/workspace')return {state:clone(saved),version,services:clone(services)};
      if(route==='/proposals/preview')return proposalPreview(saved,options.body.id,{});
      if(route==='/cos/intake/execute'&&options.method==='POST'){
        intakes.push(clone(options.body));
        const result=applyIntake(saved,options.body.review);
        if(!result.replayed){
          assert.equal(options.body.version,version,'new intake uses current server version');
          saved=clone(result.state);version++;
        }
        if(dropFirstIntakeResponse&&intakes.length===1)throw Object.assign(new Error('Synthetic lost response after commit'),{status:0});
        if(intakeGate)await intakeGate(intakes.length);
        return {...result,state:clone(saved),version};
      }
      if(route==='/files'&&options.method==='POST'){
        assert.equal(typeof options.body.base64,'string');
        uploads.push({name:options.body.name});
        return {id:'test-upload-'+uploads.length+'/original.pdf',name:options.body.name,size:10,type:'application/octet-stream'};
      }
      if(route==='/templates/extract'){
        if(extractError)throw Error('Leitura por IA aguarda ativação. Original preservado.');
        return {days:[{period:'Dia 1',title:'Roma',text:'Transfer contratado às 08:00.'},{period:'Dia 2',title:'Florença',text:'Trem confirmado às 09:00.'}],method:'pdf',warnings:['Confira os horários.']};
      }
      if(route==='/cos/chat'&&options.method==='POST'){
        assert.equal(options.body.version,version,'chat uses current server version');
        chats.push(clone(options.body));
        if(chatGate)await chatGate;
        const response={role:'cos',text:'Abra o roteiro da viagem para revisar os serviços.',action:'new-itinerary',label:'Preparar roteiro',mode:'guided'};
        saved.messages=[...saved.messages,{role:'user',text:options.body.text},response];
        return {response,messages:clone(saved.messages),mode:'guided',version:++version};
      }
      throw new Error('Unexpected API route in isolated portal test: '+route);
    }
  };
  w.TravelAPI=api;
  w.eval(read('dist/operations.js'));
  w.eval(read('dist/portal-workflow.js'));
  w.eval(read('dist/reports.js'));
  w.eval(read('dist/sales-flow.js'));
  w.eval(read('dist/proposal-brand.js'));
  w.eval(read('dist/itinerary-models.js'));
  w.eval(read('dist/proposal-ui.js'));
  w.eval(read('dist/sales-flow-ui.js'));
  if(intake)w.eval(read('dist/intake.js'));
  const source=read('dist/portal.js').replace(/\}\)\(\);\s*$/,
    'window.__portalTests={state,render,workspaceSubmit,workspaceAction,sendCos,executeIntake,readRoute,flush,acceptFile};})();');
  w.eval(source);
  await waitFor(()=>w.__portalTests.state.agency==='Agência de teste isolada'&&d.querySelector('#portal-main').children.length>0,'authenticated workspace boot');
  return {w,d,api,portal:w.__portalTests,writes,chats,uploads,intakes,remoteUpdate(change){change(saved);validateState(saved);version++;},get saved(){return clone(saved);},get version(){return version;}};
}

function click(f,action){
  const button=f.d.querySelector('[data-action="'+action+'"]');
  assert.ok(button,'portal action exists: '+action);button.click();return button;
}

test('client form waits for confirmed persistence, blocks double submit and survives reload',async t=>{
  const f=await fixture(t,{pathname:'/clientes.html'});
  await f.portal.workspaceAction('new-client');
  const form=f.d.querySelector('[data-form="client"]');
  form.elements.namedItem('name').value='Cliente persistente';
  form.elements.namedItem('status').value='Prospect';
  let release,attempts=0;const gate=new Promise(resolve=>release=resolve),request=f.api.request.bind(f.api);
  f.api.request=async(path,options)=>{if(options?.method==='PUT'){attempts++;await gate;}return request(path,options);};
  const submit=()=>form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  submit();submit();await waitFor(()=>attempts===1,'pending client write');
  assert.equal(f.d.querySelector('#portal-dialog').open,true);
  assert.equal(form.querySelector('[type=submit]').disabled,true);
  assert.doesNotMatch(f.d.querySelector('#toast').textContent,/Cliente salvo/);
  release();await waitFor(()=>!f.d.querySelector('#portal-dialog').open,'confirmed client save');
  assert.equal(f.saved.clients.length,1);assert.equal(attempts,1);
  assert.match(f.d.querySelector('#operations-client-results').textContent,/Cliente persistente/);
  assert.match(f.d.querySelector('#toast').textContent,/Cliente salvo/);
  const reopened=await fixture(t,{pathname:'/clientes.html',workspace:f.saved});
  assert.equal(reopened.portal.state.clients[0].name,'Cliente persistente');
  reopened.d.querySelector('#operations-client-filter').value='prospect';
  reopened.d.querySelector('#operations-client-filter').dispatchEvent(new reopened.w.Event('change',{bubbles:true}));
  assert.match(reopened.d.querySelector('#operations-client-results').textContent,/Cliente persistente/);
});

test('failed client save keeps the form and retry saves exactly one client',async t=>{
  const f=await fixture(t,{pathname:'/clientes.html'});
  await f.portal.workspaceAction('new-client');
  const form=f.d.querySelector('[data-form="client"]');form.elements.namedItem('name').value='Tentar novamente';
  const request=f.api.request.bind(f.api);let fail=true;
  f.api.request=async(path,options)=>{if(options?.method==='PUT'&&fail)throw Error('Falha de conexão no teste');return request(path,options);};
  form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>form.querySelector('[data-save-error]'),'visible save error');
  assert.equal(f.d.activeElement,form.querySelector('[data-save-error]'));
  assert.equal(form.querySelector('[data-save-error]').nextElementSibling,form.querySelector('.dialog-actions'));
  assert.equal(f.d.querySelector('#portal-dialog').open,true);assert.equal(f.saved.clients.length,0);
  assert.equal(form.elements.namedItem('name').value,'Tentar novamente');assert.equal(form.querySelector('[type=submit]').disabled,false);
  fail=false;form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>!f.d.querySelector('#portal-dialog').open,'successful retry');
  assert.equal(f.saved.clients.length,1);assert.equal(f.saved.clients[0].name,'Tentar novamente');
});

test('standalone trip is created from Viagens with a new client and appears after reload',async t=>{
  const f=await fixture(t,{pathname:'/viagens.html'});click(f,'new-trip');
  const form=f.d.querySelector('[data-form="trip"]');assert.ok(form);
  for(const [name,value] of Object.entries({title:'Férias em Lisboa',name:'Viajante direto',destination:'Lisboa',start:'2027-05-01',end:'2027-05-10',travelers:'2',value:'9500'}))form.elements.namedItem(name).value=value;
  form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>f.saved.trips.length===1&&!f.d.querySelector('#portal-dialog').open,'standalone trip persisted');
  assert.equal(f.saved.clients.length,1);assert.equal(f.saved.trips[0].client,f.saved.clients[0].id);
  assert.equal(f.saved.trips[0].status,'Confirmada');assert.equal(f.saved.budgets.length,0);
  assert.match(f.d.querySelector('#toast').textContent,/Viagem salva/);
  const reopened=await fixture(t,{pathname:'/viagens.html',workspace:f.saved});
  assert.match(reopened.d.querySelector('.confirmed-trips').textContent,/Férias em Lisboa/);
});

test('legacy settings modal persists then closes with success',async t=>{
  const f=await fixture(t);
  f.d.querySelector('#dialog-body').innerHTML='<form data-form="settings"><input name="agency" value="Agência atualizada"><input name="plan" value="pro"><button type="submit">Salvar</button></form>';
  f.d.querySelector('#portal-dialog').showModal();
  f.d.querySelector('[data-form="settings"]').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>!f.d.querySelector('#portal-dialog').open,'settings saved');
  assert.equal(f.saved.agency,'Agência atualizada');assert.equal(f.saved.plan,'pro');
  assert.match(f.d.querySelector('#toast').textContent,/sucesso/);
});

test('failed document creation does not open its editor before persistence',async t=>{
  const f=await fixture(t,{pathname:'/documentos.html'});
  await f.portal.workspaceAction('new-document');
  const form=f.d.querySelector('[data-form="new-document"]');assert.ok(form);
  form.elements.namedItem('name').value='Documento com erro';
  const request=f.api.request.bind(f.api);
  f.api.request=async(path,options)=>{if(options?.method==='PUT')throw Error('Falha ao guardar documento');return request(path,options);};
  form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>form.querySelector('[data-save-error]'),'document write error');
  await new Promise(resolve=>setTimeout(resolve,60));
  assert.equal(f.d.querySelector('[data-form="new-document"]'),form);
  assert.equal(f.d.querySelector('#portal-dialog').open,true);
  assert.equal(f.saved.documents.length,0);
});

test('client accepts several attachments, reuses partial uploads and preserves existing documents',async t=>{
 const f=await fixture(t,{pathname:'/clientes.html'});await f.portal.workspaceAction('new-client');
 click(f,'add-client-attachment');const form=f.d.querySelector('[data-form="client"]');
 assert.equal(form.querySelectorAll('input[type=file][multiple]').length,2);
 const files=['Passaporte.pdf','Visto.pdf','Seguro.pdf'].map(name=>new f.w.File(['document'],name,{type:'application/pdf'}));
 const data={id:'multi-client',name:'Viajante',email:'',phone:'',notes:'',_attachments:files};
 const request=f.api.request.bind(f.api);let failed=false;
 f.api.request=async(path,options)=>{if(path==='/files'&&options.body.name==='Visto.pdf'&&!failed){failed=true;throw Error('Upload interrompido');}return request(path,options);};
 await f.portal.workspaceSubmit('client',{...data},form);assert.equal(f.saved.clients.length,0);assert.equal(f.uploads.length,1);assert.equal(f.d.querySelector('#portal-dialog').open,true);
 await f.portal.workspaceSubmit('client',{...data},form);assert.equal(f.saved.clients.length,1);assert.equal(f.uploads.length,3);assert.equal(f.saved.documents.length,3);
 assert.ok(f.saved.documents.every(d=>d.clients.includes('multi-client')));
 await f.portal.workspaceAction('edit-client','multi-client');
 await f.portal.workspaceSubmit('client',{...data,_attachments:[new f.w.File(['extra'],'Outro.pdf',{type:'application/pdf'})]},f.d.querySelector('[data-form="client"]'));
 assert.equal(f.saved.documents.length,4);assert.equal(f.saved.clients.length,1);
});

test('birthday date has a distinct calendar marker and links to the client profile',async t=>{
 const workspace=JSON.parse(read('backend/initial-state.json'));workspace.clients=[{id:'birthday-client',name:'Aniversariante',email:'',phone:'',birthDate:'1990-10-07'}];
 const f=await fixture(t,{pathname:'/agenda.html',workspace});
 Object.assign(f.portal.state,{year:2026,month:9,day:'2026-10-07'});f.portal.render();
 assert.ok(f.d.querySelector('[data-id="2026-10-07"].has-birthday'));
 assert.match(f.d.querySelector('.agenda-birthday').textContent,/Aniversariante/);
 assert.match(f.d.querySelector('.agenda-birthday').getAttribute('href'),/cliente.html\?id=birthday-client/);
 assert.equal(f.saved.events.length,0);
});

test('agency image saves, renders in the header, survives other edits and can be removed',async t=>{
 const f=await fixture(t,{pathname:'/configuracoes.html'});
 const avatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 f.w.TravelProposalBrand.prepareLogo=async file=>{assert.equal(file.name,'perfil.png');return {logo:avatar,colors:[]};};
 assert.ok(f.d.querySelector('[name=profileImage]'));
 const data={agency:'Minha agência',email:'',phone:'',website:''};
 await f.portal.workspaceSubmit('agency-profile',{...data,profileImage:new f.w.File(['png'],'perfil.png',{type:'image/png'})});
 assert.equal(f.saved.profile.avatar,avatar);assert.equal(f.d.querySelector('.avatar img').getAttribute('src'),avatar);
 await f.portal.workspaceSubmit('agency-profile',{...data,agency:'Nome atualizado'});assert.equal(f.saved.profile.avatar,avatar);
 const reopened=await fixture(t,{pathname:'/configuracoes.html',workspace:f.saved});assert.equal(reopened.d.querySelector('.avatar img').getAttribute('src'),avatar);
 await reopened.portal.workspaceSubmit('agency-profile',{...data,removeAvatar:'on'});assert.equal(reopened.d.querySelector('.avatar img'),null);assert.equal(reopened.saved.profile.avatar,'');
 const invalid=clone(f.saved);invalid.profile.avatar='https://example.invalid/tracker.png';assert.throws(()=>validateState(invalid),/perfil/);
});

test('manual proposal editor offers customization and opens a real PDF preview',async t=>{
 const f=await fixture(t);await f.portal.workspaceSubmit('client',{id:'pdf-client',name:'Cliente PDF',email:'',phone:'',notes:''});
 await f.portal.workspaceSubmit('new-budget',{name:'Proposta manual',destination:'Lisboa',client:'pdf-client',trip:'',start:'2027-01-01',end:'2027-01-10',valid:'2026-12-31',travelers:'2'});
 const b=f.saved.budgets[0];assert.ok(f.d.querySelector('[data-action="sales-download"]'));assert.ok(f.d.querySelector('[data-proposal-logo]'));
 await f.portal.workspaceAction('sales-preview',b.id);assert.ok(f.d.querySelector('.proposal-pdf-preview'));
 assert.equal(f.saved.trips.length,0);
});

test('client referral and relationship survive editing; manual confirmation records the sale date',async t=>{
 const f=await fixture(t);
 await f.portal.workspaceSubmit('client',{id:'referrer',name:'Ana',phone:'',email:'',notes:''});
 await f.portal.workspaceSubmit('client',{id:'referred',name:'Bia',phone:'',email:'',notes:'',acquisitionSource:'Indicação',referredBy:'referrer',relationship:'Próximo'});
 const c=f.saved.clients.find(c=>c.id==='referred');assert.equal(c.referredBy,'referrer');assert.equal(c.relationship,'Próximo');
 await f.portal.workspaceAction('edit-client','referred');assert.equal(f.d.querySelector('[name=referredBy]').value,'referrer');assert.ok(![...f.d.querySelector('[name=referredBy]').options].some(o=>o.value==='referred'));
 await f.portal.workspaceSubmit('client',{id:'referred',name:'Bia revisada',phone:'',email:'',notes:''});assert.equal(f.saved.clients.find(c=>c.id==='referred').referredBy,'referrer');
 await f.portal.workspaceSubmit('trip',{id:'',title:'Viagem confirmada',destination:'Lisboa',client:'referred',start:'2026-10-10',end:'2026-10-15',travelers:'1',value:'10000',status:'Confirmada'});
 assert.ok(f.saved.trips[0].sales.confirmedAt);assert.deepEqual(f.saved.trips[0].sales.quotes,[]);
 const invalid=clone(f.saved);invalid.clients[1].referredBy='referred';assert.throws(()=>validateState(invalid),/indicou/);
});

test('home steps and quote CTA open real operational routes; trips filter existing records',async t=>{
  const f=await fixture(t);
  assert.equal(f.d.querySelectorAll('.workflow-steps button').length,5);
  assert.ok(f.d.querySelector('#portal-dock a[href="cotacao.html"]'));
  assert.ok(f.d.querySelector('#portal-dock a[href="viagens.html"]'));
  await f.portal.workspaceAction('workflow-quote');assert.equal(f.d.querySelector('#dialog-title').textContent,'Gerar cotação');
  assert.ok(f.d.querySelector('#dialog-body [data-form="sales-quick"]'));
  assert.equal(f.d.querySelector('#dialog-body [name="client"]'),null);
  await f.portal.workspaceAction('workflow-proposals');assert.equal(f.portal.readRoute()[0],'orcamentos');
  await f.portal.workspaceAction('workflow-approval');assert.equal(f.portal.state.budgetFilter,'Aguardando aprovação');
  await f.portal.workspaceAction('workflow-reservations');assert.match(f.d.querySelector('#dialog-body').textContent,/Nenhuma proposta aprovada/);
  await f.portal.workspaceAction('workflow-itineraries');assert.equal(f.portal.readRoute()[0],'roteiros');
  f.w.history.pushState({},'','/cotacao.html');f.portal.render();assert.ok(f.d.querySelector('.page-actions [data-action="workflow-quote"]'));
  f.w.history.pushState({},'','/viagens.html?id=emitidas');f.portal.render();assert.match(f.d.querySelector('.page-title').textContent,/Viagens/);
  assert.match(f.d.querySelector('.trip-stage-tabs [aria-current="page"]').textContent,/Emitidas/);
  assert.equal(f.saved.trips.length,0,'navigation never creates fake trips');
});

test('dedicated agency template upload extracts, reviews and reuses actual content',async t=>{
  const f=await fixture(t,{pathname:'/roteiros.html'});
  await f.portal.acceptFile(new f.w.File(['test-text'],'Meu roteiro.txt',{type:'text/plain'}),'template');
  const model=f.saved.templates.find(m=>m.file);assert.ok(model);assert.equal(model.days.length,0,'unreviewed text is not silently approved');
  assert.equal(model.extractedDraft.days.length,2);
  const form=f.d.querySelector('[data-form="template-review"]');assert.ok(form);assert.match(form.querySelector('[name="text0"]').value,/Transfer contratado/);
  await f.portal.workspaceSubmit('template-review',{id:model.id,name:'Modelo aprovado',period0:'Dia 1',title0:'Roma',text0:'Transfer revisado às 08:30.',period1:'Dia 2',title1:'Florença',text1:'Trem confirmado às 09:00.'});
  const saved=f.saved.templates.find(m=>m.id===model.id);assert.equal(saved.extractionStatus,'reviewed');assert.equal(saved.file.name,'Meu roteiro.txt');
  await f.portal.workspaceSubmit('new-itinerary',{name:'Viagem teste',destination:'Itália',trip:'',template:model.id});
  assert.equal(f.saved.itineraries.at(-1).days[0].text,'Transfer revisado às 08:30.');
});

test('failed extraction preserves original and exposes retry instead of a fake model',async t=>{
  const f=await fixture(t,{pathname:'/roteiros.html',extractError:true});
  await f.portal.acceptFile(new f.w.File(['image'],'Meu roteiro.png',{type:'image/png'}),'template');
  const model=f.saved.templates.find(m=>m.file);assert.ok(model);assert.equal(model.days.length,0);assert.equal(model.extractionStatus,'pending');
  assert.match(f.d.querySelector('#dialog-body').textContent,/aguarda ativação/);assert.ok(f.d.querySelector('[data-action="extract-template"]'));
  await f.portal.workspaceSubmit('new-itinerary',{name:'Teste',destination:'Brasil',trip:'',template:model.id});
  assert.equal(f.saved.itineraries.length,0);
});

test('itinerary gallery previews both branded models and offers agency upload inside its card',async t=>{
 const f=await fixture(t,{pathname:'/roteiros.html'});
 for(const id of ['tp-editorial-v1','tp-concierge-v1']){
  await f.portal.workspaceAction('preview-itinerary-model',id);
  const frame=f.d.querySelector('.itinerary-model-preview');assert.ok(frame);
  assert.match(frame.getAttribute('srcdoc'),/Tecnologia/);assert.match(frame.getAttribute('srcdoc'),/Europlus/);
 }
 await f.portal.workspaceAction('preview-itinerary-model','own');
 assert.ok(f.d.querySelector('#dialog-body [data-action="import-template"]'));
 assert.equal(f.saved.itineraries.length,0,'viewing a model does not create records');
});

test('personal documents accept optional client and trip links, uploads, expiry and unlinking',async t=>{
 const f=await fixture(t);await f.portal.workspaceSubmit('client',{name:'Cliente de documentos',email:'',phone:'',notes:'',documentType:'Passaporte'});const c=f.saved.clients[0];
 await f.portal.workspaceAction('new-document',c.id);
 const form=f.d.querySelector('[data-form="new-document"]');assert.ok(form);assert.equal(form.querySelector('[name=documentClients]').checked,true);assert.equal(form.querySelector('[name=trip]').value,'');
 for(const type of ['Passaporte','RG','Visto','Seguro viagem','Voucher','Bilhete aéreo'])assert.ok([...form.querySelector('[name=type]').options].some(o=>o.value===type));
 const file=new f.w.File(['isolated document'],'passaporte-teste.webp',{type:'image/webp'});
 await f.portal.workspaceSubmit('new-document',{name:'Passaporte de teste',type:'Passaporte',trip:'',base:'',expiry:'2027-03-01',_clients:[c.id],documentAttachment:file});
 assert.equal(f.saved.documents.length,1);assert.equal(f.uploads.length,1);let d=f.saved.documents[0];assert.deepEqual(d.clients,[c.id]);assert.equal(d.trip,'');assert.equal(d.file.name,'passaporte-teste.webp');assert.equal(d.content,'');
 await f.portal.workspaceSubmit('edit-document',{id:d.id,name:d.name,content:'Observação',type:d.type,trip:'',expiry:'2027-03-01',_clients:[]});assert.deepEqual(f.saved.documents[0].clients,[],'explicitly unchecks optional links');assert.equal(f.saved.documents[0].file.name,'passaporte-teste.webp','editing preserves original attachment');
});

test('client creation can attach a selected identity document and agency settings preserve plan',async t=>{
 const f=await fixture(t);const file=new f.w.File(['fixture'],'identidade.pdf',{type:'application/pdf'});
 await f.portal.workspaceSubmit('client',{name:'Cliente com RG',email:'',phone:'',notes:'',documentType:'RG',documentAttachment:file});const c=f.saved.clients[0];assert.equal(f.saved.documents[0].type,'RG');assert.deepEqual(f.saved.documents[0].clients,[c.id]);
 const plan=f.saved.plan;await f.portal.workspaceSubmit('agency-profile',{agency:'Nome atualizado',email:'',phone:'',website:''});assert.equal(f.saved.plan,plan);assert.equal(f.saved.agency,'Nome atualizado');
});

test('notifications include all pending priorities, upcoming events and document expiry',async t=>{
 const initial=JSON.parse(read('backend/initial-state.json'));initial.events=Array.from({length:8},(_,i)=>({id:'e'+i,date:'2020-01-01',time:'10:00',title:'Pendente '+i,type:'Retorno'}));initial.events.push({id:'done',date:'2020-01-01',time:'10:00',title:'Já concluído',type:'Retorno',completed:true});initial.documents=[{id:'d1',name:'Passaporte vencido',type:'Passaporte',content:'',expiry:'2020-01-01'}];
 const f=await fixture(t,{workspace:initial});click(f,'notifications');const body=f.d.querySelector('#dialog-body').textContent;for(let i=0;i<8;i++)assert.ok(body.includes('Pendente '+i));assert.ok(body.includes('Passaporte vencido'));assert.ok(!body.includes('Já concluído'));
});

test('signature preparation remains unsent and requires a new review after document edits',async t=>{
 const f=await fixture(t);await f.portal.workspaceSubmit('client',{name:'Signatário de teste',email:'signer@example.invalid',phone:'',notes:''});const c=f.saved.clients[0];
 await f.portal.workspaceSubmit('new-document',{name:'Contrato em revisão',type:'Contrato',trip:'',base:'',_clients:[c.id]});const d=f.saved.documents[0];
 await f.portal.workspaceSubmit('signature-draft',{id:d.id,_signers:[c.id],message:'Confira os dados.'});assert.equal(f.saved.documents[0].signatureDraft.status,'prepared');assert.equal(f.saved.documents[0].status,'Rascunho');
 await f.portal.workspaceSubmit('edit-document',{id:d.id,name:d.name,content:'Versão revisada do contrato.',type:'Contrato',trip:'',_clients:[c.id]});assert.equal(f.saved.documents[0].signatureDraft.status,'needs_review');
});

test('WhatsApp number preparation saves contact without claiming an active connection',async t=>{
 const f=await fixture(t);await f.portal.workspaceSubmit('whatsapp-onboarding',{phone:'+55 (11) 99999-9999'});assert.equal(f.saved.whatsapp.config.businessPhone,'+5511999999999');assert.ok(f.saved.whatsapp.config.onboardingRequestedAt);assert.equal(f.saved.whatsapp.threads.length,0);
 await f.portal.workspaceSubmit('whatsapp-onboarding',{phone:'123'});assert.equal(f.saved.whatsapp.config.businessPhone,'+5511999999999','invalid number does not overwrite registered contact');
});

test('Hoje uses the empty authenticated agency and keeps COS in a separate drawer',async t=>{
  const f=await fixture(t),main=f.d.querySelector('#portal-main');
  assert.equal(f.portal.state.clients.length,0);
  assert.equal(f.portal.state.trips.length,0);
  assert.match(f.d.querySelector('#breadcrumbs').textContent,/Hoje/);
  assert.doesNotMatch(main.textContent,/Atelier Viagens|Camila Martins|Ana e Pedro|Itália a dois/);
  assert.equal(main.querySelector('#cos-form'),null,'chat is not the primary work area');
  const navigation=f.d.querySelector('#portal-dock').textContent;
  for(const label of ['Hoje','Atendimentos','Clientes','Financeiro','Mais'])assert.ok(navigation.includes(label),'navigation includes '+label);
  const panel=f.d.querySelector('#assistant-panel');
  assert.ok(panel,'shared assistant panel exists');assert.equal(panel.hidden,true);
  click(f,'assistant-toggle');
  assert.equal(panel.hidden,false);
  assert.equal(f.d.querySelectorAll('#cos-form').length,1,'only one chat composer exists');
  assert.ok(panel.querySelector('#cos-form'));
  const input=panel.querySelector('#cos-input');
  input.value='Meu pedido ainda não enviado';
  input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  click(f,'assistant-close');assert.equal(panel.hidden,true);
  click(f,'assistant-toggle');
  assert.equal(f.d.querySelector('#cos-input').value,'Meu pedido ainda não enviado','closing the drawer preserves the draft');
  assert.equal(f.chats.length,0,'opening and closing the assistant does not send a message');
});

test('new attendance saves client and pending trip together without fictional dates or traveler count',async t=>{
  const f=await fixture(t,{pathname:'/atendimentos.html'});
  assert.equal(f.portal.readRoute()[0],'atendimentos');
  await f.portal.workspaceSubmit('attendance',{client:'',name:'Cliente do pedido',phone:'11999990000',request:'Viagem em família; período e quantidade ainda serão combinados.',destination:'Portugal'});
  assert.equal(f.writes.length,1,'the related client and trip are persisted in one workspace write');
  const saved=f.saved;
  assert.equal(saved.clients.length,1);assert.equal(saved.trips.length,1);
  assert.equal(saved.clients[0].name,'Cliente do pedido');
  assert.equal(saved.clients[0].phone,'11999990000');
  const trip=saved.trips[0];
  assert.equal(trip.client,saved.clients[0].id);
  assert.equal(trip.destination,'Portugal');
  assert.equal(trip.datesPending,true);assert.equal(trip.travelersPending,true);
  assert.equal(trip.travelers,1,'legacy schema placeholder is explicitly marked pending');
  assert.ok(!trip.start&&!trip.end,'no invented travel dates');
  assert.equal(trip.value,0,'no invented quote price');
  assert.match(trip.notes,/período e quantidade ainda serão combinados/);
  assert.equal(f.api.version,f.version);
  assert.match(f.d.querySelector('#portal-main').textContent,/A confirmar/i,'the pending traveler count is shown honestly');
});

test('attendance reuses an existing client without duplicating or overwriting its profile',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  const existing={id:'client-existing',name:'Cliente já cadastrado',phone:'11988887777',email:'existing@example.invalid',notes:'Prefere hotéis pequenos.'};
  workspace.clients=[existing];
  const f=await fixture(t,{pathname:'/atendimentos.html',workspace});
  click(f,'new-attendance');
  const form=f.d.querySelector('[data-form="attendance"]');assert.ok(form);
  const clientField=form.elements.namedItem('client');
  clientField.value=existing.id;clientField.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  assert.equal(form.querySelector('#attendance-new-client').hidden,true,'the new-client fields are hidden when reusing a client');
  assert.equal(form.elements.namedItem('name').required,false,'an existing client does not need a second name entry');
  form.elements.namedItem('destination').value='Chile';
  form.elements.namedItem('request').value='Nova viagem de férias para este mesmo cliente.';
  form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>f.saved.trips.length===1,'existing-client attendance saved');
  assert.equal(f.writes.length,1);
  assert.equal(f.saved.clients.length,1);
  assert.deepEqual(f.saved.clients[0],existing,'creating another request preserves the existing contact and preferences');
  assert.equal(f.saved.trips[0].client,existing.id);
  assert.deepEqual(f.saved.trips[0].participants,[existing.id]);
  assert.equal(f.saved.trips[0].destination,'Chile');
});

test('starting a trip from a client profile keeps that client selected',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'client-from-profile',name:'Cliente da ficha',phone:'11911112222',email:'',notes:''}];
  const f=await fixture(t,{pathname:'/cliente.html?id=client-from-profile',workspace});
  click(f,'new-trip');
  const form=f.d.querySelector('[data-form="trip"]');assert.ok(form);
  assert.equal(form.elements.namedItem('client').value,'client-from-profile');
  assert.equal(form.querySelector('#trip-new-client').hidden,true);
  assert.equal(form.elements.namedItem('name').required,false);
  form.elements.namedItem('destination').value='Uruguai';
  form.elements.namedItem('title').value='Viagem ao Uruguai';
  form.elements.namedItem('notes').value='Viagem do cliente já aberto nesta ficha.';
  form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>f.saved.trips.length===1,'attendance created from the client profile');
  assert.equal(f.saved.clients.length,1);
  assert.equal(f.saved.trips[0].client,'client-from-profile');
});

test('proposal creation accepts valid dates, keeps its attendance and rejects a different client',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'proposal-client',name:'Cliente da proposta',phone:'',email:'',notes:''},{id:'other-client',name:'Outro cliente',phone:'',email:'',notes:''}];
  workspace.trips=[{id:'proposal-trip',client:'proposal-client',title:'Pedido de Portugal',destination:'Portugal',start:'',end:'',datesPending:true,travelers:1,travelersPending:true,value:0,status:'Novo pedido',notes:'Pedido original.',reservations:[]}];
  const f=await fixture(t,{pathname:'/viagem.html?id=proposal-trip',workspace});
  await f.portal.workspaceAction('new-budget','proposal-trip');
  assert.match(f.d.querySelector('#dialog-body').textContent,/Nenhuma cotação recebida/);
  const values={name:'Portugal em dezembro',destination:'Portugal',start:'2099-12-03',end:'2099-12-12',travelers:'2',valid:'2099-09-28'};
  await f.portal.workspaceSubmit('sales-receive',{...values,trip:'proposal-trip',reference:'EU-TEST-01',total:'12500',inclusions:'Hotel central\nTraslados',terms:'Condições da cotação.',time:''});
  const quote=f.saved.trips[0].sales.quotes[0];
  await f.portal.workspaceAction('sales-build','proposal-trip|'+quote.id+'|0');
  await waitFor(()=>f.saved.budgets.length===1,'proposal populated from received quote');
  assert.equal(f.saved.budgets[0].items[0].unit,12500);
  assert.deepEqual(f.saved.budgets[0].inclusions,['Hotel central','Traslados']);
  const proposal=f.saved.budgets[0];
  assert.equal(proposal.trip,'proposal-trip');assert.equal(proposal.client,'proposal-client');
  assert.equal(proposal.start,values.start);assert.equal(proposal.end,values.end);assert.equal(proposal.valid,values.valid);
  assert.equal(f.w.location.pathname,'/orcamento.html');
  const editor=f.d.querySelector('#budget-editor');assert.ok(editor);
  const clientControl=editor.elements.namedItem('client');assert.ok(clientControl);
  clientControl.value='other-client';
  editor.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,0));await f.portal.flush();
  assert.equal(f.portal.state.budgets[0].client,'proposal-client','a linked proposal cannot be reassigned to another client');
  assert.equal(f.saved.budgets[0].client,'proposal-client');
  assert.equal(f.saved.budgets[0].trip,'proposal-trip');
  await f.portal.workspaceSubmit('trip',{id:'proposal-trip',title:'Pedido de Portugal',client:'other-client',destination:'Portugal',start:'',end:'',travelers:'',value:'0',status:'Novo pedido',notes:'Tentativa de mudar o cliente do atendimento.'});
  assert.equal(f.portal.state.trips[0].client,'proposal-client','an attendance with a linked proposal cannot switch clients');
  assert.equal(f.saved.trips[0].client,'proposal-client');
  assert.equal(f.saved.budgets[0].client,'proposal-client','the linked proposal and attendance keep the same client');
  const currentEditor=f.d.querySelector('#budget-editor');
  currentEditor.elements.namedItem('client').value='proposal-client';
  click(f,'budget-document');
  await waitFor(()=>f.saved.documents.length===1,'proposal document saved');
  assert.equal(f.saved.documents[0].trip,'proposal-trip','the generated document stays in the same attendance');
  assert.ok(f.saved.documents[0].content.includes('Cliente da proposta'));
  assert.equal(f.saved.documents[0].content.includes('Outro cliente'),false);
});

test('sales flow personalizes the proposal, records adjustment and approval, then releases the paid issued itinerary',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'flow-client',name:'Pessoa de teste',phone:'',email:''}];
  workspace.trips=[{id:'flow-trip',client:'flow-client',title:'Itália em família',destination:'Itália',start:'',end:'',datesPending:true,travelers:1,travelersPending:true,value:0,status:'Novo pedido',notes:'Quatro pessoas, quinze dias.'}];
  const f=await fixture(t,{pathname:'/viagem.html?id=flow-trip',workspace});
  assert.match(f.d.querySelector('#portal-main').textContent,/Fazer cotação/);
  await f.portal.workspaceSubmit('sales-request',{trip:'flow-trip',destination:'Itália',origin:'',start:'',end:'',travelers:'',notes:'Pedido ainda incompleto.',_intent:'save'});
  assert.equal(f.saved.trips[0].sales.request.travelers,null);
  assert.equal(f.saved.trips[0].sales.quotes.length,0,'saving an incomplete request does not invent or send a quote');
  await f.portal.workspaceAction('new-itinerary','flow-trip');
  assert.equal(f.d.querySelector('[data-form="new-itinerary"]'),null);
  await f.portal.workspaceSubmit('sales-receive',{trip:'flow-trip',name:'Itália clássica',reference:'EU-100',destination:'Itália',start:'2099-11-01',end:'2099-11-16',travelers:'4',total:'24000',valid:'2099-10-01',time:'18:00',inclusions:'Voos\nHospedagem\nTraslados',terms:'Condições de teste.'});
  const q=f.saved.trips[0].sales.quotes[0];
  await f.portal.workspaceAction('sales-build','flow-trip|'+q.id+'|0');
  let b=f.saved.budgets[0];assert.equal(b.items[0].unit,24000);assert.equal(b.travelers,4);
  const editor=f.d.querySelector('#budget-editor');editor.elements.namedItem('badge').value='Especial para sua família';editor.elements.namedItem('introduction').value='Uma viagem no seu ritmo.';editor.elements.namedItem('appearance').value='warm';
  await f.portal.workspaceAction('sales-preview',b.id);
  assert.equal(f.d.querySelector('.proposal-pdf-preview').getAttribute('src'),'blob:http://localhost/test-proposal');
  assert.equal(f.saved.budgets[0].badge,'Especial para sua família');
  assert.equal(f.saved.budgets[0].introduction,'Uma viagem no seu ritmo.');
  await f.portal.workspaceSubmit('sales-decision',{id:b.id,event:'sent',note:'Enviada pelo WhatsApp.'});
  assert.equal(f.saved.budgets[0].status,'Aguardando aprovação');
  await f.portal.workspaceSubmit('sales-decision',{id:b.id,event:'adjustment',note:'Cliente pediu outro título.'});
  assert.equal(f.saved.budgets[0].status,'Ajuste solicitado');
  f.d.querySelector('#budget-editor [name="name"]').value='Itália para a família';
  await f.portal.workspaceAction('budget-save');
  assert.equal(f.saved.budgets[0].status,'Rascunho');
  await f.portal.workspaceSubmit('sales-decision',{id:b.id,event:'sent',note:'Revisão enviada.'});
  await f.portal.workspaceSubmit('sales-decision',{id:b.id,event:'approved',note:'Cliente confirmou por mensagem.'});
  assert.equal(f.saved.trips[0].status,'Em reserva');
  await f.portal.workspaceSubmit('sales-fulfillment',{trip:'flow-trip',reference:'RES-100',reservation:'held',payment:'pending',emission:'pending',deadline:'2099-10-01T20:00',paymentUrl:'https://pay.example.invalid/100',evidence:'Reserva consultada na operadora.'});
  assert.equal(f.w.TravelSalesFlow.canItinerary(f.saved.trips[0]),false);
  await f.portal.workspaceSubmit('sales-fulfillment',{trip:'flow-trip',reference:'RES-100',reservation:'confirmed',payment:'paid',emission:'issued',deadline:'2099-10-01T20:00',paymentUrl:'https://pay.example.invalid/100',evidence:'Pagamento e emissão confirmados.'});
  assert.equal(f.saved.trips[0].status,'Confirmada');
  await f.portal.workspaceAction('new-itinerary','flow-trip');
  assert.ok(f.d.querySelector('[data-form="new-itinerary"]'));
  assert.equal(f.saved.transactions.length,0,'operator payment does not fabricate an agency receipt');
});

test('historical confirmed attendance leads to documents without restarting a sale or changing stored data',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'history-client',name:'Cliente de teste',phone:'',email:''}];
  workspace.trips=[{id:'history-trip',client:'history-client',title:'Seguro Chile 2024',destination:'Chile',start:'2024-07-30',end:'2024-08-05',travelers:1,value:0,status:'Confirmada',notes:'Período de cobertura, não datas de deslocamento.',reservations:[]}];
  workspace.documents=[{id:'history-doc',trip:'history-trip',name:'Apólice de teste',type:'Seguro viagem',content:'Registro de teste.'}];
  workspace.events=[{id:'old-event',trip:'history-trip',title:'Retorno anterior',date:'2024-07-20',time:'10:00',completed:false},{id:'future-event',trip:'history-trip',title:'Conferência futura',date:'2099-01-01',time:'11:00',completed:false}];
  const f=await fixture(t,{pathname:'/viagem.html?id=history-trip',workspace});
  const before=f.saved,panel=f.d.querySelector('#attendance-content');
  assert.ok(panel.firstElementChild.matches('.attendance-guidance'),'guidance precedes supporting records');
  assert.match(panel.textContent,/O período registrado já passou/);
  assert.match(f.d.querySelector('.attendance-meta').textContent,/1 viajante/);
  assert.doesNotMatch(panel.textContent,/Comece pela cotação|Fazer cotação/);
  assert.equal(panel.querySelectorAll('.primary-button').length,1);
  assert.equal(panel.querySelector('[aria-current="step"]'),null,'historical records do not invent a sales stage');
  assert.match(panel.querySelector('.attendance-past-events').textContent,/Retorno anterior/);
  assert.doesNotMatch(panel.querySelector('.attendance-past-events').textContent,/Conferência futura/);
  f.d.querySelector('.attendance-guidance .primary-button').click();
  await waitFor(()=>f.d.querySelector('#attendance-tab-materials')?.getAttribute('aria-selected')==='true','historical documents tab');
  assert.match(f.d.querySelector('#attendance-content').textContent,/Apólice de teste/);
  assert.equal(f.writes.length,0);assert.deepEqual(f.saved,before);
});

test('confirmed attendance without a sales history opens existing services, while a new request starts one quote',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'legacy-client',name:'Cliente de teste',phone:'',email:''}];
  workspace.trips=[{id:'legacy-trip',client:'legacy-client',title:'Viagem confirmada',destination:'Chile',start:'2099-07-30',end:'2099-08-05',travelers:2,value:0,status:'Confirmada',notes:'',reservations:[]}];
  const f=await fixture(t,{pathname:'/viagem.html?id=legacy-trip',workspace});
  assert.match(f.d.querySelector('.attendance-guidance').textContent,/Confira os serviços já registrados/);
  f.d.querySelector('.attendance-guidance .primary-button').click();
  await waitFor(()=>f.d.querySelector('#attendance-tab-services')?.getAttribute('aria-selected')==='true','existing services tab');
  assert.match(f.d.querySelector('#attendance-content').textContent,/Reservas e serviços/);
  workspace.trips[0].status='Novo pedido';
  const fresh=await fixture(t,{pathname:'/viagem.html?id=legacy-trip',workspace});
  assert.equal(fresh.d.querySelectorAll('#attendance-content [data-action="sales-quote"]').length,1);
  assert.match(fresh.d.querySelector('[aria-current="step"]').textContent,/Cotação/);
  click(fresh,'sales-quote');await waitFor(()=>fresh.d.querySelector('[data-form="sales-request"]'),'new quote form');
  assert.equal(f.writes.length,0);
});

test('attendance respects advanced sales evidence, pending dates and closed statuses without inventing completed steps',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.clients=[{id:'stage-client',name:'Cliente de teste',phone:'',email:''}];
  workspace.trips=[{id:'stage-trip',client:'stage-client',title:'Pedido',destination:'Chile',start:'',end:'2024-08-05',datesPending:true,travelers:1,value:0,status:'Em reserva',notes:'',sales:{budgetId:'stage-budget',quotes:[]}}];
  workspace.budgets=[{id:'stage-budget',trip:'stage-trip',client:'stage-client',name:'Proposta',status:'Aprovada',items:[]}];
  const f=await fixture(t,{pathname:'/viagem.html?id=stage-trip',workspace});
  const t1=f.portal.state.trips[0],b=f.portal.state.budgets[0];
  assert.match(f.d.querySelector('.attendance-guidance').textContent,/Acompanhe a reserva/);
  assert.match(f.d.querySelector('[aria-current="step"]').textContent,/Reserva e emissão/);
  assert.equal(f.d.querySelector('.sales-flow li.past'),null);
  for(const [status,action] of [['Aguardando aprovação','sales-decision'],['Rascunho','sales-budget']]){
    b.status=status;f.portal.render();
    assert.equal(f.d.querySelector('.attendance-guidance .primary-button').dataset.action,action);
  }
  b.status='Aprovada';t1.sales.fulfillment={reservation:'confirmed',payment:'paid',emission:'issued'};f.portal.render();
  assert.equal(f.d.querySelector('.attendance-guidance .primary-button').dataset.action,'new-itinerary');
  t1.status='Cancelada';f.portal.render();
  assert.match(f.d.querySelector('.attendance-guidance').textContent,/Consulte o histórico/);
  assert.equal(f.d.querySelector('[aria-current="step"]'),null);
  assert.equal(f.writes.length,0);
});

test('uploading an attachment through COS keeps the main editor and its unsaved text',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  workspace.documents=[{id:'document-open-during-upload',name:'Documento aberto',type:'Modelo',trip:'',status:'Rascunho',content:'Texto salvo.'}];
  const f=await fixture(t,{pathname:'/documento.html?id=document-open-during-upload',workspace});
  const editor=f.d.querySelector('#document-content');assert.ok(editor);
  editor.value='Revisão local que ainda não foi salva pelo formulário.';
  click(f,'assistant-toggle');click(f,'attach');
  const picker=f.d.querySelector('#attachment-picker');
  const file=new f.w.File(['%PDF-1.4\nsynthetic test attachment'], 'cotacao-de-teste.pdf',{type:'application/pdf'});
  Object.defineProperty(picker,'files',{configurable:true,value:[file]});
  picker.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  await waitFor(()=>f.portal.state.attachment?.name===file.name,'assistant attachment uploaded and selected');
  assert.equal(f.uploads.length,1);
  assert.equal(f.w.location.pathname,'/documento.html');
  assert.equal(new URLSearchParams(f.w.location.search).get('id'),'document-open-during-upload');
  assert.strictEqual(f.d.querySelector('#document-content'),editor,'upload must not navigate or rerender the main editor');
  assert.equal(editor.value,'Revisão local que ainda não foi salva pelo formulário.');
  assert.equal(f.saved.documents.length,2,'the original upload is still saved as an agency document');
  assert.ok(f.saved.documents.some(document=>document.file?.name===file.name));
  assert.equal(f.d.querySelector('#assistant-panel').hidden,false);
});

test('completing an agenda commitment saves its history and removes it from Hoje priorities',async t=>{
  const workspace=JSON.parse(read('backend/initial-state.json'));
  const event={id:'event-to-complete',title:'Retornar sobre os hotéis escolhidos',date:'2020-01-02',time:'09:30',type:'Retorno',trip:''};
  workspace.events=[event];
  const f=await fixture(t,{workspace}),main=f.d.querySelector('#portal-main');
  assert.ok(main.textContent.includes(event.title),'a pending past commitment is visible for review');
  assert.ok(f.w.TravelOperations.model({state:f.portal.state}).priorities.some(item=>item.id==='event:'+event.id));
  await f.portal.workspaceAction('event-detail',event.id);
  const dialog=f.d.querySelector('#portal-dialog');assert.equal(dialog.open,true);
  click(f,'complete-event');
  await waitFor(()=>f.saved.events[0].completed===true,'completed commitment saved');
  assert.equal(dialog.open,false);
  assert.equal(f.saved.events.length,1,'completing preserves the record instead of deleting history');
  assert.equal(f.saved.events[0].title,event.title);
  assert.equal(f.w.TravelOperations.model({state:f.portal.state}).priorities.some(item=>item.id==='event:'+event.id),false);
  assert.equal(main.textContent.includes(event.title),false,'the completed commitment leaves the priority list');
});

test('existing portal and entity URLs still resolve after the operations navigation change',async t=>{
  const f=await fixture(t);
  const expected=[['/portal.html','inicio'],['/atendimentos.html','atendimentos'],['/clientes.html','clientes'],['/financeiro.html','financeiro'],['/roteiros.html','roteiros'],['/documentos.html','documentos'],['/cotacao.html','cotacao'],['/orcamentos.html','orcamentos'],['/agenda.html','agenda'],['/viagem.html?id=trip-existing','viagem','trip-existing'],['/cliente.html?id=client-existing','cliente','client-existing'],['/roteiro.html?id=itinerary-existing','roteiro','itinerary-existing'],['/portal.html#documento/document-existing','documento','document-existing']];
  for(const [url,route,id]of expected){
    f.w.history.replaceState({},'',url);
    const actual=f.portal.readRoute();assert.equal(actual[0],route,url);
    if(id)assert.equal(actual[1],id,url);
  }
  f.w.history.replaceState({},'','/atendimentos.html');f.portal.render();
  assert.doesNotMatch(f.d.querySelector('#portal-main').textContent,/Atelier Viagens|Camila Martins|Ana e Pedro|Itália a dois/);
});

test('COS response preserves an open editor, blocks concurrent sends and leaves local edits persistable',async t=>{
  let finishChat;
  const chatGate=new Promise(resolve=>{finishChat=resolve;});
  t.after(()=>finishChat());
  const f=await fixture(t,{chatGate});
  f.portal.state.documents.push({id:'editor-document',name:'Documento em edição',type:'Modelo',trip:'',status:'Rascunho',content:'Texto salvo anteriormente.'});
  await f.portal.flush();
  f.w.history.replaceState({},'','/documento.html?id=editor-document');f.portal.render();
  const editor=f.d.querySelector('#document-content');assert.ok(editor);
  editor.value='Texto alterado no editor e ainda não enviado pelo formulário.';
  click(f,'assistant-toggle');
  const input=f.d.querySelector('#cos-input');input.value='Ajude a organizar os próximos passos.';
  input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  const firstSend=f.portal.sendCos();
  await waitFor(()=>f.chats.length===1,'first COS request');
  const secondSend=f.portal.sendCos();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(f.chats.length,1,'a second call while waiting cannot post another request');
  f.portal.state.clients.push({id:'client-added-during-chat',name:'Contato local concorrente',email:'',phone:'',notes:'Ainda precisa ser salvo.'});
  finishChat();await Promise.all([firstSend,secondSend]);
  assert.strictEqual(f.d.querySelector('#document-content'),editor,'COS response must not replace the main editor DOM');
  assert.equal(editor.value,'Texto alterado no editor e ainda não enviado pelo formulário.');
  assert.equal(f.portal.state.clients.some(client=>client.id==='client-added-during-chat'),true,'local edits survive the chat response');
  assert.ok(f.d.querySelector('#assistant-panel').textContent.includes('Abra o roteiro da viagem'));
  await f.portal.flush();
  assert.equal(f.saved.clients.some(client=>client.id==='client-added-during-chat'),true,'chat baseline must not mark unrelated local changes as already saved');
  assert.equal(f.saved.messages.length,2);
});

const intakeReview=()=>({requestId:randomUUID(),action:'attendance',clientId:'intake-existing-client',draft:{name:'',phone:'',email:'',destination:'Portugal',start:'',end:'',travelers:null,notes:'Pedido revisado.'}});
const intakeWorkspace=()=>({...JSON.parse(read('backend/initial-state.json')),clients:[{id:'intake-existing-client',name:'Cliente existente',phone:'',email:'',notes:'Informação antiga.'}]});

test('intake retry recovers a lost response and remote edits without an extra workspace write',async t=>{
  const f=await fixture(t,{workspace:intakeWorkspace(),dropFirstIntakeResponse:true});
  const review=intakeReview();
  await assert.rejects(f.portal.executeIntake(review),error=>error.status===0);
  assert.equal(f.saved.trips.length,1,'the original request committed before the synthetic response loss');
  const tripId=f.saved.trips[0].id;
  f.remoteUpdate(remote=>{
    remote.clients[0].notes='Correção salva por outra pessoa da agência.';
    remote.documents.push({id:'remote-document',name:'Material adicionado em outra aba',trip:'',content:'Conteúdo preservado.'});
  });
  const expected=f.saved;
  const result=await f.portal.executeIntake(review);
  assert.equal(result.replayed,true);
  assert.equal(result.tripId,tripId);
  assert.equal(f.portal.state.clients[0].notes,expected.clients[0].notes);
  assert.deepEqual(clone(f.portal.state.documents),expected.documents,'a replay imports current remote collections, not only new client/trip IDs');
  assert.equal(f.portal.state.trips.length,1);
  assert.equal(f.portal.state.intakeReceipts.length,1);
  assert.equal(f.api.version,f.version);
  await f.portal.flush();
  assert.equal(f.writes.length,0,'replay must not rewrite remote changes with a stale local snapshot');
  assert.deepEqual(f.saved,expected);
});

test('intake replay with concurrent local edits reports a conflict and preserves both copies',async t=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  t.after(()=>release());
  const f=await fixture(t,{workspace:intakeWorkspace(),dropFirstIntakeResponse:true,intakeGate:count=>count===2?gate:undefined});
  const review=intakeReview();
  await assert.rejects(f.portal.executeIntake(review),error=>error.status===0);
  f.remoteUpdate(remote=>{remote.clients[0].notes='Correção remota posterior.';});
  const remoteBefore=f.saved,localVersion=f.api.version;
  const retry=f.portal.executeIntake(review);
  await waitFor(()=>f.intakes.length===2,'intake retry waiting for response');
  f.portal.state.clients[0].notes='Edição local enquanto aguardava a confirmação.';
  release();
  await assert.rejects(retry,error=>error.status===409);
  assert.equal(f.portal.state.clients[0].notes,'Edição local enquanto aguardava a confirmação.');
  assert.deepEqual(f.saved,remoteBefore,'conflict must not overwrite the other access');
  assert.equal(f.api.version,localVersion,'conflict must not promote a remote version onto stale local data');
  assert.equal(f.writes.length,0);
  assert.equal(f.d.querySelector('#backend-recover').hidden,false,'the user receives the existing export/reload recovery path');
});

test('a pending intake review guards page unload even when the workspace itself is clean',async t=>{
  const f=await fixture(t,{intake:true});
  const cleanUnload=new f.w.Event('beforeunload',{cancelable:true});
  f.w.dispatchEvent(cleanUnload);
  assert.equal(cleanUnload.defaultPrevented,false,'an untouched clean workspace does not warn');
  await f.portal.workspaceAction('assistant-intake');
  const manual=f.d.querySelector('[data-intake="manual"]');assert.ok(manual);manual.click();
  assert.ok(f.d.querySelector('#intake-review-form'));
  assert.equal(f.writes.length,0,'opening a review does not save a client or attendance');
  assert.equal(f.saved.clients.length,0);
  const pendingUnload=new f.w.Event('beforeunload',{cancelable:true});
  f.w.dispatchEvent(pendingUnload);
  assert.equal(pendingUnload.defaultPrevented,true,'the transient review and retry context need an unload warning');
  f.d.querySelector('[data-intake="cancel"]').click();
  const discardedUnload=new f.w.Event('beforeunload',{cancelable:true});
  f.w.dispatchEvent(discardedUnload);
  assert.equal(discardedUnload.defaultPrevented,false,'discarding an empty review removes the warning');
});
test('standalone quotation persists without creating CRM records and validates totals and dates',async t=>{
  const f=await fixture(t,{pathname:'/cotacao.html'});
  const draft={name:'Lisboa <especial>',origin:'São Paulo',destination:'Lisboa',start:'2027-04-10',end:'2027-04-18',travelers:'2',valid:'2027-03-01',total:'12500',inclusions:'Voos\nHotel',terms:'<script>alert(1)</script>',reference:''};
  await f.portal.workspaceSubmit('sales-quick',draft);
  assert.equal(f.saved.clients.length,0);assert.equal(f.saved.trips.length,0);assert.equal(f.saved.budgets.length,0);
  assert.equal(f.saved.quickQuotes.length,1);assert.equal(f.saved.quickQuotes[0].offers[0].total,12500);
  assert.match(f.d.querySelector('#dialog-body').textContent,/12.500,00/);assert.equal(f.d.querySelector('#dialog-body script'),null);
  const id=f.saved.quickQuotes[0].id;
  let exported,filename;f.w.URL.createObjectURL=blob=>{exported=blob;return 'blob:test';};f.w.URL.revokeObjectURL=()=>{};f.w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
  await f.portal.workspaceAction('sales-quick-download',id);
  assert.equal(filename,'Lisboa especial.html');
  const html=await new Promise(resolve=>{const reader=new f.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(exported);});
  assert.match(html,/12.500,00/);assert.ok(!html.includes('<script>alert(1)</script>'));assert.match(html,/&lt;script&gt;/);
  await f.portal.workspaceSubmit('sales-quick',{...draft,id,total:'13000'});
  assert.equal(f.saved.quickQuotes.length,1);assert.equal(f.saved.quickQuotes[0].offers[0].total,13000);
  await f.portal.workspaceSubmit('sales-quick',{...draft,travelers:'1.5'});assert.equal(f.saved.quickQuotes.length,1);
  await f.portal.workspaceSubmit('sales-quick',{...draft,end:'2027-04-01'});assert.equal(f.saved.quickQuotes.length,1);
  const reopened=await fixture(t,{pathname:'/cotacao.html',workspace:f.saved});
  assert.match(reopened.d.querySelector('#portal-main').textContent,/Lisboa <especial>/);
  const invalid=clone(f.saved);invalid.quickQuotes[0].offers[0].total=-1;assert.throws(()=>validateState(invalid));
});

test('client status, search and recoverable deletion preserve trip, document and referral history',async t=>{
  const f=await fixture(t,{pathname:'/clientes.html'});
  await f.portal.workspaceSubmit('attendance',{client:'',name:'Ágata Costa',phone:'123',request:'Pedido',destination:'Portugal'});
  const c=f.saved.clients[0],trip=f.saved.trips[0];
  await f.portal.workspaceSubmit('client',{id:c.id,name:c.name,email:'',phone:'123',notes:'',status:'Inativo'});
  await f.portal.workspaceSubmit('client',{name:'Indicada',email:'',phone:'',notes:'',referredBy:c.id});
  await f.portal.workspaceSubmit('new-document',{name:'Documento',type:'Arquivo',trip:trip.id,base:'',_clients:[c.id]});
  await f.portal.workspaceSubmit('delete-client',{id:c.id});
  assert.ok(f.saved.clients.find(x=>x.id===c.id).deletedAt);assert.equal(f.saved.trips[0].client,c.id);
  assert.equal(f.saved.documents[0].clients[0],c.id);assert.equal(f.saved.clients[1].referredBy,c.id);
  const filter=f.d.querySelector('#operations-client-filter');filter.value='deleted';filter.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  assert.match(f.d.querySelector('#operations-client-results').textContent,/Ágata Costa/);
  const search=f.d.querySelector('#operations-client-search');search.value='agata';search.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.match(f.d.querySelector('#operations-client-results').textContent,/Restaurar/);
  await f.portal.workspaceAction('restore-client',c.id);assert.equal(f.saved.clients[0].deletedAt,undefined);assert.equal(f.saved.clients[0].status,'Inativo');
});

test('document preview uses unsaved text without overwriting source proposal or saved document',async t=>{
  const initial=JSON.parse(read('backend/initial-state.json'));
  initial.clients=[{id:'c',name:'Cliente',email:'',phone:''}];
  initial.budgets=[{id:'b',client:'c',name:'Lisboa',destination:'Lisboa',start:'2027-04-01',end:'2027-04-10',valid:'2027-03-01',travelers:2,items:[{name:'Hotel',qty:1,unit:1000}],discount:0,status:'Rascunho'}];
  initial.documents=[{id:'d',name:'Proposta · Lisboa',budgetId:'b',type:'Proposta',content:'Texto salvo',status:'Rascunho',clients:['c'],trip:''}];
  const f=await fixture(t,{pathname:'/documento.html?id=d',workspace:initial});
  assert.match(f.d.querySelector('.document-source-note').textContent,/Editar proposta original/);
  const content=f.d.querySelector('#document-content');content.value='Texto revisado <b>sem HTML</b>';
  await f.portal.workspaceAction('preview-document');
  assert.match(f.d.querySelector('.document-text-preview').textContent,/Texto revisado <b>sem HTML<\/b>/);
  assert.equal(f.d.querySelector('.document-text-preview b'),null);assert.equal(content.value,'Texto revisado <b>sem HTML</b>');
  assert.equal(f.saved.documents[0].content,'Texto salvo');assert.equal(f.saved.budgets[0].items[0].unit,1000);
});

test('reports open from Clients and Trips without saving workspace changes',async t=>{
 for(const [pathname,action] of [['/clientes.html','report-clients'],['/viagens.html','report-trips']]){
  const f=await fixture(t,{pathname});assert.ok(f.d.querySelector('[data-action="'+action+'"]'));const before=f.writes.length;
  await f.portal.workspaceAction(action,'todas');assert.ok(f.d.querySelector('#report-root iframe'));assert.equal(f.d.querySelector('#portal-dialog').open,true);assert.equal(f.writes.length,before);
 }
});

test('ecosystem tools provide a unified entry and a scoped record picker',async t=>{
 for(const [pathname,target,origin] of [['/travelmatch.html','travelmatch','https://travelmatch-bice.vercel.app'],['/vuei.html','vuei','https://www.meuvuei.com']]){
  const f=await fixture(t,{pathname});const entry=f.d.querySelector('a[href="'+origin+'/api/travelpro/start"]');assert.ok(entry);assert.ok(f.d.querySelector('[data-ecosystem-record]'));assert.equal(f.d.querySelector('[data-action="ecosystem-import"]').dataset.id,target);
 }
 const consent=await fixture(t,{pathname:'/vuei.html?connect=1&challenge=test&state=test&record=one'});assert.ok(consent.d.querySelector('[data-action="ecosystem-authorize"]'));assert.match(consent.d.querySelector('#portal-main').textContent,/rascunho|privada/);
});

test('validation notices remain visible inside the active modal and reset on reopen',async t=>{
 const f=await fixture(t,{pathname:'/seguranca.html'});
 await f.portal.workspaceAction('backend-password');
 const form=f.d.querySelector('[data-form="backend-password"]');
 const request=f.api.request;let passwordRequests=0;
 f.api.request=async(route,options)=>{if(route==='/auth/password')passwordRequests++;return request(route,options);};
 await f.portal.workspaceSubmit('backend-password',{current:'unused',password:'different-one',confirm:'different-two'},form);
 const notice=f.d.querySelector('[data-dialog-notice]');
 assert.equal(f.d.querySelector('#portal-dialog').open,true);
 assert.equal(notice.hidden,false);
 assert.match(notice.textContent,/As senhas precisam ser iguais/);
 assert.equal(passwordRequests,0);
 await f.portal.workspaceAction('backend-password');
 assert.equal(f.d.querySelector('[data-dialog-notice]').hidden,true);
});
