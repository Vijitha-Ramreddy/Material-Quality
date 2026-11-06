begin;

create table if not exists public.quality_dossiers (
  id uuid primary key default gen_random_uuid(),
  dossier_number varchar(50) not null unique,
  production_job_id uuid not null unique references public.production_jobs(id) on delete cascade,
  final_inspection_id uuid references public.final_inspections(id) on delete set null,
  status varchar(20) not null default 'draft' check (status in ('draft','in_review','complete','approved')),
  required_documents jsonb not null default '{}'::jsonb,
  document_refs jsonb not null default '[]'::jsonb,
  pdf_storage_bucket varchar(100),
  pdf_storage_path text,
  pdf_file_name varchar(255),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  remarks text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dispatches
  add column if not exists transporter_name varchar(200),
  add column if not exists transporter_contact varchar(100),
  add column if not exists eway_bill_number varchar(100),
  add column if not exists delivery_contact varchar(200),
  add column if not exists delivery_address text,
  add column if not exists dispatch_document_bucket varchar(100),
  add column if not exists dispatch_document_path text,
  add column if not exists dispatch_document_name varchar(255),
  add column if not exists remarks text;

create table if not exists public.dispatch_history (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  from_status varchar(30),
  to_status varchar(30) not null,
  remarks text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists quality_dossiers_job_idx on public.quality_dossiers(production_job_id);
create index if not exists dispatch_history_dispatch_idx on public.dispatch_history(dispatch_id);

create or replace function public.dispatch_release_ready(job_id uuid, dispatch_quantity numeric)
returns table(ready boolean, reason text)
language plpgsql
stable
security invoker
set search_path=''
as $$
declare final_id uuid; accepted_qty numeric; dossier_status text;
begin
  select fi.id,fi.accepted_quantity into final_id,accepted_qty
  from public.final_inspections fi where fi.production_job_id=job_id and fi.result='accepted'
  order by fi.created_at desc limit 1;
  if final_id is null then return query select false,'Final inspection is not accepted.'; return; end if;
  if dispatch_quantity <= 0 then return query select false,'Dispatch quantity must be positive.'; return; end if;
  select coalesce(sum(d.quantity),0) into accepted_qty from public.dispatches d
  join public.final_inspections fi on fi.id=d.final_inspection_id
  where fi.production_job_id=job_id and d.status <> 'cancelled';
  select fi.accepted_quantity into accepted_qty from public.final_inspections fi where fi.id=final_id;
  if dispatch_quantity > accepted_qty - coalesce((
    select sum(d.quantity) from public.dispatches d
    join public.final_inspections fi on fi.id=d.final_inspection_id
    where fi.production_job_id=job_id and d.status <> 'cancelled'
  ),0) then return query select false,'Dispatch quantity exceeds eligible accepted quantity.'; return; end if;
  select status into dossier_status from public.quality_dossiers where production_job_id=job_id;
  if dossier_status is distinct from 'approved' then return query select false,'Quality dossier is not approved.'; return; end if;
  if exists(select 1 from public.non_conformance_reports n
    where n.production_job_id=job_id
      and (n.status <> 'closed' or coalesce(n.work_held,false)=true)) then
    return query select false,'Mandatory NCR approvals remain incomplete.'; return;
  end if;
  return query select true,'Dispatch release prerequisites complete.';
end if;
$$;

create or replace function public.validate_dispatch_release()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare ready boolean; reason text; job_id uuid;
begin
  if tg_op='INSERT' or (new.status::text in ('packed','dispatched','delivered') and old.status::text is distinct from new.status::text) then
    select fi.production_job_id into job_id from public.final_inspections fi where fi.id=new.final_inspection_id;
    select r.ready,r.reason into ready,reason from public.dispatch_release_ready(job_id,new.quantity) r;
    if not ready then raise exception 'Dispatch blocked: %',reason; end if;
  end;
  return new;
end;
$$;

drop trigger if exists dispatch_release_guard on public.dispatches;
create trigger dispatch_release_guard before insert or update of status on public.dispatches
for each row execute function public.validate_dispatch_release();

create or replace function public.dispatch_history_guard()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='UPDATE' and new.status is distinct from old.status then
    insert into public.dispatch_history(dispatch_id,from_status,to_status,remarks,performed_by)
    values(new.id,old.status::text,new.status::text,new.remarks,(select auth.uid()));
  end if;
  return new;
end;
$$;
drop trigger if exists dispatch_history_trigger on public.dispatches;
create trigger dispatch_history_trigger after update of status on public.dispatches
for each row execute function public.dispatch_history_guard();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('quality-dossiers','quality-dossiers',false,52428800,array['application/pdf']),
       ('dispatch-documents','dispatch-documents',false,20971520,array[
         'application/pdf','image/png','image/jpeg','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.quality_dossiers enable row level security;
alter table public.dispatch_history enable row level security;
create policy if not exists quality_dossier_read on public.quality_dossiers for select to authenticated using(public.current_user_active());
create policy if not exists quality_dossier_manage on public.quality_dossiers for all to authenticated
using(public.has_role(array['admin','quality_assurance'])) with check(public.has_role(array['admin','quality_assurance']));
create policy if not exists dispatch_history_read on public.dispatch_history for select to authenticated using(public.current_user_active());
create policy if not exists dispatch_history_manage on public.dispatch_history for all to authenticated
using(public.has_role(array['admin','logistics'])) with check(public.has_role(array['admin','logistics']));
create policy if not exists quality_dossier_storage on storage.objects for all to authenticated
using(bucket_id='quality-dossiers' and public.has_role(array['admin','quality_assurance']))
with check(bucket_id='quality-dossiers' and public.has_role(array['admin','quality_assurance']));
create policy if not exists dispatch_document_storage on storage.objects for all to authenticated
using(bucket_id='dispatch-documents' and public.has_role(array['admin','logistics']))
with check(bucket_id='dispatch-documents' and public.has_role(array['admin','logistics']));

commit;
