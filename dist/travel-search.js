(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const labels = {success:'Consultado',empty:'Sem ofertas',partial:'Resposta parcial',error:'Falha na consulta',timeout:'Tempo esgotado',unconfigured:'Aguardando credencial',unsupported:'Pedido não atendido',planned:'Em preparação',budget_limited:'Limite de consultas',ready:'Disponível',blocked:'Acesso indisponível',rate_limited:'Limite temporário de consultas'};
  const categories = {hotels:'Hospedagem',flights:'Voos',activities:'Passeios',tickets:'Ingressos',cars:'Carros',transfers:'Transfers',trip:'Viagem completa'};
  const bases = {stay:'Total da hospedagem',round_trip:'Ida e volta',one_way:'Somente ida',from:'Preço a partir de',night:'Por diária',day:'Por dia',per_person:'Por pessoa',unknown:'Base do preço não informada'};
  const keys = {mealPlan:'Alimentação',board:'Alimentação',cancellation:'Cancelamento',cancellationPolicy:'Cancelamento',baggage:'Bagagem',refundable:'Reembolsável',freeCancellation:'Cancelamento gratuito',roomType:'Quarto',taxes:'Taxas',payment:'Pagamento',airline:'Companhia',duration:'Duração',stops:'Conexões',rating:'Avaliação',address:'Endereço',room:'Quarto',fare:'Tarifa',departure:'Saída',arrival:'Chegada',departureTime:'Saída',arrivalTime:'Chegada',minimumParticipants:'Mínimo de participantes',packageDays:'Diárias no pacote',redemptionValidityMonths:'Prazo de uso · meses',advertisedPassengers:'Passageiros na oferta'};
  const scopeLabel = value => ({one_room_starting_rate:'Valor inicial para um quarto',starting_nightly_rate:'Diária inicial',one_room_stay:'Estadia para um quarto',pacote_5_diarias:'Pacote de cinco diárias',one_passenger:'Por passageiro',per_person:'Por pessoa',all_travelers:'Todos os viajantes',unverified:'Composição do preço não confirmada',unknown:'Composição do preço não informada'}[value]||'Composição do preço não informada');
  const initial = () => ({category:'hotels',mode:'quote',origin:'',destination:'',originAirport:'',destinationAirport:'',start:'',end:'',adults:2,childrenAges:'',rooms:1,flexDays:0,maxCalls:6,sort:'price'});
  // Search results stay in memory. Plans are saved only through the authenticated agency bridge.
  const makeState = () => ({draft:initial(),providers:null,selected:new Set(),manualProviders:false,result:null,error:'',providerError:'',loading:false,loadingProviders:false,shortlist:new Set(),plan:[],planId:'',planRevision:null,planName:'',planMeta:{},planDirty:false,plans:null,planBusy:false,planError:'',planConfirm:null,refreshes:new Map(),filter:'',notice:''});
  let state = makeState(), agencyScope = null;
  let currentRoot = null, context = {};
  const safeUrl = value => {try{const u=new URL(text(value));return u.protocol==='https:'&&!u.username&&!u.password ? u.href : '';}catch{return '';}};
  const dateLabel = value => {const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'Não informado';};
  const money = price => {if(typeof price?.amount!=='number'||!Number.isFinite(price.amount)||price.amount<=0)return 'Preço não informado';if(!/^[A-Z]{3}$/.test(price.currency))return `${price.amount} · moeda não informada`;try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:price.currency}).format(price.amount);}catch{return `${price.amount} ${text(price.currency)}`;}};
  const snapshot = offer => object(offer?.requestSnapshot || offer?.request);
  const isFresh = offer => {const until=Date.parse(offer?.expiresAt);return offer?.savedReference!==true&&Number.isFinite(until)&&until>Date.now();};
  const isPublished = offer => offer?.details?.priceKind==='published';
  function canImport(offer) {
    const r=snapshot(offer), p=object(offer?.price);
    return !!offer && !isPublished(offer) && offer.details?.requestedDatesMatched!==false && offer.completeness==='complete' && !!safeUrl(offer.sourceUrl) && isFresh(offer) && p.currency==='BRL' && typeof p.amount==='number' && Number.isFinite(p.amount) && p.amount>0 && ['hotels','flights'].includes(offer.category) && r.category===offer.category && (offer.category==='hotels'?p.basis==='stay':['round_trip','one_way'].includes(p.basis)) && Number.isInteger(r.adults) && r.adults>0 && Array.isArray(r.childrenAges) && r.childrenAges.every(age=>Number.isInteger(age)&&age>=0&&age<=17) && !!r.start && !!r.destination && (offer.category==='hotels'?(!!r.end&&Number.isInteger(r.rooms)&&r.rooms>0):offer.conditions?.passengerPriceScope==='all_travelers');
  }
  function conditionRows(offer) {
    const rows=[];
    for(const part of [object(offer.conditions),object(offer.details)])for(const [key,value] of Object.entries(part)){
      if(!keys[key]||value===null||value===undefined||value==='')continue;
      const v=typeof value==='boolean'?(value?'Sim':'Não'):typeof value==='string'||typeof value==='number'?String(value):'';
      if(v)rows.push([keys[key],v]);
    }
    return rows.filter((row,index)=>rows.findIndex(other=>other[0]===row[0]&&other[1]===row[1])===index).sort((a,b)=>Number(b[0]==='Mínimo de participantes')-Number(a[0]==='Mínimo de participantes'));
  }
  const offerKey = (offer, index) => `${index}:${text(offer.id)}`;
  const offers = () => list(state.result?.offers).filter(o=>o&&typeof o==='object'&&!Array.isArray(o));
  const planKey = offer => JSON.stringify([offer.category,offer.provider,offer.id,offer.sourceUrl,snapshot(offer).start,snapshot(offer).end]);
  const refreshKey = (offer,location) => `${location}:${planKey(offer)}`;
  const canDeepen = offer => isPublished(offer)&&offer?.provider==='native-laghetto'&&/^\d{1,8}$/.test(String(offer.details?.hotelId??''));
  const canRefresh = offer => !canDeepen(offer)&&typeof offer?.identityKey==='string'&&offer.identityKey.length>0&&!!offer.provider&&!!snapshot(offer).start;
  const plansEnabled = () => typeof context.plans?.request==='function';
  function markPlanChanged(){state.planDirty=true;state.planConfirm=null;state.planError='';}
  function planManager() {
    if(!plansEnabled())return '';
    return `<div class="ts-plan-manager"><label class="ts-field"><span>Nome da viagem</span><input name="plan-name" maxlength="100" placeholder="Ex.: Férias em família · Lisboa" value="${escape(state.planName)}" ${state.planBusy?'disabled':''}></label><div class="ts-plan-controls"><button type="button" class="ts-button ts-button-primary" data-ts="save-plan" ${state.planBusy||(!state.plan.length&&!state.planId)?'disabled':''}>${state.planBusy?'Salvando…':state.planId?'Salvar alterações':'Salvar viagem'}</button><button type="button" class="ts-button" data-ts="new-plan" ${state.planBusy?'disabled':''}>Nova viagem</button>${state.planId?`<button type="button" class="ts-button" data-ts="delete-plan" ${state.planBusy?'disabled':''}>Excluir viagem salva</button>`:''}</div></div><div class="ts-plan-library"><label class="ts-field"><span>Viagens salvas na agência</span><select name="saved-plan" ${state.planBusy?'disabled':''}><option value="">${state.plans===null?'Carregando viagens…':'Selecione uma viagem para retomar'}</option>${list(state.plans).map(plan=>`<option value="${escape(plan.id)}">${escape(plan.name)} · ${list(plan.items).length} opção(ões)</option>`).join('')}</select></label><button type="button" class="ts-button" data-ts="reload-plans" ${state.planBusy?'disabled':''}>Atualizar lista</button></div>${state.planDirty?'<p class="ts-note ts-unsaved">Há alterações ainda não salvas.</p>':state.planId?'<p class="ts-note">Seleção salva na agência. Preços salvos são históricos e exigem nova consulta ao retomar.</p>':''}${state.planError?`<p class="ts-attention" role="alert">${escape(state.planError)}</p>`:''}${state.planConfirm?`<div class="ts-plan-confirm" role="alert"><p>${state.planConfirm.action==='delete'?'Excluir esta viagem salva da agência? Esta ação remove a seleção, sem cancelar qualquer reserva.':'Há alterações não salvas. Descartar estas alterações para continuar?'}</p><button type="button" class="ts-button" data-ts="confirm-plan">${state.planConfirm.action==='delete'?'Excluir viagem':'Descartar e continuar'}</button><button type="button" class="ts-button" data-ts="cancel-plan">Voltar</button></div>`:''}`;
  }
  function refreshPanel(offer,index,location) {
    if(canDeepen(offer)&&location==='plan')return `<div class="ts-refresh"><button type="button" class="ts-button" data-ts="hotel-rooms" data-index="${index}" data-location="plan">Ver quartos</button><p class="ts-note">Selecione um quarto para consultar o total da hospedagem nas datas da viagem.</p></div>`;
    if(!canRefresh(offer))return '';
    const record=state.refreshes.get(refreshKey(offer,location));
    return `<div class="ts-refresh"><button type="button" class="ts-button" data-ts="refresh-offer" data-index="${index}" data-location="${location}" ${record?.loading?'disabled':''}>${record?.loading?'Reconsultando…':isPublished(offer)?'Atualizar referência':'Atualizar tarifa'}</button>${record?.message?`<p class="ts-note" role="status">${escape(record.message)}</p>`:''}${record?.candidate?`<div class="ts-refresh-proposal"><span>${escape(money(offer.price))} → <strong>${escape(money(record.candidate.price))}</strong></span><small>Mesma opção e condições · consultada em ${escape(dateLabel(record.candidate.capturedAt))}</small><button type="button" class="ts-button ts-button-primary" data-ts="accept-refresh" data-index="${index}" data-location="${location}">${location==='plan'?'Usar valor atualizado na seleção':'Usar resultado atualizado'}</button></div>`:''}</div>`;
  }
  function publishedLabel(offer) {
    const d=object(offer.details),r=snapshot(offer);
    const route=[text(d.origin)||text(r.origin),text(d.destination)||text(r.destination)].filter(Boolean).join(' → ');
    const period=d.publishedStart?`Datas publicadas: ${text(d.publishedStart)}${d.publishedEnd?' a '+text(d.publishedEnd):''}`:'Datas da oferta não informadas';
    return `${route?route+' · ':''}${period}`;
  }
  const offerRequestLabel = offer => isPublished(offer)?publishedLabel(offer):requestLabel(snapshot(offer));
  function planPanel() {
    if(!state.plan.length&&!plansEnabled())return '';
    const groups=new Map();let pending=0;
    for(const offer of state.plan){
      if(!canImport(offer)){pending++;continue;}
      const r=snapshot(offer),trip=object(offer.planningRequest),destination=trip.category==='trip'?text(trip.destination):text(r.destinationAirport||r.destination),key=JSON.stringify([destination.trim().toLocaleLowerCase('pt-BR'),r.start,r.end,r.adults,[...r.childrenAges].sort((a,b)=>a-b)]);
      if(!groups.has(key))groups.set(key,{request:{...r,destination},items:[]});groups.get(key).items.push(offer);
    }
    const totals=[...groups.values()].map(group=>{
      const duplicate=new Set(group.items.map(o=>o.category)).size!==group.items.length;
      if(duplicate)return `<p class="ts-attention">Há alternativas da mesma categoria para ${escape(group.request.destination)}. Remova as alternativas para calcular um subtotal.</p>`;
      const amount=group.items.reduce((sum,o)=>sum+Math.round(o.price.amount*100),0)/100;
      return `<div class="ts-plan-subtotal"><span>Subtotal das opções com total informado${groups.size>1?' · '+escape(group.request.destination):''}</span><strong>${escape(money({amount,currency:'BRL'}))}</strong><small>${escape(requestLabel(group.request))} · ${group.items.length} item(ns). ${pending?'Outros itens ainda têm valor pendente.':'Sujeito à reconfirmação.'}</small></div>`;
    }).join('');
    return `<section class="ts-planner" aria-label="Organizador da viagem"><div class="ts-section-heading"><div><span class="ts-eyebrow">ORGANIZADOR</span><h3>Sua seleção de viagem <small>${state.plan.length}/12</small></h3></div>${state.plan.length?'<div class="ts-plan-controls"><button class="ts-button" type="button" data-ts="export-plan">Baixar seleção</button><button class="ts-button" type="button" data-ts="clear-plan">Limpar organizador</button></div>':''}</div>${planManager()}<p class="ts-note">Escolha uma alternativa de cada categoria por viagem. Esta seleção não cria reservas.</p><ol class="ts-plan-items">${state.plan.map((o,i)=>`<li><span class="ts-plan-category">${escape(categories[o.category]||'Opção')}</span><div><strong>${escape(o.title||'Opção selecionada')}</strong><small>${escape(offerRequestLabel(o))}</small><small>${escape(o.source||o.provider)} · consultado em ${escape(dateLabel(o.capturedAt))}</small>${!isFresh(o)?'<small class="ts-historical">Referência histórica · reconsulte antes de usar</small>':''}</div><div class="ts-plan-price"><strong>${escape(money(o.price))}</strong><small>${escape(bases[o.price?.basis]||bases.unknown)}${canImport(o)?'':' · total pendente'}</small></div><button class="ts-button" type="button" data-ts="remove-plan" data-index="${i}" aria-label="Remover ${escape(o.title||'opção')} do organizador">Remover</button><div class="ts-plan-offer-actions">${canImport(o)&&typeof context.onChoose==='function'?`<button type="button" class="ts-button ts-button-primary" data-ts="choose-plan" data-index="${i}">Revisar cotação</button>`:''}${safeUrl(o.sourceUrl)?`<a class="ts-button" href="${escape(safeUrl(o.sourceUrl))}" target="_blank" rel="noopener noreferrer">Conferir na fonte ↗</a>`:''}</div>${refreshPanel(o,i,'plan')}</li>`).join('')}</ol>${totals||'<p class="ts-note">O total da viagem está pendente. Preços por pessoa, diária, publicados ou incompletos não são somados.</p>'}${groups.size>1?'<p class="ts-note">Datas, destinos ou viajantes diferentes permanecem em subtotais separados.</p>':''}<p class="ts-note">Valores da pesquisa, antes do cálculo privado de margem e taxas. ${plansEnabled()?'Use “Salvar viagem” para retomar a seleção em outro acesso.':'A seleção fica apenas nesta aba e é perdida ao recarregar.'}</p></section>`;
  }
  function exportPlan() {
    const data={version:1,createdAt:new Date().toISOString(),notice:'Referências de pesquisa. Preço e disponibilidade sujeitos à reconfirmação. Não representa reserva, emissão ou cobrança.',items:state.plan.map(offer=>({category:offer.category,title:text(offer.title),provider:text(offer.provider),source:text(offer.source),sourceUrl:safeUrl(offer.sourceUrl),capturedAt:text(offer.capturedAt),expiresAt:text(offer.expiresAt),price:{amount:offer.price?.amount??null,currency:text(offer.price?.currency),basis:text(offer.price?.basis),taxesIncluded:typeof offer.price?.taxesIncluded==='boolean'?offer.price.taxesIncluded:null},priceKind:isPublished(offer)?'published':'query_response',dates:offerRequestLabel(offer),conditions:conditionRows(offer).map(([label,value])=>({label,value})),warnings:list(offer.warnings).filter(w=>typeof w==='string'),totalPending:!canImport(offer)}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='travelpro-organizador.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    state.notice='Seleção baixada. O arquivo contém referências de pesquisa, sem reserva.';render();
  }
  function requestLabel(r) {
    const ages=list(r.childrenAges), adults=Number.isInteger(r.adults)?`${r.adults} adulto(s)`:'Adultos não informados';
    return `${text(r.origin)?text(r.origin)+' → ':''}${text(r.destination)} · ${text(r.start)||'Data não informada'}${r.end?' a '+text(r.end):''} · ${adults} · ${Array.isArray(r.childrenAges)?ages.length+' criança(s)'+(ages.length?' ('+ages.join(', ')+' anos)':''):'Crianças não informadas'}${r.category==='hotels'?' · '+(r.rooms??'—')+' quarto(s)':''}`;
  }
  function prefill(offer) {
    if(!canImport(offer))return null;
    const r=snapshot(offer), rows=conditionRows(offer);
    return {name:text(offer.title),origin:text(r.origin),destination:text(r.destination),start:text(r.start),end:text(r.end),travelers:r.adults+r.childrenAges.length,total:offer.price.amount,reference:[text(offer.source),text(offer.provider)].filter(Boolean).join(' · '),inclusions:[text(offer.title),requestLabel(r),...rows.map(([k,v])=>`${k}: ${v}`)].join('\n'),terms:`${offer.price.taxesIncluded===true?'':'O preço informado pela fonte não confirma todos os impostos e taxas. Conferir o valor final antes de enviar.\n'}Referência de pesquisa, sujeita à reconfirmação de preço e disponibilidade. Não representa reserva ou emissão.\nFonte: ${safeUrl(offer.sourceUrl)||text(offer.source)}\nConsultado em: ${dateLabel(offer.capturedAt)}.\n${list(offer.warnings).filter(x=>typeof x==='string').join('\n')}`};
  }
  function field(label,name,type='text',attrs='') {
    return `<label class="ts-field"><span>${label}</span><input type="${type}" name="${name}" value="${escape(state.draft[name])}" ${attrs}></label>`;
  }
  const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  function locationField(label,name,airport=false,required=false){
    const locations=window.TravelLocations;
    const choices=airport?list(locations?.airportSuggestions(state.draft[name],8)):list(locations?.destinationSuggestions(state.draft[name],8));
    return field(label,name,'text',`${required?'required ':''}maxlength="160" list="ts-${name}-locations" placeholder="${airport?'Cidade, aeroporto ou código':'Cidade, região ou local'}" autocomplete="off"`)+`<datalist id="ts-${name}-locations">${choices.map(item=>`<option value="${escape(airport?item.label:item.name)}">${escape(airport?item.name:item.country)}</option>`).join('')}</datalist>`;
  }
  const airportCode = value => window.TravelLocations?.resolveAirport?window.TravelLocations.resolveAirport(value):/^[a-z]{3}$/i.test(value.trim())?value.trim().toUpperCase():null;
  const matches = provider => {const modes=provider.capabilities?.modes||provider.modes;return (state.draft.category==='trip'?list(provider.categories).some(c=>c in categories):list(provider.categories).includes(state.draft.category)) && (!Array.isArray(modes)||modes.includes(state.draft.mode));};
  function unsupportedReason(provider){
    const d=state.draft,coverage=object(provider.coverage),capabilities=object(provider.capabilities),occupancy=object(capabilities.occupancy);
    if(d.category==='trip'&&list(provider.categories).length===1&&provider.categories[0]==='flights'&&(!airportCode(d.originAirport)||!airportCode(d.destinationAirport)))return 'Escolha os dois aeroportos para incluir voos';
    const destination=provider.id==='native-laghetto'?normalized(d.destination).replace(/\s*[,/-]\s*(?:rs|rj|sp|brasil|brazil)(?:\s*[,/-]\s*(?:brasil|brazil))?$/,''):normalized(d.destination);
    if(d.destination&&coverage.type==='destinations'&&list(coverage.destinations).length&&!coverage.destinations.some(city=>normalized(city)===destination))return 'Fora da cobertura para este destino';
    if(d.category!=='flights'&&occupancy.children===false&&String(d.childrenAges).trim())return 'Esta fonte ainda não consulta hospedagem com crianças';
    if(Number.isInteger(occupancy.maxRooms)&&Number(d.rooms)>occupancy.maxRooms)return `Disponível para até ${occupancy.maxRooms} quarto(s)`;
    if(Number.isInteger(occupancy.maxAdults)&&Number(d.adults)>occupancy.maxAdults)return `Disponível para até ${occupancy.maxAdults} adulto(s)`;
    return '';
  }
  const available = provider => provider.configured===true && provider.implemented!==false && matches(provider)&&!unsupportedReason(provider);
  const providerCost = provider => (provider.dateIndependent&&state.draft.mode==='opportunities'?1:1+2*Number(state.draft.flexDays));
  function selectProviders(){
    if(state.manualProviders){state.selected=new Set([...state.selected].filter(id=>list(state.providers).some(p=>p.id===id&&available(p))));return;}
    let remaining=Number(state.draft.maxCalls)||6;
    const ranked=list(state.providers).filter(available).sort((a,b)=>Number(!!b.capabilities?.datedQuotes)-Number(!!a.capabilities?.datedQuotes)||Number(b.kind==='native')-Number(a.kind==='native'));
    state.selected=new Set();for(const provider of ranked){const cost=providerCost(provider);if(cost<=remaining){state.selected.add(provider.id);remaining-=cost;}}
    // A small budget can still cover the requested dates. Optional date variants
    // are best effort and the server enforces the actual request cap.
    if(!state.selected.size&&remaining>=1&&ranked.length)state.selected.add(ranked[0].id);
  }
  function providerPanel() {
    if(state.loadingProviders)return '<p class="ts-note" role="status">Carregando fontes de pesquisa…</p>';
    if(state.providerError)return `<p class="ts-alert" role="alert">${escape(state.providerError)}</p><button class="ts-button" type="button" data-ts="reload">Tentar carregar fontes</button>`;
    const matching=list(state.providers).filter(matches);
    return `<fieldset class="ts-providers"><legend>Onde pesquisar</legend>${matching.length?matching.map(p=>`<label class="ts-provider ${available(p)?'':'ts-unavailable'}"><input type="checkbox" name="provider" value="${escape(p.id)}" ${state.selected.has(p.id)&&available(p)?'checked':''} ${available(p)?'':'disabled'}><span><strong>${escape(p.name||p.id)}</strong><small>${p.kind==='native'?'Coleta direta':'Fonte conectada'} · ${escape(unsupportedReason(p)|| (available(p)?'Pronto para consultar':labels[p.status]||'Aguardando ativação'))}</small>${p.capabilities?.datedQuotes?'<small>Consulta tarifas para datas e viajantes</small>':p.capabilities?.publishedOffers?'<small>Referências publicadas · disponibilidade a conferir</small>':''}${p.coverage?.label?`<small>${escape(p.coverage.label)}</small>`:list(p.destinations).length?`<small>Cobertura: ${escape(list(p.destinations).filter(v=>typeof v==='string').slice(0,6).join(', '))}${p.destinations.length>6?'…':''}</small>`:''}</span></label>`).join(''):'<p class="ts-note">Nenhuma fonte cadastrada para esta categoria.</p>'}</fieldset><button class="ts-button" type="button" data-ts="auto-providers">Selecionar fontes para este pedido</button><p class="ts-note">A seleção automática considera o destino, a ocupação e o limite de consultas. ${state.manualProviders?'Você personalizou a seleção.':''}</p>${matching.some(available)?'':'<p class="ts-note">Nenhuma fonte conectada atende este pedido na cobertura atual. Ajuste o destino ou a ocupação; as cotações manuais continuam disponíveis.</p>'}`;
  }
  function statusPanel() {
    if(!state.result)return '';
    return `<details class="ts-status"><summary>Fontes consultadas · ${Number(state.result.summary?.callsUsed)||0} consulta(s) às fontes, ${Number(state.result.summary?.cacheHits)||0} reaproveitada(s)</summary>${Number.isInteger(state.result.summary?.networkRequests)?`<p class="ts-note">${state.result.summary.networkRequests} requisição(ões) de rede na coleta direta. Uma consulta à fonte pode ler várias páginas.</p>`:''}<div class="ts-status-grid">${list(state.result.providers).filter(p=>p&&typeof p==='object').map(p=>`<div><strong>${escape(p.name||p.id)}</strong><span>${escape(labels[p.status]||'Situação não informada')}${p.cached?' · resultado recente':''}</span><small>${escape(p.message||'')}${Number.isInteger(p.offerCount)?' · '+p.offerCount+' opção(ões)':''}</small></div>`).join('')}</div></details>`;
  }
  function evidencePanel(offer) {
    const e=object(offer.evidence || offer.details?.evidence);
    if(!Object.keys(e).length)return '';
    const url=safeUrl(e.documentUrl);
    return `<details class="ts-evidence"><summary>Evidência da coleta</summary>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">Página consultada ↗</a>`:''}${[['Preço na página',e.rawPrice],['Moeda na página',e.rawCurrency],['Extrator',e.parserVersion],['Local do dado',e.selector||e.jsonPath],['Identificador do documento',e.sha256]].filter(([,v])=>typeof v==='string'||typeof v==='number').map(([label,value])=>`<p><strong>${label}:</strong> ${escape(value)}</p>`).join('')}</details>`;
  }
  function card(offer,index) {
    const p=object(offer.price),key=offerKey(offer,index),url=safeUrl(offer.sourceUrl),rows=conditionRows(offer),selected=state.shortlist.has(key),fresh=isFresh(offer),published=isPublished(offer);
    const native=offer.kind==='native'||list(state.providers).some(provider=>provider.id===offer.provider&&provider.kind==='native');
    const inPlan=state.plan.some(item=>planKey(item)===planKey(offer));
    const deepen=canDeepen(offer);
    return `<article class="ts-card ${selected?'ts-card-selected':''}" data-offer="${index}">
      <div class="ts-card-top"><span class="ts-source">${escape(offer.source||offer.provider||'Fonte não informada')}</span><label class="ts-compare-check"><input type="checkbox" data-ts-compare="${index}" ${selected?'checked':''}>Comparar</label></div>
      <div class="ts-tags"><span>${escape(categories[offer.category]||'Opção')}</span>${native?'<span class="ts-native">Coleta própria</span>':''}${published?'<span>Preço publicado</span>':''}${!fresh?'<span class="ts-expired">Consulta vencida</span>':offer.cached?'<span>Consulta recente reutilizada</span>':''}</div>
      <h3>${escape(offer.title||'Opção encontrada')}</h3><p class="ts-request-label">${escape(offerRequestLabel(offer))}</p>
      <div class="ts-price"><strong>${escape(money(p))}</strong><span>${escape(bases[p.basis]||bases.unknown)}${offer.details?.priceScope?' · '+escape(scopeLabel(offer.details.priceScope)):''} · ${p.taxesIncluded===true?'taxas incluídas':p.taxesIncluded===false?'taxas adicionais':'taxas não informadas'}</span></div>
      ${published?'<p class="ts-attention">Preço publicado pela fonte. Não confirma disponibilidade, ocupação ou valor nas datas do seu pedido.</p>':offer.details?.requestedDatesMatched===false?'<p class="ts-attention">Esta opção não corresponde às datas solicitadas.</p>':''}
      ${offer.completeness==='selection_required'?'<p class="ts-attention">Seleção adicional necessária para conhecer o valor final.</p>':''}${!published&&offer.completeness!=='complete'&&offer.completeness!=='selection_required'?'<p class="ts-attention">Preço e condições ainda precisam ser conferidos.</p>':''}
      <dl class="ts-conditions">${rows.slice(0,5).map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}${!rows.length?'<div><dt>Condições</dt><dd>Não informadas pela fonte</dd></div>':''}</dl>
      <details class="ts-details"><summary>Ver origem e detalhes</summary><p>Consultado em ${escape(dateLabel(offer.capturedAt))}${offer.cached?' · resultado reaproveitado':''}.</p><p>${fresh?'Atualizar a consulta após '+escape(dateLabel(offer.expiresAt))+'.':'Consulta vencida ou sem prazo de atualização. Pesquise novamente antes de usar o preço.'}</p>${rows.slice(5).map(([k,v])=>`<p><strong>${escape(k)}:</strong> ${escape(v)}</p>`).join('')}${list(offer.warnings).filter(w=>typeof w==='string').map(w=>`<p>${escape(w)}</p>`).join('')}<p>A fonte deve reconfirmar preço e disponibilidade. Esta pesquisa não reserva, cobra ou emite.</p>${evidencePanel(offer)}</details>
      <div class="ts-card-actions">${deepen?`<button type="button" class="ts-button ts-button-primary" data-ts="hotel-rooms" data-index="${index}">Ver quartos</button>`:''}${url?`<a class="ts-button" href="${escape(url)}" target="_blank" rel="noopener noreferrer">Conferir na fonte ↗</a>`:'<span class="ts-note">Link de origem indisponível</span>'}<button type="button" class="ts-button" data-ts="add-plan" data-index="${index}" ${inPlan?'disabled':''}>${inPlan?'No organizador':'Organizar viagem'}</button>${canImport(offer)&&typeof context.onChoose==='function'?`<button type="button" class="ts-button ts-button-primary" data-ts="choose" data-index="${index}">Revisar cotação</button>`:''}</div>
      ${refreshPanel(offer,index,'card')}${!canImport(offer)?'<p class="ts-note ts-import-note">Confira o total, a ocupação e as taxas na fonte antes de preencher uma cotação.</p>':''}
    </article>`;
  }
  function comparison() {
    const selected=offers().map((o,i)=>({o,i})).filter(({o,i})=>state.shortlist.has(offerKey(o,i)));
    if(!selected.length)return '';
    const value=(o,k)=>conditionRows(o).filter(([key])=>key===k).map(([,v])=>v).join(' · ')||'Não informado';
    const rows=[['Preço',o=>money(o.price)],['Base',o=>bases[o.price?.basis]||bases.unknown],['Taxas',o=>o.price?.taxesIncluded===true?'Incluídas':o.price?.taxesIncluded===false?'Adicionais':'Não informadas'],['Datas e viajantes',o=>offerRequestLabel(o)],['Natureza do preço',o=>isPublished(o)?'Publicado · disponibilidade não verificada':'Resposta ao pedido de pesquisa'],['Cancelamento',o=>value(o,'Cancelamento')],['Cancelamento gratuito',o=>value(o,'Cancelamento gratuito')],['Alimentação',o=>value(o,'Alimentação')],['Bagagem',o=>value(o,'Bagagem')],['Consultado em',o=>dateLabel(o.capturedAt)]];
    return `<section class="ts-comparison" aria-label="Comparação das opções"><div class="ts-section-heading"><h3>Compare sua seleção</h3><button type="button" class="ts-button" data-ts="clear-compare">Limpar seleção</button></div><p class="ts-note">Compare condições equivalentes. Preços por diária, a partir de e totais de grupos diferentes não são equivalentes.</p><div class="ts-table-scroll" tabindex="0" role="region" aria-label="Tabela de comparação"><table><thead><tr><th scope="col">Condição</th>${selected.map(({o})=>`<th scope="col">${escape(o.title)}<small>${escape(o.source||o.provider)}</small></th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th scope="row">${label}</th>${selected.map(({o})=>`<td>${escape(fn(o))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }
  function resultPanel() {
    if(state.loading)return '<div class="ts-empty" role="status"><span class="ts-spinner" aria-hidden="true"></span><h3>Consultando as fontes selecionadas</h3><p>Buscando preços e condições para o seu pedido. As respostas podem ser parciais.</p></div>';
    if(!state.result)return '<div class="ts-empty"><h3>Uma pesquisa, várias possibilidades.</h3><p>Informe a viagem para comparar preços encontrados nas fontes conectadas.</p></div>';
    let found=offers().map((offer,index)=>({offer,index}));
    const filter=state.filter.trim().toLocaleLowerCase('pt-BR');
    if(filter)found=found.filter(({offer})=>[offer.title,offer.source,offer.provider].filter(x=>typeof x==='string').join(' ').toLocaleLowerCase('pt-BR').includes(filter));
    // Never compare currencies or unknown price bases as though they were group totals.
    // Reorder only within a documented comparable group. Unknown bases keep their
    // server positions, and ratings on different scales never compete directly.
    const reorderWithin=(groupFor,compare)=>{
      const groups=new Map();
      found.forEach((entry,index)=>{const key=groupFor(entry.offer);if(!key)return;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({entry,index});});
      for(const group of groups.values()){const ordered=group.map(item=>item.entry).sort(compare);group.forEach((item,index)=>{found[item.index]=ordered[index];});}
    };
    reorderWithin(o=>['stay','round_trip','one_way'].includes(o.price?.basis)&&typeof o.comparison?.priceGroup==='string'&&o.comparison.priceGroup?o.comparison.priceGroup:null,(a,b)=>a.offer.price.amount-b.offer.price.amount);
    if(state.draft.sort==='quality')reorderWithin(o=>typeof o.details?.rating==='number'&&Number.isFinite(o.details.rating)&&typeof o.details?.ratingScale==='number'&&o.details.ratingScale>0&&o.details.rating>=0&&o.details.rating<=o.details.ratingScale?'rating-'+o.details.ratingScale:null,(a,b)=>b.offer.details.rating-a.offer.details.rating);
    const failures=list(state.result.providers).some(p=>p&&!['success','empty'].includes(p.status));
    return `<div class="ts-result-heading"><div><h3>${offers().length} opção(ões) encontradas</h3><p>Pedido pesquisado: ${escape(requestLabel(object(state.result.request)))}</p></div><label class="ts-field"><span>Ordenar</span><select name="result-sort"><option value="price" ${state.draft.sort==='price'?'selected':''}>Preço por base e moeda</option><option value="quality" ${state.draft.sort==='quality'?'selected':''}>Avaliação disponível</option></select></label></div><label class="ts-field ts-filter"><span>Filtrar por nome ou fonte</span><input type="search" name="result-filter" value="${escape(state.filter)}" placeholder="Encontre uma opção"></label>${list(state.result.warnings).filter(w=>typeof w==='string').map(w=>`<p class="ts-attention">${escape(w)}</p>`).join('')}${failures?'<p class="ts-attention">A pesquisa teve fontes indisponíveis ou respostas parciais. Consulte a situação de cada fonte abaixo.</p>':''}${statusPanel()}${comparison()}${[['quote','Respostas à pesquisa'],['published','Oportunidades publicadas']].map(([type,label])=>{const items=found.filter(({offer})=>isPublished(offer)===(type==='published'));return items.length?`<section class="ts-result-group" data-price-kind="${type}" aria-label="${label}"><h3>${label}<small>${items.length}</small></h3>${type==='published'?'<p class="ts-note">As datas e a composição do preço vêm da publicação. Essas opções não confirmam a viagem solicitada.</p>':''}<div class="ts-offers">${items.map(({offer,index})=>card(offer,index)).join('')}</div></section>`:'';}).join('')}${!found.length?`<div class="ts-empty"><h3>${filter?'Nenhuma opção corresponde ao filtro.':failures?'Não foi possível completar a pesquisa.':'Nenhuma oferta recebida para este pedido.'}</h3><p>${failures?'Uma falha ou falta de acesso não significa ausência de disponibilidade.':'Experimente outras datas ou fontes.'}</p></div>`:''}`;
  }
  function render() {
    const root=currentRoot;if(!root?.isConnected)return;
    const d=state.draft,hotels=d.category==='hotels',trip=d.category==='trip',flights=d.category==='flights',datedStay=hotels||trip||d.category==='cars',opportunities=d.mode==='opportunities';
    const origin=flights?locationField('Aeroporto de origem','origin',true,true):trip||d.category==='transfers'?locationField('Origem','origin'):'';
    const city=locationField(flights?'Aeroporto de destino':d.category==='cars'?'Local de retirada':'Destino','destination',flights,true);
    const dates=field(hotels?'Entrada':d.category==='cars'?'Retirada':'Início','start','date','required')+field(hotels?'Saída':d.category==='cars'?'Devolução':trip?'Fim':'Volta ou fim · opcional','end','date',datedStay?'required':'');
    const count=[...state.selected].filter(id=>list(state.providers).some(p=>p.id===id&&available(p))).length;
    root.innerHTML=`<section class="ts-workspace" aria-labelledby="ts-title">
      <header class="ts-heading"><div><span class="ts-eyebrow">BUSCA DE VIAGENS</span><h2 id="ts-title">Sua viagem, em uma busca.</h2><p>Pesquise nas fontes, compare as condições e organize as escolhas para preparar a cotação.</p></div><span class="ts-badge">Pesquisa · sem emissão</span></header>
      <form id="travel-search-form" class="ts-form"><fieldset ${state.loading?'disabled':''}><legend class="sr-only">Pedido da viagem</legend>
        <div class="ts-tabs" role="group" aria-label="Tipo de pesquisa">${Object.entries(categories).map(([value,label])=>`<button type="button" data-ts="category" data-category="${value}" aria-pressed="${d.category===value}">${label}</button>`).join('')}</div>
        <div class="ts-mode"><label class="ts-field"><span>O que você procura?</span><select name="mode"><option value="quote" ${!opportunities?'selected':''}>Cotação para a viagem</option><option value="opportunities" ${opportunities?'selected':''}>Oportunidades publicadas</option></select></label><p class="ts-note">${opportunities?'Explore preços anunciados e datas alternativas. Cada opção mostra as condições publicadas pela fonte.':'As fontes respondem conforme sua cobertura. Preços publicados aparecem separados das respostas à pesquisa.'}</p></div>
        <div class="ts-fields">${origin}${city}${dates}${field('Adultos','adults','number','required min="1" max="9" step="1"')}${hotels||trip?field('Quartos','rooms','number','required min="1" max="4" step="1"'):''}${field('Idades das crianças · opcional','childrenAges','text','placeholder="Ex.: 3, 8" aria-describedby="ts-child-note"')}</div>
        <p id="ts-child-note" class="ts-note">Informe a idade de cada criança na viagem, separada por vírgula. Sem crianças, deixe em branco.</p>
        ${trip?`<details class="ts-options ts-airports"><summary>Aeroportos da viagem · opcionais</summary><div class="ts-fields ts-advanced-fields">${locationField('Aeroporto de origem','originAirport',true)}${locationField('Aeroporto de destino','destinationAirport',true)}</div><p class="ts-note">Escolha os dois aeroportos para incluir voos. Cidades com mais de um aeroporto exigem uma escolha.</p></details>`:''}
        <details class="ts-options"><summary>Fontes e flexibilidade</summary>${providerPanel()}<div class="ts-fields ts-advanced-fields"><label class="ts-field"><span>Flexibilidade das datas</span><select name="flexDays">${[[0,'Datas exatas'],[1,'Até 1 dia antes ou depois'],[2,'Até 2 dias antes ou depois']].map(([v,label])=>`<option value="${v}" ${Number(d.flexDays)===v?'selected':''}>${label}</option>`).join('')}</select></label>${field('Limite de consultas às fontes','maxCalls','number','required min="1" max="12" step="1"')}</div><p class="ts-note">As datas principais têm prioridade. Datas alternativas dependem do limite de consultas disponível. Uma consulta pode ler várias páginas. APIs externas podem consumir créditos contratados.</p></details>
        <div class="ts-submit"><button type="submit" class="ts-button ts-button-primary" ${state.loadingProviders||!count?'disabled':''}>${state.loading?'Pesquisando…':trip?'Buscar a viagem':'Buscar opções'}</button><span class="ts-note">${count} fonte(s) selecionada(s) · valores em BRL quando disponíveis</span></div>
        ${!state.loadingProviders&&!state.providerError&&!list(state.providers).some(available)?'<p class="ts-attention">Nenhuma fonte conectada para esta categoria. Abra “Fontes e flexibilidade” para ver o que falta ativar. As cotações manuais continuam disponíveis abaixo.</p>':''}${state.providerError?'<p class="ts-attention">Não foi possível carregar as fontes. Abra “Fontes e flexibilidade” para tentar novamente.</p>':''}
      </fieldset></form>
      ${state.error?`<p class="ts-alert" role="alert">${escape(state.error)}</p>`:''}<p class="ts-live-notice" role="status">${escape(state.notice)}</p>
      <div class="ts-results">${planPanel()}${resultPanel()}</div>
    </section>`;
  }
  function readDraft(form) {
    if(!form)return;
    for(const name of Object.keys(state.draft)){const element=form.elements.namedItem(name);if(element&&name!=='sort')state.draft[name]=element.value;}
    state.selected=new Set([...form.querySelectorAll('[name="provider"]:checked')].map(el=>el.value));
  }
  function payload() {
    const d=state.draft, ages=String(d.childrenAges).trim();
    if(ages&&!/^\d{1,2}(\s*,\s*\d{1,2})*$/.test(ages))throw new Error('Informe as idades separadas por vírgula, por exemplo: 3, 8.');
    const childrenAges=ages?ages.split(',').map(Number):[];
    if(childrenAges.some(age=>age>17)||childrenAges.length>8)throw new Error('Informe até 8 crianças, com idades entre 0 e 17 anos.');
    if(!d.destination.trim()||!d.start||['hotels','trip','cars'].includes(d.category)&&(!d.end||d.end<=d.start)||d.end&&d.end<d.start)throw new Error('Confira o destino e as datas da viagem.');
    if(d.category==='flights'&&(!airportCode(d.origin)||!airportCode(d.destination)))throw new Error('Selecione o aeroporto de origem e de destino na lista, ou use códigos IATA de três letras, como POA e GRU. Cidades com mais de um aeroporto precisam de uma escolha.');
    const providers=[...state.selected].filter(id=>list(state.providers).some(p=>p.id===id&&available(p)));
    if(!Number.isInteger(Number(d.adults))||Number(d.adults)<1||Number(d.adults)+childrenAges.length>9)throw new Error('Informe de 1 a 9 viajantes, incluindo ao menos um adulto.');
    if(['hotels','trip'].includes(d.category)&&(!Number.isInteger(Number(d.rooms))||Number(d.rooms)<1||Number(d.rooms)>4||Number(d.rooms)>Number(d.adults)))throw new Error('Informe de 1 a 4 quartos, com pelo menos um adulto por quarto.');
    if(!Number.isInteger(Number(d.maxCalls))||Number(d.maxCalls)<1||Number(d.maxCalls)>12||![0,1,2].includes(Number(d.flexDays)))throw new Error('Revise o limite de consultas e a flexibilidade das datas.');
    if(!providers.length)throw new Error('Selecione ao menos uma fonte conectada.');
    if(providers.length>Number(d.maxCalls))throw new Error('A seleção ultrapassa o limite de consultas às fontes. Reduza as fontes ou use a seleção automática.');
    if(d.category==='trip'&&([d.originAirport,d.destinationAirport].some(value=>value&&!airportCode(value))||Boolean(d.originAirport.trim())!==Boolean(d.destinationAirport.trim())))throw new Error('Escolha os dois aeroportos na lista ou informe seus códigos IATA; para pesquisar sem voos, deixe ambos em branco.');
    return {category:d.category,mode:d.mode,origin:d.category==='flights'?airportCode(d.origin):['trip','transfers'].includes(d.category)?d.origin.trim():'',destination:d.category==='flights'?airportCode(d.destination):d.destination.trim(),...(d.category==='trip'?{originAirport:d.originAirport?airportCode(d.originAirport):'',destinationAirport:d.destinationAirport?airportCode(d.destinationAirport):''}:{}),start:d.start,end:d.end,adults:Number(d.adults),childrenAges,rooms:['hotels','trip'].includes(d.category)?Number(d.rooms):1,currency:'BRL',providers,flexDays:Number(d.flexDays),maxCalls:Number(d.maxCalls),sort:d.sort};
  }
  async function search(form) {
    if(state.loading)return;
    readDraft(form);selectProviders();state.error='';state.notice='';let body;
    try{body=payload();}catch(error){state.error=error.message;render();return;}
    return runSearch(body);
  }
  async function runSearch(body) {
    if(state.loading)return;
    const activeState=state;
    state.loading=true;state.result=null;state.shortlist.clear();state.filter='';render();
    try{
      const result=await context.api.request('/travel-search',{method:'POST',body,signal:AbortSignal.timeout(45000)});
      if(state!==activeState)return;
      if(!result||!Array.isArray(result.offers)||!Array.isArray(result.providers)||!result.request)throw new Error('A resposta da pesquisa veio incompleta. Tente novamente.');
      state.result=result;
    }catch(error){if(state===activeState)state.error=text(error?.message)||'Não foi possível consultar as fontes. Tente novamente.';}
    finally{if(state===activeState){state.loading=false;render();}}
  }
  async function loadPlans() {
    if(!plansEnabled()||state.planBusy)return;
    const activeState=state;state.planBusy=true;state.planError='';render();
    try{const result=await context.plans.request('');if(state!==activeState)return;if(!Array.isArray(result?.plans))throw Error('Não foi possível carregar as viagens salvas.');state.plans=result.plans;}
    catch(error){if(state===activeState)state.planError=text(error?.message)||'Não foi possível carregar as viagens salvas.';}
    finally{if(state===activeState){state.planBusy=false;render();}}
  }
  async function savePlan() {
    if(!plansEnabled()||state.planBusy||(!state.plan.length&&!state.planId))return;
    const activeState=state,name=state.planName.trim(),items=JSON.parse(JSON.stringify(state.plan));
    if(!name){state.planError='Dê um nome à viagem antes de salvar.';render();return;}
    state.planBusy=true;state.planError='';render();
    try{
      const result=await context.plans.request(state.planId?'/'+encodeURIComponent(state.planId):'',{method:state.planId?'PUT':'POST',body:{...(state.planId?{revision:state.planRevision}:{}),plan:{...state.planMeta,name,items}}});
      if(state!==activeState)return;if(!result?.plan?.id||!Number.isInteger(result.plan.revision))throw Error('A confirmação de salvamento veio incompleta. Atualize a lista antes de tentar novamente.');
      state.planId=result.plan.id;state.planRevision=result.plan.revision;state.planName=result.plan.name;state.plans=list(result.plans);state.planDirty=JSON.stringify(state.plan)!==JSON.stringify(items);state.notice='Viagem salva na agência. Ao retomar, consulte novamente os preços.';
    }catch(error){if(state===activeState)state.planError=text(error?.message)||'Não foi possível salvar a viagem. Sua seleção continua nesta tela.';}
    finally{if(state===activeState){state.planBusy=false;render();}}
  }
  async function planAction(action,id) {
    if(state.planBusy)return;
    if(action==='delete'){
      const activeState=state;state.planBusy=true;state.planError='';render();
      try{const result=await context.plans.request('/'+encodeURIComponent(state.planId),{method:'DELETE',body:{revision:state.planRevision}});if(state!==activeState)return;state.plans=list(result.plans);clearPlan();state.notice='Viagem salva excluída.';}
      catch(error){if(state===activeState)state.planError=text(error?.message)||'Não foi possível excluir a viagem.';}
      finally{if(state===activeState){state.planBusy=false;render();}}return;
    }
    if(action==='load'){
      const saved=list(state.plans).find(plan=>plan.id===id);if(!saved)return;
      state.plan=list(saved.items).slice(0,12).map(item=>({...JSON.parse(JSON.stringify(item)),savedReference:true,expiresAt:'',bookable:false,completeness:'unknown'}));state.planId=saved.id;state.planRevision=saved.revision;state.planName=text(saved.name);state.planMeta={clientId:text(saved.clientId),notes:text(saved.notes)};state.planDirty=false;state.planConfirm=null;state.planError='';state.refreshes.clear();state.notice='Viagem retomada. Os preços são históricos; atualize cada tarifa antes de usar.';
    }else{clearPlan();state.notice='Novo organizador pronto. As viagens já salvas continuam na lista.';}
    render();
  }
  function clearPlan(){state.plan=[];state.planId='';state.planRevision=null;state.planName='';state.planMeta={};state.planDirty=false;state.planConfirm=null;state.planError='';state.refreshes.clear();}
  function requestPlanAction(action,id){if(state.planBusy)return;if(action==='delete'||state.planDirty){state.planConfirm={action,id};render();return;}planAction(action,id);}
  async function refreshOffer(offer,index,location) {
    if(!canRefresh(offer))return;
    const key=refreshKey(offer,location);if(state.refreshes.get(key)?.loading)return;
    const activeState=state,r=snapshot(offer),hotelId=String(offer.details?.hotelId||r.hotelId||'');
    const body={...r,mode:isPublished(offer)?'opportunities':'quote',providers:[offer.provider],refresh:true,flexDays:0,maxCalls:1,sort:'price',...(offer.category==='hotels'&&/^\d{1,8}$/.test(hotelId)?{hotelId}:{})};
    state.refreshes.set(key,{loading:true});render();
    try{
      const result=await context.api.request('/travel-search',{method:'POST',body,signal:AbortSignal.timeout(45000)});if(state!==activeState)return;
      if(!Array.isArray(result?.offers)||!Array.isArray(result.providers))throw Error('A resposta da atualização veio incompleta.');
      const matches=result.offers.filter(item=>item?.identityKey===offer.identityKey&&item.provider===offer.provider&&item.category===offer.category&&item.price?.currency===offer.price?.currency&&item.price?.basis===offer.price?.basis&&item.price?.taxesIncluded===offer.price?.taxesIncluded&&isPublished(item)===isPublished(offer)&&isFresh(item)&&!item.cached&&Number.isFinite(item.price?.amount)&&item.price.amount>0);
      const failure=result.providers.some(p=>p.id===offer.provider&&!['success','empty'].includes(p.status));
      if(matches.length!==1){state.refreshes.set(key,{message:failure?'Não foi possível reconfirmar nesta consulta. A referência anterior foi mantida.':matches.length>1?'A fonte retornou mais de uma tarifa equivalente. A referência anterior foi mantida; confira na fonte.':'A mesma opção, com as mesmas condições, não foi encontrada. A referência anterior foi mantida; isso não confirma indisponibilidade.'});}
      else{const candidate=matches[0],delta=Math.round(candidate.price.amount*100)-Math.round(offer.price.amount*100);state.refreshes.set(key,{candidate,message:delta===0?'O preço se manteve. Confirme abaixo para usar esta nova consulta.':`O preço ${delta>0?'aumentou':'diminuiu'} ${money({amount:Math.abs(delta)/100,currency:candidate.price.currency})}. A seleção só muda se você aceitar.`});}
    }catch(error){if(state===activeState)state.refreshes.set(key,{message:text(error?.message)||'Não foi possível atualizar a tarifa. A referência anterior foi mantida.'});}
    finally{if(state===activeState)render();}
  }
  function acceptRefresh(offer,index,location){
    const key=refreshKey(offer,location),candidate=state.refreshes.get(key)?.candidate;if(!candidate||!isFresh(candidate))return;
    if(location==='plan'){state.plan[index]={...JSON.parse(JSON.stringify(candidate)),planningRequest:offer.planningRequest};markPlanChanged();}
    else{const original=offers()[index],rawIndex=state.result.offers.indexOf(original);if(rawIndex<0)return;state.result.offers[rawIndex]=candidate;state.shortlist.clear();}
    state.refreshes.delete(key);state.notice=location==='plan'?'Valor atualizado na seleção. Salve a viagem para guardar a alteração.':'Resultado atualizado. Confira as condições antes de preparar a cotação.';render();
  }
  async function loadProviders() {
    if(state.loadingProviders)return;const activeState=state;state.loadingProviders=true;state.providerError='';render();
    try{
      const response=await context.api.request('/travel-search/providers');
      if(state!==activeState)return;
      if(!response||!Array.isArray(response.providers))throw new Error('Não foi possível carregar a lista de fontes.');
      state.providers=response.providers.filter(p=>p&&typeof p.id==='string'&&Array.isArray(p.categories));
      selectProviders();
    }catch(error){if(state===activeState)state.providerError=text(error?.message)||'Não foi possível carregar as fontes.';}
    finally{if(state===activeState){state.loadingProviders=false;render();}}
  }
  function mount(root,ctx={}) {
    if(!root)return;
    const scope=text(ctx.agencyId);if(agencyScope!==null&&agencyScope!==scope)state=makeState();agencyScope=scope;
    currentRoot=root;context=ctx;
    if(!root.dataset.travelSearchBound){
      root.dataset.travelSearchBound='true';
      root.addEventListener('submit',event=>{if(event.target.id==='travel-search-form'){event.preventDefault();event.stopPropagation();search(event.target);}});
      root.addEventListener('input',event=>{
        if(event.target.name==='plan-name'){state.planName=event.target.value;markPlanChanged();const notice=root.querySelector('.ts-unsaved');if(notice)notice.textContent='Há alterações ainda não salvas.';return;}
        if(event.target.name==='result-filter'){
          const position=event.target.selectionStart;state.filter=event.target.value;render();const el=root.querySelector('[name="result-filter"]');el?.focus();try{el?.setSelectionRange(position,position);}catch{}return;
        }
        if(event.target.closest('#travel-search-form')){
          readDraft(root.querySelector('form'));
          if(['origin','destination','originAirport','destinationAirport'].includes(event.target.name)&&window.TravelLocations){
            const airport=['originAirport','destinationAirport'].includes(event.target.name)||state.draft.category==='flights';
            const choices=airport?window.TravelLocations.airportSuggestions(event.target.value,8):window.TravelLocations.destinationSuggestions(event.target.value,8),menu=root.querySelector('#ts-'+event.target.name+'-locations');
            if(menu)menu.innerHTML=choices.map(item=>`<option value="${escape(airport?item.label:item.name)}">${escape(airport?item.name:item.country)}</option>`).join('');
          }
        }
      });
      root.addEventListener('change',event=>{
        if(event.target.name==='saved-plan'){if(event.target.value)requestPlanAction('load',event.target.value);return;}
        if(event.target.name==='result-sort'){state.draft.sort=event.target.value;render();return;}
        if(event.target.matches('[data-ts-compare]')){
          const index=Number(event.target.dataset.tsCompare),offer=offers()[index];if(!offer)return;
          const key=offerKey(offer,index);if(event.target.checked&&state.shortlist.size>=3){event.target.checked=false;state.notice='Selecione até três opções para comparar.';}else{event.target.checked?state.shortlist.add(key):state.shortlist.delete(key);state.notice='';}render();return;
        }
        if(event.target.closest('#travel-search-form')){readDraft(root.querySelector('form'));if(event.target.name==='provider')state.manualProviders=true;if(event.target.name==='mode'){state.manualProviders=false;state.result=null;state.shortlist.clear();}if(['provider','mode','destination','originAirport','destinationAirport','adults','rooms','childrenAges','flexDays','maxCalls'].includes(event.target.name)){selectProviders();render();}}
      });
      root.addEventListener('click',event=>{
        const button=event.target.closest('[data-ts]');if(!button)return;const action=button.dataset.ts;
        if(action==='reload'){loadProviders();return;}
        if(action==='reload-plans'){loadPlans();return;}
        if(action==='save-plan'){savePlan();return;}
        if(action==='new-plan'){requestPlanAction('new');return;}
        if(action==='delete-plan'){requestPlanAction('delete');return;}
        if(action==='confirm-plan'){const pending=state.planConfirm;state.planConfirm=null;if(pending)planAction(pending.action,pending.id);return;}
        if(action==='cancel-plan'){state.planConfirm=null;render();return;}
        if(action==='refresh-offer'||action==='accept-refresh'){const index=Number(button.dataset.index),location=button.dataset.location,offer=location==='plan'?state.plan[index]:offers()[index];if(offer){if(action==='refresh-offer')refreshOffer(offer,index,location);else if(!state.planBusy||location!=='plan')acceptRefresh(offer,index,location);}return;}
        if(action==='auto-providers'){readDraft(root.querySelector('form'));state.manualProviders=false;selectProviders();state.notice='Fontes selecionadas conforme este pedido e seu limite de consultas.';render();return;}
        if(action==='category'&&!state.loading){readDraft(root.querySelector('form'));state.draft.category=button.dataset.category;state.draft.destination='';state.result=null;state.shortlist.clear();state.filter='';state.notice='';state.manualProviders=false;selectProviders();state.error='';render();return;}
        if(action==='hotel-rooms'&&!state.loading){
          const offer=button.dataset.location==='plan'?state.plan[Number(button.dataset.index)]:offers()[Number(button.dataset.index)],r=snapshot(offer),hotelId=String(offer?.details?.hotelId??'');
          if(offer?.provider!=='native-laghetto'||!isPublished(offer)||!/^\d{1,8}$/.test(hotelId))return;
          const body={...r,category:'hotels',mode:'quote',providers:['native-laghetto'],hotelId,flexDays:0,maxCalls:1,sort:'price'};
          Object.assign(state.draft,{category:'hotels',mode:'quote',origin:text(r.origin),destination:text(r.destination),start:text(r.start),end:text(r.end),adults:r.adults,childrenAges:list(r.childrenAges).join(', '),rooms:r.rooms,flexDays:0,maxCalls:1,sort:'price'});
          state.selected=new Set(['native-laghetto']);state.error='';state.notice='Consultando quartos para as datas e os viajantes do pedido.';runSearch(body);return;
        }
        if(action==='add-plan'&&!state.planBusy){
          const offer=offers()[Number(button.dataset.index)];if(!offer)return;
          if(state.plan.some(item=>planKey(item)===planKey(offer)))return;
          if(state.plan.length>=12){state.notice='O organizador comporta até 12 opções. Remova uma opção para continuar.';render();return;}
          state.plan.push({...JSON.parse(JSON.stringify(offer)),planningRequest:JSON.parse(JSON.stringify(state.result.request))});markPlanChanged();state.notice='Opção adicionada ao organizador. Você pode continuar pesquisando outras partes da viagem.';render();return;
        }
        if(action==='remove-plan'&&!state.planBusy){const index=Number(button.dataset.index);if(Number.isInteger(index)&&index>=0&&index<state.plan.length)state.plan.splice(index,1);markPlanChanged();state.notice='Opção removida do organizador.';render();return;}
        if(action==='export-plan'){exportPlan();return;}
        if(action==='clear-plan'&&!state.planBusy){if(plansEnabled()){requestPlanAction('new');return;}state.plan=[];markPlanChanged();state.notice='Organizador limpo.';render();return;}
        if(action==='clear-compare'){state.shortlist.clear();render();return;}
        if(action==='choose'||action==='choose-plan'){
          const offer=action==='choose-plan'?state.plan[Number(button.dataset.index)]:offers()[Number(button.dataset.index)],draft=prefill(offer);
          if(!draft){state.notice='Pesquise novamente e confira o total antes de preparar a cotação.';render();return;}
          context.onChoose?.(draft,offer);
        }
      });
    }
    render();if(state.providers===null&&!state.loadingProviders&&!state.providerError)loadProviders();if(plansEnabled()&&state.plans===null&&!state.planBusy&&!state.planError)loadPlans();
  }
  window.TravelSearch=Object.freeze({mount,canImport,prefill});
})();
