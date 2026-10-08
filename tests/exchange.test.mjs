import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createExchangeService} from '../backend/exchange.mjs';
const rows=[{base:'BRL',quote:'USD',rate:.2,date:'2026-10-01'},{base:'BRL',quote:'EUR',rate:1/6,date:'2026-10-01'}];
test('reference rates invert correctly, deduplicate requests and expose outages without inventing prices',async()=>{
  let now=Date.parse('2026-10-01T15:00:00Z'),calls=0,offline=false;
  const rates=createExchangeService({clock:()=>now,fetcher:async url=>{calls++;assert.equal(url,'https://api.frankfurter.dev/v2/rates?base=BRL&quotes=USD,EUR');if(offline)throw Error();return {ok:true,json:async()=>rows};}});
  const [a,b]=await Promise.all([rates(),rates()]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.rates.USD,5);assert.equal(a.rates.EUR,6);
  await rates();assert.equal(calls,1);
  now+=31*60000;offline=true;assert.equal((await rates()).stale,true);await rates();assert.equal(calls,2);
  now+=8*86400000;await assert.rejects(rates(),e=>e.status===503);
});
test('malformed and old rates are rejected',async()=>{
  for(const bad of [[],[{...rows[0],rate:0},rows[1]],[{...rows[0],date:'2020-01-01'},rows[1]]]){
    const rates=createExchangeService({clock:()=>Date.parse('2026-10-01T15:00Z'),fetcher:async()=>({ok:true,json:async()=>bad})});
    await assert.rejects(rates(),e=>e.status===503);
  }
});
test('calculator parses BR amounts, converts in both directions, swaps and maintains clock preferences',async t=>{
  const dom=new JSDOM('<header class="portal-header"><div class="header-end"></div></header><main id="portal-main"></main>',{url:'https://travelpro.test/portal.html',runScripts:'outside-only'});t.after(()=>dom.window.close());
  const w=dom.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.AbortSignal.timeout=()=>undefined;let fail=false;
  w.fetch=async(url,options)=>{assert.equal(url,'/api/exchange');assert.equal(options.headers['X-TravelPro-Background'],'1');if(fail)throw Error();return {ok:true,json:async()=>({rates:{BRL:1,USD:5,EUR:6},dates:{USD:'2026-10-01',EUR:'2026-10-01'},stale:false})};};
  w.eval(readFileSync(new URL('../dist/portal-chrome.js',import.meta.url),'utf8'));w.TravelChrome.mount();
  await new Promise(r=>setTimeout(r,20));
  const $=s=>w.document.querySelector(s),change=el=>el.dispatchEvent(new w.Event('change'));
  assert.equal(w.document.querySelectorAll('.portal-partners').length,1);
  assert.equal($('.portal-partners').children.length,1);
  assert.equal($('.portal-partners img').getAttribute('src'),'assets/travelpro-tp-orange.png');
  assert.doesNotMatch($('.portal-partners').outerHTML,/europlus|operadora/i);
  assert.equal(w.TravelChrome.parseAmount('1.250,50'),1250.5);assert.equal(w.TravelChrome.parseAmount('0,01'),.01);
  for(const bad of ['-1','1,000.50','12a','Infinity','1,2,3',''])assert.equal(w.TravelChrome.parseAmount(bad),null,bad);
  assert.equal(w.TravelChrome.convert(100,'USD','EUR',{USD:5,EUR:6}),500/6);
  $('.market-calculator').click();assert.equal($('#exchange-dialog').open,true);assert.match($('#fx-result').textContent,/5\.000,00/);
  $('#fx-swap').click();assert.equal($('#fx-from').value,'BRL');assert.match($('#fx-result').textContent,/200,00/);
  $('#fx-amount').value='0,00';$('#fx-amount').dispatchEvent(new w.Event('input'));assert.match($('#fx-result').textContent,/0,00/);
  $('#fx-amount').value='bad';$('#fx-amount').dispatchEvent(new w.Event('input'));assert.equal($('#fx-result').textContent,'—');assert.equal($('#fx-amount').getAttribute('aria-invalid'),'true');
  $('[data-zone="eu"]').value='Europe/Paris';change($('[data-zone="eu"]'));assert.equal($('[data-clock="eu"] small').textContent,'Paris');assert.match(w.localStorage.getItem('travelpro-clock-zones'),/Europe\/Paris/);
  assert.equal(w.TravelChrome.clockLabel('America/New_York',new Date('2026-01-15T15:00:00Z')),'10:00');
  assert.equal(w.TravelChrome.clockLabel('America/New_York',new Date('2026-07-15T15:00:00Z')),'11:00');
  assert.equal(w.TravelChrome.clockLabel('Europe/Lisbon',new Date('2026-07-15T15:00:00Z')),'16:00');
  fail=true;$('#fx-refresh').click();await new Promise(r=>setTimeout(r,10));assert.match($('#fx-source').textContent,/Sem atualização/);
  $('#fx-close').click();assert.equal($('#exchange-dialog').open,false);assert.equal(w.document.activeElement,$('.market-calculator'));
});
