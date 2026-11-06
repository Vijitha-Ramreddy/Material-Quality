begin;

alter table public.projects add column if not exists approved_by uuid references public.profiles(id);
alter table public.projects add column if not exists approved_at timestamptz;

alter table public.bom_items
  add column if not exists status public.document_status not null default 'draft',
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz;

alter table public.quality_plans add column if not exists approved_by uuid references public.profiles(id);
alter table public.quality_plans add column if not exists approved_at timestamptz;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name varchar(200) not null check (btrim(name) <> ''),
  description text,
  due_date date,
  status varchar(30) not null default 'planned' check (status in ('planned','in_progress','completed','delayed','cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quality_plan_inspection_points (
  id uuid primary key default gen_random_uuid(),
  quality_plan_id uuid not null references public.quality_plans(id) on delete cascade,
  stage varchar(150) not null check (btrim(stage) <> ''),
  inspection_requirement text not null,
  acceptable_min numeric(14,4),
  acceptable_max numeric(14,4),
  unit varchar(30),
  inspection_method varchar(150),
  required_certificates text[] not null default '{}',
  hold_point boolean not null default false,
  sequence integer not null default 1 check (sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (acceptable_min is null or acceptable_max is null or acceptable_min <= acceptable_max),
  unique (quality_plan_id, sequence)
);

create index if not exists project_milestones_project_id_idx on public.project_milestones(project_id);
create index if not exists quality_plan_points_plan_id_idx on public.quality_plan_inspection_points(quality_plan_id);

create or replace function public.ensure_planning_approved()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_exists boolean;
  unapproved_bom boolean;
  unapproved_plan boolean;
begin
  if new.status in ('approved','ordered','issued','partially_received','received','fully_received','closed') and new.project_id is not null then
    select exists(select 1 from public.projects where id = new.project_id) into project_exists;
    if not project_exists then
      raise exception 'Purchase order project does not exist';
    end if;

    select exists(select 1 from public.bom_items where project_id = new.project_id
                  and status <> 'approved')
      into unapproved_bom;
    select exists(select 1 from public.quality_plans where project_id = new.project_id
                  and status <> 'approved')
      into unapproved_plan;

    if unapproved_bom then
      raise exception 'Procurement release blocked: BOM is not fully approved';
    end if;
    if unapproved_plan then
      raise exception 'Procurement release blocked: quality plan is not approved';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_order_planning_release_guard on public.purchase_orders;
create trigger purchase_order_planning_release_guard
before insert or update of status on public.purchase_orders
for each row execute function public.ensure_planning_approved();

alter table public.project_milestones enable row level security;
alter table public.quality_plan_inspection_points enable row level security;

create policy if not exists project_milestones_planning_manage
on public.project_milestones for all to authenticated
using (public.has_role(array['admin','sales_projects','engineering','planning_procurement']))
with check (public.has_role(array['admin','sales_projects','engineering','planning_procurement']));

create policy if not exists quality_plan_points_manage
on public.quality_plan_inspection_points for all to authenticated
using (public.has_role(array['admin','engineering','quality_assurance']))
with check (public.has_role(array['admin','engineering','quality_assurance']));

create policy if not exists project_milestone_read
on public.project_milestones for select to authenticated
using (public.current_user_active());

create policy if not exists quality_plan_point_read
on public.quality_plan_inspection_points for select to authenticated
using (public.current_user_active());

commit;
