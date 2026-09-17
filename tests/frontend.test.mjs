import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('signup stays on the confirmation message until Supabase issues a session',async()=>{
 const result={hidden:true,textContent:'',focus(){}};
 const document={body:{dataset:{auth:'signup'}},querySelectorAll(){return[];},querySelector(){return null;},getElementById(id){return id==='signup-result'?result:{value:'test-input'};},addEventListener(){}};
 const location={search:'',href:''};let response={message:'Confirme seu e-mail.'};
 const context={document,location,URLSearchParams,addEventListener(){},TravelAPI:{async request(){return response;}}};vm.createContext(context);
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.finish=finish;})();');vm.runInContext(source,context);
 const form={id:'signup-form',dataset:{result:'signup-result'},querySelectorAll(){return[];}};
 await context.finish(form);assert.equal(result.textContent,'Confirme seu e-mail.');assert.equal(location.href,'');
 response={redirectTo:'/portal.html'};await context.finish(form);assert.equal(location.href,'portal.html');
});
test('API rejects static hosting responses instead of reporting a successful login',async()=>{
 let response;
 const context={window:{},fetch:async()=>response};vm.createContext(context);
 vm.runInContext(fs.readFileSync(new URL('../dist/api.js',import.meta.url),'utf8'),context);
 const request=()=>context.window.TravelAPI.request('/auth/login',{method:'POST',body:{email:'test@example.com',password:'test-password'}});
 for(const [body,status,type] of [['NOT_FOUND',404,'text/plain'],['<!doctype html>',200,'text/html'],['invalid',200,'application/json'],['null',200,'application/json']]){
  response=new Response(body,{status,headers:{'Content-Type':type}});
  await assert.rejects(request(),error=>error.status===(status===200?502:status)&&error.message.includes('indisponível neste endereço'));
 }
 response=new Response(JSON.stringify({error:'E-mail ou senha inválidos.'}),{status:401,headers:{'Content-Type':'application/json'}});
 await assert.rejects(request(),error=>error.status===401&&error.message==='E-mail ou senha inválidos.');
 response=new Response(JSON.stringify({user:{id:'user-id'},csrf:'token'}),{headers:{'Content-Type':'application/json'}});
 assert.equal((await request()).user.id,'user-id');
});
test('portal loads persistent empty account and saves linked forms',async()=>{
 const elements=new Map();const elem=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},hidden:false,open:false,classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return[]},querySelector(){return elem()},addEventListener(){},focus(){},showModal(){this.open=true},close(){this.open=false},reportValidity(){return true}});
 const document={querySelector(s){if(!elements.has(s))elements.set(s,elem());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){},body:{dataset:{startRoute:'inicio'}},activeElement:{tagName:'BODY'}};
 const initial=JSON.parse(fs.readFileSync(new URL('../backend/initial-state.json',import.meta.url),'utf8'));initial.agency='Agência integrada';let saved=structuredClone(initial),version=1;
 const api={version:1,user:{id:'u1',name:'Mateus',email:'mateus@example.com'},async session(){return this.user},async request(route,options={}){if(route==='/workspace'&&options.method==='PUT'){assert.equal(options.body.version,version);saved=structuredClone(options.body.state);return {version:++version};}if(route==='/workspace')return {state:structuredClone(saved),version,services:[{service:'openai',configured:false},{service:'operator',configured:false},{service:'whatsapp',configured:false}]};throw Error('Unexpected API route '+route);}};
 const location={pathname:'/portal.html',hash:'',search:''},context={document,window:{TravelAPI:api,scrollTo(){}},location,history:{pushState(a,b,href){const u=new URL(href,'http://localhost');location.pathname=u.pathname;location.search=u.search;location.hash=u.hash;}},addEventListener(){},setInterval(){},setTimeout(){},clearTimeout(){},URL,URLSearchParams,console,structuredClone};vm.createContext(context);
 let source=fs.readFileSync(new URL('../dist/portal.js',import.meta.url),'utf8');source=source.replace(/\}\)\(\);\s*$/,'globalThis.test={state,renderWorkspace,home,agency,workspaceSubmit,workspaceAction,itineraryPrintHtml,snapshot,flush};})();');vm.runInContext(source,context);await new Promise(r=>setImmediate(r));
 const t=context.test;assert.equal(t.state.agency,'Agência integrada');assert.equal(t.state.clients.length,0);
 for(const route of ['whatsapp','leads','agente','cotacao','orcamentos','integracoes','plano','seguranca','faturamento','clientes','agenda','financeiro','roteiros','studio','documentos','configuracoes','travelmatch','vuei']){const html=t.renderWorkspace(route);assert.ok(!html.includes('undefined'),route);assert.ok(html.length>400,route);}
 await t.workspaceSubmit('client',{id:'',name:'Cliente real',phone:'11999990000',email:'cliente@example.com',notes:'Praia'});assert.equal(saved.clients.length,1);const cid=saved.clients[0].id;
 await t.workspaceSubmit('trip',{id:'',title:'Nossa viagem',client:cid,destination:'Brasil',start:'2026-11-01',end:'2026-11-10',travelers:'2',value:'1000',status:'Novo pedido',notes:''});assert.equal(saved.trips.length,1);assert.equal(saved.trips[0].client,cid);
 assert.equal(location.pathname,'/viagem.html');assert.equal(api.version,version);
 const tid=t.state.trips[0].id;
 await t.workspaceSubmit('client',{id:cid,name:'Cliente real',phone:'',email:'',notes:'',birthDate:'1990-01-02',documentType:'Passaporte',documentNumber:'EXAMPLE',address:'Endereço informado'});
 assert.equal(saved.clients[0].documentNumber,'EXAMPLE');
 await t.workspaceSubmit('reservation',{trip:tid,index:'',title:'Hotel confirmado',type:'Hotel',reference:'REFERENCE',start:'2026-11-01',end:'2026-11-10',details:'Quarto e horários'});
 assert.equal(saved.trips[0].reservations.length,1);
 await t.workspaceSubmit('trip-passengers',{id:tid,['p_'+cid]:'on'});assert.equal(saved.trips[0].participants[0],cid);
 t.state.templates[0].days=[{title:'Informações gerais',period:'Antes da viagem',text:'Destino: {{destino}}'}];
 await t.workspaceSubmit('new-itinerary',{name:'Roteiro',destination:'Brasil',trip:tid,template:'own'});
 assert.equal(saved.itineraries[0].days[0].text,'Destino: Brasil');
 await t.workspaceAction('duplicate-trip',tid);
 assert.equal(saved.trips.length,2);assert.equal(saved.trips[1].start,'');assert.equal(saved.trips[1].datesPending,true);assert.equal(saved.trips[1].reservations.length,0);assert.equal(saved.itineraries.length,2);assert.equal(saved.itineraries[1].trip,saved.trips[1].id);
 t.state.documents.push({id:'original-doc',name:'Original',type:'Voucher',trip:tid,content:'Texto editável',file:{id:'private-file'},versions:[{name:'Anterior',content:'Texto antigo'}]});
 await t.workspaceAction('duplicate-document','original-doc');assert.equal(saved.documents.length,2);assert.equal(saved.documents[1].file,undefined);assert.equal(saved.documents[1].trip,'');
 for(const [route,id]of [['viagem',tid],['cliente',cid],['roteiro',saved.itineraries[0].id],['documento','original-doc']])assert.ok(!t.renderWorkspace(route,id).includes('undefined'),route);
 const printed=t.itineraryPrintHtml({...saved.itineraries[0],name:'<script>unsafe</script>'});assert.ok(!printed.includes('<script>unsafe'));assert.ok(printed.includes('&lt;script&gt;'));
});
