begin;

create table if not exists public.manufacturing_workflows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  current_stage public.workflow_stage not null default 'order_received',
  workflow_status varchar(20) not null default 'in_progress'
    check (workflow_status in ('in_progress','on_hold','rework','completed','cancelled')),
  current_result public.workflow_result not null default 'pending',
  previous_stage public.workflow_stage,
  held_reason text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_transition_by uuid references public.profiles(id),
  last_transition_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manufacturing_workflows_project_idx
  on public.manufacturing_workflows(project_id);
create index if not exists manufacturing_workflows_stage_idx
  on public.manufacturing_workflows(current_stage,workflow_status);

insert into public.manufacturing_workflows(order_id,project_id,current_stage,last_transition_by)
select o.id,p.id,'order_received',o.created_by
from public.orders o
left join public.projects p on p.order_id=o.id
on conflict(order_id) do update set
  project_id=coalesce(excluded.project_id,public.manufacturing_workflows.project_id);

create or replace function public.transition_manufacturing_workflow(
  p_order_id uuid,
  p_stage text,
  p_action text,
  p_remarks text default null
) returns public.manufacturing_workflows
language plpgsql
security invoker
set search_path=''
as $$
declare
  wf public.manufacturing_workflows%rowtype;
  next_stage public.workflow_stage;
  role_name text;
  project_id_value uuid;
  action_allowed boolean := false;
begin
  select p.role::text into role_name from public.profiles p where p.id=auth.uid();
  if role_name is null or not exists(select 1 from public.profiles where id=auth.uid() and active=true) then
    raise exception 'Active authenticated user required';
  end if;

  insert into public.manufacturing_workflows(order_id,project_id,current_stage,last_transition_by,last_transition_at)
  select o.id,p.id,'order_received',auth.uid(),now()
  from public.orders o left join public.projects p on p.order_id=o.id
  where o.id=p_order_id
  on conflict(order_id) do nothing;

  select * into wf from public.manufacturing_workflows where order_id=p_order_id for update;
  if not found then raise exception 'Order workflow not found'; end if;
  if p_stage::workflow_stage is distinct from wf.current_stage
     and p_action in ('approve','reject') then
    raise exception 'Transition stage does not match the current workflow stage';
  end if;
  project_id_value:=wf.project_id;

  if p_action='approve' then
    case p_stage
      when 'order_received' then action_allowed:=role_name in ('admin','sales_projects');
      when 'engineering_review' then action_allowed:=role_name in ('admin','engineering');
      when 'project_planning' then action_allowed:=role_name in ('admin','engineering','planning_procurement');
      when 'procurement','material_receipt','incoming_inspection' then action_allowed:=role_name in ('admin','planning_procurement','stores','quality_assurance');
      when 'production','quality_inspection' then action_allowed:=role_name in ('admin','production','quality_assurance');
      when 'final_inspection_dispatch' then action_allowed:=role_name in ('admin','quality_assurance','logistics');
      else raise exception 'Unknown workflow stage';
    end case;
  elsif p_action='reject' or p_action='hold' or p_action='rework' or p_action='reinspect' then
    case p_stage
      when 'engineering_review','project_planning','final_inspection_dispatch' then action_allowed:=role_name in ('admin','engineering','planning_procurement','quality_assurance','logistics');
      when 'quality_inspection','production','incoming_inspection' then action_allowed:=role_name in ('admin','production','quality_assurance','stores');
      else action_allowed:=role_name='admin';
    end case;
  else
    raise exception 'Action must be approve, reject, hold, rework, or reinspect';
  end if;
  if not action_allowed then raise exception 'User role % is not authorized for this workflow action',role_name; end if;

  if p_action='approve' then
    if p_stage='engineering_review' and exists(
      select 1 from public.engineering_drawings ed
      join public.drawing_revisions dr on dr.id=ed.current_revision_id
      where ed.order_id=p_order_id and dr.status <> 'approved'
    ) then raise exception 'All current drawing revisions must be approved'; end if;

    if p_stage='project_planning' and (
      exists(select 1 from public.bom_items where project_id=project_id_value and status <> 'approved')
      or exists(select 1 from public.quality_plans where project_id=project_id_value and status <> 'approved')
    ) then raise exception 'BOM and quality plan approvals are incomplete'; end if;

    if p_stage='incoming_inspection' and exists(
      select 1 from public.material_receipts mr
      join public.purchase_order_items poi on poi.id=mr.purchase_order_item_id
      join public.purchase_orders po on po.id=poi.purchase_order_id
      where po.project_id=project_id_value and mr.status <> 'accepted'
    ) then raise exception 'All project materials must pass incoming QA'; end if;

    if p_stage='quality_inspection' and exists(
      select 1 from public.production_jobs pj
      join public.production_stages ps on ps.production_job_id=pj.id
      left join public.quality_inspections qi on qi.production_stage_id=ps.id
      where pj.project_id=project_id_value
      and (ps.status='on_hold' or qi.result='rejected' or qi.result='pending' or qi.result is null)
    ) then raise exception 'Production stages and in-process inspections must be accepted'; end if;

    if p_stage='final_inspection_dispatch' then
      select true into action_allowed
      from public.final_inspections fi
      join public.production_jobs pj on pj.id=fi.production_job_id
      where pj.project_id=project_id_value and fi.result='accepted'
      limit 1;
      if not coalesce(action_allowed,false) then raise exception 'Final inspection is not accepted'; end if;
      if exists(select 1 from public.non_conformance_reports n
        join public.quality_inspections qi on qi.id=n.quality_inspection_id
        join public.production_jobs pj on pj.id=qi.production_job_id
        where pj.project_id=project_id_value and n.status <> 'closed') then
        raise exception 'Open NCRs must be closed';
      end if;
      if not exists(select 1 from public.quality_dossiers qd
        join public.production_jobs pj on pj.id=qd.production_job_id
        where pj.project_id=project_id_value and qd.status='approved') then
        raise exception 'Approved quality dossier is required';
      end if;
    end if;

    if p_stage='engineering_review' then next_stage='project_planning';
    elsif p_stage='project_planning' then next_stage='procurement';
    elsif p_stage='procurement' then next_stage='material_receipt';
    elsif p_stage='material_receipt' then next_stage='incoming_inspection';
    elsif p_stage='incoming_inspection' then next_stage='production';
    elsif p_stage='production' then next_stage='quality_inspection';
    elsif p_stage='quality_inspection' then next_stage='final_inspection_dispatch';
    elsif p_stage='final_inspection_dispatch' then next_stage='final_inspection_dispatch';
    elsif p_stage='order_received' then next_stage='engineering_review';
    else raise exception 'Unknown workflow stage';
    end if;

    update public.manufacturing_workflows
      set previous_stage=current_stage,
          current_stage=next_stage,
          workflow_status=case when p_stage='final_inspection_dispatch' then 'completed' else 'in_progress' end,
          current_result='accepted',
          completed_at=case when p_stage='final_inspection_dispatch' then now() else null end,
          held_reason=null,last_transition_by=auth.uid(),last_transition_at=now()
      where id=wf.id returning * into wf;
  elsif p_action='reinspect' then
    update public.manufacturing_workflows
      set previous_stage=current_stage,current_stage=p_stage::workflow_stage,
          workflow_status='rework',current_result='pending',
          held_reason=coalesce(p_remarks,'Reinspection scheduled'),last_transition_by=auth.uid(),last_transition_at=now()
      where id=wf.id returning * into wf;
  else
    update public.manufacturing_workflows
      set previous_stage=current_stage,current_stage=p_stage::workflow_stage,
          workflow_status=case when p_action='hold' then 'on_hold' when p_action='rework' then 'rework' else 'in_progress' end,
          current_result=case when p_action='reject' then 'rejected' else 'pending' end,
          held_reason=case when p_action='hold' then coalesce(p_remarks,'Workflow placed on hold') else p_remarks end,
          last_transition_by=auth.uid(),last_transition_at=now()
      where id=wf.id returning * into wf;
  end if;

  insert into public.workflow_history(
    workflow_stage,p_order_id_placeholder,entity_type,entity_id,from_status,to_status,result,remarks,performed_by,performed_at
  ) values (
    p_stage::workflow_stage,'', 'manufacturing_workflow',wf.id,
    wf.previous_stage::text,wf.current_stage::text,
    case when p_action='approve' then 'accepted'::workflow_result when p_action='reject' then 'rejected'::workflow_result else 'pending'::workflow_result end,
    p_remarks,auth.uid(),now()
  );
  return wf;
end;
$$;

alter table public.manufacturing_workflows enable row level security;
create policy manufacturing_workflow_read on public.manufacturing_workflows for select to authenticated using(public.current_user_active());
create policy manufacturing_workflow_manage on public.manufacturing_workflows for all to authenticated
using(public.has_role(array['admin'])) with check(public.has_role(array['admin']));

commit;
