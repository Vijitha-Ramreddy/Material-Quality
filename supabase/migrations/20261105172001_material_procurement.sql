begin;

create table if not exists public.material_stock (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.materials(id) on delete cascade,
  quantity_on_hand numeric(14,4) not null default 0 check (quantity_on_hand >= 0),
  reserved_quantity numeric(14,4) not null default 0 check (reserved_quantity >= 0),
  reorder_level numeric(14,4) not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_quantity <= quantity_on_hand)
);

create table if not exists public.material_stock_transactions (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  transaction_type varchar(20) not null check (transaction_type in ('receipt','issue','adjustment','return')),
  quantity numeric(14,4) not null check (quantity > 0),
  reference_type varchar(50),
  reference_id uuid,
  remarks text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  requisition_number varchar(50) not null unique,
  project_id uuid not null references public.projects(id) on delete restrict,
  status varchar(30) not null default 'draft' check (status in ('draft','pending_approval','approved','ordered','cancelled')),
  notes text,
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.purchase_requisitions(id) on delete cascade,
  bom_item_id uuid not null references public.bom_items(id) on delete restrict,
  material_id uuid references public.materials(id),
  requested_quantity numeric(14,4) not null check (requested_quantity > 0),
  unit varchar(30) not null,
  created_at timestamptz not null default now(),
  unique (requisition_id, bom_item_id)
);

alter table public.purchase_orders add column if not exists requisition_id uuid references public.purchase_requisitions(id) on delete restrict;
alter table public.purchase_order_items add column if not exists bom_item_id uuid references public.bom_items(id) on delete restrict;

create index if not exists material_stock_material_id_idx on public.material_stock(material_id);
create index if not exists stock_transactions_material_id_idx on public.material_stock_transactions(material_id);
create index if not exists requisitions_project_id_idx on public.purchase_requisitions(project_id);
create index if not exists requisition_items_bom_id_idx on public.purchase_requisition_items(bom_item_id);
create index if not exists po_requisition_id_idx on public.purchase_orders(requisition_id);

create or replace function public.validate_purchase_order_items()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  po_project uuid;
  bom_project uuid;
begin
  if new.bom_item_id is null then
    raise exception 'Every purchase order item must reference an approved BOM requirement';
  end if;
  select project_id into po_project from public.purchase_orders where id = new.purchase_order_id;
  select project_id into bom_project from public.bom_items where id = new.bom_item_id;
  if po_project is distinct from bom_project then
    raise exception 'Purchase order item BOM requirement belongs to a different project';
  end if;
  if not exists (select 1 from public.bom_items where id = new.bom_item_id and status = 'approved') then
    raise exception 'Purchase order item BOM requirement is not approved';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_po_item_bom on public.purchase_order_items;
create trigger validate_po_item_bom before insert or update of bom_item_id, purchase_order_id
on public.purchase_order_items for each row execute function public.validate_purchase_order_items();

create or replace function public.requisition_number()
returns text
language plpgsql security invoker set search_path=''
as $$
begin
  return 'PR-' || to_char(current_date, 'YYYY') || '-' ||
    lpad((coalesce((select max((substring(requisition_number from '[0-9]+$'))::integer)
                  from public.purchase_requisitions), 0) + 1)::text, 3, '0');
end;
$$;

alter table public.material_stock enable row level security;
alter table public.material_stock_transactions enable row level security;
alter table public.purchase_requisitions enable row level security;
alter table public.purchase_requisition_items enable row level security;

create policy if not exists material_stock_planning_manage on public.material_stock for all to authenticated
using (public.has_role(array['admin','planning_procurement','stores']))
with check (public.has_role(array['admin','planning_procurement','stores']));

create policy if not exists material_stock_read on public.material_stock for select to authenticated using (public.current_user_active());

create policy if not exists stock_transactions_manage on public.material_stock_transactions for all to authenticated
using (public.has_role(array['admin','planning_procurement','stores']))
with check (public.has_role(array['admin','planning_procurement','stores']));

create policy if not exists requisition_manage on public.purchase_requisitions for all to authenticated
using (public.has_role(array['admin','planning_procurement']))
with check (public.has_role(array['admin','planning_procurement']));

create policy if not exists requisition_items_manage on public.purchase_requisition_items for all to authenticated
using (public.has_role(array['admin','planning_procurement']))
with check (public.has_role(array['admin','planning_procurement']));

commit;
