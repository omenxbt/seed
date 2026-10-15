-- team unlocks claimed to the payout wallet, one row per claim, for the founder's history
create table if not exists public.vested_claims (
  tx            text primary key,
  raise_id      text not null references public.raises(id) on delete cascade,
  tokens        numeric not null,
  payout_wallet text not null,
  at            timestamptz not null
);
create index if not exists vested_claims_wallet on public.vested_claims (payout_wallet, at desc);
alter table public.vested_claims enable row level security;
drop policy if exists "vested claims are public" on public.vested_claims;
create policy "vested claims are public" on public.vested_claims for select using (true);
grant select on public.vested_claims to anon, authenticated;
grant all on public.vested_claims to service_role;
