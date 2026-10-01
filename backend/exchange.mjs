// Public reference rates only. No agency data is sent to the provider.
export function createExchangeService({fetcher=globalThis.fetch,clock=Date.now}={}) {
  let cached, fetchedAt=0, pending, retryAt=0;
  const ttl=30*60*1000;
  const snapshot=stale=>({...cached,stale});
  return async function exchangeRates() {
    if(cached&&clock()-fetchedAt<ttl)return snapshot(false);
    if(pending)return pending;
    if(clock()<retryAt){if(cached&&clock()-fetchedAt<7*86400000)return snapshot(true);throw Object.assign(new Error('Câmbio indisponível no momento. Tente novamente em alguns minutos.'),{status:503});}
    pending=(async()=>{
      try {
        const response=await fetcher('https://api.frankfurter.dev/v2/rates?base=BRL&quotes=USD,EUR',{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
        if(!response.ok)throw Error('Provider unavailable');
        const rows=await response.json(), rates={BRL:1}, dates={};
        for(const code of ['USD','EUR']){
          const row=Array.isArray(rows)&&rows.find(r=>r.base==='BRL'&&r.quote===code);
          if(!row||!Number.isFinite(row.rate)||row.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||Date.parse(row.date)>clock()+86400000||clock()-Date.parse(row.date)>7*86400000)throw Error('Invalid reference rate');
          rates[code]=1/row.rate; dates[code]=row.date;
        }
        fetchedAt=clock();cached={rates,dates,source:'Frankfurter',sourceUrl:'https://frankfurter.dev/',fetchedAt:new Date(fetchedAt).toISOString()};
        return snapshot(false);
      } catch {
        retryAt=clock()+5*60000;
        if(cached&&clock()-fetchedAt<7*86400000)return snapshot(true);
        throw Object.assign(new Error('Câmbio indisponível no momento. Tente novamente em alguns minutos.'),{status:503});
      } finally {pending=null;}
    })();
    return pending;
  };
}
export const exchangeRates=createExchangeService();
