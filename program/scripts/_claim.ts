import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { CpAmm, getUnClaimLpFee } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { SeedClient, WSOL } from '../client/seed';
import idl from '../target/idl/seed.json';
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  const raise = new web3.PublicKey(process.argv[2]), r: any = await c.fetchRaise(raise), cfg = await c.fetchConfig();
  const amm = new CpAmm(provider.connection), ps = await amm.fetchPoolState(r.pool), pos = await amm.fetchPositionState(r.position);
  const un = getUnClaimLpFee(ps, pos); console.log('unclaimed', { a: un.feeTokenA.toString(), b: un.feeTokenB.toString() }, 'claimedB so far', pos.metrics.totalClaimedBFee.toString(), 'creatorShareBps', r.creatorShareBps);
  const payAta = getAssociatedTokenAddressSync(NATIVE_MINT, r.payoutWallet), treAta = getAssociatedTokenAddressSync(NATIVE_MINT, cfg.seedTreasury);
  const bal = async (a: web3.PublicKey) => Number((await provider.connection.getTokenAccountBalance(a).catch(() => ({ value: { amount: '0' } }))).value.amount);
  const b0 = [await bal(payAta), await bal(treAta)];
  const sig = await c.send([createAssociatedTokenAccountIdempotentInstruction(me.publicKey, payAta, r.payoutWallet, NATIVE_MINT), createAssociatedTokenAccountIdempotentInstruction(me.publicKey, treAta, cfg.seedTreasury, NATIVE_MINT),
    await c.claimCreatorFees(raise, { mint: r.mint, pairMint: WSOL, pool: r.pool, position: r.position, positionNftMint: r.positionNftMint, payoutWallet: r.payoutWallet }, cfg.seedTreasury, me.publicKey)]);
  const b1 = [await bal(payAta), await bal(treAta)], f = b1[0] - b0[0], s = b1[1] - b0[1];
  console.log('claimed', sig, { founder: f, seed: s, total: f + s, founderPct: (100 * f / (f + s)).toFixed(3), matchesUnclaimed: f + s === Number(un.feeTokenB.toString()) });
})();
