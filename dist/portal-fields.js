(() => {
  'use strict';
  const formatted=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  function parse(value){const s=String(value).replace(/R\$/g,'').replace(/\s/g,'');if(!s)return '';if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{0,2})?$/.test(s))return null;const n=Number(s.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
  function enhance(root=document){
    root.querySelectorAll('input[type=number]:not([data-refined])').forEach(input=>{
      if(!/^(amount|openingAmount|value|discount|unit\d*|budget|price|cost|total|fees|taxes)$/i.test(input.name))return;
      input.dataset.refined='true';if(!input.getAttribute('step'))input.step='0.01';const field=document.createElement('span');field.className='portal-currency';
      const prefix=document.createElement('span');prefix.textContent='R$';prefix.setAttribute('aria-hidden','true');
      const visible=document.createElement('input');visible.type='text';visible.inputMode='decimal';visible.autocomplete='off';visible.required=input.required;visible.disabled=input.disabled;visible.readOnly=input.readOnly;visible.value=input.value===''?'':formatted(input.value);visible.setAttribute('aria-label',input.closest('label')?.querySelector('span')?.textContent||input.closest('label')?.textContent?.trim()||'Valor em reais');
      field.append(prefix,visible);input.before(field);input.hidden=true;input.tabIndex=-1;
      function sync(){const value=parse(visible.value);visible.setCustomValidity(value===null?'Informe um valor em reais, por exemplo 1.250,50.':'');input.value=value===null?'':String(value);if(value!==null&&!input.checkValidity())visible.setCustomValidity(input.validationMessage);input.dispatchEvent(new Event('input',{bubbles:true}));}
      visible.addEventListener('input',sync);visible.addEventListener('blur',()=>{sync();const value=parse(visible.value);if(value!==null&&value!=='')visible.value=formatted(value);input.dispatchEvent(new Event('change',{bubbles:true}));});
    });
    root.querySelectorAll('select:not([data-searchable])').forEach(select=>{
      if(select.options.length<9||!['client','trip','template','categoryId','accountId','counterpartyId','type','documentType'].includes(select.name))return;
      select.dataset.searchable='true';select.setAttribute('aria-label',select.closest('label')?.querySelector('span')?.textContent||select.name);const search=document.createElement('input');search.type='search';search.className='select-search';search.placeholder='Digite para filtrar opções';search.setAttribute('aria-label','Filtrar '+(select.closest('label')?.querySelector('span')?.textContent||'opções'));select.before(search);
      search.addEventListener('input',()=>{const q=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();for(const option of select.options)option.hidden=!!q&&!option.selected&&!option.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q);});
    });
    root.querySelectorAll('input[type=date]').forEach(el=>el.lang='pt-BR');
    root.querySelectorAll('input[type=email]').forEach(el=>{el.autocomplete='email';el.inputMode='email';});
    root.querySelectorAll('input[type=tel]').forEach(el=>{el.autocomplete='tel';el.inputMode='tel';});
  }
  window.TravelFields=Object.freeze({enhance,parse});
  let queued=false;new MutationObserver(records=>{if(queued||!records.some(r=>r.addedNodes.length))return;queued=true;queueMicrotask(()=>{queued=false;enhance();});}).observe(document.body,{childList:true,subtree:true});enhance();
})();
