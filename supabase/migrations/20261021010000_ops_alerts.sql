-- Monitoring (2026-10-21): the crank and the webhook record each run; a job every ten minutes raises an alert when either
-- has failed twice in a row, or the crank has been silent for fifteen minutes, and posts it to the alert webhook URL in
-- settings (Slack or Discord style, {"text": ...}) when one is set. The site's admin note lists open alerts.
create table if not exists public.ops_runs (
  id bigserial primary key,
  fn text not null,                 -- 'crank' | 'webhook'
  ok boolean not null,
  note text,
  at timestamptz not null default now()
);
create index if not exists ops_runs_fn_at on public.ops_runs (fn, at desc);
create table if not exists public.alerts (
  id bigserial primary key,
  kind text not null,               -- 'crank-failing' | 'crank-silent' | 'webhook-failing'
  message text not null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table if not exists public.settings (key text primary key, value text);
insert into public.settings (key, value) values ('alert_webhook_url', '') on conflict (key) do nothing;
alter table public.ops_runs enable row level security;
alter table public.alerts enable row level security;
alter table public.settings enable row level security;
drop policy if exists "alerts are public" on public.alerts;
create policy "alerts are public" on public.alerts for select using (true);
-- the check: two consecutive failures, or silence
create or replace function public.check_ops() returns void language plpgsql security definer as $$
declare r record; url text; msg text;
begin
  select value into url from public.settings where key = 'alert_webhook_url';
  for r in
    select * from (
      select 'crank' as fn, 'crank-failing' as kind, 'The crank failed twice in a row: ' || coalesce((select note from public.ops_runs where fn = 'crank' order by at desc limit 1), '') as message
      where (select count(*) from (select ok from public.ops_runs where fn = 'crank' order by at desc limit 2) t where not ok) = 2
      union all
      select 'crank', 'crank-silent', 'The crank has not run for fifteen minutes'
      where coalesce((select max(at) from public.ops_runs where fn = 'crank'), now() - interval '1 day') < now() - interval '15 minutes'
      union all
      select 'webhook', 'webhook-failing', 'The webhook failed twice in a row: ' || coalesce((select note from public.ops_runs where fn = 'webhook' order by at desc limit 1), '')
      where (select count(*) from (select ok from public.ops_runs where fn = 'webhook' order by at desc limit 2) t where not ok) = 2
    ) x
  loop
    if not exists (select 1 from public.alerts a where a.kind = r.kind and a.resolved_at is null) then
      insert into public.alerts (kind, message) values (r.kind, r.message);
      if url is not null and url <> '' then
        perform net.http_post(url, jsonb_build_object('text', 'Seed: ' || r.message, 'content', 'Seed: ' || r.message), '{}'::jsonb, '{"Content-Type": "application/json"}'::jsonb);
      end if;
    end if;
  end loop;
  -- an alert resolves itself when the condition has cleared
  update public.alerts a set resolved_at = now() where a.resolved_at is null and (
    (a.kind = 'crank-failing' and coalesce((select ok from public.ops_runs where fn = 'crank' order by at desc limit 1), false)) or
    (a.kind = 'crank-silent' and (select max(at) from public.ops_runs where fn = 'crank') > now() - interval '15 minutes') or
    (a.kind = 'webhook-failing' and coalesce((select ok from public.ops_runs where fn = 'webhook' order by at desc limit 1), false)));
end $$;
select cron.unschedule(jobid) from cron.job where jobname = 'seed-check-ops';
select cron.schedule('seed-check-ops', '*/10 * * * *', $$ select public.check_ops() $$);
