import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {itineraryModels} from '../backend/validation.mjs';
import {documentOperation,applyDocumentOperation} from '../backend/cos-support.mjs';
import {readFileSync} from 'node:fs';
const seed=()=>({...JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url))),agency:'Agência de teste'});
test('premium catalog adds two layouts without changing existing templates or records',()=>{
  const state=seed();state.templates.push({id:'wifes-original',name:'Original da agência',file:{id:'private/file.pdf'}});
  const before=structuredClone(state),all=itineraryModels.catalog(state.templates);
  assert.equal(all.length,state.templates.length+2);assert.deepEqual(state,before);
  assert.equal(all.find(t=>t.id==='wifes-original').file.id,'private/file.pdf');
  assert.equal(itineraryModels.catalog(all).length,all.length);
  assert.notEqual(all.at(-1).layout,all.at(-2).layout);
});
test('both print layouts contain agency branding, partner logos and escaped traveler content',()=>{
  for(const model of itineraryModels.models){
    const html=itineraryModels.render({name:'<script>alert(1)</script>',destination:'Itália',days:[{period:'Dia 1',title:'Chegada',text:'<img src=x onerror=alert(1)>\nOrientação confirmada'}]},model,{agency:'Minha agência',brand:{primary:'#ef2850',secondary:'#a31652'},base:'https://travelpro.test/'});
    const dom=new JSDOM(html),d=dom.window.document;
    assert.equal(d.querySelectorAll('script').length,0);assert.equal(d.querySelectorAll('[onerror]').length,0);
    assert.match(d.querySelector('.details').textContent,/<img/);
    assert.match(d.querySelector('style').textContent,/linear-gradient/);
    assert.equal(d.querySelectorAll('.partners img').length,2);
    assert.ok(d.querySelector('main.'+model.layout));dom.window.close();
  }
});
test('COS links an existing private file without duplicates or removal of previous links',()=>{
  const state=seed();state.clients=[{id:'a',name:'Ana Lima',phone:'',email:''},{id:'b',name:'Bruna Silva',phone:'',email:''}];
  state.documents=[{id:'doc',name:'passaporte.pdf',type:'Anexo',content:'',clients:['b'],trip:'',file:{id:'private/original.pdf'}}];
  const before=structuredClone(state),draft=documentOperation(state,{text:'Anexe esse passaporte à Ana Lima',attachmentId:'private/original.pdf'});
  assert.equal(draft.clientId,'a');assert.equal(draft.type,'Passaporte');assert.deepEqual(state,before);
  const next=applyDocumentOperation(state,draft).state;
  assert.deepEqual(next.documents[0].clients,['b','a']);assert.deepEqual(next.documents[0].file,before.documents[0].file);
  assert.deepEqual(applyDocumentOperation(next,draft).state,next);
  assert.throws(()=>documentOperation(state,{attachmentId:'foreign-file'}),/não foi encontrado/);
  assert.throws(()=>applyDocumentOperation(state,{...draft,clientId:'foreign-client'}),/cliente da agência/);
});
test('COS asks to choose when names are ambiguous and refuses a client outside the trip',()=>{
  const state=seed();state.clients=[{id:'a',name:'Ana Lima',phone:'',email:''},{id:'b',name:'Ana Lima',phone:'',email:''}];
  state.documents=[{id:'doc',name:'Seguro.pdf',type:'Anexo',content:'',file:{id:'file'}}];
  state.trips=[{id:'trip',client:'b',title:'Viagem',destination:'Roma',datesPending:true,start:'',end:'',travelers:1,value:0}];
  const draft=documentOperation(state,{text:'Seguro de Ana Lima',attachmentId:'file'});
  assert.equal(draft.clientId,'');
  assert.throws(()=>applyDocumentOperation(state,{...draft,clientId:'a',tripId:'trip'}),/não participa/);
});
