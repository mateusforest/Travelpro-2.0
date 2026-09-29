import {fail,validateState} from './validation.mjs';
// A file is already private and stored before a chat operation is proposed.
// Matching never chooses between homonymous clients; confirmation stays explicit.
export function documentOperation(state,input){
  if(!input?.attachmentId)return null;
  const d=state.documents.find(d=>d.file?.id===input.attachmentId);
  if(!d)fail(404,'O anexo não foi encontrado nesta agência. Anexe o arquivo novamente.');
  const q=String(input.text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const candidates=state.clients.filter(c=>q.includes(c.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
  const type=['Passaporte','Voucher','Visto','Seguro','Proposta','Contrato','RG','CPF','Roteiro'].find(t=>new RegExp('\\b'+t.toLowerCase()+'\\b').test(q))||(d.type==='Anexo'?'Arquivo':d.type)||'Arquivo';
  return {kind:'document',documentId:d.id,clientId:candidates.length===1?candidates[0].id:'',tripId:d.trip||'',type:type==='Seguro'?'Seguro viagem':type};
}
export function applyDocumentOperation(current,input){
  if(!input||input.kind!=='document')fail(422,'Revise a operação do documento.');
  const state=structuredClone(current),d=state.documents.find(d=>d.id===input.documentId);
  if(!d?.file)fail(404,'O arquivo não foi encontrado nesta agência.');
  const before=JSON.stringify(d);
  if(input.clientId&&!state.clients.some(c=>c.id===input.clientId))fail(422,'Selecione um cliente da agência.');
  const trip=state.trips.find(t=>t.id===input.tripId);
  if(input.tripId&&!trip)fail(422,'Selecione uma viagem da agência.');
  if(trip&&input.clientId&&trip.client!==input.clientId&&!(trip.participants||[]).includes(input.clientId))fail(422,'O cliente selecionado não participa desta viagem. Confira os vínculos.');
  if(typeof input.type!=='string'||!input.type.trim()||input.type.length>80)fail(422,'Selecione o tipo do documento.');
  d.type=input.type.trim();d.trip=input.tripId||d.trip||'';
  // Add links; do not discard earlier clients or the original file.
  d.clients=[...new Set([...(d.clients||[]),...(input.clientId?[input.clientId]:[]),...(trip?[trip.client]:[])])];
  d.status='Organizado';
  if(JSON.stringify(d)!==before)state.messages.push({role:'cos',mode:'operational',text:'Documento organizado: '+d.name+'. '+(d.clients.length?'Vinculado a '+d.clients.map(id=>state.clients.find(c=>c.id===id).name).join(', ')+'. ':'')+(d.trip?'Também vinculado à viagem '+state.trips.find(t=>t.id===d.trip).title+'. ':'')+'O arquivo original foi preservado.'});
  validateState(state);return {state,documentId:d.id};
}
// Shared, deterministic support and reviewed actions for both runtimes.
export function cosSupport(text,state){
  const q=String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const result=(text,action,label)=>({text,action,label});
  if(/senha|seguranca|inatividade|sessao/.test(q))return result('Em Segurança você altera a senha e escolhe a expiração por inatividade. A troca de senha encerra os outros acessos. Não compartilhe senhas ou códigos comigo.','support-security','Abrir segurança');
  if(/whatsapp|conectar|integrac|assinatura|open finance/.test(q))return result('Em Conexões, cadastre o número de atendimento e acompanhe a ativação pela equipe. Cadastrar um número não conecta a Meta. Propostas usam envio com PDF e confirmação do provedor; fora da janela de atendimento é necessário um modelo aprovado. Assinatura e Open Finance dependem de contratação e credenciais.','support-connections','Abrir conexões');
  if(/financeir|granatum|saldo|receita|despesa|concili/.test(q))return result('O Financeiro reúne contas, lançamentos e pagamentos. A conciliação automática por extrato ainda depende do Open Finance. A importação do Granatum preserva a origem dos registros. Confira o período e a conta antes de comparar valores. Não consulto saldos bancários sem uma conexão ativa.','support-finance','Abrir financeiro');
  if(/document|passaporte|voucher|seguro|visto|\brg\b/.test(q))return result('Escolha o tipo do documento, anexe o arquivo e vincule os clientes que devem recebê-lo no perfil. A viagem é opcional. Documentos ficam restritos à agência.','new-document','Adicionar documento');
  if(/print|extra|cole|colar|conversa|cadastr|registre|crie.*atendimento/.test(q))return result('Cole o pedido ou adicione o print. Vou organizar um rascunho de cliente e atendimento. Você confere os dados e confirma antes de gravar.','assistant-intake','Organizar e revisar pedido');
  if(/roteiro/.test(q))return result('O roteiro detalhado entra depois da confirmação da reserva, pagamento e emissão. Antes da venda, prepare a apresentação usando a cotação recebida. Abra o atendimento para seguir a etapa correta.','support-attendances','Ver atendimentos');
  if(/proposta|cota|emissao|reserva|fluxo/.test(q))return result('O fluxo é: pedido → cotação da operadora → proposta preenchida → envio e aprovação ou ajustes → reserva, pagamento e emissão → roteiro. A validade da cotação precisa ser conferida antes de reservar.','support-attendances','Abrir atendimentos');
  if(/agenda|notifica|prazo|hoje|penden/.test(q))return result('Os avisos reúnem compromissos pendentes e prioridades dos atendimentos. Conclua cada compromisso depois de executar a tarefa. Os avisos deste portal não são notificações push.','notifications','Ver prioridades');
  if(/plano|faturamento|mensalidade/.test(q))return result('As condições comerciais estão em definição. Os dados de faturamento podem ser preparados, mas o portal não está cobrando uma assinatura.','support-billing','Ver faturamento');
  if(/cliente|lead/.test(q))return result(`Sua agência tem ${state.clients.length} clientes registrados. Podemos organizar um pedido com os dados que você já recebeu e revisar antes de cadastrar.`,'assistant-intake','Organizar pedido');
  return result(`Sou o COS da ${state.agency}. Posso orientar sobre o portal e organizar pedidos para revisão. Diga o que precisa fazer: cadastrar um cliente, preparar uma proposta, anexar documentos ou conferir próximos passos.`,'assistant-intake','Organizar um pedido');
}
export function cosContext(state){return {agency:state.agency,clients:state.clients.map(c=>({id:c.id,name:c.name})),trips:state.trips.map(t=>({title:t.title,destination:t.destination,status:t.status})),events:state.events.filter(e=>!e.completed),instructions:'Oriente a agência sobre o uso do TravelPro e ajude a revisar a próxima operação. Documentos aceitam vínculos opcionais a clientes e viagem. Cotação precede proposta; roteiro só após reserva, pagamento e emissão confirmados. Pagamento ocorre na operadora. Valores e estados só podem ser afirmados quando presentes nos dados. Nada foi executado por esta conversa; use as ações de revisão oferecidas pela interface.'};}
