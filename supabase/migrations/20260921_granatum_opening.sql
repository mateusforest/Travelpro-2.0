-- Opening balances are not operating income/expense and must not be counted twice.
begin;
create or replace function public.travelpro_finance_report(p_workspace uuid,p_filters jsonb) returns jsonb
language sql stable security invoker set search_path=public as $$
 with scoped as (select data d,version from travelpro_finance_entries where workspace_id=p_workspace),
 filtered as (select *,travelpro_finance_paid(d) settled,(d->>'amountCents')::bigint amount from scoped where travelpro_finance_matches(d,p_filters)),
 page as (select d||jsonb_build_object('version',version) item from filtered order by d->>(p_filters->>'basis'),d->>'id' limit least(coalesce((p_filters->>'pageSize')::integer,50),500) offset ((p_filters->>'page')::integer-1)*least(coalesce((p_filters->>'pageSize')::integer,50),500)),
 totals as (select jsonb_build_object(
 'receivable',coalesce(sum(amount-settled) filter(where d->>'type' in ('income','commission') and not (d->>'canceled')::boolean),0),
 'payable',coalesce(sum(amount-settled) filter(where d->>'type'='expense' and not (d->>'canceled')::boolean),0),
 'received',coalesce(sum(settled) filter(where d->>'type' in ('income','commission') and not (d->>'canceled')::boolean),0),
 'paid',coalesce(sum(settled) filter(where d->>'type'='expense' and not (d->>'canceled')::boolean),0),
 'overdue',coalesce(sum(amount-settled) filter(where d->>'type' not in ('transfer','opening') and not (d->>'canceled')::boolean and d->>'dueDate'<p_filters->>'today'),0),
 'legacyUndated',count(*) filter(where (d->>'legacyPaid')::boolean and not (d->>'canceled')::boolean)) value from filtered),
 flow_entries as (select d from scoped where travelpro_finance_matches(d,p_filters,false) and not (d->>'canceled')::boolean and d->>'type' not in ('transfer','opening')),
 movements as (
 select left(p->>'date',7) "month",case when d->>'type'='expense' then 'paid' else 'received' end kind,(p->>'amountCents')::bigint value from flow_entries cross join lateral jsonb_array_elements(d->'payments') p where p->>'date' between p_filters->>'from' and p_filters->>'to'
 union all select left(d->>'dueDate',7),case when d->>'type'='expense' then 'payable' else 'receivable' end,(d->>'amountCents')::bigint-travelpro_finance_paid(d) from flow_entries where d->>'dueDate' between p_filters->>'from' and p_filters->>'to'),
 months as (select "month",coalesce(sum(value) filter(where kind='received'),0) received,coalesce(sum(value) filter(where kind='paid'),0) paid,coalesce(sum(value) filter(where kind='receivable'),0) receivable,coalesce(sum(value) filter(where kind='payable'),0) payable from movements group by "month" order by "month"),
 balances as (select c.id,coalesce((c.data->>'openingCents')::bigint,0)+coalesce((select sum((p->>'amountCents')::bigint * case when d->>'type'='transfer' and d->>'toAccountId'=c.id then 1 when d->>'type' in ('expense','transfer') then -1 else 1 end) from scoped cross join lateral jsonb_array_elements(d->'payments') p where d->>'type'<>'opening' and not (d->>'canceled')::boolean and (d->>'accountId'=c.id or d->>'toAccountId'=c.id) and p->>'date' between c.data->>'openingDate' and p_filters->>'today'),0) as "balanceCents" from travelpro_finance_catalogs c where c.workspace_id=p_workspace and c.data->>'kind'='account')
 select jsonb_build_object('items',coalesce((select jsonb_agg(item) from page),'[]'),'total',(select count(*) from filtered),'summary',(select value from totals),'monthly',coalesce((select jsonb_agg(to_jsonb(months)) from months),'[]'),'balances',coalesce((select jsonb_agg(to_jsonb(balances)) from balances),'[]'));
$$;

notify pgrst,'reload schema';
commit;
