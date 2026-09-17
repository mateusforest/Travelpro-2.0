import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies,requestContext} from './runtime.mjs';
import {fail} from '../validation.mjs';

export function supabaseConfigured(env=process.env){
  return ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].every(key=>Boolean(env[key]));
}
function config(){
  if(!supabaseConfigured())fail(503,'A conexão com o Supabase precisa ser configurada no servidor.');
  return {url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
}
export function createSupabaseServerClient(){
  const {url,key}=config(),jar=cookies();
  return createServerClient(url,key,{
    cookieOptions:{path:'/',httpOnly:true,sameSite:'lax',secure:new URL(requestContext().request.url).protocol==='https:'},
    cookies:{getAll:()=>jar.getAll(),setAll:items=>items.forEach(({name,value,options})=>jar.set(name,value,options))}
  });
}
export function createSupabaseAdminClient(){
  const {url}=config();
  return createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
