begin;

alter table public.quality_inspections
  add column if not exists ndt_results jsonb not null default '{}'::jsonb,
  add column if not exists report_storage_bucket varchar(100),
  add column if not exists report_storage_path text,
  add column if not exists report_file_name varchar(255),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id),
  add column if not exists rejected_at timestamptz;

create table if not exists public.in_process_checkpoints (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  production_stage_id uuid references public.production_stages(id) on delete cascade,
  quality_inspection_id uuid references public.quality_inspections(id) on delete cascade,
  checkpoint_name varchar(200) not null check (btrim(checkpoint_name) <> ''),
  inspection_method varchar(150),
  unit varchar(30),
  minimum_limit numeric(18,6),
  maximum_limit numeric(18,6),
  measured_value numeric(18,6),
  result varchar(10) not null default 'pending' check (result in ('pending','pass','fail')),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (maximum_limit is null or minimum_limit is null or maximum_limit >= minimum_limit)
);

alter table public.non_conformance_reports
  add column if not exists defect_description text,
  add column if not exists work_held boolean not null default false,
  add column if not exists rework_description text,
  add column if not exists reinspection_due_at timestamptz,
  add column if not exists released_by uuid references public.profiles(id),
  add column if not exists released_at timestamptz;

create index if not exists in_process_checkpoints_inspection_idx
on public.in_process_checkpoints(quality_inspection_id);
create index if not exists in_process_checkpoints_stage_idx
on public.in_process_checkpoints(production_stage_id);
create index if not exists quality_inspections_stage_result_idx
on public.quality_inspections(production_stage_id,result);

create or replace function public.process_in_process_failure()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.result::text = 'rejected' and new.production_stage_id is not null then
    update public.production_stages
    set status='on_hold', remarks=coalesce(remarks || E'\n','') || 'QA inspection rejected: stage held pending NCR disposition.'
    where id=new.production_stage_id;

    if not exists (
      select 1 from public.non_conformance_reports where quality_inspection_id=new.id
    ) then
      insert into public.non_conformance_reports(
        ncr_number,
        quality_inspection_id,production_job_id,title,description,defect_description,severity,status,work_held,
        reported_by,containment_action
      ) values (
        'NCR-IP-' || replace(gen_random_uuid()::text,'-',''),
        new.id,new.production_job_id,'Rejected in-process inspection',
        coalesce(new.remarks,'In-process inspection rejected. NCR requires disposition.'),
        coalesce(new.remarks,'Failed in-process inspection'), 'major','open',true,new.inspector_id,
        'Affected work placed on hold pending corrective action and reinspection.'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists in_process_failure_handler on public.quality_inspections;
create trigger in_process_failure_handler
after insert or update of result on public.quality_inspections
for each row execute function public.process_in_process_failure();

create or replace function public.release_held_stage(
  ncr_id uuid,
  acceptance_remarks text default null
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  ncr public.non_conformance_reports%rowtype;
begin
  if not public.has_role(array['admin','quality_assurance']) then
    raise exception 'Only QA or an administrator can release a held stage';
  end if;
  select * into ncr from public.non_conformance_reports where id=release_held_stage.ncr_id;
  if not found then raise exception 'NCR not found'; end if;
  if ncr.quality_inspection_id is null then raise exception 'NCR is not linked to an in-process inspection'; end if;
  if not exists (
    select 1 from public.reinspection_records r
    where r.ncr_id=ncr.id and r.result='accepted'
  ) then
    raise exception 'Accepted reinspection is required before release';
  end if;
  update public.production_stages ps set status='released', remarks=coalesce(ps.remarks,'') || E'\nAuthorized release: ' || coalesce(acceptance_remarks,'Accepted reinspection')
  from public.quality_inspections qi
  where ps.id=qi.production_stage_id and qi.id=ncr.quality_inspection_id;
  update public.non_conformance_reports
  set work_held=false,status='closed',disposition=coalesce(acceptance_remarks,'Released after accepted reinspection'),
      released_by=(select id from public.profiles where id=(select auth.uid())),released_at=now(),closed_by=(select id from public.profiles where id=(select auth.uid())),closed_at=now()
  where id=ncr.id;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('quality-inspection-reports','quality-inspection-reports',false,20971520,array[
  'application/pdf','image/png','image/jpeg','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.in_process_checkpoints enable row level security;
create policy if not exists in_process_checkpoints_read
on public.in_process_checkpoints for select to authenticated using(public.current_user_active());
create policy if not exists in_process_checkpoints_manage
on public.in_process_checkpoints for all to authenticated
using(public.has_role(array['admin','quality_assurance']))
with check(public.has_role(array['admin','quality_assurance']));

create policy if not exists quality_report_storage
on storage.objects for all to authenticated
using(bucket_id='quality-inspection-reports' and public.has_role(array['admin','quality_assurance']))
with check(bucket_id='quality-inspection-reports' and public.has_role(array['admin','quality_assurance']));

commit;
