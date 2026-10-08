(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const labels = {success:'Consultado',empty:'Sem ofertas',partial:'Resposta parcial',error:'Falha na consulta',timeout:'Tempo esgotado',unconfigured:'Aguardando credencial',unsupported:'Pedido não atendido',planned:'Em preparação',budget_limited:'Limite de consultas',ready:'Disponível'};
  const bases = {stay:'Total da hospedagem',round_trip:'Ida e volta',one_way:'Somente ida',from:'Preço a partir de',unknown:'Base do preço não informada'};
  const keys = {mealPlan:'Alimentação',board:'Alimentação',cancellation:'Cancelamento',cancellationPolicy:'Cancelamento',baggage:'Bagagem',refundable:'Reembolsável',freeCancellation:'Cancelamento gratuito',roomType:'Quarto',taxes:'Taxas',payment:'Pagamento',airline:'Companhia',duration:'Duração',stops:'Conexões',rating:'Avaliação',address:'Endereço',room:'Quarto',fare:'Tarifa',departure:'Saída',arrival:'Chegada',departureTime:'Saída',arrivalTime:'Chegada'};
  const initial = () => ({category:'hotels',origin:'',destination:'',start:'',end:'',adults:2,childrenAges:'',rooms:1,flexDays:0,maxCalls:6,sort:'price'});
  // Ephemeral tab state: never saved into the customer's workspace or a public URL.
  const state = {draft:initial(),providers:null,selected:new Set(),result:null,error:'',providerError:'',loading:false,loadingProviders:false,shortlist:new Set(),filter:'',notice:''};
  let currentRoot = null, context = {};
  const safeUrl = value => {try{const u=new URL(text(value));return u.protocol==='https:'&&!u.username&&!u.password ? u.href : '';}catch{return '';}};
  const dateLabel = value => {const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'Não informado';};
  const money = price => {if(typeof price?.amount!=='number'||!Number.isFinite(price.amount)||price.amount<=0)return 'Preço não informado';if(!/^[A-Z]{3}$/.test(price.currency))return `${price.amount} · moeda não informada`;try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:price.currency}).format(price.amount);}catch{return `${price.amount} ${text(price.currency)}`;}};
  const snapshot = offer => object(offer?.requestSnapshot || offer?.request);
  const isFresh = offer => {const until=Date.parse(offer?.expiresAt);return Number.isFinite(until)&&until>Date.now();};
  function canImport(offer) {
    const r=snapshot(offer), p=object(offer?.price);
    return !!offer && offer.completeness==='complete' && !!safeUrl(offer.sourceUrl) && isFresh(offer) && p.currency==='BRL' && typeof p.amount==='number' && Number.isFinite(p.amount) && p.amount>0 && ['hotels','flights'].includes(offer.category) && r.category===offer.category && (offer.category==='hotels'?p.basis==='stay':['round_trip','one_way'].includes(p.basis)) && Number.isInteger(r.adults) && r.adults>0 && Array.isArray(r.childrenAges) && r.childrenAges.every(age=>Number.isInteger(age)&&age>=0&&age<=17) && !!r.start && !!r.destination && (offer.category==='hotels'?(!!r.end&&Number.isInteger(r.rooms)&&r.rooms>0):offer.conditions?.passengerPriceScope==='all_travelers');
  }
  function conditionRows(offer) {
    const rows=[];
    for(const part of [object(offer.conditions),object(offer.details)])for(const [key,value] of Object.entries(part)){
      if(!keys[key]||value===null||value===undefined||value==='')continue;
      const v=typeof value==='boolean'?(value?'Sim':'Não'):typeof value==='string'||typeof value==='number'?String(value):'';
      if(v)rows.push([keys[key],v]);
    }
    return rows;
  }
  const offerKey = (offer, index) => `${index}:${text(offer.id)}`;
  const offers = () => list(state.result?.offers).filter(o=>o&&typeof o==='object'&&!Array.isArray(o));
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
  const available = provider => provider.configured===true && provider.implemented!==false && list(provider.categories).includes(state.draft.category);
  function providerPanel() {
    if(state.loadingProviders)return '<p class="ts-note" role="status">Carregando fontes de pesquisa…</p>';
    if(state.providerError)return `<p class="ts-alert" role="alert">${escape(state.providerError)}</p><button class="ts-button" type="button" data-ts="reload">Tentar carregar fontes</button>`;
    const matching=list(state.providers).filter(p=>list(p.categories).includes(state.draft.category));
    return `<fieldset class="ts-providers"><legend>Onde pesquisar</legend>${matching.length?matching.map(p=>`<label class="ts-provider ${available(p)?'':'ts-unavailable'}"><input type="checkbox" name="provider" value="${escape(p.id)}" ${state.selected.has(p.id)&&available(p)?'checked':''} ${available(p)?'':'disabled'}><span><strong>${escape(p.name||p.id)}</strong><small>${escape(available(p)?'Conectado':labels[p.status]||'Aguardando ativação')}</small></span></label>`).join(''):'<p class="ts-note">Nenhuma fonte cadastrada para esta categoria.</p>'}</fieldset>${matching.some(available)?'':'<p class="ts-note">As consultas reais ficam disponíveis quando uma fonte estiver configurada. Você pode continuar criando cotações manuais abaixo.</p>'}`;
  }
  function statusPanel() {
    if(!state.result)return '';
    return `<details class="ts-status"><summary>Fontes consultadas · ${Number(state.result.summary?.callsUsed)||0} consulta(s), ${Number(state.result.summary?.cacheHits)||0} reaproveitada(s)</summary><div class="ts-status-grid">${list(state.result.providers).filter(p=>p&&typeof p==='object').map(p=>`<div><strong>${escape(p.name||p.id)}</strong><span>${escape(labels[p.status]||'Situação não informada')}${p.cached?' · resultado recente':''}</span><small>${escape(p.message||'')}${Number.isInteger(p.offerCount)?' · '+p.offerCount+' opção(ões)':''}</small></div>`).join('')}</div></details>`;
  }
  function card(offer,index) {
    const p=object(offer.price),r=snapshot(offer),key=offerKey(offer,index),url=safeUrl(offer.sourceUrl),rows=conditionRows(offer),selected=state.shortlist.has(key),fresh=isFresh(offer);
    return `<article class="ts-card ${selected?'ts-card-selected':''}" data-offer="${index}"><div class="ts-card-top"><span class="ts-source">${escape(offer.source||offer.provider||'Fonte não informada')}</span><label class="ts-compare-check"><input type="checkbox" data-ts-compare="${index}" ${selected?'checked':''}>Comparar</label></div><h3>${escape(offer.title||'Opção encontrada')}</h3><p class="ts-request-label">${escape(requestLabel(r))}</p><div class="ts-price"><strong>${escape(money(p))}</strong><span>${escape(bases[p.basis]||bases.unknown)} · ${p.taxesIncluded===true?'taxas incluídas':p.taxesIncluded===false?'taxas adicionais':'taxas não informadas'}</span></div>${offer.completeness==='selection_required'?'<p class="ts-attention">Seleção adicional necessária para conhecer o valor final.</p>':''}${offer.completeness!=='complete'&&offer.completeness!=='selection_required'?'<p class="ts-attention">Preço e condições ainda precisam ser conferidos.</p>':''}<dl class="ts-conditions">${rows.slice(0,5).map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}${!rows.length?'<div><dt>Condições</dt><dd>Não informadas pela fonte</dd></div>':''}</dl><details class="ts-details"><summary>Ver origem e detalhes</summary><p>Consultado em ${escape(dateLabel(offer.capturedAt))}${offer.cached?' · resultado reaproveitado':''}.</p><p>${fresh?'Atualizar a consulta após '+escape(dateLabel(offer.expiresAt))+'.':'Consulta vencida ou sem prazo de atualização. Pesquise novamente antes de usar o preço.'}</p>${rows.slice(5).map(([k,v])=>`<p><strong>${escape(k)}:</strong> ${escape(v)}</p>`).join('')}${list(offer.warnings).filter(w=>typeof w==='string').map(w=>`<p>${escape(w)}</p>`).join('')}<p>A fonte deve reconfirmar preço e disponibilidade. Esta pesquisa não reserva, cobra ou emite.</p></details><div class="ts-card-actions">${url?`<a class="ts-button" href="${escape(url)}" target="_blank" rel="noopener noreferrer">Conferir na fonte ↗</a>`:'<span class="ts-note">Link de origem indisponível</span>'}${canImport(offer)&&typeof context.onChoose==='function'?`<button type="button" class="ts-button ts-button-primary" data-ts="choose" data-index="${index}">Revisar cotação</button>`:''}</div>${!canImport(offer)?'<p class="ts-note ts-import-note">Confira o total, a ocupação e as taxas na fonte antes de preencher uma cotação.</p>':''}</article>`;
  }
  function comparison() {
    const selected=offers().map((o,i)=>({o,i})).filter(({o,i})=>state.shortlist.has(offerKey(o,i)));
    if(!selected.length)return '';
    const value=(o,k)=>conditionRows(o).filter(([key])=>key===k).map(([,v])=>v).join(' · ')||'Não informado';
    const rows=[['Preço',o=>money(o.price)],['Base',o=>bases[o.price?.basis]||bases.unknown],['Taxas',o=>o.price?.taxesIncluded===true?'Incluídas':o.price?.taxesIncluded===false?'Adicionais':'Não informadas'],['Pedido',o=>requestLabel(snapshot(o))],['Cancelamento',o=>value(o,'Cancelamento')],['Cancelamento gratuito',o=>value(o,'Cancelamento gratuito')],['Alimentação',o=>value(o,'Alimentação')],['Bagagem',o=>value(o,'Bagagem')],['Consultado em',o=>dateLabel(o.capturedAt)]];
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
    return `<div class="ts-result-heading"><div><h3>${offers().length} opção(ões) encontradas</h3><p>${escape(requestLabel(object(state.result.request)))}</p></div><label class="ts-field"><span>Ordenar</span><select name="result-sort"><option value="price" ${state.draft.sort==='price'?'selected':''}>Preço por base e moeda</option><option value="quality" ${state.draft.sort==='quality'?'selected':''}>Avaliação disponível</option></select></label></div><label class="ts-field ts-filter"><span>Filtrar por nome ou fonte</span><input type="search" name="result-filter" value="${escape(state.filter)}" placeholder="Encontre uma opção"></label>${list(state.result.warnings).filter(w=>typeof w==='string').map(w=>`<p class="ts-attention">${escape(w)}</p>`).join('')}${failures?'<p class="ts-attention">A pesquisa teve fontes indisponíveis ou respostas parciais. Consulte a situação de cada fonte abaixo.</p>':''}${statusPanel()}${comparison()}<div class="ts-offers">${found.map(({offer,index})=>card(offer,index)).join('')}</div>${!found.length?`<div class="ts-empty"><h3>${filter?'Nenhuma opção corresponde ao filtro.':failures?'Não foi possível completar a pesquisa.':'Nenhuma oferta recebida para este pedido.'}</h3><p>${failures?'Uma falha ou falta de acesso não significa ausência de disponibilidade.':'Experimente outras datas ou fontes.'}</p></div>`:''}`;
  }
  function render() {
    const root=currentRoot;if(!root?.isConnected)return;
    const hotels=state.draft.category==='hotels';
    root.innerHTML=`<section class="ts-workspace" aria-labelledby="ts-title"><header class="ts-heading"><div><span class="ts-eyebrow">BUSCA DE VIAGENS</span><h2 id="ts-title">Encontre a próxima viagem.</h2><p>Compare preços e condições nas fontes conectadas. Revise a escolha antes de preparar a cotação.</p></div><span class="ts-badge">Pesquisa · sem emissão</span></header><form id="travel-search-form" class="ts-form"><fieldset ${state.loading?'disabled':''}><legend class="sr-only">Pedido da viagem</legend><div class="ts-tabs" role="group" aria-label="Tipo de pesquisa">${[['hotels','Hospedagem'],['flights','Voos']].map(([value,label])=>`<button type="button" data-ts="category" data-category="${value}" aria-pressed="${state.draft.category===value}">${label}</button>`).join('')}</div><div class="ts-fields">${hotels?'':field('Origem · código IATA','origin','text','required maxlength="3" pattern="[A-Za-z]{3}" placeholder="POA" autocomplete="off"')}${field(hotels?'Destino':'Destino · código IATA','destination','text',hotels?'required maxlength="160" placeholder="Cidade, região ou hotel"':'required maxlength="3" pattern="[A-Za-z]{3}" placeholder="GRU" autocomplete="off"')}${field(hotels?'Entrada':'Ida','start','date','required')}${field(hotels?'Saída':'Volta · opcional','end','date',hotels?'required':'')}${field('Adultos','adults','number','required min="1" max="9" step="1"')}${hotels?field('Quartos','rooms','number','required min="1" max="4" step="1"'):''}${field('Idades das crianças · opcional','childrenAges','text','placeholder="Ex.: 3, 8" aria-describedby="ts-child-note"')}</div><p id="ts-child-note" class="ts-note">Informe a idade de cada criança na viagem, separada por vírgula. Sem crianças, deixe em branco.</p><details class="ts-options"><summary>Fontes e flexibilidade</summary>${providerPanel()}<div class="ts-fields ts-advanced-fields"><label class="ts-field"><span>Flexibilidade das datas</span><select name="flexDays">${[[0,'Datas exatas'],[1,'Até 1 dia antes ou depois'],[2,'Até 2 dias antes ou depois']].map(([v,label])=>`<option value="${v}" ${Number(state.draft.flexDays)===v?'selected':''}>${label}</option>`).join('')}</select></label>${field('Limite de consultas por pesquisa','maxCalls','number','required min="1" max="12" step="1"')}</div><p class="ts-note">A flexibilidade consulta variações do período dentro deste limite. Consultas podem consumir créditos das fontes contratadas.</p></details><div class="ts-submit"><button type="submit" class="ts-button ts-button-primary" ${state.loadingProviders||!list(state.providers).some(p=>available(p)&&state.selected.has(p.id))?'disabled':''}>${state.loading?'Pesquisando…':'Buscar opções'}</button><span class="ts-note">${[...state.selected].filter(id=>list(state.providers).some(p=>p.id===id&&available(p))).length} fonte(s) selecionada(s) · valores em BRL quando disponíveis</span></div>${!state.loadingProviders&&!state.providerError&&!list(state.providers).some(available)?'<p class="ts-attention">Nenhuma fonte conectada para esta categoria. Abra “Fontes e flexibilidade” para ver o que falta ativar. As cotações manuais continuam disponíveis abaixo.</p>':''}${state.providerError?'<p class="ts-attention">Não foi possível carregar as fontes. Abra “Fontes e flexibilidade” para tentar novamente.</p>':''}</fieldset></form>${state.error?`<p class="ts-alert" role="alert">${escape(state.error)}</p>`:''}<p class="ts-live-notice" role="status">${escape(state.notice)}</p><div class="ts-results">${resultPanel()}</div></section>`;
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
    if(!d.destination.trim()||!d.start||d.category==='hotels'&&(!d.end||d.end<=d.start)||d.category==='flights'&&d.end&&d.end<d.start)throw new Error('Confira o destino e as datas da viagem.');
    if(d.category==='flights'&&(!/^[a-z]{3}$/i.test(d.origin)||!/^[a-z]{3}$/i.test(d.destination)))throw new Error('Use códigos IATA de três letras para os aeroportos, como POA e GRU.');
    const providers=[...state.selected].filter(id=>list(state.providers).some(p=>p.id===id&&available(p)));
    if(!Number.isInteger(Number(d.adults))||Number(d.adults)<1||Number(d.adults)+childrenAges.length>9)throw new Error('Informe de 1 a 9 viajantes, incluindo ao menos um adulto.');
    if(d.category==='hotels'&&(!Number.isInteger(Number(d.rooms))||Number(d.rooms)<1||Number(d.rooms)>4||Number(d.rooms)>Number(d.adults)))throw new Error('Informe de 1 a 4 quartos, com pelo menos um adulto por quarto.');
    if(!Number.isInteger(Number(d.maxCalls))||Number(d.maxCalls)<1||Number(d.maxCalls)>12||![0,1,2].includes(Number(d.flexDays)))throw new Error('Revise o limite de consultas e a flexibilidade das datas.');
    if(!providers.length)throw new Error('Selecione ao menos uma fonte conectada.');
    return {category:d.category,origin:d.category==='flights'?d.origin.toUpperCase().trim():'',destination:d.category==='flights'?d.destination.toUpperCase().trim():d.destination.trim(),start:d.start,end:d.end,adults:Number(d.adults),childrenAges,rooms:d.category==='hotels'?Number(d.rooms):1,currency:'BRL',providers,flexDays:Number(d.flexDays),maxCalls:Number(d.maxCalls),sort:d.sort};
  }
  async function search(form) {
    if(state.loading)return;
    readDraft(form);state.error='';state.notice='';let body;
    try{body=payload();}catch(error){state.error=error.message;render();return;}
    state.loading=true;state.result=null;state.shortlist.clear();state.filter='';render();
    try{
      const result=await context.api.request('/travel-search',{method:'POST',body,signal:AbortSignal.timeout(45000)});
      if(!result||!Array.isArray(result.offers)||!Array.isArray(result.providers)||!result.request)throw new Error('A resposta da pesquisa veio incompleta. Tente novamente.');
      state.result=result;
    }catch(error){state.error=text(error?.message)||'Não foi possível consultar as fontes. Tente novamente.';}
    finally{state.loading=false;render();}
  }
  async function loadProviders() {
    if(state.loadingProviders)return;state.loadingProviders=true;state.providerError='';render();
    try{
      const response=await context.api.request('/travel-search/providers');
      if(!response||!Array.isArray(response.providers))throw new Error('Não foi possível carregar a lista de fontes.');
      state.providers=response.providers.filter(p=>p&&typeof p.id==='string'&&Array.isArray(p.categories));
      state.selected=new Set(state.providers.filter(available).map(p=>p.id));
    }catch(error){state.providerError=text(error?.message)||'Não foi possível carregar as fontes.';}
    finally{state.loadingProviders=false;render();}
  }
  function mount(root,ctx={}) {
    if(!root)return;currentRoot=root;context=ctx;
    if(!root.dataset.travelSearchBound){
      root.dataset.travelSearchBound='true';
      root.addEventListener('submit',event=>{if(event.target.id==='travel-search-form'){event.preventDefault();event.stopPropagation();search(event.target);}});
      root.addEventListener('input',event=>{
        if(event.target.name==='result-filter'){
          const position=event.target.selectionStart;state.filter=event.target.value;render();const el=root.querySelector('[name="result-filter"]');el?.focus();try{el?.setSelectionRange(position,position);}catch{}return;
        }
        if(event.target.closest('#travel-search-form'))readDraft(root.querySelector('form'));
      });
      root.addEventListener('change',event=>{
        if(event.target.name==='result-sort'){state.draft.sort=event.target.value;render();return;}
        if(event.target.matches('[data-ts-compare]')){
          const index=Number(event.target.dataset.tsCompare),offer=offers()[index];if(!offer)return;
          const key=offerKey(offer,index);if(event.target.checked&&state.shortlist.size>=3){event.target.checked=false;state.notice='Selecione até três opções para comparar.';}else{event.target.checked?state.shortlist.add(key):state.shortlist.delete(key);state.notice='';}render();return;
        }
        if(event.target.closest('#travel-search-form')){readDraft(root.querySelector('form'));if(event.target.name==='provider')render();}
      });
      root.addEventListener('click',event=>{
        const button=event.target.closest('[data-ts]');if(!button)return;const action=button.dataset.ts;
        if(action==='reload'){loadProviders();return;}
        if(action==='category'&&!state.loading){readDraft(root.querySelector('form'));state.draft.category=button.dataset.category;state.draft.destination='';state.result=null;state.shortlist.clear();state.filter='';state.notice='';state.selected=new Set(list(state.providers).filter(available).map(p=>p.id));state.error='';render();return;}
        if(action==='clear-compare'){state.shortlist.clear();render();return;}
        if(action==='choose'){
          const offer=offers()[Number(button.dataset.index)],draft=prefill(offer);
          if(!draft){state.notice='Pesquise novamente e confira o total antes de preparar a cotação.';render();return;}
          context.onChoose?.(draft,offer);
        }
      });
    }
    render();if(state.providers===null&&!state.loadingProviders&&!state.providerError)loadProviders();
  }
  window.TravelSearch=Object.freeze({mount,canImport,prefill});
})();
