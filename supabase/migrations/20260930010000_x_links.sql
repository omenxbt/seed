-- Seed: an X account linked to a wallet. Optional for everyone; a wallet with no row here works the same.
-- One row per wallet. Several wallets may carry the same X account. Anyone may read; only the `seed` Edge Function writes,
-- after it has checked the wallet's signature and the X sign-in in the same request.
create table if not exists public.x_links (
  wallet    text primary key,
  x_id      text not null,
  handle    text not null check (handle ~ '^[A-Za-z0-9_]{1,15}$'),
  name      text not null default '',
  avatar    text not null default '',
  linked_at timestamptz not null default now()
);
create index if not exists x_links_x_id on public.x_links (x_id);

alter table public.x_links enable row level security;
drop policy if exists "x links are public" on public.x_links;
create policy "x links are public" on public.x_links for select to anon, authenticated using (true);
-- no insert, update or delete policies on purpose: only the Edge Function (service role) writes.
