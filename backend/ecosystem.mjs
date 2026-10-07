import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {fail} from './validation.mjs';
export const ecosystemTargets={travelmatch:'https://travelmatch-bice.vercel.app',vuei:'https://www.meuvuei.com'};
const hash=s=>createHash('sha256').update(s).digest('base64url');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function ecosystemPayload(a,state,target,record){
 if(!ecosystemTargets[target])fail(422,'Ferramenta inválida.');
 if(!a.user.email||!a.user.email_confirmed_at)fail(403,'Confirme o e-mail da sua conta antes de continuar.');
 const result={issuer:'https://www.usetravelpro.com',audience:target,workspaceId:a.wid,userId:a.user.id,email:a.user.email,name:a.user.user_metadata?.name||a.user.email,agency:state.agency,included:true};
 if(!record)return result;
 if(target==='vuei'){
  const t=state.trips.find(t=>t.id===record);if(!t)fail(404,'Viagem não encontrada nesta agência.');
  const c=state.clients.find(c=>c.id===t.client);if(!c||c.deletedAt)fail(422,'Confira o cliente da viagem.');
  result.record={id:t.id,title:t.title,destination:t.destination,start:t.datesPending?null:t.start,end:t.datesPending?null:t.end,travelers:t.travelers,client:{id:c.id,name:c.name,email:c.email||'',phone:c.phone||''}};
 }else{
  const b=state.budgets.find(b=>b.id===record);if(!b)fail(404,'Proposta não encontrada nesta agência.');
  // Marketplace drafts never receive private contacts, documents, or internal notes.
  result.record={id:b.id,title:b.destination||'Pacote de viagem',destination:b.destination,start:b.start,end:b.end,travelers:b.travelers,items:(b.items||[]).map(i=>({name:i.name,qty:i.qty,unit:i.unit})),discount:b.discount||0};
 }
 return result;
}
export async function issueEcosystemCode(repo,{payload,challenge,now=Date.now()}){
 if(!/^[A-Za-z0-9_-]{43}$/.test(challenge||''))fail(422,'Inicie novamente o acesso à ferramenta.');
 const nonce=randomBytes(32).toString('base64url'),service='ecosystem-code:'+hash(nonce);
 await repo.put(service,{payload,challenge,expires:now+120000});
 return payload.workspaceId+'.'+nonce;
}
export async function redeemEcosystemCode(repo,{code,verifier,target,now=Date.now()}){
 if(!ecosystemTargets[target]||!/^[-a-f0-9]{36}\.[A-Za-z0-9_-]{43}$/.test(code||'')||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier||''))fail(400,'Acesso inválido.');
 const [wid,nonce]=code.split('.'),service='ecosystem-code:'+hash(nonce),row=await repo.get(wid,service);
 if(!row||row.value.expires<now||row.value.payload.audience!==target||!same(row.value.challenge,hash(verifier)))fail(403,'Acesso expirado ou inválido. Volte ao TravelPro.');
 if(!await repo.consume(wid,service,row.token))fail(409,'Este acesso já foi utilizado. Volte ao TravelPro.');
 return row.value.payload;
}
