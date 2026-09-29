import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../dist/portal-fields.js',import.meta.url),'utf8');
test('Brazilian money entry keeps numeric form payloads and rejects ambiguous cents',t=>{
 const dom=new JSDOM('<form><label><span>Valor</span><input name="amount" type="number" min="0.01" step="0.01" required value="1250.5"></label><input name="travelers" type="number" value="2"></form>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;w.eval(source);
 const display=w.document.querySelector('.portal-currency input'),original=w.document.querySelector('[name=amount]');assert.equal(display.value,'1.250,50');assert.equal(w.document.querySelector('[name=travelers]').hidden,false);
 display.value='23.456,78';display.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(original.value,'23456.78');assert.equal(new w.FormData(w.document.querySelector('form')).get('amount'),'23456.78');
 for(const invalid of ['1,234','12.34','NaN','-1,00']){display.value=invalid;display.dispatchEvent(new w.Event('input'));assert.equal(display.checkValidity(),false,invalid);}
 display.value='0,01';display.dispatchEvent(new w.Event('input'));assert.equal(display.checkValidity(),true);assert.equal(original.value,'0.01');
});
test('search preserves current selection and supports accented categories',t=>{
 const dom=new JSDOM('<label><span>Tipo</span><select name="type">'+['Contrato','Passaporte','RG','CPF','Visto','Seguro','Reserva','Vacinação','Outro'].map(x=>`<option>${x}</option>`).join('')+'</select></label>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;w.eval(source);const search=w.document.querySelector('.select-search');search.value='vacinacao';search.dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelector('select').value,'Contrato');assert.equal([...w.document.querySelectorAll('option')].find(x=>x.value==='Vacinação').hidden,false);assert.equal([...w.document.querySelectorAll('option')].find(x=>x.value==='Passaporte').hidden,true);
});
