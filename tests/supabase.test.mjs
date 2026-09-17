// Runs the actual API module with isolated Supabase substitutes. No real account or DB writes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as crypto from 'node:crypto';
import * as validation from '../backend/validation.mjs';
import * as granatum from '../backend/granatum.mjs';
import * as financeAPI from '../backend/finance-api.mjs';
import * as providers from '../backend/providers.mjs';
const initial=JSON.parse(readFileSync(new URL('../backend/initial-state.json',import.meta.url)));
async function fixture({role='owner',workspaceId='agency-a',version=1}={}){
  const state=structuredClone(initial);state.agency='Agency A';
  let stored={data:structuredClone(state),version},writes=0;
  const calls=[];
  const db={from(table){const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},order(){return q;},range(){return q;},maybeSingle(){return run();},single(){return run();},then(ok,bad){return run().then(ok,bad);}};
    async function run(){calls.push({table,filters:{...filters}});if(table==='travelpro_state')return {data:structuredClone(stored),error:null};if(table==='travelpro_integrations')return {data:null,error:null};throw Error('Unexpected table '+table);}return q;},
    async rpc(name,args){assert.equal(name,'travelpro_save_state');assert.equal(args.p_workspace,'agency-a');if(args.p_version!==stored.version)return {error:{code:'40001'}};stored={data:structuredClone(args.p_data),version:stored.version+1};writes++;return {data:stored.version,error:null};}};
  const user={id:'user-a',email:'test@example.invalid',user_metadata:{name:'Test'}};
  const access={workspace:workspaceId?{id:workspaceId,name:'Agency A',type:'operations'}:null,membershipRole:role,profile:null};
  class ApiResponse extends Response{static json(body,init){return new ApiResponse(JSON.stringify(body),{...init,headers:{...init?.headers,'Content-Type':'application/json'}});}static redirect(url){return new ApiResponse(null,{status:307,headers:{Location:String(url)}});}}
  const imports={
    'node:crypto':crypto,'./runtime.mjs':{ApiResponse,after:()=>{},cookies:async()=>({get:()=>undefined})},
    '@supabase/supabase-js':{createClient:()=>{throw Error('Unexpected external auth');}},
    './clients.mjs':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user}})}}),createSupabaseAdminClient:()=>db,supabaseConfigured:()=>true},
    './access.mjs':{getUserAccessForUser:async()=>access,ensureAppAccessForUser:async()=>({access}),canManageWorkspace:a=>['owner','admin'].includes(a.membershipRole),resolvePostAuthPath:()=>'/portal'},
    '../initial-state.json':{default:initial},'../granatum.mjs':granatum,'../finance-api.mjs':financeAPI,'../validation.mjs':validation,'../providers.mjs':{...providers,cosReply:async()=>null}
  };
  const module=new vm.SourceTextModule(readFileSync(new URL('../backend/supabase/app.mjs',import.meta.url),'utf8'));
  await module.link(async name=>{const values=imports[name];assert.ok(values,'Unexpected import '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);});});await module.evaluate();
  const request=(path,method='GET',body)=>module.namespace.handle(new Request('http://localhost:3000/api/'+path,{method,headers:{Host:'localhost:3000',Origin:'http://localhost:3000','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
  return {request,state,calls,get writes(){return writes;}};
}
test('authenticated workspace queries are scoped to the selected agency',async()=>{const f=await fixture();const res=await f.request('workspace');assert.equal(res.status,200);assert.equal((await res.json()).state.agency,'Agency A');assert.ok(f.calls.length>1);assert.ok(f.calls.every(c=>c.filters.workspace_id==='agency-a'));});
test('user without workspace cannot reach database',async()=>{const f=await fixture({workspaceId:null});const res=await f.request('workspace');assert.equal(res.status,403);assert.equal(f.calls.length,0);});
test('ordinary member cannot change agency configuration',async()=>{const f=await fixture({role:'member'});f.state.agency='Another agency';const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,403);assert.equal(f.writes,0);});
test('ordinary member can save operational data',async()=>{const f=await fixture({role:'member'});f.state.clients.push({id:'new-client',name:'Client',email:'',phone:''});const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,200);assert.equal(f.writes,1);});
test('stale versions cannot overwrite a newer workspace',async()=>{const f=await fixture({version:2});const res=await f.request('workspace','PUT',{version:1,state:f.state});assert.equal(res.status,409);assert.equal(f.writes,0);});
test('concurrent saves permit only one write for each version',async()=>{const f=await fixture();const results=await Promise.all([f.request('workspace','PUT',{version:1,state:f.state}),f.request('workspace','PUT',{version:1,state:f.state})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(f.writes,1);});
test('member cannot set integration secrets',async()=>{const f=await fixture({role:'member'});const res=await f.request('integrations/openai','PUT',{config:{key:'test'}});assert.equal(res.status,403);assert.equal(f.calls.length,0);});
test('member cannot trigger Granatum sync or restart',async()=>{const f=await fixture({role:'member'});const res=await f.request('finance/granatum/sync','POST',{restart:true});assert.equal(res.status,403);assert.equal(f.calls.length,0);});
test('Granatum cron refuses requests without its dedicated credential',async()=>{const f=await fixture();const res=await f.request('cron/granatum','POST',{});assert.equal(res.status,401);assert.equal(f.calls.length,0);});
