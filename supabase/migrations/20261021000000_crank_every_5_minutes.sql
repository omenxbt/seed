-- The crank runs every five minutes instead of every minute (2026-10-21): devnet's server-side reads moved to the public
-- RPC, and a five-minute cadence is enough for settle, timeout, the seeding steps, fee claims and unlocks. Helius is kept
-- for the webhook and the browser RPC only.
select cron.alter_job((select jobid from cron.job where jobname = 'seed-crank'), schedule := '*/5 * * * *');
