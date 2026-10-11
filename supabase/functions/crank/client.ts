// The crank's view of the Seed program: the same addresses and instructions as program/client/seed.ts, written for
// Deno's npm: imports. Keep the two in step when an instruction changes.
import { BN, Program, web3 } from 'npm:@coral-xyz/anchor@0.30.1';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, getAccount } from 'npm:@solana/spl-token@0.4.9';

const { PublicKey, Keypair, SystemProgram, ComputeBudgetProgram } = web3;
export const DAMM = new PublicKey('cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');
export const DAMM_POOL_AUTHORITY = new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC');
export const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const maxKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? a : b).toBuffer();
const minKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? b : a).toBuffer();
const pda = {
  config: (pid: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('config')], pid)[0],
  poolVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('pool'), raise.toBuffer()], pid)[0],
  dammPool: (a: web3.PublicKey, b: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('cpool'), maxKey(a, b), minKey(a, b)], DAMM)[0],
  dammPosition: (nft: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position'), nft.toBuffer()], DAMM)[0],
  dammPositionNftAccount: (nft: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position_nft_account'), nft.toBuffer()], DAMM)[0],
  dammVault: (mint: web3.PublicKey, pool: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('token_vault'), mint.toBuffer(), pool.toBuffer()], DAMM)[0],
  dammEventAuthority: () => PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], DAMM)[0],
};

export function seedClient(program: Program, conn: web3.Connection) {
  const pid = program.programId, config = pda.config(pid), me = program.provider.publicKey!;
  const send = async (ixs: web3.TransactionInstruction[], signers: web3.Keypair[] = []) => {
    const tx = new web3.Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), ...ixs);
    return (program.provider as any).sendAndConfirm(tx, signers, { commitment: 'confirmed' });
  };
  const raiseOf = (k: web3.PublicKey) => (program.account as any).raise.fetch(k);
  const m = program.methods as any;
  return {
    allRaises: () => (program.account as any).raise.all() as Promise<{ publicKey: web3.PublicKey; account: any }[]>,
    settle: (raise: web3.PublicKey) => m.settle().accounts({ raise }).rpc(),
    timeoutRefund: (raise: web3.PublicKey) => m.timeoutRefund().accounts({ raise, config }).rpc(),
    applyPayoutChange: (raise: web3.PublicKey) => m.applyPayoutChange().accounts({ raise }).rpc(),
    async crankMint(raise: web3.PublicKey) {
      const mint = Keypair.generate();
      const ix = await m.crankMint().accounts({ raise, cranker: me, mint: mint.publicKey, backersVault: getAssociatedTokenAddressSync(mint.publicKey, raise, true), poolVault: pda.poolVault(pid, raise), teamVault: PublicKey.findProgramAddressSync([Buffer.from('team'), raise.toBuffer()], pid)[0], tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
      return send([ix], [mint]);
    },
    async crankPool(raise: web3.PublicKey) {
      const r = await raiseOf(raise), nft = Keypair.generate(), pool = pda.dammPool(r.mint, r.pairMint);
      const ix = await m.crankPool().accounts({ raise, config, cranker: me, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true),
        positionNftMint: nft.publicKey, positionNftAccount: pda.dammPositionNftAccount(nft.publicKey), poolAuthority: DAMM_POOL_AUTHORITY, pool, position: pda.dammPosition(nft.publicKey), tokenAVault: pda.dammVault(r.mint, pool), tokenBVault: pda.dammVault(r.pairMint, pool),
        dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, token2022Program: TOKEN_2022, systemProgram: SystemProgram.programId }).instruction();
      return send([ix], [nft]);
    },
    async crankSeed(raise: web3.PublicKey) {
      const r = await raiseOf(raise), cfg = await (program.account as any).config.fetch(config), tre = getAssociatedTokenAddressSync(r.pairMint, cfg.seedTreasury, true);
      const ix = await m.crankSeed().accounts({ raise, config, escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true), treasuryToken: tre, tokenProgram: TOKEN_PROGRAM_ID }).instruction();
      return send([createAssociatedTokenAccountIdempotentInstruction(me, tre, cfg.seedTreasury, r.pairMint), ix]);
    },
    /* the pair-asset fees the position has accrued but not paid out: DAMM's Position account keeps fee_b_pending at a fixed
       offset; rather than parse it, the crank asks DAMM to claim and reads the escrow before and after (a claim with
       nothing waiting is refused by the program, so it costs only a failed-transaction fee once an hour) */
    async feesWaiting(_raise: web3.PublicKey) { return 1n; },
    async claimCreatorFees(raise: web3.PublicKey) {
      const r = await raiseOf(raise), cfg = await (program.account as any).config.fetch(config), pool = r.pool as web3.PublicKey;
      const payoutToken = getAssociatedTokenAddressSync(r.pairMint, r.payoutWallet, true), tre = getAssociatedTokenAddressSync(r.pairMint, cfg.seedTreasury, true);
      const ix = await m.claimCreatorFees().accounts({ raise, config, cranker: me, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true),
        payoutWallet: r.payoutWallet, payoutToken, treasuryToken: tre, poolAuthority: DAMM_POOL_AUTHORITY, pool, position: r.position, positionNftAccount: pda.dammPositionNftAccount(r.positionNftMint),
        tokenAVault: pda.dammVault(r.mint, pool), tokenBVault: pda.dammVault(r.pairMint, pool), dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
      return send([createAssociatedTokenAccountIdempotentInstruction(me, payoutToken, r.payoutWallet, r.pairMint), createAssociatedTokenAccountIdempotentInstruction(me, tre, cfg.seedTreasury, r.pairMint), ix]);
    },
  };
}
export { getAccount };
