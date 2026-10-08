import https from 'node:https';
import {lookup as resolveDns} from 'node:dns/promises';
import {isIP} from 'node:net';
import {createHash} from 'node:crypto';

export const nativeHttpLimits=Object.freeze({timeoutMs:20000,maxBytes:2*1024*1024,robotsBytes:512000,maxRedirects:3,maxNetworkRequests:8,robotsTtlMs:3600000,maxOrigins:128});
export const nativeUserAgent='TravelProBot/1.0 (public travel offer research; no booking)';
const failure=(code,message)=>Object.assign(new Error(message),{code});
const fail=(code,message)=>{throw failure(code,message);};
const abortError=()=>failure('TIMEOUT','A coleta direta foi interrompida ou excedeu o prazo.');
const headersOf=headers=>Object.fromEntries(Object.entries(headers||{}).map(([name,value])=>[name.toLowerCase(),Array.isArray(value)?value.join(','):String(value??'')]));
export function isPublicNativeAddress(address){
  if(isIP(address)===4){
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&(c===0||c===2)||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
  }
  if(isIP(address)!==6)return false;
  // A conservative subset of global unicast, excluding translation, tunnelling,
  // documentation and protocol-assignment blocks. IPv4-mapped literals fail.
  const [a,b]=address.toLowerCase().split(':').slice(0,2).map(x=>parseInt(x||'0',16));
  return a>=0x2000&&a<=0x3fff&&a!==0x2002&&!(a===0x2001&&(b<0x200||b===0xdb8))&&!(a===0x3fff&&b<0x1000);
}
function targetUrl(value,allowedHosts){
  if(typeof value!=='string'||value.length>4096)fail('UNSAFE_URL','O endereço da fonte é inválido ou excedeu o limite.');
  let url;try{url=new URL(value);}catch{fail('UNSAFE_URL','A fonte precisa ter um endereço HTTPS permitido.');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||isIP(host.replace(/^\[|\]$/g,''))||!allowedHosts.has(host)||!host.includes('.')||host.endsWith('.')||/\.(?:local|localhost|internal|test|invalid)$/.test(host))fail('UNSAFE_URL','O endereço não pertence aos domínios públicos permitidos da fonte.');
  return url;
}
function bounded(promise,signal){
  if(signal.aborted)return Promise.reject(abortError());
  return new Promise((resolve,reject)=>{
    const aborted=()=>reject(abortError());signal.addEventListener('abort',aborted,{once:true});
    Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
  });
}
// Dependency injection exists for offline tests; production always resolves DNS,
// checks every returned address, then pins the socket to one validated address.
export function createPinnedNativeTransport({lookup=resolveDns,request=https.request}={}){
  const transport=async(url,{signal,maxBytes,userAgent=nativeUserAgent}={})=>{
    if(!signal||signal.aborted)throw abortError();
    const target=new URL(url);let addresses;
    try{addresses=await bounded(lookup(target.hostname,{all:true,verbatim:true}),signal);}catch(error){if(signal.aborted)throw abortError();throw failure('DNS_ERROR','Não foi possível resolver a fonte pública.');}
    if(!Array.isArray(addresses)||!addresses.length||addresses.some(row=>!isPublicNativeAddress(row.address)))fail('UNSAFE_ADDRESS','A fonte não resolveu exclusivamente para endereços públicos.');
    const address=addresses.find(row=>row.family===4)||addresses[0];
    return new Promise((resolve,reject)=>{
      let settled=false,req;
      const finish=(error,value)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);error?reject(error):resolve(value);};
      const abort=()=>{req?.destroy();finish(abortError());};signal.addEventListener('abort',abort,{once:true});
      try{
        req=request(target,{method:'GET',agent:false,autoSelectFamily:false,family:address.family,servername:target.hostname,rejectUnauthorized:true,headers:{'User-Agent':userAgent,Accept:'text/html,application/xhtml+xml,text/plain;q=0.9','Accept-Encoding':'identity'},lookup:(_host,options,cb)=>options?.all?cb(null,[address]):cb(null,address.address,address.family)},response=>{
          const headers=headersOf(response.headers),chunks=[];let bytes=0;
          const stop=(code,message)=>{response.destroy();req.destroy();finish(failure(code,message));};
          if(Number(headers['content-length'])>maxBytes)return stop('RESPONSE_TOO_LARGE','A resposta da fonte excedeu o limite de leitura.');
          if(headers['content-encoding']&&!/^identity$/i.test(headers['content-encoding']))return stop('UNSUPPORTED_ENCODING','A fonte não forneceu uma resposta de tamanho verificável.');
          response.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes)return stop('RESPONSE_TOO_LARGE','A resposta da fonte excedeu o limite de leitura.');chunks.push(Buffer.from(chunk));});
          response.on('end',()=>finish(null,{status:response.statusCode,headers,body:Buffer.concat(chunks)}));
          response.on('error',()=>finish(failure('NETWORK_ERROR','A fonte interrompeu a resposta.')));
          response.on('aborted',()=>finish(failure('NETWORK_ERROR','A fonte interrompeu a resposta.')));
        });
        req.on('error',()=>finish(signal.aborted?abortError():failure('NETWORK_ERROR','Não foi possível acessar a fonte pública.')));
        if(signal.aborted)return abort();req.end();
      }catch{finish(failure('NETWORK_ERROR','Não foi possível acessar a fonte pública.'));}
    });
  };transport.mode='dns_pinned';return transport;
}
// On managed hosts Node's explicitly enabled environment proxy is the supplied
// network boundary. Do not bypass it with a direct socket or change its settings.
// In this mode DNS validation belongs to that trusted proxy, not this collector.
export function createEnvironmentNativeTransport({fetcher=globalThis.fetch}={}){
  const transport=async(url,{signal,maxBytes,userAgent=nativeUserAgent}={})=>{
    if(!signal||signal.aborted)throw abortError();let response;
    try{
      response=await bounded(fetcher(url,{method:'GET',redirect:'manual',credentials:'omit',signal,headers:{'User-Agent':userAgent,Accept:'text/html,application/xhtml+xml,text/plain;q=0.9','Accept-Encoding':'identity'}}),signal);
      const headers=headersOf(Object.fromEntries(response.headers));
      if(Number(headers['content-length'])>maxBytes){await response.body?.cancel();fail('RESPONSE_TOO_LARGE','A resposta da fonte excedeu o limite de leitura.');}
      if(headers['content-encoding']&&!/^identity$/i.test(headers['content-encoding'])){await response.body?.cancel();fail('UNSUPPORTED_ENCODING','A fonte não forneceu uma resposta de tamanho verificável.');}
      const reader=response.body?.getReader();if(!reader)return {status:response.status,headers,body:Buffer.alloc(0)};
      const chunks=[];let bytes=0;
      try{for(;;){const {done,value}=await bounded(reader.read(),signal);if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();fail('RESPONSE_TOO_LARGE','A resposta da fonte excedeu o limite de leitura.');}chunks.push(Buffer.from(value));}}
      finally{if(signal.aborted)await reader.cancel().catch(()=>{});reader.releaseLock();}
      return {status:response.status,headers,body:Buffer.concat(chunks)};
    }catch(error){if(signal.aborted)throw abortError();if(['RESPONSE_TOO_LARGE','UNSUPPORTED_ENCODING'].includes(error?.code))throw error;throw failure('NETWORK_ERROR','Não foi possível acessar a fonte pública pela rede configurada.');}
  };transport.mode='environment_proxy';return transport;
}
const defaultTransport=()=>process.env.NODE_USE_ENV_PROXY==='1'&&(process.env.HTTPS_PROXY||process.env.https_proxy)?createEnvironmentNativeTransport():createPinnedNativeTransport();
function normalizedPath(value){
  // RFC 9309: compare percent-encoded UTF-8; decode only unreserved ASCII.
  return [...value].map(ch=>ch.charCodeAt(0)>127?encodeURIComponent(ch):ch).join('').replace(/%([0-9a-f]{2})/gi,(_,hex)=>{const ch=String.fromCharCode(parseInt(hex,16));return /[A-Za-z0-9._~-]/.test(ch)?ch:'%'+hex.toUpperCase();});
}
export function parseNativeRobots(body){
  if(typeof body!=='string'||body.includes('\0'))fail('ROBOTS_INVALID','As regras de acesso da fonte não puderam ser interpretadas.');
  const groups=[];let group=null,inRules=false;
  for(const raw of body.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.replace(/#.*/,'').trim();if(!line)continue;
    const match=/^([a-z-]+)\s*:\s*(.*)$/i.exec(line);if(!match)continue;
    const key=match[1].toLowerCase(),value=match[2].trim();
    if(key==='user-agent'){
      if(!group||inRules){group={agents:[],rules:[],delay:0};groups.push(group);inRules=false;}
      if(!/^(?:\*|[a-z_0-9.-]+)$/i.test(value))fail('ROBOTS_INVALID','As regras de agente da fonte não puderam ser interpretadas.');
      group.agents.push(value.toLowerCase());
    }else if(group&&['allow','disallow','crawl-delay'].includes(key)){
      inRules=true;
      if(key==='crawl-delay'){if(!/^\d+(?:\.\d+)?$/.test(value))fail('ROBOTS_INVALID','O intervalo de coleta da fonte não pôde ser interpretado.');group.delay=Math.max(group.delay,Number(value)*1000);continue;}
      if(!value)continue;
      if(!/^[/*]/.test(value)||value.length>2000)fail('ROBOTS_INVALID','As regras de caminhos da fonte não puderam ser interpretadas.');
      const pattern=normalizedPath(value);group.rules.push({allow:key==='allow',pattern});
    }
  }
  const token='travelprobot',specific=groups.filter(g=>g.agents.includes(token)),selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  return {rules:selected.flatMap(g=>g.rules),delayMs:Math.max(1000,...selected.map(g=>g.delay))};
}
function patternMatches(pattern,path){
  // Match ordered literal pieces without attacker-controlled regular expressions.
  const exact=pattern.endsWith('$');if(exact)pattern=pattern.slice(0,-1);else pattern+='*';
  const parts=pattern.split('*');if(parts.length===1)return path===pattern;
  const first=parts.shift(),last=parts.pop();if(!path.startsWith(first))return false;let position=first.length;
  for(const part of parts){if(!part)continue;const index=path.indexOf(part,position);if(index<0)return false;position=index+part.length;}
  return !last||path.endsWith(last)&&path.length-last.length>=position;
}
export function nativeRobotsAllows(policy,url){
  const target=new URL(url),path=normalizedPath(target.pathname+target.search);let longest=-1,allowed=true;
  for(const rule of policy.rules){
    if(!patternMatches(rule.pattern,path))continue;
    const length=Buffer.byteLength(rule.pattern.replace(/\*/g,'').replace(/\$$/,''));
    if(length>longest){longest=length;allowed=rule.allow;}else if(length===longest&&rule.allow)allowed=true;
  }
  return allowed;
}
const challenge=html=>/<title[^>]*>[^<]*(?:just a moment|access denied|attention required|verify (?:you|your)|captcha|acesso negado)/i.test(html)||/cf-chl-(?:opt|widget)|id=["']challenge-form["']|<form[^>]+(?:captcha|challenge)/i.test(html);
export function createNativeCollector({transport=defaultTransport(),now=()=>Date.now()}={}){
  const policies=new Map(),nextRequest=new Map();
  const prune=()=>{for(const [origin,item]of policies)if(item.until<=now())policies.delete(origin);while(policies.size>nativeHttpLimits.maxOrigins)policies.delete(policies.keys().next().value);while(nextRequest.size>nativeHttpLimits.maxOrigins)nextRequest.delete(nextRequest.keys().next().value);};
  async function getHtml(value,{signal,allowedHosts=[]}={}){
    const hosts=new Set(allowedHosts.filter(x=>typeof x==='string').map(x=>x.toLowerCase()));let target=targetUrl(value,hosts),networkRequests=0,redirects=0;
    const timeout=AbortSignal.timeout(nativeHttpLimits.timeoutMs),combined=signal?AbortSignal.any([signal,timeout]):timeout;
    const request=async(url,maxBytes)=>{
      targetUrl(url.href,hosts);if(combined.aborted)throw abortError();if(networkRequests>=nativeHttpLimits.maxNetworkRequests)fail('REQUEST_LIMIT','A coleta direta atingiu seu limite de navegação.');networkRequests++;
      let response;try{response=await bounded(transport(url.href,{signal:combined,maxBytes,userAgent:nativeUserAgent}),combined);}catch(error){if(combined.aborted)throw abortError();if(['UNSAFE_ADDRESS','RESPONSE_TOO_LARGE','UNSUPPORTED_ENCODING','DNS_ERROR','NETWORK_ERROR','TIMEOUT'].includes(error?.code))throw error;throw failure('NETWORK_ERROR','Não foi possível acessar a fonte pública.');}
      const body=Buffer.isBuffer(response?.body)?response.body:Buffer.from(typeof response?.body==='string'?response.body:'');
      if(body.length>maxBytes)fail('RESPONSE_TOO_LARGE','A resposta da fonte excedeu o limite de leitura.');
      return {status:response?.status,headers:headersOf(response?.headers),body};
    };
    const redirect=(response,base)=>{
      if(++redirects>nativeHttpLimits.maxRedirects)fail('REDIRECT_LIMIT','A fonte excedeu o limite de redirecionamentos.');
      if(!response.headers.location)fail('INVALID_RESPONSE','A fonte retornou um redirecionamento sem destino.');
      return targetUrl(new URL(response.headers.location,base).href,hosts);
    };
    const robots=async origin=>{
      prune();const cached=policies.get(origin);if(cached&&cached.until>now())return {...cached.policy,cached:true};
      let url=new URL('/robots.txt',origin),response;
      for(;;){response=await request(url,nativeHttpLimits.robotsBytes);if(![301,302,303,307,308].includes(response.status))break;const next=redirect(response,url);if(next.origin!==origin)fail('ROBOTS_UNAVAILABLE','As regras de acesso redirecionaram para outra origem.');url=next;}
      let policy;
      // RFC 9309 section 2.3.1.3 permits access after unavailable 4xx robots.
      // Rate limiting is respected, and an actual page challenge is never bypassed.
      if(response.status>=400&&response.status<500&&response.status!==429)policy={rules:[],delayMs:1000,status:response.status===404||response.status===410?'not_found':'unavailable',httpStatus:response.status};
      else if(response.status!==200)fail('ROBOTS_UNAVAILABLE','A fonte não disponibilizou suas regras de acesso.');
      else{
        const body=response.body.toString('utf8'),type=response.headers['content-type']||'';
        if(!/^text\/plain\b/i.test(type)||/^\s*</.test(body)||challenge(body))fail('ROBOTS_INVALID','A fonte não retornou um arquivo de regras de acesso legível.');
        policy={...parseNativeRobots(body),status:'checked'};
      }
      policy.checkedAt=new Date(now()).toISOString();policy.url=url.href;policies.set(origin,{until:now()+nativeHttpLimits.robotsTtlMs,policy});prune();return {...policy,cached:false};
    };
    try{
      for(;;){
        const policy=await robots(target.origin);
        if(!nativeRobotsAllows(policy,target.href))fail('ROBOTS_DISALLOWED','A fonte não permite coleta automatizada neste caminho.');
        const wait=Math.max(0,(nextRequest.get(target.origin)||0)-now());
        if(wait>=nativeHttpLimits.timeoutMs||policy.delayMs>=nativeHttpLimits.timeoutMs)fail('SOURCE_RATE_LIMIT','O intervalo de coleta da fonte excede o prazo desta consulta.');
        nextRequest.set(target.origin,Math.max(now(),nextRequest.get(target.origin)||0)+policy.delayMs);
        if(wait)await bounded(new Promise(resolve=>{const timer=setTimeout(resolve,wait);combined.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});}),combined);
        const response=await request(target,nativeHttpLimits.maxBytes);
        if([301,302,303,307,308].includes(response.status)){target=redirect(response,target);continue;}
        if([401,403,429].includes(response.status))fail('SOURCE_BLOCKED','A fonte recusou a coleta automatizada.');
        if(response.status!==200)fail('SOURCE_UNAVAILABLE','A página pública da fonte não está disponível.');
        if(!/^(?:text\/html|application\/xhtml\+xml)\b/i.test(response.headers['content-type']||''))fail('INVALID_RESPONSE','A fonte não retornou uma página HTML.');
        const head=response.body.subarray(0,4096).toString('ascii'),declared=/charset\s*=\s*["']?([a-z0-9_-]+)/i.exec(response.headers['content-type'])?.[1]||/<meta\b[^>]*charset\s*=\s*["']?([a-z0-9_-]+)/i.exec(head)?.[1]||'utf-8';
        const encoding=declared.toLowerCase();if(!['utf-8','utf8','windows-1252','iso-8859-1','latin1','us-ascii'].includes(encoding))fail('UNSUPPORTED_ENCODING','A codificação de texto da fonte não é suportada.');
        const html=new TextDecoder(encoding==='utf8'?'utf-8':encoding==='latin1'?'windows-1252':encoding).decode(response.body);if(challenge(html))fail('SOURCE_BLOCKED','A fonte solicitou verificação de acesso; a coleta foi interrompida.');
        return {html,url:target.href,fetchedAt:new Date(now()).toISOString(),sha256:createHash('sha256').update(response.body).digest('hex'),networkRequests,networkMode:transport.mode||'injected',robots:{status:policy.status,httpStatus:policy.httpStatus||200,checkedAt:policy.checkedAt,url:policy.url,cached:policy.cached}};
      }
    }catch(error){error.networkRequests=networkRequests;throw error;}
  }
  return {getHtml};
}
