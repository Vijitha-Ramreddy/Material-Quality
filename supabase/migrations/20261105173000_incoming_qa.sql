alter type public.receipt_status add value if not exists 'under_inspection';
alter type public.receipt_status add value if not exists 'on_hold';
alter type public.inspection_result add value if not exists 'on_hold';

begin;

alter table public.material_receipts
  add column if not exists specification_checked boolean not null default false,
  add column if not exists certificate_storage_bucket text,
  add column if not exists certificate_storage_path text,
  add column if not exists certificate_file_name text;

create table if not exists public.incoming_inspection_history (
  id uuid primary key default gen_random_uuid(),
  incoming_inspection_id uuid not null references public.incoming_inspections(id) on delete cascade,
  action varchar(30) not null check (action in ('created','under_inspection','accepted','rejected','on_hold','remarks_updated')),
  from_result text,
  to_result text,
  remarks text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.incoming_inspection_history enable row level security;
create policy if not exists incoming_history_read on public.incoming_inspection_history for select to authenticated
using (public.current_user_active());
create policy if not exists incoming_history_manage on public.incoming_inspection_history for all to authenticated
using (public.has_role(array['admin','quality_assurance','stores']))
with check (public.has_role(array['admin','quality_assurance']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('material-certificates','material-certificates',false,20971520,array[
  'application/pdf','image/png','image/jpeg',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy if not exists material_certificates_manage
on storage.objects for all to authenticated
using (bucket_id='material-certificates' and public.has_role(array['admin','stores','quality_assurance']))
with check (bucket_id='material-certificates' and public.has_role(array['admin','stores','quality_assurance']));

create or replace function public.sync_accepted_material_stock()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  receipt public.material_receipts%rowtype;
  accepted numeric;
begin
  if tg_op='UPDATE' and old.result = 'accepted' and new.result = 'accepted' then
    return new;
  end if;
  if new.result = 'accepted' then
    select * into receipt from public.material_receipts where id=new.material_receipt_id;
    accepted := coalesce(new.accepted_quantity,0);
    if accepted <= 0 or new.completed_at is null then
      raise exception 'Accepted inspection requires completed_at and accepted quantity';
    end if;
    update public.material_receipts set status='accepted', specification_checked=true where id=new.material_receipt_id;
    insert into public.material_stock(material_id,quantity_on_hand)
    values (receipt.material_id,accepted)
    on conflict(material_id) do update set quantity_on_hand=public.material_stock.quantity_on_hand+accepted,updated_at=now();
    insert into public.material_stock_transactions(material_id,transaction_type,quantity,reference_type,reference_id,remarks)
    values (receipt.material_id,'receipt',accepted,'incoming_inspection',new.id,'Accepted incoming material');
  elsif new.result::text in ('rejected', 'on_hold') then
    update public.material_receipts set status=new.result::text where id=new.material_receipt_id;
  end if;
  return new;
end;
$$;

drop trigger if exists incoming_inspection_material_stock_sync on public.incoming_inspections;
create trigger incoming_inspection_material_stock_sync
after insert or update of result, accepted_quantity, completed_at on public.incoming_inspections
for each row execute function public.sync_accepted_material_stock();

create or replace function public.prevent_unaccepted_receipt_issue()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='INSERT' and (new.status is distinct from 'accepted' or coalesce(new.accepted_quantity,0)<=0) then
    raise exception 'Only accepted incoming material can enter production inventory';
  end if;
  return new;
end;
$$;

commit;
