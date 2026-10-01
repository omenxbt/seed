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

## Founder and team roles

Pinning and posting updates need a row in `presale_roles`. A presale opened from the Launch form registers its creator as
founder automatically. For the eight demo presales, add your own wallet if you want to try founder tools:

```sql
insert into public.presale_roles (presale_id, wallet, role) values ('quill', '<your wallet address>', 'founder');
```
