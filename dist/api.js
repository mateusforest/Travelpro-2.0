(() => {
  const api={csrf:'',user:null,services:[],version:0};
  let lastActivity=Date.now(),lastPulse=0,idleTimer,activityKey='',getIdleMinutes=()=>30;
  const activityChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('travelpro-activity'):null;
  const idleLimit=()=>Math.min(60,Math.max(15,Number(getIdleMinutes())||30))*60000;
  const readActivity=()=>{try{return JSON.parse(localStorage.getItem(activityKey)||'null');}catch{return null;}};
  const saveActivity=locked=>{if(!activityKey)return;try{localStorage.setItem(activityKey,JSON.stringify({at:lastActivity,locked}));}catch{};activityChannel?.postMessage({key:activityKey,at:lastActivity,locked});};
  async function endSession(reason='logout',revoke=true){
    if(api.locked)return;api.locked=true;clearInterval(idleTimer);saveActivity(true);
    // Lock first: network failure must never leave customer data on screen.
    document.body.replaceChildren();const message=document.createElement('p');
    message.textContent=reason==='expired'?'Sessão encerrada por inatividade. Entre novamente para continuar.':'Sessão encerrada neste navegador.';document.body.append(message);
    let failed=false;
    if(revoke)try{await api.request('/auth/logout',{method:'POST',body:{}});}catch{failed=true;}
    location.replace('login.html'+(failed?'?logout=local':reason==='expired'?'?expired=1':''));
  }
  api.logout=()=>endSession('logout');
  const sharedActivity=record=>{
    if(!record||!activityKey||api.locked)return;
    if(record.locked){void endSession('logout',false);return;}
    if(Number.isFinite(record.at))lastActivity=Math.min(Date.now(),Math.max(lastActivity,record.at));
  };
  if(activityChannel)activityChannel.onmessage=e=>{if(e.data?.key===activityKey)sharedActivity(e.data);};
  globalThis.addEventListener?.('storage',e=>{if(e.key===activityKey){try{sharedActivity(JSON.parse(e.newValue));}catch{}}});
  const active=()=>{
    if(!activityKey||api.locked)return;
    sharedActivity(readActivity());if(api.locked)return;
    if(Date.now()-lastActivity>=idleLimit()){void endSession('expired');return;}
    lastActivity=Date.now();saveActivity(false);document.querySelector('.idle-warning')?.remove();
  };
  for(const event of ['pointerdown','keydown','input','touchstart','scroll'])globalThis.addEventListener?.(event,active,{passive:true});
  api.enableIdle=getMinutes=>{
    clearInterval(idleTimer);getIdleMinutes=getMinutes;
    activityKey='travelpro:activity:'+String(api.sessionKey||api.csrf||api.user?.id||'current');
    const previous=readActivity();
    lastActivity=Number.isFinite(previous?.at)?Math.min(Date.now(),previous.at):Date.now();
    if(previous?.locked){void endSession('logout',false);return false;}
    if(Date.now()-lastActivity>=idleLimit()){void endSession('expired');return false;}
    saveActivity(false);
    idleTimer=setInterval(async()=>{
      sharedActivity(readActivity());if(api.locked)return;
      const elapsed=Date.now()-lastActivity;
      if(elapsed>=idleLimit()){await endSession('expired');return;}
      if(elapsed>=idleLimit()-60000&&!document.querySelector('.idle-warning')){const warning=document.createElement('div');warning.className='idle-warning';warning.role='alert';warning.textContent='Sua sessão termina em menos de um minuto. Interaja com o portal para continuar.';document.body.append(warning);}
      // A poll does not update the persisted timestamp or count as interaction.
      if(elapsed<60000&&Date.now()-lastPulse>=60000){lastPulse=Date.now();try{await api.request('/auth/session');}catch{}}
    },15000);
    return true;
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
    if(res.status===401&&api.user&&path!=='/auth/logout')void endSession('expired',false);
    if(!res.ok)throw Object.assign(new Error(data.error||'Não foi possível concluir.'),{status:res.status});
    return data;
  };
  api.session=async()=>{const data=await api.request('/auth/session');api.csrf=data.csrf;api.user=data.user;api.sessionKey=data.sessionKey;api.serverIdleEnforced=data.serverIdleEnforced===true;return data;};
  window.TravelAPI=api;
})();
