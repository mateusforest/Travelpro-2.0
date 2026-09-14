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
export const collections=['clients','trips','events','transactions','templates','itineraries','documents','campaigns','budgets'];
export function fail(status,message){const e=new Error(message);e.status=status;throw e;}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validateState(s){
  if(!object(s)||typeof s.agency!=='string'||!s.agency.trim()||s.agency.length>150)fail(422,'Informe o nome da agência.');
  const scan=(x,depth=0)=>{if(depth>18)fail(422,'Estrutura de dados muito profunda.');if(typeof x==='string'&&x.length>500000)fail(422,'Conteúdo muito longo.');if(x&&typeof x==='object')for(const [k,v]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(k))fail(422,'Campo inválido.');scan(v,depth+1);}};scan(s);
  for(const key of collections){if(!Array.isArray(s[key])||s[key].length>10000)fail(422,'Lista inválida: '+key);const ids=new Set();for(const row of s[key]){if(!object(row)||typeof row.id!=='string'||!row.id||row.id.length>100||ids.has(row.id))fail(422,'Identificador inválido em '+key);ids.add(row.id);}}
  const refs=(key,id)=>s[key].some(x=>x.id===id),num=(v,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min;
  const date=x=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;}catch{return false;}};
  for(const c of s.clients)if(typeof c.name!=='string'||!c.name.trim()||typeof c.phone!=='string'||typeof c.email!=='string')fail(422,'Cliente inválido.');
  for(const t of s.trips)if(!refs('clients',t.client)||!t.title?.trim()||!t.destination?.trim()||!date(t.start)||!date(t.end)||t.end<t.start||!num(t.value)||!Number.isInteger(t.travelers)||t.travelers<1)fail(422,'Revise o cliente, período e valores da viagem.');
  for(const key of ['events','transactions','documents','itineraries'])for(const r of s[key])if(r.trip&&!refs('trips',r.trip))fail(422,'Viagem vinculada não encontrada.');
  for(const e of s.events)if(!e.title?.trim()||!date(e.date)||!/^\d{2}:\d{2}$/.test(e.time))fail(422,'Compromisso inválido.');
  for(const f of s.transactions)if(!f.title?.trim()||!num(f.amount,0.01)||!date(f.date)||!['receber','pagar','comissao'].includes(f.type))fail(422,'Lançamento inválido.');
  for(const b of s.budgets){if(!refs('clients',b.client)||!b.name?.trim()||!date(b.start)||!date(b.end)||b.end<b.start||!date(b.valid)||!Number.isInteger(b.travelers)||b.travelers<1||!Array.isArray(b.items)||!b.items.length||!num(b.discount))fail(422,'Orçamento inválido.');for(const i of b.items)if(!i.name?.trim()||!Number.isInteger(i.qty)||i.qty<1||!num(i.unit))fail(422,'Serviço inválido no orçamento.');if(b.discount>b.items.reduce((n,i)=>n+i.qty*i.unit,0))fail(422,'Desconto maior que o orçamento.');}
  for(const r of s.itineraries)if(!r.name?.trim()||!Array.isArray(r.days)||r.days.length>200)fail(422,'Roteiro inválido.');
  for(const d of s.documents)if(!d.name?.trim()||typeof d.content!=='string')fail(422,'Documento inválido.');
  if(!object(s.whatsapp)||!Array.isArray(s.whatsapp.threads)||s.whatsapp.threads.length>10000||!object(s.whatsapp.config))fail(422,'Atendimento inválido.');
  const threadIds=new Set();for(const t of s.whatsapp.threads){if(!t.id||threadIds.has(t.id)||!t.name?.trim()||!['cos','human','closed'].includes(t.mode)||!object(t.profile)||!Array.isArray(t.messages)||!Array.isArray(t.events))fail(422,'Conversa inválida.');threadIds.add(t.id);if(t.clientId&&!refs('clients',t.clientId))fail(422,'Cliente do atendimento não encontrado.');}
  if(!Array.isArray(s.messages)||s.messages.length>2000)fail(422,'Histórico do COS excedeu o limite.');
  if(!['essencial','pro','completo'].includes(s.plan))fail(422,'Plano inválido.');
  return s;
}
export function saveState(db,agency,s,version,user='system'){
  validateState(s);return transaction(db,()=>{const result=db.prepare('UPDATE agency_state SET data=?,version=version+1,updated_at=? WHERE agency_id=? AND version=?').run(JSON.stringify(s),Date.now(),agency,version);if(!result.changes)fail(409,'Esta agência mudou em outra aba ou recebeu uma mensagem. Recarregue os dados antes de salvar.');db.prepare('UPDATE agencies SET name=? WHERE id=?').run(s.agency,agency);db.prepare('INSERT INTO audit(agency_id,user_id,action,created_at) VALUES(?,?,?,?)').run(agency,user,'workspace.saved',Date.now());return version+1;});
}
