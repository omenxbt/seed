-- The board follows the indexer: a raise that opens (or changes status) after the page loaded reaches every open board over
-- Realtime, so the New raises lane fills without a reload.
do $$ begin
  alter publication supabase_realtime add table public.raises;
exception when duplicate_object then null; end $$;
