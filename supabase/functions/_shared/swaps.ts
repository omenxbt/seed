// A pool's swaps, read off a transaction and written to the trades table. Shared by the webhook (which gets every
// transaction that touches a watched pool as it lands) and the crank (which reads a pool's recent signatures from the
// RPC and fills in what the webhook missed: the first swaps after seeding land before Helius has the pool on its address
// list, and a delivery can fail). Both are idempotent: a trade is keyed by its signature, and the volume is bumped once.
//
// The vaults belong to DAMM's pool authority; the one of the raise's mint moving one way and the pair's the other way is
// a swap. Seed's own transactions (the pool's opening, fee claims) are skipped by the program's presence in the account list.
// A swap is priced net of the pool's own fee, read once from the pool account (a pool seeded before a config change
// keeps the fee it opened with) and kept on the raise row.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export const DAMM_AUTHORITY = 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC';
const SEED_PROGRAM = Deno.env.get('SEED_PROGRAM_ID') ?? '', POOL_FEE_BPS = Number(Deno.env.get('SEED_POOL_FEE_BPS') ?? 100), RPC_URL = Deno.env.get('SEED_RPC_URL') ?? '';
type TokBal = { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string; decimals: number } };
export type Tx = { transaction?: { message?: { accountKeys?: unknown[] }; signatures?: string[] }; meta?: { err?: unknown; preTokenBalances?: TokBal[]; postTokenBalances?: TokBal[]; loadedAddresses?: { writable?: string[]; readonly?: string[] } }; slot?: number; blockTime?: number };
export type PoolRaise = { id: string; pool: string; mint: string; pair_mint: string; pool_fee_bps?: number | null };
export const POOL_RAISE_COLS = 'id, pool, mint, pair_mint, pool_fee_bps';

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

/* the raise rows whose pool is in the transaction, then each one's swap if there is one; returns how many were new */
export async function indexSwap(db: SupabaseClient, t: Tx, tx: string, only?: PoolRaise[]) {
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
      const dec = (post ?? pre)!.uiTokenAmount.decimals; return { d: (Number(post?.uiTokenAmount.amount ?? 0) - Number(pre?.uiTokenAmount.amount ?? 0)) / 10 ** dec };
    };
    const tok = delta(r.mint), pair = delta(r.pair_mint);
    if (!tok || !pair || tok.d === 0 || pair.d === 0 || Math.sign(tok.d) === Math.sign(pair.d)) continue;   // not a swap: nothing moved, or both vaults went the same way (liquidity)
    const side = pair.d > 0 ? 'buy' : 'sell', pair_amount = Math.abs(pair.d), token_amount = Math.abs(tok.d), fee = (await poolFeeBps(db, r)) / 10000;
    const price = (side === 'buy' ? pair_amount * (1 - fee) : pair_amount / (1 - fee)) / token_amount;   // the pool's own price: a buy's delta carries the fee, a sell's comes after it
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
    n += await indexSwap(db, t, s.signature, [r]);
  }
  return n;
}
