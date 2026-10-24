create extension if not exists pgcrypto;

create table if not exists public.applynow_admin_emails (
  email text primary key
);

alter table public.applynow_admin_emails enable row level security;
revoke all on public.applynow_admin_emails from anon, authenticated;

insert into public.applynow_admin_emails (email)
values ('info@applyhubsa.co.za')
on conflict (email) do nothing;

create or replace function public.is_applynow_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applynow_admin_emails
    where lower(email) = lower((select auth.jwt() ->> 'email'))
  );
$$;

revoke all on function public.is_applynow_admin() from public, anon;
grant execute on function public.is_applynow_admin() to authenticated;

create table if not exists public.application_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_type text not null check (package_type in ('R25', 'R100')),
  amount integer not null check (amount in (25, 100)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  learner_full_name text not null,
  learner_email text not null,
  learner_phone text not null,
  learner_id_number text not null,
  learner_data jsonb not null check (jsonb_typeof(learner_data) = 'object'),
  course_requested text not null default '',
  selected_universities text[] not null default '{}',
  nsfas_needed boolean not null default false,
  nsfas_checklist text not null default '',
  aps integer not null default 0,
  subject_results jsonb not null default '[]'::jsonb check (jsonb_typeof(subject_results) = 'array'),
  results_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(results_snapshot) = 'array'),
  payment_reference text not null,
  receipt_path text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  review_note text,
  constraint application_requests_package_amount_check
    check ((package_type = 'R25' and amount = 25) or (package_type = 'R100' and amount = 100)),
  constraint application_requests_pending_on_create_check
    check ((status = 'pending' and reviewed_at is null and reviewed_by is null) or status <> 'pending')
);

create index if not exists application_requests_user_created_idx
  on public.application_requests (user_id, created_at desc);
create index if not exists application_requests_status_created_idx
  on public.application_requests (status, created_at desc);

alter table public.application_requests enable row level security;
revoke all on public.application_requests from anon;
grant select, insert, update on public.application_requests to authenticated;

drop policy if exists "Learners insert their own pending requests" on public.application_requests;
create policy "Learners insert their own pending requests"
  on public.application_requests
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and lower(learner_email) = lower((select auth.jwt() ->> 'email'))
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Learners and admins read permitted requests" on public.application_requests;
create policy "Learners and admins read permitted requests"
  on public.application_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_applynow_admin()));

drop policy if exists "Only admins review requests" on public.application_requests;
create policy "Only admins review requests"
  on public.application_requests
  for update
  to authenticated
  using ((select public.is_applynow_admin()))
  with check ((select public.is_applynow_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Learners upload proofs to their own folder" on storage.objects;
create policy "Learners upload proofs to their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Learners and admins read payment proofs" on storage.objects;
create policy "Learners and admins read payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_applynow_admin())
    )
  );

drop policy if exists "Learners delete their own unlinked proofs" on storage.objects;
create policy "Learners delete their own unlinked proofs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
