import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {remote,safeEndpoint,connectionStatus} from './providers.mjs';
import {fail} from './validation.mjs';
export const isAKG=c=>c?.provider==='wa-akg';
export const gatewaySession=scope=>'travelpro-'+String(scope).replace(/[^a-zA-Z0-9-]/g,'');
export function gatewayEndpoint(value){const u=new URL(safeEndpoint(value));if(u.search)fail(422,'A URL da WA-AKG não deve ter parâmetros.');return u.href.replace(/\/+$/,'').replace(/\/api$/,'')+'/api';}
const unwrap=r=>{if(r?.status===false||r?.success===false)fail(502,'A WA-AKG recusou a operação. Confira a sessão.');return r?.data??r;};
async function call(c,path,options={},request=remote){if(!isAKG(c)||!connectionStatus('whatsapp',c).configured)fail(503,'Configure o servidor WA-AKG e a chave da API para conectar por QR Code.');return unwrap(await request(gatewayEndpoint(c.endpoint)+path,{...options,headers:{'X-API-Key':c.key,...options.headers}}));}
const sessionPath=c=>'/sessions/'+encodeURIComponent(c.sessionId);
export async function sessionStatus(c,{request=remote}={}){
 if(!isAKG(c)||!connectionStatus('whatsapp',c).configured)return {provider:'wa-akg',configured:false,connected:false,status:'unconfigured'};
 const r=await call(c,sessionPath(c),{},request),connected=r.status==='CONNECTED'&&r.hasInstance===true&&!!r.me?.id;
 return {provider:'wa-akg',configured:true,connected,status:connected?'connected':String(r.status||'disconnected').toLowerCase(),phone:connected?String(r.me.id).split('@')[0].split(':')[0]:'',sessionId:c.sessionId,checkedAt:new Date().toISOString()};
}
export async function manageSession(c,action,{scope,origin,request=remote}={}){
 if(!['status','qr','create','start','stop','webhook'].includes(action))fail(422,'Ação da sessão inválida.');
 if(action==='status')return sessionStatus(c,{request});
 if(action==='qr'){
  const status=await sessionStatus(c,{request});if(status.connected)return status;
  const r=await call(c,sessionPath(c)+'/qr',{},request);
  if(typeof r.base64!=='string'||r.base64.length>200000||!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(r.base64))fail(502,'O QR Code ainda não está disponível. Aguarde e atualize.');
  return {...status,qr:r.base64,status:'awaiting_qr',expiresIn:45};
 }
 if(action==='webhook'){
  const url=safeEndpoint(origin+'/api/webhooks/wa-akg/'+encodeURIComponent(scope));
  const rows=await call(c,'/webhooks/'+encodeURIComponent(c.sessionId),{},request);
  if(!Array.isArray(rows))fail(502,'A WA-AKG não confirmou a lista de webhooks.');
  const existing=rows.find(r=>r.url===url),body={name:'TravelPro COS',url,secret:c.webhookSecret,events:['message.received'],isActive:true};
  await call(c,'/webhooks/'+encodeURIComponent(c.sessionId)+(existing?'/'+encodeURIComponent(existing.id):''),{method:existing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},request);
  return {registered:true};
 }
 if(action==='create')await call(c,'/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'TravelPro COS',sessionId:c.sessionId})},request);
 else {if(action==='start'){const bot=await call(c,sessionPath(c)+'/bot-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({botMode:'SPECIFIC',botAllowedJids:[],autoReplyMode:'SPECIFIC',autoReplyAllowedJids:[],enabled:false,prefix:'__travelpro_'+randomUUID()+'__',enablePing:false,enableUptime:false,enableSticker:false,enableVideoSticker:false,welcomeMessage:null,autoRead:false,alwaysOnline:false})},request);if(bot.botMode!=='SPECIFIC'||bot.autoReplyMode!=='SPECIFIC'||bot.botAllowedJids?.length!==0||bot.autoReplyAllowedJids?.length!==0)fail(502,'Revise as respostas automáticas da WA-AKG antes de iniciar.');}await call(c,sessionPath(c)+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},request);}
 return {accepted:true,action};
}
export function assertChannel(c,t){
 if(!isAKG(c))return;
 if(t.provider!=='wa-akg'||t.gatewaySession!==c.sessionId)fail(409,'Esta conversa pertence a outra conexão. Aguarde uma nova mensagem no número conectado.');
}
export async function sendText(c,phone,text,{request=remote}={}){
 if(!/^[1-9]\d{9,14}$/.test(phone))fail(422,'Telefone inválido.');
 if(isAKG(c)){
  if(!(await sessionStatus(c,{request})).connected)fail(409,'O WhatsApp está desconectado. Escaneie o QR Code em Conexões.');
  const r=await call(c,'/messages/'+encodeURIComponent(c.sessionId)+'/'+encodeURIComponent(phone+'@s.whatsapp.net')+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{text}})},request);
  if(!r?.key?.id)fail(502,'O provedor não confirmou o envio. Confira a conversa antes de repetir.');return r.key.id;
 }
 const r=await request(`https://graph.facebook.com/${c.version}/${c.phoneId}/messages`,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'text',text:{body:text}})});
 if(!r.messages?.[0]?.id)fail(502,'O provedor não confirmou o envio.');return r.messages[0].id;
}
export async function sendPDF(c,phone,pdf,filename,caption,{request=remote}={}){
 if(!(await sessionStatus(c,{request})).connected)fail(409,'Reconecte o WhatsApp em Conexões.');
 const form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),filename);form.set('type','document');form.set('caption',caption);
 const r=await call(c,'/messages/'+encodeURIComponent(c.sessionId)+'/'+encodeURIComponent(phone+'@s.whatsapp.net')+'/media',{method:'POST',body:form},request);
 if(!r?.key?.id)fail(502,'Envio do PDF sem confirmação.');return r.key.id;
}
export function verifiedEvent(c,raw,signature,now=Date.now()){
 if(!isAKG(c)||!c.webhookSecret||raw.length>1048576)fail(403,'Webhook inválido.');
 const expected=Buffer.from('sha256='+createHmac('sha256',c.webhookSecret).update(raw).digest('hex')),received=Buffer.from(String(signature||''));
 if(expected.length!==received.length||!timingSafeEqual(expected,received))fail(403,'Assinatura do webhook inválida.');
 let event;try{event=JSON.parse(raw.toString());}catch{fail(400,'Evento inválido.');}
 if(event.sessionId!==c.sessionId)fail(403,'Sessão do webhook inválida.');
 const when=Date.parse(event.timestamp);if(!Number.isFinite(when)||Math.abs(now-when)>300000)fail(403,'Evento expirado.');
 return event;
}
export function receiveEvent(state,event,c,now=Date.now()){
 const m=event.data||{},jid=String(m.from||m.key?.remoteJid||'');
 if(event.event!=='message.received'||m.key?.fromMe||m.isGroup||m.chatType&&m.chatType!=='PERSONAL'||!/^\d{10,15}@s\.whatsapp\.net$/.test(jid)||!m.key?.id)return {accepted:false};
 const remoteId='akg:'+c.sessionId+':'+String(m.key.id).slice(0,150);
 if(state.whatsapp.threads.some(t=>t.messages.some(x=>x.id===remoteId)))return {accepted:false};
 const phone=jid.split('@')[0],text=(typeof m.content==='string'?m.content:'').trim().slice(0,10000)||'[Mensagem não textual. Confira o arquivo no WhatsApp.]';
 let t=state.whatsapp.threads.find(t=>t.phone.replace(/\D/g,'')===phone&&t.provider==='wa-akg'&&t.gatewaySession===c.sessionId);
 if(!t){t={id:randomUUID(),name:String(m.pushName||phone).slice(0,150),phone,provider:'wa-akg',gatewaySession:c.sessionId,channel:'live',mode:'cos',profile:{},messages:[],events:[],draft:''};state.whatsapp.threads.unshift(t);}
 if(state.whatsapp.config.autoLead){t.lead=true;if(!t.clientId){let client=state.clients.find(x=>x.phone.replace(/\D/g,'')===phone);if(!client){client={id:randomUUID(),name:t.name,phone,email:'',origin:'WhatsApp',tag:'Lead',notes:''};state.clients.push(client);}t.clientId=client.id;}}
 const ts=Number(m.messageTimestamp)*1000;t.lastInbound=Math.min(now,Number.isFinite(ts)&&ts>0?ts:now);t.draft='';
 t.messages.push({id:remoteId,role:'customer',text,time:new Date(t.lastInbound).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})});
 if(/atendente|falar com (uma )?pessoa|humano/i.test(text)){t.mode='human';t.events.push('Solicitação de atendimento humano.');}else if(t.mode==='closed')t.mode='cos';
 return {accepted:true,threadId:t.id,messageId:remoteId,autoDraft:t.mode==='cos'&&state.whatsapp.config.autoDraft===true};
}
