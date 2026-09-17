import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createApp} from '../backend/app.mjs';

test('finance interface submits real forms and preserves safe rendering through payment lifecycle',async t=>{
 const app=createApp({directory:mkdtempSync(path.join(tmpdir(),'travelpro-fin-ui-')),dist:path.resolve('dist'),env:{}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);
 let cookie='',csrf='';
 const api={async request(p,{method='GET',body}={}){const response=await fetch(origin+'/api'+p,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const data=await response.json();if(data.csrf)csrf=data.csrf;if(!response.ok)throw Object.assign(new Error(data.error),{status:response.status});return data;}};
 await api.request('/auth/register',{method:'POST',body:{name:'Finance test',agency:'UI test',email:'ui@example.invalid',password:'temporary-ui-password'}});
 const dom=new JSDOM('<main data-fin-root><p data-fin-notice></p></main>',{url:origin,runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window,d=w.document,root=d.querySelector('main');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval(readFileSync('dist/finance.js','utf8'));w.TravelFinance.mount(root,{api,trips:[]});
 async function waitFor(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw new Error('UI timeout: '+d.body.textContent);}
 const click=(action,id)=>{const b=d.querySelector(`[data-fin-action="${action}"]${id?`[data-id="${id}"]`:''}`);assert.ok(b,'button '+action);b.click();};
 const submit=async(kind,values)=>{const form=d.querySelector(`[data-fin-form="${kind}"]`);assert.ok(form,'form '+kind);for(const [name,value]of Object.entries(values))form.elements.namedItem(name).value=value;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>!form.isConnected);};
 await waitFor(()=>d.querySelector('[data-fin-action="new"]'));
 click('tab','catalogs');click('catalog-new','account');
 await submit('catalog',{name:'Conta UI',openingAmount:'0',openingDate:'2026-01-01'});
 await waitFor(()=>!d.querySelector('dialog').open&&root.textContent.includes('Conta UI'));
 const account=(await api.request('/finance')).catalogs[0];
 click('new');await submit('entry',{title:'<img src=x onerror=alert(1)>',amount:'100',installments:'1',dueDate:'2026-01-31',competenceDate:'2026-01-31',accountId:account.id});
 await waitFor(()=>d.querySelector('[data-fin-notice]')?.textContent==='Alteração salva.'&&!d.querySelector('dialog').open);
 click('tab','entries');await submit('filter',{from:'2026-01-01',to:'2026-12-31'});
 await waitFor(()=>root.textContent.includes('<img src=x onerror=alert(1)>'));assert.equal(root.querySelector('img'),null);
 click('detail');await waitFor(()=>d.querySelector('[data-fin-action="pay"]'));
 click('pay');await submit('payment',{amount:'40',date:'2026-02-01',note:'Recebimento parcial'});
 await waitFor(()=>!d.querySelector('dialog').open&&root.textContent.includes('Parcial'));
 click('detail');await waitFor(()=>d.querySelector('[data-fin-action="reverse"]'));
 click('reverse');await submit('reason',{reason:'Baixa duplicada'});
 await waitFor(()=>!d.querySelector('dialog').open&&!root.querySelector('.fin-partial'));
 click('tab','flow');assert.ok(root.textContent.includes('Resultado previsto'));
 click('tab','catalogs');assert.ok(root.textContent.includes('Conta UI'));
 for(const page of ['portal.html','financeiro.html','clientes.html']){const html=readFileSync('dist/'+page,'utf8');assert.ok(html.indexOf('src="finance.js')<html.indexOf('src="portal.js'));assert.ok(html.includes('href="finance.css'));}
});
