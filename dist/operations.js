(() => {
  'use strict';

  const DAY = 86400000;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const list = value => Array.isArray(value) ? value : [];
  const href = (route, id) => '#' + route + (id == null ? '' : '/' + encodeURIComponent(String(id)));
  const closedTrip = trip => /^(concluid|cancelad|encerrad|finalizad|historico|perdid)/.test(normalize(trip.status));
  const confirmedTrip = trip => /^confirmad/.test(normalize(trip.status));
  const closedBudget = budget => /^(aprovad|cancelad|encerrad|concluid|recusad|perdid|convertid)/.test(normalize(budget.status));
  const completedEvent = event => event.completed === true || event.done === true || /^(concluid|cancelad|encerrad|realizad)/.test(normalize(event.status));

  function dateDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? time : null;
  }

  function localKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function clockTime(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '';
  }

  function dateText(ctx, value) {
    if (dateDay(value) === null) return 'Data a confirmar';
    if (typeof ctx.dateLabel === 'function') return String(ctx.dateLabel(value));
    return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
  }

  function validity(ctx, value, now, today) {
    const day = dateDay(value);
    if (day !== null) return {known:true, expired:day < today, days:(day - today) / DAY, label:dateText(ctx, value), day};
    // Only timestamps with an explicit timezone can establish an exact expiry.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && dateDay(value.slice(0, 10)) !== null) {
      const stamp = Date.parse(value);
      if (Number.isFinite(stamp)) return {known:true, expired:stamp < now.getTime(), days:(stamp - now.getTime()) / DAY, label:new Date(stamp).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}), day:dateDay(localKey(new Date(stamp)))};
    }
    return {known:false, expired:false, days:null, label:value ? 'Validade a conferir' : 'Validade a confirmar', day:null};
  }

  function model(ctx = {}) {
    const state = ctx.state || {};
    const rawNow = typeof ctx.now === 'function' ? ctx.now() : ctx.now;
    const candidate = rawNow === undefined ? new Date() : new Date(rawNow);
    const now = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
    const key = localKey(now), today = dateDay(key);
    const clients = list(state.clients), trips = list(state.trips), budgets = list(state.budgets);
    const active = trips.filter(trip => !closedTrip(trip));
    const activeIds = new Set(active.map(trip => trip.id));
    const tripById = new Map(trips.map(trip => [trip.id, trip]));
    const clientById = new Map(clients.map(client => [client.id, client]));
    const clientName = id => String(clientById.get(id)?.name || 'Cliente não identificado');
    const events = list(state.events).filter(event => !completedEvent(event));
    const eventAt = event => {
      if (dateDay(event.date) === null) return null;
      const time = clockTime(event.time);
      return time ? new Date(event.date + 'T' + time + ':00').getTime() : new Date(event.date + 'T23:59:59').getTime();
    };
    const futureEvents = events.filter(event => eventAt(event) !== null && eventAt(event) >= now.getTime()).sort((a, b) => eventAt(a) - eventAt(b));
    const nextEvent = id => futureEvents.find(event => event.trip === id);
    const previousEvents = events.filter(event => eventAt(event) !== null && eventAt(event) < now.getTime()).sort((a, b) => eventAt(b) - eventAt(a));
    const previousEvent = id => previousEvents.find(event => event.trip === id);
    const openBudgets = budgets.filter(budget => !closedBudget(budget));
    const departures = active.filter(trip => confirmedTrip(trip) && dateDay(trip.start) !== null && dateDay(trip.start) >= today).sort((a, b) => dateDay(a.start) - dateDay(b.start));
    const priorities = [], noDate = [];

    for (const event of events) {
      if (event.trip && tripById.has(event.trip) && !activeIds.has(event.trip)) continue;
      const day = dateDay(event.date);
      const trip = tripById.get(event.trip);
      const target = trip ? href('viagem', trip.id) : href('agenda');
      const base = {id:'event:' + event.id, kind:'event', title:String(event.title || 'Compromisso'), href:target, icon:'calendar'};
      if (day === null) {
        noDate.push({...base, detail:trip?.title || 'Agenda da agência', badge:event.date ? 'Data a conferir' : 'Sem data', tone:'neutral'});
      } else if (day <= today) {
        const time = clockTime(event.time);
        priorities.push({...base, detail:(day < today ? 'Conferir compromisso de ' : '') + dateText(ctx, event.date) + (time ? ' · ' + time : '') + (trip ? ' · ' + trip.title : ''), badge:day < today ? 'Data passada' : 'Hoje', tone:day < today ? 'warn' : 'neutral', rank:day < today ? 1 : 0, distance:Math.abs(day - today)});
      }
    }

    for (const budget of openBudgets) {
      const value = validity(ctx, budget.validUntil || budget.valid, now, today);
      const base = {id:'budget:' + budget.id, kind:'budget', title:String(budget.name || 'Proposta'), href:href('orcamento', budget.id), icon:'doc'};
      if (!value.known) {
        noDate.push({...base, detail:clientName(budget.client), badge:value.label, tone:'neutral'});
      } else if (value.expired || value.days <= 2) {
        priorities.push({...base, detail:clientName(budget.client) + ' · Validade registrada: ' + value.label, badge:value.expired ? 'Revalidar cotação' : value.days === 0 ? 'Validade hoje' : 'Validade próxima', tone:value.expired ? 'alert' : 'warn', rank:value.expired ? 0 : 1, distance:Math.abs(value.days * DAY)});
      }
    }

    for (const trip of active) {
      const fulfillment=trip.sales?.fulfillment;
      if(fulfillment?.deadline&&fulfillment.emission!=='issued'){
        const value=validity(ctx,fulfillment.deadline,now,today);
        if(value.known&&(value.expired||value.days<=2))priorities.push({id:'emission:'+trip.id,kind:'emission',title:'Prazo de emissão · '+String(trip.title||'Atendimento'),detail:'Prazo informado: '+value.label,badge:value.expired?'Conferir com a operadora':'Emissão pendente',tone:value.expired?'alert':'warn',href:href('viagem',trip.id),icon:'calendar',rank:-1,distance:Math.abs(value.days*DAY)});
      }
      // A dated, uncompleted event is already actionable, including a past event
      // shown above for review. Do not ask for another contact at the same time.
      const hasRecordedStep = events.some(event => event.trip === trip.id && dateDay(event.date) !== null);
      if (!hasRecordedStep) priorities.push({id:'contact:' + trip.id, kind:'contact', title:String(trip.title || 'Atendimento'), detail:clientName(trip.client), badge:'Definir próximo contato', tone:'neutral', href:href('viagem', trip.id), icon:'users', rank:2, distance:0});
    }
    priorities.sort((a, b) => a.rank - b.rank || a.distance - b.distance || a.title.localeCompare(b.title, 'pt-BR'));
    return {now:key, clients, trips, active, openBudgets, departures, allPriorities:priorities, priorities:priorities.slice(0, 6), priorityCount:priorities.length, noDate:noDate.slice(0, 4), noDateCount:noDate.length, clientName, nextEvent, previousEvent};
  }

  const svg = (ctx, name) => typeof ctx.icon === 'function' ? ctx.icon(name) : '';
  const button = (ctx, action, text) => `<button class="ops-button" type="button" data-action="${escape(action)}">${svg(ctx, 'plus')}${escape(text)}</button>`;
  const badge = (text, tone = 'neutral') => `<span class="ops-badge ops-badge-${tone}">${escape(text)}</span>`;
  const heading = (ctx, title, description, action, label) => `<header class="ops-header"><div><span class="ops-eyebrow">SUA AGÊNCIA</span><h1>${escape(title)}</h1><p>${escape(description)}</p></div>${button(ctx, action, label)}</header>`;
  const empty = (title, description, action = '') => `<div class="ops-empty"><strong>${escape(title)}</strong><p>${escape(description)}</p>${action}</div>`;

  function priorityRow(ctx, row) {
    return `<a class="ops-row" href="${escape(row.href)}"><span class="ops-row-icon" aria-hidden="true">${svg(ctx, row.icon)}</span><span class="ops-row-copy"><strong>${escape(row.title)}</strong><span>${escape(row.detail)}</span></span>${badge(row.badge, row.tone)}</a>`;
  }

  function today(ctx) {
    const view = model(ctx);
    const indicators = [
      ['Atendimentos ativos', view.active.length, 'Etapas registradas pela agência'],
      ['Propostas abertas', view.openBudgets.length, 'Acompanhe os próximos contatos'],
      ['Próximos embarques', view.departures.length, 'Viagens na etapa Confirmada']
    ];
    const attention = view.priorities.length ? `<div class="ops-list">${view.priorities.map(row => priorityRow(ctx, row)).join('')}</div>` : empty('Nenhum item para conferir agora.', view.active.length ? 'Os próximos compromissos continuam na agenda.' : 'Comece pelo primeiro atendimento da sua agência.');
    const undated = view.noDate.length ? `<div class="ops-no-date"><h3>Informações sem data definida</h3><div class="ops-list">${view.noDate.map(row => priorityRow(ctx, row)).join('')}</div>${view.noDateCount > 4 ? '<p class="ops-note">Mostrando os primeiros 4 registros sem data válida.</p>' : ''}</div>` : '';
    const departures = view.departures.length ? `<div class="ops-list">${view.departures.slice(0, 4).map(trip => priorityRow(ctx, {href:href('viagem', trip.id), title:trip.title || trip.destination || 'Atendimento', detail:view.clientName(trip.client) + ' · ' + (trip.destination || 'Destino a confirmar'), badge:dateText(ctx, trip.start), tone:'neutral', icon:'plane'})).join('')}</div><p class="ops-note">Datas cadastradas. Confira a situação da reserva no atendimento.</p>` : empty('Nenhum embarque informado.', 'Viagens na etapa Confirmada, com saída a partir de hoje, aparecerão aqui.');
    return `<section class="ops-page">${heading(ctx, 'Hoje', 'Atendimentos, prazos e próximos passos da sua agência.', 'new-attendance', 'Novo atendimento')}<div class="ops-kpis">${indicators.map(([label, count, detail]) => `<article class="ops-kpi"><span>${escape(label)}</span><strong>${count}</strong><small>${escape(detail)}</small></article>`).join('')}</div><div class="ops-grid"><section class="ops-card"><div class="ops-section-heading"><h2>Precisa da sua atenção</h2><span>${view.priorityCount > 6 ? '6 de ' : ''}${view.priorityCount} ${view.priorityCount === 1 ? 'item' : 'itens'}</span></div>${attention}${undated}</section><section class="ops-card"><div class="ops-section-heading"><h2>Próximos embarques</h2><a href="#agenda">Ver agenda</a></div>${departures}</section></div></section>`;
  }

  function inboxResults(ctx, query = '', filter = 'all') {
    const view = model(ctx), term = normalize(query), options=ctx.options||{};
    if(options.from&&options.to&&options.from>options.to)return empty('Confira o período.', 'A data final deve ser igual ou posterior à inicial.');
    const rows = view.trips.filter(trip => {
      if((options.from||options.to)&&(!trip.start||(options.from&&(trip.end||trip.start)<options.from)||(options.to&&trip.start>options.to)))return false;
      if (filter === 'commercial' && (closedTrip(trip) || confirmedTrip(trip))) return false;
      if (filter === 'confirmed' && !confirmedTrip(trip)) return false;
      return normalize([trip.title, trip.destination, view.clientName(trip.client)].join(' ')).includes(term);
    });
    rows.sort((a,b)=>{const at=Date.parse(a.createdAt)||0,bt=Date.parse(b.createdAt)||0;const order=bt-at||view.trips.indexOf(b)-view.trips.indexOf(a);return options.sort==='oldest'?-order:order;});
    if (!rows.length) return view.trips.length ? empty('Nenhum atendimento encontrado.', 'Tente outro nome, destino ou filtro.') : empty('Nenhum atendimento cadastrado.', 'Crie um pedido para reunir cliente, viagem e próximos passos.');
    return `<div class="ops-attendance-list">${rows.map(trip => {
      const upcoming = view.nextEvent(trip.id);
      const event = upcoming || (!closedTrip(trip) ? view.previousEvent(trip.id) : undefined);
      const task = event?.title || (closedTrip(trip) ? 'Atendimento encerrado' : 'Definir próximo contato');
      const time = event ? clockTime(event.time) : '';
      const when = event ? (upcoming ? '' : 'Conferir registro · ') + dateText(ctx, event.date) + (time ? ' · ' + time : '') : closedTrip(trip) ? 'Etapa registrada pela agência' : 'Nenhum compromisso futuro registrado';
      return `<a class="ops-attendance-row" href="${escape(href('viagem', trip.id))}"><span class="ops-attendance-main"><strong>${escape(trip.title || 'Atendimento')}</strong><span>${escape(trip.destination || 'Destino a confirmar')} · ${escape(dateText(ctx, trip.start))}</span></span><span class="ops-attendance-client">${escape(view.clientName(trip.client))}</span>${badge(trip.status || 'Etapa a definir')}<span class="ops-next-step"><strong>${escape(task)}</strong><span>${escape(when)}</span></span><span class="ops-row-arrow" aria-hidden="true">${svg(ctx, 'arrow')}</span></a>`;
    }).join('')}</div><p class="ops-count">${rows.length} ${rows.length === 1 ? 'atendimento' : 'atendimentos'}</p>`;
  }

  function inbox(ctx) {
    return `<section class="ops-page">${heading(ctx, 'Atendimentos', 'Cada cliente, sua viagem e o próximo passo.', 'new-attendance', 'Novo atendimento')}<div class="ops-toolbar"><label class="ops-search">${svg(ctx, 'search')}<input id="operations-search" type="search" placeholder="Buscar cliente ou destino" aria-label="Buscar atendimento por cliente ou destino" autocomplete="off"></label><div class="ops-filters" role="group" aria-label="Filtrar atendimentos">${[['all','Todos'],['commercial','Em negociação'],['confirmed','Confirmados']].map(([id, label]) => `<button type="button" class="ops-filter" data-action="operations-filter" data-id="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('')}</div></div><div class="ops-period-filters"><label>Viagens a partir de<input type="date" data-operations-option="from" value="${escape(ctx.options?.from||'')}"></label><label>Até<input type="date" data-operations-option="to" value="${escape(ctx.options?.to||'')}"></label><label>Ordem de cadastro<select data-operations-option="sort"><option value="newest">Mais recentes primeiro</option><option value="oldest" ${ctx.options?.sort==='oldest'?'selected':''}>Mais antigos primeiro</option></select></label></div><div id="operations-results" aria-live="polite">${inboxResults(ctx)}</div></section>`;
  }

  function clientResults(ctx, query = '') {
    const view = model(ctx), term = normalize(query);
    const filter=ctx.clientFilter||'active';
    const rows = view.clients.filter(client => (filter==='deleted'?!!client.deletedAt:!client.deletedAt&&(filter==='all'||(client.status||'Ativo')===({active:'Ativo',inactive:'Inativo',prospect:'Prospect'}[filter])))).filter(client=>normalize([client.name, client.email, client.phone].join(' ')).includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    if (!rows.length) return empty(view.clients.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.', view.clients.length ? 'Tente outro nome ou contato.' : 'O primeiro cliente também pode ser criado junto com um atendimento.');
    return `<div class="ops-client-grid">${rows.map(client => {
      const count = view.trips.filter(trip => trip.client === client.id || list(trip.participants).includes(client.id)).length;
      const initials = String(client.name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('');
      return `<article class="ops-client-card managed-client"><a class="client-profile-link" href="${escape(href('cliente', client.id))}"><span class="ops-avatar" aria-hidden="true">${escape(initials)}</span><div class="ops-client-copy"><h2>${escape(client.name || 'Cliente sem nome')}</h2><p>${escape(client.phone || client.email || 'Contato não informado')}</p><small>${count} ${count === 1 ? 'atendimento vinculado' : 'atendimentos vinculados'}</small></div></a><div class="client-management"><span class="status gray">${escape(client.deletedAt?'Excluído':client.status||'Ativo')}</span>${client.deletedAt?`<button class="text-button" data-action="restore-client" data-id="${escape(client.id)}">Restaurar</button>`:`<button class="text-button" data-action="edit-client" data-id="${escape(client.id)}">Editar / status</button><button class="text-button" data-action="delete-client" data-id="${escape(client.id)}">Excluir</button>`}</div></article>`;
    }).join('')}</div>`;
  }

  function clients(ctx) {
    const active=list(ctx.state.clients).filter(c=>!c.deletedAt);
    return `<section class="ops-page clients-page">${heading(ctx, 'Clientes', 'Contatos, viagens e histórico de relacionamento da agência.', 'new-client', 'Novo cliente')}<button type="button" class="outline-button report-launch" data-action="report-clients">Gerar relatório</button><p class="muted-small">${active.length} clientes · ${active.filter(c=>c.relationship==='Fidelizado').length} fidelizados · ${active.filter(c=>!c.phone&&!c.email).length} sem contato cadastrado</p><div class="ops-toolbar"><label class="ops-search">${svg(ctx, 'search')}<input id="operations-client-search" type="search" value="${escape(ctx.clientQuery||'')}" placeholder="Buscar nome, telefone ou e-mail" aria-label="Buscar cliente por nome ou contato" autocomplete="off"></label><label class="client-status-filter"><span>Situação</span><select id="operations-client-filter">${[['active','Ativos'],['prospect','Prospects'],['inactive','Inativos'],['all','Todos os clientes'],['deleted','Excluídos']].map(([v,l])=>`<option value="${v}" ${v===(ctx.clientFilter||'active')?'selected':''}>${l}</option>`).join('')}</select></label></div><div id="operations-client-results" aria-live="polite">${clientResults(ctx,ctx.clientQuery||'')}</div></section>`;
  }

  function calendarItems(ctx,day) {
    const s=ctx.state;
    const items=list(s.events).filter(e=>e.date===day).map(e=>({...e,kind:'event',label:e.type||'Compromisso'}));
    for(const c of list(s.clients)){
      if(c.deletedAt||!/^\d{4}-\d{2}-\d{2}$/.test(c.birthDate||'')||dateDay(c.birthDate)===null||c.birthDate>day)continue;
      const md=c.birthDate.slice(5),year=Number(day.slice(0,4)),leap=year%4===0&&(year%100!==0||year%400===0);
      if(day.slice(5)!==(md==='02-29'&&!leap?'02-28':md))continue;
      items.push({id:'birthday-'+c.id,client:c.id,title:c.name,time:'',kind:'birthday',label:'Aniversário',details:md==='02-29'&&!leap?'Nascido em 29/02 · lembrado em 28/02':'Dia de celebrar'});
    }
    for(const t of list(s.trips)) {
      if(t.datesPending||dateDay(t.start)===null||dateDay(t.end)===null||/cancelad|perdid|recusad/i.test(t.status||'')||day<t.start||day>t.end)continue;
      const confirmed=/confirmad|emitid|andamento|em viagem|viajando|finalizad|concluid/i.test(t.status||'');
      const label=confirmed?(day===t.start?'Embarque':day===t.end?'Retorno':'Em viagem'):'Viagem prevista';
      if(items.some(e=>e.trip===t.id&&normalize(e.type)===normalize(label)))continue;
      items.push({id:t.id,trip:t.id,title:t.title,time:'',kind:'trip',label,details:t.destination});
    }
    return items.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'pt-BR'));
  }
  window.TravelOperations = Object.freeze({today, inbox, inboxResults, clients, clientResults, calendarItems, model});
})();
