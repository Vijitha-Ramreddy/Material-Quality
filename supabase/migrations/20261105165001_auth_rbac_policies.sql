alter table public.profiles alter column role set default 'sales_projects';

create or replace function public.current_user_role()
returns public.profile_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = auth.uid() and active = true
$$;

create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select active from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.has_role(text[] role_names)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_active()
    and public.current_user_role()::text = any(role_names)
$$;

create policy "profiles_admin_manage"
on public.profiles for all to authenticated
using (public.has_role(array['admin']))
with check (public.has_role(array['admin']));

create policy "customers_admin_sales_manage"
on public.customers for all to authenticated
using (public.has_role(array['admin','sales_projects']))
with check (public.has_role(array['admin','sales_projects']));

create policy "orders_admin_sales_manage"
on public.orders for all to authenticated
using (public.has_role(array['admin','sales_projects']))
with check (public.has_role(array['admin','sales_projects']));

create policy "engineering_drawings_manage"
on public.engineering_drawings for all to authenticated
using (public.has_role(array['admin','engineering']))
with check (public.has_role(array['admin','engineering']));

create policy "drawing_revisions_manage"
on public.drawing_revisions for all to authenticated
using (public.has_role(array['admin','engineering']))
with check (public.has_role(array['admin','engineering']));

create policy "projects_admin_sales_engineering_manage"
on public.projects for all to authenticated
using (public.has_role(array['admin','sales_projects','engineering','planning_procurement']))
with check (public.has_role(array['admin','sales_projects','engineering','planning_procurement']));

create policy "bom_admin_planning_engineering_manage"
on public.bom_items for all to authenticated
using (public.has_role(array['admin','engineering','planning_procurement']))
with check (public.has_role(array['admin','engineering','planning_procurement']));

create policy "quality_plans_manage"
on public.quality_plans for all to authenticated
using (public.has_role(array['admin','engineering','quality_assurance']))
with check (public.has_role(array['admin','engineering','quality_assurance']));

create policy "suppliers_procurement_manage"
on public.suppliers for all to authenticated
using (public.has_role(array['admin','planning_procurement']))
with check (public.has_role(array['admin','planning_procurement']));

create policy "purchase_orders_procurement_manage"
on public.purchase_orders for all to authenticated
using (public.has_role(array['admin','planning_procurement']))
with check (public.has_role(array['admin','planning_procurement']));

create policy "purchase_order_items_procurement_manage"
on public.purchase_order_items for all to authenticated
using (public.has_role(array['admin','planning_procurement']))
with check (public.has_role(array['admin','planning_procurement']));

create policy "materials_procurement_stores_manage"
on public.materials for all to authenticated
using (public.has_role(array['admin','planning_procurement','stores']))
with check (public.has_role(array['admin','planning_procurement','stores']));

create policy "material_receipts_stores_manage"
on public.material_receipts for all to authenticated
using (public.has_role(array['admin','stores']))
with check (public.has_role(array['admin','stores']));

create policy "incoming_inspections_qa_manage"
on public.incoming_inspections for all to authenticated
using (public.has_role(array['admin','quality_assurance','stores']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "production_jobs_manage"
on public.production_jobs for all to authenticated
using (public.has_role(array['admin','planning_procurement','production']))
with check (public.has_role(array['admin','planning_procurement','production']));

create policy "production_stages_production_manage"
on public.production_stages for all to authenticated
using (public.has_role(array['admin','production']))
with check (public.has_role(array['admin','production']));

create policy "quality_inspections_qa_manage"
on public.quality_inspections for all to authenticated
using (public.has_role(array['admin','quality_assurance']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "ncr_qa_manage"
on public.non_conformance_reports for all to authenticated
using (public.has_role(array['admin','quality_assurance']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "capa_qa_manage"
on public.corrective_actions for all to authenticated
using (public.has_role(array['admin','quality_assurance']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "reinspection_qa_manage"
on public.reinspection_records for all to authenticated
using (public.has_role(array['admin','quality_assurance']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "final_inspections_qa_manage"
on public.final_inspections for all to authenticated
using (public.has_role(array['admin','quality_assurance']))
with check (public.has_role(array['admin','quality_assurance']));

create policy "quality_documents_qa_manage"
on public.quality_documents for all to authenticated
using (public.has_role(array['admin','engineering','quality_assurance']))
with check (public.has_role(array['admin','engineering','quality_assurance']));

create policy "dispatches_logistics_manage"
on public.dispatches for all to authenticated
using (public.has_role(array['admin','logistics']))
with check (public.has_role(array['admin','logistics']));

create policy "workflow_history_authenticated_write"
on public.workflow_history for insert to authenticated
with check (public.current_user_active());

create policy "audit_logs_admin_read"
on public.audit_logs for select to authenticated
using (public.has_role(array['admin']));

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
    execute format('drop policy if exists "%1$s_authenticated_read" on public.%1$I', table_name);
  end loop;
end;
$$;

create policy "engineering_order_project_read"
on public.orders for select to authenticated
using (public.current_user_active());

create policy "customer_read"
on public.customers for select to authenticated
using (public.has_role(array['admin','sales_projects']));

create policy "engineering_work_package_read"
on public.engineering_drawings for select to authenticated
using (public.has_role(array['admin','engineering','planning_procurement','production','quality_assurance']));

create policy "drawing_revision_read"
on public.drawing_revisions for select to authenticated
using (public.has_role(array['admin','engineering','planning_procurement','production','quality_assurance']));

create policy "project_read"
on public.projects for select to authenticated
using (public.current_user_active());

create policy "bom_read"
on public.bom_items for select to authenticated
using (public.has_role(array['admin','engineering','planning_procurement','stores','production']));

create policy "quality_plan_read"
on public.quality_plans for select to authenticated
using (public.has_role(array['admin','engineering','planning_procurement','production','quality_assurance']));

create policy "procurement_supplier_po_read"
on public.suppliers for select to authenticated
using (public.has_role(array['admin','planning_procurement','stores','engineering']));

create policy "procurement_po_read"
on public.purchase_orders for select to authenticated
using (public.has_role(array['admin','planning_procurement','stores','engineering']));

create policy "procurement_po_item_read"
on public.purchase_order_items for select to authenticated
using (public.has_role(array['admin','planning_procurement','stores','engineering']));

create policy "materials_read"
on public.materials for select to authenticated
using (public.has_role(array['admin','planning_procurement','stores','production','quality_assurance']));

create policy "receipt_read"
on public.material_receipts for select to authenticated
using (public.has_role(array['admin','planning_procurement','stores','quality_assurance']));

create policy "incoming_inspection_read"
on public.incoming_inspections for select to authenticated
using (public.has_role(array['admin','stores','quality_assurance']));

create policy "production_job_read"
on public.production_jobs for select to authenticated
using (public.has_role(array['admin','planning_procurement','production','quality_assurance','engineering']));

create policy "production_stage_read"
on public.production_stages for select to authenticated
using (public.has_role(array['admin','planning_procurement','production','quality_assurance']));

create policy "quality_inspection_read"
on public.quality_inspections for select to authenticated
using (public.has_role(array['admin','production','quality_assurance','engineering']));

create policy "ncr_read"
on public.non_conformance_reports for select to authenticated
using (public.has_role(array['admin','production','quality_assurance']));

create policy "capa_read"
on public.corrective_actions for select to authenticated
using (public.has_role(array['admin','production','quality_assurance']));

create policy "reinspection_read"
on public.reinspection_records for select to authenticated
using (public.has_role(array['admin','production','quality_assurance']));

create policy "final_inspection_read"
on public.final_inspections for select to authenticated
using (public.has_role(array['admin','production','quality_assurance','logistics']));

create policy "quality_document_read"
on public.quality_documents for select to authenticated
using (public.has_role(array['admin','engineering','quality_assurance','production']));

create policy "dispatch_read"
on public.dispatches for select to authenticated
using (public.has_role(array['admin','logistics']));

create policy "workflow_history_read"
on public.workflow_history for select to authenticated
using (public.current_user_active());
