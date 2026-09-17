import {verifyFinance} from './finance-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import http from 'node:http';
import {createApp} from '../backend/app.mjs';
const directory=mkdtempSync(path.join(os.tmpdir(),'travelpro-test-'));
let app,origin;
async function start(){app=createApp({directory,dist:path.resolve('dist'),env:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);}
function client(){return {cookie:'',csrf:'',async call(route,method='GET',body,extra={}){const headers={Origin:origin,...extra};if(this.cookie)headers.Cookie=this.cookie;if(this.csrf)headers['X-CSRF-Token']=this.csrf;if(body!==undefined)headers['Content-Type']='application/json';Object.assign(headers,extra);const res=await fetch(origin+'/api'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.has('set-cookie'))this.cookie=res.headers.get('set-cookie').split(';')[0];let data;if(res.headers.get('content-type')?.includes('json'))data=await res.json();else data=await res.text();if(data.csrf)this.csrf=data.csrf;return {status:res.status,data};}};}
test('TravelPro integrated backend',async t=>{
 await start();t.after(()=>app.close());const a=client(),b=client(),anon=client();
 await t.test('real accounts, sessions and authentication',async()=>{
  assert.equal((await anon.call('/workspace')).status,401);
  assert.equal((await a.call('/auth/register','POST',{name:'Ana',agency:'Agência A',email:'a@example.com',password:'short'})).status,422);
  const reg=await a.call('/auth/register','POST',{name:'Ana',agency:'Agência A',email:'a@example.com',password:'a-secure-password'});assert.equal(reg.status,201);assert.ok(reg.data.user.agencyId);assert.ok(a.cookie.startsWith('travelpro_session='));
  assert.equal((await b.call('/auth/register','POST',{name:'Bia',agency:'Agência B',email:'b@example.com',password:'b-secure-password'})).status,201);
  assert.equal((await anon.call('/auth/login','POST',{email:'a@example.com',password:'wrong'})).status,401);
  assert.equal((await a.call('/auth/session')).data.user.email,'a@example.com');
 });
 await t.test('local aliases support login without accepting foreign hosts or origins',async()=>{
  const local='http://localhost:'+app.server.address().port;
  const raw=(route,headers,body)=>new Promise((resolve,reject)=>{const req=http.request(origin+route,{method:body?'POST':'GET',headers},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));});req.on('error',reject);req.end(body);});
  const login=await raw('/api/auth/login',{Host:new URL(local).host,Origin:local,'Content-Type':'application/json'},JSON.stringify({email:'a@example.com',password:'a-secure-password'}));
  assert.equal(login.status,200);
  const cookie=login.headers['set-cookie'][0].split(';')[0];
  assert.equal((await raw('/api/auth/session',{Host:new URL(local).host,Cookie:cookie})).status,200);
  assert.equal((await raw('/api/auth/login',{Host:new URL(local).host,Origin:origin,'Content-Type':'application/json'},'{}')).status,403);
  assert.equal((await raw('/api/health',{Host:'evil.example'})).status,403);
  assert.equal((await raw('/api/health',{Host:'localhost:1'})).status,403);
  app.setOrigin('https://www.usetravelpro.com');
  try{assert.equal((await raw('/api/health',{Host:new URL(local).host})).status,403);}finally{app.setOrigin(origin);}
 });
 let state,version,fileId;
 await t.test('persisted connected records, CSRF and optimistic concurrency',async()=>{
  let r=await a.call('/workspace');assert.equal(r.status,200);assert.equal(r.data.state.clients.length,0);state=r.data.state;version=r.data.version;
  state.clients.push({id:'c-test',name:'Camila',email:'camila@example.com',phone:'11999900000',notes:'Lua de mel'});
  state.trips.push({id:'t-test',client:'c-test',title:'Itália a dois',destination:'Itália',start:'2026-11-10',end:'2026-11-20',travelers:2,value:25000,status:'Em cotação',notes:''});
  state.documents.push({id:'d-test',name:'Contrato da agência',type:'Modelo',trip:'t-test',content:'Contrato {{cliente}}',status:'Rascunho'});
  state.events.push({id:'e-test',title:'Retorno',trip:'t-test',date:'2026-11-01',time:'10:00',type:'Retorno'});
  state.transactions.push({id:'f-test',title:'Entrada',trip:'t-test',amount:1000,date:'2026-11-01',type:'receber',status:'Pendente'});
  state.budgets.push({id:'b-test',name:'Proposta',client:'c-test',destination:'Itália',start:'2026-11-10',end:'2026-11-20',travelers:2,valid:'2026-10-01',items:[{name:'Viagem',qty:2,unit:12000}],discount:1000,status:'Rascunho'});
  assert.equal((await a.call('/workspace','PUT',{state,version},{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await a.call('/workspace','PUT',{state,version},{Origin:'https://evil.example'})).status,403);
  r=await a.call('/workspace','PUT',{state,version});assert.equal(r.status,200,JSON.stringify(r.data));version=r.data.version;
  assert.equal((await a.call('/workspace','PUT',{state,version:version-1})).status,409);
  assert.equal((await b.call('/workspace')).data.state.clients.length,0,'tenant isolation');
  const bad=structuredClone(state);bad.trips[0].client='other-agency';assert.equal((await a.call('/workspace','PUT',{state:bad,version})).status,422);
  const badMoney=structuredClone(state);badMoney.budgets[0].discount=999999;assert.equal((await a.call('/workspace','PUT',{state:badMoney,version})).status,422);
  assert.equal((await a.call('/records/trips/t-test')).data.data.title,'Itália a dois');
  assert.equal((await b.call('/records/trips/t-test')).status,404);
 });
 await t.test('finance HTTP migration, isolation and complete payment lifecycle',async()=>{await verifyFinance(a,b);});
 await t.test('uploaded files persist and are protected by agency',async()=>{
  const r=await a.call('/files','POST',{name:'modelo.txt',base64:Buffer.from('Meu modelo de contrato').toString('base64')});assert.equal(r.status,201);fileId=r.data.id;
  assert.equal((await a.call('/files/'+fileId)).data,'Meu modelo de contrato');assert.equal((await b.call('/files/'+fileId)).status,404);assert.equal((await anon.call('/files/'+fileId)).status,401);
  assert.equal((await a.call('/files','POST',{name:'script.html',base64:'dGVzdA=='})).status,422);
 });
 await t.test('COS responds in honest guided mode and keeps history',async()=>{
  const row=(await a.call('/workspace')).data;const r=await a.call('/cos/chat','POST',{text:'Quero cadastrar um cliente',version:row.version});assert.equal(r.status,200);assert.equal(r.data.mode,'guided');assert.equal(r.data.response.action,'new-client');assert.equal((await a.call('/workspace')).data.state.messages.length,2);
  assert.equal((await a.call('/operator/quote','POST',{request:{}})).status,503);
  const current=(await a.call('/workspace')).data;
  assert.equal((await a.call('/ai/itinerary','POST',{name:'Roteiro',destination:'Itália',template:'own',trip:'t-test',version:current.version})).status,503);
  assert.equal((await a.call('/ai/campaign','POST',{version:current.version})).status,503);
  assert.equal((await a.call('/payments','POST',{})).status,501);
 });
 let agencyId;
 await t.test('secret storage and signed idempotent WhatsApp intake',async()=>{
  agencyId=(await a.call('/auth/session')).data.user.agencyId;
  const secret='test-secret-no-external-requests',config={phoneId:'123456789',version:'v99.0',token:'test-token',appSecret:secret,verifyToken:'verify-token-test'};
  assert.equal((await a.call('/integrations/whatsapp','PUT',{config})).status,200);
  const info=await a.call('/integrations');assert.ok(!JSON.stringify(info.data).includes(secret));assert.ok(!JSON.stringify(info.data).includes('test-token'));
  const encrypted=app.db.prepare("SELECT secret FROM integration_config WHERE agency_id=? AND service='whatsapp'").get(agencyId).secret;assert.ok(!encrypted.includes(secret));
  assert.equal((await b.call('/integrations/whatsapp','PUT',{config})).status,409);
  const verify=await fetch(origin+'/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token-test&hub.challenge=123');assert.equal(await verify.text(),'123');
  const payload={entry:[{changes:[{value:{metadata:{phone_number_id:'123456789'},contacts:[{wa_id:'551199998888',profile:{name:'Cliente WhatsApp'}}],messages:[{id:'wamid.test1',from:'551199998888',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Quero falar com uma pessoa.'}}]}}]}]};
  const raw=JSON.stringify(payload),sign='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  const send=signature=>fetch(origin+'/api/webhooks/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature},body:raw});
  assert.equal((await send('bad')).status,403);assert.equal((await send(sign)).status,200);assert.equal((await send(sign)).status,200);
  const row=(await a.call('/workspace')).data;assert.equal(row.state.whatsapp.threads.length,1);assert.equal(row.state.whatsapp.threads[0].messages.length,1);assert.equal(row.state.whatsapp.threads[0].mode,'human');assert.equal(row.state.whatsapp.threads[0].channel,'live');assert.equal((await b.call('/workspace')).data.state.whatsapp.threads.length,0);
 });
 await t.test('durable response queue waits for keys without contacting providers',async()=>{
  const row=(await a.call('/workspace')).data;row.state.whatsapp.threads[0].mode='cos';assert.equal((await a.call('/workspace','PUT',{state:row.state,version:row.version})).status,200);
  const raw=JSON.stringify({entry:[{changes:[{value:{metadata:{phone_number_id:'123456789'},messages:[{id:'wamid.test2',from:'551199998888',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Gostaria de viajar para a Itália.'}}]}}]}]});
  const signature='sha256='+createHmac('sha256','test-secret-no-external-requests').update(raw).digest('hex');
  assert.equal((await fetch(origin+'/api/webhooks/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature},body:raw})).status,200);
  await app.processJobs();assert.equal(app.db.prepare('SELECT status FROM jobs WHERE message_id=?').get('wamid.test2').status,'pending_connection');
 });
 await t.test('server restart preserves account, records, files and sessions',async()=>{
  await app.close();await start();const r=await a.call('/workspace');assert.equal(r.status,200);assert.equal(r.data.state.clients[0].name,'Camila');assert.equal(r.data.state.documents[0].content,'Contrato {{cliente}}');assert.equal((await a.call('/files/'+fileId)).data,'Meu modelo de contrato');
 });
 await t.test('password change revokes other sessions and logout blocks data',async()=>{
  const other=client();assert.equal((await other.call('/auth/login','POST',{email:'a@example.com',password:'a-secure-password'})).status,200);
  assert.equal((await a.call('/auth/password','POST',{current:'a-secure-password',password:'a-new-password-long'})).status,200);
  assert.equal((await other.call('/workspace')).status,401);
  assert.equal((await a.call('/auth/reset-request','POST',{email:'a@example.com'})).status,503);
  assert.equal((await a.call('/auth/logout','POST',{})).status,200);assert.equal((await a.call('/workspace')).status,401);
 });
 console.log('Isolated test database:',directory);
});

