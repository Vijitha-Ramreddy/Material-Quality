begin;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
                 where n.nspname='public' and t.typname='order_type') then
    create type public.order_type as enum ('MTO', 'ETO');
  end;
end $$;

alter table public.orders
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists product_name varchar(200),
  add column if not exists quantity numeric(14,4) check (quantity > 0),
  add column if not exists unit varchar(30) not null default 'nos',
  add column if not exists order_type public.order_type not null default 'MTO',
  add column if not exists requirements_storage_bucket varchar(100),
  add column if not exists requirements_storage_path text,
  add column if not exists requirements_file_name varchar(255),
  add column if not exists requirements_file_size bigint check (requirements_file_size is null or requirements_file_size >= 0);

create index if not exists orders_project_id_idx on public.orders(project_id);
create index if not exists orders_order_date_idx on public.orders(order_date desc);
create index if not exists orders_order_number_idx on public.orders(order_number);

create or replace function public.generate_order_number()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_number integer;
  prefix text := 'ORD-' || extract(year from current_date)::text || '-';
begin
  perform pg_advisory_xact_lock(hashtext(prefix));
  select coalesce(max(substring(order_number from char_length(prefix) + 1)::integer), 0) + 1
    into next_number
  from public.orders
  where order_number like prefix || '%';
  return prefix || lpad(next_number::text, 3, '0');
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-requirements',
  'order-requirements',
  false,
  20971520,
  array['application/pdf','image/png','image/jpeg','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain']
)
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy if not exists "order_requirements_sales_admin"
on storage.objects for all to authenticated
using (bucket_id = 'order-requirements' and public.has_role(array['admin','sales_projects']))
with check (bucket_id = 'order-requirements' and public.has_role(array['admin','sales_projects']));

commit;
