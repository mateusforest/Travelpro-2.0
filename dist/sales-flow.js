/* Shared, side-effect-free business rules; usable by the portal and server validation. */
(() => {
  const reject = message => {throw Object.assign(new Error(message), {status:422});};
  const text = (v, max=6000) => typeof v === 'string' && v.length <= max;
  const date = v => {try{return /^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}catch{return false;}};
  const deadline = v => date(v)||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v)&&date(v.slice(0,10))&&Number.isFinite(Date.parse(v));
  function expired(value,now=Date.now()) {if(!value)return true;return date(value)?now>new Date(value+'T23:59:59.999').getTime():now>=Date.parse(value);}
  const cents = v => Math.round(v*100);
  function normalizeDetails(value,total) {
    if(!value||typeof value!=='object'||Array.isArray(value))reject('Detalhes da viagem inválidos.');
    const out={services:[],paymentTerms:[]};
    if(value.services!==undefined){if(!Array.isArray(value.services)||value.services.length>30)reject('Confira os detalhes dos serviços.');out.services=value.services.map(s=>{if(!s||!['stay','flight','transfer','other'].includes(s.kind)||!text(s.title,200)||!s.title.trim()||!Array.isArray(s.lines)||s.lines.length>40||s.lines.some(x=>!text(x,1500)))reject('Confira os detalhes do serviço.');return {kind:s.kind,title:s.title,lines:[...s.lines]};});}
    if(value.paymentTerms!==undefined){if(!Array.isArray(value.paymentTerms)||value.paymentTerms.length>20||value.paymentTerms.some(x=>!text(x,1500)))reject('Condições de pagamento inválidas.');out.paymentTerms=[...value.paymentTerms];}
    if(value.price){const p=value.price;if(['products','fees','taxes'].some(k=>typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0||p[k]>100000000))reject('Confira produtos, taxas e impostos.');out.price={products:p.products,fees:p.fees,taxes:p.taxes};if(total!==undefined&&cents(p.products)+cents(p.fees)+cents(p.taxes)!==cents(total))reject('Produtos, taxas e impostos não fecham com o total.');}
    return out;
  }
  function normalizeQuote(input) {
    if(!input||input.currency!=='BRL'||!Array.isArray(input.offers)||!input.offers.length||input.offers.length>30)reject('A cotação precisa de ofertas em reais.');
    const validUntil=input.validUntil||'';
    if(validUntil&&!deadline(validUntil))reject('A validade precisa de data válida e, se houver horário, fuso horário.');
    return {currency:'BRL',validUntil,reference:String(input.reference||'').slice(0,150),offers:input.offers.map(o=>{
      if(!text(o.name,200)||!o.name.trim()||typeof o.total!=='number'||!Number.isFinite(o.total)||o.total<0||o.total>100000000||!Array.isArray(o.inclusions)||o.inclusions.length>100||o.inclusions.some(v=>!text(v,2000)))reject('Confira valores e inclusões da cotação.');
      let items;
      if(o.items!==undefined){if(!Array.isArray(o.items)||!o.items.length||o.items.length>100)reject('Serviços da cotação inválidos.');items=o.items.map(i=>{if(!text(i.name,300)||!i.name.trim()||!Number.isInteger(i.qty)||i.qty<1||i.qty>10000||typeof i.unit!=='number'||!Number.isFinite(i.unit)||i.unit<0)reject('Serviço da cotação inválido.');return {name:i.name,qty:i.qty,unit:i.unit};});if(items.reduce((n,i)=>n+i.qty*cents(i.unit),0)!==cents(o.total))reject('Os serviços não fecham com o total da operadora.');}
      if(o.terms!==undefined&&!text(o.terms,6000))reject('Condições da cotação inválidas.');
      return {id:String(o.id||'').slice(0,150),name:o.name,total:o.total,inclusions:[...o.inclusions],terms:o.terms||'',description:text(o.description,2000)?o.description:'',...(items?{items}:{}),...(o.details?{details:normalizeDetails(o.details,o.total)}:{})};
    })};
  }
  const selected = t => t.sales?.quotes?.find(q=>q.id===t.sales.quoteId);
  const currentBudget = (t,budgets) => budgets.find(b=>b.id===t.sales?.budgetId&&b.trip===t.id);
  const canItinerary = t => t?.sales?.fulfillment?.reservation==='confirmed'&&t.sales.fulfillment.payment==='paid'&&t.sales.fulfillment.emission==='issued';
  function buildBudget(t,quote,offerIndex,id,now=Date.now()) {
    if(!quote||quote.trip!==t.id||quote.client!==t.client)reject('Selecione uma cotação deste atendimento.');
    const q=normalizeQuote(quote),o=q.offers[offerIndex];if(!o)reject('Oferta não encontrada.');
    if(!q.validUntil)reject('Confira e registre a validade na cotação original antes de preparar a proposta.');
    if(expired(q.validUntil,now))reject('Esta cotação venceu. Atualize os valores com a operadora antes de preparar a proposta.');
    if(!date(quote.start)||!date(quote.end)||quote.end<quote.start||!Number.isInteger(quote.travelers)||quote.travelers<1)reject('Complete datas e viajantes na cotação.');
    return {id,trip:t.id,client:t.client,name:t.title,destination:quote.destination,start:quote.start,end:quote.end,travelers:quote.travelers,valid:q.validUntil.slice(0,10),validUntil:q.validUntil,quoteId:quote.id,offerIndex,status:'Rascunho',discount:0,items:o.items?structuredClone(o.items):[{name:o.name,qty:1,unit:o.total}],inclusions:[...o.inclusions],notes:o.terms,source:quote.source,sourceReference:q.reference,introduction:'',badge:'',appearance:'classic',decisionHistory:[],...(o.details?{details:structuredClone(o.details)}:{})};
  }
  function recordDecision(t,b,event,note='',now=Date.now()) {
    if(!b||b.trip!==t.id)reject('Proposta não encontrada neste atendimento.');
    const statuses={sent:'Aguardando aprovação',adjustment:'Ajuste solicitado',approved:'Aprovada'};
    if(!statuses[event])reject('Etapa inválida.');
    if(t.sales?.fulfillment&&(t.sales.fulfillment.reservation!=='pending'||t.sales.fulfillment.payment!=='pending'||t.sales.fulfillment.emission!=='pending'))reject('Esta viagem já tem uma reserva em andamento. Confira a operação antes de alterar a proposta.');
    if(event!=='sent'&&b.status!=='Aguardando aprovação')reject('Registre primeiro o envio desta versão ao cliente.');
    if(event!=='adjustment'&&expired(b.validUntil||b.valid,now))reject('A cotação venceu. Atualize a proposta antes de continuar.');
    if(!note.trim())reject('Registre a confirmação ou o canal usado para esta etapa.');
    b.status=statuses[event];b.decisionHistory||=[];b.decisionHistory.push({event,note:note.slice(0,2000),at:new Date(now).toISOString(),source:'agency'});
    t.sales||={quotes:[]};t.sales.budgetId=b.id;t.status=event==='approved'?'Em reserva':event==='adjustment'?'Ajuste solicitado':'Proposta enviada';
    if(event==='approved')t.value=(b.items.reduce((sum,i)=>sum+i.qty*cents(i.unit),0)-cents(b.discount))/100;
  }
  function recordFulfillment(t,b,input,now=Date.now()) {
    if(b?.status!=='Aprovada'||b.trip!==t.id)reject('Registre a aprovação da proposta antes da reserva.');
    if(!['pending','held','confirmed'].includes(input.reservation)||!['pending','paid'].includes(input.payment)||!['pending','issued'].includes(input.emission))reject('Situação da operadora inválida.');
    if(!text(input.reference,150)||!text(input.evidence,2000)||!input.evidence.trim())reject('Registre a referência e a confirmação consultada na operadora.');
    if((input.reservation!=='pending'||input.payment==='paid'||input.emission==='issued')&&!input.reference.trim())reject('Informe o localizador ou a referência da reserva.');
    if(input.deadline&&!deadline(input.deadline))reject('Prazo de emissão inválido.');
    if(input.reservation==='held'&&!input.deadline)reject('Informe o prazo da reserva provisória.');
    if(input.emission==='issued'&&(input.reservation!=='confirmed'||input.payment!=='paid'))reject('Confirme reserva e pagamento antes de registrar a emissão.');
    let paymentUrl='';if(input.paymentUrl){try{const u=new URL(input.paymentUrl);if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||!u.hostname.includes('.'))throw Error();paymentUrl=u.href;}catch{reject('Use o link HTTPS de pagamento fornecido pela operadora.');}}
    if(input.reservation==='confirmed'&&!t.sales.confirmedAt)t.sales.confirmedAt=new Date(now).toISOString();
    t.sales.fulfillment={reservation:input.reservation,payment:input.payment,emission:input.emission,reference:input.reference,deadline:input.deadline||'',paymentUrl,evidence:input.evidence,source:'agency',updatedAt:new Date(now).toISOString()};
    t.status=canItinerary(t)?'Confirmada':input.payment==='paid'?'Aguardando emissão':input.reservation!=='pending'?'Aguardando pagamento':'Em reserva';
  }
  function validateState(s) {
    for(const t of s.trips){if(!t.sales)continue;const x=t.sales;if(!Array.isArray(x.quotes)||x.quotes.length>200)reject('Histórico de cotações inválido.');const ids=new Set();for(const q of x.quotes){if(!text(q.id,100)||!q.id||ids.has(q.id)||q.trip!==t.id||q.client!==t.client||!['operator','manual'].includes(q.source))reject('Cotação vinculada incorretamente.');ids.add(q.id);normalizeQuote(q);}if(x.quoteId&&!ids.has(x.quoteId))reject('Cotação selecionada não encontrada.');if(x.budgetId&&!s.budgets.some(b=>b.id===x.budgetId&&b.trip===t.id&&b.client===t.client))reject('Proposta vinculada incorretamente.');if(x.fulfillment){const copy=structuredClone(t);recordFulfillment(copy,currentBudget(t,s.budgets),x.fulfillment);}}
    for(const b of s.budgets){if(b.details)normalizeDetails(b.details);if(!b.quoteId)continue;const t=s.trips.find(t=>t.id===b.trip);if(!t||t.client!==b.client||!t.sales?.quotes.some(q=>q.id===b.quoteId)||!deadline(b.validUntil)||!text(b.introduction||'',6000)||!text(b.badge||'',60)||!['classic','warm'].includes(b.appearance||'classic')||!Array.isArray(b.inclusions)||b.inclusions.some(v=>!text(v,2000)))reject('Proposta de cotação inválida.');}
  }
  globalThis.TravelSalesFlow={normalizeDetails,normalizeQuote,selected,currentBudget,canItinerary,buildBudget,recordDecision,recordFulfillment,validateState,expired,date,deadline};
})();
