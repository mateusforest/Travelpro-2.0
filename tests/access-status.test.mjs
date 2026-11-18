import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../dist/access-status.js',import.meta.url),'utf8');
function fixture(t,fetch){const dom=new JSDOM('<div data-access-status hidden><p data-access-message></p><button>Verificar novamente</button></div>',{url:'https://travelpro.test/cadastro.html',runScripts:'outside-only'});t.after(()=>dom.window.close());dom.window.fetch=fetch;dom.window.AbortSignal.timeout=()=>undefined;dom.window.eval(source);return dom.window;}
test('unavailable service gives a visible message and retry recovers without submitting a signup',async t=>{
 let working=false,calls=0;const w=fixture(t,async url=>{assert.equal(url,'/api/health');calls++;return {ok:working,json:async()=>({ok:true})};});
 assert.equal(await w.TravelAccessHealth.ensureAvailable(),false);assert.equal(w.document.querySelector('[data-access-status]').hidden,false);assert.match(w.document.body.textContent,/temporariamente indisponível/);
 await w.TravelAccessHealth.ensureAvailable();assert.equal(calls,1);
 working=true;w.document.querySelector('button').click();assert.equal(await w.TravelAccessHealth.ensureAvailable(),true);assert.equal(w.document.querySelector('[data-access-status]').hidden,true);assert.equal(calls,2);
});
test('network failures and invalid health responses never report readiness',async t=>{
 for(const fetch of [async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>null}),async()=>({ok:true,json:async()=>({ok:false})})]){const w=fixture(t,fetch);assert.equal(await w.TravelAccessHealth.ensureAvailable(),false);assert.equal(w.document.querySelector('button').disabled,false);}
});
test('parallel availability checks share a single in-flight request',async t=>{let resolve,calls=0;const w=fixture(t,()=>{calls++;return new Promise(r=>resolve=r);});const checks=[w.TravelAccessHealth.ensureAvailable(),w.TravelAccessHealth.ensureAvailable()];resolve({ok:true,json:async()=>({ok:true})});assert.deepEqual(await Promise.all(checks),[true,true]);assert.equal(calls,1);});
