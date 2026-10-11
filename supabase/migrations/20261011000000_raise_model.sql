-- Seed: the raise model, indexed from the program. Everything on chain is the source of truth; these tables are the
-- site's fast copy, written by the `helius-webhook` function as the program's events arrive, plus the two things that
-- live only here: raise reports (wallet-signed, public) and founders' X accounts (from the X sign-in).
-- Row-level security is on for every table. Anyone may read; only the Edge Functions (service role) write.

-- a raise, one row per Raise account; `address` is the account's public key, `id` the short id the site routes by
create table if not exists public.raises (
  id                 text primary key,
  address            text not null unique,
  founder            text not null,                         -- the wallet that opened it
  x_id               text,                                   -- the X account it was opened with (hash of the handle on chain, id here)
  name               text not null,
  ticker             text not null,
  pair_mint          text not null,                          -- SOL (wrapped) or USDC
  target             numeric not null,                       -- in the pair asset's whole units
  target_usd         numeric not null,
  sol_usd_at_open    numeric,
  fee_bps            integer not null default 100,
  creator_share_bps  integer not null default 7000,
  team_bps           integer not null default 0,
  team_schedule      jsonb,                                   -- { cliffDays, intervalDays, bpsPerInterval } or { tranches: [{ dayOffset, bps }] }
  payout_wallet      text not null,
  pending_payout     text,
  payout_effective_at timestamptz,
  status             text not null check (status in ('live', 'filled', 'seeded', 'refunded')),
  seed_step          text check (seed_step in ('filled', 'minted', 'pooled', 'seeded')),
  refund_reason      text check (refund_reason in ('missed', 'cancelled', 'timeout')),
  raised             numeric not null default 0,
  backers            integer not null default 0,
  opened_at          timestamptz not null,
  ends_at            timestamptz not null,
  filled_at          timestamptz,
  seeded_at          timestamptz,
  resolved_at        timestamptz,
  mint               text,                                   -- set at the Minted step
  pool               text,                                   -- the DAMM v2 pool, set at the Pooled step
  position           text,                                   -- the locked position NFT, held by the program's PDA
  fees_volume        numeric not null default 0,             -- pool volume so far, in the pair asset (from the pool's own fee accounting)
  fees_founder_claimed numeric not null default 0,
  fees_seed_claimed  numeric not null default 0,
  team_claimed       numeric not null default 0,             -- team tokens claimed so far
  blacklisted        boolean not null default false,
  flag               jsonb,                                   -- { reportId, at, by, tx }
  takeover           jsonb,                                   -- { from, to, at, reportId, by, label, tx }
  updated_at         timestamptz not null default now()
);
create index if not exists raises_status_opened on public.raises (status, opened_at desc);
create index if not exists raises_founder on public.raises (founder);
create index if not exists raises_x_id on public.raises (x_id);

-- every buy, one row per contribute instruction
create table if not exists public.contributions (
  tx          text primary key,                               -- the transaction signature
  raise_id    text not null references public.raises (id) on delete cascade,
  wallet      text not null,
  amount      numeric not null,                               -- what went into the raise
  fee         numeric not null,                               -- the 1% on top
  at          timestamptz not null,
  refunded_at timestamptz,
  claimed_at  timestamptz                                     -- tokens claimed (seeded raises)
);
create index if not exists contributions_raise_at on public.contributions (raise_id, at);
create index if not exists contributions_wallet on public.contributions (wallet);

-- every claim of the pool's fees: who sent it and what each side received
create table if not exists public.fee_claims (
  tx        text primary key,
  raise_id  text not null references public.raises (id) on delete cascade,
  by        text not null,                                    -- whoever sent the (permissionless) claim
  founder   numeric not null,                                 -- to the payout wallet
  seed      numeric not null,                                 -- to Seed
  at        timestamptz not null
);
create index if not exists fee_claims_raise_at on public.fee_claims (raise_id, at desc);

-- payout wallet changes: requested, then applied after the delay
create table if not exists public.payout_changes (
  tx           text primary key,
  raise_id     text not null references public.raises (id) on delete cascade,
  from_wallet  text not null,
  to_wallet    text not null,
  requested_at timestamptz not null,
  effective_at timestamptz not null,
  applied_tx   text,
  applied_at   timestamptz
);
create index if not exists payout_changes_raise on public.payout_changes (raise_id, requested_at desc);

-- reports on a raise: public, one per wallet per raise, signed by the wallet (the session the function verified)
create table if not exists public.raise_reports (
  id         uuid primary key default gen_random_uuid(),
  raise_id   text not null references public.raises (id) on delete cascade,
  wallet     text not null,
  reason     text not null check (char_length(reason) between 20 and 600),
  status     text not null default 'open' check (status in ('open', 'fraud', 'takeover', 'dismissed')),
  acted_by   text,                                            -- the admin wallet, for fraud / takeover / dismissed
  acted_tx   text,                                            -- the on-chain instruction, for fraud / takeover
  created_at timestamptz not null default now(),
  unique (raise_id, wallet)
);
create index if not exists raise_reports_raise on public.raise_reports (raise_id, created_at desc);

-- founders' X accounts: what the X sign-in returned, and whether Seed has blacklisted the account
create table if not exists public.x_accounts (
  x_id          text primary key,
  handle        text not null check (handle ~ '^[A-Za-z0-9_]{1,15}$'),
  name          text not null default '',
  avatar        text not null default '',
  x_created_at  timestamptz,                                  -- when the account was created on X, if the API gave it
  followers     integer,
  blacklisted   boolean not null default false,
  blacklisted_at timestamptz,
  blacklist_raise text,                                       -- the raise the flag came from
  updated_at    timestamptz not null default now()
);

-- attestations the function signed for open_raise: a log, so a handle hash can be traced back to the sign-in that made it
create table if not exists public.x_attestations (
  id          uuid primary key default gen_random_uuid(),
  wallet      text not null,
  x_id        text not null references public.x_accounts (x_id),
  handle_hash text not null,                                  -- hex sha256 of the lower-cased handle, what the program sees
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists x_attestations_wallet on public.x_attestations (wallet, created_at desc);

-- the view the site reads for a raise page: the raise with its report count
create or replace view public.raises_with_reports as
  select r.*, (select count(*) from public.raise_reports p where p.raise_id = r.id) as report_count from public.raises r;

alter table public.raises         enable row level security;
alter table public.contributions  enable row level security;
alter table public.fee_claims     enable row level security;
alter table public.payout_changes enable row level security;
alter table public.raise_reports  enable row level security;
alter table public.x_accounts     enable row level security;
alter table public.x_attestations enable row level security;
do $$ declare t text; begin
  foreach t in array array['raises', 'contributions', 'fee_claims', 'payout_changes', 'raise_reports', 'x_accounts'] loop
    execute format('drop policy if exists "%s are public" on public.%I', t, t);
    execute format('create policy "%s are public" on public.%I for select to anon, authenticated using (true)', t, t);
  end loop;
end $$;
-- attestations are not public: they are a log for Seed
-- no insert, update or delete policies anywhere on purpose: only the Edge Functions (service role) write.
