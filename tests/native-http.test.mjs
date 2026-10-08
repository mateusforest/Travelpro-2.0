import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {createNativeCollector,createPinnedNativeTransport,createEnvironmentNativeTransport,isPublicNativeAddress,parseNativeRobots,nativeRobotsAllows,nativeHttpLimits,nativeUserAgent} from '../backend/native-http.mjs';

const origin='https://travel.example.com',options={allowedHosts:['travel.example.com']};
const response=(body,status=200,type='text/html; charset=utf-8',headers={})=>({status,headers:{'content-type':type,...headers},body});
function fixture(page,{robots='',robotStatus=200}={}){
  const calls=[];let timestamp=Date.parse('2026-10-08T12:00:00Z');
  const collector=createNativeCollector({now:()=>timestamp,transport:async(url,opts)=>{calls.push({url,...opts});return new URL(url).pathname==='/robots.txt'?response(robots,robotStatus,'text/plain'):typeof page==='function'?page(url):page;}});
  return {collector,calls,advance:ms=>timestamp+=ms};
}

test('native collector denies unlisted hosts, local and literal addresses, credentials and non-HTTPS before transport',async()=>{
  const {collector,calls}=fixture(response('<html>Test fixture</html>'));
  for(const url of ['https://evil.example.com/','http://travel.example.com/','https://127.0.0.1/','https://[::1]/','https://user:secret@travel.example.com/','https://travel.example.com:444/','https://travel.example.com./','https://travel.example.com/#x','https://travel.example.com.evil.example/'])await assert.rejects(collector.getHtml(url,options),{code:'UNSAFE_URL'});
  assert.equal(calls.length,0);
});

test('public address validation rejects reserved IPv4 and mapped, tunnel, private and documentation IPv6',()=>{
  for(const address of ['0.0.0.0','10.1.1.1','127.0.0.1','169.254.169.254','172.16.1.1','192.168.0.1','100.64.0.1','198.18.0.1','192.0.2.1','198.51.100.1','203.0.113.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::','3fff::1','2001::1'])assert.equal(isPublicNativeAddress(address),false,address);
  for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicNativeAddress(address),true,address);
});

test('native transport rejects mixed DNS answers before opening a socket',async()=>{
  let requested=false;
  const transport=createPinnedNativeTransport({lookup:async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}],request:()=>{requested=true;}});
  await assert.rejects(transport(origin,{signal:AbortSignal.timeout(1000),maxBytes:1000}),{code:'UNSAFE_ADDRESS'});assert.equal(requested,false);
});

test('native socket keeps original SNI and pins lookup to already validated DNS, without auth or redirects',async()=>{
  let dnsCalls=0;
  const transport=createPinnedNativeTransport({lookup:async()=>{dnsCalls++;return [{address:'1.1.1.1',family:4}];},request:(url,config,done)=>{
    assert.equal(url.hostname,'travel.example.com');assert.equal(config.servername,'travel.example.com');assert.equal(config.rejectUnauthorized,true);assert.equal(config.method,'GET');assert.equal(config.agent,false);assert.equal(config.headers['User-Agent'],nativeUserAgent);assert.equal(config.headers.Authorization,undefined);assert.equal(config.headers.Cookie,undefined);
    config.lookup('travel.example.com',{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'1.1.1.1');assert.equal(family,4);});
    config.lookup('travel.example.com',{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'1.1.1.1',family:4}]);});
    const req=new EventEmitter();req.destroy=()=>{};req.end=()=>{const stream=Readable.from([Buffer.from('fixture')]);stream.headers={'content-type':'text/html'};stream.statusCode=200;done(stream);};return req;
  }});
  const got=await transport(origin,{signal:AbortSignal.timeout(1000),maxBytes:1000});assert.equal(got.body.toString(),'fixture');assert.equal(dnsCalls,1);
});

test('native transport bounds chunked bodies before parsing and abort destroys the socket',async()=>{
  let destroyed=0;
  const transport=createPinnedNativeTransport({lookup:async()=>[{address:'1.1.1.1',family:4}],request:(_url,_options,done)=>{
    const req=new EventEmitter();req.destroy=()=>{destroyed++;};req.end=()=>{const stream=Readable.from([Buffer.alloc(80),Buffer.alloc(80)]);stream.headers={'content-type':'text/html'};stream.statusCode=200;done(stream);};return req;
  }});
  await assert.rejects(transport(origin,{signal:AbortSignal.timeout(1000),maxBytes:100}),{code:'RESPONSE_TOO_LARGE'});assert.equal(destroyed,1);
  const controller=new AbortController();let opened;
  const waiting=new Promise(resolve=>opened=resolve);
  const slow=createPinnedNativeTransport({lookup:async()=>[{address:'1.1.1.1',family:4}],request:()=>{const req=new EventEmitter();req.destroy=()=>{destroyed++;};req.end=()=>opened();return req;}});
  const pending=slow(origin,{signal:controller.signal,maxBytes:100});await waiting;controller.abort();await assert.rejects(pending,{code:'TIMEOUT'});assert.equal(destroyed,2);
});

test('environment transport uses configured fetch with manual redirects and no credentials, with bounded streaming',async()=>{
  const transport=createEnvironmentNativeTransport({fetcher:async(url,config)=>{assert.equal(url,origin);assert.equal(config.redirect,'manual');assert.equal(config.method,'GET');assert.equal(config.credentials,'omit');assert.equal(config.headers['User-Agent'],nativeUserAgent);assert.equal(config.headers.Authorization,undefined);return new Response('fixture',{status:302,headers:{location:'https://outside.example.com/','content-type':'text/html'}});}});
  const result=await transport(origin,{signal:AbortSignal.timeout(1000),maxBytes:100});assert.equal(transport.mode,'environment_proxy');assert.equal(result.status,302);assert.equal(result.body.toString(),'fixture');
  const oversized=createEnvironmentNativeTransport({fetcher:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(60));controller.enqueue(new Uint8Array(60));controller.close();}}))});
  await assert.rejects(oversized(origin,{signal:AbortSignal.timeout(1000),maxBytes:100}),{code:'RESPONSE_TOO_LARGE'});
  const failed=createEnvironmentNativeTransport({fetcher:async()=>{throw Error('proxy https://user:secret@proxy.example.com');}});await assert.rejects(failed(origin,{signal:AbortSignal.timeout(1000),maxBytes:100}),error=>error.code==='NETWORK_ERROR'&&!error.message.includes('secret'));
});

test('robots combines exact product-token groups, wildcard fallback, longest rules and allow ties',()=>{
  const policy=parseNativeRobots('User-agent: *\nDisallow: /\nUser-agent: TravelProBot\nDisallow: /private\nAllow: /private/public\nUser-agent: TravelProBot\nDisallow: /*?secret=\nAllow: /same\nDisallow: /same\n');
  for(const path of ['/','/private/public','/same'])assert.equal(nativeRobotsAllows(policy,origin+path),true,path);
  for(const path of ['/private','/x?secret=1'])assert.equal(nativeRobotsAllows(policy,origin+path),false,path);
  const fallback=parseNativeRobots('User-agent: OtherBot\nDisallow: /\nUser-agent: *\nDisallow: /gone$\nDisallow: /caf%C3%A9\nDisallow: /%7Eprivate\nDisallow: /a%2Fb\n');
  assert.equal(nativeRobotsAllows(fallback,origin+'/gone'),false);assert.equal(nativeRobotsAllows(fallback,origin+'/gone/more'),true);
  assert.equal(nativeRobotsAllows(fallback,origin+'/café'),false);assert.equal(nativeRobotsAllows(fallback,origin+'/~private'),false);
  assert.equal(nativeRobotsAllows(fallback,origin+'/a%2fb'),false);assert.equal(nativeRobotsAllows(fallback,origin+'/a/b'),true);
  const leading=parseNativeRobots('User-agent: *\nDisallow: */include/\nDisallow: */api/');
  assert.equal(nativeRobotsAllows(leading,origin+'/br/paris/'),true);assert.equal(nativeRobotsAllows(leading,origin+'/br/api/search'),false);assert.equal(nativeRobotsAllows(leading,origin+'/include/x'),false);
});

test('parsed robots denial prevents page fetch; malformed or unavailable robots never become an empty successful page',async()=>{
  const denied=fixture(response('should not fetch'),{robots:'User-agent: *\nDisallow: /private'});
  await assert.rejects(denied.collector.getHtml(origin+'/private',options),error=>error.code==='ROBOTS_DISALLOWED'&&error.networkRequests===1);assert.equal(denied.calls.length,1);
  for(const robotStatus of [429,500,503]){
    const unavailable=fixture(response('never'),{robotStatus});await assert.rejects(unavailable.collector.getHtml(origin+'/',options),{code:'ROBOTS_UNAVAILABLE'});assert.equal(unavailable.calls.length,1);
  }
  const invalid=fixture(response('never'),{robots:'<html>Just a moment</html>'});await assert.rejects(invalid.collector.getHtml(origin+'/',options),{code:'ROBOTS_INVALID'});
});

test('RFC unavailable 4xx robots can access ordinary public pages but cannot bypass a blocked page',async()=>{
  for(const robotStatus of [401,403,404,410]){
    const good=fixture(response('<html>Public fixture</html>'),{robotStatus});const result=await good.collector.getHtml(origin+'/',options);assert.equal(result.robots.httpStatus,robotStatus);assert.equal(result.networkRequests,2);
    const blocked=fixture(response('Access denied',403),{robotStatus});await assert.rejects(blocked.collector.getHtml(origin+'/',options),{code:'SOURCE_BLOCKED'});
  }
});

test('robots policy cache reduces HTTP work and evidence hashes original bytes while decoding Latin-1',async()=>{
  const bytes=Buffer.from('<html><meta charset="iso-8859-1"><p>Preço real da página</p></html>','latin1');
  const {collector,calls,advance}=fixture(response(bytes,200,'text/html'));
  const first=await collector.getHtml(origin+'/',options);assert.match(first.html,/Preço real da página/);assert.equal(first.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(first.networkRequests,2);assert.equal(first.robots.cached,false);
  advance(1001);const second=await collector.getHtml(origin+'/second',options);assert.equal(second.networkRequests,1);assert.equal(second.robots.cached,true);assert.equal(calls.length,3);
  advance(nativeHttpLimits.robotsTtlMs+1);const third=await collector.getHtml(origin+'/third',options);assert.equal(third.networkRequests,2);
});

test('redirects cannot leave allowlist and allowed host changes check destination robots first',async()=>{
  const blocked=fixture(response('',302,'text/html',{location:'https://127.0.0.1/private'}));await assert.rejects(blocked.collector.getHtml(origin+'/',options),{code:'UNSAFE_URL'});assert.equal(blocked.calls.length,2);
  const calls=[];
  const collector=createNativeCollector({transport:async url=>{calls.push(url);if(url===origin+'/robots.txt')return response('',200,'text/plain');if(url===origin+'/')return response('',302,'text/html',{location:'https://second.example.com/'});if(url==='https://second.example.com/robots.txt')return response('User-agent: *\nDisallow: /',200,'text/plain');throw Error('Destination page must not be fetched');}});
  await assert.rejects(collector.getHtml(origin+'/',{allowedHosts:['travel.example.com','second.example.com']}),{code:'ROBOTS_DISALLOWED'});assert.equal(calls.length,3);
});

test('redirect loops and source crawl delays have strict navigation and deadline bounds',async()=>{
  let time=Date.now(),calls=0;
  const loop=createNativeCollector({now:()=>time,transport:async url=>{calls++;time+=2000;return url.endsWith('/robots.txt')?response('',200,'text/plain'):response('',302,'text/html',{location:'/loop'});}});
  await assert.rejects(loop.getHtml(origin+'/',options),error=>error.code==='REDIRECT_LIMIT'&&error.networkRequests<=nativeHttpLimits.maxNetworkRequests);assert.equal(calls,5);
  const slow=fixture(response('never'),{robots:'User-agent: *\nCrawl-delay: 30'});await assert.rejects(slow.collector.getHtml(origin+'/',options),{code:'SOURCE_RATE_LIMIT'});assert.equal(slow.calls.length,1);
});

test('HTML/challenge and body limits reject unsafe responses; timeout returns without waiting for transport',async()=>{
  for(const page of [response('<title>Just a moment...</title>'),response('<form id="challenge-form"></form>')])await assert.rejects(fixture(page).collector.getHtml(origin+'/',options),{code:'SOURCE_BLOCKED'});
  await assert.rejects(fixture(response('x'.repeat(nativeHttpLimits.maxBytes+1))).collector.getHtml(origin+'/',options),{code:'RESPONSE_TOO_LARGE'});
  await assert.rejects(fixture(response('{}',200,'application/json')).collector.getHtml(origin+'/',options),{code:'INVALID_RESPONSE'});
  const controller=new AbortController(),collector=createNativeCollector({transport:async()=>new Promise(()=>{})});const pending=collector.getHtml(origin+'/',{...options,signal:controller.signal});controller.abort();await assert.rejects(pending,{code:'TIMEOUT'});
});
