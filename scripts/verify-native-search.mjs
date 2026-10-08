import {writeFile} from 'node:fs/promises';
import {createTravelSearchEngine} from '../backend/travel-search.mjs';

// Opt-in live check: uses only our public-site collectors, never a paid scrape API.
// No account, reservation, payment, messaging or customer workspace is created.
const options=process.argv.slice(2),outputIndex=options.indexOf('--output');
if(options.length&&!(options.length===2&&outputIndex===0&&options[1]&&!options[1].startsWith('--')))throw new Error('Use --output <arquivo.json> opcionalmente.');
const start=new Date(Date.now()+33*86400000).toISOString().slice(0,10),end=new Date(Date.now()+38*86400000).toISOString().slice(0,10);
const common={start,end,adults:2,childrenAges:[],rooms:1,currency:'BRL',flexDays:0,maxCalls:6,sort:'price'};
const scenarios=[
 {name:'hotel_rooms_rio_grande',request:{...common,category:'hotels',destination:'Rio Grande',hotelId:'7620',mode:'quote',providers:['native-laghetto']}},
 {name:'airline_opportunities',request:{...common,category:'flights',origin:'POA',destination:'CGH',mode:'opportunities',providers:['native-gol','native-azul']}},
 {name:'experiences_and_transfers',request:{...common,category:'trip',destination:'Porto Alegre',mode:'opportunities',providers:['native-civitatis','native-getyourguide','native-siga']}},
 {name:'tickets_paris',request:{...common,category:'tickets',destination:'Paris',mode:'opportunities',providers:['native-tiqets']}},
 {name:'car_prepaid_packages',request:{...common,category:'cars',destination:'São Paulo',mode:'opportunities',providers:['native-movida-prepaid']}}
];
const engine=createTravelSearchEngine({env:{}}),report={checkedAt:new Date().toISOString(),mode:'live_public_http',paidApisUsed:false,scenarios:[]};
for(const scenario of scenarios){
 const started=Date.now();
 const response=await engine.search(scenario.request,{tenantId:'native-smoke-local'});
 const entry={name:scenario.name,durationMs:Date.now()-started,...response};report.scenarios.push(entry);
 console.log(JSON.stringify({name:entry.name,offers:response.offers.length,complete:response.offers.filter(o=>o.completeness==='complete').length,summary:response.summary,providers:response.providers.map(p=>({id:p.id,status:p.status,message:p.message})),examples:response.offers.slice(0,2).map(o=>({title:o.title,price:o.price,sourceUrl:o.sourceUrl,publishedStart:o.details.publishedStart,evidence:o.details.evidence}))}));
}
if(outputIndex>=0){if(!options[outputIndex+1])throw new Error('Informe o caminho de saída.');await writeFile(options[outputIndex+1],JSON.stringify(report,null,2)+'\n');}
if(!report.scenarios.some(s=>s.offers.length))process.exitCode=1;
