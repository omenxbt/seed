// The scheduler. Runs on a timer (pg_cron calls it every minute) with a crank wallet that holds a little SOL for fees and
// nothing else. Every instruction it sends is permissionless, so the crank has no power anyone else lacks: it only makes
// things happen sooner. One pass:
//   live raises     settle, once the deadline has passed with the raise short (it refunds)
//   filled raises   the next seeding step (mint -> pool -> seed), or timeout_refund once the three days are up
//   seeded raises   claim_creator_fees when the position has fees waiting (at most once an hour per raise), and
//                   apply_payout_change once a requested change is due; the pool's swaps are backfilled from the RPC
//                   every pass for the first half hour after seeding (Helius only starts delivering them once the pool
//                   is on the webhook's address list), then once an hour
// The on-chain state is read fresh each pass; the tables are not trusted for what to send.
//
// Secrets: SEED_RPC_URL (devnet: the public endpoint, api.devnet.solana.com — Helius is kept for the webhook and the browser; mainnet: a paid RPC), SEED_CRANK_KEY (the crank wallet's 64-byte secret key, base58),
// SEED_PROGRAM_ID, CRANK_SECRET (the authorization header pg_cron sends). The IDL is bundled at deploy from js/idl/seed.json.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { Connection, Keypair, PublicKey } from 'npm:@solana/web3.js@1.95.3';
import { AnchorProvider, Program, Wallet } from 'npm:@coral-xyz/anchor@0.30.1';
import idl from './seed.json' with { type: 'json' };
import { seedClient } from './client.ts';
import { backfillPool, POOL_RAISE_COLS, type PoolRaise, mintDecimals } from '../_shared/swaps.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SECRET = Deno.env.get('CRANK_SECRET') ?? '';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s: string) { let n = 0n; for (const c of s) n = n * 58n + BigInt(B58.indexOf(c)); const out: number[] = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const c of s) { if (c !== '1') break; out.unshift(0); } return Uint8Array.from(out); }
const FEE_CLAIM_EVERY = 3600e3, BACKFILL_FRESH = 30 * 60e3;   // after seeding, the pool's swaps are read back every pass for this long

Deno.serve(async (req) => {
  if (SECRET && req.headers.get('authorization') !== SECRET) return new Response('no', { status: 401 });
  /* the RPC: SEED_RPC_URL, or SEED_RPC_FALLBACK (the network's public endpoint by default) when the first is at its quota
     or down, so a key outage cannot stop seeding (QA P0-F15) */
  const urls = [Deno.env.get('SEED_RPC_URL')!, Deno.env.get('SEED_RPC_FALLBACK') || (/devnet/.test(Deno.env.get('SEED_RPC_URL') || '') ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com')];
  let conn = new Connection(urls[0], 'confirmed'), rpcNote = '';
  try { await conn.getSlot('confirmed'); } catch (e) { rpcNote = `primary RPC failed (${String((e as Error).message).slice(0, 60)}); using the fallback`; console.warn(rpcNote); conn = new Connection(urls[1], 'confirmed'); }
  const crank = Keypair.fromSecretKey(b58(Deno.env.get('SEED_CRANK_KEY')!));
  const provider = new AnchorProvider(conn, new Wallet(crank), { commitment: 'confirmed' });
  const program = new Program(idl as never, provider), client = seedClient(program, conn);
  const done: string[] = [], failed: string[] = [], now = Date.now();
  const note = (s: string) => done.push(s), fail = (s: string, e: unknown) => { failed.push(`${s}: ${(e as Error).message}`); console.error(s, e); };

  /* every raise the program knows that is not settled: the chain, not the table, decides what to send */
  const raises = await client.allRaises();
  /* the seeding timeout as the program counts it: the config's seconds, shrunk 1440× in test mode (a day is a minute) */
  const cfg = await (program.account as any).config.fetch(PublicKey.findProgramAddressSync([new TextEncoder().encode('config')], program.programId)[0]);
  const seedTimeoutMs = Number(cfg.seedTimeout) * 1000 / (cfg.testMode ? 1440 : 1);
  /* a raise the chain has and the table does not (the webhook missed its opening): written from the account, so the site
     lists it and the swap reader has its pool; its buys arrive when scripts/reindex.ts replays it */
  try {
    const { data: known } = await db.from('raises').select('address').in('address', raises.map(r => r.publicKey.toBase58()));
    const have = new Set((known ?? []).map((x: { address: string }) => x.address));
    for (const r of raises.filter(r => !have.has(r.publicKey.toBase58()))) {
      const a = r.account, addr = r.publicKey.toBase58(), pair = a.pairMint.toBase58(), d = await mintDecimals(urls[0], pair).catch(() => pair === 'So11111111111111111111111111111111111111112' ? 9 : 6), u = (v: unknown) => Number(v) / 10 ** d;
      let uri: string | null = null; try { uri = (await (program.account as any).raiseMeta.fetch(PublicKey.findProgramAddressSync([new TextEncoder().encode('meta'), r.publicKey.toBuffer()], program.programId)[0])).uri || null; } catch { /* no meta account */ }
      const st = Object.keys(a.status)[0], ev = a.even as { cliffDays: number; intervalDays: number; count: number } | null;
      const { error } = await db.from('raises').upsert({
        id: `${String(a.ticker).toLowerCase()}-${addr.slice(0, 8).toLowerCase()}`, address: addr, founder: a.founder.toBase58(), name: a.name, ticker: a.ticker, pair_mint: pair,
        target: u(a.target), target_usd: Number(a.targetUsdCents) / 100, sol_usd_at_open: Number(a.solUsdCents) / 100, team_bps: a.teamBps,
        team_schedule: ev ? { cliffDays: Number(ev.cliffDays), intervalDays: Number(ev.intervalDays), count: Number(ev.count) } : (a.schedule as { dayOffset: number; bps: number }[]).length ? { tranches: (a.schedule as { dayOffset: number; bps: number }[]).map(t => ({ dayOffset: Number(t.dayOffset), bps: Number(t.bps) })) } : null,
        payout_wallet: a.payoutWallet.toBase58(), metadata_uri: uri, cap_usd: Number(a.capUsdCents) ? Number(a.capUsdCents) / 100 : null, preset: Number(a.capUsdCents) ? a.preset : null, min_buy: Number(a.minBuy) ? u(a.minBuy) : null, max_buy: Number(a.maxBuy) ? u(a.maxBuy) : null,
        raised: u(a.raised), backers: Number(a.backers), status: st, seed_step: Object.keys(a.seedStep)[0], opened_at: new Date(Number(a.openedAt) * 1000).toISOString(), ends_at: new Date(Number(a.endsAt) * 1000).toISOString(),
        filled_at: Number(a.filledAt) ? new Date(Number(a.filledAt) * 1000).toISOString() : null, seeded_at: Number(a.seededAt) ? new Date(Number(a.seededAt) * 1000).toISOString() : null,
        mint: a.mint.toBase58() === '11111111111111111111111111111111' ? null : a.mint.toBase58(), pool: a.pool.toBase58() === '11111111111111111111111111111111' ? null : a.pool.toBase58(), updated_at: new Date(now).toISOString()
      }, { onConflict: 'address', ignoreDuplicates: true });
      if (error) fail(`discover ${addr}`, new Error(error.message)); else note(`discovered ${addr} (the webhook had missed it)`);
    }
  } catch (e) { fail('discover', e); }
  for (const r of raises) {
    const id = r.publicKey.toBase58(), a = r.account, status = Object.keys(a.status)[0], step = Object.keys(a.seedStep)[0];   // Anchor enums arrive as { live: {} }
    try {
      /* the row's progress follows the account when the webhook has fallen behind (a missed delivery, a quota): raised,
         backers, status and the seeding step, so the board and the totals do not freeze at discovery (QA P2-91) */
      try {
        const cur = (await db.from('raises').select('raised, backers, status, seed_step, pair_mint').eq('address', id).maybeSingle()).data as { raised: number; backers: number; status: string; seed_step: string | null; pair_mint: string } | null;
        if (cur) {
          const dec = await mintDecimals(conn.rpcEndpoint, cur.pair_mint).catch(() => cur.pair_mint === 'So11111111111111111111111111111111111111112' ? 9 : 6), raised = Number(a.raised) / 10 ** dec, backers = Number(a.backers);
          const patch: Record<string, unknown> = {};
          if (Math.abs(Number(cur.raised) - raised) > 1e-9) patch.raised = raised;
          if (Number(cur.backers) !== backers) patch.backers = backers;
          if (cur.status !== status) patch.status = status;
          if ((cur.seed_step ?? 'filled') !== step && status !== 'live') patch.seed_step = step;
          if (Object.keys(patch).length) { await db.from('raises').update({ ...patch, updated_at: new Date(now).toISOString() }).eq('address', id); note(`refreshed ${id} ${Object.keys(patch).join(',')}`); }
        }
      } catch (e) { fail(`refresh ${id}`, e); }
      if (status === 'live' && Number(a.endsAt) * 1000 <= now) { await client.settle(r.publicKey); note(`settle ${id}`); continue; }
      if (status === 'filled') {
        /* seeding first, every ready step in one pass (mint, then pool, then seed), so the crank's cadence never decides a
           raise's fate (QA P0-F19). A refund is sent only when seeding has truly stalled: the step just failed, nothing moved
           this pass, and the program's window — the seeding timeout counted from the last step (the fill, then the mint) —
           has passed; the program refuses it otherwise. A pooled raise is never refunded: the pool holds it, crank_seed
           finishes it next pass */
        let cur = step, moved = false;
        try {
          if (cur === 'filled') { await client.crankMint(r.publicKey); note(`mint ${id}`); cur = 'minted'; moved = true; }
          if (cur === 'minted') { await client.crankPool(r.publicKey); note(`pool ${id}`); cur = 'pooled'; moved = true; }
          if (cur === 'pooled') { await client.crankSeed(r.publicKey); note(`seed ${id}`); moved = true; }
        } catch (e) {
          const since = Math.max(Number(a.progressAt ?? 0), Number(a.filledAt)) * 1000;   // a raise from before progress_at reads it as 0
          if (!moved && (cur === 'filled' || cur === 'minted') && since + seedTimeoutMs <= now) { await client.timeoutRefund(r.publicKey); note(`timeout ${id} (stalled at ${cur}: ${String((e as Error).message).slice(0, 60)})`); continue; }
          throw e;
        }
        if (moved) continue;
      }
      if (status === 'seeded') {
        if (a.pendingPayout && Number(a.payoutEffectiveAt) * 1000 <= now) { await client.applyPayoutChange(r.publicKey); note(`payout ${id}`); }
        const row = (await db.from('raises').select(POOL_RAISE_COLS).eq('address', id).maybeSingle()).data as PoolRaise | null;
        const { data: last } = await db.from('fee_claims').select('at').eq('raise_id', row?.id ?? '').order('at', { ascending: false }).limit(1).maybeSingle();
        if (!last || now - Date.parse(last.at) > FEE_CLAIM_EVERY) {
          // the program refuses a claim with nothing waiting at preflight, which costs nothing; that is the quiet case
          try { await client.claimCreatorFees(r.publicKey); note(`fees ${id}`); } catch (e) { if (!String((e as Error).message).includes('NothingToClaim')) throw e; }
        }
        /* the swaps the webhook did not deliver: every pass while the pool is new, then once an hour (the top of it). The
           reader pages back through the pool's signatures until the window is covered, so a busy launch keeps its first swaps */
        const seededMs = Number(a.seededAt) * 1000, fresh = now - seededMs < BACKFILL_FRESH;
        if (row?.pool && row.mint && row.pair_mint && (fresh || new Date(now).getMinutes() === 0)) {
          try { const n = await backfillPool(db, Deno.env.get('SEED_RPC_URL')!, row, 100, fresh ? 3600 : 2 * 3600); if (n) note(`backfill ${id} ${n}`); } catch (e) { fail(`backfill ${id}`, e); }
        }
        /* team tokens past their unlock: the schedule's tranches up to now, less what was claimed, with the config's unit (a minute in test mode) */
        if (Number(a.teamBps) > 0) {
          const unit = Number(cfg.testMode ? 60 : 86400), since = (now / 1000 - Number(a.seededAt)) / unit, team = Number(a.teamBps) / 10000 * 1e9 * 1e6;
          const ev = a.even as { cliffDays: number; intervalDays: number; count: number } | null;
          const unlockedBps = ev   // an even schedule: unlock k at cliff + k × interval, floor(passed × 10000 / count) bps in all (math.rs unlocked_bps)
            ? (since < Number(ev.cliffDays) ? 0 : (() => { const passed = Math.min(Number(ev.count), Math.floor((since - Number(ev.cliffDays)) / Math.max(1, Number(ev.intervalDays)))); return Math.floor(passed * 10000 / Number(ev.count)); })())
            : (a.schedule as { dayOffset: number; bps: number }[]).filter(t => Number(t.dayOffset) <= since).reduce((s, t) => s + Number(t.bps), 0);
          if (Math.floor(team * unlockedBps / 10000) > Number(a.teamClaimed) + 1) {
            try { await client.claimVested(r.publicKey); note(`vested ${id}`); } catch (e) { if (!String((e as Error).message).includes('NothingToClaim')) throw e; }
          }
        }
      }
    } catch (e) { fail(id, e); }
  }
  await db.from('ops_runs').insert({ fn: 'crank', ok: failed.length === 0, note: failed.length ? failed.slice(0, 3).join(' | ').slice(0, 300) : `${done.length} done${rpcNote ? '; ' + rpcNote : ''}` }).then(() => {}, () => {});   // the run's outcome, for the alerts job
  return new Response(JSON.stringify({ done, failed, rpc: rpcNote || undefined, at: new Date(now).toISOString() }), { headers: { 'Content-Type': 'application/json' } });
});
