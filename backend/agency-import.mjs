import {createHash} from 'node:crypto';
import {validateState} from './validation.mjs';

export const importId=(kind,key)=>`${kind}-${createHash('sha256').update(String(key)).digest('hex').slice(0,24)}`;
// A reviewed batch is append-only. Replays never overwrite the agency's later edits.
export function mergeAgencyImport(current,batch){
  const state=structuredClone(current),counts={};
  if(!batch.id||!batch.digest)throw Error('Importação sem identificação ou conferência.');
  const prior=state.imports?.find(x=>x.id===batch.id);
  if(prior){if(prior.digest!==batch.digest)throw Error('Este lote já foi importado com outro conteúdo.');return {state,counts,unchanged:true};}
  for(const kind of ['clients','trips','documents','itineraries','events']){
    counts[kind]=0;const ids=new Set(state[kind].map(x=>x.id));
    for(const row of batch[kind]||[]){if(ids.has(row.id))throw Error(`Identificador já cadastrado: ${kind}.`);ids.add(row.id);state[kind].push(structuredClone(row));counts[kind]++;}
  }
  if(batch.template){const index=state.templates.findIndex(t=>t.id===batch.template.id);if(index>=0)state.templates[index]={...state.templates[index],...structuredClone(batch.template)};else state.templates.push(structuredClone(batch.template));}
  state.imports??=[];state.imports.push({id:batch.id,digest:batch.digest,at:batch.at,counts,files:batch.files.map(({name,sha256,size})=>({name,sha256,size})),issues:batch.issues||[]});
  validateState(state);
  return {state,counts,unchanged:false};
}
