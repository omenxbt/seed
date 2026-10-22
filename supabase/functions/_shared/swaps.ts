// A pool's swaps, read off a transaction and written to the trades table. Shared by the webhook (which gets every
// transaction that touches a watched pool as it lands) and the crank (which reads a pool's recent signatures from the
// RPC and fills in what the webhook missed: the first swaps after seeding land before Helius has the pool on its address
// list, and a delivery can fail). Both are idempotent: a trade is keyed by its signature, and the volume is bumped once.
//
// The vaults belong to DAMM's pool authority; the one of the raise's mint moving one way and the pair's the other way is
// a swap. Seed's own transactions (the pool's opening, fee claims) are skipped by the program's presence in the account list.
// A swap's price is where the pool stands after it: the next_sqrt_price in DAMM's own swap event in the transaction;
// failing that the pool account's price (the latest swap only) or the vaults' ratio; the fee-net fill only if a vault
// balance is unreadable. Each pool's fee is read once from its account and kept on the raise row.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export const DAMM_AUTHORITY = 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC';
const SEED_PROGRAM = Deno.env.get('SEED_PROGRAM_ID') ?? '', POOL_FEE_BPS = Number(Deno.env.get('SEED_POOL_FEE_BPS') ?? 100), RPC_URL = Deno.env.get('SEED_RPC_URL') ?? '';
type TokBal = { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string; decimals: number } };
type InnerIx = { programIdIndex: number; data: string };
export type Tx = { transaction?: { message?: { accountKeys?: unknown[] }; signatures?: string[] }; meta?: { err?: unknown; preTokenBalances?: TokBal[]; postTokenBalances?: TokBal[]; loadedAddresses?: { writable?: string[]; readonly?: string[] }; innerInstructions?: { instructions: InnerIx[] }[] }; slot?: number; blockTime?: number };
export const DAMM_PROGRAM = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG';
export type PoolRaise = { id: string; pool: string; mint: string; pair_mint: string; pool_fee_bps?: number | null };
export const POOL_RAISE_COLS = 'id, pool, mint, pair_mint, pool_fee_bps';

/* a mint's decimals, read once per mint from its account (Token or Token-2022: the field sits at the same offset, 44) */
const decimalsCache = new Map<string, number>();
export async function mintDecimals(url: string, mint: string): Promise<number> {
  const known: Record<string, number> = { So11111111111111111111111111111111111111112: 9, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6, '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 6 };
  if (known[mint] != null) return known[mint];
  if (decimalsCache.has(mint)) return decimalsCache.get(mint)!;
  const r = await rpcCall(url, 'getAccountInfo', [mint, { encoding: 'base64' }]) as { value?: { data: [string, string] } } | null;
  const data = r?.value?.data?.[0]; if (!data) throw new Error('no mint ' + mint);
  const d = Uint8Array.from(atob(data), c => c.charCodeAt(0)); const dec = d[44]; decimalsCache.set(mint, dec); return dec;
}
const rpcCall = async (url: string, method: string, params: unknown[]) => { const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then((x) => x.json()); if (res.error) throw new Error(res.error.message); return res.result; };

/* the pool's flat fee in basis points: the cliff fee numerator, a u64 over 1e9 at the head of the pool account's fee
   struct (right after the 8-byte discriminator); the browser reads the same field through the SDK */
export async function readPoolFeeBps(rpcUrl: string, pool: string) {
  const info = await rpcCall(rpcUrl, 'getAccountInfo', [pool, { encoding: 'base64', commitment: 'confirmed' }]) as { value?: { data?: [string, string] } } | null;
  const b64 = info?.value?.data?.[0]; if (!b64) return null;
  const d = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); if (d.length < 16) return null;
  let n = 0; for (let i = 15; i >= 8; i--) n = n * 256 + d[i];
  return Math.round(n / 1e5);
}

/* the pool account's live price with the slot it was read at: sqrt_price (a Q64.64 u128 at byte 456) squared is token B
   per token A in base units; the mints at bytes 168 and 200 say which way round the raise's token is */
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = (b: Uint8Array) => { let n = 0n; for (const x of b) n = n * 256n + BigInt(x); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const x of b) { if (x !== 0) break; s = '1' + s; } return s; };
const b58d = (s: string) => { let n = 0n; for (const c of s) n = n * 58n + BigInt(B58.indexOf(c)); const out: number[] = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const c of s) { if (c !== '1') break; out.unshift(0); } return Uint8Array.from(out); };
const u128 = (d: Uint8Array, off: number) => { let n = 0n; for (let i = off + 15; i >= off; i--) n = n * 256n + BigInt(d[i]); return n; };

/* the sqrt price the pool was left at by its swap in this transaction, from DAMM's own swap event (emitted through a
   self-CPI: the instruction data is Anchor's event prefix, the event's discriminator, then the event). EvtSwap2 carries
   next_sqrt_price at byte 84 of the event, the older EvtSwap at byte 58; the first 32 bytes name the pool. The last
   event for the pool wins (a route can swap it twice). Null when the transaction has no such event (then the vaults' ratio) */
const EVENT_PREFIX = 'e445a52e51cb9a1d', SWAP_EVENTS: Record<string, number> = { bd4233a826507599: 84 /* EvtSwap2 */, '1b3c15d58aaabb93': 58 /* EvtSwap */ };
const hex = (d: Uint8Array) => Array.from(d, (x) => x.toString(16).padStart(2, '0')).join('');
export function swapEventSqrtPrice(t: Tx, keys: string[], pool: string) {
  let found: bigint | null = null;
  for (const inner of t.meta?.innerInstructions ?? []) for (const ix of inner.instructions ?? []) {
    if (keys[ix.programIdIndex] !== DAMM_PROGRAM || !ix.data) continue;
    let d: Uint8Array; try { d = b58d(ix.data); } catch { continue; }
    if (d.length < 16 || hex(d.subarray(0, 8)) !== EVENT_PREFIX) continue;
    const at = SWAP_EVENTS[hex(d.subarray(8, 16))]; if (!at) continue;
    const body = d.subarray(16); if (body.length < at + 16 || b58(body.subarray(0, 32)) !== pool) continue;
    found = u128(body, at);
  }
  return found;
}
export async function readPoolPrice(rpcUrl: string, pool: string, mint: string, tokDec: number, pairDec: number) {
  const info = await rpcCall(rpcUrl, 'getAccountInfo', [pool, { encoding: 'base64', commitment: 'confirmed' }]) as { context?: { slot?: number }; value?: { data?: [string, string] } } | null;
  const b64 = info?.value?.data?.[0]; if (!b64) return null;
  const d = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); if (d.length < 472) return null;
  let sq = 0n; for (let i = 471; i >= 456; i--) sq = sq * 256n + BigInt(d[i]);
  const raw = (Number(sq) / 2 ** 64) ** 2, tokA = b58(d.subarray(168, 200)) === mint;
  if (!tokA && b58(d.subarray(200, 232)) !== mint) return null;
  return { price: (tokA ? raw : 1 / raw) * 10 ** (tokDec - pairDec), slot: info?.context?.slot ?? 0 };
}

const feeCache: Record<string, number> = {};
/* the raise's pool fee: the row's, else read from the chain and kept on the row; the env's setting only when the chain is out of reach */
async function poolFeeBps(db: SupabaseClient, r: PoolRaise) {
  if (r.pool_fee_bps) return r.pool_fee_bps;
  if (feeCache[r.pool]) return feeCache[r.pool];
  try {
    const bps = RPC_URL ? await readPoolFeeBps(RPC_URL, r.pool) : null;
    if (bps) { feeCache[r.pool] = r.pool_fee_bps = bps; await db.from('raises').update({ pool_fee_bps: bps }).eq('id', r.id); return bps; }
  } catch (e) { console.error('pool fee', r.pool, (e as Error).message); }
  return POOL_FEE_BPS;
}

/* the raise rows whose pool is in the transaction, then each one's swap if there is one; returns how many were new.
   `exact`: the swap is the pool's latest (just delivered), so the pool account's price is its price */
export async function indexSwap(db: SupabaseClient, t: Tx, tx: string, only?: PoolRaise[], exact = false) {
  const m = t.meta; if (!m?.preTokenBalances || !m.postTokenBalances) return 0;
  const keys = (t.transaction?.message?.accountKeys ?? []).map((k) => typeof k === 'string' ? k : (k as { pubkey: string }).pubkey).concat(m.loadedAddresses?.writable ?? [], m.loadedAddresses?.readonly ?? []);
  if (!keys.length || (SEED_PROGRAM && keys.includes(SEED_PROGRAM))) return 0;
  const raises = only ?? (await db.from('raises').select(POOL_RAISE_COLS).in('pool', keys).not('pool', 'is', null)).data as PoolRaise[] | null;
  if (!raises?.length) return 0;
  let n = 0;
  for (const r of raises) {
    if (!keys.includes(r.pool)) continue;
    const delta = (mint: string) => {
      const pre = m.preTokenBalances!.find((b) => b.owner === DAMM_AUTHORITY && b.mint === mint), post = m.postTokenBalances!.find((b) => b.owner === DAMM_AUTHORITY && b.mint === mint);
      if (!pre && !post) return null;
      const dec = (post ?? pre)!.uiTokenAmount.decimals, after = Number(post?.uiTokenAmount.amount ?? 0) / 10 ** dec;
      return { d: after - Number(pre?.uiTokenAmount.amount ?? 0) / 10 ** dec, after, dec };
    };
    const tok = delta(r.mint), pair = delta(r.pair_mint);
    if (!tok || !pair || tok.d === 0 || pair.d === 0 || Math.sign(tok.d) === Math.sign(pair.d)) continue;   // not a swap: nothing moved, or both vaults went the same way (liquidity)
    const side = pair.d > 0 ? 'buy' : 'sell', pair_amount = Math.abs(pair.d), token_amount = Math.abs(tok.d), fee = (await poolFeeBps(db, r)) / 10000;
    /* the price is where the pool stands after the swap (its vaults' ratio: the whole range is one locked position, so
       the reserves sit at the price, give or take the fees waiting to be claimed), not the swap's own average fill, which
       on a thin pool is nowhere near where the price ends up. The fill price, net of the pool fee, only if a vault is unreadable */
    let price = tok.after > 0 && pair.after > 0 ? pair.after / tok.after : (side === 'buy' ? pair_amount * (1 - fee) : pair_amount / (1 - fee)) / token_amount;
    /* exact, from the swap event's next_sqrt_price: token B per token A in base units, squared, the raise's token
       being A or B by which vault moved against the pair (the event names the pool, not the side) */
    const sq = swapEventSqrtPrice(t, keys, r.pool);
    if (sq != null) {
      const raw = (Number(sq) / 2 ** 64) ** 2, a = raw * 10 ** (tok.dec - pair.dec), b = (1 / raw) * 10 ** (tok.dec - pair.dec);
      const ev = Math.abs(a / price - 1) < Math.abs(b / price - 1) ? a : b;   // the orientation that agrees with the vaults
      if (Math.abs(ev / price - 1) < 0.05) price = ev;
    }
    /* no event (a node that strips inner instructions): the pool account's own sqrt_price, when the swap is the pool's
       latest (just delivered) and the node has caught up with it, and only while it agrees with the vault ratio to within
       the fee drift (a swap that landed since would move it further) */
    else if (RPC_URL && exact) { try { const live = await readPoolPrice(RPC_URL, r.pool, r.mint, tok.dec, pair.dec); if (live && live.slot >= (t.slot ?? 0) && Math.abs(live.price / price - 1) < 0.02) price = live.price; } catch (e) { console.error('pool price', r.pool, (e as Error).message); } }
    const { error } = await db.from('trades').insert({ signature: tx, raise_id: r.id, pool: r.pool, side, pair_amount, token_amount, price, trader: keys[0], slot: t.slot ?? 0, at: new Date((t.blockTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString() });
    if (error) { if (error.code !== '23505') console.error('trade', tx, error.message); continue; }   // 23505: seen before, so the volume was counted then
    await db.rpc('bump_volume', { p_raise_id: r.id, p_amount: pair_amount, p_signature: tx }).then(({ error: e2 }) => { if (e2) console.error('volume', e2.message); });
    n++;
  }
  return n;
}

/* the pool's recent transactions from the RPC, the ones not yet in the trades table read in full and indexed. Newest
   first, `pageSize` signatures a page, paged back until the window of `sinceSec` is covered or the pool's first
   transaction is reached (at most `maxPages` pages). Returns how many trades were new. */
export async function backfillPool(db: SupabaseClient, rpcUrl: string, r: PoolRaise, pageSize = 100, sinceSec = 2 * 3600, maxPages = 10) {
  const floor = Math.floor(Date.now() / 1000) - sinceSec, sigs: { signature: string; blockTime?: number }[] = [];
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const batch = await rpcCall(rpcUrl, 'getSignaturesForAddress', [r.pool, { limit: pageSize, commitment: 'confirmed', ...(before ? { before } : {}) }]) as { signature: string; err: unknown; blockTime?: number }[];
    for (const s of batch) if (!s.err && (!s.blockTime || s.blockTime > floor)) sigs.push(s);
    const last = batch[batch.length - 1];
    if (batch.length < pageSize || (last?.blockTime && last.blockTime <= floor)) break;   // the pool's first transaction, or past the window
    before = last.signature;
  }
  if (!sigs.length) return 0;
  const known = new Set<string>();
  for (let i = 0; i < sigs.length; i += 200) {   // the ones already indexed, asked in slices the query string can carry
    const { data: seen } = await db.from('trades').select('signature').in('signature', sigs.slice(i, i + 200).map((s) => s.signature));
    for (const x of seen ?? []) known.add(x.signature);
  }
  let n = 0;
  for (const s of sigs) {
    if (known.has(s.signature)) continue;
    const t = await rpcCall(rpcUrl, 'getTransaction', [s.signature, { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]) as Tx | null;
    if (!t || t.meta?.err) continue;
    n += await indexSwap(db, t, s.signature, [r], s === sigs[0]);   // the pool's newest transaction may take the account's exact price
  }
  return n;
}
