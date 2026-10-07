const steps = [
  {label:'01 / ATENDIMENTO',title:'Uma conversa. Um próximo passo.',copy:'O pedido vira um atendimento com contexto. A agência confere os dados e decide o que fazer em seguida.',tag:'PEDIDO ORGANIZADO',name:'Itália · Viagem em casal',summary:'Datas a confirmar · Preferência por arte e gastronomia · Próximo passo: preparar cotação.'},
  {label:'02 / PROPOSTA',title:'O destino merece uma boa apresentação.',copy:'A cotação é a base. A proposta reúne serviços, condições e a identidade da sua agência para o cliente avaliar.',tag:'PROPOSTA PERSONALIZADA',name:'Itália, no seu ritmo.',summary:'Serviços e valores da cotação · Marca da agência · Validade em destaque · Aprovação ou ajustes.'},
  {label:'03 / VIAGEM',title:'Do sim ao boa viagem.',copy:'Depois da confirmação e do pagamento pela operadora, é hora de reunir o roteiro, os vouchers e os detalhes da viagem.',tag:'TUDO NA MESMA VIAGEM',name:'Um roteiro. Todos os detalhes.',summary:'Dia a dia · Hospedagem · Documentos · Informações úteis · Sempre vinculados ao atendimento.'}
];
const hero=document.querySelector('.hero'),detail=document.querySelector('#scene-detail'),hotspots=[...document.querySelectorAll('[data-step]')];
let current=0,opener=null,depth=true;
function showStep(index,trigger){
  current=index;opener=trigger||opener;const step=steps[index];
  document.querySelector('#detail-label').textContent=step.label;
  document.querySelector('#detail-title').textContent=step.title;
  document.querySelector('#detail-copy').textContent=step.copy;
  const sample=document.querySelector('#detail-sample');sample.replaceChildren();
  for(const [tag,value] of [['small',step.tag],['strong',step.name],['p',step.summary]]){const node=document.createElement(tag);node.textContent=value;sample.append(node);}
  detail.hidden=false;hotspots.forEach((button,i)=>button.setAttribute('aria-expanded',String(i===index)));
  detail.querySelector('.close').focus({preventScroll:true});
}
function closeDetail(){detail.hidden=true;hotspots.forEach(button=>button.setAttribute('aria-expanded','false'));opener?.focus({preventScroll:true});}
hotspots.forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.step);if(!detail.hidden&&current===index){closeDetail();return;}showStep(index,button);}));
document.querySelector('#start-tour').addEventListener('click',event=>{showStep(0,event.currentTarget);if(matchMedia('(max-width:760px)').matches)detail.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});
document.querySelector('.close').addEventListener('click',closeDetail);
document.querySelector('.next-step').addEventListener('click',()=>showStep((current+1)%steps.length));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!detail.hidden)closeDetail();});
document.querySelectorAll('[data-tour]').forEach(button=>button.addEventListener('click',()=>{showStep(Number(button.dataset.tour),button);const target=matchMedia('(max-width:760px)').matches?detail:hero;target.scrollIntoView({block:matchMedia('(max-width:760px)').matches?'center':'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}));
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),finePointer=matchMedia('(pointer:fine)'),toggle=document.querySelector('#depth-toggle');
let depthFrame=0,depthX=0,depthY=0;
function resetDepth(){cancelAnimationFrame(depthFrame);depthFrame=0;hero.style.setProperty('--x','0px');hero.style.setProperty('--y','0px');}
function updateDepthControl(){toggle.setAttribute('aria-pressed',String(depth&&!reduced.matches));toggle.setAttribute('aria-label',reduced.matches?'Profundidade desativada pela preferência de movimento reduzido':(depth?'Desativar profundidade':'Ativar profundidade'));toggle.disabled=reduced.matches;if(reduced.matches)resetDepth();}
toggle.addEventListener('click',()=>{depth=!depth;resetDepth();updateDepthControl();});
hero.addEventListener('pointermove',event=>{if(!depth||reduced.matches||!finePointer.matches)return;depthX=event.clientX;depthY=event.clientY;if(depthFrame)return;depthFrame=requestAnimationFrame(()=>{depthFrame=0;const rect=hero.getBoundingClientRect();hero.style.setProperty('--x',((depthX-rect.left)/rect.width-.5)*12+'px');hero.style.setProperty('--y',((depthY-rect.top)/rect.height-.5)*8+'px');});},{passive:true});
hero.addEventListener('pointerleave',resetDepth);reduced.addEventListener('change',updateDepthControl);updateDepthControl();
