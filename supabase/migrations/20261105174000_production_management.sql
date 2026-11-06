alter type public.job_status add value if not exists 'on_hold';
alter type public.job_status add value if not exists 'rework';
alter type public.job_status add value if not exists 'pending';
