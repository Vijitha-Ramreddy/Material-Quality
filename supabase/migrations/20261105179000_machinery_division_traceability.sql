begin;

alter table public.orders add column if not exists equipment_type varchar(200);
alter table public.materials add column if not exists material_category varchar(50);
alter table public.materials add column if not exists steel_grade varchar(100);
alter table public.materials add column if not exists standard_designation varchar(100);
alter table public.material_receipts add column if not exists steel_grade varchar(100);
alter table public.material_receipts add column if not exists material_standard varchar(100);
alter table public.material_receipts add column if not exists thickness_mm numeric(14,3) check (thickness_mm is null or thickness_mm > 0);
alter table public.material_receipts add column if not exists section_size varchar(100);
alter table public.material_receipts add column if not exists dimensions text;
alter table public.production_material_consumption add column if not exists material_receipt_id uuid references public.material_receipts(id) on delete restrict;
alter table public.production_material_consumption add column if not exists material_traceability_id uuid;
alter table public.production_material_consumption add column if not exists scrap_quantity numeric(14,4) not null default 0 check (scrap_quantity >= 0);

create table if not exists public.material_test_certificates (
  id uuid primary key default gen_random_uuid(),
  mtc_number varchar(100) not null unique,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  material_receipt_id uuid not null unique references public.material_receipts(id) on delete cascade,
  heat_number varchar(100) not null,
  steel_grade varchar(100),
  material_standard varchar(100),
  chemical_composition jsonb not null default '{}'::jsonb,
  mechanical_properties jsonb not null default '{}'::jsonb,
  certificate_status varchar(20) not null default 'pending'
    check (certificate_status in ('pending','verified','accepted','rejected')),
  storage_bucket varchar(100),
  storage_path text,
  file_name varchar(255),
  issued_by varchar(200),
  issued_on date,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weld_records (
  id uuid primary key default gen_random_uuid(),
  weld_number varchar(100) not null,
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  production_stage_id uuid references public.production_stages(id) on delete set null,
  joint_number varchar(100),
  welder_id varchar(100),
  welding_process varchar(100) not null,
  welding_position varchar(50),
  filler_material varchar(100),
  filler_heat_or_batch varchar(100),
  base_material_grade varchar(100),
  wps_number varchar(100),
  weld_date date,
  result varchar(20) not null default 'pending'
    check (result in ('pending','accepted','rejected','repair_required')),
  remarks text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (production_job_id, weld_number)
);

create table if not exists public.ndt_records (
  id uuid primary key default gen_random_uuid(),
  ndt_number varchar(100) not null unique,
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  weld_record_id uuid references public.weld_records(id) on delete set null,
  quality_inspection_id uuid references public.quality_inspections(id) on delete set null,
  ndt_method varchar(20) not null check (ndt_method in ('VT','UT','RT','MT','PT','PAUT','TOFD')),
  acceptance_standard varchar(100),
  procedure_number varchar(100),
  technician varchar(200),
  test_date date,
  indications jsonb not null default '[]'::jsonb,
  result varchar(20) not null default 'pending' check (result in ('pending','acceptable','rejected','reinspect')),
  report_storage_bucket varchar(100),
  report_storage_path text,
  report_file_name varchar(255),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hydrostatic_tests (
  id uuid primary key default gen_random_uuid(),
  test_number varchar(100) not null unique,
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  equipment_tag varchar(100),
  test_medium varchar(100) not null default 'Water',
  test_pressure numeric(14,4) not null check (test_pressure > 0),
  pressure_unit varchar(20) not null default 'bar',
  holding_time_minutes numeric(10,2) not null check (holding_time_minutes > 0),
  test_temperature numeric(8,2),
  calibrated_gauge_numbers text,
  test_date date,
  result varchar(20) not null default 'pending'
    check (result in ('pending','passed','failed','reinspect')),
  report_storage_bucket varchar(100),
  report_storage_path text,
  report_file_name varchar(255),
  witnessed_by varchar(200),
  witness_organization varchar(200),
  remarks text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manufacturing_traceability (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  production_stage_id uuid references public.production_stages(id) on delete set null,
  material_receipt_id uuid not null references public.material_receipts(id) on delete restrict,
  bom_item_id uuid references public.bom_items(id) on delete set null,
  finished_equipment_serial varchar(100),
  component_identification varchar(100),
  heat_number varchar(100),
  batch_number varchar(100),
  consumed_quantity numeric(14,4) not null check (consumed_quantity > 0),
  scrap_quantity numeric(14,4) not null default 0 check (scrap_quantity >= 0),
  unit varchar(30) not null,
  dispatch_id uuid references public.dispatches(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (production_job_id, production_stage_id, material_receipt_id, component_identification)
);

create index if not exists mtc_receipt_idx on public.material_test_certificates(material_receipt_id);
create index if not exists mtc_heat_idx on public.material_test_certificates(heat_number);
create index if not exists weld_job_idx on public.weld_records(production_job_id);
create index if not exists weld_number_idx on public.weld_records(weld_number);
create index if not exists ndt_job_idx on public.ndt_records(production_job_id);
create index if not exists hydro_job_idx on public.hydrostatic_tests(production_job_id);
create index if not exists trace_receipt_idx on public.manufacturing_traceability(material_receipt_id);
create index if not exists trace_serial_idx on public.manufacturing_traceability(finished_equipment_serial);
create index if not exists trace_heat_idx on public.manufacturing_traceability(heat_number);

alter table public.production_material_consumption
  add constraint production_consumption_receipt_fk
  foreign key (material_receipt_id) references public.material_receipts(id) on delete restrict;

alter table public.production_material_consumption
  add constraint production_consumption_trace_fk
  foreign key (material_traceability_id) references public.manufacturing_traceability(id) on delete set null;

alter table public.material_test_certificates enable row level security;
alter table public.weld_records enable row level security;
alter table public.ndt_records enable row level security;
alter table public.hydrostatic_tests enable row level security;
alter table public.manufacturing_traceability enable row level security;

create policy if not exists mtc_quality_read on public.material_test_certificates for select to authenticated using(public.current_user_active());
create policy if not exists mtc_quality_manage on public.material_test_certificates for all to authenticated
using(public.has_role(array['admin','stores','quality_assurance'])) with check(public.has_role(array['admin','stores','quality_assurance']));
create policy if not exists machinery_quality_read on public.weld_records for select to authenticated using(public.current_user_active());
create policy if not exists machinery_quality_manage on public.weld_records for all to authenticated
using(public.has_role(array['admin','production','quality_assurance'])) with check(public.has_role(array['admin','production','quality_assurance']));
create policy if not exists machinery_ndt_read on public.ndt_records for select to authenticated using(public.current_user_active());
create policy if not exists machinery_ndt_manage on public.ndt_records for all to authenticated
using(public.has_role(array['admin','quality_assurance'])) with check(public.has_role(array['admin','quality_assurance']));
create policy if not exists machinery_hydro_read on public.hydrostatic_tests for select to authenticated using(public.current_user_active());
create policy if not exists machinery_hydro_manage on public.hydrostatic_tests for all to authenticated
using(public.has_role(array['admin','quality_assurance','production'])) with check(public.has_role(array['admin','quality_assurance','production']));
create policy if not exists machinery_trace_read on public.manufacturing_traceability for select to authenticated using(public.current_user_active());
create policy if not exists machinery_trace_manage on public.manufacturing_traceability for all to authenticated
using(public.has_role(array['admin','production','quality_assurance','stores','logistics'])) with check(public.has_role(array['admin','production','quality_assurance','stores']));

commit;
