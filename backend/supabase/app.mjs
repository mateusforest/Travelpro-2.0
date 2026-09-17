import {randomUUID,randomBytes,createCipheriv,createDecipheriv,createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {ApiResponse,after,cookies} from './runtime.mjs';
import {createClient} from '@supabase/supabase-js';
import {createSupabaseServerClient,createSupabaseAdminClient,supabaseConfigured} from './clients.mjs';
import {getUserAccessForUser,ensureAppAccessForUser,canManageWorkspace,resolvePostAuthPath} from './access.mjs';
import seed from '../initial-state.json' with {type:'json'};
import {fail,validateState,collections} from '../validation.mjs';
import {cosReply,remote,safeEndpoint,providerNames,connectionStatus} from '../providers.mjs';
import {handleFinance,supabaseRepository} from '../finance-api.mjs';

const requestOrigin=request=>new URL(request.url).origin;
const clean=(x,max=500)=>typeof x==='string'?x.trim().slice(0,max):'';
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
const json=(data,status=200)=>ApiResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const setupMessage='A atualização do banco ainda precisa ser aplicada. Execute a migração 20260911_travelpro_portal.sql no Supabase deste projeto.';
function dbError(error){if(!error)return;if(['42P01','PGRST205','PGRST202','42883'].includes(error.code))fail(503,setupMessage);if(['40001','PT409'].includes(error.code))fail(409,'Os dados mudaram em outro acesso. Recarregue antes de salvar.');console.error('TravelPro database:',error.code);fail(500,'Não foi possível salvar ou consultar os dados.');}
function admin(){const client=createSupabaseAdminClient();if(!client)fail(503,'A conexão administrativa com o Supabase precisa ser configurada no servidor.');return client;}
async function actor(){
  const supabase=await createSupabaseServerClient();const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)fail(401,'Entre na sua conta para continuar.');
  const access=await getUserAccessForUser(user);
  if(!access.workspace?.id||!access.membershipRole||access.workspace.type!=='operations')fail(403,'Esta conta não tem acesso a uma agência de viagens.');
  return {supabase,user,access,db:admin(),wid:access.workspace.id};
}
function requireManager(a){if(!canManageWorkspace(a.access))fail(403,'Somente o responsável pela agência pode alterar esta configuração.');}
async function rate(a,key,max){const {data,error}=await a.db.rpc('travelpro_rate_limit',{p_key:a.user.id+':'+key,p_limit:max});dbError(error);if(!data)fail(429,'Muitas solicitações. Aguarde um minuto.');}
async function audit(a,action){const {error}=await a.db.from('travelpro_audit').insert({workspace_id:a.wid,user_id:a.user?.id||null,action});dbError(error);}
function encryptionKey(){const value=process.env.TRAVELPRO_ENCRYPTION_KEY;if(!/^[a-f0-9]{64}$/i.test(value||''))fail(503,'Configure TRAVELPRO_ENCRYPTION_KEY no servidor para guardar as credenciais com segurança.');return Buffer.from(value,'hex');}
function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const bytes=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64');}
function decrypt(value){if(!value)return {};const b=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',encryptionKey(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString());}
async function cfg(a,service){const {data,error}=await a.db.from('travelpro_integrations').select('config,secret').eq('workspace_id',a.wid).eq('service',service).maybeSingle();dbError(error);const config={...data?.config,...decrypt(data?.secret)};if(service==='openai'){config.key||=process.env.OPENAI_API_KEY;config.model||=process.env.OPENAI_OPERATIONS_MODEL||process.env.OPENAI_MODEL;}return config;}
async function services(a){return Promise.all(providerNames.map(async service=>{const c=await cfg(a,service);return {...connectionStatus(service,c),config:Object.fromEntries(['model','endpoint','phoneId','version'].filter(k=>c[k]).map(k=>[k,c[k]]))};}));}

async function legacyRows(a,table){
  const rows=[];for(let offset=0;offset<=10000;offset+=1000){const {data,error}=await a.db.from(table).select('*').eq('workspace_id',a.wid).order('id').range(offset,offset+999);if(error&&['42P01','PGRST205'].includes(error.code))return [];dbError(error);rows.push(...data);if(rows.length>10000)fail(409,'Esta agência possui mais de 10 mil registros. A importação precisa ser organizada antes de abrir o novo portal.');if(data.length<1000)break;}return rows;
}
async function workspace(a){
  const {data,error}=await a.db.from('travelpro_state').select('data,version').eq('workspace_id',a.wid).maybeSingle();dbError(error);if(data)return {state:data.data,version:data.version};
  const state=structuredClone(seed),today=new Date();state.agency=a.access.workspace.name||'Minha agência';state.billing.name=state.agency;state.profile.email=a.user.email||'';state.day=today.toISOString().slice(0,10);state.month=today.getMonth();state.year=today.getFullYear();
  const [clients,documents,financial]=await Promise.all(['clients','documents','financial_entries'].map(t=>legacyRows(a,t)));
  state.clients=clients.filter(c=>c.status!=='archived').map(c=>({id:c.id,name:c.name||'Cliente',email:c.email||'',phone:c.phone||'',notes:c.notes||'',origin:'Base anterior',tag:'Cliente',company:c.company||''}));
  state.documents=documents.filter(d=>d.status!=='archived').map(d=>({id:d.id,name:d.title||'Documento',type:d.type||'Arquivo',status:d.status==='signed'?'Assinado':'Rascunho',content:d.content||'',trip:'',legacyFileUrl:d.file_url||''}));
  state.transactions=financial.filter(f=>Number(f.amount)>0&&/^\d{4}-\d{2}-\d{2}/.test(f.due_date||'')).map(f=>({id:f.id,title:f.title||'Lançamento',type:f.type==='expense'?'pagar':'receber',amount:Number(f.amount),date:f.due_date.slice(0,10),status:f.paid_at?(f.type==='expense'?'Pago':'Recebido'):'Pendente',trip:'',notes:f.notes||''}));
  state.migration={source:'legacy-supabase',at:today.toISOString(),clients:state.clients.length,documents:state.documents.length,financial:state.transactions.length};
  validateState(state);
  const inserted=await a.db.from('travelpro_state').insert({workspace_id:a.wid,data:state}).select('version').single();
  if(inserted.error?.code==='23505')return workspace(a);dbError(inserted.error);return {state,version:inserted.data.version};
}
async function save(a,state,version){
  if(!Number.isInteger(version))fail(422,'Versão dos dados ausente.');validateState(state);
  const current=await workspace(a);
  if(current.version!==version)fail(409,'Os dados mudaram em outro acesso. Recarregue antes de salvar.');
  if(!canManageWorkspace(a.access)&&JSON.stringify([state.agency,state.billing,state.plan,state.security,state.profile,state.whatsapp.config])!==JSON.stringify([current.state.agency,current.state.billing,current.state.plan,current.state.security,current.state.profile,current.state.whatsapp.config]))fail(403,'Somente o responsável pode alterar as configurações da agência.');
  const {data,error}=await a.db.rpc('travelpro_save_state',{p_workspace:a.wid,p_version:version,p_data:state,p_user:a.user?.id||null});dbError(error);return data;
}
async function authFlow(path,request,data){
  const supabase=await createSupabaseServerClient();const origin=requestOrigin(request);
  const identity=createHash('sha256').update(clean(data.email,254).toLowerCase()).digest('hex');
  const limited=await admin().rpc('travelpro_rate_limit',{p_key:path+':'+identity,p_limit:path==='auth/login'?10:5});dbError(limited.error);if(!limited.data)fail(429,'Muitas tentativas. Aguarde um minuto.');
  if(path==='auth/login'){
    if(!clean(data.email)||typeof data.password!=='string'||data.password.length>256)fail(422,'Informe e-mail e senha.');
    const result=await supabase.auth.signInWithPassword({email:clean(data.email,254),password:data.password});
    if(result.error||!result.data.user)fail(401,'Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta.');
    const access=await ensureAppAccessForUser({user:result.data.user,productType:'operations'});if(access.error||!access.access)fail(409,'A conta foi autenticada, mas o espaço da agência precisa ser preparado.');
    return json({redirectTo:resolvePostAuthPath(access.access)||'/portal.html'});
  }
  if(path==='auth/register'){
    const name=clean(data.name,100),agency=clean(data.agency,150),email=clean(data.email,254);
    if(!name||!agency||!/^\S+@\S+\.\S+$/.test(email)||typeof data.password!=='string'||data.password.length<10||data.password.length>256)fail(422,'Preencha nome, agência, e-mail e uma senha de pelo menos 10 caracteres.');
    const {data:result,error}=await supabase.auth.signUp({email,password:data.password,options:{data:{name,agency},emailRedirectTo:origin+'/api/auth/callback'}});
    if(error)fail(400,'Não foi possível criar a conta. Confira os dados ou tente recuperar o acesso.');
    if(result.session){const access=await ensureAppAccessForUser({user:result.user,productType:'operations'});if(access.error)fail(409,'Conta criada, mas não foi possível preparar a agência. Entre novamente para continuar.');if(access.access?.workspace?.owner_id===result.user.id){const {error:updateError}=await admin().from('workspaces').update({name:agency}).eq('id',access.access.workspace.id);dbError(updateError);}return json({redirectTo:'/portal.html'});}
    return json({message:'Confira seu e-mail para confirmar o cadastro. Depois, entre na sua conta.'});
  }
  if(path==='auth/reset-request'){
    if(!/^\S+@\S+\.\S+$/.test(clean(data.email,254)))fail(422,'Informe um e-mail válido.');
    const {error}=await supabase.auth.resetPasswordForEmail(clean(data.email,254),{redirectTo:origin+'/api/auth/callback?flow=recovery'});
    if(error)fail(503,'Não foi possível solicitar a recuperação. Aguarde e tente novamente.');return json({message:'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.'});
  }
}
function recoverySignature(payload){return createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY||encryptionKey()).update(payload).digest('hex');}
async function callback(request){
  const url=new URL(request.url);url.host=new URL(requestOrigin(request)).host;const code=url.searchParams.get('code');if(!code)return ApiResponse.redirect(new URL('/login.html?erro=link-invalido',url));
  const supabase=await createSupabaseServerClient();const {data,error}=await supabase.auth.exchangeCodeForSession(code);
  if(error||!data.user)return ApiResponse.redirect(new URL('/login.html?erro=link-expirado',url));
  if(url.searchParams.get('flow')==='recovery'){
    const payload=data.user.id+':'+Date.now();(await cookies()).set('tp-recovery',payload+':'+recoverySignature(payload),{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:900});
    return ApiResponse.redirect(new URL('/login.html?recovery=1',url));
  }
  await ensureAppAccessForUser({user:data.user,productType:'operations'});return ApiResponse.redirect(new URL('/portal.html',url));
}

export async function handle(request){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,''),method=request.method;
  if(path==='health'&&method==='GET'){
    if(!supabaseConfigured())fail(503,'Configure a conexão com o Supabase no servidor.');
    const probe=await admin().from('travelpro_state').select('workspace_id').limit(1);dbError(probe.error);
    return json({ok:true,storage:'supabase',version:3});
  }
  if(path==='auth/callback'&&method==='GET')return await callback(request);
  if(path==='webhooks/whatsapp')return await whatsappWebhook(request);
  let data={};
  if(!['GET','HEAD'].includes(method)){
    if(request.headers.get('origin')!==requestOrigin(request))fail(403,'Origem não autorizada. Reabra o TravelPro neste endereço.');
    if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Formato de solicitação inválido.');
    const raw=await request.text();if(Buffer.byteLength(raw)>4200000)fail(413,'Use um arquivo de até 3 MB ou reduza o conteúdo.');try{data=raw?JSON.parse(raw):{};}catch{fail(400,'Dados inválidos.');}
  }
  if(['auth/login','auth/register','auth/reset-request'].includes(path)&&method==='POST')return await authFlow(path,request,data);
  if(path==='auth/reset-confirm'&&method==='POST'){
    const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();const jar=await cookies(),token=jar.get('tp-recovery')?.value||'',parts=token.split(':'),payload=parts.slice(0,2).join(':');
    if(!user||parts[0]!==user.id||!Number.isFinite(Number(parts[1]))||Date.now()-Number(parts[1])<0||Date.now()-Number(parts[1])>900000||!equal(parts[2],recoverySignature(payload)))fail(403,'Solicite um novo link de recuperação.');
    if(typeof data.password!=='string'||data.password.length<10||data.password.length>256)fail(422,'Use uma senha de 10 a 256 caracteres.');
    const {error}=await supabase.auth.updateUser({password:data.password});if(error)fail(400,'Não foi possível atualizar a senha. Escolha uma senha diferente.');jar.delete('tp-recovery');await supabase.auth.signOut();return json({ok:true});
  }
  const a=await actor();
  if(path==='finance'||path.startsWith('finance/'))return json(await handleFinance({path,method,input:data,query:Object.fromEntries(url.searchParams),repo:supabaseRepository(a),getWorkspace:()=>workspace(a),manager:canManageWorkspace(a.access)}));
  if(path==='auth/session'&&method==='GET')return json({csrf:'',user:{id:a.user.id,email:a.user.email,name:a.access.profile?.full_name||a.user.user_metadata?.name||a.user.email,agencyId:a.wid}});
  if(path==='auth/logout'&&method==='POST'){const {error}=await a.supabase.auth.signOut({scope:'local'});if(error)fail(503,'Não foi possível encerrar a sessão. Tente novamente.');return json({ok:true});}
  if(path==='auth/password'&&method==='POST'){
    if(typeof data.password!=='string'||data.password.length<10||data.password.length>256||typeof data.current!=='string')fail(422,'Confira a senha atual e use uma nova senha de pelo menos 10 caracteres.');
    await rate(a,'password',5);const check=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await check.auth.signInWithPassword({email:a.user.email,password:data.current});if(result.error)fail(403,'Senha atual incorreta.');await check.auth.signOut({scope:'local'});
    const {error}=await a.supabase.auth.updateUser({password:data.password});if(error)fail(400,'Não foi possível alterar a senha.');const signedOut=await a.supabase.auth.signOut({scope:'others'});if(signedOut.error)fail(503,'Senha alterada, mas não foi possível encerrar os outros acessos.');return json({csrf:''});
  }
  if(path==='auth/sessions'&&method==='GET')return json({sessions:[{id:'current',current:true,user_agent:request.headers.get('user-agent')||'Este navegador',last_seen:Date.now()}]});
  if(path.startsWith('auth/sessions/'))fail(501,'Os outros dispositivos são administrados pelo Supabase. Altere a senha para encerrar os demais acessos.');
  if(path==='workspace'&&method==='GET')return json({...await workspace(a),services:await services(a)});
  if(path==='workspace'&&method==='PUT')return json({version:await save(a,data.state,data.version)});
  if(path==='integrations'&&method==='GET')return json({agencyId:a.wid,services:await services(a)});
  if(path.startsWith('integrations/')&&method==='PUT'){
    requireManager(a);const service=path.split('/')[1];if(!providerNames.includes(service))fail(404,'Serviço não encontrado.');const old=await cfg(a,service),input=data.config||{},pub={},secrets={};
    for(const key of ['key','token','appSecret','verifyToken'])if(clean(input[key],10000)||old[key])secrets[key]=clean(input[key],10000)||old[key];
    for(const key of ['endpoint','model','phoneId','version'])if(clean(input[key])||old[key])pub[key]=clean(input[key])||old[key];
    if(pub.endpoint)pub.endpoint=safeEndpoint(pub.endpoint);if(pub.phoneId&&!/^\d+$/.test(pub.phoneId))fail(422,'ID do telefone inválido.');if(pub.version&&!/^v\d+\.\d+$/.test(pub.version))fail(422,'Use a versão Graph no formato vNN.N.');
    const {error}=await a.db.from('travelpro_integrations').upsert({workspace_id:a.wid,service,config:pub,secret:encrypt(secrets)});if(error?.code==='23505')fail(409,'Este telefone já está vinculado a outra agência.');dbError(error);await audit(a,'integration.configured.'+service);return json(connectionStatus(service,{...pub,...secrets}));
  }
  if(path==='cos/chat'&&method==='POST'){
    await rate(a,'cos',20);const row=await workspace(a);if(row.version!==data.version)fail(409,'O contexto mudou. Recarregue antes de conversar.');const text=clean(data.text,10000);if(!text)fail(422,'Escreva seu pedido.');const messages=[...row.state.messages,{role:'user',text}];
    const answer=await cosReply(await cfg(a,'openai'),messages,{agency:row.state.agency,clients:row.state.clients.map(c=>({id:c.id,name:c.name})),trips:row.state.trips.map(t=>({title:t.title,destination:t.destination,status:t.status})),events:row.state.events});
    const q=text.toLowerCase(),[action,label]=/cliente|lead/.test(q)?['new-client','Cadastrar cliente']:/roteiro/.test(q)?['new-itinerary','Preparar roteiro']:/cota|orçamento/.test(q)?['open-quote','Abrir cotação']:/campanha|post|instagram/.test(q)?['new-campaign','Abrir Studio']:['new-trip','Preparar viagem'];
    const response={role:'cos',text:answer||'Posso ajudar a organizar este pedido. Use a ação abaixo para continuar. A conversa livre depende da conexão de IA em Integrações.',action,label,mode:answer?'ai':'guided'};row.state.messages=[...messages,response];const version=await save(a,row.state,row.version);return json({response,messages:row.state.messages,version,mode:response.mode});
  }
  if(['ai/itinerary','ai/campaign'].includes(path)&&method==='POST'){
    await rate(a,'content',10);const row=await workspace(a);if(row.version!==data.version)fail(409,'Os dados mudaram. Recarregue antes de gerar.');
    if(path==='ai/campaign'){const answer=await cosReply(await cfg(a,'openai'),[{role:'user',text:'Escreva uma legenda para '+row.state.studio.title+'. '+row.state.studio.subtitle+'. Não invente tarifas ou disponibilidade.'}],{agency:row.state.agency});if(!answer)fail(503,'Conecte a IA em Integrações.');row.state.studio.caption=answer.slice(0,3000);return json({caption:row.state.studio.caption,version:await save(a,row.state,row.version)});}
    const template=row.state.templates.find(t=>t.id===data.template),trip=row.state.trips.find(t=>t.id===data.trip);if(!template||!clean(data.name)||!clean(data.destination)||(data.trip&&!trip))fail(422,'Confira o nome, destino, modelo e viagem.');
    const answer=await cosReply(await cfg(a,'openai'),[{role:'user',text:'Crie sugestões para um roteiro em '+clean(data.destination,200)+'. Responda somente JSON {"days":[{"period":"Dia 1","title":"...","text":"..."}]}, de 1 a 30 etapas. Não invente reservas, tarifas ou voos.'}],{agency:row.state.agency,template:{name:template.name},trip:trip?{start:trip.start,end:trip.end,travelers:trip.travelers}:null});if(!answer)fail(503,'Conecte a IA ou crie um roteiro editável com o modelo.');
    let parsed;try{parsed=JSON.parse(answer.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{fail(502,'A IA retornou um roteiro inválido. Nenhum roteiro foi criado.');}if(!Array.isArray(parsed.days)||!parsed.days.length||parsed.days.length>30||parsed.days.some(d=>!clean(d.period)||!clean(d.title)||typeof d.text!=='string'))fail(502,'O roteiro retornou incompleto.');
    const id=randomUUID();row.state.itineraries.push({id,name:clean(data.name,150),destination:clean(data.destination,200),template:template.id,trip:trip?.id||'',days:parsed.days.map(d=>({period:clean(d.period,100),title:clean(d.title,200),text:clean(d.text,10000)})),generated:true});return json({id,version:await save(a,row.state,row.version)},201);
  }
  if(path==='operator/quote'&&method==='POST'){
    await rate(a,'operator',15);const c=await cfg(a,'operator');if(!c.endpoint||!c.key)fail(503,'Operadora não conectada. Você pode criar um orçamento manual.');const result=await remote(safeEndpoint(c.endpoint),{method:'POST',headers:{Authorization:'Bearer '+c.key,'Content-Type':'application/json'},body:JSON.stringify({type:'quote',request:data.request})});
    if(result.currency!=='BRL'||!Array.isArray(result.offers)||result.offers.some(o=>typeof o.name!=='string'||!Number.isFinite(o.total)||o.total<0||!Array.isArray(o.inclusions)||o.inclusions.some(i=>typeof i!=='string')))fail(502,'A operadora retornou um formato incompatível com o adaptador.');return json({offers:result.offers,validUntil:result.validUntil||null,source:'operator'});
  }
  if(path==='files'&&method==='POST'){
    await rate(a,'upload',20);const name=clean(data.name,200),ext=name.split('.').pop().toLowerCase();if(!['pdf','docx','txt','md','png','jpg','jpeg'].includes(ext)||typeof data.base64!=='string')fail(422,'Arquivo não permitido.');const bytes=Buffer.from(data.base64,'base64');if(!bytes.length||bytes.length>3*1024*1024)fail(413,'Use um arquivo de até 3 MB.');
    const id=randomUUID()+'/'+encodeURIComponent(name);const {error}=await a.db.storage.from('travelpro-private').upload(a.wid+'/'+id,bytes,{contentType:'application/octet-stream',upsert:false});if(error)fail(503,'Não foi possível guardar o arquivo. Confira se a migração criou o armazenamento privado.');return json({id,name,size:bytes.length,type:'application/octet-stream',url:'/api/files/'+id},201);
  }
  if(path.startsWith('files/')&&method==='GET'){
    const relative=decodeURIComponent(path.slice(6));if(!/^[a-f0-9-]{36}\/[^/\\]+$/i.test(relative)||relative.includes('..'))fail(404,'Arquivo não encontrado.');const {data:file,error}=await a.db.storage.from('travelpro-private').download(a.wid+'/'+relative);if(error||!file)fail(404,'Arquivo não encontrado.');return new ApiResponse(file,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+relative.split('/')[1],'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='whatsapp/draft'&&method==='POST'){await rate(a,'draft',20);return json(await draft(a,data.threadId));}
  if(path==='whatsapp/send'&&method==='POST')return json(await sendWhatsApp(a,data));
  if(path==='audit'&&method==='GET'){requireManager(a);const {data:events,error}=await a.db.from('travelpro_audit').select('action,created_at').eq('workspace_id',a.wid).order('created_at',{ascending:false}).limit(100);dbError(error);return json({events});}
  if(['payments','signatures','studio/generate'].includes(path))fail(501,'Esta integração depende da definição do provedor. Nenhuma operação externa foi realizada.');
  fail(404,'Rota não encontrada.');
 }catch(error){if(!error.status)console.error('TravelPro API:',error.code||error.name);return json({error:error.status?error.message:'Não foi possível concluir a operação. Tente novamente.'},error.status||500);}
}

async function draft(a,threadId){const row=await workspace(a),thread=row.state.whatsapp.threads.find(t=>t.id===threadId);if(!thread)fail(404,'Conversa não encontrada.');if(thread.mode!=='cos')fail(409,'O agente está pausado neste atendimento.');const answer=await cosReply(await cfg(a,'openai'),thread.messages.map(m=>({role:m.role==='customer'?'user':'cos',text:m.text})),{agency:row.state.agency,traveler:thread.profile,instructions:row.state.whatsapp.config.instructions});if(!answer)fail(503,'Conecte a IA para preparar respostas.');thread.draft=answer;return {draft:answer,version:await save(a,row.state,row.version)};}
async function sendWhatsApp(a,input){
 await rate(a,'send',30);const row=await workspace(a),t=row.state.whatsapp.threads.find(t=>t.id===input.threadId),text=clean(input.text,4000),id=clean(input.requestId,100);
 if(!t||t.channel!=='live'||t.mode==='closed'||!text||!id)fail(422,'Escolha uma conversa real aberta e escreva a resposta.');if(!t.lastInbound||Date.now()-t.lastInbound>86400000)fail(422,'A janela de resposta terminou. O envio por template ainda não está integrado.');const c=await cfg(a,'whatsapp');if(!connectionStatus('whatsapp',c).configured)fail(503,'WhatsApp não configurado.');
 const inserted=await a.db.from('travelpro_outbox').insert({workspace_id:a.wid,id});if(inserted.error?.code==='23505'){const old=await a.db.from('travelpro_outbox').select('status,remote_id').eq('workspace_id',a.wid).eq('id',id).single();dbError(old.error);return {status:old.data.status,remoteId:old.data.remote_id};}dbError(inserted.error);
 let remoteId;try{const result=await remote(`https://graph.facebook.com/${c.version}/${c.phoneId}/messages`,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:t.phone.replace(/\D/g,''),type:'text',text:{body:text}})});remoteId=result.messages?.[0]?.id;if(!remoteId)throw Error('unconfirmed');}catch(error){await a.db.from('travelpro_outbox').update({status:'unknown'}).eq('workspace_id',a.wid).eq('id',id);throw error;}
 // Do not repeat a provider send if a concurrent edit prevents saving the local history.
 for(let attempt=0;attempt<3;attempt++){try{const latest=await workspace(a),thread=latest.state.whatsapp.threads.find(x=>x.id===t.id);if(!thread)fail(409,'A mensagem foi enviada, mas a conversa foi removida.');if(!thread.messages.some(m=>m.id===remoteId))thread.messages.push({id:remoteId,role:'team',text,time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});thread.draft='';await save(a,latest.state,latest.version);break;}catch(error){if(error.status!==409||attempt===2){await a.db.from('travelpro_outbox').update({status:'sent_sync_pending',remote_id:remoteId}).eq('workspace_id',a.wid).eq('id',id);fail(409,'Mensagem enviada. O histórico precisa ser conciliado; não repita o envio.');}}}
 const updated=await a.db.from('travelpro_outbox').update({status:'sent',remote_id:remoteId}).eq('workspace_id',a.wid).eq('id',id);dbError(updated.error);return {status:'sent',remoteId};
}
async function whatsappWebhook(request){
 const db=admin(),url=new URL(request.url);const {data:connections,error}=await db.from('travelpro_integrations').select('*').eq('service','whatsapp');dbError(error);
 if(request.method==='GET'){const token=url.searchParams.get('hub.verify_token');if(url.searchParams.get('hub.mode')!=='subscribe'||!token||!connections.some(c=>equal(decrypt(c.secret).verifyToken,token)))fail(403,'Verificação inválida.');return new ApiResponse(url.searchParams.get('hub.challenge')||'');}
 if(request.method!=='POST')fail(405,'Método não permitido.');const raw=await request.text();if(Buffer.byteLength(raw)>1000000)fail(413,'Evento muito grande.');let event;try{event=JSON.parse(raw);}catch{fail(400,'Evento inválido.');}
 for(const entry of event.entry||[])for(const change of entry.changes||[]){const value=change.value,connection=connections.find(c=>c.config.phoneId===value?.metadata?.phone_number_id);if(!connection)continue;const secret=decrypt(connection.secret);if(!secret.appSecret||!equal(request.headers.get('x-hub-signature-256'),'sha256='+createHmac('sha256',secret.appSecret).update(raw).digest('hex')))fail(403,'Assinatura do evento inválida.');
  const w=await db.from('workspaces').select('id,name,type').eq('id',connection.workspace_id).single();dbError(w.error);
  const a={db,wid:connection.workspace_id,user:{id:null,email:''},access:{workspace:w.data,membershipRole:'owner',profile:null}};
  for(const message of value.messages||[]){if(!message.id||!message.from)continue;
   for(let attempt=0;attempt<3;attempt++){try{const existing=await db.from('travelpro_state').select('data,version').eq('workspace_id',a.wid).maybeSingle();dbError(existing.error);if(!existing.data)fail(503,'Abra a agência uma vez antes de ativar o webhook.');const row={state:existing.data.data,version:existing.data.version};if(row.state.whatsapp.threads.some(t=>t.messages.some(m=>m.id===message.id)))break;
     let t=row.state.whatsapp.threads.find(t=>t.phone.replace(/\D/g,'')===message.from);if(!t){t={id:randomUUID(),name:clean(value.contacts?.find(c=>c.wa_id===message.from)?.profile?.name)||message.from,phone:message.from,mode:'cos',channel:'live',profile:{},messages:[],events:[],draft:''};row.state.whatsapp.threads.push(t);}
     if(row.state.whatsapp.config.autoLead&&!t.clientId){let client=row.state.clients.find(c=>c.phone.replace(/\D/g,'')===message.from);if(!client){client={id:randomUUID(),name:t.name,phone:message.from,email:'',origin:'WhatsApp',tag:'Lead',notes:''};row.state.clients.push(client);}t.clientId=client.id;}
     t.lastInbound=Number(message.timestamp)*1000||Date.now();t.messages.push({id:message.id,role:'customer',text:clean(message.text?.body,10000)||'[Mensagem não textual recebida. Confira o WhatsApp.]',time:new Date(t.lastInbound).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});await save(a,row.state,row.version);if(row.state.whatsapp.config.autoDraft&&t.mode==='cos'){const threadId=t.id;after(async()=>{try{await draft(a,threadId);}catch(error){console.error('TravelPro draft pending:',error.status||error.name);}});}break;
    }catch(error){if(error.status!==409||attempt===2)throw error;}}
  }
 }
 return json({ok:true});
}
