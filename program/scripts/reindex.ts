// Replays a raise's (or any address's) transactions through the helius-webhook function, so the indexer applies them exactly
// as it would have when Helius delivered them: every transaction that touched the address, oldest first, posted in the
// RPC's own json shape (what a raw Helius webhook carries). For a raise, its pool's transactions go too, so the swaps land.
// Needs SEED_REPLAY_KEY (the function's secret, in .env.local) and SUPABASE_URL; reads the chain through ANCHOR_PROVIDER_URL.
//   set -a; . ../.env.local; set +a; ANCHOR_PROVIDER_URL=<devnet rpc> npx ts-node -P tsconfig.json scripts/reindex.ts <raise address or id> [...]
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';

const KEY = process.env.SEED_REPLAY_KEY, SUPA = process.env.SUPABASE_URL, RPC = process.env.ANCHOR_PROVIDER_URL;
if (!KEY || !SUPA || !RPC) throw new Error('SEED_REPLAY_KEY, SUPABASE_URL and ANCHOR_PROVIDER_URL are needed');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

(async () => {
  const conn = new web3.Connection(RPC, 'confirmed'), program = new anchor.Program(idl as anchor.Idl, { connection: conn }), coder = program.coder.accounts;
  const args = process.argv.slice(2); if (!args.length) throw new Error('give raise addresses or ids');
  /* an id (ticker-xxxxxxxx) is looked up among the program's accounts; a bare ticker (no dash, ten characters or fewer) means
     every raise with that ticker; an address is used as is */
  let all: readonly { pubkey: web3.PublicKey; account: web3.AccountInfo<Buffer> }[] | null = null;
  const resolve = async (a: string): Promise<web3.PublicKey[]> => {
    if (a.length > 40) return [new web3.PublicKey(a)];
    all = all || await conn.getProgramAccounts(program.programId);
    const found: web3.PublicKey[] = [];
    for (const x of all) { try { const d = coder.decode('raise', x.account.data), id = `${d.ticker.toLowerCase()}-${x.pubkey.toBase58().slice(0, 8).toLowerCase()}`; if (id === a.toLowerCase() || (!a.includes('-') && d.ticker.toLowerCase() === a.toLowerCase())) found.push(x.pubkey); } catch { /* not a raise */ } }
    if (!found.length) throw new Error('no raise ' + a);
    return found;
  };
  const post = async (items: unknown[]) => {
    const r = await fetch(`${SUPA}/functions/v1/helius-webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-seed-replay': KEY }, body: JSON.stringify(items) });
    const t = await r.text(); if (!r.ok) throw new Error(`webhook ${r.status}: ${t}`); return t;
  };
  for (const a of args) for (const raise of await resolve(a)) {
    const addresses = [raise];
    try { const d: any = await (program.account as any).raise.fetch(raise); if (d.pool && !d.pool.equals(web3.PublicKey.default)) addresses.push(d.pool); } catch (e) { console.warn(`${a}: raise account not decodable (${(e as Error).message.slice(0, 60)}); replaying its transactions anyway`); }
    for (const addr of addresses) {
      const sigs = (await conn.getSignaturesForAddress(addr, { limit: 1000 })).reverse();   // oldest first, as they happened
      const txs: unknown[] = [];
      for (const s of sigs) {
        if (s.err) continue;
        const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
        if (tx) txs.push({ signature: s.signature, slot: tx.slot, blockTime: tx.blockTime, transaction: tx.transaction, meta: tx.meta });
        await sleep(60);
      }
      for (let i = 0; i < txs.length; i += 20) { const got = await post(txs.slice(i, i + 20)); console.log(`${a} ${addr.equals(raise) ? 'raise' : 'pool '} ${addr.toBase58().slice(0, 8)}… ${Math.min(i + 20, txs.length)}/${txs.length} → ${got.trim()}`); }
    }
  }
})();
