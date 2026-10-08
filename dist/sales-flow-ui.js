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
    function pricingFields(saved) {
      const p=saved?.input||{};
      return `<fieldset class="sales-pricing"><legend>Preço e ganho da agência</legend>${select('Como definir o preço','priceMethod',[['final','Informar preço final'],['markup','Acrescentar percentual ao custo'],['margin','Definir margem sobre a venda']],p.mode||'final')}<div data-pricing-fields ${saved?'':'hidden'}><p class="form-hint">Valores internos. Informe o custo líquido do grupo, com taxas do fornecedor e câmbio já conferidos. Se uma comissão já foi abatida do custo, não a some novamente.</p><div class="form-grid">${input('Custo líquido do grupo (R$)','netCost',p.cost??'','number',false)}${input('Percentual de ganho (%)','gainRate',p.rate??10,'number',false)}${input('Taxa de serviço adicional (R$)','serviceFee',p.serviceFee??0,'number',false)}${input('Taxa do pagamento (%)','paymentPercent',p.paymentPercent??0,'number',false)}${input('Taxa fixa do pagamento (R$)','paymentFixed',p.paymentFixed??0,'number',false)}</div><p class="form-hint">Acréscimo de 10% sobre o custo é diferente de margem de 10% sobre a venda. As taxas de pagamento informadas serão incluídas no preço final.</p></div><output data-pricing-result aria-live="polite"></output><p class="form-hint">Custos e ganho não aparecem no documento do cliente. Resultado previsto antes dos tributos e despesas da agência; não representa comissão recebida.</p></fieldset>`;
    }
    const priceData=d=>!d.priceMethod||d.priceMethod==='final'?null:F.priceQuote({mode:d.priceMethod,cost:d.netCost,rate:d.gainRate,serviceFee:d.serviceFee,paymentPercent:d.paymentPercent,paymentFixed:d.paymentFixed});
    function privateSummary(q) {
      if(!q.privatePricing)return '';
      const p=F.priceQuote(q.privatePricing.input).result;
      return `<aside class="sales-private-summary"><strong>Somente para a agência · cotação de origem</strong><p>Custo líquido: ${c.money(p.costCents/100)} · Taxas de pagamento estimadas: ${c.money(p.paymentFeeCents/100)} · Resultado previsto: ${c.money(p.contributionCents/100)}</p><small>Antes dos tributos e despesas da agência. Alterações posteriores na proposta não atualizam esta estimativa.</small></aside>`;
    }
    function bindPricing() {
      const form=document.querySelector('form[data-form="sales-quick"],form[data-form="sales-receive"]');if(!form)return;
      const update=()=>{
        const enabled=form.elements.priceMethod.value!=='final',fields=form.querySelector('[data-pricing-fields]'),out=form.querySelector('[data-pricing-result]'),total=form.elements.total;
        fields.hidden=!enabled;fields.querySelectorAll('input').forEach(el=>{el.disabled=!enabled;el.required=enabled;});total.readOnly=enabled;
        const visible=total.closest('label')?.querySelector('.portal-currency input');if(visible)visible.readOnly=enabled;
        out.textContent='';if(!enabled){total.setCustomValidity('');return;}
        try{const p=priceData(Object.fromEntries(new FormData(form))).result;total.value=(p.saleCents/100).toFixed(2);if(visible){visible.value=(p.saleCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});visible.setCustomValidity('');}total.setCustomValidity('');out.textContent='Venda: '+c.money(p.saleCents/100)+' · Taxas de pagamento: '+c.money(p.paymentFeeCents/100)+' · Resultado previsto: '+c.money(p.contributionCents/100);}
        catch(error){total.value='';if(visible)visible.value='';total.setCustomValidity(error.message);out.textContent=error.message;}
      };
      form.addEventListener('input',update);form.addEventListener('change',update);update();
    }
    function flow(t) {
      const q=F.selected(t),b=F.currentBudget(t,state().budgets),f=t.sales?.fulfillment;
      const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
      const savedStatus=(t.status||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const closed=/cancelad|encerrad|finalizad|concluid|perdid|recusad/.test(savedStatus);
      const historical=!t.datesPending&&F.date(t.end)&&t.end<today;
      const ready=F.canItinerary(t),approved=b?.status==='Aprovada',waiting=b?.status==='Aguardando aprovação';
      const linked=state().budgets.some(item=>item.trip===t.id);
      const existingOperation=!b&&!q&&(linked||f||/confirmad|emitid|andamento|em viagem|viajando|reserva|pagamento|emissao|proposta|aprovad/.test(savedStatus));
      let title,description,actions,index=null,kicker='PRÓXIMA AÇÃO';
      if(closed||historical){
        kicker=closed?'ATENDIMENTO ENCERRADO':'REGISTRO ANTERIOR';
        title=closed?'Consulte o histórico deste atendimento':'O período registrado já passou';
        description=closed?'Os documentos, propostas e serviços continuam disponíveis para consulta.':'Confira os documentos e serviços deste registro. As datas, por si só, não confirmam a conclusão da viagem ou do serviço.';
        actions=btn('Ver documentos e propostas','attendance-tab','materials',true);
      }else if(ready){
        index=4;title='Prepare o roteiro da viagem';description='Reserva, pagamento e emissão estão registrados como confirmados. Reúna os serviços no roteiro do cliente.';
        actions=btn('Preparar roteiro','new-itinerary',t.id,true)+(approved?btn('Ver confirmação','sales-fulfillment',t.id):'');
      }else if(approved){
        index=3;title='Acompanhe a reserva e a emissão';description='A proposta foi aprovada. Consulte a operadora e registre a situação da reserva, do pagamento e da emissão.';
        actions=btn('Acompanhar reserva','sales-fulfillment',t.id,true);
      }else if(b){
        index=waiting?2:1;title=waiting?'Registre a resposta do cliente':b.status==='Ajuste solicitado'?'Revise o ajuste solicitado':'Revise e envie a proposta';
        description=waiting?'A proposta está aguardando aprovação. Registre a resposta quando o cliente retornar.':'Confira os valores, os serviços e a apresentação antes de compartilhar com o cliente.';
        actions=waiting?btn('Registrar resposta','sales-decision',b.id,true)+btn('Abrir proposta','sales-budget',b.id):btn('Abrir proposta','sales-budget',b.id,true);
      }else if(existingOperation){
        kicker='SITUAÇÃO DO ATENDIMENTO';title='Confira os serviços já registrados';
        description='Este atendimento está marcado como “'+(t.status||'Em acompanhamento')+'”. Consulte as reservas e os documentos para conferir os detalhes. O histórico de cotação e aprovação não está completo aqui.';
        actions=btn('Ver reservas e serviços','attendance-tab','services',true);
      }else if(q||(t.sales?.quotes||[]).length){
        index=1;title=q&&F.expired(q.validUntil)?'Confira a validade da cotação':'Escolha a cotação e monte a proposta';
        description=q&&F.expired(q.validUntil)?'A validade registrada já passou. Solicite uma atualização à operadora antes de preparar a proposta.':'Abra as opções recebidas da operadora e escolha a que vai apresentar ao cliente.';
        actions=btn('Ver cotações','sales-quotes',t.id,true);
      }else{
        index=0;title='Comece pela cotação';description='Use o pedido do cliente para consultar a operadora ou registrar uma cotação que você já recebeu.';
        actions=btn('Fazer cotação','sales-quote',t.id,true);
      }
      const labels=['Cotação','Proposta','Aprovação','Reserva e emissão','Roteiro'];
      const progress=index===null?'':`<ol aria-label="Etapas do atendimento">${labels.map((label,i)=>`<li class="${i===index?'current':''}" ${i===index?'aria-current="step"':''}><span>${i+1}</span>${label}</li>`).join('')}</ol>`;
      const deadline=!closed&&!historical&&approved&&f?.deadline?'<p class="sales-deadline">Prazo de emissão: '+e(stamp(f.deadline))+(F.expired(f.deadline)&&f.emission!=='issued'?' · Prazo encerrado: consulte a operadora.':'')+'</p>':'';
      const quotes=index!==null&&(t.sales?.quotes||[]).length&&index!==1?'<button class="text-button" data-action="sales-quotes" data-id="'+e(t.id)+'">Consultar cotações ('+t.sales.quotes.length+')</button>':'';
      return `<section class="attendance-card sales-flow attendance-guidance" aria-labelledby="attendance-guidance-title"><div class="sales-next"><div><span class="attendance-kicker">${kicker}</span><h2 id="attendance-guidance-title">${e(title)}</h2><p>${e(description)}</p>${deadline}</div><div class="attendance-guidance-actions">${actions}${quotes}</div></div>${progress}</section>`;
    }
    function quoteForm(t) {
      const d=t.sales?.request||t;
      c.dialog('Fazer cotação',`<form data-form="sales-request"><input type="hidden" name="trip" value="${e(t.id)}"><p>O pedido já está vinculado a ${e(c.client(t.client).name)}.</p>${input('Destino','destination',d.destination==='A definir'?'':d.destination)}${input('Origem','origin',d.origin||'')}<div class="form-grid">${input('Ida','start',d.start||'','date')}${input('Volta','end',d.end||'','date')}</div>${input('Viajantes','travelers',t.travelersPending&&!t.sales?.request?'':d.travelers,'number')}${area('Pedido e preferências','notes',d.notes||'')}<p class="form-hint">${c.connected()?'Consulte a operadora e revise as ofertas recebidas.':'Nenhum fornecedor de busca está conectado. Guarde o pedido ou registre uma cotação conferida com o fornecedor.'}</p><div class="dialog-actions"><button type="submit" name="intent" value="save" formnovalidate class="outline-button">Guardar pedido</button><button type="submit" name="intent" value="live" class="primary-button" ${c.connected()?'':'disabled'}>Consultar fornecedor</button></div></form><div class="sales-links">${btn('Registrar cotação recebida','sales-receive',t.id)}</div>`,'COTAÇÃO');
    }
    function quotes(t) {
      c.dialog('Cotações deste atendimento',`<p>Escolha a oferta que vai apresentar ao cliente. O valor do pacote não é dividido entre serviços quando a operadora não informa essa divisão.</p>${(t.sales?.quotes||[]).slice().reverse().map(q=>`<section class="sales-quote"><p><strong>${e(q.reference||'Cotação recebida')}</strong> · ${q.source==='operator'?'Resposta do adaptador':'Registrada pela agência a partir da cotação'}<br>Validade: ${e(stamp(q.validUntil))}${F.expired(q.validUntil)?' · Atualização necessária':''}</p>${privateSummary(q)}${q.offers.map((o,i)=>`<article><h3>${e(o.name)} · ${c.money(o.total)}</h3><ul>${o.inclusions.map(v=>'<li>'+e(v)+'</li>').join('')}</ul><p>${e(o.terms)}</p>${btn('Preparar proposta','sales-build',t.id+'|'+q.id+'|'+i,true)}</article>`).join('')}</section>`).join('')||'<p>Nenhuma cotação recebida ainda.</p>'}<div class="sales-links">${btn('Fazer cotação','sales-quote',t.id)}${btn('Registrar cotação recebida','sales-receive',t.id)}</div>`,'COTAÇÕES');
    }
    function receive(t) {
      const d=t.sales?.request||t;
      c.dialog('Registrar cotação recebida',`<form data-form="sales-receive"><input type="hidden" name="trip" value="${e(t.id)}"><p>Use uma oferta conferida no site, e-mail ou documento do fornecedor. Você pode informar o preço final ou calcular a venda a partir do custo líquido. Este registro não faz reserva.</p>${input('Referência da cotação','reference','')}${input('Nome da oferta','name',t.title)}${input('Destino','destination',d.destination==='A definir'?'':d.destination)}<div class="form-grid">${input('Ida','start',d.start||'','date')}${input('Volta','end',d.end||'','date')}</div><div class="form-grid">${input('Viajantes','travelers',t.travelersPending&&!t.sales?.request?'':d.travelers,'number')}${input('Total do grupo (R$)','total','','number')}</div><div class="form-grid">${input('Validade informada','valid','','date')}${input('Horário limite, se informado','time','','time',false)}</div><p class="form-hint">Se houver horário, use seu horário local (${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Sem horário, será registrada somente a data informada.</p>${pricingFields()}${area('O que está incluso (um serviço por linha)','inclusions')}${area('Condições do fornecedor','terms')}${submit('Guardar cotação')}</form>`,'COTAÇÃO RECEBIDA');
      bindPricing();
    }
    function fulfillment(t) {
      const f=t.sales?.fulfillment||{},b=F.currentBudget(t,state().budgets);
      if(b?.status!=='Aprovada')throw Error('Registre a aprovação da proposta antes de acompanhar a reserva.');
      const local=f.deadline&&!F.date(f.deadline)?new Date(new Date(f.deadline).getTime()-new Date(f.deadline).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
      c.dialog('Reserva, pagamento e emissão',`<form data-form="sales-fulfillment"><input type="hidden" name="trip" value="${e(t.id)}"><p>Consulte o fornecedor e registre o que ele confirmou. O TravelPro não cria reservas nem cobra cartões nesta etapa.</p>${input('Localizador / referência','reference',f.reference||'','text',false)}${select('Reserva','reservation',[['pending','A iniciar'],['held','Reservada, aguardando confirmação'],['confirmed','Confirmada pela operadora']],f.reservation||'pending')}${input('Prazo de emissão no seu horário local','deadline',local,'datetime-local',false)}${input('Link de pagamento da operadora','paymentUrl',f.paymentUrl||'','url',false)}${select('Pagamento na operadora','payment',[['pending','Aguardando pagamento'],['paid','Pagamento confirmado']],f.payment||'pending')}${select('Emissão','emission',[['pending','Aguardando emissão'],['issued','Emitida pela operadora']],f.emission||'pending')}${area('Confirmação consultada (referência ou observação)','evidence',f.evidence||'')}<p class="form-hint">O cliente informa os dados do cartão somente no ambiente da operadora. O roteiro é liberado após confirmação da reserva, pagamento e emissão.</p>${submit('Salvar acompanhamento')}</form>`,'OPERAÇÃO');
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
    function quickForm(id='') {
      const q=state().quickQuotes?.find(q=>q.id===id),r=q?.request||{},o=q?.offers?.[0]||{};
      c.dialog(q?'Editar cotação avulsa':'Gerar cotação',`<form data-form="sales-quick"><input type="hidden" name="id" value="${e(q?.id||'')}"><p class="form-hint">Prepare uma cotação sem cadastrar cliente ou atendimento. Informe os valores e serviços que deseja apresentar.</p>${input('Título da cotação','name',q?.name||'')}<div class="form-grid">${input('Origem','origin',r.origin||'')}${input('Destino','destination',r.destination||'')}${input('Ida','start',r.start||'','date')}${input('Volta','end',r.end||'','date')}${input('Viajantes','travelers',r.travelers||1,'number')}${input('Válida até','valid',q?.validUntil?.slice(0,10)||'','date')}</div>${area('Serviços incluídos (um por linha)','inclusions',(o.inclusions||[]).join('\n'))}<div class="form-grid">${input('Valor total do grupo (R$)','total',o.total??'','number')}${input('Referência / fornecedor (opcional)','reference',q?.reference||'','text',false)}</div>${pricingFields(q?.privatePricing)}${area('Condições, pagamento e observações','terms',o.terms||'')}<p class="form-hint">Use os preços conferidos com o fornecedor. Gerar a cotação não faz reserva nem cobrança.</p>${submit('Gerar e salvar cotação')}</form>`,'COTAÇÃO AVULSA');
      bindPricing();
    }
    const quickDate=value=>F.date(value)?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):stamp(value);
    function quickPresentation(q) {
      const r=q.request;
      return `<article class="quick-quote-preview"><span class="eyebrow">${e(state().agency)} · COTAÇÃO</span><h2>${e(q.name)}</h2><p>${e(r.origin)} → ${e(r.destination)}</p><p>${quickDate(r.start)} a ${quickDate(r.end)} · ${r.travelers} viajante(s)</p>${q.offers.map(o=>`<section><h3>Serviços incluídos</h3><ul>${o.inclusions.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p class="quick-total"><small>Total do grupo</small><strong>${c.money(o.total)}</strong><small>${c.money(o.total/r.travelers)} por viajante</small></p><h3>Condições</h3><p class="sales-pre">${e(o.terms||'Consulte a agência.')}</p></section>`).join('')}<p>Validade: ${quickDate(q.validUntil)}</p><p class="form-hint">Valores sujeitos à disponibilidade e reconfirmação. Este documento não confirma reserva ou emissão.</p></article>`;
    }
    function quickResult(id) {
      const q=state().quickQuotes?.find(q=>q.id===id);if(!q)throw Error('Cotação não encontrada.');
      c.dialog('Cotação pronta',quickPresentation(q)+privateSummary(q)+'<div class="dialog-actions">'+btn('Editar cotação','sales-quick-edit',id)+btn('Baixar cotação','sales-quick-download',id,true)+'</div>','REVISAR E COMPARTILHAR');
    }
    function quickList() {
      const rows=state().quickQuotes||[];
      return `<section class="quick-quotes"><div class="section-heading"><h2>Cotações avulsas</h2><span class="muted-small">${rows.length} salva(s)</span></div>${rows.length?'<div class="budget-list">'+[...rows].reverse().map(q=>`<article class="attendance-card"><div><span class="eyebrow">${F.expired(q.validUntil)?'VALIDADE ENCERRADA':'COTAÇÃO AVULSA'}</span><h2>${e(q.name)}</h2><p>${e(q.request.destination)} · ${q.request.travelers} viajante(s)</p><p>Válida até ${quickDate(q.validUntil)}</p><strong>${c.money(q.offers[0].total)}</strong></div><div class="attendance-actions">${btn('Ver cotação','sales-quick-result',q.id,true)}${btn('Editar','sales-quick-edit',q.id)}</div></article>`).join('')+'</div>':'<div class="empty-state"><h2>Sua próxima cotação começa aqui</h2><p>Informe destino, datas, serviços e valores. O cadastro de cliente não é necessário.</p>'+btn('Gerar cotação','workflow-quote','',true)+'</div>'}</section>`;
    }
    async function action(action,id) {
      if(action.startsWith('sales-quick-')){
        if(action==='sales-quick-edit')quickForm(id);
        if(action==='sales-quick-result')quickResult(id);
        if(action==='sales-quick-download'){const q=state().quickQuotes?.find(q=>q.id===id);if(!q)throw Error('Cotação não encontrada.');c.download(q.name,`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(q.name)}</title><style>body{font:16px/1.65 system-ui;color:#28323c;background:#f5f5f5;margin:0}article{max-width:760px;padding:40px;margin:auto;background:white}h2{font-size:30px}strong{font-size:28px}.quick-total>*{display:block}.sales-pre{white-space:pre-wrap}.form-hint{color:#616971}@media print{body{background:white}article{padding:0}}</style>${quickPresentation(q)}</html>`);}
        return true;
      }
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
      const privatePricing=['sales-quick','sales-receive'].includes(name)?priceData(d):null;
      if(privatePricing)d={...d,total:String(privatePricing.result.saleCents/100)};
      if(name==='sales-quick'){
        if(!d.name?.trim()||!d.destination?.trim()||!d.origin?.trim()||!F.date(d.start)||!F.date(d.end)||d.end<d.start||!F.date(d.valid)||!Number.isInteger(Number(d.travelers))||Number(d.travelers)<1||Number(d.travelers)>100||d.total===''||!Number.isFinite(Number(d.total))||Number(d.total)<0)throw Error('Confira título, origem, destino, datas, viajantes, validade e valor.');
        const result=F.normalizeQuote({currency:'BRL',reference:d.reference?.trim()||'Cotação avulsa',validUntil:d.valid,offers:[{name:d.name.trim(),total:Number(d.total),inclusions:String(d.inclusions||'').split('\n').map(x=>x.trim()).filter(Boolean),terms:d.terms||''}]});
        state().quickQuotes||=[];const old=state().quickQuotes.find(q=>q.id===d.id);
        if(d.id&&!old)throw Error('Cotação não encontrada. Reabra a lista.');
        const q={...result,id:old?.id||c.uid('aq'),name:d.name.trim(),request:{origin:d.origin.trim(),destination:d.destination.trim(),start:d.start,end:d.end,travelers:Number(d.travelers)},source:'manual',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
        if(privatePricing)q.privatePricing=privatePricing;
        if(old){delete old.privatePricing;Object.assign(old,q);}else state().quickQuotes.push(q);
        await c.flush();c.close();c.render();quickResult(q.id);return true;
      }
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
          try{await c.flush();const result=await c.request('/operator/quote',{method:'POST',body:{request}});const latest=trip(request.trip);if(!latest||latest.client!==request.client)throw Error('O atendimento mudou durante a consulta. Confira o pedido.');storeQuote(latest,request,{...result,currency:result.currency||'BRL'},'operator');await c.flush();c.close();c.render();quotes(latest);}finally{requesting=false;form?.querySelectorAll('button').forEach(b=>b.disabled=false);}
        }else {await c.flush();c.close();c.render();c.toast('Pedido guardado. Nenhuma solicitação enviada à operadora.');}
      }
      if(name==='sales-receive'){
        if(!t||!F.date(d.start)||!F.date(d.end)||d.end<d.start||!F.date(d.valid)||!d.destination.trim()||!d.reference.trim()||!Number.isInteger(Number(d.travelers))||Number(d.travelers)<1||Number(d.travelers)>100||d.total==='')throw Error('Confira referência, datas, viajantes, validade e total.');
        const validUntil=d.time?new Date(d.valid+'T'+d.time).toISOString():d.valid;
        const savedQuote=storeQuote(t,d,{currency:'BRL',reference:d.reference,validUntil,offers:[{name:d.name,total:Number(d.total),inclusions:d.inclusions.split('\n').map(s=>s.trim()).filter(Boolean),terms:d.terms}]},'manual');if(privatePricing)savedQuote.privatePricing=privatePricing;await c.flush();c.close();c.render();quotes(t);
      }
      if(name==='sales-decision'){const b=state().budgets.find(b=>b.id===d.id),target=trip(b?.trip);if(!target)throw Error('Vincule a proposta a um atendimento.');const beforeBudget=structuredClone(b),beforeTrip=structuredClone(target);F.recordDecision(target,b,d.event,d.note);try{await c.flush();}catch(error){for(const key of Object.keys(b))delete b[key];Object.assign(b,beforeBudget);for(const key of Object.keys(target))delete target[key];Object.assign(target,beforeTrip);throw error;}c.close();c.render();c.toast('Etapa registrada: '+b.status+'.');}
      if(name==='sales-fulfillment'){if(!t)throw Error('Atendimento não encontrado.');F.recordFulfillment(t,F.currentBudget(t,state().budgets),{...d,deadline:d.deadline?new Date(d.deadline).toISOString():''});await c.flush();c.close();c.render();c.toast('Dados da reserva salvos com sucesso.');}
      return true;
    }
    return {flow,decor,action,submitForm,quickForm,quickList,canItinerary:F.canItinerary};
  }
  window.TravelSalesUI={create};
})();
