// Integration smoke test: creates only disposable users; never sends email.
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
const origin=process.env.TEST_ORIGIN||process.env.PUBLIC_ORIGIN;
if(!origin)throw new Error('Defina TEST_ORIGIN ou PUBLIC_ORIGIN.');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],objects=[];
function checked(result){if(result.error)throw new Error('Supabase test setup/cleanup: '+result.error.code);return result.data;}
function client(){const jar=new Map();return {async call(path,method='GET',body){
  const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  for(const cookie of res.headers.getSetCookie()){const first=cookie.split(';')[0],i=first.indexOf('=');if(/Max-Age=0(?:;|$)/i.test(cookie))jar.delete(first.slice(0,i));else jar.set(first.slice(0,i),first.slice(i+1));}
  return {status:res.status,headers:res.headers,data:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text()};
}};}
try{
  for(let i=0;i<2;i++){
    const email='travelpro-smoke-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('hex');
    const {user}=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Teste técnico temporário',agency:'Teste temporário TravelPro'}}));
    users.push({id:user.id,email,password});
  }
  const a=client(),b=client();
  const invalid=await a.call('/auth/login','POST',{email:users[0].email,password:'definitely-not-the-password'});
  assert.equal(invalid.status,401);
  const foreign=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(foreign.status,403);
  for(const [index,c] of [a,b].entries()){
    const login=await c.call('/auth/login','POST',{email:users[index].email,password:users[index].password});
    assert.equal(login.status,200,JSON.stringify(login.data));assert.equal(login.data.redirectTo,'/portal.html');
    assert.ok(login.headers.getSetCookie().every(value=>/HttpOnly/i.test(value)));
    const session=await c.call('/auth/session');assert.equal(session.status,200);assert.equal(session.data.user.id,users[index].id);
    users[index].workspace=session.data.user.agencyId;
  }
  const workspace=await a.call('/workspace');assert.equal(workspace.status,200,JSON.stringify(workspace.data));
  const state=workspace.data.state;state.clients.push({id:'isolated-check',name:'Teste de persistência',email:'',phone:'',notes:''});
  const save=await a.call('/workspace','PUT',{state,version:workspace.data.version});assert.equal(save.status,200,JSON.stringify(save.data));
  assert.equal((await a.call('/workspace','PUT',{state,version:workspace.data.version})).status,409);
  assert.ok((await a.call('/workspace')).data.state.clients.some(c=>c.id==='isolated-check'));
  assert.equal((await b.call('/workspace')).data.state.clients.length,0);
  const upload=await a.call('/files','POST',{name:'smoke.txt',base64:Buffer.from('TravelPro private storage test').toString('base64')});
  assert.equal(upload.status,201,JSON.stringify(upload.data));objects.push(users[0].workspace+'/'+upload.data.id);
  assert.equal((await a.call('/files/'+encodeURIComponent(upload.data.id))).data,'TravelPro private storage test');
  assert.equal((await b.call('/files/'+encodeURIComponent(upload.data.id))).status,404);
  assert.equal((await a.call('/auth/logout','POST',{})).status,200);
  assert.equal((await a.call('/auth/session')).status,401);
  console.log('PASS: login, cookies HttpOnly, sessão, agência, persistência, conflito de versão, isolamento, arquivo privado e logout.');
}finally{
  if(objects.length)checked(await admin.storage.from('travelpro-private').remove(objects));
  for(const user of users){
    const owned=checked(await admin.from('workspaces').select('id').eq('owner_id',user.id));
    for(const workspace of owned)checked(await admin.from('workspaces').delete().eq('id',workspace.id).eq('owner_id',user.id));
    checked(await admin.from('workspace_members').delete().eq('user_id',user.id));
    checked(await admin.from('profiles').delete().eq('id',user.id));
    checked(await admin.auth.admin.deleteUser(user.id));
    const identity=createHash('sha256').update(user.email).digest('hex');
    checked(await admin.from('travelpro_rate_limits').delete().eq('key','auth/login:'+identity));
    for(const action of ['upload'])checked(await admin.from('travelpro_rate_limits').delete().eq('key',user.id+':'+action));
  }
  console.log('Contas e dados temporários removidos.');
}
