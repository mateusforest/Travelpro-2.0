(() => {
  const api={csrf:'',user:null,services:[],version:0};
  let lastActivity=Date.now(),lastPulse=0,expired=false,idleTimer;
  const active=()=>{if(expired)return;lastActivity=Date.now();document.querySelector('.idle-warning')?.remove();};
  for(const event of ['pointerdown','keydown','input','touchstart','scroll'])globalThis.addEventListener?.(event,active,{passive:true});
  // Activity is shared only between same-origin tabs; polling is never activity.
  const activityChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('travelpro-activity'):null;
  if(activityChannel)activityChannel.onmessage=e=>{if(e.data?.type==='active'&&Number.isFinite(e.data.at))lastActivity=Math.min(Date.now(),Math.max(lastActivity,e.data.at));};
  api.enableIdle=getMinutes=>{
    clearInterval(idleTimer);lastActivity=Date.now();
    idleTimer=setInterval(async()=>{
      const idle=Math.min(60,Math.max(15,getMinutes()))*60000,elapsed=Date.now()-lastActivity;
      if(expired)return;
      if(elapsed>=idle){
        expired=true;clearInterval(idleTimer);
        // Hide customer data even if the network is unavailable.
        document.body.replaceChildren();const message=document.createElement('p');message.textContent='Sessão encerrada por inatividade. Entre novamente para continuar.';document.body.append(message);
        try{await api.request('/auth/logout',{method:'POST',body:{}});}catch{}
        location.replace('login.html?expired=1');return;
      }
      if(elapsed>=idle-60000&&!document.querySelector('.idle-warning')){const warning=document.createElement('div');warning.className='idle-warning';warning.role='alert';warning.textContent='Sua sessão termina em menos de um minuto. Interaja com o portal para continuar.';document.body.append(warning);}
      if(elapsed<60000&&Date.now()-lastPulse>=60000){lastPulse=Date.now();activityChannel?.postMessage({type:'active',at:lastActivity});try{await api.request('/auth/session');}catch{}}
    },15000);
  };
  api.request=async(path,options={})=>{
    const headers={...options.headers};
    if(options.body!==undefined){headers['Content-Type']='application/json';if(api.csrf)headers['X-CSRF-Token']=api.csrf;}
    let res;
    try{res=await fetch('/api'+path,{...options,signal:options.signal||AbortSignal.timeout(45000),headers,body:options.body!==undefined?JSON.stringify(options.body):undefined,credentials:'same-origin'});}
    catch{throw Object.assign(new Error('Não foi possível acessar o servidor. Suas alterações continuam nesta tela.'),{status:0});}
    let data;
    try{
      if(!res.headers.get('content-type')?.includes('application/json'))throw new Error();
      data=await res.json();
      if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();
    }catch{throw Object.assign(new Error('O serviço do portal está indisponível neste endereço. Tente novamente mais tarde ou entre em contato com o suporte.'),{status:res.ok?502:res.status});}
    if(!res.ok)throw Object.assign(new Error(data.error||'Não foi possível concluir.'),{status:res.status});
    return data;
  };
  api.session=async()=>{const data=await api.request('/auth/session');api.csrf=data.csrf;api.user=data.user;return data;};
  window.TravelAPI=api;
})();
