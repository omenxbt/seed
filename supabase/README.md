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

## Founder and team roles

Pinning and posting updates need a row in `presale_roles`. A presale opened from the Launch form registers its creator as
founder automatically. For the eight demo presales, add your own wallet if you want to try founder tools:

```sql
insert into public.presale_roles (presale_id, wallet, role) values ('quill', '<your wallet address>', 'founder');
```
