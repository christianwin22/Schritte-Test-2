-- DeutschMeister — Supabase setup
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

-------------------------------------------------------------------------------
-- 3. Ideas noted while using the app (the bulb button)
--    Each person sees only their own, exactly like progress.
-------------------------------------------------------------------------------
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text not null,
  context    text,                      -- which screen you were on
  on_screen  text,                      -- what was on it
  media      jsonb not null default '[]'::jsonb,  -- paths in the screenshots bucket
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

drop policy if exists "read own ideas" on public.suggestions;
create policy "read own ideas" on public.suggestions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "add own ideas" on public.suggestions;
create policy "add own ideas" on public.suggestions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "delete own ideas" on public.suggestions;
create policy "delete own ideas" on public.suggestions
  for delete to authenticated using ((select auth.uid()) = user_id);

-------------------------------------------------------------------------------
-- 4. Screenshots attached to those ideas
--    A private bucket; each person can only touch their own folder.
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('idea-media', 'idea-media', false)
on conflict (id) do nothing;

drop policy if exists "read own idea media" on storage.objects;
create policy "read own idea media" on storage.objects
  for select to authenticated
  using (bucket_id = 'idea-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "upload own idea media" on storage.objects;
create policy "upload own idea media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'idea-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "delete own idea media" on storage.objects;
create policy "delete own idea media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'idea-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
