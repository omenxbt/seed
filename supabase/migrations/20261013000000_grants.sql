-- This project's default privileges give the API roles nothing on new tables (only REFERENCES, TRIGGER, TRUNCATE), so
-- the policies in the earlier migrations never had a grant to act on and even the service role could not write.
-- Public tables: read for anon and authenticated (row-level policies still decide which rows); everything for the
-- service role, which is what the Edge Functions use. x_attestations stays private to the service role.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.messages, public.reports, public.updates, public.presale_roles, public.x_links,
  public.raises, public.contributions, public.fee_claims, public.payout_changes, public.raise_reports, public.x_accounts,
  public.raises_with_reports to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated;
-- and the same for tables later migrations add
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
