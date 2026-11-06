-- Synthetic workflow gate validation.
-- Replace ORDER_ID with an existing synthetic customer order UUID.
-- Run with an authenticated Supabase SQL role when testing transitions.
begin;

do $$
declare
  order_id uuid;
begin
  select id into order_id from public.orders order by created_at desc limit 1;
  if order_id is null then
    raise exception 'No synthetic order available. Import seed.sql first.';
  end if;

  insert into public.manufacturing_workflows(order_id, project_id, current_stage)
  select order_id, (select id from public.projects where projects.order_id=test_workflow.order_id limit 1), 'order_received'
  from (select order_id) as test_workflow
  on conflict(order_id) do nothing;

  raise notice 'Synthetic workflow initialized for order %', order_id;
end;
$$;

-- Database-authoritative prerequisite checks:
-- Expected failure if BOM, drawings, quality, incoming QA or NCR prerequisites are incomplete.
select order_id,current_stage,workflow_status from public.manufacturing_workflows
order by last_transition_at desc limit 20;

rollback;
