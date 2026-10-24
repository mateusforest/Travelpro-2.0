import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/api.js',import.meta.url),'utf8');
function fixture({storage=new Map(),key='session-a',now=100000000,network=false}={}){
 let time=now,interval,hidden=false,redirect='';const listeners={},requests=[],messages=[];
 const document={querySelector:()=>null,createElement:()=>({}),body:{replaceChildren(){hidden=true;},append(){}}};
 const context={window:{},document,location:{replace(value){redirect=value;}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Date:{now:()=>time},setInterval:fn=>(interval=fn,1),clearInterval:()=>{},addEventListener:(name,fn)=>listeners[name]=fn,AbortSignal,
 BroadcastChannel:class{constructor(){context.channel=this;}postMessage(data){messages.push(data);}},
 fetch:async(path)=>{requests.push(path);if(network)throw Error('offline');return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({ok:true})};}};
 vm.runInNewContext(source,context);const api=context.window.TravelAPI;api.user={id:'user-a'};api.sessionKey=key;
 return {api,listeners,storage,requests,messages,context,advance:ms=>time+=ms,tick:()=>interval(),get hidden(){return hidden;},get redirect(){return redirect;}};
}
test('reload cannot reset inactivity and hides data before an offline logout completes',async()=>{
 const storage=new Map();const first=fixture({storage});first.api.enableIdle(()=>15);
 const reloaded=fixture({storage,now:100000000+16*60000,network:true});
 assert.equal(reloaded.api.enableIdle(()=>15),false);assert.equal(reloaded.hidden,true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(reloaded.redirect,'login.html?logout=local');
 assert.equal(JSON.parse(storage.get('travelpro:activity:session-a')).locked,true);
});
test('fresh login has a different session scope and a locked prior session cannot reopen',async()=>{
 const f=fixture();f.api.enableIdle(()=>15);await f.api.logout();
 const old=fixture({storage:f.storage});assert.equal(old.api.enableIdle(()=>15),false);assert.equal(old.hidden,true);
 const fresh=fixture({storage:f.storage,key:'session-b'});assert.equal(fresh.api.enableIdle(()=>15),true);assert.equal(fresh.hidden,false);
});
test('real interaction renews activity across reloads, while polling does not',async()=>{
 const f=fixture();f.api.enableIdle(()=>15);f.advance(5000);await f.tick();
 assert.equal(JSON.parse(f.storage.get('travelpro:activity:session-a')).at,100000000);
 f.advance(10*60000);f.listeners.pointerdown();
 const reloaded=fixture({storage:f.storage,now:100000000+16*60000});assert.equal(reloaded.api.enableIdle(()=>15),true);
});
test('logout propagates across tabs only within the same session',()=>{
 const f=fixture();f.api.enableIdle(()=>15);
 f.context.channel.onmessage({data:{key:'travelpro:activity:other',locked:true}});assert.equal(f.hidden,false);
 f.context.channel.onmessage({data:{key:'travelpro:activity:session-a',locked:true}});assert.equal(f.hidden,true);assert.equal(f.redirect,'login.html');assert.equal(f.requests.length,0);
});
test('interaction after expiration cannot revive an inactive session',async()=>{
 const f=fixture();f.api.enableIdle(()=>15);f.advance(16*60000);f.listeners.keydown();assert.equal(f.hidden,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.redirect,'login.html?expired=1');
});
test('storage event provides cross-tab locking without BroadcastChannel delivery',()=>{
 const f=fixture();f.api.enableIdle(()=>15);f.listeners.storage({key:'travelpro:activity:session-a',newValue:JSON.stringify({locked:true})});assert.equal(f.hidden,true);
});
