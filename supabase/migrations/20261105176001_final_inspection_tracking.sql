begin;

alter table public.final_inspections
  add column if not exists remarks text,
  add column if not exists dimensional_results jsonb not null default '{}'::jsonb,
  add column if not exists functional_results jsonb not null default '{}'::jsonb,
  add column if not exists measurements jsonb not null default '[]'::jsonb,
  add column if not exists customer_inspection_required boolean not null default false,
  add column if not exists customer_inspector_name varchar(200),
  add column if not exists customer_inspector_company varchar(200),
  add column if not exists third_party_inspector_name varchar(200),
  add column if not exists third_party_inspector_company varchar(200),
  add column if not exists certificate_storage_bucket varchar(100),
  add column if not exists certificate_storage_path text,
  add column if not exists certificate_file_name varchar(255),
  add column if not exists inspection_completed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id);

create table if not exists public.final_inspection_measurements (
  id uuid primary key default gen_random_uuid(),
  final_inspection_id uuid not null references public.final_inspections(id) on delete cascade,
  inspection_type varchar(20) not null check (inspection_type in ('dimensional','functional')),
  characteristic varchar(200) not null,
  unit varchar(30),
  minimum_limit numeric(18,6),
  maximum_limit numeric(18,6),
  measured_value numeric(18,6),
  result varchar(10) not null default 'pending' check (result in ('pending','pass','fail')),
  remarks text,
  created_at timestamptz not null default now(),
  check (maximum_limit is null or minimum_limit is null or maximum_limit >= minimum_limit)
);

create or replace function public.final_acceptance_ready(job_id uuid)
returns table(job_ready boolean, reason text)
language plpgsql
stable
security invoker
set search_path=''
as $$
declare
  p_id uuid; ord_id uuid;
begin
  select project_id into p_id from public.production_jobs where id=job_id;
  select order_id into ord_id from public.projects where id=p_id;
  if p_id is null then return query select false,'Production job not found.'; return; end;
  if not exists(select 1 from public.production_jobs where id=job_id and status='completed') then
    return query select false,'Production job is not completed.'; return;
  end if;
  if exists(select 1 from public.production_stages where production_job_id=job_id and status <> 'completed') then
    return query select false,'One or more production stages are incomplete.'; return;
  end if;
  if not exists(
    select 1 from public.engineering_drawings ed
    join public.drawing_revisions dr on dr.id=ed.current_revision_id
    where ed.order_id=ord_id and ed.current_revision_id is not null and dr.status='approved'
  ) then return query select false,'Approved engineering drawing is missing.'; return; end if;
  if exists(select 1 from public.bom_items where project_id=p_id and status <> 'approved') then
    return query select false,'BOM approval is incomplete.'; return;
  end if;
  if exists(
    select 1 from public.purchase_orders po
    join public.purchase_order_items poi on poi.purchase_order_id=po.id
    join public.material_receipts mr on mr.purchase_order_item_id=poi.id
    join public.incoming_inspections ii on ii.material_receipt_id=mr.id
    where po.project_id=p_id and ii.result <> 'accepted'
  ) then return query select false,'An incoming material inspection is not accepted.'; return; end if;
  if exists(
    select 1 from public.quality_inspections qi
    where qi.production_job_id=job_id and qi.production_stage_id is not null
      and qi.result not in ('accepted','conditionally_accepted')
  ) then return query select false,'Mandatory in-process inspection results are incomplete.'; return; end if;
  if exists(
    select 1 from public.non_conformance_reports
    where production_job_id=job_id or quality_inspection_id in (
      select id from public.quality_inspections where production_job_id=job_id
    )
    and status <> 'closed' and work_held=true
  ) then return query select false,'Open NCRs remain unresolved.'; return; end if;
  return query select true,'All final acceptance prerequisites are complete.';
end;
$$;

create or replace function public.validate_final_acceptance()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare ready boolean; reason text;
begin
  if new.result::text='accepted' and old.result::text is distinct from new.result::text then
    select r.job_ready,r.reason into ready,reason from public.final_acceptance_ready(new.production_job_id) r;
    if not ready then raise exception 'Final acceptance blocked: %',reason; end if;
    new.approved_by=(select auth.uid());
    new.approved_at=now();
    new.inspection_completed_at=coalesce(new.inspection_completed_at,now());
  elsif new.result::text='rejected' and old.result::text is distinct from new.result::text then
    new.rejected_by=(select auth.uid());
    new.rejected_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists final_acceptance_guard on public.final_inspections;
create trigger final_acceptance_guard before update of result on public.final_inspections
for each row execute function public.validate_final_acceptance();

alter table public.final_inspection_measurements enable row level security;
create policy if not exists final_measurement_read on public.final_inspection_measurements for select to authenticated using(public.current_user_active());
create policy if not exists final_measurement_manage on public.final_inspection_measurements for all to authenticated
using(public.has_role(array['admin','quality_assurance'])) with check(public.has_role(array['admin','quality_assurance']));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('final-inspection-certificates','final-inspection-certificates',false,20971520,array[
  'application/pdf','image/png','image/jpeg',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy if not exists final_inspection_certificate_manage on storage.objects for all to authenticated
using(bucket_id='final-inspection-certificates' and public.has_role(array['admin','quality_assurance']))
with check(bucket_id='final-inspection-certificates' and public.has_role(array['admin','quality_assurance']));

commit;
