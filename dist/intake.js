(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const blank=()=>({name:'',phone:'',email:'',destination:'',start:'',end:'',travelers:null,notes:''});
  let host,context,text='',image=null,preview='',review=null,busy=false,error='',notice='',epoch=0,requestId='',submission=null;
  const uuid=()=>crypto.randomUUID();
  const configured=()=>context?.services?.some(s=>s.service==='openai'&&s.configured);
  function clearImage(){if(preview)URL.revokeObjectURL(preview);preview='';image=null;}
  function field(label,name,value,type='text',extra=''){return `<label><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function render(){
    if(!host?.isConnected)return;
    host.innerHTML=`<section class="intake-card" aria-labelledby="intake-title"><div class="intake-heading"><div><span class="intake-eyebrow">COS · DO PEDIDO À AÇÃO</span><h2 id="intake-title">O que chegou para sua agência?</h2><p>Cole uma conversa ou um print. Confira o que o COS entendeu e escolha o próximo passo.</p></div><span class="intake-symbol" aria-hidden="true">✳</span></div><div class="intake-source"><textarea id="intake-text" aria-label="Conversa ou pedido para organizar" maxlength="12000" rows="3" placeholder="Ex.: a cliente quer viajar para Portugal em novembro, com duas pessoas…" ${busy||submission?'disabled':''}>${esc(text)}</textarea>${image?`<div class="intake-attachment"><img src="${esc(preview)}" alt="Print selecionado para análise"><span>${esc(image.name)}</span><button type="button" data-intake="remove-image" ${busy||submission?'disabled':''}>Remover</button></div>`:''}<input id="intake-image" type="file" accept="image/png,image/jpeg,image/webp" hidden><div class="intake-source-actions"><button type="button" class="outline-button" data-intake="attach" ${busy||submission?'disabled':''}>Anexar print</button><span>PNG, JPG ou WebP · até 3 MB</span><button type="button" class="primary-button" data-intake="analyze" ${busy||submission?'disabled':''}>${busy&&!submission?'Lendo o material…':'Identificar informações'}</button></div></div><p class="intake-disclosure">Ao analisar, o conteúdo é enviado à IA do TravelPro. Nenhum cadastro é criado nesta etapa.</p>${!configured()?'<p class="intake-availability">IA não conectada neste ambiente. O botão verifica a conexão atual e informa o resultado. Você também pode <button type="button" data-intake="manual">organizar o pedido manualmente</button>.</p>':''}${error?`<p class="intake-error" role="alert">${esc(error)}</p>`:''}${notice?`<p class="intake-notice" role="status">${esc(notice)}</p>`:''}<div id="intake-review">${review?reviewView():''}</div></section>`;
  }
  function reviewView(){
    const d=review.draft;
    return `<form id="intake-review-form"><div class="intake-review-heading"><span class="intake-eyebrow">${review.mode==='ai'?'INFORMAÇÕES IDENTIFICADAS':'REVISÃO MANUAL'}</span><h3>Confira antes de criar</h3><p>${esc(review.summary)}</p></div>${review.warnings?.length?`<ul class="intake-warnings">${review.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}<fieldset ${busy||submission?'disabled':''}><div class="intake-review-grid"><label><span>Vincular a um cliente</span><select name="clientId"><option value="">Criar novo cliente</option>${(context.clients||[]).map(c=>`<option value="${esc(c.id)}" ${review.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="intake-existing" ${review.clientId?'':'hidden'}>O cadastro existente será preservado. As informações da viagem entram no novo atendimento.</div></div><div class="intake-review-grid intake-new-client" ${review.clientId?'hidden':''}>${field('Nome do cliente','name',d.name,'text',review.clientId?'disabled':'required maxlength="150"')}${field('Telefone / WhatsApp','phone',d.phone,'tel','maxlength="40"'+(review.clientId?' disabled':''))}${field('E-mail','email',d.email,'email','maxlength="254"'+(review.clientId?' disabled':''))}</div><div class="intake-review-grid">${field('Destino','destination',d.destination,'text','placeholder="A confirmar" maxlength="200"')}${field('Viajantes','travelers',d.travelers??'','number','min="1" max="100" placeholder="A confirmar"')}</div><details class="intake-details" ${d.start||d.end?'open':''}><summary>Datas e observações</summary><div class="intake-review-grid">${field('Embarque','start',d.start,'date')}${field('Retorno','end',d.end,'date')}</div><label><span>Pedido e preferências</span><textarea name="notes" rows="3" maxlength="6000">${esc(d.notes)}</textarea></label></details><label class="intake-operation"><span>O que o COS deve fazer?</span><select name="action"><option value="attendance" ${review.action!=='client'?'selected':''}>${review.clientId?'Criar atendimento para este cliente':'Cadastrar cliente e criar atendimento'}</option><option value="client" ${review.action==='client'?'selected':''}>${review.clientId?'Usar apenas este cadastro':'Cadastrar apenas o cliente'}</option></select></label></fieldset><div class="intake-review-footer"><p>Datas e viajantes não informados ficam a confirmar. Reservas, cobranças e mensagens não são executadas aqui.</p><button type="button" class="text-button" data-intake="cancel" ${busy||submission?'disabled':''}>Descartar revisão</button><button type="submit" class="primary-button" ${busy?'disabled':''}>${busy?'Criando…':submission?'Tentar confirmar novamente':'Confirmar e executar'}</button></div>${submission&&!busy?'<p class="intake-disclosure">A resposta anterior não foi confirmada. A tentativa mantém a mesma operação para evitar duplicações.</p>':''}</form>`;
  }
  function readReview(){
    const form=host.querySelector('#intake-review-form');if(!form||!review)return;
    const values=Object.fromEntries(new FormData(form));
    for(const name of Object.keys(blank()))if(name in values)review.draft[name]=name==='travelers'?(values[name]===''?null:Number(values[name])):values[name];
    review.clientId=values.clientId||'';review.action=values.action||'attendance';
  }
  async function selectImage(file){
    if(busy||submission||!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){error='Escolha um print PNG, JPG ou WebP de até 3 MB.';render();return;}
    const token=++epoch;busy=true;error='';render();
    try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Não foi possível abrir o print.'));reader.readAsDataURL(file);});if(token!==epoch)return;clearImage();image={name:file.name,mime:file.type,base64};preview=URL.createObjectURL(file);review=null;requestId='';notice='';}
    catch(e){error=e.message;}finally{busy=false;render();}
  }
  async function analyze(){
    if(busy||submission)return;readReview();error='';notice='';
    if(!text.trim()&&!image){error='Cole uma conversa ou adicione um print para começar.';render();return;}
    // The server is authoritative: configuration may have changed while this draft was open.
    busy=true;review=null;render();
    try{const result=await context.api.request('/cos/intake/analyze',{method:'POST',body:{text,image:image||undefined}});review={...result,clientId:'',action:'attendance'};requestId=uuid();}
    catch(e){error=e.message;}finally{busy=false;render();host.querySelector('#intake-review-form input')?.focus();}
  }
  async function execute(event){
    event.preventDefault();if(busy)return;
    if(!submission){readReview();if(!event.target.reportValidity())return;const draft={...review.draft};if(review.clientId)for(const key of ['name','phone','email'])draft[key]='';submission={requestId:requestId||uuid(),action:review.action,clientId:review.clientId,draft};}
    busy=true;error='';render();
    try{const result=await context.onExecute(submission);submission=null;review=null;text='';clearImage();requestId='';notice=result.replayed?'Esta operação já estava concluída. Nenhum registro foi duplicado.':'Pronto. As informações revisadas foram salvas.';busy=false;render();context.onOpen(result);}
    catch(e){error=e.message;if([400,403,409,422].includes(e.status))submission=null;busy=false;render();}
  }
  function bind(){
    host.addEventListener('input',e=>{if(e.target.id==='intake-text'){text=e.target.value;review=null;requestId='';notice='';host.querySelector('#intake-review').innerHTML='';}else if(e.target.closest('#intake-review-form'))readReview();});
    host.addEventListener('change',e=>{if(e.target.id==='intake-image'){selectImage(e.target.files[0]);return;}if(e.target.name==='clientId'){readReview();render();host.querySelector('[name="clientId"]')?.focus();}});
    host.addEventListener('paste',e=>{if(e.target.id!=='intake-text'||busy||submission)return;const file=[...e.clipboardData?.items||[]].find(item=>item.type.startsWith('image/'))?.getAsFile();if(file){e.preventDefault();selectImage(file);}});
    host.addEventListener('click',e=>{const action=e.target.closest('[data-intake]')?.dataset.intake;if(!action||busy||submission)return;if(action==='attach')host.querySelector('#intake-image').click();if(action==='remove-image'){clearImage();review=null;render();}if(action==='analyze')analyze();if(action==='manual'){review={draft:{...blank(),notes:text.length>6000?'':text},mode:'manual',summary:'Preencha apenas o que sabe. Nenhuma informação foi extraída automaticamente.',warnings:text.length>6000?['A conversa completa continua acima. Resuma o pedido em até 6.000 caracteres no campo de observações.']:[],clientId:'',action:'attendance'};error='';requestId=uuid();render();}if(action==='cancel'){review=null;error='';render();}});
    host.addEventListener('submit',e=>{if(e.target.id==='intake-review-form')execute(e);});
  }
  window.TravelIntake={mount(element,ctx){context=ctx;if(host!==element){host=element;bind();}render();},loadReview(value){if(busy||submission)return;clearImage();text='';error='';review={...structuredClone(value),clientId:'',action:'attendance'};requestId=uuid();render();},isEditing(){return busy||!!review||!!text||!!image;},focus(){host?.querySelector('#intake-text')?.focus();}};
})();
