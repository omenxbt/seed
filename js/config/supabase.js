/* Supabase project for chat, founder updates, uploads and X account links. Leave both empty to run chat and updates on the in-browser demo
   adapters (they sync between windows of one browser, not between people). The anon key is public by design: every write
   goes through the `seed` Edge Function, which checks the wallet signature, and row-level security blocks direct writes. */
const SUPABASE = {
  url: 'https://xwokejftvhcwrwxxcykh.supabase.co',
  anonKey: 'sb_publishable_mCawmgR9Jggj2yWth4iJpQ_UguviCyf',
  bucket: 'presale-media',
  xProvider: 'twitter'   // the Supabase Auth provider used for X sign-in, as named in the project's Auth settings
};
