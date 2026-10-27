// What the functions share: the public Supabase project (the publishable key is public by design: reads only, row-level
// security on every table), the site's own address (the host the request came in on, so a preview deployment previews
// itself) and the pair allowlist, read from the chain.
export const SUPABASE_URL = 'https://xwokejftvhcwrwxxcykh.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_mCawmgR9Jggj2yWth4iJpQ_UguviCyf';   // the same public key js/config/supabase.js carries
export const siteOf = req => { const u = new URL(req.url); return `${u.protocol}//${req.headers.get('x-forwarded-host') || req.headers.get('host') || u.host}`; };
/* the chain the site is on: the devnet program and the public devnet RPC unless the deployment's env says otherwise
   (production: SEED_RPC_URL a mainnet RPC, SEED_PROGRAM_ID the production id — program/MAINNET.md stage 3) */
const RPC = process.env.SEED_RPC_URL || 'https://api.devnet.solana.com', PROGRAM_ID = process.env.SEED_PROGRAM_ID || '8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn';
export const fmtMcap = n => n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}K` : `$${Math.round(n)}`;
/* one raise, by the site's short id or the Raise account's address, as the indexer has it */
export async function raiseById(id) {
  const byAddr = /^[A-Za-z0-9]{32,44}$/.test(id) && !/-/.test(id);   // an address is the Raise account's or the token's mint
  const r = await fetch(`${SUPABASE_URL}/rest/v1/raises?select=id,address,name,ticker,pair_mint,target,raised,backers,status,ends_at,cap_usd,target_usd,metadata_uri&${byAddr ? `or=(address.eq.${encodeURIComponent(id)},mint.eq.${encodeURIComponent(id)})` : `id=eq.${encodeURIComponent(id)}`}&limit=1`, { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!r.ok) return null; const rows = await r.json(); return rows[0] || null;
}
/* the pair asset's symbol: SOL and USDC built in, every other mint from the program's PairAsset accounts (the admin's allowlist),
   decoded from their fixed layout — mint, token program, decimals, feed, feed id, stable, paused, then the symbol as a
   length-prefixed string — and kept for two minutes in this isolate. An unknown mint is shown by its address */
const BUILT_IN = { So11111111111111111111111111111111111111112: 'SOL', EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC', '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'USDC' };
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = bytes => { let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of bytes) { if (b !== 0) break; s = '1' + s; } return s; };
let pairs = null, pairsAt = 0;
async function allowlist() {
  if (pairs && Date.now() - pairsAt < 120e3) return pairs;
  try {
    const disc = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('account:PairAsset'))).slice(0, 8);
    const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getProgramAccounts', params: [PROGRAM_ID, { encoding: 'base64', filters: [{ memcmp: { offset: 0, bytes: b58(disc) } }] }] }) });
    const out = {};
    for (const a of (await res.json()).result || []) {
      const d = Uint8Array.from(atob(a.account.data[0]), c => c.charCodeAt(0)), mint = b58(d.slice(8, 40));
      const at = 8 + 32 + 32 + 1 + 32 + 32 + 1 + 1, len = d[at] | d[at + 1] << 8 | d[at + 2] << 16 | d[at + 3] << 24;
      out[mint] = new TextDecoder().decode(d.slice(at + 4, at + 4 + len));
    }
    pairs = out; pairsAt = Date.now();
  } catch { pairs = pairs || {}; }
  return pairs;
}
export async function pairSymbol(mint) { return BUILT_IN[mint] || (await allowlist())[mint] || `${mint.slice(0, 4)}…${mint.slice(-4)}`; }
export function timeLeft(endsAt) {
  const ms = Date.parse(endsAt) - Date.now(); if (ms <= 0) return 'closed';
  const h = Math.floor(ms / 36e5), d = Math.floor(h / 24); return d >= 2 ? `${d} days left` : h >= 1 ? `${h}h left` : `${Math.max(1, Math.floor(ms / 6e4))}m left`;
}
