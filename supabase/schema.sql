-- Chris Personal App — Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again: every statement checks before it creates.

-------------------------------------------------------------------------------
-- 1. Who may sign in
--    Only emails in this table can create an account — by Google or by email
--    link. Everyone else is refused by the database itself, whatever the app does.
-------------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email text primary key
);

-- No policies on purpose: the app can never read or change this list.
-- Edit it only here, in the Supabase dashboard.
alter table public.allowed_emails enable row level security;

-- >>> Put the two real email addresses here <<<
insert into public.allowed_emails (email) values
  ('first-person@example.com'),
  ('second-person@example.com')
on conflict (email) do nothing;

create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails where lower(email) = lower(new.email)
  ) then
    raise exception 'This email is not allowed to use this app';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_email_allowlist on auth.users;
create trigger enforce_email_allowlist
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-------------------------------------------------------------------------------
-- 2. Saved progress — one row per person
--    Holds the same data the app keeps in the browser, so it follows you
--    between devices and survives a cleared browser.
-------------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

-- Each person can see and change only their own row.
drop policy if exists "read own progress" on public.user_progress;
create policy "read own progress" on public.user_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "create own progress" on public.user_progress;
create policy "create own progress" on public.user_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own progress" on public.user_progress;
create policy "update own progress" on public.user_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
