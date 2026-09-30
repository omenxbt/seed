/* Supabase project for chat, founder updates and uploads. Leave both empty to run chat and updates on the in-browser demo
   adapters (they sync between windows of one browser, not between people). The anon key is public by design: every write
   goes through the `seed` Edge Function, which checks the wallet signature, and row-level security blocks direct writes. */
const SUPABASE = {
  url: '',
  anonKey: '',
  bucket: 'presale-media'
};
