import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const scripts=['portal-workflow.js','reports.js'].map(f=>fs.readFileSync(new URL('../dist/'+f,import.meta.url),'utf8'));
const ctx={};ctx.window=ctx;scripts.forEach(s=>vm.runInNewContext(s,ctx));
const reports=ctx.window.TravelReports;
const state={agency:'Agência <teste>',clients:[{id:'a',name:'Júlia',status:'Ativo',relationship:'Fidelizado',notes:'<script>alert(1)</script>'},{id:'b',name:'Ana',status:'Inativo'},{id:'c',name:'Excluído',deletedAt:'2026-01-01'}],trips:[{id:'t',title:'Lisboa',destination:'Portugal',client:'a',participants:['b'],status:'Confirmada',start:'2099-01-01',end:'2099-01-10',value:1200},{id:'p',title:'Pendente',client:'b',status:'Confirmada',datesPending:true},{id:'q',title:'Cotação',client:'a',status:'Em cotação'}],documents:[{name:'Passaporte.pdf',clients:['a']}]};
test('reports filter clients, exclude deleted by default and do not mutate the workspace',()=>{
 const before=JSON.stringify(state);
 assert.deepEqual(Array.from(reports.select(state,'clients',{scope:'all'}),c=>c.id),['b','a']);
 assert.deepEqual(Array.from(reports.select(state,'clients',{scope:'filtered',query:'julia',status:'Ativo',relationship:'Fidelizado'}),c=>c.id),['a']);
 assert.deepEqual(Array.from(reports.select(state,'clients',{scope:'filtered',status:'deleted'}),c=>c.id),['c']);
 const html=reports.html(state,'clients',{scope:'all'});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Passaporte.pdf'));
 assert.equal(JSON.stringify(state),before);
});
test('trip reports respect the operational universe, participants and overlapping periods',()=>{
 assert.deepEqual(Array.from(reports.select(state,'trips',{scope:'all'}),t=>t.id),['t','p']);
 assert.deepEqual(Array.from(reports.select(state,'trips',{scope:'filtered',client:'b',from:'2099-01-05',to:'2099-01-06',query:'portugal',stage:'confirmadas'}),t=>t.id),['t']);
 assert.equal(reports.select(state,'trips',{scope:'filtered',from:'2099-02-01'}).length,0);
 assert.ok(!reports.html(state,'trips',{layout:'summary'}).includes('<section class="details">'));
 assert.ok(reports.html(state,'trips',{}).includes('Não representam recebimentos'));
});
test('report controls refresh preview, reject reversed dates, and disable empty exports',t=>{
 const dom=new JSDOM('<div id="root"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());scripts.forEach(s=>dom.window.eval(s));
 const root=dom.window.document.querySelector('#root');dom.window.TravelReports.mount(root,{state,type:'trips'});
 const change=(name,value)=>{const el=root.querySelector('[name="'+name+'"]');el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 assert.match(root.querySelector('[data-report-count]').textContent,/2 registros/);
 change('scope','filtered');change('from','2099-02-01');change('to','2099-01-01');
 assert.equal(root.querySelector('[data-report-error]').hidden,false);assert.equal(root.querySelector('button').disabled,true);
 change('to','2099-02-05');assert.match(root.querySelector('[data-report-count]').textContent,/0 registros/);assert.equal(root.querySelector('button').disabled,true);
 change('scope','all');assert.match(root.querySelector('[data-report-count]').textContent,/2 registros/);assert.equal(root.querySelector('[data-report-error]').hidden,true);
 const frame=root.querySelector('iframe');frame.dispatchEvent(new dom.window.Event('load'));assert.equal(root.querySelector('button').disabled,false);
 let printed=0;frame.contentWindow.focus=()=>{};frame.contentWindow.print=()=>printed++;root.querySelector('button').click();assert.equal(printed,1);
});
