begin;

alter table public.production_jobs
  add column if not exists remarks text,
  add column if not exists release_checked_at timestamptz;

alter table public.production_stages
  add column if not exists remarks text,
  add column if not exists produced_quantity numeric(14,4) not null default 0 check (produced_quantity >= 0),
  add column if not exists rejected_quantity numeric(14,4) not null default 0 check (rejected_quantity >= 0);

create table if not exists public.production_material_consumption (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  production_stage_id uuid references public.production_stages(id) on delete set null,
  bom_item_id uuid references public.bom_items(id) on delete restrict,
  material_id uuid references public.materials(id),
  quantity numeric(14,4) not null check (quantity > 0),
  unit varchar(30) not null,
  heat_number varchar(100),
  batch_number varchar(100),
  remarks text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.production_evidence (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  production_stage_id uuid references public.production_stages(id) on delete cascade,
  storage_bucket varchar(100) not null default 'production-evidence',
  storage_path text not null,
  file_name varchar(255) not null,
  evidence_type varchar(50) not null default 'production_photo',
  remarks text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists production_consumption_job_idx on public.production_material_consumption(production_job_id);
create index if not exists production_evidence_stage_idx on public.production_evidence(production_stage_id);

create or replace function public.production_release_ready(project_id uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select
    exists(select 1 from public.projects where id=production_release_ready.project_id
           and approved_at is not null)
    and not exists(select 1 from public.bom_items where project_id=production_release_ready.project_id
                   and status <> 'approved')
    and     exists(select 1 from public.quality_plans where project_id=production_release_ready.project_id
           and status='approved' and approved_at is not null)
    and exists(select 1 from public.drawing_revisions dr
               join public.engineering_drawings ed on ed.current_revision_id=dr.id
               join public.projects p on p.order_id=ed.order_id
               where p.id=production_release_ready.project_id and dr.status='approved')
    and not exists(select 1 from public.bom_items b
               where b.project_id=production_release_ready.project_id and b.status='approved'
               and not exists(select 1 from public.material_stock s
                              join public.materials m on m.id=s.material_id
                              where s.quantity_on_hand-s.reserved_quantity >= b.quantity
                                and b.item_code=m.material_code));
$$;

create or replace function public.validate_production_start()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.status::text in ('in_progress','released') and old.status::text is distinct from new.status::text then
    if not public.production_release_ready(new.project_id) then
      raise exception 'Production blocked: engineering, planning, quality and approved material availability are incomplete';
    end if;
    if new.actual_start_at is null then
      new.actual_start_at := now();
    end if;
    new.release_checked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists production_start_release_guard on public.production_jobs;
create trigger production_start_release_guard before update of status on public.production_jobs
for each row execute function public.validate_production_start();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('production-evidence','production-evidence',false,52428800,array[
'image/png','image/jpeg','application/pdf','video/mp4','application/zip'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy if not exists production_evidence_manage on storage.objects for all to authenticated
using(bucket_id='production-evidence' and public.has_role(array['admin','production']))
with check(bucket_id='production-evidence' and public.has_role(array['admin','production']));

alter table public.production_material_consumption enable row level security;
alter table public.production_evidence enable row level security;
create policy if not exists production_consumption_manage on public.production_material_consumption for all to authenticated
using(public.has_role(array['admin','production'])) with check(public.has_role(array['admin','production']));
create policy if not exists production_evidence_manage_table on public.production_evidence for all to authenticated
using(public.has_role(array['admin','production'])) with check(public.has_role(array['admin','production']));
create policy if not exists production_consumption_read on public.production_material_consumption for select to authenticated
using(public.has_role(array['admin','planning_procurement','production','quality_assurance']));
create policy if not exists production_evidence_read on public.production_evidence for select to authenticated
using(public.has_role(array['admin','planning_procurement','production','quality_assurance']));

commit;
