begin;

create extension if not exists pgcrypto;

create type public.profile_role as enum (
  'admin',
  'planner',
  'engineer',
  'store',
  'qa',
  'production',
  'dispatch'
);

create type public.workflow_stage as enum (
  'order_received',
  'engineering_review',
  'project_planning',
  'procurement',
  'material_receipt',
  'incoming_inspection',
  'production',
  'quality_inspection',
  'final_inspection_dispatch'
);

create type public.document_status as enum ('draft', 'under_review', 'approved', 'obsolete', 'rejected');
create type public.order_status as enum ('draft', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold');
create type public.po_status as enum ('draft', 'issued', 'partially_received', 'received', 'cancelled', 'closed');
create type public.receipt_status as enum ('pending_inspection', 'accepted', 'rejected', 'partially_accepted');
create type public.inspection_result as enum ('pending', 'accepted', 'rejected', 'conditionally_accepted');
create type public.job_status as enum ('planned', 'released', 'in_progress', 'paused', 'completed', 'cancelled');
create type public.ncr_status as enum ('open', 'under_disposition', 'corrective_action', 'closed', 'rejected');
create type public.action_status as enum ('open', 'in_progress', 'completed', 'verified', 'cancelled');
create type public.dispatch_status as enum ('planned', 'packed', 'dispatched', 'delivered', 'cancelled');
create type public.workflow_result as enum ('pending', 'passed', 'failed', 'skipped', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code varchar(50),
  full_name varchar(150) not null,
  email varchar(320) not null,
  phone varchar(30),
  role public.profile_role not null default 'planner',
  department varchar(100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_code),
  unique (email)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(200) not null,
  email varchar(320),
  phone varchar(30),
  contact_person varchar(150),
  billing_address text,
  shipping_address text,
  gst_number varchar(30),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(50) not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_po_number varchar(100),
  description text not null,
  order_date date not null default current_date,
  required_delivery_date date,
  status public.order_status not null default 'draft',
  priority integer not null default 3 check (priority between 1 and 5),
  currency char(3) not null default 'INR',
  total_value numeric(14,2) check (total_value >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (required_delivery_date is null or required_delivery_date >= order_date)
);

create table public.engineering_drawings (
  id uuid primary key default gen_random_uuid(),
  drawing_number varchar(100) not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  title varchar(250) not null,
  discipline varchar(100),
  description text,
  current_revision_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drawing_revisions (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references public.engineering_drawings(id) on delete cascade,
  revision_code varchar(30) not null,
  revision_number integer not null check (revision_number > 0),
  status public.document_status not null default 'draft',
  storage_bucket varchar(100),
  storage_object_path text,
  file_name varchar(255),
  file_size bigint check (file_size is null or file_size >= 0),
  change_summary text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drawing_id, revision_code),
  unique (drawing_id, revision_number)
);

alter table public.engineering_drawings
  add constraint engineering_drawings_current_revision_fk
  foreign key (current_revision_id) references public.drawing_revisions(id) on delete set null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code varchar(50) not null unique,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  name varchar(200) not null check (btrim(name) <> ''),
  start_date date,
  planned_end_date date,
  actual_end_date date,
  status public.job_status not null default 'planned',
  project_manager_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (planned_end_date is null or start_date is null or planned_end_date >= start_date),
  check (actual_end_date is null or start_date is null or actual_end_date >= start_date)
);

create table public.bom_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_bom_item_id uuid references public.bom_items(id) on delete restrict,
  item_code varchar(100) not null,
  description text not null,
  drawing_revision_id uuid references public.drawing_revisions(id),
  quantity numeric(14,4) not null check (quantity > 0),
  unit varchar(30) not null,
  material_specification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, item_code)
);

create table public.quality_plans (
  id uuid primary key default gen_random_uuid(),
  plan_number varchar(50) not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  bom_item_id uuid references public.bom_items(id) on delete set null,
  title varchar(200) not null,
  revision varchar(30) not null default '0',
  status public.document_status not null default 'draft',
  inspection_points jsonb not null default '[]'::jsonb,
  storage_bucket varchar(100),
  storage_object_path text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, bom_item_id, plan_number)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(200) not null,
  email varchar(320),
  phone varchar(30),
  contact_person varchar(150),
  address text,
  gst_number varchar(30),
  approved boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number varchar(50) not null unique,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  project_id uuid references public.projects(id),
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  expected_delivery_date date,
  currency char(3) not null default 'INR',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_delivery_date is null or expected_delivery_date >= order_date)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  bom_item_id uuid references public.bom_items(id),
  item_code varchar(100) not null,
  description text not null,
  ordered_quantity numeric(14,4) not null check (ordered_quantity > 0),
  received_quantity numeric(14,4) not null default 0 check (received_quantity >= 0),
  unit varchar(30) not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_order_id, item_code),
  check (received_quantity <= ordered_quantity)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  material_code varchar(100) not null unique,
  name varchar(200) not null,
  description text,
  unit varchar(30) not null,
  specification text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.material_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number varchar(50) not null unique,
  purchase_order_item_id uuid not null references public.purchase_order_items(id) on delete restrict,
  material_id uuid references public.materials(id),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  received_quantity numeric(14,4) not null check (received_quantity > 0),
  unit varchar(30) not null,
  received_at timestamptz not null default now(),
  heat_number varchar(100),
  batch_number varchar(100),
  status public.receipt_status not null default 'pending_inspection',
  received_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_number, purchase_order_item_id)
);

create table public.incoming_inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number varchar(50) not null unique,
  material_receipt_id uuid not null unique references public.material_receipts(id) on delete cascade,
  inspection_date date not null default current_date,
  result public.inspection_result not null default 'pending',
  observations jsonb not null default '{}'::jsonb,
  inspected_quantity numeric(14,4) check (inspected_quantity >= 0),
  accepted_quantity numeric(14,4) not null default 0 check (accepted_quantity >= 0),
  rejected_quantity numeric(14,4) not null default 0 check (rejected_quantity >= 0),
  inspector_id uuid references public.profiles(id),
  remarks text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accepted_quantity + rejected_quantity <= coalesce(inspected_quantity, accepted_quantity + rejected_quantity))
);

create table public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  job_number varchar(50) not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  bom_item_id uuid references public.bom_items(id),
  quality_plan_id uuid references public.quality_plans(id),
  drawing_revision_id uuid references public.drawing_revisions(id),
  status public.job_status not null default 'planned',
  quantity numeric(14,4) not null check (quantity > 0),
  completed_quantity numeric(14,4) not null default 0 check (completed_quantity >= 0),
  rejected_quantity numeric(14,4) not null default 0 check (rejected_quantity >= 0),
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  supervisor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_quantity + rejected_quantity <= quantity),
  check (planned_end_at is null or planned_start_at is null or planned_end_at >= planned_start_at),
  check (actual_end_at is null or actual_start_at is null or actual_end_at >= actual_start_at)
);

create table public.production_stages (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  stage_sequence integer not null check (stage_sequence > 0),
  name varchar(150) not null,
  description text,
  status public.job_status not null default 'planned',
  quantity numeric(14,4) check (quantity >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  operator_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (production_job_id, stage_sequence),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.quality_inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number varchar(50) not null unique,
  production_job_id uuid references public.production_jobs(id) on delete set null,
  production_stage_id uuid references public.production_stages(id) on delete set null,
  quality_plan_id uuid references public.quality_plans(id),
  inspection_date date not null default current_date,
  result public.inspection_result not null default 'pending',
  observations jsonb not null default '{}'::jsonb,
  measured_values jsonb not null default '{}'::jsonb,
  inspector_id uuid references public.profiles(id),
  remarks text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (production_job_id is not null and production_stage_id is null)
    or (production_stage_id is not null)
  )
);

create table public.non_conformance_reports (
  id uuid primary key default gen_random_uuid(),
  ncr_number varchar(50) not null unique,
  quality_inspection_id uuid references public.quality_inspections(id) on delete set null,
  incoming_inspection_id uuid references public.incoming_inspections(id) on delete set null,
  production_job_id uuid references public.production_jobs(id) on delete set null,
  title varchar(200) not null,
  description text not null,
  severity varchar(20) not null check (severity in ('minor', 'major', 'critical')),
  status public.ncr_status not null default 'open',
  containment_action text,
  disposition text,
  reported_by uuid references public.profiles(id),
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    quality_inspection_id is not null
    or incoming_inspection_id is not null
    or production_job_id is not null
  )
);

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  action_number varchar(50) not null unique,
  ncr_id uuid not null references public.non_conformance_reports(id) on delete cascade,
  title varchar(200) not null,
  description text not null,
  root_cause text,
  corrective_measure text,
  preventive_measure text,
  status public.action_status not null default 'open',
  owner_id uuid references public.profiles(id),
  due_date date,
  completed_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reinspection_records (
  id uuid primary key default gen_random_uuid(),
  reinspection_number varchar(50) not null unique,
  ncr_id uuid not null references public.non_conformance_reports(id) on delete cascade,
  corrective_action_id uuid references public.corrective_actions(id) on delete set null,
  inspection_date date not null default current_date,
  result public.inspection_result not null default 'pending',
  observations jsonb not null default '{}'::jsonb,
  inspector_id uuid references public.profiles(id),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.final_inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number varchar(50) not null unique,
  production_job_id uuid not null unique references public.production_jobs(id) on delete cascade,
  result public.inspection_result not null default 'pending',
  inspection_date date not null default current_date,
  certificate_number varchar(100),
  observations jsonb not null default '{}'::jsonb,
  inspected_quantity numeric(14,4) check (inspected_quantity >= 0),
  accepted_quantity numeric(14,4) not null default 0 check (accepted_quantity >= 0),
  rejected_quantity numeric(14,4) not null default 0 check (rejected_quantity >= 0),
  inspector_id uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (certificate_number)
);

create table public.quality_documents (
  id uuid primary key default gen_random_uuid(),
  document_number varchar(100) not null,
  document_type varchar(100) not null,
  title varchar(250) not null,
  revision varchar(30) not null default '0',
  status public.document_status not null default 'draft',
  project_id uuid references public.projects(id),
  production_job_id uuid references public.production_jobs(id),
  quality_inspection_id uuid references public.quality_inspections(id),
  storage_bucket varchar(100) not null,
  storage_object_path text not null,
  file_name varchar(255) not null,
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type varchar(150),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_object_path),
  unique (document_number, revision)
);

create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number varchar(50) not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  final_inspection_id uuid not null unique references public.final_inspections(id) on delete restrict,
  status public.dispatch_status not null default 'planned',
  quantity numeric(14,4) not null check (quantity > 0),
  dispatch_date date,
  vehicle_number varchar(50),
  lr_number varchar(100),
  destination text,
  dispatched_by uuid references public.profiles(id),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lr_number)
);

create table public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  workflow_stage public.workflow_stage not null,
  entity_type varchar(100) not null,
  entity_id uuid not null,
  from_status varchar(100),
  to_status varchar(100),
  result public.workflow_result not null default 'pending',
  remarks text,
  performed_by uuid references public.profiles(id),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name varchar(100) not null,
  record_id uuid,
  action varchar(20) not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references public.profiles(id),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (old_data is not null or new_data is not null)
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_status_idx on public.orders(status);
create index engineering_drawings_order_id_idx on public.engineering_drawings(order_id);
create index drawing_revisions_drawing_id_idx on public.drawing_revisions(drawing_id);
create index projects_order_id_idx on public.projects(order_id);
create index bom_items_project_id_idx on public.bom_items(project_id);
create index bom_items_parent_id_idx on public.bom_items(parent_bom_item_id);
create index quality_plans_project_id_idx on public.quality_plans(project_id);
create index purchase_orders_supplier_id_idx on public.purchase_orders(supplier_id);
create index purchase_orders_project_id_idx on public.purchase_orders(project_id);
create index purchase_order_items_po_id_idx on public.purchase_order_items(purchase_order_id);
create index material_receipts_po_item_id_idx on public.material_receipts(purchase_order_item_id);
create index material_receipts_supplier_id_idx on public.material_receipts(supplier_id);
create index production_jobs_project_id_idx on public.production_jobs(project_id);
create index production_jobs_status_idx on public.production_jobs(status);
create index production_stages_job_id_idx on public.production_stages(production_job_id);
create index quality_inspections_job_id_idx on public.quality_inspections(production_job_id);
create index quality_inspections_stage_id_idx on public.quality_inspections(production_stage_id);
create index ncr_status_idx on public.non_conformance_reports(status);
create index corrective_actions_ncr_id_idx on public.corrective_actions(ncr_id);
create index reinspection_records_ncr_id_idx on public.reinspection_records(ncr_id);
create index quality_documents_project_id_idx on public.quality_documents(project_id);
create index dispatches_order_id_idx on public.dispatches(order_id);
create index workflow_history_entity_idx on public.workflow_history(entity_type, entity_id);
create index workflow_history_stage_idx on public.workflow_history(workflow_stage);
create index audit_logs_table_record_idx on public.audit_logs(table_name, record_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','customers','orders','engineering_drawings','drawing_revisions','projects',
    'bom_items','quality_plans','suppliers','purchase_orders','purchase_order_items',
    'materials','material_receipts','incoming_inspections','production_jobs','production_stages',
    'quality_inspections','non_conformance_reports','corrective_actions','reinspection_records',
    'final_inspections','quality_documents','dispatches','workflow_history','audit_logs'
  ]
  loop
    execute format(
      'create trigger set_updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_record jsonb;
  new_record jsonb;
  record_id uuid;
begin
  old_record := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_record := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  record_id := case
    when new_record is not null then nullif(new_record->>'id', '')::uuid
    when old_record is not null then nullif(old_record->>'id', '')::uuid
    else null
  end;

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  )
  values (
    tg_table_name,
    record_id,
    tg_op,
    old_record,
    new_record,
    auth.uid()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','customers','orders','engineering_drawings','drawing_revisions','projects',
    'bom_items','quality_plans','suppliers','purchase_orders','purchase_order_items',
    'materials','material_receipts','incoming_inspections','production_jobs','production_stages',
    'quality_inspections','non_conformance_reports','corrective_actions','reinspection_records',
    'final_inspections','quality_documents','dispatches'
  ]
  loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row_change()',
      table_name
    );
  end loop;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.engineering_drawings enable row level security;
alter table public.drawing_revisions enable row level security;
alter table public.projects enable row level security;
alter table public.bom_items enable row level security;
alter table public.quality_plans enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.materials enable row level security;
alter table public.material_receipts enable row level security;
alter table public.incoming_inspections enable row level security;
alter table public.production_jobs enable row level security;
alter table public.production_stages enable row level security;
alter table public.quality_inspections enable row level security;
alter table public.non_conformance_reports enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.reinspection_records enable row level security;
alter table public.final_inspections enable row level security;
alter table public.quality_documents enable row level security;
alter table public.dispatches enable row level security;
alter table public.workflow_history enable row level security;
alter table public.audit_logs enable row level security;

create function public.current_user_role()
returns public.profile_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create policy "profiles_read_self_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers','orders','engineering_drawings','drawing_revisions','projects','bom_items',
    'quality_plans','suppliers','purchase_orders','purchase_order_items','materials',
    'material_receipts','incoming_inspections','production_jobs','production_stages',
    'quality_inspections','non_conformance_reports','corrective_actions','reinspection_records',
    'final_inspections','quality_documents','dispatches','workflow_history','audit_logs'
  ]
  loop
    execute format(
      'create policy "%1$s_authenticated_read" on public.%1$I for select to authenticated using (true)',
      table_name
    );
  end loop;
end;
$$;

commit;
