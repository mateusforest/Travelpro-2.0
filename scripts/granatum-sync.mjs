// Uses the local .env; never accepts or prints credentials in command arguments.
import {createClient} from '@supabase/supabase-js';
import {runGranatum,granatumStatus} from '../backend/granatum.mjs';
import {supabaseRepository} from '../backend/finance-api.mjs';
import {migrateLegacy} from '../backend/finance.mjs';
process.loadEnvFile('.env');
const args=process.argv.slice(2),wid=args[args.indexOf('--workspace')+1];
if(!args.includes('--workspace')||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(wid))throw Error('Use --workspace UUID.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},db:{timeout:30000}});
function checked(r){if(r.error)throw Error('Database operation failed: '+r.error.code);return r.data;}
try{
 const workspace=checked(await db.from('workspaces').select('id,owner_id,type').eq('id',wid).single());if(workspace.type!=='operations')throw Error('Invalid workspace type.');
 if(args.includes('--connect')){const token=process.env.GRANATUM_API_TOKEN?.trim();if(!token)throw Error('GRANATUM_API_TOKEN missing.');checked(await db.rpc('travelpro_granatum_connect',{p_workspace:wid,p_token:token}));console.log('Granatum credential stored in Vault for the selected workspace.');}
 const repo=supabaseRepository({db,wid,user:{id:workspace.owner_id}});
 if(!await repo.ready()){const old=checked(await db.from('travelpro_state').select('data,version').eq('workspace_id',wid).single());await repo.write('bootstrap','migration',old.version,migrateLegacy(old.data.transactions));}
 if(args.includes('--restart'))checked(await db.rpc('travelpro_granatum_restart',{p_workspace:wid}));
 let status=await granatumStatus(db,wid);if(!status.connected)throw Error('Connect the credential first.');
 for(let batch=0;batch<100;batch++){
  status=await runGranatum(db,wid,{force:true});console.log(JSON.stringify(status));
  if(!status.running&&!status.busy)break;
  await new Promise(r=>setTimeout(r,2200));
 }
 if(status.running)process.exitCode=2;
}catch(error){console.error(error.status?error.message:'Granatum setup/sync failed. '+(error.message?.startsWith('Database operation failed:')?error.message:''));process.exitCode=1;}
