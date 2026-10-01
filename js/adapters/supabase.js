/* ==========================================================================
   SUPABASE, the backend for chat, founder updates, uploads and X account links. Configured in js/config/supabase.js; until then `supa.ready()`
   is false and every adapter stays on its demo path. Reads use the public anon key. Every write goes through the `seed`
   Edge Function with a signed session (see chatSession in js/adapters/chat.js): the function checks the ed25519 signature
   and row-level security blocks every direct write.
   ========================================================================== */
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
var supa = {
  client: null, loading: null, updates: {},
  configured() { return !!(SUPABASE.url && SUPABASE.anonKey); },
  ready() { return this.configured() && !!window.supabase && !!this.client; },
  /* loads supabase-js from the CDN the first time it is needed */
  init() {
    if (!this.configured()) return Promise.resolve(false);
    if (this.client) return Promise.resolve(true);
    return this.loading || (this.loading = new Promise(ok => {
      const s = document.createElement('script'); s.src = SUPA_JS;
      s.onload = () => { this.client = window.supabase.createClient(SUPABASE.url, SUPABASE.anonKey, { auth: { persistSession: false, detectSessionInUrl: false } }); ok(true); };
      s.onerror = () => { this.loading = null; ok(false); };
      document.head.appendChild(s);
    }));
  },
  /* one call into the Edge Function; the signed session rides along with every write */
  async call(action, body) {
    const session = await chatSession();
    const r = await fetch(`${SUPABASE.url}/functions/v1/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE.anonKey, Authorization: 'Bearer ' + SUPABASE.anonKey }, body: JSON.stringify(Object.assign({ action, session }, body)) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { forgetSession(); }
    if (!r.ok) throw new Error(j.error || `The server refused that (${r.status}).`);
    return j;
  },
  async loadUpdates(id) {
    if (!(await this.init())) return;
    const { data, error } = await this.client.from('updates').select('title,body,wallet,posted_at').eq('presale_id', id).order('posted_at', { ascending: false }).limit(100);
    if (!error) this.updates[id] = (data || []).map(u => ({ title: u.title, body: u.body, postedAt: Date.parse(u.posted_at), author: shortMint(u.wallet), from: 'api' }));
  },
  /* a signed upload URL from the Edge Function, then the file goes straight to Storage. Returns the public URL. */
  async upload(file) {
    if (!(await this.init())) throw new Error('Uploads need Supabase. Add its URL and anon key to js/config/supabase.js.');
    const t = await this.call('upload-url', { name: file.name, type: file.type, size: file.size });
    const { error } = await this.client.storage.from(SUPABASE.bucket).uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return t.publicUrl;
  }
};
