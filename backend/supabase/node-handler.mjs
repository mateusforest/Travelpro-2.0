import {handle} from './app.mjs';
import {withRequest,ApiResponse} from './runtime.mjs';

export function publicOrigin(env=process.env){
  const value=env.VERCEL_ENV==='preview'&&env.VERCEL_URL?'https://'+env.VERCEL_URL:env.VERCEL?env.TRAVELPRO_PUBLIC_URL:env.PUBLIC_ORIGIN||env.TRAVELPRO_PUBLIC_URL||`http://${env.HOST||'127.0.0.1'}:${env.PORT||4173}`;
  if(!value)throw new Error('Configure TRAVELPRO_PUBLIC_URL no servidor.');
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||((env.VERCEL||env.NODE_ENV==='production')&&url.protocol!=='https:'))throw new Error('A URL pública de produção precisa usar HTTPS.');
  return url.origin;
}
function requestUrl(req){
  const origin=new URL(publicOrigin()),host=req.headers.host;
  if(host!==origin.host){
    const loopback=new Set(['localhost','127.0.0.1','[::1]']);
    const candidate=new URL(origin.protocol+'//'+host);
    if(process.env.VERCEL||process.env.NODE_ENV==='production'||origin.protocol!=='http:'||candidate.host!==host||!loopback.has(origin.hostname)||!loopback.has(candidate.hostname)||candidate.port!==origin.port)throw Object.assign(new Error('Host não autorizado.'),{status:403});
    origin.host=candidate.host;
  }
  const url=new URL(req.url,origin);
  if(url.origin!==origin.origin)throw Object.assign(new Error('Host não autorizado.'),{status:403});
  if(url.pathname==='/api/index'&&url.searchParams.has('route')){
    url.pathname='/api/'+url.searchParams.get('route');url.searchParams.delete('route');
  }
  return url;
}
export default async function nodeHandler(req,res){
  let response;
  try{
    const url=requestUrl(req),headers=new Headers();
    for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
    let body;
    if(!['GET','HEAD'].includes(req.method)){
      if(req.body!==undefined)body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
      else {const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>4200000)throw Object.assign(new Error('Solicitação muito grande.'),{status:413});parts.push(part);}body=Buffer.concat(parts);}
      if(Buffer.byteLength(body)>4200000)throw Object.assign(new Error('Solicitação muito grande.'),{status:413});
    }
    response=await withRequest(new Request(url,{method:req.method,headers,body}),handle);
  }catch(error){
    if(!error.status)console.error('TravelPro runtime:',error.name);
    response=ApiResponse.json({error:error.status?error.message:'Não foi possível iniciar o portal. Confira a configuração do servidor.'},{status:error.status||503});
  }
  res.statusCode=response.status;
  response.headers.forEach((value,key)=>{if(key!=='set-cookie')res.setHeader(key,value);});
  const cookieHeaders=response.headers.getSetCookie();if(cookieHeaders.length)res.setHeader('Set-Cookie',cookieHeaders);
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.end(Buffer.from(await response.arrayBuffer()));
}
