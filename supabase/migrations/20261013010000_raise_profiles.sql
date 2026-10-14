-- What a raise says about itself and is not on chain: tagline, description, links, roadmap, token use case, team,
-- art and deck URLs, limits. One row per raise, keyed by the Raise account's address; written only through the seed
-- function by the wallet that opened the raise (the chain's founder), public to read.
create table if not exists public.raise_profiles (
  address     text primary key,
  founder     text not null,
  profile     jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.raise_profiles enable row level security;
drop policy if exists "raise_profiles are public" on public.raise_profiles;
create policy "raise_profiles are public" on public.raise_profiles for select to anon, authenticated using (true);
grant select on public.raise_profiles to anon, authenticated;
grant all on public.raise_profiles to service_role;
