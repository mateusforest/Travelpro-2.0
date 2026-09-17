import {fail,validateState} from './validation.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function openStore(directory){
  mkdirSync(directory,{recursive:true});const db=new DatabaseSync(path.join(directory,'travelpro.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const folder=fileURLToPath(new URL('./migrations/',import.meta.url));
  for(const name of readdirSync(folder).filter(n=>n.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM migrations WHERE name=?').get(name)){
    db.exec('BEGIN IMMEDIATE');try{db.exec(readFileSync(path.join(folder,name),'utf8'));db.prepare('INSERT INTO migrations VALUES(?,?)').run(name,Date.now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  }
  return db;
}
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export function stateRow(db,agency){const row=db.prepare('SELECT data,version FROM agency_state WHERE agency_id=?').get(agency);return {state:JSON.parse(row.data),version:row.version};}
export {collections,fail,validateState} from './validation.mjs';
export function saveState(db,agency,s,version,user='system'){
  if(db.prepare('SELECT agency_id FROM finance_migrations WHERE agency_id=?').get(agency)&&JSON.stringify(stateRow(db,agency).state.transactions)!==JSON.stringify(s.transactions))fail(409,'O financeiro foi atualizado. Recarregue o portal antes de continuar.');
  validateState(s);return transaction(db,()=>{const result=db.prepare('UPDATE agency_state SET data=?,version=version+1,updated_at=? WHERE agency_id=? AND version=?').run(JSON.stringify(s),Date.now(),agency,version);if(!result.changes)fail(409,'Esta agência mudou em outra aba ou recebeu uma mensagem. Recarregue os dados antes de salvar.');db.prepare('UPDATE agencies SET name=? WHERE id=?').run(s.agency,agency);db.prepare('INSERT INTO audit(agency_id,user_id,action,created_at) VALUES(?,?,?,?)').run(agency,user,'workspace.saved',Date.now());return version+1;});
}
