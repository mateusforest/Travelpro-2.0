import {AsyncLocalStorage} from 'node:async_hooks';

const context=new AsyncLocalStorage();
export class ApiResponse extends Response {
  static json(data,options={}){return new ApiResponse(JSON.stringify(data),{...options,headers:{'Content-Type':'application/json; charset=utf-8',...options.headers}});}
  static redirect(url){return new ApiResponse(null,{status:303,headers:{Location:String(url),'Cache-Control':'no-store'}});}
}
export function cookies(){return context.getStore().jar;}
export function after(callback){context.getStore().pending.push(callback);}
export function requestContext(){return context.getStore();}

function serializeCookie(name,value,options={}){
  const parts=[`${name}=${encodeURIComponent(value)}`,`Path=${options.path||'/'}`];
  if(options.maxAge!==undefined)parts.push('Max-Age='+Math.floor(options.maxAge));
  if(options.expires)parts.push('Expires='+new Date(options.expires).toUTCString());
  if(options.httpOnly)parts.push('HttpOnly');
  if(options.secure)parts.push('Secure');
  if(options.sameSite)parts.push('SameSite='+String(options.sameSite));
  return parts.join('; ');
}

export async function withRequest(request,handler){
  const values=new Map();
  for(const entry of (request.headers.get('cookie')||'').split(';')){
    const i=entry.indexOf('=');if(i<0)continue;
    try{values.set(entry.slice(0,i).trim(),decodeURIComponent(entry.slice(i+1).trim()));}catch{}
  }
  const changes=new Map(),pending=[];
  const jar={
    get(name){return values.has(name)?{name,value:values.get(name)}:undefined;},
    getAll(){return [...values].map(([name,value])=>({name,value}));},
    set(name,value,options={}){values.set(name,value);changes.set(name,serializeCookie(name,value,options));},
    delete(name){this.set(name,'',{path:'/',maxAge:0,httpOnly:true,sameSite:'lax',secure:new URL(request.url).protocol==='https:'});}
  };
  return context.run({request,jar,pending},async()=>{
    const response=await handler(request);
    for(const value of changes.values())response.headers.append('Set-Cookie',value);
    // Await background work: a serverless invocation cannot rely on a resident timer.
    for(const task of pending)await task();
    return response;
  });
}
