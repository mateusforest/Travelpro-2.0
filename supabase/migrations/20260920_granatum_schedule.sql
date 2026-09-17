-- Apply only after the /api/cron/granatum handler is deployed to this domain.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$begin
 if not exists(select 1 from vault.secrets where name='travelpro-granatum-cron') then
  perform vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'travelpro-granatum-cron','TravelPro internal scheduler authentication');
 end if;
end $$;
create or replace function public.travelpro_granatum_enqueue() returns bigint
language plpgsql security definer set search_path=public as $$
declare request_id bigint; secret text;
begin
 if not exists(select 1 from travelpro_granatum where enabled and next_sync<=now() and (locked_until is null or locked_until<now())) then return null; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='travelpro-granatum-cron';
 select net.http_post(
  url:='https://www.usetravelpro.com/api/cron/granatum',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 ) into request_id;
 return request_id;
end $$;
revoke all on function public.travelpro_granatum_enqueue() from public,anon,authenticated;
revoke all on net.http_request_queue from public,anon,authenticated;
grant execute on function public.travelpro_granatum_enqueue() to service_role;
select cron.schedule('travelpro-granatum-sync','* * * * *','select public.travelpro_granatum_enqueue()');
commit;
