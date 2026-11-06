begin;

create table if not exists public.welding_procedure_specifications (
  id uuid primary key default gen_random_uuid(),
  wps_number varchar(100) not null unique,
  revision varchar(20) not null default '0',
  welding_process varchar(100) not null,
  base_material_grade varchar(100),
  filler_material varchar(100),
  joint_type varchar(100),
  position varchar(50),
  thickness_range text,
  parameters jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'draft'
    check (status in ('draft','approved','expired','superseded')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.welding_procedure_qualifications (
  id uuid primary key default gen_random_uuid(),
  pqr_number varchar(100) not null unique,
  wps_id uuid references public.welding_procedure_specifications(id) on delete set null,
  welding_process varchar(100),
  base_material_grade varchar(100),
  test_specimen_details jsonb not null default '{}'::jsonb,
  tensile_results jsonb not null default '{}'::jsonb,
  bend_results jsonb not null default '{}'::jsonb,
  ndt_results jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'pending'
    check (status in ('pending','qualified','rejected','expired')),
  qualification_date date,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.welder_qualification_records (
  id uuid primary key default gen_random_uuid(),
  qualification_number varchar(100) not null unique,
  welder_id varchar(100) not null,
  welder_name varchar(200) not null,
  wps_id uuid references public.welding_procedure_specifications(id) on delete restrict,
  welding_process varchar(100) not null,
  weld_positions text[] not null default '{}',
  thickness_range text,
  material_group varchar(100),
  qualification_date date,
  expiry_date date,
  status varchar(20) not null default 'pending'
    check (status in ('pending','qualified','expired','suspended')),
  certificate_storage_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_date is null or expiry_date >= qualification_date)
);

create table if not exists public.welding_quality_requirements (
  id uuid primary key default gen_random_uuid(),
  quality_plan_id uuid not null references public.quality_plans(id) on delete cascade,
  weld_class varchar(100),
  required_ndt_methods varchar(10)[] not null default '{}',
  acceptance_criteria_reference text not null,
  inspection_extent varchar(100),
  hold_point boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (required_ndt_methods <@ array['UT','RT','MT','PT']::varchar[])
);

alter table public.weld_records
  add column if not exists wps_id uuid references public.welding_procedure_specifications(id) on delete restrict,
  add column if not exists welder_qualification_id uuid references public.welder_qualification_records(id) on delete restrict,
  add column if not exists consumable_batch varchar(100),
  add column if not exists inspection_status varchar(30) not null default 'pending'
    check (inspection_status in ('pending','pass','fail','reinspection_required')),
  add column if not exists inspection_remarks text;

alter table public.ndt_records
  add column if not exists inspector_id uuid references public.profiles(id),
  add column if not exists acceptance_criteria_reference text,
  add column if not exists inspection_status varchar(30) not null default 'pending'
    check (inspection_status in ('pending','pass','fail','reinspection_required')),
  add column if not exists rework_required boolean not null default false,
  add column if not exists rework_details text,
  add column if not exists reinspect_after_at timestamptz,
  add column if not exists original_ndt_id uuid references public.ndt_records(id) on delete set null;

create index if not exists welding_wps_status_idx on public.welding_procedure_specifications(status);
create index if not exists welder_qual_welder_idx on public.welder_qualification_records(welder_id);
create index if not exists welder_qual_expiry_idx on public.welder_qualification_records(expiry_date);
create index if not exists weld_qp_plan_idx on public.welding_quality_requirements(quality_plan_id);
create index if not exists weld_records_inspection_idx on public.weld_records(inspection_status);
create index if not exists ndt_records_status_idx on public.ndt_records(inspection_status);
create index if not exists ndt_records_weld_idx on public.ndt_records(weld_record_id);

alter table public.welding_procedure_specifications enable row level security;
alter table public.welding_procedure_qualifications enable row level security;
alter table public.welder_qualification_records enable row level security;
alter table public.welding_quality_requirements enable row level security;

create policy wps_read on public.welding_procedure_specifications for select to authenticated using(true);
create policy wps_manage on public.welding_procedure_specifications for all to authenticated
  using(public.has_role(array['admin','engineering','quality_assurance']))
  with check(public.has_role(array['admin','engineering','quality_assurance']));
create policy pqr_read on public.welding_procedure_qualifications for select to authenticated using(true);
create policy pqr_manage on public.welding_procedure_qualifications for all to authenticated
  using(public.has_role(array['admin','engineering','quality_assurance']))
  with check(public.has_role(array['admin','engineering','quality_assurance']));
create policy welder_read on public.welder_qualification_records for select to authenticated using(true);
create policy welder_manage on public.welder_qualification_records for all to authenticated
  using(public.has_role(array['admin','engineering','quality_assurance']))
  with check(public.has_role(array['admin','engineering','quality_assurance']));
create policy weld_requirements_read on public.welding_quality_requirements for select to authenticated using(true);
create policy weld_requirements_manage on public.welding_quality_requirements for all to authenticated
  using(public.has_role(array['admin','quality_assurance']))
  with check(public.has_role(array['admin','quality_assurance']));

commit;
