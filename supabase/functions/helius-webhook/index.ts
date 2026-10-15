// The indexer. Helius posts every transaction that touches the Seed program here (a "raw" webhook, so the log messages
// are included); the program's events in those logs are written to the raise tables. Everything is an upsert keyed by
// the transaction signature or the raise address, so a redelivered transaction changes nothing.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (provided), HELIUS_WEBHOOK_SECRET (the webhook's authorization
// header, set when the webhook is created), SEED_PAIR_DECIMALS optional ("So111...:9,EPjFW...:6"; wrapped SOL and USDC
// are known), SEED_TOKEN_DECIMALS (the launched tokens' decimals, 6 by default).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { eventsInLogs, REFUND_REASON } from '../_shared/events.ts';
import { indexSwap, readPoolFeeBps, type Tx } from '../_shared/swaps.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET') ?? '', RPC_URL = Deno.env.get('SEED_RPC_URL') ?? '';
/* the fee the pool opened with, kept on the row for the swap reader; null when the node has not got the account yet (the reader then reads it at the first swap) */
const poolFee = async (pool: string) => { try { return RPC_URL ? await readPoolFeeBps(RPC_URL, pool) : null; } catch (e) { console.error('pool fee', pool, (e as Error).message); return null; } };
const TOKEN_DEC = Number(Deno.env.get('SEED_TOKEN_DECIMALS') ?? 6);
const PAIR_DEC: Record<string, number> = { So11111111111111111111111111111111111111112: 9, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6 };
for (const kv of (Deno.env.get('SEED_PAIR_DECIMALS') ?? '').split(',')) { const [m, d] = kv.split(':'); if (m && d) PAIR_DEC[m.trim()] = Number(d); }
const units = (v: bigint | number, dec: number) => Number(v) / 10 ** dec;
const ts = (s: bigint | number) => new Date(Number(s) * 1000).toISOString();
const slug = (ticker: string, raise: string) => `${ticker.toLowerCase()}-${raise.slice(0, 8).toLowerCase()}`;   // the site's short id for a raise

/* the raise row an event belongs to, by the Raise account's address */
async function raiseOf(address: string) {
  const { data } = await db.from('raises').select('id, pair_mint, pool, raised, backers, payout_wallet, fees_founder_claimed, fees_seed_claimed, team_claimed').eq('address', address).maybeSingle();
  return data;
}
const dec = (r: { pair_mint: string }) => PAIR_DEC[r.pair_mint] ?? 9;

async function apply(name: string, e: Record<string, unknown>, tx: string, blockTime: number) {
  const now = new Date().toISOString(), at = e.at != null ? ts(e.at as bigint) : new Date(blockTime * 1000).toISOString();
  if (name === 'RaiseOpened') {
    const pairMint = e.pairMint as string, d = PAIR_DEC[pairMint] ?? 9, tr = e.schedule as { dayOffset: number; bps: number }[];
    await db.from('raises').upsert({
      id: slug(e.ticker as string, e.raise as string), address: e.raise, founder: e.founder, name: e.name, ticker: e.ticker, pair_mint: pairMint,
      target: units(e.target as bigint, d), target_usd: Number(e.targetUsdCents) / 100, sol_usd_at_open: Number(e.solUsdCents) / 100,
      team_bps: e.teamBps, team_schedule: tr.length ? { tranches: tr } : null, payout_wallet: e.payoutWallet, metadata_uri: (e.uri as string) || null,
      status: 'live', opened_at: ts(e.openedAt as bigint), ends_at: ts(e.endsAt as bigint), updated_at: now
    }, { onConflict: 'address', ignoreDuplicates: true });
    // the X account behind the handle hash, from the attestation log (a raise may open without one)
    if (e.xHandleHash) await linkX(e.raise as string, e.founder as string, e.xHandleHash as string);
    return;
  }
  if (name === 'XLinked') { await linkX(e.raise as string, e.founder as string, e.xHandleHash as string); return; }
  async function linkX(raise: string, founder: string, hash: string) {
    const { data: att } = await db.from('x_attestations').select('x_id').eq('wallet', founder).eq('handle_hash', hash).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (att) await db.from('raises').update({ x_id: att.x_id }).eq('address', raise);
  }
  const r = await raiseOf(e.raise as string); if (!r) return;   // an event for a raise this indexer has not seen open; the next backfill catches it
  const d = dec(r), up = (patch: Record<string, unknown>) => db.from('raises').update({ ...patch, updated_at: now }).eq('id', r.id);
  switch (name) {
    case 'Contributed':
      await db.from('contributions').upsert({ tx, raise_id: r.id, wallet: e.wallet, amount: units(e.amount as bigint, d), fee: units(e.fee as bigint, d), at }, { onConflict: 'tx', ignoreDuplicates: true });
      await up({ raised: units(e.raised as bigint, d), backers: e.backers }); break;
    case 'RaiseFilled': await up({ status: 'filled', seed_step: 'filled', filled_at: at }); break;
    case 'RaiseMinted': await up({ seed_step: 'minted', mint: e.mint }); break;
    case 'RaisePooled': await up({ seed_step: 'pooled', pool: e.pool, position: e.position, pool_fee_bps: await poolFee(e.pool as string) }); await watchPool(e.pool as string); break;
    case 'RaiseSeeded': await up({ status: 'seeded', seed_step: 'seeded', seeded_at: at, resolved_at: at }); if (r.pool) await watchPool(r.pool); break;   // a second chance for the webhook list
    case 'RaiseRefunded': await up({ status: 'refunded', refund_reason: REFUND_REASON[Number(e.reason)] ?? 'missed', resolved_at: at }); break;
    case 'RefundClaimed': await db.from('contributions').update({ refunded_at: at }).eq('raise_id', r.id).eq('wallet', e.wallet as string); break;
    case 'TokensClaimed': await db.from('contributions').update({ claimed_at: at }).eq('raise_id', r.id).eq('wallet', e.wallet as string); break;
    case 'FeesClaimed': {
      const founder = units(e.founder as bigint, d), seed = units(e.seed as bigint, d);
      const { data: dup } = await db.from('fee_claims').select('tx').eq('tx', tx).maybeSingle(); if (dup) break;
      await db.from('fee_claims').insert({ tx, raise_id: r.id, by: e.by, founder, seed, at });
      // what has been claimed so far; the volume itself comes from the indexed trades
      const { data: all } = await db.from('fee_claims').select('founder, seed').eq('raise_id', r.id);
      const f = (all ?? []).reduce((a, x) => a + Number(x.founder), 0), s = (all ?? []).reduce((a, x) => a + Number(x.seed), 0);
      await up({ fees_founder_claimed: f, fees_seed_claimed: s }); break;
    }
    case 'VestedClaimed': { const tokens = units(e.tokens as bigint, TOKEN_DEC); await up({ team_claimed: Number(r.team_claimed) + tokens }); await db.from('vested_claims').upsert({ tx, raise_id: r.id, tokens, payout_wallet: r.payout_wallet, at }, { onConflict: 'tx', ignoreDuplicates: true }); break; }
    case 'PayoutChangeRequested':
      await db.from('payout_changes').upsert({ tx, raise_id: r.id, from_wallet: e.from, to_wallet: e.to, requested_at: at, effective_at: ts(e.effectiveAt as bigint) }, { onConflict: 'tx', ignoreDuplicates: true });
      await up({ pending_payout: e.to, payout_effective_at: ts(e.effectiveAt as bigint) }); break;
    case 'PayoutChanged':
      await db.from('payout_changes').update({ applied_tx: tx, applied_at: at }).eq('raise_id', r.id).eq('to_wallet', e.to as string).is('applied_tx', null);
      await up({ payout_wallet: e.to, pending_payout: null, payout_effective_at: null }); break;
    case 'FraudFlagged': await up({ blacklisted: true, flag: { at, by: e.by, tx } }); break;
    case 'TakeoverApproved': await up({ payout_wallet: e.to, pending_payout: null, payout_effective_at: null, takeover: { from: e.from, to: e.to, at, by: e.by, tx } }); break;
  }
}

/* ---- the pool's swaps: parsed by the shared reader (../_shared/swaps.ts), which the crank also uses to backfill the
   swaps that land before Helius has a new pool on its address list */
const HELIUS_KEY = Deno.env.get('HELIUS_API_KEY') ?? '', WEBHOOK_ID = Deno.env.get('HELIUS_WEBHOOK_ID') ?? '';
/* the pool joins the webhook's address list, so its swaps start arriving */
async function watchPool(pool: string) {
  if (!HELIUS_KEY || !WEBHOOK_ID) { console.warn('pool not watched: HELIUS_API_KEY or HELIUS_WEBHOOK_ID missing'); return; }
  const url = `https://api.helius.xyz/v0/webhooks/${WEBHOOK_ID}?api-key=${HELIUS_KEY}`;
  try {
    const cur = await (await fetch(url)).json() as { webhookURL: string; transactionTypes: string[]; accountAddresses: string[]; webhookType: string; authHeader?: string };
    if ((cur.accountAddresses ?? []).includes(pool)) return;
    const r = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ webhookURL: cur.webhookURL, transactionTypes: cur.transactionTypes, accountAddresses: [...(cur.accountAddresses ?? []), pool], webhookType: cur.webhookType, authHeader: cur.authHeader }) });
    if (!r.ok) console.error('webhook update', r.status, await r.text());
  } catch (e) { console.error('webhook update', (e as Error).message); }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (SECRET && req.headers.get('authorization') !== SECRET) return new Response('no', { status: 401 });
  let items: unknown[]; try { items = await req.json(); } catch { return new Response('not JSON', { status: 400 }); }
  let n = 0;
  for (const it of Array.isArray(items) ? items : [items]) {
    const t = it as { transaction?: { signatures?: string[] }; meta?: { logMessages?: string[]; err?: unknown }; blockTime?: number; signature?: string };
    if (t.meta?.err) continue;   // a failed transaction emits nothing that counts
    const tx = t.transaction?.signatures?.[0] ?? t.signature ?? '', logs = t.meta?.logMessages ?? [];
    if (!tx) continue;
    try { if (await indexSwap(db, t as Tx, tx)) n++; } catch (e) { console.error('swap', tx, (e as Error).message); }
    if (!logs.length) continue;
    for (const ev of await eventsInLogs(logs)) { try { await apply(ev.name, ev.data, tx, t.blockTime ?? Math.floor(Date.now() / 1000)); n++; } catch (e) { console.error(ev.name, tx, (e as Error).message); } }
  }
  return new Response(JSON.stringify({ applied: n }), { headers: { 'Content-Type': 'application/json' } });
});
