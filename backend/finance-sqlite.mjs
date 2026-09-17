import {transaction,fail,stateRow} from './store.mjs';
import {report} from './finance.mjs';
export function sqliteFinanceRepository(db,agency,user){
  const get=(id,kind='entries')=>{const r=db.prepare(`SELECT data,version FROM finance_${kind==='catalogs'?'catalogs':'entries'} WHERE agency_id=? AND id=?`).get(agency,id);if(!r)fail(404,'Registro financeiro não encontrado.');return {...JSON.parse(r.data),version:r.version};};
  const catalogs=()=>db.prepare('SELECT data,version FROM finance_catalogs WHERE agency_id=? ORDER BY id').all(agency).map(r=>({...JSON.parse(r.data),version:r.version}));
  const event=(id,action,reason,previous,next)=>db.prepare('INSERT INTO finance_events(agency_id,entry_id,user_id,action,reason,previous,next,created_at) VALUES(?,?,?,?,?,?,?,?)').run(agency,id,user,action,reason,previous?JSON.stringify(previous):null,next?JSON.stringify(next):null,new Date().toISOString());
  return {
    async ready(){return Boolean(db.prepare('SELECT agency_id FROM finance_migrations WHERE agency_id=?').get(agency));},
    async get(id,kind){return get(id,kind);},async catalogs(){return catalogs();},
    async report(f){return report(db.prepare('SELECT data,version FROM finance_entries WHERE agency_id=?').all(agency).map(r=>({...r,data:JSON.parse(r.data)})),catalogs(),f);},
    async history(id){return db.prepare('SELECT * FROM finance_events WHERE agency_id=? AND entry_id=? ORDER BY id DESC LIMIT 50').all(agency,id).map(r=>({...r,previous:r.previous?JSON.parse(r.previous):null,next:r.next?JSON.parse(r.next):null}));},
    async write(action,id,version,data,reason=''){
      return transaction(db,()=>{
        if(action==='bootstrap'){
          if(db.prepare('SELECT agency_id FROM finance_migrations WHERE agency_id=?').get(agency))return {};
          if(stateRow(db,agency).version!==version)fail(409,'Os dados mudaram. Atualize o financeiro.');
          for(const item of data)db.prepare('INSERT INTO finance_entries VALUES(?,?,?,1)').run(agency,item.id,JSON.stringify(item));
          db.prepare('INSERT INTO finance_migrations VALUES(?,?)').run(agency,Date.now());event('migration','migration','Importação dos lançamentos anteriores.',null,null);return {imported:data.length};
        }
        if(action==='create'){
          const old=db.prepare('SELECT * FROM finance_requests WHERE agency_id=? AND id=?').get(agency,id);
          if(old){if(old.data!==JSON.stringify(data))fail(409,'Esta operação já foi registrada com outros dados.');return JSON.parse(old.result);}
          for(const item of data){db.prepare('INSERT INTO finance_entries VALUES(?,?,?,1)').run(agency,item.id,JSON.stringify(item));event(item.id,'created','',null,item);}
          const result={count:data.length};db.prepare('INSERT INTO finance_requests VALUES(?,?,?,?)').run(agency,id,JSON.stringify(data),JSON.stringify(result));return result;
        }
        const kind=action==='catalog'?'catalogs':'entries';let previous=null;
        if(version===0&&action==='catalog')db.prepare('INSERT INTO finance_catalogs VALUES(?,?,?,1)').run(agency,id,JSON.stringify(data));
        else{previous=get(id,kind);const changed=db.prepare(`UPDATE finance_${kind} SET data=?,version=version+1 WHERE agency_id=? AND id=? AND version=?`).run(JSON.stringify(data),agency,id,version);if(!changed.changes)fail(409,'Este registro mudou. Atualize antes de continuar.');}
        event(id,action,reason,previous,data);return {version:version+1};
      });
    }
  };
}
