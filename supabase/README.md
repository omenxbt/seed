# Seed on Supabase

Chat, founder updates and uploads run on Supabase once `js/config/supabase.js` has a project URL and anon key.
Until then the site uses in-browser demo adapters: chat syncs between windows of one browser, updates stay in that browser,
and uploads show a local preview only.

## What is here

- `migrations/20260929000000_seed_chat.sql` creates `messages`, `reports`, `updates` and `presale_roles`, turns on row-level
  security (public read, no direct writes), adds `messages` to Realtime, and creates the public `presale-media` bucket
  (10 MB per file, PDF, PNG, JPEG and WebP only).
- `migrations/20260930000000_deck_slide_files.sql` lets the bucket also take slide files (PowerPoint, Keynote, OpenDocument)
  for pitch decks.
- `migrations/20260930010000_x_links.sql` creates `x_links`: the X account a wallet has linked, one row per wallet, public
  read. Linking is optional on the site.
- `functions/seed/` is the only writer. Every request carries a message the wallet signed once per session; `verify.ts`
  checks the ed25519 signature with WebCrypto before anything is written. It also checks the wallet named in the message,
  the site it was signed for, and that it is less than 24 hours old.

## Set it up

```sh
supabase link --project-ref <your project ref>
supabase db push
supabase secrets set SEED_ALLOWED_DOMAINS="seed-nu-ten.vercel.app,127.0.0.1:8765"
supabase functions deploy seed --no-verify-jwt
```

`--no-verify-jwt` is deliberate: the function authenticates callers by their wallet signature, and newer publishable keys
are not JWTs. Then put the project URL and anon key in `js/config/supabase.js`.

## X account links

Linking an X account to a wallet is optional. To switch it on for real wallets:

1. Create an app in the X developer portal with user sign-in (OAuth) enabled. Set its callback URL to
   `https://<your project ref>.supabase.co/auth/v1/callback`.
2. In the Supabase dashboard, open Authentication, then Providers, enable the X (Twitter) provider and paste the app's key and
   secret. If the provider's name there is not `twitter`, set `xProvider` in `js/config/supabase.js` to match.
3. In Authentication, URL Configuration, add the site's address (for example `https://seed-nu-ten.vercel.app/`) to the
   redirect URLs.

The flow: the person signs in on X, comes back to the site, and their wallet signs its session message. The Edge Function
checks the signature and the X sign-in together and writes the pair to `x_links`. Until this is set up, a real wallet is told
that X sign-in is not switched on, and the demo wallet uses a typed handle that is labelled Demo and never leaves the browser.

## The raise model: indexer, reports, attestations, crank

- `migrations/20261011000000_raise_model.sql` creates `raises`, `contributions`, `fee_claims`, `payout_changes` (the
  program's state, indexed), `raise_reports` (public, wallet-signed, one per wallet per raise), `x_accounts` (founders'
  X accounts and the blacklist) and `x_attestations` (a log of what the attestor signed). Public read, function-only writes.
- `functions/helius-webhook/` is the indexer. Create a Helius webhook of type **raw** for the program id with the
  function's URL as the target and a secret as the authorization header; set that secret as `HELIUS_WEBHOOK_SECRET`.
  Every Seed event in a transaction's logs becomes a row; redelivery is harmless. `_shared/events.ts` holds the event
  layouts and must match `program/programs/seed/src/events.rs`.
- `functions/seed/` gained `x-attest` (signs the attestation `open_raise` verifies; needs `SEED_ATTESTOR_KEY`, the
  attestor's 32-byte ed25519 seed in base58, whose public key is in the program's Config), `raise-report`, and the admin
  actions `admin-flag`, `admin-takeover`, `admin-dismiss` (wallets in `SEED_ADMINS`). The admin actions record the
  off-chain side; the on-chain instructions are sent by the admin multisig and indexed by the webhook.
- `functions/crank/` is the scheduler: settles live raises past their deadline, runs the seeding steps for filled raises,
  times out the ones that stall, claims creator fees hourly and applies due payout changes. It runs with a crank wallet
  (`SEED_CRANK_KEY`) that holds only SOL for fees; every instruction it sends is permissionless. Schedule it with pg_cron:

  ```sql
  select cron.schedule('seed-crank', '* * * * *', $$ select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/crank', headers := '{"authorization": "<CRANK_SECRET>"}'::jsonb) $$);
  ```

  Copy `js/idl/seed.json` to `functions/crank/seed.json` after every program build.

```sh
supabase secrets set SEED_ADMINS="<admin wallet>,<admin wallet>" SEED_ATTESTOR_KEY="<base58 seed>" X_BEARER_TOKEN="<optional>"
supabase secrets set HELIUS_WEBHOOK_SECRET="<secret>" SEED_RPC_URL="https://api.devnet.solana.com" SEED_CRANK_KEY="<base58 secret key>" SEED_PROGRAM_ID="<program id>" CRANK_SECRET="<secret>"
supabase functions deploy helius-webhook --no-verify-jwt
supabase functions deploy crank --no-verify-jwt
```

## Where Seed runs today (2026-10-13)

Project `xwokejftvhcwrwxxcykh`, linked from this repo (`supabase/config.toml`; the CLI runs as `npx supabase`). All
four migrations are applied and `seed`, `helius-webhook` and `crank` are deployed with every secret above set for
**devnet**: the attestor is the key the program tests derive from the deployer wallet (it is what the on-chain Config
holds), the crank wallet is `program/keys/crank.json` (`3YYcjx21rw2wyQRPjawRNr2QCwUFs1nDbtJucmJq8CQc`, funded with
devnet SOL), and pg_cron calls the crank every minute. `program/scripts/secrets.mjs` regenerates the crank and
webhook secrets if they are ever rotated; `program/scripts/config.mjs` prints the on-chain Config. Still to create by
hand: the Helius webhook (devnet, raw, program id, secret `HELIUS_WEBHOOK_SECRET`) and the X developer app.

## Founder and team roles

Pinning and posting updates need a row in `presale_roles`. A presale opened from the Launch form registers its creator as
founder automatically. For the eight demo presales, add your own wallet if you want to try founder tools:

```sql
insert into public.presale_roles (presale_id, wallet, role) values ('quill', '<your wallet address>', 'founder');
```
