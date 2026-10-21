-- The raise is derived from an opening market cap preset (2026-10-20): the cap the founder picked, its preset index, and
-- the founder's buy limits, now enforced by the program, come with the RaiseOpened event.
alter table public.raises add column if not exists cap_usd numeric;        -- the opening market cap in dollars
alter table public.raises add column if not exists preset smallint;        -- 0..3, or 4 for the devnet test preset
alter table public.raises add column if not exists min_buy numeric;        -- in the pair asset; null = none
alter table public.raises add column if not exists max_buy numeric;        -- in the pair asset; null = none
