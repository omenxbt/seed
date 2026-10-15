-- Phase 4: every swap on a raise's DAMM v2 pool, parsed by the indexer from the pool's vault balance changes, and the
-- candles the chart draws from them.
create table if not exists public.trades (
  signature     text primary key,
  raise_id      text not null references public.raises(id) on delete cascade,
  pool          text not null,
  side          text not null check (side in ('buy', 'sell')),   -- buy: the pair asset in, tokens out
  pair_amount   numeric not null,                                 -- in the pair asset (SOL or USDC), gross of the pool fee
  token_amount  numeric not null,
  price         numeric not null,                                 -- pair asset per token
  trader        text not null,
  slot          bigint not null,
  at            timestamptz not null
);
create index if not exists trades_raise_at on public.trades (raise_id, at desc);
create index if not exists trades_trader on public.trades (trader);
alter table public.trades enable row level security;
drop policy if exists "trades are public" on public.trades;
create policy "trades are public" on public.trades for select using (true);
grant select on public.trades to anon, authenticated;
grant all on public.trades to service_role;
do $$ begin
  alter publication supabase_realtime add table public.trades;
exception when duplicate_object then null; end $$;

-- OHLCV candles for a raise: tf is the bucket in seconds (60, 300, 3600, 86400). Each candle's open is the price of its
-- first trade; the page fills gaps and opens the first candle at the raise price.
create or replace function public.candles(p_raise_id text, p_tf integer, p_limit integer default 300)
returns table (t timestamptz, open numeric, high numeric, low numeric, close numeric, volume numeric, trades integer)
language sql stable as $$
  with b as (
    select to_timestamp(floor(extract(epoch from at) / p_tf) * p_tf) as t, price, pair_amount, at, signature
    from public.trades where raise_id = p_raise_id
  ), agg as (
    select t,
      (array_agg(price order by at, signature))[1] as open,
      max(price) as high, min(price) as low,
      (array_agg(price order by at desc, signature desc))[1] as close,
      sum(pair_amount) as volume, count(*)::integer as trades
    from b group by t
  )
  select * from (select * from agg order by t desc limit p_limit) x order by t asc
$$;
grant execute on function public.candles(text, integer, integer) to anon, authenticated, service_role;

-- the figures beside the chart: volume and trade count over the last day, and the latest price
create or replace function public.trade_stats(p_raise_id text)
returns table (volume_24h numeric, trades_24h integer, last_price numeric, last_at timestamptz)
language sql stable as $$
  select coalesce((select sum(pair_amount) from public.trades where raise_id = p_raise_id and at > now() - interval '24 hours'), 0),
         coalesce((select count(*)::integer from public.trades where raise_id = p_raise_id and at > now() - interval '24 hours'), 0),
         (select price from public.trades where raise_id = p_raise_id order by at desc, signature desc limit 1),
         (select at from public.trades where raise_id = p_raise_id order by at desc, signature desc limit 1)
$$;
grant execute on function public.trade_stats(text) to anon, authenticated, service_role;

-- the raise's traded volume, the figure the creator-fee card is based on; one trade counts once
create or replace function public.bump_volume(p_raise_id text, p_amount numeric, p_signature text)
returns void language plpgsql security definer as $$
begin
  update public.raises set fees_volume = coalesce(fees_volume, 0) + p_amount where id = p_raise_id;
end $$;
revoke all on function public.bump_volume(text, numeric, text) from public;
grant execute on function public.bump_volume(text, numeric, text) to service_role;

-- Phase 4 review: each candle also carries the close of the bucket before it, computed before the limit, so the oldest
-- candle on a long chart opens where the one before it closed, not at the raise price
create or replace function public.candles(p_raise_id text, p_tf integer, p_limit integer default 300)
returns table (t timestamptz, open numeric, high numeric, low numeric, close numeric, volume numeric, trades integer, prev_close numeric)
language sql stable as $$
  with b as (
    select to_timestamp(floor(extract(epoch from at) / p_tf) * p_tf) as t, price, pair_amount, at, signature
    from public.trades where raise_id = p_raise_id
  ), agg as (
    select t,
      (array_agg(price order by at, signature))[1] as open,
      max(price) as high, min(price) as low,
      (array_agg(price order by at desc, signature desc))[1] as close,
      sum(pair_amount) as volume, count(*)::integer as trades
    from b group by t
  ), chained as (
    select *, lag(close) over (order by t) as prev_close from agg
  )
  select * from (select * from chained order by t desc limit p_limit) x order by t asc
$$;
