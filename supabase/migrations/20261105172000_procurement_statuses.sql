alter type public.po_status add value if not exists 'pending_approval';
alter type public.po_status add value if not exists 'approved';
alter type public.po_status add value if not exists 'ordered';
alter type public.po_status add value if not exists 'fully_received';
