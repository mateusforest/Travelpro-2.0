(() => {
  function create(c) {
    const F=window.TravelSalesFlow, e=c.esc;
    const proposals=window.TravelProposalUI?.create(c);
    let requesting=false;
    const state=()=>c.state, trip=id=>state().trips.find(t=>t.id===id);
    const btn=(label,action,id,primary=false)=>`<button type="button" class="${primary?'primary':'outline'}-button" data-action="${action}" data-id="${e(id)}">${label}</button>`;
    const input=(label,name,value='',type='text',required=true)=>`<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${e(value)}" ${required?'required':''} ${type==='number'?'min="0" step="0.01"':''}></label>`;
    const area=(label,name,value='',max=6000)=>`<label class="form-field"><span>${label}</span><textarea name="${name}" maxlength="${max}" rows="3">${e(value)}</textarea></label>`;
    const select=(label,name,options,value)=>`<label class="form-field"><span>${label}</span><select name="${name}">${options.map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select></label>`;
    const submit=label=>`<div class="dialog-actions"><button class="primary-button" type="submit">${label}</button></div>`;
    const stamp=value=>!value?'A confirmar':F.date(value)?new Date(value+'T12:00:00').toLocaleDateString('pt-BR')+' · horário não informado':new Date(value).toLocaleString('pt-BR');
    function flow(t) {
      const q=F.selected(t),b=F.currentBudget(t,state().budgets),f=t.sales?.fulfillment;
      const ready=F.canItinerary(t),approved=b?.status==='Aprovada',waiting=b?.status==='Aguardando aprovação';
      const index=ready?4:approved?3:b?2:q?1:0;
      const labels=['Cotação','Proposta','Aprovação','Reserva e emissão','Roteiro'];
      let body='';
      if(!q)body='<h2>Comece pela cotação</h2><p>Leve o pedido à Europlus. A resposta alimenta os valores e serviços da proposta.</p>'+btn('Fazer cotação','sales-quote',t.id,true);
      else if(!b)body='<h2>Cotação recebida</h2><p>'+e(q.offers.length)+' opção(ões) · validade: '+e(stamp(q.validUntil))+(F.expired(q.validUntil)?' · Confira a validade antes de continuar.':'')+'</p>'+btn('Ver cotação e preparar proposta','sales-quotes',t.id,true);
      else if(ready)body='<h2>Viagem confirmada, paga e emitida</h2><p>Agora prepare o roteiro com os serviços confirmados.</p>'+btn('Preparar roteiro','new-itinerary',t.id,true)+btn('Ver confirmação','sales-fulfillment',t.id);
      else if(approved)body='<h2>Reserva, pagamento e emissão</h2><p>Registre as confirmações da Europlus e acompanhe o prazo da reserva.</p>'+(f?.deadline?'<p class="sales-deadline">Prazo de emissão: '+e(stamp(f.deadline))+(F.expired(f.deadline)&&f.emission!=='issued'?' · Prazo encerrado: consulte a operadora.':'')+'</p>':'')+btn('Acompanhar na operadora','sales-fulfillment',t.id,true);
      else body='<h2>'+(waiting?'Aguardando o cliente':b.status==='Ajuste solicitado'?'Ajustar a proposta':'Personalize a proposta')+'</h2><p>'+(waiting?'Registre a aprovação ou o pedido de ajuste recebido.':'Valores e inclusões vêm da cotação. Revise a apresentação antes de enviar.')+'</p>'+btn('Abrir proposta','sales-budget',b.id,true)+(waiting?btn('Registrar resposta','sales-decision',b.id):btn('Registrar envio','sales-decision',b.id));
      return `<section class="attendance-card sales-flow"><ol aria-label="Etapas do atendimento">${labels.map((l,i)=>`<li class="${i===index?'current':i<index?'past':''}" ${i===index?'aria-current="step"':''}><span>${i+1}</span>${l}</li>`).join('')}</ol><div class="sales-next">${body}${approved&&f?.paymentUrl?'<p><a href="'+e(f.paymentUrl)+'" target="_blank" rel="noopener noreferrer">Abrir link de pagamento da operadora ↗</a></p>':''}</div><div class="sales-links">${btn('Cotações ('+(t.sales?.quotes?.length||0)+')','sales-quotes',t.id)}<small>Confirmações registradas pela agência. Reserva e pagamento acontecem na operadora.</small></div></section>`;
    }
    function quoteForm(t) {
      const d=t.sales?.request||t;
      c.dialog('Fazer cotação',`<form data-form="sales-request"><input type="hidden" name="trip" value="${e(t.id)}"><p>O pedido já está vinculado a ${e(c.client(t.client).name)}.</p>${input('Destino','destination',d.destination==='A definir'?'':d.destination)}${input('Origem','origin',d.origin||'')}<div class="form-grid">${input('Ida','start',d.start||'','date')}${input('Volta','end',d.end||'','date')}</div>${input('Viajantes','travelers',t.travelersPending&&!t.sales?.request?'':d.travelers,'number')}${area('Pedido e preferências','notes',d.notes||'')}<p class="form-hint">${c.connected()?'Consulte a operadora e revise as ofertas recebidas.':'A conexão direta com a Europlus aguarda ativação. Guarde o pedido ou registre a cotação que recebeu por e-mail.'}</p><div class="dialog-actions"><button type="submit" name="intent" value="save" formnovalidate class="outline-button">Guardar pedido</button><button type="submit" name="intent" value="live" class="primary-button" ${c.connected()?'':'disabled'}>Consultar Europlus</button></div></form><div class="sales-links">${btn('Registrar cotação recebida','sales-receive',t.id)}</div>`,'COTAÇÃO');
    }
    function quotes(t) {
      c.dialog('Cotações deste atendimento',`<p>Escolha a oferta que vai apresentar ao cliente. O valor do pacote não é dividido entre serviços quando a operadora não informa essa divisão.</p>${(t.sales?.quotes||[]).slice().reverse().map(q=>`<section class="sales-quote"><p><strong>${e(q.reference||'Cotação recebida')}</strong> · ${q.source==='operator'?'Resposta do adaptador':'Registrada pela agência a partir da cotação'}<br>Validade: ${e(stamp(q.validUntil))}${F.expired(q.validUntil)?' · Atualização necessária':''}</p>${q.offers.map((o,i)=>`<article><h3>${e(o.name)} · ${c.money(o.total)}</h3><ul>${o.inclusions.map(v=>'<li>'+e(v)+'</li>').join('')}</ul><p>${e(o.terms)}</p>${btn('Preparar proposta','sales-build',t.id+'|'+q.id+'|'+i,true)}</article>`).join('')}</section>`).join('')||'<p>Nenhuma cotação recebida ainda.</p>'}<div class="sales-links">${btn('Fazer cotação','sales-quote',t.id)}${btn('Registrar cotação recebida','sales-receive',t.id)}</div>`,'COTAÇÕES');
    }
    function receive(t) {
      const d=t.sales?.request||t;
      c.dialog('Registrar cotação recebida',`<form data-form="sales-receive"><input type="hidden" name="trip" value="${e(t.id)}"><p>Use os dados do e-mail ou documento da operadora. Este registro é manual; depois de conectado, o adaptador preencherá a cotação.</p>${input('Referência da cotação','reference','')}${input('Nome da oferta','name',t.title)}${input('Destino','destination',d.destination==='A definir'?'':d.destination)}<div class="form-grid">${input('Ida','start',d.start||'','date')}${input('Volta','end',d.end||'','date')}</div><div class="form-grid">${input('Viajantes','travelers',t.travelersPending&&!t.sales?.request?'':d.travelers,'number')}${input('Total do grupo (R$)','total','','number')}</div><div class="form-grid">${input('Validade informada','valid','','date')}${input('Horário limite, se informado','time','','time',false)}</div><p class="form-hint">Se houver horário, use seu horário local (${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Sem horário, será registrada somente a data informada.</p>${area('O que está incluso (um serviço por linha)','inclusions')}${area('Condições da operadora','terms')}${submit('Guardar cotação')}</form>`,'COTAÇÃO RECEBIDA');
    }
    function fulfillment(t) {
      const f=t.sales?.fulfillment||{},b=F.currentBudget(t,state().budgets);
      if(b?.status!=='Aprovada')throw Error('Registre a aprovação da proposta antes de acompanhar a reserva.');
      const local=f.deadline&&!F.date(f.deadline)?new Date(new Date(f.deadline).getTime()-new Date(f.deadline).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
      c.dialog('Reserva, pagamento e emissão',`<form data-form="sales-fulfillment"><input type="hidden" name="trip" value="${e(t.id)}"><p>Consulte a Europlus e registre o que ela confirmou. O TravelPro não cria reservas nem cobra cartões nesta etapa.</p>${input('Localizador / referência','reference',f.reference||'','text',false)}${select('Reserva','reservation',[['pending','A iniciar'],['held','Reservada, aguardando confirmação'],['confirmed','Confirmada pela operadora']],f.reservation||'pending')}${input('Prazo de emissão no seu horário local','deadline',local,'datetime-local',false)}${input('Link de pagamento da operadora','paymentUrl',f.paymentUrl||'','url',false)}${select('Pagamento na operadora','payment',[['pending','Aguardando pagamento'],['paid','Pagamento confirmado']],f.payment||'pending')}${select('Emissão','emission',[['pending','Aguardando emissão'],['issued','Emitida pela operadora']],f.emission||'pending')}${area('Confirmação consultada (referência ou observação)','evidence',f.evidence||'')}<p class="form-hint">O cliente informa os dados do cartão somente no ambiente da operadora. O roteiro é liberado após confirmação da reserva, pagamento e emissão.</p>${submit('Salvar acompanhamento')}</form>`,'OPERAÇÃO');
    }
    function decision(b) {
      const options=b.status==='Aguardando aprovação'?[['approved','Cliente aprovou'],['adjustment','Cliente pediu ajuste']]:[['sent','Proposta enviada ao cliente']];
      c.dialog('Registrar etapa da proposta',`<form data-form="sales-decision"><input type="hidden" name="id" value="${e(b.id)}"><p>Registre uma ação já realizada ou uma resposta recebida. Este botão não envia a proposta ao cliente.</p>${select('O que aconteceu?','event',options,options[0][0])}${area('Canal e confirmação recebida','note')}${submit('Registrar')}</form>`,'PROPOSTA');
    }
    function decor(b) {
      if(proposals)return proposals.decor(b);
      return `<section class="sales-personalization"><h3>Apresentação da proposta</h3>${select('Estilo','appearance',[['classic','Clássico'],['warm','Acolhedor']],b.appearance||'classic')}${input('Selo / adesivo (opcional)','badge',b.badge||'','text',false)}${area('Mensagem para o cliente','introduction',b.introduction||'')}<p>Validade original: ${e(stamp(b.validUntil))}</p><h3>Inclusões da cotação</h3><ul>${(b.inclusions||[]).map(v=>'<li>'+e(v)+'</li>').join('')}</ul>${btn('Visualizar apresentação','sales-preview',b.id)}${btn('Registrar envio ou resposta','sales-decision',b.id)}</section>`;
    }
    function presentation(b) {
      return `<article class="sales-presentation ${b.appearance==='warm'?'warm':''}"><small>${e(state().agency)}</small>${b.badge?'<span class="sales-badge">'+e(b.badge)+'</span>':''}<h1>${e(b.name)}</h1><p>Uma proposta para ${e(c.client(b.client).name)}</p><p>${e(b.introduction||'')}</p><h2>${e(b.destination)}</h2><p>${e(b.start)} a ${e(b.end)} · ${b.travelers} viajantes</p><h3>O que está incluso</h3><ul>${(b.inclusions||[]).map(v=>'<li>'+e(v)+'</li>').join('')}</ul>${b.items.map(i=>'<p>'+e(i.name)+' · '+i.qty+' × '+c.money(i.unit)+'</p>').join('')}<h2>${c.money(c.total(b).total)}</h2><p>Desconto: ${c.money(b.discount)}</p><p>Validade: ${e(stamp(b.validUntil||b.valid))}</p><p class="sales-pre">${e(b.notes)}</p><small>Sujeito à disponibilidade e às condições da operadora. A aprovação desta proposta não confirma reserva, pagamento ou emissão.</small></article>`;
    }
    async function action(action,id) {
      if(proposals&&await proposals.action(action,id))return true;
      const t=trip(id);
      if(action==='new-budget'){if(t)quotes(t);else c.dialog('Escolher atendimento','<p>A proposta começa pela cotação do atendimento.</p>'+state().trips.map(t=>'<div class="sales-links">'+btn(e(t.title),'sales-quotes',t.id)+'</div>').join('')+(!state().trips.length?btn('Novo atendimento','new-attendance','',true):''),'PROPOSTAS');return true;}
      if(action==='new-itinerary'&&t&&!F.canItinerary(t)){c.toast('O roteiro fica disponível após confirmar reserva, pagamento e emissão.');return true;}
      if(!action.startsWith('sales-'))return false;
      if(action==='sales-quote')quoteForm(t);
      if(action==='sales-quotes')quotes(t);
      if(action==='sales-receive')receive(t);
      if(action==='sales-fulfillment')fulfillment(t);
      if(action==='sales-budget'){c.close();c.nav('orcamento/'+id);}
      if(action==='sales-build'){
        const [tid,qid,index]=id.split('|'),target=trip(tid),q=target?.sales?.quotes.find(q=>q.id===qid);
        const existing=state().budgets.find(b=>b.trip===tid&&b.quoteId===qid&&b.offerIndex===Number(index));
        if(existing){c.close();c.nav('orcamento/'+existing.id);return true;}
        if(target?.sales?.fulfillment)throw Error('Este atendimento já tem uma reserva em acompanhamento. Confira a operação antes de trocar a proposta.');
        const b=F.buildBudget(target,q,Number(index),c.uid('b'));state().budgets.push(b);target.sales.quoteId=q.id;target.sales.budgetId=b.id;Object.assign(target,{destination:b.destination,start:b.start,end:b.end,travelers:b.travelers,datesPending:false,travelersPending:false});target.status='Preparando proposta';c.close();c.nav('orcamento/'+b.id);
      }
      if(['sales-decision','sales-preview','sales-download'].includes(action)){
        if(c.editorOpen()&&!c.saveBudget())return true;
        const b=state().budgets.find(b=>b.id===id);if(!b)throw Error('Proposta não encontrada.');
        if(action==='sales-decision')decision(b);
        else if(action==='sales-preview')c.dialog('Apresentação para o cliente',presentation(b)+btn('Baixar apresentação','sales-download',b.id),'PROPOSTA');
        else c.download(b.name,`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(b.name)}</title><style>body{margin:0;background:#f5f3ee;font:17px/1.6 system-ui;color:#193d30}article{max-width:800px;margin:auto;padding:48px;background:white}.warm{background:#fff7eb}.sales-badge{float:right;background:#f65c28;color:white;padding:5px 16px;border-radius:30px}.sales-pre{white-space:pre-wrap}h1{font-size:38px}</style>${presentation(b)}</html>`);
      }
      return true;
    }
    function storeQuote(t,request,result,source) {
      const q={...F.normalizeQuote(result),id:c.uid('q'),trip:t.id,client:t.client,destination:request.destination,start:request.start,end:request.end,travelers:Number(request.travelers),source,receivedAt:new Date().toISOString()};
      t.sales||={quotes:[]};t.sales.quotes.push(q);t.sales.quoteId=q.id;if(!t.sales.budgetId)t.status='Cotação recebida';return q;
    }
    async function submitForm(name,d) {
      if(proposals&&await proposals.submit(name,d))return true;
      if(!name.startsWith('sales-'))return false;
      const t=trip(d.trip);
      if(name==='sales-request'){
        if(requesting)return true;
        if(!t)throw Error('Atendimento não encontrado.');if(d._intent==='live'&&(!d.destination.trim()||!d.origin.trim()||!F.date(d.start)||!F.date(d.end)||d.end<d.start||!Number.isInteger(Number(d.travelers))||Number(d.travelers)<1||Number(d.travelers)>100))throw Error('Complete destino, origem, datas e viajantes.');if((d.start&&!F.date(d.start))||(d.end&&!F.date(d.end))||(d.start&&d.end&&d.end<d.start)||(d.travelers&&(!Number.isInteger(Number(d.travelers))||Number(d.travelers)<1||Number(d.travelers)>100)))throw Error('Confira datas e viajantes do pedido.');
        const request={trip:t.id,client:t.client,destination:d.destination.trim(),origin:d.origin.trim(),start:d.start,end:d.end,travelers:d.travelers?Number(d.travelers):null,notes:d.notes};
        t.sales||={quotes:[]};t.sales.request=request;
        if(d._intent==='live'){
          if(!c.connected())throw Error('A conexão direta aguarda ativação pela equipe TravelPro.');
          requesting=true;const form=document.querySelector('[data-form="sales-request"]');form?.querySelectorAll('button').forEach(b=>b.disabled=true);
          try{await c.flush();const result=await c.request('/operator/quote',{method:'POST',body:{request}});const latest=trip(request.trip);if(!latest||latest.client!==request.client)throw Error('O atendimento mudou durante a consulta. Confira o pedido.');storeQuote(latest,request,{...result,currency:result.currency||'BRL'},'operator');c.close();c.render();quotes(latest);}finally{requesting=false;form?.querySelectorAll('button').forEach(b=>b.disabled=false);}
        }else {c.close();c.render();c.toast('Pedido guardado. Nenhuma solicitação enviada à operadora.');}
      }
      if(name==='sales-receive'){
        if(!t||!F.date(d.start)||!F.date(d.end)||d.end<d.start||!F.date(d.valid)||!d.destination.trim()||!d.reference.trim()||!Number.isInteger(Number(d.travelers))||Number(d.travelers)<1||Number(d.travelers)>100||d.total==='')throw Error('Confira referência, datas, viajantes, validade e total.');
        const validUntil=d.time?new Date(d.valid+'T'+d.time).toISOString():d.valid;
        storeQuote(t,d,{currency:'BRL',reference:d.reference,validUntil,offers:[{name:d.name,total:Number(d.total),inclusions:d.inclusions.split('\n').map(s=>s.trim()).filter(Boolean),terms:d.terms}]},'manual');c.close();c.render();quotes(t);
      }
      if(name==='sales-decision'){const b=state().budgets.find(b=>b.id===d.id),target=trip(b?.trip);if(!target)throw Error('Vincule a proposta a um atendimento.');F.recordDecision(target,b,d.event,d.note);c.close();c.render();}
      if(name==='sales-fulfillment'){if(!t)throw Error('Atendimento não encontrado.');F.recordFulfillment(t,F.currentBudget(t,state().budgets),{...d,deadline:d.deadline?new Date(d.deadline).toISOString():''});c.close();c.render();}
      return true;
    }
    return {flow,decor,action,submitForm,canItinerary:F.canItinerary};
  }
  window.TravelSalesUI={create};
})();
