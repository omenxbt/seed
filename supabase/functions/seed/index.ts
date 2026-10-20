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
//   x-attest    {}                                    signs an attestation (wallet, X handle hash, expiry) for open_raise
//   raise-report   { raiseId, reason }                any signed-in wallet, once per raise; public
//   admin-flag     { raiseId, reportId, tx }          an admin wallet, after the on-chain admin_flag_fraud landed
//   admin-takeover { raiseId, reportId, to, label, tx } an admin wallet, after admin_approve_takeover landed
//   admin-dismiss  { reportId }                       an admin wallet
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. SEED_ALLOWED_DOMAINS is a comma-separated
// list of hosts a session may be signed for, for example "seed-nu-ten.vercel.app,127.0.0.1:8765". SEED_ADMINS is the
// comma-separated admin wallets (the multisig's signers). SEED_ATTESTOR_KEY is the attestor's 32-byte ed25519 seed in
// base58; its public key is in the program's Config. X_BEARER_TOKEN, if set, lets x-attest read the account's age and
// follower count from the X API.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import * as ed from 'npm:@noble/ed25519@2.1.0';
import { sha512 } from 'npm:@noble/hashes@1.4.0/sha512';
import { verifySession, base58Decode } from './verify.ts';
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const ALLOWED = (Deno.env.get('SEED_ALLOWED_DOMAINS') ?? 'seed-nu-ten.vercel.app').split(',').map((s) => s.trim()).filter(Boolean);
const AUTO_HIDE = 3;                 // matches RISK.chatAutoHideReports in js/config/risk.js
const BUCKET = 'presale-media';
const TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/json': 'json',   // json: the token's metadata
  // slide files, for a pitch deck
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.apple.keynote': 'key', 'application/vnd.oasis.opendocument.presentation': 'odp' };
const MAX_BYTES = 10 * 1024 * 1024;
const X_PROVIDERS = ['twitter', 'x'];   // Supabase Auth's names for X sign-in
const ADMINS = (Deno.env.get('SEED_ADMINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const ATTEST_HOURS = 1;                 // how long an attestation is good for; open_raise checks the expiry on chain
const ATTEST_PREFIX = new TextEncoder().encode('seed-x-attest:v1');
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Uint8Array): string {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let out = ''; while (n > 0n) { out = B58_ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
  return out;
}
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
/* the attestation open_raise verifies through the ed25519 program: prefix || wallet (32) || sha256(lower-cased handle) (32) || expiry (u64 LE) */
async function attest(wallet: string, handle: string) {
  const seed = Deno.env.get('SEED_ATTESTOR_KEY'); if (!seed) throw new Refusal(503, 'X attestation is not switched on yet.');
  const sk = base58Decode(seed); if (sk.length !== 32) throw new Refusal(500, 'The attestor key is not a 32-byte seed.');
  const handleHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(handle.toLowerCase())));
  const expiry = BigInt(Math.floor(Date.now() / 1000) + ATTEST_HOURS * 3600), exp = new Uint8Array(8); new DataView(exp.buffer).setBigUint64(0, expiry, true);
  const msg = ed.etc.concatBytes(ATTEST_PREFIX, base58Decode(wallet), handleHash, exp);
  const sig = ed.sign(msg, sk), pk = ed.getPublicKey(sk);
  return { wallet, handleHash: hex(handleHash), expiry: Number(expiry), message: base58Encode(msg), signature: base58Encode(sig), attestor: base58Encode(pk) };
}
/* the account's age and follower count from the X API, when a bearer token is set; otherwise what the sign-in gave */
async function xProfile(xId: string) {
  const tok = Deno.env.get('X_BEARER_TOKEN'); if (!tok) return null;
  try {
    const r = await fetch(`https://api.x.com/2/users/${encodeURIComponent(xId)}?user.fields=created_at,public_metrics`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return null;
    const d = (await r.json()).data;
    return d ? { x_created_at: d.created_at ?? null, followers: d.public_metrics?.followers_count ?? null } : null;
  } catch { return null; }
}
const isAdmin = (w: string) => ADMINS.includes(w);

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
        if (!TYPES[type]) throw new Refusal(400, 'Only PDF, PNG, JPEG, WebP, slide files (PowerPoint, Keynote, OpenDocument) and the token metadata JSON can be uploaded.');
        if (!(size > 0 && size <= MAX_BYTES)) throw new Refusal(400, 'Files can be at most 10 MB.');
        // the token's metadata JSON gets a short path: its address goes on chain in open_raise, where every byte counts
        // against the 1232-byte transaction (uploads/<wallet>/<uuid>.json was 174 characters; m/<10 chars>.json is 95)
        const path = TYPES[type] === 'json' ? `m/${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}.json` : `uploads/${wallet}/${crypto.randomUUID()}.${TYPES[type]}`;
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
      // The founder's X sign-in, as the program needs it. The wallet's link (made by link-x, which checked the X sign-in) is
      // the proof; the function signs that pair with an expiry, and open_raise verifies the signature on chain.
      case 'x-attest': {
        let { data: l } = await db.from('x_links').select('x_id, handle, name, avatar').eq('wallet', wallet).maybeSingle();
        // devnet only, while the X app is not set up: a typed handle stands in for the sign-in. Switched on by the
        // SEED_DEV_X_HANDLES secret, which must never be set on the mainnet project.
        if (!l && Deno.env.get('SEED_DEV_X_HANDLES') === '1' && /devnet/.test(Deno.env.get('SEED_RPC_URL') ?? '')) {
          const h = str(body.handle, 15).replace(/^@/, '');
          if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) throw new Refusal(400, 'Type an X handle.');
          l = { x_id: 'dev:' + h.toLowerCase(), handle: h, name: h, avatar: null };
        }
        if (!l) throw new Refusal(403, 'Sign in with X first.');
        const { data: xa } = await db.from('x_accounts').select('blacklisted, blacklist_raise').eq('x_id', l.x_id).maybeSingle();
        if (xa?.blacklisted) throw new Refusal(403, `@${l.handle} was flagged for fraud${xa.blacklist_raise ? ` on ${xa.blacklist_raise}` : ''} and cannot open another raise.`);
        const prof = await xProfile(l.x_id);
        await db.from('x_accounts').upsert({ x_id: l.x_id, handle: l.handle, name: l.name, avatar: l.avatar, ...(prof ?? {}), updated_at: new Date().toISOString() });
        const a = await attest(wallet, l.handle);
        await db.from('x_attestations').insert({ wallet, x_id: l.x_id, handle_hash: a.handleHash, expires_at: new Date(a.expiry * 1000).toISOString() });
        return reply(200, { ...a, handle: l.handle, xId: l.x_id, followers: prof?.followers ?? null, xCreatedAt: prof?.x_created_at ?? null });
      }
      // the raise's own words, keyed by its Raise account; only the wallet that opened it may write them
      case 'raise-profile': {
        const address = str(body.address, 64), profile = body.profile;
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) || !profile || typeof profile !== 'object') throw new Refusal(400, 'A raise address and a profile are needed.');
        if (JSON.stringify(profile).length > 60_000) throw new Refusal(413, 'That profile is too large.');
        const { data: have } = await db.from('raise_profiles').select('founder').eq('address', address).maybeSingle();
        if (have && have.founder !== wallet) throw new Refusal(403, 'Only the wallet that opened the raise can change its page.');
        const { data: r } = await db.from('raises').select('founder').eq('address', address).maybeSingle();
        if (r && r.founder !== wallet) throw new Refusal(403, 'Only the wallet that opened the raise can change its page.');
        const { error } = await db.from('raise_profiles').upsert({ address, founder: wallet, profile, updated_at: new Date().toISOString() });
        if (error) throw new Refusal(400, error.message);
        return reply(200, { ok: true });
      }
      case 'raise-report': {
        const raiseId = str(body.raiseId, 80), reason = str(body.reason, 600);
        if (!reason) throw new Refusal(400, 'Say what happened.');
        const { data: r } = await db.from('raises').select('id').eq('id', raiseId).maybeSingle();
        if (!r) throw new Refusal(404, 'That raise is not indexed yet.');
        const { data, error } = await db.from('raise_reports').insert({ raise_id: raiseId, wallet, reason }).select('id').single();
        if (error) throw new Refusal(/duplicate/i.test(error.message) ? 409 : 400, /duplicate/i.test(error.message) ? 'You have reported this raise already.' : error.message);
        return reply(200, { id: data.id });
      }
      // The two admin actions mirror the program's two admin instructions. The chain is the source of truth: the webhook
      // marks the raise when FraudFlagged or TakeoverApproved lands. These record the off-chain side: the report's state,
      // the X account's blacklist and the takeover's label.
      case 'admin-flag': {
        if (!isAdmin(wallet)) throw new Refusal(403, 'Admins only.');
        const raiseId = str(body.raiseId, 80), reportId = str(body.reportId, 40), tx = str(body.tx, 120);
        const { data: r } = await db.from('raises').select('id, x_id').eq('id', raiseId).maybeSingle();
        if (!r) throw new Refusal(404, 'No such raise.');
        const at = new Date().toISOString();
        await db.from('raises').update({ blacklisted: true, flag: { reportId, at, by: wallet, tx }, updated_at: at }).eq('id', raiseId);
        if (r.x_id) await db.from('x_accounts').update({ blacklisted: true, blacklisted_at: at, blacklist_raise: raiseId, updated_at: at }).eq('x_id', r.x_id);
        if (reportId) await db.from('raise_reports').update({ status: 'fraud', acted_by: wallet, acted_tx: tx || null }).eq('id', reportId);
        return reply(200, { ok: true });
      }
      case 'admin-takeover': {
        if (!isAdmin(wallet)) throw new Refusal(403, 'Admins only.');
        const raiseId = str(body.raiseId, 80), reportId = str(body.reportId, 40), to = str(body.to, 50), label = str(body.label, 60) || 'Backers', tx = str(body.tx, 120);
        const { data: r } = await db.from('raises').select('id, payout_wallet').eq('id', raiseId).maybeSingle();
        if (!r) throw new Refusal(404, 'No such raise.');
        const at = new Date().toISOString();
        await db.from('raises').update({ takeover: { from: r.payout_wallet, to, at, reportId, by: wallet, label, tx }, payout_wallet: to, pending_payout: null, payout_effective_at: null, updated_at: at }).eq('id', raiseId);
        if (reportId) await db.from('raise_reports').update({ status: 'takeover', acted_by: wallet, acted_tx: tx || null }).eq('id', reportId);
        return reply(200, { ok: true });
      }
      case 'admin-dismiss': {
        if (!isAdmin(wallet)) throw new Refusal(403, 'Admins only.');
        await db.from('raise_reports').update({ status: 'dismissed', acted_by: wallet }).eq('id', str(body.reportId, 40));
        return reply(200, { ok: true });
      }
      default: throw new Refusal(400, 'Unknown action.');
    }
  } catch (e) {
    return reply(e instanceof Refusal ? e.status : 500, { error: (e as Error).message });
  }
});
