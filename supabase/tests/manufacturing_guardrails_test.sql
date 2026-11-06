begin;

do $$
begin
  if to_regclass('public.manufacturing_workflows') is null then
    raise exception 'manufacturing_workflows migration is missing';
  end if;
  if to_regprocedure('public.transition_manufacturing_workflow(uuid,text,text,text)') is null then
    raise exception 'workflow transition RPC is missing';
  end if;
  if to_regprocedure('public.dispatch_release_ready(uuid,numeric)') is null then
    raise exception 'dispatch release guard is missing';
  end if;
  if to_regprocedure('public.final_acceptance_ready(uuid)') is null then
    raise exception 'final acceptance guard is missing';
  end if;
end;
$$;

do $$
declare
  negative_quantity_count integer;
begin
  select count(*) into negative_quantity_count
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and pg_get_constraintdef(oid) ilike '%quantity%> 0%';
  if negative_quantity_count = 0 then
    raise exception 'orders.quantity positive constraint is missing';
  end if;
end;
$$;

rollback;
