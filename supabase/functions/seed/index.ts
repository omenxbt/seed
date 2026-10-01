// The `seed` Edge Function: the only writer for chat, founder updates, roles, uploads and X account links.
// Every request carries the wallet's signed session. Nothing is written until verifySession() has checked the ed25519
// signature against the wallet's public key. Writes use the service role; row-level security blocks every other writer.
//
// Actions
//   post        { presaleId, body, replyTo? }        any signed-in wallet
//   pin         { messageId, pinned }                 founder or team of that raise
//   report      { messageId }                         any signed-in wallet, once per message; hidden at AUTO_HIDE reports
//   update      { presaleId, title, body }            founder or team of that raise
//   register    { presaleId }                         claims founder of a raise id nobody has claimed yet
//   upload-url  { name, type, size }                  a signed upload URL for the public bucket (PDF, image or slide file, 10 MB)
//   link-x      { token }                             ties the wallet to the X account behind a Supabase Auth sign-in
//   unlink-x    {}                                    removes the wallet's X link
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. SEED_ALLOWED_DOMAINS is a comma-separated
// list of hosts a session may be signed for, for example "seed-nu-ten.vercel.app,127.0.0.1:8765".
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { verifySession } from './verify.ts';

const ALLOWED = (Deno.env.get('SEED_ALLOWED_DOMAINS') ?? 'seed-nu-ten.vercel.app').split(',').map((s) => s.trim()).filter(Boolean);
const AUTO_HIDE = 3;                 // matches RISK.chatAutoHideReports in js/config/risk.js
const BUCKET = 'presale-media';
const TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  // slide files, for a pitch deck
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.apple.keynote': 'key', 'application/vnd.oasis.opendocument.presentation': 'odp' };
const MAX_BYTES = 10 * 1024 * 1024;
const X_PROVIDERS = ['twitter', 'x'];   // Supabase Auth's names for X sign-in

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
class Refusal extends Error { constructor(public status: number, msg: string) { super(msg); } }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim() : '').slice(0, max);

async function roleOf(presaleId: string, wallet: string): Promise<string | null> {
  const { data } = await db.from('presale_roles').select('role').eq('presale_id', presaleId).eq('wallet', wallet).maybeSingle();
  return data?.role ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'POST only.' });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: 'The request was not JSON.' }); }

  let wallet: string;
  try { wallet = await verifySession(body.session as never, ALLOWED); } catch (e) { return reply(401, { error: (e as Error).message }); }

  try {
    switch (body.action) {
      case 'post': {
        const presaleId = str(body.presaleId, 80), text = str(body.body, 1000);
        if (!presaleId || !text) throw new Refusal(400, 'The message is empty.');
        // at most one message every 3 seconds and 30 every 10 minutes per wallet
        const since = new Date(Date.now() - 600e3).toISOString();
        const { data: recent } = await db.from('messages').select('created_at').eq('wallet', wallet).gte('created_at', since).order('created_at', { ascending: false }).limit(30);
        if (recent && recent.length && Date.now() - Date.parse(recent[0].created_at) < 3000) throw new Refusal(429, 'Slow down a little.');
        if (recent && recent.length >= 30) throw new Refusal(429, 'That is a lot of messages. Try again in a few minutes.');
        const replyTo = typeof body.replyTo === 'string' && /^[0-9a-f-]{36}$/.test(body.replyTo) ? body.replyTo : null;
        const { data, error } = await db.from('messages').insert({ presale_id: presaleId, wallet, body: text, role: await roleOf(presaleId, wallet), reply_to: replyTo }).select('id').single();
        if (error) throw new Refusal(400, error.message);
        return reply(200, { id: data.id });
      }
      case 'pin': {
        const { data: m } = await db.from('messages').select('presale_id').eq('id', str(body.messageId, 40)).maybeSingle();
        if (!m) throw new Refusal(404, 'That message is gone.');
        if (!(await roleOf(m.presale_id, wallet))) throw new Refusal(403, 'Only the founder or team can pin.');
        await db.from('messages').update({ pinned: !!body.pinned }).eq('id', str(body.messageId, 40));
        return reply(200, { ok: true });
      }
      case 'report': {
        const id = str(body.messageId, 40);
        const { error } = await db.from('reports').insert({ message_id: id, wallet });
        if (error && !/duplicate/i.test(error.message)) throw new Refusal(400, error.message);
        const { count } = await db.from('reports').select('*', { count: 'exact', head: true }).eq('message_id', id);
        if ((count ?? 0) >= AUTO_HIDE) await db.from('messages').update({ hidden: true }).eq('id', id);
        return reply(200, { ok: true });
      }
      case 'update': {
        const presaleId = str(body.presaleId, 80);
        if (!(await roleOf(presaleId, wallet))) throw new Refusal(403, 'Only the founder or team can post updates.');
        const title = str(body.title, 80), text = str(body.body, 2000);
        if (!title || !text) throw new Refusal(400, 'An update needs a title and a body.');
        const { error } = await db.from('updates').insert({ presale_id: presaleId, wallet, title, body: text });
        if (error) throw new Refusal(400, error.message);
        return reply(200, { ok: true });
      }
      case 'register': {
        const presaleId = str(body.presaleId, 80);
        const { count } = await db.from('presale_roles').select('*', { count: 'exact', head: true }).eq('presale_id', presaleId);
        if (count) throw new Refusal(409, 'That raise already has a founder.');
        await db.from('presale_roles').insert({ presale_id: presaleId, wallet, role: 'founder' });
        return reply(200, { ok: true });
      }
      case 'upload-url': {
        const type = str(body.type, 60), size = Number(body.size);
        if (!TYPES[type]) throw new Refusal(400, 'Only PDF, PNG, JPEG, WebP and slide files (PowerPoint, Keynote, OpenDocument) can be uploaded.');
        if (!(size > 0 && size <= MAX_BYTES)) throw new Refusal(400, 'Files can be at most 10 MB.');
        const path = `uploads/${wallet}/${crypto.randomUUID()}.${TYPES[type]}`;
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error) throw new Refusal(400, error.message);
        const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
        return reply(200, { path, token: data.token, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
      }
      // The caller proved the wallet with its signed session (above) and proves the X account with the access token of an
      // X sign-in made through Supabase Auth. Both checked in one request is what makes the pair a link.
      case 'link-x': {
        const { data: u, error } = await db.auth.getUser(str(body.token, 6000));
        if (error || !u?.user) throw new Refusal(401, 'The X sign-in could not be checked. Try linking again.');
        const idn = (u.user.identities ?? []).find((i) => X_PROVIDERS.includes(i.provider));
        if (!idn) throw new Refusal(400, 'That sign-in was not an X account.');
        const d = (idn.identity_data ?? {}) as Record<string, unknown>;
        const xId = str(d.provider_id ?? d.sub ?? idn.id, 40), handle = str(d.user_name ?? d.preferred_username, 15);
        if (!xId || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Refusal(400, 'X did not return a handle for that account.');
        const name = str(d.full_name ?? d.name, 60), avatar = str(d.avatar_url ?? d.picture, 300);
        const { error: e2 } = await db.from('x_links').upsert({ wallet, x_id: xId, handle, name, avatar, linked_at: new Date().toISOString() });
        if (e2) throw new Refusal(400, e2.message);
        return reply(200, { handle, name, avatar });
      }
      case 'unlink-x': {
        const { error } = await db.from('x_links').delete().eq('wallet', wallet);
        if (error) throw new Refusal(400, error.message);
        return reply(200, { ok: true });
      }
      default: throw new Refusal(400, 'Unknown action.');
    }
  } catch (e) {
    return reply(e instanceof Refusal ? e.status : 500, { error: (e as Error).message });
  }
});
