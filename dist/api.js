(() => {
  const api={csrf:'',user:null,services:[],version:0};
  api.request=async(path,options={})=>{
    const headers={...options.headers};
    if(options.body!==undefined){headers['Content-Type']='application/json';if(api.csrf)headers['X-CSRF-Token']=api.csrf;}
    let res;
    try{res=await fetch('/api'+path,{...options,headers,body:options.body!==undefined?JSON.stringify(options.body):undefined,credentials:'same-origin'});}
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
