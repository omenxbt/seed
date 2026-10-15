-- The fee each pool was opened with, in basis points, read from the pool account the first time the indexer prices one
-- of its swaps. A pool seeded before a config change keeps its own fee, so the indexer must not price every pool with
-- the current setting (QA P2-50). Null until read.
alter table public.raises add column if not exists pool_fee_bps integer;
