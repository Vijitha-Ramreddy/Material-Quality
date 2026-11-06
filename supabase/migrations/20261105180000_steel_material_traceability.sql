begin;

alter table public.material_receipts
  add column if not exists width_mm numeric(14,3),
  add column if not exists length_mm numeric(14,3),
  add column if not exists weight_kg numeric(14,4),
  add column if not exists material_description text,
  add column if not exists mtc_required boolean not null default true;

alter table public.material_receipts
  add constraint material_receipt_width_check check (width_mm is null or width_mm > 0),
  add constraint material_receipt_length_check check (length_mm is null or length_mm > 0),
  add constraint material_receipt_weight_check check (weight_kg is null or weight_kg > 0);

create table if not exists public.steel_material_allocations (
  id uuid primary key default gen_random_uuid(),
  material_receipt_id uuid not null references public.material_receipts(id) on delete restrict,
  production_job_id uuid not null references public.production_jobs(id) on delete restrict,
  production_stage_id uuid references public.production_stages(id) on delete set null,
  bom_item_id uuid references public.bom_items(id) on delete set null,
  allocated_quantity numeric(14,4) not null check (allocated_quantity > 0),
  consumed_quantity numeric(14,4) not null default 0 check (consumed_quantity >= 0),
  scrap_quantity numeric(14,4) not null default 0 check (scrap_quantity >= 0),
  unit varchar(30) not null,
  finished_equipment_serial varchar(100),
  component_identification varchar(100),
  status varchar(20) not null default 'allocated'
    check (status in ('allocated','partially_consumed','consumed','returned','cancelled')),
  remarks text,
  allocated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (consumed_quantity + scrap_quantity <= allocated_quantity),
  unique (material_receipt_id, production_job_id, production_stage_id, component_identification)
);

create index if not exists steel_alloc_receipt_idx on public.steel_material_allocations(material_receipt_id);
create index if not exists steel_alloc_job_idx on public.steel_material_allocations(production_job_id);
create index if not exists steel_alloc_heat_idx on public.material_receipts(heat_number);
create index if not exists steel_alloc_batch_idx on public.material_receipts(batch_number);
create index if not exists steel_alloc_serial_idx on public.steel_material_allocations(finished_equipment_serial);

create or replace function public.validate_steel_material_allocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  receipt record;
  allocated numeric;
begin
  select mr.status::text, mr.received_quantity, mr.heat_number, mr.batch_number
  into receipt
  from public.material_receipts mr
  where mr.id = new.material_receipt_id;

  if receipt is null then
    raise exception 'Material receipt not found';
  end if;
  if receipt.status <> 'accepted' then
    raise exception 'Only accepted material can be allocated';
  end if;
  if coalesce(receipt.heat_number,'')='' or coalesce(receipt.batch_number,'')='' then
    raise exception 'Heat number and batch number are required for steel material allocation';
  end if;
  if exists (
    select 1 from public.material_test_certificates mtc
    where mtc.material_receipt_id = new.material_receipt_id
      and mtc.certificate_status in ('verified','accepted')
  ) = false then
    raise exception 'A verified Material Test Certificate is required before allocation';
  end;

  select coalesce(sum(allocated_quantity),0)
  into allocated
  from public.steel_material_allocations
  where material_receipt_id = new.material_receipt_id
    and status <> 'cancelled'
    and id is distinct from new.id;

  if allocated + new.allocated_quantity > receipt.received_quantity then
    raise exception 'Allocation exceeds the received quantity for material batch';
  end if;
  return new;
end;
$$;

create trigger validate_steel_material_allocation
before insert or update on public.steel_material_allocations
for each row execute function public.validate_steel_material_allocation();

create trigger set_updated_at_steel_material_allocations
before update on public.steel_material_allocations
for each row execute function public.set_updated_at();

alter table public.steel_material_allocations enable row level security;

create policy steel_allocations_read on public.steel_material_allocations for select to authenticated using(true);
create policy steel_allocations_manage on public.steel_material_allocations for all to authenticated
using(public.has_role(array['admin','planning_procurement','stores','production']))
with check(public.has_role(array['admin','planning_procurement','stores','production']));

create trigger audit_steel_material_allocations after insert or update or delete on public.steel_material_allocations
for each row execute function public.audit_row_change();

commit;
