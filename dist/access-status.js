(() => {
  'use strict';
  const root=document.querySelector('[data-access-status]');
  if(!root)return;
  let pending=null,lastChecked=0,available=false;
  const message=root.querySelector('[data-access-message]'),retry=root.querySelector('button');
  async function check(force=false){
    if(pending)return pending;
    if(!force&&Date.now()-lastChecked<15000)return available;
    retry.disabled=true;
    pending=(async()=>{
      try{
        const result=await fetch('/api/health',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000)});
        const payload=result.ok?await result.json():null;
        available=payload?.ok===true;
      }catch{available=false;}
      lastChecked=Date.now();root.hidden=available;
      message.textContent=available?'':'O serviço está temporariamente indisponível. Aguarde antes de criar sua conta ou acessar a agência.';
      retry.disabled=false;pending=null;return available;
    })();return pending;
  }
  retry.addEventListener('click',()=>check(true));
  globalThis.TravelAccessHealth=Object.freeze({ensureAvailable:()=>check()});
  void check(true);
})();
