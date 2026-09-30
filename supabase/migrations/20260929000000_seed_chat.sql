-- Seed: chat, founder updates, founder and team roles, and the upload bucket.
-- Row-level security is on for every table. Anyone may read; nobody may write directly. Every write goes through the
-- `seed` Edge Function, which checks the wallet's ed25519 signature and writes with the service role (which bypasses RLS).

create table if not exists public.presale_roles (
  presale_id text not null,
  wallet     text not null,
  role       text not null check (role in ('founder', 'team')),
  created_at timestamptz not null default now(),
  primary key (presale_id, wallet)
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  presale_id text not null,
  wallet     text not null,
  body       text not null check (char_length(body) between 1 and 1000),
  role       text check (role in ('founder', 'team')),
  reply_to   uuid references public.messages (id) on delete set null,
  pinned     boolean not null default false,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_presale_created on public.messages (presale_id, created_at);
create index if not exists messages_wallet_created on public.messages (wallet, created_at desc);

create table if not exists public.reports (
  message_id uuid not null references public.messages (id) on delete cascade,
  wallet     text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, wallet)
);

create table if not exists public.updates (
  id         uuid primary key default gen_random_uuid(),
  presale_id text not null,
  wallet     text not null,
  title      text not null check (char_length(title) between 1 and 80),
  body       text not null check (char_length(body) between 1 and 2000),
  posted_at  timestamptz not null default now()
);
create index if not exists updates_presale_posted on public.updates (presale_id, posted_at desc);

alter table public.presale_roles enable row level security;
alter table public.messages      enable row level security;
alter table public.reports       enable row level security;
alter table public.updates       enable row level security;

-- reads. Hidden messages (auto-hidden after enough reports) are not readable. Reports are not readable at all.
drop policy if exists "roles are public" on public.presale_roles;
create policy "roles are public" on public.presale_roles for select to anon, authenticated using (true);
drop policy if exists "visible messages are public" on public.messages;
create policy "visible messages are public" on public.messages for select to anon, authenticated using (hidden = false);
drop policy if exists "updates are public" on public.updates;
create policy "updates are public" on public.updates for select to anon, authenticated using (true);
-- no insert, update or delete policies on purpose: only the Edge Function (service role) writes.

-- realtime for chat
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- uploads: banners, art and decks. Public read, 10 MB per file, PDF and images only. There is no insert policy, so the only way
-- in is a signed upload URL issued by the Edge Function after it checks the signature.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presale-media', 'presale-media', true, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
