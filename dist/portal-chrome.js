(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const glyph=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const calcIcon=glyph('M5 3h14v18H5zM8 6h8v3H8zM8 13h1m6 0h1M8 17h1m6 0h1');
  const cities={us:[['America/New_York','Nova York'],['America/Chicago','Chicago'],['America/Los_Angeles','Los Angeles']],eu:[['Europe/Lisbon','Lisboa'],['Europe/Paris','Paris'],['Europe/London','Londres'],['Europe/Rome','Roma'],['Europe/Madrid','Madri']]};
  const preferences={us:'America/New_York',eu:'Europe/Lisbon'};
  try {const stored=JSON.parse(localStorage.getItem('travelpro-clock-zones')||'{}');for(const key of ['us','eu'])if(cities[key].some(([zone])=>zone===stored[key]))preferences[key]=stored[key];}catch{}
  const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Sao_Paulo';
  let data=null,loading=false,lastAttempt=0;
  function currency(value,code='BRL'){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:code}).format(value);}
  function parseAmount(value){
    const clean=String(value).trim();
    if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean))return null;
    const n=Number(clean.replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n)&&n>=0&&n<=1e12?n:null;
  }
  function convert(amount,from,to,rates){return amount*rates[from]/rates[to];}
  function clockLabel(zone,now=new Date()) {return new Intl.DateTimeFormat('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);}
  function tick(){
    const now=new Date();
    const date=$('#header-date');
    if(date){
      date.textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:localZone}).format(now);
      date.dateTime=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
      date.title=new Intl.DateTimeFormat('pt-BR',{dateStyle:'full',timeZone:localZone}).format(now);
    }
    for(const [key,zone] of [['local',localZone],['us',preferences.us],['eu',preferences.eu]]){
      const node=$(`[data-clock="${key}"]`);if(!node)continue;
      node.querySelector('time').textContent=clockLabel(zone,now);
      const label=key==='local'?'Local':cities[key].find(([id])=>id===zone)[1];
      node.querySelector('small').textContent=label;
      node.title=`${key==='us'?'EUA · ':key==='eu'?'Europa · ':''}${zone} · ${new Intl.DateTimeFormat('pt-BR',{timeZone:zone,dateStyle:'full'}).format(now)}`;
    }
  }
  const dateLabel=value=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'—';
  function validPayload(value){return value&&value.rates?.BRL===1&&['USD','EUR'].every(c=>Number.isFinite(value.rates[c])&&value.rates[c]>0&&/^\d{4}-\d{2}-\d{2}$/.test(value.dates?.[c]||'')&&Number.isFinite(Date.parse(value.dates[c])));}
  function paintRates(){
    for(const code of ['USD','EUR']){
      const node=$(`[data-fx="${code}"]`);if(!node)continue;
      node.querySelector('strong').textContent=data?currency(data.rates[code]):loading?'…':'—';
      node.title=data?`1 ${code} em reais · referência ${dateLabel(data.dates[code])} · Frankfurter${data.stale?' · última consulta disponível':''}`:'Cotação indisponível';
    }
    const status=$('#fx-source');
    if(status)status.textContent=data?`${data.stale?'Sem atualização agora. Última referência disponível: ':'Referência diária: '}USD ${dateLabel(data.dates.USD)} · EUR ${dateLabel(data.dates.EUR)}. Fonte: Frankfurter.`:loading?'Consultando cotações…':'Não foi possível consultar as cotações. Tente atualizar em alguns minutos.';
    const note=$('.market-note');if(note)note.textContent=data?(data.stale?'Última referência':'Câmbio ref.'):'Câmbio';
    const refresh=$('#fx-refresh');if(refresh){refresh.disabled=loading;refresh.textContent=loading?'Atualizando…':'Atualizar cotações';}
    calculate();
  }
  async function loadRates(){
    if(loading)return;loading=true;lastAttempt=Date.now();paintRates();
    try{
      const response=await fetch('/api/exchange',{credentials:'same-origin',headers:{'X-TravelPro-Background':'1'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Câmbio indisponível');
      const next=await response.json();if(!validPayload(next))throw Error('Câmbio inválido');data=next;
    }catch{if(data)data={...data,stale:true};}finally{loading=false;paintRates();}
  }
  function calculate(){
    const amount=$('#fx-amount');if(!amount)return;
    const parsed=parseAmount(amount.value),from=$('#fx-from').value,to=$('#fx-to').value;
    const result=$('#fx-result'),detail=$('#fx-equation');
    const valid=parsed!==null;amount.setAttribute('aria-invalid',String(!valid));
    $('#fx-error').textContent=valid?'':'Informe um valor válido, como 1.250,50.';
    if(!valid){result.textContent='—';detail.textContent='';return;}
    if(!data&&from!==to){result.textContent='—';detail.textContent='Aguardando uma cotação disponível.';return;}
    const rates=data?.rates||{BRL:1,USD:1,EUR:1};
    result.textContent=currency(convert(parsed,from,to,rates),to);
    detail.textContent=`1 ${from} = ${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6}).format(rates[from]/rates[to])} ${to}`;
  }
  function mount(){
    const header=$('.portal-header');if(!header||$('#market-tools'))return;
    const logo=header.querySelector('.travelpro-brand img');if(logo){logo.src='assets/travelpro-wordmark-white.png';logo.width=2172;logo.height=724;}
    const breadcrumbs=$('#breadcrumbs');
    if(breadcrumbs){
      const location=document.createElement('div');location.className='header-location';
      breadcrumbs.before(location);location.append(breadcrumbs);
      const date=document.createElement('time');date.id='header-date';location.append(date);
    }
    const tools=document.createElement('div');tools.id='market-tools';tools.setAttribute('aria-label','Câmbio de referência e horários');
    tools.innerHTML=`<div class="market-rates"><span class="market-note">Câmbio</span>${['USD','EUR'].map(code=>`<div data-fx="${code}"><small>${code==='USD'?'Dólar':'Euro'}</small><strong>…</strong></div>`).join('')}</div><div class="market-clocks">${['local','us','eu'].map(key=>`<div data-clock="${key}"><small></small><time>--:--</time></div>`).join('')}</div><button type="button" class="market-calculator" aria-label="Abrir calculadora de câmbio e fusos horários" aria-haspopup="dialog" title="Calculadora de câmbio">${calcIcon}</button>`;
    header.insertBefore(tools,header.querySelector('.header-end'));
    const footer=document.createElement('footer');footer.className='portal-partners';footer.setAttribute('aria-label','Tecnologia e operadora');
    footer.innerHTML='<span><span class="partner-emblem"><img src="assets/travelpro-tp-orange.png" width="36" height="36" alt=""></span><span class="partner-caption">Tecnologia<b>TravelPro</b></span></span><span><span class="partner-emblem"><img src="assets/europlus-symbol.png" width="36" height="36" alt=""></span><span class="partner-caption">Operadora<b>Europlus</b></span></span>';
    $('#portal-main').after(footer);
    const dialog=document.createElement('dialog');dialog.id='exchange-dialog';dialog.setAttribute('aria-labelledby','exchange-title');
    dialog.innerHTML=`<div class="exchange-heading"><div><span class="eyebrow">FERRAMENTAS DA AGÊNCIA</span><h2 id="exchange-title">Calculadora de câmbio</h2></div><button type="button" class="icon-button" id="fx-close" aria-label="Fechar calculadora">${glyph('M6 6l12 12M18 6 6 18')}</button></div><p class="exchange-intro">Converta valores entre real, dólar e euro.</p><label class="fx-amount-label" for="fx-amount">Valor para converter</label><input id="fx-amount" type="text" inputmode="decimal" autocomplete="off" value="1.000,00" aria-describedby="fx-error" maxlength="22"><p id="fx-error" class="fx-error" role="status"></p><div class="fx-currencies"><label>De<select id="fx-from"><option value="USD">USD · Dólar</option><option value="EUR">EUR · Euro</option><option value="BRL">BRL · Real</option></select></label><button type="button" id="fx-swap" class="icon-button" aria-label="Inverter moedas">${glyph('M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4')}</button><label>Para<select id="fx-to"><option value="BRL">BRL · Real</option><option value="USD">USD · Dólar</option><option value="EUR">EUR · Euro</option></select></label></div><div class="fx-result-card"><span>Valor estimado</span><output id="fx-result" aria-live="polite">—</output><small id="fx-equation"></small></div><p id="fx-source" role="status"></p><p class="fx-disclaimer">Referência para planejamento, sem IOF, spread ou tarifas. A taxa final depende da operadora ou instituição de câmbio.</p><button type="button" class="outline-button" id="fx-refresh">Atualizar cotações</button><details class="clock-preferences"><summary>Horários no cabeçalho</summary><p>Local: ${localZone.replaceAll('_',' ')}. Os relógios acompanham o horário de verão de cada cidade.</p><div>${['us','eu'].map(key=>`<label>${key==='us'?'Estados Unidos':'Europa'}<select data-zone="${key}">${cities[key].map(([zone,label])=>`<option value="${zone}" ${zone===preferences[key]?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}</div></details>`;
    document.body.append(dialog);
    tools.querySelector('button').addEventListener('click',()=>{if(!dialog.open)dialog.showModal();tick();paintRates();if(!data&&Date.now()-lastAttempt>15000)loadRates();});
    $('#fx-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>tools.querySelector('button').focus());
    $('#fx-amount').addEventListener('input',calculate);
    $('#fx-amount').addEventListener('blur',e=>{const value=parseAmount(e.target.value);if(value!==null)e.target.value=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);});
    for(const id of ['fx-from','fx-to'])$('#'+id).addEventListener('change',calculate);
    $('#fx-swap').addEventListener('click',()=>{const from=$('#fx-from'),to=$('#fx-to');[from.value,to.value]=[to.value,from.value];calculate();});
    $('#fx-refresh').addEventListener('click',loadRates);
    dialog.querySelectorAll('[data-zone]').forEach(select=>select.addEventListener('change',()=>{preferences[select.dataset.zone]=select.value;try{localStorage.setItem('travelpro-clock-zones',JSON.stringify(preferences));}catch{}tick();}));
    tick();loadRates();
    setInterval(()=>{if(!document.hidden)tick();},15000);
    setInterval(()=>{if(!document.hidden)loadRates();},30*60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(Date.now()-lastAttempt>30*60000)loadRates();}});
  }
  globalThis.TravelChrome=Object.freeze({mount,parseAmount,convert,clockLabel});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
