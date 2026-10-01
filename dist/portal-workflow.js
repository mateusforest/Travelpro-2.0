(() => {
  'use strict';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {confirmadas:'Confirmadas',emitidas:'Emitidas',andamento:'Em andamento',finalizadas:'Finalizadas'};
  const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  function today() {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function category(trip, date=today()) {
    const status=norm(trip.status), fulfillment=trip.sales?.fulfillment;
    if (/cancelad|perdid|recusad/.test(status)) return null;
    if (/^(finalizad|concluid|encerrad)/.test(status)) return 'finalizadas';
    if (/^(em andamento|em viagem|viajando)/.test(status)) return 'andamento';
    const issued=fulfillment?.emission==='issued'||/^emitid/.test(status);
    const confirmed=issued||fulfillment?.reservation==='confirmed'||/^confirmad/.test(status);
    if (!confirmed) return null;
    // Derive calendar stages without rewriting reservation/payment records.
    if (!trip.datesPending && day(trip.start) && day(trip.end) && trip.end>=trip.start) {
      if (trip.end<date) return 'finalizadas';
      if (trip.start<=date) return 'andamento';
    }
    return issued?'emitidas':'confirmadas';
  }
  function steps({state,icon}) {
    const pending=(state.budgets||[]).filter(b=>b.status==='Aguardando aprovação').length;
    const actions=[['Cotação','Preparar o pedido','workflow-quote'],['Proposta','Montar apresentação','workflow-proposals'],['Aprovação',pending?`${pending} aguardando resposta`:'Acompanhar respostas','workflow-approval'],['Reserva e emissão','Conferir com a operadora','workflow-reservations'],['Roteiro','Preparar a viagem','workflow-itineraries']];
    return `<section class="workflow-overview" aria-label="Ordem de execução"><div class="workflow-heading"><span class="eyebrow">DO PEDIDO AO EMBARQUE</span><a href="#atendimentos">Ver atendimentos ↗</a></div><ol class="workflow-steps">${actions.map(([title,detail,action],i)=>`<li><button type="button" data-action="${action}"><span class="workflow-orb" aria-hidden="true">${icon?icon(['doc','file','check','plane','map'][i]):'0'+(i+1)}</span><span><span class="workflow-number">0${i+1}</span><strong>${title}</strong><small>${detail}</small></span><span class="workflow-arrow" aria-hidden="true">↗</span></button></li>`).join('')}</ol></section>`;
  }
  function trips(ctx, filter='todas') {
    const {state,icon,pageTop,dateLabel,client}=ctx;
    if (!labels[filter]) filter='todas';
    const rows=state.trips.map(t=>({trip:t,stage:category(t)})).filter(r=>r.stage);
    const selected=rows.filter(r=>filter==='todas'||r.stage===filter).sort((a,b)=>(a.trip.start||'9999').localeCompare(b.trip.start||'9999'));
    return pageTop('Viagens','Da confirmação ao retorno, cada viagem no seu tempo.', '<a class="outline-button" href="#atendimentos">Ver atendimentos</a>')+
      `<nav class="trip-stage-tabs" aria-label="Etapas das viagens">${[['todas','Todas'],...Object.entries(labels)].map(([key,label])=>`<a href="#viagens/${key}" ${filter===key?'aria-current="page"':''}>${label}<span>${key==='todas'?rows.length:rows.filter(r=>r.stage===key).length}</span></a>`).join('')}</nav><p class="form-hint">Em andamento e finalizadas consideram as datas cadastradas. Confirmação, pagamento e emissão continuam registrados no atendimento.</p><div class="confirmed-trips">${selected.length?selected.map(({trip:t,stage})=>`<article class="attendance-card confirmed-trip"><div class="trip-card-top"><span class="eyebrow">${esc(t.destination||'Destino a confirmar')}</span><span class="status">${labels[stage]}</span></div><h2>${esc(t.title)}</h2><p>${esc(client(t.client).name)}</p><div class="trip-card-dates">${icon('calendar')}<span>${t.datesPending?'Datas a confirmar':esc(dateLabel(t.start))+' — '+esc(dateLabel(t.end))}</span></div><div class="attendance-actions"><a class="primary-button" href="#viagem/${encodeURIComponent(t.id)}">Abrir viagem ${icon('arrow')}</a>${globalThis.TravelSalesFlow?.canItinerary(t)?`<button class="outline-button" data-action="new-itinerary" data-id="${esc(t.id)}">Preparar roteiro</button>`:''}</div></article>`).join(''):'<div class="workflow-empty"><h2>Nenhuma viagem nesta etapa</h2><p>As viagens aparecem aqui quando a reserva é confirmada no atendimento.</p><a class="outline-button" href="#atendimentos">Abrir atendimentos</a></div>'}</div>`;
  }
  globalThis.TravelWorkflow=Object.freeze({category,steps,trips,labels});
})();
