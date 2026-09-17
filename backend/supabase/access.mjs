import {createHash} from 'node:crypto';
import {createSupabaseAdminClient} from './clients.mjs';
import {fail} from '../validation.mjs';

function checked(result){
  if(result.error){console.error('TravelPro access:',result.error.code);fail(503,'Não foi possível consultar o acesso à agência. Tente novamente.');}
  return result.data;
}
export const canManageWorkspace=access=>['owner','admin'].includes(access.membershipRole);
export const resolvePostAuthPath=()=>'/portal.html';

export async function getUserAccessForUser(user){
  const db=createSupabaseAdminClient();
  const [profileResult,membershipResult]=await Promise.all([
    db.from('profiles').select('id,full_name,email').eq('id',user.id).maybeSingle(),
    db.from('workspace_members').select('workspace_id,role').eq('user_id',user.id).order('created_at')
  ]);
  const profile=checked(profileResult),memberships=checked(membershipResult)||[];
  const rows=memberships.length?checked(await db.from('workspaces').select('id,name,type,owner_id').in('id',memberships.map(m=>m.workspace_id)).eq('type','operations')):[];
  const selected=memberships.find(m=>m.role==='owner'&&rows.some(w=>w.id===m.workspace_id))||memberships.find(m=>rows.some(w=>w.id===m.workspace_id));
  return {user,profile,workspace:rows.find(w=>w.id===selected?.workspace_id)||null,membershipRole:selected?.role||null};
}

export async function ensureAppAccessForUser({user}){
  const access=await getUserAccessForUser(user);
  if(access.workspace)return {access};
  const db=createSupabaseAdminClient();
  const name=String(user.user_metadata?.name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Minha agência').slice(0,100);
  if(!access.profile)checked(await db.from('profiles').upsert({id:user.id,full_name:name,email:user.email},{onConflict:'id',ignoreDuplicates:true}));
  const owned=checked(await db.from('workspaces').select('id,name,type,owner_id').eq('owner_id',user.id).eq('type','operations').order('created_at').limit(1));
  let workspace=owned[0];
  if(!workspace){
    // Stable ID makes simultaneous first logins converge on one workspace.
    const hash=createHash('sha256').update('travelpro:operations:'+user.id).digest('hex');
    const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
    checked(await db.from('workspaces').upsert({id,name:String(user.user_metadata?.agency||name).slice(0,150),type:'operations',owner_id:user.id,metadata:{}},{onConflict:'id',ignoreDuplicates:true}));
    workspace=checked(await db.from('workspaces').select('id,name,type,owner_id').eq('id',id).eq('owner_id',user.id).single());
  }
  checked(await db.from('workspace_members').upsert({workspace_id:workspace.id,user_id:user.id,role:'owner'},{onConflict:'workspace_id,user_id',ignoreDuplicates:true}));
  return {access:await getUserAccessForUser(user)};
}
