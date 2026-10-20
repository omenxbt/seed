// The rehearsal's last step on a validator left running: the day-90 unlock of raise A to the takeover wallet. Used once, when the
// first run's final claim failed on a harness slip (the payout token account had been bundled with a claim meant to fail).
//   ANCHOR_PROVIDER_URL=http://127.0.0.1:8999 ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/rehearsal/finish-unlock.ts
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { SeedClient } from '../../client/seed';
import idl from '../../target/idl/seed.json';
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  const A = new web3.PublicKey('G1cnkABxkXeHqvwP2mw7VqgrvGrW4qkbgmAuYswarXJD'), r: any = await c.fetchRaise(A);
  const now = (await provider.connection.getBlockTime(await provider.connection.getSlot())) || 0, days = (now - Number(r.seededAt)) / Number(r.timeUnit);
  console.log(`A seeded at ${new Date(Number(r.seededAt) * 1000).toISOString()}, ${days.toFixed(1)} "days" ago; payout wallet ${r.payoutWallet.toBase58()} (the takeover's); team claimed so far ${Number(r.teamClaimed) / 1e6}`);
  await c.send([c.ata(me.publicKey, r.payoutWallet, r.mint)]);
  await c.send([await c.claimVested(A, r.mint, r.payoutWallet, me.publicKey)]);
  const got = (await getAccount(provider.connection, getAssociatedTokenAddressSync(r.mint, r.payoutWallet, true))).amount;
  console.log(`PASS  A: at day 90 the whole team share unlocks to the takeover wallet — ${Number(got) / 1e6} tokens (${got === 200_000_000_000_000n ? '200M, exactly 20% of the supply' : 'NOT 200M'})`);
  try { await c.send([await c.claimVested(A, r.mint, r.payoutWallet, me.publicKey)]); console.log('FAIL  A: a second claim should find nothing'); } catch (e: any) { console.log(`PASS  A: nothing left after the last unlock — ${/NothingToClaim/.test(e.message) ? 'NothingToClaim' : e.message.slice(0, 80)}`); }
})();
