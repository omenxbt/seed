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
// Secrets: SEED_RPC_URL (devnet or mainnet), SEED_CRANK_KEY (the crank wallet's 64-byte secret key, base58),
// SEED_PROGRAM_ID, CRANK_SECRET (the authorization header pg_cron sends). The IDL is bundled at deploy from js/idl/seed.json.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { Connection, Keypair, PublicKey } from 'npm:@solana/web3.js@1.95.3';
import { AnchorProvider, Program, Wallet } from 'npm:@coral-xyz/anchor@0.30.1';
import idl from './seed.json' with { type: 'json' };
import { seedClient } from './client.ts';
import { backfillPool, POOL_RAISE_COLS, type PoolRaise } from '../_shared/swaps.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SECRET = Deno.env.get('CRANK_SECRET') ?? '';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s: string) { let n = 0n; for (const c of s) n = n * 58n + BigInt(B58.indexOf(c)); const out: number[] = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const c of s) { if (c !== '1') break; out.unshift(0); } return Uint8Array.from(out); }
const FEE_CLAIM_EVERY = 3600e3, BACKFILL_FRESH = 30 * 60e3;   // after seeding, the pool's swaps are read back every pass for this long

Deno.serve(async (req) => {
  if (SECRET && req.headers.get('authorization') !== SECRET) return new Response('no', { status: 401 });
  const conn = new Connection(Deno.env.get('SEED_RPC_URL')!, 'confirmed'), crank = Keypair.fromSecretKey(b58(Deno.env.get('SEED_CRANK_KEY')!));
  const provider = new AnchorProvider(conn, new Wallet(crank), { commitment: 'confirmed' });
  const program = new Program(idl as never, provider), client = seedClient(program, conn);
  const done: string[] = [], failed: string[] = [], now = Date.now();
  const note = (s: string) => done.push(s), fail = (s: string, e: unknown) => { failed.push(`${s}: ${(e as Error).message}`); console.error(s, e); };

  /* every raise the program knows that is not settled: the chain, not the table, decides what to send */
  const raises = await client.allRaises();
  /* the seeding timeout as the program counts it: the config's seconds, shrunk 1440× in test mode (a day is a minute) */
  const cfg = await (program.account as any).config.fetch(PublicKey.findProgramAddressSync([new TextEncoder().encode('config')], program.programId)[0]);
  const seedTimeoutMs = Number(cfg.seedTimeout) * 1000 / (cfg.testMode ? 1440 : 1);
  for (const r of raises) {
    const id = r.publicKey.toBase58(), a = r.account, status = Object.keys(a.status)[0], step = Object.keys(a.seedStep)[0];   // Anchor enums arrive as { live: {} }
    try {
      if (status === 'live' && Number(a.endsAt) * 1000 <= now) { await client.settle(r.publicKey); note(`settle ${id}`); continue; }
      if (status === 'filled') {
        if (Number(a.filledAt) * 1000 + seedTimeoutMs <= now) { await client.timeoutRefund(r.publicKey); note(`timeout ${id}`); continue; }
        if (step === 'filled') { await client.crankMint(r.publicKey); note(`mint ${id}`); }
        else if (step === 'minted') { await client.crankPool(r.publicKey); note(`pool ${id}`); }
        else if (step === 'pooled') { await client.crankSeed(r.publicKey); note(`seed ${id}`); }
        continue;
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
          const unlockedBps = (a.schedule as { dayOffset: number; bps: number }[]).filter(t => Number(t.dayOffset) <= since).reduce((s, t) => s + Number(t.bps), 0);
          if (Math.floor(team * unlockedBps / 10000) > Number(a.teamClaimed) + 1) {
            try { await client.claimVested(r.publicKey); note(`vested ${id}`); } catch (e) { if (!String((e as Error).message).includes('NothingToClaim')) throw e; }
          }
        }
      }
    } catch (e) { fail(id, e); }
  }
  return new Response(JSON.stringify({ done, failed, at: new Date(now).toISOString() }), { headers: { 'Content-Type': 'application/json' } });
});
