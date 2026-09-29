import {createHash} from 'node:crypto';
import {fail,salesFlow} from './validation.mjs';
import {connectionStatus,remote} from './providers.mjs';
import {proposalPDF,proposalTotal,money} from './proposal-pdf.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const digits=x=>String(x||'').replace(/\D/g,'');
export function proposalSnapshot(state,id){
 const b=state.budgets.find(b=>b.id===id);if(!b)fail(404,'Proposta não encontrada nesta agência.');
 const client=state.clients.find(c=>c.id===b.client),trip=state.trips.find(t=>t.id===b.trip&&t.client===b.client);
 if(!client||!trip||!b.quoteId)fail(422,'Vincule a proposta à cotação de um atendimento.');
 if(b.destination.length>200||client.name.length>200||b.name.length>200||b.items.length>100||(b.inclusions||[]).length>100||String(b.notes||'').length>6000||String(b.introduction||'').length>6000||String(b.badge||'').length>60||b.items.some(i=>i.name.length>600))fail(422,'Reduza os textos ou a quantidade de serviços da proposta.');
 const content={...b};delete content.status;delete content.decisionHistory;delete content.delivery;
 const fingerprint=hash([content,client.name,client.phone,state.agency,b.brand||state.proposalBrand||null]);
 return {b,client,trip,fingerprint,filename:'Proposta-'+b.destination.replace(/[^a-z0-9À-ÿ -]/gi,'').slice(0,70)+'.pdf'};
}
export function deliveryEligibility(state,snapshot,config,now=Date.now()){
 if(!connectionStatus('whatsapp',config).configured)return {ready:false,reason:'Conecte o WhatsApp Business da agência em Conexões para enviar por aqui.'};
 const phone=digits(snapshot.client.phone);
 if(!/^[1-9]\d{9,14}$/.test(phone))return {ready:false,reason:'Complete o telefone do cliente com código do país e DDD na ficha dele.'};
 const thread=state.whatsapp.threads.find(t=>t.clientId===snapshot.client.id&&digits(t.phone)===phone&&t.channel==='live'&&t.mode!=='closed'&&t.lastInbound<=now&&now-t.lastInbound<86400000);
 if(!thread)return {ready:false,reason:'O cliente precisa ter enviado uma mensagem nas últimas 24 horas. Fora desse período, será necessário ativar um modelo aprovado pela Meta.'};
 if(salesFlow.expired(snapshot.b.validUntil||snapshot.b.valid,now))return {ready:false,reason:'A cotação venceu. Atualize os valores com a operadora antes de enviar.'};
 if(snapshot.trip.sales?.fulfillment||snapshot.b.status==='Aprovada')return {ready:false,reason:'Esta proposta já está aprovada. Consulte o atendimento para acompanhar a reserva.'};
 return {ready:true,phone,threadId:thread.id};
}
export async function proposalPreview(state,id,config){
 const s=proposalSnapshot(state,id),pdf=await proposalPDF(state,s.b);
 return {filename:s.filename,base64:pdf.toString('base64'),fingerprint:s.fingerprint,recipient:s.client.name,phone:s.client.phone,
 message:`Olá, ${s.client.name.split(' ')[0]}! Preparamos sua proposta para ${s.b.destination}.\n\nNo PDF você encontra os serviços inclusos, as condições e o investimento de ${money(proposalTotal(s.b))} para o grupo.\n\nVeja com carinho e me conte o que achou. Podemos ajustar os detalhes juntos!\n\n${state.agency}`,...deliveryEligibility(state,s,config)};
}
// Outbox is claimed before contacting Meta. Uncertain results are never retried automatically.
export async function deliverProposal(repo,input,config,{request=remote,now=Date.now()}={}){
 const row=await repo.load(),s=proposalSnapshot(row.state,input.id);
 if(input.fingerprint!==s.fingerprint)fail(409,'A proposta ou o contato mudou. Abra o envio novamente para revisar o PDF.');
 const message=String(input.message||'').trim();if(!message||message.length>1000)fail(422,'Escreva uma mensagem de até 1.000 caracteres.');
 const id='proposal-'+hash([repo.scope,s.fingerprint]);
 const old=await repo.find(id);if(old)return {status:old.status,remoteId:old.remote_id};
 const ready=deliveryEligibility(row.state,s,config,now);if(!ready.ready)fail(422,ready.reason);
 if(!/^v\d+\.\d+$/.test(config.version)||!/^\d+$/.test(config.phoneId))fail(422,'Revise a configuração do WhatsApp com a equipe TravelPro.');
 const pdf=await proposalPDF(row.state,s.b);
 if(!await repo.claim(id,ready.threadId,message))return {status:'sending'};
 let remoteId;
 try{
   const form=new FormData();form.set('messaging_product','whatsapp');form.set('type','application/pdf');form.set('file',new Blob([pdf],{type:'application/pdf'}),s.filename);
   const headers={Authorization:'Bearer '+config.token},base=`https://graph.facebook.com/${config.version}/${config.phoneId}`;
   const media=await request(base+'/media',{method:'POST',headers,body:form});
   if(!media.id)throw Error('Arquivo não confirmado pelo WhatsApp.');
   // Recheck after upload: a concurrently revised proposal must not be sent.
   const latest=await repo.load(),check=proposalSnapshot(latest.state,input.id);
   if(check.fingerprint!==s.fingerprint||!deliveryEligibility(latest.state,check,config).ready)throw Error('A proposta ou o atendimento mudou durante a preparação.');
   const result=await request(base+'/messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:ready.phone,type:'document',document:{id:media.id,filename:s.filename,caption:message}})});
   remoteId=result.messages?.[0]?.id;if(!remoteId)throw Error('Envio não confirmado pelo WhatsApp.');
 }catch(error){await repo.update(id,'unknown');fail(502,'O envio não foi confirmado. Confira a conversa antes de qualquer nova tentativa.');}
 await repo.update(id,'sent_sync_pending',remoteId);
 for(let attempt=0;attempt<3;attempt++){
   try{
     const latest=await repo.load(),current=proposalSnapshot(latest.state,input.id),thread=latest.state.whatsapp.threads.find(t=>t.id===ready.threadId);
     if(!thread||current.fingerprint!==s.fingerprint)fail(409,'Proposta alterada durante o envio.');
     if(!thread.messages.some(m=>m.id===remoteId))thread.messages.push({id:remoteId,role:'team',text:message+'\n[PDF: '+s.filename+']',time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
     if(current.b.status!=='Aprovada'&&!current.trip.sales?.fulfillment){current.b.status='Aguardando aprovação';current.trip.status='Aguardando aprovação';}
     current.b.decisionHistory||=[];if(!current.b.decisionHistory.some(h=>h.remoteId===remoteId))current.b.decisionHistory.push({event:'sent',source:'whatsapp',at:new Date().toISOString(),note:'PDF aceito pelo WhatsApp. Entrega e leitura ainda não confirmadas.',remoteId});
     current.b.delivery={remoteId,at:new Date().toISOString(),filename:s.filename,status:'accepted'};
     await repo.save(latest.state,latest.version);await repo.update(id,'sent',remoteId);return {status:'sent',remoteId};
   }catch(error){if(error.status!==409||attempt===2)return {status:'sent_sync_pending',remoteId};}
 }
}
