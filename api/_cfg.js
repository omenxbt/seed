// What the functions share: the public Supabase project (the publishable key is public by design: reads only, row-level
// security on every table) and the site's own address.
export const SUPABASE_URL = 'https://xwokejftvhcwrwxxcykh.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_mCawmgR9Jggj2yWth4iJpQ_UguviCyf';   // the same public key js/config/supabase.js carries
export const SITE = 'https://seed-nu-ten.vercel.app';
export const fmtMcap = n => n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}K` : `$${Math.round(n)}`;
/* one raise, by the site's short id or the Raise account's address, as the indexer has it */
export async function raiseById(id) {
  const col = /^[A-Za-z0-9]{32,44}$/.test(id) && !/-/.test(id) ? 'address' : 'id';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/raises?select=id,address,name,ticker,pair_mint,target,raised,backers,status,ends_at,cap_usd,target_usd,metadata_uri&${col}=eq.${encodeURIComponent(id)}&limit=1`, { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!r.ok) return null; const rows = await r.json(); return rows[0] || null;
}
export const PAIR_SYMBOL = { So11111111111111111111111111111111111111112: 'SOL', EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC', '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'USDC' };
export function timeLeft(endsAt) {
  const ms = Date.parse(endsAt) - Date.now(); if (ms <= 0) return 'closed';
  const h = Math.floor(ms / 36e5), d = Math.floor(h / 24); return d >= 2 ? `${d} days left` : h >= 1 ? `${h}h left` : `${Math.max(1, Math.floor(ms / 6e4))}m left`;
}
