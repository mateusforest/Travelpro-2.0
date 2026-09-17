import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {mergeAgencyImport} from '../backend/agency-import.mjs';

process.loadEnvFile('.env');
const arg=k=>process.argv[process.argv.indexOf(k)+1];
const wid=arg('--workspace'),batchPath=arg('--batch'),apply=process.argv.includes('--apply');
if(!wid||!batchPath||!process.argv.includes('--workspace')||!process.argv.includes('--batch'))throw Error('Use --workspace UUID --batch arquivo.json [--apply].');
const batch=JSON.parse(fs.readFileSync(batchPath,'utf8')),dir=path.dirname(batchPath);
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const checked=r=>{if(r.error)throw Error('Database/storage: '+r.error.code+' '+r.error.message);return r.data;};
const before=checked(await db.from('travelpro_state').select('*').eq('workspace_id',wid).single());
let merged=mergeAgencyImport(before.data,batch);
if(merged.unchanged){console.log(JSON.stringify({unchanged:true,version:before.version,reason:'Lote já aplicado; nenhuma escrita.'}));process.exit(0);}
const hashes=new Set();
for(const file of batch.files){const bytes=fs.readFileSync(file.path),hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,file.sha256,'Arquivo mudou após revisão.');hashes.add(hash);}
console.log(JSON.stringify({dryRun:!apply,version:before.version,counts:merged.counts,files:batch.files.length,uniqueFiles:hashes.size,bytes:Buffer.byteLength(JSON.stringify(merged.state)),financialUnchanged:JSON.stringify(before.data.transactions)===JSON.stringify(merged.state.transactions)}));
if(!apply)process.exit(0);
const backup=path.join(dir,'before-apply-'+before.version+'.json');if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(before,null,2),{flag:'wx'});
const uploaded=new Map();
async function upload(file){
 if(uploaded.has(file.sha256))return uploaded.get(file.sha256);
 const h=file.sha256.slice(0,32),uuid=[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
 const ext=path.extname(file.name).toLowerCase(),name='original'+ext,id=uuid+'/'+name;
 const mime={'.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.png':'image/png','.jpg':'image/jpeg'}[ext]||'application/octet-stream';
 const bytes=fs.readFileSync(file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
 const result=await db.storage.from('travelpro-private').upload(wid+'/'+id,bytes,{contentType:mime,upsert:false});
 if(result.error&&!['409','Duplicate'].includes(String(result.error.statusCode||result.error.code))&&!/already exists/i.test(result.error.message))checked(result);
 if(result.error){const stored=checked(await db.storage.from('travelpro-private').download(wid+'/'+id));assert.equal(createHash('sha256').update(Buffer.from(await stored.arrayBuffer())).digest('hex'),file.sha256,'Objeto existente difere do original.');}
 const ref={id,name:file.name,size:bytes.length,type:mime,sha256:file.sha256,url:'/api/files/'+encodeURIComponent(id)};uploaded.set(file.sha256,ref);return ref;
}
for(const doc of batch.documents){doc.file=await upload(batch.files.find(f=>f.index===doc.sourceIndex));for(const v of doc.versions||[])v.file=await upload(batch.files.find(f=>f.index===v.sourceIndex));}
for(const [key,filename] of [['logoFile','asset-0.png'],['coverFile','asset-2.jpg']]){const p=path.join(dir,'renders',filename),bytes=fs.readFileSync(p);batch.template[key]=await upload({name:filename,path:p,sha256:createHash('sha256').update(bytes).digest('hex')});}
merged=mergeAgencyImport(before.data,batch);
assert.deepEqual(merged.state.transactions,before.data.transactions);
const current=checked(await db.from('travelpro_state').select('version').eq('workspace_id',wid).single());assert.equal(current.version,before.version,'Dados mudaram durante o upload. Execute novamente para revisar a nova versão.');
const version=checked(await db.rpc('travelpro_save_state',{p_workspace:wid,p_version:before.version,p_data:merged.state,p_user:null}));
const after=checked(await db.from('travelpro_state').select('*').eq('workspace_id',wid).single());
assert.equal(after.version,version);assert.deepEqual(after.data,merged.state);assert.equal(mergeAgencyImport(after.data,batch).unchanged,true);
fs.writeFileSync(path.join(dir,'applied.json'),JSON.stringify({workspace:wid,version,counts:merged.counts,files:[...uploaded.values()],verifiedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({applied:true,version,counts:merged.counts,privateFiles:uploaded.size,verified:true,replayUnchanged:true}));
