begin;

select auth.uid();

-- These assertions document the expected policies for the role matrix.
-- Execute with authenticated Supabase test sessions created by each role.
do $$
declare
  current_role text := coalesce(public.current_user_role()::text, '');
begin
  if current_role not in (
    'admin','sales_projects','engineering','planning_procurement',
    'stores','production','quality_assurance','logistics'
  ) then
    raise exception 'invalid or inactive role: %', current_role;
  end if;
end;
$$;

commit;

-- Expected role-to-operation matrix.
create temporary table rbac_role_permission_tests (
  role text not null,
  operation text not null,
  allowed boolean not null
);

insert into rbac_role_permission_tests values
  ('admin', 'manage users', true),
  ('sales_projects', 'manage orders', true),
  ('engineering', 'manage drawings', true),
  ('planning_procurement', 'manage purchase orders', true),
  ('stores', 'record receipts', true),
  ('production', 'update stages', true),
  ('quality_assurance', 'approve inspection', true),
  ('logistics', 'manage dispatch', true),
  ('sales_projects', 'approve inspection', false),
  ('engineering', 'manage purchase orders', false),
  ('stores', 'manage drawings', false),
  ('production', 'manage dispatch', false),
  ('quality_assurance', 'manage dispatch', false),
  ('logistics', 'approve inspection', false);

select * from rbac_role_permission_tests
where allowed order by role, operation;
